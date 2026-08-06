/**
 * QuotationWindowManager — floating tool windows (visible / minimized / closed).
 * Architecture layer for canvas utilities; chrome styling stays in quotation-builder.css.
 */
var QuotationWindowManager = (function () {
  var HOST_ID = 'qeCanvasToolsHost';
  var POS_STORAGE_KEY = 'boxies_qe_tool_window_positions_v1';
  var SIZE_STORAGE_KEY = 'boxies_qe_tool_window_sizes_v1';
  var windows = Object.create(null);
  var zBase = 12050;
  var zCounter = zBase;
  var changeListeners = [];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadAllPositions() {
    try {
      var raw = localStorage.getItem(POS_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (eLoad) { /* ignore */ }
    return {};
  }

  function saveAllPositions(map) {
    try { localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(map || {})); } catch (eSave) { /* ignore */ }
  }

  function loadPosition(id) {
    var all = loadAllPositions();
    var pos = all[String(id || '')];
    if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return null;
    return { left: pos.left, top: pos.top };
  }

  function savePosition(id, pos) {
    if (!id || !pos) return;
    var all = loadAllPositions();
    all[String(id)] = { left: Math.round(pos.left), top: Math.round(pos.top) };
    saveAllPositions(all);
  }

  function loadAllSizes() {
    try {
      var raw = localStorage.getItem(SIZE_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (eLoad) { /* ignore */ }
    return {};
  }

  function saveAllSizes(map) {
    try { localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(map || {})); } catch (eSave) { /* ignore */ }
  }

  function loadSize(id) {
    var all = loadAllSizes();
    var size = all[String(id || '')];
    if (!size || typeof size.width !== 'number' || typeof size.height !== 'number') return null;
    return { width: size.width, height: size.height };
  }

  function saveSize(id, size) {
    if (!id || !size) return;
    var all = loadAllSizes();
    all[String(id)] = {
      width: Math.round(size.width),
      height: Math.round(size.height)
    };
    saveAllSizes(all);
  }

  function computeMaxWindowHeight(marginPx, extraPx) {
    var margin = marginPx == null ? 20 : Number(marginPx);
    if (!isFinite(margin) || margin < 0) margin = 20;
    var extra = Number(extraPx) || 0;
    var headerEl = document.getElementById('boxiesHeader');
    var dockEl = document.getElementById('boxiesDock');
    var headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : margin;
    var dockTop = dockEl
      ? dockEl.getBoundingClientRect().top
      : (window.innerHeight || document.documentElement.clientHeight || 720);
    return Math.max(160, Math.floor(dockTop - headerBottom - margin * 2 + extra));
  }

  function normalizeResizeOpts(opts) {
    if (!opts) return null;
    var minW = Number(opts.minW) || 200;
    var maxW = Number(opts.maxW) || 300;
    var defaultW = Number(opts.defaultW) || 280;
    var defaultH = Number(opts.defaultH) || 400;
    var maxHExtra = Number(opts.maxHExtra) || 0;
    var maxH = opts.maxH != null
      ? Number(opts.maxH)
      : computeMaxWindowHeight(opts.maxHMargin, maxHExtra);
    if (!isFinite(maxH)) maxH = computeMaxWindowHeight(opts.maxHMargin, maxHExtra);
    return {
      minW: minW,
      maxW: maxW,
      defaultW: Math.min(maxW, Math.max(minW, defaultW)),
      defaultH: defaultH,
      minH: defaultH,
      maxH: Math.max(defaultH, maxH),
      maxHMargin: opts.maxHMargin == null ? 20 : Number(opts.maxHMargin),
      maxHExtra: maxHExtra,
      clampChrome: opts.clampChrome === true
    };
  }

  function clampSize(width, height, resize) {
    if (!resize) return { width: width, height: height };
    return {
      width: Math.min(resize.maxW, Math.max(resize.minW, Math.round(width))),
      height: Math.min(resize.maxH, Math.max(resize.minH, Math.round(height)))
    };
  }

  function applySize(el, size, resize) {
    if (!el || !size) return;
    var next = clampSize(size.width, size.height, resize);
    el.style.width = next.width + 'px';
    el.style.height = next.height + 'px';
    return next;
  }

  function ensureHost() {
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.className = 'qe-canvas-tools-host qe-window-stack-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function defaultPosition(index) {
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var dockH = 72;
    try {
      var dockVar = getComputedStyle(document.documentElement).getPropertyValue('--boxies-dock-h');
      if (dockVar) dockH = Math.max(72, parseFloat(dockVar) + 12);
    } catch (eDock) { /* ignore */ }
    var w = 280;
    var h = 320;
    var stagger = (Number(index) || 0) * 28;
    return {
      left: Math.max(16, vw - w - 16 - stagger),
      top: Math.max(16, vh - h - dockH - stagger)
    };
  }

  function getChromeVerticalBounds() {
    var headerEl = document.getElementById('boxiesHeader');
    var dockEl = document.getElementById('boxiesDock');
    var top = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    var bottom = dockEl
      ? dockEl.getBoundingClientRect().top
      : (window.innerHeight || document.documentElement.clientHeight || 720);
    if (bottom < top) bottom = top;
    return { top: top, bottom: bottom };
  }

  function winForEl(el) {
    if (!el || !el.getAttribute) return null;
    var dataId = el.getAttribute('data-qe-window-id');
    if (!dataId) return null;
    if (windows[dataId]) return windows[dataId];
    var keys = Object.keys(windows);
    for (var i = 0; i < keys.length; i++) {
      var win = windows[keys[i]];
      if (win && (win.id === dataId || win.toolId === dataId)) return win;
    }
    return null;
  }

  function clampPosition(left, top, el) {
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var rect = el.getBoundingClientRect();
    var w = rect.width || 280;
    var h = rect.height || 200;
    var pad = 8;
    var maxLeft = Math.max(pad, vw - w - pad);
    var win = winForEl(el);
    if (win && win.clampChrome) {
      var chrome = getChromeVerticalBounds();
      var minTop = chrome.top;
      var maxTop = Math.max(minTop, chrome.bottom - h);
      return {
        left: Math.min(Math.max(pad, left), maxLeft),
        top: Math.min(Math.max(minTop, top), maxTop)
      };
    }
    var maxTop = Math.max(pad, vh - h - pad);
    return {
      left: Math.min(Math.max(pad, left), maxLeft),
      top: Math.min(Math.max(pad, top), maxTop)
    };
  }

  function applyPosition(el, pos) {
    if (!el || !pos) return;
    var clamped = clampPosition(pos.left, pos.top, el);
    el.style.left = clamped.left + 'px';
    el.style.top = clamped.top + 'px';
  }

  function shellHtml(title, toolId, resizable) {
    return '' +
      '<div class="qe-canvas-tool-float' + (resizable ? ' is-resizable' : '') + '"' +
        ' data-qe-window-id="' + escapeHtml(toolId) + '">' +
        '<div class="qe-canvas-tool-float__head" data-qe-window-drag>' +
          '<span class="qe-canvas-tool-float__title">' + escapeHtml(title) + '</span>' +
          '<div class="qe-canvas-tool-float__actions">' +
            '<button type="button" class="qe-canvas-tool-float__min"' +
              ' data-qe-window-min aria-label="Minimizar">&minus;</button>' +
            '<button type="button" class="qe-canvas-tool-float__close"' +
              ' data-qe-window-close aria-label="Cerrar">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="qe-canvas-tool-float__body"></div>' +
        (resizable
          ? '<div class="qe-canvas-tool-float__resize qe-canvas-tool-float__resize--nw"' +
              ' data-qe-window-resize="nw" aria-hidden="true"></div>' +
            '<div class="qe-canvas-tool-float__resize qe-canvas-tool-float__resize--ne"' +
              ' data-qe-window-resize="ne" aria-hidden="true"></div>' +
            '<div class="qe-canvas-tool-float__resize qe-canvas-tool-float__resize--sw"' +
              ' data-qe-window-resize="sw" aria-hidden="true"></div>' +
            '<div class="qe-canvas-tool-float__resize qe-canvas-tool-float__resize--se"' +
              ' data-qe-window-resize="se" aria-hidden="true"></div>'
          : '') +
      '</div>';
  }

  function bringToFront(id) {
    var win = windows[id];
    if (!win || !win.el) return;
    zCounter += 1;
    win.el.style.zIndex = String(zCounter);
  }

  function notifyChange() {
    changeListeners.forEach(function (fn) {
      try { fn(getMenuItems()); } catch (eFn) { /* ignore */ }
    });
    if (typeof BoxiesShell !== 'undefined' && typeof BoxiesShell.syncToolsMenu === 'function') {
      try { BoxiesShell.syncToolsMenu(getMenuItems()); } catch (eShell) { /* ignore */ }
    }
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (eMotion) {
      return false;
    }
  }

  function getToolsIconRect() {
    var btn = document.getElementById('builderToolsMenuBtn');
    if (!btn || btn.offsetParent === null) return null;
    return btn.getBoundingClientRect();
  }

  function pulseToolsIcon() {
    if (typeof BoxiesShell !== 'undefined' && typeof BoxiesShell.pulseToolsIcon === 'function') {
      try { BoxiesShell.pulseToolsIcon(); } catch (ePulse) { /* ignore */ }
    }
  }

  function playMinimizeAbsorb(win, done) {
    var el = win && win.el;
    var finish = typeof done === 'function' ? done : function () {};
    if (!el || prefersReducedMotion()) {
      finish();
      return;
    }
    var from = el.getBoundingClientRect();
    var target = getToolsIconRect();
    if (!target || from.width < 8 || from.height < 8) {
      finish();
      return;
    }

    var fromCx = from.left + from.width * 0.5;
    var fromCy = from.top + from.height * 0.5;
    var targetCx = target.left + target.width * 0.5;
    var targetCy = target.top + target.height * 0.5;
    var tx = targetCx - fromCx;
    var ty = targetCy - fromCy;
    var scale = Math.max(0.05, Math.min(
      (target.width * 0.85) / from.width,
      (target.height * 0.85) / from.height
    ));

    el.classList.add('is-minimizing');
    el.style.transformOrigin = 'center center';
    el.style.willChange = 'transform, opacity';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transform =
          'translate3d(' + tx + 'px, ' + ty + 'px, 0) scale(' + scale + ')';
        el.style.opacity = '0';
      });
    });

    var finished = false;
    function cleanup() {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      el.classList.remove('is-minimizing');
      el.style.transform = '';
      el.style.opacity = '';
      el.style.willChange = '';
      pulseToolsIcon();
      finish();
    }

    function onEnd(e) {
      if (e.target !== el) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
      cleanup();
    }

    el.addEventListener('transitionend', onEnd);
    window.setTimeout(cleanup, 280);
  }

  function finalizeMinimize(win) {
    if (!win) return;
    win.minimizing = false;
    win.state = 'minimized';
    setVisible(win, false);
    notifyChange();
  }

  function bindDrag(win) {
    var head = win.el.querySelector('[data-qe-window-drag]');
    if (!head || head.dataset.qeDragBound) return;
    head.dataset.qeDragBound = '1';
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var origLeft = 0;
    var origTop = 0;

    head.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('button')) return;
      dragging = true;
      bringToFront(win.id);
      var rect = win.el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      head.setPointerCapture(e.pointerId);
      head.classList.add('is-dragging');
      e.preventDefault();
    });

    head.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      applyPosition(win.el, { left: origLeft + dx, top: origTop + dy });
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      head.classList.remove('is-dragging');
      try { head.releasePointerCapture(e.pointerId); } catch (eCap) { /* ignore */ }
      var rect = win.el.getBoundingClientRect();
      savePosition(win.id, { left: rect.left, top: rect.top });
    }

    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);
  }

  function bindResize(win) {
    if (!win || !win.el || !win.resize) return;
    var handles = win.el.querySelectorAll('[data-qe-window-resize]');
    if (!handles.length) return;

    function refreshMaxH() {
      win.resize.maxH = computeMaxWindowHeight(win.resize.maxHMargin, win.resize.maxHExtra);
      if (win.resize.maxH < win.resize.minH) win.resize.maxH = win.resize.minH;
    }

    function applyCornerResize(corner, start, dx, dy) {
      var newW = start.w;
      var newH = start.h;
      var newLeft = start.left;
      var newTop = start.top;
      if (corner.indexOf('e') >= 0) newW = start.w + dx;
      if (corner.indexOf('w') >= 0) {
        newW = start.w - dx;
        newLeft = start.left + dx;
      }
      if (corner.indexOf('s') >= 0) newH = start.h + dy;
      if (corner.indexOf('n') >= 0) {
        newH = start.h - dy;
        newTop = start.top + dy;
      }
      var sized = applySize(win.el, { width: newW, height: newH }, win.resize);
      if (corner.indexOf('w') >= 0) {
        newLeft = start.left + start.w - sized.width;
      }
      if (corner.indexOf('n') >= 0) {
        newTop = start.top + start.h - sized.height;
      }
      win.el.style.left = newLeft + 'px';
      win.el.style.top = newTop + 'px';
      var clamped = clampPosition(newLeft, newTop, win.el);
      win.el.style.left = clamped.left + 'px';
      win.el.style.top = clamped.top + 'px';
    }

    handles.forEach(function (handle) {
      if (handle.dataset.qeResizeBound === '1') return;
      handle.dataset.qeResizeBound = '1';
      var corner = String(handle.getAttribute('data-qe-window-resize') || 'se').toLowerCase();
      var resizing = false;
      var start = null;

      handle.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        bringToFront(win.id);
        refreshMaxH();
        resizing = true;
        var rect = win.el.getBoundingClientRect();
        start = {
          x: e.clientX,
          y: e.clientY,
          left: rect.left,
          top: rect.top,
          w: rect.width,
          h: rect.height
        };
        handle.setPointerCapture(e.pointerId);
        win.el.classList.add('is-resizing');
      });

      handle.addEventListener('pointermove', function (e) {
        if (!resizing || !start) return;
        applyCornerResize(
          corner,
          start,
          e.clientX - start.x,
          e.clientY - start.y
        );
      });

      function endResize(e) {
        if (!resizing) return;
        resizing = false;
        start = null;
        win.el.classList.remove('is-resizing');
        try { handle.releasePointerCapture(e.pointerId); } catch (eCap) { /* ignore */ }
        var rect = win.el.getBoundingClientRect();
        saveSize(win.id, { width: rect.width, height: rect.height });
        savePosition(win.id, { left: rect.left, top: rect.top });
      }

      handle.addEventListener('pointerup', endResize);
      handle.addEventListener('pointercancel', endResize);
    });
  }

  function bindWindowResizeReclamp() {
    if (window.__qeToolWindowResizeBound) return;
    window.__qeToolWindowResizeBound = true;
    window.addEventListener('resize', function () {
      Object.keys(windows).forEach(function (id) {
        var w = windows[id];
        if (!w || w.state !== 'visible') return;
        if (w.resize) {
          w.resize.maxH = computeMaxWindowHeight(w.resize.maxHMargin, w.resize.maxHExtra);
          var rect = w.el.getBoundingClientRect();
          applySize(w.el, { width: rect.width, height: rect.height }, w.resize);
        }
        if (w.clampChrome) {
          var next = w.el.getBoundingClientRect();
          applyPosition(w.el, { left: next.left, top: next.top });
        }
      });
    });
  }

  function bindChrome(win) {
    if (!win || !win.el || win.el.dataset.qeChromeBound) return;
    win.el.dataset.qeChromeBound = '1';
    bindDrag(win);
    bindResize(win);
    var minBtn = win.el.querySelector('[data-qe-window-min]');
    if (minBtn) {
      minBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        minimize(win.id);
      });
    }
    var closeBtn = win.el.querySelector('[data-qe-window-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        close(win.id);
      });
    }
  }

  function setVisible(win, on) {
    if (!win || !win.el) return;
    win.el.classList.toggle('is-minimized', !on);
    win.el.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) bringToFront(win.id);
  }

  function createWindow(opts) {
    var host = ensureHost();
    var resize = normalizeResizeOpts(opts.resize);
    var clampChrome = opts.clampChrome !== false;
    if (resize && resize.clampChrome) clampChrome = true;
    var wrap = document.createElement('div');
    wrap.innerHTML = shellHtml(opts.title, opts.toolId || opts.id, !!resize);
    var el = wrap.firstElementChild;
    host.appendChild(el);
    var pos = loadPosition(opts.id) || defaultPosition(Object.keys(windows).length);
    applyPosition(el, pos);
    if (resize) {
      var savedSize = loadSize(opts.id);
      applySize(el, savedSize || {
        width: resize.defaultW,
        height: resize.defaultH
      }, resize);
    } else if (opts.fixedWidth) {
      var fw = Math.max(160, Math.round(Number(opts.fixedWidth) || 205));
      el.style.width = fw + 'px';
      el.style.minWidth = fw + 'px';
      el.style.maxWidth = fw + 'px';
      if (opts.fixedHeight) {
        var fh = Math.max(160, Math.round(Number(opts.fixedHeight) || 400));
        el.classList.add('is-fixed-height');
        el.style.height = fh + 'px';
        el.style.minHeight = fh + 'px';
        el.style.maxHeight = fh + 'px';
      }
    }
    if (clampChrome) {
      var placed = el.getBoundingClientRect();
      applyPosition(el, { left: placed.left, top: placed.top });
    }
    var win = {
      id: opts.id,
      title: opts.title,
      toolId: opts.toolId || opts.id,
      state: 'visible',
      el: el,
      bodyEl: el.querySelector('.qe-canvas-tool-float__body'),
      mounted: false,
      resize: resize,
      clampChrome: clampChrome,
      onClose: typeof opts.onClose === 'function' ? opts.onClose : null
    };
    windows[opts.id] = win;
    bindChrome(win);
    bindWindowResizeReclamp();
    if (!win.mounted && typeof opts.mount === 'function') {
      opts.mount(win.bodyEl, win);
      win.mounted = true;
    }
    setVisible(win, true);
    notifyChange();
    return win;
  }

  function open(opts) {
    if (!opts || !opts.id) return null;
    var id = String(opts.id);
    var win = windows[id];
    if (win && win.state === 'minimized') {
      win.state = 'visible';
      setVisible(win, true);
      notifyChange();
      return win;
    }
    if (win && win.state === 'visible') {
      bringToFront(id);
      notifyChange();
      return win;
    }
    return createWindow(opts);
  }

  function minimize(id) {
    id = String(id || '');
    var win = windows[id];
    if (!win || win.state !== 'visible' || win.minimizing) return;
    win.minimizing = true;
    playMinimizeAbsorb(win, function () {
      finalizeMinimize(win);
    });
  }

  function restore(id) {
    id = String(id || '');
    var win = windows[id];
    if (!win || win.state !== 'minimized') return;
    win.state = 'visible';
    setVisible(win, true);
    notifyChange();
  }

  function close(id) {
    id = String(id || '');
    var win = windows[id];
    if (!win) return;
    if (win.onClose) {
      try { win.onClose(win); } catch (eClose) { /* ignore */ }
    }
    win.state = 'closed';
    if (win.el && win.el.parentNode) win.el.parentNode.removeChild(win.el);
    delete windows[id];
    notifyChange();
  }

  function closeAll() {
    Object.keys(windows).slice().forEach(function (id) { close(id); });
  }

  function getMenuItems() {
    return Object.keys(windows).map(function (id) {
      var w = windows[id];
      return {
        id: id,
        title: w.title,
        toolId: w.toolId,
        state: w.state
      };
    }).filter(function (item) {
      return item.state === 'visible' || item.state === 'minimized';
    });
  }

  function listActive() {
    return getMenuItems();
  }

  function getWindow(id) {
    return windows[String(id || '')] || null;
  }

  function focus(id) {
    id = String(id || '');
    var win = windows[id];
    if (!win) return;
    if (win.state === 'minimized') restore(id);
    else if (win.state === 'visible') bringToFront(id);
  }

  function onChange(fn) {
    if (typeof fn === 'function') changeListeners.push(fn);
  }

  return {
    open: open,
    minimize: minimize,
    restore: restore,
    focus: focus,
    close: close,
    closeAll: closeAll,
    getMenuItems: getMenuItems,
    listActive: listActive,
    getWindow: getWindow,
    onChange: onChange
  };
})();
