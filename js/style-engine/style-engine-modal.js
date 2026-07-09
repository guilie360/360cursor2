/* Style Engine — Modal v2.1: publicación y activación */
var StyleEngineModal = (function () {
  var MODAL_ID = 'styleEngineModal';
  var openState = false;

  function getModal() { return document.getElementById(MODAL_ID); }
  function isOpen() { return openState; }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function stateBadgeHtml() {
    var label = 'PREVIEW';
    if (StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.LEGACY) {
      label = 'OFF';
    } else if (StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE) {
      label = 'LIVE';
    }
    var modClass = 'se-state-badge--' + label.toLowerCase();
    return (
      '<div class="se-state-hero">' +
        '<div class="se-state-hero-kicker">Estado actual</div>' +
        '<div class="se-state-badge ' + modClass + '"><span class="se-state-dot">●</span> ' + label + '</div>' +
      '</div>'
    );
  }

  function infoPanelHtml() {
    var status = StyleEngineLifecycle.getProjectStatus();
    return (
      '<div class="se-info-panel">' +
        '<div class="se-info-title">Estado del proyecto</div>' +
        '<div class="se-info-grid">' +
          '<div class="se-info-item"><span>Motor activo</span><strong>' + escapeHtml(status.activeThemeLabel) + '</strong></div>' +
          '<div class="se-info-item"><span>Modo</span><strong>' + escapeHtml(status.engineModeLabel) + '</strong></div>' +
          '<div class="se-info-item"><span>Última publicación</span><strong>' + escapeHtml(status.lastPublishedLabel) + '</strong></div>' +
          '<div class="se-info-item"><span>Versión</span><strong>' + escapeHtml(status.versionLabel) + '</strong></div>' +
          '<div class="se-info-item"><span>Cambios pendientes</span><strong>' + (status.hasPendingChanges ? 'Sí' : 'No') + '</strong></div>' +
          '<div class="se-info-item"><span>Borrador</span><strong>' + (status.draftSavedAt ? 'Guardado' : 'Sin guardar') + '</strong></div>' +
        '</div>' +
        (status.lastPublished.publishedAt ?
          '<div class="se-publish-history">' +
            '<div class="se-publish-history-title">Publicado</div>' +
            '<div class="se-publish-history-line">' + escapeHtml(StyleEngineLifecycle.formatPublishDate(status.lastPublished.publishedAt)) + '</div>' +
            '<div class="se-publish-history-version">Versión ' + escapeHtml(status.versionLabel) + '</div>' +
          '</div>' : '') +
      '</div>'
    );
  }

  function modeControlHtml() {
    var mode = StyleEngineStore.getDraftMode();
    var modes = [
      { id: StyleEngineStore.MODES.OFF, label: 'Off', hint: 'Preview sin simulación activa' },
      { id: StyleEngineStore.MODES.PREVIEW, label: 'Preview', hint: 'Los cambios solo afectan el panel Preview' },
      { id: StyleEngineStore.MODES.LIVE, label: 'Live (sim)', hint: 'Simula el aspecto publicado en Preview — no afecta el proyecto' }
    ];
    return modes.map(function (item) {
      return (
        '<label class="se-mode-option" title="' + escapeHtml(item.hint) + '">' +
          '<input type="radio" name="styleEngineMode" value="' + escapeHtml(item.id) + '"' +
            (mode === item.id ? ' checked' : '') + '>' +
          '<span>' + escapeHtml(item.label) + '</span>' +
        '</label>'
      );
    }).join('');
  }

  function changesIndicatorHtml() {
    if (StyleEngineStore.hasUnsavedDraftChanges()) {
      return '<div class="se-changes-indicator se-changes-indicator--dirty"><span class="se-changes-dot">●</span> Cambios sin guardar</div>';
    }
    if (StyleEngineStore.hasUnpublishedChanges() && StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE) {
      return '<div class="se-changes-indicator se-changes-indicator--dirty"><span class="se-changes-dot">●</span> Borrador distinto al publicado</div>';
    }
    return '<div class="se-changes-indicator se-changes-indicator--saved">Borrador sincronizado ✓</div>';
  }

  function toolbarHtml() {
    return (
      '<div class="style-engine-toolbar">' +
        '<div id="styleEngineChangesHost">' + changesIndicatorHtml() + '</div>' +
        '<div class="style-engine-toolbar-actions">' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineExportBtn">Export Theme</button>' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineImportBtn">Import Theme</button>' +
          '<input type="file" id="styleEngineImportFile" accept="application/json,.json" hidden>' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineResetBtn">Restaurar tokens</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderChrome() {
    var stateHost = document.getElementById('styleEngineStateHost');
    if (stateHost) stateHost.innerHTML = stateBadgeHtml();
    var infoHost = document.getElementById('styleEngineInfoHost');
    if (infoHost) infoHost.innerHTML = infoPanelHtml();
    var changesHost = document.getElementById('styleEngineChangesHost');
    if (changesHost) changesHost.innerHTML = changesIndicatorHtml();
    var modeHost = document.getElementById('styleEngineModeHost');
    if (modeHost) modeHost.innerHTML = modeControlHtml();
  }

  function bindModalEvents() {
    var modal = getModal();
    if (!modal || modal.dataset.boundV21) return;
    modal.dataset.boundV21 = '1';

    modal.addEventListener('click', function (e) {
      if (e.target === modal) requestClose();
    });

    document.getElementById('styleEngineCloseBtn').addEventListener('click', requestClose);
    document.getElementById('styleEngineDiscardBtn').addEventListener('click', discardChanges);
    document.getElementById('styleEngineSaveDraftBtn').addEventListener('click', saveDraft);
    document.getElementById('styleEnginePublishBtn').addEventListener('click', publishProject);
    document.getElementById('styleEngineLegacyBtn').addEventListener('click', useLegacy);

    modal.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'styleEngineMode') {
        StyleEngineStore.setDraftMode(e.target.value);
        if (e.target.value === StyleEngineStore.MODES.OFF) {
          /* solo modo de edición; legacy real se activa con botón dedicado */
        }
        StyleEnginePanel.refreshPreview();
        renderChrome();
      }
    });

    StyleEngineStore.subscribe(function () {
      if (!openState) return;
      renderChrome();
    });

    if (typeof StyleEngineHistory !== 'undefined') {
      StyleEngineHistory.subscribe(function () {
        if (!openState) return;
        renderChrome();
      });
    }
  }

  function bindToolbarEvents() {
    var exportBtn = document.getElementById('styleEngineExportBtn');
    if (!exportBtn || exportBtn.dataset.bound) return;
    exportBtn.dataset.bound = '1';
    document.getElementById('styleEngineImportBtn').dataset.bound = '1';
    document.getElementById('styleEngineResetBtn').dataset.bound = '1';

    exportBtn.addEventListener('click', function () {
      var name = window.prompt('Nombre del tema', 'BOXIES Theme');
      StyleEngineExport.exportJson(name || 'BOXIES Theme');
    });
    document.getElementById('styleEngineImportBtn').addEventListener('click', function () {
      document.getElementById('styleEngineImportFile').click();
    });
    document.getElementById('styleEngineImportFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      StyleEngineExport.importFromFile(file).then(function (pkg) {
        StyleEngineStore.setDraftRules(pkg.rules);
        StyleEnginePanel.render();
        renderChrome();
      }).catch(function (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Importación fallida');
      });
      e.target.value = '';
    });
    document.getElementById('styleEngineResetBtn').addEventListener('click', function () {
      if (!window.confirm('¿Restaurar todos los tokens del borrador a valores por defecto?')) return;
      StyleEngineStore.restoreDefaults();
      StyleEnginePanel.render();
      renderChrome();
    });
  }

  function ensureToolbar() {
    var bar = document.getElementById('styleEngineToolbarHost');
    if (bar && !bar.innerHTML) bar.innerHTML = toolbarHtml();
  }

  function open() {
    if (!StyleEngineCompatibility.isAdminViewer()) return;
    var modal = getModal();
    if (!modal) return;

    StyleEngineStore.reloadDraftFromStorage();
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
    ensureToolbar();
    bindToolbarEvents();
    bindModalEvents();

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    openState = true;

    renderChrome();
    StyleEnginePanel.render();

    if (typeof playSound === 'function') playSound('popupOpen');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
  }

  function requestClose() {
    if (StyleEngineStore.hasUnsavedDraftChanges()) {
      if (window.confirm('¿Deseas guardar este borrador antes de cerrar?')) {
        StyleEngineLifecycle.saveDraftOnly();
        close({ keepSession: true });
        return;
      }
      if (!window.confirm('¿Descartar los cambios temporales y cerrar?')) {
        return;
      }
      StyleEngineLifecycle.discardSessionChanges();
    }
    close({ keepSession: true });
  }

  function close(options) {
    options = options || {};
    var modal = getModal();
    if (!modal) return;

    if (StyleEngineColorPicker.isOpen()) StyleEngineColorPicker.close(false);

    if (!options.keepSession) StyleEngineStore.reloadDraftFromStorage();

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    openState = false;

    if (StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
        StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE) {
      StyleEngineRuntime.reinforcePublished();
    } else {
      StyleEngineRuntime.sync();
    }
    if (typeof playSound === 'function') playSound('popupClose');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
    if (typeof unlockBodyScroll === 'function' &&
        typeof navStack !== 'undefined' && !navStack.length &&
        typeof isMainMenuOpen === 'function' && !isMainMenuOpen()) {
      unlockBodyScroll();
    }
  }

  function discardChanges() {
    if (!StyleEngineStore.hasUnsavedDraftChanges()) {
      if (typeof showToast === 'function') showToast('No hay cambios temporales que descartar');
      return;
    }
    if (!window.confirm('¿Descartar los cambios temporales y restaurar el último borrador guardado?')) return;
    StyleEngineLifecycle.discardSessionChanges();
    StyleEnginePanel.render();
    renderChrome();
    if (typeof showToast === 'function') showToast('Cambios descartados');
  }

  function saveDraft() {
    if (StyleEngineStore.shouldOfferAiPresetSave()) {
      StyleEngineAI.maybeOfferSavePreset();
      StyleEngineStore.markAiPresetOffered();
    }
    StyleEngineLifecycle.saveDraftOnly();
    renderChrome();
    if (typeof showToast === 'function') showToast('Borrador guardado. El proyecto no ha cambiado.');
  }

  function publishProject() {
    var audit = typeof StyleEngineAudit !== 'undefined' ? StyleEngineAudit.run() : null;
    if (audit && audit.legacyComponents.length) {
      var proceed = window.confirm(
        'Auditoría VisualSystem\n\n' +
        'Cobertura: ' + audit.coverage.percent + '%\n' +
        audit.legacyComponents.length + ' componente(s) LEGACY aún no migrados.\n\n' +
        audit.legacyComponents.slice(0, 8).map(function (c) { return '• ' + c.name; }).join('\n') +
        (audit.legacyComponents.length > 8 ? '\n… y más' : '') +
        '\n\n¿Publicar de todas formas? El VisualSystem alimentará todas las variables globales en tiempo real.'
      );
      if (!proceed) return;
    } else if (!window.confirm(
      '¿Aplicar Style Engine al proyecto?\n\n' +
      'Esto publicará el borrador y activará el VisualSystem en toda la aplicación showroom.'
    )) return;

    if (StyleEngineStore.shouldOfferAiPresetSave()) {
      StyleEngineAI.maybeOfferSavePreset();
      StyleEngineStore.markAiPresetOffered();
    }

    var meta = StyleEngineLifecycle.publishToProject();
    StyleEnginePanel.render();
    renderChrome();

    if (typeof showToast === 'function') {
      showToast('✓ Style Engine publicado correctamente (' + meta.versionLabel + '). Este proyecto utiliza el nuevo sistema visual.');
    }
  }

  function useLegacy() {
    if (!window.confirm('¿Usar Theme Legacy? El Style Engine se desactivará pero el borrador se conservará.')) return;
    StyleEngineLifecycle.restoreLegacyTheme();
    renderChrome();
    if (typeof showToast === 'function') showToast('Theme Legacy activo. Puedes volver a publicar Style Engine cuando quieras.');
  }

  function init() {
    bindModalEvents();
  }

  return {
    init: init,
    open: open,
    close: close,
    requestClose: requestClose,
    renderChrome: renderChrome,
    isOpen: isOpen
  };
})();

var StyleEngine = (function () {
  function init() {
    StyleEngineStore.init();
    StyleEngineRuntime.init();
    if (typeof StyleEngineLifecycle !== 'undefined') StyleEngineLifecycle.initOnBoot();
    StyleEngineModal.init();
  }

  function getActiveThemeLabel() {
    return StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE
      ? 'Style Engine' : 'Theme Legacy';
  }

  return {
    init: init,
    open: function () { StyleEngineModal.open(); },
    close: function (opts) { StyleEngineModal.close(opts); },
    requestClose: function () { StyleEngineModal.requestClose(); },
    isOpen: function () { StyleEngineModal.isOpen(); },
    getActiveThemeLabel: getActiveThemeLabel
  };
})();
