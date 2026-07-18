/* Admin API — Hero (proyecto_config hero fields + project context) */
var HeroApi = (function () {
  var CONFIG_SELECT =
    'proyecto_id, titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
    'show_whatsapp_float, show_share_float, whatsapp_float_link, whatsapp_float_message, share_float_url, ' +
    'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url, color_fondo, color_accento, updated_at';

  var PROJECT_SELECT =
    'id, nombre, ciudad, estado, slug, constructora_id, proyecto_config(' + CONFIG_SELECT + ')';

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  function sanitizePayload(payload) {
    var data = {
      titulo_hero: AdminUI.normalizeOptionalText(payload.titulo_hero),
      texto_hero: AdminUI.normalizeOptionalText(payload.texto_hero),
      boton_hero_1: AdminUI.normalizeOptionalText(payload.boton_hero_1),
      boton_hero_2: AdminUI.normalizeOptionalText(payload.boton_hero_2),
      logo_url: AdminUI.normalizeOptionalText(payload.logo_url),
      video_hero_url: AdminUI.normalizeOptionalText(payload.video_hero_url),
      imagen_hero_url: AdminUI.normalizeOptionalText(payload.imagen_hero_url),
      color_fondo: AdminUI.normalizeHexColor(payload.color_fondo, '#0A0A0A'),
      color_accento: AdminUI.normalizeHexColor(payload.color_accento, '#FF3B30')
    };
    if (payload.project_default_theme != null) {
      data.project_default_theme = payload.project_default_theme;
    }
    if (payload.whatsapp_float_link !== undefined) {
      data.whatsapp_float_link = AdminUI.normalizeOptionalText(payload.whatsapp_float_link);
    }
    if (payload.whatsapp_float_message !== undefined) {
      data.whatsapp_float_message = AdminUI.normalizeOptionalText(payload.whatsapp_float_message);
    }
    if (payload.share_float_url !== undefined) {
      data.share_float_url = AdminUI.normalizeOptionalText(payload.share_float_url);
    }
    if (payload.show_whatsapp_float !== undefined) {
      data.show_whatsapp_float = payload.show_whatsapp_float !== false;
    }
    if (payload.show_share_float !== undefined) {
      data.show_share_float = payload.show_share_float !== false;
    }
    if (payload.show_hero_logo !== undefined) {
      data.show_hero_logo = payload.show_hero_logo !== false;
    }
    if (payload.logo_style !== undefined) {
      data.logo_style = payload.logo_style === 'avatar' ? 'avatar' : 'flat';
    }
    if (payload.hero_text_color != null) {
      data.hero_text_color = payload.hero_text_color === 'dark' ? 'dark' : 'light';
    }
    if (payload.hero_button_text_color != null) {
      data.hero_button_text_color = payload.hero_button_text_color === 'dark' ? 'dark' : 'light';
    }
    return data;
  }

  async function saveConfigRow(proyectoId, data) {
    var client = AdminApi.getClient();

    var updated = await client
      .from('proyecto_config')
      .update(data)
      .eq('proyecto_id', proyectoId)
      .select(CONFIG_SELECT)
      .maybeSingle();

    if (updated.error) {
      throw new Error(updated.error.message || 'Error guardando hero');
    }
    if (updated.data) return updated.data;

    var inserted = await client
      .from('proyecto_config')
      .insert(data)
      .select(CONFIG_SELECT)
      .maybeSingle();

    if (inserted.error) {
      if (/duplicate|unique/i.test(inserted.error.message || '')) {
        var retry = await client
          .from('proyecto_config')
          .update(data)
          .eq('proyecto_id', proyectoId)
          .select(CONFIG_SELECT)
          .maybeSingle();
        if (retry.error) throw new Error(retry.error.message || 'Error guardando hero');
        if (retry.data) return retry.data;
      } else {
        throw new Error(inserted.error.message || 'Error guardando hero');
      }
    }
    if (inserted.data) return inserted.data;

    throw new Error('No se pudo guardar la configuración del hero. Verifica permisos o vuelve a intentar.');
  }

  async function updateProjectName(proyectoId, nombre) {
    var name = AdminUI.normalizeOptionalText(nombre);
    if (!name) return null;

    var result = await AdminApi.getClient()
      .from('proyectos')
      .update({ nombre: name })
      .eq('id', proyectoId)
      .select('id, nombre')
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Error actualizando el nombre del proyecto');
    }
    return result.data;
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
        titulo_hero: null,
        texto_hero: null,
        boton_hero_1: null,
        boton_hero_2: null,
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

    if (payload.nombre_proyecto != null || payload.titulo_hero != null) {
      var projectName = payload.nombre_proyecto != null ? payload.nombre_proyecto : payload.titulo_hero;
      await updateProjectName(proyectoId, projectName);
      data.titulo_hero = AdminUI.normalizeOptionalText(projectName);
    }

    var saved = await saveConfigRow(proyectoId, data);
    return saved;
  }

  return {
    getForProject: getForProject,
    upsert: upsert,
    sanitizePayload: sanitizePayload
  };
})();
