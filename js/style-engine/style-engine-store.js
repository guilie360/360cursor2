try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-store.js');}catch(_e){}
/* Style Engine — Store v2.1: borrador vs publicado vs tema activo */
var StyleEngineStore = (function () {
  var STORAGE_KEY = 'boxies_style_engine_v21';
  var RECENT_COLORS_KEY = 'boxies_style_engine_recent_colors';
  var MODES = { OFF: 'off', PREVIEW: 'preview', LIVE: 'live' };
  var ACTIVE = { LEGACY: 'legacy', STYLE_ENGINE: 'style-engine' };

  var persisted = null;
  var boundProjectId = undefined;
  var draftRules = null;
  var draftMode = null;
  var aiPalette = null;
  var listeners = [];
  var aiModifiedSinceApply = false;

  function resolveProjectId() {
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getCurrentProyectoId === 'function') {
      var fromAuth = ProjectThemeAuthority.getCurrentProyectoId();
      if (fromAuth) return String(fromAuth);
    }
    if (window.PROJECT_DATA && window.PROJECT_DATA.id) {
      return String(window.PROJECT_DATA.id);
    }
    return null;
  }

  function storageKeyFor(projectId) {
    if (!projectId) return STORAGE_KEY + ':__none__';
    return STORAGE_KEY + ':' + projectId;
  }

  /** Bind in-memory + localStorage state to the current project. No cross-project leakage. */
  function ensureProjectScope() {
    var pid = resolveProjectId();
    if (pid === boundProjectId && persisted) return persisted;
    boundProjectId = pid;
    persisted = null;
    try {
      var raw = localStorage.getItem(storageKeyFor(pid));
      persisted = raw ? migrateParsed(JSON.parse(raw)) : defaultState();
    } catch (e) {
      persisted = defaultState();
    }
    draftRules = Object.assign({}, persisted.savedDraftRules);
    draftMode = MODES.PREVIEW;
    aiModifiedSinceApply = false;
    return persisted;
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
    return ensureProjectScope();
  }

  function syncFlagsFromActive(state) {
    var isLiveSe = state.activeTheme === ACTIVE.STYLE_ENGINE && state.engineMode === MODES.LIVE;
    state.styleEngineEnabled = isLiveSe;
    state.legacyThemeEnabled = !isLiveSe;
  }

  function savePersisted() {
    var state = loadPersisted();
    state.updatedAt = new Date().toISOString();
    syncFlagsFromActive(state);
    try {
      localStorage.setItem(storageKeyFor(boundProjectId), JSON.stringify(state));
    } catch (e) { /* quota */ }
    notify();
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
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
    notify();
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
    draftMode = mode;
    notify();
  }

  function setEngineMode(mode) {
    if (mode !== MODES.OFF && mode !== MODES.PREVIEW && mode !== MODES.LIVE) return;
    var state = loadPersisted();
    state.engineMode = mode;
    syncFlagsFromActive(state);
    savePersisted();
  }

  function setActiveTheme(theme) {
    var state = loadPersisted();
    state.activeTheme = theme === ACTIVE.STYLE_ENGINE ? ACTIVE.STYLE_ENGINE : ACTIVE.LEGACY;
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
    notify();
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
    draftRules = normalized;
    notify();
  }

  function applyRulesPatch(patch, options) {
    options = options || {};
    Object.keys(patch || {}).forEach(function (key) {
      setDraftRule(key, patch[key], { history: true, source: options.source });
    });
    if (options.source === 'ai') aiModifiedSinceApply = false;
    notify();
  }

  function saveDraftToStorage() {
    var state = loadPersisted();
    state.savedDraftRules = StyleEngineTokens.normalizeRules(draftRules || state.savedDraftRules);
    state.draftSavedAt = new Date().toISOString();
    savePersisted();
    draftRules = Object.assign({}, state.savedDraftRules);
    notify();
  }

  function publishDraft(rules) {
    var state = loadPersisted();
    var normalized = StyleEngineTokens.normalizeRules(rules || draftRules || state.savedDraftRules);
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
    /* Always persist — callers may re-apply the same preset after LIVE edits. */
    state.personalizarDraft = next;
    savePersisted();
  }

  function setActiveStyleMeta(id, name) {
    var state = loadPersisted();
    var nextId = id || null;
    var nextName = name || null;
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
    notify();
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

  function setAiPalette(palette) { aiPalette = palette || null; notify(); }
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
    markAiPresetOffered: markAiPresetOffered,
    ensureProjectScope: ensureProjectScope,
    resolveProjectId: resolveProjectId
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-store.js');}catch(_e){}
