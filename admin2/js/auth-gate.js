/* BOXIES admin2 — auth gate (PlatformAuth / profiles.rol ONLY — same as showrooms) */
var BoxiesAdmin2Auth = (function () {
  var LOG_PREFIX = '[admin2:auth]';

  function $(id) {
    return document.getElementById(id);
  }

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    console.log.apply(console, args);
  }

  function logWarn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    console.warn.apply(console, args);
  }

  function setMessage(text, type) {
    var el = $('bxLoginMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-modal-message' + (type === 'error' ? ' is-error' : '');
  }

  function showView(name) {
    log('showView →', name);
    var login = $('bxLoginView');
    var forbidden = $('bxForbiddenView');
    var app = $('bxAppView');
    if (login) login.hidden = name !== 'login';
    if (forbidden) forbidden.hidden = name !== 'forbidden';
    if (app) app.hidden = name !== 'app';
    var builderOn = name === 'app';
    document.body.classList.toggle('platform-builder-shell', builderOn);
    document.body.classList.toggle('builder-has-dock', builderOn);
    document.documentElement.classList.toggle('builder-has-dock', builderOn);
    document.body.classList.toggle('login-page', name === 'login' || name === 'forbidden');
  }

  function admin2ReturnPath() {
    var path = (window.location.pathname || '/admin2').replace(/\/+$/, '') || '/admin2';
    if (path.indexOf('/admin2') === 0) return path;
    return '/admin2';
  }

  /**
   * Do NOT run showroom AuthBootstrap here: it restores OAuth return state and can
   * redirect /admin2 → /demo1 (or another showroom), breaking Global Admin entry.
   */
  function clearStaleShowroomReturnState() {
    if (typeof OAuthApi === 'undefined') return;
    try {
      var peek = typeof OAuthApi.peekReturnPath === 'function' ? OAuthApi.peekReturnPath() : null;
      var here = admin2ReturnPath();
      if (!peek) return;
      var normalizedPeek = String(peek).replace(/\/+$/, '') || '';
      if (normalizedPeek.indexOf('/admin2') === 0) {
        log('OAuth returnPath already points at admin2:', normalizedPeek);
        return;
      }
      logWarn('Clearing stale OAuth returnPath (would leave admin2):', normalizedPeek, '≠', here);
      if (typeof OAuthApi.clearReturnState === 'function') OAuthApi.clearReturnState();
    } catch (e) {
      logWarn('clearStaleShowroomReturnState', e);
    }
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

  function normalizeProfile(platformProfile, user, visitorProfile) {
    if (!platformProfile && !visitorProfile) return null;
    var platform = platformProfile || (visitorProfile && visitorProfile.platformProfile) || visitorProfile;
    var rol = (platform && platform.rol) || (visitorProfile && visitorProfile.rol) || 'usuario';
    return {
      id: (platform && platform.id) || (user && user.id),
      email: (user && user.email) || '',
      nombre: displayName(visitorProfile || platform, user),
      rol: rol,
      platformProfile: platform,
      raw: visitorProfile || platform
    };
  }

  function describeRoleCheck(label, profile) {
    var role =
      typeof PlatformRoles !== 'undefined' ? PlatformRoles.getRole(profile) : (profile && profile.rol);
    var ok =
      typeof PlatformRoles !== 'undefined' && PlatformRoles.isPlatformAdmin(profile);
    log(label, {
      role: role,
      isPlatformAdmin: ok,
      hasPlatformProfile: !!(profile && profile.platformProfile),
      profileKeys: profile ? Object.keys(profile) : []
    });
    return ok;
  }

  /**
   * Source of truth for Global Admin: public.profiles.rol via auth.uid().
   * Same table/role the showroom uses for Style V.3 / project admin.
   */
  async function loadPlatformAdminFromProfiles(user) {
    if (!user || !user.id) {
      log('loadPlatformAdminFromProfiles: no user');
      return null;
    }
    if (typeof ProfilesApi === 'undefined') {
      logWarn('ProfilesApi undefined');
      return null;
    }

    log('Fetching profiles row for auth user', user.id, user.email || '');
    var platformProfile = await ProfilesApi.fetchById(user.id);
    log('profiles.fetchById →', platformProfile
      ? { id: platformProfile.id, rol: platformProfile.rol, nombre_visible: platformProfile.nombre_visible }
      : null);

    if (!platformProfile && typeof VisitorProvisioningApi !== 'undefined') {
      log('No profiles row — ensuring via VisitorProvisioningApi');
      try {
        var ensured = await VisitorProvisioningApi.syncPlatformProfile(user);
        platformProfile = ensured;
        log('syncPlatformProfile →', platformProfile
          ? { id: platformProfile.id, rol: platformProfile.rol }
          : null);
      } catch (err) {
        logWarn('syncPlatformProfile failed', err);
      }
    }

    return platformProfile;
  }

  async function resolveAccess() {
    clearStaleShowroomReturnState();

    if (typeof PlatformAuth === 'undefined' || typeof VisitorAuth === 'undefined') {
      logWarn('PlatformAuth/VisitorAuth missing — abort');
      return { state: 'login', reason: 'auth_stack_missing' };
    }

    PlatformAuth.createClient({
      remember: typeof AuthStoragePrefs !== 'undefined' ? AuthStoragePrefs.getRememberMe() : true
    });

    /* Rare: OAuth code landed on /admin2 instead of /auth/callback.html */
    if (typeof VisitorAuth.isOAuthCallbackUrl === 'function' && VisitorAuth.isOAuthCallbackUrl()) {
      log('OAuth params on /admin2 URL — completing callback locally');
      try {
        await VisitorAuth.completeOAuthCallback();
      } catch (err) {
        logWarn('completeOAuthCallback failed', err);
        return {
          state: 'login',
          reason: 'oauth_callback_failed',
          error: (err && err.message) || 'No se pudo completar Google OAuth.'
        };
      }
    }

    var session = null;
    try {
      session = await VisitorAuth.getSession();
    } catch (err) {
      logWarn('getSession error', err);
      return {
        state: 'login',
        reason: 'get_session_error',
        error: (err && err.message) || 'Error leyendo sesión.'
      };
    }

    var user = VisitorAuth.getUser();
    log('session?', !!session, 'user?', !!(user && user.id), 'userId:', user && user.id, 'email:', user && user.email);

    if (!session || !user) {
      return { state: 'login', reason: 'no_session' };
    }

    var platformProfile = null;
    try {
      platformProfile = await loadPlatformAdminFromProfiles(user);
    } catch (err) {
      logWarn('loadPlatformAdminFromProfiles error', err);
      return {
        state: 'forbidden',
        reason: 'profile_fetch_error',
        error: (err && err.message) || 'No se pudo cargar el perfil de plataforma.',
        profile: null
      };
    }

    var visitorProfile = null;
    try {
      if (typeof VisitorAuth.loadVisitorProfile === 'function') {
        visitorProfile = await VisitorAuth.loadVisitorProfile();
        log('VisitorAuth.loadVisitorProfile →', visitorProfile
          ? {
              id: visitorProfile.id,
              rol: visitorProfile.rol,
              platformRol: visitorProfile.platformProfile && visitorProfile.platformProfile.rol
            }
          : null);
      }
    } catch (err) {
      logWarn('loadVisitorProfile failed (non-fatal)', err);
    }

    if (visitorProfile && platformProfile) {
      visitorProfile.platformProfile = platformProfile;
      visitorProfile.rol = platformProfile.rol;
      visitorProfile.permisos = platformProfile.permisos;
    }

    if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.syncFromAuth === 'function') {
      try {
        await VisitorSession.syncFromAuth({
          session: session,
          user: user,
          profile: visitorProfile || (platformProfile
            ? (typeof VisitantesApi !== 'undefined'
              ? VisitantesApi.buildAuthProfile(user, null, platformProfile)
              : platformProfile)
            : null)
        });
      } catch (err) {
        logWarn('VisitorSession.syncFromAuth failed (non-fatal)', err);
      }
    }

    var checkTarget = platformProfile || visitorProfile;
    var isAdmin = describeRoleCheck('role check', checkTarget);

    if (!platformProfile) {
      logWarn('REJECT: no profiles row for user', user.id);
      return {
        state: 'forbidden',
        reason: 'no_platform_profile',
        profile: normalizeProfile(null, user, visitorProfile),
        error: 'No hay fila en profiles para este usuario.'
      };
    }

    if (!isAdmin) {
      var role = PlatformRoles.getRole(platformProfile);
      logWarn('REJECT: role is not admin/super_admin →', role);
      return {
        state: 'forbidden',
        reason: 'role_not_admin',
        role: role,
        profile: normalizeProfile(platformProfile, user, visitorProfile),
        error: 'Rol actual: "' + role + '". Se requiere admin o super_admin en public.profiles.'
      };
    }

    var normalized = normalizeProfile(platformProfile, user, visitorProfile);
    log('ALLOW: platform admin', normalized.email, normalized.rol);
    return { state: 'app', profile: normalized, reason: 'ok' };
  }

  async function loginWithPassword(email, password, remember) {
    log('password login attempt', email, 'remember=', remember !== false);
    var auth = await VisitorAuth.login(email, password, remember !== false);
    log('VisitorAuth.login OK', auth && auth.user && auth.user.id, auth && auth.user && auth.user.email);

    if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.syncFromAuth === 'function') {
      await VisitorSession.syncFromAuth(auth);
    }

    var access = await resolveAccess();
    if (access.state === 'app') {
      return { ok: true, profile: access.profile, access: access };
    }
    if (access.state === 'forbidden') {
      logWarn('password login authenticated but not platform admin', access);
      return { ok: false, access: access };
    }
    throw new Error(access.error || 'No se pudo completar el acceso.');
  }

  async function loginWithGoogle() {
    log('Google OAuth — same showroom flow via /auth/callback.html');
    if (typeof OAuthApi === 'undefined' || typeof OAuthApi.handleGoogleAuth !== 'function') {
      throw new Error('OAuth no está disponible.');
    }
    var path = admin2ReturnPath();
    if (typeof OAuthApi.saveReturnPath === 'function') {
      OAuthApi.saveReturnPath(path);
      log('Forced OAuth returnPath', path);
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
          var result = await loginWithPassword(email, password, remember);
          if (result && result.ok) {
            showView('app');
            if (onReadyApp) await onReadyApp(result.profile);
            return;
          }
          if (result && result.access && result.access.state === 'forbidden') {
            showView('forbidden');
            renderForbiddenDetails(result.access);
            submitBtn.disabled = false;
            if (submitText) submitText.textContent = 'Iniciar sesión';
            return;
          }
          throw new Error('No se pudo completar el acceso.');
        } catch (err) {
          logWarn('login form error', err);
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
          logWarn('Google login error', err);
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

  function renderForbiddenDetails(access) {
    var card = document.querySelector('#bxForbiddenView .hall-panel');
    if (!card || !access) return;
    var detail = card.querySelector('[data-bx-forbidden-detail]');
    if (!detail) {
      detail = document.createElement('p');
      detail.setAttribute('data-bx-forbidden-detail');
      detail.style.marginTop = '12px';
      detail.style.fontSize = '0.8rem';
      detail.style.opacity = '0.75';
      var actions = card.querySelector('.hall-forbidden-actions');
      if (actions) card.insertBefore(detail, actions);
      else card.appendChild(detail);
    }
    detail.textContent =
      'Motivo: ' +
      (access.reason || 'forbidden') +
      (access.role ? ' · rol="' + access.role + '"' : '') +
      (access.error ? ' · ' + access.error : '');
  }

  async function init(onReadyApp) {
    log('init — unified showroom auth (no AdminAuth / no AuthBootstrap redirect)');
    if (typeof HallDesignSystem !== 'undefined') {
      HallDesignSystem.paint({ persist: false });
    } else {
      document.documentElement.classList.add('theme-ready');
    }

    bindLoginForm(onReadyApp);

    if (typeof VisitorAuth !== 'undefined' && typeof VisitorAuth.onAuthStateChange === 'function') {
      VisitorAuth.onAuthStateChange(function (event) {
        log('onAuthStateChange', event);
        if (event === 'SIGNED_OUT') {
          showView('login');
        }
      });
    }

    var access = await resolveAccess();
    log('resolveAccess result', access.state, access.reason || '');

    if (access.state === 'login') {
      showView('login');
      if (access.error) setMessage(access.error, 'error');
      return access;
    }
    if (access.state === 'forbidden') {
      showView('forbidden');
      renderForbiddenDetails(access);
      return access;
    }
    showView('app');
    if (onReadyApp) await onReadyApp(access.profile);
    return access;
  }

  async function logout() {
    log('logout');
    try {
      if (typeof VisitorAuth !== 'undefined') {
        await VisitorAuth.logout();
      }
      if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.afterLogout === 'function') {
        await VisitorSession.afterLogout();
      }
    } catch (e) {
      logWarn('logout error', e);
    }
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
