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
      '<div class="bx-section-header">' +
        '<h1>Dashboard</h1>' +
        '<p>Centro de control de la plataforma BOXIES.</p>' +
      '</div>' +
      '<div class="bx-stat-grid" id="bxStatGrid">' +
        '<div class="bx-card"><div class="bx-stat-value">…</div><div class="bx-stat-label">Total proyectos</div></div>' +
        '<div class="bx-card"><div class="bx-stat-value">—</div><div class="bx-stat-label">Usuarios</div></div>' +
        '<div class="bx-card"><div class="bx-stat-value">—</div><div class="bx-stat-label">Actividad reciente</div></div>' +
        '<div class="bx-card"><div class="bx-stat-value">OK</div><div class="bx-stat-label">Estado plataforma</div></div>' +
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
      var cards = host.querySelectorAll('.bx-card');
      if (cards[0]) cards[0].querySelector('.bx-stat-value').textContent = String(total);
      if (cards[1]) cards[1].querySelector('.bx-stat-value').textContent = 'Próx.';
      if (cards[2]) {
        var el = cards[2].querySelector('.bx-stat-value');
        el.textContent = formatDate(latest);
        el.style.fontSize = latest ? '16px' : '30px';
      }
      if (cards[3]) {
        cards[3].querySelector('.bx-stat-value').textContent = 'Operativo';
        cards[3].querySelector('.bx-stat-value').style.fontSize = '20px';
      }
    } catch (err) {
      host.insertAdjacentHTML(
        'beforeend',
        '<p class="bx-form-message error">' + escapeHtml(err.message || 'Error cargando métricas') + '</p>'
      );
    }
  }

  return { render: render };
})();
