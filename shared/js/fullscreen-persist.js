/**
 * Persistencia de pantalla completa en toda la plataforma 360Preventa.
 * El navegador sale del FS al navegar; guardamos la intención y la
 * restauramos en cada página hasta que el usuario pulse “salir”.
 */
(function (global) {
  var KEY = 'boxiesKeepFullscreen';
  var intentionalExit = false;
  var restoring = false;

  function wanted() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function setWanted(on) {
    try {
      if (on) sessionStorage.setItem(KEY, '1');
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
  }
  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function requestFs() {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return Promise.reject(new Error('fullscreen unsupported'));
    return Promise.resolve(fn.call(el));
  }
  function exitFs() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (!fn) return Promise.reject(new Error('fullscreen unsupported'));
    return Promise.resolve(fn.call(document));
  }

  function restore() {
    if (!wanted() || isFs() || restoring) return Promise.resolve(false);
    restoring = true;
    return requestFs()
      .then(function () { restoring = false; return true; })
      .catch(function () { restoring = false; return false; });
  }

  function toggle() {
    if (isFs()) {
      intentionalExit = true;
      setWanted(false);
      return exitFs()
        .catch(function () { intentionalExit = false; })
        .then(function () { return false; });
    }
    intentionalExit = false;
    setWanted(true);
    return requestFs()
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function onFsChange() {
    if (isFs()) {
      setWanted(true);
      intentionalExit = false;
      global.dispatchEvent(new CustomEvent('boxies:fullscreen', { detail: { active: true } }));
      return;
    }
    if (intentionalExit) {
      intentionalExit = false;
      setWanted(false);
    }
    // Salida involuntaria (navegación, Esc del sistema, etc.):
    // mantenemos wanted=true para restaurar en la siguiente página/gesto.
    global.dispatchEvent(new CustomEvent('boxies:fullscreen', { detail: { active: false, wanted: wanted() } }));
  }

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  function armGestureRestore() {
    if (!wanted()) return;
    var events = ['pointerdown', 'keydown', 'touchstart'];
    function tryRestore() {
      if (!wanted() || isFs()) return;
      restore();
    }
    events.forEach(function (ev) {
      document.addEventListener(ev, tryRestore, { capture: true, passive: true });
    });
  }

  function boot() {
    if (!wanted()) return;
    restore();
    armGestureRestore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('pageshow', function () {
    if (wanted()) restore();
  });

  global.BoxiesFullscreen = {
    toggle: toggle,
    restore: restore,
    wanted: wanted,
    isActive: isFs
  };
})(window);
