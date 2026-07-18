/* Style Engine — Runtime v3: VisualSystem → toda la plataforma en LIVE */
var StyleEngineRuntime = (function () {
  var appliedSeKeys = [];
  var appliedLegacyKeys = [];
  var ATTR_MODE = 'data-style-engine-mode';
  var ATTR_ACTIVE = 'data-style-engine-active';
  var ATTR_THEME = 'data-active-theme';
  var ATTR_VS = 'data-visual-system';

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

  function activateLegacy() {
    clearApplied();
    setActiveThemeAttr(StyleEngineStore.ACTIVE.LEGACY);
    document.documentElement.removeAttribute(ATTR_ACTIVE);
    document.documentElement.removeAttribute(ATTR_MODE);
    document.documentElement.removeAttribute(ATTR_VS);
    if (typeof StyleEnginePersonalizarMapper !== 'undefined' &&
        StyleEnginePersonalizarMapper.clearMaterialsFlag) {
      StyleEnginePersonalizarMapper.clearMaterialsFlag();
    }
    if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
      ThemeSystem.reapply();
    }
  }

  function sync(options) {
    options = options || {};
    if (StyleEngineStore.getActiveTheme() !== StyleEngineStore.ACTIVE.STYLE_ENGINE) {
      if (!options.keepLegacy) activateLegacy();
      return;
    }
    if (StyleEngineStore.getEngineMode() !== StyleEngineStore.MODES.LIVE) {
      clearApplied();
      setActiveThemeAttr(StyleEngineStore.ACTIVE.STYLE_ENGINE);
      return;
    }
    activatePublished();
  }

  function init() {
    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    StyleEngineStore.subscribe(function () {
      if (StyleEngineModal && StyleEngineModal.isOpen && StyleEngineModal.isOpen()) return;
      sync();
    });
  }

  return {
    init: init,
    sync: sync,
    clearApplied: clearApplied,
    activatePublished: activatePublished,
    reinforcePublished: reinforcePublished,
    activateLegacy: activateLegacy
  };
})();
