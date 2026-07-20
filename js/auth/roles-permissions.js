console.log("BOOT ENTER js/auth/roles-permissions.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/roles-permissions.js');}catch(_e){}
/* Platform roles and permissions — showroom architecture */
var PlatformRoles = (function () {
  var ROLES = {
    USUARIO: 'usuario',
    ASESOR: 'asesor',
    ADMIN: 'admin'
  };

  var ROLE_LABELS = {
    usuario: 'Usuario',
    asesor: 'Asesor',
    admin: 'Administrador'
  };

  function getPlatformProfile(profile) {
    if (!profile) return null;
    return profile.platformProfile || profile;
  }

  function getRole(profile) {
    var platform = getPlatformProfile(profile);
    if (!platform) return ROLES.USUARIO;
    return platform.rol || ROLES.USUARIO;
  }

  function getRoleLabel(profile) {
    return ROLE_LABELS[getRole(profile)] || ROLE_LABELS.usuario;
  }

  function isUsuario(profile) {
    return getRole(profile) === ROLES.USUARIO;
  }

  function isAsesor(profile) {
    return getRole(profile) === ROLES.ASESOR;
  }

  function isAdmin(profile) {
    return getRole(profile) === ROLES.ADMIN;
  }

  function isStaff(profile) {
    return isAsesor(profile) || isAdmin(profile);
  }

  return {
    ROLES: ROLES,
    ROLE_LABELS: ROLE_LABELS,
    getRole: getRole,
    getRoleLabel: getRoleLabel,
    isUsuario: isUsuario,
    isAsesor: isAsesor,
    isAdmin: isAdmin,
    isStaff: isStaff
  };
})();

var PlatformPermissions = (function () {
  var KEYS = {
    EDITAR_PROYECTO: 'editarProyecto',
    APLICAR_TEMA_PROYECTO: 'aplicarTemaProyecto',
    SUBIR_ARCHIVOS: 'subirArchivos',
    GESTIONAR_USUARIOS: 'gestionarUsuarios',
    EDITAR_PRECIOS: 'editarPrecios',
    PUBLICAR_PROYECTO: 'publicarProyecto'
  };

  var DEFAULT_PERMISSIONS = {
    editarProyecto: false,
    aplicarTemaProyecto: false,
    subirArchivos: false,
    gestionarUsuarios: false,
    editarPrecios: false,
    publicarProyecto: false
  };

  function getPermissions(profile) {
    var platform = profile && (profile.platformProfile || profile);
    if (!platform || !platform.permisos || typeof platform.permisos !== 'object') {
      return Object.assign({}, DEFAULT_PERMISSIONS);
    }
    return Object.assign({}, DEFAULT_PERMISSIONS, platform.permisos);
  }

  function has(profile, key) {
    if (!key) return false;
    if (PlatformRoles.isAdmin(profile)) return true;
    return !!getPermissions(profile)[key];
  }

  function hasAny(profile, keys) {
    return (keys || []).some(function (key) { return has(profile, key); });
  }

  function hasAll(profile, keys) {
    return (keys || []).every(function (key) { return has(profile, key); });
  }

  return {
    KEYS: KEYS,
    DEFAULT_PERMISSIONS: DEFAULT_PERMISSIONS,
    getPermissions: getPermissions,
    has: has,
    hasAny: hasAny,
    hasAll: hasAll
  };
})();

var PlatformVisibility = (function () {
  var RULES = {
    'dashboard.admin': function (profile) {
      return PlatformRoles.isAdmin(profile);
    },
    'project.edit': function (profile) {
      return PlatformPermissions.has(profile, PlatformPermissions.KEYS.EDITAR_PROYECTO);
    },
    'project.publish': function (profile) {
      return PlatformPermissions.has(profile, PlatformPermissions.KEYS.PUBLICAR_PROYECTO);
    },
    'project.pricing': function (profile) {
      return PlatformPermissions.has(profile, PlatformPermissions.KEYS.EDITAR_PRECIOS);
    },
    'project.files': function (profile) {
      return PlatformPermissions.has(profile, PlatformPermissions.KEYS.SUBIR_ARCHIVOS);
    },
    'users.manage': function (profile) {
      return PlatformPermissions.has(profile, PlatformPermissions.KEYS.GESTIONAR_USUARIOS);
    },
    'project.officialTheme': function (profile) {
      return PlatformRoles.isAdmin(profile);
    }
  };

  function isVisible(featureKey, profile) {
    if (!profile) return false;
    var rule = RULES[featureKey];
    if (!rule) return false;
    return !!rule(profile);
  }

  function register(featureKey, ruleFn) {
    if (!featureKey || typeof ruleFn !== 'function') return;
    RULES[featureKey] = ruleFn;
  }

  return {
    isVisible: isVisible,
    register: register,
    RULES: RULES
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/roles-permissions.js');}catch(_e){}

console.log("BOOT EXIT js/auth/roles-permissions.js");
