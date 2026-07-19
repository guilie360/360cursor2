(function () {
  var REMEMBER_KEY = '360preventa_admin_email';

  var form = document.getElementById('loginForm');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var rememberCheckbox = document.getElementById('rememberEmail');
  var loginBtn = document.getElementById('loginBtn');
  var loginBtnText = document.getElementById('loginBtnText');
  var formMessage = document.getElementById('formMessage');
  var togglePasswordBtn = document.getElementById('togglePassword');
  var forgotLink = document.getElementById('forgotPasswordLink');
  var visitorRegisterLink = document.getElementById('visitorRegisterLink');

  var isSubmitting = false;

  if (visitorRegisterLink) {
    try {
      var proyecto = new URLSearchParams(window.location.search).get('proyecto') || 'demo';
      visitorRegisterLink.href = '../auth/registro.html?proyecto=' + encodeURIComponent(proyecto);
    } catch (e) {
      visitorRegisterLink.href = '../auth/registro.html?proyecto=demo';
    }
  }

  function setMessage(text, type) {
    formMessage.textContent = text || '';
    formMessage.className = 'form-message' + (type ? ' ' + type : '');
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    loginBtn.classList.toggle('loading', loading);
    loginBtnText.textContent = loading ? 'Iniciando sesión...' : 'Iniciar sesión';
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function restoreRememberedEmail() {
    try {
      var saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        emailInput.value = saved;
        rememberCheckbox.checked = true;
      }
    } catch (e) {}
  }

  function persistRememberedEmail() {
    try {
      if (rememberCheckbox.checked) {
        localStorage.setItem(REMEMBER_KEY, emailInput.value.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (e) {}
  }

  function showQueryError() {
    try {
      var params = new URLSearchParams(window.location.search);
      var error = params.get('error');
      if (error) setMessage(decodeURIComponent(error), 'error');
    } catch (e) {}
  }

  togglePasswordBtn.addEventListener('click', function () {
    var isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
  });

  emailInput.addEventListener('input', function () {
    if (rememberCheckbox.checked) persistRememberedEmail();
    setMessage('');
  });

  passwordInput.addEventListener('input', function () {
    setMessage('');
  });

  rememberCheckbox.addEventListener('change', persistRememberedEmail);

  forgotLink.addEventListener('click', async function (event) {
    event.preventDefault();
    var email = emailInput.value.trim();
    if (!email) {
      setMessage('Escribe tu correo electrónico primero.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      setMessage('Correo electrónico inválido.', 'error');
      return;
    }
    try {
      await AdminAuth.resetPassword(email);
      setMessage('Te enviamos un enlace para restablecer tu contraseña.', 'success');
    } catch (err) {
      setMessage(err.message || 'No se pudo enviar el enlace.', 'error');
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    var email = emailInput.value.trim();
    var password = passwordInput.value;

    if (!email) {
      setMessage('Ingresa tu correo electrónico.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      setMessage('Correo electrónico inválido.', 'error');
      return;
    }
    if (!password) {
      setMessage('Ingresa tu contraseña.', 'error');
      return;
    }

    isSubmitting = true;
    setLoading(true);
    setMessage('');

    try {
      await AdminAuth.login(email, password);
      persistRememberedEmail();
      window.location.replace('dashboard.html');
    } catch (err) {
      setMessage(err.message || 'No se pudo iniciar sesión.', 'error');
      isSubmitting = false;
      setLoading(false);
    }
  });

  window.addEventListener('pageshow', function () {
    isSubmitting = false;
    setLoading(false);
  });

  restoreRememberedEmail();
  showQueryError();
  AdminBootstrap.initLoginPage();
})();
