console.log("BOOT ENTER js/style-engine/style-engine-modal.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-modal.js');}catch(_e){}
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
          '<div class="se-info-item"><span>Estilo</span><strong>' + escapeHtml(status.activeStyleName || '—') + '</strong></div>' +
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
    var auditBtn = StyleEngineCompatibility.isAdminViewer()
      ? '<button type="button" class="se-toolbar-btn se-toolbar-btn--audit" id="styleEngineVisualAuditBtn">Capturar pantallas</button>'
      : '';
    return (
      '<div class="style-engine-toolbar">' +
        '<div id="styleEngineChangesHost">' + changesIndicatorHtml() + '</div>' +
        '<div class="style-engine-toolbar-actions">' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineExportBtn">Export Theme</button>' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineImportBtn">Import Theme</button>' +
          '<input type="file" id="styleEngineImportFile" accept="application/json,.json" hidden>' +
          '<button type="button" class="se-toolbar-btn" id="styleEngineResetBtn">Restaurar tokens</button>' +
          auditBtn +
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
    syncPowerSwitch();
  }

  function syncPowerSwitch() {
    var power = document.getElementById('styleEnginePowerSwitch');
    var label = document.getElementById('styleEnginePowerLabel');
    var isOn = StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
      StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE;
    if (power) power.checked = isOn;
    if (label) label.textContent = isOn ? 'ON' : 'OFF';
  }

  function renderSavedStylesPanel() {
    var host = document.getElementById('styleEngineSavedStylesHost');
    if (!host) return;
    var saved = StyleEnginePresets.getSavedStyles ? StyleEnginePresets.getSavedStyles() : StyleEnginePresets.getPersonal();
    var activeMeta = StyleEngineStore.getActiveStyleMeta ? StyleEngineStore.getActiveStyleMeta() : { id: null };

    var rows = saved.length
      ? saved.map(function (s) {
          var isActive = activeMeta.id && activeMeta.id === s.id;
          return (
            '<div class="se-saved-style-card' + (isActive ? ' is-active' : '') + '" data-style-id="' + escapeHtml(s.id) + '">' +
              '<div class="se-saved-style-info">' +
                '<div class="se-saved-style-name">' + escapeHtml(s.name) + '</div>' +
                '<div class="se-saved-style-meta">' + escapeHtml(isActive ? 'Activo' : 'Guardado') + '</div>' +
              '</div>' +
              '<div class="se-saved-style-actions">' +
                '<button type="button" class="se-saved-style-btn" data-se-style-apply="' + escapeHtml(s.id) + '">Aplicar</button>' +
                '<button type="button" class="se-saved-style-btn" data-se-style-edit="' + escapeHtml(s.id) + '">Editar</button>' +
                '<button type="button" class="se-saved-style-btn se-saved-style-btn--danger" data-se-style-delete="' + escapeHtml(s.id) + '">Borrar</button>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '<p class="se-saved-styles-empty">Aún no hay estilos guardados. Usa «Guardar estilo» para crear el primero.</p>';

    host.innerHTML =
      '<section class="se-saved-styles">' +
        '<div class="se-saved-styles-head">' +
          '<h3 class="se-saved-styles-title">Estilos guardados</h3>' +
          '<span class="se-saved-styles-count">' + saved.length + '</span>' +
        '</div>' +
        '<div class="se-saved-styles-list">' + rows + '</div>' +
      '</section>';

    host.querySelectorAll('[data-se-style-apply]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-se-style-apply');
        var result = StyleEngineLifecycle.applySavedStyle(id);
        if (!result) return;
        StyleEnginePanel.render();
        renderChrome();
        renderSavedStylesPanel();
        if (typeof showToast === 'function') {
          var style = StyleEnginePresets.findById(id);
          showToast('Estilo aplicado: ' + (style ? style.name : ''));
        }
      };
    });

    host.querySelectorAll('[data-se-style-edit]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-se-style-edit');
        var style = StyleEnginePresets.findById(id);
        if (!style) return;
        StyleEngineStore.setDraftRules(style.rules, { replace: true });
        StyleEngineStore.setActiveStyleMeta(style.id, style.name);
        StyleEnginePanel.render();
        renderChrome();
        renderSavedStylesPanel();
        if (typeof showToast === 'function') showToast('Editando: ' + style.name);
      };
    });

    host.querySelectorAll('[data-se-style-delete]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-se-style-delete');
        var style = StyleEnginePresets.findById(id);
        if (!window.confirm('¿Borrar el estilo «' + (style ? style.name : '') + '»?')) return;
        StyleEnginePresets.deletePersonal(id);
        var active = StyleEngineStore.getActiveStyleMeta();
        if (active.id === id) StyleEngineStore.setActiveStyleMeta(null, null);
        renderSavedStylesPanel();
        StyleEnginePanel.render();
        renderChrome();
      };
    });
  }

  function bindModalEvents() {
    var modal = getModal();
    if (!modal || modal.dataset.boundV21) return;
    modal.dataset.boundV21 = '1';

    modal.addEventListener('click', function (e) {
      if (e.target === modal) requestClose();
    });

    document.getElementById('styleEngineCloseBtn').addEventListener('click', requestClose);
    document.getElementById('styleEngineResetDefaultsBtn').addEventListener('click', resetToDefaults);
    document.getElementById('styleEngineSaveStyleBtn').addEventListener('click', saveNamedStyle);
    document.getElementById('styleEnginePublishBtn').addEventListener('click', publishProject);

    var power = document.getElementById('styleEnginePowerSwitch');
    if (power) {
      power.addEventListener('change', function () {
        toggleStyleEnginePower(power.checked);
      });
    }

    modal.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'styleEngineMode') {
        StyleEngineStore.setDraftMode(e.target.value);
        StyleEnginePanel.refreshPreview();
        renderChrome();
      }
    });

    StyleEngineStore.subscribe(function () {
      if (!openState) return;
      renderChrome();
      renderSavedStylesPanel();
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

    bindVisualAuditButton();
  }

  function bindVisualAuditButton() {
    var auditBtn = document.getElementById('styleEngineVisualAuditBtn');
    if (!auditBtn || auditBtn.dataset.bound) return;
    auditBtn.dataset.bound = '1';
    auditBtn.addEventListener('click', function () {
      if (!StyleEngineCompatibility.isAdminViewer()) {
        if (typeof showToast === 'function') showToast('Solo administradores');
        return;
      }
      if (typeof VisualAudit !== 'undefined') VisualAudit.open();
    });
  }

  function ensureToolbar() {
    var bar = document.getElementById('styleEngineToolbarHost');
    if (!bar) return;
    if (!bar.innerHTML) {
      bar.innerHTML = toolbarHtml();
      return;
    }
    if (StyleEngineCompatibility.isAdminViewer() && !document.getElementById('styleEngineVisualAuditBtn')) {
      var actions = bar.querySelector('.style-engine-toolbar-actions');
      if (actions) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'se-toolbar-btn se-toolbar-btn--audit';
        btn.id = 'styleEngineVisualAuditBtn';
        btn.textContent = 'Capturar pantallas';
        actions.appendChild(btn);
      }
    }
  }

  function open() {
    if (!StyleEngineCompatibility.isAdminViewer()) return;
    var modal = getModal();
    if (!modal) return;

    StyleEngineStore.reloadDraftFromStorage();
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
    ensureToolbar();
    bindToolbarEvents();
    bindVisualAuditButton();
    bindModalEvents();

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    openState = true;

    renderChrome();
    renderSavedStylesPanel();
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

  function resetToDefaults() {
    if (!window.confirm('¿Reiniciar al estilo predeterminado? Se perderán los cambios actuales del editor.')) return;
    StyleEngineStore.restoreDefaults();
    StyleEngineStore.setActiveStyleMeta(null, null);
    if (typeof StyleEngineHistory !== 'undefined') StyleEngineHistory.clear();
    StyleEnginePanel.render();
    renderChrome();
    renderSavedStylesPanel();
    if (typeof showToast === 'function') showToast('Estilo reiniciado a valores predeterminados');
  }

  function saveNamedStyle() {
    var current = StyleEngineStore.getActiveStyleMeta();
    var name = window.prompt('Nombre del estilo', current.name || 'Mi estilo');
    if (!name || !name.trim()) return;
    if (!window.confirm('¿Guardar el estilo «' + name.trim() + '»?')) return;

    StyleEngineLifecycle.saveDraftOnly();
    var saved = StyleEnginePresets.saveNamedStyle(name.trim(), StyleEngineStore.getDraftRules(), {
      id: null,
      source: 'manual'
    });
    StyleEngineStore.setActiveStyleMeta(saved.id, saved.name);
    StyleEnginePanel.render();
    renderChrome();
    renderSavedStylesPanel();
    if (typeof showToast === 'function') showToast('Estilo guardado: ' + saved.name);
  }

  function publishProject() {
    /* Solo aplica — no pregunta nombre ni guarda en biblioteca */
    var result = StyleEngineLifecycle.publishToProject({ saveNamed: false });
    var meta = result && result.meta ? result.meta : result;
    StyleEnginePanel.render();
    renderChrome();
    renderSavedStylesPanel();
    if (typeof showToast === 'function') {
      showToast('✓ Estilo aplicado al proyecto' + (meta && meta.versionLabel ? ' (' + meta.versionLabel + ')' : ''));
    }
  }

  function toggleStyleEnginePower(on) {
    if (on) {
      StyleEngineLifecycle.publishToProject({ saveNamed: false });
      if (typeof showToast === 'function') showToast('Style Engine ON');
    } else {
      StyleEngineLifecycle.restoreLegacyTheme();
      if (typeof showToast === 'function') showToast('Theme Legacy V1 activo');
    }
    renderChrome();
    renderSavedStylesPanel();
  }

  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-modal.js :: init');}catch(_bd){}
  try {

    console.log("SE51 before StyleEngineModal.bindModalEvents");
    bindModalEvents();
    console.log("SE52 after StyleEngineModal.bindModalEvents");
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-modal.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  return {
    init: init,
    open: open,
    close: close,
    requestClose: requestClose,
    renderChrome: renderChrome,
    renderSavedStylesPanel: renderSavedStylesPanel,
    isOpen: isOpen
  };
})();

