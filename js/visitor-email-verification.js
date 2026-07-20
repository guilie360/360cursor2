console.log("BOOT ENTER js/visitor-email-verification.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/visitor-email-verification.js');}catch(_e){}
/* Progressive email verification — showroom + gated features */
var VisitorEmailVerification = (function () {
  var FEATURES = {
    PROFILE: 'profile',
    DASHBOARD: 'dashboard',
    EXPORT_THEME: 'export_theme',
    IMPORT_THEME: 'import_theme',
    SYNC: 'sync',
    PASSWORD_RECOVERY: 'password_recovery'
  };

  var modal = null;
  var isSubmitting = false;

  function getUser() {
    return typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
  }

  function isPending() {
    var user = getUser();
    return !!(user && typeof VisitorAuth.isEmailConfirmed === 'function' && !VisitorAuth.isEmailConfirmed(user));
  }

  function isVerified() {
    return !isPending();
  }

  function requiresVerification(feature) {
    return [
      FEATURES.PROFILE,
      FEATURES.DASHBOARD,
      FEATURES.EXPORT_THEME,
      FEATURES.IMPORT_THEME,
      FEATURES.SYNC,
      FEATURES.PASSWORD_RECOVERY
    ].indexOf(feature) !== -1;
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.getElementById('emailVerificationModal');
    return modal;
  }

  function setMessage(text, type) {
    var el = document.getElementById('emailVerificationMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'email-verification-message' + (type ? ' ' + type : '');
  }

  function open(options) {
    options = options || {};
    ensureModal();
    if (!modal) return false;
    setMessage('');
    modal.classList.add('active');
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
    if (typeof playSound === 'function') playSound('popupOpen');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
    if (options.reason === 'profile') {
      modal.dataset.reason = 'profile';
    } else {
      delete modal.dataset.reason;
    }
    return true;
  }

  function close() {
    ensureModal();
    if (!modal) return;
    modal.classList.remove('active');
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    if (typeof playSound === 'function') playSound('popupClose');
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function guard(feature, options) {
    if (!requiresVerification(feature)) return true;
    if (!isPending()) return true;
    open(options || { reason: feature });
    return false;
  }

  async function resendEmail() {
    var user = getUser();
    if (!user || !user.email) {
      setMessage('No encontramos un correo asociado a tu sesión.', 'error');
      return;
    }
    if (isSubmitting) return;
    isSubmitting = true;
    setMessage('Enviando correo...', '');
    try {
      await VisitorAuth.resendConfirmation(user.email);
      setMessage('Te enviamos un nuevo correo de verificación.', 'success');
    } catch (err) {
      setMessage('No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  async function refreshVerificationState() {
    if (typeof PlatformAuth !== 'undefined') {
      PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    }
    await VisitorAuth.getSession();
    var user = getUser();
    if (user && VisitorAuth.isEmailConfirmed(user)) {
      if (typeof VisitorSession !== 'undefined') {
        await VisitorSession.refresh();
      }
      close();
      setMessage('¡Correo verificado! Ya puedes usar todas las funciones.', 'success');
      if (typeof window.refreshVisitorMenuProfile === 'function') {
        window.refreshVisitorMenuProfile();
      }
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.refreshMisTemasList === 'function') {
        VisitorPersonalizePanel.refreshMisTemasList();
      }
      return true;
    }
    setMessage('Aún no detectamos la verificación. Revisa tu bandeja y vuelve a intentar.', '');
    return false;
  }

  function bindEvents() {
    ensureModal();
    if (!modal) return;

    var resendBtn = document.getElementById('emailVerificationResendBtn');
    var confirmBtn = document.getElementById('emailVerificationConfirmBtn');
    var laterBtn = document.getElementById('emailVerificationLaterBtn');

    if (resendBtn) {
      resendBtn.addEventListener('click', function () {
        resendEmail();
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        refreshVerificationState();
      });
    }
    if (laterBtn) {
      laterBtn.addEventListener('click', function () {
        close();
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target.id === 'emailVerificationModal') close();
    });
  }

  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/visitor-email-verification.js :: init');}catch(_bd){}
  try {

    bindEvents();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/visitor-email-verification.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  return {
    FEATURES: FEATURES,
    isPending: isPending,
    isVerified: isVerified,
    guard: guard,
    open: open,
    close: close,
    init: init
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/visitor-email-verification.js');}catch(_e){}

console.log("BOOT EXIT js/visitor-email-verification.js");
