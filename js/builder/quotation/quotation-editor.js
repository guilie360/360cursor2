/**
 * Quotation Editor — V7.2.44 Builder UX (templates, elements, menu host).
 */
var QuotationEditor = (function () {
  /* V7.2.38 — controlled test: isolate Editor from Runtime completely. */
  var DISABLE_RUNTIME_FOR_EDITOR = true;

  var CANVAS_DESIGN_W = 1920;
  var CANVAS_DESIGN_H = 1080;

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

  var uid = 1;
  function nextId(prefix) {
    uid += 1;
    return prefix + '-' + uid;
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
    return String(
      loadedProjectId ||
      (editorProjectCtx && editorProjectCtx.id) ||
      ''
    ).trim();
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
    if (item.group === 'hero' && item.media === 'video') return 'videos';
    return 'images';
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
      ['images', 'videos', 'documents', 'ui']
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
   * Library persistence gate — publicUrl is optional.
   * previewUrl / blob-only local files are NOT persistable.
   */
  function libraryItemIsPersistable(item) {
    if (!item || !item.id) return false;
    if (item.archivoId) return true;
    if (item.storagePath) return true;
    if (item.provider) return true;
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
    item.file = null;
    item.uploadStatus = 'synced';
    item.projectId = resolveProjectId() || item.projectId || null;
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
    var result = await BunnyMediaApi.uploadAndSync(
      null,
      projectId,
      bunnyCategoryForItem(item),
      item.file,
      {
        nodeId: QE_BUNNY_NODE_ID,
        nodeSlug: QE_BUNNY_NODE_SLUG,
        showroomSlug: slug,
        scope: 'media'
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
      name: 'Hero',
      type: 'hero',
      templateId: null,
      resourceId: null,
      coverModel: null,
      elements: [],
      interactions: [],
      buttons: [],
      hotspots: []
    };
    return {
      content: [],
      folders: [],
      scenes: [heroScene],
      activeSceneId: heroScene.id,
      selectedContentId: null,
      selectedItem: null,
      selectedElementId: null,
      focusMode: false,
      libraryCollapsed: false,
      inspectorCollapsed: false,
      sceneMenuOpen: false,
      dockOpen: false,
      resourcePickerOpen: false,
      expEditMode: 'buttons',
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
  var DRAFT_PREFIX = 'boxies_qe_draft_v1_';
  var TEMPLATE_PREFIX = 'boxies_qe_scene_templates_v1_';

  function draftStorageKey(projectId) {
    return DRAFT_PREFIX + String(projectId || '').trim();
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
    state.activeSceneId = scene.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    markDirtyLocal();
    rerender();
  }

  function toggleAllLibraryGroups() {
    var collapse = !state.libraryGroupsCollapsed;
    state.libraryGroupsCollapsed = collapse;
    CONTENT_GROUPS.forEach(function (g) {
      if (!g) return;
      state.openGroups[g.id] = !collapse;
    });
    rerender();
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
      var payload = {
        v: 1,
        at: Date.now(),
        projectId: id,
        content: state.content,
        folders: state.folders,
        scenes: state.scenes,
        activeSceneId: state.activeSceneId,
        selectedContentId: state.selectedContentId,
        expEditMode: state.expEditMode
      };
      sessionStorage.setItem(draftStorageKey(id), JSON.stringify(payload));
      /* Keep live Preview envelope in sync with Editor SSOT. */
      try {
        prepareLivePreview({
          id: id,
          name: (editorProjectCtx && (editorProjectCtx.name || editorProjectCtx.nombre)) || '',
          slug: (editorProjectCtx && editorProjectCtx.slug) || ''
        });
      } catch (eLiveSync) {}
    } catch (eDraft) { /* quota / private mode */ }
  }

  function restoreDraft(projectId) {
    var id = String(projectId || '').trim();
    if (!id) return false;
    try {
      var raw = sessionStorage.getItem(draftStorageKey(id));
      if (!raw) return false;
      var draft = JSON.parse(raw);
      if (!draft || !Array.isArray(draft.scenes)) return false;
      /* Keep persistable library entries; drop blob-only local (not persistable). */
      state.content = (Array.isArray(draft.content) ? draft.content : []).map(function (c) {
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
      state.activeSceneId = draft.activeSceneId ||
        (state.scenes[0] && state.scenes[0].id) ||
        null;
      if (state.activeSceneId && !sceneById(state.activeSceneId)) {
        state.activeSceneId = (state.scenes[0] && state.scenes[0].id) || null;
      }
      if (draft.selectedContentId) state.selectedContentId = draft.selectedContentId;
      if (draft.expEditMode) state.expEditMode = draft.expEditMode;
      return true;
    } catch (eRest) {
      return false;
    }
  }

  function clearDraft(projectId) {
    var id = String(projectId || loadedProjectId || '').trim();
    if (!id) return;
    try { sessionStorage.removeItem(draftStorageKey(id)); } catch (eClr) {}
  }

  function sceneById(id) {
    if (!id || !state.scenes) return null;
    for (var i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i].id === id) return state.scenes[i];
    }
    return null;
  }

  function activeScene() {
    ensureScenes();
    return sceneById(state.activeSceneId) || state.scenes[0] || null;
  }

  function ensureScenes() {
    if (!Array.isArray(state.scenes)) state.scenes = [];
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });
    if (!state.scenes.length) {
      state.activeSceneId = null;
      return;
    }
    if (!sceneById(state.activeSceneId)) {
      state.activeSceneId = state.scenes[0].id;
    }
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

  function foldersInGroup(groupId) {
    return state.folders.filter(function (f) { return f.group === groupId; });
  }

  function rootContentInGroup(groupId) {
    return state.content.filter(function (c) {
      return c.group === groupId && !c.folderId;
    });
  }

  function contentInFolder(folderId) {
    return state.content.filter(function (c) { return c.folderId === folderId; });
  }

  function ensureItems(contentId) {
    if (!state.items[contentId]) {
      state.items[contentId] = { buttons: [], hotspots: [] };
    }
    return state.items[contentId];
  }

  /** Scene overlays — Showroom interactions[] SSOT (V7.2.13). */
  function ensureSceneOverlays(scene) {
    if (!scene) return { interactions: [], buttons: [], hotspots: [] };
    if (typeof QuotationExperienciaBridge !== 'undefined' &&
        QuotationExperienciaBridge.ensureSceneInteractions) {
      QuotationExperienciaBridge.ensureSceneInteractions(scene);
    } else {
      if (!Array.isArray(scene.interactions)) scene.interactions = [];
      if (!Array.isArray(scene.buttons)) scene.buttons = [];
      if (!Array.isArray(scene.hotspots)) scene.hotspots = [];
    }
    return scene;
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

  function contentItemRowHtml(item, nested) {
    var on = item.id === state.selectedContentId;
    var sub = item.group === 'tours360'
      ? 'Enlace'
      : (item.media === 'video' ? 'Video' : 'Imagen');
    var canAssign = item.media === 'image' || item.media === 'video' ||
      item.group === 'renders' || item.group === 'videos' || item.group === 'hero';
    var thumbUrl = displayUrlOf(item) || item.previewUrl || '';
    return '' +
      '<div class="qe-lib__item' + (nested ? ' qe-lib__item--nested' : '') +
        (on ? ' is-selected' : '') + '"' +
        ' role="button" tabindex="0"' +
        ' data-qe-content="' + escapeHtml(item.id) + '"' +
        ' draggable="true"' +
        ' data-qe-drag-lib="' + escapeHtml(item.id) + '"' +
        ' data-qe-lib-group="' + escapeHtml(item.group || '') + '"' +
        (canAssign ? ' data-qe-drag-resource="' + escapeHtml(item.id) + '"' : '') + '>' +
        '<span class="qe-lib__thumb-wrap">' +
          '<span class="' + thumbClass(item) + '" aria-hidden="true"' +
            (thumbUrl
              ? ' style="background-image:url(\'' + escapeHtml(thumbUrl) + '\');background-size:cover;background-position:center"'
              : '') +
          '></span>' +
          '<button type="button" class="qe-lib__remove" data-qe-remove-resource="' +
            escapeHtml(item.id) + '" aria-label="Eliminar recurso" title="Eliminar">×</button>' +
        '</span>' +
        '<span class="qe-lib__meta">' +
          '<span class="qe-lib__name">' + escapeHtml(item.name || 'Sin nombre') + '</span>' +
          '<span class="qe-lib__type">' + escapeHtml(sub) + '</span>' +
        '</span>' +
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
    var kids = contentInFolder(folder.id);
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
    return '' +
      '<div class="qe-folder' + (open ? ' is-open' : '') + '" data-qe-folder-block="' +
        escapeHtml(folder.id) + '"' +
        ' data-qe-lib-drop-folder="' + escapeHtml(folder.id) + '"' +
        ' data-qe-lib-drop-group="' + escapeHtml(group.id) + '">' +
        '<button type="button" class="qe-folder__toggle" data-qe-folder-toggle="' +
          escapeHtml(folder.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
          '<span class="qe-folder__chevron" aria-hidden="true"></span>' +
          '<span class="qe-folder__icon" aria-hidden="true"></span>' +
          '<span class="qe-folder__name">' + escapeHtml(folder.name) + '</span>' +
          '<span class="qe-content__count">' + kids.length + '</span>' +
        '</button>' +
        (open
          ? ('<div class="qe-folder__body">' +
              (kids.length
                ? ('<div class="qe-content__items">' +
                    kids.map(function (item) { return contentItemRowHtml(item, true); }).join('') +
                  '</div>')
                : '') +
              '<div class="qe-content__actions">' + addControls + '</div>' +
            '</div>')
          : '') +
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

    var rootItems = rootContentInGroup(group.id);
    var folders = foldersInGroup(group.id);
    var rootHtml = rootItems.length
      ? ('<div class="qe-content__items">' +
          rootItems.map(function (item) { return contentItemRowHtml(item, false); }).join('') +
        '</div>')
      : '';
    var foldersHtml = folders.map(function (f) { return folderBlockHtml(f, group); }).join('');
    var tree = rootHtml + foldersHtml;
    var actions;

    if (group.linkMode) {
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-folder-new="' +
          escapeHtml(group.id) + '">+ Nueva carpeta</button>' +
        folderComposerHtml(group.id) +
        '<button type="button" class="qe-content__add" data-qe-tour-add data-qe-folder="">+ Agregar enlace</button>' +
        tourComposerHtml(null);
    } else {
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-folder-new="' +
          escapeHtml(group.id) + '">+ Nueva carpeta</button>' +
        folderComposerHtml(group.id) +
        '<button type="button" class="qe-content__add" data-qe-file-add="' +
          escapeHtml(group.id) + '" data-qe-folder="">' +
          escapeHtml(group.addLabel || '+ Agregar') + '</button>' +
        '<input type="file" accept="' + escapeHtml(group.accept || 'image/*') + '" hidden' +
          ' data-qe-file-input="' + escapeHtml(group.id) + '" multiple>';
    }

    return '' +
      '<div class="qe-content__body"' +
        ' data-qe-lib-drop-root' +
        ' data-qe-lib-drop-group="' + escapeHtml(group.id) + '">' +
        tree +
        '<div class="qe-content__actions">' + actions + '</div>' +
      '</div>';
  }

  function contentColumnHtml() {
    if (state.focusMode) return '';
    var external = !!document.getElementById('quotationLeftBody');
    if (!external && state.libraryCollapsed) return '';

    var groups = CONTENT_GROUPS.map(function (group) {
      var open = state.openGroups[group.id] !== false;
      var count = contentInGroup(group.id).length;
      return '' +
        '<section class="qe-content__group' + (open ? ' is-open' : '') + '"' +
          ' data-qe-group="' + escapeHtml(group.id) + '"' +
          (group.linkMode ? ' data-qe-tour-dropzone' : '') + '>' +
          '<button type="button" class="qe-content__toggle" data-qe-toggle="' +
            escapeHtml(group.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<span class="qe-content__chevron" aria-hidden="true"></span>' +
            '<span class="qe-content__group-label">' + escapeHtml(group.label) + '</span>' +
            '<span class="qe-content__count">' + (group.prepared ? '—' : count) + '</span>' +
          '</button>' +
          (open ? groupBodyHtml(group) : '') +
        '</section>';
    }).join('');

    return '' +
      '<aside class="qe-col qe-col--library" aria-label="Recursos">' +
        '<div class="qe-col__head">' +
          '<div class="qe-col__head-text">' +
            '<h2 class="qe-col__title">Recursos</h2>' +
            '<p class="qe-col__hint">Biblioteca del proyecto</p>' +
          '</div>' +
          '<button type="button" class="qe-content__collapse-all" data-qe-toggle-all-groups' +
            ' title="' + (state.libraryGroupsCollapsed ? 'Desplegar categorías' : 'Plegar categorías') + '">' +
            (state.libraryGroupsCollapsed ? 'Desplegar' : 'Plegar') +
          '</button>' +
        '</div>' +
        '<div class="qe-content__list" data-qe-content-list>' + groups + '</div>' +
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
    if (isVideo) {
      return '' +
        '<div class="qe-scene-media" data-qe-drop-scene>' +
          '<video class="qe-scene-media__video" src="' + escapeHtml(url) + '"' +
            ' muted loop playsinline autoplay></video>' +
        '</div>';
    }
    return '' +
      '<div class="qe-scene-media" data-qe-drop-scene>' +
        '<img class="qe-scene-media__img" src="' + escapeHtml(url) + '" alt="">' +
      '</div>';
  }

  function libraryMediaItems() {
    return state.content.filter(function (c) {
      if (!c) return false;
      if (c.group === 'renders' || c.group === 'videos' || c.group === 'hero') return true;
      return c.media === 'image' || c.media === 'video';
    });
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

  /** Hero: Runtime iframe inside fixed 1920×1080 design frame (scale outside). */
  function heroRuntimeStageHtml() {
    if (isEditorRuntimeDisabled()) {
      return emptyScenePlaceholderHtml();
    }
    var projectId = String((editorProjectCtx && editorProjectCtx.id) || '').trim();
    var src = '';
    var opts = {
      preview: true,
      editor: true,
      canvas: true,
      designWidth: CANVAS_DESIGN_W,
      designHeight: CANVAS_DESIGN_H
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
        url.searchParams.set('canvas', '1');
        url.searchParams.set('designWidth', String(CANVAS_DESIGN_W));
        url.searchParams.set('designHeight', String(CANVAS_DESIGN_H));
        src = url.href;
      } catch (e) {
        src = '/quotation/?experience_type=quotation&preview=1&editor=1&canvas=1' +
          '&designWidth=' + CANVAS_DESIGN_W + '&designHeight=' + CANVAS_DESIGN_H +
          (projectId ? '&projectId=' + encodeURIComponent(projectId) : '');
      }
    }
    return '' +
      '<div class="qe-canvas__runtime-host" data-qe-runtime-host>' +
        '<iframe class="qe-canvas__runtime-iframe" data-qe-runtime-iframe' +
          ' title="Hero Runtime Canvas"' +
          ' width="' + CANVAS_DESIGN_W + '" height="' + CANVAS_DESIGN_H + '"' +
          ' src="' + String(src).replace(/"/g, '&quot;') + '"' +
          ' allow="fullscreen"></iframe>' +
      '</div>';
  }

  function editLayerHtml() {
    return '<div class="qe-canvas__edit-layer" data-qe-edit-layer tabindex="0" aria-label="Capa de interacción"></div>';
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

  function scenesBarHtml() {
    ensureScenes();
    var thumbs = state.scenes.map(function (sc) {
      var on = sc.id === state.activeSceneId;
      var label = String(sc.name || 'Escena').toLowerCase();
      var thumbUrl = sceneDisplayUrl(sc) || null;
      var bg = thumbUrl
        ? ' style="background-image:url(\'' + escapeHtml(thumbUrl) + '\');background-size:cover;background-position:center"'
        : '';
      return '' +
        '<div class="qe-scenes__thumb-wrap" data-qe-drop-scene data-qe-drop-scene-id="' +
          escapeHtml(sc.id) + '">' +
          '<button type="button" class="qe-scenes__thumb' + (on ? ' is-active' : '') + '"' +
            ' data-qe-scene="' + escapeHtml(sc.id) + '"' +
            ' title="' + escapeHtml(sc.name || 'Escena') + '">' +
            '<span class="qe-scenes__thumb-frame" aria-hidden="true"' + bg + '></span>' +
            '<span class="qe-scenes__thumb-name">' + escapeHtml(label) + '</span>' +
          '</button>' +
          '<button type="button" class="qe-scenes__thumb-del"' +
            ' data-qe-scene-delete="' + escapeHtml(sc.id) + '"' +
            ' aria-label="Eliminar escena" title="Eliminar escena">×</button>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="qe-scenes" data-qe-scenes>' +
        '<button type="button" class="qe-scenes__nav" data-qe-scenes-prev aria-label="Escenas anteriores">←</button>' +
        '<div class="qe-scenes__track-wrap">' +
          '<div class="qe-scenes__track" data-qe-scenes-track>' + thumbs + '</div>' +
        '</div>' +
        '<button type="button" class="qe-scenes__nav" data-qe-scenes-next aria-label="Escenas siguientes">→</button>' +
      '</div>';
  }

  function stageDockHtml() {
    var sceneMenu = state.dockOpen === 'scene' ? sceneCreateMenuHtml() : '';
    var elementMenu = '';
    if (state.dockOpen === 'element') {
      elementMenu =
        '<div class="qe-dock__menu" data-qe-dock-menu role="menu">' +
          '<button type="button" class="qe-dock__menu-item" data-qe-add-button role="menuitem">Botón</button>' +
          '<button type="button" class="qe-dock__menu-item" data-qe-add-hotspot role="menuitem">Hotspot</button>' +
          '<button type="button" class="qe-dock__menu-item" data-qe-add-text role="menuitem">Texto</button>' +
          '<button type="button" class="qe-dock__menu-item" data-qe-add-shape="SHAPE_RECT" role="menuitem">Forma → Rectángulo</button>' +
          '<button type="button" class="qe-dock__menu-item" data-qe-add-shape="SHAPE_CIRCLE" role="menuitem">Forma → Círculo</button>' +
        '</div>';
    }
    var stylesMenu = state.dockOpen === 'styles'
      ? (
        '<div class="qe-dock__menu" data-qe-dock-menu role="menu">' +
          '<p class="qe-dock__menu-hint">Estilos del elemento en el Inspector.</p>' +
        '</div>'
      )
      : '';
    var menuMenu = state.dockOpen === 'menu'
      ? (
        '<div class="qe-dock__menu" data-qe-dock-menu role="menu">' +
          '<button type="button" class="qe-dock__menu-item" data-qe-open-main-menu role="menuitem">Abrir menú</button>' +
          '<button type="button" class="qe-dock__menu-item" data-qe-create-template role="menuitem">Crear plantilla</button>' +
        '</div>'
      )
      : '';

    function mod(id, label) {
      var on = state.dockOpen === id || (id === 'scene' && state.sceneMenuOpen);
      return '' +
        '<div class="qe-dock__mod-wrap">' +
          '<button type="button" class="qe-dock__mod' + (on ? ' is-open' : '') + '"' +
            ' data-qe-dock="' + id + '">' +
            '<span class="qe-dock__mod-label">' + escapeHtml(label) + '</span>' +
          '</button>' +
          (id === 'scene' ? sceneMenu : '') +
          (id === 'element' ? elementMenu : '') +
          (id === 'styles' ? stylesMenu : '') +
          (id === 'menu' ? menuMenu : '') +
        '</div>';
    }

    return '' +
      '<div class="qe-dock" data-qe-dock-bar>' +
        mod('scene', 'crear escena') +
        mod('element', 'agregar elemento') +
        mod('styles', 'styles') +
        mod('menu', 'menu') +
      '</div>';
  }

  function canvasHtml() {
    var scene = activeScene();
    var useRuntime = !isEditorRuntimeDisabled() && sceneUsesProjectCover(scene);
    var designBody = useRuntime
      ? (heroRuntimeStageHtml() + '<div class="qe-scene-drop-hit" data-qe-drop-scene></div>')
      : stageBodyHtml(scene);
    return '' +
      '<section class="qe-col qe-col--canvas" aria-label="Canvas">' +
        '<div class="qe-stage-shell" data-qe-stage-shell>' +
          '<div class="qe-stage-unit" data-qe-stage-unit>' +
            scenesBarHtml() +
            '<div class="qe-canvas__stage" data-qe-canvas data-qe-drop-scene>' +
              '<div class="qe-canvas__viewport" data-qe-canvas-viewport>' +
                '<div class="qe-canvas__screen" data-qe-canvas-screen>' +
                  '<div class="qe-canvas__design" data-qe-canvas-design>' +
                    designBody +
                    editLayerHtml() +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            stageDockHtml() +
          '</div>' +
        '</div>' +
        resourcePickerHtml() +
      '</section>';
  }

  var canvasRo = null;
  var stageRo = null;
  var stageFitBound = false;
  var STAGE_FIT_INSET = 8;
  var STAGE_SCENES_MIN_H = 120;
  var STAGE_DOCK_MIN_H = 64;

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
   * V7.2.23 — REAL Stage Auto-Fit (Figma).
   * One natural block: scenes + 1920×1080 canvas + dock.
   * One transform: scale(...). Never reflow pieces independently.
   */
  function fitStageWorkspace() {
    if (!rootEl) return;
    var col = rootEl.querySelector('.qe-col--canvas');
    var shell = rootEl.querySelector('[data-qe-stage-shell]');
    var unit = rootEl.querySelector('[data-qe-stage-unit]');
    if (!col || !shell || !unit) return;

    var vp = measureStageViewport(col);
    var availW = vp.width;
    var availH = vp.height;

    var natW = CANVAS_DESIGN_W;
    var natCanvasH = CANVAS_DESIGN_H;

    /* 1) Natural size — unlock scale, lock design pixels. */
    unit.style.transform = 'none';
    unit.style.width = natW + 'px';
    unit.style.height = 'auto';
    unit.style.maxWidth = 'none';
    unit.style.position = 'absolute';
    unit.style.top = '0';
    unit.style.left = '0';
    unit.style.transformOrigin = 'top left';
    unit.style.visibility = 'hidden';

    var stage = unit.querySelector('[data-qe-canvas]');
    if (stage) {
      stage.style.width = natW + 'px';
      stage.style.height = natCanvasH + 'px';
      stage.style.minHeight = natCanvasH + 'px';
      stage.style.maxHeight = natCanvasH + 'px';
      stage.style.flex = '0 0 auto';
    }
    syncDesignIdentity();

    var scenes = unit.querySelector('.qe-scenes');
    var dock = unit.querySelector('[data-qe-dock-bar], .qe-dock');
    if (scenes) {
      scenes.style.width = natW + 'px';
      scenes.style.flex = '0 0 auto';
    }
    if (dock) {
      dock.style.width = natW + 'px';
      dock.style.flex = '0 0 auto';
      dock.style.display = 'grid';
    }

    /* Force layout before measuring chrome. */
    void unit.offsetHeight;

    var scenesH = Math.max(
      scenes ? Math.ceil(scenes.getBoundingClientRect().height) : 0,
      STAGE_SCENES_MIN_H
    );
    var dockH = Math.max(
      dock ? Math.ceil(dock.getBoundingClientRect().height) : 0,
      STAGE_DOCK_MIN_H
    );
    var scenesMb = scenes
      ? (parseFloat(window.getComputedStyle(scenes).marginBottom) || 0)
      : 0;
    var dockMt = dock
      ? (parseFloat(window.getComputedStyle(dock).marginTop) || 0)
      : 0;
    var dockMb = dock
      ? (parseFloat(window.getComputedStyle(dock).marginBottom) || 0)
      : 0;

    var natH = Math.max(
      1,
      Math.ceil(scenesH + scenesMb + natCanvasH + dockMt + dockH + dockMb)
    );
    unit.style.height = natH + 'px';
    unit.style.visibility = '';

    /* 2) Single uniform scale for the whole Stage block. */
    var scale = Math.min(availW / natW, availH / natH);
    if (!isFinite(scale) || scale <= 0) scale = 0.01;
    if (scale > 1) scale = 1;

    var scaledW = Math.max(1, Math.floor(natW * scale));
    var scaledH = Math.max(1, Math.floor(natH * scale));

    shell.style.boxSizing = 'border-box';
    shell.style.width = scaledW + 'px';
    shell.style.height = scaledH + 'px';
    shell.style.maxWidth = '100%';
    shell.style.maxHeight = '100%';
    shell.style.position = 'relative';
    shell.style.overflow = 'hidden';
    shell.style.flex = '0 0 auto';
    shell.setAttribute('data-qe-stage-scale', String(Math.round(scale * 1000) / 1000));
    shell.setAttribute('data-qe-stage-nat', natW + 'x' + natH);

    unit.style.transform = 'scale(' + scale + ')';
  }

  /** Design pixels == stage pixels; outer Stage scale is the only zoom. */
  function syncDesignIdentity() {
    if (!rootEl) return;
    var viewport = rootEl.querySelector('[data-qe-canvas-viewport]');
    var screen = rootEl.querySelector('[data-qe-canvas-screen]');
    var design = rootEl.querySelector('[data-qe-canvas-design]');
    if (viewport) viewport.style.padding = '0';
    if (screen) {
      screen.style.width = CANVAS_DESIGN_W + 'px';
      screen.style.height = CANVAS_DESIGN_H + 'px';
    }
    if (design) {
      design.style.width = CANVAS_DESIGN_W + 'px';
      design.style.height = CANVAS_DESIGN_H + 'px';
      design.style.transform = 'none';
      design.style.transformOrigin = 'top left';
    }
  }

  function fitCanvasDesign() {
    fitStageWorkspace();
  }

  function onStageFitSignal() {
    fitStageWorkspace();
  }

  function bindCanvasFit() {
    fitStageWorkspace();
    requestAnimationFrame(function () {
      fitStageWorkspace();
      requestAnimationFrame(fitStageWorkspace);
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
      if (workspace) stageRo.observe(workspace);
      var dockEl = document.getElementById('boxiesDock');
      if (dockEl) stageRo.observe(dockEl);
    }
    if (!stageFitBound && typeof window !== 'undefined') {
      stageFitBound = true;
      window.addEventListener('resize', onStageFitSignal);
      document.addEventListener('fullscreenchange', onStageFitSignal);
      document.addEventListener('webkitfullscreenchange', onStageFitSignal);
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
    return '' +
      '<div class="qe-insp__exp-host" data-exp-inspector-body>' +
        '<div class="qe-insp__idle">' +
          '<div class="qe-insp__detail-kicker">Propiedades</div>' +
          '<p class="qe-insp__empty">Usa Agregar elemento → Botón / Hotspot, o selecciona un elemento del Hero.</p>' +
        '</div>' +
      '</div>';
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

  function inspectorHtml() {
    if (state.focusMode) return '';

    clearInvalidSelection();
    var content = selectedContent();
    var el = findSelectedElement();
    var scene = activeScene();

    var floatBtn =
      '<button type="button" class="quotation-panel-float quotation-panel-float--right"' +
        ' data-qe-toggle-inspector' +
        ' data-collapsed="' + (state.inspectorCollapsed ? '1' : '0') + '"' +
        ' aria-expanded="' + (state.inspectorCollapsed ? 'false' : 'true') + '"' +
        ' aria-label="' + (state.inspectorCollapsed ? 'Expandir inspector' : 'Colapsar inspector') + '"' +
        ' data-tooltip="' + (state.inspectorCollapsed ? 'Expandir inspector' : 'Colapsar inspector') + '">' +
        (typeof BuilderIcons !== 'undefined' && BuilderIcons.render
          ? BuilderIcons.render('chevron-right')
          : '›') +
      '</button>';

    if (state.inspectorCollapsed) {
      return '' +
        '<aside class="qe-col qe-col--inspector is-collapsed" aria-label="Inspector">' +
          floatBtn +
        '</aside>';
    }

    var body;
    /* Hero ProjectCover elements keep Quotation inspector; buttons/hotspots use Showroom. */
    if (el && (el.type === 'button' || el.type === 'icon')) {
      body = buttonInspectorHtml(elementAsButtonItem(el));
    } else if (el) {
      body = elementInspectorHtml(el);
    } else {
      body = idleInspectorHtml();
    }

    var hint = content
      ? (content.name || groupLabel(content.group))
      : (scene ? scene.name : 'Sin selección');

    return '' +
      '<aside class="qe-col qe-col--inspector" aria-label="Inspector">' +
        floatBtn +
        '<div class="qe-col__head">' +
          '<div class="qe-col__head-text">' +
            '<h2 class="qe-col__title">Inspector</h2>' +
            '<p class="qe-col__hint">' + escapeHtml(hint) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="qe-insp__scroll">' + body + '</div>' +
      '</aside>';
  }

  function editorLayoutClass() {
    var cls = 'quotation-step quotation-step--editor qe-editor';
    if (state.focusMode) cls += ' is-focus';
    if (state.inspectorCollapsed && !state.focusMode) cls += ' is-inspector-collapsed';
    if (document.getElementById('quotationLeftBody')) cls += ' qe-editor--external-library';
    return cls;
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
          inspectorHtml() +
        '</div>';
    }
    return '' +
      '<div class="' + editorLayoutClass() + '" data-qe-editor>' +
        libHtml +
        canvasHtml() +
        inspectorHtml() +
      '</div>';
  }

  function rerender() {
    if (!rootEl) return;
    var host = rootEl.closest
      ? (rootEl.matches('[data-quotation-panel]') ? rootEl : rootEl.closest('[data-quotation-panel]'))
      : null;
    var panel = host || rootEl;
    panel.innerHTML = render();
    bind(panel);
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
    state.activeSceneId = id;
    state.selectedElementId = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    rerender();
  }

  function deleteScene(id) {
    ensureScenes();
    var sid = String(id || '').trim();
    if (!sid) return;
    var idx = -1;
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].id === sid) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;

    destroyExperienciaOverlay();
    state.scenes.splice(idx, 1);

    if (state.activeSceneId === sid) {
      var next = state.scenes[idx] || state.scenes[idx - 1] || null;
      state.activeSceneId = next ? next.id : null;
    } else if (state.activeSceneId && !sceneById(state.activeSceneId)) {
      state.activeSceneId = (state.scenes[0] && state.scenes[0].id) || null;
    }

    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    markDirtyLocal();
    rerender();
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
      hotspots: []
    };
    state.scenes.push(scene);
    state.activeSceneId = scene.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    state.dockOpen = false;
    state.resourcePickerOpen = false;
    markDirtyLocal();
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
    var targetId = sceneId || state.activeSceneId;
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
      console.warn('[QuotationEditor] autosave after library change', eSave);
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error((eSave && eSave.message) || 'No se pudo guardar tras eliminar el recurso.');
      }
    }
  }

  async function removeLibraryResource(contentId) {
    var item = contentById(contentId);
    if (!item) return;
    var label = item.name || 'este recurso';
    if (!window.confirm('¿Eliminar «' + label + '» de la biblioteca?\nSe quitará de escenas, canvas y Hero. Esta acción no se puede deshacer.')) {
      return;
    }

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
    if (state.items && state.items[item.id]) {
      try { delete state.items[item.id]; } catch (eItems) {}
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

    markDirtyLocal();
    rerender();
    await autosaveAfterLibraryChange();
  }

  function openResourcePicker() {
    state.resourcePickerOpen = true;
    state.dockOpen = false;
    rerender();
  }

  function closeResourcePicker() {
    state.resourcePickerOpen = false;
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
      scene.coverModel = payload.coverModel;
      if (!scene.elements || !scene.elements.length) scene.elements = payload.elements;
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
    if (!rootEl) return;
    var insp = rootEl.querySelector('.qe-col--inspector');
    if (!insp) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = inspectorHtml();
    var next = wrap.firstChild;
    if (next) insp.replaceWith(next);
    var editor = rootEl.querySelector('[data-qe-editor]') || rootEl;
    wireInspectorFields(editor);
    editor.querySelectorAll('[data-qe-toggle-inspector]').forEach(function (btn) {
      if (btn.dataset.qeBound) return;
      btn.dataset.qeBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleInspectorCollapsed();
      });
    });
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
  function detachUi() {
    destroyExperienciaOverlay();
    persistDraft();
    rootEl = null;
  }

  function mountExperienciaOverlay() {
    destroyExperienciaOverlay();
    if (!rootEl || typeof QuotationExperienciaBridge === 'undefined') return;
    var layer = rootEl.querySelector('[data-qe-edit-layer]');
    if (!layer) return;
    ensureScenes();
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });

    var inspHost = rootEl.querySelector('[data-exp-inspector-body]');
    expOverlay = QuotationExperienciaBridge.mount(layer, {
      scenes: state.scenes,
      activeSceneId: state.activeSceneId,
      contentById: contentById,
      inspectorBody: inspHost,
      editMode: state.expEditMode === 'hotspots' ? 'hotspots' : 'buttons',
      onChange: function () {
        markDirtyLocal();
      }
    });

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

  function setLibraryCollapsed(on) {
    state.libraryCollapsed = !!on;
    state.sceneMenuOpen = false;
    rerender();
  }

  function setInspectorCollapsed(on) {
    state.inspectorCollapsed = !!on;
    state.sceneMenuOpen = false;
    try {
      document.documentElement.style.setProperty(
        '--qe-inspector-w',
        state.inspectorCollapsed ? '0px' : '220px'
      );
    } catch (eW) {}
    rerender();
    try {
      window.dispatchEvent(new Event('resize'));
    } catch (eR) {}
  }

  function toggleLibraryCollapsed() {
    setLibraryCollapsed(!state.libraryCollapsed);
  }

  function toggleInspectorCollapsed() {
    setInspectorCollapsed(!state.inspectorCollapsed);
  }

  function onFocusEsc(e) {
    if (!state.focusMode) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setFocusMode(false);
    }
  }

  function bindFocusEsc() {
    if (focusEscBound) return;
    document.addEventListener('keydown', onFocusEsc);
    focusEscBound = true;
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
    rerender();
  }

  function toggleFolder(folderId) {
    state.openFolders[folderId] = !(state.openFolders[folderId] !== false);
    rerender();
  }

  function createFolder(groupId, name) {
    var meta = groupMeta(groupId);
    if (!meta || groupId === 'hero' || meta.prepared) return;
    var label = String(name || '').trim();
    if (!label) return;
    var folder = {
      id: nextId('fd'),
      group: groupId,
      name: label
    };
    state.folders.push(folder);
    state.openFolders[folder.id] = true;
    state.folderComposerGroup = null;
    state.openGroups[groupId] = true;
    markDirtyLocal();
    rerender();
  }

  /* Same-category only: mutate folderId, never item.group / media / URLs. */
  function moveLibraryItemToFolder(contentId, targetFolderId) {
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
    markDirtyLocal();
    rerender();
    return true;
  }

  function markDirtyLocal() {
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mark) {
      BuilderDirtyState.mark();
    }
    persistDraft();
  }

  function setHeroFromFile(file, media) {
    /* Library-only: store under hero group; never assign to a scene. */
    if (!file) return;
    addFilesToGroup('hero', [file], null, media);
  }

  function addFilesToGroup(groupId, fileList, folderId, forceMedia) {
    var meta = groupMeta(groupId);
    if (!meta || meta.linkMode || meta.prepared) return;
    if (folderId && !folderById(folderId)) folderId = null;
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
    rerender();
    qeLibAudit('1-select-file:after-rerender');

    /* V7.2.29 — Upload immediately via BunnyMediaApi (sole media provider). */
    (function uploadCreated(list) {
      var chain = Promise.resolve();
      list.forEach(function (item) {
        chain = chain.then(function () {
          return uploadLibraryItem(item).then(function () {
            markDirtyLocal();
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
        remoteUrl: url
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

  function addShapeElement(kind) {
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

  function bind(panel, ctx) {
    rootEl = panel;
    if (ctx && typeof ctx === 'object') editorProjectCtx = ctx;
    hydrateEditorProjectCtxSlug();
    bindFocusEsc();

    var projectId = String((editorProjectCtx && editorProjectCtx.id) || '').trim();

    function wireEditor() {
      bindCanvasFit();
      mountRuntimeCanvas();
      mountExperienciaOverlay();
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
        return out;
      }

      function qOne(sel) {
        if (editor && editor.querySelector) {
          var a = editor.querySelector(sel);
          if (a) return a;
        }
        if (leftBody && leftBody.querySelector) return leftBody.querySelector(sel);
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
      qAll('[data-qe-pick-resource]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          assignResourceToScene(btn.getAttribute('data-qe-pick-resource'));
        });
      });

      qAll('[data-qe-drag-lib], [data-qe-drag-resource]').forEach(function (el) {
        el.addEventListener('dragstart', function (e) {
          if (e.target && e.target.closest && e.target.closest('[data-qe-remove-resource]')) {
            e.preventDefault();
            return;
          }
          var libId = el.getAttribute('data-qe-drag-lib') || el.getAttribute('data-qe-drag-resource');
          var sceneId = el.getAttribute('data-qe-drag-resource');
          var group = el.getAttribute('data-qe-lib-group') || '';
          if (!libId || !e.dataTransfer) return;
          e.dataTransfer.setData('text/qe-lib-move', libId);
          e.dataTransfer.setData('text/qe-lib-group', group);
          if (sceneId) {
            e.dataTransfer.setData('text/qe-resource', sceneId);
            e.dataTransfer.setData('text/plain', sceneId);
            e.dataTransfer.effectAllowed = 'copyMove';
          } else {
            e.dataTransfer.setData('text/plain', libId);
            e.dataTransfer.effectAllowed = 'move';
          }
          el.classList.add('is-dragging');
        });
        el.addEventListener('dragend', function () {
          el.classList.remove('is-dragging');
          qAll('.is-lib-drop-target').forEach(function (z) {
            z.classList.remove('is-lib-drop-target');
          });
        });
      });

      function libDropGroupOf(zone) {
        return zone.getAttribute('data-qe-lib-drop-group') || '';
      }

      qAll('[data-qe-lib-drop-folder], [data-qe-lib-drop-root]').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
          var dragEl = document.querySelector('.qe-lib__item.is-dragging');
          var dragGroup = dragEl
            ? (dragEl.getAttribute('data-qe-lib-group') || '')
            : '';
          var dropGroup = libDropGroupOf(zone);
          if (!dragGroup || !dropGroup || dragGroup !== dropGroup) {
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
            zone.classList.remove('is-lib-drop-target');
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('is-lib-drop-target');
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
        zone.addEventListener('dragleave', function (e) {
          if (e.relatedTarget && zone.contains(e.relatedTarget)) return;
          zone.classList.remove('is-lib-drop-target');
        });
        zone.addEventListener('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('is-lib-drop-target');
          var id = (e.dataTransfer && (
            e.dataTransfer.getData('text/qe-lib-move') ||
            e.dataTransfer.getData('text/plain')
          )) || '';
          if (!id) return;
          var item = contentById(id);
          var dropGroup = libDropGroupOf(zone);
          if (!item || String(item.group) !== String(dropGroup)) return;
          var folderId = zone.getAttribute('data-qe-lib-drop-folder') || null;
          moveLibraryItemToFolder(id, folderId);
        });
      });

      qAll('[data-qe-drop-scene]').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
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
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('is-drop-target');
          var id = (e.dataTransfer && (
            e.dataTransfer.getData('text/qe-resource') ||
            e.dataTransfer.getData('text/plain')
          )) || '';
          var sceneId = zone.getAttribute('data-qe-drop-scene-id') || null;
          if (id) assignResourceToScene(id, sceneId || undefined);
        });
      });

      editor.querySelectorAll('[data-qe-scene]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectScene(btn.getAttribute('data-qe-scene'));
        });
      });

      editor.querySelectorAll('[data-qe-scene-delete]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          deleteScene(btn.getAttribute('data-qe-scene-delete'));
        });
      });

      var scenesTrack = editor.querySelector('[data-qe-scenes-track]');
      var scenesPrev = editor.querySelector('[data-qe-scenes-prev]');
      var scenesNext = editor.querySelector('[data-qe-scenes-next]');
      function scrollScenes(dir) {
        if (!scenesTrack) return;
        scenesTrack.scrollBy({ left: dir * Math.max(200, scenesTrack.clientWidth * 0.6), behavior: 'smooth' });
      }
      if (scenesPrev) scenesPrev.addEventListener('click', function () { scrollScenes(-1); });
      if (scenesNext) scenesNext.addEventListener('click', function () { scrollScenes(1); });

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

    qAll('[data-qe-folder-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleFolder(btn.getAttribute('data-qe-folder-toggle'));
      });
    });

    qAll('[data-qe-content]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-qe-remove-resource]')) return;
        selectContent(el.getAttribute('data-qe-content'));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        selectContent(el.getAttribute('data-qe-content'));
      });
    });

    qAll('[data-qe-remove-resource]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        removeLibraryResource(btn.getAttribute('data-qe-remove-resource'));
      });
      btn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
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

    var addBtn = editor.querySelector('[data-qe-add-button]');
    if (addBtn) addBtn.addEventListener('click', addButton);
    var addHs = editor.querySelector('[data-qe-add-hotspot]');
    if (addHs) addHs.addEventListener('click', addHotspot);
    var addTextBtn = editor.querySelector('[data-qe-add-text]');
    if (addTextBtn) addTextBtn.addEventListener('click', addTextElement);
    editor.querySelectorAll('[data-qe-add-shape]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addShapeElement(btn.getAttribute('data-qe-add-shape') || 'SHAPE_RECT');
      });
    });

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
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      if (state.scenes[i] && state.scenes[i].coverModel &&
          (state.scenes[i].templateId === 'hero-default' || state.scenes[i].type === 'hero')) {
        return state.scenes[i];
      }
    }
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
          uploadStatus: libraryItemUploadStatus(c)
        };
      }).filter(Boolean),
      folders: (state.folders || []).map(function (f) {
        if (!f) return null;
        return {
          id: f.id,
          group: f.group || null,
          name: f.name || 'Carpeta'
        };
      }).filter(Boolean)
    };
  }

  function serializeDocument() {
    ensureScenes();
    return {
      version: 1,
      activeSceneId: state.activeSceneId || (state.scenes[0] && state.scenes[0].id) || null,
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
          interactions: Array.isArray(sc.interactions) ? sc.interactions : []
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
          name: f.name || 'Carpeta'
        };
      }).filter(function (f) { return f && f.id; });
    }
    if (Array.isArray(lib.content)) {
      state.content = lib.content.map(function (c) {
        if (!libraryItemIsPersistable(c)) return null;
        var pub = c.publicUrl || c.remoteUrl || null;
        if (pub && String(pub).indexOf('blob:') === 0) pub = null;
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
          file: null
        };
        row.uploadStatus = libraryItemUploadStatus(row);
        return row;
      }).filter(Boolean);
    }
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
        return;
      }
      state.scenes = hq.canvas.scenes.map(function (sc) {
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
          hotspots: Array.isArray(sc.hotspots) ? sc.hotspots : []
        };
        /* Resolve media from persisted library if scene URL missing. */
        if (!scene.mediaUrl && scene.resourceId) {
          var linked = contentById(scene.resourceId);
          var pub = publicUrlOf(linked);
          if (pub) {
            scene.mediaUrl = pub;
            scene.storagePath = (linked && linked.storagePath) || scene.storagePath;
          }
        }
        ensureSceneOverlays(scene);
        return scene;
      });
      state.activeSceneId = hq.canvas.activeSceneId || state.scenes[0].id;
      if (!sceneById(state.activeSceneId)) {
        state.activeSceneId = state.scenes[0].id;
      }
      return;
    }

    /* Legacy projects: seed one empty Hero scene — media must be assigned explicitly. */
    var scene = {
      id: nextId('sc'),
      name: 'Hero',
      type: 'hero',
      templateId: 'hero-default',
      resourceId: null,
      coverModel: null,
      elements: [],
      interactions: [],
      buttons: [],
      hotspots: []
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
  }

  function load(projectId) {
    var id = String(projectId || '').trim();
    if (!id) {
      loadPromise = Promise.resolve(null);
      return loadPromise;
    }

    /* Live document already bound — workspace remounts must not rebuild it. */
    if (documentReady && loadedProjectId === id) {
      return loadPromise || Promise.resolve(null);
    }

    if (loadPromise && loadedProjectId === id && !documentReady) {
      return loadPromise;
    }

    loadedProjectId = id;
    bunnyStructureReady = false;
    if (!id || typeof ProyectosApi === 'undefined' || !ProyectosApi.fetchHeroQuotation) {
      if (restoreDraft(id)) {
        documentReady = true;
        persistDraft();
      } else {
        hydrateFromHeroQuotation(null, editorProjectCtx);
        documentReady = true;
        persistDraft();
      }
      loadPromise = Promise.resolve(null);
      return loadPromise;
    }

    loadPromise = ProyectosApi.fetchHeroQuotation(id)
      .then(function (hq) {
        if (documentReady && loadedProjectId === id) return hq;
        console.log('[QE-LIB V7.2.37] 8-load:fetchHeroQuotation.library BEFORE hydrate');
        console.log(JSON.stringify(hq && hq.library, null, 2));
        qeLibAudit('8-load:before-hydrate');
        /*
         * V7.2.28 — DB is SSOT after save (canvas + library with publicUrl).
         * Do not prefer session draft over network: drafts held dead blob: URLs.
         */
        hydrateFromHeroQuotation(hq, editorProjectCtx);
        qeLibAudit('9-load:after-hydrateFromHeroQuotation');
        console.log('[QE-LIB V7.2.37] 9-load:state.content.length after hydrate',
          state.content ? state.content.length : 0);
        documentReady = true;
        loadedProjectId = id;
        persistDraft();
        return hq;
      })
      .catch(function () {
        if (documentReady && loadedProjectId === id) return null;
        console.log('[QE-LIB V7.2.37] 8-load:fetch FAILED → draft/empty');
        if (!restoreDraft(id)) {
          hydrateFromHeroQuotation(null, editorProjectCtx);
        }
        qeLibAudit('9-load:after-catch-hydrate');
        documentReady = true;
        loadedProjectId = id;
        persistDraft();
        return null;
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

    if (typeof ProyectosApi === 'undefined' || !ProyectosApi.updateHeroQuotation) {
      throw new Error('API de cotización no disponible.');
    }

    /* Flush Showroom overlay → scene.interactions before serialize. */
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }

    /* Ensure every library File is in Storage before serializing. */
    await ensureLibraryUploaded();
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
        branding: {
          showHeroLogo: !!cover.showLogo,
          logoStyle: cover.logoStyle || 'flat',
          logo: cover.logoUrl
            ? { name: 'Logo', uploadedUrl: cover.logoUrl, size: 0 }
            : null
        },
        video_url: cover.videoUrl || null,
        image_url: cover.imageUrl || null,
        canvas: doc
      };
    payload.library = library;

    console.log('[QE-LIB V7.2.37] 5-commit:payload.library before updateHeroQuotation');
    console.log(JSON.stringify(payload.library, null, 2));

    var saved = await ProyectosApi.updateHeroQuotation(projectId, payload);
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

  return {
    render: render,
    bind: bind,
    load: load,
    commit: commit,
    detachUi: detachUi,
    serializeDocument: serializeDocument,
    prepareLivePreview: prepareLivePreview,
    syncCoverFromHeroPayload: syncCoverFromHeroPayload,
    _getState: function () { return state; },
    _resetDemo: function () {
      destroyExperienciaOverlay();
      state = createEmptyState();
      loadedProjectId = null;
      loadPromise = null;
      documentReady = false;
      clearDraft();
    }
  };
})();
