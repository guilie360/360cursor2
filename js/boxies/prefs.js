/**
 * BOXIES workspace prefs — persisted UI chrome (independent panel collapse).
 */
var BoxiesPrefs = (function () {
  var KEY = 'boxies_workspace_prefs_v1';

  function defaults() {
    return {
      navCollapsed: false,
      railCollapsed: false,
      experienciaCanvasMode: false,
      _expCanvasRestore: null
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) {
      return defaults();
    }
  }

  function save(partial) {
    var next = Object.assign(load(), partial || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function getNavCollapsed() {
    return !!load().navCollapsed;
  }

  function setNavCollapsed(on) {
    return save({ navCollapsed: !!on });
  }

  function getRailCollapsed() {
    return !!load().railCollapsed;
  }

  function setRailCollapsed(on) {
    return save({ railCollapsed: !!on });
  }

  return {
    load: load,
    save: save,
    getNavCollapsed: getNavCollapsed,
    setNavCollapsed: setNavCollapsed,
    getRailCollapsed: getRailCollapsed,
    setRailCollapsed: setRailCollapsed
  };
})();
