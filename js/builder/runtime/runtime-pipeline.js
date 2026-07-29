/* BOXIES RuntimePipeline — graph topology view (forks / joins), not a linear path. */
var RuntimePipeline = (function () {
  function labelFor(n) {
    if (!n) return '—';
    return n.label || n.typeLabel || n.kind || n.type || n.id;
  }

  /**
   * Build a topology snapshot for the Runtime UI.
   * Uses the compiled runtime graph when available; otherwise reads the canvas.
   * Never collapses the graph into a single ordered path.
   */
  function build(state, runtime) {
    var nodes;
    var connections;
    var entryNodeId = null;
    var forks = [];
    var joins = [];

    if (runtime && Array.isArray(runtime.nodes)) {
      nodes = runtime.nodes;
      connections = runtime.connections || [];
      entryNodeId = runtime.entryNodeId || (runtime.hero && runtime.hero.nodeId) || null;
      forks = (runtime.graph && runtime.graph.forks) || nodes.filter(function (n) {
        return n && n.fork;
      }).map(function (n) {
        return { id: n.id, label: labelFor(n), mode: n.mode, outputs: n.outputs || [] };
      });
      joins = (runtime.graph && runtime.graph.joins) || nodes.filter(function (n) {
        return n && n.join;
      }).map(function (n) {
        return { id: n.id, label: labelFor(n), inputs: n.inputs || [] };
      });
    } else {
      var flow = (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.readFlow)
        ? RuntimeSerializer.readFlow(state)
        : { nodes: ((state && state.experiencia) || {}).nodes || [], edges: ((state && state.experiencia) || {}).edges || [] };
      nodes = (flow.nodes || []).map(function (n) {
        return {
          id: n.id,
          label: labelFor(n),
          kind: n.kind || null,
          type: n.kind || null,
          typeLabel: n.typeLabel || null,
          x: n.x,
          y: n.y,
          mode: 'none',
          inputs: [],
          outputs: [],
          fork: false,
          join: false,
          inDegree: 0,
          outDegree: 0
        };
      });
      connections = (flow.edges || []).map(function (ed) {
        return {
          id: ed.id || null,
          sourceNodeId: ed.sourceNodeId || ed.from || ed.sourceId || null,
          targetNodeId: ed.targetNodeId || ed.to || ed.targetId || null,
          sourcePortLabel: ed.sourcePortLabel || null
        };
      });
      if (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.attachTopology) {
        RuntimeSerializer.attachTopology(nodes, connections);
      }
      var hero = null;
      for (var i = 0; i < (flow.nodes || []).length; i++) {
        if (flow.nodes[i] && (flow.nodes[i].kind === 'hero' || flow.nodes[i].role === 'hero')) {
          hero = flow.nodes[i];
          break;
        }
      }
      entryNodeId = hero ? hero.id : (nodes[0] && nodes[0].id);
      forks = nodes.filter(function (n) { return n && n.fork; }).map(function (n) {
        return { id: n.id, label: labelFor(n), mode: n.mode, outputs: n.outputs || [] };
      });
      joins = nodes.filter(function (n) { return n && n.join; }).map(function (n) {
        return { id: n.id, label: labelFor(n), inputs: n.inputs || [] };
      });
    }

    var byId = {};
    nodes.forEach(function (n) {
      if (n && n.id != null) byId[String(n.id)] = n;
    });

    /* Layout from canvas coordinates — preserve spatial relationships */
    var xs = [];
    var ys = [];
    nodes.forEach(function (n) {
      if (n && n.x != null && !isNaN(Number(n.x))) xs.push(Number(n.x));
      if (n && n.y != null && !isNaN(Number(n.y))) ys.push(Number(n.y));
    });
    var minX = xs.length ? Math.min.apply(null, xs) : 0;
    var maxX = xs.length ? Math.max.apply(null, xs) : 1;
    var minY = ys.length ? Math.min.apply(null, ys) : 0;
    var maxY = ys.length ? Math.max.apply(null, ys) : 1;
    var spanX = Math.max(1, maxX - minX);
    var spanY = Math.max(1, maxY - minY);

    var layoutNodes = nodes.map(function (n) {
      var nx = n.x != null ? Number(n.x) : minX;
      var ny = n.y != null ? Number(n.y) : minY;
      return {
        id: n.id,
        label: labelFor(n),
        kind: n.kind || n.type || null,
        typeLabel: n.typeLabel || null,
        mode: n.mode || 'none',
        fork: !!n.fork,
        join: !!n.join,
        inDegree: n.inDegree || (n.inputs ? n.inputs.length : 0),
        outDegree: n.outDegree || (n.outputs ? n.outputs.length : 0),
        inputs: n.inputs || [],
        outputs: n.outputs || [],
        disconnected: (n.inDegree || 0) === 0 && (n.outDegree || 0) === 0 &&
          String(n.id) !== String(entryNodeId) &&
          !(n.kind === 'hero' || n.role === 'hero'),
        x: n.x,
        y: n.y,
        /* normalized 0–100 for CSS placement */
        left: ((nx - minX) / spanX) * 100,
        top: ((ny - minY) / spanY) * 100
      };
    });

    var layoutEdges = connections.map(function (ed) {
      var from = byId[String(ed.sourceNodeId)];
      var to = byId[String(ed.targetNodeId)];
      var fromLayout = null;
      var toLayout = null;
      layoutNodes.forEach(function (ln) {
        if (String(ln.id) === String(ed.sourceNodeId)) fromLayout = ln;
        if (String(ln.id) === String(ed.targetNodeId)) toLayout = ln;
      });
      return {
        id: ed.id,
        from: ed.sourceNodeId,
        to: ed.targetNodeId,
        label: ed.sourcePortLabel || null,
        fromLabel: from ? labelFor(from) : ed.sourceNodeId,
        toLabel: to ? labelFor(to) : ed.targetNodeId,
        x1: fromLayout ? fromLayout.left : 0,
        y1: fromLayout ? fromLayout.top : 0,
        x2: toLayout ? toLayout.left : 0,
        y2: toLayout ? toLayout.top : 0
      };
    }).filter(function (e) { return e.from && e.to; });

    return {
      topology: 'directed-graph',
      entryNodeId: entryNodeId,
      nodes: layoutNodes,
      edges: layoutEdges,
      forks: forks,
      joins: joins,
      /* legacy compat: empty steps — UI must not render a linear list */
      steps: []
    };
  }

  return {
    build: build
  };
})();
