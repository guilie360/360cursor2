try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-store.js');}catch(_e){}
/* Style Engine — Store v2.1: borrador vs publicado vs tema activo */
var StyleEngineStore = (function () {
  var STORAGE_KEY = 'boxies_style_engine_v21';
  var RECENT_COLORS_KEY = 'boxies_style_engine_recent_colors';
  var MODES = { OFF: 'off', PREVIEW: 'preview', LIVE: 'live' };
  var ACTIVE = { LEGACY: 'legacy', STYLE_ENGINE: 'style-engine' };

  var persisted = null;
  var draftRules = null;
  var draftMode = null;
  var aiPalette = null;
  var listeners = [];
  var aiModifiedSinceApply = false;
  var lastSyncFingerprint = null;
  var lastNotifiedSyncFingerprint = null;

  function stableStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  /** Fingerprint of state that StyleEngineRuntime.sync cares about. */
  function computeSyncFingerprint(state) {
    state = state || loadPersisted();
    return stableStringify({
      activeTheme: state.activeTheme,
      engineMode: state.engineMode,
      publishedRules: state.publishedRules,
      personalizarDraft: state.personalizarDraft,
      activeStyleId: state.activeStyleId,
      activeStyleName: state.activeStyleName
    });
  }

  function getSyncFingerprint() {
    return computeSyncFingerprint(loadPersisted());
  }

  function rulesEqual(a, b) {
    a = a || {};
    b = b || {};
    var keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every(function (key) {
      return String(a[key]) === String(b[key]);
    });
  }

  function defaultState() {
    return {
      schemaVersion: 2.1,
      activeTheme: ACTIVE.LEGACY,
      engineMode: MODES.PREVIEW,
      savedDraftRules: StyleEngineTokens.getDefaultRules(),
      draftSavedAt: null,
      publishedRules: StyleEngineTokens.getDefaultRules(),
      publishMeta: {
        version: 0,
        versionLabel: '—',
        publishedAt: null
      },
      activeStyleId: null,
      activeStyleName: null,
      personalizarDraft: null,
      legacyThemeEnabled: true,
      styleEngineEnabled: false,
      updatedAt: null
    };
  }

  function migrateParsed(parsed) {
    var state = defaultState();
    if (!parsed || typeof parsed !== 'object') return state;

    state.activeTheme = parsed.activeTheme === ACTIVE.STYLE_ENGINE ? ACTIVE.STYLE_ENGINE : ACTIVE.LEGACY;
    state.engineMode = parsed.engineMode || parsed.mode || MODES.PREVIEW;
    state.savedDraftRules = StyleEngineTokens.normalizeRules(parsed.savedDraftRules || parsed.savedRules || state.savedDraftRules);
    state.draftSavedAt = parsed.draftSavedAt || null;
    state.publishedRules = StyleEngineTokens.normalizeRules(parsed.publishedRules || parsed.savedDraftRules || parsed.savedRules || state.publishedRules);
    state.publishMeta = parsed.publishMeta || state.publishMeta;
    if (!state.publishMeta.versionLabel && state.publishMeta.version) {
      state.publishMeta.versionLabel = 'v' + state.publishMeta.version;
    }
    state.activeStyleId = parsed.activeStyleId || null;
    state.activeStyleName = parsed.activeStyleName || null;
    state.personalizarDraft = parsed.personalizarDraft || null;
    state.updatedAt = parsed.updatedAt || null;
    syncFlagsFromActive(state);
    return state;
  }

  function loadPersisted() {
    if (persisted) return persisted;
    try {
      var raw = localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('boxies_style_engine_v2') ||
        localStorage.getItem('boxies_style_engine_v1');
      persisted = raw ? migrateParsed(JSON.parse(raw)) : defaultState();
      return persisted;
    } catch (e) {
      persisted = defaultState();
      return persisted;
    }
  }

  function syncFlagsFromActive(state) {
    var isLiveSe = state.activeTheme === ACTIVE.STYLE_ENGINE && state.engineMode === MODES.LIVE;
    state.styleEngineEnabled = isLiveSe;
    state.legacyThemeEnabled = !isLiveSe;
  }

  /**
   * Persist + notify.
   * options.silent — write storage, no listeners.
   * options.forceNotify — notify even if sync fingerprint unchanged.
   * Notify only when sync-relevant published/active state actually changed
   * since the last notify (draft-only callers use notifyDraftChanged).
   */
  function savePersisted(options) {
    options = options || {};
    var state = loadPersisted();
    state.updatedAt = new Date().toISOString();
    syncFlagsFromActive(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota */ }
    var afterFp = computeSyncFingerprint(state);
    lastSyncFingerprint = afterFp;
    if (options.silent) return;
    if (!options.forceNotify && afterFp === lastNotifiedSyncFingerprint) return;
    lastNotifiedSyncFingerprint = afterFp;
    notify();
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  /** Draft / UI changes that must not drive Runtime.sync via false “published” deltas. */
  function notifyDraftChanged() {
    listeners.forEach(function (fn) { try { fn({ draftOnly: true }); } catch (e) {} });
  }

  function init() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-store.js :: init');}catch(_bd){}
  try {

    loadPersisted();
    reloadDraftFromStorage();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-store.js :: init');}catch(_bd){}
  }
}

  function reloadDraftFromStorage() {
    var state = loadPersisted();
    draftRules = Object.assign({}, state.savedDraftRules);
    draftMode = MODES.PREVIEW;
    aiModifiedSinceApply = false;
    notifyDraftChanged();
  }

  function resetDraft() {
    reloadDraftFromStorage();
  }

  function getSavedDraftRules() {
    return Object.assign({}, loadPersisted().savedDraftRules);
  }

  function getPublishedRules() {
    return Object.assign({}, loadPersisted().publishedRules);
  }

  function getDraftRules() {
    if (!draftRules) reloadDraftFromStorage();
    return Object.assign({}, draftRules);
  }

  function getActiveTheme() { return loadPersisted().activeTheme; }
  function getEngineMode() { return loadPersisted().engineMode; }

  function getDraftMode() {
    if (draftMode == null) draftMode = MODES.PREVIEW;
    return draftMode;
  }

  function setDraftMode(mode) {
    if (mode !== MODES.OFF && mode !== MODES.PREVIEW && mode !== MODES.LIVE) return;
    if (draftMode === mode) return;
    draftMode = mode;
    notifyDraftChanged();
  }

  function setEngineMode(mode) {
    if (mode !== MODES.OFF && mode !== MODES.PREVIEW && mode !== MODES.LIVE) return;
    var state = loadPersisted();
    if (state.engineMode === mode) return;
    state.engineMode = mode;
    syncFlagsFromActive(state);
    savePersisted();
  }

  function setActiveTheme(theme) {
    var state = loadPersisted();
    var next = theme === ACTIVE.STYLE_ENGINE ? ACTIVE.STYLE_ENGINE : ACTIVE.LEGACY;
    if (state.activeTheme === next) return;
    state.activeTheme = next;
    syncFlagsFromActive(state);
    savePersisted();
  }

  function setDraftRule(key, value, options) {
    options = options || {};
    if (!draftRules) reloadDraftFromStorage();
    if (!StyleEngineTokens.getTokenMeta(key)) return;
    var prev = draftRules[key];
    if (String(prev) === String(value)) return;
    draftRules[key] = value;
    if (options.history !== false && typeof StyleEngineHistory !== 'undefined') {
      StyleEngineHistory.wrapSetDraftRule(key, prev, value);
    }
    if (options.source === 'ai') aiModifiedSinceApply = false;
    else if (aiPalette) aiModifiedSinceApply = true;
    notifyDraftChanged();
  }

  function setDraftRules(rules, options) {
    options = options || {};
    var normalized = StyleEngineTokens.normalizeRules(rules);
    if (!options.replace) {
      Object.keys(normalized).forEach(function (key) {
        setDraftRule(key, normalized[key], { history: options.history !== false });
      });
      return;
    }
    if (draftRules && rulesEqual(draftRules, normalized)) return;
    draftRules = normalized;
    notifyDraftChanged();
  }

  function applyRulesPatch(patch, options) {
    options = options || {};
    Object.keys(patch || {}).forEach(function (key) {
      setDraftRule(key, patch[key], { history: true, source: options.source });
    });
    if (options.source === 'ai') aiModifiedSinceApply = false;
  }

  function saveDraftToStorage() {
    var state = loadPersisted();
    state.savedDraftRules = StyleEngineTokens.normalizeRules(draftRules || state.savedDraftRules);
    state.draftSavedAt = new Date().toISOString();
    savePersisted({ silent: true });
    draftRules = Object.assign({}, state.savedDraftRules);
    notifyDraftChanged();
  }

  function publishDraft(rules) {
    var state = loadPersisted();
    var normalized = StyleEngineTokens.normalizeRules(rules || draftRules || state.savedDraftRules);
    if (rulesEqual(state.publishedRules, normalized) &&
        state.activeTheme === ACTIVE.STYLE_ENGINE &&
        state.engineMode === MODES.LIVE) {
      draftRules = Object.assign({}, normalized);
      return state.publishMeta;
    }
    var nextVersion = (state.publishMeta.version || 0) + 1;
    state.publishedRules = normalized;
    state.savedDraftRules = Object.assign({}, normalized);
    state.draftSavedAt = new Date().toISOString();
    state.publishMeta = {
      version: nextVersion,
      versionLabel: 'v' + nextVersion,
      publishedAt: new Date().toISOString()
    };
    draftRules = Object.assign({}, normalized);
    savePersisted();
    return state.publishMeta;
  }

  function getPublishMeta() {
    return Object.assign({}, loadPersisted().publishMeta);
  }

  function getDraftSavedAt() {
    return loadPersisted().draftSavedAt;
  }

  function setPersonalizarDraft(draft) {
    var state = loadPersisted();
    var next = draft && typeof draft === 'object' ? Object.assign({}, draft) : null;
    try {
      if (JSON.stringify(state.personalizarDraft) === JSON.stringify(next)) return;
    } catch (e) {}
    state.personalizarDraft = next;
    savePersisted();
  }

  function setActiveStyleMeta(id, name) {
    var state = loadPersisted();
    var nextId = id || null;
    var nextName = name || null;
    if (state.activeStyleId === nextId && state.activeStyleName === nextName) return;
    state.activeStyleId = nextId;
    state.activeStyleName = nextName;
    savePersisted();
  }

  function getActiveStyleMeta() {
    var state = loadPersisted();
    return {
      id: state.activeStyleId || null,
      name: state.activeStyleName || null
    };
  }

  function getPersonalizarDraft() {
    var state = loadPersisted();
    return state.personalizarDraft ? Object.assign({}, state.personalizarDraft) : null;
  }

  function restoreDefaults() {
    draftRules = StyleEngineTokens.getDefaultRules();
    notifyDraftChanged();
  }

  function isLegacyThemeEnabled() { return loadPersisted().legacyThemeEnabled; }
  function isStyleEngineEnabled() { return loadPersisted().styleEngineEnabled; }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) { return item !== fn; });
    };
  }

  function hasUnsavedDraftChanges() {
    var saved = getSavedDraftRules();
    var draft = getDraftRules();
    return Object.keys(saved).some(function (key) {
      return String(saved[key]) !== String(draft[key]);
    });
  }

  function hasUnpublishedChanges() {
    var published = getPublishedRules();
    var draft = getDraftRules();
    return Object.keys(published).some(function (key) {
      return String(published[key]) !== String(draft[key]);
    });
  }

  function hasDraftChanges() {
    return hasUnsavedDraftChanges();
  }

  function getRecentColors() {
    try {
      var raw = localStorage.getItem(RECENT_COLORS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.slice(0, 20) : [];
    } catch (e) {
      return [];
    }
  }

  function pushRecentColor(color) {
    if (!color) return;
    var list = getRecentColors().filter(function (c) { return c !== color; });
    list.unshift(color);
    if (list.length > 20) list.length = 20;
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(list));
    } catch (e) { /* quota */ }
  }

  function getProjectPalette() {
    var rules = getDraftRules();
    var legacy = typeof StyleEngineBridge !== 'undefined' ? StyleEngineBridge.legacyColorsToHints() : {};
    return {
      primary: rules['text-primary'] || legacy.primary,
      secondary: rules['color-secondary'] || legacy.secondary,
      accent: rules['color-accent'] || legacy.accent,
      surface: rules['surface-elevated'] || legacy.surface,
      background: rules.surface || legacy.background
    };
  }

  function setAiPalette(palette) { aiPalette = palette || null; notifyDraftChanged(); }
  function getAiPalette() { return aiPalette; }
  function shouldOfferAiPresetSave() { return !!aiPalette && aiModifiedSinceApply; }
  function markAiPresetOffered() { aiModifiedSinceApply = false; }

  function getSavedRules() { return getSavedDraftRules(); }
  function getMode() { return getEngineMode(); }
  function commitDraft() { saveDraftToStorage(); }
  function discardDraft() {
    reloadDraftFromStorage();
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
  }

  return {
    MODES: MODES,
    ACTIVE: ACTIVE,
    init: init,
    getSavedDraftRules: getSavedDraftRules,
    getPublishedRules: getPublishedRules,
    getSavedRules: getSavedRules,
    getDraftRules: getDraftRules,
    getActiveTheme: getActiveTheme,
    getEngineMode: getEngineMode,
    getMode: getMode,
    getDraftMode: getDraftMode,
    setDraftMode: setDraftMode,
    setEngineMode: setEngineMode,
    setActiveTheme: setActiveTheme,
    setDraftRule: setDraftRule,
    setDraftRules: setDraftRules,
    applyRulesPatch: applyRulesPatch,
    saveDraftToStorage: saveDraftToStorage,
    publishDraft: publishDraft,
    getPublishMeta: getPublishMeta,
    getDraftSavedAt: getDraftSavedAt,
    setActiveStyleMeta: setActiveStyleMeta,
    getActiveStyleMeta: getActiveStyleMeta,
    setPersonalizarDraft: setPersonalizarDraft,
    getPersonalizarDraft: getPersonalizarDraft,
    commitDraft: commitDraft,
    discardDraft: discardDraft,
    restoreDefaults: restoreDefaults,
    isLegacyThemeEnabled: isLegacyThemeEnabled,
    isStyleEngineEnabled: isStyleEngineEnabled,
    subscribe: subscribe,
    getSyncFingerprint: getSyncFingerprint,
    hasUnsavedDraftChanges: hasUnsavedDraftChanges,
    hasUnpublishedChanges: hasUnpublishedChanges,
    hasDraftChanges: hasDraftChanges,
    resetDraft: resetDraft,
    reloadDraftFromStorage: reloadDraftFromStorage,
    getRecentColors: getRecentColors,
    pushRecentColor: pushRecentColor,
    getProjectPalette: getProjectPalette,
    setAiPalette: setAiPalette,
    getAiPalette: getAiPalette,
    shouldOfferAiPresetSave: shouldOfferAiPresetSave,
    markAiPresetOffered: markAiPresetOffered
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-store.js');}catch(_e){}
