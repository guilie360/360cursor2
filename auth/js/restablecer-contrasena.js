(function () {
  var resetForm = document.getElementById('resetForm');
  var loadingBlock = document.getElementById('loadingBlock');
  var successBlock = document.getElementById('successBlock');
  var formMessage = document.getElementById('formMessage');
  var submitBtn = document.getElementById('submitBtn');
  var loginLinks = document.getElementById('loginLinks');
  var isSubmitting = false;
  var hasRecoverySession = false;

  document.getElementById('loginLink').href = AuthRedirects.ingresar();
  AuthPage.bindPasswordToggle(document.getElementById('togglePassword'), document.getElementById('password'));
  AuthPage.bindPasswordToggle(document.getElementById('togglePasswordConfirm'), document.getElementById('passwordConfirm'));

  PlatformAuth.createClient({ remember: false });

  VisitorAuth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') {
      hasRecoverySession = true;
      showResetForm();
    }
  });

  function showResetForm() {
    loadingBlock.style.display = 'none';
    resetForm.style.display = 'block';
  }

  async function initRecovery() {
    try {
      var session = await VisitorAuth.handleRecoverySession();
      if (session) {
        hasRecoverySession = true;
        showResetForm();
        return;
      }

      window.setTimeout(function () {
        if (!hasRecoverySession) {
          loadingBlock.style.display = 'none';
          AuthPage.setMessage(
            formMessage,
            'El enlace no es válido o expiró. Solicita uno nuevo desde recuperar contraseña.',
            'error'
          );
          loginLinks.style.display = 'block';
        }
      }, 2500);
    } catch (err) {
      loadingBlock.style.display = 'none';
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
      loginLinks.style.display = 'block';
    }
  }

  resetForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    var password = resetForm.password.value;
    var passwordConfirm = resetForm.passwordConfirm.value;

    if (password.length < 8) {
      AuthPage.setMessage(formMessage, 'La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      AuthPage.setMessage(formMessage, 'Las contraseñas no coinciden.', 'error');
      return;
    }

    isSubmitting = true;
    AuthPage.setButtonLoading(submitBtn, true, 'Guardando...');
    AuthPage.setMessage(formMessage, '');

    try {
      await VisitorAuth.updatePassword(password);
      await VisitorAuth.logout();
      resetForm.style.display = 'none';
      successBlock.style.display = 'block';
      loginLinks.style.display = 'block';
    } catch (err) {
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
    } finally {
      isSubmitting = false;
      AuthPage.setButtonLoading(submitBtn, false);
    }
  });

  initRecovery();
})();
