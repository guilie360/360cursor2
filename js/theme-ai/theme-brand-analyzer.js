try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-brand-analyzer.js');}catch(_e){}
/* Extracción densa del logo + Brand Intelligence Engine */
var ThemeBrandAnalyzer = (function () {
  var C = ThemeColorMath;
  var MAX_SAMPLE = 512;
  var MERGE_DISTANCE = 8;
  var MIN_PIXEL_SHARE = 0.001;
  var TARGET_MIN = ThemeBrandIntelligence.MIN_COLORS;
  var TARGET_MAX = ThemeBrandIntelligence.MAX_COLORS;

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

  function extractRichSamples(img) {
    var canvas = document.createElement('canvas');
    var ratio = img.width / img.height || 1;
    var width = ratio >= 1 ? MAX_SAMPLE : Math.max(64, Math.round(MAX_SAMPLE * ratio));
    var height = ratio >= 1 ? Math.max(64, Math.round(MAX_SAMPLE / ratio)) : MAX_SAMPLE;
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    var data = ctx.getImageData(0, 0, width, height).data;
    var counts = {};
    var spatial = {};
    var total = 0;
    var cx = (width - 1) / 2;
    var cy = (height - 1) / 2;
    var maxDist = Math.sqrt(cx * cx + cy * cy) || 1;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = (y * width + x) * 4;
        if (data[i + 3] < 128) continue;
        var hex = C.rgbToHex(data[i], data[i + 1], data[i + 2]);
        counts[hex] = (counts[hex] || 0) + 1;
        if (!spatial[hex]) spatial[hex] = { center: 0, edge: 0, n: 0 };
        var dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) / maxDist;
        spatial[hex].center += 1 - dist;
        spatial[hex].edge += dist;
        spatial[hex].n += 1;
        total += 1;
      }
    }

    return { counts: counts, spatial: spatial, total: total, width: width, height: height };
  }

  function clusterColors(counts, spatial, total, mergeDistance, minShare) {
    var entries = Object.keys(counts).map(function (hex) {
      var norm = C.normalizeHex(hex);
      var sp = spatial[hex] || spatial[norm] || { center: 0, edge: 0, n: 1 };
      return {
        hex: norm,
        count: counts[hex],
        share: counts[hex] / total,
        centerWeight: sp.n ? sp.center / sp.n : 0,
        edgeWeight: sp.n ? sp.edge / sp.n : 0
      };
    }).sort(function (a, b) { return b.count - a.count; });

    var clusters = [];
    entries.forEach(function (entry) {
      if (entry.share < minShare) return;
      var cluster = null;
      for (var i = 0; i < clusters.length; i++) {
        if (C.colorDistance(clusters[i].representative, entry.hex) <= mergeDistance) {
          cluster = clusters[i];
          break;
        }
      }
      if (!cluster) {
        cluster = {
          representative: entry.hex,
          count: 0,
          centerWeight: 0,
          edgeWeight: 0,
          members: []
        };
        clusters.push(cluster);
      }
      cluster.count += entry.count;
      cluster.centerWeight += entry.centerWeight * entry.count;
      cluster.edgeWeight += entry.edgeWeight * entry.count;
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
          centerWeight: cluster.centerWeight / cluster.count,
          edgeWeight: cluster.edgeWeight / cluster.count
        };
      })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function tuneSampleCount(samples) {
    if (samples.length >= TARGET_MIN && samples.length <= TARGET_MAX) return samples;
    if (samples.length > TARGET_MAX) return samples.slice(0, TARGET_MAX);
    return samples;
  }

  function buildPaletteFromSamples(samples, meta) {
    var intelligence = ThemeBrandIntelligence.analyze(samples, meta);
    return {
      colors: intelligence.colors,
      roles: intelligence.roles,
      families: intelligence.families,
      reasoning: intelligence.reasoning,
      personality: intelligence.personality,
      roleFamilies: intelligence.roleFamilies,
      variants: intelligence.variants,
      extracted: intelligence.extracted,
      chromaticCount: intelligence.chromaticCount,
      neutralCount: intelligence.neutralCount,
      colorCount: intelligence.colorCount,
      isMonochrome: intelligence.isMonochrome,
      engine: intelligence.engine,
      isDarkBackground: intelligence.isDarkBackground
    };
  }

  function buildFingerprint(file) {
    return [file.name, file.size, file.lastModified, file.type].join('|');
  }

  function analyzeImage(file) {
    return loadImageSource(file).then(function (img) {
      var sampled = extractRichSamples(img);
      if (!sampled.total) {
        throw new Error('No se detectaron colores en la imagen.');
      }

      var mergeDistance = MERGE_DISTANCE;
      var minShare = MIN_PIXEL_SHARE;
      var clusters = clusterColors(sampled.counts, sampled.spatial, sampled.total, mergeDistance, minShare);

      if (clusters.length < TARGET_MIN) {
        clusters = clusterColors(sampled.counts, sampled.spatial, sampled.total, 4, 0.0005);
      }
      if (clusters.length < TARGET_MIN) {
        clusters = clusterColors(sampled.counts, sampled.spatial, sampled.total, 2, 0.0002);
      }
      if (clusters.length > TARGET_MAX) {
        mergeDistance = 12;
        clusters = clusterColors(sampled.counts, sampled.spatial, sampled.total, mergeDistance, minShare);
      }

      clusters = tuneSampleCount(clusters);
      if (!clusters.length) {
        throw new Error('No se detectaron colores suficientes en la imagen.');
      }

      var palette = buildPaletteFromSamples(clusters, {
        width: sampled.width,
        height: sampled.height,
        sampledPixels: sampled.total
      });

      return {
        sourceType: SOURCE_TYPES.image,
        fingerprint: buildFingerprint(file),
        fileName: file.name,
        palette: palette,
        metrics: {
          avgLuminance: clusters.reduce(function (sum, c) {
            return sum + C.relativeLuminance(c.hex) * c.share;
          }, 0),
          colorCount: palette.colorCount,
          chromaticCount: palette.chromaticCount,
          familyCount: palette.families ? palette.families.length : 0
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

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-brand-analyzer.js');}catch(_e){}
