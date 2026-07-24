try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/project-data.js');}catch(_e){}
/* =========================================================
   PROJECT DATA — Dashboard is the single source of truth
   Loads all modules from Supabase and hydrates the UI
   ========================================================= */

(function () {
  function paintBootBanner() {
    /* BootDebug overlay desactivado — no insertar #bootDebugBanner */
    return;
  }
  window.__pdTrace = function (stage, detail) {
    var msg = 'PD · ' + stage + (detail !== undefined && detail !== '' ? (' · ' + detail) : '');
    try { console.log('[PD]', stage, detail !== undefined ? detail : ''); } catch (e) {}
    if (typeof BootDebug !== 'undefined') {
      BootDebug.log(msg);
      paintBootBanner();
    }
  };
  window.__pdTraceError = function (stage, err) {
    var detail = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
    var msg = 'PD · FAIL · ' + stage + ' · ' + detail;
    try { console.error('[PD]', stage, err); } catch (e) {}
    if (typeof BootDebug !== 'undefined') {
      BootDebug.error(msg, err);
      paintBootBanner();
    }
  };
  window.__pdTraceBlock = function (name, fn) {
    window.__pdTrace(name + ' — start');
    try {
      var result = fn();
      window.__pdTrace(name + ' — done');
      return result;
    } catch (err) {
      window.__pdTraceError(name, err);
      throw err;
    }
  };
})();

var PROJECT_DATA = null;

function normalizeHeroTextColor(value) {
  return value === 'dark' ? 'dark' : 'light';
}

function applyHeroTextColors(config) {
  config = config || {};
  var cover = document.getElementById('projectCover');
  if (!cover) return;
  cover.setAttribute('data-hero-text-color', normalizeHeroTextColor(config.hero_text_color));
  cover.setAttribute('data-hero-button-text-color', normalizeHeroTextColor(config.hero_button_text_color));
}

function applyHeroFloatVisibility(config) {
  config = config || {};
  var showShare = config.show_share_float !== false;
  var waFloat = document.getElementById('whatsappFloat');
  var shareFloat = document.getElementById('shareProjectFloatBtn');
  /* WhatsApp float replaced by ProductAssistant — always hidden */
  if (waFloat) {
    waFloat.hidden = true;
    waFloat.classList.add('is-float-hidden');
    waFloat.setAttribute('aria-hidden', 'true');
  }
  if (shareFloat) {
    shareFloat.hidden = !showShare;
    shareFloat.classList.toggle('is-float-hidden', !showShare);
    shareFloat.setAttribute('aria-hidden', showShare ? 'false' : 'true');
  }
  applyProjectBackButton(config);
  syncHeroSecondaryVisibility();
}

function resolveProjectBackButton(config) {
  config = config || {};
  var rawShow = config.show_back_button;
  if (rawShow === undefined) rawShow = config.showBackButton;
  var show = rawShow === true || rawShow === 'true' || rawShow === 1;
  var url = normalizeProjectBackUrl(config.back_button_url || config.backButtonUrl || '');
  var label = String(config.back_button_label || config.backButtonLabel || 'Demos').trim() || 'Demos';
  if (/^proyectos$/i.test(label)) label = 'Demos';
  if (!show || !url) {
    return { show: false, url: '', label: label };
  }
  return { show: true, url: url, label: label };
}

/**
 * Landing root → /#demos so return lands on the demos section, not the hero.
 * Custom constructor URLs (any host/path/hash) pass through unchanged.
 */
function normalizeProjectBackUrl(raw) {
  var url = String(raw == null ? '' : raw).trim();
  if (!url) return '';

  if (url === '/' || url === '/index.html' || url === '/#') {
    return '/#demos';
  }

  try {
    var base = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'https://360preventa.com';
    var parsed = new URL(url, base);
    var path = (parsed.pathname || '/').replace(/\/+$/, '') || '/';
    var isLandingRoot = path === '/' || /^\/index\.html$/i.test(path);
    if (isLandingRoot && (!parsed.hash || parsed.hash === '#' || parsed.hash === '#proyectos')) {
      parsed.hash = 'demos';
      if (parsed.origin === base) {
        return '/#demos';
      }
      return parsed.origin + '/#demos';
    }
    if (parsed.hash === '#proyectos') {
      parsed.hash = 'demos';
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return url;
  } catch (e) {
    return url;
  }
}

function applyProjectBackButton(config) {
  var resolved = resolveProjectBackButton(config);
  var desktop = document.getElementById('projectBackBtn');
  var mobile = document.getElementById('projectBackBtnMobile');
  var labelEl = document.getElementById('projectBackBtnLabel');

  /* Mobile V3.7: siempre ofrecer ← Demos hacia la landing */
  var isMobile = typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 600px)').matches;
  if (isMobile) {
    resolved = {
      show: true,
      url: resolved.url || '/#demos',
      label: resolved.label || 'Demos'
    };
  }

  if (labelEl) labelEl.textContent = resolved.label;

  function applyLink(el) {
    if (!el) return;
    if (!resolved.show) {
      el.hidden = true;
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('href');
      return;
    }
    el.hidden = false;
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');
    el.setAttribute('href', resolved.url);
    /* Móvil: control de sistema (solo ←); desktop conserva etiqueta */
    el.setAttribute('aria-label', isMobile ? 'Volver' : resolved.label);
  }

  applyLink(desktop);
  /* Hero secondary back queda oculto en móvil (CSS); no duplicar estado */
  if (isMobile && mobile) {
    mobile.hidden = true;
    mobile.setAttribute('hidden', '');
    mobile.setAttribute('aria-hidden', 'true');
  } else {
    applyLink(mobile);
  }
  syncHeroSecondaryVisibility();
}

