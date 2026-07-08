/* Admin API base — shared error handling for all CRUD modules */
var AdminApi = (function () {
  function getClient() {
    return AdminSupabase.getClient();
  }

  function unwrap(result, fallbackMessage) {
    if (result.error) {
      throw new Error(result.error.message || fallbackMessage || 'Error de API');
    }
    return result.data;
  }

  function assertActiveProfile(profile) {
    if (!profile) {
      throw new Error('Tu usuario no está registrado en el panel administrativo.');
    }
    if (profile.estado !== 'activo') {
      throw new Error('Tu cuenta está inactiva. Contacta al administrador.');
    }
    return profile;
  }

  return {
    getClient: getClient,
    unwrap: unwrap,
    assertActiveProfile: assertActiveProfile
  };
})();
