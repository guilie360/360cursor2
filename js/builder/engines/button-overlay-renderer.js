/* BOXIES v0.4 — Shared BUTTON overlay HTML (canvas stage + picker preview). */
var ButtonOverlayRenderer = (function () {
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function cssToken(v) {
    return String(v == null ? '' : v)
      .replace(/[;\n\r{}]/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '');
  }

  function buttonIconGlyph(icon) {
    if (icon === 'arrow') return '→';
    if (icon === 'rotate-left') return '↺';
    if (icon === 'rotate-right') return '↻';
    if (icon === 'plus') return '+';
    return '';
  }

  function buttonPreviewClass(btn) {
    var style = (btn && btn.style) || 'button';
    if (style === 'chip') style = 'button';
    return 'builder-exp-ui-btn is-style-' + style +
      (btn && btn.icon ? ' has-icon' : '');
  }

  function presetVisualKeys() {
    if (typeof ButtonPresets !== 'undefined' && ButtonPresets.VISUAL_KEYS) {
      return ButtonPresets.VISUAL_KEYS;
    }
    return [
      'style', 'icon', 'boxW', 'boxH', 'bgColor', 'textColor', 'borderColor',
      'borderWidth', 'borderRadius', 'bgOpacity', 'opacity',
      'hoverEnabled', 'hoverColor', 'hoverTextColor', 'hoverTransition',
      'pressedColor', 'pressedTextColor', 'pressedScale'
    ];
  }

  /** Catalog + VM merge for preset buttons — same authoritative visuals as picker. */
  function resolvePresetRenderVm(b) {
    if (!b || !b.visualPresetId ||
        typeof ButtonPresets === 'undefined' || !ButtonPresets.get) {
      return b;
    }
    var cat = ButtonPresets.get(b.visualPresetId);
    if (!cat) return b;
    var v = Object.assign({}, b);
    presetVisualKeys().forEach(function (key) {
      if (cat[key] !== undefined) v[key] = cat[key];
      if (Object.prototype.hasOwnProperty.call(b, key) && b[key] !== undefined) {
        v[key] = b[key];
      }
    });
    return v;
  }

  /**
   * Same HTML contract as ExperienciaCanvas.paintButtonsStage() BUTTON branch.
   *
   * @param {object} b — button view model (ExperienciaEngine.buttonViewModel)
   * @param {object} [options]
   * @param {object} [options.selSet] — selected id map
   * @param {object} [options.editMemberSet] — group-edit member map
   * @param {string} [options.extraClass] — extra class tokens (e.g. is-selected, is-pending-move)
   * @param {boolean} [options.stage=true] — emit data-exp-stage-btn + editor attrs
   * @param {number|null} [options.x] — override paint x %
   * @param {number|null} [options.y] — override paint y %
   */
  function renderButtonHtml(b, options) {
    if (!b) return '';
    options = options || {};
    var selSet = options.selSet || {};
    var editMemberSet = options.editMemberSet || {};
    var extraClass = options.extraClass || '';
    var stageMode = options.stage !== false;
    var paintX = options.x != null ? Number(options.x) : Number(b.x);
    var paintY = options.y != null ? Number(options.y) : Number(b.y);
    var rot = Number(b.rotation) || 0;
    var styleBits = 'left:' + paintX + '%;top:' + paintY + '%;' +
      '--btn-rot:' + rot + 'deg;';

    var v = resolvePresetRenderVm(b);
    var glyph = buttonIconGlyph(v.icon);
    var text = b.label != null ? String(b.label) : '';
    var label;
    if (glyph && text) label = glyph + ' ' + text;
    else label = glyph || text || 'Botón';

    var btnOp = v.opacity != null ? Number(v.opacity) : 1;
    var hoverOn = v.hoverEnabled !== false;
    var hoverMs = v.hoverTransition != null ? Number(v.hoverTransition) : 200;
    var hoverCol = cssToken(v.hoverColor || '#6fbf86') || '#6fbf86';
    var hoverTextCol = cssToken(v.hoverTextColor || '#ffffff') || '#ffffff';
    var pressedCol = cssToken(v.pressedColor || '#5aaa74') || '#5aaa74';
    var pressedTextCol = cssToken(v.pressedTextColor || '#ffffff') || '#ffffff';
    var pressedScale = v.pressedScale != null ? Number(v.pressedScale) : 0.96;
    var boxW = v.boxW != null ? Number(v.boxW) : 14;
    var boxH = v.boxH != null ? Number(v.boxH) : 4.5;
    var bgOp = v.bgOpacity != null ? Number(v.bgOpacity) : 1;

    styleBits +=
      'width:' + boxW + '%;height:' + boxH + '%;' +
      '--btn-opacity:' + btnOp + ';' +
      '--btn-hover-color:' + hoverCol + ';' +
      '--btn-hover-text:' + hoverTextCol + ';' +
      '--btn-hover-ms:' + hoverMs + 'ms;' +
      '--btn-pressed-color:' + pressedCol + ';' +
      '--btn-pressed-text:' + pressedTextCol + ';' +
      '--btn-pressed-scale:' + pressedScale + ';';
    if (v.bgColor) {
      styleBits += '--btn-local-bg:' + cssToken(v.bgColor) + ';' +
        '--btn-local-bg-a:' + bgOp + ';';
    }
    if (v.textColor) styleBits += '--btn-local-text:' + cssToken(v.textColor) + ';';
    if (v.borderColor) styleBits += '--btn-local-border:' + cssToken(v.borderColor) + ';';
    if (v.borderWidth != null) styleBits += '--btn-local-bw:' + Number(v.borderWidth) + 'px;';
    if (v.borderRadius != null) styleBits += '--btn-local-radius:' + Number(v.borderRadius) + 'px;';

    var id = String(b.id || 'btn');
    var className = buttonPreviewClass(v) +
      ' is-box' +
      (selSet[id] ? ' is-selected' : '') +
      (editMemberSet[id] ? ' is-group-edit-member' : '') +
      (b.visible === false ? ' is-invisible' : '') +
      (b.locked ? ' is-locked' : '') +
      (extraClass ? ' ' + extraClass : '') +
      (hoverOn ? ' is-hover-on' : ' is-hover-off') +
      (v.visualPresetId || v.bgColor || v.textColor || v.borderColor ||
        v.borderWidth != null || v.borderRadius != null
        ? ' has-local-look' : '');

    var attrs = stageMode
      ? (' data-exp-stage-btn="' + esc(id) + '"' +
        (b.locked ? ' data-locked="1"' : '') +
        ' data-hover-color="' + esc(hoverCol) + '"' +
        ' data-hover-text="' + esc(hoverTextCol) + '"' +
        ' data-box-w="' + boxW + '" data-box-h="' + boxH + '"')
      : ' data-button-preview="1" tabindex="-1"';

    return '<button type="button" class="' + className + '"' + attrs +
      ' style="' + styleBits + '">' +
      esc(label) +
      '</button>';
  }

  /**
   * Scale boxW/boxH % so the preset bbox fits the picker tile layer (same aspect ratio).
   */
  function pickerFitBoxPercents(vm, layerW, layerH) {
    var boxW = vm && vm.boxW != null ? Number(vm.boxW) : 14;
    var boxH = vm && vm.boxH != null ? Number(vm.boxH) : 4.5;
    var btnWPx = (boxW / 100) * layerW;
    var btnHPx = (boxH / 100) * layerH;
    if (!btnWPx || !btnHPx) return { boxW: boxW, boxH: boxH };
    var pad = 0.1;
    var fitW = layerW * (1 - pad * 2);
    var fitH = layerH * (1 - pad * 2);
    var scale = Math.min(fitW / btnWPx, fitH / btnHPx);
    return {
      boxW: Math.min(100, Math.round(boxW * scale * 10) / 10),
      boxH: Math.min(100, Math.round(boxH * scale * 10) / 10)
    };
  }

  /** Picker tile layer size — matches .qe-shape-picker__item (52×52). */
  var PICKER_LAYER_SIZE = 52;

  /**
   * Picker cell — shared renderer inside tile layer (no artificial stage / ancestor scale).
   */
  function renderPickerPreviewHtml(preset) {
    if (!preset || typeof ButtonPresets === 'undefined') return '';
    var layerW = PICKER_LAYER_SIZE;
    var layerH = PICKER_LAYER_SIZE;
    var ix = ButtonPresets.buildPreviewIx(preset);
    var fakeNode = { id: 'preview-scene', config: { interactions: [] } };
    var vm = null;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buttonViewModel) {
      vm = ExperienciaEngine.buttonViewModel(
        {},
        fakeNode,
        ix,
        layerW,
        layerH
      );
    }
    if (!vm) return '';
    var fit = pickerFitBoxPercents(vm, layerW, layerH);
    var previewVm = Object.assign({}, vm, { boxW: fit.boxW, boxH: fit.boxH });
    var btnHtml = renderButtonHtml(previewVm, { stage: false, x: 50, y: 50 });
    return '<div class="qe-button-picker__layer" aria-hidden="true">' + btnHtml + '</div>';
  }

  return {
    renderButtonHtml: renderButtonHtml,
    renderPickerPreviewHtml: renderPickerPreviewHtml,
    buttonPreviewClass: buttonPreviewClass,
    buttonIconGlyph: buttonIconGlyph
  };
})();