function syncHeroSecondaryVisibility() {
  var row = document.getElementById('heroSecondaryActions');
  if (!row) return;
  var back = document.getElementById('projectBackBtnMobile');
  var assist = document.getElementById('projectAssistBtnMobile');
  /* En móvil el asistente vive en el FAB inferior derecho; no duplicar en el hero */
  var isMobile = typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 600px)').matches;
  if (assist) {
    if (isMobile) {
      assist.hidden = true;
      assist.setAttribute('aria-hidden', 'true');
    } else if (assist.getAttribute('data-assist-forced-hidden') !== '1') {
      assist.hidden = false;
      assist.setAttribute('aria-hidden', 'false');
    }
  }
  var backOn = !!(back && !back.hidden);
  var assistOn = !!(assist && !assist.hidden);
  var any = backOn || assistOn;
  row.hidden = !any;
  row.setAttribute('aria-hidden', any ? 'false' : 'true');
  row.classList.toggle('is-assist-only', !backOn && assistOn);
}

function applyHeroModule(project) {
  console.log('[BOOT] applyHeroModule START');
  var config = project.proyecto_config || {};
  if (Array.isArray(config)) config = config[0] || {};
  var constructora = project.constructoras || {};

  var nameEl = document.getElementById('projectCoverName');
  if (nameEl) nameEl.textContent = config.titulo_hero || project.nombre || '';

  var taglineEl = document.getElementById('projectCoverTagline');
  if (taglineEl) {
    taglineEl.textContent = config.texto_hero ||
      formatHeroSubtitle(project.ciudad, project.estado, null) ||
      '';
  }

  var btnStart = document.getElementById('heroStartBtn');
  if (btnStart) {
    btnStart.textContent = config.boton_hero_1 || 'Iniciar';
  }

  var btnExplore = document.getElementById('mainMenuOpenBtn');
  if (btnExplore) {
    var exploreLabel = config.boton_hero_2 || 'Explorar';
    btnExplore.innerHTML = '<span class="menu-btn-icon" aria-hidden="true">☰</span>' + exploreLabel;
    btnExplore.setAttribute('aria-label', exploreLabel);
  }

  applyHeroTextColors(config);
  applyHeroFloatVisibility(config);

  var logoEl = document.getElementById('projectCoverLogo');
  var logoUrl = config.logo_url || null;
  /* Solo logo del proyecto en hero; no caer al logo de constructora si está oculto. */
  if (!logoUrl && config.show_hero_logo !== false) {
    logoUrl = constructora.logo_url || null;
  }
  var showLogo = config.show_hero_logo === true || (config.show_hero_logo == null && !!config.logo_url);
  if (config.show_hero_logo === false) showLogo = false;
  if (!logoUrl) showLogo = false;
  var logoStyle = config.logo_style === 'avatar' ? 'avatar' : 'flat';
  if (logoEl) {
    if (showLogo) {
      logoEl.src = logoUrl;
      logoEl.alt = project.nombre || 'Logo';
      logoEl.hidden = false;
      logoEl.removeAttribute('hidden');
      logoEl.classList.remove('is-hidden');
      logoEl.classList.toggle('is-avatar', logoStyle === 'avatar');
      logoEl.style.removeProperty('display');
    } else {
      logoEl.removeAttribute('src');
      logoEl.hidden = true;
      logoEl.setAttribute('hidden', '');
      logoEl.classList.add('is-hidden');
      logoEl.classList.remove('is-avatar');
      logoEl.style.display = 'none';
    }
  }

  var videoEl = document.getElementById('coverVideo');
  var sourceEl = document.getElementById('coverVideoSource');
  var imageEl = document.getElementById('coverImage');
  var coverEl = document.getElementById('projectCover');
  var slug = String(project.slug || '').toLowerCase();
  /* TEMP: demos sin media de red — fondo OLED CSS mientras se frena Cached Egress */
  var ambientDemo = slug === 'demo1' || slug === 'demo2' || slug === 'demo3' || slug === 'valhalla';
  var hasVideo = !ambientDemo && !!config.video_hero_url;
  var hasImage = !ambientDemo && !!config.imagen_hero_url;

  if (coverEl) {
    coverEl.classList.toggle('is-ambient-depth', ambientDemo || (!hasVideo && !hasImage));
  }

  function clearCoverVideo() {
    if (sourceEl) {
      sourceEl.removeAttribute('src');
      try { sourceEl.src = ''; } catch (e0) { /* ignore */ }
    }
    if (videoEl) {
      try { videoEl.pause(); } catch (e1) { /* ignore */ }
      videoEl.removeAttribute('src');
      videoEl.style.display = 'none';
      /* No llamar load()/play() sin src de red */
    }
  }

  if (hasVideo && videoEl && sourceEl) {
    sourceEl.src = config.video_hero_url;
    sourceEl.type = guessVideoMimeType(config.video_hero_url);
    videoEl.style.display = '';
    videoEl.muted = true;
    videoEl.preload = 'metadata';
    videoEl.load();
    videoEl.play().catch(function () {});
    if (imageEl) {
      imageEl.removeAttribute('src');
      imageEl.style.display = 'none';
    }
  } else {
    clearCoverVideo();
    if (hasImage && imageEl) {
      imageEl.src = config.imagen_hero_url;
      imageEl.style.display = '';
    } else if (imageEl) {
      imageEl.removeAttribute('src');
      imageEl.style.display = 'none';
    }
  }
  console.log('[BOOT] applyHeroModule END');
}

function getProjectConfig(project) {
  var config = project && project.proyecto_config;
  if (Array.isArray(config)) config = config[0];
  return config || {};
}

var blackPlaceholderVideoPromise = null;

