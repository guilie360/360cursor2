/* Early project theme — runs in <head> before paint to avoid Classic/red flash */
(function () {
  var STORAGE_KEY = 'guilie_theme_settings';

  var PRESETS = {
    classic: { bg: '#111111', text: '#ffffff', accent: '#8f1d1d', surface: '#171717' },
    negro: { bg: '#000000', text: '#ffffff', accent: '#808080', surface: '#0a0a0a' },
    minimal: { bg: '#f0f0f2', text: '#181818', accent: '#a8a8ae', surface: '#e6e6e8' },
    midnight: { bg: '#061820', text: '#e8f4f8', accent: '#3d9ec4', surface: '#0a2230' }
  };

  var PANEL_GLASS_PRESETS = {
    solid: { panelOpacity: 96, surfaceOpacity: 92, blur: 8, modalBlur: 12 },
    soft: { panelOpacity: 62, surfaceOpacity: 72, blur: 16, modalBlur: 18 },
    glass: { panelOpacity: 38, surfaceOpacity: 48, blur: 24, modalBlur: 26 }
  };

  function normalizePanelGlass(value) {
    if (value === 'solid' || value === 'soft' || value === 'glass') return value;
    return 'solid';
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function normalizeHex(hex, fallback) {
    var value = String(hex || fallback || '#000000').trim();
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    }
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : String(fallback || '#000000');
  }

  function mixHex(a, b, weight) {
    function channel(hex, index) {
      return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
    }
    var ratio = Math.max(0, Math.min(100, weight)) / 100;
    var channels = [0, 1, 2].map(function (index) {
      return Math.round(channel(a, index) * (1 - ratio) + channel(b, index) * ratio);
    });
    return (
      '#' +
      channels
        .map(function (channel) {
          return channel.toString(16).padStart(2, '0');
        })
        .join('')
    );
  }

  function expandThemeConfig(config) {
    if (!config) return null;

    var key = config.themeKey || 'custom';
    if (key !== 'custom' && PRESETS[key]) {
      var preset = PRESETS[key];
      return {
        themeKey: key,
        bg: preset.bg,
        surface: preset.surface,
        accent: preset.accent,
        text: preset.text,
        textMode: preset.text === '#ffffff' || preset.text === '#f7f7f7' ? 'light' : 'dark',
        visualDepth: config.visualDepth || 'medium',
        panelGlass: normalizePanelGlass(config.panelGlass),
        bgGlass: normalizePanelGlass(config.bgGlass || config.panelGlass),
        buttonGlass: normalizePanelGlass(config.buttonGlass),
        borderGlass: normalizePanelGlass(config.borderGlass),
        shadowGlass: normalizeShadowGlass(config.shadowGlass),
        heroSurface: normalizeHex(config.heroSurface || config.accent || config.surface, config.surface),
        heroHoverColor: config.heroHoverColor || '',
        heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
        heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass),
        maskColor: normalizeHex(config.maskColor || preset.bg, preset.bg),
        maskGlass: normalizePanelGlass(config.maskGlass || config.bgGlass || 'soft'),
        maskBlur: normalizeMaskBlur(config.maskBlur || deriveMaskBlurFromGlass(config.maskGlass || config.bgGlass || 'soft')),
        heroLayout: config.heroLayout === 'bottom-bar' ? 'bottom-bar' : 'centered'
      };
    }

    var bg = normalizeHex(config.bg, '#111111');
    var surface = normalizeHex(config.surface, bg);
    var accent = normalizeHex(config.accent, '#808080');
    var textMode = config.textMode === 'dark' ? 'dark' : 'light';
    var text = textMode === 'light' ? '#f7f7f7' : '#1a1a1a';
    return {
      themeKey: 'custom',
      bg: bg,
      menuColor: normalizeHex(config.menuColor || config.panelColor || mixHex(bg, textMode === 'dark' ? '#000000' : '#ffffff', 14), bg),
      surface: surface,
      accent: accent,
      hoverColor: config.hoverColor || config.hover || '',
      text: text,
      textMode: textMode,
      bgTextMode: config.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: config.visualDepth || 'medium',
      panelGlass: normalizePanelGlass(config.panelGlass),
      bgGlass: normalizePanelGlass(config.bgGlass || config.panelGlass),
      buttonGlass: normalizePanelGlass(config.buttonGlass),
      borderGlass: normalizePanelGlass(config.borderGlass),
      buttonBorderColor: config.buttonBorderColor || '',
      buttonBorderWidth: config.buttonBorderWidth || 'medium',
      buttonHoverBorderColor: config.buttonHoverBorderColor || '',
      buttonHoverBorderWidth: config.buttonHoverBorderWidth || config.buttonBorderWidth || 'medium',
      buttonHoverTextColor: config.buttonHoverTextColor || '',
      buttonHoverGlass: normalizePanelGlass(config.buttonHoverGlass || 'solid'),
      shadowGlass: normalizeShadowGlass(config.shadowGlass),
      heroSurface: normalizeHex(config.heroSurface || config.surface || config.accent, surface),
      heroHoverColor: config.heroHoverColor || config.hoverColor || '',
      heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
      heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass),
      maskColor: normalizeHex(config.maskColor || config.bg, bg),
      maskGlass: normalizePanelGlass(config.maskGlass || config.bgGlass || 'soft'),
      maskBlur: normalizeMaskBlur(config.maskBlur || deriveMaskBlurFromGlass(config.maskGlass || config.bgGlass || 'soft')),
      heroLayout: config.heroLayout === 'bottom-bar' ? 'bottom-bar' : 'centered'
    };
  }

  function applyButtonGlass(root, level, button, hover, hasExplicitHover, hoverTextColor, textFallback, hoverGlass) {
    level = normalizePanelGlass(level);
    var uiPreset = {
      solid: { surfaceOpacity: 100, blur: 0 },
      soft: { surfaceOpacity: 46, blur: 14 },
      glass: { surfaceOpacity: 12, blur: 20 }
    }[level] || { surfaceOpacity: 100, blur: 0 };
    hoverGlass = normalizePanelGlass(hoverGlass || 'solid');
    var hoverPreset = {
      solid: { surfaceOpacity: 100, blur: 0 },
      soft: { surfaceOpacity: 62, blur: 14 },
      glass: { surfaceOpacity: 38, blur: 20 }
    }[hoverGlass] || { surfaceOpacity: 100, blur: 0 };
    var btnBg = level === 'solid' || uiPreset.surfaceOpacity >= 100
      ? button
      : 'color-mix(in srgb, ' + button + ' ' + uiPreset.surfaceOpacity + '%, transparent)';
    root.setProperty('--btn-glass-surface', btnBg);
    root.setProperty('--btn-glass-blur', uiPreset.blur + 'px');
    root.setProperty('--btn-hover-blur', hoverPreset.blur + 'px');
    var hoverBase = hover || button;
    var btnHover = hoverBase;
    if (hoverGlass === 'glass') {
      btnHover = 'color-mix(in srgb, ' + hoverBase + ' 38%, transparent)';
    } else if (hoverGlass === 'soft') {
      btnHover = 'color-mix(in srgb, ' + hoverBase + ' 62%, transparent)';
    }
    root.setProperty('--btn-glass-hover', btnHover);
    root.setProperty('--hover', hover || button);
    var hoverText = String(hoverTextColor || '').trim()
      ? normalizeHex(hoverTextColor, textFallback || '#ffffff')
      : (textFallback || '#ffffff');
    root.setProperty('--btn-text-hover', hoverText);
    if (document.body) {
      document.body.setAttribute('data-button-glass', level);
      document.body.setAttribute('data-button-hover-glass', hoverGlass);
    }
  }

  function applyHeroButtonGlass(root, level, heroColor, accent, hover, textMode, heroHoverColor) {
    /* Unificado: mismos tokens que botones generales */
    level = normalizePanelGlass(level);
    var uiPreset = {
      solid: { surfaceOpacity: 100, blur: 0 },
      soft: { surfaceOpacity: 46, blur: 14 },
      glass: { surfaceOpacity: 12, blur: 20 }
    }[level] || { surfaceOpacity: 100, blur: 0 };
    var button = heroColor || accent;
    var hasExplicitHover = !!(String(heroHoverColor || hover || '').trim() && heroHoverColor);
    var hoverBase = hasExplicitHover ? normalizeHex(heroHoverColor, button) : (hover || button);
    var heroBg = level === 'solid' || uiPreset.surfaceOpacity >= 100
      ? button
      : 'color-mix(in srgb, ' + button + ' ' + uiPreset.surfaceOpacity + '%, transparent)';
    var heroHover = hoverBase;
    if (hasExplicitHover) {
      if (level === 'glass') heroHover = 'color-mix(in srgb, ' + hoverBase + ' 72%, transparent)';
      else if (level === 'soft') heroHover = 'color-mix(in srgb, ' + hoverBase + ' 88%, transparent)';
    } else if (level === 'glass') {
      heroHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 14, 42) + '%, transparent)';
    } else if (level === 'soft') {
      heroHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 22, 78) + '%, transparent)';
    }
    root.setProperty('--hero-btn-bg', heroBg);
    root.setProperty('--hero-btn-bg-hover', heroHover);
    root.setProperty('--hero-btn-blur', uiPreset.blur + 'px');
  }

  function applyHeroBorderGlass(root, level, bg, heroColor, borderColor, borderWidth, hoverBorderColor, hoverBorderWidth) {
    var color = borderColor || mixHex(bg, heroColor, 58);
    var widthPx = borderWidth === 'low' ? '1px' : borderWidth === 'high' ? '3px' : '2px';
    var hoverColor = hoverBorderColor || color;
    var hoverWidthPx = hoverBorderWidth === 'low' ? '0.7px' : hoverBorderWidth === 'high' ? '2.1px' : '1.4px';
    root.setProperty('--hero-btn-border', color);
    root.setProperty('--btn-border', color);
    root.setProperty('--btn-border-width', widthPx);
    root.setProperty('--hero-btn-border-hover', hoverColor);
    root.setProperty('--btn-border-hover', hoverColor);
    root.setProperty('--btn-border-width-hover', hoverWidthPx);
  }

  function applyButtonBorderGlass(root, level, buttonBorder, borderColor, borderWidth, hoverBorderColor, hoverBorderWidth) {
    level = normalizePanelGlass(level);
    var color = borderColor || buttonBorder;
    var widthPx = borderWidth === 'low' ? '1px' : borderWidth === 'high' ? '3px' : '2px';
    if (!borderColor && level === 'soft') {
      color = 'color-mix(in srgb, ' + buttonBorder + ' 52%, transparent)';
    } else if (!borderColor && level === 'glass') {
      color = 'color-mix(in srgb, ' + buttonBorder + ' 28%, transparent)';
    }
    var hoverColor = hoverBorderColor || color;
    var hoverWidthPx = hoverBorderWidth === 'low' ? '0.7px' : hoverBorderWidth === 'high' ? '2.1px' : '1.4px';
    root.setProperty('--btn-border', color);
    root.setProperty('--hero-btn-border', color);
    root.setProperty('--btn-border-width', widthPx);
    root.setProperty('--btn-border-hover', hoverColor);
    root.setProperty('--hero-btn-border-hover', hoverColor);
    root.setProperty('--btn-border-width-hover', hoverWidthPx);
  }

  function mixBorderGlassEarly(level, border) {
    level = normalizePanelGlass(level);
    if (level === 'soft') {
      return 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    }
    if (level === 'glass') {
      return 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }
    return border;
  }

  function relativeLuminanceEarly(hex) {
    function channel(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function read(hexValue, index) {
      return parseInt(hexValue.slice(1 + index * 2, 3 + index * 2), 16);
    }
    hex = normalizeHex(hex, '#000000');
    return 0.2126 * channel(read(hex, 0)) + 0.7152 * channel(read(hex, 1)) + 0.0722 * channel(read(hex, 2));
  }

  function applyMenuBorderGlass(root, level, border, text) {
    level = normalizePanelGlass(level);
    var borderValue = border;
    if (level === 'soft') {
      borderValue = 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    } else if (level === 'glass') {
      borderValue = 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }
    root.setProperty('--border', borderValue);
    root.setProperty('--glass-border', borderValue);
    root.setProperty('--glass-border-lit', 'color-mix(in srgb, ' + borderValue + ' 68%, ' + text + ')');
  }

  function applyBorderGlass(root, level, border, text) {
    applyMenuBorderGlass(root, level, border, text);
  }

  function normalizeShadowGlass(value) {
    if (value === 'off') return 'soft';
    if (value === 'solid' || value === 'soft' || value === 'glass') return value;
    return 'soft';
  }

  var SHADOW_PRESETS = {
    off: { glass: 'none', btn: 'none', modal: 'none', inset: 'none' },
    solid: { glass: '0 16px 52px rgba(0, 0, 0, 0.52)', btn: '0 10px 32px rgba(0, 0, 0, 0.42)', modal: '0 32px 88px rgba(0, 0, 0, 0.72)', inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)' },
    soft: { glass: '0 10px 36px rgba(0, 0, 0, 0.34)', btn: '0 6px 20px rgba(0, 0, 0, 0.28)', modal: '0 24px 70px rgba(0, 0, 0, 0.55)', inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)' },
    glass: { glass: '0 4px 16px rgba(0, 0, 0, 0.12)', btn: '0 4px 12px rgba(0, 0, 0, 0.1)', modal: '0 12px 32px rgba(0, 0, 0, 0.22)', inset: 'none' }
  };

  function applyShadowGlass(root, level) {
    level = normalizeShadowGlass(level);
    var preset = SHADOW_PRESETS[level] || SHADOW_PRESETS.soft;
    root.setProperty('--glass-shadow', preset.glass);
    root.setProperty('--btn-shadow', preset.btn);
    root.setProperty('--modal-shadow', preset.modal);
    root.setProperty('--glass-inset-shadow', preset.inset);
    if (document.body) document.body.setAttribute('data-shadow-glass', level);
  }

  var BACKDROP_MASK_PRESETS = {
    solid: { v94: 94, v90: 90, v75: 75, v55: 55 },
    soft: { v94: 70, v90: 58, v75: 46, v55: 34 },
    glass: { v94: 48, v90: 38, v75: 30, v55: 22 }
  };

  var MASK_BLUR_PRESETS = {
    low: 6,
    medium: 16,
    high: 32
  };

  function normalizeMaskBlur(value) {
    if (value === 'low' || value === 'high') return value;
    return 'medium';
  }

  function deriveMaskBlurFromGlass(glass) {
    glass = normalizePanelGlass(glass);
    if (glass === 'glass') return 'high';
    if (glass === 'soft') return 'medium';
    return 'low';
  }

  function resolveMaskBlurPx(blurLevel) {
    blurLevel = normalizeMaskBlur(blurLevel);
    return MASK_BLUR_PRESETS[blurLevel] || MASK_BLUR_PRESETS.medium;
  }

  function applyBackdropMaskEarly(root, level, bgColor, blurLevel) {
    level = normalizePanelGlass(level);
    blurLevel = normalizeMaskBlur(blurLevel || deriveMaskBlurFromGlass(level));
    var mask = BACKDROP_MASK_PRESETS[level] || BACKDROP_MASK_PRESETS.soft;
    var backdrop = 'color-mix(in srgb, ' + bgColor + ' ' + mask.v94 + '%, transparent)';
    root.setProperty('--modal-backdrop', backdrop);
    root.setProperty('--overlay-mask', backdrop);
    root.setProperty('--backdrop-94', backdrop);
    root.setProperty('--backdrop-90', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v90 + '%, transparent)');
    root.setProperty('--backdrop-75', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v75 + '%, transparent)');
    root.setProperty('--backdrop-55', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v55 + '%, transparent)');
    root.setProperty('--modal-backdrop-blur', resolveMaskBlurPx(blurLevel) + 'px');
    if (document.body) {
      document.body.setAttribute('data-mask-glass', level);
      document.body.setAttribute('data-mask-blur', blurLevel);
    }
  }

  function applyMenuPanelGlassEarly(root, level, panelColor) {
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    var panelBg = 'color-mix(in srgb, ' + panelColor + ' ' + preset.panelOpacity + '%, transparent)';
    root.setProperty('--glass-panel', panelBg);
    root.setProperty('--menu-glass-blur', preset.blur + 'px');
    if (document.body) document.body.setAttribute('data-panel-glass', level);
  }

  function resolveBgGlassSurfacesEarly(level, bgColor) {
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    if (level === 'solid') {
      return { popupBg: bgColor, surfaceBg: bgColor, blur: 0, modalBlur: 0 };
    }
    return {
      popupBg: 'color-mix(in srgb, ' + bgColor + ' ' + preset.panelOpacity + '%, transparent)',
      surfaceBg: 'color-mix(in srgb, ' + bgColor + ' ' + preset.surfaceOpacity + '%, transparent)',
      blur: preset.blur,
      modalBlur: preset.modalBlur
    };
  }

  function applyContainerTextEarly(root, textMode) {
    textMode = textMode === 'dark' ? 'dark' : 'light';
    root.setProperty('--container-text', textMode === 'light' ? '#f7f7f7' : '#1a1a1a');
    if (document.body) document.body.setAttribute('data-container-text-mode', textMode);
  }

  function applyBgGlassEarly(root, level, bgColor, isCustom) {
    level = normalizePanelGlass(level);
    var surfaces = resolveBgGlassSurfacesEarly(level, bgColor);
    root.setProperty('--bg-popup', surfaces.popupBg);
    root.setProperty('--panel-glass-surface', surfaces.surfaceBg);
    root.setProperty('--bg-glass-surface', surfaces.surfaceBg);
    root.setProperty('--panel-modal-blur', surfaces.modalBlur + 'px');
    root.setProperty('--bg-glass-blur', surfaces.blur + 'px');
    if (isCustom) {
      root.setProperty('--glass-surface', surfaces.surfaceBg);
      root.setProperty('--bg-card', surfaces.surfaceBg);
    }
    if (document.body) document.body.setAttribute('data-bg-glass', level);
  }

  function applyPanelGlass(root, level, panel, surface) {
    level = normalizePanelGlass(level);
    var preset = PANEL_GLASS_PRESETS[level] || PANEL_GLASS_PRESETS.solid;
    var panelColor = panel || surface;
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
  }

  function applyExpandedTheme(theme) {
    if (!theme) return;
    var root = document.documentElement.style;
    var isCustom = theme.themeKey === 'custom';
    var textMode = theme.textMode === 'dark' ? 'dark' : 'light';
    var panelTint = textMode === 'dark' ? '#000000' : '#ffffff';
    var panel = isCustom
      ? normalizeHex(theme.menuColor || theme.panelColor || mixHex(theme.bg, panelTint, 14), theme.bg)
      : mixHex(theme.bg, theme.surface, 32);
    var button = theme.surface;
    var hoverTint = textMode === 'dark' ? '#000000' : '#ffffff';
    var hasExplicitHover = !!(String(theme.hoverColor || theme.hover || '').trim());
    var hover = hasExplicitHover
      ? normalizeHex(theme.hoverColor || theme.hover, button)
      : mixHex(button, hoverTint, 14);
    var border = isCustom
      ? mixHex(theme.bg, panelTint, 24)
      : mixHex(theme.bg, theme.surface, 58);
    var glassSurface = isCustom ? theme.bg : theme.surface;
    var panelGlassLevel = theme.panelGlass || (theme.themeKey === 'custom' ? 'solid' : 'soft');
    var bgGlassLevel = theme.bgGlass || theme.panelGlass || (theme.themeKey === 'custom' ? 'soft' : 'soft');

    var maskColor = normalizeHex(theme.maskColor || theme.bg, theme.bg);
    var maskGlassLevel = theme.maskGlass || theme.bgGlass || 'soft';
    var maskBlurLevel = theme.maskBlur || deriveMaskBlurFromGlass(maskGlassLevel);

    var pageBg = isCustom
      ? normalizeHex(theme.menuColor || theme.panelColor || panel, theme.bg)
      : theme.bg;

    root.setProperty('--bg-main', pageBg);
    root.setProperty('--text-primary', theme.text);
    root.setProperty('--accent', theme.accent);
    root.setProperty('--hero-bg', pageBg);
    root.setProperty('--hero-text', theme.text);
    if (!isCustom) {
      root.setProperty('--bg-card', glassSurface);
      root.setProperty('--glass-surface', glassSurface);
    }
    root.setProperty('--btn-surface', button);
    root.setProperty('--border', border);
    root.setProperty('--hover', hover);
    root.setProperty('--track-bg', hover);
    root.setProperty('--scrollbar-thumb', border);
    root.setProperty('--scrollbar-track', theme.bg);
    root.setProperty('--placeholder-bg', button);
    root.setProperty('--placeholder-border', border);
    if (isCustom) {
      applyMenuPanelGlassEarly(root, panelGlassLevel, panel);
      applyBackdropMaskEarly(root, maskGlassLevel, maskColor, maskBlurLevel);
      applyBgGlassEarly(root, bgGlassLevel, theme.bg, true);
      applyContainerTextEarly(root, theme.bgTextMode);
    } else {
      applyPanelGlass(
        root,
        panelGlassLevel,
        panel,
        theme.surface
      );
      applyBackdropMaskEarly(root, maskGlassLevel, maskColor, maskBlurLevel);
    }
    applyShadowGlass(root, theme.shadowGlass || 'soft');
    applyButtonGlass(
      root,
      theme.buttonGlass || 'solid',
      button,
      hover,
      hasExplicitHover,
      theme.buttonHoverTextColor,
      theme.text,
      theme.buttonHoverGlass
    );
    applyMenuBorderGlass(root, panelGlassLevel, border, theme.text);
    var buttonBorder = isCustom
      ? mixHex(button, theme.text, textMode === 'light' ? 22 : 18)
      : border;
    var explicitBorder = theme.buttonBorderColor || '';
    var explicitHoverBorder = theme.buttonHoverBorderColor || '';
    applyButtonBorderGlass(
      root,
      theme.borderGlass || 'solid',
      buttonBorder,
      explicitBorder,
      theme.buttonBorderWidth || 'medium',
      explicitHoverBorder,
      theme.buttonHoverBorderWidth || theme.buttonBorderWidth || 'medium'
    );
    applyHeroButtonGlass(
      root,
      theme.buttonGlass || 'solid',
      button,
      theme.accent,
      hover,
      textMode,
      theme.hoverColor || theme.heroHoverColor
    );
    applyHeroBorderGlass(
      root,
      theme.borderGlass || 'solid',
      theme.bg,
      button,
      explicitBorder || buttonBorder,
      theme.buttonBorderWidth || 'medium',
      explicitHoverBorder || explicitBorder || buttonBorder,
      theme.buttonHoverBorderWidth || theme.buttonBorderWidth || 'medium'
    );

    document.documentElement.dataset.earlyTheme = theme.themeKey;
    document.documentElement.classList.add('theme-ready');

    var cover = document.getElementById('projectCover');
    if (cover) {
      cover.setAttribute(
        'data-hero-layout',
        theme.heroLayout === 'bottom-bar' ? 'bottom-bar' : 'centered'
      );
    }
  }

  function persistProjectDefault(theme, proyectoId) {
    if (!theme) return;
    var stored = readJSON(STORAGE_KEY, { themeKey: theme.themeKey || 'custom' });
    stored.userChosen = false;
    stored.projectDefault = true;
    stored.projectId = proyectoId || stored.projectId || null;
    stored.themeKey = theme.themeKey || 'custom';
    if (theme.themeKey === 'custom') {
      stored.customTheme = expandThemeConfig(theme);
      delete stored.customTheme.themeKey;
      delete stored.customTheme.text;
    } else {
      stored.customTheme = null;
    }
    writeJSON(STORAGE_KEY, stored);
  }

  function shouldSkipProjectDefault() {
    var stored = readJSON(STORAGE_KEY, {});
    /* Migración: el azul cyan accidental no debe bloquear HALL */
    var custom = stored.customTheme || {};
    if (stored.userChosen &&
        (String(custom.bg || '').toLowerCase() === '#0d2541' ||
         String(custom.accent || '').toLowerCase() === '#02fbff')) {
      stored.userChosen = false;
      stored.projectDefault = true;
      writeJSON(STORAGE_KEY, stored);
      return false;
    }
    return stored.userChosen === true;
  }

  function getProjectSlug() {
    try {
      var params = new URLSearchParams(window.location.search);
      var slug = params.get('proyecto');
      if (slug) return slug;
    } catch (e) {}
    return typeof DEFAULT_PROJECT_SLUG !== 'undefined' ? DEFAULT_PROJECT_SLUG : 'proyecto-demo';
  }

  function normalizeProjectUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (!params.get('proyecto') && typeof DEFAULT_PROJECT_SLUG !== 'undefined') {
        params.set('proyecto', DEFAULT_PROJECT_SLUG);
        var next = window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState(null, '', next);
      }
    } catch (e) {}
  }

  function fetchProjectDefaultTheme() {
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
      if (typeof BootDebug !== 'undefined') BootDebug.error('fetch theme: falta SUPABASE_URL/KEY');
      return Promise.resolve(null);
    }

    var slug = getProjectSlug();
    if (typeof BootDebug !== 'undefined') BootDebug.log('fetch theme slug', slug);
    var select = encodeURIComponent('id,proyecto_config(project_default_theme)');
    var path =
      '/rest/v1/proyectos?select=' + select +
      '&publicado=eq.true&slug=eq.' + encodeURIComponent(slug) +
      '&limit=1';

    var req = fetch(SUPABASE_URL + path, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Accept: 'application/json'
      }
    })
      .then(function (response) {
        if (typeof BootDebug !== 'undefined') BootDebug.log('fetch theme status', response.status);
        if (!response.ok) throw new Error('Theme fetch failed: ' + response.status);
        return response.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) {
          if (typeof BootDebug !== 'undefined') BootDebug.log('fetch theme: sin filas');
          return null;
        }
        var config = rows[0].proyecto_config;
        if (Array.isArray(config)) config = config[0];
        if (!config || !config.project_default_theme) {
          if (typeof BootDebug !== 'undefined') BootDebug.log('fetch theme: sin project_default_theme');
          return null;
        }
        if (typeof BootDebug !== 'undefined') BootDebug.log('fetch theme: OK');
        return {
          proyectoId: rows[0].id,
          theme: expandThemeConfig(config.project_default_theme)
        };
      });

    if (typeof BootDebug !== 'undefined' && BootDebug.withTimeout) {
      return BootDebug.withTimeout(req, 10000, 'fetchProjectDefaultTheme');
    }
    return req;
  }

  function applyLoadingShell() {
    var root = document.documentElement.style;
    root.setProperty('--bg-main', '#000000');
    root.setProperty('--text-primary', '#ffffff');
    root.setProperty('--accent', '#8f1d1d');
    root.setProperty('--hero-bg', '#000000');
    root.setProperty('--hero-text', '#ffffff');
    document.documentElement.style.background = '#000000';
  }

  function markReady(reason) {
    document.documentElement.classList.add('theme-ready');
    if (typeof BootDebug !== 'undefined') BootDebug.markThemeReady(reason);
  }

  function bootstrapProjectTheme() {
    if (typeof BootDebug !== 'undefined') BootDebug.log('bootstrapProjectTheme start');
    try {
      normalizeProjectUrl();
      applyLoadingShell();

      var offlineFallback =
        typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined'
          ? expandThemeConfig(PROJECT_DEFAULT_THEME_FALLBACK)
          : null;

      /* Primera pintura inmediata — no esperar red */
      if (!shouldSkipProjectDefault() && offlineFallback) {
        try {
          applyExpandedTheme(offlineFallback);
          if (typeof BootDebug !== 'undefined') BootDebug.log('fallback HALL aplicado (inmediato)');
        } catch (paintErr) {
          if (typeof BootDebug !== 'undefined') BootDebug.error('fallback HALL paint', paintErr);
          markReady('fallback-paint-error');
        }
      }

      if (shouldSkipProjectDefault()) {
        var stored = readJSON(STORAGE_KEY, {});
        if (stored.customTheme) {
          try {
            applyExpandedTheme(
              expandThemeConfig(Object.assign({ themeKey: stored.themeKey || 'custom' }, stored.customTheme))
            );
          } catch (e) {
            if (typeof BootDebug !== 'undefined') BootDebug.error('userChosen theme paint', e);
          }
        }
        markReady('userChosen-skip');
        return;
      }

      function finishWithTheme(theme, proyectoId) {
        try {
          if (theme) {
            applyExpandedTheme(theme);
            persistProjectDefault(theme, proyectoId);
          }
        } catch (e) {
          if (typeof BootDebug !== 'undefined') BootDebug.error('finishWithTheme paint', e);
        }
        markReady('finishWithTheme');
      }

      if (location.protocol === 'file:') {
        finishWithTheme(offlineFallback, null);
        return;
      }

      fetchProjectDefaultTheme()
        .then(function (result) {
          if (result && result.theme) {
            finishWithTheme(result.theme, result.proyectoId);
            return;
          }
          finishWithTheme(offlineFallback, null);
        })
        .catch(function (err) {
          if (typeof BootDebug !== 'undefined') BootDebug.error('fetch theme', err);
          else console.warn('[ThemeEarly]', err);
          finishWithTheme(offlineFallback, null);
        });

      window.setTimeout(function () {
        if (!document.documentElement.classList.contains('theme-ready')) {
          markReady('timeout-800ms');
        }
      }, 800);
    } catch (fatal) {
      if (typeof BootDebug !== 'undefined') BootDebug.error('bootstrapProjectTheme fatal', fatal);
      markReady('bootstrap-fatal');
    }
  }

  window.__applyProjectThemeEarly = function (rawConfig, proyectoId) {
    var theme = expandThemeConfig(rawConfig);
    applyExpandedTheme(theme);
    persistProjectDefault(theme, proyectoId);
  };

  bootstrapProjectTheme();
})();
