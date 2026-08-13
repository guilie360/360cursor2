/* BOXIES v0.4 — Shared BUTTON overlay HTML (canvas stage + picker preview). */
var BUTTON_OVERLAY_RENDERER_BUILD = 'ws7912';
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
      vm.visualPresetId ||
      vm.bgColor || vm.textColor || vm.borderColor ||
      vm.borderWidth != null || vm.borderRadius != null
    ));
  }

  /** Fill missing paint fields from catalog when interaction lost colors but kept visualPresetId. */
  function hydrateVisualFromPreset(vm) {
    var presetId = vm && (vm.visualPresetId || (vm._ix && vm._ix.visualPresetId) || null);
    if (!vm || !presetId || typeof ButtonPresets === 'undefined') return vm;
    var preset = ButtonPresets.get(presetId);
    if (!preset) return vm;
    var out = Object.assign({}, vm, { visualPresetId: String(presetId) });
    var keys = ButtonPresets.VISUAL_KEYS || [];
    keys.forEach(function (key) {
      if (out[key] != null && out[key] !== '') return;
      if (preset[key] !== undefined) out[key] = preset[key];
    });
    return out;
  }

  function rgbaFromColor(color, alpha) {
    color = cssToken(color);
    if (!color) return '';
    if (color.indexOf('rgba(') === 0 || color.indexOf('rgb(') === 0) return color;
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      var r = parseInt(color.slice(1, 3), 16);
      var g = parseInt(color.slice(3, 5), 16);
      var b = parseInt(color.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    return color;
  }

  /** CSS variables + direct inline paint props for preset/local button look. */
  function appendLocalLookStyle(styleBits, b) {
    var bgOp = b.bgOpacity != null ? Number(b.bgOpacity) : 1;
    if (b.bgColor) {
      var bg = cssToken(b.bgColor);
      styleBits += '--btn-local-bg:' + bg + ';--btn-local-bg-a:' + bgOp + ';';
      styleBits += 'background-color:' + rgbaFromColor(bg, bgOp) + ';';
    }
    if (b.textColor) {
      var text = cssToken(b.textColor);
      styleBits += '--btn-local-text:' + text + ';color:' + text + ';';
    }
    if (b.borderColor != null || b.borderWidth != null) {
      var border = cssToken(b.borderColor || 'rgba(255,255,255,0.62)');
      var bw = b.borderWidth != null ? Number(b.borderWidth) : 1;
      styleBits += '--btn-local-border:' + border + ';--btn-local-bw:' + bw + 'px;';
      styleBits += 'border:' + bw + 'px solid ' + border + ';';
    }
    if (b.borderRadius != null && !isNaN(Number(b.borderRadius))) {
      var radius = Number(b.borderRadius);
      styleBits += '--btn-local-radius:' + radius + 'px;border-radius:' + radius + 'px;';
    }
    return styleBits;
  }

  function resolveButtonHoverColor(b) {
    if (!b) {
      return (typeof ButtonPresets !== 'undefined' && ButtonPresets.defaultVisual)
        ? (ButtonPresets.defaultVisual('hoverColor') || '')
        : '';
    }
    if (b.hoverColor != null && b.hoverColor !== '') {
      return cssToken(b.hoverColor) || String(b.hoverColor);
    }
    if (b.visualPresetId) return '';
    return (typeof ButtonPresets !== 'undefined' && ButtonPresets.defaultVisual)
      ? (ButtonPresets.defaultVisual('hoverColor') || '')
      : '';
  }

  function defaultPressedColor() {
    return (typeof ButtonPresets !== 'undefined' && ButtonPresets.defaultVisual)
      ? (ButtonPresets.defaultVisual('pressedColor') || '#5aaa74')
      : '#5aaa74';
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
    b = hydrateVisualFromPreset(b);
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
    var hoverCol = resolveButtonHoverColor(b);
    var hoverTextCol = cssToken(b.hoverTextColor || '#ffffff') || '#ffffff';
    var pressedCol = cssToken(b.pressedColor || defaultPressedColor()) || defaultPressedColor();
    var pressedTextCol = cssToken(b.pressedTextColor || '#ffffff') || '#ffffff';
    var pressedScale = b.pressedScale != null ? Number(b.pressedScale) : 0.96;
    var boxW = b.boxW != null ? Number(b.boxW) : 14;
    var boxH = b.boxH != null ? Number(b.boxH) : 4.5;

    styleBits +=
      'width:' + boxW + '%;height:' + boxH + '%;' +
      '--btn-opacity:' + btnOp + ';' +
      (hoverCol ? ('--btn-hover-color:' + hoverCol + ';') : '') +
      '--btn-hover-text:' + hoverTextCol + ';' +
      '--btn-hover-ms:' + hoverMs + 'ms;' +
      '--btn-pressed-color:' + pressedCol + ';' +
      '--btn-pressed-text:' + pressedTextCol + ';' +
      '--btn-pressed-scale:' + pressedScale + ';';
    styleBits = appendLocalLookStyle(styleBits, b);

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
    var shapeKind = snap.buttonShapeKind ? String(snap.buttonShapeKind).toUpperCase() : '';
    var useShape = shapeKind === 'SHAPE_RECT' || shapeKind === 'SHAPE_CIRCLE' ||
      shapeKind === 'SHAPE_ROUND_RECT' || shapeKind === 'SHAPE_CAPSULE';
    var refW = (typeof ButtonPresets !== 'undefined' && ButtonPresets.PREVIEW_LAYER_W)
      ? ButtonPresets.PREVIEW_LAYER_W : 360;
    var refH = (typeof ButtonPresets !== 'undefined' && ButtonPresets.PREVIEW_LAYER_H)
      ? ButtonPresets.PREVIEW_LAYER_H : 203;
    var thumbW = 112;
    var thumbH = 70;
    var stageScale = Math.min(thumbW / refW, thumbH / refH);
    if (useShape && typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buildSceneShapeSvg) {
      var bgOp = snap.bgOpacity != null ? Number(snap.bgOpacity) : 1;
      var fill = snap.bgColor || '#141414';
      if (/^#[0-9a-fA-F]{6}$/.test(fill)) {
        var r = parseInt(fill.slice(1, 3), 16);
        var g = parseInt(fill.slice(3, 5), 16);
        var b = parseInt(fill.slice(5, 7), 16);
        fill = 'rgba(' + r + ',' + g + ',' + b + ',' + bgOp + ')';
      }
      var shapeSvg = ExperienciaEngine.buildSceneShapeSvg(shapeKind, {
        fill: fill,
        stroke: snap.borderColor || 'rgba(255,255,255,0.62)',
        strokeWidth: snap.borderWidth != null ? Number(snap.borderWidth) : 1,
        borderRadius: snap.borderRadius != null ? Number(snap.borderRadius) : 16,
        preserveAspect: 'meet'
      });
      return '<div class="qe-component-picker__viewport" aria-hidden="true">' +
        '<div class="qe-button-picker__stage qe-component-picker__stage"' +
          ' style="width:' + refW + 'px;height:' + refH + 'px;' +
          'transform:translate(-50%,-50%) scale(' + stageScale + ');">' +
          shapeSvg +
        '</div></div>';
    }
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
