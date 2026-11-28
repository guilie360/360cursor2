/**
 * BuilderHero — shared Hero UI for BOXIES builders (V7.1.09).
 *
 * The markup is extracted verbatim from the Showroom `renderVideoHero()` so both
 * builders render the exact same chrome. Only the UI is shared: Showroom persists
 * through the legacy `proyecto_config` hero columns, Quotation through the
 * `hero_quotation` jsonb namespace.
 */
var BuilderHero = (function () {
  var VIDEO_ACCEPT_FALLBACK = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
  var IMAGE_ACCEPT_FALLBACK =
    'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';
  var LOGO_ACCEPT = 'image/*,.svg';

  function escapeHtml(value) {
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.escapeHtml === 'function') {
      return AdminUI.escapeHtml(value);
    }
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /** Only blob/data URLs may be set on <video src> while the egress guard is active. */
  function isPlayablePreview(url) {
    var raw = String(url || '');
    if (!raw) return false;
    if (typeof isPlayableHeroVideoUrl === 'function') {
      return !!isPlayableHeroVideoUrl(raw);
    }
    return raw.indexOf('blob:') === 0 || raw.indexOf('data:') === 0;
  }

  function videoAccept() {
    return (typeof MediaEngine !== 'undefined' && MediaEngine.ACCEPT) || VIDEO_ACCEPT_FALLBACK;
  }

  function imageAccept() {
    return (
      (typeof MediaEngine !== 'undefined' && MediaEngine.IMAGE_ACCEPT) || IMAGE_ACCEPT_FALLBACK
    );
  }

  function defaultHeroContent() {
    return {
      nombre: '',
      eslogan: '',
      botonIzquierdo: 'Explorar',
      botonDerecho: 'Iniciar',
      whatsappLink: '',
      whatsappMessage: '',
      shareUrl: '',
      showWhatsapp: true,
      showShare: true,
      showFullscreen: true
    };
  }

  /**
   * model shape:
   * {
   *   mode: 'showroom' | 'quotation',
   *   heroContent: { nombre, eslogan, botonIzquierdo, botonDerecho, whatsappLink,
   *                  whatsappMessage, shareUrl, showWhatsapp, showShare, showFullscreen },
   *   branding: { logo, showHeroLogo, logoStyle },
   *   heroVideo: { file, name, size, previewUrl, uploadedUrl, width, height, durationLabel, status } | null,
   *   heroImage: { ... } | null,
   *   projectNameFallback: string
   * }
   */
  function emptyModel(partial) {
    partial = partial || {};
    var branding = partial.branding || {};
    return {
      mode: partial.mode || 'showroom',
      heroContent: Object.assign(defaultHeroContent(), partial.heroContent || {}),
      branding: {
        logo: branding.logo || null,
        showHeroLogo: branding.showHeroLogo !== false,
        logoStyle: branding.logoStyle === 'avatar' ? 'avatar' : 'flat'
      },
      heroVideo: partial.heroVideo || null,
      heroImage: partial.heroImage || null,
      projectNameFallback: partial.projectNameFallback || ''
    };
  }

  function render(model) {
    model = model || {};
    var v = model.heroVideo || null;
    var img = model.heroImage || null;
    var localVideoPreview = v && isPlayablePreview(v.previewUrl) ? v.previewUrl : null;

    var hero = model.heroContent || {};
    var branding = model.branding || {};
    var nombre = hero.nombre || model.projectNameFallback || '';
    var eslogan = hero.eslogan || '';
    var btnLeft = hero.botonIzquierdo || 'Explorar';
    var btnRight = hero.botonDerecho || 'Iniciar';
    var waLink = hero.whatsappLink || '';
    var waMsg = hero.whatsappMessage || '';
    var shareUrl = hero.shareUrl || '';
    var showWa = hero.showWhatsapp !== false;
    var showShare = hero.showShare !== false;
    var showLogo = branding.showHeroLogo !== false;
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';
    var logoUrl =
      (branding.logo && (branding.logo.uploadedUrl || branding.logo.previewUrl)) || '';

    function mediaMetaLine(parts) {
      return parts.filter(Boolean).join(' · ');
    }

    function videoCardHtml() {
      var has = !!localVideoPreview;
      var dims =
        v && v.width && v.height ? v.width + '×' + v.height + 'px' : '';
      var status = has
        ? (v.status === 'synced' ? 'Sincronizado' : (v.status === 'remote' ? 'Remoto' : 'Listo'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="video">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Video</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="videoDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra un video"') + '>' +
            (has
              ? '<video src="' + escapeHtml(localVideoPreview) +
                '" controls muted class="builder-video-preview"></video>'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  escapeHtml(v.name || 'Video del hero') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  escapeHtml(
                    mediaMetaLine([
                      status,
                      formatBytes(v.size),
                      dims,
                      v.durationLabel ? 'Duración ' + v.durationLabel : ''
                    ])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="video">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="video">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="video">Subir</button>') +
          '</div>' +
          '<input type="file" id="videoInput" accept="' + videoAccept() + '" hidden>' +
        '</article>'
      );
    }

    function imageCardHtml() {
      var has = !!(img && (img.previewUrl || img.uploadedUrl));
      var previewSrc = has ? (img.previewUrl || img.uploadedUrl) : '';
      var dims =
        img && img.width && img.height ? img.width + '×' + img.height + 'px' : '';
      var status = has
        ? (img.status === 'synced' ? 'Sincronizado' : (img.status === 'remote' ? 'Remoto' : 'Listo'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="image">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Imagen</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="heroImageDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra una imagen"') + '>' +
            (has
              ? '<img src="' + escapeHtml(previewSrc) +
                '" alt="" class="builder-hero-image-preview">'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  escapeHtml(img.name || 'Imagen del hero') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  escapeHtml(
                    mediaMetaLine([status, formatBytes(img.size), dims])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="image">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="image">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="image">Subir</button>') +
          '</div>' +
          '<input type="file" id="heroImageInput" accept="' + imageAccept() + '" hidden>' +
        '</article>'
      );
    }

    function logoCardHtml() {
      var logo = branding.logo;
      var previewSrc = logo && (logo.previewUrl || logo.uploadedUrl) ? (logo.previewUrl || logo.uploadedUrl) : '';
      var has = !!previewSrc;
      var status = has
        ? (logo.uploadedUrl ? 'Bunny' : (logo.file ? 'Listo' : 'Remoto'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="logo">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Logo</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="heroLogoDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra el logo"') + '>' +
            (has
              ? '<img src="' + escapeHtml(previewSrc) +
                '" alt="" class="builder-hero-image-preview">'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  escapeHtml(logo.name || 'Logo del proyecto') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  escapeHtml(
                    mediaMetaLine([status, logo.size ? formatBytes(logo.size) : ''])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="logo">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="logo">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="logo">Subir</button>') +
          '</div>' +
          '<input type="file" id="heroLogoInput" accept="' + LOGO_ACCEPT + '" hidden>' +
        '</article>'
      );
    }

    return (
      '<div class="builder-step-content builder-step-content--hero">' +
        '<div class="builder-hero-workspace">' +
          '<div class="builder-hero-col builder-hero-col--media">' +
            videoCardHtml() +
            imageCardHtml() +
            logoCardHtml() +
          '</div>' +
          '<div class="builder-hero-col builder-hero-col--config">' +
            '<div class="builder-hero-config-card" id="heroContentForm">' +
              '<div class="builder-hero-config-card__title">Identidad</div>' +
              '<div class="builder-field">' +
                '<label for="heroNombreInput">Nombre</label>' +
                '<input type="text" id="heroNombreInput" maxlength="120" placeholder="Nombre visible en el hero" value="' +
                  escapeHtml(nombre) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroEsloganInput">Eslogan</label>' +
                '<input type="text" id="heroEsloganInput" maxlength="220" placeholder="Eslogan del hero" value="' +
                  escapeHtml(eslogan) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Botones</div>' +
              '<div class="builder-field">' +
                '<label for="heroBtnLeftInput">Texto izquierdo</label>' +
                '<input type="text" id="heroBtnLeftInput" maxlength="40" placeholder="Explorar" value="' +
                  escapeHtml(btnLeft) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroBtnRightInput">Texto derecho</label>' +
                '<input type="text" id="heroBtnRightInput" maxlength="40" placeholder="Iniciar" value="' +
                  escapeHtml(btnRight) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">WhatsApp</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowWhatsappInput"' + (showWa ? ' checked' : '') + '>' +
                '<span>Mostrar</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroWhatsappLinkInput">Número / link</label>' +
                '<input type="text" id="heroWhatsappLinkInput" maxlength="180" ' +
                  'placeholder="573001112233 o https://wa.me/573001112233" value="' +
                  escapeHtml(waLink) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroWhatsappMsgInput">Mensaje</label>' +
                '<input type="text" id="heroWhatsappMsgInput" maxlength="280" ' +
                  'placeholder="Hola, quiero más información..." value="' +
                  escapeHtml(waMsg) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Compartir</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowShareInput"' + (showShare ? ' checked' : '') + '>' +
                '<span>Mostrar</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroShareUrlInput">URL al compartir</label>' +
                '<input type="url" id="heroShareUrlInput" maxlength="400" ' +
                  'placeholder="Vacío = URL actual del showroom" value="' +
                  escapeHtml(shareUrl) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Fullscreen</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowFullscreenInput"' +
                  ((hero.showFullscreen !== false) ? ' checked' : '') + '>' +
                '<span>Mostrar control de pantalla completa</span>' +
              '</label>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Logo</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowLogoInput"' + (showLogo ? ' checked' : '') + '>' +
                '<span>Mostrar en el hero</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroLogoUrlDisplay">URL Bunny</label>' +
                '<input type="text" id="heroLogoUrlDisplay" readonly ' +
                  'placeholder="Sin logo — súbelo a la izquierda" value="' +
                  escapeHtml(logoUrl) + '">' +
              '</div>' +
              '<div class="builder-confirm-title" style="margin-top:4px">Formato</div>' +
              '<label class="builder-check-row">' +
                '<input type="radio" name="heroLogoStyle" value="flat" id="heroLogoStyleFlat"' +
                  (logoStyle === 'flat' ? ' checked' : '') + '>' +
                '<span>Mantener formato</span>' +
              '</label>' +
              '<label class="builder-check-row">' +
                '<input type="radio" name="heroLogoStyle" value="avatar" id="heroLogoStyleAvatar"' +
                  (logoStyle === 'avatar' ? ' checked' : '') + '>' +
                '<span>Convertir a circular</span>' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  var CONTENT_FIELD_IDS = [
    'heroNombreInput',
    'heroEsloganInput',
    'heroBtnLeftInput',
    'heroBtnRightInput',
    'heroWhatsappLinkInput',
    'heroWhatsappMsgInput',
    'heroShareUrlInput',
    'heroShowWhatsappInput',
    'heroShowShareInput',
    'heroShowFullscreenInput',
    'heroShowLogoInput',
    'heroLogoStyleFlat',
    'heroLogoStyleAvatar'
  ];

  var MEDIA_INPUT_IDS = {
    video: 'videoInput',
    image: 'heroImageInput',
    logo: 'heroLogoInput'
  };

  var MEDIA_DROPZONE_IDS = {
    video: 'videoDropzone',
    image: 'heroImageDropzone',
    logo: 'heroLogoDropzone'
  };

  function readFromDom(rootEl) {
    function readField(id, fallback) {
      var el = rootEl && rootEl.querySelector('#' + id);
      if (!el) return fallback;
      return el.value;
    }

    function readChecked(id, fallback) {
      var el = rootEl && rootEl.querySelector('#' + id);
      if (!el) return fallback;
      return !!el.checked;
    }

    var styleEl = rootEl && rootEl.querySelector('input[name="heroLogoStyle"]:checked');

    return {
      heroContent: {
        nombre: readField('heroNombreInput', ''),
        eslogan: readField('heroEsloganInput', ''),
        botonIzquierdo: readField('heroBtnLeftInput', 'Explorar') || 'Explorar',
        botonDerecho: readField('heroBtnRightInput', 'Iniciar') || 'Iniciar',
        whatsappLink: readField('heroWhatsappLinkInput', ''),
        whatsappMessage: readField('heroWhatsappMsgInput', ''),
        shareUrl: readField('heroShareUrlInput', ''),
        showWhatsapp: readChecked('heroShowWhatsappInput', true),
        showShare: readChecked('heroShowShareInput', true),
        showFullscreen: readChecked('heroShowFullscreenInput', true)
      },
      brandingPartial: {
        showHeroLogo: readChecked('heroShowLogoInput', true),
        logoStyle: styleEl && styleEl.value === 'avatar' ? 'avatar' : 'flat'
      }
    };
  }

  /**
   * adapter:
   *   onChange(read)          — content fields changed; `read` is readFromDom() output
   *   onMediaChange(kind)     — Cambiar/Subir pressed and no file input is available
   *   onMediaClear(kind)      — Eliminar pressed
   *   onFile(kind, file)      — a file was picked or dropped (enables dropzone wiring)
   */
  function bind(rootEl, adapter) {
    if (!rootEl) return;
    adapter = adapter || {};

    if (typeof adapter.onChange === 'function') {
      CONTENT_FIELD_IDS.forEach(function (id) {
        var el = rootEl.querySelector('#' + id);
        if (!el) return;
        var notify = function () {
          adapter.onChange(readFromDom(rootEl));
        };
        el.addEventListener('input', notify);
        el.addEventListener('change', notify);
      });
    }

    rootEl.querySelectorAll('[data-hero-media-change]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var kind = btn.getAttribute('data-hero-media-change');
        var inputId = MEDIA_INPUT_IDS[kind];
        var input = inputId ? rootEl.querySelector('#' + inputId) : null;
        if (input) {
          input.click();
          return;
        }
        if (typeof adapter.onMediaChange === 'function') adapter.onMediaChange(kind);
      });
    });

    rootEl.querySelectorAll('[data-hero-media-clear]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof adapter.onMediaClear === 'function') {
          adapter.onMediaClear(btn.getAttribute('data-hero-media-clear'));
        }
      });
    });

    if (typeof adapter.onFile !== 'function') return;

    Object.keys(MEDIA_DROPZONE_IDS).forEach(function (kind) {
      var zone = rootEl.querySelector('#' + MEDIA_DROPZONE_IDS[kind]);
      var input = rootEl.querySelector('#' + MEDIA_INPUT_IDS[kind]);
      if (!zone || !input) return;

      zone.addEventListener('click', function (e) {
        /* Con media cargada, Cambiar/Eliminar gestionan el archivo; no robar clicks al preview. */
        var card = zone.closest('.builder-hero-media-card');
        if (card && card.classList.contains('has-media')) return;
        if (e.target.closest('video, button, a, input, label')) return;
        input.click();
      });
      zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        zone.classList.add('is-dragover');
      });
      zone.addEventListener('dragleave', function () {
        zone.classList.remove('is-dragover');
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files.length) {
          adapter.onFile(kind, e.dataTransfer.files[0]);
        }
      });
      input.addEventListener('change', function () {
        if (input.files.length) adapter.onFile(kind, input.files[0]);
      });
    });
  }

  return {
    render: render,
    bind: bind,
    readFromDom: readFromDom,
    emptyModel: emptyModel,
    escapeHtml: escapeHtml,
    formatBytes: formatBytes,
    isPlayablePreview: isPlayablePreview
  };
})();
