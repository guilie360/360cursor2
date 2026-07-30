/**
 * QuotationRuntime — visitor / preview / Canvas iframe renderer (V7.2.08).
 *
 * Modes:
 *   - Runtime: browser viewport (Publicado, Visualizar, Preview)
 *   - Canvas: virtual 1920×1080 viewport (editor iframe inside design frame)
 *
 * Single ProjectCover mount. Editor+canvas accept live coverModel via bridge.
 */
var QuotationRuntime = (function () {
  var EXPERIENCE_TYPE = 'quotation';
  var DEFAULT_DESIGN_W = 1920;
  var DEFAULT_DESIGN_H = 1080;
  var loaded = null;
  var coverHostEl = null;
  var stageEl = null;
  var editorMode = false;
  var canvasMode = false;
  var designWidth = DEFAULT_DESIGN_W;
  var designHeight = DEFAULT_DESIGN_H;
  var liveModel = null;
  var liveElementIds = {};
  var liveSelectedId = null;
  var bridgeBound = false;

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
    var dw = parseInt(params.get('designWidth'), 10);
    var dh = parseInt(params.get('designHeight'), 10);
    return {
      projectId: String(params.get('projectId') || params.get('proyectoId') || '').trim(),
      experienceType: String(params.get('experience_type') || params.get('experienceType') || '').trim().toLowerCase(),
      preview: params.get('preview') === '1' || params.get('preview') === 'true',
      editor: params.get('editor') === '1' || params.get('editor') === 'true',
      canvas: params.get('canvas') === '1' || params.get('canvas') === 'true',
      designWidth: (dw > 0 ? dw : DEFAULT_DESIGN_W),
      designHeight: (dh > 0 ? dh : DEFAULT_DESIGN_H)
    };
  }

  /**
   * Canvas mode: lock the document so CSS vh/vw/svh/dvh resolve against the
   * design frame (iframe sized to designWidth×designHeight), not the editor chrome.
   */
  function applyCanvasViewport(q) {
    if (!q || !q.canvas) return;
    canvasMode = true;
    designWidth = q.designWidth || DEFAULT_DESIGN_W;
    designHeight = q.designHeight || DEFAULT_DESIGN_H;

    document.documentElement.classList.add('qr-canvas-mode');
    document.documentElement.setAttribute('data-qr-design-w', String(designWidth));
    document.documentElement.setAttribute('data-qr-design-h', String(designHeight));

    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=' + designWidth + ', height=' + designHeight +
          ', initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    /* Logical viewport units for anything that must not depend on iframe chrome. */
    var root = document.documentElement;
    root.style.setProperty('--qr-design-w', designWidth + 'px');
    root.style.setProperty('--qr-design-h', designHeight + 'px');
    root.style.setProperty('--qr-vw', (designWidth / 100) + 'px');
    root.style.setProperty('--qr-vh', (designHeight / 100) + 'px');

    if (document.body) {
      document.body.style.width = designWidth + 'px';
      document.body.style.height = designHeight + 'px';
      document.body.style.overflow = 'hidden';
      document.body.style.margin = '0';
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        if (!document.body) return;
        document.body.style.width = designWidth + 'px';
        document.body.style.height = designHeight + 'px';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
      });
    }
    root.style.width = designWidth + 'px';
    root.style.height = designHeight + 'px';
    root.style.overflow = 'hidden';
  }

  function assertQuotationQuery(q) {
    if (q.editor || q.canvas) return;
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
   * Build Runtime URL. Always requires projectId for visitor/preview;
   * editor/canvas may omit projectId (live model via bridge).
   */
  function href(projectId, opts) {
    opts = opts || {};
    var id = String(projectId || '').trim();
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
      var q = 'experience_type=' + EXPERIENCE_TYPE;
      if (id) q = 'projectId=' + encodeURIComponent(id) + '&' + q;
      if (opts.preview) q += '&preview=1';
      if (opts.editor) q += '&editor=1';
      if (opts.canvas) {
        q += '&canvas=1';
        q += '&designWidth=' + encodeURIComponent(String(opts.designWidth || DEFAULT_DESIGN_W));
        q += '&designHeight=' + encodeURIComponent(String(opts.designHeight || DEFAULT_DESIGN_H));
      }
      return base + '?' + q;
    }
    if (id) url.searchParams.set('projectId', id);
    url.searchParams.set('experience_type', EXPERIENCE_TYPE);
    if (opts.preview) url.searchParams.set('preview', '1');
    if (opts.editor) url.searchParams.set('editor', '1');
    if (opts.canvas) {
      url.searchParams.set('canvas', '1');
      url.searchParams.set('designWidth', String(opts.designWidth || DEFAULT_DESIGN_W));
      url.searchParams.set('designHeight', String(opts.designHeight || DEFAULT_DESIGN_H));
    }
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

  function blankEditorBundle() {
    return {
      project: { id: '', nombre: '', slug: '' },
      hero: null,
      share: { og_image: '', og_title: '', og_description: '' }
    };
  }

  function resolvePaintModel(bundle) {
    if (liveModel) {
      return typeof ProjectCover !== 'undefined' && ProjectCover.sanitizeModel
        ? ProjectCover.sanitizeModel(liveModel)
        : liveModel;
    }
    if (typeof ProjectCover !== 'undefined' && ProjectCover.resolveModel) {
      return ProjectCover.resolveModel(bundle.hero, bundle.project);
    }
    if (typeof ProjectCover !== 'undefined' && ProjectCover.fromQuotationHero) {
      return ProjectCover.fromQuotationHero(bundle.hero, bundle.project);
    }
    return null;
  }

  function collectBoxes() {
    if (!coverHostEl || typeof ProjectCover === 'undefined') return [];
    var root = coverHostEl.querySelector('[data-project-cover-root]');
    if (!root) return [];
    var boxes = [];
    var roles = ProjectCover.ROLE_SELECTORS || {};
    Object.keys(roles).forEach(function (role) {
      var el = root.querySelector(roles[role]);
      if (!el) return;
      var r = el.getBoundingClientRect();
      boxes.push({
        role: role,
        elementId: el.getAttribute('data-qe-element') || null,
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height
      });
    });
    return boxes;
  }

  function postBoxes() {
    if (!editorMode || typeof QuotationRuntimeBridge === 'undefined') return;
    QuotationRuntimeBridge.postToParent(QuotationRuntimeBridge.TYPE.BOXES, {
      boxes: collectBoxes()
    });
  }

  function remountCover(bundle) {
    if (!coverHostEl) return;
    if (typeof ProjectCover === 'undefined' || !ProjectCover.mount) return;

    var model = resolvePaintModel(bundle || loaded || blankEditorBundle());
    if (!model) return;

    var opts = {
      idPrefix: editorMode ? 'qre' : 'qr',
      interactive: !editorMode,
      editable: !!editorMode,
      elementIds: liveElementIds || {},
      selectedElementId: liveSelectedId,
      onSelect: editorMode
        ? function (id) {
          liveSelectedId = id;
          if (typeof QuotationRuntimeBridge !== 'undefined') {
            QuotationRuntimeBridge.postToParent(
              QuotationRuntimeBridge.TYPE.ELEMENT_SELECTED,
              { elementId: id }
            );
          }
          remountCover(bundle);
          postBoxes();
        }
        : null
    };

    if (!editorMode) {
      opts.onExplore = function () { enterStage(); };
      opts.onStart = function () { enterStage(); };
    }

    ProjectCover.mount(coverHostEl, model, opts);
    if (editorMode) postBoxes();
  }

  function enterStage() {
    if (!coverHostEl || !stageEl) return;
    var coverRoot = coverHostEl.querySelector('[data-project-cover-root]');
    if (coverRoot) coverRoot.hidden = true;
    stageEl.hidden = false;
    var video = coverHostEl.querySelector('video.project-cover-video');
    if (video && !video.paused) {
      try { video.pause(); } catch (e) {}
    }
  }

  function leaveStage() {
    if (!coverHostEl || !stageEl) return;
    stageEl.hidden = true;
    var coverRoot = coverHostEl.querySelector('[data-project-cover-root]');
    if (coverRoot) coverRoot.hidden = false;
    var video = coverHostEl.querySelector('video.project-cover-video');
    if (video) {
      try { video.play(); } catch (e2) {}
    }
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

    var model = resolvePaintModel(bundle);
    if (!model) {
      host.innerHTML =
        '<div class="qr-error" role="alert">' +
          '<h1 class="qr-error__title">ProjectCover no disponible</h1>' +
        '</div>';
      return;
    }

    var hc = {
      nombre: model.nombre,
      eslogan: model.eslogan
    };

    host.innerHTML = '';
    coverHostEl = document.createElement('div');
    coverHostEl.className = 'qr-cover-host';
    host.appendChild(coverHostEl);

    stageEl = document.createElement('section');
    stageEl.className = 'qr-stage';
    stageEl.id = 'qrStage';
    stageEl.hidden = true;
    stageEl.innerHTML =
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
    host.appendChild(stageEl);

    remountCover(bundle);

    var back = stageEl.querySelector('#qrBackBtn');
    if (back) back.addEventListener('click', leaveStage);
  }

  function applyEditorPayload(payload) {
    payload = payload || {};
    if (payload.coverModel) {
      liveModel = payload.coverModel;
    }
    if (payload.elementIds && typeof payload.elementIds === 'object') {
      liveElementIds = payload.elementIds;
    }
    if (payload.selectedElementId !== undefined) {
      liveSelectedId = payload.selectedElementId || null;
    }
    if (!loaded) loaded = blankEditorBundle();
    if (coverHostEl) remountCover(loaded);
    else if (document.getElementById('quotationRuntimeRoot')) {
      paintHero(document.getElementById('quotationRuntimeRoot'), loaded);
    }
  }

  function onBridgeMessage(ev) {
    if (typeof QuotationRuntimeBridge === 'undefined') return;
    if (!QuotationRuntimeBridge.isMessage(ev.data)) return;
    var type = ev.data.type;
    var payload = ev.data.payload || {};
    var T = QuotationRuntimeBridge.TYPE;

    if (type === T.SET_MODEL) {
      applyEditorPayload(payload);
      return;
    }
    if (type === T.SET_SELECTION) {
      liveSelectedId = payload.elementId || null;
      if (coverHostEl) remountCover(loaded);
      postBoxes();
      return;
    }
    if (type === T.REQUEST_BOXES) {
      postBoxes();
      return;
    }
    if (type === T.REFRESH) {
      var q = readQuery();
      if (!q.projectId) return;
      fetchBundle(q.projectId).then(function (bundle) {
        loaded = bundle;
        if (!liveModel && bundle.hero) {
          liveModel = ProjectCover.resolveModel
            ? ProjectCover.resolveModel(bundle.hero, bundle.project)
            : null;
        }
        paintHero(document.getElementById('quotationRuntimeRoot'), bundle);
      }).catch(function () {});
    }
  }

  function bindBridge() {
    if (bridgeBound) return;
    bridgeBound = true;
    window.addEventListener('message', onBridgeMessage);
  }

  async function boot(host) {
    host = host || document.getElementById('quotationRuntimeRoot');
    if (!host) throw new Error('Falta #quotationRuntimeRoot');

    var q = readQuery();
    applyCanvasViewport(q);
    editorMode = !!q.editor;
    if (editorMode) {
      document.documentElement.classList.add('qr-editor-mode');
      bindBridge();
    }

    try {
      assertQuotationQuery(q);
    } catch (err) {
      showError(host, err);
      throw err;
    }

    host.innerHTML = '<p class="qr-loading">Cargando cotización…</p>';

    try {
      if (q.projectId) {
        var bundle = await fetchBundle(q.projectId);
        loaded = bundle;
        if (!liveModel) {
          liveModel = typeof ProjectCover !== 'undefined' && ProjectCover.resolveModel
            ? ProjectCover.resolveModel(bundle.hero, bundle.project)
            : null;
        }
        paintHero(host, bundle);
        document.title = (bundle.project.nombre || 'Cotización') +
          (canvasMode ? ' · Canvas' : (editorMode ? ' · Editor' : ' · Quotation Runtime'));
      } else if (editorMode || canvasMode) {
        loaded = blankEditorBundle();
        liveModel = liveModel || (typeof ProjectCover !== 'undefined' && ProjectCover.blankModel
          ? ProjectCover.blankModel()
          : { nombre: '', eslogan: '', botonIzquierdo: 'Explorar', botonDerecho: 'Iniciar' });
        paintHero(host, loaded);
        document.title = 'Cotización · Canvas';
      }

      if (editorMode && typeof QuotationRuntimeBridge !== 'undefined') {
        QuotationRuntimeBridge.postToParent(QuotationRuntimeBridge.TYPE.READY, {
          projectId: q.projectId || null,
          editor: true,
          canvas: canvasMode,
          designWidth: designWidth,
          designHeight: designHeight
        });
        postBoxes();
      }
      return loaded;
    } catch (err) {
      showError(host, err);
      throw err;
    }
  }

  return {
    EXPERIENCE_TYPE: EXPERIENCE_TYPE,
    DEFAULT_DESIGN_W: DEFAULT_DESIGN_W,
    DEFAULT_DESIGN_H: DEFAULT_DESIGN_H,
    href: href,
    boot: boot,
    readQuery: readQuery,
    applyCanvasViewport: applyCanvasViewport,
    getLoaded: function () { return loaded; },
    applyEditorPayload: applyEditorPayload,
    collectBoxes: collectBoxes,
    isCanvasMode: function () { return canvasMode; }
  };
})();
