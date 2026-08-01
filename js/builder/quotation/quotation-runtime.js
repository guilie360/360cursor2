/**
 * QuotationRuntime — visitor / public / Canvas iframe renderer (V7.2.43).
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
  var proposalsHostEl = null;
  var presentationRootEl = null;
  /** @type {'hero'|'proposalSelection'|'comparison'|'proposalDetail'} */
  var presentationView = 'hero';
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

  /**
   * Editor SSOT: a scene with mediaUrl / publicUrl / resourceId is a media scene.
   * Runtime must paint it on the stage — never substitute ProjectCover / hero.image_url.
   */
  function sceneIsMediaScene(scene) {
    if (!scene) return false;
    if (scene.resourceId) return true;
    var u = scene.mediaUrl || scene.publicUrl || null;
    return !!(u && String(u).indexOf('blob:') !== 0);
  }

  function resolveSceneMedia(scene, bundle) {
    if (!scene) {
      /* V7.2.41 audit — no logic change */
      console.log('[QR V7.2.41] resolveSceneMedia → null: scene es null/undefined');
      return null;
    }
    var url = scene.mediaUrl || scene.publicUrl || null;
    if (url && String(url).indexOf('blob:') !== 0) {
      return {
        url: url,
        type: scene.mediaType === 'video' ? 'video' : 'image'
      };
    }
    if (url && String(url).indexOf('blob:') === 0) {
      console.log('[QR V7.2.41] resolveSceneMedia: mediaUrl/publicUrl es blob: (descartado)', url);
    } else if (!url) {
      console.log('[QR V7.2.41] resolveSceneMedia: mediaUrl y publicUrl ausentes o vacíos', {
        mediaUrl: scene.mediaUrl,
        publicUrl: scene.publicUrl,
        resourceId: scene.resourceId
      });
    }
    var cm = scene.coverModel;
    if (cm) {
      if (cm.videoUrl && String(cm.videoUrl).indexOf('blob:') !== 0) {
        return { url: cm.videoUrl, type: 'video' };
      }
      if (cm.imageUrl && String(cm.imageUrl).indexOf('blob:') !== 0) {
        return { url: cm.imageUrl, type: 'image' };
      }
      console.log('[QR V7.2.41] resolveSceneMedia → null: coverModel sin imageUrl/videoUrl persistibles', {
        imageUrl: cm.imageUrl || null,
        videoUrl: cm.videoUrl || null
      });
    } else {
      console.log('[QR V7.2.41] resolveSceneMedia → null: sin coverModel y sin mediaUrl/publicUrl usable');
    }
    /* Do not borrow top-level hero.image_url / video_url — Editor paints the scene, not hero. */
    console.log('[QR V7.2.41] resolveSceneMedia → null: no se usa hero.image_url (prohibido en V7.2.40+)');
    return null;
  }

  /** First scene Preview/Web must show: active with media, else first media scene. */
  function pickStartupScene(bundle) {
    var doc = canvasDoc(bundle);
    var scenes = listScenes(bundle);
    var preferred = null;
    if (doc && doc.activeSceneId) {
      preferred = sceneById(bundle, doc.activeSceneId);
    }
    if (preferred && (sceneIsMediaScene(preferred) || resolveSceneMedia(preferred, bundle))) {
      return preferred;
    }
    var i;
    for (i = 0; i < scenes.length; i++) {
      if (!scenes[i]) continue;
      if (sceneIsMediaScene(scenes[i]) || resolveSceneMedia(scenes[i], bundle)) {
        return scenes[i];
      }
    }
    return null;
  }

  function sceneHasCoverChrome(scene) {
    if (!scene) return false;
    return !!(scene.coverModel || scene.type === 'hero' || scene.templateId === 'hero-default');
  }

  function isButtonIx(ix) {
    return !!(ix && String(ix.type || '').toUpperCase() === 'BUTTON' && ix.enabled !== false);
  }

  function isHotspotIx(ix) {
    if (!ix || String(ix.type || '').toUpperCase() !== 'HOTSPOT' || ix.enabled === false) return false;
    return Array.isArray(ix.polygon) && ix.polygon.length >= 3;
  }

  function isTextIx(ix) {
    return !!(ix && String(ix.type || '').toUpperCase() === 'TEXT' && ix.enabled !== false);
  }

  function isShapeIx(ix) {
    if (!ix || ix.enabled === false) return false;
    var t = String(ix.type || '').toUpperCase();
    return t === 'SHAPE_RECT' || t === 'SHAPE_CIRCLE';
  }

  function ixIsVisible(ix) {
    return !(ix && ix.visible === false);
  }

  function runInteractionAction(ix, actionOpts) {
    if (!ix) return;
    actionOpts = actionOpts || {};
    if (typeof actionOpts.onAction === 'function') {
      try {
        if (actionOpts.onAction(ix) === true) return;
      } catch (eAct) { /* fall through */ }
    }
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
      return;
    }
    if (action === 'open-proposals' || action === 'proposals') {
      openProposalsPage();
      return;
    }
    if (action === 'open-proposals-page' || action === 'proposals-page') {
      openProposalsPage();
    }
  }

  /**
   * In-page presentation: hero → proposalSelection (no URL change, no remount).
   * Sections are pre-mounted; only opacity/transform animate.
   */
  function setPresentationView(view) {
    var next = String(view || 'hero');
    if (
      next !== 'hero' &&
      next !== 'proposalSelection' &&
      next !== 'comparison' &&
      next !== 'proposalDetail'
    ) {
      next = 'hero';
    }
    presentationView = next;
    var root = presentationRootEl || document.getElementById('quotationRuntimeRoot');
    if (root) {
      root.setAttribute('data-qr-view', next);
      root.classList.toggle('is-qr-proposals', next === 'proposalSelection');
    }
    if (coverHostEl) {
      coverHostEl.setAttribute('aria-hidden', next === 'hero' ? 'false' : 'true');
      if (next === 'hero') {
        coverHostEl.removeAttribute('inert');
      } else {
        coverHostEl.setAttribute('inert', '');
      }
    }
    if (proposalsHostEl) {
      proposalsHostEl.setAttribute('aria-hidden', next === 'proposalSelection' ? 'false' : 'true');
      if (next === 'proposalSelection') {
        proposalsHostEl.removeAttribute('inert');
      } else {
        proposalsHostEl.setAttribute('inert', '');
      }
    }
  }

  function ensureProposalsSection(host) {
    if (!host || editorMode) return;
    if (proposalsHostEl && proposalsHostEl.parentNode === host) return;
    proposalsHostEl = document.createElement('section');
    proposalsHostEl.className = 'qr-proposals-section';
    proposalsHostEl.setAttribute('data-qr-proposals', '');
    proposalsHostEl.setAttribute('aria-hidden', 'true');
    proposalsHostEl.setAttribute('inert', '');
    host.appendChild(proposalsHostEl);
    if (typeof QuotationProposalsPage !== 'undefined' && QuotationProposalsPage.mount) {
      QuotationProposalsPage.mount(proposalsHostEl, {
        onBack: function () {
          setPresentationView('hero');
        }
      });
    }
  }

  function openProposalsPage() {
    if (presentationView === 'proposalSelection') return;
    ensureProposalsSection(presentationRootEl || document.getElementById('quotationRuntimeRoot'));
    /* Reveal section first (display:none → block), then animate in. */
    if (proposalsHostEl) {
      proposalsHostEl.style.display = 'block';
      proposalsHostEl.style.opacity = '0';
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (proposalsHostEl) {
          proposalsHostEl.style.removeProperty('display');
          proposalsHostEl.style.removeProperty('opacity');
        }
        setPresentationView('proposalSelection');
      });
    });
  }

  function paintInteractionLayer(parentEl, scene, interactive, opts) {
    opts = opts || {};
    if (!parentEl) return null;
    if (ixLayerEl && ixLayerEl.parentNode) ixLayerEl.parentNode.removeChild(ixLayerEl);
    ixLayerEl = null;
    /* Legacy canvas iframe: Experiencia owns edits — skip Runtime ix there only. */
    if (!scene || (editorMode && canvasMode && !opts.force)) return null;
    if (opts.paintInteractions === false) return null;

    var ixs = Array.isArray(scene.interactions) ? scene.interactions : [];
    var hotspots = ixs.filter(function (ix) { return isHotspotIx(ix) && ixIsVisible(ix); });
    var buttons = ixs.filter(function (ix) { return isButtonIx(ix) && ixIsVisible(ix); });
    var texts = ixs.filter(function (ix) { return isTextIx(ix) && ixIsVisible(ix); });
    var shapes = ixs.filter(function (ix) { return isShapeIx(ix) && ixIsVisible(ix); });
    if (!hotspots.length && !buttons.length && !texts.length && !shapes.length) return null;

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
      if (hs.id) path.setAttribute('data-qr-ix-id', String(hs.id));
      path.setAttribute('fill', hs.color || 'rgba(111,191,134,0.28)');
      path.setAttribute('fill-opacity', String(hs.opacity != null ? hs.opacity : 0.22));
      path.setAttribute('stroke', hs.color || 'rgba(255,255,255,0.85)');
      path.setAttribute('stroke-width', '0.35');
      if (interactive) {
        path.style.cursor = 'pointer';
        path.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(hs, opts);
        });
      }
      svg.appendChild(path);
    });
    /* Never mount an empty full-bleed SVG — it steals taps on iOS/WebKit. */
    if (hotspots.length) ixLayerEl.appendChild(svg);

    var btnsHost = document.createElement('div');
    btnsHost.className = 'qr-ix-buttons';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qr-ix-btn qr-ix-btn--' + (b.style || 'chip');
      if (b.id) btn.setAttribute('data-qr-ix-id', String(b.id));
      btn.textContent = b.label || 'Botón';
      var rot = Number(b.rotation) || 0;
      btn.style.left = Number(b.x) + '%';
      btn.style.top = Number(b.y) + '%';
      btn.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
      if (interactive) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(b, opts);
        });
      } else {
        btn.disabled = true;
      }
      btnsHost.appendChild(btn);
    });
    texts.forEach(function (tx) {
      var el = document.createElement('div');
      el.className = 'qr-ix-text';
      if (tx.id) el.setAttribute('data-qr-ix-id', String(tx.id));
      el.textContent = tx.label != null ? String(tx.label) : 'Texto';
      var rot = Number(tx.rotation) || 0;
      var fw = String(tx.fontWeight || '400');
      el.style.left = Number(tx.x) + '%';
      el.style.top = Number(tx.y) + '%';
      el.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
      el.style.fontSize = (Number(tx.fontSize) || 28) + 'px';
      el.style.color = tx.color || '#ffffff';
      el.style.fontFamily = String(tx.fontFamily || 'system-ui, sans-serif');
      el.style.fontWeight = (fw === '700' || fw === 'bold') ? '700' : '400';
      el.style.textAlign = String(tx.textAlign || 'center');
      el.style.opacity = String(tx.opacity != null ? tx.opacity : 1);
      el.style.pointerEvents = interactive ? 'auto' : 'none';
      if (interactive) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(tx, opts);
        });
      }
      btnsHost.appendChild(el);
    });
    shapes.forEach(function (sh) {
      var t = String(sh.type || '').toUpperCase();
      var el = document.createElement('div');
      el.className = 'qr-ix-shape' + (t === 'SHAPE_CIRCLE' ? ' qr-ix-shape--circle' : ' qr-ix-shape--rect');
      if (sh.id) el.setAttribute('data-qr-ix-id', String(sh.id));
      var rot = Number(sh.rotation) || 0;
      el.style.left = Number(sh.x) + '%';
      el.style.top = Number(sh.y) + '%';
      el.style.width = (Number(sh.width) || 12) + '%';
      el.style.height = (Number(sh.height) || (t === 'SHAPE_CIRCLE' ? 12 : 8)) + '%';
      el.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
      el.style.background = sh.fill || 'rgba(255,255,255,0.18)';
      el.style.border = (Number(sh.strokeWidth) || 2) + 'px solid ' +
        (sh.stroke || 'rgba(255,255,255,0.65)');
      el.style.borderRadius = (sh.borderRadius != null
        ? Number(sh.borderRadius)
        : (t === 'SHAPE_CIRCLE' ? 999 : 8)) + 'px';
      el.style.pointerEvents = interactive ? 'auto' : 'none';
      if (interactive) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          runInteractionAction(sh, opts);
        });
      }
      btnsHost.appendChild(el);
    });
    ixLayerEl.appendChild(btnsHost);
    parentEl.appendChild(ixLayerEl);
    return ixLayerEl;
  }

  function ensureSceneMediaHost(parentEl) {
    /* V7.2.60 — media lives inside HeroCanvas lienzo. */
    return null;
  }

  var heroCanvasApi = null;

  function paintSceneMedia(parentEl, scene, bundle, opts) {
    opts = opts || {};
    if (!parentEl) return null;
    parentEl.innerHTML = '';
    sceneMediaEl = null;

    var media = resolveSceneMedia(scene, bundle);
    var urlFinal = media && media.url ? media.url : null;
    console.log('[QR V7.2.64] paintSceneMedia URL final:', urlFinal);

    var enablePan = opts.enablePan != null ? !!opts.enablePan : !(editorMode && canvasMode);
    var disableHint = opts.disableHint != null
      ? !!opts.disableHint
      : !!(editorMode && canvasMode);

    if (typeof HeroCanvas === 'undefined' || !HeroCanvas.mount) {
      console.warn('[QR V7.2.64] HeroCanvas missing — fallback flat cover host');
      var fallback = document.createElement('div');
      fallback.className = 'qr-scene-media hero-renderer';
      parentEl.appendChild(fallback);
      sceneMediaEl = fallback;
      if (media && media.url && typeof HeroRenderer !== 'undefined') {
        HeroRenderer.paint(fallback, { src: media.url, kind: media.type === 'video' ? 'video' : 'image' });
      }
      return fallback;
    }

    if (heroCanvasApi && heroCanvasApi.destroy) {
      try { heroCanvasApi.destroy(); } catch (eD) { /* ignore */ }
      heroCanvasApi = null;
    }

    heroCanvasApi = HeroCanvas.mount(parentEl, {
      media: media && media.url
        ? { src: media.url, kind: media.type === 'video' ? 'video' : 'image' }
        : null,
      paintOpts: {
        mediaClass: media && media.type === 'video' ? 'qr-scene-media__video' : 'qr-scene-media__img'
      },
      enablePan: enablePan,
      disableHint: disableHint
    });

    sceneMediaEl = heroCanvasApi.mediaSlot;
    if (!media || !media.url) {
      if (heroCanvasApi.clearMedia) heroCanvasApi.clearMedia();
    }
    logPaintSceneMediaDomAudit(parentEl, sceneMediaEl);
    /* Interaction layer must attach to the lienzo (1920×1080), not the window. */
    return heroCanvasApi.canvas;
  }

  /**
   * V7.2.64 — Single shared scene paint for Builder / Preview / Runtime.
   * hostEl = viewport window. Returns api with canvas (1920×1080 lienzo).
   */
  function paintScene(hostEl, scene, bundle, opts) {
    opts = opts || {};
    if (!hostEl) return null;
    var interactive = opts.interactive === true;
    var paintIx = opts.paintInteractions !== false;
    var canvas = paintSceneMedia(hostEl, scene, bundle, {
      enablePan: opts.enablePan,
      disableHint: opts.disableHint != null ? opts.disableHint : (opts.mode === 'builder')
    });
    if (paintIx && canvas) {
      paintInteractionLayer(canvas, scene, interactive, {
        force: opts.mode === 'builder' || opts.mode === 'preview',
        paintInteractions: true,
        onAction: typeof opts.onAction === 'function' ? opts.onAction : null
      });
    }
    return {
      host: hostEl,
      canvas: canvas,
      mediaSlot: sceneMediaEl,
      heroCanvas: heroCanvasApi,
      mode: opts.mode || 'publish',
      refreshInteractions: function (nextScene, nextInteractive) {
        if (!canvas) return null;
        return paintInteractionLayer(
          canvas,
          nextScene || scene,
          nextInteractive != null ? !!nextInteractive : interactive,
          { force: true, paintInteractions: paintIx }
        );
      },
      getCamera: function () {
        return heroCanvasApi && heroCanvasApi.getCamera
          ? heroCanvasApi.getCamera()
          : { panX: 0, panY: 0, zoom: 1 };
      },
      setCamera: function (cam) {
        if (heroCanvasApi && heroCanvasApi.setCamera) heroCanvasApi.setCamera(cam);
      },
      destroy: function () {
        if (ixLayerEl && ixLayerEl.parentNode) {
          try { ixLayerEl.parentNode.removeChild(ixLayerEl); } catch (eR) { /* ignore */ }
        }
        ixLayerEl = null;
        if (heroCanvasApi && heroCanvasApi.destroy) {
          try { heroCanvasApi.destroy(); } catch (eD) { /* ignore */ }
        }
        heroCanvasApi = null;
        sceneMediaEl = null;
        if (hostEl) hostEl.innerHTML = '';
      }
    };
  }

  function logPaintSceneMediaDomAudit(parentEl, container) {
    var mediaEl = container && (
      container.querySelector('img.hero-renderer__media, video.hero-renderer__media') ||
      container.querySelector('img.qr-scene-media__img') ||
      container.querySelector('video.qr-scene-media__video')
    );
    function dump(label) {
      console.log('=========================');
      console.log('DOM AUDIT ' + label);
      console.log('=========================');
      console.log('parentElement', parentEl);
      console.log('container', container);
      if (!mediaEl) {
        console.log('mediaEl: null — no img/video en container');
        console.log('container.innerHTML', container ? container.innerHTML : null);
        console.log('=========================');
        return;
      }
      var cs = window.getComputedStyle(mediaEl);
      console.log('img.outerHTML', mediaEl.outerHTML);
      console.log('container.innerHTML', container.innerHTML);
      console.log('img.clientWidth', mediaEl.clientWidth);
      console.log('img.clientHeight', mediaEl.clientHeight);
      console.log('img.offsetWidth', mediaEl.offsetWidth);
      console.log('img.offsetHeight', mediaEl.offsetHeight);
      console.log('getComputedStyle(img).display', cs.display);
      console.log('visibility', cs.visibility);
      console.log('opacity', cs.opacity);
      console.log('z-index', cs.zIndex);
      console.log('position', cs.position);
      var x = window.innerWidth / 2;
      var y = window.innerHeight / 2;
      var topEl = document.elementFromPoint(x, y);
      console.log('elementFromPoint(center)', { x: x, y: y, element: topEl });
      console.log('elementFromPoint.tagName', topEl && topEl.tagName);
      console.log('elementFromPoint.className', topEl && topEl.className);
      console.log('elementFromPoint.id', topEl && topEl.id);
      console.log('elementFromPoint outerHTML (trunc)', topEl
        ? String(topEl.outerHTML || '').slice(0, 400)
        : null);
      console.log('mediaEl === topEl', mediaEl === topEl);
      console.log('mediaEl.contains(topEl)', mediaEl.contains ? mediaEl.contains(topEl) : null);
      console.log('container.contains(topEl)', container.contains ? container.contains(topEl) : null);
      console.log('=========================');
    }
    dump('(sync post-insert)');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        dump('(after layout/paint)');
      });
    });
  }

  function goToScene(sceneId) {
    var bundle = loaded || blankEditorBundle();
    var scene = sceneById(bundle, sceneId);
    if (!scene) return;
    activeSceneId = String(scene.id);

    /*
     * Media scenes always use the stage (Editor parity).
     * Cover-only entry (no mediaUrl/publicUrl/resourceId) stays on ProjectCover.
     */
    var paintAsMedia = sceneIsMediaScene(scene) || !!resolveSceneMedia(scene, bundle);
    if (!paintAsMedia && sceneHasCoverChrome(scene) && coverHostEl) {
      /* Cover→cover: remount ProjectCover so logo/title/CTAs match this scene. */
      if (scene.coverModel && typeof ProjectCover !== 'undefined' && ProjectCover.sanitizeModel) {
        liveModel = ProjectCover.sanitizeModel(scene.coverModel);
      }
      if (heroCanvasApi && heroCanvasApi.destroy) {
        try { heroCanvasApi.destroy(); } catch (eHc) { /* ignore */ }
        heroCanvasApi = null;
      }
      if (stageEl) stageEl.innerHTML = '';
      sceneMediaEl = null;
      enterCoverMode();
      remountCover(bundle);
      return;
    }

    if (!coverHostEl || !stageEl) return;
    if (ixLayerEl && ixLayerEl.parentNode === coverHostEl) {
      coverHostEl.removeChild(ixLayerEl);
      ixLayerEl = null;
    }
    /* V7.2.43 — exclusive SCENE mode: cover out of layout, stage visible. */
    enterSceneMode();
    stageEl.innerHTML = '';
    sceneMediaEl = null;
    var sceneApi = paintScene(stageEl, scene, bundle, {
      interactive: interactionsInteractive(),
      enablePan: !(editorMode && canvasMode),
      disableHint: !!(editorMode && canvasMode),
      paintInteractions: true,
      mode: canvasMode ? 'builder' : (previewMode ? 'preview' : 'publish')
    });
    void sceneApi;
    /* Volver only when a distinct cover chrome exists to return to. */
    var entry = entryScene(bundle);
    var canReturnToCover = !!(entry && sceneHasCoverChrome(entry) &&
      String(entry.id) !== String(scene.id));
    if (canReturnToCover) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'project-cover-btn qr-stage__back';
      back.textContent = 'Volver';
      back.addEventListener('click', leaveStage);
      /* Outside the transformed lienzo — fixed to the viewport window. */
      stageEl.appendChild(back);
    }
    var video = coverHostEl.querySelector('video.project-cover-video');
    if (video && !video.paused) {
      try { video.pause(); } catch (e) {}
    }
    verifySceneModeHitTarget();
  }

  /**
   * V7.2.43 — Exclusive layout modes. Only one host participates in document flow.
   * COVER: cover visible, stage hidden. SCENE: cover hidden, stage visible.
   */
  function enterCoverMode() {
    if (coverHostEl) coverHostEl.hidden = false;
    if (stageEl) {
      stageEl.hidden = true;
      stageEl.classList.remove('qr-stage--scene');
    }
  }

  function enterSceneMode() {
    if (coverHostEl) coverHostEl.hidden = true;
    if (stageEl) {
      stageEl.hidden = false;
      stageEl.classList.add('qr-stage--scene');
    }
  }

  function verifySceneModeHitTarget() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var x = window.innerWidth / 2;
        var y = window.innerHeight / 2;
        var topEl = document.elementFromPoint(x, y);
        var inStage = !!(stageEl && topEl && stageEl.contains(topEl));
        var isCover = !!(topEl && topEl.classList && topEl.classList.contains('qr-cover-host'));
        console.log('[QR V7.2.43] MODE=SCENE verify elementFromPoint(center)', {
          x: x,
          y: y,
          element: topEl,
          tag: topEl && topEl.tagName,
          className: topEl && topEl.className,
          inStage: inStage,
          isCoverHost: isCover,
          coverHidden: coverHostEl ? coverHostEl.hidden : null,
          stageHidden: stageEl ? stageEl.hidden : null
        });
      });
    });
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
    host.removeAttribute('aria-busy');
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
      opts.onExplore = function (ev) {
        if (ev) {
          try { ev.preventDefault(); } catch (ePrev) { /* ignore */ }
          try { ev.stopPropagation(); } catch (eStop) { /* ignore */ }
        }
        var focus = sceneById(bundle || loaded, activeSceneId) || entryScene(bundle || loaded);
        var cm = focus && focus.coverModel ? focus.coverModel : null;
        var exploreAction = cm && cm.exploreAction ? String(cm.exploreAction).toLowerCase() : '';
        if (
          exploreAction === 'open-proposals-page' ||
          exploreAction === 'proposals-page' ||
          exploreAction === 'open-proposals' ||
          exploreAction === 'proposals'
        ) {
          openProposalsPage();
          return;
        }
        if (typeof QuotationProposalsModal !== 'undefined' && QuotationProposalsModal.open) {
          QuotationProposalsModal.open();
          return;
        }
        enterStage();
      };
      opts.onStart = function (ev) {
        if (ev) {
          try { ev.preventDefault(); } catch (ePrev2) { /* ignore */ }
        }
        var focus = sceneById(bundle || loaded, activeSceneId) || entryScene(bundle || loaded);
        var cm = focus && focus.coverModel ? focus.coverModel : null;
        var startAction = cm && cm.startAction ? String(cm.startAction).toLowerCase() : '';
        if (
          startAction === 'open-proposals' ||
          startAction === 'proposals' ||
          startAction === 'open-proposals-page' ||
          startAction === 'proposals-page'
        ) {
          openProposalsPage();
          return;
        }
        if (cm && cm.startTargetSceneId) {
          goToScene(cm.startTargetSceneId);
          return;
        }
        enterStage();
      };
    }

    ProjectCover.mount(coverHostEl, model, opts);
    if (editorMode) postBoxes();

    /* Visitor + Builder Preview: paint interactions for the active cover scene. */
    if (!(editorMode && canvasMode)) {
      var focusScene = sceneById(bundle || loaded, activeSceneId);
      if (!focusScene || !sceneHasCoverChrome(focusScene)) {
        focusScene = entryScene(bundle || loaded);
      }
      if (focusScene) {
        activeSceneId = String(focusScene.id);
        paintInteractionLayer(coverHostEl, focusScene, interactionsInteractive());
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
    if (heroCanvasApi && heroCanvasApi.destroy) {
      try { heroCanvasApi.destroy(); } catch (eHc) { /* ignore */ }
      heroCanvasApi = null;
    }
    stageEl.innerHTML = '';
    sceneMediaEl = null;
    /* V7.2.43 — exclusive COVER mode: stage out of layout, cover visible. */
    enterCoverMode();
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
    host.innerHTML = '';
    host.removeAttribute('aria-busy');
    presentationRootEl = host;
    proposalsHostEl = null;
    presentationView = 'hero';

    var usePresentation = !editorMode;
    if (usePresentation) {
      host.classList.add('qr-presentation');
      host.setAttribute('data-qr-view', 'hero');
      host.classList.remove('is-qr-proposals');
    } else {
      host.classList.remove('qr-presentation', 'is-qr-proposals');
      host.removeAttribute('data-qr-view');
    }

    coverHostEl = document.createElement('div');
    coverHostEl.className = 'qr-cover-host';
    coverHostEl.setAttribute('aria-hidden', 'false');
    host.appendChild(coverHostEl);

    /* Pre-mount proposals so VER PROPUESTAS is an instant in-page transition. */
    if (usePresentation) ensureProposalsSection(host);

    stageEl = document.createElement('section');
    stageEl.className = 'qr-stage';
    stageEl.id = 'qrStage';
    host.appendChild(stageEl);
    /* Default: COVER mode until a media scene takes over. */
    enterCoverMode();
    if (usePresentation) setPresentationView('hero');

    /*
     * V7.2.40 — Editor is SSOT. Preview/Web paint the active media scene immediately.
     * Do not wait on ProjectCover / hero.image_url / coverModel for the first image.
     */
    var startup = pickStartupScene(bundle || loaded);
    if (!startup && !(editorMode && canvasMode)) {
      console.log('[QR V7.2.41] RUNTIME START: pickStartupScene() → null (no goToScene). doc.activeSceneId=',
        (canvasDoc(bundle || loaded) || {}).activeSceneId,
        'scenes=', listScenes(bundle || loaded));
    }
    if (startup && !(editorMode && canvasMode)) {
      logRuntimeStartDump(bundle || loaded, startup, 'paintHero→startup');
      goToScene(startup.id);
      return;
    }

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

    remountCover(bundle);

    /* Non-media: jump to active scene when it is not the cover entry. */
    var doc = canvasDoc(bundle || loaded);
    if (doc && doc.activeSceneId && !(editorMode && canvasMode)) {
      var entry = entryScene(bundle || loaded);
      if (!entry || String(entry.id) !== String(doc.activeSceneId)) {
        var jumpScene = sceneById(bundle || loaded, doc.activeSceneId);
        logRuntimeStartDump(bundle || loaded, jumpScene, 'paintHero→activeSceneId≠entry');
        goToScene(doc.activeSceneId);
      }
    }
  }

  /* V7.2.41 — audit only; no behavior change */
  function logRuntimeStartDump(bundle, scene, via) {
    var doc = canvasDoc(bundle);
    var entry = entryScene(bundle);
    var hero = bundle && bundle.hero;
    console.log('=========================');
    console.log('RUNTIME START');
    console.log('=========================');
    console.log('via:', via || '');
    console.log('activeSceneId', doc && doc.activeSceneId != null ? doc.activeSceneId : activeSceneId);
    console.log('entryScene.id', entry && entry.id != null ? entry.id : null);
    console.log('scene encontrada', scene || null);
    console.log('scene.mediaUrl', scene ? scene.mediaUrl : null);
    console.log('scene.publicUrl', scene ? scene.publicUrl : null);
    console.log('scene.resourceId', scene ? scene.resourceId : null);
    console.log('scene.archivoId', scene ? scene.archivoId : null);
    console.log('scene.storagePath', scene ? scene.storagePath : null);
    console.log('scene.provider', scene ? scene.provider : null);
    console.log('coverModel', scene ? scene.coverModel : null);
    console.log('hero.image_url', hero ? hero.image_url : null);
    console.log('=========================');
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

    /* Keep the host black/empty while the bundle loads — no loader copy. */
    host.innerHTML = '';
    host.setAttribute('aria-busy', 'true');

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
        if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onRuntimeBoot) {
          QuotationPersistAudit.onRuntimeBoot({
            projectId: q.projectId || (loaded.project && loaded.project.id) || null,
            slug: loaded.project && loaded.project.slug || null,
            source: liveEnv && liveEnv.canvas
              ? 'LIVE sessionStorage envelope (overrides DB canvas)'
              : 'DB fetchBundle → proyecto_config.hero_quotation.canvas',
            mode: canvasMode ? 'canvas' : (previewMode ? 'preview' : (editorMode ? 'editor' : 'public')),
            canvas: loaded.hero && loaded.hero.canvas ? loaded.hero.canvas : null
          });
        }
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
    paintScene: paintScene,
    paintInteractionLayer: paintInteractionLayer,
    resolveSceneMedia: resolveSceneMedia,
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
