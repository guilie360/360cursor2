(function () {
  var form = document.getElementById('loginForm');
  var loginInput = document.getElementById('loginInput');
  var passwordInput = document.getElementById('password');
  var rememberCheckbox = document.getElementById('rememberMe');
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnText = document.getElementById('loginBtnText');
  var formMessage = document.getElementById('formMessage');
  var isSubmitting = false;
  var resendWrap = document.getElementById('resendWrap');
  var resendBtn = document.getElementById('resendBtn');
  var pendingIdentifier = '';

  function showResendLink(identifier) {
    pendingIdentifier = identifier;
    if (resendWrap) resendWrap.style.display = 'block';
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', async function () {
      if (!pendingIdentifier || isSubmitting) return;
      isSubmitting = true;
      AuthPage.setMessage(formMessage, 'Reenviando correo de confirmación...', '');
      try {
        await VisitorAuth.resendConfirmation(pendingIdentifier);
        AuthPage.setMessage(formMessage, 'Correo reenviado. Revisa tu bandeja de entrada.', 'success');
      } catch (err) {
        AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
      } finally {
        isSubmitting = false;
      }
    });
  }

  document.getElementById('forgotLink').href = AuthRedirects.withProyecto('recuperar-contrasena.html');
  document.getElementById('registerCta').href = AuthRedirects.registro();
  document.getElementById('homeLink').href = AuthRedirects.publicHome();

  AuthPage.bindPasswordToggle(document.getElementById('togglePassword'), passwordInput);

  rememberCheckbox.checked = AuthStoragePrefs.getRememberMe();
  if (rememberCheckbox.checked) {
    loginInput.value = AuthStoragePrefs.getSavedLogin();
  }

  PlatformAuth.createClient({ remember: rememberCheckbox.checked });
  AuthPage.showQueryMessage('formMessage');
  VisitorAuth.redirectIfAuthenticated();

  rememberCheckbox.addEventListener('change', function () {
    AuthStoragePrefs.setRememberMe(rememberCheckbox.checked);
    PlatformAuth.resetClient();
    PlatformAuth.createClient({ remember: rememberCheckbox.checked });
    if (!rememberCheckbox.checked) {
      AuthStoragePrefs.clearSavedLogin();
    }
  });

  loginInput.addEventListener('input', function () {
    if (rememberCheckbox.checked) {
      AuthStoragePrefs.setSavedLogin(loginInput.value.trim());
    }
    AuthPage.setMessage(formMessage, '');
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    var loginValue = loginInput.value.trim();
    var password = passwordInput.value;

    if (!loginValue) {
      AuthPage.setMessage(formMessage, 'Ingresa tu correo o usuario.', 'error');
      return;
    }
    if (!password) {
      AuthPage.setMessage(formMessage, 'Ingresa tu contraseña.', 'error');
      return;
    }

    isSubmitting = true;
    AuthPage.setButtonLoading(loginBtn, true, 'Iniciando sesión...');
    AuthPage.setMessage(formMessage, '');

    try {
      var auth = await VisitorAuth.login(loginValue, password, rememberCheckbox.checked);
      window.location.replace(AuthRouter.destinationFor(auth.profile));
    } catch (err) {
      AuthPage.setMessage(formMessage, AuthErrors.loginFailureMessage(err), 'error');
      if (err.code === 'email_not_confirmed') {
        showResendLink(err.resolvedEmail || loginValue);
      }
      isSubmitting = false;
      AuthPage.setButtonLoading(loginBtn, false);
      loginBtnText.textContent = 'Iniciar sesión';
    }
  });
})();
