/* Admin bootstrap — standard init for login and protected pages */
var AdminBootstrap = (function () {
  function initSdk() {
    AdminSupabase.createClient();
  }

  async function initLoginPage(callbacks) {
    initSdk();
    if (callbacks && callbacks.onReady) callbacks.onReady();
    await AdminAuth.redirectIfAuthenticated();
  }

  async function initProtectedPage(callbacks) {
    initSdk();
    var auth = await AdminAuth.requireAuth();
    if (!auth) return null;

    AdminAuth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
      }
    });

    if (callbacks && callbacks.onReady) {
      await callbacks.onReady(auth);
    }
    return auth;
  }

  return {
    initSdk: initSdk,
    initLoginPage: initLoginPage,
    initProtectedPage: initProtectedPage
  };
})();
