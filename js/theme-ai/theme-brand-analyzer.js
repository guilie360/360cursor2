/* Extracción fiel de colores del logo — sin inventar ni interpolar tonos */
var ThemeBrandAnalyzer = (function () {
  var C = ThemeColorMath;
  var MAX_SAMPLE = 256;
  var MERGE_DISTANCE = 14;
  var MIN_PIXEL_SHARE = 0.008;

  var SOURCE_TYPES = {
    image: 'image',
    website: 'website',
    pdf: 'pdf',
    brandManual: 'brand-manual',
    renderFolder: 'render-folder',
    projectPhoto: 'project-photo'
  };

  function loadImageSource(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('No se recibió ninguna imagen.'));
        return;
      }
      var type = String(file.type || '').toLowerCase();
      var name = String(file.name || '').toLowerCase();
      var isSvg = type === 'image/svg+xml' || name.slice(-4) === '.svg';
      if (isSvg) {
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () { resolve(img); };
          img.onerror = function () { reject(new Error('No se pudo leer el SVG.')); };
          img.src = reader.result;
        };
        reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
        reader.readAsDataURL(file);
        return;
      }
      if (type.indexOf('image/') !== 0) {
        reject(new Error('Formato no soportado. Usa PNG, JPG, JPEG o SVG.'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo cargar la imagen.'));
      };
      img.src = url;
    });
  }

  function extractExactCounts(img) {
    var canvas = document.createElement('canvas');
    var ratio = img.width / img.height || 1;
    var width = ratio >= 1 ? MAX_SAMPLE : Math.max(48, Math.round(MAX_SAMPLE * ratio));
    var height = ratio >= 1 ? Math.max(48, Math.round(MAX_SAMPLE / ratio)) : MAX_SAMPLE;
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    var data = ctx.getImageData(0, 0, width, height).data;
    var counts = {};
    var total = 0;

    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      var hex = C.rgbToHex(data[i], data[i + 1], data[i + 2]);
      counts[hex] = (counts[hex] || 0) + 1;
      total += 1;
    }

    return { counts: counts, total: total };
  }

  function clusterExactColors(counts, total) {
    var entries = Object.keys(counts).map(function (hex) {
      return { hex: C.normalizeHex(hex), count: counts[hex], share: counts[hex] / total };
    }).sort(function (a, b) { return b.count - a.count; });

    var clusters = [];
    entries.forEach(function (entry) {
      if (entry.share < MIN_PIXEL_SHARE) return;
      var cluster = null;
      for (var i = 0; i < clusters.length; i++) {
        if (C.colorDistance(clusters[i].representative, entry.hex) <= MERGE_DISTANCE) {
          cluster = clusters[i];
          break;
        }
      }
      if (!cluster) {
        cluster = { representative: entry.hex, count: 0, members: [] };
        clusters.push(cluster);
      }
      cluster.count += entry.count;
      cluster.members.push(entry);
      if (entry.count > (counts[cluster.representative] || 0)) {
        cluster.representative = entry.hex;
      }
    });

    return clusters
      .map(function (cluster) {
        var best = cluster.members.slice().sort(function (a, b) { return b.count - a.count; })[0];
        return {
          hex: best.hex,
          count: cluster.count,
          share: cluster.count / total,
          isNeutral: C.isNeutral(best.hex)
        };
      })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function buildPaletteFromClusters(clusters) {
    var chromatic = clusters.filter(function (c) { return !c.isNeutral; });
    var neutrals = clusters.filter(function (c) { return c.isNeutral; });
    var isMonochrome = chromatic.length === 0;

    var primary = isMonochrome
      ? (neutrals[0] ? neutrals[0].hex : '#1a1a1a')
      : chromatic[0].hex;
    var secondary = chromatic[1] ? chromatic[1].hex : null;
    var tertiary = chromatic[2] ? chromatic[2].hex : null;
    var accent = tertiary || secondary || primary;

    var darkNeutral = neutrals.length
      ? neutrals.slice().sort(function (a, b) { return C.relativeLuminance(a.hex) - C.relativeLuminance(b.hex); })[0].hex
      : C.adjustLightness(primary, -35);
    var lightNeutral = neutrals.length
      ? neutrals.slice().sort(function (a, b) { return C.relativeLuminance(b.hex) - C.relativeLuminance(a.hex); })[0].hex
      : C.adjustLightness(primary, 35);
    var neutral = neutrals[0] ? neutrals[0].hex : C.adjustLightness(primary, 0);

    var background = lightNeutral;
    var surface = secondary || C.adjustLightness(primary, 8);
    var border = neutrals[1] ? neutrals[1].hex : C.adjustLightness(primary, -8);
    var dark = darkNeutral;
    var light = lightNeutral;

    var textPrimary;
    var textSecondary;
    if (C.relativeLuminance(background) > 0.52) {
      textPrimary = dark;
      textSecondary = neutrals[2] ? neutrals[2].hex : C.adjustLightness(dark, 12);
    } else {
      textPrimary = light;
      textSecondary = neutrals[2] ? neutrals[2].hex : C.adjustLightness(light, -12);
    }

    if (isMonochrome) {
      background = lightNeutral;
      surface = neutrals[1] ? neutrals[1].hex : C.adjustLightness(primary, 6);
      border = C.adjustLightness(primary, -12);
      accent = primary;
      secondary = neutrals[1] ? neutrals[1].hex : C.adjustLightness(primary, 10);
      textPrimary = C.relativeLuminance(background) > 0.55 ? dark : light;
      textSecondary = C.relativeLuminance(background) > 0.55
        ? (neutrals[2] ? neutrals[2].hex : C.adjustLightness(dark, 12))
        : (neutrals[2] ? neutrals[2].hex : C.adjustLightness(light, -12));
    }

    if (!secondary) secondary = C.adjustLightness(primary, 10);
    if (!tertiary) tertiary = accent;

    var colors = {
      primary: primary,
      secondary: secondary,
      accent: accent,
      tertiary: tertiary,
      dark: dark,
      light: light,
      neutral: neutral,
      background: background,
      surface: surface,
      border: border,
      success: C.adjustLightness(primary, -5),
      warning: C.adjustLightness(accent, 5),
      error: C.adjustLightness(primary, -15),
      textPrimary: textPrimary,
      textSecondary: textSecondary
    };

    return {
      colors: colors,
      variants: {
        primary: C.deriveVariants(primary),
        accent: C.deriveVariants(accent)
      },
      extracted: clusters.map(function (c, index) {
        return {
          hex: c.hex,
          percent: Math.round(c.share * 1000) / 10,
          isNeutral: c.isNeutral,
          rank: index + 1
        };
      }),
      chromaticCount: chromatic.length,
      neutralCount: neutrals.length,
      isMonochrome: isMonochrome
    };
  }

  function buildFingerprint(file) {
    return [file.name, file.size, file.lastModified, file.type].join('|');
  }

  function analyzeImage(file) {
    return loadImageSource(file).then(function (img) {
      var sampled = extractExactCounts(img);
      if (!sampled.total) {
        throw new Error('No se detectaron colores en la imagen.');
      }
      var clusters = clusterExactColors(sampled.counts, sampled.total);
      if (!clusters.length) {
        throw new Error('No se detectaron colores suficientes en la imagen.');
      }
      var palette = buildPaletteFromClusters(clusters);

      return {
        sourceType: SOURCE_TYPES.image,
        fingerprint: buildFingerprint(file),
        fileName: file.name,
        palette: palette,
        metrics: {
          avgLuminance: clusters.reduce(function (sum, c) {
            return sum + C.relativeLuminance(c.hex) * c.share;
          }, 0),
          colorCount: clusters.length,
          chromaticCount: palette.chromaticCount
        }
      };
    });
  }

  return {
    SOURCE_TYPES: SOURCE_TYPES,
    analyzeImage: analyzeImage,
    buildFingerprint: buildFingerprint
  };
})();
