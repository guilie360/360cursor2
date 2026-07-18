/* Periodic task profiler — mide duración real de timers/rAF y long tasks.
   No cambia lógica de negocio. Temporal para Hostinger. */
var BootPeriodicProfiler = (function () {
  var startedAt = performance.now();
  var origST = window.setTimeout.bind(window);
  var origSI = window.setInterval.bind(window);
  var origCT = window.clearTimeout.bind(window);
  var origCI = window.clearInterval.bind(window);
  var origRAF = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
  var origCAF = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null;

  var depth = 0;
  var activeLabel = null;
  var registry = Object.create(null);
  var selfReschedule = Object.create(null);
  var reportedHeavy = Object.create(null);
  var secondBuckets = Object.create(null);

  function elapsed() {
    return ((performance.now() - startedAt) / 1000).toFixed(2) + 's';
  }

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[PERIODIC ' + elapsed() + ']');
    try { console.log.apply(console, args); } catch (e) {}
    try {
      if (typeof BootDebug !== 'undefined') {
        BootDebug.log(args.slice(1).join(' '));
      }
    } catch (e2) {}
  }

  function err() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[PERIODIC ' + elapsed() + ']');
    try { console.error.apply(console, args); } catch (e) {}
    try {
      if (typeof BootDebug !== 'undefined') {
        BootDebug.error(args.slice(1).join(' '));
      }
    } catch (e2) {}
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
      var heavyKey = key + '|' + Math.round(durationMs);
      if (!reportedHeavy[heavyKey]) {
        reportedHeavy[heavyKey] = true;
        err(
          'HEAVY ' + meta.kind +
          ' name=' + meta.name +
          ' file=' + meta.file + ':' + meta.line +
          ' interval=' + (intervalMs != null ? intervalMs + 'ms' : 'n/a') +
          ' duration=' + durationMs.toFixed(1) + 'ms' +
          (selfRe ? ' selfReschedule=1' : '')
        );
      } else {
        console.warn(
          '[PERIODIC]',
          meta.kind,
          meta.name,
          meta.file + ':' + meta.line,
          'interval=' + intervalMs,
          'duration=' + durationMs.toFixed(1) + 'ms'
        );
      }
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
    var delay = typeof timeout === 'number' ? timeout : 0;
    var meta = labelFromStack('setInterval');
    if (typeof handler === 'function') {
      meta.name = meta.name === '(anonymous)' || meta.name === '(unknown)' ? fnName(handler) : meta.name;
      meta.key = 'setInterval|' + meta.file + ':' + meta.line + '|' + meta.name;
      log(
        'REGISTER setInterval name=' + meta.name +
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

  /* Long Task API — captura bloqueos ~900ms aunque no sean timers nuestros */
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      var po = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.duration < 50) return;
          err(
            'LONGTASK duration=' + entry.duration.toFixed(1) + 'ms' +
            ' start=' + entry.startTime.toFixed(1) +
            ' name=' + (entry.name || '')
          );
        });
      });
      po.observe({ entryTypes: ['longtask'] });
      log('PerformanceObserver longtask ON');
    } catch (e) {
      log('PerformanceObserver longtask no disponible', e && e.message);
    }
  }

  function dumpTop(sec) {
    var bucket = secondBuckets[sec];
    if (!bucket) return;
    var rows = Object.keys(bucket).map(function (k) {
      return { key: k, ms: bucket[k], meta: registry[k] };
    }).sort(function (a, b) { return b.ms - a.ms; });
    if (!rows.length) return;
    var top = rows[0];
    var m = top.meta || {};
    err(
      'TOP-SECOND t=' + sec + 's spent=' + top.ms.toFixed(1) + 'ms' +
      ' kind=' + (m.kind || '?') +
      ' name=' + (m.name || '?') +
      ' file=' + (m.file || '?') + ':' + (m.line || '?') +
      ' interval=' + (m.intervalMs != null ? m.intervalMs + 'ms' : 'n/a') +
      ' selfReschedules=' + (m.selfReschedules || 0)
    );
    rows.slice(0, 5).forEach(function (r, idx) {
      var mm = r.meta || {};
      console.log(
        '[PERIODIC-TOP' + sec + ' #' + (idx + 1) + ']',
        r.ms.toFixed(1) + 'ms',
        mm.kind,
        mm.name,
        (mm.file || '') + ':' + (mm.line || ''),
        'interval=' + mm.intervalMs,
        'runs=' + mm.runs,
        'max=' + (mm.maxMs || 0).toFixed(1) + 'ms'
      );
    });
  }

  /* Cada segundo: quién comió CPU de timers ese segundo */
  var lastSec = -1;
  origSI(function () {
    var sec = Math.floor((performance.now() - startedAt) / 1000);
    if (sec === lastSec) return;
    if (lastSec >= 0) dumpTop(lastSec);
    lastSec = sec;
  }, 250);

  /* Resumen a los 10s */
  origST(function () {
    var list = Object.keys(registry).map(function (k) { return registry[k]; });
    list.sort(function (a, b) { return b.maxMs - a.maxMs; });
    console.log('[PERIODIC-SUMMARY]', list.slice(0, 15));
    if (list[0] && list[0].maxMs >= 50) {
      err(
        'WORST name=' + list[0].name +
        ' file=' + list[0].file + ':' + list[0].line +
        ' kind=' + list[0].kind +
        ' interval=' + list[0].intervalMs + 'ms' +
        ' maxDuration=' + list[0].maxMs.toFixed(1) + 'ms' +
        ' runs=' + list[0].runs +
        ' selfReschedules=' + list[0].selfReschedules
      );
    } else {
      log('SUMMARY: ningún timer/rAF propio ≥50ms; mirar LONGTASK (scripts terceros)');
    }
  }, 10000);

  log('BootPeriodicProfiler ON (setTimeout/setInterval/rAF + longtask)');

  return {
    getRegistry: function () { return registry; },
    dumpNow: function () {
      var sec = Math.floor((performance.now() - startedAt) / 1000);
      dumpTop(Math.max(0, sec - 1));
    }
  };
})();
