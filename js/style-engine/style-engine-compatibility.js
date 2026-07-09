/* Style Engine — Compatibilidad v2.1 */
var StyleEngineCompatibility = (function () {
  function isAdminViewer() {
    return typeof PlatformRoles !== 'undefined' &&
      typeof VisitorSession !== 'undefined' &&
      VisitorSession.isAuthenticated() &&
      PlatformRoles.isAdmin(VisitorSession.getProfile());
  }

  function getActiveMode() {
    if (typeof StyleEngineStore === 'undefined') return 'off';
    return StyleEngineStore.getEngineMode();
  }

  function getActiveTheme() {
    if (typeof StyleEngineStore === 'undefined') return 'legacy';
    return StyleEngineStore.getActiveTheme();
  }

  function shouldApplyRuntime() {
    return StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
      StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE;
  }

  function isStyleEngineLive() {
    return shouldApplyRuntime();
  }

  function installThemeGuard() {
    if (typeof ThemeSystem === 'undefined' || ThemeSystem.__seGuardInstalled) return;

    var originalReapply = ThemeSystem.reapply.bind(ThemeSystem);
    var originalApply = ThemeSystem.apply.bind(ThemeSystem);

    ThemeSystem.reapply = function () {
      if (isStyleEngineLive()) {
        StyleEngineRuntime.reinforcePublished();
        return StyleEngineStore.getEngineMode();
      }
      return originalReapply();
    };

    ThemeSystem.apply = function (themeKey, persist, customThemeData) {
      if (isStyleEngineLive()) {
        StyleEngineRuntime.reinforcePublished();
        return themeKey;
      }
      return originalApply(themeKey, persist, customThemeData);
    };

    ThemeSystem.__seGuardInstalled = true;
  }

  function legacyThemeEnabled() {
    return StyleEngineStore.getActiveTheme() !== StyleEngineStore.ACTIVE.STYLE_ENGINE ||
      StyleEngineStore.getEngineMode() !== StyleEngineStore.MODES.LIVE;
  }

  function styleEngineEnabled() {
    return shouldApplyRuntime();
  }

  function getMigratedScreens() {
    return StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE ? ['global'] : [];
  }

  function registerMigratedScreen() { /* reservado futuro */ }

  return {
    isAdminViewer: isAdminViewer,
    getActiveMode: getActiveMode,
    getActiveTheme: getActiveTheme,
    shouldApplyRuntime: shouldApplyRuntime,
    isStyleEngineLive: isStyleEngineLive,
    installThemeGuard: installThemeGuard,
    legacyThemeEnabled: legacyThemeEnabled,
    styleEngineEnabled: styleEngineEnabled,
    getMigratedScreens: getMigratedScreens,
    registerMigratedScreen: registerMigratedScreen
  };
})();