function resolveBlackPlaceholderVideoUrl() {
  if (window.__blackPlaceholderVideoUrl) {
    return Promise.resolve(window.__blackPlaceholderVideoUrl);
  }
  if (blackPlaceholderVideoPromise) return blackPlaceholderVideoPromise;

  blackPlaceholderVideoPromise = new Promise(function (resolve) {
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' ||
        !HTMLCanvasElement.prototype.captureStream) {
      resolve('');
      return;
    }

    var canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var stream = canvas.captureStream(24);
    var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
    if (!mimeType) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      resolve('');
      return;
    }

    var recorder = new MediaRecorder(stream, { mimeType: mimeType });
    var chunks = [];
    recorder.ondataavailable = function (event) {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    recorder.onstop = function () {
      stream.getTracks().forEach(function (track) { track.stop(); });
      if (!chunks.length) {
        resolve('');
        return;
      }
      var blob = new Blob(chunks, { type: mimeType });
      window.__blackPlaceholderVideoUrl = URL.createObjectURL(blob);
      resolve(window.__blackPlaceholderVideoUrl);
    };
    recorder.onerror = function () {
      stream.getTracks().forEach(function (track) { track.stop(); });
      resolve('');
    };
    recorder.start(200);
    setTimeout(function () {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 4000);
  });

  return blackPlaceholderVideoPromise;
}

function guessVideoMimeType(url) {
  var lower = String(url || '').split('?')[0].toLowerCase();
  if (lower.slice(-5) === '.webm') return 'video/webm';
  if (lower.slice(-4) === '.ogg') return 'video/ogg';
  return 'video/mp4';
}

function setProjectVideoSource(player, sourceEl, url, mimeType) {
  if (!player || !sourceEl || !url) return;
  sourceEl.src = url;
  sourceEl.type = mimeType || guessVideoMimeType(url);
  player.load();
}

function clearProjectVideoSource(player, sourceEl) {
  if (sourceEl) {
    sourceEl.removeAttribute('src');
    try { sourceEl.src = ''; } catch (e0) { /* ignore */ }
  }
  if (player) {
    try { player.pause(); } catch (e1) { /* ignore */ }
    player.removeAttribute('src');
  }
}

/** Asigna src de Storage solo al reproducir (nunca en boot). */
function ensureProjectVideoSourceForPlayback() {
  var player = document.getElementById('projectVideoPlayer');
  var sourceEl = document.getElementById('projectVideoSource');
  if (!player || !sourceEl) return Promise.resolve(false);

  var pending = player.dataset.pendingVideoUrl || '';
  if (!pending) {
    return resolveBlackPlaceholderVideoUrl().then(function (blobUrl) {
      if (!blobUrl) return false;
      if (String(sourceEl.getAttribute('src') || '') === String(blobUrl)) return true;
      setProjectVideoSource(player, sourceEl, blobUrl, 'video/webm');
      return true;
    });
  }

  var current = sourceEl.getAttribute('src') || '';
  if (current === pending) return Promise.resolve(true);
  setProjectVideoSource(player, sourceEl, pending, guessVideoMimeType(pending));
  return Promise.resolve(true);
}
window.ensureProjectVideoSourceForPlayback = ensureProjectVideoSourceForPlayback;

function syncProjectVideoPoster(player, config) {
  if (!player) return;
  var poster = (config && (config.imagen_hero_url || config.video_poster_url)) || '';
  var coverImg = document.getElementById('coverImage');
  if (!poster && coverImg) {
    var coverSrc = coverImg.currentSrc || coverImg.getAttribute('src') || '';
    if (coverSrc && coverImg.style.display !== 'none') poster = coverSrc;
  }
  if (!poster) {
    var coverVideo = document.getElementById('coverVideo');
    if (coverVideo && coverVideo.poster) poster = coverVideo.poster;
  }
  if (poster) {
    player.setAttribute('poster', poster);
    player.dataset.videoPosterBackup = poster;
  }
}

function applyMenuModule(project) {
  if (typeof MenuConfig === 'undefined' || !MenuConfig.applyToDom) return;
  var config = project.proyecto_config || {};
  if (Array.isArray(config)) config = config[0] || {};
  var constructora = project.constructoras || {};
  var menu = config.menu_config;
  if (!menu) {
    menu = MenuConfig.defaults();
    menu.projectName = config.titulo_hero || project.nombre || '';
    menu.description = constructora.nombre || '';
  } else {
    menu = MenuConfig.normalize(menu);
    if (!menu.projectName) menu.projectName = config.titulo_hero || project.nombre || '';
    if (!menu.description) menu.description = constructora.nombre || '';
  }
  MenuConfig.applyToDom(menu, {
    fallbackDescription: constructora.nombre || ''
  });
  if (typeof window.bindMenuItemNavigation === 'function') {
    window.bindMenuItemNavigation();
  }
}

function applyProjectVideoModule(project) {
  var config = getProjectConfig(project);
  var player = document.getElementById('projectVideoPlayer');
  var sourceEl = document.getElementById('projectVideoSource');
  if (!player || !sourceEl) return;

  var slug = String(project.slug || '').toLowerCase();
  var ambientDemo = slug === 'demo1' || slug === 'demo2' || slug === 'demo3' || slug === 'valhalla';
  var remoteUrl = ambientDemo ? '' : (config.video_hero_url || '');

  player.dataset.pendingVideoUrl = remoteUrl;
  clearProjectVideoSource(player, sourceEl);
  player.preload = 'none';

  /* Poster: evitar URLs de Storage en demos ambient (sin fetch de imagen de fondo). */
  if (!ambientDemo) {
    syncProjectVideoPoster(player, config);
  }
  /* No setProjectVideoSource / load / play en boot — el modal carga bajo demanda. */
}

function getProjectVideoQualityMap(config) {
  var map = {};
  var fallbackUrl = (config && config.video_hero_url) || '';
  var raw = config && (config.video_qualities || config.video_sources);
  if (Array.isArray(raw)) {
    raw.forEach(function (item) {
      if (!item) return;
      var url = item.url || item.src || '';
      if (!url) return;
      var key = String(item.key || item.label || item.quality || item.name || '')
        .toLowerCase()
        .replace(/\s+/g, '');
      if (key.indexOf('720') !== -1) map['720'] = url;
      else if (key.indexOf('1080') !== -1 || key.indexOf('fhd') !== -1) map['1080'] = url;
      else if (key.indexOf('2k') !== -1 || key.indexOf('1440') !== -1) map['2k'] = url;
      else if (key.indexOf('4k') !== -1 || key.indexOf('2160') !== -1 || key.indexOf('uhd') !== -1) map['4k'] = url;
    });
  }
  ['720', '1080', '2k', '4k'].forEach(function (key) {
    if (!map[key] && fallbackUrl) map[key] = fallbackUrl;
  });
  return map;
}

