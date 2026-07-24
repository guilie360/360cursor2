/* ProyectosApi — canonical showroom CRUD (BOXIES V5.3.2).
 * Identity slug may only be set via create() or updateIdentity().
 * update() never accepts slug.
 * Depends on AdminApi + AdminState (CMS or PlatformBuilderBridge shims).
 */
var ProyectosApi = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, descripcion, ciudad, direccion, latitud, longitud, ' +
    'whatsapp, email, sitio_web, instagram_url, estado, publicado, constructora_id, ' +
    'created_at, updated_at';

  var BRIEF_SELECT = 'id, nombre, slug, publicado, estado, ciudad';

  function sanitizePayload(payload, isCreate) {
    payload = payload || {};
    var data = {};

    function has(key) {
      return Object.prototype.hasOwnProperty.call(payload, key);
    }

    function putText(key) {
      if (!has(key)) return;
      data[key] = AdminUI.normalizeOptionalText(payload[key]);
    }

    putText('nombre');

    /* Slug is create-only here. Updates must use updateIdentity(). */
    if (isCreate && has('slug')) {
      var slugVal = AdminUI.normalizeOptionalText(payload.slug);
      if (slugVal) {
        slugVal = String(slugVal)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      data.slug = slugVal;
    }

    putText('descripcion');
    putText('ciudad');
    putText('direccion');
    putText('whatsapp');
    putText('email');
    if (has('sitio_web')) data.sitio_web = AdminUI.normalizeUrl(payload.sitio_web);
    if (has('instagram_url')) data.instagram_url = AdminUI.normalizeUrl(payload.instagram_url);
    if (has('estado')) data.estado = payload.estado || 'preventa';
    if (has('publicado')) data.publicado = !!payload.publicado;

    if (has('latitud')) {
      if (payload.latitud === '' || payload.latitud == null) data.latitud = null;
      else data.latitud = Number(payload.latitud);
    }
    if (has('longitud')) {
      if (payload.longitud === '' || payload.longitud == null) data.longitud = null;
      else data.longitud = Number(payload.longitud);
    }

    if (isCreate) {
      if (!data.nombre) throw new Error('El nombre del showroom es obligatorio.');
      if (!data.slug) throw new Error('El slug es obligatorio.');
      if (!has('estado')) data.estado = 'preventa';
      if (!has('publicado')) data.publicado = false;
      data.constructora_id = payload.constructora_id || AdminState.getConstructoraId();
    }

    return data;
  }

  function mapDbError(error, fallback) {
    var message = (error && error.message) || fallback || 'Error de API';
    if (/Cannot coerce|multiple \(or no\) rows|JSON object requested/i.test(message)) {
      return new Error(
        'La consulta esperaba una sola fila y recibió 0 o varias. Usa UUID (projectId), no slug, para localizar el showroom.'
      );
    }
    if (/proyectos_slug_unico_por_constructora/i.test(message)) {
      return new Error('Ese slug ya pertenece a otro Showroom.');
    }
    if (/proyectos_slug_formato/i.test(message)) {
      return new Error('El slug solo puede contener letras minúsculas, números y guiones.');
    }
    return new Error(message);
  }

  function normalizeIdentitySlug(raw) {
    var slug = raw != null ? String(raw) : '';
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.normalizeSlug) {
      return ShowroomPublicUrl.normalizeSlug(slug);
    }
    return slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
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
    if (!id) throw new Error('Falta el ID del showroom.');
    payload = payload || {};
    if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
      throw new Error(
        'ProyectosApi.update() no acepta slug. Usa create() o updateIdentity().'
      );
    }
    var data = sanitizePayload(payload, false);
    if (!Object.keys(data).length) {
      throw new Error('No hay campos para actualizar.');
    }
    var result = await AdminApi.getClient()
      .from('proyectos')
      .update(data)
      .eq('id', id)
      .select(PROJECT_SELECT)
      .maybeSingle();

    if (result.error) throw mapDbError(result.error, 'Error actualizando proyecto');
    if (!result.data) {
      throw new Error('No se pudo actualizar el showroom (ID no encontrado o sin permisos).');
    }
    return result.data;
  }

  /**
   * Patch only identity fields (nombre + slug) by UUID, then confirm with SELECT.
   * Returns { project, verify }.
   */
  async function updateIdentity(id, payload) {
    if (!id) throw new Error('Falta el ID del showroom.');
    var nombre = AdminUI.normalizeOptionalText(payload && payload.nombre);
    var slug = normalizeIdentitySlug(payload && payload.slug);
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

    var client = AdminApi.getClient();
    var result = await client
      .from('proyectos')
      .update({ nombre: nombre, slug: slug })
      .eq('id', id)
      .select(PROJECT_SELECT)
      .maybeSingle();

    if (result.error) throw mapDbError(result.error, 'Error actualizando identidad del showroom');
    if (!result.data) {
      throw new Error('No se pudo guardar la identidad (ID no encontrado o sin permisos).');
    }

    var verify = await client
      .from('proyectos')
      .select('nombre, slug')
      .eq('id', id)
      .maybeSingle();

    if (verify.error) {
      throw mapDbError(verify.error, 'No se pudo verificar la identidad guardada.');
    }

    var dbSlug = verify.data && verify.data.slug;
    if (dbSlug !== slug) {
      throw new Error(
        'No se confirmó el slug guardado. Pedido: "' + slug +
        '", en base: "' + (dbSlug || '') + '".'
      );
    }

    return {
      project: result.data,
      verify: verify.data
    };
  }

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
