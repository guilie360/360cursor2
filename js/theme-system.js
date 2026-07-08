/* Global theme system — affects entire platform via CSS variables */
var ThemeSystem = (function () {
  var STORAGE_KEY = 'guilie_theme_settings';
  var DEFAULT_KEY = 'classic';

  var LEGACY_THEME_KEYS = {
    sunset: 'terracota',
    slate: 'grafito'
  };

  var THEMES = {
    classic: {
      name: 'Classic',
      bg: '#111111',
      text: '#ffffff',
      textSecondary: '#9a9a9a',
      accent: '#8f1d1d',
      surface: '#171717',
      panel: '#171717',
      button: '#1d1d1d',
      hover: '#252525',
      border: '#2a2a2a',
      scrollbarThumb: '#333333',
      scrollbarTrack: '#111111',
      swatchAccent: '#8f1d1d'
    },
    negro: {
      name: 'Negro',
      bg: '#000000',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#808080',
      surface: '#0a0a0a',
      panel: '#0c0c0c',
      button: '#111111',
      hover: '#1a1a1a',
      border: '#222222',
      scrollbarThumb: '#2a2a2a',
      scrollbarTrack: '#000000',
      swatchAccent: '#666666'
    },
    minimal: {
      name: 'Blanco',
      bg: '#f0f0f2',
      text: '#181818',
      textSecondary: '#505050',
      accent: '#a8a8ae',
      surface: '#e6e6e8',
      panel: '#e0e0e2',
      button: '#d8d8da',
      hover: '#cccbd0',
      border: '#bcbbc0',
      scrollbarThumb: '#b4b3b8',
      scrollbarTrack: '#f0f0f2',
      swatchAccent: '#a8a8ae'
    },
    arena: {
      name: 'Arena',
      bg: '#d4cabb',
      text: '#2c2824',
      textSecondary: '#2c2824',
      accent: '#877961',
      surface: '#c9bfb0',
      panel: '#c2b8a9',
      button: '#b8ae9f',
      hover: '#afa598',
      border: '#9d9284',
      scrollbarThumb: '#9d9284',
      scrollbarTrack: '#d4cabb',
      swatchAccent: '#756958'
    },
    grafito: {
      name: 'Grafito',
      bg: '#121315',
      text: '#eceef1',
      textSecondary: '#9ca0a8',
      accent: '#7a818c',
      surface: '#1a1c20',
      panel: '#1e2024',
      button: '#23262b',
      hover: '#2a2e34',
      border: '#343840',
      scrollbarThumb: '#343840',
      scrollbarTrack: '#121315',
      swatchAccent: '#5c636e'
    },
    terracota: {
      name: 'Terracota',
      bg: '#231610',
      text: '#fff3eb',
      textSecondary: '#c9b5a8',
      accent: '#c75a38',
      surface: '#2c1c14',
      panel: '#322018',
      button: '#3a251c',
      hover: '#442c22',
      border: '#553528',
      scrollbarThumb: '#553528',
      scrollbarTrack: '#231610',
      swatchAccent: '#c75a38'
    },
    forest: {
      name: 'Bosque',
      bg: '#0b1c12',
      text: '#ffffff',
      textSecondary: '#a8c4b0',
      accent: '#4fae6d',
      surface: '#122419',
      panel: '#152a1d',
      button: '#1a3223',
      hover: '#1f3a28',
      border: '#2a4a35',
      scrollbarThumb: '#2a4a35',
      scrollbarTrack: '#0b1c12',
      swatchAccent: '#4fae6d'
    },
    midnight: {
      name: 'Océano',
      bg: '#061820',
      text: '#e8f4f8',
      textSecondary: '#8eb4c0',
      accent: '#2a8fad',
      surface: '#0a222c',
      panel: '#0e2834',
      button: '#122e3c',
      hover: '#163646',
      border: '#1f4558',
      scrollbarThumb: '#1f4558',
      scrollbarTrack: '#061820',
      swatchAccent: '#2a8fad'
    },
    cian: {
      name: 'Cian',
      bg: '#080e14',
      text: '#eef6fa',
      textSecondary: '#8aacb8',
      accent: '#14c4d4',
      surface: '#0c151c',
      panel: '#101a22',
      button: '#142028',
      hover: '#182630',
      border: '#1e323e',
      scrollbarThumb: '#1e323e',
      scrollbarTrack: '#080e14',
      swatchAccent: '#14c4d4'
    },
    rojomate: {
      name: 'Rojo Mate',
      bg: '#1a0c0c',
      text: '#f7f4f2',
      textSecondary: '#c4a8a0',
      accent: '#6b2222',
      surface: '#221010',
      panel: '#281212',
      button: '#2e1515',
      hover: '#361818',
      border: '#4a2222',
      scrollbarThumb: '#4a2222',
      scrollbarTrack: '#1a0c0c',
      swatchAccent: '#6b2222'
    },
    signatureblack: {
      name: 'Signature Black',
      bg: '#000000',
      text: '#ffffff',
      textSecondary: '#999999',
      accent: '#8f1d1d',
      surface: '#050505',
      panel: '#080808',
      button: '#0c0c0c',
      hover: '#141414',
      border: '#1a1a1a',
      scrollbarThumb: '#222222',
      scrollbarTrack: '#000000',
      swatchAccent: '#8f1d1d'
    },
    signaturered: {
      name: 'Signature Red',
      bg: '#2a0e0e',
      text: '#ffffff',
      textSecondary: '#d4b8b8',
      accent: '#0a0a0a',
      surface: '#220b0b',
      panel: '#1e0909',
      button: '#180707',
      hover: '#2f1010',
      border: '#3a1212',
      scrollbarThumb: '#3a1212',
      scrollbarTrack: '#2a0e0e',
      swatchAccent: '#0a0a0a',
      swatchBg: '#2a0e0e'
    },
    purewhite: {
      name: 'Pure White',
      bg: '#ffffff',
      text: '#2c2c2c',
      textSecondary: '#505050',
      accent: '#b0b0b0',
      surface: '#f7f7f7',
      panel: '#fafafa',
      button: '#ececec',
      hover: '#e4e4e4',
      border: '#e8e8e8',
      scrollbarThumb: '#d8d8d8',
      scrollbarTrack: '#ffffff',
      swatchAccent: '#c8c8c8',
      glassShadow: '0 6px 22px color-mix(in srgb, #000000 5%, transparent)',
      glassPanel: 'color-mix(in srgb, #fafafa 88%, transparent)'
    },
    carbon: {
      name: 'Carbon',
      bg: '#0c0c0e',
      text: '#ffffff',
      textSecondary: '#9a9ca3',
      accent: '#8b8d94',
      surface: '#141416',
      panel: '#18181b',
      button: '#1c1c20',
      hover: '#222226',
      border: '#26262a',
      scrollbarThumb: '#2a2a2e',
      scrollbarTrack: '#0c0c0e',
      swatchAccent: '#6e7078',
      swatchBg: '#101012'
    },
    copper: {
      name: 'Copper',
      bg: '#1a1410',
      text: '#f5ebe0',
      textSecondary: '#c9b8a8',
      accent: '#b8734a',
      surface: '#3d2e26',
      panel: '#352820',
      button: '#4a3830',
      hover: '#544038',
      border: '#6b5548',
      scrollbarThumb: '#6b5548',
      scrollbarTrack: '#1a1410',
      swatchAccent: '#b8734a',
      swatchBg: '#2a2018'
    }
  };

  var CUSTOM_THEME_KEY = 'custom';
  var DEFAULT_CUSTOM_THEME = {
    bg: '#111111',
    menuColor: '#1a1a1a',
    surface: '#1d1d1d',
    accent: '#8f1d1d',
    textMode: 'light',
    bgTextMode: 'light',
    visualDepth: 'medium',
    bgGlass: 'soft',
    panelGlass: 'solid',
    buttonGlass: 'solid',
    borderGlass: 'solid',
    shadowGlass: 'soft',
    heroSurface: '#1d1d1d',
    heroButtonGlass: 'solid',
    heroBorderGlass: 'solid'
  };

  var PANEL_GLASS_PRESETS = {
    solid: {
      panelOpacity: 96,
      surfaceOpacity: 92,
      blur: 8,
      modalBlur: 12
    },
    soft: {
      panelOpacity: 62,
      surfaceOpacity: 72,
      blur: 16,
      modalBlur: 18
    },
    glass: {
      panelOpacity: 38,
      surfaceOpacity: 48,
      blur: 24,
      modalBlur: 26
    }
  };

  var BACKDROP_MASK_PRESETS = {
    solid: { v94: 94, v90: 90, v75: 75, v55: 55, blur: 0 },
    soft: { v94: 70, v90: 58, v75: 46, v55: 34, blur: 8 },
    glass: { v94: 48, v90: 38, v75: 30, v55: 22, blur: 14 }
  };

  var BUTTON_GLASS_PRESETS = {
    solid: { surfaceOpacity: 100, blur: 0 },
    soft: { surfaceOpacity: 46, blur: 14 },
    glass: { surfaceOpacity: 12, blur: 20 }
  };

  var HERO_BUTTON_GLASS_PRESETS = {
    solid: { surfaceOpacity: 100, accentOpacity: 100, blur: 4 },
    soft: { surfaceOpacity: 42, accentOpacity: 28, blur: 12 },
    glass: { surfaceOpacity: 18, accentOpacity: 14, blur: 16 }
  };

  var SHADOW_PRESETS = {
    off: {
      glass: 'none',
      btn: 'none',
      modal: 'none',
      inset: 'none'
    },
    solid: {
      glass: '0 16px 52px rgba(0, 0, 0, 0.52)',
      btn: '0 10px 32px rgba(0, 0, 0, 0.42)',
      modal: '0 32px 88px rgba(0, 0, 0, 0.72)',
      inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
    },
    soft: {
      glass: '0 10px 36px rgba(0, 0, 0, 0.34)',
      btn: '0 6px 20px rgba(0, 0, 0, 0.28)',
      modal: '0 24px 70px rgba(0, 0, 0, 0.55)',
      inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
    },
    glass: {
      glass: '0 4px 16px rgba(0, 0, 0, 0.12)',
      btn: '0 4px 12px rgba(0, 0, 0, 0.1)',
      modal: '0 12px 32px rgba(0, 0, 0, 0.22)',
      inset: 'none'
    }
  };

  var VISUAL_DEPTH_PRESETS = {
    low: {
      vignetteEdge: 0.05,
      vignetteInner: 68,
      heroBottom: 0.06,
      heroMid: 0.015,
      heroTop: 0.04,
      menuInset: 1
    },
    medium: {
      vignetteEdge: 0.21,
      vignetteInner: 52,
      heroBottom: 0.28,
      heroMid: 0.065,
      heroTop: 0.18,
      menuInset: 3
    },
    high: {
      vignetteEdge: 0.60,
      vignetteInner: 38,
      heroBottom: 0.79,
      heroMid: 0.19,
      heroTop: 0.51,
      menuInset: 9
    }
  };

  var state = { themeKey: DEFAULT_KEY, customTheme: null };
  var customPreviewConfig = null;
  var editorRevertKey = null;

  function normalizeHex(hex) {
    var h = String(hex || '').trim();
    if (!h) return '#000000';
    if (h.charAt(0) !== '#') h = '#' + h;
    if (h.length === 4) {
      h = '#' + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) + h.charAt(3) + h.charAt(3);
    }
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : '#000000';
  }

  function hexToRgb(hex) {
    hex = normalizeHex(hex);
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

  function mixHex(a, b, amount) {
    var c1 = hexToRgb(a);
    var c2 = hexToRgb(b);
    var t = Math.max(0, Math.min(1, amount / 100));
    return rgbToHex(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  function relativeLuminance(hex) {
    var c = hexToRgb(hex);
    function channel(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function contrastRatio(a, b) {
    var l1 = relativeLuminance(a);
    var l2 = relativeLuminance(b);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function derivePanelFromBg(bg, textMode) {
    var tint = textMode === 'dark' ? '#000000' : '#ffffff';
    return mixHex(bg, tint, 14);
  }

  function deriveBorderFromBg(bg, textMode) {
    var tint = textMode === 'dark' ? '#000000' : '#ffffff';
    return mixHex(bg, tint, 24);
  }

  function buildCustomTheme(config) {
    var bg = normalizeHex(config.bg);
    var menuColor = normalizeHex(config.menuColor || config.panelColor || derivePanelFromBg(bg, config.textMode === 'dark' ? 'dark' : 'light'));
    var surface = normalizeHex(config.surface);
    var accent = normalizeHex(config.accent);
    var textMode = config.textMode === 'dark' ? 'dark' : 'light';
    var text = textMode === 'light' ? '#f7f7f7' : '#1a1a1a';
    var textSecondary = textMode === 'light' ? '#c8c8c8' : '#505050';
    var panel = menuColor;
    var button = surface;
    var hoverTint = textMode === 'dark' ? '#000000' : '#ffffff';
    var hover = mixHex(button, hoverTint, 14);
    var border = deriveBorderFromBg(bg, textMode);

    if (contrastRatio(bg, text) < 4.5) {
      text = textMode === 'light' ? '#ffffff' : '#111111';
    }

    return {
      name: 'Mi tema',
      bg: bg,
      menuColor: menuColor,
      text: text,
      textSecondary: textSecondary,
      accent: accent,
      surface: surface,
      panel: panel,
      button: button,
      hover: hover,
      border: border,
      scrollbarThumb: mixHex(border, hoverTint, 18),
      scrollbarTrack: bg,
      swatchAccent: accent,
      swatchBg: bg,
      textMode: textMode,
      isCustom: true
    };
  }

  function getCustomThemeConfig() {
    if (customPreviewConfig) return customPreviewConfig;
    if (state.customTheme) return state.customTheme;
    if (typeof VisitorPersonalization !== 'undefined' &&
        typeof VisitorPersonalization.getCustomTheme === 'function') {
      var visitorTheme = VisitorPersonalization.getCustomTheme();
      if (visitorTheme) return visitorTheme;
    }
    var stored = readJSON(STORAGE_KEY, {});
    if (stored.customTheme) return stored.customTheme;
    return Object.assign({}, DEFAULT_CUSTOM_THEME);
  }

  function isCustomLightTheme(themeKey, t) {
    if (themeKey !== CUSTOM_THEME_KEY) return isLightTheme(themeKey);
    return t.textMode === 'dark' || relativeLuminance(t.bg) > 0.58;
  }

  function normalizeVisualDepth(value) {
    if (value === 'low' || value === 'high') return value;
    return 'medium';
  }

  function normalizePanelGlass(value) {
    if (value === 'solid' || value === 'soft' || value === 'glass') return value;
    return 'solid';
  }

  function normalizeShadowGlass(value) {
    if (value === 'off') return 'soft';
    if (value === 'solid' || value === 'soft' || value === 'glass') return value;
    return 'soft';
  }

  function getActiveButtonGlass() {
    if (customPreviewConfig) {
      return normalizePanelGlass(customPreviewConfig.buttonGlass || 'solid');
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.buttonGlass) {
      return normalizePanelGlass(state.customTheme.buttonGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizePanelGlass(getCustomThemeConfig().buttonGlass);
    }
    return 'solid';
  }

  function getActiveHeroButtonGlass() {
    if (customPreviewConfig && customPreviewConfig.heroButtonGlass) {
      return normalizePanelGlass(customPreviewConfig.heroButtonGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.heroButtonGlass) {
      return normalizePanelGlass(state.customTheme.heroButtonGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizePanelGlass(getCustomThemeConfig().heroButtonGlass);
    }
    return 'solid';
  }

  function getActiveHeroBorderGlass() {
    if (customPreviewConfig && customPreviewConfig.heroBorderGlass) {
      return normalizePanelGlass(customPreviewConfig.heroBorderGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.heroBorderGlass) {
      return normalizePanelGlass(state.customTheme.heroBorderGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizePanelGlass(getCustomThemeConfig().heroBorderGlass);
    }
    return 'solid';
  }

  function getActiveBorderGlass() {
    if (customPreviewConfig && customPreviewConfig.borderGlass) {
      return normalizePanelGlass(customPreviewConfig.borderGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.borderGlass) {
      return normalizePanelGlass(state.customTheme.borderGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizePanelGlass(getCustomThemeConfig().borderGlass);
    }
    return 'solid';
  }

  function getActivePanelGlass() {
    if (customPreviewConfig && customPreviewConfig.panelGlass) {
      return normalizePanelGlass(customPreviewConfig.panelGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.panelGlass) {
      return normalizePanelGlass(state.customTheme.panelGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizePanelGlass(getCustomThemeConfig().panelGlass);
    }
    return 'soft';
  }

  function getActiveBgGlass() {
    if (customPreviewConfig && customPreviewConfig.bgGlass) {
      return normalizePanelGlass(customPreviewConfig.bgGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.bgGlass) {
      return normalizePanelGlass(state.customTheme.bgGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      var cfg = getCustomThemeConfig();
      return normalizePanelGlass(cfg.bgGlass || cfg.panelGlass);
    }
    return 'soft';
  }

  function getActiveShadowGlass() {
    if (customPreviewConfig && customPreviewConfig.shadowGlass) {
      return normalizeShadowGlass(customPreviewConfig.shadowGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.shadowGlass) {
      return normalizeShadowGlass(state.customTheme.shadowGlass);
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      return normalizeShadowGlass(getCustomThemeConfig().shadowGlass);
    }
    return 'soft';
  }

  function getActiveVisualDepth() {
    if (customPreviewConfig && customPreviewConfig.visualDepth) {
      return normalizeVisualDepth(customPreviewConfig.visualDepth);
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme) {
      return normalizeVisualDepth(state.customTheme.visualDepth);
    }
    return 'medium';
  }

  function applyVisualDepth(level) {
    level = normalizeVisualDepth(level);
    var preset = VISUAL_DEPTH_PRESETS[level] || VISUAL_DEPTH_PRESETS.medium;
    var root = document.documentElement.style;

    root.setProperty('--depth-vignette-edge', String(preset.vignetteEdge));
    root.setProperty('--depth-vignette-inner', preset.vignetteInner + '%');
    root.setProperty('--depth-hero-bottom', String(preset.heroBottom));
    root.setProperty('--depth-hero-mid', String(preset.heroMid));
    root.setProperty('--depth-hero-top', String(preset.heroTop));
    root.setProperty('--depth-menu-inset', String(preset.menuInset));
    document.body.setAttribute('data-visual-depth', level);
    return level;
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function getTheme(key) {
    if (key === CUSTOM_THEME_KEY) {
      return buildCustomTheme(getCustomThemeConfig());
    }
    return THEMES[key] || THEMES[DEFAULT_KEY];
  }

  function isLightTheme(themeKey) {
    if (themeKey === CUSTOM_THEME_KEY) {
      return isCustomLightTheme(themeKey, getTheme(CUSTOM_THEME_KEY));
    }
    return themeKey === 'minimal' || themeKey === 'arena' || themeKey === 'purewhite';
  }

  function applyContrastVars(root, themeKey, t) {
    var secondary = t.textSecondary || t.text;
    var isLight = isLightTheme(themeKey);

    root.setProperty('--text-secondary', secondary);
    root.setProperty('--text-muted', secondary);

    if (themeKey === 'arena') {
      root.setProperty('--text-secondary-opacity', '0.88');
      root.setProperty('--text-muted-opacity', '0.58');
      root.setProperty('--icon-color', t.text);
      root.setProperty('--label-opacity', '0.68');
      return;
    }
    if (themeKey === 'purewhite') {
      root.setProperty('--text-secondary-opacity', '0.84');
      root.setProperty('--text-muted-opacity', '0.64');
      root.setProperty('--icon-color', t.text);
      root.setProperty('--label-opacity', '0.74');
      return;
    }
    if (themeKey === CUSTOM_THEME_KEY) {
      root.setProperty('--text-secondary-opacity', t.textMode === 'dark' ? '0.82' : '0.78');
      root.setProperty('--text-muted-opacity', t.textMode === 'dark' ? '0.62' : '0.52');
      root.setProperty('--icon-color', t.text);
      root.setProperty('--label-opacity', t.textMode === 'dark' ? '0.72' : '0.55');
      return;
    }
    if (isLight) {
      root.setProperty('--text-secondary-opacity', '0.82');
      root.setProperty('--text-muted-opacity', '0.62');
      root.setProperty('--icon-color', t.text);
      root.setProperty('--label-opacity', '0.72');
      return;
    }
    root.setProperty('--text-secondary-opacity', '0.78');
    root.setProperty('--text-muted-opacity', '0.52');
    root.setProperty('--icon-color', '#ffffff');
    root.setProperty('--label-opacity', '0.55');
  }

  function applyButtonGlass(root, level, t) {
    level = normalizePanelGlass(level);
    var uiPreset = BUTTON_GLASS_PRESETS[level] || BUTTON_GLASS_PRESETS.solid;
    var button = t.button || t.surface || t.bg;

    var btnBg = level === 'solid' || uiPreset.surfaceOpacity >= 100
      ? button
      : 'color-mix(in srgb, ' + button + ' ' + uiPreset.surfaceOpacity + '%, transparent)';

    root.setProperty('--btn-glass-surface', btnBg);
    root.setProperty('--btn-glass-blur', uiPreset.blur + 'px');
    var hoverBase = t.hover || button;
    var btnHover = hoverBase;
    if (level === 'glass') {
      btnHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 14, 42) + '%, transparent)';
    } else if (level === 'soft') {
      btnHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 22, 78) + '%, transparent)';
    }
    root.setProperty('--btn-glass-hover', btnHover);
    if (document.body) {
      document.body.setAttribute('data-button-glass', level);
    }
    return level;
  }

  function applyHeroButtonGlass(root, level, cfg, t) {
    level = normalizePanelGlass(level);
    var heroPreset = HERO_BUTTON_GLASS_PRESETS[level] || HERO_BUTTON_GLASS_PRESETS.solid;
    var heroColor = normalizeHex(cfg.heroSurface) || t.surface || t.button || t.bg;
    var textMode = t.textMode === 'dark' ? 'dark' : 'light';
    var hoverTint = textMode === 'dark' ? '#000000' : '#ffffff';
    var heroHover = mixHex(heroColor, hoverTint, 14);

    var heroBg = heroColor;
    if (level === 'glass') {
      heroBg = 'color-mix(in srgb, ' + heroColor + ' ' + heroPreset.surfaceOpacity + '%, transparent)';
      heroHover = 'color-mix(in srgb, ' + heroColor + ' ' + Math.min(heroPreset.surfaceOpacity + 8, 36) + '%, transparent)';
    } else if (level === 'soft') {
      heroBg = 'color-mix(in srgb, ' + heroColor + ' ' + heroPreset.surfaceOpacity + '%, transparent)';
      heroHover = 'color-mix(in srgb, ' + heroColor + ' ' + Math.min(heroPreset.surfaceOpacity + 14, 72) + '%, transparent)';
    }

    root.setProperty('--hero-btn-bg', heroBg);
    root.setProperty('--hero-btn-bg-hover', heroHover);
    root.setProperty('--hero-btn-blur', heroPreset.blur + 'px');
    if (document.body) {
      document.body.setAttribute('data-hero-button-glass', level);
    }
    return level;
  }

  function applyHeroBorderGlass(root, level, cfg, t) {
    level = normalizePanelGlass(level);
    var heroColor = normalizeHex(cfg.heroSurface) || t.surface || t.button || t.bg;
    var menuTone = t.menuColor || t.panel || t.surface || t.button || t.bg;
    var border = mixHex(menuTone, heroColor, 58);
    var borderValue = border;
    if (level === 'soft') {
      borderValue = 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    } else if (level === 'glass') {
      borderValue = 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }

    root.setProperty('--hero-btn-border', borderValue);
    if (document.body) {
      document.body.setAttribute('data-hero-border-glass', level);
    }
    return level;
  }

  function getHeroStyleConfig(t) {
    var raw = customPreviewConfig || (state.themeKey === CUSTOM_THEME_KEY ? state.customTheme : null);
    if (!raw) {
      return {
        heroSurface: t.surface,
        bg: t.bg
      };
    }
    return {
      heroSurface: normalizeHex(raw.heroSurface || raw.surface),
      bg: normalizeHex(raw.bg)
    };
  }

  function mixBorderGlass(level, border) {
    level = normalizePanelGlass(level);
    if (level === 'soft') {
      return 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    }
    if (level === 'glass') {
      return 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }
    return border;
  }

  function deriveUiBorderColor(t) {
    if (t.isCustom) {
      return t.border || deriveBorderFromBg(t.bg, t.textMode === 'dark' ? 'dark' : 'light');
    }
    return t.border || t.hover || t.button || t.surface || t.bg;
  }

  function deriveButtonBorderColor(t) {
    var button = t.button || t.surface || t.bg;
    var text = t.text || '#ffffff';
    var textMode = t.textMode === 'dark' ? 'dark' : 'light';
    if (t.isCustom) {
      if (contrastRatio(button, text) < 3) {
        return mixHex(button, text, textMode === 'light' ? 22 : 18);
      }
      return mixHex(button, textMode === 'dark' ? '#000000' : '#ffffff', textMode === 'dark' ? 24 : 20);
    }
    return t.border || t.hover || button;
  }

  function applyMenuBorderGlass(root, level, t) {
    level = normalizePanelGlass(level);
    var border = deriveUiBorderColor(t);
    var borderValue = mixBorderGlass(level, border);

    root.setProperty('--border', borderValue);
    root.setProperty('--glass-border', borderValue);
    root.setProperty('--glass-border-lit', 'color-mix(in srgb, ' + borderValue + ' 68%, ' + t.text + ')');
    if (document.body) {
      document.body.setAttribute('data-panel-border-glass', level);
    }
    return level;
  }

  function applyButtonBorderGlass(root, level, t) {
    level = normalizePanelGlass(level);
    var borderValue = mixBorderGlass(level, deriveButtonBorderColor(t));

    root.setProperty('--btn-border', borderValue);
    if (document.body) {
      document.body.setAttribute('data-button-border-glass', level);
    }
    return level;
  }

  function applyBorderGlass(root, level, t) {
    applyMenuBorderGlass(root, level, t);
    applyButtonBorderGlass(root, level, t);
    if (document.body) {
      document.body.setAttribute('data-border-glass', level);
    }
    return level;
  }

  function applyMenuPanelGlass(root, level, t) {
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    var panelColor = t.menuColor || t.panel || t.bg;
    var panelBg = 'color-mix(in srgb, ' + panelColor + ' ' + preset.panelOpacity + '%, transparent)';

    root.setProperty('--glass-panel', panelBg);
    root.setProperty('--menu-glass-blur', preset.blur + 'px');
    if (document.body) {
      document.body.setAttribute('data-panel-glass', level);
    }
    return level;
  }

  function applyBackdropMask(root, level, bgColor) {
    level = normalizePanelGlass(level);
    var mask = BACKDROP_MASK_PRESETS[level] || BACKDROP_MASK_PRESETS.soft;
    root.setProperty('--modal-backdrop', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v94 + '%, transparent)');
    root.setProperty('--backdrop-94', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v94 + '%, transparent)');
    root.setProperty('--backdrop-90', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v90 + '%, transparent)');
    root.setProperty('--backdrop-75', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v75 + '%, transparent)');
    root.setProperty('--backdrop-55', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v55 + '%, transparent)');
    root.setProperty('--modal-backdrop-blur', mask.blur + 'px');
  }

  function resolveBgGlassSurfaces(level, bgColor) {
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    if (level === 'solid') {
      return {
        popupBg: bgColor,
        surfaceBg: bgColor,
        blur: 0,
        modalBlur: 0
      };
    }
    return {
      popupBg: 'color-mix(in srgb, ' + bgColor + ' ' + preset.panelOpacity + '%, transparent)',
      surfaceBg: 'color-mix(in srgb, ' + bgColor + ' ' + preset.surfaceOpacity + '%, transparent)',
      blur: preset.blur,
      modalBlur: preset.modalBlur
    };
  }

  function applyBgGlass(root, level, t) {
    level = normalizePanelGlass(level);
    var surfaces = resolveBgGlassSurfaces(level, t.bg);

    root.setProperty('--bg-popup', surfaces.popupBg);
    root.setProperty('--panel-glass-surface', surfaces.surfaceBg);
    root.setProperty('--bg-glass-surface', surfaces.surfaceBg);
    root.setProperty('--panel-modal-blur', surfaces.modalBlur + 'px');
    root.setProperty('--bg-glass-blur', surfaces.blur + 'px');
    if (t.isCustom) {
      root.setProperty('--glass-surface', surfaces.surfaceBg);
      root.setProperty('--bg-card', surfaces.surfaceBg);
    }
    if (document.body) {
      document.body.setAttribute('data-bg-glass', level);
    }
    return level;
  }

  function applyPanelGlass(root, level, t) {
    if (t.isCustom) {
      applyMenuPanelGlass(root, level, t);
      return level;
    }
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    var panelColor = t.panel || t.bg;
    var panelBg = 'color-mix(in srgb, ' + panelColor + ' ' + preset.panelOpacity + '%, transparent)';
    var panelSurface = 'color-mix(in srgb, ' + panelColor + ' ' + preset.surfaceOpacity + '%, transparent)';

    root.setProperty('--bg-popup', panelBg);
    root.setProperty('--glass-panel', panelBg);
    root.setProperty('--panel-glass-surface', panelSurface);
    root.setProperty('--bg-glass-surface', panelSurface);
    root.setProperty('--glass-blur', preset.blur + 'px');
    root.setProperty('--menu-glass-blur', preset.blur + 'px');
    root.setProperty('--bg-glass-blur', preset.blur + 'px');
    root.setProperty('--panel-modal-blur', preset.modalBlur + 'px');
    if (document.body) {
      document.body.setAttribute('data-panel-glass', level);
      document.body.setAttribute('data-bg-glass', level);
    }
    return level;
  }

  function applyShadowGlass(root, level) {
    level = normalizeShadowGlass(level);
    var preset = SHADOW_PRESETS[level] || SHADOW_PRESETS.soft;
    root.setProperty('--glass-shadow', preset.glass);
    root.setProperty('--btn-shadow', preset.btn);
    root.setProperty('--modal-shadow', preset.modal);
    root.setProperty('--glass-inset-shadow', preset.inset);
    if (document.body) {
      document.body.setAttribute('data-shadow-glass', level);
    }
    return level;
  }

  function getActiveBgTextMode() {
    if (customPreviewConfig && customPreviewConfig.bgTextMode) {
      return customPreviewConfig.bgTextMode === 'dark' ? 'dark' : 'light';
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme && state.customTheme.bgTextMode) {
      return state.customTheme.bgTextMode === 'dark' ? 'dark' : 'light';
    }
    if (state.themeKey === CUSTOM_THEME_KEY) {
      var cfg = getCustomThemeConfig();
      return cfg.bgTextMode === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  }

  function applyContainerText(root, textMode) {
    textMode = textMode === 'dark' ? 'dark' : 'light';
    root.setProperty('--container-text', textMode === 'light' ? '#f7f7f7' : '#1a1a1a');
    if (document.body) {
      document.body.setAttribute('data-container-text-mode', textMode);
    }
  }

  function resolvePageSurfaceColor(t) {
    if (t.isCustom) {
      return t.menuColor || t.panel || t.bg;
    }
    return t.bg;
  }

  function deriveMenuMaskColor(t) {
    return t.menuColor || t.panel || t.bg;
  }

  function applyMaterial(root, t) {
    var panel = t.panel || t.bg;
    var button = t.button || t.surface || panel;
    var hover = t.hover || button;
    var uiBorder = deriveUiBorderColor(t);
    var glassSurface = t.isCustom ? (t.bg || panel) : (t.surface || panel);

    if (!t.isCustom) {
      root.setProperty('--bg-card', glassSurface);
      root.setProperty('--glass-surface', glassSurface);
    }
    root.setProperty('--btn-surface', button);
    root.setProperty('--hover', hover);
    root.setProperty('--track-bg', hover);
    root.setProperty('--scrollbar-thumb', t.scrollbarThumb || uiBorder);
    root.setProperty('--placeholder-bg', button);
    root.setProperty('--placeholder-border', uiBorder);
    if (t.isCustom) {
      var panelGlassLevel = getActivePanelGlass();
      var bgGlassLevel = getActiveBgGlass();
      var fondoColor = t.bg || t.menuColor || t.panel;
      applyMenuPanelGlass(root, panelGlassLevel, t);
      applyBackdropMask(root, bgGlassLevel, fondoColor);
      applyBgGlass(root, bgGlassLevel, t);
      applyContainerText(root, getActiveBgTextMode());
      root.setProperty('--scrollbar-track', t.scrollbarTrack || t.bg);
    } else {
      var presetPanelGlass = getActivePanelGlass();
      applyPanelGlass(root, presetPanelGlass, t);
      applyBackdropMask(root, presetPanelGlass, t.panel || t.bg);
      root.setProperty('--scrollbar-track', t.scrollbarTrack || t.bg);
    }
    applyShadowGlass(root, getActiveShadowGlass());
    applyButtonGlass(root, getActiveButtonGlass(), t);
    applyMenuBorderGlass(root, getActivePanelGlass(), t);
    applyButtonBorderGlass(root, getActiveBorderGlass(), t);
    var heroCfg = getHeroStyleConfig(t);
    applyHeroButtonGlass(root, getActiveHeroButtonGlass(), heroCfg, t);
    applyHeroBorderGlass(root, getActiveHeroBorderGlass(), heroCfg, t);
  }

  function applyVars(themeKey) {
    var t = getTheme(themeKey);
    var root = document.documentElement.style;

    var pageBg = resolvePageSurfaceColor(t);

    root.setProperty('--bg-main', pageBg);
    root.setProperty('--text-primary', t.text);
    root.setProperty('--accent', t.accent);
    root.setProperty('--hero-bg', pageBg);
    root.setProperty('--hero-text', t.text);
    root.setProperty('--admin-bg', pageBg);
    root.setProperty('--admin-text', t.text);
    root.setProperty('--admin-accent', t.accent);
    root.setProperty('--admin-panel', t.panel || t.bg);

    applyMaterial(root, t);
    applyContrastVars(root, themeKey, t);

    document.body.classList.toggle('theme-light', isLightTheme(themeKey));
    document.body.dataset.theme = themeKey;
    return t;
  }

  function syncVisualDepthForTheme(themeKey) {
    if (themeKey === CUSTOM_THEME_KEY) {
      applyVisualDepth(getActiveVisualDepth());
      return;
    }
    applyVisualDepth('medium');
  }

  function resolveThemeKey(themeKey) {
    if (LEGACY_THEME_KEYS[themeKey]) return LEGACY_THEME_KEYS[themeKey];
    if (themeKey === CUSTOM_THEME_KEY) return CUSTOM_THEME_KEY;
    if (!THEMES[themeKey]) return DEFAULT_KEY;
    return themeKey;
  }

  function apply(themeKey, persist, customThemeData) {
    themeKey = resolveThemeKey(themeKey);
    if (themeKey === CUSTOM_THEME_KEY && customThemeData) {
      state.customTheme = {
        bg: normalizeHex(customThemeData.bg),
        menuColor: normalizeHex(customThemeData.menuColor || customThemeData.panelColor || customThemeData.bg),
        surface: normalizeHex(customThemeData.surface),
        accent: normalizeHex(customThemeData.accent),
      textMode: customThemeData.textMode === 'dark' ? 'dark' : 'light',
      bgTextMode: customThemeData.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: normalizeVisualDepth(customThemeData.visualDepth),
        bgGlass: normalizePanelGlass(customThemeData.bgGlass || customThemeData.panelGlass),
        panelGlass: normalizePanelGlass(customThemeData.panelGlass),
        buttonGlass: normalizePanelGlass(customThemeData.buttonGlass),
        borderGlass: normalizePanelGlass(customThemeData.borderGlass),
        shadowGlass: normalizeShadowGlass(customThemeData.shadowGlass),
        heroSurface: normalizeHex(customThemeData.heroSurface || customThemeData.surface),
        heroButtonGlass: normalizePanelGlass(customThemeData.heroButtonGlass || customThemeData.buttonGlass),
        heroBorderGlass: normalizePanelGlass(customThemeData.heroBorderGlass || customThemeData.borderGlass)
      };
    }
    customPreviewConfig = null;
    state.themeKey = themeKey;
    applyVars(themeKey);
    syncVisualDepthForTheme(themeKey);
    if (persist) {
      var stored = readJSON(STORAGE_KEY, { themeKey: state.themeKey });
      stored.themeKey = state.themeKey;
      stored.customTheme = state.themeKey === CUSTOM_THEME_KEY ? state.customTheme : null;
      writeJSON(STORAGE_KEY, stored);
    }
    if (typeof window.onThemeChanged === 'function') {
      window.onThemeChanged(themeKey);
    }
    return themeKey;
  }

  function previewCustomTheme(config) {
    customPreviewConfig = {
      bg: normalizeHex(config.bg),
      menuColor: normalizeHex(config.menuColor || config.panelColor || config.bg),
      surface: normalizeHex(config.surface),
      accent: normalizeHex(config.accent),
      textMode: config.textMode === 'dark' ? 'dark' : 'light',
      bgTextMode: config.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: normalizeVisualDepth(config.visualDepth),
      bgGlass: normalizePanelGlass(config.bgGlass || config.panelGlass),
      panelGlass: normalizePanelGlass(config.panelGlass),
      buttonGlass: normalizePanelGlass(config.buttonGlass),
      borderGlass: normalizePanelGlass(config.borderGlass),
      shadowGlass: normalizeShadowGlass(config.shadowGlass),
      heroSurface: normalizeHex(config.heroSurface || config.surface),
      heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
      heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass)
    };
    applyVars(CUSTOM_THEME_KEY);
    applyVisualDepth(customPreviewConfig.visualDepth);
    document.body.dataset.theme = CUSTOM_THEME_KEY;
    document.body.classList.toggle('theme-light', isCustomLightTheme(CUSTOM_THEME_KEY, getTheme(CUSTOM_THEME_KEY)));
    if (typeof window.onThemeChanged === 'function') {
      window.onThemeChanged(CUSTOM_THEME_KEY);
    }
  }

  function beginCustomEditor() {
    editorRevertKey = state.themeKey;
    customPreviewConfig = Object.assign({}, getCustomThemeConfig());
    previewCustomTheme(customPreviewConfig);
  }

  function cancelCustomEditor() {
    customPreviewConfig = null;
    var revert = editorRevertKey || DEFAULT_KEY;
    editorRevertKey = null;
    if (revert === CUSTOM_THEME_KEY && state.customTheme) {
      apply(CUSTOM_THEME_KEY, false);
    } else {
      apply(revert, false);
    }
  }

  function saveCustomTheme(config) {
    var normalized = {
      bg: normalizeHex(config.bg),
      menuColor: normalizeHex(config.menuColor || config.panelColor || config.bg),
      surface: normalizeHex(config.surface),
      accent: normalizeHex(config.accent),
      textMode: config.textMode === 'dark' ? 'dark' : 'light',
      bgTextMode: config.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: normalizeVisualDepth(config.visualDepth),
      bgGlass: normalizePanelGlass(config.bgGlass || config.panelGlass),
      panelGlass: normalizePanelGlass(config.panelGlass),
      buttonGlass: normalizePanelGlass(config.buttonGlass),
      borderGlass: normalizePanelGlass(config.borderGlass),
      shadowGlass: normalizeShadowGlass(config.shadowGlass),
      heroSurface: normalizeHex(config.heroSurface || config.surface),
      heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
      heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass)
    };
    var built = buildCustomTheme(normalized);
    editorRevertKey = null;
    state.customTheme = normalized;
    apply(CUSTOM_THEME_KEY, true, normalized);
    return { ok: true };
  }

  function isCustomThemeActive() {
    return state.themeKey === CUSTOM_THEME_KEY;
  }

  function getDefaultCustomTheme() {
    return Object.assign({}, DEFAULT_CUSTOM_THEME);
  }

  function normalizeCustomConfig(raw) {
    if (!raw || typeof raw !== 'object') {
      return Object.assign({}, DEFAULT_CUSTOM_THEME);
    }
    return {
      bg: normalizeHex(raw.bg || raw.background),
      menuColor: normalizeHex(raw.menuColor || raw.panelColor || raw.bg || raw.background),
      surface: normalizeHex(raw.surface),
      accent: normalizeHex(raw.accent),
      textMode: raw.textMode === 'dark' ? 'dark' : 'light',
      bgTextMode: raw.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: normalizeVisualDepth(raw.visualDepth),
      bgGlass: normalizePanelGlass(raw.bgGlass || raw.panelGlass),
      panelGlass: normalizePanelGlass(raw.panelGlass),
      buttonGlass: normalizePanelGlass(raw.buttonGlass),
      borderGlass: normalizePanelGlass(raw.borderGlass),
      shadowGlass: normalizeShadowGlass(raw.shadowGlass),
      heroSurface: normalizeHex(raw.heroSurface || raw.surface),
      heroButtonGlass: normalizePanelGlass(raw.heroButtonGlass || raw.buttonGlass),
      heroBorderGlass: normalizePanelGlass(raw.heroBorderGlass || raw.borderGlass)
    };
  }

  function getThemeDisplayName(themeKey) {
    themeKey = resolveThemeKey(themeKey);
    if (themeKey === CUSTOM_THEME_KEY) return 'Mi tema personalizado';
    if (THEMES[themeKey]) return THEMES[themeKey].name;
    return themeKey;
  }

  function exportCustomConfigFromKey(themeKey) {
    themeKey = resolveThemeKey(themeKey || state.themeKey || DEFAULT_KEY);
    if (themeKey === CUSTOM_THEME_KEY) {
      return normalizeCustomConfig(getCustomThemeConfig());
    }
    var preset = THEMES[themeKey];
    if (!preset) return Object.assign({}, DEFAULT_CUSTOM_THEME);
    var isLight = isLightTheme(themeKey) || relativeLuminance(preset.bg) > 0.58;
    return {
      bg: normalizeHex(preset.bg),
      surface: normalizeHex(preset.surface || preset.button || preset.bg),
      accent: normalizeHex(preset.accent),
      textMode: isLight ? 'dark' : 'light',
      visualDepth: 'medium',
      panelGlass: 'soft',
      bgGlass: 'soft',
      buttonGlass: 'solid',
      borderGlass: 'solid',
      shadowGlass: 'soft',
      heroSurface: normalizeHex(preset.surface || preset.button || preset.bg),
      heroButtonGlass: 'solid',
      heroBorderGlass: 'solid'
    };
  }

  function getCurrentKey() {
    return state.themeKey;
  }

  function getAccent() {
    return getTheme(state.themeKey).accent;
  }

  function getSwatchAccent(t) {
    return t.swatchAccent || t.accent;
  }

  function hasActivePreference() {
    var stored = readJSON(STORAGE_KEY, {});
    if (stored.userChosen) return true;
    if (stored.projectDefault) return true;
    if (stored.themeKey && stored.themeKey !== DEFAULT_KEY) return true;
    if (stored.customTheme) return true;
    return false;
  }

  function isExplicitUserChoice() {
    var stored = readJSON(STORAGE_KEY, {});
    return stored.userChosen === true;
  }

  function getStoredSettings() {
    return readJSON(STORAGE_KEY, { themeKey: DEFAULT_KEY });
  }

  function isProjectDefaultFor(proyectoId) {
    var stored = readJSON(STORAGE_KEY, {});
    return stored.projectDefault === true && stored.projectId === proyectoId;
  }

  function reapply() {
    if (customPreviewConfig) {
      applyVars(CUSTOM_THEME_KEY);
      applyVisualDepth(getActiveVisualDepth());
      document.body.dataset.theme = CUSTOM_THEME_KEY;
      document.body.classList.toggle('theme-light', isCustomLightTheme(CUSTOM_THEME_KEY, getTheme(CUSTOM_THEME_KEY)));
      return CUSTOM_THEME_KEY;
    }
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
        ProjectThemeAuthority.shouldApplyProjectDefault() &&
        typeof ProjectThemeAuthority.applyDefaultForCurrentVisitor === 'function' &&
        ProjectThemeAuthority.applyDefaultForCurrentVisitor()) {
      return state.themeKey;
    }
    if (state.themeKey === CUSTOM_THEME_KEY && state.customTheme) {
      apply(state.themeKey, false, state.customTheme);
    } else {
      apply(state.themeKey, false);
    }
    return state.themeKey;
  }

  function loadStored() {
    var stored = readJSON(STORAGE_KEY, { themeKey: DEFAULT_KEY });
    state.themeKey = resolveThemeKey(stored.themeKey);
    state.customTheme = stored.customTheme || null;
    apply(state.themeKey, false);
    return state.themeKey;
  }

  function isUserChosenTheme() {
    var stored = readJSON(STORAGE_KEY, {});
    return stored.userChosen === true;
  }

  function markUserChosen() {
    var stored = readJSON(STORAGE_KEY, { themeKey: state.themeKey });
    stored.userChosen = true;
    stored.projectDefault = false;
    writeJSON(STORAGE_KEY, stored);
  }

  function setProjectDefaultApplied(proyectoId) {
    var stored = readJSON(STORAGE_KEY, { themeKey: state.themeKey });
    stored.userChosen = false;
    stored.projectDefault = true;
    stored.projectId = proyectoId || null;
    if (state.themeKey === CUSTOM_THEME_KEY) {
      stored.customTheme = state.customTheme;
    } else {
      stored.customTheme = null;
    }
    writeJSON(STORAGE_KEY, stored);
  }

  function renderGrid(containerId, onSelect) {
    var grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'theme-swatch-grid' + (containerId === 'personalizeThemeGrid' ? ' personalize-theme-grid' : '');

    Object.keys(THEMES).forEach(function (key) {
      var t = THEMES[key];
      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'theme-swatch' + (state.themeKey === key && !customPreviewConfig ? ' selected' : '');
      swatch.title = t.name;
      swatch.setAttribute('aria-label', t.name);
      swatch.style.setProperty('--swatch-bg', t.swatchBg || t.bg);
      swatch.style.setProperty('--swatch-accent', getSwatchAccent(t));

      var base = document.createElement('span');
      base.className = 'theme-swatch-base';
      base.setAttribute('aria-hidden', 'true');

      var accent = document.createElement('span');
      accent.className = 'theme-swatch-accent';
      accent.setAttribute('aria-hidden', 'true');

      swatch.appendChild(base);
      swatch.appendChild(accent);

      swatch.addEventListener('click', function () {
        customPreviewConfig = null;
        editorRevertKey = null;
        apply(key, true);
        renderGrid(containerId, onSelect);
        if (onSelect) onSelect(key);
        if (typeof playSound === 'function') playSound('buttonTap');
        if (typeof vibrate === 'function') vibrate(6);
      });
      grid.appendChild(swatch);
    });
  }

  function init(options) {
    options = options || {};
    var stored = readJSON(STORAGE_KEY, { themeKey: DEFAULT_KEY });
    state.themeKey = resolveThemeKey(stored.themeKey);
    state.customTheme = stored.customTheme || null;

    if (!options.deferApply) {
      apply(state.themeKey, false);
    } else if (stored.projectDefault && stored.customTheme) {
      apply(CUSTOM_THEME_KEY, false, stored.customTheme);
    } else if (stored.projectDefault && THEMES[state.themeKey]) {
      apply(state.themeKey, false);
    } else if (stored.userChosen) {
      apply(state.themeKey, false, state.customTheme);
    }

    applyVisualDepth(getActiveVisualDepth());
    bindThemePersistence();
  }

  function bindThemePersistence() {
    window.addEventListener('pageshow', function (event) {
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.shouldRestoreEditorSession === 'function' &&
          VisitorPersonalizePanel.shouldRestoreEditorSession()) {
        return;
      }
      reapply();
    });
  }

  return {
    THEMES: THEMES,
    CUSTOM_THEME_KEY: CUSTOM_THEME_KEY,
    init: init,
    apply: apply,
    loadStored: loadStored,
    reapply: reapply,
    hasActivePreference: hasActivePreference,
    isExplicitUserChoice: isExplicitUserChoice,
    getStoredSettings: getStoredSettings,
    isProjectDefaultFor: isProjectDefaultFor,
    applyVisualDepth: applyVisualDepth,
    applyPanelGlass: applyPanelGlass,
    normalizeVisualDepth: normalizeVisualDepth,
    normalizePanelGlass: normalizePanelGlass,
    normalizeShadowGlass: normalizeShadowGlass,
    getCurrentKey: getCurrentKey,
    getAccent: getAccent,
    isLightTheme: isLightTheme,
    renderGrid: renderGrid,
    getTheme: getTheme,
    previewCustomTheme: previewCustomTheme,
    beginCustomEditor: beginCustomEditor,
    cancelCustomEditor: cancelCustomEditor,
    saveCustomTheme: saveCustomTheme,
    isCustomThemeActive: isCustomThemeActive,
    getDefaultCustomTheme: getDefaultCustomTheme,
    normalizeCustomConfig: normalizeCustomConfig,
    exportCustomConfigFromKey: exportCustomConfigFromKey,
    getThemeDisplayName: getThemeDisplayName,
    getCustomThemeConfig: getCustomThemeConfig,
    buildCustomTheme: buildCustomTheme,
    markUserChosen: markUserChosen,
    isUserChosenTheme: isUserChosenTheme,
    setProjectDefaultApplied: setProjectDefaultApplied
  };
})();
