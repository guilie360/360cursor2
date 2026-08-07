/**
 * Quotation Editor — V7.2.64 Builder = Runtime paint pipeline.
 */
var QuotationEditor = (function () {
  /* Legacy iframe Runtime path stays off; Builder mounts QuotationRuntime.paintScene in-page. */
  var DISABLE_RUNTIME_FOR_EDITOR = true;

  /* Official BOXIES design lienzo (V7.2.60). Viewport presets are windows only. */
  var CANVAS_DESIGN_W = 1920;
  var CANVAS_DESIGN_H = 1080;

  function activeViewport() {
    var id = (state && state.viewportPreset) || 'desktop';
    if (typeof HeroRenderer !== 'undefined' && HeroRenderer.getViewport) {
      return HeroRenderer.getViewport(id);
    }
    return { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 };
  }

  /** Simulated device window — Desktop matches design lienzo 1920×1080. */
  function activeViewportSize() {
    var vp = activeViewport();
    return {
      width: Math.max(1, Number(vp.width) || 1920),
      height: Math.max(1, Number(vp.height) || 1080)
    };
  }

  function designLienzoSize() {
    return {
      width: CANVAS_DESIGN_W,
      height: CANVAS_DESIGN_H
    };
  }

  var CONTENT_GROUPS = [
    { id: 'renders', label: 'Imágenes', accept: 'image/*', addLabel: '+ Agregar' },
    { id: 'videos', label: 'Videos', accept: 'video/*', addLabel: '+ Agregar' },
    { id: 'tours360', label: 'Tours 360', linkMode: true, addLabel: '+ Agregar enlace' },
    { id: 'plantas2d', label: 'Planos 2D', accept: 'image/*', addLabel: '+ Agregar' },
    { id: 'plantas3d', label: 'Planos 3D', accept: 'image/*', addLabel: '+ Agregar' },
    { id: 'pdf', label: 'PDF', accept: 'application/pdf,.pdf', addLabel: '+ Agregar' },
    { id: 'audio', label: 'Audio', prepared: true },
    { id: 'models', label: 'Modelos', prepared: true }
  ];

  /* Canvas element types — infrastructure for free composition (Phase 1). */
  var ELEMENT_TYPES = [
    { id: 'text', label: 'Texto' },
    { id: 'button', label: 'Botón' },
    { id: 'hotspot', label: 'Hotspot' },
    { id: 'image', label: 'Imagen' },
    { id: 'video', label: 'Video' },
    { id: 'container', label: 'Contenedor' },
    { id: 'popup', label: 'Popup' },
    { id: 'icon', label: 'Icono' }
  ];

  var ACTION_OPTIONS = [
    { id: 'goto-scene', label: 'Ir a escena' },
    { id: 'download-pdf', label: 'Descargar PDF' },
    { id: 'open-url', label: 'Abrir URL' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'call', label: 'Llamar' },
    { id: 'email', label: 'Email' }
  ];

  var BUTTON_STYLES = [
    { id: 'chip', label: 'Chip' },
    { id: 'button', label: 'Botón' },
    { id: 'icon', label: 'Icono' }
  ];

  var HOTSPOT_SHAPES = [
    { id: 'polygon', label: 'Polígono' },
    { id: 'rect', label: 'Rectángulo' },
    { id: 'circle', label: 'Círculo' }
  ];

  var HOTSPOT_COLORS = [
    { id: 'white', label: 'Blanco', value: '#ffffff' },
    { id: 'green', label: 'Verde', value: '#6fbf86' },
    { id: 'amber', label: 'Ámbar', value: '#dcaa6e' }
  ];

  /* Tools by content group — unsupported tools are not rendered. */
  var TOOLS_BY_GROUP = {
    renders: { buttons: true, hotspots: true },
    videos: { buttons: true, hotspots: false },
    tours360: { buttons: true, hotspots: true },
    plantas2d: { buttons: true, hotspots: true },
    plantas3d: { buttons: true, hotspots: true },
    pdf: { buttons: true, hotspots: false },
    audio: { buttons: false, hotspots: false },
    models: { buttons: false, hotspots: false }
  };

  var focusEscBound = false;
  var inspectorChromeBound = false;
  var canvasOutsideDeselectBound = false;

  var uid = 1;
  function nextId(prefix) {
    uid += 1;
    return prefix + '-' + uid;
  }

  function rememberId(id) {
    var m = String(id || '').match(/-(\d+)$/);
    if (!m) return;
    var n = parseInt(m[1], 10);
    if (!isNaN(n) && n > uid) uid = n;
  }

  /** Keep nextId ahead of every persisted id so reloads never collide (sc-3 twice, etc.). */
  function syncUidFromState() {
    function walk(arr) {
      if (!Array.isArray(arr)) return;
      var i;
      for (i = 0; i < arr.length; i++) {
        var item = arr[i];
        if (!item) continue;
        rememberId(item.id);
        walk(item.elements);
        walk(item.interactions);
        walk(item.buttons);
        walk(item.hotspots);
        walk(item.guides);
        if (item.guidesByViewport && typeof item.guidesByViewport === 'object') {
          walk(item.guidesByViewport.desktop);
          walk(item.guidesByViewport.tablet);
          walk(item.guidesByViewport.mobile);
        }
      }
    }
    walk(state && state.scenes);
    walk(state && state.content);
    walk(state && state.folders);
    if (state && Array.isArray(state.sceneGroups)) {
      state.sceneGroups.forEach(function (g) {
        if (g) rememberId(g.id);
      });
    }
  }

  /** Heal duplicate scene ids in-place (keeps first occurrence). */
  function ensureUniqueSceneIds() {
    if (!state || !Array.isArray(state.scenes)) return false;
    var seen = Object.create(null);
    var changed = false;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      var sc = state.scenes[i];
      if (!sc) continue;
      var id = String(sc.id || '');
      if (!id || seen[id]) {
        sc.id = nextId('sc');
        changed = true;
        id = sc.id;
      }
      seen[id] = true;
      rememberId(id);
    }
    if (changed && state.activeSceneId && !sceneById(state.activeSceneId)) {
      state.activeSceneId = (state.scenes[0] && state.scenes[0].id) || null;
    }
    return changed;
  }

  /**
   * Heal duplicate folder/content ids. Same counter bug as scenes: after hydrate,
   * creating "01" in Planos 2D could reuse fd-N from Imágenes → shared content.
   */
  function ensureUniqueLibraryIds() {
    if (!state) return false;
    var changed = false;
    var keepers = Object.create(null);
    var remappedByOld = Object.create(null);
    var seenContent = Object.create(null);
    var i;

    if (Array.isArray(state.folders)) {
      for (i = 0; i < state.folders.length; i++) {
        var folder = state.folders[i];
        if (!folder) continue;
        var fid = String(folder.id || '');
        if (!fid || keepers[fid]) {
          var oldFid = fid;
          folder.id = nextId('fd');
          changed = true;
          if (oldFid) {
            if (!remappedByOld[oldFid]) remappedByOld[oldFid] = [];
            remappedByOld[oldFid].push(folder);
          }
          fid = folder.id;
        } else {
          keepers[fid] = folder;
        }
        rememberId(fid);
      }
    }

    if (Array.isArray(state.content)) {
      for (i = 0; i < state.content.length; i++) {
        var item = state.content[i];
        if (!item) continue;
        var cid = String(item.id || '');
        if (!cid || seenContent[cid]) {
          item.id = nextId('ct');
          changed = true;
          cid = item.id;
        }
        seenContent[cid] = true;
        rememberId(cid);

        if (!item.folderId) continue;
        var foldId = String(item.folderId);
        var keeper = keepers[foldId];
        if (keeper && String(keeper.group || '') === String(item.group || '')) continue;

        var alts = remappedByOld[foldId] || [];
        var altMatch = null;
        var ai;
        for (ai = 0; ai < alts.length; ai++) {
          if (alts[ai] && String(alts[ai].group || '') === String(item.group || '')) {
            altMatch = alts[ai];
            break;
          }
        }
        if (altMatch) {
          item.folderId = altMatch.id;
          continue;
        }
        if (keeper) {
          var sameName = null;
          for (ai = 0; ai < (state.folders || []).length; ai++) {
            var f = state.folders[ai];
            if (!f) continue;
            if (String(f.group || '') === String(item.group || '') &&
                String(f.name || '') === String(keeper.name || '')) {
              sameName = f;
              break;
            }
          }
          if (sameName) item.folderId = sameName.id;
        }
      }
    }

    return changed;
  }

  function healLibraryIdentity() {
    syncUidFromState();
    var a = ensureUniqueSceneIds();
    var b = ensureUniqueLibraryIds();
    syncUidFromState();
    return !!(a || b);
  }

  function folderNameTaken(groupId, name, exceptId) {
    var key = String(name || '').trim().toLowerCase();
    if (!key) return false;
    return foldersInGroup(groupId).some(function (f) {
      if (!f) return false;
      if (exceptId && String(f.id) === String(exceptId)) return false;
      return String(f.name || '').trim().toLowerCase() === key;
    });
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isEditorRuntimeDisabled() {
    return DISABLE_RUNTIME_FOR_EDITOR === true;
  }

  function groupMeta(groupId) {
    for (var i = 0; i < CONTENT_GROUPS.length; i++) {
      if (CONTENT_GROUPS[i].id === groupId) return CONTENT_GROUPS[i];
    }
    return null;
  }

  function groupLabel(groupId) {
    var g = groupMeta(groupId);
    return g ? g.label : (groupId || 'Recurso');
  }

  function elementTypeLabel(typeId) {
    for (var i = 0; i < ELEMENT_TYPES.length; i++) {
      if (ELEMENT_TYPES[i].id === typeId) return ELEMENT_TYPES[i].label;
    }
    return typeId || 'Elemento';
  }

  function toolsFor(content) {
    var t = (content && TOOLS_BY_GROUP[content.group]) || { buttons: true, hotspots: false };
    return { buttons: !!t.buttons, hotspots: !!t.hotspots };
  }

  function revokePreview(item) {
    if (item && item.previewUrl && item.previewUrl.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(item.previewUrl); } catch (e) { /* ignore */ }
    }
  }

  function resolveProjectId() {
    var id = String(
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
    if (id) return id;
    try {
      if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.getProjectIdentity) {
        var idn = QuotationBuilderView.getProjectIdentity();
        if (idn && idn.id) {
          id = String(idn.id).trim();
          if (!editorProjectCtx || typeof editorProjectCtx !== 'object') {
            editorProjectCtx = { id: '', slug: '', name: '' };
          }
          editorProjectCtx.id = id;
          if (!loadedProjectId) loadedProjectId = id;
        }
      }
    } catch (ePid) {}
    return id;
  }

  /**
   * Ensure editorProjectCtx.slug mirrors builder identity (hydrateIdentity → projectCtx)
   * before uploadLibraryItem / Bunny paths read resolveShowroomSlug().
   */
  function hydrateEditorProjectCtxSlug() {
    if (!editorProjectCtx || typeof editorProjectCtx !== 'object') {
      editorProjectCtx = { id: '', slug: '', name: '' };
    }
    var slug = String(editorProjectCtx.slug || '').trim();
    if (slug) {
      editorProjectCtx.slug = slug;
      return slug;
    }

    if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.getProjectIdentity) {
      try {
        var idn = QuotationBuilderView.getProjectIdentity();
        if (idn) {
          if (!editorProjectCtx.id && idn.id) {
            editorProjectCtx.id = String(idn.id || '').trim();
          }
          if (!editorProjectCtx.name && (idn.nombre || idn.name)) {
            editorProjectCtx.name = idn.nombre || idn.name;
          }
          if (idn.slug) {
            editorProjectCtx.slug = String(idn.slug).trim();
            slug = editorProjectCtx.slug;
          }
        }
      } catch (eIdn) {}
    }

    if (!slug && typeof BoxiesRouter !== 'undefined' && BoxiesRouter.currentProjectSlug) {
      slug = String(BoxiesRouter.currentProjectSlug() || '').trim();
      if (slug) editorProjectCtx.slug = slug;
    }

    if (!slug) {
      try {
        var params = new URLSearchParams(window.location.search || '');
        var fromUrl = String(params.get('project') || params.get('proyecto') || '').trim();
        var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (fromUrl && !uuidRe.test(fromUrl)) {
          editorProjectCtx.slug = fromUrl;
          slug = fromUrl;
        }
      } catch (eUrl) {}
    }

    return String(editorProjectCtx.slug || '').trim();
  }

  function resolveShowroomSlug() {
    return hydrateEditorProjectCtxSlug();
  }

  /** Fixed Bunny media node for Quotation library (decoupled from Showroom canvas nodes). */
  var QE_BUNNY_NODE_ID = 'qe-library';
  var QE_BUNNY_NODE_SLUG = 'quotation';
  var bunnyStructureReady = false;

  function bunnyCategoryForItem(item) {
    if (!item) return 'images';
    if (item.group === 'videos' || item.media === 'video') return 'videos';
    if (item.group === 'pdf' || item.media === 'pdf') return 'documents';
    if (item.group === 'plantas2d') return 'plans2d';
    if (item.group === 'plantas3d') return 'plans3d';
    if (item.group === 'hero' && item.media === 'video') return 'videos';
    return 'images';
  }

  function bunnyLibraryFolderSlug(item) {
    if (!item || !item.folderId) return '';
    var folder = folderById(item.folderId);
    if (!folder || String(folder.group || '') !== String(item.group || '')) return '';
    var raw = String(folder.name || '').trim();
    if (!raw) return '';
    return raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s\-]+/g, '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  async function ensureQuotationBunnyStructure() {
    if (bunnyStructureReady) return;
    var projectId = resolveProjectId();
    var slug = resolveShowroomSlug();
    if (!projectId || !slug) {
      throw new Error('projectId y slug son requeridos para Bunny Storage.');
    }
    if (typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.ensureNodeStructure) {
      throw new Error('BunnyMediaApi no disponible.');
    }
    await BunnyMediaApi.ensureNodeStructure(
      projectId,
      slug,
      QE_BUNNY_NODE_SLUG,
      ['images', 'videos', 'documents', 'ui', 'plans2d', 'plans3d']
    );
    bunnyStructureReady = true;
  }

  function publicUrlOf(item) {
    if (!item) return null;
    var u = item.publicUrl || item.remoteUrl || null;
    if (u && String(u).indexOf('blob:') === 0) return null;
    if (!u && item.previewUrl && String(item.previewUrl).indexOf('blob:') !== 0) {
      u = item.previewUrl;
    }
    return u || null;
  }

  /** V7.2.37 TEMP audit — remove after root cause found. */
  function qeLibAudit(step, item) {
    var rows = (state.content || []).map(function (c) {
      if (!c) return null;
      return {
        id: c.id,
        archivoId: c.archivoId || null,
        storagePath: c.storagePath || null,
        provider: c.provider || null,
        publicUrl: c.publicUrl || null,
        uploadStatus: c.uploadStatus || null
      };
    }).filter(Boolean);
    var focus = item
      ? {
        id: item.id,
        archivoId: item.archivoId || null,
        storagePath: item.storagePath || null,
        provider: item.provider || null,
        publicUrl: item.publicUrl || null,
        uploadStatus: item.uploadStatus || null
      }
      : null;
    console.log('[QE-LIB V7.2.37]', step, {
      contentLength: state.content ? state.content.length : 0,
      focus: focus,
      content: rows
    });
  }

  /**
   * Library persistence gate — durable Bunny/archivos refs OR public URL.
   * previewUrl / blob-only local files are NOT persistable.
   * Bare provider without archivoId/storagePath/URL is NOT enough.
   */
  function libraryItemIsPersistable(item) {
    if (!item || !item.id) return false;
    if (item.archivoId) return true;
    if (item.storagePath) return true;
    var pub = item.publicUrl || item.remoteUrl || null;
    if (pub && String(pub).indexOf('blob:') !== 0) return true;
    return false;
  }

  function libraryItemUploadStatus(item) {
    if (!item) return 'failed';
    if (item.uploadStatus === 'failed') return 'failed';
    var pub = item.publicUrl || item.remoteUrl || null;
    if (pub && String(pub).indexOf('blob:') === 0) pub = null;
    if (pub) return 'synced';
    if (item.archivoId || item.storagePath || item.provider) return 'pending';
    if (item.file || (item.previewUrl && String(item.previewUrl).indexOf('blob:') === 0)) {
      return 'local';
    }
    return 'pending';
  }

  /** Editor display URL — allows blob preview so DnD works before Bunny sync. */
  function displayUrlOf(item) {
    if (!item) return null;
    var pub = publicUrlOf(item);
    if (pub) return pub;
    return item.previewUrl || null;
  }

  function collectItemUrls(item) {
    if (!item) return [];
    var out = [];
    [item.publicUrl, item.remoteUrl, item.previewUrl].forEach(function (u) {
      if (u && out.indexOf(u) < 0) out.push(String(u));
    });
    return out;
  }

  function urlInList(url, urls) {
    if (!url || !urls || !urls.length) return false;
    var s = String(url);
    for (var i = 0; i < urls.length; i++) {
      if (String(urls[i]) === s) return true;
    }
    return false;
  }

  function applyBunnyResultToItem(item, result) {
    if (!item || !result) return;
    revokePreview(item);
    var pub = result.publicUrl || null;
    item.storagePath = result.storagePath || item.storagePath || null;
    item.publicUrl = pub;
    item.remoteUrl = pub;
    item.previewUrl = pub;
    item.provider = 'bunny';
    item.archivoId = (result.archivo && result.archivo.id) || item.archivoId || null;
    var bytes = Number(item.sizeBytes) || 0;
    if (item.file && item.file.size != null) {
      bytes = Math.max(bytes, Number(item.file.size) || 0);
    }
    if (result.asset && result.asset.size != null) {
      bytes = Math.max(bytes, Number(result.asset.size) || 0);
    }
    if (result.archivo && result.archivo.peso_mb != null) {
      bytes = Math.max(bytes, bytesFromPesoMb(result.archivo.peso_mb));
    }
    if (bytes > 0) item.sizeBytes = bytes;
    item.file = null;
    item.uploadStatus = 'synced';
    item.projectId = resolveProjectId() || item.projectId || null;
    item.thumbReady = false;
    invalidateLibraryBytesCache();
    preloadLibraryThumb(item);
  }

  function bytesFromPesoMb(pesoMb) {
    var n = Number(pesoMb);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.round(n * 1048576);
  }

  function invalidateLibraryBytesCache() {
    state._libraryBytesCache = null;
    state._libraryBytesAt = 0;
  }

  /** Rewrite scene media that still pointed at a blob for this resource. */
  function syncScenesForResource(item) {
    if (!item || !item.id) return;
    var url = publicUrlOf(item);
    if (!url) return;
    state.scenes.forEach(function (sc) {
      if (!sc || sc.resourceId !== item.id) return;
      sc.mediaUrl = url;
      if (sc.coverModel) {
        if (item.media === 'video') {
          sc.coverModel.videoUrl = url;
          sc.coverModel.imageUrl = null;
        } else {
          sc.coverModel.imageUrl = url;
          sc.coverModel.videoUrl = null;
        }
      }
    });
  }

  async function uploadLibraryItem(item) {
    if (!item) return null;
    qeLibAudit('uploadLibraryItem:enter', item);
    if (publicUrlOf(item) && !item.file) {
      item.uploadStatus = 'synced';
      item.provider = item.provider || 'bunny';
      qeLibAudit('uploadLibraryItem:already-synced', item);
      return item;
    }
    if (!item.file) {
      item.uploadStatus = publicUrlOf(item) ? 'synced' : 'missing';
      qeLibAudit('uploadLibraryItem:no-file', item);
      return item;
    }
    if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.assertFileWithinUploadLimit) {
      try {
        BunnyMediaApi.assertFileWithinUploadLimit(item.file, bunnyCategoryForItem(item));
      } catch (eSize) {
        item.uploadStatus = 'failed';
        throw eSize;
      }
    }
    var projectId = resolveProjectId();
    var slug = resolveShowroomSlug();
    if (!projectId) {
      throw new Error('No hay projectId para subir el recurso a Bunny.');
    }
    if (!slug) {
      throw new Error('Define el slug del proyecto antes de subir archivos a Bunny.');
    }
    if (typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.uploadAndSync) {
      throw new Error('BunnyMediaApi no disponible: no se pueden subir recursos.');
    }
    item.uploadStatus = 'uploading';
    await ensureQuotationBunnyStructure();
    console.log('[QE-LIB V7.2.37] BunnyMediaApi.uploadAndSync:before', {
      projectId: projectId,
      slug: slug,
      itemId: item.id,
      fileName: item.file && item.file.name
    });
    var libraryFolder = bunnyLibraryFolderSlug(item);
    var result = await BunnyMediaApi.uploadAndSync(
      null,
      projectId,
      bunnyCategoryForItem(item),
      item.file,
      {
        nodeId: QE_BUNNY_NODE_ID,
        nodeSlug: QE_BUNNY_NODE_SLUG,
        showroomSlug: slug,
        scope: 'media',
        libraryFolder: libraryFolder || undefined
      }
    );
    console.log('[QE-LIB V7.2.37] BunnyMediaApi.uploadAndSync:response', {
      publicUrl: result && result.publicUrl,
      storagePath: result && result.storagePath,
      archivoId: result && result.archivo && result.archivo.id,
      result: result
    });
    applyBunnyResultToItem(item, result);
    syncScenesForResource(item);
    qeLibAudit('uploadLibraryItem:after-bunny', item);
    if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onResourceAdded) {
      QuotationPersistAudit.onResourceAdded(item, {
        projectId: projectId,
        slug: slug,
        id: projectId
      });
    }
    return item;
  }

  async function ensureLibraryUploaded() {
    var pending = state.content.filter(function (c) {
      return c && c.file && !publicUrlOf(c);
    });
    var i;
    for (i = 0; i < pending.length; i++) {
      await uploadLibraryItem(pending[i]);
    }
    return pending.length;
  }

  function nameFromFile(file) {
    return String((file && file.name) || '').trim();
  }

  function nameFromUrl(url) {
    try {
      var u = new URL(String(url || '').trim());
      var parts = u.pathname.split('/').filter(Boolean);
      var last = parts.length ? parts[parts.length - 1] : '';
      if (last) return decodeURIComponent(last);
      return u.hostname || String(url).trim();
    } catch (e) {
      return String(url || '').trim();
    }
  }

  function isLapentorUrl(url) {
    try {
      var u = new URL(String(url || '').trim());
      return /(^|\.)lapentor\.com$/i.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function normalizeUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    return s;
  }

  function parseUrlLines(text) {
    return String(text || '')
      .split(/[\r\n]+/)
      .map(function (line) { return normalizeUrl(line); })
      .filter(Boolean);
  }

  function createEmptyState() {
    var heroScene = {
      id: nextId('sc'),
      name: 'HERO',
      type: 'hero',
      templateId: 'hero-default',
      resourceId: null,
      coverModel: null,
      elements: [],
      interactions: [],
      buttons: [],
      hotspots: [],
      guides: []
    };
    return {
      content: [],
      folders: [],
      scenes: [heroScene],
      sceneGroups: [],
      sceneTrack: [],
      sceneSelectedIds: {},
      activeSceneId: heroScene.id,
      selectedContentId: null,
      selectedItem: null,
      selectedElementId: null,
      focusMode: false,
      /* Same central canvas as Runtime — no separate Preview panel. */
      canvasPreviewMode: false,
      libraryCollapsed: false,
      inspectorCollapsed: true,
      scenesCollapsed: false,
      scenesLocked: false,
      sceneMenuOpen: false,
      dockOpen: false,
      shapePickerOpen: false,
      resourcePickerOpen: false,
      resourcePickerSceneId: null,
      pendingSceneDeleteId: null,
      viewportPreset: 'desktop',
      safeAreaVisible: false,
      /* Session-only — not persisted with the document. */
      rulersVisible: false,
      guidesVisible: true,
      overlaySnapEnabled: true,
      backpackMode: false,
      backpackReturnSceneId: null,
      backpackInteractions: [],
      canvasUserZoom: 1,
      canvasPanX: null,
      canvasPanY: null,
      expEditMode: 'buttons',
      expHasSelection: false,
      selectedOverlayIds: [],
      openGroups: {
        renders: true,
        videos: true,
        tours360: true,
        plantas2d: true,
        plantas3d: true,
        pdf: true,
        audio: false,
        models: false
      },
      libraryGroupsCollapsed: false,
      librarySearchQuery: '',
      libraryAvailableOnly: false,
      libraryView: 'list',
      libraryStatusOpen: false,
      librarySelectModeGroup: null,
      librarySelectedIds: {},
      librarySelectAnchorId: null,
      renamingFolderId: null,
      renamingContentId: null,
      editingElementLabelId: null,
      openOverlayGroups: {},
      openFolders: {},
      folderComposerGroup: null,
      tourComposer: { open: false, folderId: null },
      pendingFileTarget: null,
      items: {}
    };
  }

  var state = createEmptyState();
  var rootEl = null;
  var editorProjectCtx = null;
  var loadedProjectId = null;
  var loadPromise = null;
  /** True after first successful hydrate/draft restore for loadedProjectId. */
  var documentReady = false;
  /** Bumps on every project switch / detach — aborts in-flight load/commit. */
  var sessionEpoch = 0;
  var DRAFT_PREFIX = 'boxies_qe_draft_v1_';
  var TEMPLATE_PREFIX = 'boxies_qe_scene_templates_v1_';
  var OVERLAY_TEMPLATE_PREFIX = 'boxies_qe_overlay_templates_v1_';
  var LIBRARY_UI_PREFIX = 'boxies_qe_library_ui_v1_';
  var AUTOSAVE_DEBOUNCE_MS = 4000;
  var autosaveTimer = null;
  var autosaveInFlight = false;
  var autosaveQueued = false;
  /** Active library-item drag (reorder / move). */
  var libItemDrag = null;
  /** Active folder drag (reorder within the same group). */
  var folderDrag = null;
  var suppressFolderToggleUntil = 0;
  var suppressLibItemClickUntil = 0;
  var libPointerDrag = null;
  var thumbRerenderQueued = false;
  /** Survives full scenes-bar re-renders so selecting a scene does not jump left. */
  var scenesTrackScrollLeft = 0;
  /** After create: scroll strip to reveal this scene/group id on next rerender. */
  var pendingScenesStripRevealId = null;
  /** Suppress focusin scroll-pin while reveal animation runs. */
  var scenesStripRevealUntil = 0;
  var scenesStripFlashTimer = null;
  var libraryUiSaveTimer = null;

  function draftStorageKey(projectId) {
    return DRAFT_PREFIX + String(projectId || '').trim();
  }

  function libraryUiStorageKey(projectId) {
    return LIBRARY_UI_PREFIX + String(
      projectId ||
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
  }

  function buildExplicitOpenGroups() {
    var out = {};
    CONTENT_GROUPS.forEach(function (g) {
      if (!g) return;
      out[g.id] = state.openGroups[g.id] !== false;
    });
    return out;
  }

  function buildExplicitOpenFolders() {
    var out = {};
    (state.folders || []).forEach(function (f) {
      if (!f || !f.id) return;
      out[f.id] = state.openFolders[f.id] !== false;
    });
    return out;
  }

  function syncLibraryGroupsCollapsedFromState() {
    var anyOpen = CONTENT_GROUPS.some(function (g) {
      return g && state.openGroups[g.id] !== false;
    });
    state.libraryGroupsCollapsed = !anyOpen;
  }

  function serializeLibraryUi() {
    return {
      v: 2,
      at: Date.now(),
      libraryGroupsCollapsed: !!state.libraryGroupsCollapsed,
      libraryView: state.libraryView === 'grid' ? 'grid' : 'list',
      libraryAvailableOnly: !!state.libraryAvailableOnly,
      librarySearchQuery: String(state.librarySearchQuery || ''),
      libraryStatusOpen: !!state.libraryStatusOpen,
      openGroups: buildExplicitOpenGroups(),
      openFolders: buildExplicitOpenFolders()
    };
  }

  function applyLibraryUiSnapshot(snapshot) {
    if (!snapshot || (snapshot.v !== 1 && snapshot.v !== 2)) return;
    if (typeof snapshot.libraryGroupsCollapsed === 'boolean') {
      state.libraryGroupsCollapsed = snapshot.libraryGroupsCollapsed;
    }
    if (snapshot.v >= 2) {
      if (snapshot.libraryView === 'grid' || snapshot.libraryView === 'list') {
        state.libraryView = snapshot.libraryView;
      }
      if (typeof snapshot.libraryAvailableOnly === 'boolean') {
        state.libraryAvailableOnly = snapshot.libraryAvailableOnly;
      }
      if (typeof snapshot.librarySearchQuery === 'string') {
        state.librarySearchQuery = snapshot.librarySearchQuery;
      }
      if (typeof snapshot.libraryStatusOpen === 'boolean') {
        state.libraryStatusOpen = snapshot.libraryStatusOpen;
      }
    }
    if (snapshot.openGroups && typeof snapshot.openGroups === 'object') {
      if (snapshot.v >= 2) {
        state.openGroups = {};
        CONTENT_GROUPS.forEach(function (g) {
          if (!g) return;
          if (Object.prototype.hasOwnProperty.call(snapshot.openGroups, g.id)) {
            state.openGroups[g.id] = !!snapshot.openGroups[g.id];
          } else {
            state.openGroups[g.id] = false;
          }
        });
      } else {
        state.openGroups = Object.assign({}, state.openGroups, snapshot.openGroups);
      }
    }
    if (snapshot.openFolders && typeof snapshot.openFolders === 'object') {
      if (snapshot.v >= 2) {
        state.openFolders = {};
        (state.folders || []).forEach(function (f) {
          if (!f || !f.id) return;
          if (Object.prototype.hasOwnProperty.call(snapshot.openFolders, f.id)) {
            state.openFolders[f.id] = !!snapshot.openFolders[f.id];
          } else {
            state.openFolders[f.id] = state.openGroups[f.group] !== false;
          }
        });
      } else {
        state.openFolders = Object.assign({}, snapshot.openFolders);
      }
    }
    syncLibraryGroupsCollapsedFromState();
  }

  function persistLibraryUi() {
    var id = String(
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
    if (!id) return;
    var key = libraryUiStorageKey(id);
    if (!key || key === LIBRARY_UI_PREFIX) return;
    try {
      localStorage.setItem(key, JSON.stringify(serializeLibraryUi()));
    } catch (eUi) { /* quota / private mode */ }
  }

  function schedulePersistLibraryUi() {
    if (libraryUiSaveTimer) clearTimeout(libraryUiSaveTimer);
    libraryUiSaveTimer = setTimeout(function () {
      libraryUiSaveTimer = null;
      persistLibraryUi();
    }, 280);
  }

  function restoreLibraryUi(projectId, draftUi) {
    var id = String(projectId || loadedProjectId || '').trim();
    if (!id) return;
    var key = libraryUiStorageKey(id);
    if (!key || key === LIBRARY_UI_PREFIX) return;
    var localSnap = null;
    try {
      var raw = localStorage.getItem(key);
      if (raw) localSnap = JSON.parse(raw);
    } catch (eLocal) { /* ignore */ }
    var pick = null;
    if (localSnap && draftUi) {
      pick = Number(localSnap.at || 0) >= Number(draftUi.at || 0) ? localSnap : draftUi;
    } else {
      pick = localSnap || draftUi || null;
    }
    if (pick) applyLibraryUiSnapshot(pick);
  }

  function templatesStorageKey(projectId) {
    return TEMPLATE_PREFIX + String(
      projectId ||
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
  }

  function listSceneTemplates() {
    var key = templatesStorageKey();
    if (!key || key === TEMPLATE_PREFIX) return [];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveSceneTemplates(list) {
    var key = templatesStorageKey();
    if (!key || key === TEMPLATE_PREFIX) return;
    try {
      localStorage.setItem(key, JSON.stringify(list || []));
    } catch (e) { /* quota */ }
  }

  function overlayTemplatesStorageKey(projectId) {
    return OVERLAY_TEMPLATE_PREFIX + String(
      projectId ||
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
  }

  function listOverlayTemplates() {
    var key = overlayTemplatesStorageKey();
    if (!key || key === OVERLAY_TEMPLATE_PREFIX) return [];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (eOt) {
      return [];
    }
  }

  function saveOverlayTemplates(list) {
    var key = overlayTemplatesStorageKey();
    if (!key || key === OVERLAY_TEMPLATE_PREFIX) return;
    try {
      localStorage.setItem(key, JSON.stringify(list || []));
    } catch (eSave) { /* quota */ }
  }

  function stripMediaFromInteraction(ix) {
    if (!ix || typeof ix !== 'object') return null;
    var copy;
    try { copy = JSON.parse(JSON.stringify(ix)); } catch (e) { return null; }
    delete copy.mediaUrl;
    delete copy.publicUrl;
    delete copy.resourceId;
    delete copy.archivoId;
    delete copy.storagePath;
    delete copy.assetId;
    delete copy.previewUrl;
    return copy;
  }

  function structureFromScene(scene) {
    if (!scene) return null;
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }
    var interactions = (Array.isArray(scene.interactions) ? scene.interactions : [])
      .map(stripMediaFromInteraction)
      .filter(Boolean);
    var elements = (Array.isArray(scene.elements) ? scene.elements : []).map(function (el) {
      if (!el) return null;
      try { return JSON.parse(JSON.stringify(el)); } catch (e2) { return null; }
    }).filter(Boolean);
    return {
      interactions: interactions,
      elements: elements,
      layout: {
        type: scene.type || 'scene',
        templateId: null
      }
    };
  }

  function createTemplateFromActiveScene() {
    var scene = activeScene();
    if (!scene) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No hay escena activa para guardar como plantilla.');
      }
      return;
    }
    var name = window.prompt('Nombre de la plantilla', scene.name || 'Plantilla');
    if (name == null) return;
    name = String(name).trim();
    if (!name) return;
    var structure = structureFromScene(scene);
    if (!structure) return;
    var list = listSceneTemplates();
    list.push({
      id: nextId('tpl'),
      name: name,
      at: Date.now(),
      structure: structure
    });
    saveSceneTemplates(list);
    state.dockOpen = false;
    if (typeof AdminNotify !== 'undefined' && AdminNotify.success) {
      AdminNotify.success('Plantilla "' + name + '" guardada.');
    }
    rerender();
  }

  function createTemplateFromSelection() {
    if (!expOverlay || !expOverlay.snapshotSelectedOverlays) return;
    var snaps = expOverlay.snapshotSelectedOverlays();
    if (!snaps || !snaps.length) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No hay elementos seleccionados para guardar.');
      }
      return;
    }
    var name = window.prompt('Nombre de la plantilla', 'Selección');
    if (name == null) return;
    name = String(name).trim();
    if (!name) return;
    var list = listOverlayTemplates();
    list.push({
      id: nextId('otpl'),
      name: name,
      at: Date.now(),
      overlays: snaps.map(stripMediaFromInteraction).filter(Boolean)
    });
    saveOverlayTemplates(list);
    if (typeof AdminNotify !== 'undefined' && AdminNotify.success) {
      AdminNotify.success('Plantilla "' + name + '" guardada.');
    }
  }

  function openOverlaySelectionContextMenu(clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    if (!expOverlay || !expOverlay.getSelectionContext) return;
    var ctx = expOverlay.getSelectionContext();
    if (!ctx) return;
    var multi = ctx.count >= 2;
    var canUngroup = !!ctx.canUngroup;
    if (!multi && !canUngroup) return;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: canUngroup && !multi ? 'Grupo' : 'Selección múltiple',
      items: [
        {
          id: 'group',
          label: 'Agrupar',
          disabled: !ctx.canGroup
        },
        {
          id: 'ungroup',
          label: 'Desagrupar',
          disabled: !canUngroup
        },
        {
          id: 'template',
          label: 'Convertir en plantilla',
          separatorBefore: true,
          disabled: !multi
        },
        {
          id: 'delete',
          label: 'Eliminar',
          danger: true,
          separatorBefore: true
        }
      ],
      onSelect: function (id) {
        if (id === 'group') {
          if (expOverlay.groupSelectedOverlays && expOverlay.groupSelectedOverlays()) {
            afterOverlayGroupPanelRefresh();
          }
          return;
        }
        if (id === 'ungroup') {
          if (expOverlay.ungroupSelectedOverlays && expOverlay.ungroupSelectedOverlays()) {
            markDirtyLocal();
            refreshLayersPanel();
            refreshDockOnly();
          }
          return;
        }
        if (id === 'template') {
          createTemplateFromSelection();
          return;
        }
        if (id === 'delete') {
          if (expOverlay.deleteSelected && expOverlay.deleteSelected()) {
            state.expHasSelection = false;
            state.selectedOverlayIds = [];
            markDirtyLocal();
            refreshLayersPanel();
            refreshDockOnly();
          }
        }
      }
    });
  }

  function createSceneFromTemplate(templateId) {
    var list = listSceneTemplates();
    var tpl = null;
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === String(templateId)) {
        tpl = list[i];
        break;
      }
    }
    if (!tpl || !tpl.structure) return;
    var structure = tpl.structure;
    var interactions = (structure.interactions || []).map(function (ix) {
      if (!ix) return null;
      try {
        var copy = JSON.parse(JSON.stringify(ix));
        copy.id = nextId('ix');
        copy.portId = copy.id;
        return copy;
      } catch (e) { return null; }
    }).filter(Boolean);
    var elements = (structure.elements || []).map(function (el) {
      if (!el) return null;
      try {
        var copy = JSON.parse(JSON.stringify(el));
        copy.id = nextId('el');
        return copy;
      } catch (e2) { return null; }
    }).filter(Boolean);
    var scene = {
      id: nextId('sc'),
      name: nextSceneName(),
      type: 'scene',
      templateId: null,
      resourceId: null,
      mediaUrl: null,
      publicUrl: null,
      coverModel: null,
      elements: elements,
      interactions: interactions,
      buttons: [],
      hotspots: []
    };
    state.scenes.push(scene);
    ensureSceneGroups();
    state.sceneTrack.push(scene.id);
    state.activeSceneId = scene.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    markDirtyLocal();
    queueScenesStripReveal(scene.id);
    rerender();
  }

  function libraryScopeEl() {
    var left = document.getElementById('quotationLeftBody');
    if (left) return left;
    if (rootEl) {
      var col = rootEl.querySelector('.qe-col--library');
      if (col) return col;
    }
    return rootEl;
  }

  function syncLibraryFoldAllButton() {
    var scope = libraryScopeEl();
    if (!scope) return;
    var btn = scope.querySelector('[data-qe-toggle-all-groups]');
    if (!btn) return;
    var collapsed = !!state.libraryGroupsCollapsed;
    var label = collapsed ? 'Desplegar todos los grupos' : 'Contraer todos los grupos';
    btn.setAttribute('data-collapsed', collapsed ? '1' : '0');
    btn.setAttribute('title', label);
    btn.setAttribute('aria-label', label);
  }

  function syncLibraryGroupOpen(groupId) {
    var scope = libraryScopeEl();
    if (!scope) return false;
    groupId = String(groupId || '');
    var section = scope.querySelector('[data-qe-group="' + groupId + '"]');
    if (!section) return false;
    var open = state.openGroups[groupId] !== false;
    section.classList.toggle('is-open', open);
    var btn = section.querySelector('[data-qe-toggle="' + groupId + '"]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    return true;
  }

  function syncLibraryFolderOpen(folderId) {
    var scope = libraryScopeEl();
    if (!scope) return false;
    folderId = String(folderId || '');
    var block = scope.querySelector('[data-qe-folder-block="' + folderId + '"]');
    if (!block) return false;
    var open = state.openFolders[folderId] !== false;
    block.classList.toggle('is-open', open);
    var btn = block.querySelector('[data-qe-folder-toggle="' + folderId + '"]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    return true;
  }

  function syncAllLibraryGroupsOpen() {
    CONTENT_GROUPS.forEach(function (g) {
      if (!g) return;
      syncLibraryGroupOpen(g.id);
    });
    syncLibraryFoldAllButton();
  }

  function toggleAllLibraryGroups() {
    var collapse = !state.libraryGroupsCollapsed;
    state.libraryGroupsCollapsed = collapse;
    CONTENT_GROUPS.forEach(function (g) {
      if (!g) return;
      state.openGroups[g.id] = !collapse;
    });
    state.libraryGroupsCollapsed = collapse;
    persistLibraryUi();
    syncAllLibraryGroupsOpen();
  }

  function groupFoldersAnyOpen(groupId) {
    var folders = foldersInGroup(groupId);
    if (!folders.length) return false;
    return folders.some(function (f) {
      return state.openFolders[f.id] !== false;
    });
  }

  /** Expand/collapse folders inside one library section only.
   *  If the section is closed: open it and expand all its folders.
   *  If open: only toggle folders — never collapse the section itself. */
  function toggleGroupFolders(groupId) {
    if (!groupId) return;
    var folders = foldersInGroup(groupId);
    if (!folders.length) return;
    var sectionOpen = state.openGroups[groupId] !== false;

    if (!sectionOpen) {
      state.openGroups[groupId] = true;
      state.libraryGroupsCollapsed = false;
      folders.forEach(function (f) {
        if (!f) return;
        state.openFolders[f.id] = true;
      });
      persistLibraryUi();
      syncLibraryGroupOpen(groupId);
      folders.forEach(function (f) {
        if (f) syncLibraryFolderOpen(f.id);
      });
      syncLibraryFoldAllButton();
      return;
    }

    var anyOpen = groupFoldersAnyOpen(groupId);
    folders.forEach(function (f) {
      if (!f) return;
      state.openFolders[f.id] = !anyOpen;
    });
    persistLibraryUi();
    folders.forEach(function (f) {
      if (f) syncLibraryFolderOpen(f.id);
    });
  }

  function libraryGroupFoldersFoldHtml(group) {
    if (!group || group.prepared) return '';
    var folders = foldersInGroup(group.id);
    if (!folders.length) return '';
    var sectionOpen = state.openGroups[group.id] !== false;
    var anyOpen = groupFoldersAnyOpen(group.id);
    /* Closed section always reads as “expand” — click opens section + folders. */
    var showExpand = !sectionOpen || !anyOpen;
    var title = !sectionOpen
      ? 'Abrir sección y desplegar carpetas'
      : (showExpand ? 'Desplegar carpetas de la sección' : 'Contraer carpetas de la sección');
    return '' +
      '<button type="button" class="qe-content__fold-folders' +
        (showExpand ? ' is-collapsed' : '') + '"' +
        ' data-qe-fold-group-folders="' + escapeHtml(group.id) + '"' +
        ' title="' + title + '"' +
        ' aria-label="' + title + '"' +
        ' aria-expanded="' + (!showExpand ? 'true' : 'false') + '">' +
        libraryIcon('fold') +
      '</button>';
  }

  function libraryIcon(name) {
    var S = 'xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    if (name === 'search') {
      return '<svg ' + S + '><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    }
    if (name === 'chart') {
      return '<svg ' + S + '><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V8"/></svg>';
    }
    if (name === 'filter') {
      return '<svg ' + S + '><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></svg>';
    }
    if (name === 'grid') {
      return '<svg ' + S + '><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>';
    }
    if (name === 'list') {
      return '<svg ' + S + '><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>';
    }
    if (name === 'arrow-up') {
      return '<svg ' + S + '><path d="m5 15 7-7 7 7"/></svg>';
    }
    if (name === 'arrow-down') {
      return '<svg ' + S + '><path d="m19 9-7 7-7-7"/></svg>';
    }
    if (name === 'fold') {
      return '<svg ' + S + '><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';
    }
    return '';
  }

  function matchesLibrarySearch(item) {
    var q = String(state.librarySearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return String(item && item.name || '').toLowerCase().indexOf(q) !== -1;
  }

  function groupVisibleInLibrary(group) {
    if (!group) return false;
    var items = contentInGroup(group.id).filter(matchesLibrarySearch);
    var q = String(state.librarySearchQuery || '').trim();
    if (q) return items.length > 0;
    if (state.libraryAvailableOnly) {
      if (group.prepared) return false;
      return contentInGroup(group.id).length > 0;
    }
    return true;
  }

  function itemByteSize(item) {
    if (!item) return 0;
    var n = Number(item.sizeBytes);
    if (!isNaN(n) && n > 0) return n;
    if (item.file && item.file.size != null) {
      var fs = Number(item.file.size);
      if (!isNaN(fs) && fs > 0) return fs;
    }
    if (item.peso_mb != null) return bytesFromPesoMb(item.peso_mb);
    return 0;
  }

  function libraryCapacityBytes() {
    var local = 0;
    (state.content || []).forEach(function (c) {
      local += itemByteSize(c);
    });
    var cached = state._libraryBytesCache;
    if (cached != null && Number(cached) > local) return Number(cached) || 0;
    return local;
  }

  function refreshLibraryStatusPanelIfOpen() {
    var portal = document.getElementById('qeLibMenuPortal');
    var panel = portal && portal.querySelector('[data-qe-lib-status-panel]');
    if (!panel || !panel.isConnected) return;
    var btn = document.querySelector('[data-qe-lib-status]');
    panel.innerHTML = buildLibraryStatusPanelHtml();
    if (btn) positionLibMenuPanel(btn, panel);
  }

  function notifyLibraryCapacityChanged() {
    invalidateLibraryBytesCache();
    refreshLibraryStatusPanelIfOpen();
    syncLibrarySizesFromArchivos().then(function () {
      refreshLibraryStatusPanelIfOpen();
    }).catch(function () { /* ignore */ });
  }

  function contentUsedInShowroom(item) {
    if (!item) return false;
    var urls = collectItemUrls(item);
    var used = false;
    (state.scenes || []).forEach(function (sc) {
      if (!sc) return;
      if (sceneUsesLibraryItem(sc, item, urls)) used = true;
      (sc.elements || []).forEach(function (el) {
        if (!el || !el.props) return;
        var p = el.props;
        if (p.resourceId && String(p.resourceId) === String(item.id)) used = true;
        if (urlInList(p.src, urls) || urlInList(p.url, urls) ||
            urlInList(p.imageUrl, urls) || urlInList(p.mediaUrl, urls)) {
          used = true;
        }
      });
    });
    if (typeof QuotationHero !== 'undefined' && QuotationHero.getState) {
      var hs = QuotationHero.getState();
      if (hs) {
        function mediaHit(media) {
          if (!media) return false;
          return urlInList(media.uploadedUrl, urls) ||
            urlInList(media.previewUrl, urls) ||
            (item.archivoId && media.archivoId && String(media.archivoId) === String(item.archivoId)) ||
            (item.storagePath && media.storagePath &&
              String(media.storagePath) === String(item.storagePath));
        }
        if (urlInList(hs.imageUrl, urls) || mediaHit(hs.heroImage)) used = true;
        if (urlInList(hs.videoUrl, urls) || mediaHit(hs.heroVideo)) used = true;
      }
    }
    return used;
  }

  function libraryUsageStats() {
    var total = (state.content || []).length;
    var used = 0;
    (state.content || []).forEach(function (c) {
      if (contentUsedInShowroom(c)) used += 1;
    });
    return {
      used: used,
      total: total,
      bytes: libraryCapacityBytes()
    };
  }

  function formatLibraryGb(bytes) {
    var gb = Number(bytes || 0) / (1024 * 1024 * 1024);
    if (!isFinite(gb) || gb < 0) gb = 0;
    return gb.toFixed(2) + ' GB';
  }

  var LIBRARY_CAP_BYTES = 10 * 1024 * 1024 * 1024;

  function buildLibraryStatusPanelHtml() {
    var stats = libraryUsageStats();
    var pct = Math.min(100, (stats.bytes / LIBRARY_CAP_BYTES) * 100);
    if (stats.bytes > 0 && pct < 0.5) pct = 0.5;
    var over = stats.bytes > LIBRARY_CAP_BYTES;
    if (over) pct = 100;
    return '' +
      '<p class="qe-lib-status__title">Estado del proyecto</p>' +
      '<div class="qe-lib-status__bar" aria-hidden="true">' +
        '<div class="qe-lib-status__fill" style="width:' + pct.toFixed(2) + '%"></div>' +
      '</div>' +
      '<p class="qe-lib-status__cap">' +
        escapeHtml(formatLibraryGb(stats.bytes)) + ' / 10 GB' +
      '</p>' +
      (over ? '<p class="qe-lib-status__over">Límite excedido</p>' : '') +
      '<p class="qe-lib-status__usage">' +
        stats.used + ' / ' + stats.total + ' recursos utilizados' +
      '</p>';
  }

  function openLibraryStatusPopover(btn) {
    if (!btn) return;
    var portal = document.getElementById('qeLibMenuPortal');
    var openPanel = portal && portal.querySelector('[data-qe-lib-status-panel]');
    var wasOpen = !!openPanel || btn.getAttribute('aria-expanded') === 'true';
    closeAllLibMenus();
    if (wasOpen) {
      state.libraryStatusOpen = false;
      persistLibraryUi();
      return;
    }
    portal = ensureLibMenuPortal();
    portal.setAttribute('aria-hidden', 'false');
    var panel = document.createElement('div');
    panel.className = 'boxies-workspace-menu__panel qe-lib-menu-panel qe-lib-status-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Estado del proyecto');
    panel.setAttribute('data-qe-lib-status-panel', '1');
    panel.setAttribute('data-qe-lib-menu-panel', '1');
    panel.innerHTML = buildLibraryStatusPanelHtml();
    portal.appendChild(panel);
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    state.libraryStatusOpen = true;
    persistLibraryUi();
    positionLibMenuPanel(btn, panel);
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    syncLibrarySizesFromArchivos().then(function () {
      if (!panel.isConnected) return;
      var host = document.getElementById('qeLibMenuPortal');
      if (!host || !host.contains(panel)) return;
      panel.innerHTML = buildLibraryStatusPanelHtml();
      positionLibMenuPanel(btn, panel);
    }).catch(function () { /* ignore */ });
  }

  function normalizeAssetUrl(u) {
    return String(u || '')
      .split('?')[0]
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  async function syncLibrarySizesFromArchivos() {
    var projectId = resolveProjectId();
    if (!projectId || typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.list) {
      var localOnly = 0;
      (state.content || []).forEach(function (c) { localOnly += itemByteSize(c); });
      state._libraryBytesCache = localOnly;
      return localOnly;
    }
    var items = await BunnyMediaApi.list(projectId);
    var byId = {};
    var byPath = {};
    var byUrl = {};
    var byName = {};
    var projectTotal = 0;
    var libraryPathTotal = 0;
    (items || []).forEach(function (row) {
      if (!row) return;
      var bytes = bytesFromPesoMb(row.peso_mb);
      if (row.size != null && Number(row.size) > 0) bytes = Number(row.size) || bytes;
      projectTotal += bytes;
      var path = String(row.storage_path || '');
      if (path.indexOf('qe-library') !== -1 || path.indexOf('/media/') !== -1 ||
          path.indexOf('/hero/') !== -1) {
        libraryPathTotal += bytes;
      }
      if (!bytes) return;
      if (row.id != null) byId[String(row.id)] = bytes;
      if (row.storage_path) byPath[String(row.storage_path)] = bytes;
      if (row.url) byUrl[normalizeAssetUrl(row.url)] = bytes;
      if (row.nombre) byName[String(row.nombre).toLowerCase()] = bytes;
    });

    var matched = 0;
    var unresolved = 0;
    (state.content || []).forEach(function (c) {
      if (!c) return;
      /* Tours/links have no storage weight. */
      if (c.media === 'link' || c.group === 'tours360') {
        matched += itemByteSize(c);
        return;
      }
      var b = itemByteSize(c);
      var fromDb = 0;
      if (c.archivoId && byId[String(c.archivoId)] != null) {
        fromDb = byId[String(c.archivoId)];
      }
      if (!fromDb && c.storagePath && byPath[String(c.storagePath)] != null) {
        fromDb = byPath[String(c.storagePath)];
      }
      var url = publicUrlOf(c) || c.remoteUrl || c.publicUrl || c.previewUrl || '';
      var nurl = normalizeAssetUrl(url);
      if (!fromDb && nurl && byUrl[nurl] != null) fromDb = byUrl[nurl];
      if (!fromDb && c.name && byName[String(c.name).toLowerCase()] != null) {
        fromDb = byName[String(c.name).toLowerCase()];
      }
      if (fromDb > b) b = fromDb;
      if (b > 0) c.sizeBytes = b;
      else unresolved += 1;

      if (!c.archivoId || !c.storagePath) {
        (items || []).some(function (row) {
          if (!row) return false;
          var rowUrl = normalizeAssetUrl(row.url);
          if ((nurl && rowUrl === nurl) ||
              (c.storagePath && String(row.storage_path) === String(c.storagePath)) ||
              (c.name && String(row.nombre || '').toLowerCase() === String(c.name).toLowerCase())) {
            c.archivoId = row.id || c.archivoId;
            c.storagePath = row.storage_path || c.storagePath;
            return true;
          }
          return false;
        });
      }
      matched += b;
    });

    var total = matched;
    var contentCount = (state.content || []).filter(function (c) {
      return c && c.media !== 'link' && c.group !== 'tours360';
    }).length;
    if (contentCount > 0 && (total <= 0 || unresolved > 0)) {
      var fallback = libraryPathTotal > 0 ? libraryPathTotal : projectTotal;
      if (fallback > total) total = fallback;
    }
    state._libraryBytesCache = total;
    state._libraryBytesAt = Date.now();
    persistDraft();
    return total;
  }

  function toggleProjectStatusPanel(btn) {
    openLibraryStatusPopover(btn || document.querySelector('[data-qe-lib-status]'));
  }

  function persistDraft() {
    var id = String(
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
    if (!id || !documentReady) return;
    try {
      if (expOverlay && typeof expOverlay.pull === 'function') {
        try { expOverlay.pull(); } catch (ePull) {}
      }
      persistLibraryUi();
      var payload = {
        v: 1,
        at: Date.now(),
        projectId: id,
        content: state.content,
        folders: state.folders,
        scenes: state.scenes,
        sceneGroups: state.sceneGroups,
        sceneTrack: state.sceneTrack,
        activeSceneId: state.activeSceneId,
        selectedContentId: state.selectedContentId,
        expEditMode: state.expEditMode,
        editorBackpack: {
          interactions: ensureBackpackInteractions()
        },
        editorLibraryUi: serializeLibraryUi()
      };
      var raw = JSON.stringify(payload);
      var key = draftStorageKey(id);
      try { sessionStorage.setItem(key, raw); } catch (eSs) { /* ignore */ }
      try { localStorage.setItem(key, raw); } catch (eLs) { /* quota / private mode */ }
      /* Keep live Preview envelope in sync with Editor SSOT. */
      try {
        prepareLivePreview({
          id: id,
          name: (editorProjectCtx && (editorProjectCtx.name || editorProjectCtx.nombre)) || '',
          slug: (editorProjectCtx && editorProjectCtx.slug) || ''
        });
      } catch (eLiveSync) {}
    } catch (eDraft) { /* ignore */ }
  }

  function readDraftRaw(projectId) {
    var id = String(projectId || '').trim();
    if (!id) return null;
    var key = draftStorageKey(id);
    var candidates = [];
    try {
      var ss = sessionStorage.getItem(key);
      if (ss) candidates.push(JSON.parse(ss));
    } catch (eSs) { /* ignore */ }
    try {
      var ls = localStorage.getItem(key);
      if (ls) candidates.push(JSON.parse(ls));
    } catch (eLs) { /* ignore */ }
    var best = null;
    candidates.forEach(function (d) {
      if (!d || !Array.isArray(d.scenes)) return;
      if (!best || Number(d.at || 0) > Number(best.at || 0)) best = d;
    });
    return best;
  }

  function applyDraftToState(draft) {
    if (!draft || !Array.isArray(draft.scenes)) return false;
    /* Keep persistable library entries; drop blob-only local (not persistable). */
    state.content = (Array.isArray(draft.content) ? draft.content : []).map(function (c) {
      if (!c) return null;
      if (!libraryItemIsPersistable(c)) return null;
      var pub = c.publicUrl || c.remoteUrl || null;
      if (pub && String(pub).indexOf('blob:') === 0) pub = null;
      var preview = pub || null;
      if (!preview && c.previewUrl && String(c.previewUrl).indexOf('blob:') !== 0) {
        preview = c.previewUrl;
      }
      c.publicUrl = pub;
      c.remoteUrl = pub;
      c.previewUrl = preview;
      c.storagePath = c.storagePath || null;
      c.archivoId = c.archivoId || null;
      c.provider = c.provider || null;
      c.file = null;
      c.uploadStatus = libraryItemUploadStatus(c);
      return c;
    }).filter(Boolean);
    state.folders = Array.isArray(draft.folders) ? draft.folders : [];
    ensureFolderOrders();
    state.sceneGroups = Array.isArray(draft.sceneGroups)
      ? draft.sceneGroups.map(function (g) {
        if (!g) return null;
        return {
          id: g.id,
          name: g.name || 'Grupo',
          collapsed: g.collapsed !== false,
          parentGroupId: g.parentGroupId || null,
          sceneIds: Array.isArray(g.sceneIds) ? g.sceneIds.slice() : [],
          childGroupIds: Array.isArray(g.childGroupIds) ? g.childGroupIds.slice() : []
        };
      }).filter(Boolean)
      : [];
    state.sceneTrack = Array.isArray(draft.sceneTrack) ? draft.sceneTrack.slice() : [];
    state.scenes = draft.scenes.map(function (sc) {
      if (!sc) return sc;
      if (sc.mediaUrl && String(sc.mediaUrl).indexOf('blob:') === 0) {
        var res = null;
        var i;
        for (i = 0; i < state.content.length; i++) {
          if (state.content[i].id === sc.resourceId) { res = state.content[i]; break; }
        }
        sc.mediaUrl = res ? (res.publicUrl || res.remoteUrl || null) : null;
      }
      return sc;
    });
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });
    ensureSceneGroups();
    state.activeSceneId = draft.activeSceneId ||
      (state.scenes[0] && state.scenes[0].id) ||
      null;
    if (state.activeSceneId && !sceneById(state.activeSceneId)) {
      state.activeSceneId = (state.scenes[0] && state.scenes[0].id) || null;
    }
    if (draft.selectedContentId) state.selectedContentId = draft.selectedContentId;
    if (draft.expEditMode) state.expEditMode = draft.expEditMode;
    if (draft.editorBackpack && Array.isArray(draft.editorBackpack.interactions)) {
      state.backpackInteractions = draft.editorBackpack.interactions.slice();
      state._backpackSceneRef = null;
    } else {
      state.backpackInteractions = [];
      state._backpackSceneRef = null;
    }
    state.backpackMode = false;
    state.backpackReturnSceneId = null;
    if (healLibraryIdentity()) markDirtyLocal();
    return true;
  }

  function restoreDraft(projectId) {
    var draft = readDraftRaw(projectId);
    if (!draft) return false;
    try {
      return applyDraftToState(draft);
    } catch (eRest) {
      return false;
    }
  }

  function serverSceneCount(hq) {
    var canvas = hq && hq.canvas;
    if (!canvas || !Array.isArray(canvas.scenes)) return 0;
    return canvas.scenes.length;
  }

  function serverFolderCount(hq) {
    var lib = hq && hq.library;
    if (!lib || !Array.isArray(lib.folders)) return 0;
    return lib.folders.length;
  }

  function serverContentCount(hq) {
    var lib = hq && hq.library;
    if (!lib || !Array.isArray(lib.content)) return 0;
    return lib.content.length;
  }

  function draftSceneGroupCount(draft) {
    return draft && Array.isArray(draft.sceneGroups) ? draft.sceneGroups.length : 0;
  }

  function serverSceneGroupCount(hq) {
    var canvas = hq && hq.canvas;
    return canvas && Array.isArray(canvas.sceneGroups) ? canvas.sceneGroups.length : 0;
  }

  function draftSceneTrackCount(draft) {
    return draft && Array.isArray(draft.sceneTrack) ? draft.sceneTrack.length : 0;
  }

  function serverSceneTrackCount(hq) {
    var canvas = hq && hq.canvas;
    return canvas && Array.isArray(canvas.sceneTrack) ? canvas.sceneTrack.length : 0;
  }

  function countGuidesInScenes(scenes) {
    var n = 0;
    if (!Array.isArray(scenes)) return 0;
    scenes.forEach(function (sc) {
      if (!sc) return;
      ensureSceneGuideBuckets(sc);
      ['desktop', 'tablet', 'mobile'].forEach(function (k) {
        n += (sc.guidesByViewport[k] && sc.guidesByViewport[k].length) || 0;
      });
      if (Array.isArray(sc.guides)) n += sc.guides.length;
    });
    return n;
  }

  function countInteractionsInScenes(scenes) {
    var n = 0;
    if (!Array.isArray(scenes)) return 0;
    scenes.forEach(function (sc) {
      if (sc && Array.isArray(sc.interactions)) n += sc.interactions.length;
    });
    return n;
  }

  /** Prefer local draft when it has more recent editor work than the server snapshot. */
  function shouldPreferDraftOverServer(hq, draft) {
    if (!draft || !Array.isArray(draft.scenes)) return false;
    var draftScenes = draft.scenes.length;
    var draftFolders = Array.isArray(draft.folders) ? draft.folders.length : 0;
    var draftContent = Array.isArray(draft.content) ? draft.content.length : 0;
    var draftGuides = countGuidesInScenes(draft.scenes);
    var draftIx = countInteractionsInScenes(draft.scenes);
    var srvScenes = serverSceneCount(hq);
    var srvFolders = serverFolderCount(hq);
    var srvContent = serverContentCount(hq);
    var srvGuides = countGuidesInScenes(hq && hq.canvas && hq.canvas.scenes);
    var srvIx = countInteractionsInScenes(hq && hq.canvas && hq.canvas.scenes);
    if (draftScenes > srvScenes) return true;
    if (draftFolders > srvFolders) return true;
    if (draftContent > srvContent) return true;
    /* Guides / overlays were stripped from DB sanitize historically — keep local if richer. */
    if (draftGuides > srvGuides) return true;
    if (draftIx > srvIx) return true;
    if (draftSceneGroupCount(draft) > serverSceneGroupCount(hq)) return true;
    if (draftSceneTrackCount(draft) > serverSceneTrackCount(hq)) return true;
    if (draftSceneGroupCount(draft) > 0 && serverSceneGroupCount(hq) === 0) return true;
    /* Same shape but draft is fresh (< 24h) and has real local structure. */
    var age = Date.now() - Number(draft.at || 0);
    if (age >= 0 && age < 24 * 60 * 60 * 1000) {
      if (draftScenes > 1 || draftFolders > 0 || draftContent > 0 ||
          draftGuides > 0 || draftIx > 0) {
        if (srvScenes <= 1 && srvFolders === 0 && srvContent === 0 &&
            srvGuides === 0 && srvIx === 0) {
          return true;
        }
      }
    }
    return false;
  }

  function clearDraft(projectId) {
    var id = String(projectId || loadedProjectId || '').trim();
    if (!id) return;
    var key = draftStorageKey(id);
    try { sessionStorage.removeItem(key); } catch (eClr) {}
    try { localStorage.removeItem(key); } catch (eClr2) {}
  }

  function scheduleAutosave(reason) {
    if (!documentReady || !loadedProjectId) return;
    if (autosaveTimer) {
      try { clearTimeout(autosaveTimer); } catch (eT) {}
    }
    autosaveTimer = setTimeout(function () {
      autosaveTimer = null;
      runDebouncedAutosave(reason || 'debounce');
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function cancelScheduledAutosave() {
    if (autosaveTimer) {
      try { clearTimeout(autosaveTimer); } catch (eT) {}
      autosaveTimer = null;
    }
    autosaveQueued = false;
  }

  async function runDebouncedAutosave(reason) {
    if (!documentReady || !loadedProjectId) return;
    if (autosaveInFlight) {
      autosaveQueued = true;
      return;
    }
    autosaveInFlight = true;
    try {
      persistDraft();
      await autosaveToServer({ notify: false, reason: reason || 'debounce' });
      if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
        BuilderDirtyState.clear();
      }
      persistDraft();
    } catch (eAuto) {
      console.warn('[QuotationEditor] debounced autosave', reason, eAuto);
    } finally {
      autosaveInFlight = false;
      if (autosaveQueued) {
        autosaveQueued = false;
        scheduleAutosave('queued');
      }
    }
  }

  async function autosaveToServer(opts) {
    opts = opts || {};
    try {
      if (typeof QuotationBuilderView !== 'undefined' && typeof QuotationBuilderView.save === 'function') {
        await QuotationBuilderView.save();
        return;
      }
      var projectId = resolveProjectId();
      if (!projectId) return;
      await commit({
        getProjectId: function () { return projectId; }
      });
    } catch (eSave) {
      console.warn('[QuotationEditor] autosave', opts.reason || '', eSave);
      if (opts.notify && typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error(
          (eSave && eSave.message) || 'No se pudieron guardar los cambios automáticamente.'
        );
      }
      throw eSave;
    }
  }

  function sceneById(id) {
    if (!id || !state.scenes) return null;
    for (var i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i].id === id) return state.scenes[i];
    }
    return null;
  }

  /** Only the pinned cover at index 0 — never match by type alone (blocks deleting other scenes). */
  function isHeroScene(sc) {
    if (!sc || !Array.isArray(state.scenes) || !state.scenes[0]) return false;
    return state.scenes[0].id === sc.id;
  }

  function heroScene() {
    ensureScenes();
    return heroSceneRef();
  }

  /** Hero at index 0 — no ensureScenes (safe inside ensureSceneGroups / healSceneGroups). */
  function heroSceneRef() {
    return (Array.isArray(state.scenes) && state.scenes[0]) || null;
  }

  /**
   * First scene is always the HERO cover: fixed name, type, and index 0.
   * Never removed — only cleared.
   */
  function ensureHeroSceneContract() {
    if (!Array.isArray(state.scenes)) state.scenes = [];

    var heroIdx = -1;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (!state.scenes[i]) continue;
      if (state.scenes[i].type === 'hero' || state.scenes[i].templateId === 'hero-default') {
        heroIdx = i;
        break;
      }
    }
    if (heroIdx < 0 && state.scenes.length) heroIdx = 0;

    if (heroIdx < 0) {
      state.scenes.unshift({
        id: nextId('sc'),
        name: 'HERO',
        type: 'hero',
        templateId: 'hero-default',
        resourceId: null,
        coverModel: null,
        elements: [],
        interactions: [],
        buttons: [],
        hotspots: [],
        guides: []
      });
      heroIdx = 0;
    } else if (heroIdx > 0) {
      state.scenes.unshift(state.scenes.splice(heroIdx, 1)[0]);
      heroIdx = 0;
    }

    var hero = state.scenes[0];
    hero.type = 'hero';
    hero.templateId = hero.templateId || 'hero-default';
    hero.name = 'HERO';
    ensureSceneOverlays(hero);
    if (!state.activeSceneId) state.activeSceneId = hero.id;
  }

  /** Drop live QuotationHero media so ensureHeroCoverModel / save cannot rehydrate it. */
  function clearQuotationHeroMedia() {
    if (typeof QuotationHero === 'undefined' || !QuotationHero.getState) return;
    try {
      var hs = QuotationHero.getState();
      if (!hs) return;
      hs.imageUrl = null;
      hs.videoUrl = null;
      hs.heroImage = null;
      hs.heroVideo = null;
    } catch (eClrHero) { /* ignore */ }
  }

  function emptyHeroCoverModel() {
    var model = (typeof ProjectCover !== 'undefined' && ProjectCover.blankModel)
      ? ProjectCover.blankModel()
      : {
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        imageUrl: null,
        videoUrl: null,
        logoUrl: '',
        showLogo: false
      };
    model.imageUrl = null;
    model.videoUrl = null;
    model.logoUrl = '';
    model.showLogo = false;
    if (editorProjectCtx) {
      model.nombre = editorProjectCtx.name || editorProjectCtx.nombre || model.nombre || '';
    }
    return model;
  }

  function clearHeroSceneContent(scene) {
    if (!scene) return;
    destroyExperienciaOverlay();
    clearQuotationHeroMedia();
    scene.resourceId = null;
    scene.mediaUrl = null;
    scene.publicUrl = null;
    scene.mediaType = null;
    scene.storagePath = null;
    scene.archivoId = null;
    scene.provider = null;
    scene.thumbnailUrl = null;
    scene.elements = [];
    scene.interactions = [];
    scene.buttons = [];
    scene.hotspots = [];
    scene.guides = [];
    scene.guidesByViewport = { desktop: [], tablet: [], mobile: [] };
    scene.type = 'hero';
    scene.templateId = 'hero-default';
    scene.name = 'HERO';
    /* Keep an empty cover shell — null coverModel lets ensureHeroCoverModel rebuild media. */
    scene.coverModel = emptyHeroCoverModel();
    ensureSceneOverlays(scene);
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expHasSelection = false;
  }

  function activeScene() {
    ensureScenes();
    return sceneById(state.activeSceneId) || state.scenes[0] || null;
  }

  function ensureScenes() {
    if (!Array.isArray(state.scenes)) state.scenes = [];
    ensureHeroSceneContract();
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });
    ensureSceneGroups();
    if (!state.scenes.length) {
      state.activeSceneId = null;
      return;
    }
    if (!sceneById(state.activeSceneId)) {
      state.activeSceneId = state.scenes[0].id;
    }
  }

  var ensuringSceneGroups = false;

  function ensureSceneGroups() {
    if (ensuringSceneGroups) return;
    ensuringSceneGroups = true;
    try {
      if (!Array.isArray(state.sceneGroups)) state.sceneGroups = [];
      if (!Array.isArray(state.sceneTrack)) state.sceneTrack = [];
      if (!state.sceneSelectedIds || typeof state.sceneSelectedIds !== 'object') {
        state.sceneSelectedIds = {};
      }
      healSceneGroups();
      if (!state.sceneTrack.length) {
        var i;
        for (i = 1; i < state.scenes.length; i++) {
          var sc = state.scenes[i];
          if (!sc || isHeroScene(sc)) continue;
          if (!findGroupContainingScene(sc.id)) state.sceneTrack.push(sc.id);
        }
      }
    } finally {
      ensuringSceneGroups = false;
    }
  }

  function sceneGroupById(id) {
    id = String(id || '');
    if (!id || !Array.isArray(state.sceneGroups)) return null;
    var i;
    for (i = 0; i < state.sceneGroups.length; i++) {
      if (state.sceneGroups[i] && String(state.sceneGroups[i].id) === id) {
        return state.sceneGroups[i];
      }
    }
    return null;
  }

  function findGroupContainingScene(sceneId) {
    sceneId = String(sceneId || '');
    if (!sceneId || !Array.isArray(state.sceneGroups)) return null;
    var i;
    for (i = 0; i < state.sceneGroups.length; i++) {
      var grp = state.sceneGroups[i];
      if (!grp || !Array.isArray(grp.sceneIds)) continue;
      if (grp.sceneIds.indexOf(sceneId) >= 0) return grp;
    }
    return null;
  }

  function isSceneGroupId(id) {
    return !!sceneGroupById(id);
  }

  function healSceneGroups() {
    if (!Array.isArray(state.sceneGroups)) state.sceneGroups = [];
    if (!Array.isArray(state.sceneTrack)) state.sceneTrack = [];
    var hero = heroSceneRef();
    var heroId = hero ? String(hero.id) : '';
    var validGroups = Object.create(null);
    var validScenes = Object.create(null);
    state.sceneGroups = state.sceneGroups.filter(function (grp) {
      if (!grp || !grp.id) return false;
      grp.id = String(grp.id);
      grp.name = String(grp.name || 'Grupo').trim() || 'Grupo';
      grp.collapsed = grp.collapsed !== false;
      grp.parentGroupId = grp.parentGroupId ? String(grp.parentGroupId) : null;
      grp.sceneIds = Array.isArray(grp.sceneIds)
        ? grp.sceneIds.map(String).filter(function (sid) {
          if (!sid || sid === heroId || !sceneById(sid) || isHeroScene(sceneById(sid))) return false;
          return true;
        })
        : [];
      grp.childGroupIds = Array.isArray(grp.childGroupIds)
        ? grp.childGroupIds.map(String).filter(Boolean)
        : [];
      validGroups[grp.id] = grp;
      grp.sceneIds.forEach(function (sid) { validScenes[sid] = true; });
      rememberId(grp.id);
      return true;
    });
    state.sceneGroups.forEach(function (grp) {
      grp.childGroupIds = grp.childGroupIds.filter(function (cid) {
        return !!validGroups[cid] && cid !== grp.id;
      });
      if (grp.parentGroupId && !validGroups[grp.parentGroupId]) grp.parentGroupId = null;
    });
    state.sceneTrack = state.sceneTrack.map(String).filter(function (tid) {
      if (!tid || tid === heroId) return false;
      if (validGroups[tid]) return !validGroups[tid].parentGroupId;
      if (sceneById(tid) && !validScenes[tid]) return true;
      return false;
    });
    var seenTrack = Object.create(null);
    state.sceneTrack = state.sceneTrack.filter(function (tid) {
      if (seenTrack[tid]) return false;
      seenTrack[tid] = true;
      return true;
    });
  }

  function nextGroupName() {
    var n = 1;
    (state.sceneGroups || []).forEach(function (grp) {
      var m = String(grp.name || '').match(/^Grupo\s+(\d+)/i);
      if (m) {
        var num = parseInt(m[1], 10);
        if (num >= n) n = num + 1;
      }
    });
    return 'Grupo ' + n;
  }

  function removeSceneFromGroups(sceneId) {
    sceneId = String(sceneId || '');
    if (!sceneId) return;
    (state.sceneGroups || []).forEach(function (grp) {
      if (!grp || !Array.isArray(grp.sceneIds)) return;
      grp.sceneIds = grp.sceneIds.filter(function (sid) { return String(sid) !== sceneId; });
    });
    state.sceneTrack = (state.sceneTrack || []).filter(function (tid) {
      return String(tid) !== sceneId;
    });
    if (state.sceneSelectedIds) delete state.sceneSelectedIds[sceneId];
  }

  function removeGroupFromParent(grp) {
    if (!grp) return;
    if (grp.parentGroupId) {
      var parent = sceneGroupById(grp.parentGroupId);
      if (parent && Array.isArray(parent.childGroupIds)) {
        parent.childGroupIds = parent.childGroupIds.filter(function (cid) {
          return String(cid) !== String(grp.id);
        });
      }
    } else {
      state.sceneTrack = (state.sceneTrack || []).filter(function (tid) {
        return String(tid) !== String(grp.id);
      });
    }
  }

  function insertTrackItemsAt(index, ids) {
    var track = state.sceneTrack || [];
    var clean = track.filter(function (tid) {
      return ids.indexOf(String(tid)) < 0;
    });
    var at = Math.max(0, Math.min(index, clean.length));
    state.sceneTrack = clean.slice(0, at).concat(ids).concat(clean.slice(at));
  }

  function trackIndexOf(id) {
    id = String(id || '');
    var track = state.sceneTrack || [];
    var i;
    for (i = 0; i < track.length; i++) {
      if (String(track[i]) === id) return i;
    }
    return -1;
  }

  function createSceneGroup(opts) {
    opts = opts || {};
    ensureSceneGroups();
    var parentId = opts.parentGroupId ? String(opts.parentGroupId) : null;
    if (parentId && !sceneGroupById(parentId)) parentId = null;
    var grp = {
      id: nextId('sg'),
      name: nextGroupName(),
      collapsed: true,
      parentGroupId: parentId,
      sceneIds: [],
      childGroupIds: []
    };
    state.sceneGroups.push(grp);
    if (parentId) {
      var parent = sceneGroupById(parentId);
      if (parent) parent.childGroupIds.push(grp.id);
    } else {
      state.sceneTrack.push(grp.id);
    }
    markDirtyLocal();
    if (!parentId) queueScenesStripReveal(grp.id);
    return grp;
  }

  function addScenesToGroup(groupId, sceneIds, opts) {
    opts = opts || {};
    ensureSceneGroups();
    var grp = sceneGroupById(groupId);
    if (!grp || !Array.isArray(sceneIds) || !sceneIds.length) return false;
    var hero = heroSceneRef();
    var heroId = hero ? String(hero.id) : '';
    var ids = sceneIds.map(String).filter(function (sid) {
      var sc = sceneById(sid);
      return sid && sid !== heroId && sc && !isHeroScene(sc);
    });
    if (!ids.length) return false;
    ids.forEach(function (sid) {
      var prev = findGroupContainingScene(sid);
      if (prev && prev.id !== grp.id) {
        prev.sceneIds = prev.sceneIds.filter(function (x) { return String(x) !== sid; });
      }
      removeSceneFromGroups(sid);
      if (grp.sceneIds.indexOf(sid) < 0) grp.sceneIds.push(sid);
    });
    if (opts.expand) grp.collapsed = false;
    markDirtyLocal();
    return true;
  }

  function releaseGroupContentsToTrack(grp, insertAt) {
    if (!grp) return;
    var ids = [];
    (grp.sceneIds || []).forEach(function (sid) { ids.push(String(sid)); });
    (grp.childGroupIds || []).forEach(function (cid) {
      var child = sceneGroupById(cid);
      if (child) {
        child.parentGroupId = null;
        ids.push(String(cid));
      }
    });
    grp.sceneIds = [];
    grp.childGroupIds = [];
    removeGroupFromParent(grp);
    if (typeof insertAt === 'number' && insertAt >= 0) {
      insertTrackItemsAt(insertAt, ids);
    } else {
      ids.forEach(function (tid) {
        if (state.sceneTrack.indexOf(tid) < 0) state.sceneTrack.push(tid);
      });
    }
  }

  function deleteSceneGroupOnly(groupId) {
    var grp = sceneGroupById(groupId);
    if (!grp) return false;
    var idx = grp.parentGroupId
      ? -1
      : trackIndexOf(grp.id);
    releaseGroupContentsToTrack(grp, idx >= 0 ? idx : state.sceneTrack.length);
    state.sceneGroups = state.sceneGroups.filter(function (g) {
      return g && String(g.id) !== String(groupId);
    });
    markDirtyLocal();
    rerender();
    return true;
  }

  function collectGroupSceneIds(grp, out) {
    if (!grp) return;
    (grp.sceneIds || []).forEach(function (sid) { out.push(String(sid)); });
    (grp.childGroupIds || []).forEach(function (cid) {
      collectGroupSceneIds(sceneGroupById(cid), out);
    });
  }

  function deleteSceneGroupWithContent(groupId) {
    var grp = sceneGroupById(groupId);
    if (!grp) return false;
    var sceneIds = [];
    collectGroupSceneIds(grp, sceneIds);
    var childGroups = [];
    function walkChildren(g) {
      if (!g) return;
      (g.childGroupIds || []).forEach(function (cid) {
        var c = sceneGroupById(cid);
        if (c) {
          childGroups.push(String(cid));
          walkChildren(c);
        }
      });
    }
    walkChildren(grp);
    removeGroupFromParent(grp);
    state.sceneGroups = state.sceneGroups.filter(function (g) {
      if (!g) return false;
      if (String(g.id) === String(groupId)) return false;
      return childGroups.indexOf(String(g.id)) < 0;
    });
    deleteScenesByIds(sceneIds);
    markDirtyLocal();
    rerender();
    return true;
  }

  /* ── Scene group float (body portal — mismo modelo que Checklist / QuotationWindowManager) ── */
  var SCENE_GROUP_FLOAT_HOST_ID = 'qeScenesGroupPortal';
  var openSceneGroupFloatId = null;
  var sceneGroupFloatUiBound = false;

  function ensureSceneGroupFloatHost() {
    var host = document.getElementById(SCENE_GROUP_FLOAT_HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = SCENE_GROUP_FLOAT_HOST_ID;
      host.className = 'qe-canvas-tools-host qe-scenes-group-portal';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function sceneGroupFloatAnchorInStrip(groupId) {
    var strip = document.querySelector('[data-qe-scenes-track]');
    if (!strip) return null;
    var anchor = null;
    strip.querySelectorAll('[data-qe-scene-group-toggle]').forEach(function (btn) {
      if (String(btn.getAttribute('data-qe-scene-group-toggle')) === String(groupId)) {
        anchor = btn;
      }
    });
    return anchor;
  }

  function sceneGroupFloatScenesHtml(grp) {
    if (!grp) return '<p class="qe-scenes-group-float__empty">Sin escenas</p>';
    var html = '';
    (grp.sceneIds || []).forEach(function (sid) {
      var sc = sceneById(sid);
      if (sc) html += sceneThumbWrapHtml(sc, { inGroup: true, inPanel: true });
    });
    return html || '<p class="qe-scenes-group-float__empty">Sin escenas en este grupo</p>';
  }

  function sceneGroupFloatShellHtml(grp) {
    var gid = escapeHtml(String(grp.id));
    var title = escapeHtml(String(grp.name || 'Grupo').toLowerCase());
    return '' +
      '<div class="qe-canvas-tool-float qe-scenes-group-float"' +
        ' data-qe-scene-group-float="' + gid + '" role="dialog"' +
        ' aria-label="Escenas del grupo">' +
        '<div class="qe-canvas-tool-float__head">' +
          '<span class="qe-canvas-tool-float__title">' + title + '</span>' +
          '<div class="qe-canvas-tool-float__actions">' +
            '<button type="button" class="qe-canvas-tool-float__close"' +
              ' data-qe-scene-group-float-close aria-label="Cerrar">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="qe-canvas-tool-float__body qe-scenes-group-float__body">' +
          '<div class="qe-scenes-group-float__scroll" data-qe-scene-group-float-scroll>' +
            sceneGroupFloatScenesHtml(grp) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function sceneGroupFloatCanvasBottom() {
    var frame = rootEl && rootEl.querySelector('[data-qe-canvas-fit-frame]');
    if (frame) {
      var fr = frame.getBoundingClientRect();
      if (fr.height > 0) return fr.bottom;
    }
    var stage = rootEl && rootEl.querySelector('[data-qe-canvas]');
    if (stage) {
      var sr = stage.getBoundingClientRect();
      if (sr.height > 0) return sr.bottom;
    }
    return null;
  }

  function positionSceneGroupFloat(floatEl, anchorEl) {
    if (!floatEl || !anchorEl) return;
    var rect = anchorEl.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    var gap = 8;
    var pad = 8;
    var width = Math.max(168, Math.round(rect.width));
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var left = Math.max(pad, Math.min(rect.left, vw - width - pad));
    var top = rect.bottom + gap;
    var viewportMaxH = Math.max(160, vh - top - pad);
    var canvasBottom = sceneGroupFloatCanvasBottom();
    var canvasMaxH = canvasBottom != null
      ? Math.max(120, canvasBottom - top - pad)
      : viewportMaxH;
    var maxH = Math.min(viewportMaxH, canvasMaxH);
    floatEl.style.position = 'fixed';
    floatEl.style.left = left + 'px';
    floatEl.style.top = top + 'px';
    floatEl.style.width = width + 'px';
    floatEl.style.maxHeight = maxH + 'px';
    floatEl.style.height = 'auto';
    floatEl.style.bottom = 'auto';
    floatEl.style.zIndex = '12051';
    var head = floatEl.querySelector('.qe-canvas-tool-float__head');
    var headH = head ? Math.ceil(head.getBoundingClientRect().height) : 44;
    var scroll = floatEl.querySelector('[data-qe-scene-group-float-scroll]');
    if (scroll) scroll.style.maxHeight = Math.max(80, maxH - headH) + 'px';
  }

  function syncSceneGroupStripOpenState() {
    document.querySelectorAll('[data-qe-scenes-track] [data-qe-scene-group-block]').forEach(function (block) {
      var bid = block.getAttribute('data-qe-scene-group-block');
      var open = !!(bid && openSceneGroupFloatId && String(bid) === String(openSceneGroupFloatId));
      block.classList.toggle('is-open-float', open);
      var btn = block.querySelector('[data-qe-scene-group-toggle]');
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function sceneGroupFloatOpen(groupId, anchorEl) {
    groupId = String(groupId || '');
    if (!groupId) {
      sceneGroupFloatLog('[QE:scene-group-float] open aborted: no groupId');
      return;
    }
    var grp = sceneGroupById(groupId);
    if (!grp || grp.parentGroupId) {
      sceneGroupFloatLog('[QE:scene-group-float] open aborted: group missing or nested', groupId, grp);
      return;
    }
    anchorEl = anchorEl || sceneGroupFloatAnchorInStrip(groupId);
    if (!anchorEl) {
      sceneGroupFloatLog('[QE:scene-group-float] open aborted: no anchor', groupId);
      return;
    }

    openSceneGroupFloatId = groupId;
    grp.collapsed = false;

    var host = ensureSceneGroupFloatHost();
    host.innerHTML = sceneGroupFloatShellHtml(grp);
    host.setAttribute('aria-hidden', 'false');

    var floatEl = host.querySelector('[data-qe-scene-group-float]');
    if (floatEl) positionSceneGroupFloat(floatEl, anchorEl);

    syncSceneGroupStripOpenState();

    sceneGroupFloatLog('[QE:scene-group-float] opened', groupId, {
      scenes: (grp.sceneIds || []).length,
      host: SCENE_GROUP_FLOAT_HOST_ID
    });

    if (rootEl) {
      bindSceneNameEditing(rootEl);
      bindSceneDragReorder(rootEl);
    }
  }

  function sceneGroupFloatClose() {
    if (!openSceneGroupFloatId) return;
    var grp = sceneGroupById(openSceneGroupFloatId);
    if (grp) grp.collapsed = true;
    openSceneGroupFloatId = null;
    var host = document.getElementById(SCENE_GROUP_FLOAT_HOST_ID);
    if (host) {
      host.innerHTML = '';
      host.setAttribute('aria-hidden', 'true');
    }
    syncSceneGroupStripOpenState();
  }

  function sceneGroupFloatToggle(groupId, anchorEl) {
    ensureSceneGroups();
    groupId = String(groupId || '');
    if (!groupId) return;
    if (openSceneGroupFloatId === groupId) {
      sceneGroupFloatClose();
      return;
    }
    sceneGroupFloatOpen(groupId, anchorEl);
  }

  function sceneGroupFloatReposition() {
    if (!openSceneGroupFloatId) return;
    var host = document.getElementById(SCENE_GROUP_FLOAT_HOST_ID);
    var floatEl = host && host.querySelector('[data-qe-scene-group-float]');
    var anchor = sceneGroupFloatAnchorInStrip(openSceneGroupFloatId);
    if (floatEl && anchor) positionSceneGroupFloat(floatEl, anchor);
  }

  var SCENE_GROUP_FLOAT_DEBUG = true;

  function sceneGroupFloatLog() {
    if (!SCENE_GROUP_FLOAT_DEBUG || typeof console === 'undefined' || !console.log) return;
    try {
      console.log.apply(console, arguments);
    } catch (eLog) { /* ignore */ }
  }

  function resolveStripGroupToggleTarget(e) {
    if (!e || !e.target || !e.target.closest) return null;
    var toggleBtn = e.target.closest('[data-qe-scene-group-toggle]');
    if (toggleBtn && toggleBtn.closest('[data-qe-scenes-track]')) {
      return toggleBtn;
    }
    var track = e.target.closest('[data-qe-scenes-track]');
    if (!track) return null;
    var wrap = e.target.closest('[data-qe-scene-group-wrap]');
    if (!wrap || !track.contains(wrap)) return null;
    if (e.target.closest('[data-qe-scene-group-name]') && (e.detail || 1) >= 2) return null;
    toggleBtn = wrap.querySelector('[data-qe-scene-group-toggle]');
    return toggleBtn || null;
  }

  function initSceneGroupFloatUi() {
    sceneGroupFloatLog('[QE:scene-group-float] initSceneGroupFloatUi()', {
      alreadyBound: sceneGroupFloatUiBound
    });
    if (sceneGroupFloatUiBound) return;
    sceneGroupFloatUiBound = true;

    /* Capture: abrir/toggle antes que shell.js u otros handlers en bubble. */
    document.addEventListener('click', function (e) {
      var toggleBtn = resolveStripGroupToggleTarget(e);
      if (!toggleBtn) return;
      sceneGroupFloatLog('[QE:scene-group-float] capture click → toggle', {
        groupId: toggleBtn.getAttribute('data-qe-scene-group-toggle'),
        target: e.target && e.target.className
      });
      e.preventDefault();
      e.stopPropagation();
      ensureSceneGroups();
      sceneGroupFloatToggle(
        toggleBtn.getAttribute('data-qe-scene-group-toggle'),
        toggleBtn
      );
      markDirtyLocal();
    }, true);

    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;

      var inStrip = !!(e.target.closest && e.target.closest('[data-qe-scenes-track]'));
      if (inStrip) {
        sceneGroupFloatLog('[QE:scene-group-float] bubble click (strip)', {
          target: e.target.className || e.target.nodeName,
          toggle: resolveStripGroupToggleTarget(e) ? 'yes' : 'no'
        });
      }

      if (e.target.closest('[data-qe-scene-group-float-close]')) {
        sceneGroupFloatClose();
        markDirtyLocal();
        return;
      }

      var floatHost = document.getElementById(SCENE_GROUP_FLOAT_HOST_ID);
      if (floatHost && floatHost.contains(e.target)) {
        var sceneBtn = e.target.closest('[data-qe-scene]');
        if (sceneBtn) {
          var sid = sceneBtn.getAttribute('data-qe-scene');
          if (sid) {
            if (e.shiftKey && !isHeroScene(sceneById(sid))) {
              toggleSceneSelection(sid);
            } else {
              clearSceneSelection();
              selectScene(sid);
            }
          }
        }
        return;
      }

      if (resolveStripGroupToggleTarget(e)) return;

      if (!openSceneGroupFloatId) return;
      var stillOpen = openSceneGroupFloatId;
      window.setTimeout(function () {
        if (openSceneGroupFloatId !== stillOpen) return;
        sceneGroupFloatClose();
        markDirtyLocal();
      }, 0);
    });

    if (!document.documentElement.dataset.qeSceneGroupFloatResize) {
      document.documentElement.dataset.qeSceneGroupFloatResize = '1';
      window.addEventListener('resize', sceneGroupFloatReposition, { passive: true });
    }

    sceneGroupFloatLog('[QE:scene-group-float] listeners registered');
  }

  function toggleSceneGroupCollapsed(groupId) {
    sceneGroupFloatToggle(groupId, sceneGroupFloatAnchorInStrip(groupId));
  }

  function syncExpandedGroupPanels() {
    sceneGroupFloatReposition();
  }

  function renameSceneGroup(groupId, name) {
    var grp = sceneGroupById(groupId);
    if (!grp) return false;
    var next = String(name || '').trim();
    if (!next) return false;
    grp.name = next;
    markDirtyLocal();
    rerender();
    return true;
  }

  function toggleSceneSelection(sceneId) {
    sceneId = String(sceneId || '');
    if (!sceneId || isHeroScene(sceneById(sceneId))) return;
    if (!state.sceneSelectedIds) state.sceneSelectedIds = {};
    if (state.sceneSelectedIds[sceneId]) delete state.sceneSelectedIds[sceneId];
    else state.sceneSelectedIds[sceneId] = true;
    rerender();
  }

  function selectedSceneIdsForDrag(primaryId) {
    var ids = [];
    var sel = state.sceneSelectedIds || {};
    Object.keys(sel).forEach(function (sid) {
      if (sel[sid]) ids.push(String(sid));
    });
    primaryId = String(primaryId || '');
    if (primaryId && ids.indexOf(primaryId) < 0) ids.unshift(primaryId);
    if (!ids.length && primaryId) ids = [primaryId];
    return ids.filter(function (sid) {
      var sc = sceneById(sid);
      return sc && !isHeroScene(sc);
    });
  }

  function clearSceneSelection() {
    state.sceneSelectedIds = {};
  }

  function reorderSceneTrack(fromId, toId, placeAfter) {
    ensureSceneGroups();
    fromId = String(fromId || '');
    toId = String(toId || '');
    if (!fromId || !toId || fromId === toId) return;
    if (isHeroScene(sceneById(fromId)) || isHeroScene(sceneById(toId))) return;
    var fromInGroup = findGroupContainingScene(fromId);
    var toInGroup = findGroupContainingScene(toId);
    if (fromInGroup && toInGroup && fromInGroup.id === toInGroup.id) {
      var list = fromInGroup.sceneIds.slice();
      var fi = list.indexOf(fromId);
      var ti = list.indexOf(toId);
      if (fi < 0 || ti < 0) return;
      list.splice(fi, 1);
      ti = list.indexOf(toId);
      list.splice(placeAfter ? ti + 1 : ti, 0, fromId);
      fromInGroup.sceneIds = list;
      markDirtyLocal();
      return;
    }
    if (fromInGroup || toInGroup) return;
    var track = state.sceneTrack.slice();
    var fromIdx = track.indexOf(fromId);
    var toIdx = track.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    track.splice(fromIdx, 1);
    toIdx = track.indexOf(toId);
    track.splice(placeAfter ? toIdx + 1 : toIdx, 0, fromId);
    state.sceneTrack = track;
    markDirtyLocal();
  }

  function setGroupScenes(groupId, sceneIds) {
    var grp = sceneGroupById(groupId);
    if (!grp) return false;
    var nextSet = Object.create(null);
    var next = (sceneIds || []).map(String).filter(function (sid) {
      var sc = sceneById(sid);
      if (!sid || !sc || isHeroScene(sc)) return false;
      if (nextSet[sid]) return false;
      nextSet[sid] = true;
      return true;
    });
    var prev = (grp.sceneIds || []).slice();
    var trackIdx = grp.parentGroupId ? -1 : trackIndexOf(groupId);
    prev.forEach(function (sid) {
      if (nextSet[sid]) return;
      grp.sceneIds = grp.sceneIds.filter(function (x) { return String(x) !== sid; });
      if (state.sceneTrack.indexOf(sid) < 0) {
        insertTrackItemsAt(trackIdx >= 0 ? trackIdx + 1 : state.sceneTrack.length, [sid]);
      }
    });
    addScenesToGroup(groupId, next, {});
    return true;
  }

  function listTopLevelSceneGroups() {
    return (state.sceneGroups || []).filter(function (grp) {
      return grp && !grp.parentGroupId;
    });
  }

  function listAllSceneGroupsFlat() {
    return (state.sceneGroups || []).slice();
  }

  function nextSceneName() {
    var n = 1;
    state.scenes.forEach(function (sc) {
      var m = String(sc.name || '').match(/^Escena\s+(\d+)/i);
      if (m) {
        var num = parseInt(m[1], 10);
        if (num >= n) n = num + 1;
      }
    });
    return 'Escena ' + (n < 10 ? '0' + n : String(n));
  }

  function buildHeroDefaultScenePayload(ctx) {
    var model;
    if (typeof ProjectCover !== 'undefined' && ProjectCover.fromQuotationHeroState) {
      var hs = null;
      try {
        if (typeof QuotationHero !== 'undefined' && QuotationHero.getState) {
          hs = QuotationHero.getState();
        }
      } catch (e) { hs = null; }
      model = ProjectCover.fromQuotationHeroState(hs, ctx || editorProjectCtx);
    } else {
      model = {
        nombre: (ctx && (ctx.name || ctx.nombre)) || '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar'
      };
    }

    var elements = (typeof ProjectCover !== 'undefined' && ProjectCover.elementDescriptors)
      ? ProjectCover.elementDescriptors(function () { return nextId('el'); })
      : [];

    elements.forEach(function (el) {
      if (!el.props) el.props = {};
      if (el.role === 'title') el.props.text = model.nombre || '';
      if (el.role === 'subtitle') el.props.text = model.eslogan || '';
      if (el.role === 'explore') el.props.label = model.botonIzquierdo || 'Explorar';
      if (el.role === 'start') el.props.label = model.botonDerecho || 'Iniciar';
      if (el.role === 'back') el.props.label = model.backLabel || 'Demos';
      if (el.role === 'logo') {
        el.props.src = model.logoUrl || '';
        el.props.show = !!model.showLogo;
      }
    });

    return { coverModel: model, elements: elements };
  }

  /* @deprecated — V7.2.05 uses ProjectCover SSOT */
  function buildHeroTemplateElements() {
    return buildHeroDefaultScenePayload(editorProjectCtx).elements;
  }

  function elementByRole(scene, role) {
    if (!scene || !scene.elements) return null;
    for (var i = 0; i < scene.elements.length; i++) {
      if (scene.elements[i].role === role) return scene.elements[i];
    }
    return null;
  }

  function findSelectedElement() {
    var scene = activeScene();
    if (!scene || !state.selectedElementId || !scene.elements) return null;
    for (var i = 0; i < scene.elements.length; i++) {
      if (scene.elements[i].id === state.selectedElementId) return scene.elements[i];
    }
    return null;
  }

  function contentById(id) {
    for (var i = 0; i < state.content.length; i++) {
      if (state.content[i].id === id) return state.content[i];
    }
    return null;
  }

  function folderById(id) {
    for (var i = 0; i < state.folders.length; i++) {
      if (state.folders[i].id === id) return state.folders[i];
    }
    return null;
  }

  function contentInGroup(groupId) {
    return state.content.filter(function (c) { return c.group === groupId; });
  }

  function folderOrderValue(folder) {
    var n = Number(folder && folder.order);
    return isNaN(n) ? 0 : n;
  }

  function foldersInGroup(groupId) {
    return state.folders
      .filter(function (f) { return f && f.group === groupId; })
      .slice()
      .sort(function (a, b) {
        var diff = folderOrderValue(a) - folderOrderValue(b);
        if (diff !== 0) return diff;
        return String(a.name || '').localeCompare(String(b.name || ''), 'es');
      });
  }

  function nextFolderOrder(groupId) {
    var max = -1;
    state.folders.forEach(function (f) {
      if (!f || f.group !== groupId) return;
      var o = folderOrderValue(f);
      if (o > max) max = o;
    });
    return max + 1;
  }

  function rewriteFolderOrders(groupId) {
    foldersInGroup(groupId).forEach(function (f, idx) {
      f.order = idx;
    });
  }

  function ensureFolderOrders() {
    CONTENT_GROUPS.forEach(function (g) {
      if (!g) return;
      var list = state.folders.filter(function (f) { return f && f.group === g.id; });
      var missing = list.some(function (f) {
        return f.order == null || f.order === '' || isNaN(Number(f.order));
      });
      if (!missing) return;
      list.forEach(function (f, idx) {
        if (f.order == null || f.order === '' || isNaN(Number(f.order))) f.order = idx;
      });
      rewriteFolderOrders(g.id);
    });
  }

  function rootContentInGroup(groupId) {
    return state.content.filter(function (c) {
      return c.group === groupId && !c.folderId;
    });
  }

  function contentInFolder(folderId, groupId) {
    return state.content.filter(function (c) {
      if (!c || String(c.folderId || '') !== String(folderId || '')) return false;
      if (groupId != null && groupId !== '') {
        return String(c.group || '') === String(groupId);
      }
      return true;
    });
  }

  function ensureItems(contentId) {
    if (!state.items[contentId]) {
      state.items[contentId] = { buttons: [], hotspots: [] };
    }
    return state.items[contentId];
  }

  /** Scene overlays — Showroom interactions[] SSOT (V7.2.13). */
  function ensureSceneOverlays(scene) {
    if (!scene) return { interactions: [], buttons: [], hotspots: [], guides: [] };
    if (typeof QuotationExperienciaBridge !== 'undefined' &&
        QuotationExperienciaBridge.ensureSceneInteractions) {
      QuotationExperienciaBridge.ensureSceneInteractions(scene);
    } else {
      if (!Array.isArray(scene.interactions)) scene.interactions = [];
      if (!Array.isArray(scene.buttons)) scene.buttons = [];
      if (!Array.isArray(scene.hotspots)) scene.hotspots = [];
    }
    ensureSceneGuideBuckets(scene);
    return scene;
  }

  function ensureSceneGuideBuckets(scene) {
    if (!scene) return null;
    if (typeof QuotationGuides !== 'undefined' && QuotationGuides.ensureGuideBuckets) {
      return QuotationGuides.ensureGuideBuckets(scene);
    }
    if (!scene.guidesByViewport || typeof scene.guidesByViewport !== 'object') {
      scene.guidesByViewport = {};
    }
    ['desktop', 'tablet', 'mobile'].forEach(function (k) {
      if (!Array.isArray(scene.guidesByViewport[k])) scene.guidesByViewport[k] = [];
    });
    if (Array.isArray(scene.guides) && scene.guides.length) {
      if (!scene.guidesByViewport.desktop.length) {
        scene.guidesByViewport.desktop = scene.guides.slice();
      }
      scene.guides = [];
    } else if (!Array.isArray(scene.guides)) {
      scene.guides = [];
    }
    return scene.guidesByViewport;
  }

  function serializeGuideColors(sc) {
    ensureSceneGuideBuckets(sc);
    var src = sc.guideColorByViewport;
    if (!src || typeof src !== 'object') {
      return { desktop: '#b33a3a', tablet: '#b33a3a', mobile: '#b33a3a' };
    }
    function pick(key) {
      var c = String(src[key] || '').trim();
      return /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : '#b33a3a';
    }
    return { desktop: pick('desktop'), tablet: pick('tablet'), mobile: pick('mobile') };
  }

  function serializeGuideList(list) {
    return (Array.isArray(list) ? list : []).map(function (g) {
      if (!g || !g.id) return null;
      return {
        id: String(g.id),
        type: g.type === 'horizontal' ? 'horizontal' : 'vertical',
        position: Math.max(0, Math.min(100, Number(g.position) || 0)),
        locked: !!g.locked
      };
    }).filter(Boolean);
  }

  function serializeSceneGuides(sc) {
    ensureSceneGuideBuckets(sc);
    return {
      desktop: serializeGuideList(sc.guidesByViewport.desktop),
      tablet: serializeGuideList(sc.guidesByViewport.tablet),
      mobile: serializeGuideList(sc.guidesByViewport.mobile)
    };
  }

  function selectedContent() {
    return contentById(state.selectedContentId) || state.content[0] || null;
  }

  function findSelectedItem() {
    /* Buttons/hotspots are edited by ExperienciaCanvas inspector — not QE chips. */
    return null;
  }

  function clearInvalidSelection() {
    if (state.selectedItem) state.selectedItem = null;
    if (state.selectedElementId && !findSelectedElement()) {
      state.selectedElementId = null;
    }
  }

  function thumbClass(content) {
    var kind = 'image';
    if (!content) kind = 'image';
    else if (content.group === 'hero') kind = 'hero';
    else if (content.group === 'videos' || content.media === 'video') kind = 'video';
    else if (content.group === 'tours360') kind = 'pano360';
    else if (content.group === 'pdf' || content.media === 'pdf') kind = 'image';
    else if (content.group === 'plantas2d' || content.group === 'plantas3d') kind = 'image';
    return 'qe-lib__thumb qe-lib__thumb--' + kind;
  }

  function libraryItemIsUploading(item) {
    if (!item) return false;
    var st = item.uploadStatus || libraryItemUploadStatus(item);
    if (st === 'pending' || st === 'uploading' || st === 'local') return true;
    if (item.file && !publicUrlOf(item)) return true;
    return false;
  }

  function libraryItemThumbPending(item) {
    if (!item) return false;
    if (item.uploadStatus === 'failed') return false;
    if (libraryItemIsUploading(item)) return true;
    if (item.thumbReady === false) return true;
    return false;
  }

  /** Wait until CDN bytes are decoded before painting the thumb (avoids progressive gray bar). */
  function preloadLibraryThumb(item) {
    if (!item) return;
    var url = publicUrlOf(item);
    if (!url) {
      item.thumbReady = false;
      return;
    }
    if (item.media === 'pdf' || item.group === 'pdf' || item.media === 'link' ||
        item.group === 'tours360') {
      item.thumbReady = true;
      return;
    }
    item.thumbReady = false;
    var token = String(url);
    item._thumbPreloadToken = token;
    var img = new Image();
    img.onload = function () {
      if (item._thumbPreloadToken !== token) return;
      item.thumbReady = true;
      requestThumbReadyRerender();
    };
    img.onerror = function () {
      if (item._thumbPreloadToken !== token) return;
      item.thumbReady = true;
      requestThumbReadyRerender();
    };
    img.src = url;
  }

  function contentTypeLabel(item) {
    if (!item) return 'Archivo';
    if (item.group === 'tours360') return 'Enlace';
    if (item.media === 'video' || item.group === 'videos') return 'Video';
    if (item.media === 'pdf' || item.group === 'pdf') return 'PDF';
    if (item.group === 'plantas2d') return 'Plano 2D';
    if (item.group === 'plantas3d') return 'Plano 3D';
    return 'Imagen';
  }

  function libMenuTriggerHtml(kind, id, ariaLabel) {
    return '' +
      '<button type="button" class="qe-lib-menu-btn" data-qe-lib-menu="' + escapeHtml(kind) + '"' +
        ' data-qe-lib-menu-id="' + escapeHtml(id) + '"' +
        ' aria-label="' + escapeHtml(ariaLabel || 'Opciones') + '"' +
        ' aria-haspopup="menu" aria-expanded="false" title="Opciones">⋮</button>';
  }

  function isLibrarySelectMode(groupId) {
    return String(state.librarySelectModeGroup || '') === String(groupId || '');
  }

  function librarySelectedCountInGroup(groupId) {
    var n = 0;
    var map = state.librarySelectedIds || {};
    Object.keys(map).forEach(function (id) {
      if (!map[id]) return;
      var c = contentById(id);
      if (c && String(c.group || '') === String(groupId || '')) n += 1;
    });
    return n;
  }

  function librarySelectedCount() {
    return librarySelectedCountInGroup(state.librarySelectModeGroup);
  }

  function isLibraryItemSelected(id) {
    return !!(state.librarySelectedIds && state.librarySelectedIds[String(id)]);
  }

  function clearLibrarySelectionMode() {
    state.librarySelectModeGroup = null;
    state.librarySelectedIds = {};
    state.librarySelectAnchorId = null;
    closeLibrarySelectPopoverOnly();
  }

  function ensureLibrarySelectMode(groupId) {
    if (!groupId || groupId === 'audio' || groupId === 'models') return false;
    if (isLibrarySelectMode(groupId)) return true;
    closeAllLibMenus();
    state.librarySelectModeGroup = groupId;
    state.librarySelectedIds = {};
    state.librarySelectAnchorId = null;
    state.openGroups[groupId] = true;
    return true;
  }

  function folderScopeKey(folderId) {
    return folderId ? String(folderId) : '';
  }

  function visibleContentIdsInScope(groupId, folderId) {
    var list = folderId
      ? contentInFolder(folderId, groupId)
      : rootContentInGroup(groupId);
    return list.filter(matchesLibrarySearch).map(function (c) { return String(c.id); });
  }

  function clearLibrarySelectionInGroup(groupId) {
    var map = state.librarySelectedIds || {};
    Object.keys(map).forEach(function (id) {
      if (!map[id]) return;
      var c = contentById(id);
      if (c && String(c.group || '') === String(groupId || '')) {
        delete map[id];
      }
    });
  }

  function selectLibraryRange(groupId, folderId, fromId, toId) {
    var ids = visibleContentIdsInScope(groupId, folderId);
    var a = ids.indexOf(String(fromId));
    var b = ids.indexOf(String(toId));
    if (a < 0 || b < 0) return;
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    var i;
    for (i = lo; i <= hi; i++) {
      state.librarySelectedIds[ids[i]] = true;
    }
  }

  function setLibrarySelectionAllInScope(groupId, folderId, on) {
    var ids = visibleContentIdsInScope(groupId, folderId);
    ids.forEach(function (id) {
      if (on) state.librarySelectedIds[id] = true;
      else delete state.librarySelectedIds[id];
    });
  }

  function isLibraryScopeFullySelected(groupId, folderId) {
    var ids = visibleContentIdsInScope(groupId, folderId);
    if (!ids.length) return false;
    return ids.every(function (id) { return isLibraryItemSelected(id); });
  }

  function librarySelectAllRowHtml(groupId, folderId) {
    if (!isLibrarySelectMode(groupId)) return '';
    var ids = visibleContentIdsInScope(groupId, folderId);
    if (!ids.length) return '';
    var allOn = isLibraryScopeFullySelected(groupId, folderId);
    var scope = folderId ? String(folderId) : '';
    return '' +
      '<label class="qe-lib__select-all" data-qe-lib-select-all="' + escapeHtml(groupId) + '"' +
        ' data-qe-lib-select-all-folder="' + escapeHtml(scope) + '">' +
        '<input type="checkbox" class="qe-lib__check-input" data-qe-lib-select-all-input' +
          (allOn ? ' checked' : '') +
          ' aria-label="Seleccionar todos">' +
        '<span class="qe-lib__check-box" aria-hidden="true"></span>' +
        '<span class="qe-lib__select-all-label">Todos</span>' +
      '</label>';
  }

  function contextActionContentIds(primaryId) {
    var item = contentById(primaryId);
    if (!item) return [];
    if (isLibraryItemSelected(primaryId) && librarySelectedCountInGroup(item.group) > 1) {
      return Object.keys(state.librarySelectedIds || {}).filter(function (id) {
        return state.librarySelectedIds[id] && contentById(id) &&
          String(contentById(id).group) === String(item.group);
      });
    }
    return [String(primaryId)];
  }

  function closeLibrarySelectPopoverOnly() {
    var portal = document.getElementById('qeLibMenuPortal');
    if (!portal) return;
    var panel = portal.querySelector('[data-qe-lib-select-panel]');
    if (!panel) return;
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    if (!portal.querySelector('[data-qe-lib-menu-panel],[data-qe-lib-status-panel]')) {
      portal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('[data-qe-lib-select-mode]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function librarySelectTriggerHtml(group) {
    if (!group) return '';
    var selectOn = isLibrarySelectMode(group.id);
    var n = librarySelectedCountInGroup(group.id);
    var hasCount = selectOn && n > 0;
    var inner = '' +
      '<span class="qe-content__select-trigger-trash" aria-hidden="true"></span>' +
      (hasCount ? '<span class="qe-content__select-trigger-n">' + n + '</span>' : '');
    return '' +
      '<button type="button" class="qe-content__select-trigger' +
        (selectOn ? ' is-active' : '') +
        (hasCount ? ' has-count' : '') + '"' +
        ' data-qe-lib-select-mode="' + escapeHtml(group.id) + '"' +
        ' title="' + (selectOn
          ? (hasCount ? 'Acciones de selección' : 'Salir de selección')
          : 'Selección múltiple') + '"' +
        ' aria-label="' + (selectOn
          ? (hasCount ? n + ' seleccionados' : 'Salir de selección')
          : 'Selección múltiple') + '"' +
        ' aria-pressed="' + (selectOn ? 'true' : 'false') + '"' +
        ' aria-haspopup="menu" aria-expanded="false">' +
        inner +
      '</button>';
  }

  function buildLibrarySelectPanelHtml(groupId) {
    var n = librarySelectedCountInGroup(groupId);
    return '' +
      '<p class="qe-lib-select-menu__count">' + n + ' seleccionado' + (n === 1 ? '' : 's') + '</p>' +
      '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
      '<button type="button" class="boxies-workspace-menu__item qe-lib-menu__danger" role="menuitem"' +
        ' data-qe-lib-select-delete="' + escapeHtml(groupId) + '">' +
        '<span class="qe-lib-select-menu__trash" aria-hidden="true"></span>' +
        'Eliminar (' + n + ')' +
      '</button>';
  }

  function openLibrarySelectPopover(btn, groupId) {
    if (!btn || !groupId) return;
    var n = librarySelectedCountInGroup(groupId);
    if (n <= 0) return;
    closeAllLibMenus();
    var portal = ensureLibMenuPortal();
    portal.setAttribute('aria-hidden', 'false');
    var panel = document.createElement('div');
    panel.className = 'boxies-workspace-menu__panel qe-lib-menu-panel qe-lib-select-menu';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('data-qe-lib-menu-panel', '1');
    panel.setAttribute('data-qe-lib-select-panel', '1');
    panel.setAttribute('data-qe-lib-select-group', groupId);
    panel.innerHTML = buildLibrarySelectPanelHtml(groupId);
    portal.appendChild(panel);
    btn.setAttribute('aria-expanded', 'true');
    positionLibMenuPanel(btn, panel);
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    var del = panel.querySelector('[data-qe-lib-select-delete]');
    if (del) {
      del.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeAllLibMenus();
        removeSelectedLibraryResources(groupId);
      });
    }
  }

  function onLibrarySelectTriggerClick(btn) {
    if (!btn) return;
    var groupId = btn.getAttribute('data-qe-lib-select-mode');
    if (!groupId || groupId === 'audio' || groupId === 'models') return;

    var portal = document.getElementById('qeLibMenuPortal');
    var openPanel = portal && portal.querySelector('[data-qe-lib-select-panel]');
    if (openPanel) {
      closeAllLibMenus();
      clearLibrarySelectionMode();
      rerender();
      return;
    }

    if (!isLibrarySelectMode(groupId)) {
      ensureLibrarySelectMode(groupId);
      rerender();
      return;
    }

    var n = librarySelectedCountInGroup(groupId);
    if (n <= 0) {
      clearLibrarySelectionMode();
      rerender();
      return;
    }
    openLibrarySelectPopover(btn, groupId);
  }

  function toggleLibraryItemSelected(id, opts) {
    if (!id) return;
    var key = String(id);
    var item = contentById(id);
    if (!state.librarySelectedIds) state.librarySelectedIds = {};
    if (state.librarySelectedIds[key]) delete state.librarySelectedIds[key];
    else state.librarySelectedIds[key] = true;
    if (!opts || opts.anchor !== false) {
      state.librarySelectAnchorId = key;
    }
    if (item && !isLibrarySelectMode(item.group)) {
      ensureLibrarySelectMode(item.group);
      state.librarySelectedIds[key] = true;
    }
    closeLibrarySelectPopoverOnly();
    rerender();
  }

  function handleLibraryItemSelectClick(id, e) {
    var item = contentById(id);
    if (!item) return false;
    var groupId = item.group;
    var folderId = item.folderId || null;
    var ctrl = !!(e && (e.ctrlKey || e.metaKey));
    var shift = !!(e && e.shiftKey);

    if (shift) {
      ensureLibrarySelectMode(groupId);
      var anchor = state.librarySelectAnchorId;
      var anchorItem = anchor ? contentById(anchor) : null;
      if (!anchorItem ||
          String(anchorItem.group) !== String(groupId) ||
          folderScopeKey(anchorItem.folderId) !== folderScopeKey(folderId)) {
        anchor = id;
      }
      clearLibrarySelectionInGroup(groupId);
      selectLibraryRange(groupId, folderId, anchor, id);
      state.librarySelectAnchorId = String(anchor);
      closeLibrarySelectPopoverOnly();
      rerender();
      return true;
    }

    if (ctrl) {
      ensureLibrarySelectMode(groupId);
      toggleLibraryItemSelected(id);
      return true;
    }

    if (isLibrarySelectMode(groupId)) {
      toggleLibraryItemSelected(id);
      return true;
    }

    return false;
  }

  function contentItemRowHtml(item, nested) {
    var on = item.id === state.selectedContentId;
    var renaming = String(state.renamingContentId || '') === String(item.id);
    var sub = contentTypeLabel(item);
    var canAssign = item.media === 'image' || item.media === 'video' ||
      item.group === 'renders' || item.group === 'videos' || item.group === 'hero';
    var uploading = libraryItemIsUploading(item);
    var pending = libraryItemThumbPending(item);
    var failed = item.uploadStatus === 'failed';
    var selectMode = isLibrarySelectMode(item.group);
    var checked = selectMode && isLibraryItemSelected(item.id);
    /* Never paint blob preview during upload — it flashes then reloads from CDN. */
    var thumbUrl = (!pending && !failed) ? (publicUrlOf(item) || '') : '';
    var nameHtml = renaming
      ? ('<input type="text" class="qe-lib__rename" data-qe-content-rename="' +
          escapeHtml(item.id) + '" value="' + escapeHtml(item.name || '') + '"' +
          ' maxlength="120" autocomplete="off" spellcheck="false">')
      : ('<span class="qe-lib__name">' + escapeHtml(item.name || 'Sin nombre') + '</span>');
    var checkHtml = selectMode
      ? ('<label class="qe-lib__check" data-qe-lib-check-wrap="' + escapeHtml(item.id) + '">' +
          '<input type="checkbox" class="qe-lib__check-input" data-qe-lib-check="' +
            escapeHtml(item.id) + '"' + (checked ? ' checked' : '') +
            ' aria-label="Seleccionar ' + escapeHtml(item.name || 'recurso') + '">' +
          '<span class="qe-lib__check-box" aria-hidden="true"></span>' +
        '</label>')
      : '';
    return '' +
      '<div class="qe-lib__item' + (nested ? ' qe-lib__item--nested' : '') +
        (on && !selectMode ? ' is-selected' : '') +
        (checked ? ' is-checked' : '') +
        (renaming ? ' is-renaming' : '') +
        (pending ? ' is-thumb-loading' : '') + (failed ? ' is-thumb-failed' : '') +
        (selectMode ? ' is-select-mode' : '') + '"' +
        ' role="listitem" tabindex="0"' +
        ' data-qe-content="' + escapeHtml(item.id) + '"' +
        ' data-qe-lib-folder="' + escapeHtml(item.folderId || '') + '"' +
        ' draggable="false"' +
        ' data-qe-drag-lib="' + escapeHtml(item.id) + '"' +
        ' data-qe-lib-group="' + escapeHtml(item.group || '') + '"' +
        (canAssign && !uploading && !failed && !selectMode
          ? ' data-qe-drag-resource="' + escapeHtml(item.id) + '"'
          : '') +
        (pending ? ' aria-busy="true"' : '') + '>' +
        checkHtml +
        '<span class="qe-lib__thumb-wrap' +
          (pending ? ' is-loading' : '') +
          (failed ? ' is-failed' : '') + '">' +
          '<span class="' + thumbClass(item) + '" aria-hidden="true"' +
            (thumbUrl
              ? ' style="background-image:url(\'' + escapeHtml(thumbUrl) + '\');background-size:cover;background-position:center"'
              : '') +
          '></span>' +
          (pending
            ? '<span class="qe-lib__thumb-loader" aria-hidden="true"></span>'
            : '') +
          (failed
            ? '<span class="qe-lib__thumb-failed" title="Error al subir">!</span>'
            : '') +
        '</span>' +
        '<span class="qe-lib__meta">' +
          nameHtml +
          '<span class="qe-lib__type">' +
            escapeHtml(failed ? 'Error' : (uploading ? 'Subiendo…' : sub)) +
          '</span>' +
        '</span>' +
        (selectMode ? '' : libMenuTriggerHtml('content', item.id, 'Opciones del recurso')) +
      '</div>';
  }

  function tourComposerHtml(folderId) {
    var open = state.tourComposer.open &&
      String(state.tourComposer.folderId || '') === String(folderId || '');
    if (!open) return '';
    return '' +
      '<div class="qe-content__composer" data-qe-tour-composer>' +
        '<p class="qe-content__composer-label">URLs Lapentor (una por línea)</p>' +
        '<textarea class="qe-content__textarea" rows="4" data-qe-tour-text' +
          ' placeholder="https://lapentor.com/s/xxxx&#10;https://lapentor.com/s/yyyy"></textarea>' +
        '<div class="qe-content__composer-actions">' +
          '<button type="button" class="qe-content__composer-btn" data-qe-tour-submit>Agregar</button>' +
          '<button type="button" class="qe-content__composer-btn qe-content__composer-btn--muted" data-qe-tour-cancel>Cancelar</button>' +
        '</div>' +
        '<p class="qe-content__composer-hint">También puedes pegar o arrastrar URLs aquí.</p>' +
      '</div>';
  }

  function folderBlockHtml(folder, group) {
    var open = state.openFolders[folder.id] !== false;
    var kids = contentInFolder(folder.id, group && group.id).filter(matchesLibrarySearch);
    var renaming = String(state.renamingFolderId || '') === String(folder.id);
    var addControls = '';
    if (group.linkMode) {
      addControls = '' +
        '<button type="button" class="qe-content__add qe-content__add--quiet" data-qe-tour-add' +
          ' data-qe-folder="' + escapeHtml(folder.id) + '">+ Agregar enlace</button>' +
        tourComposerHtml(folder.id);
    } else {
      addControls = '' +
        '<button type="button" class="qe-content__add qe-content__add--quiet" data-qe-file-add="' +
          escapeHtml(group.id) + '" data-qe-folder="' + escapeHtml(folder.id) + '">' +
          escapeHtml(group.addLabel || '+ Agregar') + '</button>';
    }
    var searching = !!String(state.librarySearchQuery || '').trim();
    if (searching && !kids.length) return '';

    var nameHtml = renaming
      ? ('<input type="text" class="qe-folder__rename" data-qe-folder-rename="' +
          escapeHtml(folder.id) + '" value="' + escapeHtml(folder.name || '') + '"' +
          ' maxlength="80" autocomplete="off" spellcheck="false">')
      : ('<span class="qe-folder__name">' + escapeHtml(folder.name) + '</span>');

    return '' +
      '<div class="qe-folder' + (open ? ' is-open' : '') + '" data-qe-folder-block="' +
        escapeHtml(folder.id) + '"' +
        ' data-qe-lib-drop-folder="' + escapeHtml(folder.id) + '"' +
        ' data-qe-lib-drop-group="' + escapeHtml(group.id) + '">' +
        '<div class="qe-folder__head"' +
          ' data-qe-folder-drag="' + escapeHtml(folder.id) + '"' +
          ' draggable="' + (renaming ? 'false' : 'true') + '"' +
          ' title="Arrastrar para reordenar">' +
          '<div class="qe-folder__toggle" role="button" tabindex="0" data-qe-folder-toggle="' +
            escapeHtml(folder.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<span class="qe-folder__chevron" aria-hidden="true"></span>' +
            '<span class="qe-folder__icon" aria-hidden="true"></span>' +
            (renaming ? '' : nameHtml) +
          '</div>' +
          (renaming ? nameHtml : '') +
          '<span class="qe-content__count">' + kids.length + '</span>' +
          libMenuTriggerHtml('folder', folder.id, 'Opciones de carpeta') +
        '</div>' +
        '<div class="qe-folder__body">' +
              librarySelectAllRowHtml(group.id, folder.id) +
              (kids.length
                ? ('<div class="qe-content__items">' +
                    kids.map(function (item) { return contentItemRowHtml(item, true); }).join('') +
                  '</div>')
                : '') +
              '<div class="qe-content__actions">' + addControls + '</div>' +
            '</div>' +
      '</div>';
  }

  function folderComposerHtml(groupId) {
    if (state.folderComposerGroup !== groupId) return '';
    return '' +
      '<div class="qe-content__composer" data-qe-folder-composer>' +
        '<p class="qe-content__composer-label">Nombre de la carpeta</p>' +
        '<input type="text" class="qe-content__folder-input" data-qe-folder-name' +
          ' maxlength="80" placeholder="Ej. Interiores" autocomplete="off">' +
        '<div class="qe-content__composer-actions">' +
          '<button type="button" class="qe-content__composer-btn" data-qe-folder-submit>Crear</button>' +
          '<button type="button" class="qe-content__composer-btn qe-content__composer-btn--muted" data-qe-folder-cancel>Cancelar</button>' +
        '</div>' +
      '</div>';
  }

  function groupBodyHtml(group) {
    if (group.prepared) {
      return '' +
        '<div class="qe-content__body">' +
          '<p class="qe-content__prepared">Preparado para próximas versiones.</p>' +
        '</div>';
    }

    var rootItems = rootContentInGroup(group.id).filter(matchesLibrarySearch);
    var folders = foldersInGroup(group.id);
    var searching = !!String(state.librarySearchQuery || '').trim();
    var actions;

    /* Order: +Agregar → +Nueva carpeta → carpetas → imágenes sueltas. */
    if (group.linkMode) {
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-tour-add data-qe-folder="">+ Agregar enlace</button>' +
        tourComposerHtml(null) +
        '<button type="button" class="qe-content__add" data-qe-folder-new="' +
          escapeHtml(group.id) + '">+ Nueva carpeta</button>' +
        folderComposerHtml(group.id);
    } else {
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-file-add="' +
          escapeHtml(group.id) + '" data-qe-folder="">' +
          escapeHtml(group.addLabel || '+ Agregar') + '</button>' +
        '<input type="file" accept="' + escapeHtml(group.accept || 'image/*') + '" hidden' +
          ' data-qe-file-input="' + escapeHtml(group.id) + '" multiple>' +
        '<button type="button" class="qe-content__add" data-qe-folder-new="' +
          escapeHtml(group.id) + '">+ Nueva carpeta</button>' +
        folderComposerHtml(group.id);
    }

    var foldersHtml = folders.length
      ? ('<div class="qe-content__folders" data-qe-folder-list="' + escapeHtml(group.id) + '">' +
          folders.map(function (f) { return folderBlockHtml(f, group); }).join('') +
        '</div>')
      : '';

    var rootHtml = '' +
      librarySelectAllRowHtml(group.id, null) +
      (rootItems.length
        ? ('<div class="qe-content__items qe-content__items--root">' +
            rootItems.map(function (item) { return contentItemRowHtml(item, false); }).join('') +
          '</div>')
        : '');

    return '' +
      '<div class="qe-content__body"' +
        ' data-qe-lib-drop-root' +
        ' data-qe-lib-drop-group="' + escapeHtml(group.id) + '">' +
        (searching ? '' : ('<div class="qe-content__actions qe-content__actions--top">' + actions + '</div>')) +
        foldersHtml +
        rootHtml +
      '</div>';
  }

  function libraryChromeHtml() {
    var collapsed = !!state.libraryGroupsCollapsed;
    var view = state.libraryView === 'grid' ? 'grid' : 'list';
    var statusOpen = !!state.libraryStatusOpen;
    var availableOn = !!state.libraryAvailableOnly;
    var q = String(state.librarySearchQuery || '');
    return '' +
      '<div class="qe-lib-chrome">' +
        '<div class="qe-lib-chrome__head">' +
          '<h2 class="qe-lib-chrome__title">Biblioteca</h2>' +
          '<p class="qe-lib-chrome__sub">recursos del showroom</p>' +
        '</div>' +
        '<button type="button" class="qe-lib-chrome__fold-all" data-qe-toggle-all-groups' +
          ' title="' + (collapsed ? 'Desplegar todos los grupos' : 'Contraer todos los grupos') + '"' +
          ' aria-label="' + (collapsed ? 'Desplegar todos los grupos' : 'Contraer todos los grupos') + '"' +
          ' data-collapsed="' + (collapsed ? '1' : '0') + '">' +
          libraryIcon('fold') +
        '</button>' +
        '<div class="qe-lib-toolbar">' +
          '<div class="qe-lib-toolbar__row">' +
            '<label class="qe-lib-search">' +
              '<span class="qe-lib-search__icon" aria-hidden="true">' + libraryIcon('search') + '</span>' +
              '<input type="search" class="qe-lib-search__input" data-qe-lib-search' +
                ' placeholder="Buscar por nombre..." autocomplete="off" spellcheck="false"' +
                ' value="' + escapeHtml(q) + '">' +
            '</label>' +
            '<button type="button" class="qe-lib-toolbtn' + (statusOpen ? ' is-active' : '') + '"' +
              ' data-qe-lib-status title="Estado del proyecto"' +
              ' aria-label="Estado del proyecto" aria-haspopup="dialog"' +
              ' aria-expanded="' + (statusOpen ? 'true' : 'false') + '"' +
              ' aria-pressed="' + (statusOpen ? 'true' : 'false') + '">' +
              libraryIcon('chart') +
            '</button>' +
          '</div>' +
          '<div class="qe-lib-toolbar__row">' +
            '<button type="button" class="qe-lib-available' + (availableOn ? ' is-on' : '') + '"' +
              ' data-qe-lib-available aria-pressed="' + (availableOn ? 'true' : 'false') + '"' +
              ' title="Mostrar solo grupos con recursos">' +
              '<span class="qe-lib-available__label">Activas</span>' +
              '<span class="qe-lib-available__switch" aria-hidden="true">' +
                '<span class="qe-lib-available__knob"></span>' +
              '</span>' +
            '</button>' +
            '<div class="qe-lib-view" role="group" aria-label="Vista de biblioteca">' +
              '<button type="button" class="qe-lib-view__btn' + (view === 'grid' ? ' is-active' : '') + '"' +
                ' data-qe-lib-view="grid" title="Vista miniaturas" aria-pressed="' +
                (view === 'grid' ? 'true' : 'false') + '">' + libraryIcon('grid') + '</button>' +
              '<button type="button" class="qe-lib-view__btn' + (view === 'list' ? ' is-active' : '') + '"' +
                ' data-qe-lib-view="list" title="Vista lista" aria-pressed="' +
                (view === 'list' ? 'true' : 'false') + '">' + libraryIcon('list') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function contentColumnHtml() {
    if (state.focusMode || state.canvasPreviewMode) return '';
    var external = !!document.getElementById('quotationLeftBody');
    if (!external && state.libraryCollapsed) return '';

    ensureFolderOrders();
    var view = state.libraryView === 'grid' ? 'grid' : 'list';
    var groups = CONTENT_GROUPS.map(function (group) {
      if (!groupVisibleInLibrary(group)) return '';
      var open = state.openGroups[group.id] !== false;
      var count = contentInGroup(group.id).length;
      var selectOn = isLibrarySelectMode(group.id);
      var canSelect = !group.prepared && count > 0;
      return '' +
        '<section class="qe-content__group' + (open ? ' is-open' : '') +
          (selectOn ? ' is-selecting' : '') + '"' +
          ' data-qe-group="' + escapeHtml(group.id) + '"' +
          (group.linkMode ? ' data-qe-tour-dropzone' : '') + '>' +
          '<div class="qe-content__group-head">' +
            '<button type="button" class="qe-content__toggle" data-qe-toggle="' +
              escapeHtml(group.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
              '<span class="qe-content__chevron" aria-hidden="true"></span>' +
              '<span class="qe-content__group-label">' + escapeHtml(group.label) + '</span>' +
              '<span class="qe-content__count">' + (group.prepared ? '—' : count) + '</span>' +
            '</button>' +
            libraryGroupFoldersFoldHtml(group) +
            (canSelect || selectOn ? librarySelectTriggerHtml(group) : '') +
          '</div>' +
          groupBodyHtml(group) +
        '</section>';
    }).join('');

    return '' +
      '<aside class="qe-col qe-col--library" aria-label="Biblioteca">' +
        libraryChromeHtml() +
        '<div class="qe-content__list is-view-' + view + '" data-qe-content-list data-qe-lib-view-mode="' +
          view + '">' + groups + '</div>' +
      '</aside>';
  }

  function mediaPreviewHtml(content) {
    if (!content) {
      return '<div class="qe-canvas__empty">Selecciona un recurso o crea una escena.</div>';
    }

    if (content.group === 'pdf' || content.media === 'pdf') {
      return '' +
        '<div class="qe-canvas__mock qe-canvas__mock--image">' +
          '<div class="qe-canvas__mock-title">' + escapeHtml(content.name || 'PDF') + '</div>' +
          '<div class="qe-canvas__mock-sub">Documento PDF</div>' +
        '</div>';
    }

    if (content.group === 'tours360') {
      var url = content.remoteUrl || '';
      if (url && isLapentorUrl(url)) {
        return '' +
          '<div class="qe-canvas__embed">' +
            '<iframe class="qe-canvas__iframe" src="' + escapeHtml(url) + '"' +
              ' title="' + escapeHtml(content.name || 'Tour 360') + '"' +
              ' allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"' +
              ' allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '</div>';
      }
      return '' +
        '<div class="qe-canvas__mock qe-canvas__mock--pano">' +
          '<div class="qe-canvas__mock-title">' + escapeHtml(content.name || 'Tour') + '</div>' +
          '<div class="qe-canvas__mock-sub">Solo se admiten enlaces de Lapentor</div>' +
        '</div>';
    }

    if (content.media === 'video' || content.group === 'videos' ||
        (content.group === 'hero' && content.media === 'video')) {
      if (content.previewUrl) {
        return '' +
          '<div class="qe-canvas__media">' +
            '<video class="qe-canvas__video" src="' + escapeHtml(content.previewUrl) + '"' +
              ' controls playsinline></video>' +
          '</div>';
      }
      return '' +
        '<div class="qe-canvas__mock qe-canvas__mock--video">' +
          '<div class="qe-canvas__play" aria-hidden="true"></div>' +
          '<div class="qe-canvas__mock-title">' + escapeHtml(content.name || '') + '</div>' +
          '<div class="qe-canvas__mock-sub">Video</div>' +
        '</div>';
    }

    if (content.previewUrl) {
      return '' +
        '<div class="qe-canvas__media">' +
          '<img class="qe-canvas__img" src="' + escapeHtml(content.previewUrl) + '"' +
            ' alt="' + escapeHtml(content.name || '') + '">' +
        '</div>';
    }

    if (content.group === 'hero') {
      return '' +
        '<div class="qe-canvas__mock qe-canvas__mock--hero">' +
          '<div class="qe-canvas__mock-brand">QUOTATION</div>' +
          '<div class="qe-canvas__mock-title">' + escapeHtml(content.name || 'Hero') + '</div>' +
          '<div class="qe-canvas__mock-sub">Encabezado de la experiencia</div>' +
        '</div>';
    }

    return '' +
      '<div class="qe-canvas__mock qe-canvas__mock--image">' +
        '<div class="qe-canvas__mock-title">' + escapeHtml(content.name || '') + '</div>' +
        '<div class="qe-canvas__mock-sub">' + escapeHtml(groupLabel(content.group)) + '</div>' +
      '</div>';
  }

  function sceneResource(scene) {
    if (!scene || !scene.resourceId) return null;
    return contentById(scene.resourceId);
  }

  function sceneHasResource(scene) {
    var res = sceneResource(scene);
    if (res && publicUrlOf(res)) return true;
    if (scene && scene.mediaUrl && String(scene.mediaUrl).indexOf('blob:') !== 0) return true;
    if (scene && scene.publicUrl && String(scene.publicUrl).indexOf('blob:') !== 0) return true;
    if (scene && scene.coverModel) {
      var cm = scene.coverModel;
      if (cm.videoUrl && String(cm.videoUrl).indexOf('blob:') !== 0) return true;
      if (cm.imageUrl && String(cm.imageUrl).indexOf('blob:') !== 0) return true;
    }
    return !!(res && (res.previewUrl || res.remoteUrl || res.publicUrl));
  }

  function sceneUsesProjectCover(scene) {
    if (!scene) return false;
    if (!sceneHasResource(scene)) return false;
    return !!(scene.templateId === 'hero-default' || scene.type === 'hero' || scene.coverModel);
  }

  function emptyScenePlaceholderHtml() {
    return '' +
      '<div class="qe-scene-empty" data-qe-scene-empty data-qe-drop-scene>' +
        '<p class="qe-scene-empty__line">Agregar o arrastra un archivo</p>' +
      '</div>';
  }

  function sceneDisplayUrl(scene) {
    if (!scene) return '';
    var res = sceneResource(scene);
    if (res) {
      var fromRes = displayUrlOf(res);
      if (fromRes) return fromRes;
    }
    if (scene.mediaUrl) return String(scene.mediaUrl);
    if (scene.publicUrl) return String(scene.publicUrl);
    return '';
  }

  function sceneMediaStageHtml(scene) {
    var res = sceneResource(scene);
    var url = sceneDisplayUrl(scene);
    if (!url) return emptyScenePlaceholderHtml();
    var isVideo = (res && (res.media === 'video' || res.group === 'videos')) ||
      (scene && scene.mediaType === 'video');
    /* V7.2.59 — same HeroRenderer markup/CSS as Runtime (cover only). */
    if (isVideo) {
      return '' +
        '<div class="qe-scene-media hero-renderer" data-qe-drop-scene data-hero-renderer="1">' +
          '<video class="hero-renderer__media qe-scene-media__video" src="' + escapeHtml(url) + '"' +
            ' muted loop playsinline autoplay></video>' +
        '</div>';
    }
    return '' +
      '<div class="qe-scene-media hero-renderer" data-qe-drop-scene data-hero-renderer="1">' +
        '<img class="hero-renderer__media qe-scene-media__img" src="' + escapeHtml(url) + '" alt="">' +
      '</div>';
  }

  function libraryMediaItems() {
    return state.content.filter(function (c) {
      if (!c) return false;
      if (c.group === 'renders' || c.group === 'videos' || c.group === 'hero') return true;
      return c.media === 'image' || c.media === 'video';
    });
  }

  function shapePickerThumbSvg(kind) {
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buildSceneShapeSvg) {
      return ExperienciaEngine.buildSceneShapeSvg(kind, {
        fill: 'rgba(255,255,255,0.16)',
        stroke: 'rgba(255,255,255,0.62)',
        strokeWidth: 2,
        borderRadius: 16,
        preserveAspect: 'meet'
      });
    }
    return '';
  }

  var SHAPE_PICKER_ITEMS = [
    { kind: 'SHAPE_RECT', label: 'Rectángulo' },
    { kind: 'SHAPE_CIRCLE', label: 'Círculo' },
    { kind: 'SHAPE_LINE', label: 'Línea' },
    { kind: 'SHAPE_TRIANGLE', label: 'Triángulo' },
    { kind: 'SHAPE_ARROW', label: 'Flecha' },
    { kind: 'SHAPE_DONUT', label: 'Donut' },
    { kind: 'SHAPE_CAPSULE', label: 'Cápsula' },
    { kind: 'SHAPE_ROUND_RECT', label: 'Cuadrado redondeado' }
  ];

  function shapePickerHtml() {
    if (!state.shapePickerOpen) return '';
    var grid = SHAPE_PICKER_ITEMS.map(function (item) {
      return '' +
        '<button type="button" class="qe-shape-picker__item" data-qe-pick-shape="' +
          escapeHtml(item.kind) + '" aria-label="' + escapeHtml(item.label) + '">' +
          shapePickerThumbSvg(item.kind) +
        '</button>';
    }).join('');
    return '' +
      '<div class="qe-shape-picker" data-qe-shape-picker role="dialog" aria-label="Formas">' +
        '<div class="qe-shape-picker__backdrop" data-qe-close-shape-picker tabindex="-1"></div>' +
        '<div class="qe-shape-picker__panel">' +
          '<div class="qe-shape-picker__grid">' + grid + '</div>' +
        '</div>' +
      '</div>';
  }

  function resourcePickerHtml() {
    if (!state.resourcePickerOpen) return '';
    var items = libraryMediaItems();
    var list;
    if (!items.length) {
      list = '<p class="qe-picker__empty">No hay imágenes ni videos en la biblioteca. Súbelos desde Recursos.</p>';
    } else {
      list = '<div class="qe-picker__grid">' + items.map(function (item) {
        return '' +
          '<button type="button" class="qe-picker__card" data-qe-pick-resource="' +
            escapeHtml(item.id) + '">' +
            '<span class="qe-picker__thumb"' +
              (item.previewUrl
                ? ' style="background-image:url(\'' + escapeHtml(item.previewUrl) + '\')"'
                : '') +
            '></span>' +
            '<span class="qe-picker__name">' + escapeHtml(item.name || 'Archivo') + '</span>' +
            '<span class="qe-picker__type">' +
              escapeHtml(item.media === 'video' || item.group === 'videos' ? 'Video' : 'Imagen') +
            '</span>' +
          '</button>';
      }).join('') + '</div>';
    }
    return '' +
      '<div class="qe-picker" data-qe-resource-picker role="dialog" aria-label="Seleccionar recurso">' +
        '<div class="qe-picker__panel">' +
          '<div class="qe-picker__head">' +
            '<h3 class="qe-picker__title">Seleccionar archivo</h3>' +
            '<button type="button" class="qe-picker__close" data-qe-close-resource-picker aria-label="Cerrar">×</button>' +
          '</div>' +
          '<p class="qe-picker__hint">Solo archivos ya subidos a Imágenes o Videos.</p>' +
          list +
        '</div>' +
      '</div>';
  }

  function sceneCompositionHtml(scene) {
    if (!scene || !scene.elements || !scene.elements.length) return '';
    return '' +
      '<div class="qe-scene-comp" data-qe-scene-comp data-element-types="' +
        escapeHtml(ELEMENT_TYPES.map(function (t) { return t.id; }).join(',')) + '">' +
        '<div class="qe-canvas__empty">Escena sin composición.</div>' +
      '</div>';
  }

  function stageBodyHtml(scene) {
    if (!scene || !sceneHasResource(scene)) return emptyScenePlaceholderHtml();
    if (sceneUsesProjectCover(scene)) {
      /* V7.2.38 — without Runtime iframe, paint Editor-owned media stage. */
      if (isEditorRuntimeDisabled()) return sceneMediaStageHtml(scene);
      return '<div class="qe-scene-runtime-wrap" data-qe-drop-scene></div>';
    }
    var hasElements = scene && scene.elements && scene.elements.length;
    if (hasElements) {
      return sceneCompositionHtml(scene);
    }
    return sceneMediaStageHtml(scene);
  }

  /** Hero: Runtime iframe sized to active viewport (Model B — no canvas lock). */
  function heroRuntimeStageHtml() {
    if (isEditorRuntimeDisabled()) {
      return emptyScenePlaceholderHtml();
    }
    var projectId = String((editorProjectCtx && editorProjectCtx.id) || '').trim();
    var size = activeViewportSize();
    var src = '';
    var opts = {
      preview: true,
      editor: true
    };
    if (typeof QuotationRuntime !== 'undefined' && QuotationRuntime.href) {
      src = QuotationRuntime.href(projectId, opts) || '';
    } else {
      try {
        var url = new URL('/quotation/', window.location.origin);
        if (projectId) url.searchParams.set('projectId', projectId);
        url.searchParams.set('experience_type', 'quotation');
        url.searchParams.set('preview', '1');
        url.searchParams.set('editor', '1');
        src = url.href;
      } catch (e) {
        src = '/quotation/?experience_type=quotation&preview=1&editor=1' +
          (projectId ? '&projectId=' + encodeURIComponent(projectId) : '');
      }
    }
    return '' +
      '<div class="qe-canvas__runtime-host" data-qe-runtime-host>' +
        '<iframe class="qe-canvas__runtime-iframe" data-qe-runtime-iframe' +
          ' title="Hero Runtime Canvas"' +
          ' width="' + size.width + '" height="' + size.height + '"' +
          ' src="' + String(src).replace(/"/g, '&quot;') + '"' +
          ' allow="fullscreen"></iframe>' +
      '</div>';
  }

  function isOverlayGroupIx(ix) {
    var t = String((ix && ix.type) || '').toUpperCase();
    return t === 'OVERLAY_GROUP' || t === 'GROUP';
  }

  function elementDisplayName(ix) {
    if (!ix) return 'Elemento';
    if (ix.label != null && String(ix.label).trim()) return String(ix.label).trim();
    return layerTypeLabel(ix.type);
  }

  function layerTypeIconHtml(type) {
    var t = String(type || '').toUpperCase();
    if (t === 'OVERLAY_GROUP' || t === 'GROUP') {
      return '<span class="qe-outliner__ico qe-outliner__ico--group" aria-hidden="true"></span>';
    }
    if (t === 'TEXT') {
      return '<span class="qe-outliner__ico qe-outliner__ico--text" aria-hidden="true">T</span>';
    }
    if (t === 'BUTTON') {
      return '<span class="qe-outliner__ico qe-outliner__ico--btn" aria-hidden="true"></span>';
    }
    if (t.indexOf('SHAPE_') === 0 || t === 'SHAPE') {
      return '<span class="qe-outliner__ico qe-outliner__ico--shape" aria-hidden="true"></span>';
    }
    if (t === 'HOTSPOT') {
      return '<span class="qe-outliner__ico qe-outliner__ico--hotspot" aria-hidden="true"></span>';
    }
    return '<span class="qe-outliner__ico qe-outliner__ico--generic" aria-hidden="true"></span>';
  }

  function overlayPanelLayerSize() {
    var stage = rootEl && rootEl.querySelector('[data-qe-canvas]');
    if (!stage) return { w: 1000, h: 1000 };
    return {
      w: Math.max(1, stage.clientWidth || 1000),
      h: Math.max(1, stage.clientHeight || 1000)
    };
  }

  function syncOverlaySceneFromPanel(engineFn) {
    markDirtyLocal();
    if (expOverlay && expOverlay.syncFromScenes) expOverlay.syncFromScenes();
    if (engineFn && expOverlay && expOverlay.shim && typeof ExperienciaEngine !== 'undefined') {
      var sceneId = state.backpackMode ? BACKPACK_SCENE_ID : state.activeSceneId;
      var nodeId = 'qe-' + sceneId;
      var n = ExperienciaEngine.getNode(expOverlay.shim, nodeId);
      if (n) engineFn(n, nodeId);
    }
    if (expOverlay && expOverlay.pull) expOverlay.pull();
    if (expOverlay && expOverlay.refresh) expOverlay.refresh();
    refreshLayersPanel();
  }

  /** Same panel refresh as context menu Agrupar (after canvas group mutation). */
  function afterOverlayGroupPanelRefresh() {
    markDirtyLocal();
    refreshLayersPanel();
  }

  function createEmptyOverlayGroup() {
    if (!expOverlay || !expOverlay.createEmptyOverlayGroup) return null;
    var groupId = expOverlay.createEmptyOverlayGroup();
    if (!groupId) return null;
    afterOverlayGroupPanelRefresh();
    return groupId;
  }

  /** Push scene SSOT to shim without canvas refresh (avoids pull wiping new groups). */
  function pushOutlinerScenesToShim() {
    if (!expOverlay || !expOverlay.shim) return;
    if (typeof QuotationExperienciaBridge === 'undefined' ||
        !QuotationExperienciaBridge.pushScenesToShim) return;
    var scenes = state.backpackMode ? [getBackpackSceneRef()] : state.scenes;
    QuotationExperienciaBridge.pushScenesToShim(expOverlay.shim, scenes);
  }

  function dissolveOverlayGroupById(groupId) {
    if (!groupId) return false;
    var sz = overlayPanelLayerSize();
    syncOverlaySceneFromPanel(function (n, nodeId) {
      if (ExperienciaEngine.ungroupSceneOverlay) {
        ExperienciaEngine.ungroupSceneOverlay(expOverlay.shim, nodeId, groupId, sz.w, sz.h);
      }
    });
    return true;
  }

  /** Enter inline rename for an outliner row (double-click + context menu share this). */
  function startOutlinerLabelEdit(id) {
    if (!id || !findSceneInteraction(id)) return false;
    state.editingElementLabelId = String(id);
    refreshLayersPanel();
    return true;
  }

  function renameSceneInteractionLabel(id, nextLabel) {
    if (!id) return false;
    var trimmed = String(nextLabel || '').trim();
    var ixLocal = findSceneInteraction(id);
    if (!ixLocal) return false;
    var finalLabel = trimmed || layerTypeLabel(ixLocal.type);

    ixLocal.label = finalLabel;
    markDirtyLocal();

    if (expOverlay && expOverlay.shim && typeof ExperienciaEngine !== 'undefined') {
      var sceneId = state.backpackMode ? BACKPACK_SCENE_ID : state.activeSceneId;
      var nodeId = (typeof QuotationExperienciaBridge !== 'undefined' &&
        QuotationExperienciaBridge.nodeIdForScene)
        ? QuotationExperienciaBridge.nodeIdForScene(sceneId)
        : ('qe-' + sceneId);
      var n = ExperienciaEngine.getNode(expOverlay.shim, nodeId);
      if (n) {
        var ixShim = ExperienciaEngine.getInteraction(n, id);
        if (ixShim) ixShim.label = finalLabel;
      }
      if (expOverlay.pull) expOverlay.pull();
      if (expOverlay.refresh) expOverlay.refresh();
    } else {
      pushOutlinerScenesToShim();
    }

    refreshLayersPanel();
    return true;
  }

  function deleteOverlayGroupFromPanel(groupId) {
    if (!groupId || !isOverlayGroupIx(findSceneInteraction(groupId))) return false;
    if (!dissolveOverlayGroupById(groupId)) return false;
    state.selectedOverlayIds = (state.selectedOverlayIds || []).filter(function (sid) {
      return String(sid) !== String(groupId);
    });
    if (state.expHasSelection && !(state.selectedOverlayIds || []).length) {
      state.expHasSelection = false;
    }
    if (expOverlay && expOverlay.clearSelection) expOverlay.clearSelection();
    markDirtyLocal();
    refreshDockOnly();
    return true;
  }

  function openOutlinerGroupContextMenu(groupId, clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var ix = findSceneInteraction(groupId);
    if (!ix || !isOverlayGroupIx(ix)) return;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: elementDisplayName(ix),
      items: [
        { id: 'rename', label: 'Cambiar nombre' },
        {
          id: 'delete',
          label: 'Eliminar grupo',
          danger: true,
          separatorBefore: true
        }
      ],
      onSelect: function (id) {
        if (id === 'rename') {
          startOutlinerLabelEdit(groupId);
          return;
        }
        if (id === 'delete') {
          deleteOverlayGroupFromPanel(groupId);
        }
      }
    });
  }

  /** Panel Elementos → canvas selection (single source for row click). */
  function selectOutlinerItemFromPanel(id) {
    if (!id) return false;
    if (expOverlay && expOverlay.syncFromScenes) {
      expOverlay.syncFromScenes();
    }
    if (!expOverlay || !expOverlay.selectOverlayItem) return false;
    var ok = expOverlay.selectOverlayItem(id);
    if (ok) {
      state.expHasSelection = true;
      refreshLayersPanel();
      refreshDockOnly();
    }
    return ok;
  }

  function toggleOutlinerItemFromPanel(id) {
    if (!id) return false;
    if (expOverlay && expOverlay.syncFromScenes) {
      expOverlay.syncFromScenes();
    }
    if (!expOverlay || !expOverlay.toggleOverlayItemSelection) return false;
    var ok = expOverlay.toggleOverlayItemSelection(id);
    if (ok) {
      state.expHasSelection = true;
      refreshLayersPanel();
      refreshDockOnly();
    }
    return ok;
  }

  function assignInteractionToGroup(memberId, groupId, beforeMemberId) {
    if (!memberId || !groupId || String(memberId) === String(groupId)) return false;
    var scene = activeScene();
    var member = findSceneInteraction(memberId);
    var group = findSceneInteraction(groupId);
    if (!scene || !member || !group || !isOverlayGroupIx(group) || isOverlayGroupIx(member)) {
      return false;
    }
    var sz = overlayPanelLayerSize();
    var lw = sz.w;
    var lh = sz.h;
    (scene.interactions || []).forEach(function (ix) {
      if (!isOverlayGroupIx(ix) || !Array.isArray(ix.memberIds)) return;
      ix.memberIds = ix.memberIds.filter(function (id) {
        return String(id) !== String(memberId);
      });
    });
    delete member.groupId;
    delete member.localX;
    delete member.localY;
    delete member.localRotation;
    if (!Array.isArray(group.memberIds)) group.memberIds = [];
    if (beforeMemberId) {
      var idx = group.memberIds.map(String).indexOf(String(beforeMemberId));
      if (idx >= 0) group.memberIds.splice(idx, 0, String(memberId));
      else group.memberIds.push(String(memberId));
    } else {
      group.memberIds.push(String(memberId));
    }
    syncOverlaySceneFromPanel(function (n) {
      var g = ExperienciaEngine.getInteraction(n, groupId);
      var m = ExperienciaEngine.getInteraction(n, memberId);
      if (!g || !m) return;
      ExperienciaEngine.ensureOverlayGroupDefaults(n, g, lw, lh);
      ExperienciaEngine.migrateGroupedChildLocals(n, g, lw, lh);
      var local = ExperienciaEngine.absoluteToLocalOverlay(n, g, m, lw, lh);
      if (local) {
        m.groupId = groupId;
        m.localX = local.localX;
        m.localY = local.localY;
        m.localRotation = local.localRotation;
      }
      ExperienciaEngine.syncOverlayGroupFrameFromMembers(n, g, lw, lh);
    });
    return true;
  }

  function removeInteractionFromGroup(memberId) {
    var member = findSceneInteraction(memberId);
    if (!member || !member.groupId) return false;
    var sz = overlayPanelLayerSize();
    var lw = sz.w;
    var lh = sz.h;
    syncOverlaySceneFromPanel(function (n) {
      var m = ExperienciaEngine.getInteraction(n, memberId);
      if (!m || !m.groupId) return;
      var g = ExperienciaEngine.getInteraction(n, m.groupId);
      if (g) {
        ExperienciaEngine.ensureOverlayGroupDefaults(n, g, lw, lh);
        ExperienciaEngine.migrateGroupedChildLocals(n, g, lw, lh);
        var world = ExperienciaEngine.overlayWorldLayoutRaw(n, m, lw, lh);
        if (world) {
          m.x = world.x;
          m.y = world.y;
          m.rotation = world.rotation;
          if (world.width != null) m.width = world.width;
          if (world.height != null) m.height = world.height;
          if (world.boxW != null) m.boxW = world.boxW;
          if (world.boxH != null) m.boxH = world.boxH;
        }
        g.memberIds = (g.memberIds || []).filter(function (id) {
          return String(id) !== String(memberId);
        });
      }
      delete m.groupId;
      delete m.localX;
      delete m.localY;
      delete m.localRotation;
    });
    return true;
  }

  function reorderInteractionsInList(list, dragId, targetId, position, filterFn) {
    if (!list || !dragId || !targetId || String(dragId) === String(targetId)) return false;
    var dragIdx = -1;
    var targetIdx = -1;
    var i;
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(dragId) && filterFn(list[i])) dragIdx = i;
      if (String(list[i].id) === String(targetId) && filterFn(list[i])) targetIdx = i;
    }
    if (dragIdx < 0 || targetIdx < 0) return false;
    var moved = list.splice(dragIdx, 1)[0];
    var insertAt = targetIdx;
    if (dragIdx < targetIdx) insertAt--;
    if (position === 'after') insertAt++;
    list.splice(insertAt, 0, moved);
    return true;
  }

  function reorderOverlayGroups(dragId, targetId, position) {
    var scene = activeScene();
    if (!scene || !Array.isArray(scene.interactions)) return false;
    var ok = reorderInteractionsInList(scene.interactions, dragId, targetId, position, isOverlayGroupIx);
    if (ok) syncOverlaySceneFromPanel();
    return ok;
  }

  function reorderOverlayFreeItems(dragId, targetId, position) {
    var scene = activeScene();
    if (!scene || !Array.isArray(scene.interactions)) return false;
    var ok = reorderInteractionsInList(scene.interactions, dragId, targetId, position, function (ix) {
      return ix && !isOverlayGroupIx(ix) && !ix.groupId;
    });
    if (ok) syncOverlaySceneFromPanel();
    return ok;
  }

  function reorderGroupMembers(groupId, dragId, targetId, position) {
    var group = findSceneInteraction(groupId);
    if (!group || !Array.isArray(group.memberIds)) return false;
    var ids = group.memberIds.slice();
    var from = -1;
    var to = -1;
    var i;
    for (i = 0; i < ids.length; i++) {
      if (String(ids[i]) === String(dragId)) from = i;
      if (String(ids[i]) === String(targetId)) to = i;
    }
    if (from < 0 || to < 0) return false;
    var moved = ids.splice(from, 1)[0];
    var insertAt = to;
    if (from < to) insertAt--;
    if (position === 'after') insertAt++;
    ids.splice(insertAt, 0, moved);
    group.memberIds = ids;
    syncOverlaySceneFromPanel();
    return true;
  }

  function assignInteractionToGroupAt(memberId, groupId, targetMemberId, position) {
    var beforeId = null;
    if (position === 'before') {
      beforeId = targetMemberId;
    } else {
      var g = findSceneInteraction(groupId);
      var ids = (g && g.memberIds) || [];
      var idx = -1;
      var i;
      for (i = 0; i < ids.length; i++) {
        if (String(ids[i]) === String(targetMemberId)) { idx = i; break; }
      }
      if (idx >= 0 && idx < ids.length - 1) beforeId = ids[idx + 1];
    }
    return assignInteractionToGroup(memberId, groupId, beforeId);
  }

  function commitOutlinerDrop(dragId, drop) {
    if (!dragId || !drop || !drop.id) return false;
    if (String(dragId) === String(drop.id) && drop.action !== 'into') return false;

    var dragIx = findSceneInteraction(dragId);
    if (!dragIx) return false;
    var dragIsGroup = isOverlayGroupIx(dragIx);
    var dragGrouped = !!dragIx.groupId;

    if (drop.action === 'into') {
      if (dragIsGroup) return false;
      assignInteractionToGroup(dragId, drop.id, null);
      return true;
    }

    var targetIx = findSceneInteraction(drop.id);
    if (!targetIx) return false;
    var targetIsGroup = isOverlayGroupIx(targetIx);
    var targetGrouped = !!targetIx.groupId;

    if (dragIsGroup && targetIsGroup) {
      return reorderOverlayGroups(dragId, drop.id, drop.position);
    }

    if (!dragIsGroup && !dragGrouped && !targetIsGroup && !targetGrouped) {
      return reorderOverlayFreeItems(dragId, drop.id, drop.position);
    }

    if (!dragIsGroup && !dragGrouped && targetGrouped) {
      return assignInteractionToGroupAt(dragId, targetIx.groupId, drop.id, drop.position);
    }

    if (!dragIsGroup && dragGrouped) {
      if (!targetIsGroup && !targetGrouped) {
        removeInteractionFromGroup(dragId);
        return reorderOverlayFreeItems(dragId, drop.id, drop.position);
      }
      if (targetGrouped && String(dragIx.groupId) === String(targetIx.groupId)) {
        return reorderGroupMembers(dragIx.groupId, dragId, drop.id, drop.position);
      }
      if (targetIsGroup) {
        if (drop.position === 'before') {
          removeInteractionFromGroup(dragId);
          return true;
        }
        assignInteractionToGroup(dragId, drop.id, null);
        return true;
      }
      if (targetGrouped) {
        return assignInteractionToGroupAt(dragId, targetIx.groupId, drop.id, drop.position);
      }
    }

    return false;
  }

  function restoreOutlinerScroll(el, top) {
    if (!el || top == null || !isFinite(top)) return;
    el.scrollTop = top;
    requestAnimationFrame(function () {
      el.scrollTop = top;
    });
  }

  function moveOutlinerRowDom(list, dragId, targetId, position, dropInto) {
    if (!list || !dragId || !targetId || dragId === targetId) return false;
    var dragRow = list.querySelector('[data-qe-outliner-row="' + dragId + '"]');
    var targetRow = list.querySelector('[data-qe-outliner-row="' + targetId + '"]');
    if (!dragRow || !targetRow || dragRow === targetRow) return false;
    if (dropInto) {
      var groupId = targetRow.getAttribute('data-qe-outliner-group');
      if (!groupId) return false;
      var insertAfter = targetRow;
      var next = insertAfter.nextElementSibling;
      while (next && next.classList.contains('is-nested')) {
        insertAfter = next;
        next = next.nextElementSibling;
      }
      list.insertBefore(dragRow, insertAfter.nextSibling);
      dragRow.classList.add('is-nested');
      return true;
    }
    if (position === 'before') list.insertBefore(dragRow, targetRow);
    else list.insertBefore(dragRow, targetRow.nextSibling);
    if (targetRow.classList.contains('is-nested')) dragRow.classList.add('is-nested');
    else dragRow.classList.remove('is-nested');
    return true;
  }

  function bindOutlinerDnD(body) {
    if (!body || body.dataset.qeOutlinerDndBound === '1') return;
    body.dataset.qeOutlinerDndBound = '1';

    var draggingId = null;
    var dropTarget = null;

    function listEl() {
      return body.querySelector('[data-qe-outliner-list]');
    }

    function clearDropMarkers() {
      var list = listEl();
      if (!list) return;
      list.querySelectorAll('[data-qe-outliner-row]').forEach(function (row) {
        row.classList.remove('is-drop-above', 'is-drop-below', 'is-drop-into', 'is-dragging');
      });
      dropTarget = null;
    }

    function rowDropAt(clientY, dragId) {
      var list = listEl();
      if (!list) return null;
      var dragIx = findSceneInteraction(dragId);
      var dragIsGroup = dragIx && isOverlayGroupIx(dragIx);
      var rows = list.querySelectorAll('[data-qe-outliner-row]');
      var i;
      for (i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rect = row.getBoundingClientRect();
        var rid = row.getAttribute('data-qe-outliner-row');
        if (!rid || rid === dragId) continue;
        var h = rect.height || 1;
        if (clientY < rect.top + h / 2) {
          var isGroup = row.getAttribute('data-qe-outliner-kind') === 'group';
          if (isGroup && !dragIsGroup && clientY >= rect.top) {
            var relY = clientY - rect.top;
            if (relY > h * 0.28 && relY < h * 0.72) {
              return { id: rid, action: 'into' };
            }
          }
          return { id: rid, position: 'before' };
        }
      }
      for (i = rows.length - 1; i >= 0; i--) {
        var lastRow = rows[i];
        var lastId = lastRow.getAttribute('data-qe-outliner-row');
        if (lastId && lastId !== dragId) {
          return { id: lastId, position: 'after' };
        }
      }
      return null;
    }

    function paintDropMarker(target) {
      clearDropMarkers();
      if (!target || !draggingId || target.id === draggingId) return;
      dropTarget = target;
      var list = listEl();
      if (!list) return;
      var row = list.querySelector('[data-qe-outliner-row="' + target.id + '"]');
      if (!row) return;
      if (target.action === 'into') row.classList.add('is-drop-into');
      else row.classList.add(target.position === 'before' ? 'is-drop-above' : 'is-drop-below');
      var dragRow = list.querySelector('[data-qe-outliner-row="' + draggingId + '"]');
      if (dragRow) dragRow.classList.add('is-dragging');
    }

    function autoScrollOutliner(clientY) {
      var list = listEl();
      if (!list) return;
      var rect = list.getBoundingClientRect();
      var edge = 28;
      var speed = 12;
      if (clientY < rect.top + edge) list.scrollTop -= speed;
      else if (clientY > rect.bottom - edge) list.scrollTop += speed;
    }

    function finishDrag() {
      document.removeEventListener('pointermove', onDocMove);
      document.removeEventListener('pointerup', onDocUp);
      document.removeEventListener('pointercancel', onDocUp);
      try { document.body.classList.remove('is-qe-outliner-dragging'); } catch (eBody) { /* ignore */ }
      if (draggingId && dropTarget) {
        commitOutlinerDrop(draggingId, dropTarget);
      }
      clearDropMarkers();
      draggingId = null;
    }

    function onDocMove(ev) {
      if (!draggingId) return;
      paintDropMarker(rowDropAt(ev.clientY, draggingId));
      autoScrollOutliner(ev.clientY);
    }

    function onDocUp(ev) {
      if (ev && draggingId) finishDrag();
    }

    body.addEventListener('pointerdown', function (e) {
      var handle = e.target && e.target.closest ? e.target.closest('[data-qe-outliner-drag]') : null;
      if (!handle || !body.contains(handle)) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var row = handle.closest('[data-qe-outliner-row]');
      if (!row) return;
      draggingId = row.getAttribute('data-qe-outliner-row');
      dropTarget = null;
      row.classList.add('is-dragging');
      try { document.body.classList.add('is-qe-outliner-dragging'); } catch (eCls) { /* ignore */ }
      document.addEventListener('pointermove', onDocMove);
      document.addEventListener('pointerup', onDocUp);
      document.addEventListener('pointercancel', onDocUp);
    });
  }

  function layerTypeLabel(type) {
    var t = String(type || '').toUpperCase().replace(/[\s-]+/g, '_');
    var MAP = {
      HERO: 'HERO',
      BUTTON: 'Botón',
      HOTSPOT: 'Hotspot',
      TEXT: 'Texto',
      SHAPE_RECT: 'Rectángulo',
      SHAPE_CIRCLE: 'Círculo',
      SHAPE_LINE: 'Línea',
      SHAPE_TRIANGLE: 'Triángulo',
      SHAPE_ARROW: 'Flecha',
      SHAPE_DONUT: 'Donut',
      SHAPE_CAPSULE: 'Cápsula',
      SHAPE_ROUND_RECT: 'Cuadrado redondeado',
      SHAPE: 'Forma',
      IMAGE: 'Imagen',
      VIDEO: 'Video',
      AUDIO: 'Audio',
      PDF: 'PDF',
      MODEL: 'Modelo 3D',
      MODEL_3D: 'Modelo 3D',
      GALLERY: 'Galería',
      MAP: 'Mapa',
      GROUP: 'Grupo',
      OVERLAY_GROUP: 'Grupo'
    };
    if (MAP[t]) return MAP[t];
    if (!t) return 'Capa';
    return t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  function outlinerItemRowHtml(ix, opts) {
    opts = opts || {};
    if (!ix || !ix.id) return '';
    var t = String(ix.type || '').toUpperCase();
    var label = elementDisplayName(ix);
    var selected = !!opts.selected;
    var editing = String(state.editingElementLabelId || '') === String(ix.id);
    var nameHtml = editing
      ? ('<input type="text" class="qe-outliner__rename" data-qe-outliner-rename="' +
          escapeHtml(ix.id) + '" value="' + escapeHtml(label) + '" spellcheck="false">')
      : ('<span class="qe-outliner__name" data-qe-outliner-name="' + escapeHtml(ix.id) + '">' +
          escapeHtml(label) + '</span>');
    return '' +
      '<li class="qe-outliner__row' +
        (selected ? ' is-selected' : '') +
        (opts.nested ? ' is-nested' : '') +
        (opts.isGroup ? ' is-group' : '') + '"' +
        ' data-qe-outliner-row="' + escapeHtml(ix.id) + '"' +
        ' data-qe-layer="' + escapeHtml(ix.id) + '"' +
        ' data-qe-layer-type="' + escapeHtml(t || 'UNKNOWN') + '"' +
        (opts.isGroup ? ' data-qe-outliner-group="' + escapeHtml(ix.id) + '"' : '') +
        ' data-qe-outliner-kind="' + (opts.isGroup ? 'group' : 'item') + '">' +
        (opts.isGroup
          ? ('<button type="button" class="qe-outliner__fold' + (opts.open ? ' is-open' : '') + '"' +
            ' data-qe-layer-fold="' + escapeHtml(ix.id) + '"' +
            ' aria-label="' + (opts.open ? 'Contraer grupo' : 'Expandir grupo') + '">' +
            (opts.open ? '▾' : '▸') + '</button>')
          : '<span class="qe-outliner__fold-spacer" aria-hidden="true"></span>') +
        layerTypeIconHtml(t) +
        '<button type="button" class="qe-outliner__sel' + (selected ? ' is-active' : '') + '"' +
          ' data-qe-layer-sel="' + escapeHtml(ix.id) + '">' + nameHtml + '</button>' +
      '</li>';
  }

  function layersListHtml() {
    var scene = activeScene();
    if (scene) ensureSceneOverlays(scene);
    var ixs = (scene && Array.isArray(scene.interactions)) ? scene.interactions.slice() : [];
    var selSet = {};
    (state.selectedOverlayIds || []).forEach(function (id) {
      selSet[String(id)] = true;
    });
    if (!state.openOverlayGroups || typeof state.openOverlayGroups !== 'object') {
      state.openOverlayGroups = {};
    }
    var byId = {};
    ixs.forEach(function (ix) {
      if (ix && ix.id) byId[String(ix.id)] = ix;
    });
    var groups = [];
    var free = [];
    ixs.forEach(function (ix) {
      if (!ix || !ix.id) return;
      if (isOverlayGroupIx(ix)) groups.push(ix);
      else if (!ix.groupId) free.push(ix);
    });
    var rows = '';
    groups.forEach(function (ix) {
      var open = state.openOverlayGroups[ix.id] !== false;
      rows += outlinerItemRowHtml(ix, { isGroup: true, open: open, selected: selSet[String(ix.id)] });
      if (open) {
        (Array.isArray(ix.memberIds) ? ix.memberIds : []).forEach(function (mid) {
          var child = byId[String(mid)];
          if (child) {
            rows += outlinerItemRowHtml(child, { nested: true, selected: selSet[String(child.id)] });
          }
        });
      }
    });
    if (groups.length && free.length) {
      rows += '<li class="qe-outliner__divider" aria-hidden="true"></li>';
    }
    free.forEach(function (ix) {
      rows += outlinerItemRowHtml(ix, { selected: selSet[String(ix.id)] });
    });
    if (!rows) {
      rows = '<li class="qe-outliner__empty">Sin elementos en esta escena</li>';
    }
    return '<ul class="qe-outliner__list qe-layers__list" data-qe-outliner-list data-qe-layers-list>' +
      rows + '</ul>';
  }

  function elementsOutlinerShellHtml() {
    return '' +
      '<div class="qe-outliner" data-qe-outliner data-qe-layers aria-label="Elementos">' +
        '<div class="qe-outliner__head">Elementos</div>' +
        '<div class="qe-outliner__toolbar">' +
          '<button type="button" class="qe-outliner__create-group" data-qe-outliner-create-group>' +
            '+ Crear grupo</button>' +
        '</div>' +
        '<div class="qe-outliner__scroll">' +
          layersListHtml() +
        '</div>' +
      '</div>';
  }

  /** Right rail: Elementos (top) + Propiedades host (bottom). */
  function rightPanelHtml() {
    return '' +
      '<div class="qe-props-panel" data-qe-props-panel aria-label="Elementos y propiedades">' +
        '<section class="qe-props-panel__layers qe-props-panel__elements">' +
          elementsOutlinerShellHtml() +
        '</section>' +
        '<section class="qe-props-panel__props" aria-label="Propiedades">' +
          '<div class="qe-props-panel__head">Propiedades</div>' +
          '<div class="qe-props-panel__body" data-qe-props-empty>' +
            '<p class="qe-props-panel__empty">Selecciona un elemento</p>' +
          '</div>' +
        '</section>' +
      '</div>';
  }

  /** Repaint Elementos panel (same role as rerender() for the scenes strip). */
  function refreshOutlinerPanel() {
    syncRightPanel();
    bindOutlinerGroups(document.getElementById('quotationRightBody'));
  }

  function syncRightPanel() {
    var body = document.getElementById('quotationRightBody');
    if (!body) return;
    body.innerHTML = rightPanelHtml();
    if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.setPropsPanelVisible) {
      QuotationBuilderView.setPropsPanelVisible(true);
    }
    bindLayersPanel();
  }

  /** Same pattern as bindSceneGroups: fresh listener on the new button each paint. */
  function bindOutlinerGroups(scope) {
    if (!scope) scope = document.getElementById('quotationRightBody');
    if (!scope) return;
    var groupAdd = scope.querySelector('[data-qe-outliner-create-group]');
    if (!groupAdd) return;
    groupAdd.addEventListener('click', function (e) {
      createOverlayGroupFromPanel(e);
    });
  }

  /** Public entry — same path as context menu Agrupar completion + canvas createEmptyOverlayGroup. */
  function createOverlayGroupFromPanel(ev) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
      if (ev.stopPropagation) ev.stopPropagation();
    }
    return createEmptyOverlayGroup();
  }

  function findSceneInteraction(id) {
    var scene = activeScene();
    if (!scene || !Array.isArray(scene.interactions) || !id) return null;
    for (var i = 0; i < scene.interactions.length; i++) {
      if (String(scene.interactions[i].id) === String(id)) return scene.interactions[i];
    }
    return null;
  }

  function patchSceneInteractionFlags(id, flags) {
    var ix = findSceneInteraction(id);
    if (!ix) return false;
    flags = flags || {};
    if (flags.visible != null) {
      ix.enabled = !!flags.visible;
      ix.visible = !!flags.visible;
    }
    if (flags.locked != null) ix.locked = !!flags.locked;
    markDirtyLocal();
    if (expOverlay && expOverlay.syncFromScenes) {
      expOverlay.syncFromScenes();
    } else if (expOverlay && expOverlay.setInteractionFlags) {
      expOverlay.setInteractionFlags(id, flags);
    } else if (expOverlay && expOverlay.refresh) {
      expOverlay.refresh();
    }
    refreshLayersPanel();
    return true;
  }

  function reorderSceneInteraction(id, dir) {
    if (!id) return false;
    var scene = activeScene();
    if (!scene || !Array.isArray(scene.interactions)) return false;
    var list = scene.interactions;
    var idx = -1;
    var i;
    for (i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) { idx = i; break; }
    }
    if (idx < 0) return false;
    var nextIdx = idx + (dir < 0 ? -1 : 1);
    if (nextIdx < 0 || nextIdx >= list.length) return false;
    var tmp = list[idx];
    list[idx] = list[nextIdx];
    list[nextIdx] = tmp;
    markDirtyLocal();
    if (expOverlay && expOverlay.syncFromScenes) {
      expOverlay.syncFromScenes();
    } else if (expOverlay && expOverlay.refresh) {
      expOverlay.refresh();
    }
    refreshLayersPanel();
    return true;
  }

  function deleteSceneOverlayById(id) {
    if (!id) return false;
    if (expOverlay && expOverlay.removeOverlayById) {
      if (!expOverlay.removeOverlayById(id)) return false;
      if (expOverlay.pull) expOverlay.pull();
    } else {
      var scene = activeScene();
      if (!scene || !Array.isArray(scene.interactions)) return false;
      var iid = String(id);
      var ix = findSceneInteraction(iid);
      if (!ix) return false;
      var t = String(ix.type || '').toUpperCase();
      if (t === 'OVERLAY_GROUP' || t === 'GROUP') {
        dissolveOverlayGroupById(iid);
      } else {
        scene.interactions = scene.interactions.filter(function (item) {
          return String(item.id) !== iid;
        });
      }
      if (expOverlay && expOverlay.refresh) expOverlay.refresh();
    }
    state.expHasSelection = false;
    state.selectedOverlayIds = [];
    markDirtyLocal();
    refreshLayersPanel();
    refreshDockOnly();
    return true;
  }

  function layersPanelHtml() {
    /* Layers live in the right props rail (V7.2.66). */
    return '';
  }

  function sceneCreateMenuHtml() {
    if (state.sceneMenuOpen === 'root') {
      return '' +
        '<div class="qe-scenes__menu" data-qe-scene-menu role="menu">' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-new="empty" role="menuitem">' +
            'Escena vacía' +
          '</button>' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-menu-templates role="menuitem">' +
            'Desde plantilla' +
          '</button>' +
        '</div>';
    }
    if (state.sceneMenuOpen === 'templates') {
      var tpls = listSceneTemplates();
      var items;
      if (!tpls.length) {
        items = '<p class="qe-dock__menu-hint">No hay plantillas guardadas.</p>';
      } else {
        items = tpls.map(function (tpl) {
          return '' +
            '<button type="button" class="qe-scenes__menu-item" data-qe-scene-from-template="' +
              escapeHtml(tpl.id) + '" role="menuitem">' +
              escapeHtml(tpl.name || 'Plantilla') +
            '</button>';
        }).join('');
      }
      return '' +
        '<div class="qe-scenes__menu" data-qe-scene-menu role="menu">' +
          '<button type="button" class="qe-scenes__menu-item qe-scenes__menu-item--back" data-qe-scene-menu-root role="menuitem">' +
            '← Nueva escena' +
          '</button>' +
          items +
        '</div>';
    }
    return '';
  }

  function sceneFolderIconSvg() {
    return '' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"' +
          ' fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/>' +
      '</svg>';
  }

  function sceneThumbWrapHtml(sc, opts) {
    opts = opts || {};
    if (!sc) return '';
    var on = sc.id === state.activeSceneId;
    var hero = isHeroScene(sc);
    var selected = !!(state.sceneSelectedIds && state.sceneSelectedIds[sc.id]);
    var thumbUrl = sceneDisplayUrl(sc) || null;
    var bg = thumbUrl
      ? ' style="background-image:url(\'' + escapeHtml(thumbUrl) + '\');background-size:cover;background-position:center"'
      : '';
    var delBtn = state.canvasPreviewMode
      ? ''
      : (
        '<button type="button" class="qe-scenes__thumb-del" draggable="false"' +
          ' data-qe-scene-delete="' + escapeHtml(sc.id) + '"' +
          ' aria-label="' + (hero ? 'Vaciar HERO' : 'Eliminar escena') + '"' +
          ' title="' + (hero
            ? 'Vaciar contenido (la portada HERO no se elimina)'
            : 'Eliminar escena') + '">×</button>'
      );
    var nameLabel = hero ? 'H E R O' : String(sc.name || 'Escena').toLowerCase();
    return '' +
      '<div class="qe-scenes__thumb-wrap' + (hero ? ' is-hero-scene' : '') +
        (selected ? ' is-selected' : '') +
        (opts.inGroup ? ' is-in-group' : '') +
        (opts.inPanel ? ' is-in-panel' : '') + '"' +
        ' data-qe-drop-scene data-qe-drop-scene-id="' + escapeHtml(sc.id) + '"' +
        (hero ? '' : ' data-qe-scene-drop="' + escapeHtml(sc.id) + '"') + '>' +
        '<button type="button" class="qe-scenes__thumb' + (on ? ' is-active' : '') +
          (hero ? ' is-hero' : '') + '"' +
          ' data-qe-scene="' + escapeHtml(sc.id) + '"' +
          (hero ? '' : ' draggable="true" data-qe-scene-drag="' + escapeHtml(sc.id) + '"') +
          ' title="' + escapeHtml(hero ? 'H E R O' : (sc.name || 'Escena')) + '">' +
          '<span class="qe-scenes__thumb-frame" aria-hidden="true"' + bg + '></span>' +
        '</button>' +
        '<span class="qe-scenes__thumb-name' + (hero ? ' is-hero-label' : '') + '"' +
          (hero
            ? ' data-qe-scene-name-locked="1"'
            : ' data-qe-scene-name="' + escapeHtml(sc.id) + '" title="Doble clic para renombrar"') +
          '>' + escapeHtml(nameLabel) + '</span>' +
        delBtn +
      '</div>';
  }

  function sceneGroupBlockHtml(grp) {
    if (!grp) return '';
    var open = openSceneGroupFloatId === grp.id;
    var count = (grp.sceneIds || []).length;
    (grp.childGroupIds || []).forEach(function (cid) {
      var child = sceneGroupById(cid);
      if (child) count += (child.sceneIds || []).length;
    });
    return '' +
      '<div class="qe-scenes__group-block' + (open ? ' is-open-float' : '') + '"' +
        ' data-qe-scene-group-block="' + escapeHtml(grp.id) + '">' +
        '<div class="qe-scenes__group-wrap"' +
          ' data-qe-scene-group-drop="' + escapeHtml(grp.id) + '">' +
          '<button type="button" class="qe-scenes__group"' +
            ' data-qe-scene-group-toggle="' + escapeHtml(grp.id) + '"' +
            ' title="' + escapeHtml(grp.name || 'Grupo') + ' (' + count + ')"' +
            ' aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<span class="qe-scenes__group-frame" aria-hidden="true">' +
              sceneFolderIconSvg() +
            '</span>' +
          '</button>' +
          '<span class="qe-scenes__thumb-name qe-scenes__group-name"' +
            ' data-qe-scene-group-name="' + escapeHtml(grp.id) + '"' +
            ' title="Doble clic para renombrar">' +
            escapeHtml(String(grp.name || 'Grupo').toLowerCase()) +
          '</span>' +
        '</div>' +
      '</div>';
  }

  function scenesBarHtml() {
    ensureScenes();
    ensureSceneGroups();
    var thumbs = '';
    if (state.scenes[0]) thumbs += sceneThumbWrapHtml(state.scenes[0]);
    (state.sceneTrack || []).forEach(function (itemId) {
      if (sceneGroupById(itemId)) {
        thumbs += sceneGroupBlockHtml(sceneGroupById(itemId));
      } else {
        var sc = sceneById(itemId);
        if (sc && !isHeroScene(sc)) thumbs += sceneThumbWrapHtml(sc);
      }
    });

    var addThumb = '';
    if (!state.canvasPreviewMode) {
      addThumb = '' +
        '<div class="qe-scenes__add" data-qe-scenes-add>' +
          '<div class="qe-scenes__thumb-wrap qe-scenes__thumb-wrap--add qe-scenes__thumb-wrap--add-duo">' +
            '<div class="qe-scenes__add-duo" role="group" aria-label="Crear escena o grupo">' +
              '<button type="button" class="qe-scenes__add-duo-btn qe-scenes__add-duo-btn--scene"' +
                ' data-qe-scene-add title="Nueva escena" aria-label="Nueva escena">' +
                '<span class="qe-scenes__add-duo-icon" aria-hidden="true">+</span>' +
              '</button>' +
              '<button type="button" class="qe-scenes__add-duo-btn qe-scenes__add-duo-btn--group"' +
                ' data-qe-scene-group-add title="Nuevo grupo" aria-label="Nuevo grupo">' +
                '<span class="qe-scenes__add-duo-icon qe-scenes__add-duo-icon--folder" aria-hidden="true">' +
                  sceneFolderIconSvg() +
                '</span>' +
              '</button>' +
            '</div>' +
            '<div class="qe-scenes__add-duo-names">' +
              '<span class="qe-scenes__thumb-name">escena</span>' +
              '<span class="qe-scenes__thumb-name">grupo</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return '' +
      '<div class="qe-scenes-host' + (state.scenesCollapsed ? ' is-collapsed' : '') +
        '" data-qe-scenes-host>' +
        '<div class="qe-scenes' +
          (state.canvasPreviewMode ? ' is-preview' : '') +
          (state.scenesCollapsed ? ' is-collapsed' : '') +
          '" data-qe-scenes>' +
          '<button type="button" class="qe-scenes__nav" data-qe-scenes-prev aria-label="Escenas anteriores">←</button>' +
          '<div class="qe-scenes__track-wrap">' +
            '<div class="qe-scenes__track" data-qe-scenes-track>' + thumbs + '</div>' +
          '</div>' +
          addThumb +
          '<button type="button" class="qe-scenes__nav" data-qe-scenes-next aria-label="Escenas siguientes">→</button>' +
        '</div>' +
        scenesFoldBtnHtml() +
      '</div>';
  }

  function scenesFoldChevronSvg() {
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render(state.scenesLocked ? 'lock' : 'chevron-down');
    }
    if (state.scenesLocked) {
      return '' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
          ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect width="18" height="11" x="3" y="11" rx="2"/>' +
          '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
        '</svg>';
    }
    return '' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m6 9 6 6 6-6"/>' +
      '</svg>';
  }

  function scenesFoldLabel() {
    if (state.scenesLocked) {
      return state.scenesCollapsed ? 'Escenas bloqueadas (ocultas)' : 'Escenas bloqueadas';
    }
    return state.scenesCollapsed ? 'Mostrar escenas' : 'Ocultar escenas';
  }

  function scenesFoldBtnHtml() {
    var collapsed = !!state.scenesCollapsed;
    var locked = !!state.scenesLocked;
    return '' +
      '<button type="button" class="quotation-panel-float quotation-panel-float--scenes' +
        (locked ? ' is-locked' : '') + '"' +
        ' data-qe-scenes-fold' +
        ' data-collapsed="' + (collapsed ? '1' : '0') + '"' +
        ' data-locked="' + (locked ? '1' : '0') + '"' +
        ' aria-expanded="' + (collapsed ? 'false' : 'true') + '"' +
        ' aria-label="' + scenesFoldLabel() + '"' +
        ' title="' + scenesFoldLabel() + '">' +
        scenesFoldChevronSvg() +
      '</button>';
  }

  function setScenesLocked(on) {
    state.scenesLocked = !!on;
    syncScenesFoldButton();
  }

  function openScenesFoldLockMenu(clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var locked = !!state.scenesLocked;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Escenas',
      items: [
        {
          id: 'inspect',
          label: 'Inspeccionar página'
        },
        {
          id: locked ? 'unlock' : 'lock',
          label: locked ? 'Desbloquear escenas' : 'Bloquear escenas',
          separatorBefore: true
        }
      ],
      onSelect: function (id) {
        if (id === 'inspect') {
          if (typeof BoxiesShell !== 'undefined' && BoxiesShell.openPageForInspect) {
            BoxiesShell.openPageForInspect();
          } else {
            window.open(window.location.href, '_blank', 'noopener,noreferrer');
          }
          return;
        }
        if (id === 'lock') setScenesLocked(true);
        else if (id === 'unlock') setScenesLocked(false);
      }
    });
  }

  function viewportIconSvg(id) {
    var common =
      ' class="qe-canvas-tool__ico" width="14" height="14" viewBox="0 0 16 16" fill="none"' +
      ' stroke="currentColor" stroke-width="1.35" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true"';
    if (id === 'desktop') {
      return '<svg' + common + '>' +
        '<rect x="1.5" y="2.5" width="13" height="8.5" rx="1.2"/>' +
        '<path d="M6 13.5h4M8 11v2.5"/>' +
      '</svg>';
    }
    if (id === 'tablet') {
      return '<svg' + common + '>' +
        '<rect x="3.2" y="1.5" width="9.6" height="13" rx="1.4"/>' +
        '<path d="M7.2 12.2h1.6"/>' +
      '</svg>';
    }
    if (id === 'mobile') {
      return '<svg' + common + '>' +
        '<rect x="4.5" y="1.5" width="7" height="13" rx="1.6"/>' +
        '<path d="M7 12.3h2"/>' +
      '</svg>';
    }
    return '';
  }

  function snapToggleIconSvg() {
    return '<svg class="qe-canvas-tool__ico" width="14" height="14" viewBox="0 0 16 16" fill="none"' +
      ' stroke="currentColor" stroke-width="1.35" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5.2 2.5h5.6a2.2 2.2 0 0 1 2.2 2.2v2.4a2.8 2.8 0 0 1-2.8 2.8H8"/>' +
      '<path d="M10.8 13.5H5.2a2.2 2.2 0 0 1-2.2-2.2V8.9a2.8 2.8 0 0 1 2.8-2.8H8"/>' +
      '</svg>';
  }

  function overlaySnapToggleTitle() {
    return state.overlaySnapEnabled
      ? 'Imanes activos (Alt = desactivar temporalmente)'
      : 'Imanes desactivados';
  }

  function syncOverlaySnapUi() {
    if (expOverlay && expOverlay.setOverlaySnapEnabled) {
      expOverlay.setOverlaySnapEnabled(!!state.overlaySnapEnabled);
    }
    if (!rootEl || !rootEl.querySelector) return;
    var btn = rootEl.querySelector('[data-qe-toggle-snap]');
    if (!btn) return;
    btn.classList.toggle('is-active', !!state.overlaySnapEnabled);
    btn.setAttribute('aria-pressed', state.overlaySnapEnabled ? 'true' : 'false');
    btn.title = overlaySnapToggleTitle();
  }

  function setOverlaySnapEnabled(on) {
    var next = !!on;
    if (state.overlaySnapEnabled === next) {
      syncOverlaySnapUi();
      return;
    }
    state.overlaySnapEnabled = next;
    syncOverlaySnapUi();
  }

  var BACKPACK_SCENE_ID = '__qe_backpack__';
  var BACKPACK_STORAGE_BG = '#0a0a0a';
  var BOX_UI_LABEL = 'Box';

  function boxModeTitle(active) {
    return active ? ('Salir de ' + BOX_UI_LABEL) : BOX_UI_LABEL;
  }

  function ensureBackpackInteractions() {
    if (!Array.isArray(state.backpackInteractions)) state.backpackInteractions = [];
    return state.backpackInteractions;
  }

  function getBackpackSceneRef() {
    ensureBackpackInteractions();
    if (!state._backpackSceneRef) {
      state._backpackSceneRef = {
        id: BACKPACK_SCENE_ID,
        name: BOX_UI_LABEL,
        type: 'backpack',
        mediaUrl: null,
        mediaType: null,
        resourceId: null,
        coverModel: null,
        elements: [],
        interactions: state.backpackInteractions,
        buttons: [],
        hotspots: [],
        guides: []
      };
    }
    state._backpackSceneRef.interactions = state.backpackInteractions;
    ensureSceneOverlays(state._backpackSceneRef);
    return state._backpackSceneRef;
  }

  function isBackpackMode() {
    return !!state.backpackMode;
  }

  function isBackpackPanelOpen() {
    return isBackpackMode();
  }

  function syncBackpackFabUi() {
    if (!rootEl) return;
    var btn = rootEl.querySelector('[data-qe-toggle-backpack]');
    if (!btn) return;
    var on = isBackpackMode();
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = boxModeTitle(on);
    btn.setAttribute('aria-label', boxModeTitle(on));
  }

  function syncBackpackChromeUi() {
    if (!rootEl) return;
    var editor = rootEl.querySelector('[data-qe-editor]');
    if (editor) editor.classList.toggle('is-backpack-mode', isBackpackMode());
    var title = rootEl.querySelector('[data-qe-active-scene-name]');
    if (title) {
      var name = isBackpackMode()
        ? BOX_UI_LABEL
        : ((activeScene() && activeScene().name) ? String(activeScene().name) : 'Escena');
      title.textContent = name;
      title.title = name;
    }
    syncBackpackFabUi();
  }

  function enterBackpackMode() {
    if (state.backpackMode || state.canvasPreviewMode) return;
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) { /* ignore */ }
    }
    if (typeof QuotationCanvasTools !== 'undefined' && QuotationCanvasTools.close) {
      try { QuotationCanvasTools.close(); } catch (eTools) { /* ignore */ }
    }
    state.backpackReturnSceneId = state.activeSceneId;
    state.backpackMode = true;
    destroyBuilderRuntimeScene();
    mountBuilderRuntimeScene();
    syncBackpackChromeUi();
    fitStageWorkspace();
  }

  function exitBackpackMode(restoreScene) {
    if (!state.backpackMode) return;
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) { /* ignore */ }
    }
    state.backpackMode = false;
    if (restoreScene !== false && state.backpackReturnSceneId && sceneById(state.backpackReturnSceneId)) {
      state.activeSceneId = state.backpackReturnSceneId;
    }
    state.backpackReturnSceneId = null;
    destroyBuilderRuntimeScene();
    mountBuilderRuntimeScene();
    syncBackpackChromeUi();
    fitStageWorkspace();
  }

  function toggleBackpackMode() {
    if (state.backpackMode) exitBackpackMode();
    else enterBackpackMode();
  }

  function toggleBackpackPanel() {
    toggleBackpackMode();
  }

  function isToolsPanelOpen() {
    var props = document.getElementById('quotationPropsPanel');
    if (props && props.hidden) return false;
    var ws = document.querySelector('.quotation-workspace');
    if (!ws) return false;
    return !ws.classList.contains('is-right-collapsed');
  }

  function toggleToolsPanel() {
    if (typeof QuotationBuilderView === 'undefined' || !QuotationBuilderView.applyRightCollapsed) return;
    if (QuotationBuilderView.setPropsPanelVisible) {
      QuotationBuilderView.setPropsPanelVisible(true);
    }
    state.inspectorCollapsed = isToolsPanelOpen();
    QuotationBuilderView.applyRightCollapsed(isToolsPanelOpen());
  }

  function openSceneBackgroundPicker() {
    if (state.canvasPreviewMode) return;
    openResourcePicker(state.activeSceneId || null);
  }

  function openCanvasTool(toolId) {
    if (typeof QuotationCanvasTools === 'undefined' || !QuotationCanvasTools.open) return;
    QuotationCanvasTools.open(toolId);
  }

  function viewportChromeHtml() {
    var preset = state.viewportPreset || 'desktop';
    var sc = activeScene();
    var sceneName = state.backpackMode
      ? BOX_UI_LABEL
      : ((sc && sc.name) ? String(sc.name) : 'Escena');
    var list = (typeof HeroRenderer !== 'undefined' && HeroRenderer.listViewports)
      ? HeroRenderer.listViewports()
      : [
        { id: 'desktop', label: 'Desktop' },
        { id: 'tablet', label: 'Tablet' },
        { id: 'mobile', label: 'Mobile' }
      ];
    var btns = list.map(function (vp) {
      var label = vp.label || vp.id;
      var icon = viewportIconSvg(vp.id) || escapeHtml(label);
      return '' +
        '<button type="button" class="qe-canvas-tool__btn' +
          (preset === vp.id ? ' is-active' : '') + '"' +
          ' data-qe-viewport="' + escapeHtml(vp.id) + '"' +
          ' title="' + escapeHtml(label) + '"' +
          ' aria-label="' + escapeHtml(label) + '">' +
          icon +
        '</button>';
    }).join('');
    var snapBtn =
      '<button type="button" class="qe-canvas-tool__btn qe-canvas-tool__btn--snap' +
        (state.overlaySnapEnabled ? ' is-active' : '') + '"' +
        ' data-qe-toggle-snap title="' + escapeHtml(overlaySnapToggleTitle()) + '"' +
        ' aria-pressed="' + (state.overlaySnapEnabled ? 'true' : 'false') + '"' +
        ' aria-label="Imanes">' +
        snapToggleIconSvg() +
      '</button>';
    return '' +
      '<div class="qe-canvas-chrome-top" data-qe-chrome-top>' +
        '<div class="qe-canvas-chrome-top__title" data-qe-active-scene-name' +
          ' title="' + escapeHtml(sceneName) + '">' +
          escapeHtml(sceneName) +
        '</div>' +
        '<div class="qe-canvas-tool qe-canvas-tool--viewport" data-qe-viewport-bar role="group" aria-label="Viewport">' +
          btns +
          snapBtn +
          backpackToolbarBtnHtml() +
        '</div>' +
        '<div class="qe-canvas-chrome-top__spacer" aria-hidden="true"></div>' +
      '</div>';
  }

  function dockHasSelection() {
    if (state.selectedElementId) return true;
    if (state.expHasSelection) return true;
    return false;
  }

  function dockIconSvg(kind) {
    var common =
      ' class="qe-dock__ico" width="15" height="15" viewBox="0 0 16 16" fill="none"' +
      ' stroke="currentColor" stroke-width="1.35" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true"';
    if (kind === 'plus') {
      return '<svg' + common + '><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>';
    }
    if (kind === 'edit') {
      return '<svg' + common + '>' +
        '<path d="M3.5 12.5 12.2 3.8a1.4 1.4 0 0 1 2 2L5.5 14.5H3.5v-2z"/>' +
        '<path d="M10.2 5.8l2 2"/>' +
      '</svg>';
    }
    if (kind === 'dup') {
      return '<svg' + common + '>' +
        '<rect x="2.5" y="4.5" width="7.5" height="7.5" rx="1.2"/>' +
        '<rect x="6" y="2.5" width="7.5" height="7.5" rx="1.2"/>' +
      '</svg>';
    }
    if (kind === 'lock') {
      return '<svg' + common + '>' +
        '<rect x="3.5" y="7" width="9" height="6.5" rx="1.4"/>' +
        '<path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7"/>' +
      '</svg>';
    }
    if (kind === 'front') {
      return '<svg' + common + '>' +
        '<path d="M3 3.5h10"/>' +
        '<path d="M8 13V5.5"/>' +
        '<path d="M5.2 8.2 8 5.4l2.8 2.8"/>' +
      '</svg>';
    }
    if (kind === 'del') {
      return '<svg' + common + '>' +
        '<path d="M3.2 5h9.6"/>' +
        '<path d="M6 5V3.8h4V5"/>' +
        '<path d="M5.2 5l.6 7.2h4.4L10.8 5"/>' +
      '</svg>';
    }
    if (kind === 'animate') {
      return '<svg' + common + '>' +
        '<path d="M4.2 4.5v7l5.8-3.5-5.8-3.5z"/>' +
        '<path d="M12.2 5.2v5.6"/>' +
        '<path d="M14.6 7v2"/>' +
      '</svg>';
    }
    if (kind === 'interact') {
      return '<svg' + common + '>' +
        '<path d="M4.2 4.2 7.6 11.6 6.1 10.1 4.2 13.1 4.2 4.2z"/>' +
        '<circle cx="12.4" cy="10.8" r="2.1"/>' +
        '<path d="M14 9.2l1.6-1.6"/>' +
      '</svg>';
    }
    return '';
  }

  function dockSegHtml(attrs, icon, label, extraClass) {
    return '' +
      '<button type="button" class="qe-dock__seg' +
        (extraClass ? ' ' + extraClass : '') + '" ' + attrs + '>' +
        dockIconSvg(icon) +
        '<span class="qe-dock__label">' + escapeHtml(label) + '</span>' +
      '</button>';
  }

  function stageDockRailHtml() {
    if (dockHasSelection()) {
      return '' +
        dockSegHtml(
          'data-qe-dock-edit',
          'edit',
          'Editar',
          ''
        ) +
        dockSegHtml('data-qe-dock-animate', 'animate', 'Animar') +
        dockSegHtml('data-qe-dock-interact', 'interact', 'Interactividad') +
        dockSegHtml('data-qe-dock-dup', 'dup', 'Duplicar') +
        dockSegHtml('data-qe-dock-lock', 'lock', 'Bloquear') +
        dockSegHtml('data-qe-dock-front', 'front', 'Traer al frente') +
        dockSegHtml('data-qe-dock-del', 'del', 'Eliminar', 'qe-dock__seg--danger');
    }
    return '' +
      dockSegHtml('data-qe-add-shape', 'plus', 'Forma') +
      dockSegHtml('data-qe-add-text', 'plus', 'Texto') +
      dockSegHtml('data-qe-add-stroke', 'plus', 'Trazo') +
      dockSegHtml('data-qe-add-container', 'plus', 'Contenedor') +
      dockSegHtml('data-qe-add-component', 'plus', 'Componente') +
      dockSegHtml('data-qe-add-advanced', 'plus', 'Avanzado');
  }

  function stageDockHtml() {
    var mode = dockHasSelection() ? 'actions' : 'create';
    return '' +
      '<div class="qe-canvas-tool qe-canvas-tool--dock qe-dock" data-qe-dock-bar data-mode="' + mode + '">' +
        '<div class="qe-dock__rail" data-qe-dock-rail>' +
          stageDockRailHtml() +
        '</div>' +
      '</div>';
  }

  function backpackIconSvg() {
    return '<svg class="qe-canvas-tool__ico" width="14" height="14" viewBox="0 0 24 24" fill="none"' +
      ' stroke="currentColor" stroke-width="1.65" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 4.5 18.75 8.25 12 12 5.25 8.25 12 4.5z"/>' +
      '<path d="M5.25 8.25 12 12v9.75L5.25 18V8.25z"/>' +
      '<path d="M18.75 8.25 12 12v9.75l6.75-3.75V8.25z"/>' +
      '</svg>';
  }

  function backpackToolbarBtnHtml() {
    var on = !!state.backpackMode;
    var label = boxModeTitle(on);
    return '' +
      '<button type="button" class="qe-canvas-tool__btn qe-canvas-tool__btn--backpack' +
        (on ? ' is-active' : '') + '"' +
        ' data-qe-toggle-backpack' +
        ' title="' + escapeHtml(label) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
        ' aria-label="' + escapeHtml(label) + '">' +
        backpackIconSvg() +
      '</button>';
  }

  function sceneConfirmHtml() {
    if (!state.pendingSceneDeleteId) return '';
    var pending = sceneById(state.pendingSceneDeleteId);
    var hero = isHeroScene(pending);
    var title = hero
      ? '¿Vaciar la portada HERO? Se quita el contenido, pero la escena permanece.'
      : '¿Deseas eliminar esta escena?';
    var okLabel = hero ? 'Vaciar' : 'Eliminar';
    return '' +
      '<div class="qe-confirm" data-qe-scene-confirm role="dialog" aria-modal="true"' +
        ' aria-labelledby="qeSceneConfirmTitle">' +
        '<div class="qe-confirm__backdrop" data-qe-scene-confirm-cancel tabindex="-1"></div>' +
        '<div class="qe-confirm__panel">' +
          '<p class="qe-confirm__title" id="qeSceneConfirmTitle">' + escapeHtml(title) + '</p>' +
          '<div class="qe-confirm__actions">' +
            '<button type="button" class="qe-confirm__btn" data-qe-scene-confirm-cancel>Cancelar</button>' +
            '<button type="button" class="qe-confirm__btn qe-confirm__btn--danger" data-qe-scene-confirm-ok">' +
              escapeHtml(okLabel) +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function canvasHtml() {
    var win = activeViewportSize();
    return '' +
      '<section class="qe-col qe-col--canvas" aria-label="Canvas">' +
        '<div class="qe-stage-shell" data-qe-stage-shell>' +
          '<div class="qe-stage-unit' + (state.scenesCollapsed ? ' is-scenes-collapsed' : '') +
            '" data-qe-stage-unit>' +
            scenesBarHtml() +
            '<div class="qe-stage-work" data-qe-stage-work>' +
              '<div class="qe-canvas-fit" data-qe-canvas-fit>' +
                '<div class="qe-canvas-fit__stack" data-qe-canvas-fit-stack>' +
                  viewportChromeHtml() +
                  '<div class="qe-canvas-fit__frame" data-qe-canvas-fit-frame>' +
                    '<div class="qe-canvas__stage" data-qe-canvas data-qe-drop-scene data-qe-viewport-window' +
                      ' style="width:' + win.width + 'px;height:' + win.height + 'px;"></div>' +
                  '</div>' +
                  stageDockHtml() +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        resourcePickerHtml() +
        shapePickerHtml() +
        sceneConfirmHtml() +
      '</section>';
  }

  var canvasRo = null;
  var stageRo = null;
  var stageFitBound = false;
  var STAGE_FIT_INSET = 8;
  var STAGE_SCENES_MIN_H = 120;
  var STAGE_DOCK_MIN_H = 64;
  /** Visual scale of the device canvas frame only (chrome stays 1). */
  var canvasFitScale = 1;
  var canvasWheelBound = false;
  var CANVAS_ZOOM_MIN = 1;
  var CANVAS_ZOOM_MAX = 4;
  var CANVAS_ZOOM_WHEEL = 1.08;

  /**
   * Visible rectangle for the Stage — clamped by header + fixed BOXIES footer.
   * Never trust col.clientHeight alone: the column can extend under the dock.
   */
  function measureStageViewport(col) {
    var rect = col.getBoundingClientRect();
    var cs = window.getComputedStyle(col);
    var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

    var headerEl = document.getElementById('boxiesHeader') ||
      document.querySelector('.boxies-header');
    var dockEl = document.getElementById('boxiesDock');
    var headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    var dockTop = dockEl
      ? dockEl.getBoundingClientRect().top
      : (window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight);

    var top = Math.max(rect.top, headerBottom);
    var bottom = Math.min(rect.bottom, dockTop);
    var width = Math.max(1, rect.width - padX - STAGE_FIT_INSET * 2);
    var height = Math.max(1, bottom - top - padY - STAGE_FIT_INSET * 2);

    return { width: width, height: height };
  }

  /**
   * V7.2.63 — Desktop-only Builder chrome (Xcode / Figma simulator).
   * Scenes, viewport presets and dock stay 1:1 forever.
   * Only the device canvas rectangle changes size/aspect; it may scale
   * down to fit the remaining slot — never the surrounding editor UI.
   */
  function fitStageWorkspaceNow() {
    if (!rootEl) return;
    var col = rootEl.querySelector('.qe-col--canvas');
    var shell = rootEl.querySelector('[data-qe-stage-shell]');
    var unit = rootEl.querySelector('[data-qe-stage-unit]');
    if (!col || !shell || !unit) return;

    var vp = measureStageViewport(col);
    var availW = Math.max(1, vp.width);
    var availH = Math.max(1, vp.height);
    var device = activeViewportSize();

    shell.style.boxSizing = 'border-box';
    shell.style.width = availW + 'px';
    shell.style.height = availH + 'px';
    shell.style.maxWidth = '100%';
    shell.style.maxHeight = '100%';
    shell.style.position = 'relative';
    shell.style.overflow = 'hidden';
    shell.style.flex = '0 0 auto';
    shell.style.margin = '0 auto';

    /* Chrome never scales with the device preset. */
    unit.style.transform = 'none';
    unit.style.width = '100%';
    unit.style.height = '100%';
    unit.style.maxWidth = 'none';
    unit.style.position = 'relative';
    unit.style.top = '';
    unit.style.left = '';
    unit.style.transformOrigin = '';
    unit.style.visibility = '';
    unit.style.display = 'flex';
    unit.style.flexDirection = 'column';
    unit.style.alignItems = 'stretch';
    unit.style.boxSizing = 'border-box';

    var scenesHost = unit.querySelector('[data-qe-scenes-host]');
    var scenes = unit.querySelector('.qe-scenes');
    var fitSlot = unit.querySelector('[data-qe-canvas-fit]');
    var fitStack = unit.querySelector('[data-qe-canvas-fit-stack]');
    var fitFrame = unit.querySelector('[data-qe-canvas-fit-frame]');
    var stage = unit.querySelector('[data-qe-canvas]');
    var toolChrome = unit.querySelector('[data-qe-chrome-top]');
    var toolVp = unit.querySelector('[data-qe-viewport-bar]');
    var toolDock = unit.querySelector('[data-qe-dock-bar], .qe-dock');

    syncScenesFoldButton();

    if (scenesHost) {
      scenesHost.classList.toggle('is-collapsed', !!state.scenesCollapsed);
      scenesHost.style.width = '';
      scenesHost.style.flex = '0 0 auto';
    }
    if (scenes) {
      scenes.style.width = '';
      scenes.style.flex = '0 0 auto';
      scenes.classList.toggle('is-collapsed', !!state.scenesCollapsed && !scenesHostAnimating());
    }
    unit.classList.toggle('is-scenes-collapsed', !!state.scenesCollapsed);

    void unit.offsetHeight;

    var scenesMeasureEl = scenesHost || scenes;
    var scenesH = scenesMeasureEl
      ? Math.ceil(scenesMeasureEl.getBoundingClientRect().height)
      : 0;
    var scenesMb = scenesMeasureEl
      ? (parseFloat(window.getComputedStyle(scenesMeasureEl).marginBottom) || 0)
      : 0;
    var TOOL_PAD = 44;
    var chromeH = Math.ceil(scenesH + scenesMb);
    var slotW = Math.max(1, availW);
    var slotH = Math.max(1, availH - chromeH);

    var natW = device.width;
    var natH = device.height;

    if (fitSlot) {
      fitSlot.style.flex = '1 1 auto';
      fitSlot.style.minHeight = '0';
      fitSlot.style.minWidth = '0';
      fitSlot.style.width = '100%';
      fitSlot.style.height = '';
      fitSlot.style.maxHeight = '';
      fitSlot.style.display = 'flex';
      fitSlot.style.alignItems = 'center';
      fitSlot.style.justifyContent = 'center';
      fitSlot.style.overflow = state.backpackMode ? 'hidden' : 'visible';
      fitSlot.style.padding = TOOL_PAD + 'px 0';
      fitSlot.style.boxSizing = 'border-box';
      fitSlot.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
    }
    var work = unit.querySelector('[data-qe-stage-work]');
    if (work) {
      work.style.flex = '1 1 auto';
      work.style.minHeight = '0';
      work.style.maxHeight = '';
      work.style.height = '';
      work.style.display = 'flex';
      work.style.flexDirection = 'row';
      work.style.alignItems = 'stretch';
      work.style.gap = '0';
      work.style.overflow = state.backpackMode ? 'hidden' : 'visible';
      work.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
      work.style.position = 'relative';
    }

    void unit.offsetHeight;
    var workMeasure = unit.querySelector('[data-qe-stage-work]');
    var measuredSlotH = workMeasure
      ? Math.max(1, Math.floor(workMeasure.getBoundingClientRect().height))
      : slotH;

    var scale = Math.min(slotW / natW, (measuredSlotH - TOOL_PAD * 2) / natH);
    if (!isFinite(scale) || scale <= 0) scale = 0.01;
    if (scale > 1) scale = 1;
    var scaledW = Math.max(1, Math.floor(natW * scale));
    var scaledH = Math.max(1, Math.floor(natH * scale));

    if (fitStack) {
      fitStack.style.width = scaledW + 'px';
      fitStack.style.height = scaledH + 'px';
      fitStack.style.position = 'relative';
      fitStack.style.flex = '0 0 auto';
    }
    if (fitFrame) {
      fitFrame.style.width = scaledW + 'px';
      fitFrame.style.height = scaledH + 'px';
      fitFrame.style.position = 'relative';
      fitFrame.style.flex = '0 0 auto';
      fitFrame.style.overflow = 'hidden';
      fitFrame.style.border = state.backpackMode ? 'none' : '';
      fitFrame.style.borderRadius = state.backpackMode ? '0' : '';
      fitFrame.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
    }
    if (toolChrome) {
      toolChrome.style.position = 'absolute';
      toolChrome.style.left = '0';
      toolChrome.style.right = '0';
      toolChrome.style.width = '100%';
      toolChrome.style.top = '0';
      toolChrome.style.transform = 'translateY(calc(-100% - 8px))';
      toolChrome.style.zIndex = '6';
    }
    if (toolVp) {
      toolVp.style.position = '';
      toolVp.style.left = '';
      toolVp.style.top = '';
      toolVp.style.transform = '';
      toolVp.style.zIndex = '';
    }
    if (toolDock) {
      toolDock.style.position = 'absolute';
      toolDock.style.left = '50%';
      toolDock.style.bottom = '0';
      toolDock.style.transform = 'translate(-50%, calc(100% + 8px))';
      toolDock.style.zIndex = '6';
      toolDock.style.margin = '0';
    }
    if (stage) {
      stage.style.width = natW + 'px';
      stage.style.height = natH + 'px';
      stage.style.minHeight = natH + 'px';
      stage.style.maxHeight = natH + 'px';
      stage.style.flex = '0 0 auto';
      stage.style.position = 'absolute';
      stage.style.top = '0';
      stage.style.left = '0';
      stage.style.transform = 'scale(' + scale + ')';
      stage.style.transformOrigin = 'top left';
      stage.style.border = state.backpackMode ? 'none' : '';
      stage.style.borderRadius = state.backpackMode ? '0' : '';
      stage.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
    }

    shell.setAttribute('data-qe-stage-scale', String(Math.round(scale * 1000) / 1000));
    shell.setAttribute('data-qe-stage-nat', natW + 'x' + natH);
    shell.setAttribute('data-qe-chrome-locked', '1');
    shell.setAttribute('data-qe-backpack-mode', state.backpackMode ? '1' : '0');
    shell.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
    unit.style.background = state.backpackMode ? BACKPACK_STORAGE_BG : '';
    canvasFitScale = scale;

    if (expOverlay && expOverlay.isKonvaPoc) {
      try {
        if (expOverlay.fitStage) expOverlay.fitStage();
        else if (expOverlay.refresh) expOverlay.refresh();
      } catch (eKonvaFit) { /* ignore */ }
    }

    syncDesignIdentity();
    if (typeof QuotationGuides !== 'undefined' && QuotationGuides.refresh) {
      try { QuotationGuides.refresh(); } catch (eGuidesFit) { /* ignore */ }
    }
    if (openSceneGroupFloatId) sceneGroupFloatReposition();
  }

  var stageFitSuspend = 0;
  var stageFitPending = false;

  function suspendStageFit() {
    stageFitSuspend++;
  }

  function resumeStageFit() {
    stageFitSuspend = Math.max(0, stageFitSuspend - 1);
    if (stageFitSuspend === 0) {
      stageFitPending = false;
      fitStageWorkspaceNow();
    }
  }

  function fitStageWorkspace() {
    if (stageFitSuspend > 0) {
      stageFitPending = true;
      return;
    }
    fitStageWorkspaceNow();
  }

  var STAGE_SCENES_FOLD_H = 16;
  var STAGE_SCENES_FOLD_GAP = 12;
  var STAGE_SCENES_SLIDE_MS = 440;
  var scenesFitRaf = null;

  function scenesHostAnimating() {
    if (!rootEl) return false;
    var host = rootEl.querySelector('[data-qe-scenes-host]');
    return !!(host && host.classList.contains('is-scenes-animating'));
  }

  function finishScenesTransition(host) {
    if (!host) return;
    host.classList.remove('is-scenes-animating');
    if (!rootEl) return;
    var unit = rootEl.querySelector('[data-qe-stage-unit]');
    var scenes = rootEl.querySelector('[data-qe-scenes]');
    if (unit) unit.classList.remove('is-scenes-animating');
    if (state.scenesCollapsed && scenes) scenes.classList.add('is-collapsed');
    syncScenesFoldButton();
    try { fitStageWorkspace(); } catch (eFit) { /* ignore */ }
  }

  function runScenesFitDuringTransition(host) {
    if (scenesFitRaf) {
      try { cancelAnimationFrame(scenesFitRaf); } catch (eCancel) { /* ignore */ }
      scenesFitRaf = null;
    }
    var started = performance.now();
    var tick = function (now) {
      try { fitStageWorkspace(); } catch (eFit) { /* ignore */ }
      if (now - started < STAGE_SCENES_SLIDE_MS + 60) {
        scenesFitRaf = requestAnimationFrame(tick);
      } else {
        scenesFitRaf = null;
      }
    };
    scenesFitRaf = requestAnimationFrame(tick);
    if (!host || typeof host.addEventListener !== 'function') return;
    var onEnd = function (ev) {
      if (ev.propertyName !== 'max-height' && ev.propertyName !== 'margin') return;
      host.removeEventListener('transitionend', onEnd);
      if (scenesFitRaf) {
        try { cancelAnimationFrame(scenesFitRaf); } catch (eCancel2) { /* ignore */ }
        scenesFitRaf = null;
      }
      finishScenesTransition(host);
    };
    host.addEventListener('transitionend', onEnd);
  }

  function syncScenesFoldButton() {
    if (!rootEl) return;
    var fold = rootEl.querySelector('[data-qe-scenes-fold]');
    var host = rootEl.querySelector('[data-qe-scenes-host]');
    var canvasCol = rootEl.querySelector('.qe-col--canvas');
    if (!fold || !host) return;

    /*
     * Expanded → hang from scenes strip.
     * Collapsed → dock flush under app header on the canvas column
     * (never on the centered stage / responsive chrome).
     */
    if (state.scenesCollapsed && canvasCol && !host.classList.contains('is-scenes-animating')) {
      if (fold.parentNode !== canvasCol) canvasCol.appendChild(fold);
      fold.classList.add('is-header-docked');
    } else {
      fold.classList.remove('is-header-docked');
      if (fold.parentNode !== host) host.appendChild(fold);
    }

    var collapsed = !!state.scenesCollapsed;
    var locked = !!state.scenesLocked;
    fold.setAttribute('data-collapsed', collapsed ? '1' : '0');
    fold.setAttribute('data-locked', locked ? '1' : '0');
    fold.classList.toggle('is-locked', locked);
    fold.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    fold.setAttribute('aria-label', scenesFoldLabel());
    fold.setAttribute('title', scenesFoldLabel());
    fold.innerHTML = scenesFoldChevronSvg();
  }

  function applyScenesCollapsed(collapsed) {
    if (state.scenesLocked) return;
    state.scenesCollapsed = !!collapsed;
    if (!rootEl) return;
    var host = rootEl.querySelector('[data-qe-scenes-host]');
    var scenes = rootEl.querySelector('[data-qe-scenes]');
    var unit = rootEl.querySelector('[data-qe-stage-unit]');
    if (host) host.classList.toggle('is-collapsed', state.scenesCollapsed);
    if (scenes) scenes.classList.remove('is-collapsed');
    if (unit) unit.classList.toggle('is-scenes-collapsed', state.scenesCollapsed);
    if (host) host.classList.add('is-scenes-animating');
    if (unit) unit.classList.add('is-scenes-animating');
    syncScenesFoldButton();
    try { fitStageWorkspace(); } catch (eFit) {}
    runScenesFitDuringTransition(host);
    try { window.dispatchEvent(new Event('resize')); } catch (eR) {}
    if (typeof QuotationBuilderView !== 'undefined' &&
        typeof QuotationBuilderView.syncChromeFoldButton === 'function') {
      try { QuotationBuilderView.syncChromeFoldButton(); } catch (eFold) { /* ignore */ }
    }
  }

  /** Design pixels == official 1920×1080 lienzo; viewport window is separate. */
  function syncDesignIdentity() {
    if (!rootEl) return;
    var win = rootEl.querySelector('[data-qe-viewport-window]');
    var vp = activeViewportSize();
    if (win) {
      win.style.width = vp.width + 'px';
      win.style.height = vp.height + 'px';
    }
  }

  var builderSceneApi = null;

  function destroyBuilderRuntimeScene() {
    if (typeof QuotationGuides !== 'undefined' && QuotationGuides.destroy) {
      try { QuotationGuides.destroy(); } catch (eG) { /* ignore */ }
    }
    destroyExperienciaOverlay();
    if (builderSceneApi && typeof builderSceneApi.destroy === 'function') {
      try { builderSceneApi.destroy(); } catch (eD) { /* ignore */ }
    }
    builderSceneApi = null;
    if (rootEl && rootEl.querySelector) {
      var host = rootEl.querySelector('[data-qe-viewport-window]');
      if (host) host.innerHTML = '';
    }
  }

  function syncGuidesSystem() {
    if (typeof QuotationGuides === 'undefined' || !QuotationGuides.sync || !rootEl) return;
    QuotationGuides.sync(rootEl, {
      getActiveScene: function () { return activeScene(); },
      getScenes: function () { return Array.isArray(state.scenes) ? state.scenes : []; },
      isHeroScene: function (sc) { return isHeroScene(sc); },
      getViewportPreset: function () { return state.viewportPreset || 'desktop'; },
      /* Guides/rulers use the active device window so % maps across Desktop/Tablet/Mobile. */
      getDesignSize: function () { return activeViewportSize(); },
      isPreviewMode: function () { return !!state.canvasPreviewMode; },
      pullOverlays: function () {
        if (expOverlay && typeof expOverlay.pull === 'function') {
          try { expOverlay.pull(); } catch (ePull) { /* ignore */ }
        }
      },
      onChange: function () { markDirtyLocal(); },
      onRulersChange: function (on) { state.rulersVisible = !!on; },
      onGuidesVisibleChange: function (on) { state.guidesVisible = !!on; },
      getOverlaySnapEnabled: function () { return !!state.overlaySnapEnabled; },
      setOverlaySnapEnabled: function (on) { setOverlaySnapEnabled(on); },
      getToolsPanelOpen: function () { return isToolsPanelOpen(); },
      getBackpackPanelOpen: function () { return isBackpackPanelOpen(); },
      toggleToolsPanel: function () { toggleToolsPanel(); },
      toggleBackpackPanel: function () { toggleBackpackPanel(); },
      openSceneBackgroundPicker: function () { openSceneBackgroundPicker(); },
      openCanvasTool: function (toolId) { openCanvasTool(toolId); },
      onGuideSelect: function () {
        deselectOverlay();
      },
      onGuideDeselect: function () { /* no-op */ },
      getOverlaySelectionCount: function () {
        if (!expOverlay || !expOverlay.getSelectionContext) return 0;
        try {
          var ctx = expOverlay.getSelectionContext();
          return ctx && ctx.count ? ctx.count : 0;
        } catch (eCnt) {
          return 0;
        }
      },
      shouldOpenOverlayContextMenu: function () {
        if (!expOverlay || !expOverlay.getSelectionContext) return false;
        try {
          var ctx = expOverlay.getSelectionContext();
          return !!(ctx && (ctx.count >= 2 || ctx.canUngroup));
        } catch (eMenu) {
          return false;
        }
      },
      openOverlaySelectionMenu: function (clientX, clientY) {
        openOverlaySelectionContextMenu(clientX, clientY);
      }
    });
    if (QuotationGuides.isRulersVisible() !== !!state.rulersVisible) {
      QuotationGuides.setRulersVisible(!!state.rulersVisible);
    }
    if (QuotationGuides.isGuidesVisible && QuotationGuides.setGuidesVisible &&
        QuotationGuides.isGuidesVisible() !== !!state.guidesVisible) {
      QuotationGuides.setGuidesVisible(!!state.guidesVisible);
    }
    syncGuidesZoomVisibility();
  }

  function syncGuidesZoomVisibility() {
    if (typeof QuotationGuides === 'undefined' || !QuotationGuides.setGuidesZoomSuppressed) return;
    var z = Number(state.canvasUserZoom) || 1;
    QuotationGuides.setGuidesZoomSuppressed(z > 1.0001);
  }

  function syncCanvasCameraFromState(cam) {
    if (cam) {
      if (cam.zoom != null) state.canvasUserZoom = cam.zoom;
      if (Number(cam.zoom) <= 1.0001) {
        state.canvasPanX = null;
        state.canvasPanY = null;
      } else {
        if (cam.panX != null) state.canvasPanX = cam.panX;
        if (cam.panY != null) state.canvasPanY = cam.panY;
      }
    }
    syncGuidesZoomVisibility();
  }

  function buildCanvasInitialCamera() {
    var cam = { zoom: Number(state.canvasUserZoom) || 1 };
    if (cam.zoom > 1.0001) {
      if (state.canvasPanX != null && !isNaN(Number(state.canvasPanX))) {
        cam.panX = Number(state.canvasPanX);
      }
      if (state.canvasPanY != null && !isNaN(Number(state.canvasPanY))) {
        cam.panY = Number(state.canvasPanY);
      }
    }
    return cam;
  }

  /**
   * Edit: Experiencia owns overlays (paintInteractions:false).
   * Preview: Runtime paints + runs interactions; no edit layer / handles.
   */
  function mountBuilderRuntimeScene() {
    if (!rootEl) return;
    if (typeof QuotationRuntime === 'undefined' || !QuotationRuntime.paintScene) {
      console.warn('[QE V7.2.65] QuotationRuntime.paintScene missing');
      return;
    }
    var host = rootEl.querySelector('[data-qe-viewport-window]');
    if (!host) return;

    var scene = state.backpackMode ? getBackpackSceneRef() : activeScene();
    if (scene) ensureSceneOverlays(scene);

    var prevCam = null;
    if (builderSceneApi && builderSceneApi.getCamera) {
      try { prevCam = builderSceneApi.getCamera(); } catch (eC) { prevCam = null; }
    }

    destroyExperienciaOverlay();
    if (builderSceneApi && builderSceneApi.destroy) {
      try { builderSceneApi.destroy(); } catch (eD) { /* ignore */ }
      builderSceneApi = null;
    }

    var preview = !!state.canvasPreviewMode;
    builderSceneApi = QuotationRuntime.paintScene(host, scene, null, {
      mode: preview ? 'preview' : 'builder',
      interactive: preview,
      enablePan: !!preview,
      allowZoom: !preview,
      middleButtonPan: !preview,
      initialCamera: preview ? null : buildCanvasInitialCamera(),
      onCameraChange: preview ? null : syncCanvasCameraFromState,
      zoomMin: CANVAS_ZOOM_MIN,
      zoomMax: CANVAS_ZOOM_MAX,
      disableHint: true,
      paintInteractions: preview,
      onAction: preview
        ? function (ix) {
            if (!ix) return true;
            var action = String(ix.action || 'goto-scene').toLowerCase();
            var target = ix.targetSceneId || null;
            if (action === 'goto-scene' || action === 'goto' || (!action && target)) {
              if (target) selectScene(target);
              return true;
            }
            if (action === 'close' || action === 'back') return true;
            return false;
          }
        : null
    });

    if (!preview && builderSceneApi && builderSceneApi.setCamera) {
      var camApply = prevCam || buildCanvasInitialCamera();
      builderSceneApi.setCamera(camApply);
      syncCanvasCameraFromState(builderSceneApi.getCamera());
    } else if (prevCam && builderSceneApi && builderSceneApi.setCamera) {
      builderSceneApi.setCamera(prevCam);
    }

    if (preview) {
      return;
    }

    var canvas = builderSceneApi && builderSceneApi.canvas;
    if (canvas && !canvas.querySelector('[data-qe-edit-layer]')) {
      var layer = document.createElement('div');
      layer.className = 'qe-canvas__edit-layer';
      layer.setAttribute('data-qe-edit-layer', '1');
      layer.setAttribute('tabindex', '0');
      layer.setAttribute('aria-label', 'Capa de interacción');
      canvas.appendChild(layer);
    }

    mountExperienciaOverlay();
    syncGuidesSystem();
  }

  function fitCanvasDesign() {
    fitStageWorkspace();
  }

  function onStageFitSignal() {
    fitStageWorkspace();
  }

  function onCanvasWheelZoom(ev) {
    if (!ev || !(ev.ctrlKey || ev.metaKey)) return;
    var t = ev.target;
    if (!t || !t.closest || !rootEl) return;
    if (!t.closest('[data-qe-canvas-fit-frame]')) return;
    ev.preventDefault();
    ev.stopPropagation();
    var hc = builderSceneApi && builderSceneApi.heroCanvas;
    if (!hc || !hc.zoomAtPoint) return;
    var factor = ev.deltaY > 0 ? (1 / CANVAS_ZOOM_WHEEL) : CANVAS_ZOOM_WHEEL;
    hc.zoomAtPoint(ev.clientX, ev.clientY, factor);
    if (builderSceneApi.getCamera) syncCanvasCameraFromState(builderSceneApi.getCamera());
  }

  function bindCanvasFit() {
    fitStageWorkspace();
    requestAnimationFrame(function () {
      fitStageWorkspace();
      requestAnimationFrame(function () {
        fitStageWorkspace();
      });
    });
    var col = rootEl && rootEl.querySelector('.qe-col--canvas');
    if (typeof ResizeObserver !== 'undefined') {
      if (stageRo) stageRo.disconnect();
      if (canvasRo) canvasRo.disconnect();
      canvasRo = null;
      stageRo = new ResizeObserver(function () {
        fitStageWorkspace();
      });
      if (col) stageRo.observe(col);
      var workspace = rootEl && (rootEl.closest('.quotation-workspace') ||
        document.querySelector('.quotation-workspace'));
      if (workspace) {
        stageRo.observe(workspace);
        var mainEl = workspace.querySelector('.quotation-main');
        if (mainEl) stageRo.observe(mainEl);
      }
      var dockEl = document.getElementById('boxiesDock');
      if (dockEl) stageRo.observe(dockEl);
    }
    if (!stageFitBound && typeof window !== 'undefined') {
      stageFitBound = true;
      window.addEventListener('resize', onStageFitSignal);
      document.addEventListener('fullscreenchange', onStageFitSignal);
      document.addEventListener('webkitfullscreenchange', onStageFitSignal);
    }
    if (!canvasWheelBound && rootEl) {
      canvasWheelBound = true;
      rootEl.addEventListener('wheel', onCanvasWheelZoom, { passive: false, capture: true });
    }
  }

  function destinationOptionsHtml(selectedId) {
    ensureScenes();
    var sceneOpts = state.scenes.map(function (sc) {
      return '<option value="' + escapeHtml(sc.id) + '"' +
        (sc.id === selectedId ? ' selected' : '') + '>' +
        escapeHtml(sc.name || 'Escena') +
      '</option>';
    }).join('');
    var contentOpts = state.content.map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '"' +
        (c.id === selectedId ? ' selected' : '') + '>' +
        escapeHtml((c.name || groupLabel(c.group)) + ' (recurso)') +
      '</option>';
    }).join('');
    return sceneOpts + contentOpts;
  }

  function segmentHtml(options, selectedId, dataAttr) {
    return '<div class="qe-segment" role="group">' +
      options.map(function (opt) {
        var on = opt.id === selectedId;
        return (
          '<button type="button" class="qe-segment__btn' + (on ? ' is-active' : '') + '"' +
            ' ' + dataAttr + '="' + escapeHtml(opt.id) + '">' +
            escapeHtml(opt.label) +
          '</button>'
        );
      }).join('') +
    '</div>';
  }

  function destinoYAccionHtml(item) {
    var showDest = !item.action || item.action === 'goto-scene';
    return '' +
      '<div class="qe-field' + (showDest ? '' : ' is-hidden') + '" data-qe-dest-wrap' +
        (showDest ? '' : ' hidden') + '>' +
        '<label for="qeItemDest">Destino</label>' +
        '<select id="qeItemDest" data-qe-item-dest>' +
          destinationOptionsHtml(item.targetSceneId || state.selectedContentId) +
        '</select>' +
        '<p class="qe-field__hint">Escena o recurso</p>' +
      '</div>' +
      (showDest ? '<div class="qe-insp__rule" aria-hidden="true"></div>' : '') +
      '<div class="qe-field">' +
        '<div class="qe-field__label">Acción</div>' +
        '<div class="qe-action-list" role="radiogroup" aria-label="Acción">' +
          ACTION_OPTIONS.map(function (opt) {
            var checked = item.action === opt.id;
            return (
              '<label class="qe-action">' +
                '<input type="radio" name="qe-action" data-qe-action="' + escapeHtml(opt.id) + '"' +
                  (checked ? ' checked' : '') + '>' +
                '<span>' + escapeHtml(opt.label) + '</span>' +
              '</label>'
            );
          }).join('') +
        '</div>' +
      '</div>';
  }

  function buttonInspectorHtml(item) {
    return '' +
      '<div class="qe-insp__editor" data-qe-detail>' +
        '<div class="qe-insp__detail-kicker">Botón</div>' +
        '<div class="qe-field">' +
          '<label for="qeItemLabel">Texto</label>' +
          '<input type="text" id="qeItemLabel" data-qe-item-label maxlength="60" value="' +
            escapeHtml(item.label || '') + '">' +
        '</div>' +
        '<div class="qe-field">' +
          '<div class="qe-field__label">Estilo</div>' +
          segmentHtml(BUTTON_STYLES, item.style || 'button', 'data-qe-item-style') +
        '</div>' +
        destinoYAccionHtml(item) +
      '</div>';
  }

  function idleInspectorHtml() {
    /* V7.2.56 — blank column only; host kept for overlay bridge. */
    return '<div class="qe-insp__exp-host qe-insp__blank" data-exp-inspector-body></div>';
  }

  function elementAsButtonItem(el) {
    var props = el.props || {};
    return {
      label: props.label || props.text || '',
      style: props.style || 'button',
      action: props.action || 'goto-scene',
      targetSceneId: props.targetSceneId || (activeScene() && activeScene().id) || ''
    };
  }

  function elementInspectorHtml(el) {
    var props = el.props || {};
    var textVal = props.text != null ? props.text : (props.label || '');
    var showText = el.type === 'text' || el.type === 'button' || el.type === 'icon' ||
      el.type === 'image';
    return '' +
      '<div class="qe-insp__editor" data-qe-detail data-qe-element-detail>' +
        '<div class="qe-insp__detail-kicker">' + escapeHtml(elementTypeLabel(el.type)) + '</div>' +
        '<div class="qe-field">' +
          '<div class="qe-field__label">Rol</div>' +
          '<p class="qe-field__hint">' + escapeHtml(el.role || '—') + '</p>' +
        '</div>' +
        (showText
          ? ('' +
            '<div class="qe-field">' +
              '<label for="qeElText">Texto</label>' +
              '<input type="text" id="qeElText" data-qe-el-text maxlength="120" value="' +
                escapeHtml(textVal) + '">' +
            '</div>')
          : '') +
        (el.type === 'image'
          ? ('' +
            '<div class="qe-field">' +
              '<label for="qeElSrc">URL imagen</label>' +
              '<input type="text" id="qeElSrc" data-qe-el-src maxlength="500" value="' +
                escapeHtml(props.src || '') + '" placeholder="https://…">' +
            '</div>')
          : '') +
        '<p class="qe-field__hint">Composición del Hero publicado — sin acciones en esta fase.</p>' +
      '</div>';
  }

  /* V7.2.66 — sliding inspector removed; props live in right rail. */
  function inspectorHtml() {
    return '';
  }

  function editorLayoutClass() {
    var cls = 'quotation-step quotation-step--editor qe-editor';
    if (state.focusMode) cls += ' is-focus';
    if (state.backpackMode) cls += ' is-backpack-mode';
    if (document.getElementById('quotationLeftBody')) cls += ' qe-editor--external-library';
    cls += ' qe-editor--canvas-only';
    return cls;
  }

  function captureUiScroll() {
    var out = {};
    var list = document.querySelector('[data-qe-content-list]');
    if (list) {
      out.libTop = list.scrollTop;
      out.libLeft = list.scrollLeft;
    }
    var track = document.querySelector('.qe-scenes__track-wrap') ||
      document.querySelector('[data-qe-scenes-track]');
    if (track) {
      scenesTrackScrollLeft = track.scrollLeft;
      out.scenesLeft = scenesTrackScrollLeft;
    } else {
      out.scenesLeft = scenesTrackScrollLeft;
    }
    return out;
  }

  function restoreScenesTrackScroll(left) {
    var target = left != null && isFinite(Number(left))
      ? Math.max(0, Number(left))
      : scenesTrackScrollLeft;
    scenesTrackScrollLeft = target;
    function apply() {
      var track = document.querySelector('.qe-scenes__track-wrap') ||
        document.querySelector('[data-qe-scenes-track]');
      if (!track) return null;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = target;
      return track;
    }
    var track = apply();
    requestAnimationFrame(function () {
      apply();
      requestAnimationFrame(function () {
        var el = apply();
        if (el) {
          /* Re-enable CSS smooth only for arrow clicks (scrollBy). */
          el.style.scrollBehavior = '';
        }
      });
    });
  }

  /** Sync pin — no deferred rAF (safe before strip reveal; avoids undoing scroll). */
  function pinScenesTrackScrollSync(left) {
    var target = left != null && isFinite(Number(left))
      ? Math.max(0, Number(left))
      : scenesTrackScrollLeft;
    scenesTrackScrollLeft = target;
    var track = getScenesTrackScrollEl();
    if (!track) return;
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = target;
    track.style.scrollBehavior = '';
  }

  function restoreLibraryScroll(saved) {
    if (!saved) return;
    var list = document.querySelector('[data-qe-content-list]');
    if (list && saved.libTop != null) {
      list.scrollTop = saved.libTop;
      list.scrollLeft = saved.libLeft || 0;
    }
  }

  function restoreUiScroll(saved) {
    if (!saved) {
      restoreScenesTrackScroll(scenesTrackScrollLeft);
      return;
    }
    restoreLibraryScroll(saved);
    restoreScenesTrackScroll(
      saved.scenesLeft != null ? saved.scenesLeft : scenesTrackScrollLeft
    );
    requestAnimationFrame(function () {
      restoreLibraryScroll(saved);
      requestAnimationFrame(function () { restoreLibraryScroll(saved); });
    });
  }

  function isLibraryPointerBusy() {
    return !!(libPointerDrag || libItemDrag || folderDrag);
  }

  function requestThumbReadyRerender() {
    if (isLibraryPointerBusy()) {
      thumbRerenderQueued = true;
      return;
    }
    if (rootEl) rerender();
  }

  function flushQueuedThumbRerender() {
    if (!thumbRerenderQueued) return;
    thumbRerenderQueued = false;
    if (rootEl && !isLibraryPointerBusy()) rerender();
  }

  function render(ctx) {
    if (ctx && typeof ctx === 'object') editorProjectCtx = ctx;
    hydrateEditorProjectCtxSlug();
    clearInvalidSelection();
    ensureScenes();
    var leftBody = document.getElementById('quotationLeftBody');
    var libHtml = contentColumnHtml();
    if (leftBody) {
      leftBody.innerHTML = libHtml || '';
      return '' +
        '<div class="' + editorLayoutClass() + '" data-qe-editor>' +
          canvasHtml() +
        '</div>';
    }
    return '' +
      '<div class="' + editorLayoutClass() + '" data-qe-editor>' +
        libHtml +
        canvasHtml() +
      '</div>';
  }

  function rerender() {
    if (!rootEl) return;
    var revealId = pendingScenesStripRevealId;
    var uiScroll = captureUiScroll();
    var host = rootEl.closest
      ? (rootEl.matches('[data-quotation-panel]') ? rootEl : rootEl.closest('[data-quotation-panel]'))
      : null;
    var panel = host || rootEl;
    panel.innerHTML = render();
    bind(panel);
    restoreLibraryScroll(uiScroll);
    if (revealId) {
      pinScenesTrackScrollSync(uiScroll.scenesLeft);
    } else {
      restoreScenesTrackScroll(
        uiScroll.scenesLeft != null ? uiScroll.scenesLeft : scenesTrackScrollLeft
      );
    }
    /* fitStageWorkspace reflows the strip — re-pin scroll after layout settles. */
    requestAnimationFrame(function () {
      if (revealId) {
        pinScenesTrackScrollSync(uiScroll.scenesLeft);
        applyScenesStripReveal(revealId);
      } else {
        restoreScenesTrackScroll(uiScroll.scenesLeft);
      }
      syncSceneGroupStripOpenState();
      if (openSceneGroupFloatId) {
        var floatAnchor = sceneGroupFloatAnchorInStrip(openSceneGroupFloatId);
        if (floatAnchor) sceneGroupFloatOpen(openSceneGroupFloatId, floatAnchor);
      }
      syncExpandedGroupPanels();
      requestAnimationFrame(function () {
        if (revealId) {
          applyScenesStripReveal(revealId);
        } else {
          restoreScenesTrackScroll(uiScroll.scenesLeft);
        }
        syncExpandedGroupPanels();
      });
    });
  }

  function selectContent(id) {
    if (!contentById(id)) return;
    state.selectedContentId = id;
    state.selectedItem = null;
    state.selectedElementId = null;
    state.sceneMenuOpen = false;
    rerender();
  }

  function selectItem(kind, id) {
    if (!kind || !id) return;
    state.selectedItem = { kind: kind, id: id };
    state.selectedElementId = null;
    rerender();
  }

  function selectElement(id) {
    var scene = activeScene();
    if (!scene || !scene.elements) return;
    var found = false;
    for (var i = 0; i < scene.elements.length; i++) {
      if (scene.elements[i].id === id) { found = true; break; }
    }
    if (!found) return;
    state.selectedElementId = id;
    state.selectedItem = null;
    if (sceneUsesProjectCover(scene)) {
      pushSelectionToRuntime();
      refreshInspectorOnly();
      return;
    }
    rerender();
  }

  function selectScene(id) {
    if (!sceneById(id)) return;
    var wasBackpack = !!state.backpackMode;
    if (wasBackpack) {
      if (expOverlay && typeof expOverlay.pull === 'function') {
        try { expOverlay.pull(); } catch (ePull) { /* ignore */ }
      }
      state.backpackMode = false;
      state.backpackReturnSceneId = null;
    }
    var same = state.activeSceneId === id;
    state.activeSceneId = id;
    state.selectedElementId = null;
    state.expHasSelection = false;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.inspectorCollapsed = true;
    try {
      document.documentElement.style.setProperty('--qe-inspector-w', '0px');
    } catch (eW) {}
    /* Same scene: skip rerender unless leaving backpack (restore chrome). */
    if (same && !wasBackpack) return;
    rerender();
  }

  /** Horizontal scroll container for the scenes strip (wrap, not inner track). */
  function getScenesTrackScrollEl() {
    if (rootEl) {
      var wrap = rootEl.querySelector('.qe-scenes__track-wrap');
      if (wrap) return wrap;
    }
    return document.querySelector('.qe-scenes__track-wrap') ||
      document.querySelector('[data-qe-scenes-track]');
  }

  function queueScenesStripReveal(itemId) {
    if (!itemId) return;
    pendingScenesStripRevealId = String(itemId);
    scenesStripRevealUntil = Date.now() + 900;
  }

  function findScenesStripItemEl(itemId) {
    var scrollEl = getScenesTrackScrollEl();
    if (!scrollEl || !itemId) return null;
    var track = scrollEl.querySelector('[data-qe-scenes-track]') || scrollEl;
    var sid = String(itemId);
    var sceneBtns = track.querySelectorAll('[data-qe-scene]');
    var i;
    for (i = 0; i < sceneBtns.length; i++) {
      if (sceneBtns[i].getAttribute('data-qe-scene') === sid) {
        return sceneBtns[i].closest('.qe-scenes__thumb-wrap') || sceneBtns[i];
      }
    }
    var blocks = track.querySelectorAll('[data-qe-scene-group-block]');
    for (i = 0; i < blocks.length; i++) {
      if (blocks[i].getAttribute('data-qe-scene-group-block') === sid) {
        return blocks[i];
      }
    }
    return null;
  }

  function sceneStripItemOffsetLeft(scrollEl, itemEl) {
    var track = scrollEl.querySelector('[data-qe-scenes-track]') || scrollEl;
    var left = 0;
    var node = itemEl;
    while (node && node !== track) {
      left += node.offsetLeft || 0;
      node = node.parentElement;
    }
    return left;
  }

  /** Scroll strip so a scene thumb or group folder is visible (e.g. after create). */
  function scrollScenesStripItemIntoView(itemId, opts) {
    opts = opts || {};
    var scrollEl = getScenesTrackScrollEl();
    var itemEl = findScenesStripItemEl(itemId);
    if (!scrollEl || !itemEl) return false;
    var pad = 12;
    var prev = scrollEl.style.scrollBehavior;
    var current = scrollEl.scrollLeft;
    var maxScroll = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);

    if (opts.revealOnlyRight) {
      var itemLeft = sceneStripItemOffsetLeft(scrollEl, itemEl);
      var itemWidth = itemEl.offsetWidth || itemEl.getBoundingClientRect().width;
      var needed = itemLeft + itemWidth - scrollEl.clientWidth + pad;
      if (needed > current + 1) {
        scrollEl.style.scrollBehavior = opts.smooth === false ? 'auto' : 'smooth';
        scrollEl.scrollLeft = Math.min(needed, maxScroll);
        scenesTrackScrollLeft = scrollEl.scrollLeft;
      }
      scrollEl.style.scrollBehavior = prev || '';
      return true;
    }

    scrollEl.style.scrollBehavior = opts.smooth === false ? 'auto' : 'smooth';
    var scrollRect = scrollEl.getBoundingClientRect();
    var itemRect = itemEl.getBoundingClientRect();
    if (itemRect.right > scrollRect.right - pad) {
      scrollEl.scrollLeft += itemRect.right - scrollRect.right + pad;
    } else if (itemRect.left < scrollRect.left + pad) {
      scrollEl.scrollLeft += itemRect.left - scrollRect.left - pad;
    }
    scenesTrackScrollLeft = scrollEl.scrollLeft;
    scrollEl.style.scrollBehavior = prev || '';
    return true;
  }

  function flashScenesStripItem(itemId) {
    var itemEl = findScenesStripItemEl(itemId);
    if (!itemEl) return;
    var target = itemEl.classList.contains('qe-scenes__group-block')
      ? itemEl
      : (itemEl.closest('.qe-scenes__thumb-wrap') || itemEl);
    target.classList.add('is-strip-reveal');
    if (scenesStripFlashTimer) {
      try { clearTimeout(scenesStripFlashTimer); } catch (eClr) { /* ignore */ }
    }
    scenesStripFlashTimer = setTimeout(function () {
      target.classList.remove('is-strip-reveal');
      scenesStripFlashTimer = null;
    }, 1600);
  }

  function applyScenesStripReveal(itemId) {
    if (!itemId) return;
    scrollScenesStripItemIntoView(itemId, { revealOnlyRight: true });
    flashScenesStripItem(itemId);
    pendingScenesStripRevealId = null;
    scenesStripRevealUntil = Date.now() + 900;
    var scrollEl = getScenesTrackScrollEl();
    if (scrollEl) scenesTrackScrollLeft = scrollEl.scrollLeft;
  }

  /** Keep the active scene thumb visible inside the horizontal strip. */
  function scrollActiveSceneThumbIntoView() {
    var scrollEl = getScenesTrackScrollEl();
    if (!scrollEl) return;
    var track = scrollEl.querySelector('[data-qe-scenes-track]') || scrollEl;
    var active = track.querySelector('.qe-scenes__thumb.is-active');
    if (!active) return;
    var wrap = active.closest('.qe-scenes__thumb-wrap') || active;
    var scrollRect = scrollEl.getBoundingClientRect();
    var wrapRect = wrap.getBoundingClientRect();
    var pad = 10;
    var prev = scrollEl.style.scrollBehavior;
    scrollEl.style.scrollBehavior = 'auto';
    if (wrapRect.left < scrollRect.left + pad) {
      scrollEl.scrollLeft += wrapRect.left - scrollRect.left - pad;
    } else if (wrapRect.right > scrollRect.right - pad) {
      scrollEl.scrollLeft += wrapRect.right - scrollRect.right + pad;
    }
    scenesTrackScrollLeft = scrollEl.scrollLeft;
    scrollEl.style.scrollBehavior = prev || '';
  }

  /** ← / → scene navigation. Returns true when a different scene was selected. */
  function navigateSceneByDelta(delta) {
    ensureScenes();
    if (!state.scenes || state.scenes.length < 2) return false;
    var idx = -1;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].id === state.activeSceneId) {
        idx = i;
        break;
      }
    }
    if (idx < 0) idx = 0;
    var next = idx + (delta < 0 ? -1 : 1);
    if (next < 0 || next >= state.scenes.length) return false;
    var sc = state.scenes[next];
    if (!sc) return false;
    selectScene(sc.id);
    requestAnimationFrame(function () {
      scrollActiveSceneThumbIntoView();
      requestAnimationFrame(scrollActiveSceneThumbIntoView);
    });
    return true;
  }

  function renameScene(id, name) {
    var sc = sceneById(id);
    if (!sc || isHeroScene(sc)) return;
    var next = String(name == null ? '' : name).trim();
    if (!next || sc.name === next) return;
    sc.name = next;
    markDirtyLocal();
  }

  function beginSceneRename(id, spanEl) {
    var sid = String(id || '').trim();
    var sc = sceneById(sid);
    if (!sc || isHeroScene(sc) || !rootEl) return false;
    var span = (spanEl && spanEl.isConnected) ? spanEl : null;
    if (!span) {
      rootEl.querySelectorAll('[data-qe-scene-name]').forEach(function (el) {
        if (!span && el.getAttribute('data-qe-scene-name') === sid) span = el;
      });
    }
    if (!span) return false;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'qe-scenes__thumb-name-input';
    input.value = sc.name || '';
    input.setAttribute('aria-label', 'Nombre de escena');
    input.setAttribute('data-qe-scene-name-input', sid);
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      if (save) renameScene(sid, input.value);
      rerender();
    }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        finish(true);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', function () { finish(true); });
    input.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    });
    input.addEventListener('mousedown', function (ev) {
      ev.stopPropagation();
    });
    input.addEventListener('dblclick', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    });
    span.replaceWith(input);
    input.focus();
    input.select();
    return true;
  }

  function reorderScene(fromId, toId, placeAfter) {
    ensureScenes();
    var from = String(fromId || '');
    var to = String(toId || '');
    if (!from || !to || from === to) return;
    var fromSc = sceneById(from);
    var toSc = sceneById(to);
    /* HERO stays pinned at index 0 — cannot drag it or drop before it. */
    if (isHeroScene(fromSc)) return;
    if (!placeAfter && isHeroScene(toSc)) return;
    var fromIdx = -1;
    var toIdx = -1;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (!state.scenes[i]) continue;
      if (fromIdx < 0 && state.scenes[i].id === from) fromIdx = i;
      if (toIdx < 0 && state.scenes[i].id === to) toIdx = i;
    }
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    var moved = state.scenes.splice(fromIdx, 1)[0];
    var insertAt = -1;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].id === to) {
        insertAt = placeAfter ? i + 1 : i;
        break;
      }
    }
    if (insertAt < 0) {
      state.scenes.splice(fromIdx, 0, moved);
      return;
    }
    if (insertAt < 1) insertAt = 1;
    state.scenes.splice(insertAt, 0, moved);
    ensureHeroSceneContract();
    markDirtyLocal();
  }

  function sceneReorderUsesVerticalAxis(wrap) {
    if (!wrap || !wrap.classList) return false;
    if (wrap.classList.contains('is-in-group') || wrap.classList.contains('is-in-panel')) {
      return true;
    }
    return !!(wrap.closest && wrap.closest('.qe-scenes-group-float__scroll'));
  }

  function sceneReorderPlaceAfter(wrap, e) {
    var rect = wrap.getBoundingClientRect();
    if (sceneReorderUsesVerticalAxis(wrap)) {
      return e.clientY > rect.top + rect.height / 2;
    }
    return e.clientX > rect.left + rect.width / 2;
  }

  function clearSceneReorderIndicators(root) {
    var scope = root || document;
    scope.querySelectorAll(
      '.qe-scenes__thumb-wrap.is-scene-reorder-before, .qe-scenes__thumb-wrap.is-scene-reorder-after'
    ).forEach(function (el) {
      el.classList.remove('is-scene-reorder-before', 'is-scene-reorder-after');
    });
  }

  function bindSceneNameEditing(editor) {
    if (!editor) return;
    var roots = [editor];
    var portal = document.getElementById('qeScenesGroupPortal');
    if (portal && portal.childElementCount) roots.push(portal);
    var clickTimer = null;
    roots.forEach(function (root) {
    root.querySelectorAll('.qe-scenes__thumb-name').forEach(function (span) {
      var locked = span.getAttribute('data-qe-scene-name-locked') === '1';
      var id = span.getAttribute('data-qe-scene-name');

      span.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var wrap = span.closest('[data-qe-drop-scene-id]');
        var sid = (wrap && wrap.getAttribute('data-qe-drop-scene-id')) || id;
        if (!sid) return;
        /* Delay select so a dblclick can open rename without a mid-flight rerender. */
        if (clickTimer) {
          try { clearTimeout(clickTimer); } catch (eT) {}
          clickTimer = null;
        }
        if (locked || !id) {
          selectScene(sid);
          return;
        }
        clickTimer = setTimeout(function () {
          clickTimer = null;
          selectScene(sid);
        }, 520);
      });

      if (locked || !id) return;

      span.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (clickTimer) {
          try { clearTimeout(clickTimer); } catch (eT2) {}
          clickTimer = null;
        }
        beginSceneRename(id, span);
      });
    });
    });
  }

  function bindSceneDragReorder(editor) {
    if (!editor) return;
    var track = editor.querySelector('[data-qe-scenes-track]');
    if (!track) return;
    var portal = document.getElementById('qeScenesGroupPortal');
    var containers = [track];
    if (portal && portal.childElementCount) containers.push(portal);
    var dragId = null;
    var dropHint = null;

    function clearReorderIndicators() {
      clearSceneReorderIndicators(track);
      if (portal) clearSceneReorderIndicators(portal);
    }

    containers.forEach(function (container) {
    container.querySelectorAll('[data-qe-scene-drag]').forEach(function (thumb) {
      if (thumb.dataset.qeDragBound === '1') return;
      thumb.dataset.qeDragBound = '1';
      thumb.addEventListener('dragstart', function (e) {
        dragId = thumb.getAttribute('data-qe-scene-drag');
        dropHint = null;
        var wrap = thumb.closest('.qe-scenes__thumb-wrap');
        if (wrap) wrap.classList.add('is-dragging');
        thumb.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/qe-scene', dragId || ''); } catch (e1) {}
          /* Avoid text/plain = scene id (library drop zones would treat it as a resource). */
          try { e.dataTransfer.setData('text/plain', 'qe-scene'); } catch (ePlain) {}
        }
      });
      thumb.addEventListener('dragend', function () {
        var wrap = thumb.closest('.qe-scenes__thumb-wrap');
        if (wrap) wrap.classList.remove('is-dragging');
        thumb.classList.remove('is-dragging');
        clearReorderIndicators();
        track.querySelectorAll('.is-drop-target').forEach(function (el) {
          el.classList.remove('is-drop-target');
        });
        if (portal) {
          portal.querySelectorAll('.is-drop-target').forEach(function (el) {
            el.classList.remove('is-drop-target');
          });
        }
        dragId = null;
        dropHint = null;
      });
    });

    container.querySelectorAll('[data-qe-scene-drop]').forEach(function (wrap) {
      if (wrap.dataset.qeDropBound === '1') return;
      wrap.dataset.qeDropBound = '1';
      wrap.addEventListener('dragover', function (e) {
        if (!dragId) return;
        var toId = wrap.getAttribute('data-qe-scene-drop');
        if (!toId || toId === dragId) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        clearReorderIndicators();
        var after = sceneReorderPlaceAfter(wrap, e);
        wrap.classList.add(after ? 'is-scene-reorder-after' : 'is-scene-reorder-before');
        dropHint = { toId: toId, after: after };
      });
      wrap.addEventListener('dragleave', function (e) {
        var related = e.relatedTarget;
        if (related && wrap.contains(related)) return;
        /* Keep dropHint — relatedTarget is often null over the drag ghost. */
        wrap.classList.remove('is-scene-reorder-before', 'is-scene-reorder-after');
      });
      wrap.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearReorderIndicators();
        wrap.classList.remove('is-drop-target');
        var from = dragId || '';
        if (!from && e.dataTransfer) {
          try { from = e.dataTransfer.getData('text/qe-scene') || ''; } catch (e2) {}
        }
        var to = (dropHint && dropHint.toId) || wrap.getAttribute('data-qe-scene-drop');
        var after = !!(dropHint && dropHint.after);
        if (!dropHint) {
          after = sceneReorderPlaceAfter(wrap, e);
        }
        dropHint = null;
        if (from && to && from !== to && from !== 'qe-scene') {
          var ids = selectedSceneIdsForDrag(from);
          if (ids.length > 1) {
            ids.forEach(function (sid) {
              reorderSceneTrack(sid, to, after);
            });
            clearSceneSelection();
          } else {
            reorderSceneTrack(from, to, after);
          }
          rerender();
        }
      });
    });
    });

    var groupDropZones = track.querySelectorAll('[data-qe-scene-group-drop]');
    if (portal) {
      portal.querySelectorAll('[data-qe-scene-group-drop]').forEach(function (zone) {
        bindGroupDropZone(zone);
      });
    }
    groupDropZones.forEach(function (zone) {
      bindGroupDropZone(zone);
    });

    function bindGroupDropZone(zone) {
    if (zone.dataset.qeGroupDropBound === '1') return;
    zone.dataset.qeGroupDropBound = '1';
    zone.addEventListener('dragover', function (e) {
        if (!dragId) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        zone.classList.add('is-drop-target');
      });
      zone.addEventListener('dragleave', function (e) {
        var related = e.relatedTarget;
        if (related && zone.contains(related)) return;
        zone.classList.remove('is-drop-target');
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('is-drop-target');
        var from = dragId || '';
        if (!from && e.dataTransfer) {
          try { from = e.dataTransfer.getData('text/qe-scene') || ''; } catch (e2) {}
        }
        var groupId = zone.getAttribute('data-qe-scene-group-drop');
        if (!from || !groupId) return;
        var ids = selectedSceneIdsForDrag(from);
        addScenesToGroup(groupId, ids, {});
        clearSceneSelection();
        rerender();
      });
    }
  }

  function isSceneReorderDragActive(e) {
    if (document.querySelector('.qe-scenes__thumb.is-dragging, .qe-scenes__thumb-wrap.is-dragging')) {
      return true;
    }
    var types = e && e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    var i;
    for (i = 0; i < types.length; i++) {
      if (String(types[i]).toLowerCase() === 'text/qe-scene') return true;
    }
    return false;
  }

  function closeAllFolderMenus() {
    closeAllLibMenus();
  }

  function ensureLibMenuPortal() {
    var el = document.getElementById('qeLibMenuPortal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'qeLibMenuPortal';
      el.className = 'qe-lib-menu-portal';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function closeAllLibMenus() {
    var portal = document.getElementById('qeLibMenuPortal');
    if (portal) {
      portal.innerHTML = '';
      portal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('[data-qe-lib-menu]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-qe-lib-select-mode]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-qe-lib-status]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('is-active');
    });
    state.libraryStatusOpen = false;
  }

  function positionLibMenuPanel(btn, panel) {
    if (!btn || !panel) return;
    var rect = btn.getBoundingClientRect();
    var width = Math.max(168, panel.offsetWidth || 168);
    var height = panel.offsetHeight || 0;
    var left = Math.min(rect.right - width, window.innerWidth - width - 8);
    if (left < 8) left = 8;
    var top = rect.bottom + 6;
    if (height && top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - 6);
    }
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  function positionLibMenuAtPoint(panel, x, y) {
    if (!panel) return;
    var width = Math.max(168, panel.offsetWidth || 168);
    var height = panel.offsetHeight || 0;
    var left = Number(x) || 0;
    var top = Number(y) || 0;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    if (height && top + height > window.innerHeight - 8) {
      top = Math.max(8, top - height);
    }
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  function libMenuFolderOnlyOptionsHtml(id) {
    var item = contentById(id);
    if (!item) return '';
    var groupId = item.group;
    var rows = '' +
      '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
        ' data-qe-lib-menu-move-folder="">Raíz del grupo</button>';
    foldersInGroup(groupId).forEach(function (f) {
      if (!f) return;
      rows += '' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-move-folder="' + escapeHtml(f.id) + '">' +
          escapeHtml(f.name || 'Carpeta') +
        '</button>';
    });
    return rows;
  }

  function buildContentContextMenuHtml(id) {
    var ids = contextActionContentIds(id);
    var n = ids.length;
    var delLabel = n > 1 ? ('Eliminar (' + n + ')') : 'Eliminar';
    return '' +
      '<div class="qe-lib-menu__main" data-qe-lib-menu-main>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="move-folder">Mover de carpeta</button>' +
        '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
        '<button type="button" class="boxies-workspace-menu__item qe-lib-menu__danger" role="menuitem"' +
          ' data-qe-lib-menu-action="delete">' + escapeHtml(delLabel) + '</button>' +
      '</div>' +
      '<div class="qe-lib-menu__move" data-qe-lib-menu-move hidden>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="move-back">← Volver</button>' +
        '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
        '<p class="qe-lib-menu__hint">Mover a</p>' +
        libMenuFolderOnlyOptionsHtml(id) +
      '</div>';
  }

  function openContentContextMenu(contentId, clientX, clientY) {
    if (!contentById(contentId)) return;
    closeAllLibMenus();
    var portal = ensureLibMenuPortal();
    portal.setAttribute('aria-hidden', 'false');
    var panel = document.createElement('div');
    panel.className = 'boxies-workspace-menu__panel qe-lib-menu-panel qe-lib-context-menu';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('data-qe-lib-menu-panel', '1');
    panel.setAttribute('data-qe-lib-context-menu', '1');
    panel.setAttribute('data-qe-lib-menu-kind', 'content');
    panel.setAttribute('data-qe-lib-menu-target', contentId);
    panel.innerHTML = buildContentContextMenuHtml(contentId);
    portal.appendChild(panel);
    positionLibMenuAtPoint(panel, clientX, clientY);
    bindContentContextMenuPanel(panel, contentId, clientX, clientY);
  }

  function bindContentContextMenuPanel(panel, contentId, clientX, clientY) {
    if (!panel) return;
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    panel.querySelectorAll('[data-qe-lib-menu-action]').forEach(function (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var action = actionBtn.getAttribute('data-qe-lib-menu-action');
        if (action === 'move-folder') {
          var main = panel.querySelector('[data-qe-lib-menu-main]');
          var move = panel.querySelector('[data-qe-lib-menu-move]');
          if (main) main.hidden = true;
          if (move) move.hidden = false;
          positionLibMenuAtPoint(panel, clientX, clientY);
          return;
        }
        if (action === 'move-back') {
          var mainBack = panel.querySelector('[data-qe-lib-menu-main]');
          var moveBack = panel.querySelector('[data-qe-lib-menu-move]');
          if (mainBack) mainBack.hidden = false;
          if (moveBack) moveBack.hidden = true;
          positionLibMenuAtPoint(panel, clientX, clientY);
          return;
        }
        if (action === 'delete') {
          closeAllLibMenus();
          var ids = contextActionContentIds(contentId);
          var item = contentById(contentId);
          if (ids.length > 1 && item) {
            ensureLibrarySelectMode(item.group);
            ids.forEach(function (id) { state.librarySelectedIds[id] = true; });
            removeSelectedLibraryResources(item.group);
          } else {
            removeLibraryResource(contentId);
          }
        }
      });
    });

    panel.querySelectorAll('[data-qe-lib-menu-move-folder]').forEach(function (moveBtn) {
      moveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var folderId = moveBtn.getAttribute('data-qe-lib-menu-move-folder');
        closeAllLibMenus();
        moveLibraryItemsToFolder(contextActionContentIds(contentId), folderId || null);
      });
    });
  }

  function libMenuMoveOptionsHtml(kind, id) {
    if (kind === 'folder') {
      var folder = folderById(id);
      var currentGroup = folder ? folder.group : '';
      return CONTENT_GROUPS.map(function (g) {
        if (!g || g.id === currentGroup) return '';
        return '' +
          '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
            ' data-qe-lib-menu-move="' + escapeHtml(g.id) + '">' +
            escapeHtml(g.label) +
          '</button>';
      }).join('');
    }

    var item = contentById(id);
    if (!item) return '';
    var groupId = item.group;
    var rows = '' +
      '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
        ' data-qe-lib-menu-move-folder="">Raíz del grupo</button>';
    foldersInGroup(groupId).forEach(function (f) {
      if (!f || String(f.id) === String(item.folderId || '')) return;
      rows += '' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-move-folder="' + escapeHtml(f.id) + '">' +
          escapeHtml(f.name || 'Carpeta') +
        '</button>';
    });
    rows += '<div class="boxies-workspace-menu__sep" role="separator"></div>';
    rows += '<p class="qe-lib-menu__hint">Categoría</p>';
    CONTENT_GROUPS.forEach(function (g) {
      if (!g || g.id === groupId) return;
      rows += '' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-move-group="' + escapeHtml(g.id) + '">' +
          escapeHtml(g.label) +
        '</button>';
    });
    return rows;
  }

  function buildLibMenuPanelHtml(kind, id) {
    return '' +
      '<div class="qe-lib-menu__main" data-qe-lib-menu-main>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="rename">Renombrar</button>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="duplicate">Duplicar</button>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="move">Mover</button>' +
        '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
        '<button type="button" class="boxies-workspace-menu__item qe-lib-menu__danger" role="menuitem"' +
          ' data-qe-lib-menu-action="delete">Eliminar</button>' +
      '</div>' +
      '<div class="qe-lib-menu__move" data-qe-lib-menu-move hidden>' +
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-qe-lib-menu-action="move-back">← Volver</button>' +
        '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
        '<p class="qe-lib-menu__hint">Mover a</p>' +
        libMenuMoveOptionsHtml(kind, id) +
      '</div>';
  }

  function openLibMenu(btn) {
    if (!btn) return;
    var kind = btn.getAttribute('data-qe-lib-menu');
    var id = btn.getAttribute('data-qe-lib-menu-id');
    if (!kind || !id) return;
    var wasOpen = btn.getAttribute('aria-expanded') === 'true';
    closeAllLibMenus();
    if (wasOpen) return;

    var portal = ensureLibMenuPortal();
    portal.setAttribute('aria-hidden', 'false');
    var panel = document.createElement('div');
    panel.className = 'boxies-workspace-menu__panel qe-lib-menu-panel';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('data-qe-lib-menu-panel', '1');
    panel.setAttribute('data-qe-lib-menu-kind', kind);
    panel.setAttribute('data-qe-lib-menu-target', id);
    panel.innerHTML = buildLibMenuPanelHtml(kind, id);
    portal.appendChild(panel);
    btn.setAttribute('aria-expanded', 'true');
    positionLibMenuPanel(btn, panel);
    bindLibMenuPanel(panel, kind, id, btn);
  }

  function bindLibMenuPanel(panel, kind, id, triggerBtn) {
    if (!panel) return;

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    panel.querySelectorAll('[data-qe-lib-menu-action]').forEach(function (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var action = actionBtn.getAttribute('data-qe-lib-menu-action');
        if (action === 'move') {
          var main = panel.querySelector('[data-qe-lib-menu-main]');
          var move = panel.querySelector('[data-qe-lib-menu-move]');
          if (main) main.hidden = true;
          if (move) move.hidden = false;
          positionLibMenuPanel(triggerBtn, panel);
          return;
        }
        if (action === 'move-back') {
          var mainBack = panel.querySelector('[data-qe-lib-menu-main]');
          var moveBack = panel.querySelector('[data-qe-lib-menu-move]');
          if (mainBack) mainBack.hidden = false;
          if (moveBack) moveBack.hidden = true;
          positionLibMenuPanel(triggerBtn, panel);
          return;
        }
        closeAllLibMenus();
        if (kind === 'folder') {
          if (action === 'rename') startRenameFolder(id);
          else if (action === 'duplicate') duplicateFolder(id);
          else if (action === 'delete') deleteFolder(id);
        } else {
          if (action === 'rename') startRenameContent(id);
          else if (action === 'duplicate') duplicateContent(id);
          else if (action === 'delete') removeLibraryResource(id);
        }
      });
    });

    panel.querySelectorAll('[data-qe-lib-menu-move]').forEach(function (moveBtn) {
      moveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var target = moveBtn.getAttribute('data-qe-lib-menu-move');
        closeAllLibMenus();
        if (kind === 'folder' && target) moveFolderToGroup(id, target);
      });
    });

    panel.querySelectorAll('[data-qe-lib-menu-move-folder]').forEach(function (moveBtn) {
      moveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var folderId = moveBtn.getAttribute('data-qe-lib-menu-move-folder');
        closeAllLibMenus();
        moveLibraryItemToFolder(id, folderId || null);
      });
    });

    panel.querySelectorAll('[data-qe-lib-menu-move-group]').forEach(function (moveBtn) {
      moveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var groupId = moveBtn.getAttribute('data-qe-lib-menu-move-group');
        closeAllLibMenus();
        moveContentToGroup(id, groupId);
      });
    });
  }

  function bindLibMenus() {
    closeAllLibMenus();
    document.querySelectorAll('[data-qe-lib-menu]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLibMenu(btn);
      });
      btn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
      });
    });

    if (!bindLibMenus._docBound) {
      bindLibMenus._docBound = true;
      document.addEventListener('click', function (e) {
        var t = e.target;
        var inMenu = t && t.closest && (
          t.closest('[data-qe-lib-menu]') ||
          t.closest('[data-qe-lib-menu-panel]') ||
          t.closest('[data-qe-lib-status]') ||
          t.closest('[data-qe-lib-select-mode]') ||
          t.closest('[data-qe-lib-select-panel]') ||
          t.closest('#qeLibMenuPortal')
        );
        if (!inMenu) closeAllLibMenus();

        if (state.librarySelectModeGroup) {
          var inSelectUi = t && t.closest && (
            t.closest('[data-qe-lib-select-mode]') ||
            t.closest('[data-qe-lib-check]') ||
            t.closest('[data-qe-lib-check-wrap]') ||
            t.closest('[data-qe-lib-select-all]') ||
            t.closest('.qe-lib__item.is-select-mode') ||
            t.closest('[data-qe-lib-select-panel]') ||
            t.closest('[data-qe-lib-context-menu]') ||
            t.closest('#qeLibMenuPortal') ||
            t.closest('.qe-content__group.is-selecting')
          );
          if (!inSelectUi) {
            clearLibrarySelectionMode();
            rerender();
          }
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        closeAllLibMenus();
        if (state.librarySelectModeGroup) {
          clearLibrarySelectionMode();
          rerender();
        }
      });
      window.addEventListener('resize', closeAllLibMenus);
      window.addEventListener('scroll', closeAllLibMenus, true);
    }
  }

  function bindFolderMenus() {
    bindLibMenus();
  }

  function startRenameContent(contentId) {
    if (!contentById(contentId)) return;
    state.renamingContentId = contentId;
    state.renamingFolderId = null;
    rerender();
    setTimeout(function () {
      var input = document.querySelector('[data-qe-content-rename="' + contentId + '"]');
      if (!input) return;
      input.focus();
      try { input.select(); } catch (eSel) {}
    }, 0);
  }

  function renameContent(contentId, name) {
    var item = contentById(contentId);
    if (!item) return;
    var next = String(name == null ? '' : name).trim();
    state.renamingContentId = null;
    if (!next || next === item.name) {
      rerender();
      return;
    }
    item.name = next;
    markDirtyLocal();
    rerender();
  }

  function cancelRenameContent() {
    if (!state.renamingContentId) return;
    state.renamingContentId = null;
    rerender();
  }

  function uniqueContentCopyName(baseName, groupId) {
    var base = String(baseName || 'Archivo').trim() || 'Archivo';
    var names = {};
    contentInGroup(groupId).forEach(function (c) {
      names[String(c.name || '').trim().toLowerCase()] = true;
    });
    var candidate = base + ' copia';
    if (!names[candidate.toLowerCase()]) return candidate;
    var n = 2;
    while (names[(candidate + ' (' + n + ')').toLowerCase()]) n += 1;
    return candidate + ' (' + n + ')';
  }

  function duplicateContent(contentId) {
    var item = contentById(contentId);
    if (!item) return;
    var copy = {
      id: nextId('ct'),
      group: item.group,
      folderId: item.folderId || null,
      name: uniqueContentCopyName(item.name, item.group),
      media: item.media || 'image',
      mime: item.mime || null,
      previewUrl: item.previewUrl || item.publicUrl || item.remoteUrl || null,
      remoteUrl: item.remoteUrl || item.publicUrl || null,
      publicUrl: item.publicUrl || item.remoteUrl || null,
      storagePath: item.storagePath || null,
      provider: item.provider || null,
      archivoId: null,
      projectId: item.projectId || resolveProjectId() || null,
      uploadStatus: item.uploadStatus || (item.publicUrl || item.remoteUrl ? 'ready' : null),
      sizeBytes: itemByteSize(item) || 0,
      file: null
    };
    state.content.push(copy);
    ensureItems(copy.id);
    state.selectedContentId = copy.id;
    if (copy.folderId) state.openFolders[copy.folderId] = true;
    state.openGroups[copy.group] = true;
    markDirtyLocal();
    rerender();
  }

  function moveContentToGroup(contentId, targetGroupId) {
    var item = contentById(contentId);
    var meta = groupMeta(targetGroupId);
    if (!item || !meta || String(item.group) === String(targetGroupId)) return;
    item.group = targetGroupId;
    item.folderId = null;
    state.openGroups[targetGroupId] = true;
    markDirtyLocal();
    rerender();
  }

  function bindFolderRenameInputs() {
    document.querySelectorAll('[data-qe-folder-rename]').forEach(function (input) {
      var folderId = input.getAttribute('data-qe-folder-rename');
      var committed = false;
      function commit() {
        if (committed) return;
        committed = true;
        renameFolder(folderId, input.value);
      }
      function cancel() {
        if (committed) return;
        committed = true;
        cancelRenameFolder();
      }
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        }
      });
      input.addEventListener('blur', function () { commit(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    });

    document.querySelectorAll('[data-qe-content-rename]').forEach(function (input) {
      var contentId = input.getAttribute('data-qe-content-rename');
      var committed = false;
      function commit() {
        if (committed) return;
        committed = true;
        renameContent(contentId, input.value);
      }
      function cancel() {
        if (committed) return;
        committed = true;
        cancelRenameContent();
      }
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancel();
        }
      });
      input.addEventListener('blur', function () { commit(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    });
  }

  function bindFolderDragReorder() {
    function clearFolderDropMarks() {
      document.querySelectorAll('.qe-folder, .qe-folder__head').forEach(function (el) {
        el.classList.remove('is-drop-before', 'is-drop-after');
      });
      document.querySelectorAll('.qe-folder-insert').forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll('.qe-content__folders.is-reordering').forEach(function (el) {
        el.classList.remove('is-reordering');
      });
    }

    function folderBlocksInList(list) {
      if (!list) return [];
      return Array.prototype.slice.call(list.children).filter(function (el) {
        return el && el.getAttribute && el.getAttribute('data-qe-folder-block');
      });
    }

    /**
     * Insert index among folders excluding the dragged one, based on pointer Y
     * vs each folder HEAD (not the open body).
     */
    function folderInsertIndexAtY(list, clientY, dragId) {
      var blocks = folderBlocksInList(list).filter(function (block) {
        return String(block.getAttribute('data-qe-folder-block')) !== String(dragId);
      });
      var i;
      for (i = 0; i < blocks.length; i++) {
        var head = blocks[i].querySelector('[data-qe-folder-drag]') || blocks[i];
        var rect = head.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return blocks.length;
    }

    function paintFolderInsertMarker(list, insertAt, dragId) {
      document.querySelectorAll('.qe-folder-insert').forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      var marker = document.createElement('div');
      marker.className = 'qe-folder-insert';
      marker.setAttribute('aria-hidden', 'true');
      var blocks = folderBlocksInList(list).filter(function (block) {
        return String(block.getAttribute('data-qe-folder-block')) !== String(dragId);
      });
      if (insertAt <= 0 || !blocks.length) {
        list.insertBefore(marker, list.firstChild);
      } else if (insertAt >= blocks.length) {
        list.appendChild(marker);
      } else {
        list.insertBefore(marker, blocks[insertAt]);
      }
    }

    document.querySelectorAll('[data-qe-folder-drag]').forEach(function (head) {
      head.addEventListener('dragstart', function (e) {
        if (e.target && e.target.closest && (
          e.target.closest('[data-qe-lib-menu]') ||
          e.target.closest('[data-qe-folder-rename]') ||
          e.target.closest('.qe-lib__item')
        )) {
          return;
        }
        e.stopPropagation();
        libItemDrag = null;
        var id = head.getAttribute('data-qe-folder-drag');
        var folder = folderById(id);
        if (!id || !folder) return;
        var list = head.closest('[data-qe-folder-list]');
        folderDrag = {
          id: String(id),
          group: folder.group || null,
          insertAt: null,
          list: list || null
        };
        var block = head.closest('[data-qe-folder-block]') || head;
        block.classList.add('is-dragging');
        head.classList.add('is-dragging');
        /* Defer compact mode so the drag source is not mutated in the same turn. */
        if (list) {
          requestAnimationFrame(function () {
            if (folderDrag && folderDrag.id === String(id) && list.isConnected) {
              list.classList.add('is-reordering');
            }
          });
        }
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/qe-folder', id); } catch (e1) {}
          e.dataTransfer.setData('text/plain', id);
        }
      });

      head.addEventListener('dragend', function () {
        folderDrag = null;
        suppressFolderToggleUntil = Date.now() + 350;
        document.querySelectorAll('.qe-folder.is-dragging, .qe-folder__head.is-dragging').forEach(function (node) {
          node.classList.remove('is-dragging');
        });
        clearFolderDropMarks();
        flushQueuedThumbRerender();
      });
    });

    document.querySelectorAll('[data-qe-folder-list]').forEach(function (list) {
      var groupId = list.getAttribute('data-qe-folder-list');

      list.addEventListener('dragover', function (e) {
        if (libItemDrag || !folderDrag || !folderDrag.group) return;
        if (String(folderDrag.group) !== String(groupId)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        if (!list.classList.contains('is-reordering')) list.classList.add('is-reordering');
        var insertAt = folderInsertIndexAtY(list, e.clientY, folderDrag.id);
        folderDrag.insertAt = insertAt;
        folderDrag.list = list;
        paintFolderInsertMarker(list, insertAt, folderDrag.id);
      });

      list.addEventListener('dragleave', function (e) {
        if (e.relatedTarget && list.contains(e.relatedTarget)) return;
        document.querySelectorAll('.qe-folder-insert').forEach(function (el) {
          if (el.parentNode === list) el.parentNode.removeChild(el);
        });
      });

      list.addEventListener('drop', function (e) {
        if (libItemDrag) return;
        if (!folderDrag || String(folderDrag.group) !== String(groupId)) return;
        e.preventDefault();
        e.stopPropagation();
        var from = folderDrag.id;
        var insertAt = folderDrag.insertAt;
        if (insertAt == null) insertAt = folderInsertIndexAtY(list, e.clientY, from);
        folderDrag = null;
        clearFolderDropMarks();
        if (from && reorderFolderToIndex(from, insertAt)) {
          rerender();
        }
      });
    });
  }

  var sceneDeleteBusy = false;

  async function requestDeleteScene(id) {
    var sid = String(id || '').trim();
    var scene = sceneById(sid);
    if (!sid || !scene || sceneDeleteBusy) return;
    var hero = isHeroScene(scene);

    /* AdminUI modal mounts on document.body — not under the canvas/experiencia stack. */
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.confirm === 'function') {
      sceneDeleteBusy = true;
      try {
        var ok = await AdminUI.confirm({
          title: hero ? 'Vaciar portada HERO' : 'Eliminar escena',
          confirmLabel: hero ? 'Vaciar' : 'Eliminar',
          cancelLabel: 'Cancelar',
          bodyHtml: hero
            ? '<p class="admin-modal-copy">¿Vaciar la portada HERO? Se quita el contenido, pero la escena permanece.</p>'
            : '<p class="admin-modal-copy">¿Deseas eliminar esta escena?</p>'
        });
        if (ok) deleteScene(sid);
      } finally {
        sceneDeleteBusy = false;
      }
      return;
    }

    state.pendingSceneDeleteId = sid;
    rerender();
  }

  function cancelDeleteScene() {
    state.pendingSceneDeleteId = null;
    rerender();
  }

  function confirmDeleteScene() {
    var sid = state.pendingSceneDeleteId;
    state.pendingSceneDeleteId = null;
    if (sid) deleteScene(sid);
    else rerender();
  }

  function deleteScene(id, opts) {
    opts = opts || {};
    ensureScenes();
    var sid = String(id || '').trim();
    if (!sid) return false;
    var idx = -1;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].id === sid) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return false;

    /* HERO is the permanent cover — clear contents, never remove the scene. */
    if (idx === 0 || isHeroScene(state.scenes[idx])) {
      clearHeroSceneContent(state.scenes[0]);
      state.activeSceneId = state.scenes[0].id;
      state.sceneMenuOpen = false;
      state.dockOpen = false;
      state.resourcePickerOpen = false;
      state.resourcePickerSceneId = null;
      try { destroyBuilderRuntimeScene(); } catch (eClrRt) { /* ignore */ }
      if (!opts.silent) {
        markDirtyLocal();
        rerender();
      }
      return true;
    }

    destroyExperienciaOverlay();
    try { destroyBuilderRuntimeScene(); } catch (eDelRt) { /* ignore */ }
    removeSceneFromGroups(sid);
    state.scenes.splice(idx, 1);
    ensureHeroSceneContract();

    if (state.activeSceneId === sid) {
      var next = state.scenes[idx] || state.scenes[idx - 1] || state.scenes[0] || null;
      state.activeSceneId = next ? next.id : null;
    } else if (state.activeSceneId && !sceneById(state.activeSceneId)) {
      state.activeSceneId = (state.scenes[0] && state.scenes[0].id) || null;
    }

    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    state.resourcePickerSceneId = null;
    if (!opts.silent) {
      markDirtyLocal();
      rerender();
    }
    return true;
  }

  function deleteScenesByIds(ids) {
    var list = Array.isArray(ids) ? ids.slice() : [];
    if (!list.length) return;
    var idSet = {};
    list.forEach(function (id) { idSet[String(id)] = true; });
    var ordered = [];
    var heroId = null;
    state.scenes.forEach(function (sc, i) {
      if (!sc || !idSet[String(sc.id)]) return;
      if (i === 0 || isHeroScene(sc)) heroId = sc.id;
      else ordered.push({ id: sc.id, idx: i });
    });
    ordered.sort(function (a, b) { return b.idx - a.idx; });
    ordered.forEach(function (item) {
      deleteScene(item.id, { silent: true });
    });
    if (heroId) deleteScene(heroId, { silent: true });
    markDirtyLocal();
    rerender();
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (eClone) {
      return null;
    }
  }

  function remapSceneEntityList(list, prefix) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      if (!item) return null;
      var copy = cloneJson(item);
      if (!copy) return null;
      copy.id = nextId(prefix);
      if (copy.portId) copy.portId = copy.id;
      return copy;
    }).filter(Boolean);
  }

  function duplicateScene(id) {
    var src = sceneById(id);
    if (!src) return null;
    var clone = cloneJson(src);
    if (!clone) return null;
    var fromHero = isHeroScene(src);
    clone.id = nextId('sc');
    clone.type = 'scene';
    clone.templateId = null;
    clone.name = fromHero
      ? nextSceneName()
      : (String(src.name || 'Escena').replace(/\s+copia$/i, '') + ' copia');
    clone.elements = remapSceneEntityList(src.elements, 'el');
    clone.interactions = remapSceneEntityList(src.interactions, 'ix');
    clone.buttons = remapSceneEntityList(src.buttons, 'btn');
    clone.hotspots = remapSceneEntityList(src.hotspots, 'hs');
    ensureSceneGuideBuckets(src);
    clone.guidesByViewport = {
      desktop: remapSceneEntityList(src.guidesByViewport.desktop, 'g'),
      tablet: remapSceneEntityList(src.guidesByViewport.tablet, 'g'),
      mobile: remapSceneEntityList(src.guidesByViewport.mobile, 'g')
    };
    clone.guideColorByViewport = serializeGuideColors(src);
    clone.guides = [];
    if (fromHero) clone.coverModel = null;
    state.scenes.push(clone);
    ensureSceneGroups();
    state.sceneTrack.push(clone.id);
    state.activeSceneId = clone.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    markDirtyLocal();
    queueScenesStripReveal(clone.id);
    rerender();
    return clone;
  }

  function sceneDisplayLabel(sc) {
    if (!sc) return 'Escena';
    if (isHeroScene(sc)) return 'HERO';
    return String(sc.name || 'Escena');
  }

  function openDeleteScenesDialog(focusSceneId, preselectedIds) {
    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') return;
    ensureScenes();
    var preselected = Object.create(null);
    if (Array.isArray(preselectedIds)) {
      preselectedIds.forEach(function (id) { preselected[String(id)] = true; });
    }
    var focusId = String(focusSceneId || state.activeSceneId || '').trim();
    var focus = sceneById(focusId) || activeScene();
    focusId = focus ? String(focus.id) : '';
    var scenes = Array.isArray(state.scenes) ? state.scenes.filter(Boolean) : [];
    if (!scenes.length) return;

    var rows = '';
    if (focus && !preselectedIds) {
      rows += '' +
        '<label class="qe-guides-delete__check qe-guides-delete__check--scene">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-sd-scene="' +
            escapeHtml(focusId) + '" checked>' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-stack">' +
            '<span class="qe-guides-delete__check-main">Escena actual</span>' +
            '<span class="qe-guides-delete__check-sub">' +
              escapeHtml(sceneDisplayLabel(focus)) +
            '</span>' +
          '</span>' +
        '</label>';
    }
    scenes.forEach(function (sc) {
      if (!sc) return;
      if (!preselectedIds && String(sc.id) === focusId) return;
      var hero = isHeroScene(sc);
      var sid = String(sc.id);
      var checked = preselected[sid] ? ' checked' : '';
      rows += '' +
        '<label class="qe-guides-delete__check qe-guides-delete__check--scene">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-sd-scene="' +
            escapeHtml(sid) + '"' + checked + '>' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-stack">' +
            '<span class="qe-guides-delete__check-main">' +
              escapeHtml(sceneDisplayLabel(sc)) +
            '</span>' +
            (hero
              ? '<span class="qe-guides-delete__check-sub">Se vacía, no se elimina</span>'
              : '') +
          '</span>' +
        '</label>';
    });

    AdminUI.openModal({
      title: 'Eliminar escenas',
      bodyHtml:
        '<div class="qe-guides-delete" data-qe-scenes-delete>' +
          '<p class="qe-guides-delete__section">Escenas</p>' +
          '<div class="qe-guides-delete__scenes">' + rows + '</div>' +
          '<div class="qe-guides-delete__bulk">' +
            '<button type="button" class="qe-guides-delete__bulk-btn" data-qe-sd-select-all>' +
              'Seleccionar todo</button>' +
            '<button type="button" class="qe-guides-delete__bulk-btn" data-qe-sd-deselect-all>' +
              'Deseleccionar todo</button>' +
          '</div>' +
        '</div>',
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-danger" data-modal-action="confirm" data-qe-sd-confirm>' +
          'Eliminar (0)</button>',
      onMount: function (root) {
        var modal = root.querySelector('.admin-modal');
        if (modal) modal.classList.add('qe-guides-delete-modal');

        function selectedIds() {
          var out = [];
          root.querySelectorAll('[data-qe-sd-scene]').forEach(function (input) {
            if (input.checked) out.push(input.getAttribute('data-qe-sd-scene'));
          });
          return out;
        }

        function refreshCount() {
          var n = selectedIds().length;
          var btn = root.querySelector('[data-qe-sd-confirm]');
          if (btn) {
            btn.textContent = 'Eliminar (' + n + ')';
            btn.disabled = n <= 0;
          }
        }

        root.querySelectorAll('[data-qe-sd-scene]').forEach(function (input) {
          input.addEventListener('change', refreshCount);
        });
        var selectAll = root.querySelector('[data-qe-sd-select-all]');
        var deselectAll = root.querySelector('[data-qe-sd-deselect-all]');
        if (selectAll) {
          selectAll.addEventListener('click', function () {
            root.querySelectorAll('[data-qe-sd-scene]').forEach(function (input) {
              input.checked = true;
            });
            refreshCount();
          });
        }
        if (deselectAll) {
          deselectAll.addEventListener('click', function () {
            root.querySelectorAll('[data-qe-sd-scene]').forEach(function (input) {
              input.checked = false;
            });
            refreshCount();
          });
        }

        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            if (confirmBtn.disabled) return;
            var ids = selectedIds();
            AdminUI.closeModal();
            deleteScenesByIds(ids);
          });
        }
        refreshCount();
      },
      onClose: function () {
        var modal = document.querySelector('.admin-modal.qe-guides-delete-modal');
        if (modal) modal.classList.remove('qe-guides-delete-modal');
      }
    });
  }

  function openAddScenesToGroupDialog(groupId) {
    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') return;
    var grp = sceneGroupById(groupId);
    if (!grp) return;
    ensureScenes();
    var inGroup = Object.create(null);
    (grp.sceneIds || []).forEach(function (sid) { inGroup[String(sid)] = true; });
    var rows = '';
    var i;
    for (i = 1; i < state.scenes.length; i++) {
      var sc = state.scenes[i];
      if (!sc || isHeroScene(sc)) continue;
      var sid = String(sc.id);
      rows += '' +
        '<label class="qe-guides-delete__check qe-guides-delete__check--scene">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-sg-add-scene="' +
            escapeHtml(sid) + '"' + (inGroup[sid] ? ' checked' : '') + '>' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-stack">' +
            '<span class="qe-guides-delete__check-main">' +
              escapeHtml(sceneDisplayLabel(sc)) +
            '</span>' +
          '</span>' +
        '</label>';
    }
    if (!rows) {
      rows = '<p class="qe-dock__menu-hint">No hay escenas disponibles.</p>';
    }
    AdminUI.openModal({
      title: 'Agregar escenas — ' + (grp.name || 'Grupo'),
      bodyHtml:
        '<div class="qe-guides-delete" data-qe-scene-group-add-modal>' +
          '<p class="qe-guides-delete__section">Selecciona escenas para esta carpeta</p>' +
          '<div class="qe-guides-delete__scenes">' + rows + '</div>' +
        '</div>',
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-primary" data-modal-action="confirm" data-qe-sg-add-confirm>' +
          'Agregar</button>',
      onMount: function (root) {
        var modal = root.querySelector('.admin-modal');
        if (modal) modal.classList.add('qe-guides-delete-modal');
        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (cancelBtn) cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            var ids = [];
            root.querySelectorAll('[data-qe-sg-add-scene]').forEach(function (input) {
              if (input.checked) ids.push(input.getAttribute('data-qe-sg-add-scene'));
            });
            AdminUI.closeModal();
            setGroupScenes(groupId, ids);
            rerender();
          });
        }
      }
    });
  }

  function openSendScenesToGroupMenu(sceneIds, clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var groups = listAllSceneGroupsFlat();
    if (!groups.length) return;
    var items = groups.map(function (grp) {
      return {
        id: 'grp:' + grp.id,
        label: grp.name || 'Grupo'
      };
    });
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Enviar a carpeta',
      items: items,
      onSelect: function (id) {
        if (String(id).indexOf('grp:') !== 0) return;
        var groupId = String(id).slice(4);
        addScenesToGroup(groupId, sceneIds, {});
        clearSceneSelection();
        rerender();
      }
    });
  }

  function openSceneGroupContextMenu(groupId, clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var grp = sceneGroupById(groupId);
    if (!grp) return;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Menú de carpeta',
      items: [
        { id: 'add-scenes', label: 'Agregar escena' },
        { id: 'rename', label: 'Cambiar nombre' },
        { id: 'subgroup', label: 'Nuevo subgrupo' },
        { id: 'delete-folder', label: 'Eliminar solo carpeta', separatorBefore: true },
        { id: 'delete-all', label: 'Eliminar carpeta y contenido', danger: true }
      ],
      onSelect: function (id) {
        if (id === 'add-scenes') {
          openAddScenesToGroupDialog(groupId);
          return;
        }
        if (id === 'rename') {
          beginGroupRename(groupId);
          return;
        }
        if (id === 'subgroup') {
          createSceneGroup({ parentGroupId: groupId });
          rerender();
          return;
        }
        if (id === 'delete-folder') {
          deleteSceneGroupOnly(groupId);
          return;
        }
        if (id === 'delete-all') {
          if (typeof AdminUI !== 'undefined' && typeof AdminUI.confirm === 'function') {
            AdminUI.confirm({
              title: 'Eliminar carpeta y contenido',
              confirmLabel: 'Eliminar todo',
              cancelLabel: 'Cancelar',
              bodyHtml: '<p class="admin-modal-copy">Se eliminarán la carpeta "' +
                escapeHtml(grp.name || 'Grupo') +
                '" y todas las escenas que contiene. Esta acción no se puede deshacer.</p>'
            }).then(function (ok) {
              if (ok) deleteSceneGroupWithContent(groupId);
            });
          } else {
            deleteSceneGroupWithContent(groupId);
          }
        }
      }
    });
  }

  function beginGroupRename(groupId, spanEl) {
    var grp = sceneGroupById(groupId);
    if (!grp) return false;
    var span = spanEl;
    if (!span) {
      var root = rootEl || document;
      span = root.querySelector('[data-qe-scene-group-name="' + groupId + '"]');
    }
    if (!span || span.querySelector('input')) return false;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'qe-scenes__group-rename';
    input.value = grp.name || 'Grupo';
    input.maxLength = 48;
    input.autocomplete = 'off';
    input.spellcheck = false;
    function finish(save) {
      if (save) {
        var next = String(input.value || '').trim();
        if (next) grp.name = next;
        markDirtyLocal();
      }
      rerender();
    }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
    input.addEventListener('click', function (ev) { ev.stopPropagation(); });
    input.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    span.replaceWith(input);
    input.focus();
    input.select();
    return true;
  }

  function bindSceneGroupEditing(editor) {
    if (!editor) return;
    editor.querySelectorAll('[data-qe-scene-group-name]').forEach(function (span) {
      var gid = span.getAttribute('data-qe-scene-group-name');
      if (!gid) return;
      span.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        beginGroupRename(gid, span);
      });
    });
  }

  function bindScenesStripScroll(editor) {
    if (!editor) return;
    var wrap = editor.querySelector('.qe-scenes__track-wrap');
    if (!wrap || wrap.dataset.qeStripScrollBound === '1') return;
    wrap.dataset.qeStripScrollBound = '1';

    wrap.addEventListener('scroll', function () {
      scenesTrackScrollLeft = wrap.scrollLeft;
      syncExpandedGroupPanels();
    }, { passive: true });

    wrap.addEventListener('wheel', function (e) {
      if (e.target && e.target.closest && (
        e.target.closest('[data-qe-scene-group-float-scroll]') ||
        e.target.closest('.qe-scenes-group-float__scroll')
      )) {
        return;
      }
      var delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      e.preventDefault();
      wrap.scrollLeft += delta;
      scenesTrackScrollLeft = wrap.scrollLeft;
      syncExpandedGroupPanels();
    }, { passive: false });
  }

  function bindSceneGroups(editor) {
    if (!editor) return;
    var groupAdd = editor.querySelector('[data-qe-scene-group-add]');
    if (groupAdd) {
      groupAdd.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        createSceneGroup({});
        rerender();
      });
    }
    bindSceneGroupEditing(editor);
    bindScenesStripScroll(editor);
    syncExpandedGroupPanels();
  }

  function openSceneContextMenu(sceneId, clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var sc = sceneById(sceneId);
    if (!sc) return;
    var hero = isHeroScene(sc);
    var batchIds = selectedSceneIdsForDrag(sceneId);
    var hasGroups = listAllSceneGroupsFlat().length > 0;
    var items = [
      {
        id: 'rename',
        label: 'Cambiar nombre',
        disabled: hero
      },
      {
        id: 'replace-bg',
        label: 'Reemplazar fondo',
        disabled: batchIds.length > 1
      },
      {
        id: 'duplicate',
        label: 'Duplicar',
        disabled: batchIds.length > 1
      }
    ];
    if (!hero && hasGroups) {
      items.push({
        id: 'send-to-group',
        label: batchIds.length > 1
          ? ('Enviar ' + batchIds.length + ' escenas a carpeta…')
          : 'Enviar a carpeta…'
      });
    }
    items.push({
      id: 'delete',
      label: batchIds.length > 1 ? ('Eliminar (' + batchIds.length + ')') : 'Eliminar',
      danger: true,
      separatorBefore: true
    });
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Menú de escena',
      items: items,
      onSelect: function (id) {
        if (id === 'rename') {
          if (hero) return;
          if (state.activeSceneId === sceneId) {
            beginSceneRename(sceneId);
            return;
          }
          state.activeSceneId = sceneId;
          state.selectedElementId = null;
          state.expHasSelection = false;
          state.sceneMenuOpen = false;
          state.dockOpen = false;
          rerender();
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              beginSceneRename(sceneId);
            });
          });
          return;
        }
        if (id === 'replace-bg') {
          openResourcePicker(sceneId);
          return;
        }
        if (id === 'duplicate') {
          duplicateScene(sceneId);
          return;
        }
        if (id === 'send-to-group') {
          openSendScenesToGroupMenu(batchIds, clientX, clientY);
          return;
        }
        if (id === 'delete') {
          if (batchIds.length > 1) openDeleteScenesDialog(null, batchIds);
          else openDeleteScenesDialog(sceneId);
        }
      }
    });
  }

  function openScenesStripContextMenu(clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Menú de escenas',
      items: [
        {
          id: 'search-scene',
          label: 'Buscar por nombre'
        }
      ],
      onSelect: function (id) {
        if (id === 'search-scene') {
          openSceneNameSearch(clientX, clientY);
        }
      }
    });
  }

  function normalizeSceneSearchKey(v) {
    return String(v == null ? '' : v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Match scene by display name / name / numeric index (e.g. "01", "escena 02"). */
  function findSceneByNameQuery(query) {
    ensureScenes();
    var q = normalizeSceneSearchKey(query);
    if (!q) return null;
    var scenes = Array.isArray(state.scenes) ? state.scenes.filter(Boolean) : [];
    if (!scenes.length) return null;

    function scoreScene(sc, index) {
      var label = normalizeSceneSearchKey(sceneDisplayLabel(sc));
      var name = normalizeSceneSearchKey(sc.name);
      var num = String(index + 1);
      var numPad = num.length < 2 ? ('0' + num) : num;
      if (label === q || name === q) return 100;
      if (q === num || q === numPad || q === 'escena ' + num || q === 'escena ' + numPad) return 90;
      if (label.indexOf(q) === 0 || name.indexOf(q) === 0) return 80;
      if (label.indexOf(q) >= 0 || name.indexOf(q) >= 0) return 60;
      return 0;
    }

    var best = null;
    var bestScore = 0;
    var i;
    for (i = 0; i < scenes.length; i++) {
      var sc = scenes[i];
      var score = scoreScene(sc, i);
      if (score > bestScore) {
        bestScore = score;
        best = sc;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function goToSceneBySearch(query) {
    var sc = findSceneByNameQuery(query);
    if (!sc) return false;
    selectScene(sc.id);
    requestAnimationFrame(function () {
      scrollActiveSceneThumbIntoView();
      requestAnimationFrame(scrollActiveSceneThumbIntoView);
    });
    return true;
  }

  function openSceneNameSearch(clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Buscar escena por nombre',
      items: [
        {
          id: 'scene-name-query',
          type: 'input',
          inputType: 'text',
          label: 'Buscar',
          placeholder: 'Nombre de escena',
          ariaLabel: 'Buscar escena por nombre',
          onSubmit: function (raw) {
            goToSceneBySearch(raw);
          }
        }
      ]
    });
  }

  function isScenesStripChromeTarget(t) {
    if (!t || !t.closest) return false;
    /* Strip, host, track chrome, nav/add — not canvas/library. */
    if (t.closest('[data-qe-scenes-host]')) return true;
    if (t.closest('[data-qe-scenes]')) return true;
    /* Column / stage gutters (padding around the strip). */
    if (t.classList && t.classList.contains('qe-col--canvas')) return true;
    if (t.matches && t.matches(
      '[data-qe-stage-shell], [data-qe-stage-unit], .qe-scenes__track-wrap, .qe-scenes__track, .qe-scenes__add, .qe-scenes__nav'
    )) return true;
    return false;
  }

  function bindSceneContextMenus(editor) {
    if (!editor || state.canvasPreviewMode) return;
    var col = editor.querySelector('.qe-col--canvas');
    if (!col || col.dataset.qeSceneCtx === '1') return;
    col.dataset.qeSceneCtx = '1';

    /* Capture: kill browser/Opera menu on strip + gutters before anything else. */
    col.addEventListener('contextmenu', function (e) {
      if (!e.target || !isScenesStripChromeTarget(e.target)) return;

      var host = col.querySelector('[data-qe-scenes-host]');
      var strip = col.querySelector('[data-qe-scenes]');

      /* Fold control: lock / unlock column. */
      if (e.target.closest && e.target.closest('[data-qe-scenes-fold]')) {
        e.preventDefault();
        e.stopPropagation();
        openScenesFoldLockMenu(e.clientX, e.clientY);
        return;
      }

      /* Bare column / stage padding: silence only (no Opera, no BOXIES menu). */
      var onBareGutter =
        e.target === col ||
        (e.target.matches && e.target.matches('[data-qe-stage-shell], [data-qe-stage-unit]')) ||
        (host && e.target === host);
      if (onBareGutter) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (!strip || !(strip.contains(e.target) || e.target === strip)) return;

      var wrap = e.target.closest('.qe-scenes__group-wrap');
      if (wrap && strip.contains(wrap)) {
        var gid = wrap.getAttribute('data-qe-scene-group-drop');
        if (gid) {
          openSceneGroupContextMenu(gid, e.clientX, e.clientY);
          return;
        }
      }

      var wrapScene = e.target.closest('.qe-scenes__thumb-wrap');
      if (wrapScene && strip.contains(wrapScene) && !wrapScene.classList.contains('qe-scenes__thumb-wrap--add')) {
        var btn = wrapScene.querySelector('[data-qe-scene]');
        var id = btn && btn.getAttribute('data-qe-scene');
        if (id) {
          openSceneContextMenu(id, e.clientX, e.clientY);
          return;
        }
      }
      openScenesStripContextMenu(e.clientX, e.clientY);
    }, true);
  }

  function createScene(opts) {
    opts = opts || {};
    var templateId = opts.templateId || null;
    var fromHeroDefault = templateId === 'hero-default' || opts.fromTemplate === true;
    /* Empty until user assigns a library resource — never auto-bind media. */
    var scene = {
      id: nextId('sc'),
      name: fromHeroDefault ? 'Hero Default' : nextSceneName(),
      type: fromHeroDefault ? 'hero' : 'scene',
      templateId: fromHeroDefault ? 'hero-default' : null,
      resourceId: null,
      coverModel: null,
      elements: [],
      interactions: [],
      buttons: [],
      hotspots: [],
      guides: [],
      guidesByViewport: { desktop: [], tablet: [], mobile: [] }
    };
    state.scenes.push(scene);
    ensureSceneGroups();
    state.sceneTrack.push(scene.id);
    state.activeSceneId = scene.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    markDirtyLocal();
    queueScenesStripReveal(scene.id);
    rerender();
  }

  function applyResourceToCoverModel(scene, res) {
    if (!scene || !res) return;
    ensureHeroCoverModel(scene);
    var url = displayUrlOf(res);
    if (!url) return;
    var isVideo = res.media === 'video' || res.group === 'videos';
    if (isVideo) {
      scene.coverModel.videoUrl = url;
      scene.coverModel.imageUrl = null;
    } else {
      scene.coverModel.imageUrl = url;
      scene.coverModel.videoUrl = null;
    }
  }

  function assignResourceToScene(contentId, sceneId) {
    var res = contentById(contentId);
    var targetId = sceneId || state.resourcePickerSceneId || state.activeSceneId;
    var scene = sceneById(targetId);
    if (!res || !scene) return;
    if (!(res.media === 'image' || res.media === 'video' ||
        res.group === 'renders' || res.group === 'videos' || res.group === 'hero')) {
      return;
    }
    var url = displayUrlOf(res);
    if (!url) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('Este recurso no tiene archivo para usar como fondo.');
      }
      return;
    }
    if (targetId) state.activeSceneId = targetId;
    var pub = publicUrlOf(res);
    var isVideo = res.media === 'video' || res.group === 'videos';
    scene.resourceId = res.id;
    scene.mediaUrl = url;
    scene.publicUrl = pub || (String(url).indexOf('blob:') === 0 ? null : url);
    scene.mediaType = isVideo ? 'video' : 'image';
    scene.storagePath = res.storagePath || null;
    scene.archivoId = res.archivoId || null;
    scene.provider = res.provider || (pub ? 'bunny' : null);
    if (scene.type === 'hero' || scene.templateId === 'hero-default') {
      applyResourceToCoverModel(scene, res);
    } else {
      scene.coverModel = null;
    }
    state.resourcePickerOpen = false;
    state.resourcePickerSceneId = null;
    state.dockOpen = false;
    if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onSceneAssign) {
      QuotationPersistAudit.onSceneAssign(scene, res, serializeDocument(), {
        projectId: loadedProjectId || (editorProjectCtx && editorProjectCtx.id),
        slug: editorProjectCtx && editorProjectCtx.slug,
        id: loadedProjectId || (editorProjectCtx && editorProjectCtx.id)
      });
    }
    markDirtyLocal();
    rerender();
  }

  function sceneUsesLibraryItem(sc, item, urls) {
    if (!sc || !item) return false;
    if (sc.resourceId && String(sc.resourceId) === String(item.id)) return true;
    if (item.archivoId && sc.archivoId && String(sc.archivoId) === String(item.archivoId)) return true;
    if (item.storagePath && sc.storagePath && String(sc.storagePath) === String(item.storagePath)) {
      return true;
    }
    if (urlInList(sc.mediaUrl, urls) || urlInList(sc.publicUrl, urls)) return true;
    if (sc.coverModel) {
      if (urlInList(sc.coverModel.imageUrl, urls) || urlInList(sc.coverModel.videoUrl, urls)) {
        return true;
      }
    }
    return false;
  }

  function clearSceneLibraryRefs(sc, item, urls) {
    if (!sceneUsesLibraryItem(sc, item, urls)) return;
    sc.resourceId = null;
    sc.mediaUrl = null;
    sc.publicUrl = null;
    sc.mediaType = null;
    sc.storagePath = null;
    sc.archivoId = null;
    sc.provider = null;
    if (sc.coverModel) {
      if (urlInList(sc.coverModel.imageUrl, urls)) sc.coverModel.imageUrl = null;
      if (urlInList(sc.coverModel.videoUrl, urls)) sc.coverModel.videoUrl = null;
    }
  }

  function clearElementLibraryRefs(el, item, urls) {
    if (!el || !el.props) return;
    var p = el.props;
    if (p.resourceId && String(p.resourceId) === String(item.id)) p.resourceId = null;
    if (urlInList(p.src, urls)) { p.src = ''; p.show = false; }
    if (urlInList(p.url, urls)) p.url = '';
    if (urlInList(p.imageUrl, urls)) p.imageUrl = '';
    if (urlInList(p.mediaUrl, urls)) p.mediaUrl = '';
  }

  function clearHeroLibraryRefs(item, urls) {
    if (typeof QuotationHero === 'undefined' || !QuotationHero.getState) return;
    var hs = QuotationHero.getState();
    if (!hs) return;
    function mediaHit(media) {
      if (!media) return false;
      return urlInList(media.uploadedUrl, urls) ||
        urlInList(media.previewUrl, urls) ||
        (item.archivoId && media.archivoId && String(media.archivoId) === String(item.archivoId)) ||
        (item.storagePath && media.storagePath &&
          String(media.storagePath) === String(item.storagePath));
    }
    if (urlInList(hs.imageUrl, urls) || mediaHit(hs.heroImage)) {
      hs.imageUrl = null;
      hs.heroImage = null;
    }
    if (urlInList(hs.videoUrl, urls) || mediaHit(hs.heroVideo)) {
      hs.videoUrl = null;
      hs.heroVideo = null;
    }
  }

  async function autosaveAfterLibraryChange() {
    try {
      await autosaveToServer({ notify: true, reason: 'library-change' });
      if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
        BuilderDirtyState.clear();
      }
      persistDraft();
    } catch (eSave) {
      /* autosaveToServer already logged / notified when notify:true */
    }
  }

  async function removeLibraryResource(contentId) {
    var item = contentById(contentId);
    if (!item) return;
    var label = item.name || 'este recurso';

    if (typeof AdminUI === 'undefined' || typeof AdminUI.confirm !== 'function') {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No se pudo abrir el diálogo de confirmación.');
      }
      return;
    }

    var ok = await AdminUI.confirm({
      title: 'Eliminar recurso',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      bodyHtml:
        '<p class="admin-modal-copy">¿Seguro que deseas eliminar «' + escapeHtml(label) + '»?</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">' +
          'Esta acción eliminará el recurso de la biblioteca y dejará sin referencia cualquier escena que lo utilice.' +
        '</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">Esta acción no puede deshacerse.</p>'
    });
    if (!ok) return;

    await purgeLibraryItem(item);
    markDirtyLocal();
    notifyLibraryCapacityChanged();
    rerender();
    await autosaveAfterLibraryChange();
  }

  /** Remove one library item from state + Bunny/archivos (no confirm, no save). */
  async function purgeLibraryItem(item) {
    if (!item) return;
    var urls = collectItemUrls(item);
    var projectId = resolveProjectId();
    var slug = resolveShowroomSlug();
    var archivoId = item.archivoId || null;
    var storagePath = item.storagePath || null;

    state.scenes.forEach(function (sc) {
      clearSceneLibraryRefs(sc, item, urls);
      (sc.elements || []).forEach(function (el) {
        clearElementLibraryRefs(el, item, urls);
      });
    });
    clearHeroLibraryRefs(item, urls);

    revokePreview(item);
    state.content = state.content.filter(function (c) {
      return !c || String(c.id) !== String(item.id);
    });
    if (String(state.selectedContentId || '') === String(item.id)) {
      state.selectedContentId = null;
    }
    if (String(state.renamingContentId || '') === String(item.id)) {
      state.renamingContentId = null;
    }
    if (state.items && state.items[item.id]) {
      try { delete state.items[item.id]; } catch (eItems) {}
    }
    if (state.librarySelectedIds) {
      try { delete state.librarySelectedIds[String(item.id)]; } catch (eSel) {}
    }

    if ((archivoId || storagePath) && projectId &&
        typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.remove) {
      try {
        await BunnyMediaApi.remove(projectId, {
          archivoId: archivoId,
          storagePath: storagePath,
          showroomSlug: slug || null
        });
      } catch (eBunny) {
        console.warn('[QuotationEditor] Bunny remove', eBunny);
      }
    }
  }

  async function removeSelectedLibraryResources(groupId) {
    var ids = Object.keys(state.librarySelectedIds || {}).filter(function (id) {
      return state.librarySelectedIds[id] && contentById(id) &&
        (!groupId || String(contentById(id).group) === String(groupId));
    });
    if (!ids.length) return;

    if (typeof AdminUI === 'undefined' || typeof AdminUI.confirm !== 'function') {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No se pudo abrir el diálogo de confirmación.');
      }
      return;
    }

    var ok = await AdminUI.confirm({
      title: 'Eliminar recursos',
      confirmLabel: 'Eliminar ' + ids.length,
      cancelLabel: 'Cancelar',
      bodyHtml:
        '<p class="admin-modal-copy">¿Eliminar ' + ids.length +
          ' recurso' + (ids.length === 1 ? '' : 's') + ' de la biblioteca?</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">' +
          'Se borrarán de Bunny Storage y de cualquier escena que los use.' +
        '</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">Esta acción no puede deshacerse.</p>'
    });
    if (!ok) return;

    var i;
    for (i = 0; i < ids.length; i++) {
      await purgeLibraryItem(contentById(ids[i]));
    }
    clearLibrarySelectionMode();
    markDirtyLocal();
    notifyLibraryCapacityChanged();
    rerender();
    await autosaveAfterLibraryChange();
    if (typeof AdminNotify !== 'undefined' && AdminNotify.success) {
      AdminNotify.success(ids.length + ' recurso' + (ids.length === 1 ? '' : 's') + ' eliminado' +
        (ids.length === 1 ? '' : 's') + '.');
    }
  }

  function openShapePicker() {
    state.shapePickerOpen = true;
    state.dockOpen = false;
    rerender();
  }

  function closeShapePicker() {
    if (!state.shapePickerOpen) return;
    state.shapePickerOpen = false;
    rerender();
  }

  function pickShape(kind) {
    state.shapePickerOpen = false;
    addShapeElement(kind);
    rerender();
  }

  function openResourcePicker(sceneId) {
    state.resourcePickerOpen = true;
    state.resourcePickerSceneId = sceneId || state.activeSceneId || null;
    state.dockOpen = false;
    rerender();
  }

  function closeResourcePicker() {
    state.resourcePickerOpen = false;
    state.resourcePickerSceneId = null;
    rerender();
  }

  function applyElementToCoverModel(scene, el) {
    if (!scene || !scene.coverModel || !el) return;
    var m = scene.coverModel;
    var props = el.props || {};
    if (el.role === 'title') {
      m.nombre = props.text != null ? String(props.text) : String(props.label || '');
    } else if (el.role === 'subtitle') {
      m.eslogan = props.text != null ? String(props.text) : '';
    } else if (el.role === 'explore') {
      m.botonIzquierdo = props.label || 'Explorar';
    } else if (el.role === 'start') {
      m.botonDerecho = props.label || 'Iniciar';
    } else if (el.role === 'back') {
      m.backLabel = props.label || 'Demos';
      if (props.show != null) m.showBack = props.show !== false;
    } else if (el.role === 'logo') {
      m.logoUrl = props.src || '';
      m.showLogo = props.show !== false && !!m.logoUrl;
      if (props.logoStyle) m.logoStyle = props.logoStyle;
    } else if (el.role === 'share') {
      if (props.show != null) m.showShare = props.show !== false;
    } else if (el.role === 'fullscreen') {
      if (props.show != null) m.showFullscreen = props.show !== false;
    } else if (el.role === 'assistant') {
      if (props.show != null) m.showAssistant = props.show !== false;
    }
  }

  function coverElementIds(scene) {
    var map = {};
    if (!scene || !scene.elements) return map;
    scene.elements.forEach(function (el) {
      if (el && el.role) map[el.role] = el.id;
    });
    return map;
  }

  function ensureHeroCoverModel(scene) {
    if (!scene) return null;
    if (!scene.coverModel) {
      var payload = buildHeroDefaultScenePayload(editorProjectCtx);
      scene.coverModel = payload.coverModel || emptyHeroCoverModel();
      /*
       * Editor SSOT for media is scene.resourceId / mediaUrl / assignResource.
       * Never import QuotationHero image/video here — that refilled HERO after Vaciar.
       */
      scene.coverModel.imageUrl = null;
      scene.coverModel.videoUrl = null;
      if (!scene.elements || !scene.elements.length) scene.elements = payload.elements || [];
    }
    return scene.coverModel;
  }

  function runtimeIframe() {
    return rootEl ? rootEl.querySelector('[data-qe-runtime-iframe]') : null;
  }

  function pushCoverToRuntime() {
    if (isEditorRuntimeDisabled()) return;
    var iframe = runtimeIframe();
    if (!iframe || typeof QuotationRuntimeBridge === 'undefined') return;
    var scene = activeScene();
    if (sceneUsesProjectCover(scene)) {
      ensureHeroCoverModel(scene);
    }
    var doc = serializeDocument();
    var payload = {
      canvas: doc,
      coverModel: (scene && scene.coverModel) || null,
      elementIds: scene ? coverElementIds(scene) : {},
      selectedElementId: state.selectedElementId || null
    };
    var type = QuotationRuntimeBridge.TYPE.SET_DOCUMENT || QuotationRuntimeBridge.TYPE.SET_MODEL;
    QuotationRuntimeBridge.postToFrame(iframe, type, payload);
  }

  function pushSelectionToRuntime() {
    if (isEditorRuntimeDisabled()) return;
    var iframe = runtimeIframe();
    if (!iframe || typeof QuotationRuntimeBridge === 'undefined') return;
    QuotationRuntimeBridge.postToFrame(iframe, QuotationRuntimeBridge.TYPE.SET_SELECTION, {
      elementId: state.selectedElementId || null
    });
  }

  function refreshInspectorOnly() {
    /* V7.2.66 — props live in right rail; Experiencia.paintInspector owns content. */
  }

  function wireInspectorFields(editor) {
    if (!editor) return;
    var elText = editor.querySelector('[data-qe-el-text]');
    if (elText && !elText.dataset.qeBound) {
      elText.dataset.qeBound = '1';
      elText.addEventListener('change', function () {
        patchSelectedElement(function (el) {
          var val = String(elText.value || '').trim();
          if (el.type === 'text') el.props.text = val;
          else if (el.type === 'image') el.props.label = val || el.props.label;
          else el.props.label = val || el.props.label;
        });
      });
      elText.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          elText.blur();
        }
      });
    }
    var elSrc = editor.querySelector('[data-qe-el-src]');
    if (elSrc && !elSrc.dataset.qeBound) {
      elSrc.dataset.qeBound = '1';
      elSrc.addEventListener('change', function () {
        patchSelectedElement(function (el) {
          el.props.src = String(elSrc.value || '').trim();
          el.props.show = !!el.props.src;
        });
      });
    }

    editor.querySelectorAll('[data-qe-item-style]').forEach(function (btn) {
      if (btn.dataset.qeBound) return;
      btn.dataset.qeBound = '1';
      btn.addEventListener('click', function () {
        patchSelected(function (item) {
          item.style = btn.getAttribute('data-qe-item-style');
        });
      });
    });
    editor.querySelectorAll('[data-qe-action]').forEach(function (input) {
      if (input.dataset.qeBound) return;
      input.dataset.qeBound = '1';
      input.addEventListener('change', function () {
        if (!input.checked) return;
        patchSelected(function (item) {
          item.action = input.getAttribute('data-qe-action');
        });
      });
    });
    var dest = editor.querySelector('[data-qe-item-dest]');
    if (dest && !dest.dataset.qeBound) {
      dest.dataset.qeBound = '1';
      dest.addEventListener('change', function () {
        patchSelected(function (item) {
          item.targetSceneId = dest.value;
        });
      });
    }
    var labelInput = editor.querySelector('[data-qe-item-label]');
    if (labelInput && !labelInput.dataset.qeBound) {
      labelInput.dataset.qeBound = '1';
      labelInput.addEventListener('change', function () {
        patchSelected(function (item) {
          item.label = String(labelInput.value || '').trim() || item.label;
        });
      });
    }
  }

  var runtimeBridgeBound = false;
  var expOverlay = null;
  var pendingExpAction = null;
  var dockFadeTimer = null;

  function refreshDockOnly() {
    if (!rootEl) return;
    var bar = rootEl.querySelector('[data-qe-dock-bar]');
    if (!bar || !bar.parentNode) return;
    var nextMode = dockHasSelection() ? 'actions' : 'create';
    if (nextMode === 'actions') state.shapePickerOpen = false;
    var curMode = bar.getAttribute('data-mode') || '';
    var rail = bar.querySelector('[data-qe-dock-rail]');

    function applyRail() {
      bar.setAttribute('data-mode', nextMode);
      if (!rail) {
        var wrap = document.createElement('div');
        wrap.innerHTML = stageDockHtml();
        var next = wrap.firstElementChild;
        if (next) bar.parentNode.replaceChild(next, bar);
        bindDockBar(rootEl);
        return;
      }
      rail.innerHTML = stageDockRailHtml();
      rail.classList.remove('is-fading-out');
      rail.classList.add('is-fading-in');
      bindDockBar(rootEl);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          rail.classList.remove('is-fading-in');
        });
      });
    }

    if (curMode === nextMode) {
      applyRail();
      return;
    }
    /* V7.2.56 — fade + horizontal resize together (~180ms), grow from center. */
    bar.setAttribute('data-mode', nextMode);
    if (rail) {
      rail.classList.add('is-fading-out');
      if (dockFadeTimer) clearTimeout(dockFadeTimer);
      dockFadeTimer = setTimeout(function () {
        dockFadeTimer = null;
        applyRail();
      }, 90);
      return;
    }
    applyRail();
  }

  function bindDockBar(editor) {
    if (!editor) return;
    var addShape = editor.querySelector('[data-qe-add-shape]');
    if (addShape) {
      addShape.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openShapePicker();
      });
    }
    var addText = editor.querySelector('[data-qe-add-text]');
    if (addText) addText.addEventListener('click', function () { addTextElement(); });
    var addStroke = editor.querySelector('[data-qe-add-stroke]');
    if (addStroke) addStroke.addEventListener('click', function () { addStrokeElement(); });
    var addContainer = editor.querySelector('[data-qe-add-container]');
    if (addContainer) addContainer.addEventListener('click', function () { addContainerElement(); });
    var addComponent = editor.querySelector('[data-qe-add-component]');
    if (addComponent) addComponent.addEventListener('click', function () { addComponentElement(); });
    var addAdvanced = editor.querySelector('[data-qe-add-advanced]');
    if (addAdvanced) addAdvanced.addEventListener('click', function () { addAdvancedElement(); });
    var edit = editor.querySelector('[data-qe-dock-edit]');
    if (edit) {
      edit.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        focusPropsPanel();
      });
    }
    var animate = editor.querySelector('[data-qe-dock-animate]');
    if (animate) {
      animate.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dockSelectionAction('animate');
      });
    }
    var interact = editor.querySelector('[data-qe-dock-interact]');
    if (interact) {
      interact.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dockSelectionAction('interactivity');
      });
    }
    var dup = editor.querySelector('[data-qe-dock-dup]');
    if (dup) {
      dup.addEventListener('click', function () {
        if (expOverlay && expOverlay.duplicateSelected) expOverlay.duplicateSelected();
      });
    }
    var lock = editor.querySelector('[data-qe-dock-lock]');
    if (lock) {
      lock.addEventListener('click', function () {
        if (expOverlay && expOverlay.toggleLockSelected) expOverlay.toggleLockSelected();
      });
    }
    var front = editor.querySelector('[data-qe-dock-front]');
    if (front) {
      front.addEventListener('click', function () {
        if (expOverlay && expOverlay.bringSelectedToFront) expOverlay.bringSelectedToFront();
      });
    }
    var del = editor.querySelector('[data-qe-dock-del]');
    if (del) {
      del.addEventListener('click', function () {
        if (expOverlay && expOverlay.deleteSelected) {
          expOverlay.deleteSelected();
          state.expHasSelection = false;
          refreshDockOnly();
        }
      });
    }
  }

  function destroyExperienciaOverlay() {
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }
    if (expOverlay && typeof expOverlay.destroy === 'function') {
      try { expOverlay.destroy(); } catch (e) { /* ignore */ }
    }
    expOverlay = null;
  }

  /** Detach editor chrome without resetting the document SSOT. */
  function resetEditorSession(reason) {
    cancelScheduledAutosave();
    sessionEpoch += 1;
    try { destroyBuilderRuntimeScene(); } catch (eDes) { /* ignore */ }
    state = createEmptyState();
    documentReady = false;
    loadPromise = null;
    bunnyStructureReady = false;
    try {
      console.log('[QuotationEditor] resetEditorSession', reason || '', 'epoch', sessionEpoch);
    } catch (eLog) { /* ignore */ }
  }

  function rewriteStateSlugPaths(oldSlug, newSlug) {
    var from = String(oldSlug || '').trim().toLowerCase();
    var to = String(newSlug || '').trim().toLowerCase();
    if (!from || !to || from === to) return;
    var oldPrefix = 'projects/' + from + '/';
    var newPrefix = 'projects/' + to + '/';
    try {
      var raw = JSON.stringify(state);
      var next = raw.split(oldPrefix).join(newPrefix);
      if (next === raw) return;
      var parsed = JSON.parse(next);
      if (parsed && typeof parsed === 'object') {
        state = parsed;
      }
    } catch (eRw) {
      console.warn('[QuotationEditor] rewriteStateSlugPaths failed', eRw);
    }
  }

  function applyProjectIdentity(identity) {
    identity = identity || {};
    var id = String(identity.id || identity.projectId || '').trim();
    var slug = String(identity.slug || '').trim();
    var name = String(identity.name || identity.nombre || '').trim();
    var previousSlug = String(identity.previousSlug || '').trim();
    if (!editorProjectCtx || typeof editorProjectCtx !== 'object') {
      editorProjectCtx = { id: '', slug: '', name: '' };
    }
    if (id) editorProjectCtx.id = id;
    if (slug) editorProjectCtx.slug = slug;
    if (name) editorProjectCtx.name = name;
    if (id && loadedProjectId && String(loadedProjectId) === id && previousSlug && slug) {
      rewriteStateSlugPaths(previousSlug, slug);
      try { persistDraft(); } catch (eDraft) { /* ignore */ }
    }
  }

  function detachUi() {
    try { persistDraft(); } catch (eDraft) { /* ignore */ }
    if (typeof QuotationContextMenu !== 'undefined' && QuotationContextMenu.close) {
      try { QuotationContextMenu.close(); } catch (eCtx) { /* ignore */ }
    }
    try { destroyExperienciaOverlay(); } catch (eOx) { /* ignore */ }
    try { destroyBuilderRuntimeScene(); } catch (eRt) { /* ignore */ }
    try {
      document.body.classList.remove('is-qe-lib-pointer-dragging');
    } catch (eBody) { /* ignore */ }
    libPointerDrag = null;
    libItemDrag = null;
    folderDrag = null;
    sceneGroupFloatClose();
    var groupPortal = document.getElementById(SCENE_GROUP_FLOAT_HOST_ID);
    if (groupPortal) {
      groupPortal.innerHTML = '';
      groupPortal.setAttribute('aria-hidden', 'true');
    }
    /* Keep documentReady / loadedProjectId / state — only tear down chrome. */
    rootEl = null;
    var rightBody = document.getElementById('quotationRightBody');
    if (rightBody) rightBody.innerHTML = '';
  }

  function refreshLayersPanel() {
    var body = document.getElementById('quotationRightBody');
    if (!body) return;
    var host = body.querySelector('[data-qe-outliner], [data-qe-layers]');
    if (!host) {
      syncRightPanel();
      return;
    }
    var scroll = host.querySelector('.qe-outliner__scroll');
    var list = host.querySelector('[data-qe-outliner-list], [data-qe-layers-list], .qe-layers__list');
    var savedTop = list ? list.scrollTop : 0;
    var editingId = state.editingElementLabelId;
    if (list) {
      var wrap = document.createElement('div');
      wrap.innerHTML = layersListHtml();
      var next = wrap.firstElementChild;
      if (next) list.replaceWith(next);
    } else if (scroll) {
      scroll.innerHTML = layersListHtml();
    } else {
      syncRightPanel();
      return;
    }
    restoreOutlinerScroll(
      host.querySelector('[data-qe-outliner-list], [data-qe-layers-list]'),
      savedTop
    );
    if (editingId) {
      var inp = host.querySelector('[data-qe-outliner-rename="' + editingId + '"]');
      if (inp) {
        requestAnimationFrame(function () {
          try {
            inp.focus();
            inp.select();
          } catch (eF) { /* ignore */ }
        });
      }
    }
  }

  function bindLayersPanel() {
    var body = document.getElementById('quotationRightBody');
    if (!body) return;

    if (body.dataset.qeLayersBound === '1') return;
    body.dataset.qeLayersBound = '1';

    body.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      if (t.closest('[data-qe-outliner-create-group]')) return;

      if (!t.closest('[data-qe-layers], [data-qe-outliner]')) return;

      if (t.closest('[data-qe-outliner-rename]')) return;

      var fold = t.closest('[data-qe-layer-fold]');
      if (fold) {
        ev.preventDefault();
        ev.stopPropagation();
        var fid = fold.getAttribute('data-qe-layer-fold');
        if (fid) {
          if (!state.openOverlayGroups) state.openOverlayGroups = {};
          state.openOverlayGroups[fid] = !(state.openOverlayGroups[fid] !== false);
          refreshLayersPanel();
        }
        return;
      }

      var row = t.closest('[data-qe-outliner-row]');
      if (!row) return;

      var sid = row.getAttribute('data-qe-outliner-row');
      if (!sid) return;

      if (ev.detail >= 2 && t.closest('[data-qe-outliner-name], [data-qe-layer-sel]')) {
        ev.preventDefault();
        ev.stopPropagation();
        startOutlinerLabelEdit(sid);
        return;
      }

      ev.preventDefault();
      ev.stopPropagation();
      if (ev.shiftKey) {
        toggleOutlinerItemFromPanel(sid);
      } else {
        selectOutlinerItemFromPanel(sid);
      }
    });

    body.addEventListener('mousedown', function (ev) {
      if (ev.target && ev.target.closest &&
          ev.target.closest('[data-qe-outliner-rename]')) {
        ev.stopPropagation();
      }
    }, true);

    body.addEventListener('contextmenu', function (ev) {
      var row = ev.target && ev.target.closest
        ? ev.target.closest('[data-qe-outliner-row][data-qe-outliner-kind="group"]')
        : null;
      if (!row || !body.contains(row)) return;
      ev.preventDefault();
      ev.stopPropagation();
      var groupId = row.getAttribute('data-qe-outliner-group') ||
        row.getAttribute('data-qe-outliner-row');
      if (groupId) openOutlinerGroupContextMenu(groupId, ev.clientX, ev.clientY);
    });

    body.addEventListener('keydown', function (ev) {
      var inp = ev.target && ev.target.closest ? ev.target.closest('[data-qe-outliner-rename]') : null;
      if (!inp || !body.contains(inp)) return;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        var id = inp.getAttribute('data-qe-outliner-rename');
        var nextLabel = inp.value;
        state.editingElementLabelId = null;
        renameSceneInteractionLabel(id, nextLabel);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        state.editingElementLabelId = null;
        refreshLayersPanel();
      }
    });

    body.addEventListener('focusout', function (ev) {
      var inp = ev.target && ev.target.closest ? ev.target.closest('[data-qe-outliner-rename]') : null;
      if (!inp || !body.contains(inp)) return;
      var id = inp.getAttribute('data-qe-outliner-rename');
      if (String(state.editingElementLabelId || '') !== String(id)) return;
      var nextLabel = inp.value;
      state.editingElementLabelId = null;
      renameSceneInteractionLabel(id, nextLabel);
    });
  }

  function mountExperienciaOverlay() {
    destroyExperienciaOverlay();
    if (!rootEl || typeof QuotationExperienciaBridge === 'undefined') return;
    var layer = rootEl.querySelector('[data-qe-edit-layer]');
    if (!layer) return;
    ensureScenes();
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });

    expOverlay = QuotationExperienciaBridge.mount(layer, {
      scenes: state.backpackMode ? [getBackpackSceneRef()] : state.scenes,
      activeSceneId: state.backpackMode ? BACKPACK_SCENE_ID : state.activeSceneId,
      contentById: contentById,
      projectId: resolveProjectId(),
      inspectorBody: null,
      editMode: state.expEditMode === 'hotspots' ? 'hotspots' : 'buttons',
      overlaySnapEnabled: state.overlaySnapEnabled,
      onChange: function () {
        markDirtyLocal();
        refreshLayersPanel();
      },
      onSelectionChange: function (sel) {
        var ids = (sel && Array.isArray(sel.buttonIds)) ? sel.buttonIds.map(String) : [];
        state.selectedOverlayIds = ids;
        var next = !!(sel && sel.hasSelection);
        if (state.expHasSelection === next && !state.selectedElementId) {
          /* still refresh dock when switching between create/context */
        }
        var prev = state.expHasSelection;
        state.expHasSelection = next;
        if (next) state.selectedElementId = null;
        if (prev !== next) refreshDockOnly();
        refreshLayersPanel();
      },
      onMultiSelectionContextMenu: function (clientX, clientY) {
        openOverlaySelectionContextMenu(clientX, clientY);
      }
    });

    syncOverlaySnapUi();

    if (expOverlay && expOverlay.isKonvaPoc && expOverlay.refresh) {
      requestAnimationFrame(function () {
        if (expOverlay && expOverlay.refresh) expOverlay.refresh();
      });
    }

    /* Keep library → scene DnD working above the overlay. */
    layer.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      layer.classList.add('is-drop-target');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    layer.addEventListener('dragleave', function () {
      layer.classList.remove('is-drop-target');
    });
    layer.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      layer.classList.remove('is-drop-target');
      var id = (e.dataTransfer && (
        e.dataTransfer.getData('text/qe-resource') ||
        e.dataTransfer.getData('text/plain')
      )) || '';
      if (id) assignResourceToScene(id);
    });

    if (pendingExpAction && expOverlay) {
      var act = pendingExpAction;
      pendingExpAction = null;
      if (act.type === 'addButton') {
        expOverlay.setEditMode('buttons');
        expOverlay.addButton();
      } else if (act.type === 'addText') {
        expOverlay.setEditMode('buttons');
        if (expOverlay.addText) expOverlay.addText();
      } else if (act.type === 'addShape') {
        expOverlay.setEditMode('buttons');
        if (expOverlay.addShape) expOverlay.addShape(act.kind || 'SHAPE_RECT');
      } else if (act.type === 'startHotspotDraw') {
        expOverlay.setEditMode('hotspots');
        expOverlay.startHotspotDraw();
      }
    }
    bindLayersPanel();
  }

  function onRuntimeBridgeMessage(ev) {
    if (isEditorRuntimeDisabled()) return;
    if (typeof QuotationRuntimeBridge === 'undefined') return;
    if (!QuotationRuntimeBridge.isMessage(ev.data)) return;
    var iframe = runtimeIframe();
    if (iframe && ev.source && iframe.contentWindow && ev.source !== iframe.contentWindow) return;

    var type = ev.data.type;
    var payload = ev.data.payload || {};
    var T = QuotationRuntimeBridge.TYPE;

    if (type === T.READY) {
      pushCoverToRuntime();
      return;
    }
    if (type === T.ELEMENT_SELECTED) {
      var id = payload.elementId;
      if (!id) return;
      var scene = activeScene();
      if (!scene || !scene.elements) return;
      var found = false;
      for (var i = 0; i < scene.elements.length; i++) {
        if (scene.elements[i].id === id) { found = true; break; }
      }
      if (!found) return;
      state.selectedElementId = id;
      state.selectedItem = null;
      refreshInspectorOnly();
    }
  }

  function bindRuntimeBridge() {
    if (isEditorRuntimeDisabled()) return;
    if (runtimeBridgeBound) return;
    runtimeBridgeBound = true;
    window.addEventListener('message', onRuntimeBridgeMessage);
  }

  /** Wire Canvas Hero iframe — Editor never mounts ProjectCover itself. */
  function mountRuntimeCanvas() {
    if (isEditorRuntimeDisabled()) return;
    var scene = activeScene();
    if (!sceneUsesProjectCover(scene)) return;
    ensureHeroCoverModel(scene);
    bindRuntimeBridge();
    var iframe = runtimeIframe();
    if (!iframe) return;
    iframe.addEventListener('load', function onLoad() {
      pushCoverToRuntime();
    });
    /* If already loaded (cached), push immediately. */
    try {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        pushCoverToRuntime();
      }
    } catch (e) {
      /* cross-origin until same-origin load — READY message handles it */
    }
  }

  function setFocusMode(on) {
    state.focusMode = !!on;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    rerender();
  }

  function toggleFocusMode() {
    setFocusMode(!state.focusMode);
  }

  /**
   * Canvas Vista Previa — same central canvas, Runtime interactions, no edit chrome.
   * opts.silent: update flag only (used when leaving the Editor step).
   */
  function setCanvasPreviewMode(on, opts) {
    opts = opts || {};
    var next = !!on;
    if (state.canvasPreviewMode === next) {
      if (!opts.silent) notifyPreviewModeChanged();
      return;
    }
    state.canvasPreviewMode = next;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    state.pendingSceneDeleteId = null;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expHasSelection = false;
    if (opts.silent) return;
    if (rootEl) rerender();
    notifyPreviewModeChanged();
  }

  function toggleCanvasPreviewMode() {
    setCanvasPreviewMode(!state.canvasPreviewMode);
  }

  function isCanvasPreviewMode() {
    return !!state.canvasPreviewMode;
  }

  function notifyPreviewModeChanged() {
    try {
      if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.refreshSidebar) {
        QuotationBuilderView.refreshSidebar();
      }
    } catch (eHint) { /* ignore */ }
    try {
      var ws = document.querySelector('.quotation-workspace');
      if (ws) {
        ws.classList.toggle('is-canvas-preview', !!state.canvasPreviewMode);
      }
    } catch (eWs) { /* ignore */ }
  }

  function setLibraryCollapsed(on) {
    state.libraryCollapsed = !!on;
    state.sceneMenuOpen = false;
    rerender();
  }

  function focusPropsPanel() {
    if (typeof QuotationBuilderView !== 'undefined') {
      if (QuotationBuilderView.setPropsPanelVisible) {
        QuotationBuilderView.setPropsPanelVisible(true);
      }
      if (QuotationBuilderView.expandPropsPanel) {
        QuotationBuilderView.expandPropsPanel();
      } else if (QuotationBuilderView.applyRightCollapsed) {
        QuotationBuilderView.applyRightCollapsed(false);
      }
    }
    state.inspectorCollapsed = false;
  }

  function setInspectorCollapsed(on) {
    /* Legacy API — maps to right props rail collapse. */
    if (on) {
      if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.applyRightCollapsed) {
        QuotationBuilderView.applyRightCollapsed(true);
      }
      state.inspectorCollapsed = true;
    } else {
      focusPropsPanel();
    }
  }

  function toggleLibraryCollapsed() {
    setLibraryCollapsed(!state.libraryCollapsed);
  }

  function toggleInspectorCollapsed() {
    setInspectorCollapsed(!state.inspectorCollapsed);
  }

  function closeInspectorIfOpen() {
    /* No sliding inspector — keep props rail as-is. */
  }

  function isBuilderFormField(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return !!(el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function hasOverlaySelection() {
    if (state.expHasSelection) return true;
    if (state.selectedElementId) return true;
    if (!expOverlay || !expOverlay.getSelection) return false;
    try {
      var sel = expOverlay.getSelection();
      return !!(sel && sel.hasSelection);
    } catch (eSel) {
      return false;
    }
  }

  function deleteOverlaySelection() {
    if (!expOverlay || !expOverlay.deleteSelected) return false;
    var ok = false;
    try { ok = !!expOverlay.deleteSelected(); } catch (eDel) { ok = false; }
    if (ok) {
      state.expHasSelection = false;
      state.selectedElementId = null;
      if (!state.inspectorCollapsed) setInspectorCollapsed(true);
      else refreshDockOnly();
    }
    return ok;
  }

  function deselectOverlay() {
    if (!expOverlay || !expOverlay.clearSelection) {
      state.expHasSelection = false;
      state.selectedElementId = null;
      refreshDockOnly();
      return false;
    }
    try { expOverlay.clearSelection(); } catch (eClr) { /* ignore */ }
    state.expHasSelection = false;
    state.selectedElementId = null;
    refreshDockOnly();
    return true;
  }

  /* V7.2.57 — universal Escape + Delete for Quotation Builder chrome. */
  function onBuilderShortcut(e) {
    if (!rootEl) return;
    if (isBuilderFormField(e.target)) return;

    if (e.key === 'Enter' && state.pendingSceneDeleteId) {
      e.preventDefault();
      e.stopPropagation();
      confirmDeleteScene();
      return;
    }

    if (e.key === 'Escape') {
      try {
        if (state.canvasPreviewMode) {
          e.preventDefault();
          e.stopPropagation();
          setCanvasPreviewMode(false);
          return;
        }
        if (state.pendingSceneDeleteId) {
          e.preventDefault();
          e.stopPropagation();
          cancelDeleteScene();
          return;
        }
        if (state.resourcePickerOpen || state.shapePickerOpen) {
          e.preventDefault();
          e.stopPropagation();
          if (state.resourcePickerOpen) closeResourcePicker();
          if (state.shapePickerOpen) closeShapePicker();
          return;
        }
        if (expOverlay && expOverlay.cancelActiveTool && expOverlay.cancelActiveTool()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (expOverlay && expOverlay.isInGroupEditMode && expOverlay.isInGroupEditMode()) {
          e.preventDefault();
          e.stopPropagation();
          if (expOverlay.exitGroupEditMode) {
            expOverlay.exitGroupEditMode({ persist: true });
          }
          return;
        }
        if (typeof QuotationGuides !== 'undefined' &&
            QuotationGuides.hasSelectedGuide && QuotationGuides.hasSelectedGuide()) {
          e.preventDefault();
          e.stopPropagation();
          QuotationGuides.deselectGuide();
          return;
        }
        if (hasOverlaySelection()) {
          e.preventDefault();
          e.stopPropagation();
          deselectOverlay();
          return;
        }
        if (!state.inspectorCollapsed) {
          e.preventDefault();
          e.stopPropagation();
          closeInspectorIfOpen();
          return;
        }
        if (state.focusMode) {
          e.preventDefault();
          e.stopPropagation();
          setFocusMode(false);
        }
      } catch (eEsc) { /* never throw from ESC */ }
      return;
    }

    /* DELETE / SUPR — immediate delete of selection (not Backspace). */
    if (e.key === 'Delete') {
      try {
        if (typeof QuotationGuides !== 'undefined' &&
            QuotationGuides.deleteSelectedGuide &&
            QuotationGuides.deleteSelectedGuide()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (!hasOverlaySelection()) return;
        e.preventDefault();
        e.stopPropagation();
        deleteOverlaySelection();
      } catch (eDelKey) { /* ignore */ }
      return;
    }

    /* Ctrl/Cmd — copy / cut / paste / undo / redo for canvas overlays. */
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      var chord = String(e.key || '').toLowerCase();
      if (chord === 'c' || chord === 'x' || chord === 'v' || chord === 'z' || chord === 'y') {
        if (state.resourcePickerOpen || state.shapePickerOpen || state.pendingSceneDeleteId) return;
        if (document.body.classList.contains('admin-modal-open')) return;
        try {
          var okChord = false;
          if (chord === 'c') {
            if (!hasOverlaySelection() || !expOverlay || !expOverlay.copySelected) return;
            okChord = !!expOverlay.copySelected();
          } else if (chord === 'x') {
            if (!hasOverlaySelection() || !expOverlay || !expOverlay.cutSelected) return;
            okChord = !!expOverlay.cutSelected();
            if (okChord) {
              state.expHasSelection = false;
              state.selectedElementId = null;
              refreshDockOnly();
            }
          } else if (chord === 'v') {
            if (!expOverlay || !expOverlay.pasteSelected) return;
            okChord = !!expOverlay.pasteSelected();
            if (okChord) {
              state.expHasSelection = true;
              refreshDockOnly();
            }
          } else if (chord === 'y' || (chord === 'z' && e.shiftKey)) {
            if (!expOverlay || !expOverlay.redoEdit) return;
            okChord = !!expOverlay.redoEdit();
          } else if (chord === 'z') {
            if (!expOverlay || !expOverlay.undoEdit) return;
            okChord = !!expOverlay.undoEdit();
          }
          if (okChord) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') {
              e.stopImmediatePropagation();
            }
          }
        } catch (eChord) { /* ignore */ }
        return;
      }
    }

    /* ← / → / ↑ / ↓ — move selected overlay; otherwise scenes / panels / fullscreen. */
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (e.metaKey || e.ctrlKey) return;
      if (state.resourcePickerOpen || state.shapePickerOpen || state.pendingSceneDeleteId) return;
      if (document.body.classList.contains('admin-modal-open')) return;
      var portalArrows = document.getElementById('qeContextMenuPortal');
      if (portalArrows && portalArrows.getAttribute('aria-hidden') === 'false' &&
          portalArrows.children.length) {
        return;
      }

      if (hasOverlaySelection() && expOverlay && expOverlay.nudgeSelected) {
        if (e.altKey) { /* allow 0.5px nudge */ }
        else if (e.shiftKey) { /* allow 10px nudge */ }
        try {
          var step = e.altKey ? 0.5 : (e.shiftKey ? 10 : 1);
          var ndx = 0;
          var ndy = 0;
          if (e.key === 'ArrowLeft') ndx = -step;
          else if (e.key === 'ArrowRight') ndx = step;
          else if (e.key === 'ArrowUp') ndy = -step;
          else if (e.key === 'ArrowDown') ndy = step;
          if (expOverlay.nudgeSelected(ndx, ndy)) {
            e.preventDefault();
            e.stopPropagation();
          }
        } catch (eNudge) { /* ignore */ }
        return;
      }

      if (e.altKey || e.shiftKey) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        try {
          if (!navigateSceneByDelta(e.key === 'ArrowRight' ? 1 : -1)) return;
          e.preventDefault();
          e.stopPropagation();
        } catch (eNav) { /* ignore */ }
        return;
      }

      if (e.key === 'ArrowDown') {
        try {
          if (typeof QuotationBuilderView === 'undefined' ||
              typeof QuotationBuilderView.toggleChromeCollapsed !== 'function') {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          QuotationBuilderView.toggleChromeCollapsed();
        } catch (eFold) { /* ignore */ }
        return;
      }

      if (e.key === 'ArrowUp') {
        try {
          e.preventDefault();
          e.stopPropagation();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () {});
          } else {
            document.exitFullscreen().catch(function () {});
          }
        } catch (eFs) { /* ignore */ }
      }
      return;
    }
  }

  function onBuilderShortcutKeyUp(e) {
    if (!rootEl) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'Alt' || e.key === 'Shift') {
      if (expOverlay && typeof expOverlay.finishNudge === 'function') {
        try { expOverlay.finishNudge(); } catch (eFin) { /* ignore */ }
      }
    }
  }

  function onInspectorOutsidePointer(e) {
    if (state.inspectorCollapsed || state.focusMode) return;
    if (state.pendingSceneDeleteId) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.qe-col--inspector')) return;
    if (t.closest('[data-qe-dock-edit]')) return;
    if (t.closest('[data-qe-toggle-inspector]')) return;
    if (t.closest('[data-qe-scene-confirm]')) return;
    closeInspectorIfOpen();
  }

  function isCanvasPointerTarget(t) {
    if (!t || !t.closest) return false;
    /* Solo el lienzo de diseño y capas montadas encima — no márgenes, dock ni escenas. */
    return !!(
      t.closest('[data-qe-canvas]') ||
      t.closest('[data-qe-edit-layer]') ||
      t.closest('[data-qe-guide-layer]') ||
      t.closest('[data-exp-gizmo]') ||
      t.closest('[data-exp-stage-btn]')
    );
  }

  function isQuotationBuilderSurface(t) {
    if (!t || !t.closest) return false;
    if (rootEl && rootEl.contains(t)) return true;
    var leftBody = document.getElementById('quotationLeftBody');
    if (leftBody && leftBody.contains(t)) return true;
    var rightBody = document.getElementById('quotationRightBody');
    if (rightBody && rightBody.contains(t)) return true;
    return !!t.closest('.quotation-workspace');
  }

  function isOverlaySelectionChromeTarget(t) {
    if (!t || !t.closest) return false;
    return !!(
      t.closest('[data-qe-dock-bar]') ||
      t.closest('[data-qe-context-menu]') ||
      t.closest('[data-qe-shape-picker]') ||
      t.closest('[data-qe-resource-picker]') ||
      t.closest('[data-qe-scene-confirm]') ||
      t.closest('[data-qe-lib-status-panel]') ||
      t.closest('[data-qe-lib-menu-panel]') ||
      t.closest('[data-qe-scene-group-float]')
    );
  }

  function onCanvasOutsidePointer(e) {
    if (!rootEl) return;
    if (state.canvasPreviewMode) return;
    if (state.pendingSceneDeleteId) return;
    if (state.resourcePickerOpen || state.shapePickerOpen) return;
    if (typeof QuotationContextMenu !== 'undefined' &&
        QuotationContextMenu.isOpen && QuotationContextMenu.isOpen()) return;

    var t = e.target;
    if (!t || !t.closest) return;
    if (!isQuotationBuilderSurface(t)) return;
    if (isCanvasPointerTarget(t)) return;
    if (isOverlaySelectionChromeTarget(t)) return;
    if (isBuilderFormField(t)) return;

    if (expOverlay && expOverlay.isInGroupEditMode && expOverlay.isInGroupEditMode()) {
      if (expOverlay.exitGroupEditMode) {
        expOverlay.exitGroupEditMode({ persist: true });
      }
      return;
    }
    if (typeof QuotationGuides !== 'undefined' &&
        QuotationGuides.hasSelectedGuide && QuotationGuides.hasSelectedGuide()) {
      QuotationGuides.deselectGuide();
      return;
    }
    if (hasOverlaySelection()) {
      deselectOverlay();
    }
  }

  function bindCanvasOutsideDeselect() {
    if (canvasOutsideDeselectBound) return;
    document.addEventListener('pointerdown', onCanvasOutsidePointer, true);
    canvasOutsideDeselectBound = true;
  }

  function bindFocusEsc() {
    if (focusEscBound) return;
    document.addEventListener('keydown', onBuilderShortcut, true);
    document.addEventListener('keyup', onBuilderShortcutKeyUp, true);
    focusEscBound = true;
  }

  function bindInspectorChrome() {
    if (inspectorChromeBound) return;
    document.addEventListener('pointerdown', onInspectorOutsidePointer, true);
    inspectorChromeBound = true;
  }

  function patchSelectedElement(mutator) {
    var el = findSelectedElement();
    if (!el) return;
    if (!el.props) el.props = {};
    mutator(el);
    applyElementToCoverModel(activeScene(), el);
    markDirtyLocal();
    if (sceneUsesProjectCover(activeScene())) {
      pushCoverToRuntime();
      refreshInspectorOnly();
      return;
    }
    rerender();
  }

  function toggleGroup(groupId) {
    state.openGroups[groupId] = !(state.openGroups[groupId] !== false);
    syncLibraryGroupsCollapsedFromState();
    persistLibraryUi();
    if (!syncLibraryGroupOpen(groupId)) rerender();
    else syncLibraryFoldAllButton();
  }

  function toggleFolder(folderId) {
    state.openFolders[folderId] = !(state.openFolders[folderId] !== false);
    persistLibraryUi();
    if (!syncLibraryFolderOpen(folderId)) rerender();
  }

  function createFolder(groupId, name) {
    var meta = groupMeta(groupId);
    if (!meta || groupId === 'hero' || meta.prepared) return;
    var label = String(name || '').trim();
    if (!label) return;
    if (folderNameTaken(groupId, label)) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('Ya existe una carpeta "' + label + '" en ' + (meta.label || 'esta sección') + '.');
      }
      return;
    }
    ensureFolderOrders();
    var folder = {
      id: nextId('fd'),
      group: groupId,
      name: label,
      order: nextFolderOrder(groupId)
    };
    state.folders.push(folder);
    state.openFolders[folder.id] = true;
    state.folderComposerGroup = null;
    state.openGroups[groupId] = true;
    markDirtyLocal();
    rerender();
  }

  function uniqueFolderCopyName(baseName, groupId) {
    var base = String(baseName || 'Carpeta').trim() || 'Carpeta';
    var names = {};
    foldersInGroup(groupId).forEach(function (f) {
      names[String(f.name || '').trim().toLowerCase()] = true;
    });
    var candidate = base + ' copia';
    if (!names[candidate.toLowerCase()]) return candidate;
    var n = 2;
    while (names[(candidate + ' (' + n + ')').toLowerCase()]) n += 1;
    return candidate + ' (' + n + ')';
  }

  function renameFolder(folderId, name) {
    var folder = folderById(folderId);
    if (!folder) return;
    var next = String(name == null ? '' : name).trim();
    state.renamingFolderId = null;
    if (!next || next === folder.name) {
      rerender();
      return;
    }
    if (folderNameTaken(folder.group, next, folder.id)) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('Ya existe una carpeta "' + next + '" en esta sección.');
      }
      rerender();
      return;
    }
    folder.name = next;
    markDirtyLocal();
    rerender();
  }

  function cancelRenameFolder() {
    if (!state.renamingFolderId) return;
    state.renamingFolderId = null;
    rerender();
  }

  function startRenameFolder(folderId) {
    if (!folderById(folderId)) return;
    state.renamingFolderId = folderId;
    rerender();
    setTimeout(function () {
      var input = document.querySelector('[data-qe-folder-rename="' + folderId + '"]');
      if (!input) return;
      input.focus();
      try { input.select(); } catch (eSel) {}
    }, 0);
  }

  function duplicateFolder(folderId) {
    var src = folderById(folderId);
    if (!src) return;
    ensureFolderOrders();
    var newFolder = {
      id: nextId('fd'),
      group: src.group,
      name: uniqueFolderCopyName(src.name, src.group),
      order: nextFolderOrder(src.group)
    };
    state.folders.push(newFolder);
    contentInFolder(src.id, src.group).forEach(function (item) {
      if (!item) return;
      var copy = {
        id: nextId('ct'),
        group: item.group,
        folderId: newFolder.id,
        name: item.name || 'Archivo',
        media: item.media || 'image',
        mime: item.mime || null,
        previewUrl: item.previewUrl || item.publicUrl || item.remoteUrl || null,
        remoteUrl: item.remoteUrl || item.publicUrl || null,
        publicUrl: item.publicUrl || item.remoteUrl || null,
        storagePath: item.storagePath || null,
        provider: item.provider || null,
        archivoId: null,
        projectId: item.projectId || resolveProjectId() || null,
        uploadStatus: item.uploadStatus || (item.publicUrl || item.remoteUrl ? 'ready' : null),
        file: null
      };
      state.content.push(copy);
      ensureItems(copy.id);
    });
    state.openFolders[newFolder.id] = true;
    state.openGroups[src.group] = true;
    markDirtyLocal();
    rerender();
  }

  function moveFolderToGroup(folderId, targetGroupId) {
    var folder = folderById(folderId);
    var meta = groupMeta(targetGroupId);
    if (!folder || !meta || String(folder.group) === String(targetGroupId)) return;
    var fromGroup = folder.group;
    ensureFolderOrders();
    folder.group = targetGroupId;
    folder.order = nextFolderOrder(targetGroupId);
    contentInFolder(folderId, fromGroup).forEach(function (item) {
      if (!item) return;
      item.group = targetGroupId;
    });
    rewriteFolderOrders(fromGroup);
    rewriteFolderOrders(targetGroupId);
    state.openGroups[targetGroupId] = true;
    state.openFolders[folderId] = true;
    markDirtyLocal();
    rerender();
  }

  async function deleteFolder(folderId) {
    var folder = folderById(folderId);
    if (!folder) return;
    var label = folder.name || 'esta carpeta';

    if (typeof AdminUI === 'undefined' || typeof AdminUI.confirm !== 'function') {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No se pudo abrir el diálogo de confirmación.');
      }
      return;
    }

    var ok = await AdminUI.confirm({
      title: 'Eliminar carpeta',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      bodyHtml:
        '<p class="admin-modal-copy">¿Eliminar «' + escapeHtml(label) + '»?</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">' +
          'Los recursos de la carpeta pasarán a la raíz del grupo.' +
        '</p>'
    });
    if (!ok) return;
    var groupId = folder.group;
    contentInFolder(folderId, groupId).forEach(function (item) {
      if (item) item.folderId = null;
    });
    state.folders = state.folders.filter(function (f) {
      return !f || String(f.id) !== String(folderId);
    });
    try { delete state.openFolders[folderId]; } catch (eOpen) {}
    if (String(state.renamingFolderId || '') === String(folderId)) {
      state.renamingFolderId = null;
    }
    rewriteFolderOrders(groupId);
    markDirtyLocal();
    rerender();
  }

  function reorderFolder(fromId, toId, placeAfter) {
    var from = folderById(fromId);
    var to = folderById(toId);
    if (!from || !to) return;
    if (String(from.group) !== String(to.group)) return;
    if (String(fromId) === String(toId)) return;
    ensureFolderOrders();
    var ordered = foldersInGroup(from.group).filter(function (f) {
      return String(f.id) !== String(fromId);
    });
    var toIdx = -1;
    for (var i = 0; i < ordered.length; i++) {
      if (String(ordered[i].id) === String(toId)) {
        toIdx = i;
        break;
      }
    }
    if (toIdx < 0) return;
    reorderFolderToIndex(fromId, placeAfter ? toIdx + 1 : toIdx);
  }

  /** insertAt = index among siblings after removing the dragged folder (0..length). */
  function reorderFolderToIndex(fromId, insertAt) {
    var from = folderById(fromId);
    if (!from) return false;
    ensureFolderOrders();
    var original = foldersInGroup(from.group);
    var ordered = original.filter(function (f) {
      return String(f.id) !== String(fromId);
    });
    var idx = Number(insertAt);
    if (isNaN(idx)) idx = ordered.length;
    idx = Math.max(0, Math.min(idx, ordered.length));
    ordered.splice(idx, 0, from);
    var same = ordered.length === original.length &&
      ordered.every(function (f, i) { return String(f.id) === String(original[i].id); });
    if (same) return false;
    ordered.forEach(function (f, i) { f.order = i; });
    markDirtyLocal();
    return true;
  }

  /* Same-category only: mutate folderId, never item.group / media / URLs. */
  function moveLibraryItemToFolder(contentId, targetFolderId, opts) {
    var item = contentById(contentId);
    if (!item) return false;
    var nextFolderId = targetFolderId ? String(targetFolderId) : null;
    if (nextFolderId) {
      var folder = folderById(nextFolderId);
      if (!folder || String(folder.group) !== String(item.group)) return false;
    }
    var cur = item.folderId ? String(item.folderId) : null;
    if (cur === nextFolderId) return false;
    item.folderId = nextFolderId;
    if (!opts || !opts.silent) {
      markDirtyLocal();
      rerender();
    }
    return true;
  }

  function moveLibraryItemsToFolder(ids, targetFolderId) {
    var list = Array.isArray(ids) ? ids : [];
    var changed = false;
    list.forEach(function (id) {
      if (moveLibraryItemToFolder(id, targetFolderId, { silent: true })) changed = true;
    });
    if (!changed) return false;
    if (targetFolderId) state.openFolders[String(targetFolderId)] = true;
    markDirtyLocal();
    rerender();
    return true;
  }

  function sameContentScope(a, b) {
    if (!a || !b) return false;
    return String(a.group || '') === String(b.group || '') &&
      folderScopeKey(a.folderId) === folderScopeKey(b.folderId);
  }

  function reorderLibraryItems(movedIds, targetId, placeAfter) {
    var target = contentById(targetId);
    if (!target || !movedIds || !movedIds.length) return false;
    var moveSet = {};
    var orderedMove = [];
    movedIds.forEach(function (id) {
      var key = String(id);
      if (moveSet[key]) return;
      var item = contentById(key);
      if (!item || !sameContentScope(item, target)) return;
      moveSet[key] = true;
      orderedMove.push(key);
    });
    if (!orderedMove.length) return false;

    var siblingIds = [];
    state.content.forEach(function (c) {
      if (c && sameContentScope(c, target)) siblingIds.push(String(c.id));
    });

    /* If dropping onto one of the dragged items, use the nearest non-dragged neighbor. */
    var dropTargetId = String(targetId);
    if (moveSet[dropTargetId]) {
      var tIdx = siblingIds.indexOf(dropTargetId);
      var neighbor = null;
      var n;
      if (placeAfter) {
        for (n = tIdx + 1; n < siblingIds.length; n++) {
          if (!moveSet[siblingIds[n]]) { neighbor = siblingIds[n]; placeAfter = false; break; }
        }
        if (!neighbor) {
          for (n = tIdx - 1; n >= 0; n--) {
            if (!moveSet[siblingIds[n]]) { neighbor = siblingIds[n]; placeAfter = true; break; }
          }
        }
      } else {
        for (n = tIdx - 1; n >= 0; n--) {
          if (!moveSet[siblingIds[n]]) { neighbor = siblingIds[n]; placeAfter = true; break; }
        }
        if (!neighbor) {
          for (n = tIdx + 1; n < siblingIds.length; n++) {
            if (!moveSet[siblingIds[n]]) { neighbor = siblingIds[n]; placeAfter = false; break; }
          }
        }
      }
      if (!neighbor) return false;
      dropTargetId = neighbor;
    }

    var rest = siblingIds.filter(function (id) { return !moveSet[id]; });
    var targetIdx = rest.indexOf(dropTargetId);
    if (targetIdx < 0) return false;
    var insertAt = placeAfter ? targetIdx + 1 : targetIdx;
    var newOrder = rest.slice(0, insertAt).concat(orderedMove).concat(rest.slice(insertAt));

    if (newOrder.length === siblingIds.length &&
        newOrder.every(function (id, i) { return id === siblingIds[i]; })) {
      return false;
    }

    var byId = {};
    state.content.forEach(function (c) {
      if (c) byId[String(c.id)] = c;
    });
    var queue = newOrder.map(function (id) { return byId[id]; }).filter(Boolean);
    var qi = 0;
    state.content = state.content.map(function (c) {
      if (c && sameContentScope(c, target)) return queue[qi++];
      return c;
    });
    markDirtyLocal();
    rerender();
    return true;
  }

  function clearLibReorderIndicators() {
    document.querySelectorAll('.qe-lib__item.is-lib-reorder-before, .qe-lib__item.is-lib-reorder-after').forEach(function (el) {
      el.classList.remove('is-lib-reorder-before', 'is-lib-reorder-after');
    });
  }

  function resolveLibDragIds(fallbackId) {
    if (libItemDrag && libItemDrag.ids && libItemDrag.ids.length) {
      return libItemDrag.ids.slice();
    }
    return fallbackId ? [String(fallbackId)] : [];
  }

  function clearLibDropTargetMarks() {
    document.querySelectorAll('.is-lib-drop-target, .is-drop-target').forEach(function (z) {
      z.classList.remove('is-lib-drop-target', 'is-drop-target');
    });
  }

  function endLibPointerDragWatchers() {
    window.removeEventListener('pointermove', onLibItemPointerMove);
    window.removeEventListener('pointerup', onLibItemPointerUp, true);
    window.removeEventListener('pointercancel', onLibItemPointerUp, true);
  }

  function buildLibItemDragState(libId) {
    var dragItem = contentById(libId);
    if (!dragItem) return null;
    var moveIds = [String(libId)];
    if (isLibraryItemSelected(libId) && librarySelectedCountInGroup(dragItem.group) > 1) {
      moveIds = Object.keys(state.librarySelectedIds || {}).filter(function (id) {
        if (!state.librarySelectedIds[id]) return false;
        var c = contentById(id);
        return !!(c && sameContentScope(c, dragItem));
      });
      if (!moveIds.length) moveIds = [String(libId)];
    }
    return {
      primaryId: String(libId),
      ids: moveIds,
      group: String(dragItem.group || ''),
      folder: dragItem.folderId ? String(dragItem.folderId) : ''
    };
  }

  function updateLibPointerHover(clientX, clientY) {
    if (!libItemDrag) return;
    clearLibReorderIndicators();
    clearLibDropTargetMarks();
    var under = document.elementFromPoint(clientX, clientY);
    if (!under || !under.closest) return;

    var overItem = under.closest('[data-qe-content][data-qe-drag-lib]');
    if (overItem) {
      var overGroup = overItem.getAttribute('data-qe-lib-group') || '';
      var overFolder = overItem.getAttribute('data-qe-lib-folder') || '';
      var overId = overItem.getAttribute('data-qe-content') || '';
      if (overGroup === libItemDrag.group && overFolder === libItemDrag.folder) {
        if (!(libItemDrag.ids.length === 1 && String(libItemDrag.primaryId) === String(overId))) {
          var rect = overItem.getBoundingClientRect();
          var after = clientY > rect.top + rect.height / 2;
          overItem.classList.add(after ? 'is-lib-reorder-after' : 'is-lib-reorder-before');
          libItemDrag.hover = { kind: 'reorder', targetId: overId, after: after };
          return;
        }
      }
    }

    var overFolderBlock = under.closest('[data-qe-lib-drop-folder]');
    if (overFolderBlock) {
      var dropGroup = overFolderBlock.getAttribute('data-qe-lib-drop-group') || '';
      var folderId = overFolderBlock.getAttribute('data-qe-lib-drop-folder') || null;
      var nextKey = folderId ? String(folderId) : '';
      if (dropGroup === libItemDrag.group && nextKey !== (libItemDrag.folder || '')) {
        overFolderBlock.classList.add('is-lib-drop-target');
        libItemDrag.hover = { kind: 'folder', folderId: folderId };
        return;
      }
    }

    var overRoot = under.closest('[data-qe-lib-drop-root]');
    if (overRoot && !under.closest('[data-qe-lib-drop-folder]')) {
      var rootGroup = overRoot.getAttribute('data-qe-lib-drop-group') || '';
      if (rootGroup === libItemDrag.group && (libItemDrag.folder || '')) {
        overRoot.classList.add('is-lib-drop-target');
        libItemDrag.hover = { kind: 'folder', folderId: null };
        return;
      }
    }

    var overScene = under.closest('[data-qe-drop-scene]');
    if (overScene && libItemDrag.ids.length === 1) {
      var canScene = document.querySelector(
        '[data-qe-drag-resource="' + libItemDrag.primaryId + '"]'
      );
      if (canScene) {
        overScene.classList.add('is-drop-target');
        libItemDrag.hover = {
          kind: 'scene',
          sceneId: overScene.getAttribute('data-qe-drop-scene-id') || null
        };
        return;
      }
    }

    libItemDrag.hover = null;
  }

  function commitLibPointerDrop() {
    if (!libItemDrag || !libItemDrag.hover) return false;
    var hover = libItemDrag.hover;
    var ids = resolveLibDragIds();
    if (!ids.length) return false;
    if (hover.kind === 'reorder' && hover.targetId) {
      return reorderLibraryItems(ids, hover.targetId, !!hover.after);
    }
    if (hover.kind === 'folder') {
      return moveLibraryItemsToFolder(ids, hover.folderId || null);
    }
    if (hover.kind === 'scene') {
      assignResourceToScene(ids[0], hover.sceneId || undefined);
      return true;
    }
    return false;
  }

  function onLibItemPointerMove(e) {
    if (!libPointerDrag) return;
    var dx = e.clientX - libPointerDrag.startX;
    var dy = e.clientY - libPointerDrag.startY;
    if (!libPointerDrag.active) {
      if ((dx * dx + dy * dy) < 36) return;
      libPointerDrag.active = true;
      folderDrag = null;
      libItemDrag = buildLibItemDragState(libPointerDrag.primaryId);
      if (!libItemDrag) {
        libPointerDrag = null;
        endLibPointerDragWatchers();
        return;
      }
      libItemDrag.hover = null;
      document.body.classList.add('is-qe-lib-pointer-dragging');
      libItemDrag.ids.forEach(function (id) {
        var row = document.querySelector('[data-qe-content="' + id + '"]');
        if (row) row.classList.add('is-dragging');
      });
      try { libPointerDrag.el.setPointerCapture(e.pointerId); } catch (errCap) { /* ignore */ }
    }
    e.preventDefault();
    updateLibPointerHover(e.clientX, e.clientY);
  }

  function onLibItemPointerUp(e) {
    if (!libPointerDrag) return;
    var wasActive = !!libPointerDrag.active;
    endLibPointerDragWatchers();
    try {
      if (libPointerDrag.el && libPointerDrag.el.releasePointerCapture) {
        libPointerDrag.el.releasePointerCapture(e.pointerId);
      }
    } catch (errRel) { /* ignore */ }

    document.body.classList.remove('is-qe-lib-pointer-dragging');
    document.querySelectorAll('.qe-lib__item.is-dragging').forEach(function (row) {
      row.classList.remove('is-dragging');
    });

    var committed = false;
    if (wasActive && libItemDrag) {
      suppressLibItemClickUntil = Date.now() + 450;
      committed = commitLibPointerDrop();
    }
    clearLibReorderIndicators();
    clearLibDropTargetMarks();
    libPointerDrag = null;
    libItemDrag = null;
    if (committed) {
      /* reorder/move already rerender — drop queued thumb refresh */
      thumbRerenderQueued = false;
    } else {
      flushQueuedThumbRerender();
    }
  }

  function onLibItemPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target && e.target.closest && (
      e.target.closest('[data-qe-lib-menu]') ||
      e.target.closest('[data-qe-content-rename]') ||
      e.target.closest('[data-qe-lib-check]') ||
      e.target.closest('[data-qe-lib-check-wrap]') ||
      e.target.closest('[data-qe-lib-select-all]')
    )) return;
    var el = e.currentTarget;
    var libId = el.getAttribute('data-qe-drag-lib');
    if (!libId || !contentById(libId)) return;
    if (String(state.renamingContentId || '') === String(libId)) return;

    libPointerDrag = {
      primaryId: String(libId),
      el: el,
      startX: e.clientX,
      startY: e.clientY,
      active: false
    };
    window.addEventListener('pointermove', onLibItemPointerMove, { passive: false });
    window.addEventListener('pointerup', onLibItemPointerUp, true);
    window.addEventListener('pointercancel', onLibItemPointerUp, true);
  }

  function bindLibraryItemPointerDnD() {
    var root = document.getElementById('quotationLeftBody');
    if (!root) {
      root = document.querySelector('[data-qe-content-list]');
    }
    if (!root) return;
    root.querySelectorAll('[data-qe-drag-lib]').forEach(function (el) {
      el.setAttribute('draggable', 'false');
      el.addEventListener('pointerdown', onLibItemPointerDown);
    });
  }

  function markDirtyLocal() {
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mark) {
      BuilderDirtyState.mark();
    }
    persistDraft();
    scheduleAutosave('dirty');
  }

  function setHeroFromFile(file, media) {
    /* Library-only: store under hero group; never assign to a scene. */
    if (!file) return;
    addFilesToGroup('hero', [file], null, media);
  }

  function addFilesToGroup(groupId, fileList, folderId, forceMedia) {
    var meta = groupMeta(groupId);
    if (!meta || meta.linkMode || meta.prepared) return;
    if (folderId) {
      var targetFolder = folderById(folderId);
      if (!targetFolder || String(targetFolder.group || '') !== String(groupId || '')) {
        folderId = null;
      }
    }
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var lastId = null;
    var created = [];
    files.forEach(function (file) {
      var name = nameFromFile(file);
      if (!name) return;
      var isVideo = forceMedia === 'video' || groupId === 'videos' || groupId === 'hero-video' ||
        (file.type && file.type.indexOf('video/') === 0);
      var isPdf = groupId === 'pdf' ||
        (file.type === 'application/pdf') ||
        /\.pdf$/i.test(name);
      var targetGroup = groupId === 'hero-video' ? 'hero' : groupId;
      if (targetGroup === 'hero') {
        if (!isVideo && file.type && file.type.indexOf('image/') !== 0 &&
            !/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(name) &&
            !/\.(mp4|webm|mov|m4v|ogg)$/i.test(name)) {
          return;
        }
      } else if (groupId === 'pdf') {
        if (!isPdf) return;
      } else if (groupId === 'videos') {
        if (file.type && file.type.indexOf('video/') !== 0 &&
            !/\.(mp4|webm|mov|m4v|ogg)$/i.test(name)) {
          return;
        }
      } else if (file.type && file.type.indexOf('image/') !== 0 &&
          !/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(name)) {
        return;
      }
      /* Client-side size gate — same limit as bunny-media (before any network wait). */
      if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.assertFileWithinUploadLimit) {
        var sizeCat = isPdf ? 'documents' : (isVideo ? 'videos' : 'images');
        try {
          BunnyMediaApi.assertFileWithinUploadLimit(file, sizeCat);
        } catch (eTooBig) {
          if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
            AdminNotify.error(
              (eTooBig && eTooBig.message) ||
              (BunnyMediaApi.uploadLimitMessage && BunnyMediaApi.uploadLimitMessage(file, sizeCat)) ||
              'Archivo demasiado grande'
            );
          }
          return;
        }
      }
      /* Temporary blob preview only until Storage upload finishes — never serialized. */
      var tempBlob = isPdf ? null : URL.createObjectURL(file);
      var item = {
        id: nextId('ct'),
        group: targetGroup,
        folderId: folderId || null,
        name: name,
        media: isPdf ? 'pdf' : (isVideo ? 'video' : 'image'),
        mime: (file && file.type) || null,
        previewUrl: tempBlob,
        remoteUrl: null,
        publicUrl: null,
        storagePath: null,
        provider: null,
        archivoId: null,
        projectId: resolveProjectId() || null,
        uploadStatus: 'pending',
        thumbReady: false,
        sizeBytes: file && file.size != null ? (Number(file.size) || 0) : 0,
        file: file
      };
      state.content.push(item);
      ensureItems(item.id);
      lastId = item.id;
      created.push(item);
      qeLibAudit('1-select-file:added', item);
    });
    if (!lastId) return;
    state.selectedContentId = lastId;
    state.selectedItem = null;
    state.selectedElementId = null;
    state.openGroups[groupId === 'hero-video' ? 'hero' : groupId] = true;
    if (folderId) state.openFolders[folderId] = true;
    markDirtyLocal();
    notifyLibraryCapacityChanged();
    rerender();
    qeLibAudit('1-select-file:after-rerender');

    /* V7.2.29 — Upload immediately via BunnyMediaApi (sole media provider). */
    (function uploadCreated(list) {
      var chain = Promise.resolve();
      list.forEach(function (item) {
        chain = chain.then(function () {
          return uploadLibraryItem(item).then(function () {
            markDirtyLocal();
            notifyLibraryCapacityChanged();
            rerender();
            qeLibAudit('2-after-uploadLibraryItem', item);
          });
        });
      });
      chain.catch(function (err) {
        console.error('[QE-LIB V7.2.37] upload library FAILED', err);
        if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
          AdminNotify.error((err && err.message) || 'No se pudo subir el archivo a Storage.');
        }
        qeLibAudit('2-upload-FAILED');
        notifyLibraryCapacityChanged();
        rerender();
      });
    })(created);
  }

  function addTourUrls(rawText, folderId) {
    if (folderId && !folderById(folderId)) folderId = null;
    var urls = parseUrlLines(rawText);
    var lastId = null;
    urls.forEach(function (url) {
      if (!isLapentorUrl(url)) return;
      var item = {
        id: nextId('ct'),
        group: 'tours360',
        folderId: folderId || null,
        name: nameFromUrl(url),
        media: 'link',
        previewUrl: null,
        remoteUrl: url,
        sizeBytes: 0
      };
      state.content.push(item);
      ensureItems(item.id);
      lastId = item.id;
    });
    state.tourComposer = { open: false, folderId: null };
    if (folderId) state.openFolders[folderId] = true;
    if (lastId) {
      state.selectedContentId = lastId;
      state.selectedItem = null;
    }
    markDirtyLocal();
    rerender();
  }

  function addButton() {
    if (!activeScene()) return;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expEditMode = 'buttons';
    state.dockOpen = false;
    markDirtyLocal();
    if (expOverlay) {
      refreshInspectorOnly();
      var host = rootEl && rootEl.querySelector('[data-exp-inspector-body]');
      if (host && expOverlay.setInspectorBody) expOverlay.setInspectorBody(host);
      expOverlay.setEditMode('buttons');
      expOverlay.addButton();
      return;
    }
    pendingExpAction = { type: 'addButton' };
    rerender();
  }

  function addHotspot() {
    if (!activeScene()) return;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expEditMode = 'hotspots';
    state.dockOpen = false;
    markDirtyLocal();
    if (expOverlay) {
      refreshInspectorOnly();
      var hostHs = rootEl && rootEl.querySelector('[data-exp-inspector-body]');
      if (hostHs && expOverlay.setInspectorBody) expOverlay.setInspectorBody(hostHs);
      expOverlay.setEditMode('hotspots');
      expOverlay.startHotspotDraw();
      return;
    }
    pendingExpAction = { type: 'startHotspotDraw' };
    rerender();
  }

  function addTextElement() {
    if (!activeScene()) return;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expEditMode = 'buttons';
    state.dockOpen = false;
    markDirtyLocal();
    if (expOverlay) {
      refreshInspectorOnly();
      var host = rootEl && rootEl.querySelector('[data-exp-inspector-body]');
      if (host && expOverlay.setInspectorBody) expOverlay.setInspectorBody(host);
      expOverlay.setEditMode('buttons');
      if (expOverlay.addText) expOverlay.addText();
      return;
    }
    pendingExpAction = { type: 'addText' };
    rerender();
  }

  /** BOXIES dock vNext — placeholders until tools ship. */
  function dockPlaceholderAction(kind) {
    if (!activeScene()) return;
    try {
      console.log('[QuotationEditor] dock tool pending:', kind);
    } catch (eLog) { /* ignore */ }
  }

  /** Selection dock — Animar / Interactividad (pending implementation). */
  function dockSelectionAction(kind) {
    if (!dockHasSelection()) return;
    try {
      console.log('[QuotationEditor] dock selection action pending:', kind);
    } catch (eLog) { /* ignore */ }
  }

  function addStrokeElement() {
    dockPlaceholderAction('stroke');
  }

  function addContainerElement() {
    dockPlaceholderAction('container');
  }

  function addComponentElement() {
    dockPlaceholderAction('component');
  }

  function addAdvancedElement() {
    dockPlaceholderAction('advanced');
  }

  function addShapeElement(kind) {
    if (!activeScene()) return;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.expEditMode = 'buttons';
    state.dockOpen = false;
    state.shapePickerOpen = false;
    markDirtyLocal();
    if (expOverlay) {
      refreshInspectorOnly();
      var host = rootEl && rootEl.querySelector('[data-exp-inspector-body]');
      if (host && expOverlay.setInspectorBody) expOverlay.setInspectorBody(host);
      expOverlay.setEditMode('buttons');
      if (expOverlay.addShape) expOverlay.addShape(kind || 'SHAPE_RECT');
      return;
    }
    pendingExpAction = { type: 'addShape', kind: kind || 'SHAPE_RECT' };
    rerender();
  }

  function patchSelected(mutator) {
    var found = findSelectedItem();
    if (found) {
      mutator(found.data);
      markDirtyLocal();
      rerender();
      return;
    }
    var el = findSelectedElement();
    if (!el) return;
    if (!el.props) el.props = {};
    var shim = elementAsButtonItem(el);
    mutator(shim);
    el.props.label = shim.label;
    if (el.type === 'text') el.props.text = shim.label;
    el.props.style = shim.style;
    el.props.action = shim.action;
    el.props.targetSceneId = shim.targetSceneId;
    applyElementToCoverModel(activeScene(), el);
    markDirtyLocal();
    if (sceneUsesProjectCover(activeScene())) {
      pushCoverToRuntime();
      refreshInspectorOnly();
      return;
    }
    rerender();
  }

  /** Capture-phase delete/confirm — survives thumb drag and canvas overlays. */
  function bindSceneDeleteDelegation(panel) {
    if (!panel || panel.dataset.qeSceneDeleteBound === '1') return;
    panel.dataset.qeSceneDeleteBound = '1';
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var del = t.closest('[data-qe-scene-delete]');
      if (del && panel.contains(del)) {
        e.preventDefault();
        e.stopPropagation();
        requestDeleteScene(del.getAttribute('data-qe-scene-delete'));
        return;
      }
      if (t.closest('[data-qe-scene-confirm-ok]') && panel.contains(t.closest('[data-qe-scene-confirm]'))) {
        e.preventDefault();
        e.stopPropagation();
        confirmDeleteScene();
        return;
      }
      if (t.closest('[data-qe-scene-confirm-cancel]') && panel.contains(t.closest('[data-qe-scene-confirm]'))) {
        e.preventDefault();
        e.stopPropagation();
        cancelDeleteScene();
      }
    }, true);
  }

  function bind(panel, ctx) {
    rootEl = panel;
    if (ctx && typeof ctx === 'object') editorProjectCtx = ctx;
    hydrateEditorProjectCtxSlug();
    bindFocusEsc();
    bindInspectorChrome();
    bindCanvasOutsideDeselect();
    bindSceneDeleteDelegation(panel);
    syncRightPanel();

    var projectId = String((editorProjectCtx && editorProjectCtx.id) || '').trim();

    function wireEditor() {
      bindCanvasFit();
      mountBuilderRuntimeScene();
      var editor = panel.querySelector('[data-qe-editor]') || panel;
      var leftBody = document.getElementById('quotationLeftBody');

      function qAll(sel) {
        var out = [];
        function collect(root) {
          if (!root || !root.querySelectorAll) return;
          Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) {
            out.push(el);
          });
        }
        collect(editor);
        if (leftBody) collect(leftBody);
        var rightBody = document.getElementById('quotationRightBody');
        if (rightBody) collect(rightBody);
        return out;
      }

      function qOne(sel) {
        if (editor && editor.querySelector) {
          var a = editor.querySelector(sel);
          if (a) return a;
        }
        if (leftBody && leftBody.querySelector) return leftBody.querySelector(sel);
        var rightBody = document.getElementById('quotationRightBody');
        if (rightBody && rightBody.querySelector) return rightBody.querySelector(sel);
        return null;
      }

      qAll('[data-qe-toggle-inspector]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleInspectorCollapsed();
        });
      });

      var closePicker = qOne('[data-qe-close-resource-picker]');
      if (closePicker) {
        closePicker.addEventListener('click', function () { closeResourcePicker(); });
      }
      var picker = qOne('[data-qe-resource-picker]');
      if (picker) {
        picker.addEventListener('click', function (e) {
          if (e.target === picker) closeResourcePicker();
        });
      }
      qAll('[data-qe-close-shape-picker]').forEach(function (btn) {
        btn.addEventListener('click', function () { closeShapePicker(); });
      });
      var shapePicker = qOne('[data-qe-shape-picker]');
      if (shapePicker) {
        shapePicker.addEventListener('click', function (e) {
          if (e.target === shapePicker || e.target.hasAttribute('data-qe-close-shape-picker')) {
            closeShapePicker();
          }
        });
      }
      qAll('[data-qe-pick-shape]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          pickShape(btn.getAttribute('data-qe-pick-shape'));
        });
      });
      qAll('[data-qe-pick-resource]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          assignResourceToScene(
            btn.getAttribute('data-qe-pick-resource'),
            state.resourcePickerSceneId || undefined
          );
        });
      });

      /* Pointer-based library item drag (HTML5 drag is unreliable on these rows). */
      bindLibraryItemPointerDnD();
      qAll('[data-qe-drop-scene]').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
          if (isSceneReorderDragActive(e)) {
            zone.classList.remove('is-drop-target');
            return;
          }
          var dragEl = document.querySelector('.qe-lib__item.is-dragging');
          if (dragEl && !dragEl.getAttribute('data-qe-drag-resource')) {
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('is-drop-target');
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });
        zone.addEventListener('dragleave', function () {
          zone.classList.remove('is-drop-target');
        });
        zone.addEventListener('drop', function (e) {
          if (isSceneReorderDragActive(e)) {
            zone.classList.remove('is-drop-target');
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('is-drop-target');
          var id = '';
          if (e.dataTransfer) {
            try { id = e.dataTransfer.getData('text/qe-resource') || ''; } catch (eRes) {}
            if (!id) {
              var plain = e.dataTransfer.getData('text/plain') || '';
              if (plain && plain !== 'qe-scene' && String(plain).indexOf('sc-') !== 0) {
                id = plain;
              }
            }
          }
          var sceneId = zone.getAttribute('data-qe-drop-scene-id') || null;
          if (id) assignResourceToScene(id, sceneId || undefined);
        });
      });

      editor.querySelectorAll('[data-qe-scene]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          var id = btn.getAttribute('data-qe-scene');
          if (e.shiftKey && id && !isHeroScene(sceneById(id))) {
            e.preventDefault();
            e.stopPropagation();
            toggleSceneSelection(id);
            return;
          }
          clearSceneSelection();
          selectScene(id);
        });
      });

      /* Scene delete / confirm: bindSceneDeleteDelegation (capture on panel). */

      var sceneAdd = editor.querySelector('[data-qe-scene-add]');
      if (sceneAdd) {
        sceneAdd.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          createScene({});
        });
      }

      var scenesTrackWrap = editor.querySelector('.qe-scenes__track-wrap');
      var scenesTrack = editor.querySelector('[data-qe-scenes-track]');
      var scenesPrev = editor.querySelector('[data-qe-scenes-prev]');
      var scenesNext = editor.querySelector('[data-qe-scenes-next]');
      function scrollScenes(dir) {
        var el = scenesTrackWrap || scenesTrack;
        if (!el) return;
        el.scrollBy({
          left: dir * Math.max(200, el.clientWidth * 0.6),
          behavior: 'smooth'
        });
      }
      if (scenesTrack) {
        /* Prevent focused thumbs from auto-scrolling the strip on click/rerender. */
        scenesTrack.addEventListener('focusin', function (e) {
          if (Date.now() < scenesStripRevealUntil) return;
          var thumb = e.target && e.target.closest
            ? e.target.closest('.qe-scenes__thumb')
            : null;
          if (!thumb || !scenesTrack.contains(thumb)) return;
          var pinned = scenesTrackScrollLeft;
          var scrollEl = scenesTrackWrap || scenesTrack;
          requestAnimationFrame(function () {
            if (Math.abs(scrollEl.scrollLeft - pinned) > 1) {
              scrollEl.style.scrollBehavior = 'auto';
              scrollEl.scrollLeft = pinned;
              scenesTrackScrollLeft = pinned;
            }
          });
        });
      }
      if (scenesPrev) scenesPrev.addEventListener('click', function () { scrollScenes(-1); });
      if (scenesNext) scenesNext.addEventListener('click', function () { scrollScenes(1); });
      bindSceneContextMenus(editor);
      bindSceneGroups(editor);
      bindOutlinerGroups(document.getElementById('quotationRightBody'));
      bindSceneNameEditing(editor);
      bindSceneDragReorder(editor);
      bindFolderMenus();
      bindFolderRenameInputs();
      bindFolderDragReorder();

      editor.querySelectorAll('[data-qe-viewport]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var next = btn.getAttribute('data-qe-viewport') || 'desktop';
          if (state.viewportPreset === next) return;
          state.viewportPreset = next;
          state.canvasUserZoom = 1;
          state.canvasPanX = null;
          state.canvasPanY = null;
          destroyBuilderRuntimeScene();
          rerender();
        });
      });

      var snapToggle = editor.querySelector('[data-qe-toggle-snap]');
      if (snapToggle && !snapToggle.dataset.bound) {
        snapToggle.dataset.bound = '1';
        snapToggle.addEventListener('click', function () {
          setOverlaySnapEnabled(!state.overlaySnapEnabled);
        });
      }

      var backpackToggle = editor.querySelector('[data-qe-toggle-backpack]');
      if (backpackToggle && !backpackToggle.dataset.bound) {
        backpackToggle.dataset.bound = '1';
        backpackToggle.addEventListener('click', function () {
          toggleBackpackMode();
        });
      }

      var viewportBar = editor.querySelector('[data-qe-viewport-bar]');
      if (viewportBar && !viewportBar.dataset.inspectCtx) {
        viewportBar.dataset.inspectCtx = '1';
        viewportBar.addEventListener('contextmenu', function (e) {
          if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
          e.preventDefault();
          e.stopPropagation();
          QuotationContextMenu.open({
            x: e.clientX,
            y: e.clientY,
            ariaLabel: 'Herramientas',
            items: [{ id: 'inspect', label: 'Inspeccionar página' }],
            onSelect: function (id) {
              if (id !== 'inspect') return;
              if (typeof BoxiesShell !== 'undefined' && BoxiesShell.openPageForInspect) {
                BoxiesShell.openPageForInspect();
              } else {
                window.open(window.location.href, '_blank', 'noopener,noreferrer');
              }
            }
          });
        });
      }

      var scenesFold = editor.querySelector('[data-qe-scenes-fold]');
      if (scenesFold && !scenesFold.dataset.bound) {
        scenesFold.dataset.bound = '1';
        scenesFold.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (state.scenesLocked) return;
          applyScenesCollapsed(!state.scenesCollapsed);
        });
        scenesFold.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openScenesFoldLockMenu(e.clientX, e.clientY);
        });
      }
      syncScenesFoldButton();

      /* Legacy dock toggles kept for template menus if present */
      editor.querySelectorAll('[data-qe-dock]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = btn.getAttribute('data-qe-dock');
          if (id === 'scene') {
            if (state.dockOpen === 'scene' && state.sceneMenuOpen) {
              state.dockOpen = false;
              state.sceneMenuOpen = false;
            } else {
              state.dockOpen = 'scene';
              state.sceneMenuOpen = 'root';
            }
          } else {
            state.sceneMenuOpen = false;
            state.dockOpen = state.dockOpen === id ? false : id;
          }
          rerender();
        });
      });

      var sceneMenuToggle = editor.querySelector('[data-qe-scene-menu-toggle]');
      if (sceneMenuToggle) {
        sceneMenuToggle.addEventListener('click', function (e) {
          e.stopPropagation();
          state.dockOpen = 'scene';
          state.sceneMenuOpen = state.sceneMenuOpen ? false : 'root';
          if (!state.sceneMenuOpen) state.dockOpen = false;
          rerender();
        });
      }

    var sceneMenuTemplates = editor.querySelector('[data-qe-scene-menu-templates]');
    if (sceneMenuTemplates) {
      sceneMenuTemplates.addEventListener('click', function (e) {
        e.stopPropagation();
        state.sceneMenuOpen = 'templates';
        rerender();
      });
    }

    var sceneMenuRoot = editor.querySelector('[data-qe-scene-menu-root]');
    if (sceneMenuRoot) {
      sceneMenuRoot.addEventListener('click', function (e) {
        e.stopPropagation();
        state.sceneMenuOpen = 'root';
        rerender();
      });
    }

    editor.querySelectorAll('[data-qe-scene-new]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-qe-scene-new');
        if (mode === 'empty') createScene({});
      });
    });

    editor.querySelectorAll('[data-qe-scene-from-template]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        createSceneFromTemplate(btn.getAttribute('data-qe-scene-from-template'));
      });
    });

    var toggleAllBtn = qOne('[data-qe-toggle-all-groups]');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleAllLibraryGroups();
      });
    }

    qAll('[data-qe-fold-group-folders]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleGroupFolders(btn.getAttribute('data-qe-fold-group-folders'));
      });
      btn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
      });
    });

    var libSearch = qOne('[data-qe-lib-search]');
    if (libSearch) {
      libSearch.addEventListener('input', function () {
        state.librarySearchQuery = String(libSearch.value || '');
        state._libSearchCaret = libSearch.selectionStart;
        state._restoreLibSearch = true;
        schedulePersistLibraryUi();
        rerender();
      });
      libSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          state.librarySearchQuery = '';
          state._restoreLibSearch = true;
          state._libSearchCaret = 0;
          persistLibraryUi();
          rerender();
        }
      });
    }

    var statusBtn = qOne('[data-qe-lib-status]');
    if (statusBtn) {
      statusBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleProjectStatusPanel(statusBtn);
      });
      statusBtn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
      });
    }

    var availableBtn = qOne('[data-qe-lib-available]');
    if (availableBtn) {
      availableBtn.addEventListener('click', function (e) {
        e.preventDefault();
        state.libraryAvailableOnly = !state.libraryAvailableOnly;
        persistLibraryUi();
        rerender();
      });
    }

    qAll('[data-qe-lib-view]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var next = btn.getAttribute('data-qe-lib-view') === 'grid' ? 'grid' : 'list';
        if (state.libraryView === next) return;
        state.libraryView = next;
        persistLibraryUi();
        rerender();
      });
    });

    if (state._restoreLibSearch) {
      state._restoreLibSearch = false;
      var restoreSearch = qOne('[data-qe-lib-search]');
      if (restoreSearch) {
        restoreSearch.focus();
        var caret = state._libSearchCaret;
        if (typeof caret === 'number') {
          try { restoreSearch.setSelectionRange(caret, caret); } catch (eCaret) {}
        }
      }
    }

    var openMenuBtn = editor.querySelector('[data-qe-open-main-menu]');
    if (openMenuBtn) {
      openMenuBtn.addEventListener('click', function () {
        state.dockOpen = false;
        if (typeof QuotationMainMenuHost !== 'undefined' && QuotationMainMenuHost.open) {
          QuotationMainMenuHost.open();
        } else if (typeof VisitorMenu !== 'undefined' && VisitorMenu.handleExplorar) {
          if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(6000);
          VisitorMenu.handleExplorar();
        } else if (typeof goTo === 'function') {
          if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(6000);
          goTo('menu-primary');
        }
        rerender();
      });
    }

    var createTplBtn = editor.querySelector('[data-qe-create-template]');
    if (createTplBtn) {
      createTplBtn.addEventListener('click', function () {
        createTemplateFromActiveScene();
      });
    }

    editor.querySelectorAll('[data-qe-element]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectElement(btn.getAttribute('data-qe-element'));
      });
    });

    var elText = editor.querySelector('[data-qe-el-text]');
    if (elText) {
      elText.addEventListener('change', function () {
        patchSelectedElement(function (el) {
          var val = String(elText.value || '').trim();
          if (el.type === 'text') el.props.text = val;
          else if (el.type === 'image') el.props.label = val || el.props.label;
          else el.props.label = val || el.props.label;
        });
      });
      elText.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          elText.blur();
        }
      });
    }

    var elSrc = editor.querySelector('[data-qe-el-src]');
    if (elSrc) {
      elSrc.addEventListener('change', function () {
        patchSelectedElement(function (el) {
          el.props.src = String(elSrc.value || '').trim();
          el.props.show = !!el.props.src;
        });
      });
    }

    qAll('[data-qe-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleGroup(btn.getAttribute('data-qe-toggle'));
      });
    });

    qAll('[data-qe-lib-select-mode]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        onLibrarySelectTriggerClick(btn);
      });
      btn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
      });
    });

    qAll('[data-qe-lib-check]').forEach(function (input) {
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      input.addEventListener('change', function (e) {
        e.stopPropagation();
        toggleLibraryItemSelected(input.getAttribute('data-qe-lib-check'));
      });
    });

    qAll('[data-qe-lib-select-all]').forEach(function (label) {
      var input = label.querySelector('[data-qe-lib-select-all-input]');
      if (!input) return;
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      input.addEventListener('change', function (e) {
        e.stopPropagation();
        var groupId = label.getAttribute('data-qe-lib-select-all');
        var folderAttr = label.getAttribute('data-qe-lib-select-all-folder');
        var folderId = folderAttr ? folderAttr : null;
        if (!groupId) return;
        ensureLibrarySelectMode(groupId);
        setLibrarySelectionAllInScope(groupId, folderId, !!input.checked);
        state.librarySelectAnchorId = null;
        closeLibrarySelectPopoverOnly();
        rerender();
      });
    });

    qAll('[data-qe-folder-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (Date.now() < suppressFolderToggleUntil) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        toggleFolder(btn.getAttribute('data-qe-folder-toggle'));
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggleFolder(btn.getAttribute('data-qe-folder-toggle'));
      });
    });

    qAll('[data-qe-content]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (Date.now() < suppressLibItemClickUntil) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.target && e.target.closest && (
          e.target.closest('[data-qe-lib-menu]') ||
          e.target.closest('[data-qe-content-rename]') ||
          e.target.closest('[data-qe-lib-check]') ||
          e.target.closest('[data-qe-lib-check-wrap]') ||
          e.target.closest('[data-qe-lib-select-all]')
        )) return;
        var id = el.getAttribute('data-qe-content');
        if (handleLibraryItemSelectClick(id, e)) return;
        selectContent(id);
      });
      el.addEventListener('contextmenu', function (e) {
        if (e.target && e.target.closest && (
          e.target.closest('[data-qe-content-rename]') ||
          e.target.closest('[data-qe-lib-menu]')
        )) return;
        e.preventDefault();
        e.stopPropagation();
        var id = el.getAttribute('data-qe-content');
        openContentContextMenu(id, e.clientX, e.clientY);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target && e.target.closest && e.target.closest('[data-qe-content-rename]')) return;
        e.preventDefault();
        var id = el.getAttribute('data-qe-content');
        if (handleLibraryItemSelectClick(id, e)) return;
        selectContent(id);
      });
    });

    qAll('[data-qe-folder-new]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.folderComposerGroup = btn.getAttribute('data-qe-folder-new');
        state.tourComposer = { open: false, folderId: null };
        rerender();
        var input = qOne('[data-qe-folder-name]');
        if (input) {
          setTimeout(function () { input.focus(); }, 0);
        }
      });
    });

    var folderCancel = qOne('[data-qe-folder-cancel]');
    if (folderCancel) {
      folderCancel.addEventListener('click', function () {
        state.folderComposerGroup = null;
        rerender();
      });
    }
    var folderSubmit = qOne('[data-qe-folder-submit]');
    var folderName = qOne('[data-qe-folder-name]');
    if (folderSubmit && folderName) {
      folderSubmit.addEventListener('click', function () {
        createFolder(state.folderComposerGroup, folderName.value);
      });
      folderName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          createFolder(state.folderComposerGroup, folderName.value);
        }
      });
    }

    qAll('[data-qe-hero-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-qe-hero-add');
        var inputKey = kind === 'video' ? 'hero-video' : 'hero';
        var input = qOne('[data-qe-file-input="' + inputKey + '"]');
        if (input) input.click();
      });
    });

    qAll('[data-qe-file-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var groupId = btn.getAttribute('data-qe-file-add');
        var folderAttr = btn.getAttribute('data-qe-folder');
        var heroMedia = btn.getAttribute('data-qe-hero-media');
        state.pendingFileTarget = {
          groupId: groupId,
          folderId: folderAttr || null,
          media: heroMedia || null
        };
        var inputKey = (groupId === 'hero' && heroMedia === 'video') ? 'hero-video' : groupId;
        var input = qOne('[data-qe-file-input="' + inputKey + '"]');
        if (input) input.click();
      });
    });

    qAll('[data-qe-file-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.getAttribute('data-qe-file-input');
        var files = input.files;
        if (!files || !files.length) return;
        if (key === 'hero-image') {
          addFilesToGroup('hero', files, null, 'image');
        } else if (key === 'hero-video') {
          addFilesToGroup('hero', files, null, 'video');
        } else if (key === 'hero') {
          var mediaHint = state.pendingFileTarget && state.pendingFileTarget.media;
          addFilesToGroup('hero', files, null, mediaHint || null);
        } else {
          var target = state.pendingFileTarget || { groupId: key, folderId: null };
          addFilesToGroup(target.groupId || key, files, target.folderId || null);
        }
        state.pendingFileTarget = null;
        input.value = '';
      });
    });

    qAll('[data-qe-tour-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var folderAttr = btn.getAttribute('data-qe-folder');
        state.folderComposerGroup = null;
        state.tourComposer = {
          open: true,
          folderId: folderAttr || null
        };
        state.openGroups.tours360 = true;
        if (folderAttr) state.openFolders[folderAttr] = true;
        rerender();
      });
    });

    var tourCancel = qOne('[data-qe-tour-cancel]');
    if (tourCancel) {
      tourCancel.addEventListener('click', function () {
        state.tourComposer = { open: false, folderId: null };
        rerender();
      });
    }
    var tourSubmit = qOne('[data-qe-tour-submit]');
    var tourText = qOne('[data-qe-tour-text]');
    if (tourSubmit && tourText) {
      tourSubmit.addEventListener('click', function () {
        addTourUrls(tourText.value, state.tourComposer.folderId);
      });
    }
    if (tourText) {
      tourText.addEventListener('paste', function () {
        setTimeout(function () {
          var lines = parseUrlLines(tourText.value);
          if (lines.length > 1) addTourUrls(tourText.value, state.tourComposer.folderId);
        }, 0);
      });
    }

    var dropzone = qOne('[data-qe-tour-dropzone]');
    if (dropzone) {
      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('is-drop');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('is-drop');
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('is-drop');
        var uri = e.dataTransfer && (
          e.dataTransfer.getData('text/uri-list') ||
          e.dataTransfer.getData('text/plain') ||
          ''
        );
        if (uri) addTourUrls(uri, state.tourComposer.folderId || null);
      });
    }

    bindDockBar(editor);

    wireInspectorFields(editor);
    } /* wireEditor */

    if (projectId && !(documentReady && loadedProjectId === projectId)) {
      load(projectId).then(function () {
        if (!rootEl) return;
        var host = rootEl.matches && rootEl.matches('[data-quotation-panel]')
          ? rootEl
          : ((rootEl.closest && rootEl.closest('[data-quotation-panel]')) || rootEl);
        host.innerHTML = render(editorProjectCtx);
        rootEl = host;
        panel = host;
        wireEditor();
      });
      return;
    }
    wireEditor();
  }

  function entryCoverScene() {
    ensureScenes();
    var hero = heroScene();
    if (hero) return hero;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].coverModel) return state.scenes[i];
    }
    return null;
  }

  function resolvePersistableUrl(url, resourceId) {
    var u = String(url || '').trim();
    if (!u || u.indexOf('blob:') === 0) {
      if (resourceId) {
        var res = contentById(resourceId);
        var pub = publicUrlOf(res);
        if (pub) return pub;
      }
      return null;
    }
    return u;
  }

  function serializeSceneCover(sc) {
    if (!sc || !sc.coverModel) return null;
    var cm = typeof ProjectCover !== 'undefined' && ProjectCover.sanitizeModel
      ? ProjectCover.sanitizeModel(sc.coverModel)
      : Object.assign({}, sc.coverModel);
    if (cm) {
      var img = resolvePersistableUrl(cm.imageUrl, sc.resourceId);
      var vid = resolvePersistableUrl(cm.videoUrl, sc.resourceId);
      cm.imageUrl = img;
      cm.videoUrl = vid;
    }
    return cm;
  }

  function serializeLibrary() {
    return {
      version: 1,
      content: state.content.map(function (c) {
        if (!libraryItemIsPersistable(c)) return null;
        var pub = publicUrlOf(c);
        return {
          id: c.id,
          group: c.group || 'renders',
          folderId: c.folderId || null,
          name: c.name || 'Archivo',
          media: c.media || 'image',
          mime: c.mime || null,
          publicUrl: pub,
          remoteUrl: pub,
          previewUrl: pub,
          storagePath: c.storagePath || null,
          archivoId: c.archivoId || null,
          provider: c.provider || null,
          projectId: c.projectId || resolveProjectId() || null,
          uploadStatus: libraryItemUploadStatus(c),
          sizeBytes: itemByteSize(c) || 0
        };
      }).filter(Boolean),
      folders: (state.folders || []).map(function (f) {
        if (!f) return null;
        return {
          id: f.id,
          group: f.group || null,
          name: f.name || 'Carpeta',
          order: folderOrderValue(f)
        };
      }).filter(Boolean)
    };
  }

  function serializeDocument() {
    ensureScenes();
    ensureSceneGroups();
    return {
      version: 1,
      activeSceneId: state.activeSceneId || (state.scenes[0] && state.scenes[0].id) || null,
      sceneGroups: (state.sceneGroups || []).map(function (grp) {
        return {
          id: grp.id,
          name: grp.name || 'Grupo',
          collapsed: grp.collapsed !== false,
          parentGroupId: grp.parentGroupId || null,
          sceneIds: Array.isArray(grp.sceneIds) ? grp.sceneIds.slice() : [],
          childGroupIds: Array.isArray(grp.childGroupIds) ? grp.childGroupIds.slice() : []
        };
      }),
      sceneTrack: Array.isArray(state.sceneTrack) ? state.sceneTrack.slice() : [],
      scenes: state.scenes.map(function (sc) {
        ensureSceneOverlays(sc);
        var res = sc.resourceId ? contentById(sc.resourceId) : null;
        var mediaUrl = resolvePersistableUrl(
          sc.mediaUrl ||
            (sc.coverModel && (sc.coverModel.imageUrl || sc.coverModel.videoUrl)) ||
            null,
          sc.resourceId
        );
        if (!mediaUrl && res) mediaUrl = publicUrlOf(res);
        var cover = serializeSceneCover(sc);
        return {
          id: sc.id,
          name: sc.name || 'Escena',
          type: sc.type || 'scene',
          templateId: sc.templateId || null,
          coverModel: cover,
          resourceId: sc.resourceId || null,
          storagePath: (res && res.storagePath) || sc.storagePath || null,
          archivoId: (res && res.archivoId) || sc.archivoId || null,
          provider: (res && res.provider) || sc.provider || (mediaUrl ? 'bunny' : null),
          publicUrl: mediaUrl,
          mediaUrl: mediaUrl,
          mediaType: sc.mediaType ||
            (cover && cover.videoUrl ? 'video'
              : (cover && cover.imageUrl ? 'image' : null)),
          elements: Array.isArray(sc.elements) ? sc.elements : [],
          interactions: Array.isArray(sc.interactions) ? sc.interactions : [],
          guidesByViewport: serializeSceneGuides(sc),
          guideColorByViewport: serializeGuideColors(sc),
          /* Legacy alias = desktop bucket (older clients / drafts). */
          guides: serializeGuideList(
            (sc.guidesByViewport && sc.guidesByViewport.desktop) || sc.guides || []
          )
        };
      })
    };
  }

  /** Flush overlay + write live ProjectDocument for Preview / Runtime. */
  function prepareLivePreview(ctx) {
    if (isEditorRuntimeDisabled()) {
      /* V7.2.38 — do not feed Runtime/Preview live envelope while Editor is isolated. */
      if (expOverlay && typeof expOverlay.pull === 'function') {
        try { expOverlay.pull(); } catch (ePull) {}
      }
      return serializeDocument();
    }
    ctx = ctx || editorProjectCtx || {};
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }
    var doc = serializeDocument();
    var id = String(
      (ctx && (ctx.id || ctx.projectId)) ||
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
    if (id) {
      try {
        var envelope = {
          v: 1,
          at: Date.now(),
          projectId: id,
          project: {
            id: id,
            nombre: (ctx && (ctx.name || ctx.nombre)) || '',
            slug: (ctx && ctx.slug) || ''
          },
          canvas: doc
        };
        var key = (typeof QuotationRuntime !== 'undefined' && QuotationRuntime.LIVE_KEY_PREFIX
          ? QuotationRuntime.LIVE_KEY_PREFIX
          : 'boxies_qe_live_doc_v1_') + id;
        sessionStorage.setItem(key, JSON.stringify(envelope));
      } catch (eLive) { /* quota */ }
    }
    return doc;
  }

  function hydrateLibrary(hq) {
    var lib = hq && hq.library && typeof hq.library === 'object' ? hq.library : null;
    if (!lib) return;
    if (Array.isArray(lib.folders)) {
      state.folders = lib.folders.map(function (f) {
        return {
          id: f.id,
          group: f.group || null,
          name: f.name || 'Carpeta',
          order: f.order != null && !isNaN(Number(f.order)) ? Number(f.order) : null
        };
      }).filter(function (f) { return f && f.id; });
      ensureFolderOrders();
    }
    if (Array.isArray(lib.content)) {
      state.content = lib.content.map(function (c) {
        if (!libraryItemIsPersistable(c)) return null;
        var pub = c.publicUrl || c.remoteUrl || null;
        if (pub && String(pub).indexOf('blob:') === 0) pub = null;
        if (!pub && c.storagePath) {
          pub = 'https://boxies.b-cdn.net/' + String(c.storagePath).replace(/^\/+/, '');
        }
        var preview = pub || null;
        if (!preview && c.previewUrl && String(c.previewUrl).indexOf('blob:') !== 0) {
          preview = c.previewUrl;
        }
        var row = {
          id: c.id,
          group: c.group || 'renders',
          folderId: c.folderId || null,
          name: c.name || 'Archivo',
          media: c.media || 'image',
          mime: c.mime || null,
          publicUrl: pub,
          remoteUrl: pub,
          previewUrl: preview,
          storagePath: c.storagePath || null,
          archivoId: c.archivoId || null,
          provider: c.provider || null,
          projectId: c.projectId || resolveProjectId() || null,
          uploadStatus: c.uploadStatus || null,
          sizeBytes: (function () {
            var sb = c.sizeBytes != null ? (Number(c.sizeBytes) || 0) : 0;
            if (!sb && c.peso_mb != null) sb = bytesFromPesoMb(c.peso_mb);
            return sb;
          })(),
          file: null
        };
        row.uploadStatus = libraryItemUploadStatus(row);
        row.thumbReady = !!pub;
        return row;
      }).filter(Boolean);
    }
  }

  /**
   * archivos (Bunny) is the durable store for quotation library bytes.
   * hero_quotation.library is the UX index — heal it from orphans under
   * projects/{slug}/media/quotation/ so wiped JSON never hides real files.
   */
  async function reconcileLibraryFromArchivos() {
    var projectId = resolveProjectId();
    if (!projectId || typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.list) {
      return 0;
    }
    var items;
    try {
      items = await BunnyMediaApi.list(projectId);
    } catch (eList) {
      console.warn('[QE-LIB V7.2.74] reconcileLibraryFromArchivos list failed', eList);
      return 0;
    }
    var known = {};
    (state.content || []).forEach(function (c) {
      if (!c) return;
      if (c.archivoId) known['id:' + String(c.archivoId)] = true;
      if (c.storagePath) known['path:' + String(c.storagePath)] = true;
      var u = publicUrlOf(c);
      if (u) known['url:' + String(u)] = true;
    });
    var added = 0;
    (items || []).forEach(function (row) {
      if (!row) return;
      var path = String(row.storage_path || '');
      if (path.indexOf('/media/quotation/') === -1) return;
      if (row.id != null && known['id:' + String(row.id)]) return;
      if (path && known['path:' + path]) return;
      if (row.url && known['url:' + String(row.url)]) return;

      var group = 'renders';
      var media = 'image';
      var tipo = String(row.tipo || '').toLowerCase();
      if (path.indexOf('/videos/') !== -1 || tipo === 'video') {
        group = 'videos';
        media = 'video';
      } else if (path.indexOf('/documents/') !== -1 || tipo === 'pdf' || tipo === 'brochure') {
        group = 'pdf';
        media = 'pdf';
      }
      var url = row.url || ('https://boxies.b-cdn.net/' + path.replace(/^\/+/, ''));
      var name = String(row.nombre || 'Archivo').replace(/^\d+-/, '');
      var item = {
        id: nextId('ct'),
        group: group,
        folderId: null,
        name: name || 'Archivo',
        media: media,
        mime: null,
        publicUrl: url,
        remoteUrl: url,
        previewUrl: url,
        storagePath: path || null,
        archivoId: row.id || null,
        provider: 'bunny',
        projectId: projectId,
        uploadStatus: 'synced',
        sizeBytes: bytesFromPesoMb(row.peso_mb),
        file: null
      };
      state.content.push(item);
      ensureItems(item.id);
      known['id:' + String(item.archivoId || '')] = true;
      known['path:' + path] = true;
      known['url:' + url] = true;
      added += 1;
    });

    if (added > 0) {
      console.log('[QE-LIB V7.2.74] reconcileLibraryFromArchivos restored', added);
      persistDraft();
      try {
        if (typeof ProyectosApi !== 'undefined' && ProyectosApi.updateHeroQuotation) {
          await ProyectosApi.updateHeroQuotation(projectId, {
            library: serializeLibrary()
          });
        }
      } catch (eHeal) {
        console.warn('[QE-LIB V7.2.74] heal library index failed', eHeal);
      }
      if (rootEl) rerender();
    }
    return added;
  }

  function hydrateFromHeroQuotation(hq, ctx) {
    hq = hq || null;
    /* Rebuild library from DB — never keep stale blob session content. */
    state.content = [];
    state.folders = [];
    hydrateLibrary(hq);
    if (hq && hq.canvas && Array.isArray(hq.canvas.scenes)) {
      if (!hq.canvas.scenes.length) {
        state.scenes = [];
        state.activeSceneId = null;
        ensureHeroSceneContract();
        return;
      }
      state.scenes = hq.canvas.scenes.filter(function (sc) {
        return sc && sc.id !== BACKPACK_SCENE_ID;
      }).map(function (sc) {
        var mediaUrl = sc.mediaUrl || sc.publicUrl || null;
        if (mediaUrl && String(mediaUrl).indexOf('blob:') === 0) mediaUrl = null;
        var scene = {
          id: sc.id,
          name: sc.name || 'Escena',
          type: sc.type || 'scene',
          templateId: sc.templateId || null,
          coverModel: sc.coverModel || null,
          resourceId: sc.resourceId || null,
          storagePath: sc.storagePath || null,
          archivoId: sc.archivoId || null,
          provider: sc.provider || null,
          mediaUrl: mediaUrl,
          mediaType: sc.mediaType || null,
          elements: Array.isArray(sc.elements) ? sc.elements : [],
          interactions: Array.isArray(sc.interactions) ? sc.interactions : [],
          buttons: Array.isArray(sc.buttons) ? sc.buttons : [],
          hotspots: Array.isArray(sc.hotspots) ? sc.hotspots : [],
          guides: Array.isArray(sc.guides) ? sc.guides : [],
          guidesByViewport: sc.guidesByViewport || null,
          guideColorByViewport: sc.guideColorByViewport || null
        };
        ensureSceneOverlays(scene);
        /* Resolve media from persisted library if scene URL missing. */
        if (!scene.mediaUrl && scene.resourceId) {
          var linked = contentById(scene.resourceId);
          var pub = publicUrlOf(linked);
          if (pub) {
            scene.mediaUrl = pub;
            scene.storagePath = (linked && linked.storagePath) || scene.storagePath;
          }
        }
        return scene;
      });
      state.activeSceneId = hq.canvas.activeSceneId || state.scenes[0].id;
      if (!sceneById(state.activeSceneId)) {
        state.activeSceneId = state.scenes[0].id;
      }
      state.sceneGroups = Array.isArray(hq.canvas.sceneGroups)
        ? hq.canvas.sceneGroups.map(function (g) {
          if (!g) return null;
          return {
            id: g.id,
            name: g.name || 'Grupo',
            collapsed: g.collapsed !== false,
            parentGroupId: g.parentGroupId || null,
            sceneIds: Array.isArray(g.sceneIds) ? g.sceneIds.slice() : [],
            childGroupIds: Array.isArray(g.childGroupIds) ? g.childGroupIds.slice() : []
          };
        }).filter(Boolean)
        : [];
      state.sceneTrack = Array.isArray(hq.canvas.sceneTrack) ? hq.canvas.sceneTrack.slice() : [];
      ensureSceneGroups();
      var bpSrc = (hq && hq.editorBackpack) ||
        (hq && hq.canvas && hq.canvas.editorBackpack) ||
        null;
      state.backpackInteractions = (bpSrc && Array.isArray(bpSrc.interactions))
        ? bpSrc.interactions.slice()
        : [];
      state._backpackSceneRef = null;
      state.backpackMode = false;
      state.backpackReturnSceneId = null;
      if (healLibraryIdentity()) markDirtyLocal();
      ensureHeroSceneContract();
      return;
    }

    /* Legacy projects: seed one empty HERO scene — media must be assigned explicitly. */
    var scene = {
      id: nextId('sc'),
      name: 'HERO',
      type: 'hero',
      templateId: 'hero-default',
      resourceId: null,
      coverModel: null,
      elements: [],
      interactions: [],
      buttons: [],
      hotspots: [],
      guides: []
    };
    /* If legacy hero_quotation has media URLs, keep coverModel for Runtime but do not invent library links. */
    var model = typeof ProjectCover !== 'undefined' && ProjectCover.fromQuotationHero
      ? ProjectCover.fromQuotationHero(hq, {
        nombre: (ctx && (ctx.name || ctx.nombre)) || ''
      })
      : null;
    if (model && (model.videoUrl || model.imageUrl)) {
      scene.coverModel = model;
      scene.elements = ProjectCover.elementDescriptors
        ? ProjectCover.elementDescriptors(function () { return nextId('el'); })
        : [];
      /* Synthetic resource so the scene is not empty in the editor. */
      var synId = nextId('ct');
      var synUrl = model.videoUrl || model.imageUrl;
      state.content.push({
        id: synId,
        group: model.videoUrl ? 'videos' : 'renders',
        folderId: null,
        name: model.videoUrl ? 'Video del hero' : 'Imagen del hero',
        media: model.videoUrl ? 'video' : 'image',
        mime: null,
        previewUrl: synUrl,
        remoteUrl: synUrl,
        publicUrl: synUrl,
        storagePath: null,
        projectId: resolveProjectId() || null,
        uploadStatus: 'synced',
        file: null
      });
      scene.resourceId = synId;
      scene.mediaUrl = synUrl;
      scene.mediaType = model.videoUrl ? 'video' : 'image';
    }
    state.scenes = [scene];
    state.activeSceneId = scene.id;
    healLibraryIdentity();
  }

  function load(projectId) {
    var id = String(projectId || '').trim();
    if (!id) {
      loadPromise = Promise.resolve(null);
      return loadPromise;
    }

    /* Same project already hydrated — remounts reuse the live document. */
    if (documentReady && loadedProjectId === id) {
      return loadPromise || Promise.resolve(null);
    }

    /* Same project still fetching — share the in-flight promise. */
    if (loadPromise && loadedProjectId === id && !documentReady) {
      return loadPromise;
    }

    /* Switching projects: flush previous draft, drop in-memory canvas. */
    if (loadedProjectId && loadedProjectId !== id) {
      try { persistDraft(); } catch (eFlush) { /* ignore */ }
      resetEditorSession('switch:' + loadedProjectId + '→' + id);
    } else if (!loadedProjectId) {
      resetEditorSession('open:' + id);
    }

    var epoch = sessionEpoch;
    loadedProjectId = id;
    bunnyStructureReady = false;
    if (!editorProjectCtx || typeof editorProjectCtx !== 'object') {
      editorProjectCtx = { id: id, slug: '', name: '' };
    } else {
      editorProjectCtx.id = id;
    }

    if (typeof ProyectosApi === 'undefined' || !ProyectosApi.fetchHeroQuotation) {
      var offlineDraft = readDraftRaw(id);
      if (offlineDraft && applyDraftToState(offlineDraft)) {
        documentReady = true;
      } else {
        hydrateFromHeroQuotation(null, editorProjectCtx);
        documentReady = true;
      }
      restoreLibraryUi(id, offlineDraft && offlineDraft.editorLibraryUi);
      persistLibraryUi();
      persistDraft();
      loadPromise = Promise.resolve(null);
      return loadPromise;
    }

    loadPromise = ProyectosApi.fetchHeroQuotation(id)
      .then(function (hq) {
        if (epoch !== sessionEpoch || String(loadedProjectId || '') !== id) {
          console.warn('[QuotationEditor] ignore stale load result', id);
          return null;
        }
        console.log('[QE-LIB V7.2.37] 8-load:fetchHeroQuotation.library BEFORE hydrate');
        console.log(JSON.stringify(hq && hq.library, null, 2));
        qeLibAudit('8-load:before-hydrate');
        /*
         * DB is SSOT after a successful save. If a newer local draft has more
         * editor work (scenes/folders/library) than the server snapshot, restore
         * it so a deploy/hard-refresh does not wipe unsaved progress.
         */
        hydrateFromHeroQuotation(hq, editorProjectCtx);
        var draft = readDraftRaw(id);
        if (draft && shouldPreferDraftOverServer(hq, draft)) {
          console.log('[QuotationEditor] restoring newer local draft over server snapshot');
          applyDraftToState(draft);
        }
        qeLibAudit('9-load:after-hydrateFromHeroQuotation');
        console.log('[QE-LIB V7.2.37] 9-load:state.content.length after hydrate',
          state.content ? state.content.length : 0);
        if (epoch !== sessionEpoch || String(loadedProjectId || '') !== id) return null;
        documentReady = true;
        loadedProjectId = id;
        restoreLibraryUi(id, draft && draft.editorLibraryUi);
        persistLibraryUi();
        persistDraft();
        return reconcileLibraryFromArchivos()
          .then(function () {
            return syncLibrarySizesFromArchivos();
          })
          .catch(function () { /* ignore */ })
          .then(function () { return hq; });
      })
      .catch(function () {
        if (epoch !== sessionEpoch || String(loadedProjectId || '') !== id) return null;
        console.log('[QE-LIB V7.2.37] 8-load:fetch FAILED → draft/empty');
        var failDraft = readDraftRaw(id);
        if (!(failDraft && applyDraftToState(failDraft))) {
          hydrateFromHeroQuotation(null, editorProjectCtx);
        }
        qeLibAudit('9-load:after-catch-hydrate');
        if (epoch !== sessionEpoch || String(loadedProjectId || '') !== id) return null;
        documentReady = true;
        loadedProjectId = id;
        restoreLibraryUi(id, failDraft && failDraft.editorLibraryUi);
        persistLibraryUi();
        persistDraft();
        return reconcileLibraryFromArchivos()
          .then(function () {
            return syncLibrarySizesFromArchivos();
          })
          .catch(function () { /* ignore */ })
          .then(function () { return null; });
      });
    return loadPromise;
  }

  /**
   * Persist canvas ProjectDocument + library as SSOT.
   * Always writes canvas — never no-ops when scenes exist without a Hero cover.
   */
  async function commit(adapter) {
    var projectId =
      (adapter && adapter.getProjectId && adapter.getProjectId()) ||
      (editorProjectCtx && editorProjectCtx.id) ||
      loadedProjectId;
    if (!projectId) return null;
    projectId = String(projectId).trim();
    var epoch = sessionEpoch;

    if (loadedProjectId && String(loadedProjectId) !== projectId) {
      console.warn('[QuotationEditor] abort commit: target', projectId,
        '!= loaded', loadedProjectId);
      return null;
    }

    if (typeof ProyectosApi === 'undefined' || !ProyectosApi.updateHeroQuotation) {
      throw new Error('API de cotización no disponible.');
    }

    /* Flush Showroom overlay → scene.interactions before serialize. */
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }

    /* Ensure every library File is in Storage before serializing. */
    await ensureLibraryUploaded();
    if (epoch !== sessionEpoch || (loadedProjectId && String(loadedProjectId) !== projectId)) {
      console.warn('[QuotationEditor] abort commit after upload (project switched)');
      return null;
    }
    qeLibAudit('3-commit:after-ensureLibraryUploaded');

    var doc = serializeDocument();
    var library = serializeLibrary();
    console.log('[QE-LIB V7.2.37] 4-BEFORE-SAVE heroQuotation.library EXACT JSON');
    console.log(JSON.stringify(library, null, 2));
    qeLibAudit('4-commit:after-serializeLibrary');
    prepareLivePreview(editorProjectCtx || { id: projectId });

    var entry = entryCoverScene();
    var cover = entry && entry.coverModel
      ? entry.coverModel
      : (typeof ProjectCover !== 'undefined' && ProjectCover.blankModel
        ? ProjectCover.blankModel()
        : {
          nombre: '',
          eslogan: '',
          botonIzquierdo: 'Explorar',
          botonDerecho: 'Iniciar',
          videoUrl: null,
          imageUrl: null
        });

    /* Cover URLs must also be public — never blob. */
    if (cover) {
      if (cover.imageUrl && String(cover.imageUrl).indexOf('blob:') === 0) {
        cover.imageUrl = resolvePersistableUrl(cover.imageUrl, entry && entry.resourceId);
      }
      if (cover.videoUrl && String(cover.videoUrl).indexOf('blob:') === 0) {
        cover.videoUrl = resolvePersistableUrl(cover.videoUrl, entry && entry.resourceId);
      }
    }

    var payload = typeof ProjectCover !== 'undefined' && ProjectCover.toHeroQuotationPayload
      ? ProjectCover.toHeroQuotationPayload(cover, doc)
      : {
        heroContent: {
          nombre: cover.nombre || '',
          eslogan: cover.eslogan || '',
          botonIzquierdo: cover.botonIzquierdo || 'Explorar',
          botonDerecho: cover.botonDerecho || 'Iniciar',
          showShare: cover.showShare !== false,
          showFullscreen: cover.showFullscreen !== false
        },
        video_url: cover.videoUrl || null,
        image_url: cover.imageUrl || null,
        canvas: doc
      };
    if (cover && cover.logoUrl) {
      payload.branding = {
        showHeroLogo: !!cover.showLogo,
        logoStyle: cover.logoStyle || 'flat',
        logo: { name: 'Logo', uploadedUrl: cover.logoUrl, size: 0 }
      };
    }
    payload.library = library;
    payload.editorBackpack = {
      interactions: ensureBackpackInteractions()
    };
    /* Intentional clear-all only when in-memory library is also empty. */
    if ((!library.content || !library.content.length) &&
        (!state.content || !state.content.length)) {
      payload.libraryExplicitEmpty = true;
    }

    console.log('[QE-LIB V7.2.74] 5-commit:payload.library before updateHeroQuotation');
    console.log(JSON.stringify(payload.library, null, 2));

    if (epoch !== sessionEpoch || (loadedProjectId && String(loadedProjectId) !== projectId)) {
      console.warn('[QuotationEditor] abort commit before write (project switched)');
      return null;
    }

    var saved = await ProyectosApi.updateHeroQuotation(projectId, payload);
    if (epoch !== sessionEpoch || (loadedProjectId && String(loadedProjectId) !== projectId)) {
      console.warn('[QuotationEditor] discard commit result after switch', projectId);
      return null;
    }
    console.log('[QE-LIB V7.2.37] 6-commit:updateHeroQuotation returned library');
    console.log(JSON.stringify(saved && saved.library, null, 2));

    /* Immediate raw+sanitized readback from Supabase. */
    try {
      var stored = await ProyectosApi.fetchHeroQuotation(projectId);
      console.log('[QE-LIB V7.2.37] 7-AFTER-SAVE re-read fetchHeroQuotation.library EXACT JSON');
      console.log(JSON.stringify(stored && stored.library, null, 2));
      qeLibAudit('7-commit:after-readback-state.content');
    } catch (eReadLib) {
      console.error('[QE-LIB V7.2.37] 7-AFTER-SAVE readback FAILED', eReadLib);
    }

    loadedProjectId = String(projectId);
    documentReady = true;
    persistDraft();
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
      BuilderDirtyState.clear();
    }

    if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onSavePayload) {
      QuotationPersistAudit.onSavePayload(
        projectId,
        editorProjectCtx && editorProjectCtx.slug,
        payload,
        doc
      );
    }
    if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onSaveReadBack &&
        typeof ProyectosApi.fetchHeroQuotation === 'function') {
      try {
        var storedAudit = await ProyectosApi.fetchHeroQuotation(projectId);
        QuotationPersistAudit.onSaveReadBack(
          projectId,
          editorProjectCtx && editorProjectCtx.slug,
          doc,
          storedAudit
        );
      } catch (eRead) {
        console.warn('[QE-AUDIT] D.readback failed', eRead);
      }
    }

    return saved;
  }

  function syncCoverFromHeroPayload(hq) {
    if (!hq) return;
    var entry = entryCoverScene();
    if (!entry) return;
    if (typeof ProjectCover === 'undefined' || !ProjectCover.fromQuotationHero) return;
    entry.coverModel = ProjectCover.fromQuotationHero(hq, {
      nombre: (editorProjectCtx && (editorProjectCtx.name || editorProjectCtx.nombre)) || ''
    });
  }

  function isDocumentReady(projectId) {
    var id = String(projectId || (editorProjectCtx && editorProjectCtx.id) || '').trim();
    return !!(documentReady && id && String(loadedProjectId || '') === id);
  }

  function ensureLoaded(ctx) {
    if (ctx && typeof ctx === 'object') {
      editorProjectCtx = {
        id: String(ctx.id || ctx.projectId || (editorProjectCtx && editorProjectCtx.id) || '').trim(),
        slug: String(ctx.slug || ctx.project || (editorProjectCtx && editorProjectCtx.slug) || '').trim(),
        name: String(ctx.name || ctx.nombre || (editorProjectCtx && editorProjectCtx.name) || '').trim()
      };
    }
    var id = String((editorProjectCtx && editorProjectCtx.id) || '').trim();
    if (!id) return Promise.resolve(null);
    return load(id);
  }

  initSceneGroupFloatUi();

  return {
    render: render,
    bind: bind,
    load: load,
    ensureLoaded: ensureLoaded,
    isDocumentReady: isDocumentReady,
    commit: commit,
    detachUi: detachUi,
    applyProjectIdentity: applyProjectIdentity,
    serializeDocument: serializeDocument,
    prepareLivePreview: prepareLivePreview,
    syncCoverFromHeroPayload: syncCoverFromHeroPayload,
    setCanvasPreviewMode: setCanvasPreviewMode,
    toggleCanvasPreviewMode: toggleCanvasPreviewMode,
    isCanvasPreviewMode: isCanvasPreviewMode,
    applyScenesCollapsed: applyScenesCollapsed,
    suspendStageFit: suspendStageFit,
    resumeStageFit: resumeStageFit,
    isScenesCollapsed: function () { return !!state.scenesCollapsed; },
    setScenesLocked: setScenesLocked,
    isScenesLocked: function () { return !!state.scenesLocked; },
    getSceneGroupFloatDebug: function () {
      return {
        uiBound: sceneGroupFloatUiBound,
        openGroupId: openSceneGroupFloatId,
        hostId: SCENE_GROUP_FLOAT_HOST_ID,
        hostInDom: !!document.getElementById(SCENE_GROUP_FLOAT_HOST_ID)
      };
    },
    /** Console diagnostics for panel Elementos → Crear grupo. */
    getOutlinerDebug: function () {
      var body = document.getElementById('quotationRightBody');
      var btn = body && body.querySelector('[data-qe-outliner-create-group]');
      var sc = activeScene();
      var ixs = (sc && Array.isArray(sc.interactions)) ? sc.interactions : [];
      var groups = ixs.filter(isOverlayGroupIx);
      var free = ixs.filter(function (ix) {
        return ix && !isOverlayGroupIx(ix) && !ix.groupId;
      });
      return {
        bodyInDom: !!body,
        buttonInDom: !!btn,
        layersBound: !!(body && body.dataset.qeLayersBound === '1'),
        activeSceneId: sc && sc.id,
        overlayGroupCount: groups.length,
        freeItemCount: free.length,
        groupLabels: groups.map(function (g) { return g.label || g.id; }),
        expOverlayMounted: !!expOverlay,
        editorScriptHint: (function () {
          var el = document.querySelector('script[src*="quotation-editor.js"]');
          return el ? el.getAttribute('src') : null;
        })(),
        editorBuild: 'ws7765'
      };
    },
    /** Same as clicking "+ Crear grupo" — used by button and debug. */
    createOverlayGroupFromPanel: createOverlayGroupFromPanel,
    /** Bypass button — test createEmptyOverlayGroup from console. */
    debugCreateOverlayGroup: function () {
      var before = this.getOutlinerDebug();
      var id = createOverlayGroupFromPanel();
      var after = this.getOutlinerDebug();
      return { createdId: id, before: before, after: after };
    },
    _getState: function () { return state; },
    _resetDemo: function () {
      resetEditorSession('demo');
      loadedProjectId = null;
      editorProjectCtx = { id: '', slug: '', name: '' };
      clearDraft();
    }
  };
})();
