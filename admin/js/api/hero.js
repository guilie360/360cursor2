/* Admin API — Hero (proyecto_config hero fields + project context) */
var HeroApi = (function () {
  var CONFIG_SELECT =
    'proyecto_id, texto_hero, logo_url, video_hero_url, imagen_hero_url, color_fondo, color_accento, updated_at';

  var PROJECT_SELECT =
    'id, nombre, ciudad, estado, slug, constructora_id, proyecto_config(' + CONFIG_SELECT + ')';

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  function sanitizePayload(payload) {
    return {
      texto_hero: AdminUI.normalizeOptionalText(payload.texto_hero),
      logo_url: AdminUI.normalizeOptionalText(payload.logo_url),
      video_hero_url: AdminUI.normalizeOptionalText(payload.video_hero_url),
      imagen_hero_url: AdminUI.normalizeOptionalText(payload.imagen_hero_url),
      color_fondo: AdminUI.normalizeHexColor(payload.color_fondo, '#0A0A0A'),
      color_accento: AdminUI.normalizeHexColor(payload.color_accento, '#FF3B30')
    };
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

    var project = AdminApi.unwrap(result, 'Error cargando hero del proyecto');
    if (!project) {
      throw new Error('Proyecto no encontrado o sin acceso.');
    }

    return {
      project: {
        id: project.id,
        nombre: project.nombre,
        ciudad: project.ciudad,
        estado: project.estado,
        slug: project.slug,
        constructora_id: project.constructora_id
      },
      config: normalizeConfig(project.proyecto_config) || {
        proyecto_id: project.id,
        texto_hero: null,
        logo_url: null,
        video_hero_url: null,
        imagen_hero_url: null,
        color_fondo: '#0A0A0A',
        color_accento: '#FF3B30'
      }
    };
  }

  async function upsert(proyectoId, payload) {
    if (!proyectoId) {
      throw new Error('Selecciona un proyecto en el header.');
    }

    var data = sanitizePayload(payload);
    data.proyecto_id = proyectoId;

    var result = await AdminApi.getClient()
      .from('proyecto_config')
      .upsert(data, { onConflict: 'proyecto_id' })
      .select(CONFIG_SELECT)
      .single();

    return AdminApi.unwrap(result, 'Error guardando hero');
  }

  return {
    getForProject: getForProject,
    upsert: upsert,
    sanitizePayload: sanitizePayload
  };
})();
