/* HALL — official BOXIES Design System entrypoint (platform-wide) */
var HallDesignSystem = (function () {
  var STYLE_NAME = typeof PROJECT_DEFAULT_STYLE_NAME !== 'undefined'
    ? PROJECT_DEFAULT_STYLE_NAME
    : 'HALL';
  var STYLE_ID = typeof PROJECT_DEFAULT_STYLE_ID !== 'undefined'
    ? PROJECT_DEFAULT_STYLE_ID
    : 'project-default-hall';

  function getOfficialTheme() {
    if (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined' && PROJECT_DEFAULT_THEME_FALLBACK) {
      return PROJECT_DEFAULT_THEME_FALLBACK;
    }
    if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.getDefaultCustomTheme === 'function') {
      return ThemeSystem.getDefaultCustomTheme();
    }
    return null;
  }

  /**
   * Paint HALL tokens on the document. Call once when mounting any
   * platform surface outside a project showroom (Global Admin, tools, etc.).
   */
  function paint(options) {
    options = options || {};
    var theme = getOfficialTheme();
    if (!theme) {
      document.documentElement.classList.add('theme-ready');
      return false;
    }

    if (typeof ThemeSystem !== 'undefined') {
      if (typeof ThemeSystem.apply === 'function') {
        ThemeSystem.apply('custom', false, theme);
      } else if (typeof ThemeSystem.previewCustomTheme === 'function') {
        ThemeSystem.previewCustomTheme(theme);
      }
      if (typeof ThemeSystem.applyHeroLayout === 'function' && theme.heroLayout) {
        ThemeSystem.applyHeroLayout(theme.heroLayout);
      }
    }

    document.documentElement.classList.add('theme-ready');
    if (document.body) {
      document.body.classList.add('hall-design-system');
      document.body.dataset.hallStyle = STYLE_NAME;
    }
    return true;
  }

  function seedProjectConfigPayload() {
    var theme = getOfficialTheme();
    var payload = {};
    if (theme) payload.project_default_theme = theme;
    return payload;
  }

  return {
    STYLE_NAME: STYLE_NAME,
    STYLE_ID: STYLE_ID,
    getOfficialTheme: getOfficialTheme,
    paint: paint,
    seedProjectConfigPayload: seedProjectConfigPayload
  };
})();
