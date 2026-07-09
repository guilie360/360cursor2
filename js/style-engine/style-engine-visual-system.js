/* Style Engine — VisualSystem: única fuente de verdad visual */
var VisualSystem = (function () {
  var listeners = [];

  function activeRules() {
    if (typeof StyleEngineStore === 'undefined') return StyleEngineTokens.getDefaultRules();
    var isLive = StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
      StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE;
    if (isLive) return StyleEngineStore.getPublishedRules();
    if (typeof StyleEngineBridge !== 'undefined') {
      return StyleEngineTokens.normalizeRules(
        Object.assign({}, StyleEngineTokens.getDefaultRules(), StyleEngineLegacyAdapter.legacyToSeedRules())
      );
    }
    return StyleEngineTokens.getDefaultRules();
  }

  function getRules() {
    return Object.assign({}, activeRules());
  }

  function getToken(key) {
    var rules = activeRules();
    return rules[key] != null ? rules[key] : (StyleEngineTokens.getTokenMeta(key) || {}).default;
  }

  function cssVar(tokenKey) {
    return StyleEngineTokens.cssVarName(tokenKey);
  }

  function getLegacyPayload() {
    return StyleEngineLegacyAdapter.buildLegacyPayload(activeRules());
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) { return item !== fn; });
    };
  }

  if (typeof StyleEngineStore !== 'undefined') {
    StyleEngineStore.subscribe(notify);
  }

  /* API semántica — cada componente consulta secciones, no colores sueltos */
  var Colors = {
    primary: function () { return getToken('color-primary'); },
    secondary: function () { return getToken('color-secondary'); },
    accent: function () { return getToken('color-accent'); },
    success: function () { return getToken('color-success'); },
    warning: function () { return getToken('color-warning'); },
    error: function () { return getToken('color-error'); },
    text: function () { return getToken('text-primary'); },
    textSecondary: function () { return getToken('text-secondary'); },
    textMuted: function () { return getToken('text-muted'); },
    border: function () { return getToken('border'); },
    divider: function () { return getToken('divider'); }
  };

  var Surface = {
    base: function () { return getToken('surface'); },
    elevated: function () { return getToken('surface-elevated'); },
    floating: function () { return getToken('surface-floating'); },
    popup: function () { return getToken('popup-background'); },
    sidebar: function () { return getToken('sidebar-background'); }
  };

  var Elevation = {
    card: function () { return getToken('card-shadow'); },
    popup: function () { return getToken('popup-shadow'); },
    sm: function () { return getToken('shadow-sm'); },
    md: function () { return getToken('shadow-md'); },
    lg: function () { return getToken('shadow-lg'); },
    hoverLift: function () { return getToken('hover-elevation') + 'px'; }
  };

  var Typography = {
    family: function () { return getToken('font-family-base'); },
    sizeBase: function () { return getToken('font-size-base') + 'px'; },
    scale: function () { return getToken('font-size-scale'); },
    headingWeight: function () { return getToken('font-weight-heading'); },
    letterSpacing: function () { return getToken('letter-spacing-ui') + 'em'; }
  };

  var Spacing = {
    xs: function () { return getToken('spacing-xs') + 'px'; },
    sm: function () { return getToken('spacing-sm') + 'px'; },
    md: function () { return getToken('spacing-md') + 'px'; },
    lg: function () { return getToken('spacing-lg') + 'px'; },
    xl: function () { return getToken('spacing-xl') + 'px'; },
    density: function () { return getToken('density'); }
  };

  var Radius = {
    sm: function () { return getToken('radius-sm') + 'px'; },
    md: function () { return getToken('radius-md') + 'px'; },
    lg: function () { return getToken('radius-lg') + 'px'; },
    card: function () { return getToken('radius-card') + 'px'; },
    popup: function () { return getToken('radius-popup') + 'px'; },
    button: function () { return getToken('radius-button') + 'px'; },
    input: function () { return getToken('input-radius') + 'px'; },
    badge: function () { return getToken('badge-radius') + 'px'; }
  };

  var Borders = {
    width: function () { return getToken('border-width') + 'px'; },
    style: function () { return getToken('border-style'); },
    color: function () { return getToken('border'); },
    card: function () { return getToken('card-border'); },
    input: function () { return getToken('input-border'); },
    table: function () { return getToken('table-border'); }
  };

  var Buttons = {
    height: function () { return getToken('button-height') + 'px'; },
    paddingX: function () { return getToken('button-padding-x') + 'px'; },
    fontSize: function () { return getToken('button-font-size') + 'rem'; },
    shadow: function () { return getToken('button-shadow'); },
    radius: function () { return Radius.button(); }
  };

  var Cards = {
    padding: function () { return getToken('card-padding') + 'px'; },
    radius: function () { return Radius.card(); },
    shadow: function () { return getToken('card-shadow'); },
    border: function () { return getToken('card-border'); }
  };

  var Popup = {
    radius: function () { return Radius.popup(); },
    shadow: function () { return getToken('popup-shadow'); },
    background: function () { return getToken('popup-background'); },
    padding: function () { return getToken('popup-padding') + 'px'; }
  };

  var Overlay = {
    backdrop: function () { return getToken('overlay-backdrop'); },
    blur: function () { return getToken('overlay-blur') + 'px'; },
    opacity: function () { return getToken('overlay-opacity'); }
  };

  var Glass = {
    transparency: function () { return getToken('glass-transparency'); },
    blurSm: function () { return getToken('blur-sm') + 'px'; },
    blurMd: function () { return getToken('blur-md') + 'px'; },
    blurLg: function () { return getToken('blur-lg') + 'px'; }
  };

  var Sidebar = {
    background: function () { return getToken('sidebar-background'); },
    width: function () { return getToken('sidebar-width') + 'px'; },
    border: function () { return getToken('sidebar-border'); }
  };

  var Hero = {
    background: function () { return Surface.base(); },
    text: function () { return Colors.text(); },
    accent: function () { return Colors.accent(); }
  };

  var Inputs = {
    height: function () { return getToken('input-height') + 'px'; },
    radius: function () { return Radius.input(); },
    border: function () { return getToken('input-border'); },
    focus: function () { return getToken('focus-outline'); }
  };

  var Badges = {
    radius: function () { return Radius.badge(); },
    fontSize: function () { return getToken('badge-font-size') + 'rem'; },
    paddingX: function () { return getToken('badge-padding-x') + 'px'; }
  };

  var Animations = {
    duration: function () { return getToken('motion-duration') + 'ms'; },
    easing: function () { return getToken('motion-easing'); },
    speed: function () { return getToken('transition-speed') + 'ms'; }
  };

  var Depth = {
    panel: function () { return getToken('depth-panel'); },
    card: function () { return getToken('depth-card'); },
    popup: function () { return getToken('depth-popup'); }
  };

  var Tables = {
    rowHeight: function () { return getToken('table-row-height') + 'px'; },
    border: function () { return getToken('table-border'); },
    headerBg: function () { return getToken('table-header-bg'); }
  };

  function resolve(path) {
    var parts = String(path || '').split('.');
    var root = {
      colors: Colors,
      surface: Surface,
      elevation: Elevation,
      typography: Typography,
      spacing: Spacing,
      radius: Radius,
      borders: Borders,
      buttons: Buttons,
      cards: Cards,
      popup: Popup,
      overlay: Overlay,
      glass: Glass,
      sidebar: Sidebar,
      hero: Hero,
      inputs: Inputs,
      badges: Badges,
      animations: Animations,
      depth: Depth,
      tables: Tables
    };
    var node = root;
    for (var i = 0; i < parts.length; i++) {
      if (!node) return null;
      node = node[parts[i]];
    }
    return typeof node === 'function' ? node() : node;
  }

  function isStyleEngineActive() {
    return typeof StyleEngineStore !== 'undefined' &&
      StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
      StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE;
  }

  return {
    getRules: getRules,
    getToken: getToken,
    cssVar: cssVar,
    getLegacyPayload: getLegacyPayload,
    resolve: resolve,
    subscribe: subscribe,
    isStyleEngineActive: isStyleEngineActive,
    Colors: Colors,
    Surface: Surface,
    Elevation: Elevation,
    Typography: Typography,
    Spacing: Spacing,
    Radius: Radius,
    Borders: Borders,
    Buttons: Buttons,
    Cards: Cards,
    Popup: Popup,
    Overlay: Overlay,
    Glass: Glass,
    Sidebar: Sidebar,
    Hero: Hero,
    Inputs: Inputs,
    Badges: Badges,
    Animations: Animations,
    Depth: Depth,
    Tables: Tables
  };
})();

// Alias público
var DesignSystem = VisualSystem;
