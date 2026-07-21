var BoxiesAdmin2Settings = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="bx-section-header">' +
        '<h1>Configuración</h1>' +
        '<p>Ajustes globales de BOXIES.</p>' +
      '</div>' +
      '<div class="bx-card bx-empty">' +
        '<h2>Configuración</h2>' +
        '<p>Sección preparada para crecer. Aún no hay opciones disponibles.</p>' +
      '</div>';
  }
  return { render: render };
})();
