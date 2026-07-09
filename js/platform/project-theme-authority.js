/* Official project theme — separate from personal user themes */
var ProjectThemeAuthority = (function () {
  var FEATURE_ENABLED = true;

  function canSetOfficialTheme(profile) {
    return PlatformRoles.isAdmin(profile || (typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null));
  }

  function getCurrentProyectoId() {
    return window.PROJECT_DATA && window.PROJECT_DATA.id ? window.PROJECT_DATA.id : null;
  }

  function getProjectDefaultTheme() {
    return ProjectThemeApi.getFromProject(window.PROJECT_DATA);
  }

  function visitorHasPersonalThemePrefs() {
    if (typeof VisitorPersonalization === 'undefined') return false;
    if (typeof VisitorPersonalization.hasSavedPersonalPrefs === 'function') {
      return VisitorPersonalization.hasSavedPersonalPrefs();
    }
    return VisitorPersonalization.hasPersonalTheme();
  }

  function shouldApplyProjectDefault() {
    if (typeof StyleEngineCompatibility !== 'undefined' &&
        StyleEngineCompatibility.isStyleEngineLive()) {
      return false;
    }

    if (typeof ThemeSystem !== 'undefined' &&
        typeof ThemeSystem.isExplicitUserChoice === 'function' &&
        ThemeSystem.isExplicitUserChoice()) {
      return false;
    }

    if (visitorHasPersonalThemePrefs()) {
      return false;
    }

    return !!getProjectDefaultTheme();
  }

  function applyDefaultForCurrentVisitor() {
    if (!shouldApplyProjectDefault()) return false;
    var theme = getProjectDefaultTheme();
    if (!theme) return false;

    var customKey = ThemeSystem.CUSTOM_THEME_KEY;
    var key = theme.themeKey || customKey;

    if (key === customKey) {
      ThemeSystem.apply(customKey, false, ThemeSystem.normalizeCustomConfig(theme));
    } else if (ThemeSystem.THEMES[key]) {
      ThemeSystem.apply(key, false);
    }

    ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
    return true;
  }

  function reapplyIfNeeded() {
    if (!window.PROJECT_DATA) return false;
    return applyDefaultForCurrentVisitor();
  }

  async function setOfficialThemeForProject(proyectoId, themeConfig) {
    if (!canSetOfficialTheme()) {
      throw new Error('Solo los administradores pueden aplicar el tema oficial del proyecto.');
    }
    return ProjectThemeApi.setDefaultTheme(proyectoId, themeConfig);
  }

  return {
    FEATURE_ENABLED: FEATURE_ENABLED,
    canSetOfficialTheme: canSetOfficialTheme,
    getCurrentProyectoId: getCurrentProyectoId,
    getProjectDefaultTheme: getProjectDefaultTheme,
    shouldApplyProjectDefault: shouldApplyProjectDefault,
    applyDefaultForCurrentVisitor: applyDefaultForCurrentVisitor,
    reapplyIfNeeded: reapplyIfNeeded,
    setOfficialThemeForProject: setOfficialThemeForProject
  };
})();
