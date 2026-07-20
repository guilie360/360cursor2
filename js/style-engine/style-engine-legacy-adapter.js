console.log("BOOT ENTER js/style-engine/style-engine-legacy-adapter.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-legacy-adapter.js');}catch(_e){}
/* Style Engine — Legacy Adapter: Theme Legacy → Visual System → CSS vars */
var StyleEngineLegacyAdapter = (function () {
  function r(rules, key, fallback) {
    if (!rules) return fallback || '';
    var v = rules[key];
    return v != null && v !== '' ? v : (fallback || '');
  }

  function mix(colorA, colorB, pct) {
    return 'color-mix(in srgb, ' + colorA + ' ' + pct + '%, ' + colorB + ')';
  }

  /**
   * Convierte tokens del Design System en el payload completo de variables CSS
   * que consume components.css y variables.css (sin tocar ThemeSystem).
   */
  function buildLegacyPayload(rules) {
    rules = rules || StyleEngineTokens.getDefaultRules();

    var surface = r(rules, 'surface', '#111111');
    var elevated = r(rules, 'surface-elevated', '#181818');
    var floating = r(rules, 'surface-floating', elevated);
    var text = r(rules, 'text-primary', '#ffffff');
    var textSec = r(rules, 'text-secondary', r(rules, 'color-secondary', text));
    var textMuted = r(rules, 'text-muted', '#8a8a8a');
    var accent = r(rules, 'color-accent', '#c8873a');
    var border = r(rules, 'border', 'rgba(255,255,255,0.1)');
    var popupBg = r(rules, 'popup-background', elevated);
    var overlay = r(rules, 'overlay-backdrop', r(rules, 'overlay', 'rgba(0,0,0,0.62)'));
    var sidebarBg = r(rules, 'sidebar-background', surface);

    var blurLg = r(rules, 'blur-lg', 22) + 'px';
    var blurMd = r(rules, 'blur-md', 12) + 'px';
    var overlayBlur = r(rules, 'overlay-blur', 8) + 'px';
    var shadowSm = r(rules, 'shadow-sm', '0 2px 8px rgba(0,0,0,0.18)');
    var shadowMd = r(rules, 'shadow-md', '0 8px 24px rgba(0,0,0,0.24)');
    var shadowPopup = r(rules, 'popup-shadow', r(rules, 'shadow-popup', '0 20px 56px rgba(0,0,0,0.3)'));
    var shadowCard = r(rules, 'card-shadow', r(rules, 'shadow-card', shadowMd));
    var btnShadow = r(rules, 'button-shadow', shadowSm);
    if (btnShadow === 'none') btnShadow = shadowSm;

    var hover = mix(text, elevated, 9);
    var glassSurface = mix(text, surface, 4.5);
    var glassPanel = mix(surface, 'transparent', 28);
    var btnSurface = mix(text, surface, 4.5);

    var depthCard = parseFloat(r(rules, 'depth-card', 0.12)) || 0.12;
    var depthPopup = parseFloat(r(rules, 'depth-popup', 0.18)) || 0.18;
    var overlayOpacity = parseFloat(r(rules, 'overlay-opacity', 0.62)) || 0.62;

    var payload = {
      /* Core — ThemeSystem base */
      '--bg-main': surface,
      '--text-primary': text,
      '--accent': accent,
      '--hero-bg': surface,
      '--hero-text': text,
      '--admin-bg': surface,
      '--admin-text': text,
      '--admin-accent': accent,
      '--admin-panel': elevated,

      /* Surfaces */
      '--bg-popup': popupBg,
      '--bg-card': elevated,
      '--glass-surface': glassSurface,
      '--glass-panel': glassPanel,
      '--panel-glass-surface': elevated,
      '--bg-glass-surface': elevated,
      '--btn-surface': btnSurface,
      '--btn-glass-surface': btnSurface,
      '--hero-btn-bg': btnSurface,
      '--hero-btn-bg-hover': hover,
      '--hover': hover,
      '--track-bg': hover,
      '--btn-glass-hover': hover,

      /* Text hierarchy */
      '--text-secondary': textSec,
      '--text-muted': textMuted,
      '--text-secondary-opacity': '0.78',
      '--text-muted-opacity': '0.52',
      '--icon-color': text,
      '--label-opacity': '0.55',
      '--container-text': text,

      /* Borders */
      '--border': border,
      '--glass-border': border,
      '--glass-border-lit': mix(border, text, 68),
      '--btn-border': border,
      '--hero-btn-border': border,
      '--placeholder-border': mix(text, 'transparent', 30),

      /* Backdrops */
      '--backdrop-55': mix(surface, 'transparent', 55),
      '--backdrop-75': mix(surface, 'transparent', 75),
      '--backdrop-90': mix(surface, 'transparent', 90),
      '--backdrop-94': overlay,
      '--modal-backdrop': overlay,
      '--overlay-mask': overlay,
      '--modal-backdrop-blur': overlayBlur,

      /* Shadows */
      '--glass-shadow': shadowMd,
      '--btn-shadow': btnShadow,
      '--modal-shadow': shadowPopup,
      '--glass-inset-shadow': 'inset 0 1px 0 ' + mix(text, 'transparent', 6),

      /* Blur */
      '--glass-blur': blurLg,
      '--menu-glass-blur': blurLg,
      '--bg-glass-blur': blurMd,
      '--panel-modal-blur': overlayBlur,
      '--btn-glass-blur': r(rules, 'blur-sm', 6) + 'px',
      '--hero-btn-blur': '4px',

      /* Scrollbar / placeholders */
      '--scrollbar-thumb': border,
      '--scrollbar-track': surface,
      '--placeholder-bg': mix(text, surface, 10),

      /* Depth vignettes */
      '--depth-vignette-edge': String(depthPopup),
      '--depth-vignette-inner': '45%',
      '--depth-hero-bottom': String(Math.min(0.95, 0.7 + depthCard)),
      '--depth-hero-mid': String(0.15 + depthCard * 0.5),
      '--depth-hero-top': String(0.45 + depthCard * 0.5),
      '--depth-menu-inset': String(Math.round(10 + depthCard * 40)),

      /* Sidebar */
      '--sidebar-background': sidebarBg,
      '--sidebar-border': r(rules, 'sidebar-border', border),

      /* Radius tokens expuestos para migración progresiva */
      '--se-radius-sm': r(rules, 'radius-sm', 8) + 'px',
      '--se-radius-md': r(rules, 'radius-md', 12) + 'px',
      '--se-radius-lg': r(rules, 'radius-lg', 16) + 'px',
      '--se-radius-card': r(rules, 'radius-card', r(rules, 'card-radius', 16)) + 'px',
      '--se-radius-popup': r(rules, 'radius-popup', r(rules, 'popup-radius', 16)) + 'px',
      '--se-radius-button': r(rules, 'radius-button', 10) + 'px',

      /* Motion */
      '--se-motion-duration': r(rules, 'motion-duration', 220) + 'ms',
      '--se-transition-speed': r(rules, 'transition-speed', 220) + 'ms'
    };

    return payload;
  }

  function legacyToSeedRules() {
    if (typeof StyleEngineBridge === 'undefined') return {};
    return StyleEngineBridge.mapLegacyHintsToSeedRules(StyleEngineBridge.legacyColorsToHints());
  }

  return {
    buildLegacyPayload: buildLegacyPayload,
    legacyToSeedRules: legacyToSeedRules,
    mix: mix
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-legacy-adapter.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-legacy-adapter.js");
