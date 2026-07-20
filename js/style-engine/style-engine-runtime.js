try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-runtime.js');}catch(_e){}
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
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[CASCADE]', 'StyleEngineRuntime.activatePublished', Date.now(), window.__CASCADE_N);
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
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[CASCADE]', 'StyleEngineRuntime.reinforcePublished', Date.now(), window.__CASCADE_N);
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
    console.log('[ACTIVATE-LEGACY] 1 ENTER activateLegacy', Date.now());

    /* --- clearApplied() inlined with step logs (same operations) --- */
    console.log('[ACTIVATE-LEGACY] 2 BEFORE clearApplied body');
    console.log('[ACTIVATE-LEGACY] 3 BEFORE document.documentElement');
    var root = document.documentElement;
    console.log('[ACTIVATE-LEGACY] 4 AFTER document.documentElement', !!root, root && root.nodeName);

    console.log('[ACTIVATE-LEGACY] 5 BEFORE appliedSeKeys.forEach', 'count=', appliedSeKeys.length, 'keys=', appliedSeKeys.slice());
    appliedSeKeys.forEach(function (key, idx) {
      console.log('[ACTIVATE-LEGACY] 5a LOOP SE start', idx, key);
      console.log('[ACTIVATE-LEGACY] 5b BEFORE StyleEngineTokens.cssVarName', key);
      var seCssName = StyleEngineTokens.cssVarName(key);
      console.log('[ACTIVATE-LEGACY] 5c AFTER StyleEngineTokens.cssVarName', seCssName);
      console.log('[ACTIVATE-LEGACY] 5d BEFORE root.style.removeProperty', seCssName);
      root.style.removeProperty(seCssName);
      console.log('[ACTIVATE-LEGACY] 5e AFTER root.style.removeProperty', seCssName);
    });
    console.log('[ACTIVATE-LEGACY] 6 AFTER appliedSeKeys.forEach');

    console.log('[ACTIVATE-LEGACY] 7 BEFORE appliedSeKeys = []');
    appliedSeKeys = [];
    console.log('[ACTIVATE-LEGACY] 8 AFTER appliedSeKeys = []', appliedSeKeys.length);

    console.log('[ACTIVATE-LEGACY] 9 BEFORE appliedLegacyKeys.forEach', 'count=', appliedLegacyKeys.length, 'keys=', appliedLegacyKeys.slice());
    appliedLegacyKeys.forEach(function (cssName, idx) {
      console.log('[ACTIVATE-LEGACY] 9a LOOP LEGACY start', idx, cssName);
      console.log('[ACTIVATE-LEGACY] 9b BEFORE root.style.removeProperty', cssName);
      root.style.removeProperty(cssName);
      console.log('[ACTIVATE-LEGACY] 9c AFTER root.style.removeProperty', cssName);
    });
    console.log('[ACTIVATE-LEGACY] 10 AFTER appliedLegacyKeys.forEach');

    console.log('[ACTIVATE-LEGACY] 11 BEFORE appliedLegacyKeys = []');
    appliedLegacyKeys = [];
    console.log('[ACTIVATE-LEGACY] 12 AFTER appliedLegacyKeys = []', appliedLegacyKeys.length);

    console.log('[ACTIVATE-LEGACY] 13 BEFORE root.removeAttribute(ATTR_MODE)', ATTR_MODE);
    root.removeAttribute(ATTR_MODE);
    console.log('[ACTIVATE-LEGACY] 14 AFTER root.removeAttribute(ATTR_MODE)');

    console.log('[ACTIVATE-LEGACY] 15 BEFORE root.removeAttribute(ATTR_ACTIVE)', ATTR_ACTIVE);
    root.removeAttribute(ATTR_ACTIVE);
    console.log('[ACTIVATE-LEGACY] 16 AFTER root.removeAttribute(ATTR_ACTIVE)');

    console.log('[ACTIVATE-LEGACY] 17 BEFORE root.removeAttribute(ATTR_VS)', ATTR_VS);
    root.removeAttribute(ATTR_VS);
    console.log('[ACTIVATE-LEGACY] 18 AFTER root.removeAttribute(ATTR_VS)');

    console.log('[ACTIVATE-LEGACY] 19 BEFORE document.body');
    var body = document.body;
    console.log('[ACTIVATE-LEGACY] 20 AFTER document.body', !!body);

    console.log('[ACTIVATE-LEGACY] 21 BEFORE body.classList.remove(...)');
    body.classList.remove('style-engine-preview-active', 'style-engine-live-active', 'visual-system-live');
    console.log('[ACTIVATE-LEGACY] 22 AFTER body.classList.remove(...)');
    console.log('[ACTIVATE-LEGACY] 23 AFTER clearApplied body');

    /* --- setActiveThemeAttr(StyleEngineStore.ACTIVE.LEGACY) --- */
    console.log('[ACTIVATE-LEGACY] 24 BEFORE StyleEngineStore.ACTIVE.LEGACY read');
    var legacyTheme = StyleEngineStore.ACTIVE.LEGACY;
    console.log('[ACTIVATE-LEGACY] 25 AFTER StyleEngineStore.ACTIVE.LEGACY', legacyTheme);

    console.log('[ACTIVATE-LEGACY] 26 BEFORE setActiveThemeAttr / document.documentElement.setAttribute', ATTR_THEME, legacyTheme);
    document.documentElement.setAttribute(ATTR_THEME, legacyTheme);
    console.log('[ACTIVATE-LEGACY] 27 AFTER setActiveThemeAttr / setAttribute');

    console.log('[ACTIVATE-LEGACY] 28 BEFORE document.documentElement.removeAttribute(ATTR_ACTIVE)', ATTR_ACTIVE);
    document.documentElement.removeAttribute(ATTR_ACTIVE);
    console.log('[ACTIVATE-LEGACY] 29 AFTER removeAttribute(ATTR_ACTIVE)');

    console.log('[ACTIVATE-LEGACY] 30 BEFORE document.documentElement.removeAttribute(ATTR_MODE)', ATTR_MODE);
    document.documentElement.removeAttribute(ATTR_MODE);
    console.log('[ACTIVATE-LEGACY] 31 AFTER removeAttribute(ATTR_MODE)');

    console.log('[ACTIVATE-LEGACY] 32 BEFORE document.documentElement.removeAttribute(ATTR_VS)', ATTR_VS);
    document.documentElement.removeAttribute(ATTR_VS);
    console.log('[ACTIVATE-LEGACY] 33 AFTER removeAttribute(ATTR_VS)');

    console.log('[ACTIVATE-LEGACY] 34 BEFORE typeof StyleEnginePersonalizarMapper check');
    var hasMapper = typeof StyleEnginePersonalizarMapper !== 'undefined';
    console.log('[ACTIVATE-LEGACY] 35 AFTER typeof StyleEnginePersonalizarMapper', hasMapper);

    if (hasMapper) {
      console.log('[ACTIVATE-LEGACY] 36 BEFORE StyleEnginePersonalizarMapper.clearMaterialsFlag check');
      var hasClearFlag = !!StyleEnginePersonalizarMapper.clearMaterialsFlag;
      console.log('[ACTIVATE-LEGACY] 37 AFTER clearMaterialsFlag check', hasClearFlag);
      if (hasClearFlag) {
        console.log('[ACTIVATE-LEGACY] 38 BEFORE StyleEnginePersonalizarMapper.clearMaterialsFlag()');
        StyleEnginePersonalizarMapper.clearMaterialsFlag();
        console.log('[ACTIVATE-LEGACY] 39 AFTER StyleEnginePersonalizarMapper.clearMaterialsFlag()');
      } else {
        console.log('[ACTIVATE-LEGACY] 38 SKIP clearMaterialsFlag (missing)');
      }
    } else {
      console.log('[ACTIVATE-LEGACY] 36 SKIP PersonalizarMapper (undefined)');
    }

    console.log('[ACTIVATE-LEGACY] 40 BEFORE typeof ThemeSystem check');
    var hasThemeSystem = typeof ThemeSystem !== 'undefined';
    console.log('[ACTIVATE-LEGACY] 41 AFTER typeof ThemeSystem', hasThemeSystem);

    if (hasThemeSystem) {
      console.log('[ACTIVATE-LEGACY] 42 BEFORE typeof ThemeSystem.reapply check');
      var hasReapply = typeof ThemeSystem.reapply === 'function';
      console.log('[ACTIVATE-LEGACY] 43 AFTER typeof ThemeSystem.reapply', hasReapply);
      if (hasReapply) {
        console.log('[ACTIVATE-LEGACY] 44 BEFORE ThemeSystem.reapply()');
        ThemeSystem.reapply();
        console.log('[ACTIVATE-LEGACY] 45 AFTER ThemeSystem.reapply()');
      } else {
        console.log('[ACTIVATE-LEGACY] 44 SKIP ThemeSystem.reapply (not a function)');
      }
    } else {
      console.log('[ACTIVATE-LEGACY] 42 SKIP ThemeSystem (undefined)');
    }

    console.log('[ACTIVATE-LEGACY] 46 EXIT activateLegacy', Date.now());
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
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  try {

    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    StyleEngineStore.subscribe(function () {
      if (StyleEngineModal && StyleEngineModal.isOpen && StyleEngineModal.isOpen()) return;
      sync();
    });
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-runtime.js :: init');}catch(_bd){}
  }
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

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-runtime.js');}catch(_e){}
