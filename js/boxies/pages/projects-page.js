/**
 * BOXIES ExperiencesPage (V7.0.00) — list only fills #boxiesContent.
 * Tabs filter one proyectos collection by experience_type.
 * Open builder by permanent projectId (UUID); slug is vanity for display/URL.
 * Order is manual via display_order (drag & drop); identity/publish do not reorder.
 * Column widths: Excel-style neighbor resize, persisted in localStorage.
 */
var BoxiesProjectsPage = (function () {
  var identityListener = null;
  var dragState = null;
  var savingOrder = false;
  var columnResizeState = null;
  var columnController = null;
  var isCreatingShowroom = false;
  var isDeletingShowroom = false;
  var activeExperienceType = 'showroom';
  var PENDING_CREATE_KEY = 'boxies_pending_showroom_creation';
  var PENDING_OPEN_KEY = 'boxies_pending_showroom_open';
  var COL_STORAGE_KEY = 'boxies.showrooms.columns';
  var COL_ORDER = ['drag', 'name', 'slug', 'status', 'public', 'updated', 'actions'];
  var COL_DEFS = {
    drag: { min: 36, default: 40, resizable: true },
    name: { min: 120, default: 260, resizable: true },
    slug: { min: 90, default: 140, resizable: true },
    status: { min: 88, default: 120, resizable: true },
    public: { min: 72, default: 96, resizable: true },
    updated: { min: 120, default: 168, resizable: true },
    actions: { min: 176, default: 212, resizable: true }
  };

  function experienceMeta(typeId) {
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.get) {
      return BoxiesExperienceTypes.get(typeId || activeExperienceType);
    }
    return {
      id: 'showroom',
      tabLabel: 'SHOWROOMS',
      singular: 'Showroom',
      plural: 'Showrooms',
      createLabel: '+ Nuevo Showroom',
      emptyMessage: 'No hay showrooms registrados.'
    };
  }

  function resolveActiveType(typeId) {
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.normalize) {
      return BoxiesExperienceTypes.normalize(typeId);
    }
    return String(typeId || 'showroom').toLowerCase() || 'showroom';
  }

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
        ' data-tooltip="' + (on ? 'Público — visible en landing' : 'Privado — oculto del landing') + '"' +
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
    eye:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>' +
        '<circle cx="12" cy="12" r="3"/>' +
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

  function flexSum(widths) {
    return COL_ORDER.reduce(function (sum, key) {
      return sum + widths[key];
    }, 0);
  }

  function minFlexSum() {
    return COL_ORDER.reduce(function (sum, key) {
      return sum + COL_DEFS[key].min;
    }, 0);
  }

  /** Persist as fractions of the full table width (viewport-independent). */
  function saveColumnWidths(widths) {
    try {
      var sum = flexSum(widths) || 1;
      var payload = { v: 3 };
      COL_ORDER.forEach(function (key) {
        payload[key] = widths[key] / sum;
      });
      window.localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {}
  }

  function loadColumnWidths() {
    var widths = defaultWidths();
    try {
      var raw = window.localStorage.getItem(COL_STORAGE_KEY);
      if (!raw) return widths;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return widths;

      if (parsed.v === 2 || parsed.v === 3) {
        var fracSum = 0;
        COL_ORDER.forEach(function (key) {
          var f = Number(parsed[key]);
          if (isFinite(f) && f > 0) fracSum += f;
        });
        if (fracSum > 0) {
          var base = 1000;
          COL_ORDER.forEach(function (key) {
            var f = Number(parsed[key]);
            if (!isFinite(f) || f <= 0) f = COL_DEFS[key].default / base;
            widths[key] = Math.max(
              COL_DEFS[key].min,
              Math.round((f / fracSum) * base)
            );
          });
        }
        return widths;
      }

      COL_ORDER.forEach(function (key) {
        var n = Number(parsed[key]);
        if (isFinite(n) && n > 0) {
          widths[key] = Math.max(COL_DEFS[key].min, Math.round(n));
        }
      });
    } catch (err) {}
    return widths;
  }

  function getNeighborKey(key) {
    var i = COL_ORDER.indexOf(key);
    if (i < 0 || i >= COL_ORDER.length - 1) return null;
    return COL_ORDER[i + 1];
  }

  /**
   * Fit widths into the available wrap width.
   * Table stays 100% when mins fit; overflow only if mins exceed space.
   */
  function layoutToContainer(table, widths) {
    if (!table) return;
    var wrap = table.closest('.boxies-showrooms-wrap');
    var avail = wrap ? wrap.clientWidth : table.parentElement.clientWidth;
    if (!avail || avail < 1) avail = 800;

    var mins = minFlexSum();
    if (avail < mins) {
      COL_ORDER.forEach(function (key) {
        widths[key] = COL_DEFS[key].min;
      });
      table.style.width = mins + 'px';
    } else {
      var sum = flexSum(widths);
      if (sum < 1) {
        var defaults = defaultWidths();
        COL_ORDER.forEach(function (key) { widths[key] = defaults[key]; });
        sum = flexSum(widths);
      }
      var scale = avail / sum;
      COL_ORDER.forEach(function (key) {
        widths[key] = Math.max(COL_DEFS[key].min, Math.round(widths[key] * scale));
      });
      var fixed = flexSum(widths);
      var drift = avail - fixed;
      if (drift !== 0) {
        widths.name = Math.max(COL_DEFS.name.min, widths.name + drift);
      }
      table.style.width = '100%';
    }

    COL_ORDER.forEach(function (key) {
      var col = table.querySelector('col[data-col="' + key + '"]');
      if (!col) return;
      col.style.width = widths[key] + 'px';
      col.style.minWidth = COL_DEFS[key].min + 'px';
    });
  }

  /** Apply pair change without renormalizing the whole table. */
  function applyPairWidths(table, widths) {
    COL_ORDER.forEach(function (key) {
      var col = table.querySelector('col[data-col="' + key + '"]');
      if (!col) return;
      col.style.width = widths[key] + 'px';
      col.style.minWidth = COL_DEFS[key].min + 'px';
    });
    var wrap = table.closest('.boxies-showrooms-wrap');
    var avail = wrap ? wrap.clientWidth : 0;
    var total = flexSum(widths);
    if (avail && total <= avail + 1) {
      table.style.width = '100%';
    } else {
      table.style.width = total + 'px';
    }
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
      max = Math.max(max, w + 28);
    });
    return max;
  }

  function readRenderedWidths(table, widths) {
    COL_ORDER.forEach(function (key) {
      var th = table.querySelector('th[data-col="' + key + '"]');
      if (th && th.offsetWidth > 0) {
        widths[key] = th.offsetWidth;
      }
    });
  }

  function bindColumnResize(table) {
    if (!table) return;
    if (columnController && columnController.destroy) {
      columnController.destroy();
      columnController = null;
    }

    var widths = loadColumnWidths();
    layoutToContainer(table, widths);

    function onMove(e) {
      if (!columnResizeState) return;
      e.preventDefault();
      var key = columnResizeState.key;
      var neighbor = columnResizeState.neighbor;
      var delta = e.clientX - columnResizeState.startX;
      var pair = columnResizeState.startWidth + columnResizeState.startNeighbor;
      var minKey = COL_DEFS[key].min;
      var minN = COL_DEFS[neighbor].min;
      var next = columnResizeState.startWidth + delta;
      next = Math.max(minKey, Math.min(pair - minN, Math.round(next)));
      widths[key] = next;
      widths[neighbor] = pair - next;
      applyPairWidths(table, widths);
    }

    function onUp() {
      if (!columnResizeState) return;
      var handle = columnResizeState.handle;
      columnResizeState = null;
      document.body.classList.remove('boxies-col-resizing');
      if (handle) handle.classList.remove('is-active');
      readRenderedWidths(table, widths);
      saveColumnWidths(widths);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    function onDown(e) {
      var handle = e.target.closest('.boxies-col-resizer');
      if (!handle || !table.contains(handle)) return;
      var key = handle.getAttribute('data-resize');
      if (!key || !COL_DEFS[key]) return;
      var neighbor = getNeighborKey(key);
      if (!neighbor) return;

      e.preventDefault();
      e.stopPropagation();

      readRenderedWidths(table, widths);

      columnResizeState = {
        key: key,
        neighbor: neighbor,
        startX: e.clientX,
        startWidth: widths[key],
        startNeighbor: widths[neighbor],
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
      if (!key || !COL_DEFS[key]) return;
      var neighbor = getNeighborKey(key);
      if (!neighbor) return;

      e.preventDefault();
      e.stopPropagation();

      readRenderedWidths(table, widths);
      var desired = measureColumnAutoWidth(table, key);
      var pair = widths[key] + widths[neighbor];
      var minKey = COL_DEFS[key].min;
      var minN = COL_DEFS[neighbor].min;
      var next = Math.max(minKey, Math.min(pair - minN, desired));
      widths[key] = next;
      widths[neighbor] = pair - next;
      applyPairWidths(table, widths);
      saveColumnWidths(widths);
    }

    function onWinResize() {
      layoutToContainer(table, widths);
    }

    table.addEventListener('mousedown', onDown);
    table.addEventListener('dblclick', onDblClick);
    window.addEventListener('resize', onWinResize);

    columnController = {
      relayout: function () {
        layoutToContainer(table, widths);
      },
      destroy: function () {
        table.removeEventListener('mousedown', onDown);
        table.removeEventListener('dblclick', onDblClick);
        window.removeEventListener('resize', onWinResize);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.classList.remove('boxies-col-resizing');
        columnResizeState = null;
      }
    };
  }

  function thCell(key, label, opts) {
    opts = opts || {};
    var cls = 'boxies-col-' + key + (opts.extraClass ? ' ' + opts.extraClass : '');
    var labelHtml = label
      ? '<span class="boxies-th-label">' + label + '</span>'
      : '';
    var aria = opts.ariaLabel
      ? ' aria-label="' + escapeHtml(opts.ariaLabel) + '"'
      : '';
    var isLast = key === COL_ORDER[COL_ORDER.length - 1];
    var resizer = !isLast
      ? '<span class="boxies-col-resizer" data-resize="' +
        key +
        '" data-tooltip="Arrastrar para redimensionar"></span>'
      : '';
    return (
      '<th class="' + cls + '" data-col="' + key + '"' + aria + '>' +
        '<div class="boxies-cell">' + labelHtml + '</div>' +
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
          '<div class="boxies-cell">' +
            '<button type="button" class="boxies-drag-handle" aria-label="Arrastrar para reordenar" data-tooltip="Arrastrar">' +
              '<span aria-hidden="true">⋮⋮</span>' +
            '</button>' +
          '</div>' +
        '</td>' +
        '<td class="boxies-col-name">' +
          '<div class="boxies-cell">' +
            '<strong class="boxies-showroom-name">' + escapeHtml(name) + '</strong>' +
          '</div>' +
        '</td>' +
        '<td class="boxies-col-slug">' +
          '<div class="boxies-cell">' +
            '<code class="boxies-showroom-slug" data-tooltip="' + escapeHtml(slug) + '">' +
              escapeHtml(slug) +
            '</code>' +
          '</div>' +
        '</td>' +
        '<td class="boxies-col-status">' +
          '<div class="boxies-cell">' + statusBadge(showroom) + '</div>' +
        '</td>' +
        '<td class="boxies-public-cell boxies-col-public">' +
          '<div class="boxies-cell">' + publicToggle(showroom) + '</div>' +
        '</td>' +
        '<td class="boxies-col-updated">' +
          '<div class="boxies-cell">' + escapeHtml(formatDate(showroom.updated_at)) + '</div>' +
        '</td>' +
        '<td class="table-actions boxies-col-actions">' +
          '<div class="boxies-cell">' +
            '<div class="boxies-row-actions">' +
              '<button type="button" class="boxies-icon-action" data-boxies-open-builder-id="' +
                escapeHtml(id) +
              '" data-boxies-open-builder="' +
                escapeHtml(slug) +
              '" data-tooltip="Administrar" aria-label="Administrar">' + ICONS.edit + '</button>' +
              '<button type="button" class="boxies-icon-action" data-boxies-preview-slug="' +
                escapeHtml(slug) +
              '" data-tooltip="Vista previa" aria-label="Vista previa"' +
              (slug ? '' : ' disabled') +
              '>' + ICONS.eye + '</button>' +
              '<button type="button" class="boxies-icon-action" data-boxies-clone-id="' +
                escapeHtml(id) +
              '" data-tooltip="Clonar" aria-label="Clonar">' + ICONS.copy + '</button>' +
              '<button type="button" class="boxies-icon-action boxies-icon-action--danger" data-boxies-delete-id="' +
                escapeHtml(id) +
              '" data-boxies-delete-name="' +
                escapeHtml(name) +
              '" data-tooltip="Eliminar" aria-label="Eliminar">' + ICONS.trash + '</button>' +
            '</div>' +
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
      'data-tooltip',
      isPublic ? 'Público — visible en landing' : 'Privado — oculto del landing'
    );
    btn.removeAttribute('title');
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

  function resolveShowroomPreviewUrl(slug) {
    if (typeof BoxiesShell !== 'undefined' && typeof BoxiesShell.resolvePreviewUrl === 'function') {
      return BoxiesShell.resolvePreviewUrl(slug);
    }
    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.showroomUrl) {
      return PlatformBuilderBridge.showroomUrl(slug);
    }
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
      return ShowroomPublicUrl.href(slug);
    }
    if (slug) {
      try {
        return new URL('/' + encodeURIComponent(slug), window.location.origin).href;
      } catch (e) {}
    }
    return window.location.origin + '/';
  }

  function bindOpenBuilder(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-open-builder-id]');
      if (!btn || !host.contains(btn)) return;
      e.preventDefault();
      handleOpenBuilder(
        btn.getAttribute('data-boxies-open-builder-id'),
        btn.getAttribute('data-boxies-open-builder')
      );
    });
  }

  function bindPreview(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-preview-slug]');
      if (!btn || !host.contains(btn) || btn.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      var slug = (btn.getAttribute('data-boxies-preview-slug') || '').trim();
      if (!slug) return;
      window.open(resolveShowroomPreviewUrl(slug), '_blank', 'noopener,noreferrer');
    });
  }

  function openBuilder(projectId, slug, experienceType) {
    var type = experienceType || activeExperienceType;
    var page =
      typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getBuilderPage
        ? BoxiesExperienceTypes.getBuilderPage(type)
        : 'builder';
    return BoxiesRouter.navigate(page, {
      projectId: projectId || null,
      project: slug || null
    });
  }

  async function handleOpenBuilder(projectId, slug) {
    if ((!projectId && !slug) || isCreatingShowroom || isDeletingShowroom) return;
    if (hasPendingCreate() || hasPendingOpen()) return;
    showOpenBusy();
    markPendingOpen(projectId);
    try {
      await openBuilder(projectId, slug);
      /* Builder should clear pending; backup if still set. */
      if (hasPendingOpen()) finishPendingOpenBusy();
    } catch (err) {
      clearPendingOpen();
      hideGlobalBusy();
      notifyError(
        (err && err.message) || 'No se pudo abrir la configuración del showroom.'
      );
    }
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

  function showGlobalBusy(message) {
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy(message);
      return;
    }
  }

  function hideGlobalBusy() {
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
      AdminUI.hideGlobalBusy();
    }
  }

  /* V5.9.37 aliases — same global operation loader */
  function showCreateBusy() {
    document.body.classList.add('boxies-is-creating-showroom');
    var label =
      typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getCreateBusyLabel
        ? BoxiesExperienceTypes.getCreateBusyLabel(activeExperienceType)
        : ('Creando ' + String((experienceMeta(activeExperienceType).singular || 'experiencia')).toLowerCase());
    showGlobalBusy(label);
  }

  function hideCreateBusy() {
    hideGlobalBusy();
  }

  function markPendingCreate(projectId) {
    try {
      sessionStorage.setItem(
        PENDING_CREATE_KEY,
        JSON.stringify({ projectId: String(projectId || ''), t: Date.now() })
      );
    } catch (e) {}
    window.__BOXIES_PENDING_CREATE__ = true;
  }

  function clearPendingCreate() {
    try {
      sessionStorage.removeItem(PENDING_CREATE_KEY);
    } catch (e) {}
    window.__BOXIES_PENDING_CREATE__ = false;
  }

  function hasPendingCreate() {
    if (window.__BOXIES_PENDING_CREATE__) return true;
    try {
      var raw = sessionStorage.getItem(PENDING_CREATE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.t || Date.now() - data.t > 120000) {
        clearPendingCreate();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function finishPendingCreateBusy() {
    if (!hasPendingCreate()) return;
    clearPendingCreate();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hideCreateBusy();
      });
    });
  }

  /* V5.9.41 — edit → builder uses the same global busy overlay */
  function showOpenBusy() {
    var label =
      typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getOpenBusyLabel
        ? BoxiesExperienceTypes.getOpenBusyLabel(activeExperienceType)
        : 'Cargando showroom';
    showGlobalBusy(label);
  }

  function markPendingOpen(projectId) {
    try {
      sessionStorage.setItem(
        PENDING_OPEN_KEY,
        JSON.stringify({ projectId: String(projectId || ''), t: Date.now() })
      );
    } catch (e) {}
    window.__BOXIES_PENDING_OPEN__ = true;
  }

  function clearPendingOpen() {
    try {
      sessionStorage.removeItem(PENDING_OPEN_KEY);
    } catch (e) {}
    window.__BOXIES_PENDING_OPEN__ = false;
  }

  function hasPendingOpen() {
    if (window.__BOXIES_PENDING_OPEN__) return true;
    try {
      var raw = sessionStorage.getItem(PENDING_OPEN_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.t || Date.now() - data.t > 120000) {
        clearPendingOpen();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function finishPendingOpenBusy() {
    if (!hasPendingOpen()) return;
    clearPendingOpen();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hideGlobalBusy();
      });
    });
  }

  function syncCreateButtonLabel(btn) {
    var el = btn || document.getElementById('boxiesCreateShowroomBtn');
    if (!el) return;
    var meta = experienceMeta(activeExperienceType);
    var label = meta.createLabel || '+ Nuevo Showroom';
    el.disabled = false;
    el.dataset.busy = '0';
    el.removeAttribute('aria-disabled');
    el.classList.remove('is-creating');
    el.setAttribute('aria-label', label);
    el.setAttribute('data-tooltip', label);
    el.textContent = label;
  }

  function resetCreateButton(btn) {
    syncCreateButtonLabel(btn);
  }

  async function refreshShowroomsList() {
    var tbody = document.getElementById('boxiesProjectsBody');
    if (!tbody) return [];
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined') {
      throw new Error('API de Experiencias no disponible');
    }
    var scope =
      typeof BoxiesShowroomScope !== 'undefined'
        ? BoxiesShowroomScope.getViewerContext()
        : null;
    var meta = experienceMeta(activeExperienceType);
    var showrooms = await BoxiesAdmin2ProjectsApi.list({
      scope: scope,
      experienceType: activeExperienceType
    });
    if (!showrooms || !showrooms.length) {
      tbody.innerHTML =
        '<tr><td colspan="7">' + escapeHtml(meta.emptyMessage || 'Sin experiencias.') + '</td></tr>';
      if (columnController) columnController.relayout();
      return [];
    }
    tbody.innerHTML = showrooms.map(row).join('');
    bindDragAndDrop(tbody);
    if (columnController) columnController.relayout();
    try {
      if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.syncAllShowrooms) {
        BunnyMediaApi.syncAllShowrooms().then(function (res) {
          try {
            console.log('[BunnyMedia] sync_all_showrooms', res);
          } catch (e) {}
        }).catch(function (err) {
          try {
            console.warn('[BunnyMedia] sync_all_showrooms failed', err);
          } catch (e2) {}
        });
      }
    } catch (e) {}
    return showrooms;
  }

  function listContainsShowroom(list, projectId) {
    if (!projectId || !list || !list.length) return false;
    var id = String(projectId);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === id) return true;
    }
    return !!document.querySelector(
      '#boxiesProjectsBody tr[data-showroom-id="' + id.replace(/"/g, '') + '"]'
    );
  }

  async function handleCreateShowroom(btn) {
    if (!btn || isCreatingShowroom || isDeletingShowroom || btn.dataset.busy === '1') return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.createFromTemplate !== 'function') {
      notifyError('API de creación no disponible');
      return;
    }
    var meta = experienceMeta(activeExperienceType);
    isCreatingShowroom = true;
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    btn.classList.add('is-creating');
    showCreateBusy();
    try {
      var scope =
        typeof BoxiesShowroomScope !== 'undefined'
          ? BoxiesShowroomScope.getViewerContext()
          : null;
      var project = await BoxiesAdmin2ProjectsApi.createFromTemplate({
        scope: scope,
        experienceType: activeExperienceType
      });
      var list = await refreshShowroomsList();
      if (!listContainsShowroom(list, project && project.id)) {
        list = await refreshShowroomsList();
      }
      if (!listContainsShowroom(list, project && project.id)) {
        throw new Error(
          'La experiencia se creó pero no aparece en la lista. Recarga e inténtalo de nuevo.'
        );
      }
      try {
        if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.syncAllShowrooms) {
          BunnyMediaApi.syncAllShowrooms().catch(function () {});
        }
      } catch (e) {}
      markPendingCreate(project.id);
      syncCreateButtonLabel(btn);
      isCreatingShowroom = false;
      try {
        await openBuilder(project.id, project.slug);
        if (hasPendingCreate()) finishPendingCreateBusy();
      } catch (navErr) {
        clearPendingCreate();
        hideCreateBusy();
        notifyError(
          (navErr && navErr.message) ||
            meta.singular + ' creada, pero no se pudo abrir la configuración.'
        );
      }
    } catch (err) {
      clearPendingCreate();
      hideCreateBusy();
      notifyError(err.message || 'No se pudo crear la experiencia');
      syncCreateButtonLabel(btn);
      isCreatingShowroom = false;
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
      notifySuccess('Experiencia clonada');
      openBuilder(project.id, project.slug);
    } catch (err) {
      notifyError(err.message || 'No se pudo clonar la experiencia');
      btn.disabled = false;
      btn.classList.remove('is-busy-label');
      btn.innerHTML = prevHtml;
      btn.dataset.busy = '0';
    }
  }

  async function handleDeleteShowroom(btn) {
    if (!btn || isDeletingShowroom || isCreatingShowroom || btn.dataset.busy === '1') return;
    var projectId = btn.getAttribute('data-boxies-delete-id');
    var name = btn.getAttribute('data-boxies-delete-name') || 'esta experiencia';
    if (!projectId) return;
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
        typeof BoxiesAdmin2ProjectsApi.remove !== 'function') {
      notifyError('API de eliminación no disponible');
      return;
    }
    if (typeof AdminUI === 'undefined' || typeof AdminUI.confirm !== 'function') {
      notifyError('Modal de confirmación no disponible');
      return;
    }

    var ok = await AdminUI.confirm({
      title: 'Eliminar experiencia',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      bodyHtml:
        '<p class="admin-modal-copy">¿Eliminar «' + escapeHtml(name) + '»?</p>' +
        '<p class="admin-modal-copy admin-modal-copy--muted">Esta acción no se puede deshacer.</p>'
    });
    if (!ok) return;

    isDeletingShowroom = true;
    btn.dataset.busy = '1';
    btn.disabled = true;
    showGlobalBusy('Eliminando experiencia');
    try {
      await BoxiesAdmin2ProjectsApi.remove(projectId);
      var list = await refreshShowroomsList();
      if (listContainsShowroom(list, projectId)) {
        list = await refreshShowroomsList();
      }
      if (listContainsShowroom(list, projectId)) {
        throw new Error('La experiencia no se eliminó de la lista. Recarga e inténtalo de nuevo.');
      }
      hideGlobalBusy();
      isDeletingShowroom = false;
    } catch (err) {
      hideGlobalBusy();
      notifyError(err.message || 'No se pudo eliminar la experiencia');
      btn.disabled = false;
      btn.dataset.busy = '0';
      isDeletingShowroom = false;
      try {
        await refreshShowroomsList();
      } catch (_refreshErr) { /* keep previous UI */ }
    }
  }

  function bindShowroomActions(host) {
    host.addEventListener('click', function (e) {
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

  function renderExperienceTabs() {
    var types =
      typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.list
        ? BoxiesExperienceTypes.list()
        : [{ id: 'showroom', tabLabel: 'SHOWROOMS' }];
    return (
      '<nav class="boxies-experience-tabs" role="tablist" aria-label="Tipos de experiencia">' +
        types
          .map(function (t) {
            var active = t.id === activeExperienceType;
            return (
              '<button type="button" class="boxies-experience-tab' +
                (active ? ' is-active' : '') +
                '" role="tab" aria-selected="' +
                (active ? 'true' : 'false') +
                '" data-experience-type="' +
                escapeHtml(t.id) +
                '">' +
                escapeHtml(t.tabLabel) +
              '</button>'
            );
          })
          .join('') +
      '</nav>'
    );
  }

  async function setActiveExperienceType(typeId, opts) {
    opts = opts || {};
    activeExperienceType = resolveActiveType(typeId);
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.setActive) {
      BoxiesExperienceTypes.setActive(activeExperienceType);
    }
    var host = document.getElementById('boxiesContent');
    if (host) {
      host.querySelectorAll('[data-experience-type]').forEach(function (btn) {
        var on = btn.getAttribute('data-experience-type') === activeExperienceType;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    syncCreateButtonLabel();
    if (opts.skipRefresh) return;
    await refreshShowroomsList();
  }

  function bindExperienceTabs(host) {
    host.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-experience-type]');
      if (!tab || !host.contains(tab)) return;
      e.preventDefault();
      var next = tab.getAttribute('data-experience-type');
      if (!next || next === activeExperienceType) return;
      setActiveExperienceType(next).catch(function (err) {
        notifyError((err && err.message) || 'No se pudo filtrar experiencias');
      });
    });
  }

  function bindCreateDockButton() {
    var btn = document.getElementById('boxiesCreateShowroomBtn');
    if (!btn || btn.dataset.boundCreate === '1') return;
    btn.dataset.boundCreate = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      handleCreateShowroom(btn);
    });
  }

  function installCreateDockAction() {
    if (typeof BoxiesShell === 'undefined' || typeof BoxiesShell.applyManifest !== 'function') {
      return;
    }
    var meta = experienceMeta(activeExperienceType);
    var label = meta.createLabel || '+ Nuevo Showroom';
    BoxiesShell.applyManifest({
      leadingHtml:
        '<button type="button" class="boxies-btn-secondary boxies-btn-secondary--create" id="boxiesCreateShowroomBtn"' +
          ' aria-label="' +
          escapeHtml(label) +
          '" data-tooltip="' +
          escapeHtml(label) +
          '">' +
          escapeHtml(label) +
        '</button>'
    });
    bindCreateDockButton();
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
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getActive) {
      activeExperienceType = BoxiesExperienceTypes.getActive();
    } else {
      activeExperienceType = 'showroom';
    }

    host.classList.add('boxies-content--showrooms');
    host.innerHTML =
      '<div class="boxies-page boxies-page--showrooms">' +
        '<header class="boxies-showrooms-header">' +
          '<h1 class="boxies-page__title">Experiencias</h1>' +
          '<p class="boxies-page__desc">Administra las experiencias digitales del proyecto. Cada pestaña filtra por tipo; la estructura, media y hotspots se comparten.</p>' +
          renderExperienceTabs() +
        '</header>' +
        '<p class="boxies-projects-order-status" id="boxiesProjectsOrderStatus" aria-live="polite"></p>' +
        '<div class="boxies-showrooms-body">' +
          '<div class="boxies-showrooms-wrap">' +
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
          '</div>' +
        '</div>' +
      '</div>';

    installCreateDockAction();
    bindExperienceTabs(host);
    bindOpenBuilder(host);
    bindPreview(host);
    bindPublicToggles(host);
    bindShowroomActions(host);
    bindColumnResize(document.getElementById('boxiesShowroomsTable'));

    identityListener = function (ev) {
      patchShowroomRow(ev && ev.detail);
    };
    window.addEventListener('boxies:showroom-identity-changed', identityListener);

    var tbody = document.getElementById('boxiesProjectsBody');
    try {
      await refreshShowroomsList();
      if (typeof BoxiesTooltip !== 'undefined' && typeof BoxiesTooltip.refresh === 'function') {
        BoxiesTooltip.refresh(host);
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7">' +
          escapeHtml(err.message || 'Error cargando experiencias') +
          '</td></tr>';
      }
    }
  }

  function unmount() {
    isCreatingShowroom = false;
    isDeletingShowroom = false;
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.closeModal === 'function') {
      AdminUI.closeModal();
    }
    var host = document.getElementById('boxiesContent');
    if (host) host.classList.remove('boxies-content--showrooms');
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      BoxiesShell.clearPageActions();
    }
    if (identityListener) {
      window.removeEventListener('boxies:showroom-identity-changed', identityListener);
      identityListener = null;
    }
    if (columnController && columnController.destroy) {
      columnController.destroy();
      columnController = null;
    }
    dragState = null;
    columnResizeState = null;
    savingOrder = false;
  }

  return { id: 'projects', title: 'Experiencias', mount: mount, unmount: unmount };
})();
