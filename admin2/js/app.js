/* BOXIES Global Admin V2 — app shell */
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
      '<span>' + escapeHtml(roleLabel) + '</span>';
  }

  function setActiveNav(sectionId) {
    document.querySelectorAll('#bxNav [data-bx-section]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-bx-section') === sectionId);
    });
  }

  async function showSection(sectionId) {
    var id = SECTIONS[sectionId] ? sectionId : 'dashboard';
    setActiveNav(id);
    var host = document.getElementById('bxMain');
    if (!host) return;
    host.innerHTML = '<div class="bx-card"><p style="color:var(--bx-muted)">Cargando…</p></div>';
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
        await BoxiesAdmin2Auth.logout();
        logoutBtn.disabled = false;
      });
    }
  }

  async function onAppReady(profile) {
    bindShell();
    renderUserChip(profile);
    await showSection('dashboard');
  }

  async function boot() {
    var result = await BoxiesAdmin2Auth.init(onAppReady);
    if (result && result.state === 'app') {
      /* onAppReady already called from init */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
