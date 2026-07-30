/**
 * Quotation Editor — V7.2.04 Hero Template Fidelity + Canvas Layout.
 * Hero Default = exact project-cover clone; Canvas = 16:9 (1920×1080) desktop frame.
 */
var QuotationEditor = (function () {
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
      elements: []
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
        elements: []
      };
      state.scenes = [hero];
      state.activeSceneId = hero.id;
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

  function buildHeroDefaultElements(ctx) {
    var projectName = '';
    if (ctx && typeof ctx === 'object') {
      projectName = String(ctx.name || ctx.nombre || '').trim();
    }

    var hs = null;
    try {
      if (typeof QuotationHero !== 'undefined' && QuotationHero.getState) {
        hs = QuotationHero.getState();
      }
    } catch (e) { hs = null; }

    var hc = (hs && hs.heroContent) || {};
    var branding = (hs && hs.branding) || {};
    var logo = branding.logo || null;
    var logoUrl = (logo && (logo.uploadedUrl || logo.previewUrl)) || '';
    var showLogo = branding.showHeroLogo !== false && !!logoUrl;
    var videoUrl = (hs && (hs.videoUrl || (hs.heroVideo && (hs.heroVideo.uploadedUrl || hs.heroVideo.previewUrl)))) || '';
    var imageUrl = (hs && (hs.imageUrl || (hs.heroImage && (hs.heroImage.uploadedUrl || hs.heroImage.previewUrl)))) || '';
    var mediaKind = 'ambient';
    var mediaSrc = '';
    if (videoUrl) {
      mediaKind = 'video';
      mediaSrc = videoUrl;
    } else if (imageUrl) {
      mediaKind = 'image';
      mediaSrc = imageUrl;
    }

    var titleText = String(hc.nombre || projectName || '').trim();
    var subtitleText = String(hc.eslogan || '').trim();
    var exploreLabel = String(hc.botonIzquierdo || 'Explorar').trim() || 'Explorar';
    var startLabel = String(hc.botonDerecho || 'Iniciar').trim() || 'Iniciar';
    var showShare = hc.showShare !== false;
    var showFullscreen = hc.showFullscreen !== false;

    /* Exact leaf roles of the published project-cover (index.html + project-data). */
    return [
      {
        id: nextId('el'),
        type: 'container',
        role: 'media',
        props: { label: 'Fondo', media: mediaKind, src: mediaSrc }
      },
      {
        id: nextId('el'),
        type: 'container',
        role: 'overlay',
        props: { label: 'Overlay' }
      },
      {
        id: nextId('el'),
        type: 'image',
        role: 'logo',
        props: {
          label: 'Logo',
          src: logoUrl,
          show: showLogo,
          logoStyle: branding.logoStyle === 'avatar' ? 'avatar' : 'flat'
        }
      },
      {
        id: nextId('el'),
        type: 'text',
        role: 'title',
        props: { label: 'Título', text: titleText }
      },
      {
        id: nextId('el'),
        type: 'text',
        role: 'subtitle',
        props: { label: 'Subtítulo', text: subtitleText }
      },
      {
        id: nextId('el'),
        type: 'button',
        role: 'explore',
        props: {
          label: exploreLabel,
          style: 'button',
          action: null,
          withIcon: true
        }
      },
      {
        id: nextId('el'),
        type: 'button',
        role: 'start',
        props: { label: startLabel, style: 'button', action: null }
      },
      {
        id: nextId('el'),
        type: 'button',
        role: 'back',
        props: { label: 'Demos', style: 'button', action: null, show: true }
      },
      {
        id: nextId('el'),
        type: 'icon',
        role: 'share',
        props: { label: 'Compartir', show: showShare }
      },
      {
        id: nextId('el'),
        type: 'icon',
        role: 'fullscreen',
        props: { label: 'Fullscreen', show: showFullscreen }
      },
      {
        id: nextId('el'),
        type: 'icon',
        role: 'assistant',
        props: { label: 'Asistente', show: true }
      }
    ];
  }

  /* @deprecated alias — V7.2.03 uses Hero Default clone */
  function buildHeroTemplateElements() {
    return buildHeroDefaultElements(editorProjectCtx);
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

  function selectedContent() {
    return contentById(state.selectedContentId) || state.content[0] || null;
  }

  function findSelectedItem() {
    var sel = state.selectedItem;
    if (!sel) return null;
    var bag = ensureItems(state.selectedContentId);
    var list = sel.kind === 'hotspot' ? bag.hotspots : bag.buttons;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === sel.id) {
        return { kind: sel.kind, data: list[i] };
      }
    }
    return null;
  }

  function clearInvalidSelection() {
    var content = selectedContent();
    var tools = toolsFor(content);
    var found = findSelectedItem();
    if (!found) {
      state.selectedItem = null;
    } else if (found.kind === 'hotspot' && !tools.hotspots) {
      state.selectedItem = null;
    } else if (found.kind === 'button' && !tools.buttons) {
      state.selectedItem = null;
    }
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
    return '' +
      '<button type="button" class="qe-lib__item' + (nested ? ' qe-lib__item--nested' : '') +
        (on ? ' is-selected' : '') + '"' +
        ' data-qe-content="' + escapeHtml(item.id) + '">' +
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
      actions = '' +
        '<button type="button" class="qe-content__add" data-qe-hero-add="image">+ Agregar imagen</button>' +
        '<button type="button" class="qe-content__add" data-qe-hero-add="video">+ Agregar video</button>' +
        '<input type="file" accept="image/*" hidden data-qe-file-input="hero-image">' +
        '<input type="file" accept="video/*" hidden data-qe-file-input="hero-video">';
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

  var SHARE_FLOAT_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
      '<path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/>' +
    '</svg>';

  var BACK_BTN_SVG =
    '<svg class="project-back-btn__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M15 18l-6-6 6-6"/>' +
    '</svg>';

  function qeSelectedClass(el) {
    return (el && state.selectedElementId === el.id) ? ' is-qe-selected' : '';
  }

  function qeElementAttr(el) {
    if (!el) return '';
    return ' data-qe-element="' + escapeHtml(el.id) + '"';
  }

  /**
   * Exact clone of published project-cover DOM (index.html + project-data applyHeroModule).
   * Uses real .project-cover* / float classes from components.css — no redesign.
   */
  function heroDefaultCloneHtml(scene) {
    var media = elementByRole(scene, 'media');
    var overlay = elementByRole(scene, 'overlay');
    var logo = elementByRole(scene, 'logo');
    var title = elementByRole(scene, 'title');
    var subtitle = elementByRole(scene, 'subtitle');
    var explore = elementByRole(scene, 'explore');
    var start = elementByRole(scene, 'start');
    var back = elementByRole(scene, 'back');
    var share = elementByRole(scene, 'share');
    var fullscreen = elementByRole(scene, 'fullscreen');
    var assistant = elementByRole(scene, 'assistant');

    var mediaProps = (media && media.props) || {};
    var hasVideo = mediaProps.media === 'video' && !!mediaProps.src;
    var hasImage = mediaProps.media === 'image' && !!mediaProps.src;
    var ambient = !hasVideo && !hasImage;

    var logoProps = (logo && logo.props) || {};
    var logoSrc = String(logoProps.src || '').trim();
    var showLogo = logoProps.show !== false && !!logoSrc;

    var exploreLabel = (explore && explore.props && explore.props.label) || 'Explorar';
    var startLabel = (start && start.props && start.props.label) || 'Iniciar';
    var backLabel = (back && back.props && back.props.label) || 'Demos';
    var showBack = !back || back.props.show !== false;
    var showShare = !share || share.props.show !== false;
    var showFullscreen = !fullscreen || fullscreen.props.show !== false;
    var showAssistant = !assistant || assistant.props.show !== false;

    var mediaHtml = '';
    if (hasVideo) {
      mediaHtml =
        '<video class="project-cover-video' + qeSelectedClass(media) + '"' + qeElementAttr(media) +
          ' muted loop playsinline autoplay src="' + escapeHtml(mediaProps.src) + '"></video>';
    } else if (hasImage) {
      mediaHtml =
        '<img class="project-cover-video' + qeSelectedClass(media) + '"' + qeElementAttr(media) +
          ' alt="" src="' + escapeHtml(mediaProps.src) + '">';
    } else {
      mediaHtml =
        '<div class="project-cover-video qe-hero-clone__media-hit' + qeSelectedClass(media) + '"' +
          qeElementAttr(media) + ' aria-label="Fondo" style="opacity:0"></div>';
    }

    var logoHtml = showLogo
      ? ('<img class="project-cover-logo' +
          (logoProps.logoStyle === 'avatar' ? ' is-avatar' : '') +
          qeSelectedClass(logo) + '"' + qeElementAttr(logo) +
          ' src="' + escapeHtml(logoSrc) + '" alt="">')
      : ('<img class="project-cover-logo is-hidden' + qeSelectedClass(logo) + '"' +
          qeElementAttr(logo) + ' alt="" hidden style="display:none">');

    return '' +
      '<section class="project-cover qe-hero-clone' + (ambient ? ' is-ambient-depth' : '') + '"' +
        ' data-qe-hero-clone="hero-default"' +
        ' data-hero-layout="centered"' +
        ' data-hero-text-color="light"' +
        ' data-hero-button-text-color="light">' +
        mediaHtml +
        '<div class="project-cover-overlay' + qeSelectedClass(overlay) + '"' +
          qeElementAttr(overlay) + '></div>' +
        '<div class="project-cover-content">' +
          logoHtml +
          '<div class="project-cover-hero-row">' +
            '<div class="project-cover-hero-copy">' +
              '<div class="project-cover-name' + qeSelectedClass(title) + '"' +
                qeElementAttr(title) + '>' +
                escapeHtml((title && title.props && title.props.text) || '') +
              '</div>' +
              '<div class="project-cover-tagline' + qeSelectedClass(subtitle) + '"' +
                qeElementAttr(subtitle) + '>' +
                escapeHtml((subtitle && subtitle.props && subtitle.props.text) || '') +
              '</div>' +
            '</div>' +
            '<div class="project-cover-buttons">' +
              '<div class="project-cover-slot project-cover-slot--start">' +
                '<button type="button" class="project-cover-btn with-icon' +
                  qeSelectedClass(explore) + '"' + qeElementAttr(explore) +
                  ' aria-label="' + escapeHtml(exploreLabel) + '">' +
                  '<span class="menu-btn-icon" aria-hidden="true">☰</span>' +
                  escapeHtml(exploreLabel) +
                '</button>' +
              '</div>' +
              '<div class="project-cover-slot project-cover-slot--end">' +
                '<button type="button" class="project-cover-btn' +
                  qeSelectedClass(start) + '"' + qeElementAttr(start) + '>' +
                  escapeHtml(startLabel) +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<a class="project-back-btn' + qeSelectedClass(back) + '"' + qeElementAttr(back) +
          ' href="#"' +
          (showBack ? '' : ' hidden aria-hidden="true"') + '>' +
          BACK_BTN_SVG +
          '<span class="project-back-btn__label">' + escapeHtml(backLabel) + '</span>' +
        '</a>' +
        '<button type="button" class="share-float' +
          (showShare ? '' : ' is-float-hidden') +
          qeSelectedClass(share) + '"' + qeElementAttr(share) +
          (showShare ? '' : ' hidden aria-hidden="true"') +
          ' aria-label="Compartir proyecto">' +
          SHARE_FLOAT_SVG +
        '</button>' +
        '<div class="global-action-stack is-visible is-hero-only' +
          (showFullscreen ? '' : ' is-float-hidden') + '"' +
          (showFullscreen ? '' : ' hidden aria-hidden="true"') + '>' +
          '<button type="button" class="global-fullscreen-btn is-visible' +
            qeSelectedClass(fullscreen) + '"' + qeElementAttr(fullscreen) +
            ' aria-label="Pantalla completa" aria-pressed="false">' +
            '<span class="global-fullscreen-icon" aria-hidden="true">⛶</span>' +
          '</button>' +
        '</div>' +
        '<button type="button" class="pa-fab' +
          qeSelectedClass(assistant) + '"' + qeElementAttr(assistant) +
          (showAssistant ? '' : ' hidden aria-hidden="true"') +
          ' aria-label="Abrir asistente" aria-expanded="false">' +
          '<span class="pa-fab__mark" aria-hidden="true"></span>' +
        '</button>' +
      '</section>';
  }

  function sceneCompositionHtml(scene) {
    if (!scene || !scene.elements || !scene.elements.length) return '';
    if (scene.templateId === 'hero-default' || scene.type === 'hero') {
      return '' +
        '<div class="qe-scene-comp qe-scene-comp--hero-clone" data-qe-scene-comp' +
          ' data-element-types="' +
          escapeHtml(ELEMENT_TYPES.map(function (t) { return t.id; }).join(',')) + '">' +
          heroDefaultCloneHtml(scene) +
        '</div>';
    }
    return '' +
      '<div class="qe-scene-comp" data-qe-scene-comp data-element-types="' +
        escapeHtml(ELEMENT_TYPES.map(function (t) { return t.id; }).join(',')) + '">' +
        '<div class="qe-canvas__empty">Escena sin composición.</div>' +
      '</div>';
  }

  function canvasChipsHtml(content) {
    if (!content) return '';
    var tools = toolsFor(content);
    var bag = ensureItems(content.id);
    var chips = [];
    if (tools.buttons) {
      bag.buttons.forEach(function (b) {
        var on = state.selectedItem && state.selectedItem.kind === 'button' &&
          state.selectedItem.id === b.id;
        chips.push(
          '<button type="button" class="qe-chip qe-chip--button' + (on ? ' is-selected' : '') + '"' +
            ' data-qe-item-kind="button" data-qe-item-id="' + escapeHtml(b.id) + '">' +
            escapeHtml(b.label || 'Botón') +
          '</button>'
        );
      });
    }
    if (tools.hotspots) {
      bag.hotspots.forEach(function (h) {
        var on = state.selectedItem && state.selectedItem.kind === 'hotspot' &&
          state.selectedItem.id === h.id;
        chips.push(
          '<button type="button" class="qe-chip qe-chip--hotspot' + (on ? ' is-selected' : '') + '"' +
            ' data-qe-item-kind="hotspot" data-qe-item-id="' + escapeHtml(h.id) + '">' +
            escapeHtml(h.label || 'Hotspot') +
          '</button>'
        );
      });
    }
    if (!chips.length) return '';
    return '<div class="qe-canvas__chips" data-qe-chips>' + chips.join('') + '</div>';
  }

  function stageBodyHtml(content, scene) {
    var hasElements = scene && scene.elements && scene.elements.length;
    if (hasElements) {
      return sceneCompositionHtml(scene) + canvasChipsHtml(content);
    }
    return mediaPreviewHtml(content) + canvasChipsHtml(content);
  }

  function scenesBarHtml() {
    ensureScenes();
    var tabs = state.scenes.map(function (sc) {
      var on = sc.id === state.activeSceneId;
      return '' +
        '<button type="button" class="qe-scenes__tab' + (on ? ' is-active' : '') + '"' +
          ' data-qe-scene="' + escapeHtml(sc.id) + '"' +
          ' title="' + escapeHtml(sc.type + ' · ' + sc.id) + '">' +
          escapeHtml(sc.name || 'Escena') +
        '</button>';
    }).join('');

    var menu = '';
    if (state.sceneMenuOpen === 'root') {
      menu = '' +
        '<div class="qe-scenes__menu" data-qe-scene-menu role="menu">' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-new="empty" role="menuitem">' +
            'Escena vacía' +
          '</button>' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-menu-templates role="menuitem">' +
            'Desde plantilla' +
          '</button>' +
        '</div>';
    } else if (state.sceneMenuOpen === 'templates') {
      menu = '' +
        '<div class="qe-scenes__menu" data-qe-scene-menu role="menu">' +
          '<button type="button" class="qe-scenes__menu-item qe-scenes__menu-item--back" data-qe-scene-menu-root role="menuitem">' +
            '← Nueva escena' +
          '</button>' +
          '<button type="button" class="qe-scenes__menu-item" data-qe-scene-new="hero-default" role="menuitem">' +
            'Hero Default' +
          '</button>' +
          '<p class="qe-scenes__menu-hint">Clon exacto del Hero publicado (project-cover).</p>' +
        '</div>';
    }

    return '' +
      '<div class="qe-scenes" data-qe-scenes>' +
        '<div class="qe-scenes__tabs">' + tabs + '</div>' +
        '<div class="qe-scenes__add-wrap">' +
          '<button type="button" class="qe-scenes__add' + (state.sceneMenuOpen ? ' is-open' : '') + '"' +
            ' data-qe-scene-menu-toggle aria-label="Nueva escena" aria-expanded="' +
            (state.sceneMenuOpen ? 'true' : 'false') + '">+</button>' +
          menu +
        '</div>' +
      '</div>';
  }

  function canvasToolbarHtml(content) {
    var tools = toolsFor(content);
    var actions = [];
    if (tools.buttons) {
      actions.push('<button type="button" class="qe-canvas__tool" data-qe-add-button>+ Botón</button>');
    }
    if (tools.hotspots) {
      actions.push('<button type="button" class="qe-canvas__tool" data-qe-add-hotspot>+ Hotspot</button>');
    }
    if (!actions.length) return '';
    return '<div class="qe-canvas__tools">' + actions.join('') + '</div>';
  }

  function canvasHtml() {
    var content = selectedContent();
    var scene = activeScene();
    return '' +
      '<section class="qe-col qe-col--canvas" aria-label="Canvas">' +
        scenesBarHtml() +
        '<div class="qe-col__head qe-col__head--canvas">' +
          '<div>' +
            '<h2 class="qe-col__title">Canvas</h2>' +
            '<p class="qe-col__hint">' +
              escapeHtml((scene && scene.name) || 'Escena') +
              (scene ? ' · ' + escapeHtml(scene.type || 'scene') : '') +
              ' · 16:9' +
            '</p>' +
          '</div>' +
          '<div class="qe-canvas__head-right">' +
            '<button type="button" class="qe-canvas__focus' + (state.focusMode ? ' is-active' : '') + '"' +
              ' data-qe-focus aria-pressed="' + (state.focusMode ? 'true' : 'false') + '">Focus</button>' +
            (content
              ? ('<span class="qe-canvas__badge">' + escapeHtml(groupLabel(content.group)) + '</span>')
              : '') +
            canvasToolbarHtml(content) +
          '</div>' +
        '</div>' +
        '<div class="qe-canvas__stage" data-qe-canvas>' +
          '<div class="qe-canvas__viewport" data-qe-canvas-viewport>' +
            '<div class="qe-canvas__screen" data-qe-canvas-screen>' +
              '<div class="qe-canvas__design" data-qe-canvas-design>' +
                stageBodyHtml(content, scene) +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  var canvasRo = null;
  var CANVAS_DESIGN_W = 1920;
  var CANVAS_DESIGN_H = 1080;

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
    fitCanvasDesign();
    var viewport = rootEl && rootEl.querySelector('[data-qe-canvas-viewport]');
    if (!viewport) return;
    if (typeof ResizeObserver !== 'undefined') {
      if (canvasRo) canvasRo.disconnect();
      canvasRo = new ResizeObserver(function () { fitCanvasDesign(); });
      canvasRo.observe(viewport);
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

  function hotspotInspectorHtml(item) {
    return '' +
      '<div class="qe-insp__editor" data-qe-detail>' +
        '<div class="qe-insp__detail-kicker">Hotspot</div>' +
        '<div class="qe-field">' +
          '<div class="qe-field__label">Forma</div>' +
          segmentHtml(HOTSPOT_SHAPES, item.shape || 'polygon', 'data-qe-item-shape') +
        '</div>' +
        '<div class="qe-field">' +
          '<div class="qe-field__label">Color</div>' +
          segmentHtml(HOTSPOT_COLORS, item.color || 'white', 'data-qe-item-color') +
        '</div>' +
        destinoYAccionHtml(item) +
      '</div>';
  }

  function idleInspectorHtml(content) {
    var tools = toolsFor(content);
    var bag = content ? ensureItems(content.id) : { buttons: [], hotspots: [] };
    var scene = activeScene();
    var pickRows = [];
    if (scene && scene.elements && scene.elements.length) {
      scene.elements.forEach(function (el) {
        var props = el.props || {};
        pickRows.push(
          '<button type="button" class="qe-insp__pick" data-qe-element="' +
            escapeHtml(el.id) + '">' +
            '<span>' + escapeHtml(elementTypeLabel(el.type)) + '</span><strong>' +
            escapeHtml(props.label || props.text || el.role || 'Elemento') + '</strong>' +
          '</button>'
        );
      });
    }
    if (tools.buttons) {
      bag.buttons.forEach(function (b) {
        pickRows.push(
          '<button type="button" class="qe-insp__pick" data-qe-item-kind="button" data-qe-item-id="' +
            escapeHtml(b.id) + '">' +
            '<span>Botón</span><strong>' + escapeHtml(b.label || 'Sin nombre') + '</strong>' +
          '</button>'
        );
      });
    }
    if (tools.hotspots) {
      bag.hotspots.forEach(function (h) {
        pickRows.push(
          '<button type="button" class="qe-insp__pick" data-qe-item-kind="hotspot" data-qe-item-id="' +
            escapeHtml(h.id) + '">' +
            '<span>Hotspot</span><strong>' + escapeHtml(h.label || 'Sin nombre') + '</strong>' +
          '</button>'
        );
      });
    }
    var emptyMsg = 'Selecciona un elemento, botón o hotspot para editar.';
    return '' +
      '<div class="qe-insp__idle">' +
        '<div class="qe-insp__detail-kicker">Propiedades</div>' +
        '<p class="qe-insp__empty">' + emptyMsg + '</p>' +
        (pickRows.length
          ? ('<div class="qe-insp__picks">' + pickRows.join('') + '</div>')
          : '') +
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
    var found = findSelectedItem();
    var el = findSelectedElement();
    var scene = activeScene();
    var body;
    if (found && found.kind === 'button') body = buttonInspectorHtml(found.data);
    else if (found && found.kind === 'hotspot') body = hotspotInspectorHtml(found.data);
    else if (el && (el.type === 'button' || el.type === 'icon')) {
      body = buttonInspectorHtml(elementAsButtonItem(el));
    } else if (el) body = elementInspectorHtml(el);
    else body = idleInspectorHtml(content);

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
    var content = selectedContent();
    var tools = toolsFor(content);
    if (kind === 'button' && !tools.buttons) return;
    if (kind === 'hotspot' && !tools.hotspots) return;
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
    rerender();
  }

  function selectScene(id) {
    if (!sceneById(id)) return;
    state.activeSceneId = id;
    state.selectedElementId = null;
    state.sceneMenuOpen = false;
    rerender();
  }

  function createScene(opts) {
    opts = opts || {};
    var templateId = opts.templateId || null;
    var fromHeroDefault = templateId === 'hero-default' || opts.fromTemplate === true;
    var scene = {
      id: nextId('sc'),
      name: fromHeroDefault ? 'Hero Default' : nextSceneName(),
      type: fromHeroDefault ? 'hero' : 'scene',
      templateId: fromHeroDefault ? 'hero-default' : null,
      elements: fromHeroDefault ? buildHeroDefaultElements(editorProjectCtx) : []
    };
    state.scenes.push(scene);
    state.activeSceneId = scene.id;
    state.selectedElementId = null;
    state.selectedItem = null;
    state.sceneMenuOpen = false;
    markDirtyLocal();
    rerender();
  }

  function setFocusMode(on) {
    state.focusMode = !!on;
    state.sceneMenuOpen = false;
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
    markDirtyLocal();
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
    if (!file) return;
    var name = nameFromFile(file);
    if (!name) return;
    var existing = contentInGroup('hero')[0] || null;
    var previewUrl = URL.createObjectURL(file);
    if (existing) {
      revokePreview(existing);
      existing.name = name;
      existing.media = media;
      existing.previewUrl = previewUrl;
      existing.remoteUrl = null;
      existing.folderId = null;
      state.selectedContentId = existing.id;
      state.selectedItem = null;
    } else {
      var item = {
        id: nextId('ct'),
        group: 'hero',
        folderId: null,
        name: name,
        media: media,
        previewUrl: previewUrl,
        remoteUrl: null
      };
      state.content.unshift(item);
      ensureItems(item.id);
      state.selectedContentId = item.id;
      state.selectedItem = null;
    }
    markDirtyLocal();
    rerender();
  }

  function addFilesToGroup(groupId, fileList, folderId) {
    var meta = groupMeta(groupId);
    if (!meta || meta.linkMode || meta.prepared || groupId === 'hero') return;
    if (folderId && !folderById(folderId)) folderId = null;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var lastId = null;
    files.forEach(function (file) {
      var name = nameFromFile(file);
      if (!name) return;
      var isVideo = groupId === 'videos' || (file.type && file.type.indexOf('video/') === 0);
      var isPdf = groupId === 'pdf' ||
        (file.type === 'application/pdf') ||
        /\.pdf$/i.test(name);
      if (groupId === 'pdf') {
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
        group: groupId,
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
    if (folderId) state.openFolders[folderId] = true;
    if (lastId) {
      state.selectedContentId = lastId;
      state.selectedItem = null;
      state.selectedElementId = null;
      markDirtyLocal();
      rerender();
    }
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
    var content = selectedContent();
    if (!content || !toolsFor(content).buttons) return;
    var bag = ensureItems(content.id);
    var scene = activeScene();
    var item = {
      id: nextId('btn'),
      label: 'Botón',
      style: 'button',
      action: 'goto-scene',
      targetSceneId: (scene && scene.id) || content.id
    };
    bag.buttons.push(item);
    state.selectedItem = { kind: 'button', id: item.id };
    state.selectedElementId = null;
    markDirtyLocal();
    rerender();
  }

  function addHotspot() {
    var content = selectedContent();
    if (!content || !toolsFor(content).hotspots) return;
    var bag = ensureItems(content.id);
    var scene = activeScene();
    var item = {
      id: nextId('hs'),
      label: 'Hotspot',
      shape: 'polygon',
      color: 'white',
      action: 'goto-scene',
      targetSceneId: (scene && scene.id) || content.id
    };
    bag.hotspots.push(item);
    state.selectedItem = { kind: 'hotspot', id: item.id };
    state.selectedElementId = null;
    markDirtyLocal();
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
    markDirtyLocal();
    rerender();
  }

  function bind(panel, ctx) {
    rootEl = panel;
    if (ctx && typeof ctx === 'object') editorProjectCtx = ctx;
    bindFocusEsc();
    bindCanvasFit();
    var editor = panel.querySelector('[data-qe-editor]') || panel;

    editor.querySelectorAll('[data-qe-scene]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectScene(btn.getAttribute('data-qe-scene'));
      });
    });

    var sceneMenuToggle = editor.querySelector('[data-qe-scene-menu-toggle]');
    if (sceneMenuToggle) {
      sceneMenuToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        state.sceneMenuOpen = state.sceneMenuOpen ? false : 'root';
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
        var input = editor.querySelector('[data-qe-file-input="hero-' + kind + '"]');
        if (input) input.click();
      });
    });

    editor.querySelectorAll('[data-qe-file-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var groupId = btn.getAttribute('data-qe-file-add');
        var folderAttr = btn.getAttribute('data-qe-folder');
        state.pendingFileTarget = {
          groupId: groupId,
          folderId: folderAttr || null
        };
        var input = editor.querySelector('[data-qe-file-input="' + groupId + '"]');
        if (input) input.click();
      });
    });

    editor.querySelectorAll('[data-qe-file-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.getAttribute('data-qe-file-input');
        var files = input.files;
        if (!files || !files.length) return;
        if (key === 'hero-image') setHeroFromFile(files[0], 'image');
        else if (key === 'hero-video') setHeroFromFile(files[0], 'video');
        else {
          var target = state.pendingFileTarget || { groupId: key, folderId: null };
          addFilesToGroup(target.groupId || key, files, target.folderId || null);
          state.pendingFileTarget = null;
        }
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

    editor.querySelectorAll('[data-qe-item-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectItem(btn.getAttribute('data-qe-item-kind'), btn.getAttribute('data-qe-item-id'));
      });
    });

    var labelInput = editor.querySelector('[data-qe-item-label]');
    if (labelInput) {
      labelInput.addEventListener('change', function () {
        patchSelected(function (item) {
          item.label = String(labelInput.value || '').trim() || item.label;
        });
      });
      labelInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          labelInput.blur();
        }
      });
    }

    editor.querySelectorAll('[data-qe-item-style]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        patchSelected(function (item) {
          item.style = btn.getAttribute('data-qe-item-style');
        });
      });
    });
    editor.querySelectorAll('[data-qe-item-shape]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        patchSelected(function (item) {
          item.shape = btn.getAttribute('data-qe-item-shape');
        });
      });
    });
    editor.querySelectorAll('[data-qe-item-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        patchSelected(function (item) {
          item.color = btn.getAttribute('data-qe-item-color');
        });
      });
    });

    editor.querySelectorAll('[data-qe-action]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        patchSelected(function (item) {
          item.action = input.getAttribute('data-qe-action');
        });
      });
    });

    var dest = editor.querySelector('[data-qe-item-dest]');
    if (dest) {
      dest.addEventListener('change', function () {
        patchSelected(function (item) {
          item.targetSceneId = dest.value;
        });
      });
    }
  }

  return {
    render: render,
    bind: bind,
    _getState: function () { return state; },
    _resetDemo: function () { state = createEmptyState(); }
  };
})();
