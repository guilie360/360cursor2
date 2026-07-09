/* Style Engine — Ciclo de vida: borrador, publicación, activación */
var StyleEngineLifecycle = (function () {
  var ACTIVE = { LEGACY: 'legacy', STYLE_ENGINE: 'style-engine' };

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

  function publishToProject() {
    var rules = StyleEngineStore.getDraftRules();
    var meta = StyleEngineStore.publishDraft(rules);
    StyleEngineStore.setActiveTheme(ACTIVE.STYLE_ENGINE);
    StyleEngineStore.setEngineMode(StyleEngineStore.MODES.LIVE);
    StyleEngineRuntime.reinforcePublished();
    notifyActiveThemeChanged();
    return meta;
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
    return {
      activeTheme: active,
      activeThemeLabel: active === ACTIVE.STYLE_ENGINE ? 'Style Engine' : 'Theme Legacy',
      engineMode: mode,
      engineModeLabel: mode === StyleEngineStore.MODES.LIVE ? 'LIVE' :
        (mode === StyleEngineStore.MODES.PREVIEW ? 'PREVIEW' : 'OFF'),
      lastPublished: pub,
      lastPublishedLabel: pub.publishedAt ? formatPublishDate(pub.publishedAt) : 'Sin publicar',
      versionLabel: pub.versionLabel || '—',
      hasPendingChanges: StyleEngineStore.hasUnsavedDraftChanges() || StyleEngineStore.hasUnpublishedChanges(),
      draftSavedAt: StyleEngineStore.getDraftSavedAt()
    };
  }

  function initOnBoot() {
    if (typeof StyleEngineCompatibility !== 'undefined') {
      StyleEngineCompatibility.installThemeGuard();
    }
    if (StyleEngineStore.getActiveTheme() === ACTIVE.STYLE_ENGINE &&
        StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE) {
      StyleEngineRuntime.reinforcePublished();
    } else {
      StyleEngineRuntime.activateLegacy();
    }
  }

  return {
    ACTIVE: ACTIVE,
    publishToProject: publishToProject,
    saveDraftOnly: saveDraftOnly,
    discardSessionChanges: discardSessionChanges,
    restoreLegacyTheme: restoreLegacyTheme,
    getProjectStatus: getProjectStatus,
    formatPublishDate: formatPublishDate,
    initOnBoot: initOnBoot,
    notifyActiveThemeChanged: notifyActiveThemeChanged
  };
})();
