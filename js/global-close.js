console.log("BOOT ENTER js/global-close.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/global-close.js');}catch(_e){}
/* Botón global de cerrar + pantalla completa */
var GlobalClose = (function () {
  var stack = null;
  var btn = null;
  var fullscreenBtn = null;
  var recoveryBtn = null;
  var DESKTOP_MEDIA = window.matchMedia('(min-width: 601px)');

  function isDesktopWithKeyboard() {
    return DESKTOP_MEDIA.matches;
  }

  function isAuthModalOpen() {
    var modal = document.getElementById('authExperienceModal');
    return !!(modal && modal.classList.contains('active'));
  }

  function isVerificationModalOpen() {
    var modal = document.getElementById('emailVerificationModal');
    return !!(modal && modal.classList.contains('active'));
  }

  function isProjectThemeConfirmOpen() {
    var modal = document.getElementById('projectThemeConfirmModal');
    return !!(modal && modal.classList.contains('active'));
  }

  function isThemeAiModalOpen() {
    return typeof ThemeAIModal !== 'undefined' &&
      typeof ThemeAIModal.isOpen === 'function' &&
      ThemeAIModal.isOpen();
  }

  function isVisualAuditOpen() {
    return (typeof VisualAuditRunner !== 'undefined' && VisualAuditRunner.isRunning()) ||
      !!(document.getElementById('visualAuditUiRoot') &&
        document.getElementById('visualAuditUiRoot').classList.contains('is-open'));
  }

  function isStyleEngineModalOpen() {
    return (typeof StyleEngine !== 'undefined' &&
      typeof StyleEngine.isOpen === 'function' &&
      StyleEngine.isOpen()) ||
      (typeof StyleEngineColorPicker !== 'undefined' &&
      typeof StyleEngineColorPicker.isOpen === 'function' &&
      StyleEngineColorPicker.isOpen());
  }

  function isMainMenuOpen() {
    if (typeof window.isMainMenuOpen === 'function') return window.isMainMenuOpen();
    var menu = document.getElementById('mainMenu');
    return !!(menu && menu.classList.contains('active'));
  }

  function isWebEffectsConfirmOpen() {
    return typeof WebEffects !== 'undefined' &&
      typeof WebEffects.isConfirmOpen === 'function' &&
      WebEffects.isConfirmOpen();
  }

  function isOverlayOpen() {
    return (typeof navStack !== 'undefined' && navStack.length > 0) ||
      isMainMenuOpen() ||
      isAuthModalOpen() ||
      isVerificationModalOpen() ||
      isProjectThemeConfirmOpen() ||
      isWebEffectsConfirmOpen() ||
      isThemeAiModalOpen() ||
      isVisualAuditOpen() ||
      isStyleEngineModalOpen() ||
      (typeof lightboxOpen !== 'undefined' && lightboxOpen);
  }

  function ensureGlobalCloseButton() {
    stack = stack || document.getElementById('globalActionStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'globalActionStack';
      stack.className = 'global-action-stack';
      document.body.appendChild(stack);
    }

    btn = btn || document.getElementById('globalCloseBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'globalCloseBtn';
      btn.className = 'global-close-btn';
      btn.setAttribute('aria-label', 'Cerrar');
      btn.innerHTML = '&times;';
      stack.insertBefore(btn, stack.firstChild);
    }
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        handleClose({ explicitUserClose: true });
      });
    }

    fullscreenBtn = fullscreenBtn || document.getElementById('globalFullscreenBtn');
    if (!fullscreenBtn) {
      fullscreenBtn = document.createElement('button');
      fullscreenBtn.type = 'button';
      fullscreenBtn.id = 'globalFullscreenBtn';
      fullscreenBtn.className = 'global-fullscreen-btn';
      fullscreenBtn.setAttribute('aria-label', 'Pantalla completa');
      fullscreenBtn.setAttribute('aria-pressed', 'false');
      fullscreenBtn.innerHTML = '<span class="global-fullscreen-icon" aria-hidden="true">⛶</span>';
      stack.appendChild(fullscreenBtn);
    }
    if (!fullscreenBtn.dataset.bound) {
      fullscreenBtn.dataset.bound = '1';
      fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    return btn;
  }

  function ensureRecoveryCloseButton() {
    recoveryBtn = recoveryBtn || document.getElementById('mainMenuRecoveryClose');
    if (!recoveryBtn) {
      var header = document.querySelector('.main-menu-header');
      if (!header) return null;
      recoveryBtn = document.createElement('button');
      recoveryBtn.type = 'button';
      recoveryBtn.id = 'mainMenuRecoveryClose';
      recoveryBtn.className = 'main-menu-recovery-close';
      recoveryBtn.setAttribute('aria-label', 'Cerrar menú');
      recoveryBtn.innerHTML = '&times;';
      recoveryBtn.hidden = true;
      header.appendChild(recoveryBtn);
    }
    if (!recoveryBtn.dataset.bound) {
      recoveryBtn.dataset.bound = '1';
      recoveryBtn.addEventListener('click', function () {
        handleClose({ explicitUserClose: true });
      });
    }
    return recoveryBtn;
  }

  function updateFullscreenState() {
    if (!fullscreenBtn) return;
    var active = !!document.fullscreenElement;
    fullscreenBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    fullscreenBtn.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Pantalla completa');
    var icon = fullscreenBtn.querySelector('.global-fullscreen-icon');
    if (icon) icon.textContent = active ? '⤡' : '⛶';
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      var request = document.documentElement.requestFullscreen();
      if (request && typeof request.catch === 'function') {
        request.catch(function () {});
      }
      return;
    }
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function update() {
    ensureGlobalCloseButton();
    ensureRecoveryCloseButton();

    var showClose = isOverlayOpen();
    var showFullscreen = true;
    var showStack = showClose || showFullscreen;

    btn.hidden = !showClose;
    fullscreenBtn.hidden = !showFullscreen;
    btn.classList.toggle('is-visible', showClose);
    fullscreenBtn.classList.toggle('is-visible', showFullscreen);
    if (stack) {
      stack.classList.toggle('is-visible', showStack);
      stack.classList.toggle('is-hero-only', showFullscreen && !showClose);
    }
    document.body.classList.toggle('has-global-close', showClose);

    updateFullscreenState();
    var menuOpen = isMainMenuOpen();
    var globalCloseVisible = !!(btn && showClose && !btn.hidden && btn.classList.contains('is-visible'));
    if (recoveryBtn) {
      var needsRecovery = menuOpen && !globalCloseVisible;
      recoveryBtn.hidden = !needsRecovery;
      recoveryBtn.classList.toggle('is-visible', needsRecovery);
    }
  }

  function handleClose(options) {
    options = options || {};
    var fromEscape = !!options.fromEscape;
    var explicitUserClose = !!options.explicitUserClose;

    function isStyleV3Locked() {
      return typeof window.isStyleV3MenuLocked === 'function' && window.isStyleV3MenuLocked();
    }

    function authorizeStyleV3Close() {
      if (typeof window.authorizeStyleV3MenuClose === 'function') {
        window.authorizeStyleV3MenuClose();
      }
    }

    function blockStyleV3MenuClose() {
      if (!isStyleV3Locked()) return false;
      if (!explicitUserClose) {
        update();
        return true;
      }
      authorizeStyleV3Close();
      if (typeof window.closeMainMenuIfOpen === 'function') {
        window.closeMainMenuIfOpen();
      }
      update();
      return true;
    }
    if (isProjectThemeConfirmOpen()) {
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.closeProjectThemeConfirm === 'function') {
        VisitorPersonalizePanel.closeProjectThemeConfirm();
      } else {
        var themeModal = document.getElementById('projectThemeConfirmModal');
        if (themeModal) themeModal.classList.remove('active');
      }
      update();
      return;
    }
    if (isWebEffectsConfirmOpen()) {
      WebEffects.closeConfirmModal();
      update();
      return;
    }
    var presetDeleteModal = document.getElementById('officialPresetDeleteModal');
    if (presetDeleteModal && presetDeleteModal.classList.contains('active')) {
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.closeOfficialPresetDeleteConfirm === 'function') {
        VisitorPersonalizePanel.closeOfficialPresetDeleteConfirm();
      } else {
        presetDeleteModal.classList.remove('active');
      }
      update();
      return;
    }
    if (isThemeAiModalOpen()) {
      ThemeAIModal.close();
      update();
      return;
    }
    if (isVisualAuditOpen()) {
      if (typeof VisualAuditRunner !== 'undefined' && VisualAuditRunner.isRunning()) {
        VisualAuditRunner.cancel();
      } else if (typeof VisualAuditUI !== 'undefined' && VisualAuditUI.clear) {
        VisualAuditUI.clear();
      }
      update();
      return;
    }
    if (isStyleEngineModalOpen()) {
      if (typeof StyleEngineColorPicker !== 'undefined' && StyleEngineColorPicker.isOpen()) {
        StyleEngineColorPicker.close(false);
      } else if (typeof StyleEngine !== 'undefined') {
        StyleEngine.requestClose();
      }
      update();
      return;
    }
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
        VisitorPersonalizePanel.isEditorSessionLocked() &&
        fromEscape) {
      if (typeof VisitorPersonalizePanel.handlePersonalizeEscape === 'function' &&
          VisitorPersonalizePanel.handlePersonalizeEscape()) {
        update();
        return;
      }
    }
    if (isVerificationModalOpen()) {
      VisitorEmailVerification.close();
      update();
      return;
    }
    if (isAuthModalOpen()) {
      /* Login/registro: no Escape ni cierre implícito; solo X explícita. */
      var authLocked = typeof VisitorAuthModal !== 'undefined' &&
        typeof VisitorAuthModal.isSessionLocked === 'function' &&
        VisitorAuthModal.isSessionLocked();
      if (authLocked && !explicitUserClose) {
        update();
        return;
      }
      VisitorAuthModal.close();
      update();
      return;
    }
    if (typeof lightboxOpen !== 'undefined' && lightboxOpen && typeof closeLightbox === 'function') {
      closeLightbox();
      update();
      return;
    }
    if (document.body.classList.contains('global-close-docked') && isMainMenuOpen()) {
      if (isStyleV3Locked()) {
        if (!explicitUserClose) {
          update();
          return;
        }
        authorizeStyleV3Close();
        if (typeof window.closeMainMenuIfOpen === 'function') {
          window.closeMainMenuIfOpen();
        }
        update();
        return;
      }
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.isOnPersonalizarPanel === 'function' &&
          VisitorPersonalizePanel.isOnPersonalizarPanel()) {
        if (fromEscape) {
          if (typeof VisitorPersonalizePanel.handlePersonalizeEscape === 'function') {
            VisitorPersonalizePanel.handlePersonalizeEscape();
          }
          update();
          return;
        }
        if (typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function') {
          VisitorPersonalizePanel.dismissThemeEditorLayer();
        }
        if (typeof window.closeMainMenuIfOpen === 'function') {
          window.closeMainMenuIfOpen();
        }
        update();
        return;
      }
      if (fromEscape &&
          typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
          VisitorPersonalizePanel.dismissThemeEditorLayer()) {
        update();
        return;
      }
      if (typeof window.closeMainMenuIfOpen === 'function') {
        window.closeMainMenuIfOpen();
      }
      update();
      return;
    }
    if (fromEscape &&
        typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.handlePersonalizeEscape === 'function' &&
        VisitorPersonalizePanel.handlePersonalizeEscape()) {
      update();
      return;
    }
    if (typeof navStack !== 'undefined' && navStack.length > 0 && typeof goBack === 'function') {
      if (blockStyleV3MenuClose()) return;
      if (typeof window.authorizeGoBackForce === 'function') {
        window.authorizeGoBackForce();
      } else if (typeof window.authorizeGoBack === 'function') {
        window.authorizeGoBack();
      }
      goBack();
      update();
      return;
    }
    if (isMainMenuOpen() && typeof window.closeMainMenuIfOpen === 'function') {
      if (blockStyleV3MenuClose()) return;
      if (fromEscape &&
          typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
          VisitorPersonalizePanel.isEditorSessionLocked()) {
        update();
        return;
      }
      window.closeMainMenuIfOpen();
      update();
      return;
    }
    update();
  }

  function init() {
  console.log("ENTER init");
  try {

  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/global-close.js :: init');}catch(_bd){}
  try {

    ensureGlobalCloseButton();
    ensureRecoveryCloseButton();
    document.addEventListener('fullscreenchange', updateFullscreenState);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!isDesktopWithKeyboard()) return;
      if (!isOverlayOpen()) return;
      e.preventDefault();
      handleClose({ fromEscape: true });
    });

    window.addEventListener('resize', update);
    document.addEventListener('visibilitychange', update);

    var menu = document.getElementById('mainMenu');
    if (menu && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () {
        if (isMainMenuOpen() || document.body.classList.contains('has-global-close')) {
          update();
        }
      });
      observer.observe(menu, { attributes: true, attributeFilter: ['class'] });
    }

    update();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/global-close.js :: init');}catch(_bd){}
  }

  } finally {
    console.log("EXIT init");
  }}

  return {
    init: init,
    update: update,
    handleClose: handleClose,
    toggleFullscreen: toggleFullscreen,
    isDesktopWithKeyboard: isDesktopWithKeyboard
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/global-close.js');}catch(_e){}

console.log("BOOT EXIT js/global-close.js");
