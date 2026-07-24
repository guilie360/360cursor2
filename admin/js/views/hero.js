/* Hero module — proyecto_config hero fields + live preview */
var HeroView = (function () {
  var rootEl = null;
  var projectChangeHandler = null;
  var state = {
    project: null,
    config: null,
    dirty: false
  };

  var DEFAULT_BTN_LEFT = 'Explorar';
  var DEFAULT_BTN_RIGHT = 'Iniciar';

  var MEDIA_RULES = {
    video: {
      field: 'video_hero_url',
      folder: 'hero/video',
      accept: 'video/mp4',
      maxBytes: 100 * 1024 * 1024,
      label: 'Video'
    },
    image: {
      field: 'imagen_hero_url',
      folder: 'hero/image',
      accept: 'image/png,image/jpeg,image/webp',
      maxBytes: 10 * 1024 * 1024,
      label: 'Imagen'
    }
  };

  function getActiveProjectId() {
    return AdminState.getActiveProjectId();
  }

  function getFormValues() {
    var form = rootEl.querySelector('#heroForm');
    if (!form) return null;
    return {
      nombre_proyecto: form.nombre_proyecto.value,
      titulo_hero: form.nombre_proyecto.value,
      texto_hero: form.texto_hero.value,
      boton_hero_2: form.boton_hero_2.value,
      boton_hero_1: form.boton_hero_1.value,
      logo_url: state.config.logo_url || null,
      video_hero_url: (function () {
        var url = state.config.video_hero_url || null;
        if (!url) return null;
        if (typeof isRemoteHeroVideoUrl === 'function' && isRemoteHeroVideoUrl(url)) return null;
        if (typeof sanitizeHeroVideoUrl === 'function') return sanitizeHeroVideoUrl(url);
        return null;
      })(),
      imagen_hero_url: state.config.imagen_hero_url || null,
      color_fondo: state.config.color_fondo || '#0A0A0A',
      color_accento: state.config.color_accento || '#FF3B30'
    };
  }

  function validatePayload(payload) {
    if (!payload.nombre_proyecto || !String(payload.nombre_proyecto).trim()) {
      return 'El nombre del proyecto es obligatorio.';
    }
    if (payload.nombre_proyecto && payload.nombre_proyecto.length > 120) {
      return 'El nombre del proyecto no puede superar 120 caracteres.';
    }
    if (payload.texto_hero && payload.texto_hero.length > 220) {
      return 'El eslogan no puede superar 220 caracteres.';
    }
    if (payload.boton_hero_2 && payload.boton_hero_2.length > 40) {
      return 'El texto del botón izquierdo no puede superar 40 caracteres.';
    }
    if (payload.boton_hero_1 && payload.boton_hero_1.length > 40) {
      return 'El texto del botón derecho no puede superar 40 caracteres.';
    }
    return '';
  }

  function setFormMessage(message, type) {
    var el = rootEl.querySelector('#heroFormMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'admin-form-message' + (type ? ' ' + type : '');
  }

  function getPreviewTagline(values) {
    if (!state.project) return '';
    return formatHeroSubtitle(state.project.ciudad, state.project.estado, values.texto_hero);
  }

  function getDisplayName(values) {
    return (values && values.nombre_proyecto && String(values.nombre_proyecto).trim()) ||
      (state.config && state.config.titulo_hero) ||
      (state.project && state.project.nombre) ||
      '';
  }

  function updatePreview() {
    if (!rootEl || !state.project) return;
    var values = getFormValues();
    if (!values) return;

    var preview = rootEl.querySelector('#heroPreview');
    if (!preview) return;

    var bg = values.color_fondo || '#0A0A0A';
    var accent = values.color_accento || '#FF3B30';
    preview.style.setProperty('--hero-preview-bg', bg);
    preview.style.setProperty('--hero-preview-accent', accent);

    var nameEl = preview.querySelector('.hero-preview-name');
    var taglineEl = preview.querySelector('.hero-preview-tagline');
    var logoEl = preview.querySelector('.hero-preview-logo');
    var videoEl = preview.querySelector('.hero-preview-video');
    var videoSource = preview.querySelector('.hero-preview-video source');
    var imageEl = preview.querySelector('.hero-preview-image');
    var btnLeft = preview.querySelector('.hero-preview-btn-left');
    var btnRight = preview.querySelector('.hero-preview-btn-right');

    if (nameEl) nameEl.textContent = getDisplayName(values);
    if (taglineEl) taglineEl.textContent = getPreviewTagline(values);
    if (btnLeft) btnLeft.textContent = values.boton_hero_2 || DEFAULT_BTN_LEFT;
    if (btnRight) btnRight.textContent = values.boton_hero_1 || DEFAULT_BTN_RIGHT;

    if (logoEl) {
      if (values.logo_url) {
        logoEl.src = values.logo_url;
        logoEl.style.display = 'block';
      } else {
        logoEl.removeAttribute('src');
        logoEl.style.display = 'none';
      }
    }

    /* TEMP egress: nunca asignar video_hero_url remoto a <video> */
    if (videoEl) {
      videoEl.style.display = 'none';
      try { videoEl.pause(); } catch (eV) { /* ignore */ }
      if (videoSource) {
        videoSource.removeAttribute('src');
        try { videoSource.src = ''; } catch (eS) { /* ignore */ }
      }
      videoEl.removeAttribute('src');
    }
    if (imageEl) {
      if (values.imagen_hero_url) {
        imageEl.src = values.imagen_hero_url;
        imageEl.style.display = 'block';
      } else {
        imageEl.removeAttribute('src');
        imageEl.style.display = 'none';
      }
    }
    if (preview) {
      preview.classList.toggle('is-ambient-depth', !values.imagen_hero_url);
    }

    var accentSwatch = rootEl.querySelector('#heroAccentSwatch');
    if (accentSwatch) accentSwatch.style.background = accent;
  }

  function renderMediaField(key, config) {
    var rule = MEDIA_RULES[key];
    var url = config[rule.field];
    var hasRemoteVideo =
      key === 'video' && url &&
      (typeof isRemoteHeroVideoUrl === 'function'
        ? isRemoteHeroVideoUrl(url)
        : /^https?:\/\//i.test(String(url)));
    var playableVideo =
      key === 'video' && url &&
      (typeof sanitizeHeroVideoUrl === 'function' ? sanitizeHeroVideoUrl(url) : null);
    var hasMedia = key === 'video' ? !!playableVideo : !!url;

    var previewHtml;
    if (key === 'video') {
      if (playableVideo) {
        previewHtml =
          '<video src="' + AdminUI.escapeHtml(playableVideo) +
          '" muted playsinline controls class="hero-media-thumb"></video>';
      } else if (hasRemoteVideo) {
        previewHtml =
          '<div class="hero-media-ambient-placeholder" role="img" aria-label="Fondo ambient">' +
            '<span class="hero-media-ambient-title">Video remoto desactivado</span>' +
            '<span class="hero-media-ambient-hint">Sube un archivo local para previsualizar</span>' +
          '</div>';
      } else {
        previewHtml = '<span class="hero-media-empty">Sin archivo</span>';
      }
    } else if (url) {
      previewHtml = '<img src="' + AdminUI.escapeHtml(url) + '" alt="" class="hero-media-thumb">';
    } else {
      previewHtml = '<span class="hero-media-empty">Sin archivo</span>';
    }

    return (
      '<div class="hero-media-field" data-media="' + key + '">' +
        '<div class="hero-media-head">' +
          '<label>' + rule.label + '</label>' +
          ((hasMedia || hasRemoteVideo)
            ? '<button type="button" class="btn-ghost btn-compact" data-action="remove-media" data-media="' + key + '">Eliminar</button>'
            : '') +
        '</div>' +
        '<div class="hero-media-preview" id="mediaPreview-' + key + '">' +
          previewHtml +
        '</div>' +
        '<label class="btn-ghost btn-compact hero-upload-btn">' +
          '<input type="file" accept="' + rule.accept + '" data-upload="' + key + '" hidden>' +
          ((hasMedia || hasRemoteVideo) ? 'Reemplazar' : 'Subir') +
        '</label>' +
        '<div class="admin-help" id="mediaStatus-' + key + '"></div>' +
      '</div>'
    );
  }

  function renderEditor() {
    var config = state.config;
    var project = state.project;
    var publicUrl = project.slug
      ? window.location.origin + '/?proyecto=' + encodeURIComponent(project.slug)
      : '';
    var projectName = config.titulo_hero || project.nombre || '';
    var btnLeft = config.boton_hero_2 || DEFAULT_BTN_LEFT;
    var btnRight = config.boton_hero_1 || DEFAULT_BTN_RIGHT;

    return (
      '<div class="section-header">' +
        '<h1>Hero</h1>' +
        '<p>Configura la portada del proyecto <strong>' + AdminUI.escapeHtml(project.nombre) + '</strong>.</p>' +
        (publicUrl
          ? '<p class="admin-help"><a class="admin-link" href="' + AdminUI.escapeHtml(publicUrl) + '" target="_blank" rel="noopener">Ver showroom público</a></p>'
          : '') +
      '</div>' +
      '<div class="hero-editor-layout">' +
        '<form id="heroForm" class="panel-card hero-form" novalidate>' +
          '<div class="panel-card-title">Fondo</div>' +
          renderMediaField('video', config) +
          renderMediaField('image', config) +
          '<div class="admin-help hero-media-note">Sube un video o una imagen. Solo uno se usa como fondo del Hero (el video tiene prioridad).</div>' +
          '<div class="panel-card-title hero-media-title">Contenido</div>' +
          '<div class="admin-field admin-field-full">' +
            '<label for="heroNombre">Nombre del proyecto</label>' +
            '<input class="admin-input" id="heroNombre" name="nombre_proyecto" maxlength="120" ' +
              'placeholder="PROYECTO DEMO" ' +
              'value="' + AdminUI.escapeHtml(projectName) + '" required>' +
          '</div>' +
          '<div class="admin-field admin-field-full">' +
            '<label for="heroEslogan">Eslogan</label>' +
            '<input class="admin-input" id="heroEslogan" name="texto_hero" maxlength="220" ' +
              'placeholder="Proyecto Demo" ' +
              'value="' + AdminUI.escapeHtml(config.texto_hero || '') + '">' +
          '</div>' +
          '<div class="admin-form-grid">' +
            '<div class="admin-field">' +
              '<label for="heroBtnLeft">Texto botón izquierdo</label>' +
              '<input class="admin-input" id="heroBtnLeft" name="boton_hero_2" maxlength="40" ' +
                'placeholder="' + DEFAULT_BTN_LEFT + '" ' +
                'value="' + AdminUI.escapeHtml(btnLeft) + '">' +
            '</div>' +
            '<div class="admin-field">' +
              '<label for="heroBtnRight">Texto botón derecho</label>' +
              '<input class="admin-input" id="heroBtnRight" name="boton_hero_1" maxlength="40" ' +
                'placeholder="' + DEFAULT_BTN_RIGHT + '" ' +
                'value="' + AdminUI.escapeHtml(btnRight) + '">' +
            '</div>' +
          '</div>' +
          '<div class="hero-form-actions">' +
            '<button type="submit" class="btn-primary btn-compact" id="heroSaveBtn">Guardar cambios</button>' +
          '</div>' +
          '<div class="admin-form-message" id="heroFormMessage" role="alert"></div>' +
        '</form>' +
        '<div class="panel-card hero-preview-card">' +
          '<div class="panel-card-title">Vista previa en vivo</div>' +
          '<div class="hero-preview" id="heroPreview">' +
            '<video class="hero-preview-video" muted loop playsinline><source class="hero-preview-video-source"></video>' +
            '<img class="hero-preview-image" alt="">' +
            '<div class="hero-preview-overlay"></div>' +
            '<div class="hero-preview-content">' +
              '<img class="hero-preview-logo" alt="">' +
              '<div class="hero-preview-name"></div>' +
              '<div class="hero-preview-tagline"></div>' +
              '<div class="hero-preview-buttons">' +
                '<span class="hero-preview-btn hero-preview-btn-left">' + AdminUI.escapeHtml(btnLeft) + '</span>' +
                '<span class="hero-preview-btn primary hero-preview-btn-right">' + AdminUI.escapeHtml(btnRight) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="hero-preview-meta">' +
            '<span>Acento</span>' +
            '<span class="hero-accent-swatch" id="heroAccentSwatch"></span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function setMediaStatus(key, message, type) {
    var el = rootEl.querySelector('#mediaStatus-' + key);
    if (!el) return;
    el.textContent = message || '';
    el.className = 'admin-help' + (type ? ' ' + type : '');
  }

  function updateMediaPreview(key, url) {
    var preview = rootEl.querySelector('#mediaPreview-' + key);
    if (!preview) return;
    if (!url) {
      preview.innerHTML = '<span class="hero-media-empty">Sin archivo</span>';
      return;
    }
    if (key === 'video') {
      var playable =
        typeof sanitizeHeroVideoUrl === 'function' ? sanitizeHeroVideoUrl(url) : null;
      if (playable) {
        preview.innerHTML =
          '<video src="' + AdminUI.escapeHtml(playable) +
          '" muted playsinline controls class="hero-media-thumb"></video>';
      } else {
        preview.innerHTML =
          '<div class="hero-media-ambient-placeholder" role="img" aria-label="Fondo ambient">' +
            '<span class="hero-media-ambient-title">Video remoto desactivado</span>' +
            '<span class="hero-media-ambient-hint">Sube un archivo local para previsualizar</span>' +
          '</div>';
      }
      return;
    }
    preview.innerHTML = '<img src="' + AdminUI.escapeHtml(url) + '" alt="" class="hero-media-thumb">';
  }

  function refreshMediaFieldChrome(key) {
    var field = rootEl.querySelector('.hero-media-field[data-media="' + key + '"]');
    if (!field || !state.config) return;
    var rule = MEDIA_RULES[key];
    var url = state.config[rule.field];
    var head = field.querySelector('.hero-media-head');
    var uploadLabel = field.querySelector('.hero-upload-btn');
    if (head) {
      var removeBtn = head.querySelector('[data-action="remove-media"]');
      if (url && !removeBtn) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-ghost btn-compact';
        btn.setAttribute('data-action', 'remove-media');
        btn.setAttribute('data-media', key);
        btn.textContent = 'Eliminar';
        btn.addEventListener('click', function () {
          handleRemoveMedia(key);
        });
        head.appendChild(btn);
      } else if (!url && removeBtn) {
        removeBtn.remove();
      }
    }
    if (uploadLabel) {
      var input = uploadLabel.querySelector('input[data-upload]');
      uploadLabel.childNodes.forEach(function (node) {
        if (node.nodeType === 3) node.textContent = '';
      });
      uploadLabel.appendChild(document.createTextNode(url ? 'Reemplazar' : 'Subir'));
      if (input && !uploadLabel.contains(input)) uploadLabel.insertBefore(input, uploadLabel.firstChild);
    }
  }

  function validateFile(key, file) {
    var rule = MEDIA_RULES[key];
    if (!file) return 'Archivo no válido.';
    if (file.size > rule.maxBytes) {
      return rule.label + ' supera el tamaño máximo permitido.';
    }
    var accepted = rule.accept.split(',').map(function (t) { return t.trim(); });
    if (accepted.indexOf(file.type) === -1) {
      return 'Tipo de archivo no permitido para ' + rule.label.toLowerCase() + '.';
    }
    return '';
  }

  async function clearOppositeMedia(key) {
    var oppositeKey = key === 'video' ? 'image' : 'video';
    var oppositeRule = MEDIA_RULES[oppositeKey];
    var previousUrl = state.config[oppositeRule.field];
    if (!previousUrl) return null;

    state.config[oppositeRule.field] = null;
    updateMediaPreview(oppositeKey, null);
    refreshMediaFieldChrome(oppositeKey);
    return previousUrl;
  }

  async function handleUpload(key, file) {
    var rule = MEDIA_RULES[key];
    var validation = validateFile(key, file);
    if (validation) {
      AdminNotify.error(validation);
      return;
    }

    setMediaStatus(key, 'Subiendo...', 'loading');

    try {
      var previousUrl = state.config[rule.field];
      var oppositeUrl = await clearOppositeMedia(key);
      var uploaded = await StorageApi.upload(
        state.project.constructora_id,
        state.project.id,
        rule.folder,
        file
      );

      state.config[rule.field] = uploaded.publicUrl;
      updateMediaPreview(key, uploaded.publicUrl);
      refreshMediaFieldChrome(key);

      var payload = getFormValues();
      payload[rule.field] = uploaded.publicUrl;
      if (key === 'video') payload.imagen_hero_url = null;
      if (key === 'image') payload.video_hero_url = null;
      await HeroApi.upsert(state.project.id, payload);

      setMediaStatus(key, 'Archivo guardado.', 'success');
      state.dirty = false;
      updatePreview();

      var cleanupUrls = [];
      if (previousUrl && previousUrl !== uploaded.publicUrl) cleanupUrls.push(previousUrl);
      if (oppositeUrl) cleanupUrls.push(oppositeUrl);
      for (var i = 0; i < cleanupUrls.length; i++) {
        try {
          await StorageApi.removeByUrl(cleanupUrls[i]);
        } catch (deleteErr) {
          console.warn('[HeroView] cleanup:', deleteErr.message);
        }
      }

      AdminNotify.success(rule.label + ' subido correctamente.');
    } catch (err) {
      setMediaStatus(key, err.message || 'Error al subir.', 'error');
      AdminNotify.error(err.message || 'No se pudo subir el archivo.');
    }
  }

  async function handleRemoveMedia(key) {
    var rule = MEDIA_RULES[key];
    var currentUrl = state.config[rule.field];
    if (!currentUrl) return;

    var confirmed = await AdminUI.confirm({
      title: 'Eliminar ' + rule.label.toLowerCase(),
      message: '¿Eliminar este archivo del hero? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar'
    });
    if (!confirmed) return;

    try {
      state.config[rule.field] = null;
      var payload = getFormValues();
      payload[rule.field] = null;
      await HeroApi.upsert(state.project.id, payload);
      await StorageApi.removeByUrl(currentUrl);
      updateMediaPreview(key, null);
      refreshMediaFieldChrome(key);
      updatePreview();
      AdminNotify.success(rule.label + ' eliminado.');
      await loadHero();
    } catch (err) {
      AdminNotify.error(err.message || 'No se pudo eliminar el archivo.');
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    var saveBtn = rootEl.querySelector('#heroSaveBtn');
    var payload = getFormValues();
    var validation = validatePayload(payload);
    if (validation) {
      setFormMessage(validation, 'error');
      return;
    }

    if (!payload.boton_hero_2) payload.boton_hero_2 = DEFAULT_BTN_LEFT;
    if (!payload.boton_hero_1) payload.boton_hero_1 = DEFAULT_BTN_RIGHT;

    setFormMessage('');
    AdminUI.setButtonLoading(saveBtn, true, 'Guardando...');

    try {
      var saved = await HeroApi.upsert(state.project.id, payload);
      state.config = Object.assign({}, state.config, saved);
      state.project.nombre = payload.nombre_proyecto.trim();
      state.dirty = false;

      AdminNotify.success('Hero guardado correctamente.');
      updatePreview();
    } catch (err) {
      setFormMessage(err.message || 'No se pudo guardar.', 'error');
      AdminNotify.error(err.message || 'No se pudo guardar el hero.');
    } finally {
      AdminUI.setButtonLoading(saveBtn, false);
    }
  }

  function bindFormEvents() {
    var form = rootEl.querySelector('#heroForm');
    form.addEventListener('submit', handleSave);

    form.addEventListener('input', function (event) {
      if (event.target.name) {
        state.dirty = true;
        updatePreview();
      }
    });

    rootEl.querySelectorAll('[data-upload]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        handleUpload(input.getAttribute('data-upload'), file);
      });
    });

    rootEl.querySelectorAll('[data-action="remove-media"]').forEach(function (button) {
      button.addEventListener('click', function () {
        handleRemoveMedia(button.getAttribute('data-media'));
      });
    });
  }

  async function loadHero() {
    var projectId = getActiveProjectId();
    if (!projectId) {
      rootEl.innerHTML =
        '<div class="section-header"><h1>Hero</h1></div>' +
        AdminUI.renderEmptyState('Sin proyecto activo', 'Selecciona un proyecto en el header para editar el hero.');
      return;
    }

    rootEl.innerHTML = AdminUI.renderLoadingBlock('Cargando hero...');

    try {
      var data = await HeroApi.getForProject(projectId);
      state.project = data.project;
      state.config = data.config || {};
      /* TEMP egress: no conservar URL remota de vídeo en el editor */
      if (
        state.config.video_hero_url &&
        typeof isRemoteHeroVideoUrl === 'function' &&
        isRemoteHeroVideoUrl(state.config.video_hero_url)
      ) {
        state.config.video_hero_url = null;
      }
      state.dirty = false;
      rootEl.innerHTML = renderEditor();
      bindFormEvents();
      updatePreview();
    } catch (err) {
      rootEl.innerHTML =
        '<div class="section-header"><h1>Hero</h1></div>' +
        AdminUI.renderEmptyState('Error al cargar', err.message || 'Intenta de nuevo.');
      AdminNotify.error(err.message || 'Error cargando hero.');
    }
  }

  async function render(container) {
    rootEl = container;
    projectChangeHandler = function () {
      loadHero();
    };
    window.addEventListener('admin:project-changed', projectChangeHandler);
    await loadHero();
  }

  function onLeave() {
    if (projectChangeHandler) {
      window.removeEventListener('admin:project-changed', projectChangeHandler);
      projectChangeHandler = null;
    }
  }

  return {
    render: render,
    onLeave: onLeave
  };
})();
