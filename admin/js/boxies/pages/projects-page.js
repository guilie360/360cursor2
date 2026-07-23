/**
 * BOXIES ShowroomsPage — list only fills #boxiesContent.
 * Open builder by permanent projectId (UUID); slug is vanity for display/URL.
 */
var BoxiesProjectsPage = (function () {
  var identityListener = null;

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

  function row(showroom) {
    var id = showroom.id || '';
    var slug = showroom.slug || '';
    var name = showroom.nombre || slug || 'Sin nombre';
    return (
      '<tr data-showroom-id="' + escapeHtml(id) + '">' +
        '<td><strong class="boxies-showroom-name">' + escapeHtml(name) + '</strong></td>' +
        '<td><code class="boxies-showroom-slug">' + escapeHtml(slug) + '</code></td>' +
        '<td>' + statusBadge(showroom) + '</td>' +
        '<td>' + escapeHtml(formatDate(showroom.updated_at)) + '</td>' +
        '<td class="table-actions">' +
          '<button type="button" class="boxies-action-btn" data-boxies-open-builder-id="' +
            escapeHtml(id) +
          '" data-boxies-open-builder="' +
            escapeHtml(slug) +
          '">Administrar</button>' +
        '</td>' +
      '</tr>'
    );
  }

  function bindOpenBuilder(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-open-builder-id], [data-boxies-open-builder]');
      if (!btn) return;
      e.preventDefault();
      var projectId = btn.getAttribute('data-boxies-open-builder-id');
      var slug = btn.getAttribute('data-boxies-open-builder');
      if (!projectId && !slug) return;
      BoxiesRouter.navigate('builder', {
        projectId: projectId || null,
        project: slug || null
      });
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
  }

  async function mount(host) {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    host.innerHTML =
      '<div class="boxies-page">' +
        '<h1 class="boxies-page__title">Showrooms</h1>' +
        '<p class="boxies-page__desc">Administra los Showrooms Digitales de tu empresa.</p>' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>Nombre</th>' +
              '<th>Slug</th>' +
              '<th>Estado</th>' +
              '<th>Última modificación</th>' +
              '<th></th>' +
            '</tr></thead>' +
            '<tbody id="boxiesProjectsBody"><tr><td colspan="5">Cargando…</td></tr></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    bindOpenBuilder(host);
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
        tbody.innerHTML = '<tr><td colspan="5">No hay showrooms registrados.</td></tr>';
        return;
      }
      tbody.innerHTML = showrooms.map(row).join('');
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="5">' + escapeHtml(err.message || 'Error cargando showrooms') + '</td></tr>';
    }
  }

  function unmount() {
    if (identityListener) {
      window.removeEventListener('boxies:showroom-identity-changed', identityListener);
      identityListener = null;
    }
  }

  return { id: 'projects', title: 'Showrooms', mount: mount, unmount: unmount };
})();
