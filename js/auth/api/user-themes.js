console.log("BOOT ENTER js/auth/api/user-themes.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/user-themes.js');}catch(_e){}
/* Saved user themes API — Mis temas */
var UserThemesApi = (function () {
  var SELECT = 'id, profile_id, nombre, configuracion, created_at, updated_at';

  function getClient() {
    return PlatformAuth.getClient();
  }

  function normalizeRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      profileId: row.profile_id,
      nombre: row.nombre || 'Mi tema',
      configuracion: row.configuracion || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async function listByProfile(profileId) {
    var result = await getClient()
      .from('user_saved_themes')
      .select(SELECT)
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false });

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando temas guardados');
    }
    return (result.data || []).map(normalizeRow);
  }

  async function create(profileId, payload) {
    var result = await getClient()
      .from('user_saved_themes')
      .insert({
        profile_id: profileId,
        nombre: payload.nombre || 'Mi tema',
        configuracion: payload.configuracion || {}
      })
      .select(SELECT)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo guardar el tema');
    }
    return normalizeRow(result.data);
  }

  async function update(themeId, profileId, payload) {
    var patch = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'nombre')) patch.nombre = payload.nombre;
    if (Object.prototype.hasOwnProperty.call(payload, 'configuracion')) patch.configuracion = payload.configuracion;

    var result = await getClient()
      .from('user_saved_themes')
      .update(patch)
      .eq('id', themeId)
      .eq('profile_id', profileId)
      .select(SELECT)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo actualizar el tema');
    }
    return normalizeRow(result.data);
  }

  async function remove(themeId, profileId) {
    var result = await getClient()
      .from('user_saved_themes')
      .delete()
      .eq('id', themeId)
      .eq('profile_id', profileId);

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo eliminar el tema');
    }
    return true;
  }

  function buildExportPayload(theme, profile) {
    var config = theme.configuracion || {};
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      nombre: theme.nombre,
      themeKey: config.themeKey || ThemeSystem.CUSTOM_THEME_KEY,
      background: config.bg || config.background || null,
      surface: config.surface || null,
      accent: config.accent || null,
      textMode: config.textMode || 'light',
      avatar: config.avatar || null,
      profile: profile ? {
        nombre_visible: profile.nombre_visible || profile.nombre || null,
        rol: profile.rol || PlatformRoles.ROLES.USUARIO
      } : null
    };
  }

  function downloadExport(theme, profile) {
    var payload = buildExportPayload(theme, profile);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    var safeName = String(theme.nombre || 'mi-tema')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mi-tema';
    anchor.href = url;
    anchor.download = safeName + '.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    listByProfile: listByProfile,
    create: create,
    update: update,
    remove: remove,
    buildExportPayload: buildExportPayload,
    downloadExport: downloadExport,
    normalizeRow: normalizeRow
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/user-themes.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/user-themes.js");
