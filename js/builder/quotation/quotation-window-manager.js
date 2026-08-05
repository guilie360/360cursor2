/**
 * QuotationWindowManager — floating tool windows (visible / minimized / closed).
 * Architecture layer for canvas utilities; chrome styling stays in quotation-builder.css.
 */
var QuotationWindowManager = (function () {
  var HOST_ID = 'qeCanvasToolsHost';
  var POS_STORAGE_KEY = 'boxies_qe_tool_window_positions_v1';
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

  function clampPosition(left, top, el) {
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var rect = el.getBoundingClientRect();
    var w = rect.width || 280;
    var h = rect.height || 200;
    var pad = 8;
    var maxLeft = Math.max(pad, vw - w - pad);
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

  function shellHtml(title, toolId) {
    return '' +
      '<div class="qe-canvas-tool-float" data-qe-window-id="' + escapeHtml(toolId) + '">' +
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

  function bindChrome(win) {
    if (!win || !win.el || win.el.dataset.qeChromeBound) return;
    win.el.dataset.qeChromeBound = '1';
    bindDrag(win);
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
    var wrap = document.createElement('div');
    wrap.innerHTML = shellHtml(opts.title, opts.toolId || opts.id);
    var el = wrap.firstElementChild;
    host.appendChild(el);
    var pos = loadPosition(opts.id) || defaultPosition(Object.keys(windows).length);
    applyPosition(el, pos);
    var win = {
      id: opts.id,
      title: opts.title,
      toolId: opts.toolId || opts.id,
      state: 'visible',
      el: el,
      bodyEl: el.querySelector('.qe-canvas-tool-float__body'),
      mounted: false,
      onClose: typeof opts.onClose === 'function' ? opts.onClose : null
    };
    windows[opts.id] = win;
    bindChrome(win);
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
    if (!win || win.state !== 'visible') return;
    win.state = 'minimized';
    setVisible(win, false);
    notifyChange();
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
