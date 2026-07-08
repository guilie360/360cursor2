/* Official project default theme API */
var ProjectThemeApi = (function () {
  function getClient() {
    return PlatformAuth.getClient();
  }

  function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      themeKey: raw.themeKey || ThemeSystem.CUSTOM_THEME_KEY,
      bg: raw.bg || raw.background || null,
      menuColor: raw.menuColor || raw.panelColor || raw.bg || raw.background || null,
      surface: raw.surface || null,
      accent: raw.accent || null,
      textMode: raw.textMode === 'dark' ? 'dark' : 'light',
      bgTextMode: raw.bgTextMode === 'dark' ? 'dark' : 'light',
      visualDepth: ThemeSystem.normalizeVisualDepth(raw.visualDepth),
      panelGlass: ThemeSystem.normalizePanelGlass(raw.panelGlass),
      bgGlass: ThemeSystem.normalizePanelGlass(raw.bgGlass || raw.panelGlass),
      buttonGlass: ThemeSystem.normalizePanelGlass(raw.buttonGlass),
      borderGlass: ThemeSystem.normalizePanelGlass(raw.borderGlass),
      shadowGlass: ThemeSystem.normalizeShadowGlass(raw.shadowGlass),
      heroSurface: raw.heroSurface || raw.surface || null,
      heroButtonGlass: ThemeSystem.normalizePanelGlass(raw.heroButtonGlass || raw.buttonGlass),
      heroBorderGlass: ThemeSystem.normalizePanelGlass(raw.heroBorderGlass || raw.borderGlass)
    };
  }

  function getFromProject(project) {
    if (!project) return null;
    var config = project.proyecto_config;
    if (Array.isArray(config)) config = config[0];
    if (!config || !config.project_default_theme) return null;
    return normalizeConfig(config.project_default_theme);
  }

  async function setDefaultTheme(proyectoId, themeConfig) {
    if (!proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
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
