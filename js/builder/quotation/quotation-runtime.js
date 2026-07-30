/**
 * QuotationRuntime — visitor/preview runtime for Quotation Rooms (V7.1.13).
 *
 * Independent from the Showroom public runtime (`/{slug}`).
 * Loads ONLY by explicit projectId + experience_type=quotation.
 * Never falls back to published showrooms, demos, or "active" projects.
 *
 * Data sources:
 *   - proyectos (identity) filtered by experience_type=quotation
 *   - proyecto_config.hero_quotation
 *   - proyecto_config og_* (share meta)
 */
var QuotationRuntime = (function () {
  var EXPERIENCE_TYPE = 'quotation';
  var loaded = null;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function readQuery() {
    var params;
    try {
      params = new URLSearchParams(window.location.search || '');
    } catch (e) {
      params = { get: function () { return null; } };
    }
    return {
      projectId: String(params.get('projectId') || params.get('proyectoId') || '').trim(),
      experienceType: String(params.get('experience_type') || params.get('experienceType') || '').trim().toLowerCase()
    };
  }

  function assertQuotationQuery(q) {
    if (!q.projectId) {
      throw new Error('Falta projectId. El Runtime de Cotización no acepta fallbacks.');
    }
    if (!/^[0-9a-f-]{36}$/i.test(q.projectId)) {
      throw new Error('projectId inválido.');
    }
    if (q.experienceType && q.experienceType !== EXPERIENCE_TYPE) {
      throw new Error('experience_type debe ser "quotation".');
    }
  }

  function getClient() {
    if (typeof PlatformAuth !== 'undefined' && PlatformAuth.getClient) {
      try {
        if (PlatformAuth.createClient) {
          PlatformAuth.createClient({ remember: true });
        }
        return PlatformAuth.getClient();
      } catch (e) {}
    }
    if (typeof window.supabase !== 'undefined' &&
        typeof SUPABASE_URL !== 'undefined' &&
        typeof SUPABASE_ANON_KEY !== 'undefined') {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    throw new Error('Cliente Supabase no disponible.');
  }

  /**
   * Build preview URL. Always requires projectId — never slug-only showroom paths.
   */
  function href(projectId, opts) {
    opts = opts || {};
    var id = String(projectId || '').trim();
    if (!id) return null;
    var base;
    try {
      base = new URL('/quotation/', window.location.origin).href;
    } catch (e) {
      base = '/quotation/';
    }
    var url;
    try {
      url = new URL(base);
    } catch (e2) {
      return base + '?projectId=' + encodeURIComponent(id) +
        '&experience_type=' + EXPERIENCE_TYPE;
    }
    url.searchParams.set('projectId', id);
    url.searchParams.set('experience_type', EXPERIENCE_TYPE);
    if (opts.preview) url.searchParams.set('preview', '1');
    return url.href;
  }

  async function fetchBundle(projectId) {
    var client = getClient();
    var projectResult = await client
      .from('proyectos')
      .select('id, nombre, slug, publicado, experience_type, constructora_id')
      .eq('id', projectId)
      .eq('experience_type', EXPERIENCE_TYPE)
      .maybeSingle();

    if (projectResult.error) {
      throw new Error(projectResult.error.message || 'Error cargando la cotización.');
    }
    if (!projectResult.data) {
      throw new Error(
        'No existe una Cotización con ese projectId (experience_type=quotation). ' +
        'No se usará ningún showroom de respaldo.'
      );
    }

    var configResult = await client
      .from('proyecto_config')
      .select('hero_quotation, og_image, og_title, og_description')
      .eq('proyecto_id', projectId)
      .maybeSingle();

    if (configResult.error) {
      throw new Error(configResult.error.message || 'Error cargando proyecto_config.');
    }

    var config = configResult.data || {};
    return {
      project: projectResult.data,
      hero: config.hero_quotation && typeof config.hero_quotation === 'object'
        ? config.hero_quotation
        : null,
      share: {
        og_image: config.og_image || '',
        og_title: config.og_title || '',
        og_description: config.og_description || ''
      }
    };
  }

  function blankHero() {
    return {
      heroContent: {
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        showWhatsapp: true,
        showShare: true,
        showFullscreen: true
      },
      branding: { showHeroLogo: true, logoStyle: 'flat', logo: null },
      video_url: null,
      image_url: null
    };
  }

  function normalizeHero(raw, project) {
    var base = blankHero();
    if (!raw || typeof raw !== 'object') {
      base.heroContent.nombre = (project && project.nombre) || '';
      return base;
    }
    var hc = raw.heroContent || {};
    var br = raw.branding || {};
    base.heroContent = Object.assign({}, base.heroContent, {
      nombre: hc.nombre || (project && project.nombre) || '',
      eslogan: hc.eslogan || '',
      botonIzquierdo: hc.botonIzquierdo || 'Explorar',
      botonDerecho: hc.botonDerecho || 'Iniciar',
      whatsappLink: hc.whatsappLink || '',
      whatsappMessage: hc.whatsappMessage || '',
      shareUrl: hc.shareUrl || '',
      showWhatsapp: hc.showWhatsapp !== false,
      showShare: hc.showShare !== false,
      showFullscreen: hc.showFullscreen !== false
    });
    base.branding.showHeroLogo = br.showHeroLogo !== false;
    base.branding.logoStyle = br.logoStyle === 'avatar' ? 'avatar' : 'flat';
    base.branding.logo = br.logo && br.logo.uploadedUrl
      ? { uploadedUrl: br.logo.uploadedUrl, name: br.logo.name || '' }
      : null;
    base.video_url = raw.video_url || null;
    base.image_url = raw.image_url || null;
    return base;
  }

  function showError(host, err) {
    if (!host) return;
    host.innerHTML =
      '<div class="qr-error" role="alert">' +
        '<h1 class="qr-error__title">No se pudo abrir la Cotización</h1>' +
        '<p class="qr-error__desc">' + escapeHtml((err && err.message) || 'Error desconocido') + '</p>' +
      '</div>';
  }

  function paintHero(host, bundle) {
    var hero = normalizeHero(bundle.hero, bundle.project);
    var hc = hero.heroContent;
    var logoUrl = hero.branding.logo && hero.branding.logo.uploadedUrl
      ? hero.branding.logo.uploadedUrl
      : '';
    var hasVideo = !!hero.video_url;
    var hasImage = !!hero.image_url;

    host.innerHTML =
      '<section class="project-cover qr-cover" id="qrCover" data-hero-layout="centered" data-hero-text-color="light">' +
        (hasVideo
          ? ('<video class="project-cover-video" id="qrVideo" muted loop playsinline autoplay ' +
              'src="' + escapeHtml(hero.video_url) + '"></video>')
          : '') +
        (hasImage && !hasVideo
          ? ('<img class="project-cover-video" id="qrImage" alt="" src="' +
              escapeHtml(hero.image_url) + '">')
          : '') +
        (!hasVideo && !hasImage
          ? '<div class="qr-cover__void" aria-hidden="true"></div>'
          : '') +
        '<div class="project-cover-overlay"></div>' +
        '<div class="project-cover-content">' +
          (logoUrl && hero.branding.showHeroLogo !== false
            ? ('<img class="project-cover-logo' +
                (hero.branding.logoStyle === 'avatar' ? ' is-avatar' : '') +
                '" id="qrLogo" src="' + escapeHtml(logoUrl) + '" alt="">')
            : '') +
          '<div class="project-cover-hero-row">' +
            '<div class="project-cover-hero-copy">' +
              '<div class="project-cover-name" id="qrName">' +
                escapeHtml(hc.nombre || bundle.project.nombre || '') +
              '</div>' +
              '<div class="project-cover-tagline" id="qrTagline">' +
                escapeHtml(hc.eslogan || '') +
              '</div>' +
            '</div>' +
            '<div class="project-cover-buttons">' +
              '<div class="project-cover-slot project-cover-slot--start">' +
                '<button type="button" class="project-cover-btn" id="qrExploreBtn">' +
                  escapeHtml(hc.botonIzquierdo || 'Explorar') +
                '</button>' +
              '</div>' +
              '<div class="project-cover-slot project-cover-slot--end">' +
                '<button type="button" class="project-cover-btn" id="qrStartBtn">' +
                  escapeHtml(hc.botonDerecho || 'Iniciar') +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="qr-stage" id="qrStage" hidden>' +
        '<header class="qr-stage__header">' +
          '<p class="qr-stage__eyebrow">Cotización</p>' +
          '<h1 class="qr-stage__title">' +
            escapeHtml(hc.nombre || bundle.project.nombre || '') +
          '</h1>' +
          '<p class="qr-stage__lead">' +
            escapeHtml(hc.eslogan || bundle.share.og_description ||
              'Experiencia de cotización cargada desde hero_quotation + proyecto_config.') +
          '</p>' +
        '</header>' +
        '<p class="qr-stage__meta">projectId · ' + escapeHtml(bundle.project.id) + '</p>' +
        '<button type="button" class="project-cover-btn qr-stage__back" id="qrBackBtn">Volver al hero</button>' +
      '</section>';

    var start = host.querySelector('#qrStartBtn');
    var explore = host.querySelector('#qrExploreBtn');
    var back = host.querySelector('#qrBackBtn');
    var cover = host.querySelector('#qrCover');
    var stage = host.querySelector('#qrStage');

    function enterStage() {
      if (cover) cover.hidden = true;
      if (stage) stage.hidden = false;
      var video = host.querySelector('#qrVideo');
      if (video && !video.paused) {
        try { video.pause(); } catch (e) {}
      }
    }

    function leaveStage() {
      if (stage) stage.hidden = true;
      if (cover) cover.hidden = false;
      var video = host.querySelector('#qrVideo');
      if (video) {
        try { video.play(); } catch (e2) {}
      }
    }

    if (start) start.addEventListener('click', enterStage);
    if (explore) explore.addEventListener('click', enterStage);
    if (back) back.addEventListener('click', leaveStage);
  }

  async function boot(host) {
    host = host || document.getElementById('quotationRuntimeRoot');
    if (!host) throw new Error('Falta #quotationRuntimeRoot');

    var q = readQuery();
    try {
      assertQuotationQuery(q);
    } catch (err) {
      showError(host, err);
      throw err;
    }

    host.innerHTML = '<p class="qr-loading">Cargando cotización…</p>';

    try {
      var bundle = await fetchBundle(q.projectId);
      loaded = bundle;
      paintHero(host, bundle);
      document.title = (bundle.project.nombre || 'Cotización') + ' · Quotation Runtime';
      return bundle;
    } catch (err) {
      showError(host, err);
      throw err;
    }
  }

  return {
    EXPERIENCE_TYPE: EXPERIENCE_TYPE,
    href: href,
    boot: boot,
    readQuery: readQuery,
    getLoaded: function () { return loaded; }
  };
})();
