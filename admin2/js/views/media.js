var BoxiesAdmin2Media = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-title-row">' +
        '<h1 class="builder-step-title">Media</h1>' +
      '</div>' +
      '<p class="builder-step-desc">Biblioteca de medios de la plataforma.</p>' +
      '<div class="bx-admin-panel" style="padding:20px">' +
        '<div class="placeholder-title">Próximamente</div>' +
        '<p class="placeholder-copy">La biblioteca global de media llegará después. Cada proyecto gestiona sus archivos en el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
