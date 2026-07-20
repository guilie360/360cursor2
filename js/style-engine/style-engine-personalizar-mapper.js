console.log("BOOT ENTER js/style-engine/style-engine-personalizar-mapper.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-personalizar-mapper.js');}catch(_e){}
/* Style Engine — Personalizar 2.0: draft V1 → tokens SE + materiales ThemeSystem */
var StyleEnginePersonalizarMapper = (function () {
  var DEPTH_TO_TOKEN = {
    low: { card: 0.05, popup: 0.08, panel: 0.04 },
    medium: { card: 0.12, popup: 0.21, panel: 0.1 },
    high: { card: 0.28, popup: 0.55, panel: 0.22 }
  };

  var MASK_BLUR_PX = { low: 6, medium: 16, high: 32 };

  var SHADOW_TO_TOKEN = {
    glass: {
      sm: '0 2px 8px rgba(0,0,0,0.1)',
      md: '0 4px 16px rgba(0,0,0,0.12)',
      lg: '0 12px 32px rgba(0,0,0,0.22)',
      card: '0 4px 16px rgba(0,0,0,0.12)',
      popup: '0 12px 32px rgba(0,0,0,0.22)',
      button: '0 4px 12px rgba(0,0,0,0.1)'
    },
    soft: {
      sm: '0 2px 8px rgba(0,0,0,0.18)',
      md: '0 10px 36px rgba(0,0,0,0.34)',
      lg: '0 16px 48px rgba(0,0,0,0.42)',
      card: '0 10px 36px rgba(0,0,0,0.34)',
      popup: '0 24px 70px rgba(0,0,0,0.55)',
      button: '0 6px 20px rgba(0,0,0,0.28)'
    },
    solid: {
      sm: '0 4px 12px rgba(0,0,0,0.28)',
      md: '0 16px 52px rgba(0,0,0,0.52)',
      lg: '0 24px 64px rgba(0,0,0,0.6)',
      card: '0 16px 52px rgba(0,0,0,0.52)',
      popup: '0 32px 88px rgba(0,0,0,0.72)',
      button: '0 10px 32px rgba(0,0,0,0.42)'
    }
  };

  var GLASS_BLUR = {
    solid: { sm: 0, md: 4, lg: 8 },
    soft: { sm: 8, md: 14, lg: 18 },
    glass: { sm: 14, md: 20, lg: 26 }
  };

  function normalizeDraft(raw) {
    if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.normalizeCustomConfig === 'function') {
      return ThemeSystem.normalizeCustomConfig(raw);
    }
    return raw && typeof raw === 'object' ? Object.assign({}, raw) : {};
  }

  function textColors(textMode) {
    if (textMode === 'dark') {
      return { primary: '#1a1a1a', secondary: '#505050', muted: '#707070' };
    }
    return { primary: '#f7f7f7', secondary: '#c8c8c8', muted: '#8a8a8a' };
  }

  function borderFrom(bg, textMode) {
    var tint = textMode === 'dark' ? '#000000' : '#ffffff';
    return 'color-mix(in srgb, ' + bg + ' 76%, ' + tint + ')';
  }

  function maskOpacity(maskGlass) {
    if (maskGlass === 'solid') return 0.94;
    if (maskGlass === 'glass') return 0.48;
    return 0.7;
  }

  /**
   * Convierte el draft de Personalizar V1 en tokens del Style Engine.
   * Los materiales finos (glass por capa, CTA, etc.) se aplican aparte con applyMaterials.
   */
  function draftToRules(draft, baseRules) {
    draft = normalizeDraft(draft);
    var rules = Object.assign(
      {},
      typeof StyleEngineTokens !== 'undefined' ? StyleEngineTokens.getDefaultRules() : {},
      baseRules || {}
    );

    var text = textColors(draft.textMode);
    var depth = DEPTH_TO_TOKEN[draft.visualDepth] || DEPTH_TO_TOKEN.medium;
    var shadows = SHADOW_TO_TOKEN[draft.shadowGlass] || SHADOW_TO_TOKEN.soft;
    var blur = GLASS_BLUR[draft.bgGlass] || GLASS_BLUR.soft;
    var panelBlur = GLASS_BLUR[draft.panelGlass] || GLASS_BLUR.soft;
    var maskBlur = MASK_BLUR_PX[draft.maskBlur] || MASK_BLUR_PX.medium;

    rules.surface = draft.menuColor || draft.bg;
    rules['surface-elevated'] = draft.bg;
    rules['surface-floating'] = draft.bg;
    rules['sidebar-background'] = draft.menuColor || draft.bg;
    rules['popup-background'] = draft.bg;
    rules['color-accent'] = draft.accent;
    rules['color-primary'] = text.primary;
    rules['color-secondary'] = text.secondary;
    rules['text-primary'] = text.primary;
    rules['text-secondary'] = text.secondary;
    rules['text-muted'] = text.muted;
    rules.border = borderFrom(draft.bg, draft.textMode);
    rules.divider = borderFrom(draft.bg, draft.textMode);
    rules.overlay = draft.maskColor || '#000000';
    rules['overlay-backdrop'] = 'color-mix(in srgb, ' + (draft.maskColor || '#000000') + ' ' +
      Math.round(maskOpacity(draft.maskGlass) * 100) + '%, transparent)';
    rules['overlay-opacity'] = String(maskOpacity(draft.maskGlass));
    rules['overlay-blur'] = String(maskBlur);
    rules['blur-sm'] = String(blur.sm);
    rules['blur-md'] = String(blur.md);
    rules['blur-lg'] = String(Math.max(panelBlur.lg, blur.lg));
    rules['shadow-sm'] = shadows.sm;
    rules['shadow-md'] = shadows.md;
    rules['shadow-lg'] = shadows.lg;
    rules['card-shadow'] = shadows.card;
    rules['popup-shadow'] = shadows.popup;
    rules['button-shadow'] = shadows.button;
    rules['depth-card'] = String(depth.card);
    rules['depth-popup'] = String(depth.popup);
    rules['depth-panel'] = String(depth.panel);
    rules['glass-transparency'] = draft.bgGlass === 'glass' ? '0.72' :
      (draft.bgGlass === 'soft' ? '0.38' : '0.08');

    if (typeof StyleEngineTokens !== 'undefined' && StyleEngineTokens.normalizeRules) {
      return StyleEngineTokens.normalizeRules(rules);
    }
    return rules;
  }

  /**
   * Aplica los materiales de Personalizar V1 (misma calidad que ThemeSystem.previewCustomTheme).
   * Se ejecuta DESPUÉS del bridge SE → legacy para no perder glass/CTA/máscara.
   */
  function applyMaterials(draft) {
    draft = normalizeDraft(draft);
    if (!draft || typeof ThemeSystem === 'undefined') return false;
    if (typeof ThemeSystem.previewCustomTheme !== 'function') return false;

    ThemeSystem.previewCustomTheme(draft);
    if (typeof ThemeSystem.applyHeroLayout === 'function') {
      ThemeSystem.applyHeroLayout(draft.heroLayout);
    }
    document.documentElement.setAttribute('data-personalizar-v2', 'true');
    if (document.body) {
      document.body.setAttribute('data-personalizar-v2', 'true');
    }
    return true;
  }

  function clearMaterialsFlag() {
    document.documentElement.removeAttribute('data-personalizar-v2');
    if (document.body) document.body.removeAttribute('data-personalizar-v2');
  }

  return {
    normalizeDraft: normalizeDraft,
    draftToRules: draftToRules,
    applyMaterials: applyMaterials,
    clearMaterialsFlag: clearMaterialsFlag
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-personalizar-mapper.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-personalizar-mapper.js");
