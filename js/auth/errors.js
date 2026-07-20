console.log("BOOT ENTER js/auth/errors.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/errors.js');}catch(_e){}
/* Spanish auth error messages */
var AuthErrors = (function () {
  var MAP = {
    invalid_credentials: 'Correo/usuario o contraseña incorrectos.',
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
    user_already_registered: 'Este correo ya está registrado.',
    signup_disabled: 'El registro no está disponible en este momento.',
    weak_password: 'La contraseña debe tener al menos 8 caracteres.',
    over_request_rate_limit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    user_not_found: 'No encontramos una cuenta con ese correo.',
    same_password: 'La nueva contraseña debe ser diferente a la anterior.'
  };

  var INTERNAL_DB_PATTERN = /null value|violates|constraint|relation|schema|column|duplicate key|syntax error/i;

  function isInternalDbError(message) {
    return INTERNAL_DB_PATTERN.test(String(message || ''));
  }

  function translate(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    if (typeof error === 'string') {
      if (isInternalDbError(error)) {
        console.error('[Auth]', error);
        return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
      }
      return error;
    }

    var code = error.code || error.error_code || '';
    if (MAP[code]) return MAP[code];

    var message = error.message || '';
    if (/invalid login credentials/i.test(message)) return MAP.invalid_credentials;
    if (/email not confirmed/i.test(message)) return MAP.email_not_confirmed;
    if (/already registered/i.test(message)) return MAP.user_already_registered;
    if (/password/i.test(message) && /least/i.test(message)) return MAP.weak_password;

    if (isInternalDbError(message)) {
      console.error('[Auth]', error);
      return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
    }

    return message || 'Ocurrió un error inesperado.';
  }

  function isInvalidCredentials(error) {
    if (!error) return false;
    var code = error.code || error.error_code || '';
    if (code === 'invalid_credentials') return true;
    return /invalid login credentials/i.test(error.message || '');
  }

  function loginFailureMessage(error) {
    var base = translate(error);
    if (!isInvalidCredentials(error)) return base;
    return (
      base +
      ' Si creaste tu cuenta con Google, usa ese botón para entrar. ' +
      'Mientras tengas sesión iniciada, puedes crear una contraseña en Perfil → Configuración ' +
      'y así entrar también con correo y contraseña.'
    );
  }

  return { translate: translate, loginFailureMessage: loginFailureMessage, isInvalidCredentials: isInvalidCredentials };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/errors.js');}catch(_e){}

console.log("BOOT EXIT js/auth/errors.js");
