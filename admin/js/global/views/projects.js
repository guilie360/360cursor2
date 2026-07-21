/* Global Admin — Projects table + coming-soon create modal */
var GlobalAdminProjectsView = (function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      var date = new Date(value);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
  }

  function statusBadge(project) {
    if (project.publicado) {
      return '<span class="global-badge is-published">Publicado</span>';
    }
    var estado = String(project.estado || 'borrador');
    return '<span class="global-badge is-draft">' + escapeHtml(estado) + '</span>';
  }

  function openComingSoonModal() {
    var modal = document.getElementById('globalComingSoonModal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeComingSoonModal() {
    var modal = document.getElementById('globalComingSoonModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function bindComingSoonModal() {
    var modal = document.getElementById('globalComingSoonModal');
    var closeBtn = document.getElementById('globalComingSoonCloseBtn');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', closeComingSoonModal);
    }
    if (modal && !modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeComingSoonModal();
      });
    }
  }

  function rowHtml(project) {
    var slug = project.slug || '';
    var name = project.nombre || slug || 'Sin nombre';
    var editHref = 'dashboard.html?proyecto=' + encodeURIComponent(slug);
    return (
      '<tr>' +
        '<td>' +
          '<span class="global-project-name">' + escapeHtml(name) + '</span>' +
          '<span class="global-project-slug">' + escapeHtml(slug) + '</span>' +
        '</td>' +
        '<td>' + statusBadge(project) + '</td>' +
        '<td><code>/' + escapeHtml(slug) + '</code></td>' +
        '<td>' + escapeHtml(formatDate(project.updated_at)) + '</td>' +
        '<td>' +
          '<a class="btn-ghost btn-compact" href="' + escapeHtml(editHref) + '">Editar</a>' +
        '</td>' +
      '</tr>'
    );
  }

  async function render(host) {
    if (!host) return;
    bindComingSoonModal();

    host.innerHTML =
      '<div class="global-section-toolbar">' +
        '<div>' +
          '<h1>Proyectos</h1>' +
          '<p>Todos los showrooms de la plataforma.</p>' +
        '</div>' +
        '<button type="button" class="btn-primary btn-compact" id="globalNewProjectBtn">+ Nuevo Proyecto</button>' +
      '</div>' +
      '<div class="panel-card panel-card-flush">' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table" id="globalProjectsTable">' +
            '<thead>' +
              '<tr>' +
                '<th>Proyecto</th>' +
                '<th>Estado</th>' +
                '<th>Dominio</th>' +
                '<th>Última modificación</th>' +
                '<th>Acciones</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody id="globalProjectsTbody">' +
              '<tr><td colspan="5">Cargando proyectos…</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    var newBtn = document.getElementById('globalNewProjectBtn');
    if (newBtn) {
      newBtn.addEventListener('click', openComingSoonModal);
    }

    var tbody = document.getElementById('globalProjectsTbody');
    try {
      var projects = await ProyectosApi.list();
      if (!projects || !projects.length) {
        tbody.innerHTML = '<tr><td colspan="5">No hay proyectos registrados.</td></tr>';
        return;
      }
      tbody.innerHTML = projects.map(rowHtml).join('');
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="5">' +
          escapeHtml(err.message || 'No se pudieron cargar los proyectos.') +
        '</td></tr>';
    }
  }

  return {
    render: render,
    openComingSoonModal: openComingSoonModal,
    closeComingSoonModal: closeComingSoonModal
  };
})();
