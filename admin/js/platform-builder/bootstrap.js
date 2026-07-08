/* Platform admin builder page bootstrap — profiles.rol = admin only */
(function () {
  async function resolveAdminProfile() {
    if (typeof VisitorSession !== 'undefined') {
      await VisitorSession.refresh();
    }

    var profile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    if (profile && PlatformRoles.isAdmin(profile)) {
      return profile;
    }

    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
    if (!user || !user.id || typeof ProfilesApi === 'undefined') {
      return profile;
    }

    try {
      var platformProfile = await ProfilesApi.fetchById(user.id);
      if (!platformProfile || platformProfile.rol !== PlatformRoles.ROLES.ADMIN) {
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

  async function requirePlatformAdmin() {
    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.whenReady === 'function') {
      await AuthBootstrap.whenReady();
    }

    var profile = await resolveAdminProfile();
    if (!profile || !PlatformRoles.isAdmin(profile)) {
      var home = '../index.html';
      try {
        home = new URL('../index.html', window.location.href).href;
        var proyecto = new URLSearchParams(window.location.search).get('proyecto');
        if (proyecto) {
          var homeUrl = new URL(home);
          homeUrl.searchParams.set('proyecto', proyecto);
          home = homeUrl.href;
        }
      } catch (e) {}
      window.location.replace(home);
      return null;
    }
    return profile;
  }

  function bindBackButton() {
    /* Back navigation lives in builder topbar (#builderBackInlineBtn) */
  }

  async function start() {
    var profile = await requirePlatformAdmin();
    if (!profile) return;

    try {
      await PlatformBuilderBridge.init();
    } catch (err) {
      console.error('[Builder]', err);
    }

    bindBackButton();

    var root = document.getElementById('builderRoot');
    if (root && typeof AiProjectBuilderView !== 'undefined') {
      await AiProjectBuilderView.render(root);
    }
  }

  if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.init === 'function') {
    AuthBootstrap.init().then(start);
  } else {
    start();
  }
})();
