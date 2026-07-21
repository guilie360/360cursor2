var BoxiesAdmin2Templates = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="hall-section-header">' +
        '<h1>Plantillas</h1>' +
        '<p>Puntos de partida para nuevos showrooms.</p>' +
      '</div>' +
      '<div class="hall-panel hall-empty">' +
        '<h2>Plantilla Base</h2>' +
        '<p>Todo proyecto nuevo nace con HALL. Las plantillas adicionales llegarán después.</p>' +
      '</div>';
  }
  return { render: render };
})();
