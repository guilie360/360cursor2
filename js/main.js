try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/main.js');}catch(_e){}
/* =========================================================
   PROJECT DATA — populated from Supabase via project-data.js
   CONFIG, TYPOLOGIES, UNITS, DOWNLOADS, PROJECT_STAGES
   ========================================================= */
(function () {
  function paintBootBanner() {
    /* BootDebug overlay desactivado — no insertar #bootDebugBanner */
    return;
  }
  window.__mainTrace = function (stage, detail) {
    var msg = 'MAIN · ' + stage + (detail !== undefined && detail !== '' ? (' · ' + detail) : '');
    try { console.log('[MAIN]', stage, detail !== undefined ? detail : ''); } catch (e) {}
    if (typeof BootDebug !== 'undefined') {
      BootDebug.log(msg);
      paintBootBanner();
    }
  };
  window.__mainTraceError = function (stage, err) {
    var detail = err && err.message ? err.message : String(err);
    var msg = 'MAIN · FAIL · ' + stage + ' · ' + detail;
    try { console.error('[MAIN]', stage, err); } catch (e) {}
    if (typeof BootDebug !== 'undefined') {
      BootDebug.error(msg, err);
      paintBootBanner();
    }
  };
  window.__mainTraceSafe = function (stage, fn) {
    window.__mainTrace(stage + ' — start');
    try {
      var result = fn();
      window.__mainTrace(stage + ' — done');
      return result;
    } catch (err) {
      window.__mainTraceError(stage, err);
      throw err;
    }
  };
})();

if (typeof BootDebug !== 'undefined') BootDebug.log('main.js evaluating — start');
window.__mainTrace('inicio de main.js', 'readyState=' + document.readyState + ' theme-ready=' + document.documentElement.classList.contains('theme-ready'));
window.__mainTrace('DOM listo?', document.body ? 'body OK' : 'body AUSENTE');
var CONFIG = {};
var TYPOLOGIES = [];
var UNITS = {};
var DOWNLOADS = [];
var PROJECT_STAGES = [];
var PROJECT_DELIVERY = '';
var PROJECT_LAST_UPDATE = '';

var WHATSAPP_BASE = '';

function applyConfig() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/main.js :: applyConfig');}catch(_bd){}
  try {

  if (!CONFIG.projectName) {
    window.__mainTrace('applyConfig early return', 'sin projectName');
    return;
  }
  window.__mainTrace('applyConfig — start');
  document.getElementById('mainMenuProject').textContent = CONFIG.projectName;
  var constructoraEl = document.getElementById('mainMenuConstructora');
  if (constructoraEl) constructoraEl.textContent = CONFIG.constructoraName || '';
  document.getElementById('contactInstagramSub').textContent = CONFIG.instagramUser;
  document.getElementById('contactInstagram').href = CONFIG.instagramUrl || '#';
  document.getElementById('contactTelSub').textContent = CONFIG.phoneDisplay;
  document.getElementById('contactTel').href = CONFIG.phoneHref ? 'tel:' + CONFIG.phoneHref : '#';
  document.getElementById('contactDireccionSub').textContent = CONFIG.salesAddress;
  document.getElementById('contactDireccion').href = CONFIG.mapsUrl || '#';
  document.getElementById('contactWebSub').textContent = CONFIG.constructoraWeb;
  document.getElementById('contactWeb').href = CONFIG.constructoraWebUrl || '#';
  document.getElementById('contactEmailSub').textContent = CONFIG.email;
  document.getElementById('contactEmail').href = CONFIG.email ? 'mailto:' + CONFIG.email : '#';
  document.getElementById('directionsBtn').href = CONFIG.mapsUrl || '#';

  WHATSAPP_BASE = CONFIG.whatsappPhone
    ? 'https://api.whatsapp.com/send?phone=' + CONFIG.whatsappPhone + '&text='
    : '';

  var waFloat = document.getElementById('whatsappFloat');
  var contactWa = document.getElementById('contactWhatsapp');
  var shareFloat = document.getElementById('shareProjectFloatBtn');

  var advisorHref = '';
  if (CONFIG.whatsappHref) {
    advisorHref = CONFIG.whatsappHref;
    if (contactWa) contactWa.href = CONFIG.whatsappHref;
  } else if (WHATSAPP_BASE) {
    advisorHref = WHATSAPP_BASE + encodeURIComponent(CONFIG.whatsappDefaultMessage || '');
    if (contactWa) contactWa.href = advisorHref;
  } else {
    if (contactWa) contactWa.href = '#';
  }

  /* WhatsApp float replaced by ProductAssistant */
  if (waFloat) {
    waFloat.hidden = true;
    waFloat.classList.add('is-float-hidden');
    waFloat.setAttribute('aria-hidden', 'true');
  }
  if (shareFloat) {
    shareFloat.hidden = CONFIG.showShareFloat === false;
    shareFloat.classList.toggle('is-float-hidden', CONFIG.showShareFloat === false);
    shareFloat.setAttribute('aria-hidden', CONFIG.showShareFloat === false ? 'true' : 'false');
  }

  if (typeof applyProjectBackButton === 'function') {
    applyProjectBackButton({
      show_back_button: CONFIG.showBackButton,
      back_button_label: CONFIG.backButtonLabel,
      back_button_url: CONFIG.backButtonUrl
    });
  }
  if (typeof syncHeroSecondaryVisibility === 'function') {
    syncHeroSecondaryVisibility();
  }

  if (typeof ProductAssistant !== 'undefined') {
    var existingAssist = ProductAssistant.getInstance();
    if (existingAssist && typeof existingAssist.setAdvisorHref === 'function' && advisorHref) {
      existingAssist.setAdvisorHref(advisorHref);
    } else if (!existingAssist) {
      ProductAssistant.mount({
        context: 'project',
        advisorHref: advisorHref || undefined
      });
    }
  }
  window.__mainTrace('applyConfig — done');

  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/main.js :: applyConfig');}catch(_bd){}
  }
}

function lockBodyScroll()   { document.body.style.overflow = 'hidden'; }
function unlockBodyScroll() { document.body.style.overflow = ''; }

/* =========================================================
   VIBRACIÓN HÁPTICA — Web Vibration API
   Muy sutil (6–12ms). Si el dispositivo/navegador no la
   soporta, no hace absolutamente nada (fallback silencioso).
   ========================================================= */
function vibrate(pattern) {
  if (!('vibrate' in navigator)) return;
  if (navigator.userActivation && !navigator.userActivation.isActive) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

function hasUserActivation() {
  if (navigator.userActivation && navigator.userActivation.isActive) return true;
  return Date.now() - lastNavUserGestureAt < 500;
}

function isTabReturnCooldown() {
  return Date.now() - lastTabVisibleAt < TAB_RETURN_COOLDOWN_MS;
}

/* =========================================================
   TOAST — feedback breve reutilizable
   ========================================================= */
var toastEl = document.getElementById('appToast');
var toastTimer = null;
function showToast(message, duration) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  var holdMs = duration;
  if (holdMs == null) {
    holdMs = /^Bienvenido/i.test(String(message || '')) ? 2500 : 1000;
  }
  toastTimer = setTimeout(function () {
    toastEl.classList.remove('show');
  }, holdMs);
}


/* =========================================================
   AJUSTES — TEMAS Y SONIDOS (tema vía ThemeSystem global)
   ========================================================= */
function readJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

var SOUND_STORAGE_KEY  = 'guilie_sounds_enabled';

var soundsEnabled = readJSON(SOUND_STORAGE_KEY, true);

document.body.classList.remove('animations-reduced');

function isMotionReduced() {
  try {
    /* Móvil V3.8.2: animaciones siempre activas */
    if (window.matchMedia('(max-width: 600px)').matches) return false;
  } catch (e) {}
  if (typeof WebEffects !== 'undefined' && typeof WebEffects.shouldReduceMotion === 'function') {
    return WebEffects.shouldReduceMotion();
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

var soundsToggleEl = document.getElementById('soundsToggle');
var globalSoundBtn = document.getElementById('globalSoundBtn');

function toggleAppSounds() {
  soundsEnabled = !soundsEnabled;
  writeJSON(SOUND_STORAGE_KEY, soundsEnabled);
  renderSoundsToggle();
}

function renderSoundsToggle() {
  var on = !!soundsEnabled;
  if (soundsToggleEl) soundsToggleEl.classList.toggle('on', on);
  var alt = document.getElementById('personalizeSoundsToggle');
  if (alt) alt.classList.toggle('on', on);
  if (globalSoundBtn) {
    globalSoundBtn.classList.toggle('is-unmuted', on);
    globalSoundBtn.classList.toggle('is-muted', !on);
    globalSoundBtn.setAttribute('aria-label', on ? 'Silenciar sonidos de la web' : 'Activar sonidos de la web');
    globalSoundBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    globalSoundBtn.setAttribute('title', on ? 'Silenciar sonidos' : 'Activar sonidos');
  }
}

if (soundsToggleEl) {
  soundsToggleEl.addEventListener('click', toggleAppSounds);
}
if (globalSoundBtn) {
  globalSoundBtn.addEventListener('click', toggleAppSounds);
}
renderSoundsToggle();

/* Sistema de sonidos: archivos opcionales + whoosh sintético (Web Audio)
   para menú / popups cuando no hay MP3. */
var SOUND_FILES = {
  // buttonTap:   new Audio('sounds/tap.mp3'),
  // menuOpen:    new Audio('sounds/menu-open.mp3'),
  // menuClose:   new Audio('sounds/menu-close.mp3'),
  // popupOpen:   new Audio('sounds/popup-open.mp3'),
  // popupClose:  new Audio('sounds/popup-close.mp3'),
  // tour360Enter: new Audio('sounds/tour360.mp3')
};

var _soundAudioCtx = null;
function getSoundAudioContext() {
  var Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!_soundAudioCtx) _soundAudioCtx = new Ctx();
  if (_soundAudioCtx.state === 'suspended') {
    try { _soundAudioCtx.resume(); } catch (e) {}
  }
  return _soundAudioCtx;
}

/** Whoosh tipo “fffuuuuj / woosh” con ruido filtrado. */
function playWhooshSound(direction) {
  var ctx = getSoundAudioContext();
  if (!ctx) return;
  var isOpen = direction !== 'out';
  var duration = isOpen ? 0.42 : 0.36;
  var sampleRate = ctx.sampleRate;
  var frameCount = Math.max(1, Math.floor(sampleRate * duration));
  var buffer = ctx.createBuffer(1, frameCount, sampleRate);
  var data = buffer.getChannelData(0);
  var i;
  for (i = 0; i < frameCount; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.55;
  }

  var source = ctx.createBufferSource();
  source.buffer = buffer;

  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.85;

  var gain = ctx.createGain();
  var now = ctx.currentTime;
  var peak = 0.085;

  if (isOpen) {
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + duration * 0.55);
    filter.frequency.exponentialRampToValueAtTime(900, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  } else {
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak * 0.9, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration + 0.02);
}

/** Tic/tac profundo y breve al hover de botones. */
var _lastButtonHoverSoundAt = 0;
var _buttonHoverTickHigh = true;

function playButtonHoverSound() {
  if (!soundsEnabled) return;
  var nowMs = Date.now();
  if (nowMs - _lastButtonHoverSoundAt < 65) return;
  _lastButtonHoverSoundAt = nowMs;

  var ctx = getSoundAudioContext();
  if (!ctx) return;

  var now = ctx.currentTime;
  var duration = 0.048;
  _buttonHoverTickHigh = !_buttonHoverTickHigh;
  var freq = _buttonHoverTickHigh ? 108 : 82;

  var osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(55, freq * 0.72), now + duration);

  var filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(520, now);
  filter.Q.value = 0.7;

  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.038, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function bindButtonHoverSounds() {
  var selector = [
    'button:not([disabled])',
    '.project-cover-btn',
    '.tour360-card-enter',
    '.video-ctrl-btn',
    '.outline-btn',
    '.auth-action-btn',
    '.unit-typo-btn',
    '.unit-card-btn',
    '.uc-hero-btn',
    '.units-tab',
    '.units-compare-btn',
    '.menu-item',
    '.contact-link'
  ].join(',');

  document.addEventListener('pointerover', function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest(selector);
    if (!btn) return;
    if (btn.matches('.global-close-btn, .global-fullscreen-btn, .main-menu-recovery-close, .modal-close')) return;
    if (btn.contains(e.relatedTarget)) return;
    playButtonHoverSound();
  }, true);
}

bindButtonHoverSounds();
window.__mainTrace('bindButtonHoverSounds');

function playSound(eventName) {
  if (!soundsEnabled) return;
  var audio = SOUND_FILES[eventName];
  if (audio) {
    try { audio.currentTime = 0; audio.play().catch(function(){}); } catch (e) {}
    return;
  }
  if (eventName === 'menuOpen' || eventName === 'popupOpen') {
    try { playWhooshSound('in'); } catch (e) {}
    return;
  }
  if (eventName === 'menuClose' || eventName === 'popupClose') {
    try { playWhooshSound('out'); } catch (e) {}
  }
}

/* ================= VIDEO DE FONDO ================= */
var coverVideo = document.getElementById('coverVideo');
window.__mainTrace('coverVideo', coverVideo ? 'encontrado' : 'null');
if (coverVideo) {
  coverVideo.addEventListener('canplay', function() {
    coverVideo.play().catch(function(){});
  });
}
function pauseCoverVideo()  { if (coverVideo && !coverVideo.paused) coverVideo.pause(); }
function resumeCoverVideo() { if (coverVideo &&  coverVideo.paused) coverVideo.play().catch(function(){}); }

/* ================= DATOS DE ZONAS CON RECORRIDO 360° ================= */
var TOUR360 = {
  apto1: {
    name: 'Apto 1',
    area: 72
  },
  apto2: {
    name: 'Apto 2',
    area: 85
  },
  apto3: {
    name: 'Apto 3',
    area: 68
  },
  parqueadero: {
    name: 'Parqueadero',
    area: 12
  },
  lobby: {
    name: 'Lobby',
    area: 180
  },
  zonaSocial: {
    name: 'Zona social',
    area: 240
  },
  terraza: {
    name: 'Terraza',
    area: 95
  },
  amenidades: {
    name: 'Amenidades',
    area: 320
  },
  modelo: {
    name: 'Modelo amoblado',
    area: 78
  }
};

function formatTour360Area(area) {
  var value = Number(area);
  if (!isFinite(value) || value <= 0) return '';
  var rounded = Math.round(value * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)) + ' m²';
}

/* =========================================================
   FAVORITOS — Supabase para visitantes autenticados
   ========================================================= */
function getFavorites() {
  if (typeof VisitorSession !== 'undefined' && VisitorSession.isAuthenticated()) {
    return VisitorSession.getFavoriteViviendaIds();
  }
  return [];
}
function isFavorite(key) {
  return getFavorites().indexOf(key) !== -1;
}
function favHeartSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.2-4.35-9.6-8.55C.9 8.7 2.25 5.4 5.55 4.65c1.8-.4 3.6.3 4.65 1.8C11.25 4.95 13.05 4.25 14.85 4.65c3.3.75 4.65 4.05 3.15 6.8C19.2 15.65 12 20 12 20z"/></svg>';
}

function syncFavButtonEl(el, isFav) {
  if (!el) return;
  el.classList.toggle('active', !!isFav);
  el.classList.toggle('is-active', !!isFav);
  el.innerHTML = favHeartSvg();
  el.setAttribute('aria-label', isFav ? 'Quitar de favoritos' : 'Agregar a favoritos');
}

async function toggleFavorite(key, btnEl) {
  if (!VisitorSession.isAuthenticated()) {
    showToast('Inicia sesión para guardar favoritos');
    VisitorAuthModal.open('gate');
    return false;
  }

  var nowFav;
  try {
    nowFav = await VisitorSession.toggleFavoriteVivienda(key);
  } catch (err) {
    showToast(err.message || 'No se pudo actualizar el favorito');
    return isFavorite(key);
  }

  vibrate(10);
  document.querySelectorAll('.fav-btn[data-fav="' + key + '"]').forEach(function (el) {
    syncFavButtonEl(el, nowFav);
    el.classList.add('pulse');
    setTimeout(function () { el.classList.remove('pulse'); }, 280);
  });
  updateFavoritesTabCount();
  if (currentUnitsTab === 'fav') renderUnitsGrid('fav');
  showToast(nowFav ? 'Agregado a favoritos' : 'Quitado de favoritos');
  return nowFav;
}
function updateFavoritesTabCount() {
  var favTabBtn = document.getElementById('unitsTabFav');
  if (!favTabBtn) return;
  var n = getFavorites().length;
  var mobile = window.matchMedia('(max-width: 600px)').matches;
  favTabBtn.textContent = mobile ? (n ? 'Favoritos · ' + n : 'Favoritos') : ('Favoritos (' + n + ')');
}

/* =========================================================
   COMPARTIR — Web Share API con fallback a portapapeles.
   Al finalizar con éxito (por cualquiera de las dos vías)
   se muestra un toast breve con el mensaje indicado.
   ========================================================= */
function shareContent(shareData, fallbackText, successMsg) {
  if (navigator.share) {
    navigator.share(shareData).then(function () {
      vibrate(8);
      showToast(successMsg);
    }).catch(function () {});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fallbackText).then(function () {
      vibrate(8);
      showToast(successMsg);
    }).catch(function () {
      showToast('No se pudo copiar el enlace');
    });
  } else {
    showToast('No se pudo copiar el enlace');
  }
}
function shareProject() {
  var url = (CONFIG.shareUrl || '').trim() ||
    window.location.href.split('?')[0].split('#')[0];
  if (CONFIG.shareUrl) {
    try {
      url = new URL(CONFIG.shareUrl, window.location.href).href;
    } catch (e) {
      url = CONFIG.shareUrl;
    }
  } else {
    url = window.location.href.split('?')[0].split('#')[0];
    try {
      var proyecto = new URLSearchParams(window.location.search).get('proyecto');
      if (proyecto) url += '?proyecto=' + encodeURIComponent(proyecto);
    } catch (e2) {}
  }
  shareContent(
    { title: CONFIG.projectName, text: CONFIG.tagline, url: url },
    CONFIG.projectName + ' — ' + CONFIG.tagline + ' ' + url,
    'Proyecto compartido'
  );
}
function unitDeepLink(key) {
  var base = window.location.href.split('?')[0].split('#')[0];
  return base + '?vivienda=' + encodeURIComponent(key);
}
function shareUnit(key) {
  var u = UNITS[key];
  if (!u) return;
  var url = unitDeepLink(key);
  var text = u.name + ' · ' + u.area + ' m² · ' + formatCOP(u.price);
  shareContent(
    { title: u.name, text: text, url: url },
    text + ' ' + url,
    'Vivienda compartida'
  );
}

/* ---- Botón flotante de compartir proyecto ---- */
window.__mainTraceSafe('bind shareProjectFloatBtn', function () {
  var shareBtn = document.getElementById('shareProjectFloatBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () { shareProject(); });
  }
  var assistMobile = document.getElementById('projectAssistBtnMobile');
  if (assistMobile) {
    assistMobile.addEventListener('click', function () {
      if (typeof ProductAssistant !== 'undefined' && ProductAssistant.getInstance()) {
        ProductAssistant.getInstance().open();
      }
    });
  }
  if (typeof syncHeroSecondaryVisibility === 'function') {
    syncHeroSecondaryVisibility();
  }
});

/* ================= RENDER DE TARJETAS DE UNIDADES ================= */
var unitsGrid = document.getElementById('unitsGrid');
var unitsComparePanel = document.getElementById('unitsComparePanel');
var favoritesEmptyEl = document.getElementById('favoritesEmpty');
var compareEmptyEl = document.getElementById('compareEmpty');
var currentUnitsTab = 'all';
var unitsViewMode = 'browse';
var comparePickMode = false;
var COMPARE_MAX_UNITS = 2;
var COMPARE_STORAGE_KEY = 'boxies_compare_unit_keys';

function getCompareUnitKeys() {
  try {
    var raw = sessionStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter(function (key) { return !!UNITS[key]; }).slice(0, COMPARE_MAX_UNITS);
  } catch (e) {
    return [];
  }
}

function getFavoriteUnitKeys() {
  return getFavorites().filter(function (key) { return !!UNITS[key]; });
}

function setCompareUnitKeys(keys) {
  var favs = getFavoriteUnitKeys();
  keys = (keys || []).filter(function (key) {
    return !!UNITS[key] && favs.indexOf(key) !== -1;
  }).slice(0, COMPARE_MAX_UNITS);
  sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(keys));
  return keys;
}

function initCompareUnitKeysFromFavorites() {
  var favs = getFavorites().filter(function (key) { return !!UNITS[key]; });
  return setCompareUnitKeys(favs.slice(0, COMPARE_MAX_UNITS));
}

function tryAddCompareUnit(key) {
  if (!UNITS[key]) return false;
  if (!isFavorite(key)) {
    showToast('Agrega la vivienda a favoritos para compararla');
    return false;
  }
  var keys = getCompareUnitKeys();
  if (keys.indexOf(key) !== -1) return true;
  if (keys.length >= COMPARE_MAX_UNITS) {
    showCompareLimitNotice();
    return false;
  }
  keys.push(key);
  setCompareUnitKeys(keys);
  return true;
}

