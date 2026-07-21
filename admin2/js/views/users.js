var BoxiesAdmin2Users = (function () {
  async function render(host) {
    host.innerHTML =
      '<div class="section-header">' +
        '<h1>Usuarios</h1>' +
        '<p>Cuentas y roles de la plataforma.</p>' +
      '</div>' +
      '<div class="panel-card placeholder-card">' +
        '<div class="placeholder-title">Próximamente</div>' +
        '<p class="placeholder-copy">La gestión de usuarios se implementará más adelante. El CMS de cada proyecto sigue siendo el Builder.</p>' +
      '</div>';
  }
  return { render: render };
})();
