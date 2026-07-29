/* BOXIES RuntimeSerializer — serializes the Experiencia directed graph (no path picking). */
var RuntimeSerializer = (function () {
  var VERSION = '1.1.0';

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value == null ? null : value));
    } catch (e) {
      return null;
    }
  }

  function readFlow(state) {
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureState) {
      try { ExperienciaEngine.ensureState(state); } catch (e) {}
    }
    var exp = (state && state.experiencia) || {};
    return {
      nodes: Array.isArray(exp.nodes) ? exp.nodes : [],
      edges: Array.isArray(exp.edges) ? exp.edges : []
    };
  }

  function findHero(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] && (nodes[i].kind === 'hero' || nodes[i].role === 'hero')) return nodes[i];
    }
    return null;
  }

  function collectAssets(state) {
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.listSelectableMediaAssets) {
      return ExperienciaEngine.listSelectableMediaAssets(state) || [];
    }
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.listInventoryAssets) {
      return MediaNodesEngine.listInventoryAssets(state) || [];
    }
    var byId = (state && state.projectAssets && state.projectAssets.byId) || {};
    return Object.keys(byId).map(function (id) { return byId[id]; }).filter(function (a) {
      return a && !a.orphan && (a.filename || a.publicUrl);
    });
  }

  function buildHeroSnapshot(state, heroNode) {
    var heroContent = (state && state.heroContent) || {};
    var branding = (state && state.branding) || {};
    return {
      nodeId: heroNode ? heroNode.id : null,
      label: heroNode ? (heroNode.label || 'Hero') : null,
      title: heroContent.title || null,
      subtitle: heroContent.subtitle || null,
      hasVideo: !!(state && state.heroVideo),
      hasImage: !!(state && state.heroImage),
      hasLogo: !!(branding.logo),
      showShare: heroContent.showShare !== false,
      showFullscreen: heroContent.showFullscreen !== false,
      showWhatsapp: heroContent.showWhatsapp !== false
    };
  }

  function edgeEnds(ed) {
    return {
      from: ed.sourceNodeId || ed.from || ed.sourceId || null,
      to: ed.targetNodeId || ed.to || ed.targetId || null
    };
  }

  function normalizeEdge(ed) {
    if (!ed) return null;
    var ends = edgeEnds(ed);
    return {
      id: ed.id || null,
      sourceNodeId: ends.from,
      targetNodeId: ends.to,
      sourcePortId: ed.sourcePortId || ed.sourcePort || ed.portId || null,
      sourcePortLabel: ed.sourcePortLabel || null,
      targetPortId: ed.targetPortId || ed.targetPort || 'in',
      inlineAction: !!ed.inlineAction,
      condition: ed.condition != null ? cloneJson(ed.condition) : null,
      transitionMedia: ed.transitionMedia != null ? cloneJson(ed.transitionMedia) : null,
      transitionSeconds: ed.transitionSeconds != null ? ed.transitionSeconds : null
    };
  }

  function normalizeAsset(a) {
    if (!a) return null;
    return {
      id: a.id,
      type: a.type || null,
      category: a.category || null,
      filename: a.filename || null,
      provider: a.provider || null,
      publicUrl: a.publicUrl || null,
      thumbnailUrl: a.thumbnailUrl || a.publicUrl || null,
      storagePath: a.storagePath || null,
      nodeId: a.nodeId || null,
      status: a.status || null
    };
  }

  function indexAssets(assets) {
    var map = {};
    (assets || []).forEach(function (a) {
      if (a && a.id != null) map[String(a.id)] = a;
    });
    return map;
  }

  function resolveMediaForNode(n, assetById) {
    var cfg = (n && n.config) || {};
    var aid = cfg.assetId;
    var asset = aid != null ? assetById[String(aid)] : null;
    if (!asset && cfg.fileName) {
      Object.keys(assetById).some(function (id) {
        var a = assetById[id];
        if (a && a.filename && a.filename === cfg.fileName) {
          asset = a;
          return true;
        }
        return false;
      });
    }
    var url = asset
      ? (asset.publicUrl || asset.thumbnailUrl || null)
      : (cfg.publicUrl || cfg.mediaUrl || null);
    return {
      assetId: asset ? asset.id : (aid || null),
      url: url,
      thumbnailUrl: asset ? (asset.thumbnailUrl || asset.publicUrl || null) : null,
      filename: asset ? asset.filename : (cfg.fileName || null),
      type: asset ? asset.type : null
    };
  }

  function resolveHubPlants(n, assetById) {
    var hub = (n && n.config && n.config.hub) || null;
    if (!hub || !hub.enabled) return [];
    var ids = Array.isArray(hub.selectedPlants) ? hub.selectedPlants : [];
    if (!ids.length && Array.isArray(hub.options)) {
      ids = hub.options.map(function (o) {
        return o && (o.plantId || o.targetNodeId || o.id);
      }).filter(Boolean);
    }
    return ids.map(function (id, idx) {
      var asset = assetById[String(id)] || null;
      var label = null;
      if (asset && asset.filename) {
        label = String(asset.filename).replace(/\.[^.]+$/, '');
      }
      if (!label) label = 'Planta ' + (idx + 1);
      var num = label.match(/(?:planta|piso|nivel)?\s*[-:]?\s*(\d+)/i) || label.match(/(\d+)/);
      return {
        id: asset ? asset.id : id,
        label: num && num[1] ? String(num[1]) : String(idx + 1),
        title: label,
        url: asset ? (asset.publicUrl || asset.thumbnailUrl || null) : null,
        thumbnailUrl: asset ? (asset.thumbnailUrl || asset.publicUrl || null) : null,
        filename: asset ? asset.filename : null
      };
    }).filter(function (p) { return p && p.id; });
  }

  function resolveMode(outCount, inCount) {
    if (outCount <= 0) return 'none';
    if (outCount === 1) return 'linear';
    return 'parallel';
  }

  /**
   * Attach graph topology to each node. Preserves canvas node order.
   * Does NOT pick a primary path, DFS, or BFS order.
   */
  function attachTopology(nodes, connections) {
    var buckets = {};
    nodes.forEach(function (n) {
      if (!n || n.id == null) return;
      buckets[String(n.id)] = {
        inputs: [],
        outputs: [],
        connections: [],
        conditions: [],
        transitions: []
      };
    });

    connections.forEach(function (ed) {
      if (!ed) return;
      var from = ed.sourceNodeId;
      var to = ed.targetNodeId;
      if (!from || !to) return;
      var fromKey = String(from);
      var toKey = String(to);
      var link = {
        id: ed.id,
        fromNodeId: from,
        toNodeId: to,
        sourcePortId: ed.sourcePortId || null,
        sourcePortLabel: ed.sourcePortLabel || null,
        targetPortId: ed.targetPortId || 'in',
        inlineAction: !!ed.inlineAction,
        condition: ed.condition || null,
        transitionMedia: ed.transitionMedia || null,
        transitionSeconds: ed.transitionSeconds != null ? ed.transitionSeconds : null
      };

      if (buckets[fromKey]) {
        buckets[fromKey].outputs.push({
          edgeId: ed.id,
          toNodeId: to,
          portId: ed.sourcePortId || null,
          portLabel: ed.sourcePortLabel || null,
          targetPortId: ed.targetPortId || 'in',
          condition: ed.condition || null,
          transitionMedia: ed.transitionMedia || null,
          transitionSeconds: ed.transitionSeconds != null ? ed.transitionSeconds : null
        });
        buckets[fromKey].transitions.push({
          edgeId: ed.id,
          toNodeId: to,
          portId: ed.sourcePortId || null,
          portLabel: ed.sourcePortLabel || null,
          condition: ed.condition || null,
          media: ed.transitionMedia || null,
          seconds: ed.transitionSeconds != null ? ed.transitionSeconds : null
        });
        buckets[fromKey].connections.push(link);
        if (ed.condition) buckets[fromKey].conditions.push(cloneJson(ed.condition));
      }

      if (buckets[toKey]) {
        buckets[toKey].inputs.push({
          edgeId: ed.id,
          fromNodeId: from,
          portId: ed.targetPortId || 'in',
          sourcePortId: ed.sourcePortId || null,
          sourcePortLabel: ed.sourcePortLabel || null,
          condition: ed.condition || null
        });
        buckets[toKey].connections.push(link);
        if (ed.condition) buckets[toKey].conditions.push(cloneJson(ed.condition));
      }
    });

    nodes.forEach(function (n) {
      if (!n || n.id == null) return;
      var topo = buckets[String(n.id)] || {
        inputs: [], outputs: [], connections: [], conditions: [], transitions: []
      };
      n.inputs = topo.inputs;
      n.outputs = topo.outputs;
      n.connections = topo.connections;
      n.conditions = topo.conditions;
      n.transitions = topo.transitions;
      n.inDegree = topo.inputs.length;
      n.outDegree = topo.outputs.length;
      n.mode = resolveMode(topo.outputs.length, topo.inputs.length);
      if (topo.inputs.length > 1) n.join = true;
      if (topo.outputs.length > 1) n.fork = true;
    });

    return nodes;
  }

  function normalizeNodeBase(n) {
    if (!n) return null;
    return {
      id: n.id,
      type: n.kind || n.type || null,
      kind: n.kind || null,
      typeLabel: n.typeLabel || null,
      label: n.label || n.id,
      role: n.role || null,
      status: n.status || null,
      orphaned: !!n.orphaned,
      locked: !!n.locked,
      config: cloneJson(n.config) || {},
      ports: cloneJson(n.ports) || [],
      x: n.x != null ? n.x : null,
      y: n.y != null ? n.y : null,
      /* topology filled by attachTopology — placeholders for schema clarity */
      inputs: [],
      outputs: [],
      connections: [],
      conditions: [],
      transitions: [],
      mode: 'none',
      inDegree: 0,
      outDegree: 0,
      fork: false,
      join: false
    };
  }

  /**
   * Build executable runtime = faithful directed graph of the Canvas.
   * Node array order matches Experiencia canvas order (no reordering).
   */
  function serialize(state, options) {
    options = options || {};
    var flow = readFlow(state);
    var assets = collectAssets(state).map(normalizeAsset).filter(Boolean);
    var assetById = indexAssets(assets);

    /* Preserve canvas order exactly */
    var nodes = flow.nodes.map(function (raw) {
      var n = normalizeNodeBase(raw);
      if (!n) return null;
      n.media = resolveMediaForNode(n, assetById);
      if (n.config && n.config.hub && n.config.hub.enabled) {
        n.hubPlants = resolveHubPlants(n, assetById);
      }
      return n;
    }).filter(Boolean);

    var connections = flow.edges.map(normalizeEdge).filter(Boolean);
    attachTopology(nodes, connections);

    var heroNode = findHero(flow.nodes);
    var generatedAt = options.generatedAt || new Date().toISOString();
    var forks = nodes.filter(function (n) { return n && n.fork; }).map(function (n) {
      return { id: n.id, label: n.label, mode: n.mode, outputs: n.outputs };
    });
    var joins = nodes.filter(function (n) { return n && n.join; }).map(function (n) {
      return { id: n.id, label: n.label, inputs: n.inputs };
    });

    return {
      version: VERSION,
      generatedAt: generatedAt,
      projectId: (state && (state.draftProjectId || state.projectId)) || null,
      slug: (state && state.projectInfo && state.projectInfo.slug) || null,
      topology: 'directed-graph',
      hero: buildHeroSnapshot(state, heroNode),
      entryNodeId: heroNode ? heroNode.id : (nodes[0] ? nodes[0].id : null),
      nodes: nodes,
      connections: connections,
      graph: {
        forks: forks,
        joins: joins
      },
      assets: assets,
      statistics: options.statistics || null,
      meta: {
        source: 'experiencia',
        topology: 'directed-graph',
        nodeCount: nodes.length,
        connectionCount: connections.length,
        assetCount: assets.length,
        forkCount: forks.length,
        joinCount: joins.length,
        durationMs: options.durationMs != null ? options.durationMs : null
      }
    };
  }

  return {
    VERSION: VERSION,
    serialize: serialize,
    readFlow: readFlow,
    findHero: findHero,
    collectAssets: collectAssets,
    cloneJson: cloneJson,
    attachTopology: attachTopology
  };
})();
