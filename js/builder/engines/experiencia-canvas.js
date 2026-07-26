/* BOXIES V5.9.53 — Experiencia flow editor canvas
 * Puertos independientes: cada interacción es un sourcePortId propio. */
var ExperienciaCanvas = (function () {
  var MIN_ZOOM = 0.35;
  var MAX_ZOOM = 1.8;

  function esc(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shellHtml(state) {
    ExperienciaEngine.ensureFlow(state);
    var exp = state.experiencia;
    var active = (exp.nodes || []).filter(function (n) { return !n.orphaned; }).length;
    var canvas = exp.canvas || {};
    var inspectorOpen = canvas.inspectorOpen === true;
    var minimapOn = canvas.minimapVisible !== false;
    var inGroup = !!(canvas.activeGroupId);

    return '' +
      '<div class="builder-step-content builder-step-content--experiencia">' +
        '<div class="builder-exp-chrome">' +
          '<div class="builder-exp-chrome__left">' +
            '<h2 class="builder-step-title">Experiencia</h2>' +
            '<p class="builder-exp-chrome__sub">Editor del flujo del showroom · ' +
              active + ' nodos' +
              (exp.legacySnapshot ? ' · legacy conservado' : '') +
              (inGroup ? ' · dentro de grupo' : '') +
            '</p>' +
          '</div>' +
          '<div class="builder-exp-chrome__actions">' +
            (inGroup
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderExpExitGroupBtn">Salir del grupo</button>'
              : '') +
            (exp.legacySnapshot
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderExpRestoreLegacyBtn">' +
                'Restaurar mapa legacy</button>'
              : '') +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderExpResyncBtn">' +
              'Actualizar desde Hero</button>' +
          '</div>' +
        '</div>' +
        ((exp.reviewFlags || []).length
          ? '<ul class="builder-exp-flags builder-exp-flags--compact">' +
            exp.reviewFlags.slice(0, 2).map(function (f) {
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
            '<div class="builder-exp-ctx" data-exp-ctx hidden></div>' +
            '<div class="builder-exp-picker" data-exp-picker hidden></div>' +
          '</div>' +
          '<aside class="builder-exp-inspector' + (inspectorOpen ? '' : ' is-closed') + '" data-exp-inspector>' +
            '<div class="builder-exp-inspector__head">' +
              '<strong>Propiedades</strong>' +
              '<button type="button" class="builder-exp-inspector__close" data-exp-inspector-close aria-label="Cerrar">×</button>' +
            '</div>' +
            '<div class="builder-exp-inspector__body" data-exp-inspector-body>' +
              '<p class="builder-menu-hint">Selecciona un nodo o una conexión.</p>' +
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
    var size = ExperienciaEngine.nodeSize(n);
    var statusCls = n.orphaned || n.status === 'review' ? 'is-review'
      : (n.status === 'ready' ? 'is-ready'
        : (n.status === 'error' ? 'is-error' : 'is-pending'));
    var accent = n.accent || (ExperienciaEngine.kindMeta(n.kind).accent);
    var isHero = n.kind === 'hero';
    var isAction = n.role === 'action' || n.kind === 'action';
    var portsOut = (n.ports || []).filter(function (p) { return p.side !== 'in'; });
    var portsIn = (n.ports || []).filter(function (p) { return p.side === 'in'; });

    var body = '';
    if (isHero) {
      body =
        '<div class="builder-exp-card__type">HERO</div>' +
        '<div class="builder-exp-card__title">Hero</div>' +
        '<div class="builder-exp-card__info">Pantalla inicial</div>' +
        '<div class="builder-exp-card__section">Interacciones</div>' +
        '<div class="builder-exp-card__ports">' +
          portsOut.map(function (p) {
            return '<div class="builder-exp-card__irow" data-exp-irow="' + esc(p.id) + '">' +
              '<span>' + esc(p.label) + '</span>' +
              '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
                esc(p.id) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(p.label) + '"></span>' +
            '</div>';
          }).join('') +
        '</div>';
    } else if (isAction) {
      body =
        '<div class="builder-exp-card__type">ACCIÓN</div>' +
        '<div class="builder-exp-card__title">' + esc(n.label || 'Acción') + '</div>' +
        '<div class="builder-exp-card__info">' + esc(info || (n.config && n.config.actionType) || '') + '</div>' +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
    } else {
      body =
        '<div class="builder-exp-card__type">' + esc(n.typeLabel || 'NODO') + '</div>' +
        '<div class="builder-exp-card__title">' + esc(n.label || n.id) + '</div>' +
        (info ? '<div class="builder-exp-card__info">' + esc(info) + '</div>' : '') +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
      var showPortRows = portsOut.length > 1 ||
        n.kind === 'video' ||
        n.kind === 'animacion' ||
        (n.config && n.config.hotspots && n.config.hotspots.length);
      if (showPortRows) {
        body += '<div class="builder-exp-card__ports builder-exp-card__ports--compact">' +
          portsOut.filter(function (p) { return p.kind !== 'meta'; }).map(function (p) {
            return '<div class="builder-exp-card__irow">' +
              '<span>' + esc(p.label) + '</span>' +
              '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
                esc(p.id) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(p.label) + '"></span>' +
            '</div>';
          }).join('') +
        '</div>';
      }
    }

    var inPort = portsIn.length
      ? '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>'
      : (isHero ? '' : '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>');

    var flowOuts = portsOut.filter(function (p) { return p.kind !== 'meta'; });
    var defaultOut = (!isHero && flowOuts.length <= 1 &&
      n.kind !== 'video' && n.kind !== 'animacion' &&
      !(n.config && n.config.hotspots && n.config.hotspots.length))
      ? '<span class="builder-exp-card__port is-out" data-exp-port="out" data-port-id="' +
        esc((flowOuts[0] && flowOuts[0].id) || 'out') + '" data-node="' + esc(n.id) +
        '" data-port-label="' + esc((flowOuts[0] && flowOuts[0].label) || 'Salida') + '"></span>'
      : '';

    return '' +
      '<div class="builder-exp-card ' + statusCls + ' accent-' + esc(accent) +
        (isHero ? ' is-hero' : '') +
        (isAction ? ' is-action-node' : '') +
        (n.orphaned ? ' is-orphan' : '') +
        '" data-exp-node="' + esc(n.id) + '"' +
        ' style="width:' + size.w + 'px;min-height:' + size.h + 'px;transform:translate(' +
        (n.x || 0) + 'px,' + (n.y || 0) + 'px)">' +
        inPort +
        defaultOut +
        body +
      '</div>';
  }

  function bezierPath(x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    return 'M ' + x1 + ' ' + y1 +
      ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
  }

  /** Math fallback when DOM port is not measurable yet. */
  function portAnchorFallback(n, portId, side) {
    var size = ExperienciaEngine.nodeSize(n);
    var ports = (n.ports || []).filter(function (p) {
      return side === 'in' ? p.side === 'in' : p.side !== 'in';
    });
    if (side === 'in') {
      return { x: n.x || 0, y: (n.y || 0) + size.h / 2 };
    }
    var flowOuts = ports.filter(function (p) { return p.kind !== 'meta'; });
    if (n.kind === 'hero' || flowOuts.length > 1 || n.kind === 'video' || n.kind === 'animacion') {
      var idx = 0;
      for (var i = 0; i < flowOuts.length; i++) {
        if (flowOuts[i].id === portId) { idx = i; break; }
      }
      /* Header ~62px + section ~18px + row ~22px; circle at row center */
      var top = (n.kind === 'hero' ? 86 : 78) + idx * 22 + 10;
      return {
        x: (n.x || 0) + size.w,
        y: (n.y || 0) + Math.min(top, size.h - 8)
      };
    }
    return { x: (n.x || 0) + size.w, y: (n.y || 0) + size.h / 2 };
  }

  function inspectorHtml(state, nodeId, edgeId) {
    if (edgeId) {
      var ed = ExperienciaEngine.getEdge(state, edgeId);
      if (!ed) return '<p class="builder-menu-hint">Conexión no encontrada.</p>';
      var a = ExperienciaEngine.getNode(state, ed.sourceNodeId || ed.from || ed.sourceId);
      var b = ExperienciaEngine.getNode(state, ed.targetNodeId || ed.to || ed.targetId);
      var srcPortId = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      var srcPortLabel = ed.sourcePortLabel ||
        (ExperienciaEngine.resolvePortLabel
          ? ExperienciaEngine.resolvePortLabel(a, srcPortId)
          : srcPortId);
      var tgtPortId = ed.targetPortId || ed.targetPort || 'in';
      return '' +
        '<div class="builder-exp-inspector__kind">CONEXIÓN</div>' +
        '<h3 class="builder-exp-inspector__title">' +
          esc((a ? a.label : 'Nodo') + ' → ' + (b ? b.label : 'Nodo')) +
        '</h3>' +
        '<div class="builder-exp-inspector__grid">' +
          row('Origen', a ? (a.label || a.id) : (ed.sourceNodeId || ed.from || '—')) +
          row('Interacción', srcPortLabel || srcPortId) +
          row('Puerto origen', srcPortId) +
          row('Destino', b ? (b.label || b.id) : (ed.targetNodeId || ed.to || '—')) +
          row('Puerto destino', tgtPortId) +
          row('Tipo', ed.inlineAction ? 'Acción inline' : 'Navegación') +
        '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-del-edge="' +
            esc(ed.id) + '">Eliminar conexión</button>' +
        '</div>';
    }

    var n = ExperienciaEngine.getNode(state, nodeId);
    if (!n) {
      return '<p class="builder-menu-hint">Selecciona un nodo del mapa o arrastra desde un puerto ●.</p>';
    }
    var conn = ExperienciaEngine.connectionsFor(state, n.id);
    var byId = {};
    (state.experiencia.nodes || []).forEach(function (x) { byId[x.id] = x; });

    function names(list, key) {
      if (!list.length) return '—';
      return list.map(function (ed) {
        var otherId = key === 'from'
          ? (ed.sourceNodeId || ed.from || ed.sourceId)
          : (ed.targetNodeId || ed.to || ed.targetId);
        var other = byId[otherId];
        var port = ed.sourcePortId || ed.sourcePort || ed.portId || '';
        var srcNode = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var portLabel = ed.sourcePortLabel ||
          (srcNode && ExperienciaEngine.resolvePortLabel
            ? ExperienciaEngine.resolvePortLabel(srcNode, port)
            : port);
        if (key === 'to') {
          return (other ? (other.label || other.id) : otherId) +
            (port ? (' ← ' + (portLabel || port)) : '');
        }
        return (other ? (other.label || other.id) : otherId) +
          (port ? ('.' + (portLabel || port)) : '');
      }).join(', ');
    }

    var html = '' +
      '<div class="builder-exp-inspector__kind">' + esc(n.typeLabel || n.kind) + '</div>' +
      '<h3 class="builder-exp-inspector__title">' + esc(n.label || n.id) + '</h3>';

    if (n.kind === 'hero') {
      var ints = (n.config && n.config.interactions) || [];
      html += '<div class="builder-exp-inspector__grid">' +
        row('Estado', ExperienciaEngine.statusLabel(n)) +
        row('Origen', '—') +
        row('Destinos', names(conn.out, 'to')) +
      '</div>' +
      '<div class="builder-exp-inspector__section">Interacciones</div>' +
      '<ul class="builder-exp-inspector__list">' +
        ints.map(function (it) {
          return '<li>' + esc(it.label) + ' <em>(' + esc(it.source || '') + ')</em></li>';
        }).join('') +
      '</ul>';
      return html;
    }

    if (n.kind === 'image' || n.kind === 'plan' || n.kind === 'pano360' || n.kind === 'scene') {
      html += '<div class="builder-exp-inspector__grid">' +
        row('Archivo', (n.config && n.config.fileName) || 'Sin asignar') +
        row('Nombre', n.label || '—') +
        row('Origen', names(conn.in, 'from')) +
        row('Destino', names(conn.out, 'to')) +
      '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-add-hotspot="' +
            esc(n.id) + '">+ Crear hotspot</button>' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" disabled>Asignar archivo</button>' +
          '<p class="builder-menu-hint">Referencia assets de Galería / Planos / 360 (sin inventar media).</p>' +
        '</div>';
      return html;
    }

    if (n.kind === 'video' || n.kind === 'animacion') {
      html += '<div class="builder-exp-inspector__grid">' +
        row('Archivo', (n.config && n.config.fileName) || 'Sin asignar') +
        row('Autoplay', (n.config && n.config.autoplay) ? 'Sí' : 'No') +
        row('Al finalizar', (n.config && n.config.onEnd) || 'next') +
        row('Duración', (n.transitionSeconds || 4) + '–5 s') +
        row('Origen', names(conn.in, 'from')) +
        row('Destino', names(conn.out, 'to')) +
      '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" disabled>Asignar video</button>' +
        '</div>';
      return html;
    }

    if (n.kind === 'action') {
      html += '<div class="builder-exp-inspector__grid">' +
        row('Tipo', (n.config && n.config.actionType) || '—') +
        row('Inline', (n.config && n.config.inline) ? 'Sí (sin cambiar escena)' : 'No') +
        row('Origen', names(conn.in, 'from')) +
      '</div>';
      return html;
    }

    if (n.kind === 'structure' || n.kind === 'group') {
      html += '<div class="builder-exp-inspector__grid">' +
        row('Elemento', n.label || '—') +
        row('Unidades', String(n.unitCount != null ? n.unitCount : '—')) +
        row('Origen', names(conn.in, 'from')) +
      '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-enter-group="' +
            esc(n.id) + '">Entrar al flujo interno</button>' +
          '<p class="builder-menu-hint">Base de jerarquía lista; pisos/plantas se detallan en versiones siguientes.</p>' +
        '</div>';
      return html;
    }

    if (n.kind === 'hotspot') {
      html += '<div class="builder-exp-inspector__grid">' +
        row('Nombre', n.label || '—') +
        row('Vinculado', (n.config && n.config.structureLabel) || '—') +
        row('Destino', names(conn.out, 'to')) +
      '</div>';
      return html;
    }

    html += '<div class="builder-exp-inspector__grid">' +
      row('Estado', ExperienciaEngine.statusLabel(n)) +
      row('Tipo', n.kind || '—') +
      row('Origen', names(conn.in, 'from')) +
      row('Destino', names(conn.out, 'to')) +
    '</div>';
    return html;
  }

  function row(label, value) {
    return '<div class="builder-exp-inspector__row"><span>' + esc(label) +
      '</span><strong>' + esc(value) + '</strong></div>';
  }

  function createMenuHtml() {
    var menu = ExperienciaEngine.CREATE_MENU || [];
    return '<div class="builder-exp-ctx__panel">' +
      '<div class="builder-exp-ctx__title">¿Qué quieres crear?</div>' +
      menu.map(function (cat) {
        return '<div class="builder-exp-ctx__cat">' +
          '<div class="builder-exp-ctx__cat-label">' + esc(cat.label) + '</div>' +
          cat.items.map(function (it) {
            return '<button type="button" class="builder-exp-ctx__item" data-exp-create="' +
              esc(it.id) + '" data-cat="' + esc(cat.id) + '">' + esc(it.label) + '</button>';
          }).join('') +
        '</div>';
      }).join('') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function structurePickerHtml(state) {
    var tree = ExperienciaEngine.listStructureLibrary(state) || [];
    function walk(items, depth) {
      return (items || []).map(function (it) {
        var hasKids = it.children && it.children.length;
        return '<div class="builder-exp-picker__row" style="--d:' + depth + '">' +
          '<button type="button" class="builder-exp-picker__item" data-exp-struct="' + esc(it.id) + '"' +
            ' data-label="' + esc(it.label) + '"' +
            ' data-kind="' + esc(it.kind || '') + '"' +
            ' data-capacity="' + esc(it.capacity != null ? it.capacity : '') + '"' +
            ' data-stage="' + esc(it.stageId || '') + '">' +
            esc(it.label) +
            (it.capacity != null ? (' · ' + it.capacity + ' viv.') : '') +
          '</button>' +
        '</div>' +
        (hasKids ? walk(it.children, depth + 1) : '');
      }).join('');
    }
    return '<div class="builder-exp-picker__panel">' +
      '<div class="builder-exp-ctx__title">Vincular desde Estructura</div>' +
      '<div class="builder-exp-picker__tree">' + walk(tree, 0) + '</div>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-picker-cancel>Cancelar</button>' +
    '</div>';
  }

  function findMenuItem(id) {
    var menu = ExperienciaEngine.CREATE_MENU || [];
    for (var i = 0; i < menu.length; i++) {
      for (var j = 0; j < menu[i].items.length; j++) {
        if (menu[i].items[j].id === id) return menu[i].items[j];
      }
    }
    return null;
  }

  function mount(rootEl, state, api) {
    api = api || {};
    ExperienciaEngine.ensureFlow(state);

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
    var ctxEl = rootEl.querySelector('[data-exp-ctx]');
    var pickerEl = rootEl.querySelector('[data-exp-picker]');
    if (!viewport || !world || !nodesEl || !edgesEl) return null;

    var dragging = null;
    var panning = null;
    var linkDrag = null;
    var spacePan = false;
    var pendingCreate = null;

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

    function clientToWorld(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var c = canvas();
      return {
        x: (clientX - rect.left - c.panX) / c.zoom,
        y: (clientY - rect.top - c.panY) / c.zoom
      };
    }

    /** Exact world anchor from the port circle DOM; fallback to math. */
    function resolvePortAnchor(n, portId, side) {
      var pid = portId || (side === 'in' ? 'in' : 'out');
      if (nodesEl && n && n.id != null) {
        var card = nodesEl.querySelector('[data-exp-node="' + String(n.id).replace(/"/g, '') + '"]');
        if (card) {
          var portEl = card.querySelector(
            '[data-exp-port="' + (side === 'in' ? 'in' : 'out') + '"][data-port-id="' +
            String(pid).replace(/"/g, '') + '"]'
          );
          if (!portEl && side === 'out') {
            portEl = card.querySelector('[data-exp-port="out"]');
          }
          if (!portEl && side === 'in') {
            portEl = card.querySelector('[data-exp-port="in"]');
          }
          if (portEl) {
            var zoom = canvas().zoom || 1;
            var cardRect = card.getBoundingClientRect();
            var portRect = portEl.getBoundingClientRect();
            var ox = (portRect.left + portRect.width / 2 - cardRect.left) / zoom;
            var oy = (portRect.top + portRect.height / 2 - cardRect.top) / zoom;
            return { x: (n.x || 0) + ox, y: (n.y || 0) + oy };
          }
        }
      }
      return portAnchorFallback(n, pid, side);
    }

    function paintNodes() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var sel = canvas().selectedId;
      nodesEl.innerHTML = nodes.map(nodeCardHtml).join('');
      nodesEl.querySelectorAll('[data-exp-node]').forEach(function (el) {
        if (el.getAttribute('data-exp-node') === sel) el.classList.add('is-selected');
      });
      if (linkDrag && linkDrag.portId && linkDrag.fromId) {
        var linkingPort = nodesEl.querySelector(
          '[data-exp-node="' + String(linkDrag.fromId).replace(/"/g, '') + '"] ' +
          '[data-exp-port="out"][data-port-id="' + String(linkDrag.portId).replace(/"/g, '') + '"]'
        );
        if (linkingPort) {
          linkingPort.classList.add('is-linking');
          var row = linkingPort.closest('[data-exp-irow]');
          if (row) row.classList.add('is-linking');
        }
      }
      syncToolUi();
    }

    function paintEdges() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      var all = state.experiencia.nodes || [];
      all.forEach(function (n) { if (!byId[n.id]) byId[n.id] = n; });

      var b = ExperienciaEngine.bounds(nodes);
      var pad = 80;
      var w = Math.max(1400, b.maxX - b.minX + pad * 2);
      var h = Math.max(900, b.maxY - b.minY + pad * 2);
      edgesEl.setAttribute('width', String(w));
      edgesEl.setAttribute('height', String(h));
      edgesEl.style.width = w + 'px';
      edgesEl.style.height = h + 'px';

      var selE = canvas().selectedEdgeId;
      var paths = (state.experiencia.edges || []).map(function (ed) {
        var a = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var b2 = byId[ed.targetNodeId || ed.to || ed.targetId];
        if (!a || !b2 || a.x == null || b2.x == null) return '';
        var srcPort = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
        var tgtPort = ed.targetPortId || ed.targetPort || 'in';
        var pOut = resolvePortAnchor(a, srcPort, 'out');
        var pIn = resolvePortAnchor(b2, tgtPort, 'in');
        var cls = 'builder-exp-edge-path' +
          (ed.manual ? ' is-manual' : '') +
          (ed.inlineAction ? ' is-inline' : '') +
          (selE === ed.id ? ' is-selected' : '');
        return '<path class="' + cls + '" data-exp-edge="' + esc(ed.id) + '"' +
          ' data-source-port="' + esc(srcPort) + '"' +
          ' d="' + bezierPath(pOut.x, pOut.y, pIn.x, pIn.y) + '" fill="none" />';
      }).join('');

      if (linkDrag && linkDrag.fromId) {
        var src = byId[linkDrag.fromId];
        if (src) {
          var a2 = resolvePortAnchor(src, linkDrag.portId || 'out', 'out');
          paths += '<path class="builder-exp-edge-path is-draft" d="' +
            bezierPath(a2.x, a2.y, linkDrag.x, linkDrag.y) + '" fill="none" />';
        }
      }
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
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var spanX = Math.max(1, b.maxX - b.minX);
      var spanY = Math.max(1, b.maxY - b.minY);
      var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
      var ox = (cw - spanX * scale) / 2;
      var oy = (ch - spanY * scale) / 2;
      nodes.forEach(function (n) {
        if (n.x == null) return;
        ctx.fillStyle = n.kind === 'hero'
          ? 'rgba(111,191,134,0.95)'
          : (n.status === 'ready'
            ? 'rgba(111,191,134,0.85)'
            : 'rgba(155,143,212,0.85)');
        var s = ExperienciaEngine.nodeSize(n);
        ctx.fillRect(ox + (n.x - b.minX) * scale, oy + (n.y - b.minY) * scale,
          Math.max(6, s.w * scale * 0.2), Math.max(4, s.h * scale * 0.15));
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
      inspectorBody.innerHTML = inspectorHtml(state, canvas().selectedId, canvas().selectedEdgeId);
      bindInspectorActions();
    }

    function bindInspectorActions() {
      var del = inspectorBody.querySelector('[data-exp-del-edge]');
      if (del) {
        del.addEventListener('click', function () {
          ExperienciaEngine.removeEdge(state, del.getAttribute('data-exp-del-edge'));
          renderAll(); persist();
        });
      }
      var hs = inspectorBody.querySelector('[data-exp-add-hotspot]');
      if (hs) {
        hs.addEventListener('click', function () {
          var id = hs.getAttribute('data-exp-add-hotspot');
          var label = window.prompt('Nombre del hotspot', 'Torre A');
          if (label == null) return;
          ExperienciaEngine.addHotspotToScene(state, id, label.trim() || 'Hotspot');
          renderAll(); persist();
        });
      }
      var eg = inspectorBody.querySelector('[data-exp-enter-group]');
      if (eg) {
        eg.addEventListener('click', function () {
          ExperienciaEngine.enterGroup(state, eg.getAttribute('data-exp-enter-group'));
          renderAll(); persist();
        });
      }
    }

    function renderAll() {
      applyWorldTransform();
      paintNodes();
      paintEdges();
      paintMinimap();
      paintInspector();
      if (inspector) inspector.classList.toggle('is-closed', canvas().inspectorOpen !== true);
      if (workspace) workspace.classList.toggle('has-inspector', canvas().inspectorOpen === true);
      if (minimapWrap) minimapWrap.classList.toggle('is-hidden', canvas().minimapVisible === false);
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
      canvas().selectedEdgeId = null;
      if (id) canvas().inspectorOpen = true;
      renderAll();
      persist();
    }

    function selectEdge(id) {
      canvas().selectedEdgeId = id || null;
      canvas().selectedId = null;
      if (id) canvas().inspectorOpen = true;
      renderAll();
      persist();
    }

    function fitView() {
      var nodes = ExperienciaEngine.visibleNodes(state);
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
      var nodes = ExperienciaEngine.visibleNodes(state);
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

    function hideCtx() {
      if (ctxEl) { ctxEl.hidden = true; ctxEl.innerHTML = ''; }
      pendingCreate = null;
    }

    function hidePicker() {
      if (pickerEl) { pickerEl.hidden = true; pickerEl.innerHTML = ''; }
    }

    function openCreateMenu(worldPt, fromMeta) {
      pendingCreate = {
        at: worldPt,
        fromId: fromMeta && fromMeta.fromId,
        portId: fromMeta && (fromMeta.portId || fromMeta.sourcePortId),
        portLabel: fromMeta && fromMeta.portLabel,
        sourcePortId: fromMeta && (fromMeta.sourcePortId || fromMeta.portId),
        targetPortId: (fromMeta && fromMeta.targetPortId) || 'in'
      };
      if (!ctxEl) return;
      ctxEl.innerHTML = createMenuHtml();
      ctxEl.hidden = false;
      var rect = viewport.getBoundingClientRect();
      var c = canvas();
      var left = worldPt.x * c.zoom + c.panX;
      var top = worldPt.y * c.zoom + c.panY;
      left = Math.max(8, Math.min(left, rect.width - 280));
      top = Math.max(8, Math.min(top, rect.height - 320));
      ctxEl.style.left = left + 'px';
      ctxEl.style.top = top + 'px';
    }

    function openStructurePicker() {
      if (!pickerEl || !pendingCreate) return;
      pickerEl.innerHTML = structurePickerHtml(state);
      pickerEl.hidden = false;
      pickerEl.style.left = ctxEl.style.left;
      pickerEl.style.top = ctxEl.style.top;
      hideCtx();
      pickerEl.querySelectorAll('[data-exp-struct]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = {
            id: btn.getAttribute('data-exp-struct'),
            label: btn.getAttribute('data-label'),
            kind: btn.getAttribute('data-kind'),
            capacity: btn.getAttribute('data-capacity')
              ? Number(btn.getAttribute('data-capacity'))
              : null,
            stageId: btn.getAttribute('data-stage') || null
          };
          var n = ExperienciaEngine.createStructureLinkedNode(state, item, pendingCreate.at, {
            fromId: pendingCreate.fromId,
            portId: pendingCreate.portId || pendingCreate.sourcePortId,
            portLabel: pendingCreate.portLabel,
            sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
            targetPortId: pendingCreate.targetPortId || 'in'
          });
          hidePicker();
          pendingCreate = null;
          selectNode(n.id);
          persist();
        });
      });
      var cancel = pickerEl.querySelector('[data-exp-picker-cancel]');
      if (cancel) cancel.addEventListener('click', function () { hidePicker(); pendingCreate = null; });
    }

    if (ctxEl) {
      ctxEl.addEventListener('click', function (ev) {
        var cancel = ev.target.closest('[data-exp-ctx-cancel]');
        if (cancel) { hideCtx(); return; }
        var item = ev.target.closest('[data-exp-create]');
        if (!item || !pendingCreate) return;
        var menuItem = findMenuItem(item.getAttribute('data-exp-create'));
        if (!menuItem) return;
        var result = ExperienciaEngine.createNodeFromMenu(state, menuItem, pendingCreate.at, {
          fromId: pendingCreate.fromId,
          portId: pendingCreate.portId || pendingCreate.sourcePortId,
          portLabel: pendingCreate.portLabel,
          sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
          targetPortId: pendingCreate.targetPortId || 'in'
        });
        if (result && result.needsPicker === '_link_structure') {
          openStructurePicker();
          return;
        }
        if (result && result.needsPicker === '_link_existing') {
          hideCtx();
          AdminNotify.info('Selecciona un nodo existente en el canvas y conéctalo arrastrando.');
          canvas().tool = 'connect';
          pendingCreate = null;
          syncToolUi();
          return;
        }
        hideCtx();
        if (result && result.node) selectNode(result.node.id);
        else { renderAll(); persist(); }
      });
    }

    /* Toolbar */
    rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tool = btn.getAttribute('data-exp-tool');
        if (tool === 'select' || tool === 'connect') {
          canvas().tool = tool;
          linkDrag = null;
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
        canvas().selectedEdgeId = null;
        renderAll(); persist();
      });
    }

    var exitGroup = rootEl.querySelector('#builderExpExitGroupBtn');
    if (exitGroup) {
      exitGroup.addEventListener('click', function () {
        ExperienciaEngine.exitGroup(state);
        renderAll(); persist();
      });
    }

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

    viewport.addEventListener('pointerdown', function (ev) {
      hideCtx();
      hidePicker();
      var edgePath = ev.target.closest('[data-exp-edge]');
      if (edgePath) {
        selectEdge(edgePath.getAttribute('data-exp-edge'));
        return;
      }

      var port = ev.target.closest('[data-exp-port="out"]');
      if (!port) {
        var irow = ev.target.closest('[data-exp-irow]');
        if (irow) {
          port = irow.querySelector('[data-exp-port="out"]');
        }
      }
      var card = ev.target.closest('[data-exp-node]');
      var tool = canvas().tool || 'select';

      if (port) {
        ev.preventDefault();
        ev.stopPropagation();
        var fromId = port.getAttribute('data-node');
        var portId = port.getAttribute('data-port-id') || 'out';
        var portLabel = port.getAttribute('data-port-label') || '';
        var srcNode = ExperienciaEngine.getNode(state, fromId);
        if (!portLabel && srcNode && ExperienciaEngine.resolvePortLabel) {
          portLabel = ExperienciaEngine.resolvePortLabel(srcNode, portId);
        }
        var startAnchor = resolvePortAnchor(srcNode || { id: fromId, x: 0, y: 0, ports: [] }, portId, 'out');
        linkDrag = {
          fromId: fromId,
          portId: portId,
          portLabel: portLabel,
          x: startAnchor.x,
          y: startAnchor.y,
          pointerId: ev.pointerId
        };
        /* No seleccionar el nodo completo: la conexión es del puerto */
        canvas().selectedId = null;
        canvas().selectedEdgeId = null;
        paintNodes();
        paintInspector();
        try { viewport.setPointerCapture(ev.pointerId); } catch (e0) {}
        paintEdges();
        return;
      }

      if (card && tool === 'select') {
        var nodeId = card.getAttribute('data-exp-node');
        selectNode(nodeId);
        var n = ExperienciaEngine.getNode(state, nodeId);
        if (!n) return;
        if (ev.detail === 2 && (n.kind === 'structure' || n.kind === 'group' || (n.config && n.config.group))) {
          ExperienciaEngine.enterGroup(state, n.id);
          renderAll(); persist();
          return;
        }
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
          canvas().selectedId = null;
          canvas().selectedEdgeId = null;
          paintInspector();
          paintNodes();
          paintEdges();
        }
      }
    });

    viewport.addEventListener('pointermove', function (ev) {
      if (linkDrag) {
        var w = clientToWorld(ev.clientX, ev.clientY);
        linkDrag.x = w.x;
        linkDrag.y = w.y;
        paintEdges();
        return;
      }
      if (dragging) {
        var wpt = clientToWorld(ev.clientX, ev.clientY);
        ExperienciaEngine.setNodePosition(state, dragging.id, wpt.x - dragging.ox, wpt.y - dragging.oy, true);
        var el = nodesEl.querySelector('[data-exp-node="' + dragging.id + '"]');
        var n = ExperienciaEngine.getNode(state, dragging.id);
        if (el && n) el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
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

    function endPointer(ev) {
      if (linkDrag) {
        var targetPort = document.elementFromPoint(ev.clientX, ev.clientY);
        var inPort = targetPort && targetPort.closest ? targetPort.closest('[data-exp-port="in"]') : null;
        var targetCard = targetPort && targetPort.closest ? targetPort.closest('[data-exp-node]') : null;
        if (inPort || targetCard) {
          var toId = (inPort && inPort.getAttribute('data-node')) ||
            (targetCard && targetCard.getAttribute('data-exp-node'));
          var targetPortId = (inPort && inPort.getAttribute('data-port-id')) || 'in';
          if (toId && toId !== linkDrag.fromId) {
            ExperienciaEngine.addManualEdge(
              state,
              linkDrag.fromId,
              toId,
              linkDrag.portLabel || 'flujo',
              linkDrag.portId,
              targetPortId
            );
            linkDrag = null;
            renderAll(); persist();
            return;
          }
        }
        /* dropped on empty → create menu (bound to this exact port) */
        var drop = clientToWorld(ev.clientX, ev.clientY);
        openCreateMenu(drop, {
          fromId: linkDrag.fromId,
          portId: linkDrag.portId,
          portLabel: linkDrag.portLabel,
          sourcePortId: linkDrag.portId,
          targetPortId: 'in'
        });
        linkDrag = null;
        paintNodes();
        paintEdges();
        return;
      }
      if (dragging) { dragging = null; persist(); }
      if (panning) { panning = null; persist(); }
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    window.addEventListener('keydown', function (ev) {
      if (ev.code === 'Space') spacePan = true;
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && canvas().selectedEdgeId) {
        var tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        ExperienciaEngine.removeEdge(state, canvas().selectedEdgeId);
        renderAll(); persist();
      }
    });
    window.addEventListener('keyup', function (ev) {
      if (ev.code === 'Space') spacePan = false;
    });

    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', function (ev) {
        var nodes = ExperienciaEngine.visibleNodes(state);
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
        renderAll(); persist();
      });
    }

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
    requestAnimationFrame(function () {
      if (canvas().panX === 40 && canvas().panY === 40) fitView();
      else onViewportResize();
    });

    return { refresh: renderAll, fitView: fitView };
  }

  return {
    shellHtml: shellHtml,
    mount: mount
  };
})();
