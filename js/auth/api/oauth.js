try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/oauth.js');}catch(_e){}
/* OAuth sign-in — Google via Supabase Auth (official SDK flow) */
var OAuthApi = (function () {
  var RETURN_STATE_KEY = 'guilie_oauth_return';
  var PROVIDERS = {
    GOOGLE: 'google'
  };

  function originSafe() {
    return window.location.origin || '';
  }

  function isSafeReturnPath(path) {
    if (!path || typeof path !== 'string') return false;
    if (path.charAt(0) !== '/') return false;
    if (path.indexOf('//') === 0) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
    if (path === '/') return false;
    if (/^\/index\.html$/i.test(path)) return false;
    if (path.indexOf('/auth/') === 0) return false;
    return true;
  }

  function currentReturnPath() {
    var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    if (path === '/' || /^\/index\.html$/i.test(path)) {
      var slug =
        typeof getProjectSlugFromUrl === 'function'
          ? getProjectSlugFromUrl()
          : new URLSearchParams(window.location.search).get('proyecto');
      if (slug) return '/' + String(slug).replace(/^\/+/, '');
      return null;
    }
    return path;
  }

  function writeReturnState(state) {
    var raw = JSON.stringify(state);
    try { sessionStorage.setItem(RETURN_STATE_KEY, raw); } catch (e) {}
    try { localStorage.setItem(RETURN_STATE_KEY, raw); } catch (e) {}
  }

  function readReturnStateRaw() {
    try {
      var fromSession = sessionStorage.getItem(RETURN_STATE_KEY);
      if (fromSession) return fromSession;
    } catch (e) {}
    try {
      return localStorage.getItem(RETURN_STATE_KEY);
    } catch (e2) {
      return null;
    }
  }

  function clearReturnState() {
    try { sessionStorage.removeItem(RETURN_STATE_KEY); } catch (e) {}
    try { localStorage.removeItem(RETURN_STATE_KEY); } catch (e2) {}
  }

  function saveReturnState() {
    try {
      var returnPath = currentReturnPath();
      if (!isSafeReturnPath(returnPath)) return;
      writeReturnState({
        scrollY: window.scrollY || 0,
        navStack: typeof navStack !== 'undefined' ? navStack.slice() : [],
        hadNavStack: typeof navStack !== 'undefined' && navStack.length > 0,
        returnPath: returnPath
      });
    } catch (e) {}
  }

  function hasReturnState() {
    return !!readReturnStateRaw();
  }

  function peekReturnPath() {
    try {
      var raw = readReturnStateRaw();
      var state = raw ? JSON.parse(raw) : null;
      if (state && isSafeReturnPath(state.returnPath)) return state.returnPath;
      if (state && state.proyecto) {
        var legacy = '/' + String(state.proyecto).replace(/^\/+/, '');
        if (isSafeReturnPath(legacy)) return legacy;
      }
    } catch (e) {}
    return null;
  }

  function restoreNavStack(screens) {
    if (!screens || !screens.length || typeof goTo !== 'function') return;
    screens.forEach(function (screenId) {
      goTo(screenId);
    });
  }

  function restoreUiState(options) {
    options = options || {};
    if (options.enterProject &&
        typeof window.shouldBlockAutoMenuOpen === 'function' &&
        window.shouldBlockAutoMenuOpen() &&
        typeof window.canOpenMenuWithoutGesture === 'function' &&
        !window.canOpenMenuWithoutGesture()) {
      options.enterProject = false;
    }
    try {
      var raw = readReturnStateRaw();
      clearReturnState();
      var state = raw ? JSON.parse(raw) : null;

      if (state) {
        var targetPath = null;
        if (isSafeReturnPath(state.returnPath)) {
          targetPath = state.returnPath;
        } else if (state.proyecto) {
          var legacyPath = '/' + String(state.proyecto).replace(/^\/+/, '');
          if (isSafeReturnPath(legacyPath)) targetPath = legacyPath;
        }

        if (targetPath) {
          var currentPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
          var normalizedTarget = targetPath.replace(/\/+$/, '') || '/';
          if (currentPath !== normalizedTarget) {
            window.location.replace(originSafe() + targetPath);
            return;
          }
        }
      }

      if (!state) {
        if (options.enterProject && typeof goTo === 'function') {
          if (typeof window.allowProgrammaticNavOpen === 'function') {
            window.allowProgrammaticNavOpen(3000);
          }
          goTo('menu-primary');
        }
        return;
      }

      if (state.hadNavStack && state.navStack && state.navStack.length) {
        if (typeof window.allowProgrammaticNavOpen === 'function') {
          window.allowProgrammaticNavOpen(3000);
        }
        restoreNavStack(state.navStack);
      } else if (options.enterProject && typeof goTo === 'function') {
        if (typeof window.allowProgrammaticNavOpen === 'function') {
          window.allowProgrammaticNavOpen(3000);
        }
        goTo('menu-primary');
      }

      if (state.scrollY) {
        requestAnimationFrame(function () {
          window.scrollTo(0, state.scrollY);
        });
      }

      if (typeof syncNavigationCloseState === 'function') {
        syncNavigationCloseState();
      }
    } catch (e) {}
  }

  async function handleGoogleAuth() {
    saveReturnState();
    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.resetClient();
    var supabase = PlatformAuth.createClient({ remember: true });

    var result = await supabase.auth.signInWithOAuth({
      provider: PROVIDERS.GOOGLE,
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
      throw new Error('No fue posible iniciar sesión con Google.\nInténtalo nuevamente.');
    }

    window.location.assign(result.data.url);
    return result.data;
  }

  return {
    PROVIDERS: PROVIDERS,
    RETURN_STATE_KEY: RETURN_STATE_KEY,
    handleGoogleAuth: handleGoogleAuth,
    signInWithGoogle: handleGoogleAuth,
    startProviderSignIn: handleGoogleAuth,
    saveReturnState: saveReturnState,
    restoreUiState: restoreUiState,
    restoreReturnState: restoreUiState,
    hasReturnState: hasReturnState,
    peekReturnPath: peekReturnPath,
    isSafeReturnPath: isSafeReturnPath
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/oauth.js');}catch(_e){}
