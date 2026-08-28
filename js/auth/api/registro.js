try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/registro.js');}catch(_e){}
/* Visitor registration API */
var RegistroApi = (function () {
  function getProyectoSlug() {
    try {
      return new URLSearchParams(window.location.search).get('proyecto') || null;
    } catch (e) {
      return null;
    }
  }

  function slugifyLoginPart(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }

  function suggestLogin(nombres, apellidos, email) {
    var base = slugifyLoginPart(nombres + '.' + apellidos);
    if (base.length < 3) {
      base = slugifyLoginPart((email || '').split('@')[0]);
    }
    return base.slice(0, 40) || 'visitante';
  }

  async function resolveUniqueLogin(nombres, apellidos, email) {
    var base = suggestLogin(nombres, apellidos, email);
    var result = await PlatformAuth.getClient().rpc('generate_unique_visitor_login', {
      base_login: base
    });
    if (result.error) {
      throw new Error(result.error.message || 'No se pudo generar el usuario');
    }
    return result.data || base;
  }

  async function resolveContext() {
    var proyectoSlug = getProyectoSlug();
    var result = await PlatformAuth.getClient().rpc('resolve_registro_context', {
      proyecto_slug: proyectoSlug,
      constructora_slug: null
    });

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo resolver el contexto del registro');
    }

    var row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row || !row.constructora_id) {
      throw new Error('No hay constructora activa para completar el registro.');
    }
    return row;
  }

  async function registerVisitor(payload) {
    var context = await resolveContext();
    var nombres = String(payload.nombres || '').trim();
    var apellidos = String(payload.apellidos || '').trim();
    var email = String(payload.email || '').trim().toLowerCase();
    var login = await resolveUniqueLogin(nombres, apellidos, email);

    var result = await PlatformAuth.getClient().auth.signUp({
      email: email,
      password: payload.password,
      options: {
        data: {
          account_type: 'visitante',
          nombres: nombres,
          apellidos: apellidos,
          nombre: (nombres + ' ' + apellidos).trim(),
          login: login,
          terminos_aceptados: true,
          constructora_id: context.constructora_id,
          proyecto_id: context.proyecto_id,
          user_agent: navigator.userAgent
        },
        emailRedirectTo: AuthRedirects.confirmEmail()
      }
    });

    if (result.error) throw result.error;

    var session = result.data.session;
    var user = result.data.user;

    if (!session) {
      AuthStoragePrefs.setRememberMe(true);
      PlatformAuth.resetClient();
      PlatformAuth.createClient({ remember: true });
      var signIn = await PlatformAuth.getClient().auth.signInWithPassword({
        email: email,
        password: payload.password
      });
      if (!signIn.error && signIn.data.session) {
        session = signIn.data.session;
        user = signIn.data.user;
      }
    }

    return {
      user: user,
      session: session,
      needsEmailConfirmation: !!(user && !user.email_confirmed_at && !user.confirmed_at),
      suggestedLogin: login
    };
  }

  return {
    registerVisitor: registerVisitor,
    resolveContext: resolveContext,
    suggestLogin: suggestLogin,
    resolveUniqueLogin: resolveUniqueLogin
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/registro.js');}catch(_e){}
