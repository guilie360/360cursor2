/**
 * BOXIES ProjectsPage — list only fills #boxiesContent.
 * "Administrar" → BoxiesRouter.navigate('builder', { project }) — same Shell.
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

  function statusBadge(project) {
    if (project.publicado) {
      return '<span class="admin-badge badge-success">Publicado</span>';
    }
    var estado = project.estado || 'borrador';
    return '<span class="admin-badge badge-muted">' + escapeHtml(estado) + '</span>';
  }

  function row(project) {
    var slug = project.slug || '';
    var name = project.nombre || slug || 'Sin nombre';
    return (
      '<tr>' +
        '<td><strong>' + escapeHtml(name) + '</strong></td>' +
        '<td><code>' + escapeHtml(slug) + '</code></td>' +
        '<td>' + statusBadge(project) + '</td>' +
        '<td>' + escapeHtml(formatDate(project.updated_at)) + '</td>' +
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
    host.innerHTML =
      '<div class="boxies-page">' +
        '<h1 class="boxies-page__title">Proyectos</h1>' +
        '<p class="boxies-page__desc">Abre el Builder dentro de BOXIES. El Shell no se recarga.</p>' +
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
        throw new Error('Projects API no disponible');
      }
      var projects = await BoxiesAdmin2ProjectsApi.list();
      if (!projects || !projects.length) {
        tbody.innerHTML = '<tr><td colspan="5">No hay proyectos registrados.</td></tr>';
        return;
      }
      tbody.innerHTML = projects.map(row).join('');
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="5">' + escapeHtml(err.message || 'Error cargando proyectos') + '</td></tr>';
    }
  }

  function unmount() {}

  return { id: 'projects', title: 'Proyectos', mount: mount, unmount: unmount };
})();
