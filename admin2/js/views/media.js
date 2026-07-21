var BoxiesAdmin2Media = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-content">' +
        '<div class="builder-step-title-row">' +
          '<h1 class="builder-step-title">Media</h1>' +
        '</div>' +
        '<p class="builder-step-desc">Biblioteca de medios de la plataforma.</p>' +
        '<p class="builder-step-desc">La biblioteca global de media llegará después. Cada proyecto gestiona sus archivos en el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
