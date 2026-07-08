/* Idempotent visitor + profile provisioning after OAuth or session restore */
var VisitorProvisioningApi = (function () {
  function getProyectoSlug() {
    try {
      return new URLSearchParams(window.location.search).get('proyecto') || null;
    } catch (e) {
      return null;
    }
  }

  function extractGoogleIdentity(authUser) {
    var meta = (authUser && authUser.user_metadata) || {};
    var fullName = String(meta.full_name || meta.name || '').trim();
    var nombres = String(meta.nombres || meta.given_name || '').trim();
    var apellidos = String(meta.apellidos || meta.family_name || '').trim();

    if (!nombres && fullName) nombres = fullName.split(/\s+/)[0] || '';
    if (!apellidos && fullName && fullName.indexOf(' ') !== -1) {
      apellidos = fullName.slice(fullName.indexOf(' ') + 1).trim();
    }

    var picture = meta.avatar_url || meta.picture || null;
    var nombreVisible = String(
      meta.nombre || (nombres + ' ' + apellidos).trim() || fullName || ''
    ).trim();

    return {
      nombres: nombres,
      apellidos: apellidos,
      nombreVisible: nombreVisible || (authUser && authUser.email ? authUser.email.split('@')[0] : 'Visitante'),
      picture: picture,
      provider: 'google'
    };
  }

  async function syncPlatformProfile(authUser) {
    if (!authUser || !authUser.id) return null;

    try {
      var identity = extractGoogleIdentity(authUser);
      var platformProfile = await ProfilesApi.ensureForAuthUser(authUser);

      var patch = {};
      if (!platformProfile.nombre && identity.nombres) patch.nombre = identity.nombres;
      if (!platformProfile.apellido && identity.apellidos) patch.apellido = identity.apellidos;
      if (!platformProfile.nombre_visible && identity.nombreVisible) {
        patch.nombre_visible = identity.nombreVisible;
      }
      if (identity.picture) {
        var currentAvatar = platformProfile.avatar || {};
        if (!currentAvatar.imageUrl) {
          patch.avatar = {
            imageUrl: identity.picture,
            provider: 'google',
            source: 'google'
          };
        }
      }

      if (Object.keys(patch).length) {
        return ProfilesApi.updateProfile(authUser.id, patch);
      }

      return platformProfile;
    } catch (err) {
      console.warn('[Provisioning] platform profile', err);
      return null;
    }
  }

  async function provisionVisitanteRow() {
    var slug = getProyectoSlug();
    var client = PlatformAuth.getClient();

    var result = await client.rpc('ensure_oauth_visitor', {
      p_proyecto_slug: slug
    });

    if (!result.error) return result.data;

    console.warn('[Provisioning] ensure_oauth_visitor', result.error);

    var fallback = await client.rpc('provision_oauth_visitor', {
      proyecto_slug: slug
    });

    if (fallback.error) {
      console.warn('[Provisioning] provision_oauth_visitor', fallback.error);
      return null;
    }

    return fallback.data;
  }

  async function fetchExistingVisitante(authUser) {
    try {
      return await VisitantesApi.fetchByAuthUserId(authUser.id, authUser);
    } catch (err) {
      console.warn('[Provisioning] fetch visitante', err);
      return null;
    }
  }

  async function ensureVisitante(authUser) {
    if (!authUser || !authUser.id) return null;

    var existing = await fetchExistingVisitante(authUser);
    if (existing) return existing;

    await provisionVisitanteRow();
    return fetchExistingVisitante(authUser);
  }

  async function ensureForAuthUser(authUser) {
    if (!authUser || !authUser.id) return null;

    var platformProfile = await syncPlatformProfile(authUser);
    var visitante = await ensureVisitante(authUser);

    return VisitantesApi.buildAuthProfile(authUser, visitante, platformProfile);
  }

  return {
    ensureForAuthUser: ensureForAuthUser,
    ensureVisitante: ensureVisitante,
    syncPlatformProfile: syncPlatformProfile,
    extractGoogleIdentity: extractGoogleIdentity
  };
})();
