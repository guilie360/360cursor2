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

  return {
    normalizeHex: normalizeHex,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    hexToHsl: hexToHsl,
    adjustLightness: adjustLightness,
    relativeLuminance: relativeLuminance,
    saturation: saturation,
    isNeutral: isNeutral,
    colorDistance: colorDistance,
    pickTextOnBg: pickTextOnBg,
    pickTextSecondaryOnBg: pickTextSecondaryOnBg,
    deriveVariants: deriveVariants
  };
})();
