/* BOXIES V5.9.69 — Bunny Media client (Edge Function proxy; no Access Key in browser) */
var BunnyMediaApi = (function () {
  /**
   * Media hub categories.
   * mode: 'upload' → Bunny · 'tours' → Lapentor URL manager (no file upload)
   * folder: Bunny path segment under projects/{id}/
   */
  var CATEGORIES = {
    images: {
      label: 'Imágenes',
      folder: 'images',
      accept: 'image/*',
      mode: 'upload',
      bunnyCategory: 'images'
    },
    animations: {
      label: 'Videos / Animaciones',
      folder: 'animations',
      accept: 'video/*,image/gif,image/webp',
      mode: 'upload',
      bunnyCategory: 'animations'
    },
    plans2d: {
      label: 'Planos 2D',
      folder: 'plans-2d',
      accept: 'image/*,application/pdf',
      mode: 'upload',
      bunnyCategory: 'plans2d'
    },
    plans3d: {
      label: 'Planos 3D',
      folder: 'plans-3d',
      accept: 'image/*,model/*,.glb,.gltf,.obj',
      mode: 'upload',
      bunnyCategory: 'plans3d'
    },
    tours360: {
      label: 'Tours 360',
      folder: null,
      accept: null,
      mode: 'tours',
      bunnyCategory: null
    },
    documents: {
      label: 'Documentos',
      folder: 'documents',
      accept: '.pdf,.doc,.docx,image/*',
      mode: 'upload',
      bunnyCategory: 'documents'
    },
    ui: {
      label: 'Recursos UI',
      folder: 'ui',
      accept: 'image/*,.svg,image/svg+xml',
      mode: 'upload',
      bunnyCategory: 'ui'
    }
  };

  /* Legacy bunny folder aliases still returned by older uploads */
  var FOLDER_ALIASES = {
    images: ['images'],
    animations: ['animations'],
    plans2d: ['plans-2d', 'floorplans'],
    plans3d: ['plans-3d'],
    documents: ['documents'],
    ui: ['ui', 'thumbnails']
  };

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

  function archivoToAssetPartial(row) {
    if (!row) return null;
    var provider = row.storage_provider || 'bunny';
    return {
      id: (provider === 'bunny' ? 'bunny-' : 'media-') + row.id,
      type: tipoToAssetType(row.tipo),
      filename: row.nombre || null,
      provider: provider,
      storagePath: row.storage_path || null,
      publicUrl: row.url || null,
      thumbnailUrl: row.miniatura_url || (row.tipo !== 'tour_360' ? row.url : null) || null,
      status: 'synced',
      mimeType: null,
      size: row.peso_mb != null ? Math.round(Number(row.peso_mb) * 1048576) : null,
      archivoId: row.id
    };
  }

  function pathMatchesCategory(storagePath, categoryKey) {
    var aliases = FOLDER_ALIASES[categoryKey] || [(CATEGORIES[categoryKey] && CATEGORIES[categoryKey].folder)];
    var path = String(storagePath || '');
    for (var i = 0; i < aliases.length; i++) {
      var folder = aliases[i];
      if (!folder) continue;
      if (path.indexOf('/' + folder + '/') !== -1) return true;
    }
    return false;
  }

  function filterItemsByCategory(items, categoryKey) {
    if (!categoryKey || categoryKey === 'tours360') return items || [];
    return (items || []).filter(function (row) {
      if (!row) return false;
      if (row.storage_provider === 'lapentor') return false;
      return pathMatchesCategory(row.storage_path, categoryKey);
    });
  }

  /** Upsert archivos bunny rows into state.projectAssets (Experiencia library). */
  function syncArchivosToProjectAssets(state, rows) {
    if (!state || typeof ExperienciaEngine === 'undefined') return [];
    var synced = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      if (row.storage_provider && row.storage_provider !== 'bunny') return;
      var partial = archivoToAssetPartial(row);
      if (!partial) return;
      var asset = ExperienciaEngine.upsertAsset(state, partial);
      synced.push(asset);
    });
    return synced;
  }

  async function invokeUpload(projectId, category, file) {
    if (!projectId) throw new Error('project_id requerido');
    var meta = CATEGORIES[category];
    if (!meta || meta.mode !== 'upload') throw new Error('Categoría no admite upload a Bunny');
    if (!file) throw new Error('Archivo requerido');

    var bunnyCat = meta.bunnyCategory || category;
    var client = getClient();
    var form = new FormData();
    form.append('project_id', projectId);
    form.append('category', bunnyCat);
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
    var result = await client.functions.invoke('bunny-media?project_id=' + encodeURIComponent(projectId), {
      method: 'GET'
    });
    if (result.error || !result.data) {
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
    if (result.data.ok === false) throw new Error(result.data.error || 'List failed');
    return result.data.items || [];
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

  async function uploadAndSync(state, projectId, category, file) {
    var data = await invokeUpload(projectId, category, file);
    var asset = null;
    if (state && data.archivo) {
      var synced = syncArchivosToProjectAssets(state, [data.archivo]);
      asset = synced[0] || null;
    }
    return {
      archivo: data.archivo,
      asset: asset,
      publicUrl: data.publicUrl,
      storagePath: data.storagePath,
      category: data.category
    };
  }

  async function refreshProjectAssets(state, projectId) {
    var items = await list(projectId);
    return syncArchivosToProjectAssets(state, items);
  }

  return {
    CATEGORIES: CATEGORIES,
    list: list,
    remove: remove,
    uploadAndSync: uploadAndSync,
    refreshProjectAssets: refreshProjectAssets,
    syncArchivosToProjectAssets: syncArchivosToProjectAssets,
    archivoToAssetPartial: archivoToAssetPartial,
    tipoToAssetType: tipoToAssetType,
    filterItemsByCategory: filterItemsByCategory,
    pathMatchesCategory: pathMatchesCategory
  };
})();