function bindProjectVideoModal() {
  var modal = document.getElementById('videoModal');
  var player = document.getElementById('projectVideoPlayer');
  var wrap = document.getElementById('projectVideoPlayerWrap');
  var controls = document.getElementById('projectVideoControls');
  var playBtn = document.getElementById('projectVideoPlayBtn');
  var muteBtn = document.getElementById('projectVideoMuteBtn');
  var volumeInput = document.getElementById('projectVideoVolume');
  var fsBtn = document.getElementById('projectVideoFsBtn');
  var loopBtn = document.getElementById('projectVideoLoopBtn');
  var qualityBtn = document.getElementById('projectVideoQualityBtn');
  var qualityMenu = document.getElementById('projectVideoQualityMenu');
  var sourceEl = document.getElementById('projectVideoSource');

  if (!modal || !player || bindProjectVideoModal.bound) return;
  bindProjectVideoModal.bound = true;

  var qualityMap = {};
  var activeQuality = '1080';
  var lastVolume = 1;

  function syncLoopUi() {
    if (!loopBtn) return;
    var on = !!player.loop;
    loopBtn.classList.toggle('is-loop-on', on);
    loopBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    loopBtn.setAttribute('aria-label', on ? 'Repetir activado' : 'Repetir video');
    loopBtn.title = on ? 'Repetir activado' : 'Repetir';
  }

  function syncPlayUi() {
    if (!playBtn) return;
    var playing = !player.paused && !player.ended;
    playBtn.classList.toggle('is-playing', playing);
    playBtn.classList.toggle('is-paused', !playing);
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    playBtn.title = playing ? 'Pausar' : 'Reproducir';
  }

  function syncMuteUi() {
    if (!muteBtn) return;
    var muted = player.muted || player.volume === 0;
    muteBtn.classList.toggle('is-muted', muted);
    muteBtn.classList.toggle('is-unmuted', !muted);
    muteBtn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
  }

  function syncVolumeUi() {
    if (volumeInput) volumeInput.value = String(player.muted ? 0 : player.volume);
    syncMuteUi();
  }

  function closeQualityMenu() {
    if (!qualityMenu || !qualityBtn) return;
    qualityMenu.hidden = true;
    qualityBtn.setAttribute('aria-expanded', 'false');
  }

  function syncQualityMenuUi() {
    if (!qualityMenu) return;
    qualityMenu.querySelectorAll('[data-quality]').forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.getAttribute('data-quality') === activeQuality);
    });
  }

  function setQuality(key) {
    if (!key || !sourceEl) return;
    var url = qualityMap[key] || qualityMap['1080'] || qualityMap['720'] || sourceEl.src || player.currentSrc;
    if (!url) {
      activeQuality = key;
      syncQualityMenuUi();
      closeQualityMenu();
      return;
    }
    var wasPlaying = !player.paused;
    var t = player.currentTime || 0;
    var sameUrl = String(sourceEl.src || '') === String(url) || String(player.currentSrc || '') === String(url);
    activeQuality = key;
    syncQualityMenuUi();
    closeQualityMenu();
    if (sameUrl) return;
    setProjectVideoSource(player, sourceEl, url, guessVideoMimeType(url));
    var onReady = function () {
      player.removeEventListener('loadedmetadata', onReady);
      try { player.currentTime = t; } catch (e) { /* ignore */ }
      if (wasPlaying) {
        var p = player.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      syncPlayUi();
    };
    player.addEventListener('loadedmetadata', onReady);
  }

  function refreshQualitiesFromConfig() {
    var project = window.PROJECT_DATA || null;
    var config = project ? getProjectConfig(project) : {};
    qualityMap = getProjectVideoQualityMap(config);
    if (!qualityMap['1080'] && sourceEl && sourceEl.src) {
      ['720', '1080', '2k', '4k'].forEach(function (k) {
        if (!qualityMap[k]) qualityMap[k] = sourceEl.src;
      });
    }
    if (!activeQuality) activeQuality = '1080';
    syncQualityMenuUi();
  }

  function toggleFullscreen() {
    var target = wrap || player;
    if (!target) return;

    /* Salir si ya está en fullscreen (API estándar o WebKit video). */
    try {
      if (player && player.webkitDisplayingFullscreen && typeof player.webkitExitFullscreen === 'function') {
        player.webkitExitFullscreen();
        return;
      }
    } catch (e0) { /* ignore */ }
    if (document.fullscreenElement === target || document.webkitFullscreenElement === target ||
        document.fullscreenElement === player || document.webkitFullscreenElement === player) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }

    /* iPhone Safari: priorizar fullscreen nativo del <video>. */
    if (player && typeof player.webkitEnterFullscreen === 'function') {
      try {
        player.webkitEnterFullscreen();
        return;
      } catch (e1) { /* fall through */ }
    }

    if (typeof window.tryProjectVideoFullscreen === 'function') {
      window.tryProjectVideoFullscreen(player).then(function (ok) {
        if (ok) {
          var modal = document.getElementById('videoModal');
          if (modal) modal.classList.remove('is-mobile-video-fs-fallback');
          var hint = document.getElementById('videoFsFallbackHint');
          if (hint) hint.hidden = true;
        }
      });
      return;
    }

    if (target.requestFullscreen) target.requestFullscreen();
    else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  }

  if (controls) controls.hidden = false;

  if (playBtn) {
    playBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (player.paused || player.ended) {
        var p = player.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } else {
        player.pause();
      }
      syncPlayUi();
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (player.muted || player.volume === 0) {
        player.muted = false;
        player.volume = lastVolume > 0 ? lastVolume : 1;
      } else {
        lastVolume = player.volume || 1;
        player.muted = true;
      }
      syncVolumeUi();
    });
  }

  if (volumeInput) {
    volumeInput.addEventListener('input', function () {
      var v = parseFloat(volumeInput.value);
      if (isNaN(v)) return;
      player.volume = Math.max(0, Math.min(1, v));
      player.muted = player.volume === 0;
      if (player.volume > 0) lastVolume = player.volume;
      syncMuteUi();
    });
    volumeInput.addEventListener('click', function (e) { e.stopPropagation(); });
    volumeInput.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }

  if (loopBtn) {
    loopBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      player.loop = !player.loop;
      syncLoopUi();
    });
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  if (qualityBtn && qualityMenu) {
    qualityBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = qualityMenu.hidden;
      qualityMenu.hidden = !open;
      qualityBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    qualityMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var opt = e.target.closest('[data-quality]');
      if (!opt) return;
      setQuality(opt.getAttribute('data-quality'));
    });
  }

  player.addEventListener('play', syncPlayUi);
  player.addEventListener('pause', syncPlayUi);
  player.addEventListener('ended', syncPlayUi);
  player.addEventListener('volumechange', syncVolumeUi);
  player.addEventListener('click', function (e) {
    e.stopPropagation();
    if (player.paused || player.ended) {
      var p = player.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } else {
      player.pause();
    }
  });

  if (wrap) {
    wrap.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (controls) {
    controls.addEventListener('click', function (e) { e.stopPropagation(); });
    controls.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }

  document.addEventListener('click', function () {
    closeQualityMenu();
  });

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function () {
      if (!modal.classList.contains('active')) {
        player.pause();
        closeQualityMenu();
        try { player.currentTime = 0; } catch (e) { /* ignore */ }
        syncPlayUi();
      } else {
        refreshQualitiesFromConfig();
        if (typeof ensureProjectVideoSourceForPlayback === 'function') {
          ensureProjectVideoSourceForPlayback();
        }
        syncPlayUi();
        syncVolumeUi();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  refreshQualitiesFromConfig();
  syncPlayUi();
  syncVolumeUi();
  syncLoopUi();
}

function buildConfig(project) {
  var constructora = project.constructoras || {};
  var config = project.proyecto_config || {};
  if (Array.isArray(config)) config = config[0] || {};

  var floatLink = (config.whatsapp_float_link || '').trim();
  var phone = floatLink || project.whatsapp || constructora.telefono || '';
  var phoneHref = phone.replace(/\s+/g, '');
  var whatsappHref = '';
  if (/^https?:\/\//i.test(phoneHref) || /^wa\.me\//i.test(phoneHref)) {
    whatsappHref = /^https?:\/\//i.test(phoneHref) ? phoneHref : ('https://' + phoneHref);
    phoneHref = '';
  }

  var mapsUrl = buildMapsUrl(project.latitud, project.longitud, project.direccion || project.ciudad);
  var constructoraWebUrl = ensureHttpUrl(constructora.sitio_web || project.sitio_web || '');
  var email = project.email || constructora.email || '';
  var instagramUrl = ensureHttpUrl(project.instagram_url || '');
  var defaultWaMsg = 'Hola, quiero más información sobre ' + (project.nombre || 'el proyecto') + '.';
  var shareUrl = (config.share_float_url || '').trim();
  var backResolved = resolveProjectBackButton(config);

  return {
    projectName: project.nombre || '',
    constructoraName: constructora.nombre || '',
    tagline: formatHeroSubtitle(project.ciudad, project.estado, config.texto_hero),
    whatsappPhone: phoneHref,
    whatsappHref: whatsappHref,
    whatsappDefaultMessage: (config.whatsapp_float_message || '').trim() || defaultWaMsg,
    showWhatsappFloat: config.show_whatsapp_float !== false,
    showShareFloat: config.show_share_float !== false,
    shareUrl: shareUrl,
    showBackButton: backResolved.show,
    backButtonLabel: backResolved.label,
    backButtonUrl: backResolved.url,
    phoneDisplay: phone || '',
    phoneHref: phoneHref,
    instagramUser: project.instagram_url ? formatDisplayUrl(project.instagram_url) : '',
    instagramUrl: instagramUrl,
    salesAddress: project.direccion || project.ciudad || '',
    mapsUrl: mapsUrl,
    constructoraWeb: formatDisplayUrl(constructora.sitio_web || project.sitio_web || ''),
    constructoraWebUrl: constructoraWebUrl,
    email: email,
    calcRate: config.tasa_interes_anual != null ? String(config.tasa_interes_anual) : '11.5'
  };
}

function applyProjectInfoModule(project) {
  var descEl = document.getElementById('descripcionText');
  if (descEl) descEl.textContent = project.descripcion || '';

  var menuProject = document.getElementById('mainMenuProject');
  if (menuProject) menuProject.textContent = project.nombre || '';

  var menuConstructora = document.getElementById('mainMenuConstructora');
  if (menuConstructora) {
    var constructora = project.constructoras || {};
    menuConstructora.textContent = constructora.nombre || '';
  }

  var locationBox = document.getElementById('locationPlaceholder');
  if (locationBox) {
    if (typeof LocationMap !== 'undefined' && typeof LocationMap.render === 'function') {
      LocationMap.render(locationBox, {
        lat: project.latitud,
        lng: project.longitud,
        label: project.nombre || project.direccion || project.ciudad || 'Valledupar'
      });
    } else if (project.latitud != null && project.longitud != null) {
      locationBox.innerHTML = '<span>' + (project.direccion || project.ciudad || 'Valledupar') + '</span>';
    } else if (project.direccion || project.ciudad) {
      locationBox.innerHTML = '<span>' + (project.direccion || project.ciudad) + '</span>';
    } else {
      locationBox.innerHTML = '<span>Ubicación no disponible</span>';
    }
  }

  var directionsBtn = document.getElementById('directionsBtn');
  if (directionsBtn) {
    directionsBtn.href = buildMapsUrl(project.latitud, project.longitud, project.direccion || project.ciudad);
  }
}

function applyConstructorModule(project) {
  var constructora = project.constructoras || {};
  var el = document.getElementById('constructoraText');
  if (!el) return;

  var parts = [];
  if (constructora.nombre) parts.push(constructora.nombre);
  if (constructora.descripcion) parts.push(constructora.descripcion);
  el.textContent = parts.join('\n\n');
}

function applyAmenitiesModule(project) {
  var items = (project.proyecto_amenidades || []).map(function (row) {
    var amenidad = row.amenidades || {};
    return {
      name: amenidad.nombre || '',
      imageUrl: row.imagen_url || '',
      description: row.descripcion || '',
      icon: amenidad.icono || ''
    };
  });

  if (typeof AmenitiesCarousel !== 'undefined' && typeof AmenitiesCarousel.setItems === 'function') {
    AmenitiesCarousel.setItems(items);
  }
}

function buildProgressData(project) {
  var stages = (project.proyecto_avances || []).slice().sort(function (a, b) {
    return (a.orden || 0) - (b.orden || 0);
  });

  PROJECT_STAGES = stages.map(function (stage) {
    return {
      label: stage.etapa || '',
      pct: Number(stage.porcentaje) || 0,
      status: AVANCE_ESTADO_LABELS[stage.estado] || stage.estado || ''
    };
  });

  var deliveryDates = stages
    .map(function (s) { return s.fecha_entrega; })
    .filter(Boolean)
    .sort();
  PROJECT_DELIVERY = deliveryDates.length
    ? formatMonthYear(deliveryDates[deliveryDates.length - 1])
    : '';

  var updates = stages
    .map(function (s) { return s.updated_at; })
    .filter(Boolean)
    .sort();
  PROJECT_LAST_UPDATE = updates.length
    ? formatShortDate(updates[updates.length - 1])
    : '';
}

function buildDownloadsData(project) {
  var docs = (project.archivos || []).filter(function (file) {
    return !file.vivienda_id && (file.tipo === 'pdf' || file.tipo === 'brochure' || file.tipo === 'plano');
  }).sort(function (a, b) {
    return (a.orden || 0) - (b.orden || 0);
  });

  DOWNLOADS = docs.map(function (file) {
    return {
      label: file.nombre || 'Documento',
      sub: (file.extension || file.tipo || 'PDF').toUpperCase(),
      url: file.url || ''
    };
  });
}

function buildTypologiesData(project) {
  TYPOLOGIES = (project.tipologias || []).slice().sort(function (a, b) {
    return (a.orden || 0) - (b.orden || 0);
  }).map(function (t) {
    return {
      id: t.id,
      name: t.nombre || '',
      area: Number(t.area_m2) || 0,
      rooms: t.habitaciones || 0,
      baths: t.banos || 0,
      price: Number(t.precio) || 0,
      imageUrl: t.imagen_url || '',
      videoUrl: t.video_url || ''
    };
  });
}

function buildUnitsData(project) {
  UNITS = {};
  var units = (project.viviendas || []).filter(function (v) {
    return v.publicado !== false;
  });

  units.forEach(function (v) {
    var archivos = (v.archivos || []).slice().sort(function (a, b) {
      return (a.orden || 0) - (b.orden || 0);
    });
    var imagen = archivos.find(function (a) { return a.tipo === 'imagen'; });
    var tour360 = archivos.find(function (a) { return a.tipo === 'tour_360'; });
    var planos = archivos.filter(function (a) { return a.tipo === 'plano'; });

    UNITS[v.id] = {
      id: v.id,
      tag: v.codigo || v.tipo || '',
      name: v.nombre || '',
      unitType: v.tipo || '',
      tower: v.torre || '',
      floor: v.piso != null && v.piso !== '' ? v.piso : '',
      area: Number(v.area_m2) || 0,
      rooms: v.habitaciones || 0,
      baths: v.banos || 0,
      privateBaths: v.banos_privados != null ? v.banos_privados : (v.banos || 0),
      parking: v.parqueaderos || 0,
      price: Number(v.precio) || 0,
      adminFee: Number(v.administracion) || 0,
      availability: VIVIENDA_ESTADO_LABELS[v.estado] || '',
      link360: tour360 ? tour360.url : '',
      planosModo: v.planos_modo === 'file' ? 'file' : 'proximamente',
      tour360Modo: v.tour360_modo === 'link' ? 'link' : 'proximamente',
      cardLabel: imagen ? (imagen.nombre || v.nombre) : v.nombre,
      cardImageUrl: imagen ? (imagen.miniatura_url || imagen.url) : '',
      plans: planos.map(function (p) {
        return {
          label: p.nombre || 'Plano',
          url: p.url || '',
          extension: p.extension || ''
        };
      })
    };
  });
}

/**
 * Confirm LIVE Style Engine draft matches this project's official theme
 * (project_default_theme) before reinforcing cached state. Never use style names.
 */
function themeIdentityFingerprint(theme) {
  if (!theme || typeof theme !== 'object') return '';
  var keys = [
    'bg', 'accent', 'surface', 'menuColor', 'hoverColor', 'maskColor',
    'textMode', 'bgTextMode', 'visualDepth', 'panelGlass', 'bgGlass', 'buttonGlass',
    'borderGlass', 'shadowGlass', 'heroSurface', 'heroHoverColor', 'heroLayout',
    'buttonBorderColor', 'buttonHoverBorderColor', 'themeKey'
  ];
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (theme[key] == null || theme[key] === '') continue;
    parts.push(key + '=' + String(theme[key]).trim().toLowerCase());
  }
  return parts.join('|');
}

function isLiveOfficialThemeForCurrentProject() {
  var official = null;
  if (typeof ProjectThemeAuthority !== 'undefined' &&
      typeof ProjectThemeAuthority.getOfficialDraft === 'function') {
    official = ProjectThemeAuthority.getOfficialDraft();
  } else if (typeof ProjectThemeApi !== 'undefined' &&
      typeof ProjectThemeApi.getFromProject === 'function') {
    official = ProjectThemeApi.getFromProject(window.PROJECT_DATA);
  }
  if (!official) return false;

  if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
    official = ThemeSystem.normalizeCustomConfig(official);
  }

  var liveDraft = typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getPersonalizarDraft
    ? StyleEngineStore.getPersonalizarDraft()
    : null;
  if (!liveDraft) return false;

  if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
    liveDraft = ThemeSystem.normalizeCustomConfig(liveDraft);
  }

  var liveFp = themeIdentityFingerprint(liveDraft);
  var officialFp = themeIdentityFingerprint(official);
  return !!(liveFp && officialFp && liveFp === officialFp);
}

