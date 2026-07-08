/* Admin API — user profile (usuarios_constructora) */
var ProfileApi = (function () {
  var PROFILE_SELECT = 'id, nombre, email, rol, estado, constructora_id, telefono, cargo, constructoras(nombre, slug)';

  async function fetchByAuthUserId(authUserId) {
    var result = await AdminApi.getClient()
      .from('usuarios_constructora')
      .select(PROFILE_SELECT)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    return AdminApi.unwrap(result, 'Error cargando perfil');
  }

  return {
    fetchByAuthUserId: fetchByAuthUserId
  };
})();