function removeCompareUnit(key) {
  var keys = getCompareUnitKeys().filter(function (k) { return k !== key; });
  setCompareUnitKeys(keys);
  return keys;
}

function showCompareLimitNotice() {
  var host = unitsComparePanel || document.getElementById('unitsPopup');
  if (!host) return;
  var existing = host.querySelector('.uc-limit-overlay');
  if (existing) {
    existing.hidden = false;
    return;
  }
  var overlay = document.createElement('div');
  overlay.className = 'uc-limit-overlay';
  overlay.innerHTML =
    '<div class="uc-limit-card" role="dialog" aria-labelledby="ucLimitTitle">' +
      '<h3 class="uc-limit-title" id="ucLimitTitle">Comparación enfocada</h3>' +
      '<p class="uc-limit-text">El comparador admite hasta dos viviendas para ofrecer una comparación clara y fácil de analizar. Si deseas comparar otra opción, primero elimina una de las actuales o guárdala en Favoritos.</p>' +
      '<button type="button" class="uc-limit-btn" data-uc-action="limit-ok">Entendido</button>' +
    '</div>';
  host.appendChild(overlay);
  overlay.querySelector('[data-uc-action="limit-ok"]').onclick = function () {
    overlay.hidden = true;
  };
}

function escapeUnitsHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

var UNITS_COMPARE_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    icon: 'home',
    metrics: [
      { key: 'unitType', label: 'Tipo de vivienda', icon: 'type', compare: false }
    ]
  },
  {
    id: 'ubicacion',
    label: 'Ubicación',
    icon: 'tower',
    metrics: [
      { key: 'tower', label: 'Torre', icon: 'tower', compare: false },
      { key: 'floor', label: 'Piso', icon: 'floor', compare: false }
    ]
  },
  {
    id: 'espacios',
    label: 'Espacios',
    icon: 'bed',
    metrics: [
      { key: 'rooms', label: 'Habitaciones', icon: 'bed', compare: true, highlight: true },
      { key: 'baths', label: 'Baños', icon: 'bath', compare: true },
      { key: 'privateBaths', label: 'Baños privados', icon: 'bath', compare: true },
      { key: 'parking', label: 'Parqueaderos', icon: 'park', compare: true }
    ]
  },
  {
    id: 'areas',
    label: 'Áreas',
    icon: 'area',
    metrics: [
      { key: 'area', label: 'Área privada', icon: 'area', compare: true, format: 'area', highlight: true },
      {
        key: 'areaPerRoom',
        label: 'm² por habitación',
        icon: 'area',
        compare: true,
        compute: function (u) {
          if (!u.rooms) return '—';
          return (Math.round((u.area / u.rooms) * 10) / 10) + ' m²';
        },
        raw: function (u) {
          if (!u.rooms) return NaN;
          return u.area / u.rooms;
        }
      }
    ]
  },
  {
    id: 'valores',
    label: 'Valores',
    icon: 'cost',
    metrics: [
      { key: 'price', label: 'Precio', icon: 'cost', compare: true, format: 'price', highlight: true },
      { key: 'adminFee', label: 'Administración', icon: 'cost', compare: true, format: 'admin' }
    ]
  },
  {
    id: 'acabados',
    label: 'Acabados',
    icon: 'type',
    metrics: [
      {
        key: 'finishes',
        label: 'Acabados',
        icon: 'type',
        compare: false,
        compute: function () { return 'Consultar sala de ventas'; }
      }
    ]
  },
  {
    id: 'especiales',
    label: 'Características especiales',
    icon: 'home',
    metrics: [
      { key: 'availability', label: 'Disponibilidad', icon: 'type', compare: false }
    ]
  }
];

var UC_SVG = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/></svg>',
  bed: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5V20h18v-9.5"/><path d="M7 20v-5h10v5"/><path d="M12 4v6"/></svg>',
  area: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M9 4v16"/></svg>',
  cost: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/></svg>',
  bath: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M6 12V7a2 2 0 0 1 2-2h1"/><path d="M18 12V8"/></svg>',
  park: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 19v2M17 19v2"/></svg>',
  tower: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V5l6-3 6 3v16"/><path d="M10 21v-4h4v4"/></svg>',
  floor: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h5"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
};

function ucIcon(name) {
  return UC_SVG[name] || UC_SVG.type;
}

function formatCOPShort(amount) {
  var num = Number(amount);
  if (!num || Number.isNaN(num)) return '—';
  if (num >= 1000000000) return '$' + (Math.round(num / 100000000) / 10) + ' MM';
  if (num >= 1000000) return '$' + Math.round(num / 1000000) + ' M';
  if (num >= 1000) return '$' + Math.round(num / 1000) + ' K';
  return formatCOP(num);
}

function formatCompareDifferenceLabel(units, metric) {
  if (units.length !== 2) return '';
  var a = units[0];
  var b = units[1];

  if (!metric.compare) {
    var valA = getUnitCompareMetricValue(a, metric);
    var valB = getUnitCompareMetricValue(b, metric);
    if (valA === valB) {
      if (metric.key === 'tower') return 'Misma torre';
      if (metric.key === 'floor') return 'Mismo piso';
      if (metric.key === 'unitType') return 'Mismo tipo';
      return 'Igual';
    }
    if (metric.key === 'unitType') return 'Tipos distintos';
    if (metric.key === 'tower') return 'Torres distintas';
    if (metric.key === 'floor') {
      var floorA = Number(a.floor);
      var floorB = Number(b.floor);
      if (!Number.isNaN(floorA) && !Number.isNaN(floorB)) {
        var floorGap = Math.abs(floorB - floorA);
        return floorGap + (floorGap === 1 ? ' piso de diferencia' : ' pisos de diferencia');
      }
      return 'Pisos distintos';
    }
    return 'Distinto';
  }

  var rawA = getUnitCompareMetricRaw(a, metric);
  var rawB = getUnitCompareMetricRaw(b, metric);
  if (Number.isNaN(rawA) || Number.isNaN(rawB)) return '—';
  if (rawA === rawB) {
    if (metric.format === 'area') return 'Misma área';
    if (metric.key === 'rooms' || metric.key === 'baths' || metric.key === 'privateBaths' || metric.key === 'parking') {
      return 'Misma cantidad';
    }
    if (metric.format === 'price') return 'Mismo precio';
    if (metric.format === 'admin') return 'Mismo valor';
    return 'Igual';
  }

  var diff = Math.abs(rawB - rawA);

  if (metric.format === 'area') {
    return Math.round(diff) + ' m² adicionales';
  }
  if (metric.key === 'rooms') {
    if (diff === 1) return 'Una habitación de diferencia';
    return Math.round(diff) + ' habitaciones de diferencia';
  }
  if (metric.key === 'baths' || metric.key === 'privateBaths') {
    if (diff === 1) return 'Un baño adicional';
    return Math.round(diff) + ' baños de diferencia';
  }
  if (metric.key === 'parking') {
    if (diff === 1) return 'Un espacio adicional';
    return Math.round(diff) + ' espacios de diferencia';
  }
  if (metric.format === 'price' || metric.format === 'admin') {
    if (rawB > rawA) return 'Incremento de ' + formatCOPShort(diff).replace(/^\$/, '');
    return 'Reducción de ' + formatCOPShort(diff).replace(/^\$/, '');
  }
  if (metric.key === 'areaPerRoom') {
    return (Math.round(diff * 10) / 10) + ' m² de diferencia';
  }
  return 'Diferencia de ' + (Math.round(diff * 10) / 10);
}

function getUnitShortLabel(unit) {
  var tag = String(unit.tag || '').trim();
  if (tag) return tag;
  var name = String(unit.name || '').trim();
  if (name.length > 18) return name.slice(0, 16) + '…';
  return name || '—';
}

function getUnitCompareMetricValue(unit, metric) {
  if (metric.compute) return metric.compute(unit);
  if (metric.format === 'area') return unit.area ? unit.area + ' m²' : '—';
  if (metric.format === 'price') return unit.price ? formatCOP(unit.price) : '—';
  if (metric.format === 'admin') return unit.adminFee ? formatCOP(unit.adminFee) : '—';
  var value = unit[metric.key];
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function getUnitCompareMetricRaw(unit, metric) {
  if (metric.raw) return metric.raw(unit);
  if (metric.format === 'area') return Number(unit.area) || NaN;
  if (metric.format === 'price') return Number(unit.price) || NaN;
  if (metric.format === 'admin') return Number(unit.adminFee) || NaN;
  var value = unit[metric.key];
  if (value === null || value === undefined || value === '') return NaN;
  var num = Number(value);
  return Number.isNaN(num) ? NaN : num;
}

function renderCompareMatrixHead(units) {
  return (
    '<div class="uc-matrix-head uc-matrix-head--dual">' +
      '<span class="uc-matrix-head-label">Característica</span>' +
      '<span class="uc-matrix-head-unit">' + escapeUnitsHtml(getUnitShortLabel(units[0])) + '</span>' +
      '<span class="uc-matrix-head-diff">Diferencia</span>' +
      '<span class="uc-matrix-head-unit">' + escapeUnitsHtml(getUnitShortLabel(units[1])) + '</span>' +
    '</div>'
  );
}

function renderCompareMatrixRow(metric, units) {
  var values = units.map(function (u) { return getUnitCompareMetricValue(u, metric); });
  var rowClass = 'uc-matrix-row uc-matrix-row--dual' + (metric.highlight ? ' uc-matrix-row--key' : '');
  var diffLabel = formatCompareDifferenceLabel(units, metric);

  return (
    '<div class="' + rowClass + '">' +
      '<div class="uc-matrix-metric">' +
        '<span class="uc-matrix-metric-icon" aria-hidden="true">' + ucIcon(metric.icon || 'type') + '</span>' +
        '<span class="uc-matrix-metric-label">' + escapeUnitsHtml(metric.label) + '</span>' +
      '</div>' +
      '<div class="uc-matrix-cells uc-matrix-cells--dual">' +
        '<div class="uc-matrix-cell" data-unit-label="' + escapeUnitsHtml(getUnitShortLabel(units[0])) + '">' +
          '<span class="uc-matrix-value">' + escapeUnitsHtml(values[0]) + '</span>' +
        '</div>' +
        '<div class="uc-matrix-cell uc-matrix-cell--diff">' +
          '<span class="uc-matrix-diff-label">' + escapeUnitsHtml(diffLabel) + '</span>' +
        '</div>' +
        '<div class="uc-matrix-cell" data-unit-label="' + escapeUnitsHtml(getUnitShortLabel(units[1])) + '">' +
          '<span class="uc-matrix-value">' + escapeUnitsHtml(values[1]) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderCompareMobileRow(metric, units) {
  var values = units.map(function (u) { return getUnitCompareMetricValue(u, metric); });
  var diffLabel = formatCompareDifferenceLabel(units, metric);
  return (
    '<article class="uc-mobile-row' + (metric.highlight ? ' uc-mobile-row--key' : '') + '">' +
      '<h5 class="uc-mobile-row-label">' + escapeUnitsHtml(metric.label) + '</h5>' +
      '<div class="uc-mobile-row-compare">' +
        '<div class="uc-mobile-side">' +
          '<span class="uc-mobile-side-tag">' + escapeUnitsHtml(getUnitShortLabel(units[0])) + '</span>' +
          '<span class="uc-mobile-side-value">' + escapeUnitsHtml(values[0]) + '</span>' +
        '</div>' +
        '<span class="uc-mobile-vs" aria-hidden="true">vs</span>' +
        '<div class="uc-mobile-side">' +
          '<span class="uc-mobile-side-tag">' + escapeUnitsHtml(getUnitShortLabel(units[1])) + '</span>' +
          '<span class="uc-mobile-side-value">' + escapeUnitsHtml(values[1]) + '</span>' +
        '</div>' +
      '</div>' +
      (diffLabel && diffLabel !== '—' && diffLabel !== 'Igual'
        ? '<p class="uc-mobile-row-diff">' + escapeUnitsHtml(diffLabel) + '</p>'
        : '') +
    '</article>'
  );
}

function renderCompareCategory(cat, catIndex, units) {
  var rowsHtml = cat.metrics.map(function (metric) {
    return renderCompareMatrixRow(metric, units);
  }).join('');
  var mobileHtml = cat.metrics.map(function (metric) {
    return renderCompareMobileRow(metric, units);
  }).join('');
  return (
    '<section class="uc-category is-open" data-uc-category="' + escapeUnitsHtml(cat.id) + '" style="--uc-cat-stagger:' + catIndex + '">' +
      '<button type="button" class="uc-category-toggle" data-uc-toggle-category aria-expanded="true">' +
        '<span class="uc-category-icon" aria-hidden="true">' + ucIcon(cat.icon) + '</span>' +
        '<span class="uc-category-label">' + escapeUnitsHtml(cat.label) + '</span>' +
        '<span class="uc-category-chevron" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="uc-category-body">' +
        '<div class="uc-category-inner">' +
          '<div class="uc-matrix-rows uc-matrix-rows--desktop">' + rowsHtml + '</div>' +
          '<div class="uc-mobile-stack">' + mobileHtml + '</div>' +
        '</div>' +
      '</div>' +
    '</section>'
  );
}
function renderCompareHeroCard(key, unit, index) {
  var imageStyle = unit.cardImageUrl
    ? ' style="background-image:url(' + escapeUnitsHtml(unit.cardImageUrl) + ')"'
    : '';
  var favActive = isFavorite(key);
  return (
    '<article class="uc-hero-card" data-unit-key="' + escapeUnitsHtml(key) + '" style="--uc-stagger:' + (index || 0) + '">' +
      '<div class="uc-hero-media"' + imageStyle + '>' +
        '<div class="uc-hero-media-actions">' +
          '<button type="button" class="icon-btn fav-btn uc-hero-icon-btn uc-hero-fav' + (favActive ? ' active is-active' : '') + '" data-action="fav" data-fav="' + escapeUnitsHtml(key) + '" aria-label="' + (favActive ? 'Quitar de favoritos' : 'Agregar a favoritos') + '">' + favHeartSvg() + '</button>' +
          '<button type="button" class="uc-hero-icon-btn" data-action="remove" aria-label="Quitar de la comparación">' + ucIcon('trash') + '</button>' +
        '</div>' +
        (unit.cardImageUrl ? '' : '<span class="uc-hero-media-fallback">' + escapeUnitsHtml(unit.cardLabel || unit.name) + '</span>') +
      '</div>' +
      '<div class="uc-hero-body">' +
        '<span class="uc-hero-tag">' + escapeUnitsHtml(unit.tag || '—') + '</span>' +
        '<h3 class="uc-hero-name">' + escapeUnitsHtml(unit.name || '—') + '</h3>' +
        '<p class="uc-hero-price">' + escapeUnitsHtml(unit.price ? formatCOP(unit.price) : '—') + '</p>' +
        '<div class="uc-hero-quick">' +
          '<span class="uc-hero-quick-item">' + ucIcon('area') + escapeUnitsHtml(unit.area + ' m²') + '</span>' +
          '<span class="uc-hero-quick-item">' + ucIcon('bed') + escapeUnitsHtml(String(unit.rooms)) + ' hab.</span>' +
          '<span class="uc-hero-quick-item">' + ucIcon('bath') + escapeUnitsHtml(String(unit.baths)) + ' baños</span>' +
          (unit.parking ? '<span class="uc-hero-quick-item">' + ucIcon('park') + escapeUnitsHtml(String(unit.parking)) + ' parq.</span>' : '') +
        '</div>' +
        '<div class="uc-hero-actions">' +
          '<button type="button" class="uc-hero-btn" data-action="plans">Ver planos</button>' +
          '<button type="button" class="uc-hero-btn uc-hero-btn--cta" data-action="tour360">' + ucIcon('cube') + ' Ver 360°</button>' +
        '</div>' +
      '</div>' +
    '</article>'
  );
}

function joinNaturalList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ' y ' + items[1];
  return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
}

function buildCompareNarrativeSummary(units) {
  if (units.length !== 2) return '';
  var a = units[0];
  var b = units[1];
  var sentences = [];

  function shortName(u) {
    return u.name || u.tag || 'esta vivienda';
  }

  if (a.tower && b.tower && String(a.tower) === String(b.tower)) {
    sentences.push('Las dos viviendas pertenecen a la Torre ' + a.tower + '.');
  }

  if (a.rooms === b.rooms && a.rooms) {
    sentences.push('Ambas cuentan con ' + a.rooms + ' habitación' + (a.rooms === 1 ? '' : 'es') + '.');
  }

  if (b.area > a.area) {
    sentences.push('El ' + shortName(b) + ' ofrece ' + Math.round(b.area - a.area) + ' m² adicionales.');
  } else if (a.area > b.area) {
    sentences.push('El ' + shortName(a) + ' ofrece ' + Math.round(a.area - b.area) + ' m² adicionales.');
  }

  if (b.privateBaths > a.privateBaths) {
    var pb = b.privateBaths - a.privateBaths;
    sentences.push('El ' + shortName(b) + ' incluye ' + (pb === 1 ? 'un baño privado adicional' : pb + ' baños privados adicionales') + '.');
  } else if (a.privateBaths > b.privateBaths) {
    var pbA = a.privateBaths - b.privateBaths;
    sentences.push('El ' + shortName(a) + ' incluye ' + (pbA === 1 ? 'un baño privado adicional' : pbA + ' baños privados adicionales') + '.');
  } else if (b.baths > a.baths) {
    var bd = b.baths - a.baths;
    sentences.push('El ' + shortName(b) + ' incluye ' + (bd === 1 ? 'un baño adicional' : bd + ' baños adicionales') + '.');
  } else if (a.baths > b.baths) {
    var bdA = a.baths - b.baths;
    sentences.push('El ' + shortName(a) + ' incluye ' + (bdA === 1 ? 'un baño adicional' : bdA + ' baños adicionales') + '.');
  }

  if (b.parking > a.parking) {
    var pk = b.parking - a.parking;
    sentences.push('El ' + shortName(b) + ' cuenta con ' + (pk === 1 ? 'un parqueadero adicional' : pk + ' parqueaderos adicionales') + '.');
  } else if (a.parking > b.parking) {
    var pkA = a.parking - b.parking;
    sentences.push('El ' + shortName(a) + ' cuenta con ' + (pkA === 1 ? 'un parqueadero adicional' : pkA + ' parqueaderos adicionales') + '.');
  }

  if (a.price !== b.price) {
    sentences.push('La diferencia económica entre ambas opciones es de ' + formatCOPShort(Math.abs(a.price - b.price)) + '.');
  }

  return sentences.slice(0, 5).join(' ');
}

function buildCompareInsights(favKeys, units) {
  var narrative = buildCompareNarrativeSummary(units);
  return { narrative: narrative };
}

function renderCompareInsightsPanel(favKeys, units) {
  var result = buildCompareInsights(favKeys, units);
  if (!result.narrative) return '';
  return (
    '<aside class="uc-insights uc-insights--narrative">' +
      '<h4 class="uc-insights-title">Resumen</h4>' +
      '<p class="uc-insights-narrative">' + escapeUnitsHtml(result.narrative) + '</p>' +
    '</aside>'
  );
}

function downloadComparePdf(favKeys, units) {
  if (typeof UnitsComparePdf === 'undefined') {
    if (typeof showToast === 'function') showToast('No se pudo cargar el módulo de PDF');
    return;
  }
  var narrative = buildCompareNarrativeSummary(units);
  var tableRows = UnitsComparePdf.buildTableRows(
    UNITS_COMPARE_CATEGORIES,
    units,
    getUnitCompareMetricValue,
    formatCompareDifferenceLabel
  );
  UnitsComparePdf.download({
    units: units.map(function (u, i) {
      return {
        tag: u.tag || getUnitShortLabel(u),
        name: u.name || '—',
        price: u.price ? formatCOP(u.price) : '—',
        area: u.area ? u.area + ' m²' : '—',
        rooms: String(u.rooms || '—'),
        baths: String(u.baths || '—')
      };
    }),
    summary: narrative,
    tableRows: tableRows
  });
}

function bindComparePanelEvents(favKeys, units) {
  if (!unitsComparePanel) return;

  var backBtn = unitsComparePanel.querySelector('[data-uc-action="back"]');
  if (backBtn) {
    backBtn.onclick = function () { exitUnitsCompareMode(); };
  }

  var addBtn = unitsComparePanel.querySelector('[data-uc-action="add"]');
  if (addBtn) {
    addBtn.onclick = function () { startComparePick(); };
  }

  var pdfBtn = unitsComparePanel.querySelector('[data-uc-action="pdf"]');
  if (pdfBtn) {
    pdfBtn.onclick = function () { downloadComparePdf(favKeys, units); };
  }

  unitsComparePanel.querySelectorAll('[data-uc-toggle-category]').forEach(function (btn) {
    btn.onclick = function () {
      var section = btn.closest('.uc-category');
      if (!section) return;
      var isOpen = section.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };
  });

  unitsComparePanel.querySelectorAll('.uc-hero-card').forEach(function (card) {
    var key = card.getAttribute('data-unit-key');
    var unit = UNITS[key];
    if (!unit) return;

    var favBtn = card.querySelector('[data-action="fav"]');
    if (favBtn) {
      favBtn.onclick = function (e) {
        e.stopPropagation();
        toggleFavorite(key, favBtn);
      };
    }

    var removeBtn = card.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.onclick = function (e) {
        e.stopPropagation();
        var keys = removeCompareUnit(key);
        if (keys.length < COMPARE_MAX_UNITS) {
          if (typeof showToast === 'function') {
            showToast('Selecciona otra vivienda para completar la comparación');
          }
          startComparePick();
        } else {
          renderUnitsCompare(keys);
        }
      };
    }

    var plansBtn = card.querySelector('[data-action="plans"]');
    if (plansBtn) {
      plansBtn.onclick = function (e) {
        e.stopPropagation();
        var hasPlans = unit.planosModo === 'file' && unit.plans && unit.plans.some(function (p) { return p && p.url; });
        if (hasPlans) goTo('plans', key);
        else goTo('sphere');
      };
    }

    var tourBtn = card.querySelector('[data-action="tour360"]');
    if (tourBtn) {
      tourBtn.onclick = function (e) {
        e.stopPropagation();
        var hasTour = unit.tour360Modo === 'link' && !!(unit.link360 && String(unit.link360).trim());
        goTo('sphere', hasTour ? unit.link360 : '');
      };
    }
  });
}

function updateComparePickUi() {
  var popup = document.getElementById('unitsPopup');
  if (!popup) return;
  popup.classList.toggle('is-compare-pick-mode', comparePickMode);
  var stage = popup.querySelector('.units-viviendas-stage');
  if (!stage) return;
  var banner = stage.querySelector('.uc-pick-banner');
  if (comparePickMode) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'uc-pick-banner';
      banner.textContent = 'Selecciona la vivienda que deseas incluir en la comparación';
      stage.insertBefore(banner, stage.firstChild);
    }
  } else if (banner) {
    banner.remove();
  }
}

