/* BOXIES Global Dashboard — Builder chrome (demo3 parity) */
(function () {
  var SECTIONS = {
    dashboard: BoxiesAdmin2Dashboard,
    projects: BoxiesAdmin2Projects,
    users: BoxiesAdmin2Users,
    templates: BoxiesAdmin2Templates,
    media: BoxiesAdmin2Media,
    settings: BoxiesAdmin2Settings
  };

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
      btn.classList.toggle('active', btn.getAttribute('data-bx-section') === sectionId);
    });
  }

  async function showSection(sectionId) {
    var id = SECTIONS[sectionId] ? sectionId : 'projects';
    setActiveNav(id);
    var host = document.getElementById('bxMain');
    if (!host) return;
    host.innerHTML = '<p class="builder-step-desc">Cargando…</p>';
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
    document.body.classList.add('dashboard-shell');
    setBuilderChrome(true);
    bindShell();
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
