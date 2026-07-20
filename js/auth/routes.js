console.log("BOOT ENTER js/auth/routes.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/routes.js');}catch(_e){}
/* Role-based routing — prepared for future dashboards */
var AuthRouter = (function () {
  var DESTINATIONS = {
    staff: '/admin/dashboard.html',
    visitante: '/auth/cuenta.html',
    asesor: '/auth/cuenta.html',
    cliente: '/auth/cuenta.html',
    propietario: '/auth/cuenta.html'
  };

  var PROTECTED_VISITOR_PATHS = [
    '/auth/cuenta.html'
  ];

  function getAccountType(profile) {
    if (!profile) return null;
    return profile.accountType || profile.tipo_cuenta || null;
  }

  function destinationFor(profile) {
    var type = getAccountType(profile);
    if (!type) return AuthRedirects.ingresar();
    var path = DESTINATIONS[type] || AuthRedirects.cuenta();
    if (type === 'visitante' || type === 'staff') {
      return AuthRedirects.withProyecto(path);
    }
    return path;
  }

  function isProtectedVisitorPath(pathname) {
    return PROTECTED_VISITOR_PATHS.some(function (entry) {
      return pathname.endsWith(entry);
    });
  }

  function registerDestination(accountType, path) {
    DESTINATIONS[accountType] = path;
  }

  return {
    destinationFor: destinationFor,
    registerDestination: registerDestination,
    getAccountType: getAccountType,
    isProtectedVisitorPath: isProtectedVisitorPath,
    PROTECTED_VISITOR_PATHS: PROTECTED_VISITOR_PATHS
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/routes.js');}catch(_e){}

console.log("BOOT EXIT js/auth/routes.js");