function startComparePick() {
  comparePickMode = true;
  setUnitsViewMode('browse');
  if (unitsComparePanel) unitsComparePanel.hidden = true;
  if (unitsGrid) unitsGrid.style.display = '';
  updateComparePickUi();
  activateUnitsTab('all');
}

function handleCompareUnitPick(key) {
  if (!UNITS[key]) return;
  if (!isFavorite(key)) {
    showToast('Agrega la vivienda a favoritos para compararla');
    return;
  }
  var keys = getCompareUnitKeys();
  if (keys.indexOf(key) !== -1) {
    comparePickMode = false;
    updateComparePickUi();
    setUnitsViewMode('compare');
    renderUnitsCompare(keys);
    return;
  }
  if (keys.length >= COMPARE_MAX_UNITS) {
    keys[1] = key;
  } else {
    keys.push(key);
  }
  keys = setCompareUnitKeys(keys);
  comparePickMode = false;
  updateComparePickUi();
  if (keys.length < COMPARE_MAX_UNITS) {
    if (typeof showToast === 'function') showToast('Selecciona otra vivienda para completar la comparación');
    comparePickMode = true;
    updateComparePickUi();
    return;
  }
  setUnitsViewMode('compare');
  renderUnitsCompare(keys);
}

function setUnitsViewMode(mode) {
  unitsViewMode = mode === 'compare' ? 'compare' : 'browse';
  var popup = document.getElementById('unitsPopup');
  var compareBtn = document.getElementById('unitsCompareBtn');
  var tabAll = document.getElementById('unitsTabAll');
  var tabFav = document.getElementById('unitsTabFav');
  var footTitle = document.getElementById('unitsViviendasFootTitle');
  var footSubtitle = document.getElementById('unitsViviendasFootSubtitle');
  if (popup) popup.classList.toggle('is-compare-mode', unitsViewMode === 'compare');
  if (compareBtn) compareBtn.classList.toggle('active', unitsViewMode === 'compare');
  if (unitsViewMode === 'compare') {
    if (tabAll) {
      tabAll.classList.remove('active');
      tabAll.setAttribute('aria-selected', 'false');
    }
    if (tabFav) {
      tabFav.classList.remove('active');
      tabFav.setAttribute('aria-selected', 'false');
    }
  } else if (compareBtn) {
    compareBtn.classList.remove('active');
  }
  if (footTitle) {
    footTitle.textContent = unitsViewMode === 'compare'
      ? 'Comparar viviendas'
      : 'Selecciona tu vivienda';
  }
  if (footSubtitle) {
    footSubtitle.textContent = unitsViewMode === 'compare'
      ? 'Compara dos opciones con claridad y descarga tu análisis en PDF.'
      : 'Explora planos, precios y calcula tu cuota.';
  }
  if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
    GlobalClose.update();
  }
}

function exitUnitsCompareMode() {
  if (unitsViewMode !== 'compare' && !comparePickMode) return;
  comparePickMode = false;
  updateComparePickUi();
  hideCompareEmpty();
  setUnitsViewMode('browse');
  if (unitsTabAllBtn && unitsTabFavBtn) {
    unitsTabAllBtn.classList.toggle('active', currentUnitsTab === 'all');
    unitsTabAllBtn.setAttribute('aria-selected', currentUnitsTab === 'all' ? 'true' : 'false');
    unitsTabFavBtn.classList.toggle('active', currentUnitsTab === 'fav');
    unitsTabFavBtn.setAttribute('aria-selected', currentUnitsTab === 'fav' ? 'true' : 'false');
  }
  renderUnitsGrid(currentUnitsTab);
}

function hideCompareEmpty() {
  if (!compareEmptyEl) return;
  compareEmptyEl.style.display = 'none';
  compareEmptyEl.hidden = true;
  syncUnitsStageEmpty();
}

function syncUnitsStageEmpty() {
  var stage = document.querySelector('#unitsPopup .units-viviendas-stage');
  if (!stage) return;
  var favVisible = favoritesEmptyEl && favoritesEmptyEl.style.display === 'block';
  var compareVisible = compareEmptyEl &&
    compareEmptyEl.style.display === 'block' &&
    !compareEmptyEl.hidden;
  stage.classList.toggle('is-stage-empty', !!(favVisible || compareVisible));
}

function renderCompareEmpty() {
  if (!unitsGrid) return;
  unitsGrid.style.display = 'none';
  if (unitsComparePanel) unitsComparePanel.hidden = true;
  if (favoritesEmptyEl) favoritesEmptyEl.style.display = 'none';
  if (compareEmptyEl) {
    compareEmptyEl.style.display = 'block';
    compareEmptyEl.hidden = false;
  }
  syncUnitsStageEmpty();
}

function resolveCompareKeys() {
  var favs = getFavoriteUnitKeys();
  if (favs.length < COMPARE_MAX_UNITS) {
    setCompareUnitKeys([]);
    return null;
  }
  var compareKeys = getCompareUnitKeys().filter(function (key) {
    return favs.indexOf(key) !== -1;
  });
  if (compareKeys.length < COMPARE_MAX_UNITS) {
    compareKeys = favs.slice(0, COMPARE_MAX_UNITS);
  }
  return setCompareUnitKeys(compareKeys.slice(0, COMPARE_MAX_UNITS));
}

function openUnitsCompare() {
  if (unitsViewMode === 'compare') {
    exitUnitsCompareMode();
    if (unitsTabAllBtn && unitsTabFavBtn) {
      unitsTabAllBtn.classList.toggle('active', currentUnitsTab === 'all');
      unitsTabAllBtn.setAttribute('aria-selected', currentUnitsTab === 'all' ? 'true' : 'false');
      unitsTabFavBtn.classList.toggle('active', currentUnitsTab === 'fav');
      unitsTabFavBtn.setAttribute('aria-selected', currentUnitsTab === 'fav' ? 'true' : 'false');
    }
    return;
  }
  if (typeof VisitorSession !== 'undefined' && !VisitorSession.isAuthenticated()) {
    showToast('Inicia sesión para comparar viviendas');
    if (typeof VisitorAuthModal !== 'undefined') VisitorAuthModal.open('gate');
    return;
  }
  var compareKeys = resolveCompareKeys();
  setUnitsViewMode('compare');
  if (!compareKeys) {
    renderCompareEmpty();
    return;
  }
  renderUnitsCompare(compareKeys);
}

function renderUnitsCompare(favKeys) {
  if (!unitsComparePanel || !unitsGrid) return;
  var resolved = resolveCompareKeys();
  if (!resolved) {
    renderCompareEmpty();
    return;
  }
  favKeys = resolved;

  hideCompareEmpty();

  var units = favKeys.map(function (key) { return UNITS[key]; });

  var heroesHtml = favKeys.map(function (key, i) {
    return renderCompareHeroCard(key, UNITS[key], i);
  }).join('');

  var categoriesHtml = UNITS_COMPARE_CATEGORIES.map(function (cat, catIndex) {
    return renderCompareCategory(cat, catIndex, units);
  }).join('');

  var insightsHtml = renderCompareInsightsPanel(favKeys, units);

  unitsComparePanel.innerHTML =
    '<div class="uc-shell">' +
      '<header class="uc-header">' +
        '<div class="uc-header-start">' +
          '<button type="button" class="uc-header-back" data-uc-action="back" aria-label="Volver a viviendas">' +
            '<span class="uc-header-back-icon" aria-hidden="true">←</span>' +
          '</button>' +
          '<h2 class="uc-header-title">Comparar viviendas</h2>' +
        '</div>' +
        '<div class="uc-header-actions">' +
          '<button type="button" class="uc-header-add" data-uc-action="add">+ Agregar vivienda</button>' +
          '<button type="button" class="uc-header-pdf" data-uc-action="pdf">Descargar PDF</button>' +
        '</div>' +
      '</header>' +
      '<div class="uc-mobile-names" aria-label="Viviendas en comparación">' +
        '<p class="uc-mobile-name">' + escapeUnitsHtml(units[0].name || getUnitShortLabel(units[0])) + '</p>' +
        '<p class="uc-mobile-name">' + escapeUnitsHtml(units[1].name || getUnitShortLabel(units[1])) + '</p>' +
      '</div>' +
      '<div class="uc-heroes">' + heroesHtml + '</div>' +
      '<div class="uc-specs">' +
        '<div class="uc-matrix">' +
          renderCompareMatrixHead(units) +
          categoriesHtml +
        '</div>' +
      '</div>' +
      insightsHtml +
    '</div>';

  unitsGrid.style.display = 'none';
  favoritesEmptyEl.style.display = 'none';
  unitsComparePanel.hidden = false;
  bindComparePanelEvents(favKeys, units);
}

function buildUnitCard(key) {
  var u = UNITS[key];
  if (!u) return document.createElement('div');
  var card = document.createElement('div');
  card.className = 'unit-card';
  card.setAttribute('data-unit', key);
  var badgeHtml = u.availability ? '<div class="availability-badge">' + u.availability + '</div>' : '';
  var favActive = isFavorite(key);
  var imageInner = u.cardImageUrl
    ? '<div class="unit-card-image-media" style="background-image:url(' + escapeUnitsHtml(u.cardImageUrl) + ')"></div>'
    : '';
  card.innerHTML =
    '<div class="unit-card-image">' +
      imageInner +
      '<div class="unit-card-image-scrim" aria-hidden="true"></div>' +
      '<div class="unit-card-icons">' +
        '<button class="icon-btn fav-btn unit-card-icon-btn' + (favActive ? ' active' : '') + '" type="button" data-fav="' + key + '" aria-label="' + (favActive ? 'Quitar de favoritos' : 'Agregar a favoritos') + '">' + favHeartSvg() + '</button>' +
        '<button class="icon-btn share-btn unit-card-icon-btn" type="button" data-share="' + key + '" aria-label="Compartir vivienda"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg></button>' +
      '</div>' +
      badgeHtml +
      (u.cardImageUrl ? '' : '<span class="unit-card-image-fallback">' + u.cardLabel + '</span>') +
    '</div>' +
    '<div class="unit-typo-info">' +
      '<div class="unit-typo-tag">' + u.tag + '</div>' +
      '<div class="unit-typo-title">' + u.name + '</div>' +
      '<div class="unit-typo-price-block">' +
        '<div class="unit-typo-price-label">Precio</div>' +
        '<div class="unit-typo-price-value">' + formatCOP(u.price) + '</div>' +
      '</div>' +
      '<div class="unit-typo-specs unit-card-specs">' +
        '<span class="unit-card-spec-item">' + ucIcon('area') + escapeUnitsHtml(String(u.area)) + ' m²</span>' +
        '<span class="unit-card-spec-item">' + ucIcon('bed') + escapeUnitsHtml(String(u.rooms)) + ' hab.</span>' +
        '<span class="unit-card-spec-item">' + ucIcon('bath') + escapeUnitsHtml(String(u.baths)) + ' baños</span>' +
        (u.parking ? '<span class="unit-card-spec-item">' + ucIcon('park') + escapeUnitsHtml(String(u.parking)) + ' parq.</span>' : '') +
      '</div>' +
      '<div class="unit-typo-btn-stack">' +
        '<div class="unit-typo-btn-row">' +
          '<button class="unit-typo-btn unit-typo-btn--calc" type="button" data-action="calc">Calcular cuota</button>' +
        '</div>' +
        '<div class="unit-typo-btn-row">' +
          '<button class="unit-typo-btn" type="button" data-action="plans">Ver planos</button>' +
          '<button class="unit-typo-btn unit-typo-btn--cta" type="button" data-action="tour360">' + ucIcon('cube') + ' Ver 360°</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  card.querySelector('[data-action="tour360"]').addEventListener('click', function(e){
    e.stopPropagation();
    var hasTour = u.tour360Modo === 'link' && !!(u.link360 && String(u.link360).trim());
    goTo('sphere', hasTour ? u.link360 : '');
  });
  card.querySelector('[data-action="plans"]').addEventListener('click', function(e){
    e.stopPropagation();
    var hasPlans = u.planosModo === 'file' && u.plans && u.plans.some(function (p) { return p && p.url; });
    if (hasPlans) goTo('plans', key);
    else goTo('sphere');
  });
  card.querySelector('[data-action="calc"]').addEventListener('click', function(e){
    e.stopPropagation(); goTo('calculator', key);
  });
  card.querySelector('[data-fav]').addEventListener('click', function(e){
    e.stopPropagation();
    toggleFavorite(key, e.currentTarget);
  });
  card.querySelector('[data-share]').addEventListener('click', function(e){
    e.stopPropagation(); shareUnit(key);
  });
  card.addEventListener('click', function (e) {
    if (!comparePickMode) return;
    if (e.target.closest('button')) return;
    handleCompareUnitPick(key);
  });
  return card;
}

function playCardGridEntrance(gridEl, cardSelector, enterClass, animationName) {
  if (!gridEl) return;
  cardSelector = cardSelector || '.unit-card';
  enterClass = enterClass || 'unit-card--enter';
  animationName = animationName || 'unitCardAppleEnter';
  var cards = gridEl.querySelectorAll(cardSelector);
  if (!cards.length) return;
  var reduceMotion = isMotionReduced();
  cards.forEach(function (card, index) {
    card.classList.remove(enterClass);
    card.style.removeProperty('--unit-enter-delay');
    if (reduceMotion) return;
    card.style.setProperty('--unit-enter-delay', Math.min(index * 160, 960) + 'ms');
    void card.offsetWidth;
    card.classList.add(enterClass);
    function onEnterEnd(ev) {
      if (ev && ev.animationName && ev.animationName !== animationName) return;
      card.classList.remove(enterClass);
      card.style.removeProperty('--unit-enter-delay');
      card.removeEventListener('animationend', onEnterEnd);
    }
    card.addEventListener('animationend', onEnterEnd);
  });
}

function playUnitCardsEntrance() {
  playCardGridEntrance(unitsGrid, '.unit-card', 'unit-card--enter');
}

function playTour360CardsEntrance() {
  playCardGridEntrance(
    document.getElementById('tour360Grid'),
    '.tour360-card',
    'tour360-card--enter'
  );
}

function playGaleriaCardsEntrance() {
  playCardGridEntrance(document.getElementById('rendersGrid'), '.tour360-card', 'tour360-card--enter');
}

var splashModalTimers = {};

function clearSplashModalTimers(modalId) {
  var timers = splashModalTimers[modalId];
  if (!timers) return;
  if (timers.intro) clearTimeout(timers.intro);
  if (timers.reveal) clearTimeout(timers.reveal);
  splashModalTimers[modalId] = null;
}

function resetSplashModalIntro(modalId, options) {
  options = options || {};
  clearSplashModalTimers(modalId);
  var modal = document.getElementById(modalId);
  var loader = options.loaderId ? document.getElementById(options.loaderId) : null;
  var card = options.cardId ? document.getElementById(options.cardId) : null;
  if (modal) {
    modal.classList.remove('is-video-loading', 'is-video-morphing', 'is-video-ready');
  }
  if (loader) {
    loader.hidden = true;
    loader.setAttribute('aria-hidden', 'true');
  }
  if (card) {
    card.style.removeProperty('animation');
  }
  if (typeof options.onReset === 'function') options.onReset();
}

function playSplashModalIntro(config) {
  var modal = document.getElementById(config.modalId);
  var loader = document.getElementById(config.loaderId);
  var card = document.getElementById(config.cardId);
  if (!modal || !card) return;

  clearSplashModalTimers(config.modalId);
  modal.classList.remove('is-video-loading', 'is-video-morphing', 'is-video-ready');
  card.style.removeProperty('animation');

  var reduceMotion = isMotionReduced();

  function markReady() {
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('is-video-morphing');
    modal.classList.add('is-video-ready');
    if (loader) {
      loader.hidden = true;
      loader.setAttribute('aria-hidden', 'true');
    }
    if (typeof config.onReady === 'function') config.onReady();
  }

  if (reduceMotion) {
    modal.classList.add('is-video-ready');
    if (loader) {
      loader.hidden = true;
      loader.setAttribute('aria-hidden', 'true');
    }
    if (typeof config.onBeforeReady === 'function') {
      config.onBeforeReady(markReady);
    } else {
      markReady();
    }
    return;
  }

  if (typeof config.onBeforeStart === 'function') config.onBeforeStart();

  modal.classList.add('is-video-loading');
  if (loader) {
    loader.hidden = false;
    loader.setAttribute('aria-hidden', 'false');
  }

  splashModalTimers[config.modalId] = {};
  splashModalTimers[config.modalId].intro = setTimeout(function () {
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('is-video-loading');
    modal.classList.add('is-video-morphing');

    function finishMorph() {
      if (!modal.classList.contains('active')) return;
      if (typeof config.onBeforeReady === 'function') {
        config.onBeforeReady(markReady);
      } else {
        markReady();
      }
    }

    function onMorphEnd(ev) {
      if (ev && ev.target !== card) return;
      if (ev && ev.animationName && ev.animationName !== 'videoModalGrowFromIcon') return;
      card.removeEventListener('animationend', onMorphEnd);
      finishMorph();
    }
    card.addEventListener('animationend', onMorphEnd);
    splashModalTimers[config.modalId].reveal = setTimeout(function () {
      card.removeEventListener('animationend', onMorphEnd);
      finishMorph();
    }, 1000);
  }, 2150);
}

function resetVideoModalIntro() {
  teardownMobileVideoOrientationGate();
  hideVideoOrientGate();
  setVideoFsFallbackHint(false);
  var modal = document.getElementById('videoModal');
  if (modal) {
    modal.classList.remove('is-mobile-video-landscape', 'is-mobile-video-fs-fallback');
  }
  resetSplashModalIntro('videoModal', {
    loaderId: 'videoModalLoader',
    cardId: 'videoModalCard',
    onReset: function () {
      var player = document.getElementById('projectVideoPlayer');
      if (player && player.dataset && player.dataset.videoPosterBackup) {
        player.setAttribute('poster', player.dataset.videoPosterBackup);
      }
    }
  });
}

function resetLocationModalIntro() {
  resetSplashModalIntro('locationModal', {
    loaderId: 'locationModalLoader',
    cardId: 'locationModalCard'
  });
}

