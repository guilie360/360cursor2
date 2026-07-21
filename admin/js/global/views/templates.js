/* Global Admin — Templates stub */
var GlobalAdminTemplatesView = (function () {
  async function render(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Plantillas</h1>' +
        '<p>Puntos de partida para nuevos showrooms.</p>' +
      '</div>' +
      '<div class="panel-card global-empty-state">' +
        '<h2>Plantilla Base</h2>' +
        '<p>(En desarrollo) La duplicación de proyectos desde plantillas llegará en la siguiente fase.</p>' +
      '</div>';
  }

  return { render: render };
})();
