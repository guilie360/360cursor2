/**
 * BOXIES workspace prefs — persisted UI chrome (independent panel collapse).
 * V7.0.04 — sidebar is always full-width, no collapse state.
 */
var BoxiesPrefs = (function () {
  var KEY = 'boxies_workspace_prefs_v1';

  function defaults() {
    return {
      railCollapsed: false,
      /* V5.9.81 — Builder Panel B only; platform nav unaffected */
      builderNavigationCollapsed: false,
      /* V6.0.00 — Experiencia properties rail (right) */
      propsRailCollapsed: false,
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

  function getPropsRailCollapsed() {
    return !!load().propsRailCollapsed;
  }

  function setPropsRailCollapsed(on) {
    return save({ propsRailCollapsed: !!on });
  }

  return {
    load: load,
    save: save,
    getBuilderNavigationCollapsed: getBuilderNavigationCollapsed,
    setBuilderNavigationCollapsed: setBuilderNavigationCollapsed,
    getRailCollapsed: getRailCollapsed,
    setRailCollapsed: setRailCollapsed,
    getPropsRailCollapsed: getPropsRailCollapsed,
    setPropsRailCollapsed: setPropsRailCollapsed
  };
})();
