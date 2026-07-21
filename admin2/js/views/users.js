var BoxiesAdmin2Users = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="builder-step-content">' +
        '<div class="builder-step-title-row">' +
          '<h1 class="builder-step-title">Usuarios</h1>' +
        '</div>' +
        '<p class="builder-step-desc">Cuentas y roles de la plataforma.</p>' +
        '<p class="builder-step-desc">La gestión de usuarios se implementará más adelante. El CMS de cada proyecto sigue siendo el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