function prepareVideoFirstFrame(player, onReady) {
  if (!player) {
    if (typeof onReady === 'function') onReady();
    return;
  }

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    player.removeEventListener('loadeddata', onMeta);
    player.removeEventListener('canplay', onMeta);
    player.removeEventListener('seeked', onSeeked);
    try { player.pause(); } catch (e) {}
    if (typeof onReady === 'function') onReady();
  }

  function onSeeked() {
    player.removeEventListener('seeked', onSeeked);
    /* Mantener poster si el source es el placeholder negro (sin video real) */
    var isPlaceholder = !!(window.__blackPlaceholderVideoUrl &&
      player.currentSrc &&
      player.currentSrc === window.__blackPlaceholderVideoUrl);
    try {
      if (!isPlaceholder && player.readyState >= 2) player.removeAttribute('poster');
    } catch (e2) {}
    finish();
  }

  function forcePaint() {
    var isPlaceholder = !!(window.__blackPlaceholderVideoUrl &&
      player.currentSrc &&
      player.currentSrc === window.__blackPlaceholderVideoUrl);
    if (isPlaceholder) {
      /* Sin video real: dejar el poster del hero visible */
      finish();
      return;
    }
    try { player.pause(); } catch (e3) {}
    try {
      /* En muchos browsers el tiempo 0 queda negro; un nudge fuerza el decode */
      var nudge = 0.001;
      if (player.duration && isFinite(player.duration) && player.duration > 0.08) {
        nudge = 0.04;
      }
      player.addEventListener('seeked', onSeeked);
      player.currentTime = Math.abs(player.currentTime - nudge) < 0.0005 ? nudge + 0.001 : nudge;
      setTimeout(function () {
        if (done) return;
        try { player.currentTime = 0; } catch (e4) {}
        onSeeked();
      }, 280);
      return;
    } catch (e5) {}

    /* Fallback: play muted un instante y pausar */
    var wasMuted = player.muted;
    player.muted = true;
    var playPromise = null;
    try { playPromise = player.play(); } catch (e6) {}
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(function () {
        try { player.pause(); } catch (e7) {}
        try { player.currentTime = 0.001; } catch (e8) {}
        player.muted = wasMuted;
        try { player.removeAttribute('poster'); } catch (e9) {}
        finish();
      }).catch(function () {
        player.muted = wasMuted;
        finish();
      });
      setTimeout(finish, 600);
      return;
    }
    player.muted = wasMuted;
    finish();
  }

  function onMeta() {
    player.removeEventListener('loadeddata', onMeta);
    player.removeEventListener('canplay', onMeta);
    forcePaint();
  }

  if (player.readyState >= 2) {
    forcePaint();
    return;
  }
  player.addEventListener('loadeddata', onMeta);
  player.addEventListener('canplay', onMeta);
  setTimeout(function () {
    if (done) return;
    if (player.readyState >= 2) forcePaint();
    else finish();
  }, 1200);
}

function playVideoModalIntro() {
  var player = document.getElementById('projectVideoPlayer');
  if (player && player.dataset && player.dataset.videoPosterBackup && !player.getAttribute('poster')) {
    player.setAttribute('poster', player.dataset.videoPosterBackup);
  }

  if (isMobileVideoViewport()) {
    playMobileVideoOrientationGate(player);
    return;
  }

  playSplashModalIntro({
    modalId: 'videoModal',
    loaderId: 'videoModalLoader',
    cardId: 'videoModalCard',
    onBeforeStart: function () {
      prepareVideoFirstFrame(player);
    },
    onBeforeReady: function (done) {
      prepareVideoFirstFrame(player, done);
    }
  });
}

var videoOrientGateTimer = null;
var videoOrientStabilizeTimer = null;
var videoOrientGateState = null;

function isMobileVideoViewport() {
  /* Portrait o landscape: el lado corto del teléfono sigue siendo ≤600. */
  return Math.min(window.innerWidth, window.innerHeight) <= 600;
}

function isLandscapeOrientation() {
  try {
    if (screen.orientation && typeof screen.orientation.type === 'string') {
      return screen.orientation.type.indexOf('landscape') === 0;
    }
  } catch (e1) { /* ignore */ }
  if (typeof window.orientation === 'number') {
    return Math.abs(window.orientation) === 90;
  }
  var w = window.innerWidth;
  var h = window.innerHeight;
  try {
    if (window.visualViewport) {
      w = window.visualViewport.width || w;
      h = window.visualViewport.height || h;
    }
  } catch (e2) { /* ignore */ }
  return w > h;
}

function isNativeVideoFullscreen(player) {
  if (!player) return false;
  try {
    if (player.webkitDisplayingFullscreen) return true;
  } catch (e) { /* ignore */ }
  var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  var wrap = document.getElementById('projectVideoPlayerWrap');
  return !!(fsEl && (fsEl === player || fsEl === wrap));
}

function hideVideoOrientGate() {
  var modal = document.getElementById('videoModal');
  var gate = document.getElementById('videoOrientGate');
  if (modal) modal.classList.remove('is-orient-gate');
  if (gate) {
    gate.hidden = true;
    gate.setAttribute('aria-hidden', 'true');
    gate.classList.remove('is-fs-hint-only');
  }
  if (videoOrientGateTimer) {
    clearTimeout(videoOrientGateTimer);
    videoOrientGateTimer = null;
  }
  if (videoOrientStabilizeTimer) {
    clearTimeout(videoOrientStabilizeTimer);
    videoOrientStabilizeTimer = null;
  }
}

function setVideoFsFallbackHint(visible) {
  var hint = document.getElementById('videoFsFallbackHint');
  if (!hint) return;
  hint.hidden = !visible;
}

function teardownMobileVideoOrientationGate() {
  if (videoOrientGateState && videoOrientGateState.cleanup) {
    videoOrientGateState.cleanup();
  }
  videoOrientGateState = null;
  if (videoOrientGateTimer) {
    clearTimeout(videoOrientGateTimer);
    videoOrientGateTimer = null;
  }
  if (videoOrientStabilizeTimer) {
    clearTimeout(videoOrientStabilizeTimer);
    videoOrientStabilizeTimer = null;
  }
}

function tryLockLandscape() {
  try {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      var p = screen.orientation.lock('landscape');
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
  } catch (e) { /* ignore */ }
}

/**
 * iPhone Safari: priorizar video.webkitEnterFullscreen().
 * Desktop/Android: requestFullscreen sobre el wrap.
 */
function tryVideoFullscreen(player) {
  var wrap = document.getElementById('projectVideoPlayerWrap');
  if (!player && !wrap) return Promise.resolve(false);

  function attempt(fn, ctx) {
    if (typeof fn !== 'function' || !ctx) return Promise.resolve(false);
    try {
      var result = fn.call(ctx);
      if (result && typeof result.then === 'function') {
        return result.then(function () { return true; }).catch(function () { return false; });
      }
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  /* 1) Safari iOS — fullscreen nativo del <video> */
  if (player && typeof player.webkitEnterFullscreen === 'function') {
    try {
      /* Controles nativos visibles dentro del fullscreen de Safari. */
      player.controls = true;
    } catch (eCtrl) { /* ignore */ }
    return attempt(player.webkitEnterFullscreen, player).then(function (ok) {
      if (ok) return true;
      return attemptChain();
    });
  }

  return attemptChain();

  function attemptChain() {
    var targets = [];
    if (wrap) {
      if (wrap.requestFullscreen) targets.push([wrap.requestFullscreen, wrap]);
      if (wrap.webkitRequestFullscreen) targets.push([wrap.webkitRequestFullscreen, wrap]);
      if (wrap.webkitRequestFullScreen) targets.push([wrap.webkitRequestFullScreen, wrap]);
    }
    if (player) {
      if (player.requestFullscreen) targets.push([player.requestFullscreen, player]);
      if (player.webkitRequestFullscreen) targets.push([player.webkitRequestFullscreen, player]);
    }
    function next(i) {
      if (i >= targets.length) return Promise.resolve(false);
      return attempt(targets[i][0], targets[i][1]).then(function (ok) {
        return ok ? true : next(i + 1);
      });
    }
    return next(0);
  }
}

window.tryProjectVideoFullscreen = tryVideoFullscreen;
window.isProjectVideoFullscreen = function () {
  return isNativeVideoFullscreen(document.getElementById('projectVideoPlayer'));
};

function playMobileVideoOrientationGate(player) {
  var modal = document.getElementById('videoModal');
  var gate = document.getElementById('videoOrientGate');
  var card = document.getElementById('videoModalCard');
  var controls = document.getElementById('projectVideoControls');
  if (!modal) return;

  teardownMobileVideoOrientationGate();
  hideVideoOrientGate();
  setVideoFsFallbackHint(false);
  clearSplashModalTimers('videoModal');
  modal.classList.remove(
    'is-video-loading',
    'is-video-morphing',
    'is-video-ready',
    'is-mobile-video-landscape',
    'is-mobile-video-fs-fallback'
  );
  if (card) card.style.removeProperty('animation');

  if (gate) {
    gate.hidden = false;
    gate.setAttribute('aria-hidden', 'false');
  }
  modal.classList.add('is-orient-gate');

  /* Precargar + play silenciado durante el gesto del usuario (mejora FS en Safari). */
  if (player) {
    try { player.playsInline = true; } catch (e0) {}
    try { player.setAttribute('playsinline', ''); } catch (e1) {}
    try { player.setAttribute('webkit-playsinline', ''); } catch (e2) {}
    try { player.preload = 'auto'; } catch (e3) {}
    try { player.muted = true; } catch (e4) {}
    try { player.load(); } catch (e5) {}
    prepareVideoFirstFrame(player);
    try {
      var warm = player.play();
      if (warm && typeof warm.catch === 'function') warm.catch(function () {});
    } catch (e6) { /* ignore */ }
  }

  var entered = false;
  var stabilizeMs = isMotionReduced() ? 80 : 220;

  function showControls() {
    if (controls) controls.hidden = false;
  }

  function startPlayback(preferUnmute) {
    if (!player || !modal.classList.contains('active')) return;
    tryLockLandscape();
    showControls();
    if (preferUnmute) {
      try { player.muted = false; } catch (e) { /* ignore */ }
    }
    var playPromise = player.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(function () {
        if (preferUnmute && player.muted) {
          try { player.muted = false; } catch (e2) { /* ignore */ }
        }
      }).catch(function () {
        try { player.muted = true; } catch (e3) { /* ignore */ }
        var retry = player.play();
        if (retry && typeof retry.catch === 'function') retry.catch(function () {});
      });
    }
  }

  function finishWithPlayer(fullscreenOk) {
    if (entered || !modal.classList.contains('active')) return;
    entered = true;
    teardownMobileVideoOrientationGate();
    hideVideoOrientGate();

    if (fullscreenOk || isNativeVideoFullscreen(player)) {
      modal.classList.add('is-video-ready', 'is-mobile-video-landscape');
      modal.classList.remove('is-mobile-video-fs-fallback');
      setVideoFsFallbackHint(false);
      startPlayback(true);
      return;
    }

    /* Fallback Safari: video a pantalla casi completa + mensaje FS */
    modal.classList.add(
      'is-video-ready',
      'is-mobile-video-landscape',
      'is-mobile-video-fs-fallback'
    );
    setVideoFsFallbackHint(true);
    startPlayback(false);
    showControls();
  }

  function enterAfterLandscape() {
    if (entered || !modal.classList.contains('active')) return;
    if (!isLandscapeOrientation()) return;

    if (videoOrientStabilizeTimer) {
      clearTimeout(videoOrientStabilizeTimer);
      videoOrientStabilizeTimer = null;
    }

    videoOrientStabilizeTimer = setTimeout(function () {
      videoOrientStabilizeTimer = null;
      if (entered || !modal.classList.contains('active')) return;
      if (!isLandscapeOrientation()) return;

      tryVideoFullscreen(player).then(function () {
        setTimeout(function () {
          finishWithPlayer(isNativeVideoFullscreen(player));
        }, 140);
      });
    }, stabilizeMs);
  }

  function onViewportSignal() {
    if (!modal.classList.contains('active') || entered) return;
    if (isLandscapeOrientation()) enterAfterLandscape();
  }

  function cleanup() {
    window.removeEventListener('orientationchange', onViewportSignal);
    window.removeEventListener('resize', onViewportSignal);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportSignal);
      window.visualViewport.removeEventListener('scroll', onViewportSignal);
    }
    if (screen.orientation && screen.orientation.removeEventListener) {
      try { screen.orientation.removeEventListener('change', onViewportSignal); } catch (e) { /* ignore */ }
    }
    if (player) {
      player.removeEventListener('webkitbeginfullscreen', onWebkitFsBegin);
      player.removeEventListener('webkitendfullscreen', onWebkitFsEnd);
    }
  }

  function onWebkitFsBegin() {
    finishWithPlayer(true);
  }

  function onWebkitFsEnd() {
    if (!modal.classList.contains('active')) return;
    try { player.controls = false; } catch (eEnd) { /* ignore */ }
    modal.classList.add('is-mobile-video-landscape', 'is-mobile-video-fs-fallback', 'is-video-ready');
    setVideoFsFallbackHint(true);
    showControls();
  }

  videoOrientGateState = { cleanup: cleanup, entered: function () { return entered; } };

  window.addEventListener('orientationchange', onViewportSignal);
  window.addEventListener('resize', onViewportSignal);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportSignal);
    window.visualViewport.addEventListener('scroll', onViewportSignal);
  }
  if (screen.orientation && screen.orientation.addEventListener) {
    try { screen.orientation.addEventListener('change', onViewportSignal); } catch (e7) { /* ignore */ }
  }
  if (player) {
    player.addEventListener('webkitbeginfullscreen', onWebkitFsBegin);
    player.addEventListener('webkitendfullscreen', onWebkitFsEnd);
  }

  onViewportSignal();

  var waitMs = isMotionReduced() ? 1200 : 12000;
  videoOrientGateTimer = setTimeout(function () {
    videoOrientGateTimer = null;
    if (entered || !modal.classList.contains('active')) return;
    if (isLandscapeOrientation()) {
      enterAfterLandscape();
      return;
    }
    entered = true;
    teardownMobileVideoOrientationGate();
    hideVideoOrientGate();
    modal.classList.add('is-video-ready', 'is-mobile-video-fs-fallback');
    setVideoFsFallbackHint(true);
    startPlayback(false);
    showControls();
  }, waitMs);
}

function playLocationModalIntro() {
  playSplashModalIntro({
    modalId: 'locationModal',
    loaderId: 'locationModalLoader',
    cardId: 'locationModalCard'
  });
}

function renderUnitsGrid(tab) {
  if (unitsViewMode === 'compare') {
    var compareKeys = resolveCompareKeys();
    if (!compareKeys) renderCompareEmpty();
    else renderUnitsCompare(compareKeys);
    return;
  }
  hideCompareEmpty();
  currentUnitsTab = tab || currentUnitsTab;
  var keys = Object.keys(UNITS);
  if (currentUnitsTab === 'fav') {
    var favs = getFavorites();
    keys = keys.filter(function (k) { return favs.indexOf(k) !== -1; });
  }
  unitsGrid.innerHTML = '';
  if (unitsComparePanel) unitsComparePanel.hidden = true;
  if (currentUnitsTab === 'fav' && keys.length === 0) {
    unitsGrid.style.display = 'none';
    favoritesEmptyEl.style.display = 'block';
    syncUnitsStageEmpty();
    return;
  }
  unitsGrid.style.display = 'grid';
  favoritesEmptyEl.style.display = 'none';
  syncUnitsStageEmpty();
  keys.forEach(function (key) { unitsGrid.appendChild(buildUnitCard(key)); });
  playUnitCardsEntrance();
}

function renderDownloadsList() {
  if (!downloadsList) return;
  if (typeof DownloadsIntro !== 'undefined' && typeof DownloadsIntro.renderListPlain === 'function') {
    DownloadsIntro.renderListPlain();
    return;
  }
  downloadsList.innerHTML = '';
  DOWNLOADS.forEach(function(doc){
    var item = document.createElement('a');
    item.className = 'download-item';
    item.href = '#';
    item.setAttribute('role', 'button');
    item.addEventListener('click', function (e) {
      e.preventDefault();
      goTo('sphere');
    });
    item.innerHTML =
      '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/></svg>' +
      '<div class="download-item-text">' +
        '<span class="download-item-label">' + doc.label + '</span>' +
        '<span class="download-item-sub">' + doc.sub + '</span>' +
      '</div>' +
      '<span class="download-item-arrow">&#8595;</span>';
    downloadsList.appendChild(item);
  });
}

/* ---- Pestañas Viviendas / Favoritos / Comparar ---- */
var unitsTabAllBtn = document.getElementById('unitsTabAll');
var unitsTabFavBtn = document.getElementById('unitsTabFav');
var unitsCompareBtn = document.getElementById('unitsCompareBtn');

function syncUnitsChromeLabels() {
  var mobile = window.matchMedia('(max-width: 600px)').matches;
  if (unitsTabAllBtn) {
    unitsTabAllBtn.textContent = mobile ? 'Viviendas' : 'Todas las viviendas';
  }
  updateFavoritesTabCount();
  if (unitsCompareBtn && !unitsCompareBtn.classList.contains('active')) {
    unitsCompareBtn.textContent = 'Comparar';
  }
}

function activateUnitsTab(tab) {
  if (unitsViewMode === 'compare' || comparePickMode) {
    comparePickMode = false;
    updateComparePickUi();
    hideCompareEmpty();
    setUnitsViewMode('browse');
  }
  currentUnitsTab = tab === 'fav' ? 'fav' : 'all';
  if (unitsTabAllBtn) {
    unitsTabAllBtn.classList.toggle('active', currentUnitsTab === 'all');
    unitsTabAllBtn.setAttribute('aria-selected', currentUnitsTab === 'all' ? 'true' : 'false');
  }
  if (unitsTabFavBtn) {
    unitsTabFavBtn.classList.toggle('active', currentUnitsTab === 'fav');
    unitsTabFavBtn.setAttribute('aria-selected', currentUnitsTab === 'fav' ? 'true' : 'false');
  }
  if (unitsCompareBtn) unitsCompareBtn.classList.remove('active');
  renderUnitsGrid(currentUnitsTab);
  vibrate(6);
}
if (unitsTabAllBtn) {
  unitsTabAllBtn.addEventListener('click', function () { activateUnitsTab('all'); });
}
if (unitsTabFavBtn) {
  unitsTabFavBtn.addEventListener('click', function () { activateUnitsTab('fav'); });
}
document.getElementById('favoritesEmptyBtn').addEventListener('click', function(){ activateUnitsTab('all'); });
window.__mainTrace('bind favoritesEmptyBtn');
var compareEmptyBtn = document.getElementById('compareEmptyBtn');
if (compareEmptyBtn) {
  compareEmptyBtn.addEventListener('click', function () {
    exitUnitsCompareMode();
    activateUnitsTab('all');
  });
}
if (unitsCompareBtn) {
  unitsCompareBtn.addEventListener('click', function () {
    openUnitsCompare();
  });
}
var unitsViviendasCloseBtn = document.getElementById('unitsViviendasCloseBtn');
if (unitsViviendasCloseBtn) {
  unitsViviendasCloseBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.handleClose === 'function') {
      GlobalClose.handleClose({ explicitUserClose: true });
    } else if (typeof goBack === 'function') {
      if (typeof window.authorizeGoBack === 'function') window.authorizeGoBack();
      goBack();
    }
  });
}
window.addEventListener('resize', syncUnitsChromeLabels);
syncUnitsChromeLabels();

/* ================= RENDER DE TARJETAS DE ZONAS 360° ================= */
function renderTour360Grid() {
  var tour360Grid = document.getElementById('tour360Grid');
  if (!tour360Grid) return;
  tour360Grid.innerHTML = '';

  Object.keys(TOUR360).forEach(function (key) {
    var t = TOUR360[key];
    var openTour = function () {
      /* Sin proyecto 360 aún: solo pantalla de carga */
      goTo('sphere');
    };

    var card = document.createElement('article');
    card.className = 'tour360-card';
    card.setAttribute('data-zone', key);

    var media = document.createElement('div');
    media.className = 'tour360-card-media';
    if (t.imageUrl) {
      var img = document.createElement('img');
      img.src = t.imageUrl;
      img.alt = t.name || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    }

    var footer = document.createElement('div');
    footer.className = 'tour360-card-footer';

    var nameEl = document.createElement('p');
    nameEl.className = 'tour360-card-name';
    nameEl.textContent = t.name || '';

    var areaText = formatTour360Area(t.area);
    if (areaText) {
      var areaEl = document.createElement('p');
      areaEl.className = 'tour360-card-area';
      areaEl.textContent = areaText;
      footer.appendChild(nameEl);
      footer.appendChild(areaEl);
    } else {
      footer.appendChild(nameEl);
    }

    var enterBtn = document.createElement('button');
    enterBtn.type = 'button';
    enterBtn.className = 'tour360-card-enter';
    enterBtn.textContent = 'Ingresar';
    enterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openTour();
    });

    footer.appendChild(enterBtn);
    media.appendChild(footer);
    card.appendChild(media);

    card.addEventListener('click', function (e) {
      if (e.target.closest('.tour360-card-enter')) return;
      openTour();
    });

    tour360Grid.appendChild(card);
  });
}
renderTour360Grid();

/* ================= RENDER DE LISTA DE DESCARGAS ================= */
var downloadsList = document.getElementById('downloadsList');

/* =========================================================
   NAVEGACIÓN: pila de pantallas
   ========================================================= */
var navStack = [];

var MENU_ACTIVE_PARENT = {
  'menu-proyecto': 'menuConoce',
  'descripcion': 'menuConoce',
  'video': 'menuConoce',
  'renders': 'menuConoce',
  'amenidades': 'menuConoce',
  'estado': 'menuConoce',
  'constructora': 'menuConoce',
  'descargas': 'menuConoce',
  'menu-contacto': 'menuContacto',
  'tour360': 'menuTour360',
  'tipologias': 'menuViviendas',
  'calculator': 'menuViviendas',
  'plans': 'menuViviendas',
  'sphere': 'menuViviendas',
  'location': 'menuUbicacion'
};

