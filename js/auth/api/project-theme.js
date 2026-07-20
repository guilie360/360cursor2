console.log("BOOT ENTER js/auth/api/project-theme.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/project-theme.js');}catch(_e){}
/* Official project default theme API */
var ProjectThemeApi = (function () {
  function getClient() {
    return PlatformAuth.getClient();
  }

  function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return Object.assign(
      { themeKey: raw.themeKey || ThemeSystem.CUSTOM_THEME_KEY },
      ThemeSystem.normalizeCustomConfig(raw)
    );
  }

  function getFromProject(project) {
    if (!project) return null;
    var config = project.proyecto_config;
    if (Array.isArray(config)) config = config[0];
    if (!config || !config.project_default_theme) return null;
    return normalizeConfig(config.project_default_theme);
  }

  function isWriteLocked() {
    if (typeof PROJECT_DEFAULT_THEME_WRITE_LOCKED !== 'undefined') {
      return !!PROJECT_DEFAULT_THEME_WRITE_LOCKED;
    }
    return window.PROJECT_DEFAULT_THEME_WRITE_LOCKED !== false;
  }

  async function setDefaultTheme(proyectoId, themeConfig) {
    if (!proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
    }
    if (isWriteLocked()) {
      throw new Error(
        'El estilo HALL del proyecto está bloqueado y no se puede cambiar. ' +
        'Solo se modifica si lo pides de forma explícita.'
      );
    }
    var payload = normalizeConfig(themeConfig);
    if (!payload) {
      throw new Error('Tema inválido.');
    }

    var result = await getClient()
      .from('proyecto_config')
      .update({ project_default_theme: payload })
      .eq('proyecto_id', proyectoId)
      .select('proyecto_id, project_default_theme')
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo guardar el tema oficial del proyecto.');
    }
    if (!result.data) {
      throw new Error('No existe configuración para este proyecto.');
    }

    if (window.PROJECT_DATA && window.PROJECT_DATA.id === proyectoId) {
      var cfg = window.PROJECT_DATA.proyecto_config;
      if (Array.isArray(cfg)) {
        if (cfg[0]) cfg[0].project_default_theme = payload;
      } else if (cfg) {
        cfg.project_default_theme = payload;
      }
    }

    if (typeof window.__applyProjectThemeEarly === 'function') {
      window.__applyProjectThemeEarly(payload, proyectoId);
    }
    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.applyDefaultForCurrentVisitor === 'function') {
      ProjectThemeAuthority.applyDefaultForCurrentVisitor();
    }

    return payload;
  }

  return {
    getFromProject: getFromProject,
    setDefaultTheme: setDefaultTheme,
    normalizeConfig: normalizeConfig
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/project-theme.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/project-theme.js");
