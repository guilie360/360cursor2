/**
 * ProjectCover — single source of truth for the published Hero (project-cover).
 *
 * Markup + paint logic used by QuotationRuntime (visitor, preview, Canvas iframe).
 * The Quotation Editor does not mount this module for Hero stages (V7.2.07).
 *
 * Structure mirrors index.html portada + chrome floats (back, share, fullscreen, pa-fab).
 * Visual styles live in css/components.css (+ product-assistant.css for .pa-fab).
 * Do not reimplement this DOM elsewhere.
 */
var ProjectCover = (function () {
  var SHARE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
      '<path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/>' +
    '</svg>';

  var BACK_SVG =
    '<svg class="project-back-btn__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M15 18l-6-6 6-6"/>' +
    '</svg>';

  /* Role → DOM query inside a mounted cover root (class-based, not a second skin). */
  var ROLE_SELECTORS = {
    media: '[data-pc-slot="media"]',
    overlay: '.project-cover-overlay',
    logo: '.project-cover-logo',
    title: '.project-cover-name',
    subtitle: '.project-cover-tagline',
    explore: '[data-pc-slot="explore"]',
    start: '[data-pc-slot="start"]',
    back: '.project-back-btn',
    share: '.share-float',
    fullscreen: '.global-fullscreen-btn',
    assistant: '.pa-fab'
  };

  var ROLE_META = [
    { role: 'media', type: 'container', label: 'Fondo' },
    { role: 'overlay', type: 'container', label: 'Overlay' },
    { role: 'logo', type: 'image', label: 'Logo' },
    { role: 'title', type: 'text', label: 'Título' },
    { role: 'subtitle', type: 'text', label: 'Subtítulo' },
    { role: 'explore', type: 'button', label: 'Explorar' },
    { role: 'start', type: 'button', label: 'Iniciar' },
    { role: 'back', type: 'button', label: 'Volver' },
    { role: 'share', type: 'icon', label: 'Compartir' },
    { role: 'fullscreen', type: 'icon', label: 'Fullscreen' },
    { role: 'assistant', type: 'icon', label: 'Asistente' }
  ];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function blankModel() {
    return {
      layout: 'centered',
      textColor: 'light',
      buttonTextColor: 'light',
      nombre: '',
      eslogan: '',
      eyebrow: '',
      kicker: '',
      botonIzquierdo: 'Explorar',
      botonDerecho: 'Iniciar',
      logoUrl: '',
      logoStyle: 'flat',
      showLogo: false,
      videoUrl: null,
      imageUrl: null,
      showExplore: true,
      showStart: true,
      showBack: true,
      backLabel: 'Demos',
      showShare: true,
      showFullscreen: true,
      showAssistant: true,
      variant: '',
      startAction: '',
      startTargetSceneId: '',
      exploreAction: ''
    };
  }

  /**
   * From QuotationRuntime / hero_quotation payload shape.
   */
  function fromQuotationHero(raw, project) {
    var model = blankModel();
    project = project || {};
    if (!raw || typeof raw !== 'object') {
      model.nombre = project.nombre || '';
      return model;
    }
    var hc = raw.heroContent || {};
    var br = raw.branding || {};
    model.nombre = hc.nombre || project.nombre || '';
    model.eslogan = hc.eslogan || '';
    model.botonIzquierdo = hc.botonIzquierdo || 'Explorar';
    model.botonDerecho = hc.botonDerecho || 'Iniciar';
    model.showExplore = hc.showExplore !== false;
    model.showBack = hc.showBack !== false;
    model.backLabel = hc.backLabel || model.backLabel;
    model.showShare = hc.showShare !== false;
    model.showFullscreen = hc.showFullscreen !== false;
    model.showAssistant = hc.showAssistant !== false;
    model.logoStyle = br.logoStyle === 'avatar' ? 'avatar' : 'flat';
    model.logoUrl = br.logo && br.logo.uploadedUrl ? br.logo.uploadedUrl : '';
    model.showLogo = br.showHeroLogo !== false && !!model.logoUrl;
    model.videoUrl = raw.video_url || null;
    model.imageUrl = raw.image_url || null;
    return model;
  }

  /**
   * From QuotationHero.getState() live builder state.
   */
  function fromQuotationHeroState(hs, projectCtx) {
    var model = blankModel();
    projectCtx = projectCtx || {};
    if (!hs) {
      model.nombre = projectCtx.name || projectCtx.nombre || '';
      return model;
    }
    var hc = hs.heroContent || {};
    var br = hs.branding || {};
    var logo = br.logo || null;
    model.nombre = String(hc.nombre || projectCtx.name || projectCtx.nombre || '').trim();
    model.eslogan = String(hc.eslogan || '').trim();
    model.botonIzquierdo = String(hc.botonIzquierdo || 'Explorar').trim() || 'Explorar';
    model.botonDerecho = String(hc.botonDerecho || 'Iniciar').trim() || 'Iniciar';
    model.showExplore = hc.showExplore !== false;
    model.showBack = hc.showBack !== false;
    model.backLabel = String(hc.backLabel || model.backLabel || 'Demos').trim() || 'Demos';
    model.showShare = hc.showShare !== false;
    model.showFullscreen = hc.showFullscreen !== false;
    model.showAssistant = hc.showAssistant !== false;
    model.logoStyle = br.logoStyle === 'avatar' ? 'avatar' : 'flat';
    model.logoUrl = (logo && (logo.uploadedUrl || logo.previewUrl)) || '';
    model.showLogo = br.showHeroLogo !== false && !!model.logoUrl;
    model.videoUrl = hs.videoUrl ||
      (hs.heroVideo && (hs.heroVideo.uploadedUrl || hs.heroVideo.previewUrl)) || null;
    model.imageUrl = hs.imageUrl ||
      (hs.heroImage && (hs.heroImage.uploadedUrl || hs.heroImage.previewUrl)) || null;
    return model;
  }

  function uid(prefix, name) {
    return prefix ? (prefix + '-' + name) : name;
  }

  /**
   * Exact published portada + chrome (index.html).
   * idPrefix scopes ids when multiple covers exist (e.g. canvas).
   */
  function shellHtml(options) {
    options = options || {};
    var p = options.idPrefix || '';
    var coverId = uid(p, 'projectCover');
    var logoId = uid(p, 'projectCoverLogo');
    var eyebrowId = uid(p, 'projectCoverEyebrow');
    var kickerId = uid(p, 'projectCoverKicker');
    var nameId = uid(p, 'projectCoverName');
    var taglineId = uid(p, 'projectCoverTagline');
    var exploreId = uid(p, 'mainMenuOpenBtn');
    var startId = uid(p, 'heroStartBtn');
    var backId = uid(p, 'projectBackBtn');
    var backLabelId = uid(p, 'projectBackBtnLabel');
    var shareId = uid(p, 'shareProjectFloatBtn');
    var stackId = uid(p, 'globalActionStack');
    var fsId = uid(p, 'globalFullscreenBtn');
    var closeId = uid(p, 'globalCloseBtn');
    var assistId = uid(p, 'paFab');

    return '' +
      '<section class="project-cover" id="' + escapeHtml(coverId) + '"' +
        ' data-project-cover' +
        ' data-hero-text-color="light"' +
        ' data-hero-button-text-color="light"' +
        ' data-hero-layout="centered">' +
        '<div data-pc-slot="media" class="project-cover-media-slot hero-renderer" data-hero-renderer="1">' +
          '<!-- HeroRenderer paints cover media here -->' +
        '</div>' +
        '<div class="project-cover-overlay"></div>' +
        '<div class="project-cover-content">' +
          '<img class="project-cover-logo" id="' + escapeHtml(logoId) + '" src="" alt="" style="display:none">' +
          '<div class="project-cover-hero-row">' +
            '<div class="project-cover-hero-copy">' +
              '<div class="project-cover-eyebrow" id="' + escapeHtml(eyebrowId) + '" hidden></div>' +
              '<div class="project-cover-kicker" id="' + escapeHtml(kickerId) + '" hidden></div>' +
              '<div class="project-cover-name" id="' + escapeHtml(nameId) + '"></div>' +
              '<div class="project-cover-tagline" id="' + escapeHtml(taglineId) + '"></div>' +
            '</div>' +
            '<div class="project-cover-buttons">' +
              '<div class="project-cover-slot project-cover-slot--start">' +
                '<button class="project-cover-btn with-icon" id="' + escapeHtml(exploreId) + '"' +
                  ' type="button" data-pc-slot="explore" aria-label="Menú">' +
                  '<span class="menu-btn-icon" aria-hidden="true">☰</span>' +
                '</button>' +
              '</div>' +
              '<div class="project-cover-slot project-cover-slot--end">' +
                '<button class="project-cover-btn" id="' + escapeHtml(startId) + '"' +
                  ' type="button" data-pc-slot="start"></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<a class="project-back-btn" id="' + escapeHtml(backId) + '" href="#" hidden aria-hidden="true">' +
        BACK_SVG +
        '<span class="project-back-btn__label" id="' + escapeHtml(backLabelId) + '">Demos</span>' +
      '</a>' +
      '<button class="share-float" id="' + escapeHtml(shareId) + '" type="button" hidden aria-hidden="true" aria-label="Compartir proyecto">' +
        SHARE_SVG +
      '</button>' +
      '<div class="global-action-stack is-hero-only" id="' + escapeHtml(stackId) + '" hidden aria-hidden="true">' +
        '<button type="button" class="global-close-btn" id="' + escapeHtml(closeId) + '"' +
          ' aria-label="Cerrar" hidden>&times;</button>' +
        '<button type="button" class="global-fullscreen-btn" id="' + escapeHtml(fsId) + '"' +
          ' aria-label="Pantalla completa" aria-pressed="false" hidden aria-hidden="true">' +
          '<span class="global-fullscreen-icon" aria-hidden="true">⛶</span>' +
        '</button>' +
      '</div>' +
      '<button type="button" class="pa-fab" id="' + escapeHtml(assistId) + '"' +
        ' aria-expanded="false" aria-label="Abrir asistente" hidden aria-hidden="true">' +
        '<span class="pa-fab__mark" aria-hidden="true"></span>' +
      '</button>';
  }

  function q(root, sel) {
    return root ? root.querySelector(sel) : null;
  }

  function paint(root, model) {
    if (!root) return;
    model = Object.assign(blankModel(), model || {});
    var cover = q(root, '[data-project-cover]') || q(root, '.project-cover');
    if (!cover) return;

    cover.setAttribute('data-hero-layout', model.layout || 'centered');
    cover.setAttribute('data-hero-text-color', model.textColor || 'light');
    cover.setAttribute('data-hero-button-text-color', model.buttonTextColor || 'light');

    var hasVideo = !!model.videoUrl;
    var hasImage = !!model.imageUrl && !hasVideo;
    cover.classList.toggle('is-ambient-depth', !hasVideo && !hasImage);

    /* V7.2.59 — media via HeroRenderer (cover only). */
    var mediaSlot = q(root, '[data-pc-slot="media"]') || q(root, '.project-cover-media-slot');
    if (mediaSlot && typeof HeroRenderer !== 'undefined' && HeroRenderer.paint) {
      if (hasVideo) {
        HeroRenderer.paint(mediaSlot, { src: model.videoUrl, kind: 'video' }, {
          mediaClass: 'project-cover-video',
          preload: false
        });
      } else if (hasImage) {
        HeroRenderer.paint(mediaSlot, { src: model.imageUrl, kind: 'image' }, {
          mediaClass: 'project-cover-video'
        });
      } else {
        HeroRenderer.clear(mediaSlot);
      }
    } else if (mediaSlot) {
      /* Fallback if HeroRenderer missing — still cover via CSS class. */
      if (hasVideo) {
        mediaSlot.innerHTML =
          '<video class="hero-renderer__media project-cover-video" src="' +
            escapeHtml(model.videoUrl) + '" autoplay muted loop playsinline></video>';
      } else if (hasImage) {
        mediaSlot.innerHTML =
          '<img class="hero-renderer__media project-cover-video" src="' +
            escapeHtml(model.imageUrl) + '" alt="">';
      } else {
        mediaSlot.innerHTML = '<div class="hero-renderer__void" aria-hidden="true"></div>';
      }
    }

    var logo = q(root, '.project-cover-logo');
    if (logo) {
      if (model.showLogo && model.logoUrl) {
        logo.src = model.logoUrl;
        logo.alt = model.nombre || 'Logo';
        logo.hidden = false;
        logo.removeAttribute('hidden');
        logo.classList.remove('is-hidden');
        logo.classList.toggle('is-avatar', model.logoStyle === 'avatar');
        logo.style.removeProperty('display');
      } else {
        logo.removeAttribute('src');
        logo.hidden = true;
        logo.setAttribute('hidden', '');
        logo.classList.add('is-hidden');
        logo.classList.remove('is-avatar');
        logo.style.display = 'none';
      }
    }

    var eyebrowEl = q(root, '.project-cover-eyebrow');
    if (eyebrowEl) {
      var eyebrow = String(model.eyebrow || '').trim();
      eyebrowEl.textContent = eyebrow;
      if (eyebrow) {
        eyebrowEl.hidden = false;
        eyebrowEl.removeAttribute('hidden');
      } else {
        eyebrowEl.hidden = true;
        eyebrowEl.setAttribute('hidden', '');
      }
    }

    var kickerEl = q(root, '.project-cover-kicker');
    if (kickerEl) {
      var kicker = String(model.kicker || '').trim();
      kickerEl.textContent = kicker;
      if (kicker) {
        kickerEl.hidden = false;
        kickerEl.removeAttribute('hidden');
      } else {
        kickerEl.hidden = true;
        kickerEl.setAttribute('hidden', '');
      }
    }

    var nameEl = q(root, '.project-cover-name');
    if (nameEl) nameEl.textContent = model.nombre || '';

    var tagEl = q(root, '.project-cover-tagline');
    if (tagEl) {
      var tagline = model.eslogan || '';
      tagEl.textContent = tagline;
      if (tagline) {
        tagEl.hidden = false;
        tagEl.removeAttribute('hidden');
      } else {
        tagEl.hidden = true;
        tagEl.setAttribute('hidden', '');
      }
    }

    var explore = q(root, '[data-pc-slot="explore"]');
    var exploreSlot = explore && explore.closest
      ? explore.closest('.project-cover-slot--start')
      : null;
    if (explore) {
      if (model.showExplore === false) {
        explore.hidden = true;
        explore.setAttribute('hidden', '');
        explore.setAttribute('aria-hidden', 'true');
        explore.style.display = 'none';
        explore.classList.add('is-pc-hidden');
        if (exploreSlot) {
          exploreSlot.hidden = true;
          exploreSlot.setAttribute('hidden', '');
          exploreSlot.style.display = 'none';
          exploreSlot.classList.add('is-pc-hidden');
        }
      } else {
        explore.hidden = false;
        explore.removeAttribute('hidden');
        explore.setAttribute('aria-hidden', 'false');
        explore.style.removeProperty('display');
        explore.classList.remove('is-pc-hidden');
        if (exploreSlot) {
          exploreSlot.hidden = false;
          exploreSlot.removeAttribute('hidden');
          exploreSlot.style.removeProperty('display');
          exploreSlot.classList.remove('is-pc-hidden');
        }
        var exploreLabel = model.botonIzquierdo || 'Explorar';
        if (model.variant === 'cinematic') {
          explore.classList.remove('with-icon');
          explore.textContent = exploreLabel;
        } else {
          explore.classList.add('with-icon');
          explore.innerHTML =
            '<span class="menu-btn-icon" aria-hidden="true">☰</span>' + escapeHtml(exploreLabel);
        }
        explore.setAttribute('aria-label', exploreLabel);
      }
    }

    var start = q(root, '[data-pc-slot="start"]');
    var startSlot = start && start.closest
      ? start.closest('.project-cover-slot--end')
      : null;
    if (start) {
      if (model.showStart === false) {
        start.hidden = true;
        start.setAttribute('hidden', '');
        start.setAttribute('aria-hidden', 'true');
        start.style.display = 'none';
        start.classList.add('is-pc-hidden');
        if (startSlot) {
          startSlot.hidden = true;
          startSlot.setAttribute('hidden', '');
          startSlot.style.display = 'none';
          startSlot.classList.add('is-pc-hidden');
        }
      } else {
        start.hidden = false;
        start.removeAttribute('hidden');
        start.setAttribute('aria-hidden', 'false');
        start.style.removeProperty('display');
        start.classList.remove('is-pc-hidden');
        if (startSlot) {
          startSlot.hidden = false;
          startSlot.removeAttribute('hidden');
          startSlot.style.removeProperty('display');
          startSlot.classList.remove('is-pc-hidden');
        }
        start.textContent = model.botonDerecho || 'Iniciar';
      }
    }
    if (cover) {
      cover.classList.toggle('is-start-only', model.showExplore === false && model.showStart !== false);
      cover.classList.toggle('is-cover-intro', model.variant === 'intro');
      cover.classList.toggle('is-cover-project', model.variant === 'project');
      cover.classList.toggle('is-cover-cinematic', model.variant === 'cinematic');
    }

    var back = q(root, '.project-back-btn');
    if (back) {
      if (model.showBack !== false) {
        back.hidden = false;
        back.removeAttribute('hidden');
        back.setAttribute('aria-hidden', 'false');
      } else {
        back.hidden = true;
        back.setAttribute('hidden', '');
        back.setAttribute('aria-hidden', 'true');
      }
      var backLabel = q(root, '.project-back-btn__label');
      if (backLabel) backLabel.textContent = model.backLabel || 'Demos';
    }

    var share = q(root, '.share-float');
    if (share) {
      var showShare = model.showShare !== false;
      share.hidden = !showShare;
      share.classList.toggle('is-float-hidden', !showShare);
      share.setAttribute('aria-hidden', showShare ? 'false' : 'true');
      if (showShare) share.removeAttribute('hidden');
      else share.setAttribute('hidden', '');
    }

    var fs = q(root, '.global-fullscreen-btn');
    var stack = q(root, '.global-action-stack');
    if (fs) {
      var showFs = model.showFullscreen !== false;
      fs.classList.toggle('is-visible', showFs);
      fs.setAttribute('aria-hidden', showFs ? 'false' : 'true');
      if (showFs) fs.removeAttribute('hidden');
      else fs.setAttribute('hidden', '');
      if (stack) {
        stack.classList.toggle('is-visible', showFs);
        stack.classList.add('is-hero-only');
        stack.hidden = !showFs;
        stack.setAttribute('aria-hidden', showFs ? 'false' : 'true');
        if (showFs) stack.removeAttribute('hidden');
        else stack.setAttribute('hidden', '');
      }
    }

    var assist = q(root, '.pa-fab');
    if (assist) {
      var showAssist = model.showAssistant !== false;
      assist.hidden = !showAssist;
      assist.setAttribute('aria-hidden', showAssist ? 'false' : 'true');
      if (showAssist) assist.removeAttribute('hidden');
      else assist.setAttribute('hidden', '');
    }
  }

  /**
   * Mount cover into host. Returns { root, model }.
   * options: { idPrefix, interactive, onExplore, onStart, editable, elementIds, onSelect }
   */
  function mount(host, model, options) {
    if (!host) return null;
    options = options || {};
    model = Object.assign(blankModel(), model || {});

    host.innerHTML =
      '<div class="project-cover-root" data-project-cover-root>' +
        shellHtml(options) +
      '</div>';

    var root = host.querySelector('[data-project-cover-root]') || host;
    paint(root, model);

    if (options.interactive) {
      var explore = q(root, '[data-pc-slot="explore"]');
      var start = q(root, '[data-pc-slot="start"]');
      if (explore && typeof options.onExplore === 'function') {
        explore.addEventListener('click', options.onExplore);
      }
      if (start && typeof options.onStart === 'function') {
        start.addEventListener('click', options.onStart);
      }
    }

    if (options.editable) {
      bindEditable(root, options);
    }

    return { root: root, model: model };
  }

  function bindEditable(root, options) {
    options = options || {};
    var elementIds = options.elementIds || {};
    var selectedId = options.selectedElementId || null;

    ROLE_META.forEach(function (meta) {
      var el = q(root, ROLE_SELECTORS[meta.role]);
      if (!el) return;
      var eid = elementIds[meta.role];
      if (eid) {
        el.setAttribute('data-qe-element', eid);
        el.classList.toggle('is-qe-selected', eid === selectedId);
      }
    });

    if (typeof options.onSelect !== 'function') return;

    root.addEventListener('click', function (e) {
      var target = e.target && e.target.closest
        ? e.target.closest('[data-qe-element]')
        : null;
      if (!target || !root.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      options.onSelect(target.getAttribute('data-qe-element'), target);
    });
  }

  function elementDescriptors(idFactory) {
    return ROLE_META.map(function (meta) {
      return {
        id: typeof idFactory === 'function' ? idFactory(meta.role) : (meta.role + '-el'),
        type: meta.type,
        role: meta.role,
        props: { label: meta.label }
      };
    });
  }

  function readModelFromDom(root) {
    var model = blankModel();
    if (!root) return model;
    var nameEl = q(root, '.project-cover-name');
    var tagEl = q(root, '.project-cover-tagline');
    var explore = q(root, '[data-pc-slot="explore"]');
    var start = q(root, '[data-pc-slot="start"]');
    var logo = q(root, '.project-cover-logo');
    model.nombre = nameEl ? nameEl.textContent : '';
    model.eslogan = tagEl ? tagEl.textContent : '';
    if (start) model.botonDerecho = start.textContent || 'Iniciar';
    if (explore) {
      var clone = explore.cloneNode(true);
      var icon = clone.querySelector('.menu-btn-icon');
      if (icon) icon.parentNode.removeChild(icon);
      model.botonIzquierdo = String(clone.textContent || '').trim() || 'Explorar';
    }
    if (logo && logo.src && !logo.hidden) {
      model.logoUrl = logo.getAttribute('src') || '';
      model.showLogo = !!model.logoUrl;
      model.logoStyle = logo.classList.contains('is-avatar') ? 'avatar' : 'flat';
    }
    return model;
  }

  function sanitizeModel(raw) {
    var base = blankModel();
    if (!raw || typeof raw !== 'object') return base;
    base.layout = raw.layout === 'bottom-bar' ? 'bottom-bar' : 'centered';
    base.textColor = raw.textColor === 'dark' ? 'dark' : 'light';
    base.buttonTextColor = raw.buttonTextColor === 'dark' ? 'dark' : 'light';
    base.nombre = String(raw.nombre || '').trim();
    base.eslogan = String(raw.eslogan || '').trim();
    base.eyebrow = String(raw.eyebrow || '').trim();
    base.kicker = String(raw.kicker || '').trim();
    base.botonIzquierdo = String(raw.botonIzquierdo || 'Explorar').trim() || 'Explorar';
    base.botonDerecho = String(raw.botonDerecho || 'Iniciar').trim() || 'Iniciar';
    base.logoUrl = String(raw.logoUrl || '').trim();
    base.logoStyle = raw.logoStyle === 'avatar' ? 'avatar' : 'flat';
    base.showLogo = raw.showLogo !== false && !!base.logoUrl;
    base.videoUrl = String(raw.videoUrl || '').trim() || null;
    base.imageUrl = String(raw.imageUrl || '').trim() || null;
    base.showExplore = raw.showExplore !== false;
    base.showStart = raw.showStart !== false;
    base.showBack = raw.showBack !== false;
    base.backLabel = String(raw.backLabel || 'Demos').trim() || 'Demos';
    base.showShare = raw.showShare !== false;
    base.showFullscreen = raw.showFullscreen !== false;
    base.showAssistant = raw.showAssistant !== false;
    base.variant = String(raw.variant || '').trim();
    base.startAction = String(raw.startAction || '').trim();
    base.startTargetSceneId = String(raw.startTargetSceneId || '').trim();
    base.exploreAction = String(raw.exploreAction || '').trim();
    return base;
  }

  /**
   * Prefer canvas coverModel (entry hero). Never fall back to parallel legacy fields
   * when a canvas cover exists — Preview/Runtime must match Canvas.
   */
  function resolveModel(heroQuotation, project) {
    var hq = heroQuotation && typeof heroQuotation === 'object' ? heroQuotation : null;
    var canvas = hq && hq.canvas && typeof hq.canvas === 'object' ? hq.canvas : null;
    if (canvas && Array.isArray(canvas.scenes) && canvas.scenes.length) {
      var scenes = canvas.scenes;
      var activeId = canvas.activeSceneId;
      var scene = null;
      var i;
      /* Active scene only if it carries the cover (Hero Default). */
      if (activeId) {
        for (i = 0; i < scenes.length; i++) {
          if (scenes[i] && scenes[i].id === activeId && scenes[i].coverModel) {
            scene = scenes[i];
            break;
          }
        }
      }
      if (!scene) {
        for (i = 0; i < scenes.length; i++) {
          if (scenes[i] && scenes[i].coverModel &&
              (scenes[i].templateId === 'hero-default' || scenes[i].type === 'hero')) {
            scene = scenes[i];
            break;
          }
        }
      }
      if (!scene) {
        for (i = 0; i < scenes.length; i++) {
          if (scenes[i] && scenes[i].coverModel) { scene = scenes[i]; break; }
        }
      }
      if (scene && scene.coverModel) return sanitizeModel(scene.coverModel);
    }
    return fromQuotationHero(hq, project);
  }

  function toHeroQuotationPayload(model, canvasDoc) {
    model = sanitizeModel(model);
    var payload = {
      heroContent: {
        nombre: model.nombre,
        eslogan: model.eslogan,
        botonIzquierdo: model.botonIzquierdo,
        botonDerecho: model.botonDerecho,
        whatsappLink: '',
        whatsappMessage: '',
        shareUrl: '',
        showWhatsapp: false,
        showExplore: model.showExplore !== false,
        showBack: model.showBack !== false,
        backLabel: model.backLabel || 'Demos',
        showShare: model.showShare !== false,
        showFullscreen: model.showFullscreen !== false,
        showAssistant: model.showAssistant !== false
      },
      branding: {
        showHeroLogo: model.showLogo !== false,
        logoStyle: model.logoStyle === 'avatar' ? 'avatar' : 'flat',
        logo: model.logoUrl
          ? { name: 'Logo', uploadedUrl: model.logoUrl, size: 0 }
          : null
      },
      video_url: model.videoUrl || null,
      image_url: model.imageUrl || null
    };
    if (canvasDoc && typeof canvasDoc === 'object') {
      payload.canvas = canvasDoc;
    }
    return payload;
  }

  return {
    blankModel: blankModel,
    sanitizeModel: sanitizeModel,
    fromQuotationHero: fromQuotationHero,
    fromQuotationHeroState: fromQuotationHeroState,
    resolveModel: resolveModel,
    toHeroQuotationPayload: toHeroQuotationPayload,
    shellHtml: shellHtml,
    mount: mount,
    paint: paint,
    bindEditable: bindEditable,
    elementDescriptors: elementDescriptors,
    readModelFromDom: readModelFromDom,
    ROLE_SELECTORS: ROLE_SELECTORS,
    ROLE_META: ROLE_META
  };
})();
