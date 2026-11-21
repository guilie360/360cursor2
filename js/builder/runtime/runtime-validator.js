/* BOXIES RuntimeValidator — independent compile-time checks (extensible). */
var RuntimeValidator = (function () {
  function edgeEnds(ed) {
    return {
      from: ed.sourceNodeId || ed.from || ed.sourceId || null,
      to: ed.targetNodeId || ed.to || ed.targetId || null
    };
  }

  function indexById(list) {
    var map = {};
    (list || []).forEach(function (item) {
      if (item && item.id != null) map[String(item.id)] = item;
    });
    return map;
  }

  function addCheck(list, id, label, ok, detail) {
    list.push({
      id: id,
      label: label,
      ok: !!ok,
      detail: detail || null
    });
  }

  function findHero(nodes) {
    for (var i = 0; i < (nodes || []).length; i++) {
      var n = nodes[i];
      if (n && (n.kind === 'hero' || n.role === 'hero')) return n;
    }
    return null;
  }

  function isSceneLike(n) {
    if (!n) return false;
    if (n.kind === 'hero' || n.role === 'action') return false;
    return true;
  }

  /**
   * Each check is independent — add new validators without rewriting existing ones.
   */
  function validate(state, runtime) {
    var checks = [];
    var flow = (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.readFlow)
      ? RuntimeSerializer.readFlow(state)
      : { nodes: ((state && state.experiencia) || {}).nodes || [], edges: ((state && state.experiencia) || {}).edges || [] };
    var nodes = flow.nodes || [];
    var edges = flow.edges || [];
    var byId = indexById(nodes);
    var hero = findHero(nodes);
    var assets = (runtime && runtime.assets) ||
      ((typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.collectAssets)
        ? RuntimeSerializer.collectAssets(state)
        : []);
    var assetById = indexById(assets);

    /* ✔ Hero encontrado */
    addCheck(checks, 'hero-found', 'Hero encontrado', !!hero,
      hero ? (hero.label || hero.id) : 'No hay nodo Hero en Experiencia');

    /* ✔ Intro conectado (salida desde Hero) */
    var introConnected = false;
    var introLabel = null;
    if (hero) {
      for (var ei = 0; ei < edges.length; ei++) {
        var ends = edgeEnds(edges[ei]);
        if (ends.from === hero.id && ends.to && byId[ends.to]) {
          introConnected = true;
          introLabel = byId[ends.to].label || byId[ends.to].id;
          break;
        }
      }
    }
    addCheck(checks, 'intro-connected', 'Intro conectado', introConnected,
      introConnected ? ('→ ' + introLabel) : 'Hero no tiene salida de flujo');

    /* ✔ Canvas cargado */
    var canvasOk = nodes.length > 0;
    addCheck(checks, 'canvas-loaded', 'Canvas cargado', canvasOk,
      canvasOk ? (nodes.length + (nodes.length === 1 ? ' nodo' : ' nodos')) : 'Experiencia vacía');

    /* ✔ Media sincronizada */
    var mediaOk = assets.length > 0 ||
      !!(state && state.bunnyMedia && state.bunnyMedia.items && state.bunnyMedia.items.length) ||
      !!(state && state.experiencia && state.experiencia.syncedFromApply);
    addCheck(checks, 'media-synced', 'Media sincronizada', mediaOk,
      assets.length ? (assets.length + ' asset(s) en inventario') : 'Sin inventario Media');

    /* ✔ Assets encontrados */
    addCheck(checks, 'assets-found', 'Assets encontrados', assets.length > 0,
      assets.length ? (assets.length + ' disponibles') : 'Inventario Media vacío');

    /* ✔ HUB válido — Media Plantas 2D via hub.selectedPlants (not canvas) */
    var hubs = nodes.filter(function (n) {
      return n && n.config && n.config.hub && n.config.hub.enabled;
    });
    var hubsInvalid = hubs.filter(function (n) {
      var hub = n.config.hub || {};
      var selected = Array.isArray(hub.selectedPlants) ? hub.selectedPlants : null;
      if (selected) return selected.length === 0;
      /* Legacy fallback only if selectedPlants never seeded */
      var floors = hub.floors || [];
      var options = hub.options || [];
      return floors.length === 0 && options.length === 0;
    });
    var hubOk = hubs.length === 0 || hubsInvalid.length === 0;
    addCheck(checks, 'hub-valid', 'HUB válido', hubOk,
      hubs.length
        ? (hubsInvalid.length
          ? (hubsInvalid.length + ' HUB sin plantas (selectedPlants vacío)')
          : (hubs.length + ' HUB ok'))
        : 'Sin HUB activos');

    /* ✔ Conexiones completas (escenas alcanzables desde Hero) */
    var reachable = {};
    if (hero) {
      var queue = [hero.id];
      reachable[hero.id] = true;
      while (queue.length) {
        var cur = queue.shift();
        edges.forEach(function (ed) {
          var e = edgeEnds(ed);
          if (e.from === cur && e.to && !reachable[e.to] && byId[e.to]) {
            reachable[e.to] = true;
            queue.push(e.to);
          }
        });
      }
    }
    var sceneNodes = nodes.filter(isSceneLike);
    var unreachable = sceneNodes.filter(function (n) { return !reachable[n.id]; });
    addCheck(checks, 'connections-complete', 'Conexiones completas',
      !!hero && unreachable.length === 0,
      unreachable.length
        ? (unreachable.length + ' nodo(s) fuera del flujo')
        : (hero ? 'Grafo conectado desde Hero' : 'Sin Hero'));

    /* ❌ Video / media sin asignar en escenas */
    var missingMedia = sceneNodes.filter(function (n) {
      if (!n || n.orphaned) return false;
      var kind = String(n.kind || '');
      var needsMedia = kind === 'video' || kind === 'animacion' || kind === 'image' ||
        kind === 'scene' || kind === 'vista' || kind === 'planta-3d' || kind === 'gallery';
      if (!needsMedia) return false;
      var cfg = n.config || {};
      if (cfg.assetId && (assetById[cfg.assetId] ||
        (state.projectAssets && state.projectAssets.byId && state.projectAssets.byId[cfg.assetId]))) {
        return false;
      }
      return !cfg.fileName;
    });
    addCheck(checks, 'media-assigned', 'Media asignada a escenas', missingMedia.length === 0,
      missingMedia.length
        ? (missingMedia.length === 1
          ? ('Video/media sin asignar: ' + (missingMedia[0].label || missingMedia[0].id))
          : (missingMedia.length + ' escenas sin media'))
        : 'Todas las escenas con media tienen referencia');

    /* ❌ Nodo aislado (sin entradas ni salidas, no Hero) */
    var degree = {};
    nodes.forEach(function (n) { if (n) degree[n.id] = { in: 0, out: 0 }; });
    edges.forEach(function (ed) {
      var e = edgeEnds(ed);
      if (e.from && degree[e.from]) degree[e.from].out++;
      if (e.to && degree[e.to]) degree[e.to].in++;
    });
    var isolated = nodes.filter(function (n) {
      if (!n || n.kind === 'hero') return false;
      var d = degree[n.id] || { in: 0, out: 0 };
      return d.in === 0 && d.out === 0;
    });
    addCheck(checks, 'no-isolated', 'Sin nodos aislados', isolated.length === 0,
      isolated.length
        ? (isolated.length === 1
          ? ('Nodo aislado: ' + (isolated[0].label || isolated[0].id))
          : (isolated.length + ' nodos aislados'))
        : 'Ningún nodo aislado');

    /* ❌ Asset inexistente (referencias rotas) */
    var brokenRefs = [];
    nodes.forEach(function (n) {
      if (!n || !n.config) return;
      var aid = n.config.assetId;
      if (!aid) return;
      var exists = !!(assetById[aid] ||
        (state.projectAssets && state.projectAssets.byId && state.projectAssets.byId[aid]));
      if (!exists) brokenRefs.push(n.label || n.id);
      var hub = n.config.hub;
      if (hub && Array.isArray(hub.floors)) {
        hub.floors.forEach(function (f) {
          [f.asset2dId, f.asset3dId].forEach(function (fid) {
            if (!fid) return;
            var ok = !!(assetById[fid] ||
              (state.projectAssets && state.projectAssets.byId && state.projectAssets.byId[fid]));
            if (!ok) brokenRefs.push((n.label || n.id) + ' · planta');
          });
        });
      }
    });
    addCheck(checks, 'assets-exist', 'Assets existentes', brokenRefs.length === 0,
      brokenRefs.length
        ? ('Asset inexistente: ' + brokenRefs.slice(0, 3).join(', ') +
          (brokenRefs.length > 3 ? '…' : ''))
        : 'Referencias de assets válidas');

    return {
      checks: checks,
      passed: checks.filter(function (c) { return c.ok; }).length,
      failed: checks.filter(function (c) { return !c.ok; }).length,
      ok: checks.every(function (c) { return c.ok; })
    };
  }

  return {
    validate: validate
  };
})();
