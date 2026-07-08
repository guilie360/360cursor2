(function () {
  var form = document.getElementById('recoverForm');
  var loginInput = document.getElementById('loginInput');
  var submitBtn = document.getElementById('submitBtn');
  var formMessage = document.getElementById('formMessage');
  var isSubmitting = false;

  document.getElementById('loginLink').href = AuthRedirects.ingresar();

  if (AuthStoragePrefs.getSavedLogin()) {
    loginInput.value = AuthStoragePrefs.getSavedLogin();
  }

  PlatformAuth.createClient({ remember: false });

  VisitorAuth.getSession().then(function () {
    var user = VisitorAuth.getUser();
    if (user && !VisitorAuth.isEmailConfirmed(user)) {
      AuthPage.setMessage(
        formMessage,
        'Verifica tu correo electrónico antes de recuperar tu contraseña. Revisa tu bandeja de entrada.',
        'error'
      );
      if (form) form.style.display = 'none';
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    var user = VisitorAuth.getUser();
    if (user && !VisitorAuth.isEmailConfirmed(user)) {
      AuthPage.setMessage(
        formMessage,
        'Verifica tu correo electrónico antes de recuperar tu contraseña.',
        'error'
      );
      return;
    }

    var loginValue = loginInput.value.trim();
    if (!loginValue) {
      AuthPage.setMessage(formMessage, 'Ingresa tu correo o usuario.', 'error');
      return;
    }

    isSubmitting = true;
    AuthPage.setButtonLoading(submitBtn, true, 'Enviando...');
    AuthPage.setMessage(formMessage, '');

    try {
      await VisitorAuth.resetPassword(loginValue);
      AuthPage.setMessage(
        formMessage,
        'Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.',
        'success'
      );
    } catch (err) {
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
    } finally {
      isSubmitting = false;
      AuthPage.setButtonLoading(submitBtn, false);
    }
  });
})();
