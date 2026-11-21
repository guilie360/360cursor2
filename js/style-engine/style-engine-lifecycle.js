try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-lifecycle.js');}catch(_e){}
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

  function publishToProject(options) {
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
  }

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
    console.log('[LIFECYCLE-BOOT] 1 ENTER initOnBoot', Date.now());

    console.log('[LIFECYCLE-BOOT] 2 BEFORE __CASCADE_N++');
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[LIFECYCLE-BOOT] 3 AFTER __CASCADE_N++', window.__CASCADE_N);

    console.log('[LIFECYCLE-BOOT] 4 BEFORE CASCADE log');
    console.log('[CASCADE]', 'StyleEngineLifecycle.initOnBoot', Date.now(), window.__CASCADE_N);
    console.log('[LIFECYCLE-BOOT] 5 AFTER CASCADE log');

    console.log('[LIFECYCLE-BOOT] 6 BEFORE typeof StyleEngineCompatibility check');
    if (typeof StyleEngineCompatibility !== 'undefined') {
      console.log('[LIFECYCLE-BOOT] 7 StyleEngineCompatibility DEFINED');
      console.log('[LIFECYCLE-BOOT] 8 BEFORE StyleEngineCompatibility.installThemeGuard()');
      StyleEngineCompatibility.installThemeGuard();
      console.log('[LIFECYCLE-BOOT] 9 AFTER StyleEngineCompatibility.installThemeGuard()');
    } else {
      console.log('[LIFECYCLE-BOOT] 7 StyleEngineCompatibility UNDEFINED — skip installThemeGuard');
    }

    console.log('[LIFECYCLE-BOOT] 10 BEFORE StyleEngineStore.getActiveTheme()');
    var _bootActiveTheme = StyleEngineStore.getActiveTheme();
    console.log('[LIFECYCLE-BOOT] 11 AFTER StyleEngineStore.getActiveTheme()', _bootActiveTheme);

    console.log('[LIFECYCLE-BOOT] 12 BEFORE theme === STYLE_ENGINE check', ACTIVE.STYLE_ENGINE);
    if (_bootActiveTheme === ACTIVE.STYLE_ENGINE) {
      console.log('[LIFECYCLE-BOOT] 13 theme IS STYLE_ENGINE — will check engineMode (short-circuit preserved)');
      console.log('[LIFECYCLE-BOOT] 14 BEFORE StyleEngineStore.getEngineMode()');
      var _bootEngineMode = StyleEngineStore.getEngineMode();
      console.log('[LIFECYCLE-BOOT] 15 AFTER StyleEngineStore.getEngineMode()', _bootEngineMode);
      console.log('[LIFECYCLE-BOOT] 16 BEFORE mode === LIVE check', StyleEngineStore.MODES.LIVE);
      if (_bootEngineMode === StyleEngineStore.MODES.LIVE) {
        console.log('[LIFECYCLE-BOOT] 17 BRANCH reinforcePublished (LIVE)');
        console.log('[LIFECYCLE-BOOT] 18 BEFORE StyleEngineRuntime.reinforcePublished()');
        StyleEngineRuntime.reinforcePublished();
        console.log('[LIFECYCLE-BOOT] 19 AFTER StyleEngineRuntime.reinforcePublished()');
      } else {
        console.log('[LIFECYCLE-BOOT] 17 BRANCH activateLegacy (theme SE but mode not LIVE)', _bootEngineMode);
        console.log('[LIFECYCLE-BOOT] 18 BEFORE StyleEngineRuntime.activateLegacy()');
        StyleEngineRuntime.activateLegacy();
        console.log('[LIFECYCLE-BOOT] 19 AFTER StyleEngineRuntime.activateLegacy()');
      }
    } else {
      console.log('[LIFECYCLE-BOOT] 13 theme NOT STYLE_ENGINE — skip getEngineMode (short-circuit)');
      console.log('[LIFECYCLE-BOOT] 17 BRANCH activateLegacy (not STYLE_ENGINE)', _bootActiveTheme);
      console.log('[LIFECYCLE-BOOT] 18 BEFORE StyleEngineRuntime.activateLegacy()');
      StyleEngineRuntime.activateLegacy();
      console.log('[LIFECYCLE-BOOT] 19 AFTER StyleEngineRuntime.activateLegacy()');
    }

    console.log('[LIFECYCLE-BOOT] 20 EXIT initOnBoot', Date.now());
  }

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
