/**
 * Quotation ↔ Showroom Experiencia bridge (V7.2.13).
 *
 * Does NOT reimplement buttons/hotspots editing.
 * Builds a minimal ExperienciaEngine state from Quotation scenes and mounts
 * ExperienciaCanvas.mountOverlay or KonvaOverlayRenderer (POC, ?konva=1).
 */
var QuotationExperienciaBridge = (function () {
  var QE_BRIDGE_BUILD = 'ws7817';
  try {
    window.__QE_BRIDGE_BUILD__ = QE_BRIDGE_BUILD;
    console.log('[QE BUILD] quotation-experiencia-bridge ' + QE_BRIDGE_BUILD);
  } catch (eBridgeBuild) { /* ignore */ }
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

  /** pushScenesToShim-only debug — locate first world mutation during panel→shim clone. */
  function pushShimTraceLayerSize() {
    try {
      var stage = typeof document !== 'undefined'
        ? document.querySelector('[data-qe-canvas]')
        : null;
      if (!stage) return { w: 1000, h: 1000 };
      return {
        w: Math.max(1, stage.clientWidth || 1000),
        h: Math.max(1, stage.clientHeight || 1000)
      };
    } catch (eSize) {
      return { w: 1000, h: 1000 };
    }
  }

  function pushShimTraceRotate2d(x, y, deg) {
    var r = (Number(deg) || 0) * Math.PI / 180;
    var c = Math.cos(r);
    var s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  function pushShimTraceWorldFromGroupMember(group, member, lw, lh) {
    if (!member) return null;
    lw = Math.max(1, Number(lw) || 1000);
    lh = Math.max(1, Number(lh) || 1000);
    if (member.groupId && member.localX != null && member.localY != null && group) {
      var gr = Number(group.rotation) || 0;
      var lxPx = (Number(member.localX) || 0) / 100 * lw;
      var lyPx = (Number(member.localY) || 0) / 100 * lh;
      var rot = pushShimTraceRotate2d(lxPx, lyPx, gr);
      var gxPx = (Number(group.x) / 100) * lw;
      var gyPx = (Number(group.y) / 100) * lh;
      return {
        x: ((gxPx + rot.x) / lw) * 100,
        y: ((gyPx + rot.y) / lh) * 100
      };
    }
    if (typeof ExperienciaEngine !== 'undefined' &&
        ExperienciaEngine.overlayWorldLayoutAbsolute) {
      var abs = ExperienciaEngine.overlayWorldLayoutAbsolute(member, lw, lh);
      if (abs) return { x: Number(abs.x), y: Number(abs.y) };
    }
    return {
      x: Number(member.x),
      y: Number(member.y)
    };
  }

  function pushShimTraceMemberWorld(n, ix, group, lw, lh) {
    if (!ix) return null;
    if (n && typeof ExperienciaEngine !== 'undefined' &&
        ExperienciaEngine.overlayWorldLayoutRaw) {
      var raw = ExperienciaEngine.overlayWorldLayoutRaw(n, ix, lw, lh);
      if (raw) return { x: Number(raw.x), y: Number(raw.y) };
    }
    return pushShimTraceWorldFromGroupMember(group, ix, lw, lh);
  }

  function pushShimTraceFindGroupCtx(interactions) {
    if (!interactions || !interactions.length) return null;
    var byId = {};
    interactions.forEach(function (ix) {
      if (ix && ix.id) byId[String(ix.id)] = ix;
    });
    var groups = interactions.filter(function (ix) {
      var t = String(ix && ix.type || '').toUpperCase();
      return (t === 'OVERLAY_GROUP' || t === 'GROUP') &&
        Array.isArray(ix.memberIds) &&
        ix.memberIds.length >= 2;
    });
    if (!groups.length) return null;
    groups.sort(function (a, b) {
      return (b.memberIds || []).length - (a.memberIds || []).length;
    });
    var group = groups[0];
    var memberAId = group.memberIds[0];
    var memberBId = group.memberIds[1];
    return {
      group: group,
      memberA: byId[String(memberAId)] || null,
      memberB: byId[String(memberBId)] || null,
      memberAId: memberAId,
      memberBId: memberBId
    };
  }

  function pushShimTraceMemberBlock(label, ix, group, n, lw, lh) {
    if (!ix) {
      return label + ':\n  (missing)';
    }
    var world = pushShimTraceMemberWorld(n, ix, group, lw, lh);
    var wx = world && !isNaN(world.x) ? world.x : 'null';
    var wy = world && !isNaN(world.y) ? world.y : 'null';
    return label + ':\n' +
      '  world=(' + wx + ',' + wy + ')\n' +
      '  local=(' + ix.localX + ',' + ix.localY + ')\n' +
      '  groupId=' + (ix.groupId != null ? ix.groupId : 'null');
  }

  function pushShimTraceDump(phase, ctx, n, lw, lh) {
    if (!ctx || !ctx.group) return;
    var g = ctx.group;
    console.log(
      '[PUSH SHIM TRACE]\nphase=' + phase + '\n' +
      'group:\n' +
      '  x=' + g.x + '\n' +
      '  y=' + g.y + '\n' +
      '  width=' + g.width + '\n' +
      '  height=' + g.height + '\n' +
      '  pivot=(' + g.x + ',' + g.y + ')\n' +
      pushShimTraceMemberBlock('member A', ctx.memberA, g, n, lw, lh) + '\n' +
      pushShimTraceMemberBlock('member B', ctx.memberB, g, n, lw, lh)
    );
  }

  function pushShimTraceInstruction(label) {
    console.log('[PUSH SHIM TRACE] instruction=' + label);
  }

  function pushShimTraceIsArmed() {
    try { return window.__QE_PUSH_SHIM_TRACE_ARMED__ === true; } catch (eArm) { return false; }
  }

  function lockTraceId() {
    try { return window.__QE_LOCK_TRACE_ID__ || null; } catch (eId) { return null; }
  }

  function lockTracePrevStore() {
    try {
      if (!window.__QE_LOCK_TRACE_PREV__) window.__QE_LOCK_TRACE_PREV__ = {};
      return window.__QE_LOCK_TRACE_PREV__;
    } catch (eStore) {
      return {};
    }
  }

  function lockTraceStateBridge(functionName, itemId, locked) {
    if (!itemId) return;
    var lid = String(itemId);
    var lockedStr = locked === 'missing' ? 'missing' : String(!!locked);
    console.log('[LOCK STATE] function=' + functionName + ' itemId=' + lid + ' locked=' + lockedStr);
    if (locked === 'missing' || typeof locked === 'boolean') {
      var prev = lockTracePrevStore();
      if (prev[lid] === true && locked === false) {
        console.log('[LOCK OVERWRITTEN] function=' + functionName + ' old=true new=false');
      }
      if (typeof locked === 'boolean') prev[lid] = locked;
    }
  }

  function findIxLockedInScenes(itemId, scenes) {
    if (!itemId || !scenes) return 'missing';
    var found = null;
    scenes.some(function (sc) {
      if (!sc || !Array.isArray(sc.interactions)) return false;
      return sc.interactions.some(function (ix) {
        if (ix && String(ix.id) === String(itemId)) {
          found = ix;
          return true;
        }
        return false;
      });
    });
    return found ? !!found.locked : 'missing';
  }

  function findIxLockedInShim(itemId, shimState) {
    if (!itemId || !shimState || !shimState.experiencia) return 'missing';
    var found = null;
    (shimState.experiencia.nodes || []).some(function (n) {
      if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
      return n.config.interactions.some(function (ix) {
        if (ix && String(ix.id) === String(itemId)) {
          found = ix;
          return true;
        }
        return false;
      });
    });
    return found ? !!found.locked : 'missing';
  }

  function sceneLockedForActiveItem(itemId, scenes, activeSceneId) {
    if (!itemId || !scenes || !activeSceneId) return 'missing';
    var sc = null;
    var i;
    for (i = 0; i < scenes.length; i++) {
      if (scenes[i] && String(scenes[i].id) === String(activeSceneId)) {
        sc = scenes[i];
        break;
      }
    }
    if (!sc || !Array.isArray(sc.interactions)) return 'missing';
    var j;
    for (j = 0; j < sc.interactions.length; j++) {
      if (sc.interactions[j] && String(sc.interactions[j].id) === String(itemId)) {
        return !!sc.interactions[j].locked;
      }
    }
    return 'missing';
  }

  /** Temporary — compare lock flag across scene / shim / vm / DOM / effective gate. */
  function debugCompareLockState(itemId, ctx) {
    ctx = ctx || {};
    itemId = itemId ? String(itemId) : '';
    if (!itemId) return;

    var scenes = ctx.scenes;
    var activeSceneId = ctx.activeSceneId;
    var shim = ctx.shim;
    var overlayNodeId = ctx.overlayNodeId;
    var buttonsLayer = ctx.buttonsLayer;
    var layerSize = ctx.layerSize || { w: 1000, h: 1000 };

    var sceneLocked = sceneLockedForActiveItem(itemId, scenes, activeSceneId);
    var shimLocked = findIxLockedInShim(itemId, shim);

    var vmLocked = 'missing';
    var effectiveLocked = 'missing';
    if (shim && overlayNodeId && typeof ExperienciaEngine !== 'undefined') {
      var n = ExperienciaEngine.getNode(shim, overlayNodeId);
      var ix = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, itemId)
        : null;
      if (ix && ExperienciaEngine.buttonViewModel) {
        var vm = ExperienciaEngine.buttonViewModel(
          shim, n, ix, layerSize.w || 1000, layerSize.h || 1000
        );
        vmLocked = vm ? !!vm.locked : 'missing';
      } else if (ix) {
        vmLocked = !!ix.locked;
      }
      if (n && ExperienciaEngine.isOverlayEffectivelyLocked) {
        effectiveLocked = !!ExperienciaEngine.isOverlayEffectivelyLocked(shim, n, itemId);
      }
    }

    var domDataLocked = 'missing';
    var domClassLocked = 'missing';
    if (buttonsLayer) {
      var idEsc = itemId.replace(/"/g, '');
      var el = buttonsLayer.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
      if (el) {
        domDataLocked = el.getAttribute('data-locked') === '1' ? 'true' : 'false';
        domClassLocked = el.classList.contains('is-locked') ? 'true' : 'false';
      }
    }

    var origin = ctx.origin ? ' origin=' + ctx.origin : '';
    console.log(
      '[LOCK COMPARE] itemId=' + itemId + origin + '\n' +
      'SCENE:\nlocked=' + String(sceneLocked) + '\n' +
      'SHIM:\nlocked=' + String(shimLocked) + '\n' +
      'VIEWMODEL:\nlocked=' + String(vmLocked) + '\n' +
      'DOM:\ndata-locked=' + String(domDataLocked) + '\n' +
      'class=is-locked\n' + String(domClassLocked) + '\n' +
      'EFFECTIVE:\nlocked=' + String(effectiveLocked)
    );
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

  /** Push Quotation scene interactions[] into shim nodes (inverse of pullToScenes). */
  function pushScenesToShim(shimState, scenes) {
    if (!shimState || !shimState.experiencia || !scenes) return;
    var tid = lockTraceId();
    if (tid) {
      lockTraceStateBridge('pushScenesToShim:enter:scene', tid, findIxLockedInScenes(tid, scenes));
      lockTraceStateBridge('pushScenesToShim:enter:shim', tid, findIxLockedInShim(tid, shimState));
    }
    var byNodeId = {};
    scenes.forEach(function (sc) {
      if (sc && sc.id) byNodeId[nodeIdForScene(sc.id)] = sc;
    });
    var traceSz = pushShimTraceLayerSize();
    var traceLw = traceSz.w;
    var traceLh = traceSz.h;
    (shimState.experiencia.nodes || []).forEach(function (n) {
      if (!n || n.kind === 'hero') return;
      var sc = byNodeId[n.id];
      if (!sc) return;
      if (!n.config) n.config = {};
      var srcList = sc.interactions || [];
      var srcById = {};
      srcList.forEach(function (ix) {
        if (ix && ix.id) srcById[String(ix.id)] = ix;
      });
      var panelCtx = pushShimTraceFindGroupCtx(srcList);
      var shimBeforeCtx = pushShimTraceFindGroupCtx((n.config && n.config.interactions) || []);
      var traceActive = pushShimTraceIsArmed();
      if (traceActive) {
        pushShimTraceDump('ANTES DEL CLONE (shim)', shimBeforeCtx || panelCtx, n, traceLw, traceLh);
        if (panelCtx) {
          pushShimTraceDump('ANTES DEL CLONE (panel clone input)', panelCtx, null, traceLw, traceLh);
        }
        pushShimTraceInstruction('cloneJson(srcList)');
      }
      var cloned = cloneJson(srcList);
      if (traceActive && panelCtx) {
        var ctxAfterCloneJson = pushShimTraceFindGroupCtx(cloned);
        pushShimTraceDump('after cloneJson (pre-merge)', ctxAfterCloneJson, null, traceLw, traceLh);
        pushShimTraceInstruction('cloned.forEach → mergeSceneInteractionFlagsToShim(src, ix)');
      }
      cloned.forEach(function (ix) {
        if (!ix || !ix.id) return;
        mergeSceneInteractionFlagsToShim(srcById[String(ix.id)], ix);
      });
      if (traceActive && panelCtx) {
        var ctxAfterMerge = pushShimTraceFindGroupCtx(cloned);
        pushShimTraceDump('after mergeSceneInteractionFlagsToShim', ctxAfterMerge, null, traceLw, traceLh);
        pushShimTraceInstruction('n.config.interactions = cloned');
      }
      n.config.interactions = cloned;
      if (traceActive) {
        var shimAfterCtx = pushShimTraceFindGroupCtx(cloned);
        pushShimTraceDump('DESPUÉS DEL CLONE (shim)', shimAfterCtx, n, traceLw, traceLh);
        var beforeA = shimBeforeCtx && shimBeforeCtx.memberA
          ? pushShimTraceMemberWorld(n, shimBeforeCtx.memberA, shimBeforeCtx.group, traceLw, traceLh)
          : null;
        var afterA = shimAfterCtx && shimAfterCtx.memberA
          ? pushShimTraceMemberWorld(n, shimAfterCtx.memberA, shimAfterCtx.group, traceLw, traceLh)
          : null;
        if (beforeA && afterA) {
          var dxPx = Math.abs(afterA.x - beforeA.x) / 100 * traceLw;
          var dyPx = Math.abs(afterA.y - beforeA.y) / 100 * traceLh;
          if (dxPx > 0.1 || dyPx > 0.1) {
            console.warn(
              '[PUSH SHIM TRACE] FIRST POSITION CHANGE:\n' +
              'instruction=n.config.interactions = cloned\n' +
              'memberA before=(' + beforeA.x + ',' + beforeA.y + ')\n' +
              'memberA after=(' + afterA.x + ',' + afterA.y + ')'
            );
          }
        }
      }
    });
    if (tid) {
      lockTraceStateBridge('pushScenesToShim:exit:scene', tid, findIxLockedInScenes(tid, scenes));
      lockTraceStateBridge('pushScenesToShim:exit:shim', tid, findIxLockedInShim(tid, shimState));
    }
    try {
      if (typeof window !== 'undefined' && window.__qeGroupPosTraceStep) {
        window.__qeGroupPosTraceStep('after pushScenesToShim');
      }
    } catch (ePosTracePush) { /* ignore */ }
  }

  /** Pull interactions (+ button targets) from shim back into Quotation scenes. */
  function mergePanelInteractionFlags(prevIx, nextIx) {
    if (!prevIx || !nextIx) return;
    if (!Object.prototype.hasOwnProperty.call(nextIx, 'locked') &&
        Object.prototype.hasOwnProperty.call(prevIx, 'locked')) {
      nextIx.locked = !!prevIx.locked;
    }
    if (!Object.prototype.hasOwnProperty.call(nextIx, 'visible') &&
        Object.prototype.hasOwnProperty.call(prevIx, 'visible')) {
      nextIx.visible = !!prevIx.visible;
    }
    if (!Object.prototype.hasOwnProperty.call(nextIx, 'enabled') &&
        Object.prototype.hasOwnProperty.call(prevIx, 'enabled')) {
      nextIx.enabled = !!prevIx.enabled;
    }
  }

  /** Push panel flags scene → shim (inverse of mergePanelInteractionFlags). */
  function mergeSceneInteractionFlagsToShim(srcIx, destIx) {
    if (!srcIx || !destIx) return;
    if (Object.prototype.hasOwnProperty.call(srcIx, 'locked')) {
      destIx.locked = !!srcIx.locked;
    }
    if (Object.prototype.hasOwnProperty.call(srcIx, 'visible')) {
      destIx.visible = !!srcIx.visible;
    }
    if (Object.prototype.hasOwnProperty.call(srcIx, 'enabled')) {
      destIx.enabled = !!srcIx.enabled;
    }
  }

  function pullToScenes(shimState, scenes) {
    if (!shimState || !shimState.experiencia || !scenes) return;
    var tid = lockTraceId();
    if (tid) {
      lockTraceStateBridge('pullToScenes:enter:scene', tid, findIxLockedInScenes(tid, scenes));
      lockTraceStateBridge('pullToScenes:enter:shim', tid, findIxLockedInShim(tid, shimState));
    }
    var exp = shimState.experiencia;
    var byId = {};
    scenes.forEach(function (sc) {
      if (sc && sc.id) byId[nodeIdForScene(sc.id)] = sc;
    });

    (exp.nodes || []).forEach(function (n) {
      if (!n || n.kind === 'hero') return;
      var sc = byId[n.id];
      if (!sc) return;
      var prevById = {};
      (sc.interactions || []).forEach(function (ix) {
        if (ix && ix.id) prevById[String(ix.id)] = ix;
      });
      sc.interactions = cloneJson((n.config && n.config.interactions) || []);
      sc.interactions.forEach(function (ix) {
        if (!ix || !ix.id) return;
        mergePanelInteractionFlags(prevById[String(ix.id)], ix);
      });
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
    if (tid) {
      lockTraceStateBridge('pullToScenes:exit:scene', tid, findIxLockedInScenes(tid, scenes));
      lockTraceStateBridge('pullToScenes:exit:shim', tid, findIxLockedInShim(tid, shimState));
    }
    try {
      if (typeof window !== 'undefined' && window.__qeGroupPosTraceStep) {
        window.__qeGroupPosTraceStep('after pullToScenes');
      }
    } catch (ePosTracePull) { /* ignore */ }
  }

  /**
   * Mount Showroom editor overlay into hostEl.
   * options: { scenes, activeSceneId, contentById, inspectorBody, onChange, editMode }
   */
  function mount(hostEl, options) {
    options = options || {};
    if (!hostEl) return null;
    var scenes = options.scenes || [];
    var activeId = options.activeSceneId || (scenes[0] && scenes[0].id);
    var shim = buildState(scenes, activeId, options.contentById);
    var handle = null;
    var useKonva = typeof KonvaOverlayRenderer !== 'undefined' &&
      KonvaOverlayRenderer.isEnabled(options);

    function onCanvasChangePullToScenes() {
      var tid = lockTraceId();
      if (tid) {
        lockTraceStateBridge('onChange:pullToScenes:enter:scene', tid,
          findIxLockedInScenes(tid, scenes));
        lockTraceStateBridge('onChange:pullToScenes:enter:shim', tid,
          findIxLockedInShim(tid, shim));
      }
      pullToScenes(shim, scenes);
      if (tid) {
        lockTraceStateBridge('onChange:pullToScenes:exit:scene', tid,
          findIxLockedInScenes(tid, scenes));
        lockTraceStateBridge('onChange:pullToScenes:exit:shim', tid,
          findIxLockedInShim(tid, shim));
      }
      if (typeof options.onChange === 'function') options.onChange();
    }

    function overlayDebugCompareLockState(itemId, origin) {
      var layerEl = hostEl.querySelector('[data-exp-buttons-layer]');
      var layerHost = layerEl && layerEl.parentElement ? layerEl.parentElement : hostEl;
      debugCompareLockState(itemId, {
        origin: origin || 'expOverlay',
        scenes: scenes,
        activeSceneId: activeId,
        shim: shim,
        overlayNodeId: nodeIdForScene(activeId),
        buttonsLayer: layerEl,
        layerSize: {
          w: Math.max(1, (layerHost && layerHost.clientWidth) || 1000),
          h: Math.max(1, (layerHost && layerHost.clientHeight) || 1000)
        }
      });
    }

    if (useKonva) {
      try {
        console.info('[QuotationExperienciaBridge] Konva POC renderer active');
      } catch (eLog) { /* ignore */ }
      handle = KonvaOverlayRenderer.mount(hostEl, {
        shim: shim,
        scenes: scenes,
        overlayNodeId: nodeIdForScene(activeId),
        projectId: options.projectId || null,
        onChange: onCanvasChangePullToScenes,
        onSelectionChange: options.onSelectionChange,
        pullToScenes: function () {
          pullToScenes(shim, scenes);
        }
      });
    } else {
      if (typeof ExperienciaCanvas === 'undefined' || !ExperienciaCanvas.mountOverlay) {
        return null;
      }
      handle = ExperienciaCanvas.mountOverlay(hostEl, {
        state: shim,
        overlayNodeId: nodeIdForScene(activeId),
        editMode: options.editMode || 'buttons',
        inspectorBody: options.inspectorBody || null,
        projectId: options.projectId || null,
        onChange: onCanvasChangePullToScenes,
        onSelectionChange: options.onSelectionChange,
        onMultiSelectionContextMenu: options.onMultiSelectionContextMenu,
        overlaySnapEnabled: options.overlaySnapEnabled,
        debugCompareLockState: overlayDebugCompareLockState
      });
    }
    if (!handle) return null;

    return {
      shim: shim,
      handle: handle,
      debugCompareLockState: overlayDebugCompareLockState,
      isKonvaPoc: !!handle.isKonvaPoc,
      refresh: function () {
        if (handle.refresh) handle.refresh();
        try {
          if (typeof window !== 'undefined' && window.__qeGroupPosTraceStep) {
            window.__qeGroupPosTraceStep('after expOverlay.refresh');
          }
        } catch (ePosTraceRefresh) { /* ignore */ }
      },
      fitStage: function () {
        if (handle.fitStage) handle.fitStage();
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
      getSelectionContext: function () {
        return handle.getSelectionContext
          ? handle.getSelectionContext()
          : { buttonIds: [], count: 0, canGroup: false, canUngroup: false };
      },
      groupSelectedOverlays: function () {
        return handle.groupSelectedOverlays ? handle.groupSelectedOverlays() : false;
      },
      createEmptyOverlayGroup: function () {
        return handle.createEmptyOverlayGroup ? handle.createEmptyOverlayGroup() : null;
      },
      ungroupSelectedOverlays: function () {
        return handle.ungroupSelectedOverlays ? handle.ungroupSelectedOverlays() : false;
      },
      snapshotSelectedOverlays: function () {
        return handle.snapshotSelectedOverlays ? handle.snapshotSelectedOverlays() : [];
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
      exitGroupEditMode: function (opts) {
        return handle.exitGroupEditMode ? handle.exitGroupEditMode(opts) : false;
      },
      isInGroupEditMode: function () {
        return handle.isInGroupEditMode ? handle.isInGroupEditMode() : false;
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
      selectOverlayItem: function (id, opts) {
        return handle.selectOverlayItem ? handle.selectOverlayItem(id, opts) : false;
      },
      previewOverlayGroupMember: function (id) {
        return handle.previewOverlayGroupMember ? handle.previewOverlayGroupMember(id) : false;
      },
      clearOverlayGroupMemberPreview: function () {
        return handle.clearOverlayGroupMemberPreview
          ? handle.clearOverlayGroupMemberPreview()
          : false;
      },
      toggleOverlayItemSelection: function (id) {
        return handle.toggleOverlayItemSelection
          ? handle.toggleOverlayItemSelection(id)
          : false;
      },
      setInteractionFlags: function (id, flags) {
        return handle.setInteractionFlags ? handle.setInteractionFlags(id, flags) : false;
      },
      removeOverlayById: function (id) {
        return handle.removeOverlayById ? handle.removeOverlayById(id) : false;
      },
      reorderInteraction: function (id, dir) {
        return handle.reorderInteraction ? handle.reorderInteraction(id, dir) : false;
      },
      setInspectorBody: function (el) {
        if (handle.setInspectorBody) handle.setInspectorBody(el);
      },
      setOverlaySnapEnabled: function (on) {
        if (handle.setOverlaySnapEnabled) handle.setOverlaySnapEnabled(on);
      },
      isOverlaySnapEnabled: function () {
        return handle.isOverlaySnapEnabled ? handle.isOverlaySnapEnabled() : true;
      },
      destroy: function () {
        pullToScenes(shim, scenes);
        if (handle.destroy) handle.destroy();
        hostEl.innerHTML = '';
      },
      pull: function () {
        var tid = lockTraceId();
        if (tid) {
          lockTraceStateBridge('expOverlay.pull:enter:scene', tid,
            findIxLockedInScenes(tid, scenes));
        }
        pullToScenes(shim, scenes);
        if (tid) {
          lockTraceStateBridge('expOverlay.pull:exit:scene', tid,
            findIxLockedInScenes(tid, scenes));
        }
      },
      syncFromScenes: function () {
        pushScenesToShim(shim, scenes);
        if (handle.refresh) handle.refresh();
      }
    };
  }

  return {
    nodeIdForScene: nodeIdForScene,
    ensureSceneInteractions: ensureSceneInteractions,
    buildState: buildState,
    pullToScenes: pullToScenes,
    pushScenesToShim: pushScenesToShim,
    debugCompareLockState: debugCompareLockState,
    mount: mount
  };
})();
