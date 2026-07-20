console.log("BOOT ENTER js/style-engine/style-engine-compatibility.js");
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
  console.log("ENTER installThemeGuard");
  try {

    console.log("SE26a enter installThemeGuard");
    if (typeof ThemeSystem === 'undefined' || ThemeSystem.__seGuardInstalled) {
      console.log("SE26b installThemeGuard early return");
      return;
    }

    console.log("SE26c before bind originalReapply/apply/preview");
    var originalReapply = ThemeSystem.reapply.bind(ThemeSystem);
    var originalApply = ThemeSystem.apply.bind(ThemeSystem);
    var originalPreview = ThemeSystem.previewCustomTheme
      ? ThemeSystem.previewCustomTheme.bind(ThemeSystem)
      : null;
    console.log("SE26d after bind originals");

    console.log("SE26e before wrap ThemeSystem.reapply");
    ThemeSystem.reapply = function () {
      if (typeof StyleEngineRuntime !== 'undefined' &&
          typeof StyleEngineRuntime.isSyncing === 'function' &&
          StyleEngineRuntime.isSyncing()) {
        return typeof ThemeSystem.getCurrentKey === 'function'
          ? ThemeSystem.getCurrentKey()
          : null;
      }
      if (isStyleEngineLive()) {
        /* Ya está LIVE: no reaplicar todo el motor en cada reapply (congela clics). */
        return StyleEngineStore.getEngineMode();
      }
      return originalReapply();
    };
    console.log("SE26f after wrap ThemeSystem.reapply");

    console.log("SE26g before wrap ThemeSystem.apply");
    ThemeSystem.apply = function (themeKey, persist, customThemeData) {
      if (isStyleEngineLive()) {
        /* Personalizar 2.0 empuja materiales vía preview; apply legacy no debe
           disparar reinforcePublished (era un bucle caro de ~3–5s). */
        return themeKey;
      }
      return originalApply(themeKey, persist, customThemeData);
    };
    console.log("SE26h after wrap ThemeSystem.apply");

    /* previewCustomTheme se permite en LIVE: Personalizar 2.0 lo usa para materiales V1 */
    if (originalPreview) {
      console.log("SE26i before wrap previewCustomTheme");
      ThemeSystem.previewCustomTheme = function (config) {
        return originalPreview(config);
      };
      console.log("SE26j after wrap previewCustomTheme");
    }

    ThemeSystem.__seGuardInstalled = true;
    console.log("SE26k exit installThemeGuard");
  
  } finally {
    console.log("EXIT installThemeGuard");
  }}

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

console.log("BOOT EXIT js/style-engine/style-engine-compatibility.js");