var MENU_ACTIVE_ITEM = {
  'menu-proyecto': 'menuConoce',
  'menu-contacto': 'menuContacto',
  'descripcion': 'menuDescripcion',
  'video': 'menuVideo',
  'renders': 'menuRenders',
  'amenidades': 'menuAmenidades',
  'estado': 'menuEstado',
  'constructora': 'menuConstructora',
  'descargas': 'menuDescargas',
  'tour360': 'menuTour360',
  'tipologias': 'menuViviendas',
  'calculator': 'menuViviendas',
  'plans': 'menuViviendas',
  'sphere': 'menuViviendas',
  'location': 'menuUbicacion'
};

function syncMenuActiveStates() {
  var top = navStack.length ? navStack[navStack.length - 1] : null;
  var parentId = top ? MENU_ACTIVE_PARENT[top] : null;
  var itemId = top ? MENU_ACTIVE_ITEM[top] : null;

  document.querySelectorAll('#mainMenu .menu-item, #mainMenu .contact-link').forEach(function (el) {
    el.classList.remove('is-active');
  });

  if (parentId) {
    var parentEl = document.getElementById(parentId);
    if (parentEl) parentEl.classList.add('is-active');
  }
  if (itemId && itemId !== parentId) {
    var itemEl = document.getElementById(itemId);
    if (itemEl) itemEl.classList.add('is-active');
  }
}

var sphereLoaderFallbackTimer = null;
var sphereLoaderMinTimer = null;
var NAV_SESSION_KEY = 'guilie_nav_session_v1';
var navInteractionGraceUntil = 0;
var NAV_GRACE_MS = 3000;
var modalBackdropPointers = {};
var liveNavSnapshot = null;
var frozenNavSnapshot = null;
var navFreezeLock = false;
var goBackAuthorizedUntil = 0;
var GO_BACK_AUTH_MS = 200;
var navReturnGuardUntil = 0;
var NAV_RETURN_GUARD_MS = 900;
var overlayMenuSuppressed = false;
var preservedOverlayId = null;
var suppressPersonalizeRestore = false;
var navResumePending = false;
var navResumeGateActive = false;
var navResumeAwaitingClick = false;
var navResumeWatchdogTimer = null;
var navTabLeaving = false;
var navAllowProgrammaticOpenUntil = 0;
var lastNavUserGestureAt = 0;
var lastTabVisibleAt = 0;
var tabVisibleDebounceUntil = 0;
var TAB_RETURN_COOLDOWN_MS = 700;
var NAV_USER_GESTURE_MS = 2000;
var NAV_BUILD = 'nav19';
var menuOpenTokenUntil = 0;

function isNavResumeGateFeatureEnabled() {
  if (typeof NAV_RESUME_GATE_ENABLED === 'boolean') return NAV_RESUME_GATE_ENABLED;
  return true;
}
var menuWatchdogSuppress = false;

function grantMenuOpenToken(ms) {
  menuOpenTokenUntil = Date.now() + (ms || 3000);
  window.__menuOpenAllowedUntil = menuOpenTokenUntil;
}
window.grantMenuOpenToken = grantMenuOpenToken;

function revokeMenuOpenToken() {
  menuOpenTokenUntil = 0;
  window.__menuOpenAllowedUntil = 0;
  navAllowProgrammaticOpenUntil = 0;
}
window.revokeMenuOpenToken = revokeMenuOpenToken;

function shouldBlockAutoMenuOpen() {
  if (typeof window.__lastTabReturnAt !== 'number') return false;
  return Date.now() - window.__lastTabReturnAt < 2500;
}
window.shouldBlockAutoMenuOpen = shouldBlockAutoMenuOpen;

function hasMenuOpenToken() {
  if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return true;
  if (isThemeCustomizationActive()) return true;
  if (isGoBackAuthorized()) return true;
  if (Date.now() < menuOpenTokenUntil) return true;
  if (window.__menuOpenAllowedUntil && Date.now() < window.__menuOpenAllowedUntil) return true;
  if (Date.now() < navAllowProgrammaticOpenUntil) return true;
  return false;
}

function bindMenuOpenWatchdog() {
  var menu = document.getElementById('mainMenu');
  if (!menu || bindMenuOpenWatchdog.bound) return;
  bindMenuOpenWatchdog.bound = true;
  var observer = new MutationObserver(function () {
    if (menuWatchdogSuppress) return;
    if (!menu.classList.contains('active')) return;
    if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return;
    if (hasMenuOpenToken()) return;
    if (isNavResumeGateActive()) return;
    menuWatchdogSuppress = true;
    forceHeroIdleUi();
    menuWatchdogSuppress = false;
  });
  observer.observe(menu, { attributes: true, attributeFilter: ['class'] });
}

function bindMenuOpenTokenGestures() {
  if (bindMenuOpenTokenGestures.bound) return;
  bindMenuOpenTokenGestures.bound = true;
  document.addEventListener('pointerdown', function (e) {
    if (!e.isTrusted) return;
    var target = e.target;
    if (!target || !target.closest) return;
    if (target.closest('#mainMenuOpenBtn, #mainMenu, #mainMenuBackdrop, .main-menu-backdrop, #customThemeColorPopover, [id^="menu"], #mainMenuListPersonalizarV2, #menuNavV2Col, #menuNavV2Actions, .personalize-v2-scroll, .mis-temas-list, .personalize-v2-icon-btn, #projectThemeConfirmModal')) {
      grantMenuOpenToken(3000);
      lastNavUserGestureAt = Date.now();
    }
  }, true);
}

window.addEventListener('blur', function () {
  navTabLeaving = true;
}, true);

document.addEventListener('pointerdown', function (e) {
  if (e.isTrusted) lastNavUserGestureAt = Date.now();
}, true);

function allowProgrammaticNavOpen(ms) {
  navAllowProgrammaticOpenUntil = Date.now() + (ms || 600);
}
window.allowProgrammaticNavOpen = allowProgrammaticNavOpen;

function canOpenMenuWithoutGesture() {
  if (Date.now() < navAllowProgrammaticOpenUntil) return true;
  if (lastNavUserGestureAt <= lastTabVisibleAt + 80) return false;
  return Date.now() - lastNavUserGestureAt < NAV_USER_GESTURE_MS;
}
window.canOpenMenuWithoutGesture = canOpenMenuWithoutGesture;

function isNavResumeGateActive() {
  return navResumeGateActive;
}

function isNavResumeLocked() {
  return navResumeGateActive || navResumeAwaitingClick;
}

function clearNavResumeAwaiting() {
  navResumePending = false;
  navResumeAwaitingClick = false;
  stopNavResumeWatchdog();
}

function stopNavResumeWatchdog() {
  if (navResumeWatchdogTimer) {
    clearInterval(navResumeWatchdogTimer);
    navResumeWatchdogTimer = null;
  }
}

function startNavResumeWatchdog() {
  stopNavResumeWatchdog();
  showNavResumeGate();
}

function shouldRestoreNavAfterTabReturn() {
  return isNavResumeLocked() ||
    (navResumePending && (frozenSnapshotWarrantsResumeGate() || !!preservedOverlayId));
}

function shouldOfferNavResumeGate() {
  return isNavResumeGateFeatureEnabled() && shouldRestoreNavAfterTabReturn();
}

function hideViewForResumeGate() {
  document.getElementById('mainMenuBackdrop').classList.remove('active');
  document.getElementById('mainMenu').classList.remove('active');
  document.body.classList.remove('main-menu-open');
  document.body.classList.remove('global-close-docked');
}

function showNavResumeGate() {
  if (!isNavResumeGateFeatureEnabled()) {
    clearNavResumeAwaiting();
    return false;
  }
  hideViewForResumeGate();
  navResumeGateActive = true;
  if (typeof PauseScreen !== 'undefined') {
    if (!PauseScreen.isEnabled()) {
      navResumeGateActive = false;
      confirmNavResume();
      return true;
    }
    return PauseScreen.show({
      onConfirm: confirmNavResume,
      autoConfirmIfDisabled: true
    });
  }
  var gate = document.getElementById('navResumeGate');
  if (!gate) return false;
  gate.hidden = false;
  navResumeGateActive = true;
  window.__navResumeGateOpen = true;
  document.body.classList.add('nav-resume-active');
  lockBodyScroll();
  syncNavigationCloseState();
  return true;
}

function hideNavResumeGate() {
  if (typeof PauseScreen !== 'undefined' && PauseScreen.isVisible()) {
    PauseScreen.hide({ immediate: true });
  }
  var gate = document.getElementById('navResumeGate');
  if (gate) gate.hidden = true;
  navResumeGateActive = false;
  window.__navResumeGateOpen = false;
  document.body.classList.remove('nav-resume-active');
}

function confirmNavResume() {
  if (!navResumeGateActive && !navResumeAwaitingClick && !(typeof PauseScreen !== 'undefined' && PauseScreen.isVisible())) return;

  var resume = function () {
    clearNavResumeAwaiting();
    navResumeGateActive = false;
    window.__navResumeGateOpen = false;
    document.body.classList.remove('nav-resume-active');
    navTabLeaving = false;
    allowProgrammaticNavOpen(4000);
    grantMenuOpenToken(4000);
    markNavReturnGuard();
    if (frozenNavSnapshot) {
      liveNavSnapshot = frozenNavSnapshot;
      applyNavSnapshot(frozenNavSnapshot, { fromResumeConfirm: true });
    } else if (liveNavSnapshot) {
      syncDomToLiveSnapshot();
    }
    beginNavInteractionGrace();
    setTimeout(releaseNavFreeze, NAV_RETURN_GUARD_MS);
    syncNavigationCloseState();
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.restoreEditorSessionState === 'function') {
      VisitorPersonalizePanel.restoreEditorSessionState({ force: true });
    }
  };

  if (typeof PauseScreen !== 'undefined' && PauseScreen.isVisible()) {
    PauseScreen.hide(null, resume);
    return;
  }
  hideNavResumeGate();
  resume();
}

function bindNavResumeGate() {
  if (bindNavResumeGate.bound) return;
  bindNavResumeGate.bound = true;
  if (typeof PauseScreen !== 'undefined') {
    PauseScreen.bind();
    return;
  }
  var btn = document.getElementById('navResumeGateBtn');
  var gate = document.getElementById('navResumeGate');
  if (!btn || !gate) return;
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    confirmNavResume();
  });
  gate.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    confirmNavResume();
  });
}

function beginNavInteractionGrace() {
  navInteractionGraceUntil = Date.now() + NAV_GRACE_MS;
}

function isNavInteractionGraceActive() {
  return Date.now() < navInteractionGraceUntil;
}

function markNavReturnGuard() {
  navReturnGuardUntil = Date.now() + NAV_RETURN_GUARD_MS;
}

function isNavReturnGuardActive() {
  return Date.now() < navReturnGuardUntil;
}

function authorizeGoBack() {
  if (isNavReturnGuardActive()) return;
  goBackAuthorizedUntil = Date.now() + GO_BACK_AUTH_MS;
}

function authorizeGoBackForce() {
  navTabLeaving = false;
  clearNavResumeAwaiting();
  hideNavResumeGate();
  releaseNavFreeze();
  grantMenuOpenToken(2000);
  allowProgrammaticNavOpen(2000);
  goBackAuthorizedUntil = Date.now() + GO_BACK_AUTH_MS;
}

function isGoBackAuthorized() {
  return Date.now() < goBackAuthorizedUntil;
}

function clearPreservedOverlay() {
  preservedOverlayId = null;
  overlayMenuSuppressed = false;
}

function isReturnGuardProtectingOverlay() {
  if (isGoBackAuthorized()) return false;
  if (!isNavReturnGuardActive()) return false;
  return !!(preservedOverlayId || isOverlayNavTop() || frozenSnapshotHasOverlayTop());
}

function isOverlayNavigationLocked() {
  if (isGoBackAuthorized()) return false;
  if (isNavResumeLocked()) return true;
  if (!preservedOverlayId) return false;
  if (navFreezeLock) return true;
  if (isNavReturnGuardActive()) return true;
  return false;
}

function isOverlayNavTop() {
  return isOverlayScreenId(getTopNavScreenId());
}

function frozenSnapshotHasOverlayTop() {
  if (!frozenNavSnapshot || !frozenNavSnapshot.navStack || !frozenNavSnapshot.navStack.length) {
    return false;
  }
  var frozenTop = frozenNavSnapshot.navStack[frozenNavSnapshot.navStack.length - 1];
  return isOverlayScreenId(frozenTop);
}

function frozenSnapshotHasMenuOpen() {
  return !!(frozenNavSnapshot && frozenNavSnapshot.menuOpen);
}

function hasPendingThemeEditorSession() {
  if (typeof VisitorPersonalizePanel === 'undefined') return false;
  if (typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
      VisitorPersonalizePanel.isEditorSessionLocked()) {
    return true;
  }
  if (typeof VisitorPersonalizePanel.hasPendingEditorSession === 'function' &&
      VisitorPersonalizePanel.hasPendingEditorSession()) {
    return true;
  }
  return false;
}

function shouldPauseNavOnTabLeave() {
  if (isOverlayNavTop() || !!preservedOverlayId) return true;
  if (isMainMenuOpen()) return true;
  if (hasPendingThemeEditorSession()) return true;
  if (findLastMenuScreenId(navStack)) return true;
  return false;
}

function frozenSnapshotWarrantsResumeGate() {
  if (!frozenNavSnapshot || !frozenNavSnapshot.navStack || !frozenNavSnapshot.navStack.length) {
    return false;
  }
  if (frozenSnapshotHasOverlayTop() || frozenSnapshotHasMenuOpen()) return true;
  if (findLastMenuScreenId(frozenNavSnapshot.navStack)) return true;
  if (hasPendingThemeEditorSession()) return true;
  return false;
}

function shouldBlockUnauthorizedGoBack() {
  if (isGoBackAuthorized()) return false;
  if (isOverlayNavigationLocked()) return true;
  if (isOverlayNavTop()) return true;
  if (navFreezeLock && frozenSnapshotHasOverlayTop()) return true;
  return false;
}

function clearNavFreezeState() {
  navFreezeLock = false;
  frozenNavSnapshot = null;
}

function releaseNavFreeze() {
  navFreezeLock = false;
  frozenNavSnapshot = null;
}

function hasActiveOverlayInDom() {
  var keys = Object.keys(SCREEN_ELEMENTS);
  for (var i = 0; i < keys.length; i++) {
    var el = document.getElementById(SCREEN_ELEMENTS[keys[i]]);
    if (el && el.classList.contains('active')) return true;
  }
  return false;
}

function isHeroIdle() {
  if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return false;
  if (isOverlayNavTop()) return false;
  if (preservedOverlayId) return false;
  if (hasActiveOverlayInDom()) return false;
  if (typeof VisitorPersonalizePanel !== 'undefined') {
    if (typeof VisitorPersonalizePanel.isThemeEditorOpen === 'function' &&
        VisitorPersonalizePanel.isThemeEditorOpen()) {
      return false;
    }
    if (typeof VisitorPersonalizePanel.isColorPopoverOpen === 'function' &&
        VisitorPersonalizePanel.isColorPopoverOpen()) {
      return false;
    }
  }
  if (!isMainMenuOpen()) {
    if (navStack.length) navStack.length = 0;
    return true;
  }
  if (!navStack.length) return true;
  return false;
}

function forceHeroIdleUi() {
  if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return;
  if (isThemeCustomizationActive()) return;
  if (navResumePending || isNavResumeLocked()) return;
  hideAllOverlayScreens();
  hideNavResumeGate();
  navStack.length = 0;
  clearPreservedOverlay();
  clearNavFreezeState();
  liveNavSnapshot = null;
  document.getElementById('mainMenuBackdrop').classList.remove('active');
  document.getElementById('mainMenu').classList.remove('active');
  document.body.classList.remove('main-menu-open');
  document.body.classList.remove('global-close-docked');
  document.body.classList.remove('nav-resume-active');
  unlockBodyScroll();
  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.clearEditorSessionState === 'function') {
    VisitorPersonalizePanel.clearEditorSessionState();
  }
  saveNavSession();
  syncNavigationCloseState();
}

function shouldEnforceNavDom() {
  if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return false;
  if (isNavResumeLocked()) return false;
  if (isThemeCustomizationActive()) return false;
  if (navFreezeLock || isNavReturnGuardActive()) return true;
  if (preservedOverlayId && isMainMenuOpen()) return true;
  if (isOverlayNavTop() && isMainMenuOpen()) return true;
  return false;
}

function isThemeCustomizationActive() {
  if (typeof isStyleV3MenuLocked === 'function' && isStyleV3MenuLocked()) return true;
  if (typeof VisitorPersonalizeV2Panel !== 'undefined' &&
      typeof VisitorPersonalizeV2Panel.isOnPanel === 'function' &&
      VisitorPersonalizeV2Panel.isOnPanel()) {
    return true;
  }
  if (typeof VisitorPersonalizePanel === 'undefined') return false;
  if (typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
      VisitorPersonalizePanel.isEditorSessionLocked()) {
    return true;
  }
  if (typeof VisitorPersonalizePanel.isColorPopoverOpen === 'function' &&
      VisitorPersonalizePanel.isColorPopoverOpen()) {
    return true;
  }
  if (typeof VisitorPersonalizePanel.isThemeEditorOpen === 'function' &&
      VisitorPersonalizePanel.isThemeEditorOpen()) {
    return true;
  }
  var popover = document.getElementById('customThemeColorPopover');
  if (popover && popover.classList.contains('is-open')) return true;
  return false;
}

function deriveMenuLevelFromStack(stack) {
  var lastMenu = findLastMenuScreenId(stack);
  return lastMenu ? resolveMenuLevel(lastMenu) : 'primary';
}

function guardedGoBack() {
  if (isStyleV3MenuLocked()) return;
  if (isTabReturnCooldown()) return;
  if (!hasUserActivation()) return;
  authorizeGoBack();
  goBack();
}

function captureLiveNavSnapshot() {
  if (navFreezeLock || navResumeAwaitingClick) return;
  if (!navStack.length) {
    liveNavSnapshot = null;
    return;
  }
  liveNavSnapshot = {
    version: 3,
    navStack: navStack.slice(),
    menuOpen: isMainMenuOpen(),
    menuLevel: deriveMenuLevelFromStack(navStack)
  };
}

function freezeNavSnapshot() {
  if (navResumeAwaitingClick && frozenNavSnapshot) return;
  if (!navStack.length) {
    frozenNavSnapshot = null;
    liveNavSnapshot = null;
    navFreezeLock = false;
    return;
  }
  var snapshot = {
    version: 3,
    navStack: navStack.slice(),
    menuOpen: isMainMenuOpen(),
    menuLevel: deriveMenuLevelFromStack(navStack)
  };
  frozenNavSnapshot = snapshot;
  liveNavSnapshot = snapshot;
  navFreezeLock = true;
}

function getTopNavScreenId() {
  if (!navStack.length) return null;
  return navStack[navStack.length - 1];
}

function getCurrentMenuLevel() {
  if (navStack.length) {
    var fromStack = deriveMenuLevelFromStack(navStack);
    if (fromStack !== 'primary' || findLastMenuScreenId(navStack)) return fromStack;
  }
  var personalizarV2 = document.getElementById('mainMenuListPersonalizarV2');
  if (personalizarV2 && personalizarV2.style.display !== 'none') return 'personalizar-v2';
  var personalizar = document.getElementById('mainMenuListPersonalizar');
  if (personalizar && personalizar.style.display !== 'none') return 'personalizar';
  var proyecto = document.getElementById('mainMenuListProyecto');
  if (proyecto && proyecto.style.display !== 'none') return 'proyecto';
  var contacto = document.getElementById('mainMenuListContacto');
  if (contacto && contacto.style.display !== 'none') return 'contacto';
  return 'primary';
}

function isOverlayScreenId(screenId) {
  return !!(screenId && screenId.indexOf('menu-') !== 0);
}

function navStacksEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function findLastMenuScreenId(stack) {
  if (!stack) return null;
  for (var i = stack.length - 1; i >= 0; i--) {
    if (stack[i].indexOf('menu-') === 0) return stack[i];
  }
  return null;
}

function hideAllOverlayScreens() {
  Object.keys(SCREEN_ELEMENTS).forEach(function (id) {
    var el = document.getElementById(SCREEN_ELEMENTS[id]);
    if (el) el.classList.remove('active');
  });
}

function saveNavSession() {
  if (!navStack.length) {
    try { sessionStorage.removeItem(NAV_SESSION_KEY); } catch (e) {}
    return;
  }
  try {
    sessionStorage.setItem(NAV_SESSION_KEY, JSON.stringify({
      version: 1,
      navStack: navStack.slice(),
      menuOpen: isMainMenuOpen(),
      menuLevel: deriveMenuLevelFromStack(navStack)
    }));
  } catch (e) {}
}

