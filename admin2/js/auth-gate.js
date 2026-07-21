/* BOXIES admin2 — auth gate (reuses AdminAuth / AdminSupabase / AdminState) */
var BoxiesAdmin2Auth = (function () {
  var REMEMBER_KEY = 'boxies_admin2_email';

  function $(id) {
    return document.getElementById(id);
  }

  function setMessage(text, type) {
    var el = $('bxLoginMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'bx-form-message' + (type ? ' ' + type : '');
  }

  function showView(name) {
    var login = $('bxLoginView');
    var forbidden = $('bxForbiddenView');
    var app = $('bxAppView');
    if (login) login.hidden = name !== 'login';
    if (forbidden) forbidden.hidden = name !== 'forbidden';
    if (app) app.hidden = name !== 'app';
  }

  function callbackUrl() {
    return window.location.origin + '/admin2/';
  }

  async function completeSession() {
    await AdminAuth.getSession();
    var session = AdminAuth.getSessionSnapshot();
    if (!session) return { state: 'login' };

    try {
      await AdminAuth.loadProfile();
    } catch (err) {
      try { await AdminAuth.logout(); } catch (e) {}
      return { state: 'login', error: err.message || 'Acceso denegado' };
    }

    if (!AdminState.isAdmin()) {
      return { state: 'forbidden' };
    }

    return { state: 'app', profile: AdminState.getProfile() };
  }

  async function loginWithPassword(email, password) {
    await AdminAuth.login(email, password);
    if (!AdminState.isAdmin()) {
      await AdminAuth.logout();
      throw new Error('No tienes permisos de administrador para BOXIES.');
    }
  }

  async function loginWithGoogle() {
    AdminBootstrap.initSdk();
    var result = await AdminSupabase.getClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
        queryParams: {
          prompt: 'select_account',
          access_type: 'online'
        }
      }
    });
    if (result.error) throw result.error;
    if (result.data && result.data.url) {
      window.location.assign(result.data.url);
    }
  }

  function bindLoginForm(onReadyApp) {
    var form = $('bxLoginForm');
    var googleBtn = $('bxGoogleBtn');
    var emailInput = $('bxEmail');
    var passwordInput = $('bxPassword');
    var submitBtn = $('bxLoginSubmit');
    var submitText = $('bxLoginSubmitText');

    try {
      var saved = localStorage.getItem(REMEMBER_KEY);
      if (saved && emailInput) emailInput.value = saved;
    } catch (e) {}

    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = (emailInput && emailInput.value || '').trim();
        var password = passwordInput ? passwordInput.value : '';
        if (!email || !password) {
          setMessage('Ingresa correo y contraseña.', 'error');
          return;
        }
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Entrando…';
        setMessage('');
        try {
          await loginWithPassword(email, password);
          try { localStorage.setItem(REMEMBER_KEY, email); } catch (e2) {}
          showView('app');
          if (onReadyApp) await onReadyApp(AdminState.getProfile());
        } catch (err) {
          setMessage(err.message || 'No se pudo iniciar sesión.', 'error');
          submitBtn.disabled = false;
          if (submitText) submitText.textContent = 'Entrar';
        }
      });
    }

    if (googleBtn && !googleBtn.dataset.bound) {
      googleBtn.dataset.bound = '1';
      googleBtn.addEventListener('click', async function () {
        setMessage('');
        googleBtn.disabled = true;
        try {
          await loginWithGoogle();
        } catch (err) {
          googleBtn.disabled = false;
          setMessage(err.message || 'No se pudo iniciar con Google.', 'error');
        }
      });
    }

    var forbiddenLogout = $('bxForbiddenLogout');
    if (forbiddenLogout && !forbiddenLogout.dataset.bound) {
      forbiddenLogout.dataset.bound = '1';
      forbiddenLogout.addEventListener('click', async function () {
        try { await AdminAuth.logout(); } catch (e) {}
        showView('login');
        setMessage('');
      });
    }
  }

  async function init(onReadyApp) {
    AdminBootstrap.initSdk();
    bindLoginForm(onReadyApp);

    AdminAuth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') {
        showView('login');
      }
    });

    var result = await completeSession();
    if (result.state === 'login') {
      showView('login');
      if (result.error) setMessage(result.error, 'error');
      return result;
    }
    if (result.state === 'forbidden') {
      showView('forbidden');
      return result;
    }
    showView('app');
    if (onReadyApp) await onReadyApp(result.profile);
    return result;
  }

  async function logout() {
    try { await AdminAuth.logout(); } catch (e) {}
    showView('login');
    setMessage('');
    var submitBtn = $('bxLoginSubmit');
    var submitText = $('bxLoginSubmitText');
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Entrar';
  }

  return {
    init: init,
    logout: logout,
    showView: showView,
    setMessage: setMessage
  };
})();
