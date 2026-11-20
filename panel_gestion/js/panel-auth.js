/**
 * Auth real del Panel de gestión — Supabase Auth (email/password + Google).
 * Requiere: supabase-js, /js/shared/config.js, PlatformAuth, AuthStoragePrefs, LoginApi, AuthRedirects.
 */
(function () {
  var OAUTH_RETURN_KEY = 'guilie_oauth_return';
  var busy = false;

  function $(id) { return document.getElementById(id); }

  function setError(msg) {
    var el = $('loginError');
    if (el) el.textContent = msg || '';
  }

  function setBusy(on) {
    busy = !!on;
    var submit = $('loginForm') && $('loginForm').querySelector('.login-submit');
    var google = $('googleLogin');
    if (submit) {
      submit.disabled = !!on;
      if (on) submit.dataset.label = submit.dataset.label || submit.textContent;
      submit.textContent = on ? 'Entrando…' : (submit.dataset.label || 'Iniciar sesión');
    }
    if (google) google.disabled = !!on;
  }

  var TEAM_SESSION_KEY = 'boxiesTeamSession';
  var PANEL_ROLE_KEY = 'boxiesPanelRole';

  function clearPanelRole() {
    try {
      delete document.body.dataset.panelRole;
      sessionStorage.removeItem(PANEL_ROLE_KEY);
      sessionStorage.removeItem(TEAM_SESSION_KEY);
    } catch (e) {}
    if (window.BoxiesGlobalNav && typeof window.BoxiesGlobalNav.refresh === 'function') {
      window.BoxiesGlobalNav.refresh();
    }
  }

  function applyPanelRole(rol) {
    var clean = String(rol || '').trim().toLowerCase();
    if (!clean) clean = 'usuario';
    try {
      document.body.dataset.panelRole = clean;
      sessionStorage.setItem(PANEL_ROLE_KEY, clean);
      sessionStorage.setItem(TEAM_SESSION_KEY, '1');
    } catch (e) {}
    if (window.BoxiesGlobalNav && typeof window.BoxiesGlobalNav.refresh === 'function') {
      window.BoxiesGlobalNav.refresh();
    }
  }

  async function loadAndApplyRole(userId) {
    if (!userId) {
      applyPanelRole('usuario');
      return;
    }
    try {
      var client = PlatformAuth.getClient();
      var result = await client.from('profiles').select('rol').eq('id', userId).maybeSingle();
      if (result.error) throw result.error;
      applyPanelRole(result.data && result.data.rol);
    } catch (err) {
      console.warn('[PanelAuth] role', err);
      applyPanelRole('usuario');
    }
  }

  function stampTeamSession() {
    try {
      sessionStorage.setItem(TEAM_SESSION_KEY, '1');
    } catch (e) {}
  }

  function enterWorkspace() {
    stampTeamSession();
    if (typeof window.enterWorkspace === 'function') {
      window.enterWorkspace();
    } else {
      var login = $('loginScreen');
      var portal = $('portal');
      if (login) login.classList.add('portal-hidden');
      if (portal) portal.classList.remove('portal-hidden');
      document.body.classList.add('portal-mode', 'workspace-authenticated');
      if (typeof window.portalShowHome === 'function') window.portalShowHome();
    }
    if (window.BoxiesGlobalNav && typeof window.BoxiesGlobalNav.refresh === 'function') {
      window.BoxiesGlobalNav.refresh();
    }
  }

  function leaveWorkspace() {
    clearPanelRole();
    if (typeof window.leaveWorkspaceUi === 'function') {
      window.leaveWorkspaceUi();
      return;
    }
    var login = $('loginScreen');
    var portal = $('portal');
    if (portal) portal.classList.add('portal-hidden');
    if (login) login.classList.remove('portal-hidden');
    document.body.classList.remove('workspace-authenticated');
    document.body.classList.add('portal-mode');
    $('teamChatPopup') && $('teamChatPopup').classList.add('portal-hidden');
    if ($('loginPassword')) $('loginPassword').value = '';
    setError('');
    window.scrollTo(0, 0);
  }

  function friendlyAuthError(err) {
    var msg = (err && (err.message || err.error_description)) || '';
    var low = String(msg).toLowerCase();
    if (low.indexOf('invalid login') !== -1 || low.indexOf('invalid credentials') !== -1) {
      return 'Correo o contraseña incorrectos.';
    }
    if (low.indexOf('email not confirmed') !== -1) {
      return 'Confirma tu correo antes de entrar.';
    }
    if (low.indexOf('network') !== -1 || low.indexOf('fetch') !== -1) {
      return 'No hay conexión con el servidor. Inténtalo de nuevo.';
    }
    return msg || 'No se pudo iniciar sesión.';
  }

  async function getSession() {
    var client = PlatformAuth.getClient();
    var result = await client.auth.getSession();
    if (result.error) throw result.error;
    return result.data && result.data.session;
  }

  async function loginWithPassword(emailOrLogin, password, remember) {
    AuthStoragePrefs.setRememberMe(!!remember);
    PlatformAuth.resetClient();
    PlatformAuth.createClient({ remember: !!remember });

    var email = await LoginApi.resolveLoginEmail(emailOrLogin);
    var result = await PlatformAuth.getClient().auth.signInWithPassword({
      email: email,
      password: password
    });
    if (result.error) throw result.error;
    if (email) AuthStoragePrefs.setSavedLogin(email);
    return result.data.session;
  }

  function savePanelReturnPath() {
    var state = {
      returnPath: '/panel_gestion/',
      scrollY: 0,
      t: Date.now()
    };
    try { sessionStorage.setItem(OAUTH_RETURN_KEY, JSON.stringify(state)); } catch (e) {}
    try { localStorage.setItem(OAUTH_RETURN_KEY, JSON.stringify(state)); } catch (e2) {}
  }

  async function loginWithGoogle() {
    savePanelReturnPath();
    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.resetClient();
    var client = PlatformAuth.createClient({ remember: true });
    var result = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AuthRedirects.oauthCallback(),
        queryParams: {
          prompt: 'select_account',
          access_type: 'online'
        }
      }
    });
    if (result.error) throw result.error;
    if (!result.data || !result.data.url) {
      throw new Error('No fue posible iniciar sesión con Google.');
    }
    window.location.assign(result.data.url);
  }

  async function logout() {
    try {
      await PlatformAuth.getClient().auth.signOut();
    } catch (e) {}
    PlatformAuth.resetClient();
    leaveWorkspace();
  }

  async function exchangeCodeIfPresent() {
    var search = new URLSearchParams(window.location.search || '');
    var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    var code = search.get('code') || hash.get('code');
    var error = search.get('error') || hash.get('error');
    if (error) {
      throw new Error(search.get('error_description') || hash.get('error_description') || error);
    }
    if (!code) return false;

    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.resetClient();
    var client = PlatformAuth.createClient({ remember: true });
    var exchanged = await client.auth.exchangeCodeForSession(code);
    if (exchanged.error) throw exchanged.error;

    try {
      var url = new URL(window.location.href);
      ['code', 'error', 'error_description', 'state'].forEach(function (k) {
        url.searchParams.delete(k);
      });
      url.hash = '';
      window.history.replaceState({}, document.title, url.pathname + url.search);
    } catch (e) {}
    return true;
  }

  function prefillSavedLogin() {
    var email = AuthStoragePrefs.getSavedLogin();
    var input = $('loginEmail');
    var remember = $('rememberLogin');
    if (input && email && !input.value) input.value = email;
    if (remember) remember.checked = AuthStoragePrefs.getRememberMe();
  }

  function wireUi() {
    var form = $('loginForm');
    if (form) {
      form.noValidate = false;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (busy) return;
        setError('');
        var email = ($('loginEmail') && $('loginEmail').value) || '';
        var password = ($('loginPassword') && $('loginPassword').value) || '';
        var remember = !!($('rememberLogin') && $('rememberLogin').checked);
        if (!String(email).trim() || !String(password)) {
          setError('Ingresa correo y contraseña.');
          return;
        }
        setBusy(true);
        try {
          var session = await loginWithPassword(email, password, remember);
          await loadAndApplyRole(session && session.user && session.user.id);
          enterWorkspace();
        } catch (err) {
          console.error('[PanelAuth] login', err);
          setError(friendlyAuthError(err));
        } finally {
          setBusy(false);
        }
      }, true);
    }

    var google = $('googleLogin');
    if (google) {
      google.addEventListener('click', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (busy) return;
        setError('');
        setBusy(true);
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error('[PanelAuth] google', err);
          setError(friendlyAuthError(err));
          setBusy(false);
        }
      }, true);
    }

    var logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        await logout();
      }, true);
    }
  }

  async function boot() {
    if (typeof window.supabase === 'undefined') {
      setError('No se cargó Supabase. Recarga la página.');
      return;
    }
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
      setError('Falta la configuración de Supabase.');
      return;
    }

    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    prefillSavedLogin();
    wireUi();

    try {
      var signout = new URLSearchParams(window.location.search || '').get('signout');
      if (signout === '1') {
        try {
          var cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('signout');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
        } catch (e) {}
        await logout();
        return;
      }
      await exchangeCodeIfPresent();
      var session = await getSession();
      if (session) {
        await loadAndApplyRole(session.user && session.user.id);
        enterWorkspace();
      } else {
        leaveWorkspace();
      }
    } catch (err) {
      console.error('[PanelAuth] boot', err);
      setError(friendlyAuthError(err));
      leaveWorkspace();
    }

    try {
      PlatformAuth.getClient().auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') leaveWorkspace();
      });
    } catch (e) {}
  }

  window.PanelAuth = {
    boot: boot,
    loginWithPassword: loginWithPassword,
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    getSession: getSession
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
