/**
 * QuotationRuntime — visitor / public / Canvas iframe renderer (V7.2.26).
 *
 * Modes:
 *   - Runtime: public experience (/{slug} → here, Visualizar)
 *   - Preview live: Builder Preview — same ProjectDocument as Editor (session + bridge)
 *   - Canvas: virtual 1920×1080 viewport (editor iframe inside design frame)
 *
 * SSOT: ProjectDocument at hero_quotation.canvas (scenes + interactions).
 * QuotationRuntime.render(ProjectDocument) paints that document — never rebuilds demos.
 */
var QuotationRuntime = (function () {
  var EXPERIENCE_TYPE = 'quotation';
  var DEFAULT_DESIGN_W = 1920;
  var DEFAULT_DESIGN_H = 1080;
  var LIVE_KEY_PREFIX = 'boxies_qe_live_doc_v1_';
  var loaded = null;
  var coverHostEl = null;
  var stageEl = null;
  var editorMode = false;
  var canvasMode = false;
  var previewMode = false;
  var liveMode = false;
  var designWidth = DEFAULT_DESIGN_W;
  var designHeight = DEFAULT_DESIGN_H;
  var liveModel = null;
  var liveElementIds = {};
  var liveSelectedId = null;
  var bridgeBound = false;
  var activeSceneId = null;
  var ixLayerEl = null;
  var sceneMediaEl = null;

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
      live: params.get('live') === '1' || params.get('live') === 'true',
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

  function canvasDoc(bundle) {
    var hero = bundle && bundle.hero;
    return hero && hero.canvas && typeof hero.canvas === 'object' ? hero.canvas : null;
  }

  function listScenes(bundle) {
    var doc = canvasDoc(bundle);
    return doc && Array.isArray(doc.scenes) ? doc.scenes : [];
  }

  function sceneById(bundle, id) {
    var scenes = listScenes(bundle);
    var sid = String(id || '');
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i] && String(scenes[i].id) === sid) return scenes[i];
    }
    return null;
  }

  function entryScene(bundle) {
    var scenes = listScenes(bundle);
    var i;
    for (i = 0; i < scenes.length; i++) {
      if (scenes[i] && (scenes[i].type === 'hero' || scenes[i].templateId === 'hero-default') &&
          scenes[i].coverModel) {
        return scenes[i];
      }
    }
    for (i = 0; i < scenes.length; i++) {
      if (scenes[i] && scenes[i].coverModel) return scenes[i];
    }
    return scenes[0] || null;
  }

  function resolveSceneMedia(scene, bundle) {
    if (!scene) return null;
    if (scene.mediaUrl) {
      return {
        url: scene.mediaUrl,
        type: scene.mediaType === 'video' ? 'video' : 'image'
      };
    }
    var cm = scene.coverModel;
    if (cm) {
      if (cm.videoUrl) return { url: cm.videoUrl, type: 'video' };
      if (cm.imageUrl) return { url: cm.imageUrl, type: 'image' };
    }
    /* Never borrow top-level hero media for arbitrary scenes — that shows stale backgrounds. */
    var entry = entryScene(bundle);
    var isEntry = !!(entry && scene && String(entry.id) === String(scene.id));
    if (isEntry) {
      var hero = bundle && bundle.hero;
      if (hero) {
        if (hero.video_url) return { url: hero.video_url, type: 'video' };
        if (hero.image_url) return { url: hero.image_url, type: 'image' };
      }
    }
    return null;
  }

  function isButtonIx(ix) {
    return !!(ix && String(ix.type || '').toUpperCase() === 'BUTTON' && ix.enabled !== false);
  }

  function isHotspotIx(ix) {
    if (!ix || String(ix.type || '').toUpperCase() !== 'HOTSPOT' || ix.enabled === false) return false;
    return Array.isArray(ix.polygon) && ix.polygon.length >= 3;
  }

  function runInteractionAction(ix) {
    if (!ix) return;
    var action = String(ix.action || 'goto-scene').toLowerCase();
    var target = ix.targetSceneId || null;
    if (action === 'goto-scene' || action === 'goto' || (!action && target)) {
      if (target) goToScene(target);
      else enterStage();
      return;
    }
    if (action === 'url' || action === 'open-url') {
      var href = ix.url || ix.href;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'download') {
      var dl = ix.downloadUrl || ix.url;
      if (dl) {
        var a = document.createElement('a');
        a.href = dl;
        a.download = '';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return;
    }
    if (action === 'close' || action === 'back') {
      leaveStage();
    }
  }

  function paintInteractionLayer(parentEl, scene, interactive) {
    if (!parentEl) return;
    if (ixLayerEl && ixLayerEl.parentNode) ixLayerEl.parentNode.removeChild(ixLayerEl);
    ixLayerEl = null;
    /* Canvas editor iframe uses Experiencia overlay — skip Runtime ix there only. */
    if (!scene || (editorMode && canvasMode)) return;

    var ixs = Array.isArray(scene.interactions) ? scene.interactions : [];
    var buttons = ixs.filter(isButtonIx);
    var hotspots = ixs.filter(isHotspotIx);
    if (!buttons.length && !hotspots.length) return;

    ixLayerEl = document.createElement('div');
    ixLayerEl.className = 'qr-ix-layer';
    ixLayerEl.setAttribute('data-qr-ix-layer', '1');

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'qr-ix-hotspots');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    hotspots.forEach(function (hs) {
      var pts = hs.polygon.map(function (p, idx) {
        return (idx === 0 ? 'M' : 'L') + Number(p.x) + ' ' + Number(p.y);
      }).join(' ') + ' Z';
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pts);
      path.setAttribute('class', 'qr-ix-hs');
      path.setAttribute('fill', hs.color || 'rgba(111,191,134,0.28)');
      path.setAttribute('fill-opacity', String(hs.opacity != null ? hs.opacity : 0.22));
      path.setAttribute('stroke', hs.color || 'rgba(255,255,255,0.85)');
      path.setAttribute('stroke-width', '0.35');
      if (interactive) {
        path.style.cursor = 'pointer';
        path.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(hs);
        });
      }
      svg.appendChild(path);
    });
    ixLayerEl.appendChild(svg);

    var btnsHost = document.createElement('div');
    btnsHost.className = 'qr-ix-buttons';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qr-ix-btn qr-ix-btn--' + (b.style || 'chip');
      btn.textContent = b.label || 'Botón';
      var rot = Number(b.rotation) || 0;
      btn.style.left = Number(b.x) + '%';
      btn.style.top = Number(b.y) + '%';
      btn.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
      if (interactive) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(b);
        });
      } else {
        btn.disabled = true;
      }
      btnsHost.appendChild(btn);
    });
    ixLayerEl.appendChild(btnsHost);
    parentEl.appendChild(ixLayerEl);
  }

  function ensureSceneMediaHost(parentEl) {
    if (sceneMediaEl && sceneMediaEl.parentNode) return sceneMediaEl;
    sceneMediaEl = document.createElement('div');
    sceneMediaEl.className = 'qr-scene-media';
    sceneMediaEl.setAttribute('data-qr-scene-media', '1');
    parentEl.appendChild(sceneMediaEl);
    return sceneMediaEl;
  }

  function paintSceneMedia(parentEl, scene, bundle) {
    var host = ensureSceneMediaHost(parentEl);
    var media = resolveSceneMedia(scene, bundle);
    if (!media || !media.url) {
      host.innerHTML = '<div class="qr-scene-media__void" aria-hidden="true"></div>';
      return host;
    }
    if (media.type === 'video') {
      host.innerHTML =
        '<video class="qr-scene-media__video" src="' + escapeHtml(media.url) +
          '" autoplay muted loop playsinline></video>';
    } else {
      host.innerHTML =
        '<img class="qr-scene-media__img" src="' + escapeHtml(media.url) +
          '" alt="">';
    }
    return host;
  }

  function goToScene(sceneId) {
    var bundle = loaded || blankEditorBundle();
    var scene = sceneById(bundle, sceneId);
    if (!scene) return;
    activeSceneId = String(scene.id);
    var isEntry = entryScene(bundle) && String(entryScene(bundle).id) === activeSceneId &&
      (scene.type === 'hero' || scene.templateId === 'hero-default' || scene.coverModel);

    if (isEntry && coverHostEl) {
      leaveStage();
      paintInteractionLayer(coverHostEl, scene, interactionsInteractive());
      return;
    }

    if (!coverHostEl || !stageEl) return;
    var coverRoot = coverHostEl.querySelector('[data-project-cover-root]');
    if (coverRoot) coverRoot.hidden = true;
    if (ixLayerEl && ixLayerEl.parentNode === coverHostEl) {
      coverHostEl.removeChild(ixLayerEl);
      ixLayerEl = null;
    }
    stageEl.hidden = false;
    stageEl.classList.add('qr-stage--scene');
    stageEl.innerHTML = '';
    var mediaHost = paintSceneMedia(stageEl, scene, bundle);
    paintInteractionLayer(mediaHost, scene, interactionsInteractive());
    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'project-cover-btn qr-stage__back';
    back.textContent = 'Volver';
    back.addEventListener('click', leaveStage);
    stageEl.appendChild(back);
    var video = coverHostEl.querySelector('video.project-cover-video');
    if (video && !video.paused) {
      try { video.pause(); } catch (e) {}
    }
  }

  function interactionsInteractive() {
    /* Preview + published: clickable. Canvas editor: no (overlay owns edits). */
    return !(editorMode && canvasMode);
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

  function mergeBootQuery(opts) {
    var q = readQuery();
    opts = opts || {};
    if (opts.projectId) q.projectId = String(opts.projectId).trim();
    if (opts.experienceType) q.experienceType = String(opts.experienceType).trim().toLowerCase();
    if (opts.preview != null) q.preview = !!opts.preview;
    if (opts.live != null) q.live = !!opts.live;
    if (opts.editor != null) q.editor = !!opts.editor;
    if (opts.canvas != null) q.canvas = !!opts.canvas;
    if (opts.designWidth > 0) q.designWidth = opts.designWidth;
    if (opts.designHeight > 0) q.designHeight = opts.designHeight;
    if (!q.experienceType) q.experienceType = EXPERIENCE_TYPE;
    return q;
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
      if (opts.live) q += '&live=1';
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
    if (opts.live) url.searchParams.set('live', '1');
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

  function liveStorageKey(projectId) {
    return LIVE_KEY_PREFIX + String(projectId || '').trim();
  }

  function readLiveEnvelope(projectId) {
    var id = String(projectId || '').trim();
    if (!id) return null;
    try {
      var raw = sessionStorage.getItem(liveStorageKey(id));
      if (!raw) return null;
      var env = JSON.parse(raw);
      if (!env || !env.canvas || typeof env.canvas !== 'object') return null;
      return env;
    } catch (eLive) {
      return null;
    }
  }

  /**
   * Apply ProjectDocument as Runtime SSOT. Does not invent scenes/buttons/hero.
   */
  function applyDocument(canvasDoc, meta) {
    meta = meta || {};
    if (!loaded) loaded = blankEditorBundle();
    if (!loaded.hero || typeof loaded.hero !== 'object') loaded.hero = {};
    if (canvasDoc && typeof canvasDoc === 'object') {
      loaded.hero.canvas = canvasDoc;
    }
    if (meta.project && typeof meta.project === 'object') {
      loaded.project = Object.assign({}, loaded.project || {}, meta.project);
    }
    if (meta.coverModel) {
      liveModel = meta.coverModel;
    } else if (canvasDoc && Array.isArray(canvasDoc.scenes)) {
      var entry = entryScene(loaded);
      if (entry && entry.coverModel) liveModel = entry.coverModel;
      else liveModel = null;
    }
    if (meta.elementIds && typeof meta.elementIds === 'object') {
      liveElementIds = meta.elementIds;
    }
    if (meta.selectedElementId !== undefined) {
      liveSelectedId = meta.selectedElementId || null;
    }
    if (canvasDoc && canvasDoc.activeSceneId) {
      activeSceneId = String(canvasDoc.activeSceneId);
    }
    return loaded;
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
      /* Left CTA (Cotización / Explorar): proposals picker — no longer opens menu or jumps scene. */
      opts.onExplore = function () {
        if (typeof QuotationProposalsModal !== 'undefined' && QuotationProposalsModal.open) {
          QuotationProposalsModal.open();
          return;
        }
        enterStage();
      };
      opts.onStart = function () { enterStage(); };
    }

    ProjectCover.mount(coverHostEl, model, opts);
    if (editorMode) postBoxes();

    /* Visitor + Builder Preview: paint hero-scene interactions over the cover. */
    if (!(editorMode && canvasMode)) {
      var entry = entryScene(bundle || loaded);
      if (entry) {
        activeSceneId = String(entry.id);
        paintInteractionLayer(coverHostEl, entry, interactionsInteractive());
      }
    }
  }

  function enterStage() {
    var bundle = loaded || blankEditorBundle();
    var scenes = listScenes(bundle);
    var entry = entryScene(bundle);
    var next = null;
    var i;
    for (i = 0; i < scenes.length; i++) {
      if (!scenes[i]) continue;
      if (entry && String(scenes[i].id) === String(entry.id)) continue;
      next = scenes[i];
      break;
    }
    if (!next) {
      /* Stay on hero but ensure overlays; or first scene with media. */
      for (i = 0; i < scenes.length; i++) {
        if (scenes[i] && resolveSceneMedia(scenes[i], bundle)) {
          next = scenes[i];
          break;
        }
      }
    }
    if (next) goToScene(next.id);
    else if (entry) goToScene(entry.id);
  }

  function leaveStage() {
    if (!coverHostEl || !stageEl) return;
    stageEl.hidden = true;
    stageEl.classList.remove('qr-stage--scene');
    stageEl.innerHTML = '';
    sceneMediaEl = null;
    var coverRoot = coverHostEl.querySelector('[data-project-cover-root]');
    if (coverRoot) coverRoot.hidden = false;
    var video = coverHostEl.querySelector('video.project-cover-video');
    if (video) {
      try { video.play(); } catch (e2) {}
    }
    var entry = entryScene(loaded);
    if (entry && !(editorMode && canvasMode)) {
      activeSceneId = String(entry.id);
      paintInteractionLayer(coverHostEl, entry, interactionsInteractive());
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
    if (!model && typeof ProjectCover.blankModel === 'function') {
      model = ProjectCover.blankModel();
    }
    if (!model) {
      host.innerHTML =
        '<div class="qr-error" role="alert">' +
          '<h1 class="qr-error__title">ProjectCover no disponible</h1>' +
        '</div>';
      return;
    }

    host.innerHTML = '';
    coverHostEl = document.createElement('div');
    coverHostEl.className = 'qr-cover-host';
    host.appendChild(coverHostEl);

    stageEl = document.createElement('section');
    stageEl.className = 'qr-stage';
    stageEl.id = 'qrStage';
    stageEl.hidden = true;
    host.appendChild(stageEl);

    remountCover(bundle);

    /* If active scene is not the entry cover, jump straight to it (live Preview). */
    var doc = canvasDoc(bundle || loaded);
    if (doc && doc.activeSceneId && !(editorMode && canvasMode)) {
      var entry = entryScene(bundle || loaded);
      if (!entry || String(entry.id) !== String(doc.activeSceneId)) {
        goToScene(doc.activeSceneId);
      }
    }
  }

  function applyEditorPayload(payload) {
    payload = payload || {};
    if (payload.canvas && typeof payload.canvas === 'object') {
      applyDocument(payload.canvas, {
        project: payload.project || null,
        coverModel: payload.coverModel || null,
        elementIds: payload.elementIds,
        selectedElementId: payload.selectedElementId
      });
    } else {
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
    }
    var host = document.getElementById('quotationRuntimeRoot');
    /* Canvas editor: soft remount — parent Experiencia overlay owns the chrome. */
    if (editorMode && canvasMode) {
      if (coverHostEl) remountCover(loaded);
      else if (host) paintHero(host, loaded);
      return;
    }
    if (coverHostEl && payload.canvas) {
      if (host) paintHero(host, loaded);
      else remountCover(loaded);
    } else if (coverHostEl) {
      remountCover(loaded);
    } else if (host) {
      paintHero(host, loaded);
    }
  }

  /**
   * Public API — paint exactly this ProjectDocument (WYSIWYG).
   * @param {object} projectDocument canvas doc { version, activeSceneId, scenes }
   * @param {HTMLElement=} host
   * @param {{project?:object,coverModel?:object}=} meta
   */
  function render(projectDocument, host, meta) {
    host = host || document.getElementById('quotationRuntimeRoot');
    if (!host) throw new Error('Falta #quotationRuntimeRoot');
    applyDocument(projectDocument, meta || {});
    paintHero(host, loaded);
    return loaded;
  }

  function onBridgeMessage(ev) {
    if (typeof QuotationRuntimeBridge === 'undefined') return;
    if (!QuotationRuntimeBridge.isMessage(ev.data)) return;
    var type = ev.data.type;
    var payload = ev.data.payload || {};
    var T = QuotationRuntimeBridge.TYPE;

    if (type === T.SET_DOCUMENT || type === T.SET_MODEL) {
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
      if (q.live || liveMode) {
        var env = readLiveEnvelope(q.projectId);
        if (env && env.canvas) {
          applyDocument(env.canvas, { project: env.project || null });
          paintHero(document.getElementById('quotationRuntimeRoot'), loaded);
          return;
        }
      }
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

  /**
   * @param {HTMLElement|{host?:HTMLElement,projectId?:string}} hostOrOpts
   * @param {{projectId?:string,editor?:boolean,canvas?:boolean}=} maybeOpts
   */
  async function boot(hostOrOpts, maybeOpts) {
    var opts = {};
    var host;
    if (hostOrOpts && typeof hostOrOpts === 'object' && !hostOrOpts.nodeType &&
        !(hostOrOpts instanceof Element)) {
      opts = hostOrOpts;
      host = opts.host || document.getElementById('quotationRuntimeRoot');
    } else {
      host = hostOrOpts || document.getElementById('quotationRuntimeRoot');
      opts = maybeOpts || {};
    }
    if (!host) throw new Error('Falta #quotationRuntimeRoot');

    var q = mergeBootQuery(opts);
    applyCanvasViewport(q);
    canvasMode = !!q.canvas;
    designWidth = q.designWidth || DEFAULT_DESIGN_W;
    designHeight = q.designHeight || DEFAULT_DESIGN_H;
    editorMode = !!q.editor;
    previewMode = !!q.preview;
    liveMode = !!q.live || !!opts.liveDocument;
    if (editorMode) {
      document.documentElement.classList.add('qr-editor-mode');
    }
    if (previewMode) {
      document.documentElement.classList.add('qr-preview-mode');
    }
    /* Bridge for Canvas editor AND Builder live Preview. */
    if (editorMode || liveMode || previewMode) {
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
      var liveEnv = null;
      if (opts.liveDocument && opts.liveDocument.canvas) {
        liveEnv = opts.liveDocument;
      } else if (liveMode && q.projectId) {
        liveEnv = readLiveEnvelope(q.projectId);
      }

      if (q.projectId) {
        try {
          var bundle = await fetchBundle(q.projectId);
          loaded = bundle;
        } catch (eFetch) {
          if (!liveEnv) throw eFetch;
          loaded = blankEditorBundle();
          loaded.project = { id: q.projectId, nombre: '', slug: '' };
        }
        if (liveEnv && liveEnv.canvas) {
          applyDocument(liveEnv.canvas, {
            project: liveEnv.project || loaded.project,
            coverModel: null
          });
        } else if (!liveModel && loaded.hero) {
          liveModel = typeof ProjectCover !== 'undefined' && ProjectCover.resolveModel
            ? ProjectCover.resolveModel(loaded.hero, loaded.project)
            : null;
        }
        paintHero(host, loaded);
        document.title = (loaded.project && loaded.project.nombre
          ? loaded.project.nombre
          : 'Cotización') +
          (canvasMode ? ' · Canvas' : (previewMode ? ' · Preview' : (editorMode ? ' · Editor' : '')));
      } else if (liveEnv && liveEnv.canvas) {
        loaded = blankEditorBundle();
        applyDocument(liveEnv.canvas, { project: liveEnv.project || null });
        paintHero(host, loaded);
        document.title = 'Cotización · Preview';
      } else if (editorMode || canvasMode) {
        loaded = blankEditorBundle();
        liveModel = liveModel || (typeof ProjectCover !== 'undefined' && ProjectCover.blankModel
          ? ProjectCover.blankModel()
          : { nombre: '', eslogan: '', botonIzquierdo: 'Explorar', botonDerecho: 'Iniciar' });
        paintHero(host, loaded);
        document.title = 'Cotización · Canvas';
      }

      if ((editorMode || liveMode || previewMode) && typeof QuotationRuntimeBridge !== 'undefined') {
        QuotationRuntimeBridge.postToParent(QuotationRuntimeBridge.TYPE.READY, {
          projectId: q.projectId || null,
          editor: !!editorMode,
          preview: !!previewMode,
          live: !!liveMode,
          canvas: canvasMode,
          designWidth: designWidth,
          designHeight: designHeight
        });
        if (editorMode) postBoxes();
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
    LIVE_KEY_PREFIX: LIVE_KEY_PREFIX,
    href: href,
    boot: boot,
    render: render,
    readQuery: readQuery,
    applyCanvasViewport: applyCanvasViewport,
    applyDocument: applyDocument,
    getLoaded: function () { return loaded; },
    applyEditorPayload: applyEditorPayload,
    collectBoxes: collectBoxes,
    isCanvasMode: function () { return canvasMode; },
    isPreviewMode: function () { return previewMode; },
    isLiveMode: function () { return liveMode; }
  };
})();
