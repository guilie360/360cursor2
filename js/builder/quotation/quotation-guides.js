/**
 * QuotationGuides — rulers + scene guides (%) for Quotation Editor.
 * v7.2.164 — Guides are per viewport (desktop / tablet / mobile).
 * rulersVisible / guidesVisible are session-only; guidesByViewport persist on each scene.
 *
 * Coordinate space = active viewport window (Desktop / Tablet / Mobile), not the
 * 1920×1080 HeroCanvas lienzo. Guides are % of that window.
 */
var QuotationGuides = (function () {
  var RULER_THICK = 15;
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;
  var VIEWPORTS = ['desktop', 'tablet', 'mobile'];

  var api = null;
  var rootEl = null;
  var rulersVisible = false;
  var guidesVisible = true;
  var ghost = null;
  var dragGuide = null;
  var boundDoc = false;
  var readoutEl = null;
  /** Session clipboard: { viewport, items:[{ type, position, locked }] }. */
  var guidesClipboard = null;

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

  function normalizeViewportId(id) {
    var v = String(id || '').toLowerCase();
    if (v === 'tablet' || v === 'mobile') return v;
    return 'desktop';
  }

  function activeViewportId() {
    if (api && typeof api.getViewportPreset === 'function') {
      return normalizeViewportId(api.getViewportPreset());
    }
    return 'desktop';
  }

  function viewportLabel(id) {
    var v = normalizeViewportId(id);
    if (v === 'tablet') return 'Tablet';
    if (v === 'mobile') return 'Mobile';
    return 'Desktop';
  }

  /** Migrate legacy scene.guides[] → guidesByViewport.desktop. */
  function ensureGuideBuckets(scene) {
    if (!scene) return null;
    if (!scene.guidesByViewport || typeof scene.guidesByViewport !== 'object') {
      scene.guidesByViewport = {};
    }
    var i;
    for (i = 0; i < VIEWPORTS.length; i++) {
      var key = VIEWPORTS[i];
      if (!Array.isArray(scene.guidesByViewport[key])) scene.guidesByViewport[key] = [];
    }
    if (Array.isArray(scene.guides) && scene.guides.length) {
      if (!scene.guidesByViewport.desktop.length) {
        scene.guidesByViewport.desktop = scene.guides.slice();
      }
      scene.guides = [];
    } else if (!Array.isArray(scene.guides)) {
      scene.guides = [];
    }
    return scene.guidesByViewport;
  }

  function ensureGuidesArray(scene, viewport) {
    if (!scene) return [];
    var buckets = ensureGuideBuckets(scene);
    if (!buckets) return [];
    var vp = normalizeViewportId(viewport || activeViewportId());
    return buckets[vp];
  }

  /** Replace guides for a viewport bucket (never write only to legacy scene.guides). */
  function setGuidesArray(scene, next, viewport) {
    if (!scene) return;
    var buckets = ensureGuideBuckets(scene);
    if (!buckets) return;
    var vp = normalizeViewportId(viewport || activeViewportId());
    var list = Array.isArray(next) ? next : [];
    buckets[vp] = list;
    /* Keep legacy alias in sync with desktop only. */
    if (vp === 'desktop') scene.guides = list.slice();
    else if (!Array.isArray(scene.guides)) scene.guides = [];
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

  /** Active device frame — hit-testing / % space (not the 1920 lienzo). */
  function guideSpaceEl() {
    return stageEl();
  }

  function fitFrameEl() {
    return rootEl ? rootEl.querySelector('[data-qe-canvas-fit-frame]') : null;
  }

  function designCanvasEl() {
    var stage = stageEl();
    if (!stage) return null;
    return stage.querySelector('[data-hero-canvas]') ||
      stage.querySelector('.hero-canvas') ||
      stage.querySelector('.qe-canvas__design') ||
      null;
  }

  function stripLegacyGuideLayers() {
    var stage = stageEl();
    var canvas = designCanvasEl();
    [stage, canvas].forEach(function (host) {
      if (!host) return;
      var legacy = host.querySelector('[data-qe-guide-layer]');
      if (legacy && legacy.parentNode === host) {
        try { host.removeChild(legacy); } catch (eL) { /* ignore */ }
      }
    });
  }

  function clientToDesignPct(clientX, clientY) {
    var space = guideSpaceEl();
    if (!space) return null;
    var rect = space.getBoundingClientRect();
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

    var space = guideSpaceEl();
    var rect = space ? space.getBoundingClientRect() : null;
    var design = designSize();
    var scaleX = rect && design.width ? rect.width / design.width : 1;
    var scaleY = rect && design.height ? rect.height / design.height : 1;

    var h = chrome.querySelector('[data-qe-ruler="h"]');
    var v = chrome.querySelector('[data-qe-ruler="v"]');
    if (space && rect) {
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
    syncGuideLayerGeometry();
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

  function isGuideDragActive() {
    return !!(ghost || dragGuide);
  }

  /**
   * Guide layer sits on the fit frame (sibling of the scaled stage), not inside
   * transform:scale — that scale was leaving GPU drag trails / ghost lines.
   */
  function ensureGuideLayer() {
    var frame = fitFrameEl();
    if (!frame) return null;
    stripLegacyGuideLayers();
    var layer = frame.querySelector('[data-qe-guide-layer]');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'qe-guide-layer';
      layer.setAttribute('data-qe-guide-layer', '1');
      var stage = stageEl();
      if (stage && stage.parentNode === frame) {
        if (stage.nextSibling) frame.insertBefore(layer, stage.nextSibling);
        else frame.appendChild(layer);
      } else {
        frame.appendChild(layer);
      }
      bindGuideLayer(layer);
    } else if (layer.parentNode !== frame) {
      frame.appendChild(layer);
      bindGuideLayer(layer);
    }
    syncGuideLayerGeometry(layer);
    return layer;
  }

  function guideElById(id) {
    if (id == null) return null;
    var layer = ensureGuideLayer();
    if (!layer) return null;
    return layer.querySelector('[data-qe-guide-id="' + String(id).replace(/"/g, '') + '"]');
  }

  function syncGuideLayerGeometry(layer) {
    var el = layer || (fitFrameEl() && fitFrameEl().querySelector('[data-qe-guide-layer]'));
    var frame = fitFrameEl();
    var space = guideSpaceEl();
    if (!el || !frame || !space) return;
    var frameRect = frame.getBoundingClientRect();
    var rect = space.getBoundingClientRect();
    if (!frameRect.width || !rect.width) return;
    el.style.left = (rect.left - frameRect.left) + 'px';
    el.style.top = (rect.top - frameRect.top) + 'px';
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
    /* Layer is outside stage scale → 1 screen px hairline, no compensation. */
    el.style.setProperty('--qe-stage-scale', '1');
    el.style.setProperty('--qe-guide-hair', '1px');
  }

  /** Snap to whole viewport px for readouts / keyboard edits. */
  function guideDesignPx(type, positionPct) {
    var design = designSize();
    var max = type === 'horizontal' ? design.height : design.width;
    var px = Math.round((clampPct(positionPct) / 100) * max);
    if (px < 0) px = 0;
    if (px > max) px = max;
    return px;
  }

  /** Position with % so geometry stays correct outside the scaled stage. */
  function applyGuideElPosition(el, type, positionPct) {
    if (!el) return;
    var pct = clampPct(positionPct);
    if (type === 'horizontal') {
      el.style.top = pct + '%';
      el.style.left = '0';
      el.style.right = '0';
      el.style.bottom = 'auto';
      el.style.width = 'auto';
      el.style.height = '';
    } else {
      el.style.left = pct + '%';
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.right = 'auto';
      el.style.width = '';
      el.style.height = 'auto';
    }
  }

  function renderGuides() {
    var layer = ensureGuideLayer();
    if (!layer) return;
    syncGuideLayerGeometry(layer);
    /* Never wipe DOM mid-drag — fit/refresh was freezing guides in place. */
    if (isGuideDragActive()) {
      layer.hidden = !guidesVisible || isPreview();
      return;
    }
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
      var pct = clampPct(g.position);
      var style = type === 'horizontal'
        ? 'top:' + pct + '%;left:0;right:0;'
        : 'left:' + pct + '%;top:0;bottom:0;';
      html +=
        '<div class="qe-guide-line qe-guide-line--' + type +
          (g.locked ? ' is-locked' : '') + '"' +
          ' data-qe-guide-id="' + String(g.id).replace(/"/g, '') + '"' +
          ' data-qe-guide-type="' + type + '"' +
          ' style="' + style + '"' +
          ' title="Arrastra para mover · Clic derecho para eliminar"></div>';
    });
    layer.innerHTML = html;
  }

  function guidePositionPx(g) {
    if (!g) return 0;
    var design = designSize();
    var max = g.type === 'horizontal' ? design.height : design.width;
    return Math.round((clampPct(g.position) / 100) * max);
  }

  function setGuidePositionPx(guideId, pxValue) {
    var g = findGuide(guideId);
    if (!g || g.locked) return false;
    var design = designSize();
    var max = g.type === 'horizontal' ? design.height : design.width;
    var n = Math.round(Number(String(pxValue).replace(/[^\d.-]/g, '')));
    if (isNaN(n)) return false;
    if (n < 0) n = 0;
    if (n > max) n = max;
    g.position = clampPct(max > 0 ? (n / max) * 100 : 0);
    renderGuides();
    markDirty();
    return true;
  }

  function escapeGuideHtml(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isHeroScene(sc) {
    if (api && typeof api.isHeroScene === 'function') return !!api.isHeroScene(sc);
    var scenes = allScenes();
    return !!(sc && scenes[0] && String(scenes[0].id) === String(sc.id));
  }

  function sceneDisplayName(sc) {
    if (!sc) return 'Escena';
    if (isHeroScene(sc)) return String(sc.name || 'Hero');
    return String(sc.name || 'Escena');
  }

  function countGuidesForSelection(sceneIdSet, wantH, wantV) {
    var n = 0;
    allScenes().forEach(function (sc) {
      if (!sc || !sceneIdSet[String(sc.id)]) return;
      ensureGuidesArray(sc).forEach(function (g) {
        if (!g) return;
        if (g.type === 'horizontal' && wantH) n += 1;
        else if (g.type === 'vertical' && wantV) n += 1;
      });
    });
    return n;
  }

  function countGuidesByTypeInScenes(sceneIdSet, type) {
    var n = 0;
    allScenes().forEach(function (sc) {
      if (!sc || !sceneIdSet[String(sc.id)]) return;
      ensureGuidesArray(sc).forEach(function (g) {
        if (g && g.type === type) n += 1;
      });
    });
    return n;
  }

  function applyDeleteGuides(sceneIds, wantH, wantV) {
    if (!wantH && !wantV) return 0;
    var idSet = {};
    (sceneIds || []).forEach(function (id) { idSet[String(id)] = true; });
    var vp = activeViewportId();
    var removed = 0;
    allScenes().forEach(function (sc) {
      if (!sc || !idSet[String(sc.id)]) return;
      var guides = ensureGuidesArray(sc, vp);
      var next = [];
      guides.forEach(function (g) {
        if (!g) return;
        var drop =
          (g.type === 'horizontal' && wantH) ||
          (g.type === 'vertical' && wantV);
        if (drop) removed += 1;
        else next.push(g);
      });
      setGuidesArray(sc, next, vp);
    });
    renderGuides();
    markDirty();
    return removed;
  }

  /** Scene checkboxes: current scene first + checked; others (incl. Hero) unchecked. */
  function buildGuidesScenePickerRowsHtml() {
    var active = activeScene();
    var activeId = active ? String(active.id) : '';
    var scenes = allScenes().filter(Boolean);
    var html = '';
    if (active) {
      html += '' +
        '<label class="qe-guides-delete__check qe-guides-delete__check--scene">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-gd-scene="' +
            escapeGuideHtml(activeId) + '" checked>' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-stack">' +
            '<span class="qe-guides-delete__check-main">Escena actual</span>' +
            '<span class="qe-guides-delete__check-sub">' +
              escapeGuideHtml(sceneDisplayName(active)) +
            '</span>' +
          '</span>' +
        '</label>';
    }
    scenes.forEach(function (sc) {
      if (!sc || String(sc.id) === activeId) return;
      html += '' +
        '<label class="qe-guides-delete__check qe-guides-delete__check--scene">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-gd-scene="' +
            escapeGuideHtml(String(sc.id)) + '">' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-main">' +
            escapeGuideHtml(sceneDisplayName(sc)) +
          '</span>' +
        '</label>';
    });
    return html;
  }

  function selectedGuideSceneIds(root) {
    var ids = [];
    if (!root) return ids;
    root.querySelectorAll('[data-qe-gd-scene]').forEach(function (input) {
      if (input.checked) ids.push(input.getAttribute('data-qe-gd-scene'));
    });
    return ids;
  }

  function bindGuidesScenePickerControls(root, onChange) {
    root.querySelectorAll('[data-qe-gd-scene]').forEach(function (input) {
      input.addEventListener('change', onChange);
    });
    var selectAll = root.querySelector('[data-qe-gd-select-all]');
    var deselectAll = root.querySelector('[data-qe-gd-deselect-all]');
    if (selectAll) {
      selectAll.addEventListener('click', function () {
        root.querySelectorAll('[data-qe-gd-scene]').forEach(function (input) {
          input.checked = true;
        });
        onChange();
      });
    }
    if (deselectAll) {
      deselectAll.addEventListener('click', function () {
        root.querySelectorAll('[data-qe-gd-scene]').forEach(function (input) {
          input.checked = false;
        });
        onChange();
      });
    }
  }

  function guidesScenePickerBodyHtml(extraBefore) {
    return '' +
      '<div class="qe-guides-delete" data-qe-guides-picker>' +
        (extraBefore || '') +
        '<p class="qe-guides-delete__section">Escenas</p>' +
        '<div class="qe-guides-delete__scenes" data-qe-gd-scenes>' +
          buildGuidesScenePickerRowsHtml() +
        '</div>' +
        '<div class="qe-guides-delete__bulk">' +
          '<button type="button" class="qe-guides-delete__bulk-btn" data-qe-gd-select-all>' +
            'Seleccionar todo</button>' +
          '<button type="button" class="qe-guides-delete__bulk-btn" data-qe-gd-deselect-all>' +
            'Deseleccionar todo</button>' +
        '</div>' +
      '</div>';
  }

  function openDeleteGuidesDialog() {
    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') return;
    if (!allScenes().filter(Boolean).length) return;
    var vp = activeViewportId();
    var vpLabel = viewportLabel(vp);

    var typeRow = function (type, label) {
      return '' +
        '<label class="qe-guides-delete__check">' +
          '<input type="checkbox" class="qe-guides-delete__input" data-qe-gd-type="' +
            type + '" checked>' +
          '<span class="qe-guides-delete__box" aria-hidden="true"></span>' +
          '<span class="qe-guides-delete__check-main">' + label +
            ' (<span data-qe-gd-type-count="' + type + '">0</span>)</span>' +
        '</label>';
    };

    var typeBlock =
      '<p class="qe-guides-delete__hint">Solo afecta guías de ' + vpLabel + '.</p>' +
      '<p class="qe-guides-delete__section">Tipo</p>' +
      typeRow('horizontal', 'Horizontales') +
      typeRow('vertical', 'Verticales');

    AdminUI.openModal({
      title: 'Eliminar guías · ' + vpLabel,
      bodyHtml: guidesScenePickerBodyHtml(typeBlock),
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-danger" data-modal-action="confirm" data-qe-gd-confirm>' +
          'Eliminar (0)</button>',
      onMount: function (root) {
        var modal = root.querySelector('.admin-modal');
        if (modal) modal.classList.add('qe-guides-delete-modal');

        function selectedSceneSet() {
          var set = {};
          selectedGuideSceneIds(root).forEach(function (id) { set[String(id)] = true; });
          return set;
        }

        function typeFlags() {
          var h = root.querySelector('[data-qe-gd-type="horizontal"]');
          var v = root.querySelector('[data-qe-gd-type="vertical"]');
          return { h: !!(h && h.checked), v: !!(v && v.checked) };
        }

        function refreshCounts() {
          var scenesSet = selectedSceneSet();
          var flags = typeFlags();
          var hEl = root.querySelector('[data-qe-gd-type-count="horizontal"]');
          var vEl = root.querySelector('[data-qe-gd-type-count="vertical"]');
          if (hEl) hEl.textContent = String(countGuidesByTypeInScenes(scenesSet, 'horizontal'));
          if (vEl) vEl.textContent = String(countGuidesByTypeInScenes(scenesSet, 'vertical'));
          var total = countGuidesForSelection(scenesSet, flags.h, flags.v);
          var btn = root.querySelector('[data-qe-gd-confirm]');
          if (btn) {
            btn.textContent = 'Eliminar (' + total + ')';
            btn.disabled = total <= 0;
          }
        }

        root.querySelectorAll('[data-qe-gd-type]').forEach(function (input) {
          input.addEventListener('change', refreshCounts);
        });
        bindGuidesScenePickerControls(root, refreshCounts);

        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            if (confirmBtn.disabled) return;
            var flags = typeFlags();
            var ids = selectedGuideSceneIds(root);
            AdminUI.closeModal();
            applyDeleteGuides(ids, flags.h, flags.v);
          });
        }

        refreshCounts();
      },
      onClose: function () {
        var modal = document.querySelector('.admin-modal.qe-guides-delete-modal');
        if (modal) modal.classList.remove('qe-guides-delete-modal');
      }
    });
  }

  function openPasteGuidesDialog() {
    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') return;
    if (!hasGuidesClipboard()) return;
    if (!allScenes().filter(Boolean).length) return;

    var clipCount = Array.isArray(guidesClipboard.items)
      ? guidesClipboard.items.length
      : (Array.isArray(guidesClipboard) ? guidesClipboard.length : 0);
    var vp = clipboardViewportId();
    var vpLabel = viewportLabel(vp);

    AdminUI.openModal({
      title: 'Pegar guías · ' + vpLabel,
      bodyHtml: guidesScenePickerBodyHtml(
        '<p class="qe-guides-delete__hint">' +
          clipCount + (clipCount === 1 ? ' guía' : ' guías') +
          ' de ' + vpLabel +
          ' · solo ese dispositivo' +
        '</p>'
      ),
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-primary" data-modal-action="confirm" data-qe-gd-confirm>' +
          'Pegar (0)</button>',
      onMount: function (root) {
        var modal = root.querySelector('.admin-modal');
        if (modal) modal.classList.add('qe-guides-delete-modal');

        function refreshCounts() {
          var ids = selectedGuideSceneIds(root);
          var total = clipCount * ids.length;
          var btn = root.querySelector('[data-qe-gd-confirm]');
          if (btn) {
            btn.textContent = 'Pegar (' + total + ')';
            btn.disabled = total <= 0 || !hasGuidesClipboard();
          }
        }

        bindGuidesScenePickerControls(root, refreshCounts);

        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            if (confirmBtn.disabled) return;
            var ids = selectedGuideSceneIds(root);
            AdminUI.closeModal();
            applyPasteGuides(ids);
          });
        }

        refreshCounts();
      },
      onClose: function () {
        var modal = document.querySelector('.admin-modal.qe-guides-delete-modal');
        if (modal) modal.classList.remove('qe-guides-delete-modal');
      }
    });
  }

  function openGuideMenu(clientX, clientY, guideId) {
    if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
    if (!guideId) return;
    var g = findGuide(guideId);
    if (!g) return;
    var type = g.type === 'horizontal' ? 'horizontal' : 'vertical';
    var axis = type === 'horizontal' ? 'Y' : 'X';
    var design = designSize();
    var max = type === 'horizontal' ? design.height : design.width;
    QuotationContextMenu.open({
      x: clientX,
      y: clientY,
      ariaLabel: 'Menú de guía',
      items: [
        {
          type: 'input',
          id: 'guide-pos',
          label: axis,
          value: guidePositionPx(g),
          suffix: 'px',
          min: 0,
          max: max,
          step: 1,
          ariaLabel: 'Posición ' + axis + ' en píxeles',
          onSubmit: function (raw) {
            setGuidePositionPx(guideId, raw);
          }
        },
        {
          id: 'delete-guides-dialog',
          label: 'Eliminar guías...',
          danger: true,
          separatorBefore: true
        },
        {
          id: 'delete-guide',
          label: 'Eliminar',
          danger: true
        }
      ],
      onSelect: function (id) {
        if (id === 'delete-guides-dialog') {
          openDeleteGuidesDialog();
          return;
        }
        if (id === 'delete-guide') removeGuide(guideId);
      }
    });
  }

  function beginGuideDrag(id, el, clientX, clientY, pointerId) {
    var g = findGuide(id);
    if (!g || g.locked) return false;
    if (typeof QuotationContextMenu !== 'undefined' && QuotationContextMenu.close) {
      QuotationContextMenu.close();
    }
    dragGuide = {
      id: String(id),
      type: g.type === 'horizontal' ? 'horizontal' : 'vertical',
      el: el || guideElById(id),
      pointerId: pointerId
    };
    if (dragGuide.el) {
      dragGuide.el.classList.add('is-dragging');
      if (pointerId != null && dragGuide.el.setPointerCapture) {
        try { dragGuide.el.setPointerCapture(pointerId); } catch (errCap) { /* ignore */ }
      }
    }
    setDragCursor(dragGuide.type);
    showReadout(clientX, clientY, dragGuide.type, clientToDesignPct(clientX, clientY));
    return true;
  }

  function bindGuideLayer(layer) {
    if (!layer || layer.dataset.qeGuideLayerBound === '1') return;
    layer.dataset.qeGuideLayerBound = '1';

    layer.addEventListener('contextmenu', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-qe-guide-id]') : null;
      if (!el || !layer.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      if (isPreview()) return;
      openGuideMenu(e.clientX, e.clientY, el.getAttribute('data-qe-guide-id'));
    });

    layer.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || isPreview()) return;
      var el = e.target && e.target.closest ? e.target.closest('[data-qe-guide-id]') : null;
      if (!el || !layer.contains(el)) return;
      var id = el.getAttribute('data-qe-guide-id');
      if (!beginGuideDrag(id, el, e.clientX, e.clientY, e.pointerId)) return;
      e.preventDefault();
      e.stopPropagation();
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
    if (!scene) return;
    var vp = activeViewportId();
    var guides = ensureGuidesArray(scene, vp);
    var next = guides.filter(function (g) {
      return g && String(g.id) !== String(id);
    });
    setGuidesArray(scene, next, vp);
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

  function cloneGuidesForClipboard(guides) {
    return (Array.isArray(guides) ? guides : []).map(function (g) {
      if (!g) return null;
      return {
        type: g.type === 'horizontal' ? 'horizontal' : 'vertical',
        position: clampPct(g.position),
        locked: !!g.locked
      };
    }).filter(Boolean);
  }

  function materializeClipboardGuides() {
    var items = guidesClipboard && Array.isArray(guidesClipboard.items)
      ? guidesClipboard.items
      : (Array.isArray(guidesClipboard) ? guidesClipboard : []);
    return items.map(function (src) {
      return {
        id: nextGuideId(),
        type: src.type === 'horizontal' ? 'horizontal' : 'vertical',
        position: clampPct(src.position),
        locked: !!src.locked
      };
    });
  }

  function clearGuidesClipboard() {
    guidesClipboard = null;
  }

  function allScenes() {
    if (api && typeof api.getScenes === 'function') {
      var list = api.getScenes();
      if (Array.isArray(list)) return list;
    }
    var active = activeScene();
    return active ? [active] : [];
  }

  function copyGuides() {
    var scene = activeScene();
    if (!scene) return false;
    var vp = activeViewportId();
    var cloned = cloneGuidesForClipboard(ensureGuidesArray(scene, vp));
    if (!cloned.length) {
      clearGuidesClipboard();
      return false;
    }
    guidesClipboard = { viewport: vp, items: cloned };
    return true;
  }

  /**
   * One-shot paste into the given scenes, into the clipboard's viewport bucket only
   * (Desktop paste never touches Tablet/Mobile guides).
   */
  function applyPasteGuides(sceneIds) {
    var items = guidesClipboard && Array.isArray(guidesClipboard.items)
      ? guidesClipboard.items
      : (Array.isArray(guidesClipboard) ? guidesClipboard : null);
    if (!items || !items.length) return 0;
    if (!sceneIds || !sceneIds.length) return 0;
    var vp = normalizeViewportId(
      (guidesClipboard && guidesClipboard.viewport) || activeViewportId()
    );
    if (!guidesVisible) setGuidesVisible(true);
    var idSet = {};
    sceneIds.forEach(function (id) { idSet[String(id)] = true; });
    var added = 0;
    allScenes().forEach(function (sc) {
      if (!sc || !idSet[String(sc.id)]) return;
      var guides = ensureGuidesArray(sc, vp);
      materializeClipboardGuides().forEach(function (g) {
        guides.push(g);
        added += 1;
      });
    });
    clearGuidesClipboard();
    renderGuides();
    markDirty();
    return added;
  }

  function hasGuidesClipboard() {
    if (!guidesClipboard) return false;
    if (Array.isArray(guidesClipboard.items)) return guidesClipboard.items.length > 0;
    return Array.isArray(guidesClipboard) && guidesClipboard.length > 0;
  }

  function clipboardViewportId() {
    if (guidesClipboard && guidesClipboard.viewport) {
      return normalizeViewportId(guidesClipboard.viewport);
    }
    return activeViewportId();
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
    syncGuideLayerGeometry(el.parentElement);
    applyGuideElPosition(
      el,
      ghost.type,
      ghost.type === 'horizontal' ? pct.y : pct.x
    );
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
    var el = (dragGuide.el && dragGuide.el.isConnected)
      ? dragGuide.el
      : guideElById(dragGuide.id);
    dragGuide.el = el;
    if (!pct.inBounds) {
      if (el) el.classList.add('is-removing');
      hideReadout();
      return;
    }
    if (el) el.classList.remove('is-removing');
    var pos = dragGuide.type === 'horizontal' ? pct.y : pct.x;
    g.position = clampPct(pos);
    applyGuideElPosition(el, dragGuide.type, g.position);
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
    var el = dragGuide.el;
    var pointerId = dragGuide.pointerId;
    dragGuide = null;
    if (el) {
      el.classList.remove('is-dragging');
      if (pointerId != null && el.releasePointerCapture) {
        try { el.releasePointerCapture(pointerId); } catch (errRel) { /* ignore */ }
      }
    }
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
    /* Pointer only — mouse+pointer double-firing worsened drag trails. */
    document.addEventListener('pointermove', onDocMove, true);
    document.addEventListener('pointerup', onDocUp, true);
    document.addEventListener('pointercancel', onDocUp, true);
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
    var vp = activeViewportId();
    var vpLabel = viewportLabel(vp);
    var sceneGuides = ensureGuidesArray(activeScene(), vp);
    var canCopy = sceneGuides.length > 0;
    var canPaste = hasGuidesClipboard();
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
          label: guidesVisible ? 'Ocultar guías' : 'Mostrar guías'
        },
        {
          id: 'copy-guides',
          label: 'Copiar guías · ' + vpLabel,
          separatorBefore: true,
          disabled: !canCopy
        },
        {
          id: 'paste-guides',
          label: canPaste
            ? ('Pegar guías · ' + viewportLabel(clipboardViewportId()))
            : 'Pegar guías',
          disabled: !canPaste
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
        if (id === 'copy-guides') {
          copyGuides();
          return;
        }
        if (id === 'paste-guides') {
          openPasteGuidesDialog();
        }
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
    ensureGuideLayer();
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
    copyGuides: copyGuides,
    pasteGuides: openPasteGuidesDialog,
    hasGuidesClipboard: hasGuidesClipboard,
    ensureGuidesArray: ensureGuidesArray,
    ensureGuideBuckets: ensureGuideBuckets,
    VIEWPORTS: VIEWPORTS,
    RULER_THICK: RULER_THICK
  };
})();
