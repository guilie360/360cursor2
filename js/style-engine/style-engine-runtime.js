console.log("BOOT ENTER js/style-engine/style-engine-runtime.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-runtime.js');}catch(_e){}
/* Style Engine — Runtime v3: VisualSystem → toda la plataforma en LIVE */
var StyleEngineRuntime = (function () {
  var appliedSeKeys = [];
  var appliedLegacyKeys = [];
  var ATTR_MODE = 'data-style-engine-mode';
  var ATTR_ACTIVE = 'data-style-engine-active';
  var ATTR_THEME = 'data-active-theme';
  var ATTR_VS = 'data-visual-system';

  /* Sync owns store→DOM. Never calls ThemeSystem.reapply (breaks notify→sync→reapply). */
  var syncing = false;
  var lastSyncedFingerprint = null;
  var subscribed = false;

  function clearApplied() {
    var root = document.documentElement;
    appliedSeKeys.forEach(function (key) {
      root.style.removeProperty(StyleEngineTokens.cssVarName(key));
    });
    appliedSeKeys = [];
    appliedLegacyKeys.forEach(function (cssName) {
      root.style.removeProperty(cssName);
    });
    appliedLegacyKeys = [];
    root.removeAttribute(ATTR_MODE);
    root.removeAttribute(ATTR_ACTIVE);
    root.removeAttribute(ATTR_VS);
    document.body.classList.remove('style-engine-preview-active', 'style-engine-live-active', 'visual-system-live');
  }

  function applySeTokens(rules) {
    var root = document.documentElement;
    Object.keys(rules).forEach(function (key) {
      if (!StyleEngineTokens.getTokenMeta(key)) return;
      var cssName = StyleEngineTokens.cssVarName(key);
      root.style.setProperty(cssName, rules[key]);
      appliedSeKeys.push(key);
    });
  }

  function applyLegacyBridge(rules) {
    var payload = StyleEngineLegacyAdapter.buildLegacyPayload(rules);
    var root = document.documentElement;
    Object.keys(payload).forEach(function (cssName) {
      root.style.setProperty(cssName, payload[cssName]);
      appliedLegacyKeys.push(cssName);
    });
  }

  function setActiveThemeAttr(theme) {
    document.documentElement.setAttribute(ATTR_THEME, theme);
  }

  var applyingMaterials = false;

  function applyPersonalizarMaterialsIfAny() {
    if (applyingMaterials) return;
    if (typeof StyleEnginePersonalizarMapper === 'undefined') return;

    var draft = null;
    if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getPersonalizarDraft) {
      draft = StyleEngineStore.getPersonalizarDraft();
    }

    var official = null;
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getOfficialDraft === 'function') {
      official = ProjectThemeAuthority.getOfficialDraft();
    }
    if (!official && typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined') {
      official = typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig
        ? ThemeSystem.normalizeCustomConfig(PROJECT_DEFAULT_THEME_FALLBACK)
        : PROJECT_DEFAULT_THEME_FALLBACK;
    }

    var meta = typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getActiveStyleMeta
      ? StyleEngineStore.getActiveStyleMeta()
      : null;
    var isHall = meta && String(meta.name || '').replace(/\s+/g, '').toUpperCase() === 'HALL';

    if ((isHall && official) || (!draft && official)) {
      draft = official;
    }

    if (!draft) return;

    applyingMaterials = true;
    try {
      StyleEnginePersonalizarMapper.applyMaterials(draft);
    } finally {
      applyingMaterials = false;
    }
  }

  var activating = false;

  function activatePublished() {
  console.log("ENTER activatePublished");
  try {

    console.log("SE44 enter activatePublished");
    if (activating) {
      console.log("SE45 activatePublished early: activating");
      return;
    }
    if (typeof StyleEngineStore === 'undefined') {
      console.log("SE46 activatePublished early: no store");
      return;
    }
    activating = true;
    try {
      console.log("SE47 before getPublishedRules");
      var rules = StyleEngineStore.getPublishedRules();
      console.log("SE48 after getPublishedRules");
      console.log("SE49 before clearApplied");
      clearApplied();
      console.log("SE50 after clearApplied");
      setActiveThemeAttr(StyleEngineStore.ACTIVE.STYLE_ENGINE);
      document.documentElement.setAttribute(ATTR_VS, 'style-engine');
      document.documentElement.setAttribute(ATTR_ACTIVE, 'true');
      document.documentElement.setAttribute(ATTR_MODE, StyleEngineStore.MODES.LIVE);
      document.body.classList.add('style-engine-live-active', 'visual-system-live');
      console.log("SE50a before applySeTokens");
      applySeTokens(rules);
      console.log("SE50b after applySeTokens");
      console.log("SE50c before applyLegacyBridge");
      applyLegacyBridge(rules);
      console.log("SE50d after applyLegacyBridge");
      console.log("SE50e before applyPersonalizarMaterialsIfAny");
      applyPersonalizarMaterialsIfAny();
      console.log("SE50f after applyPersonalizarMaterialsIfAny");
    } finally {
      activating = false;
    }
    console.log("SE50g exit activatePublished");
  
  } finally {
    console.log("EXIT activatePublished");
  }}

  var reinforceScheduled = false;

  function reinforcePublished() {
  console.log("ENTER reinforcePublished");
  try {

    console.log("SE41 enter reinforcePublished");
    if (!StyleEngineCompatibility.isStyleEngineLive()) {
      console.log("SE42 reinforcePublished early: not LIVE");
      return;
    }
    console.log("SE43 before activatePublished (reinforce)");
    activatePublished();
    console.log("SE43a after activatePublished (reinforce)");
    if (reinforceScheduled) {
      console.log("SE43b reinforce already scheduled");
      return;
    }
    reinforceScheduled = true;
    console.log("SE43c before requestAnimationFrame reinforce");
    window.requestAnimationFrame(function () {
      console.log("SE43d rAF reinforce callback");
      reinforceScheduled = false;
      if (StyleEngineCompatibility.isStyleEngineLive()) activatePublished();
      console.log("SE43e rAF reinforce done");
    });
    console.log("SE43f exit reinforcePublished");
  
  } finally {
    console.log("EXIT reinforcePublished");
  }}

  /** Store→DOM only. Never ThemeSystem.reapply — that path must not run inside sync. */
  function applyLegacyDom() {
    console.log("SE38a enter applyLegacyDom");
    clearApplied();
    console.log("SE38b after clearApplied");
    setActiveThemeAttr(StyleEngineStore.ACTIVE.LEGACY);
    document.documentElement.removeAttribute(ATTR_ACTIVE);
    document.documentElement.removeAttribute(ATTR_MODE);
    document.documentElement.removeAttribute(ATTR_VS);
    if (typeof StyleEnginePersonalizarMapper !== 'undefined' &&
        StyleEnginePersonalizarMapper.clearMaterialsFlag) {
      console.log("SE38c before clearMaterialsFlag");
      StyleEnginePersonalizarMapper.clearMaterialsFlag();
      console.log("SE38d after clearMaterialsFlag");
    }
    console.log("SE38e exit applyLegacyDom");
  }

  /**
   * Intentional legacy activation (boot / restore).
   * options.skipThemeReapply: DOM only (required from sync and from boot shell).
   */
  function activateLegacy(options) {
  console.log("ENTER activateLegacy");
  try {

    console.log("SE38 enter activateLegacy");
    options = options || {};
    console.log("SE39 before applyLegacyDom");
    applyLegacyDom();
    console.log("SE40 after applyLegacyDom");
    if (options.skipThemeReapply || syncing) {
      console.log("SE40a activateLegacy skip ThemeSystem.reapply");
      return;
    }
    if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
      console.log("SE40b before ThemeSystem.reapply");
      ThemeSystem.reapply();
      console.log("SE40c after ThemeSystem.reapply");
    }
    console.log("SE40d exit activateLegacy");
  
  } finally {
    console.log("EXIT activateLegacy");
  }}

  function isSyncing() {
    return syncing;
  }

  function sync(options) {
  console.log("ENTER sync");
  try {

    options = options || {};
    if (syncing) return;
    if (typeof StyleEngineStore === 'undefined') return;

    var fingerprint = typeof StyleEngineStore.getSyncFingerprint === 'function'
      ? StyleEngineStore.getSyncFingerprint()
      : null;
    if (fingerprint != null && fingerprint === lastSyncedFingerprint && !options.force) {
      return;
    }

    syncing = true;
    try {
      if (StyleEngineStore.getActiveTheme() !== StyleEngineStore.ACTIVE.STYLE_ENGINE) {
        if (!options.keepLegacy) applyLegacyDom();
        lastSyncedFingerprint = fingerprint;
        return;
      }
      if (StyleEngineStore.getEngineMode() !== StyleEngineStore.MODES.LIVE) {
        clearApplied();
        setActiveThemeAttr(StyleEngineStore.ACTIVE.STYLE_ENGINE);
        lastSyncedFingerprint = fingerprint;
        return;
      }
      activatePublished();
      lastSyncedFingerprint = fingerprint;
    } finally {
      syncing = false;
    }
  
  } finally {
    console.log("EXIT sync");
  }}

  function onStoreNotify(event) {
    if (syncing) return;
    if (event && event.draftOnly) return;
    if (typeof StyleEngineModal !== 'undefined' &&
        StyleEngineModal.isOpen && StyleEngineModal.isOpen()) {
      return;
    }
    sync();
  }

  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  try {

    console.log("SE26");
    console.log("SE27 before installThemeGuard");
    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    console.log("SE28 after installThemeGuard");
    console.log("SE29 before subscribe");
    if (!subscribed) {
      subscribed = true;
      StyleEngineStore.subscribe(onStoreNotify);
    }
    console.log("SE30 after subscribe");
    console.log("SE31");
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  return {
    init: init,
    sync: sync,
    isSyncing: isSyncing,
    clearApplied: clearApplied,
    activatePublished: activatePublished,
    reinforcePublished: reinforcePublished,
    activateLegacy: activateLegacy
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-runtime.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-runtime.js");
