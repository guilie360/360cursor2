/* BOXIES V5.9.50 — Experiencia infinite canvas / node editor (no external deps) */
var ExperienciaCanvas = (function () {
  var W = 200;
  var H = 92;
  var MIN_ZOOM = 0.35;
  var MAX_ZOOM = 1.8;

  function esc(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shellHtml(state) {
    ExperienciaEngine.ensureState(state);
    var exp = state.experiencia;
    var applied = !!(state.estructura && state.estructura.appliedAt) ||
      !!(state.architecture && state.architecture.appliedAt);
    var active = (exp.nodes || []).filter(function (n) { return !n.orphaned; }).length;
    var canvas = exp.canvas || {};
    /* Closed by default — opens on node select (V5.9.51) */
    var inspectorOpen = canvas.inspectorOpen === true;
    var minimapOn = canvas.minimapVisible !== false;

    return '' +
      '<div class="builder-step-content builder-step-content--experiencia">' +
        '<div class="builder-exp-chrome">' +
          '<div class="builder-exp-chrome__left">' +
            '<h2 class="builder-step-title">Experiencia</h2>' +
            '<p class="builder-exp-chrome__sub">Mapa del recorrido del showroom · ' +
              (applied ? (active + ' nodos') : 'pendiente estructura') + '</p>' +
          '</div>' +
          '<div class="builder-exp-chrome__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderExpResyncBtn">' +
              'Sincronizar desde estructura</button>' +
          '</div>' +
        '</div>' +
        ((exp.reviewFlags || []).length
          ? '<ul class="builder-exp-flags builder-exp-flags--compact">' +
            exp.reviewFlags.slice(0, 3).map(function (f) {
              return '<li class="builder-exp-flag is-' + esc(f.severity || 'recomendado') + '">' +
                esc(f.message || '') + '</li>';
            }).join('') +
            '</ul>'
          : '') +
        '<div class="builder-exp-workspace' + (inspectorOpen ? ' has-inspector' : '') + '" data-exp-workspace>' +
          '<div class="builder-exp-stage" data-exp-stage>' +
            '<div class="builder-exp-toolbar" data-exp-toolbar role="toolbar" aria-label="Herramientas del canvas">' +
              toolBtn('select', 'Seleccionar', 'layout-grid') +
              toolBtn('connect', 'Conectar', 'pen-tool') +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('center', 'Centrar', 'home', true) +
              toolBtn('fit', 'Fit view', 'maximize', true) +
              toolBtn('zoom-out', 'Zoom −', 'minimize', true) +
              toolBtn('zoom-in', 'Zoom +', 'maximize', true) +
              toolBtn('relayout', 'Auto ordenar', 'layers', true) +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('minimap', minimapOn ? 'Ocultar minimapa' : 'Mostrar minimapa', 'eye', true) +
            '</div>' +
            '<div class="builder-exp-viewport" data-exp-viewport tabindex="0">' +
              '<div class="builder-exp-world" data-exp-world>' +
                '<svg class="builder-exp-edges" data-exp-edges xmlns="http://www.w3.org/2000/svg"></svg>' +
                '<div class="builder-exp-nodes" data-exp-nodes></div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-minimap' + (minimapOn ? '' : ' is-hidden') + '" data-exp-minimap>' +
              '<canvas data-exp-minimap-canvas width="160" height="100"></canvas>' +
              '<button type="button" class="builder-exp-minimap__hide" data-exp-minimap-hide aria-label="Ocultar minimapa">×</button>' +
            '</div>' +
          '</div>' +
          '<aside class="builder-exp-inspector' + (inspectorOpen ? '' : ' is-closed') + '" data-exp-inspector>' +
            '<div class="builder-exp-inspector__head">' +
              '<strong>Propiedades</strong>' +
              '<button type="button" class="builder-exp-inspector__close" data-exp-inspector-close aria-label="Cerrar">×</button>' +
            '</div>' +
            '<div class="builder-exp-inspector__body" data-exp-inspector-body>' +
              '<p class="builder-menu-hint">Selecciona un nodo del mapa.</p>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>';
  }

  function toolBtn(tool, label, icon, action) {
    var iconHtml = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
      ? BuilderIcons.render(icon)
      : '';
    return '<button type="button" class="builder-exp-tool' + (action ? ' is-action' : '') +
      '" data-exp-tool="' + esc(tool) + '" data-tooltip="' + esc(label) + '" aria-label="' + esc(label) + '">' +
      iconHtml + '</button>';
  }

  function nodeCardHtml(n) {
    var status = ExperienciaEngine.statusLabel(n);
    var info = ExperienciaEngine.infoLine(n);
    var statusCls = n.orphaned || n.status === 'review' ? 'is-review'
      : (n.status === 'ready' ? 'is-ready'
        : (n.status === 'error' ? 'is-error' : 'is-pending'));
    var accent = n.accent || (ExperienciaEngine.kindMeta(n.kind).accent);
    return '' +
      '<div class="builder-exp-card ' + statusCls + ' accent-' + esc(accent) +
        (n.orphaned ? ' is-orphan' : '') + '" data-exp-node="' + esc(n.id) + '"' +
        ' style="transform:translate(' + (n.x || 0) + 'px,' + (n.y || 0) + 'px)">' +
        '<span class="builder-exp-card__port is-in" data-exp-port="in" data-node="' + esc(n.id) + '"></span>' +
        '<span class="builder-exp-card__port is-out" data-exp-port="out" data-node="' + esc(n.id) + '"></span>' +
        '<div class="builder-exp-card__type">' + esc(n.typeLabel || 'NODO') + '</div>' +
        '<div class="builder-exp-card__title">' + esc(n.label || n.id) + '</div>' +
        (info ? '<div class="builder-exp-card__info">' + esc(info) + '</div>' : '') +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>' +
      '</div>';
  }

  function bezierPath(x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    return 'M ' + x1 + ' ' + y1 +
      ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
  }

  function inspectorHtml(state, nodeId) {
    var n = ExperienciaEngine.getNode(state, nodeId);
    if (!n) {
      return '<p class="builder-menu-hint">Selecciona un nodo del mapa.</p>';
    }
    var conn = ExperienciaEngine.connectionsFor(state, n.id);
    var byId = {};
    (state.experiencia.nodes || []).forEach(function (x) { byId[x.id] = x; });

    function names(list, key) {
      if (!list.length) return '—';
      return list.map(function (ed) {
        var other = byId[ed[key]];
        return other ? (other.label || other.id) : ed[key];
      }).join(', ');
    }

    var mediaLine = n.transitionMedia || n.contentRef
      ? 'Asignado'
      : 'Sin asignar';

    var actions = '';
    if (n.kind === 'animacion' || n.kind === 'transicion' || n.kind === 'hero') {
      actions =
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-assign="video" disabled>' +
          'Asignar video</button>' +
        '<p class="builder-menu-hint">Referencia assets de Galería / Hero (próximo paso).</p>';
    } else if (n.kind === 'planta-3d') {
      actions =
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-assign="plan" disabled>' +
          'Asignar plano</button> ' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-assign="hotspots" disabled>' +
          'Editar hotspots</button>' +
        '<p class="builder-menu-hint">Hotspots: 0 / ' + esc(String(n.unitCount || (n.meta && n.meta.capacity) || 0)) + '</p>';
    } else if (n.kind === 'viviendas') {
      actions =
        '<p class="builder-menu-hint">Nodo agrupador · ' +
          esc(String(n.unitCount || 0)) +
          ' unidades. No se expanden 1:1 en el canvas.</p>';
    } else if (n.kind === 'ficha') {
      actions =
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-assign="docs" disabled>' +
          'Asignar ficha</button>';
    }

    return '' +
      '<div class="builder-exp-inspector__kind">' + esc(n.typeLabel || n.kind) + '</div>' +
      '<h3 class="builder-exp-inspector__title">' + esc(n.label || n.id) + '</h3>' +
      '<div class="builder-exp-inspector__grid">' +
        row('Estado', ExperienciaEngine.statusLabel(n)) +
        row('Tipo', n.kind || '—') +
        row('Entidad', (n.entityType || '—') + (n.entityKey ? (':' + n.entityKey) : '')) +
        row('Origen', names(conn.in, 'from')) +
        row('Destino', names(conn.out, 'to')) +
        ((n.kind === 'animacion' || n.kind === 'transicion')
          ? row('Duración', (n.transitionSeconds || 4) + '–5 segundos')
          : '') +
        ((n.unitCount != null) ? row('Unidades', String(n.unitCount)) : '') +
        row('Contenido', mediaLine) +
      '</div>' +
      (n.orphaned ? '<div class="builder-warn-banner">Huérfano · conservado para revisión</div>' : '') +
      '<div class="builder-exp-inspector__actions">' + actions + '</div>';
  }

  function row(label, value) {
    return '<div class="builder-exp-inspector__row"><span>' + esc(label) +
      '</span><strong>' + esc(value) + '</strong></div>';
  }

  function mount(rootEl, state, api) {
    api = api || {};
    var stage = rootEl.querySelector('[data-exp-stage]');
    var viewport = rootEl.querySelector('[data-exp-viewport]');
    var world = rootEl.querySelector('[data-exp-world]');
    var nodesEl = rootEl.querySelector('[data-exp-nodes]');
    var edgesEl = rootEl.querySelector('[data-exp-edges]');
    var inspectorBody = rootEl.querySelector('[data-exp-inspector-body]');
    var inspector = rootEl.querySelector('[data-exp-inspector]');
    var workspace = rootEl.querySelector('[data-exp-workspace]');
    var minimapWrap = rootEl.querySelector('[data-exp-minimap]');
    var minimapCanvas = rootEl.querySelector('[data-exp-minimap-canvas]');
    if (!viewport || !world || !nodesEl || !edgesEl) return null;

    var exp = ExperienciaEngine.ensureState(state);
    if (!(exp.nodes || []).length) {
      /* empty canvas ok */
    } else {
      var needsLayout = exp.nodes.some(function (n) { return n.x == null || n.y == null; });
      if (needsLayout) {
        ExperienciaEngine.autoLayout(exp.nodes, exp.edges, { onlyMissing: true });
      }
    }

    var NW = ExperienciaEngine.NODE_W || W;
    var NH = ExperienciaEngine.NODE_H || H;
    var dragging = null;
    var panning = null;
    var connectFrom = null;
    var spacePan = false;

    function canvas() {
      return ExperienciaEngine.ensureState(state).canvas;
    }

    function persist() {
      if (api.onChange) api.onChange();
      else if (api.saveState) api.saveState();
    }

    function applyWorldTransform() {
      var c = canvas();
      world.style.transform =
        'translate(' + c.panX + 'px,' + c.panY + 'px) scale(' + c.zoom + ')';
      world.style.transformOrigin = '0 0';
    }

    function paintNodes() {
      var nodes = state.experiencia.nodes || [];
      var sel = canvas().selectedId;
      nodesEl.innerHTML = nodes.map(nodeCardHtml).join('');
      nodesEl.querySelectorAll('[data-exp-node]').forEach(function (el) {
        if (el.getAttribute('data-exp-node') === sel) el.classList.add('is-selected');
      });
      syncToolUi();
    }

    function paintEdges() {
      var nodes = state.experiencia.nodes || [];
      var byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      var b = ExperienciaEngine.bounds(nodes);
      var pad = 80;
      var w = Math.max(1200, b.maxX - b.minX + pad * 2);
      var h = Math.max(800, b.maxY - b.minY + pad * 2);
      edgesEl.setAttribute('width', String(w));
      edgesEl.setAttribute('height', String(h));
      edgesEl.style.width = w + 'px';
      edgesEl.style.height = h + 'px';

      var paths = (state.experiencia.edges || []).map(function (ed) {
        var a = byId[ed.from || ed.sourceId];
        var b2 = byId[ed.to || ed.targetId];
        if (!a || !b2 || a.x == null || b2.x == null) return '';
        var x1 = a.x + NW;
        var y1 = a.y + NH / 2;
        var x2 = b2.x;
        var y2 = b2.y + NH / 2;
        return '<path class="builder-exp-edge-path' + (ed.manual ? ' is-manual' : '') +
          '" d="' + bezierPath(x1, y1, x2, y2) + '" fill="none" />';
      }).join('');
      edgesEl.innerHTML = paths;
    }

    function paintMinimap() {
      if (!minimapCanvas || !canvas().minimapVisible) return;
      var ctx = minimapCanvas.getContext('2d');
      if (!ctx) return;
      var cw = minimapCanvas.width;
      var ch = minimapCanvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, cw, ch);
      var nodes = state.experiencia.nodes || [];
      var b = ExperienciaEngine.bounds(nodes);
      var spanX = Math.max(1, b.maxX - b.minX);
      var spanY = Math.max(1, b.maxY - b.minY);
      var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
      var ox = (cw - spanX * scale) / 2;
      var oy = (ch - spanY * scale) / 2;
      nodes.forEach(function (n) {
        if (n.x == null) return;
        ctx.fillStyle = n.status === 'ready'
          ? 'rgba(111,191,134,0.85)'
          : (n.orphaned ? 'rgba(220,120,120,0.7)' : 'rgba(155,143,212,0.85)');
        ctx.fillRect(ox + (n.x - b.minX) * scale, oy + (n.y - b.minY) * scale, 8, 5);
      });
      var c = canvas();
      var vr = viewport.getBoundingClientRect();
      var vx = (-c.panX / c.zoom - b.minX) * scale + ox;
      var vy = (-c.panY / c.zoom - b.minY) * scale + oy;
      var vw = (vr.width / c.zoom) * scale;
      var vh = (vr.height / c.zoom) * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw, vh);
    }

    function paintInspector() {
      if (!inspectorBody) return;
      inspectorBody.innerHTML = inspectorHtml(state, canvas().selectedId);
    }

    function renderAll() {
      applyWorldTransform();
      paintNodes();
      paintEdges();
      paintMinimap();
      paintInspector();
      if (inspector) {
        inspector.classList.toggle('is-closed', canvas().inspectorOpen !== true);
      }
      if (workspace) {
        workspace.classList.toggle('has-inspector', canvas().inspectorOpen === true);
      }
      if (minimapWrap) {
        minimapWrap.classList.toggle('is-hidden', canvas().minimapVisible === false);
      }
    }

    function syncToolUi() {
      var tool = canvas().tool || 'select';
      rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
        var t = btn.getAttribute('data-exp-tool');
        var isMode = t === 'select' || t === 'connect';
        btn.classList.toggle('is-active', isMode && t === tool);
      });
      viewport.classList.toggle('is-connect', tool === 'connect');
    }

    function selectNode(id) {
      canvas().selectedId = id || null;
      if (id) canvas().inspectorOpen = true;
      renderAll();
      persist();
    }

    function fitView() {
      var nodes = state.experiencia.nodes || [];
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var spanX = Math.max(1, b.maxX - b.minX + 80);
      var spanY = Math.max(1, b.maxY - b.minY + 80);
      var zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(vr.width / spanX, vr.height / spanY) * 0.9));
      canvas().zoom = zoom;
      canvas().panX = (vr.width - spanX * zoom) / 2 - b.minX * zoom + 20;
      canvas().panY = (vr.height - spanY * zoom) / 2 - b.minY * zoom + 20;
      renderAll();
      persist();
    }

    function centerView() {
      var nodes = state.experiencia.nodes || [];
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var cx = (b.minX + b.maxX) / 2;
      var cy = (b.minY + b.maxY) / 2;
      var z = canvas().zoom || 1;
      canvas().panX = vr.width / 2 - cx * z;
      canvas().panY = vr.height / 2 - cy * z;
      renderAll();
      persist();
    }

    function clientToWorld(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var c = canvas();
      return {
        x: (clientX - rect.left - c.panX) / c.zoom,
        y: (clientY - rect.top - c.panY) / c.zoom
      };
    }

    /* Toolbar */
    rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tool = btn.getAttribute('data-exp-tool');
        if (tool === 'select' || tool === 'connect') {
          canvas().tool = tool;
          connectFrom = null;
          syncToolUi();
          persist();
          return;
        }
        if (tool === 'center') { centerView(); return; }
        if (tool === 'fit') { fitView(); return; }
        if (tool === 'zoom-in') {
          canvas().zoom = Math.min(MAX_ZOOM, (canvas().zoom || 1) * 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'zoom-out') {
          canvas().zoom = Math.max(MIN_ZOOM, (canvas().zoom || 1) / 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'relayout') {
          ExperienciaEngine.forceRelayout(state);
          fitView();
          if (api.onChange) api.onChange();
          return;
        }
        if (tool === 'minimap') {
          canvas().minimapVisible = !canvas().minimapVisible;
          renderAll(); persist();
        }
      });
    });

    var hideMini = rootEl.querySelector('[data-exp-minimap-hide]');
    if (hideMini) {
      hideMini.addEventListener('click', function () {
        canvas().minimapVisible = false;
        renderAll(); persist();
      });
    }

    var closeInsp = rootEl.querySelector('[data-exp-inspector-close]');
    if (closeInsp) {
      closeInsp.addEventListener('click', function () {
        canvas().inspectorOpen = false;
        canvas().selectedId = null;
        renderAll();
        persist();
        requestAnimationFrame(function () {
          applyWorldTransform();
          paintMinimap();
        });
      });
    }

    /* Wheel zoom */
    viewport.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var factor = ev.deltaY > 0 ? 0.92 : 1.08;
      var before = clientToWorld(ev.clientX, ev.clientY);
      var next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (canvas().zoom || 1) * factor));
      canvas().zoom = next;
      var rect = viewport.getBoundingClientRect();
      canvas().panX = ev.clientX - rect.left - before.x * next;
      canvas().panY = ev.clientY - rect.top - before.y * next;
      applyWorldTransform();
      paintMinimap();
    }, { passive: false });

    /* Pointer interactions */
    viewport.addEventListener('pointerdown', function (ev) {
      var port = ev.target.closest('[data-exp-port]');
      var card = ev.target.closest('[data-exp-node]');
      var tool = canvas().tool || 'select';

      if (port && tool === 'connect') {
        var nid = port.getAttribute('data-node');
        var side = port.getAttribute('data-exp-port');
        if (side === 'out') {
          connectFrom = nid;
          selectNode(nid);
        } else if (side === 'in' && connectFrom && connectFrom !== nid) {
          ExperienciaEngine.addManualEdge(state, connectFrom, nid, 'manual');
          connectFrom = null;
          renderAll();
          persist();
        }
        return;
      }

      if (card && tool === 'connect') {
        var id = card.getAttribute('data-exp-node');
        if (!connectFrom) {
          connectFrom = id;
          selectNode(id);
        } else if (connectFrom !== id) {
          ExperienciaEngine.addManualEdge(state, connectFrom, id, 'manual');
          connectFrom = null;
          renderAll();
          persist();
        }
        return;
      }

      if (card && tool === 'select') {
        var nodeId = card.getAttribute('data-exp-node');
        selectNode(nodeId);
        var n = ExperienciaEngine.getNode(state, nodeId);
        if (!n) return;
        var worldPt = clientToWorld(ev.clientX, ev.clientY);
        dragging = {
          id: nodeId,
          ox: worldPt.x - (n.x || 0),
          oy: worldPt.y - (n.y || 0),
          pointerId: ev.pointerId
        };
        try { viewport.setPointerCapture(ev.pointerId); } catch (e1) {}
        return;
      }

      /* empty space → pan */
      if (!card) {
        if (tool === 'select' || spacePan || ev.button === 1) {
          panning = {
            x: ev.clientX,
            y: ev.clientY,
            panX: canvas().panX,
            panY: canvas().panY,
            pointerId: ev.pointerId
          };
          try { viewport.setPointerCapture(ev.pointerId); } catch (e2) {}
          if (tool === 'select') {
            canvas().selectedId = null;
            paintInspector();
            paintNodes();
          }
        }
      }
    });

    viewport.addEventListener('pointermove', function (ev) {
      if (dragging) {
        var wpt = clientToWorld(ev.clientX, ev.clientY);
        ExperienciaEngine.setNodePosition(
          state,
          dragging.id,
          wpt.x - dragging.ox,
          wpt.y - dragging.oy,
          true
        );
        var el = nodesEl.querySelector('[data-exp-node="' + dragging.id + '"]');
        var n = ExperienciaEngine.getNode(state, dragging.id);
        if (el && n) {
          el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
        }
        paintEdges();
        paintMinimap();
        return;
      }
      if (panning) {
        canvas().panX = panning.panX + (ev.clientX - panning.x);
        canvas().panY = panning.panY + (ev.clientY - panning.y);
        applyWorldTransform();
        paintMinimap();
      }
    });

    function endPointer() {
      if (dragging) {
        dragging = null;
        persist();
      }
      if (panning) {
        panning = null;
        persist();
      }
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    window.addEventListener('keydown', function (ev) {
      if (ev.code === 'Space') spacePan = true;
    });
    window.addEventListener('keyup', function (ev) {
      if (ev.code === 'Space') spacePan = false;
    });

    /* Minimap click → jump */
    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', function (ev) {
        var nodes = state.experiencia.nodes || [];
        var b = ExperienciaEngine.bounds(nodes);
        var rect = minimapCanvas.getBoundingClientRect();
        var cw = minimapCanvas.width;
        var ch = minimapCanvas.height;
        var spanX = Math.max(1, b.maxX - b.minX);
        var spanY = Math.max(1, b.maxY - b.minY);
        var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
        var ox = (cw - spanX * scale) / 2;
        var oy = (ch - spanY * scale) / 2;
        var mx = ((ev.clientX - rect.left) * (cw / rect.width) - ox) / scale + b.minX;
        var my = ((ev.clientY - rect.top) * (ch / rect.height) - oy) / scale + b.minY;
        var vr = viewport.getBoundingClientRect();
        var z = canvas().zoom || 1;
        canvas().panX = vr.width / 2 - mx * z;
        canvas().panY = vr.height / 2 - my * z;
        renderAll();
        persist();
      });
    }

    /* Recalc viewport on layout changes (rail / inspector / window / fullscreen) */
    var resizeTimer = null;
    function onViewportResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        applyWorldTransform();
        paintMinimap();
      }, 40);
    }
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(onViewportResize);
      ro.observe(viewport);
      if (stage) ro.observe(stage);
      if (workspace) ro.observe(workspace);
    }
    window.addEventListener('resize', onViewportResize);
    document.addEventListener('fullscreenchange', onViewportResize);
    window.addEventListener('boxies:rail-toggle', onViewportResize);

    renderAll();
    if ((state.experiencia.nodes || []).length) {
      requestAnimationFrame(function () {
        if (canvas().panX === 40 && canvas().panY === 40) fitView();
        else onViewportResize();
      });
    } else {
      requestAnimationFrame(onViewportResize);
    }

    return {
      refresh: renderAll,
      fitView: fitView
    };
  }

  return {
    shellHtml: shellHtml,
    mount: mount
  };
})();