function applyProjectData(project) {
  window.__CASCADE_N = (window.__CASCADE_N || 0) + 1;
  console.log('[CASCADE]', 'applyProjectData', Date.now(), window.__CASCADE_N);
  console.log('[BOOT] applyProjectData START');
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/project-data.js :: applyProjectData');}catch(_bd){}
  try {

  window.__pdTrace('applyProjectData — start', project && (project.slug || project.nombre || project.id));
  PROJECT_DATA = project;
  window.__pdTrace('applyProjectData · buildConfig');
  CONFIG = buildConfig(project);
  if (typeof ProjectPresetThemes !== 'undefined' && ProjectPresetThemes.invalidateCache) {
    window.__pdTrace('applyProjectData · invalidateCache');
    ProjectPresetThemes.invalidateCache();
  }

  window.__pdTraceBlock('applyHeroModule', function () { applyHeroModule(project); });
  window.__pdTraceBlock('applyMenuModule', function () { applyMenuModule(project); });
  window.__pdTraceBlock('applyProjectVideoModule', function () { applyProjectVideoModule(project); });
  window.__pdTraceBlock('bindProjectVideoModal', function () { bindProjectVideoModal(); });
  window.__pdTraceBlock('applyProjectInfoModule', function () { applyProjectInfoModule(project); });
  window.__pdTraceBlock('applyConstructorModule', function () { applyConstructorModule(project); });
  window.__pdTraceBlock('applyAmenitiesModule', function () { applyAmenitiesModule(project); });
  window.__pdTraceBlock('buildProgressData', function () { buildProgressData(project); });
  window.__pdTraceBlock('buildDownloadsData', function () { buildDownloadsData(project); });
  window.__pdTraceBlock('buildTypologiesData', function () { buildTypologiesData(project); });
  window.__pdTraceBlock('buildUnitsData', function () { buildUnitsData(project); });

  if (typeof window.initProjectUI === 'function') {
    window.__pdTraceBlock('initProjectUI', function () { window.initProjectUI(); });
  } else {
    window.__pdTrace('initProjectUI — skip', 'función ausente');
  }

  if (typeof PauseScreen !== 'undefined') {
    window.__pdTraceBlock('PauseScreen.init', function () { PauseScreen.init(project); });
  } else {
    window.__pdTrace('PauseScreen.init — skip');
  }

    if (typeof ProjectThemeAuthority !== 'undefined') {
      if (typeof ProjectThemeAuthority.forceApplyOfficialTheme === 'function') {
        var skipForce = typeof ThemeSystem !== 'undefined' &&
          ThemeSystem.isExplicitUserChoice &&
          ThemeSystem.isExplicitUserChoice();
        var seLive = typeof StyleEngineCompatibility !== 'undefined' &&
          StyleEngineCompatibility.isStyleEngineLive &&
          StyleEngineCompatibility.isStyleEngineLive();
        /* Reinforce only when LIVE draft matches this project's official theme. */
        var officialLive =
          seLive && isLiveOfficialThemeForCurrentProject();

        if (officialLive && !skipForce) {
          if (typeof BootDebug !== 'undefined') BootDebug.log('theme: reinforcePublished');
          window.__pdTrace('theme branch · reinforcePublished');
          if (typeof StyleEngineRuntime !== 'undefined' && StyleEngineRuntime.reinforcePublished) {
            window.__pdTraceBlock('StyleEngineRuntime.reinforcePublished', function () {
              StyleEngineRuntime.reinforcePublished();
            });
          }
        } else if (!skipForce) {
          if (typeof BootDebug !== 'undefined') BootDebug.log('theme: forceApplyOfficialTheme');
          window.__pdTrace('theme branch · forceApplyOfficialTheme');
          try {
            window.__pdTraceBlock('ProjectThemeAuthority.forceApplyOfficialTheme', function () {
              ProjectThemeAuthority.forceApplyOfficialTheme();
            });
          } catch (themeErr) {
            window.__pdTraceError('forceApplyOfficialTheme', themeErr);
            if (typeof BootDebug !== 'undefined') BootDebug.error('forceApplyOfficialTheme', themeErr);
          }
        } else if (typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
            ProjectThemeAuthority.shouldApplyProjectDefault()) {
          if (typeof BootDebug !== 'undefined') BootDebug.log('theme: applyDefaultForCurrentVisitor');
          window.__pdTrace('theme branch · applyDefaultForCurrentVisitor');
          window.__pdTraceBlock('ProjectThemeAuthority.applyDefaultForCurrentVisitor', function () {
            ProjectThemeAuthority.applyDefaultForCurrentVisitor();
          });
        } else {
          window.__pdTrace('theme branch · none');
        }
      } else if (typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
          ProjectThemeAuthority.shouldApplyProjectDefault()) {
        window.__pdTrace('theme branch · applyDefault (no forceApply)');
        window.__pdTraceBlock('ProjectThemeAuthority.applyDefaultForCurrentVisitor', function () {
          ProjectThemeAuthority.applyDefaultForCurrentVisitor();
        });
      } else {
        window.__pdTrace('theme branch · ProjectThemeAuthority sin apply');
      }
    } else {
      window.__pdTrace('theme branch · deferred setTimeout (no ProjectThemeAuthority)');
      window.setTimeout(function () {
        if (typeof ProjectThemeAuthority !== 'undefined' &&
            typeof ProjectThemeAuthority.forceApplyOfficialTheme === 'function') {
          var skipDeferred = typeof ThemeSystem !== 'undefined' &&
            ThemeSystem.isExplicitUserChoice &&
            ThemeSystem.isExplicitUserChoice();
          if (!skipDeferred) {
            if (typeof StyleEngineCompatibility !== 'undefined' &&
                StyleEngineCompatibility.isStyleEngineLive &&
                StyleEngineCompatibility.isStyleEngineLive() &&
                isLiveOfficialThemeForCurrentProject() &&
                typeof StyleEngineRuntime !== 'undefined' &&
                StyleEngineRuntime.reinforcePublished) {
              StyleEngineRuntime.reinforcePublished();
              window.__pdTrace('deferred theme · reinforcePublished');
            } else {
              ProjectThemeAuthority.forceApplyOfficialTheme();
              window.__pdTrace('deferred theme · forceApplyOfficialTheme');
            }
            return;
          }
        }
        if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
          ThemeSystem.reapply();
          window.__pdTrace('deferred theme · ThemeSystem.reapply');
        }
      }, 0);
    }
  window.__pdTrace('applyProjectData — done');

  } finally {
  console.log('[BOOT] applyProjectData END');
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/project-data.js :: applyProjectData');}catch(_bd){}
  }
}

