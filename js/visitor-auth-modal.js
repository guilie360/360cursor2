console.log("BOOT ENTER js/visitor-auth-modal.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/visitor-auth-modal.js');}catch(_e){}
/* Single auth experience modal — gate, login, register */
var VisitorAuthModal = (function () {
  var modal = null;
  var currentView = 'gate';
  var isSubmitting = false;
  var pendingResendIdentifier = '';

  function $(id) {
    return document.getElementById(id);
  }

  function isRegisterViewActive() {
    var view = $('authViewRegister');
    return !!(view && view.classList.contains('is-active'));
  }

  function isLoginViewActive() {
    var view = $('authViewLogin');
    return !!(view && view.classList.contains('is-active'));
  }

  function isOpen() {
    if (!modal) modal = $('authExperienceModal');
    return !!(modal && modal.classList.contains('active'));
  }

  /** Bloquea cierre accidental (backdrop / Escape) al cargar datos en login o registro. */
  function isSessionLocked() {
    return isOpen() && (isLoginViewActive() || isRegisterViewActive());
  }

  function setMessage(text, type) {
    var el = $('authModalMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-modal-message' + (type ? ' ' + type : '');
  }

  function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
      button.disabled = true;
      button.classList.add('loading');
      button.textContent = loadingText || 'Procesando...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = button.dataset.defaultText || button.textContent;
    }
  }

  function bindPasswordToggle(toggleBtn, input) {
    if (!toggleBtn || !input) return;
    toggleBtn.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
    });
  }

  function showView(view) {
    currentView = view;
    ['gate', 'login', 'register'].forEach(function (name) {
      var el = $('authView' + name.charAt(0).toUpperCase() + name.slice(1));
      if (!el) return;
      el.classList.toggle('is-active', name === view);
      el.classList.remove('is-exiting');
    });
    if (modal) {
      modal.classList.toggle('is-register-locked', view === 'register');
      modal.classList.toggle('is-auth-session-locked', view === 'login' || view === 'register');
    }
    setMessage('');
    $('authResendWrap').style.display = 'none';
  }

  function transitionTo(view) {
    var active = document.querySelector('.auth-experience-view.is-active');
    if (active) {
      active.classList.add('is-exiting');
      setTimeout(function () {
        showView(view);
      }, 180);
      return;
    }
    showView(view);
  }

  function open(view) {
    modal = $('authExperienceModal');
    if (!modal) return;
    isSubmitting = false;
    PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });
    showView(view || 'gate');
    modal.classList.add('active');
    lockBodyScroll();
    playSound('popupOpen');
    vibrate(9);
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function close() {
    if (!modal) modal = $('authExperienceModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.remove('is-register-locked');
    modal.classList.remove('is-auth-session-locked');
    unlockBodyScroll();
    showView('gate');
    resetRegisterForm();
    playSound('popupClose');
    vibrate(6);
    if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  }

  function resetRegisterForm() {
    var form = $('authRegisterForm');
    if (form) form.reset();
  }

  async function enterPlatformAfterAuth(auth, welcomeName) {
    await VisitorSession.afterLogin(auth);
    close();
    if (typeof goTo === 'function') {
      goTo('menu-primary');
    } else if (typeof showMainMenuPanel === 'function') {
      showMenuLevel('primary');
      showMainMenuPanel();
    }
    showToast('Bienvenido, ' + (welcomeName || VisitorSession.displayName()));
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    var loginValue = $('authLoginInput').value.trim();
    var password = $('authLoginPassword').value;
    var remember = $('authRememberMe').checked;

    if (!loginValue) {
      setMessage('Ingresa tu correo o usuario.', 'error');
      return;
    }
    if (!password) {
      setMessage('Ingresa tu contraseña.', 'error');
      return;
    }

    isSubmitting = true;
    setButtonLoading($('authLoginBtn'), true, 'Iniciando sesión...');
    setMessage('');

    try {
      var auth = await VisitorAuth.login(loginValue, password, remember);
      await enterPlatformAfterAuth(auth);
    } catch (err) {
      setMessage(AuthErrors.loginFailureMessage(err), 'error');
      if (err.code === 'email_not_confirmed') {
        pendingResendIdentifier = err.resolvedEmail || loginValue;
        $('authResendWrap').style.display = 'block';
      }
    } finally {
      isSubmitting = false;
      setButtonLoading($('authLoginBtn'), false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    var nombres = $('authNombres').value.trim();
    var apellidos = $('authApellidos').value.trim();
    var email = $('authEmail').value.trim().toLowerCase();
    var password = $('authPassword').value;

    if (!nombres) { setMessage('Ingresa tu nombre.', 'error'); return; }
    if (!apellidos) { setMessage('Ingresa tu apellido.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage('Correo electrónico inválido.', 'error'); return; }
    if (password.length < 8) { setMessage('La contraseña debe tener al menos 8 caracteres.', 'error'); return; }

    isSubmitting = true;
    setButtonLoading($('authRegisterBtn'), true, 'Continuando...');
    setMessage('');

    try {
      var result = await RegistroApi.registerVisitor({
        nombres: nombres,
        apellidos: apellidos,
        email: email,
        password: password
      });

      if (!result.session) {
        setMessage('Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente. Intenta iniciar sesión.', 'error');
        transitionTo('login');
        $('authLoginInput').value = email;
        return;
      }

      AuthStoragePrefs.setRememberMe(true);
      PlatformAuth.resetClient();
      PlatformAuth.createClient({ remember: true });

      var auth = await VisitorAuth.login(email, password, true);
      await enterPlatformAfterAuth(auth, nombres);
    } catch (err) {
      setMessage(AuthErrors.translate(err), 'error');
    } finally {
      isSubmitting = false;
      setButtonLoading($('authRegisterBtn'), false);
    }
  }

  async function handleGoogleAuth() {
    if (isSubmitting) return;
    isSubmitting = true;
    setMessage('Redirigiendo...', '');

    var googleButtons = [
      $('authLoginGoogleBtn'),
      $('authRegisterGoogleBtn')
    ];

    googleButtons.forEach(function (btn) {
      setButtonLoading(btn, true, 'Con Google...');
    });

    try {
      await OAuthApi.handleGoogleAuth();
    } catch (err) {
      console.error('[OAuth] start', err);
      setMessage('No fue posible iniciar sesión con Google.\nInténtalo nuevamente.', 'error');
      isSubmitting = false;
      googleButtons.forEach(function (btn) {
        setButtonLoading(btn, false);
      });
    }
  }

  function bindGoogleButtons() {
    ['authLoginGoogleBtn', 'authRegisterGoogleBtn'].forEach(function (id) {
      var btn = $(id);
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', handleGoogleAuth);
    });
  }

  function bindEvents() {
    $('authGateLoginBtn').addEventListener('click', function () { transitionTo('login'); });
    $('authGateRegisterBtn').addEventListener('click', function () {
      resetRegisterForm();
      transitionTo('register');
    });
    $('authLoginRegisterBtn').addEventListener('click', function () {
      resetRegisterForm();
      transitionTo('register');
    });

    $('authLoginForm').addEventListener('submit', handleLoginSubmit);
    $('authRegisterForm').addEventListener('submit', handleRegisterSubmit);
    bindGoogleButtons();

    var cancelBtn = $('authRegisterCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        close();
      });
    }

    var terminosLink = $('authTerminosLink');
    var privacidadLink = $('authPrivacidadLink');
    if (terminosLink) terminosLink.href = AuthRedirects.terminos();
    if (privacidadLink) privacidadLink.href = AuthRedirects.privacidad();

    $('authResendBtn').addEventListener('click', async function () {
      if (!pendingResendIdentifier || isSubmitting) return;
      isSubmitting = true;
      setMessage('Reenviando correo de confirmación...', '');
      try {
        await VisitorAuth.resendConfirmation(pendingResendIdentifier);
        setMessage('Correo reenviado. Revisa tu bandeja de entrada.', 'success');
      } catch (err) {
        setMessage(AuthErrors.translate(err), 'error');
      } finally {
        isSubmitting = false;
      }
    });

    bindPasswordToggle($('authToggleLoginPassword'), $('authLoginPassword'));
    bindPasswordToggle($('authTogglePassword'), $('authPassword'));

    $('authRememberMe').checked = AuthStoragePrefs.getRememberMe();
    if ($('authRememberMe').checked) {
      $('authLoginInput').value = AuthStoragePrefs.getSavedLogin();
    }

    $('authExperienceModal').addEventListener('click', function (e) {
      if (e.target.id !== 'authExperienceModal') return;
      /* Clic fuera: no cerrar en login/registro (evitar perder datos). */
      if (isSessionLocked()) return;
      close();
    });
  }

  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/visitor-auth-modal.js :: init');}catch(_bd){}
  try {

    bindEvents();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/visitor-auth-modal.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  return {
    init: init,
    open: open,
    close: close,
    transitionTo: transitionTo,
    handleGoogleAuth: handleGoogleAuth,
    isRegisterViewActive: isRegisterViewActive,
    isLoginViewActive: isLoginViewActive,
    isOpen: isOpen,
    isSessionLocked: isSessionLocked
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/visitor-auth-modal.js');}catch(_e){}

console.log("BOOT EXIT js/visitor-auth-modal.js");
