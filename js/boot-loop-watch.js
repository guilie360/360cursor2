/* Boot loop watch — detecta rAF/interval/observers/scroll que monopolizan el hilo.
   Solo instrumenta; no cambia la lógica de la app. Temporal para Hostinger. */
var BootLoopWatch = (function () {
  var startedAt = Date.now();
  var reported = {};
  var firstCulprit = null;
  var totals = {
    rAF: 0,
    setInterval: 0,
    MutationObserver: 0,
    ResizeObserver: 0,
    scroll: 0
  };
  var windowCounts = {};
  var WINDOW_MS = 1000;
  var LIMITS = {
    rAF: 90,
    setInterval: 40,
    MutationObserver: 60,
    ResizeObserver: 60,
    scroll: 80
  };

  function ts() {
    return ((Date.now() - startedAt) / 1000).toFixed(2) + 's';
  }

  function stackSnippet() {
    try {
      var lines = String(new Error().stack || '')
        .split('\n')
        .map(function (l) { return l.trim(); })
        .filter(Boolean);
      /* Saltar Error + stackSnippet + bump/wrap */
      return lines.slice(3, 9).join(' ← ').replace(/\s+/g, ' ').slice(0, 500);
    } catch (e) {
      return '(sin stack)';
    }
  }

  function fileHint(stack) {
    var m = String(stack || '').match(/([\w\-./]+\.js)(?::(\d+))?/);
    if (!m) return { file: '(desconocido)', line: null };
    return { file: m[1], line: m[2] || null };
  }

  function report(type, count, stack) {
    var key = type + '|' + String(stack).slice(0, 160);
    if (reported[key]) return;
    reported[key] = true;

    var hint = fileHint(stack);
    var msg =
      'LOOP HOT ' + type + ' ×' + count + '/s' +
      ' | file≈' + hint.file +
      (hint.line ? (':' + hint.line) : '') +
      ' | ' + stack;

    if (!firstCulprit) {
      firstCulprit = {
        type: type,
        count: count,
        file: hint.file,
        line: hint.line,
        stack: stack,
        at: ts()
      };
    }

    try {
      if (typeof BootDebug !== 'undefined') BootDebug.error(msg);
      else console.error('[LOOP ' + ts() + ']', msg);
    } catch (e) {}

    try {
      console.error('[LOOP-CULPRIT]', firstCulprit);
    } catch (e2) {}
  }

  function bump(type, stack) {
    totals[type] = (totals[type] || 0) + 1;
    var now = Date.now();
    var bucketKey = type + '::' + String(stack || '').slice(0, 180);
    var bucket = windowCounts[bucketKey];
    if (!bucket || now - bucket.t0 > WINDOW_MS) {
      windowCounts[bucketKey] = { t0: now, n: 1, stack: stack, type: type };
      return;
    }
    bucket.n += 1;
    var limit = LIMITS[type] || 100;
    if (bucket.n >= limit) {
      report(type, bucket.n, stack);
      /* reset para no spamear cada frame tras el aviso */
      bucket.t0 = now;
      bucket.n = 0;
    }
  }

  function wrapFn(label, fn, stack) {
    if (typeof fn !== 'function') return fn;
    return function () {
      bump(label, stack);
      return fn.apply(this, arguments);
    };
  }

  /* --- requestAnimationFrame --- */
  if (typeof window.requestAnimationFrame === 'function') {
    var origRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      var stack = stackSnippet();
      return origRAF(wrapFn('rAF', cb, stack));
    };
  }

  /* --- setInterval --- */
  if (typeof window.setInterval === 'function') {
    var origSI = window.setInterval.bind(window);
    window.setInterval = function (handler, timeout) {
      var stack = stackSnippet();
      var args = Array.prototype.slice.call(arguments);
      if (typeof handler === 'function') {
        args[0] = wrapFn('setInterval', handler, stack);
      }
      return origSI.apply(window, args);
    };
  }

  /* --- MutationObserver --- */
  if (typeof window.MutationObserver === 'function') {
    var OrigMO = window.MutationObserver;
    window.MutationObserver = function (callback) {
      var stack = stackSnippet();
      var obs = new OrigMO(wrapFn('MutationObserver', callback, stack));
      return obs;
    };
    window.MutationObserver.prototype = OrigMO.prototype;
  }

  /* --- ResizeObserver --- */
  if (typeof window.ResizeObserver === 'function') {
    var OrigRO = window.ResizeObserver;
    window.ResizeObserver = function (callback) {
      var stack = stackSnippet();
      var obs = new OrigRO(wrapFn('ResizeObserver', callback, stack));
      return obs;
    };
    window.ResizeObserver.prototype = OrigRO.prototype;
  }

  /* --- scroll / wheel listeners --- */
  if (typeof EventTarget !== 'undefined' && EventTarget.prototype.addEventListener) {
    var origAEL = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'scroll' || type === 'wheel') {
        var stack = stackSnippet();
        var wrapped;
        if (typeof listener === 'function') {
          wrapped = wrapFn('scroll', listener, stack);
        } else if (listener && typeof listener.handleEvent === 'function') {
          wrapped = {
            handleEvent: wrapFn('scroll', function (ev) {
              return listener.handleEvent(ev);
            }, stack)
          };
        } else {
          wrapped = listener;
        }
        return origAEL.call(this, type, wrapped, options);
      }
      return origAEL.call(this, type, listener, options);
    };
  }

  /* Heartbeat: si el hilo se bloquea >500ms, avisar cuando vuelva */
  var lastBeat = Date.now();
  function heartbeat() {
    var now = Date.now();
    var expected = 100;
    var lag = now - lastBeat - expected;
    if (lag > 500) {
      try {
        if (typeof BootDebug !== 'undefined') {
          BootDebug.error('main-thread blocked ~' + Math.round(lag) + 'ms (antes de este beat)');
        } else {
          console.error('[LOOP] main-thread lag', lag);
        }
      } catch (e) {}
    }
    lastBeat = now;
    setTimeout(heartbeat, expected);
  }
  setTimeout(heartbeat, 100);

  /* Resumen a los 8s si no hubo culprit */
  setTimeout(function () {
    var summary = {
      totals: totals,
      firstCulprit: firstCulprit,
      elapsed: ts()
    };
    try {
      console.log('[LOOP-SUMMARY]', summary);
      if (typeof BootDebug !== 'undefined') {
        if (firstCulprit) {
          BootDebug.error(
            'Primer ciclo sospechoso: ' + firstCulprit.type +
            ' @ ' + firstCulprit.file +
            (firstCulprit.line ? (':' + firstCulprit.line) : '') +
            ' (t=' + firstCulprit.at + ')'
          );
        } else {
          BootDebug.log('LOOP-SUMMARY sin hotspot extremo', totals);
        }
      }
    } catch (e) {}
  }, 8000);

  if (typeof BootDebug !== 'undefined') {
    BootDebug.log('BootLoopWatch activo (rAF/interval/MO/RO/scroll)');
  } else {
    console.log('[LOOP] BootLoopWatch activo');
  }

  return {
    getFirstCulprit: function () { return firstCulprit; },
    getTotals: function () { return Object.assign({}, totals); }
  };
})();
