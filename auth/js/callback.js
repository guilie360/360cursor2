(function () {
  var formMessage = document.getElementById('formMessage');
  var loadingBlock = document.getElementById('loadingBlock');
  var actionLinks = document.getElementById('actionLinks');
  var loginLink = document.getElementById('loginLink');

  if (loginLink) loginLink.href = AuthRedirects.ingresar();

  function fail(message) {
    if (loadingBlock) loadingBlock.style.display = 'none';
    if (actionLinks) actionLinks.style.display = 'block';
    if (typeof AuthPage !== 'undefined' && AuthPage.setMessage) {
      AuthPage.setMessage(formMessage, message, 'error');
    } else if (formMessage) {
      formMessage.textContent = message;
    }
  }

  function redirectToReturn() {
    var path =
      typeof OAuthApi !== 'undefined' && typeof OAuthApi.peekReturnPath === 'function'
        ? OAuthApi.peekReturnPath()
        : '/';
    window.location.replace((window.location.origin || '') + path);
  }

  async function run() {
    try {
      AuthStoragePrefs.setRememberMe(true);
      PlatformAuth.resetClient();
      PlatformAuth.createClient({ remember: true });

      var params = VisitorAuth.readUrlAuthParams();

      if (params.error === 'access_denied' || params.error) {
        VisitorAuth.cleanOAuthUrl();
        redirectToReturn();
        return;
      }

      var auth = null;
      if (params.code) {
        auth = await VisitorAuth.completeOAuthCallback();
      }
      if (!auth || !auth.session) {
        auth = await VisitorAuth.recoverOAuthSession();
      }
      if (!auth || !auth.session) {
        throw new Error('No fue posible completar el inicio de sesión con Google.');
      }

      redirectToReturn();
    } catch (err) {
      console.error('[OAuth callback]', err);
      fail(
        typeof AuthErrors !== 'undefined' && AuthErrors.translate
          ? AuthErrors.translate(err)
          : (err && err.message) || 'Error de autenticación.'
      );
    }
  }

  run();
})();
