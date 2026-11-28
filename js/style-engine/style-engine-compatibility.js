try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-compatibility.js');}catch(_e){}
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
    var originalPreview = ThemeSystem.previewCustomTheme
      ? ThemeSystem.previewCustomTheme.bind(ThemeSystem)
      : null;

    ThemeSystem.reapply = function () {
      if (isStyleEngineLive()) {
        /* Ya está LIVE: no reaplicar todo el motor en cada reapply (congela clics). */
        return StyleEngineStore.getEngineMode();
      }
      return originalReapply();
    };

    ThemeSystem.apply = function (themeKey, persist, customThemeData) {
      if (isStyleEngineLive()) {
        /* Personalizar 2.0 empuja materiales vía preview; apply legacy no debe
           disparar reinforcePublished (era un bucle caro de ~3–5s). */
        return themeKey;
      }
      return originalApply(themeKey, persist, customThemeData);
    };

    /* previewCustomTheme se permite en LIVE: Personalizar 2.0 lo usa para materiales V1 */
    if (originalPreview) {
      ThemeSystem.previewCustomTheme = function (config) {
        return originalPreview(config);
      };
    }

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

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-compatibility.js');}catch(_e){}
