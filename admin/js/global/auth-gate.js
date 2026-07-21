/* Global Admin — session + admin role gate */
var GlobalAdminAuthGate = (function () {
  function showForbidden() {
    var gate = document.getElementById('globalAdminGate');
    var app = document.getElementById('globalAdminApp');
    if (app) app.hidden = true;
    if (gate) gate.hidden = false;

    var logoutBtn = document.getElementById('globalForbiddenLogoutBtn');
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', async function () {
        try {
          await AdminAuth.logout();
        } catch (e) {}
        window.location.replace('login.html');
      });
    }
  }

  function showApp() {
    var gate = document.getElementById('globalAdminGate');
    var app = document.getElementById('globalAdminApp');
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
  }

  async function init() {
    AdminBootstrap.initSdk();
    var auth = await AdminAuth.requireAuth();
    if (!auth) return null;

    AdminAuth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
      }
    });

    if (!AdminState.isAdmin()) {
      showForbidden();
      return { auth: auth, allowed: false };
    }

    showApp();
    return { auth: auth, allowed: true };
  }

  return {
    init: init,
    showForbidden: showForbidden,
    showApp: showApp
  };
})();
