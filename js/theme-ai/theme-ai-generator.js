/* Generación de temas: misma paleta extraída, solo estilo de aplicación */
var ThemeAIGenerator = (function () {
  var VARIANTS = {
    minimalist: 'minimalist',
    premium: 'premium'
  };

  function buildThemeConfig(palette, style) {
    var colors = palette.colors;
    var textMode = ThemeColorMath.relativeLuminance(colors.background) > 0.52 ? 'dark' : 'light';

    var base = {
      bg: colors.background,
      menuColor: colors.surface,
      surface: colors.surface,
      accent: colors.accent,
      textMode: textMode,
      bgTextMode: textMode,
      heroSurface: colors.secondary,
      buttonGlass: 'solid',
      borderGlass: 'solid',
      heroButtonGlass: 'solid',
      heroBorderGlass: 'solid'
    };

    if (style === VARIANTS.minimalist) {
      return ThemeSystem.normalizeCustomConfig(Object.assign({}, base, {
        visualDepth: 'low',
        bgGlass: 'glass',
        panelGlass: 'soft',
        shadowGlass: 'glass'
      }));
    }

    return ThemeSystem.normalizeCustomConfig(Object.assign({}, base, {
      visualDepth: 'high',
      bgGlass: 'soft',
      panelGlass: 'solid',
      shadowGlass: 'soft'
    }));
  }

  function buildProposal(style, profile) {
    var palette = profile.palette;
    var isMinimal = style === VARIANTS.minimalist;
    return {
      id: isMinimal ? 'a' : 'b',
      variant: style,
      name: isMinimal ? 'Minimalista' : 'Premium',
      description: isMinimal
        ? 'Aplicación limpia con la paleta exacta del logo: más aire, baja profundidad y superficies ligeras.'
        : 'Aplicación refinada con la misma paleta: mayor profundidad, contraste y presencia visual.',
      config: buildThemeConfig(palette, style),
      palette: palette
    };
  }

  function generate(profile) {
    return Promise.resolve([
      buildProposal(VARIANTS.minimalist, profile),
      buildProposal(VARIANTS.premium, profile)
    ]);
  }

  return {
    VARIANTS: VARIANTS,
    generate: generate
  };
})();
