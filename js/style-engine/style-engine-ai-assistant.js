/* Style Engine — AI Style Assistant (aislado del Theme Editor) */
var StyleEngineAI = (function () {
  var lastAnalysis = null;
  var lastPalette = null;

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inferPersonality(profile) {
    var tags = [];
    var p = (profile && profile.personality) || {};
    if (p.primary) tags.push(p.primary);
    if (p.secondary) tags.push(p.secondary);
    if (Array.isArray(p.traits)) {
      p.traits.forEach(function (t) {
        if (t && t.id) tags.push(t.id);
      });
    }
    if (profile && profile.isDarkBackground) tags.push('oscuro');
    if (!tags.length) tags.push('equilibrado', 'profesional', 'inmobiliario');
    return tags.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function buildArtDirectorProfile(profile) {
    var colors = (profile && profile.colors) || {};
    var roles = (profile && profile.roles) || {};
    var dom = (profile && profile.dominantColors) || [];
    var personality = inferPersonality(profile);

    var temperature = personality.indexOf('oscuro') >= 0 || profile.isDarkBackground ? 'fría-oscura' : 'neutra-cálida';
    var luxury = personality.indexOf('luxury') >= 0 || personality.indexOf('premium') >= 0 || personality.indexOf('elegante') >= 0;
    var minimal = personality.indexOf('minimalista') >= 0;
    var glass = personality.indexOf('tecnologico') >= 0 || personality.indexOf('cristal') >= 0;
    var natural = personality.indexOf('natural') >= 0 || personality.indexOf('organico') >= 0;
    var industrial = personality.indexOf('industrial') >= 0 || personality.indexOf('urbano') >= 0;

    return {
      dominantPalette: dom.slice(0, 5).map(function (c) { return c.hex || c; }),
      secondaryPalette: dom.slice(5, 8).map(function (c) { return c.hex || c; }),
      temperature: temperature,
      contrast: luxury ? 'alto' : (minimal ? 'medio-bajo' : 'medio'),
      luminance: profile.isDarkBackground ? 'baja' : 'media-alta',
      saturation: natural ? 'moderada' : 'contenida',
      materiality: glass ? 'glass' : (natural ? 'natural' : (industrial ? 'industrial' : 'premium')),
      depth: luxury ? 'profunda' : 'moderada',
      lighting: glass ? 'difusa-lateral' : 'ambiental-suave',
      editorialStyle: minimal ? 'minimalista' : (luxury ? 'editorial-lujo' : 'corporativo-moderno'),
      luxuryLevel: luxury ? 'alto' : 'medio',
      sensation: luxury ? 'exclusividad' : (natural ? 'calidez' : 'confianza'),
      mood: profile.isDarkBackground ? 'oscuro' : 'claro'
    };
  }

  function buildRulesFromBrand(profile) {
    var rules = StyleEngineTokens.getDefaultRules();
    var colors = (profile && profile.colors) || {};
    var roles = (profile && profile.roles) || {};
    var personality = inferPersonality(profile);
    var art = buildArtDirectorProfile(profile);

    var bg = roles.background || colors.background || rules.surface;
    var surface = roles.surface || colors.surface || rules['surface-elevated'];
    var accent = roles.accentPrimary || colors.accent || rules['color-accent'];
    var text = roles.primaryText || colors.textPrimary || rules['text-primary'];
    var border = roles.border || colors.border || rules.border;

    rules.surface = bg;
    rules['surface-elevated'] = surface;
    rules['surface-floating'] = surface;
    rules['color-accent'] = accent;
    rules['color-primary'] = text;
    rules['text-primary'] = text;
    rules['text-secondary'] = colors.textSecondary || rules['text-secondary'];
    rules.border = border;
    rules.divider = border;

    var isLuxury = art.luxuryLevel === 'alto';
    var isMinimal = art.editorialStyle === 'minimalista';
    var isGlass = art.materiality === 'glass';
    var isNatural = art.materiality === 'natural';
    var isIndustrial = art.materiality === 'industrial';

    rules['radius-card'] = isMinimal ? 10 : (isLuxury ? 18 : 16);
    rules['radius-button'] = isMinimal ? 8 : 10;
    rules['card-shadow'] = isLuxury ? '0 14px 40px rgba(0,0,0,0.34)' : '0 10px 28px rgba(0,0,0,0.22)';
    rules['popup-shadow'] = isLuxury ? '0 22px 60px rgba(0,0,0,0.36)' : rules['popup-shadow'];
    rules.density = isLuxury ? 1.04 : (isMinimal ? 0.96 : 1);
    rules['glass-transparency'] = isGlass ? 0.52 : (isNatural ? 0.34 : 0.38);
    rules['blur-md'] = isGlass ? 16 : (isIndustrial ? 8 : 10);
    rules['blur-lg'] = isGlass ? 24 : 18;
    rules['depth-card'] = isLuxury ? 0.16 : 0.12;
    rules['depth-popup'] = isLuxury ? 0.22 : 0.16;
    rules['overlay-opacity'] = art.mood === 'oscuro' ? 0.68 : 0.55;
    rules['button-height'] = isLuxury ? 44 : 42;
    rules['letter-spacing-ui'] = isLuxury ? 0.1 : (isMinimal ? 0.06 : 0.08);
    rules['font-weight-heading'] = isLuxury ? 700 : 600;
    rules['spacing-md'] = isMinimal ? 14 : 16;
    rules['color-warning'] = isIndustrial ? '#d4a017' : rules['color-warning'];
    rules['color-success'] = isNatural ? '#4caf7d' : rules['color-success'];

    if (typeof ThemeColorMath !== 'undefined' && profile.dominantColors) {
      var dom = profile.dominantColors[0];
      if (dom && dom.hex) rules['color-secondary'] = dom.hex;
    }

    return {
      rules: StyleEngineTokens.normalizeRules(rules),
      personality: personality,
      artDirector: art,
      palette: {
        primary: text,
        secondary: rules['color-secondary'],
        accent: accent,
        surface: surface,
        background: bg,
        dominant: art.dominantPalette,
        secondary: art.secondaryPalette
      },
      checks: {
        colors: true,
        surfaces: true,
        radius: true,
        shadows: true,
        typography: true,
        density: true,
        material: true,
        depth: true,
        glass: isGlass,
        luxury: isLuxury,
        editorial: true
      }
    };
  }

  function analyzeFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('Selecciona una imagen.'));
        return;
      }
      var run = function (profile) {
        var built = buildRulesFromBrand(profile);
        lastAnalysis = built;
        lastPalette = built.palette;
        StyleEngineStore.setAiPalette(built.palette);
        resolve(built);
      };

      if (typeof ThemeBrandAnalyzer !== 'undefined' && ThemeBrandAnalyzer.analyzeImage) {
        ThemeBrandAnalyzer.analyzeImage(file).then(function (result) {
          run(result.palette || result);
        }).catch(reject);
        return;
      }

      /* Fallback ligero sin depender del legacy */
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 64, 64);
          var d = ctx.getImageData(32, 32, 1, 1).data;
          var hex = '#' + [d[0], d[1], d[2]].map(function (n) {
            return n.toString(16).padStart(2, '0');
          }).join('');
          run(buildRulesFromBrand({
            colors: { accent: hex, background: '#111111', surface: '#181818', textPrimary: '#ffffff' },
            roles: { accentPrimary: hex, background: '#111111', surface: '#181818', primaryText: '#ffffff' },
            personality: { modern: 0.6, minimal: 0.5 }
          }));
        };
        img.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      reader.readAsDataURL(file);
    });
  }

  function getLastAnalysis() { return lastAnalysis; }
  function getAiPalette() { return lastPalette; }

  function applyScope(scope) {
    if (!lastAnalysis) return false;
    var full = lastAnalysis.rules;
    var patch = {};
    if (scope === 'colors') {
      ['color-primary', 'color-secondary', 'color-accent', 'text-primary', 'text-secondary', 'text-muted', 'border', 'divider'].forEach(function (k) {
        patch[k] = full[k];
      });
    } else if (scope === 'colors-surfaces') {
      Object.keys(full).forEach(function (k) {
        if (k.indexOf('color-') === 0 || k.indexOf('text-') === 0 || k.indexOf('surface') === 0 || k === 'overlay' || k === 'border' || k === 'divider') {
          patch[k] = full[k];
        }
      });
    } else {
      patch = full;
    }
    StyleEngineStore.applyRulesPatch(patch, { source: 'ai' });
    return true;
  }

  function renderAnalysisResult(analysis) {
    if (!analysis) return '';
    var tags = (analysis.personality || []).map(function (t) {
      return '<span class="se-ai-tag">' + escapeHtml(t) + '</span>';
    }).join('');
    var art = analysis.artDirector || {};
    var artRows = [
      ['Temperatura', art.temperature],
      ['Contraste', art.contrast],
      ['Luminancia', art.luminance],
      ['Materialidad', art.materiality],
      ['Profundidad', art.depth],
      ['Iluminación', art.lighting],
      ['Estilo editorial', art.editorialStyle],
      ['Nivel de lujo', art.luxuryLevel],
      ['Sensación', art.sensation]
    ].filter(function (row) { return row[1]; }).map(function (row) {
      return '<div class="se-ai-art-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
    }).join('');
    var checks = Object.keys(analysis.checks || {}).map(function (k) {
      return '<li>✔ ' + escapeHtml(k.charAt(0).toUpperCase() + k.slice(1)) + '</li>';
    }).join('');
    return (
      '<div class="se-ai-result">' +
        '<div class="se-ai-result-title">Análisis de director de arte</div>' +
        '<div class="se-ai-tags">' + tags + '</div>' +
        '<div class="se-ai-art-grid">' + artRows + '</div>' +
        '<ul class="se-ai-checks">' + checks + '</ul>' +
        '<div class="se-ai-apply-scope">' +
          '<div class="se-ai-apply-label">Aplicar Design System:</div>' +
          '<label class="se-ai-scope"><input type="radio" name="seAiScope" value="colors" checked> Solo colores</label>' +
          '<label class="se-ai-scope"><input type="radio" name="seAiScope" value="colors-surfaces"> Colores + superficies</label>' +
          '<label class="se-ai-scope"><input type="radio" name="seAiScope" value="full"> Sistema completo</label>' +
          '<button type="button" class="se-ai-apply-btn" id="styleEngineAiApplyBtn">Aplicar</button>' +
        '</div>' +
      '</div>'
    );
  }

  function maybeOfferSavePreset() {
    if (!lastAnalysis) return;
    var name = window.prompt('¿Guardar como nuevo preset?', 'Estilo personalizado');
    if (!name || !name.trim()) return;
    StyleEnginePresets.savePersonalPreset(name.trim(), StyleEngineStore.getDraftRules(), 'ai-learned');
    if (typeof showToast === 'function') showToast('Preset guardado: ' + name.trim());
  }

  return {
    analyzeFile: analyzeFile,
    getLastAnalysis: getLastAnalysis,
    getAiPalette: getAiPalette,
    applyScope: applyScope,
    renderAnalysisResult: renderAnalysisResult,
    maybeOfferSavePreset: maybeOfferSavePreset
  };
})();
