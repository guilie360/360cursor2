/**
 * BOXIES ShowroomsPage — list only fills #boxiesContent.
 * Open builder by permanent projectId (UUID); slug is vanity for display/URL.
 * Order is manual via display_order (drag & drop); identity/publish do not reorder.
 */
var BoxiesProjectsPage = (function () {
  var identityListener = null;
  var dragState = null;
  var savingOrder = false;

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

  function row(showroom) {
    var id = showroom.id || '';
    var slug = showroom.slug || '';
    var name = showroom.nombre || slug || 'Sin nombre';
    return (
      '<tr class="boxies-showroom-row" draggable="true" data-showroom-id="' + escapeHtml(id) + '">' +
        '<td class="boxies-showroom-drag">' +
          '<button type="button" class="boxies-drag-handle" aria-label="Arrastrar para reordenar" title="Arrastrar">' +
            '<span aria-hidden="true">⋮⋮</span>' +
          '</button>' +
        '</td>' +
        '<td><strong class="boxies-showroom-name">' + escapeHtml(name) + '</strong></td>' +
        '<td><code class="boxies-showroom-slug">' + escapeHtml(slug) + '</code></td>' +
        '<td>' + statusBadge(showroom) + '</td>' +
        '<td class="boxies-public-cell">' + publicToggle(showroom) + '</td>' +
        '<td>' + escapeHtml(formatDate(showroom.updated_at)) + '</td>' +
        '<td class="table-actions">' +
          '<button type="button" class="boxies-action-btn" data-boxies-open-builder-id="' +
            escapeHtml(id) +
          '" data-boxies-open-builder="' +
            escapeHtml(slug) +
          '">Administrar</button>' +
          '<button type="button" class="boxies-action-btn" data-boxies-clone-id="' +
            escapeHtml(id) +
          '">Clonar</button>' +
          '<button type="button" class="boxies-action-btn boxies-btn-danger" data-boxies-delete-id="' +
            escapeHtml(id) +
          '" data-boxies-delete-name="' +
            escapeHtml(name) +
          '">Eliminar</button>' +
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
      if (e.target.closest(
        'button.boxies-action-btn, .boxies-public-toggle, [data-boxies-public-id], [data-boxies-clone-id], [data-boxies-delete-id]'
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
      if (!dragState) return;
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
      if (!dragState || !dragState.el) return;
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
    var prev = btn.textContent;
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
      btn.textContent = prev;
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
    if (slugEl && detail.slug) slugEl.textContent = detail.slug;
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
      '<div class="boxies-page">' +
        '<div class="boxies-page__header-row">' +
          '<div>' +
            '<h1 class="boxies-page__title">Showrooms</h1>' +
            '<p class="boxies-page__desc">Administra los Showrooms Digitales de tu empresa. Arrastra las filas para cambiar el orden.</p>' +
          '</div>' +
          '<button type="button" class="boxies-action-btn boxies-btn-primary" id="boxiesCreateShowroomBtn">' +
            '+ Crear Showroom' +
          '</button>' +
        '</div>' +
        '<p class="boxies-projects-order-status" id="boxiesProjectsOrderStatus" aria-live="polite"></p>' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table boxies-showrooms-table">' +
            '<thead><tr>' +
              '<th class="boxies-showroom-drag-th" aria-label="Orden"></th>' +
              '<th>Nombre</th>' +
              '<th>Slug</th>' +
              '<th>Estado</th>' +
              '<th>Público</th>' +
              '<th>Última modificación</th>' +
              '<th></th>' +
            '</tr></thead>' +
            '<tbody id="boxiesProjectsBody"><tr><td colspan="7">Cargando…</td></tr></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    bindOpenBuilder(host);
    bindPublicToggles(host);
    bindShowroomActions(host);
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
    dragState = null;
    savingOrder = false;
  }

  return { id: 'projects', title: 'Showrooms', mount: mount, unmount: unmount };
})();
