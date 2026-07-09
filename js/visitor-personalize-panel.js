/* Personalizar panel — inside left navigation */
var VisitorPersonalizePanel = (function () {
  var panelEl = null;
  var customThemeDraft = null;
  var colorPopoverEl = null;
  var colorPopoverState = { field: null, revertColor: null, anchorEl: null, open: false };
  var spectrumDragActive = false;
  var popoverHsv = { h: 0, s: 1, v: 1 };
  var colorPopoverBound = false;
  var editingSavedThemeId = null;
  var editingOfficialPresetId = null;
  var pendingDeletePresetId = null;
  var activeOfficialPresetId = null;
  var savedThemesCache = [];
  var pendingOfficialTheme = null;
  var EDITOR_SESSION_KEY = 'guilie_personalize_editor_v1';
  var EDITOR_SESSION_VERSION = 2;
  var PANEL_DOM_VERSION = '12';

  var COLOR_FIELD_BY_ACTION = {
    'pick-bg': 'bg',
    'pick-menu': 'menuColor',
    'pick-surface': 'surface',
    'pick-accent': 'accent',
    'pick-hero-surface': 'heroSurface',
    'pick-mask': 'maskColor'
  };
  var AVATAR_COLOR_FIELD = 'avatar';

  var MIS_TEMA_ICON_APPLY =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>' +
    '</svg>';
  var MIS_TEMA_ICON_EDIT =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>' +
    '</svg>';
  var MIS_TEMA_ICON_DELETE =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' +
    '</svg>';
  var PRESET_ICON_TEMPLATE =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>' +
    '</svg>';
  var MIS_TEMA_ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/>' +
    '</svg>';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeHex(hex) {
    var h = String(hex || '').trim();
    if (!h) return '#000000';
    if (h.charAt(0) !== '#') h = '#' + h;
    if (h.length === 4) {
      h = '#' + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) + h.charAt(3) + h.charAt(3);
    }
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : null;
  }

  function hexToRgb(hex) {
    hex = normalizeHex(hex);
    if (!hex) return null;
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function clamp(n) {
      return Math.max(0, Math.min(255, Math.round(n)));
    }
    function part(n) {
      var s = clamp(n).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + part(r) + part(g) + part(b);
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s, v: v };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r = 0;
    var g = 0;
    var b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function bindSoundsToggle() {
    var toggle = document.getElementById('personalizeSoundsToggle');
    if (!toggle || typeof soundsEnabled === 'undefined') return;
    toggle.classList.toggle('on', !!soundsEnabled);
    toggle.onclick = function () {
      soundsEnabled = !soundsEnabled;
      if (typeof writeJSON === 'function') writeJSON('guilie_sounds_enabled', soundsEnabled);
      toggle.classList.toggle('on', soundsEnabled);
      if (typeof renderSoundsToggle === 'function') renderSoundsToggle();
    };
  }

  function bindAvatarColorModes() {
    var mode = VisitorPersonalization.getAvatarColorMode();
    var imageInput = document.getElementById('avatarImageInput');
    var pickBtn = document.getElementById('avatarPickColorBtn');

    document.querySelectorAll('.avatar-mode-btn').forEach(function (btn) {
      var btnMode = btn.getAttribute('data-mode');
      var isActive = btnMode === mode;
      btn.classList.toggle('selected', isActive);
      btn.onclick = function () {
        if (btnMode === 'image') {
          VisitorPersonalization.setAvatarColorMode('image');
          bindAvatarColorModes();
          if (imageInput) imageInput.click();
          return;
        }
        VisitorPersonalization.setAvatarColorMode(btnMode);
        bindAvatarColorModes();
        updatePreview();
      };
    });

    if (pickBtn) {
      pickBtn.classList.toggle('selected', mode === 'custom');
      pickBtn.style.setProperty('--pick-swatch', getAvatarPickSwatchColor());
      pickBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openColorPopover(AVATAR_COLOR_FIELD, pickBtn);
      };
    }

    if (imageInput) {
      imageInput.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          setMessage('personalizeIdentityMessage', 'La imagen debe pesar menos de 2 MB.', true);
          imageInput.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          VisitorPersonalization.setAvatarImageUrl(reader.result);
          bindAvatarColorModes();
          updatePreview();
          setMessage('personalizeIdentityMessage', 'Imagen de perfil actualizada.', false);
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
      };
    }
  }

  function getAvatarPickSwatchColor() {
    if (VisitorPersonalization.getAvatarColorMode() === 'custom') {
      return VisitorPersonalization.getAvatarCustomColor() || '#8f1d1d';
    }
    return VisitorPersonalization.getAvatarCustomColor() ||
      VisitorPersonalization.getAvatarColor() ||
      '#8f1d1d';
  }

  function previewAvatarColor(hex) {
    var normalized = normalizeHex(hex);
    if (!normalized) return;
    var preview = document.querySelector('#personalizeAvatarPreview .menu-profile-avatar:not(.menu-profile-avatar-image)');
    if (preview) preview.style.setProperty('--avatar-color', normalized);
    var pickBtn = document.getElementById('avatarPickColorBtn');
    if (pickBtn) pickBtn.style.setProperty('--pick-swatch', normalized);
  }


  function updatePreview() {
    var wrap = document.getElementById('personalizeAvatarPreview');
    if (!wrap) return;
    wrap.innerHTML = VisitorPersonalization.renderAvatarHtml('personalize-avatar-preview');
  }

  function ensureCustomThemeDraft() {
    if (!customThemeDraft) {
      customThemeDraft = ThemeSystem.getDefaultCustomTheme();
    }
    return customThemeDraft;
  }

  function renderGlassModeButtons() {
    return (
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="solid" data-theme-visual-action="glass-solid">Sólido</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="soft" data-theme-visual-action="glass-soft">Suave</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="glass" data-theme-visual-action="glass-crystal">Cristal</button>'
    );
  }

  function renderShadowModeButtons() {
    return (
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="glass" data-theme-visual-action="glass-crystal">Baja</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="soft" data-theme-visual-action="glass-soft">Media</button>' +
      '<button type="button" class="custom-theme-glass-btn" data-glass-mode="solid" data-theme-visual-action="glass-solid">Alta</button>'
    );
  }

  function renderMaskBlurButtons() {
    return (
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="low" data-theme-visual-action="mask-blur-low">Baja</button>' +
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="medium" data-theme-visual-action="mask-blur-medium">Media</button>' +
      '<button type="button" class="custom-theme-mask-blur-btn" data-mask-blur-mode="high" data-theme-visual-action="mask-blur-high">Alta</button>'
    );
  }

  function renderSurfaceBlock(title, colorField, colorAction, swatchColor, effectField, hint, options) {
    options = options || {};
    return (
      '<div class="custom-theme-block">' +
        '<div class="custom-theme-block-label">' + escapeHtml(title) + '</div>' +
        (hint ? '<p class="personalize-hint personalize-theme-block-hint">' + escapeHtml(hint) + '</p>' : '') +
        '<div class="custom-theme-block-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Efecto</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="' + effectField + '">' +
              renderGlassModeButtons() +
            '</div>' +
          '</div>' +
          (options.maskBlur
            ? '<div class="custom-theme-row custom-theme-row--tight">' +
                '<span class="custom-theme-row-label">Desenfoque</span>' +
                '<div class="custom-theme-text-toggle custom-theme-mask-blur-toggle">' +
                  renderMaskBlurButtons() +
                '</div>' +
              '</div>'
            : '') +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Color</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-theme-visual-action="' + colorAction + '" data-theme-color-field="' + colorField + '" style="--pick-swatch:' + escapeHtml(swatchColor) + '">Elegir color</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      renderThemeDivider()
    );
  }

  function renderThemeDivider() {
    return '<div class="custom-theme-divider" role="separator" aria-hidden="true"></div>';
  }

  function renderThemeGroupHeader(title) {
    return '<div class="custom-theme-group-header">' + escapeHtml(title) + '</div>';
  }

  function renderButtonSection(title, colorField, colorAction, swatchColor, effectField, borderField, hint) {
    return (
      '<div class="custom-theme-section">' +
        '<div class="custom-theme-section-label">' + escapeHtml(title) + '</div>' +
        (hint ? '<p class="personalize-hint personalize-theme-block-hint">' + escapeHtml(hint) + '</p>' : '') +
        '<div class="custom-theme-section-body">' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Color</span>' +
            '<button type="button" class="outline-btn custom-theme-pick-btn" data-theme-visual-action="' + colorAction + '" data-theme-color-field="' + colorField + '" style="--pick-swatch:' + escapeHtml(swatchColor) + '">Elegir color</button>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Efecto</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="' + effectField + '">' +
              renderGlassModeButtons() +
            '</div>' +
          '</div>' +
          '<div class="custom-theme-row custom-theme-row--tight">' +
            '<span class="custom-theme-row-label">Borde</span>' +
            '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="' + borderField + '">' +
              renderGlassModeButtons() +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      renderThemeDivider()
    );
  }

  function glassFieldToDraftKey(field) {
    if (field === 'hero-button') return 'heroButtonGlass';
    if (field === 'hero-border') return 'heroBorderGlass';
    if (field === 'mask') return 'maskGlass';
    if (field === 'button') return 'buttonGlass';
    if (field === 'border') return 'borderGlass';
    if (field === 'panel') return 'panelGlass';
    if (field === 'bg') return 'bgGlass';
    if (field === 'shadow') return 'shadowGlass';
    return null;
  }

  function defaultGlassFieldValue(field) {
    if (field === 'shadow') return 'soft';
    if (field === 'bg') return 'soft';
    if (field === 'panel') return 'solid';
    return 'solid';
  }

  function readGlassFieldFromPanel(field) {
    var group = document.querySelector('#themeVisualEditor [data-glass-field="' + field + '"]');
    var fallback = defaultGlassFieldValue(field);
    if (!group) return fallback;
    var selected = '';
    group.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
      if (btn.classList.contains('selected')) selected = btn.getAttribute('data-glass-mode') || '';
    });
    return selected || fallback;
  }

  function getCustomThemeDraftFromPanel() {
    ensureCustomThemeDraft();
    var textMode = 'light';
    var visualDepth = 'medium';
    document.querySelectorAll('[data-text-mode]').forEach(function (btn) {
      if (btn.classList.contains('selected')) textMode = btn.getAttribute('data-text-mode') || 'light';
    });
    document.querySelectorAll('.custom-theme-depth-btn').forEach(function (btn) {
      if (btn.classList.contains('selected')) visualDepth = btn.getAttribute('data-depth-mode') || 'medium';
    });
    customThemeDraft.textMode = textMode;
    customThemeDraft.visualDepth = visualDepth;
    customThemeDraft.panelGlass = readGlassFieldFromPanel('panel');
    customThemeDraft.bgGlass = readGlassFieldFromPanel('bg');
    if (!customThemeDraft.bgTextMode) customThemeDraft.bgTextMode = 'light';
    customThemeDraft.buttonGlass = readGlassFieldFromPanel('button');
    customThemeDraft.borderGlass = readGlassFieldFromPanel('border');
    customThemeDraft.shadowGlass = readShadowFieldFromPanel();
    customThemeDraft.heroButtonGlass = readGlassFieldFromPanel('hero-button');
    customThemeDraft.heroBorderGlass = readGlassFieldFromPanel('hero-border');
    customThemeDraft.maskGlass = readGlassFieldFromPanel('mask');
    customThemeDraft.maskBlur = readMaskBlurFromPanel();
    return {
      bg: customThemeDraft.bg,
      menuColor: customThemeDraft.menuColor,
      surface: customThemeDraft.surface,
      accent: customThemeDraft.accent,
      maskColor: customThemeDraft.maskColor,
      heroSurface: customThemeDraft.heroSurface,
      textMode: customThemeDraft.textMode,
      bgTextMode: customThemeDraft.bgTextMode,
      visualDepth: customThemeDraft.visualDepth,
      bgGlass: customThemeDraft.bgGlass,
      panelGlass: customThemeDraft.panelGlass,
      buttonGlass: customThemeDraft.buttonGlass,
      borderGlass: customThemeDraft.borderGlass,
      shadowGlass: customThemeDraft.shadowGlass,
      heroButtonGlass: customThemeDraft.heroButtonGlass,
      heroBorderGlass: customThemeDraft.heroBorderGlass,
      maskGlass: customThemeDraft.maskGlass,
      maskBlur: customThemeDraft.maskBlur
    };
  }

  function readMaskBlurFromPanel() {
    var selected = 'medium';
    document.querySelectorAll('.custom-theme-mask-blur-btn').forEach(function (btn) {
      if (btn.classList.contains('selected')) {
        selected = btn.getAttribute('data-mask-blur-mode') || 'medium';
      }
    });
    return ThemeSystem.normalizeMaskBlur(selected);
  }

  function syncCustomThemeMaskBlurButtons() {
    if (!customThemeDraft) return;
    var blur = ThemeSystem.normalizeMaskBlur(customThemeDraft.maskBlur || 'medium');
    document.querySelectorAll('.custom-theme-mask-blur-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-mask-blur-mode') === blur);
    });
  }

  function syncCustomThemeDepthButtons() {
    if (!customThemeDraft) return;
    var depth = customThemeDraft.visualDepth || 'medium';
    document.querySelectorAll('.custom-theme-depth-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-depth-mode') === depth);
    });
  }

  function syncGlassToggle(field, value) {
    var glass = ThemeSystem.normalizePanelGlass(value);
    var group = document.querySelector('#themeVisualEditor [data-glass-field="' + field + '"]');
    if (!group) return;
    group.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-glass-mode') === glass);
    });
  }

  function readShadowFieldFromPanel() {
    var group = document.querySelector('#themeVisualEditor [data-glass-field="shadow"]');
    if (!group) return 'soft';
    var selected = 'soft';
    group.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
      if (btn.classList.contains('selected')) selected = btn.getAttribute('data-glass-mode') || 'soft';
    });
    return selected;
  }

  function syncShadowToggle(value) {
    var glass = ThemeSystem.normalizeShadowGlass(value);
    var group = document.querySelector('#themeVisualEditor [data-glass-field="shadow"]');
    if (!group) return;
    group.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-glass-mode') === glass);
    });
  }

  function syncCustomThemeGlassButtons() {
    if (!customThemeDraft) return;
    syncGlassToggle('panel', customThemeDraft.panelGlass);
    syncGlassToggle('bg', customThemeDraft.bgGlass || defaultGlassFieldValue('bg'));
    syncGlassToggle('button', customThemeDraft.buttonGlass);
    syncGlassToggle('border', customThemeDraft.borderGlass);
    syncShadowToggle(customThemeDraft.shadowGlass);
    syncGlassToggle('hero-button', customThemeDraft.heroButtonGlass);
    syncGlassToggle('hero-border', customThemeDraft.heroBorderGlass);
    syncGlassToggle('mask', customThemeDraft.maskGlass);
    syncCustomThemeMaskBlurButtons();
  }

  function syncCustomThemeEditorValues(config) {
    customThemeDraft = ThemeSystem.normalizeCustomConfig(config);
    document.querySelectorAll('[data-text-mode]').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-text-mode') === customThemeDraft.textMode);
    });
    syncCustomThemeDepthButtons();
    syncCustomThemeMaskBlurButtons();
    syncCustomThemeGlassButtons();
    updatePickButtonSwatches();
  }

  function scrollToThemeVisualPanel() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var target = document.getElementById('themeVisualBlock');
        var scroll = document.querySelector('#mainMenuListPersonalizar .personalize-scroll');
        if (!target || !scroll) return;
        var scrollRect = scroll.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        var nextTop = scroll.scrollTop + (targetRect.top - scrollRect.top) - 8;
        scroll.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
      });
    });
  }

  function openCustomThemeEditor(config, savedThemeId, themeName, officialPresetId) {
    try {
      if (savedThemeId || config || officialPresetId) {
        clearEditorSessionState();
      }
      editingSavedThemeId = savedThemeId || null;
      editingOfficialPresetId = officialPresetId || null;
      var draftConfig = config;
      if (!draftConfig) {
        draftConfig = ThemeSystem.exportCustomConfigFromKey(ThemeSystem.getCurrentKey());
      } else {
        draftConfig = ThemeSystem.normalizeCustomConfig(draftConfig);
      }
      if (typeof ThemeSystem.beginCustomEditor === 'function') {
        ThemeSystem.beginCustomEditor();
      }
      syncCustomThemeEditorValues(draftConfig);
      onCustomThemeDraftChange();
      var nameInput = document.getElementById('customThemeNameInput');
      if (nameInput) nameInput.value = themeName || '';
      var titleEl = document.querySelector('.custom-theme-editor-title');
      if (titleEl) {
        titleEl.textContent = editingOfficialPresetId ? 'Editar tema oficial' : 'Crear mi tema';
      }
      var nameLabel = document.querySelector('.custom-theme-name-field span');
      if (nameLabel) {
        nameLabel.textContent = editingOfficialPresetId ? 'Nombre del tema oficial' : 'Nombre del tema';
      }
      showThemeEditor();
      scrollToThemeVisualPanel();
      setMessage('customThemeMessage', '', false);
    } catch (err) {
      console.error('openCustomThemeEditor', err);
      setMessage('customThemeMessage', 'No se pudo abrir el editor de tema.', true);
    }
  }

  function updatePickButtonSwatches() {
    if (!customThemeDraft) return;
    var map = {
      bg: customThemeDraft.bg,
      menuColor: customThemeDraft.menuColor,
      surface: customThemeDraft.surface,
      accent: customThemeDraft.accent,
      maskColor: customThemeDraft.maskColor,
      heroSurface: customThemeDraft.heroSurface
    };
    Object.keys(map).forEach(function (field) {
      var btn = document.querySelector('[data-theme-color-field="' + field + '"]');
      if (btn) btn.style.setProperty('--pick-swatch', map[field]);
    });
  }

  function applyDraftField(field, hex) {
    if (!customThemeDraft || !field) return;
    var normalized = normalizeHex(hex);
    if (!normalized) return;
    customThemeDraft[field] = normalized;
    updatePickButtonSwatches();
    onCustomThemeDraftChange();
  }

  function applyPopoverPreview(field, hex) {
    if (field === AVATAR_COLOR_FIELD) {
      previewAvatarColor(hex);
      return;
    }
    applyDraftField(field, hex);
  }

  function getPopoverInitialColor(field) {
    if (field === AVATAR_COLOR_FIELD) {
      if (VisitorPersonalization.getAvatarColorMode() === 'custom') {
        return VisitorPersonalization.getAvatarCustomColor() || '#8f1d1d';
      }
      return VisitorPersonalization.getAvatarColor() || '#8f1d1d';
    }
    ensureCustomThemeDraft();
    return customThemeDraft[field];
  }

  function commitPopoverColor(field) {
    var hexInput = document.getElementById('ctpHex');
    var hex = hexInput ? normalizeHex(hexInput.value) : null;
    if (!hex) return;
    if (field === AVATAR_COLOR_FIELD) {
      VisitorPersonalization.setAvatarCustomColor(hex);
      bindAvatarColorModes();
      updatePreview();
      return;
    }
    applyDraftField(field, hex);
  }

  function revertPopoverColor(field, hex) {
    if (field === AVATAR_COLOR_FIELD) {
      previewAvatarColor(hex);
      updatePreview();
      return;
    }
    applyDraftField(field, hex);
  }

  function onCustomThemeDraftChange() {
    var draft = getCustomThemeDraftFromPanel();
    if (!draft) return;
    saveEditorSessionState();
    ThemeSystem.previewCustomTheme(draft);
    if (VisitorPersonalization.getAvatarColorMode() === 'auto') updatePreview();
  }

  function readEditorSessionRaw() {
    try {
      var raw = sessionStorage.getItem(EDITOR_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function hasPendingEditorSession() {
    var saved = readEditorSessionRaw();
    return !!(saved && saved.version >= EDITOR_SESSION_VERSION && saved.editing && saved.draft);
  }

  function getCurrentNavTop() {
    if (typeof navStack === 'undefined' || !navStack.length) return null;
    return navStack[navStack.length - 1];
  }

  function isPopupNavActive() {
    var top = getCurrentNavTop();
    return !!(top && top.indexOf('menu-') !== 0);
  }

  function shouldRestoreEditorSession(options) {
    options = options || {};
    if (!hasPendingEditorSession()) return false;
    if (isPopupNavActive()) return false;
    if (typeof window.isHeroIdle === 'function' && window.isHeroIdle()) return false;
    if (!options.force && isOnPersonalizarPanel() && isThemeEditorOpen()) return false;

    var saved = readEditorSessionRaw();
    if (!saved || !saved.editing || !saved.draft) return false;
    if (typeof window.isMainMenuOpen === 'function' && !window.isMainMenuOpen()) return false;
    if (!isOnPersonalizarPanel()) return false;
    return true;
  }

  function clearEditorSessionState() {
    try { sessionStorage.removeItem(EDITOR_SESSION_KEY); } catch (err) {}
  }

  function captureEditorSessionPayload() {
    var editing = isThemeEditorOpen();
    var popoverOpen = isColorPopoverOpen();
    if (!editing && !popoverOpen) return null;

    var payload = {
      version: EDITOR_SESSION_VERSION,
      inPersonalizar: isOnPersonalizarPanel(),
      menuOpen: typeof window.isMainMenuOpen === 'function' && window.isMainMenuOpen(),
      navStackSnapshot: typeof navStack !== 'undefined' ? navStack.slice() : [],
      editing: editing,
      popoverOpen: popoverOpen,
      draft: customThemeDraft || (editing ? getCustomThemeDraftFromPanel() : null),
      editingSavedThemeId: editingSavedThemeId,
      editingOfficialPresetId: editingOfficialPresetId,
      scrollTop: 0,
      themeName: ''
    };

    if (!payload.draft && editing) {
      payload.draft = ThemeSystem.getDefaultCustomTheme();
    }
    if (!payload.draft) return null;

    var scroll = document.querySelector('#mainMenuListPersonalizar .personalize-scroll');
    if (scroll) payload.scrollTop = scroll.scrollTop;
    var nameInput = document.getElementById('customThemeNameInput');
    if (nameInput) payload.themeName = nameInput.value;
    return payload;
  }

  function isEditorSessionLocked() {
    return isOnPersonalizarPanel() && (isThemeEditorOpen() || isColorPopoverOpen());
  }

  function saveEditorSessionState() {
    var payload = captureEditorSessionPayload();
    if (!payload) return;
    try { sessionStorage.setItem(EDITOR_SESSION_KEY, JSON.stringify(payload)); } catch (err) {}
  }

  function restoreEditorSessionState(options) {
    if (restoreEditorSessionState.running) return false;
    if (!shouldRestoreEditorSession(options)) return false;
    if (!isOnPersonalizarPanel()) return false;
    var saved = readEditorSessionRaw();

    if (!saved || saved.version < EDITOR_SESSION_VERSION || !saved.editing || !saved.draft) {
      return false;
    }

    restoreEditorSessionState.running = true;
    try {
      if (!isPanelMounted()) {
        render();
      }
      if (!isPanelMounted()) return false;

      customThemeDraft = ThemeSystem.normalizeCustomConfig(saved.draft);
      editingSavedThemeId = saved.editingSavedThemeId || null;
      editingOfficialPresetId = saved.editingOfficialPresetId || null;
      showThemeEditor();
      syncCustomThemeEditorValues(customThemeDraft);
      if (saved.themeName) {
        var nameInput = document.getElementById('customThemeNameInput');
        if (nameInput) nameInput.value = saved.themeName;
      }
      ThemeSystem.previewCustomTheme(getCustomThemeDraftFromPanel());
      requestAnimationFrame(function () {
        var scroll = document.querySelector('#mainMenuListPersonalizar .personalize-scroll');
        if (scroll && saved.scrollTop) scroll.scrollTop = saved.scrollTop;
      });
      if (typeof window.syncNavigationCloseState === 'function') {
        window.syncNavigationCloseState();
      }
      return true;
    } finally {
      restoreEditorSessionState.running = false;
    }
  }

  function scheduleEditorSessionRestore() {
    if (typeof window.isNavResumeLocked === 'function' && window.isNavResumeLocked()) return;
    if (typeof window.isOverlayNavTop === 'function' && window.isOverlayNavTop()) return;
    if (isColorPopoverOpen()) return;
    if (typeof window.isHeroIdle === 'function' && window.isHeroIdle()) {
      clearEditorSessionState();
      customThemeDraft = null;
      editingSavedThemeId = null;
      return;
    }
    if (!shouldRestoreEditorSession({ force: true })) {
      clearEditorSessionState();
      return;
    }
    var run = function () {
      restoreEditorSessionState({ force: true });
    };
    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.whenReady === 'function') {
      AuthBootstrap.whenReady().then(run);
      return;
    }
    requestAnimationFrame(run);
  }

  function bindEditorSessionPersistence() {
    if (bindEditorSessionPersistence.bound) return;
    bindEditorSessionPersistence.bound = true;

    function onEditorTabHidden() {
      if (isThemeEditorOpen() || isColorPopoverOpen()) {
        saveEditorSessionState();
        return;
      }
      if (typeof window.isNavResumeLocked === 'function' && window.isNavResumeLocked()) {
        saveEditorSessionState();
        return;
      }
      if (typeof window.isMainMenuOpen === 'function' && window.isMainMenuOpen() && hasPendingEditorSession()) {
        return;
      }
      clearEditorSessionState();
      customThemeDraft = null;
      editingSavedThemeId = null;
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        onEditorTabHidden();
        return;
      }
      if (typeof window.isHeroIdle === 'function' && window.isHeroIdle()) {
        clearEditorSessionState();
      }
    });

    window.addEventListener('pagehide', onEditorTabHidden);
    window.addEventListener('blur', onEditorTabHidden, true);
  }

  function ensureColorPopover() {
    if (colorPopoverEl) return colorPopoverEl;

    colorPopoverEl = document.createElement('div');
    colorPopoverEl.id = 'customThemeColorPopover';
    colorPopoverEl.className = 'custom-theme-color-popover glass-surface';
    colorPopoverEl.innerHTML =
      '<div class="ctp-spectrum">' +
        '<div class="ctp-spectrum-canvas" id="ctpSpectrum" role="application" aria-label="Selector de color">' +
          '<span class="ctp-spectrum-cursor" id="ctpSpectrumCursor"></span>' +
        '</div>' +
      '</div>' +
      '<input type="range" class="ctp-hue" id="ctpHue" min="0" max="360" value="0" aria-label="Matiz">' +
      '<div class="ctp-fields">' +
        '<label class="ctp-field">' +
          '<span>HEX</span>' +
          '<input type="text" class="ctp-hex-input" id="ctpHex" maxlength="7" spellcheck="false" autocomplete="off">' +
        '</label>' +
        '<label class="ctp-field">' +
          '<span>RGB</span>' +
          '<div class="ctp-rgb-row">' +
            '<input type="number" class="ctp-rgb-input" id="ctpR" min="0" max="255" aria-label="Rojo">' +
            '<input type="number" class="ctp-rgb-input" id="ctpG" min="0" max="255" aria-label="Verde">' +
            '<input type="number" class="ctp-rgb-input" id="ctpB" min="0" max="255" aria-label="Azul">' +
          '</div>' +
        '</label>' +
      '</div>' +
      '<div class="ctp-actions">' +
        '<button type="button" class="outline-btn ctp-action-btn" data-ctp-action="cancel">Cancelar</button>' +
        '<button type="button" class="outline-btn ctp-action-btn" data-ctp-action="ok">OK</button>' +
      '</div>';

    var menuHost = document.getElementById('mainMenu');
    (menuHost || document.body).appendChild(colorPopoverEl);
    bindColorPopover();
    return colorPopoverEl;
  }

  function updatePopoverSpectrumUi() {
    var spectrum = document.getElementById('ctpSpectrum');
    var cursor = document.getElementById('ctpSpectrumCursor');
    var hueInput = document.getElementById('ctpHue');
    if (!spectrum || !cursor || !hueInput) return;

    spectrum.style.setProperty('--ctp-hue', String(Math.round(popoverHsv.h)));
    hueInput.value = String(Math.round(popoverHsv.h));
    cursor.style.left = (popoverHsv.s * 100) + '%';
    cursor.style.top = ((1 - popoverHsv.v) * 100) + '%';
  }

  function updatePopoverFieldsFromHsv() {
    var rgb = hsvToRgb(popoverHsv.h, popoverHsv.s, popoverHsv.v);
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hexInput = document.getElementById('ctpHex');
    var rInput = document.getElementById('ctpR');
    var gInput = document.getElementById('ctpG');
    var bInput = document.getElementById('ctpB');
    if (hexInput) hexInput.value = hex;
    if (rInput) rInput.value = String(rgb.r);
    if (gInput) gInput.value = String(rgb.g);
    if (bInput) bInput.value = String(rgb.b);
    updatePopoverSpectrumUi();
  }

  function setPopoverColorFromHex(hex, preview) {
    var normalized = normalizeHex(hex);
    if (!normalized) return;
    var rgb = hexToRgb(normalized);
    if (!rgb) return;
    popoverHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    if (popoverHsv.s === 0) popoverHsv.s = 0.0001;
    updatePopoverFieldsFromHsv();
    if (preview && colorPopoverState.field) {
      applyPopoverPreview(colorPopoverState.field, normalized);
    }
  }

  function setPopoverColorFromHsv(preview) {
    var rgb = hsvToRgb(popoverHsv.h, popoverHsv.s, popoverHsv.v);
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    updatePopoverFieldsFromHsv();
    if (preview && colorPopoverState.field) {
      applyPopoverPreview(colorPopoverState.field, hex);
    }
  }

  function positionColorPopover(anchorEl) {
    if (!colorPopoverEl || !anchorEl) return;
    colorPopoverEl.classList.add('is-open');

    var rect = anchorEl.getBoundingClientRect();
    var popRect = colorPopoverEl.getBoundingClientRect();
    var gap = 8;
    var top = rect.top - popRect.height - gap;
    var left = rect.right - popRect.width;

    if (top < gap) top = rect.bottom + gap;
    if (left < gap) left = gap;
    if (left + popRect.width > window.innerWidth - gap) {
      left = window.innerWidth - popRect.width - gap;
    }
    if (top + popRect.height > window.innerHeight - gap) {
      top = Math.max(gap, window.innerHeight - popRect.height - gap);
    }

    colorPopoverEl.style.top = top + 'px';
    colorPopoverEl.style.left = left + 'px';
  }

  function closeColorPopover(commit) {
    if (!colorPopoverState.open) return;

    var field = colorPopoverState.field;
    var revertColor = colorPopoverState.revertColor;

    if (commit) {
      commitPopoverColor(field);
    } else if (field && revertColor) {
      revertPopoverColor(field, revertColor);
    }

    colorPopoverState.open = false;
    colorPopoverState.field = null;
    colorPopoverState.revertColor = null;
    colorPopoverState.anchorEl = null;
    spectrumDragActive = false;

    if (colorPopoverEl) {
      colorPopoverEl.classList.remove('is-open');
    }
  }

  function openColorPopover(field, anchorEl) {
    ensureColorPopover();

    if (colorPopoverState.open) {
      closeColorPopover(false);
    }

    colorPopoverState.field = field;
    colorPopoverState.revertColor = getPopoverInitialColor(field);
    colorPopoverState.anchorEl = anchorEl;
    colorPopoverState.open = true;

    setPopoverColorFromHex(colorPopoverState.revertColor, false);
    positionColorPopover(anchorEl);

    if (typeof window.grantMenuOpenToken === 'function') {
      window.grantMenuOpenToken(60000);
    }
    if (typeof playSound === 'function') playSound('buttonTap');
    saveEditorSessionState();
  }

  function updateSpectrumFromPointer(clientX, clientY) {
    var spectrum = document.getElementById('ctpSpectrum');
    if (!spectrum) return;
    var rect = spectrum.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    popoverHsv.s = x;
    popoverHsv.v = 1 - y;
    setPopoverColorFromHsv(true);
  }

  function bindColorPopover() {
    if (colorPopoverBound) return;
    colorPopoverBound = true;

    var spectrum = colorPopoverEl.querySelector('#ctpSpectrum');
    var hueInput = colorPopoverEl.querySelector('#ctpHue');
    var hexInput = colorPopoverEl.querySelector('#ctpHex');
    var rInput = colorPopoverEl.querySelector('#ctpR');
    var gInput = colorPopoverEl.querySelector('#ctpG');
    var bInput = colorPopoverEl.querySelector('#ctpB');

    function onSpectrumPointerDown(e) {
      if (!colorPopoverState.open) return;
      spectrumDragActive = true;
      updateSpectrumFromPointer(e.clientX, e.clientY);
      e.preventDefault();
    }

    spectrum.addEventListener('mousedown', onSpectrumPointerDown);
    spectrum.addEventListener('touchstart', function (e) {
      if (!colorPopoverState.open || !e.touches[0]) return;
      spectrumDragActive = true;
      updateSpectrumFromPointer(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('mousemove', function (e) {
      if (!spectrumDragActive) return;
      updateSpectrumFromPointer(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', function () {
      spectrumDragActive = false;
    });

    document.addEventListener('touchmove', function (e) {
      if (!spectrumDragActive || !e.touches[0]) return;
      updateSpectrumFromPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchend', function () {
      spectrumDragActive = false;
    });

    hueInput.addEventListener('input', function () {
      popoverHsv.h = parseFloat(hueInput.value) || 0;
      setPopoverColorFromHsv(true);
    });

    hexInput.addEventListener('input', function () {
      var hex = normalizeHex(hexInput.value);
      if (!hex) return;
      setPopoverColorFromHex(hex, true);
    });

    function onRgbInput() {
      var r = parseInt(rInput.value, 10);
      var g = parseInt(gInput.value, 10);
      var b = parseInt(bInput.value, 10);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return;
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return;
      setPopoverColorFromHex(rgbToHex(r, g, b), true);
    }

    rInput.addEventListener('input', onRgbInput);
    gInput.addEventListener('input', onRgbInput);
    bInput.addEventListener('input', onRgbInput);

    colorPopoverEl.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-ctp-action]');
      if (!actionEl) return;
      e.stopPropagation();
      var action = actionEl.getAttribute('data-ctp-action');
      if (action === 'cancel') {
        closeColorPopover(false);
        if (typeof playSound === 'function') playSound('buttonTap');
        return;
      }
      if (action === 'ok') {
        closeColorPopover(true);
        if (typeof playSound === 'function') playSound('buttonTap');
      }
    });

    document.addEventListener('mousedown', function (e) {
      if (!colorPopoverState.open || !colorPopoverEl) return;
      if (colorPopoverEl.contains(e.target)) return;
      if (e.target.closest('[data-theme-visual-action^="pick-"]')) return;
      if (e.target.closest('#avatarPickColorBtn')) return;
      if (e.target.closest('#mainMenu')) return;
      if (e.target.closest('#customThemeColorPopover')) return;
      if (isThemeEditorOpen()) return;
      closeColorPopover(false);
    });
  }

  function showThemeEditor() {
    var panel = document.getElementById('themeVisualPanel');
    if (panel) panel.classList.add('is-editing');
    if (typeof window.grantMenuOpenToken === 'function') {
      window.grantMenuOpenToken(60000);
    }
    syncThemeEditorNavControls();
    saveEditorSessionState();
  }

  function showThemePicker() {
    closeColorPopover(false);
    editingSavedThemeId = null;
    editingOfficialPresetId = null;
    var panel = document.getElementById('themeVisualPanel');
    if (panel) panel.classList.remove('is-editing');
    syncThemeEditorNavControls();
    clearEditorSessionState();
  }

  function isOnPersonalizarPanel() {
    var personalizar = document.getElementById('mainMenuListPersonalizar');
    return !!(personalizar && personalizar.style.display !== 'none');
  }

  function isPanelMounted() {
    if (!panelEl) return false;
    var scroll = panelEl.querySelector('.personalize-scroll');
    return !!(scroll && scroll.getAttribute('data-panel-version') === PANEL_DOM_VERSION);
  }

  function handlePersonalizeEscape() {
    if (!isOnPersonalizarPanel()) return false;
    if (dismissThemeEditorLayer()) return true;
    if (typeof navStack !== 'undefined' &&
        navStack.length > 0 &&
        navStack[navStack.length - 1] === 'menu-personalizar' &&
        typeof goBack === 'function') {
      goBack();
      return true;
    }
    return true;
  }

  var saveThemeExitTimer = null;

  function finishThemeSaveSuccess(draft) {
    if (saveThemeExitTimer) {
      clearTimeout(saveThemeExitTimer);
      saveThemeExitTimer = null;
    }
    setSaveThemeNavMessage('TEMA GUARDADO', draft.accent);
    saveThemeExitTimer = window.setTimeout(function () {
      saveThemeExitTimer = null;
      showThemePicker();
      renderPresetThemeGrid();
      if (VisitorPersonalization.getAvatarColorMode() === 'auto') updatePreview();
      clearEditorSessionState();
    }, 1200);
  }

  function syncThemeEditorNavControls() {
    var saveBtn = document.getElementById('menuNavSaveTheme');
    var saveCol = document.getElementById('menuNavSaveCol');
    var deleteBtn = document.getElementById('menuNavDeleteOfficialPreset');
    var editing = isThemeEditorOpen() && isOnPersonalizarPanel();
    var editingOfficial = editing && !!editingOfficialPresetId && canManageOfficialPresets();
    if (saveBtn) saveBtn.hidden = !editing;
    if (saveCol) saveCol.hidden = !editing;
    if (deleteBtn) deleteBtn.hidden = !editingOfficial;
    if (!editing) setSaveThemeNavMessage('');
  }

  function setSaveThemeNavMessage(text, accentColor) {
    var el = document.getElementById('menuNavSaveThemeMessage');
    if (!el) return;
    if (!text) {
      el.textContent = '';
      el.hidden = true;
      el.style.color = '';
      return;
    }
    el.textContent = text;
    el.style.color = accentColor ||
      (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.getAccent === 'function'
        ? ThemeSystem.getAccent()
        : 'var(--accent)');
    el.hidden = false;
  }

  function isThemeEditorOpen() {
    var panel = document.getElementById('themeVisualPanel');
    return !!(panel && panel.classList.contains('is-editing'));
  }

  function isColorPopoverOpen() {
    return !!(colorPopoverState && colorPopoverState.open);
  }

  function dismissThemeEditorLayer() {
    if (isColorPopoverOpen()) {
      closeColorPopover(false);
      return true;
    }
    if (!isThemeEditorOpen()) return false;
    showThemePicker();
    setMessage('customThemeMessage', '', false);
    setSaveThemeNavMessage('');
    return true;
  }

  function resetThemeEditorOnLeave() {
    closeColorPopover(false);
    if (saveThemeExitTimer) {
      clearTimeout(saveThemeExitTimer);
      saveThemeExitTimer = null;
    }
    var panel = document.getElementById('themeVisualPanel');
    if (panel) panel.classList.remove('is-editing');
    customThemeDraft = null;
    editingSavedThemeId = null;
    editingOfficialPresetId = null;
    syncThemeEditorNavControls();
    clearEditorSessionState();
  }

  function upsertSavedThemeInCache(savedTheme) {
    if (!savedTheme || !savedTheme.id) return;
    var index = savedThemesCache.findIndex(function (theme) { return theme.id === savedTheme.id; });
    if (index === -1) {
      savedThemesCache.unshift(savedTheme);
    } else {
      savedThemesCache[index] = savedTheme;
    }
    renderMisTemasList(savedThemesCache);
  }

  function runSaveThemeAction(triggerEl) {
    closeColorPopover(true);
    var draft = getCustomThemeDraftFromPanel();
    if (!draft) return;
    var saveBtn = triggerEl;
    if (saveBtn) saveBtn.disabled = true;

    if (editingOfficialPresetId) {
      var nameInputOfficial = document.getElementById('customThemeNameInput');
      var officialName = nameInputOfficial ? nameInputOfficial.value.trim() : '';
      saveOfficialPresetAction(draft, officialName, saveBtn);
      return;
    }

    var savedThemeId = editingSavedThemeId;
    var nameInput = document.getElementById('customThemeNameInput');
    var themeName = nameInput ? nameInput.value.trim() : '';

    var localResult = VisitorPersonalization.saveCustomTheme(draft);
    if (!localResult.ok) {
      setSaveThemeNavMessage('');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }

    if (typeof VisitorEmailVerification !== 'undefined' && VisitorEmailVerification.isPending()) {
      finishThemeSaveSuccess(draft);
      VisitorEmailVerification.guard(VisitorEmailVerification.FEATURES.SYNC);
      if (saveBtn) saveBtn.disabled = false;
      if (typeof playSound === 'function') playSound('buttonTap');
      return;
    }

    VisitorPersonalization.saveCustomThemeRemote(draft, {
      themeId: savedThemeId,
      nombre: themeName
    }).then(function (result) {
      if (!result.ok) {
        setSaveThemeNavMessage('');
        return;
      }

      if (result.theme) {
        upsertSavedThemeInCache(result.theme);
      } else {
        return refreshMisTemasList();
      }

      finishThemeSaveSuccess(draft);
    }).catch(function () {
      setSaveThemeNavMessage('');
    }).finally(function () {
      if (saveBtn) saveBtn.disabled = false;
      if (typeof playSound === 'function') playSound('buttonTap');
    });
  }

  function renderSavedThemeSwatch(theme) {
    var config = theme.configuracion || {};
    var bg = config.bg || config.background || '#111111';
    var accent = config.accent || '#8f1d1d';
    return (
      '<span class="mis-tema-thumb" style="--thumb-bg:' + escapeHtml(bg) + ';--thumb-accent:' + escapeHtml(accent) + '" aria-hidden="true">' +
        '<span class="mis-tema-thumb-accent"></span>' +
      '</span>'
    );
  }

  function renderMisTemaActionIcon(action, iconSvg, label) {
    return (
      '<button type="button" class="mis-tema-icon-btn" data-mis-tema-action="' + action + '" aria-label="' + escapeHtml(label) + '">' +
        iconSvg +
      '</button>'
    );
  }

  function renderMisTemaStarSlot(showProjectApply) {
    if (showProjectApply) {
      return renderMisTemaActionIcon('apply-project', MIS_TEMA_ICON_STAR, 'Aplicar al proyecto');
    }
    return '<span class="mis-tema-icon-slot" aria-hidden="true"></span>';
  }

  function canApplyThemeToProject() {
    return typeof ProjectThemeAuthority !== 'undefined' &&
      ProjectThemeAuthority.canSetOfficialTheme(VisitorSession.getProfile());
  }

  function canManageOfficialPresets() {
    return typeof ProjectPresetThemes !== 'undefined' &&
      ProjectPresetThemes.canManage(VisitorSession.getProfile());
  }

  function renderPresetActionIcon(action, iconSvg, label) {
    return (
      '<button type="button" class="theme-preset-action-btn" data-preset-action="' + action + '" aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '">' +
        iconSvg +
      '</button>'
    );
  }

  function isPresetActive(preset) {
    if (!preset) return false;
    if (activeOfficialPresetId && activeOfficialPresetId === preset.id) return true;
    if (preset.config) {
      return typeof ThemeSystem.isCustomThemeActive === 'function' && ThemeSystem.isCustomThemeActive();
    }
    return ThemeSystem.getCurrentKey() === preset.builtinKey && !ThemeSystem.isCustomThemeActive();
  }

  function renderPresetThemeGrid() {
    var grid = document.getElementById('personalizeThemeGrid');
    if (!grid) return;
    if (typeof ProjectPresetThemes === 'undefined') {
      ThemeSystem.renderGrid('personalizeThemeGrid', onThemeSelect);
      return;
    }

    var presets = ProjectPresetThemes.getPresets();
    var isAdmin = canManageOfficialPresets();
    grid.innerHTML = '';
    grid.className = 'theme-swatch-grid personalize-theme-grid' + (isAdmin ? ' personalize-preset-grid' : '');

    presets.forEach(function (preset) {
      var sw = ProjectPresetThemes.getPresetSwatchColors(preset);
      var wrap = document.createElement('div');
      wrap.className = 'theme-preset-wrap';
      wrap.setAttribute('data-preset-id', preset.id);

      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'theme-swatch theme-preset-swatch' + (isPresetActive(preset) ? ' selected' : '');
      swatch.title = preset.name;
      swatch.setAttribute('aria-label', preset.name);

      swatch.style.setProperty('--swatch-bg', sw.bg);
      swatch.style.setProperty('--swatch-accent', sw.accent);

      var base = document.createElement('span');
      base.className = 'theme-swatch-base';
      base.setAttribute('aria-hidden', 'true');
      var accent = document.createElement('span');
      accent.className = 'theme-swatch-accent';
      accent.setAttribute('aria-hidden', 'true');
      swatch.appendChild(base);
      swatch.appendChild(accent);

      swatch.addEventListener('click', function (e) {
        if (e.target.closest('[data-preset-action]')) return;
        var result = ProjectPresetThemes.applyPreset(preset);
        if (result && result.ok === false) return;
        activeOfficialPresetId = preset.id;
        renderPresetThemeGrid();
        onThemeSelect(preset.builtinKey && !preset.config ? preset.builtinKey : ThemeSystem.CUSTOM_THEME_KEY);
        if (typeof playSound === 'function') playSound('buttonTap');
        if (typeof vibrate === 'function') vibrate(6);
      });

      var label = document.createElement('span');
      label.className = 'theme-preset-name';
      label.textContent = preset.name;

      wrap.appendChild(swatch);
      wrap.appendChild(label);

      if (isAdmin) {
        var actions = document.createElement('div');
        actions.className = 'theme-preset-actions theme-preset-actions--edit-only';
        actions.innerHTML = renderPresetActionIcon('edit-official', MIS_TEMA_ICON_EDIT, 'Editar tema oficial');
        wrap.appendChild(actions);
      }

      grid.appendChild(wrap);
    });
  }

  function openOfficialPresetEditor(preset) {
    if (!canManageOfficialPresets() || !preset) return;
    openCustomThemeEditor(
      ProjectPresetThemes.exportPresetConfig(preset),
      null,
      preset.name,
      preset.id
    );
    syncThemeEditorNavControls();
  }

  function openPresetAsTemplate(preset) {
    if (!preset) return;
    editingOfficialPresetId = null;
    openCustomThemeEditor(
      ProjectPresetThemes.exportPresetConfig(preset),
      null,
      preset.name + ' (variante)',
      null
    );
  }

  function openOfficialPresetDeleteConfirm(preset) {
    if (!canManageOfficialPresets() || !preset) return;
    pendingDeletePresetId = preset.id;
    var copy = document.getElementById('officialPresetDeleteCopy');
    if (copy) {
      copy.textContent = '¿Eliminar "' + preset.name + '" de la lista oficial? Deben quedar al menos ' +
        ProjectPresetThemes.MIN_PRESETS + ' temas.';
    }
    var modal = document.getElementById('officialPresetDeleteModal');
    if (!modal) return;
    modal.classList.add('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function closeOfficialPresetDeleteConfirm() {
    pendingDeletePresetId = null;
    var modal = document.getElementById('officialPresetDeleteModal');
    if (modal) modal.classList.remove('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  async function confirmDeleteOfficialPreset() {
    if (!pendingDeletePresetId || !canManageOfficialPresets()) return;
    try {
      await ProjectPresetThemes.deletePreset(pendingDeletePresetId);
      if (activeOfficialPresetId === pendingDeletePresetId) activeOfficialPresetId = null;
      if (editingOfficialPresetId === pendingDeletePresetId) {
        editingOfficialPresetId = null;
        showThemePicker();
        customThemeDraft = null;
      }
      closeOfficialPresetDeleteConfirm();
      renderPresetThemeGrid();
      syncThemeEditorNavControls();
      setMessage('customThemeMessage', 'Tema oficial eliminado.', false);
      if (typeof playSound === 'function') playSound('buttonTap');
    } catch (err) {
      setMessage('customThemeMessage', err.message || 'No se pudo eliminar el tema.', true);
    }
  }

  function deleteEditingOfficialPreset() {
    if (!editingOfficialPresetId || !canManageOfficialPresets()) return;
    var preset = ProjectPresetThemes.findPreset(editingOfficialPresetId);
    if (preset) openOfficialPresetDeleteConfirm(preset);
  }

  function bindOfficialPresetDeleteModal() {
    var modal = document.getElementById('officialPresetDeleteModal');
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';
    var cancelBtn = document.getElementById('officialPresetDeleteCancelBtn');
    var confirmBtn = document.getElementById('officialPresetDeleteConfirmBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeOfficialPresetDeleteConfirm);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDeleteOfficialPreset);
    modal.addEventListener('click', function (e) {
      if (e.target.id === 'officialPresetDeleteModal') closeOfficialPresetDeleteConfirm();
    });
  }

  function bindPresetThemeGrid() {
    var grid = document.getElementById('personalizeThemeGrid');
    if (!grid || grid.dataset.presetBound === '1') return;
    grid.dataset.presetBound = '1';
    grid.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-preset-action]');
      if (!actionEl || !grid.contains(actionEl)) return;
      e.preventDefault();
      e.stopPropagation();
      var wrap = actionEl.closest('[data-preset-id]');
      if (!wrap) return;
      var preset = typeof ProjectPresetThemes !== 'undefined'
        ? ProjectPresetThemes.findPreset(wrap.getAttribute('data-preset-id'))
        : null;
      if (!preset) return;
      var action = actionEl.getAttribute('data-preset-action');
      if (action === 'template') {
        openPresetAsTemplate(preset);
        return;
      }
      if (action === 'edit-official') {
        openOfficialPresetEditor(preset);
        return;
      }
    });
  }

  async function saveOfficialPresetAction(draft, themeName, saveBtn) {
    if (!editingOfficialPresetId || !canManageOfficialPresets()) return;
    var presetId = editingOfficialPresetId;
    try {
      await ProjectPresetThemes.updatePreset(presetId, {
        name: themeName || undefined,
        config: draft,
        swatchBg: draft.bg,
        swatchAccent: draft.accent
      });
      var updated = ProjectPresetThemes.findPreset(presetId);
      editingOfficialPresetId = null;
      activeOfficialPresetId = presetId;
      if (saveThemeExitTimer) {
        clearTimeout(saveThemeExitTimer);
        saveThemeExitTimer = null;
      }
      setSaveThemeNavMessage('TEMA OFICIAL GUARDADO', draft.accent);
      saveThemeExitTimer = window.setTimeout(function () {
        saveThemeExitTimer = null;
        showThemePicker();
        renderPresetThemeGrid();
        if (updated) ProjectPresetThemes.applyPreset(updated);
        if (VisitorPersonalization.getAvatarColorMode() === 'auto') updatePreview();
        clearEditorSessionState();
      }, 1200);
      setMessage('customThemeMessage', 'Tema oficial actualizado en la lista prediseñada.', false);
    } catch (err) {
      setSaveThemeNavMessage('');
      setMessage('customThemeMessage', err.message || 'No se pudo guardar el tema oficial.', true);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      if (typeof playSound === 'function') playSound('buttonTap');
    }
  }

  function renderMisTemasList(themes) {
    var list = document.getElementById('misTemasList');
    if (!list) return;

    if (!themes || !themes.length) {
      list.innerHTML = '<p class="personalize-hint">Aún no tienes temas guardados. Crea uno y pulsa Guardar mi tema.</p>';
      return;
    }

    var showProjectApply = canApplyThemeToProject();

    list.innerHTML = '<div class="mis-temas-list">' + themes.map(function (theme) {
      return (
        '<div class="mis-tema-item" data-saved-theme-id="' + escapeHtml(theme.id) + '">' +
          renderSavedThemeSwatch(theme) +
          '<div class="mis-tema-item-name" title="' + escapeHtml(theme.nombre) + '">' + escapeHtml(theme.nombre) + '</div>' +
          '<div class="mis-tema-item-actions">' +
            renderMisTemaActionIcon('apply', MIS_TEMA_ICON_APPLY, 'Aplicar') +
            renderMisTemaActionIcon('edit', MIS_TEMA_ICON_EDIT, 'Editar') +
            renderMisTemaStarSlot(showProjectApply) +
            renderMisTemaActionIcon('delete', MIS_TEMA_ICON_DELETE, 'Eliminar') +
          '</div>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  function openProjectThemeConfirm(theme) {
    if (!canApplyThemeToProject()) return;
    pendingOfficialTheme = theme;
    var modal = document.getElementById('projectThemeConfirmModal');
    if (!modal) return;
    modal.classList.add('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function closeProjectThemeConfirm() {
    pendingOfficialTheme = null;
    var modal = document.getElementById('projectThemeConfirmModal');
    if (modal) modal.classList.remove('active');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  async function confirmApplyThemeToProject() {
    if (!pendingOfficialTheme) return;
    var proyectoId = ProjectThemeAuthority.getCurrentProyectoId();
    if (!proyectoId) {
      setMessage('misTemasMessage', 'No se encontró el proyecto activo.', true);
      closeProjectThemeConfirm();
      return;
    }
    try {
      await ProjectThemeAuthority.setOfficialThemeForProject(
        proyectoId,
        pendingOfficialTheme.configuracion
      );
      setMessage('misTemasMessage', 'Tema oficial del proyecto actualizado.', false);
      closeProjectThemeConfirm();
      if (typeof playSound === 'function') playSound('buttonTap');
    } catch (err) {
      setMessage('misTemasMessage', err.message || 'No se pudo aplicar el tema al proyecto.', true);
    }
  }

  function bindProjectThemeConfirmModal() {
    var modal = document.getElementById('projectThemeConfirmModal');
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    var cancelBtn = document.getElementById('projectThemeConfirmCancelBtn');
    var applyBtn = document.getElementById('projectThemeConfirmApplyBtn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        closeProjectThemeConfirm();
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        confirmApplyThemeToProject();
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target.id === 'projectThemeConfirmModal') closeProjectThemeConfirm();
    });
  }

  async function refreshMisTemasList() {
    var list = document.getElementById('misTemasList');
    if (typeof VisitorEmailVerification !== 'undefined' && VisitorEmailVerification.isPending()) {
      if (list) {
        list.innerHTML = '<p class="personalize-hint">Verifica tu correo para sincronizar y guardar temas en la nube.</p>';
      }
      savedThemesCache = [];
      return;
    }
    try {
      savedThemesCache = await VisitorPersonalization.listSavedThemes();
      renderMisTemasList(savedThemesCache);
    } catch (err) {
      renderMisTemasList([]);
      setMessage('misTemasMessage', err.message || 'No se pudieron cargar tus temas.', true);
    }
  }

  function findSavedTheme(themeId) {
    return savedThemesCache.find(function (theme) { return theme.id === themeId; }) || null;
  }

  function dismissThemeEditorForApply() {
    closeColorPopover(false);
    editingSavedThemeId = null;
    editingOfficialPresetId = null;
    customThemeDraft = null;
    var panel = document.getElementById('themeVisualPanel');
    if (panel) panel.classList.remove('is-editing');
    clearEditorSessionState();
    syncThemeEditorNavControls();
  }

  function bindMisTemasPanel() {
    var block = document.getElementById('misTemasBlock');
    if (!block || block.dataset.bound === '1') return;
    block.dataset.bound = '1';

    block.addEventListener('click', async function (e) {
      var actionEl = e.target.closest('[data-mis-tema-action]');
      if (!actionEl || !block.contains(actionEl)) return;

      var item = actionEl.closest('[data-saved-theme-id]');
      if (!item) return;
      var themeId = item.getAttribute('data-saved-theme-id');
      var theme = findSavedTheme(themeId);
      if (!theme) {
        await refreshMisTemasList();
        theme = findSavedTheme(themeId);
      }
      if (!theme) {
        setMessage('misTemasMessage', 'No se encontró el tema. Intenta de nuevo.', true);
        return;
      }

      var action = actionEl.getAttribute('data-mis-tema-action');
      if (action === 'apply') {
        e.preventDefault();
        dismissThemeEditorForApply();
        var applyResult = await VisitorPersonalization.applySavedTheme(theme);
        if (!applyResult.ok) {
          setMessage('misTemasMessage', applyResult.message || 'No se pudo aplicar el tema.', true);
          return;
        }
        setMessage(
          'misTemasMessage',
          applyResult.warning || 'Tema aplicado.',
          false
        );
        renderPresetThemeGrid();
        updatePreview();
        if (typeof playSound === 'function') playSound('buttonTap');
        return;
      }
      if (action === 'edit') {
        e.preventDefault();
        clearEditorSessionState();
        var config = theme.configuracion || {};
        openCustomThemeEditor(
          ThemeSystem.normalizeCustomConfig(config),
          theme.id,
          theme.nombre
        );
        return;
      }
      if (action === 'apply-project') {
        e.preventDefault();
        openProjectThemeConfirm(theme);
        return;
      }
      if (action === 'delete') {
        e.preventDefault();
        var deleteResult = await VisitorPersonalization.deleteSavedTheme(themeId);
        if (!deleteResult.ok) {
          setMessage('misTemasMessage', deleteResult.message || 'No se pudo eliminar el tema.', true);
          return;
        }
        setMessage('misTemasMessage', 'Tema eliminado.', false);
        await refreshMisTemasList();
      }
    });
  }

  function bindThemeEditorNavControls() {
    var topSave = document.getElementById('menuNavSaveTheme');
    if (topSave && !topSave.dataset.bound) {
      topSave.dataset.bound = '1';
      topSave.addEventListener('click', function (e) {
        e.preventDefault();
        if (!isThemeEditorOpen()) return;
        runSaveThemeAction(topSave);
      });
    }
    var deleteBtn = document.getElementById('menuNavDeleteOfficialPreset');
    if (deleteBtn && !deleteBtn.dataset.bound) {
      deleteBtn.dataset.bound = '1';
      deleteBtn.addEventListener('click', function (e) {
        e.preventDefault();
        deleteEditingOfficialPreset();
      });
    }
    syncThemeEditorNavControls();
  }

  function bindThemeVisualPanel() {
    var panel = document.getElementById('themeVisualPanel');
    if (!panel) return;

    panel.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-theme-visual-action]');
      if (!actionEl || !panel.contains(actionEl)) return;

      var action = actionEl.getAttribute('data-theme-visual-action');
      if (action === 'open-editor') {
        e.preventDefault();
        openCustomThemeEditor();
        if (typeof playSound === 'function') playSound('buttonTap');
        if (typeof vibrate === 'function') vibrate(6);
        return;
      }
      if (action === 'open-ai-theme') {
        e.preventDefault();
        if (typeof ThemeAIModal !== 'undefined') {
          ThemeAIModal.open();
        }
        if (typeof playSound === 'function') playSound('buttonTap');
        if (typeof vibrate === 'function') vibrate(6);
        return;
      }
      if (COLOR_FIELD_BY_ACTION[action]) {
        e.preventDefault();
        e.stopPropagation();
        openColorPopover(COLOR_FIELD_BY_ACTION[action], actionEl);
        return;
      }
      if (action === 'text-light' || action === 'text-dark') {
        e.preventDefault();
        document.querySelectorAll('[data-text-mode]').forEach(function (btn) {
          btn.classList.toggle('selected', btn.getAttribute('data-theme-visual-action') === action);
        });
        onCustomThemeDraftChange();
        return;
      }
      if (action === 'depth-low' || action === 'depth-medium' || action === 'depth-high') {
        e.preventDefault();
        var depthMode = action === 'depth-low' ? 'low' : action === 'depth-high' ? 'high' : 'medium';
        document.querySelectorAll('.custom-theme-depth-btn').forEach(function (btn) {
          btn.classList.toggle('selected', btn.getAttribute('data-depth-mode') === depthMode);
        });
        if (customThemeDraft) customThemeDraft.visualDepth = depthMode;
        onCustomThemeDraftChange();
        return;
      }
      if (action === 'mask-blur-low' || action === 'mask-blur-medium' || action === 'mask-blur-high') {
        e.preventDefault();
        var maskBlurMode = action === 'mask-blur-low' ? 'low' : action === 'mask-blur-high' ? 'high' : 'medium';
        document.querySelectorAll('.custom-theme-mask-blur-btn').forEach(function (btn) {
          btn.classList.toggle('selected', btn.getAttribute('data-mask-blur-mode') === maskBlurMode);
        });
        if (customThemeDraft) customThemeDraft.maskBlur = maskBlurMode;
        onCustomThemeDraftChange();
        return;
      }
      if (action === 'glass-solid' || action === 'glass-soft' || action === 'glass-crystal') {
        e.preventDefault();
        var glassMode = action === 'glass-solid' ? 'solid' : action === 'glass-crystal' ? 'glass' : 'soft';
        var glassGroup = actionEl.closest('[data-glass-field]');
        var glassField = glassGroup ? glassGroup.getAttribute('data-glass-field') : 'panel';
        if (glassGroup) {
          glassGroup.querySelectorAll('.custom-theme-glass-btn').forEach(function (btn) {
            btn.classList.toggle('selected', btn.getAttribute('data-glass-mode') === glassMode);
          });
        }
        ensureCustomThemeDraft();
        var draftKey = glassFieldToDraftKey(glassField);
        if (draftKey) customThemeDraft[draftKey] = glassMode;
        onCustomThemeDraftChange();
        return;
      }
      if (action === 'back-picker') {
        e.preventDefault();
        showThemePicker();
        setMessage('customThemeMessage', '', false);
        if (typeof playSound === 'function') playSound('buttonTap');
        return;
      }
      if (action === 'save-theme') {
        e.preventDefault();
        runSaveThemeAction(actionEl);
      }
    });
  }

  function bindCustomThemeEditor() {
    bindThemeEditorNavControls();
    bindThemeVisualPanel();
  }

  function onThemeSelect(key) {
    showThemePicker();
    VisitorPersonalization.setThemeKey(key);
    if (!VisitorSession.getProfile() && typeof ThemeSystem.markUserChosen === 'function') {
      ThemeSystem.markUserChosen();
    }
    if (VisitorPersonalization.getAvatarColorMode() === 'auto') updatePreview();
  }

  function render() {
    if (!panelEl) panelEl = document.getElementById('mainMenuListPersonalizar');
    if (!panelEl) return;
    if (isPanelMounted()) {
      syncThemeEditorNavControls();
      renderPresetThemeGrid();
      return;
    }

    closeColorPopover(false);
    customThemeDraft = null;

    var displayName = VisitorPersonalization.getDisplayName();
    var username = VisitorPersonalization.getUsername();
    var email = VisitorPersonalization.getEmail();
    var colorMode = VisitorPersonalization.getAvatarColorMode();
    var avatarPickSwatch = getAvatarPickSwatchColor();
    var defaultCustom = ThemeSystem.getDefaultCustomTheme();
    var isPresetAdmin = canManageOfficialPresets();
    var presetHint = isPresetAdmin
      ? 'Temas oficiales del proyecto. Solo tú puedes editarlos o eliminarlos (mín. ' + (typeof ProjectPresetThemes !== 'undefined' ? ProjectPresetThemes.MIN_PRESETS : 3) + ', máx. ' + (typeof ProjectPresetThemes !== 'undefined' ? ProjectPresetThemes.MAX_PRESETS : 15) + '). Los visitantes solo pueden aplicarlos o usarlos como plantilla.'
      : 'Elige un tema de la lista. Puedes crear tu propia variante con «Crear variante».';

    panelEl.innerHTML =
      '<div class="personalize-scroll" data-panel-version="' + PANEL_DOM_VERSION + '">' +
        '<h2 class="personalize-panel-title">Personalizar</h2>' +

        '<div class="personalize-block glass-surface">' +
          '<div class="personalize-block-label">Color del avatar</div>' +
          '<div class="personalize-block-body">' +
            '<div class="avatar-color-row">' +
              '<div class="avatar-color-row-preview" id="personalizeAvatarPreview">' +
                VisitorPersonalization.renderAvatarHtml('personalize-avatar-preview') +
              '</div>' +
              '<div class="avatar-color-modes avatar-color-modes-stack">' +
                '<button type="button" class="avatar-mode-btn' + (colorMode === 'auto' ? ' selected' : '') + '" data-mode="auto">Automático</button>' +
                '<button type="button" class="outline-btn custom-theme-pick-btn avatar-pick-color-btn' + (colorMode === 'custom' ? ' selected' : '') + '" id="avatarPickColorBtn" style="--pick-swatch:' + escapeHtml(avatarPickSwatch) + '">Elegir color</button>' +
                '<button type="button" class="avatar-mode-btn' + (colorMode === 'image' ? ' selected' : '') + '" data-mode="image">Subir imagen</button>' +
              '</div>' +
            '</div>' +
            '<input type="file" id="avatarImageInput" accept="image/jpeg,image/png,image/webp" hidden>' +
          '</div>' +
        '</div>' +

        '<div class="personalize-block personalize-block--plain" id="themeVisualBlock">' +
          '<div class="personalize-block-label">Tema visual' + (isPresetAdmin ? ' <span class="personalize-admin-badge">Admin</span>' : '') + '</div>' +
          '<div class="personalize-block-body theme-visual-panel" id="themeVisualPanel">' +
            '<div id="themeVisualPicker" class="theme-visual-picker">' +
              '<div class="theme-swatch-grid personalize-theme-grid" id="personalizeThemeGrid"></div>' +
              '<p class="personalize-hint personalize-theme-picker-hint">' + escapeHtml(presetHint) + '</p>' +
              '<button type="button" class="outline-btn personalize-create-theme-btn" data-theme-visual-action="open-editor">Crear variante</button>' +
              '<button type="button" class="outline-btn personalize-ai-theme-btn" data-theme-visual-action="open-ai-theme">✨ Generar tema con IA</button>' +
            '</div>' +
            '<div id="themeVisualEditor" class="theme-visual-editor">' +
              '<button type="button" class="menu-nav-back custom-theme-back-btn" data-theme-visual-action="back-picker">' +
                '<span class="menu-nav-back-icon" aria-hidden="true">↶</span>' +
                '<span class="menu-nav-back-label">volver</span>' +
              '</button>' +
              '<h3 class="custom-theme-editor-title">Crear mi tema</h3>' +
              '<label class="personalize-field custom-theme-name-field">' +
                '<span>Nombre del tema</span>' +
                '<input type="text" id="customThemeNameInput" maxlength="60" placeholder="Mi tema 1" autocomplete="off">' +
              '</label>' +
              '<div class="custom-theme-rows">' +
                renderThemeGroupHeader('Capas') +
                renderSurfaceBlock('Máscara de fondo', 'maskColor', 'pick-mask', defaultCustom.maskColor || defaultCustom.bg, 'mask', 'Oscurece el fondo detrás del menú y los popups.', { maskBlur: true }) +
                renderSurfaceBlock('Superficies', 'bg', 'pick-bg', defaultCustom.bg, 'bg', 'Tarjetas 360°, tarjetas de vivienda y cuadro comparador.') +
                renderSurfaceBlock('Menú lateral', 'menuColor', 'pick-menu', defaultCustom.menuColor || defaultCustom.bg, 'panel', 'Panel del menú Explorar y fondo general de la app.') +
                renderThemeDivider() +
                renderThemeGroupHeader('Acento') +
                '<div class="custom-theme-row custom-theme-row--tight">' +
                  '<span class="custom-theme-row-label">Color de acento</span>' +
                  '<button type="button" class="outline-btn custom-theme-pick-btn" data-theme-visual-action="pick-accent" data-theme-color-field="accent" style="--pick-swatch:' + escapeHtml(defaultCustom.accent) + '">Elegir color</button>' +
                '</div>' +
                '<p class="personalize-hint personalize-theme-block-hint">Badges, precios destacados y estados como Reservado.</p>' +
                renderThemeDivider() +
                renderThemeGroupHeader('Botones') +
                renderButtonSection('Secundarios', 'surface', 'pick-surface', defaultCustom.surface, 'button', 'border', 'Ver 360°, Explorar (hero), pestañas del footer, Calcular cuota y Ver planos.') +
                renderButtonSection('Principal (CTA)', 'heroSurface', 'pick-hero-surface', defaultCustom.heroSurface || defaultCustom.accent || defaultCustom.surface, 'hero-button', 'hero-border', 'Ingresar, Continuar y acciones principales de cada pantalla.') +
                renderThemeDivider() +
                renderThemeGroupHeader('Detalle visual') +
                '<div class="custom-theme-row custom-theme-row--tight">' +
                  '<span class="custom-theme-row-label">Sombras</span>' +
                  '<div class="custom-theme-text-toggle custom-theme-glass-toggle" data-glass-field="shadow">' +
                    renderShadowModeButtons() +
                  '</div>' +
                '</div>' +
                '<div class="custom-theme-section custom-theme-section--plain">' +
                  '<div class="custom-theme-section-body">' +
                '<div class="custom-theme-row">' +
                  '<span class="custom-theme-row-label">Profundidad visual</span>' +
                  '<div class="custom-theme-text-toggle custom-theme-depth-toggle">' +
                    '<button type="button" class="custom-theme-depth-btn" data-depth-mode="low" data-theme-visual-action="depth-low">Baja</button>' +
                    '<button type="button" class="custom-theme-depth-btn selected" data-depth-mode="medium" data-theme-visual-action="depth-medium">Media</button>' +
                    '<button type="button" class="custom-theme-depth-btn" data-depth-mode="high" data-theme-visual-action="depth-high">Alta</button>' +
                  '</div>' +
                '</div>' +
                '<div class="custom-theme-row">' +
                  '<span class="custom-theme-row-label">Texto</span>' +
                  '<div class="custom-theme-text-toggle">' +
                    '<button type="button" class="custom-theme-text-btn selected" data-text-mode="light" data-theme-visual-action="text-light">Claro</button>' +
                    '<button type="button" class="custom-theme-text-btn" data-text-mode="dark" data-theme-visual-action="text-dark">Oscuro</button>' +
                  '</div>' +
                '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<p class="personalize-hint" id="customThemeMessage"></p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="personalize-block glass-surface" id="misTemasBlock">' +
          '<div class="personalize-block-label">Mis temas</div>' +
          '<div class="personalize-block-body" id="misTemasList">' +
            '<p class="personalize-hint">Cargando tus temas...</p>' +
          '</div>' +
          '<p class="personalize-hint" id="misTemasMessage"></p>' +
        '</div>' +

        '<div class="personalize-block glass-surface">' +
          '<div class="personalize-block-label">Sonido</div>' +
          '<div class="personalize-block-body">' +
            '<div class="custom-toggle-row personalize-toggle-row">' +
              '<span class="custom-toggle-row-label">Sonidos de la interfaz</span>' +
              '<div class="toggle-switch" id="personalizeSoundsToggle"><div class="toggle-switch-knob"></div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="personalize-block glass-surface">' +
          '<div class="personalize-block-label">Preferencias</div>' +
          '<div class="personalize-block-body">' +
            '<label class="personalize-field">' +
              '<span>Nombre visible</span>' +
              '<input type="text" id="personalizeDisplayName" maxlength="60" value="' + escapeHtml(displayName) + '">' +
            '</label>' +
            '<div class="personalize-readonly-field">' +
              '<span>Usuario</span>' +
              '<strong>@' + escapeHtml(username) + '</strong>' +
            '</div>' +
            '<div class="personalize-readonly-field">' +
              '<span>Email</span>' +
              '<strong class="personalize-email-value">' + escapeHtml(email || 'No disponible') + '</strong>' +
            '</div>' +
            '<div class="personalize-readonly-field">' +
              '<span>Método de acceso</span>' +
              '<strong>' + escapeHtml(
                typeof VisitorAuth !== 'undefined' && typeof VisitorAuth.getAuthMethodLabel === 'function'
                  ? VisitorAuth.getAuthMethodLabel(VisitorAuth.getUser())
                  : '—'
              ) + '</strong>' +
            '</div>' +
            '<button type="button" class="outline-btn personalize-save-btn" id="personalizeSaveIdentityBtn">Guardar cambios</button>' +
            '<p class="personalize-hint" id="personalizeIdentityMessage"></p>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindAvatarColorModes();
    bindPresetThemeGrid();
    renderPresetThemeGrid();
    bindCustomThemeEditor();
    bindMisTemasPanel();
    bindProjectThemeConfirmModal();
    bindOfficialPresetDeleteModal();
    if (typeof ThemeAIModal !== 'undefined') ThemeAIModal.init();
    refreshMisTemasList();
    bindSoundsToggle();
    bindEditorSessionPersistence();
    syncThemeEditorNavControls();

    document.getElementById('personalizeDisplayName').addEventListener('input', function (e) {
      VisitorPersonalization.setDisplayName(e.target.value, false);
    });

    document.getElementById('personalizeSaveIdentityBtn').addEventListener('click', async function () {
      var btn = document.getElementById('personalizeSaveIdentityBtn');
      var name = document.getElementById('personalizeDisplayName').value.trim();
      if (!name) {
        setMessage('personalizeIdentityMessage', 'Ingresa un nombre visible.', true);
        return;
      }
      btn.disabled = true;
      try {
        await VisitorPersonalization.saveIdentity(name);
        setMessage('personalizeIdentityMessage', 'Cambios guardados.', false);
      } catch (err) {
        setMessage('personalizeIdentityMessage', err.message || 'No se pudo guardar.', true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function setMessage(id, text, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'personalize-hint' + (text ? (isError ? ' is-error' : ' is-success') : '');
  }

  function refreshThemePicker() {
    renderPresetThemeGrid();
  }

  bindEditorSessionPersistence();

  return {
    render: render,
    updatePreview: updatePreview,
    refreshMisTemasList: refreshMisTemasList,
    upsertSavedThemeInCache: upsertSavedThemeInCache,
    refreshThemePicker: refreshThemePicker,
    closeProjectThemeConfirm: closeProjectThemeConfirm,
    closeOfficialPresetDeleteConfirm: closeOfficialPresetDeleteConfirm,
    dismissThemeEditorLayer: dismissThemeEditorLayer,
    resetThemeEditorOnLeave: resetThemeEditorOnLeave,
    isThemeEditorOpen: isThemeEditorOpen,
    isColorPopoverOpen: isColorPopoverOpen,
    isOnPersonalizarPanel: isOnPersonalizarPanel,
    handlePersonalizeEscape: handlePersonalizeEscape,
    isEditorSessionLocked: isEditorSessionLocked,
    hasPendingEditorSession: hasPendingEditorSession,
    shouldRestoreEditorSession: shouldRestoreEditorSession,
    restoreEditorSessionState: restoreEditorSessionState,
    saveEditorSessionState: saveEditorSessionState,
    clearEditorSessionState: clearEditorSessionState
  };
})();
