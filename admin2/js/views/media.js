var BoxiesAdmin2Media = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Media</h1>' +
        '<p>Biblioteca de archivos de la plataforma.</p>' +
      '</div>' +
      '<div class="panel-card placeholder-card">' +
        '<div class="placeholder-title">Próximamente</div>' +
        '<p class="placeholder-copy">Los archivos de cada proyecto se gestionan hoy dentro del Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
