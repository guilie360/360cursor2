(function () {
  var form = document.getElementById('registroForm');
  var submitBtn = document.getElementById('submitBtn');
  var submitBtnText = document.getElementById('submitBtnText');
  var formMessage = document.getElementById('formMessage');
  var isSubmitting = false;

  document.getElementById('loginLink').href = AuthRedirects.ingresar();
  document.getElementById('homeLink').href = AuthRedirects.publicHome();
  document.getElementById('termsLink').href = AuthRedirects.terminos();
  document.getElementById('privacyLink').href = AuthRedirects.privacidad();

  AuthPage.bindPasswordToggle(document.getElementById('togglePassword'), document.getElementById('password'));

  PlatformAuth.createClient({ remember: false });
  VisitorAuth.redirectIfAuthenticated();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    var nombres = form.nombres.value.trim();
    var apellidos = form.apellidos.value.trim();
    var email = form.email.value.trim().toLowerCase();
    var password = form.password.value;

    if (!nombres) {
      AuthPage.setMessage(formMessage, 'Ingresa tu nombre.', 'error');
      return;
    }
    if (!apellidos) {
      AuthPage.setMessage(formMessage, 'Ingresa tu apellido.', 'error');
      return;
    }
    if (!AuthPage.isValidEmail(email)) {
      AuthPage.setMessage(formMessage, 'Correo electrónico inválido.', 'error');
      return;
    }
    if (password.length < 8) {
      AuthPage.setMessage(formMessage, 'La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    isSubmitting = true;
    AuthPage.setButtonLoading(submitBtn, true, 'Continuando...');
    AuthPage.setMessage(formMessage, '');

    try {
      var result = await RegistroApi.registerVisitor({
        nombres: nombres,
        apellidos: apellidos,
        email: email,
        password: password
      });

      if (!result.session) {
        AuthPage.setMessage(
          formMessage,
          'Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente. Intenta ingresar con tu correo.',
          'error'
        );
        window.setTimeout(function () {
          window.location.replace(AuthRedirects.ingresar());
        }, 1200);
        return;
      }

      AuthStoragePrefs.setRememberMe(true);
      PlatformAuth.resetClient();
      PlatformAuth.createClient({ remember: true });
      await VisitorAuth.login(email, password, true);
      window.location.replace(AuthRedirects.publicHome());
    } catch (err) {
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
    } finally {
      isSubmitting = false;
      AuthPage.setButtonLoading(submitBtn, false);
      submitBtnText.textContent = 'Continuar';
    }
  });
})();
