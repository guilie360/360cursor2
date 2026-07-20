console.log("BOOT ENTER js/style-engine/style-engine-lifecycle.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-lifecycle.js');}catch(_e){}
/* Style Engine — Ciclo de vida: borrador, publicación, activación */
var StyleEngineLifecycle = (function () {
  var ACTIVE = { LEGACY: 'legacy', STYLE_ENGINE: 'style-engine' };
  var bootActivateLegacyDone = false;

  function formatPublishDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  }

  function publishToProject(options) {
  console.log("ENTER publishToProject");
  try {

    options = options || {};
    var rules = StyleEngineStore.getDraftRules();
    var meta = StyleEngineStore.publishDraft(rules);
    StyleEngineStore.setActiveTheme(ACTIVE.STYLE_ENGINE);
    StyleEngineStore.setEngineMode(StyleEngineStore.MODES.LIVE);

    /* Aplicar NO guarda en biblioteca salvo que se pida explícitamente */
    if (options.saveNamed) {
      var styleName = options.styleName;
      if (!styleName) {
        var current = StyleEngineStore.getActiveStyleMeta();
        styleName = current.name || ('Estilo ' + meta.versionLabel);
      }
      if (options.promptName && typeof window.prompt === 'function') {
        var asked = window.prompt('Nombre para guardar este estilo', styleName);
        if (asked && asked.trim()) styleName = asked.trim();
      }
      if (typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.saveNamedStyle) {
        var currentMeta = StyleEngineStore.getActiveStyleMeta();
        var saved = StyleEnginePresets.saveNamedStyle(styleName, rules, {
          id: options.replaceActive ? (currentMeta.id || null) : null,
          source: 'published',
          publishMeta: meta
        });
        StyleEngineStore.setActiveStyleMeta(saved.id, saved.name);
        StyleEngineRuntime.reinforcePublished();
        notifyActiveThemeChanged();
        return { meta: meta, style: saved };
      }
    }

    StyleEngineRuntime.reinforcePublished();
    notifyActiveThemeChanged();
    return { meta: meta, style: null };
  
  } finally {
    console.log("EXIT publishToProject");
  }}

  function applySavedStyle(styleId) {
    var style = StyleEnginePresets.findById(styleId);
    if (!style) return null;
    StyleEngineStore.setDraftRules(style.rules, { replace: true });
    StyleEngineStore.setActiveStyleMeta(style.id, style.name);
    return publishToProject({ saveNamed: false });
  }

  function saveDraftOnly() {
    StyleEngineStore.saveDraftToStorage();
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
    return true;
  }

  function discardSessionChanges() {
    StyleEngineStore.reloadDraftFromStorage();
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
    StyleEnginePanel.refreshPreview();
    return true;
  }

  function restoreLegacyTheme() {
    StyleEngineStore.setActiveTheme(ACTIVE.LEGACY);
    StyleEngineStore.setEngineMode(StyleEngineStore.MODES.OFF);
    StyleEngineRuntime.activateLegacy();
    notifyActiveThemeChanged();
    return true;
  }

  function notifyActiveThemeChanged() {
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
    if (typeof StyleEngineModal !== 'undefined' && StyleEngineModal.isOpen && StyleEngineModal.isOpen()) {
      StyleEngineModal.renderChrome();
    }
  }

  function getProjectStatus() {
    var active = StyleEngineStore.getActiveTheme();
    var mode = StyleEngineStore.getEngineMode();
    var pub = StyleEngineStore.getPublishMeta();
    var styleMeta = StyleEngineStore.getActiveStyleMeta();
    return {
      activeTheme: active,
      activeThemeLabel: active === ACTIVE.STYLE_ENGINE ? 'Style Engine' : 'Theme Legacy',
      engineMode: mode,
      engineModeLabel: mode === StyleEngineStore.MODES.LIVE ? 'LIVE' :
        (mode === StyleEngineStore.MODES.PREVIEW ? 'PREVIEW' : 'OFF'),
      lastPublished: pub,
      lastPublishedLabel: pub.publishedAt ? formatPublishDate(pub.publishedAt) : 'Sin publicar',
      versionLabel: pub.versionLabel || '—',
      activeStyleName: styleMeta.name || '—',
      activeStyleId: styleMeta.id || null,
      hasPendingChanges: StyleEngineStore.hasUnsavedDraftChanges() || StyleEngineStore.hasUnpublishedChanges(),
      draftSavedAt: StyleEngineStore.getDraftSavedAt()
    };
  }

  function initOnBoot() {
  console.log("ENTER initOnBoot");
  try {

    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    if (StyleEngineStore.getActiveTheme() === ACTIVE.STYLE_ENGINE &&
        StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE) {
      StyleEngineRuntime.reinforcePublished();
      return;
    }
    /* Shell legacy once at boot — DOM only. Official theme is applied later by
       project-data / ThemeSystem without re-entering activateLegacy from sync. */
    if (bootActivateLegacyDone) return;
    bootActivateLegacyDone = true;
    StyleEngineRuntime.activateLegacy({ skipThemeReapply: true });
  
  } finally {
    console.log("EXIT initOnBoot");
  }}

  return {
    ACTIVE: ACTIVE,
    publishToProject: publishToProject,
    applySavedStyle: applySavedStyle,
    saveDraftOnly: saveDraftOnly,
    discardSessionChanges: discardSessionChanges,
    restoreLegacyTheme: restoreLegacyTheme,
    getProjectStatus: getProjectStatus,
    formatPublishDate: formatPublishDate,
    initOnBoot: initOnBoot,
    notifyActiveThemeChanged: notifyActiveThemeChanged
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-lifecycle.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-lifecycle.js");
