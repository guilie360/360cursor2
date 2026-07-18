/* Viviendas Sync — CRUD cards + planos/360 ↔ viviendas + archivos */
var ViviendasSyncEngine = (function () {
  var PROJECT_SELECT = 'id, nombre, slug, publicado, constructora_id';
  var VIVIENDA_SELECT =
    'id, proyecto_id, nombre, codigo, tipo, torre, piso, area_m2, habitaciones, banos, parqueaderos, precio, administracion, estado, publicado, planos_modo, tour360_modo, ' +
    'archivos(id, nombre, url, tipo, extension, orden, miniatura_url)';

  var ESTADOS = [
    { value: 'disponible', label: 'Disponible' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'vendido', label: 'Vendido' },
    { value: 'no_disponible', label: 'No disponible' }
  ];

  var PLANOS_MODOS = [
    { value: 'file', label: 'Subir archivo (PDF / imagen)' },
    { value: 'proximamente', label: 'Próximamente' }
  ];

  var TOUR360_MODOS = [
    { value: 'link', label: 'Agregar link 360°' },
    { value: 'proximamente', label: 'Próximamente' }
  ];

  /* File objects survive outside sessionStorage */
  var pendingPlanFiles = {};

  function getSlugFromUrl() {
    try {
      var slug = new URLSearchParams(window.location.search).get('proyecto');
      if (slug) return slug;
    } catch (e) {}
    return typeof DEFAULT_PROJECT_SLUG !== 'undefined' ? DEFAULT_PROJECT_SLUG : null;
  }

  function uid() {
    return 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function toNumber(v, fallback) {
    if (v == null || v === '') return fallback;
    var n = Number(String(v).replace(/[^\d.-]/g, ''));
    return isNaN(n) ? fallback : n;
  }

  function emptyItem() {
    return {
      id: null,
      localId: uid(),
      codigo: 'N-' + Date.now().toString().slice(-5),
      nombre: 'Nueva vivienda',
      tipo: 'Apartamento',
      torre: '',
      piso: '',
      area_m2: 0,
      habitaciones: 2,
      banos: 1,
      parqueaderos: 1,
      precio: 0,
      administracion: 0,
      estado: 'disponible',
      publicado: true,
      planosModo: 'proximamente',
      plans: [],
      planFileName: '',
      tour360Modo: 'proximamente',
      link360: ''
    };
  }

  function normalizePlans(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (p) {
      return {
        id: p.id || null,
        label: (p.label || p.nombre || 'Plano').trim() || 'Plano',
        url: p.url || '',
        extension: p.extension || ''
      };
    }).filter(function (p) { return !!p.url; });
  }

  function normalizeItem(raw) {
    var item = raw || {};
    var estado = item.estado || 'disponible';
    if (!ESTADOS.some(function (e) { return e.value === estado; })) estado = 'disponible';

    var planosModo = item.planosModo || item.planos_modo || 'proximamente';
    if (planosModo !== 'file') planosModo = 'proximamente';

    var tour360Modo = item.tour360Modo || item.tour360_modo || 'proximamente';
    if (tour360Modo !== 'link') tour360Modo = 'proximamente';

    var localId = item.localId || item.id || uid();
    return {
      id: item.id || null,
      localId: localId,
      codigo: item.codigo != null ? String(item.codigo).trim() : '',
      nombre: (item.nombre != null ? String(item.nombre) : 'Vivienda').trim() || 'Vivienda',
      tipo: (item.tipo != null ? String(item.tipo) : 'Apartamento').trim() || 'Apartamento',
      torre: item.torre != null ? String(item.torre).trim() : '',
      piso: item.piso != null && item.piso !== '' ? item.piso : '',
      area_m2: toNumber(item.area_m2, 0),
      habitaciones: Math.max(0, Math.round(toNumber(item.habitaciones, 0))),
      banos: Math.max(0, Math.round(toNumber(item.banos, 0))),
      parqueaderos: Math.max(0, Math.round(toNumber(item.parqueaderos, 0))),
      precio: Math.max(0, toNumber(item.precio, 0)),
      administracion: Math.max(0, toNumber(item.administracion, 0)),
      estado: estado,
      publicado: item.publicado !== false,
      planosModo: planosModo,
      plans: normalizePlans(item.plans),
      planFileName: item.planFileName || (pendingPlanFiles[localId] && pendingPlanFiles[localId].name) || '',
      tour360Modo: tour360Modo,
      link360: item.link360 != null ? String(item.link360).trim() : ''
    };
  }

  function normalizeList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeItem);
  }

  function ensureState(state) {
    state.viviendas = normalizeList(state.viviendas);
    return state.viviendas;
  }

  function setPendingPlanFile(localId, file) {
    if (!localId) return;
    if (file) pendingPlanFiles[localId] = file;
    else delete pendingPlanFiles[localId];
  }

  function getPendingPlanFile(localId) {
    return pendingPlanFiles[localId] || null;
  }

  function rowFromDb(row) {
    var archivos = Array.isArray(row.archivos) ? row.archivos.slice() : [];
    archivos.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
    var planos = archivos.filter(function (a) { return a.tipo === 'plano'; });
    var tour = archivos.find(function (a) { return a.tipo === 'tour_360'; });
    return normalizeItem({
      id: row.id,
      localId: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo,
      torre: row.torre,
      piso: row.piso,
      area_m2: row.area_m2,
      habitaciones: row.habitaciones,
      banos: row.banos,
      parqueaderos: row.parqueaderos,
      precio: row.precio,
      administracion: row.administracion,
      estado: row.estado,
      publicado: row.publicado,
      planos_modo: row.planos_modo,
      tour360_modo: row.tour360_modo,
      plans: planos.map(function (p) {
        return {
          id: p.id,
          label: p.nombre || 'Plano',
          url: p.url,
          extension: p.extension || ''
        };
      }),
      link360: tour ? (tour.url || '') : ''
    });
  }

  function payloadForDb(item, proyectoId) {
    var piso = item.piso;
    if (piso === '' || piso == null) piso = null;
    else piso = Math.round(toNumber(piso, 0));

    return {
      proyecto_id: proyectoId,
      nombre: item.nombre,
      codigo: item.codigo || null,
      tipo: item.tipo || null,
      torre: item.torre || null,
      piso: piso,
      area_m2: item.area_m2 || 0,
      habitaciones: item.habitaciones || 0,
      banos: item.banos || 0,
      parqueaderos: item.parqueaderos || 0,
      precio: item.precio || 0,
      administracion: item.administracion || 0,
      estado: item.estado || 'disponible',
      publicado: item.publicado !== false,
      planos_modo: item.planosModo === 'file' ? 'file' : 'proximamente',
      tour360_modo: item.tour360Modo === 'link' ? 'link' : 'proximamente'
    };
  }

  function payloadForRpc(item, proyectoId) {
    var row = payloadForDb(item, proyectoId);
    var out = {};
    Object.keys(row).forEach(function (key) {
      var val = row[key];
      out[key] = val == null ? '' : String(val);
    });
    if (item.id) out.id = String(item.id);
    out.publicado = row.publicado ? 'true' : 'false';
    out.area_m2 = String(row.area_m2 == null ? 0 : row.area_m2);
    out.habitaciones = String(row.habitaciones == null ? 0 : row.habitaciones);
    out.banos = String(row.banos == null ? 0 : row.banos);
    out.parqueaderos = String(row.parqueaderos == null ? 0 : row.parqueaderos);
    out.precio = String(row.precio == null ? 0 : row.precio);
    out.administracion = String(row.administracion == null ? 0 : row.administracion);
    out.piso = row.piso == null ? '' : String(row.piso);
    return out;
  }

  async function upsertViaRpc(client, item, proyectoId) {
    var result = await client.rpc('admin_sync_vivienda', {
      payload: payloadForRpc(item, proyectoId)
    });
    if (result.error) throw new Error(result.error.message || 'Error guardando vivienda');
    if (!result.data) throw new Error('Sin respuesta al guardar vivienda');
    var row = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
    return rowFromDb(Object.assign({}, row, { archivos: [] }));
  }

  async function fetchProjectBySlug(slug) {
    if (!slug) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('slug', slug)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando proyecto');
    return result.data || null;
  }

  async function fetchProjectById(id) {
    if (!id) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando proyecto');
    return result.data || null;
  }

  async function resolveProject(state) {
    var slug = getSlugFromUrl();
    if (slug) {
      var bySlug = await fetchProjectBySlug(slug);
      if (bySlug) return bySlug;
    }
    var id = state.draftProjectId ||
      (state.publishResult && state.publishResult.proyectoId) ||
      (typeof AdminState !== 'undefined' ? AdminState.getActiveProjectId() : null);
    if (id) return fetchProjectById(id);
    return null;
  }

  async function fetchViviendas(proyectoId) {
    var result = await AdminApi.getClient()
      .from('viviendas')
      .select(VIVIENDA_SELECT)
      .eq('proyecto_id', proyectoId)
      .order('codigo', { ascending: true });
    if (result.error) {
      /* Fallback without nested archivos if embed fails */
      var plain = await AdminApi.getClient()
        .from('viviendas')
        .select('id, proyecto_id, nombre, codigo, tipo, torre, piso, area_m2, habitaciones, banos, parqueaderos, precio, administracion, estado, publicado, planos_modo, tour360_modo')
        .eq('proyecto_id', proyectoId)
        .order('codigo', { ascending: true });
      if (plain.error) throw new Error(plain.error.message || result.error.message || 'Error cargando viviendas');
      return (plain.data || []).map(rowFromDb);
    }
    return (result.data || []).map(rowFromDb);
  }

  function bindStateFromProject(state, items, options) {
    options = options || {};
    if (options.preferDraft && Array.isArray(state.viviendas) && state.viviendas.length) {
      state.viviendas = normalizeList(state.viviendas);
      return state;
    }
    state.viviendas = normalizeList(items);
    return state;
  }

  async function bindFromUrl(state) {
    var project = await resolveProject(state);
    if (!project) {
      ensureState(state);
      return null;
    }
    state.draftProjectId = project.id;
    var items = await fetchViviendas(project.id);
    bindStateFromProject(state, items, { preferDraft: false });
    return project;
  }

  function extensionFromName(name) {
    var parts = String(name || '').split('.');
    if (parts.length < 2) return 'bin';
    return parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  }

  async function deleteArchivosByTipo(client, viviendaId, tipo) {
    var result = await client
      .from('archivos')
      .delete()
      .eq('vivienda_id', viviendaId)
      .eq('tipo', tipo);
    if (result.error) throw new Error(result.error.message || 'Error eliminando archivos');
  }

  async function syncMediaForItem(client, project, item, constructoraId) {
    if (!item.id) return item;

    /* Planos */
    if (item.planosModo === 'file') {
      var file = getPendingPlanFile(item.localId);
      if (file && typeof StorageApi !== 'undefined') {
        var uploaded = await StorageApi.upload(
          constructoraId,
          project.id,
          'viviendas/' + item.id + '/planos',
          file
        );
        await deleteArchivosByTipo(client, item.id, 'plano');
        var planInsert = await client.from('archivos').insert({
          proyecto_id: project.id,
          constructora_id: constructoraId,
          vivienda_id: item.id,
          tipo: 'plano',
          nombre: (file.name || 'Plano').replace(/\.[^.]+$/, ''),
          extension: extensionFromName(file.name),
          url: uploaded.publicUrl,
          orden: 1,
          estado: 'activo'
        }).select('id, nombre, url, extension').maybeSingle();
        if (planInsert.error) throw new Error(planInsert.error.message || 'Error guardando plano');
        item.plans = planInsert.data
          ? [{ id: planInsert.data.id, label: planInsert.data.nombre || 'Plano', url: planInsert.data.url, extension: planInsert.data.extension || '' }]
          : item.plans;
        setPendingPlanFile(item.localId, null);
        item.planFileName = '';
      }
    }

    /* Tour 360 */
    if (item.tour360Modo === 'link' && item.link360) {
      await deleteArchivosByTipo(client, item.id, 'tour_360');
      var tourInsert = await client.from('archivos').insert({
        proyecto_id: project.id,
        constructora_id: constructoraId,
        vivienda_id: item.id,
        tipo: 'tour_360',
        nombre: 'Tour 360 · ' + (item.nombre || item.codigo || 'Vivienda'),
        extension: 'url',
        url: item.link360,
        orden: 1,
        estado: 'activo'
      }).select('id, url').maybeSingle();
      if (tourInsert.error) throw new Error(tourInsert.error.message || 'Error guardando link 360');
      item.link360 = tourInsert.data ? tourInsert.data.url : item.link360;
    } else if (item.tour360Modo === 'proximamente') {
      /* Keep row optional — showroom uses modo flag */
    }

    return item;
  }

  async function sync(state, options) {
    options = options || {};
    if (typeof AdminApi === 'undefined' || !AdminApi.getClient) {
      throw new Error('Sesión admin no lista. Recarga BOXIES AI e inicia sesión de nuevo.');
    }
    var project = await resolveProject(state);
    if (!project) {
      if (options.requireProject) {
        throw new Error('Abre el builder desde el showroom del proyecto para sincronizar viviendas.');
      }
      return null;
    }

    state.draftProjectId = project.id;
    var items = ensureState(state);
    var client = AdminApi.getClient();
    var constructoraId = project.constructora_id ||
      (typeof AdminState !== 'undefined' ? AdminState.getConstructoraId() : null);

    var existingRes = await client
      .from('viviendas')
      .select('id')
      .eq('proyecto_id', project.id);
    if (existingRes.error) throw new Error(existingRes.error.message || 'Error leyendo viviendas');

    var existingIds = {};
    (existingRes.data || []).forEach(function (r) { existingIds[r.id] = true; });
    var keepIds = {};

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var localId = item.localId;
      var saved = null;
      var needsMedia = !!(getPendingPlanFile(localId) ||
        (item.tour360Modo === 'link' && item.link360));

      try {
        saved = await upsertViaRpc(client, item, project.id);
      } catch (rpcErr) {
        /* Fallback to direct table write if RPC unavailable */
        var payload = payloadForDb(item, project.id);
        if (item.id && existingIds[item.id]) {
          var updated = await client
            .from('viviendas')
            .update(payload)
            .eq('id', item.id)
            .select('id, proyecto_id, nombre, codigo, tipo, torre, piso, area_m2, habitaciones, banos, parqueaderos, precio, administracion, estado, publicado, planos_modo, tour360_modo')
            .maybeSingle();
          if (updated.error) throw new Error(updated.error.message || rpcErr.message || 'Error actualizando vivienda');
          if (!updated.data) throw new Error('No se pudo actualizar la vivienda (permisos o proyecto).');
          saved = rowFromDb(Object.assign({}, updated.data, { archivos: [] }));
        } else {
          var inserted = await client
            .from('viviendas')
            .insert(payload)
            .select('id, proyecto_id, nombre, codigo, tipo, torre, piso, area_m2, habitaciones, banos, parqueaderos, precio, administracion, estado, publicado, planos_modo, tour360_modo')
            .maybeSingle();
          if (inserted.error) throw new Error(inserted.error.message || rpcErr.message || 'Error creando vivienda');
          if (!inserted.data || !inserted.data.id) {
            throw new Error('No se pudo crear la vivienda. Revisa que estés logueado como admin.');
          }
          saved = rowFromDb(Object.assign({}, inserted.data, { archivos: [] }));
        }
      }

      if (!saved || !saved.id) {
        throw new Error('No se pudo guardar la vivienda.');
      }
      keepIds[saved.id] = true;

      /* Preserve pending file keyed by old localId → new id */
      if (localId && saved.localId && localId !== saved.localId && pendingPlanFiles[localId]) {
        pendingPlanFiles[saved.localId] = pendingPlanFiles[localId];
        delete pendingPlanFiles[localId];
      }
      saved.planosModo = item.planosModo;
      saved.tour360Modo = item.tour360Modo;
      saved.link360 = item.link360;
      saved.plans = item.plans && item.plans.length ? item.plans : saved.plans;
      saved.planFileName = item.planFileName;

      if (needsMedia) {
        if (!constructoraId && getPendingPlanFile(saved.localId)) {
          throw new Error('No se pudo resolver la constructora para subir el plano.');
        }
        if (!constructoraId && item.tour360Modo === 'link' && item.link360) {
          throw new Error('No se pudo resolver la constructora para guardar el link 360°.');
        }
        saved = await syncMediaForItem(client, project, saved, constructoraId || project.constructora_id);
      }
      items[i] = normalizeItem(saved);
    }

    var toDelete = Object.keys(existingIds).filter(function (id) { return !keepIds[id]; });
    if (toDelete.length) {
      var deletedRpc = await client.rpc('admin_delete_viviendas', {
        p_proyecto_id: project.id,
        p_ids: toDelete
      });
      if (deletedRpc.error) {
        var deleted = await client
          .from('viviendas')
          .delete()
          .in('id', toDelete);
        if (deleted.error) throw new Error(deleted.error.message || 'Error eliminando viviendas');
      }
    }

    /* Reload from DB to get fresh archivos */
    items = await fetchViviendas(project.id);
    state.viviendas = items;
    return {
      projectId: project.id,
      slug: project.slug,
      count: items.length,
      viviendas: items
    };
  }

  function formatPrice(n) {
    var num = Math.round(toNumber(n, 0));
    try {
      return '$' + num.toLocaleString('es-CO');
    } catch (e) {
      return '$' + String(num);
    }
  }

  return {
    ESTADOS: ESTADOS,
    PLANOS_MODOS: PLANOS_MODOS,
    TOUR360_MODOS: TOUR360_MODOS,
    emptyItem: emptyItem,
    normalizeItem: normalizeItem,
    normalizeList: normalizeList,
    ensureState: ensureState,
    setPendingPlanFile: setPendingPlanFile,
    getPendingPlanFile: getPendingPlanFile,
    resolveProject: resolveProject,
    bindFromUrl: bindFromUrl,
    sync: sync,
    formatPrice: formatPrice
  };
})();
