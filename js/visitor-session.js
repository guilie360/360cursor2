console.log("BOOT ENTER js/visitor-session.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/visitor-session.js');}catch(_e){}
/* Visitor session on public showroom — no redirects */
var VisitorSession = (function () {
  var ready = false;
  var authenticated = false;
  var profile = null;
  var favoriteViviendaIds = [];

  function isReady() {
    return ready;
  }

  function isAuthenticated() {
    return authenticated;
  }

  function getProfile() {
    return profile;
  }

  function getFavoriteViviendaIds() {
    return favoriteViviendaIds.slice();
  }

  function setFavoriteViviendaIds(ids) {
    favoriteViviendaIds = (ids || []).slice();
    if (typeof window.onVisitorFavoritesChanged === 'function') {
      window.onVisitorFavoritesChanged(favoriteViviendaIds);
    }
  }

  async function loadFavorites() {
    if (!profile) {
      setFavoriteViviendaIds([]);
      return [];
    }
    var ids = await FavoritosApi.listViviendaIds(profile.id);
    setFavoriteViviendaIds(ids);
    return ids;
  }

  function notifySessionChanged(payload) {
    if (typeof window.onVisitorSessionChanged === 'function') {
      window.onVisitorSessionChanged(payload);
    }
  }

  async function syncFromAuth(auth) {
    profile = auth && auth.profile ? auth.profile : null;
    authenticated = !!(auth && auth.user);
    ready = true;

    if (typeof VisitorPersonalization !== 'undefined') {
      VisitorPersonalization.loadForVisitor(profile);
    }

    if (authenticated) {
      if (profile && profile.id) {
        await loadFavorites();
      } else {
        setFavoriteViviendaIds([]);
      }
    } else {
      setFavoriteViviendaIds([]);
    }

    notifySessionChanged(authenticated ? { profile: profile, user: auth.user } : null);
    return auth;
  }

  async function refresh() {
    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });

    try {
      await VisitorAuth.getSession();
    } catch (err) {
      console.error('[Session] getSession', err);
      authenticated = false;
      profile = null;
      ready = true;
      notifySessionChanged(null);
      return null;
    }

    var user = VisitorAuth.getUser();
    if (!user) {
      authenticated = false;
      profile = null;
      setFavoriteViviendaIds([]);
      ready = true;
      notifySessionChanged(null);
      return null;
    }

    try {
      profile = await VisitorAuth.loadVisitorProfile();
      authenticated = true;
      ready = true;

      if (typeof VisitorPersonalization !== 'undefined') {
        VisitorPersonalization.loadForVisitor(profile);
      }

      if (profile && profile.id) {
        await loadFavorites();
      } else {
        setFavoriteViviendaIds([]);
      }

      notifySessionChanged({ profile: profile, user: user });

      if (typeof window.refreshVisitorMenuProfile === 'function') {
        window.refreshVisitorMenuProfile();
      }

      return { profile: profile, user: user };
    } catch (err) {
      console.warn('[Session] loadVisitorProfile', err);
      profile = VisitantesApi.buildAuthProfile(user, null, null);
      authenticated = true;
      ready = true;
      setFavoriteViviendaIds([]);
      notifySessionChanged({ profile: profile, user: user });
      return { profile: profile, user: user };
    }
  }

  async function afterLogin(auth) {
    return syncFromAuth(auth);
  }

  async function afterLogout() {
    authenticated = false;
    profile = null;
    setFavoriteViviendaIds([]);

    if (typeof VisitorPersonalization !== 'undefined') {
      VisitorPersonalization.clearVisitorBinding();
    }

    if (typeof ThemeSystem !== 'undefined' && typeof ProjectThemeAuthority !== 'undefined') {
      ProjectThemeAuthority.reapplyIfNeeded();
    } else if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.loadStored === 'function') {
      ThemeSystem.loadStored();
    }

    notifySessionChanged(null);

    if (typeof window.onVisitorPersonalizationChanged === 'function') {
      window.onVisitorPersonalizationChanged();
    }
  }

  async function logout() {
    await VisitorAuth.logout();
    await afterLogout();
    if (typeof showMenuLevel === 'function') {
      showMenuLevel('primary');
    }
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
  }

  async function toggleFavoriteVivienda(viviendaId) {
    if (!profile) throw new Error('Inicia sesión para guardar favoritos.');
    var ids = getFavoriteViviendaIds();
    var isFav = ids.indexOf(viviendaId) !== -1;
    if (isFav) {
      await FavoritosApi.remove(profile.id, viviendaId);
      setFavoriteViviendaIds(ids.filter(function (id) { return id !== viviendaId; }));
      return false;
    }
    await FavoritosApi.add(profile.id, viviendaId);
    ids.push(viviendaId);
    setFavoriteViviendaIds(ids);
    return true;
  }

  function profileHref() {
    return AuthRedirects.cuenta();
  }

  function displayName() {
    if (typeof VisitorPersonalization !== 'undefined' && profile) {
      return VisitorPersonalization.getDisplayName();
    }
    if (!profile) return '';
    return profile.nombres || profile.login || profile.nombre || 'Visitante';
  }

  function initials() {
    var name = displayName();
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  return {
    isReady: isReady,
    isAuthenticated: isAuthenticated,
    getProfile: getProfile,
    getFavoriteViviendaIds: getFavoriteViviendaIds,
    refresh: refresh,
    syncFromAuth: syncFromAuth,
    afterLogin: afterLogin,
    afterLogout: afterLogout,
    logout: logout,
    loadFavorites: loadFavorites,
    toggleFavoriteVivienda: toggleFavoriteVivienda,
    profileHref: profileHref,
    displayName: displayName,
    initials: initials
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/visitor-session.js');}catch(_e){}

console.log("BOOT EXIT js/visitor-session.js");
