/* Mapeo de roles cromáticos → ThemeSystem */
var ThemeRoleMapper = (function () {
  var C = ThemeColorMath;

  function getRoles(palette) {
    if (palette && palette.roles) return palette.roles;
    if (!palette || !palette.colors) return {};
    var colors = palette.colors;
    return {
      background: colors.background,
      surface: colors.surface,
      accentPrimary: colors.accent,
      accentSecondary: colors.secondary,
      primaryText: colors.textPrimary,
      secondaryText: colors.textSecondary,
      border: colors.border
    };
  }

  function resolveDepthProfile(style, palette) {
    var roles = getRoles(palette);
    var isDark = palette.isDarkBackground !== false;
    if (palette.roleFamilies && palette.personality) {
      isDark = palette.isDarkBackground !== undefined
        ? palette.isDarkBackground
        : C.relativeLuminance(roles.background || '#161616') < 0.45;
    }

    var bgFamily = (palette.families || []).find(function (f) {
      return f.key === (palette.roleFamilies && palette.roleFamilies.background);
    });

    if (style === 'light') {
      var lightBg = bgFamily ? (bgFamily.members[bgFamily.members.length - 1] || {}).hex : roles.background;
      var lightSurface = bgFamily ? (bgFamily.members[Math.max(0, bgFamily.members.length - 2)] || {}).hex : roles.surface;
      return {
        bg: lightBg || roles.background,
        surface: lightSurface || roles.surface,
        menuColor: lightSurface || roles.surface,
        textMode: 'dark',
        isDark: false
      };
    }

    if (style === 'dark') {
      var darkBg = bgFamily ? (bgFamily.members[0] || {}).hex : roles.background;
      var darkSurface = bgFamily ? (bgFamily.members[1] || {}).hex : roles.surface;
      return {
        bg: darkBg || roles.background,
        surface: darkSurface || roles.surface,
        menuColor: darkSurface || roles.surface,
        textMode: 'light',
        isDark: true
      };
    }

    return {
      bg: roles.background,
      surface: roles.surface,
      menuColor: roles.surface,
      textMode: isDark ? 'light' : 'dark',
      isDark: isDark
    };
  }

  function buildThemeConfig(palette, stylePreset) {
    var roles = getRoles(palette);
    var depth = resolveDepthProfile(stylePreset.depthKey || stylePreset.id, palette);
    var accent = roles.accentPrimary || palette.colors.accent;
    var heroSurface = roles.accentSecondary || roles.surfaceElevation1 || roles.surface || depth.surface;

    var textPrimary = roles.primaryText || palette.colors.textPrimary;
    var bg = depth.bg || roles.background;
    textPrimary = C.ensureContrast(textPrimary, bg, 4.5, textPrimary);

    var base = {
      bg: bg,
      menuColor: depth.menuColor || roles.surface,
      surface: depth.surface || roles.surface,
      accent: accent,
      textMode: depth.textMode,
      bgTextMode: depth.textMode,
      heroSurface: heroSurface,
      buttonGlass: stylePreset.buttonGlass || 'solid',
      borderGlass: stylePreset.borderGlass || 'solid',
      heroButtonGlass: stylePreset.heroButtonGlass || 'solid',
      heroBorderGlass: stylePreset.heroBorderGlass || 'solid',
      visualDepth: stylePreset.visualDepth || 'medium',
      bgGlass: stylePreset.bgGlass || 'glass',
      panelGlass: stylePreset.panelGlass || 'soft',
      shadowGlass: stylePreset.shadowGlass || 'glass'
    };

    return ThemeSystem.normalizeCustomConfig(base);
  }

  return {
    getRoles: getRoles,
    buildThemeConfig: buildThemeConfig,
    resolveDepthProfile: resolveDepthProfile
  };
})();
