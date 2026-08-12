/* BOXIES v0.4 — Button visual presets (appearance only; no behavior). */
var ButtonPresets = (function () {
  var VISUAL_KEYS = [
    'style', 'icon', 'boxW', 'boxH', 'bgColor', 'textColor', 'borderColor',
    'borderWidth', 'borderRadius', 'bgOpacity', 'opacity',
    'hoverEnabled', 'hoverColor', 'hoverTextColor', 'hoverTransition',
    'pressedColor', 'pressedTextColor', 'pressedScale'
  ];

  /** Fields that must survive normalize / bridge clone for preset buttons. */
  var INTERACTION_VISUAL_KEYS = ['visualPresetId'].concat(VISUAL_KEYS);

  /** Mini stage size for picker previews — same % semantics as canvas overlay layer. */
  var PREVIEW_LAYER_W = 360;
  var PREVIEW_LAYER_H = 203;

  /**
   * Prepared for 16 presets — only 2 test entries for Paso 2.
   * Visual fields only; behavior is applied separately on create.
   */
  var PRESETS = [
    {
      id: 'preset_01',
      label: 'Botón',
      style: 'button',
      icon: null,
      boxW: 14,
      boxH: 4.5,
      bgColor: '#000000',
      textColor: '#ffffff',
      borderColor: '#d1d1d1',
      borderWidth: 1,
      borderRadius: 10,
      bgOpacity: 1,
      opacity: 1,
      hoverEnabled: true,
      hoverColor: '#ffffff',
      hoverTextColor: '#ffffff',
      hoverTransition: 200,
      pressedColor: '#d1d1d1',
      pressedTextColor: '#111111',
      pressedScale: 0.96
    },
    {
      id: 'preset_02',
      label: 'Botón',
      style: 'icon',
      icon: null,
      boxW: 5.5,
      boxH: 5.5,
      bgColor: '#ffffff',
      textColor: '#111111',
      borderColor: '#d1d1d1',
      borderWidth: 1,
      borderRadius: 999,
      bgOpacity: 1,
      opacity: 1,
      hoverEnabled: true,
      hoverColor: '#111111',
      hoverTextColor: '#ffffff',
      hoverTransition: 200,
      pressedColor: '#d1d1d1',
      pressedTextColor: '#111111',
      pressedScale: 0.96
    }
  ];

  var byId = Object.create(null);
  PRESETS.forEach(function (p) {
    if (p && p.id) byId[String(p.id)] = p;
  });

  function list() {
    return PRESETS.slice();
  }

  function get(id) {
    return byId[String(id || '')] || null;
  }

  function applyVisuals(ix, preset) {
    if (!ix || !preset) return ix;
    if (preset.label != null) ix.label = String(preset.label);
    VISUAL_KEYS.forEach(function (key) {
      if (preset[key] !== undefined) ix[key] = preset[key];
    });
    if (ix.color != null) delete ix.color;
    return ix;
  }

  /** Write full preset payload onto a BUTTON interaction (authoritative at create). */
  function applyToInteraction(ix, preset, presetId) {
    if (!ix || !preset) return ix;
    var pid = presetId != null && presetId !== '' ? presetId : preset.id;
    if (pid) ix.visualPresetId = String(pid);
    return applyVisuals(ix, preset);
  }

  function buildPreviewIx(preset) {
    var ix = {
      id: 'preview-' + (preset && preset.id ? preset.id : 'btn'),
      type: 'BUTTON',
      label: (preset && preset.label) || 'Botón',
      x: 50,
      y: 50,
      rotation: 0,
      positionInitialized: true,
      positionMode: 'free',
      marginX: 0,
      marginY: 0,
      buttonType: 'unconfigured',
      buttonConfig: {}
    };
    return applyToInteraction(ix, preset);
  }

  return {
    list: list,
    get: get,
    applyVisuals: applyVisuals,
    applyToInteraction: applyToInteraction,
    buildPreviewIx: buildPreviewIx,
    VISUAL_KEYS: VISUAL_KEYS,
    INTERACTION_VISUAL_KEYS: INTERACTION_VISUAL_KEYS,
    PREVIEW_LAYER_W: PREVIEW_LAYER_W,
    PREVIEW_LAYER_H: PREVIEW_LAYER_H
  };
})();
