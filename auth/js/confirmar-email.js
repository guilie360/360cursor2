(function () {
  var formMessage = document.getElementById('formMessage');
  var loadingBlock = document.getElementById('loadingBlock');
  var successBlock = document.getElementById('successBlock');
  var successLoginHint = document.getElementById('successLoginHint');
  var actionLinks = document.getElementById('actionLinks');
  var handled = false;

  document.getElementById('loginLink').href = AuthRedirects.ingresar();
  document.getElementById('homeLink').href = AuthRedirects.publicHome();

  PlatformAuth.createClient({ remember: false });

  async function completeConfirmation(session) {
    if (handled) return;
    handled = true;

    try {
      if (!session || !session.user) {
        throw new Error('El enlace de confirmación no es válido o ya expiró.');
      }

      if (!VisitorAuth.isEmailConfirmed(session.user)) {
        throw new Error('No se pudo confirmar el correo. Solicita un nuevo enlace.');
      }

      var profile = await VisitantesApi.fetchByAuthUserId(session.user.id, session.user);
      if (!profile) {
        throw new Error('Tu cuenta fue confirmada pero no se encontró el perfil de visitante.');
      }

      await VisitorAuth.logout();

      loadingBlock.style.display = 'none';
      successBlock.style.display = 'block';
      if (profile.login) {
        successLoginHint.textContent = 'Tu usuario es "' + profile.login + '". Puedes iniciar sesión con correo o usuario.';
      }
      actionLinks.style.display = 'block';
    } catch (err) {
      loadingBlock.style.display = 'none';
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
      actionLinks.style.display = 'block';
    }
  }

  VisitorAuth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      if (session && session.user) {
        completeConfirmation(session);
      }
    }
  });

  window.setTimeout(async function () {
    if (handled) return;
    var result = await PlatformAuth.getClient().auth.getSession();
    if (result.data.session) {
      await completeConfirmation(result.data.session);
      return;
    }
    if (!handled) {
      loadingBlock.style.display = 'none';
      AuthPage.setMessage(
        formMessage,
        'No se pudo validar el enlace. Ábrelo desde el correo más reciente o regístrate de nuevo.',
        'error'
      );
      actionLinks.style.display = 'block';
    }
  }, 3500);
})();
