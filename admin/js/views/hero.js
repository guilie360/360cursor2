/* Hero module — proyecto_config hero fields + live preview */
var HeroView = (function () {
  var rootEl = null;
  var projectChangeHandler = null;
  var state = {
    project: null,
    config: null,
    dirty: false
  };

  var MEDIA_RULES = {
    logo: {
      field: 'logo_url',
      folder: 'hero/logo',
      accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
      maxBytes: 2 * 1024 * 1024,
      label: 'Logo'
    },
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
      texto_hero: form.texto_hero.value,
      color_fondo: form.color_fondo.value,
      color_accento: form.color_accento.value,
      logo_url: state.config.logo_url || null,
      video_hero_url: state.config.video_hero_url || null,
      imagen_hero_url: state.config.imagen_hero_url || null
    };
  }

  function validatePayload(payload) {
    if (payload.texto_hero && payload.texto_hero.length > 220) {
      return 'El texto del hero no puede superar 220 caracteres.';
    }
    if (!AdminUI.isValidHexColor(payload.color_fondo)) {
      return 'El color de fondo debe ser un hexadecimal válido (#RRGGBB).';
    }
    if (!AdminUI.isValidHexColor(payload.color_accento)) {
      return 'El color de acento debe ser un hexadecimal válido (#RRGGBB).';
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

    if (nameEl) nameEl.textContent = state.project.nombre || '';
    if (taglineEl) taglineEl.textContent = getPreviewTagline(values);

    if (logoEl) {
      if (values.logo_url) {
        logoEl.src = values.logo_url;
        logoEl.style.display = 'block';
      } else {
        logoEl.removeAttribute('src');
        logoEl.style.display = 'none';
      }
    }

    if (values.video_hero_url && videoEl && videoSource) {
      videoSource.src = values.video_hero_url;
      videoEl.style.display = 'block';
      videoEl.load();
      videoEl.muted = true;
      videoEl.play().catch(function () {});
      if (imageEl) imageEl.style.display = 'none';
    } else {
      if (videoEl) videoEl.style.display = 'none';
      if (imageEl) {
        if (values.imagen_hero_url) {
          imageEl.src = values.imagen_hero_url;
          imageEl.style.display = 'block';
        } else {
          imageEl.removeAttribute('src');
          imageEl.style.display = 'none';
        }
      }
    }

    var accentSwatch = rootEl.querySelector('#heroAccentSwatch');
    if (accentSwatch) accentSwatch.style.background = accent;
  }

  function renderMediaField(key, config) {
    var rule = MEDIA_RULES[key];
    var url = config[rule.field];
    var hasMedia = !!url;

    return (
      '<div class="hero-media-field" data-media="' + key + '">' +
        '<div class="hero-media-head">' +
          '<label>' + rule.label + '</label>' +
          (hasMedia
            ? '<button type="button" class="btn-ghost btn-compact" data-action="remove-media" data-media="' + key + '">Eliminar</button>'
            : '') +
        '</div>' +
        '<div class="hero-media-preview" id="mediaPreview-' + key + '">' +
          (hasMedia
            ? (key === 'video'
              ? '<video src="' + AdminUI.escapeHtml(url) + '" muted playsinline controls class="hero-media-thumb"></video>'
              : '<img src="' + AdminUI.escapeHtml(url) + '" alt="" class="hero-media-thumb">')
            : '<span class="hero-media-empty">Sin archivo</span>') +
        '</div>' +
        '<label class="btn-ghost btn-compact hero-upload-btn">' +
          '<input type="file" accept="' + rule.accept + '" data-upload="' + key + '" hidden>' +
          (hasMedia ? 'Reemplazar' : 'Subir') +
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

    return (
      '<div class="section-header">' +
        '<h1>Hero</h1>' +
        '<p>Configura la portada del proyecto <strong>' + AdminUI.escapeHtml(project.nombre) + '</strong>. ' +
        'Nombre y ciudad se editan en Proyectos.</p>' +
        (publicUrl
          ? '<p class="admin-help"><a class="admin-link" href="' + AdminUI.escapeHtml(publicUrl) + '" target="_blank" rel="noopener">Ver showroom público</a></p>'
          : '') +
      '</div>' +
      '<div class="hero-editor-layout">' +
        '<form id="heroForm" class="panel-card hero-form" novalidate>' +
          '<div class="panel-card-title">Contenido</div>' +
          '<div class="admin-field admin-field-full">' +
            '<label for="heroTexto">Texto del hero</label>' +
            '<input class="admin-input" id="heroTexto" name="texto_hero" maxlength="220" ' +
              'placeholder="Si está vacío, se usa ciudad + estado del proyecto" ' +
              'value="' + AdminUI.escapeHtml(config.texto_hero || '') + '">' +
            '<div class="admin-help">Máximo 220 caracteres. Sobrescribe el subtítulo automático.</div>' +
          '</div>' +
          '<div class="admin-form-grid">' +
            '<div class="admin-field">' +
              '<label for="heroColorFondo">Color de fondo</label>' +
              '<div class="hero-color-input">' +
                '<input type="color" id="heroColorFondoPicker" value="' + AdminUI.escapeHtml(config.color_fondo || '#0A0A0A') + '">' +
                '<input class="admin-input" id="heroColorFondo" name="color_fondo" value="' + AdminUI.escapeHtml(config.color_fondo || '#0A0A0A') + '">' +
              '</div>' +
            '</div>' +
            '<div class="admin-field">' +
              '<label for="heroColorAccent">Color de acento</label>' +
              '<div class="hero-color-input">' +
                '<input type="color" id="heroColorAccentPicker" value="' + AdminUI.escapeHtml(config.color_accento || '#FF3B30') + '">' +
                '<input class="admin-input" id="heroColorAccent" name="color_accento" value="' + AdminUI.escapeHtml(config.color_accento || '#FF3B30') + '">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="panel-card-title hero-media-title">Medios</div>' +
          renderMediaField('logo', config) +
          renderMediaField('video', config) +
          renderMediaField('image', config) +
          '<div class="admin-help hero-media-note">El video tiene prioridad sobre la imagen en el showroom.</div>' +
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
                '<span class="hero-preview-btn primary">Ver 360°</span>' +
                '<span class="hero-preview-btn">Menú</span>' +
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
      preview.innerHTML = '<video src="' + AdminUI.escapeHtml(url) + '" muted playsinline controls class="hero-media-thumb"></video>';
    } else {
      preview.innerHTML = '<img src="' + AdminUI.escapeHtml(url) + '" alt="" class="hero-media-thumb">';
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
      var uploaded = await StorageApi.upload(
        state.project.constructora_id,
        state.project.id,
        rule.folder,
        file
      );

      state.config[rule.field] = uploaded.publicUrl;
      updateMediaPreview(key, uploaded.publicUrl);

      var payload = getFormValues();
      payload[rule.field] = uploaded.publicUrl;
      await HeroApi.upsert(state.project.id, payload);

      setMediaStatus(key, 'Archivo guardado.', 'success');
      state.dirty = false;
      updatePreview();

      if (previousUrl && previousUrl !== uploaded.publicUrl) {
        try {
          await StorageApi.removeByUrl(previousUrl);
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

    setFormMessage('');
    AdminUI.setButtonLoading(saveBtn, true, 'Guardando...');

    try {
      var saved = await HeroApi.upsert(state.project.id, payload);
      state.config = Object.assign({}, state.config, saved);
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

    bindColorPickers();

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

  function bindColorPickers() {
    var pairs = [
      ['heroColorFondoPicker', 'heroColorFondo'],
      ['heroColorAccentPicker', 'heroColorAccent']
    ];

    pairs.forEach(function (pair) {
      var picker = rootEl.querySelector('#' + pair[0]);
      var text = rootEl.querySelector('#' + pair[1]);
      if (!picker || !text) return;

      picker.addEventListener('input', function () {
        text.value = picker.value;
        state.dirty = true;
        updatePreview();
      });

      text.addEventListener('input', function () {
        if (AdminUI.isValidHexColor(text.value)) {
          picker.value = text.value.length === 4
            ? '#' + text.value[1] + text.value[1] + text.value[2] + text.value[2] + text.value[3] + text.value[3]
            : text.value;
        }
        updatePreview();
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
      state.config = data.config;
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
