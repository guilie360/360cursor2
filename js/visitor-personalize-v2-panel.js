try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/visitor-personalize-v2-panel.js');}catch(_e){}
/* Style V.3 — herencia global vía Style Engine */
var VisitorPersonalizeV2Panel = (function () {
  var STYLE_V3_LABEL = 'Style V.3';
  var STORAGE_DRAFT_KEY = 'boxies_personalizar_v2_draft';
  var PROJECT_DEFAULT_STYLE_KEY = 'boxies_project_default_style_id';
  var PREVIEW_COLORS_KEY = 'boxies_style_preview_colors_v1';
  var BASE_STYLE_NAME = typeof PROJECT_DEFAULT_STYLE_NAME !== 'undefined'
    ? PROJECT_DEFAULT_STYLE_NAME
    : 'HALL';
  var PROJECT_HALL_STYLE_ID = typeof PROJECT_DEFAULT_STYLE_ID !== 'undefined'
    ? PROJECT_DEFAULT_STYLE_ID
    : 'project-default-hall';
  var PREVIEW_COLOR_FALLBACK = '#161616';
  var MAX_SAVED_STYLES = 5;
  var draft = null;
  var editingStyleId = null;
  var editorOpen = false;
  var boundPanelProjectId = null;
  var pendingProjectStyle = null;
  var pendingProjectThemeDraft = null;

  var COLOR_FIELD_BY_ACTION = {
    'pick-mask': 'maskColor',
    'pick-bg': 'bg',
    'pick-menu': 'menuColor',
    'pick-accent': 'accent',
    'pick-surface': 'surface',
    'pick-hover': 'hoverColor',
    'pick-btn-border': 'buttonBorderColor',
    'pick-btn-hover-border': 'buttonHoverBorderColor',
    'pick-btn-hover-text': 'buttonHoverTextColor'
  };

  var ICON_APPLY =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>' +
    '</svg>';
  var ICON_EDIT =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>' +
    '</svg>';
  var ICON_DELETE =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' +
    '</svg>';
  var ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/>' +
    '</svg>';
  var ICON_RESET =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>' +
    '</svg>';
  var ICON_SAVE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>' +
    '</svg>';
  var ICON_APPLY_WEB =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>' +
    '</svg>';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeStyleNameKey(name) {
    return String(name || '').replace(/\s+/g, '').toUpperCase();
  }

  function isProjectSeedStyleId(id) {
    return !!id && id === PROJECT_HALL_STYLE_ID;
  }

  function isProjectSeedStyle(style) {
    if (!style) return false;
    return !!(style.isProjectLocked || isProjectSeedStyleId(style.id));
  }

  function isOfficialStyleMeta(meta) {
    if (!meta) return false;
    if (isProjectSeedStyleId(meta.id)) return true;
    var defaultId = getProjectDefaultStyleId();
    return !!(defaultId && meta.id && meta.id === defaultId);
  }

  function getHallFactoryDraft() {
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getHallFactoryDraft === 'function') {
      var factory = ProjectThemeAuthority.getHallFactoryDraft();
      if (factory) return normalize(factory);
    }
    if (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined') {
      return normalize(PROJECT_DEFAULT_THEME_FALLBACK);
    }
    return normalize(defaultDraft());
  }

  function getProjectBaseDraft() {
    /* Legacy helper: project official theme (may differ from HALL factory). */
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getOfficialDraft === 'function') {
      var official = ProjectThemeAuthority.getOfficialDraft();
      if (official) return normalize(official);
    }
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getProjectDefaultTheme === 'function') {
      var theme = ProjectThemeAuthority.getProjectDefaultTheme();
      if (theme) return normalize(theme);
    }
    return getHallFactoryDraft();
  }

  function buildProjectHallStyle() {
    /* HALL card always exposes immutable factory preset — never LIVE / official mutations. */
    return {
      id: PROJECT_HALL_STYLE_ID,
      name: BASE_STYLE_NAME,
      personalizarDraft: getHallFactoryDraft(),
      isProjectLocked: true,
      source: 'hall-factory'
    };
  }

  function findBaseStyle() {
    return buildProjectHallStyle();
  }

  function getBaseDraft() {
    return getHallFactoryDraft();
  }

  function resetToBaseStyle() {
    var base = findBaseStyle();
    var factoryDraft = getHallFactoryDraft();
    draft = factoryDraft;
    editingStyleId = null;
    var displayName = (base && base.name) ? base.name : BASE_STYLE_NAME;
    setStyleNameInput(displayName);
    persistDraftLocal(draft);
    onDraftChange();
    syncUiFromDraft();

    var proyectoId = typeof ProjectThemeAuthority !== 'undefined'
      ? ProjectThemeAuthority.getCurrentProyectoId()
      : null;
    if (proyectoId) setProjectDefaultStyleId(proyectoId, PROJECT_HALL_STYLE_ID);

    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.forceApplyHallFactoryPreset === 'function' &&
        ProjectThemeAuthority.forceApplyHallFactoryPreset()) {
      renderMisEstilosList();
      setMessage('Estilo «' + displayName + '» restaurado y aplicado a toda la web.', false);
      if (typeof window.refreshVisitorMenuProfile === 'function') {
        window.refreshVisitorMenuProfile();
      }
      if (typeof playSound === 'function') playSound('buttonTap');
      return;
    }

    if (publishDraftLive({ id: PROJECT_HALL_STYLE_ID, name: displayName })) {
      if (typeof ThemeSystem !== 'undefined' && ThemeSystem.setProjectDefaultApplied) {
        ThemeSystem.setProjectDefaultApplied(proyectoId);
      }
      renderMisEstilosList();
      setMessage('Estilo «' + displayName + '» restaurado y aplicado a toda la web.', false);
      return;
    }

    setMessage('Estilo base «' + displayName + '» restaurado (aún no aplicado).', false);
  }

  function getPersonalizarStyles() {
    var hall = buildProjectHallStyle();
    var personal = [];
    if (typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.getPersonalizarStyles) {
      personal = StyleEnginePresets.getPersonalizarStyles().filter(function (style) {
        if (!style) return false;
        if (isProjectSeedStyleId(style.id)) return false;
        return true;
      });
    }
    return [hall].concat(personal);
  }

  function countPersonalizarStyles() {
    return getPersonalizarStyles().length;
  }

  function suggestNewStylePlaceholder() {
    return 'Mi estilo ' + Math.max(1, countPersonalizarStyles());
  }

  function clearPanelSession() {
    editingStyleId = null;
    editorOpen = false;
    draft = null;
    var host = document.getElementById('mainMenuListPersonalizarV2');
    if (host) {
      host.dataset.p2Rendered = '0';
      host.dataset.p2Bound = '0';
    }
  }

  function getCurrentPanelProjectId() {
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getCurrentProyectoId === 'function') {
      return ProjectThemeAuthority.getCurrentProyectoId();
    }
    return window.PROJECT_DATA && window.PROJECT_DATA.id ? window.PROJECT_DATA.id : null;
  }

  function draftStorageKey() {
    var pid = getCurrentPanelProjectId();
    return pid ? STORAGE_DRAFT_KEY + ':' + pid : STORAGE_DRAFT_KEY + ':__none__';
  }

  function ensurePanelProjectScope() {
    if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.ensureProjectScope) {
      StyleEngineStore.ensureProjectScope();
    }
    var pid = getCurrentPanelProjectId();
    if (pid !== boundPanelProjectId) {
      boundPanelProjectId = pid;
      editingStyleId = null;
      editorOpen = false;
      draft = null;
      var host = document.getElementById('mainMenuListPersonalizarV2');
      if (host) {
        host.dataset.p2Rendered = '0';
        host.dataset.p2Bound = '0';
      }
    }
  }

  function setEditorOpen(open, options) {
    editorOpen = !!open;
    options = options || {};
    var section = document.getElementById('personalizarV2EditorSection');
    if (section) section.hidden = !editorOpen;
    var createBtn = document.getElementById('personalizarV2CreateStyleBtn');
    if (createBtn) createBtn.hidden = !!editorOpen;
    if (editorOpen) {
      syncToolbar();
    } else {
      hideToolbar();
      editingStyleId = null;
    }
    if (options.scroll && editorOpen) {
      var editor = document.getElementById('personalizarV2Editor');
      if (editor && editor.scrollIntoView) {
        editor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function getEditorScrollEl() {
    return document.querySelector('#mainMenuListPersonalizarV2 .personalize-v2-scroll') ||
      document.querySelector('.personalize-v2-scroll');
  }

  /** Close editor after save without scroll jump; clear create/edit temp state. */
  function closeEditorAfterSave() {
    var scrollEl = getEditorScrollEl();
    var top = scrollEl ? scrollEl.scrollTop : null;
    editingStyleId = null;
    setStyleNameInput('');
    refreshStyleNameField();
    setEditorOpen(false);
    if (scrollEl && top != null) scrollEl.scrollTop = top;
  }

  function readPreviewColorMap() {
    try {
      return JSON.parse(localStorage.getItem(PREVIEW_COLORS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writePreviewColor(styleId, color) {
    var pid = getCurrentPanelProjectId();
    if (!pid || !styleId || !color) return;
    try {
      var map = readPreviewColorMap();
      if (!map[pid] || typeof map[pid] !== 'object') map[pid] = {};
      map[pid][styleId] = String(color);
      localStorage.setItem(PREVIEW_COLORS_KEY, JSON.stringify(map));
    } catch (e) {}
    if (!isProjectSeedStyleId(styleId) &&
        typeof StyleEnginePresets !== 'undefined' &&
        StyleEnginePresets.setStylePreviewColor) {
      StyleEnginePresets.setStylePreviewColor(styleId, color, pid);
    }
  }

  function derivePreviewColorFallback(style) {
    if (!style) return PREVIEW_COLOR_FALLBACK;
    if (style.previewColor) return String(style.previewColor);
    var cfg = style.personalizarDraft || style.configuracion || {};
    return cfg.bg || cfg.menuColor || cfg.accent || PREVIEW_COLOR_FALLBACK;
  }

  function resolvePreviewColor(style) {
    if (!style || !style.id) return PREVIEW_COLOR_FALLBACK;
    var pid = getCurrentPanelProjectId();
    if (pid) {
      var map = readPreviewColorMap();
      if (map[pid] && map[pid][style.id]) return String(map[pid][style.id]);
    }
    return derivePreviewColorFallback(style);
  }

  function openPreviewColorPicker(style) {
    if (!style || !style.id) return;
    var styleId = style.id;
    var current = resolvePreviewColor(style);

    function paintThumb(value) {
      var btn = document.querySelector(
        '#misEstilosV2List [data-saved-style-id="' + styleId + '"] .mis-tema-thumb'
      );
      if (btn) btn.style.setProperty('--thumb-bg', value);
    }

    if (typeof StyleEngineColorPicker !== 'undefined' && StyleEngineColorPicker.open) {
      StyleEngineColorPicker.open('previewColor', current, {
        onPreview: function (_key, value) {
          paintThumb(value);
        },
        onApply: function (_key, value) {
          writePreviewColor(styleId, value);
          renderMisEstilosList();
          if (typeof playSound === 'function') playSound('buttonTap');
        },
        onCancel: function () {
          paintThumb(current);
        }
      });
      return;
    }

    var next = window.prompt('Color identificador (hex)', current);
    if (!next) return;
    writePreviewColor(styleId, String(next).trim());
    renderMisEstilosList();
  }

  function editorPhaseHtml(label, bodyHtml, hint) {
    return (
      '<div class="personalize-block glass-surface">' +
        '<div class="personalize-block-label">' + escapeHtml(label) + '</div>' +
        (hint
          ? '<p class="personalize-hint personalize-theme-block-hint">' + escapeHtml(hint) + '</p>'
          : '') +
        '<div class="personalize-block-body theme-visual-panel">' +
          bodyHtml +
        '</div>' +
      '</div>'
    );
  }

  function startCreateNewStyle() {
    editingStyleId = null;
    draft = normalize(getProjectBaseDraft() || defaultDraft());
    persistDraftLocal(draft);
    setStyleNameInput('');
    refreshStyleNameField();
    syncUiFromDraft();
    setEditorOpen(true, { scroll: true });
    renderMisEstilosList();
    setMisEstilosMessage('Creando un estilo nuevo. Guárdalo para añadirlo a Mis estilos.', false);
    setMessage('', false);
    if (typeof playSound === 'function') playSound('buttonTap');
  }

  function refreshStyleNameField() {
    var input = document.getElementById('personalizarV2StyleName');
    if (!input) return;
    if (editingStyleId) {
      var editing = findStyleById(editingStyleId);
      if (editing && editing.name) {
        input.placeholder = 'Actualizar estilo';
        setStyleNameInput(editing.name);
        return;
      }
      editingStyleId = null;
    }
    input.placeholder = suggestNewStylePlaceholder();
  }

  function readProjectDefaultStyleMap() {
    try {
      return JSON.parse(localStorage.getItem(PROJECT_DEFAULT_STYLE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function setProjectDefaultStyleId(proyectoId, styleId) {
    if (!proyectoId || !styleId) return;
    try {
      var map = readProjectDefaultStyleMap();
      map[proyectoId] = styleId;
      localStorage.setItem(PROJECT_DEFAULT_STYLE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function getProjectDefaultStyleId() {
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.getProjectDefaultStyleId === 'function') {
      return ProjectThemeAuthority.getProjectDefaultStyleId();
    }
    var proyectoId = getCurrentPanelProjectId();
    if (proyectoId) {
      var map = readProjectDefaultStyleMap();
      if (map[proyectoId]) return map[proyectoId];
    }
    return PROJECT_HALL_STYLE_ID;
  }

  function inferProjectDefaultStyleId() {
    return getProjectDefaultStyleId();
  }

  function defaultDraft() {
    if (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined') {
      return normalize(PROJECT_DEFAULT_THEME_FALLBACK);
    }
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.getDefaultCustomTheme) {
      return ThemeSystem.getDefaultCustomTheme();
    }
    return {
      bg: '#000000',
      menuColor: '#000000',
      surface: '#000000',
      accent: '#000000',
      hoverColor: '#2a2a2a',
      maskColor: '#000000',
      maskGlass: 'glass',
      maskBlur: 'medium',
      textMode: 'light',
      bgTextMode: 'light',
      visualDepth: 'medium',
      bgGlass: 'glass',
      panelGlass: 'glass',
      buttonGlass: 'solid',
      borderGlass: 'solid',
      buttonBorderColor: '#2a2a2a',
      buttonBorderWidth: 'medium',
      buttonHoverBorderColor: '#000000',
      buttonHoverBorderWidth: 'low',
      buttonHoverTextColor: '#ffffff',
      buttonHoverGlass: 'glass',
      shadowGlass: 'solid',
      heroSurface: '#000000',
      heroHoverColor: '#2a2a2a',
      heroButtonGlass: 'solid',
      heroBorderGlass: 'solid',
      heroLayout: 'centered'
    };
  }

  function normalize(raw) {
    if (typeof StyleEnginePersonalizarMapper !== 'undefined') {
      return StyleEnginePersonalizarMapper.normalizeDraft(raw);
    }
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
      return ThemeSystem.normalizeCustomConfig(raw);
    }
    return Object.assign({}, defaultDraft(), raw || {});
  }

  function loadStoredDraft() {
    /* Editor seed = live/official colors for this project. Never force HALL factory here. */
    try {
      if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.ensureProjectScope) {
        StyleEngineStore.ensureProjectScope();
      }
      if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getPersonalizarDraft) {
        var fromStore = StyleEngineStore.getPersonalizarDraft();
        if (fromStore) return normalize(fromStore);
      }
      var raw = localStorage.getItem(draftStorageKey());
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    var projectDraft = getProjectBaseDraft();
    if (projectDraft) return projectDraft;
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.exportCustomConfigFromKey) {
      return normalize(ThemeSystem.exportCustomConfigFromKey(ThemeSystem.getCurrentKey()));
    }
    return normalize(defaultDraft());
  }

  function persistDraftLocal(next) {
    draft = normalize(next);
    try {
      localStorage.setItem(draftStorageKey(), JSON.stringify(draft));
    } catch (e) {}
  }

  function canApplyAsProjectDefault() {
    return typeof ProjectThemeAuthority !== 'undefined' &&
      typeof VisitorSession !== 'undefined' &&
      ProjectThemeAuthority.canSetOfficialTheme(VisitorSession.getProfile());
  }

  function glassButtons() {
    return (
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="solid" data-p2-action="glass-solid">Sólido</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="soft" data-p2-action="glass-soft">Suave</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="glass" data-p2-action="glass-crystal">Cristal</button>'
    );
  }

  function shadowButtons() {
    return (
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="glass" data-p2-action="glass-crystal">Baja</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="soft" data-p2-action="glass-soft">Media</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="solid" data-p2-action="glass-solid">Alta</button>'
    );
  }

  function maskBlurButtons() {
    return (
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="low" data-p2-action="mask-blur-low">Baja</button>' +
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="medium" data-p2-action="mask-blur-medium">Media</button>' +
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="high" data-p2-action="mask-blur-high">Alta</button>'
    );
  }

  function surfaceBlock(title, colorField, colorAction, effectField, hint, options) {
    options = options || {};
    var swatch = draft[colorField] || '#000000';
    return (
      '<div class="custom-theme-block">' +
        '<div class="custom-theme-block-label">' + escapeHtml(title) + '</div>' +
        (hint ? '<p class="personalize-hint personalize-theme-block-hint">' + escapeHtml(hint) + '</p>' : '') +
        '<div class="custom-theme-block-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Efecto</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="' + effectField + '">' +
              glassButtons() +
            '</div>' +
          '</div>' +
          (options.maskBlur
            ? '<div class="custom-theme-row custom-theme-row--tight">' +
                '<span class="custom-theme-row-label">Blur</span>' +
                '<div class="custom-theme-text-toggle custom-theme-mask-blur-toggle">' +
                  maskBlurButtons() +
                '</div>' +
              '</div>'
            : '') +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Color</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="' + colorAction + '" data-theme-color-field="' + colorField + '" style="--pick-swatch:' + escapeHtml(swatch) + '">Elegir color</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (options.noDivider
        ? ''
        : '<div class="custom-theme-divider" role="separator" aria-hidden="true"></div>')
    );
  }

  function borderWidthButtons(fieldKey, actionPrefix) {
    fieldKey = fieldKey || 'buttonBorderWidth';
    actionPrefix = actionPrefix || 'border-width';
    return (
      '<button type="button" class="custom-theme-border-width-btn" data-border-width-field="' + fieldKey + '" data-border-width-mode="low" data-p2-action="' + actionPrefix + '-low">Bajo</button>' +
      '<button type="button" class="custom-theme-border-width-btn" data-border-width-field="' + fieldKey + '" data-border-width-mode="medium" data-p2-action="' + actionPrefix + '-medium">Medio</button>' +
      '<button type="button" class="custom-theme-border-width-btn" data-border-width-field="' + fieldKey + '" data-border-width-mode="high" data-p2-action="' + actionPrefix + '-high">Alto</button>'
    );
  }

  function buttonsBlock() {
    var swatch = draft.surface || '#2a2a2a';
    return (
      '<div class="custom-theme-section">' +
        '<div class="custom-theme-section-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Color</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-surface" data-theme-color-field="surface" style="--pick-swatch:' + escapeHtml(swatch) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Efecto</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="button">' +
              glassButtons() +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bordersBlock() {
    var borderSwatch = draft.buttonBorderColor || draft.surface || '#ffffff';
    return (
      '<div class="custom-theme-section">' +
        '<div class="custom-theme-section-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Color</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-btn-border" data-theme-color-field="buttonBorderColor" style="--pick-swatch:' + escapeHtml(borderSwatch) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Espesor</span>' +
            '<div class="custom-theme-text-toggle custom-theme-border-width-toggle" data-border-width-field="buttonBorderWidth">' +
              borderWidthButtons('buttonBorderWidth', 'border-width') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function hoverBlock() {
    var hoverSwatch = draft.hoverColor || draft.surface || '#3a3a3a';
    var hoverBorderSwatch = draft.buttonHoverBorderColor || draft.buttonBorderColor || draft.hoverColor || draft.surface || '#ffffff';
    var hoverTextSwatch = draft.buttonHoverTextColor || '#ffffff';
    return (
      '<div class="custom-theme-section">' +
        '<div class="custom-theme-section-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Fondo</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-hover" data-theme-color-field="hoverColor" style="--pick-swatch:' + escapeHtml(hoverSwatch) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Efecto</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="button-hover">' +
              glassButtons() +
            '</div>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Texto</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-btn-hover-text" data-theme-color-field="buttonHoverTextColor" style="--pick-swatch:' + escapeHtml(hoverTextSwatch) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Borde</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-btn-hover-border" data-theme-color-field="buttonHoverBorderColor" style="--pick-swatch:' + escapeHtml(hoverBorderSwatch) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Espesor</span>' +
            '<div class="custom-theme-text-toggle custom-theme-border-width-toggle" data-border-width-field="buttonHoverBorderWidth">' +
              borderWidthButtons('buttonHoverBorderWidth', 'hover-border-width') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function heroLayoutBlock() {
    var layout = draft.heroLayout === 'bottom-bar' ? 'bottom-bar' : 'centered';
    return (
      '<div class="custom-theme-section">' +
        '<div class="custom-theme-section-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Disposición</span>' +
            '<div class="custom-theme-text-toggle custom-theme-hero-layout-toggle">' +
              '<button type="button" class="custom-theme-text-btn' + (layout === 'centered' ? ' selected' : '') + '" data-hero-layout-mode="centered" data-p2-action="hero-layout-centered">Posición 1</button>' +
              '<button type="button" class="custom-theme-text-btn' + (layout === 'bottom-bar' ? ' selected' : '') + '" data-hero-layout-mode="bottom-bar" data-p2-action="hero-layout-bottom-bar">Posición 2</button>' +
            '</div>' +
          '</div>' +
          '<p class="personalize-hint personalize-theme-block-hint">Posición 2 ubica Explorar y Iniciar a los lados del título en la portada.</p>' +
        '</div>' +
      '</div>'
    );
  }

  function glassFieldToDraftKey(field) {
    if (field === 'hero-button') return 'heroButtonGlass';
    if (field === 'hero-border') return 'heroBorderGlass';
    if (field === 'mask') return 'maskGlass';
    if (field === 'button') return 'buttonGlass';
    if (field === 'button-hover') return 'buttonHoverGlass';
    if (field === 'border') return 'borderGlass';
    if (field === 'panel') return 'panelGlass';
    if (field === 'bg') return 'bgGlass';
    if (field === 'shadow') return 'shadowGlass';
    return null;
  }

  function syncUiFromDraft() {
    if (!draft) return;
    var root = document.getElementById('mainMenuListPersonalizarV2');
    if (!root) return;

    root.querySelectorAll('[data-glass-field]').forEach(function (group) {
      var field = group.getAttribute('data-glass-field');
      var key = glassFieldToDraftKey(field);
      var value = key ? draft[key] : null;
      if (!value) return;
      group.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-glass-mode') === value);
      });
    });

    root.querySelectorAll('.custom-theme-mask-blur-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-mask-blur-mode') === draft.maskBlur);
    });
    root.querySelectorAll('.custom-theme-border-width-btn').forEach(function (btn) {
      var field = btn.getAttribute('data-border-width-field') || 'buttonBorderWidth';
      var current = draft[field] || 'medium';
      btn.classList.toggle('selected', btn.getAttribute('data-border-width-mode') === current);
    });
    root.querySelectorAll('.custom-theme-depth-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-depth-mode') === draft.visualDepth);
    });
    root.querySelectorAll('[data-text-mode]').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-text-mode') === draft.textMode);
    });
    root.querySelectorAll('[data-hero-layout-mode]').forEach(function (btn) {
      var mode = draft.heroLayout === 'bottom-bar' ? 'bottom-bar' : 'centered';
      btn.classList.toggle('selected', btn.getAttribute('data-hero-layout-mode') === mode);
    });
    root.querySelectorAll('.custom-theme-pick-btn[data-theme-color-field]').forEach(function (btn) {
      var field = btn.getAttribute('data-theme-color-field');
      if (draft[field]) btn.style.setProperty('--pick-swatch', draft[field]);
    });
  }

  function setMessage(text, isError) {
    var el = document.getElementById('personalizarV2Message');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'personalize-hint' + (text ? (isError ? ' is-error' : ' is-success') : '');
  }

  function setMisEstilosMessage(text, isError) {
    var el = document.getElementById('misEstilosV2Message');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'personalize-hint' + (text ? (isError ? ' is-error' : ' is-success') : '');
  }

  function getStyleNameInput() {
    var input = document.getElementById('personalizarV2StyleName');
    return input ? String(input.value || '').trim() : '';
  }

  function getActiveStyleMeta() {
    if (typeof StyleEngineStore === 'undefined' || !StyleEngineStore.getActiveStyleMeta) return null;
    return StyleEngineStore.getActiveStyleMeta();
  }

  function isStyleEngineActive() {
    return typeof StyleEngineStore !== 'undefined' &&
      StyleEngineStore.getActiveTheme &&
      StyleEngineStore.ACTIVE &&
      StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE;
  }

  function hydrateStyleNameFromActive() {
    if (editingStyleId) {
      var editing = findStyleById(editingStyleId);
      if (editing && editing.name) {
        setStyleNameInput(editing.name);
        return;
      }
      editingStyleId = null;
    }
    setStyleNameInput('');
    refreshStyleNameField();
  }

  function syncActiveThemeNameFromInput() {
    /* Name edits in the editor must not mutate Tema activo / live meta. */
  }

  function bindStyleNameInput() {
    var input = document.getElementById('personalizarV2StyleName');
    if (!input) return;
    input.addEventListener('input', function () {
      syncActiveThemeNameFromInput();
    });
    input.addEventListener('change', function () {
      syncActiveThemeNameFromInput();
    });
  }

  function setStyleNameInput(name) {
    var input = document.getElementById('personalizarV2StyleName');
    if (input) input.value = name || '';
  }

  function previewLive() {
    if (!draft) return;
    if (typeof StyleEnginePersonalizarMapper !== 'undefined') {
      StyleEnginePersonalizarMapper.applyMaterials(draft);
      return;
    }
    if (typeof ThemeSystem !== 'undefined') ThemeSystem.previewCustomTheme(draft);
  }

  function onDraftChange() {
    persistDraftLocal(draft);
    /* Preview only while the editor is open — never on mere navigation into Style V.3. */
    if (editorOpen) previewLive();
  }

  function resolvePublishStyleMeta(styleMeta) {
    if (styleMeta && styleMeta.name) {
      return { id: styleMeta.id || null, name: String(styleMeta.name).trim() };
    }
    if (editingStyleId) {
      var editing = findStyleById(editingStyleId);
      if (editing && editing.name) {
        return { id: editing.id, name: editing.name };
      }
    }
    var inputName = getStyleNameInput();
    if (inputName) return { id: null, name: inputName };
    if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getActiveStyleMeta) {
      var current = StyleEngineStore.getActiveStyleMeta();
      if (current && current.name) return { id: current.id || null, name: current.name };
    }
    return null;
  }

  function publishDraftLive(styleMeta) {
    if (typeof StyleEngineStore === 'undefined' ||
        typeof StyleEnginePersonalizarMapper === 'undefined' ||
        typeof StyleEngineLifecycle === 'undefined') {
      return false;
    }
    var rules = StyleEnginePersonalizarMapper.draftToRules(draft, null);
    StyleEngineStore.setDraftRules(rules, { replace: true });
    StyleEngineStore.setPersonalizarDraft(draft);
    var meta = resolvePublishStyleMeta(styleMeta);
    if (meta && meta.name) {
      StyleEngineStore.setActiveStyleMeta(meta.id || null, meta.name);
      setStyleNameInput(meta.name);
    }
    StyleEngineLifecycle.publishToProject({ saveNamed: false });
    StyleEnginePersonalizarMapper.applyMaterials(draft);

    var isOfficial = isOfficialStyleMeta(meta);
    if (typeof ThemeSystem !== 'undefined') {
      if (isOfficial && ThemeSystem.setProjectDefaultApplied) {
        ThemeSystem.setProjectDefaultApplied(
          typeof ProjectThemeAuthority !== 'undefined'
            ? ProjectThemeAuthority.getCurrentProyectoId()
            : null
        );
      } else if (ThemeSystem.markUserChosen) {
        ThemeSystem.markUserChosen();
      }
    }

    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
    return true;
  }

  function applyToProject() {
    if (!draft) return;
    if (!publishDraftLive()) {
      setMessage('El editor de estilo no está disponible.', true);
      return;
    }
    setMessage('Tema aplicado a toda la web.', false);
    if (typeof playSound === 'function') playSound('buttonTap');
  }

  function uniqueStyleName(base) {
    var trimmed = String(base || '').trim() || 'Mi estilo';
    var styles = typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.getPersonalizarStyles
      ? getPersonalizarStyles()
      : [];
    var taken = {};
    styles.forEach(function (s) {
      if (editingStyleId && s.id === editingStyleId) return;
      taken[String(s.name || '').toLowerCase()] = true;
    });
    if (!taken[trimmed.toLowerCase()]) return trimmed;
    var i = 2;
    while (taken[(trimmed + ' ' + i).toLowerCase()]) i += 1;
    return trimmed + ' ' + i;
  }

  function saveCurrentStyle() {
    if (!draft) return;
    if (typeof StyleEnginePresets === 'undefined' || !StyleEnginePresets.saveNamedStyle) {
      setMessage('No se pudo guardar el estilo.', true);
      return;
    }

    var editingHall = editingStyleId === PROJECT_HALL_STYLE_ID;
    if (editingHall) {
      /* HALL factory is immutable — saving edits creates a personal style, never mutates HALL. */
      editingStyleId = null;
      setStyleNameInput('');
    }

    var isUpdate = !!editingStyleId;
    if (!isUpdate && countPersonalizarStyles() >= MAX_SAVED_STYLES) {
      setMessage('Máximo ' + MAX_SAVED_STYLES + ' estilos guardados. Elimina uno para crear otro.', true);
      return;
    }

    var name = getStyleNameInput();
    if (!name) {
      name = window.prompt(
        isUpdate ? 'Nombre del estilo (actualizar)' : 'Nombre del nuevo estilo',
        isUpdate ? '' : suggestNewStylePlaceholder()
      );
      if (!name || !String(name).trim()) {
        setMessage('Escribe un nombre para guardar el estilo.', true);
        return;
      }
      name = String(name).trim();
    }

    if (normalizeStyleNameKey(name) === normalizeStyleNameKey(BASE_STYLE_NAME)) {
      name = uniqueStyleName('Mi estilo');
    }

    /* Guardar estilo siempre crea uno nuevo, salvo que estés en modo Editar */
    if (!isUpdate) {
      name = uniqueStyleName(name);
    }

    var rules = typeof StyleEnginePersonalizarMapper !== 'undefined'
      ? StyleEnginePersonalizarMapper.draftToRules(draft)
      : (typeof StyleEngineTokens !== 'undefined' ? StyleEngineTokens.getDefaultRules() : {});

    var saved = StyleEnginePresets.saveNamedStyle(name, rules, {
      id: isUpdate ? editingStyleId : null,
      source: 'personalizar-v2',
      personalizarDraft: draft,
      replaceByName: false,
      projectId: getCurrentPanelProjectId(),
      previewColor: isUpdate
        ? resolvePreviewColor({ id: editingStyleId, personalizarDraft: draft })
        : (draft.bg || draft.menuColor || draft.accent || PREVIEW_COLOR_FALLBACK)
    });

    if (saved && saved.id) {
      if (!isUpdate) {
        writePreviewColor(
          saved.id,
          draft.bg || draft.menuColor || draft.accent || PREVIEW_COLOR_FALLBACK
        );
      } else {
        /* Keep existing previewColor map entry; ensure metadata stays in sync. */
        writePreviewColor(saved.id, resolvePreviewColor(saved));
      }
    }

    if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getActiveStyleMeta) {
      var active = StyleEngineStore.getActiveStyleMeta();
      var editedId = editingStyleId;
      if (active && (active.id === saved.id || (editedId && active.id === editedId))) {
        StyleEngineStore.setActiveStyleMeta(saved.id, saved.name);
        if (typeof window.refreshVisitorMenuProfile === 'function') {
          window.refreshVisitorMenuProfile();
        }
      }
    }

    var savedName = saved && saved.name ? saved.name : name;
    closeEditorAfterSave();
    renderMisEstilosList();
    setMessage(
      isUpdate
        ? 'Estilo «' + savedName + '» actualizado.'
        : 'Estilo «' + savedName + '» guardado.',
      false
    );
    setMisEstilosMessage('', false);
    if (typeof playSound === 'function') playSound('buttonTap');
    if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(3600000);
  }

  function renderStyleSwatch(style) {
    var color = resolvePreviewColor(style);
    return (
      '<button type="button" class="mis-tema-thumb" data-mis-estilo-action="preview-color" ' +
        'aria-label="Cambiar color identificador" title="Cambiar color identificador" ' +
        'style="--thumb-bg:' + escapeHtml(color) + '">' +
      '</button>'
    );
  }

  function renderActionIcon(action, icon, label, extraClass) {
    var className = 'mis-tema-icon-btn' + (extraClass ? ' ' + extraClass : '');
    return (
      '<button type="button" class="' + className + '" data-mis-estilo-action="' + action + '" aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '">' +
        icon +
      '</button>'
    );
  }

  function renderMisEstilosList() {
    var list = document.getElementById('misEstilosV2List');
    if (!list) return;

    var styles = getPersonalizarStyles();
    var countLabel = document.querySelector('#misEstilosV2Block .personalize-block-label');
    if (countLabel) {
      countLabel.textContent = 'Mis estilos (' + styles.length + '/' + MAX_SAVED_STYLES + ')';
    }

    if (!styles.length) {
      list.innerHTML = '<p class="personalize-hint">Aún no tienes estilos guardados. Ajusta el tema y pulsa Guardar estilo.</p>';
      return;
    }

    var showProject = canApplyAsProjectDefault();
    var projectDefaultStyleId = getProjectDefaultStyleId();
    list.innerHTML = '<div class="mis-temas-list">' + styles.map(function (style) {
      var isProjectDefault = !!(projectDefaultStyleId && style.id === projectDefaultStyleId);
      var isEditing = editingStyleId === style.id;
      var deleteLabel = style.isProjectLocked ? 'Estilo del proyecto (protegido)' : 'Eliminar';
      return (
        '<div class="mis-tema-item' + (isEditing ? ' is-editing' : '') + '" data-saved-style-id="' + escapeHtml(style.id) + '">' +
          renderStyleSwatch(style) +
          '<div class="mis-tema-item-name" title="' + escapeHtml(style.name) + '">' + escapeHtml(style.name) + '</div>' +
          '<div class="mis-tema-item-actions">' +
            renderActionIcon('apply', ICON_APPLY, 'Aplicar') +
            renderActionIcon('edit', ICON_EDIT, 'Editar') +
            (showProject
              ? renderActionIcon(
                'apply-project',
                ICON_STAR,
                isProjectDefault ? 'Predeterminado del proyecto' : 'Aplicar como predeterminado del proyecto',
                isProjectDefault ? 'is-project-default' : ''
              )
              : (isProjectDefault
                ? renderActionIcon('apply-project', ICON_STAR, 'Predeterminado del proyecto', 'is-project-default')
                : '<span class="mis-tema-icon-slot" aria-hidden="true"></span>')) +
            renderActionIcon('delete', ICON_DELETE, deleteLabel, style.isProjectLocked ? 'is-locked' : '') +
          '</div>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  function findStyleById(id) {
    if (!id) return null;
    if (id === PROJECT_HALL_STYLE_ID) return buildProjectHallStyle();
    var styles = getPersonalizarStyles();
    for (var i = 0; i < styles.length; i++) {
      if (styles[i].id === id) return styles[i];
    }
    if (typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.findById) {
      return StyleEnginePresets.findById(id);
    }
    return null;
  }

  function applySavedStyle(style) {
    if (isProjectSeedStyle(style) || (style && isProjectSeedStyleId(style.id))) {
      /* Always re-apply immutable HALL factory — never skip when already active. */
      var hall = buildProjectHallStyle();
      draft = normalize(hall.personalizarDraft);
      editingStyleId = null;
      setStyleNameInput(hall.name);
      persistDraftLocal(draft);
      syncUiFromDraft();

      if (typeof ProjectThemeAuthority !== 'undefined' &&
          typeof ProjectThemeAuthority.forceApplyHallFactoryPreset === 'function' &&
          ProjectThemeAuthority.forceApplyHallFactoryPreset()) {
        setMisEstilosMessage('Estilo «' + hall.name + '» aplicado.', false);
        setMessage('', false);
        if (typeof window.refreshVisitorMenuProfile === 'function') {
          window.refreshVisitorMenuProfile();
        }
        if (typeof playSound === 'function') playSound('buttonTap');
        return;
      }

      if (!publishDraftLive({ id: PROJECT_HALL_STYLE_ID, name: hall.name })) {
        previewLive();
        setMisEstilosMessage('Estilo cargado (preview). El editor de estilo no está disponible para aplicar.', true);
        return;
      }
      setMisEstilosMessage('Estilo «' + hall.name + '» aplicado.', false);
      setMessage('', false);
      if (typeof playSound === 'function') playSound('buttonTap');
      return;
    }
    if (!style || !style.personalizarDraft) {
      setMisEstilosMessage('Este estilo no tiene configuración válida.', true);
      return;
    }
    draft = normalize(style.personalizarDraft);
    setStyleNameInput(style.name);
    persistDraftLocal(draft);
    syncUiFromDraft();
    if (!publishDraftLive({ id: style.id, name: style.name })) {
      previewLive();
      setMisEstilosMessage('Estilo cargado (preview). El editor de estilo no está disponible para aplicar.', true);
      return;
    }
    setMisEstilosMessage('Estilo «' + style.name + '» aplicado.', false);
    setMessage('', false);
    if (typeof playSound === 'function') playSound('buttonTap');
  }

  function editSavedStyle(style) {
    if (isProjectSeedStyle(style)) {
      style = buildProjectHallStyle();
    }
    if (!style || !style.personalizarDraft) {
      setMisEstilosMessage('Este estilo no tiene configuración válida.', true);
      return;
    }
    /* EDIT ≠ APPLY: load a copy into the editor only — do not paint the project. */
    draft = normalize(style.personalizarDraft);
    editingStyleId = style.id;
    setStyleNameInput(style.name);
    persistDraftLocal(draft);
    syncUiFromDraft();
    setEditorOpen(true, { scroll: true });
    renderMisEstilosList();
    setMisEstilosMessage('Editando «' + style.name + '». Guarda para actualizar. Esto no aplica el tema.', false);
    setMessage('', false);
    if (typeof playSound === 'function') playSound('buttonTap');
  }

  function deleteSavedStyle(style) {
    if (!style) return;
    if (isProjectSeedStyle(style)) {
      setMisEstilosMessage('El estilo «' + BASE_STYLE_NAME + '» es el predeterminado del proyecto y no se puede eliminar.', true);
      return;
    }
    if (!window.confirm('¿Eliminar el estilo «' + style.name + '»?')) {
      if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(3600000);
      return;
    }
    var proyectoId = getCurrentPanelProjectId();
    if (typeof StyleEnginePresets !== 'undefined' && StyleEnginePresets.deletePersonal) {
      StyleEnginePresets.deletePersonal(style.id, proyectoId);
    }
    if (proyectoId && style.id) {
      try {
        var map = readPreviewColorMap();
        if (map[proyectoId] && map[proyectoId][style.id]) {
          delete map[proyectoId][style.id];
          localStorage.setItem(PREVIEW_COLORS_KEY, JSON.stringify(map));
        }
      } catch (e) {}
    }
    if (editingStyleId === style.id) {
      editingStyleId = null;
      setEditorOpen(false);
    }
    if (getProjectDefaultStyleId() === style.id && proyectoId) {
      setProjectDefaultStyleId(proyectoId, PROJECT_HALL_STYLE_ID);
    }
    if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getActiveStyleMeta) {
      var active = StyleEngineStore.getActiveStyleMeta();
      if (active && active.id === style.id) {
        StyleEngineStore.setActiveStyleMeta(null, null);
      }
    }
    renderMisEstilosList();
    setMisEstilosMessage('Estilo eliminado.', false);
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
    if (typeof playSound === 'function') playSound('buttonTap');
    if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(3600000);
  }

  function setConfirmModalError(message) {
    var copy = document.querySelector('#projectThemeConfirmModal .project-theme-confirm-copy');
    if (!copy) return;
    if (!copy.dataset.defaultCopy) copy.dataset.defaultCopy = copy.textContent || '';
    copy.textContent = message || copy.dataset.defaultCopy;
    copy.style.color = message ? '#ff8a8a' : '';
  }

  function resetConfirmModalCopy() {
    var copy = document.querySelector('#projectThemeConfirmModal .project-theme-confirm-copy');
    if (!copy || !copy.dataset.defaultCopy) return;
    copy.textContent = copy.dataset.defaultCopy;
    copy.style.color = '';
  }

  function openProjectDefaultConfirm(style) {
    if (!canApplyAsProjectDefault()) return;
    if (!style) {
      setMisEstilosMessage('No se pudo seleccionar el estilo.', true);
      return;
    }
    var themeDraft = normalize(style.personalizarDraft || style.configuracion || {});
    if (!themeDraft) {
      setMisEstilosMessage('Este estilo no tiene configuración válida.', true);
      return;
    }
    pendingProjectStyle = style;
    pendingProjectThemeDraft = themeDraft;
    resetConfirmModalCopy();
    var modal = document.getElementById('projectThemeConfirmModal');
    if (!modal) {
      confirmApplyAsProjectDefault();
      return;
    }
    modal.classList.add('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function closeProjectDefaultConfirm() {
    pendingProjectStyle = null;
    pendingProjectThemeDraft = null;
    resetConfirmModalCopy();
    var applyBtn = document.getElementById('projectThemeConfirmApplyBtn');
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.textContent = applyBtn.dataset.defaultLabel || 'Aplicar';
    }
    var modal = document.getElementById('projectThemeConfirmModal');
    if (modal) modal.classList.remove('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function hasPendingProjectConfirm() {
    return !!(pendingProjectStyle && pendingProjectThemeDraft);
  }

  async function confirmApplyAsProjectDefault() {
    if (!pendingProjectStyle || !pendingProjectThemeDraft) {
      setConfirmModalError('No hay un estilo seleccionado para aplicar.');
      console.warn('[Style V.3] Aplicar: sin pendingProjectStyle');
      return;
    }
    var style = pendingProjectStyle;
    var themeDraft = pendingProjectThemeDraft;
    var proyectoId = ProjectThemeAuthority.getCurrentProyectoId();
    if (!proyectoId) {
      setConfirmModalError('No se encontró el proyecto activo.');
      setMisEstilosMessage('No se encontró el proyecto activo.', true);
      return;
    }

    var applyBtn = document.getElementById('projectThemeConfirmApplyBtn');
    if (applyBtn) {
      if (!applyBtn.dataset.defaultLabel) applyBtn.dataset.defaultLabel = applyBtn.textContent || 'Aplicar';
      applyBtn.disabled = true;
      applyBtn.textContent = 'Aplicando…';
    }

    try {
      setProjectDefaultStyleId(proyectoId, style.id || PROJECT_HALL_STYLE_ID);
      await ProjectThemeAuthority.setOfficialThemeForProject(proyectoId, themeDraft);
      if (typeof StyleEngineStore !== 'undefined' && StyleEngineStore.setActiveStyleMeta) {
        StyleEngineStore.setActiveStyleMeta(style.id || PROJECT_HALL_STYLE_ID, style.name || BASE_STYLE_NAME);
      }
      if (typeof window.refreshVisitorMenuProfile === 'function') {
        window.refreshVisitorMenuProfile();
      }
      renderMisEstilosList();
      setMisEstilosMessage(
        'Estilo «' + (style.name || BASE_STYLE_NAME) + '» actualizado como predeterminado del proyecto.',
        false
      );
      closeProjectDefaultConfirm();
      if (typeof playSound === 'function') playSound('buttonTap');
    } catch (err) {
      console.error('[Style V.3] apply project default', err);
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = applyBtn.dataset.defaultLabel || 'Aplicar';
      }
      var msg = (err && err.message) || 'No se pudo aplicar al proyecto.';
      setConfirmModalError(msg);
      setMisEstilosMessage(msg, true);
    }
  }

  function bindProjectConfirmForV2() {
    var modal = document.getElementById('projectThemeConfirmModal');
    if (!modal || modal.dataset.p2Bound === '1') return;
    modal.dataset.p2Bound = '1';

    var applyBtn = document.getElementById('projectThemeConfirmApplyBtn');
    var cancelBtn = document.getElementById('projectThemeConfirmCancelBtn');

    if (applyBtn) {
      /* Capture phase so V2 owns the shared modal click before legacy no-op handler. */
      applyBtn.addEventListener('click', function (e) {
        if (!hasPendingProjectConfirm()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        confirmApplyAsProjectDefault();
      }, true);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function (e) {
        if (!hasPendingProjectConfirm()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        closeProjectDefaultConfirm();
      }, true);
    }
    modal.addEventListener('click', function (e) {
      if (e.target.id === 'projectThemeConfirmModal' && hasPendingProjectConfirm()) {
        closeProjectDefaultConfirm();
      }
    });
  }

  function openColor(field, anchorEl) {
    var fallback = '#000000';
    if (field === 'hoverColor') fallback = draft.surface || '#3a3a3a';
    if (field === 'buttonBorderColor') fallback = draft.surface || '#ffffff';
    if (field === 'buttonHoverBorderColor') {
      fallback = draft.buttonBorderColor || draft.hoverColor || draft.surface || '#ffffff';
    }
    if (field === 'buttonHoverTextColor') fallback = '#ffffff';
    var current = draft[field] || fallback;
    if (typeof StyleEngineColorPicker !== 'undefined' && StyleEngineColorPicker.open) {
      StyleEngineColorPicker.open(field, current, {
        onPreview: function (_key, value) {
          draft[field] = value;
          syncUiFromDraft();
          if (editorOpen) previewLive();
        },
        onApply: function (_key, value) {
          draft[field] = value;
          onDraftChange();
          syncUiFromDraft();
        },
        onCancel: function (_key, original) {
          draft[field] = original;
          syncUiFromDraft();
          if (editorOpen) previewLive();
        }
      });
      return;
    }
    var next = window.prompt('Color (hex)', current);
    if (!next) return;
    draft[field] = next;
    onDraftChange();
    syncUiFromDraft();
  }

  function renderActionsBarHtml() {
    return (
      '<button type="button" class="personalize-v2-icon-btn" data-p2-action="reset" title="Reiniciar" aria-label="Reiniciar">' +
        ICON_RESET +
      '</button>' +
      '<button type="button" class="personalize-v2-icon-btn" data-p2-action="save-style" title="Guardar estilo" aria-label="Guardar estilo">' +
        ICON_SAVE +
      '</button>' +
      '<button type="button" class="personalize-v2-icon-btn personalize-v2-icon-btn--primary" data-p2-action="apply" title="Aplicar a toda la web" aria-label="Aplicar a toda la web">' +
        ICON_APPLY_WEB +
      '</button>'
    );
  }

  function syncToolbar() {
    var col = document.getElementById('menuNavV2Col');
    var actions = document.getElementById('menuNavV2Actions');
    if (!col || !actions) return;
    if (!editorOpen) {
      actions.innerHTML = '';
      col.hidden = true;
      return;
    }
    actions.innerHTML = renderActionsBarHtml();
    col.hidden = false;
  }

  function hideToolbar() {
    var col = document.getElementById('menuNavV2Col');
    if (col) col.hidden = true;
  }

  function panelActionScopeContains(node) {
    var root = document.getElementById('mainMenuListPersonalizarV2');
    var toolbar = document.getElementById('menuNavV2Actions');
    if (root && root.contains(node)) return true;
    return !!(toolbar && toolbar.contains(node));
  }

  function handlePanelClick(e, root) {
      var createBtn = e.target.closest('[data-p2-action="create-style"]');
      if (createBtn && root.contains(createBtn)) {
        e.preventDefault();
        startCreateNewStyle();
        return;
      }

      var estiloEl = e.target.closest('[data-mis-estilo-action]');
      if (estiloEl && root.contains(estiloEl)) {
        e.preventDefault();
        var item = estiloEl.closest('[data-saved-style-id]');
        var styleId = item ? item.getAttribute('data-saved-style-id') : null;
        var style = styleId ? findStyleById(styleId) : null;
        var estiloAction = estiloEl.getAttribute('data-mis-estilo-action');
        if (estiloAction === 'preview-color') {
          e.stopPropagation();
          openPreviewColorPicker(style);
        } else if (estiloAction === 'apply') applySavedStyle(style);
        else if (estiloAction === 'edit') editSavedStyle(style);
        else if (estiloAction === 'delete') deleteSavedStyle(style);
        else if (estiloAction === 'apply-project') {
          if (canApplyAsProjectDefault()) openProjectDefaultConfirm(style);
        }
        return;
      }

      var actionEl = e.target.closest('[data-p2-action]');
      if (!actionEl || !panelActionScopeContains(actionEl)) return;
      var action = actionEl.getAttribute('data-p2-action');

      if (COLOR_FIELD_BY_ACTION[action]) {
        e.preventDefault();
        openColor(COLOR_FIELD_BY_ACTION[action], actionEl);
        return;
      }

      if (action === 'text-light' || action === 'text-dark') {
        e.preventDefault();
        draft.textMode = action === 'text-dark' ? 'dark' : 'light';
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (action === 'hero-layout-centered' || action === 'hero-layout-bottom-bar') {
        e.preventDefault();
        draft.heroLayout = action === 'hero-layout-bottom-bar' ? 'bottom-bar' : 'centered';
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (action === 'depth-low' || action === 'depth-medium' || action === 'depth-high') {
        e.preventDefault();
        draft.visualDepth = action === 'depth-low' ? 'low' : action === 'depth-high' ? 'high' : 'medium';
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (action === 'mask-blur-low' || action === 'mask-blur-medium' || action === 'mask-blur-high') {
        e.preventDefault();
        draft.maskBlur = action === 'mask-blur-low' ? 'low' : action === 'mask-blur-high' ? 'high' : 'medium';
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (
        action === 'border-width-low' || action === 'border-width-medium' || action === 'border-width-high' ||
        action === 'hover-border-width-low' || action === 'hover-border-width-medium' || action === 'hover-border-width-high'
      ) {
        e.preventDefault();
        var widthMode = action.indexOf('-high') >= 0 ? 'high' : action.indexOf('-low') >= 0 ? 'low' : 'medium';
        var widthField = actionEl.getAttribute('data-border-width-field') ||
          (action.indexOf('hover-border-width') === 0 ? 'buttonHoverBorderWidth' : 'buttonBorderWidth');
        draft[widthField] = widthMode;
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (action === 'glass-solid' || action === 'glass-soft' || action === 'glass-crystal') {
        e.preventDefault();
        var glassMode = action === 'glass-solid' ? 'solid' : action === 'glass-crystal' ? 'glass' : 'soft';
        var glassGroup = actionEl.closest('[data-glass-field]');
        var glassField = glassGroup ? glassGroup.getAttribute('data-glass-field') : 'panel';
        var draftKey = glassFieldToDraftKey(glassField);
        if (draftKey) draft[draftKey] = glassMode;
        onDraftChange();
        syncUiFromDraft();
        return;
      }

      if (action === 'apply') {
        e.preventDefault();
        applyToProject();
        return;
      }

      if (action === 'save-style') {
        e.preventDefault();
        saveCurrentStyle();
        return;
      }

      if (action === 'reset') {
        e.preventDefault();
        resetToBaseStyle();
      }
  }

  function bindPanel(root) {
    if (root.dataset.p2Bound === '1') return;
    root.dataset.p2Bound = '1';

    root.addEventListener('click', function (e) {
      handlePanelClick(e, root);
    });

    var toolbarCol = document.getElementById('menuNavV2Col');
    if (toolbarCol && toolbarCol.dataset.p2Bound !== '1') {
      toolbarCol.dataset.p2Bound = '1';
      toolbarCol.addEventListener('click', function (e) {
        handlePanelClick(e, root);
      });
    }
  }

  function render() {
    var host = document.getElementById('mainMenuListPersonalizarV2');
    if (!host) return;

    ensurePanelProjectScope();

    if (host.dataset.p2Rendered === '1') {
      syncToolbar();
      refreshStyleNameField();
      if (editorOpen) syncUiFromDraft();
      renderMisEstilosList();
      setEditorOpen(editorOpen);
      bindProjectConfirmForV2();
      return;
    }

    host.dataset.p2Rendered = '1';
    if (!draft) draft = loadStoredDraft();
    /* Entering Style V.3 never applies a theme — editor starts collapsed. */
    editorOpen = false;
    editingStyleId = null;
    var namePlaceholder = 'Mi estilo 1';

    host.innerHTML =
      '<div class="personalize-scroll personalize-v2-scroll">' +
        '<h2 class="personalize-panel-title">' + STYLE_V3_LABEL + '</h2>' +
        '<p class="personalize-v2-headline">Ajusta el estilo del proyecto</p>' +
        '<p class="personalize-v2-description">Refleja tu identidad y dota al proyecto de un carácter único.</p>' +
        '<p class="personalize-hint" id="personalizarV2Message"></p>' +

        '<div class="personalize-block glass-surface" id="misEstilosV2Block">' +
          '<div class="personalize-block-label">Mis estilos</div>' +
          '<div class="personalize-block-body" id="misEstilosV2List">' +
            '<p class="personalize-hint">Cargando estilos...</p>' +
          '</div>' +
          '<p class="personalize-hint" id="misEstilosV2Message"></p>' +
          '<button type="button" class="outline-btn personalize-v2-create-style-btn" id="personalizarV2CreateStyleBtn" data-p2-action="create-style">' +
            '+ Crear nuevo estilo' +
          '</button>' +
        '</div>' +

        '<div id="personalizarV2EditorSection" hidden>' +
          '<div class="personalizar-v2-editor-phases" id="personalizarV2Editor">' +
            editorPhaseHtml(
              'Nombre del estilo',
              '<label class="personalize-field custom-theme-name-field">' +
                '<input type="text" id="personalizarV2StyleName" maxlength="60" placeholder="' + escapeHtml(namePlaceholder) + '" autocomplete="off" value="" aria-label="Nombre del estilo">' +
              '</label>'
            ) +
            editorPhaseHtml(
              'Capas',
              surfaceBlock('Máscara de fondo', 'maskColor', 'pick-mask', 'mask', 'Oscurece el fondo detrás del menú y los popups.', { maskBlur: true }) +
              surfaceBlock('Superficies', 'bg', 'pick-bg', 'bg', 'Tarjetas 360°, tarjetas de vivienda y cuadro comparador.') +
              surfaceBlock('Menú lateral', 'menuColor', 'pick-menu', 'panel', 'Panel del menú Explorar y fondo general de la app.', { noDivider: true })
            ) +
            editorPhaseHtml(
              'Acento',
              '<div class="custom-theme-row custom-theme-row--tight">' +
                '<span class="custom-theme-row-label">Color de acento</span>' +
                '<button type="button" class="outline-btn custom-theme-pick-btn" data-p2-action="pick-accent" data-theme-color-field="accent" style="--pick-swatch:' + escapeHtml(draft.accent) + '">Elegir color</button>' +
              '</div>' +
              '<p class="personalize-hint personalize-theme-block-hint">Badges, precios destacados y estados como Reservado.</p>'
            ) +
            editorPhaseHtml('Botones', buttonsBlock()) +
            editorPhaseHtml('Bordes', bordersBlock()) +
            editorPhaseHtml(
              'Detalle visual',
              '<div class="custom-theme-row custom-theme-row--tight">' +
                '<span class="custom-theme-row-label">Sombras</span>' +
                '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="shadow">' +
                  shadowButtons() +
                '</div>' +
              '</div>' +
              '<div class="custom-theme-row">' +
                '<span class="custom-theme-row-label">Viñeta</span>' +
                '<div class="custom-theme-text-toggle custom-theme-depth-toggle">' +
                  '<button type="button" class="custom-theme-depth-btn" data-depth-mode="low" data-p2-action="depth-low">Baja</button>' +
                  '<button type="button" class="custom-theme-depth-btn" data-depth-mode="medium" data-p2-action="depth-medium">Media</button>' +
                  '<button type="button" class="custom-theme-depth-btn" data-depth-mode="high" data-p2-action="depth-high">Alta</button>' +
                '</div>' +
              '</div>' +
              '<div class="custom-theme-row">' +
                '<span class="custom-theme-row-label">Texto</span>' +
                '<div class="custom-theme-text-toggle">' +
                  '<button type="button" class="custom-theme-text-btn" data-text-mode="light" data-p2-action="text-light">Claro</button>' +
                  '<button type="button" class="custom-theme-text-btn" data-text-mode="dark" data-p2-action="text-dark">Oscuro</button>' +
                '</div>' +
              '</div>'
            ) +
            editorPhaseHtml(
              'Hover',
              hoverBlock(),
              'Botones, campos de texto e iconos al pasar el cursor.'
            ) +
            editorPhaseHtml('Portada', heroLayoutBlock()) +
          '</div>' +
        '</div>' +
      '</div>';

    bindPanel(host);
    bindProjectConfirmForV2();
    setEditorOpen(false);
    bindStyleNameInput();
    hydrateStyleNameFromActive();
    syncUiFromDraft();
    renderMisEstilosList();
    /* Intentionally NO previewLive() — opening Style V.3 must not change the live theme. */
  }

  function isOnPanel() {
    var el = document.getElementById('mainMenuListPersonalizarV2');
    return !!(el && el.style.display !== 'none' && el.offsetParent !== null);
  }

  function isAppliedLive() {
    if (typeof StyleEngineStore === 'undefined') return false;
    if (StyleEngineStore.getActiveTheme() !== StyleEngineStore.ACTIVE.STYLE_ENGINE) return false;
    if (StyleEngineStore.getEngineMode() !== StyleEngineStore.MODES.LIVE) return false;
    var saved = StyleEngineStore.getPersonalizarDraft && StyleEngineStore.getPersonalizarDraft();
    if (!saved || !draft) return false;
    try {
      return JSON.stringify(normalize(saved)) === JSON.stringify(normalize(draft));
    } catch (e) {
      return false;
    }
  }

  function onLeave() {
    /* Leaving Style V.3 never commits editor previews — restore published live theme. */
    var seLive = typeof StyleEngineCompatibility !== 'undefined' &&
      StyleEngineCompatibility.isStyleEngineLive &&
      StyleEngineCompatibility.isStyleEngineLive();
    if (seLive && typeof StyleEngineRuntime !== 'undefined' && StyleEngineRuntime.reinforcePublished) {
      StyleEngineRuntime.reinforcePublished();
    } else if (typeof ThemeSystem !== 'undefined' && ThemeSystem.reapply) {
      ThemeSystem.reapply();
    }
    if (typeof StyleEnginePersonalizarMapper !== 'undefined' &&
        StyleEnginePersonalizarMapper.clearMaterialsFlag) {
      StyleEnginePersonalizarMapper.clearMaterialsFlag();
    }
    clearPanelSession();
    hideToolbar();
  }

  return {
    render: render,
    isOnPanel: isOnPanel,
    onLeave: onLeave,
    getDraft: function () { return draft ? Object.assign({}, draft) : null; },
    hasPendingProjectConfirm: hasPendingProjectConfirm,
    confirmApplyAsProjectDefault: confirmApplyAsProjectDefault,
    closeProjectDefaultConfirm: closeProjectDefaultConfirm
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/visitor-personalize-v2-panel.js');}catch(_e){}
