console.log("BOOT ENTER js/auth/api/project-preset-themes.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/project-preset-themes.js');}catch(_e){}
/* API — catálogo de temas preset oficiales del proyecto */
var ProjectPresetThemesApi = (function () {
  function getClient() {
    return PlatformAuth.getClient();
  }

  async function getCatalog(proyectoId) {
    if (!proyectoId) return null;
    var result = await getClient()
      .from('proyecto_config')
      .select('proyecto_id, project_preset_themes')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message || 'No se pudo cargar el catálogo de temas.');
    }
    return result.data ? result.data.project_preset_themes : null;
  }

  async function setCatalog(proyectoId, catalog) {
    if (!proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
    }
    var result = await getClient()
      .from('proyecto_config')
      .update({ project_preset_themes: catalog })
      .eq('proyecto_id', proyectoId)
      .select('proyecto_id, project_preset_themes')
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo guardar el catálogo de temas.');
    }
    if (!result.data) {
      throw new Error('No existe configuración para este proyecto.');
    }

    if (window.PROJECT_DATA && window.PROJECT_DATA.id === proyectoId) {
      var cfg = window.PROJECT_DATA.proyecto_config;
      if (Array.isArray(cfg)) {
        if (cfg[0]) cfg[0].project_preset_themes = catalog;
      } else if (cfg) {
        cfg.project_preset_themes = catalog;
      }
    }

    return result.data.project_preset_themes;
  }

  return {
    getCatalog: getCatalog,
    setCatalog: setCatalog
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/project-preset-themes.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/project-preset-themes.js");
