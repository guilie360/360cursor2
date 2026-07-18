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

  function publishOfficialToStyleEngine(draft) {
    if (!draft) return false;
    if (typeof StyleEngineStore === 'undefined' ||
        typeof StyleEnginePersonalizarMapper === 'undefined' ||
        typeof StyleEngineLifecycle === 'undefined') {
      return false;
    }

    var rules = StyleEnginePersonalizarMapper.draftToRules(
      draft,
      typeof StyleEngineStore.getDraftRules === 'function' ? StyleEngineStore.getDraftRules() : null
    );
    StyleEngineStore.setDraftRules(rules, { replace: true });
    if (typeof StyleEngineStore.setPersonalizarDraft === 'function') {
      StyleEngineStore.setPersonalizarDraft(draft);
    }
    if (typeof StyleEngineStore.setActiveStyleMeta === 'function') {
      StyleEngineStore.setActiveStyleMeta(getOfficialStyleId(), getOfficialStyleName());
    }
    StyleEngineLifecycle.publishToProject({ saveNamed: false });
    StyleEnginePersonalizarMapper.applyMaterials(draft);
    return true;
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

  /** Aplica el oficial aunque el usuario haya experimentado (p. ej. Reiniciar → HALL). */
  function forceApplyOfficialTheme() {
    /* TEMP freeze bisect: keep early HALL bootstrap only */
    return false;
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
    getOfficialStyleName: getOfficialStyleName,
    getOfficialStyleId: getOfficialStyleId,
    shouldApplyProjectDefault: shouldApplyProjectDefault,
    applyDefaultForCurrentVisitor: applyDefaultForCurrentVisitor,
    forceApplyOfficialTheme: forceApplyOfficialTheme,
    reapplyIfNeeded: reapplyIfNeeded,
    setOfficialThemeForProject: setOfficialThemeForProject
  };
})();
