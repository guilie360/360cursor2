/* BOXIES v0.4 — Shared BUTTON overlay HTML (canvas stage + picker preview + runtime). */
var BUTTON_OVERLAY_RENDERER_BUILD = 'ws7980';
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

  /** Canvas / picker label — icon-only when text is explicitly empty. */
  function formatButtonDisplayLabel(b) {
    var glyph = buttonIconGlyph(b && b.icon);
    var text = b && b.label != null ? String(b.label) : '';
    if (glyph && text) return glyph + ' ' + text;
    if (glyph) return glyph;
    if (text) return text;
    return 'Botón';
  }

  function buttonPreviewClass(btn, options) {
    options = options || {};
    var style = (btn && btn.style) || 'button';
    if (style === 'chip') style = 'button';
    if (options.runtime) {
      return 'qr-ix-btn qr-ix-btn--' + style + ' is-style-' + style +
        (btn && btn.icon ? ' has-icon' : '');
    }
    return 'builder-exp-ui-btn is-style-' + style +
      (btn && btn.icon ? ' has-icon' : '');
  }

  function isButtonShapeKind(kind) {
    kind = String(kind || '').toUpperCase();
    return kind === 'SHAPE_RECT' || kind === 'SHAPE_CIRCLE' ||
      kind === 'SHAPE_ROUND_RECT' || kind === 'SHAPE_CAPSULE';
  }

  function resolveButtonShapeKind(b) {
    if (!b) return '';
    var kind = b.buttonShapeKind ? String(b.buttonShapeKind).toUpperCase() : '';
    return isButtonShapeKind(kind) ? kind : '';
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
        ? (ButtonPresets.defaultVisual('hoverColor') || '#6fbf86')
        : '#6fbf86';
    }
    if (b.hoverColor != null && b.hoverColor !== '') {
      return cssToken(b.hoverColor) || String(b.hoverColor);
    }
    if (typeof ButtonPresets !== 'undefined' && ButtonPresets.defaultVisual) {
      return ButtonPresets.defaultVisual('hoverColor') || '#6fbf86';
    }
    return '#6fbf86';
  }

  function appendHoverStyleBits(styleBits, b) {
    b = hydrateVisualFromPreset(b);
    var hoverOn = b.hoverEnabled !== false;
    var hoverMs = b.hoverTransition != null ? Number(b.hoverTransition) : 200;
    var hoverCol = resolveButtonHoverColor(b);
    var hoverTextCol = cssToken(b.hoverTextColor || '#ffffff') || '#ffffff';
    var pressedCol = cssToken(b.pressedColor || defaultPressedColor()) || defaultPressedColor();
    var pressedTextCol = cssToken(b.pressedTextColor || '#ffffff') || '#ffffff';
    var pressedScale = b.pressedScale != null ? Number(b.pressedScale) : 0.96;
    styleBits +=
      '--btn-hover-color:' + hoverCol + ';' +
      '--btn-hover-text:' + hoverTextCol + ';' +
      '--btn-hover-ms:' + hoverMs + 'ms;' +
      '--btn-pressed-color:' + pressedCol + ';' +
      '--btn-pressed-text:' + pressedTextCol + ';' +
      '--btn-pressed-scale:' + pressedScale + ';';
    return { styleBits: styleBits, hoverOn: hoverOn, hoverCol: hoverCol, hoverTextCol: hoverTextCol };
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
    var runtimeMode = !!options.runtime;
    var stageMode = runtimeMode ? true : options.stage !== false;
    var paintX = options.x != null ? Number(options.x) : Number(b.x);
    var paintY = options.y != null ? Number(options.y) : Number(b.y);
    var rot = Number(b.rotation) || 0;
    var styleBits = 'left:' + paintX + '%;top:' + paintY + '%;' +
      '--btn-rot:' + rot + 'deg;';

    var label = formatButtonDisplayLabel(b);
    var btnOp = b.opacity != null ? Number(b.opacity) : 1;
    var boxW = b.boxW != null ? Number(b.boxW) : 14;
    var boxH = b.boxH != null ? Number(b.boxH) : 4.5;
    var hoverBits = appendHoverStyleBits('', b);

    styleBits +=
      'width:' + boxW + '%;height:' + boxH + '%;' +
      '--btn-opacity:' + btnOp + ';' +
      hoverBits.styleBits;
    styleBits = appendLocalLookStyle(styleBits, b);
    if (runtimeMode) {
      styleBits += 'transform:translate(-50%,-50%) rotate(' + rot + 'deg);';
      if (btnOp !== 1) styleBits += 'opacity:' + btnOp + ';';
    }

    var id = String(b.id || 'btn');
    var className = buttonPreviewClass(b, { runtime: runtimeMode }) +
      ' is-box' +
      (selSet[id] ? ' is-selected' : '') +
      (editMemberSet[id] ? ' is-group-edit-member' : '') +
      (b.visible === false ? ' is-invisible' : '') +
      (b.locked ? ' is-locked' : '') +
      (extraClass ? ' ' + extraClass : '') +
      (hoverBits.hoverOn ? ' is-hover-on' : ' is-hover-off') +
      (hasLocalLook(b) ? ' has-local-look' : '');

    var attrs = stageMode
      ? ((runtimeMode ? '' : (' data-exp-stage-btn="' + esc(id) + '"')) +
        (b.locked ? ' data-locked="1"' : '') +
        ' data-hover-color="' + esc(hoverBits.hoverCol) + '"' +
        ' data-hover-text="' + esc(hoverBits.hoverTextCol) + '"' +
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
   * Shape-backed BUTTON — same SVG contract as ExperienciaCanvas.paintButtonShapeBackedHtml().
   */
  function renderShapeBackedButtonHtml(b, shapeKind, layerW, layerH, options) {
    if (!b || !shapeKind) return '';
    options = options || {};
    var runtimeMode = !!options.runtime;
    b = hydrateVisualFromPreset(b);
    shapeKind = String(shapeKind || '').toUpperCase();
    var rot = Number(b.rotation) || 0;
    var boxW = b.boxW != null ? Number(b.boxW) : 14;
    var boxH = b.boxH != null ? Number(b.boxH) : 4.5;
    var btnOp = b.opacity != null ? Number(b.opacity) : 1;
    var textCol = cssToken(b.textColor || '#ffffff') || '#ffffff';
    var hoverBits = appendHoverStyleBits('', b);
    var styleBits = 'left:' + Number(b.x) + '%;top:' + Number(b.y) + '%;' +
      '--btn-rot:' + rot + 'deg;' +
      'width:' + boxW + '%;height:' + boxH + '%;' +
      'background:transparent;border:none;' +
      '--btn-opacity:' + btnOp + ';' +
      '--t-color:' + textCol + ';' +
      hoverBits.styleBits;
    if (runtimeMode) {
      styleBits += 'transform:translate(-50%,-50%) rotate(' + rot + 'deg);';
      if (btnOp !== 1) styleBits += 'opacity:' + btnOp + ';';
    }

    var shapeSvg = '';
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buildSceneShapeSvg) {
      var bgOp = b.bgOpacity != null ? Number(b.bgOpacity) : 1;
      shapeSvg = ExperienciaEngine.buildSceneShapeSvg(shapeKind, {
        fill: rgbaFromColor(b.bgColor || '#141414', bgOp) || 'rgba(20,20,20,0.92)',
        stroke: b.borderColor || 'rgba(255,255,255,0.62)',
        strokeWidth: b.borderWidth != null ? Number(b.borderWidth) : 1,
        borderRadius: b.borderRadius != null ? Number(b.borderRadius) : 16,
        stretchX: 1,
        stretchY: 1,
        strokeGlowLayer: true,
        svgClass: 'builder-exp-stage-shape__svg',
        preserveAspect: 'none',
        tightViewBox: true,
        contentBoxWPct: boxW,
        contentBoxHPct: boxH,
        layerW: layerW,
        layerH: layerH
      });
    }

    var style = (b.style || 'button');
    if (style === 'chip') style = 'button';
    var className = (runtimeMode
      ? ('qr-ix-btn qr-ix-btn--shape is-button-shape is-box is-style-' + style +
        (b.icon ? ' has-icon' : ''))
      : (buttonPreviewClass(b) + ' is-button-shape')) +
      (hoverBits.hoverOn ? ' is-hover-on' : ' is-hover-off');

    return '<button type="button" class="' + className + '"' +
      ' data-hover-color="' + esc(hoverBits.hoverCol) + '"' +
      ' data-hover-text="' + esc(hoverBits.hoverTextCol) + '"' +
      ' data-box-w="' + boxW + '" data-box-h="' + boxH + '"' +
      ' style="' + styleBits + '">' +
      '<span class="qr-ix-shape-svg" aria-hidden="true">' + shapeSvg + '</span>' +
      '<span class="qr-ix-btn-shape-label">' + esc(formatButtonDisplayLabel(b)) + '</span>' +
      '</button>';
  }

  function runtimeButtonViewModel(ix, layerW, layerH) {
    if (!ix) return null;
    var normalized = Object.assign({}, ix);
    if (typeof SceneButtonModel !== 'undefined' && SceneButtonModel.normalize) {
      normalized = SceneButtonModel.normalize(normalized);
    }
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buttonViewModel) {
      var fakeNode = { id: 'qr-runtime-scene', config: { interactions: [normalized] } };
      return ExperienciaEngine.buttonViewModel(null, fakeNode, normalized, layerW, layerH);
    }
    return hydrateVisualFromPreset(normalized);
  }

  /** Editor-parity DOM mount for QuotationRuntime (.qr-ix-btn). */
  function createRuntimeButtonElement(ix, layerW, layerH) {
    var vm = runtimeButtonViewModel(ix, layerW, layerH);
    if (!vm) return null;
    vm = hydrateVisualFromPreset(vm);
    var shapeKind = resolveButtonShapeKind(vm);
    var html = shapeKind
      ? renderShapeBackedButtonHtml(vm, shapeKind, layerW, layerH, { runtime: true })
      : renderButtonHtml(vm, { stage: false, runtime: true });
    if (!html) return null;
    var wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
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
    renderShapeBackedButtonHtml: renderShapeBackedButtonHtml,
    renderButtonFromIx: renderButtonFromIx,
    createRuntimeButtonElement: createRuntimeButtonElement,
    runtimeButtonViewModel: runtimeButtonViewModel,
    hydrateVisualFromPreset: hydrateVisualFromPreset,
    resolveButtonShapeKind: resolveButtonShapeKind,
    renderPickerPreviewHtml: renderPickerPreviewHtml,
    renderButtonSnapshotThumbnail: renderButtonSnapshotThumbnail,
    buttonPreviewClass: buttonPreviewClass,
    buttonIconGlyph: buttonIconGlyph,
    formatButtonDisplayLabel: formatButtonDisplayLabel
  };
})();
