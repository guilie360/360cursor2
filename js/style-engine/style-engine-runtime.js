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
    if (activating) return;
    if (typeof StyleEngineStore === 'undefined') return;
    activating = true;
    try {
      var rules = StyleEngineStore.getPublishedRules();
      clearApplied();
      setActiveThemeAttr(StyleEngineStore.ACTIVE.STYLE_ENGINE);
      document.documentElement.setAttribute(ATTR_VS, 'style-engine');
      document.documentElement.setAttribute(ATTR_ACTIVE, 'true');
      document.documentElement.setAttribute(ATTR_MODE, StyleEngineStore.MODES.LIVE);
      document.body.classList.add('style-engine-live-active', 'visual-system-live');
      applySeTokens(rules);
      applyLegacyBridge(rules);
      applyPersonalizarMaterialsIfAny();
    } finally {
      activating = false;
    }
  }

  var reinforceScheduled = false;

  function reinforcePublished() {
    if (!StyleEngineCompatibility.isStyleEngineLive()) return;
    activatePublished();
    if (reinforceScheduled) return;
    reinforceScheduled = true;
    window.requestAnimationFrame(function () {
      reinforceScheduled = false;
      if (StyleEngineCompatibility.isStyleEngineLive()) activatePublished();
    });
  }

  /** Store→DOM only. Never ThemeSystem.reapply — that path must not run inside sync. */
  function applyLegacyDom() {
    clearApplied();
    setActiveThemeAttr(StyleEngineStore.ACTIVE.LEGACY);
    document.documentElement.removeAttribute(ATTR_ACTIVE);
    document.documentElement.removeAttribute(ATTR_MODE);
    document.documentElement.removeAttribute(ATTR_VS);
    if (typeof StyleEnginePersonalizarMapper !== 'undefined' &&
        StyleEnginePersonalizarMapper.clearMaterialsFlag) {
      StyleEnginePersonalizarMapper.clearMaterialsFlag();
    }
  }

  /**
   * Intentional legacy activation (boot / restore).
   * options.skipThemeReapply: DOM only (required from sync and from boot shell).
   */
  function activateLegacy(options) {
    options = options || {};
    applyLegacyDom();
    if (options.skipThemeReapply || syncing) return;
    if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
      ThemeSystem.reapply();
    }
  }

  function isSyncing() {
    return syncing;
  }

  function sync(options) {
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
  }

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
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  try {

    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    if (!subscribed) {
      subscribed = true;
      StyleEngineStore.subscribe(onStoreNotify);
    }
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  }
}

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
