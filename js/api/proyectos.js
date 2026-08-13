/* ProyectosApi — canonical showroom CRUD (BOXIES V5.3.2).
 * Identity slug may only be set via create() or updateIdentity().
 * update() never accepts slug.
 * Depends on AdminApi + AdminState (CMS or PlatformBuilderBridge shims).
 */
var ProyectosApi = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, descripcion, ciudad, direccion, latitud, longitud, ' +
    'whatsapp, email, sitio_web, instagram_url, estado, publicado, is_public, constructora_id, ' +
    'display_order, is_system_template, experience_type, template_id, created_at, updated_at';

  var BRIEF_SELECT =
    'id, nombre, slug, publicado, is_public, estado, ciudad, display_order, is_system_template, experience_type, template_id';

  function dbClient() {
    if (typeof AdminApi === 'undefined' || !AdminApi.getClient) {
      if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.ensureShims) {
        PlatformBuilderBridge.ensureShims();
      }
    }
    if (typeof AdminApi === 'undefined' || !AdminApi.getClient) {
      throw new Error('AdminApi no disponible. Reinicia la sesión BOXIES e intenta de nuevo.');
    }
    return AdminApi.getClient();
  }
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
    var result = await dbClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('is_system_template', false)
      .order('display_order', { ascending: true, nullsFirst: false });
    return AdminApi.unwrap(result, 'Error cargando proyectos');
  }

  async function listBrief() {
    var result = await dbClient()
      .from('proyectos')
      .select(BRIEF_SELECT)
      .eq('is_system_template', false)
      .order('display_order', { ascending: true, nullsFirst: false });
    return AdminApi.unwrap(result, 'Error cargando proyectos');
  }

  async function getById(id) {
    var result = await dbClient()
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
    var result = await dbClient()
      .from('proyecto_config')
      .insert(Object.assign({ proyecto_id: proyectoId }, seed));
    if (result.error) {
      throw mapDbError(result.error, 'Error creando configuración del proyecto');
    }
  }

  async function nextDisplayOrder() {
    var result = await dbClient()
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

    var result = await dbClient()
      .from('proyectos')
      .insert(data)
      .select(PROJECT_SELECT)
      .single();

    if (result.error) throw mapDbError(result.error, 'Error creando proyecto');

    try {
      await createDefaultConfig(result.data.id);
    } catch (err) {
      await dbClient().from('proyectos').delete().eq('id', result.data.id);
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
    var result = await dbClient()
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
  /**
   * Rewrite projects/{oldSlug}/… → projects/{newSlug}/… inside config + archivos.
   * Used when Bunny rename already ran, or as a DB-only fallback.
   */
  async function rewriteSlugMediaPaths(proyectoId, oldSlug, newSlug) {
    if (!proyectoId) throw new Error('Falta el ID del proyecto.');
    var from = normalizeIdentitySlug(oldSlug);
    var to = normalizeIdentitySlug(newSlug);
    if (!from || !to || from === to) {
      return { archivosUpdated: 0, configUpdated: false };
    }
    var oldPrefix = 'projects/' + from + '/';
    var newPrefix = 'projects/' + to + '/';
    var client = dbClient();
    var archivosUpdated = 0;
    var configUpdated = false;

    var files = await client
      .from('archivos')
      .select('id, storage_path, url')
      .eq('proyecto_id', proyectoId)
      .like('storage_path', oldPrefix + '%');
    if (files.error) throw mapDbError(files.error, 'Error reescribiendo rutas de archivos');
    var rows = files.data || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var oldPath = String(row.storage_path || '');
      if (oldPath.indexOf(oldPrefix) !== 0) continue;
      var newPath = newPrefix + oldPath.slice(oldPrefix.length);
      var newUrl = row.url ? String(row.url).split(oldPrefix).join(newPrefix) : row.url;
      var upd = await client
        .from('archivos')
        .update({ storage_path: newPath, url: newUrl })
        .eq('id', row.id);
      if (!upd.error) archivosUpdated++;
    }

    var cfg = await client
      .from('proyecto_config')
      .select('hero_quotation, logo_url, imagen_hero_url, video_hero_url, og_image')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (cfg.error) throw mapDbError(cfg.error, 'Error leyendo config para reescritura de slug');
    if (cfg.data) {
      function rewriteValue(value) {
        if (value == null) return { next: value, changed: false };
        if (typeof value === 'string') {
          var nextStr = value.split(oldPrefix).join(newPrefix);
          return { next: nextStr, changed: nextStr !== value };
        }
        try {
          var raw = JSON.stringify(value);
          var nextRaw = raw.split(oldPrefix).join(newPrefix);
          if (nextRaw === raw) return { next: value, changed: false };
          return { next: JSON.parse(nextRaw), changed: true };
        } catch (_e) {
          return { next: value, changed: false };
        }
      }
      var patch = {};
      var hq = rewriteValue(cfg.data.hero_quotation);
      if (hq.changed) patch.hero_quotation = hq.next;
      var logo = rewriteValue(cfg.data.logo_url);
      if (logo.changed) patch.logo_url = logo.next;
      var img = rewriteValue(cfg.data.imagen_hero_url);
      if (img.changed) patch.imagen_hero_url = img.next;
      var vid = rewriteValue(cfg.data.video_hero_url);
      if (vid.changed) patch.video_hero_url = vid.next;
      var og = rewriteValue(cfg.data.og_image);
      if (og.changed) patch.og_image = og.next;
      if (Object.keys(patch).length) {
        var updCfg = await client
          .from('proyecto_config')
          .update(patch)
          .eq('proyecto_id', proyectoId);
        if (updCfg.error) throw mapDbError(updCfg.error, 'Error reescribiendo config de slug');
        configUpdated = true;
      }
    }

    return { archivosUpdated: archivosUpdated, configUpdated: configUpdated };
  }

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

    var client = dbClient();
    var before = await client
      .from('proyectos')
      .select('id, nombre, slug')
      .eq('id', id)
      .maybeSingle();
    if (before.error) throw mapDbError(before.error, 'Error leyendo identidad actual');
    if (!before.data) {
      throw new Error('No se pudo guardar la identidad (ID no encontrado o sin permisos).');
    }
    var previousSlug = normalizeIdentitySlug(before.data.slug);
    var mediaMigration = null;
    var bunnyMoved = false;

    /* Move Bunny tree BEFORE changing the public slug so old paths still resolve. */
    if (previousSlug && previousSlug !== slug) {
      try {
        if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.renameShowroom) {
          mediaMigration = await BunnyMediaApi.renameShowroom(id, previousSlug, slug);
          bunnyMoved = !!(mediaMigration && mediaMigration.ok !== false);
        }
      } catch (eBunny) {
        console.warn('[ProyectosApi] renameShowroom failed — keeping media paths on old slug', eBunny);
        mediaMigration = {
          ok: false,
          previousSlug: previousSlug,
          nextSlug: slug,
          error: (eBunny && eBunny.message) || String(eBunny)
        };
      }
    }

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
      .select('id, nombre, slug')
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

    /* Only rewrite DB URLs after Bunny confirmed the move (avoid broken CDN links). */
    if (bunnyMoved && previousSlug && previousSlug !== slug) {
      try {
        var rewritten = await rewriteSlugMediaPaths(id, previousSlug, slug);
        mediaMigration = Object.assign({}, mediaMigration || {}, rewritten, {
          previousSlug: previousSlug,
          nextSlug: slug
        });
      } catch (eRewrite) {
        console.warn('[ProyectosApi] rewriteSlugMediaPaths failed', eRewrite);
      }
    }

    return {
      project: result.data,
      verify: verify.data,
      previousSlug: previousSlug,
      mediaMigration: mediaMigration
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

    var query = dbClient()
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
    var result = await dbClient()
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
    var client = dbClient();
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
    var result = await dbClient()
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
    var result = await dbClient().rpc('create_showroom_from_template', args);
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
    var result = await dbClient().rpc('clone_showroom', args);
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
    if (Object.prototype.hasOwnProperty.call(meta, 'favicon_url')) {
      payload.favicon_url = meta.favicon_url || null;
    }
    if (Object.prototype.hasOwnProperty.call(meta, 'page_title')) {
      payload.page_title = meta.page_title || null;
    }
    var client = dbClient();
    var existing = await client
      .from('proyecto_config')
      .select('proyecto_id')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (existing.error) throw mapDbError(existing.error, 'Error leyendo configuración del proyecto');

    var result;
    var selectCols = 'og_image, og_title, og_description, favicon_url, page_title';
    if (existing.data && existing.data.proyecto_id) {
      result = await client
        .from('proyecto_config')
        .update(payload)
        .eq('proyecto_id', proyectoId)
        .select(selectCols)
        .maybeSingle();
    } else {
      result = await client
        .from('proyecto_config')
        .insert(Object.assign({ proyecto_id: proyectoId }, payload))
        .select(selectCols)
        .maybeSingle();
    }
    if (result.error) throw mapDbError(result.error, 'Error guardando vista previa social');
    return result.data || payload;
  }

  async function fetchShareMeta(proyectoId) {
    if (!proyectoId) {
      return {
        og_image: '',
        og_title: '',
        og_description: '',
        favicon_url: '',
        page_title: ''
      };
    }
    var result = await dbClient()
      .from('proyecto_config')
      .select('og_image, og_title, og_description, favicon_url, page_title')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (result.error) throw mapDbError(result.error, 'Error cargando vista previa social');
    var row = result.data || {};
    return {
      og_image: row.og_image || '',
      og_title: row.og_title || '',
      og_description: row.og_description || '',
      favicon_url: row.favicon_url || '',
      page_title: row.page_title || ''
    };
  }

  /* ---------------------------------------------------------------------
   * hero_quotation (jsonb) — Quotation Builder hero namespace.
   * Shares the UI with the Showroom hero, never the legacy hero columns.
   * ------------------------------------------------------------------ */

  function heroText(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function sanitizeCoverModel(raw) {
    if (typeof ProjectCover !== 'undefined' && ProjectCover.sanitizeModel) {
      return ProjectCover.sanitizeModel(raw);
    }
    raw = raw || {};
    return {
      layout: raw.layout === 'bottom-bar' ? 'bottom-bar' : 'centered',
      textColor: raw.textColor === 'dark' ? 'dark' : 'light',
      buttonTextColor: raw.buttonTextColor === 'dark' ? 'dark' : 'light',
      nombre: heroText(raw.nombre),
      eslogan: heroText(raw.eslogan),
      botonIzquierdo: heroText(raw.botonIzquierdo) || 'Explorar',
      botonDerecho: heroText(raw.botonDerecho) || 'Iniciar',
      logoUrl: heroText(raw.logoUrl),
      logoStyle: raw.logoStyle === 'avatar' ? 'avatar' : 'flat',
      showLogo: raw.showLogo !== false && !!heroText(raw.logoUrl),
      videoUrl: heroText(raw.videoUrl) || null,
      imageUrl: heroText(raw.imageUrl) || null,
      showBack: raw.showBack !== false,
      backLabel: heroText(raw.backLabel) || 'Demos',
      showShare: raw.showShare !== false,
      showFullscreen: raw.showFullscreen !== false,
      showAssistant: raw.showAssistant !== false
    };
  }

  function sanitizeCanvasElements(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (el) {
      if (!el || typeof el !== 'object') return null;
      return {
        id: heroText(el.id) || null,
        type: heroText(el.type) || 'text',
        role: heroText(el.role) || '',
        props: el.props && typeof el.props === 'object' ? el.props : {}
      };
    }).filter(function (el) { return el && el.id; });
  }

  /**
   * Persist Showroom interactions[] for Runtime + Quotation Editor overlays.
   * BUTTON / HOTSPOT / TEXT / SHAPE_* — drop ephemeral editor-only junk.
   */
  function sanitizeCanvasInteractions(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (ix) {
      if (!ix || typeof ix !== 'object') return null;
      var type = String(ix.type || '').toUpperCase();
      if (type !== 'BUTTON' && type !== 'HOTSPOT' && type !== 'TEXT' &&
          type !== 'SHAPE_RECT' && type !== 'SHAPE_CIRCLE') {
        return null;
      }
      var id = heroText(ix.id);
      if (!id) return null;
      var defaultLabel = type === 'HOTSPOT' ? 'Hotspot'
        : (type === 'TEXT' ? 'Texto'
          : (type === 'SHAPE_CIRCLE' ? 'Círculo'
            : (type === 'SHAPE_RECT' ? 'Rectángulo' : 'Botón')));
      var out = {
        id: id,
        portId: heroText(ix.portId) || id,
        type: type,
        label: heroText(ix.label) || defaultLabel,
        enabled: ix.enabled !== false
      };
      if (type === 'BUTTON') {
        out.x = Number(ix.x);
        out.y = Number(ix.y);
        if (!isFinite(out.x)) out.x = 50;
        if (!isFinite(out.y)) out.y = 50;
        out.style = heroText(ix.style) || 'chip';
        out.icon = ix.icon == null || ix.icon === '' ? null : heroText(ix.icon);
        out.rotation = Number(ix.rotation) || 0;
        out.positionMode = ix.positionMode === 'anchor' ? 'anchor' : 'free';
        out.anchor = heroText(ix.anchor) || 'center';
        out.marginX = Number(ix.marginX) || 0;
        out.marginY = Number(ix.marginY) || 0;
        out.positionInitialized = ix.positionInitialized !== false;
        out.action = heroText(ix.action) || 'goto-scene';
        out.targetSceneId = heroText(ix.targetSceneId) || null;
        out.url = heroText(ix.url) || null;
        out.downloadUrl = heroText(ix.downloadUrl) || null;
        var boxW = Number(ix.boxW);
        var boxH = Number(ix.boxH);
        if (isFinite(boxW)) out.boxW = Math.max(1, Math.min(100, boxW));
        if (isFinite(boxH)) out.boxH = Math.max(1, Math.min(100, boxH));
        if (ix.visualPresetId != null && ix.visualPresetId !== '') {
          out.visualPresetId = heroText(ix.visualPresetId);
        }
        [
          'bgColor', 'textColor', 'borderColor', 'borderWidth', 'borderRadius',
          'bgOpacity', 'opacity', 'hoverEnabled', 'hoverColor', 'hoverTextColor',
          'hoverTransition', 'hoverScale', 'hoverOpacity',
          'pressedColor', 'pressedTextColor', 'pressedScale',
          'interactiveRole', 'buttonType', 'buttonShapeKind'
        ].forEach(function (key) {
          if (!Object.prototype.hasOwnProperty.call(ix, key)) return;
          if (ix[key] === undefined) return;
          out[key] = ix[key];
        });
        if (ix.buttonConfig && typeof ix.buttonConfig === 'object' && !Array.isArray(ix.buttonConfig)) {
          out.buttonConfig = ix.buttonConfig;
        }
        if (ix.locked != null) out.locked = !!ix.locked;
      } else if (type === 'HOTSPOT') {
        out.shape = heroText(ix.shape) || 'polygon';
        out.name = heroText(ix.name) || out.label;
        out.hotspotKind = heroText(ix.hotspotKind) || 'highlight';
        out.color = heroText(ix.color) || '#6fbf86';
        out.opacity = Number(ix.opacity);
        if (!isFinite(out.opacity)) out.opacity = 0.22;
        out.borderWidth = Number(ix.borderWidth);
        if (!isFinite(out.borderWidth)) out.borderWidth = 1.5;
        out.animation = heroText(ix.animation) || 'none';
        out.action = heroText(ix.action) || 'goto-scene';
        out.targetSceneId = heroText(ix.targetSceneId) || null;
        out.url = heroText(ix.url) || null;
        out.polygon = Array.isArray(ix.polygon)
          ? ix.polygon.map(function (p) {
            if (!p || typeof p !== 'object') return null;
            var x = Number(p.x);
            var y = Number(p.y);
            if (!isFinite(x) || !isFinite(y)) return null;
            return {
              x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
              y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
            };
          }).filter(Boolean)
          : [];
        if (out.polygon.length < 3 && out.shape === 'polygon') return null;
      } else if (type === 'TEXT') {
        out.x = Number(ix.x);
        out.y = Number(ix.y);
        if (!isFinite(out.x)) out.x = 50;
        if (!isFinite(out.y)) out.y = 50;
        out.rotation = Number(ix.rotation) || 0;
        out.positionMode = 'free';
        out.positionInitialized = ix.positionInitialized !== false;
        out.fontSize = Math.max(8, Math.min(200, Number(ix.fontSize) || 28));
        out.fontSizeUnit = 'px';
        out.color = heroText(ix.color) || '#ffffff';
        out.fontFamily = heroText(ix.fontFamily) || 'system-ui, sans-serif';
        out.fontWeight = heroText(ix.fontWeight) || '400';
        out.fontStyle = heroText(ix.fontStyle) || 'normal';
        out.textDecoration = heroText(ix.textDecoration) || 'none';
        out.textAlign = heroText(ix.textAlign) || 'center';
        out.lineHeight = Number(ix.lineHeight);
        if (!isFinite(out.lineHeight)) out.lineHeight = 1.3;
        out.letterSpacing = Number(ix.letterSpacing);
        if (!isFinite(out.letterSpacing)) out.letterSpacing = 0;
        out.textTransform = heroText(ix.textTransform) || 'none';
        out.textShadow = heroText(ix.textShadow) || 'none';
        out.opacity = Number(ix.opacity);
        if (!isFinite(out.opacity)) out.opacity = 1;
        out.locked = !!ix.locked;
      } else {
        /* SHAPE_RECT / SHAPE_CIRCLE */
        out.x = Number(ix.x);
        out.y = Number(ix.y);
        if (!isFinite(out.x)) out.x = 50;
        if (!isFinite(out.y)) out.y = 50;
        out.width = Math.max(1, Math.min(100, Number(ix.width) || 12));
        out.height = Math.max(1, Math.min(100,
          Number(ix.height) || (type === 'SHAPE_CIRCLE' ? 12 : 8)));
        out.fill = heroText(ix.fill) || 'rgba(255,255,255,0.14)';
        out.stroke = heroText(ix.stroke) || 'rgba(255,255,255,0.55)';
        out.strokeWidth = Math.max(0, Math.min(20, Number(ix.strokeWidth) || 0));
        out.borderRadius = type === 'SHAPE_CIRCLE'
          ? 999
          : Math.max(0, Math.min(999, Number(ix.borderRadius) || 0));
        out.rotation = Number(ix.rotation) || 0;
        out.positionMode = 'free';
        out.positionInitialized = ix.positionInitialized !== false;
        out.locked = !!ix.locked;
      }
      return out;
    }).filter(Boolean);
  }

  /** Persist scene guides (%) — must survive sanitize on save/load. */
  function sanitizeCanvasGuides(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (g) {
      if (!g || typeof g !== 'object') return null;
      var id = heroText(g.id);
      if (!id) return null;
      var position = Number(g.position);
      if (!isFinite(position)) position = 0;
      if (position < 0) position = 0;
      if (position > 100) position = 100;
      return {
        id: id,
        type: g.type === 'horizontal' ? 'horizontal' : 'vertical',
        position: Math.round(position * 1000) / 1000,
        locked: !!g.locked
      };
    }).filter(Boolean);
  }

  function sanitizeCanvasGuidesByViewport(raw, legacyGuides) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {
      desktop: sanitizeCanvasGuides(src.desktop),
      tablet: sanitizeCanvasGuides(src.tablet),
      mobile: sanitizeCanvasGuides(src.mobile)
    };
    /* Migrate legacy flat guides[] into desktop when buckets are empty. */
    var legacy = sanitizeCanvasGuides(legacyGuides);
    if (legacy.length && !out.desktop.length) out.desktop = legacy;
    return out;
  }

  function sanitizeSceneGroups(rawGroups, sceneIdSet, heroIdSet) {
    if (!Array.isArray(rawGroups)) return [];
    return rawGroups.map(function (g) {
      if (!g || typeof g !== 'object') return null;
      var id = heroText(g.id);
      if (!id) return null;
      var sceneIds = Array.isArray(g.sceneIds)
        ? g.sceneIds.map(function (sid) { return heroText(sid); }).filter(function (sid) {
          return sid && sceneIdSet[sid] && !heroIdSet[sid];
        })
        : [];
      var childGroupIds = Array.isArray(g.childGroupIds)
        ? g.childGroupIds.map(function (cid) { return heroText(cid); }).filter(Boolean)
        : [];
      return {
        id: id,
        name: heroText(g.name) || 'Grupo',
        collapsed: g.collapsed !== false,
        parentGroupId: heroText(g.parentGroupId) || null,
        sceneIds: sceneIds,
        childGroupIds: childGroupIds
      };
    }).filter(Boolean);
  }

  function sanitizeSceneTrack(rawTrack, sceneIdSet, groupById, scenesInGroups) {
    if (!Array.isArray(rawTrack)) return [];
    var seen = Object.create(null);
    return rawTrack.map(function (tid) { return heroText(tid); }).filter(function (tid) {
      if (!tid || seen[tid]) return false;
      if (groupById[tid]) {
        if (groupById[tid].parentGroupId) return false;
        seen[tid] = true;
        return true;
      }
      if (sceneIdSet[tid] && !scenesInGroups[tid]) {
        seen[tid] = true;
        return true;
      }
      return false;
    });
  }

  function sanitizeCanvasDocument(doc) {
    if (!doc || typeof doc !== 'object') return null;
    var scenes = Array.isArray(doc.scenes) ? doc.scenes : [];
    var outScenes = scenes.map(function (sc) {
      if (!sc || typeof sc !== 'object') return null;
      var mediaType = heroText(sc.mediaType) || null;
      if (mediaType !== 'image' && mediaType !== 'video') mediaType = null;
      /* V7.2.28 — validate structure only; never destroy valid public mediaUrl. */
      var mediaUrl = heroText(sc.mediaUrl) || heroText(sc.publicUrl) || null;
      var cover = sc.coverModel ? sanitizeCoverModel(sc.coverModel) : null;
      var guidesByViewport = sanitizeCanvasGuidesByViewport(sc.guidesByViewport, sc.guides);
      return {
        id: heroText(sc.id) || null,
        name: heroText(sc.name) || 'Escena',
        type: heroText(sc.type) || 'scene',
        templateId: heroText(sc.templateId) || null,
        coverModel: cover,
        resourceId: heroText(sc.resourceId) || null,
        storagePath: heroText(sc.storagePath) || null,
        archivoId: heroText(sc.archivoId) || null,
        provider: heroText(sc.provider) || (mediaUrl ? 'bunny' : null),
        publicUrl: mediaUrl,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        elements: sanitizeCanvasElements(sc.elements),
        interactions: sanitizeCanvasInteractions(sc.interactions),
        guidesByViewport: guidesByViewport,
        guides: guidesByViewport.desktop.slice()
      };
    }).filter(function (sc) { return sc && sc.id; });

    var sceneIdSet = Object.create(null);
    var heroIdSet = Object.create(null);
    outScenes.forEach(function (sc) {
      sceneIdSet[sc.id] = true;
      if (sc.type === 'hero') heroIdSet[sc.id] = true;
    });

    var sceneGroups = sanitizeSceneGroups(doc.sceneGroups, sceneIdSet, heroIdSet);
    var groupById = Object.create(null);
    sceneGroups.forEach(function (grp) {
      groupById[grp.id] = grp;
    });
    sceneGroups.forEach(function (grp) {
      grp.childGroupIds = grp.childGroupIds.filter(function (cid) {
        return !!groupById[cid] && cid !== grp.id;
      });
      if (grp.parentGroupId && !groupById[grp.parentGroupId]) grp.parentGroupId = null;
    });
    var scenesInGroups = Object.create(null);
    sceneGroups.forEach(function (grp) {
      grp.sceneIds.forEach(function (sid) { scenesInGroups[sid] = true; });
    });
    var sceneTrack = sanitizeSceneTrack(doc.sceneTrack, sceneIdSet, groupById, scenesInGroups);

    /* Allow empty ProjectDocument (0 scenes) — Editor is SSOT. */
    var out = {
      version: Number(doc.version) || 1,
      activeSceneId: heroText(doc.activeSceneId) || (outScenes[0] && outScenes[0].id) || null,
      scenes: outScenes
    };
    if (sceneGroups.length) out.sceneGroups = sceneGroups;
    if (sceneTrack.length) out.sceneTrack = sceneTrack;
    return out;
  }

  var BUNNY_CDN_BASE = 'https://boxies.b-cdn.net';

  function libraryPublicUrlFromPath(storagePath) {
    var path = heroText(storagePath).replace(/^\/+/, '');
    if (!path) return null;
    return BUNNY_CDN_BASE + '/' + path;
  }

  function libraryContentLength(lib) {
    return lib && Array.isArray(lib.content) ? lib.content.length : 0;
  }

  /**
   * Persistable library item gate — aligned with QuotationEditor.
   * Keep rows that still point at Bunny/archivos even if publicUrl was lost.
   */
  function sanitizeLibrary(lib) {
    if (!lib || typeof lib !== 'object') return null;
    var content = Array.isArray(lib.content) ? lib.content : [];
    var folders = Array.isArray(lib.folders) ? lib.folders : [];
    console.log('[QE-LIB V7.2.74] sanitizeLibrary:IN', {
      contentLength: content.length,
      content: content.map(function (c) {
        if (!c) return null;
        return {
          id: c.id,
          archivoId: c.archivoId || null,
          storagePath: c.storagePath || null,
          provider: c.provider || null,
          publicUrl: c.publicUrl || c.remoteUrl || null,
          uploadStatus: c.uploadStatus || null
        };
      })
    });
    var outContent = content.map(function (c) {
      if (!c || typeof c !== 'object') return null;
      var id = heroText(c.id);
      if (!id) return null;
      var storagePath = heroText(c.storagePath) || null;
      var archivoId = heroText(c.archivoId) || null;
      var pub = heroText(c.publicUrl) || heroText(c.remoteUrl) || null;
      if (pub && pub.indexOf('blob:') === 0) pub = null;
      var preview = heroText(c.previewUrl) || null;
      if (preview && preview.indexOf('blob:') === 0) preview = null;
      if (!pub) pub = preview;
      if (!pub && storagePath) pub = libraryPublicUrlFromPath(storagePath);
      /* Durable identity: archivoId / storagePath survive even without URL. */
      if (!pub && !archivoId && !storagePath) {
        console.log('[QE-LIB V7.2.74] sanitizeLibrary:DROP item (no durable ref)', {
          id: id,
          provider: c.provider || null
        });
        return null;
      }
      return {
        id: id,
        group: heroText(c.group) || 'renders',
        folderId: heroText(c.folderId) || null,
        name: heroText(c.name) || 'Archivo',
        media: heroText(c.media) || 'image',
        mime: heroText(c.mime) || null,
        publicUrl: pub,
        remoteUrl: pub,
        previewUrl: pub,
        storagePath: storagePath,
        archivoId: archivoId,
        provider: heroText(c.provider) || (pub || storagePath || archivoId ? 'bunny' : null),
        projectId: heroText(c.projectId) || null,
        sizeBytes: c.sizeBytes != null ? (Number(c.sizeBytes) || 0) : 0
      };
    }).filter(Boolean);
    var outFolders = folders.map(function (f) {
      if (!f || typeof f !== 'object') return null;
      var id = heroText(f.id);
      if (!id) return null;
      return {
        id: id,
        group: heroText(f.group) || null,
        name: heroText(f.name) || 'Carpeta',
        order: f.order != null ? Number(f.order) || 0 : 0
      };
    }).filter(Boolean);
    var out = {
      version: Number(lib.version) || 1,
      content: outContent,
      folders: outFolders
    };
    console.log('[QE-LIB V7.2.74] sanitizeLibrary:OUT', {
      contentLength: outContent.length,
      library: out
    });
    return out;
  }

  /** Merge partial hero_quotation writes without wiping sibling namespaces. */
  function mergeHeroQuotationPayload(prev, payload) {
    prev = prev && typeof prev === 'object' ? prev : {};
    payload = payload && typeof payload === 'object' ? payload : {};
    var merged = Object.assign({}, prev, payload);
    if (!Object.prototype.hasOwnProperty.call(payload, 'canvas') && prev.canvas) {
      merged.canvas = prev.canvas;
    }
    if (!Object.prototype.hasOwnProperty.call(payload, 'library') && prev.library) {
      merged.library = prev.library;
    }
    merged.heroContent = Object.assign({}, prev.heroContent || {}, payload.heroContent || {});
    if (payload.clearLegacyCover) {
      merged.heroContent = Object.assign({}, payload.heroContent || {});
      merged.image_url = null;
      merged.video_url = null;
      delete merged.clearLegacyCover;
    }
    merged.branding = Object.assign({}, prev.branding || {}, payload.branding || {});
    /* Null logo in a partial write must not erase a stored logo. */
    if (
      payload.branding &&
      Object.prototype.hasOwnProperty.call(payload.branding, 'logo') &&
      payload.branding.logo == null &&
      prev.branding &&
      prev.branding.logo
    ) {
      merged.branding.logo = prev.branding.logo;
    }
    if (!Object.prototype.hasOwnProperty.call(payload, 'video_url') && prev.video_url != null) {
      merged.video_url = prev.video_url;
    }
    if (!Object.prototype.hasOwnProperty.call(payload, 'image_url') && prev.image_url != null) {
      merged.image_url = prev.image_url;
    }
    return merged;
  }

  /**
   * Never replace a non-empty library SSOT with an accidental empty write.
   * Intentional clear-all requires libraryExplicitEmpty=true and empty content.
   */
  function protectLibraryOverwrite(prev, payload, sanitizedLibrary) {
    var prevLib = prev && prev.library;
    var prevLen = libraryContentLength(prevLib);
    var nextLen = libraryContentLength(sanitizedLibrary);
    var rawLen = libraryContentLength(payload && payload.library);
    var explicitEmpty = !!(payload && payload.libraryExplicitEmpty);

    if (nextLen > 0) return sanitizedLibrary;
    if (prevLen <= 0) return sanitizedLibrary || prevLib || null;

    if (explicitEmpty && rawLen === 0) {
      return sanitizedLibrary || { version: 1, content: [], folders: [] };
    }

    console.warn('[QE-LIB V7.2.74] blocked empty library overwrite of non-empty SSOT', {
      prevLen: prevLen,
      rawLen: rawLen,
      nextLen: nextLen,
      explicitEmpty: explicitEmpty
    });
    return sanitizeLibrary(prevLib) || prevLib;
  }

  function sanitizeHeroQuotation(payload) {
    payload = payload || {};
    var hc = payload.heroContent || {};
    var br = payload.branding || {};
    var rawLogo = br.logo || null;
    var logo =
      rawLogo && (rawLogo.uploadedUrl || rawLogo.name)
        ? {
          name: heroText(rawLogo.name),
          uploadedUrl: heroText(rawLogo.uploadedUrl) || null,
          size: Number(rawLogo.size) || 0
        }
        : null;

    var out = {
      heroContent: {
        nombre: heroText(hc.nombre),
        eslogan: heroText(hc.eslogan),
        botonIzquierdo: heroText(hc.botonIzquierdo) || 'Explorar',
        botonDerecho: heroText(hc.botonDerecho) || 'Iniciar',
        whatsappLink: heroText(hc.whatsappLink),
        whatsappMessage: heroText(hc.whatsappMessage),
        shareUrl: heroText(hc.shareUrl),
        showWhatsapp: hc.showWhatsapp !== false,
        showShare: hc.showShare !== false,
        showFullscreen: hc.showFullscreen !== false
      },
      branding: {
        showHeroLogo: br.showHeroLogo !== false,
        logoStyle: br.logoStyle === 'avatar' ? 'avatar' : 'flat',
        logo: logo
      },
      video_url: heroText(payload.video_url) || null,
      image_url: heroText(payload.image_url) || null
    };

    /* Preserve quotation cinematic / opt-in cover flags when present. */
    if (hc.eyebrow != null) out.heroContent.eyebrow = heroText(hc.eyebrow);
    if (hc.kicker != null) out.heroContent.kicker = heroText(hc.kicker);
    if (hc.variant != null) out.heroContent.variant = heroText(hc.variant);
    if (hc.exploreAction != null) out.heroContent.exploreAction = heroText(hc.exploreAction);
    if (hc.startAction != null) out.heroContent.startAction = heroText(hc.startAction);
    if (hc.startTargetSceneId != null) {
      out.heroContent.startTargetSceneId = heroText(hc.startTargetSceneId);
    }
    if (hc.showExplore != null) out.heroContent.showExplore = !!hc.showExplore;
    if (hc.showStart != null) out.heroContent.showStart = !!hc.showStart;
    if (hc.showBack != null) out.heroContent.showBack = !!hc.showBack;
    if (hc.showAssistant != null) out.heroContent.showAssistant = !!hc.showAssistant;
    if (hc.showLogo != null) out.heroContent.showLogo = !!hc.showLogo;

    var canvas = sanitizeCanvasDocument(payload.canvas);
    if (canvas) out.canvas = canvas;
    else if (payload.canvas === null) out.canvas = { version: 1, activeSceneId: null, scenes: [] };

    var library = sanitizeLibrary(payload.library);
    if (library) out.library = library;

    return out;
  }

  async function fetchHeroQuotation(proyectoId) {
    if (!proyectoId) return null;
    var result = await dbClient()
      .from('proyecto_config')
      .select('hero_quotation')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (result.error) throw mapDbError(result.error, 'Error cargando el hero de la cotización');
    var raw = result.data && result.data.hero_quotation;
    console.log('[QE-LIB V7.2.37] fetchHeroQuotation:RAW DB hero_quotation.library');
    console.log(JSON.stringify(raw && raw.library, null, 2));
    if (!raw || typeof raw !== 'object') return null;
    var sanitized = sanitizeHeroQuotation(raw);
    console.log('[QE-LIB V7.2.37] fetchHeroQuotation:AFTER sanitizeHeroQuotation.library');
    console.log(JSON.stringify(sanitized && sanitized.library, null, 2));
    return sanitized;
  }

  async function updateHeroQuotation(proyectoId, payload) {
    if (!proyectoId) throw new Error('Falta el ID del proyecto.');
    var client = dbClient();

    var existing = await client
      .from('proyecto_config')
      .select('proyecto_id, hero_quotation')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (existing.error) throw mapDbError(existing.error, 'Error leyendo configuración del proyecto');

    var prev = existing.data && existing.data.hero_quotation;
    var merged = mergeHeroQuotationPayload(prev, payload);
    console.log('[QE-LIB V7.2.74] updateHeroQuotation:merged.library BEFORE sanitize');
    console.log(JSON.stringify(merged.library, null, 2));
    var data = sanitizeHeroQuotation(merged);
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'library') || data.library) {
      data.library = protectLibraryOverwrite(prev, payload, data.library);
    } else if (prev && prev.library) {
      data.library = sanitizeLibrary(prev.library) || prev.library;
    }
    console.log('[QE-LIB V7.2.74] updateHeroQuotation:data.library AFTER protect (written to DB)');
    console.log(JSON.stringify(data.library, null, 2));

    var result;
    if (existing.data && existing.data.proyecto_id) {
      result = await client
        .from('proyecto_config')
        .update({ hero_quotation: data })
        .eq('proyecto_id', proyectoId)
        .select('hero_quotation')
        .maybeSingle();
    } else {
      result = await client
        .from('proyecto_config')
        .insert({ proyecto_id: proyectoId, hero_quotation: data })
        .select('hero_quotation')
        .maybeSingle();
    }
    if (result.error) throw mapDbError(result.error, 'Error guardando el hero de la cotización');
    var saved = result.data && result.data.hero_quotation;
    console.log('[QE-LIB V7.2.74] updateHeroQuotation:RAW DB response hero_quotation.library');
    console.log(JSON.stringify(saved && saved.library, null, 2));
    return saved && typeof saved === 'object' ? sanitizeHeroQuotation(saved) : data;
  }

  return {
    list: list,
    listBrief: listBrief,
    getById: getById,
    create: create,
    update: update,
    updateIdentity: updateIdentity,
    rewriteSlugMediaPaths: rewriteSlugMediaPaths,
    updateShareMeta: updateShareMeta,
    fetchShareMeta: fetchShareMeta,
    fetchHeroQuotation: fetchHeroQuotation,
    updateHeroQuotation: updateHeroQuotation,
    checkSlugAvailability: checkSlugAvailability,
    remove: remove,
    reorder: reorder,
    setPublic: setPublic,
    createFromTemplate: createFromTemplate,
    cloneProject: cloneProject
  };
})();
