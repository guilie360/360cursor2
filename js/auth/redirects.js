try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/redirects.js');}catch(_e){}
/* Auth redirect URLs — must be allowlisted in Supabase Auth settings */
var AuthRedirects = (function () {
  function origin() {
    return window.location.origin;
  }

  function withProyecto(path) {
    try {
      var proyecto =
        typeof getProjectSlugFromUrl === 'function'
          ? getProjectSlugFromUrl()
          : new URLSearchParams(window.location.search).get('proyecto');
      if (!proyecto) return path;
      var join = path.indexOf('?') === -1 ? '?' : '&';
      return path + join + 'proyecto=' + encodeURIComponent(proyecto);
    } catch (e) {
      return path;
    }
  }

  function withQueryParam(path, key, value) {
    var join = path.indexOf('?') === -1 ? '?' : '&';
    return path + join + encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function confirmEmail() {
    return origin() + '/auth/confirmar-email.html';
  }

  function resetPassword() {
    return origin() + '/auth/restablecer-contrasena.html';
  }

  function ingresar() {
    return withProyecto(origin() + '/auth/ingresar.html');
  }

  function registro() {
    return withProyecto(origin() + '/auth/registro.html');
  }

  function cuenta() {
    return withProyecto(origin() + '/auth/cuenta.html');
  }

  function publicHome() {
    return withProyecto(origin() + '/index.html');
  }

  function oauthCallback() {
    /* Single allowlisted callback for all showrooms (SaaS-safe). */
    return origin() + '/auth/callback.html';
  }

  function terminos() {
    return withProyecto(origin() + '/index.html#terminos');
  }

  function privacidad() {
    return withProyecto(origin() + '/index.html#privacidad');
  }

  function adminBuilder() {
    /* V5.3.2 — canonical product host is /boxies (UUID when known). */
    try {
      var project =
        (typeof window !== 'undefined' && window.PROJECT_DATA) || null;
      var id = project && project.id ? String(project.id) : '';
      var slug =
        (project && project.slug) ||
        (typeof getProjectSlugFromUrl === 'function'
          ? getProjectSlugFromUrl()
          : new URLSearchParams(window.location.search).get('proyecto')) ||
        '';
      var url = new URL('/boxies/', window.location.origin);
      if (id) {
        url.searchParams.set('page', 'builder');
        url.searchParams.set('projectId', id);
        if (slug) {
          url.searchParams.set('project', slug);
          url.searchParams.set('proyecto', slug);
        }
      } else {
        url.searchParams.set('page', 'projects');
      }
      return url.href;
    } catch (e) {
      return origin() + '/boxies/';
    }
  }

  function adminDashboard() {
    return origin() + '/boxies/';
  }

  function requiredAllowlist() {
    return [
      origin() + '/auth/callback.html',
      origin() + '/auth/confirmar-email.html',
      origin() + '/auth/restablecer-contrasena.html',
      origin() + '/auth/ingresar.html',
      origin() + '/auth/registro.html',
      origin() + '/auth/cuenta.html',
      origin() + '/index.html'
    ];
  }

  return {
    origin: origin,
    withProyecto: withProyecto,
    confirmEmail: confirmEmail,
    resetPassword: resetPassword,
    ingresar: ingresar,
    registro: registro,
    cuenta: cuenta,
    terminos: terminos,
    privacidad: privacidad,
    publicHome: publicHome,
    adminBuilder: adminBuilder,
    adminDashboard: adminDashboard,
    oauthCallback: oauthCallback,
    requiredAllowlist: requiredAllowlist,
    withQueryParam: withQueryParam
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/redirects.js');}catch(_e){}
