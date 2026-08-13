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

  function hasLocalLook(vm) {
    return !!(vm && (
      vm.bgColor || vm.textColor || vm.borderColor ||
      vm.borderWidth != null || vm.borderRadius != null
    ));
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

    var glyph = buttonIconGlyph(b.icon);
    var text = b.label != null ? String(b.label) : '';
    var label;
    if (glyph && text) label = glyph + ' ' + text;
    else label = glyph || text || 'Botón';

    var btnOp = b.opacity != null ? Number(b.opacity) : 1;
    var hoverOn = b.hoverEnabled !== false;
    var hoverMs = b.hoverTransition != null ? Number(b.hoverTransition) : 200;
    var hoverCol = cssToken(b.hoverColor || '#6fbf86') || '#6fbf86';
    var hoverTextCol = cssToken(b.hoverTextColor || '#ffffff') || '#ffffff';
    var pressedCol = cssToken(b.pressedColor || '#5aaa74') || '#5aaa74';
    var pressedTextCol = cssToken(b.pressedTextColor || '#ffffff') || '#ffffff';
    var pressedScale = b.pressedScale != null ? Number(b.pressedScale) : 0.96;
    var boxW = b.boxW != null ? Number(b.boxW) : 14;
    var boxH = b.boxH != null ? Number(b.boxH) : 4.5;
    var bgOp = b.bgOpacity != null ? Number(b.bgOpacity) : 1;

    styleBits +=
      'width:' + boxW + '%;height:' + boxH + '%;' +
      '--btn-opacity:' + btnOp + ';' +
      '--btn-hover-color:' + hoverCol + ';' +
      '--btn-hover-text:' + hoverTextCol + ';' +
      '--btn-hover-ms:' + hoverMs + 'ms;' +
      '--btn-pressed-color:' + pressedCol + ';' +
      '--btn-pressed-text:' + pressedTextCol + ';' +
      '--btn-pressed-scale:' + pressedScale + ';';
    if (b.bgColor) {
      styleBits += '--btn-local-bg:' + cssToken(b.bgColor) + ';' +
        '--btn-local-bg-a:' + bgOp + ';';
    }
    if (b.textColor) styleBits += '--btn-local-text:' + cssToken(b.textColor) + ';';
    if (b.borderColor) styleBits += '--btn-local-border:' + cssToken(b.borderColor) + ';';
    if (b.borderWidth != null) styleBits += '--btn-local-bw:' + Number(b.borderWidth) + 'px;';
    if (b.borderRadius != null) styleBits += '--btn-local-radius:' + Number(b.borderRadius) + 'px;';

    var id = String(b.id || 'btn');
    var className = buttonPreviewClass(b) +
      ' is-box' +
      (selSet[id] ? ' is-selected' : '') +
      (editMemberSet[id] ? ' is-group-edit-member' : '') +
      (b.visible === false ? ' is-invisible' : '') +
      (b.locked ? ' is-locked' : '') +
      (extraClass ? ' ' + extraClass : '') +
      (hoverOn ? ' is-hover-on' : ' is-hover-off') +
      (hasLocalLook(b) ? ' has-local-look' : '');

    var attrs = stageMode
      ? (' data-exp-stage-btn="' + esc(id) + '"' +
        (b.locked ? ' data-locked="1"' : '') +
        ' data-hover-color="' + esc(hoverCol) + '"' +
        ' data-hover-text="' + esc(hoverTextCol) + '"' +
        ' data-box-w="' + boxW + '" data-box-h="' + boxH + '"')
      : ' data-button-preview="1" aria-hidden="true"';

    if (stageMode) {
      return '<button type="button" class="' + className + '"' + attrs +
        ' style="' + styleBits + '">' +
        esc(label) +
        '</button>';
    }
    return '<span class="' + className + '"' + attrs +
      ' style="' + styleBits + '">' +
      esc(label) +
      '</span>';
  }

  /**
   * Shared VM + HTML path for canvas stage and picker (same interaction → same DOM).
   */
  function renderButtonFromIx(ix, n, state, options) {
    if (!ix || typeof ExperienciaEngine === 'undefined' || !ExperienciaEngine.buttonViewModel) {
      return '';
    }
    options = options || {};
    var layerW = options.layerW != null ? Number(options.layerW) : 1000;
    var layerH = options.layerH != null ? Number(options.layerH) : 1000;
    var vm = ExperienciaEngine.buttonViewModel(state || null, n, ix, layerW, layerH);
    if (!vm) return '';
    return renderButtonHtml(vm, options);
  }

  /**
   * Preview-only: scale boxW/boxH % so the bbox fits the preview layer (keeps aspect).
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
   * Picker cell — preview-only 16:9 mini stage (same % semantics as canvas), scaled into tile.
   */
  function renderPickerPreviewHtml(preset) {
    if (!preset || typeof ButtonPresets === 'undefined') return '';
    var refW = ButtonPresets.PREVIEW_LAYER_W || 360;
    var refH = ButtonPresets.PREVIEW_LAYER_H || 203;
    var tile = PICKER_LAYER_SIZE;
    var stageScale = Math.min(tile / refW, tile / refH);
    var ix = ButtonPresets.buildPreviewIx(preset);
    var fakeNode = { id: 'preview-scene', config: { interactions: [ix] } };
    var vm = null;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buttonViewModel) {
      vm = ExperienciaEngine.buttonViewModel(null, fakeNode, ix, refW, refH);
    }
    if (!vm) return '';
    var fit = pickerFitBoxPercents(vm, refW, refH);
    var previewVm = Object.assign({}, vm, { boxW: fit.boxW, boxH: fit.boxH });
    var btnHtml = renderButtonHtml(previewVm, { stage: false, x: 50, y: 50 });
    return '<div class="qe-button-picker__layer" aria-hidden="true">' +
      '<div class="qe-button-picker__stage" style="width:' + refW + 'px;height:' + refH + 'px;' +
      'transform:scale(' + stageScale + ');transform-origin:center center;">' +
      btnHtml +
      '</div></div>';
  }

  /**
   * Saved component thumbnail — same renderer path as canvas/picker (preview-only scale).
   */
  function renderButtonSnapshotThumbnail(snap) {
    if (!snap) return '';
    var refW = (typeof ButtonPresets !== 'undefined' && ButtonPresets.PREVIEW_LAYER_W)
      ? ButtonPresets.PREVIEW_LAYER_W : 360;
    var refH = (typeof ButtonPresets !== 'undefined' && ButtonPresets.PREVIEW_LAYER_H)
      ? ButtonPresets.PREVIEW_LAYER_H : 203;
    var thumbW = 112;
    var thumbH = 70;
    var stageScale = Math.min(thumbW / refW, thumbH / refH);
    var ix = Object.assign({
      id: 'component-thumb',
      type: 'BUTTON',
      label: 'Botón',
      x: 50,
      y: 50,
      positionInitialized: true,
      positionMode: 'free',
      buttonType: 'unconfigured',
      buttonConfig: {}
    }, snap || {});
    var fakeNode = { id: 'preview-scene', config: { interactions: [ix] } };
    var vm = null;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buttonViewModel) {
      vm = ExperienciaEngine.buttonViewModel(null, fakeNode, ix, refW, refH);
    }
    if (!vm) return '';
    var fit = pickerFitBoxPercents(vm, refW, refH);
    var previewVm = Object.assign({}, vm, { boxW: fit.boxW, boxH: fit.boxH });
    var btnHtml = renderButtonHtml(previewVm, { stage: false, x: 50, y: 50 });
    return '<div class="qe-component-picker__viewport" aria-hidden="true">' +
      '<div class="qe-button-picker__stage qe-component-picker__stage"' +
        ' style="width:' + refW + 'px;height:' + refH + 'px;' +
        'transform:translate(-50%,-50%) scale(' + stageScale + ');">' +
      btnHtml +
      '</div></div>';
  }

  return {
    renderButtonHtml: renderButtonHtml,
    renderButtonFromIx: renderButtonFromIx,
    renderPickerPreviewHtml: renderPickerPreviewHtml,
    renderButtonSnapshotThumbnail: renderButtonSnapshotThumbnail,
    buttonPreviewClass: buttonPreviewClass,
    buttonIconGlyph: buttonIconGlyph
  };
})();
