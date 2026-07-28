/* BOXIES V5.9.72 — Media Tours 360 (Lapentor) linked to Canvas node_id */
var MediaToursEngine = (function () {
  function uid(prefix) {
    return (prefix || 'tour') + '-' + Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7);
  }

  function emptyLibrary(projectId) {
    return {
      version: 2,
      projectId: projectId || null,
      scenes: [],
      seededAt: null,
      updatedAt: null
    };
  }

  function ensureState(state, projectId) {
    if (!state.mediaTours || typeof state.mediaTours !== 'object') {
      state.mediaTours = emptyLibrary(projectId);
    }
    if (!Array.isArray(state.mediaTours.scenes)) state.mediaTours.scenes = [];
    if (projectId && !state.mediaTours.projectId) state.mediaTours.projectId = projectId;
    return state.mediaTours;
  }

  function collectStructureScenes(state) {
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.listCompatibleNodes) {
      return MediaNodesEngine.listCompatibleNodes(state).map(function (n) {
        return {
          nombre: n.label || n.nombre,
          tipo: n.tipo || n.kind,
          estructura_id: n.estructura_id || n.node_id,
          node_id: n.node_id,
          entityRef: n.entityRef
        };
      });
    }
    /* Fallback without MediaNodesEngine */
    var out = [];
    var e = state && state.estructura;
    if (!e) return out;
    (e.tipologias || []).forEach(function (tip, i) {
      var nid = tip.node_id || tip.id || tip.localId || ('tip-local-' + i);
      out.push({
        nombre: tip.nombre || tip.modelo || ('Tipología ' + (i + 1)),
        tipo: 'tipologia',
        estructura_id: tip.id || tip.localId || nid,
        node_id: nid,
        entityRef: { type: 'tipologia', key: String(nid), node_id: nid }
      });
    });
    (e.zoneNames || []).forEach(function (name) {
      var n = String(name || '').trim();
      if (!n) return;
      var nid = 'zona:' + n.toLowerCase().replace(/\s+/g, '-');
      out.push({
        nombre: n,
        tipo: 'zona',
        estructura_id: nid,
        node_id: nid,
        entityRef: { type: 'amenidad', key: n, node_id: nid }
      });
    });
    return out;
  }

  function makeScene(partial, projectId, orden) {
    var now = new Date().toISOString();
    var nodeId = (partial && (partial.node_id || partial.estructura_id)) || null;
    return {
      id: (partial && partial.id) || uid('tour'),
      nombre: (partial && partial.nombre) || 'Escena',
      tipo: (partial && partial.tipo) || 'manual',
      url: (partial && partial.url) || '',
      orden: partial && partial.orden != null ? partial.orden : (orden != null ? orden : 0),
      project_id: (partial && partial.project_id) || projectId || null,
      estructura_id: (partial && partial.estructura_id) || nodeId,
      node_id: nodeId,
      origen: (partial && partial.origen) || 'manual',
      entityRef: (partial && partial.entityRef) || null,
      assetId: (partial && partial.assetId) || null,
      archivoId: (partial && partial.archivoId) || null,
      updatedAt: now,
      createdAt: (partial && partial.createdAt) || now
    };
  }

  function sceneKey(s) {
    if (!s) return '';
    return String(s.node_id || s.estructura_id || s.id || '');
  }

  function syncFromEstructura(state, projectId) {
    if (typeof MediaNodesEngine !== 'undefined') MediaNodesEngine.ensureNodeIds(state);
    var lib = ensureState(state, projectId);
    var desired = collectStructureScenes(state);
    var byKey = {};
    lib.scenes.forEach(function (s) {
      var k = sceneKey(s);
      if (k) byKey[k] = s;
    });

    var next = [];
    var used = {};
    desired.forEach(function (d, i) {
      var key = String(d.node_id || d.estructura_id);
      var prev = byKey[key];
      used[key] = true;
      if (prev) {
        prev.tipo = d.tipo;
        prev.origen = 'estructura';
        prev.entityRef = d.entityRef;
        prev.node_id = d.node_id || prev.node_id;
        prev.estructura_id = d.estructura_id || prev.estructura_id;
        prev.project_id = projectId || prev.project_id;
        if (!prev.nombre || prev._autoName) {
          prev.nombre = d.nombre;
          prev._autoName = true;
        }
        prev.orden = i;
        next.push(prev);
      } else {
        next.push(makeScene({
          nombre: d.nombre,
          tipo: d.tipo,
          estructura_id: d.estructura_id,
          node_id: d.node_id,
          origen: 'estructura',
          entityRef: d.entityRef,
          _autoName: true
        }, projectId, i));
      }
    });

    lib.scenes.forEach(function (s) {
      if (!s) return;
      if (s.origen === 'manual') {
        next.push(s);
        return;
      }
      var k = sceneKey(s);
      if (k && used[k]) return;
      if (s.url && String(s.url).trim()) next.push(s);
    });

    next.forEach(function (s, i) { s.orden = i; });
    lib.scenes = next;
    lib.seededAt = new Date().toISOString();
    lib.updatedAt = lib.seededAt;
    lib.projectId = projectId || lib.projectId;
    return lib;
  }

  function addScene(state, projectId, partial) {
    var lib = ensureState(state, projectId);
    var scene = makeScene(Object.assign({ origen: 'manual', tipo: 'manual' }, partial || {}),
      projectId, lib.scenes.length);
    lib.scenes.push(scene);
    lib.updatedAt = new Date().toISOString();
    return scene;
  }

  function removeScene(state, sceneId) {
    var lib = ensureState(state);
    lib.scenes = (lib.scenes || []).filter(function (s) { return s && s.id !== sceneId; });
    lib.scenes.forEach(function (s, i) { s.orden = i; });
    lib.updatedAt = new Date().toISOString();
    return lib;
  }

  function updateScene(state, sceneId, patch) {
    var lib = ensureState(state);
    var scene = (lib.scenes || []).find(function (s) { return s && s.id === sceneId; });
    if (!scene) return null;
    Object.keys(patch || {}).forEach(function (k) {
      if (patch[k] !== undefined) scene[k] = patch[k];
    });
    if (patch && patch.nombre != null) scene._autoName = false;
    scene.updatedAt = new Date().toISOString();
    lib.updatedAt = scene.updatedAt;
    return scene;
  }

  function syncScenesToProjectAssets(state) {
    if (!state || typeof ExperienciaEngine === 'undefined') return [];
    var lib = ensureState(state);
    var synced = [];
    (lib.scenes || []).forEach(function (s) {
      if (!s || !String(s.url || '').trim()) return;
      var asset = ExperienciaEngine.upsertAsset(state, {
        id: s.assetId || ('tour-' + s.id),
        type: 'pano360',
        filename: s.nombre || 'tour-360',
        provider: 'lapentor',
        storagePath: null,
        publicUrl: String(s.url).trim(),
        thumbnailUrl: null,
        status: 'synced',
        archivoId: s.archivoId || null,
        nodeId: s.node_id || s.estructura_id || null,
        entityRef: s.entityRef || null
      });
      s.assetId = asset.id;
      synced.push(asset);
    });
    return synced;
  }

  async function persistScenesToArchivos(state, projectId, constructoraId) {
    if (!projectId || typeof AdminApi === 'undefined' || !AdminApi.getClient) {
      return { ok: false, error: 'Sin cliente' };
    }
    var lib = ensureState(state, projectId);
    var client = AdminApi.getClient();
    var cid = constructoraId;
    if (!cid) {
      try {
        var proj = await client.from('proyectos').select('constructora_id').eq('id', projectId).maybeSingle();
        cid = proj.data && proj.data.constructora_id;
      } catch (e) { /* ignore */ }
    }
    if (!cid) return { ok: false, error: 'Sin constructora_id' };

    var saved = 0;
    for (var i = 0; i < lib.scenes.length; i++) {
      var s = lib.scenes[i];
      var url = String(s.url || '').trim();
      if (!url) continue;
      var nodeKey = s.node_id || s.estructura_id || s.id;
      var payload = {
        constructora_id: cid,
        proyecto_id: projectId,
        tipo: 'tour_360',
        nombre: s.nombre || 'Tour 360',
        extension: 'url',
        url: url,
        storage_provider: 'lapentor',
        storage_path: 'tours/' + nodeKey,
        estado: 'activo',
        orden: s.orden != null ? s.orden : i
      };

      if (s.archivoId) {
        var up = await client.from('archivos').update(payload).eq('id', s.archivoId).eq('proyecto_id', projectId).select('id').maybeSingle();
        if (up.error) {
          var ins = await client.from('archivos').insert(payload).select('id').single();
          if (!ins.error && ins.data) s.archivoId = ins.data.id;
        } else if (up.data) {
          saved++;
        }
      } else {
        var created = await client.from('archivos').insert(payload).select('id').single();
        if (!created.error && created.data) {
          s.archivoId = created.data.id;
          saved++;
        }
      }
    }
    syncScenesToProjectAssets(state);
    lib.updatedAt = new Date().toISOString();
    return { ok: true, saved: saved };
  }

  function summary(state) {
    var lib = state && state.mediaTours;
    if (!lib || !lib.scenes) return 'Sin escenas';
    var n = lib.scenes.length;
    var withUrl = lib.scenes.filter(function (s) { return s && String(s.url || '').trim(); }).length;
    if (!n) return 'Sin escenas';
    return withUrl + '/' + n + ' con URL';
  }

  return {
    ensureState: ensureState,
    collectStructureScenes: collectStructureScenes,
    syncFromEstructura: syncFromEstructura,
    addScene: addScene,
    removeScene: removeScene,
    updateScene: updateScene,
    syncScenesToProjectAssets: syncScenesToProjectAssets,
    persistScenesToArchivos: persistScenesToArchivos,
    summary: summary,
    makeScene: makeScene
  };
})();
