/* =========================================================
   PROJECT DATA — populated from Supabase via project-data.js
   CONFIG, TYPOLOGIES, UNITS, DOWNLOADS, PROJECT_STAGES
   ========================================================= */
var CONFIG = {};
var TYPOLOGIES = [];
var UNITS = {};
var DOWNLOADS = [];
var PROJECT_STAGES = [];
var PROJECT_DELIVERY = '';
var PROJECT_LAST_UPDATE = '';

var WHATSAPP_BASE = '';

function applyConfig() {
  if (!CONFIG.projectName) return;
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
    : '#';
  document.getElementById('whatsappFloat').href = WHATSAPP_BASE + encodeURIComponent(CONFIG.whatsappDefaultMessage || '');
  document.getElementById('contactWhatsapp').href = WHATSAPP_BASE + encodeURIComponent(CONFIG.whatsappDefaultMessage || '');
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
  toastTimer = setTimeout(function () {
    toastEl.classList.remove('show');
  }, duration || 1000);
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

var soundsToggleEl = document.getElementById('soundsToggle');
function renderSoundsToggle() {
  if (!soundsToggleEl) return;
  soundsToggleEl.classList.toggle('on', !!soundsEnabled);
}
if (soundsToggleEl) {
  soundsToggleEl.addEventListener('click', function(){
    soundsEnabled = !soundsEnabled;
    writeJSON(SOUND_STORAGE_KEY, soundsEnabled);
    renderSoundsToggle();
    var alt = document.getElementById('personalizeSoundsToggle');
    if (alt) alt.classList.toggle('on', soundsEnabled);
  });
  renderSoundsToggle();
}

/* Sistema de sonidos: la lógica está lista, los archivos de
   audio se cargarán más adelante (ver SOUND_FILES). Mientras no
   haya archivo cargado para un evento, playSound() no hace nada. */
var SOUND_FILES = {
  // buttonTap:   new Audio('sounds/tap.mp3'),
  // menuOpen:    new Audio('sounds/menu-open.mp3'),
  // menuClose:   new Audio('sounds/menu-close.mp3'),
  // popupOpen:   new Audio('sounds/popup-open.mp3'),
  // popupClose:  new Audio('sounds/popup-close.mp3'),
  // tour360Enter: new Audio('sounds/tour360.mp3')
};
function playSound(eventName) {
  if (!soundsEnabled) return;
  var audio = SOUND_FILES[eventName];
  if (!audio) return;
  try { audio.currentTime = 0; audio.play().catch(function(){}); } catch (e) {}
}

/* ================= VIDEO DE FONDO ================= */
var coverVideo = document.getElementById('coverVideo');
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
    area: 72,
    color: '#3a4654',
    link360: 'https://app.lapentor.com/sphere/la-gauche'
  },
  apto2: {
    name: 'Apto 2',
    area: 85,
    color: '#4a4038',
    link360: 'https://app.lapentor.com/sphere/makapiacceso-plazoleta'
  },
  apto3: {
    name: 'Apto 3',
    area: 68,
    color: '#3a4540',
    link360: 'https://app.lapentor.com/sphere/la-gauche'
  },
  parqueadero: {
    name: 'Parqueadero',
    area: 12,
    color: '#2f3338',
    link360: 'https://app.lapentor.com/sphere/makapiacceso-plazoleta'
  },
  lobby: {
    name: 'Lobby',
    area: 180,
    color: '#454040',
    link360: 'https://app.lapentor.com/sphere/la-gauche'
  },
  zonaSocial: {
    name: 'Zona social',
    area: 240,
    color: '#3d3a48',
    link360: 'https://app.lapentor.com/sphere/makapiacceso-plazoleta'
  },
  terraza: {
    name: 'Terraza',
    area: 95,
    color: '#404838',
    link360: 'https://app.lapentor.com/sphere/la-gauche'
  },
  amenidades: {
    name: 'Amenidades',
    area: 320,
    color: '#384048',
    link360: 'https://app.lapentor.com/sphere/makapiacceso-plazoleta'
  },
  modelo: {
    name: 'Modelo amoblado',
    area: 78,
    color: '#483840',
    link360: 'https://app.lapentor.com/sphere/la-gauche'
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
    el.classList.toggle('active', nowFav);
    el.textContent = nowFav ? '❤' : '♡';
    el.setAttribute('aria-label', nowFav ? 'Quitar de favoritos' : 'Agregar a favoritos');
    el.classList.add('pulse');
    setTimeout(function () { el.classList.remove('pulse'); }, 220);
  });
  updateFavoritesTabCount();
  if (currentUnitsTab === 'fav') renderUnitsGrid('fav');
  showToast(nowFav ? 'Agregado a favoritos' : 'Quitado de favoritos');
  return nowFav;
}
function updateFavoritesTabCount() {
  var favTabBtn = document.getElementById('unitsTabFav');
  if (favTabBtn) favTabBtn.textContent = 'Favoritos (' + getFavorites().length + ')';
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
  var url = window.location.href.split('?')[0].split('#')[0];
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
document.getElementById('shareProjectFloatBtn').addEventListener('click', function(){ shareProject(); });

/* ================= RENDER DE TARJETAS DE UNIDADES ================= */
var unitsGrid = document.getElementById('unitsGrid');
var unitsComparePanel = document.getElementById('unitsComparePanel');
var favoritesEmptyEl = document.getElementById('favoritesEmpty');
var currentUnitsTab = 'all';
var unitsViewMode = 'browse';

var UNITS_COMPARE_METRICS = [
  { key: 'unitType', label: 'Tipo de vivienda' },
  { key: 'rooms', label: 'Habitaciones' },
  {
    key: 'areaPerRoom',
    label: 'm² por habitación',
    compute: function (u) {
      if (!u.rooms) return '—';
      return (Math.round((u.area / u.rooms) * 10) / 10) + ' m²';
    }
  },
  { key: 'baths', label: 'Baños' },
  { key: 'privateBaths', label: 'Baños privados' },
  { key: 'parking', label: 'Parqueaderos' },
  { key: 'floor', label: 'Piso' },
  { key: 'tower', label: 'Torre' },
  {
    key: 'area',
    label: 'Área total',
    compute: function (u) { return u.area ? u.area + ' m²' : '—'; }
  },
  {
    key: 'price',
    label: 'Precio',
    compute: function (u) { return u.price ? formatCOP(u.price) : '—'; }
  },
  {
    key: 'adminFee',
    label: 'Administración',
    compute: function (u) { return u.adminFee ? formatCOP(u.adminFee) : '—'; }
  }
];

function escapeUnitsHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getUnitCompareMetricValue(unit, metric) {
  if (metric.compute) return metric.compute(unit);
  var value = unit[metric.key];
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function setUnitsViewMode(mode) {
  unitsViewMode = mode === 'compare' ? 'compare' : 'browse';
  var popup = document.getElementById('unitsPopup');
  var compareBtn = document.getElementById('unitsCompareBtn');
  var footTitle = document.getElementById('unitsViviendasFootTitle');
  var footSubtitle = document.getElementById('unitsViviendasFootSubtitle');
  if (popup) popup.classList.toggle('is-compare-mode', unitsViewMode === 'compare');
  if (compareBtn) compareBtn.classList.toggle('active', unitsViewMode === 'compare');
  if (footTitle) {
    footTitle.textContent = unitsViewMode === 'compare'
      ? 'Comparador de favoritos'
      : 'Selecciona tu vivienda';
  }
  if (footSubtitle) {
    footSubtitle.textContent = unitsViewMode === 'compare'
      ? 'Revisa las diferencias entre tus viviendas guardadas.'
      : 'Explora planos, precios y calcula tu cuota.';
  }
}

function exitUnitsCompareMode() {
  if (unitsViewMode !== 'compare') return;
  setUnitsViewMode('browse');
  renderUnitsGrid(currentUnitsTab);
}

function openUnitsCompare() {
  if (unitsViewMode === 'compare') {
    exitUnitsCompareMode();
    return;
  }
  if (typeof VisitorSession !== 'undefined' && !VisitorSession.isAuthenticated()) {
    showToast('Inicia sesión para comparar viviendas');
    if (typeof VisitorAuthModal !== 'undefined') VisitorAuthModal.open('gate');
    return;
  }
  var favKeys = getFavorites().filter(function (key) { return !!UNITS[key]; });
  if (favKeys.length < 2) {
    showToast('Agrega al menos 2 favoritos para comparar');
    activateUnitsTab('fav');
    return;
  }
  setUnitsViewMode('compare');
  renderUnitsCompare(favKeys);
}

function renderUnitsCompare(favKeys) {
  if (!unitsComparePanel || !unitsGrid) return;
  favKeys = favKeys || getFavorites().filter(function (key) { return !!UNITS[key]; });
  if (favKeys.length < 2) {
    exitUnitsCompareMode();
    return;
  }

  var units = favKeys.map(function (key) { return UNITS[key]; });
  var miniCardsHtml = units.map(function (u) {
    return (
      '<article class="units-compare-mini-card">' +
        '<p class="units-compare-mini-tag">' + escapeUnitsHtml(u.tag || '—') + '</p>' +
        '<p class="units-compare-mini-name">' + escapeUnitsHtml(u.name || '—') + '</p>' +
        '<p class="units-compare-mini-price">' + escapeUnitsHtml(u.price ? formatCOP(u.price) : '—') + '</p>' +
        '<p class="units-compare-mini-specs">' + escapeUnitsHtml(u.area + ' m² · ' + u.rooms + ' hab · ' + u.baths + ' ba') + '</p>' +
      '</article>'
    );
  }).join('');

  var tableHead = '<tr><th scope="col">Característica</th>' +
    units.map(function (u) {
      return '<th scope="col">' + escapeUnitsHtml(u.tag || u.name || '—') + '</th>';
    }).join('') + '</tr>';

  var tableBody = UNITS_COMPARE_METRICS.map(function (metric) {
    var values = units.map(function (u) { return getUnitCompareMetricValue(u, metric); });
    var hasDiff = values.some(function (value) { return value !== values[0]; });
    return (
      '<tr class="' + (hasDiff ? 'is-diff-row' : '') + '">' +
        '<th scope="row">' + escapeUnitsHtml(metric.label) + '</th>' +
        values.map(function (value) {
          return '<td class="' + (hasDiff ? 'is-diff' : '') + '">' + escapeUnitsHtml(value) + '</td>';
        }).join('') +
      '</tr>'
    );
  }).join('');

  unitsComparePanel.innerHTML =
    '<div class="units-compare-mini-grid">' +
      '<div class="units-compare-mini-spacer" aria-hidden="true"></div>' +
      miniCardsHtml +
    '</div>' +
    '<div class="units-compare-box">' +
      '<table class="units-compare-table">' +
        '<colgroup>' +
          '<col class="units-compare-col-label">' +
          '<col class="units-compare-col-data">' +
          '<col class="units-compare-col-data">' +
          '<col class="units-compare-col-data">' +
        '</colgroup>' +
        '<thead>' + tableHead + '</thead>' +
        '<tbody>' + tableBody + '</tbody>' +
      '</table>' +
    '</div>';

  unitsGrid.style.display = 'none';
  favoritesEmptyEl.style.display = 'none';
  unitsComparePanel.hidden = false;
}

function buildUnitCard(key) {
  var u = UNITS[key];
  if (!u) return document.createElement('div');
  var card = document.createElement('div');
  card.className = 'unit-card';
  card.setAttribute('data-unit', key);
  var badgeHtml = u.availability ? '<div class="availability-badge">' + u.availability + '</div>' : '';
  var imageStyle = u.cardImageUrl ? ' style="background-image:url(' + u.cardImageUrl + ');background-size:cover;background-position:center;"' : '';
  var favActive = isFavorite(key);
  card.innerHTML =
    '<div class="unit-card-image"' + imageStyle + '>' + badgeHtml +
      '<div class="unit-card-icons">' +
        '<button class="icon-btn fav-btn' + (favActive ? ' active' : '') + '" type="button" data-fav="' + key + '" aria-label="' + (favActive ? 'Quitar de favoritos' : 'Agregar a favoritos') + '">' + (favActive ? '❤' : '♡') + '</button>' +
        '<button class="icon-btn share-btn" type="button" data-share="' + key + '" aria-label="Compartir vivienda"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg></button>' +
      '</div>' +
      (u.cardImageUrl ? '' : '<span>' + u.cardLabel + '</span>') + '</div>' +
    '<div class="unit-typo-info">' +
      '<div class="unit-typo-tag">' + u.tag + '</div>' +
      '<div class="unit-typo-title">' + u.name + '</div>' +
      '<div class="unit-typo-specs">' +
        '<span>' + u.area + ' m²</span>' +
        '<span>' + u.rooms + ' habitaciones</span>' +
        '<span>' + u.baths + ' baños</span>' +
      '</div>' +
      '<div class="unit-typo-divider"></div>' +
      '<div class="unit-typo-price-label">Precio</div>' +
      '<div class="unit-typo-price-value">' + formatCOP(u.price) + '</div>' +
      '<div class="unit-typo-btn-stack">' +
        '<div class="unit-typo-btn-row">' +
          '<button class="unit-typo-btn emphasis" type="button" data-action="calc">Calcular cuota</button>' +
        '</div>' +
        '<div class="unit-typo-btn-row">' +
          '<button class="unit-typo-btn" type="button" data-action="plans">Ver planos</button>' +
          '<button class="unit-typo-btn" type="button" data-action="tour360">Ver 360°</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  card.querySelector('[data-action="tour360"]').addEventListener('click', function(e){
    e.stopPropagation();
    if (u.link360) goTo('sphere', u.link360);
  });
  card.querySelector('[data-action="plans"]').addEventListener('click', function(e){
    e.stopPropagation(); goTo('plans', key);
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
  return card;
}

function renderUnitsGrid(tab) {
  if (unitsViewMode === 'compare') {
    renderUnitsCompare();
    return;
  }
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
    return;
  }
  unitsGrid.style.display = 'grid';
  favoritesEmptyEl.style.display = 'none';
  keys.forEach(function (key) { unitsGrid.appendChild(buildUnitCard(key)); });
}

function renderDownloadsList() {
  if (!downloadsList) return;
  downloadsList.innerHTML = '';
  DOWNLOADS.forEach(function(doc){
    var item = document.createElement('a');
    item.className = 'download-item';
    var hasUrl = !!doc.url;
    if (hasUrl) {
      item.href = doc.url;
      item.setAttribute('download', '');
      item.target = '_blank';
      item.rel = 'noopener';
    } else if (WHATSAPP_BASE && WHATSAPP_BASE !== '#') {
      var msg = encodeURIComponent('Quisiera solicitar el documento: ' + doc.label);
      item.href = WHATSAPP_BASE + msg;
      item.target = '_blank';
      item.rel = 'noopener';
    } else {
      item.href = '#';
    }
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

/* ---- Pestañas Todas / Favoritos ---- */
var unitsTabAllBtn = document.getElementById('unitsTabAll');
var unitsTabFavBtn = document.getElementById('unitsTabFav');
function activateUnitsTab(tab) {
  if (unitsViewMode === 'compare') setUnitsViewMode('browse');
  unitsTabAllBtn.classList.toggle('active', tab === 'all');
  unitsTabFavBtn.classList.toggle('active', tab === 'fav');
  renderUnitsGrid(tab);
  vibrate(6);
}
unitsTabAllBtn.addEventListener('click', function(){ activateUnitsTab('all'); });
unitsTabFavBtn.addEventListener('click', function(){ activateUnitsTab('fav'); });
document.getElementById('favoritesEmptyBtn').addEventListener('click', function(){ activateUnitsTab('all'); });
var unitsCompareBtn = document.getElementById('unitsCompareBtn');
if (unitsCompareBtn) {
  unitsCompareBtn.addEventListener('click', function () {
    openUnitsCompare();
  });
}

/* ================= RENDER DE TARJETAS DE ZONAS 360° ================= */
function renderTour360Grid() {
  var tour360Grid = document.getElementById('tour360Grid');
  if (!tour360Grid) return;
  tour360Grid.innerHTML = '';

  Object.keys(TOUR360).forEach(function (key) {
    var t = TOUR360[key];
    var openTour = function () {
      if (t.link360) goTo('sphere', t.link360);
    };

    var card = document.createElement('article');
    card.className = 'tour360-card';
    card.setAttribute('data-zone', key);

    var media = document.createElement('div');
    media.className = 'tour360-card-media';
    if (t.color) {
      media.style.backgroundColor = t.color;
    } else if (t.imageUrl) {
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
    if (target.closest('#mainMenuOpenBtn, #mainMenu, #mainMenuBackdrop, .main-menu-backdrop, #customThemeColorPopover, [id^="menu"]')) {
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

function shouldOfferNavResumeGate() {
  return isNavResumeLocked() ||
    (navResumePending && (frozenSnapshotWarrantsResumeGate() || !!preservedOverlayId));
}

function hideViewForResumeGate() {
  document.getElementById('mainMenuBackdrop').classList.remove('active');
  document.getElementById('mainMenu').classList.remove('active');
  document.body.classList.remove('main-menu-open');
  document.body.classList.remove('global-close-docked');
}

function showNavResumeGate() {
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
  if (isNavResumeLocked()) return false;
  if (isThemeCustomizationActive()) return false;
  if (navFreezeLock || isNavReturnGuardActive()) return true;
  if (preservedOverlayId && isMainMenuOpen()) return true;
  if (isOverlayNavTop() && isMainMenuOpen()) return true;
  return false;
}

function isThemeCustomizationActive() {
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

  if (shouldOfferNavResumeGate()) {
    showNavResumeGate();
    return;
  }

  clearNavResumeAwaiting();
  releaseNavFreeze();
  if (isThemeCustomizationActive() || hasPendingThemeEditorSession()) return;
  forceHeroIdleUi();
  requestAnimationFrame(function () {
    if (isThemeCustomizationActive() || hasPendingThemeEditorSession() || navResumePending || isNavResumeLocked()) return;
    forceHeroIdleUi();
  });
  setTimeout(function () {
    if (isThemeCustomizationActive() || hasPendingThemeEditorSession() || navResumePending || isNavResumeLocked()) return;
    forceHeroIdleUi();
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
  return 'primary';
}

function closeMainMenuIfOpen() {
  if (!isMainMenuOpen()) return false;
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
  document.body.classList.add('main-menu-open');
  document.body.classList.remove('global-close-docked');
  syncNavigationCloseState();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (isMainMenuOpen()) {
        document.body.classList.add('global-close-docked');
      }
    });
  });
}
function hideMainMenuPanel() {
  document.body.classList.remove('global-close-docked');
  if (typeof VisitorPersonalizePanel !== 'undefined' &&
      typeof VisitorPersonalizePanel.resetThemeEditorOnLeave === 'function') {
    VisitorPersonalizePanel.resetThemeEditorOnLeave();
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
  var menuNavBack = document.getElementById('menuNavBack');
  var menu = document.getElementById('mainMenu');

  primary.style.display  = 'none';
  proyecto.style.display = 'none';
  contacto.style.display = 'none';
  if (personalizar) personalizar.style.display = 'none';
  if (menu) menu.classList.remove('is-personalizar');

  if (level === 'proyecto') {
    proyecto.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = false;
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
  } else {
    primary.style.display = 'flex';
    if (menuNavBack) menuNavBack.hidden = true;
  }
}
window.showMenuLevel = showMenuLevel;

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
  calculator: {
    onEnter: function(k){ setupCalculator(k); }
  },
  plans: {
    onEnter: function(k){ setupPlans(k); },
    onExit:  function(){ document.getElementById('galleryScroll').innerHTML = ''; }
  },
  estado: {
    onEnter: function(){ animateProgressBars(); }
  },
  sphere: {
    onEnter: function(l){
      playSound('tour360Enter');
      var frame  = document.getElementById('sphereFrame');
      var loader = document.getElementById('sphereLoader');
      var MIN_LOADER_MS = 3000;
      var startTime = Date.now();

      /* Resetear estado */
      loader.classList.remove('hidden');
      clearTimeout(sphereLoaderFallbackTimer);
      clearTimeout(sphereLoaderMinTimer);

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
      var frame  = document.getElementById('sphereFrame');
      var loader = document.getElementById('sphereLoader');
      frame.onload = null;
      frame.src = '';
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
  var el = SCREEN_ELEMENTS[id];
  if (el) document.getElementById(el).classList.add('active');
}
function hideScreenWithHooks(id) {
  if (SCREEN_HOOKS[id] && SCREEN_HOOKS[id].onExit) SCREEN_HOOKS[id].onExit();
  if (id === 'menu-primary' || id === 'menu-proyecto' || id === 'menu-contacto' || id === 'menu-personalizar') {
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
  if (screenId === 'menu-personalizar') {
    clearPreservedOverlay();
  }

  var current = navStack[navStack.length - 1];
  var currentIsMenu = current  && current.indexOf('menu-')  === 0;

  if (currentIsMenu && targetIsMenu && (isMainMenuOpen() || canOpenMenuWithoutGesture())) {
    if (screenId === 'menu-personalizar') ensureMenuPrimaryBeforePersonalizar();
    if (!isMainMenuOpen()) showMainMenuPanel();
    showMenuLevel(resolveMenuLevel(screenId));
    if (current !== screenId) navStack.push(screenId);
    syncNavigationCloseState();
    captureLiveNavSnapshot();
    saveNavSession();
    return;
  }

  if (navStack.length === 0) pauseCoverVideo();

  var isOverlay = OVERLAY_SCREENS[screenId];
  if (current && !isOverlay) hideScreenWithHooks(current);
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
}

function goBack() {
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

  if (currentIsMenu && previousIsMenu) {
    showMenuLevel(resolveMenuLevel(previous));
    syncNavigationCloseState();
    syncActiveTheme();
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
}

function syncActiveTheme() {
  if (isThemeCustomizationActive()) return;
  if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
    ThemeSystem.reapply();
  }
}

/* ================= TECLA ESCAPE — delegada a GlobalClose (solo escritorio) ================= */

window.isMainMenuOpen = isMainMenuOpen;
window.closeMainMenuIfOpen = closeMainMenuIfOpen;
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
bootNavStateGuard();
bindNavSessionPersistence();

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
  document.querySelectorAll('.units-popup-box, .content-modal-box:not(.auth-experience-box)').forEach(function (box) {
    if (box.firstElementChild && box.firstElementChild.classList.contains('popup-box-scroll')) return;
    var scroll = document.createElement('div');
    scroll.className = 'popup-box-scroll';
    while (box.firstChild) scroll.appendChild(box.firstChild);
    box.appendChild(scroll);
  });
}
ensurePopupBoxScrollWrappers();

/* ================= ENTRADA DESDE LA PORTADA ================= */
document.getElementById('tour360OpenBtn').addEventListener('click', function(){ goTo('tour360'); });

/* ================= CIERRES — botón global; backdrops siguen activos ================= */
document.getElementById('mainMenuBackdrop').addEventListener('click', function () {
  if (isPersonalizarPanelActive()) return;
  guardedGoBack();
});
var menuNavBackEl = document.getElementById('menuNavBack');
if (menuNavBackEl) {
  menuNavBackEl.addEventListener('click', function () {
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.dismissThemeEditorLayer === 'function' &&
        VisitorPersonalizePanel.dismissThemeEditorLayer()) {
      syncNavigationCloseState();
      return;
    }
    authorizeGoBack();
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

/* ================= ITEMS DEL MENÚ PRINCIPAL ================= */
document.getElementById('menuConoce').addEventListener('click', function(){ goTo('menu-proyecto'); });
document.getElementById('menuTour360').addEventListener('click', function(){ goTo('tour360'); });
document.getElementById('menuViviendas').addEventListener('click', function(){ goTo('tipologias'); });
document.getElementById('menuUbicacion').addEventListener('click', function(){ goTo('location'); });
document.getElementById('menuContacto').addEventListener('click', function(){ goTo('menu-contacto'); });

document.getElementById('menuDescripcion').addEventListener('click', function(){ goTo('descripcion'); });
document.getElementById('menuVideo').addEventListener('click', function(){ goTo('video'); });
document.getElementById('menuRenders').addEventListener('click', function(){ goTo('renders'); });
document.getElementById('menuAmenidades').addEventListener('click', function(){ goTo('amenidades'); });
document.getElementById('menuEstado').addEventListener('click', function(){ goTo('estado'); });
document.getElementById('menuConstructora').addEventListener('click', function(){ goTo('constructora'); });
document.getElementById('menuDescargas').addEventListener('click', function(){ goTo('descargas'); });

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
}

document.getElementById('calcDownPct').addEventListener('change', computeCalculator);
document.getElementById('calcYears').addEventListener('change', computeCalculator);
document.getElementById('calcRate').addEventListener('change', computeCalculator);

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
  u.plans.forEach(function(plan){
    var slide = document.createElement('div');
    slide.className = 'plan-slide';
    var label = typeof plan === 'string' ? plan : plan.label;
    if (plan && plan.url) {
      slide.innerHTML = '<a href="' + plan.url + '" target="_blank" rel="noopener"><span>' + label + '</span></a>';
    } else {
      slide.innerHTML = '<span>' + label + '</span>';
    }
    scrollBox.appendChild(slide);
  });
  var priceSlide = document.createElement('div');
  priceSlide.className = 'plan-price-slide';
  var waMsg = encodeURIComponent('Me interesa el ' + u.name + ' del proyecto. Quisiera más información.');
  priceSlide.innerHTML =
    '<div class="plan-price-label">Precio</div>' +
    '<div class="plan-price-value">' + formatCOP(u.price) + '</div>' +
    '<a class="outline-btn" href="' + WHATSAPP_BASE + waMsg + '" target="_blank" rel="noopener">Solicitar propuesta</a>';
  scrollBox.appendChild(priceSlide);
  scrollBox.scrollTop = 0;
}
document.getElementById('pdfModal').addEventListener('touchmove', function(e){
  if (!e.target.closest('#galleryScroll')) e.preventDefault();
}, { passive: false });

/* ================= GALERÍA DE RENDERS ================= */
var RENDER_COUNT = 6;
var rendersGrid = document.getElementById('rendersGrid');
for (var i = 1; i <= RENDER_COUNT; i++) {
  (function(index){
    var tile = document.createElement('div');
    tile.className = 'render-tile';
    tile.innerHTML = '<span>RENDER ' + index + '</span>';
    tile.addEventListener('click', function(){ openLightbox(index - 1); });
    rendersGrid.appendChild(tile);
  })(i);
}

/* ================= LIGHTBOX DE RENDERS (swipe) ================= */
var lightboxTrack = document.getElementById('lightboxTrack');
for (var j = 1; j <= RENDER_COUNT; j++) {
  var slide = document.createElement('div');
  slide.className = 'lightbox-slide';
  slide.innerHTML = '<div class="lightbox-slide-inner"><span>RENDER ' + j + '</span></div>';
  lightboxTrack.appendChild(slide);
}
var lightboxIndex = 0;
var lightboxOpen  = false;

function updateLightboxPosition(animate) {
  lightboxTrack.style.transition = animate ? 'transform 0.3s cubic-bezier(.22,1,.36,1)' : 'none';
  lightboxTrack.style.transform  = 'translateX(-' + (lightboxIndex * 100) + '%)';
  document.getElementById('lightboxCounter').textContent = (lightboxIndex + 1) + ' / ' + RENDER_COUNT;
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
  if (lightboxIndex < RENDER_COUNT - 1) { lightboxIndex++; updateLightboxPosition(true); }
}
function lightboxPrev() {
  if (lightboxIndex > 0) { lightboxIndex--; updateLightboxPosition(true); }
}
document.getElementById('lightboxNext').addEventListener('click', lightboxNext);
document.getElementById('lightboxPrev').addEventListener('click', lightboxPrev);

/* ---- swipe táctil ---- */
var touchStartX = 0, touchDeltaX = 0, touchActive = false;
var lightboxEl  = document.getElementById('rendersLightbox');
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
  try {
    var params = new URLSearchParams(window.location.search);
    var unitKey = params.get('vivienda');
    if (unitKey && UNITS[unitKey]) {
      goTo('tipologias');
      setTimeout(function () { highlightSharedUnit(unitKey); }, 260);
    }
  } catch (e) {}
}

window.initProjectUI = function () {
  applyConfig();
  renderUnitsGrid('all');
  updateFavoritesTabCount();
  renderDownloadsList();
  buildProgressList();
  initDeepLink();
  if (typeof VisitorMenu !== 'undefined') {
    VisitorMenu.refreshProfile();
  }
};

window.onVisitorFavoritesChanged = function () {
  updateFavoritesTabCount();
  if (unitsViewMode === 'compare') {
    var favKeys = getFavorites().filter(function (key) { return !!UNITS[key]; });
    if (favKeys.length < 2) exitUnitsCompareMode();
    else renderUnitsCompare(favKeys);
  } else if (currentUnitsTab === 'fav') {
    renderUnitsGrid('fav');
  }
  document.querySelectorAll('.fav-btn[data-fav]').forEach(function (el) {
    var key = el.getAttribute('data-fav');
    var active = isFavorite(key);
    el.classList.toggle('active', active);
    el.textContent = active ? '❤' : '♡';
  });
};
