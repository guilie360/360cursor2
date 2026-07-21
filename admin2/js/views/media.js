var BoxiesAdmin2Media = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="hall-section-header">' +
        '<h1>Media</h1>' +
        '<p>Biblioteca de archivos de la plataforma.</p>' +
      '</div>' +
      '<div class="hall-panel hall-empty">' +
        '<h2>Próximamente</h2>' +
        '<p>Aquí se administrarán imágenes, videos, PDFs, logos y otros archivos.</p>' +
      '</div>';
  }
  return { render: render };
})();
