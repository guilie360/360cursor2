var BoxiesAdmin2Settings = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="hall-section-header">' +
        '<h1>Configuración</h1>' +
        '<p>Ajustes globales de BOXIES.</p>' +
      '</div>' +
      '<div class="hall-panel hall-empty">' +
        '<h2>Configuración</h2>' +
        '<p>Sección preparada para crecer. Aún no hay opciones disponibles.</p>' +
      '</div>';
  }
  return { render: render };
})();
