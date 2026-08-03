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
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;

  function isEnabled(options) {
    options = options || {};
    if (options.konvaPoc === true) return true;
    try {
      var q = new URLSearchParams(window.location.search);
      var v = q.get('konva');
      if (v === '0' || v === 'false') return false;
      if (v === '1' || v === 'true') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function parseColor(raw, fallback) {
    if (!raw) return fallback || 'rgba(255,255,255,0.45)';
    return String(raw);
  }

  function normalizeShapeType(ix) {
    if (!ix) return '';
    var t = String(ix.type || '').toUpperCase();
    if (t === 'RECT') return 'SHAPE_RECT';
    if (t === 'CIRCLE') return 'SHAPE_CIRCLE';
    return t;
  }

  function shapeColors(vm, ix) {
    ix = ix || (vm && vm._ix) || vm || {};
    var fill = parseColor(vm && vm.fill != null ? vm.fill : ix.fill, 'rgba(255,255,255,0.38)');
    var stroke = parseColor(vm && vm.stroke != null ? vm.stroke : ix.stroke, 'rgba(255,255,255,0.95)');
    var sw = vm && vm.strokeWidth != null ? Number(vm.strokeWidth)
      : (ix.strokeWidth != null ? Number(ix.strokeWidth) : 2);
    return { fill: fill, stroke: stroke, strokeWidth: Math.max(1, sw) };
  }

  function shapeSizePct(vm, ix) {
    ix = ix || (vm && vm._ix) || vm || {};
    return {
      w: vm && vm.width != null ? Number(vm.width)
        : (ix.width != null ? Number(ix.width) : 12),
      h: vm && vm.height != null ? Number(vm.height)
        : (ix.height != null ? Number(ix.height) : 8)
    };
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

    var shellHtml =
      '<div class="konva-poc-shell" data-konva-poc-shell="1">' +
        '<div class="konva-overlay-host" data-konva-host="1"></div>' +
      '</div>';
    hostEl.innerHTML = shellHtml;
    hostEl.classList.add('is-konva-poc');
    hostEl.setAttribute('data-konva-poc-active', '1');
    hostEl.style.pointerEvents = 'auto';
    hostEl.style.touchAction = 'none';

    var badge = document.createElement('div');
    badge.className = 'konva-poc-badge';
    badge.setAttribute('data-konva-poc-badge', '1');
    badge.textContent = 'KONVA POC';
    badge.title = 'Motor Konva activo (Fase 0). Opt-in: ?konva=1';
    hostEl.appendChild(badge);

    try {
      console.info('[KonvaOverlayRenderer] mounted — shapes via Konva Stage');
    } catch (eLog) { /* ignore */ }

    var konvaHost = hostEl.querySelector('[data-konva-host]');
    if (!konvaHost) return null;

    var pocShell = hostEl.querySelector('[data-konva-poc-shell]');
    if (pocShell) {
      pocShell.style.width = '100%';
      pocShell.style.height = '100%';
    }
    konvaHost.style.width = '100%';
    konvaHost.style.height = '100%';
    konvaHost.style.pointerEvents = 'auto';
    konvaHost.style.touchAction = 'none';

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
    var resizeTimer = null;
    var lastLayerW = 0;
    var lastLayerH = 0;
    var blockClickAfterDrag = false;

    function layerSize() {
      return { w: DESIGN_W, h: DESIGN_H };
    }

    function fitStageToHost() {
      if (!stage || !konvaHost) return;
      /* Keep stage at design resolution — never size from getBoundingClientRect()
         inside CSS-scaled viewport (canvas would be smaller than 1920×1080 layout). */
      stage.width(DESIGN_W);
      stage.height(DESIGN_H);
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
    }

    function syncTransformer() {
      if (!transformer || !layer) return;
      var nodes = transformer.nodes();
      var active = !!(nodes && nodes.length);
      transformer.listening(active);
      transformer.visible(active);
      if (active) transformer.moveToTop();
      layer.batchDraw();
    }

    function isVisible(ix) {
      return ix && ix.enabled !== false;
    }

    function prepareSceneGraph(n, layerW, layerH) {
      if (!n || !n.config || !Array.isArray(n.config.interactions)) return;
      n.config.interactions.forEach(function (ix) {
        if (!ix) return;
        var nt = normalizeShapeType(ix);
        if (nt === 'SHAPE_RECT' || nt === 'SHAPE_CIRCLE') {
          if (String(ix.type || '').toUpperCase() !== nt) ix.type = nt;
        }
        if (ExperienciaEngine.ensureFreeOverlayDefaults && isShapeType(ix)) {
          ExperienciaEngine.ensureFreeOverlayDefaults(ix);
        }
        if (isGroupType(ix)) {
          if (ExperienciaEngine.ensureOverlayGroupDefaults) {
            ExperienciaEngine.ensureOverlayGroupDefaults(n, ix, layerW, layerH);
          }
          if (ExperienciaEngine.migrateGroupedChildLocals) {
            ExperienciaEngine.migrateGroupedChildLocals(n, ix, layerW, layerH);
          }
        }
      });
    }

    function getSceneNode() {
      return overlayNodeId ? ExperienciaEngine.getNode(shim, overlayNodeId) : null;
    }

    function getInteractions() {
      var n = getSceneNode();
      return (n && n.config && n.config.interactions) ? n.config.interactions : [];
    }

    function isShapeType(ix) {
      var t = normalizeShapeType(ix);
      return t === 'SHAPE_RECT' || t === 'SHAPE_CIRCLE' || t === 'SHAPE_LINE' || t === 'SHAPE_TRIANGLE';
    }

    function getOverlayVm(n, ix, layerW, layerH) {
      if (!ix || !n) return null;
      if (ExperienciaEngine.getSceneOverlayItem) {
        return ExperienciaEngine.getSceneOverlayItem(shim, n, ix.id, layerW, layerH);
      }
      if (ExperienciaEngine.buttonViewModel) {
        return ExperienciaEngine.buttonViewModel(shim, n, ix, layerW, layerH);
      }
      return ix;
    }

    function memberNodesForGroup(groupId) {
      var n = getSceneNode();
      var gix = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, groupId)
        : null;
      if (!gix || !Array.isArray(gix.memberIds)) return [];
      return gix.memberIds.map(function (mid) {
        return nodeMap[String(mid)];
      }).filter(Boolean);
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

    function ensureChromeNodes() {
      if (transformer) {
        try { transformer.destroy(); } catch (eTd) { /* ignore */ }
        transformer = null;
      }
      if (groupOutline) {
        try { groupOutline.destroy(); } catch (eGo) { /* ignore */ }
        groupOutline = null;
      }
      transformer = new Konva.Transformer({
        rotateEnabled: true,
        enabledAnchors: [
          'top-left', 'top-center', 'top-right',
          'middle-left', 'middle-right',
          'bottom-left', 'bottom-center', 'bottom-right'
        ],
        borderStroke: '#ffffff',
        anchorStroke: '#ffffff',
        anchorFill: '#111111',
        anchorSize: 10,
        anchorCornerRadius: 2,
        rotateAnchorOffset: 28,
        padding: 4,
        keepRatio: false,
        ignoreStroke: true,
        shouldOverdrawWholeArea: false
      });
      groupOutline = new Konva.Rect({
        stroke: 'rgba(255,255,255,0.35)',
        strokeWidth: 1,
        dash: [6, 4],
        listening: false,
        visible: false
      });
      layer.add(groupOutline);
      layer.add(transformer);
      groupOutline.moveToBottom();
      transformer.moveToTop();
      transformer.on('transformend', function () {
        syncKonvaToEngine();
      });
      transformer.on('dragend', function () {
        syncKonvaToEngine();
      });
    }

    function ensureStage() {
      var sz = layerSize();
      if (!stage) {
        stage = new Konva.Stage({
          container: konvaHost,
          width: sz.w,
          height: sz.h
        });
        layer = new Konva.Layer({ listening: true });
        stage.add(layer);
        ensureChromeNodes();
        bindStageEvents();
        var content = konvaHost.querySelector('.konvajs-content');
        if (content) {
          content.style.pointerEvents = 'auto';
          content.style.touchAction = 'none';
        }
      } else {
        stage.width(sz.w);
        stage.height(sz.h);
      }
      fitStageToHost();
    }

    function bindShapeDrag(node) {
      if (!node || node.getAttr('isLocked')) return;
      /* Konva Transformer scales/rotates; move requires draggable nodes. */
      node.draggable(true);
      if (typeof node.dragDistance === 'function') node.dragDistance(4);
      node.off('dragend.konvaPoc');
      node.on('dragend.konvaPoc', function () {
        blockClickAfterDrag = true;
        syncKonvaToEngine();
      });
    }

    function createShapeNode(vm, opts) {
      opts = opts || {};
      var sz = layerSize();
      var ix = (vm && vm._ix) ? vm._ix : vm;
      var t = normalizeShapeType(vm || ix);
      var dims = shapeSizePct(vm, ix);
      var geom = pctCenterToKonva(
        Number(vm.x != null ? vm.x : ix.x) || 50,
        Number(vm.y != null ? vm.y : ix.y) || 50,
        dims.w,
        dims.h,
        sz.w,
        sz.h
      );
      var colors = shapeColors(vm, ix);
      var node;
      var locked = !!(vm && vm.locked) || !!(ix && ix.locked);

      if (t === 'SHAPE_CIRCLE') {
        var r = Math.min(geom.width, geom.height) / 2;
        node = new Konva.Circle({
          x: geom.x,
          y: geom.y,
          radius: r,
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: colors.strokeWidth,
          rotation: Number(vm.rotation != null ? vm.rotation : ix.rotation) || 0
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
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: colors.strokeWidth,
          cornerRadius: vm.borderRadius != null ? Number(vm.borderRadius)
            : (ix.borderRadius != null ? Number(ix.borderRadius) : 0),
          rotation: Number(vm.rotation != null ? vm.rotation : ix.rotation) || 0
        });
        node.setAttr('shapeKind', 'rect');
      }

      node.listening(true);
      node.hitStrokeWidth(12);
      node.setAttr('interactionId', String(vm.id || ix.id));
      var gid = opts.groupId || vm.groupId || ix.groupId;
      if (gid) node.setAttr('parentGroupId', String(gid));
      if (locked) {
        node.setAttr('isLocked', true);
        node.draggable(false);
      } else {
        bindShapeDrag(node);
      }
      return node;
    }

    function applyVmToGroupChild(konvaChild, vm, groupIx, sz) {
      var ix = (vm && vm._ix) ? vm._ix : vm;
      var lx = ix.localX;
      var ly = ix.localY;
      var lr = Number(ix.localRotation) || 0;
      if ((lx == null || ly == null) && groupIx && ExperienciaEngine.absoluteToLocalOverlay) {
        var local = ExperienciaEngine.absoluteToLocalOverlay(groupIx, ix, sz.w, sz.h);
        if (local) {
          lx = local.localX;
          ly = local.localY;
          lr = Number(local.localRotation) || 0;
        }
      }
      lx = Number(lx) || 0;
      ly = Number(ly) || 0;
      var dims = shapeSizePct(vm, ix);
      var geom = pctCenterToKonva(lx, ly, dims.w, dims.h, sz.w, sz.h);
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
      prepareSceneGraph(n, sz.w, sz.h);
      syncing = true;
      try {
      if (resizeObs) {
        try { resizeObs.disconnect(); } catch (eDisc) { /* ignore */ }
      }
      if (transformer) transformer.nodes([]);
      nodeMap = {};
      groupMap = {};
      layer.destroyChildren();
      ensureChromeNodes();

      var interactions = getInteractions();

      /* Flat world-space render — same SSOT as ExperienciaCanvas DOM overlay. */
      interactions.forEach(function (ix) {
        if (!ix || !isShapeType(ix) || !isVisible(ix)) return;
        var vm = getOverlayVm(n, ix, sz.w, sz.h);
        if (!vm) return;
        var shape = createShapeNode(vm);
        layer.add(shape);
        nodeMap[String(ix.id)] = shape;
        if (ix.groupId) {
          var gk = String(ix.groupId);
          if (!groupMap[gk]) groupMap[gk] = [];
          groupMap[gk].push(shape);
        }
      });

      /* Ensure groupMap lists member Konva nodes by memberIds. */
      interactions.forEach(function (ix) {
        if (!ix || !isGroupType(ix) || !isVisible(ix)) return;
        var gid = String(ix.id);
        if (!groupMap[gid] || !groupMap[gid].length) {
          groupMap[gid] = (ix.memberIds || []).map(function (mid) {
            return nodeMap[String(mid)];
          }).filter(Boolean);
        }
      });

      layer.batchDraw();
      lastLayerW = sz.w;
      lastLayerH = sz.h;
      fitStageToHost();
      if (resizeObs && konvaHost) {
        try { resizeObs.observe(konvaHost); } catch (eObs) { /* ignore */ }
      }
      restoreSelectionVisual();
      updateDebug('rebuild');
      } finally {
        syncing = false;
      }
    }

    function restoreSelectionVisual() {
      if (!selectedIds.length) {
        transformer.nodes([]);
        groupOutline.visible(false);
        syncTransformer();
        return;
      }
      var id = selectedIds[0];
      if (deepSelect && deepSelect.childId) {
        var childNode = nodeMap[String(deepSelect.childId)];
        if (childNode && !childNode.getAttr('isLocked')) {
          transformer.nodes([childNode]);
          showGroupOutline(deepSelect.groupId);
          syncTransformer();
          return;
        }
      }
      var members = groupMap[String(id)];
      if (members && members.length) {
        var gn = getSceneNode();
        var gix = gn && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(gn, id)
          : null;
        transformer.nodes(gix && gix.locked ? [] : members);
        groupOutline.visible(false);
        syncTransformer();
        return;
      }
      var selNode = nodeMap[String(id)];
      if (selNode) {
        transformer.nodes(selNode.getAttr('isLocked') ? [] : [selNode]);
        groupOutline.visible(false);
        syncTransformer();
      }
    }

    function showGroupOutline(groupId) {
      var members = groupMap[String(groupId)] || memberNodesForGroup(groupId);
      if (!members.length) {
        groupOutline.visible(false);
        return;
      }
      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;
      members.forEach(function (node) {
        var r = node.getClientRect({ relativeTo: layer });
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      });
      groupOutline.setAttrs({
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        rotation: 0,
        visible: true
      });
      groupOutline.moveToBottom();
    }

    function selectGroup(groupId) {
      deepSelect = null;
      selectedIds = [String(groupId)];
      var members = groupMap[String(groupId)] || memberNodesForGroup(groupId);
      var gn = getSceneNode();
      var gix = gn && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(gn, groupId)
        : null;
      if (members.length && !(gix && gix.locked)) {
        transformer.nodes(members);
        groupOutline.visible(false);
        syncTransformer();
      } else {
        transformer.nodes([]);
        syncTransformer();
      }
      notifySelection();
      updateDebug('select-group');
    }

    function enterDeepSelect(groupId, childId) {
      deepSelect = { groupId: String(groupId), childId: String(childId) };
      selectedIds = [String(childId)];
      var child = nodeMap[String(childId)];
      if (child && !child.getAttr('isLocked')) {
        transformer.nodes([child]);
        showGroupOutline(groupId);
        syncTransformer();
      } else {
        transformer.nodes([]);
        syncTransformer();
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
      if (node && !node.getAttr('isLocked')) {
        transformer.nodes([node]);
        groupOutline.visible(false);
        syncTransformer();
      } else {
        transformer.nodes([]);
        syncTransformer();
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
      try {
        var nodes = transformer.nodes();
        if (!nodes.length) return;
        var konvaNode = nodes[0];
        var meta = resolveClickTarget(konvaNode);
        if (!meta) return;

        if (deepSelect && deepSelect.childId) {
          var pctDeep = konvaToPctCenter(konvaNode, sz.w, sz.h);
          if (ExperienciaEngine.updateSceneButton) {
            ExperienciaEngine.updateSceneButton(shim, overlayNodeId, deepSelect.childId, {
              x: pctDeep.x,
              y: pctDeep.y,
              width: pctDeep.width,
              height: pctDeep.height,
              rotation: pctDeep.rotation
            });
          }
        } else if (selectedIds.length && groupMap[String(selectedIds[0])]) {
          var gidSel = String(selectedIds[0]);
          var members = transformer.nodes();
          if (members.length > 1) {
            var minX = Infinity;
            var minY = Infinity;
            var maxX = -Infinity;
            var maxY = -Infinity;
            members.forEach(function (node) {
              var r = node.getClientRect({ relativeTo: layer });
              minX = Math.min(minX, r.x);
              minY = Math.min(minY, r.y);
              maxX = Math.max(maxX, r.x + r.width);
              maxY = Math.max(maxY, r.y + r.height);
            });
            if (ExperienciaEngine.updateOverlayGroupTransform) {
              ExperienciaEngine.updateOverlayGroupTransform(shim, overlayNodeId, gidSel, {
                x: ((minX + maxX) / 2 / sz.w) * 100,
                y: ((minY + maxY) / 2 / sz.h) * 100,
                width: ((maxX - minX) / sz.w) * 100,
                height: ((maxY - minY) / sz.h) * 100,
                layerW: sz.w,
                layerH: sz.h
              });
            }
          }
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
        updateDebug('transformend');
        if (typeof onChange === 'function') onChange();
      } finally {
        syncing = false;
      }
      rebuildFromEngine();
    }

    function isGroupId(id) {
      var sn = getSceneNode();
      var ix = sn && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(sn, id)
        : null;
      return !!(ix && isGroupType(ix));
    }

    function deleteOverlayId(id) {
      if (!id || !overlayNodeId) return false;
      var n = getSceneNode();
      if (!n) return false;
      var iid = String(id);
      if (isGroupId(iid)) {
        var gDel = ExperienciaEngine.getInteraction(n, iid);
        (gDel && gDel.memberIds ? gDel.memberIds : []).forEach(function (mid) {
          if (ExperienciaEngine.removeSceneButton) {
            ExperienciaEngine.removeSceneButton(shim, overlayNodeId, mid);
          }
        });
        if (n.config && Array.isArray(n.config.interactions)) {
          n.config.interactions = n.config.interactions.filter(function (item) {
            return String(item.id) !== iid;
          });
        }
      } else if (ExperienciaEngine.removeSceneButton) {
        if (!ExperienciaEngine.removeSceneButton(shim, overlayNodeId, iid)) return false;
      } else {
        return false;
      }
      pullToScenes();
      return true;
    }

    function bindStageEvents() {
      stage.on('click tap', function (e) {
        if (blockClickAfterDrag) {
          blockClickAfterDrag = false;
          return;
        }
        if (e.target === stage || e.target === layer) {
          selectedIds = [];
          deepSelect = null;
          transformer.nodes([]);
          groupOutline.visible(false);
          syncTransformer();
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
    }

    function bindResize() {
      if (typeof ResizeObserver === 'undefined') return;
      resizeObs = new ResizeObserver(function () {
        if (!stage || syncing) return;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          resizeTimer = null;
          if (!stage || syncing) return;
          fitStageToHost();
          layer.batchDraw();
        }, 80);
      });
      resizeObs.observe(konvaHost);
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        rebuildFromEngine();
      });
    });
    bindResize();

    return {
      isKonvaPoc: true,
      shim: shim,
      refresh: function () {
        rebuildFromEngine();
      },
      fitStage: function () {
        fitStageToHost();
        syncTransformer();
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
        if (res && res.id) {
          deepSelect = null;
          selectedIds = [String(res.id)];
        }
        pullToScenes();
        rebuildFromEngine();
        notifySelection();
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
        if (!selectedIds.length) return false;
        var ids = selectedIds.slice();
        ids.forEach(function (id) {
          deleteOverlayId(id);
        });
        pullToScenes();
        selectedIds = [];
        deepSelect = null;
        rebuildFromEngine();
        notifySelection();
        if (typeof onChange === 'function') onChange();
        return true;
      },
      removeOverlayById: function (id) {
        if (!deleteOverlayId(id)) return false;
        if (selectedIds.indexOf(String(id)) >= 0) {
          selectedIds = selectedIds.filter(function (sid) { return String(sid) !== String(id); });
        }
        if (deepSelect && String(deepSelect.childId) === String(id)) deepSelect = null;
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
        syncTransformer();
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
      toggleLockSelected: function () {
        if (!selectedIds.length) return null;
        var n = getSceneNode();
        var targetId = deepSelect ? deepSelect.childId : selectedIds[0];
        var ix = n && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(n, targetId)
          : null;
        if (!ix) return null;
        ix.locked = !ix.locked;
        pullToScenes();
        rebuildFromEngine();
        restoreSelectionVisual();
        if (typeof onChange === 'function') onChange();
        return ix.locked;
      },
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
      setInteractionFlags: function (id, flags) {
        if (!id) return false;
        flags = flags || {};
        var n = getSceneNode();
        var ix = n && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(n, id)
          : null;
        if (!ix) return false;
        if (flags.visible != null) {
          ix.enabled = !!flags.visible;
          ix.visible = !!flags.visible;
        }
        if (flags.locked != null) ix.locked = !!flags.locked;
        pullToScenes();
        rebuildFromEngine();
        restoreSelectionVisual();
        if (typeof onChange === 'function') onChange();
        return true;
      },
      reorderInteraction: function (itemId, dir) {
        if (!itemId || !overlayNodeId) return false;
        var n = getSceneNode();
        if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
        var list = n.config.interactions;
        var idx = -1;
        var i;
        for (i = 0; i < list.length; i++) {
          if (String(list[i].id) === String(itemId)) { idx = i; break; }
        }
        if (idx < 0) return false;
        var next = idx + (dir < 0 ? -1 : 1);
        if (next < 0 || next >= list.length) return false;
        var tmp = list[idx];
        list[idx] = list[next];
        list[next] = tmp;
        pullToScenes();
        rebuildFromEngine();
        if (typeof onChange === 'function') onChange();
        return true;
      },
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
