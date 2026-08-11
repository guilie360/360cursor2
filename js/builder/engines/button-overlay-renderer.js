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
      (b.bgColor || b.textColor || b.borderColor || b.borderWidth != null || b.borderRadius != null
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
   * Picker cell — real renderer inside a scaled mini stage (same % layer semantics).
   */
  function renderPickerPreviewHtml(preset) {
    if (!preset || typeof ButtonPresets === 'undefined') return '';
    var ix = ButtonPresets.buildPreviewIx(preset);
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureButtonVisualDefaults) {
      ExperienciaEngine.ensureButtonVisualDefaults(ix);
    }
    var fakeNode = { id: 'preview-scene', config: { interactions: [] } };
    var vm = null;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buttonViewModel) {
      vm = ExperienciaEngine.buttonViewModel(
        {},
        fakeNode,
        ix,
        ButtonPresets.PREVIEW_LAYER_W,
        ButtonPresets.PREVIEW_LAYER_H
      );
    }
    if (!vm) return '';
    var btnHtml = renderButtonHtml(vm, { stage: false, x: 50, y: 50 });
    return '' +
      '<span class="qe-button-picker__stage" aria-hidden="true">' +
        btnHtml +
      '</span>';
  }

  return {
    renderButtonHtml: renderButtonHtml,
    renderPickerPreviewHtml: renderPickerPreviewHtml,
    buttonPreviewClass: buttonPreviewClass,
    buttonIconGlyph: buttonIconGlyph
  };
})();
