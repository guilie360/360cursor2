/* ProyectosApi — canonical showroom CRUD (BOXIES V5.3.2).
 * Identity slug may only be set via create() or updateIdentity().
 * update() never accepts slug.
 * Depends on AdminApi + AdminState (CMS or PlatformBuilderBridge shims).
 */
var ProyectosApi = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, descripcion, ciudad, direccion, latitud, longitud, ' +
    'whatsapp, email, sitio_web, instagram_url, estado, publicado, is_public, constructora_id, ' +
    'display_order, is_system_template, experience_type, created_at, updated_at';

  var BRIEF_SELECT =
    'id, nombre, slug, publicado, is_public, estado, ciudad, display_order, is_system_template, experience_type';

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

    var expType =
      has('experience_type')
        ? payload.experience_type
        : has('experienceType')
          ? payload.experienceType
          : null;
    if (expType != null || (isCreate && !has('experience_type') && !has('experienceType'))) {
      var normalized =
        typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.normalize
          ? BoxiesExperienceTypes.normalize(expType || 'showroom')
          : String(expType || 'showroom').toLowerCase();
      if (isCreate || expType != null) data.experience_type = normalized;
    }

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

    /* display_order / is_public owned by dedicated APIs — never via update payloads. */
    delete data.display_order;
    delete data.is_public;

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
      .eq('is_system_template', false)
      .order('display_order', { ascending: true, nullsFirst: false });
    return AdminApi.unwrap(result, 'Error cargando proyectos');
  }

  async function listBrief() {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(BRIEF_SELECT)
      .eq('is_system_template', false)
      .order('display_order', { ascending: true, nullsFirst: false });
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

  async function nextDisplayOrder() {
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select('display_order')
      .order('display_order', { ascending: false, nullsFirst: false })
      .limit(1);
    if (result.error) throw mapDbError(result.error, 'Error resolviendo orden de showroom');
    var row = result.data && result.data[0];
    var max = row && row.display_order != null ? Number(row.display_order) : 0;
    if (!isFinite(max) || max < 0) max = 0;
    return max + 1;
  }

  async function create(payload) {
    var data = sanitizePayload(payload, true);
    if (!data.constructora_id) {
      throw new Error('No se pudo determinar la constructora del proyecto.');
    }
    data.display_order = await nextDisplayOrder();

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
    function trace(step, data) {
      try {
        if (!window.__BOXIES_IDENTITY_TRACE__) window.__BOXIES_IDENTITY_TRACE__ = [];
        var entry = Object.assign({ t: Date.now(), step: step }, data || {});
        window.__BOXIES_IDENTITY_TRACE__.push(entry);
        console.log('[IDENTITY]', step, data || {});
      } catch (e) {}
    }

    if (!id) throw new Error('Falta el ID del showroom.');
    var nombre = AdminUI.normalizeOptionalText(payload && payload.nombre);
    var slug = normalizeIdentitySlug(payload && payload.slug);
    trace('2_uuid_enviado_update', { id: id });
    trace('4_payload_supabase', { id: id, nombre: nombre, slug: slug });
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

    trace('5_respuesta_update', {
      error: result.error
        ? { message: result.error.message, code: result.error.code, details: result.error.details, hint: result.error.hint }
        : null,
      data: result.data
    });

    if (result.error) throw mapDbError(result.error, 'Error actualizando identidad del showroom');
    if (!result.data) {
      throw new Error('No se pudo guardar la identidad (ID no encontrado o sin permisos).');
    }

    var verify = await client
      .from('proyectos')
      .select('id, nombre, slug')
      .eq('id', id)
      .maybeSingle();

    trace('6_select_inmediato', {
      error: verify.error
        ? { message: verify.error.message, code: verify.error.code }
        : null,
      data: verify.data
    });

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

  /**
   * Persist manual list order. orderedIds = UUID[] in desired display_order ASC.
   * Does not touch nombre/slug/publicado/is_public.
   */
  async function reorder(orderedIds) {
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      throw new Error('Lista de orden vacía.');
    }
    var client = AdminApi.getClient();
    var updates = [];
    for (var i = 0; i < orderedIds.length; i++) {
      var id = orderedIds[i];
      if (!id) continue;
      updates.push(
        client
          .from('proyectos')
          .update({ display_order: i + 1 })
          .eq('id', id)
          .select('id, display_order')
          .maybeSingle()
      );
    }
    var results = await Promise.all(updates);
    for (var r = 0; r < results.length; r++) {
      if (results[r].error) {
        throw mapDbError(results[r].error, 'Error guardando el orden de showrooms');
      }
      if (!results[r].data) {
        throw new Error('No se pudo actualizar el orden (ID no encontrado o sin permisos).');
      }
    }
    return results.map(function (res) { return res.data; });
  }

  /**
   * Landing / marketplace visibility flag only.
   * Does not touch nombre, slug, display_order, or publicado.
   */
  async function setPublic(projectId, isPublic) {
    if (!projectId) throw new Error('Falta el ID del showroom.');
    var result = await AdminApi.getClient()
      .from('proyectos')
      .update({ is_public: !!isPublic })
      .eq('id', projectId)
      .select('id, is_public')
      .maybeSingle();
    if (result.error) throw mapDbError(result.error, 'Error actualizando visibilidad pública');
    if (!result.data) {
      throw new Error('No se pudo actualizar la visibilidad (ID no encontrado o sin permisos).');
    }
    return result.data;
  }

  function unwrapRpcProject(result, fallback) {
    if (result.error) throw mapDbError(result.error, fallback);
    var row = result.data;
    if (Array.isArray(row)) row = row[0];
    if (!row || !row.id) throw new Error(fallback || 'No se pudo crear el showroom.');
    return row;
  }

  async function createFromTemplate(options) {
    options = options || {};
    var args = {};
    if (options.constructoraId) args.p_constructora_id = options.constructoraId;
    var result = await AdminApi.getClient().rpc('create_showroom_from_template', args);
    return unwrapRpcProject(result, 'Error creando showroom desde plantilla');
  }

  async function cloneProject(projectId, options) {
    if (!projectId) throw new Error('Falta el ID del showroom a clonar.');
    options = options || {};
    var args = { p_source_id: projectId };
    if (options.nombre) args.p_nombre = options.nombre;
    if (options.slug) args.p_slug = options.slug;
    if (options.constructoraId) args.p_constructora_id = options.constructoraId;
    args.p_as_system_template = false;
    var result = await AdminApi.getClient().rpc('clone_showroom', args);
    return unwrapRpcProject(result, 'Error clonando showroom');
  }

  async function updateShareMeta(proyectoId, meta) {
    if (!proyectoId) throw new Error('Falta el ID del proyecto.');
    meta = meta || {};
    var payload = {
      og_image: meta.og_image || null,
      og_title: meta.og_title || null,
      og_description: meta.og_description || null
    };
    var client = AdminApi.getClient();
    var existing = await client
      .from('proyecto_config')
      .select('proyecto_id')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (existing.error) throw mapDbError(existing.error, 'Error leyendo configuración del proyecto');

    var result;
    if (existing.data && existing.data.proyecto_id) {
      result = await client
        .from('proyecto_config')
        .update(payload)
        .eq('proyecto_id', proyectoId)
        .select('og_image, og_title, og_description')
        .maybeSingle();
    } else {
      result = await client
        .from('proyecto_config')
        .insert(Object.assign({ proyecto_id: proyectoId }, payload))
        .select('og_image, og_title, og_description')
        .maybeSingle();
    }
    if (result.error) throw mapDbError(result.error, 'Error guardando vista previa social');
    return result.data || payload;
  }

  async function fetchShareMeta(proyectoId) {
    if (!proyectoId) return { og_image: '', og_title: '', og_description: '' };
    var result = await AdminApi.getClient()
      .from('proyecto_config')
      .select('og_image, og_title, og_description')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (result.error) throw mapDbError(result.error, 'Error cargando vista previa social');
    var row = result.data || {};
    return {
      og_image: row.og_image || '',
      og_title: row.og_title || '',
      og_description: row.og_description || ''
    };
  }

  return {
    list: list,
    listBrief: listBrief,
    getById: getById,
    create: create,
    update: update,
    updateIdentity: updateIdentity,
    updateShareMeta: updateShareMeta,
    fetchShareMeta: fetchShareMeta,
    checkSlugAvailability: checkSlugAvailability,
    remove: remove,
    reorder: reorder,
    setPublic: setPublic,
    createFromTemplate: createFromTemplate,
    cloneProject: cloneProject
  };
})();
