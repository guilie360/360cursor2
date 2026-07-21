/* Admin authentication — session guards only; data access lives in admin/js/api/* */
var AdminAuth = (function () {
  var session = null;
  var profile = null;

  function clearState() {
    session = null;
    profile = null;
    AdminState.clear();
  }

  async function getSession() {
    var result = await AdminSupabase.getClient().auth.getSession();
    session = result.data.session || null;
    return session;
  }

  async function loadProfile() {
    if (!session || !session.user) {
      throw new Error('No hay sesión activa.');
    }
    profile = AdminApi.assertActiveProfile(
      await ProfileApi.fetchByAuthUserId(session.user.id)
    );
    AdminState.init(session, profile);
    return profile;
  }

  async function login(email, password) {
    clearState();
    var result = await AdminSupabase.getClient().auth.signInWithPassword({
      email: email,
      password: password
    });
    if (result.error) throw result.error;
    session = result.data.session;
    await loadProfile();
    return { session: session, profile: profile };
  }

  async function logout() {
    await AdminSupabase.getClient().auth.signOut();
    clearState();
  }

  function dashboardHref() {
    try {
      var proyecto = new URLSearchParams(window.location.search).get('proyecto');
      if (proyecto) return 'dashboard.html?proyecto=' + encodeURIComponent(proyecto);
    } catch (e) {}
    /* Default: Global Admin shell */
    return 'index.html';
  }

  async function requireAuth() {
    await getSession();
    if (!session) {
      window.location.replace('login.html');
      return null;
    }
    try {
      await loadProfile();
      return { session: session, profile: profile };
    } catch (err) {
      await logout();
      window.location.replace('login.html?error=' + encodeURIComponent(err.message || 'Acceso denegado'));
      return null;
    }
  }

  async function redirectIfAuthenticated() {
    await getSession();
    if (!session) return false;
    try {
      await loadProfile();
      window.location.replace(dashboardHref());
      return true;
    } catch (err) {
      await logout();
      return false;
    }
  }

  async function resetPassword(email) {
    var redirectTo = window.location.origin + window.location.pathname.replace(/login\.html.*$/, 'login.html');
    var result = await AdminSupabase.getClient().auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
    if (result.error) throw result.error;
  }

  function onAuthStateChange(callback) {
    return AdminSupabase.getClient().auth.onAuthStateChange(function (event, newSession) {
      session = newSession;
      if (!newSession) {
        profile = null;
        AdminState.clear();
      }
      callback(event, newSession);
    });
  }

  return {
    getSession: getSession,
    loadProfile: loadProfile,
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    resetPassword: resetPassword,
    getProfile: function () { return profile; },
    getSessionSnapshot: function () { return session; },
    onAuthStateChange: onAuthStateChange
  };
})();
