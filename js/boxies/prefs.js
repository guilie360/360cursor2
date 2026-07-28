/**
 * BOXIES workspace prefs — persisted UI chrome (independent panel collapse).
 */
var BoxiesPrefs = (function () {
  var KEY = 'boxies_workspace_prefs_v1';

  function defaults() {
    return {
      navCollapsed: false,
      railCollapsed: false,
      /* V5.9.81 — Builder Panel B only; platform nav unaffected */
      builderNavigationCollapsed: false,
      experienciaCanvasMode: false,
      _expCanvasRestore: null
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      var data = Object.assign(defaults(), JSON.parse(raw));
      /* Migrate legacy railCollapsed → builderNavigationCollapsed once */
      if (data.builderNavigationCollapsed == null && data.railCollapsed != null) {
        data.builderNavigationCollapsed = !!data.railCollapsed;
      }
      return data;
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

  function getBuilderNavigationCollapsed() {
    var data = load();
    if (Object.prototype.hasOwnProperty.call(data, 'builderNavigationCollapsed')) {
      return !!data.builderNavigationCollapsed;
    }
    return !!data.railCollapsed;
  }

  function setBuilderNavigationCollapsed(on) {
    on = !!on;
    return save({
      builderNavigationCollapsed: on,
      railCollapsed: on
    });
  }

  /* Legacy aliases — same as builderNavigationCollapsed */
  function getRailCollapsed() {
    return getBuilderNavigationCollapsed();
  }

  function setRailCollapsed(on) {
    return setBuilderNavigationCollapsed(on);
  }

  return {
    load: load,
    save: save,
    getNavCollapsed: getNavCollapsed,
    setNavCollapsed: setNavCollapsed,
    getBuilderNavigationCollapsed: getBuilderNavigationCollapsed,
    setBuilderNavigationCollapsed: setBuilderNavigationCollapsed,
    getRailCollapsed: getRailCollapsed,
    setRailCollapsed: setRailCollapsed
  };
})();
