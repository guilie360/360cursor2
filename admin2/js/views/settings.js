var BoxiesAdmin2Settings = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-content">' +
        '<div class="builder-step-title-row">' +
          '<h1 class="builder-step-title">Configuración</h1>' +
        '</div>' +
        '<p class="builder-step-desc">Preferencias globales de BOXIES.</p>' +
        '<p class="builder-step-desc">La configuración de plataforma se añadirá aquí. El tema visual oficial sigue siendo HALL / Style Engine.</p>' +
      '</div>';
  }
  return { render: render };
})();
