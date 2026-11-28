/* BOXIES V5.9.86 — Bunny Media client (slug paths; structure sync; no Access Key in browser) */
var BunnyMediaApi = (function () {
  /* Must match supabase/functions/bunny-media limits. */
  var IMAGE_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  var VIDEO_MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
  /* Back-compat alias — image limit is the default for library uploads. */
  var MAX_UPLOAD_BYTES = IMAGE_MAX_UPLOAD_BYTES;
  var MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

  function isVideoUpload(file, category) {
    var key = String(category || '').toLowerCase();
    if (key === 'videos' || key === 'animations') return true;
    if (!file) return false;
    if (file.type && String(file.type).indexOf('video/') === 0) return true;
    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(String(file.name || ''));
  }

  function maxBytesForUpload(file, category) {
    return isVideoUpload(file, category) ? VIDEO_MAX_UPLOAD_BYTES : IMAGE_MAX_UPLOAD_BYTES;
  }

  function uploadLimitMessage(file, category) {
    var maxMb = Math.round(maxBytesForUpload(file, category) / (1024 * 1024));
    return 'Archivo demasiado grande (máx ' + maxMb + ' MB)';
  }

  function assertFileWithinUploadLimit(file, category) {
    if (!file) throw new Error('Archivo requerido');
    var size = Number(file.size);
    if (!isFinite(size) || size <= 0) throw new Error('Archivo vacío');
    var maxBytes = maxBytesForUpload(file, category);
    if (size > maxBytes) {
      var err = new Error(uploadLimitMessage(file, category));
      err.code = 'FILE_TOO_LARGE';
      err.maxBytes = maxBytes;
      throw err;
    }
  }

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

  function slugifyLocal(name) {
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.slugify) {
      return MediaNodesEngine.slugify(name);
    }
    return String(name || '')
      .toLowerCase()
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'nodo';
  }

  /* Legacy: projects/{uuid}/{category}/{nodeId}/file */
  function parseNodeIdFromPath(storagePath) {
    var path = String(storagePath || '');
    var mediaM = path.match(/\/media\/([^/]+)\//);
    if (mediaM) return null;
    var m = path.match(/\/(?:images|videos|animations|plans2d|plans3d|plans-2d|plans-3d|floorplans|documents|ui|thumbnails|tours360)\/([^/]+)\//);
    if (!m) return null;
    var seg = m[1];
    if (/^\d{10,}-/.test(seg)) return null;
    if (seg === 'media' || seg === 'hero') return null;
    return seg;
  }

  function parseNodeSlugFromPath(storagePath) {
    var path = String(storagePath || '');
    var m = path.match(/\/media\/([^/]+)\//);
    return m ? m[1] : null;
  }

  function parseCategoryFromPath(storagePath) {
    var path = String(storagePath || '');
    if (path.indexOf('/tours360/') !== -1) return 'tours360';
    if (path.indexOf('/videos/') !== -1 || path.indexOf('/animations/') !== -1) return 'videos';
    if (path.indexOf('/plans3d/') !== -1 || path.indexOf('/plans-3d/') !== -1) return 'plans3d';
    if (path.indexOf('/plans2d/') !== -1 || path.indexOf('/plans-2d/') !== -1 || path.indexOf('/floorplans/') !== -1) return 'plans2d';
    if (path.indexOf('/documents/') !== -1) return 'documents';
    if (path.indexOf('/ui/') !== -1 || path.indexOf('/thumbnails/') !== -1) return 'ui';
    if (path.indexOf('/logos/') !== -1) return 'images';
    if (path.indexOf('/images/') !== -1) return 'images';
    return null;
  }

  function resolveNodeIdFromPath(state, storagePath) {
    var slug = parseNodeSlugFromPath(storagePath);
    if (slug && state && typeof MediaNodesEngine !== 'undefined') {
      var nodes = MediaNodesEngine.listCompatibleNodes(state) || [];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].bunny_slug === slug) return nodes[i].node_id;
      }
    }
    return parseNodeIdFromPath(storagePath);
  }

  function archivoToAssetPartial(row, extras) {
    if (!row) return null;
    extras = extras || {};
    var provider = row.storage_provider || 'bunny';
    var nodeId = extras.nodeId || extras.node_id || null;
    if (!nodeId && extras.state) {
      nodeId = resolveNodeIdFromPath(extras.state, row.storage_path);
    }
    if (!nodeId) nodeId = parseNodeIdFromPath(row.storage_path);
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
    if (key === 'tours360') folders.push('tours360');
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
      extras.state = state;
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
      if (!extras.nodeId) {
        extras.nodeId = resolveNodeIdFromPath(state, row.storage_path);
      }
      var partial = archivoToAssetPartial(row, extras);
      if (!partial) return;
      synced.push(ExperienciaEngine.upsertAsset(state, partial));
    });
    return synced;
  }

  function logUpload() {
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log.apply(console, ['[BunnyMedia]'].concat([].slice.call(arguments)));
      }
    } catch (e) { /* ignore */ }
  }

  async function authHeaders() {
    var client = getClient();
    var session = await client.auth.getSession();
    var token = session && session.data && session.data.session && session.data.session.access_token;
    if (!token) throw new Error('Sesión requerida');
    return {
      Authorization: 'Bearer ' + token,
      apikey: typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : ''
    };
  }

  async function invokeJson(body) {
    var headers = await authHeaders();
    headers['Content-Type'] = 'application/json';
    var base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') +
      '/functions/v1/bunny-media';
    var res = await fetch(base, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {})
    });
    var text = await res.text().catch(function () { return ''; });
    var data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) {
      data = { ok: false, error: text || ('HTTP ' + res.status) };
    }
    if (!res.ok || data.ok === false) {
      var err = new Error((data && data.error) || ('bunny-media JSON failed: ' + res.status));
      err.code = data && data.code;
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function probeBunny() {
    var headers = await authHeaders();
    var base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') +
      '/functions/v1/bunny-media?probe=bunny';
    var res = await fetch(base, { method: 'GET', headers: headers });
    var body = await res.json().catch(function () { return {}; });
    logUpload('✔ Probe Bunny', res.status, body);
    if (!res.ok || body.ok === false) {
      var err = new Error((body && body.error) || ('Probe Bunny falló: ' + res.status));
      err.code = body && body.code;
      err.data = body;
      throw err;
    }
    return body;
  }

  async function ensureFolders(projectId, showroomSlug, folders) {
    return invokeJson({
      action: 'ensure_folders',
      project_id: projectId,
      showroom_slug: showroomSlug,
      folders: folders || []
    });
  }

  async function listFolder(projectId, showroomSlug, path) {
    return invokeJson({
      action: 'list_folder',
      project_id: projectId,
      showroom_slug: showroomSlug,
      path: path || ''
    });
  }

  async function deleteFolder(projectId, showroomSlug, path, recursive) {
    return invokeJson({
      action: 'delete_folder',
      project_id: projectId,
      showroom_slug: showroomSlug,
      path: path,
      recursive: !!recursive
    });
  }

  async function renameFolder(projectId, showroomSlug, fromPath, toPath) {
    return invokeJson({
      action: 'rename_folder',
      project_id: projectId,
      showroom_slug: showroomSlug,
      from: fromPath,
      to: toPath
    });
  }

  /** Move projects/{oldSlug}/… → projects/{newSlug}/… and rewrite DB paths. */
  async function renameShowroom(projectId, oldSlug, newSlug) {
    var from = slugifyLocal(oldSlug);
    var to = slugifyLocal(newSlug);
    if (!projectId || !from || !to) {
      throw new Error('project_id, old_slug y new_slug son requeridos');
    }
    if (from === to) {
      return {
        ok: true,
        old_slug: from,
        new_slug: to,
        filesMoved: 0,
        archivosUpdated: 0,
        configUpdated: false
      };
    }
    logUpload('✔ rename_showroom', from, '→', to);
    var data = await invokeJson({
      action: 'rename_showroom',
      project_id: projectId,
      showroom_slug: from,
      old_slug: from,
      new_slug: to
    });
    logUpload('✔ rename_showroom done', data);
    return data;
  }

  async function syncAllShowrooms() {
    logUpload('✔ sync_all_showrooms…');
    var data = await invokeJson({ action: 'sync_all_showrooms' });
    logUpload('✔ sync_all_showrooms done', data);
    return data;
  }

  async function syncStructure(state, projectId, showroomSlug) {
    if (!projectId || !showroomSlug) throw new Error('project_id y showroom_slug requeridos');
    var slug = slugifyLocal(showroomSlug);
    var slugInfo = typeof MediaNodesEngine !== 'undefined'
      ? MediaNodesEngine.ensureBunnySlugs(state)
      : { renames: [], nodes: [] };

    for (var r = 0; r < (slugInfo.renames || []).length; r++) {
      var ren = slugInfo.renames[r];
      if (!ren || !ren.from || !ren.to || ren.from === ren.to) continue;
      try {
        logUpload('✔ Rename nodo', ren.from, '→', ren.to);
        await renameFolder(projectId, slug, 'media/' + ren.from, 'media/' + ren.to);
      } catch (e) {
        logUpload('rename skipped/failed', ren.from, e && e.message);
      }
    }

    var folders = ['hero', 'hero/images', 'hero/logos', 'hero/videos', 'media'];
    var nodes = slugInfo.nodes || [];
    var desiredSlugs = {};
    nodes.forEach(function (n) {
      if (!n || !n.bunny_slug) return;
      desiredSlugs[n.bunny_slug] = true;
      folders.push('media/' + n.bunny_slug);
      var enabled = null;
      if (state && state.bunnyMedia && state.bunnyMedia.categoryConfig) {
        enabled = state.bunnyMedia.categoryConfig[n.node_id];
      }
      var cats = (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.MEDIA_CATEGORIES) || [];
      cats.forEach(function (c) {
        if (!c || !c.folder) return;
        var on = enabled && enabled.hasOwnProperty(c.key) ? !!enabled[c.key] : true;
        if (on) folders.push('media/' + n.bunny_slug + '/' + c.folder);
      });
    });

    logUpload('✔ ensure_folders', folders.length);
    await ensureFolders(projectId, slug, folders);

    /* V5.9.89 — purge orphan media/{slug}/ folders not in desired set */
    var purged = [];
    try {
      var listed = await listFolder(projectId, slug, 'media');
      var items = (listed && listed.items) || [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item) continue;
        var isDir = item.isDirectory || item.IsDirectory;
        if (!isDir) continue;
        var name = slugifyLocal(item.name || item.ObjectName || '');
        if (!name || desiredSlugs[name]) continue;
        try {
          logUpload('✔ Purge orphan', 'media/' + name);
          await deleteFolder(projectId, slug, 'media/' + name, true);
          purged.push(name);
        } catch (delErr) {
          logUpload('purge failed', name, delErr && delErr.message);
        }
      }
    } catch (listErr) {
      logUpload('list media for purge failed', listErr && listErr.message);
    }

    return {
      showroomSlug: slug,
      folders: folders,
      renames: slugInfo.renames || [],
      purged: purged,
      nodes: nodes
    };
  }

  /** Alias: full create/rename/delete reconcile after Aplicar estructura */
  async function reconcileStructure(state, projectId, showroomSlug) {
    return syncStructure(state, projectId, showroomSlug);
  }

  async function ensureNodeStructure(projectId, showroomSlug, nodeSlug, categoryKeys) {
    var slug = slugifyLocal(showroomSlug);
    var ns = slugifyLocal(nodeSlug);
    var folders = ['media/' + ns];
    (categoryKeys || []).forEach(function (key) {
      var folder = typeof MediaNodesEngine !== 'undefined'
        ? MediaNodesEngine.categoryFolder(key)
        : key;
      if (folder) folders.push('media/' + ns + '/' + folder);
    });
    return ensureFolders(projectId, slug, folders);
  }

  /* Matches bunny-media HERO_FOLDERS — logos is edge-only, not in MEDIA_CATEGORIES. */
  var HERO_UPLOAD_CATEGORIES = {
    images: { folder: 'images' },
    logos: { folder: 'logos' },
    videos: { folder: 'videos' }
  };

  /* Project-level media under reserved Canvas-less node `showroom`. */
  var SHOWROOM_NODE_ID = 'showroom';
  var SHOWROOM_NODE_SLUG = 'showroom';
  var SHOWROOM_UPLOAD_CATEGORIES = {
    images: { folder: 'images', mode: 'upload' },
    videos: { folder: 'videos', mode: 'upload' },
    plans2d: { folder: 'plans2d', mode: 'upload' },
    plans3d: { folder: 'plans3d', mode: 'upload' },
    documents: { folder: 'documents', mode: 'upload' },
    ui: { folder: 'ui', mode: 'upload' },
    tours360: { folder: 'tours360', mode: 'upload' },
    logos: { folder: 'logos', mode: 'upload' }
  };

  async function invokeUpload(projectId, category, file, opts) {
    opts = opts || {};
    if (!projectId) throw new Error('project_id requerido');
    var scope = String(opts.scope || 'media').trim().toLowerCase() === 'hero'
      ? 'hero'
      : 'media';
    var key = String(category || '').trim().toLowerCase();
    if (scope !== 'hero' && typeof MediaNodesEngine !== 'undefined') {
      key = MediaNodesEngine.normalizeCategoryKey(category);
    }
    var fromNodes = scope === 'hero' ? null : getCategories()[key];
    var meta = scope === 'hero'
      ? HERO_UPLOAD_CATEGORIES[key]
      : ((fromNodes && fromNodes.mode === 'upload')
        ? fromNodes
        : SHOWROOM_UPLOAD_CATEGORIES[key]);
    if (scope === 'hero') {
      if (!meta) {
        throw new Error('category inválida para scope=hero (usa images|logos|videos)');
      }
    } else if (!meta || meta.mode !== 'upload') {
      throw new Error('Categoría no admite upload a Bunny');
    }
    if (!file) throw new Error('Archivo requerido');
    /* Reject before network — avoid waiting for a full multipart round-trip. */
    assertFileWithinUploadLimit(file, key);

    var showroomSlug = slugifyLocal(opts.showroomSlug || '');
    if (!showroomSlug) throw new Error('Slug del showroom requerido para Bunny');

    var nodeSlug = '';
    var nodeId = opts.nodeId || '';
    if (scope === 'media') {
      if (!nodeId) throw new Error('Selecciona un nodo del Canvas para subir el archivo');
      nodeSlug = slugifyLocal(opts.nodeSlug || '');
      if (!nodeSlug && opts.state) {
        nodeSlug = typeof MediaNodesEngine !== 'undefined'
          ? MediaNodesEngine.getNodeBunnySlug(opts.state, opts.nodeId)
          : slugifyLocal(opts.nodeId);
      }
      if (!nodeSlug) throw new Error('Slug del nodo requerido para Bunny');
    }

    var bunnyCat = key;
    var form = new FormData();
    form.append('project_id', projectId);
    form.append('category', bunnyCat);
    form.append('showroom_slug', showroomSlug);
    form.append('scope', scope);
    if (nodeId) form.append('node_id', nodeId);
    if (nodeSlug) form.append('node_slug', nodeSlug);
    var libraryFolder = String(opts.libraryFolder || opts.library_folder || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    if (libraryFolder && scope === 'media') form.append('library_folder', libraryFolder);
    form.append('file', file, file.name || 'upload.bin');

    var folderHint = (meta && meta.folder) || bunnyCat;
    var expectedPathHint = scope === 'hero'
      ? ('projects/' + showroomSlug + '/hero/' + folderHint + '/' + (file.name || 'file'))
      : ('projects/' + showroomSlug + '/media/' + nodeSlug + '/' + folderHint +
        (libraryFolder ? ('/carpetas/' + libraryFolder) : '') +
        '/' + (file.name || 'file'));
    logUpload('✔ Archivo recibido', file.name, file.size, file.type || '');
    logUpload('✔ Ruta generada (hint)', expectedPathHint);

    var headers = await authHeaders();
    var base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') +
      '/functions/v1/bunny-media';
    logUpload('✔ URL Edge', base);
    var res = await fetch(base, {
      method: 'POST',
      headers: headers,
      body: form
    });
    var bodyText = await res.text().catch(function () { return ''; });
    var body = {};
    try { body = bodyText ? JSON.parse(bodyText) : {}; } catch (e) {
      body = { ok: false, error: bodyText || ('HTTP ' + res.status) };
    }
    logUpload('✔ Status HTTP', res.status);
    logUpload('✔ Body respuesta', body);
    if (body && body.storagePath) logUpload('✔ Ruta final', body.storagePath);
    if (body && body.publicUrl) logUpload('✔ CDN URL', body.publicUrl);
    if (body && body.bunnyStatus) logUpload('✔ Bunny status', body.bunnyStatus);

    if (!res.ok || body.ok === false) {
      var msg = (body && body.error) || ('Upload Bunny falló: HTTP ' + res.status);
      if (body && body.code === 'MISSING_SECRET') {
        msg = 'Falta BUNNY_STORAGE_ACCESS_KEY en Supabase Secrets (Storage Zone Password de boxies).';
      } else if (body && body.code === 'SHOWROOM_SLUG_REQUIRED') {
        msg = 'Configura el slug del showroom en Identidad / Config antes de subir.';
      } else if (body && body.bunnyStatus) {
        msg += ' (Bunny ' + body.bunnyStatus + ')';
      }
      var err = new Error(msg);
      err.code = body && body.code;
      err.data = body;
      err.status = res.status;
      throw err;
    }
    logUpload('✔ Registro Supabase', body.archivo && body.archivo.id);
    return body;
  }

  async function list(projectId) {
    if (!projectId) throw new Error('project_id requerido');
    var headers = await authHeaders();
    var base = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') +
      '/functions/v1/bunny-media?project_id=' + encodeURIComponent(projectId);
    var res = await fetch(base, { method: 'GET', headers: headers });
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok || body.ok === false) {
      throw new Error(body.error || ('List failed: ' + res.status));
    }
    return body.items || [];
  }

  async function remove(projectId, opts) {
    opts = opts || {};
    return invokeJson({
      action: 'delete',
      project_id: projectId,
      archivo_id: opts.archivoId || null,
      storage_path: opts.storagePath || null,
      showroom_slug: opts.showroomSlug || null
    });
  }

  /**
   * Project-level asset (no Canvas node): projects/{slug}/hero/{images|logos|videos}/…
   * Used for Config OG/WhatsApp preview, favicon, and showroom hero media.
   */
  async function uploadHeroAsset(projectId, category, file, opts) {
    opts = opts || {};
    var key = String(category || '').trim().toLowerCase();
    if (!HERO_UPLOAD_CATEGORIES[key]) {
      throw new Error('category inválida para scope=hero (usa images|logos|videos)');
    }
    if (!projectId) throw new Error('project_id requerido');
    var showroomSlug = slugifyLocal(opts.showroomSlug || '');
    if (!showroomSlug) {
      throw new Error('Define el slug del proyecto antes de subir archivos a Bunny.');
    }
    var data = await invokeUpload(projectId, key, file, {
      showroomSlug: showroomSlug,
      scope: 'hero'
    });
    return {
      archivo: data.archivo || null,
      publicUrl: data.publicUrl || null,
      storagePath: data.storagePath || null,
      category: key,
      scope: 'hero'
    };
  }

  /**
   * Showroom-level media (gallery, plans, 360, downloads) under reserved node `showroom`:
   * projects/{slug}/media/showroom/{category}/[carpetas/{folder}/]{file}
   */
  async function uploadShowroomAsset(projectId, category, file, opts) {
    opts = opts || {};
    var key = String(category || '').trim().toLowerCase();
    if (typeof MediaNodesEngine !== 'undefined') {
      key = MediaNodesEngine.normalizeCategoryKey(category);
    }
    if (!SHOWROOM_UPLOAD_CATEGORIES[key]) {
      throw new Error('category inválida para showroom media');
    }
    if (!projectId) throw new Error('project_id requerido');
    var showroomSlug = slugifyLocal(opts.showroomSlug || '');
    if (!showroomSlug) {
      throw new Error('Define el slug del proyecto antes de subir archivos a Bunny.');
    }
    var data = await invokeUpload(projectId, key, file, {
      showroomSlug: showroomSlug,
      nodeId: SHOWROOM_NODE_ID,
      nodeSlug: SHOWROOM_NODE_SLUG,
      scope: 'media',
      libraryFolder: opts.libraryFolder || opts.library_folder || null
    });
    return {
      archivo: data.archivo || null,
      publicUrl: data.publicUrl || null,
      storagePath: data.storagePath || null,
      category: key,
      scope: 'media',
      nodeId: SHOWROOM_NODE_ID,
      nodeSlug: SHOWROOM_NODE_SLUG
    };
  }

  async function uploadAndSync(state, projectId, category, file, opts) {
    opts = opts || {};
    opts.state = state;
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
        projectId: projectId,
        state: state
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
    MAX_UPLOAD_BYTES: MAX_UPLOAD_BYTES,
    MAX_UPLOAD_MB: MAX_UPLOAD_MB,
    IMAGE_MAX_UPLOAD_BYTES: IMAGE_MAX_UPLOAD_BYTES,
    VIDEO_MAX_UPLOAD_BYTES: VIDEO_MAX_UPLOAD_BYTES,
    uploadLimitMessage: uploadLimitMessage,
    maxBytesForUpload: maxBytesForUpload,
    assertFileWithinUploadLimit: assertFileWithinUploadLimit,
    list: list,
    remove: remove,
    uploadHeroAsset: uploadHeroAsset,
    uploadShowroomAsset: uploadShowroomAsset,
    SHOWROOM_NODE_ID: SHOWROOM_NODE_ID,
    SHOWROOM_NODE_SLUG: SHOWROOM_NODE_SLUG,
    uploadAndSync: uploadAndSync,
    refreshProjectAssets: refreshProjectAssets,
    syncArchivosToProjectAssets: syncArchivosToProjectAssets,
    archivoToAssetPartial: archivoToAssetPartial,
    tipoToAssetType: tipoToAssetType,
    filterItemsByCategory: filterItemsByCategory,
    pathMatchesCategory: pathMatchesCategory,
    parseNodeIdFromPath: parseNodeIdFromPath,
    parseNodeSlugFromPath: parseNodeSlugFromPath,
    parseCategoryFromPath: parseCategoryFromPath,
    resolveNodeIdFromPath: resolveNodeIdFromPath,
    probeBunny: probeBunny,
    ensureFolders: ensureFolders,
    listFolder: listFolder,
    deleteFolder: deleteFolder,
    renameFolder: renameFolder,
    renameShowroom: renameShowroom,
    syncStructure: syncStructure,
    reconcileStructure: reconcileStructure,
    ensureNodeStructure: ensureNodeStructure,
    syncAllShowrooms: syncAllShowrooms
  };
})();
