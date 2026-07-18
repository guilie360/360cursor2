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

  function detectLogoStyle(file) {
    return new Promise(function (resolve) {
      if (!file) return resolve('avatar');
      var type = String(file.type || '').toLowerCase();
      var name = String(file.name || '').toLowerCase();

      if (type.indexOf('jpeg') >= 0 || type.indexOf('jpg') >= 0 || /\.jpe?g$/i.test(name)) {
        return resolve('avatar');
      }
      if (type.indexOf('svg') >= 0 || /\.svg$/i.test(name)) {
        return resolve('flat');
      }
      if (type.indexOf('png') < 0 && !/\.png$/i.test(name) && type.indexOf('webp') < 0) {
        return resolve('avatar');
      }

      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var style = 'flat';
        try {
          var canvas = document.createElement('canvas');
          var w = Math.min(img.naturalWidth || img.width || 64, 96);
          var h = Math.min(img.naturalHeight || img.height || 64, 96);
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h).data;
          var hasTransparency = false;
          for (var i = 3; i < data.length; i += 16) {
            if (data[i] < 250) {
              hasTransparency = true;
              break;
            }
          }
          style = hasTransparency ? 'flat' : 'avatar';
        } catch (e) {
          style = 'flat';
        }
        URL.revokeObjectURL(url);
        resolve(style);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve('avatar');
      };
      img.src = url;
    });
  }

  return {
    analyzeBranding: analyzeBranding,
    paletteToHeroColors: paletteToHeroColors,
    detectLogoStyle: detectLogoStyle
  };
})();
