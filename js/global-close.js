try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/global-close.js');}catch(_e){}
/* Shell global: única X de cierre + pantalla completa (desktop).
   Los módulos NO controlan la X; solo informan estado vía nav/DOM. GlobalClose decide. */
var GlobalClose = (function () {
  var stack = null;
  var btn = null;
  var fullscreenBtn = null;
  var recoveryBtn = null;
  var hideCloseTimer = null;
  var HIDE_CLOSE_MS = 120;
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

  function isDomCloseableSurfaceOpen() {
    var ids = [
      'unitsPopup', 'tour360Popup', 'pdfModal', 'videoModal', 'rendersModal',
      'locationModal', 'calculatorModal', 'descripcionModal', 'amenidadesModal',
      'estadoModal', 'constructoraModal', 'descargasModal', 'sphereModal',
      'authExperienceModal', 'emailVerificationModal', 'projectThemeConfirmModal'
    ];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.classList.contains('active')) return true;
    }
    if (typeof lightboxOpen !== 'undefined' && lightboxOpen) return true;
    return false;
  }

  /** Única fuente de verdad: ¿hay algo que el Shell deba poder cerrar? */
  function isCloseableSessionActive() {
    return (typeof navStack !== 'undefined' && navStack.length > 0) ||
      isDomCloseableSurfaceOpen() ||
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

  function isOverlayOpen() {
    return isCloseableSessionActive();
  }

  function ensureGlobalCloseButton() {
    stack = stack || document.getElementById('globalActionStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'globalActionStack';
      stack.className = 'global-action-stack';
      document.body.appendChild(stack);
    }
    /* La X vive en el Shell (body); si algo la movió, devolverla */
    if (stack.parentNode !== document.body) {
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
    } else if (btn.parentNode !== stack) {
      stack.insertBefore(btn, stack.firstChild);
    }
    /* Nunca usar atributo hidden: el UA aplica display:none !important */
    btn.removeAttribute('hidden');

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
    } else if (fullscreenBtn.parentNode !== stack) {
      stack.appendChild(fullscreenBtn);
    }
    fullscreenBtn.removeAttribute('hidden');

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

  function clearKeyboardPin() {
    if (!stack) return;
    stack.style.bottom = '';
    stack.style.left = '';
    stack.style.right = '';
    stack.style.top = '';
    stack.style.transform = '';
  }

  function pinStackToVisualViewport(enable) {
    if (!stack) return;
    if (!enable || !window.visualViewport || isMainMenuOpen()) {
      clearKeyboardPin();
      return;
    }
    var vv = window.visualViewport;
    var offsetBottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    var offsetRight = Math.max(0, window.innerWidth - (vv.width + vv.offsetLeft));
    /* Solo teclado/viewport reducido — no compensar alineación óptica */
    if (offsetBottom > 2 || offsetRight > 2) {
      stack.style.top = 'auto';
      stack.style.left = 'auto';
      stack.style.transform = 'none';
      stack.style.right = (offsetRight + 12) + 'px';
      stack.style.bottom = offsetBottom + 'px';
    } else {
      clearKeyboardPin();
    }
  }

  /**
   * Único controlador de visibilidad de la X.
   * No muta z-index ni pointer-events; no desmonta el nodo.
   */
  function applyShellCloseState(showClose, showFullscreen) {
    ensureGlobalCloseButton();
    ensureRecoveryCloseButton();

    var showStack = showClose || showFullscreen;
    document.body.classList.toggle('has-global-close', showClose);

    if (stack) {
      stack.classList.toggle('is-visible', showStack);
      stack.classList.toggle('is-hero-only', showFullscreen && !showClose);
    }

    if (btn) {
      btn.removeAttribute('hidden');
      btn.classList.toggle('is-visible', showClose);
      btn.setAttribute('aria-hidden', showClose ? 'false' : 'true');
      btn.tabIndex = showClose ? 0 : -1;
    }

    if (fullscreenBtn) {
      fullscreenBtn.removeAttribute('hidden');
      fullscreenBtn.classList.toggle('is-visible', showFullscreen);
      fullscreenBtn.setAttribute('aria-hidden', showFullscreen ? 'false' : 'true');
    }

    pinStackToVisualViewport(showClose && !DESKTOP_MEDIA.matches && showStack);
    updateFullscreenState();

    var menuOpen = isMainMenuOpen();
    var globalCloseVisible = !!(showClose && btn && btn.classList.contains('is-visible'));
    if (recoveryBtn) {
      var needsRecovery = menuOpen && !globalCloseVisible;
      recoveryBtn.hidden = !needsRecovery;
      recoveryBtn.classList.toggle('is-visible', needsRecovery);
    }
  }

  function update() {
    ensureGlobalCloseButton();

    var showClose = isCloseableSessionActive();
    var showFullscreen = DESKTOP_MEDIA.matches;

    if (showClose) {
      if (hideCloseTimer) {
        clearTimeout(hideCloseTimer);
        hideCloseTimer = null;
      }
      applyShellCloseState(true, showFullscreen);
      return;
    }

    /* Debounce al ocultar: evita parpadeos en push/pop / re-render */
    var currentlyVisible = !!(btn && btn.classList.contains('is-visible'));
    if (currentlyVisible) {
      if (!hideCloseTimer) {
        hideCloseTimer = setTimeout(function () {
          hideCloseTimer = null;
          if (!isCloseableSessionActive()) {
            applyShellCloseState(false, DESKTOP_MEDIA.matches);
          }
        }, HIDE_CLOSE_MS);
      }
      pinStackToVisualViewport(false);
      updateFullscreenState();
      return;
    }

    applyShellCloseState(false, showFullscreen);
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
      if (typeof VisitorPersonalizeV2Panel !== 'undefined' &&
          typeof VisitorPersonalizeV2Panel.hasPendingProjectConfirm === 'function' &&
          VisitorPersonalizeV2Panel.hasPendingProjectConfirm() &&
          typeof VisitorPersonalizeV2Panel.closeProjectDefaultConfirm === 'function') {
        VisitorPersonalizeV2Panel.closeProjectDefaultConfirm();
      } else if (typeof VisitorPersonalizePanel !== 'undefined' &&
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
      if (typeof StyleEngineColorPicker !== 'undefined' &&
          typeof StyleEngineColorPicker.isOpen === 'function' &&
          StyleEngineColorPicker.isOpen() &&
          typeof StyleEngineColorPicker.close === 'function') {
        StyleEngineColorPicker.close();
      } else if (typeof StyleEngine !== 'undefined' && typeof StyleEngine.close === 'function') {
        StyleEngine.close();
      }
      update();
      return;
    }
    if (isAuthModalOpen()) {
      if (typeof VisitorAuthModal !== 'undefined' && typeof VisitorAuthModal.close === 'function') {
        VisitorAuthModal.close();
      }
      update();
      return;
    }
    if (isVerificationModalOpen()) {
      if (typeof VisitorEmailVerification !== 'undefined' &&
          typeof VisitorEmailVerification.closeModal === 'function') {
        VisitorEmailVerification.closeModal();
      }
      update();
      return;
    }
    if (typeof lightboxOpen !== 'undefined' && lightboxOpen && typeof closeLightbox === 'function') {
      closeLightbox();
      update();
      return;
    }
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
        VisitorPersonalizePanel.dismissThemeEditorLayer()) {
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
    if (typeof DESKTOP_MEDIA.addEventListener === 'function') {
      DESKTOP_MEDIA.addEventListener('change', update);
    } else if (typeof DESKTOP_MEDIA.addListener === 'function') {
      DESKTOP_MEDIA.addListener(update);
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }

    var menu = document.getElementById('mainMenu');
    if (menu && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () { update(); });
      observer.observe(menu, { attributes: true, attributeFilter: ['class'] });
    }

    if (typeof MutationObserver !== 'undefined') {
      var overlayIds = [
        'unitsPopup', 'calculatorModal', 'pdfModal', 'tour360Popup', 'sphereModal',
        'videoModal', 'rendersModal', 'amenidadesModal', 'descargasModal',
        'locationModal', 'descripcionModal', 'estadoModal', 'constructoraModal',
        'authExperienceModal', 'emailVerificationModal'
      ];
      var overlayObserver = new MutationObserver(function () { update(); });
      overlayIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) overlayObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
      });
    }

    update();

  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/global-close.js :: init');}catch(_bd){}
  }
}

  return {
    init: init,
    update: update,
    handleClose: handleClose,
    toggleFullscreen: toggleFullscreen,
    isDesktopWithKeyboard: isDesktopWithKeyboard,
    isCloseableSessionActive: isCloseableSessionActive
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/global-close.js');}catch(_e){}
