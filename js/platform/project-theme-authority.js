console.log("BOOT ENTER js/platform/project-theme-authority.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/platform/project-theme-authority.js');}catch(_e){}
/* Official project theme — separate from personal user themes */
var ProjectThemeAuthority = (function () {
  var FEATURE_ENABLED = true;

  function canSetOfficialTheme(profile) {
    return PlatformRoles.isAdmin(profile || (typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null));
  }

  function getCurrentProyectoId() {
    return window.PROJECT_DATA && window.PROJECT_DATA.id ? window.PROJECT_DATA.id : null;
  }

  function getProjectDefaultTheme() {
    return ProjectThemeApi.getFromProject(window.PROJECT_DATA);
  }

  function getOfficialDraft() {
    var theme = getProjectDefaultTheme();
    if (theme) {
      if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
        return ThemeSystem.normalizeCustomConfig(theme);
      }
      return theme;
    }
    if (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined') {
      if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
        return ThemeSystem.normalizeCustomConfig(PROJECT_DEFAULT_THEME_FALLBACK);
      }
      return Object.assign({}, PROJECT_DEFAULT_THEME_FALLBACK);
    }
    return null;
  }

  function getOfficialStyleName() {
    return typeof PROJECT_DEFAULT_STYLE_NAME !== 'undefined' ? PROJECT_DEFAULT_STYLE_NAME : 'HALL';
  }

  function getOfficialStyleId() {
    return typeof PROJECT_DEFAULT_STYLE_ID !== 'undefined' ? PROJECT_DEFAULT_STYLE_ID : 'project-default-hall';
  }

  function shouldApplyProjectDefault() {
    /* Solo la elección explícita del usuario bloquea el oficial.
       Style Engine LIVE y prefs heredadas no deben impedir HALL. */
    if (typeof ThemeSystem !== 'undefined' &&
        typeof ThemeSystem.isExplicitUserChoice === 'function' &&
        ThemeSystem.isExplicitUserChoice()) {
      var stored = typeof ThemeSystem.getStoredSettings === 'function'
        ? ThemeSystem.getStoredSettings()
        : null;
      var custom = stored && stored.customTheme ? stored.customTheme : {};
      var bg = String(custom.bg || '').toLowerCase();
      var accent = String(custom.accent || '').toLowerCase();
      /* Migración: override personal del cyan accidental → volver a HALL */
      if (bg === '#0d2541' || accent === '#02fbff') {
        if (ThemeSystem.setProjectDefaultApplied) {
          ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
        }
        return !!(getProjectDefaultTheme() || typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined');
      }
      return false;
    }

    return !!(getProjectDefaultTheme() || typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined');
  }

  function draftsEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  }

  function rulesEqual(a, b) {
    a = a || {};
    b = b || {};
    var keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every(function (key) {
      return String(a[key]) === String(b[key]);
    });
  }

  /** True when store already holds this official theme as LIVE published. */
  function isOfficialAlreadyPublished(rules, draft, styleId, styleName) {
    if (typeof StyleEngineCompatibility === 'undefined' ||
        !StyleEngineCompatibility.isStyleEngineLive()) {
      return false;
    }
    var meta = StyleEngineStore.getActiveStyleMeta
      ? StyleEngineStore.getActiveStyleMeta()
      : { id: null, name: null };
    if ((meta.id || null) !== (styleId || null)) return false;
    if (String(meta.name || '') !== String(styleName || '')) return false;
    if (!rulesEqual(StyleEngineStore.getPublishedRules(), rules)) return false;
    if (typeof StyleEngineStore.getPersonalizarDraft === 'function' &&
        !draftsEqual(StyleEngineStore.getPersonalizarDraft(), draft)) {
      return false;
    }
    return true;
  }

  /**
   * Idempotent: if official theme already matches published LIVE state,
   * exit without store writes or notify.
   */
  function publishOfficialToStyleEngine(draft) {
  console.log("ENTER publishOfficialToStyleEngine");
  try {

    if (!draft) return false;
    if (typeof StyleEngineStore === 'undefined' ||
        typeof StyleEnginePersonalizarMapper === 'undefined' ||
        typeof StyleEngineLifecycle === 'undefined') {
      return false;
    }

    var styleId = getOfficialStyleId();
    var styleName = getOfficialStyleName();
    var rules = StyleEnginePersonalizarMapper.draftToRules(
      draft,
      typeof StyleEngineStore.getDraftRules === 'function' ? StyleEngineStore.getDraftRules() : null
    );

    if (isOfficialAlreadyPublished(rules, draft, styleId, styleName)) {
      return true;
    }

    StyleEngineStore.setDraftRules(rules, { replace: true });
    if (typeof StyleEngineStore.setPersonalizarDraft === 'function') {
      StyleEngineStore.setPersonalizarDraft(draft);
    }
    if (typeof StyleEngineStore.setActiveStyleMeta === 'function') {
      StyleEngineStore.setActiveStyleMeta(styleId, styleName);
    }
    StyleEngineLifecycle.publishToProject({ saveNamed: false });
    StyleEnginePersonalizarMapper.applyMaterials(draft);
    return true;
  
  } finally {
    console.log("EXIT publishOfficialToStyleEngine");
  }}

  function applyDefaultForCurrentVisitor() {
  console.log("ENTER applyDefaultForCurrentVisitor");
  try {

    if (!shouldApplyProjectDefault()) return false;
    var draft = getOfficialDraft();
    if (!draft) return false;

    if (publishOfficialToStyleEngine(draft)) {
      if (typeof ThemeSystem !== 'undefined' && ThemeSystem.setProjectDefaultApplied) {
        ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
      }
      return true;
    }

    var customKey = ThemeSystem.CUSTOM_THEME_KEY;
    var key = draft.themeKey || customKey;

    if (key === customKey) {
      ThemeSystem.apply(customKey, false, ThemeSystem.normalizeCustomConfig(draft));
    } else if (ThemeSystem.THEMES[key]) {
      ThemeSystem.apply(key, false);
    }

    if (typeof ThemeSystem.applyHeroLayout === 'function') {
      ThemeSystem.applyHeroLayout(draft.heroLayout);
    }

    ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
    return true;
  
  } finally {
    console.log("EXIT applyDefaultForCurrentVisitor");
  }}

  /** Aplica el oficial aunque el usuario haya experimentado (p. ej. Reiniciar → HALL). */
  function forceApplyOfficialTheme() {
  console.log("ENTER forceApplyOfficialTheme");
  try {

    var draft = getOfficialDraft();
    if (!draft) return false;

    if (publishOfficialToStyleEngine(draft)) {
      if (typeof ThemeSystem !== 'undefined' && ThemeSystem.setProjectDefaultApplied) {
        ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
      }
      return true;
    }

    if (typeof ThemeSystem === 'undefined') return false;
    ThemeSystem.apply(ThemeSystem.CUSTOM_THEME_KEY, false, ThemeSystem.normalizeCustomConfig(draft));
    if (typeof ThemeSystem.applyHeroLayout === 'function') {
      ThemeSystem.applyHeroLayout(draft.heroLayout);
    }
    ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
    return true;
  
  } finally {
    console.log("EXIT forceApplyOfficialTheme");
  }}

  function reapplyIfNeeded() {
    if (!window.PROJECT_DATA) return false;
    return applyDefaultForCurrentVisitor();
  }

  async function setOfficialThemeForProject(proyectoId, themeConfig) {
    if (typeof PROJECT_DEFAULT_THEME_WRITE_LOCKED !== 'undefined'
        ? PROJECT_DEFAULT_THEME_WRITE_LOCKED
        : window.PROJECT_DEFAULT_THEME_WRITE_LOCKED !== false) {
      throw new Error(
        'El estilo HALL del proyecto está bloqueado y no se puede cambiar. ' +
        'Solo se modifica si lo pides de forma explícita.'
      );
    }
    if (!canSetOfficialTheme()) {
      throw new Error('Solo los administradores pueden aplicar el tema oficial del proyecto.');
    }
    var payload = await ProjectThemeApi.setDefaultTheme(proyectoId, themeConfig);
    forceApplyOfficialTheme();
    return payload;
  }

  return {
    FEATURE_ENABLED: FEATURE_ENABLED,
    canSetOfficialTheme: canSetOfficialTheme,
    getCurrentProyectoId: getCurrentProyectoId,
    getProjectDefaultTheme: getProjectDefaultTheme,
    getOfficialDraft: getOfficialDraft,
    getOfficialStyleName: getOfficialStyleName,
    getOfficialStyleId: getOfficialStyleId,
    shouldApplyProjectDefault: shouldApplyProjectDefault,
    applyDefaultForCurrentVisitor: applyDefaultForCurrentVisitor,
    forceApplyOfficialTheme: forceApplyOfficialTheme,
    reapplyIfNeeded: reapplyIfNeeded,
    setOfficialThemeForProject: setOfficialThemeForProject
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/platform/project-theme-authority.js');}catch(_e){}

console.log("BOOT EXIT js/platform/project-theme-authority.js");
