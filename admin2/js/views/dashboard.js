var BoxiesAdmin2Dashboard = (function () {
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

  async function render(host) {
    host.innerHTML =
      '<div class="hall-section-header">' +
        '<h1>Dashboard</h1>' +
        '<p>Centro de control de la plataforma BOXIES.</p>' +
      '</div>' +
      '<div class="hall-stat-grid" id="bxStatGrid">' +
        '<div class="hall-panel"><div class="hall-stat-value">…</div><div class="hall-stat-label">Total proyectos</div></div>' +
        '<div class="hall-panel"><div class="hall-stat-value">—</div><div class="hall-stat-label">Usuarios</div></div>' +
        '<div class="hall-panel"><div class="hall-stat-value">—</div><div class="hall-stat-label">Actividad reciente</div></div>' +
        '<div class="hall-panel"><div class="hall-stat-value">OK</div><div class="hall-stat-label">Estado plataforma</div></div>' +
      '</div>';

    try {
      var projects = await BoxiesAdmin2ProjectsApi.list();
      var total = projects ? projects.length : 0;
      var latest = null;
      (projects || []).forEach(function (p) {
        if (p && p.updated_at && (!latest || String(p.updated_at) > String(latest))) {
          latest = p.updated_at;
        }
      });
      var cards = host.querySelectorAll('.hall-panel');
      if (cards[0]) cards[0].querySelector('.hall-stat-value').textContent = String(total);
      if (cards[1]) cards[1].querySelector('.hall-stat-value').textContent = 'Próx.';
      if (cards[2]) {
        var el = cards[2].querySelector('.hall-stat-value');
        el.textContent = formatDate(latest);
        el.style.fontSize = latest ? '1rem' : '1.85rem';
      }
      if (cards[3]) {
        cards[3].querySelector('.hall-stat-value').textContent = 'Operativo';
        cards[3].querySelector('.hall-stat-value').style.fontSize = '1.25rem';
      }
    } catch (err) {
      host.insertAdjacentHTML(
        'beforeend',
        '<p class="auth-modal-message is-error">' + escapeHtml(err.message || 'Error cargando métricas') + '</p>'
      );
    }
  }

  return { render: render };
})();
