/**
 * BOXIES ShowroomsPage — list only fills #boxiesContent.
 * "Administrar" → BoxiesRouter.navigate('builder', { project }) — same Shell.
 * Data model remains proyectos; visible term is Showroom.
 */
var BoxiesProjectsPage = (function () {
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
    var slug = showroom.slug || '';
    var name = showroom.nombre || slug || 'Sin nombre';
    return (
      '<tr>' +
        '<td><strong>' + escapeHtml(name) + '</strong></td>' +
        '<td><code>' + escapeHtml(slug) + '</code></td>' +
        '<td>' + statusBadge(showroom) + '</td>' +
        '<td>' + escapeHtml(formatDate(showroom.updated_at)) + '</td>' +
        '<td class="table-actions">' +
          '<button type="button" class="boxies-action-btn" data-boxies-open-builder="' +
            escapeHtml(slug) +
          '">Administrar</button>' +
        '</td>' +
      '</tr>'
    );
  }

  function bindOpenBuilder(host) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-boxies-open-builder]');
      if (!btn) return;
      e.preventDefault();
      var slug = btn.getAttribute('data-boxies-open-builder');
      if (!slug) return;
      BoxiesRouter.navigate('builder', { project: slug });
    });
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

  function unmount() {}

  return { id: 'projects', title: 'Showrooms', mount: mount, unmount: unmount };
})();