var StyleEngine = (function () {
  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/style-engine/style-engine-modal.js :: init');}catch(_bd){}
  try {

    console.log("SE1");
    console.log("SE2 before StyleEngineStore.init");
    StyleEngineStore.init();
    console.log("SE3 after StyleEngineStore.init");
    console.log("SE4 before StyleEngineRuntime.init");
    StyleEngineRuntime.init();
    console.log("SE5 after StyleEngineRuntime.init");
    console.log("SE6 before initOnBoot");
    if (typeof StyleEngineLifecycle !== 'undefined') StyleEngineLifecycle.initOnBoot();
    console.log("SE7 after initOnBoot");
    console.log("SE8 before StyleEngineModal.init");
    StyleEngineModal.init();
    console.log("SE9 after StyleEngineModal.init");
    console.log("SE10");
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/style-engine/style-engine-modal.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  function getActiveThemeLabel() {
    if (StyleEngineStore.getActiveTheme() !== StyleEngineStore.ACTIVE.STYLE_ENGINE) {
      if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.getThemeDisplayName === 'function') {
        return ThemeSystem.getThemeDisplayName(ThemeSystem.getCurrentKey());
      }
      return 'Theme Legacy';
    }
    var meta = StyleEngineStore.getActiveStyleMeta ? StyleEngineStore.getActiveStyleMeta() : null;
    if (meta && meta.name && String(meta.name).trim()) {
      return String(meta.name).trim();
    }
    if (meta && meta.id && typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.findById) {
      var style = StyleEnginePresets.findById(meta.id);
      if (style && style.name) return style.name;
    }
    return 'Sin nombre';
  }

  return {
    init: init,
    open: function () { StyleEngineModal.open(); },
    close: function (opts) { StyleEngineModal.close(opts); },
    requestClose: function () { StyleEngineModal.requestClose(); },
    isOpen: function () { return StyleEngineModal.isOpen(); },
    getActiveThemeLabel: getActiveThemeLabel
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-modal.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-modal.js");
