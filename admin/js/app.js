/* Dashboard app entry — wires router, header, and auth */
(function () {
  var SECTIONS = [
    { id: 'overview', label: 'Resumen', group: 'general' },
    { id: 'constructora', label: 'Constructora', group: 'contenido' },
    { id: 'proyectos', label: 'Proyectos', group: 'contenido' },
    { id: 'hero', label: 'Hero', group: 'contenido' },
    { id: 'pause-screen', label: 'Pantalla de pausa', group: 'contenido' },
    { id: 'branding', label: 'Branding', group: 'contenido' },
    { id: 'amenidades', label: 'Amenidades', group: 'contenido' },
    { id: 'avances', label: 'Avance de obra', group: 'contenido' },
    { id: 'tipologias', label: 'Tipologías', group: 'contenido' },
    { id: 'viviendas', label: 'Viviendas', group: 'contenido' },
    { id: 'archivos', label: 'Archivos', group: 'contenido' },
    { id: 'asesores', label: 'Asesores', group: 'equipo' },
    { id: 'leads', label: 'Leads', group: 'equipo' },
    { id: 'visitantes', label: 'Visitantes', group: 'equipo' },
    { id: 'analytics', label: 'Analytics', group: 'equipo' }
  ];

  var IMPLEMENTED_VIEWS = {
    overview: OverviewView,
    proyectos: ProyectosView,
    hero: HeroView,
    'pause-screen': PauseScreenView
  };

  function renderHeader(profile) {
    document.getElementById('userChip').innerHTML =
      'Hola, <strong>' + AdminUI.escapeHtml(profile.nombre || 'Usuario') + '</strong>';
  }

  function renderSidebarNav() {
    var nav = document.getElementById('sidebarNav');
    var groups = {
      general: 'General',
      contenido: 'Contenido',
      equipo: 'Equipo'
    };
    var html = '';
    Object.keys(groups).forEach(function (groupKey) {
      html += '<div class="nav-group-label">' + groups[groupKey] + '</div>';
      SECTIONS.filter(function (s) { return s.group === groupKey; }).forEach(function (section) {
        html += '<button type="button" class="nav-item" data-section="' + section.id + '">' + section.label + '</button>';
      });
    });
    nav.innerHTML = html;
  }

  function registerSections() {
    SECTIONS.forEach(function (section) {
      var view = IMPLEMENTED_VIEWS[section.id];
      if (view) {
        AdminRouter.register(section.id, {
          render: view.render,
          onLeave: view.onLeave || null
        });
        return;
      }

      AdminRouter.register(section.id, {
        render: function (container) {
          container.innerHTML =
            '<div class="section-header">' +
              '<h1>' + section.label + '</h1>' +
              '<p>Módulo pendiente de implementación.</p>' +
            '</div>' +
            '<div class="panel-card placeholder-card">' +
              '<div class="placeholder-title">Próximamente</div>' +
              '<div class="placeholder-copy">Este módulo usará <code>admin/js/api/' + section.id + '.js</code>.</div>' +
            '</div>';
        }
      });
    });
  }

  function bindLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async function () {
      try {
        await AdminAuth.logout();
      } finally {
        window.location.replace('login.html');
      }
    });
  }

  AdminBootstrap.initProtectedPage({
    onReady: async function (auth) {
      renderHeader(auth.profile);
      renderSidebarNav();
      registerSections();
      bindLogout();
      await ProjectSelector.init();

      var nav = document.getElementById('sidebarNav');
      var content = document.getElementById('dashboardContent');
      AdminRouter.bindNavigation(nav, content);
      await AdminRouter.navigate('overview', content);
      nav.querySelector('[data-section="overview"]').classList.add('active');
    }
  });
})();
