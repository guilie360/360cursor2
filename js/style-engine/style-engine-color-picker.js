console.log("BOOT ENTER js/style-engine/style-engine-color-picker.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-color-picker.js');}catch(_e){}
/* Style Engine — Color Picker profesional (popup independiente) */
var StyleEngineColorPicker = (function () {
  var MODAL_ID = 'styleEngineColorPicker';
  var state = {
    open: false,
    tokenKey: null,
    original: null,
    draft: null,
    onPreview: null,
    onApply: null,
    onCancel: null
  };

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseColor(input) {
    var s = String(input || '').trim();
    if (!s) return { r: 0, g: 0, b: 0, a: 1, hex: '#000000', hsl: '0, 0%, 0%' };
    var m;
    if ((m = s.match(/^#([0-9a-f]{3,8})$/i))) {
      var h = m[1];
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var r = parseInt(h.slice(0, 2), 16);
      var g = parseInt(h.slice(2, 4), 16);
      var b = parseInt(h.slice(4, 6), 16);
      var a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return rgbaToObj(r, g, b, a);
    }
    if ((m = s.match(/^rgba?\(([^)]+)\)/i))) {
      var p = m[1].split(',').map(function (x) { return parseFloat(x.trim()); });
      return rgbaToObj(p[0] || 0, p[1] || 0, p[2] || 0, p[3] != null ? p[3] : 1);
    }
    return { r: 17, g: 17, b: 17, a: 1, hex: '#111111', hsl: '0, 0%, 7%' };
  }

  function rgbaToObj(r, g, b, a) {
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    a = Math.max(0, Math.min(1, a));
    var hex = '#' + [r, g, b].map(function (n) {
      return n.toString(16).padStart(2, '0');
    }).join('');
    return Object.assign({ r: r, g: g, b: b, a: a, hex: hex }, { hsl: rgbToHsl(r, g, b) });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%';
  }

  function formatCssColor(c) {
    if (c.a < 1) return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toFixed(2) + ')';
    return c.hex;
  }

  function ensureModal() {
    var el = document.getElementById(MODAL_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = MODAL_ID;
    el.className = 'se-color-picker-modal';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="se-color-picker-box" role="dialog" aria-modal="true">' +
        '<div class="se-color-picker-head"><span>Color</span></div>' +
        '<div class="se-color-picker-body" id="styleEngineColorPickerBody"></div>' +
        '<div class="se-color-picker-foot">' +
          '<button type="button" class="style-engine-foot-btn" id="styleEngineColorCancel">Cancelar</button>' +
          '<button type="button" class="style-engine-foot-btn style-engine-foot-btn--primary" id="styleEngineColorApply">Aplicar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) close(false);
    });
    document.getElementById('styleEngineColorCancel').onclick = function () { close(false); };
    document.getElementById('styleEngineColorApply').onclick = function () { close(true); };
    return el;
  }

  function paletteSwatches(colors, attr) {
    if (!colors || !colors.length) return '<span class="se-palette-empty">—</span>';
    return colors.filter(Boolean).map(function (c) {
      return '<button type="button" class="se-palette-swatch" data-' + attr + '="' + escapeHtml(c) + '" style="background:' + escapeHtml(c) + '" aria-label="' + escapeHtml(c) + '"></button>';
    }).join('');
  }

  function renderBody() {
    var c = parseColor(state.draft);
    var recent = StyleEngineStore.getRecentColors();
    var project = StyleEngineStore.getProjectPalette();
    var ai = StyleEngineStore.getAiPalette();
    var body = document.getElementById('styleEngineColorPickerBody');
    if (!body) return;
    body.innerHTML =
      '<div class="se-color-picker-main">' +
        '<input type="color" class="se-color-native" id="seColorNative" value="' + escapeHtml(c.hex) + '">' +
        '<div class="se-color-fields">' +
          '<label>HEX<input type="text" id="seColorHex" value="' + escapeHtml(c.hex) + '"></label>' +
          '<label>RGB<input type="text" id="seColorRgb" value="' + c.r + ', ' + c.g + ', ' + c.b + '"></label>' +
          '<label>HSL<input type="text" id="seColorHsl" value="' + escapeHtml(c.hsl) + '"></label>' +
          '<label>Alpha<input type="range" id="seColorAlpha" min="0" max="1" step="0.01" value="' + c.a + '"><span id="seColorAlphaVal">' + c.a.toFixed(2) + '</span></label>' +
        '</div>' +
      '</div>' +
      '<div class="se-palette-block"><div class="se-palette-title">Paleta reciente</div><div class="se-palette-row">' + paletteSwatches(recent, 'recent') + '</div></div>' +
      '<div class="se-palette-block"><div class="se-palette-title">Paleta del proyecto</div><div class="se-palette-row">' + paletteSwatches([project.primary, project.secondary, project.accent, project.surface, project.background], 'project') + '</div></div>' +
      (ai ? '<div class="se-palette-block"><div class="se-palette-title">Sugerencias IA</div><div class="se-palette-row">' + paletteSwatches([ai.primary, ai.secondary, ai.accent, ai.surface, ai.background], 'ai') + '</div></div>' : '');

    bindBody();
  }

  function setDraftFromColor(c) {
    state.draft = formatCssColor(c);
    if (state.onPreview) state.onPreview(state.tokenKey, state.draft);
  }

  function bindBody() {
    var native = document.getElementById('seColorNative');
    var hex = document.getElementById('seColorHex');
    var alpha = document.getElementById('seColorAlpha');
    var alphaVal = document.getElementById('seColorAlphaVal');

    function syncFromParsed(parsed) {
      if (hex) hex.value = parsed.hex;
      if (native) native.value = parsed.hex;
      if (alpha) alpha.value = parsed.a;
      if (alphaVal) alphaVal.textContent = parsed.a.toFixed(2);
      setDraftFromColor(parsed);
    }

    if (native) native.oninput = function () { syncFromParsed(parseColor(native.value)); };
    if (hex) hex.onchange = function () { syncFromParsed(parseColor(hex.value)); };
    if (alpha) alpha.oninput = function () {
      var base = parseColor(hex ? hex.value : state.draft);
      base.a = parseFloat(alpha.value);
      syncFromParsed(rgbaToObj(base.r, base.g, base.b, base.a));
    };

    document.querySelectorAll('.se-palette-swatch').forEach(function (btn) {
      btn.onclick = function () {
        var val = btn.getAttribute('data-recent') || btn.getAttribute('data-project') || btn.getAttribute('data-ai');
        syncFromParsed(parseColor(val));
      };
    });
  }

  function open(tokenKey, currentValue, callbacks) {
    callbacks = callbacks || {};
    ensureModal();
    state.open = true;
    state.tokenKey = tokenKey;
    state.original = currentValue;
    state.draft = currentValue;
    state.onPreview = callbacks.onPreview;
    state.onApply = callbacks.onApply;
    state.onCancel = callbacks.onCancel;
    var modal = document.getElementById(MODAL_ID);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    renderBody();
  }

  function close(apply) {
    var modal = document.getElementById(MODAL_ID);
    if (!state.open) return null;
    if (!apply && state.onPreview) state.onPreview(state.tokenKey, state.original);
    if (apply) {
      if (state.onApply) state.onApply(state.tokenKey, state.draft);
      StyleEngineStore.pushRecentColor(state.draft);
    } else if (state.onCancel) {
      state.onCancel(state.tokenKey, state.original);
    }
    var result = { key: state.tokenKey, value: apply ? state.draft : state.original, applied: !!apply };
    state.open = false;
    state.tokenKey = null;
    state.onPreview = null;
    state.onApply = null;
    state.onCancel = null;
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    return result;
  }

  function isOpen() { return state.open; }

  return {
    open: open,
    close: close,
    isOpen: isOpen,
    parseColor: parseColor,
    formatCssColor: formatCssColor
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-color-picker.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-color-picker.js");
