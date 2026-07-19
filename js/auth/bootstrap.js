try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/bootstrap.js');}catch(_e){}
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
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/auth/bootstrap.js :: initNormalSession');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT BEGIN js/auth/bootstrap.js :: initNormalSession');}catch(_bd){}
  try {

    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    return VisitorSession.refresh();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT END js/auth/bootstrap.js :: initNormalSession');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/auth/bootstrap.js :: initNormalSession');}catch(_bd){}
  }
}

  async function enterAfterAuth(auth) {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/auth/bootstrap.js :: enterAfterAuth');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT BEGIN js/auth/bootstrap.js :: enterAfterAuth');}catch(_bd){}
  try {

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
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT END js/auth/bootstrap.js :: enterAfterAuth');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/auth/bootstrap.js :: enterAfterAuth');}catch(_bd){}
  }
}

  async function completeOAuthReturn() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/auth/bootstrap.js :: completeOAuthReturn');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT BEGIN js/auth/bootstrap.js :: completeOAuthReturn');}catch(_bd){}
  try {

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
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT END js/auth/bootstrap.js :: completeOAuthReturn');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/auth/bootstrap.js :: completeOAuthReturn');}catch(_bd){}
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
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/auth/bootstrap.js :: finishStartup');}catch(_bd){}
  try {

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
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/auth/bootstrap.js :: finishStartup');}catch(_bd){}
  }
}

  async function init() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/auth/bootstrap.js :: init');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT BEGIN js/auth/bootstrap.js :: init');}catch(_bd){}
  try {

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
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('AWAIT END js/auth/bootstrap.js :: init');}catch(_bd){}
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/auth/bootstrap.js :: init');}catch(_bd){}
  }
}

  return {
    init: init,
    whenReady: whenReady
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/bootstrap.js');}catch(_e){}