function showProjectLoadError(err) {
  var msg = (err && err.message) ? err.message : String(err || 'Error desconocido');
  window.__pdTraceError('showProjectLoadError', err);
  if (typeof BootDebug !== 'undefined') BootDebug.error('ProjectData', msg);
  else console.error('[ProjectData]', msg);

  var host = document.getElementById('projectCover') || document.body;
  if (!host) {
    window.__pdTrace('showProjectLoadError early return', 'sin host DOM');
    return;
  }
  var box = document.getElementById('projectLoadError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'projectLoadError';
    box.style.cssText = [
      'position:absolute',
      'left:16px',
      'right:16px',
      'top:20%',
      'z-index:50',
      'padding:16px 18px',
      'border-radius:12px',
      'background:rgba(80,0,0,0.92)',
      'color:#fff',
      'font:14px/1.45 system-ui,sans-serif',
      'text-align:center'
    ].join(';');
    host.appendChild(box);
  }
  box.textContent = 'No se pudo cargar el proyecto: ' + msg +
    ' Revisa la consola ([BOOT]) y que el slug ?proyecto= exista y esté publicado.';
}

function loadProjectData() {
  console.log('[BOOT] loadProjectData START');
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/project-data.js :: loadProjectData');}catch(_bd){}
  try {

  window.__pdTrace('loadProjectData — start');
  if (typeof BootDebug !== 'undefined') BootDebug.log('loadProjectData start');
  if (typeof fetchPublishedProject !== 'function') {
    window.__pdTrace('loadProjectData early return', 'fetchPublishedProject no definido');
    showProjectLoadError(new Error('fetchPublishedProject no definido (supabase-client.js)'));
    console.log('[BOOT] loadProjectData END');
    return Promise.resolve(null);
  }
  var run;
  try {
    window.__pdTrace('loadProjectData · antes del fetch');
    run = fetchPublishedProject();
    window.__pdTrace('loadProjectData · fetch invocado (promise pendiente)');
  } catch (syncErr) {
    window.__pdTraceError('loadProjectData sync throw', syncErr);
    showProjectLoadError(syncErr);
    window.__pdTrace('loadProjectData early return', 'tras syncErr');
    console.log('[BOOT] loadProjectData END');
    return Promise.resolve(null);
  }
  return Promise.resolve(run)
    .then(function (project) {
      window.__pdTrace('loadProjectData · después del fetch', project && (project.slug || project.nombre || project.id));
      if (typeof BootDebug !== 'undefined') BootDebug.log('applyProjectData start');
      try {
        applyProjectData(project);
      } catch (applyErr) {
        window.__pdTraceError('applyProjectData throw', applyErr);
        showProjectLoadError(applyErr);
        throw applyErr;
      }
      if (typeof BootDebug !== 'undefined') BootDebug.log('applyProjectData done / render inicial');
      /* CPU profile: pausa aquí con ?cpuprofile=1 — antes del bloqueo post-boot. */
      if (typeof BootCpuProfile !== 'undefined') BootCpuProfile.pause('after-applyProjectData');
      window.__pdTrace('loadProjectData — done');
      console.log('[BOOT] loadProjectData END');
      return project;
    })
    .catch(function (err) {
      window.__pdTraceError('loadProjectData promise catch', err);
      showProjectLoadError(err);
      console.log('[BOOT] loadProjectData END');
    });

  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/project-data.js :: loadProjectData');}catch(_bd){}
  }
}

if (typeof BootDebug !== 'undefined') BootDebug.log('project-data.js evaluating — calling loadProjectData()');
window.__pdTrace('project-data.js evaluating — calling loadProjectData()');
try {
  loadProjectData();
} catch (e) {
  window.__pdTraceError('loadProjectData() sync throw', e);
  if (typeof BootDebug !== 'undefined') BootDebug.error('loadProjectData() sync throw', e);
  else console.error(e);
}
if (typeof BootDebug !== 'undefined') BootDebug.log('project-data.js evaluating — loadProjectData() scheduled');
window.__pdTrace('project-data.js evaluating — loadProjectData() scheduled');

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/project-data.js');}catch(_e){}
