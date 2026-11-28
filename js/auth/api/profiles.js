try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/profiles.js');}catch(_e){}
/* Platform profiles API — roles, permissions, tema_actual */
var ProfilesApi = (function () {
  var SELECT = 'id, nombre, apellido, nombre_visible, avatar, tema_actual, rol, permisos, created_at, updated_at';

  function getClient() {
    return PlatformAuth.getClient();
  }

  function normalizeRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre || '',
      apellido: row.apellido || '',
      nombre_visible: row.nombre_visible || '',
      avatar: row.avatar || {},
      tema_actual: row.tema_actual || {},
      rol: row.rol || PlatformRoles.ROLES.USUARIO,
      permisos: Object.assign({}, PlatformPermissions.DEFAULT_PERMISSIONS, row.permisos || {}),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async function fetchById(profileId) {
    var result = await getClient()
      .from('profiles')
      .select(SELECT)
      .eq('id', profileId)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando perfil de plataforma');
    }
    return normalizeRow(result.data);
  }

  async function ensureForAuthUser(authUser) {
    if (!authUser || !authUser.id) return null;

    var existing = await fetchById(authUser.id);
    var meta = authUser.user_metadata || {};
    var fullName = String(meta.full_name || meta.name || '').trim();
    var nombre = String(meta.nombres || meta.given_name || '').trim();
    var apellido = String(meta.apellidos || meta.family_name || '').trim();

    if (!nombre && fullName) nombre = fullName.split(/\s+/)[0] || '';
    if (!apellido && fullName && fullName.indexOf(' ') !== -1) {
      apellido = fullName.slice(fullName.indexOf(' ') + 1).trim();
    }

    var nombreVisible = String(meta.nombre || (nombre + ' ' + apellido).trim() || fullName).trim();
    var picture = meta.avatar_url || meta.picture || null;
    var avatar = picture ? { imageUrl: picture, provider: 'google', source: 'google' } : {};

    if (existing) return existing;

    var insert = await getClient()
      .from('profiles')
      .insert({
        id: authUser.id,
        nombre: nombre,
        apellido: apellido,
        nombre_visible: nombreVisible,
        avatar: avatar,
        rol: PlatformRoles.ROLES.USUARIO,
        permisos: PlatformPermissions.DEFAULT_PERMISSIONS
      })
      .select(SELECT)
      .maybeSingle();

    if (insert.error) {
      if (insert.error.code === '23505') {
        return fetchById(authUser.id);
      }
      console.error('[Profiles] insert', insert.error);
      throw new Error('No se pudo crear el perfil de plataforma');
    }

    return normalizeRow(insert.data);
  }

  async function updateProfile(profileId, patch) {
    var allowed = ['nombre', 'apellido', 'nombre_visible', 'avatar', 'tema_actual'];
    var payload = {};
    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        payload[key] = patch[key];
      }
    });

    if (Object.keys(payload).length === 0) {
      return fetchById(profileId);
    }

    var result = await getClient()
      .from('profiles')
      .update(payload)
      .eq('id', profileId)
      .select(SELECT)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Error actualizando perfil');
    }
    return normalizeRow(result.data);
  }

  async function updateTemaActual(profileId, temaActual) {
    return updateProfile(profileId, { tema_actual: temaActual || {} });
  }

  return {
    fetchById: fetchById,
    ensureForAuthUser: ensureForAuthUser,
    updateProfile: updateProfile,
    updateTemaActual: updateTemaActual,
    normalizeRow: normalizeRow
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/profiles.js');}catch(_e){}