function applyNavSnapshot(snapshot, options) {
  options = options || {};
  if (isNavResumeLocked() && !options.fromResumeConfirm) return false;
  if (!snapshot || !snapshot.navStack || !snapshot.navStack.length) return false;

  hideAllOverlayScreens();

  if (snapshot.menuOpen) {
    if (!options.fromResumeConfirm && !canOpenMenuWithoutGesture()) {
      document.getElementById('mainMenuBackdrop').classList.remove('active');
      document.getElementById('mainMenu').classList.remove('active');
      document.body.classList.remove('main-menu-open');
      document.body.classList.remove('global-close-docked');
      showMenuLevel(snapshot.menuLevel || deriveMenuLevelFromStack(snapshot.navStack));
    } else {
      allowProgrammaticNavOpen(1200);
      document.getElementById('mainMenuBackdrop').classList.add('active');
      document.getElementById('mainMenu').classList.add('active');
      document.body.classList.add('main-menu-open');
      var lastMenu = findLastMenuScreenId(snapshot.navStack);
      if (lastMenu) {
        showMenuLevel(resolveMenuLevel(lastMenu));
      } else if (snapshot.menuLevel) {
        showMenuLevel(snapshot.menuLevel);
      }
    }
  } else {
    document.getElementById('mainMenuBackdrop').classList.remove('active');
    document.getElementById('mainMenu').classList.remove('active');
    document.body.classList.remove('main-menu-open');
    document.body.classList.remove('global-close-docked');
    showMenuLevel(snapshot.menuLevel || deriveMenuLevelFromStack(snapshot.navStack));
  }

  navStack.length = 0;
  snapshot.navStack.forEach(function (id) {
    navStack.push(id);
  });

  var top = snapshot.navStack[snapshot.navStack.length - 1];
  if (isOverlayScreenId(top)) {
    var el = document.getElementById(SCREEN_ELEMENTS[top]);
    if (el) el.classList.add('active');
    lockBodyScroll();
  } else if (!snapshot.menuOpen) {
    unlockBodyScroll();
  } else {
    lockBodyScroll();
  }

  syncNavigationCloseState();
  if (!options.skipThemeSync) syncActiveTheme();
  return true;
}

function enforceNavDomIntegrity() {
  if (!shouldEnforceNavDom()) return false;

  var stackTop = getTopNavScreenId();
  var overlayTop = isOverlayScreenId(stackTop);
  var shouldRestoreStack = !overlayTop && (navFreezeLock || isNavReturnGuardActive());

  if (shouldRestoreStack && frozenNavSnapshot && frozenSnapshotHasOverlayTop()) {
    navStack.length = 0;
    frozenNavSnapshot.navStack.forEach(function (id) {
      navStack.push(id);
    });
    stackTop = navStack[navStack.length - 1];
    overlayTop = true;
  } else if (shouldRestoreStack && preservedOverlayId) {
    if (frozenNavSnapshot && frozenNavSnapshot.navStack && frozenNavSnapshot.navStack.length) {
      navStack.length = 0;
      frozenNavSnapshot.navStack.forEach(function (id) {
        navStack.push(id);
      });
    }
    stackTop = preservedOverlayId;
    overlayTop = true;
  }

  if (!overlayTop) return false;

  suppressPersonalizeRestore = true;
  try {
    hideAllOverlayScreens();

    if (isMainMenuOpen()) {
      document.getElementById('mainMenuBackdrop').classList.remove('active');
      document.getElementById('mainMenu').classList.remove('active');
      document.body.classList.remove('main-menu-open');
      document.body.classList.remove('global-close-docked');
    }

    showMenuLevel(deriveMenuLevelFromStack(navStack));

    var overlayEl = document.getElementById(SCREEN_ELEMENTS[stackTop]);
    if (overlayEl) {
      overlayEl.classList.add('active');
      lockBodyScroll();
    }

    syncNavigationCloseState();
    syncActiveTheme();
  } finally {
    suppressPersonalizeRestore = false;
  }

  return true;
}

function scheduleNavDomEnforcement() {
  if (!shouldEnforceNavDom()) return;
  enforceNavDomIntegrity();
  requestAnimationFrame(function () {
    if (!shouldEnforceNavDom()) return;
    enforceNavDomIntegrity();
    requestAnimationFrame(function () {
      if (!shouldEnforceNavDom()) return;
      enforceNavDomIntegrity();
    });
  });
}

function syncDomToLiveSnapshot() {
  if (!liveNavSnapshot || !liveNavSnapshot.navStack || !liveNavSnapshot.navStack.length) {
    return false;
  }

  beginNavInteractionGrace();

  var snapshot = liveNavSnapshot;
  navStack.length = 0;
  snapshot.navStack.forEach(function (id) {
    navStack.push(id);
  });

  var top = snapshot.navStack[snapshot.navStack.length - 1];
  var overlayTop = isOverlayScreenId(top);

  suppressPersonalizeRestore = true;
  try {
    hideAllOverlayScreens();

    if (snapshot.menuOpen) {
      document.getElementById('mainMenuBackdrop').classList.add('active');
      document.getElementById('mainMenu').classList.add('active');
      document.body.classList.add('main-menu-open');
      var menuScreen = overlayTop ? findLastMenuScreenId(snapshot.navStack) : top;
      if (menuScreen && menuScreen.indexOf('menu-') === 0) {
        showMenuLevel(resolveMenuLevel(menuScreen));
      } else {
        showMenuLevel(snapshot.menuLevel || 'primary');
      }
    } else {
      document.getElementById('mainMenuBackdrop').classList.remove('active');
      document.getElementById('mainMenu').classList.remove('active');
      document.body.classList.remove('main-menu-open');
      document.body.classList.remove('global-close-docked');
      showMenuLevel(snapshot.menuLevel || deriveMenuLevelFromStack(snapshot.navStack));
    }

    if (overlayTop) {
      var overlayEl = document.getElementById(SCREEN_ELEMENTS[top]);
      if (overlayEl) {
        overlayEl.classList.add('active');
        lockBodyScroll();
      }
    } else if (!snapshot.menuOpen) {
      unlockBodyScroll();
    } else {
      lockBodyScroll();
    }

    syncNavigationCloseState();
    syncActiveTheme();
  } finally {
    suppressPersonalizeRestore = false;
  }

  return true;
}

function onTabHidden() {
  navTabLeaving = true;
  if (isHeroIdle()) {
    clearNavResumeAwaiting();
    clearNavFreezeState();
    liveNavSnapshot = null;
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.clearEditorSessionState === 'function') {
      VisitorPersonalizePanel.clearEditorSessionState();
    }
    forceHeroIdleUi();
    saveNavSession();
    return;
  }

  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.saveEditorSessionState === 'function') {
    VisitorPersonalizePanel.saveEditorSessionState();
  }

  if (shouldPauseNavOnTabLeave()) {
    navResumePending = true;
    if (!navResumeAwaitingClick) {
      navResumeAwaitingClick = true;
      freezeNavSnapshot();
    }
  } else {
    clearNavResumeAwaiting();
    freezeNavSnapshot();
  }
  saveNavSession();
}

function onTabVisible() {
  var now = Date.now();
  if (now < tabVisibleDebounceUntil) return;
  tabVisibleDebounceUntil = now + 400;

  navTabLeaving = false;
  lastTabVisibleAt = now;
  window.__lastTabReturnAt = now;
  revokeMenuOpenToken();

  if (shouldRestoreNavAfterTabReturn()) {
    if (isNavResumeGateFeatureEnabled()) {
      showNavResumeGate();
    } else {
      confirmNavResume();
    }
    return;
  }

  clearNavResumeAwaiting();
  releaseNavFreeze();
  if (isThemeCustomizationActive() || hasPendingThemeEditorSession()) return;
  if (!isHeroIdle()) {
    if (restoreNavSession()) return;
    if (liveNavSnapshot) syncDomToLiveSnapshot();
    return;
  }
  forceHeroIdleUi();
  requestAnimationFrame(function () {
    if (isThemeCustomizationActive() || hasPendingThemeEditorSession() || navResumePending || isNavResumeLocked()) return;
    if (isHeroIdle()) forceHeroIdleUi();
  });
  setTimeout(function () {
    if (isThemeCustomizationActive() || hasPendingThemeEditorSession() || navResumePending || isNavResumeLocked()) return;
    if (isHeroIdle()) forceHeroIdleUi();
  }, 150);
}

function reconcileChromeBfcacheReturn() {
  lastTabVisibleAt = Date.now();
  navTabLeaving = false;
  onTabVisible();
  requestAnimationFrame(function () {
    if (isNavResumeLocked() || navResumePending || isThemeCustomizationActive() || hasPendingThemeEditorSession()) return;
    if (isHeroIdle()) forceHeroIdleUi();
  });
}

function bootNavStateGuard() {
  requestAnimationFrame(function () {
    if (isNavResumeLocked() || navResumePending || isThemeCustomizationActive() || hasPendingThemeEditorSession()) return;
    if (isHeroIdle() && isMainMenuOpen()) forceHeroIdleUi();
  });
}

function restoreNavSession() {
  if (restoreNavSession.running) return false;
  var raw;
  try { raw = sessionStorage.getItem(NAV_SESSION_KEY); } catch (e) { return false; }
  if (!raw) return false;
  var saved;
  try { saved = JSON.parse(raw); } catch (e) { return false; }
  if (!saved || !saved.navStack || !saved.navStack.length) return false;

  var top = saved.navStack[saved.navStack.length - 1];
  var stackMatches = navStacksEqual(navStack, saved.navStack);
  var menuMatches = isMainMenuOpen() === !!saved.menuOpen;

  if (stackMatches && menuMatches) {
    if (isOverlayScreenId(top)) {
      var el = document.getElementById(SCREEN_ELEMENTS[top]);
      if (el && !el.classList.contains('active')) {
        restoreNavSession.running = true;
        try { return applyNavSnapshot(saved); } finally { restoreNavSession.running = false; }
      }
    }
    return false;
  }

  restoreNavSession.running = true;
  try {
    return applyNavSnapshot(saved);
  } finally {
    restoreNavSession.running = false;
  }
}

function scheduleTabReturnCheck() {
  if (scheduleTabReturnCheck.timer) clearTimeout(scheduleTabReturnCheck.timer);
  scheduleTabReturnCheck.timer = setTimeout(onTabVisible, 30);
}

function bindNavSessionPersistence() {
  if (bindNavSessionPersistence.bound) return;
  bindNavSessionPersistence.bound = true;

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      onTabHidden();
      return;
    }
    scheduleTabReturnCheck();
  }, true);

  window.addEventListener('pagehide', onTabHidden);
  window.addEventListener('focus', scheduleTabReturnCheck);
  window.addEventListener('pageshow', function () {
    scheduleTabReturnCheck();
  });

  bindNavResumeGate();
  bindMenuOpenWatchdog();
  bindMenuOpenTokenGestures();
}

function syncNavigationCloseState() {
  if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
    GlobalClose.update();
  }
}

function isMainMenuOpen() {
  var menu = document.getElementById('mainMenu');
  return !!(menu && menu.classList.contains('active'));
}

function resolveMenuLevel(screenId) {
  if (screenId === 'menu-proyecto') return 'proyecto';
  if (screenId === 'menu-contacto') return 'contacto';
  if (screenId === 'menu-personalizar') return 'personalizar';
  if (screenId === 'menu-personalizar-v2') return 'personalizar-v2';
  return 'primary';
}

var styleV3MenuCloseAuthorized = false;

function isStyleV3MenuLocked() {
  if (!isMainMenuOpen()) return false;
  if (typeof VisitorPersonalizeV2Panel !== 'undefined' &&
      typeof VisitorPersonalizeV2Panel.isOnPanel === 'function' &&
      VisitorPersonalizeV2Panel.isOnPanel()) {
    return true;
  }
  if (navStack.length && navStack[navStack.length - 1] === 'menu-personalizar-v2') {
    return true;
  }
  var menu = document.getElementById('mainMenu');
  return !!(menu && menu.classList.contains('is-personalizar-v2'));
}

function authorizeStyleV3MenuClose() {
  styleV3MenuCloseAuthorized = true;
}

function consumeStyleV3MenuCloseAuth() {
  var ok = styleV3MenuCloseAuthorized;
  styleV3MenuCloseAuthorized = false;
  return ok;
}

function closeMainMenuIfOpen() {
  if (!isMainMenuOpen()) return false;
  if (isStyleV3MenuLocked() && !consumeStyleV3MenuCloseAuth()) return false;
  hideMainMenuPanel();
  for (var i = navStack.length - 1; i >= 0; i--) {
    if (navStack[i].indexOf('menu-') === 0) navStack.splice(i, 1);
  }
  if (navStack.length === 0) {
    unlockBodyScroll();
    resumeCoverVideo();
  }
  syncNavigationCloseState();
  return true;
}

function showMainMenuPanel() {
  if (!hasMenuOpenToken()) return;
  if (navTabLeaving && !isGoBackAuthorized()) return;
  if (isNavResumeLocked() && !isGoBackAuthorized()) return;
  if (preservedOverlayId && (isNavReturnGuardActive() || isOverlayNavTop()) && !isGoBackAuthorized()) return;
  if (overlayMenuSuppressed && isOverlayNavTop()) return;
  document.getElementById('mainMenuBackdrop').classList.add('active');
  document.getElementById('mainMenu').classList.add('active');
  document.body.classList.add('main-menu-open', 'global-close-docked');
  syncNavigationCloseState();
  syncMenuActiveStates();
  requestAnimationFrame(function () {
    if (isMainMenuOpen()) {
      document.body.classList.add('global-close-docked');
      syncNavigationCloseState();
    }
  });
}
function hideMainMenuPanel() {
  document.body.classList.remove('global-close-docked');
  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.resetThemeEditorOnLeave === 'function') {
    VisitorPersonalizePanel.resetThemeEditorOnLeave();
  }
  if (typeof VisitorPersonalizeV2Panel !== 'undefined' &&
      typeof VisitorPersonalizeV2Panel.isOnPanel === 'function' &&
      VisitorPersonalizeV2Panel.isOnPanel() &&
      typeof VisitorPersonalizeV2Panel.onLeave === 'function') {
    VisitorPersonalizeV2Panel.onLeave();
  }
  document.getElementById('mainMenuBackdrop').classList.remove('active');
  document.getElementById('mainMenu').classList.remove('active');
  document.body.classList.remove('main-menu-open');
  if (!isOverlayNavTop()) {
    showMenuLevel('primary');
  }
  syncNavigationCloseState();
}
function isPersonalizarPanelActive() {
  return typeof VisitorPersonalizePanel !== 'undefined' &&
    typeof VisitorPersonalizePanel.isOnPersonalizarPanel === 'function' &&
    VisitorPersonalizePanel.isOnPersonalizarPanel();
}

function showMenuLevel(level) {
  var primary  = document.getElementById('mainMenuListPrimary');
  var proyecto = document.getElementById('mainMenuListProyecto');
  var contacto = document.getElementById('mainMenuListContacto');
  var personalizar = document.getElementById('mainMenuListPersonalizar');
  var personalizarV2 = document.getElementById('mainMenuListPersonalizarV2');
  var menuNavV2Col = document.getElementById('menuNavV2Col');
  var menuNavSaveCol = document.getElementById('menuNavSaveCol');
  var menuNavBack = document.getElementById('menuNavBack');
  var menu = document.getElementById('mainMenu');

  primary.style.display  = 'none';
  proyecto.style.display = 'none';
  contacto.style.display = 'none';
  if (personalizar) personalizar.style.display = 'none';
  if (personalizarV2) personalizarV2.style.display = 'none';
  if (menuNavV2Col) menuNavV2Col.hidden = true;
  if (menu) menu.classList.remove('is-personalizar', 'is-personalizar-v2');

  if (level === 'proyecto') {
    proyecto.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = false;
    requestAnimationFrame(function () {
      setupProyectoScrollDiscovery(proyecto);
    });
  } else if (level === 'contacto') {
    contacto.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = false;
  } else if (level === 'personalizar') {
    if (personalizar) personalizar.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = false;
    if (menu) menu.classList.add('is-personalizar');
    if (!suppressPersonalizeRestore && typeof VisitorPersonalizePanel !== 'undefined') {
      VisitorPersonalizePanel.render();
      if (typeof window.isMainMenuOpen === 'function' && window.isMainMenuOpen() &&
          typeof VisitorPersonalizePanel.restoreEditorSessionState === 'function' &&
          typeof VisitorPersonalizePanel.shouldRestoreEditorSession === 'function' &&
          VisitorPersonalizePanel.shouldRestoreEditorSession() &&
          !VisitorPersonalizePanel.restoreEditorSessionState.running) {
        VisitorPersonalizePanel.restoreEditorSessionState();
      }
    }
  } else if (level === 'personalizar-v2') {
    if (personalizarV2) personalizarV2.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = true;
    if (menuNavSaveCol) menuNavSaveCol.hidden = true;
    if (menu) menu.classList.add('is-personalizar', 'is-personalizar-v2');
    grantMenuOpenToken(3600000);
    if (typeof VisitorPersonalizeV2Panel !== 'undefined' &&
        typeof VisitorPersonalizeV2Panel.render === 'function') {
      VisitorPersonalizeV2Panel.render();
    }
  } else {
    primary.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = true;
  }
  syncMenuActiveStates();
}
window.showMenuLevel = showMenuLevel;

var PROYECTO_SCROLL_HINT_KEY = 'menuProyectoScrollHintSeen';
var PROYECTO_SCROLL_BOUNCE_KEY = 'menuProyectoScrollBounceSeen';
var proyectoScrollHintBound = false;
var proyectoScrollBounceTimer = null;

function isMobileMenuViewport() {
  return Math.min(window.innerWidth, window.innerHeight) <= 600;
}

function updateProyectoScrollChrome(listEl) {
  if (!listEl) return;
  var canScroll = listEl.scrollHeight > listEl.clientHeight + 8;
  var atEnd = !canScroll ||
    (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 10);
  listEl.classList.toggle('has-scroll-overflow', canScroll);
  listEl.classList.toggle('has-scroll-more', canScroll && !atEnd);
  return canScroll;
}

function dismissProyectoScrollHint(listEl) {
  if (!listEl) return;
  listEl.classList.remove('has-scroll-hint');
  var hint = document.getElementById('menuProyectoScrollHint');
  if (hint) {
    hint.hidden = true;
    hint.setAttribute('aria-hidden', 'true');
  }
  try { sessionStorage.setItem(PROYECTO_SCROLL_HINT_KEY, '1'); } catch (e) { /* ignore */ }
}

function playProyectoScrollBounce(listEl) {
  if (!listEl || typeof isMotionReduced === 'function' && isMotionReduced()) return;
  var bounced = false;
  try { bounced = sessionStorage.getItem(PROYECTO_SCROLL_BOUNCE_KEY) === '1'; } catch (e) { /* ignore */ }
  if (bounced) return;
  try { sessionStorage.setItem(PROYECTO_SCROLL_BOUNCE_KEY, '1'); } catch (e2) { /* ignore */ }

  var start = listEl.scrollTop;
  var peak = Math.min(28, Math.max(0, listEl.scrollHeight - listEl.clientHeight - 4));
  if (peak < 12) return;

  var t0 = null;
  var duration = 680;
  function frame(ts) {
    if (!listEl.isConnected) return;
    if (t0 == null) t0 = ts;
    var p = Math.min(1, (ts - t0) / duration);
    /* ida y vuelta suave */
    var wave = p < 0.45
      ? (p / 0.45)
      : (1 - ((p - 0.45) / 0.55));
    var ease = wave < 0.5 ? 2 * wave * wave : 1 - Math.pow(-2 * wave + 2, 2) / 2;
    listEl.scrollTop = start + peak * ease;
    if (p < 1) requestAnimationFrame(frame);
    else listEl.scrollTop = start;
  }
  requestAnimationFrame(frame);
}

