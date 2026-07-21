/* BOXIES Global Admin — shell router */
(function () {
  var SECTIONS = {
    dashboard: GlobalAdminDashboardView,
    projects: GlobalAdminProjectsView,
    users: GlobalAdminUsersView,
    templates: GlobalAdminTemplatesView,
    settings: GlobalAdminSettingsView
  };

  var currentSection = 'dashboard';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderUserChip() {
    var chip = document.getElementById('globalUserChip');
    if (!chip) return;
    var profile = AdminState.getProfile();
    if (!profile) {
      chip.textContent = '';
      return;
    }
    var name = profile.nombre || profile.email || 'Admin';
    var role = profile.rol || 'admin';
    chip.innerHTML =
      '<strong>' + escapeHtml(name) + '</strong>' +
      '<span>' + escapeHtml(role) + '</span>';
  }

  function setActiveNav(sectionId) {
    document.querySelectorAll('#globalSidebarNav [data-global-section]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-global-section') === sectionId);
    });
  }

  async function showSection(sectionId) {
    var view = SECTIONS[sectionId] || SECTIONS.dashboard;
    currentSection = SECTIONS[sectionId] ? sectionId : 'dashboard';
    setActiveNav(currentSection);
    var host = document.getElementById('globalAdminContent');
    if (!host) return;
    host.innerHTML = '<div class="panel-card"><p class="admin-muted">Cargando…</p></div>';
    await view.render(host);
  }

  function bindNav() {
    var nav = document.getElementById('globalSidebarNav');
    if (!nav || nav.dataset.bound === '1') return;
    nav.dataset.bound = '1';
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-global-section]');
      if (!btn) return;
      var section = btn.getAttribute('data-global-section');
      showSection(section);
    });
  }

  function bindLogout() {
    var btn = document.getElementById('globalLogoutBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        await AdminAuth.logout();
      } catch (e) {}
      window.location.replace('login.html');
    });
  }

  async function init() {
    var gate = await GlobalAdminAuthGate.init();
    if (!gate || !gate.allowed) return;

    renderUserChip();
    bindNav();
    bindLogout();
    await showSection('dashboard');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
