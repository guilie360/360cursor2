try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/web-effects.js');}catch(_e){}
/* Toggle de animaciones / efectos visuales (no afecta sonido ni audio de video). */
var WebEffects = (function () {
  var STORAGE_KEY = 'boxies_web_effects_enabled';
  var enabled = true;

  function readEnabled() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return true;
      return raw !== 'false' && raw !== '0';
    } catch (e) {
      return true;
    }
  }

  function writeEnabled(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch (e) {}
  }

  function applyDom() {
    document.documentElement.classList.toggle('web-effects-off', !enabled);
    document.body.classList.toggle('web-effects-off', !enabled);
  }

  function isEnabled() {
    return enabled;
  }

  function shouldReduceMotion() {
    if (!enabled) return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function updateButtonState() {
    var btn = document.getElementById('globalEffectsBtn');
    if (!btn) return;
    var off = !enabled;
    btn.classList.toggle('is-off', off);
    btn.setAttribute('aria-pressed', off ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      off ? 'Activar animaciones' : 'Desactivar animaciones'
    );
    btn.setAttribute('title', off ? 'Activar animaciones' : 'Desactivar animaciones');
  }

  function setEnabled(next) {
    enabled = !!next;
    writeEnabled(enabled);
    applyDom();
    updateButtonState();
  }

  function openConfirmModal() {
    var modal = document.getElementById('webEffectsConfirmModal');
    if (!modal) return;
    modal.classList.add('active');
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
  }

  function closeConfirmModal() {
    var modal = document.getElementById('webEffectsConfirmModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
    if (typeof isMainMenuOpen === 'function' && isMainMenuOpen()) {
      if (typeof lockBodyScroll === 'function') lockBodyScroll();
    } else if (typeof unlockBodyScroll === 'function') {
      unlockBodyScroll();
    }
  }

  function confirmDisable() {
    setEnabled(false);
    closeConfirmModal();
  }

  function onEffectsButtonClick() {
    if (!enabled) {
      setEnabled(true);
      return;
    }
    openConfirmModal();
  }

  function bindUi() {
    var btn = document.getElementById('globalEffectsBtn');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', onEffectsButtonClick);
    }

    var yesBtn = document.getElementById('webEffectsConfirmYes');
    var noBtn = document.getElementById('webEffectsConfirmNo');
    var modal = document.getElementById('webEffectsConfirmModal');

    if (yesBtn && !yesBtn.dataset.bound) {
      yesBtn.dataset.bound = '1';
      yesBtn.addEventListener('click', confirmDisable);
    }
    if (noBtn && !noBtn.dataset.bound) {
      noBtn.dataset.bound = '1';
      noBtn.addEventListener('click', closeConfirmModal);
    }
    if (modal && !modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeConfirmModal();
      });
    }
  }

  function isConfirmOpen() {
    var modal = document.getElementById('webEffectsConfirmModal');
    return !!(modal && modal.classList.contains('active'));
  }

  function init() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/web-effects.js :: init');}catch(_bd){}
  try {

    enabled = readEnabled();
    applyDom();
    bindUi();
    updateButtonState();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/web-effects.js :: init');}catch(_bd){}
  }
}

  init();

  return {
    init: init,
    isEnabled: isEnabled,
    shouldReduceMotion: shouldReduceMotion,
    setEnabled: setEnabled,
    updateButtonState: updateButtonState,
    openConfirmModal: openConfirmModal,
    closeConfirmModal: closeConfirmModal,
    isConfirmOpen: isConfirmOpen
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/web-effects.js');}catch(_e){}
