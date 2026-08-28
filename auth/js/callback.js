/* OAuth callback — exchange PKCE code, then return to saved path (showroom or /boxies) */
(function () {
  var RETURN_STATE_KEY = 'guilie_oauth_return';
  var statusEl = document.getElementById('status');

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.className = isError ? 'err' : 'msg';
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

  function readReturnPath() {
    var raw = null;
    try { raw = sessionStorage.getItem(RETURN_STATE_KEY); } catch (e) {}
    if (!raw) {
      try { raw = localStorage.getItem(RETURN_STATE_KEY); } catch (e2) {}
    }
    if (!raw) return null;
    try {
      var state = JSON.parse(raw);
      if (state && isSafeReturnPath(state.returnPath)) return state.returnPath;
      if (state && state.proyecto) {
        var legacy = '/' + String(state.proyecto).replace(/^\/+/, '');
        if (isSafeReturnPath(legacy)) return legacy;
      }
    } catch (e3) {}
    return null;
  }

  async function exchangeSession() {
    AuthStoragePrefs.setRememberMe(true);
    PlatformAuth.resetClient();
    var client = PlatformAuth.createClient({ remember: true });

    var search = new URLSearchParams(window.location.search || '');
    var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    var code = search.get('code') || hash.get('code');
    var error = search.get('error') || hash.get('error');

    if (error) {
      throw new Error(search.get('error_description') || hash.get('error_description') || error);
    }

    if (code) {
      var exchanged = await client.auth.exchangeCodeForSession(code);
      if (exchanged.error) throw exchanged.error;
      return;
    }

    var sessionResult = await client.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data || !sessionResult.data.session) {
      throw new Error('No fue posible completar el inicio de sesión con Google.');
    }
  }

  async function run() {
    var returnPath = readReturnPath();

    try {
      /* Always exchange first — never abandon the OAuth code. */
      await exchangeSession();

      if (!returnPath) {
        /* Last-resort platform surface (never "/" — htaccess remaps to a showroom). */
        returnPath = '/boxies/';
        console.warn('[OAuth callback] missing returnPath — falling back to /boxies/');
      }

      window.location.replace((window.location.origin || '') + returnPath);
    } catch (err) {
      console.error('[OAuth callback]', err);
      setStatus(
        (err && err.message) || 'No fue posible completar el inicio de sesión.',
        true
      );
    }
  }

  run();
})();
