/**
 * QuotationRuntime — visitor/preview runtime for Quotation Rooms.
 *
 * Hero UI = ProjectCover SSOT (js/shared/project-cover.js) — same module as Canvas.
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

  function showError(host, err) {
    if (!host) return;
    host.innerHTML =
      '<div class="qr-error" role="alert">' +
        '<h1 class="qr-error__title">No se pudo abrir la Cotización</h1>' +
        '<p class="qr-error__desc">' + escapeHtml((err && err.message) || 'Error desconocido') + '</p>' +
      '</div>';
  }

  function paintHero(host, bundle) {
    if (typeof ProjectCover === 'undefined' || !ProjectCover.mount) {
      host.innerHTML =
        '<div class="qr-error" role="alert">' +
          '<h1 class="qr-error__title">ProjectCover no disponible</h1>' +
          '<p class="qr-error__desc">Falta js/shared/project-cover.js</p>' +
        '</div>';
      return;
    }

    var model = ProjectCover.fromQuotationHero(bundle.hero, bundle.project);
    var hc = {
      nombre: model.nombre,
      eslogan: model.eslogan
    };

    host.innerHTML = '';
    var coverHost = document.createElement('div');
    coverHost.className = 'qr-cover-host';
    host.appendChild(coverHost);

    var stage = document.createElement('section');
    stage.className = 'qr-stage';
    stage.id = 'qrStage';
    stage.hidden = true;
    stage.innerHTML =
      '<header class="qr-stage__header">' +
        '<p class="qr-stage__eyebrow">Cotización</p>' +
        '<h1 class="qr-stage__title">' +
          escapeHtml(hc.nombre || (bundle.project && bundle.project.nombre) || '') +
        '</h1>' +
        '<p class="qr-stage__lead">' +
          escapeHtml(hc.eslogan || (bundle.share && bundle.share.og_description) ||
            'Experiencia de cotización cargada desde hero_quotation + proyecto_config.') +
        '</p>' +
      '</header>' +
      '<p class="qr-stage__meta">projectId · ' +
        escapeHtml(bundle.project && bundle.project.id) + '</p>' +
      '<button type="button" class="project-cover-btn qr-stage__back" id="qrBackBtn">Volver al hero</button>';
    host.appendChild(stage);

    function enterStage() {
      var coverRoot = coverHost.querySelector('[data-project-cover-root]');
      if (coverRoot) coverRoot.hidden = true;
      stage.hidden = false;
      var video = coverHost.querySelector('video.project-cover-video');
      if (video && !video.paused) {
        try { video.pause(); } catch (e) {}
      }
    }

    function leaveStage() {
      stage.hidden = true;
      var coverRoot = coverHost.querySelector('[data-project-cover-root]');
      if (coverRoot) coverRoot.hidden = false;
      var video = coverHost.querySelector('video.project-cover-video');
      if (video) {
        try { video.play(); } catch (e2) {}
      }
    }

    ProjectCover.mount(coverHost, model, {
      idPrefix: 'qr',
      interactive: true,
      onExplore: enterStage,
      onStart: enterStage
    });

    var back = stage.querySelector('#qrBackBtn');
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
