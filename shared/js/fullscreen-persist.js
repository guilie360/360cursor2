/**
 * Fullscreen persistente en 360Preventa.
 *
 * El navegador SALE del Fullscreen API al navegar de página.
 * Solución: al activarlo, la ventana top crea un shell con iframe;
 * la navegación ocurre DENTRO del iframe y el FS se mantiene en el padre
 * hasta que el usuario pulse de nuevo el botón (salida explícita).
 */
(function (global) {
  var KEY = 'boxiesKeepFullscreen';
  var URL_KEY = 'boxiesFsUrl';
  var SHELL_ID = 'boxies-fs-shell';
  var FRAME_ID = 'boxies-fs-frame';
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }

  function wanted() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function setWanted(on) {
    try {
      if (on) sessionStorage.setItem(KEY, '1');
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
  }
  function savedUrl(fallback) {
    try { return sessionStorage.getItem(URL_KEY) || fallback || location.href; } catch (e) { return fallback || location.href; }
  }
  function saveUrl(href) {
    try { sessionStorage.setItem(URL_KEY, href); } catch (e) {}
  }
  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function requestFs() {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return Promise.reject(new Error('unsupported'));
    return Promise.resolve(fn.call(el));
  }
  function exitFs() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (!fn) return Promise.reject(new Error('unsupported'));
    return Promise.resolve(fn.call(document));
  }
  function dispatch(active) {
    try {
      global.dispatchEvent(new CustomEvent('boxies:fullscreen', { detail: { active: !!active, wanted: wanted() } }));
    } catch (e) {}
  }

  /* ---------- Dentro del iframe: relé al padre, sin segundo shell ---------- */
  if (inIframe) {
    saveUrl(location.href);
    window.addEventListener('pagehide', function () { saveUrl(location.href); });
    document.addEventListener('click', function () { saveUrl(location.href); }, true);

    function parentApi() {
      try { return window.top && window.top.BoxiesFullscreen; } catch (e) { return null; }
    }

    global.BoxiesFullscreen = {
      toggle: function () {
        var api = parentApi();
        if (api && api.toggle) return api.toggle();
        return Promise.resolve(false);
      },
      restore: function () { return Promise.resolve(false); },
      wanted: function () {
        var api = parentApi();
        return api && api.wanted ? api.wanted() : wanted();
      },
      isActive: function () {
        var api = parentApi();
        return api && api.isActive ? api.isActive() : false;
      }
    };

    // Si el padre debería estar en FS y se perdió, avisar
    try {
      if (wanted() && window.top.BoxiesFullscreen && window.top.BoxiesFullscreen.ensureShell) {
        window.top.BoxiesFullscreen.ensureShell();
      }
    } catch (e) {}
    return;
  }

  /* ---------- Ventana top ---------- */
  var intentionalExit = false;

  function getShell() { return document.getElementById(SHELL_ID); }
  function getFrame() { return document.getElementById(FRAME_ID); }

  function ensureShell(href) {
    var url = href || savedUrl(location.href);
    var shell = getShell();
    if (shell) {
      var frame = getFrame();
      if (frame) {
        try {
          var cur = frame.contentWindow && frame.contentWindow.location.href;
          if (cur && url && cur.split('#')[0] !== url.split('#')[0] && !href) {
            /* keep current iframe location */
          } else if (href) {
            frame.src = url;
          }
        } catch (e) {
          if (href) frame.src = url;
        }
      }
      return shell;
    }

    shell = document.createElement('div');
    shell.id = SHELL_ID;
    shell.setAttribute('aria-hidden', 'false');
    shell.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'width:100vw', 'height:100vh', 'margin:0', 'padding:0',
      'background:#0b0b0b', 'border:0'
    ].join(';');

    var frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.title = '360Preventa';
    frame.allow = 'fullscreen';
    frame.src = url;
    frame.style.cssText = 'border:0;width:100%;height:100%;display:block;background:#0b0b0b';
    frame.addEventListener('load', function () {
      try { saveUrl(frame.contentWindow.location.href); } catch (e) {}
    });

    shell.appendChild(frame);
    document.body.appendChild(shell);
    document.documentElement.classList.add('boxies-fs-shell-on');
    return shell;
  }

  function destroyShell(navigateTo) {
    var frame = getFrame();
    var next = navigateTo || savedUrl(null);
    try {
      if (frame && frame.contentWindow) next = frame.contentWindow.location.href || next;
    } catch (e) {}
    var shell = getShell();
    if (shell) shell.remove();
    document.documentElement.classList.remove('boxies-fs-shell-on');
    if (next && next.split('#')[0] !== location.href.split('#')[0]) {
      location.replace(next);
    }
  }

  function enter() {
    intentionalExit = false;
    setWanted(true);
    saveUrl(location.href);
    // Pedir FS primero (mientras el gesto del usuario sigue vivo).
    // Crear el shell después: si se crea antes, Chrome/Safari invalidan el gesto.
    return requestFs()
      .then(function () {
        ensureShell(location.href);
        dispatch(true);
        return true;
      })
      .catch(function () {
        ensureShell(location.href);
        armOneShotEnter();
        dispatch(false);
        return false;
      });
  }

  function leave() {
    intentionalExit = true;
    setWanted(false);
    return exitFs()
      .catch(function () {})
      .then(function () {
        destroyShell();
        intentionalExit = false;
        dispatch(false);
        return false;
      });
  }

  function toggle() {
    if (isFs()) return leave();
    // Shell sin FS (p. ej. Esc o gesto fallido): reintentar FS, no destruir
    if (getShell()) {
      setWanted(true);
      return requestFs()
        .then(function () { dispatch(true); return true; })
        .catch(function () {
          armOneShotEnter();
          dispatch(false);
          return false;
        });
    }
    return enter();
  }

  function onFsChange() {
    if (isFs()) {
      setWanted(true);
      intentionalExit = false;
      if (wanted()) ensureShell();
      dispatch(true);
      return;
    }
    // Salida de FS
    if (intentionalExit) {
      intentionalExit = false;
      setWanted(false);
      destroyShell();
      dispatch(false);
      return;
    }
    // Esc u otra salida involuntaria: mantener modo shell + wanted
    // y rearmar el gesto para volver a FS sin perder la sesión del iframe.
    if (wanted()) {
      ensureShell();
      armOneShotEnter();
      dispatch(false);
    }
  }

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  var oneShotArmed = false;
  function armOneShotEnter() {
    if (oneShotArmed || isFs() || !wanted()) return;
    oneShotArmed = true;
    function handler(e) {
      if (!wanted()) { cleanup(); return; }
      if (isFs()) { cleanup(); return; }
      // Consumir el primer gesto solo para recuperar FS
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      cleanup();
      ensureShell();
      requestFs().then(function () { dispatch(true); }).catch(function () { armOneShotEnter(); });
    }
    function cleanup() {
      oneShotArmed = false;
      ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(function (ev) {
        document.removeEventListener(ev, handler, true);
      });
    }
    ['pointerdown', 'click', 'touchstart', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, handler, true);
    });
  }

  function boot() {
    if (!wanted()) return;
    ensureShell(savedUrl(location.href));
    if (!isFs()) armOneShotEnter();
    else dispatch(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('pageshow', function () { if (wanted()) boot(); });

  global.BoxiesFullscreen = {
    toggle: toggle,
    restore: function () { return wanted() ? enter() : Promise.resolve(false); },
    ensureShell: ensureShell,
    wanted: wanted,
    isActive: isFs
  };
})(window);
