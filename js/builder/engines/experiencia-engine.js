/* BOXIES V5.9.55 — Experiencia: editor de flujo del showroom
 * Legacy V5.9.50/51 conservado. V5.9.53 puertos. V5.9.54 edición.
 * V5.9.55: Hero orquesta (referencias/acciones vs flujo INICIAR). */
var ExperienciaEngine = (function () {
  var NODE_W = 200;
  var NODE_H = 92;
  var HERO_W = 280;
  var HERO_H = 220;
  var GAP_X = 72;
  var GAP_Y = 28;

  var KIND_META = {
    hero: { typeLabel: 'HERO', accent: 'hero', role: 'scene' },
    scene: { typeLabel: 'ESCENA', accent: 'hero', role: 'scene' },
    image: { typeLabel: 'IMAGEN', accent: 'hero', role: 'scene' },
    video: { typeLabel: 'ANIMACIÓN', accent: 'transicion', role: 'scene' },
    pano360: { typeLabel: '360°', accent: 'planta', role: 'scene' },
    plan: { typeLabel: 'PLANTA', accent: 'planta', role: 'scene' },
    hotspot: { typeLabel: 'HOTSPOT', accent: 'nav', role: 'interaction' },
    action: { typeLabel: 'ACCIÓN', accent: 'ficha', role: 'action' },
    group: { typeLabel: 'GRUPO', accent: 'componente', role: 'group' },
    structure: { typeLabel: 'PROYECTO', accent: 'componente', role: 'group' },
    /* legacy kinds kept for recovery */
    animacion: { typeLabel: 'TRANSICIÓN', accent: 'transicion', role: 'scene' },
    vista: { typeLabel: 'ESCENA', accent: 'hero', role: 'scene' },
    componente: { typeLabel: 'COMPONENTE', accent: 'componente', role: 'group' },
    lotes: { typeLabel: 'COMPONENTE', accent: 'componente', role: 'group' },
    amenidad: { typeLabel: 'COMPONENTE', accent: 'componente', role: 'group' },
    'selector-pisos': { typeLabel: 'NAVEGACIÓN', accent: 'nav', role: 'interaction' },
    'planta-3d': { typeLabel: 'PLANTA 3D', accent: 'planta', role: 'scene' },
    viviendas: { typeLabel: 'VIVIENDAS', accent: 'viviendas', role: 'group' },
    ficha: { typeLabel: 'FICHA', accent: 'ficha', role: 'scene' },
    transicion: { typeLabel: 'TRANSICIÓN', accent: 'transicion', role: 'scene' }
  };

  var CREATE_MENU = [
    {
      id: 'visual',
      label: 'VISUAL',
      items: [
        { id: 'image', label: 'Imagen / escena estática', kind: 'image', role: 'scene' },
        { id: 'video', label: 'Video / animación', kind: 'video', role: 'scene' },
        { id: 'pano360', label: 'Escena 360°', kind: 'pano360', role: 'scene' },
        { id: 'plan', label: 'Planta 2D / 3D', kind: 'plan', role: 'scene' }
      ]
    },
    {
      id: 'interaccion',
      label: 'INTERACCIÓN',
      items: [
        { id: 'hotspot', label: 'Hotspot', kind: 'hotspot', role: 'interaction' },
        { id: 'buttons', label: 'Botones / opciones', kind: 'scene', role: 'scene', preset: 'buttons' },
        { id: 'floor-sel', label: 'Selector de pisos', kind: 'selector-pisos', role: 'interaction' },
        { id: 'unit-sel', label: 'Selector de unidades/tipologías', kind: 'scene', role: 'scene', preset: 'units' }
      ]
    },
    {
      id: 'interfaz',
      label: 'INTERFAZ',
      items: [
        { id: 'card', label: 'Tarjeta', kind: 'scene', role: 'scene', preset: 'card' },
        { id: 'modal', label: 'Modal', kind: 'scene', role: 'scene', preset: 'modal' },
        { id: 'ficha', label: 'Ficha de vivienda', kind: 'ficha', role: 'scene' },
        { id: 'gallery', label: 'Galería', kind: 'scene', role: 'scene', preset: 'gallery' },
        { id: 'panel', label: 'Panel / menú', kind: 'scene', role: 'scene', preset: 'panel' }
      ]
    },
    {
      id: 'navegacion',
      label: 'NAVEGACIÓN',
      items: [
        { id: 'goto-existing', label: 'Ir a nodo existente', kind: '_link_existing', role: 'nav' },
        { id: 'back', label: 'Volver', kind: 'action', role: 'action', actionType: 'back' },
        { id: 'goto-hero', label: 'Ir al Hero', kind: 'action', role: 'action', actionType: 'goto-hero' }
      ]
    },
    {
      id: 'accion',
      label: 'ACCIÓN',
      items: [
        { id: 'url', label: 'Abrir URL', kind: 'action', role: 'action', actionType: 'url' },
        { id: 'share', label: 'Compartir', kind: 'action', role: 'action', actionType: 'share' },
        { id: 'whatsapp', label: 'WhatsApp / contacto', kind: 'action', role: 'action', actionType: 'whatsapp' },
        { id: 'download', label: 'Descargar documento', kind: 'action', role: 'action', actionType: 'download' },
        { id: 'fullscreen', label: 'Fullscreen', kind: 'action', role: 'action', actionType: 'fullscreen' },
        { id: 'close', label: 'Cerrar', kind: 'action', role: 'action', actionType: 'close' }
      ]
    },
    {
      id: 'proyecto',
      label: 'PROYECTO',
      items: [
        { id: 'link-structure', label: 'Vincular elemento existente de Estructura', kind: '_link_structure', role: 'group' }
      ]
    }
  ];

  function uid(prefix) {
    return (prefix || 'n') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function emptyState() {
    return {
      version: 2,
      mode: 'flow',
      syncedFromApply: false,
      appliedAt: null,
      nodes: [],
      edges: [],
      reviewFlags: [],
      userOverrides: false,
      legacySnapshot: null,
      canvas: {
        panX: 40,
        panY: 40,
        zoom: 1,
        selectedId: null,
        selectedIds: [],
        selectedEdgeId: null,
        selectedEdgeIds: [],
        tool: 'select',
        minimapVisible: true,
        inspectorOpen: false,
        inspectorCollapsed: false,
        activeGroupId: null
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
    if (exp.canvas.selectedEdgeId == null) exp.canvas.selectedEdgeId = null;
    if (exp.canvas.inspectorCollapsed == null) exp.canvas.inspectorCollapsed = false;
    if (!Array.isArray(exp.canvas.selectedIds)) {
      exp.canvas.selectedIds = exp.canvas.selectedId ? [exp.canvas.selectedId] : [];
    }
    if (!Array.isArray(exp.canvas.selectedEdgeIds)) {
      exp.canvas.selectedEdgeIds = exp.canvas.selectedEdgeId ? [exp.canvas.selectedEdgeId] : [];
    }
    if (exp.canvas.activeGroupId === undefined) exp.canvas.activeGroupId = null;
    exp.nodes.forEach(normalizeNode);
    exp.edges.forEach(normalizeEdge);
    return exp;
  }

  function kindMeta(kind) {
    return KIND_META[kind] || { typeLabel: 'NODO', accent: 'default', role: 'scene' };
  }

  function normalizeNode(n) {
    if (!n || typeof n !== 'object') return n;
    var meta = kindMeta(n.kind);
    if (!n.typeLabel) n.typeLabel = meta.typeLabel;
    if (!n.accent) n.accent = meta.accent;
    if (!n.role) n.role = meta.role || 'scene';
    if (!Array.isArray(n.ports)) n.ports = [];
    if (n.x == null) n.x = null;
    if (n.y == null) n.y = null;
    if (n.config == null || typeof n.config !== 'object') n.config = {};
    if (n.parentId === undefined) n.parentId = null;
    if (n.locked == null) n.locked = false;
    if (n.protected == null) n.protected = n.kind === 'hero' || n.id === 'exp-hero';
    return n;
  }

  function normalizeEdge(ed) {
    if (!ed || typeof ed !== 'object') return ed;
    if (!ed.id) ed.id = uid('e');

    /* Node endpoints — canonical + legacy aliases */
    var srcNode = ed.sourceNodeId != null ? ed.sourceNodeId
      : (ed.from != null ? ed.from : ed.sourceId);
    var tgtNode = ed.targetNodeId != null ? ed.targetNodeId
      : (ed.to != null ? ed.to : ed.targetId);
    ed.sourceNodeId = srcNode;
    ed.targetNodeId = tgtNode;
    ed.from = srcNode;
    ed.to = tgtNode;
    ed.sourceId = srcNode;
    ed.targetId = tgtNode;

    /* Port endpoints — sourcePortId > sourcePort > portId > 'out' */
    var srcPort = ed.sourcePortId != null && String(ed.sourcePortId) !== ''
      ? ed.sourcePortId
      : (ed.sourcePort != null && String(ed.sourcePort) !== ''
        ? ed.sourcePort
        : (ed.portId != null && String(ed.portId) !== '' ? ed.portId : 'out'));
    ed.sourcePortId = srcPort;
    ed.sourcePort = srcPort;
    ed.portId = srcPort; /* legacy alias */

    var tgtPort = ed.targetPortId != null && String(ed.targetPortId) !== ''
      ? ed.targetPortId
      : (ed.targetPort != null && String(ed.targetPort) !== '' ? ed.targetPort : 'in');
    ed.targetPortId = tgtPort;
    ed.targetPort = tgtPort;

    return ed;
  }

  function resolvePortLabel(node, portId) {
    if (!portId) return '';
    if (!node || !Array.isArray(node.ports)) return String(portId);
    for (var i = 0; i < node.ports.length; i++) {
      if (node.ports[i] && node.ports[i].id === portId) {
        return node.ports[i].label || String(portId);
      }
    }
    return String(portId);
  }

  function node(partial) {
    var n = Object.assign({
      id: uid('exp'),
      kind: 'scene',
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
      userMoved: false,
      ports: [],
      config: {},
      role: 'scene',
      parentId: null
    }, partial || {});
    return normalizeNode(n);
  }

  function edge(fromId, toId, label, extra) {
    extra = extra || {};
    var srcPort = extra.sourcePortId || extra.sourcePort || extra.portId || 'out';
    var tgtPort = extra.targetPortId || extra.targetPort || 'in';
    return normalizeEdge(Object.assign({
      id: uid('e'),
      from: fromId,
      to: toId,
      sourceId: fromId,
      targetId: toId,
      sourceNodeId: fromId,
      targetNodeId: toId,
      label: label || 'flujo',
      sourcePortId: srcPort,
      sourcePort: srcPort,
      portId: srcPort,
      targetPortId: tgtPort,
      targetPort: tgtPort,
      sourcePortLabel: extra.sourcePortLabel || null,
      transitionMedia: null,
      transitionSeconds: 4,
      manual: true
    }, extra));
  }

  /* ── Hero slots: referencias / flujo / acciones (fuente = heroContent + menú) ── */
  function ensureHeroContent(state) {
    if (!state.heroContent || typeof state.heroContent !== 'object') {
      state.heroContent = {};
    }
    var h = state.heroContent;
    if (h.showShare == null) h.showShare = true;
    if (h.showWhatsapp == null) h.showWhatsapp = true;
    if (h.showFullscreen == null) h.showFullscreen = true;
    if (h.whatsappLink == null) h.whatsappLink = '';
    if (h.whatsappMessage == null) h.whatsappMessage = '';
    if (!String(h.botonIzquierdo || '').trim()) h.botonIzquierdo = 'Explorar';
    if (!String(h.botonDerecho || '').trim()) h.botonDerecho = 'Iniciar';
    return h;
  }

  /** Structured hero interactions — roles by BOXIES convention, labels from heroContent. */
  function listHeroSlots(state) {
    var hero = ensureHeroContent(state);
    var left = String(hero.botonIzquierdo || '').trim() || 'Explorar';
    var right = String(hero.botonDerecho || '').trim() || 'Iniciar';

    var navigation = [{
      id: 'hero-explorar',
      label: left,
      role: 'nav',
      reference: { type: 'menu', target: 'menu' },
      source: 'hero.botonIzquierdo'
    }];

    var flow = [{
      id: 'hero-iniciar',
      label: right,
      role: 'flow',
      portId: 'hero-iniciar',
      source: 'hero.botonDerecho'
    }];

    var actions = [
      {
        id: 'hero-share',
        label: 'Compartir',
        role: 'action-toggle',
        field: 'showShare',
        enabled: hero.showShare !== false,
        source: 'hero.showShare'
      },
      {
        id: 'hero-fullscreen',
        label: 'Fullscreen',
        role: 'action-toggle',
        field: 'showFullscreen',
        enabled: hero.showFullscreen !== false,
        source: 'hero.showFullscreen'
      },
      {
        id: 'hero-whatsapp',
        label: 'WhatsApp',
        role: 'action-config',
        field: 'showWhatsapp',
        enabled: hero.showWhatsapp !== false,
        source: 'hero.showWhatsapp',
        whatsappLink: hero.whatsappLink || '',
        whatsappMessage: hero.whatsappMessage || ''
      }
    ];

    return { navigation: navigation, flow: flow, actions: actions };
  }

  /** Legacy API: flat list for callers that still expect it. */
  function listHeroInteractions(state) {
    var slots = listHeroSlots(state);
    return []
      .concat(slots.navigation || [])
      .concat(slots.flow || [])
      .concat(slots.actions || []);
  }

  function setHeroContentField(state, field, value) {
    var hero = ensureHeroContent(state);
    if (field === 'showShare' || field === 'showFullscreen' || field === 'showWhatsapp') {
      hero[field] = !!value;
    } else if (field === 'whatsappLink' || field === 'whatsappMessage' || field === 'shareUrl') {
      hero[field] = String(value == null ? '' : value);
    } else {
      return null;
    }
    return hero;
  }

  function archiveInlineActionNodes(state) {
    var exp = ensureState(state);
    if (!Array.isArray(exp.archivedInlineNodes)) exp.archivedInlineNodes = [];

    /* Always remap legacy INICIAR port id */
    (exp.edges || []).forEach(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      if (from === 'exp-hero' && pid === 'hero-btn-right') {
        ed.sourcePortId = 'hero-iniciar';
        ed.sourcePort = 'hero-iniciar';
        ed.portId = 'hero-iniciar';
        if (!ed.sourcePortLabel) ed.sourcePortLabel = 'Iniciar';
      }
    });

    if (exp.heroSlotsVersion >= 55) return exp;

    var dropPorts = {
      'hero-share': true,
      'hero-fullscreen': true,
      'hero-whatsapp': true,
      'hero-btn-left': true,
      'hero-explorar': true,
      'hero-assistant': true
    };

    var dropTargetIds = {};
    var keptEdges = [];
    var archivedEdges = [];

    (exp.edges || []).forEach(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      if (from === 'exp-hero' && dropPorts[pid]) {
        archivedEdges.push(ed);
        var to = ed.targetNodeId || ed.to || ed.targetId;
        if (to) dropTargetIds[to] = true;
        return;
      }
      keptEdges.push(ed);
    });

    if (!archivedEdges.length) {
      exp.edges = keptEdges;
      exp.heroSlotsVersion = 55;
      return exp;
    }

    var stillLinked = {};
    keptEdges.forEach(function (ed) {
      stillLinked[ed.sourceNodeId || ed.from] = true;
      stillLinked[ed.targetNodeId || ed.to] = true;
    });

    var keptNodes = [];
    (exp.nodes || []).forEach(function (n) {
      if (n.id === 'exp-hero' || n.kind === 'hero') {
        keptNodes.push(n);
        return;
      }
      if (dropTargetIds[n.id] && (n.kind === 'action' || n.role === 'action') && !stillLinked[n.id]) {
        exp.archivedInlineNodes.push({
          at: new Date().toISOString(),
          reason: 'V5.9.55 hero inline action → slot',
          node: n,
          edges: archivedEdges.filter(function (ed) {
            return (ed.targetNodeId || ed.to) === n.id || (ed.sourceNodeId || ed.from) === n.id;
          })
        });
        return;
      }
      keptNodes.push(n);
    });

    if (!exp.inlineActionArchive) {
      exp.inlineActionArchive = {
        at: new Date().toISOString(),
        edges: archivedEdges,
        note: 'Edges de acciones Hero archivados en V5.9.55 (no hard-delete)'
      };
    }

    exp.nodes = keptNodes;
    exp.edges = keptEdges;
    exp.heroSlotsVersion = 55;
    exp.reviewFlags = (exp.reviewFlags || []).concat([{
      severity: 'recomendado',
      message: 'V5.9.55: Compartir/Fullscreen/WhatsApp/Explorar son slots del Hero (fuente Hero/Menú).'
    }]).slice(-8);
    return exp;
  }

  function buildHeroNode(state, prev) {
    ensureHeroContent(state);
    var slots = listHeroSlots(state);
    var flowPorts = (slots.flow || []).map(function (it) {
      return {
        id: it.portId || it.id || 'hero-iniciar',
        label: it.label || 'Iniciar',
        side: 'out',
        kind: 'flow',
        role: 'flow'
      };
    });
    var base = {
      id: 'exp-hero',
      kind: 'hero',
      label: 'Hero',
      typeLabel: 'HERO',
      accent: 'hero',
      role: 'scene',
      entityType: 'proyecto',
      entityKey: 'hero',
      status: 'ready',
      x: prev && prev.x != null ? prev.x : 48,
      y: prev && prev.y != null ? prev.y : 80,
      userMoved: !!(prev && prev.userMoved),
      ports: flowPorts,
      config: {
        subtitle: 'Pantalla inicial',
        slots: slots,
        interactions: listHeroInteractions(state),
        reference: { type: 'hero', target: 'hero' }
      },
      width: HERO_W,
      height: Math.max(HERO_H, 120 + flowPorts.length * 24 +
        ((slots.navigation || []).length + (slots.actions || []).length) * 20),
      protected: true,
      locked: !!(prev && prev.locked)
    };
    if (prev) {
      base.contentRef = prev.contentRef || null;
      base.transitionMedia = prev.transitionMedia || null;
    }
    return normalizeNode(base);
  }

  /* Kept for API compat — ports now only flow (INICIAR) */
  function heroPortsFromInteractions(interactions) {
    return (interactions || []).filter(function (it) {
      return it.role === 'flow' || it.portId;
    }).map(function (it) {
      return {
        id: it.portId || it.id,
        label: it.label,
        side: 'out',
        kind: 'flow',
        role: 'flow'
      };
    });
  }

  function looksLikeLegacyStructureMap(exp) {
    if (!exp || !exp.nodes || !exp.nodes.length) return false;
    if (exp.mode === 'flow' && exp.version >= 2) return false;
    return exp.nodes.some(function (n) {
      return String(n.id || '').indexOf('exp-branch-') === 0 ||
        n.kind === 'componente' || n.kind === 'selector-pisos';
    });
  }

  function snapshotLegacy(exp) {
    try {
      return JSON.parse(JSON.stringify({
        at: new Date().toISOString(),
        version: exp.version || 1,
        mode: exp.mode || 'legacy-map',
        nodes: exp.nodes || [],
        edges: exp.edges || [],
        reviewFlags: exp.reviewFlags || [],
        canvas: exp.canvas || null
      }));
    } catch (e) {
      return { at: new Date().toISOString(), nodes: [], edges: [] };
    }
  }

  /** Ensure flow editor state: Hero seed; migrate legacy map recoverably. */
  function ensureFlow(state, options) {
    options = options || {};
    var exp = ensureState(state);
    var prevHero = exp.nodes.find(function (n) { return n.id === 'exp-hero' || n.kind === 'hero'; });

    if (looksLikeLegacyStructureMap(exp) && !exp.legacySnapshot) {
      exp.legacySnapshot = snapshotLegacy(exp);
      exp.reviewFlags = (exp.reviewFlags || []).concat([{
        severity: 'recomendado',
        message: 'Mapa V5.9.51 conservado como legacy. Experiencia ahora es editor de flujo (Hero → interacciones).'
      }]);
      exp.nodes = [];
      exp.edges = [];
    }

    exp.mode = 'flow';
    exp.version = Math.max(2, exp.version || 2);

    var hero = buildHeroNode(state, prevHero);
    var others = exp.nodes.filter(function (n) {
      return n.id !== 'exp-hero' && n.kind !== 'hero';
    });
    exp.nodes = [hero].concat(others);

    archiveInlineActionNodes(state);

    /* Keep only flow ports from Hero (INICIAR); drop stale action-port edges */
    var portIds = {};
    (hero.ports || []).forEach(function (p) { portIds[p.id] = true; });
    exp.edges = (exp.edges || []).map(normalizeEdge).filter(function (ed) {
      if ((ed.sourceNodeId || ed.from || ed.sourceId) !== hero.id) return true;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      if (pid === 'out' || pid === 'hero-iniciar' || pid === 'hero-btn-right') return true;
      return !!portIds[pid];
    });

    exp.syncedFromApply = true;
    if (options.appliedAt) exp.appliedAt = options.appliedAt;
    return exp;
  }

  /* Keep name used by ArchitectureEngine — now soft: refresh Hero flow, do NOT rebuild structure map */
  function syncFromEstructura(state, options) {
    return ensureFlow(state, options || {});
  }

  function restoreLegacySnapshot(state) {
    var exp = ensureState(state);
    if (!exp.legacySnapshot) return null;
    var snap = exp.legacySnapshot;
    exp.nodes = (snap.nodes || []).map(function (n) { return normalizeNode(Object.assign({}, n)); });
    exp.edges = (snap.edges || []).map(function (e) { return normalizeEdge(Object.assign({}, e)); });
    exp.mode = 'legacy-map';
    exp.reviewFlags = (exp.reviewFlags || []).concat([{
      severity: 'recomendado',
      message: 'Snapshot legacy restaurado temporalmente.'
    }]);
    return exp;
  }

  /* ── Structure library (not auto-nodes) ── */
  function listStructureLibrary(state) {
    var e = (state && state.estructura) || {};
    var items = [];
    items.push({
      id: 'proj-root',
      label: (state.projectInfo && state.projectInfo.nombre) || 'Proyecto',
      kind: 'proyecto',
      capacity: null,
      children: []
    });
    var root = items[0];

    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.listCapacityBuckets) {
      var buckets = EstructuraEngine.listCapacityBuckets(e) || [];
      var byStage = {};
      buckets.forEach(function (b) {
        var stageKey = b.stageId || '_root';
        if (!byStage[stageKey]) byStage[stageKey] = [];
        byStage[stageKey].push(b);
      });
      Object.keys(byStage).forEach(function (sk) {
        var group = {
          id: 'stage-' + sk,
          label: sk === '_root' ? 'Componentes' : ('Etapa · ' + sk),
          kind: 'etapa',
          children: byStage[sk].map(function (b) {
            return {
              id: String(b.id),
              label: b.label || 'Componente',
              kind: b.kind || 'componente',
              capacity: b.capacity || 0,
              stageId: b.stageId || null,
              children: []
            };
          })
        };
        root.children.push(group);
      });
    }

    (e.zoneNames || []).forEach(function (name, i) {
      root.children.push({
        id: 'amenidad-' + i,
        label: name,
        kind: 'amenidad',
        capacity: null,
        children: []
      });
    });

    return items;
  }

  function createNodeFromMenu(state, menuItem, at, fromEdge) {
    var exp = ensureFlow(state);
    fromEdge = fromEdge || null;
    at = at || { x: 320, y: 120 };

    if (menuItem.kind === '_link_existing' || menuItem.kind === '_link_structure') {
      return { needsPicker: menuItem.kind, at: at, fromEdge: fromEdge };
    }

    var role = menuItem.role || kindMeta(menuItem.kind).role;
    var isAction = role === 'action';
    var label = menuItem.label || 'Nodo';
    if (menuItem.kind === 'video') label = 'Animación';
    if (menuItem.kind === 'image') label = 'Vista general';

    var n = node({
      id: uid('flow'),
      kind: menuItem.kind,
      label: label,
      role: role,
      status: isAction ? 'ready' : 'pending',
      x: Math.round(at.x),
      y: Math.round(at.y),
      userMoved: true,
      ports: isAction ? [] : defaultPortsForKind(menuItem.kind),
      config: {
        actionType: menuItem.actionType || null,
        preset: menuItem.preset || null,
        autoplay: menuItem.kind === 'video',
        onEnd: menuItem.kind === 'video' ? 'next' : null,
        fileName: null,
        contentRef: null,
        hotspots: []
      }
    });

    if (menuItem.kind === 'video') {
      n.ports = [
        { id: 'in', label: 'Entrada', side: 'in', kind: 'flow' },
        { id: 'on-end', label: 'Al finalizar', side: 'out', kind: 'flow' }
      ];
    }

    exp.nodes.push(n);

    if (fromEdge && fromEdge.fromId) {
      var srcPortId = fromEdge.portId || fromEdge.sourcePortId || 'out';
      var ed = edge(fromEdge.fromId, n.id, fromEdge.portLabel || menuItem.label || 'flujo', {
        sourcePortId: srcPortId,
        sourcePort: srcPortId,
        portId: srcPortId,
        targetPortId: fromEdge.targetPortId || 'in',
        sourcePortLabel: fromEdge.portLabel || null,
        manual: true,
        inlineAction: isAction && fromEdge.fromId === 'exp-hero'
      });
      exp.edges.push(ed);
      if (isAction) {
        n.role = 'action';
        n.config.inline = true;
      }
    }

    return { node: n };
  }

  function defaultPortsForKind(kind) {
    if (kind === 'action') return [];
    if (kind === 'hotspot') {
      return [
        { id: 'in', label: 'Entrada', side: 'in', kind: 'flow' },
        { id: 'out', label: 'Destino', side: 'out', kind: 'flow' }
      ];
    }
    if (kind === 'video' || kind === 'animacion') {
      return [
        { id: 'in', label: 'Entrada', side: 'in', kind: 'flow' },
        { id: 'on-end', label: 'Al finalizar', side: 'out', kind: 'flow' }
      ];
    }
    return [
      { id: 'in', label: 'Entrada', side: 'in', kind: 'flow' },
      { id: 'out', label: 'Salida', side: 'out', kind: 'flow' }
    ];
  }

  function createStructureLinkedNode(state, item, at, fromEdge) {
    var exp = ensureFlow(state);
    at = at || { x: 360, y: 140 };
    var cap = item.capacity != null ? item.capacity : null;
    var n = node({
      id: uid('struct'),
      kind: 'structure',
      label: item.label || 'Elemento',
      role: 'group',
      status: 'pending',
      x: Math.round(at.x),
      y: Math.round(at.y),
      userMoved: true,
      unitCount: cap,
      entityType: item.kind || 'componente',
      entityKey: String(item.id),
      ports: [
        { id: 'in', label: 'Entrada', side: 'in', kind: 'flow' },
        { id: 'enter', label: 'Entrar', side: 'out', kind: 'flow' }
      ],
      config: {
        structureId: item.id,
        capacity: cap,
        stageId: item.stageId || null,
        group: true
      },
      collapsed: true
    });
    exp.nodes.push(n);
    if (fromEdge && fromEdge.fromId) {
      var sp = fromEdge.portId || fromEdge.sourcePortId || 'out';
      exp.edges.push(edge(fromEdge.fromId, n.id, fromEdge.portLabel || item.label, {
        sourcePortId: sp,
        sourcePort: sp,
        portId: sp,
        targetPortId: fromEdge.targetPortId || 'in',
        sourcePortLabel: fromEdge.portLabel || null,
        manual: true
      }));
    }
    return n;
  }

  function addManualEdge(state, fromId, toId, label, portId, targetPortId) {
    var exp = ensureFlow(state);
    if (fromId === toId) return null;
    var pid = portId || 'out';
    var tpid = targetPortId || 'in';
    var exists = exp.edges.some(function (ed) {
      return (ed.sourceNodeId || ed.from || ed.sourceId) === fromId &&
        (ed.targetNodeId || ed.to || ed.targetId) === toId &&
        (ed.sourcePortId || ed.sourcePort || ed.portId || 'out') === pid;
    });
    if (exists) return null;
    var srcNode = getNode(state, fromId);
    var ed = edge(fromId, toId, label || 'flujo', {
      sourcePortId: pid,
      sourcePort: pid,
      portId: pid,
      targetPortId: tpid,
      sourcePortLabel: resolvePortLabel(srcNode, pid) || label || null,
      manual: true
    });
    exp.edges.push(ed);
    return ed;
  }

  function removeEdge(state, edgeId) {
    var exp = ensureState(state);
    var before = exp.edges.length;
    exp.edges = exp.edges.filter(function (ed) { return ed.id !== edgeId; });
    if (exp.canvas && exp.canvas.selectedEdgeId === edgeId) exp.canvas.selectedEdgeId = null;
    return before !== exp.edges.length;
  }

  function reconnectEdge(state, edgeId, newToId) {
    var exp = ensureState(state);
    var ed = exp.edges.find(function (e) { return e.id === edgeId; });
    if (!ed || !newToId || newToId === (ed.sourceNodeId || ed.from || ed.sourceId)) return null;
    ed.to = newToId;
    ed.targetId = newToId;
    ed.targetNodeId = newToId;
    if (!ed.targetPortId) ed.targetPortId = 'in';
    if (!ed.targetPort) ed.targetPort = ed.targetPortId;
    return normalizeEdge(ed);
  }

  function setNodePosition(state, nodeId, x, y, markMoved) {
    var exp = ensureState(state);
    var n = exp.nodes.find(function (node) { return node.id === nodeId; });
    if (!n) return null;
    if (isLockedNode(n)) return n;
    n.x = Math.round(x);
    n.y = Math.round(y);
    if (markMoved !== false) {
      n.userMoved = true;
      n.userEdited = true;
    }
    return n;
  }

  function getNode(state, id) {
    var exp = ensureState(state);
    return exp.nodes.find(function (n) { return n.id === id; }) || null;
  }

  function getEdge(state, id) {
    var exp = ensureState(state);
    return exp.edges.find(function (e) { return e.id === id; }) || null;
  }

  function connectionsFor(state, nodeId) {
    var exp = ensureState(state);
    return {
      in: exp.edges.filter(function (ed) {
        return (ed.targetNodeId || ed.to || ed.targetId) === nodeId;
      }),
      out: exp.edges.filter(function (ed) {
        return (ed.sourceNodeId || ed.from || ed.sourceId) === nodeId;
      })
    };
  }

  function nodeSize(n) {
    if (!n) return { w: NODE_W, h: NODE_H };
    if (n.kind === 'hero') {
      return {
        w: n.width || HERO_W,
        h: n.height || Math.max(HERO_H, 72 + ((n.ports || []).length * 22))
      };
    }
    var outs = (n.ports || []).filter(function (p) { return p.side !== 'in'; });
    var extra = outs.length > 1 ? Math.max(0, (outs.length - 1) * 20) : 0;
    if (n.config && n.config.hotspots && n.config.hotspots.length) {
      extra = Math.max(extra, n.config.hotspots.length * 20);
    }
    return {
      w: n.width || NODE_W,
      h: (n.height || NODE_H) + extra
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
      var s = nodeSize(n);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + s.w);
      maxY = Math.max(maxY, n.y + s.h);
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function infoLine(n) {
    if (!n) return '';
    if (n.kind === 'hero') return (n.config && n.config.subtitle) || 'Pantalla inicial';
    if (n.kind === 'video') {
      return (n.config && n.config.fileName) || 'Sin archivo · Al finalizar';
    }
    if (n.kind === 'image' || n.kind === 'plan' || n.kind === 'pano360') {
      return (n.config && n.config.fileName) || 'Sin archivo';
    }
    if (n.kind === 'action') {
      return (n.config && n.config.actionType) || 'Acción';
    }
    if (n.kind === 'structure' || n.kind === 'group') {
      var c = n.unitCount != null ? n.unitCount : (n.config && n.config.capacity);
      if (c != null) return c + (c === 1 ? ' vivienda' : ' viviendas');
    }
    if (n.kind === 'hotspot') return (n.config && n.config.targetLabel) || 'Sin destino';
    return '';
  }

  function statusLabel(n) {
    if (!n) return 'Pendiente';
    if (n.orphaned || n.status === 'review') return 'Revisión';
    if (n.status === 'ready') return 'Listo';
    if (n.status === 'error') return 'Error';
    if (n.kind === 'action') return 'Acción';
    return 'Pendiente';
  }

  function summary(state) {
    var exp = ensureState(state);
    ensureFlow(state);
    var active = (exp.nodes || []).filter(function (n) { return !n.orphaned; }).length;
    if (exp.legacySnapshot) return active + ' nodos · legacy OK';
    return active ? (active + ' nodos') : 'Hero';
  }

  function incompleteNodes(state) {
    var exp = ensureFlow(state);
    return (exp.nodes || []).filter(function (n) {
      return !n.orphaned && n.kind !== 'hero' && n.role !== 'action' && n.status === 'pending';
    });
  }

  function visibleNodes(state) {
    var exp = ensureFlow(state);
    var gid = exp.canvas && exp.canvas.activeGroupId;
    return (exp.nodes || []).filter(function (n) {
      if (n.orphaned) return true;
      if (!gid) return !n.parentId;
      return n.parentId === gid || n.id === gid;
    });
  }

  function enterGroup(state, groupId) {
    var exp = ensureFlow(state);
    exp.canvas.activeGroupId = groupId || null;
    return exp;
  }

  function exitGroup(state) {
    var exp = ensureFlow(state);
    exp.canvas.activeGroupId = null;
    return exp;
  }

  /* ── Legacy map API (recoverable) ── */
  function legacyBuildFromEstructura(estructura, architecture) {
    /* Minimal stub preserving callable API — full legacy lives in snapshot when migrated */
    void architecture;
    var e = estructura || {};
    var hero = node({
      id: 'exp-hero',
      kind: 'hero',
      label: 'Hero',
      status: 'ready'
    });
    return {
      nodes: [hero],
      edges: [],
      reviewFlags: [{
        severity: 'recomendado',
        message: 'Legacy buildFromEstructura desactivado en V5.9.52. Usa legacySnapshot / restoreLegacySnapshot.'
      }],
      developmentType: e.developmentType || null
    };
  }

  function autoLayout(nodes, edges, options) {
    options = options || {};
    var onlyMissing = options.onlyMissing !== false;
    var list = nodes || [];
    list.forEach(function (n, i) {
      if (onlyMissing && n.x != null && n.y != null) return;
      if (n.userMoved && onlyMissing) return;
      if (n.kind === 'hero') {
        n.x = 48;
        n.y = 80;
        return;
      }
      n.x = 360 + (i % 3) * (NODE_W + GAP_X);
      n.y = 60 + Math.floor(i / 3) * (NODE_H + GAP_Y);
    });
    return list;
  }

  function forceRelayout(state) {
    var exp = ensureFlow(state);
    exp.nodes.forEach(function (n) {
      if (n.kind === 'hero') return;
      n.userMoved = false;
      n.x = null;
      n.y = null;
    });
    autoLayout(exp.nodes, exp.edges, { onlyMissing: false });
    return exp;
  }

  function isProtectedNode(n) {
    if (!n) return true;
    return !!(n.protected || n.kind === 'hero' || n.id === 'exp-hero');
  }

  function isLockedNode(n) {
    return !!(n && n.locked);
  }

  function deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { return obj; }
  }

  function unlinkNode(state, nodeId) {
    var exp = ensureState(state);
    var before = exp.edges.length;
    exp.edges = exp.edges.filter(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      return s !== nodeId && t !== nodeId;
    });
    if (exp.canvas.selectedEdgeId) {
      var still = exp.edges.some(function (e) { return e.id === exp.canvas.selectedEdgeId; });
      if (!still) {
        exp.canvas.selectedEdgeId = null;
        exp.canvas.selectedEdgeIds = [];
      }
    }
    return before - exp.edges.length;
  }

  function unlinkNodes(state, nodeIds) {
    var set = {};
    (nodeIds || []).forEach(function (id) { set[id] = true; });
    var exp = ensureState(state);
    var removed = 0;
    exp.edges = exp.edges.filter(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      if (set[s] || set[t]) { removed++; return false; }
      return true;
    });
    return removed;
  }

  function removeNode(state, nodeId, options) {
    options = options || {};
    var exp = ensureState(state);
    var n = getNode(state, nodeId);
    if (!n) return { ok: false, reason: 'missing' };
    if (isProtectedNode(n) && !options.force) {
      return { ok: false, reason: 'protected' };
    }
    if (isLockedNode(n) && !options.force) {
      return { ok: false, reason: 'locked' };
    }
    unlinkNode(state, nodeId);
    exp.nodes = exp.nodes.filter(function (node) { return node.id !== nodeId; });
    exp.canvas.selectedIds = (exp.canvas.selectedIds || []).filter(function (id) { return id !== nodeId; });
    if (exp.canvas.selectedId === nodeId) {
      exp.canvas.selectedId = exp.canvas.selectedIds[0] || null;
    }
    return { ok: true, node: n };
  }

  function removeNodes(state, nodeIds) {
    var results = { removed: [], skipped: [] };
    (nodeIds || []).forEach(function (id) {
      var r = removeNode(state, id);
      if (r.ok) results.removed.push(id);
      else results.skipped.push({ id: id, reason: r.reason });
    });
    return results;
  }

  function setNodesLocked(state, nodeIds, locked) {
    var exp = ensureState(state);
    var count = 0;
    (nodeIds || []).forEach(function (id) {
      var n = getNode(state, id);
      if (!n || isProtectedNode(n)) return;
      n.locked = !!locked;
      count++;
    });
    void exp;
    return count;
  }

  function duplicateNode(state, nodeId, offset) {
    offset = offset || { x: 36, y: 36 };
    var exp = ensureFlow(state);
    var src = getNode(state, nodeId);
    if (!src || isProtectedNode(src)) return null;
    var copy = deepClone(src);
    copy.id = uid('flow');
    copy.x = Math.round((src.x || 0) + (offset.x || 36));
    copy.y = Math.round((src.y || 0) + (offset.y || 36));
    copy.userMoved = true;
    copy.locked = false;
    copy.protected = false;
    /* Do not copy edges — caller handles selection-internal edges */
    exp.nodes.push(normalizeNode(copy));
    return copy;
  }

  /** Duplicate selection; remap internal edges only. */
  function duplicateSelection(state, nodeIds) {
    var ids = (nodeIds || []).slice();
    var exp = ensureFlow(state);
    var idMap = {};
    var created = [];
    ids.forEach(function (id) {
      var src = getNode(state, id);
      if (!src || isProtectedNode(src)) return;
      var copy = deepClone(src);
      copy.id = uid('flow');
      copy.x = Math.round((src.x || 0) + 40);
      copy.y = Math.round((src.y || 0) + 40);
      copy.userMoved = true;
      copy.locked = false;
      copy.protected = false;
      idMap[id] = copy.id;
      exp.nodes.push(normalizeNode(copy));
      created.push(copy);
    });
    (exp.edges || []).slice().forEach(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      if (!idMap[s] || !idMap[t]) return;
      exp.edges.push(edge(idMap[s], idMap[t], ed.label || 'flujo', {
        sourcePortId: ed.sourcePortId || ed.sourcePort || ed.portId || 'out',
        targetPortId: ed.targetPortId || ed.targetPort || 'in',
        sourcePortLabel: ed.sourcePortLabel || null,
        manual: true,
        inlineAction: !!ed.inlineAction
      }));
    });
    return { nodes: created, idMap: idMap };
  }

  function clearSelection(state) {
    var exp = ensureState(state);
    exp.canvas.selectedId = null;
    exp.canvas.selectedIds = [];
    exp.canvas.selectedEdgeId = null;
    exp.canvas.selectedEdgeIds = [];
    return exp;
  }

  function setSelection(state, nodeIds, edgeIds) {
    var exp = ensureState(state);
    var ids = (nodeIds || []).filter(Boolean);
    var eids = (edgeIds || []).filter(Boolean);
    exp.canvas.selectedIds = ids;
    exp.canvas.selectedId = ids.length ? ids[ids.length - 1] : null;
    exp.canvas.selectedEdgeIds = eids;
    exp.canvas.selectedEdgeId = eids.length ? eids[eids.length - 1] : null;
    /* Inspector open/collapsed is owned by canvas UI (V5.9.56) */
    return exp;
  }

  function toggleSelectionId(state, nodeId) {
    var exp = ensureState(state);
    var ids = (exp.canvas.selectedIds || []).slice();
    var idx = ids.indexOf(nodeId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(nodeId);
    return setSelection(state, ids, []);
  }

  function addHotspotToScene(state, sceneId, label) {
    var exp = ensureFlow(state);
    var scene = getNode(state, sceneId);
    if (!scene) return null;
    if (!scene.config) scene.config = {};
    if (!Array.isArray(scene.config.hotspots)) scene.config.hotspots = [];
    var hs = {
      id: uid('hs'),
      label: label || ('Hotspot ' + (scene.config.hotspots.length + 1))
    };
    scene.config.hotspots.push(hs);
    var portId = 'hs-' + hs.id;
    scene.ports = (scene.ports || []).filter(function (p) { return p.id !== portId; });
    scene.ports.push({
      id: portId,
      label: hs.label,
      side: 'out',
      kind: 'hotspot',
      hotspotId: hs.id
    });
    scene.status = 'pending';
    return hs;
  }

  return {
    NODE_W: NODE_W,
    NODE_H: NODE_H,
    HERO_W: HERO_W,
    HERO_H: HERO_H,
    KIND_META: KIND_META,
    CREATE_MENU: CREATE_MENU,
    emptyState: emptyState,
    ensureState: ensureState,
    ensureFlow: ensureFlow,
    syncFromEstructura: syncFromEstructura,
    buildFromEstructura: legacyBuildFromEstructura,
    legacyBuildFromEstructura: legacyBuildFromEstructura,
    restoreLegacySnapshot: restoreLegacySnapshot,
    listHeroInteractions: listHeroInteractions,
    listHeroSlots: listHeroSlots,
    setHeroContentField: setHeroContentField,
    ensureHeroContent: ensureHeroContent,
    archiveInlineActionNodes: archiveInlineActionNodes,
    listStructureLibrary: listStructureLibrary,
    createNodeFromMenu: createNodeFromMenu,
    createStructureLinkedNode: createStructureLinkedNode,
    addManualEdge: addManualEdge,
    removeEdge: removeEdge,
    reconnectEdge: reconnectEdge,
    setNodePosition: setNodePosition,
    getNode: getNode,
    getEdge: getEdge,
    connectionsFor: connectionsFor,
    bounds: bounds,
    nodeSize: nodeSize,
    infoLine: infoLine,
    statusLabel: statusLabel,
    kindMeta: kindMeta,
    summary: summary,
    incompleteNodes: incompleteNodes,
    normalizeNode: normalizeNode,
    normalizeEdge: normalizeEdge,
    resolvePortLabel: resolvePortLabel,
    autoLayout: autoLayout,
    forceRelayout: forceRelayout,
    visibleNodes: visibleNodes,
    enterGroup: enterGroup,
    exitGroup: exitGroup,
    addHotspotToScene: addHotspotToScene,
    isProtectedNode: isProtectedNode,
    isLockedNode: isLockedNode,
    unlinkNode: unlinkNode,
    unlinkNodes: unlinkNodes,
    removeNode: removeNode,
    removeNodes: removeNodes,
    setNodesLocked: setNodesLocked,
    duplicateNode: duplicateNode,
    duplicateSelection: duplicateSelection,
    clearSelection: clearSelection,
    setSelection: setSelection,
    toggleSelectionId: toggleSelectionId
  };
})();
