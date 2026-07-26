/* BOXIES V5.9.48 — Experiencia: recorrido interactivo derivado de Estructura */
var ExperienciaEngine = (function () {
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
      userOverrides: false
    };
  }

  function ensureState(state) {
    if (!state.experiencia || typeof state.experiencia !== 'object') {
      state.experiencia = emptyState();
    }
    if (!Array.isArray(state.experiencia.nodes)) state.experiencia.nodes = [];
    if (!Array.isArray(state.experiencia.edges)) state.experiencia.edges = [];
    if (!Array.isArray(state.experiencia.reviewFlags)) state.experiencia.reviewFlags = [];
    return state.experiencia;
  }

  function node(partial) {
    return Object.assign({
      id: uid('exp'),
      kind: 'vista',
      label: '',
      entityType: null,
      entityKey: null,
      transitionMedia: null,
      transitionSeconds: 4,
      status: 'pending',
      children: []
    }, partial || {});
  }

  function edge(fromId, toId, label) {
    return {
      id: uid('e'),
      from: fromId,
      to: toId,
      label: label || 'transición',
      transitionMedia: null,
      transitionSeconds: 4
    };
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
      status: 'pending'
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
            status: 'pending'
          })
        );
        edges.push(edge(branch.id, selId, 'transición'));
        edges.push(edge(selId, plantaId, 'planta'));
        edges.push(edge(plantaId, vivId, 'unidades'));
      } else {
        var leafId = branchId + '-unidades';
        nodes.push(node({
          id: leafId,
          kind: 'viviendas',
          label: 'Unidades',
          entityType: 'bucket',
          entityKey: String(b.id),
          status: 'pending'
        }));
        edges.push(edge(branch.id, leafId, 'unidades'));
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

  /**
   * Idempotent sync: preserve userOverrides (transition media) by node id/entityKey.
   * Orphan previous custom nodes into reviewFlags — never hard-delete.
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
      if (!prev) return n;
      return Object.assign({}, n, {
        transitionMedia: prev.transitionMedia || null,
        transitionSeconds: prev.transitionSeconds || n.transitionSeconds,
        status: prev.transitionMedia ? 'ready' : n.status,
        userEdited: !!prev.userEdited
      });
    });

    var nextIds = {};
    nextNodes.forEach(function (n) { nextIds[n.id] = true; });
    var orphans = (exp.nodes || []).filter(function (n) {
      return !nextIds[n.id] && (n.transitionMedia || n.userEdited);
    });
    orphans.forEach(function (n) {
      nextNodes.push(Object.assign({}, n, {
        status: 'review',
        orphaned: true
      }));
      built.reviewFlags.push({
        severity: 'obligatorio',
        message: 'Nodo «' + (n.label || n.id) + '» ya no está en la estructura; conservado para revisión.'
      });
    });

    var nextEdges = built.edges.map(function (ed) {
      var prev = (exp.edges || []).find(function (x) {
        return x.from === ed.from && x.to === ed.to;
      });
      if (!prev) return ed;
      return Object.assign({}, ed, {
        transitionMedia: prev.transitionMedia || null,
        transitionSeconds: prev.transitionSeconds || ed.transitionSeconds
      });
    });

    exp.nodes = nextNodes;
    exp.edges = nextEdges;
    exp.reviewFlags = built.reviewFlags;
    exp.syncedFromApply = true;
    exp.appliedAt = options.appliedAt || new Date().toISOString();
    exp.version = (exp.version || 0) + 1;
    return exp;
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

  return {
    emptyState: emptyState,
    ensureState: ensureState,
    buildFromEstructura: buildFromEstructura,
    syncFromEstructura: syncFromEstructura,
    summary: summary,
    incompleteNodes: incompleteNodes
  };
})();
