try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/interactive-areas/interactive-areas-canvas.js');}catch(_e){}
/**
 * Interactive Areas canvas — reusable editor + readonly viewer.
 * Options:
 *   mode: 'editor' | 'viewer'
 *   state: lab state from InteractiveAreasCore
 *   onChange / onSelectZone / onSelectArea
 */
var InteractiveAreasCanvas = (function () {
  var Core = typeof InteractiveAreasCore !== 'undefined' ? InteractiveAreasCore : null;

  function create(root, options) {
    options = options || {};
    var mode = options.mode === 'viewer' ? 'viewer' : 'editor';
    var state = options.state || (Core ? Core.createLabState() : { tree: [], selectedAreaId: null, selectedZoneId: null, previewMode: false });
    var onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
    var onSelectZone = typeof options.onSelectZone === 'function' ? options.onSelectZone : function () {};
    var onSelectArea = typeof options.onSelectArea === 'function' ? options.onSelectArea : function () {};

    var drawing = false;
    var draftPoints = [];
    var dragVertex = null; // { zoneId, index }
    var hoverZoneId = null;
    var sheetOpen = false;

    root.classList.add('ia-root');
    root.innerHTML = buildShell(mode);

    var els = {
      tree: root.querySelector('[data-ia-tree]'),
      stage: root.querySelector('[data-ia-stage]'),
      img: root.querySelector('[data-ia-img]'),
      canvas: root.querySelector('[data-ia-canvas]'),
      hint: root.querySelector('[data-ia-hint]'),
      sheet: root.querySelector('[data-ia-sheet]'),
      sheetBody: root.querySelector('[data-ia-sheet-body]'),
      toolbar: root.querySelector('[data-ia-toolbar]'),
      btnNewArea: root.querySelector('[data-ia-new-area]'),
      btnNewZone: root.querySelector('[data-ia-new-zone]'),
      btnPreview: root.querySelector('[data-ia-preview]'),
      title: root.querySelector('[data-ia-area-title]')
    };

    var ctx = els.canvas.getContext('2d');

    function isEditChrome() {
      return mode === 'editor' && !state.previewMode;
    }

    function currentArea() {
      return Core ? Core.findArea(state.tree, state.selectedAreaId) : null;
    }

    function notify() {
      onChange(state);
    }

    function syncToolbar() {
      if (!els.btnPreview) return;
      var preview = !!state.previewMode || mode === 'viewer';
      root.classList.toggle('ia-preview', preview);
      root.classList.toggle('ia-viewer', mode === 'viewer');
      if (els.btnPreview) {
        els.btnPreview.textContent = state.previewMode ? 'Modo edición' : 'Vista previa';
        els.btnPreview.setAttribute('aria-pressed', state.previewMode ? 'true' : 'false');
      }
      if (els.btnNewZone) {
        els.btnNewZone.hidden = !isEditChrome();
        els.btnNewZone.classList.toggle('is-active', drawing);
        els.btnNewZone.textContent = drawing ? 'Dibujando… (doble clic cierra)' : '+ Nueva Zona';
      }
      if (els.btnNewArea) els.btnNewArea.hidden = !isEditChrome();
      if (els.hint) {
        if (drawing) {
          els.hint.textContent = 'Clic para agregar vértices · Doble clic para cerrar el polígono · Esc cancela';
          els.hint.hidden = false;
        } else if (isEditChrome()) {
          els.hint.textContent = 'Selecciona una zona para editar vértices, o usa + Nueva Zona.';
          els.hint.hidden = false;
        } else {
          els.hint.hidden = true;
        }
      }
    }

    function renderTree() {
      if (!els.tree) return;
      var html = '<div class="ia-tree-label">Áreas</div><ul class="ia-tree-list">';
      function walk(nodes, depth) {
        (nodes || []).forEach(function (n) {
          var active = n.id === state.selectedAreaId ? ' is-active' : '';
          html += '<li class="ia-tree-item' + active + '" style="--ia-depth:' + depth + '">';
          html += '<button type="button" class="ia-tree-btn" data-ia-select-area="' + n.id + '">' +
            escapeHtml(n.name) + '</button>';
          if (n.children && n.children.length) {
            html += '<ul class="ia-tree-list">';
            walk(n.children, depth + 1);
            html += '</ul>';
          }
          html += '</li>';
        });
      }
      walk(state.tree, 0);
      html += '</ul>';
      els.tree.innerHTML = html;
    }

    function escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function loadAreaImage() {
      var area = currentArea();
      if (els.title) els.title.textContent = area ? area.name : 'Sin área';
      if (!area || !els.img) return;
      var rawUrl = area.imageUrl || (Core && Core.MOCK_IMAGE_REL) || '';
      var url = Core && Core.resolveAsset ? Core.resolveAsset(rawUrl) : rawUrl;
      if (els.img.getAttribute('src') !== url) {
        els.img.onload = function () {
          resizeCanvas();
          draw();
        };
        els.img.src = url;
      } else {
        resizeCanvas();
        draw();
      }
    }

    function resizeCanvas() {
      var stage = els.stage;
      var img = els.img;
      if (!stage || !img || !img.naturalWidth) return;
      var maxW = stage.clientWidth || 800;
      var maxH = stage.clientHeight || 500;
      var ratio = img.naturalWidth / img.naturalHeight;
      var w = maxW;
      var h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      els.canvas.width = Math.round(w);
      els.canvas.height = Math.round(h);
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      els.canvas.style.width = w + 'px';
      els.canvas.style.height = h + 'px';
    }

    function toPct(clientX, clientY) {
      var rect = els.canvas.getBoundingClientRect();
      var x = ((clientX - rect.left) / rect.width) * 100;
      var y = ((clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      };
    }

    function toPx(p) {
      return {
        x: (p.x / 100) * els.canvas.width,
        y: (p.y / 100) * els.canvas.height
      };
    }

    function drawPolygon(points, opts) {
      opts = opts || {};
      if (!points || points.length < 2) return;
      ctx.beginPath();
      var first = toPx(points[0]);
      ctx.moveTo(first.x, first.y);
      for (var i = 1; i < points.length; i++) {
        var pt = toPx(points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      if (opts.close) ctx.closePath();
      if (opts.fill) {
        ctx.fillStyle = opts.fill;
        ctx.fill();
      }
      if (opts.stroke) {
        ctx.strokeStyle = opts.stroke;
        ctx.lineWidth = opts.lineWidth || 2;
        ctx.stroke();
      }
    }

    function drawVertices(points) {
      (points || []).forEach(function (p) {
        var px = toPx(p);
        ctx.beginPath();
        ctx.arc(px.x, px.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#e11d2e';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    function draw() {
      if (!ctx || !els.canvas.width) return;
      ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
      var area = currentArea();
      if (!area) return;

      (area.zones || []).forEach(function (zone) {
        var selected = zone.id === state.selectedZoneId && isEditChrome();
        var hovered = zone.id === hoverZoneId;
        var fill = 'rgba(0,0,0,0)';
        if (hovered || (sheetOpen && zone.id === state.selectedZoneId)) {
          fill = 'rgba(225, 29, 46, 0.30)';
        }
        drawPolygon(zone.points, {
          close: true,
          fill: fill,
          stroke: selected ? 'rgba(225,29,46,0.95)' : 'rgba(255,255,255,0.35)',
          lineWidth: selected ? 2.5 : 1.5
        });
        if (selected) drawVertices(zone.points);
      });

      if (drawing && draftPoints.length) {
        drawPolygon(draftPoints, {
          close: false,
          stroke: 'rgba(225,29,46,0.9)',
          lineWidth: 2
        });
        drawVertices(draftPoints);
        if (draftPoints.length >= 2) {
          var last = toPx(draftPoints[draftPoints.length - 1]);
          var first = toPx(draftPoints[0]);
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(first.x, first.y);
          ctx.strokeStyle = 'rgba(225,29,46,0.45)';
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    function openSheet(zone) {
      if (!zone || !els.sheet || !els.sheetBody) return;
      state.selectedZoneId = zone.id;
      sheetOpen = true;
      var u = zone.unit || {};
      els.sheetBody.innerHTML =
        '<div class="ia-sheet-head">' +
          '<h3>' + escapeHtml(u.name || zone.label || 'Unidad') + '</h3>' +
          '<button type="button" class="ia-sheet-close" data-ia-sheet-close aria-label="Cerrar">×</button>' +
        '</div>' +
        '<dl class="ia-sheet-meta">' +
          '<div><dt>Unidad</dt><dd>' + escapeHtml(u.name || zone.label || '—') + '</dd></div>' +
          '<div><dt>Área</dt><dd>' + escapeHtml(u.area || '—') + '</dd></div>' +
          '<div><dt>Estado</dt><dd>' + escapeHtml(u.status || '—') + '</dd></div>' +
          '<div><dt>Dormitorios</dt><dd>' + escapeHtml(u.bedrooms || '—') + '</dd></div>' +
          '<div><dt>Baños</dt><dd>' + escapeHtml(u.bathrooms || '—') + '</dd></div>' +
        '</dl>' +
        '<div class="ia-sheet-actions">' +
          '<button type="button" class="ia-sheet-btn" data-ia-mock-action="360">360°</button>' +
          '<button type="button" class="ia-sheet-btn" data-ia-mock-action="galeria">Galería</button>' +
          '<button type="button" class="ia-sheet-btn" data-ia-mock-action="ficha">Ficha</button>' +
          '<button type="button" class="ia-sheet-btn ia-sheet-btn--ghost" data-ia-sheet-close>Cerrar</button>' +
        '</div>' +
        '<p class="ia-sheet-note">Datos simulados · laboratorio Interactivo</p>';
      els.sheet.hidden = false;
      els.sheet.setAttribute('aria-hidden', 'false');
      onSelectZone(zone);
      draw();
    }

    function closeSheet() {
      sheetOpen = false;
      if (els.sheet) {
        els.sheet.hidden = true;
        els.sheet.setAttribute('aria-hidden', 'true');
      }
      if (!isEditChrome()) state.selectedZoneId = null;
      draw();
    }

    function cancelDrawing() {
      drawing = false;
      draftPoints = [];
      syncToolbar();
      draw();
    }

    function finishPolygon() {
      if (draftPoints.length < 3) {
        cancelDrawing();
        return;
      }
      var area = currentArea();
      if (!area) return;
      var zone = Core.addZone(area, draftPoints);
      state.selectedZoneId = zone.id;
      drawing = false;
      draftPoints = [];
      syncToolbar();
      notify();
      draw();
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      var pct = toPct(e.clientX, e.clientY);
      var area = currentArea();
      if (!area) return;

      if (drawing && isEditChrome()) {
        draftPoints.push(pct);
        draw();
        return;
      }

      if (isEditChrome() && state.selectedZoneId) {
        var sel = Core.findZone(area, state.selectedZoneId);
        if (sel) {
          var vi = Core.nearVertex(sel.points, pct.x, pct.y);
          if (vi >= 0) {
            dragVertex = { zoneId: sel.id, index: vi };
            e.preventDefault();
            return;
          }
        }
      }

      var hit = Core.hitTestZone(area, pct.x, pct.y);
      if (hit) {
        if (isEditChrome()) {
          state.selectedZoneId = hit.id;
          openSheet(hit);
        } else {
          openSheet(hit);
        }
        notify();
        draw();
      } else if (isEditChrome()) {
        state.selectedZoneId = null;
        closeSheet();
        notify();
        draw();
      }
    }

    function onPointerMove(e) {
      var pct = toPct(e.clientX, e.clientY);
      var area = currentArea();
      if (!area) return;

      if (dragVertex && isEditChrome()) {
        var z = Core.findZone(area, dragVertex.zoneId);
        if (z && z.points[dragVertex.index]) {
          z.points[dragVertex.index] = pct;
          draw();
          notify();
        }
        els.canvas.style.cursor = 'grabbing';
        return;
      }

      if (drawing) {
        els.canvas.style.cursor = 'crosshair';
        return;
      }

      var hit = Core.hitTestZone(area, pct.x, pct.y);
      var nextHover = hit ? hit.id : null;
      if (nextHover !== hoverZoneId) {
        hoverZoneId = nextHover;
        draw();
      }
      els.canvas.style.cursor = hit ? 'pointer' : (isEditChrome() ? 'default' : 'default');

      if (isEditChrome() && state.selectedZoneId) {
        var sel = Core.findZone(area, state.selectedZoneId);
        if (sel && Core.nearVertex(sel.points, pct.x, pct.y) >= 0) {
          els.canvas.style.cursor = 'grab';
        }
      }
    }

    function onPointerUp() {
      if (dragVertex) {
        dragVertex = null;
        notify();
      }
    }

    function onDblClick(e) {
      if (!drawing || !isEditChrome()) return;
      e.preventDefault();
      // remove accidental last click from second click of dblclick if duplicated
      if (draftPoints.length >= 2) {
        var a = draftPoints[draftPoints.length - 1];
        var b = draftPoints[draftPoints.length - 2];
        if (Math.abs(a.x - b.x) < 0.8 && Math.abs(a.y - b.y) < 0.8) {
          draftPoints.pop();
        }
      }
      finishPolygon();
    }

    function bind() {
      if (els.btnNewArea) {
        els.btnNewArea.addEventListener('click', function () {
          if (!isEditChrome()) return;
          var name = 'Área ' + ((state.tree && state.tree.length) + 1);
          Core.addArea(state, null, name);
          renderTree();
          loadAreaImage();
          syncToolbar();
          notify();
          onSelectArea(currentArea());
        });
      }
      if (els.btnNewZone) {
        els.btnNewZone.addEventListener('click', function () {
          if (!isEditChrome()) return;
          if (drawing) {
            cancelDrawing();
            return;
          }
          drawing = true;
          draftPoints = [];
          state.selectedZoneId = null;
          closeSheet();
          syncToolbar();
          draw();
        });
      }
      if (els.btnPreview) {
        els.btnPreview.addEventListener('click', function () {
          if (mode !== 'editor') return;
          state.previewMode = !state.previewMode;
          if (state.previewMode) {
            cancelDrawing();
            state.selectedZoneId = null;
            closeSheet();
          }
          syncToolbar();
          renderTree();
          draw();
          notify();
        });
      }
      if (els.tree) {
        els.tree.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-ia-select-area]');
          if (!btn) return;
          state.selectedAreaId = btn.getAttribute('data-ia-select-area');
          state.selectedZoneId = null;
          cancelDrawing();
          closeSheet();
          renderTree();
          loadAreaImage();
          syncToolbar();
          notify();
          onSelectArea(currentArea());
        });
      }
      if (els.sheet) {
        els.sheet.addEventListener('click', function (e) {
          if (e.target.closest('[data-ia-sheet-close]')) {
            closeSheet();
            return;
          }
          var mock = e.target.closest('[data-ia-mock-action]');
          if (mock) {
            mock.classList.add('is-flash');
            setTimeout(function () { mock.classList.remove('is-flash'); }, 400);
          }
        });
      }
      els.canvas.addEventListener('pointerdown', onPointerDown);
      els.canvas.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      els.canvas.addEventListener('dblclick', onDblClick);
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          if (drawing) cancelDrawing();
          else closeSheet();
        }
      });
      window.addEventListener('resize', function () {
        resizeCanvas();
        draw();
      });
    }

    function render() {
      renderTree();
      loadAreaImage();
      syncToolbar();
      draw();
    }

    bind();
    render();

    return {
      getState: function () { return state; },
      setState: function (next) {
        state = next;
        render();
      },
      selectArea: function (id) {
        state.selectedAreaId = id;
        render();
      },
      setPreview: function (on) {
        state.previewMode = !!on;
        syncToolbar();
        draw();
      },
      resize: function () {
        resizeCanvas();
        draw();
      },
      destroy: function () {
        root.innerHTML = '';
      }
    };
  }

  function buildShell(mode) {
    var editorOnly = mode === 'editor';
    return '' +
      '<div class="ia-layout">' +
        '<aside class="ia-sidebar">' +
          (editorOnly
            ? '<div class="ia-sidebar-actions">' +
                '<button type="button" class="ia-btn ia-btn--primary" data-ia-new-area>+ Nueva Área</button>' +
              '</div>'
            : '') +
          '<div class="ia-tree" data-ia-tree></div>' +
        '</aside>' +
        '<section class="ia-main">' +
          '<header class="ia-main-head">' +
            '<div>' +
              '<p class="ia-kicker">' + (editorOnly ? 'Interactivo · laboratorio' : 'Áreas') + '</p>' +
              '<h2 class="ia-area-title" data-ia-area-title>Masterplan</h2>' +
            '</div>' +
            '<div class="ia-toolbar" data-ia-toolbar>' +
              (editorOnly
                ? '<button type="button" class="ia-btn" data-ia-new-zone>+ Nueva Zona</button>' +
                  '<button type="button" class="ia-btn ia-btn--accent" data-ia-preview>Vista previa</button>'
                : '') +
            '</div>' +
          '</header>' +
          '<p class="ia-hint" data-ia-hint hidden></p>' +
          '<div class="ia-stage" data-ia-stage>' +
            '<div class="ia-stage-inner">' +
              '<img class="ia-plan-img" data-ia-img alt="Planta" draggable="false" />' +
              '<canvas class="ia-plan-canvas" data-ia-canvas></canvas>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<aside class="ia-sheet" data-ia-sheet hidden aria-hidden="true">' +
          '<div data-ia-sheet-body></div>' +
        '</aside>' +
      '</div>';
  }

  return { create: create };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/interactive-areas/interactive-areas-canvas.js');}catch(_e){}
