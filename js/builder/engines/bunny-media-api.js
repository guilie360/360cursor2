/* BOXIES V5.9.67 — Bunny Media client (Edge Function proxy; no Access Key in browser) */
var BunnyMediaApi = (function () {
  var CATEGORIES = {
    images: { label: 'Imágenes', folder: 'images', accept: 'image/*' },
    animations: { label: 'Animaciones / video', folder: 'animations', accept: 'video/*,image/gif' },
    panoramas: { label: 'Panoramas 360', folder: 'panoramas', accept: 'image/*' },
    floorplans: { label: 'Planos', folder: 'floorplans', accept: 'image/*,application/pdf' },
    documents: { label: 'Documentos', folder: 'documents', accept: '.pdf,.doc,.docx,image/*' },
    thumbnails: { label: 'Miniaturas', folder: 'thumbnails', accept: 'image/*' }
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
    return {
      id: 'bunny-' + row.id,
      type: tipoToAssetType(row.tipo),
      filename: row.nombre || null,
      provider: 'bunny',
      storagePath: row.storage_path || null,
      publicUrl: row.url || null,
      thumbnailUrl: row.miniatura_url || row.url || null,
      status: 'synced',
      mimeType: null,
      size: row.peso_mb != null ? Math.round(Number(row.peso_mb) * 1048576) : null,
      archivoId: row.id
    };
  }

  /** Upsert archivos bunny rows into state.projectAssets (Experiencia library). */
  function syncArchivosToProjectAssets(state, rows) {
    if (!state || typeof ExperienciaEngine === 'undefined') return [];
    var synced = [];
    (rows || []).forEach(function (row) {
      if (!row || row.storage_provider !== 'bunny') return;
      var partial = archivoToAssetPartial(row);
      if (!partial) return;
      var asset = ExperienciaEngine.upsertAsset(state, partial);
      synced.push(asset);
    });
    return synced;
  }

  async function invokeUpload(projectId, category, file) {
    if (!projectId) throw new Error('project_id requerido');
    if (!CATEGORIES[category]) throw new Error('Categoría inválida');
    if (!file) throw new Error('Archivo requerido');

    var client = getClient();
    var form = new FormData();
    form.append('project_id', projectId);
    form.append('category', category);
    form.append('file', file, file.name || 'upload.bin');

    var result = await client.functions.invoke('bunny-media', { body: form });
    if (result.error) {
      var msg = result.error.message || 'Error invocando bunny-media';
      /* Prefer function JSON body when present */
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
    /* supabase-js invoke GET via functions.invoke may not pass query — fallback REST */
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

  /**
   * Upload + sync into projectAssets.
   * Returns { archivo, asset, publicUrl, storagePath }
   */
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
    tipoToAssetType: tipoToAssetType
  };
})();
