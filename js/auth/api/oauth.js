console.log("BOOT ENTER js/auth/api/oauth.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/oauth.js');}catch(_e){}
/* OAuth sign-in — Google via Supabase Auth (official SDK flow) */
var OAuthApi = (function () {
  var RETURN_STATE_KEY = 'guilie_oauth_return';
  var PROVIDERS = {
    GOOGLE: 'google'
  };

  function saveReturnState() {
    try {
      var proyecto =
        typeof getProjectSlugFromUrl === 'function'
          ? getProjectSlugFromUrl()
          : new URLSearchParams(window.location.search).get('proyecto');
      sessionStorage.setItem(RETURN_STATE_KEY, JSON.stringify({
        scrollY: window.scrollY || 0,
        navStack: typeof navStack !== 'undefined' ? navStack.slice() : [],
        hadNavStack: typeof navStack !== 'undefined' && navStack.length > 0,
        proyecto: proyecto || null
      }));
    } catch (e) {}
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
      var raw = sessionStorage.getItem(RETURN_STATE_KEY);
      sessionStorage.removeItem(RETURN_STATE_KEY);
      var state = raw ? JSON.parse(raw) : null;

      if (state && state.proyecto) {
        var params = new URLSearchParams(window.location.search);
        if (!params.get('proyecto')) {
          params.set('proyecto', state.proyecto);
          history.replaceState(null, '', window.location.pathname + '?' + params.toString() + window.location.hash);
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
    handleGoogleAuth: handleGoogleAuth,
    signInWithGoogle: handleGoogleAuth,
    startProviderSignIn: handleGoogleAuth,
    saveReturnState: saveReturnState,
    restoreUiState: restoreUiState,
    restoreReturnState: restoreUiState
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/oauth.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/oauth.js");
