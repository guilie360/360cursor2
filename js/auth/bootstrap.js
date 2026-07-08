/* Single auth bootstrap — OAuth callback, session restore, auth listener */
var AuthBootstrap = (function () {
  var listenerBound = false;
  var bootstrappingOAuth = false;
  var readyPromise = null;
  var readyResolve = null;
  var readyResolved = false;

  function whenReady() {
    if (readyResolved) return Promise.resolve();
    if (!readyPromise) return Promise.resolve();
    return readyPromise;
  }

  function markReady() {
    if (readyResolved) return;
    readyResolved = true;
    if (readyResolve) readyResolve();
  }

  async function initNormalSession() {
    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    return VisitorSession.refresh();
  }

  async function enterAfterAuth(auth) {
    await VisitorSession.syncFromAuth(auth);
    if (typeof VisitorAuthModal !== 'undefined') VisitorAuthModal.close();
    if (typeof OAuthApi !== 'undefined' && typeof OAuthApi.restoreUiState === 'function') {
      OAuthApi.restoreUiState({ enterProject: true });
    }
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
    if (typeof showToast === 'function') {
      showToast('Bienvenido, ' + VisitorSession.displayName());
    }
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
    return auth;
  }

  async function completeOAuthReturn() {
    bootstrappingOAuth = true;
    try {
      var auth = await VisitorAuth.completeOAuthCallback();
      if (!auth || !auth.session) {
        auth = await VisitorAuth.recoverOAuthSession();
      }
      if (!auth || !auth.session) {
        throw new Error('No fue posible iniciar sesión con Google.\nInténtalo nuevamente.');
      }
      return enterAfterAuth(auth);
    } finally {
      bootstrappingOAuth = false;
    }
  }

  function bindAuthStateChange() {
    if (listenerBound) return;
    listenerBound = true;

    VisitorAuth.onAuthStateChange(function (event, newSession) {
      if (bootstrappingOAuth) return;

      if (event === 'SIGNED_IN' && newSession) {
        VisitorAuth.finalizeAuthenticatedSession(newSession).then(function (auth) {
          if (!auth || !auth.session) return null;
          return VisitorSession.syncFromAuth(auth);
        })        .then(function (result) {
          if (!result) return;
          if (typeof VisitorAuthModal !== 'undefined') VisitorAuthModal.close();
          if (typeof window.refreshVisitorMenuProfile === 'function') {
            window.refreshVisitorMenuProfile();
          }
          if (typeof GlobalClose !== 'undefined') GlobalClose.update();
        }).catch(function (err) {
          console.error('[Auth] SIGNED_IN', err);
        });
        return;
      }

      if (event === 'SIGNED_OUT') {
        VisitorSession.afterLogout().then(function () {
          if (typeof window.refreshVisitorMenuProfile === 'function') {
            window.refreshVisitorMenuProfile();
          }
          if (typeof GlobalClose !== 'undefined') GlobalClose.update();
        });
      }
    });
  }

  function finishStartup() {
    if (typeof ProjectThemeAuthority !== 'undefined') {
      ProjectThemeAuthority.reapplyIfNeeded();
    }
    if (typeof VisitorMenu !== 'undefined') VisitorMenu.refreshProfile();
    try {
      if (new URLSearchParams(window.location.search).get('openVerify') === '1' &&
          typeof VisitorEmailVerification !== 'undefined' &&
          VisitorEmailVerification.isPending()) {
        VisitorEmailVerification.open({ reason: 'dashboard' });
      }
    } catch (e) {}
  }

  async function init() {
    readyResolved = false;
    readyPromise = new Promise(function (resolve) {
      readyResolve = resolve;
    });

    try {
      var params = VisitorAuth.readUrlAuthParams();

      if (params.error === 'access_denied') {
        VisitorAuth.cleanOAuthUrl();
        bindAuthStateChange();
        if (typeof OAuthApi !== 'undefined' && typeof OAuthApi.restoreUiState === 'function') {
          OAuthApi.restoreUiState();
        }
        await initNormalSession();
        finishStartup();
        return;
      }

      if (params.code) {
        try {
          await completeOAuthReturn();
        } catch (err) {
          console.error('[OAuth]', err);
          var recovered = await VisitorAuth.recoverOAuthSession();
          if (recovered && recovered.session) {
            try {
              await enterAfterAuth(recovered);
            } catch (recoverErr) {
              console.error('[OAuth] recovery sync', recoverErr);
            }
          } else {
            if (typeof OAuthApi !== 'undefined' && typeof OAuthApi.restoreUiState === 'function') {
              OAuthApi.restoreUiState();
            }
            if (typeof showToast === 'function') {
              showToast('No fue posible completar el inicio de sesión. Inténtalo nuevamente.');
            }
            await initNormalSession();
          }
        }
        bindAuthStateChange();
        finishStartup();
        return;
      }

      bindAuthStateChange();
      await initNormalSession();
      finishStartup();
    } finally {
      markReady();
    }
  }

  return {
    init: init,
    whenReady: whenReady
  };
})();
