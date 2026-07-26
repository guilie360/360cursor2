/* BOXIES V5.9.50 — Experiencia: graph model + layout (canvas-ready) */
var ExperienciaEngine = (function () {
  var NODE_W = 200;
  var NODE_H = 92;
  var GAP_X = 72;
  var GAP_Y = 28;

  var KIND_META = {
    hero: { typeLabel: 'ESCENA', accent: 'hero' },
    animacion: { typeLabel: 'TRANSICIÓN', accent: 'transicion' },
    vista: { typeLabel: 'ESCENA', accent: 'hero' },
    componente: { typeLabel: 'COMPONENTE', accent: 'componente' },
    lotes: { typeLabel: 'COMPONENTE', accent: 'componente' },
    amenidad: { typeLabel: 'COMPONENTE', accent: 'componente' },
    'selector-pisos': { typeLabel: 'NAVEGACIÓN', accent: 'nav' },
    'planta-3d': { typeLabel: 'PLANTA 3D', accent: 'planta' },
    viviendas: { typeLabel: 'VIVIENDAS', accent: 'viviendas' },
    ficha: { typeLabel: 'FICHA', accent: 'ficha' },
    transicion: { typeLabel: 'TRANSICIÓN', accent: 'transicion' }
  };

  function uid(prefix) {
    return (prefix || 'n') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function emptyState() {
    return {
      version: 1,
      syncedFromApply: false,
      appliedAt: null,
      nodes: [],
      edges: [],
      reviewFlags: [],
      userOverrides: false,
      canvas: {
        panX: 40,
        panY: 40,
        zoom: 1,
        selectedId: null,
        tool: 'select',
        minimapVisible: true,
        inspectorOpen: true
      }
    };
  }

  function ensureState(state) {
    if (!state.experiencia || typeof state.experiencia !== 'object') {
      state.experiencia = emptyState();
    }
    var exp = state.experiencia;
    if (!Array.isArray(exp.nodes)) exp.nodes = [];
    if (!Array.isArray(exp.edges)) exp.edges = [];
    if (!Array.isArray(exp.reviewFlags)) exp.reviewFlags = [];
    if (!exp.canvas || typeof exp.canvas !== 'object') {
      exp.canvas = emptyState().canvas;
    }
    exp.nodes.forEach(normalizeNode);
    exp.edges.forEach(normalizeEdge);
    return exp;
  }

  function kindMeta(kind) {
    return KIND_META[kind] || { typeLabel: 'NODO', accent: 'default' };
  }

  function normalizeNode(n) {
    if (!n || typeof n !== 'object') return n;
    var meta = kindMeta(n.kind);
    if (!n.typeLabel) n.typeLabel = meta.typeLabel;
    if (!n.accent) n.accent = meta.accent;
    if (n.x == null) n.x = null;
    if (n.y == null) n.y = null;
    if (n.collapsed == null && n.kind === 'viviendas') n.collapsed = true;
    if (n.unitCount == null && n.meta && n.meta.capacity != null) {
      n.unitCount = n.meta.capacity;
    }
    return n;
  }

  function normalizeEdge(ed) {
    if (!ed || typeof ed !== 'object') return ed;
    if (!ed.id) ed.id = uid('e');
    if (ed.from == null && ed.sourceId != null) ed.from = ed.sourceId;
    if (ed.to == null && ed.targetId != null) ed.to = ed.targetId;
    ed.sourceId = ed.from;
    ed.targetId = ed.to;
    return ed;
  }

  function node(partial) {
    var base = {
      id: uid('exp'),
      kind: 'vista',
      label: '',
      entityType: null,
      entityKey: null,
      transitionMedia: null,
      transitionSeconds: 4,
      status: 'pending',
      children: [],
      x: null,
      y: null,
      collapsed: false,
      unitCount: null,
      contentRef: null,
      userMoved: false
    };
    var n = Object.assign(base, partial || {});
    return normalizeNode(n);
  }

  function edge(fromId, toId, label, extra) {
    return normalizeEdge(Object.assign({
      id: uid('e'),
      from: fromId,
      to: toId,
      sourceId: fromId,
      targetId: toId,
      label: label || 'transición',
      transitionMedia: null,
      transitionSeconds: 4,
      manual: false
    }, extra || {}));
  }

  function infoLine(n) {
    if (!n) return '';
    if (n.kind === 'viviendas' || n.kind === 'lotes') {
      var c = n.unitCount != null ? n.unitCount : (n.meta && n.meta.capacity);
      if (c != null) {
        return c + (c === 1
          ? (n.kind === 'lotes' ? ' lote' : ' vivienda')
          : (n.kind === 'lotes' ? ' lotes' : ' viviendas'));
      }
    }
    if (n.kind === 'componente' && n.meta && n.meta.capacity) {
      return n.meta.capacity + ' uds.';
    }
    if (n.kind === 'animacion' || n.kind === 'transicion') {
      return (n.transitionSeconds || 4) + '–5 s';
    }
    if (n.transitionMedia) return 'Media asignada';
    if (n.orphaned) return 'Huérfano';
    return '';
  }

  function statusLabel(n) {
    if (!n) return 'Pendiente';
    if (n.orphaned || n.status === 'review') return 'Revisión';
    if (n.status === 'ready') return 'Listo';
    if (n.status === 'error') return 'Error';
    return 'Pendiente';
  }

  /** Build a default journey graph from applied structure — no media invented. */
  function buildFromEstructura(estructura, architecture) {
    var e = estructura || {};
    var nodes = [];
    var edges = [];
    var reviewFlags = [];

    var hero = node({
      id: 'exp-hero',
      kind: 'hero',
      label: 'Hero',
      entityType: 'proyecto',
      entityKey: 'hero',
      status: 'ready'
    });
    var entrada = node({
      id: 'exp-entrada',
      kind: 'animacion',
      label: 'Animación de entrada',
      status: 'pending',
      transitionSeconds: 4
    });
    var general = node({
      id: 'exp-vista-general',
      kind: 'vista',
      label: 'Vista general',
      entityType: 'proyecto',
      entityKey: 'master',
      status: 'pending'
    });
    nodes.push(hero, entrada, general);
    edges.push(edge(hero.id, entrada.id, 'entrada'));
    edges.push(edge(entrada.id, general.id, 'apertura'));

    var buckets = (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.listCapacityBuckets)
      ? EstructuraEngine.listCapacityBuckets(e)
      : [];

    buckets.forEach(function (b, i) {
      if (!b || !b.capacity) return;
      var branchId = 'exp-branch-' + String(b.id || i);
      var branch = node({
        id: branchId,
        kind: b.kind === 'lotes' ? 'lotes' : 'componente',
        label: b.label || ('Nodo ' + (i + 1)),
        entityType: 'bucket',
        entityKey: String(b.id),
        status: 'pending',
        unitCount: b.capacity,
        meta: {
          capacity: b.capacity,
          kind: b.kind,
          stageId: b.stageId || null,
          componentId: b.componentId || null
        }
      });
      nodes.push(branch);
      edges.push(edge(general.id, branch.id, 'explorar'));

      if (b.kind === 'edificio' || b.kind === 'conjunto-edificio') {
        var selId = branchId + '-pisos';
        var plantaId = branchId + '-planta';
        var vivId = branchId + '-viviendas';
        var fichaId = branchId + '-ficha';
        nodes.push(
          node({
            id: selId,
            kind: 'selector-pisos',
            label: 'Selector de pisos',
            entityType: 'bucket',
            entityKey: String(b.id),
            status: 'pending'
          }),
          node({
            id: plantaId,
            kind: 'planta-3d',
            label: 'Planta 3D',
            entityType: 'bucket',
            entityKey: String(b.id),
            status: 'pending'
          }),
          node({
            id: vivId,
            kind: 'viviendas',
            label: 'Viviendas',
            entityType: 'bucket',
            entityKey: String(b.id),
            status: 'pending',
            unitCount: b.capacity,
            collapsed: true,
            meta: { capacity: b.capacity, kind: b.kind }
          }),
          node({
            id: fichaId,
            kind: 'ficha',
            label: 'Ficha',
            entityType: 'bucket',
            entityKey: String(b.id),
            status: 'pending'
          })
        );
        edges.push(edge(branch.id, selId, 'transición'));
        edges.push(edge(selId, plantaId, 'planta'));
        edges.push(edge(plantaId, vivId, 'unidades'));
        edges.push(edge(vivId, fichaId, 'ficha'));
      } else {
        var leafId = branchId + '-unidades';
        var fichaLeaf = branchId + '-ficha';
        nodes.push(node({
          id: leafId,
          kind: 'viviendas',
          label: b.kind === 'lotes' ? 'Lotes' : 'Unidades',
          entityType: 'bucket',
          entityKey: String(b.id),
          status: 'pending',
          unitCount: b.capacity,
          collapsed: true,
          meta: { capacity: b.capacity, kind: b.kind }
        }));
        nodes.push(node({
          id: fichaLeaf,
          kind: 'ficha',
          label: 'Ficha',
          entityType: 'bucket',
          entityKey: String(b.id),
          status: 'pending'
        }));
        edges.push(edge(branch.id, leafId, 'unidades'));
        edges.push(edge(leafId, fichaLeaf, 'ficha'));
      }
    });

    (e.zoneNames || []).forEach(function (name, zi) {
      var zid = 'exp-amenidad-' + zi;
      nodes.push(node({
        id: zid,
        kind: 'amenidad',
        label: name,
        entityType: 'amenidad',
        entityKey: name,
        status: 'pending'
      }));
      edges.push(edge(general.id, zid, 'amenidad'));
    });

    var unitCount = architecture && architecture.units
      ? architecture.units.filter(function (u) { return u.status !== 'orphaned'; }).length
      : 0;
    if (!buckets.length && !e.appliedAt) {
      reviewFlags.push({
        severity: 'recomendado',
        message: 'Aplica la estructura para generar el recorrido base.'
      });
    } else if (unitCount === 0 && buckets.length) {
      reviewFlags.push({
        severity: 'recomendado',
        message: 'Hay componentes espaciales sin unidades sincronizadas aún.'
      });
    }

    return { nodes: nodes, edges: edges, reviewFlags: reviewFlags };
  }

  function edgeKey(ed) {
    return String(ed.from || ed.sourceId) + '→' + String(ed.to || ed.targetId);
  }

  /**
   * Layered L→R layout. If onlyMissing, skip nodes that already have x/y
   * (manual positions preserved across sync).
   */
  function autoLayout(nodes, edges, options) {
    options = options || {};
    var onlyMissing = options.onlyMissing !== false;
    var list = nodes || [];
    var eds = edges || [];
    var byId = {};
    list.forEach(function (n) { byId[n.id] = n; });

    var incoming = {};
    var outgoing = {};
    list.forEach(function (n) {
      incoming[n.id] = [];
      outgoing[n.id] = [];
    });
    eds.forEach(function (ed) {
      var a = ed.from || ed.sourceId;
      var b = ed.to || ed.targetId;
      if (!byId[a] || !byId[b]) return;
      outgoing[a].push(b);
      incoming[b].push(a);
    });

    var roots = list.filter(function (n) {
      return !n.orphaned && (incoming[n.id] || []).length === 0;
    });
    if (!roots.length) {
      roots = list.filter(function (n) { return n.kind === 'hero' || n.id === 'exp-hero'; });
    }
    if (!roots.length && list.length) roots = [list[0]];

    var layerOf = {};
    var queue = [];
    roots.forEach(function (r) {
      layerOf[r.id] = 0;
      queue.push(r.id);
    });
    while (queue.length) {
      var id = queue.shift();
      var L = layerOf[id] || 0;
      (outgoing[id] || []).forEach(function (cid) {
        var nextL = L + 1;
        if (layerOf[cid] == null || layerOf[cid] < nextL) {
          layerOf[cid] = nextL;
          queue.push(cid);
        }
      });
    }

    list.forEach(function (n) {
      if (layerOf[n.id] == null) layerOf[n.id] = 0;
    });

    var layers = {};
    list.forEach(function (n) {
      if (n.orphaned) return;
      var L = layerOf[n.id] || 0;
      if (!layers[L]) layers[L] = [];
      layers[L].push(n);
    });

    Object.keys(layers).forEach(function (Lk) {
      layers[Lk].sort(function (a, b) {
        return String(a.label || a.id).localeCompare(String(b.label || b.id));
      });
      layers[Lk].forEach(function (n, idx) {
        if (onlyMissing && n.x != null && n.y != null) return;
        if (n.userMoved && onlyMissing) return;
        n.x = 48 + (Number(Lk) * (NODE_W + GAP_X));
        n.y = 48 + (idx * (NODE_H + GAP_Y));
      });
    });

    /* Orphans — park below */
    var orphanRow = 0;
    list.filter(function (n) { return n.orphaned; }).forEach(function (n) {
      if (onlyMissing && n.x != null && n.y != null) return;
      if (n.userMoved && onlyMissing) return;
      n.x = 48;
      n.y = 520 + orphanRow * (NODE_H + GAP_Y);
      orphanRow++;
    });

    return list;
  }

  /**
   * Idempotent sync: preserve positions, media, manual edges; layout only new nodes.
   */
  function syncFromEstructura(state, options) {
    options = options || {};
    var exp = ensureState(state);
    var e = (typeof EstructuraEngine !== 'undefined')
      ? EstructuraEngine.ensureState(state)
      : (state.estructura || {});
    var arch = state.architecture || null;
    var built = buildFromEstructura(e, arch);

    var prevById = {};
    (exp.nodes || []).forEach(function (n) { prevById[n.id] = n; });

    var nextNodes = built.nodes.map(function (n) {
      var prev = prevById[n.id];
      if (!prev) return normalizeNode(n);
      return normalizeNode(Object.assign({}, n, {
        x: prev.x,
        y: prev.y,
        userMoved: !!prev.userMoved,
        transitionMedia: prev.transitionMedia || null,
        transitionSeconds: prev.transitionSeconds != null ? prev.transitionSeconds : n.transitionSeconds,
        contentRef: prev.contentRef || null,
        collapsed: prev.collapsed != null ? prev.collapsed : n.collapsed,
        status: prev.transitionMedia || prev.contentRef ? 'ready' : n.status,
        userEdited: !!prev.userEdited || !!prev.userMoved
      }));
    });

    var nextIds = {};
    nextNodes.forEach(function (n) { nextIds[n.id] = true; });

    var orphans = (exp.nodes || []).filter(function (n) {
      return !nextIds[n.id] && (n.transitionMedia || n.contentRef || n.userEdited || n.userMoved);
    });
    orphans.forEach(function (n) {
      nextNodes.push(normalizeNode(Object.assign({}, n, {
        status: 'review',
        orphaned: true
      })));
      built.reviewFlags.push({
        severity: 'obligatorio',
        message: 'Nodo «' + (n.label || n.id) + '» ya no está en la estructura; conservado para revisión.'
      });
    });

    var nextEdges = built.edges.map(function (ed) {
      var prev = (exp.edges || []).find(function (x) {
        return edgeKey(x) === edgeKey(ed);
      });
      if (!prev) return normalizeEdge(ed);
      return normalizeEdge(Object.assign({}, ed, {
        id: prev.id || ed.id,
        transitionMedia: prev.transitionMedia || null,
        transitionSeconds: prev.transitionSeconds || ed.transitionSeconds
      }));
    });

    var builtKeys = {};
    nextEdges.forEach(function (ed) { builtKeys[edgeKey(ed)] = true; });
    (exp.edges || []).forEach(function (ed) {
      if (!ed.manual) return;
      var a = ed.from || ed.sourceId;
      var b = ed.to || ed.targetId;
      if (!nextIds[a] || !nextIds[b]) return;
      if (builtKeys[edgeKey(ed)]) return;
      nextEdges.push(normalizeEdge(Object.assign({}, ed, { manual: true })));
    });

    autoLayout(nextNodes, nextEdges, { onlyMissing: true });

    exp.nodes = nextNodes;
    exp.edges = nextEdges;
    exp.reviewFlags = built.reviewFlags;
    exp.syncedFromApply = true;
    exp.appliedAt = options.appliedAt || new Date().toISOString();
    exp.version = (exp.version || 0) + 1;
    return exp;
  }

  function setNodePosition(state, nodeId, x, y, markMoved) {
    var exp = ensureState(state);
    var n = exp.nodes.find(function (node) { return node.id === nodeId; });
    if (!n) return null;
    n.x = Math.round(x);
    n.y = Math.round(y);
    if (markMoved !== false) {
      n.userMoved = true;
      n.userEdited = true;
    }
    return n;
  }

  function addManualEdge(state, fromId, toId, label) {
    var exp = ensureState(state);
    if (fromId === toId) return null;
    var exists = exp.edges.some(function (ed) {
      return (ed.from || ed.sourceId) === fromId && (ed.to || ed.targetId) === toId;
    });
    if (exists) return null;
    var ed = edge(fromId, toId, label || 'manual', { manual: true });
    exp.edges.push(ed);
    return ed;
  }

  function getNode(state, id) {
    var exp = ensureState(state);
    return exp.nodes.find(function (n) { return n.id === id; }) || null;
  }

  function connectionsFor(state, nodeId) {
    var exp = ensureState(state);
    return {
      in: exp.edges.filter(function (ed) {
        return (ed.to || ed.targetId) === nodeId;
      }),
      out: exp.edges.filter(function (ed) {
        return (ed.from || ed.sourceId) === nodeId;
      })
    };
  }

  function bounds(nodes) {
    var list = (nodes || []).filter(function (n) { return n.x != null && n.y != null; });
    if (!list.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    list.forEach(function (n) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_W);
      maxY = Math.max(maxY, n.y + NODE_H);
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function summary(state) {
    var exp = ensureState(state);
    if (!exp.syncedFromApply && !(exp.nodes || []).length) return 'Pendiente';
    var active = (exp.nodes || []).filter(function (n) { return !n.orphaned; }).length;
    var review = (exp.nodes || []).filter(function (n) { return n.status === 'review' || n.orphaned; }).length;
    if (review) return active + ' nodos · ' + review + ' revisión';
    return active ? (active + ' nodos') : 'Pendiente';
  }

  function incompleteNodes(state) {
    var exp = ensureState(state);
    return (exp.nodes || []).filter(function (n) {
      return !n.orphaned && n.kind !== 'hero' && n.status === 'pending';
    });
  }

  function forceRelayout(state) {
    var exp = ensureState(state);
    exp.nodes.forEach(function (n) {
      n.userMoved = false;
      n.x = null;
      n.y = null;
    });
    autoLayout(exp.nodes, exp.edges, { onlyMissing: false });
    return exp;
  }

  return {
    NODE_W: NODE_W,
    NODE_H: NODE_H,
    KIND_META: KIND_META,
    emptyState: emptyState,
    ensureState: ensureState,
    buildFromEstructura: buildFromEstructura,
    syncFromEstructura: syncFromEstructura,
    autoLayout: autoLayout,
    forceRelayout: forceRelayout,
    setNodePosition: setNodePosition,
    addManualEdge: addManualEdge,
    getNode: getNode,
    connectionsFor: connectionsFor,
    bounds: bounds,
    infoLine: infoLine,
    statusLabel: statusLabel,
    kindMeta: kindMeta,
    summary: summary,
    incompleteNodes: incompleteNodes,
    normalizeNode: normalizeNode,
    normalizeEdge: normalizeEdge
  };
})();
