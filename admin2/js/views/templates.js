var BoxiesAdmin2Templates = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="bx-section-header">' +
        '<h1>Plantillas</h1>' +
        '<p>Puntos de partida para nuevos showrooms.</p>' +
      '</div>' +
      '<div class="bx-card bx-empty">' +
        '<h2>Plantilla Base</h2>' +
        '<p>(En desarrollo) Aquí vivirá la plantilla base de BOXIES.</p>' +
      '</div>';
  }
  return { render: render };
})();
