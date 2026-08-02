/**
 * KonvaOverlayRenderer — Fase 0 POC (vanilla Konva, no React).
 *
 * Feature flag: ?konva=1 (or ?konva=true) on the quotation editor URL.
 * ExperienciaEngine + scene.interactions[] remain SSOT; Konva is render-only.
 *
 * Scope: SHAPE_RECT, SHAPE_CIRCLE, OVERLAY_GROUP + Transformer.
 * 1 click on grouped child → select group | dblclick → edit child.
 */
var KonvaOverlayRenderer = (function () {
  'use strict';

  var EDITOR_PROJECT_ID = '5a70961a-a97a-4082-abd2-33a633b779e8';

  function isEnabled(options) {
    options = options || {};
    if (options.konvaPoc === true) return true;
    try {
      var q = new URLSearchParams(window.location.search);
      var v = q.get('konva');
      if (v === '0' || v === 'false') return false;
      if (v === '1' || v === 'true') return true;
    } catch (e) { /* ignore */ }
    /* Sandbox EDITOR — auto ON (opt-out with ?konva=0). */
    var pid = String(options.projectId || '').trim();
    if (pid === EDITOR_PROJECT_ID) return true;
    return false;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function parseColor(raw, fallback) {
    if (!raw) return fallback || 'rgba(255,255,255,0.35)';
    return String(raw);
  }

  function pctCenterToKonva(xPct, yPct, wPct, hPct, layerW, layerH) {
    var w = Math.max(4, (Number(wPct) || 12) / 100 * layerW);
    var h = Math.max(4, (Number(hPct) || 8) / 100 * layerH);
    var cx = (Number(xPct) || 50) / 100 * layerW;
    var cy = (Number(yPct) || 50) / 100 * layerH;
    return { x: cx, y: cy, width: w, height: h, offsetX: w / 2, offsetY: h / 2 };
  }

  function konvaToPctCenter(node, layerW, layerH) {
    var sx = Math.abs(node.scaleX()) || 1;
    var sy = Math.abs(node.scaleY()) || 1;
    var w = node.width() * sx;
    var h = node.height() * sy;
    return {
      x: (node.x() / layerW) * 100,
      y: (node.y() / layerH) * 100,
      width: (w / layerW) * 100,
      height: (h / layerH) * 100,
      rotation: node.rotation() || 0
    };
  }

  function mount(hostEl, options) {
    options = options || {};
    if (typeof Konva === 'undefined') {
      console.warn('[KonvaOverlayRenderer] Konva not loaded — falling back.');
      return null;
    }
    if (!hostEl || !options.shim || !ExperienciaEngine) return null;

    var shim = options.shim;
    var scenes = options.scenes || [];
    var overlayNodeId = options.overlayNodeId;
    var onChange = options.onChange;
    var onSelectionChange = options.onSelectionChange;
    var pullToScenes = options.pullToScenes || function () {};

    var shellHtml = (typeof ExperienciaCanvas !== 'undefined' && ExperienciaCanvas.overlayShellHtml)
      ? ExperienciaCanvas.overlayShellHtml()
      : '<div data-exp-buttons-stage><div data-exp-buttons-frame>' +
        '<img data-exp-buttons-img alt=""><div data-exp-buttons-layer></div></div></div>';
    hostEl.innerHTML = shellHtml;
    hostEl.classList.add('is-konva-poc');

    var badge = document.createElement('div');
    badge.className = 'konva-poc-badge';
    badge.setAttribute('data-konva-poc-badge', '1');
    badge.textContent = 'KONVA POC';
    badge.title = 'Motor Konva activo (Fase 0). Opt-out: ?konva=0';
    hostEl.appendChild(badge);

    try {
      console.info('[KonvaOverlayRenderer] mounted — shapes via Konva Stage');
    } catch (eLog) { /* ignore */ }

    var buttonsStage = hostEl.querySelector('[data-exp-buttons-stage]');
    var buttonsFrame = hostEl.querySelector('[data-exp-buttons-frame]');
    var buttonsImg = hostEl.querySelector('[data-exp-buttons-img]');
    var buttonsLayer = hostEl.querySelector('[data-exp-buttons-layer]');
    if (!buttonsLayer) return null;

    buttonsLayer.innerHTML = '';
    buttonsLayer.classList.add('konva-overlay-layer');

    var konvaHost = document.createElement('div');
    konvaHost.className = 'konva-overlay-host';
    konvaHost.setAttribute('data-konva-host', '1');
    buttonsLayer.appendChild(konvaHost);

    var debugEl = document.createElement('pre');
    debugEl.className = 'konva-poc-debug';
    debugEl.setAttribute('data-konva-poc-debug', '1');
    debugEl.textContent = 'Konva POC — ?konva=1';
    hostEl.appendChild(debugEl);

    var stage = null;
    var layer = null;
    var transformer = null;
    var groupOutline = null;
    var nodeMap = {}; /* interactionId → Konva.Node */
    var groupMap = {}; /* groupId → Konva.Group */
    var deepSelect = null; /* { groupId, childId } */
    var selectedIds = [];
    var syncing = false;
    var resizeObs = null;

    function layerSize() {
      return {
        w: Math.max(1, konvaHost.clientWidth || buttonsFrame.clientWidth || 1000),
        h: Math.max(1, konvaHost.clientHeight || buttonsFrame.clientHeight || 1000)
      };
    }

    function getSceneNode() {
      return overlayNodeId ? ExperienciaEngine.getNode(shim, overlayNodeId) : null;
    }

    function getInteractions() {
      var n = getSceneNode();
      return (n && n.config && n.config.interactions) ? n.config.interactions : [];
    }

    function isShapeType(ix) {
      var t = String(ix.type || '').toUpperCase();
      return t === 'SHAPE_RECT' || t === 'SHAPE_CIRCLE';
    }

    function isGroupType(ix) {
      return ExperienciaEngine.isOverlayGroupInteraction &&
        ExperienciaEngine.isOverlayGroupInteraction(ix);
    }

    function notifySelection() {
      if (typeof onSelectionChange !== 'function') return;
      onSelectionChange({
        hasSelection: selectedIds.length > 0,
        buttonIds: selectedIds.slice()
      });
    }

    function updateDebug(label) {
      var n = getSceneNode();
      var ixs = getInteractions().filter(function (ix) {
        return isShapeType(ix) || isGroupType(ix);
      });
      var payload = {
        mode: label || 'sync',
        deepSelect: deepSelect,
        selectedIds: selectedIds,
        layer: layerSize(),
        interactions: ixs.map(function (ix) {
          var t = String(ix.type || '').toUpperCase();
          if (t === 'OVERLAY_GROUP' || t === 'GROUP') {
            return {
              id: ix.id,
              type: t,
              x: ix.x, y: ix.y,
              width: ix.width, height: ix.height,
              rotation: ix.rotation,
              memberIds: (ix.memberIds || []).slice()
            };
          }
          return {
            id: ix.id,
            type: t,
            x: ix.x, y: ix.y,
            width: ix.width, height: ix.height,
            rotation: ix.rotation,
            groupId: ix.groupId || null,
            localX: ix.localX, localY: ix.localY,
            localRotation: ix.localRotation
          };
        })
      };
      try {
        debugEl.textContent = JSON.stringify(payload, null, 2);
      } catch (eDbg) {
        debugEl.textContent = String(label || 'sync');
      }
    }

    function ensureStage() {
      var sz = layerSize();
      if (!stage) {
        stage = new Konva.Stage({
          container: konvaHost,
          width: sz.w,
          height: sz.h
        });
        layer = new Konva.Layer();
        stage.add(layer);
        transformer = new Konva.Transformer({
          rotateEnabled: true,
          borderStroke: '#ffffff',
          anchorStroke: '#ffffff',
          anchorFill: '#111111',
          anchorSize: 8,
          padding: 2,
          keepRatio: false
        });
        layer.add(transformer);
        groupOutline = new Konva.Rect({
          stroke: 'rgba(255,255,255,0.35)',
          strokeWidth: 1,
          dash: [6, 4],
          listening: false,
          visible: false
        });
        layer.add(groupOutline);
        bindStageEvents();
      } else {
        stage.width(sz.w);
        stage.height(sz.h);
      }
    }

    function createShapeNode(vm, opts) {
      opts = opts || {};
      var sz = layerSize();
      var t = String(vm.type || '').toUpperCase();
      var geom = pctCenterToKonva(vm.x, vm.y, vm.width, vm.height, sz.w, sz.h);
      var fill = parseColor(vm.fill, 'rgba(255,255,255,0.22)');
      var stroke = parseColor(vm.stroke, 'rgba(255,255,255,0.65)');
      var sw = vm.strokeWidth != null ? Number(vm.strokeWidth) : 1;
      var node;

      if (t === 'SHAPE_CIRCLE') {
        var r = Math.min(geom.width, geom.height) / 2;
        node = new Konva.Circle({
          x: geom.x,
          y: geom.y,
          radius: r,
          fill: fill,
          stroke: stroke,
          strokeWidth: sw,
          rotation: Number(vm.rotation) || 0
        });
        node.setAttr('shapeKind', 'circle');
      } else {
        node = new Konva.Rect({
          x: geom.x,
          y: geom.y,
          width: geom.width,
          height: geom.height,
          offsetX: geom.offsetX,
          offsetY: geom.offsetY,
          fill: fill,
          stroke: stroke,
          strokeWidth: sw,
          cornerRadius: vm.borderRadius != null ? Number(vm.borderRadius) : 0,
          rotation: Number(vm.rotation) || 0
        });
        node.setAttr('shapeKind', 'rect');
      }

      node.setAttr('interactionId', String(vm.id));
      if (opts.groupId) node.setAttr('parentGroupId', String(opts.groupId));
      if (vm.locked) node.listening(false);
      return node;
    }

    function applyVmToGroupChild(konvaChild, vm, groupVm, sz) {
      var ix = (vm && vm._ix) ? vm._ix : vm;
      var lx = Number(ix.localX) || 0;
      var ly = Number(ix.localY) || 0;
      var lr = Number(ix.localRotation) || 0;
      var wPct = ix.width != null ? Number(ix.width) : 12;
      var hPct = ix.height != null ? Number(ix.height) : 8;
      var geom = pctCenterToKonva(lx, ly, wPct, hPct, sz.w, sz.h);
      var kind = konvaChild.getAttr('shapeKind');
      if (kind === 'circle') {
        var r = Math.min(geom.width, geom.height) / 2;
        konvaChild.radius(r);
        konvaChild.x(geom.x);
        konvaChild.y(geom.y);
      } else {
        konvaChild.width(geom.width);
        konvaChild.height(geom.height);
        konvaChild.offsetX(geom.offsetX);
        konvaChild.offsetY(geom.offsetY);
        konvaChild.x(geom.x);
        konvaChild.y(geom.y);
      }
      konvaChild.rotation(lr);
      konvaChild.scaleX(1);
      konvaChild.scaleY(1);
    }

    function rebuildFromEngine() {
      if (syncing) return;
      ensureStage();
      var sz = layerSize();
      var n = getSceneNode();
      if (!n) return;

      syncing = true;
      transformer.nodes([]);
      nodeMap = {};
      groupMap = {};
      layer.destroyChildren();

      var interactions = getInteractions();
      var groupedChildIds = {};
      interactions.forEach(function (ix) {
        if (ix && ix.groupId) groupedChildIds[String(ix.groupId)] = true;
      });

      /* Standalone shapes (not in a group). */
      interactions.forEach(function (ix) {
        if (!ix || !isShapeType(ix) || ix.groupId) return;
        var vm = ExperienciaEngine.buttonViewModel
          ? ExperienciaEngine.buttonViewModel(shim, n, ix, sz.w, sz.h)
          : ix;
        var shape = createShapeNode(vm);
        layer.add(shape);
        nodeMap[String(ix.id)] = shape;
      });

      /* Groups + children. */
      interactions.forEach(function (ix) {
        if (!ix || !isGroupType(ix)) return;
        var gvm = ExperienciaEngine.overlayGroupViewModel
          ? ExperienciaEngine.overlayGroupViewModel(shim, n, ix, sz.w, sz.h)
          : ix;
        var gGeom = pctCenterToKonva(gvm.x, gvm.y, gvm.width, gvm.height, sz.w, sz.h);
        var konvaGroup = new Konva.Group({
          x: gGeom.x,
          y: gGeom.y,
          offsetX: 0,
          offsetY: 0,
          rotation: Number(gvm.rotation) || 0
        });
        konvaGroup.setAttr('groupId', String(ix.id));
        konvaGroup.setAttr('interactionId', String(ix.id));

        (ix.memberIds || []).forEach(function (mid) {
          var cix = ExperienciaEngine.getInteraction(n, mid);
          if (!cix || !isShapeType(cix)) return;
          var cvm = ExperienciaEngine.buttonViewModel(shim, n, cix, sz.w, sz.h);
          var child = createShapeNode(cvm, { groupId: ix.id });
          applyVmToGroupChild(child, cvm, gvm, sz);
          konvaGroup.add(child);
          nodeMap[String(mid)] = child;
        });

        layer.add(konvaGroup);
        groupMap[String(ix.id)] = konvaGroup;
        nodeMap[String(ix.id)] = konvaGroup;
      });

      layer.add(groupOutline);
      layer.add(transformer);
      groupOutline.moveToBottom();
      transformer.moveToTop();
      layer.batchDraw();
      syncing = false;
      restoreSelectionVisual();
      updateDebug('rebuild');
    }

    function restoreSelectionVisual() {
      if (!selectedIds.length) {
        transformer.nodes([]);
        groupOutline.visible(false);
        return;
      }
      var id = selectedIds[0];
      if (deepSelect && deepSelect.childId) {
        var childNode = nodeMap[String(deepSelect.childId)];
        if (childNode) {
          transformer.nodes([childNode]);
          showGroupOutline(deepSelect.groupId);
          return;
        }
      }
      var selNode = groupMap[String(id)] || nodeMap[String(id)];
      if (selNode) {
        transformer.nodes([selNode]);
        groupOutline.visible(false);
      }
    }

    function showGroupOutline(groupId) {
      var g = groupMap[String(groupId)];
      if (!g) {
        groupOutline.visible(false);
        return;
      }
      var rect = g.getClientRect({ relativeTo: layer });
      groupOutline.setAttrs({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: g.rotation(),
        visible: true
      });
      groupOutline.moveToBottom();
    }

    function selectGroup(groupId) {
      deepSelect = null;
      selectedIds = [String(groupId)];
      var g = groupMap[String(groupId)];
      if (g) {
        transformer.nodes([g]);
        groupOutline.visible(false);
        layer.batchDraw();
      }
      notifySelection();
      updateDebug('select-group');
    }

    function enterDeepSelect(groupId, childId) {
      deepSelect = { groupId: String(groupId), childId: String(childId) };
      selectedIds = [String(childId)];
      var child = nodeMap[String(childId)];
      if (child) {
        transformer.nodes([child]);
        showGroupOutline(groupId);
        layer.batchDraw();
      }
      notifySelection();
      updateDebug('deep-select');
    }

    function exitDeepSelect() {
      if (!deepSelect) return;
      var gid = deepSelect.groupId;
      deepSelect = null;
      selectGroup(gid);
    }

    function selectStandalone(interactionId) {
      deepSelect = null;
      selectedIds = [String(interactionId)];
      var node = nodeMap[String(interactionId)];
      if (node) {
        transformer.nodes([node]);
        groupOutline.visible(false);
        layer.batchDraw();
      }
      notifySelection();
      updateDebug('select-shape');
    }

    function resolveClickTarget(konvaTarget) {
      var node = konvaTarget;
      while (node && node !== stage) {
        if (node.getAttr && node.getAttr('interactionId')) {
          return {
            interactionId: String(node.getAttr('interactionId')),
            groupId: node.getAttr('groupId') ? String(node.getAttr('groupId')) : null,
            parentGroupId: node.getAttr('parentGroupId')
              ? String(node.getAttr('parentGroupId'))
              : null,
            node: node
          };
        }
        node = node.getParent();
      }
      return null;
    }

    function syncKonvaToEngine() {
      if (syncing) return;
      var sz = layerSize();
      var n = getSceneNode();
      if (!n || !overlayNodeId) return;

      syncing = true;
      var nodes = transformer.nodes();
      if (!nodes.length) {
        syncing = false;
        return;
      }
      var konvaNode = nodes[0];
      var meta = resolveClickTarget(konvaNode);
      if (!meta) {
        syncing = false;
        return;
      }

      if (deepSelect && deepSelect.childId) {
        var gix = ExperienciaEngine.getInteraction(n, deepSelect.groupId);
        var cix = ExperienciaEngine.getInteraction(n, deepSelect.childId);
        if (gix && cix) {
          var pct = konvaToPctCenter(konvaNode, sz.w, sz.h);
          cix.localX = pct.x;
          cix.localY = pct.y;
          cix.localRotation = pct.rotation;
          if (cix.width != null) {
            cix.width = pct.width;
            cix.height = pct.height;
          }
          showGroupOutline(deepSelect.groupId);
        }
      } else if (meta.groupId || groupMap[String(meta.interactionId)]) {
        var gid = meta.groupId || meta.interactionId;
        var pctG = konvaToPctCenter(konvaNode, sz.w, sz.h);
        var sx = Math.abs(konvaNode.scaleX()) || 1;
        var sy = Math.abs(konvaNode.scaleY()) || 1;
        if (ExperienciaEngine.updateOverlayGroupTransform) {
          ExperienciaEngine.updateOverlayGroupTransform(shim, overlayNodeId, gid, {
            x: pctG.x,
            y: pctG.y,
            rotation: pctG.rotation,
            width: pctG.width * sx,
            height: pctG.height * sy,
            keepRatio: !!(transformer && transformer.keepRatio && transformer.keepRatio()),
            layerW: sz.w,
            layerH: sz.h
          });
        }
        konvaNode.scaleX(1);
        konvaNode.scaleY(1);
      } else {
        var pctS = konvaToPctCenter(konvaNode, sz.w, sz.h);
        if (ExperienciaEngine.updateSceneButton) {
          ExperienciaEngine.updateSceneButton(shim, overlayNodeId, meta.interactionId, {
            x: pctS.x,
            y: pctS.y,
            width: pctS.width,
            height: pctS.height,
            rotation: pctS.rotation
          });
        }
        konvaNode.scaleX(1);
        konvaNode.scaleY(1);
      }

      pullToScenes();
      syncing = false;
      updateDebug('transformend');
      if (typeof onChange === 'function') onChange();
    }

    function bindStageEvents() {
      stage.on('click tap', function (e) {
        if (e.target === stage) {
          selectedIds = [];
          deepSelect = null;
          transformer.nodes([]);
          groupOutline.visible(false);
          layer.batchDraw();
          notifySelection();
          updateDebug('clear');
          return;
        }
        var meta = resolveClickTarget(e.target);
        if (!meta) return;

        if (deepSelect && meta.parentGroupId === deepSelect.groupId) {
          enterDeepSelect(deepSelect.groupId, meta.interactionId);
          return;
        }

        if (meta.parentGroupId) {
          selectGroup(meta.parentGroupId);
          return;
        }
        if (meta.groupId) {
          selectGroup(meta.groupId);
          return;
        }
        selectStandalone(meta.interactionId);
      });

      stage.on('dblclick dbltap', function (e) {
        var meta = resolveClickTarget(e.target);
        if (!meta) return;
        if (meta.parentGroupId) {
          e.evt && e.evt.preventDefault && e.evt.preventDefault();
          enterDeepSelect(meta.parentGroupId, meta.interactionId);
        }
      });

      transformer.on('transformend', function () {
        syncKonvaToEngine();
      });
      transformer.on('dragend', function () {
        syncKonvaToEngine();
      });
    }

    function paintBackground() {
      var n = getSceneNode();
      if (!n || !buttonsImg) return;
      var media = ExperienciaEngine.resolveSceneMedia
        ? ExperienciaEngine.resolveSceneMedia(shim, n)
        : null;
      var url = (media && (media.publicUrl || media.thumbnailUrl)) || '';
      if (url) {
        buttonsImg.onload = function () { rebuildFromEngine(); };
        if (buttonsImg.getAttribute('src') !== url) buttonsImg.src = url;
        buttonsImg.hidden = false;
      } else {
        buttonsImg.removeAttribute('src');
        buttonsImg.hidden = true;
      }
      if (buttonsStage) buttonsStage.hidden = false;
    }

    function bindResize() {
      if (typeof ResizeObserver === 'undefined') return;
      resizeObs = new ResizeObserver(function () {
        if (!stage) return;
        var sz = layerSize();
        stage.width(sz.w);
        stage.height(sz.h);
        rebuildFromEngine();
      });
      resizeObs.observe(konvaHost);
    }

    paintBackground();
    bindResize();
    rebuildFromEngine();

    return {
      isKonvaPoc: true,
      shim: shim,
      refresh: function () {
        paintBackground();
        rebuildFromEngine();
      },
      pull: function () {
        pullToScenes();
        updateDebug('pull');
      },
      setEditMode: function () { /* shapes-only POC */ },
      addButton: function () { return null; },
      addText: function () { return null; },
      addShape: function (kind) {
        if (!ExperienciaEngine.addSceneShape) return null;
        var res = ExperienciaEngine.addSceneShape(shim, overlayNodeId, kind || 'SHAPE_RECT');
        pullToScenes();
        rebuildFromEngine();
        if (typeof onChange === 'function') onChange();
        return res;
      },
      startHotspotDraw: function () { /* not in POC scope */ },
      getSelection: function () {
        return { hasSelection: selectedIds.length > 0, buttonIds: selectedIds.slice() };
      },
      getSelectionContext: function () {
        var ids = selectedIds.slice();
        var n = getSceneNode();
        var canGroup = false;
        var canUngroup = false;
        if (n && ids.length && ExperienciaEngine.resolveOverlayGroupForSelection) {
          var ctx = ExperienciaEngine.resolveOverlayGroupForSelection(n, ids);
          canUngroup = !!ctx;
        }
        if (n && ids.length >= 2 && ExperienciaEngine.groupSceneOverlays) {
          canGroup = true;
        }
        return {
          buttonIds: ids,
          count: ids.length,
          canGroup: canGroup,
          canUngroup: canUngroup,
          groupEditId: deepSelect ? deepSelect.groupId : null,
          isGroupEditMode: !!deepSelect
        };
      },
      groupSelectedOverlays: function () {
        if (!ExperienciaEngine.groupSceneOverlays || selectedIds.length < 2) return false;
        var sz = layerSize();
        var g = ExperienciaEngine.groupSceneOverlays(
          shim, overlayNodeId, selectedIds, sz.w, sz.h
        );
        if (!g) return false;
        pullToScenes();
        deepSelect = null;
        selectedIds = [String(g.id)];
        rebuildFromEngine();
        restoreSelectionVisual();
        notifySelection();
        if (typeof onChange === 'function') onChange();
        return true;
      },
      ungroupSelectedOverlays: function () {
        var ctx = this.getSelectionContext();
        if (!ctx.canUngroup || !ExperienciaEngine.resolveOverlayGroupForSelection) return false;
        var n = getSceneNode();
        var g = ExperienciaEngine.resolveOverlayGroupForSelection(n, selectedIds);
        if (!g) return false;
        var sz = layerSize();
        ExperienciaEngine.ungroupSceneOverlay(shim, overlayNodeId, g.id, sz.w, sz.h);
        pullToScenes();
        deepSelect = null;
        selectedIds = [];
        rebuildFromEngine();
        notifySelection();
        if (typeof onChange === 'function') onChange();
        return true;
      },
      snapshotSelectedOverlays: function () {
        if (!ExperienciaEngine.snapshotOverlayInteractions || !selectedIds.length) return [];
        return ExperienciaEngine.snapshotOverlayInteractions(shim, overlayNodeId, selectedIds);
      },
      nudgeSelected: function () { return false; },
      finishNudge: function () {},
      copySelected: function () { return false; },
      cutSelected: function () { return false; },
      pasteSelected: function () { return false; },
      undoEdit: function () { return false; },
      redoEdit: function () { return false; },
      duplicateSelected: function () { return null; },
      deleteSelected: function () {
        if (!selectedIds.length || !ExperienciaEngine.removeSceneButton) return false;
        selectedIds.slice().forEach(function (id) {
          ExperienciaEngine.removeSceneButton(shim, overlayNodeId, id);
        });
        pullToScenes();
        selectedIds = [];
        deepSelect = null;
        rebuildFromEngine();
        notifySelection();
        if (typeof onChange === 'function') onChange();
        return true;
      },
      clearSelection: function () {
        selectedIds = [];
        deepSelect = null;
        transformer.nodes([]);
        groupOutline.visible(false);
        layer.batchDraw();
        notifySelection();
        return true;
      },
      exitGroupEditMode: function () {
        exitDeepSelect();
        return true;
      },
      isInGroupEditMode: function () {
        return !!deepSelect;
      },
      cancelActiveTool: function () { return false; },
      toggleLockSelected: function () { return null; },
      bringSelectedToFront: function () { return null; },
      selectOverlayItem: function (itemId) {
        if (!itemId) return false;
        var n = getSceneNode();
        var ix = n && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(n, itemId)
          : null;
        if (!ix) return false;
        if (isGroupType(ix)) {
          selectGroup(String(itemId));
          return true;
        }
        if (ix.groupId) {
          selectGroup(String(ix.groupId));
          return true;
        }
        selectStandalone(String(itemId));
        return true;
      },
      toggleOverlayItemSelection: function () { return false; },
      setInteractionFlags: function () { return false; },
      reorderInteraction: function () { return false; },
      setInspectorBody: function () {},
      destroy: function () {
        pullToScenes();
        if (resizeObs) {
          try { resizeObs.disconnect(); } catch (eRo) { /* ignore */ }
          resizeObs = null;
        }
        if (stage) {
          stage.destroy();
          stage = null;
        }
        hostEl.innerHTML = '';
        hostEl.classList.remove('is-konva-poc');
      }
    };
  }

  return {
    isEnabled: isEnabled,
    mount: mount,
    EDITOR_PROJECT_ID: EDITOR_PROJECT_ID
  };
})();
