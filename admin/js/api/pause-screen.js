/* Admin API — Pantalla de pausa (proyecto_config.pause_screen_config) */
var PauseScreenApi = (function () {
  var CONFIG_SELECT =
    'proyecto_id, pause_screen_config, logo_url, imagen_hero_url, titulo_hero, updated_at';

  var PROJECT_SELECT =
    'id, nombre, ciudad, estado, slug, constructora_id, proyecto_config(' + CONFIG_SELECT + ')';

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  function sanitizePayload(payload) {
    return PauseScreenConfig.toPayload(payload);
  }

  async function getForProject(proyectoId) {
    if (!proyectoId) {
      throw new Error('Selecciona un proyecto en el header.');
    }

    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('id', proyectoId)
      .maybeSingle();

    var project = AdminApi.unwrap(result, 'Error cargando pantalla de pausa');
    if (!project) {
      throw new Error('Proyecto no encontrado o sin acceso.');
    }

    var config = normalizeConfig(project.proyecto_config) || { proyecto_id: project.id };
    return {
      project: {
        id: project.id,
        nombre: project.nombre,
        ciudad: project.ciudad,
        estado: project.estado,
        slug: project.slug,
        constructora_id: project.constructora_id
      },
      config: config,
      pauseConfig: PauseScreenConfig.normalize(config.pause_screen_config)
    };
  }

  async function upsert(proyectoId, pausePayload) {
    if (!proyectoId) {
      throw new Error('Selecciona un proyecto en el header.');
    }

    var data = {
      proyecto_id: proyectoId,
      pause_screen_config: sanitizePayload(pausePayload)
    };

    var result = await AdminApi.getClient()
      .from('proyecto_config')
      .upsert(data, { onConflict: 'proyecto_id' })
      .select(CONFIG_SELECT)
      .single();

    return AdminApi.unwrap(result, 'Error guardando pantalla de pausa');
  }

  return {
    getForProject: getForProject,
    upsert: upsert
  };
})();
