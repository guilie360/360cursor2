/**
 * BOXIES ShowroomsPage — list only fills #boxiesContent.
 * Open builder by permanent projectId (UUID); slug is vanity for display/URL.
 * Order is manual via display_order (drag & drop); identity/publish do not reorder.
 * Column widths are user-resizable and persisted in localStorage.
 */
var BoxiesProjectsPage = (function () {
  var identityListener = null;
  var dragState = null;
  var savingOrder = false;
  var columnResizeState = null;
  var columnResizeCleanup = null;

  var COL_STORAGE_KEY = 'boxies.showrooms.columns';
  var COL_ORDER = ['drag', 'name', 'slug', 'status', 'public', 'updated', 'actions'];
  var COL_DEFS = {
    drag: { min: 40, default: 40, resizable: false },
    name: { min: 120, default: 280, resizable: true },
    slug: { min: 80, default: 160, resizable: true },
    status: { min: 72, default: 110, resizable: true },
    public: { min: 64, default: 88, resizable: true },
    updated: { min: 100, default: 160, resizable: true },
    actions: { min: 108, default: 120, resizable: true }
  };

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      var d = new Date(value);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '—'; }
  }

  function statusBadge(showroom) {
    if (showroom.publicado) {
      return '<span class="admin-badge badge-success">Publicado</span>';
    }
    var estado = showroom.estado || 'borrador';
    return '<span class="admin-badge badge-muted">' + escapeHtml(estado) + '</span>';
  }

  function publicToggle(showroom) {
    var id = showroom.id || '';
    var on = !!showroom.is_public;
    return (
      '<button type="button" class="toggle-switch boxies-public-toggle' + (on ? ' on' : '') + '"' +
        ' role="switch" aria-checked="' + (on ? 'true' : 'false') + '"' +
        ' aria-label="' + (on ? 'Público' : 'Privado') + '"' +
        ' title="' + (on ? 'Público — visible en landing' : 'Privado — oculto del landing') + '"' +
        ' data-boxies-public-id="' + escapeHtml(id) + '"' +
        ' data-boxies-public="' + (on ? '1' : '0') + '">' +
        '<span class="toggle-switch-knob" aria-hidden="true"></span>' +
      '</button>'
    );
  }

  var ICONS = {
    edit:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' +
      '</svg>',
    copy:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
      '</svg>',
    trash:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' +
      '</svg>'
  };

  function defaultWidths() {
    var out = {};
    COL_ORDER.forEach(function (key) {
      out[key] = COL_DEFS[key].default;
    });
    return out;
  }

  function loadColumnWidths() {
    var widths = defaultWidths();
    try {
      var raw = window.localStorage.getItem(COL_STORAGE_KEY);
      if (!raw) return widths;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return widths;
      COL_ORDER.forEach(function (key) {
        var n = Number(parsed[key]);
        if (isFinite(n) && n > 0) {
          widths[key] = Math.max(COL_DEFS[key].min, Math.round(n));
        }
      });
    } catch (err) {}
    return widths;
  }

  function saveColumnWidths(widths) {
    try {
      var payload = {};
      COL_ORDER.forEach(function (key) {
        payload[key] = Math.round(widths[key]);
      });
      window.localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {}
  }

  function sumWidths(widths) {
    return COL_ORDER.reduce(function (sum, key) {
      return sum + widths[key];
    }, 0);
  }

  function applyColumnWidths(table, widths) {
    if (!table) return;
    COL_ORDER.forEach(function (key) {
      var col = table.querySelector('col[data-col="' + key + '"]');
      if (!col) return;
      var w = Math.max(COL_DEFS[key].min, Math.round(widths[key]));
      widths[key] = w;
      col.style.width = w + 'px';
      col.style.minWidth = COL_DEFS[key].min + 'px';
    });
    var wrap = table.closest('.boxies-showrooms-wrap');
    var minFill = wrap ? wrap.clientWidth : 0;
    table.style.width = Math.max(sumWidths(widths), minFill) + 'px';
  }

  function measureColumnAutoWidth(table, colKey) {
    var min = COL_DEFS[colKey].min;
    var cells = table.querySelectorAll(
      'th[data-col="' + colKey + '"], td.boxies-col-' + colKey
    );
    var max = min;
    Array.prototype.forEach.call(cells, function (cell) {
      var probe = cell.querySelector(
        '.boxies-th-label, .boxies-showroom-name, .boxies-showroom-slug, .admin-badge, .boxies-row-actions, .boxies-public-toggle'
      ) || cell;
      var prev = probe.style.whiteSpace;
      probe.style.whiteSpace = 'nowrap';
      var w = Math.ceil(probe.scrollWidth || probe.offsetWidth || 0);
      probe.style.whiteSpace = prev;
      max = Math.max(max, w + 24);
    });
    return max;
  }

  function bindColumnResize(table) {
    if (!table) return;
    if (columnResizeCleanup) {
      columnResizeCleanup();
      columnResizeCleanup = null;
    }

    var widths = loadColumnWidths();
    applyColumnWidths(table, widths);

    function onMove(e) {
      if (!columnResizeState) return;
      e.preventDefault();
      var next = columnResizeState.startWidth + (e.clientX - columnResizeState.startX);
      next = Math.max(COL_DEFS[columnResizeState.key].min, Math.round(next));
      widths[columnResizeState.key] = next;
      applyColumnWidths(table, widths);
    }

    function onUp() {
      if (!columnResizeState) return;
      var handle = columnResizeState.handle;
      columnResizeState = null;
      document.body.classList.remove('boxies-col-resizing');
      if (handle) handle.classList.remove('is-active');
      saveColumnWidths(widths);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    function onDown(e) {
      var handle = e.target.closest('.boxies-col-resizer');
      if (!handle || !table.contains(handle)) return;
      var key = handle.getAttribute('data-resize');
      if (!key || !COL_DEFS[key] || !COL_DEFS[key].resizable) return;
      e.preventDefault();
      e.stopPropagation();
      columnResizeState = {
        key: key,
        startX: e.clientX,
        startWidth: widths[key],
        handle: handle
      };
      handle.classList.add('is-active');
      document.body.classList.add('boxies-col-resizing');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    function onDblClick(e) {
      var handle = e.target.closest('.boxies-col-resizer');
      if (!handle || !table.contains(handle)) return;
      var key = handle.getAttribute('data-resize');
      if (!key || !COL_DEFS[key] || !COL_DEFS[key].resizable) return;
      e.preventDefault();
      e.stopPropagation();
      widths[key] = measureColumnAutoWidth(table, key);
      applyColumnWidths(table, widths);
      saveColumnWidths(widths);
    }

    table.addEventListener('mousedown', onDown);
    table.addEventListener('dblclick', onDblClick);

    columnResizeCleanup = function () {
      table.removeEventListener('mousedown', onDown);
      table.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.classList.remove('boxies-col-resizing');
      columnResizeState = null;
    };
  }

  function thCell(key, label, opts) {
    opts = opts || {};
    var resizable = COL_DEFS[key] && COL_DEFS[key].resizable;
    var cls = 'boxies-col-' + key + (opts.extraClass ? ' ' + opts.extraClass : '');
    var labelHtml = label
      ? '<span class="boxies-th-label">' + label + '</span>'
      : '';
    var aria = opts.ariaLabel
      ? ' aria-label="' + escapeHtml(opts.ariaLabel) + '"'
      : '';
    var resizer = resizable
      ? '<span class="boxies-col-resizer" data-resize="' + key + '" title="Arrastrar para redimensionar"></span>'
      : '';
    return (
      '<th class="' + cls + '" data-col="' + key + '"' + aria + '>' +
        labelHtml +
        resizer +
      '</th>'
    );
  }

  function row(showroom) {
    var id = showroom.id || '';
    var slug = showroom.slug || '';
    var name = showroom.nombre || slug || 'Sin nombre';
    return (
      '<tr class="boxies-showroom-row" draggable="true" data-showroom-id="' + escapeHtml(id) + '">' +
        '<td class="boxies-showroom-drag boxies-col-drag">' +
          '<button type="button" class="boxies-drag-handle" aria-label="Arrastrar para reordenar" title="Arrastrar">' +
            '<span aria-hidden="true">⋮⋮</span>' +
          '</button>' +
        '</td>' +
        '<td class="boxies-col-name"><strong class="boxies-showroom-name">' + escapeHtml(name) + '</strong></td>' +
        '<td class="boxies-col-slug"><code class="boxies-showroom-slug" title="' + escapeHtml(slug) + '">' +
          escapeHtml(slug) + '</code></td>' +
        '<td class="boxies-col-status">' + statusBadge(showroom) + '</td>' +
        '<td class="boxies-public-cell boxies-col-public">' + publicToggle(showroom) + '</td>' +
        '<td class="boxies-col-updated">' + escapeHtml(formatDate(showroom.updated_at)) + '</td>' +
        '<td class="table-actions boxies-col-actions">' +
          '<div class="boxies-row-actions">' +
            '<button type="button" class="boxies-icon-action" data-boxies-open-builder-id="' +
              escapeHtml(id) +
            '" data-boxies-open-builder="' +
              escapeHtml(slug) +
            '" title="Administrar" aria-label="Administrar">' + ICONS.edit + '</button>' +
            '<button type="button" class="boxies-icon-action" data-boxies-clone-id="' +
              escapeHtml(id) +
            '" title="Clonar" aria-label="Clonar">' + ICONS.copy + '</button>' +
            '<button type="button" class="boxies-icon-action boxies-icon-action--danger" data-boxies-delete-id="' +
              escapeHtml(id) +
            '" data-boxies-delete-name="' +
              escapeHtml(name) +
            '" title="Eliminar" aria-label="Eliminar">' + ICONS.trash + '</button>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  }

  function applyToggleVisual(btn, isPublic) {
    if (!btn) return;
    btn.classList.toggle('on', !!isPublic);
    btn.setAttribute('aria-checked', isPublic ? 'true' : 'false');
    btn.setAttribute('aria-label', isPublic ? 'Público' : 'Privado');
    btn.setAttribute(
      'title',
      isPublic ? 'Público — visible en landing' : 'Privado — oculto del landing'
    );
    btn.setAttribute('data-boxies-public', isPublic ? '1' : '0');
  }

  async function handlePublicToggle(btn) {
    if (!btn || btn.dataset.saving === '1') return;
    var projectId = btn.getAttribute('data-boxies-public-id');
    if (!projectId) return;
    var prev = btn.getAttribute('data-boxies-public') === '1';
    var next = !prev;
    applyToggleVisual(btn, next);
    btn.dataset.saving = '1';
    btn.disabled = true;

    try {
      if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
          typeof BoxiesAdmin2ProjectsApi.setPublic !== 'function') {
        throw new Error('API de visibilidad no disponible');
      }
      await BoxiesAdmin2ProjectsApi.setPublic(projectId, next);
    } catch (err) {
      applyToggleVisual(btn, prev);
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error(err.message || 'No se pudo cambiar la visibilidad');
      } else {
        setOrderStatus(err.message || 'No se pudo cambiar la visibilidad', true);
      }
    } finally {
      btn.dataset.saving = '0';
      btn.disabled = false;
    }
  }

  function bindPublicToggles(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-public-id]');
      if (!btn || !host.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      handlePublicToggle(btn);
    });
  }

  function collectOrderedIds(tbody) {
    return Array.prototype.slice
      .call(tbody.querySelectorAll('tr[data-showroom-id]'))
      .map(function (tr) { return tr.getAttribute('data-showroom-id'); })
      .filter(Boolean);
  }

  function setOrderStatus(text, isError) {
    var el = document.getElementById('boxiesProjectsOrderStatus');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  async function persistOrder(tbody) {
    if (savingOrder) return;
    var ids = collectOrderedIds(tbody);
    if (!ids.length) return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.reorder !== 'function') {
      setOrderStatus('No se pudo guardar el orden (API).', true);
      return;
    }
    savingOrder = true;
    setOrderStatus('Guardando orden…', false);
    tbody.classList.add('is-reordering');
    try {
      await BoxiesAdmin2ProjectsApi.reorder(ids);
      setOrderStatus('Orden guardado.', false);
      window.setTimeout(function () {
        setOrderStatus('', false);
      }, 1600);
    } catch (err) {
      setOrderStatus(err.message || 'Error guardando el orden.', true);
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error(err.message || 'Error guardando el orden');
      }
    } finally {
      savingOrder = false;
      tbody.classList.remove('is-reordering');
    }
  }

  function bindDragAndDrop(tbody) {
    var rows = function () {
      return Array.prototype.slice.call(tbody.querySelectorAll('tr[data-showroom-id]'));
    };

    tbody.addEventListener('dragstart', function (e) {
      var tr = e.target.closest('tr[data-showroom-id]');
      if (!tr || !tbody.contains(tr)) return;
      if (columnResizeState || e.target.closest(
        'button.boxies-action-btn, button.boxies-icon-action, .boxies-public-toggle, .boxies-col-resizer, [data-boxies-public-id], [data-boxies-clone-id], [data-boxies-delete-id]'
      )) {
        e.preventDefault();
        return;
      }
      dragState = { id: tr.getAttribute('data-showroom-id'), el: tr };
      tr.classList.add('is-dragging');
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragState.id);
      } catch (err) {}
    });

    tbody.addEventListener('dragend', function () {
      rows().forEach(function (tr) {
        tr.classList.remove('is-dragging', 'is-drag-over');
      });
      dragState = null;
    });

    tbody.addEventListener('dragover', function (e) {
      if (!dragState || columnResizeState) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
      var over = e.target.closest('tr[data-showroom-id]');
      rows().forEach(function (tr) {
        tr.classList.toggle('is-drag-over', tr === over && tr !== dragState.el);
      });
    });

    tbody.addEventListener('dragleave', function (e) {
      var over = e.target.closest('tr[data-showroom-id]');
      if (over) over.classList.remove('is-drag-over');
    });

    tbody.addEventListener('drop', function (e) {
      e.preventDefault();
      if (!dragState || !dragState.el || columnResizeState) return;
      var target = e.target.closest('tr[data-showroom-id]');
      rows().forEach(function (tr) { tr.classList.remove('is-drag-over'); });
      if (!target || target === dragState.el) return;

      var list = rows();
      var fromIndex = list.indexOf(dragState.el);
      var toIndex = list.indexOf(target);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      if (fromIndex < toIndex) {
        tbody.insertBefore(dragState.el, target.nextSibling);
      } else {
        tbody.insertBefore(dragState.el, target);
      }
      persistOrder(tbody);
    });
  }

  function bindOpenBuilder(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-open-builder-id]');
      if (!btn || !host.contains(btn)) return;
      e.preventDefault();
      openBuilder(
        btn.getAttribute('data-boxies-open-builder-id'),
        btn.getAttribute('data-boxies-open-builder')
      );
    });
  }

  function openBuilder(projectId, slug) {
    BoxiesRouter.navigate('builder', {
      projectId: projectId || null,
      project: slug || null
    });
  }

  function notifyError(message) {
    if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
      AdminNotify.error(message);
    } else {
      setOrderStatus(message, true);
    }
  }

  function notifySuccess(message) {
    if (typeof AdminNotify !== 'undefined' && AdminNotify.success) {
      AdminNotify.success(message);
    } else {
      setOrderStatus(message, false);
    }
  }

  async function handleCreateShowroom(btn) {
    if (!btn || btn.dataset.busy === '1') return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.createFromTemplate !== 'function') {
      notifyError('API de creación no disponible');
      return;
    }
    btn.dataset.busy = '1';
    btn.disabled = true;
    var prev = btn.textContent;
    btn.textContent = 'Creando…';
    try {
      var scope =
        typeof BoxiesShowroomScope !== 'undefined'
          ? BoxiesShowroomScope.getViewerContext()
          : null;
      var project = await BoxiesAdmin2ProjectsApi.createFromTemplate({ scope: scope });
      notifySuccess('Showroom creado');
      openBuilder(project.id, project.slug);
    } catch (err) {
      notifyError(err.message || 'No se pudo crear el showroom');
      btn.disabled = false;
      btn.textContent = prev;
      btn.dataset.busy = '0';
    }
  }

  async function handleCloneShowroom(btn) {
    if (!btn || btn.dataset.busy === '1') return;
    var projectId = btn.getAttribute('data-boxies-clone-id');
    if (!projectId) return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.cloneProject !== 'function') {
      notifyError('API de clonación no disponible');
      return;
    }
    btn.dataset.busy = '1';
    btn.disabled = true;
    var prevHtml = btn.innerHTML;
    btn.classList.add('is-busy-label');
    btn.textContent = 'Duplicando...';
    try {
      var scope =
        typeof BoxiesShowroomScope !== 'undefined'
          ? BoxiesShowroomScope.getViewerContext()
          : null;
      var project = await BoxiesAdmin2ProjectsApi.cloneProject(projectId, { scope: scope });
      notifySuccess('Showroom clonado');
      openBuilder(project.id, project.slug);
    } catch (err) {
      notifyError(err.message || 'No se pudo clonar el showroom');
      btn.disabled = false;
      btn.classList.remove('is-busy-label');
      btn.innerHTML = prevHtml;
      btn.dataset.busy = '0';
    }
  }

  async function handleDeleteShowroom(btn) {
    if (!btn || btn.dataset.busy === '1') return;
    var projectId = btn.getAttribute('data-boxies-delete-id');
    var name = btn.getAttribute('data-boxies-delete-name') || 'este showroom';
    if (!projectId) return;
    var ok = window.confirm('¿Eliminar «' + name + '»? Esta acción no se puede deshacer.');
    if (!ok) return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.remove !== 'function') {
      notifyError('API de eliminación no disponible');
      return;
    }
    btn.dataset.busy = '1';
    btn.disabled = true;
    try {
      await BoxiesAdmin2ProjectsApi.remove(projectId);
      var rowEl = btn.closest('tr[data-showroom-id]');
      if (rowEl && rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
      notifySuccess('Showroom eliminado');
      var tbody = document.getElementById('boxiesProjectsBody');
      if (tbody && !tbody.querySelector('tr[data-showroom-id]')) {
        tbody.innerHTML = '<tr><td colspan="7">No hay showrooms registrados.</td></tr>';
      }
    } catch (err) {
      notifyError(err.message || 'No se pudo eliminar el showroom');
      btn.disabled = false;
      btn.dataset.busy = '0';
    }
  }

  function bindShowroomActions(host) {
    host.addEventListener('click', function (e) {
      var createBtn = e.target.closest('#boxiesCreateShowroomBtn');
      if (createBtn && host.contains(createBtn)) {
        e.preventDefault();
        handleCreateShowroom(createBtn);
        return;
      }
      var cloneBtn = e.target.closest('[data-boxies-clone-id]');
      if (cloneBtn && host.contains(cloneBtn)) {
        e.preventDefault();
        e.stopPropagation();
        handleCloneShowroom(cloneBtn);
        return;
      }
      var deleteBtn = e.target.closest('[data-boxies-delete-id]');
      if (deleteBtn && host.contains(deleteBtn)) {
        e.preventDefault();
        e.stopPropagation();
        handleDeleteShowroom(deleteBtn);
      }
    });
  }

  function patchShowroomRow(detail) {
    if (!detail || !detail.id) return;
    var rowEl = document.querySelector(
      '#boxiesProjectsBody tr[data-showroom-id="' + detail.id + '"]'
    );
    if (!rowEl) return;
    var nameEl = rowEl.querySelector('.boxies-showroom-name');
    var slugEl = rowEl.querySelector('.boxies-showroom-slug');
    if (nameEl && detail.nombre) nameEl.textContent = detail.nombre;
    if (slugEl && detail.slug) {
      slugEl.textContent = detail.slug;
      slugEl.setAttribute('title', detail.slug);
    }
    var btn = rowEl.querySelector('[data-boxies-open-builder]');
    if (btn && detail.slug) btn.setAttribute('data-boxies-open-builder', detail.slug);
    var del = rowEl.querySelector('[data-boxies-delete-name]');
    if (del && detail.nombre) del.setAttribute('data-boxies-delete-name', detail.nombre);
  }

  async function mount(host) {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    host.innerHTML =
      '<div class="boxies-page boxies-page--showrooms">' +
        '<header class="boxies-showrooms-header">' +
          '<h1 class="boxies-page__title">Showrooms</h1>' +
          '<p class="boxies-page__desc">Administra los Showrooms Digitales de tu empresa. Arrastra las filas para cambiar el orden.</p>' +
        '</header>' +
        '<p class="boxies-projects-order-status" id="boxiesProjectsOrderStatus" aria-live="polite"></p>' +
        '<div class="admin-table-wrap boxies-showrooms-wrap">' +
          '<table class="admin-table boxies-showrooms-table" id="boxiesShowroomsTable">' +
            '<colgroup>' +
              '<col data-col="drag">' +
              '<col data-col="name">' +
              '<col data-col="slug">' +
              '<col data-col="status">' +
              '<col data-col="public">' +
              '<col data-col="updated">' +
              '<col data-col="actions">' +
            '</colgroup>' +
            '<thead><tr>' +
              thCell('drag', '', { extraClass: 'boxies-showroom-drag-th', ariaLabel: 'Orden' }) +
              thCell('name', 'Nombre') +
              thCell('slug', 'Slug') +
              thCell('status', 'Estado') +
              thCell('public', 'Público') +
              thCell('updated', 'Última modificación') +
              thCell('actions', '', { ariaLabel: 'Acciones' }) +
            '</tr></thead>' +
            '<tbody id="boxiesProjectsBody"><tr><td colspan="7">Cargando…</td></tr></tbody>' +
          '</table>' +
          '<div class="boxies-showrooms-footer">' +
            '<button type="button" class="boxies-action-btn" id="boxiesCreateShowroomBtn">' +
              '+ Crear Showroom' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindOpenBuilder(host);
    bindPublicToggles(host);
    bindShowroomActions(host);
    bindColumnResize(document.getElementById('boxiesShowroomsTable'));

    identityListener = function (ev) {
      patchShowroomRow(ev && ev.detail);
    };
    window.addEventListener('boxies:showroom-identity-changed', identityListener);

    var tbody = document.getElementById('boxiesProjectsBody');
    try {
      if (typeof BoxiesAdmin2ProjectsApi === 'undefined') {
        throw new Error('API de Showrooms no disponible');
      }
      var scope =
        typeof BoxiesShowroomScope !== 'undefined'
          ? BoxiesShowroomScope.getViewerContext()
          : null;
      var showrooms = await BoxiesAdmin2ProjectsApi.list({ scope: scope });
      if (!showrooms || !showrooms.length) {
        tbody.innerHTML = '<tr><td colspan="7">No hay showrooms registrados.</td></tr>';
        return;
      }
      tbody.innerHTML = showrooms.map(row).join('');
      bindDragAndDrop(tbody);
      applyColumnWidths(
        document.getElementById('boxiesShowroomsTable'),
        loadColumnWidths()
      );
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="7">' + escapeHtml(err.message || 'Error cargando showrooms') + '</td></tr>';
    }
  }

  function unmount() {
    if (identityListener) {
      window.removeEventListener('boxies:showroom-identity-changed', identityListener);
      identityListener = null;
    }
    if (columnResizeCleanup) {
      columnResizeCleanup();
      columnResizeCleanup = null;
    }
    dragState = null;
    columnResizeState = null;
    savingOrder = false;
  }

  return { id: 'projects', title: 'Showrooms', mount: mount, unmount: unmount };
})();
