/* Admin session context — populated after auth, consumed by dashboard modules */
var AdminState = (function () {
  var session = null;
  var profile = null;
  var activeProjectId = null;

  function init(authSession, authProfile) {
    session = authSession || null;
    profile = authProfile || null;
  }

  function clear() {
    session = null;
    profile = null;
    activeProjectId = null;
  }

  function getSession() {
    return session;
  }

  function getProfile() {
    return profile;
  }

  function getConstructoraId() {
    return profile ? profile.constructora_id : null;
  }

  function setActiveProjectId(projectId) {
    activeProjectId = projectId || null;
    try {
      if (projectId) {
        sessionStorage.setItem('360preventa_active_project', projectId);
      } else {
        sessionStorage.removeItem('360preventa_active_project');
      }
    } catch (e) {}
  }

  function getActiveProjectId() {
    if (activeProjectId) return activeProjectId;
    try {
      return sessionStorage.getItem('360preventa_active_project');
    } catch (e) {
      return null;
    }
  }

  function canManageContent() {
    if (!profile) return false;
    return profile.rol === 'super_admin' || profile.rol === 'admin' || profile.rol === 'editor';
  }

  function isSuperAdmin() {
    return !!(profile && profile.rol === 'super_admin');
  }

  function isAdmin() {
    if (!profile) return false;
    return profile.rol === 'admin' || profile.rol === 'super_admin';
  }

  return {
    init: init,
    clear: clear,
    getSession: getSession,
    getProfile: getProfile,
    getConstructoraId: getConstructoraId,
    setActiveProjectId: setActiveProjectId,
    getActiveProjectId: getActiveProjectId,
    canManageContent: canManageContent,
    isSuperAdmin: isSuperAdmin,
    isAdmin: isAdmin
  };
})();
