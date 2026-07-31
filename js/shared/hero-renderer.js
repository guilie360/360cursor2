/**
 * HeroRenderer — V7.2.59 BOXIES official Hero paint (Model B).
 *
 * Single source of truth for Builder, Preview, and Runtime media fill.
 * Always object-fit: cover. Never fill / stretch / non-uniform scale.
 * Does not own interactions, gizmos, or ProjectDocument serialization.
 */
var HeroRenderer = (function () {
  var VIEWPORTS = {
    desktop: { id: 'desktop', label: 'Desktop', width: 1280, height: 720 },
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
    if (typeof media === 'string') {
      return { src: media, kind: 'image' };
    }
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

  /**
   * Paint cover media into host. Replaces media children; preserves sibling overlays
   * only if they live outside host (callers should paint media into a dedicated slot).
   */
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
          ' autoplay muted loop playsinline' +
          (opts.preload === false ? ' preload="none"' : '') +
          '></video>';
      var video = host.querySelector('video.hero-renderer__media');
      if (video) {
        try { video.play(); } catch (ePlay) { /* ignore */ }
      }
    } else {
      host.innerHTML =
        '<img class="hero-renderer__media' + extra + '"' +
          ' src="' + escapeHtml(rec.src) + '" alt="">';
    }
    return host;
  }

  function mount(host, media, opts) {
    return paint(host, media, opts);
  }

  function getViewport(id) {
    var key = String(id || 'desktop').toLowerCase();
    return VIEWPORTS[key] || VIEWPORTS.desktop;
  }

  function listViewports() {
    return VIEWPORT_ORDER.map(function (id) {
      return VIEWPORTS[id];
    });
  }

  /**
   * Visible portion of an image (iw×ih) when covered into viewport (vw×vh),
   * in normalized image space 0..1.
   */
  function coverCropInImageSpace(iw, ih, vw, vh) {
    iw = Math.max(1, Number(iw) || 1);
    ih = Math.max(1, Number(ih) || 1);
    vw = Math.max(1, Number(vw) || 1);
    vh = Math.max(1, Number(vh) || 1);
    var scale = Math.max(vw / iw, vh / ih);
    var dispW = iw * scale;
    var dispH = ih * scale;
    var ox = (dispW - vw) / 2;
    var oy = (dispH - vh) / 2;
    return {
      x: ox / dispW,
      y: oy / dispH,
      w: vw / dispW,
      h: vh / dispH
    };
  }

  function intersectRects(a, b) {
    if (!a || !b) return null;
    var x1 = Math.max(a.x, b.x);
    var y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w);
    var y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  /** Intersection of cover crops across all official viewports (image 0..1). */
  function safeAreaInImageSpace(iw, ih) {
    iw = Math.max(1, Number(iw) || 16);
    ih = Math.max(1, Number(ih) || 9);
    var acc = null;
    VIEWPORT_ORDER.forEach(function (id) {
      var vp = VIEWPORTS[id];
      var crop = coverCropInImageSpace(iw, ih, vp.width, vp.height);
      acc = acc ? intersectRects(acc, crop) : crop;
    });
    return acc;
  }

  /**
   * Map an image-space rect (0..1) into the current cover viewport as CSS % box.
   */
  function imageRectToViewportPercent(imgRect, iw, ih, vw, vh) {
    if (!imgRect) return null;
    iw = Math.max(1, Number(iw) || 1);
    ih = Math.max(1, Number(ih) || 1);
    vw = Math.max(1, Number(vw) || 1);
    vh = Math.max(1, Number(vh) || 1);
    var scale = Math.max(vw / iw, vh / ih);
    var dispW = iw * scale;
    var dispH = ih * scale;
    var ox = (dispW - vw) / 2;
    var oy = (dispH - vh) / 2;
    var left = imgRect.x * iw * scale - ox;
    var top = imgRect.y * ih * scale - oy;
    var right = (imgRect.x + imgRect.w) * iw * scale - ox;
    var bottom = (imgRect.y + imgRect.h) * ih * scale - oy;
    return {
      left: (left / vw) * 100,
      top: (top / vh) * 100,
      width: ((right - left) / vw) * 100,
      height: ((bottom - top) / vh) * 100
    };
  }

  function safeAreaViewportPercent(iw, ih, vw, vh) {
    return imageRectToViewportPercent(safeAreaInImageSpace(iw, ih), iw, ih, vw, vh);
  }

  /**
   * Draw / remove Safe Area guide inside a host (Builder only).
   * box = { left, top, width, height } in % of host.
   */
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
    VIEWPORTS: VIEWPORTS,
    VIEWPORT_ORDER: VIEWPORT_ORDER,
    getViewport: getViewport,
    listViewports: listViewports,
    mount: mount,
    paint: paint,
    clear: clear,
    coverCropInImageSpace: coverCropInImageSpace,
    safeAreaInImageSpace: safeAreaInImageSpace,
    imageRectToViewportPercent: imageRectToViewportPercent,
    safeAreaViewportPercent: safeAreaViewportPercent,
    setSafeAreaGuide: setSafeAreaGuide,
    readNaturalSize: readNaturalSize,
    mediaElement: mediaElement
  };
})();
