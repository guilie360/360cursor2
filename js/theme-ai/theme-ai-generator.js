/* Generación de temas: misma identidad cromática, distintas aplicaciones de diseño */
var ThemeAIGenerator = (function () {
  var STYLE_PRESETS = [
    {
      id: 'minimalist',
      variant: 'minimalist',
      name: 'Minimalista',
      description: 'Aplicación limpia: aire, baja profundidad y superficies ligeras. La identidad del logo se mantiene intacta.',
      depthKey: 'minimalist',
      visualDepth: 'low',
      bgGlass: 'glass',
      panelGlass: 'soft',
      shadowGlass: 'glass',
      buttonGlass: 'solid',
      borderGlass: 'solid'
    },
    {
      id: 'premium',
      variant: 'premium',
      name: 'Premium',
      description: 'Refinado y equilibrado: mayor profundidad y presencia visual sin alterar los colores de marca.',
      depthKey: 'premium',
      visualDepth: 'high',
      bgGlass: 'soft',
      panelGlass: 'solid',
      shadowGlass: 'soft',
      buttonGlass: 'solid',
      borderGlass: 'solid'
    },
    {
      id: 'luxury',
      variant: 'luxury',
      name: 'Luxury',
      description: 'Oscuro y sofisticado: profundidad máxima, acabados sólidos y contraste elegante.',
      depthKey: 'dark',
      visualDepth: 'high',
      bgGlass: 'solid',
      panelGlass: 'solid',
      shadowGlass: 'solid',
      buttonGlass: 'solid',
      borderGlass: 'solid',
      heroButtonGlass: 'solid',
      heroBorderGlass: 'solid'
    },
    {
      id: 'dark',
      variant: 'dark',
      name: 'Dark',
      description: 'Modo oscuro construido desde la familia dominante del logo — sin inventar tonos.',
      depthKey: 'dark',
      visualDepth: 'medium',
      bgGlass: 'soft',
      panelGlass: 'soft',
      shadowGlass: 'soft'
    },
    {
      id: 'light',
      variant: 'light',
      name: 'Light',
      description: 'Modo claro usando los neutros más luminosos detectados en la identidad.',
      depthKey: 'light',
      visualDepth: 'low',
      bgGlass: 'glass',
      panelGlass: 'glass',
      shadowGlass: 'glass'
    },
    {
      id: 'editorial',
      variant: 'editorial',
      name: 'Editorial',
      description: 'Jerarquía tipográfica fuerte, fondos contenidos y acento protagonista para lectura.',
      depthKey: 'minimalist',
      visualDepth: 'medium',
      bgGlass: 'solid',
      panelGlass: 'soft',
      shadowGlass: 'glass'
    },
    {
      id: 'corporate',
      variant: 'corporate',
      name: 'Corporativo',
      description: 'Estable y profesional: superficies sólidas, bordes definidos y contraste confiable.',
      depthKey: 'premium',
      visualDepth: 'medium',
      bgGlass: 'solid',
      panelGlass: 'solid',
      shadowGlass: 'soft',
      borderGlass: 'solid'
    },
    {
      id: 'architectural',
      variant: 'architectural',
      name: 'Arquitectónico',
      description: 'Estructura clara, planos superpuestos y profundidad geométrica — ideal para inmobiliaria.',
      depthKey: 'dark',
      visualDepth: 'high',
      bgGlass: 'soft',
      panelGlass: 'solid',
      shadowGlass: 'solid',
      borderGlass: 'solid'
    }
  ];

  function formatPersonality(personality) {
    if (!personality || !personality.primary) return '';
    var label = personality.primary.charAt(0).toUpperCase() + personality.primary.slice(1);
    if (personality.secondary) {
      label += ' · ' + personality.secondary.charAt(0).toUpperCase() + personality.secondary.slice(1);
    }
    return label;
  }

  function buildProposal(preset, profile) {
    var palette = profile.palette;
    palette.isDarkBackground = palette.roleFamilies
      ? ThemeColorMath.relativeLuminance((palette.roles && palette.roles.background) || palette.colors.background) < 0.45
      : ThemeColorMath.relativeLuminance(palette.colors.background) < 0.45;

    return {
      id: preset.id,
      variant: preset.variant,
      name: preset.name,
      description: preset.description,
      config: ThemeRoleMapper.buildThemeConfig(palette, preset),
      palette: palette,
      personality: palette.personality || null,
      reasoning: (palette.reasoning || []).slice(0, 6)
    };
  }

  function generate(profile) {
    var proposals = STYLE_PRESETS.map(function (preset) {
      return buildProposal(preset, profile);
    });
    return Promise.resolve(proposals);
  }

  return {
    STYLE_PRESETS: STYLE_PRESETS,
    generate: generate,
    formatPersonality: formatPersonality
  };
})();
