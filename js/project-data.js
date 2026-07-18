/* =========================================================
   PROJECT DATA — Dashboard is the single source of truth
   Loads all modules from Supabase and hydrates the UI
   ========================================================= */

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
  var showWa = config.show_whatsapp_float !== false;
  var showShare = config.show_share_float !== false;
  var waFloat = document.getElementById('whatsappFloat');
  var shareFloat = document.getElementById('shareProjectFloatBtn');
  if (waFloat) {
    waFloat.hidden = !showWa;
    waFloat.classList.toggle('is-float-hidden', !showWa);
    waFloat.setAttribute('aria-hidden', showWa ? 'false' : 'true');
  }
  if (shareFloat) {
    shareFloat.hidden = !showShare;
    shareFloat.classList.toggle('is-float-hidden', !showShare);
    shareFloat.setAttribute('aria-hidden', showShare ? 'false' : 'true');
  }
}

function applyHeroModule(project) {
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
    btnExplore.innerHTML = '<span class="menu-btn-icon">☰</span>' + exploreLabel;
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

  if (config.video_hero_url && videoEl && sourceEl) {
    sourceEl.src = config.video_hero_url;
    videoEl.style.display = '';
    videoEl.load();
    videoEl.muted = true;
    videoEl.play().catch(function () {});
    if (imageEl) imageEl.style.display = 'none';
  } else {
    if (videoEl) videoEl.style.display = 'none';
    if (config.imagen_hero_url && imageEl) {
      imageEl.src = config.imagen_hero_url;
      imageEl.style.display = '';
    } else if (imageEl) {
      imageEl.style.display = 'none';
    }
  }
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

  syncProjectVideoPoster(player, config);

  if (config.video_hero_url) {
    setProjectVideoSource(player, sourceEl, config.video_hero_url, guessVideoMimeType(config.video_hero_url));
    return;
  }

  resolveBlackPlaceholderVideoUrl().then(function (blobUrl) {
    if (blobUrl) setProjectVideoSource(player, sourceEl, blobUrl, 'video/webm');
  });
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
    if (document.fullscreenElement === target || document.webkitFullscreenElement === target) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
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
      description: row.descripcion || ''
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

function applyProjectData(project) {
  PROJECT_DATA = project;
  CONFIG = buildConfig(project);
  if (typeof ProjectPresetThemes !== 'undefined' && ProjectPresetThemes.invalidateCache) {
    ProjectPresetThemes.invalidateCache();
  }

  applyHeroModule(project);
  applyMenuModule(project);
  applyProjectVideoModule(project);
  bindProjectVideoModal();
  applyProjectInfoModule(project);
  applyConstructorModule(project);
  applyAmenitiesModule(project);
  buildProgressData(project);
  buildDownloadsData(project);
  buildTypologiesData(project);
  buildUnitsData(project);

  if (typeof window.initProjectUI === 'function') {
    window.initProjectUI();
  }

  if (typeof PauseScreen !== 'undefined') {
    PauseScreen.init(project);
  }

    if (typeof ProjectThemeAuthority !== 'undefined') {
      if (typeof ProjectThemeAuthority.forceApplyOfficialTheme === 'function') {
        var skipForce = typeof ThemeSystem !== 'undefined' &&
          ThemeSystem.isExplicitUserChoice &&
          ThemeSystem.isExplicitUserChoice();
        var activeMeta = typeof StyleEngineStore !== 'undefined' && StyleEngineStore.getActiveStyleMeta
          ? StyleEngineStore.getActiveStyleMeta()
          : null;
        var activeIsHall = activeMeta &&
          String(activeMeta.name || '').replace(/\s+/g, '').toUpperCase() === 'HALL';
        var seLive = typeof StyleEngineCompatibility !== 'undefined' &&
          StyleEngineCompatibility.isStyleEngineLive &&
          StyleEngineCompatibility.isStyleEngineLive();

        /* Si HALL ya está LIVE, solo reforzar materiales (sin re-publicar el store). */
        if (activeIsHall && seLive && !skipForce) {
          if (typeof StyleEngineRuntime !== 'undefined' && StyleEngineRuntime.reinforcePublished) {
            StyleEngineRuntime.reinforcePublished();
          }
        } else if (!skipForce || activeIsHall) {
          ProjectThemeAuthority.forceApplyOfficialTheme();
        } else if (typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
            ProjectThemeAuthority.shouldApplyProjectDefault()) {
          ProjectThemeAuthority.applyDefaultForCurrentVisitor();
        }
      } else if (typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
          ProjectThemeAuthority.shouldApplyProjectDefault()) {
        ProjectThemeAuthority.applyDefaultForCurrentVisitor();
      }
    } else {
      window.setTimeout(function () {
        if (typeof StyleEngineCompatibility !== 'undefined' &&
            StyleEngineCompatibility.isStyleEngineLive()) {
          if (typeof StyleEngineRuntime !== 'undefined') StyleEngineRuntime.reinforcePublished();
          return;
        }
        if (typeof ThemeSystem !== 'undefined' && typeof ThemeSystem.reapply === 'function') {
          ThemeSystem.reapply();
        }
      }, 0);
    }
}

function loadProjectData() {
  return fetchPublishedProject()
    .then(applyProjectData)
    .catch(function (err) {
      console.error('[ProjectData]', err.message || err);
    });
}

loadProjectData();
