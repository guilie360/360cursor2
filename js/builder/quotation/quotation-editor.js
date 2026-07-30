/**
 * Quotation Editor — V7.2.13 Showroom ExperienciaCanvas overlay (buttons + hotspots).
 */
var QuotationEditor = (function () {
  var CANVAS_DESIGN_W = 1920;
  var CANVAS_DESIGN_H = 1080;

  var CONTENT_GROUPS = [
    { id: 'hero', label: 'Hero' },
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
    hero: { buttons: true, hotspots: false },
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
      sceneMenuOpen: false,
      dockOpen: false,
      resourcePickerOpen: false,
      expEditMode: 'buttons',
      openGroups: {
        hero: true,
        renders: true,
        videos: true,
        tours360: true,
        plantas2d: true,
        plantas3d: true,
        pdf: true,
        audio: false,
        models: false
      },
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
    if (!state.scenes || !state.scenes.length) {
      var hero = {
        id: nextId('sc'),
        name: 'Hero',
        type: 'hero',
        elements: [],
        interactions: [],
        buttons: [],
        hotspots: []
      };
      state.scenes = [hero];
      state.activeSceneId = hero.id;
    }
    state.scenes.forEach(function (sc) { ensureSceneOverlays(sc); });
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
    return '' +
      '<button type="button" class="qe-lib__item' + (nested ? ' qe-lib__item--nested' : '') +
        (on ? ' is-selected' : '') + '"' +
        ' data-qe-content="' + escapeHtml(item.id) + '"' +
        (canAssign ? ' draggable="true" data-qe-drag-resource="' + escapeHtml(item.id) + '"' : '') + '>' +
        '<span class="' + thumbClass(item) + '" aria-hidden="true"' +
          (item.previewUrl
            ? ' style="background-image:url(\'' + escapeHtml(item.previewUrl) + '\');background-size:cover;background-position:center"'
            : '') +
        '></span>' +
        '<span class="qe-lib__meta">' +
          '<span class="qe-lib__name">' + escapeHtml(item.name || 'Sin nombre') + '</span>' +
          '<span class="qe-lib__type">' + escapeHtml(sub) + '</span>' +
        '</span>' +
      '</button>';
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
        escapeHtml(folder.id) + '">' +
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
    var actions = '';
    var tree = '';

    if (group.prepared) {
      return '' +
        '<div class="qe-content__body">' +
          '<p class="qe-content__prepared">Preparado para próximas versiones.</p>' +
        '</div>';
    }

    if (group.id === 'hero') {
      var heroItems = contentInGroup('hero');
      tree = heroItems.length
        ? ('<div class="qe-content__items">' +
            heroItems.map(function (item) { return contentItemRowHtml(item, false); }).join('') +
          '</div>')
        : '';
      /* Library only — uploads never assign to scenes. */
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-file-add="hero" data-qe-folder="">+ Agregar imagen</button>' +
        '<button type="button" class="qe-content__add" data-qe-file-add="hero" data-qe-folder="" data-qe-hero-media="video">+ Agregar video</button>' +
        '<input type="file" accept="image/*" hidden data-qe-file-input="hero" multiple>' +
        '<input type="file" accept="video/*" hidden data-qe-file-input="hero-video" multiple>';
    } else {
      var rootItems = rootContentInGroup(group.id);
      var folders = foldersInGroup(group.id);
      var rootHtml = rootItems.length
        ? ('<div class="qe-content__items">' +
            rootItems.map(function (item) { return contentItemRowHtml(item, false); }).join('') +
          '</div>')
        : '';
      var foldersHtml = folders.map(function (f) { return folderBlockHtml(f, group); }).join('');
      tree = rootHtml + foldersHtml;

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
    }

    return '' +
      '<div class="qe-content__body">' +
        tree +
        '<div class="qe-content__actions">' + actions + '</div>' +
      '</div>';
  }

  function contentColumnHtml() {
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
          '<h2 class="qe-col__title">Recursos</h2>' +
          '<p class="qe-col__hint">Biblioteca del proyecto</p>' +
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
    return !!(res && (res.previewUrl || res.remoteUrl));
  }

  function sceneUsesProjectCover(scene) {
    if (!scene) return false;
    if (!sceneHasResource(scene)) return false;
    return !!(scene.templateId === 'hero-default' || scene.type === 'hero' || scene.coverModel);
  }

  function emptyScenePlaceholderHtml() {
    return '' +
      '<div class="qe-scene-empty" data-qe-scene-empty data-qe-drop-scene>' +
        '<div class="qe-scene-empty__icon" aria-hidden="true">📷</div>' +
        '<p class="qe-scene-empty__title">Agrega un archivo</p>' +
        '<p class="qe-scene-empty__sub">Selecciona una imagen o un video desde tu biblioteca.</p>' +
        '<button type="button" class="qe-scene-empty__btn" data-qe-open-resource-picker>+ Agregar archivo</button>' +
      '</div>';
  }

  function sceneMediaStageHtml(scene) {
    var res = sceneResource(scene);
    if (!res) return emptyScenePlaceholderHtml();
    var url = res.previewUrl || res.remoteUrl || '';
    if (res.media === 'video' || res.group === 'videos') {
      return '' +
        '<div class="qe-scene-media" data-qe-drop-scene>' +
          '<video class="qe-scene-media__video" src="' + escapeHtml(url) + '"' +
            ' muted loop playsinline autoplay></video>' +
          '<button type="button" class="qe-scene-media__change" data-qe-open-resource-picker>Cambiar archivo</button>' +
        '</div>';
    }
    return '' +
      '<div class="qe-scene-media" data-qe-drop-scene>' +
        '<img class="qe-scene-media__img" src="' + escapeHtml(url) + '" alt="">' +
        '<button type="button" class="qe-scene-media__change" data-qe-open-resource-picker>Cambiar archivo</button>' +
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
    if (!sceneHasResource(scene)) return emptyScenePlaceholderHtml();
    if (sceneUsesProjectCover(scene)) {
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
      return '' +
        '<div class="qe-scenes__menu" data-qe-scene-menu role="menu">' +
          '<button type="button" class="qe-scenes__menu-item qe-scenes__menu-item--back" data-qe-scene-menu-root role="menuitem">' +
            '← Nueva escena' +
          '</button>' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-new="hero-default" role="menuitem">' +
            'Hero Default' +
          '</button>' +
        '</div>';
    }
    return '';
  }

  function scenesBarHtml() {
    ensureScenes();
    var thumbs = state.scenes.map(function (sc) {
      var on = sc.id === state.activeSceneId;
      var label = String(sc.name || 'Escena').toLowerCase();
      var res = sceneResource(sc);
      var bg = res && res.previewUrl
        ? ' style="background-image:url(\'' + escapeHtml(res.previewUrl) + '\');background-size:cover;background-position:center"'
        : '';
      return '' +
        '<button type="button" class="qe-scenes__thumb' + (on ? ' is-active' : '') + '"' +
          ' data-qe-scene="' + escapeHtml(sc.id) + '"' +
          ' title="' + escapeHtml(sc.name || 'Escena') + '">' +
          '<span class="qe-scenes__thumb-frame" aria-hidden="true"' + bg + '></span>' +
          '<span class="qe-scenes__thumb-name">' + escapeHtml(label) + '</span>' +
        '</button>';
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
          '<button type="button" class="qe-dock__menu-item' + (state.focusMode ? ' is-active' : '') + '"' +
            ' data-qe-focus role="menuitem">' +
            (state.focusMode ? 'Salir de Focus' : 'Focus') +
          '</button>' +
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
    var useRuntime = sceneUsesProjectCover(scene);
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

  /**
   * Fit scenes + 16:9 canvas + dock inside the column without page scroll.
   * Sizes the canvas to remaining height (Figma-style) — no outer transform scale.
   */
  function fitStageWorkspace() {
    if (!rootEl) return;
    var col = rootEl.querySelector('.qe-col--canvas');
    var shell = rootEl.querySelector('[data-qe-stage-shell]');
    var unit = rootEl.querySelector('[data-qe-stage-unit]');
    if (!col || !shell || !unit) return;

    unit.style.transform = 'none';
    unit.style.width = '';
    unit.style.height = '';
    shell.style.width = '100%';
    shell.style.height = '100%';
    shell.style.maxWidth = '100%';
    shell.style.maxHeight = '100%';

    var cs = window.getComputedStyle(col);
    var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var availW = Math.max(1, col.clientWidth - padX);
    var availH = Math.max(1, col.clientHeight - padY);

    var scenes = unit.querySelector('.qe-scenes');
    var dock = unit.querySelector('.qe-dock');
    var stage = unit.querySelector('[data-qe-canvas]');

    /* Measure chrome at full column width; collapse stage temporarily. */
    unit.style.width = Math.floor(availW) + 'px';
    if (stage) {
      stage.style.width = Math.floor(availW) + 'px';
      stage.style.height = '0px';
      stage.style.minHeight = '0';
      stage.style.maxHeight = 'none';
    }

    var scenesH = scenes ? scenes.offsetHeight : 0;
    var dockH = dock ? dock.offsetHeight : 0;
    var scenesMb = scenes
      ? (parseFloat(window.getComputedStyle(scenes).marginBottom) || 0)
      : 0;
    var dockMt = dock
      ? (parseFloat(window.getComputedStyle(dock).marginTop) || 0)
      : 0;
    var dockMb = dock
      ? (parseFloat(window.getComputedStyle(dock).marginBottom) || 0)
      : 0;
    var chromeH = scenesH + dockH + scenesMb + dockMt + dockMb;
    var remainH = Math.max(48, availH - chromeH);

    /* Largest 16:9 rectangle that fits in availW × remainH. */
    var canvasW = Math.min(availW, remainH * 16 / 9);
    var canvasH = canvasW * 9 / 16;
    if (canvasH > remainH) {
      canvasH = remainH;
      canvasW = canvasH * 16 / 9;
    }
    canvasW = Math.max(1, Math.floor(canvasW));
    canvasH = Math.max(1, Math.floor(canvasH));

    unit.style.width = canvasW + 'px';
    if (stage) {
      stage.style.width = canvasW + 'px';
      stage.style.height = canvasH + 'px';
      stage.style.flex = '0 0 auto';
    }

    var unitH = (scenes ? scenes.offsetHeight : 0) + scenesMb + canvasH +
      dockMt + (dock ? dock.offsetHeight : 0) + dockMb;
    shell.style.width = canvasW + 'px';
    shell.style.height = Math.min(availH, Math.max(1, Math.ceil(unitH))) + 'px';
    unit.style.transform = 'none';

    fitCanvasDesign();
  }

  function fitCanvasDesign() {
    if (!rootEl) return;
    var viewport = rootEl.querySelector('[data-qe-canvas-viewport]');
    var screen = rootEl.querySelector('[data-qe-canvas-screen]');
    var design = rootEl.querySelector('[data-qe-canvas-design]');
    if (!viewport || !screen || !design) return;
    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    if (vw < 2 || vh < 2) return;
    var scale = Math.min(vw / CANVAS_DESIGN_W, vh / CANVAS_DESIGN_H);
    var sw = Math.max(1, Math.floor(CANVAS_DESIGN_W * scale));
    var sh = Math.max(1, Math.floor(CANVAS_DESIGN_H * scale));
    screen.style.width = sw + 'px';
    screen.style.height = sh + 'px';
    design.style.width = CANVAS_DESIGN_W + 'px';
    design.style.height = CANVAS_DESIGN_H + 'px';
    design.style.transform = 'scale(' + scale + ')';
    design.style.transformOrigin = 'top left';
  }

  function bindCanvasFit() {
    fitStageWorkspace();
    var col = rootEl && rootEl.querySelector('.qe-col--canvas');
    if (typeof ResizeObserver !== 'undefined') {
      if (stageRo) stageRo.disconnect();
      if (canvasRo) canvasRo.disconnect();
      stageRo = new ResizeObserver(function () { fitStageWorkspace(); });
      if (col) stageRo.observe(col);
      var viewport = rootEl && rootEl.querySelector('[data-qe-canvas-viewport]');
      if (viewport) {
        canvasRo = new ResizeObserver(function () { fitCanvasDesign(); });
        canvasRo.observe(viewport);
      }
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', fitStageWorkspace);
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
    clearInvalidSelection();
    var content = selectedContent();
    var el = findSelectedElement();
    var scene = activeScene();
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
        '<div class="qe-col__head">' +
          '<h2 class="qe-col__title">Inspector</h2>' +
          '<p class="qe-col__hint">' + escapeHtml(hint) + '</p>' +
        '</div>' +
        '<div class="qe-insp__scroll">' + body + '</div>' +
      '</aside>';
  }

  function render(ctx) {
    if (ctx && typeof ctx === 'object') editorProjectCtx = ctx;
    clearInvalidSelection();
    ensureScenes();
    return '' +
      '<div class="quotation-step quotation-step--editor qe-editor' +
        (state.focusMode ? ' is-focus' : '') + '" data-qe-editor>' +
        contentColumnHtml() +
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
    var url = res.previewUrl || res.remoteUrl || '';
    var isVideo = res.media === 'video' || res.group === 'videos';
    if (isVideo) {
      scene.coverModel.videoUrl = url || null;
      scene.coverModel.imageUrl = null;
    } else {
      scene.coverModel.imageUrl = url || null;
      scene.coverModel.videoUrl = null;
    }
  }

  function assignResourceToScene(contentId, sceneId) {
    var res = contentById(contentId);
    var scene = sceneById(sceneId || state.activeSceneId);
    if (!res || !scene) return;
    if (!(res.media === 'image' || res.media === 'video' ||
        res.group === 'renders' || res.group === 'videos' || res.group === 'hero')) {
      return;
    }
    scene.resourceId = res.id;
    var url = res.previewUrl || res.remoteUrl || '';
    var isVideo = res.media === 'video' || res.group === 'videos';
    scene.mediaUrl = url || null;
    scene.mediaType = url ? (isVideo ? 'video' : 'image') : null;
    if (scene.type === 'hero' || scene.templateId === 'hero-default') {
      applyResourceToCoverModel(scene, res);
    } else {
      scene.coverModel = null;
    }
    state.resourcePickerOpen = false;
    state.dockOpen = false;
    markDirtyLocal();
    rerender();
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
    var scene = activeScene();
    if (!sceneUsesProjectCover(scene)) return;
    var iframe = runtimeIframe();
    if (!iframe || typeof QuotationRuntimeBridge === 'undefined') return;
    ensureHeroCoverModel(scene);
    QuotationRuntimeBridge.postToFrame(iframe, QuotationRuntimeBridge.TYPE.SET_MODEL, {
      coverModel: scene.coverModel,
      elementIds: coverElementIds(scene),
      selectedElementId: state.selectedElementId || null
    });
  }

  function pushSelectionToRuntime() {
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
    wireInspectorFields(rootEl.querySelector('[data-qe-editor]') || rootEl);
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
    if (expOverlay && typeof expOverlay.destroy === 'function') {
      try { expOverlay.destroy(); } catch (e) { /* ignore */ }
    }
    expOverlay = null;
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
      layer.classList.add('is-drop-target');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    layer.addEventListener('dragleave', function () {
      layer.classList.remove('is-drop-target');
    });
    layer.addEventListener('drop', function (e) {
      e.preventDefault();
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
      } else if (act.type === 'startHotspotDraw') {
        expOverlay.setEditMode('hotspots');
        expOverlay.startHotspotDraw();
      }
    }
  }

  function onRuntimeBridgeMessage(ev) {
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
    if (runtimeBridgeBound) return;
    runtimeBridgeBound = true;
    window.addEventListener('message', onRuntimeBridgeMessage);
  }

  /** Wire Canvas Hero iframe — Editor never mounts ProjectCover itself. */
  function mountRuntimeCanvas() {
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

  function markDirtyLocal() {
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mark) {
      BuilderDirtyState.mark();
    }
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
        /* allow image or video into hero library bucket */
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
      var item = {
        id: nextId('ct'),
        group: targetGroup,
        folderId: folderId || null,
        name: name,
        media: isPdf ? 'pdf' : (isVideo ? 'video' : 'image'),
        previewUrl: isPdf ? null : URL.createObjectURL(file),
        remoteUrl: null,
        file: file
      };
      state.content.push(item);
      ensureItems(item.id);
      lastId = item.id;
    });
    if (!lastId) return;
    state.selectedContentId = lastId;
    state.selectedItem = null;
    state.selectedElementId = null;
    state.openGroups[groupId === 'hero-video' ? 'hero' : groupId] = true;
    if (folderId) state.openFolders[folderId] = true;
    /* Do NOT touch scenes — library storage only. */
    markDirtyLocal();
    rerender();
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
    bindFocusEsc();

    var projectId = String((editorProjectCtx && editorProjectCtx.id) || '').trim();

    function wireEditor() {
      bindCanvasFit();
      mountRuntimeCanvas();
      mountExperienciaOverlay();
      var editor = panel.querySelector('[data-qe-editor]') || panel;

      editor.querySelectorAll('[data-qe-open-resource-picker]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openResourcePicker();
        });
      });
      var closePicker = editor.querySelector('[data-qe-close-resource-picker]');
      if (closePicker) {
        closePicker.addEventListener('click', function () { closeResourcePicker(); });
      }
      var picker = editor.querySelector('[data-qe-resource-picker]');
      if (picker) {
        picker.addEventListener('click', function (e) {
          if (e.target === picker) closeResourcePicker();
        });
      }
      editor.querySelectorAll('[data-qe-pick-resource]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          assignResourceToScene(btn.getAttribute('data-qe-pick-resource'));
        });
      });

      editor.querySelectorAll('[data-qe-drag-resource]').forEach(function (el) {
        el.addEventListener('dragstart', function (e) {
          var id = el.getAttribute('data-qe-drag-resource');
          if (!id || !e.dataTransfer) return;
          e.dataTransfer.setData('text/qe-resource', id);
          e.dataTransfer.setData('text/plain', id);
          e.dataTransfer.effectAllowed = 'copy';
        });
      });

      editor.querySelectorAll('[data-qe-drop-scene]').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
          e.preventDefault();
          zone.classList.add('is-drop-target');
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });
        zone.addEventListener('dragleave', function () {
          zone.classList.remove('is-drop-target');
        });
        zone.addEventListener('drop', function (e) {
          e.preventDefault();
          zone.classList.remove('is-drop-target');
          var id = (e.dataTransfer && (
            e.dataTransfer.getData('text/qe-resource') ||
            e.dataTransfer.getData('text/plain')
          )) || '';
          if (id) assignResourceToScene(id);
        });
      });

      editor.querySelectorAll('[data-qe-scene]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectScene(btn.getAttribute('data-qe-scene'));
        });
      });

      var scenesTrack = editor.querySelector('[data-qe-scenes-track]');
      var scenesPrev = editor.querySelector('[data-qe-scenes-prev]');
      var scenesNext = editor.querySelector('[data-qe-scenes-next]');
      function scrollScenes(dir) {
        if (!scenesTrack) return;
        scenesTrack.scrollBy({ left: dir * Math.max(160, scenesTrack.clientWidth * 0.6), behavior: 'smooth' });
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
        else if (mode === 'hero-default' || mode === 'template') {
          createScene({ templateId: 'hero-default' });
        }
      });
    });

    var focusBtn = editor.querySelector('[data-qe-focus]');
    if (focusBtn) {
      focusBtn.addEventListener('click', function () {
        toggleFocusMode();
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

    editor.querySelectorAll('[data-qe-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleGroup(btn.getAttribute('data-qe-toggle'));
      });
    });

    editor.querySelectorAll('[data-qe-folder-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleFolder(btn.getAttribute('data-qe-folder-toggle'));
      });
    });

    editor.querySelectorAll('[data-qe-content]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectContent(btn.getAttribute('data-qe-content'));
      });
    });

    editor.querySelectorAll('[data-qe-folder-new]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.folderComposerGroup = btn.getAttribute('data-qe-folder-new');
        state.tourComposer = { open: false, folderId: null };
        rerender();
        var input = rootEl.querySelector('[data-qe-folder-name]');
        if (input) {
          setTimeout(function () { input.focus(); }, 0);
        }
      });
    });

    var folderCancel = editor.querySelector('[data-qe-folder-cancel]');
    if (folderCancel) {
      folderCancel.addEventListener('click', function () {
        state.folderComposerGroup = null;
        rerender();
      });
    }
    var folderSubmit = editor.querySelector('[data-qe-folder-submit]');
    var folderName = editor.querySelector('[data-qe-folder-name]');
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

    editor.querySelectorAll('[data-qe-hero-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-qe-hero-add');
        var inputKey = kind === 'video' ? 'hero-video' : 'hero';
        var input = editor.querySelector('[data-qe-file-input="' + inputKey + '"]');
        if (input) input.click();
      });
    });

    editor.querySelectorAll('[data-qe-file-add]').forEach(function (btn) {
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
        var input = editor.querySelector('[data-qe-file-input="' + inputKey + '"]');
        if (input) input.click();
      });
    });

    editor.querySelectorAll('[data-qe-file-input]').forEach(function (input) {
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

    editor.querySelectorAll('[data-qe-tour-add]').forEach(function (btn) {
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

    var tourCancel = editor.querySelector('[data-qe-tour-cancel]');
    if (tourCancel) {
      tourCancel.addEventListener('click', function () {
        state.tourComposer = { open: false, folderId: null };
        rerender();
      });
    }
    var tourSubmit = editor.querySelector('[data-qe-tour-submit]');
    var tourText = editor.querySelector('[data-qe-tour-text]');
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

    var dropzone = editor.querySelector('[data-qe-tour-dropzone]');
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

    wireInspectorFields(editor);
    } /* wireEditor */

    if (projectId && loadedProjectId !== projectId) {
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

  function serializeDocument() {
    ensureScenes();
    return {
      version: 1,
      activeSceneId: state.activeSceneId || (state.scenes[0] && state.scenes[0].id) || null,
      scenes: state.scenes.map(function (sc) {
        ensureSceneOverlays(sc);
        return {
          id: sc.id,
          name: sc.name || 'Escena',
          type: sc.type || 'scene',
          templateId: sc.templateId || null,
          coverModel: sc.coverModel
            ? (typeof ProjectCover !== 'undefined' && ProjectCover.sanitizeModel
              ? ProjectCover.sanitizeModel(sc.coverModel)
              : sc.coverModel)
            : null,
          resourceId: sc.resourceId || null,
          mediaUrl: sc.mediaUrl ||
            (sc.coverModel && (sc.coverModel.imageUrl || sc.coverModel.videoUrl)) || null,
          mediaType: sc.mediaType ||
            (sc.coverModel && sc.coverModel.videoUrl ? 'video'
              : (sc.coverModel && sc.coverModel.imageUrl ? 'image' : null)),
          elements: Array.isArray(sc.elements) ? sc.elements : [],
          interactions: Array.isArray(sc.interactions) ? sc.interactions : []
        };
      })
    };
  }

  function hydrateFromHeroQuotation(hq, ctx) {
    hq = hq || null;
    if (hq && hq.canvas && Array.isArray(hq.canvas.scenes) && hq.canvas.scenes.length) {
      state.scenes = hq.canvas.scenes.map(function (sc) {
        var scene = {
          id: sc.id,
          name: sc.name || 'Escena',
          type: sc.type || 'scene',
          templateId: sc.templateId || null,
          coverModel: sc.coverModel || null,
          resourceId: sc.resourceId || null,
          mediaUrl: sc.mediaUrl || null,
          mediaType: sc.mediaType || null,
          elements: Array.isArray(sc.elements) ? sc.elements : [],
          interactions: Array.isArray(sc.interactions) ? sc.interactions : [],
          buttons: Array.isArray(sc.buttons) ? sc.buttons : [],
          hotspots: Array.isArray(sc.hotspots) ? sc.hotspots : []
        };
        ensureSceneOverlays(scene);
        return scene;
      });
      state.activeSceneId = hq.canvas.activeSceneId || state.scenes[0].id;
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
      state.content.push({
        id: synId,
        group: model.videoUrl ? 'videos' : 'renders',
        folderId: null,
        name: model.videoUrl ? 'Video del hero' : 'Imagen del hero',
        media: model.videoUrl ? 'video' : 'image',
        previewUrl: model.videoUrl || model.imageUrl,
        remoteUrl: model.videoUrl || model.imageUrl
      });
      scene.resourceId = synId;
    }
    state.scenes = [scene];
    state.activeSceneId = scene.id;
  }

  function load(projectId) {
    var id = String(projectId || '').trim();
    if (loadPromise && loadedProjectId === id) return loadPromise;
    loadedProjectId = id;
    if (!id || typeof ProyectosApi === 'undefined' || !ProyectosApi.fetchHeroQuotation) {
      loadPromise = Promise.resolve(null);
      return loadPromise;
    }
    loadPromise = ProyectosApi.fetchHeroQuotation(id)
      .then(function (hq) {
        hydrateFromHeroQuotation(hq, editorProjectCtx);
        return hq;
      })
      .catch(function () {
        hydrateFromHeroQuotation(null, editorProjectCtx);
        return null;
      });
    return loadPromise;
  }

  /**
   * Persist canvas document as SSOT. Derives hero_quotation fields from entry coverModel
   * so Runtime/Preview never need a second hero tree.
   */
  async function commit(adapter) {
    var projectId =
      (adapter && adapter.getProjectId && adapter.getProjectId()) ||
      (editorProjectCtx && editorProjectCtx.id) ||
      loadedProjectId;
    if (!projectId) return null;

    var entry = entryCoverScene();
    if (!entry || !entry.coverModel) {
      /* No canvas hero yet — leave hero_quotation alone. */
      return null;
    }

    if (typeof ProyectosApi === 'undefined' || !ProyectosApi.updateHeroQuotation) {
      throw new Error('API de cotización no disponible.');
    }

    /* Flush Showroom overlay → scene.interactions before serialize. */
    if (expOverlay && typeof expOverlay.pull === 'function') {
      try { expOverlay.pull(); } catch (ePull) {}
    }

    var doc = serializeDocument();
    var payload = typeof ProjectCover !== 'undefined' && ProjectCover.toHeroQuotationPayload
      ? ProjectCover.toHeroQuotationPayload(entry.coverModel, doc)
      : {
        heroContent: {
          nombre: entry.coverModel.nombre || '',
          eslogan: entry.coverModel.eslogan || '',
          botonIzquierdo: entry.coverModel.botonIzquierdo || 'Explorar',
          botonDerecho: entry.coverModel.botonDerecho || 'Iniciar',
          showShare: entry.coverModel.showShare !== false,
          showFullscreen: entry.coverModel.showFullscreen !== false
        },
        branding: {
          showHeroLogo: !!entry.coverModel.showLogo,
          logoStyle: entry.coverModel.logoStyle || 'flat',
          logo: entry.coverModel.logoUrl
            ? { name: 'Logo', uploadedUrl: entry.coverModel.logoUrl, size: 0 }
            : null
        },
        video_url: entry.coverModel.videoUrl || null,
        image_url: entry.coverModel.imageUrl || null,
        canvas: doc
      };

    var saved = await ProyectosApi.updateHeroQuotation(projectId, payload);
    loadedProjectId = String(projectId);
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
    serializeDocument: serializeDocument,
    syncCoverFromHeroPayload: syncCoverFromHeroPayload,
    _getState: function () { return state; },
    _resetDemo: function () {
      state = createEmptyState();
      loadedProjectId = null;
      loadPromise = null;
    }
  };
})();
