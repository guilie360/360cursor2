try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-color-math.js');}catch(_e){}
/* Utilidades cromáticas: solo variaciones de luminosidad (hue fijo) */
var ThemeColorMath = (function () {
  function normalizeHex(hex) {
    var h = String(hex || '').trim();
    if (!h) return '#000000';
    if (h.charAt(0) !== '#') h = '#' + h;
    if (h.length === 4) {
      h = '#' + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) + h.charAt(3) + h.charAt(3);
    }
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : '#000000';
  }

  function hexToRgb(hex) {
    hex = normalizeHex(hex);
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
    function part(n) {
      var s = clamp(n).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + part(r) + part(g) + part(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    if (s === 0) {
      var gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h / 360) * 255),
      b: Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255)
    };
  }

  function hexToHsl(hex) {
    var c = hexToRgb(hex);
    return rgbToHsl(c.r, c.g, c.b);
  }

  function hslToHex(h, s, l) {
    var c = hslToRgb(h, s, l);
    return rgbToHex(c.r, c.g, c.b);
  }

  function adjustLightness(hex, delta) {
    var hsl = hexToHsl(hex);
    return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l + delta)));
  }

  function relativeLuminance(hex) {
    var c = hexToRgb(hex);
    function channel(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function saturation(hex) {
    return hexToHsl(hex).s / 100;
  }

  function isNeutral(hex) {
    var hsl = hexToHsl(hex);
    return hsl.s < 8;
  }

  function colorDistance(a, b) {
    var c1 = hexToRgb(a);
    var c2 = hexToRgb(b);
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  function pickTextOnBg(bgHex) {
    return relativeLuminance(bgHex) > 0.5 ? '#111111' : '#f5f5f5';
  }

  function pickTextSecondaryOnBg(bgHex, textPrimary) {
    if (textPrimary === '#111111' || textPrimary === '#1a1a1a') {
      return adjustLightness(bgHex, -28);
    }
    return adjustLightness(bgHex, 22);
  }

  function deriveVariants(baseHex) {
    return {
      base: normalizeHex(baseHex),
      hover: adjustLightness(baseHex, -6),
      active: adjustLightness(baseHex, -12),
      tint20: adjustLightness(baseHex, 20),
      tint10: adjustLightness(baseHex, 10),
      tint5: adjustLightness(baseHex, 5),
      tint2: adjustLightness(baseHex, 2),
      shade20: adjustLightness(baseHex, -20),
      shade10: adjustLightness(baseHex, -10)
    };
  }

  function contrastRatio(hexA, hexB) {
    var l1 = relativeLuminance(hexA);
    var l2 = relativeLuminance(hexB);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function contrastLevel(hexA, hexB) {
    var ratio = contrastRatio(hexA, hexB);
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'AA-large';
    return 'fail';
  }

  function pickBestContrast(candidates, bgHex, minRatio) {
    if (!candidates || !candidates.length) return null;
    var sorted = candidates.slice().sort(function (a, b) {
      return contrastRatio(b, bgHex) - contrastRatio(a, bgHex);
    });
    for (var i = 0; i < sorted.length; i++) {
      if (contrastRatio(sorted[i], bgHex) >= minRatio) return normalizeHex(sorted[i]);
    }
    return normalizeHex(sorted[0]);
  }

  function ensureContrast(fgHex, bgHex, minRatio, baseFamilyHex) {
    var fg = normalizeHex(fgHex);
    if (contrastRatio(fg, bgHex) >= minRatio) return fg;
    var base = normalizeHex(baseFamilyHex || fg);
    var deltas = [8, 12, 16, 20, -8, -12, -16, -20, 24, -24, 28, -28];
    for (var i = 0; i < deltas.length; i++) {
      var candidate = adjustLightness(base, deltas[i]);
      if (contrastRatio(candidate, bgHex) >= minRatio) return candidate;
    }
    return fg;
  }

  function hueFamilyKey(hex) {
    var hsl = hexToHsl(hex);
    if (hsl.s < 8) {
      var band = Math.round(hsl.l / 8);
      return 'neutral-' + band;
    }
    var hueBucket = Math.round(hsl.h / 18);
    var satBand = hsl.s >= 45 ? 'vivid' : (hsl.s >= 22 ? 'rich' : 'soft');
    return 'hue-' + hueBucket + '-' + satBand;
  }

  function familyDisplayName(key, sampleHex) {
    if (key.indexOf('neutral') === 0) {
      var l = hexToHsl(sampleHex).l;
      if (l >= 78) return 'Blanco / Claro';
      if (l >= 55) return 'Gris claro';
      if (l >= 35) return 'Gris medio';
      return 'Oscuro / Profundo';
    }
    var h = hexToHsl(sampleHex).h;
    if (h < 20 || h >= 340) return 'Rojo';
    if (h < 45) return 'Naranja';
    if (h < 70) return 'Amarillo / Dorado';
    if (h < 160) return 'Verde';
    if (h < 200) return 'Cian / Turquesa';
    if (h < 260) return 'Azul';
    if (h < 310) return 'Violeta';
    return 'Magenta';
  }

  function sortByLightness(hexList) {
    return hexList.slice().sort(function (a, b) {
      return hexToHsl(a).l - hexToHsl(b).l;
    });
  }

  function pickFamilyDepth(baseHex, steps) {
    steps = steps || 0;
    return adjustLightness(baseHex, steps * 6);
  }

  function pickDepthFromMembers(members, index) {
    if (!members || !members.length) return null;
    var sorted = members.slice().sort(function (a, b) {
      return hexToHsl(a.hex).l - hexToHsl(b.hex).l;
    });
    var idx = Math.max(0, Math.min(sorted.length - 1, index));
    return normalizeHex(sorted[idx].hex);
  }

  function isWarmHue(h) {
    h = ((h % 360) + 360) % 360;
    return h < 70 || h >= 330;
  }

  function semanticHueKind(hex) {
    var h = hexToHsl(hex).h;
    if (hexToHsl(hex).s < 12) return null;
    h = ((h % 360) + 360) % 360;
    if (h >= 75 && h < 165) return 'success';
    if (h >= 35 && h < 75) return 'warning';
    if (h < 25 || h >= 330) return 'danger';
    if (h >= 195 && h < 240) return 'info';
    return null;
  }

  return {
    normalizeHex: normalizeHex,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    hexToHsl: hexToHsl,
    hslToHex: hslToHex,
    adjustLightness: adjustLightness,
    relativeLuminance: relativeLuminance,
    saturation: saturation,
    isNeutral: isNeutral,
    colorDistance: colorDistance,
    pickTextOnBg: pickTextOnBg,
    pickTextSecondaryOnBg: pickTextSecondaryOnBg,
    deriveVariants: deriveVariants,
    contrastRatio: contrastRatio,
    contrastLevel: contrastLevel,
    pickBestContrast: pickBestContrast,
    ensureContrast: ensureContrast,
    hueFamilyKey: hueFamilyKey,
    familyDisplayName: familyDisplayName,
    sortByLightness: sortByLightness,
    pickFamilyDepth: pickFamilyDepth,
    pickDepthFromMembers: pickDepthFromMembers,
    isWarmHue: isWarmHue,
    semanticHueKind: semanticHueKind
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-color-math.js');}catch(_e){}
