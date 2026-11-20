/**
 * Fullscreen persistente en 360Preventa.
 *
 * El navegador SALE del Fullscreen API al navegar de página.
 * En la misma página: solo Fullscreen API (sin iframe) para no perder el scroll.
 * Al navegar a otra ruta con FS activo: se crea un shell iframe y el FS
 * se mantiene en el padre hasta salida explícita.
 */
(function (global) {
  var KEY = 'boxiesKeepFullscreen';
  var URL_KEY = 'boxiesFsUrl';
  var VIEW_KEY = 'boxiesFsView';
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

  function mostVisibleSection() {
    var nodes = document.querySelectorAll('main section[id], section[id]');
    var best = '', bestVis = 0;
    var vh = window.innerHeight || 1;
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (vis > bestVis) {
        bestVis = vis;
        best = nodes[i].id || '';
      }
    }
    return best;
  }

  function captureViewState(override) {
    override = override || {};
    var y = typeof override.y === 'number'
      ? override.y
      : (window.scrollY || document.documentElement.scrollTop || 0);
    try {
      var menuY = parseInt(sessionStorage.getItem('boxiesMenuScrollY') || '', 10);
      var menuOpen = !!(document.querySelector && document.querySelector('.menu-panel.open'));
      if (typeof override.y !== 'number' && isFinite(menuY) && menuY >= 0 && (menuOpen || (y < 8 && menuY > 8))) {
        y = menuY;
      }
    } catch (e0) {}
    var state = {
      y: y,
      vh: window.innerHeight || 0,
      sh: document.documentElement.scrollHeight || 0,
      section: mostVisibleSection(),
      href: location.href,
      t: Date.now()
    };
    try {
      if (typeof global.BoxiesCaptureLandingView === 'function') {
        var land = global.BoxiesCaptureLandingView({ y: y });
        if (land) {
          state.intro = land.intro;
          state.exp = land.exp;
          state.y = typeof land.y === 'number' ? land.y : state.y;
          if (land.sh) state.sh = land.sh;
          if (land.vh) state.vh = land.vh;
          if (land.section) state.section = land.section;
        }
      }
    } catch (e) {}
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(state)); } catch (err) {}
    return state;
  }

  function readViewState() {
    try {
      var raw = sessionStorage.getItem(VIEW_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function clearViewState() {
    try { sessionStorage.removeItem(VIEW_KEY); } catch (e) {}
  }

  function applyScrollY(y) {
    y = Math.max(0, Math.round(y || 0));
    try {
      window.scrollTo(0, y);
      document.documentElement.scrollTop = y;
      document.body.scrollTop = y;
    } catch (e) {}
  }

  function restoreViewState() {
    var state = readViewState();
    if (!state || typeof state.y !== 'number') return false;
    var applied = false;
    try {
      if (typeof global.BoxiesRestoreLandingView === 'function') {
        applied = !!global.BoxiesRestoreLandingView(state);
      }
    } catch (e) {}
    if (!applied) {
      var sh = document.documentElement.scrollHeight || 0;
      var vh = window.innerHeight || 1;
      if (state.sh > state.vh && sh > vh) {
        var ratio = state.y / Math.max(1, state.sh - state.vh);
        applyScrollY(ratio * Math.max(1, sh - vh));
      } else {
        applyScrollY(state.y);
      }
      applied = true;
    }
    try {
      if (typeof global.BoxiesSnapLandingScroll === 'function') global.BoxiesSnapLandingScroll();
    } catch (e2) {}
    return applied;
  }

  function scheduleRestore(clearAfter) {
    var n = 0;
    function tick() {
      restoreViewState();
      n += 1;
      if (n < 6) setTimeout(tick, n < 3 ? 40 : 120);
      else if (clearAfter) clearViewState();
    }
    requestAnimationFrame(function () { setTimeout(tick, 0); });
  }

  /* ---------- Dentro del iframe: relé al padre, sin segundo shell ---------- */
  if (inIframe) {
    saveUrl(location.href);
    window.addEventListener('pagehide', function () { saveUrl(location.href); captureViewState(); });
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
      },
      captureView: captureViewState,
      restoreView: function () { scheduleRestore(true); }
    };

    function bootRestore() {
      scheduleRestore(true);
    }
    if (document.readyState === 'complete') bootRestore();
    else window.addEventListener('load', bootRestore);

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
            captureViewState();
            frame.src = url;
          }
        } catch (e) {
          if (href) frame.src = url;
        }
      }
      return shell;
    }

    captureViewState();
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
    var frameY = 0;
    try {
      if (frame && frame.contentWindow) {
        next = frame.contentWindow.location.href || next;
        frameY = frame.contentWindow.scrollY || 0;
        try {
          if (frame.contentWindow.BoxiesFullscreen && frame.contentWindow.BoxiesFullscreen.captureView) {
            frame.contentWindow.BoxiesFullscreen.captureView();
          }
        } catch (e2) {}
      }
    } catch (e) {}
    var shell = getShell();
    if (shell) shell.remove();
    document.documentElement.classList.remove('boxies-fs-shell-on');
    if (next && next.split('#')[0] !== location.href.split('#')[0]) {
      location.replace(next);
    } else {
      applyScrollY(frameY || (readViewState() && readViewState().y) || window.scrollY || 0);
      scheduleRestore(true);
    }
  }

  function enter() {
    intentionalExit = false;
    setWanted(true);
    saveUrl(location.href);
    try {
      var menuY = parseInt(sessionStorage.getItem('boxiesMenuScrollY') || '', 10);
      if (isFinite(menuY) && menuY >= 0) captureViewState({ y: menuY });
      else captureViewState();
    } catch (e) { captureViewState(); }
    // Misma página: solo FS nativo. El shell iframe se crea al navegar a otra ruta
    // para no recargar ni perder el scroll.
    return requestFs()
      .then(function () {
        dispatch(true);
        scheduleRestore(false);
        return true;
      })
      .catch(function () {
        armOneShotEnter();
        dispatch(false);
        scheduleRestore(false);
        return false;
      });
  }

  function leave() {
    intentionalExit = true;
    setWanted(false);
    captureViewState();
    return exitFs()
      .catch(function () {})
      .then(function () {
        destroyShell();
        intentionalExit = false;
        dispatch(false);
        scheduleRestore(true);
        return false;
      });
  }

  function toggle() {
    if (isFs()) return leave();
    if (getShell()) {
      setWanted(true);
      captureViewState();
      return requestFs()
        .then(function () { dispatch(true); scheduleRestore(false); return true; })
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
      dispatch(true);
      scheduleRestore(false);
      return;
    }
    if (intentionalExit) {
      intentionalExit = false;
      setWanted(false);
      destroyShell();
      dispatch(false);
      scheduleRestore(true);
      return;
    }
    // Esc u otra salida involuntaria: no forzar shell (evita recarga/salto).
    if (wanted()) {
      armOneShotEnter();
      dispatch(false);
      scheduleRestore(false);
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
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      cleanup();
      captureViewState();
      requestFs().then(function () {
        dispatch(true);
        scheduleRestore(false);
      }).catch(function () { armOneShotEnter(); });
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

  function shouldShellNav(href) {
    if (!href || href === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return false;
      if (u.pathname === location.pathname && u.search === location.search) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Si FS está activo sin shell, al ir a otra ruta crear shell para no perder FS */
  document.addEventListener('click', function (e) {
    if (getShell()) return;
    if (!isFs() && !wanted()) return;
    var el = e.target.closest && e.target.closest('a[href], a[data-href], button[data-href]');
    if (!el) return;
    var href = el.getAttribute('data-href') || el.getAttribute('href') || '';
    if (!shouldShellNav(href)) return;
    if (!isFs()) return; /* wanted pero sin FS: navegación normal; boot repondrá shell */
    var abs = new URL(href, location.href).href;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    saveUrl(abs);
    captureViewState();
    ensureShell(abs);
  }, true);

  function boot() {
    if (!wanted()) return;
    /* Recarga / llegada desde otra página con FS pendiente → shell */
    if (!getShell()) ensureShell(savedUrl(location.href));
    if (!isFs()) armOneShotEnter();
    else {
      dispatch(true);
      scheduleRestore(true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('pageshow', function () { if (wanted()) boot(); });

  global.BoxiesFullscreen = {
    toggle: toggle,
    restore: function () { return wanted() ? enter() : Promise.resolve(false); },
    ensureShell: ensureShell,
    wanted: wanted,
    isActive: isFs,
    captureView: captureViewState,
    restoreView: function () { scheduleRestore(true); }
  };
})(window);
