/* BOXIES RuntimeSerializer — builds the executable runtime object (in-memory). */
var RuntimeSerializer = (function () {
  var VERSION = '1.0.0';

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

  function normalizeNode(n) {
    if (!n) return null;
    return {
      id: n.id,
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
      y: n.y != null ? n.y : null
    };
  }

  function normalizeEdge(ed) {
    if (!ed) return null;
    return {
      id: ed.id || null,
      sourceNodeId: ed.sourceNodeId || ed.from || ed.sourceId || null,
      targetNodeId: ed.targetNodeId || ed.to || ed.targetId || null,
      sourcePortId: ed.sourcePortId || ed.sourcePort || ed.portId || null,
      sourcePortLabel: ed.sourcePortLabel || null,
      targetPortId: ed.targetPortId || ed.targetPort || 'in',
      inlineAction: !!ed.inlineAction
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
    if (!asset && cfg.fileName && typeof window !== 'undefined') {
      /* filename-only fallback: scan assets */
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
      thumbnailUrl: asset
        ? (asset.thumbnailUrl || asset.publicUrl || null)
        : null,
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

  /**
   * Build a plain runtime object ready for Vista previa / Publicar.
   * Does not persist — caller stores it.
   */
  function serialize(state, options) {
    options = options || {};
    var flow = readFlow(state);
    var assets = collectAssets(state).map(normalizeAsset).filter(Boolean);
    var assetById = indexAssets(assets);
    var nodes = flow.nodes.map(function (raw) {
      var n = normalizeNode(raw);
      if (!n) return null;
      n.media = resolveMediaForNode(n, assetById);
      if (n.config && n.config.hub && n.config.hub.enabled) {
        n.hubPlants = resolveHubPlants(n, assetById);
      }
      return n;
    }).filter(Boolean);
    var connections = flow.edges.map(normalizeEdge).filter(Boolean);
    var heroNode = findHero(flow.nodes);
    var generatedAt = options.generatedAt || new Date().toISOString();

    return {
      version: VERSION,
      generatedAt: generatedAt,
      projectId: (state && (state.draftProjectId || state.projectId)) || null,
      slug: (state && state.projectInfo && state.projectInfo.slug) || null,
      hero: buildHeroSnapshot(state, heroNode),
      nodes: nodes,
      connections: connections,
      assets: assets,
      statistics: options.statistics || null,
      meta: {
        source: 'experiencia',
        nodeCount: nodes.length,
        connectionCount: connections.length,
        assetCount: assets.length,
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
    cloneJson: cloneJson
  };
})();
