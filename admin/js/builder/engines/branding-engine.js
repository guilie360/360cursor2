/* Branding Engine — logo analysis + theme generation */
var BrandingEngine = (function () {
  function fileMeta(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
      file: file
    };
  }

  async function analyzeBranding(logoFile, referenceFile, brandManualFile) {
    var result = {
      logo: logoFile ? fileMeta(logoFile) : null,
      reference: referenceFile ? fileMeta(referenceFile) : null,
      brandManual: brandManualFile ? fileMeta(brandManualFile) : null,
      palette: null,
      themeProposals: [],
      selectedProposal: null,
      status: 'pending'
    };

    var sourceFile = logoFile || referenceFile;
    if (!sourceFile) {
      result.status = 'skipped';
      return result;
    }

    result.status = 'analyzing';

    try {
      if (typeof ThemeBrandAnalyzer !== 'undefined' && typeof ThemeAIGenerator !== 'undefined') {
        var profile = await ThemeBrandAnalyzer.analyzeImage(sourceFile);
        result.palette = profile.palette;
        result.themeProposals = await ThemeAIGenerator.generate(profile);
        result.selectedProposal = result.themeProposals[0] || null;
        result.status = 'ready';
      } else {
        result.palette = extractBasicPalette(sourceFile);
        result.themeProposals = buildFallbackProposals(result.palette);
        result.selectedProposal = result.themeProposals[0];
        result.status = 'ready';
      }
    } catch (err) {
      result.status = 'error';
      result.error = err.message || 'Error analizando identidad visual';
      result.palette = { colors: { primary: '#7a1f1f', secondary: '#111111', accent: '#921f1f', background: '#0A0A0A', surface: '#171717', text: '#ffffff' } };
      result.themeProposals = buildFallbackProposals(result.palette);
      result.selectedProposal = result.themeProposals[0];
    }

    return result;
  }

  function extractBasicPalette(file) {
    return {
      colors: {
        primary: '#7a1f1f',
        secondary: '#171717',
        accent: '#921f1f',
        background: '#0A0A0A',
        surface: '#171717',
        text: '#ffffff'
      },
      source: file.name
    };
  }

  function buildFallbackProposals(palette) {
    var colors = palette.colors;
    return [{
      id: 'default',
      name: 'Identidad extraída',
      description: 'Tema generado a partir de la identidad corporativa.',
      config: {
        bg: colors.background,
        menuColor: colors.surface,
        surface: colors.surface,
        accent: colors.accent,
        textMode: 'light',
        bgTextMode: 'light',
        heroSurface: colors.secondary,
        visualDepth: 'high',
        panelGlass: 'solid',
        bgGlass: 'soft',
        buttonGlass: 'solid',
        borderGlass: 'solid',
        shadowGlass: 'soft'
      },
      palette: palette
    }];
  }

  function paletteToHeroColors(palette) {
    if (!palette || !palette.colors) {
      return { color_fondo: '#0A0A0A', color_accento: '#FF3B30' };
    }
    return {
      color_fondo: palette.colors.background || '#0A0A0A',
      color_accento: palette.colors.accent || palette.colors.primary || '#FF3B30'
    };
  }

  return {
    analyzeBranding: analyzeBranding,
    paletteToHeroColors: paletteToHeroColors
  };
})();