function setupProyectoScrollDiscovery(listEl) {
  if (!listEl) return;
  if (!isMobileMenuViewport()) {
    listEl.classList.remove('has-scroll-overflow', 'has-scroll-more', 'has-scroll-hint');
    var desktopHint = document.getElementById('menuProyectoScrollHint');
    if (desktopHint) {
      desktopHint.hidden = true;
      desktopHint.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  var hint = document.getElementById('menuProyectoScrollHint');
  var canScroll = updateProyectoScrollChrome(listEl);

  var seen = false;
  try { seen = sessionStorage.getItem(PROYECTO_SCROLL_HINT_KEY) === '1'; } catch (e) { /* ignore */ }

  if (!canScroll || seen) {
    listEl.classList.remove('has-scroll-hint');
    if (hint) {
      hint.hidden = true;
      hint.setAttribute('aria-hidden', 'true');
    }
  } else {
    listEl.classList.add('has-scroll-hint');
    if (hint) {
      hint.hidden = false;
      hint.setAttribute('aria-hidden', 'false');
    }
    if (proyectoScrollBounceTimer) clearTimeout(proyectoScrollBounceTimer);
    proyectoScrollBounceTimer = setTimeout(function () {
      proyectoScrollBounceTimer = null;
      if (!listEl.isConnected || listEl.style.display === 'none') return;
      playProyectoScrollBounce(listEl);
      updateProyectoScrollChrome(listEl);
    }, 700);
  }

  if (proyectoScrollHintBound) return;
  proyectoScrollHintBound = true;
  listEl.addEventListener('scroll', function (ev) {
    updateProyectoScrollChrome(listEl);
    /* Solo el gesto del usuario descarta el indicador (no el rebote automático). */
    if (ev && ev.isTrusted && listEl.scrollTop > 6) {
      dismissProyectoScrollHint(listEl);
    }
  }, { passive: true });
}

var SCREEN_ELEMENTS = {
  descripcion:  'descripcionModal',
  amenidades:   'amenidadesModal',
  estado:       'estadoModal',
  constructora: 'constructoraModal',
  descargas:    'descargasModal',
  video:        'videoModal',
  renders:      'rendersModal',
  location:     'locationModal',
  calculator:   'calculatorModal',
  tipologias:   'unitsPopup',
  plans:        'pdfModal',
  tour360:      'tour360Popup',
  sphere:       'sphereModal'
};

var OVERLAY_SCREENS = { calculator: true };

var SCREEN_HOOKS = {
  tipologias: {
    onEnter: function () {
      if (typeof syncUnitsChromeLabels === 'function') syncUnitsChromeLabels();
      if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
        GlobalClose.update();
        requestAnimationFrame(function () { GlobalClose.update(); });
      }
      if (typeof playUnitCardsEntrance === 'function') {
        requestAnimationFrame(function () {
          playUnitCardsEntrance();
        });
      }
    },
    onExit: function () {
      if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
        GlobalClose.update();
      }
    }
  },
  tour360: {
    onEnter: function () {
      requestAnimationFrame(function () {
        playTour360CardsEntrance();
      });
    }
  },
  renders: {
    onEnter: function () {
      if (typeof playGaleriaCardsEntrance === 'function') {
        requestAnimationFrame(function () {
          playGaleriaCardsEntrance();
        });
      }
    }
  },
  video: {
    onEnter: function () {
      if (typeof playVideoModalIntro === 'function') playVideoModalIntro();
    },
    onExit: function () {
      if (typeof resetVideoModalIntro === 'function') resetVideoModalIntro();
    }
  },
  location: {
    onEnter: function () {
      var box = document.getElementById('locationPlaceholder');
      if (box && typeof LocationMap !== 'undefined' && typeof LocationMap.render === 'function') {
        var opts = typeof LocationMap.getProjectOpts === 'function'
          ? LocationMap.getProjectOpts()
          : { label: 'Valledupar' };
        if (typeof LocationMap.needsRender !== 'function' || LocationMap.needsRender(box)) {
          LocationMap.render(box, opts);
        }
      }
      if (typeof playLocationModalIntro === 'function') playLocationModalIntro();
    },
    onExit: function () {
      if (typeof resetLocationModalIntro === 'function') resetLocationModalIntro();
    }
  },
  amenidades: {
    onEnter: function () {
      if (typeof AmenitiesCarousel !== 'undefined' && typeof AmenitiesCarousel.onEnter === 'function') {
        AmenitiesCarousel.onEnter();
      }
    },
    onExit: function () {
      if (typeof AmenitiesCarousel !== 'undefined' && typeof AmenitiesCarousel.onExit === 'function') {
        AmenitiesCarousel.onExit();
      }
    }
  },
  descargas: {
    onEnter: function () {
      if (typeof DownloadsIntro !== 'undefined' && typeof DownloadsIntro.onEnter === 'function') {
        DownloadsIntro.onEnter();
      }
    },
    onExit: function () {
      if (typeof DownloadsIntro !== 'undefined' && typeof DownloadsIntro.onExit === 'function') {
        DownloadsIntro.onExit();
      }
    }
  },
  calculator: {
    onEnter: function (k) {
      setupCalculator(k);
      if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
        GlobalClose.update();
        requestAnimationFrame(function () {
          GlobalClose.update();
        });
      }
    }
  },
  plans: {
    onEnter: function(k){
      setupPlans(k);
      if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
        GlobalClose.update();
        requestAnimationFrame(function () { GlobalClose.update(); });
      }
    },
    onExit: function () {
      var gallery = document.getElementById('galleryScroll');
      if (gallery) gallery.innerHTML = '';
      if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
        GlobalClose.update();
      }
    }
  },
  estado: {
    onEnter: function(){ animateProgressBars(); }
  },
  sphere: {
    onEnter: function(l){
      playSound('tour360Enter');
      var modal = document.getElementById('sphereModal');
      var frame  = document.getElementById('sphereFrame');
      var loader = document.getElementById('sphereLoader');
      var hasLink = !!(l && String(l).trim());
      var MIN_LOADER_MS = 3000;
      var startTime = Date.now();

      loader.classList.remove('hidden');
      clearTimeout(sphereLoaderFallbackTimer);
      clearTimeout(sphereLoaderMinTimer);
      if (modal) modal.classList.toggle('is-loader-only', !hasLink);

      if (!hasLink) {
        frame.onload = null;
        frame.src = '';
        frame.setAttribute('hidden', '');
        return;
      }

      frame.removeAttribute('hidden');
      var revealed = false;
      function hideLoader() {
        if (revealed) return;
        revealed = true;
        loader.classList.add('hidden');
      }
      function requestHide() {
        var elapsed = Date.now() - startTime;
        var remaining = MIN_LOADER_MS - elapsed;
        if (remaining > 0) {
          sphereLoaderMinTimer = setTimeout(hideLoader, remaining);
        } else {
          hideLoader();
        }
      }

      /* Camino normal: el iframe avisa cuando cargó (pero respetando el mínimo de 3s) */
      frame.onload = requestHide;
      frame.src = l;

      /* Camino de respaldo: si onload no dispara nunca */
      sphereLoaderFallbackTimer = setTimeout(hideLoader, 8000);
    },
    onExit: function(){
      clearTimeout(sphereLoaderFallbackTimer);
      clearTimeout(sphereLoaderMinTimer);
      var modal = document.getElementById('sphereModal');
      var frame  = document.getElementById('sphereFrame');
      var loader = document.getElementById('sphereLoader');
      frame.onload = null;
      frame.src = '';
      frame.removeAttribute('hidden');
      if (modal) modal.classList.remove('is-loader-only');
      loader.classList.remove('hidden');
    }
  }
};

function ensureMenuPrimaryBeforePersonalizar() {
  if (typeof navStack === 'undefined') return;
  if (navStack.indexOf('menu-primary') === -1) {
    navStack.push('menu-primary');
  }
}

function showScreen(id) {
  if (isNavResumeLocked() && id && id.indexOf('menu-') === 0) return;
  if (id === 'menu-primary')  { showMainMenuPanel(); showMenuLevel('primary');  return; }
  if (id === 'menu-proyecto') { showMainMenuPanel(); showMenuLevel('proyecto'); return; }
  if (id === 'menu-contacto') { showMainMenuPanel(); showMenuLevel('contacto'); return; }
  if (id === 'menu-personalizar') {
    showMainMenuPanel();
    ensureMenuPrimaryBeforePersonalizar();
    showMenuLevel('personalizar');
    return;
  }
  if (id === 'menu-personalizar-v2') {
    var canStyle =
      typeof PlatformRoles !== 'undefined' &&
      typeof VisitorSession !== 'undefined' &&
      PlatformRoles.isAdmin(VisitorSession.getProfile());
    if (!canStyle) {
      showMainMenuPanel();
      showMenuLevel('primary');
      return;
    }
    showMainMenuPanel();
    ensureMenuPrimaryBeforePersonalizar();
    showMenuLevel('personalizar-v2');
    return;
  }
  var el = SCREEN_ELEMENTS[id];
  if (el) document.getElementById(el).classList.add('active');
}
function hideScreenWithHooks(id) {
  if (SCREEN_HOOKS[id] && SCREEN_HOOKS[id].onExit) SCREEN_HOOKS[id].onExit();
  if (id === 'menu-primary' || id === 'menu-proyecto' || id === 'menu-contacto' ||
      id === 'menu-personalizar' || id === 'menu-personalizar-v2') {
    hideMainMenuPanel();
    return;
  }
  var el = SCREEN_ELEMENTS[id];
  if (el) document.getElementById(el).classList.remove('active');
}
function hideScreenVisualOnly(id) {
  if (id === 'menu-primary' || id === 'menu-proyecto' || id === 'menu-contacto' ||
      id === 'menu-personalizar' || id === 'menu-personalizar-v2') {
    hideMainMenuPanel();
    return;
  }
  var el = SCREEN_ELEMENTS[id];
  if (el) document.getElementById(el).classList.remove('active');
}

function syncMenuClosedFromGuard() {
  if (isMainMenuOpen()) return;
  for (var i = navStack.length - 1; i >= 0; i--) {
    if (navStack[i].indexOf('menu-') === 0) navStack.splice(i, 1);
  }
  if (!navStack.length) {
    try { sessionStorage.removeItem(NAV_SESSION_KEY); } catch (e) {}
    unlockBodyScroll();
    resumeCoverVideo();
  }
  clearPreservedOverlay();
  overlayMenuSuppressed = false;
  navTabLeaving = false;
  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.clearEditorSessionState === 'function') {
    VisitorPersonalizePanel.clearEditorSessionState();
  }
  syncNavigationCloseState();
}
window.syncMenuClosedFromGuard = syncMenuClosedFromGuard;

function goTo(screenId, payload) {
  var targetIsMenu = screenId && screenId.indexOf('menu-') === 0;
  if (targetIsMenu && shouldBlockAutoMenuOpen() && !canOpenMenuWithoutGesture()) {
    return;
  }
  if (targetIsMenu && !hasMenuOpenToken()) {
    if (Date.now() - lastNavUserGestureAt < NAV_USER_GESTURE_MS) {
      grantMenuOpenToken(4000);
    } else {
      return;
    }
  }
  grantMenuOpenToken(2000);
  allowProgrammaticNavOpen(1200);
  if (targetIsMenu) {
    clearNavResumeAwaiting();
    clearPreservedOverlay();
    clearNavFreezeState();
    hideNavResumeGate();
  }
  if (screenId === 'menu-personalizar' || screenId === 'menu-personalizar-v2') {
    clearPreservedOverlay();
  }

  var current = navStack[navStack.length - 1];
  var currentIsMenu = current  && current.indexOf('menu-')  === 0;

  if (currentIsMenu && targetIsMenu && (isMainMenuOpen() || canOpenMenuWithoutGesture())) {
    if (screenId === 'menu-personalizar' || screenId === 'menu-personalizar-v2') {
      ensureMenuPrimaryBeforePersonalizar();
    }
    if (!isMainMenuOpen()) showMainMenuPanel();
    showMenuLevel(resolveMenuLevel(screenId));
    if (current !== screenId) navStack.push(screenId);
    syncNavigationCloseState();
    captureLiveNavSnapshot();
    saveNavSession();
    syncMenuActiveStates();
    return;
  }

  if (navStack.length === 0) pauseCoverVideo();

  var isOverlay = OVERLAY_SCREENS[screenId];
  if (current && !isOverlay) {
    if (current === 'descargas' && screenId === 'sphere') {
      hideScreenVisualOnly(current);
    } else {
      hideScreenWithHooks(current);
    }
  }
  if (isOverlayScreenId(screenId)) {
    preservedOverlayId = screenId;
    if (currentIsMenu) overlayMenuSuppressed = true;
  }
  navStack.push(screenId);
  showScreen(screenId);
  if (SCREEN_HOOKS[screenId] && SCREEN_HOOKS[screenId].onEnter) SCREEN_HOOKS[screenId].onEnter(payload);
  lockBodyScroll();
  playSound(targetIsMenu ? 'menuOpen' : 'popupOpen');
  if (hasUserActivation()) vibrate(targetIsMenu ? 7 : 9);
  if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  syncActiveTheme();
  captureLiveNavSnapshot();
  saveNavSession();
  syncMenuActiveStates();
}

function goBack() {
  if (isStyleV3MenuLocked() && !consumeStyleV3MenuCloseAuth()) return;

  var userClose = isGoBackAuthorized();
  if (isTabReturnCooldown() && !userClose) return;
  if (navTabLeaving && !userClose) return;
  if (isNavResumeLocked() && !userClose) return;
  if (isOverlayNavigationLocked() && !userClose) return;
  if (isReturnGuardProtectingOverlay() && !userClose) return;
  if (shouldBlockUnauthorizedGoBack() && !userClose) return;

  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
      VisitorPersonalizePanel.isEditorSessionLocked()) {
    if (typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
        VisitorPersonalizePanel.dismissThemeEditorLayer()) {
      if (typeof VisitorPersonalizePanel.saveEditorSessionState === 'function') {
        VisitorPersonalizePanel.saveEditorSessionState();
      }
      syncNavigationCloseState();
    }
    return;
  }

  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
      VisitorPersonalizePanel.dismissThemeEditorLayer()) {
    syncNavigationCloseState();
    return;
  }

  var current  = navStack.pop();
  var previous = navStack[navStack.length - 1];
  var currentIsMenu  = current  && current.indexOf('menu-')  === 0;
  var previousIsMenu = previous && previous.indexOf('menu-') === 0;

  if (current === 'menu-personalizar' &&
      typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.resetThemeEditorOnLeave === 'function') {
    VisitorPersonalizePanel.resetThemeEditorOnLeave();
  }
  if (current === 'menu-personalizar-v2' &&
      typeof VisitorPersonalizeV2Panel !== 'undefined' &&
      typeof VisitorPersonalizeV2Panel.onLeave === 'function') {
    VisitorPersonalizeV2Panel.onLeave();
  }

  if (currentIsMenu && previousIsMenu) {
    showMenuLevel(resolveMenuLevel(previous));
    syncNavigationCloseState();
    syncActiveTheme();
    syncMenuActiveStates();
    return;
  }

  if (current) hideScreenWithHooks(current);
  if (previous) {
    if (isOverlayScreenId(current) && overlayMenuSuppressed && previousIsMenu && !isGoBackAuthorized()) {
      overlayMenuSuppressed = false;
      unlockBodyScroll();
      resumeCoverVideo();
    } else {
      showScreen(previous);
      if (previous === 'descargas' &&
          typeof DownloadsIntro !== 'undefined' &&
          typeof DownloadsIntro.restoreReady === 'function') {
        DownloadsIntro.restoreReady();
      }
      if (isOverlayScreenId(current)) overlayMenuSuppressed = false;
    }
  } else {
    unlockBodyScroll();
    resumeCoverVideo();
  }
  playSound(currentIsMenu ? 'menuClose' : 'popupClose');
  if (hasUserActivation()) vibrate(6);
  if (typeof GlobalClose !== 'undefined') GlobalClose.update();
  syncActiveTheme();
  if (isGoBackAuthorized()) {
    clearNavFreezeState();
    clearNavResumeAwaiting();
    if (current && isOverlayScreenId(current)) clearPreservedOverlay();
  }
  captureLiveNavSnapshot();
  saveNavSession();
  syncMenuActiveStates();
}

function syncActiveTheme() {
  if (isThemeCustomizationActive()) return;
  if (typeof StyleEngineCompatibility !== 'undefined' &&
      StyleEngineCompatibility.isStyleEngineLive()) {
    if (typeof StyleEngineRuntime !== 'undefined') {
      StyleEngineRuntime.reinforcePublished();
    }
    return;
  }
  if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
    ThemeSystem.reapply();
  }
}

/* ================= TECLA ESCAPE — delegada a GlobalClose (solo escritorio) ================= */

window.isMainMenuOpen = isMainMenuOpen;
window.closeMainMenuIfOpen = closeMainMenuIfOpen;
window.isStyleV3MenuLocked = isStyleV3MenuLocked;
window.authorizeStyleV3MenuClose = authorizeStyleV3MenuClose;
window.syncNavigationCloseState = syncNavigationCloseState;
window.saveNavSession = saveNavSession;
window.captureLiveNavSnapshot = captureLiveNavSnapshot;
window.syncDomToLiveSnapshot = syncDomToLiveSnapshot;
window.beginNavInteractionGrace = beginNavInteractionGrace;
window.isNavInteractionGraceActive = isNavInteractionGraceActive;
window.authorizeGoBack = authorizeGoBack;
window.authorizeGoBackForce = authorizeGoBackForce;
window.isGoBackAuthorized = isGoBackAuthorized;
window.isOverlayNavTop = isOverlayNavTop;
window.enforceNavDomIntegrity = enforceNavDomIntegrity;
window.isNavResumeGateActive = isNavResumeGateActive;
window.isNavResumeLocked = isNavResumeLocked;
window.isHeroIdle = isHeroIdle;
window.__NAV_BUILD__ = NAV_BUILD;
window.__mainTraceSafe('bootNavStateGuard', function () { bootNavStateGuard(); });
window.__mainTraceSafe('bindNavSessionPersistence', function () { bindNavSessionPersistence(); });
/* initNavigation-ish: nav session + watchdogs bound above */

function bindModalBackdropClose(modalId) {
  var el = document.getElementById(modalId);
  if (!el || el.dataset.backdropBound === '1') return;
  el.dataset.backdropBound = '1';

  el.addEventListener('pointerdown', function (e) {
    if (e.target.id !== modalId) return;
    modalBackdropPointers[modalId] = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
  });

  el.addEventListener('pointerup', function (e) {
    if (e.target.id !== modalId) return;
    var start = modalBackdropPointers[modalId];
    delete modalBackdropPointers[modalId];
    if (!start || start.pointerId !== e.pointerId) return;
    if (!e.isTrusted) return;
    if (shouldBlockUnauthorizedGoBack()) return;
    if (isTabReturnCooldown()) return;
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) return;
    if (Date.now() - start.time > 900) return;
    authorizeGoBack();
    goBack();
  });

  el.addEventListener('pointercancel', function () {
    delete modalBackdropPointers[modalId];
  });
}

function ensurePopupBoxScrollWrappers() {
  /* Si el video ya quedó envuelto por una versión anterior, deshacerlo */
  var videoBox = document.querySelector('#videoModal .video-modal-box');
  if (videoBox && videoBox.firstElementChild && videoBox.firstElementChild.classList.contains('popup-box-scroll')) {
    var wrapped = videoBox.firstElementChild;
    while (wrapped.firstChild) videoBox.appendChild(wrapped.firstChild);
    wrapped.remove();
  }

  document.querySelectorAll('.units-popup-box, .content-modal-box:not(.auth-experience-box):not(.video-modal-box)').forEach(function (box) {
    if (box.firstElementChild && box.firstElementChild.classList.contains('popup-box-scroll')) return;
    var scroll = document.createElement('div');
    scroll.className = 'popup-box-scroll';
    while (box.firstChild) scroll.appendChild(box.firstChild);
    box.appendChild(scroll);
  });
}
window.__mainTraceSafe('ensurePopupBoxScrollWrappers', function () { ensurePopupBoxScrollWrappers(); });

/* ================= ENTRADA DESDE LA PORTADA ================= */
window.__mainTraceSafe('bind heroStartBtn', function () {
  document.getElementById('heroStartBtn').addEventListener('click', function(){ goTo('sphere'); });
});

/* ================= CIERRES — botón global; backdrops siguen activos ================= */
window.__mainTraceSafe('bind mainMenuBackdrop', function () {
  document.getElementById('mainMenuBackdrop').addEventListener('click', function () {
    if (isPersonalizarPanelActive()) return;
    if (isStyleV3MenuLocked()) return;
    guardedGoBack();
  });
});
var menuNavBackEl = document.getElementById('menuNavBack');
if (menuNavBackEl) {
  menuNavBackEl.addEventListener('click', function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isStyleV3MenuLocked()) return;
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
        VisitorPersonalizePanel.dismissThemeEditorLayer()) {
      syncNavigationCloseState();
      return;
    }
    /* Gestura explícita: no debe quedar bloqueada por return-guard / tab-blur */
    authorizeGoBackForce();
    goBack();
  });
}
[
  'unitsPopup',
  'tour360Popup',
  'pdfModal',
  'videoModal',
  'rendersModal',
  'locationModal',
  'calculatorModal',
  'descripcionModal',
  'amenidadesModal',
  'estadoModal',
  'constructoraModal',
  'descargasModal'
].forEach(bindModalBackdropClose);
window.__mainTrace('bindModalBackdropClose — all modals');

