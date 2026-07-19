try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-bridge.js');}catch(_e){}
/* Style Engine — Bridge de solo lectura hacia Theme Legacy (sin modificarlo) */
var StyleEngineBridge = (function () {
  /**
   * Lee el estado visual legacy sin escribir ni depender de él.
   * Legacy → Bridge → Style Engine (unidireccional).
   */
  function readLegacySnapshot() {
    var snap = {
      available: false,
      themeKey: null,
      cssVars: {},
      bodyDataset: {}
    };
    try {
      var root = getComputedStyle(document.documentElement);
      ['--bg-main', '--text-primary', '--accent', '--bg-card', '--border', '--bg-popup'].forEach(function (v) {
        var val = root.getPropertyValue(v).trim();
        if (val) snap.cssVars[v] = val;
      });
      if (document.body) {
        Object.keys(document.body.dataset).forEach(function (k) {
          snap.bodyDataset[k] = document.body.dataset[k];
        });
      }
      if (typeof ThemeSystem !== 'undefined') {
        snap.available = true;
        if (ThemeSystem.getCurrentKey) snap.themeKey = ThemeSystem.getCurrentKey();
        else if (ThemeSystem.state) snap.themeKey = ThemeSystem.state.themeKey;
      }
    } catch (e) { /* noop */ }
    return snap;
  }

  function legacyColorsToHints() {
    var snap = readLegacySnapshot();
    var v = snap.cssVars;
    return {
      primary: v['--text-primary'] || null,
      secondary: v['--border'] || null,
      accent: v['--accent'] || null,
      surface: v['--bg-card'] || null,
      background: v['--bg-main'] || null
    };
  }

  function mapLegacyHintsToSeedRules(hints) {
    var rules = {};
    if (hints.background) rules.surface = hints.background;
    if (hints.surface) {
      rules['surface-elevated'] = hints.surface;
      rules['surface-floating'] = hints.surface;
    }
    if (hints.primary) rules['text-primary'] = hints.primary;
    if (hints.accent) rules['color-accent'] = hints.accent;
    if (hints.secondary) rules.border = hints.secondary;
    return rules;
  }

  return {
    readLegacySnapshot: readLegacySnapshot,
    legacyColorsToHints: legacyColorsToHints,
    mapLegacyHintsToSeedRules: mapLegacyHintsToSeedRules
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-bridge.js');}catch(_e){}
