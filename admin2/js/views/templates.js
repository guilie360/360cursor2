var BoxiesAdmin2Templates = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-title-row">' +
        '<h1 class="builder-step-title">Plantillas</h1>' +
      '</div>' +
      '<p class="builder-step-desc">Plantillas reutilizables para nuevos proyectos.</p>' +
      '<div class="bx-admin-panel" style="padding:20px">' +
        '<div class="placeholder-title">Próximamente</div>' +
        '<p class="placeholder-copy">Las plantillas se gestionarán desde este panel. Por ahora crea y edita proyectos en el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
