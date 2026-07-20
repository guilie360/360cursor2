console.log("BOOT ENTER js/auth/api/login.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/login.js');}catch(_e){}
/* Resolve email or login alias to Supabase Auth email */
var LoginApi = (function () {
  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  async function resolveLoginEmail(loginInput) {
    var normalized = String(loginInput || '').trim();
    if (!normalized) {
      throw new Error('Ingresa tu correo o usuario.');
    }

    if (looksLikeEmail(normalized)) {
      return normalized.toLowerCase();
    }

    var result = await PlatformAuth.getClient().rpc('resolve_login_email', {
      login_input: normalized
    });

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo resolver el usuario.');
    }

    if (!result.data) {
      throw new Error('No encontramos una cuenta con ese correo o usuario.');
    }

    return String(result.data).toLowerCase();
  }

  return {
    looksLikeEmail: looksLikeEmail,
    resolveLoginEmail: resolveLoginEmail
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/login.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/login.js");
