var BoxiesAdmin2Projects = (function () {
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

  function builderHref(project) {
    var id = project && project.id ? String(project.id) : '';
    var slug = project && project.slug ? String(project.slug) : '';
    if (id) {
      var qs = 'page=builder&projectId=' + encodeURIComponent(id);
      if (slug) qs += '&project=' + encodeURIComponent(slug) + '&proyecto=' + encodeURIComponent(slug);
      return '/boxies/?' + qs;
    }
    return '/boxies/?page=projects';
  }

  function row(project) {
    var slug = project.slug || '';
    var name = project.nombre || slug || 'Sin nombre';
    var openHref = builderHref(project);
    return (
      '<tr>' +
        '<td>' +
          '<strong>' + escapeHtml(name) + '</strong>' +
        '</td>' +
        '<td><code>' + escapeHtml(slug) + '</code></td>' +
        '<td>' + statusBadge(project) + '</td>' +
        '<td>' + escapeHtml(formatDate(project.updated_at)) + '</td>' +
        '<td class="table-actions">' +
          '<a class="builder-header-action-btn" href="' + escapeHtml(openHref) + '">Administrar en BOXIES</a>' +
        '</td>' +
      '</tr>'
    );
  }

  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-content">' +
        '<div class="builder-step-title-row">' +
          '<h1 class="builder-step-title">Proyectos</h1>' +
        '</div>' +
        '<p class="builder-step-desc">Adaptador de compatibilidad: abre el Builder canónico en <strong>/boxies</strong> (UUID). No desarrollar features nuevas aquí.</p>' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>Nombre</th>' +
              '<th>Slug</th>' +
              '<th>Estado</th>' +
              '<th>Última modificación</th>' +
              '<th></th>' +
            '</tr></thead>' +
            '<tbody id="bxProjectsBody"><tr><td colspan="5">Cargando…</td></tr></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    var tbody = document.getElementById('bxProjectsBody');
    try {
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

  return { render: render };
})();
