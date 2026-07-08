/* Dashboard overview section — Phase 3 placeholder */
var OverviewView = (function () {
  function renderProfileSummary(profile) {
    var constructora = profile.constructoras || {};
    return [
      ['Nombre', profile.nombre || '—'],
      ['Correo', profile.email || '—'],
      ['Rol', ROL_LABELS[profile.rol] || profile.rol || '—'],
      ['Constructora', constructora.nombre || '—'],
      ['Estado', profile.estado === 'activo' ? 'Activo' : profile.estado]
    ];
  }

  async function render(container) {
    var profile = AdminState.getProfile();
    var rows = renderProfileSummary(profile);

    container.innerHTML =
      '<div class="section-header">' +
        '<h1>Resumen</h1>' +
        '<p>Bienvenido al panel administrativo de 360 PREVENTA.</p>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-card-title">Tu sesión</div>' +
        '<ul class="profile-list">' +
          rows.map(function (row) {
            return '<li><span>' + row[0] + '</span><strong>' + row[1] + '</strong></li>';
          }).join('') +
        '</ul>' +
        '<div class="phase-note">Selecciona un módulo en el menú lateral. Los CRUD se conectarán en la Fase 4.</div>' +
      '</div>';
  }

  return { render: render };
})();
