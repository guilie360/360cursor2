var BoxiesAdmin2Settings = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Configuración</h1>' +
        '<p>Ajustes globales de BOXIES.</p>' +
      '</div>' +
      '<div class="panel-card placeholder-card">' +
        '<div class="placeholder-title">Configuración</div>' +
        '<p class="placeholder-copy">Sin opciones globales aún. La configuración por proyecto vive en el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
