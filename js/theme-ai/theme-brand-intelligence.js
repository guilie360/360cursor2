try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-brand-intelligence.js');}catch(_e){}
/* Brand Intelligence Engine — análisis de identidad visual y sistema cromático */
var ThemeBrandIntelligence = (function () {
  var C = ThemeColorMath;

  var MIN_COLORS = 30;
  var MAX_COLORS = 80;
  var HUE_MERGE = 18;

  function buildColorEntries(samples) {
    return samples.map(function (s, index) {
      var hsl = C.hexToHsl(s.hex);
      return {
        hex: C.normalizeHex(s.hex),
        share: s.share,
        count: s.count,
        isNeutral: C.isNeutral(s.hex),
        luminance: C.relativeLuminance(s.hex),
        saturation: hsl.s / 100,
        hue: hsl.h,
        centerWeight: s.centerWeight || 0,
        edgeWeight: s.edgeWeight || 0,
        rank: index + 1
      };
    });
  }

  function groupIntoFamilies(entries) {
    var families = [];

    entries.forEach(function (entry) {
      var key = C.hueFamilyKey(entry.hex);
      var family = null;
      for (var i = 0; i < families.length; i++) {
        if (families[i].key === key) {
          family = families[i];
          break;
        }
      }
      if (!family) {
        family = {
          key: key,
          name: C.familyDisplayName(key, entry.hex),
          type: entry.isNeutral ? 'neutral' : 'chromatic',
          members: [],
          areaShare: 0,
          avgSaturation: 0,
          avgLuminance: 0,
          centerScore: 0,
          edgeScore: 0,
          identityScore: 0,
          visualWeight: 0
        };
        families.push(family);
      }
      family.members.push(entry);
      family.areaShare += entry.share;
    });

    families.forEach(function (family) {
      var total = family.members.reduce(function (sum, m) { return sum + m.share; }, 0) || 1;
      family.avgSaturation = family.members.reduce(function (sum, m) {
        return sum + m.saturation * m.share;
      }, 0) / total;
      family.avgLuminance = family.members.reduce(function (sum, m) {
        return sum + m.luminance * m.share;
      }, 0) / total;
      family.centerScore = family.members.reduce(function (sum, m) {
        return sum + (m.centerWeight || 0) * m.share;
      }, 0) / total;
      family.edgeScore = family.members.reduce(function (sum, m) {
        return sum + (m.edgeWeight || 0) * m.share;
      }, 0) / total;
      family.members.sort(function (a, b) { return b.share - a.share; });
      family.representative = family.members[0].hex;
      family.darkest = C.pickDepthFromMembers(family.members, 0);
      family.lightest = C.pickDepthFromMembers(family.members, family.members.length - 1);
    });

    return families.sort(function (a, b) { return b.areaShare - a.areaShare; });
  }

  function scoreFamilies(families) {
    families.forEach(function (family) {
      var areaWeight = family.areaShare * 55;
      var satWeight = family.avgSaturation * 22;
      var centerWeight = family.centerScore * 18;
      var edgeWeight = family.edgeScore * 8;
      var identityBoost = 0;
      if (family.type === 'chromatic' && family.areaShare < 0.12 && family.avgSaturation > 0.42) {
        identityBoost = 28;
      }
      family.identityScore = satWeight + (1 - Math.min(family.areaShare, 0.9)) * 18 + centerWeight + identityBoost;
      family.visualWeight = areaWeight + satWeight * 0.35 + centerWeight + edgeWeight + identityBoost;
    });
    return families;
  }

  function pickBackgroundFamily(families) {
    var neutrals = families.filter(function (f) { return f.type === 'neutral'; });
    var chromatics = families.filter(function (f) { return f.type === 'chromatic'; });

    var bgCandidates = neutrals.slice();
    chromatics.forEach(function (family) {
      if (family.avgSaturation <= 0.35 || family.areaShare >= 0.28) {
        bgCandidates.push(family);
      }
    });

    if (!bgCandidates.length) bgCandidates = families.slice();

    bgCandidates.sort(function (a, b) {
      var aScore = a.areaShare * 100 + (1 - a.avgSaturation) * 25 + a.edgeScore * 10;
      var bScore = b.areaShare * 100 + (1 - b.avgSaturation) * 25 + b.edgeScore * 10;
      return bScore - aScore;
    });

    return bgCandidates[0] || families[0];
  }

  function pickAccentFamily(families, bgFamily) {
    var chromatics = families.filter(function (f) {
      return f.type === 'chromatic' && f.key !== bgFamily.key;
    });
    if (!chromatics.length) {
      chromatics = families.filter(function (f) { return f.key !== bgFamily.key; });
    }
    chromatics.sort(function (a, b) { return b.identityScore - a.identityScore; });
    return chromatics[0] || bgFamily;
  }

  function pickSecondaryAccent(families, bgFamily, accentFamily) {
    var candidates = families.filter(function (f) {
      return f.key !== bgFamily.key && f.key !== accentFamily.key;
    });
    candidates.sort(function (a, b) { return b.identityScore - a.identityScore; });
    return candidates[0] || null;
  }

  function pickTextFamily(families, bgFamily) {
    var neutrals = families.filter(function (f) { return f.type === 'neutral'; });
    if (neutrals.length) return neutrals.sort(function (a, b) {
      return Math.abs(b.avgLuminance - (1 - bgFamily.avgLuminance)) -
        Math.abs(a.avgLuminance - (1 - bgFamily.avgLuminance));
    })[0];
    return families.find(function (f) { return f.key !== bgFamily.key; }) || bgFamily;
  }

  function pickSemanticFromFamilies(families, kind) {
    var match = null;
    families.forEach(function (family) {
      if (family.type !== 'chromatic') return;
      family.members.forEach(function (member) {
        if (C.semanticHueKind(member.hex) === kind && (!match || member.share > match.share)) {
          match = member;
        }
      });
    });
    return match ? match.hex : null;
  }

  function assignRoles(families) {
    var bgFamily = pickBackgroundFamily(families);
    var accentFamily = pickAccentFamily(families, bgFamily);
    var secondaryFamily = pickSecondaryAccent(families, bgFamily, accentFamily);
    var textFamily = pickTextFamily(families, bgFamily);

    var isDarkBg = bgFamily.avgLuminance < 0.45;
    var bgHex = isDarkBg ? (bgFamily.darkest || bgFamily.representative) : (bgFamily.lightest || bgFamily.representative);
    var surfaceHex = C.pickDepthFromMembers(bgFamily.members, isDarkBg ? 1 : bgFamily.members.length - 2) || bgHex;
    var surfaceElev1 = C.pickDepthFromMembers(bgFamily.members, isDarkBg ? 2 : bgFamily.members.length - 3) || surfaceHex;
    var surfaceHover = C.pickDepthFromMembers(bgFamily.members, isDarkBg ? 3 : bgFamily.members.length - 4) || surfaceHex;

    var accentHex = accentFamily.representative;
    if (C.normalizeHex(accentHex) === C.normalizeHex(bgHex)) {
      accentHex = C.pickDepthFromMembers(
        accentFamily.members,
        isDarkBg ? accentFamily.members.length - 1 : Math.min(1, accentFamily.members.length - 1)
      ) || accentHex;
    }
    var accentSecondaryHex = secondaryFamily ? secondaryFamily.representative : null;

    var textCandidates = textFamily.members.map(function (m) { return m.hex; });
    if (!textCandidates.length) textCandidates = [isDarkBg ? '#f4f4f4' : '#1a1a1a'];

    var textPrimary = C.pickBestContrast(textCandidates, bgHex, 4.5) ||
      C.ensureContrast(textCandidates[0], bgHex, 4.5, textFamily.representative);
    var textSecondary = C.pickBestContrast(textCandidates, bgHex, 3) ||
      C.ensureContrast(C.pickDepthFromMembers(textFamily.members, 1) || textPrimary, bgHex, 3, textFamily.representative);

    var borderHex = C.pickDepthFromMembers(bgFamily.members, isDarkBg ? 2 : bgFamily.members.length - 2) || surfaceHex;
    var used = {};
    var roles = {};
    var reasoning = [];

    function assign(role, hex, reason) {
      if (!hex) return null;
      hex = C.normalizeHex(hex);
      if (used[hex]) {
        reasoning.push({
          role: role,
          skipped: true,
          reason: 'Omitido: el color ' + hex + ' ya está asignado a "' + used[hex] + '".'
        });
        return null;
      }
      used[hex] = role;
      roles[role] = hex;
      if (reason) {
        reasoning.push({ role: role, hex: hex, reason: reason });
      }
      return hex;
    }

    assign('background', bgHex,
      'El ' + bgFamily.name.toLowerCase() + ' se usa como fondo porque domina el área visual (' +
      Math.round(bgFamily.areaShare * 100) + '%) y construye profundidad sin alterar la identidad.');
    assign('surface', surfaceHex,
      'Superficie derivada de la misma familia cromática del fondo, un nivel más claro para jerarquía.');
    assign('surfaceElevation1', surfaceElev1,
      'Elevación adicional dentro de la familia principal del fondo.');
    assign('surfaceHover', surfaceHover,
      'Estado hover generado matemáticamente dentro de la familia del fondo.');
    assign('accentPrimary', accentHex,
      accentFamily.areaShare < 0.08
        ? 'El ' + accentFamily.name.toLowerCase() + ' fue seleccionado como acento principal porque concentra el mayor impacto visual del símbolo, aunque represente solo el ' + Math.round(accentFamily.areaShare * 100) + '% del área.'
        : 'El ' + accentFamily.name.toLowerCase() + ' actúa como acento principal por su peso de identidad y contraste frente al fondo.');
    if (accentSecondaryHex && accentSecondaryHex !== accentHex) {
      assign('accentSecondary', accentSecondaryHex,
        'Segundo acento tomado de la familia ' + secondaryFamily.name.toLowerCase() + ' para apoyar CTAs secundarios.');
    }
    assign('primaryText', textPrimary,
      'Texto principal elegido por contraste ' + C.contrastLevel(textPrimary, bgHex) + ' sobre el fondo, respetando colores del logo.');
    assign('secondaryText', textSecondary,
      'Texto secundario con contraste legible (' + C.contrastLevel(textSecondary, bgHex) + ') sin competir con el acento.');
    assign('border', borderHex,
      'Bordes y divisores tomados de la familia del fondo para coherencia cromática.');
    assign('primaryButton', roles.accentPrimary,
      'Botón principal usa el acento de marca para máxima reconocibilidad.');
    if (roles.accentSecondary) {
      assign('secondaryButton', roles.accentSecondary,
        'Botón secundario usa el segundo acento detectado en el logo.');
    }

    var success = pickSemanticFromFamilies(families, 'success');
    var warning = pickSemanticFromFamilies(families, 'warning');
    var danger = pickSemanticFromFamilies(families, 'danger');
    var info = pickSemanticFromFamilies(families, 'info');

    if (success) assign('success', success, 'Verde detectado en el logo — reutilizado para estados de éxito.');
    if (warning) assign('warning', warning, 'Tono cálido/ámbar del logo — reutilizado para advertencias.');
    if (danger) assign('danger', danger, 'Rojo detectado en el logo — reutilizado para errores.');
    if (info) assign('info', info, 'Azul informativo presente en el logo — reutilizado para mensajes informativos.');

    return {
      roles: roles,
      reasoning: reasoning,
      families: {
        background: bgFamily.key,
        accent: accentFamily.key,
        secondary: secondaryFamily ? secondaryFamily.key : null,
        text: textFamily.key
      },
      isDarkBackground: isDarkBg
    };
  }

  function inferBrandPersonality(families, roleData) {
    var chromatics = families.filter(function (f) { return f.type === 'chromatic'; });
    var avgSat = families.reduce(function (s, f) { return s + f.avgSaturation * f.areaShare; }, 0);
    var avgLum = families.reduce(function (s, f) { return s + f.avgLuminance * f.areaShare; }, 0);
    var warmArea = 0;
    var coolArea = 0;
    chromatics.forEach(function (f) {
      var h = C.hexToHsl(f.representative).h;
      if (C.isWarmHue(h)) warmArea += f.areaShare;
      else coolArea += f.areaShare;
    });

    var scores = {
      corporativo: (avgSat < 0.38 ? 3 : 0) + (chromatics.length <= 3 ? 2 : 0) + (avgLum < 0.42 ? 2 : 0),
      minimalista: (chromatics.length <= 2 ? 3 : 0) + (avgSat < 0.32 ? 2 : 0) + (families.length <= 4 ? 1 : 0),
      premium: (avgLum < 0.38 ? 2 : 0) + (avgSat < 0.45 ? 1 : 0) + (roleData.isDarkBackground ? 2 : 0),
      luxury: (avgLum < 0.35 ? 3 : 0) + (avgSat < 0.4 ? 2 : 0),
      industrial: (avgSat < 0.28 ? 2 : 0) + (coolArea > warmArea ? 2 : 0),
      tecnologico: (coolArea > warmArea * 1.2 ? 3 : 0) + (avgLum < 0.45 ? 1 : 0),
      arquitectonico: (chromatics.length <= 3 ? 2 : 0) + (avgSat < 0.35 ? 2 : 0) + (roleData.isDarkBackground ? 1 : 0),
      elegante: (avgSat < 0.42 ? 2 : 0) + (families.filter(function (f) { return f.type === 'neutral'; }).length >= 1 ? 2 : 0),
      inmobiliario: (roleData.isDarkBackground ? 2 : 0) + (avgSat < 0.45 ? 1 : 0) + (chromatics.length >= 2 ? 1 : 0),
      natural: (chromatics.some(function (f) {
        var h = C.hexToHsl(f.representative).h;
        return h >= 75 && h < 165;
      }) ? 3 : 0),
      financiero: (avgLum < 0.4 ? 2 : 0) + (coolArea > warmArea ? 2 : 0) + (chromatics.length <= 3 ? 1 : 0)
    };

    var ranked = Object.keys(scores).map(function (key) {
      return { id: key, score: scores[key] };
    }).sort(function (a, b) { return b.score - a.score; });

    return {
      primary: ranked[0].id,
      secondary: ranked[1] && ranked[1].score > 0 ? ranked[1].id : null,
      traits: ranked.filter(function (t) { return t.score > 0; }).slice(0, 4),
      metrics: {
        avgSaturation: Math.round(avgSat * 100),
        avgLuminance: Math.round(avgLum * 100),
        chromaticFamilies: chromatics.length,
        warmVsCool: warmArea >= coolArea ? 'warm' : 'cool'
      }
    };
  }

  function buildLegacyColors(roles, families) {
    var accent = roles.accentPrimary || roles.accentSecondary;
    var secondary = roles.accentSecondary || roles.surface || roles.surfaceElevation1;
    return {
      primary: accent || roles.background,
      secondary: secondary || roles.surface,
      tertiary: roles.accentSecondary || accent,
      accent: accent || roles.background,
      dark: families.find(function (f) { return f.type === 'neutral'; })
        ? (families.filter(function (f) { return f.type === 'neutral'; }).sort(function (a, b) {
          return a.avgLuminance - b.avgLuminance;
        })[0].darkest || roles.background)
        : roles.background,
      light: families.find(function (f) { return f.type === 'neutral'; })
        ? (families.filter(function (f) { return f.type === 'neutral'; }).sort(function (a, b) {
          return b.avgLuminance - a.avgLuminance;
        })[0].lightest || roles.surface)
        : roles.surface,
      neutral: roles.border || roles.surface,
      background: roles.background,
      surface: roles.surface,
      border: roles.border,
      success: roles.success || null,
      warning: roles.warning || null,
      error: roles.danger || null,
      info: roles.info || null,
      textPrimary: roles.primaryText,
      textSecondary: roles.secondaryText
    };
  }

  function analyze(samples, meta) {
    meta = meta || {};
    var entries = buildColorEntries(samples);
    if (entries.length > MAX_COLORS) entries = entries.slice(0, MAX_COLORS);

    var families = scoreFamilies(groupIntoFamilies(entries));
    var roleData = assignRoles(families);
    var personality = inferBrandPersonality(families, roleData);
    var colors = buildLegacyColors(roleData.roles, families);

    return {
      engine: 'brand-intelligence-v1',
      isDarkBackground: roleData.isDarkBackground,
      families: families.map(function (f) {
        return {
          key: f.key,
          name: f.name,
          type: f.type,
          representative: f.representative,
          areaShare: Math.round(f.areaShare * 1000) / 10,
          memberCount: f.members.length,
          members: f.members.map(function (m) {
            return {
              hex: m.hex,
              percent: Math.round(m.share * 1000) / 10
            };
          }),
          visualWeight: Math.round(f.visualWeight * 10) / 10,
          identityScore: Math.round(f.identityScore * 10) / 10
        };
      }),
      roles: roleData.roles,
      roleFamilies: roleData.families,
      reasoning: roleData.reasoning,
      personality: personality,
      colors: colors,
      variants: {
        accent: colors.accent ? C.deriveVariants(colors.accent) : null,
        background: colors.background ? C.deriveVariants(colors.background) : null
      },
      extracted: entries.map(function (e) {
        return {
          hex: e.hex,
          percent: Math.round(e.share * 1000) / 10,
          isNeutral: e.isNeutral,
          rank: e.rank
        };
      }),
      chromaticCount: families.filter(function (f) { return f.type === 'chromatic'; }).length,
      neutralCount: families.filter(function (f) { return f.type === 'neutral'; }).length,
      colorCount: entries.length,
      isMonochrome: families.filter(function (f) { return f.type === 'chromatic'; }).length === 0,
      meta: meta
    };
  }

  return {
    MIN_COLORS: MIN_COLORS,
    MAX_COLORS: MAX_COLORS,
    analyze: analyze
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-brand-intelligence.js');}catch(_e){}
