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

  function badge(project) {
    if (project.publicado) {
      return '<span class="bx-badge is-live">Publicado</span>';
    }
    return '<span class="bx-badge is-draft">' + escapeHtml(project.estado || 'borrador') + '</span>';
  }

  function openModal() {
    var modal = document.getElementById('bxComingSoonModal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    var modal = document.getElementById('bxComingSoonModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function bindModal() {
    var modal = document.getElementById('bxComingSoonModal');
    var closeBtn = document.getElementById('bxComingSoonClose');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', closeModal);
    }
    if (modal && !modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  function row(project) {
    var slug = project.slug || '';
    var name = project.nombre || slug || 'Sin nombre';
    var editHref = '../admin/dashboard.html?proyecto=' + encodeURIComponent(slug);
    return (
      '<tr>' +
        '<td><span class="bx-project-name">' + escapeHtml(name) + '</span>' +
          '<span class="bx-project-slug">' + escapeHtml(slug) + '</span></td>' +
        '<td>' + badge(project) + '</td>' +
        '<td><code>/' + escapeHtml(slug) + '</code></td>' +
        '<td>' + escapeHtml(formatDate(project.updated_at)) + '</td>' +
        '<td><a class="bx-btn bx-btn-ghost bx-btn-compact" href="' + escapeHtml(editHref) + '">Editar</a></td>' +
      '</tr>'
    );
  }

  async function render(host) {
    bindModal();
    host.innerHTML =
      '<div class="bx-toolbar">' +
        '<div class="bx-section-header" style="margin:0">' +
          '<h1>Proyectos</h1>' +
          '<p>Showrooms administrados en BOXIES.</p>' +
        '</div>' +
        '<button type="button" class="bx-btn bx-btn-primary bx-btn-compact" id="bxNewProjectBtn">+ Nuevo Proyecto</button>' +
      '</div>' +
      '<div class="bx-card bx-card-flush">' +
        '<div class="bx-table-wrap">' +
          '<table class="bx-table">' +
            '<thead><tr>' +
              '<th>Proyecto</th><th>Estado</th><th>URL pública</th><th>Última modificación</th><th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody id="bxProjectsBody"><tr><td colspan="5">Cargando…</td></tr></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    var newBtn = document.getElementById('bxNewProjectBtn');
    if (newBtn) newBtn.addEventListener('click', openModal);

    var tbody = document.getElementById('bxProjectsBody');
    try {
      var projects = await ProyectosApi.list();
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
