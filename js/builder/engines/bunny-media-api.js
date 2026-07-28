/* BOXIES V5.9.72 — Bunny Media client (node-centric assets; no Access Key in browser) */
var BunnyMediaApi = (function () {
  function categoriesFromNodes() {
    if (typeof MediaNodesEngine === 'undefined') return {};
    var map = {};
    MediaNodesEngine.MEDIA_CATEGORIES.forEach(function (c) {
      map[c.key] = {
        label: c.label,
        folder: c.folder,
        accept: c.accept,
        mode: c.mode,
        bunnyCategory: c.folder || c.key,
        assetType: c.assetType
      };
    });
    map.animations = map.videos;
    return map;
  }

  function getCategories() {
    return categoriesFromNodes();
  }

  function getClient() {
    if (typeof AdminApi !== 'undefined' && AdminApi.getClient) return AdminApi.getClient();
    if (typeof PlatformAuth !== 'undefined' && PlatformAuth.getClient) return PlatformAuth.getClient();
    throw new Error('Cliente Supabase no disponible');
  }

  function tipoToAssetType(tipo) {
    if (tipo === 'video') return 'video';
    if (tipo === 'tour_360') return 'pano360';
    if (tipo === 'plano') return 'plan';
    if (tipo === 'pdf' || tipo === 'brochure') return 'document';
    return 'image';
  }

  function parseNodeIdFromPath(storagePath) {
    var path = String(storagePath || '');
    var m = path.match(/\/(?:images|videos|animations|plans2d|plans3d|plans-2d|plans-3d|floorplans|documents|ui|thumbnails)\/([^/]+)\//);
    if (!m) return null;
    var seg = m[1];
    if (/^\d{10,}-/.test(seg)) return null;
    return seg;
  }

  function parseCategoryFromPath(storagePath) {
    var path = String(storagePath || '');
    if (path.indexOf('/videos/') !== -1 || path.indexOf('/animations/') !== -1) return 'videos';
    if (path.indexOf('/plans3d/') !== -1 || path.indexOf('/plans-3d/') !== -1) return 'plans3d';
    if (path.indexOf('/plans2d/') !== -1 || path.indexOf('/plans-2d/') !== -1 || path.indexOf('/floorplans/') !== -1) return 'plans2d';
    if (path.indexOf('/documents/') !== -1) return 'documents';
    if (path.indexOf('/ui/') !== -1 || path.indexOf('/thumbnails/') !== -1) return 'ui';
    if (path.indexOf('/images/') !== -1) return 'images';
    return null;
  }

  function archivoToAssetPartial(row, extras) {
    if (!row) return null;
    extras = extras || {};
    var provider = row.storage_provider || 'bunny';
    var nodeId = extras.nodeId || extras.node_id || parseNodeIdFromPath(row.storage_path) || null;
    var category = extras.category || parseCategoryFromPath(row.storage_path) || null;
    var type = extras.type || tipoToAssetType(row.tipo);
    if (category === 'videos') type = 'video';
    if (category === 'tours360') type = 'pano360';
    return {
      id: (provider === 'bunny' ? 'bunny-' : 'media-') + row.id,
      type: type,
      category: category,
      filename: row.nombre || null,
      provider: provider,
      storagePath: row.storage_path || null,
      publicUrl: row.url || null,
      thumbnailUrl: row.miniatura_url || (row.tipo !== 'tour_360' ? row.url : null) || null,
      status: 'synced',
      mimeType: null,
      size: row.peso_mb != null ? Math.round(Number(row.peso_mb) * 1048576) : null,
      archivoId: row.id,
      nodeId: nodeId,
      projectId: extras.projectId || row.proyecto_id || null,
      entityRef: extras.entityRef || null,
      planKind: category === 'plans3d' ? '3d' : (category === 'plans2d' ? '2d' : null),
      metadata: extras.metadata || null,
      sortOrder: row.orden != null ? row.orden : 0,
      orphan: false
    };
  }

  function pathMatchesCategory(storagePath, categoryKey) {
    var key = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.normalizeCategoryKey(categoryKey)
      : categoryKey;
    var cat = typeof MediaNodesEngine !== 'undefined' ? MediaNodesEngine.getCategory(key) : null;
    var folders = [];
    if (cat && cat.folder) folders.push(cat.folder);
    if (cat && cat.aliases) folders = folders.concat(cat.aliases);
    if (key === 'videos') folders.push('videos', 'animations');
    if (key === 'plans2d') folders.push('plans2d', 'plans-2d', 'floorplans');
    if (key === 'plans3d') folders.push('plans3d', 'plans-3d');
    var path = String(storagePath || '');
    for (var i = 0; i < folders.length; i++) {
      if (folders[i] && path.indexOf('/' + folders[i] + '/') !== -1) return true;
    }
    return false;
  }

  function filterItemsByCategory(items, categoryKey) {
    if (!categoryKey || categoryKey === 'tours360') return items || [];
    return (items || []).filter(function (row) {
      if (!row || row.storage_provider === 'lapentor') return false;
      return pathMatchesCategory(row.storage_path, categoryKey);
    });
  }

  function syncArchivosToProjectAssets(state, rows, extrasByArchivoId) {
    if (!state || typeof ExperienciaEngine === 'undefined') return [];
    extrasByArchivoId = extrasByArchivoId || {};
    var synced = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      if (row.storage_provider && row.storage_provider !== 'bunny') return;
      var extras = extrasByArchivoId[row.id] || {};
      if (state.projectAssets && state.projectAssets.byId) {
        var prev = state.projectAssets.byId['bunny-' + row.id];
        if (prev) {
          if (!extras.nodeId && prev.nodeId) extras.nodeId = prev.nodeId;
          if (!extras.entityRef && prev.entityRef) extras.entityRef = prev.entityRef;
          if (!extras.category && prev.category) extras.category = prev.category;
          if (!extras.type && prev.type) extras.type = prev.type;
          if (!extras.projectId && prev.projectId) extras.projectId = prev.projectId;
        }
      }
      var partial = archivoToAssetPartial(row, extras);
      if (!partial) return;
      synced.push(ExperienciaEngine.upsertAsset(state, partial));
    });
    return synced;
  }

  async function invokeUpload(projectId, category, file, opts) {
    opts = opts || {};
    if (!projectId) throw new Error('project_id requerido');
    var key = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.normalizeCategoryKey(category)
      : category;
    var meta = getCategories()[key];
    if (!meta || meta.mode !== 'upload') throw new Error('Categoría no admite upload a Bunny');
    if (!file) throw new Error('Archivo requerido');
    if (!opts.nodeId) throw new Error('Selecciona un nodo del Canvas para subir el archivo');

    var bunnyCat = meta.bunnyCategory || key;
    var client = getClient();
    var form = new FormData();
    form.append('project_id', projectId);
    form.append('category', bunnyCat);
    form.append('node_id', opts.nodeId);
    form.append('file', file, file.name || 'upload.bin');

    var result = await client.functions.invoke('bunny-media', { body: form });
    if (result.error) {
      var msg = result.error.message || 'Error invocando bunny-media';
      if (result.data && result.data.error) msg = result.data.error;
      var err = new Error(msg);
      err.code = result.data && result.data.code;
      err.data = result.data;
      throw err;
    }
    if (!result.data || result.data.ok === false) {
      var e2 = new Error((result.data && result.data.error) || 'Upload Bunny falló');
      e2.code = result.data && result.data.code;
      e2.data = result.data;
      throw e2;
    }
    return result.data;
  }

  async function list(projectId) {
    if (!projectId) throw new Error('project_id requerido');
    var client = getClient();
    var session = await client.auth.getSession();
    var token = session && session.data && session.data.session && session.data.session.access_token;
    if (!token) throw new Error('Sesión requerida');
    var base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') +
      '/functions/v1/bunny-media?project_id=' + encodeURIComponent(projectId);
    var res = await fetch(base, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        apikey: typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : ''
      }
    });
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok || body.ok === false) {
      throw new Error(body.error || ('List failed: ' + res.status));
    }
    return body.items || [];
  }

  async function remove(projectId, opts) {
    opts = opts || {};
    var client = getClient();
    var result = await client.functions.invoke('bunny-media', {
      body: {
        action: 'delete',
        project_id: projectId,
        archivo_id: opts.archivoId || null,
        storage_path: opts.storagePath || null
      }
    });
    if (result.error) {
      throw new Error(
        (result.data && result.data.error) || result.error.message || 'Delete failed'
      );
    }
    if (!result.data || result.data.ok === false) {
      throw new Error((result.data && result.data.error) || 'Delete failed');
    }
    return result.data;
  }

  async function uploadAndSync(state, projectId, category, file, opts) {
    opts = opts || {};
    var key = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.normalizeCategoryKey(category)
      : category;
    var data = await invokeUpload(projectId, key, file, opts);
    var asset = null;
    var meta = getCategories()[key] || {};
    if (state && data.archivo) {
      var extras = {};
      extras[data.archivo.id] = {
        nodeId: opts.nodeId || null,
        entityRef: opts.entityRef || null,
        type: meta.assetType || null,
        category: key,
        projectId: projectId
      };
      var synced = syncArchivosToProjectAssets(state, [data.archivo], extras);
      asset = synced[0] || null;
    }
    return {
      archivo: data.archivo,
      asset: asset,
      publicUrl: data.publicUrl,
      storagePath: data.storagePath,
      category: key,
      nodeId: opts.nodeId || null
    };
  }

  async function refreshProjectAssets(state, projectId) {
    var items = await list(projectId);
    return syncArchivosToProjectAssets(state, items, null);
  }

  return {
    get CATEGORIES() { return getCategories(); },
    list: list,
    remove: remove,
    uploadAndSync: uploadAndSync,
    refreshProjectAssets: refreshProjectAssets,
    syncArchivosToProjectAssets: syncArchivosToProjectAssets,
    archivoToAssetPartial: archivoToAssetPartial,
    tipoToAssetType: tipoToAssetType,
    filterItemsByCategory: filterItemsByCategory,
    pathMatchesCategory: pathMatchesCategory,
    parseNodeIdFromPath: parseNodeIdFromPath,
    parseCategoryFromPath: parseCategoryFromPath
  };
})();
