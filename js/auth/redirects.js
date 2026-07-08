/* Auth redirect URLs — must be allowlisted in Supabase Auth settings */
var AuthRedirects = (function () {
  function origin() {
    return window.location.origin;
  }

  function withProyecto(path) {
    try {
      var params = new URLSearchParams(window.location.search);
      var proyecto = params.get('proyecto');
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
    return origin() + '/index.html';
  }

  function terminos() {
    return withProyecto(origin() + '/index.html#terminos');
  }

  function privacidad() {
    return withProyecto(origin() + '/index.html#privacidad');
  }

  function adminBuilder() {
    var url = new URL('admin/ai-project-builder.html', window.location.href);
    try {
      var proyecto = new URLSearchParams(window.location.search).get('proyecto');
      if (proyecto) url.searchParams.set('proyecto', proyecto);
    } catch (e) {}
    return url.href;
  }

  function requiredAllowlist() {
    return [
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
    oauthCallback: oauthCallback,
    requiredAllowlist: requiredAllowlist,
    withQueryParam: withQueryParam
  };
})();
