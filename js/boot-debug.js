console.log("BOOT VERSION 3e8f7cc");
/* Boot diagnostics — temporal (producción Hostinger). Quitar cuando estabilice. */
var BootDebug = (function () {
  var steps = [];
  var startedAt = Date.now();
  var banner = null;

  function ts() {
    return ((Date.now() - startedAt) / 1000).toFixed(2) + 's';
  }

  /* Overlay off by default. Opt-in only: ?debug=1 */
  function isOverlayEnabled() {
    try {
      var params = new URLSearchParams(location.search || '');
      return params.get('debug') === '1';
    } catch (e1) {}
    return false;
  }

  function ensureBanner() {
    if (!isOverlayEnabled()) return null;
    if (banner || !document.body) return banner;
    banner = document.createElement('div');
    banner.id = 'bootDebugBanner';
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
      'position:fixed',
      'left:8px',
      'right:8px',
      'top:8px',
      'bottom:8px',
      'z-index:2147483647',
      'overflow:visible',
      'padding:10px 12px',
      'border-radius:10px',
      'background:rgba(20,0,0,0.92)',
      'color:#fff',
      'font:12px/1.4 ui-monospace,Consolas,monospace',
      'white-space:pre-wrap',
      'pointer-events:none',
      'display:none'
    ].join(';');
    document.body.appendChild(banner);
    return banner;
  }

  function renderBanner(force) {
    if (!isOverlayEnabled()) return;
    var el = ensureBanner();
    if (!el) return;
    var hasError = steps.some(function (s) { return s.level === 'error'; });
    if (!force && !hasError) return;
    el.style.display = 'block';
    el.textContent = steps.map(function (s) {
      return '[' + s.t + '] ' + (s.level === 'error' ? 'ERROR ' : '') + s.msg;
    }).join('\n');
  }

  function log(msg, detail) {
    var line = detail !== undefined ? (msg + ' ' + stringify(detail)) : msg;
    steps.push({ t: ts(), level: 'info', msg: line });
    try { console.log('[BOOT ' + ts() + ']', msg, detail !== undefined ? detail : ''); } catch (e) {}
    renderBanner(false);
  }

  function error(msg, detail) {
    var line = detail !== undefined ? (msg + ' ' + stringify(detail)) : msg;
    steps.push({ t: ts(), level: 'error', msg: line });
    try { console.error('[BOOT ' + ts() + ']', msg, detail !== undefined ? detail : ''); } catch (e) {}
    renderBanner(true);
  }

  function stringify(value) {
    if (value == null) return String(value);
    if (typeof value === 'string') return value;
    if (value && value.message) return value.message;
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }

  function markThemeReady(reason) {
    try {
      document.documentElement.classList.add('theme-ready');
      log('theme-ready', reason || 'ok');
    } catch (e) {
      error('theme-ready failed', e);
    }
  }

  function withTimeout(promise, ms, label) {
    ms = ms || 12000;
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('Timeout ' + ms + 'ms: ' + (label || 'promise')));
      }, ms);
      Promise.resolve(promise).then(
        function (value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(value);
        },
        function (err) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function getSteps() { return steps.slice(); }

  log('BootDebug loaded', location.href);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      log('DOMContentLoaded');
      if (isOverlayEnabled()) ensureBanner();
    });
  } else {
    log('DOM already ' + document.readyState);
    if (isOverlayEnabled()) setTimeout(ensureBanner, 0);
  }

  window.addEventListener('error', function (ev) {
    error('window.error', (ev && ev.message) || ev);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    error('unhandledrejection', ev && ev.reason);
  });

  /* Failsafe: nunca dejar body invisible más de 1.5s */
  setTimeout(function () {
    if (!document.documentElement.classList.contains('theme-ready')) {
      error('failsafe: theme-ready forzado (estaba oculto)');
      markThemeReady('failsafe-1500ms');
    }
  }, 1500);

  return {
    log: log,
    error: error,
    markThemeReady: markThemeReady,
    withTimeout: withTimeout,
    getSteps: getSteps,
    isOverlayEnabled: isOverlayEnabled
  };
})();
