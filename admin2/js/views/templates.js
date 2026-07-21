var BoxiesAdmin2Templates = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Plantillas</h1>' +
        '<p>Puntos de partida para nuevos showrooms.</p>' +
      '</div>' +
      '<div class="panel-card placeholder-card">' +
        '<div class="placeholder-title">Plantilla base HALL</div>' +
        '<p class="placeholder-copy">Todo proyecto nuevo nace con HALL. Plantillas adicionales llegarán después.</p>' +
      '</div>';
  }
  return { render: render };
})();
