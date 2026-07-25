try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/platform/project-theme-authority.js');}catch(_e){}
/* Official project theme — separate from personal user themes.
   HALL factory preset is immutable platform DNA (PROJECT_DEFAULT_THEME_FALLBACK). */
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

  /** Deep clone + normalize — never return a live/shared reference. */
  function cloneThemeConfig(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var copy;
    try {
      copy = JSON.parse(JSON.stringify(raw));
    } catch (e) {
      copy = Object.assign({}, raw);
    }
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
      var normalized = ThemeSystem.normalizeCustomConfig(copy);
      if (copy.themeKey) normalized.themeKey = copy.themeKey;
      return normalized;
    }
    return copy;
  }

  /**
   * Canonical immutable HALL Style V.3 factory preset.
   * Independent of project official theme and of LIVE edits.
   */
  function getHallFactoryDraft() {
    var source = null;
    if (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined' && PROJECT_DEFAULT_THEME_FALLBACK) {
      source = PROJECT_DEFAULT_THEME_FALLBACK;
    } else if (typeof ThemeSystem !== 'undefined' && ThemeSystem.getDefaultCustomTheme) {
      source = ThemeSystem.getDefaultCustomTheme();
    }
    var cloned = cloneThemeConfig(source);
    if (!cloned) return null;
    if (!cloned.themeKey && typeof ThemeSystem !== 'undefined') {
      cloned.themeKey = ThemeSystem.CUSTOM_THEME_KEY || 'custom';
    } else if (!cloned.themeKey) {
      cloned.themeKey = 'custom';
    }
    return cloned;
  }

  function getOfficialDraft() {
    var theme = getProjectDefaultTheme();
    if (theme) {
      return cloneThemeConfig(theme) || theme;
    }
    return getHallFactoryDraft();
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

  function publishThemeToStyleEngine(draft, styleId, styleName) {
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[CASCADE]', 'ProjectThemeAuthority.publishThemeToStyleEngine', Date.now(), window.__CASCADE_N);
    if (!draft) return false;
    if (typeof StyleEngineStore === 'undefined' ||
        typeof StyleEnginePersonalizarMapper === 'undefined' ||
        typeof StyleEngineLifecycle === 'undefined') {
      return false;
    }

    var payload = cloneThemeConfig(draft) || draft;
    var rules = StyleEnginePersonalizarMapper.draftToRules(payload, null);
    StyleEngineStore.setDraftRules(rules, { replace: true });
    if (typeof StyleEngineStore.setPersonalizarDraft === 'function') {
      StyleEngineStore.setPersonalizarDraft(payload);
    }
    if (typeof StyleEngineStore.setActiveStyleMeta === 'function') {
      StyleEngineStore.setActiveStyleMeta(
        styleId || getOfficialStyleId(),
        styleName || getOfficialStyleName()
      );
    }
    StyleEngineLifecycle.publishToProject({ saveNamed: false });
    StyleEnginePersonalizarMapper.applyMaterials(payload);
    return true;
  }

  function publishOfficialToStyleEngine(draft) {
    return publishThemeToStyleEngine(draft, getOfficialStyleId(), getOfficialStyleName());
  }

  function applyDefaultForCurrentVisitor() {
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
  }

  /** Aplica el oficial del proyecto (puede diferir de HALL factory). */
  function forceApplyOfficialTheme() {
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[CASCADE]', 'ProjectThemeAuthority.forceApplyOfficialTheme', Date.now(), window.__CASCADE_N);
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
  }

  /**
   * Always re-apply immutable HALL factory — even if HALL is already the active style meta.
   * Used by Reiniciar and Mis estilos → Aplicar HALL.
   */
  function forceApplyHallFactoryPreset() {
    window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
    console.log('[CASCADE]', 'ProjectThemeAuthority.forceApplyHallFactoryPreset', Date.now(), window.__CASCADE_N);
    var draft = getHallFactoryDraft();
    if (!draft) return false;

    var published = publishThemeToStyleEngine(draft, getOfficialStyleId(), getOfficialStyleName());

    if (typeof ThemeSystem !== 'undefined') {
      try {
        ThemeSystem.apply(
          ThemeSystem.CUSTOM_THEME_KEY,
          false,
          ThemeSystem.normalizeCustomConfig(draft)
        );
      } catch (eApply) {}
      if (typeof ThemeSystem.applyHeroLayout === 'function') {
        ThemeSystem.applyHeroLayout(draft.heroLayout);
      }
      if (ThemeSystem.setProjectDefaultApplied) {
        ThemeSystem.setProjectDefaultApplied(getCurrentProyectoId());
      }
    }

    if (!published && typeof ThemeSystem === 'undefined') return false;
    return true;
  }

  function reapplyIfNeeded() {
    if (!window.PROJECT_DATA) return false;
    return applyDefaultForCurrentVisitor();
  }

  async function setOfficialThemeForProject(proyectoId, themeConfig) {
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
    getHallFactoryDraft: getHallFactoryDraft,
    cloneThemeConfig: cloneThemeConfig,
    getOfficialStyleName: getOfficialStyleName,
    getOfficialStyleId: getOfficialStyleId,
    shouldApplyProjectDefault: shouldApplyProjectDefault,
    applyDefaultForCurrentVisitor: applyDefaultForCurrentVisitor,
    forceApplyOfficialTheme: forceApplyOfficialTheme,
    forceApplyHallFactoryPreset: forceApplyHallFactoryPreset,
    reapplyIfNeeded: reapplyIfNeeded,
    setOfficialThemeForProject: setOfficialThemeForProject
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/platform/project-theme-authority.js');}catch(_e){}
