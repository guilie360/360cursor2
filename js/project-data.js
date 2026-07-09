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

function applyHeroModule(project) {
  var config = project.proyecto_config || {};
  var constructora = project.constructoras || {};

  var nameEl = document.getElementById('projectCoverName');
  if (nameEl) nameEl.textContent = config.titulo_hero || project.nombre || '';

  var taglineEl = document.getElementById('projectCoverTagline');
  if (taglineEl) {
    taglineEl.textContent = formatHeroSubtitle(project.ciudad, project.estado, config.texto_hero);
  }

  var btn360 = document.getElementById('tour360OpenBtn');
  if (btn360) btn360.textContent = config.boton_hero_1 || 'Ver 360°';

  var btnExplore = document.getElementById('mainMenuOpenBtn');
  if (btnExplore) {
    var exploreLabel = config.boton_hero_2 || 'Explorar';
    btnExplore.innerHTML = '<span class="menu-btn-icon">☰</span>' + exploreLabel;
  }

  applyHeroTextColors(config);

  var logoEl = document.getElementById('projectCoverLogo');
  var logoUrl = config.logo_url || constructora.logo_url || null;
  if (logoEl) {
    if (logoUrl) {
      logoEl.src = logoUrl;
      logoEl.alt = project.nombre || 'Logo';
      logoEl.style.display = 'block';
    } else {
      logoEl.removeAttribute('src');
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

function applyProjectVideoModule(project) {
  var config = getProjectConfig(project);
  var player = document.getElementById('projectVideoPlayer');
  var sourceEl = document.getElementById('projectVideoSource');
  if (!player || !sourceEl) return;

  if (config.video_hero_url) {
    setProjectVideoSource(player, sourceEl, config.video_hero_url, guessVideoMimeType(config.video_hero_url));
    return;
  }

  resolveBlackPlaceholderVideoUrl().then(function (blobUrl) {
    if (blobUrl) setProjectVideoSource(player, sourceEl, blobUrl, 'video/webm');
  });
}

function bindProjectVideoModal() {
  var modal = document.getElementById('videoModal');
  var player = document.getElementById('projectVideoPlayer');
  if (!modal || !player || bindProjectVideoModal.bound) return;
  bindProjectVideoModal.bound = true;

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function () {
      if (!modal.classList.contains('active')) {
        player.pause();
        try { player.currentTime = 0; } catch (e) { /* ignore */ }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
}

function buildConfig(project) {
  var constructora = project.constructoras || {};
  var config = project.proyecto_config || {};
  var phone = project.whatsapp || constructora.telefono || '';
  var phoneHref = phone.replace(/\s+/g, '');
  var mapsUrl = buildMapsUrl(project.latitud, project.longitud, project.direccion || project.ciudad);
  var constructoraWebUrl = ensureHttpUrl(constructora.sitio_web || project.sitio_web || '');
  var email = project.email || constructora.email || '';
  var instagramUrl = ensureHttpUrl(project.instagram_url || '');

  return {
    projectName: project.nombre || '',
    constructoraName: constructora.nombre || '',
    tagline: formatHeroSubtitle(project.ciudad, project.estado, config.texto_hero),
    whatsappPhone: phoneHref,
    whatsappDefaultMessage: 'Hola, quiero más información sobre ' + (project.nombre || 'el proyecto') + '.',
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
    if (project.latitud != null && project.longitud != null) {
      locationBox.innerHTML = '<iframe title="Mapa del proyecto" src="https://maps.google.com/maps?q=' +
        project.latitud + ',' + project.longitud + '&z=15&output=embed" width="100%" height="100%" style="border:0;" loading="lazy"></iframe>';
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
  var list = document.getElementById('amenitiesList');
  if (!list) return;
  list.innerHTML = '';

  var items = project.proyecto_amenidades || [];
  items.forEach(function (row) {
    var amenidad = row.amenidades || {};
    var li = document.createElement('li');
    li.textContent = amenidad.nombre || '';
    if (row.descripcion) li.title = row.descripcion;
    list.appendChild(li);
  });
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
      cardLabel: imagen ? (imagen.nombre || v.nombre) : v.nombre,
      cardImageUrl: imagen ? (imagen.miniatura_url || imagen.url) : '',
      plans: planos.map(function (p) {
        return { label: p.nombre || 'Plano', url: p.url || '' };
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

    if (typeof ProjectThemeAuthority !== 'undefined' &&
        typeof ProjectThemeAuthority.shouldApplyProjectDefault === 'function' &&
        ProjectThemeAuthority.shouldApplyProjectDefault()) {
      ProjectThemeAuthority.applyDefaultForCurrentVisitor();
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
