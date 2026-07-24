/* Admin API — proyectos CRUD */
var ProyectosApi = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, descripcion, ciudad, direccion, latitud, longitud, ' +
    'whatsapp, email, sitio_web, instagram_url, estado, publicado, constructora_id, ' +
    'created_at, updated_at';

  var BRIEF_SELECT = 'id, nombre, slug, publicado, estado, ciudad';

  function sanitizePayload(payload, isCreate) {
    var data = {
      nombre: AdminUI.normalizeOptionalText(payload.nombre),
      slug: AdminUI.normalizeOptionalText(payload.slug),
      descripcion: AdminUI.normalizeOptionalText(payload.descripcion),
      ciudad: AdminUI.normalizeOptionalText(payload.ciudad),
      direccion: AdminUI.normalizeOptionalText(payload.direccion),
      whatsapp: AdminUI.normalizeOptionalText(payload.whatsapp),
      email: AdminUI.normalizeOptionalText(payload.email),
      sitio_web: AdminUI.normalizeUrl(payload.sitio_web),
      instagram_url: AdminUI.normalizeUrl(payload.instagram_url),
      estado: payload.estado || 'preventa',
      publicado: !!payload.publicado
    };

    if (payload.latitud === '' || payload.latitud == null) {
      data.latitud = null;
    } else {
      data.latitud = Number(payload.latitud);
    }

    if (payload.longitud === '' || payload.longitud == null) {
      data.longitud = null;
    } else {
      data.longitud = Number(payload.longitud);
    }

    if (isCreate) {
      data.constructora_id = payload.constructora_id || AdminState.getConstructoraId();
    }

    return data;
  }

  function mapDbError(error, fallback) {
    var message = (error && error.message) || fallback || 'Error de API';
    if (/proyectos_slug_unico_por_constructora/i.test(message)) {
      return new Error('Ya existe un proyecto con ese slug en tu constructora.');
    }
    if (/proyectos_slug_formato/i.test(message)) {
      return new Error('El slug solo puede contener letras minúsculas, números y guiones.');
    }
    return new Error(message);
  }

  async function list() {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .order('nombre', { ascending: true });
    return AdminApi.unwrap(result, 'Error cargando proyectos');
  }

  async function listBrief() {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(BRIEF_SELECT)
      .order('nombre', { ascending: true });
    return AdminApi.unwrap(result, 'Error cargando proyectos');
  }

  async function getById(id) {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .maybeSingle();
    return AdminApi.unwrap(result, 'Error cargando proyecto');
  }

  async function createDefaultConfig(proyectoId) {
    var seed =
      typeof HallDesignSystem !== 'undefined' && typeof HallDesignSystem.seedProjectConfigPayload === 'function'
        ? HallDesignSystem.seedProjectConfigPayload()
        : (typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined'
          ? { project_default_theme: PROJECT_DEFAULT_THEME_FALLBACK }
          : {});
    var result = await AdminApi.getClient()
      .from('proyecto_config')
      .insert(Object.assign({ proyecto_id: proyectoId }, seed));
    if (result.error) {
      throw mapDbError(result.error, 'Error creando configuración del proyecto');
    }
  }

  async function create(payload) {
    var data = sanitizePayload(payload, true);
    if (!data.constructora_id) {
      throw new Error('No se pudo determinar la constructora del proyecto.');
    }

    var result = await AdminApi.getClient()
      .from('proyectos')
      .insert(data)
      .select(PROJECT_SELECT)
      .single();

    if (result.error) throw mapDbError(result.error, 'Error creando proyecto');

    try {
      await createDefaultConfig(result.data.id);
    } catch (err) {
      await AdminApi.getClient().from('proyectos').delete().eq('id', result.data.id);
      throw err;
    }

    return result.data;
  }

  async function update(id, payload) {
    var data = sanitizePayload(payload, false);
    var result = await AdminApi.getClient()
      .from('proyectos')
      .update(data)
      .eq('id', id)
      .select(PROJECT_SELECT)
      .single();

    if (result.error) throw mapDbError(result.error, 'Error actualizando proyecto');
    return result.data;
  }

  /** Patch only identity fields — never nulls the rest of the row. */
  async function updateIdentity(id, payload) {
    if (!id) throw new Error('Falta el ID del showroom.');
    var nombre = AdminUI.normalizeOptionalText(payload && payload.nombre);
    var slug = payload && payload.slug != null ? String(payload.slug) : '';
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.normalizeSlug) {
      slug = ShowroomPublicUrl.normalizeSlug(slug);
    } else {
      slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (!nombre) throw new Error('El nombre del showroom es obligatorio.');
    if (!slug) throw new Error('El slug es obligatorio.');
    if (typeof ShowroomPublicUrl !== 'undefined') {
      if (ShowroomPublicUrl.isReservedSlug(slug)) {
        throw new Error('Ese slug está reservado por la plataforma.');
      }
      if (!ShowroomPublicUrl.isValidSlugFormat(slug)) {
        throw new Error('El slug solo puede contener letras minúsculas, números y guiones.');
      }
    }

    var result = await AdminApi.getClient()
      .from('proyectos')
      .update({ nombre: nombre, slug: slug })
      .eq('id', id)
      .select(PROJECT_SELECT)
      .single();

    if (result.error) throw mapDbError(result.error, 'Error actualizando identidad del showroom');
    return result.data;
  }

  /**
   * Check slug uniqueness within constructora (or globally if constructora unknown).
   * @returns {{ available: boolean, reason?: string }}
   */
  async function checkSlugAvailability(slug, options) {
    options = options || {};
    var normalized =
      typeof ShowroomPublicUrl !== 'undefined'
        ? ShowroomPublicUrl.normalizeSlug(slug)
        : String(slug || '').trim().toLowerCase();
    if (!normalized) {
      return { available: false, reason: 'empty' };
    }
    if (typeof ShowroomPublicUrl !== 'undefined') {
      if (ShowroomPublicUrl.isReservedSlug(normalized)) {
        return { available: false, reason: 'reserved' };
      }
      if (!ShowroomPublicUrl.isValidSlugFormat(normalized)) {
        return { available: false, reason: 'format' };
      }
    }

    var query = AdminApi.getClient()
      .from('proyectos')
      .select('id')
      .eq('slug', normalized)
      .limit(8);

    if (options.constructoraId) {
      query = query.eq('constructora_id', options.constructoraId);
    }

    var result = await query;
    if (result.error) {
      throw mapDbError(result.error, 'Error validando slug');
    }
    var rows = result.data || [];
    var conflict = rows.some(function (row) {
      return row && row.id && row.id !== options.excludeId;
    });
    if (conflict) {
      return { available: false, reason: 'taken' };
    }
    return { available: true, reason: 'ok' };
  }

  async function remove(id) {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .delete()
      .eq('id', id);

    if (result.error) throw mapDbError(result.error, 'Error eliminando proyecto');
    return true;
  }

  return {
    list: list,
    listBrief: listBrief,
    getById: getById,
    create: create,
    update: update,
    updateIdentity: updateIdentity,
    checkSlugAvailability: checkSlugAvailability,
    remove: remove
  };
})();
