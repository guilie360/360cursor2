/**
 * Quotation ↔ Showroom Experiencia bridge (V7.2.13).
 *
 * Does NOT reimplement buttons/hotspots editing.
 * Builds a minimal ExperienciaEngine state from Quotation scenes and mounts
 * ExperienciaCanvas.mountOverlay onto the design frame.
 */
var QuotationExperienciaBridge = (function () {
  var NODE_PREFIX = 'qe-';

  function nodeIdForScene(sceneId) {
    return NODE_PREFIX + String(sceneId || '');
  }

  function sceneIdFromNode(nodeId) {
    var s = String(nodeId || '');
    if (s.indexOf(NODE_PREFIX) === 0) return s.slice(NODE_PREFIX.length);
    return s;
  }

  function cloneJson(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  /** Migrate legacy flat buttons/hotspots → interactions[] (Showroom SSOT). */
  function ensureSceneInteractions(scene) {
    if (!scene) return [];
    if (!Array.isArray(scene.interactions)) scene.interactions = [];

    if (Array.isArray(scene.buttons) && scene.buttons.length) {
      scene.buttons.forEach(function (b) {
        if (!b || !b.id) return;
        var exists = scene.interactions.some(function (ix) {
          return String(ix.id) === String(b.id);
        });
        if (exists) return;
        scene.interactions.push({
          id: b.id,
          portId: b.id,
          type: 'BUTTON',
          label: b.label != null ? b.label : 'Botón',
          x: b.x != null ? b.x : 50,
          y: b.y != null ? b.y : 50,
          style: b.style || 'chip',
          icon: b.icon || null,
          rotation: b.rotation != null ? b.rotation : 0,
          enabled: b.visible !== false,
          positionMode: 'free',
          positionInitialized: true,
          targetSceneId: b.targetSceneId || null,
          action: b.action || 'goto-scene'
        });
      });
      scene.buttons = [];
    }

    if (Array.isArray(scene.hotspots) && scene.hotspots.length) {
      scene.hotspots.forEach(function (h) {
        if (!h || !h.id) return;
        var exists = scene.interactions.some(function (ix) {
          return String(ix.id) === String(h.id);
        });
        if (exists) return;
        scene.interactions.push({
          id: h.id,
          portId: h.id,
          type: 'HOTSPOT',
          shape: 'polygon',
          polygon: Array.isArray(h.polygon) ? h.polygon : [],
          name: h.label || 'Hotspot',
          label: h.label || 'Hotspot',
          hotspotKind: 'highlight',
          color: h.color === 'white' ? '#ffffff' : (h.color || '#6fbf86'),
          opacity: h.opacity != null ? h.opacity : 0.22,
          borderWidth: 1.5,
          animation: 'none',
          enabled: true,
          targetSceneId: h.targetSceneId || null,
          action: h.action || 'goto-scene'
        });
      });
      scene.hotspots = [];
    }

    return scene.interactions;
  }

  function mediaUrlForScene(scene, contentById) {
    if (!scene) return null;
    if (scene.mediaUrl) return scene.mediaUrl;
    if (scene.publicUrl) return scene.publicUrl;
    if (scene.coverModel) {
      var cm = scene.coverModel;
      if (cm.imageUrl) return cm.imageUrl;
      if (cm.videoUrl) return cm.videoUrl;
    }
    var rid = scene.resourceId;
    if (!rid || typeof contentById !== 'function') return null;
    var res = contentById(rid);
    if (!res) return null;
    return res.publicUrl || res.remoteUrl || res.previewUrl || null;
  }

  /**
   * Build shim state consumed by ExperienciaEngine / ExperienciaCanvas.
   * Each Quotation scene → kind:'image' node; button targets → edges.
   */
  function buildState(scenes, activeSceneId, contentById) {
    scenes = scenes || [];
    var nodes = [];
    var edges = [];
    var assets = { version: 1, byId: {} };

    scenes.forEach(function (sc) {
      if (!sc || !sc.id) return;
      ensureSceneInteractions(sc);
      var nid = nodeIdForScene(sc.id);
      var url = mediaUrlForScene(sc, contentById);
      var assetId = null;
      if (url) {
        assetId = 'asset-' + sc.id;
        assets.byId[assetId] = {
          id: assetId,
          type: 'image',
          filename: (sc.name || 'scene') + '.jpg',
          status: 'ready',
          publicUrl: url,
          thumbnailUrl: url,
          provider: 'local',
          nodeId: nid
        };
      }
      nodes.push({
        id: nid,
        kind: 'image',
        label: sc.name || 'Escena',
        x: 80,
        y: 120,
        config: {
          interactions: cloneJson(sc.interactions || []),
          assetId: assetId,
          fileName: assetId ? ((sc.name || 'scene') + '.jpg') : null
        },
        ports: []
      });
    });

    scenes.forEach(function (sc) {
      if (!sc || !sc.id) return;
      var fromId = nodeIdForScene(sc.id);
      (sc.interactions || []).forEach(function (ix) {
        if (!ix || String(ix.type || '').toUpperCase() !== 'BUTTON') return;
        var target = ix.targetSceneId;
        if (!target) return;
        var toId = nodeIdForScene(target);
        edges.push({
          id: 'e-' + ix.id,
          sourceNodeId: fromId,
          sourcePortId: ix.portId || ix.id,
          targetNodeId: toId,
          targetPortId: 'in',
          label: ix.label || 'Botón'
        });
      });
    });

    var activeNode = nodeIdForScene(activeSceneId || (scenes[0] && scenes[0].id));
    return {
      projectInfo: {},
      estructura: {},
      projectAssets: assets,
      experiencia: {
        version: 2,
        mode: 'flow',
        nodes: nodes,
        edges: edges,
        reviewFlags: [],
        resetSnapshots: [],
        flowSnapshots: [],
        canvas: {
          panX: 40,
          panY: 40,
          zoom: 1,
          selectedId: activeNode,
          selectedIds: [activeNode],
          selectedEdgeId: null,
          selectedEdgeIds: [],
          selectedInteractionId: null,
          selectedInteractionSceneId: null,
          tool: 'select',
          minimapVisible: false,
          inspectorOpen: true,
          inspectorCollapsed: false,
          activeGroupId: null,
          editMode: 'buttons',
          selectedButtonId: null,
          selectedButtonIds: [],
          selectedHotspotId: null
        }
      }
    };
  }

  /** Pull interactions (+ button targets) from shim back into Quotation scenes. */
  function pullToScenes(shimState, scenes) {
    if (!shimState || !shimState.experiencia || !scenes) return;
    var exp = shimState.experiencia;
    var byId = {};
    scenes.forEach(function (sc) {
      if (sc && sc.id) byId[nodeIdForScene(sc.id)] = sc;
    });

    (exp.nodes || []).forEach(function (n) {
      if (!n || n.kind === 'hero') return;
      var sc = byId[n.id];
      if (!sc) return;
      sc.interactions = cloneJson((n.config && n.config.interactions) || []);
      sc.buttons = [];
      sc.hotspots = [];
      sc.interactions.forEach(function (ix) {
        if (!ix || String(ix.type || '').toUpperCase() !== 'BUTTON') return;
        var targetNodeId = null;
        if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.resolveButtonTarget) {
          targetNodeId = ExperienciaEngine.resolveButtonTarget(shimState, n.id, ix);
        } else {
          (exp.edges || []).some(function (ed) {
            var from = ed.sourceNodeId || ed.from;
            var pid = ed.sourcePortId || ed.portId;
            if (String(from) === String(n.id) &&
                String(pid) === String(ix.portId || ix.id)) {
              targetNodeId = ed.targetNodeId || ed.to;
              return true;
            }
            return false;
          });
        }
        ix.targetSceneId = targetNodeId ? sceneIdFromNode(targetNodeId) : null;
        if (ix.targetSceneId && !ix.action) ix.action = 'goto-scene';
      });
      /* Hotspots: keep targetSceneId if already set via Quotation fields. */
      sc.interactions.forEach(function (ix) {
        if (!ix || String(ix.type || '').toUpperCase() !== 'HOTSPOT') return;
        if (ix.targetSceneId && !ix.action) ix.action = 'goto-scene';
      });
    });
  }

  /**
   * Mount Showroom editor overlay into hostEl.
   * options: { scenes, activeSceneId, contentById, inspectorBody, onChange, editMode }
   */
  function mount(hostEl, options) {
    options = options || {};
    if (!hostEl || typeof ExperienciaCanvas === 'undefined' || !ExperienciaCanvas.mountOverlay) {
      return null;
    }
    var scenes = options.scenes || [];
    var activeId = options.activeSceneId || (scenes[0] && scenes[0].id);
    var shim = buildState(scenes, activeId, options.contentById);
    var handle = ExperienciaCanvas.mountOverlay(hostEl, {
      state: shim,
      overlayNodeId: nodeIdForScene(activeId),
      editMode: options.editMode || 'buttons',
      inspectorBody: options.inspectorBody || null,
      onChange: function () {
        pullToScenes(shim, scenes);
        if (typeof options.onChange === 'function') options.onChange();
      },
      onSelectionChange: options.onSelectionChange
    });
    if (!handle) return null;

    return {
      shim: shim,
      handle: handle,
      refresh: function () {
        if (handle.refresh) handle.refresh();
      },
      setEditMode: function (mode) {
        if (handle.setEditMode) handle.setEditMode(mode);
      },
      addButton: function () {
        return handle.addButton ? handle.addButton() : null;
      },
      addText: function () {
        return handle.addText ? handle.addText() : null;
      },
      addShape: function (kind) {
        return handle.addShape ? handle.addShape(kind) : null;
      },
      startHotspotDraw: function () {
        if (handle.startHotspotDraw) handle.startHotspotDraw();
      },
      getSelection: function () {
        return handle.getSelection ? handle.getSelection() : { hasSelection: false };
      },
      nudgeSelected: function (dxPx, dyPx) {
        return handle.nudgeSelected ? handle.nudgeSelected(dxPx, dyPx) : false;
      },
      finishNudge: function () {
        if (handle.finishNudge) handle.finishNudge();
      },
      copySelected: function () {
        return handle.copySelected ? handle.copySelected() : false;
      },
      cutSelected: function () {
        return handle.cutSelected ? handle.cutSelected() : false;
      },
      pasteSelected: function () {
        return handle.pasteSelected ? handle.pasteSelected() : false;
      },
      undoEdit: function () {
        return handle.undoEdit ? handle.undoEdit() : false;
      },
      redoEdit: function () {
        return handle.redoEdit ? handle.redoEdit() : false;
      },
      duplicateSelected: function () {
        return handle.duplicateSelected ? handle.duplicateSelected() : null;
      },
      deleteSelected: function () {
        return handle.deleteSelected ? handle.deleteSelected() : false;
      },
      clearSelection: function () {
        return handle.clearSelection ? handle.clearSelection() : false;
      },
      cancelActiveTool: function () {
        return handle.cancelActiveTool ? handle.cancelActiveTool() : false;
      },
      toggleLockSelected: function () {
        return handle.toggleLockSelected ? handle.toggleLockSelected() : null;
      },
      bringSelectedToFront: function () {
        return handle.bringSelectedToFront ? handle.bringSelectedToFront() : null;
      },
      selectOverlayItem: function (id) {
        return handle.selectOverlayItem ? handle.selectOverlayItem(id) : false;
      },
      toggleOverlayItemSelection: function (id) {
        return handle.toggleOverlayItemSelection
          ? handle.toggleOverlayItemSelection(id)
          : false;
      },
      setInteractionFlags: function (id, flags) {
        return handle.setInteractionFlags ? handle.setInteractionFlags(id, flags) : false;
      },
      reorderInteraction: function (id, dir) {
        return handle.reorderInteraction ? handle.reorderInteraction(id, dir) : false;
      },
      setInspectorBody: function (el) {
        if (handle.setInspectorBody) handle.setInspectorBody(el);
      },
      destroy: function () {
        pullToScenes(shim, scenes);
        if (handle.destroy) handle.destroy();
        hostEl.innerHTML = '';
      },
      pull: function () {
        pullToScenes(shim, scenes);
      }
    };
  }

  return {
    nodeIdForScene: nodeIdForScene,
    ensureSceneInteractions: ensureSceneInteractions,
    buildState: buildState,
    pullToScenes: pullToScenes,
    mount: mount
  };
})();
