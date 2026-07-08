/* Visitor profile API */
var VisitantesApi = (function () {
  var SELECT =
    'id, auth_user_id, constructora_id, primer_proyecto_id, created_at, ultima_actividad, ' +
    'nombres, apellidos, login, telefono, ciudad, presupuesto, tipo_vivienda_deseado, interes_financiacion, terminos_aceptados_at, ' +
    'constructoras(nombre, slug), ' +
    'proyectos:primer_proyecto_id(nombre, slug)';

  function getClient() {
    return PlatformAuth.getClient();
  }

  function formatPresupuesto(value) {
    if (value === null || value === undefined || value === '') return null;
    var num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }

  function enrichProfile(row, authUser, platformProfile) {
    if (!row) return null;
    var profile = Object.assign({}, row);
    profile.accountType = 'visitante';
    profile.email = authUser ? authUser.email : profile.email;
    profile.nombre = [profile.nombres, profile.apellidos].filter(Boolean).join(' ').trim();
    if (!profile.nombre && authUser && authUser.user_metadata) {
      profile.nombre = authUser.user_metadata.nombre || profile.email;
    }
    profile.presupuestoLabel = formatPresupuesto(profile.presupuesto);
    if (platformProfile) {
      profile.platformProfile = platformProfile;
      profile.rol = platformProfile.rol;
      profile.permisos = platformProfile.permisos;
      profile.nombre_visible = platformProfile.nombre_visible;
      profile.tema_actual = platformProfile.tema_actual;
    }
    profile.visitantePending = false;
    return profile;
  }

  function buildAuthProfile(authUser, visitanteRow, platformProfile) {
    if (visitanteRow) {
      return enrichProfile(visitanteRow, authUser, platformProfile);
    }
    if (!authUser) return null;

    var meta = authUser.user_metadata || {};
    var fullName = String(meta.full_name || meta.name || meta.nombre || '').trim();
    var nombres = String(meta.nombres || meta.given_name || '').trim();
    var apellidos = String(meta.apellidos || meta.family_name || '').trim();

    if (!nombres && fullName) nombres = fullName.split(/\s+/)[0] || '';
    if (!apellidos && fullName && fullName.indexOf(' ') !== -1) {
      apellidos = fullName.slice(fullName.indexOf(' ') + 1).trim();
    }

    var nombre = String(
      meta.nombre || (nombres + ' ' + apellidos).trim() || fullName || ''
    ).trim();

    var profile = {
      id: null,
      auth_user_id: authUser.id,
      accountType: 'visitante',
      email: authUser.email || '',
      nombres: nombres,
      apellidos: apellidos,
      nombre: nombre || (authUser.email ? authUser.email.split('@')[0] : 'Visitante'),
      login: meta.login || (authUser.email ? authUser.email.split('@')[0] : ''),
      visitantePending: true
    };

    if (platformProfile) {
      profile.platformProfile = platformProfile;
      profile.rol = platformProfile.rol;
      profile.permisos = platformProfile.permisos;
      profile.nombre_visible = platformProfile.nombre_visible;
      profile.tema_actual = platformProfile.tema_actual;
      if (!profile.nombres && platformProfile.nombre) profile.nombres = platformProfile.nombre;
      if (!profile.apellidos && platformProfile.apellido) profile.apellidos = platformProfile.apellido;
      if (!profile.nombre && platformProfile.nombre_visible) profile.nombre = platformProfile.nombre_visible;
    }

    return profile;
  }

  async function fetchByAuthUserId(authUserId, authUser) {
    var result = await getClient()
      .from('visitantes')
      .select(SELECT)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (result.error) {
      console.error('[Visitantes] fetch', result.error);
      throw new Error('Error cargando perfil de visitante');
    }
    return enrichProfile(result.data, authUser);
  }

  async function touchActivity(visitorId, authUserId) {
    var result = await getClient()
      .from('visitantes')
      .update({ ultima_actividad: new Date().toISOString() })
      .eq('id', visitorId)
      .eq('auth_user_id', authUserId);

    if (result.error) {
      throw new Error(result.error.message || 'Error actualizando actividad');
    }
    return true;
  }

  async function updateProfile(visitorId, authUserId, payload) {
    var patch = {};
    var allowed = [
      'nombres', 'apellidos', 'telefono', 'ciudad', 'presupuesto',
      'tipo_vivienda_deseado', 'interes_financiacion'
    ];

    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        patch[key] = payload[key];
      }
    });

    if (Object.keys(patch).length === 0) {
      throw new Error('No hay cambios para guardar.');
    }

    var result = await getClient()
      .from('visitantes')
      .update(patch)
      .eq('id', visitorId)
      .eq('auth_user_id', authUserId)
      .select(SELECT)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Error guardando perfil');
    }
    return enrichProfile(result.data, null);
  }

  return {
    fetchByAuthUserId: fetchByAuthUserId,
    touchActivity: touchActivity,
    updateProfile: updateProfile,
    enrichProfile: enrichProfile,
    buildAuthProfile: buildAuthProfile,
    formatPresupuesto: formatPresupuesto
  };
})();
