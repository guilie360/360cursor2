/* Global Admin — Users stub */
var GlobalAdminUsersView = (function () {
  async function render(host) {
    if (!host) return;
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Usuarios</h1>' +
        '<p>Gestión de cuentas de la plataforma.</p>' +
      '</div>' +
      '<div class="panel-card global-empty-state">' +
        '<h2>Próximamente</h2>' +
        '<p>La administración avanzada de usuarios se implementará en una fase posterior.</p>' +
      '</div>';
  }

  return { render: render };
})();
