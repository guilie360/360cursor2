/* Platform admin builder — same session as showroom (PlatformAuth / profiles.rol) */
(function () {
  /**
   * AuthBootstrap.restoreUiState redirects to OAuth returnPath (e.g. /demo1).
   * That bounces Administrar back to the showroom. Clear hostile return state first.
   */
  function clearHostileOAuthReturnState() {
    if (typeof OAuthApi === 'undefined') return;
    try {
      var peek = typeof OAuthApi.peekReturnPath === 'function' ? OAuthApi.peekReturnPath() : null;
      if (!peek) return;
      var path = String(peek);
      if (/\/admin(\/|$)/i.test(path) || /ai-project-builder/i.test(path) || /\/admin2/i.test(path)) {
        return;
      }
      console.warn('[Builder] clearing OAuth returnPath that would leave builder:', path);
      if (typeof OAuthApi.clearReturnState === 'function') OAuthApi.clearReturnState();
    } catch (e) {
      console.warn('[Builder] clearHostileOAuthReturnState', e);
    }
  }

  async function resolveAdminProfile() {
    if (typeof VisitorSession !== 'undefined') {
      await VisitorSession.refresh();
    }

    var profile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    if (profile && PlatformRoles.isPlatformAdmin(profile)) {
      return profile;
    }

    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
    if (!user || !user.id || typeof ProfilesApi === 'undefined') {
      return profile;
    }

    try {
      var platformProfile = await ProfilesApi.fetchById(user.id);
      if (!platformProfile || !PlatformRoles.isPlatformAdmin(platformProfile)) {
        return profile;
      }

      if (profile) {
        profile.platformProfile = platformProfile;
        profile.rol = platformProfile.rol;
        profile.permisos = platformProfile.permisos;
        return profile;
      }

      return VisitantesApi.buildAuthProfile(user, null, platformProfile);
    } catch (err) {
      console.warn('[Builder] resolveAdminProfile', err);
      return profile;
    }
  }

  function returnToShowroom() {
    var home = '../index.html';
    try {
      home = new URL('../index.html', window.location.href).href;
      var proyecto = new URLSearchParams(window.location.search).get('proyecto');
      if (proyecto) {
        /* Prefer pretty slug URL when available */
        home = new URL('../' + encodeURIComponent(proyecto), window.location.href).href;
      }
    } catch (e) {}
    window.location.replace(home);
  }

  async function requirePlatformAdmin() {
    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.whenReady === 'function') {
      await AuthBootstrap.whenReady();
    }

    var profile = await resolveAdminProfile();
    if (!profile || !PlatformRoles.isPlatformAdmin(profile)) {
      console.warn('[Builder] access denied — not platform admin; returning to showroom');
      returnToShowroom();
      return null;
    }
    return profile;
  }

  async function start() {
    var profile = await requirePlatformAdmin();
    if (!profile) return;

    try {
      await PlatformBuilderBridge.init();
    } catch (err) {
      console.error('[Builder]', err);
    }

    var root = document.getElementById('builderRoot');
    if (root && typeof AiProjectBuilderView !== 'undefined') {
      await AiProjectBuilderView.render(root);
    }
  }

  async function boot() {
    clearHostileOAuthReturnState();

    if (typeof HallDesignSystem !== 'undefined') {
      HallDesignSystem.paint({ persist: false });
    }

    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.init === 'function') {
      await AuthBootstrap.init();
    } else if (typeof VisitorSession !== 'undefined') {
      await VisitorSession.refresh();
    }

    await start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot().catch(function (err) {
        console.error('[Builder] boot', err);
      });
    });
  } else {
    boot().catch(function (err) {
      console.error('[Builder] boot', err);
    });
  }
})();
