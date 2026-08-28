/* Periodic task profiler — mide timers/rAF/longtask y vuelca a pantalla al primer >500ms.
   No cambia lógica de negocio. Temporal para Hostinger. */
var BootPeriodicProfiler = (function () {
  var startedAt = performance.now();
  var origST = window.setTimeout.bind(window);
  var origSI = window.setInterval.bind(window);
  var origCT = window.clearTimeout.bind(window);
  var origCI = window.clearInterval.bind(window);
  var origRAF = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
  var origCAF = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null;

  var stopped = false;
  var dumpShown = false;
  var longTaskObserver = null;
  var summaryTimerId = null;
  var topIntervalId = null;

  var depth = 0;
  var activeLabel = null;
  var registry = Object.create(null);
  var selfReschedule = Object.create(null);
  var reportedHeavy = Object.create(null);
  var secondBuckets = Object.create(null);

  window.__periodicLog = [];

  function elapsed() {
    return ((performance.now() - startedAt) / 1000).toFixed(2) + 's';
  }

  function pushEvent(type, message) {
    var line = '[' + type + ' ' + elapsed() + '] ' + message;
    try {
      window.__periodicLog.push(line);
    } catch (e) {}
    try { console.log(line); } catch (e2) {}
    return line;
  }

  function showFullscreenDump(triggerLine) {
    if (dumpShown) return;
    dumpShown = true;
    try {
      if (triggerLine) {
        window.__periodicLog.push('[DUMP] Motivo: ' + triggerLine);
      }
      window.__periodicLog.push('[DUMP] Profiler detenido. Log completo abajo.');
    } catch (e) {}

    function paint() {
      try {
        var existing = document.getElementById('__periodic-dump');
        if (existing) existing.parentNode.removeChild(existing);

        var pre = document.createElement('pre');
        pre.id = '__periodic-dump';
        pre.textContent = (window.__periodicLog || []).join('\n');
        pre.setAttribute('style', [
          'position:fixed',
          'inset:0',
          'z-index:2147483647',
          'margin:0',
          'padding:16px',
          'box-sizing:border-box',
          'width:100%',
          'height:100%',
          'overflow:auto',
          'background:#000',
          'color:#fff',
          'font:14px/1.4 Consolas,Menlo,monospace',
          'white-space:pre-wrap',
          'word-break:break-word'
        ].join(';'));

        var root = document.documentElement || document.body;
        if (document.body) {
          document.body.appendChild(pre);
        } else if (root) {
          root.appendChild(pre);
        }
        /* Forzar paint síncrono antes de que vuelva a bloquearse */
        try { void pre.offsetHeight; } catch (e3) {}
      } catch (e4) {}
    }

    if (document.body) {
      paint();
    } else {
      document.addEventListener('DOMContentLoaded', paint);
      paint();
    }
  }

  function stopProfiler(triggerLine) {
    if (stopped) {
      showFullscreenDump(triggerLine);
      return;
    }
    stopped = true;

    try {
      window.setTimeout = origST;
      window.setInterval = origSI;
      window.clearTimeout = origCT;
      window.clearInterval = origCI;
      if (origRAF) window.requestAnimationFrame = origRAF;
      if (origCAF) window.cancelAnimationFrame = origCAF;
    } catch (e) {}

    try {
      if (longTaskObserver) longTaskObserver.disconnect();
    } catch (e2) {}
    try {
      if (summaryTimerId != null) origCT(summaryTimerId);
    } catch (e3) {}
    try {
      if (topIntervalId != null) origCI(topIntervalId);
    } catch (e4) {}

    pushEvent('STOP', 'Primera tarea >500ms detectada. Profiler OFF.');
    showFullscreenDump(triggerLine);
  }

  function maybeStop(durationMs, triggerLine) {
    if (durationMs > 500) {
      stopProfiler(triggerLine);
      return true;
    }
    return false;
  }

  function log() {
    var args = Array.prototype.slice.call(arguments);
    pushEvent('INFO', args.join(' '));
  }

  function err() {
    var args = Array.prototype.slice.call(arguments);
    pushEvent('ERR', args.join(' '));
  }

  function stackLines() {
    try {
      return String(new Error().stack || '')
        .split('\n')
        .map(function (l) { return l.trim(); })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function parseSiteFrame(lines) {
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/boot-periodic|boot-loop-watch|boot-debug/i.test(line)) continue;
      var m = line.match(/(?:at\s+)?([^\s(]+)?\s*\(?([^)\s]*\/)?([\w.\-]+\.js):(\d+)(?::\d+)?\)?/);
      if (m && m[3] && !/boot-periodic|boot-loop|boot-debug/i.test(m[3])) {
        var name = m[1] && m[1] !== 'at' ? m[1] : '(anonymous)';
        name = name.replace(/^Object\./, '').replace(/\/<.*/, '');
        return {
          name: name,
          file: m[3],
          line: m[4],
          raw: line
        };
      }
      var m2 = line.match(/([\w.\-]+\.js):(\d+)/);
      if (m2 && !/boot-periodic|boot-loop|boot-debug/i.test(m2[1])) {
        return { name: '(anonymous)', file: m2[1], line: m2[2], raw: line };
      }
    }
    return { name: '(unknown)', file: '(unknown)', line: '?', raw: lines.slice(2, 5).join(' | ') };
  }

  function labelFromStack(kind) {
    var info = parseSiteFrame(stackLines().slice(3));
    return {
      kind: kind,
      name: info.name,
      file: info.file,
      line: info.line,
      key: kind + '|' + info.file + ':' + info.line + '|' + info.name,
      stack: info.raw
    };
  }

  function fnName(fn) {
    if (!fn) return '(nil)';
    if (fn.name) return fn.name;
    try {
      var s = Function.prototype.toString.call(fn);
      var m = s.match(/function\s*([^\s(]*)/);
      if (m && m[1]) return m[1];
    } catch (e) {}
    return '(anonymous)';
  }

  function recordDuration(meta, intervalMs, durationMs, selfRe) {
    if (stopped) return;

    var key = meta.key;
    if (!registry[key]) {
      registry[key] = {
        kind: meta.kind,
        name: meta.name,
        file: meta.file,
        line: meta.line,
        intervalMs: intervalMs,
        runs: 0,
        totalMs: 0,
        maxMs: 0,
        selfReschedules: 0
      };
    }
    var row = registry[key];
    row.runs += 1;
    row.totalMs += durationMs;
    if (durationMs > row.maxMs) row.maxMs = durationMs;
    if (intervalMs != null) row.intervalMs = intervalMs;
    if (selfRe) row.selfReschedules += 1;

    var sec = Math.floor((performance.now() - startedAt) / 1000);
    if (!secondBuckets[sec]) secondBuckets[sec] = Object.create(null);
    if (!secondBuckets[sec][key]) secondBuckets[sec][key] = 0;
    secondBuckets[sec][key] += durationMs;

    if (durationMs >= 50) {
      var msg =
        'HEAVY ' + meta.kind +
        ' name=' + meta.name +
        ' file=' + meta.file + ':' + meta.line +
        ' interval=' + (intervalMs != null ? intervalMs + 'ms' : 'n/a') +
        ' duration=' + durationMs.toFixed(1) + 'ms' +
        (selfRe ? ' selfReschedule=1' : '');
      var heavyKey = key + '|' + Math.round(durationMs);
      if (!reportedHeavy[heavyKey]) {
        reportedHeavy[heavyKey] = true;
        pushEvent('HEAVY', msg);
      } else {
        pushEvent('HEAVY', msg);
      }
      maybeStop(durationMs, msg);
    }
  }

  function wrapCallback(kind, handler, intervalMs, meta) {
    if (typeof handler !== 'function') return handler;
    if (!meta) {
      meta = labelFromStack(kind);
      if (meta.name === '(anonymous)' || meta.name === '(unknown)') {
        meta.name = fnName(handler);
        meta.key = kind + '|' + meta.file + ':' + meta.line + '|' + meta.name;
      }
    }
    return function () {
      if (stopped) {
        return handler.apply(this, arguments);
      }
      var t0 = performance.now();
      depth += 1;
      var prev = activeLabel;
      activeLabel = meta.key;
      var result;
      try {
        result = handler.apply(this, arguments);
      } finally {
        var dur = performance.now() - t0;
        var selfRe = !!selfReschedule[meta.key];
        selfReschedule[meta.key] = false;
        recordDuration(meta, intervalMs, dur, selfRe);
        activeLabel = prev;
        depth -= 1;
      }
      return result;
    };
  }

  window.setTimeout = function (handler, timeout) {
    if (stopped) {
      return origST.apply(window, arguments);
    }
    var delay = typeof timeout === 'number' ? timeout : 0;
    var meta = labelFromStack('setTimeout');
    if (typeof handler === 'function') {
      meta.name = meta.name === '(anonymous)' || meta.name === '(unknown)' ? fnName(handler) : meta.name;
      meta.key = 'setTimeout|' + meta.file + ':' + meta.line + '|' + meta.name;
      if (activeLabel) {
        selfReschedule[activeLabel] = true;
      }
      handler = wrapCallback('setTimeout', handler, delay, meta);
    }
    var args = Array.prototype.slice.call(arguments);
    args[0] = handler;
    return origST.apply(window, args);
  };

  window.setInterval = function (handler, timeout) {
    if (stopped) {
      return origSI.apply(window, arguments);
    }
    var delay = typeof timeout === 'number' ? timeout : 0;
    var meta = labelFromStack('setInterval');
    if (typeof handler === 'function') {
      meta.name = meta.name === '(anonymous)' || meta.name === '(unknown)' ? fnName(handler) : meta.name;
      meta.key = 'setInterval|' + meta.file + ':' + meta.line + '|' + meta.name;
      pushEvent(
        'REGISTER',
        'setInterval name=' + meta.name +
        ' file=' + meta.file + ':' + meta.line +
        ' interval=' + delay + 'ms'
      );
      handler = wrapCallback('setInterval', handler, delay, meta);
    }
    var args = Array.prototype.slice.call(arguments);
    args[0] = handler;
    return origSI.apply(window, args);
  };

  window.clearTimeout = function (id) { return origCT(id); };
  window.clearInterval = function (id) { return origCI(id); };

  if (origRAF) {
    window.requestAnimationFrame = function (cb) {
      if (stopped) {
        return origRAF(cb);
      }
      var meta = labelFromStack('rAF');
      if (typeof cb === 'function') {
        meta.name = meta.name === '(anonymous)' || meta.name === '(unknown)' ? fnName(cb) : meta.name;
        meta.key = 'rAF|' + meta.file + ':' + meta.line + '|' + meta.name;
        if (activeLabel && String(activeLabel).indexOf('rAF|') === 0) {
          selfReschedule[activeLabel] = true;
        }
        cb = wrapCallback('rAF', cb, 16.7, meta);
      }
      return origRAF(cb);
    };
  }
  if (origCAF) {
    window.cancelAnimationFrame = function (id) { return origCAF(id); };
  }

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      longTaskObserver = new PerformanceObserver(function (list) {
        if (stopped) return;
        list.getEntries().forEach(function (entry) {
          if (entry.duration < 50) return;
          var msg =
            'LONGTASK duration=' + entry.duration.toFixed(1) + 'ms' +
            ' start=' + entry.startTime.toFixed(1) +
            ' name=' + (entry.name || '');
          pushEvent('LONGTASK', msg);
          maybeStop(entry.duration, msg);
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      pushEvent('INFO', 'PerformanceObserver longtask ON');
    } catch (e) {
      pushEvent('INFO', 'PerformanceObserver longtask no disponible ' + (e && e.message));
    }
  }

  function dumpTop(sec) {
    if (stopped) return;
    var bucket = secondBuckets[sec];
    if (!bucket) return;
    var rows = Object.keys(bucket).map(function (k) {
      return { key: k, ms: bucket[k], meta: registry[k] };
    }).sort(function (a, b) { return b.ms - a.ms; });
    if (!rows.length) return;
    var top = rows[0];
    var m = top.meta || {};
    var msg =
      'TOP-SECOND t=' + sec + 's spent=' + top.ms.toFixed(1) + 'ms' +
      ' kind=' + (m.kind || '?') +
      ' name=' + (m.name || '?') +
      ' file=' + (m.file || '?') + ':' + (m.line || '?') +
      ' interval=' + (m.intervalMs != null ? m.intervalMs + 'ms' : 'n/a') +
      ' selfReschedules=' + (m.selfReschedules || 0);
    pushEvent('TOP-SECOND', msg);

    rows.slice(0, 5).forEach(function (r, idx) {
      var mm = r.meta || {};
      pushEvent(
        'TOP-SECOND',
        '#' + (idx + 1) + ' ' + r.ms.toFixed(1) + 'ms ' +
        (mm.kind || '') + ' ' + (mm.name || '') + ' ' +
        (mm.file || '') + ':' + (mm.line || '') +
        ' interval=' + mm.intervalMs +
        ' runs=' + mm.runs +
        ' max=' + (mm.maxMs || 0).toFixed(1) + 'ms'
      );
    });

    maybeStop(top.ms, msg);
  }

  var lastSec = -1;
  topIntervalId = origSI(function () {
    if (stopped) return;
    var sec = Math.floor((performance.now() - startedAt) / 1000);
    if (sec === lastSec) return;
    if (lastSec >= 0) dumpTop(lastSec);
    lastSec = sec;
  }, 250);

  summaryTimerId = origST(function () {
    if (stopped) return;
    var list = Object.keys(registry).map(function (k) { return registry[k]; });
    list.sort(function (a, b) { return b.maxMs - a.maxMs; });
    if (list[0] && list[0].maxMs >= 50) {
      var msg =
        'WORST name=' + list[0].name +
        ' file=' + list[0].file + ':' + list[0].line +
        ' kind=' + list[0].kind +
        ' interval=' + list[0].intervalMs + 'ms' +
        ' maxDuration=' + list[0].maxMs.toFixed(1) + 'ms' +
        ' runs=' + list[0].runs +
        ' selfReschedules=' + list[0].selfReschedules;
      pushEvent('WORST', msg);
      maybeStop(list[0].maxMs, msg);
    } else {
      pushEvent('WORST', 'ningún timer/rAF propio ≥50ms; mirar LONGTASK');
    }
  }, 10000);

  pushEvent('INFO', 'BootPeriodicProfiler ON — overlay al primer >500ms');

  return {
    getRegistry: function () { return registry; },
    getLog: function () { return window.__periodicLog; },
    stop: function (reason) { stopProfiler(reason || 'manual'); },
    dumpNow: function () {
      var sec = Math.floor((performance.now() - startedAt) / 1000);
      dumpTop(Math.max(0, sec - 1));
    }
  };
})();
