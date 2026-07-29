/**
 * Quotation Editor — V7.1.04 optional folders inside content groups.
 * Folders organize only; selection of a resource still drives Canvas / Inspector.
 */
var QuotationEditor = (function () {
  var CONTENT_GROUPS = [
    { id: 'hero', label: 'Hero' },
    { id: 'renders', label: 'Renders', accept: 'image/*', addLabel: '+ Agregar' },
    { id: 'videos', label: 'Videos', accept: 'video/*', addLabel: '+ Agregar' },
    { id: 'tours360', label: 'Tours 360', linkMode: true, addLabel: '+ Agregar enlace' },
    { id: 'plantas2d', label: 'Plantas 2D', accept: 'image/*', addLabel: '+ Agregar' },
    { id: 'plantas3d', label: 'Plantas 3D', accept: 'image/*', addLabel: '+ Agregar' }
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
    plantas3d: { buttons: true, hotspots: true }
  };

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
    return g ? g.label : (groupId || 'Contenido');
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
    return {
      content: [],
      folders: [],
      selectedContentId: null,
      selectedItem: null,
      openGroups: {
        hero: true,
        renders: true,
        videos: true,
        tours360: true,
        plantas2d: true,
        plantas3d: true
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
      return;
    }
    if (found.kind === 'hotspot' && !tools.hotspots) {
      state.selectedItem = null;
      return;
    }
    if (found.kind === 'button' && !tools.buttons) {
      state.selectedItem = null;
    }
  }

  function thumbClass(content) {
    var kind = 'image';
    if (!content) kind = 'image';
    else if (content.group === 'hero') kind = 'hero';
    else if (content.group === 'videos' || content.media === 'video') kind = 'video';
    else if (content.group === 'tours360') kind = 'pano360';
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
            '<span class="qe-content__count">' + count + '</span>' +
          '</button>' +
          (open ? groupBodyHtml(group) : '') +
        '</section>';
    }).join('');

    return '' +
      '<aside class="qe-col qe-col--library" aria-label="Contenido">' +
        '<div class="qe-col__head">' +
          '<h2 class="qe-col__title">Contenido</h2>' +
          '<p class="qe-col__hint">Recursos del proyecto</p>' +
        '</div>' +
        '<div class="qe-content__list" data-qe-content-list>' + groups + '</div>' +
      '</aside>';
  }

  function mediaPreviewHtml(content) {
    if (!content) {
      return '<div class="qe-canvas__empty">Selecciona un contenido.</div>';
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
    return '' +
      '<section class="qe-col qe-col--canvas" aria-label="Canvas">' +
        '<div class="qe-col__head qe-col__head--canvas">' +
          '<div>' +
            '<h2 class="qe-col__title">Canvas</h2>' +
          '</div>' +
          '<div class="qe-canvas__head-right">' +
            (content
              ? ('<span class="qe-canvas__badge">' + escapeHtml(groupLabel(content.group)) + '</span>')
              : '') +
            canvasToolbarHtml(content) +
          '</div>' +
        '</div>' +
        '<div class="qe-canvas__stage" data-qe-canvas>' +
          mediaPreviewHtml(content) +
          canvasChipsHtml(content) +
        '</div>' +
      '</section>';
  }

  function destinationOptionsHtml(selectedId) {
    return state.content.map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '"' +
        (c.id === selectedId ? ' selected' : '') + '>' +
        escapeHtml(c.name || groupLabel(c.group)) +
      '</option>';
    }).join('');
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
        '<p class="qe-field__hint">Contenido</p>' +
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
    var pickRows = [];
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
    var emptyMsg = tools.hotspots
      ? 'Selecciona un botón o hotspot para comenzar a editar.'
      : 'Selecciona un botón para comenzar a editar.';
    return '' +
      '<div class="qe-insp__idle">' +
        '<div class="qe-insp__detail-kicker">Propiedades</div>' +
        '<p class="qe-insp__empty">' + emptyMsg + '</p>' +
        (pickRows.length
          ? ('<div class="qe-insp__picks">' + pickRows.join('') + '</div>')
          : '') +
      '</div>';
  }

  function inspectorHtml() {
    clearInvalidSelection();
    var content = selectedContent();
    var found = findSelectedItem();
    var body;
    if (found && found.kind === 'button') body = buttonInspectorHtml(found.data);
    else if (found && found.kind === 'hotspot') body = hotspotInspectorHtml(found.data);
    else body = idleInspectorHtml(content);

    return '' +
      '<aside class="qe-col qe-col--inspector" aria-label="Inspector">' +
        '<div class="qe-col__head">' +
          '<h2 class="qe-col__title">Inspector</h2>' +
          '<p class="qe-col__hint">' +
            (content ? escapeHtml(content.name || groupLabel(content.group)) : 'Sin contenido') +
          '</p>' +
        '</div>' +
        '<div class="qe-insp__scroll">' + body + '</div>' +
      '</aside>';
  }

  function render() {
    clearInvalidSelection();
    return '' +
      '<div class="quotation-step quotation-step--editor qe-editor" data-qe-editor>' +
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
    rerender();
  }

  function selectItem(kind, id) {
    var content = selectedContent();
    var tools = toolsFor(content);
    if (kind === 'button' && !tools.buttons) return;
    if (kind === 'hotspot' && !tools.hotspots) return;
    state.selectedItem = { kind: kind, id: id };
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
    if (!meta || groupId === 'hero') return;
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
    if (!meta || meta.linkMode || groupId === 'hero') return;
    if (folderId && !folderById(folderId)) folderId = null;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var lastId = null;
    files.forEach(function (file) {
      var name = nameFromFile(file);
      if (!name) return;
      var isVideo = groupId === 'videos' || (file.type && file.type.indexOf('video/') === 0);
      if (groupId === 'videos' && file.type && file.type.indexOf('video/') !== 0 &&
          !/\.(mp4|webm|mov|m4v|ogg)$/i.test(name)) {
        return;
      }
      if (groupId !== 'videos' && file.type && file.type.indexOf('image/') !== 0 &&
          !/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(name)) {
        return;
      }
      var item = {
        id: nextId('ct'),
        group: groupId,
        folderId: folderId || null,
        name: name,
        media: isVideo ? 'video' : 'image',
        previewUrl: URL.createObjectURL(file),
        remoteUrl: null
      };
      state.content.push(item);
      ensureItems(item.id);
      lastId = item.id;
    });
    if (folderId) state.openFolders[folderId] = true;
    if (lastId) {
      state.selectedContentId = lastId;
      state.selectedItem = null;
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
    var item = {
      id: nextId('btn'),
      label: 'Botón',
      style: 'button',
      action: 'goto-scene',
      targetSceneId: content.id
    };
    bag.buttons.push(item);
    state.selectedItem = { kind: 'button', id: item.id };
    markDirtyLocal();
    rerender();
  }

  function addHotspot() {
    var content = selectedContent();
    if (!content || !toolsFor(content).hotspots) return;
    var bag = ensureItems(content.id);
    var item = {
      id: nextId('hs'),
      label: 'Hotspot',
      shape: 'polygon',
      color: 'white',
      action: 'goto-scene',
      targetSceneId: content.id
    };
    bag.hotspots.push(item);
    state.selectedItem = { kind: 'hotspot', id: item.id };
    markDirtyLocal();
    rerender();
  }

  function patchSelected(mutator) {
    var found = findSelectedItem();
    if (!found) return;
    mutator(found.data);
    markDirtyLocal();
    rerender();
  }

  function bind(panel) {
    rootEl = panel;
    var editor = panel.querySelector('[data-qe-editor]') || panel;

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
