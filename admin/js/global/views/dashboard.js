/* Global Admin — Dashboard overview cards */
var GlobalAdminDashboardView = (function () {
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

  async function render(host) {
    if (!host) return;

    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Dashboard</h1>' +
        '<p>Vista global de la plataforma BOXIES.</p>' +
      '</div>' +
      '<div class="global-stat-grid" id="globalStatGrid">' +
        '<div class="panel-card global-stat-card"><div class="global-stat-value">…</div><div class="global-stat-label">Total de proyectos</div></div>' +
        '<div class="panel-card global-stat-card"><div class="global-stat-value">—</div><div class="global-stat-label">Usuarios registrados</div></div>' +
        '<div class="panel-card global-stat-card"><div class="global-stat-value">—</div><div class="global-stat-label">Última actividad</div></div>' +
        '<div class="panel-card global-stat-card"><div class="global-stat-value">OK</div><div class="global-stat-label">Estado del sistema</div></div>' +
      '</div>';

    try {
      var projects = await ProyectosApi.list();
      var total = projects ? projects.length : 0;
      var latest = null;
      (projects || []).forEach(function (p) {
        if (!p || !p.updated_at) return;
        if (!latest || String(p.updated_at) > String(latest)) latest = p.updated_at;
      });

      var cards = host.querySelectorAll('.global-stat-card');
      if (cards[0]) {
        cards[0].querySelector('.global-stat-value').textContent = String(total);
      }
      if (cards[1]) {
        cards[1].querySelector('.global-stat-value').textContent = 'Próx.';
      }
      if (cards[2]) {
        cards[2].querySelector('.global-stat-value').textContent = formatDate(latest);
        cards[2].querySelector('.global-stat-value').style.fontSize = latest ? '18px' : '32px';
      }
      if (cards[3]) {
        cards[3].querySelector('.global-stat-value').textContent = 'Operativo';
        cards[3].querySelector('.global-stat-value').style.fontSize = '22px';
      }
    } catch (err) {
      var grid = document.getElementById('globalStatGrid');
      if (grid) {
        grid.insertAdjacentHTML(
          'beforebegin',
          '<p class="form-message error">' + escapeHtml(err.message || 'No se pudieron cargar las métricas.') + '</p>'
        );
      }
    }
  }

  return { render: render };
})();
