/**
 * QuotationGuides — rulers + scene guides (%) for Quotation Editor.
 * rulersVisible / guidesVisible are session-only; guides[] persist on each scene.
 */
var QuotationGuides = (function () {
  var RULER_THICK = 15;
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;

  var api = null;
  var rootEl = null;
  var rulersVisible = false;
  var guidesVisible = true;
  var ghost = null;
  var dragGuide = null;
  var boundDoc = false;
  var readoutEl = null;

  function nextGuideId() {
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function clampPct(n) {
    var v = Number(n);
    if (isNaN(v)) return 0;
    if (v < 0) return 0;
    if (v > 100) return 100;
    return Math.round(v * 1000) / 1000;
  }

  function ensureGuidesArray(scene) {
    if (!scene) return [];
    if (!Array.isArray(scene.guides)) scene.guides = [];
    return scene.guides;
  }

  function activeScene() {
    return api && typeof api.getActiveScene === 'function' ? api.getActiveScene() : null;
  }

  function designSize() {
    if (api && typeof api.getDesignSize === 'function') {
      var d = api.getDesignSize();
      if (d && d.width && d.height) return d;
    }
    return { width: DESIGN_W, height: DESIGN_H };
  }

  function markDirty() {
    if (api && typeof api.onChange === 'function') api.onChange();
  }

  function stageEl() {
    return rootEl ? rootEl.querySelector('[data-qe-viewport-window]') : null;
  }

  function designCanvasEl() {
    var stage = stageEl();
    if (!stage) return null;
    return stage.querySelector('[data-hero-canvas]') ||
      stage.querySelector('.hero-canvas') ||
      stage.querySelector('.qe-canvas__design') ||
      null;
  }

  function clientToDesignPct(clientX, clientY) {
    var canvas = designCanvasEl();
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clampPct(((clientX - rect.left) / rect.width) * 100),
      y: clampPct(((clientY - rect.top) / rect.height) * 100),
      pxX: Math.round(((clientX - rect.left) / rect.width) * designSize().width),
      pxY: Math.round(((clientY - rect.top) / rect.height) * designSize().height),
      inBounds:
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
    };
  }

  function isPreview() {
    return !!(api && api.isPreviewMode && api.isPreviewMode());
  }

  function setDragCursor(type) {
    var axis = type === 'horizontal' ? 'h' : 'v';
    document.body.setAttribute('data-qe-guide-drag', axis);
    document.body.classList.add('is-qe-guide-dragging');
  }

  function clearDragCursor() {
    document.body.classList.remove('is-qe-guide-dragging');
    document.body.removeAttribute('data-qe-guide-drag');
  }

  function ensureReadout() {
    if (readoutEl && readoutEl.isConnected) return readoutEl;
    readoutEl = document.getElementById('qeGuideReadout');
    if (!readoutEl) {
      readoutEl = document.createElement('div');
      readoutEl.id = 'qeGuideReadout';
      readoutEl.className = 'qe-guide-readout';
      readoutEl.hidden = true;
      document.body.appendChild(readoutEl);
    }
    return readoutEl;
  }

  function showReadout(clientX, clientY, type, pct) {
    var el = ensureReadout();
    if (!el || !pct) return;
    var design = designSize();
    var px = type === 'horizontal'
      ? Math.round((pct.y / 100) * design.height)
      : Math.round((pct.x / 100) * design.width);
    el.textContent = type === 'horizontal' ? ('Y: ' + px + 'px') : ('X: ' + px + 'px');
    el.hidden = false;
    var pad = 14;
    el.style.left = Math.round(clientX + pad) + 'px';
    el.style.top = Math.round(clientY + pad) + 'px';
  }

  function hideReadout() {
    if (readoutEl) readoutEl.hidden = true;
  }

  /* ── Rulers ───────────────────────────────────────────── */

  function ensureChrome() {
    var frame = rootEl && rootEl.querySelector('[data-qe-canvas-fit-frame]');
    if (!frame) return null;
    var chrome = frame.querySelector('[data-qe-guides-chrome]');
    if (!chrome) {
      chrome = document.createElement('div');
      chrome.className = 'qe-guides-chrome';
      chrome.setAttribute('data-qe-guides-chrome', '1');
      chrome.innerHTML =
        '<div class="qe-ruler-corner" data-qe-ruler-corner aria-hidden="true"></div>' +
        /* V first, H on top so the top strip always creates a vertical guide. */
        '<div class="qe-ruler qe-ruler--v" data-qe-ruler="v" role="presentation"></div>' +
        '<div class="qe-ruler qe-ruler--h" data-qe-ruler="h" role="presentation"></div>';
      frame.insertBefore(chrome, frame.firstChild);
      bindRulerDrag(chrome);
    }
    return chrome;
  }

  function paintRulerTicks(ruler, axis, lengthPx, scale) {
    if (!ruler) return;
    var major = 100;
    var minor = 50;
    var html = '';
    var i;
    var s = scale > 0.001 ? scale : 1;
    for (i = 0; i <= lengthPx; i += minor) {
      var isMajor = i % major === 0;
      var pos = (i / lengthPx) * 100;
      if (axis === 'h') {
        html +=
          '<span class="qe-ruler__tick' + (isMajor ? ' is-major' : '') + '"' +
            ' style="left:' + pos + '%"></span>';
        if (isMajor) {
          html +=
            '<span class="qe-ruler__label" style="left:' + pos + '%">' + i + '</span>';
        }
      } else {
        html +=
          '<span class="qe-ruler__tick' + (isMajor ? ' is-major' : '') + '"' +
            ' style="top:' + pos + '%"></span>';
        if (isMajor) {
          html +=
            '<span class="qe-ruler__label" style="top:' + pos + '%">' + i + '</span>';
        }
      }
    }
    void s;
    ruler.innerHTML = html;
  }

  function refreshRulers() {
    var chrome = ensureChrome();
    if (!chrome) return;
    var on = rulersVisible && !isPreview();
    chrome.classList.toggle('is-rulers-on', on);
    chrome.hidden = !on;
    if (!on) return;

    var canvas = designCanvasEl() || stageEl();
    var rect = canvas ? canvas.getBoundingClientRect() : null;
    var design = designSize();
    var scaleX = rect && design.width ? rect.width / design.width : 1;
    var scaleY = rect && design.height ? rect.height / design.height : 1;

    var h = chrome.querySelector('[data-qe-ruler="h"]');
    var v = chrome.querySelector('[data-qe-ruler="v"]');
    var stage = stageEl();
    if (stage && rect) {
      var frame = chrome.parentElement;
      var frameRect = frame ? frame.getBoundingClientRect() : null;
      if (frameRect) {
        chrome.style.setProperty('--qe-ruler-thick', RULER_THICK + 'px');
        chrome.style.setProperty('--qe-ruler-stage-left', (rect.left - frameRect.left) + 'px');
        chrome.style.setProperty('--qe-ruler-stage-top', (rect.top - frameRect.top) + 'px');
        chrome.style.setProperty('--qe-ruler-stage-w', rect.width + 'px');
        chrome.style.setProperty('--qe-ruler-stage-h', rect.height + 'px');
      }
    }
    paintRulerTicks(h, 'h', design.width, scaleX);
    paintRulerTicks(v, 'v', design.height, scaleY);
  }

  function bindRulerDrag(chrome) {
    if (!chrome || chrome.dataset.qeRulerBound === '1') return;
    chrome.dataset.qeRulerBound = '1';

    chrome.querySelectorAll('[data-qe-ruler]').forEach(function (ruler) {
      ruler.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || isPreview()) return;
        e.preventDefault();
        e.stopPropagation();
        var axis = ruler.getAttribute('data-qe-ruler');
        /*
         * Top (horizontal) ruler → HORIZONTAL guide (follows Y).
         * Left (vertical) ruler → VERTICAL guide (follows X).
         */
        var type = axis === 'h' ? 'horizontal' : 'vertical';
        startGhost(type, e.clientX, e.clientY);
      });
    });
  }

  /* ── Guide layer ──────────────────────────────────────── */

  function ensureGuideLayer() {
    var canvas = designCanvasEl();
    if (!canvas) return null;
    var layer = canvas.querySelector('[data-qe-guide-layer]');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'qe-guide-layer';
      layer.setAttribute('data-qe-guide-layer', '1');
      /* Above edit/experiencia so guides receive drag hits. */
      canvas.appendChild(layer);
    } else if (layer.parentNode === canvas) {
      canvas.appendChild(layer);
    }
    return layer;
  }

  function renderGuides() {
    var layer = ensureGuideLayer();
    if (!layer) return;
    if (isPreview() || !guidesVisible) {
      layer.innerHTML = '';
      layer.hidden = true;
      return;
    }
    layer.hidden = false;
    var scene = activeScene();
    var guides = ensureGuidesArray(scene);
    var html = '';
    guides.forEach(function (g) {
      if (!g || !g.id) return;
      var type = g.type === 'horizontal' ? 'horizontal' : 'vertical';
      var pos = clampPct(g.position);
      var style = type === 'horizontal'
        ? 'top:' + pos + '%;'
        : 'left:' + pos + '%;';
      html +=
        '<div class="qe-guide-line qe-guide-line--' + type +
          (g.locked ? ' is-locked' : '') + '"' +
          ' data-qe-guide-id="' + String(g.id).replace(/"/g, '') + '"' +
          ' data-qe-guide-type="' + type + '"' +
          ' style="' + style + '"' +
          ' title="Arrastra para mover · Doble clic para eliminar"></div>';
    });
    layer.innerHTML = html;
    layer.querySelectorAll('[data-qe-guide-id]').forEach(function (el) {
      bindGuideLine(el);
    });
  }

  function bindGuideLine(el) {
    el.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isPreview()) return;
      removeGuide(el.getAttribute('data-qe-guide-id'));
    });
    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || isPreview()) return;
      var scene = activeScene();
      var guides = ensureGuidesArray(scene);
      var id = el.getAttribute('data-qe-guide-id');
      var g = null;
      for (var i = 0; i < guides.length; i++) {
        if (guides[i] && String(guides[i].id) === String(id)) { g = guides[i]; break; }
      }
      if (!g || g.locked) return;
      e.preventDefault();
      e.stopPropagation();
      dragGuide = {
        id: id,
        type: g.type === 'horizontal' ? 'horizontal' : 'vertical',
        el: el
      };
      setDragCursor(dragGuide.type);
      showReadout(e.clientX, e.clientY, dragGuide.type, clientToDesignPct(e.clientX, e.clientY));
    });
  }

  function findGuide(id) {
    var guides = ensureGuidesArray(activeScene());
    for (var i = 0; i < guides.length; i++) {
      if (guides[i] && String(guides[i].id) === String(id)) return guides[i];
    }
    return null;
  }

  function removeGuide(id) {
    var scene = activeScene();
    var guides = ensureGuidesArray(scene);
    var next = guides.filter(function (g) {
      return g && String(g.id) !== String(id);
    });
    scene.guides = next;
    renderGuides();
    markDirty();
  }

  function addGuide(type, positionPct) {
    var scene = activeScene();
    if (!scene) return null;
    if (!guidesVisible) setGuidesVisible(true);
    var guides = ensureGuidesArray(scene);
    var g = {
      id: nextGuideId(),
      type: type === 'horizontal' ? 'horizontal' : 'vertical',
      position: clampPct(positionPct),
      locked: false
    };
    guides.push(g);
    renderGuides();
    markDirty();
    return g;
  }

  /* ── Ghost from ruler ─────────────────────────────────── */

  function ensureGhostHost() {
    var layer = ensureGuideLayer();
    if (!layer) return null;
    var el = layer.querySelector('[data-qe-guide-ghost]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'qe-guide-line qe-guide-line--ghost';
      el.setAttribute('data-qe-guide-ghost', '1');
      el.hidden = true;
      layer.appendChild(el);
    }
    return el;
  }

  function startGhost(type, clientX, clientY) {
    if (!guidesVisible) setGuidesVisible(true);
    ghost = { type: type };
    var el = ensureGhostHost();
    if (el) {
      el.hidden = false;
      el.className = 'qe-guide-line qe-guide-line--ghost qe-guide-line--' + type;
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.bottom = '';
      updateGhost(clientX, clientY);
    }
    setDragCursor(type);
  }

  function updateGhost(clientX, clientY) {
    if (!ghost) return;
    var el = ensureGhostHost();
    var pct = clientToDesignPct(clientX, clientY);
    if (!el || !pct) return;
    if (ghost.type === 'horizontal') {
      el.style.top = pct.y + '%';
      el.style.left = '0';
      el.style.right = '0';
      el.style.bottom = 'auto';
      el.style.width = 'auto';
      el.style.height = '1px';
    } else {
      el.style.left = pct.x + '%';
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.right = 'auto';
      el.style.width = '1px';
      el.style.height = 'auto';
    }
    showReadout(clientX, clientY, ghost.type, pct);
  }

  function endGhost(clientX, clientY, cancelled) {
    var type = ghost && ghost.type;
    ghost = null;
    var el = rootEl && rootEl.querySelector('[data-qe-guide-ghost]');
    if (el) {
      el.hidden = true;
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.width = '';
      el.style.height = '';
    }
    clearDragCursor();
    hideReadout();
    if (cancelled || !type) return;
    var pct = clientToDesignPct(clientX, clientY);
    if (!pct || !pct.inBounds) return;
    addGuide(type, type === 'horizontal' ? pct.y : pct.x);
  }

  /* ── Document pointer for drag ────────────────────────── */

  function onDocMove(e) {
    if (ghost) {
      updateGhost(e.clientX, e.clientY);
      return;
    }
    if (!dragGuide) return;
    var pct = clientToDesignPct(e.clientX, e.clientY);
    if (!pct) return;
    var g = findGuide(dragGuide.id);
    if (!g) return;
    if (!pct.inBounds) {
      if (dragGuide.el) dragGuide.el.classList.add('is-removing');
      hideReadout();
      return;
    }
    if (dragGuide.el) dragGuide.el.classList.remove('is-removing');
    var pos = dragGuide.type === 'horizontal' ? pct.y : pct.x;
    g.position = clampPct(pos);
    if (dragGuide.el) {
      if (dragGuide.type === 'horizontal') {
        dragGuide.el.style.top = g.position + '%';
      } else {
        dragGuide.el.style.left = g.position + '%';
      }
    }
    showReadout(e.clientX, e.clientY, dragGuide.type, pct);
  }

  function onDocUp(e) {
    if (ghost) {
      endGhost(e.clientX, e.clientY, false);
      return;
    }
    if (!dragGuide) return;
    var pct = clientToDesignPct(e.clientX, e.clientY);
    var id = dragGuide.id;
    dragGuide = null;
    clearDragCursor();
    hideReadout();
    if (!pct || !pct.inBounds) {
      removeGuide(id);
      return;
    }
    markDirty();
    renderGuides();
  }

  function bindDoc() {
    if (boundDoc) return;
    boundDoc = true;
    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup', onDocUp);
  }

  /* ── Context menu ─────────────────────────────────────── */

  function isBlockedContextTarget(t) {
    if (!t || !t.closest) return true;
    return !!(
      t.closest('.qe-guide-line') ||
      t.closest('.builder-exp-btn, .builder-exp-hotspot, [data-exp-ix], [data-interaction-id]') ||
      t.closest('[data-qe-ruler], [data-qe-ruler-corner]') ||
      t.closest('.qe-dock, [data-qe-dock]') ||
      t.closest('[data-qe-viewport-bar], .qe-canvas-tool') ||
      t.closest('.qe-scenes, [data-qe-scenes]') ||
      t.closest('.qe-layers, .quotation-props') ||
      t.closest('.quotation-panel-float') ||
      t.closest('button, a, input, textarea, select, label, [role="button"], [role="menuitem"]')
    );
  }

  function isCanvasContextTarget(t) {
    if (!t || !t.closest) return false;
    if (isBlockedContextTarget(t)) return false;
    /* Canvas + gutter around the design (fit/frame/stack), not only the lienzo. */
    return !!(
      t.closest('[data-qe-canvas-fit]') ||
      t.closest('[data-qe-canvas-fit-frame]') ||
      t.closest('[data-qe-canvas-fit-stack]') ||
      t.closest('[data-qe-edit-layer]') ||
      t.closest('[data-qe-guide-layer]') ||
      t.closest('[data-hero-canvas]') ||
      t.closest('[data-qe-viewport-window]') ||
      t.closest('[data-qe-guides-chrome]')
    );
  }

  function openCanvasMenu(clientX, clientY) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    var pct = clientToDesignPct(clientX, clientY);
    var canPlace = !!(pct && pct.inBounds);
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Menú del canvas',
      items: [
        {
          id: 'toggle-rulers',
          label: rulersVisible ? 'Ocultar reglas' : 'Mostrar reglas'
        },
        {
          id: 'toggle-guides',
          label: guidesVisible ? 'Ocultar guías' : 'Mostrar guías',
          separatorBefore: true
        },
        {
          id: 'guide-h',
          label: 'Crear guía horizontal',
          separatorBefore: true,
          disabled: !canPlace
        },
        {
          id: 'guide-v',
          label: 'Crear guía vertical',
          disabled: !canPlace
        }
      ],
      onSelect: function (id) {
        if (id === 'toggle-rulers') {
          setRulersVisible(!rulersVisible);
          return;
        }
        if (id === 'toggle-guides') {
          setGuidesVisible(!guidesVisible);
          return;
        }
        if (!canPlace) return;
        if (id === 'guide-h') addGuide('horizontal', pct.y);
        if (id === 'guide-v') addGuide('vertical', pct.x);
      }
    });
  }

  function onContextMenu(e) {
    if (isPreview()) return;
    if (!isCanvasContextTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    openCanvasMenu(e.clientX, e.clientY);
  }

  function bindContextMenu() {
    var host = (rootEl && rootEl.querySelector('[data-qe-canvas-fit]')) || stageEl();
    if (!host || host.dataset.qeGuideCtx === '1') return;
    host.dataset.qeGuideCtx = '1';
    host.addEventListener('contextmenu', onContextMenu);
  }

  /* ── Public API ───────────────────────────────────────── */

  function setRulersVisible(on) {
    rulersVisible = !!on;
    refreshRulers();
    if (api && typeof api.onRulersChange === 'function') {
      api.onRulersChange(rulersVisible);
    }
  }

  function setGuidesVisible(on) {
    guidesVisible = !!on;
    renderGuides();
    if (api && typeof api.onGuidesVisibleChange === 'function') {
      api.onGuidesVisibleChange(guidesVisible);
    }
  }

  function sync(nextRoot, nextApi) {
    rootEl = nextRoot || rootEl;
    api = nextApi || api;
    if (!rootEl || isPreview()) {
      var chrome = rootEl && rootEl.querySelector('[data-qe-guides-chrome]');
      if (chrome) chrome.hidden = true;
      return;
    }
    bindDoc();
    ensureChrome();
    bindContextMenu();
    refreshRulers();
    renderGuides();
  }

  function destroy() {
    ghost = null;
    dragGuide = null;
    clearDragCursor();
    hideReadout();
    if (typeof QuotationContextMenu !== 'undefined' && QuotationContextMenu.close) {
      QuotationContextMenu.close();
    }
  }

  return {
    sync: sync,
    destroy: destroy,
    refresh: function () { sync(rootEl, api); },
    setRulersVisible: setRulersVisible,
    isRulersVisible: function () { return rulersVisible; },
    setGuidesVisible: setGuidesVisible,
    isGuidesVisible: function () { return guidesVisible; },
    addGuide: addGuide,
    removeGuide: removeGuide,
    ensureGuidesArray: ensureGuidesArray,
    RULER_THICK: RULER_THICK
  };
})();
