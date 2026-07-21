var BoxiesAdmin2Users = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="bx-section-header">' +
        '<h1>Usuarios</h1>' +
        '<p>Cuentas y roles de la plataforma.</p>' +
      '</div>' +
      '<div class="bx-card bx-empty">' +
        '<h2>Próximamente</h2>' +
        '<p>La gestión de usuarios se implementará en una fase posterior.</p>' +
      '</div>';
  }
  return { render: render };
})();