/* ================= ITEMS DEL MENÚ PRINCIPAL ================= */
function bindMenuItemNavigation() {
  function resolveTarget(target) {
    if (typeof MenuConfig !== 'undefined' && MenuConfig.resolveTarget) {
      return MenuConfig.resolveTarget(target);
    }
    return target === 'proximamente' ? 'sphere' : target;
  }

  function onPrimaryClick(ev) {
    var el = ev.currentTarget;
    if (!el || el.hidden || el.classList.contains('is-menu-hidden')) return;
    var action = el.getAttribute('data-menu-action') || 'section';
    var target = resolveTarget(el.getAttribute('data-menu-target') || '');
    if (action === 'proximamente') {
      goTo('sphere');
      return;
    }
    if (action === 'submenu') {
      goTo(target || 'menu-proyecto');
      return;
    }
    if (target) goTo(target);
  }

  function wirePrimary(el) {
    if (!el || el.__menuNavBound) return;
    el.__menuNavBound = true;
    el.addEventListener('click', onPrimaryClick);
  }

  ['menuConoce', 'menuTour360', 'menuViviendas', 'menuUbicacion', 'menuContacto'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!el.getAttribute('data-menu-action')) {
      var defaults = {
        menuConoce: { action: 'submenu', target: 'menu-proyecto' },
        menuTour360: { action: 'section', target: 'tour360' },
        menuViviendas: { action: 'section', target: 'tipologias' },
        menuUbicacion: { action: 'section', target: 'location' },
        menuContacto: { action: 'submenu', target: 'menu-contacto' }
      };
      var d = defaults[id];
      if (d) {
        el.setAttribute('data-menu-action', d.action);
        el.setAttribute('data-menu-target', d.target);
      }
    }
    wirePrimary(el);
  });

  var primary = document.getElementById('mainMenuListPrimary');
  if (primary && !primary.__menuCustomObserver) {
    primary.__menuCustomObserver = true;
    primary.addEventListener('click', function (ev) {
      var custom = ev.target && ev.target.closest
        ? ev.target.closest('[data-menu-custom="1"]')
        : null;
      if (!custom) return;
      onPrimaryClick({ currentTarget: custom });
    });
  }

  function onChildClick(ev) {
    var el = ev.currentTarget;
    if (!el || el.hidden || el.classList.contains('is-menu-hidden')) return;
    /* IDs canónicos ganan sobre data-menu-target (evita Descripción → Video por config errónea) */
    var map = {
      menuDescripcion: 'descripcion',
      menuVideo: 'video',
      menuRenders: 'renders',
      menuAmenidades: 'amenidades',
      menuEstado: 'estado',
      menuConstructora: 'constructora',
      menuDescargas: 'descargas'
    };
    var raw = map[el.id] || el.getAttribute('data-menu-target') || '';
    var target = resolveTarget(raw || 'descripcion');
    if (el.id === 'menuDescripcion') target = 'descripcion';
    if (el.id === 'menuVideo') target = 'video';
    goTo(target);
  }

  ['menuDescripcion', 'menuVideo', 'menuRenders', 'menuAmenidades', 'menuEstado', 'menuConstructora', 'menuDescargas'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || el.__menuNavBound) return;
    el.__menuNavBound = true;
    var fallback = {
      menuDescripcion: 'descripcion',
      menuVideo: 'video',
      menuRenders: 'renders',
      menuAmenidades: 'amenidades',
      menuEstado: 'estado',
      menuConstructora: 'constructora',
      menuDescargas: 'descargas'
    };
    /* Siempre anclar targets canónicos (no depender de menu_config corrupto) */
    el.setAttribute('data-menu-target', fallback[id]);
    el.addEventListener('click', onChildClick);
  });

  var proyectoList = document.getElementById('mainMenuListProyecto');
  if (proyectoList && !proyectoList.__menuChildCustomBound) {
    proyectoList.__menuChildCustomBound = true;
    proyectoList.addEventListener('click', function (ev) {
      var custom = ev.target && ev.target.closest
        ? ev.target.closest('[data-menu-child-custom="1"]')
        : null;
      if (!custom) return;
      onChildClick({ currentTarget: custom });
    });
  }
}

bindMenuItemNavigation();
window.__mainTrace('bindMenuItemNavigation / initUI menu');
window.bindMenuItemNavigation = bindMenuItemNavigation;

/* ================= CALCULADORA DE CUOTA (MEJORADA) ================= */
var currentCalcUnit = null;

function computeCalculator() {
  if (!currentCalcUnit) return;
  var price       = currentCalcUnit.price;
  var downPct     = parseFloat(document.getElementById('calcDownPct').value) / 100;
  var years       = parseFloat(document.getElementById('calcYears').value);
  var annualRate  = parseFloat(document.getElementById('calcRate').value) / 100;
  var downPayment = price * downPct;
  var credit      = price - downPayment;
  var monthlyRate = annualRate / 12;
  var n = years * 12;
  var monthlyPayment = monthlyRate === 0
    ? credit / n
    : credit * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  /* Ingreso recomendado: cuota ≤ 30% del ingreso */
  var recommendedIncome = monthlyPayment / 0.30;

  document.getElementById('calcDownValue').textContent    = formatCOP(downPayment);
  document.getElementById('calcCreditValue').textContent  = formatCOP(credit);
  document.getElementById('calcMonthlyValue').textContent = formatCOP(monthlyPayment) + '/mes';
  document.getElementById('calcIncomeValue').textContent  = formatCOP(recommendedIncome) + '/mes';

  /* Actualizar CTA de WhatsApp con datos actuales */
  var msg = 'Me interesa el ' + currentCalcUnit.name + '. '
    + 'Cuota inicial: ' + formatCOP(downPayment) + '. '
    + 'Crédito: ' + formatCOP(credit) + '. '
    + 'Cuota estimada: ' + formatCOP(monthlyPayment) + '/mes. '
    + 'Quisiera más información.';
  document.getElementById('calcWhatsappCta').href = WHATSAPP_BASE + encodeURIComponent(msg);
}

function setupCalculator(key) {
  currentCalcUnit = UNITS[key];
  if (!currentCalcUnit) return;
  document.getElementById('calcModalTitle').textContent    = 'Calculadora — ' + currentCalcUnit.name;
  document.getElementById('calcPropertyValue').textContent = formatCOP(currentCalcUnit.price);
  document.getElementById('calcDownPct').value = '20';
  document.getElementById('calcYears').value   = '20';
  document.getElementById('calcRate').value    = CONFIG.calcRate || '11.5';
  computeCalculator();
  if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
    GlobalClose.update();
  }
}

window.__mainTraceSafe('bind calculator inputs', function () {
  document.getElementById('calcDownPct').addEventListener('change', computeCalculator);
  document.getElementById('calcYears').addEventListener('change', computeCalculator);
  document.getElementById('calcRate').addEventListener('change', computeCalculator);
});

/* ================= ESTADO DEL PROYECTO — BARRAS DE PROGRESO ================= */

/* Clase de jerarquía visual sutil según el estado (misma paleta, solo opacidad) */
function statusClass(status) {
  if (status === 'Completada')   return 'status-completada';
  if (status === 'Próximamente') return 'status-proximamente';
  return 'status-ejecucion';
}

/* Avance general = promedio simple de las etapas */
function computeOverallProgress() {
  if (!PROJECT_STAGES.length) return 0;
  var total = PROJECT_STAGES.reduce(function(sum, s){ return sum + s.pct; }, 0);
  return Math.round(total / PROJECT_STAGES.length);
}

function buildProgressList() {
  var list = document.getElementById('progressList');
  list.innerHTML = '';
  PROJECT_STAGES.forEach(function(stage, i) {
    var item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML =
      '<div class="progress-header">' +
        '<span class="progress-label">' + stage.label + '</span>' +
        '<span class="progress-pct">' + stage.pct + '%</span>' +
      '</div>' +
      '<div class="progress-track">' +
        '<div class="progress-fill" id="pfill-' + i + '" style="width:0%"></div>' +
      '</div>' +
      '<div class="progress-status ' + statusClass(stage.status) + '">' + stage.status + '</div>';
    list.appendChild(item);
  });
  /* Fecha estimada de entrega */
  if (PROJECT_DELIVERY) {
    var delivery = document.createElement('div');
    delivery.className = 'progress-delivery';
    delivery.innerHTML =
      '<span class="progress-delivery-label">Entrega estimada</span>' +
      '<span class="progress-delivery-value">' + PROJECT_DELIVERY + '</span>';
    list.appendChild(delivery);
  }

  /* Nota de última actualización */
  if (PROJECT_LAST_UPDATE) {
    document.getElementById('progressUpdatedNote').textContent =
      'Información suministrada por la constructora. Última actualización: ' + PROJECT_LAST_UPDATE;
  } else {
    document.getElementById('progressUpdatedNote').textContent =
      'Información suministrada por la constructora.';
  }

  /* Porcentaje general (valor final, se anima aparte) */
  document.getElementById('progressOverallPct').textContent = PROJECT_STAGES.length ? computeOverallProgress() + '%' : '0%';
}

function animateProgressBars() {
  var overallFill = document.getElementById('progressOverallFill');
  if (overallFill) {
    overallFill.style.width = '0%';
    setTimeout(function(){ overallFill.style.width = computeOverallProgress() + '%'; }, 60);
  }
  PROJECT_STAGES.forEach(function(stage, i) {
    var fill = document.getElementById('pfill-' + i);
    if (!fill) return;
    fill.style.width = '0%';
    /* Escalonar la animación por índice */
    setTimeout(function() {
      fill.style.width = stage.pct + '%';
    }, 80 + i * 120);
  });
}

/* ================= MODAL PLANOS Y PRECIO ================= */
function setupPlans(key) {
  var u = UNITS[key];
  if (!u) return;
  var scrollBox = document.getElementById('galleryScroll');
  scrollBox.innerHTML = '';

  var priceSlide = document.createElement('div');
  priceSlide.className = 'plan-price-slide';
  var waMsg = encodeURIComponent('Me interesa el ' + u.name + ' del proyecto. Quisiera más información.');
  priceSlide.innerHTML =
    '<div class="plan-price-label">Precio</div>' +
    '<div class="plan-price-value">' + formatCOP(u.price) + '</div>' +
    '<a class="outline-btn" href="' + WHATSAPP_BASE + waMsg + '" target="_blank" rel="noopener">Solicitar propuesta</a>';
  scrollBox.appendChild(priceSlide);

  function isImagePlan(plan) {
    var ext = String((plan && plan.extension) || '').toLowerCase();
    var url = String((plan && plan.url) || '').toLowerCase();
    if (/^(png|jpe?g|webp|gif|bmp|svg)$/.test(ext)) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
  }

  function isPdfPlan(plan) {
    var ext = String((plan && plan.extension) || '').toLowerCase();
    var url = String((plan && plan.url) || '').toLowerCase();
    if (ext === 'pdf') return true;
    return /\.pdf(\?|$)/i.test(url);
  }

  (u.plans || []).forEach(function (plan) {
    if (!plan || !plan.url) return;
    var slide = document.createElement('div');
    slide.className = 'plan-slide plan-slide--media';
    var label = typeof plan === 'string' ? plan : (plan.label || 'Plano');
    if (isImagePlan(plan)) {
      slide.innerHTML =
        '<img class="plan-slide-media" src="' + escapeUnitsHtml(plan.url) + '" alt="' + escapeUnitsHtml(label) + '">';
    } else if (isPdfPlan(plan)) {
      slide.innerHTML =
        '<iframe class="plan-slide-media" src="' + escapeUnitsHtml(plan.url) +
        '#toolbar=0&navpanes=0" title="' + escapeUnitsHtml(label) + '"></iframe>';
    } else {
      slide.innerHTML =
        '<a class="plan-slide-link" href="' + escapeUnitsHtml(plan.url) +
        '" target="_blank" rel="noopener"><span>' + escapeUnitsHtml(label) + '</span></a>';
    }
    scrollBox.appendChild(slide);
  });

  scrollBox.scrollTop = 0;
  scrollBox.scrollLeft = 0;
}
document.getElementById('pdfModal').addEventListener('touchmove', function(e){
  if (!e.target.closest('#galleryScroll')) e.preventDefault();
}, { passive: false });

/* ================= GALERÍA DE RENDERS (cards estilo Ver 360) ================= */
var GALLERY = {
  exterior: { name: 'Exterior', caption: 'Fachada principal' },
  interior: { name: 'Interior', caption: 'Espacios sociales' },
  lobby: { name: 'Lobby', caption: 'Acceso principal' },
  amenidades: { name: 'Amenidades', caption: 'Zonas comunes' },
  terraza: { name: 'Terraza', caption: 'Vista panorámica' },
  cocina: { name: 'Cocina', caption: 'Acabados premium' },
  habitacion: { name: 'Habitación', caption: 'Suite principal' },
  banos: { name: 'Baños', caption: 'Detalle y material' },
  nocturna: { name: 'Nocturna', caption: 'Iluminación' }
};

var galleryKeys = Object.keys(GALLERY);
var lightboxTrack = document.getElementById('lightboxTrack');
var lightboxIndex = 0;
var lightboxOpen = false;

function getGalleryCount() {
  return galleryKeys.length;
}

function renderGaleriaGrid() {
  var rendersGrid = document.getElementById('rendersGrid');
  if (!rendersGrid) return;
  rendersGrid.innerHTML = '';
  if (lightboxTrack) lightboxTrack.innerHTML = '';
  galleryKeys = Object.keys(GALLERY);

  galleryKeys.forEach(function (key, index) {
    var item = GALLERY[key];
    var openItem = function () {
      openLightbox(index);
    };

    var card = document.createElement('article');
    card.className = 'tour360-card';
    card.setAttribute('data-gallery', key);

    var media = document.createElement('div');
    media.className = 'tour360-card-media';
    if (item.imageUrl) {
      var img = document.createElement('img');
      img.src = item.imageUrl;
      img.alt = item.name || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    }

    var footer = document.createElement('div');
    footer.className = 'tour360-card-footer';

    var nameEl = document.createElement('p');
    nameEl.className = 'tour360-card-name';
    nameEl.textContent = item.name || '';
    footer.appendChild(nameEl);

    if (item.caption) {
      var captionEl = document.createElement('p');
      captionEl.className = 'tour360-card-area';
      captionEl.textContent = item.caption;
      footer.appendChild(captionEl);
    }

    var enterBtn = document.createElement('button');
    enterBtn.type = 'button';
    enterBtn.className = 'tour360-card-enter';
    enterBtn.textContent = 'Ver más';
    enterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openItem();
    });

    footer.appendChild(enterBtn);
    media.appendChild(footer);
    card.appendChild(media);

    card.addEventListener('click', function (e) {
      if (e.target.closest('.tour360-card-enter')) return;
      openItem();
    });

    rendersGrid.appendChild(card);

    if (lightboxTrack) {
      var slide = document.createElement('div');
      slide.className = 'lightbox-slide';
      if (item.imageUrl) {
        slide.innerHTML = '<div class="lightbox-slide-inner"><img src="' + item.imageUrl + '" alt="' + (item.name || '') + '"></div>';
      } else {
        slide.innerHTML = '<div class="lightbox-slide-inner"><span>' + (item.name || ('Render ' + (index + 1))) + '</span></div>';
      }
      lightboxTrack.appendChild(slide);
    }
  });

  playGaleriaCardsEntrance();
}
renderGaleriaGrid();

/* ================= LIGHTBOX DE RENDERS (swipe) ================= */
function updateLightboxPosition(animate) {
  if (!lightboxTrack) return;
  var count = getGalleryCount() || 1;
  lightboxTrack.style.transition = animate ? 'transform 0.3s cubic-bezier(.22,1,.36,1)' : 'none';
  lightboxTrack.style.transform = 'translateX(-' + (lightboxIndex * 100) + '%)';
  var counter = document.getElementById('lightboxCounter');
  if (counter) counter.textContent = (lightboxIndex + 1) + ' / ' + count;
}
function openLightbox(index) {
  lightboxIndex = index;
  updateLightboxPosition(false);
  document.getElementById('rendersLightbox').classList.add('active');
  lightboxOpen = true;
  pauseCoverVideo();
  lockBodyScroll();
  if (typeof GlobalClose !== 'undefined') GlobalClose.update();
}
function closeLightbox() {
  document.getElementById('rendersLightbox').classList.remove('active');
  lightboxOpen = false;
  unlockBodyScroll();
  if (typeof GlobalClose !== 'undefined') GlobalClose.update();
}
function lightboxNext() {
  if (lightboxIndex < getGalleryCount() - 1) { lightboxIndex++; updateLightboxPosition(true); }
}
function lightboxPrev() {
  if (lightboxIndex > 0) { lightboxIndex--; updateLightboxPosition(true); }
}
window.__mainTraceSafe('bind lightbox controls', function () {
  document.getElementById('lightboxNext').addEventListener('click', lightboxNext);
  document.getElementById('lightboxPrev').addEventListener('click', lightboxPrev);

  /* ---- swipe táctil ---- */
  var touchStartX = 0, touchDeltaX = 0, touchActive = false;
  var lightboxEl = document.getElementById('rendersLightbox');
  lightboxEl.addEventListener('touchstart', function(e){
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
    lightboxTrack.style.transition = 'none';
  }, { passive: true });
  lightboxEl.addEventListener('touchmove', function(e){
    if (!touchActive) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
    var basePct = -(lightboxIndex * 100);
    var dragPct = (touchDeltaX / window.innerWidth) * 100;
    lightboxTrack.style.transform = 'translateX(' + (basePct + dragPct) + '%)';
  }, { passive: true });
  lightboxEl.addEventListener('touchend', function(){
    if (!touchActive) return;
    touchActive = false;
    var threshold = window.innerWidth * 0.18;
    if      (touchDeltaX < -threshold) lightboxNext();
    else if (touchDeltaX >  threshold) lightboxPrev();
    else updateLightboxPosition(true);
  });
});

/* =========================================================
   COMPARTIR VIVIENDA — resaltar y desplazar a la tarjeta
   correspondiente dentro de la ficha, con una transición
   sutil (fade + slide, ~200ms), sin abrir planos ni 360°.
   ========================================================= */
function highlightSharedUnit(key) {
  var card = unitsGrid.querySelector('[data-unit="' + key + '"]');
  if (!card) return;
  card.scrollIntoView({ block: 'center' });
  card.classList.add('shared-unit-enter');
  setTimeout(function () { card.classList.remove('shared-unit-enter'); }, 260);
}

/* =========================================================
   DEEP LINK — abre directamente la ficha completa de una
   vivienda compartida (?vivienda=tipoA), respetando la misma
   vista (tipologías) que el usuario vería navegando, y
   conservando la posición visual de su tarjeta.
   ========================================================= */
function initDeepLink() {
  window.__mainTrace('initDeepLink — start');
  try {
    var params = new URLSearchParams(window.location.search);
    var unitKey = params.get('vivienda');
    if (unitKey && UNITS[unitKey]) {
      goTo('tipologias');
      setTimeout(function () { highlightSharedUnit(unitKey); }, 260);
      window.__mainTrace('initDeepLink — opened unit', unitKey);
    } else {
      window.__mainTrace('initDeepLink — early return', unitKey ? 'unit missing' : 'sin vivienda');
    }
  } catch (e) {
    window.__mainTraceError('initDeepLink', e);
  }
}

window.initProjectUI = function () {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/main.js :: initProjectUI');}catch(_bd){}
  try {

  window.__mainTrace('initProjectUI / initUI — start (load/applyProjectData deben haber corrido en project-data.js)');
  if (typeof BootDebug !== 'undefined') BootDebug.log('initProjectUI start');
  try {
    window.__mainTrace('initProjectUI · applyConfig');
    applyConfig();
    window.__mainTrace('initProjectUI · renderUnitsGrid');
    renderUnitsGrid('all');
    window.__mainTrace('initProjectUI · updateFavoritesTabCount');
    updateFavoritesTabCount();
    window.__mainTrace('initProjectUI · renderDownloadsList');
    renderDownloadsList();
    window.__mainTrace('initProjectUI · buildProgressList');
    buildProgressList();
    window.__mainTrace('initProjectUI · initDeepLink');
    initDeepLink();
    if (typeof VisitorMenu !== 'undefined') {
      window.__mainTrace('initProjectUI · VisitorMenu.refreshProfile');
      VisitorMenu.refreshProfile();
    } else {
      window.__mainTrace('initProjectUI · VisitorMenu ausente');
    }
    window.__mainTrace('initProjectUI / initUI — done');
    if (typeof BootDebug !== 'undefined') BootDebug.log('initProjectUI done');
  } catch (e) {
    window.__mainTraceError('initProjectUI', e);
    if (typeof BootDebug !== 'undefined') BootDebug.error('initProjectUI', e);
    else console.error(e);
  }

  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/main.js :: initProjectUI');}catch(_bd){}
  }
};

window.onVisitorFavoritesChanged = function () {
  updateFavoritesTabCount();
  if (unitsViewMode === 'compare') {
    var keys = resolveCompareKeys();
    if (!keys) renderCompareEmpty();
    else renderUnitsCompare(keys);
  } else if (currentUnitsTab === 'fav') {
    renderUnitsGrid('fav');
  }
  document.querySelectorAll('.fav-btn[data-fav]').forEach(function (el) {
    syncFavButtonEl(el, isFavorite(el.getAttribute('data-fav')));
  });
};

if (typeof BootDebug !== 'undefined') BootDebug.log('main.js evaluating — done');
window.__mainTrace('main.js evaluating — done (sin project-data/auth bootstrap en este build)');
window.__mainTrace('nota', 'loadProjectData/applyProjectData/showHome viven en project-data.js — aún no cargado');

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/main.js');}catch(_e){}
