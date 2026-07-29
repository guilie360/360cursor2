/* BOXIES RuntimePipeline — textual walkthrough of the Experiencia graph. */
var RuntimePipeline = (function () {
  function edgeEnds(ed) {
    return {
      from: ed.sourceNodeId || ed.from || ed.sourceId || null,
      to: ed.targetNodeId || ed.to || ed.targetId || null
    };
  }

  function labelFor(n) {
    if (!n) return '—';
    return n.label || n.typeLabel || n.kind || n.id;
  }

  function findHero(nodes) {
    for (var i = 0; i < (nodes || []).length; i++) {
      if (nodes[i] && (nodes[i].kind === 'hero' || nodes[i].role === 'hero')) return nodes[i];
    }
    return null;
  }

  /**
   * Depth-first primary path from Hero, then remaining reachable nodes.
   * Returns [{ id, label, kind }] for vertical summary UI.
   */
  function build(state) {
    var flow = (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.readFlow)
      ? RuntimeSerializer.readFlow(state)
      : { nodes: ((state && state.experiencia) || {}).nodes || [], edges: ((state && state.experiencia) || {}).edges || [] };
    var nodes = flow.nodes || [];
    var edges = flow.edges || [];
    var byId = {};
    nodes.forEach(function (n) {
      if (n && n.id != null) byId[String(n.id)] = n;
    });
    var outs = {};
    edges.forEach(function (ed) {
      var e = edgeEnds(ed);
      if (!e.from || !e.to) return;
      if (!outs[e.from]) outs[e.from] = [];
      outs[e.from].push(e.to);
    });

    var hero = findHero(nodes);
    var steps = [];
    var seen = {};

    function pushNode(n) {
      if (!n || seen[n.id]) return;
      seen[n.id] = true;
      steps.push({
        id: n.id,
        label: labelFor(n),
        kind: n.kind || null
      });
    }

    function walk(id) {
      var n = byId[id];
      if (!n || seen[id]) return;
      pushNode(n);
      var next = outs[id] || [];
      next.forEach(function (nid) { walk(nid); });
    }

    if (hero) walk(hero.id);
    else if (nodes.length) walk(nodes[0].id);

    /* Append reachable leftovers (branches not visited in first walk order already covered by DFS) */
    nodes.forEach(function (n) {
      if (n && !seen[n.id]) {
        /* only orphans / disconnected — append at end with note */
        steps.push({
          id: n.id,
          label: labelFor(n) + ' (fuera de flujo)',
          kind: n.kind || null,
          disconnected: true
        });
        seen[n.id] = true;
      }
    });

    return steps;
  }

  return {
    build: build
  };
})();
