/**
 * HeroRenderer + HeroCanvas — V7.2.62 BOXIES Hero as interactive map.
 *
 * Design canvas ALWAYS 1920×1080 at zoom=1. Never contain/shrink.
 * Viewport is a window; left-button / one-finger pan only. No pinch zoom.
 * % overlays stay on the lienzo (no coord migration).
 */
var HeroRenderer = (function () {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var VIEWPORTS = {
    desktop: { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 },
    tablet: { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
    mobile: { id: 'mobile', label: 'Mobile', width: 390, height: 844 }
  };
  var VIEWPORT_ORDER = ['desktop', 'tablet', 'mobile'];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normalizeMedia(media) {
    if (!media) return null;
    if (typeof media === 'string') return { src: media, kind: 'image' };
    var src = media.src || media.url || null;
    if (!src) return null;
    var kind = media.kind || media.type || 'image';
    if (kind !== 'video') kind = 'image';
    return { src: String(src), kind: kind };
  }

  function ensureHost(host) {
    if (!host) return null;
    host.classList.add('hero-renderer');
    if (!host.getAttribute('data-hero-renderer')) {
      host.setAttribute('data-hero-renderer', '1');
    }
    return host;
  }

  function clear(host) {
    if (!ensureHost(host)) return null;
    host.innerHTML = '<div class="hero-renderer__void" aria-hidden="true"></div>';
    return host;
  }

  function paint(host, media, opts) {
    opts = opts || {};
    if (!ensureHost(host)) return null;
    var rec = normalizeMedia(media);
    if (!rec) {
      clear(host);
      return host;
    }
    var extra = opts.mediaClass ? (' ' + String(opts.mediaClass)) : '';
    if (rec.kind === 'video') {
      host.innerHTML =
        '<video class="hero-renderer__media' + extra + '"' +
          ' src="' + escapeHtml(rec.src) + '"' +
          ' autoplay muted loop playsinline draggable="false"' +
          (opts.preload === false ? ' preload="none"' : '') +
          '></video>';
      var video = host.querySelector('video.hero-renderer__media');
      if (video) {
        try { video.play(); } catch (ePlay) { /* ignore */ }
      }
    } else {
      host.innerHTML =
        '<img class="hero-renderer__media' + extra + '"' +
          ' src="' + escapeHtml(rec.src) + '" alt="" draggable="false">';
    }
    return host;
  }

  function getViewport(id) {
    var key = String(id || 'desktop').toLowerCase();
    return VIEWPORTS[key] || VIEWPORTS.desktop;
  }

  function listViewports() {
    return VIEWPORT_ORDER.map(function (id) { return VIEWPORTS[id]; });
  }

  function setSafeAreaGuide(host, box, opts) {
    opts = opts || {};
    if (!host) return;
    var existing = host.querySelector('[data-hero-safe-area]');
    if (existing) existing.parentNode.removeChild(existing);
    if (!box || opts.visible === false) return;
    var el = document.createElement('div');
    el.className = 'hero-renderer__safe';
    el.setAttribute('data-hero-safe-area', '1');
    el.setAttribute('aria-hidden', 'true');
    el.style.left = Number(box.left).toFixed(3) + '%';
    el.style.top = Number(box.top).toFixed(3) + '%';
    el.style.width = Number(box.width).toFixed(3) + '%';
    el.style.height = Number(box.height).toFixed(3) + '%';
    var label = document.createElement('p');
    label.className = 'hero-renderer__safe-label';
    label.textContent = opts.label || 'Área garantizada';
    el.appendChild(label);
    host.appendChild(el);
  }

  /** Visible window of the design canvas as % of the 1920×1080 lienzo. */
  function windowSafeAreaPercent(hostW, hostH, panX, panY, zoom) {
    var z = Math.max(0.0001, Number(zoom) || 1);
    var vw = Math.max(1, Number(hostW) || 1) / z;
    var vh = Math.max(1, Number(hostH) || 1) / z;
    var left = (-Number(panX) || 0) / DESIGN_W * 100;
    var top = (-Number(panY) || 0) / DESIGN_H * 100;
    return {
      left: left,
      top: top,
      width: (vw / DESIGN_W) * 100,
      height: (vh / DESIGN_H) * 100
    };
  }

  function readNaturalSize(mediaEl, fallbackW, fallbackH) {
    var fw = Math.max(1, Number(fallbackW) || 16);
    var fh = Math.max(1, Number(fallbackH) || 9);
    if (!mediaEl) return { width: fw, height: fh };
    if (mediaEl.tagName === 'VIDEO') {
      var vw = mediaEl.videoWidth || 0;
      var vh = mediaEl.videoHeight || 0;
      if (vw > 0 && vh > 0) return { width: vw, height: vh };
      return { width: fw, height: fh };
    }
    var nw = mediaEl.naturalWidth || 0;
    var nh = mediaEl.naturalHeight || 0;
    if (nw > 0 && nh > 0) return { width: nw, height: nh };
    return { width: fw, height: fh };
  }

  function mediaElement(host) {
    if (!host) return null;
    return host.querySelector('img.hero-renderer__media, video.hero-renderer__media') ||
      host.querySelector('img, video');
  }

  return {
    DESIGN_W: DESIGN_W,
    DESIGN_H: DESIGN_H,
    VIEWPORTS: VIEWPORTS,
    VIEWPORT_ORDER: VIEWPORT_ORDER,
    getViewport: getViewport,
    listViewports: listViewports,
    mount: paint,
    paint: paint,
    clear: clear,
    setSafeAreaGuide: setSafeAreaGuide,
    windowSafeAreaPercent: windowSafeAreaPercent,
    readNaturalSize: readNaturalSize,
    mediaElement: mediaElement
  };
})();

/**
 * HeroCanvas — fixed 1920×1080 lienzo + viewport camera (pan only, zoom locked at 1).
 */
var HeroCanvas = (function () {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var HINT_KEY = 'boxies_hero_pan_hint_v1';
  var instances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function getState(host) {
    if (!host) return null;
    if (instances) return instances.get(host) || null;
    return host._heroCanvasState || null;
  }

  function setState(host, state) {
    if (!host) return;
    if (instances) instances.set(host, state);
    else host._heroCanvasState = state;
  }

  function clampPan(state) {
    var hostW = state.host.clientWidth || 1;
    var hostH = state.host.clientHeight || 1;
    var z = state.zoom;
    var maxPanX = 0;
    var maxPanY = 0;
    var minPanX = hostW - DESIGN_W * z;
    var minPanY = hostH - DESIGN_H * z;
    if (minPanX > maxPanX) {
      state.panX = (hostW - DESIGN_W * z) / 2;
    } else {
      state.panX = Math.min(maxPanX, Math.max(minPanX, state.panX));
    }
    if (minPanY > maxPanY) {
      state.panY = (hostH - DESIGN_H * z) / 2;
    } else {
      state.panY = Math.min(maxPanY, Math.max(minPanY, state.panY));
    }
  }

  function applyTransform(state) {
    if (!state || !state.canvas) return;
    clampPan(state);
    state.canvas.style.transform =
      'translate(' + state.panX + 'px,' + state.panY + 'px) scale(' + state.zoom + ')';
  }

  /**
   * V7.2.61 — Fixed zoom (maps philosophy).
   * Never shrink the lienzo to fit the host (no contain).
   * zoom stays 1: 1 design px = 1 CSS px. Viewport is a window; user pans.
   */
  function centerAtFixedZoom(state) {
    var hostW = state.host.clientWidth || 1;
    var hostH = state.host.clientHeight || 1;
    state.zoom = 1;
    state.panX = (hostW - DESIGN_W) / 2;
    state.panY = (hostH - DESIGN_H) / 2;
    applyTransform(state);
  }

  /* Deprecated alias — keep callers compiling; behaves as fixed-zoom center. */
  function fitContain(state) {
    centerAtFixedZoom(state);
  }

  function needsPan(state) {
    var hostW = state.host.clientWidth || 1;
    var hostH = state.host.clientHeight || 1;
    return DESIGN_W * state.zoom > hostW + 0.5 || DESIGN_H * state.zoom > hostH + 0.5;
  }

  function isTouchOrNarrowHost(state) {
    var hostW = (state.host && state.host.clientWidth) || 0;
    var hostH = (state.host && state.host.clientHeight) || 0;
    var coarse = false;
    try {
      coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (eM) { /* ignore */ }
    return coarse || hostW <= 900 || (hostH > hostW && hostW <= 1024);
  }

  function dismissHint(state) {
    var hint = state.host && state.host.querySelector('[data-hero-canvas-hint]');
    if (hint) hint.classList.remove('is-visible');
    try { sessionStorage.setItem(HINT_KEY, '1'); } catch (eSs) { /* ignore */ }
  }

  function showHintOnce(state) {
    if (state.opts.disableHint) return;
    if (!needsPan(state)) return;
    /* Spec: first open on Tablet/Mobile only. */
    if (!isTouchOrNarrowHost(state)) return;
    try {
      if (sessionStorage.getItem(HINT_KEY) === '1') return;
    } catch (eSs) { /* ignore */ }
    var hint = state.host.querySelector('[data-hero-canvas-hint]');
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'hero-canvas__hint';
      hint.setAttribute('data-hero-canvas-hint', '1');
      hint.textContent = '← Arrastra para explorar →';
      state.host.appendChild(hint);
    }
    requestAnimationFrame(function () {
      hint.classList.add('is-visible');
    });
    state._hintTimer = setTimeout(function () {
      dismissHint(state);
    }, 2500);
  }

  function bindPan(state) {
    var host = state.host;
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var pointerId = null;
    var moved = false;

    function isInteractiveTarget(t) {
      if (!t || !t.closest) return false;
      return !!t.closest(
        'button, a, input, textarea, select,' +
        ' [data-qr-ix-layer] .qr-ix-btn, .qr-ix-hs, .qr-stage__back,' +
        ' .builder-exp-stage-btn, .builder-exp-hs, [data-exp-handle],' +
        ' [data-exp-hs-poly], [data-exp-hs-vertex], [data-exp-stage-btn],' +
        ' .builder-exp-buttons-layer button, .builder-exp-hotspots-layer path'
      );
    }

    function onDown(ev) {
      /* Left button or primary touch only. */
      if (ev.pointerType === 'mouse' && ev.button != null && ev.button !== 0) return;
      if (isInteractiveTarget(ev.target)) return;
      dragging = true;
      moved = false;
      pointerId = ev.pointerId;
      lastX = ev.clientX;
      lastY = ev.clientY;
      host.classList.add('is-panning');
      try { host.setPointerCapture(ev.pointerId); } catch (eCap) { /* ignore */ }
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!dragging) return;
      if (pointerId != null && ev.pointerId !== pointerId) return;
      /* Compensate CSS scale on ancestors (Builder device-frame fit). */
      var rect = host.getBoundingClientRect();
      var sx = host.clientWidth > 0 ? rect.width / host.clientWidth : 1;
      var sy = host.clientHeight > 0 ? rect.height / host.clientHeight : 1;
      if (!isFinite(sx) || sx < 0.0001) sx = 1;
      if (!isFinite(sy) || sy < 0.0001) sy = 1;
      var dx = (ev.clientX - lastX) / sx;
      var dy = (ev.clientY - lastY) / sy;
      if (dx || dy) moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      state.panX += dx;
      state.panY += dy;
      applyTransform(state);
      ev.preventDefault();
    }

    function onUp(ev) {
      if (!dragging) return;
      if (pointerId != null && ev.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      host.classList.remove('is-panning');
      try { host.releasePointerCapture(ev.pointerId); } catch (eRel) { /* ignore */ }
      if (moved) {
        if (state._hintTimer) clearTimeout(state._hintTimer);
        dismissHint(state);
      }
    }

    function onDragStart(ev) {
      ev.preventDefault();
    }

    function onGesture(ev) {
      /* Block Safari pinch-zoom on the hero host. */
      ev.preventDefault();
    }

    function onWheel(ev) {
      /* Pan only — never zoom via wheel/pinch-emulation. */
      ev.preventDefault();
    }

    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('dragstart', onDragStart, true);
    host.addEventListener('gesturestart', onGesture, { passive: false });
    host.addEventListener('gesturechange', onGesture, { passive: false });
    host.addEventListener('wheel', onWheel, { passive: false });
    state._unbindPan = function () {
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('dragstart', onDragStart, true);
      host.removeEventListener('gesturestart', onGesture);
      host.removeEventListener('gesturechange', onGesture);
      host.removeEventListener('wheel', onWheel);
    };
  }

  function ensureStructure(host) {
    host.classList.add('hero-canvas-host');
    host.setAttribute('data-hero-canvas-host', '1');
    var canvas = host.querySelector('[data-hero-canvas]');
    if (!canvas) {
      host.innerHTML = '';
      canvas = document.createElement('div');
      canvas.className = 'hero-canvas';
      canvas.setAttribute('data-hero-canvas', '1');
      canvas.style.width = DESIGN_W + 'px';
      canvas.style.height = DESIGN_H + 'px';
      var media = document.createElement('div');
      media.className = 'hero-canvas__media hero-renderer';
      media.setAttribute('data-hero-canvas-media', '1');
      media.setAttribute('data-hero-renderer', '1');
      canvas.appendChild(media);
      host.appendChild(canvas);
    }
    var mediaSlot = canvas.querySelector('[data-hero-canvas-media]');
    return { canvas: canvas, mediaSlot: mediaSlot };
  }

  /**
   * Mount HeroCanvas into host (viewport window).
   * opts: { media, disableHint, enablePan, panOnlyWhenNeeded }
   */
  function mount(host, opts) {
    opts = opts || {};
    if (!host) return null;
    var prev = getState(host);
    if (prev && prev._unbindPan) {
      try { prev._unbindPan(); } catch (eU) { /* ignore */ }
    }
    if (prev && prev._ro) {
      try { prev._ro.disconnect(); } catch (eRo) { /* ignore */ }
    }

    var parts = ensureStructure(host);
    var state = {
      host: host,
      canvas: parts.canvas,
      mediaSlot: parts.mediaSlot,
      panX: 0,
      panY: 0,
      zoom: 1,
      opts: opts
    };
    setState(host, state);

    if (opts.media && typeof HeroRenderer !== 'undefined') {
      HeroRenderer.paint(parts.mediaSlot, opts.media, opts.paintOpts || {});
    }

    if (opts.enablePan !== false) bindPan(state);

    centerAtFixedZoom(state);
    showHintOnce(state);

    if (typeof ResizeObserver !== 'undefined') {
      state._ro = new ResizeObserver(function () {
        /* Keep zoom=1; only re-center if we haven't panned yet, else clamp. */
        var z = state.zoom;
        state.zoom = 1;
        if (Math.abs(z - 1) > 0.001) {
          centerAtFixedZoom(state);
        } else {
          applyTransform(state);
        }
      });
      state._ro.observe(host);
    } else {
      state._onResize = function () { applyTransform(state); };
      window.addEventListener('resize', state._onResize);
    }

    return api(state);
  }

  function api(state) {
    return {
      host: state.host,
      canvas: state.canvas,
      mediaSlot: state.mediaSlot,
      DESIGN_W: DESIGN_W,
      DESIGN_H: DESIGN_H,
      paintMedia: function (media, paintOpts) {
        if (typeof HeroRenderer !== 'undefined') {
          HeroRenderer.paint(state.mediaSlot, media, paintOpts || {});
        }
        return state.mediaSlot;
      },
      clearMedia: function () {
        if (typeof HeroRenderer !== 'undefined') HeroRenderer.clear(state.mediaSlot);
        return state.mediaSlot;
      },
      setCamera: function (cam) {
        cam = cam || {};
        /* Zoom locked at 1 for maps philosophy — ignore external zoom changes. */
        state.zoom = 1;
        if (cam.panX != null) state.panX = Number(cam.panX);
        if (cam.panY != null) state.panY = Number(cam.panY);
        applyTransform(state);
      },
      fitContain: function () { centerAtFixedZoom(state); },
      center: function () { centerAtFixedZoom(state); },
      getCamera: function () {
        return { panX: state.panX, panY: state.panY, zoom: state.zoom };
      },
      needsPan: function () { return needsPan(state); },
      windowSafeAreaPercent: function () {
        return HeroRenderer.windowSafeAreaPercent(
          state.host.clientWidth,
          state.host.clientHeight,
          state.panX,
          state.panY,
          state.zoom
        );
      },
      destroy: function () {
        if (state._hintTimer) clearTimeout(state._hintTimer);
        if (state._unbindPan) state._unbindPan();
        if (state._ro) state._ro.disconnect();
        if (state._onResize) window.removeEventListener('resize', state._onResize);
        setState(state.host, null);
      }
    };
  }

  function fromHost(host) {
    var state = getState(host);
    return state ? api(state) : null;
  }

  return {
    DESIGN_W: DESIGN_W,
    DESIGN_H: DESIGN_H,
    mount: mount,
    fromHost: fromHost
  };
})();
