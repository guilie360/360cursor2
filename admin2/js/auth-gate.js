/* BOXIES admin2 — auth gate (PlatformAuth / profiles.rol, same as showrooms) */
var BoxiesAdmin2Auth = (function () {
  function $(id) {
    return document.getElementById(id);
  }

  function setMessage(text, type) {
    var el = $('bxLoginMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-modal-message' + (type === 'error' ? ' is-error' : '');
  }

  function showView(name) {
    var login = $('bxLoginView');
    var forbidden = $('bxForbiddenView');
    var app = $('bxAppView');
    if (login) login.hidden = name !== 'login';
    if (forbidden) forbidden.hidden = name !== 'forbidden';
    if (app) app.hidden = name !== 'app';
  }

  function displayName(profile, user) {
    if (!profile && !user) return 'Admin';
    if (profile) {
      if (profile.nombre_visible) return profile.nombre_visible;
      if (profile.nombre) return profile.nombre;
      if (profile.nombres) return profile.nombres;
      if (profile.platformProfile && profile.platformProfile.nombre_visible) {
        return profile.platformProfile.nombre_visible;
      }
    }
    return (user && user.email) || 'Admin';
  }

  function normalizeProfile(profile, user) {
    if (!profile) return null;
    var platform = profile.platformProfile || profile;
    var rol = platform.rol || profile.rol || 'usuario';
    return {
      id: platform.id || profile.id || (user && user.id),
      email: (user && user.email) || profile.email || '',
      nombre: displayName(profile, user),
      rol: rol,
      platformProfile: platform,
      raw: profile
    };
  }

  async function resolvePlatformAdminProfile() {
    if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.refresh === 'function') {
      await VisitorSession.refresh();
    }

    var profile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;

    if (profile && PlatformRoles.isPlatformAdmin(profile)) {
      return normalizeProfile(profile, user);
    }

    if (!user || !user.id || typeof ProfilesApi === 'undefined') {
      return profile ? normalizeProfile(profile, user) : null;
    }

    try {
      var platformProfile = await ProfilesApi.fetchById(user.id);
      if (!platformProfile || !PlatformRoles.isPlatformAdmin(platformProfile)) {
        return profile ? normalizeProfile(profile, user) : null;
      }

      if (profile) {
        profile.platformProfile = platformProfile;
        profile.rol = platformProfile.rol;
        profile.permisos = platformProfile.permisos;
        return normalizeProfile(profile, user);
      }

      if (typeof VisitantesApi !== 'undefined') {
        return normalizeProfile(
          VisitantesApi.buildAuthProfile(user, null, platformProfile),
          user
        );
      }

      return normalizeProfile(platformProfile, user);
    } catch (err) {
      console.warn('[admin2] resolvePlatformAdminProfile', err);
      return profile ? normalizeProfile(profile, user) : null;
    }
  }

  async function completeSession() {
    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.init === 'function') {
      await AuthBootstrap.init();
      if (typeof AuthBootstrap.whenReady === 'function') {
        await AuthBootstrap.whenReady();
      }
    } else if (typeof VisitorSession !== 'undefined') {
      await VisitorSession.refresh();
    }

    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
    if (!user) {
      return { state: 'login' };
    }

    var profile = await resolvePlatformAdminProfile();
    if (!profile || !PlatformRoles.isPlatformAdmin(profile)) {
      return { state: 'forbidden', profile: profile };
    }

    return { state: 'app', profile: profile };
  }

  async function loginWithPassword(email, password, remember) {
    var auth = await VisitorAuth.login(email, password, remember !== false);
    if (typeof VisitorSession !== 'undefined') {
      await VisitorSession.syncFromAuth(auth);
    }

    var profile = await resolvePlatformAdminProfile();
    if (!profile || !PlatformRoles.isPlatformAdmin(profile)) {
      await VisitorAuth.logout();
      if (typeof VisitorSession !== 'undefined') {
        await VisitorSession.afterLogout();
      }
      throw new Error('No tienes permisos de administrador para BOXIES.');
    }
    return profile;
  }

  async function loginWithGoogle() {
    if (typeof OAuthApi === 'undefined' || typeof OAuthApi.handleGoogleAuth !== 'function') {
      throw new Error('OAuth no está disponible.');
    }
    await OAuthApi.handleGoogleAuth();
  }

  function bindLoginForm(onReadyApp) {
    var form = $('bxLoginForm');
    var googleBtn = $('bxGoogleBtn');
    var emailInput = $('bxEmail');
    var passwordInput = $('bxPassword');
    var rememberInput = $('bxRemember');
    var submitBtn = $('bxLoginSubmit');
    var submitText = $('bxLoginSubmitText');

    try {
      var saved = typeof AuthStoragePrefs !== 'undefined' ? AuthStoragePrefs.getSavedLogin() : null;
      if (saved && emailInput) emailInput.value = saved;
    } catch (e) {}

    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = (emailInput && emailInput.value || '').trim();
        var password = passwordInput ? passwordInput.value : '';
        var remember = !rememberInput || rememberInput.checked;
        if (!email || !password) {
          setMessage('Ingresa correo y contraseña.', 'error');
          return;
        }
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Entrando…';
        setMessage('');
        try {
          var profile = await loginWithPassword(email, password, remember);
          showView('app');
          if (onReadyApp) await onReadyApp(profile);
        } catch (err) {
          var msg = err && err.message ? err.message : 'No se pudo iniciar sesión.';
          if (typeof AuthErrors !== 'undefined' && typeof AuthErrors.loginFailureMessage === 'function') {
            msg = AuthErrors.loginFailureMessage(err) || msg;
          }
          setMessage(msg, 'error');
          submitBtn.disabled = false;
          if (submitText) submitText.textContent = 'Iniciar sesión';
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

    var togglePassword = $('bxTogglePassword');
    if (togglePassword && passwordInput && !togglePassword.dataset.bound) {
      togglePassword.dataset.bound = '1';
      togglePassword.addEventListener('click', function () {
        var show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        togglePassword.textContent = show ? 'Ocultar' : 'Mostrar';
      });
    }

    var forbiddenLogout = $('bxForbiddenLogout');
    if (forbiddenLogout && !forbiddenLogout.dataset.bound) {
      forbiddenLogout.dataset.bound = '1';
      forbiddenLogout.addEventListener('click', async function () {
        await logout();
      });
    }
  }

  async function init(onReadyApp) {
    if (typeof HallDesignSystem !== 'undefined') {
      HallDesignSystem.paint({ persist: false });
    } else {
      document.documentElement.classList.add('theme-ready');
    }

    bindLoginForm(onReadyApp);

    if (typeof VisitorAuth !== 'undefined' && typeof VisitorAuth.onAuthStateChange === 'function') {
      VisitorAuth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') {
          showView('login');
        }
      });
    }

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
    try {
      if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.logout === 'function') {
        await VisitorSession.logout();
      } else if (typeof VisitorAuth !== 'undefined') {
        await VisitorAuth.logout();
      }
    } catch (e) {}
    showView('login');
    setMessage('');
    var submitBtn = $('bxLoginSubmit');
    var submitText = $('bxLoginSubmitText');
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Iniciar sesión';
  }

  return {
    init: init,
    logout: logout,
    showView: showView,
    setMessage: setMessage
  };
})();
