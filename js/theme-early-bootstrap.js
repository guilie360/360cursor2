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
        heroSurface: normalizeHex(config.heroSurface || config.surface, config.surface),
        heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
        heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass)
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
      text: text,
      textMode: textMode,
      bgTextMode: config.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: config.visualDepth || 'medium',
      panelGlass: normalizePanelGlass(config.panelGlass),
      bgGlass: normalizePanelGlass(config.bgGlass || config.panelGlass),
      buttonGlass: normalizePanelGlass(config.buttonGlass),
      borderGlass: normalizePanelGlass(config.borderGlass),
      shadowGlass: normalizeShadowGlass(config.shadowGlass),
      heroSurface: normalizeHex(config.heroSurface || config.surface, surface),
      heroButtonGlass: normalizePanelGlass(config.heroButtonGlass || config.buttonGlass),
      heroBorderGlass: normalizePanelGlass(config.heroBorderGlass || config.borderGlass)
    };
  }

  function applyButtonGlass(root, level, button, hover) {
    level = normalizePanelGlass(level);
    var uiPreset = {
      solid: { surfaceOpacity: 100, blur: 0 },
      soft: { surfaceOpacity: 46, blur: 14 },
      glass: { surfaceOpacity: 12, blur: 20 }
    }[level] || { surfaceOpacity: 100, blur: 0 };
    var btnBg = level === 'solid' || uiPreset.surfaceOpacity >= 100
      ? button
      : 'color-mix(in srgb, ' + button + ' ' + uiPreset.surfaceOpacity + '%, transparent)';
    root.setProperty('--btn-glass-surface', btnBg);
    root.setProperty('--btn-glass-blur', uiPreset.blur + 'px');
    var btnHover = hover || button;
    if (level === 'glass') {
      btnHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 14, 42) + '%, transparent)';
    } else if (level === 'soft') {
      btnHover = 'color-mix(in srgb, ' + button + ' ' + Math.min(uiPreset.surfaceOpacity + 22, 78) + '%, transparent)';
    }
    root.setProperty('--btn-glass-hover', btnHover);
    if (document.body) {
      document.body.setAttribute('data-button-glass', level);
    }
  }

  function applyHeroButtonGlass(root, level, heroColor, accent, hover, textMode) {
    level = normalizePanelGlass(level);
    var heroPreset = {
      solid: { surfaceOpacity: 100, accentOpacity: 100, blur: 4 },
      soft: { surfaceOpacity: 42, accentOpacity: 28, blur: 12 },
      glass: { surfaceOpacity: 18, accentOpacity: 14, blur: 16 }
    }[level] || { surfaceOpacity: 100, accentOpacity: 100, blur: 4 };
    heroColor = heroColor || accent;
    textMode = textMode === 'dark' ? 'dark' : 'light';
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
  }

  function applyHeroBorderGlass(root, level, bg, heroColor) {
    level = normalizePanelGlass(level);
    var border = mixHex(bg, heroColor, 58);
    var borderValue = border;
    if (level === 'soft') {
      borderValue = 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    } else if (level === 'glass') {
      borderValue = 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }
    root.setProperty('--hero-btn-border', borderValue);
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

  function applyButtonBorderGlass(root, level, border) {
    level = normalizePanelGlass(level);
    var borderValue = border;
    if (level === 'soft') {
      borderValue = 'color-mix(in srgb, ' + border + ' 52%, transparent)';
    } else if (level === 'glass') {
      borderValue = 'color-mix(in srgb, ' + border + ' 28%, transparent)';
    }
    root.setProperty('--btn-border', borderValue);
    if (document.body) {
      document.body.setAttribute('data-button-border-glass', level);
    }
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
    solid: { v94: 94, v90: 90, v75: 75, v55: 55, blur: 0 },
    soft: { v94: 70, v90: 58, v75: 46, v55: 34, blur: 8 },
    glass: { v94: 48, v90: 38, v75: 30, v55: 22, blur: 14 }
  };

  function applyBackdropMaskEarly(root, level, bgColor) {
    level = normalizePanelGlass(level);
    var mask = BACKDROP_MASK_PRESETS[level] || BACKDROP_MASK_PRESETS.soft;
    root.setProperty('--modal-backdrop', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v94 + '%, transparent)');
    root.setProperty('--backdrop-94', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v94 + '%, transparent)');
    root.setProperty('--backdrop-90', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v90 + '%, transparent)');
    root.setProperty('--backdrop-75', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v75 + '%, transparent)');
    root.setProperty('--backdrop-55', 'color-mix(in srgb, ' + bgColor + ' ' + mask.v55 + '%, transparent)');
    root.setProperty('--modal-backdrop-blur', mask.blur + 'px');
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
    var hover = mixHex(button, hoverTint, 14);
    var border = isCustom
      ? mixHex(theme.bg, panelTint, 24)
      : mixHex(theme.bg, theme.surface, 58);
    var glassSurface = isCustom ? theme.bg : theme.surface;
    var panelGlassLevel = theme.panelGlass || (theme.themeKey === 'custom' ? 'solid' : 'soft');
    var bgGlassLevel = theme.bgGlass || theme.panelGlass || (theme.themeKey === 'custom' ? 'soft' : 'soft');

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
      applyBackdropMaskEarly(root, panelGlassLevel, panel);
      applyBgGlassEarly(root, bgGlassLevel, theme.bg, true);
      applyContainerTextEarly(root, theme.bgTextMode);
    } else {
      applyPanelGlass(
        root,
        panelGlassLevel,
        panel,
        theme.surface
      );
      applyBackdropMaskEarly(root, panelGlassLevel, panel);
    }
    applyShadowGlass(root, theme.shadowGlass || 'soft');
    applyButtonGlass(root, theme.buttonGlass || 'solid', button, hover);
    applyMenuBorderGlass(root, panelGlassLevel, border, theme.text);
    var buttonBorder = isCustom
      ? mixHex(button, theme.text, textMode === 'light' ? 22 : 18)
      : border;
    applyButtonBorderGlass(root, theme.borderGlass || 'solid', buttonBorder);
    applyHeroButtonGlass(
      root,
      theme.heroButtonGlass || theme.buttonGlass || 'solid',
      theme.heroSurface || theme.surface,
      theme.accent,
      hover,
      textMode
    );
    applyHeroBorderGlass(
      root,
      theme.heroBorderGlass || theme.borderGlass || 'solid',
      theme.bg,
      theme.heroSurface || theme.surface
    );

    document.documentElement.dataset.earlyTheme = theme.themeKey;
    document.documentElement.classList.add('theme-ready');
  }

  function persistProjectDefault(theme, proyectoId) {
    if (!theme) return;
    var stored = readJSON(STORAGE_KEY, { themeKey: theme.themeKey || 'custom' });
    stored.userChosen = false;
    stored.projectDefault = true;
    stored.projectId = proyectoId || stored.projectId || null;
    stored.themeKey = theme.themeKey || 'custom';
    if (theme.themeKey === 'custom') {
      stored.customTheme = {
        bg: theme.bg,
        menuColor: normalizeHex(theme.menuColor || theme.panelColor || theme.bg, theme.bg),
        surface: theme.surface,
        accent: theme.accent,
        textMode: theme.textMode,
        visualDepth: theme.visualDepth || 'medium',
        panelGlass: normalizePanelGlass(theme.panelGlass),
        bgGlass: normalizePanelGlass(theme.bgGlass || theme.panelGlass),
        buttonGlass: normalizePanelGlass(theme.buttonGlass),
        borderGlass: normalizePanelGlass(theme.borderGlass),
        shadowGlass: normalizeShadowGlass(theme.shadowGlass),
        heroSurface: normalizeHex(theme.heroSurface || theme.surface, theme.surface),
        heroButtonGlass: normalizePanelGlass(theme.heroButtonGlass || theme.buttonGlass),
        heroBorderGlass: normalizePanelGlass(theme.heroBorderGlass || theme.borderGlass)
      };
    } else {
      stored.customTheme = null;
    }
    writeJSON(STORAGE_KEY, stored);
  }

  function shouldSkipProjectDefault() {
    var stored = readJSON(STORAGE_KEY, {});
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
      return Promise.resolve(null);
    }

    var slug = getProjectSlug();
    var select = encodeURIComponent('id,proyecto_config(project_default_theme)');
    var path =
      '/rest/v1/proyectos?select=' + select +
      '&publicado=eq.true&slug=eq.' + encodeURIComponent(slug) +
      '&limit=1';

    return fetch(SUPABASE_URL + path, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Accept: 'application/json'
      }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Theme fetch failed: ' + response.status);
        return response.json();
      })
      .then(function (rows) {
        if (!rows || !rows[0]) return null;
        var config = rows[0].proyecto_config;
        if (Array.isArray(config)) config = config[0];
        if (!config || !config.project_default_theme) return null;
        return {
          proyectoId: rows[0].id,
          theme: expandThemeConfig(config.project_default_theme)
        };
      });
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

  function bootstrapProjectTheme() {
    normalizeProjectUrl();
    applyLoadingShell();

    if (shouldSkipProjectDefault()) {
      var stored = readJSON(STORAGE_KEY, {});
      if (stored.customTheme) {
        applyExpandedTheme(
          expandThemeConfig({
            themeKey: stored.themeKey || 'custom',
            bg: stored.customTheme.bg,
            menuColor: stored.customTheme.menuColor,
            surface: stored.customTheme.surface,
            accent: stored.customTheme.accent,
            textMode: stored.customTheme.textMode,
            visualDepth: stored.customTheme.visualDepth,
            panelGlass: stored.customTheme.panelGlass,
            bgGlass: stored.customTheme.bgGlass,
            buttonGlass: stored.customTheme.buttonGlass,
            borderGlass: stored.customTheme.borderGlass,
            shadowGlass: stored.customTheme.shadowGlass,
            heroSurface: stored.customTheme.heroSurface,
            heroButtonGlass: stored.customTheme.heroButtonGlass,
            heroBorderGlass: stored.customTheme.heroBorderGlass
          })
        );
      }
      document.documentElement.classList.add('theme-ready');
      return;
    }

    function finishWithTheme(theme, proyectoId) {
      if (theme) {
        applyExpandedTheme(theme);
        persistProjectDefault(theme, proyectoId);
      }
      document.documentElement.classList.add('theme-ready');
    }

    if (location.protocol === 'file:') {
      var offlineFallback =
        typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined'
          ? expandThemeConfig(PROJECT_DEFAULT_THEME_FALLBACK)
          : null;
      finishWithTheme(offlineFallback, null);
      return;
    }

    fetchProjectDefaultTheme()
      .then(function (result) {
        if (result && result.theme) {
          finishWithTheme(result.theme, result.proyectoId);
          return;
        }
        var fallback =
          typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined'
            ? expandThemeConfig(PROJECT_DEFAULT_THEME_FALLBACK)
            : null;
        finishWithTheme(fallback, null);
      })
      .catch(function (err) {
        console.warn('[ThemeEarly]', err);
        var fallback =
          typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined'
            ? expandThemeConfig(PROJECT_DEFAULT_THEME_FALLBACK)
            : null;
        finishWithTheme(fallback, null);
      });

    window.setTimeout(function () {
      document.documentElement.classList.add('theme-ready');
    }, 3000);
  }

  window.__applyProjectThemeEarly = function (rawConfig, proyectoId) {
    var theme = expandThemeConfig(rawConfig);
    applyExpandedTheme(theme);
    persistProjectDefault(theme, proyectoId);
  };

  bootstrapProjectTheme();
})();
