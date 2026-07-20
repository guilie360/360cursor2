console.log("BOOT ENTER js/auth/visitor-auth.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/visitor-auth.js');}catch(_e){}
/* Visitor authentication orchestration */
var VisitorAuth = (function () {
  var session = null;
  var user = null;
  var profile = null;

  function clearState() {
    session = null;
    user = null;
    profile = null;
  }

  function isEmailConfirmed(authUser) {
    if (!authUser) return false;
    return !!(authUser.email_confirmed_at || authUser.confirmed_at);
  }

  function readUrlAuthParams() {
    var search = new URLSearchParams(window.location.search || '');
    var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    return {
      code: search.get('code') || hash.get('code'),
      error: search.get('error') || hash.get('error'),
      errorDescription: search.get('error_description') || hash.get('error_description')
    };
  }

  function isOAuthCallbackUrl() {
    var params = readUrlAuthParams();
    return !!(params.code || params.error);
  }

  function cleanOAuthUrl() {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    ['code', 'error', 'error_description', 'state'].forEach(function (key) {
      url.searchParams.delete(key);
    });
    url.hash = '';
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  function applyOAuthProfileExtras(authUser) {
    if (!authUser) return;
    var identity = VisitorProvisioningApi.extractGoogleIdentity(authUser);
    if (identity.picture && typeof VisitorPersonalization !== 'undefined' &&
        typeof VisitorPersonalization.setAvatarImageUrl === 'function') {
      VisitorPersonalization.setAvatarImageUrl(identity.picture);
    }
  }

  async function loadVisitorProfile() {
    if (!user) return null;

    profile = await VisitorProvisioningApi.ensureForAuthUser(user);
    if (!profile) {
      profile = VisitantesApi.buildAuthProfile(user, null, null);
    }

    return profile;
  }

  async function getSession() {
    var result = await PlatformAuth.getClient().auth.getSession();
    if (result.error) throw result.error;
    session = result.data.session || null;
    user = session ? session.user : null;
    if (!session) profile = null;
    return session;
  }

  async function finalizeAuthenticatedSession(activeSession) {
    if (!activeSession || !activeSession.user) {
      throw new Error('No hay sesión activa.');
    }

    session = activeSession;
    user = session.user;

    await loadVisitorProfile();
    applyOAuthProfileExtras(user);

    if (profile && profile.id) {
      try {
        await VisitantesApi.touchActivity(profile.id, user.id);
      } catch (err) {
        console.warn('[Auth] touchActivity', err);
      }
    }

    if (user.email) AuthStoragePrefs.setSavedLogin(user.email);

    return { session: session, user: user, profile: profile };
  }

  async function completeOAuthCallback() {
    var params = readUrlAuthParams();
    if (!params.code) return null;

    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.resetClient();
    var client = PlatformAuth.createClient({ remember: true });
    var activeSession = null;

    try {
      var exchanged = await client.auth.exchangeCodeForSession(params.code);
      if (exchanged.error) {
        console.warn('[OAuth] exchangeCodeForSession', exchanged.error);
        var recovered = await client.auth.getSession();
        if (recovered.error) throw exchanged.error;
        activeSession = recovered.data.session;
        if (!activeSession) throw exchanged.error;
      } else {
        activeSession = exchanged.data && exchanged.data.session;
        if (!activeSession) {
          var sessionResult = await client.auth.getSession();
          if (sessionResult.error) throw sessionResult.error;
          activeSession = sessionResult.data.session;
        }
      }
    } finally {
      cleanOAuthUrl();
    }

    if (!activeSession) return null;

    return finalizeAuthenticatedSession(activeSession);
  }

  async function recoverOAuthSession() {
    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.createClient({ remember: true });

    try {
      var result = await PlatformAuth.getClient().auth.getSession();
      if (result.error || !result.data.session) return null;
      cleanOAuthUrl();
      return finalizeAuthenticatedSession(result.data.session);
    } catch (err) {
      console.warn('[OAuth] recoverOAuthSession', err);
      return null;
    }
  }

  async function login(loginInput, password, remember) {
    clearState();
    AuthStoragePrefs.setRememberMe(!!remember);
    PlatformAuth.resetClient();
    PlatformAuth.createClient({ remember: !!remember });

    var email = await LoginApi.resolveLoginEmail(loginInput);

    var result = await PlatformAuth.getClient().auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) throw result.error;

    return finalizeAuthenticatedSession(result.data.session);
  }

  async function logout() {
    try {
      await PlatformAuth.getClient().auth.signOut();
    } catch (e) {}
    clearState();
    PlatformAuth.resetClient();
  }

  async function requireSession() {
    await getSession();
    if (!session) {
      window.location.replace(AuthRedirects.ingresar());
      return null;
    }

    try {
      await loadVisitorProfile();
      return { session: session, user: user, profile: profile };
    } catch (err) {
      console.error('[Auth] requireSession', err);
      return { session: session, user: user, profile: profile };
    }
  }

  async function redirectIfAuthenticated() {
    await getSession();
    if (!session) return false;
    try {
      await loadVisitorProfile();
      window.location.replace(AuthRouter.destinationFor(profile));
      return true;
    } catch (e) {
      console.warn('[Auth] redirectIfAuthenticated', e);
      return false;
    }
  }

  async function resetPassword(loginInput) {
    var email = await LoginApi.resolveLoginEmail(loginInput);
    var result = await PlatformAuth.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: AuthRedirects.resetPassword()
    });
    if (result.error) throw result.error;
    return email;
  }

  async function updatePassword(newPassword) {
    var result = await PlatformAuth.getClient().auth.updateUser({ password: newPassword });
    if (result.error) throw result.error;
    user = result.data.user;
    return user;
  }

  async function resendConfirmation(emailOrLogin) {
    var email = await LoginApi.resolveLoginEmail(emailOrLogin);
    var result = await PlatformAuth.getClient().auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: AuthRedirects.confirmEmail() }
    });
    if (result.error) throw result.error;
    return email;
  }

  async function handleRecoverySession() {
    PlatformAuth.createClient({ remember: false });
    var result = await PlatformAuth.getClient().auth.getSession();
    return result.data.session;
  }

  function onAuthStateChange(callback) {
    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    return PlatformAuth.getClient().auth.onAuthStateChange(function (event, newSession) {
      session = newSession;
      user = newSession ? newSession.user : null;
      if (!newSession) profile = null;
      callback(event, newSession);
    });
  }

  function getIdentityProviders(authUser) {
    authUser = authUser || user;
    if (!authUser) return [];
    if (Array.isArray(authUser.identities) && authUser.identities.length) {
      return authUser.identities.map(function (identity) {
        return identity.provider;
      });
    }
    if (authUser.app_metadata && authUser.app_metadata.provider) {
      return [authUser.app_metadata.provider];
    }
    return [];
  }

  function hasPasswordIdentity(authUser) {
    return getIdentityProviders(authUser).indexOf('email') !== -1;
  }

  function getAuthMethodLabel(authUser) {
    var providers = getIdentityProviders(authUser);
    var labels = [];
    if (providers.indexOf('google') !== -1) labels.push('Google');
    if (providers.indexOf('email') !== -1) labels.push('Contraseña');
    return labels.length ? labels.join(' + ') : 'Desconocido';
  }

  async function handleOAuthCallback() {
    return completeOAuthCallback();
  }

  return {
    getSession: getSession,
    loadVisitorProfile: loadVisitorProfile,
    login: login,
    logout: logout,
    requireSession: requireSession,
    redirectIfAuthenticated: redirectIfAuthenticated,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    resendConfirmation: resendConfirmation,
    handleRecoverySession: handleRecoverySession,
    handleOAuthCallback: handleOAuthCallback,
    completeOAuthCallback: completeOAuthCallback,
    recoverOAuthSession: recoverOAuthSession,
    finalizeAuthenticatedSession: finalizeAuthenticatedSession,
    readUrlAuthParams: readUrlAuthParams,
    isOAuthCallbackUrl: isOAuthCallbackUrl,
    cleanOAuthUrl: cleanOAuthUrl,
    isEmailConfirmed: isEmailConfirmed,
    getIdentityProviders: getIdentityProviders,
    hasPasswordIdentity: hasPasswordIdentity,
    getAuthMethodLabel: getAuthMethodLabel,
    onAuthStateChange: onAuthStateChange,
    getProfile: function () { return profile; },
    getUser: function () { return user; },
    getSessionData: function () { return session; }
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/visitor-auth.js');}catch(_e){}

console.log("BOOT EXIT js/auth/visitor-auth.js");
