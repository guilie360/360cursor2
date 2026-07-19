try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/pause-screen/pause-screen.js');}catch(_e){}
/* Pantalla de pausa premium — overlay inmersivo sobre el último frame */
var PauseScreen = (function () {
  var BUILDING_SVG =
    '<svg class="pause-screen__building-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M4 21V9l8-4 8 4v12h-3v-7H7v7H4zm3-9h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 13h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>' +
    '</svg>';

  var state = {
    config: null,
    project: null,
    visible: false,
    hiding: false,
    onConfirm: null,
    messagePool: [],
    messageOrder: [],
    messageIndex: 0,
    lastMessage: '',
    messageTimer: null,
    buttonTimer: null,
    bound: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function isEnabled() {
    return !!(state.config && state.config.enabled);
  }

  function isVisible() {
    return state.visible;
  }

  function setProject(project) {
    state.project = project || null;
    state.config = PauseScreenConfig.fromProject(project);
    applyThemeVars();
  }

  function applyThemeVars() {
    var gate = $('navResumeGate');
    if (!gate || !state.config) return;
    var cfg = state.config;
    gate.style.setProperty('--pause-blur', cfg.blur_px + 'px');
    gate.style.setProperty('--pause-overlay', String(cfg.overlay_opacity));
    gate.style.setProperty('--pause-glow', String(cfg.glow_intensity));
    gate.style.setProperty('--pause-breath-duration', (cfg.breathing_duration_ms / 1000) + 's');
    gate.classList.toggle('is-glow-off', !cfg.glow_enabled);
    gate.classList.toggle('is-breathing-off', !cfg.breathing_enabled);
    syncHeroButtonContext();
  }

  function syncHeroButtonContext() {
    var gate = $('navResumeGate');
    var cover = document.getElementById('projectCover');
    if (!gate) return;
    var btnColor = cover && cover.getAttribute('data-hero-button-text-color')
      ? cover.getAttribute('data-hero-button-text-color')
      : 'light';
    gate.setAttribute('data-hero-button-text-color', btnColor);
  }

  function formatQuotedMessage(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return '""';
    if (trimmed.charAt(0) === '\u201c' || trimmed.charAt(0) === '"') return trimmed;
    return '\u201c' + trimmed + '\u201d';
  }

  function getLogoUrl() {
    if (!state.project) return '';
    var config = state.project.proyecto_config || {};
    var constructora = state.project.constructoras || {};
    return config.logo_url || constructora.logo_url || '';
  }

  function getProjectImageUrl() {
    if (!state.project) return '';
    var config = state.project.proyecto_config || {};
    return config.imagen_hero_url || '';
  }

  function isLikelyPngLogo(url) {
    return /\.png(\?|#|$)/i.test(url || '');
  }

  function isUserAuthenticated() {
    return typeof VisitorSession !== 'undefined' && VisitorSession.isAuthenticated();
  }

  function resolveEmblem() {
    var cfg = state.config;
    var logoUrl = getLogoUrl();
    var projectImg = getProjectImageUrl();

    if (cfg.show_logo && logoUrl && isLikelyPngLogo(logoUrl)) {
      return { type: 'logo', src: logoUrl, alt: state.project.nombre || 'Logo' };
    }
    if (cfg.show_avatar) {
      if (projectImg) return { type: 'project-avatar', src: projectImg, alt: state.project.nombre || 'Proyecto' };
      if (logoUrl) return { type: 'project-avatar', src: logoUrl, alt: state.project.nombre || 'Proyecto' };
    }
    if (cfg.show_avatar && isUserAuthenticated()) {
      return { type: 'user-avatar' };
    }
    return { type: 'building' };
  }

  function resolveName() {
    var cfg = state.config;
    if (cfg.name_mode === 'user' && cfg.show_user_name && isUserAuthenticated()) {
      return typeof VisitorPersonalization !== 'undefined'
        ? VisitorPersonalization.getDisplayName()
        : '';
    }
    if (cfg.show_project_name && state.project) {
      var config = state.project.proyecto_config || {};
      return config.titulo_hero || state.project.nombre || '';
    }
    return '';
  }

  function renderEmblem(emblem) {
    var logoEl = $('pauseScreenLogo');
    var avatarEl = $('pauseScreenAvatar');
    var buildingEl = $('pauseScreenBuilding');
    if (!logoEl || !avatarEl || !buildingEl) return;

    logoEl.hidden = true;
    avatarEl.hidden = true;
    avatarEl.innerHTML = '';
    buildingEl.hidden = true;

    if (emblem.type === 'logo') {
      logoEl.src = emblem.src;
      logoEl.alt = emblem.alt || '';
      logoEl.hidden = false;
      return;
    }
    if (emblem.type === 'project-avatar') {
      avatarEl.innerHTML =
        '<img class="pause-screen__avatar-img" src="' + escapeHtml(emblem.src) + '" alt="' + escapeHtml(emblem.alt || '') + '">';
      avatarEl.hidden = false;
      return;
    }
    if (emblem.type === 'user-avatar' && typeof VisitorPersonalization !== 'undefined') {
      avatarEl.innerHTML = VisitorPersonalization.renderAvatarHtml('pause-screen-user-avatar');
      avatarEl.hidden = false;
      return;
    }
    buildingEl.innerHTML = BUILDING_SVG;
    buildingEl.hidden = false;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function buildMessagePlan() {
    var cfg = state.config;
    state.messagePool = PauseScreenMessages.buildPool(cfg.custom_messages);
    if (!state.messagePool.length) {
      state.messageOrder = ['La experiencia continúa aquí.'];
      state.messageIndex = 0;
      return;
    }
    state.messageOrder = cfg.random_order ? shuffle(state.messagePool) : state.messagePool.slice();
    state.messageIndex = 0;
  }

  function pickNextMessage() {
    var cfg = state.config;
    if (!state.messageOrder.length) return 'La experiencia continúa aquí.';
    if (state.messageIndex >= state.messageOrder.length) {
      state.messageOrder = cfg.random_order ? shuffle(state.messagePool) : state.messagePool.slice();
      state.messageIndex = 0;
    }
    var next = state.messageOrder[state.messageIndex++];
    if (cfg.avoid_consecutive_repeat && state.messageOrder.length > 1 && next === state.lastMessage) {
      return pickNextMessage();
    }
    return next;
  }

  function setMessageText(text, animate) {
    var el = $('pauseScreenMessage');
    if (!el) return;
    var display = formatQuotedMessage(text);
    if (!animate) {
      el.textContent = display;
      el.classList.remove('is-fading');
      state.lastMessage = text;
      return;
    }
    el.classList.add('is-fading');
    setTimeout(function () {
      if (!state.visible) return;
      el.textContent = formatQuotedMessage(text);
      state.lastMessage = text;
      requestAnimationFrame(function () {
        el.classList.remove('is-fading');
      });
    }, 300);
  }

  function scheduleMessageRotation() {
    clearMessageTimer();
    if (!state.config || !state.config.dynamic_messages_enabled) return;
    var cfg = state.config;
    var minMs = cfg.message_interval_min_ms;
    var maxMs = Math.max(minMs, cfg.message_interval_max_ms);
    var delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    state.messageTimer = setTimeout(function () {
      if (!state.visible) return;
      setMessageText(pickNextMessage(), true);
      scheduleMessageRotation();
    }, delay);
  }

  function clearMessageTimer() {
    if (state.messageTimer) {
      clearTimeout(state.messageTimer);
      state.messageTimer = null;
    }
  }

  function clearButtonTimer() {
    if (state.buttonTimer) {
      clearTimeout(state.buttonTimer);
      state.buttonTimer = null;
    }
  }

  function populateContent() {
    var cfg = state.config;
    renderEmblem(resolveEmblem());

    var nameEl = $('pauseScreenName');
    if (nameEl) {
      var name = resolveName();
      nameEl.textContent = name;
      nameEl.hidden = !name;
    }

    var btn = $('navResumeGateBtn');
    if (btn) btn.textContent = cfg.button_text || 'Continuar';

    buildMessagePlan();
    setMessageText(pickNextMessage(), false);
  }

  function revealButton() {
    var btn = $('navResumeGateBtn');
    if (!btn) return;
    btn.classList.remove('is-visible');
    clearButtonTimer();
    var delay = 300 + Math.floor(Math.random() * 200);
    state.buttonTimer = setTimeout(function () {
      if (!state.visible) return;
      btn.classList.add('is-visible');
    }, delay);
  }

  function lockScroll() {
    if (typeof lockBodyScroll === 'function') lockBodyScroll();
    document.body.classList.add('nav-resume-active');
  }

  function unlockScroll() {
    document.body.classList.remove('nav-resume-active');
  }

  function show(options) {
    options = options || {};
    state.onConfirm = typeof options.onConfirm === 'function' ? options.onConfirm : null;

    if (!isEnabled()) {
      if (options.autoConfirmIfDisabled && state.onConfirm) state.onConfirm();
      return false;
    }

    var gate = $('navResumeGate');
    if (!gate || state.visible) return false;

    applyThemeVars();
    populateContent();
    gate.hidden = false;
    gate.classList.remove('is-leaving', 'is-entering');
    void gate.offsetWidth;
    gate.classList.add('is-entering');

    state.visible = true;
    state.hiding = false;
    window.__navResumeGateOpen = true;
    lockScroll();

    var btn = $('navResumeGateBtn');
    if (btn) btn.classList.remove('is-visible');
    revealButton();
    scheduleMessageRotation();

    if (typeof syncNavigationCloseState === 'function') syncNavigationCloseState();
    return true;
  }

  function hide(options, done) {
    options = options || {};
    done = typeof done === 'function' ? done : function () {};
    var gate = $('navResumeGate');
    if (!gate || !state.visible) {
      state.visible = false;
      window.__navResumeGateOpen = false;
      unlockScroll();
      done();
      return;
    }

    if (options.immediate) {
      clearMessageTimer();
      clearButtonTimer();
      gate.hidden = true;
      gate.classList.remove('is-entering', 'is-leaving');
      state.visible = false;
      state.hiding = false;
      window.__navResumeGateOpen = false;
      unlockScroll();
      done();
      return;
    }

    if (state.hiding) return;
    state.hiding = true;
    clearMessageTimer();
    clearButtonTimer();
    gate.classList.remove('is-entering');
    gate.classList.add('is-leaving');

    setTimeout(function () {
      gate.hidden = true;
      gate.classList.remove('is-leaving');
      state.visible = false;
      state.hiding = false;
      window.__navResumeGateOpen = false;
      unlockScroll();
      done();
    }, 280);
  }

  function confirm() {
    if (!state.visible && !window.__navResumeGateOpen) return;
    var callback = state.onConfirm;
    hide(null, function () {
      if (callback) callback();
    });
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;
    var btn = $('navResumeGateBtn');
    var gate = $('navResumeGate');
    if (!btn || !gate) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      confirm();
    });

    gate.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target !== btn && e.target !== document.body && e.target !== gate) return;
      e.preventDefault();
      confirm();
    });
  }

  function init(project) {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/pause-screen/pause-screen.js :: init');}catch(_bd){}
  try {

    if (project) setProject(project);
    bind();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/pause-screen/pause-screen.js :: init');}catch(_bd){}
  }
}

  return {
    init: init,
    setProject: setProject,
    bind: bind,
    isEnabled: isEnabled,
    isVisible: isVisible,
    show: show,
    hide: hide,
    confirm: confirm
  };
})();

window.PauseScreen = PauseScreen;

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/pause-screen/pause-screen.js');}catch(_e){}
