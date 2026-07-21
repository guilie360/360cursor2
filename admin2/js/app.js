/* BOXIES Global Dashboard — uses official BoxiesAppShell (Builder template) */
(function () {
  var SECTIONS = {
    dashboard: BoxiesAdmin2Dashboard,
    projects: BoxiesAdmin2Projects,
    users: BoxiesAdmin2Users,
    templates: BoxiesAdmin2Templates,
    media: BoxiesAdmin2Media,
    settings: BoxiesAdmin2Settings
  };

  var shellMounted = false;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setBuilderChrome(on) {
    document.body.classList.toggle('platform-builder-shell', !!on);
    document.body.classList.toggle('builder-has-dock', !!on);
    document.documentElement.classList.toggle('builder-has-dock', !!on);
  }

  function railHtml() {
    function item(section, label, current) {
      return (
        '<button type="button" class="builder-rail-item' + (current ? ' is-current' : '') + '" data-bx-section="' + section + '">' +
          '<span class="builder-rail-row">' +
            '<span class="builder-rail-mark" aria-hidden="true"></span>' +
            escapeHtml(label) +
          '</span>' +
        '</button>'
      );
    }
    return (
      '<nav class="bx-rail-nav" id="bxNav" aria-label="Navegación">' +
        '<div class="bx-rail-group">Plataforma</div>' +
        item('dashboard', 'Dashboard Global', false) +
        item('projects', 'Proyectos', true) +
        '<div class="bx-rail-group">Próximamente</div>' +
        item('users', 'Usuarios', false) +
        item('templates', 'Plantillas', false) +
        item('media', 'Media', false) +
        item('settings', 'Configuración', false) +
      '</nav>'
    );
  }

  function mountShell() {
    if (shellMounted) return;
    var host = document.getElementById('bxAppView');
    if (!host || typeof BoxiesAppShell === 'undefined') {
      console.error('[admin2] BoxiesAppShell missing');
      return;
    }
    host.innerHTML = BoxiesAppShell.html({
      appId: 'bxBuilderApp',
      title: 'BOXIES',
      leftHtml: '<div class="user-chip bx-admin-user" id="bxUserChip"></div>',
      actionsHtml: '<button type="button" class="builder-header-action-btn" id="bxLogoutBtn">Cerrar sesión</button>',
      railId: 'bxNavRail',
      railHtml: railHtml(),
      includeDock: true
    });
    var app = document.getElementById('bxBuilderApp');
    if (app) app.hidden = false;
    shellMounted = true;
    bindShell();
  }

  function renderUserChip(profile) {
    var chip = document.getElementById('bxUserChip');
    if (!chip) return;
    if (!profile) {
      chip.innerHTML = '';
      return;
    }
    var roleLabel =
      typeof PlatformRoles !== 'undefined'
        ? PlatformRoles.getRoleLabel(profile)
        : (profile.rol || 'admin');
    chip.innerHTML =
      '<strong>' + escapeHtml(profile.nombre || profile.email || 'Admin') + '</strong>' +
      ' · ' + escapeHtml(roleLabel);
  }

  function setActiveNav(sectionId) {
    document.querySelectorAll('#bxNav [data-bx-section]').forEach(function (btn) {
      btn.classList.toggle('is-current', btn.getAttribute('data-bx-section') === sectionId);
    });
  }

  function contentHost() {
    return document.getElementById('builderStepPanel');
  }

  async function showSection(sectionId) {
    var id = SECTIONS[sectionId] ? sectionId : 'projects';
    setActiveNav(id);
    var host = contentHost();
    if (!host) return;
    host.innerHTML = '<div class="builder-step-content"><p class="builder-step-desc">Cargando…</p></div>';
    await SECTIONS[id].render(host);
  }

  function bindShell() {
    var nav = document.getElementById('bxNav');
    if (nav && !nav.dataset.bound) {
      nav.dataset.bound = '1';
      nav.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-bx-section]');
        if (!btn) return;
        showSection(btn.getAttribute('data-bx-section'));
      });
    }

    var logoutBtn = document.getElementById('bxLogoutBtn');
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', async function () {
        logoutBtn.disabled = true;
        setBuilderChrome(false);
        await BoxiesAdmin2Auth.logout();
        logoutBtn.disabled = false;
      });
    }
  }

  async function onAppReady(profile) {
    mountShell();
    setBuilderChrome(true);
    renderUserChip(profile);
    await showSection('projects');
  }

  async function boot() {
    await BoxiesAdmin2Auth.init(onAppReady);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
