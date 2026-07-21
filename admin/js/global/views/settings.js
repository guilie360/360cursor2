/* Global Admin — Settings stub */
var GlobalAdminSettingsView = (function () {
  async function render(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Configuración</h1>' +
        '<p>Ajustes globales de BOXIES.</p>' +
      '</div>' +
      '<div class="panel-card global-empty-state">' +
        '<h2>Configuración</h2>' +
        '<p>Esta sección está preparada para crecer. Aún no hay opciones disponibles.</p>' +
      '</div>';
  }

  return { render: render };
})();
