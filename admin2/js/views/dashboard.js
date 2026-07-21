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
      '<div class="builder-step-content">' +
        '<div class="builder-step-title-row">' +
          '<h1 class="builder-step-title">Dashboard Global</h1>' +
        '</div>' +
        '<p class="builder-step-desc">Pantalla inicial de BOXIES. Desde aquí abres el Builder de cada proyecto.</p>' +
        '<ul class="profile-list" id="bxDashSummary">' +
          '<li><span>Proyectos</span><strong id="bxDashTotal">…</strong></li>' +
          '<li><span>Última modificación</span><strong id="bxDashLatest">…</strong></li>' +
          '<li><span>CMS</span><strong>ai-project-builder</strong></li>' +
        '</ul>' +
        '<p class="builder-step-desc" style="margin-top:18px">Usa <strong>Proyectos → Administrar</strong> para abrir el editor oficial del showroom.</p>' +
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
      var totalEl = document.getElementById('bxDashTotal');
      var latestEl = document.getElementById('bxDashLatest');
      if (totalEl) totalEl.textContent = String(total);
      if (latestEl) latestEl.textContent = formatDate(latest);
    } catch (err) {
      host.insertAdjacentHTML(
        'beforeend',
        '<p class="admin-form-message error">' + escapeHtml(err.message || 'Error') + '</p>'
      );
    }
  }

  return { render: render };
})();
