/* BOXIES V5.9.66 — Autolayout de plantillas: sin solapes, columnas legibles */
var ExperienciaCanvas = (function () {
  var MIN_ZOOM = 0.35;
  var MAX_ZOOM = 1.8;
  var CANVAS_MODE_KEY = 'experienciaCanvasMode';

  /** Temporary — ?shapeDebug=0 disables. Logs shape vs gizmo divergence. */
  function shapeResizeDebugEnabled() {
    if (typeof window !== 'undefined' && window.__QE_SHAPE_RESIZE_DEBUG__ === false) return false;
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('shapeDebug') === '0') return false;
    } catch (eDbg) { /* ignore */ }
    return true;
  }

  /** Temporary — 7-stage resize trace (?shapeTrace=1 or shapeDebug on). */
  function shapeResizeTraceEnabled() {
    if (typeof window !== 'undefined' && window.__QE_SHAPE_TRACE__ === false) return false;
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('shapeTrace') === '0') return false;
      if (q.get('shapeTrace') === '1') return true;
    } catch (eTr) { /* ignore */ }
    return shapeResizeDebugEnabled();
  }

  function shapeModelFields(src) {
    if (!src) return null;
    var ix = src._ix || src;
    return {
      width: ix.width != null ? Number(ix.width) : (src.width != null ? Number(src.width) : null),
      height: ix.height != null ? Number(ix.height) : (src.height != null ? Number(src.height) : null),
      x: ix.x != null ? Number(ix.x) : (src.storedX != null ? Number(src.storedX) : Number(src.x)),
      y: ix.y != null ? Number(ix.y) : (src.storedY != null ? Number(src.storedY) : Number(src.y)),
      scaleX: ix.shapeStretchX != null ? Number(ix.shapeStretchX)
        : (src.shapeStretchX != null ? Number(src.shapeStretchX) : 1),
      scaleY: ix.shapeStretchY != null ? Number(ix.shapeStretchY)
        : (src.shapeStretchY != null ? Number(src.shapeStretchY) : 1),
      shapeContentBox: !!(ix.shapeContentBox || src.shapeContentBox)
    };
  }

  function patchModelFields(patch) {
    if (!patch) return null;
    return {
      width: patch.width != null ? Number(patch.width) : null,
      height: patch.height != null ? Number(patch.height) : null,
      x: patch.x != null ? Number(patch.x) : null,
      y: patch.y != null ? Number(patch.y) : null,
      scaleX: patch.shapeStretchX != null ? Number(patch.shapeStretchX) : null,
      scaleY: patch.shapeStretchY != null ? Number(patch.shapeStretchY) : null,
      shapeContentBox: patch.shapeContentBox != null ? !!patch.shapeContentBox : null
    };
  }

  function shapeResizeTrace(stage, payload) {
    if (!shapeResizeTraceEnabled()) return;
    console.log(
      '%c[SHAPE-TRACE] ' + stage,
      'color:#ff9900;font-weight:bold;font-size:12px',
      payload || {}
    );
  }

  /** One-line numeric dump — copy/paste friendly (filter: SHAPE-TRACE-NUM). */
  function shapeTraceNum(stage, fields, extra) {
    if (!shapeResizeTraceEnabled()) return;
    var f = fields || {};
    var line = '[SHAPE-TRACE-NUM] ' + stage +
      ' | w=' + (f.width != null ? +Number(f.width).toFixed(3) : 'null') +
      ' h=' + (f.height != null ? +Number(f.height).toFixed(3) : 'null') +
      ' x=' + (f.x != null ? +Number(f.x).toFixed(3) : 'null') +
      ' y=' + (f.y != null ? +Number(f.y).toFixed(3) : 'null') +
      ' scaleX=' + (f.scaleX != null ? +Number(f.scaleX).toFixed(4) : 'null') +
      ' scaleY=' + (f.scaleY != null ? +Number(f.scaleY).toFixed(4) : 'null') +
      ' scb=' + (f.shapeContentBox != null ? !!f.shapeContentBox : 'null');
    if (extra) line += ' | ' + extra;
    console.log('%c' + line, 'color:#0ff;font-family:monospace;font-size:11px');
  }

  function shapeTraceNumBox(stage, box, extra) {
    if (!box) {
      shapeTraceNum(stage, null, extra || 'box=null');
      return;
    }
    shapeTraceNum(stage, {
      width: box.w != null ? box.w : box.width,
      height: box.h != null ? box.h : box.height,
      x: box.cx != null ? box.cx : box.x,
      y: box.cy != null ? box.cy : box.y,
      scaleX: box.scaleX,
      scaleY: box.scaleY,
      shapeContentBox: box.shapeContentBox
    }, extra);
  }

  var _shapeResizeTraceCtx = null;

  /** Quotation sandbox — ShapeBox v2 POC (Fases 1–3). */
  var EDITOR_PROJECT_ID = '5a70961a-a97a-4082-abd2-33a633b779e8';
  var _shapeBoxV2Active = false;
  var _shapeBoxV2ProjectId = null;

  function shapeBoxProjectIdFromUrl() {
    try {
      var q = new URLSearchParams(window.location.search);
      return String(q.get('projectId') || q.get('proyectoId') || '').trim();
    } catch (eUrl) { /* ignore */ }
    return '';
  }

  /**
   * ShapeBox v2 flag:
   *   ?shapeBox=1  → force ON (any project)
   *   ?shapeBox=0  → force OFF (legacy on EDITOR)
   *   default ON   → EDITOR project only (mount projectId or URL ?projectId=)
   */
  function shapeBoxV2Enabled(projectId) {
    try {
      var q = new URLSearchParams(window.location.search);
      var v = q.get('shapeBox');
      if (v === '0' || v === 'false') return false;
      if (v === '1' || v === 'true') return true;
    } catch (eFlag) { /* ignore */ }
    var pid = projectId != null && String(projectId).trim() !== ''
      ? String(projectId).trim()
      : String(_shapeBoxV2ProjectId || shapeBoxProjectIdFromUrl() || '').trim();
    return !!(pid && pid === EDITOR_PROJECT_ID);
  }

  function shapeBoxV2DebugSnapshot() {
    var urlPid = shapeBoxProjectIdFromUrl();
    var urlShapeBox = null;
    try { urlShapeBox = new URLSearchParams(window.location.search).get('shapeBox'); } catch (eQ) { /* ignore */ }
    return {
      active: !!_shapeBoxV2Active,
      mountProjectId: _shapeBoxV2ProjectId,
      urlProjectId: urlPid,
      urlShapeBox: urlShapeBox,
      editorProjectId: EDITOR_PROJECT_ID,
      enabledForMountId: shapeBoxV2Enabled(_shapeBoxV2ProjectId),
      enabledForUrlId: shapeBoxV2Enabled(urlPid)
    };
  }

  function isShapeBoxV2Active() {
    return !!_shapeBoxV2Active;
  }

  function esc(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isShapeType(t) {
    return typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.isSceneShapeType
      ? ExperienciaEngine.isSceneShapeType(t)
      : false;
  }

  function isSquareShapeType(t) {
    return typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.isSquareSceneShapeType
      ? ExperienciaEngine.isSquareSceneShapeType(t)
      : false;
  }

  /** Circle/donut corner drag: pixel-square uniform scale on 16:9 layers. */
  function shapeUsesPixelSquareCornerResize(kind) {
    kind = String(kind || '').toUpperCase();
    return kind === 'SHAPE_CIRCLE' || kind === 'SHAPE_DONUT';
  }

  /** Pointer delta → shape-local px (respect gizmo rotation). */
  function shapeResizePointerLocalPx(drag, dxPx, dyPx) {
    var rad = (Number(drag && drag.startRot) || 0) * Math.PI / 180;
    dxPx = Number(dxPx) || 0;
    dyPx = Number(dyPx) || 0;
    if (Math.abs(rad) < 1e-6) return { dx: dxPx, dy: dyPx };
    var cosR = Math.cos(rad);
    var sinR = Math.sin(rad);
    return {
      dx: dxPx * cosR + dyPx * sinR,
      dy: -dxPx * sinR + dyPx * cosR
    };
  }

  /** Corner resize: proportional by default; Shift = free aspect stretch. */
  function shapeCornerKeepRatioDefault(kind, shiftKey) {
    return !shiftKey;
  }

  /** Shapes: edge handles resize one axis; corners keep ratio. Circle stays uniform. */
  function shouldCoupleShapeResizeAxes(type, moveE, moveW, moveN, moveS, keepRatio) {
    if (!keepRatio) return false;
    type = String(type || '').toUpperCase();
    if (!isShapeType(type)) return true;
    if ((moveE || moveW) && (moveN || moveS)) return true;
    if (type === 'SHAPE_CIRCLE') return true;
    return false;
  }

  /** Layer % w×h → pixel-square gw×gh (16:9-safe). */
  function shapePixelSquareDims(wPct, hPct, layerW, layerH) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var w = Number(wPct);
    var h = Number(hPct);
    if (isNaN(w) || w <= 0) return null;
    if (isNaN(h) || h <= 0) {
      h = w * (layerW / layerH);
    }
    return { w: w, h: h };
  }

  /** Edge = axis stretch (fixed caps/radii); corner = uniform stretch. All math in % layer space. */
  function resolveShapeStretchResize(drag, dxPx, dyPx, layerW, layerH, mode, keepRatio) {
    if (!drag || !isShapeType(drag.type)) return null;
    var kind = String(drag.type || '').toUpperCase();
    var moveE = mode.indexOf('e') >= 0;
    var moveW = mode.indexOf('w') >= 0;
    var moveS = mode.indexOf('s') >= 0;
    var moveN = mode.indexOf('n') >= 0;
    layerW = Math.max(1, Number(layerW) || Number(drag.layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || Number(drag.layerH) || 1000);
    var localPtr = shapeResizePointerLocalPx(drag, dxPx, dyPx);
    dxPx = localPtr.dx;
    dyPx = localPtr.dy;
    var dxPct = (Number(dxPx) / layerW) * 100;
    var dyPct = (Number(dyPx) / layerH) * 100;
    var startL = Number(drag.startL);
    var startR = Number(drag.startR);
    var startT = Number(drag.startT);
    var startB = Number(drag.startB);
    var startGw = startR - startL;
    var startGh = startB - startT;
    var startStretchX = drag.startStretchX || 1;
    var startStretchY = drag.startStretchY || 1;
    if (!startGw || startGw <= 0) return null;

    var minGw = Math.max(0.06, 1.2);
    var minGh = Math.max(0.06, 1.2);
    var L = startL;
    var R = startR;
    var T = startT;
    var B = startB;

    if (kind === 'SHAPE_LINE') {
      if (moveE && !moveW) R = startR + dxPct;
      else if (moveW && !moveE) L = startL + dxPct;
      else {
        if (moveE) R = startR + dxPct;
        if (moveW) L = startL + dxPct;
      }
      var lineGw = Math.max(minGw, R - L);
      if (moveW && !moveE) {
        L = startR - lineGw;
        R = startR;
      } else if (moveE && !moveW) {
        R = L + lineGw;
      } else {
        R = L + lineGw;
      }
      var lineScaleX = lineGw / startGw;
      return {
        cx: (L + R) / 2,
        cy: (T + B) / 2,
        w: lineGw,
        h: startGh,
        stretchX: startStretchX * lineScaleX,
        stretchY: startStretchY
      };
    }

    /* Content-box / ShapeBox v2: resize gw×gh; stretch stays fixed (no SVG bleed). */
    if (drag.shapeContentBox || drag.shapeBoxV2) {
      if (moveE) R = startR + dxPct;
      if (moveW) L = startL + dxPct;
      if (moveS) B = startB + dyPct;
      if (moveN) T = startT + dyPct;
      var boxGw = Math.max(minGw, R - L);
      var boxGh = Math.max(minGh, B - T);
      if (moveE && !moveW) { L = startL; R = L + boxGw; }
      else if (moveW && !moveE) { R = startR; L = R - boxGw; }
      if (moveS && !moveN) { T = startT; B = T + boxGh; }
      else if (moveN && !moveS) { B = startB; T = B - boxGh; }
      boxGw = Math.max(minGw, R - L);
      boxGh = Math.max(minGh, B - T);
      var scaleBoxW = boxGw / startGw;
      var scaleBoxH = boxGh / startGh;
      var isCornerBox = (moveE || moveW) && (moveN || moveS);
      var isEdgeXBox = (moveE || moveW) && !(moveN || moveS);
      var isEdgeYBox = (moveN || moveS) && !(moveE || moveW);
      var outGw = startGw;
      var outGh = startGh;
      if (isCornerBox) {
        if (drag.shapeBoxV2 && keepRatio && shapeUsesPixelSquareCornerResize(kind)) {
          /* Pixel-space uniform scale — keeps circles/donuts round on 16:9 layers. */
          var startPxW = (startGw / 100) * layerW;
          var startPxH = (startGh / 100) * layerH;
          var startPxSize = Math.max(startPxW, startPxH, 1);
          var candPxW = (boxGw / 100) * layerW;
          var candPxH = (boxGh / 100) * layerH;
          var scalePx = Math.abs(dxPx) >= Math.abs(dyPx)
            ? candPxW / Math.max(startPxW, 0.001)
            : candPxH / Math.max(startPxH, 0.001);
          if (kind === 'SHAPE_CIRCLE' || kind === 'SHAPE_DONUT') {
            scalePx = Math.abs(dxPx) * startPxH >= Math.abs(dyPx) * startPxW
              ? candPxW / Math.max(startPxW, 0.001)
              : candPxH / Math.max(startPxH, 0.001);
          }
          scalePx = Math.max(0.06, Math.min(6, scalePx));
          var newPxSize = Math.max((minGw / 100) * layerW, startPxSize * scalePx);
          outGw = (newPxSize / layerW) * 100;
          outGh = (newPxSize / layerH) * 100;
        } else if (keepRatio) {
          var startPxW = (startGw / 100) * layerW;
          var startPxH = (startGh / 100) * layerH;
          var targetPxW = (boxGw / 100) * layerW;
          var targetPxH = (boxGh / 100) * layerH;
          var scale;
          if (shapeUsesPixelSquareCornerResize(kind)) {
            scale = Math.abs(dxPx) * startPxH >= Math.abs(dyPx) * startPxW
              ? (targetPxW / Math.max(startPxW, 0.001))
              : (targetPxH / Math.max(startPxH, 0.001));
          } else {
            /* Diagonal scale from fixed opposite corner — handle tracks cursor naturally. */
            var startDiag = Math.max(Math.sqrt(startPxW * startPxW + startPxH * startPxH), 0.001);
            var targetDiag = Math.sqrt(targetPxW * targetPxW + targetPxH * targetPxH);
            scale = targetDiag / startDiag;
          }
          scale = Math.max(0.06, Math.min(6, scale));
          outGw = startGw * scale;
          outGh = startGh * scale;
        } else {
          outGw = boxGw;
          outGh = boxGh;
        }
      } else if (isEdgeXBox) {
        var LpxE = Number(drag.startLpx);
        var RpxE = Number(drag.startRpx);
        if (moveE) RpxE = drag.startRpx + dxPx;
        if (moveW) LpxE = drag.startLpx + dxPx;
        if (moveE && !moveW) LpxE = drag.startLpx;
        else if (moveW && !moveE) RpxE = drag.startRpx;
        var minWpxE = (minGw / 100) * layerW;
        var wPxE = Math.max(minWpxE, RpxE - LpxE);
        if (moveW && !moveE) LpxE = RpxE - wPxE;
        else if (moveE && !moveW) RpxE = LpxE + wPxE;
        outGw = (wPxE / layerW) * 100;
      } else if (isEdgeYBox) {
        var TpxE = Number(drag.startTpx);
        var BpxE = Number(drag.startBpx);
        if (moveS) BpxE = drag.startBpx + dyPx;
        if (moveN) TpxE = drag.startTpx + dyPx;
        if (moveS && !moveN) TpxE = drag.startTpx;
        else if (moveN && !moveS) BpxE = drag.startBpx;
        var minHpxE = (minGh / 100) * layerH;
        var hPxE = Math.max(minHpxE, BpxE - TpxE);
        if (moveN && !moveS) TpxE = BpxE - hPxE;
        else if (moveS && !moveN) BpxE = TpxE + hPxE;
        outGh = (hPxE / layerH) * 100;
      }
      var outGx = (startL + startR) / 2;
      var outGy = (startT + startB) / 2;
      if (moveE && !moveW) outGx = startL + outGw / 2;
      else if (moveW && !moveE) outGx = startR - outGw / 2;
      if (moveS && !moveN) outGy = startT + outGh / 2;
      else if (moveN && !moveS) outGy = startB - outGh / 2;
      if (moveE && moveN) {
        outGx = startL + outGw / 2;
        outGy = startB - outGh / 2;
      } else if (moveE && moveS) {
        outGx = startL + outGw / 2;
        outGy = startT + outGh / 2;
      } else if (moveW && moveN) {
        outGx = startR - outGw / 2;
        outGy = startB - outGh / 2;
      } else if (moveW && moveS) {
        outGx = startR - outGw / 2;
        outGy = startT + outGh / 2;
      }
      return {
        cx: outGx,
        cy: outGy,
        w: outGw,
        h: outGh,
        stretchX: startStretchX,
        stretchY: startStretchY
      };
    }

    if (moveE) R = startR + dxPct;
    if (moveW) L = startL + dxPct;
    if (moveS) B = startB + dyPct;
    if (moveN) T = startT + dyPct;

    var candGw = Math.max(minGw, R - L);
    var candGh = Math.max(minGh, B - T);
    if (moveE && !moveW) { L = startL; R = L + candGw; }
    else if (moveW && !moveE) { R = startR; L = R - candGw; }
    if (moveS && !moveN) { T = startT; B = T + candGh; }
    else if (moveN && !moveS) { B = startB; T = B - candGh; }

    var scaleW = candGw / startGw;
    var scaleH = candGh / startGh;
    var isCorner = (moveE || moveW) && (moveN || moveS);
    var isEdgeX = (moveE || moveW) && !(moveN || moveS);
    var isEdgeY = (moveN || moveS) && !(moveE || moveW);
    var newStretchX = startStretchX;
    var newStretchY = startStretchY;
    var newGw = startGw;
    var newGh = startGh;

    if (isCorner) {
      var scale = keepRatio && shouldCoupleShapeResizeAxes(kind, moveE, moveW, moveN, moveS, true)
        ? (Math.abs(dxPct) * startGh >= Math.abs(dyPct) * startGw ? scaleW : scaleH)
        : (Math.abs(dxPct) >= Math.abs(dyPct) ? scaleW : scaleH);
      if (kind === 'SHAPE_CIRCLE') {
        scale = Math.abs(dxPct) * startGh >= Math.abs(dyPct) * startGw ? scaleW : scaleH;
      }
      scale = Math.max(0.06, Math.min(6, scale));
      newStretchX = startStretchX * scale;
      newStretchY = startStretchY * scale;
      newGw = startGw * scale;
      newGh = startGh * scale;
    } else if (isEdgeX) {
      var sx = Math.max(0.06, Math.min(6, scaleW));
      newStretchX = startStretchX * sx;
      newGw = candGw;
      newGh = startGh;
    } else if (isEdgeY) {
      var sy = Math.max(0.06, Math.min(6, scaleH));
      newStretchY = startStretchY * sy;
      newGw = startGw;
      newGh = candGh;
    }

    var newGx = (startL + startR) / 2;
    var newGy = (startT + startB) / 2;
    if (moveE && !moveW) newGx = startL + newGw / 2;
    else if (moveW && !moveE) newGx = startR - newGw / 2;
    if (moveS && !moveN) newGy = startT + newGh / 2;
    else if (moveN && !moveS) newGy = startB - newGh / 2;
    if (moveE && moveN) {
      newGx = startL + newGw / 2;
      newGy = startB - newGh / 2;
    } else if (moveE && moveS) {
      newGx = startL + newGw / 2;
      newGy = startT + newGh / 2;
    } else if (moveW && moveN) {
      newGx = startR - newGw / 2;
      newGy = startB - newGh / 2;
    } else if (moveW && moveS) {
      newGx = startR - newGw / 2;
      newGy = startT + newGh / 2;
    }

    return {
      cx: newGx,
      cy: newGy,
      w: newGw,
      h: newGh,
      stretchX: newStretchX,
      stretchY: newStretchY
    };
  }

  function computeShapeResizeLive(drag, dxPx, dyPx, layerW, layerH, mode, keepRatio) {
    if (!drag || !isShapeType(drag.type)) return null;
    if (!drag.startTileW && !drag.shapeBoxV2) return null;
    var box = resolveShapeStretchResize(drag, dxPx, dyPx, layerW, layerH, mode, keepRatio);
    if (!box) return null;

    return {
      stretchX: box.stretchX,
      stretchY: box.stretchY,
      gm: {
        gx: box.cx,
        gy: box.cy,
        gw: box.w,
        gh: box.h
      },
      patch: {
        x: box.cx,
        y: box.cy,
        width: box.w,
        height: box.h,
        shapeStretchX: box.stretchX,
        shapeStretchY: box.stretchY,
        shapeContentBox: true
      },
      box: {
        cx: box.cx,
        cy: box.cy,
        w: box.w,
        h: box.h,
        rot: Number(drag.startRot) || 0,
        kind: String(drag.type || '').toUpperCase(),
        gizmoBox: true
      }
    };
  }

  /** Px gizmo box + stretch for live paint. */
  function computeShapeGizmoBoxLive(drag, dxPx, dyPx, layerW, layerH, mode, keepRatio) {
    return resolveShapeStretchResize(drag, dxPx, dyPx, layerW, layerH, mode, keepRatio);
  }

  function shapeResizePatchDelta(startBox, patch) {
    if (!startBox || !patch) return 0;
    return Math.max(
      Math.abs(Number(patch.width) - Number(startBox.w)),
      Math.abs(Number(patch.height) - Number(startBox.h)),
      Math.abs(Number(patch.x) - Number(startBox.cx)),
      Math.abs(Number(patch.y) - Number(startBox.cy))
    );
  }

  function shapeResizePatchChanged(startBox, patch) {
    return shapeResizePatchDelta(startBox, patch) > 0.05;
  }

  /** Prefer the drag patch when pointerup recomputes stale start geometry. */
  function resolveShapeResizeCommitPatch(drag, finPatch, dragPatch) {
    if (!dragPatch && !finPatch) return null;
    if (!dragPatch) return finPatch;
    if (!finPatch) return dragPatch;
    if (!drag || !drag.startBox) {
      return shapeResizePatchDelta(null, finPatch) >= shapeResizePatchDelta(null, dragPatch)
        ? finPatch : dragPatch;
    }
    var finD = shapeResizePatchDelta(drag.startBox, finPatch);
    var dragD = shapeResizePatchDelta(drag.startBox, dragPatch);
    if (dragD > finD + 0.05) return dragPatch;
    return finPatch;
  }

  function shapeDefaultSize(t) {
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.sceneShapeDefaultSize) {
      return ExperienciaEngine.sceneShapeDefaultSize(t);
    }
    return { w: 12, h: 8 };
  }

  function isCanvasMode() {
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load) {
      return !!BoxiesPrefs.load()[CANVAS_MODE_KEY];
    }
    return document.body.classList.contains('boxies-exp-canvas-mode');
  }

  function setCanvasMode(on, restore) {
    on = !!on;
    document.body.classList.toggle('boxies-exp-canvas-mode', on);
    document.documentElement.classList.toggle('boxies-exp-canvas-mode', on);
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.save) {
      var patch = {};
      patch[CANVAS_MODE_KEY] = on;
      if (restore) {
        patch._expCanvasRestore = restore;
      } else if (!on) {
        patch._expCanvasRestore = null;
      }
      BoxiesPrefs.save(patch);
    }
  }

  function sectionTitleHtml() {
    return '';
  }

  function actionsHtml(state) {
    ExperienciaEngine.ensureFlow(state);
    var canvas = (state.experiencia && state.experiencia.canvas) || {};
    var inGroup = !!(canvas.activeGroupId);
    return '' +
      (inGroup
        ? '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpExitGroupBtn" title="Salir del grupo">Salir</button>'
        : '') +
      '<button type="button" class="boxies-btn-secondary boxies-btn-secondary--icon builder-exp-reset-btn builder-exp-tool-btn" id="builderExpResetBtn"' +
        ' data-tooltip="Reiniciar flujo" title="Reiniciar flujo" aria-label="Reiniciar flujo">' +
        (typeof BuilderIcons !== 'undefined' && BuilderIcons.render
          ? BuilderIcons.render('rotate-ccw')
          : '↶') +
      '</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpTemplateBtn" title="Crear flujo base">Flujo</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpStructReviewBtn" title="Revisar Estructura">Estructura</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpDraftBtn" title="Guardar borrador">Borrador</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpResyncBtn" title="Actualizar desde Hero">Hero</button>';
  }

  /**
   * Minimal shell for Quotation (and any host) that reuses the SAME
   * BOTONES / HOTSPOTS stages from Showroom — no FLUJO UI.
   */
  function overlayShellHtml() {
    return '' +
      '<div class="builder-exp-workspace qe-exp-overlay" data-exp-workspace data-qe-exp-overlay>' +
        '<div class="builder-exp-stage" data-exp-stage>' +
          '<div class="builder-exp-viewport" data-exp-viewport hidden tabindex="-1" aria-hidden="true">' +
            '<div class="builder-exp-world" data-exp-world>' +
              '<svg class="builder-exp-edges" data-exp-edges xmlns="http://www.w3.org/2000/svg"></svg>' +
              '<div class="builder-exp-nodes" data-exp-nodes></div>' +
              '<div class="builder-exp-marquee" data-exp-marquee hidden></div>' +
            '</div>' +
          '</div>' +
          '<div class="builder-exp-buttons-stage" data-exp-buttons-stage>' +
            '<div class="builder-exp-buttons-stage__empty" data-exp-buttons-empty hidden>' +
              '<p>Agrega un botón desde el dock.</p>' +
            '</div>' +
            '<div class="builder-exp-buttons-frame" data-exp-buttons-frame>' +
              '<img class="builder-exp-buttons-img" data-exp-buttons-img alt="" draggable="false">' +
              '<div class="builder-exp-buttons-layer" data-exp-buttons-layer></div>' +
              '<div class="builder-exp-marquee builder-exp-overlay-marquee" data-exp-overlay-marquee hidden></div>' +
            '</div>' +
          '</div>' +
          '<div class="builder-exp-hotspots-stage" data-exp-hotspots-stage hidden>' +
            '<div class="builder-exp-hotspots-stage__empty" data-exp-hotspots-empty hidden>' +
              '<p>Dibuja un hotspot: clic para vértices, doble clic para cerrar.</p>' +
            '</div>' +
            '<div class="builder-exp-hotspots-frame" data-exp-hotspots-frame>' +
              '<img class="builder-exp-hotspots-img" data-exp-hotspots-img alt="" draggable="false">' +
              '<div class="builder-exp-hotspots-layer" data-exp-hotspots-layer>' +
                '<svg class="builder-exp-hotspots-svg" data-exp-hotspots-svg xmlns="http://www.w3.org/2000/svg"></svg>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function shellHtml(state) {
    ExperienciaEngine.ensureFlow(state);
    var canvas = (state.experiencia && state.experiencia.canvas) || {};
    var canvasMode = isCanvasMode();
    var minimapOn = canvas.minimapVisible !== false;

    return '' +
      '<div class="builder-step-content builder-step-content--experiencia' +
        (canvasMode ? ' is-canvas-mode' : '') + '">' +
        '<div class="builder-exp-workspace' +
          (canvasMode ? ' is-canvas-mode' : '') +
          '" data-exp-workspace>' +
          '<div class="builder-exp-stage" data-exp-stage>' +
            '<div class="builder-exp-toolbar" data-exp-toolbar role="toolbar" aria-label="Herramientas del canvas">' +
              toolBtn('select', 'Seleccionar', 'layout-grid') +
              toolBtn('cut', 'Cortar vínculo', 'scissors') +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('fit', 'Ajustar vista', 'maximize', true) +
              toolBtn('canvas-mode', 'Modo Focus', 'panel', true) +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('minimap', minimapOn ? 'Ocultar minimapa' : 'Mostrar minimapa', 'eye', true) +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              '<div class="builder-exp-mode-tabs" data-exp-mode-tabs role="tablist" aria-label="Modo de edición">' +
                '<button type="button" class="builder-exp-mode-tab is-active" data-exp-edit-mode="flow" role="tab" aria-selected="true">FLUJO</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="buttons" role="tab" aria-selected="false" disabled>BOTONES</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="hotspots" role="tab" aria-selected="false" disabled>HOTSPOTS</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="prototype" role="tab" aria-selected="false">PROTOTIPO</button>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="builder-exp-focus-fs" data-exp-fullscreen' +
              ' data-tooltip="Pantalla completa" title="Pantalla completa" aria-label="Pantalla completa">' +
              ((typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
                ? BuilderIcons.render('maximize')
                : '') +
            '</button>' +
            '<div class="builder-exp-viewport" data-exp-viewport tabindex="0">' +
              '<div class="builder-exp-world" data-exp-world>' +
                '<svg class="builder-exp-edges" data-exp-edges xmlns="http://www.w3.org/2000/svg"></svg>' +
                '<div class="builder-exp-nodes" data-exp-nodes></div>' +
                '<div class="builder-exp-marquee" data-exp-marquee hidden></div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-buttons-stage" data-exp-buttons-stage hidden>' +
              '<div class="builder-exp-buttons-stage__empty" data-exp-buttons-empty hidden>' +
                '<p>Selecciona un nodo Imagen para diseñar botones.</p>' +
              '</div>' +
              '<div class="builder-exp-buttons-frame" data-exp-buttons-frame>' +
                '<img class="builder-exp-buttons-img" data-exp-buttons-img alt="" draggable="false">' +
                '<div class="builder-exp-buttons-layer" data-exp-buttons-layer></div>' +
                '<div class="builder-exp-marquee builder-exp-overlay-marquee" data-exp-overlay-marquee hidden></div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-hotspots-stage" data-exp-hotspots-stage hidden>' +
              '<div class="builder-exp-hotspots-stage__empty" data-exp-hotspots-empty hidden>' +
                '<p>Selecciona un nodo Imagen para dibujar máscaras.</p>' +
              '</div>' +
              '<div class="builder-exp-hotspots-frame" data-exp-hotspots-frame>' +
                '<img class="builder-exp-hotspots-img" data-exp-hotspots-img alt="" draggable="false">' +
                '<div class="builder-exp-hotspots-layer" data-exp-hotspots-layer>' +
                  '<svg class="builder-exp-hotspots-svg" data-exp-hotspots-svg xmlns="http://www.w3.org/2000/svg"></svg>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-proto-stage" data-exp-proto-stage hidden>' +
              '<div class="builder-xp-host builder-exp-proto-host" data-exp-proto-host></div>' +
            '</div>' +
            '<div class="builder-exp-minimap' + (minimapOn ? '' : ' is-hidden') + '" data-exp-minimap>' +
              '<canvas data-exp-minimap-canvas width="160" height="100"></canvas>' +
              '<button type="button" class="builder-exp-minimap__hide" data-exp-minimap-hide aria-label="Ocultar minimapa">×</button>' +
            '</div>' +
            '<div class="builder-exp-ctx" data-exp-ctx hidden></div>' +
            '<div class="builder-exp-picker" data-exp-picker hidden></div>' +
            '<div class="builder-exp-modal" data-exp-modal hidden></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function toolBtn(tool, label, icon, action) {
    var iconHtml = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
      ? BuilderIcons.render(icon)
      : '';
    return '<button type="button" class="builder-exp-tool' + (action ? ' is-action' : '') +
      '" data-exp-tool="' + esc(tool) + '" data-tooltip="' + esc(label) + '" aria-label="' + esc(label) + '">' +
      iconHtml + '</button>';
  }

  function interactionRowsHtml(n, list, selectedIxId) {
    if (!list || !list.length) return '';
    return list.map(function (ix) {
      var pid = ix.portId || ix.id;
      var disabled = ix.enabled === false;
      var typeLab = ExperienciaEngine.interactionTypeLabel
        ? ExperienciaEngine.interactionTypeLabel(ix.type)
        : (ix.type || '');
      var mark = (ix.type === 'HOTSPOT' || ix.type === 'UNIT' || ix.type === 'UNITS_FLOOR')
        ? '●' : '□';
      var isSel = selectedIxId && (ix.id === selectedIxId || ix.portId === selectedIxId);
      var showPort = ExperienciaEngine.interactionHasSourcePort
        ? ExperienciaEngine.interactionHasSourcePort(ix)
        : !disabled;
      return '<div class="builder-exp-card__irow is-interaction' +
        (disabled ? ' is-disabled' : '') +
        (isSel ? ' is-selected' : '') +
        '" data-exp-irow="' + esc(pid) + '"' +
        ' data-exp-interaction="' + esc(ix.id) + '"' +
        ' data-exp-scene="' + esc(n.id) + '">' +
        '<span class="builder-exp-card__ix-label">' +
          '<em class="builder-exp-card__ix-mark">' + mark + '</em> ' +
          esc(typeLab) + ' · ' + esc(ix.label || typeLab) +
        '</span>' +
        (disabled
          ? '<span class="builder-exp-card__badge is-off">OFF</span>'
          : (showPort
            ? ('<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
              esc(pid) + '" data-node="' + esc(n.id) + '" data-port-label="' +
              esc(ix.label || '') + '" data-interaction-id="' + esc(ix.id) + '"></span>')
            : '<span class="builder-exp-card__badge is-local" title="Acción interna">interno</span>')) +
      '</div>';
    }).join('');
  }

  function elementosBlockHtml(n, selectedIxId) {
    var ixs = (n.config && n.config.interactions) || [];
    var parts = ExperienciaEngine.partitionInteractions
      ? ExperienciaEngine.partitionInteractions(ixs)
      : { controls: [], content: ixs, navigation: [], other: [] };
    var hubOn = !!(n.config && n.config.hub && n.config.hub.enabled);
    var categorized = hubOn ||
      ((parts.controls.length + parts.content.length + parts.navigation.length) >= 2 &&
        (parts.controls.length + parts.navigation.length) > 0);

    var html = '';
    function section(title, list) {
      if (!list || !list.length) return;
      html += '<div class="builder-exp-card__section">' + esc(title) + '</div>' +
        '<div class="builder-exp-card__ports">' +
          interactionRowsHtml(n, list, selectedIxId) +
        '</div>';
    }

    if (!categorized) {
      html += '<div class="builder-exp-card__section">Elementos</div>' +
        '<div class="builder-exp-card__ports">' +
          interactionRowsHtml(n, ixs, selectedIxId) +
        '</div>';
    } else {
      section('Controles', parts.controls.concat(parts.other));
      section('Contenido', parts.content);
      section('Navegación', parts.navigation);
      if (!parts.controls.length && !parts.content.length && !parts.navigation.length &&
          !parts.other.length && ixs.length) {
        html += '<div class="builder-exp-card__section">Elementos</div>' +
          '<div class="builder-exp-card__ports">' +
            interactionRowsHtml(n, ixs, selectedIxId) +
          '</div>';
      }
    }

    html += '<button type="button" class="builder-exp-card__add-el" data-exp-add-element="' +
      esc(n.id) + '">+ Agregar elemento</button>';
    return html;
  }

  function mediaBlockHtml(state, n) {
    var media = ExperienciaEngine.resolveSceneMedia
      ? ExperienciaEngine.resolveSceneMedia(state, n)
      : {
          filename: n.config && n.config.fileName,
          statusLabel: (n.config && n.config.fileName) ? 'Local' : 'Pendiente',
          hasMedia: !!(n.config && n.config.fileName),
          thumbnailUrl: null
        };
    var statusCls = !media.hasMedia ? 'is-pending'
      : (media.status === 'error' ? 'is-error'
        : (media.status === 'synced' || media.status === 'local' ? 'is-ok' : 'is-sync'));
    var hubHint = (media.activeFloor
      ? (' · P' + media.activeFloor + (media.visualMode ? (' · ' + String(media.visualMode).toUpperCase()) : ''))
      : '');
    return '<div class="builder-exp-card__section">Media</div>' +
      '<div class="builder-exp-card__media">' +
        (media.thumbnailUrl
          ? '<div class="builder-exp-card__thumb"><img src="' + esc(media.thumbnailUrl) +
            '" alt="" loading="lazy"></div>'
          : '') +
        '<div class="builder-exp-card__media-text">' +
          '<div class="builder-exp-card__media-name">' +
            esc(media.filename || 'Sin asignar') +
          '</div>' +
          '<div class="builder-exp-card__media-status ' + statusCls + '">' +
            esc((media.hasMedia ? media.statusLabel : 'Pendiente') + hubHint) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function nodeCardHtml(n, state) {
    var status = ExperienciaEngine.statusLabel(n);
    var info = ExperienciaEngine.infoLine(n);
    var size = ExperienciaEngine.nodeSize(n);
    var statusCls = n.orphaned || n.status === 'review' ? 'is-review'
      : (n.status === 'ready' ? 'is-ready'
        : (n.status === 'error' ? 'is-error' : 'is-pending'));
    var accent = ExperienciaEngine.resolveAccent
      ? ExperienciaEngine.resolveAccent(n)
      : (n.accent || (ExperienciaEngine.kindMeta(n.kind).accent));
    var isHero = n.kind === 'hero';
    var isAction = n.role === 'action' || n.kind === 'action';
    var isScene = ExperienciaEngine.isSceneKind
      ? ExperienciaEngine.isSceneKind(n.kind)
      : (n.kind === 'image' || n.kind === 'scene' || n.kind === 'video' ||
         n.kind === 'plan' || n.kind === 'pano360' || n.kind === 'animacion' ||
         n.kind === 'planta-3d' || n.kind === 'vista' || n.kind === 'ficha' || n.kind === 'gallery');
    var portsOut = (n.ports || []).filter(function (p) { return p.side !== 'in'; });
    var portsIn = (n.ports || []).filter(function (p) { return p.side === 'in'; });
    var ixs = (n.config && n.config.interactions) || [];
    var enabledIxs = ixs.filter(function (ix) { return ix && ix.enabled !== false; });
    var selectedIx = state && state.experiencia && state.experiencia.canvas
      ? state.experiencia.canvas.selectedInteractionId
      : null;

    var body = '';
    if (isHero) {
      var slots = (n.config && n.config.slots) ||
        (ExperienciaEngine.listHeroSlots ? ExperienciaEngine.listHeroSlots({ heroContent: {} }) : null) ||
        { navigation: [], flow: [], actions: [] };
      if (n.config && n.config.slots) slots = n.config.slots;

      body =
        '<div class="builder-exp-card__type">HERO</div>' +
        '<div class="builder-exp-card__title">Hero</div>' +
        '<div class="builder-exp-card__info">Pantalla inicial</div>';

      if ((slots.navigation || []).length) {
        body += '<div class="builder-exp-card__section">Navegación</div>' +
          '<div class="builder-exp-card__slots">' +
          slots.navigation.map(function (it) {
            return '<div class="builder-exp-card__irow is-nav" data-exp-hero-slot="nav" data-slot-id="' + esc(it.id) + '">' +
              '<span>' + esc(it.label) + '</span>' +
              '<span class="builder-exp-card__ref">→ Menú</span>' +
            '</div>';
          }).join('') +
          '</div>';
      }

      body += '<div class="builder-exp-card__section">Flujo</div>' +
        '<div class="builder-exp-card__ports">' +
        (slots.flow || []).map(function (it) {
          var pid = it.portId || it.id || 'hero-iniciar';
          return '<div class="builder-exp-card__irow is-flow" data-exp-irow="' + esc(pid) + '">' +
            '<span>' + esc(it.label) + '</span>' +
            '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
              esc(pid) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(it.label) + '"></span>' +
          '</div>';
        }).join('') +
        '</div>';

      if ((slots.actions || []).length) {
        body += '<div class="builder-exp-card__section">Acciones</div>' +
          '<div class="builder-exp-card__slots">' +
          slots.actions.map(function (it) {
            var on = it.enabled !== false;
            var right = it.role === 'action-config'
              ? '<span class="builder-exp-card__ref is-config">Configurar ›</span>'
              : '<span class="builder-exp-card__badge ' + (on ? 'is-on' : 'is-off') + '">' +
                (on ? 'ON' : 'OFF') + '</span>';
            return '<div class="builder-exp-card__irow is-action-slot" data-exp-hero-slot="' +
              esc(it.id) + '" data-slot-field="' + esc(it.field || '') + '">' +
              '<span>' + esc(it.label) + '</span>' + right +
            '</div>';
          }).join('') +
          '</div>';
      }
    } else if (isAction) {
      body =
        '<div class="builder-exp-card__type">ACCIÓN</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || 'Acción') + '</div>' +
        '<div class="builder-exp-card__info">' + esc(info || (n.config && n.config.actionType) || '') + '</div>' +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
    } else if (isScene) {
      var hubEnabled = !!(n.config && n.config.hub && n.config.hub.enabled);
      body =
        '<div class="builder-exp-card__type">' +
          esc(hubEnabled ? 'HUB' : (n.typeLabel || 'ESCENA')) +
        '</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || n.id) + '</div>' +
        mediaBlockHtml(state || {}, n) +
        elementosBlockHtml(n, selectedIx);

      if (n.kind === 'video' || n.kind === 'animacion') {
        body += '<div class="builder-exp-card__section">Flujo automático</div>' +
          '<div class="builder-exp-card__ports">' +
          '<div class="builder-exp-card__irow is-flow" data-exp-irow="on-end">' +
            '<span>Al finalizar</span>' +
            '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="on-end" data-node="' +
              esc(n.id) + '" data-port-label="Al finalizar"></span>' +
          '</div></div>';
      }

      var btns = (ExperienciaEngine.listSceneButtons
        ? ExperienciaEngine.listSceneButtons(state || {}, n)
        : []).filter(function (b) {
          return b && b.visible !== false;
        });
      if (btns.length && !hubEnabled) {
        body += '<div class="builder-exp-card__section">BOTONES</div>' +
          '<div class="builder-exp-card__btn-summary">' +
            btns.map(function (b) {
              var listLabel = (b.label != null && String(b.label).length)
                ? b.label
                : (b.icon ? '· icono' : 'Sin texto');
              return '<div class="builder-exp-card__btn-row">' +
                '<span class="builder-exp-card__btn-check" aria-hidden="true">✓</span>' +
                '<span>' + esc(listLabel) + '</span>' +
              '</div>';
            }).join('') +
          '</div>';
      }
      void selectedIx;
    } else {
      body =
        '<div class="builder-exp-card__type">' + esc(n.typeLabel || 'NODO') + '</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || n.id) + '</div>' +
        (info ? '<div class="builder-exp-card__info">' + esc(info) + '</div>' : '') +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
      if (portsOut.length > 1) {
        body += '<div class="builder-exp-card__ports builder-exp-card__ports--compact">' +
          portsOut.filter(function (p) { return p.kind !== 'meta'; }).map(function (p) {
            return '<div class="builder-exp-card__irow">' +
              '<span>' + esc(p.label) + '</span>' +
              '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
                esc(p.id) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(p.label) + '"></span>' +
            '</div>';
          }).join('') +
        '</div>';
      }
    }

    var inPort = portsIn.length
      ? '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>'
      : (isHero ? '' : '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>');

    var hasOutIx = enabledIxs.some(function (ix) {
      return ExperienciaEngine.interactionHasSourcePort
        ? ExperienciaEngine.interactionHasSourcePort(ix)
        : true;
    });
    var hasRowPorts = hasOutIx ||
      n.kind === 'video' || n.kind === 'animacion';
    var flowOuts = portsOut.filter(function (p) {
      return p.kind !== 'meta' && p.kind !== 'interaction' && p.id !== 'on-end';
    });
    var defaultOut = (!isHero && !hasRowPorts && flowOuts.length <= 1)
      ? '<span class="builder-exp-card__port is-out" data-exp-port="out" data-port-id="' +
        esc((flowOuts[0] && flowOuts[0].id) || 'out') + '" data-node="' + esc(n.id) +
        '" data-port-label="' + esc((flowOuts[0] && flowOuts[0].label) || 'Salida') + '"></span>'
      : '';

    return '' +
      '<div class="builder-exp-card ' + statusCls + ' accent-' + esc(accent) +
        (isHero ? ' is-hero' : '') +
        (isAction ? ' is-action-node' : '') +
        (isScene ? ' is-scene' : '') +
        (n.kind === 'hotspot' ? ' is-legacy-interaction' : '') +
        (n.locked ? ' is-locked' : '') +
        (n.orphaned ? ' is-orphan' : '') +
        '" data-exp-node="' + esc(n.id) + '"' +
        ' style="width:' + size.w + 'px;min-height:' + size.h + 'px;transform:translate(' +
        (n.x || 0) + 'px,' + (n.y || 0) + 'px)">' +
        (n.locked
          ? '<span class="builder-exp-card__lock" title="Bloqueado" aria-label="Bloqueado"></span>'
          : '') +
        inPort +
        defaultOut +
        body +
      '</div>';
  }

  function bezierPath(x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    return 'M ' + x1 + ' ' + y1 +
      ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
  }

  /** Math fallback when DOM port is not measurable yet. */
  function portAnchorFallback(n, portId, side) {
    var size = ExperienciaEngine.nodeSize(n);
    var ports = (n.ports || []).filter(function (p) {
      return side === 'in' ? p.side === 'in' : p.side !== 'in';
    });
    if (side === 'in') {
      return { x: n.x || 0, y: (n.y || 0) + size.h / 2 };
    }
    var flowOuts = ports.filter(function (p) { return p.kind !== 'meta'; });
    if (n.kind === 'hero' || flowOuts.length > 1 || n.kind === 'video' || n.kind === 'animacion') {
      var idx = 0;
      for (var i = 0; i < flowOuts.length; i++) {
        if (flowOuts[i].id === portId) { idx = i; break; }
      }
      /* Header ~62px + section ~18px + row ~22px; circle at row center */
      var top = (n.kind === 'hero' ? 86 : 78) + idx * 22 + 10;
      return {
        x: (n.x || 0) + size.w,
        y: (n.y || 0) + Math.min(top, size.h - 8)
      };
    }
    return { x: (n.x || 0) + size.w, y: (n.y || 0) + size.h / 2 };
  }

  function cssToken(v) {
    return String(v == null ? '' : v)
      .replace(/[;\n\r{}]/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '');
  }

  function buttonPreviewClass(btn) {
    var t = String((btn && btn.type) || 'BUTTON').toUpperCase();
    if (t === 'TEXT') return 'builder-exp-stage-text';
    if (t === 'SHAPE_RECT') return 'builder-exp-stage-shape builder-exp-stage-shape--rect';
    if (t === 'SHAPE_CIRCLE') return 'builder-exp-stage-shape builder-exp-stage-shape--circle';
    if (t === 'SHAPE_LINE') return 'builder-exp-stage-shape builder-exp-stage-shape--line';
    if (t === 'SHAPE_TRIANGLE') return 'builder-exp-stage-shape builder-exp-stage-shape--triangle';
    if (t === 'SHAPE_ARROW') return 'builder-exp-stage-shape builder-exp-stage-shape--arrow';
    if (t === 'SHAPE_DONUT') return 'builder-exp-stage-shape builder-exp-stage-shape--donut';
    if (t === 'SHAPE_CAPSULE') return 'builder-exp-stage-shape builder-exp-stage-shape--capsule';
    if (t === 'SHAPE_ROUND_RECT') return 'builder-exp-stage-shape builder-exp-stage-shape--round-rect';
    var style = (btn && btn.style) || 'button';
    if (style === 'chip') style = 'button';
    return 'builder-exp-ui-btn is-style-' + style +
      (btn && btn.icon ? ' has-icon' : '');
  }

  function shapeStretchFromBtn(btn) {
    if (!btn) return { sx: 1, sy: 1 };
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapeStretchFromIx) {
      return ExperienciaEngine.shapeStretchFromIx(btn._ix || btn);
    }
    return {
      sx: Math.max(0.06, Number(btn.shapeStretchX) || 1),
      sy: Math.max(0.06, Number(btn.shapeStretchY) || 1)
    };
  }

  function shapeStageSvgHtml(b, t, layerW, layerH, paintOpts) {
    t = String(t || '').toUpperCase();
    paintOpts = paintOpts || {};
    var st = shapeStretchFromBtn(b);
    var par = 'meet';
    if (paintOpts.gizmoBox) {
      par = 'none';
    } else if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapePreserveAspect) {
      par = ExperienciaEngine.shapePreserveAspect(st.sx, st.sy);
    } else if (st.sx !== 1 || st.sy !== 1) {
      par = 'none';
    }
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.buildSceneShapeSvg) {
      var buildOpts = {
        fill: b.fill || 'rgba(255,255,255,0.16)',
        stroke: b.stroke || 'rgba(255,255,255,0.62)',
        strokeWidth: b.strokeWidth != null ? b.strokeWidth : 2,
        borderRadius: b.borderRadius,
        stretchX: st.sx,
        stretchY: st.sy,
        strokeGlowLayer: true,
        svgClass: 'builder-exp-stage-shape__svg',
        preserveAspect: par,
        tightViewBox: !!(paintOpts && paintOpts.gizmoBox)
      };
      if (paintOpts.gizmoBox && paintOpts.shapeW != null && paintOpts.shapeH != null) {
        buildOpts.contentBoxWPct = paintOpts.shapeW;
        buildOpts.contentBoxHPct = paintOpts.shapeH;
        buildOpts.layerW = layerW;
        buildOpts.layerH = layerH;
      }
      return ExperienciaEngine.buildSceneShapeSvg(t, buildOpts);
    }
    return '';
  }

  /** Visible gw×gh — tight SVG content, not square picker tile (~12%). */
  function shapeVisibleBoundsMetrics(btn, layerW, layerH) {
    if (!btn) return null;
    var st = String(btn.type || 'BUTTON').toUpperCase();
    var defW = shapeDefaultSize(st).w;
    var w = Number(btn.width);
    if (isNaN(w) || w <= 0) w = defW;
    var h = btn.height != null ? Number(btn.height) : null;
    var ix = btn._ix || btn;
    var cx = btn.storedX != null ? Number(btn.storedX) : Number(btn.x) || 50;
    var cy = btn.storedY != null ? Number(btn.storedY) : Number(btn.y) || 50;
    var stretch = shapeStretchFromBtn(btn);
    var grot = Number(btn.rotation) || 0;
    var isPickerTile = Math.abs(w - defW) < 0.08 &&
      Math.abs(stretch.sx - 1) < 0.001 &&
      Math.abs(stretch.sy - 1) < 0.001;
    var hasExplicitBox = !!(ix && ix.shapeContentBox && h != null && h > 0);
    var tightGm = null;

    /* Default shape: hug visible art inside picker tile (Genially-style). */
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.sceneShapeGizmoMetrics) {
      tightGm = ExperienciaEngine.sceneShapeGizmoMetrics(
        defW, st, layerW, layerH, cx, cy, stretch.sx, stretch.sy, null,
        { shapeContentBox: false }
      );
    } else if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapeContentBBox &&
        ExperienciaEngine.sceneShapeDisplaySize) {
      var tileF = ExperienciaEngine.sceneShapeDisplaySize(defW, layerW, layerH);
      var bb = ExperienciaEngine.shapeContentBBox(st, {
        stretchX: stretch.sx,
        stretchY: stretch.sy
      });
      var lwF = Math.max(1, Number(layerW) || 1000);
      var lhF = Math.max(1, Number(layerH) || 1000);
      var meet = 1 / 100;
      var dispW = bb.w * meet;
      var dispH = bb.h * meet;
      var gwF = tileF.w * dispW;
      var ghF = tileF.w * dispH * (lwF / lhF);
      var offXF = ((bb.cx - 50) / 100) * tileF.w;
      var offYF = ((bb.cy - 50) / 100) * tileF.w * (lwF / lhF);
      tightGm = { gx: cx + offXF, gy: cy + offYF, gw: gwF, gh: ghF };
    }

    if (tightGm) {
      /* Only trust stored gw×gh after a real user resize — not picker tile leftovers. */
      if (hasExplicitBox && !isPickerTile) {
        var dw = Math.abs(w - tightGm.gw);
        var dh = Math.abs(h - tightGm.gh);
        if (dw > 0.15 || dh > 0.15) {
          return {
            st: st, grot: grot,
            gx: cx, gy: cy, gw: w, gh: h,
            x: cx, y: cy, w: w, h: h
          };
        }
        /* Seeded content-box — x/y already at visible center. */
        return {
          st: st, grot: grot,
          gx: cx, gy: cy, gw: w, gh: h,
          x: cx, y: cy, w: w, h: h
        };
      }
      return {
        st: st, grot: grot,
        gx: tightGm.gx, gy: tightGm.gy, gw: tightGm.gw, gh: tightGm.gh,
        x: tightGm.gx, y: tightGm.gy, w: tightGm.gw, h: tightGm.gh
      };
    }

    /* Engine helper missing — last-resort tile (avoid if possible). */
    var shapeSz = shapeDisplaySize(defW, layerW, layerH);
    return {
      st: st, grot: grot,
      gx: cx, gy: cy, gw: shapeSz.w, gh: shapeSz.h,
      x: cx, y: cy, w: shapeSz.w, h: shapeSz.h
    };
  }

  /** Unified stage paint box — always matches visible bounds (not picker tile). */
  function shapeStagePaintMetrics(btn, layerW, layerH) {
    if (isShapeBoxV2Active()) {
      var boxV2 = getShapeBox(btn, layerW, layerH);
      if (boxV2) {
        return {
          x: boxV2.cx,
          y: boxV2.cy,
          w: boxV2.w,
          h: boxV2.h,
          gizmoBox: true,
          tileW: boxV2.w,
          tileH: boxV2.h
        };
      }
    }
    if (!btn) return null;
    var vb = shapeVisibleBoundsMetrics(btn, layerW, layerH);
    if (vb) {
      return {
        x: vb.x,
        y: vb.y,
        w: vb.w,
        h: vb.h,
        gizmoBox: true,
        tileW: vb.w,
        tileH: vb.h
      };
    }
    var ps = shapePaintSize(btn, layerW, layerH);
    return {
      x: Number(btn.x) || 50,
      y: Number(btn.y) || 50,
      w: ps.w,
      h: ps.h,
      gizmoBox: false,
      tileW: ps.w,
      tileH: ps.h
    };
  }

  /**
   * ShapeBox v2 — single coordinate contract for stage + gizmo (% layer space).
   * { cx, cy, w, h, rot, kind, gizmoBox }
   */
  function getShapeBox(vm, layerW, layerH) {
    if (!vm) return null;
    var kind = String(vm.type || '').toUpperCase();
    if (!isShapeType(kind)) return null;
    var rot = Number(vm.rotation) || 0;
    var ix = vm._ix || vm;
    var cx = vm.storedX != null ? Number(vm.storedX) : Number(vm.x) || 50;
    var cy = vm.storedY != null ? Number(vm.storedY) : Number(vm.y) || 50;
    if (ix.shapeContentBox || vm.shapeContentBox) {
      var w = Number(vm.width != null && !isNaN(Number(vm.width)) ? vm.width : ix.width);
      var h = Number(vm.height != null && !isNaN(Number(vm.height)) ? vm.height : ix.height);
      if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
        return { cx: cx, cy: cy, w: w, h: h, rot: rot, kind: kind, gizmoBox: true };
      }
      if (!isNaN(w) && w > 0) {
        var sq = shapePixelSquareDims(w, h, layerW, layerH);
        if (sq) {
          return { cx: cx, cy: cy, w: sq.w, h: sq.h, rot: rot, kind: kind, gizmoBox: true };
        }
      }
    }
    var vb = shapeVisibleBoundsMetrics(vm, layerW, layerH);
    if (!vb) return null;
    return {
      cx: vb.gx,
      cy: vb.gy,
      w: vb.gw,
      h: vb.gh,
      rot: rot,
      kind: kind,
      gizmoBox: true
    };
  }

  function shapeBoxToSelectionMetrics(box) {
    if (!box) return null;
    return {
      st: box.kind,
      gx: box.cx,
      gy: box.cy,
      gw: box.w,
      gh: box.h,
      grot: box.rot,
      tileW: box.w,
      tileH: box.h
    };
  }

  /** Unified shape node paint — same box for stage, selection, and live sync. */
  function paintShapeNodeEl(el, box, vm, layerW, layerH, opts) {
    if (!el || !box || !vm) return;
    opts = opts || {};
    el.classList.remove('is-live-moving');
    if (opts.liveSizing) {
      el.classList.add('is-live-sizing');
    } else {
      el.classList.remove('is-live-sizing');
    }
    el.style.removeProperty('overflow');
    el.style.removeProperty('transform');
    el.style.left = box.cx + '%';
    el.style.top = box.cy + '%';
    el.style.width = box.w + '%';
    el.style.height = box.h + '%';
    el.style.setProperty('--btn-rot', box.rot + 'deg');
    var hit = el.querySelector('.builder-exp-stage-shape__hit');
    if (hit) {
      hit.style.cssText = shapeHitAreaStyle(
        box.kind, vm.shapeStretchX, vm.shapeStretchY, vm, layerW, layerH, true
      );
    }
    /* Live resize: scale container only — except fixed-corner shapes regen SVG each frame. */
    var regenSvg = !opts.liveSizing ||
      (typeof ExperienciaEngine !== 'undefined' &&
        ExperienciaEngine.shapeUsesFixedCornerContentPaint &&
        ExperienciaEngine.shapeUsesFixedCornerContentPaint(box.kind));
    if (regenSvg) {
      patchShapeSvgLive(el, box.kind, {
        fill: vm.fill,
        stroke: vm.stroke,
        strokeWidth: vm.strokeWidth,
        borderRadius: vm.borderRadius
      }, vm.shapeStretchX, vm.shapeStretchY, {
        contentBoxWPct: box.w,
        contentBoxHPct: box.h,
        layerW: layerW,
        layerH: layerH
      });
    }
  }

  function paintShapeGizmoEl(gizmoEl, box, layerW, layerH) {
    if (!gizmoEl || !box) return;
    gizmoEl.classList.remove('is-sizing');
    gizmoEl.style.removeProperty('transform');
    gizmoEl.style.left = box.cx + '%';
    gizmoEl.style.top = box.cy + '%';
    gizmoEl.style.width = box.w + '%';
    gizmoEl.style.height = box.h + '%';
    gizmoEl.style.setProperty('--btn-rot', box.rot + 'deg');
    var sizeEl = gizmoEl.querySelector('[data-exp-sel-size]');
    if (sizeEl && layerW && layerH) {
      var sizeWpx = Math.max(1, Math.round((box.w / 100) * layerW));
      var sizeHpx = Math.max(1, Math.round((box.h / 100) * layerH));
      sizeEl.textContent = box.kind === 'SHAPE_LINE'
        ? sizeWpx + ' px'
        : sizeWpx + ' × ' + sizeHpx;
    }
  }

  function shapeHitAreaStyle(kind, stretchX, stretchY, btn, layerW, layerH, forceBoxMode) {
    var boxMode = forceBoxMode || (btn && layerW && layerH && shapeBoxMode(btn, layerW, layerH));
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapeHitAreaCss) {
      return ExperienciaEngine.shapeHitAreaCss(kind, stretchX, stretchY, boxMode);
    }
    if (typeof ExperienciaEngine === 'undefined' || !ExperienciaEngine.shapeContentBBox) {
      return 'left:0;top:0;width:100%;height:100%;';
    }
    kind = String(kind || '').toUpperCase();
    var bbox = ExperienciaEngine.shapeContentBBox(kind, {
      stretchX: stretchX != null ? stretchX : 1,
      stretchY: stretchY != null ? stretchY : 1
    });
    var left = bbox.cx - bbox.w / 2;
    var top = bbox.cy - bbox.h / 2;
    if (kind === 'SHAPE_LINE') {
      return 'left:' + left + '%;width:' + bbox.w + '%;';
    }
    return 'left:' + left + '%;top:' + top + '%;width:' + bbox.w + '%;height:' + bbox.h + '%;';
  }

  function patchShapeSvgLive(el, kind, paint, stretchX, stretchY, boxOpts) {
    if (!el || !kind || typeof ExperienciaEngine === 'undefined' || !ExperienciaEngine.buildSceneShapeSvg) {
      return;
    }
    kind = String(kind || '').toUpperCase();
    paint = paint || {};
    boxOpts = boxOpts || {};
    var par = 'none';
    var buildOpts = {
      fill: paint.fill != null ? paint.fill : 'rgba(255,255,255,0.16)',
      stroke: paint.stroke != null ? paint.stroke : 'rgba(255,255,255,0.62)',
      strokeWidth: paint.strokeWidth != null ? paint.strokeWidth : 2,
      borderRadius: paint.borderRadius,
      stretchX: stretchX != null ? stretchX : 1,
      stretchY: stretchY != null ? stretchY : 1,
      strokeGlowLayer: true,
      svgClass: 'builder-exp-stage-shape__svg',
      preserveAspect: par,
      tightViewBox: true
    };
    if (boxOpts.contentBoxWPct != null && boxOpts.contentBoxHPct != null) {
      buildOpts.contentBoxWPct = boxOpts.contentBoxWPct;
      buildOpts.contentBoxHPct = boxOpts.contentBoxHPct;
      buildOpts.layerW = boxOpts.layerW;
      buildOpts.layerH = boxOpts.layerH;
    }
    var html = ExperienciaEngine.buildSceneShapeSvg(kind, buildOpts);
    var boxMode = true;
    var hit = el.querySelector('.builder-exp-stage-shape__hit');
    if (hit && typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapeHitAreaCss) {
      hit.style.cssText = ExperienciaEngine.shapeHitAreaCss(kind, stretchX, stretchY, boxMode);
    }
    var oldSvg = el.querySelector('.builder-exp-stage-shape__svg');
    if (!oldSvg) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var newSvg = wrap.firstChild;
    if (newSvg) oldSvg.replaceWith(newSvg);
  }

  function shapeDisplaySize(widthPct, layerW, layerH) {
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.sceneShapeDisplaySize) {
      return ExperienciaEngine.sceneShapeDisplaySize(widthPct, layerW, layerH);
    }
    var w = Number(widthPct) || 12;
    return { w: w, h: w * (Math.max(1, layerW) / Math.max(1, layerH)) };
  }

  /** Canvas paint size — rectangular box only after explicit resize (shapeContentBox). */
  function shapePaintSize(btn, layerW, layerH) {
    if (!btn) return shapeDisplaySize(12, layerW, layerH);
    var w = Number(btn.width) || shapeDefaultSize(btn.type).w;
    var ix = btn._ix || btn;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.shapeUsesContentBox &&
        ExperienciaEngine.shapeUsesContentBox(ix, w, btn.height, layerW, layerH)) {
      var h = Number(btn.height);
      if (!isNaN(h) && h > 0) return { w: w, h: h };
    }
    return shapeDisplaySize(w, layerW, layerH);
  }

  /** Map screen px (getBoundingClientRect) → layer layout px (clientWidth space). */
  function overlayLayerLocalScale(layerEl) {
    if (!layerEl) return { sx: 1, sy: 1, layerW: 1000, layerH: 1000, rect: null };
    var rect = layerEl.getBoundingClientRect();
    var layerW = Math.max(1, layerEl.clientWidth || rect.width);
    var layerH = Math.max(1, layerEl.clientHeight || rect.height);
    return {
      sx: layerW / Math.max(1, rect.width),
      sy: layerH / Math.max(1, rect.height),
      layerW: layerW,
      layerH: layerH,
      rect: rect
    };
  }

  function shapeGizmoPxFromDom(gizmoEl, layerEl) {
    if (!gizmoEl || !layerEl) return null;
    var gr = gizmoEl.getBoundingClientRect();
    var sc = overlayLayerLocalScale(layerEl);
    var lr = sc.rect;
    if (!lr || !gr.width || !gr.height) return null;
    return {
      w: gr.width * sc.sx,
      h: gr.height * sc.sy,
      cx: (gr.left + gr.width / 2 - lr.left) * sc.sx,
      cy: (gr.top + gr.height / 2 - lr.top) * sc.sy
    };
  }

  /** Measure painted SVG geometry — tight visible art, not picker tile wrapper. */
  function measureShapeVisibleDomPct(buttonId, layerEl) {
    if (!layerEl || buttonId == null) return null;
    var idEsc = String(buttonId).replace(/"/g, '');
    var el = layerEl.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
    if (!el) return null;
    var geom = el.querySelector(
      '.builder-exp-stage-shape__body rect,' +
      '.builder-exp-stage-shape__body ellipse,' +
      '.builder-exp-stage-shape__body polygon,' +
      '.builder-exp-stage-shape__body line,' +
      '.builder-exp-stage-shape__body path'
    );
    if (!geom) return domBoxPctFromEl(el, layerEl);
    return domBoxPctFromEl(geom, layerEl);
  }

  /** Resize stage node + return gizmo metrics that hug visible SVG bounds. */
  function applyShapeVisibleDomBox(buttonId, layerEl, vm, layerW, layerH) {
    var dom = measureShapeVisibleDomPct(buttonId, layerEl);
    if (!dom || !vm || !layerEl) return null;
    var idEsc = String(buttonId).replace(/"/g, '');
    var el = layerEl.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
    if (!el) return null;
    var t = String(vm.type || '').toUpperCase();
    el.classList.remove('is-live-sizing', 'is-live-moving');
    el.style.removeProperty('overflow');
    el.style.removeProperty('transform');
    el.style.left = dom.gx + '%';
    el.style.top = dom.gy + '%';
    el.style.width = dom.gw + '%';
    el.style.height = dom.gh + '%';
    el.style.setProperty('--btn-rot', (Number(vm.rotation) || 0) + 'deg');
    var hit = el.querySelector('.builder-exp-stage-shape__hit');
    if (hit) {
      hit.style.cssText = shapeHitAreaStyle(
        t, vm.shapeStretchX, vm.shapeStretchY, vm, layerW, layerH, true
      );
    }
    patchShapeSvgLive(el, t, {
      fill: vm.fill,
      stroke: vm.stroke,
      strokeWidth: vm.strokeWidth,
      borderRadius: vm.borderRadius
    }, vm.shapeStretchX, vm.shapeStretchY, {
      contentBoxWPct: dom.gw,
      contentBoxHPct: dom.gh,
      layerW: layerW,
      layerH: layerH
    });
    return {
      st: t,
      gx: dom.gx,
      gy: dom.gy,
      gw: dom.gw,
      gh: dom.gh,
      grot: Number(vm.rotation) || 0
    };
  }

  function updateGizmoBoxPct(buttonId, layerEl, m) {
    if (!layerEl || !m || buttonId == null) return;
    var idEsc = String(buttonId).replace(/"/g, '');
    var gizmo = layerEl.querySelector('[data-exp-gizmo][data-gizmo-id="' + idEsc + '"]');
    if (!gizmo) return;
    gizmo.style.left = m.gx + '%';
    gizmo.style.top = m.gy + '%';
    gizmo.style.width = m.gw + '%';
    gizmo.style.height = m.gh + '%';
    gizmo.style.setProperty('--btn-rot', (Number(m.grot) || 0) + 'deg');
    var sizeEl = gizmo.querySelector('[data-exp-sel-size]');
    if (sizeEl && layerEl) {
      var layerW = Math.max(1, layerEl.clientWidth || 1000);
      var layerH = Math.max(1, layerEl.clientHeight || 1000);
      var sizeWpx = Math.max(1, Math.round((m.gw / 100) * layerW));
      var sizeHpx = Math.max(1, Math.round((m.gh / 100) * layerH));
      sizeEl.textContent = m.st === 'SHAPE_LINE'
        ? Math.max(1, sizeWpx) + ' px'
        : sizeWpx + ' × ' + sizeHpx;
    }
  }

  /** DOM getBoundingClientRect → layer-local center + size in %. */
  function domBoxPctFromEl(el, layerEl) {
    if (!el || !layerEl) return null;
    var r = el.getBoundingClientRect();
    var sc = overlayLayerLocalScale(layerEl);
    var lr = sc.rect;
    if (!lr || !r.width || !r.height) return null;
    var wPx = r.width * sc.sx;
    var hPx = r.height * sc.sy;
    var cxPx = (r.left + r.width / 2 - lr.left) * sc.sx;
    var cyPx = (r.top + r.height / 2 - lr.top) * sc.sy;
    return {
      gx: (cxPx / sc.layerW) * 100,
      gy: (cyPx / sc.layerH) * 100,
      gw: (wPx / sc.layerW) * 100,
      gh: (hPx / sc.layerH) * 100,
      wPx: Math.round(wPx),
      hPx: Math.round(hPx)
    };
  }

  function shapeBoxMode(btn, layerW, layerH) {
    if (!btn || typeof ExperienciaEngine === 'undefined' || !ExperienciaEngine.shapeUsesContentBox) {
      return false;
    }
    var ix = btn._ix || btn;
    return ExperienciaEngine.shapeUsesContentBox(ix, btn.width, btn.height, layerW, layerH);
  }

  function shapeGizmoMetrics(btn, layerW, layerH) {
    if (!btn) return null;
    var st = String(btn.type || 'BUTTON').toUpperCase();
    var cx = btn.storedX != null ? Number(btn.storedX) : Number(btn.x) || 50;
    var cy = btn.storedY != null ? Number(btn.storedY) : Number(btn.y) || 50;
    var tileW = Number(btn.width) || shapeDefaultSize(st).w;
    var stretch = shapeStretchFromBtn(btn);
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.sceneShapeGizmoMetrics) {
      var gm = ExperienciaEngine.sceneShapeGizmoMetrics(
        tileW, st, layerW, layerH, cx, cy, stretch.sx, stretch.sy, btn.height, btn._ix || btn
      );
      return {
        st: st,
        gx: gm.gx,
        gy: gm.gy,
        gw: gm.gw,
        gh: gm.gh,
        grot: Number(btn.rotation) || 0,
        tileW: gm.tileW,
        tileH: gm.tileH
      };
    }
    var shapeSz = shapeDisplaySize(tileW, layerW, layerH);
    return {
      st: st,
      gx: cx,
      gy: cy,
      gw: shapeSz.w,
      gh: shapeSz.h,
      grot: Number(btn.rotation) || 0,
      tileW: shapeSz.w,
      tileH: shapeSz.h
    };
  }

  /**
   * Selection gizmo — same visible bounds as stage paint (Genially-style, no tile padding).
   */
  function shapeSelectionGizmoMetrics(btn, layerW, layerH) {
    var vb = shapeVisibleBoundsMetrics(btn, layerW, layerH);
    if (!vb) return null;
    return {
      st: vb.st,
      gx: vb.gx,
      gy: vb.gy,
      gw: vb.gw,
      gh: vb.gh,
      grot: vb.grot,
      tileW: vb.w,
      tileH: vb.h
    };
  }

  function overlaySelectionMetrics(btn, layerW, layerH) {
    if (!btn) return null;
    var st = String(btn.type || 'BUTTON').toUpperCase();
    var grot = Number(btn.rotation) || 0;
    if (isShapeType(st)) {
      if (isShapeBoxV2Active()) {
        var boxSel = getShapeBox(btn, layerW, layerH);
        if (boxSel) return shapeBoxToSelectionMetrics(boxSel);
      }
      var gmSel = shapeSelectionGizmoMetrics(btn, layerW, layerH);
      if (gmSel) return gmSel;
    }
    var gx = Number(btn.x) || 50;
    var gy = Number(btn.y) || 50;
    var gw;
    var gh;
    if (st === 'BUTTON') {
      gw = btn.boxW != null ? Number(btn.boxW) : 14;
      gh = btn.boxH != null ? Number(btn.boxH) : 4.5;
    } else if (st === 'OVERLAY_GROUP' || st === 'GROUP') {
      gw = Number(btn.width) || 20;
      gh = Number(btn.height) || 20;
    } else {
      gw = Math.max(8, Math.min(40, (String(btn.label || 'Texto').length) * 1.2));
      gh = Math.max(3, ((Number(btn.fontSize) || 28) / layerH) * 100 * 1.4);
    }
    return { st: st, gx: gx, gy: gy, grot: grot, gw: gw, gh: gh };
  }

  /** Full gizmo (single) or box-only chrome (multi-select). */
  function buildOverlaySelectionGizmoHtml(btn, layerW, layerH, opts) {
    opts = opts || {};
    if (!btn || btn.locked || btn.visible === false) return '';
    var m = (opts.metrics) ? opts.metrics : overlaySelectionMetrics(btn, layerW, layerH);
    if (!m) return '';
    var multi = !!opts.multi;
    var handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    var rotCorners = ['nw', 'ne', 'se', 'sw'];
    var sizeWpx = Math.max(1, Math.round((m.gw / 100) * layerW));
    var sizeHpx = Math.max(1, Math.round((m.gh / 100) * layerH));
    var sizeLabel = m.st === 'SHAPE_LINE'
      ? Math.max(1, Math.round((m.gw / 100) * layerW)) + ' px'
      : (sizeWpx + ' × ' + sizeHpx);
    var isGroupGizmo = m.st === 'OVERLAY_GROUP' || m.st === 'GROUP';
    var isLineGizmo = m.st === 'SHAPE_LINE';
    var html =
      '<div class="builder-exp-sel-gizmo' + (multi ? ' is-multi' : '') +
        (isGroupGizmo ? ' is-overlay-group' : '') +
        (isLineGizmo ? ' is-line' : '') + '"' +
        ' data-exp-gizmo="1" data-gizmo-id="' + esc(btn.id) + '"' +
        ' data-gizmo-type="' + esc(m.st) + '"' +
        ' style="left:' + m.gx + '%;top:' + m.gy + '%;width:' + m.gw + '%;height:' + m.gh + '%;' +
        '--btn-rot:' + m.grot + 'deg">';
    /* Line: endpoint handles only — no box, no rotate zones. */
    if (isLineGizmo) {
      if (!multi) {
        html += '<div class="builder-exp-sel-move" data-exp-sel-move="1"></div>';
        html += '<span class="builder-exp-sel-handle" data-handle="w"></span>';
        html += '<span class="builder-exp-sel-handle" data-handle="e"></span>';
        html += '<span class="builder-exp-sel-size" data-exp-sel-size>' + esc(sizeLabel) + '</span>';
      }
      html += '</div>';
      return html;
    }
    /* Group: no move surface — clicks pass through to children (double-click to edit). */
    if (!multi && !isGroupGizmo) {
      html += '<div class="builder-exp-sel-move" data-exp-sel-move="1"></div>';
    }
    html += '<div class="builder-exp-sel-box"></div>';
    if (!multi) {
      html += rotCorners.map(function (c) {
        return '<span class="builder-exp-sel-rot-zone" data-handle="rotate" data-rot-corner="' +
          c + '" aria-label="Rotar"></span>';
      }).join('');
      html += handles.map(function (h) {
        return '<span class="builder-exp-sel-handle" data-handle="' + h + '"></span>';
      }).join('');
      html += '<span class="builder-exp-sel-size" data-exp-sel-size>' + esc(sizeLabel) + '</span>';
    }
    html += '</div>';
    return html;
  }

  function buttonIconGlyph(icon) {
    if (icon === 'arrow') return '→';
    if (icon === 'rotate-left') return '↺';
    if (icon === 'rotate-right') return '↻';
    if (icon === 'plus') return '+';
    return '';
  }

  function overlayTypeLabel(t) {
    t = String(t || 'BUTTON').toUpperCase();
    if (t === 'TEXT') return 'Texto';
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.sceneShapeDefaultLabel && isShapeType(t)) {
      return ExperienciaEngine.sceneShapeDefaultLabel(t);
    }
    if (t === 'SHAPE_LINE') return 'Línea';
    if (t === 'SHAPE_RECT') return 'Rectángulo';
    if (t === 'SHAPE_CIRCLE') return 'Círculo';
    return 'Botón';
  }

  function textInspectorFieldsHtml(selected) {
    var fonts = [
      ['system-ui, sans-serif', 'Sistema'],
      ['Georgia, serif', 'Georgia'],
      ['Arial, Helvetica, sans-serif', 'Arial'],
      ['Times New Roman, Times, serif', 'Times'],
      ['Verdana, Geneva, sans-serif', 'Verdana'],
      ['Courier New, Courier, monospace', 'Mono']
    ];
    var ff = selected.fontFamily || 'system-ui, sans-serif';
    var fw = String(selected.fontWeight || '400');
    var op = selected.opacity != null ? Number(selected.opacity) : 1;
    var align = selected.textAlign || 'center';
    var size = Number(selected.fontSize) || 28;
    var sizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 160, 200];
    function fontOpt(v, l) {
      return '<option value="' + esc(v) + '"' + (ff === v ? ' selected' : '') + '>' + esc(l) + '</option>';
    }
    function sizeChip(n) {
      return '<button type="button" class="builder-exp-size-chip' +
        (size === n ? ' is-active' : '') + '" data-exp-text-size-chip="' + n + '">' + n + '</button>';
    }
    function alignBtn(v, label) {
      return '<button type="button" class="builder-hub-segment__btn' +
        (align === v ? ' is-active' : '') + '" data-exp-text-align="' + esc(v) + '">' +
        esc(label) + '</button>';
    }
    return '' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Contenido</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<textarea data-exp-text-content rows="2" maxlength="500" placeholder="Escribe…">' +
            esc(selected.label != null ? selected.label : '') +
          '</textarea>' +
          '<p class="builder-menu-hint builder-exp-btn-hint">Doble clic en el lienzo para editar.</p>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Apariencia</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Fuente</label>' +
          '<select data-exp-text-font class="builder-exp-btn-select">' +
            fonts.map(function (f) { return fontOpt(f[0], f[1]); }).join('') +
          '</select>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Tamaño</label>' +
          '<div class="builder-exp-size-chips">' + sizes.map(sizeChip).join('') + '</div>' +
        '</div>' +
        '<div class="builder-hub-segment" style="margin-bottom:8px">' +
          '<button type="button" class="builder-hub-segment__btn' +
            (fw === '700' || fw === 'bold' ? ' is-active' : '') +
            '" data-exp-text-bold="1">Negrita</button>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Color</label>' +
          '<input type="color" data-exp-text-color value="' +
            esc(/^#[0-9a-fA-F]{6}$/.test(String(selected.color || '')) ? selected.color : '#ffffff') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Alineación</label>' +
          '<div class="builder-hub-segment">' +
            alignBtn('left', 'Izq') +
            alignBtn('center', 'Centro') +
            alignBtn('right', 'Der') +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Opacidad</label>' +
          '<input type="range" data-exp-text-opacity min="0" max="1" step="0.05" value="' +
            esc(String(op)) + '">' +
        '</div>' +
      '</div>';
  }

  function hexOr(v, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback;
  }

  function buttonInspectorFieldsHtml(selected, destOpts) {
    var btnOp = selected.opacity != null ? Number(selected.opacity) : 1;
    var bgOp = selected.bgOpacity != null ? Number(selected.bgOpacity) : 1;
    var hoverOn = selected.hoverEnabled !== false;
    var hoverMs = selected.hoverTransition != null ? Number(selected.hoverTransition) : 200;
    var hoverCol = hexOr(selected.hoverColor, '#6fbf86');
    var hoverText = hexOr(selected.hoverTextColor, '#ffffff');
    var pressedCol = hexOr(selected.pressedColor, '#5aaa74');
    var pressedText = hexOr(selected.pressedTextColor, '#ffffff');
    var bg = hexOr(selected.bgColor, '#141414');
    var textCol = hexOr(selected.textColor, '#ffffff');
    var borderCol = hexOr(selected.borderColor, '#ffffff');
    var bw = selected.borderWidth != null ? Number(selected.borderWidth) : 1;
    var br = selected.borderRadius != null ? Number(selected.borderRadius) : 999;
    return '' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Contenido</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Texto</label>' +
          '<input type="text" data-exp-btn-label maxlength="60" placeholder="Opcional" value="' +
            esc(selected.label != null ? selected.label : '') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Icono</label>' +
          '<select data-exp-btn-icon class="builder-exp-btn-select">' +
            '<option value="none"' + (!selected.icon ? ' selected' : '') + '>Ninguno</option>' +
            '<option value="arrow"' + (selected.icon === 'arrow' ? ' selected' : '') + '>Flecha</option>' +
            '<option value="rotate-left"' + (selected.icon === 'rotate-left' ? ' selected' : '') + '>Rotar izq.</option>' +
            '<option value="rotate-right"' + (selected.icon === 'rotate-right' ? ' selected' : '') + '>Rotar der.</option>' +
            '<option value="plus"' + (selected.icon === 'plus' ? ' selected' : '') + '>Plus</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Apariencia</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Fondo</label>' +
            '<input type="color" data-exp-btn-bg-color value="' + esc(bg) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Transp. fondo</label>' +
            '<input type="range" data-exp-btn-bg-opacity min="0" max="1" step="0.05" value="' +
              esc(String(bgOp)) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Color texto</label>' +
          '<input type="color" data-exp-btn-text-color value="' + esc(textCol) + '">' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Borde</label>' +
            '<input type="color" data-exp-btn-border-color value="' + esc(borderCol) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Grosor</label>' +
            '<input type="number" data-exp-btn-border-width min="0" max="20" step="1" value="' +
              esc(String(bw)) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Radio</label>' +
          '<input type="number" data-exp-btn-radius min="0" max="999" step="1" value="' +
            esc(String(br)) + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Opacidad</label>' +
          '<input type="range" data-exp-btn-opacity min="0" max="1" step="0.05" value="' +
            esc(String(btnOp)) + '">' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row" style="gap:12px;margin-top:4px">' +
          '<label class="builder-exp-inspector__check">' +
            '<input type="checkbox" data-exp-btn-visible' + (selected.visible !== false ? ' checked' : '') + '>' +
            ' Visible</label>' +
          '<label class="builder-exp-inspector__check">' +
            '<input type="checkbox" data-exp-btn-locked' + (selected.locked ? ' checked' : '') + '>' +
            ' Bloqueado</label>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Interacción</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Acción</label>' +
          '<select data-exp-btn-target class="builder-exp-btn-select">' + destOpts + '</select>' +
        '</div>' +
        '<label class="builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-btn-hover-enabled' + (hoverOn ? ' checked' : '') + '>' +
          ' Activar hover</label>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Hover</label>' +
            '<input type="color" data-exp-btn-hover-color value="' + esc(hoverCol) + '"' +
              (hoverOn ? '' : ' disabled') + '>' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Texto hover</label>' +
            '<input type="color" data-exp-btn-hover-text value="' + esc(hoverText) + '"' +
              (hoverOn ? '' : ' disabled') + '>' +
          '</div>' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Pressed</label>' +
            '<input type="color" data-exp-btn-pressed-color value="' + esc(pressedCol) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Texto pressed</label>' +
            '<input type="color" data-exp-btn-pressed-text value="' + esc(pressedText) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Transición (ms)</label>' +
          '<input type="number" data-exp-btn-hover-ms min="0" max="2000" step="50" value="' +
            esc(String(hoverMs)) + '">' +
        '</div>' +
      '</div>';
  }

  function shapeInspectorFieldsHtml(selected) {
    var t = String(selected.type || '').toUpperCase();
    var isLine = t === 'SHAPE_LINE';
    var rot = selected.rotation != null ? Number(selected.rotation) : 0;
    return '' +
      '<div class="builder-exp-inspector__section">Forma</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre</label>' +
        '<input type="text" data-exp-btn-label maxlength="60" value="' +
          esc(selected.label != null ? selected.label : '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>' + (isLine ? 'Largo %' : 'Ancho %') + '</label>' +
        '<input type="number" data-exp-shape-w min="1" max="100" step="0.5" value="' +
          esc(String(selected.width != null ? selected.width : (isLine ? 28 : 12))) + '">' +
      '</div>' +
      (isLine ? '' :
        ('<div class="builder-field builder-exp-inspector__field">' +
          '<label>Alto %</label>' +
          '<input type="number" data-exp-shape-h min="1" max="100" step="0.5" value="' +
            esc(String(selected.height != null ? selected.height : 8)) + '">' +
        '</div>')) +
      (isLine ? '' :
        ('<div class="builder-field builder-exp-inspector__field">' +
          '<label>Relleno</label>' +
          '<input type="text" data-exp-shape-fill value="' + esc(selected.fill || '') + '">' +
        '</div>')) +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Borde</label>' +
        '<input type="text" data-exp-shape-stroke value="' + esc(selected.stroke || '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Grosor borde</label>' +
        '<input type="number" data-exp-shape-sw min="0" max="20" step="1" value="' +
          esc(String(selected.strokeWidth != null ? selected.strokeWidth : 2)) + '">' +
      '</div>' +
      (t === 'SHAPE_RECT' || t === 'SHAPE_ROUND_RECT'
        ? ('<div class="builder-field builder-exp-inspector__field">' +
            '<label>Radio</label>' +
            '<input type="number" data-exp-shape-radius min="0" max="999" step="1" value="' +
              esc(String(selected.borderRadius != null ? selected.borderRadius : (t === 'SHAPE_ROUND_RECT' ? 16 : 8))) + '">' +
          '</div>')
        : '') +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Rotación</label>' +
        '<input type="range" min="-360" max="360" step="1" data-exp-btn-rotation value="' +
          esc(String(rot)) + '">' +
        '<div class="builder-exp-btn-rot-row">' +
          '<input type="number" min="-360" max="360" step="1" data-exp-btn-rotation-num value="' +
            esc(String(rot)) + '">' +
          '<span class="builder-exp-btn-rot-unit">°</span>' +
        '</div>' +
      '</div>' +
      '<label class="builder-exp-inspector__check">' +
        '<input type="checkbox" data-exp-btn-visible' + (selected.visible !== false ? ' checked' : '') + '>' +
        ' Visible</label>';
  }

  function buttonsInspectorHtml(state, n) {
    var buttons = ExperienciaEngine.listSceneButtons
      ? ExperienciaEngine.listSceneButtons(state, n)
      : [];
    var canvasState = (state.experiencia && state.experiencia.canvas) || {};
    var selectedIds = Array.isArray(canvasState.selectedButtonIds)
      ? canvasState.selectedButtonIds.slice()
      : [];
    if (!selectedIds.length && canvasState.selectedButtonId) {
      selectedIds = [canvasState.selectedButtonId];
    }
    var selectedBtnId = canvasState.selectedButtonId || selectedIds[0] || null;
    var selected = null;
    if (selectedBtnId) {
      for (var i = 0; i < buttons.length; i++) {
        if (String(buttons[i].id) === String(selectedBtnId) ||
            String(buttons[i].portId) === String(selectedBtnId)) {
          selected = buttons[i];
          break;
        }
      }
    }

    if (!selected) {
      return '' +
        '<div class="builder-exp-btn-panel builder-exp-btn-panel--empty">' +
          '<p class="builder-menu-hint">Selecciona un elemento</p>' +
        '</div>';
    }

    var selType = String(selected.type || 'BUTTON').toUpperCase();
    var kindTitle = selType === 'TEXT' ? 'Texto'
      : (isShapeType(selType) ? 'Forma'
        : (selType === 'IMAGE' ? 'Imagen' : 'Botón'));

    var nodes = ((state.experiencia && state.experiencia.nodes) || []).filter(function (node) {
      return node && node.id !== n.id && node.kind !== 'action';
    });
    var destOpts = '<option value="">Sin destino</option>' +
      nodes.map(function (node) {
        return '<option value="' + esc(node.id) + '"' +
          (String(selected.targetNodeId) === String(node.id) ? ' selected' : '') +
          '>' + esc(node.label || node.id) + '</option>';
      }).join('');

    var html = '' +
      '<div class="builder-exp-btn-panel">' +
      '<div class="builder-exp-inspector__kind">' + kindTitle + '</div>';

    if (selType === 'TEXT') {
      html += textInspectorFieldsHtml(selected);
    } else if (isShapeType(selType)) {
      html += shapeInspectorFieldsHtml(selected);
    } else {
      html += buttonInspectorFieldsHtml(selected, destOpts);
    }
    html += '</div>';
    return html;
  }

  function hotspotInspectorFieldsHtml(selected, destOpts) {
    var op = selected.opacity != null ? Number(selected.opacity) : 0.22;
    var col = selected.color || 'rgba(111,191,134,0.28)';
    return '' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Hotspot</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Nombre</label>' +
          '<input type="text" data-exp-hs-label maxlength="60" value="' +
            esc(selected.label != null ? selected.label : '') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Acción / destino</label>' +
          '<select data-exp-hs-target class="builder-exp-btn-select">' + destOpts + '</select>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Color</label>' +
          '<input type="color" data-exp-hs-color value="' +
            esc(hexOr(selected.fill || selected.color, '#6fbf86')) + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Opacidad</label>' +
          '<input type="range" data-exp-hs-opacity min="0" max="1" step="0.05" value="' +
            esc(String(op)) + '">' +
        '</div>' +
      '</div>';
  }

  function hotspotsInspectorHtml(state, n) {
    var list = (ExperienciaEngine.listSceneHotspotMasks
      ? ExperienciaEngine.listSceneHotspotMasks(state, n)
      : []) || [];
    var canvasState = (state.experiencia && state.experiencia.canvas) || {};
    var selectedId = canvasState.selectedHotspotId || null;
    var selected = null;
    if (selectedId) {
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(selectedId) ||
            String(list[i].portId) === String(selectedId)) {
          selected = list[i];
          break;
        }
      }
    }
    if (!selected) {
      return '' +
        '<div class="builder-exp-btn-panel builder-exp-btn-panel--empty">' +
          '<p class="builder-menu-hint">Selecciona un hotspot</p>' +
        '</div>';
    }
    var nodes = ((state.experiencia && state.experiencia.nodes) || []).filter(function (node) {
      return node && node.id !== n.id && node.kind !== 'action';
    });
    var destOpts = '<option value="">Sin destino</option>' +
      nodes.map(function (node) {
        return '<option value="' + esc(node.id) + '"' +
          (String(selected.targetNodeId) === String(node.id) ? ' selected' : '') +
          '>' + esc(node.label || node.id) + '</option>';
      }).join('');
    return '' +
      '<div class="builder-exp-btn-panel">' +
        '<div class="builder-exp-inspector__kind">Hotspot</div>' +
        hotspotInspectorFieldsHtml(selected, destOpts) +
      '</div>';
  }

  function prototypeInspectorHtml(state) {
    var sb = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.buildStoryboard)
      ? ExperienciaPrototype.buildStoryboard(state)
      : null;
    var stats = (sb && sb.stats) || {
      nodeCount: 0, branchCount: 0, levelCount: 0, durationSec: 0
    };
    var mins = Math.floor(stats.durationSec / 60);
    var secs = stats.durationSec % 60;
    var durLabel = mins > 0
      ? (mins + ' min ' + secs + ' s')
      : (stats.durationSec + ' s');

    return '<div class="builder-exp-proto-panel">' +
      '<div class="builder-exp-inspector__section">Resumen</div>' +
      '<div class="builder-exp-proto-stats">' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.nodeCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Nodos</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(durLabel) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Duración est.</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.branchCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Ramas</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.levelCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Niveles</span>' +
        '</div>' +
      '</div>' +
      '<p class="builder-menu-hint builder-exp-btn-hint">' +
        'Mismo recorrido que Preview (ExperienceRuntime). PrototypeRenderer dibuja geometría procedural.' +
      '</p>' +
      '<button type="button" class="builder-exp-proto-play" data-exp-proto-play>' +
        '▶ Ver Prototipo' +
      '</button>' +
    '</div>';
  }

  function hubSmartInspectorHtml(state, n, hub) {
    var enabled = !!(hub && hub.enabled);
    var html = '' +
      '<div class="builder-exp-inspector__section">HUB interactivo</div>' +
      '<label class="builder-exp-inspector__check">' +
        '<input type="checkbox" data-exp-hub-enabled' + (enabled ? ' checked' : '') + '>' +
        ' Activar HUB</label>';

    if (!enabled) {
      html += '<p class="builder-menu-hint">Activa el HUB para configurar el selector. Las plantas se toman de Media → Plantas 2D.</p>';
      return html;
    }

    var selectorType = (hub && hub.selectorType) || 'plantas';
    var options = (hub && hub.options) || [];
    var status = ExperienciaEngine.hubSelectorStatus
      ? ExperienciaEngine.hubSelectorStatus(hub)
      : { level: 'warn', message: '' };
    var ap = (hub && hub.appearance) || {
      style: 'numbers', position: 'top-right', alignment: 'horizontal', gap: 8, size: 32
    };
    var isPlantas = selectorType === 'plantas';
    var plantCards = isPlantas && ExperienciaEngine.listHubPlantasCards
      ? ExperienciaEngine.listHubPlantasCards(state, n)
      : [];

    function segmentBtn(value, label, active, disabled) {
      return '<button type="button" class="builder-hub-segment__btn' +
        (active ? ' is-active' : '') +
        (disabled ? ' is-disabled' : '') + '"' +
        ' data-value="' + esc(value) + '"' +
        (disabled ? ' disabled aria-disabled="true"' : '') +
        ' aria-pressed="' + (active ? 'true' : 'false') + '">' +
        esc(label) +
      '</button>';
    }

    function choiceChip(value, label, active, disabled) {
      return '<button type="button" class="builder-estructura-chip builder-hub-choice' +
        (active ? ' is-on' : '') +
        (disabled ? ' is-disabled' : '') + '"' +
        ' data-value="' + esc(value) + '"' +
        (disabled ? ' disabled' : '') + '>' +
        esc(label) +
      '</button>';
    }

    html += '<div class="builder-field builder-exp-inspector__field">' +
      '<label>Tipo de selector</label>' +
      '<div class="builder-hub-segment" data-exp-hub-selector-type role="group" aria-label="Tipo de selector">' +
        segmentBtn('plantas', 'Plantas', selectorType === 'plantas') +
        segmentBtn('tipologias', 'Tipologías', selectorType === 'tipologias') +
        segmentBtn('torres', 'Torres', selectorType === 'torres') +
        segmentBtn('pisos', 'Pisos', selectorType === 'pisos') +
      '</div>' +
    '</div>';

    if (isPlantas) {
      html += '<div class="builder-exp-inspector__section">Plantas 2D</div>';
      if (!plantCards.length) {
        html += '<div class="builder-hub-status is-warn">' +
          esc(status.message || 'No hay plantas en Media → Plantas 2D.') +
        '</div>' +
        '<p class="builder-menu-hint">Sube las plantas en Media → Plantas 2D. El HUB las cargará automáticamente.</p>';
      } else {
        html += '<div class="builder-hub-scenes" data-exp-hub-plants>' +
          plantCards.map(function (opt, idx) {
            var on = !!opt.enabled;
            var thumb = opt.thumbnailUrl
              ? ('<div class="builder-hub-scene-card__thumb" style="background-image:url(\'' +
                esc(opt.thumbnailUrl) + '\')"></div>')
              : '<div class="builder-hub-scene-card__thumb is-empty" aria-hidden="true"></div>';
            return '<article class="builder-hub-scene-card builder-hub-plant-card' +
              (on ? ' is-selected' : ' is-off') + '" data-plant-id="' + esc(opt.plantId) + '">' +
              '<button type="button" class="builder-hub-plant-check' + (on ? ' is-on' : '') + '"' +
                ' data-exp-hub-plant-toggle="' + esc(opt.plantId) + '"' +
                ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
                ' title="' + (on ? 'Desactivar' : 'Activar') + '">' +
                (on ? '☑' : '☐') +
              '</button>' +
              thumb +
              '<div class="builder-hub-scene-card__body">' +
                '<div class="builder-hub-scene-card__title">' +
                  '<strong>' + esc(opt.targetLabel || opt.label) + '</strong>' +
                '</div>' +
                '<span class="builder-hub-scene-card__asset">' +
                  esc(opt.filename || 'Sin archivo') +
                '</span>' +
                '<span class="builder-hub-scene-card__status' +
                  (on ? ' is-ok' : ' is-pending') + '">' +
                  esc(on ? 'Activa en selector' : 'Omitida') +
                '</span>' +
              '</div>' +
              (on
                ? ('<div class="builder-hub-plant-order">' +
                    '<button type="button" class="builder-hub-plant-order__btn" data-exp-hub-plant-up="' +
                      esc(opt.plantId) + '" title="Subir" aria-label="Subir"' +
                      (idx === 0 ? ' disabled' : '') + '>↑</button>' +
                    '<button type="button" class="builder-hub-plant-order__btn" data-exp-hub-plant-down="' +
                      esc(opt.plantId) + '" title="Bajar" aria-label="Bajar"' +
                      (idx >= (hub.selectedPlants || []).length - 1 ? ' disabled' : '') + '>↓</button>' +
                  '</div>')
                : '') +
            '</article>';
          }).join('') +
        '</div>';
        html += '<div class="builder-hub-status ' + (status.level === 'ok' ? 'is-ok' : 'is-warn') + '">' +
          (status.level === 'ok' ? '✔ ' : '') + esc(status.message) +
        '</div>' +
        '<p class="builder-menu-hint">Marca las plantas del inventario Media. El orden ↑↓ define el selector del Runtime.</p>';
      }
    } else {
      html += '<div class="builder-exp-inspector__section">Escenas enlazadas</div>';
      if (!options.length) {
        html += '<div class="builder-hub-status is-warn">' +
          esc(status.message || 'No se encontraron escenas relacionadas con este HUB.') +
        '</div>';
      } else {
        html += '<div class="builder-hub-scenes">' +
          options.map(function (opt) {
            var thumb = opt.thumbnailUrl
              ? ('<div class="builder-hub-scene-card__thumb" style="background-image:url(\'' +
                esc(opt.thumbnailUrl) + '\')"></div>')
              : '<div class="builder-hub-scene-card__thumb is-empty" aria-hidden="true"></div>';
            return '<article class="builder-hub-scene-card">' +
              thumb +
              '<div class="builder-hub-scene-card__body">' +
                '<div class="builder-hub-scene-card__title">' +
                  '<span class="builder-hub-scene-card__check" aria-hidden="true">✓</span>' +
                  '<strong>' + esc(opt.targetLabel || opt.label) + '</strong>' +
                '</div>' +
                '<span class="builder-hub-scene-card__asset">' +
                  esc(opt.filename || 'Sin asset') +
                '</span>' +
                '<span class="builder-hub-scene-card__status' +
                  (opt.hasMedia ? ' is-ok' : ' is-pending') + '">' +
                  esc(opt.statusLabel || (opt.hasMedia ? 'Sincronizado' : 'Pendiente')) +
                '</span>' +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>';
        html += '<div class="builder-hub-status ' + (status.level === 'ok' ? 'is-ok' : 'is-warn') + '">' +
          (status.level === 'ok' ? '✔ ' : '') + esc(status.message) +
        '</div>';
      }
    }

    var previewOpts = isPlantas
      ? plantCards.filter(function (c) { return c && c.enabled; })
      : options;
    var previewThumb = '';
    for (var pi = 0; pi < previewOpts.length; pi++) {
      if (previewOpts[pi].thumbnailUrl) {
        previewThumb = previewOpts[pi].thumbnailUrl;
        break;
      }
    }
    var styleKey = ap.style || 'numbers';
    var previewClass = 'builder-hub-preview' +
      ' is-pos-' + (ap.position || 'top-right') +
      ' is-' + (ap.alignment || 'horizontal') +
      ' is-style-' + styleKey;

    function previewChipHtml(opt, i) {
      if (styleKey === 'thumbnails') {
        var t = opt.thumbnailUrl
          ? (' style="background-image:url(\'' + esc(opt.thumbnailUrl) + '\')"')
          : '';
        return '<span class="builder-hub-preview__chip builder-hub-preview__thumb"' + t +
          ' title="' + esc(opt.targetLabel || opt.label) + '"></span>';
      }
      if (styleKey === 'chips') {
        return '<span class="builder-hub-preview__chip">' +
          esc(opt.targetLabel || opt.label) + '</span>';
      }
      return '<span class="builder-hub-preview__chip">' + esc(opt.label || String(i + 1)) + '</span>';
    }

    html += '<div class="builder-exp-inspector__section">Vista previa</div>' +
      '<div class="' + previewClass + '" data-exp-hub-preview aria-hidden="true" style="' +
        '--hub-gap:' + Number(ap.gap || 8) + 'px;' +
        '--hub-size:' + Number(ap.size || 32) + 'px;' +
      '">' +
        '<div class="builder-hub-preview__stage"' +
          (previewThumb
            ? (' style="background-image:url(\'' + esc(previewThumb) + '\')"')
            : '') + '>' +
          '<div class="builder-hub-preview__scrim"></div>' +
          '<div class="builder-hub-preview__overlay">' +
            (previewOpts.length
              ? previewOpts.map(previewChipHtml).join('')
              : '<span class="builder-hub-preview__chip is-empty">—</span>') +
          '</div>' +
        '</div>' +
      '</div>';

    html += '<div class="builder-exp-inspector__section">Apariencia</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Estilo</label>' +
        '<div class="builder-hub-chips" data-exp-hub-style>' +
          choiceChip('numbers', 'Números', styleKey === 'numbers') +
          choiceChip('chips', 'Chips', styleKey === 'chips') +
          choiceChip('thumbnails', 'Miniaturas', styleKey === 'thumbnails') +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Posición</label>' +
        '<div class="builder-hub-pos-grid" data-exp-hub-position role="group" aria-label="Posición">' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'top-left' ? ' is-active' : '') +
            '" data-value="top-left" title="Superior izquierda" aria-label="Superior izquierda">↖</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'top-right' ? ' is-active' : '') +
            '" data-value="top-right" title="Superior derecha" aria-label="Superior derecha">↗</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'bottom-left' ? ' is-active' : '') +
            '" data-value="bottom-left" title="Inferior izquierda" aria-label="Inferior izquierda">↙</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'bottom-right' ? ' is-active' : '') +
            '" data-value="bottom-right" title="Inferior derecha" aria-label="Inferior derecha">↘</button>' +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Alineación</label>' +
        '<div class="builder-hub-chips" data-exp-hub-align>' +
          choiceChip('horizontal', 'Horizontal', ap.alignment !== 'vertical') +
          choiceChip('vertical', 'Vertical', ap.alignment === 'vertical') +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field builder-hub-slider-field">' +
        '<div class="builder-hub-slider-label">' +
          '<label>Separación</label>' +
          '<span data-exp-hub-gap-val>' + esc(String(ap.gap != null ? ap.gap : 8)) + ' px</span>' +
        '</div>' +
        '<input type="range" min="0" max="32" step="1" data-exp-hub-gap value="' +
          esc(String(ap.gap != null ? ap.gap : 8)) + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field builder-hub-slider-field">' +
        '<div class="builder-hub-slider-label">' +
          '<label>Tamaño</label>' +
          '<span data-exp-hub-size-val>' + esc(String(ap.size != null ? ap.size : 32)) + ' px</span>' +
        '</div>' +
        '<input type="range" min="22" max="48" step="1" data-exp-hub-size value="' +
          esc(String(ap.size != null ? ap.size : 32)) + '">' +
      '</div>' +
      '<p class="builder-menu-hint">La apariencia se guarda en el HUB. Runtime usará las plantas seleccionadas de Media.</p>';

    return html;
  }

  function inspectorHtml(state, nodeId, edgeId) {
    if (edgeId) {
      var ed = ExperienciaEngine.getEdge(state, edgeId);
      if (!ed) return '<p class="builder-menu-hint">Conexión no encontrada.</p>';
      var a = ExperienciaEngine.getNode(state, ed.sourceNodeId || ed.from || ed.sourceId);
      var b = ExperienciaEngine.getNode(state, ed.targetNodeId || ed.to || ed.targetId);
      var srcPortId = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      var srcPortLabel = ed.sourcePortLabel ||
        (ExperienciaEngine.resolvePortLabel
          ? ExperienciaEngine.resolvePortLabel(a, srcPortId)
          : srcPortId);
      var tgtPortId = ed.targetPortId || ed.targetPort || 'in';
      return '' +
        '<div class="builder-exp-inspector__kind">CONEXIÓN</div>' +
        '<h3 class="builder-exp-inspector__title">' +
          esc((a ? a.label : 'Nodo') + ' → ' + (b ? b.label : 'Nodo')) +
        '</h3>' +
        '<div class="builder-exp-inspector__grid">' +
          row('Origen', a ? (a.label || a.id) : (ed.sourceNodeId || ed.from || '—')) +
          row('Interacción', srcPortLabel || srcPortId) +
          row('Puerto origen', srcPortId) +
          row('Destino', b ? (b.label || b.id) : (ed.targetNodeId || ed.to || '—')) +
          row('Puerto destino', tgtPortId) +
          row('Tipo', ed.inlineAction ? 'Acción inline' : 'Navegación') +
        '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-del-edge="' +
            esc(ed.id) + '">Eliminar conexión</button>' +
        '</div>';
    }

    var n = ExperienciaEngine.getNode(state, nodeId);
    if (!n) {
      return '<p class="builder-menu-hint">Selecciona un nodo del mapa o arrastra desde un puerto ●.</p>';
    }
    var conn = ExperienciaEngine.connectionsFor(state, n.id);
    var byId = {};
    (state.experiencia.nodes || []).forEach(function (x) { byId[x.id] = x; });

    function names(list, key) {
      if (!list.length) return '—';
      return list.map(function (ed) {
        var otherId = key === 'from'
          ? (ed.sourceNodeId || ed.from || ed.sourceId)
          : (ed.targetNodeId || ed.to || ed.targetId);
        var other = byId[otherId];
        var port = ed.sourcePortId || ed.sourcePort || ed.portId || '';
        var srcNode = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var portLabel = ed.sourcePortLabel ||
          (srcNode && ExperienciaEngine.resolvePortLabel
            ? ExperienciaEngine.resolvePortLabel(srcNode, port)
            : port);
        if (key === 'to') {
          return (other ? (other.label || other.id) : otherId) +
            (port ? (' ← ' + (portLabel || port)) : '');
        }
        return (other ? (other.label || other.id) : otherId) +
          (port ? ('.' + (portLabel || port)) : '');
      }).join(', ');
    }

    var html = '' +
      '<div class="builder-exp-inspector__kind">' + esc(n.typeLabel || n.kind) + '</div>' +
      '<h3 class="builder-exp-inspector__title">' + esc(n.label || n.id) + '</h3>';

    if (n.kind === 'hero') {
      var hero = (typeof ExperienciaEngine.ensureHeroContent === 'function')
        ? ExperienciaEngine.ensureHeroContent(state)
        : (state.heroContent || {});
      var slots = (n.config && n.config.slots) || {};
      var flowOut = names(conn.out, 'to');
      html += '<div class="builder-exp-inspector__grid">' +
        row('Fuente', 'Sección Hero') +
        row('Flujo (INICIAR)', flowOut) +
      '</div>';

      html += '<div class="builder-exp-inspector__section">Navegación</div>' +
        '<p class="builder-menu-hint">Explorar referencia la sección Menú existente. No se duplican botones aquí.</p>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-goto-step="menu">' +
            'Ir a Menú / Editar en Menú</button>' +
        '</div>';

      html += '<div class="builder-exp-inspector__section">Acciones (Hero)</div>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showShare"' +
            (hero.showShare !== false ? ' checked' : '') + '>' +
          '<span>Compartir habilitado</span>' +
        '</label>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showFullscreen"' +
            (hero.showFullscreen !== false ? ' checked' : '') + '>' +
          '<span>Fullscreen habilitado</span>' +
        '</label>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showWhatsapp"' +
            (hero.showWhatsapp !== false ? ' checked' : '') + '>' +
          '<span>WhatsApp habilitado</span>' +
        '</label>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Número WhatsApp</label>' +
          '<input type="text" data-exp-hero-field="whatsappLink" maxlength="180" ' +
            'placeholder="573001112233" value="' + esc(hero.whatsappLink || '') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Mensaje predeterminado</label>' +
          '<input type="text" data-exp-hero-field="whatsappMessage" maxlength="280" ' +
            'placeholder="Hola, quiero recibir información..." value="' +
            esc(hero.whatsappMessage || '') + '">' +
        '</div>' +
        '<p class="builder-menu-hint">Misma fuente que la sección Hero. Experiencia no guarda una copia.</p>';
      void slots;
      return html;
    }

    if (n.kind === 'image' || n.kind === 'plan' || n.kind === 'pano360' || n.kind === 'scene' ||
        n.kind === 'vista' || n.kind === 'planta-3d' || n.kind === 'ficha' || n.kind === 'gallery' ||
        n.kind === 'video' || n.kind === 'animacion') {
      var ixs = (n.config && n.config.interactions) || [];
      var media = ExperienciaEngine.resolveSceneMedia
        ? ExperienciaEngine.resolveSceneMedia(state, n)
        : { filename: n.config && n.config.fileName, statusLabel: '—', assetId: null };
      var selIxId = state.experiencia && state.experiencia.canvas
        ? state.experiencia.canvas.selectedInteractionId
        : null;
      var hubPreview = ExperienciaEngine.ensureHubConfig
        ? ExperienciaEngine.ensureHubConfig(n)
        : (n.config && n.config.hub);
      var hubOn = !!(hubPreview && hubPreview.enabled);
      var selIx = (!hubOn && selIxId)
        ? ExperienciaEngine.getInteraction(state, n.id, selIxId)
        : null;

      if (selIx) {
        var structLink = ExperienciaEngine.resolveStructureLink
          ? ExperienciaEngine.resolveStructureLink(state, selIx)
          : null;
        var structOpts = ExperienciaEngine.listStructureLinkOptions
          ? ExperienciaEngine.listStructureLinkOptions(state)
          : [];
        var isFloorSel = String(selIx.type || '').toUpperCase() === 'SELECTOR' ||
          String(selIx.actionType || (selIx.behavior && selIx.behavior.type) || '').toLowerCase() === 'floor-selector';

        html += '<div class="builder-exp-inspector__section">Elemento</div>' +
          '<div class="builder-field builder-exp-inspector__field">' +
            '<label>Nombre</label>' +
            '<input type="text" data-exp-ix-label maxlength="120" value="' +
              esc(selIx.label || '') + '">' +
          '</div>' +
          '<div class="builder-exp-inspector__grid">' +
            row('Tipo', ExperienciaEngine.interactionTypeLabel
              ? ExperienciaEngine.interactionTypeLabel(selIx.type)
              : selIx.type) +
            row('Puerto', selIx.portId || selIx.id) +
            row('Acción', (selIx.actionType || (selIx.behavior && selIx.behavior.type) || '—')) +
            row('Estado', selIx.enabled === false ? 'Deshabilitado' : 'Activo') +
          '</div>';

        if (isFloorSel) {
          var tipOpts = ((state.estructura && state.estructura.tipologias) || []).map(function (tip, i) {
            var tid = tip.id || tip.localId || tip.node_id || ('t' + i);
            var label = tip.nombre || tip.modelo || ('Tipología ' + (i + 1));
            return { id: tid, label: label };
          });
          var beh = selIx.behavior || {};
          var selTip = beh.tipologiaId || (selIx.structureId ? String(selIx.structureId).replace(/^tip:/, '') : '');
          var plantas = [];
          if (selTip && ExperienciaEngine.listTypologyPlantas) {
            plantas = ExperienciaEngine.listTypologyPlantas(state, selTip, {
              kind: 'tipologia',
              tipologiaId: selTip
            }) || [];
          }
          var enabledKeys = beh.floorKeys || plantas.map(function (p) { return p.key; });
          html += '<div class="builder-exp-inspector__section">Selector de plantas</div>' +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<label>Tipología</label>' +
              '<select data-exp-ix-floor-tip>' +
                '<option value="">Elegir tipología…</option>' +
                tipOpts.map(function (t) {
                  return '<option value="' + esc(t.id) + '"' +
                    (String(selTip) === String(t.id) ? ' selected' : '') + '>' +
                    esc(t.label) + '</option>';
                }).join('') +
              '</select>' +
            '</div>';
          if (plantas.length) {
            html += '<div class="builder-exp-inspector__section">Plantas disponibles</div>' +
              plantas.map(function (p) {
                var on = enabledKeys.indexOf(p.key) !== -1 ||
                  enabledKeys.indexOf(String(p.key)) !== -1;
                return '<label class="builder-exp-inspector__check">' +
                  '<input type="checkbox" data-exp-ix-floor-key="' + esc(p.key) + '"' +
                  (on ? ' checked' : '') + '> ' + esc(p.label) + '</label>';
              }).join('') +
              '<div class="builder-field builder-exp-inspector__field" style="margin-top:8px">' +
                '<label>Planta inicial</label>' +
                '<select data-exp-ix-floor-initial>' +
                  plantas.map(function (p) {
                    var sel = String(beh.initialFloor || '') === String(p.key);
                    return '<option value="' + esc(p.key) + '"' + (sel ? ' selected' : '') + '>' +
                      esc(p.label) + '</option>';
                  }).join('') +
                '</select>' +
              '</div>';
          } else if (selTip) {
            html += '<p class="builder-menu-hint">Esta tipología no tiene plantas en Estructura.</p>';
          } else {
            html += '<p class="builder-menu-hint">Elige una tipología definida en Estructura.</p>';
          }
        } else {
          html += '<div class="builder-exp-inspector__section">Vincular con Estructura</div>' +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<label>Elemento estructural</label>' +
              '<select data-exp-ix-structure>' +
                '<option value="">Ninguno / Personalizado</option>' +
                structOpts.map(function (opt) {
                  var sel = (selIx.structureId && String(selIx.structureId) === String(opt.id)) ||
                    (selIx.structureKey && selIx.structureKey === opt.key);
                  return '<option value="' + esc(opt.id) + '" data-key="' + esc(opt.key) + '"' +
                    ' data-kind="' + esc(opt.kind || '') + '"' +
                    ' data-label="' + esc(opt.label) + '"' +
                    (sel ? ' selected' : '') + '>' + esc(opt.label) +
                    (opt.kind ? (' · ' + opt.kind) : '') + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            (structLink
              ? ('<p class="builder-menu-hint' + (structLink.missing ? ' is-warn' : '') + '">' +
                esc(structLink.display) + '</p>')
              : '<p class="builder-menu-hint">Opcional. No duplica Estructura; solo referencia.</p>');
        }

        html += '<div class="builder-exp-inspector__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="toggle" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">' +
              (selIx.enabled === false ? 'Habilitar' : 'Deshabilitar') + '</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="dup" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Duplicar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="unlink" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Desvincular</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="del" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Eliminar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-clear-ix-sel>Volver a escena</button>' +
          '</div>';
        return html;
      }

      html += '<div class="builder-exp-inspector__section">Escena</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Nombre de la tarjeta</label>' +
          '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
        '</div>' +
        '<div class="builder-exp-inspector__grid">' +
          row('Tipo', n.typeLabel || n.kind) +
          row('Asset', media.filename || 'Sin asignar') +
          row('Estado media', media.statusLabel || 'Pendiente') +
          row('Asset ID', media.assetId || '—') +
          row('Estado', ExperienciaEngine.statusLabel(n)) +
          row('Origen', names(conn.in, 'from')) +
        '</div>';

      if (n.kind === 'video' || n.kind === 'animacion') {
        html += '<div class="builder-exp-inspector__grid">' +
          row('Autoplay', (n.config && n.config.autoplay) ? 'Sí' : 'No') +
          row('Al finalizar', (n.config && n.config.onEnd) || 'next') +
          row('Duración', (n.transitionSeconds || 4) + '–5 s') +
        '</div>';
      }

      html += '<div class="builder-exp-inspector__section">Media</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Asset (desde Media)</label>' +
          '<select data-exp-asset-pick>' +
            '<option value="">Sin asignar</option>' +
            (function () {
              var assets = ExperienciaEngine.listSelectableMediaAssets
                ? ExperienciaEngine.listSelectableMediaAssets(state)
                : (ExperienciaEngine.listProjectAssets
                  ? ExperienciaEngine.listProjectAssets(state).filter(function (a) {
                    return a && !a.orphan && a.nodeId && (a.filename || a.publicUrl);
                  })
                  : []);
              var curId = media.assetId || null;
              var curStillValid = curId && assets.some(function (a) {
                return String(a.id) === String(curId);
              });
              var htmlOpts = assets.map(function (a) {
                var label = a.filename || a.storagePath || a.id;
                var sel = curId && String(curId) === String(a.id);
                return '<option value="' + esc(a.id) + '"' + (sel ? ' selected' : '') + '>' +
                  esc(label) + '</option>';
              }).join('');
              if (curId && !curStillValid) {
                htmlOpts =
                  '<option value="' + esc(curId) + '" selected disabled>' +
                    esc((media.filename || curId) + ' (no está en Media)') +
                  '</option>' + htmlOpts;
              }
              return htmlOpts;
            })() +
          '</select>' +
        '</div>' +
        (media.publicUrl
          ? '<p class="builder-menu-hint" style="margin:6px 0 10px;word-break:break-all">CDN: <a href="' +
            esc(media.publicUrl) + '" target="_blank" rel="noopener">' + esc(media.publicUrl) + '</a></p>'
          : '<p class="builder-menu-hint">Solo assets del inventario Media.</p>') +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-asset-clear="' +
            esc(n.id) + '">Quitar referencia</button>' +
        '</div>';

      var hub = ExperienciaEngine.ensureHubConfig
        ? ExperienciaEngine.ensureHubConfig(n)
        : ((n.config && n.config.hub) || null);
      if (hub && hub.enabled && ExperienciaEngine.syncHubSmartSelector) {
        ExperienciaEngine.syncHubSmartSelector(state, n);
      }
      html += hubSmartInspectorHtml(state, n, hub);

      if (!(hub && hub.enabled)) {
        html += '<div class="builder-exp-inspector__ix-head">' +
          '<span>Elementos de la escena</span>' +
          '<button type="button" class="builder-exp-inspector__ix-add" data-exp-add-element="' +
            esc(n.id) + '">+ Agregar</button></div>';
        html += interactionInspectorList(n, ixs);
        html += '<p class="builder-menu-hint">Eliminar un elemento no borra su escena destino ni el asset.</p>';
      }
      return html;
    }

    if (n.kind === 'action') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Tipo', (n.config && n.config.actionType) || '—') +
        row('Inline', (n.config && n.config.inline) ? 'Sí (sin cambiar escena)' : 'No') +
        row('Origen', names(conn.in, 'from')) +
      '</div>';
      return html;
    }

    if (n.kind === 'structure' || n.kind === 'group') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Elemento', n.label || '—') +
        row('Unidades', String(n.unitCount != null ? n.unitCount : '—')) +
        row('Origen', names(conn.in, 'from')) +
      '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-enter-group="' +
            esc(n.id) + '">Entrar al flujo interno</button>' +
          '<p class="builder-menu-hint">Base de jerarquía lista; pisos/plantas se detallan en versiones siguientes.</p>' +
        '</div>';
      return html;
    }

    if (n.kind === 'hotspot' || n.kind === 'selector-pisos') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Legacy', 'Nodo V5.9.56 (no migrado automáticamente)') +
        row('Vinculado', (n.config && n.config.structureLabel) || '—') +
        row('Destino', names(conn.out, 'to')) +
      '</div>' +
        '<p class="builder-menu-hint">Si este hotspot pertenece a una sola escena, recarga Experiencia para embeberlo.</p>';
      return html;
    }

    html += '<div class="builder-field builder-exp-inspector__field">' +
      '<label>Nombre de la tarjeta</label>' +
      '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
    '</div>' +
      '<div class="builder-exp-inspector__grid">' +
      row('Estado', ExperienciaEngine.statusLabel(n)) +
      row('Tipo', n.kind || '—') +
      row('Origen', names(conn.in, 'from')) +
      row('Destino', names(conn.out, 'to')) +
    '</div>';
    return html;
  }

  function interactionInspectorList(scene, list) {
    if (!list || !list.length) {
      return '<p class="builder-menu-hint builder-exp-inspector__ix-empty">Ninguno</p>';
    }
    return '<ul class="builder-exp-inspector__ix-list">' +
      list.map(function (ix) {
        var behavior = (ix.behavior && ix.behavior.type) || ix.actionType || '—';
        return '<li class="builder-exp-inspector__ix-item' +
          (ix.enabled === false ? ' is-disabled' : '') +
          '" data-exp-ix-id="' + esc(ix.id) + '" data-exp-ix-scene="' + esc(scene.id) + '">' +
          '<div class="builder-exp-inspector__ix-main">' +
            '<strong>' + esc(ix.label || ix.type) + '</strong>' +
            '<span>' + esc(ix.type) + (behavior !== '—' ? (' · ' + behavior) : '') + '</span>' +
          '</div>' +
          '<div class="builder-exp-inspector__ix-acts">' +
            '<button type="button" data-exp-ix-act="rename" title="Renombrar">✎</button>' +
            '<button type="button" data-exp-ix-act="toggle" title="Habilitar/Deshabilitar">' +
              (ix.enabled === false ? '○' : '●') + '</button>' +
            '<button type="button" data-exp-ix-act="dup" title="Duplicar">⧉</button>' +
            '<button type="button" data-exp-ix-act="unlink" title="Desvincular">⊘</button>' +
            '<button type="button" data-exp-ix-act="del" title="Eliminar" class="is-danger">×</button>' +
          '</div>' +
        '</li>';
      }).join('') +
    '</ul>';
  }

  function row(label, value) {
    return '<div class="builder-exp-inspector__row"><span>' + esc(label) +
      '</span><strong>' + esc(value) + '</strong></div>';
  }

  function createMenuHtml(title, menu) {
    menu = menu || ExperienciaEngine.CREATE_MENU || [];
    return '<div class="builder-exp-ctx__panel">' +
      '<div class="builder-exp-ctx__title">' + esc(title || '¿Qué quieres crear?') + '</div>' +
      menu.map(function (cat) {
        return '<div class="builder-exp-ctx__cat">' +
          '<div class="builder-exp-ctx__cat-label">' + esc(cat.label) + '</div>' +
          cat.items.map(function (it) {
            return '<button type="button" class="builder-exp-ctx__item" data-exp-create="' +
              esc(it.id) + '" data-cat="' + esc(cat.id) + '">' + esc(it.label) + '</button>';
          }).join('') +
        '</div>';
      }).join('') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function addElementMenuHtml() {
    var menu = ExperienciaEngine.ADD_ELEMENT_MENU || [];
    return '<div class="builder-exp-ctx__panel">' +
      '<div class="builder-exp-ctx__title">Agregar elemento</div>' +
      menu.map(function (cat) {
        return '<div class="builder-exp-ctx__cat">' +
          '<div class="builder-exp-ctx__cat-label">' + esc(cat.label) + '</div>' +
          cat.items.map(function (it) {
            return '<button type="button" class="builder-exp-ctx__item" data-exp-add-el-item="' +
              esc(it.id) + '">' + esc(it.label) + '</button>';
          }).join('') +
        '</div>';
      }).join('') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function interactionContextMenuHtml(ix) {
    var on = !ix || ix.enabled !== false;
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--ix">' +
      '<div class="builder-exp-ctx__title">' + esc((ix && ix.label) || 'Interacción') + '</div>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="configure">Configurar</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="duplicate">Duplicar</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="toggle">' +
        (on ? 'Deshabilitar' : 'Habilitar') + '</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="unlink">Desvincular</button>' +
      '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-ix-ctx="delete">Eliminar</button>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function nodeContextMenuHtml(nodes) {
    var list = nodes || [];
    var multi = list.length > 1;
    var anyLocked = list.some(function (n) { return n && n.locked; });
    var anyUnlocked = list.some(function (n) {
      return n && !n.locked && !ExperienciaEngine.isProtectedNode(n);
    });
    var allProtected = list.length && list.every(function (n) {
      return ExperienciaEngine.isProtectedNode(n);
    });
    var canDuplicate = list.some(function (n) {
      return n && !ExperienciaEngine.isProtectedNode(n);
    });
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--node">' +
      '<div class="builder-exp-ctx__title">' +
        (multi ? ('Selección · ' + list.length) : esc((list[0] && list[0].label) || 'Nodo')) +
      '</div>' +
      (!multi
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="rename">Renombrar</button>'
        : '') +
      (canDuplicate
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="duplicate">' +
          (multi ? 'Duplicar selección' : 'Duplicar') + '</button>'
        : '<button type="button" class="builder-exp-ctx__item is-disabled" disabled>Duplicar (protegido)</button>') +
      (anyUnlocked
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="lock">Bloquear</button>'
        : '') +
      (anyLocked
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="unlock">Desbloquear</button>'
        : '') +
      '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="unlink">Desvincular</button>' +
      (allProtected
        ? '<button type="button" class="builder-exp-ctx__item is-disabled" disabled>Eliminar (protegido)</button>'
        : '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-node-act="delete">' +
          (multi ? 'Eliminar selección' : 'Eliminar') + '</button>') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function edgeContextMenuHtml() {
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--edge">' +
      '<div class="builder-exp-ctx__title">Conexión</div>' +
      '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-edge-act="unlink">' +
        'Desvincular conexión</button>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function structurePickerHtml(state) {
    var tree = ExperienciaEngine.listStructureLibrary(state) || [];
    function walk(items, depth) {
      return (items || []).map(function (it) {
        var hasKids = it.children && it.children.length;
        return '<div class="builder-exp-picker__row" style="--d:' + depth + '">' +
          '<button type="button" class="builder-exp-picker__item" data-exp-struct="' + esc(it.id) + '"' +
            ' data-label="' + esc(it.label) + '"' +
            ' data-kind="' + esc(it.kind || '') + '"' +
            ' data-capacity="' + esc(it.capacity != null ? it.capacity : '') + '"' +
            ' data-stage="' + esc(it.stageId || '') + '">' +
            esc(it.label) +
            (it.capacity != null ? (' · ' + it.capacity + ' viv.') : '') +
          '</button>' +
        '</div>' +
        (hasKids ? walk(it.children, depth + 1) : '');
      }).join('');
    }
    return '<div class="builder-exp-picker__panel">' +
      '<div class="builder-exp-ctx__title">Vincular desde Estructura</div>' +
      '<div class="builder-exp-picker__tree">' + walk(tree, 0) + '</div>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-picker-cancel>Cancelar</button>' +
    '</div>';
  }

  function findMenuItem(id, menu) {
    var menus = menu
      ? [menu]
      : [ExperienciaEngine.CREATE_MENU || [], ExperienciaEngine.CREATE_MENU_BLANK || []];
    for (var m = 0; m < menus.length; m++) {
      var cats = menus[m] || [];
      for (var i = 0; i < cats.length; i++) {
        for (var j = 0; j < cats[i].items.length; j++) {
          if (cats[i].items[j].id === id) return cats[i].items[j];
        }
      }
    }
    return null;
  }

  function mount(rootEl, state, api) {
    api = api || {};
    var overlayMode = !!api.overlayMode;

    _shapeBoxV2ProjectId = api.projectId || shapeBoxProjectIdFromUrl() || null;
    _shapeBoxV2Active = api.shapeBoxV2 === true || shapeBoxV2Enabled(_shapeBoxV2ProjectId);
    if (_shapeBoxV2Active) {
      try {
        console.info('[ExperienciaCanvas] ShapeBox v2 — unified shape paint + resize (Fase 1–3 POC)', {
          projectId: _shapeBoxV2ProjectId
        });
      } catch (eSbLog) { /* ignore */ }
    } else {
      try {
        var sbDbg = shapeBoxV2DebugSnapshot();
        if (sbDbg.enabledForUrlId || sbDbg.urlShapeBox === '1') {
          console.warn(
            '[ExperienciaCanvas] ShapeBox v2 INACTIVO — overlay montado sin flag v2. ' +
            'Añade ?shapeBox=1 y recarga, o remonta el editor.',
            sbDbg
          );
        }
      } catch (eSbWarn) { /* ignore */ }
    }

    ExperienciaEngine.ensureFlow(state);

    /* V6.5.01 — baseline snapshot + recovery offer if a richer copy exists */
    if (!overlayMode && typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'open-experiencia', 'autosave');
    }

    var stage = rootEl.querySelector('[data-exp-stage]');
    var viewport = rootEl.querySelector('[data-exp-viewport]');
    var world = rootEl.querySelector('[data-exp-world]');
    var nodesEl = rootEl.querySelector('[data-exp-nodes]');
    var edgesEl = rootEl.querySelector('[data-exp-edges]');
    var buttonsStage = rootEl.querySelector('[data-exp-buttons-stage]');
    var buttonsFrame = rootEl.querySelector('[data-exp-buttons-frame]');
    var buttonsImg = rootEl.querySelector('[data-exp-buttons-img]');
    var buttonsLayer = rootEl.querySelector('[data-exp-buttons-layer]');
    var buttonsEmpty = rootEl.querySelector('[data-exp-buttons-empty]');
    var hotspotsStage = rootEl.querySelector('[data-exp-hotspots-stage]');
    var hotspotsFrame = rootEl.querySelector('[data-exp-hotspots-frame]');
    var hotspotsImg = rootEl.querySelector('[data-exp-hotspots-img]');
    var hotspotsLayer = rootEl.querySelector('[data-exp-hotspots-layer]');
    var hotspotsSvg = rootEl.querySelector('[data-exp-hotspots-svg]');
    var hotspotsEmpty = rootEl.querySelector('[data-exp-hotspots-empty]');
    var protoStage = rootEl.querySelector('[data-exp-proto-stage]');
    var protoHost = rootEl.querySelector('[data-exp-proto-host]');
    var protoRuntimePlayer = null;
    var protoFingerprint = null;
    var hotspotDraw = null; /* { points: [{x,y}], cursor: {x,y}|null } */
    var hotspotDrag = null; /* vertex | poly move */
    var modeTabs = rootEl.querySelector('[data-exp-mode-tabs]');
    var inspectorBody = api.inspectorBody ||
      ((typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.getInspectorBody)
        ? BuilderPropertiesRail.getInspectorBody(rootEl)
        : rootEl.querySelector('[data-exp-inspector-body]'));
    var inspector = null;
    var workspace = rootEl.querySelector('[data-exp-workspace]');
    var minimapWrap = rootEl.querySelector('[data-exp-minimap]');
    var minimapCanvas = rootEl.querySelector('[data-exp-minimap-canvas]');
    var ctxEl = rootEl.querySelector('[data-exp-ctx]');
    var pickerEl = rootEl.querySelector('[data-exp-picker]');
    var modalEl = rootEl.querySelector('[data-exp-modal]');
    if (!viewport || !world || !nodesEl || !edgesEl) return null;

    var dragging = null;
    var buttonDrag = null;
    var transformDrag = null;
    var overlayMarquee = null;
    /** Min pointer travel (px) before move/resize counts as a drag — avoids snap on click. */
    var OVERLAY_DRAG_THRESHOLD_PX = 4;
    /** Custom double-tap on rotate — native dblclick dies when gizmo remounts on pointerup. */
    var rotateTapArmed = null; /* { buttonId, at } */
    var groupEditTapArmed = null; /* legacy — kept for rotate tap parity */
    var groupEditPulse = null; /* { groupId, childId, at } */
    var groupPointerGesture = null; /* deferred group drag / double-click */
    var GROUP_DEBUG = false;
    try {
      GROUP_DEBUG = /(?:\?|&)groupDebug=1(?:&|$)/.test(String(window.location.search || ''));
    } catch (eGd) { /* ignore */ }

    function groupDebugLog() {
      if (!GROUP_DEBUG) return;
      try {
        var args = ['[QE:group]'].concat(Array.prototype.slice.call(arguments));
        console.log.apply(console, args);
      } catch (eLog) { /* ignore */ }
    }

    function dragDebugLog() {
      if (!GROUP_DEBUG) return;
      try {
        var args = ['[QE:drag]'].concat(Array.prototype.slice.call(arguments));
        console.log.apply(console, args);
      } catch (eLog) { /* ignore */ }
    }
    var textEditEl = null;
    var buttonHistory = { past: [], future: [], max: 100 };
    var buttonOpArmed = false;
    var buttonNudgeDirty = false;
    var buttonClipboard = null; /* { sourceIds: string[] } */
    var pendingMoveIds = {}; /* id -> true while stacked on original after paste */

    function snapshotHistoryKey(snap) {
      if (!snap || !Array.isArray(snap.interactions)) return '';
      return snap.interactions.map(function (ix) {
        if (!ix) return '';
        return [
          ix.id,
          ix.type,
          ix.x,
          ix.y,
          ix.width,
          ix.height,
          ix.boxW,
          ix.boxH,
          ix.rotation,
          ix.label,
          ix.fill,
          ix.stroke,
          ix.strokeWidth,
          ix.visible,
          ix.locked
        ].join('\u0001');
      }).join('\u0002');
    }

    function pushButtonHistory(sceneId) {
      if (!ExperienciaEngine.snapshotSceneButtons) return;
      var sid = sceneId || canvas().selectedId;
      if (!sid) return;
      var snap = ExperienciaEngine.snapshotSceneButtons(state, sid);
      if (!snap) return;
      var key = snapshotHistoryKey(snap);
      if (buttonHistory.past.length) {
        var last = buttonHistory.past[buttonHistory.past.length - 1];
        if (last && String(last.sceneId) === String(snap.sceneId) &&
            snapshotHistoryKey(last) === key) {
          return;
        }
      }
      buttonHistory.past.push(snap);
      if (buttonHistory.past.length > buttonHistory.max) {
        buttonHistory.past.shift();
      }
      buttonHistory.future = [];
    }

    function clearButtonGestureState() {
      buttonOpArmed = false;
      buttonNudgeDirty = false;
      buttonDrag = null;
      transformDrag = null;
      pendingMoveIds = {};
    }

    function undoButtonEdit() {
      if (!buttonHistory.past.length || !ExperienciaEngine.restoreSceneButtons) return false;
      var prev = buttonHistory.past.pop();
      var current = ExperienciaEngine.snapshotSceneButtons(state, prev.sceneId);
      if (current) buttonHistory.future.push(current);
      ExperienciaEngine.restoreSceneButtons(state, prev);
      clearButtonGestureState();
      return true;
    }

    function redoButtonEdit() {
      if (!buttonHistory.future.length || !ExperienciaEngine.restoreSceneButtons) return false;
      var next = buttonHistory.future.pop();
      var current = ExperienciaEngine.snapshotSceneButtons(state, next.sceneId);
      if (current) {
        buttonHistory.past.push(current);
        if (buttonHistory.past.length > buttonHistory.max) buttonHistory.past.shift();
      }
      ExperienciaEngine.restoreSceneButtons(state, next);
      clearButtonGestureState();
      return true;
    }

    function armButtonOp(sceneId) {
      if (buttonOpArmed) return;
      pushButtonHistory(sceneId);
      buttonOpArmed = true;
    }

    function endButtonOp() {
      buttonOpArmed = false;
    }
    var panning = null;
    var linkDrag = null;
    var marquee = null;
    var spacePan = false;
    var pendingCreate = null;
    var ctxMode = null; /* 'create' | 'node' | 'edge' | null */
    var marqueeEl = rootEl.querySelector('[data-exp-marquee]');
    var overlayMarqueeEl = rootEl.querySelector('[data-exp-overlay-marquee]');
    var OVERLAY_MARQUEE_THRESHOLD_PX = 3;
    var hoverCutEdgeId = null;
    var renameEdit = null; /* { nodeId, original, input } */

    function isFormField(el) {
      if (!el) return false;
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return !!(el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
    }

    function defaultNodeLabel(n) {
      if (!n) return 'Escena';
      if (n.kind === 'image') return 'Vista general';
      if (n.kind === 'video' || n.kind === 'animacion') return 'Animación';
      if (n.kind === 'plan' || n.kind === 'planta-3d') return 'Planta';
      if (n.kind === 'pano360') return '360°';
      return n.typeLabel || n.kind || 'Escena';
    }

    /** BOXIES confirm — never uses window.confirm (fullscreen-safe). */
    function boxiesConfirm(opts) {
      opts = opts || {};
      if (typeof AdminUI !== 'undefined' && typeof AdminUI.confirm === 'function') {
        return AdminUI.confirm({
          title: opts.title || 'Confirmar',
          message: opts.message || '',
          confirmLabel: opts.confirmLabel || 'Confirmar',
          cancelLabel: opts.cancelLabel || 'Cancelar'
        });
      }
      return new Promise(function (resolve) {
        if (!modalEl) { resolve(false); return; }
        modalEl.hidden = false;
        modalEl.innerHTML =
          '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
          '<div class="builder-exp-modal__panel" role="dialog">' +
            '<h3 class="builder-exp-modal__title">' + esc(opts.title || 'Confirmar') + '</h3>' +
            '<p class="builder-exp-modal__body">' + esc(opts.message || '') + '</p>' +
            '<div class="builder-exp-modal__actions">' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>' +
                esc(opts.cancelLabel || 'Cancelar') + '</button>' +
              '<button type="button" class="builder-header-action-btn is-danger" data-exp-modal-confirm>' +
                esc(opts.confirmLabel || 'Confirmar') + '</button>' +
            '</div>' +
          '</div>';
        function close(val) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          resolve(!!val);
        }
        modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
          btn.addEventListener('click', function () { close(false); });
        });
        var conf = modalEl.querySelector('[data-exp-modal-confirm]');
        if (conf) conf.addEventListener('click', function () { close(true); });
      });
    }

    /** BOXIES text prompt — never uses window.prompt. */
    function boxiesPrompt(opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        if (!modalEl) { resolve(null); return; }
        modalEl.hidden = false;
        modalEl.innerHTML =
          '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
          '<div class="builder-exp-modal__panel" role="dialog">' +
            '<h3 class="builder-exp-modal__title">' + esc(opts.title || 'Nombre') + '</h3>' +
            (opts.message
              ? ('<p class="builder-exp-modal__body">' + esc(opts.message) + '</p>')
              : '') +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<input type="text" data-exp-modal-input maxlength="120" value="' +
                esc(opts.defaultValue || '') + '">' +
            '</div>' +
            '<div class="builder-exp-modal__actions">' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cancelar</button>' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-primary" data-exp-modal-confirm>Aceptar</button>' +
            '</div>' +
          '</div>';
        var input = modalEl.querySelector('[data-exp-modal-input]');
        function close(val) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          resolve(val);
        }
        modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
          btn.addEventListener('click', function () { close(null); });
        });
        var conf = modalEl.querySelector('[data-exp-modal-confirm]');
        if (conf) {
          conf.addEventListener('click', function () {
            close(input ? String(input.value || '') : '');
          });
        }
        if (input) {
          setTimeout(function () { input.focus(); input.select(); }, 20);
          input.addEventListener('keydown', function (ev) {
            ev.stopPropagation();
            if (ev.key === 'Enter') {
              ev.preventDefault();
              close(String(input.value || ''));
            }
            if (ev.key === 'Escape') {
              ev.preventDefault();
              close(null);
            }
          });
        }
      });
    }

    function finishInlineRename(save) {
      if (!renameEdit) return;
      var nodeId = renameEdit.nodeId;
      var original = renameEdit.original;
      var input = renameEdit.input;
      var n = ExperienciaEngine.getNode(state, nodeId);
      var raw = input ? String(input.value || '').trim() : '';
      var next = save
        ? (raw || defaultNodeLabel(n) || original || 'Escena')
        : original;
      renameEdit = null;
      if (save && n && next && next !== original) {
        ExperienciaEngine.renameNode(state, nodeId, next);
        persist();
      }
      renderAll();
    }

    function startInlineRename(nodeId) {
      if (!nodeId || !nodesEl) return;
      var n = ExperienciaEngine.getNode(state, nodeId);
      if (!n) return;
      if (n.kind === 'hero') return;
      hideCtx();
      if (renameEdit) {
        renameEdit = null;
      }

      ExperienciaEngine.setSelection(state, [nodeId], []);
      canvas().selectedInteractionId = null;
      canvas().selectedInteractionSceneId = null;
      openPropertiesRail();
      paintNodes();
      paintEdges();
      paintInspector();
      syncInspectorChrome();

      var title = nodesEl.querySelector(
        '[data-exp-card-title="' + String(nodeId).replace(/"/g, '') + '"]'
      );
      if (!title) return;

      var original = n.label || defaultNodeLabel(n);
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'builder-exp-card__title-input';
      input.value = original;
      input.maxLength = 120;
      input.setAttribute('data-exp-rename-input', nodeId);
      input.setAttribute('aria-label', 'Nombre de la tarjeta');
      title.replaceWith(input);
      renameEdit = { nodeId: nodeId, original: original, input: input };

      function onKey(ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
          ev.preventDefault();
          finishInlineRename(true);
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          finishInlineRename(false);
        }
      }
      function onPointer(ev) { ev.stopPropagation(); }
      input.addEventListener('keydown', onKey);
      input.addEventListener('keyup', function (ev) { ev.stopPropagation(); });
      input.addEventListener('keypress', function (ev) { ev.stopPropagation(); });
      input.addEventListener('pointerdown', onPointer);
      input.addEventListener('mousedown', onPointer);
      input.addEventListener('click', onPointer);
      input.addEventListener('dblclick', onPointer);
      input.addEventListener('blur', function () {
        if (!renameEdit || renameEdit.nodeId !== nodeId) return;
        if (!input.isConnected) return; /* paintNodes detach — ignore */
        finishInlineRename(true);
      });

      setTimeout(function () {
        try { input.focus(); input.select(); } catch (eF) {}
      }, 0);
    }

    function reattachRenameInput() {
      if (!renameEdit || !renameEdit.nodeId || !nodesEl || !renameEdit.input) return;
      var title = nodesEl.querySelector(
        '[data-exp-card-title="' + String(renameEdit.nodeId).replace(/"/g, '') + '"]'
      );
      if (!title) return;
      title.replaceWith(renameEdit.input);
    }

    function selectedIds() {
      var c = canvas();
      if (Array.isArray(c.selectedIds) && c.selectedIds.length) return c.selectedIds.slice();
      return c.selectedId ? [c.selectedId] : [];
    }

    function selectedNodes() {
      return selectedIds().map(function (id) {
        return ExperienciaEngine.getNode(state, id);
      }).filter(Boolean);
    }

    function canvas() {
      return ExperienciaEngine.ensureState(state).canvas;
    }

    if (overlayMode && api.overlayNodeId) {
      canvas().selectedId = api.overlayNodeId;
      canvas().selectedIds = [api.overlayNodeId];
      if (api.editMode === 'hotspots' || api.editMode === 'buttons') {
        canvas().editMode = api.editMode;
      } else if (canvas().editMode !== 'buttons' && canvas().editMode !== 'hotspots') {
        canvas().editMode = 'buttons';
      }
    }

    function persist() {
      if (_shapeResizeTraceCtx && shapeResizeTraceEnabled()) {
        shapeResizeTrace('5b.model-after-persist()', {
          btnId: _shapeResizeTraceCtx.btnId,
          sceneId: _shapeResizeTraceCtx.sceneId,
          model: readShapeTraceModel(_shapeResizeTraceCtx.sceneId, _shapeResizeTraceCtx.btnId)
        });
        shapeTraceNum('5b.afterPersist.modelIx',
          readShapeTraceIxRaw(_shapeResizeTraceCtx.sceneId, _shapeResizeTraceCtx.btnId),
          'post-persist/onChange');
      }
      if (ExperienciaEngine.markExperienciaDirty) {
        ExperienciaEngine.markExperienciaDirty(state);
      }
      if (api.onChange) api.onChange();
      else if (api.saveState) api.saveState();
    }

    function readShapeTraceModel(sceneId, btnId) {
      if (!sceneId || !btnId) return null;
      var vm = getOverlayItemVm(sceneId, btnId);
      if (vm) return shapeModelFields(vm);
      var n = ExperienciaEngine.getNode(state, sceneId);
      var ix = n && ExperienciaEngine.getInteraction && ExperienciaEngine.getInteraction(n, btnId);
      return shapeModelFields(ix);
    }

    function readShapeTraceIxRaw(sceneId, btnId) {
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n || !ExperienciaEngine.getInteraction) return null;
      var ix = ExperienciaEngine.getInteraction(n, btnId);
      return ix ? shapeModelFields(ix) : null;
    }

    function notifyOverlaySelection() {
      if (!api.onSelectionChange) return;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.map(String)
        : [];
      if (!ids.length && canvas().selectedButtonId) {
        ids = [String(canvas().selectedButtonId)];
      }
      var hs = canvas().selectedHotspotId || null;
      try {
        api.onSelectionChange({
          buttonIds: ids,
          buttonId: canvas().selectedButtonId || null,
          hotspotId: hs,
          hasSelection: !!(ids.length || hs)
        });
      } catch (eSelNotify) { /* ignore */ }
    }

    function applyWorldTransform() {
      if (!world || !world.style) return;
      var c = canvas();
      if (!c) return;
      world.style.transform =
        'translate(' + c.panX + 'px,' + c.panY + 'px) scale(' + c.zoom + ')';
      world.style.transformOrigin = '0 0';
    }

    function clientToWorld(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var c = canvas();
      return {
        x: (clientX - rect.left - c.panX) / c.zoom,
        y: (clientY - rect.top - c.panY) / c.zoom
      };
    }

    /** Exact world anchor from the port circle DOM; fallback to math. */
    function resolvePortAnchor(n, portId, side) {
      var pid = portId || (side === 'in' ? 'in' : 'out');
      if (nodesEl && n && n.id != null) {
        var card = nodesEl.querySelector('[data-exp-node="' + String(n.id).replace(/"/g, '') + '"]');
        if (card) {
          var portEl = card.querySelector(
            '[data-exp-port="' + (side === 'in' ? 'in' : 'out') + '"][data-port-id="' +
            String(pid).replace(/"/g, '') + '"]'
          );
          if (!portEl && side === 'out') {
            portEl = card.querySelector('[data-exp-port="out"]');
          }
          if (!portEl && side === 'in') {
            portEl = card.querySelector('[data-exp-port="in"]');
          }
          if (portEl) {
            var zoom = canvas().zoom || 1;
            var cardRect = card.getBoundingClientRect();
            var portRect = portEl.getBoundingClientRect();
            var ox = (portRect.left + portRect.width / 2 - cardRect.left) / zoom;
            var oy = (portRect.top + portRect.height / 2 - cardRect.top) / zoom;
            return { x: (n.x || 0) + ox, y: (n.y || 0) + oy };
          }
        }
      }
      return portAnchorFallback(n, pid, side);
    }

    function paintNodes() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var ids = selectedIds();
      var idSet = {};
      ids.forEach(function (id) { idSet[id] = true; });
      nodesEl.innerHTML = nodes.map(function (n) {
        return nodeCardHtml(n, state);
      }).join('');
      nodesEl.querySelectorAll('[data-exp-node]').forEach(function (el) {
        var nid = el.getAttribute('data-exp-node');
        if (idSet[nid]) el.classList.add('is-selected');
      });
      if (renameEdit && renameEdit.nodeId) {
        reattachRenameInput();
      }
      if (linkDrag && linkDrag.portId && linkDrag.fromId) {
        var linkingPort = nodesEl.querySelector(
          '[data-exp-node="' + String(linkDrag.fromId).replace(/"/g, '') + '"] ' +
          '[data-exp-port="out"][data-port-id="' + String(linkDrag.portId).replace(/"/g, '') + '"]'
        );
        if (linkingPort) {
          linkingPort.classList.add('is-linking');
          var row = linkingPort.closest('[data-exp-irow]');
          if (row) row.classList.add('is-linking');
        }
      }
      syncToolUi();
    }

    function paintEdges() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      var all = state.experiencia.nodes || [];
      all.forEach(function (n) { if (!byId[n.id]) byId[n.id] = n; });

      var b = ExperienciaEngine.bounds(nodes);
      var pad = 80;
      var w = Math.max(1400, b.maxX - b.minX + pad * 2);
      var h = Math.max(900, b.maxY - b.minY + pad * 2);
      edgesEl.setAttribute('width', String(w));
      edgesEl.setAttribute('height', String(h));
      edgesEl.style.width = w + 'px';
      edgesEl.style.height = h + 'px';

      var selE = canvas().selectedEdgeId;
      var edgeSel = {};
      (canvas().selectedEdgeIds || []).forEach(function (id) { edgeSel[id] = true; });
      if (selE) edgeSel[selE] = true;

      var paths = (state.experiencia.edges || []).map(function (ed) {
        var a = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var b2 = byId[ed.targetNodeId || ed.to || ed.targetId];
        if (!a || !b2 || a.x == null || b2.x == null) return '';
        var srcPort = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
        var tgtPort = ed.targetPortId || ed.targetPort || 'in';
        var pOut = resolvePortAnchor(a, srcPort, 'out');
        var pIn = resolvePortAnchor(b2, tgtPort, 'in');
        var cls = 'builder-exp-edge-path' +
          (ed.manual ? ' is-manual' : '') +
          (ed.inlineAction ? ' is-inline' : '') +
          (edgeSel[ed.id] ? ' is-selected' : '') +
          (hoverCutEdgeId === ed.id ? ' is-cut-hover' : '');
        return '<path class="' + cls + '" data-exp-edge="' + esc(ed.id) + '"' +
          ' data-source-port="' + esc(srcPort) + '"' +
          ' d="' + bezierPath(pOut.x, pOut.y, pIn.x, pIn.y) + '" fill="none" />';
      }).join('');

      if (linkDrag && linkDrag.fromId) {
        var src = byId[linkDrag.fromId];
        if (src) {
          var a2 = resolvePortAnchor(src, linkDrag.portId || 'out', 'out');
          paths += '<path class="builder-exp-edge-path is-draft" d="' +
            bezierPath(a2.x, a2.y, linkDrag.x, linkDrag.y) + '" fill="none" />';
        }
      }
      edgesEl.innerHTML = paths;
    }

    function paintMinimap() {
      if (!minimapCanvas || !viewport || !canvas().minimapVisible) return;
      var ctx = minimapCanvas.getContext('2d');
      if (!ctx) return;
      var cw = minimapCanvas.width;
      var ch = minimapCanvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, cw, ch);
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var spanX = Math.max(1, b.maxX - b.minX);
      var spanY = Math.max(1, b.maxY - b.minY);
      var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
      var ox = (cw - spanX * scale) / 2;
      var oy = (ch - spanY * scale) / 2;
      nodes.forEach(function (n) {
        if (n.x == null) return;
        ctx.fillStyle = n.kind === 'hero'
          ? 'rgba(111,191,134,0.95)'
          : (n.status === 'ready'
            ? 'rgba(111,191,134,0.85)'
            : 'rgba(229,72,77,0.85)');
        var s = ExperienciaEngine.nodeSize(n);
        ctx.fillRect(ox + (n.x - b.minX) * scale, oy + (n.y - b.minY) * scale,
          Math.max(6, s.w * scale * 0.2), Math.max(4, s.h * scale * 0.15));
      });
      var c = canvas();
      var vr = viewport.getBoundingClientRect();
      var vx = (-c.panX / c.zoom - b.minX) * scale + ox;
      var vy = (-c.panY / c.zoom - b.minY) * scale + oy;
      var vw = (vr.width / c.zoom) * scale;
      var vh = (vr.height / c.zoom) * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw, vh);
    }

    function paintInspector() {
      if (overlayMode) {
        notifyOverlaySelection();
        /* V7.2.67 — Quotation Propiedades reset: never paint forms into the right rail. */
        return;
      }
      if (!inspectorBody) return;

      var ids = selectedIds();
      var editMode = canvas().editMode || 'flow';

      if (editMode === 'buttons') {
        var scene = ExperienciaEngine.getNode(state, canvas().selectedId);
        if (scene && ExperienciaEngine.isButtonsEditableNode &&
            ExperienciaEngine.isButtonsEditableNode(scene)) {
          inspectorBody.innerHTML = buttonsInspectorHtml(state, scene);
          bindButtonsInspectorActions();
          if (typeof WorkspaceSelect !== 'undefined' && WorkspaceSelect.enhance) {
            WorkspaceSelect.enhance(inspectorBody);
          }
          return;
        }
      }

      if (editMode === 'hotspots') {
        var hsScene = ExperienciaEngine.getNode(state, canvas().selectedId);
        if (hsScene && ExperienciaEngine.isHotspotsEditableNode &&
            ExperienciaEngine.isHotspotsEditableNode(hsScene)) {
          inspectorBody.innerHTML = hotspotsInspectorHtml(state, hsScene);
          bindHotspotsInspectorActions();
          return;
        }
      }

      if (editMode === 'prototype') {
        inspectorBody.innerHTML = prototypeInspectorHtml(state);
        bindPrototypeInspectorActions();
        return;
      }

      if (ids.length > 1) {
        inspectorBody.innerHTML =
          '<div class="builder-exp-inspector__kind">SELECCIÓN</div>' +
          '<h3 class="builder-exp-inspector__title">' + ids.length + ' nodos</h3>' +
          '<p class="builder-menu-hint">Duplicar, bloquear, desvincular o eliminar desde el menú contextual (clic derecho).</p>' +
          '<ul class="builder-exp-inspector__list">' +
            ids.map(function (id) {
              var n = ExperienciaEngine.getNode(state, id);
              return '<li>' + esc(n ? (n.label || n.id) : id) +
                (n && n.locked ? ' · bloqueado' : '') +
                (n && ExperienciaEngine.isProtectedNode(n) ? ' · protegido' : '') +
                '</li>';
            }).join('') +
          '</ul>';
        return;
      }
      inspectorBody.innerHTML = inspectorHtml(state, canvas().selectedId, canvas().selectedEdgeId);
      bindInspectorActions();
      if (typeof WorkspaceSelect !== 'undefined' && WorkspaceSelect.enhance) {
        WorkspaceSelect.enhance(inspectorBody);
      }
    }

    function bindButtonsInspectorActions() {
      if (!inspectorBody) return;
      var sceneId = canvas().selectedId;
      var spaceAxis = 'y';
      function layerSize() {
        return {
          w: (buttonsLayer && buttonsLayer.clientWidth) || 1000,
          h: (buttonsLayer && buttonsLayer.clientHeight) || 1000
        };
      }
      function selectedIds() {
        var ids = canvas().selectedButtonIds;
        if (!Array.isArray(ids) || !ids.length) {
          return canvas().selectedButtonId ? [canvas().selectedButtonId] : [];
        }
        return ids.slice();
      }
      function setButtonSelection(ids, primary) {
        var next = (ids || []).filter(Boolean).map(String);
        canvas().selectedButtonIds = next;
        canvas().selectedButtonId = primary
          ? String(primary)
          : (next.length ? next[next.length - 1] : null);
      }
      function patchBtn(patch, opts) {
        opts = opts || {};
        var id = canvas().selectedButtonId;
        if (!id) return;
        if (opts.history !== false) {
          if (opts.gesture) armButtonOp(sceneId);
          else {
            pushButtonHistory(sceneId);
            endButtonOp();
          }
        }
        ExperienciaEngine.updateSceneButton(state, sceneId, id, patch);
        paintButtonsStage();
        if (opts.inspector) paintInspector();
        if (opts.persist) {
          endButtonOp();
          persist();
        }
      }
      var addBtn = inspectorBody.querySelector('[data-exp-btn-add]');
      if (addBtn) {
        addBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var btn = ExperienciaEngine.addSceneButton(state, sceneId);
          if (btn) {
            setButtonSelection([btn.id], btn.id);
            renderAll(); persist();
          }
        });
      }
      var addText = inspectorBody.querySelector('[data-exp-text-add]');
      if (addText) {
        addText.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var tx = ExperienciaEngine.addSceneText(state, sceneId);
          if (tx) {
            setButtonSelection([tx.id], tx.id);
            renderAll(); persist();
          }
        });
      }
      var addShape = inspectorBody.querySelector('[data-exp-shape-add]');
      if (addShape) {
        addShape.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var sh = ExperienciaEngine.addSceneShape(
            state, sceneId, 'SHAPE_RECT', layerSize().w, layerSize().h
          );
          if (sh) {
            setButtonSelection([sh.id], sh.id);
            renderAll(); persist();
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-select]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var bid = el.getAttribute('data-exp-btn-select');
          var cur = selectedIds();
          if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
            var idx = cur.indexOf(String(bid));
            if (idx >= 0) cur.splice(idx, 1);
            else cur.push(String(bid));
            setButtonSelection(cur, bid);
          } else {
            setButtonSelection([bid], bid);
          }
          renderAll();
        });
      });
      var labelEl = inspectorBody.querySelector('[data-exp-btn-label]');
      if (labelEl) {
        labelEl.addEventListener('input', function () {
          patchBtn({ label: labelEl.value }, { gesture: true });
        });
        labelEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var targetEl = inspectorBody.querySelector('[data-exp-btn-target]');
      if (targetEl) {
        targetEl.addEventListener('change', function () {
          patchBtn({ targetNodeId: targetEl.value || null }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-style]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          patchBtn({ style: el.getAttribute('data-exp-btn-style') }, { inspector: true, persist: true });
        });
      });
      var iconEl = inspectorBody.querySelector('[data-exp-btn-icon]');
      if (iconEl) {
        iconEl.addEventListener('change', function () {
          patchBtn({ icon: iconEl.value }, { persist: true });
        });
      }
      function bindColor(sel, key) {
        var el = inspectorBody.querySelector(sel);
        if (!el) return;
        var live = null;
        el.addEventListener('input', function () {
          var col = String(el.value || '').trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(col)) return;
          live = col.toLowerCase();
          var p = {};
          p[key] = col;
          patchBtn(p, { gesture: true });
        });
        el.addEventListener('change', function () {
          endButtonOp();
          var col = String(el.value || '').trim().toLowerCase();
          if (live && col === '#ffffff' && live !== '#ffffff') {
            col = live;
            el.value = col;
          }
          if (!/^#[0-9a-fA-F]{6}$/.test(col)) return;
          var p = {};
          p[key] = col;
          patchBtn(p, { persist: true });
          live = null;
        });
      }
      bindColor('[data-exp-btn-bg-color]', 'bgColor');
      bindColor('[data-exp-btn-text-color]', 'textColor');
      bindColor('[data-exp-btn-border-color]', 'borderColor');
      bindColor('[data-exp-btn-hover-color]', 'hoverColor');
      bindColor('[data-exp-btn-hover-text]', 'hoverTextColor');
      bindColor('[data-exp-btn-pressed-color]', 'pressedColor');
      bindColor('[data-exp-btn-pressed-text]', 'pressedTextColor');
      var bgOpEl = inspectorBody.querySelector('[data-exp-btn-bg-opacity]');
      if (bgOpEl) {
        bgOpEl.addEventListener('input', function () {
          patchBtn({ bgOpacity: bgOpEl.value }, { gesture: true });
        });
        bgOpEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var bwEl = inspectorBody.querySelector('[data-exp-btn-border-width]');
      if (bwEl) {
        bwEl.addEventListener('change', function () {
          patchBtn({ borderWidth: bwEl.value }, { persist: true });
        });
      }
      var brEl = inspectorBody.querySelector('[data-exp-btn-radius]');
      if (brEl) {
        brEl.addEventListener('change', function () {
          patchBtn({ borderRadius: brEl.value }, { persist: true });
        });
      }
      var lockEl = inspectorBody.querySelector('[data-exp-btn-locked]');
      if (lockEl) {
        lockEl.addEventListener('change', function () {
          patchBtn({ locked: !!lockEl.checked }, { persist: true });
        });
      }
      var opEl = inspectorBody.querySelector('[data-exp-btn-opacity]');
      if (opEl) {
        opEl.addEventListener('input', function () {
          patchBtn({ opacity: opEl.value }, { gesture: true });
        });
        opEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var hoverEn = inspectorBody.querySelector('[data-exp-btn-hover-enabled]');
      if (hoverEn) {
        hoverEn.addEventListener('change', function () {
          patchBtn({ hoverEnabled: !!hoverEn.checked }, { inspector: true, persist: true });
        });
      }
      var hoverMs = inspectorBody.querySelector('[data-exp-btn-hover-ms]');
      if (hoverMs) {
        hoverMs.addEventListener('change', function () {
          patchBtn({ hoverTransition: hoverMs.value }, { persist: true });
        });
      }

      var textContent = inspectorBody.querySelector('[data-exp-text-content]');
      if (textContent) {
        textContent.addEventListener('input', function () {
          patchBtn({ label: textContent.value }, { gesture: true });
        });
        textContent.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var textFont = inspectorBody.querySelector('[data-exp-text-font]');
      if (textFont) {
        textFont.addEventListener('change', function () {
          patchBtn({ fontFamily: textFont.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-text-size-chip]').forEach(function (chip) {
        chip.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchBtn({
            fontSize: Number(chip.getAttribute('data-exp-text-size-chip')) || 28,
            fontSizeUnit: 'px'
          }, { inspector: true, persist: true });
        });
      });
      var textColor = inspectorBody.querySelector('[data-exp-text-color]');
      if (textColor) {
        textColor.addEventListener('input', function () {
          patchBtn({ color: textColor.value }, { gesture: true });
        });
        textColor.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-text-align]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchBtn({ textAlign: el.getAttribute('data-exp-text-align') }, { inspector: true, persist: true });
        });
      });
      var boldBtn = inspectorBody.querySelector('[data-exp-text-bold]');
      if (boldBtn) {
        boldBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var id = canvas().selectedButtonId;
          var b = ExperienciaEngine.getSceneButton(state,
            ExperienciaEngine.getNode(state, sceneId), id);
          var on = b && (String(b.fontWeight) === '700' || b.fontWeight === 'bold');
          patchBtn({ fontWeight: on ? '400' : '700' }, { inspector: true, persist: true });
        });
      }
      var textOp = inspectorBody.querySelector('[data-exp-text-opacity]');
      if (textOp) {
        textOp.addEventListener('input', function () {
          patchBtn({ opacity: textOp.value }, { gesture: true });
        });
        textOp.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var shapeW = inspectorBody.querySelector('[data-exp-shape-w]');
      if (shapeW) {
        shapeW.addEventListener('change', function () {
          patchBtn({ width: shapeW.value }, { persist: true });
        });
      }
      var shapeH = inspectorBody.querySelector('[data-exp-shape-h]');
      if (shapeH) {
        shapeH.addEventListener('change', function () {
          patchBtn({ height: shapeH.value }, { persist: true });
        });
      }
      var shapeFill = inspectorBody.querySelector('[data-exp-shape-fill]');
      if (shapeFill) {
        shapeFill.addEventListener('change', function () {
          patchBtn({ fill: shapeFill.value }, { persist: true });
        });
      }
      var shapeStroke = inspectorBody.querySelector('[data-exp-shape-stroke]');
      if (shapeStroke) {
        shapeStroke.addEventListener('change', function () {
          patchBtn({ stroke: shapeStroke.value }, { persist: true });
        });
      }
      var shapeSw = inspectorBody.querySelector('[data-exp-shape-sw]');
      if (shapeSw) {
        shapeSw.addEventListener('change', function () {
          patchBtn({ strokeWidth: shapeSw.value }, { persist: true });
        });
      }
      var shapeR = inspectorBody.querySelector('[data-exp-shape-radius]');
      if (shapeR) {
        shapeR.addEventListener('change', function () {
          patchBtn({ borderRadius: shapeR.value }, { persist: true });
        });
      }
      var visEl = inspectorBody.querySelector('[data-exp-btn-visible]');
      if (visEl) {
        visEl.addEventListener('change', function () {
          patchBtn({ visible: !!visEl.checked }, { persist: true });
        });
      }
      var rotEl = inspectorBody.querySelector('[data-exp-btn-rotation]');
      var rotNum = inspectorBody.querySelector('[data-exp-btn-rotation-num]');
      function syncRotation(deg, from) {
        deg = Math.max(-360, Math.min(360, Number(deg) || 0));
        if (rotEl && from !== 'range') rotEl.value = String(deg);
        if (rotNum && from !== 'num') rotNum.value = String(deg);
        patchBtn({ rotation: deg }, { gesture: true });
      }
      if (rotEl) {
        rotEl.addEventListener('input', function () {
          syncRotation(rotEl.value, 'range');
        });
        rotEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      if (rotNum) {
        rotNum.addEventListener('input', function () {
          syncRotation(rotNum.value, 'num');
        });
        rotNum.addEventListener('change', function () {
          syncRotation(rotNum.value, 'num');
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-pos-mode]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var mode = el.getAttribute('data-exp-btn-pos-mode');
          if (!mode) return;
          patchBtn({ positionMode: mode }, { inspector: true, persist: true });
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-anchor]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var key = el.getAttribute('data-exp-btn-anchor');
          if (!key) return;
          patchBtn({
            anchor: key,
            positionMode: 'anchor'
          }, { inspector: true, persist: true });
        });
      });
      var mxEl = inspectorBody.querySelector('[data-exp-btn-margin-x]');
      if (mxEl) {
        mxEl.addEventListener('input', function () {
          patchBtn({ marginX: mxEl.value, keepAnchor: true }, { gesture: true });
        });
        mxEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var myEl = inspectorBody.querySelector('[data-exp-btn-margin-y]');
      if (myEl) {
        myEl.addEventListener('input', function () {
          patchBtn({ marginY: myEl.value, keepAnchor: true }, { gesture: true });
        });
        myEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-align]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          pushButtonHistory(sceneId);
          ExperienciaEngine.alignSceneButtons(
            state, sceneId, selectedIds(), el.getAttribute('data-exp-btn-align'), size.w, size.h
          );
          selectedIds().forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-distribute]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          var mode = el.getAttribute('data-exp-btn-distribute');
          var ids = selectedIds();
          pushButtonHistory(sceneId);
          if (mode === 'uniform') {
            var items = ids.map(function (id) {
              return ExperienciaEngine.getSceneButton(state,
                ExperienciaEngine.getNode(state, sceneId), id);
            }).filter(Boolean);
            var spanX = 0;
            var spanY = 0;
            if (items.length >= 2) {
              var xs = items.map(function (b) { return b.x; });
              var ys = items.map(function (b) { return b.y; });
              spanX = Math.max.apply(null, xs) - Math.min.apply(null, xs);
              spanY = Math.max.apply(null, ys) - Math.min.apply(null, ys);
            }
            ExperienciaEngine.distributeSceneButtons(
              state, sceneId, ids, spanX >= spanY ? 'x' : 'y', size.w, size.h
            );
          } else {
            ExperienciaEngine.distributeSceneButtons(
              state, sceneId, ids, mode, size.w, size.h
            );
          }
          ids.forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-space-axis]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          spaceAxis = el.getAttribute('data-exp-btn-space-axis') === 'x' ? 'x' : 'y';
          inspectorBody.querySelectorAll('[data-exp-btn-space-axis]').forEach(function (btn) {
            btn.classList.toggle('is-active',
              btn.getAttribute('data-exp-btn-space-axis') === spaceAxis);
          });
        });
      });
      var spaceApply = inspectorBody.querySelector('[data-exp-btn-space-apply]');
      if (spaceApply) {
        spaceApply.addEventListener('click', function (ev) {
          ev.preventDefault();
          var gapEl = inspectorBody.querySelector('[data-exp-btn-gap]');
          var gap = gapEl ? Number(gapEl.value) : 24;
          var size = layerSize();
          var ids = selectedIds();
          pushButtonHistory(sceneId);
          ExperienciaEngine.spaceSceneButtons(
            state, sceneId, ids, gap, spaceAxis, size.w, size.h
          );
          ids.forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      }
      var mirrorBtn = inspectorBody.querySelector('[data-exp-btn-mirror]');
      if (mirrorBtn) {
        mirrorBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var mid = mirrorBtn.getAttribute('data-exp-btn-mirror');
          ExperienciaEngine.mirrorSceneButton(state, sceneId, mid);
          clearPendingMove(mid);
          renderAll(); persist();
        });
      }
      var dupBtn = inspectorBody.querySelector('[data-exp-btn-duplicate]');
      if (dupBtn) {
        dupBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          pushButtonHistory(sceneId);
          var copy = ExperienciaEngine.duplicateSceneButton(state, sceneId,
            dupBtn.getAttribute('data-exp-btn-duplicate'),
            { imageW: size.w, imageH: size.h });
          if (copy) setButtonSelection([copy.id], copy.id);
          renderAll(); persist();
        });
      }
      var delBtn = inspectorBody.querySelector('[data-exp-btn-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var bid = delBtn.getAttribute('data-exp-btn-delete');
          if (!bid) return;
          pushButtonHistory(sceneId);
          /* Safe delete: BUTTON interaction only — never the scene node */
          ExperienciaEngine.removeSceneButton(state, sceneId, bid);
          var left = selectedIds().filter(function (id) {
            return String(id) !== String(bid);
          });
          setButtonSelection(left, left[0] || null);
          renderAll(); persist();
        });
      }
    }

    function bindHotspotsInspectorActions() {
      if (!inspectorBody) return;
      var sceneId = canvas().selectedId;
      function patchHs(patch, opts) {
        opts = opts || {};
        var id = canvas().selectedHotspotId;
        if (!id) return;
        ExperienciaEngine.updateSceneHotspotMask(state, sceneId, id, patch);
        paintHotspotsStage();
        if (opts.inspector) paintInspector();
        if (opts.persist) persist();
      }
      var addBtn = inspectorBody.querySelector('[data-exp-hs-add]');
      if (addBtn) {
        addBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          hotspotDraw = { points: [], cursor: null };
          canvas().selectedHotspotId = null;
          paintHotspotsStage();
          paintInspector();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info('Dibujo: clic para vértices · doble clic para cerrar · Esc cancela');
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-select]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          hotspotDraw = null;
          canvas().selectedHotspotId = el.getAttribute('data-exp-hs-select');
          paintHotspotsStage();
          paintInspector();
        });
      });
      var nameEl = inspectorBody.querySelector('[data-exp-hs-name]');
      if (nameEl) {
        nameEl.addEventListener('change', function () {
          patchHs({ name: nameEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-kind]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchHs({ hotspotKind: el.getAttribute('data-exp-hs-kind') }, {
            inspector: true, persist: true
          });
        });
      });
      var colorEl = inspectorBody.querySelector('[data-exp-hs-color]');
      if (colorEl) {
        colorEl.addEventListener('input', function () {
          patchHs({ color: colorEl.value });
        });
        colorEl.addEventListener('change', function () {
          patchHs({ color: colorEl.value }, { persist: true });
        });
      }
      var opacityEl = inspectorBody.querySelector('[data-exp-hs-opacity]');
      if (opacityEl) {
        opacityEl.addEventListener('input', function () {
          patchHs({ opacity: Number(opacityEl.value) / 100 });
        });
        opacityEl.addEventListener('change', function () {
          patchHs({ opacity: Number(opacityEl.value) / 100 }, {
            inspector: true, persist: true
          });
        });
      }
      var borderEl = inspectorBody.querySelector('[data-exp-hs-border]');
      if (borderEl) {
        borderEl.addEventListener('change', function () {
          patchHs({ borderWidth: borderEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-anim]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchHs({ animation: el.getAttribute('data-exp-hs-anim') }, {
            inspector: true, persist: true
          });
        });
      });
      var visEl = inspectorBody.querySelector('[data-exp-hs-visible]');
      if (visEl) {
        visEl.addEventListener('change', function () {
          patchHs({ visible: !!visEl.checked }, { persist: true });
        });
      }

      function setPickerPath(path) {
        canvas().hotspotPickerPath = path || [];
        paintInspector();
      }

      /* V6.5.00 — content mode + structure picker */
      inspectorBody.querySelectorAll('[data-exp-hs-content]').forEach(function (el) {
        el.addEventListener('change', function () {
          if (!el.checked) return;
          canvas().hotspotPickerPath = null;
          patchHs({ contentMode: el.getAttribute('data-exp-hs-content') }, {
            inspector: true, persist: true
          });
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-reselect]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          setPickerPath([{
            type: 'project',
            id: 'project',
            label: (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.projectName)
              ? EstructuraEntity.projectName(state)
              : 'Proyecto'
          }]);
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-crumb]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var idx = Number(el.getAttribute('data-exp-hs-crumb'));
          var path = Array.isArray(canvas().hotspotPickerPath)
            ? canvas().hotspotPickerPath.slice()
            : [];
          if (!path.length && typeof EstructuraEntity !== 'undefined') {
            path = [{
              type: 'project',
              id: 'project',
              label: EstructuraEntity.projectName(state)
            }];
          }
          setPickerPath(path.slice(0, idx + 1));
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-pick-type]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (ev.target && ev.target.classList &&
              ev.target.classList.contains('builder-exp-hs-picker__link')) {
            return;
          }
          var type = el.getAttribute('data-exp-hs-pick-type');
          var id = el.getAttribute('data-exp-hs-pick-id');
          var label = el.getAttribute('data-exp-hs-pick-label') || id;
          var path = Array.isArray(canvas().hotspotPickerPath)
            ? canvas().hotspotPickerPath.slice()
            : [];
          if (!path.length) {
            path = [{
              type: 'project',
              id: 'project',
              label: (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.projectName)
                ? EstructuraEntity.projectName(state)
                : 'Proyecto'
            }];
          }
          path.push({ type: type, id: id, label: label });
          setPickerPath(path);
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-link-id]').forEach(function (el) {
        var linkBtn = el.querySelector('.builder-exp-hs-picker__link');
        if (!linkBtn) return;
        linkBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var linkType = el.getAttribute('data-exp-hs-link-type');
          var linkId = el.getAttribute('data-exp-hs-link-id');
          if (!linkType || !linkId) return;
          patchHs({
            contentMode: 'structure',
            entityId: linkId,
            entityType: linkType
          }, { inspector: true, persist: true });
          var resolved = (typeof EstructuraEntity !== 'undefined')
            ? EstructuraEntity.resolve(state, linkId, linkType)
            : null;
          if (resolved && resolved.ok && resolved.label) {
            patchHs({ name: resolved.label }, { persist: true });
          }
          canvas().hotspotPickerPath = null;
          paintInspector();
        });
      });
      var tplEl = inspectorBody.querySelector('[data-exp-hs-template]');
      if (tplEl) {
        tplEl.addEventListener('change', function () {
          patchHs({ cardTemplate: tplEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-field]').forEach(function (el) {
        el.addEventListener('change', function () {
          var key = el.getAttribute('data-exp-hs-field');
          var patch = { cardFields: {} };
          patch.cardFields[key] = !!el.checked;
          patchHs(patch, { persist: true });
        });
      });

      var dupBtn = inspectorBody.querySelector('[data-exp-hs-duplicate]');
      if (dupBtn) {
        dupBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var copy = ExperienciaEngine.duplicateSceneHotspotMask(state, sceneId,
            dupBtn.getAttribute('data-exp-hs-duplicate'));
          if (copy) {
            canvas().selectedHotspotId = copy.id;
            canvas().hotspotPickerPath = null;
          }
          renderAll(); persist();
        });
      }
      var delBtn = inspectorBody.querySelector('[data-exp-hs-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ExperienciaEngine.removeSceneHotspotMask(state, sceneId,
            delBtn.getAttribute('data-exp-hs-delete'));
          canvas().selectedHotspotId = null;
          canvas().hotspotPickerPath = null;
          renderAll(); persist();
        });
      }
    }

    function buildLiveRuntimeFromState() {
      if (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.serialize) {
        try {
          return RuntimeSerializer.serialize(state, {
            generatedAt: new Date().toISOString()
          });
        } catch (eSer) {}
      }
      ExperienciaEngine.ensureFlow(state);
      var exp = state.experiencia || {};
      var nodes = (ExperienciaEngine.visibleNodes
        ? ExperienciaEngine.visibleNodes(state)
        : (exp.nodes || [])).filter(function (n) {
        return n && n.kind !== 'action';
      });
      var hero = nodes.find(function (n) {
        return n && (n.kind === 'hero' || n.id === 'exp-hero');
      });
      return {
        nodes: nodes,
        connections: exp.edges || [],
        entryNodeId: hero ? hero.id : (nodes[0] && nodes[0].id) || null
      };
    }

    function ensurePrototypePlayer() {
      if (!protoHost) return null;
      var mountFn = (typeof PrototypeView !== 'undefined' && PrototypeView.mount)
        ? PrototypeView.mount
        : (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.mountPrototypeView)
          ? ExperienciaPrototype.mountPrototypeView
          : null;
      if (!mountFn) return null;
      var runtime = buildLiveRuntimeFromState();
      if (!protoRuntimePlayer) {
        protoRuntimePlayer = mountFn(protoHost, {
          runtime: runtime,
          state: state,
          startLabel: '▶ Ver Prototipo'
        });
      } else {
        if (protoRuntimePlayer.setRuntime) protoRuntimePlayer.setRuntime(runtime);
        if (protoRuntimePlayer.setState) protoRuntimePlayer.setState(state);
      }
      return protoRuntimePlayer;
    }

    function syncPrototypeStoryboard() {
      var fp = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.fingerprint)
        ? ExperienciaPrototype.fingerprint(state)
        : String(Date.now());
      var player = ensurePrototypePlayer();
      if (!player) return;
      if (fp !== protoFingerprint) {
        protoFingerprint = fp;
        var runtime = buildLiveRuntimeFromState();
        if (player.setRuntime) player.setRuntime(runtime);
        if (player.setState) player.setState(state);
        if (!player._running && player.showGate) player.showGate();
      }
      if (player.resize) player.resize();
    }

    function bindPrototypeInspectorActions() {
      if (!inspectorBody) return;
      syncPrototypeStoryboard();
      var playBtn = inspectorBody.querySelector('[data-exp-proto-play]');
      if (playBtn) {
        playBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var player = ensurePrototypePlayer();
          if (!player) return;
          protoFingerprint = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.fingerprint)
            ? ExperienciaPrototype.fingerprint(state)
            : protoFingerprint;
          var runtime = buildLiveRuntimeFromState();
          if (player.setRuntime) player.setRuntime(runtime);
          if (player.setState) player.setState(state);
          if (player.begin) player.begin();
        });
      }
    }

    function bindInspectorActions() {
      if (!inspectorBody || !inspectorBody.querySelector) return;
      var del = inspectorBody.querySelector('[data-exp-del-edge]');
      if (del) {
        del.addEventListener('click', function () {
          ExperienciaEngine.removeEdge(state, del.getAttribute('data-exp-del-edge'));
          renderAll(); persist();
        });
      }
      var hs = inspectorBody.querySelector('[data-exp-add-hotspot]');
      if (hs) {
        hs.addEventListener('click', function () {
          var id = hs.getAttribute('data-exp-add-hotspot');
          boxiesPrompt({
            title: 'Nuevo hotspot',
            message: 'Nombre del hotspot',
            defaultValue: 'Torre 1'
          }).then(function (label) {
            if (label == null) return;
            ExperienciaEngine.addHotspotToScene(state, id, String(label).trim() || 'Hotspot');
            renderAll(); persist();
          });
        });
      }
      var ctrl = inspectorBody.querySelector('[data-exp-add-control]');
      if (ctrl) {
        ctrl.addEventListener('click', function () {
          var id = ctrl.getAttribute('data-exp-add-control');
          boxiesPrompt({
            title: 'Nuevo control',
            message: 'Nombre del control',
            defaultValue: 'Plantas'
          }).then(function (label) {
            if (label == null) return;
            var name = String(label).trim() || 'Control';
            var isPlantas = /planta/i.test(name);
            ExperienciaEngine.addControlToScene(state, id, name, {
              type: isPlantas ? 'SELECTOR' : 'BUTTON',
              actionType: isPlantas ? 'floor-selector' : null,
              behavior: isPlantas
                ? { type: 'floor-selector', inline: true, source: 'estructura' }
                : null
            });
            renderAll(); persist();
          });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-add-element]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var sid = btn.getAttribute('data-exp-add-element');
          var rect = btn.getBoundingClientRect();
          openAddElementMenu(sid, { x: rect.left, y: rect.bottom + 4 });
        });
      });
      var clearIx = inspectorBody.querySelector('[data-exp-clear-ix-sel]');
      if (clearIx) {
        clearIx.addEventListener('click', function () {
          canvas().selectedInteractionId = null;
          canvas().selectedInteractionSceneId = null;
          renderAll(); persist();
        });
      }
      var assignBtn = inspectorBody.querySelector('[data-exp-asset-assign]');
      if (assignBtn) {
        assignBtn.addEventListener('click', function () {
          var nid = assignBtn.getAttribute('data-exp-asset-assign');
          var input = inspectorBody.querySelector('[data-exp-asset-filename]');
          var fname = input ? String(input.value || '').trim() : '';
          if (!fname) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Indica un nombre de archivo.');
            return;
          }
          ExperienciaEngine.assignAssetToNode(state, nid, {
            filename: fname,
            provider: 'local',
            status: 'synced'
          });
          renderAll(); persist();
        });
      }
      var clearAsset = inspectorBody.querySelector('[data-exp-asset-clear]');
      if (clearAsset) {
        clearAsset.addEventListener('click', function () {
          ExperienciaEngine.clearNodeAsset(state, clearAsset.getAttribute('data-exp-asset-clear'));
          renderAll(); persist();
        });
      }
      var assetPick = inspectorBody.querySelector('[data-exp-asset-pick]');
      if (assetPick) {
        assetPick.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var val = assetPick.value;
          if (!val) {
            ExperienciaEngine.clearNodeAsset(state, nid);
          } else {
            var asset = ExperienciaEngine.getAsset(state, val);
            ExperienciaEngine.assignAssetToNode(state, nid, asset || { id: val });
          }
          renderAll(); persist();
        });
      }
      var hubEn = inspectorBody.querySelector('[data-exp-hub-enabled]');
      if (hubEn) {
        hubEn.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var node = ExperienciaEngine.getNode(state, nid);
          if (!node) return;
          if (hubEn.checked) {
            ExperienciaEngine.enableHubOnScene(node);
            if (ExperienciaEngine.syncHubSmartSelector) {
              ExperienciaEngine.syncHubSmartSelector(state, node);
            }
            canvas().selectedInteractionId = null;
            canvas().selectedInteractionSceneId = null;
          } else {
            var hubOff = ExperienciaEngine.ensureHubConfig(node);
            hubOff.enabled = false;
          }
          renderAll(); persist();
        });
      }

      function bindHubChoiceGroup(attr, apply) {
        var wrap = inspectorBody.querySelector('[' + attr + ']');
        if (!wrap) return;
        wrap.querySelectorAll('[data-value]').forEach(function (btn) {
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            if (btn.disabled || btn.classList.contains('is-disabled')) return;
            apply(btn.getAttribute('data-value'));
            renderAll(); persist();
          });
        });
      }

      bindHubChoiceGroup('data-exp-hub-selector-type', function (val) {
        if (ExperienciaEngine.setHubSelectorType) {
          ExperienciaEngine.setHubSelectorType(state, canvas().selectedId, val);
        }
      });
      bindHubChoiceGroup('data-exp-hub-style', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { style: val });
        }
      });
      bindHubChoiceGroup('data-exp-hub-position', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { position: val });
        }
      });
      bindHubChoiceGroup('data-exp-hub-align', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { alignment: val });
        }
      });

      inspectorBody.querySelectorAll('[data-exp-hub-plant-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var pid = btn.getAttribute('data-exp-hub-plant-toggle');
          if (!pid || !ExperienciaEngine.setHubPlantSelected) return;
          var hubNow = ExperienciaEngine.ensureHubConfig(
            ExperienciaEngine.getNode(state, canvas().selectedId)
          );
          var selected = (hubNow && hubNow.selectedPlants) || [];
          var isOn = selected.some(function (id) { return String(id) === String(pid); });
          ExperienciaEngine.setHubPlantSelected(state, canvas().selectedId, pid, !isOn);
          renderAll(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-plant-up]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var pid = btn.getAttribute('data-exp-hub-plant-up');
          if (pid && ExperienciaEngine.moveHubPlant) {
            ExperienciaEngine.moveHubPlant(state, canvas().selectedId, pid, 'up');
            renderAll(); persist();
          }
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-plant-down]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var pid = btn.getAttribute('data-exp-hub-plant-down');
          if (pid && ExperienciaEngine.moveHubPlant) {
            ExperienciaEngine.moveHubPlant(state, canvas().selectedId, pid, 'down');
            renderAll(); persist();
          }
        });
      });

      var gapEl = inspectorBody.querySelector('[data-exp-hub-gap]');
      if (gapEl) {
        gapEl.addEventListener('input', function () {
          var valEl = inspectorBody.querySelector('[data-exp-hub-gap-val]');
          if (valEl) valEl.textContent = gapEl.value + ' px';
          var preview = inspectorBody.querySelector('.builder-hub-preview');
          if (preview) preview.style.setProperty('--hub-gap', gapEl.value + 'px');
        });
        gapEl.addEventListener('change', function () {
          if (ExperienciaEngine.setHubAppearance) {
            ExperienciaEngine.setHubAppearance(state, canvas().selectedId, {
              gap: Number(gapEl.value)
            });
          }
          persist();
        });
      }
      var sizeEl = inspectorBody.querySelector('[data-exp-hub-size]');
      if (sizeEl) {
        sizeEl.addEventListener('input', function () {
          var valEl = inspectorBody.querySelector('[data-exp-hub-size-val]');
          if (valEl) valEl.textContent = sizeEl.value + ' px';
          var preview = inspectorBody.querySelector('.builder-hub-preview');
          if (preview) preview.style.setProperty('--hub-size', sizeEl.value + 'px');
        });
        sizeEl.addEventListener('change', function () {
          if (ExperienciaEngine.setHubAppearance) {
            ExperienciaEngine.setHubAppearance(state, canvas().selectedId, {
              size: Number(sizeEl.value)
            });
          }
          persist();
        });
      }

      /* Legacy HUB structure controls (kept if present for old markup) */
      var hubScope = inspectorBody.querySelector('[data-exp-hub-scope]');
      if (hubScope) {
        hubScope.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var val = hubScope.value;
          if (!val) {
            ExperienciaEngine.setHubStructureScope(state, nid, null);
            renderAll(); persist();
            return;
          }
          var opts = ExperienciaEngine.listHubScopeOptions(state) || [];
          var found = null;
          for (var si = 0; si < opts.length; si++) {
            if (String(opts[si].id) === String(val)) { found = opts[si]; break; }
          }
          ExperienciaEngine.setHubStructureScope(state, nid, found);
          renderAll(); persist();
        });
      }
      var hubFloor = inspectorBody.querySelector('[data-exp-hub-floor]');
      if (hubFloor) {
        hubFloor.addEventListener('change', function () {
          ExperienciaEngine.setHubActiveFloor(state, canvas().selectedId, hubFloor.value);
          renderAll(); persist();
        });
      }
      var hubMode = inspectorBody.querySelector('[data-exp-hub-mode]');
      if (hubMode) {
        hubMode.addEventListener('change', function () {
          ExperienciaEngine.setHubVisualMode(state, canvas().selectedId, hubMode.value);
          renderAll(); persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hub-floor-a2d]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var key = sel.getAttribute('data-exp-hub-floor-a2d');
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            asset2dId: sel.value || null
          });
          persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-floor-a3d]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var key = sel.getAttribute('data-exp-hub-floor-a3d');
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            asset3dId: sel.value || null
          });
          persist();
        });
      });
      var hubAutobind = inspectorBody.querySelector('[data-exp-hub-autobind]');
      if (hubAutobind) {
        hubAutobind.addEventListener('click', function () {
          ExperienciaEngine.autoBindHubMediaAssets(state, canvas().selectedId);
          if (typeof AdminNotify !== 'undefined') AdminNotify.success('Recursos Media vinculados a plantas.');
          renderAll(); persist();
        });
      }
      var hubAutogen = inspectorBody.querySelector('[data-exp-hub-autogen]');
      if (hubAutogen) {
        hubAutogen.addEventListener('click', function () {
          var nid = canvas().selectedId;
          var node = ExperienciaEngine.getNode(state, nid);
          var hub = node && node.config && node.config.hub;
          var scope = hub && hub.structureScope;
          if (!scope) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Elige un ámbito tipología primero.');
            return;
          }
          var floors = ExperienciaEngine.listFloorsForScope(state, scope) || [];
          if (!floors.length) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('No hay plantas en Estructura.');
            return;
          }
          if (!window.confirm('¿Crear estructura HUB con ' + floors.length + ' planta(s)?')) return;
          var gen = ExperienciaEngine.generateHubStructure(state, {
            scope: scope,
            at: node ? { x: (node.x || 280) + 40, y: (node.y || 140) + 40 } : null
          });
          if (gen && gen.error) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.error(gen.error);
          } else if (typeof AdminNotify !== 'undefined') {
            AdminNotify.success('Estructura HUB creada · ' + floors.length + ' planta(s).');
          }
          renderAll(); persist();
        });
      }
      var floorTip = inspectorBody.querySelector('[data-exp-ix-floor-tip]');
      if (floorTip) {
        floorTip.addEventListener('change', function () {
          var ixId = state.experiencia && state.experiencia.canvas
            ? state.experiencia.canvas.selectedInteractionId
            : null;
          var sceneId = canvas().selectedId;
          if (!ixId || !sceneId) return;
          var tipId = floorTip.value;
          ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
            structureId: tipId ? ('tip:' + tipId) : null,
            structureKind: tipId ? 'tipologia' : null,
            behavior: Object.assign({}, (function () {
              var ix = ExperienciaEngine.getInteraction(state, sceneId, ixId);
              return (ix && ix.behavior) || { type: 'floor-selector', source: 'estructura' };
            })(), {
              tipologiaId: tipId || null,
              source: 'estructura',
              controls: 'activeFloor'
            })
          });
          /* Also sync scene HUB scope */
          var tipScope = null;
          if (tipId) {
            var opts = ExperienciaEngine.listHubScopeOptions(state) || [];
            for (var i = 0; i < opts.length; i++) {
              if (String(opts[i].tipologiaId) === String(tipId) || String(opts[i].id) === ('tip:' + tipId)) {
                tipScope = opts[i];
                break;
              }
            }
          }
          if (tipScope) ExperienciaEngine.setHubStructureScope(state, sceneId, tipScope);
          renderAll(); persist();
        });
      }
      function syncFloorSelBehavior() {
        var ixId = state.experiencia && state.experiencia.canvas
          ? state.experiencia.canvas.selectedInteractionId
          : null;
        var sceneId = canvas().selectedId;
        if (!ixId || !sceneId) return;
        var keys = [];
        inspectorBody.querySelectorAll('[data-exp-ix-floor-key]:checked').forEach(function (cb) {
          keys.push(cb.getAttribute('data-exp-ix-floor-key'));
        });
        var initialEl = inspectorBody.querySelector('[data-exp-ix-floor-initial]');
        var initial = initialEl ? initialEl.value : (keys[0] || null);
        var tipEl = inspectorBody.querySelector('[data-exp-ix-floor-tip]');
        var tipId = tipEl ? tipEl.value : null;
        ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
          behavior: {
            type: 'floor-selector',
            inline: true,
            source: 'estructura',
            controls: 'activeFloor',
            tipologiaId: tipId || null,
            floorKeys: keys,
            initialFloor: initial
          }
        });
        if (initial) ExperienciaEngine.setHubActiveFloor(state, sceneId, initial);
        persist();
      }
      inspectorBody.querySelectorAll('[data-exp-ix-floor-key]').forEach(function (cb) {
        cb.addEventListener('change', syncFloorSelBehavior);
      });
      var floorInitial = inspectorBody.querySelector('[data-exp-ix-floor-initial]');
      if (floorInitial) floorInitial.addEventListener('change', syncFloorSelBehavior);

      var hubFloorSave = inspectorBody.querySelector('[data-exp-hub-floor-save]');
      if (hubFloorSave) {
        hubFloorSave.addEventListener('click', function () {
          var keyEl = inspectorBody.querySelector('[data-exp-hub-floor-key]');
          var a3 = inspectorBody.querySelector('[data-exp-hub-floor-a3d]');
          var a2 = inspectorBody.querySelector('[data-exp-hub-floor-a2d]');
          var key = keyEl ? String(keyEl.value || '').trim() : '';
          if (!key) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Indica la key del piso.');
            return;
          }
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            label: key,
            asset3dId: a3 && a3.value ? String(a3.value).trim() : null,
            asset2dId: a2 && a2.value ? String(a2.value).trim() : null
          });
          renderAll(); persist();
        });
      }
      var nodeLabel = inspectorBody.querySelector('[data-exp-node-label]');
      if (nodeLabel) {
        nodeLabel.addEventListener('change', function () {
          var nid = canvas().selectedId;
          if (!nid) return;
          ExperienciaEngine.renameNode(state, nid, nodeLabel.value);
          renderAll(); persist();
        });
      }
      var ixLabel = inspectorBody.querySelector('[data-exp-ix-label]');
      if (ixLabel) {
        ixLabel.addEventListener('change', function () {
          var sceneId = canvas().selectedInteractionSceneId || canvas().selectedId;
          var ixId = canvas().selectedInteractionId;
          if (!sceneId || !ixId) return;
          ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
            label: String(ixLabel.value || '').trim() || 'Elemento'
          });
          renderAll(); persist();
        });
      }
      var structSel = inspectorBody.querySelector('[data-exp-ix-structure]');
      if (structSel) {
        structSel.addEventListener('change', function () {
          var sceneId = canvas().selectedInteractionSceneId || canvas().selectedId;
          var ixId = canvas().selectedInteractionId;
          if (!sceneId || !ixId) return;
          var opt = structSel.options[structSel.selectedIndex];
          if (!structSel.value) {
            ExperienciaEngine.linkInteractionToStructure(state, sceneId, ixId, null);
          } else {
            ExperienciaEngine.linkInteractionToStructure(state, sceneId, ixId, {
              id: structSel.value,
              key: opt.getAttribute('data-key'),
              kind: opt.getAttribute('data-kind'),
              label: opt.getAttribute('data-label')
            });
          }
          renderAll(); persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-ix-act]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var row = btn.closest('[data-exp-ix-scene]') || btn;
          var sceneId = btn.getAttribute('data-exp-ix-scene') ||
            (row && row.getAttribute('data-exp-ix-scene'));
          var ixId = btn.getAttribute('data-exp-ix-id') ||
            (row && row.getAttribute('data-exp-ix-id'));
          runInteractionAction(btn.getAttribute('data-exp-ix-act'), sceneId, ixId);
        });
      });
      inspectorBody.querySelectorAll('.builder-exp-inspector__ix-item').forEach(function (row) {
        row.addEventListener('click', function (ev) {
          if (ev.target.closest('[data-exp-ix-act]')) return;
          selectInteraction(
            row.getAttribute('data-exp-ix-scene'),
            row.getAttribute('data-exp-ix-id')
          );
        });
      });
      var eg = inspectorBody.querySelector('[data-exp-enter-group]');
      if (eg) {
        eg.addEventListener('click', function () {
          ExperienciaEngine.enterGroup(state, eg.getAttribute('data-exp-enter-group'));
          renderAll(); persist();
        });
      }
      var gotoMenu = inspectorBody.querySelector('[data-exp-goto-step="menu"]');
      if (gotoMenu) {
        gotoMenu.addEventListener('click', function () {
          if (typeof AiProjectBuilderView !== 'undefined' && AiProjectBuilderView.goToStepById) {
            AiProjectBuilderView.goToStepById('menu');
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hero-field]').forEach(function (el) {
        var field = el.getAttribute('data-exp-hero-field');
        var evt = el.type === 'checkbox' ? 'change' : 'change';
        el.addEventListener(evt, function () {
          var val = el.type === 'checkbox' ? !!el.checked : el.value;
          if (ExperienciaEngine.setHeroContentField) {
            ExperienciaEngine.setHeroContentField(state, field, val);
          }
          ExperienciaEngine.ensureFlow(state);
          renderAll();
          persist();
        });
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('blur', function () {
            if (ExperienciaEngine.setHeroContentField) {
              ExperienciaEngine.setHeroContentField(state, field, el.value);
            }
            ExperienciaEngine.ensureFlow(state);
            renderAll();
            persist();
          });
        }
      });
    }

    function syncInspectorChrome() {
      var modeOn = isCanvasMode();
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.isActive()) {
        var collapsed = typeof BuilderPropertiesRail.isCollapsed === 'function'
          ? BuilderPropertiesRail.isCollapsed()
          : !!(canvas().inspectorCollapsed);
        canvas().inspectorOpen = true;
        canvas().inspectorCollapsed = collapsed;
        BuilderPropertiesRail.applyCollapsed(collapsed, { state: state });
      }
      if (workspace) {
        workspace.classList.remove('has-inspector', 'has-inspector-tab');
        workspace.classList.toggle('is-canvas-mode', modeOn);
      }
      var step = rootEl.querySelector('.builder-step-content--experiencia');
      if (step) step.classList.toggle('is-canvas-mode', modeOn);
      var modeBtn = rootEl.querySelector('[data-exp-tool="canvas-mode"]');
      if (modeBtn) {
        modeBtn.setAttribute('data-tooltip', 'Modo Focus');
        modeBtn.setAttribute('aria-label', 'Modo Focus');
        modeBtn.classList.toggle('is-active', modeOn);
      }
      syncFocusFullscreenBtn();
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.getInspectorBody) {
        inspectorBody = BuilderPropertiesRail.getInspectorBody(rootEl) || inspectorBody;
      }
      requestAnimationFrame(function () {
        onViewportResize();
        try { window.dispatchEvent(new Event('boxies:rail-toggle')); } catch (e) {}
      });
    }

    function openPropertiesRail() {
      canvas().inspectorOpen = true;
      canvas().inspectorCollapsed = false;
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
        BuilderPropertiesRail.expand(state);
      }
    }

    function isBrowserFullscreen() {
      return !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);
    }

    function syncFocusFullscreenBtn() {
      var btn = rootEl.querySelector('[data-exp-fullscreen]');
      if (!btn) return;
      var on = isBrowserFullscreen();
      var icon = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
        ? BuilderIcons.render(on ? 'minimize' : 'maximize')
        : '';
      btn.innerHTML = icon;
      btn.setAttribute('data-tooltip', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.setAttribute('title', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.classList.toggle('is-active', on);
      if (typeof BoxiesTooltip !== 'undefined' && BoxiesTooltip.adopt) {
        try { BoxiesTooltip.adopt(btn); } catch (eTip) {}
      }
    }

    function enterBrowserFullscreen() {
      if (isBrowserFullscreen()) return;
      var el = document.documentElement;
      var req = el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (req) {
        try { req.call(el); } catch (eReq) {}
      }
    }

    function exitBrowserFullscreen() {
      if (!isBrowserFullscreen()) return;
      var exitFs = document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (exitFs) {
        try { exitFs.call(document); } catch (eExit) {}
      }
    }

    function toggleBrowserFullscreen() {
      if (isBrowserFullscreen()) exitBrowserFullscreen();
      else enterBrowserFullscreen();
    }

    function removeLeftRailFloat() {
      var btn = document.getElementById('boxiesSidebarFloatBtn');
      if (btn && btn.parentNode) {
        try { btn.parentNode.removeChild(btn); } catch (eRm) {}
      }
    }

    function toggleCanvasMode() {
      var next = !isCanvasMode();
      var prefs = (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load)
        ? BoxiesPrefs.load()
        : {};
      if (next) {
        var restore = {
          railCollapsed: !!(typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getRailCollapsed
            ? BoxiesPrefs.getRailCollapsed()
            : document.body.classList.contains('boxies-rail-collapsed')),
          propsRailCollapsed: !!(typeof BuilderPropertiesRail !== 'undefined' &&
            BuilderPropertiesRail.isCollapsed
            ? BuilderPropertiesRail.isCollapsed()
            : document.body.classList.contains('boxies-props-rail-collapsed')),
          headerH: document.documentElement.style.getPropertyValue('--boxies-header-h') || '',
          dockH: document.documentElement.style.getPropertyValue('--boxies-dock-h') || '',
          railW: document.documentElement.style.getPropertyValue('--builder-rail-width') || '',
          propsRailW: document.documentElement.style.getPropertyValue('--builder-props-rail-width') || '',
          sidebarW: document.documentElement.style.getPropertyValue('--boxies-sidebar-w') || '',
          wasFullscreen: isBrowserFullscreen()
        };
        setCanvasMode(true, restore);
        /* Hide platform sidebar + chrome completely */
        document.documentElement.style.setProperty('--boxies-sidebar-w', '0px');
        document.documentElement.style.setProperty('--boxies-header-h', '0px');
        document.documentElement.style.setProperty('--boxies-dock-h', '0px');
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(true);
        } else {
          document.body.classList.add('boxies-rail-collapsed');
          document.documentElement.classList.add('boxies-rail-collapsed');
          document.documentElement.style.setProperty('--builder-rail-width', '0px');
        }
        removeLeftRailFloat();
        /* Keep right properties panel open */
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
          BuilderPropertiesRail.expand(state);
        } else if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(false, { state: state });
        }
        enterBrowserFullscreen();
      } else {
        var prev = prefs._expCanvasRestore || {};
        setCanvasMode(false, null);
        if (prev.sidebarW) {
          document.documentElement.style.setProperty('--boxies-sidebar-w', prev.sidebarW);
        } else {
          document.documentElement.style.removeProperty('--boxies-sidebar-w');
        }
        if (prev.headerH) {
          document.documentElement.style.setProperty('--boxies-header-h', prev.headerH);
        } else {
          document.documentElement.style.removeProperty('--boxies-header-h');
        }
        if (prev.dockH) {
          document.documentElement.style.setProperty('--boxies-dock-h', prev.dockH);
        } else {
          document.documentElement.style.removeProperty('--boxies-dock-h');
        }
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(!!prev.railCollapsed);
        } else if (prev.railW) {
          document.documentElement.style.setProperty('--builder-rail-width', prev.railW);
        } else {
          document.documentElement.style.removeProperty('--builder-rail-width');
        }
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(
            prev.propsRailCollapsed != null ? !!prev.propsRailCollapsed : false,
            { state: state }
          );
        } else if (prev.propsRailW) {
          document.documentElement.style.setProperty('--builder-props-rail-width', prev.propsRailW);
        } else {
          document.documentElement.style.removeProperty('--builder-props-rail-width');
        }
        if (!prev.wasFullscreen) {
          exitBrowserFullscreen();
        }
      }
      if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.update) {
        try { BuilderProgressRail.update(rootEl, state); } catch (eRail) {}
      }
      if (isCanvasMode()) removeLeftRailFloat();
      syncInspectorChrome();
      requestAnimationFrame(function () {
        recomputeOverlayLayout();
        requestAnimationFrame(recomputeOverlayLayout);
      });
    }

    function renderAll() {
      syncEditModeUi();
      applyWorldTransform();
      paintNodes();
      paintEdges();
      paintMinimap();
      paintButtonsStage();
      paintHotspotsStage();
      if (canvas().editMode === 'prototype') syncPrototypeStoryboard();
      paintInspector();
      syncInspectorChrome();
      if (minimapWrap) minimapWrap.classList.toggle('is-hidden',
        canvas().editMode === 'buttons' ||
        canvas().editMode === 'hotspots' ||
        canvas().editMode === 'prototype' ||
        canvas().minimapVisible === false);
    }

    function canUseButtonsMode() {
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      return !!(n && ExperienciaEngine.isButtonsEditableNode &&
        ExperienciaEngine.isButtonsEditableNode(n) &&
        selectedIds().length <= 1);
    }

    function canUseHotspotsMode() {
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      return !!(n && ExperienciaEngine.isHotspotsEditableNode &&
        ExperienciaEngine.isHotspotsEditableNode(n) &&
        selectedIds().length <= 1);
    }

    function syncToolbarForMode(mode) {
      var toolbar = rootEl.querySelector('[data-exp-toolbar]');
      if (!toolbar) return;
      /* Flow keeps full canvas tools; other modes only keep Focus (like PROTOTIPO). */
      var allowed = mode === 'flow'
        ? { select: 1, cut: 1, fit: 1, 'canvas-mode': 1, minimap: 1 }
        : { 'canvas-mode': 1 };
      toolbar.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
        var t = btn.getAttribute('data-exp-tool');
        var show = !!allowed[t];
        btn.hidden = !show;
        if (show) btn.removeAttribute('aria-hidden');
        else btn.setAttribute('aria-hidden', 'true');
      });
      toolbar.querySelectorAll('.builder-exp-toolbar__sep').forEach(function (sep) {
        sep.hidden = mode !== 'flow';
        sep.setAttribute('aria-hidden', mode === 'flow' ? 'true' : 'true');
      });
    }

    function syncEditModeUi() {
      if (overlayMode) {
        if (canvas().editMode !== 'buttons' && canvas().editMode !== 'hotspots') {
          canvas().editMode = 'buttons';
        }
        if (api.overlayNodeId) {
          canvas().selectedId = api.overlayNodeId;
          canvas().selectedIds = [api.overlayNodeId];
        }
      } else {
        if (canvas().editMode === 'buttons' && !canUseButtonsMode()) {
          canvas().editMode = 'flow';
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        }
        if (canvas().editMode === 'hotspots' && !canUseHotspotsMode()) {
          canvas().editMode = 'flow';
          canvas().selectedHotspotId = null;
          hotspotDraw = null;
        }
      }
      var mode = canvas().editMode === 'buttons' ? 'buttons'
        : (canvas().editMode === 'hotspots' ? 'hotspots'
          : (canvas().editMode === 'prototype' ? 'prototype' : 'flow'));
      if (stage) {
        stage.classList.toggle('is-buttons-mode', mode === 'buttons');
        stage.classList.toggle('is-hotspots-mode', mode === 'hotspots');
        stage.classList.toggle('is-proto-mode', mode === 'prototype');
        stage.setAttribute('data-exp-active-mode', mode);
      }
      /* Hard-swap views: Canvas editor must never remain visible in PROTOTIPO */
      if (viewport) {
        var hideFlow = mode === 'buttons' || mode === 'hotspots' || mode === 'prototype' || overlayMode;
        viewport.hidden = hideFlow;
        viewport.setAttribute('aria-hidden', hideFlow ? 'true' : 'false');
        viewport.style.display = hideFlow ? 'none' : '';
      }
      if (buttonsStage) {
        /* V7.2.64 — always show buttons + hotspots together (Runtime parity). */
        buttonsStage.hidden = false;
        buttonsStage.setAttribute('aria-hidden', 'false');
      }
      if (hotspotsStage) {
        hotspotsStage.hidden = false;
        hotspotsStage.setAttribute('aria-hidden', 'false');
      }
      if (hotspotsLayer) {
        /* Only capture empty-canvas clicks while actively drawing hotspots.
           Otherwise the full-size layer sits above shapes and freezes drag. */
        var hsDraw = mode === 'hotspots' || !!hotspotDraw;
        hotspotsLayer.classList.toggle('is-draw-active', hsDraw);
        hotspotsLayer.style.cursor = hsDraw ? 'crosshair' : '';
      }
      if (buttonsLayer) {
        buttonsLayer.style.pointerEvents = mode === 'hotspots' && !overlayMode ? 'none' : 'auto';
      }
      if (protoStage) {
        protoStage.hidden = mode !== 'prototype';
        protoStage.setAttribute('aria-hidden', mode === 'prototype' ? 'false' : 'true');
        if (mode === 'prototype') {
          protoStage.style.display = '';
          protoStage.removeAttribute('hidden');
        }
      }
      if (mode !== 'prototype' && protoRuntimePlayer) {
        if (protoRuntimePlayer.showGate) protoRuntimePlayer.showGate();
        else if (protoRuntimePlayer.stopPlayback) protoRuntimePlayer.stopPlayback(true);
      }
      if (modeTabs) {
        modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
          var m = btn.getAttribute('data-exp-edit-mode');
          var enabled = m === 'flow' ||
            m === 'prototype' ||
            (m === 'buttons' && canUseButtonsMode()) ||
            (m === 'hotspots' && canUseHotspotsMode());
          btn.disabled = !enabled;
          btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
          var active = m === mode && enabled;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
      }
      syncToolbarForMode(mode);
    }

    function syncButtonsLayerBounds() {
      if (!buttonsImg || !buttonsLayer || !buttonsFrame) return;
      /* Quotation overlay: design frame IS the coordinate space (1920×1080). */
      if (overlayMode) {
        buttonsLayer.style.left = '0';
        buttonsLayer.style.top = '0';
        buttonsLayer.style.width = '100%';
        buttonsLayer.style.height = '100%';
        return false;
      }
      if (buttonsImg.hidden || !buttonsImg.getAttribute('src')) {
        buttonsLayer.style.left = '0';
        buttonsLayer.style.top = '0';
        buttonsLayer.style.width = '100%';
        buttonsLayer.style.height = '100%';
        return false;
      }
      var fr = buttonsFrame.getBoundingClientRect();
      var ir = buttonsImg.getBoundingClientRect();
      if (!fr.width || !ir.width) return false;
      var nextLeft = Math.max(0, ir.left - fr.left) + 'px';
      var nextTop = Math.max(0, ir.top - fr.top) + 'px';
      var nextW = Math.max(1, ir.width) + 'px';
      var nextH = Math.max(1, ir.height) + 'px';
      var changed =
        buttonsLayer.style.left !== nextLeft ||
        buttonsLayer.style.top !== nextTop ||
        buttonsLayer.style.width !== nextW ||
        buttonsLayer.style.height !== nextH;
      buttonsLayer.style.left = nextLeft;
      buttonsLayer.style.top = nextTop;
      buttonsLayer.style.width = nextW;
      buttonsLayer.style.height = nextH;
      return changed;
    }

    var overlayLayoutTimer = null;
    var overlayLayoutPass = 0;
    /**
     * Keep button overlays locked to the image after any chrome/layout change.
     * Must not wait for click/drag.
     */
    function recomputeOverlayLayout() {
      if (overlayLayoutTimer) clearTimeout(overlayLayoutTimer);
      overlayLayoutTimer = setTimeout(function () {
        overlayLayoutTimer = null;
        applyWorldTransform();
        paintMinimap();
        if (overlayMode || canvas().editMode === 'buttons' || canvas().editMode === 'hotspots') {
          if (overlayMode || canvas().editMode === 'buttons') {
            syncButtonsLayerBounds();
            paintButtonsStage();
          }
          if (overlayMode || canvas().editMode === 'hotspots') {
            syncHotspotsLayerBounds();
            paintHotspotsStage();
          }
          requestAnimationFrame(function () {
            if (overlayMode || canvas().editMode === 'buttons') syncButtonsLayerBounds();
            if (overlayMode || canvas().editMode === 'hotspots') syncHotspotsLayerBounds();
            overlayLayoutPass = 0;
          });
          return;
        }
        if (canvas().editMode === 'prototype' && protoRuntimePlayer && protoRuntimePlayer.resize) {
          protoRuntimePlayer.resize();
        }
      }, 16);
    }

    /**
     * During drag/resize, update existing nodes in place.
     * Full innerHTML remount drops pointer capture and freezes the gesture.
     */
    function paintButtonsStageLive() {
      if (!buttonsLayer) return false;
      /* Shape resize paints via applyLiveShapeResizePaint — skip stale model sync. */
      if (transformDrag && transformDrag.live && isShapeType(transformDrag.type)) {
        return true;
      }
      /* Shape move — compositor translate only; skip % sync + guide DOM churn. */
      if (buttonDrag && buttonDrag.live && !buttonDrag.nudge && buttonDrag.moveLiveRefs) {
        return true;
      }
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      if (!n || !ExperienciaEngine.isButtonsEditableNode(n)) return false;
      var layerW = buttonsLayer.clientWidth || 1000;
      var layerH = buttonsLayer.clientHeight || 1000;
      var buttons = ExperienciaEngine.listSceneButtons(state, n) || [];
      var moved = false;
      buttons.forEach(function (b) {
        if (!b || !b.id) return;
        var vm = (b._ix && ExperienciaEngine.buttonViewModel)
          ? ExperienciaEngine.buttonViewModel(state, n, b._ix, layerW, layerH)
          : b;
        var el = buttonsLayer.querySelector(
          '[data-exp-stage-btn="' + String(b.id).replace(/"/g, '') + '"]'
        );
        if (!el) return;
        moved = true;
        var t = String(b.type || 'BUTTON').toUpperCase();
        var rot = Number(vm.rotation) || 0;
        el.style.setProperty('--btn-rot', rot + 'deg');
        if (isShapeType(t)) {
          if (isShapeBoxV2Active()) {
            var boxLive = getShapeBox(vm, layerW, layerH);
            if (boxLive) {
              paintShapeNodeEl(el, boxLive, vm, layerW, layerH);
              moved = true;
            }
          } else {
            var gmLive = shapeStagePaintMetrics(vm, layerW, layerH);
            if (gmLive) {
              el.style.left = gmLive.x + '%';
              el.style.top = gmLive.y + '%';
              el.style.width = gmLive.w + '%';
              el.style.height = gmLive.h + '%';
            } else {
              el.style.left = (Number(vm.x) || 50) + '%';
              el.style.top = (Number(vm.y) || 50) + '%';
            }
          }
        } else {
          el.style.left = (Number(vm.x) || 50) + '%';
          el.style.top = (Number(vm.y) || 50) + '%';
          if (t === 'BUTTON') {
            if (b.boxW != null) el.style.width = Number(b.boxW) + '%';
            if (b.boxH != null) el.style.height = Number(b.boxH) + '%';
          }
        }
      });
      var gizmos = buttonsLayer.querySelectorAll('[data-exp-gizmo]');
      if (gizmos && gizmos.length) {
        var sceneIdLive = canvas().selectedId;
        gizmos.forEach(function (gizmo) {
          var gid = gizmo.getAttribute('data-gizmo-id');
          var gvm = sceneIdLive && gid ? getOverlayItemVm(sceneIdLive, gid) : null;
          if (!gvm) return;
          if (isShapeBoxV2Active() && isShapeType(gvm.type)) {
            var boxGizmoLive = getShapeBox(gvm, layerW, layerH);
            if (boxGizmoLive) {
              paintShapeGizmoEl(gizmo, boxGizmoLive, layerW, layerH);
              moved = true;
              return;
            }
          }
          var gm = overlaySelectionMetrics(gvm, layerW, layerH);
          if (!gm) return;
          gizmo.style.left = gm.gx + '%';
          gizmo.style.top = gm.gy + '%';
          gizmo.style.width = gm.gw + '%';
          gizmo.style.height = gm.gh + '%';
          gizmo.style.setProperty('--btn-rot', gm.grot + 'deg');
          var sizeEl = gizmo.querySelector('[data-exp-sel-size]');
          if (sizeEl) {
            sizeEl.textContent = gm.st === 'SHAPE_LINE'
              ? Math.max(1, Math.round((gm.gw / 100) * layerW)) + ' px'
              : Math.max(1, Math.round((gm.gw / 100) * layerW)) + ' × ' +
                Math.max(1, Math.round((gm.gh / 100) * layerH));
          }
          moved = true;
        });
      }
      /* Live spacing pills — only while moving (not resizing; DOM churn causes jitter). */
      if (buttonDrag && buttonDrag.live && !buttonDrag.nudge) {
        syncLiveSpacingGuides();
      }
      return moved;
    }

    /** Direct DOM box update during resize — no remount, no snap round-trip. */
    function applyLiveResizePaint(buttonId, box, type) {
      if (!buttonsLayer || !buttonId || !box) return;
      var t = String(type || '').toUpperCase();
      if (isShapeType(t)) {
        applyLiveShapeResizePaint(buttonId, box, t);
        return;
      }
      var idSel = String(buttonId).replace(/"/g, '');
      var el = buttonsLayer.querySelector('[data-exp-stage-btn="' + idSel + '"]');
      var leftPx = (Number(box.lpx) + Number(box.rpx)) / 2;
      var topPx = (Number(box.tpx) + Number(box.bpx)) / 2;
      var wPx = Math.max(1, Number(box.rpx) - Number(box.lpx));
      var hPx = Math.max(1, Number(box.bpx) - Number(box.tpx));
      if (isSquareShapeType(t)) hPx = wPx;
      if (el) {
        el.style.left = leftPx + 'px';
        el.style.top = topPx + 'px';
        if (isShapeType(t) || t === 'BUTTON') {
          el.style.width = wPx + 'px';
          el.style.height = hPx + 'px';
        }
      }
      var gizmo = buttonsLayer.querySelector(
        '[data-exp-gizmo][data-gizmo-id="' + idSel + '"]'
      );
      if (gizmo) {
        gizmo.style.left = leftPx + 'px';
        gizmo.style.top = topPx + 'px';
        gizmo.style.width = wPx + 'px';
        gizmo.style.height = hPx + 'px';
        gizmo.classList.add('is-sizing');
        var sizeEl = gizmo.querySelector('[data-exp-sel-size]');
        if (sizeEl) {
          var label = t === 'SHAPE_LINE'
            ? Math.max(1, Math.round(wPx)) + ' px'
            : Math.max(1, Math.round(wPx)) + ' × ' + Math.max(1, Math.round(hPx));
          if (sizeEl.textContent !== label) sizeEl.textContent = label;
        }
      }
    }

    /** Live resize — unified ShapeBox v2 paint, or legacy tile/gizmo split. */
    function paintShapeLiveFast(fin, liveRefs, layerW, layerH) {
      if (!fin || !fin.gm || !liveRefs) return;
      var gm = fin.gm;
      var rot = (liveRefs.snap && liveRefs.snap.rot) || 0;

      if (isShapeBoxV2Active() && fin.box) {
        var boxV2 = fin.box;
        boxV2.rot = rot;
        var liveKeyV2 = boxV2.cx + '|' + boxV2.cy + '|' + boxV2.w + '|' + boxV2.h;
        if (liveRefs.lastLiveKey === liveKeyV2) return;
        liveRefs.lastLiveKey = liveKeyV2;
        var vmLive = {
          type: liveRefs.kind,
          fill: liveRefs.paint && liveRefs.paint.fill,
          stroke: liveRefs.paint && liveRefs.paint.stroke,
          strokeWidth: liveRefs.paint && liveRefs.paint.strokeWidth,
          borderRadius: liveRefs.paint && liveRefs.paint.borderRadius,
          shapeStretchX: fin.stretchX,
          shapeStretchY: fin.stretchY
        };
        if (liveRefs.el) {
          paintShapeNodeEl(liveRefs.el, boxV2, vmLive, layerW, layerH, { liveSizing: true });
        }
        if (liveRefs.gizmo) {
          liveRefs.gizmo.classList.add('is-sizing');
          paintShapeGizmoEl(liveRefs.gizmo, boxV2, layerW, layerH);
        }
        return;
      }

      var liveKey = gm.gx + '|' + gm.gy + '|' + gm.gw + '|' + gm.gh + '|' +
        fin.stretchX + '|' + fin.stretchY;
      if (liveRefs.lastLiveKey === liveKey) return;
      liveRefs.lastLiveKey = liveKey;
      var tf = 'translate(-50%, -50%) rotate(' + rot + 'deg)';
      var wPx = Math.max(1, Math.round((gm.gw / 100) * (layerW || 1000)));
      var hPx = Math.max(1, Math.round((gm.gh / 100) * (layerH || 1000)));
      if (liveRefs.el) {
        liveRefs.el.classList.add('is-live-sizing');
        liveRefs.el.style.overflow = 'hidden';
        liveRefs.el.style.left = gm.gx + '%';
        liveRefs.el.style.top = gm.gy + '%';
        liveRefs.el.style.width = gm.gw + '%';
        liveRefs.el.style.height = gm.gh + '%';
        liveRefs.el.style.transform = tf;
        patchShapeSvgLive(liveRefs.el, liveRefs.kind, liveRefs.paint, fin.stretchX, fin.stretchY);
      }
      if (liveRefs.gizmo) {
        liveRefs.gizmo.style.left = gm.gx + '%';
        liveRefs.gizmo.style.top = gm.gy + '%';
        liveRefs.gizmo.style.width = gm.gw + '%';
        liveRefs.gizmo.style.height = gm.gh + '%';
        liveRefs.gizmo.style.transform = tf;
        liveRefs.gizmo.classList.add('is-sizing');
        if (liveRefs.sizeEl) {
          var label = wPx + ' × ' + hPx;
          if (liveRefs.sizeEl.textContent !== label) liveRefs.sizeEl.textContent = label;
        }
      }
    }

    function flushShapeResizeFrame(drag) {
      if (!drag || !isShapeType(drag.type)) return;
      if (drag.shapeRaf) {
        cancelAnimationFrame(drag.shapeRaf);
        drag.shapeRaf = 0;
      }
      if (drag.pendingShapeDx == null || drag.pendingShapeDy == null) {
        if (drag.lastShapeDx == null || drag.lastShapeDy == null) return;
        drag.pendingShapeDx = drag.lastShapeDx;
        drag.pendingShapeDy = drag.lastShapeDy;
        drag.pendingShapeLayerW = drag.layerW;
        drag.pendingShapeLayerH = drag.layerH;
        drag.pendingShapeMode = drag.mode;
      }
      var fin = computeShapeResizeLive(
        drag,
        drag.pendingShapeDx,
        drag.pendingShapeDy,
        drag.pendingShapeLayerW,
        drag.pendingShapeLayerH,
        drag.pendingShapeMode,
        drag.keepRatio
      );
        if (fin) {
        drag.lastShapeDx = drag.pendingShapeDx;
        drag.lastShapeDy = drag.pendingShapeDy;
        paintShapeLiveFast(fin, drag.liveRefs, drag.pendingShapeLayerW, drag.pendingShapeLayerH);
        if (fin.patch) drag.liveShapePatch = fin.patch;
        if (shapeResizeDebugEnabled() && drag.buttonId) {
          logShapeVsGizmo('dragmove', drag.buttonId, {
            mode: drag.pendingShapeMode || drag.mode,
            shapeBoxV2: !!drag.shapeBoxV2,
            liveGm: fin.gm,
            liveBox: fin.box,
            stretch: { x: fin.stretchX, y: fin.stretchY },
            patch: fin.patch,
            startBox: drag.startBox || null,
            dxPx: drag.pendingShapeDx,
            dyPx: drag.pendingShapeDy
          });
        }
      }
    }

    function scheduleShapeResizeFrame(drag, dxPx, dyPx, layerW, layerH, mode) {
      if (!drag) return;
      drag.pendingShapeDx = dxPx;
      drag.pendingShapeDy = dyPx;
      drag.pendingShapeLayerW = drag.layerW || layerW;
      drag.pendingShapeLayerH = drag.layerH || layerH;
      drag.pendingShapeMode = mode;
      if (drag.shapeRaf) return;
      drag.shapeRaf = requestAnimationFrame(function () {
        drag.shapeRaf = 0;
        flushShapeResizeFrame(drag);
      });
    }

    /** Fallback px paint for deprecated applyLiveShapeResizePaint path. */
    function paintShapeLiveMetrics(buttonId, kind, tileCtr, tileDisp, gm, layerW, layerH, liveRefs) {
      if (!buttonsLayer || !buttonId || !tileCtr || !tileDisp || !gm) return;
      kind = String(kind || '').toUpperCase();
      var idSel = String(buttonId).replace(/"/g, '');
      var tileCxPx = (Number(tileCtr.x) / 100) * layerW;
      var tileCyPx = (Number(tileCtr.y) / 100) * layerH;
      var tileWPx = (tileDisp.w / 100) * layerW;
      var tileHPx = (tileDisp.h / 100) * layerH;
      var gizmoCxPx = (gm.gx / 100) * layerW;
      var gizmoCyPx = (gm.gy / 100) * layerH;
      var gizmoWPx = (gm.gw / 100) * layerW;
      var gizmoHPx = (gm.gh / 100) * layerH;
      var el = (liveRefs && liveRefs.el) ||
        buttonsLayer.querySelector('[data-exp-stage-btn="' + idSel + '"]');
      var gizmo = (liveRefs && liveRefs.gizmo) ||
        buttonsLayer.querySelector('[data-exp-gizmo][data-gizmo-id="' + idSel + '"]');
      if (el) {
        el.style.left = tileCxPx + 'px';
        el.style.top = tileCyPx + 'px';
        el.style.width = tileWPx + 'px';
        el.style.height = tileHPx + 'px';
      }
      if (gizmo) {
        gizmo.style.left = gizmoCxPx + 'px';
        gizmo.style.top = gizmoCyPx + 'px';
        gizmo.style.width = gizmoWPx + 'px';
        gizmo.style.height = gizmoHPx + 'px';
        gizmo.classList.add('is-sizing');
      }
    }

    function clearShapeMoveLiveStyles(moveLiveRefs) {
      if (!moveLiveRefs || !moveLiveRefs.items) return;
      moveLiveRefs.items.forEach(function (item) {
        if (item.el) {
          item.el.classList.remove('is-live-moving');
          item.el.style.removeProperty('transform');
          item.el.style.removeProperty('left');
          item.el.style.removeProperty('top');
          item.el.style.removeProperty('width');
          item.el.style.removeProperty('height');
        }
        if (item.gizmo) {
          item.gizmo.style.removeProperty('transform');
          item.gizmo.style.removeProperty('left');
          item.gizmo.style.removeProperty('top');
          item.gizmo.style.removeProperty('width');
          item.gizmo.style.removeProperty('height');
        }
      });
    }

    function canUseShapeMoveFastPath(sceneId, groupIds) {
      if (!groupIds || !groupIds.length) return false;
      for (var i = 0; i < groupIds.length; i++) {
        var vm = getOverlayItemVm(sceneId, groupIds[i]);
        if (!vm || !isShapeType(vm.type)) return false;
      }
      return true;
    }

    function buildShapeMoveLiveRefs(sceneId, groupIds, layerW, layerH) {
      var items = [];
      groupIds.forEach(function (id) {
        var vm = getOverlayItemVm(sceneId, id);
        if (!vm || !isShapeType(vm.type)) return;
        var idEsc = String(id).replace(/"/g, '');
        var el = buttonsLayer.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
        var gizmo = buttonsLayer.querySelector('[data-exp-gizmo][data-gizmo-id="' + idEsc + '"]');
        if (!el) return;
        var paint = shapeStagePaintMetrics(vm, layerW, layerH);
        if (!paint) return;
        var boxCxPx = (paint.x / 100) * layerW;
        var boxCyPx = (paint.y / 100) * layerH;
        var boxWPx = (paint.w / 100) * layerW;
        var boxHPx = (paint.h / 100) * layerH;
        el.classList.add('is-live-moving');
        el.style.left = boxCxPx + 'px';
        el.style.top = boxCyPx + 'px';
        el.style.width = boxWPx + 'px';
        el.style.height = boxHPx + 'px';
        if (gizmo) {
          gizmo.style.left = boxCxPx + 'px';
          gizmo.style.top = boxCyPx + 'px';
          gizmo.style.width = boxWPx + 'px';
          gizmo.style.height = boxHPx + 'px';
        }
        items.push({
          id: id,
          el: el,
          gizmo: gizmo,
          snap: {
            boxCxPx: boxCxPx,
            boxCyPx: boxCyPx,
            rot: Number(vm.rotation) || 0
          }
        });
      });
      return items.length ? { items: items, layerW: layerW, layerH: layerH } : null;
    }

    /** Arm compositor fast-path only after drag threshold — not on selection click. */
    function ensureShapeMoveLiveRefs(drag) {
      if (!drag || drag.moveLiveRefs || drag.isOverlayGroup || !drag.shapeMoveFastPath) return;
      var groupIds = (drag.groupIds && drag.groupIds.length)
        ? drag.groupIds
        : [drag.buttonId];
      if (!canUseShapeMoveFastPath(drag.sceneId, groupIds)) return;
      var layerW = buttonsLayer ? (buttonsLayer.clientWidth || 1000) : 1000;
      var layerH = buttonsLayer ? (buttonsLayer.clientHeight || 1000) : 1000;
      if (!drag.ptrCache) drag.ptrCache = overlayPointerLayerCache();
      drag.moveLiveRefs = buildShapeMoveLiveRefs(drag.sceneId, groupIds, layerW, layerH);
    }

    function paintShapeMoveFast(moveLiveRefs, ddxPct, ddyPct) {
      if (!moveLiveRefs || !moveLiveRefs.items) return;
      var layerW = moveLiveRefs.layerW;
      var layerH = moveLiveRefs.layerH;
      var dxPx = (ddxPct / 100) * layerW;
      var dyPx = (ddyPct / 100) * layerH;
      moveLiveRefs.items.forEach(function (item) {
        var snap = item.snap;
        var rot = snap.rot || 0;
        var boxTf =
          'translate3d(calc(-50% + ' + dxPx + 'px), calc(-50% + ' + dyPx + 'px), 0) ' +
          'rotate(' + rot + 'deg)';
        if (item.lastTf !== boxTf) {
          item.lastTf = boxTf;
          if (item.el) item.el.style.transform = boxTf;
        }
        if (item.gizmo) {
          var gx = snap.boxCxPx + dxPx;
          var gy = snap.boxCyPx + dyPx;
          var gKey = gx + '|' + gy + '|' + rot;
          if (item.lastGizmoKey !== gKey) {
            item.lastGizmoKey = gKey;
            item.gizmo.style.left = gx + 'px';
            item.gizmo.style.top = gy + 'px';
            item.gizmo.style.transform = 'translate(-50%, -50%) rotate(' + rot + 'deg)';
          }
        }
      });
    }

    function flushShapeMoveFrame(drag) {
      if (!drag || !drag.moveLiveRefs) return;
      if (drag.moveRaf) {
        cancelAnimationFrame(drag.moveRaf);
        drag.moveRaf = 0;
      }
      if (drag.pendingMoveDdx == null || drag.pendingMoveDdy == null) return;
      paintShapeMoveFast(drag.moveLiveRefs, drag.pendingMoveDdx, drag.pendingMoveDdy);
      if (drag.guides) syncLiveOverlayGuides(drag.guides);
    }

    function scheduleShapeMoveFrame(drag) {
      if (!drag || !drag.moveLiveRefs) return;
      if (drag.moveRaf) return;
      drag.moveRaf = requestAnimationFrame(function () {
        drag.moveRaf = 0;
        flushShapeMoveFrame(drag);
      });
    }

    function pointerPctFromEvent(ev, ptrCache) {
      if (ptrCache) {
        return {
          x: ((ev.clientX - ptrCache.left) / ptrCache.rectW) * 100,
          y: ((ev.clientY - ptrCache.top) / ptrCache.rectH) * 100
        };
      }
      return percentFromPointer(ev);
    }

    function clearShapeLiveSizingStyles(liveRefs) {
      if (!liveRefs) return;
      var el = liveRefs.el;
      var gizmo = liveRefs.gizmo;
      if (el) {
        el.classList.remove('is-live-sizing');
        el.style.removeProperty('transform');
        el.style.removeProperty('overflow');
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        el.style.removeProperty('width');
        el.style.removeProperty('height');
      }
      if (gizmo) {
        gizmo.classList.remove('is-sizing');
        gizmo.style.removeProperty('transform');
        gizmo.style.removeProperty('left');
        gizmo.style.removeProperty('top');
        gizmo.style.removeProperty('width');
        gizmo.style.removeProperty('height');
      }
    }

    /** @deprecated — use paintShapeLiveMetrics */
    function applyLiveShapeResizePaint(buttonId, box, kind) {
      if (!buttonsLayer || !buttonId || !box) return;
      kind = String(kind || '').toUpperCase();
      var layerW = Math.max(1, buttonsLayer.clientWidth || 1000);
      var layerH = Math.max(1, buttonsLayer.clientHeight || 1000);
      var Lpx = Number(box.lpx);
      var Rpx = Number(box.rpx);
      var Tpx = Number(box.tpx);
      var Bpx = Number(box.bpx);
      var nx = (((Lpx + Rpx) * 0.5) / layerW) * 100;
      var ny = (((Tpx + Bpx) * 0.5) / layerH) * 100;
      var nw = ((Rpx - Lpx) / layerW) * 100;
      var tileWPct = ExperienciaEngine.sceneShapeTileWidthFromContentWidth
        ? ExperienciaEngine.sceneShapeTileWidthFromContentWidth(nw, kind)
        : nw;
      var tileCtr = ExperienciaEngine.sceneShapeTileCenterFromGizmoCenter
        ? ExperienciaEngine.sceneShapeTileCenterFromGizmoCenter(
          nx, ny, tileWPct, kind, layerW, layerH
        )
        : { x: nx, y: ny };
      var gm = ExperienciaEngine.sceneShapeGizmoMetrics
        ? ExperienciaEngine.sceneShapeGizmoMetrics(
          tileWPct, kind, layerW, layerH, tileCtr.x, tileCtr.y
        )
        : null;
      if (!gm) return;
      paintShapeLiveMetrics(
        buttonId, kind, tileCtr, shapeDisplaySize(tileWPct, layerW, layerH), gm, layerW, layerH
      );
    }

    function syncLiveSpacingGuides() {
      syncLiveOverlayGuides(buttonDrag && buttonDrag.guides);
    }

    /** Peer edge/center matches as SHORT segments between nearest vertices (not full canvas lines). */
    function boxGapXY(a, b) {
      var gapX = 0;
      if (a.R < b.L) gapX = b.L - a.R;
      else if (b.R < a.L) gapX = a.L - b.R;
      var gapY = 0;
      if (a.B < b.T) gapY = b.T - a.B;
      else if (b.B < a.T) gapY = a.T - b.B;
      return { x: gapX, y: gapY };
    }

    /** Peers far away must not contribute align/snap on that axis. */
    function peerNearOnAxis(selfBox, peerBox, axis, maxGap) {
      maxGap = maxGap != null ? maxGap : 10;
      if (!selfBox || !peerBox) return false;
      var g = boxGapXY(selfBox, peerBox);
      /* Vertical lines (same X): only if vertically nearby. Horizontal lines: only if horizontally nearby. */
      return axis === 'x' ? g.y <= maxGap : g.x <= maxGap;
    }

    function syncLiveOverlayGuides(guides) {
      if (!buttonsLayer) return;
      var old = buttonsLayer.querySelectorAll('[data-exp-space-guide], [data-exp-align-guide]');
      for (var i = 0; i < old.length; i++) {
        try { old[i].parentNode.removeChild(old[i]); } catch (eR) { /* ignore */ }
      }
      guides = guides || {};
      var html = '';
      var seenSpace = {};
      (guides.spacing || []).forEach(function (s) {
        if (!s || s.px == null) return;
        var key = String(s.axis) + ':' + Math.round(Number(s.pos) * 10) + ':' +
          Math.round(Number(s.cross) * 10) + ':' + s.px;
        if (seenSpace[key]) return;
        seenSpace[key] = true;
        var label = String(s.px);
        var extra = s.uniform ? ' is-uniform' : ' is-near';
        if (s.axis === 'x') {
          html += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-x' + extra +
            '" data-exp-space-guide="1" style="left:' + Number(s.pos) + '%;top:' +
            Number(s.cross) + '%"><span>' + esc(label) + '</span></div>';
        } else {
          html += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-y' + extra +
            '" data-exp-space-guide="1" style="left:' + Number(s.cross) + '%;top:' +
            Number(s.pos) + '%"><span>' + esc(label) + '</span></div>';
        }
      });
      if (html) buttonsLayer.insertAdjacentHTML('afterbegin', html);
    }

    /** Double-click rotate handle → type exact degrees (same popover as guide px). */
    function openOverlayRotationEditor(clientX, clientY, sceneId, buttonId, anchorEl) {
      if (!sceneId || !buttonId) return;
      if (typeof QuotationContextMenu === 'undefined' || !QuotationContextMenu.open) return;
      var btn = ExperienciaEngine.getSceneButton(
        state, ExperienciaEngine.getNode(state, sceneId), buttonId
      );
      if (!btn || btn.locked) return;
      var rot = Math.round(Number(btn.rotation) || 0);
      var x = Number(clientX) || 0;
      var y = Number(clientY) || 0;
      /* Prefer handle box — client coords can be odd after gizmo CSS transforms. */
      if (anchorEl && anchorEl.getBoundingClientRect) {
        var r = anchorEl.getBoundingClientRect();
        if (r && r.width > 2 && r.height > 2) {
          x = r.left + r.width / 2;
          y = r.bottom + 8;
        }
      }
      if (typeof BoxiesTooltip !== 'undefined' && BoxiesTooltip.hide) {
        try { BoxiesTooltip.hide(); } catch (eTip) { /* ignore */ }
      }
      QuotationContextMenu.open({
        x: x,
        y: y,
        ariaLabel: 'Rotación',
        items: [
          {
            type: 'input',
            id: 'overlay-rot',
            label: '°',
            value: rot,
            suffix: '',
            min: -360,
            max: 360,
            step: 1,
            ariaLabel: 'Rotación en grados',
            onSubmit: function (raw) {
              var n = Number(String(raw == null ? '' : raw).replace(/[^\d.-]/g, ''));
              if (!isFinite(n)) return;
              n = Math.max(-360, Math.min(360, Math.round(n)));
              pushButtonHistory(sceneId);
              ExperienciaEngine.updateSceneButton(state, sceneId, buttonId, { rotation: n });
              paintButtonsStage();
              paintInspector();
              persist();
            }
          }
        ]
      });
    }

    function paintButtonsStage() {
      if (!buttonsStage || !buttonsLayer || !buttonsImg) return;
      var traceCtx = _shapeResizeTraceCtx;
      if (traceCtx && shapeResizeTraceEnabled()) {
        shapeResizeTrace('6.model-before-repaint(paintButtonsStage)', {
          btnId: traceCtx.btnId,
          sceneId: traceCtx.sceneId,
          path: 'paintButtonsStage',
          modelVm: readShapeTraceModel(traceCtx.sceneId, traceCtx.btnId),
          modelIx: readShapeTraceIxRaw(traceCtx.sceneId, traceCtx.btnId)
        });
      }
      /* V7.2.64 — paint free overlays whenever overlay is mounted (not mode-gated). */
      if (!overlayMode && canvas().editMode !== 'buttons') return;
      if (textEditEl && document.activeElement === textEditEl) return;
      /* Live path while dragging — never remount under an active pointer. */
      if ((buttonDrag && buttonDrag.live && !buttonDrag.nudge) ||
          (transformDrag && transformDrag.live)) {
        if (paintButtonsStageLive()) return;
      }
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      if (!n || !ExperienciaEngine.isButtonsEditableNode(n)) {
        if (buttonsEmpty) buttonsEmpty.hidden = false;
        if (buttonsFrame) buttonsFrame.hidden = true;
        buttonsLayer.innerHTML = '';
        return;
      }
      if (buttonsEmpty) buttonsEmpty.hidden = true;
      if (buttonsFrame) buttonsFrame.hidden = false;

      var media = ExperienciaEngine.resolveSceneMedia(state, n);
      var url = (media && (media.publicUrl || media.thumbnailUrl)) || '';
      if (url) {
        if (buttonsImg.getAttribute('src') !== url) {
          buttonsImg.onload = function () {
            recomputeOverlayLayout();
          };
          buttonsImg.src = url;
        }
        buttonsImg.hidden = false;
        buttonsImg.alt = media.filename || n.label || 'Escena';
      } else {
        buttonsImg.removeAttribute('src');
        buttonsImg.hidden = true;
        buttonsImg.alt = '';
      }

      var layerW = overlayLayerSize().w;
      var layerH = overlayLayerSize().h;
      var buttons = (ExperienciaEngine.listSceneButtons(state, n) || []).map(function (b) {
        if (!b || !b._ix || !ExperienciaEngine.buttonViewModel) return b;
        return ExperienciaEngine.buttonViewModel(state, n, b._ix, layerW, layerH);
      });
      var selIds = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.map(String)
        : [];
      if (!selIds.length && canvas().selectedButtonId) {
        selIds = [String(canvas().selectedButtonId)];
      }
      var selSet = {};
      selIds.forEach(function (id) { selSet[id] = true; });
      var guidesHtml = '';
      if (buttonDrag && buttonDrag.guides) {
        var g = buttonDrag.guides;
        var seenSpace = {};
        (g.spacing || []).forEach(function (s) {
          if (!s || s.px == null) return;
          var key = String(s.axis) + ':' + Math.round(Number(s.pos) * 10) + ':' +
            Math.round(Number(s.cross) * 10) + ':' + s.px;
          if (seenSpace[key]) return;
          seenSpace[key] = true;
          var label = String(s.px);
          var extra = s.uniform ? ' is-uniform' : ' is-near';
          if (s.axis === 'x') {
            guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-x' + extra +
              '" data-exp-space-guide="1" style="left:' +
              Number(s.pos) + '%;top:' + Number(s.cross) + '%"><span>' + esc(label) + '</span></div>';
          } else {
            guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-y' + extra +
              '" data-exp-space-guide="1" style="left:' +
              Number(s.cross) + '%;top:' + Number(s.pos) + '%"><span>' + esc(label) + '</span></div>';
          }
        });
      }
      buttonsLayer.innerHTML = guidesHtml + buttons.map(function (b) {
        if (!b) return '';
        var t = String(b.type || 'BUTTON').toUpperCase();
        var rot = Number(b.rotation) || 0;
        var paintX = Number(b.x);
        var paintY = Number(b.y);
        var gmPaint = null;
        if (isShapeType(t)) {
          gmPaint = shapeStagePaintMetrics(b, layerW, layerH);
          if (gmPaint) {
            paintX = gmPaint.x;
            paintY = gmPaint.y;
          }
        }
        var styleBits = 'left:' + paintX + '%;top:' + paintY + '%;' +
          '--btn-rot:' + rot + 'deg;';
        if (t === 'TEXT') {
          var tSize = Number(b.fontSize) || 28;
          var tOp = b.opacity != null ? Number(b.opacity) : 1;
          var fam = String(b.fontFamily || 'system-ui, sans-serif').replace(/"/g, '');
          var fw = String(b.fontWeight || '400');
          var isBold = fw === '700' || fw === 'bold';
          var align = String(b.textAlign || 'center');
          styleBits +=
            '--t-size:' + tSize + 'px;' +
            '--t-color:' + cssToken(b.color || '#ffffff') + ';' +
            '--t-family:' + JSON.stringify(fam) + ';' +
            '--t-weight:' + (isBold ? '700' : '400') + ';' +
            '--t-align:' + cssToken(align) + ';' +
            '--t-opacity:' + tOp + ';';
          return '<button type="button" class="' + buttonPreviewClass(b) +
            ' is-stage-text' +
            (selSet[String(b.id)] ? ' is-selected' : '') +
            (b.visible === false ? ' is-invisible' : '') +
            (b.locked ? ' is-locked' : '') +
            (pendingMoveIds[String(b.id)] ? ' is-pending-move' : '') +
            (isBold ? ' is-text-bold' : '') + '"' +
            ' data-exp-stage-btn="' + esc(b.id) + '"' +
            ' data-exp-stage-text="1"' +
            (b.locked ? ' data-locked="1"' : '') +
            ' style="' + styleBits + '">' +
            esc(b.label != null ? String(b.label) : 'Texto') +
          '</button>';
        }
        if (isShapeType(t)) {
          var shapeDefPaint = shapeDefaultSize(t);
          var paintSz = shapePaintSize(b, layerW, layerH);
          var shapeW = gmPaint ? gmPaint.w : paintSz.w;
          var shapeH = gmPaint ? gmPaint.h : paintSz.h;
          var shapeGizmoBox = !!(gmPaint && gmPaint.gizmoBox);
          styleBits += 'width:' + shapeW + '%;' +
            'height:' + shapeH + '%;' +
            'background:transparent;border:none;';

          return '<button type="button" class="' + buttonPreviewClass(b) +
            (selSet[String(b.id)] ? ' is-selected' : '') +
            (b.visible === false ? ' is-invisible' : '') +
            (b.locked ? ' is-locked' : '') +
            (pendingMoveIds[String(b.id)] ? ' is-pending-move' : '') + '"' +
            ' data-exp-stage-btn="' + esc(b.id) + '"' +
            (b.locked ? ' data-locked="1"' : '') +
            ' aria-label="' + esc(b.label || t) + '"' +
            ' style="' + styleBits + '">' +
            '<span class="builder-exp-stage-shape__hit" aria-hidden="true" style="' +
              shapeHitAreaStyle(t, b.shapeStretchX, b.shapeStretchY, b, layerW, layerH, shapeGizmoBox) + '"></span>' +
            shapeStageSvgHtml(b, t, layerW, layerH, {
              gizmoBox: shapeGizmoBox,
              shapeW: shapeW,
              shapeH: shapeH
            }) +
            '</button>';
        }
        var glyph = buttonIconGlyph(b.icon);
        var text = b.label != null ? String(b.label) : '';
        var label;
        if (glyph && text) label = glyph + ' ' + text;
        else label = glyph || text || 'Botón';
        var btnOp = b.opacity != null ? Number(b.opacity) : 1;
        var hoverOn = b.hoverEnabled !== false;
        var hoverMs = b.hoverTransition != null ? Number(b.hoverTransition) : 200;
        var hoverCol = cssToken(b.hoverColor || '#6fbf86') || '#6fbf86';
        var hoverTextCol = cssToken(b.hoverTextColor || '#ffffff') || '#ffffff';
        var pressedCol = cssToken(b.pressedColor || '#5aaa74') || '#5aaa74';
        var pressedTextCol = cssToken(b.pressedTextColor || '#ffffff') || '#ffffff';
        var pressedScale = b.pressedScale != null ? Number(b.pressedScale) : 0.96;
        var boxW = b.boxW != null ? Number(b.boxW) : 14;
        var boxH = b.boxH != null ? Number(b.boxH) : 4.5;
        var bgOp = b.bgOpacity != null ? Number(b.bgOpacity) : 1;
        styleBits +=
          'width:' + boxW + '%;height:' + boxH + '%;' +
          '--btn-opacity:' + btnOp + ';' +
          '--btn-hover-color:' + hoverCol + ';' +
          '--btn-hover-text:' + hoverTextCol + ';' +
          '--btn-hover-ms:' + hoverMs + 'ms;' +
          '--btn-pressed-color:' + pressedCol + ';' +
          '--btn-pressed-text:' + pressedTextCol + ';' +
          '--btn-pressed-scale:' + pressedScale + ';';
        if (b.bgColor) {
          styleBits += '--btn-local-bg:' + cssToken(b.bgColor) + ';' +
            '--btn-local-bg-a:' + bgOp + ';';
        }
        if (b.textColor) styleBits += '--btn-local-text:' + cssToken(b.textColor) + ';';
        if (b.borderColor) styleBits += '--btn-local-border:' + cssToken(b.borderColor) + ';';
        if (b.borderWidth != null) styleBits += '--btn-local-bw:' + Number(b.borderWidth) + 'px;';
        if (b.borderRadius != null) styleBits += '--btn-local-radius:' + Number(b.borderRadius) + 'px;';
        return '<button type="button" class="' + buttonPreviewClass(b) +
          ' is-box' +
          (selSet[String(b.id)] ? ' is-selected' : '') +
          (b.visible === false ? ' is-invisible' : '') +
          (b.locked ? ' is-locked' : '') +
          (pendingMoveIds[String(b.id)] ? ' is-pending-move' : '') +
          (hoverOn ? ' is-hover-on' : ' is-hover-off') +
          (b.bgColor || b.textColor || b.borderColor || b.borderWidth != null || b.borderRadius != null
            ? ' has-local-look' : '') + '"' +
          ' data-exp-stage-btn="' + esc(b.id) + '"' +
          (b.locked ? ' data-locked="1"' : '') +
          ' data-hover-color="' + esc(hoverCol) + '"' +
          ' data-hover-text="' + esc(hoverTextCol) + '"' +
          ' data-box-w="' + boxW + '" data-box-h="' + boxH + '"' +
          ' style="' + styleBits + '">' +
          esc(label) +
        '</button>';
      }).join('');

      /* Selection gizmos — full chrome (1 item) or box on every selected item (multi). */
      if (selIds.length) {
        var multiSel = selIds.length > 1;
        var gizmoHtml = '';
        selIds.forEach(function (sid) {
          var selBtn = getOverlayItemVm(canvas().selectedId, sid);
          if (!selBtn) {
            for (var gi = 0; gi < buttons.length; gi++) {
              if (buttons[gi] && String(buttons[gi].id) === String(sid)) {
                selBtn = buttons[gi];
                break;
              }
            }
          }
          var gizmoMetrics = null;
          if (isShapeBoxV2Active() && selBtn && isShapeType(selBtn.type)) {
            gizmoMetrics = shapeBoxToSelectionMetrics(
              getShapeBox(selBtn, layerW, layerH)
            );
          }
          gizmoHtml += buildOverlaySelectionGizmoHtml(selBtn, layerW, layerH, {
            multi: multiSel,
            metrics: gizmoMetrics
          });
        });
        if (gizmoHtml) buttonsLayer.innerHTML += gizmoHtml;
      }
      if (selIds.length && !isShapeBoxV2Active()) {
        requestAnimationFrame(function () {
          if (!buttonsLayer) return;
          selIds.forEach(function (sid) {
            var vmFit = getOverlayItemVm(canvas().selectedId, sid);
            if (!vmFit || !isShapeType(vmFit.type)) return;
            var domFit = applyShapeVisibleDomBox(sid, buttonsLayer, vmFit, layerW, layerH);
            if (domFit) updateGizmoBoxPct(sid, buttonsLayer, domFit);
          });
        });
      }
      requestAnimationFrame(syncButtonsLayerBounds);
      if (traceCtx && shapeResizeTraceEnabled()) {
        shapeResizeTrace('7.model-after-repaint(paintButtonsStage)', {
          btnId: traceCtx.btnId,
          sceneId: traceCtx.sceneId,
          path: 'paintButtonsStage',
          modelVm: readShapeTraceModel(traceCtx.sceneId, traceCtx.btnId),
          modelIx: readShapeTraceIxRaw(traceCtx.sceneId, traceCtx.btnId)
        });
        _shapeResizeTraceCtx = null;
      }
      if (shapeResizeDebugEnabled() && !buttonDrag && !transformDrag) {
        var debugIds = selIds.slice();
        var debugPhase = debugIds.length ? 'selection/paint' : 'paint/unselected';
        if (!debugIds.length) {
          buttons.forEach(function (b) {
            if (b && isShapeType(b.type)) debugIds.push(String(b.id));
          });
        }
        scheduleShapeDebugLog(debugPhase, debugIds);
      }
    }

    /** Mount gizmo chrome only — never remount shape nodes (avoids select flicker). */
    function mountOverlaySelectionGizmos(selIds) {
      if (!buttonsLayer || !selIds || !selIds.length) return;
      var sceneId = canvas().selectedId;
      if (!sceneId) return;
      var layerW = overlayLayerSize().w;
      var layerH = overlayLayerSize().h;
      var selSet = {};
      selIds.forEach(function (id) { selSet[String(id)] = true; });
      buttonsLayer.querySelectorAll('[data-exp-gizmo]').forEach(function (g) { g.remove(); });
      buttonsLayer.querySelectorAll('[data-exp-stage-btn]').forEach(function (el) {
        var id = el.getAttribute('data-exp-stage-btn');
        if (!id) return;
        if (selSet[String(id)]) el.classList.add('is-selected');
        else el.classList.remove('is-selected');
      });
      var multiSel = selIds.length > 1;
      var gizmoHtml = '';
      selIds.forEach(function (sid) {
        var selBtn = getOverlayItemVm(sceneId, sid);
        if (!selBtn) return;
        var gizmoMetrics = null;
        if (isShapeBoxV2Active() && isShapeType(selBtn.type)) {
          gizmoMetrics = shapeBoxToSelectionMetrics(
            getShapeBox(selBtn, layerW, layerH)
          );
        } else if (isShapeType(selBtn.type)) {
          gizmoMetrics = applyShapeVisibleDomBox(sid, buttonsLayer, selBtn, layerW, layerH);
        }
        gizmoHtml += buildOverlaySelectionGizmoHtml(selBtn, layerW, layerH, {
          multi: multiSel,
          metrics: gizmoMetrics
        });
      });
      if (gizmoHtml) buttonsLayer.insertAdjacentHTML('beforeend', gizmoHtml);
      requestAnimationFrame(syncButtonsLayerBounds);
    }

    /** Sync one shape node from model — no innerHTML remount (Genially-style stable box). */
    function syncOverlayShapeFromModel(sceneId, buttonId) {
      if (!buttonsLayer || !sceneId || !buttonId) return false;
      var traceSync = _shapeResizeTraceCtx &&
        String(_shapeResizeTraceCtx.btnId) === String(buttonId) &&
        String(_shapeResizeTraceCtx.sceneId) === String(sceneId);
      if (traceSync && shapeResizeTraceEnabled()) {
        shapeResizeTrace('6.model-before-repaint(syncOverlayShapeFromModel)', {
          btnId: buttonId,
          sceneId: sceneId,
          path: 'syncOverlayShapeFromModel',
          modelVm: readShapeTraceModel(sceneId, buttonId),
          modelIx: readShapeTraceIxRaw(sceneId, buttonId)
        });
        shapeTraceNum('6.beforeRepaint.modelIx', readShapeTraceIxRaw(sceneId, buttonId), 'pre-sync');
      }
      function traceSyncAfterRepaint(boxUsed) {
        if (!traceSync || !shapeResizeTraceEnabled()) return;
        shapeResizeTrace('7.model-after-repaint(syncOverlayShapeFromModel)', {
          btnId: buttonId,
          sceneId: sceneId,
          path: 'syncOverlayShapeFromModel',
          boxUsed: boxUsed || null,
          modelVm: readShapeTraceModel(sceneId, buttonId),
          modelIx: readShapeTraceIxRaw(sceneId, buttonId)
        });
        shapeTraceNumBox('7.boxUsed.getShapeBox', boxUsed, 'painted→DOM');
        shapeTraceNum('7.afterRepaint.modelIx', readShapeTraceIxRaw(sceneId, buttonId), 'post-sync');
        _shapeResizeTraceCtx = null;
      }
      var vm = getOverlayItemVm(sceneId, buttonId);
      if (!vm || !isShapeType(vm.type)) return false;
      var layerW = overlayLayerSize().w;
      var layerH = overlayLayerSize().h;
      var idEsc = String(buttonId).replace(/"/g, '');
      var el = buttonsLayer.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
      if (!el) return false;
      if (isShapeBoxV2Active()) {
        var boxSync = getShapeBox(vm, layerW, layerH);
        if (traceSync && shapeResizeTraceEnabled()) {
          shapeTraceNumBox('6.getShapeBox.preview', boxSync, 'will paint this');
        }
        if (!boxSync) return false;
        paintShapeNodeEl(el, boxSync, vm, layerW, layerH);
        traceSyncAfterRepaint({
          cx: boxSync.cx, cy: boxSync.cy, w: boxSync.w, h: boxSync.h,
          scaleX: vm.shapeStretchX, scaleY: vm.shapeStretchY
        });
        return true;
      }
      var paint = shapeStagePaintMetrics(vm, layerW, layerH);
      if (!paint) return false;
      var t = String(vm.type).toUpperCase();
      el.classList.remove('is-live-sizing', 'is-live-moving');
      el.style.removeProperty('overflow');
      el.style.removeProperty('transform');
      el.style.left = paint.x + '%';
      el.style.top = paint.y + '%';
      el.style.width = paint.w + '%';
      el.style.height = paint.h + '%';
      el.style.setProperty('--btn-rot', (Number(vm.rotation) || 0) + 'deg');
      var hit = el.querySelector('.builder-exp-stage-shape__hit');
      if (hit) {
        hit.style.cssText = shapeHitAreaStyle(
          t, vm.shapeStretchX, vm.shapeStretchY, vm, layerW, layerH, paint.gizmoBox
        );
      }
      if (paint.gizmoBox) {
        patchShapeSvgLive(el, t, {
          fill: vm.fill,
          stroke: vm.stroke,
          strokeWidth: vm.strokeWidth,
          borderRadius: vm.borderRadius
        }, vm.shapeStretchX, vm.shapeStretchY, {
          contentBoxWPct: paint.w,
          contentBoxHPct: paint.h,
          layerW: layerW,
          layerH: layerH
        });
      }
      traceSyncAfterRepaint({
        cx: paint.x, cy: paint.y, w: paint.w, h: paint.h,
        scaleX: vm.shapeStretchX, scaleY: vm.shapeStretchY
      });
      return true;
    }

    function syncHotspotsLayerBounds() {
      if (!hotspotsImg || !hotspotsLayer || !hotspotsFrame) return false;
      if (overlayMode) {
        hotspotsLayer.style.left = '0';
        hotspotsLayer.style.top = '0';
        hotspotsLayer.style.width = '100%';
        hotspotsLayer.style.height = '100%';
        return false;
      }
      if (hotspotsImg.hidden || !hotspotsImg.getAttribute('src')) {
        hotspotsLayer.style.left = '0';
        hotspotsLayer.style.top = '0';
        hotspotsLayer.style.width = '100%';
        hotspotsLayer.style.height = '100%';
        return false;
      }
      var fr = hotspotsFrame.getBoundingClientRect();
      var ir = hotspotsImg.getBoundingClientRect();
      if (!fr.width || !ir.width) return false;
      var nextLeft = Math.max(0, ir.left - fr.left) + 'px';
      var nextTop = Math.max(0, ir.top - fr.top) + 'px';
      var nextW = Math.max(1, ir.width) + 'px';
      var nextH = Math.max(1, ir.height) + 'px';
      var changed =
        hotspotsLayer.style.left !== nextLeft ||
        hotspotsLayer.style.top !== nextTop ||
        hotspotsLayer.style.width !== nextW ||
        hotspotsLayer.style.height !== nextH;
      hotspotsLayer.style.left = nextLeft;
      hotspotsLayer.style.top = nextTop;
      hotspotsLayer.style.width = nextW;
      hotspotsLayer.style.height = nextH;
      return changed;
    }

    function paintHotspotsStage() {
      if (!hotspotsStage || !hotspotsLayer || !hotspotsImg || !hotspotsSvg) return;
      /* V7.2.64 — always paint hotspots in overlay (Runtime parity). */
      if (!overlayMode && canvas().editMode !== 'hotspots') return;
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      if (!n || !ExperienciaEngine.isHotspotsEditableNode(n)) {
        if (hotspotsEmpty) hotspotsEmpty.hidden = false;
        if (hotspotsFrame) hotspotsFrame.hidden = true;
        hotspotsSvg.innerHTML = '';
        return;
      }
      if (hotspotsEmpty) hotspotsEmpty.hidden = true;
      if (hotspotsFrame) hotspotsFrame.hidden = false;

      var media = ExperienciaEngine.resolveSceneMedia(state, n);
      var url = (media && (media.publicUrl || media.thumbnailUrl)) || '';
      if (url) {
        if (hotspotsImg.getAttribute('src') !== url) {
          hotspotsImg.onload = function () { recomputeOverlayLayout(); };
          hotspotsImg.src = url;
        }
        hotspotsImg.hidden = false;
        hotspotsImg.alt = media.filename || n.label || 'Escena';
      } else {
        hotspotsImg.removeAttribute('src');
        hotspotsImg.hidden = true;
        hotspotsImg.alt = '';
      }

      var masks = ExperienciaEngine.listSceneHotspotMasks(state, n) || [];
      var selId = canvas().selectedHotspotId ? String(canvas().selectedHotspotId) : '';
      var svgParts = [];

      masks.forEach(function (m) {
        if (!m || !m.polygon || m.polygon.length < 2) return;
        var pts = m.polygon.map(function (p) {
          return Number(p.x) + ',' + Number(p.y);
        }).join(' ');
        var isSel = selId && String(m.id) === selId;
        var fillOp = isSel
          ? Math.max(0.08, Math.min(0.28, (Number(m.opacity) || 0.22) * 0.55))
          : 0.02;
        var strokeOp = m.visible === false ? 0.25 : 0.9;
        var cls = 'builder-exp-hs-poly' +
          (isSel ? ' is-selected' : '') +
          (m.visible === false ? ' is-invisible' : '') +
          (m.animation === 'pulse' ? ' is-anim-pulse' : '') +
          (m.animation === 'fade' ? ' is-anim-fade' : '');
        svgParts.push(
          '<polygon class="' + cls + '" data-exp-hs-poly="' + esc(m.id) + '"' +
          ' points="' + pts + '"' +
          ' fill="' + esc(m.color || '#6fbf86') + '"' +
          ' fill-opacity="' + fillOp + '"' +
          ' stroke="' + esc(m.color || '#6fbf86') + '"' +
          ' stroke-opacity="' + strokeOp + '"' +
          ' stroke-width="' + esc(String(m.borderWidth != null ? m.borderWidth : 1.5)) + '"' +
          ' vector-effect="non-scaling-stroke"></polygon>'
        );
        if (isSel) {
          m.polygon.forEach(function (p, idx) {
            svgParts.push(
              '<circle class="builder-exp-hs-vertex" data-exp-hs-vertex="' + esc(m.id) + '"' +
              ' data-exp-hs-vi="' + idx + '"' +
              ' cx="' + Number(p.x) + '" cy="' + Number(p.y) + '" r="1.1"></circle>'
            );
          });
        }
      });

      if (hotspotDraw && hotspotDraw.points && hotspotDraw.points.length) {
        var dPts = hotspotDraw.points.slice();
        if (hotspotDraw.cursor) dPts.push(hotspotDraw.cursor);
        var dStr = dPts.map(function (p) {
          return Number(p.x) + ',' + Number(p.y);
        }).join(' ');
        if (dPts.length >= 2) {
          svgParts.push(
            '<polyline class="builder-exp-hs-draft" points="' + dStr + '"' +
            ' fill="none" stroke="#6fbf86" stroke-width="1.5"' +
            ' stroke-dasharray="4 3" vector-effect="non-scaling-stroke"></polyline>'
          );
        }
        hotspotDraw.points.forEach(function (p) {
          svgParts.push(
            '<circle class="builder-exp-hs-draft-vertex" cx="' + Number(p.x) +
            '" cy="' + Number(p.y) + '" r="1.1"></circle>'
          );
        });
      }

      hotspotsSvg.setAttribute('viewBox', '0 0 100 100');
      hotspotsSvg.setAttribute('preserveAspectRatio', 'none');
      hotspotsSvg.innerHTML = svgParts.join('');
      requestAnimationFrame(syncHotspotsLayerBounds);
    }

    function hotspotPercentFromPointer(ev) {
      var el = hotspotsLayer || hotspotsFrame;
      if (!el) return { x: 50, y: 50 };
      var rect = el.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      var y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      return {
        x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
      };
    }

    function closeHotspotDraft() {
      if (!hotspotDraw || !hotspotDraw.points || hotspotDraw.points.length < 3) {
        hotspotDraw = null;
        paintHotspotsStage();
        return;
      }
      var sceneId = canvas().selectedId;
      var created = ExperienciaEngine.addSceneHotspotMask(
        state, sceneId, hotspotDraw.points
      );
      hotspotDraw = null;
      if (created) canvas().selectedHotspotId = created.id;
      paintHotspotsStage();
      paintInspector();
      persist();
    }

    function overlayHalfSizePct(btn) {
      if (!btn) return { w: 6, h: 4 };
      var t = String(btn.type || 'BUTTON').toUpperCase();
      if (t === 'OVERLAY_GROUP' || t === 'GROUP') {
        return {
          w: Math.max(0.5, (Number(btn.width) || 20) / 2),
          h: Math.max(0.5, (Number(btn.height) || 20) / 2)
        };
      }
      if (isShapeType(t)) {
        var szAlign = overlayLayerSize();
        var gmAlign = shapeGizmoMetrics(btn, szAlign.w, szAlign.h);
        if (gmAlign) {
          return {
            w: Math.max(0.5, gmAlign.gw / 2),
            h: Math.max(0.25, gmAlign.gh / 2)
          };
        }
      }
      if (t === 'BUTTON') {
        return {
          w: Math.max(0.5, (btn.boxW != null ? Number(btn.boxW) : 14) / 2),
          h: Math.max(0.5, (btn.boxH != null ? Number(btn.boxH) : 4.5) / 2)
        };
      }
      /* TEXT — loose box for edge snap */
      return { w: 4, h: 2 };
    }

    function listSceneSnapGuides() {
      if (typeof QuotationGuides === 'undefined' || !QuotationGuides.listActiveGuides) {
        return [];
      }
      try { return QuotationGuides.listActiveGuides() || []; } catch (eG) { return []; }
    }

    /**
     * Snap overlay center so left/center/right (and top/center/bottom) align to target lines.
     * Targets: canvas edges, peer edges/centers, red guides.
     */
    /** Snap so edges touch (0 gap): my left↔peer right, my right↔peer left, etc. */
    function snapPeerAdjacentEdges(x, y, halfW, halfH, peers, snapDist) {
      var SNAP = snapDist != null ? snapDist : 2.5;
      var hw = Math.max(0, Number(halfW) || 0);
      var hh = Math.max(0, Number(halfH) || 0);
      var bestX = null;
      var bestY = null;
      (peers || []).forEach(function (p) {
        if (!p) return;
        var oy = Math.min(y + hh, p.B) - Math.max(y - hh, p.T);
        if (oy > 0.15) {
          var touchRight = p.R + hw;
          var touchLeft = p.L - hw;
          var dR = Math.abs(x - touchRight);
          var dL = Math.abs(x - touchLeft);
          if (dR <= SNAP && (!bestX || dR < bestX.d)) {
            bestX = { d: dR, x: Math.round(touchRight * 10) / 10 };
          }
          if (dL <= SNAP && (!bestX || dL < bestX.d)) {
            bestX = { d: dL, x: Math.round(touchLeft * 10) / 10 };
          }
        }
        var ox = Math.min(x + hw, p.R) - Math.max(x - hw, p.L);
        if (ox > 0.15) {
          var touchBelow = p.B + hh;
          var touchAbove = p.T - hh;
          var dB = Math.abs(y - touchBelow);
          var dA = Math.abs(y - touchAbove);
          if (dB <= SNAP && (!bestY || dB < bestY.d)) {
            bestY = { d: dB, y: Math.round(touchBelow * 10) / 10 };
          }
          if (dA <= SNAP && (!bestY || dA < bestY.d)) {
            bestY = { d: dA, y: Math.round(touchAbove * 10) / 10 };
          }
        }
      });
      return {
        x: bestX ? bestX.x : x,
        y: bestY ? bestY.y : y,
        snappedX: !!bestX,
        snappedY: !!bestY
      };
    }

    function snapMoveToAlignLines(x, y, halfW, halfH, linesX, linesY, snapDist) {
      var SNAP = snapDist != null ? snapDist : 1.45;
      var hw = Math.max(0, Number(halfW) || 0);
      var hh = Math.max(0, Number(halfH) || 0);
      var bestDx = SNAP + 1;
      var bestDy = SNAP + 1;
      var sx = x;
      var sy = y;
      (linesX || []).forEach(function (pos) {
        var p = Number(pos);
        if (!isFinite(p)) return;
        [p, p + hw, p - hw].forEach(function (cand) {
          var d = Math.abs(x - cand);
          if (d <= SNAP && d < bestDx) {
            bestDx = d;
            sx = Math.round(cand * 10) / 10;
          }
        });
      });
      (linesY || []).forEach(function (pos) {
        var p = Number(pos);
        if (!isFinite(p)) return;
        [p, p + hh, p - hh].forEach(function (cand) {
          var d = Math.abs(y - cand);
          if (d <= SNAP && d < bestDy) {
            bestDy = d;
            sy = Math.round(cand * 10) / 10;
          }
        });
      });
      return {
        x: bestDx <= SNAP ? sx : x,
        y: bestDy <= SNAP ? sy : y,
        snappedX: bestDx <= SNAP,
        snappedY: bestDy <= SNAP
      };
    }

    /** Collect vertical/horizontal align lines: canvas, nearby peers, red guides. */
    function collectOverlayAlignLines(sceneId, excludeId, selfBox) {
      var linesX = [0, 50, 100];
      var linesY = [0, 50, 100];
      var NEAR = 10;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var list = ExperienciaEngine.listSceneButtons(state, n) || [];
      list.forEach(function (peer) {
        if (!peer || String(peer.id) === String(excludeId)) return;
        var ph = overlayHalfSizePct(peer);
        var px = Number(peer.x);
        var py = Number(peer.y);
        if (!isFinite(px) || !isFinite(py)) return;
        var peerBox = {
          L: px - ph.w, R: px + ph.w, T: py - ph.h, B: py + ph.h, cx: px, cy: py
        };
        if (selfBox) {
          if (peerNearOnAxis(selfBox, peerBox, 'x', NEAR)) {
            linesX.push(px, px - ph.w, px + ph.w);
          }
          if (peerNearOnAxis(selfBox, peerBox, 'y', NEAR)) {
            linesY.push(py, py - ph.h, py + ph.h);
          }
        } else {
          linesX.push(px, px - ph.w, px + ph.w);
          linesY.push(py, py - ph.h, py + ph.h);
        }
      });
      listSceneSnapGuides().forEach(function (g) {
        if (!g) return;
        var pos = Number(g.position);
        if (!isFinite(pos)) return;
        if (g.type === 'horizontal') linesY.push(pos);
        else linesX.push(pos);
      });
      return { x: linesX, y: linesY };
    }

    /** Snap center/edges of a free overlay to Quotation red guides. */
    function snapPointToSceneGuides(x, y, halfW, halfH) {
      var linesX = [];
      var linesY = [];
      listSceneSnapGuides().forEach(function (g) {
        if (!g) return;
        var pos = Number(g.position);
        if (!isFinite(pos)) return;
        if (g.type === 'horizontal') linesY.push(pos);
        else linesX.push(pos);
      });
      return snapMoveToAlignLines(x, y, halfW, halfH, linesX, linesY, 1.45);
    }

    /** Snap only the moving box edges (px) to align lines in %. Opposite edge stays pinned. */
    function snapResizeEdgesPx(Lpx, Rpx, Tpx, Bpx, mode, linesX, linesY, layerW, layerH, opts) {
      opts = opts || {};
      var snapPx = opts.snapPx != null ? opts.snapPx : 14;
      var minWpx = opts.minWpx != null ? opts.minWpx : 8;
      var minHpx = opts.minHpx != null ? opts.minHpx : 8;
      var m = String(mode || '');
      var moveE = m.indexOf('e') >= 0;
      var moveW = m.indexOf('w') >= 0;
      var moveS = m.indexOf('s') >= 0;
      var moveN = m.indexOf('n') >= 0;
      var fixL = opts.fixL != null ? opts.fixL : Lpx;
      var fixR = opts.fixR != null ? opts.fixR : Rpx;
      var fixT = opts.fixT != null ? opts.fixT : Tpx;
      var fixB = opts.fixB != null ? opts.fixB : Bpx;

      function snapEdgePx(edgePx, linesPct, dim) {
        var best = snapPx + 1;
        var hit = edgePx;
        (linesPct || []).forEach(function (p) {
          var linePx = (Number(p) / 100) * dim;
          if (!isFinite(linePx)) return;
          var d = Math.abs(edgePx - linePx);
          if (d <= snapPx && d < best) {
            best = d;
            hit = Math.round(linePx);
          }
        });
        return hit;
      }

      if (moveE && !moveW) {
        Rpx = snapEdgePx(Rpx, linesX, layerW);
        Rpx = Math.max(fixL + minWpx, Rpx);
        Lpx = fixL;
      } else if (moveW && !moveE) {
        Lpx = snapEdgePx(Lpx, linesX, layerW);
        Lpx = Math.min(fixR - minWpx, Lpx);
        Rpx = fixR;
      } else {
        if (moveE) Rpx = Math.max(Lpx + minWpx, snapEdgePx(Rpx, linesX, layerW));
        if (moveW) Lpx = Math.min(Rpx - minWpx, snapEdgePx(Lpx, linesX, layerW));
      }

      if (moveS && !moveN) {
        Bpx = snapEdgePx(Bpx, linesY, layerH);
        Bpx = Math.max(fixT + minHpx, Bpx);
        Tpx = fixT;
      } else if (moveN && !moveS) {
        Tpx = snapEdgePx(Tpx, linesY, layerH);
        Tpx = Math.min(fixB - minHpx, Tpx);
        Bpx = fixB;
      } else {
        if (moveS) Bpx = Math.max(Tpx + minHpx, snapEdgePx(Bpx, linesY, layerH));
        if (moveN) Tpx = Math.min(Bpx - minHpx, snapEdgePx(Tpx, linesY, layerH));
      }

      return { Lpx: Lpx, Rpx: Rpx, Tpx: Tpx, Bpx: Bpx };
    }

    /** Resize: snap moving edge only; never move the opposite (anchored) edge. */
    function snapBoxToSceneGuides(cx, cy, w, h, mode, opts) {
      opts = opts || {};
      var GUIDE_SNAP = opts.snapDist != null ? opts.snapDist : 1.2;
      if (!mode || mode === 'rotate') {
        return { x: cx, y: cy, w: w, h: h };
      }
      var m = String(mode || '');
      var left = cx - w / 2;
      var right = cx + w / 2;
      var top = cy - h / 2;
      var bottom = cy + h / 2;
      var fixL = left;
      var fixR = right;
      var fixT = top;
      var fixB = bottom;

      var linesX = [0, 50, 100];
      var linesY = [0, 50, 100];
      if (opts.linesX && opts.linesX.length) {
        linesX = linesX.concat(opts.linesX);
      }
      if (opts.linesY && opts.linesY.length) {
        linesY = linesY.concat(opts.linesY);
      }
      listSceneSnapGuides().forEach(function (g) {
        if (!g) return;
        var pos = Number(g.position);
        if (!isFinite(pos)) return;
        if (g.type === 'horizontal') linesY.push(pos);
        else linesX.push(pos);
      });

      function nearestLine(value, lines) {
        var best = GUIDE_SNAP + 1;
        var hit = value;
        (lines || []).forEach(function (pos) {
          var p = Number(pos);
          if (!isFinite(p)) return;
          var d = Math.abs(value - p);
          if (d <= GUIDE_SNAP && d < best) {
            best = d;
            hit = p;
          }
        });
        return best <= GUIDE_SNAP ? hit : value;
      }

      if (m.indexOf('e') >= 0) {
        right = nearestLine(right, linesX);
        w = Math.max(1.5, right - fixL);
        right = fixL + w;
        left = fixL;
      }
      if (m.indexOf('w') >= 0) {
        left = nearestLine(left, linesX);
        w = Math.max(1.5, fixR - left);
        left = fixR - w;
        right = fixR;
      }
      if (m.indexOf('s') >= 0) {
        bottom = nearestLine(bottom, linesY);
        h = Math.max(1.5, bottom - fixT);
        bottom = fixT + h;
        top = fixT;
      }
      if (m.indexOf('n') >= 0) {
        top = nearestLine(top, linesY);
        h = Math.max(1.5, fixB - top);
        top = fixB - h;
        bottom = fixB;
      }

      /* No center clamp / no rounding here — those slid the anchored edge. */
      return {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        w: Math.max(1.5, right - left),
        h: Math.max(1.5, bottom - top)
      };
    }

    /** Shift while dragging = lock to H or V; axis re-picks when Shift is pressed again. */
    function applyOverlayDragAxisLock(drag, ddx, ddy, shiftKey) {
      if (!drag) return { ddx: ddx, ddy: ddy };
      if (!shiftKey) {
        drag.axisLock = null;
        return { ddx: ddx, ddy: ddy };
      }
      if (!drag.axisLock) {
        drag.axisLock = Math.abs(ddx) >= Math.abs(ddy) ? 'x' : 'y';
      }
      if (drag.axisLock === 'x') return { ddx: ddx, ddy: 0 };
      return { ddx: 0, ddy: ddy };
    }

    function computeButtonGuides(sceneId, buttonId, x, y, opts) {
      opts = opts || {};
      var nx = x;
      var ny = y;
      var guides = { spacing: [], align: [] };
      /* Hold Alt while moving to bypass all snap (peers + red guides). */
      if (opts.disableSnap) {
        return { x: nx, y: ny, guides: guides };
      }
      var n = ExperienciaEngine.getNode(state, sceneId);
      var list = ExperienciaEngine.listSceneButtons(state, n) || [];
      var layerW = (buttonsLayer && buttonsLayer.clientWidth) || 1000;
      var layerH = (buttonsLayer && buttonsLayer.clientHeight) || 1000;
      var SNAP = 1.15;
      var SPACE_SNAP = 1.45;
      var selfBtn = getOverlayItemVm(sceneId, buttonId) ||
        ExperienciaEngine.getSceneButton(state, n, buttonId);
      var selfHalf = overlayHalfSizePct(selfBtn);
      var groupMemberSkip = null;
      if (selfBtn && (String(selfBtn.type || '').toUpperCase() === 'OVERLAY_GROUP' ||
          selfBtn._isGroup) && Array.isArray(selfBtn.memberIds)) {
        groupMemberSkip = {};
        selfBtn.memberIds.forEach(function (mid) {
          groupMemberSkip[String(mid)] = true;
        });
      } else if (selfBtn && selfBtn.groupId && canvas().activeOverlayGroupEditId &&
          String(selfBtn.groupId) === String(canvas().activeOverlayGroupEditId)) {
        var nEdit = ExperienciaEngine.getNode(state, sceneId);
        var gEdit = nEdit && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(nEdit, selfBtn.groupId)
          : null;
        if (gEdit && ExperienciaEngine.resolveOverlayGroupMemberIds) {
          groupMemberSkip = {};
          ExperienciaEngine.resolveOverlayGroupMemberIds(nEdit, gEdit, { repair: false })
            .forEach(function (mid) {
              if (String(mid) !== String(buttonId)) groupMemberSkip[String(mid)] = true;
            });
        }
      }

      function boxAt(btn, cx, cy) {
        var half = overlayHalfSizePct(btn);
        var bx = cx != null ? Number(cx) : Number(btn.x);
        var by = cy != null ? Number(cy) : Number(btn.y);
        return {
          id: btn && btn.id,
          L: bx - half.w,
          R: bx + half.w,
          T: by - half.h,
          B: by + half.h,
          cx: bx,
          cy: by,
          hw: half.w,
          hh: half.h
        };
      }

      function overlapLen(a0, a1, b0, b1) {
        return Math.min(a1, b1) - Math.max(a0, b0);
      }

      /* Soft canvas-center snap only first — peer edge snap runs AFTER equal-spacing
       * so copying nearby gaps is not stolen by a distant/near edge pull. */
      if (Math.abs(x - 50) <= SNAP) nx = 50;
      if (Math.abs(y - 50) <= SNAP) ny = 50;

      var selfProbe = {
        L: x - selfHalf.w,
        R: x + selfHalf.w,
        T: y - selfHalf.h,
        B: y + selfHalf.h,
        cx: x,
        cy: y
      };
      var peers = [];
      var NEAR_PEER = 10;
      list.forEach(function (peer) {
        if (!peer || String(peer.id) === String(buttonId)) return;
        if (groupMemberSkip && groupMemberSkip[String(peer.id)]) return;
        peers.push(boxAt(peer));
      });

      /* Edge-to-edge gaps between other overlays (for equal-spacing snap).
       * Cluster by column (cx) / row (cy) so mixed columns don't break consecutive gaps. */
      var knownGapsX = [];
      var knownGapsY = [];
      var COL_TOL = 5;
      var ROW_TOL = 5;
      function pushGapX(leftB, rightB) {
        if (!leftB || !rightB) return;
        var gapX = rightB.L - leftB.R;
        if (!(gapX > 0.15)) return;
        knownGapsX.push({
          gap: gapX,
          y: (Math.max(leftB.T, rightB.T) + Math.min(leftB.B, rightB.B)) / 2,
          left: leftB,
          right: rightB
        });
      }
      function pushGapY(topB, botB) {
        if (!topB || !botB) return;
        var gapY = botB.T - topB.B;
        if (!(gapY > 0.15)) return;
        knownGapsY.push({
          gap: gapY,
          x: (Math.max(topB.L, botB.L) + Math.min(topB.R, botB.R)) / 2,
          top: topB,
          bot: botB
        });
      }
      function clusterBy(key, tol) {
        var clusters = [];
        var sorted = peers.slice().sort(function (a, b) { return a[key] - b[key]; });
        sorted.forEach(function (p) {
          var placed = false;
          for (var c = 0; c < clusters.length; c++) {
            var mean = clusters[c].sum / clusters[c].items.length;
            if (Math.abs(p[key] - mean) <= tol) {
              clusters[c].items.push(p);
              clusters[c].sum += p[key];
              placed = true;
              break;
            }
          }
          if (!placed) clusters.push({ items: [p], sum: p[key] });
        });
        return clusters;
      }
      clusterBy('cx', COL_TOL).forEach(function (col) {
        var sorted = col.items.slice().sort(function (a, b) { return a.T - b.T; });
        for (var iy = 0; iy < sorted.length - 1; iy++) pushGapY(sorted[iy], sorted[iy + 1]);
      });
      clusterBy('cy', ROW_TOL).forEach(function (row) {
        var sorted = row.items.slice().sort(function (a, b) { return a.L - b.L; });
        for (var ix = 0; ix < sorted.length - 1; ix++) pushGapX(sorted[ix], sorted[ix + 1]);
      });

      function sameColumn(cx, p) {
        return Math.abs(cx - p.cx) <= COL_TOL ||
          overlapLen(cx - selfHalf.w, cx + selfHalf.w, p.L, p.R) > 0.2;
      }
      function sameRow(cy, p) {
        return Math.abs(cy - p.cy) <= ROW_TOL ||
          overlapLen(cy - selfHalf.h, cy + selfHalf.h, p.T, p.B) > 0.2;
      }

      /* Snap to equal edge spacing FIRST (Canva: copy nearby gaps). Pick best delta. */
      var equalSpaces = [];
      var snappedSpace = null;
      var SPACE_CATCH = Math.max(SPACE_SNAP, 2.8);
      var bestSpace = null;

      function considerSpace(cand) {
        if (!cand || !(cand.delta <= SPACE_CATCH)) return;
        if (!bestSpace || cand.delta < bestSpace.delta) bestSpace = cand;
      }

      knownGapsY.forEach(function (kg) {
        if (!(kg.gap > 0.15)) return;
        var px = Math.round(kg.gap / 100 * layerH);
        peers.forEach(function (p) {
          if (!sameColumn(nx, p)) return;
          var targetAbove = p.T - kg.gap - selfHalf.h;
          var targetBelow = p.B + kg.gap + selfHalf.h;
          var cross = (Math.max(p.L, nx - selfHalf.w) + Math.min(p.R, nx + selfHalf.w)) / 2;
          var refPos = (kg.top.B + kg.bot.T) / 2;
          considerSpace({
            delta: Math.abs(ny - targetAbove),
            nx: nx,
            ny: Math.round(targetAbove * 10) / 10,
            axis: 'y',
            gap: kg.gap,
            px: px,
            pills: [
              { axis: 'y', pos: (targetAbove + selfHalf.h + p.T) / 2, cross: cross, px: px, uniform: true },
              { axis: 'y', pos: refPos, cross: kg.x, px: px, uniform: true }
            ]
          });
          considerSpace({
            delta: Math.abs(ny - targetBelow),
            nx: nx,
            ny: Math.round(targetBelow * 10) / 10,
            axis: 'y',
            gap: kg.gap,
            px: px,
            pills: [
              { axis: 'y', pos: (p.B + targetBelow - selfHalf.h) / 2, cross: cross, px: px, uniform: true },
              { axis: 'y', pos: refPos, cross: kg.x, px: px, uniform: true }
            ]
          });
        });
      });
      knownGapsX.forEach(function (kg) {
        if (!(kg.gap > 0.15)) return;
        var px = Math.round(kg.gap / 100 * layerW);
        peers.forEach(function (p) {
          if (!sameRow(ny, p)) return;
          var targetLeft = p.L - kg.gap - selfHalf.w;
          var targetRight = p.R + kg.gap + selfHalf.w;
          var cross = (Math.max(p.T, ny - selfHalf.h) + Math.min(p.B, ny + selfHalf.h)) / 2;
          var refPos = (kg.left.R + kg.right.L) / 2;
          considerSpace({
            delta: Math.abs(nx - targetLeft),
            nx: Math.round(targetLeft * 10) / 10,
            ny: ny,
            axis: 'x',
            gap: kg.gap,
            px: px,
            pills: [
              { axis: 'x', pos: (targetLeft + selfHalf.w + p.L) / 2, cross: cross, px: px, uniform: true },
              { axis: 'x', pos: refPos, cross: kg.y, px: px, uniform: true }
            ]
          });
          considerSpace({
            delta: Math.abs(nx - targetRight),
            nx: Math.round(targetRight * 10) / 10,
            ny: ny,
            axis: 'x',
            gap: kg.gap,
            px: px,
            pills: [
              { axis: 'x', pos: (p.R + targetRight - selfHalf.w) / 2, cross: cross, px: px, uniform: true },
              { axis: 'x', pos: refPos, cross: kg.y, px: px, uniform: true }
            ]
          });
        });
      });

      /* Sandwich: equal gaps on both sides between two neighbors (within same row/col). */
      clusterBy('cy', ROW_TOL).forEach(function (row) {
        var sorted = row.items.slice().sort(function (a, b) { return a.L - b.L; });
        for (var si = 0; si < sorted.length - 1; si++) {
          var leftN = sorted[si];
          var rightN = sorted[si + 1];
          if (!sameRow(ny, leftN)) continue;
          var innerW = rightN.L - leftN.R;
          if (innerW <= selfHalf.w * 2 + 0.4) continue;
          var targetMidX = (leftN.R + rightN.L) / 2;
          var gapSand = (innerW - selfHalf.w * 2) / 2;
          var pxS = Math.round(gapSand / 100 * layerW);
          considerSpace({
            delta: Math.abs(nx - targetMidX),
            nx: Math.round(targetMidX * 10) / 10,
            ny: ny,
            axis: 'x',
            gap: gapSand,
            px: pxS,
            pills: [
              { axis: 'x', pos: (leftN.R + (targetMidX - selfHalf.w)) / 2, cross: ny, px: pxS, uniform: true },
              { axis: 'x', pos: ((targetMidX + selfHalf.w) + rightN.L) / 2, cross: ny, px: pxS, uniform: true }
            ]
          });
        }
      });
      clusterBy('cx', COL_TOL).forEach(function (col) {
        var sorted = col.items.slice().sort(function (a, b) { return a.T - b.T; });
        for (var sj = 0; sj < sorted.length - 1; sj++) {
          var topN = sorted[sj];
          var botN = sorted[sj + 1];
          if (!sameColumn(nx, topN)) continue;
          var innerH = botN.T - topN.B;
          if (innerH <= selfHalf.h * 2 + 0.4) continue;
          var targetMidY = (topN.B + botN.T) / 2;
          var gapSandY = (innerH - selfHalf.h * 2) / 2;
          var pxSY = Math.round(gapSandY / 100 * layerH);
          considerSpace({
            delta: Math.abs(ny - targetMidY),
            nx: nx,
            ny: Math.round(targetMidY * 10) / 10,
            axis: 'y',
            gap: gapSandY,
            px: pxSY,
            pills: [
              { axis: 'y', pos: (topN.B + (targetMidY - selfHalf.h)) / 2, cross: nx, px: pxSY, uniform: true },
              { axis: 'y', pos: ((targetMidY + selfHalf.h) + botN.T) / 2, cross: nx, px: pxSY, uniform: true }
            ]
          });
        }
      });

      if (bestSpace) {
        nx = bestSpace.nx;
        ny = bestSpace.ny;
        snappedSpace = { axis: bestSpace.axis, gap: bestSpace.gap, px: bestSpace.px };
        equalSpaces = bestSpace.pills || [];
      }

      /* Flush edge contact (0 gap) — wins over equal-spacing when closer to pointer. */
      var adjSnap = snapPeerAdjacentEdges(x, y, selfHalf.w, selfHalf.h, peers, 2.5);
      if (adjSnap.snappedX) {
        var spaceDx = snappedSpace ? Math.abs(x - nx) : Infinity;
        if (Math.abs(x - adjSnap.x) <= spaceDx) nx = adjSnap.x;
      }
      if (adjSnap.snappedY) {
        var spaceDy = snappedSpace ? Math.abs(y - ny) : Infinity;
        if (Math.abs(y - adjSnap.y) <= spaceDy) ny = adjSnap.y;
      }

      /* Peer center align — skip axes already flush-snapped to an edge. */
      if (!adjSnap.snappedX || !adjSnap.snappedY) {
        peers.forEach(function (pb) {
          if (!adjSnap.snappedX &&
              peerNearOnAxis(selfProbe, pb, 'x', NEAR_PEER) && Math.abs(nx - pb.cx) <= SNAP) {
            nx = pb.cx;
          }
          if (!adjSnap.snappedY &&
              peerNearOnAxis(selfProbe, pb, 'y', NEAR_PEER) && Math.abs(ny - pb.cy) <= SNAP) {
            ny = pb.cy;
          }
          var mirror = Math.round((100 - pb.cx) * 10) / 10;
          if (!adjSnap.snappedX &&
              peerNearOnAxis(selfProbe, pb, 'x', NEAR_PEER) && Math.abs(nx - mirror) <= SNAP) {
            nx = mirror;
          }
        });
      }
      var lines = collectOverlayAlignLines(sceneId, buttonId, {
        L: nx - selfHalf.w,
        R: nx + selfHalf.w,
        T: ny - selfHalf.h,
        B: ny + selfHalf.h,
        cx: nx,
        cy: ny
      });
      var alignSnap = snapMoveToAlignLines(nx, ny, selfHalf.w, selfHalf.h, lines.x, lines.y, 2.0);
      if (alignSnap.snappedX && !adjSnap.snappedX) nx = alignSnap.x;
      if (alignSnap.snappedY && !adjSnap.snappedY) ny = alignSnap.y;

      if (equalSpaces.length) {
        guides.spacing = equalSpaces;
      } else {
        /* Nearest edge-to-edge distance to a peer in the same column/row. */
        var selfBox = {
          L: nx - selfHalf.w,
          R: nx + selfHalf.w,
          T: ny - selfHalf.h,
          B: ny + selfHalf.h,
          cx: nx,
          cy: ny
        };
        var nearest = null;
        peers.forEach(function (p) {
          if (sameColumn(selfBox.cx, p)) {
            var gapY2 = null;
            var posY2 = null;
            if (selfBox.B <= p.T) {
              gapY2 = p.T - selfBox.B;
              posY2 = (selfBox.B + p.T) / 2;
            } else if (p.B <= selfBox.T) {
              gapY2 = selfBox.T - p.B;
              posY2 = (p.B + selfBox.T) / 2;
            }
            if (gapY2 != null && gapY2 > 0.15) {
              var entryY2 = {
                axis: 'y',
                pos: posY2,
                cross: (Math.max(selfBox.L, p.L) + Math.min(selfBox.R, p.R)) / 2,
                px: Math.round(gapY2 / 100 * layerH),
                gapPct: gapY2,
                uniform: false
              };
              if (!nearest || entryY2.gapPct < nearest.gapPct) nearest = entryY2;
            }
          }
          if (sameRow(selfBox.cy, p)) {
            var gapX2 = null;
            var posX2 = null;
            if (selfBox.R <= p.L) {
              gapX2 = p.L - selfBox.R;
              posX2 = (selfBox.R + p.L) / 2;
            } else if (p.R <= selfBox.L) {
              gapX2 = selfBox.L - p.R;
              posX2 = (p.R + selfBox.L) / 2;
            }
            if (gapX2 != null && gapX2 > 0.15) {
              var entryX2 = {
                axis: 'x',
                pos: posX2,
                cross: (Math.max(selfBox.T, p.T) + Math.min(selfBox.B, p.B)) / 2,
                px: Math.round(gapX2 / 100 * layerW),
                gapPct: gapX2,
                uniform: false
              };
              if (!nearest || entryX2.gapPct < nearest.gapPct) nearest = entryX2;
            }
          }
        });
        if (nearest) guides.spacing = [nearest];
      }

      /* Short match segments removed — spacing pills only. */

      return { x: nx, y: ny, guides: guides };
    }


    function overlaysEditable() {
      return canvas().editMode === 'buttons' || !!overlayMode;
    }

    function getSelectedOverlayIds() {
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.map(String)
        : [];
      if (!ids.length && canvas().selectedButtonId) {
        ids = [String(canvas().selectedButtonId)];
      }
      return ids;
    }

    function overlayLayerSize() {
      return {
        w: Math.max(1, (buttonsLayer && buttonsLayer.clientWidth) || 1000),
        h: Math.max(1, (buttonsLayer && buttonsLayer.clientHeight) || 1000)
      };
    }

    function percentFromPointer(ev) {
      var el = buttonsLayer || buttonsFrame;
      if (!el) return { x: 50, y: 50 };
      var rect = el.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      var y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      return {
        x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
      };
    }

    function setOverlayLivePosition(sceneId, buttonId, x, y) {
      var sz = overlayLayerSize();
      return ExperienciaEngine.setSceneButtonPosition(
        state, sceneId, buttonId, x, y, sz.w, sz.h
      );
    }

    function isOverlayGroupId(sceneId, id) {
      if (!sceneId || !id) return false;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var ix = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, id)
        : null;
      if (!ix && n && n.config && Array.isArray(n.config.interactions)) {
        n.config.interactions.some(function (item) {
          if (String(item.id) === String(id)) { ix = item; return true; }
          return false;
        });
      }
      return !!(ix && ExperienciaEngine.isOverlayGroupInteraction &&
        ExperienciaEngine.isOverlayGroupInteraction(ix));
    }

    function resolveOverlayPickId(sceneId, hitId) {
      if (!sceneId || !hitId) return hitId;
      if (canvas().activeOverlayGroupEditId) return hitId;
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n) return hitId;
      if (ExperienciaEngine.findOverlayGroupForMember) {
        var grp = ExperienciaEngine.findOverlayGroupForMember(n, hitId);
        if (grp) return String(grp.id);
      }
      var ix = null;
      (n.config.interactions || []).some(function (item) {
        if (String(item.id) === String(hitId)) { ix = item; return true; }
        return false;
      });
      if (ix && ix.groupId &&
          String(canvas().activeOverlayGroupEditId || '') !== String(ix.groupId)) {
        return String(ix.groupId);
      }
      return hitId;
    }

    function resolveGroupedOverlayHit(sceneId, hitId) {
      if (!sceneId || !hitId) return null;
      if (isOverlayGroupId(sceneId, hitId)) return null;
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n) {
        groupDebugLog('resolveGroupedOverlayHit: no node', { sceneId: sceneId, hitId: hitId });
        return null;
      }
      var g = ExperienciaEngine.findOverlayGroupForMember
        ? ExperienciaEngine.findOverlayGroupForMember(n, hitId)
        : null;
      if (!g) {
        var ix = ExperienciaEngine.getInteraction ? ExperienciaEngine.getInteraction(n, hitId) : null;
        var groupSummaries = [];
        (n.config && n.config.interactions || []).forEach(function (item) {
          if (!item || !ExperienciaEngine.isOverlayGroupInteraction ||
              !ExperienciaEngine.isOverlayGroupInteraction(item)) return;
          groupSummaries.push({
            id: item.id,
            memberIds: (item.memberIds || []).slice()
          });
        });
        groupDebugLog('resolveGroupedOverlayHit: miss', {
          hitId: hitId,
          ixGroupId: ix && ix.groupId,
          groups: groupSummaries
        });
        return null;
      }
      var hit = { groupId: String(g.id), childId: String(hitId) };
      groupDebugLog('resolveGroupedOverlayHit: hit', hit);
      return hit;
    }

    function maybeExpandGroupBoundsDuringEdit(groupId, sceneId) {
      if (!groupId || !sceneId || !ExperienciaEngine.expandOverlayGroupBoundsIfMemberOverflow) return;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var g = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, groupId)
        : null;
      if (!n || !g) return;
      var sz = overlayLayerSize();
      /* Grow stored group bounds if child overflows — keep pivot fixed (no relocalize jump). */
      ExperienciaEngine.expandOverlayGroupBoundsIfMemberOverflow(
        n, g, sz.w, sz.h, { keepPivot: true }
      );
    }

    function syncActiveGroupFrameFromMembers(groupId, sceneId) {
      if (!groupId || !sceneId || !ExperienciaEngine.syncOverlayGroupFrameFromMembers) return;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var g = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, groupId)
        : null;
      if (!n || !g) return;
      var sz = overlayLayerSize();
      ExperienciaEngine.syncOverlayGroupFrameFromMembers(n, g, sz.w, sz.h);
    }

    function enterOverlayGroupEditMode(groupId, childId) {
      if (!groupId || !childId) return false;
      groupDebugLog('enterOverlayGroupEditMode', { groupId: groupId, childId: childId });
      var sceneId = canvas().selectedId;
      canvas().activeOverlayGroupEditId = String(groupId);
      canvas().selectedButtonIds = [String(childId)];
      canvas().selectedButtonId = String(childId);
      groupEditTapArmed = null;
      groupEditPulse = null;
      if (buttonsLayer) buttonsLayer.classList.add('is-group-edit-mode');
      paintButtonsStage();
      paintInspector();
      notifyOverlaySelection();
      return true;
    }

    function exitOverlayGroupEditMode(opts) {
      opts = opts || {};
      var groupId = canvas().activeOverlayGroupEditId;
      if (!groupId) return false;
      groupDebugLog('exitOverlayGroupEditMode', { groupId: groupId, opts: opts });
      var sceneId = canvas().selectedId;
      canvas().activeOverlayGroupEditId = null;
      groupEditTapArmed = null;
      groupEditPulse = null;
      if (buttonsLayer) buttonsLayer.classList.remove('is-group-edit-mode');
      if (opts.sync !== false) maybeExpandGroupBoundsDuringEdit(groupId, sceneId);
      if (opts.reselectGroup !== false) {
        canvas().selectedButtonIds = [String(groupId)];
        canvas().selectedButtonId = String(groupId);
      }
      if (opts.paint !== false) {
        paintButtonsStage();
        paintInspector();
        notifyOverlaySelection();
      }
      if (opts.persist) persist();
      return true;
    }

    /** Hit-test stage child under pointer, ignoring gizmo chrome (group edit entry). */
    function pickGroupedChildAtClient(clientX, clientY, sceneId, groupId) {
      if (!buttonsLayer || !sceneId || !groupId) return null;
      var gizmos = buttonsLayer.querySelectorAll('[data-exp-gizmo]');
      var peRestore = [];
      for (var gi = 0; gi < gizmos.length; gi++) {
        peRestore.push(gizmos[gi].style.pointerEvents);
        gizmos[gi].style.pointerEvents = 'none';
      }
      var under = document.elementFromPoint(clientX, clientY);
      for (var gj = 0; gj < gizmos.length; gj++) {
        gizmos[gj].style.pointerEvents = peRestore[gj] || '';
      }
      if (!under || !buttonsLayer.contains(under)) return null;
      var hit = under.closest && under.closest('[data-exp-stage-btn]');
      if (!hit) return null;
      var bid = hit.getAttribute('data-exp-stage-btn');
      var grouped = resolveGroupedOverlayHit(sceneId, bid);
      if (!grouped || String(grouped.groupId) !== String(groupId)) return null;
      return bid;
    }

    function resolveGroupedChildFromEvent(ev, sceneId) {
      if (!ev || !sceneId || !buttonsLayer) return null;
      var hit = ev.target && ev.target.closest && ev.target.closest('[data-exp-stage-btn]');
      if (hit) {
        var bid = hit.getAttribute('data-exp-stage-btn');
        return resolveGroupedOverlayHit(sceneId, bid);
      }
      var gizmo = ev.target && ev.target.closest && ev.target.closest('[data-exp-gizmo]');
      if (!gizmo) return null;
      var gtype = gizmo.getAttribute('data-gizmo-type') || '';
      if (gtype !== 'OVERLAY_GROUP' && gtype !== 'GROUP') return null;
      var groupId = gizmo.getAttribute('data-gizmo-id');
      var childId = pickGroupedChildAtClient(ev.clientX, ev.clientY, sceneId, groupId);
      if (!childId) {
        var nG = ExperienciaEngine.getNode(state, sceneId);
        var gIx = nG && ExperienciaEngine.getInteraction
          ? ExperienciaEngine.getInteraction(nG, groupId)
          : null;
        if (gIx && gIx.memberIds && gIx.memberIds.length) {
          childId = String(gIx.memberIds[0]);
        }
      }
      if (!childId) return null;
      return { groupId: String(groupId), childId: String(childId) };
    }

    function commitGroupBoundsIfNeeded(sceneId, groupId) {
      if (!sceneId || !groupId || !ExperienciaEngine.commitOverlayGroupBounds) return;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var g = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, groupId)
        : null;
      if (!n || !g) return;
      var sz = overlayLayerSize();
      ExperienciaEngine.commitOverlayGroupBounds(n, g, sz.w, sz.h);
    }

    /** After a live group translate — refresh frame size only; skip sync (relocalize jumps snap). */
    function finalizeOverlayGroupMoveFrame(sceneId, groupId) {
      if (!sceneId || !groupId || !ExperienciaEngine.getSceneOverlayItem) return;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var g = n && ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(n, groupId)
        : null;
      if (!n || !g) return;
      var sz = overlayLayerSize();
      var vm = ExperienciaEngine.getSceneOverlayItem(state, n, groupId, sz.w, sz.h);
      if (!vm) return;
      g.width = Number(vm.width) || g.width;
      g.height = Number(vm.height) || g.height;
      g._baseWidth = g.width;
      g._baseHeight = g.height;
    }

    function getOverlayItemVm(sceneId, itemId) {
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n || !itemId) return null;
      var sz = overlayLayerSize();
      if (ExperienciaEngine.getSceneOverlayItem) {
        return ExperienciaEngine.getSceneOverlayItem(state, n, itemId, sz.w, sz.h);
      }
      return ExperienciaEngine.getSceneButton(state, n, itemId);
    }

    /** Temporary — compare model tile vs gizmo vs DOM for shape resize bug. */
    function logShapeVsGizmo(phase, btnId, extra) {
      if (!shapeResizeDebugEnabled() || !buttonsLayer || !btnId) return;
      var sceneId = canvas().selectedId;
      var vm = getOverlayItemVm(sceneId, btnId);
      if (!vm || !isShapeType(vm.type)) return;
      var layerW = overlayLayerSize().w;
      var layerH = overlayLayerSize().h;
      var idEsc = String(btnId).replace(/"/g, '');
      var shapeEl = buttonsLayer.querySelector('[data-exp-stage-btn="' + idEsc + '"]');
      var gizmoEl = buttonsLayer.querySelector('[data-exp-gizmo][data-gizmo-id="' + idEsc + '"]');
      var tilePaint = shapePaintSize(vm, layerW, layerH);
      var gizmo = shapeGizmoMetrics(vm, layerW, layerH);
      var stagePaint = shapeStagePaintMetrics(vm, layerW, layerH);
      var shapeBoxV2On = isShapeBoxV2Active();
      var shapeBox = shapeBoxV2On ? getShapeBox(vm, layerW, layerH) : null;
      var domShape = domBoxPctFromEl(shapeEl, buttonsLayer);
      var domGizmo = domBoxPctFromEl(gizmoEl, buttonsLayer);
      var delta = null;
      if (domShape && domGizmo) {
        delta = {
          dGx: +(domShape.gx - domGizmo.gx).toFixed(4),
          dGy: +(domShape.gy - domGizmo.gy).toFixed(4),
          dGw: +(domShape.gw - domGizmo.gw).toFixed(4),
          dGh: +(domShape.gh - domGizmo.gh).toFixed(4)
        };
      }
      var ix = vm._ix || vm;
      console.log(
        '%c[SHAPE-DEBUG] ' + phase,
        'color:#6cf;font-weight:bold',
        {
          btnId: String(btnId),
          type: String(vm.type || '').toUpperCase(),
          layer: { w: layerW, h: layerH },
          model: {
            tileCenter: {
              x: Number(vm.x),
              y: Number(vm.y),
              storedX: vm.storedX,
              storedY: vm.storedY
            },
            width: vm.width,
            height: vm.height,
            shapeContentBox: !!ix.shapeContentBox,
            stretch: shapeStretchFromBtn(vm),
            tilePaint: tilePaint,
            gizmoMetrics: gizmo,
            stagePaint: stagePaint,
            shapeBoxV2Active: shapeBoxV2On,
            shapeBox: shapeBox
          },
          dom: {
            shape: domShape,
            gizmo: domGizmo,
            shapeInline: shapeEl ? {
              left: shapeEl.style.left,
              top: shapeEl.style.top,
              width: shapeEl.style.width,
              height: shapeEl.style.height,
              transform: shapeEl.style.transform
            } : null,
            gizmoInline: gizmoEl ? {
              left: gizmoEl.style.left,
              top: gizmoEl.style.top,
              width: gizmoEl.style.width,
              height: gizmoEl.style.height
            } : null,
            deltaShapeMinusGizmo: delta
          },
          extra: extra || null
        }
      );
    }

    function scheduleShapeDebugLog(phase, btnIds, extra) {
      if (!shapeResizeDebugEnabled() || !btnIds || !btnIds.length) return;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          btnIds.forEach(function (id) {
            logShapeVsGizmo(phase, id, extra);
          });
        });
      });
    }

    function buildOverlayDragOrigins(sceneId, ids) {
      var origins = {};
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n || !ids || !ids.length) return origins;
      ids.forEach(function (id) {
        if (isOverlayGroupId(sceneId, id)) {
          var gvm = getOverlayItemVm(sceneId, id);
          if (!gvm || gvm.locked) return;
          origins[String(id)] = {
            x: gvm.storedX != null ? Number(gvm.storedX) : Number(gvm.x) || 50,
            y: gvm.storedY != null ? Number(gvm.storedY) : Number(gvm.y) || 50
          };
          return;
        }
        var b = ExperienciaEngine.getSceneButton(state, n, id);
        if (!b || b.locked) return;
        origins[String(id)] = {
          x: b.storedX != null ? Number(b.storedX) : Number(b.x) || 50,
          y: b.storedY != null ? Number(b.storedY) : Number(b.y) || 50
        };
      });
      return origins;
    }

    function restoreOverlayDragOrigins(sceneId, origins) {
      if (!sceneId || !origins) return;
      var sz = overlayLayerSize();
      Object.keys(origins).forEach(function (id) {
        var o = origins[id];
        if (!o) return;
        ExperienciaEngine.setSceneButtonPosition(
          state, sceneId, id, o.x, o.y, sz.w, sz.h
        );
      });
    }

    function nudgeSelectedButtons(dxPx, dyPx) {
      if (!overlaysEditable()) return false;
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.slice()
        : [];
      if (!ids.length && canvas().selectedButtonId) ids = [canvas().selectedButtonId];
      if (!ids.length) return false;
      var layerW = Math.max(1, (buttonsLayer && buttonsLayer.clientWidth) || 1000);
      var layerH = Math.max(1, (buttonsLayer && buttonsLayer.clientHeight) || 1000);
      var dx = (Number(dxPx) || 0) / layerW * 100;
      var dy = (Number(dyPx) || 0) / layerH * 100;
      if (!dx && !dy) return false;
      armButtonOp(sceneId);
      buttonNudgeDirty = true;
      var single = ids.length === 1;
      if (single && isOverlayGroupId(sceneId, ids[0]) &&
          ExperienciaEngine.updateOverlayGroupTransform) {
        var gNudge = getOverlayItemVm(sceneId, ids[0]);
        if (!gNudge || gNudge.locked) return false;
        var gx0 = gNudge.storedX != null ? Number(gNudge.storedX) : Number(gNudge.x);
        var gy0 = gNudge.storedY != null ? Number(gNudge.storedY) : Number(gNudge.y);
        ExperienciaEngine.updateOverlayGroupTransform(state, sceneId, ids[0], {
          x: gx0 + dx,
          y: gy0 + dy,
          live: true,
          layerW: layerW,
          layerH: layerH
        });
        buttonDrag = { buttonId: ids[0], sceneId: sceneId, guides: { spacing: [] }, nudge: true };
        paintButtonsStage();
        return true;
      }
      ids.forEach(function (bid) {
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid);
        if (!btn || btn.locked) return;
        var x0 = btn.storedX != null ? Number(btn.storedX) : Number(btn.x);
        var y0 = btn.storedY != null ? Number(btn.storedY) : Number(btn.y);
        var nextX = x0 + dx;
        var nextY = y0 + dy;
        if (single) {
          var snapped = computeButtonGuides(sceneId, bid, nextX, nextY);
          buttonDrag = {
            buttonId: bid,
            sceneId: sceneId,
            guides: snapped.guides,
            nudge: true
          };
          nextX = snapped.x;
          nextY = snapped.y;
        } else {
          buttonDrag = {
            buttonId: bid,
            sceneId: sceneId,
            guides: { spacing: [] },
            nudge: true
          };
        }
        ExperienciaEngine.setSceneButtonPosition(
          state, sceneId, bid, nextX, nextY, layerW, layerH
        );
        clearPendingMove(bid);
      });
      paintButtonsStage();
      return true;
    }

    function clearPendingMove(buttonId) {
      if (buttonId == null) {
        pendingMoveIds = {};
        return;
      }
      if (pendingMoveIds[String(buttonId)]) {
        delete pendingMoveIds[String(buttonId)];
      }
    }

    function markPendingMove(buttonId) {
      if (buttonId == null) return;
      pendingMoveIds[String(buttonId)] = true;
    }

    function copySelectedButtons() {
      if (!overlaysEditable()) return false;
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.slice()
        : [];
      if (!ids.length && canvas().selectedButtonId) ids = [canvas().selectedButtonId];
      if (!ids.length) return false;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var layerW = Math.max(1, (buttonsLayer && buttonsLayer.clientWidth) || 1000);
      var layerH = Math.max(1, (buttonsLayer && buttonsLayer.clientHeight) || 1000);
      var items = [];
      ids.forEach(function (id) {
        var b = ExperienciaEngine.getSceneButton(state, n, id);
        if (!b || !b._ix) return;
        var vm = ExperienciaEngine.buttonViewModel
          ? ExperienciaEngine.buttonViewModel(state, n, b._ix, layerW, layerH)
          : b;
        var layout = { x: vm.x, y: vm.y };
        var snap;
        try {
          snap = JSON.parse(JSON.stringify(b._ix));
        } catch (eClone) {
          return;
        }
        delete snap.id;
        delete snap.portId;
        snap.x = Number(layout.x);
        snap.y = Number(layout.y);
        snap.positionMode = 'free';
        snap.positionInitialized = true;
        snap.visible = b.visible !== false;
        snap.type = String(b.type || snap.type || 'BUTTON').toUpperCase();
        items.push(snap);
      });
      if (!items.length) return false;
      buttonClipboard = { items: items, fromCut: false };
      return true;
    }

    function cutSelectedButtons() {
      if (!copySelectedButtons()) return false;
      buttonClipboard.fromCut = true;
      var sceneId = canvas().selectedId;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.slice()
        : [];
      if (!ids.length && canvas().selectedButtonId) ids = [canvas().selectedButtonId];
      if (!sceneId || !ids.length || !ExperienciaEngine.removeSceneButton) return false;
      pushButtonHistory(sceneId);
      ids.forEach(function (bid) {
        ExperienciaEngine.removeSceneButton(state, sceneId, bid);
      });
      canvas().selectedButtonId = null;
      canvas().selectedButtonIds = [];
      paintButtonsStage();
      paintInspector();
      persist();
      notifyOverlaySelection();
      return true;
    }

    function pasteCopiedButtons() {
      if (!overlaysEditable()) return false;
      if (!buttonClipboard || !buttonClipboard.items || !buttonClipboard.items.length) {
        return false;
      }
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      if (!ExperienciaEngine.createSceneButtonFromSnapshot) return false;
      pushButtonHistory(sceneId);
      var pastedIds = [];
      buttonClipboard.items.forEach(function (item) {
        var snap = {};
        try { snap = JSON.parse(JSON.stringify(item)); } catch (eS) { snap = item; }
        snap.x = Number(snap.x);
        snap.y = Number(snap.y);
        var copy = ExperienciaEngine.createSceneButtonFromSnapshot(state, sceneId, snap);
        if (copy && copy.id) {
          pastedIds.push(String(copy.id));
          markPendingMove(copy.id);
        }
      });
      if (!pastedIds.length) return false;
      buttonClipboard.fromCut = false;
      canvas().selectedButtonIds = pastedIds.slice();
      canvas().selectedButtonId = pastedIds[pastedIds.length - 1];
      paintButtonsStage();
      paintInspector();
      persist();
      notifyOverlaySelection();
      return true;
    }

    function finishButtonNudge() {
      if (!buttonNudgeDirty && !(buttonDrag && buttonDrag.nudge)) return;
      buttonNudgeDirty = false;
      buttonDrag = null;
      endButtonOp();
      paintButtonsStage();
      paintInspector();
      persist();
    }

    function syncToolUi() {
      var tool = canvas().tool || 'select';
      if (tool === 'connect') {
        tool = 'select';
        canvas().tool = 'select';
      }
      rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
        var t = btn.getAttribute('data-exp-tool');
        var isMode = t === 'select' || t === 'cut';
        btn.classList.toggle('is-active', isMode && t === tool);
      });
      viewport.classList.toggle('is-cut', tool === 'cut');
      viewport.classList.remove('is-connect');
    }

    function selectNode(id, opts) {
      opts = opts || {};
      if (!opts.keepInteraction) {
        canvas().selectedInteractionId = null;
        canvas().selectedInteractionSceneId = null;
      }
      if (!opts.keepButton) {
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
      }
      if (!opts.keepHotspot) {
        canvas().selectedHotspotId = null;
        hotspotDraw = null;
      }
      if (opts.toggle && id) {
        ExperienciaEngine.toggleSelectionId(state, id);
      } else if (opts.add && id) {
        var ids = selectedIds();
        if (ids.indexOf(id) < 0) ids.push(id);
        ExperienciaEngine.setSelection(state, ids, []);
      } else {
        ExperienciaEngine.setSelection(state, id ? [id] : [], []);
      }
      var next = ExperienciaEngine.getNode(state, canvas().selectedId);
      var editable = next && ExperienciaEngine.isButtonsEditableNode &&
        ExperienciaEngine.isButtonsEditableNode(next);
      if (!editable && (canvas().editMode === 'buttons' || canvas().editMode === 'hotspots')) {
        canvas().editMode = 'flow';
      }
      if (id || selectedIds().length) {
        openPropertiesRail();
      }
      renderAll();
      persist();
    }

    function selectInteraction(sceneId, ixId) {
      ExperienciaEngine.setSelection(state, sceneId ? [sceneId] : [], []);
      canvas().selectedInteractionId = ixId || null;
      canvas().selectedInteractionSceneId = sceneId || null;
      openPropertiesRail();
      renderAll();
      persist();
    }

    function openAddElementMenu(sceneId, clientXY) {
      pendingCreate = { sceneId: sceneId, mode: 'add-element' };
      ctxMode = { type: 'add-element', sceneId: sceneId };
      if (!ctxEl) return;
      ctxEl.innerHTML = addElementMenuHtml();
      positionCtxMenu(clientXY.x, clientXY.y);
    }

    function selectEdge(id) {
      ExperienciaEngine.setSelection(state, [], id ? [id] : []);
      if (id) openPropertiesRail();
      renderAll();
      persist();
    }

    function clearAllSelection() {
      ExperienciaEngine.clearSelection(state);
      renderAll();
      persist();
    }

    function positionCtxMenu(clientX, clientY) {
      if (!ctxEl || !stage) return;
      ctxEl.hidden = false;
      var stageRect = stage.getBoundingClientRect();
      var panel = ctxEl.querySelector('.builder-exp-ctx__panel');
      var pw = (panel && panel.offsetWidth) || 260;
      var ph = (panel && panel.offsetHeight) || 280;
      var left = clientX - stageRect.left;
      var top = clientY - stageRect.top;
      left = Math.max(8, Math.min(left, stageRect.width - pw - 8));
      top = Math.max(8, Math.min(top, stageRect.height - ph - 8));
      ctxEl.style.left = left + 'px';
      ctxEl.style.top = top + 'px';
    }

    function hideCtx() {
      if (ctxEl) { ctxEl.hidden = true; ctxEl.innerHTML = ''; }
      pendingCreate = null;
      ctxMode = null;
    }

    function hidePicker() {
      if (pickerEl) { pickerEl.hidden = true; pickerEl.innerHTML = ''; }
    }

    function openCreateMenu(worldPt, fromMeta, clientXY, title) {
      pendingCreate = {
        at: worldPt,
        fromId: fromMeta && fromMeta.fromId,
        portId: fromMeta && (fromMeta.portId || fromMeta.sourcePortId),
        portLabel: fromMeta && fromMeta.portLabel,
        sourcePortId: fromMeta && (fromMeta.sourcePortId || fromMeta.portId),
        targetPortId: (fromMeta && fromMeta.targetPortId) || 'in',
        fromInteraction: !!(fromMeta && fromMeta.fromInteraction)
      };
      pendingCreate.menu = (ExperienciaEngine.menuForContext
        ? ExperienciaEngine.menuForContext(pendingCreate)
        : ExperienciaEngine.CREATE_MENU) || ExperienciaEngine.CREATE_MENU;
      ctxMode = 'create';
      if (!ctxEl) return;
      var menuTitle = title ||
        (pendingCreate.fromId ? '¿Qué quieres que ocurra?' : '¿Qué quieres crear?');
      ctxEl.innerHTML = createMenuHtml(menuTitle, pendingCreate.menu);
      if (clientXY) positionCtxMenu(clientXY.x, clientXY.y);
      else {
        ctxEl.hidden = false;
        var rect = viewport.getBoundingClientRect();
        var c = canvas();
        var left = worldPt.x * c.zoom + c.panX;
        var top = worldPt.y * c.zoom + c.panY;
        left = Math.max(8, Math.min(left, rect.width - 280));
        top = Math.max(8, Math.min(top, rect.height - 320));
        ctxEl.style.left = left + 'px';
        ctxEl.style.top = top + 'px';
      }
    }

    function runInteractionAction(act, sceneId, ixId) {
      if (!sceneId || !ixId) return;
      var ix = ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(state, sceneId, ixId)
        : null;
      if (!ix && act !== 'del' && act !== 'delete') return;
      if (act === 'rename') {
        hideCtx();
        /* Focus inspector name field — no native prompt */
        selectInteraction(sceneId, ixId);
        requestAnimationFrame(function () {
          var inp = inspectorBody && inspectorBody.querySelector('[data-exp-ix-label]');
          if (inp) {
            try { inp.focus(); inp.select(); } catch (eR) {}
          }
        });
        return;
      } else if (act === 'toggle') {
        ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
          enabled: !(ix.enabled !== false)
        });
      } else if (act === 'dup' || act === 'duplicate') {
        ExperienciaEngine.duplicateInteraction(state, sceneId, ixId);
      } else if (act === 'unlink') {
        /* Solo quita conexiones del puerto; conserva la interacción */
        var exp = ExperienciaEngine.ensureState(state);
        var portId = ix.portId || ix.id;
        exp.edges = (exp.edges || []).filter(function (ed) {
          var from = ed.sourceNodeId || ed.from;
          var pid = ed.sourcePortId || ed.portId;
          return !(from === sceneId && pid === portId);
        });
      } else if (act === 'del' || act === 'delete') {
        boxiesConfirm({
          title: 'Eliminar elemento',
          message: '¿Eliminar esta interacción? Su escena destino se conserva.',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          ExperienciaEngine.removeInteraction(state, sceneId, ixId);
          hideCtx();
          renderAll();
          persist();
        });
        return;
      } else if (act === 'configure') {
        selectNode(sceneId);
        openPropertiesRail();
      }
      hideCtx();
      renderAll();
      persist();
    }

    function openInteractionContextMenu(clientX, clientY, sceneId, ixId) {
      var scene = ExperienciaEngine.getNode(state, sceneId);
      var ix = ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(state, sceneId, ixId)
        : null;
      if (!scene || !ix) return;
      ExperienciaEngine.setSelection(state, [sceneId], []);
      openPropertiesRail();
      ctxMode = { type: 'interaction', sceneId: sceneId, ixId: ixId };
      if (!ctxEl) return;
      ctxEl.innerHTML = interactionContextMenuHtml(ix);
      positionCtxMenu(clientX, clientY);
      paintNodes();
      paintInspector();
    }

    function openNodeContextMenu(clientX, clientY, nodeId) {
      var ids = selectedIds();
      if (!ids.length || ids.indexOf(nodeId) < 0) {
        ExperienciaEngine.setSelection(state, [nodeId], []);
        ids = [nodeId];
        paintNodes();
      }
      var nodes = ids.map(function (id) {
        return ExperienciaEngine.getNode(state, id);
      }).filter(Boolean);
      ctxMode = 'node';
      pendingCreate = null;
      if (!ctxEl) return;
      ctxEl.innerHTML = nodeContextMenuHtml(nodes);
      positionCtxMenu(clientX, clientY);
    }

    function openEdgeContextMenu(clientX, clientY, edgeId) {
      selectEdge(edgeId);
      ctxMode = 'edge';
      pendingCreate = null;
      if (!ctxEl) return;
      ctxEl.innerHTML = edgeContextMenuHtml();
      positionCtxMenu(clientX, clientY);
    }

    function updateMarqueeVisual() {
      if (!marqueeEl || !marquee) {
        if (marqueeEl) marqueeEl.hidden = true;
        return;
      }
      var x1 = Math.min(marquee.x0, marquee.x1);
      var y1 = Math.min(marquee.y0, marquee.y1);
      var x2 = Math.max(marquee.x0, marquee.x1);
      var y2 = Math.max(marquee.y0, marquee.y1);
      marqueeEl.hidden = false;
      marqueeEl.style.left = x1 + 'px';
      marqueeEl.style.top = y1 + 'px';
      marqueeEl.style.width = Math.max(1, x2 - x1) + 'px';
      marqueeEl.style.height = Math.max(1, y2 - y1) + 'px';
    }

    function nodesInMarquee() {
      if (!marquee) return [];
      var x1 = Math.min(marquee.x0, marquee.x1);
      var y1 = Math.min(marquee.y0, marquee.y1);
      var x2 = Math.max(marquee.x0, marquee.x1);
      var y2 = Math.max(marquee.y0, marquee.y1);
      return ExperienciaEngine.visibleNodes(state).filter(function (n) {
        if (n.x == null || n.y == null) return false;
        var s = ExperienciaEngine.nodeSize(n);
        var nx1 = n.x;
        var ny1 = n.y;
        var nx2 = n.x + s.w;
        var ny2 = n.y + s.h;
        return nx1 < x2 && nx2 > x1 && ny1 < y2 && ny2 > y1;
      }).map(function (n) { return n.id; });
    }

    function clientToOverlayLocalPx(clientX, clientY) {
      var layer = buttonsLayer || buttonsFrame;
      if (!layer) return { x: 0, y: 0 };
      var rect = layer.getBoundingClientRect();
      var localW = Math.max(1, layer.clientWidth || rect.width);
      var localH = Math.max(1, layer.clientHeight || rect.height);
      return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * localW,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * localH
      };
    }

    /** Frozen at pointerdown — avoid getBoundingClientRect() during live resize (layout feedback lag). */
    function overlayPointerLayerCache() {
      var layer = buttonsLayer || buttonsFrame;
      if (!layer) return null;
      var rect = layer.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        rectW: Math.max(1, rect.width),
        rectH: Math.max(1, rect.height),
        layerW: Math.max(1, layer.clientWidth || rect.width),
        layerH: Math.max(1, layer.clientHeight || rect.height)
      };
    }

    function clientToOverlayLocalPxCached(clientX, clientY, cache) {
      if (!cache) return clientToOverlayLocalPx(clientX, clientY);
      return {
        x: ((clientX - cache.left) / cache.rectW) * cache.layerW,
        y: ((clientY - cache.top) / cache.rectH) * cache.layerH
      };
    }

    function updateOverlayMarqueeVisual() {
      if (!overlayMarqueeEl || !overlayMarquee || !buttonsLayer) {
        if (overlayMarqueeEl) overlayMarqueeEl.hidden = true;
        return;
      }
      var cx0 = overlayMarquee.clientX0;
      var cy0 = overlayMarquee.clientY0;
      var cx1 = overlayMarquee.clientX1 != null ? overlayMarquee.clientX1 : cx0;
      var cy1 = overlayMarquee.clientY1 != null ? overlayMarquee.clientY1 : cy0;
      var pMin = clientToOverlayLocalPx(Math.min(cx0, cx1), Math.min(cy0, cy1));
      var pMax = clientToOverlayLocalPx(Math.max(cx0, cx1), Math.max(cy0, cy1));
      var offL = buttonsFrame && buttonsFrame !== buttonsLayer
        ? (buttonsLayer.offsetLeft || 0) : 0;
      var offT = buttonsFrame && buttonsFrame !== buttonsLayer
        ? (buttonsLayer.offsetTop || 0) : 0;
      overlayMarqueeEl.hidden = false;
      overlayMarqueeEl.style.left = (offL + pMin.x) + 'px';
      overlayMarqueeEl.style.top = (offT + pMin.y) + 'px';
      overlayMarqueeEl.style.width = Math.max(1, pMax.x - pMin.x) + 'px';
      overlayMarqueeEl.style.height = Math.max(1, pMax.y - pMin.y) + 'px';
    }

    function overlaysInOverlayMarquee(sceneId, marqueeData) {
      var mq = marqueeData || overlayMarquee;
      if (!mq || !sceneId) return [];
      var x1 = Math.min(mq.x0, mq.x1);
      var y1 = Math.min(mq.y0, mq.y1);
      var x2 = Math.max(mq.x0, mq.x1);
      var y2 = Math.max(mq.y0, mq.y1);
      var n = ExperienciaEngine.getNode(state, sceneId);
      if (!n) return [];
      var sz = overlayLayerSize();
      var layerW = sz.w;
      var layerH = sz.h;
      var editGroupId = canvas().activeOverlayGroupEditId;
      var hitSet = {};
      var hitIds = [];
      (ExperienciaEngine.listSceneButtons(state, n) || []).forEach(function (b) {
        if (!b || b.locked || b.visible === false) return;
        var ix = b._ix || b;
        var vm = ExperienciaEngine.buttonViewModel
          ? ExperienciaEngine.buttonViewModel(state, n, ix, layerW, layerH)
          : b;
        if (!vm) return;
        if (editGroupId) {
          var gid = String(editGroupId);
          if (isOverlayGroupId(sceneId, vm.id)) {
            if (String(vm.id) !== gid) return;
          } else if (String(vm.groupId || '') !== gid) {
            return;
          }
        }
        var m = overlaySelectionMetrics(vm, layerW, layerH);
        if (!m) return;
        var bL = m.gx - m.gw / 2;
        var bR = m.gx + m.gw / 2;
        var bT = m.gy - m.gh / 2;
        var bB = m.gy + m.gh / 2;
        if (bL < x2 && bR > x1 && bT < y2 && bB > y1) {
          var pickId = resolveOverlayPickId(sceneId, vm.id);
          if (!pickId || hitSet[pickId]) return;
          hitSet[pickId] = true;
          hitIds.push(String(pickId));
        }
      });
      return hitIds;
    }

    function deleteSelection() {
      if (canvas().selectedEdgeId || (canvas().selectedEdgeIds || []).length) {
        var eids = (canvas().selectedEdgeIds || []).slice();
        if (canvas().selectedEdgeId && eids.indexOf(canvas().selectedEdgeId) < 0) {
          eids.push(canvas().selectedEdgeId);
        }
        eids.forEach(function (eid) { ExperienciaEngine.removeEdge(state, eid); });
        ExperienciaEngine.clearSelection(state);
        renderAll(); persist();
        return;
      }
      var ids = selectedIds();
      if (!ids.length) return;
      var res = ExperienciaEngine.removeNodes(state, ids);
      ExperienciaEngine.clearSelection(state);
      renderAll(); persist();
      if (res.skipped.length && typeof AdminNotify !== 'undefined') {
        AdminNotify.info('Algunos nodos protegidos o bloqueados no se eliminaron.');
      }
    }

    function runNodeAction(act) {
      var ids = selectedIds();
      if (!ids.length) return;
      if (act === 'rename') {
        if (ids.length !== 1) return;
        hideCtx();
        startInlineRename(ids[0]);
        return;
      }
      if (act === 'duplicate') {
        if (ids.length === 1) {
          var copy = ExperienciaEngine.duplicateNode(state, ids[0]);
          if (copy) ExperienciaEngine.setSelection(state, [copy.id], []);
        } else {
          var dup = ExperienciaEngine.duplicateSelection(state, ids);
          var newIds = (dup.nodes || []).map(function (n) { return n.id; });
          ExperienciaEngine.setSelection(state, newIds, []);
        }
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'lock') {
        ExperienciaEngine.setNodesLocked(state, ids, true);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'unlock') {
        ExperienciaEngine.setNodesLocked(state, ids, false);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'unlink') {
        var total = 0;
        ids.forEach(function (id) {
          total += ExperienciaEngine.connectionsFor(state, id).in.length +
            ExperienciaEngine.connectionsFor(state, id).out.length;
        });
        if (total > 1) {
          boxiesConfirm({
            title: 'Desvincular',
            message: '¿Desvincular ' + total + ' conexiones de la selección?',
            confirmLabel: 'Desvincular',
            cancelLabel: 'Cancelar'
          }).then(function (ok) {
            if (!ok) return;
            ExperienciaEngine.unlinkNodes(state, ids);
            hideCtx(); renderAll(); persist();
          });
          return;
        }
        ExperienciaEngine.unlinkNodes(state, ids);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'delete') {
        boxiesConfirm({
          title: 'Eliminar del flujo',
          message: ids.length > 1
            ? '¿Eliminar ' + ids.length + ' nodos del flujo? (no borra media/assets)'
            : '¿Eliminar este nodo del flujo? (no borra media/assets)',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          deleteSelection();
          hideCtx();
        });
      }
    }

    function fitView() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var pad = 120;
      var spanX = Math.max(1, b.maxX - b.minX + pad);
      var spanY = Math.max(1, b.maxY - b.minY + pad);
      var zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(vr.width / spanX, vr.height / spanY) * 0.88));
      canvas().zoom = zoom;
      canvas().panX = (vr.width - spanX * zoom) / 2 - b.minX * zoom + 24;
      canvas().panY = (vr.height - spanY * zoom) / 2 - b.minY * zoom + 24;
      renderAll();
      persist();
    }

    /** Single fitView after template generation — wait one paint so cards exist in DOM. */
    function fitViewAfterTemplate() {
      renderAll();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fitView();
        });
      });
    }

    function centerView() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var cx = (b.minX + b.maxX) / 2;
      var cy = (b.minY + b.maxY) / 2;
      var z = canvas().zoom || 1;
      canvas().panX = vr.width / 2 - cx * z;
      canvas().panY = vr.height / 2 - cy * z;
      renderAll();
      persist();
    }

    function openStructurePicker() {
      if (!pickerEl || !pendingCreate) return;
      pickerEl.innerHTML = structurePickerHtml(state);
      pickerEl.hidden = false;
      pickerEl.style.left = ctxEl.style.left;
      pickerEl.style.top = ctxEl.style.top;
      hideCtx();
      pickerEl.querySelectorAll('[data-exp-struct]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = {
            id: btn.getAttribute('data-exp-struct'),
            label: btn.getAttribute('data-label'),
            kind: btn.getAttribute('data-kind'),
            capacity: btn.getAttribute('data-capacity')
              ? Number(btn.getAttribute('data-capacity'))
              : null,
            stageId: btn.getAttribute('data-stage') || null
          };
          var n = ExperienciaEngine.createStructureLinkedNode(state, item, pendingCreate.at, {
            fromId: pendingCreate.fromId,
            portId: pendingCreate.portId || pendingCreate.sourcePortId,
            portLabel: pendingCreate.portLabel,
            sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
            targetPortId: pendingCreate.targetPortId || 'in'
          });
          hidePicker();
          pendingCreate = null;
          selectNode(n.id);
          persist();
        });
      });
      var cancel = pickerEl.querySelector('[data-exp-picker-cancel]');
      if (cancel) cancel.addEventListener('click', function () { hidePicker(); pendingCreate = null; });
    }

    if (ctxEl) {
      ctxEl.addEventListener('click', function (ev) {
        var cancel = ev.target.closest('[data-exp-ctx-cancel]');
        if (cancel) { hideCtx(); return; }
        var nodeAct = ev.target.closest('[data-exp-node-act]');
        if (nodeAct) {
          runNodeAction(nodeAct.getAttribute('data-exp-node-act'));
          return;
        }
        var ixCtx = ev.target.closest('[data-exp-ix-ctx]');
        if (ixCtx && ctxMode && ctxMode.sceneId && ctxMode.ixId) {
          runInteractionAction(
            ixCtx.getAttribute('data-exp-ix-ctx'),
            ctxMode.sceneId,
            ctxMode.ixId
          );
          return;
        }
        var addElItem = ev.target.closest('[data-exp-add-el-item]');
        if (addElItem) {
          var sceneForEl = (pendingCreate && pendingCreate.sceneId) ||
            (ctxMode && ctxMode.sceneId);
          var elItem = ExperienciaEngine.findAddElementItem
            ? ExperienciaEngine.findAddElementItem(addElItem.getAttribute('data-exp-add-el-item'))
            : null;
          if (sceneForEl && elItem) {
            var created = ExperienciaEngine.addElementFromMenu(state, sceneForEl, elItem);
            hideCtx();
            if (created && created.error === 'global-control') {
              if (typeof AdminNotify !== 'undefined') {
                AdminNotify.info(created.message || 'Control global del showroom.');
              }
              return;
            }
            if (created && created.id) selectInteraction(sceneForEl, created.id);
            else { renderAll(); persist(); }
          }
          return;
        }
        var edgeAct = ev.target.closest('[data-exp-edge-act]');
        if (edgeAct && edgeAct.getAttribute('data-exp-edge-act') === 'unlink') {
          if (canvas().selectedEdgeId) {
            ExperienciaEngine.removeEdge(state, canvas().selectedEdgeId);
            ExperienciaEngine.clearSelection(state);
            hideCtx(); renderAll(); persist();
          }
          return;
        }
        var item = ev.target.closest('[data-exp-create]');
        if (!item || !pendingCreate) return;
        var menuItem = findMenuItem(item.getAttribute('data-exp-create'), pendingCreate.menu);
        if (!menuItem) return;
        var result = ExperienciaEngine.createNodeFromMenu(state, menuItem, pendingCreate.at, {
          fromId: pendingCreate.fromId,
          portId: pendingCreate.portId || pendingCreate.sourcePortId,
          portLabel: pendingCreate.portLabel,
          sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
          targetPortId: pendingCreate.targetPortId || 'in'
        });
        if (result && result.error === 'need-scene') {
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info(result.message || 'Necesitas una escena origen.');
          }
          hideCtx();
          return;
        }
        if (result && result.needsPicker === '_link_structure') {
          openStructurePicker();
          return;
        }
        if (result && result.needsPicker === '_link_existing') {
          hideCtx();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info('Selecciona un nodo existente en el canvas y conéctalo arrastrando.');
          }
          canvas().tool = 'select';
          pendingCreate = null;
          syncToolUi();
          return;
        }
        hideCtx();
        if (result && (result.inline || result.embedded)) {
          selectNode((result.scene && result.scene.id) || (result.node && result.node.id));
        } else if (result && result.node) {
          selectNode(result.node.id);
        } else {
          renderAll(); persist();
        }
      });
    }

    /* Toolbar */
    rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tool = btn.getAttribute('data-exp-tool');
        if (tool === 'select') {
          canvas().tool = 'select';
          linkDrag = null;
          hoverCutEdgeId = null;
          syncToolUi();
          persist();
          return;
        }
        if (tool === 'cut') {
          canvas().tool = 'cut';
          linkDrag = null;
          hoverCutEdgeId = null;
          syncToolUi();
          persist();
          return;
        }
        if (tool === 'zoom-in') {
          canvas().zoom = Math.min(MAX_ZOOM, (canvas().zoom || 1) * 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'zoom-out') {
          canvas().zoom = Math.max(MIN_ZOOM, (canvas().zoom || 1) / 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'fit') {
          fitView();
          return;
        }
        if (tool === 'canvas-mode') {
          toggleCanvasMode();
          return;
        }
        if (tool === 'relayout') {
          /* Internal only — removed from toolbar UI in V5.9.59 */
          ExperienciaEngine.forceRelayout(state);
          fitView();
          if (api.onChange) api.onChange();
          return;
        }
        if (tool === 'minimap') {
          canvas().minimapVisible = !canvas().minimapVisible;
          renderAll(); persist();
        }
      });
    });

    /* V6.3.00 — FLUJO | BOTONES | HOTSPOTS | PROTOTIPO */
    if (modeTabs) {
      modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var mode = btn.getAttribute('data-exp-edit-mode');
          if (mode === 'buttons' && !canUseButtonsMode()) return;
          if (mode === 'hotspots' && !canUseHotspotsMode()) return;
          canvas().editMode = mode === 'buttons' ? 'buttons'
            : (mode === 'hotspots' ? 'hotspots'
              : (mode === 'prototype' ? 'prototype' : 'flow'));
          if (canvas().editMode !== 'buttons') {
            canvas().selectedButtonId = null;
            canvas().selectedButtonIds = [];
          }
          if (canvas().editMode !== 'hotspots') {
            canvas().selectedHotspotId = null;
            hotspotDraw = null;
          }
          openPropertiesRail();
          renderAll();
          persist();
          requestAnimationFrame(recomputeOverlayLayout);
          if (canvas().editMode === 'prototype') {
            requestAnimationFrame(function () {
              syncPrototypeStoryboard();
              if (protoRuntimePlayer && protoRuntimePlayer.resize) protoRuntimePlayer.resize();
            });
          }
        });
      });
    }

    if (buttonsLayer) {
      var overlayDocBound = false;

      function finishOverlayMarquee(ev) {
        if (!overlayMarquee) return false;
        if (ev && ev.pointerId !== overlayMarquee.pointerId) return false;
        var om = overlayMarquee;
        overlayMarquee = null;
        unbindOverlayPointerDocs();
        updateOverlayMarqueeVisual();
        try {
          if (buttonsLayer && ev) buttonsLayer.releasePointerCapture(ev.pointerId);
        } catch (eRelOm) { /* ignore */ }
        if (om.moved) {
          var hitIds = overlaysInOverlayMarquee(om.sceneId, om);
          if (om.shift) {
            var merged = getSelectedOverlayIds().slice();
            hitIds.forEach(function (id) {
              if (merged.indexOf(id) < 0) merged.push(id);
            });
            canvas().selectedButtonIds = merged;
            canvas().selectedButtonId = merged[0] || null;
          } else {
            canvas().selectedButtonIds = hitIds;
            canvas().selectedButtonId = hitIds[0] || null;
          }
          if (hitIds.length) openPropertiesRail();
        } else if (!om.shift) {
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        }
        paintButtonsStage();
        paintInspector();
        notifyOverlaySelection();
        return true;
      }

      function cancelOverlayGestures() {
        clearGroupPointerGesture();
        if (overlayMarquee) {
          overlayMarquee = null;
          updateOverlayMarqueeVisual();
          unbindOverlayPointerDocs();
        }
        if (transformDrag) {
          if (transformDrag.shapeRaf) cancelAnimationFrame(transformDrag.shapeRaf);
          if (transformDrag.liveRefs) clearShapeLiveSizingStyles(transformDrag.liveRefs);
          transformDrag = null;
          unbindOverlayPointerDocs();
          try {
            var gizmoCancel = buttonsLayer && buttonsLayer.querySelector('[data-exp-gizmo]');
            if (gizmoCancel) gizmoCancel.classList.remove('is-sizing');
          } catch (eGzCancel) { /* ignore */ }
          paintButtonsStage();
        }
        if (buttonDrag) {
          if (buttonDrag.moveRaf) cancelAnimationFrame(buttonDrag.moveRaf);
          if (buttonDrag.moveLiveRefs) clearShapeMoveLiveStyles(buttonDrag.moveLiveRefs);
          var pending = buttonDrag;
          buttonDrag = null;
          unbindOverlayPointerDocs();
          if (!pending.historyPushed && pending.sceneId) {
            if (pending.origins) {
              restoreOverlayDragOrigins(pending.sceneId, pending.origins);
            } else if (pending.originX != null && pending.originY != null &&
                pending.buttonId != null) {
              ExperienciaEngine.setSceneButtonPosition(
                state, pending.sceneId, pending.buttonId, pending.originX, pending.originY
              );
            }
          }
          paintButtonsStage();
        }
      }

      function unbindOverlayPointerDocs() {
        if (!overlayDocBound) return;
        document.removeEventListener('pointermove', onOverlayDocPointerMove, true);
        document.removeEventListener('pointerup', onOverlayDocPointerUp, true);
        document.removeEventListener('pointercancel', onOverlayDocPointerUp, true);
        overlayDocBound = false;
      }

      function bindOverlayPointerDocs() {
        if (overlayDocBound) return;
        document.addEventListener('pointermove', onOverlayDocPointerMove, true);
        document.addEventListener('pointerup', onOverlayDocPointerUp, true);
        document.addEventListener('pointercancel', onOverlayDocPointerUp, true);
        overlayDocBound = true;
      }

      function clearGroupPointerGesture() {
        groupPointerGesture = null;
      }

      function startGroupPointerGesture(ev, sceneId, groupId, childId) {
        groupPointerGesture = {
          sceneId: sceneId,
          groupId: String(groupId),
          childId: String(childId),
          pointerId: ev.pointerId,
          clientStartX: ev.clientX,
          clientStartY: ev.clientY
        };
        bindOverlayPointerDocs();
      }

      function flushGroupPointerGestureToMove(ev) {
        if (!groupPointerGesture) return false;
        var g = groupPointerGesture;
        clearGroupPointerGesture();
        canvas().selectedButtonIds = [g.groupId];
        canvas().selectedButtonId = g.groupId;
        var btn = getOverlayItemVm(g.sceneId, g.groupId);
        if (!btn) {
          dragDebugLog('flushGroupPointerGestureToMove: no group vm', g);
          return false;
        }
        dragDebugLog('flushGroupPointerGestureToMove → beginOverlayMove', {
          groupId: g.groupId,
          sceneId: g.sceneId
        });
        beginOverlayMove(ev, g.groupId, g.sceneId, btn, { groupEditChildId: g.childId });
        return true;
      }

      function finishGroupPointerGesture(ev) {
        if (!groupPointerGesture) return;
        if (ev && ev.pointerId !== groupPointerGesture.pointerId) return;
        clearGroupPointerGesture();
        unbindOverlayPointerDocs();
      }

      function onOverlayDocPointerMove(ev) {
        if (overlayMarquee && ev.pointerId === overlayMarquee.pointerId) {
          var pctMv = percentFromPointer(ev);
          overlayMarquee.x1 = pctMv.x;
          overlayMarquee.y1 = pctMv.y;
          overlayMarquee.clientX1 = ev.clientX;
          overlayMarquee.clientY1 = ev.clientY;
          if (Math.abs(ev.clientX - overlayMarquee.clientX0) > OVERLAY_MARQUEE_THRESHOLD_PX ||
              Math.abs(ev.clientY - overlayMarquee.clientY0) > OVERLAY_MARQUEE_THRESHOLD_PX) {
            overlayMarquee.moved = true;
          }
          updateOverlayMarqueeVisual();
          return;
        }
        if (groupPointerGesture && ev.pointerId === groupPointerGesture.pointerId) {
          var gDist = Math.hypot(
            ev.clientX - groupPointerGesture.clientStartX,
            ev.clientY - groupPointerGesture.clientStartY
          );
          if (gDist >= OVERLAY_DRAG_THRESHOLD_PX) {
            dragDebugLog('groupPointerGesture threshold crossed', { dist: gDist });
            flushGroupPointerGestureToMove(ev);
          }
          return;
        }
        if (transformDrag && ev.pointerId === transformDrag.pointerId) {
          ev.preventDefault();
          var mode = transformDrag.mode;
          if (mode === 'rotate') {
            var pctT = percentFromPointer(ev);
            var distR = Math.hypot(
              pctT.x - transformDrag.startPx,
              pctT.y - transformDrag.startPy
            );
            /* Ignore tiny jitter so a click can arm double-tap for the degree editor. */
            if (distR < 1.25) return;
            if (!transformDrag.historyPushed) {
              dragDebugLog('transformDrag rotate start', {
                buttonId: transformDrag.buttonId,
                type: transformDrag.type
              });
              pushButtonHistory(transformDrag.sceneId);
              transformDrag.historyPushed = true;
            }
            var ang = Math.atan2(pctT.y - transformDrag.startY, pctT.x - transformDrag.startX);
            var deg = Math.round((ang * 180) / Math.PI) + 90;
            /* Hold Shift while rotating → snap to 45° increments. */
            if (ev.shiftKey) {
              deg = Math.round(deg / 45) * 45;
            }
            if (deg > 360) deg = deg % 360;
            if (deg < -360) deg = -((-deg) % 360);
            if ((transformDrag.type === 'OVERLAY_GROUP' || transformDrag.type === 'GROUP') &&
                ExperienciaEngine.updateOverlayGroupTransform) {
              var szRot = overlayLayerSize();
              ExperienciaEngine.updateOverlayGroupTransform(
                state, transformDrag.sceneId, transformDrag.buttonId,
                { rotation: deg, layerW: szRot.w, layerH: szRot.h }
              );
            } else {
              ExperienciaEngine.updateSceneButton(state, transformDrag.sceneId, transformDrag.buttonId, {
                rotation: deg
              });
            }
          } else {
            var resizeDistPx = Math.hypot(
              ev.clientX - transformDrag.clientStartX,
              ev.clientY - transformDrag.clientStartY
            );
            var shapeLiveResize = isShapeType(transformDrag.type);
            if (resizeDistPx < (shapeLiveResize ? 2 : OVERLAY_DRAG_THRESHOLD_PX)) return;
            if (!transformDrag.historyPushed) {
              dragDebugLog('transformDrag resize start', {
                buttonId: transformDrag.buttonId,
                type: transformDrag.type,
                mode: mode
              });
              pushButtonHistory(transformDrag.sceneId);
              transformDrag.historyPushed = true;
            }
            var layerW = transformDrag.layerW;
            var layerH = transformDrag.layerH;
            if (!layerW || !layerH) {
              var cache = transformDrag.ptrCache;
              layerW = cache ? cache.layerW : Math.max(1, buttonsLayer.clientWidth || 1000);
              layerH = cache ? cache.layerH : Math.max(1, buttonsLayer.clientHeight || 1000);
            }
            var ptrLocal = clientToOverlayLocalPxCached(
              ev.clientX, ev.clientY, transformDrag.ptrCache
            );
            var dxPx = ptrLocal.x - transformDrag.startPtrX;
            var dyPx = ptrLocal.y - transformDrag.startPtrY;
            var moveE = mode.indexOf('e') >= 0;
            var moveW = mode.indexOf('w') >= 0;
            var moveS = mode.indexOf('s') >= 0;
            var moveN = mode.indexOf('n') >= 0;

            if (shapeLiveResize) {
              transformDrag.lastDxPx = dxPx;
              transformDrag.lastDyPx = dyPx;
              if (!transformDrag.shapeSnapDone) {
                transformDrag.shapeSnapDone = true;
                if (shapeUsesPixelSquareCornerResize(transformDrag.type)) {
                  scheduleShapeResizeFrame(transformDrag, 0, 0, layerW, layerH, mode);
                }
              }
              scheduleShapeResizeFrame(
                transformDrag, dxPx, dyPx, layerW, layerH, mode
              );
              return;
            }

            var rad = (Number(transformDrag.startRot) || 0) * Math.PI / 180;
            var cosR = Math.cos(rad);
            var sinR = Math.sin(rad);
            var localDxPx = dxPx * cosR + dyPx * sinR;
            var localDyPx = -dxPx * sinR + dyPx * cosR;
            var clampEdge = function (v) { return Math.round(v); };

            var startLpx = transformDrag.startLpx;
            var startRpx = transformDrag.startRpx;
            var startTpx = transformDrag.startTpx;
            var startBpx = transformDrag.startBpx;
            var Lpx = startLpx;
            var Rpx = startRpx;
            var Tpx = startTpx;
            var Bpx = startBpx;
            var minWpx = Math.max(8, (1.5 / 100) * layerW);
            var minHpx = Math.max(8, (1.5 / 100) * layerH);
            var maxWpx = (95 / 100) * layerW;
            var maxHpx = (95 / 100) * layerH;

            if (moveE) Rpx = startRpx + localDxPx;
            if (moveW) Lpx = startLpx + localDxPx;
            if (moveS) Bpx = startBpx + localDyPx;
            if (moveN) Tpx = startTpx + localDyPx;

            /* Min/max — only the moving edge moves. */
            if (moveE && !moveW) {
              Rpx = clampEdge(Math.max(startLpx + minWpx, Math.min(startLpx + maxWpx, Rpx)));
              Lpx = startLpx;
            } else if (moveW && !moveE) {
              Lpx = clampEdge(Math.min(startRpx - minWpx, Math.max(startRpx - maxWpx, Lpx)));
              Rpx = startRpx;
            }
            if (moveS && !moveN) {
              Bpx = clampEdge(Math.max(startTpx + minHpx, Math.min(startTpx + maxHpx, Bpx)));
              Tpx = startTpx;
            } else if (moveN && !moveS) {
              Tpx = clampEdge(Math.min(startBpx - minHpx, Math.max(startBpx - maxHpx, Tpx)));
              Bpx = startBpx;
            }

            var wPx = Math.max(minWpx, Rpx - Lpx);
            var hPx = Math.max(minHpx, Bpx - Tpx);

            if (transformDrag.keepRatio && transformDrag.startWpx > 0 &&
                shouldCoupleShapeResizeAxes(
                  transformDrag.type, moveE, moveW, moveN, moveS, true
                )) {
              var ratioPx = transformDrag.startHpx / transformDrag.startWpx;
              if (!isShapeType(transformDrag.type) && isSquareShapeType(transformDrag.type)) {
                ratioPx = 1; /* square in pixels */
              }
              if ((moveE || moveW) && !(moveN || moveS)) {
                hPx = wPx * ratioPx;
                var midYpx = (startTpx + startBpx) / 2;
                Tpx = midYpx - hPx / 2;
                Bpx = midYpx + hPx / 2;
              } else if ((moveN || moveS) && !(moveE || moveW)) {
                wPx = hPx / ratioPx;
                var midXpx = (startLpx + startRpx) / 2;
                Lpx = midXpx - wPx / 2;
                Rpx = midXpx + wPx / 2;
              } else {
                if (Math.abs(localDxPx) * transformDrag.startHpx >=
                    Math.abs(localDyPx) * transformDrag.startWpx) {
                  hPx = wPx * ratioPx;
                } else {
                  wPx = hPx / ratioPx;
                }
                if (moveW && !moveE) { Rpx = startRpx; Lpx = Rpx - wPx; }
                else { Lpx = startLpx; Rpx = Lpx + wPx; }
                if (moveN && !moveS) { Bpx = startBpx; Tpx = Bpx - hPx; }
                else { Tpx = startTpx; Bpx = Tpx + hPx; }
              }
              /* Re-assert pinned faces after ratio. */
              if (moveE && !moveW) { Lpx = startLpx; Rpx = Lpx + wPx; }
              if (moveW && !moveE) { Rpx = startRpx; Lpx = Rpx - wPx; }
              if (moveS && !moveN) { Tpx = startTpx; Bpx = Tpx + hPx; }
              if (moveN && !moveS) { Bpx = startBpx; Tpx = Bpx - hPx; }
              wPx = Rpx - Lpx;
              hPx = Bpx - Tpx;
            }

            /* Snap — shapes skip live snap (causes bounce); commit on pointerup. */
            if (!ev.shiftKey && !shapeLiveResize) {
              var Lpct = (Lpx / layerW) * 100;
              var Rpct = (Rpx / layerW) * 100;
              var Tpct = (Tpx / layerH) * 100;
              var Bpct = (Bpx / layerH) * 100;
              var resizeLines = collectOverlayAlignLines(
                transformDrag.sceneId,
                transformDrag.buttonId,
                {
                  L: Lpct,
                  R: Rpct,
                  T: Tpct,
                  B: Bpct,
                  cx: (Lpct + Rpct) / 2,
                  cy: (Tpct + Bpct) / 2
                }
              );
              var snappedPx = snapResizeEdgesPx(
                Lpx, Rpx, Tpx, Bpx, mode,
                resizeLines.x, resizeLines.y,
                layerW, layerH,
                {
                  snapPx: 14,
                  minWpx: minWpx,
                  minHpx: minHpx,
                  fixL: startLpx,
                  fixR: startRpx,
                  fixT: startTpx,
                  fixB: startBpx
                }
              );
              Lpx = snappedPx.Lpx;
              Rpx = snappedPx.Rpx;
              Tpx = snappedPx.Tpx;
              Bpx = snappedPx.Bpx;
              wPx = Rpx - Lpx;
              hPx = Bpx - Tpx;
              if (transformDrag.keepRatio && transformDrag.startWpx > 0 &&
                shouldCoupleShapeResizeAxes(
                  transformDrag.type, moveE, moveW, moveN, moveS, true
                )) {
                var ratioSnap = (!isShapeType(transformDrag.type) && isSquareShapeType(transformDrag.type))
                  ? 1
                  : (transformDrag.startHpx / Math.max(1, transformDrag.startWpx));
                if ((moveE || moveW) && !(moveN || moveS)) {
                  hPx = wPx * ratioSnap;
                  var midYpx2 = (startTpx + startBpx) / 2;
                  Tpx = midYpx2 - hPx / 2;
                  Bpx = midYpx2 + hPx / 2;
                  if (moveE && !moveW) { Lpx = startLpx; Rpx = Lpx + wPx; }
                  if (moveW && !moveE) { Rpx = startRpx; Lpx = Rpx - wPx; }
                } else if ((moveN || moveS) && !(moveE || moveW)) {
                  wPx = hPx / ratioSnap;
                  var midXpx2 = (startLpx + startRpx) / 2;
                  Lpx = midXpx2 - wPx / 2;
                  Rpx = midXpx2 + wPx / 2;
                  if (moveS && !moveN) { Tpx = startTpx; Bpx = Tpx + hPx; }
                  if (moveN && !moveS) { Bpx = startBpx; Tpx = Bpx - hPx; }
                }
              }
            }

            var nw = (wPx / layerW) * 100;
            var nh = (hPx / layerH) * 100;
            var nx = (((Lpx + Rpx) / 2) / layerW) * 100;
            var ny = (((Tpx + Bpx) / 2) / layerH) * 100;

            var patchT = { x: nx, y: ny, live: true };
            if (transformDrag.type === 'OVERLAY_GROUP' || transformDrag.type === 'GROUP') {
              patchT.width = nw;
              patchT.height = nh;
              patchT.keepRatio = transformDrag.keepRatio;
              if (ExperienciaEngine.updateOverlayGroupTransform) {
                ExperienciaEngine.updateOverlayGroupTransform(
                  state, transformDrag.sceneId, transformDrag.buttonId,
                  {
                    x: nx,
                    y: ny,
                    width: nw,
                    height: nh,
                    keepRatio: transformDrag.keepRatio,
                    live: true,
                    layerW: layerW,
                    layerH: layerH,
                    memberSnapshots: transformDrag.memberSnapshots
                  }
                );
              }
              paintButtonsStage();
              transformDrag.guides = { spacing: [] };
              syncLiveOverlayGuides(transformDrag.guides);
              return;
            }
            if (transformDrag.type === 'BUTTON') {
              patchT.boxW = nw;
              patchT.boxH = nh;
            }
            ExperienciaEngine.updateSceneButton(state, transformDrag.sceneId, transformDrag.buttonId, patchT);
            applyLiveResizePaint(transformDrag.buttonId, {
              lpx: Lpx, rpx: Rpx, tpx: Tpx, bpx: Bpx
            }, transformDrag.type);
            /* No align mini-guides while resizing. */
            transformDrag.guides = { spacing: [] };
            syncLiveOverlayGuides(transformDrag.guides);
            return;
          }
          paintButtonsStage();
          return;
        }
        if (!buttonDrag || ev.pointerId !== buttonDrag.pointerId || buttonDrag.nudge) return;
        var dragDistPx = Math.hypot(
          ev.clientX - buttonDrag.clientStartX,
          ev.clientY - buttonDrag.clientStartY
        );
        if (dragDistPx < OVERLAY_DRAG_THRESHOLD_PX) return;
        ev.preventDefault();
        ensureShapeMoveLiveRefs(buttonDrag);
        var pct = pointerPctFromEvent(ev, buttonDrag.ptrCache);
        if (!buttonDrag.historyPushed) {
          dragDebugLog('buttonDrag move start', {
            buttonId: buttonDrag.buttonId,
            isOverlayGroup: buttonDrag.isOverlayGroup,
            groupEditChildId: buttonDrag.groupEditChildId
          });
          pushButtonHistory(buttonDrag.sceneId);
          buttonDrag.historyPushed = true;
        }
        var groupIds = (buttonDrag.groupIds && buttonDrag.groupIds.length)
          ? buttonDrag.groupIds
          : [buttonDrag.buttonId];
        var ddx = pct.x - buttonDrag.startPx;
        var ddy = pct.y - buttonDrag.startPy;
        var axis = applyOverlayDragAxisLock(buttonDrag, ddx, ddy, !!ev.shiftKey);
        ddx = axis.ddx;
        ddy = axis.ddy;
        if (buttonDrag.isOverlayGroup && ExperienciaEngine.updateOverlayGroupTransform) {
          var szG = overlayLayerSize();
          var rawCx = buttonDrag.originX != null ? buttonDrag.originX + ddx : pct.x;
          var rawCy = buttonDrag.originY != null ? buttonDrag.originY + ddy : pct.y;
          var snappedG = computeButtonGuides(
            buttonDrag.sceneId, buttonDrag.buttonId, rawCx, rawCy,
            { disableSnap: !!ev.altKey }
          );
          buttonDrag.guides = snappedG.guides;
          /* Snap against union center; apply the same delta to the compose pivot. */
          var snapDx = snappedG.x - rawCx;
          var snapDy = snappedG.y - rawCy;
          var pivotOx = buttonDrag.pivotOriginX != null
            ? buttonDrag.pivotOriginX
            : buttonDrag.originX;
          var pivotOy = buttonDrag.pivotOriginY != null
            ? buttonDrag.pivotOriginY
            : buttonDrag.originY;
          var nextGx = (pivotOx != null ? pivotOx : rawCx) + ddx + snapDx;
          var nextGy = (pivotOy != null ? pivotOy : rawCy) + ddy + snapDy;
          ExperienciaEngine.updateOverlayGroupTransform(
            state, buttonDrag.sceneId, buttonDrag.buttonId,
            { x: nextGx, y: nextGy, live: true, layerW: szG.w, layerH: szG.h }
          );
          paintButtonsStage();
          return;
        }
        if (groupIds.length > 1) {
          var szM = overlayLayerSize();
          groupIds.forEach(function (id) {
            var orig = buttonDrag.origins && buttonDrag.origins[String(id)];
            if (!orig) return;
            ExperienciaEngine.setSceneButtonPosition(
              state, buttonDrag.sceneId, id, orig.x + ddx, orig.y + ddy,
              szM.w, szM.h
            );
            clearPendingMove(id);
          });
          buttonDrag.guides = { spacing: [] };
          if (buttonDrag.moveLiveRefs) {
            buttonDrag.pendingMoveDdx = ddx;
            buttonDrag.pendingMoveDdy = ddy;
            scheduleShapeMoveFrame(buttonDrag);
            return;
          }
          paintButtonsStage();
          return;
        }
        var rawX = buttonDrag.originX != null
          ? buttonDrag.originX + ddx
          : pct.x;
        var rawY = buttonDrag.originY != null
          ? buttonDrag.originY + ddy
          : pct.y;
        var snapped = computeButtonGuides(
          buttonDrag.sceneId, buttonDrag.buttonId, rawX, rawY,
          { disableSnap: !!ev.altKey }
        );
        buttonDrag.guides = snapped.guides;
        setOverlayLivePosition(
          buttonDrag.sceneId, buttonDrag.buttonId, snapped.x, snapped.y
        );
        clearPendingMove(buttonDrag.buttonId);
        if (buttonDrag.moveLiveRefs) {
          buttonDrag.pendingMoveDdx = snapped.x - buttonDrag.originX;
          buttonDrag.pendingMoveDdy = snapped.y - buttonDrag.originY;
          scheduleShapeMoveFrame(buttonDrag);
          return;
        }
        paintButtonsStage();
      }

      function onOverlayDocPointerUp(ev) {
        endButtonDrag(ev);
      }

      function beginOverlayMove(ev, bid, sceneId, btn, opts) {
        opts = opts || {};
        dragDebugLog('beginOverlayMove called', {
          bid: bid,
          sceneId: sceneId,
          locked: !!(btn && btn.locked),
          opts: opts
        });
        if (btn && btn.locked) {
          dragDebugLog('beginOverlayMove blocked: locked');
          paintButtonsStage();
          paintInspector();
          return;
        }
        var groupIds = (opts.groupIds && opts.groupIds.length)
          ? opts.groupIds.map(String)
          : getSelectedOverlayIds();
        if (groupIds.indexOf(String(bid)) < 0) {
          groupIds = [String(bid)];
        }
        groupIds = groupIds.filter(function (id) {
          var b = getOverlayItemVm(sceneId, id);
          if (b) return !b.locked;
          var legacy = ExperienciaEngine.getSceneButton(
            state, ExperienciaEngine.getNode(state, sceneId), id
          );
          return !!(legacy && !legacy.locked);
        });
        if (!groupIds.length) groupIds = [String(bid)];
        var pctStart = percentFromPointer(ev);
        var isGroupDrag = isOverlayGroupId(sceneId, bid);
        if (isGroupDrag) commitGroupBoundsIfNeeded(sceneId, bid);
        var btnFresh = getOverlayItemVm(sceneId, bid) || btn;
        var ox = btnFresh
          ? (btnFresh.storedX != null ? Number(btnFresh.storedX) : Number(btnFresh.x) || 50)
          : 50;
        var oy = btnFresh
          ? (btnFresh.storedY != null ? Number(btnFresh.storedY) : Number(btnFresh.y) || 50)
          : 50;
        var pivotOx = ox;
        var pivotOy = oy;
        if (isGroupDrag) {
          var nPivot = ExperienciaEngine.getNode(state, sceneId);
          var gPivot = nPivot && ExperienciaEngine.getInteraction
            ? ExperienciaEngine.getInteraction(nPivot, bid)
            : null;
          if (gPivot) {
            pivotOx = Number(gPivot.x);
            if (isNaN(pivotOx)) pivotOx = ox;
            pivotOy = Number(gPivot.y);
            if (isNaN(pivotOy)) pivotOy = oy;
          }
        }
        var origins = isGroupDrag ? {} : buildOverlayDragOrigins(sceneId, groupIds);
        clearPendingMove(bid);
        buttonDrag = {
          buttonId: bid,
          sceneId: sceneId,
          groupIds: isGroupDrag ? [String(bid)] : groupIds,
          isOverlayGroup: isGroupDrag,
          groupEditChildId: opts.groupEditChildId || null,
          origins: origins,
          pointerId: ev.pointerId,
          clientStartX: ev.clientX,
          clientStartY: ev.clientY,
          originX: ox,
          originY: oy,
          pivotOriginX: pivotOx,
          pivotOriginY: pivotOy,
          startPx: pctStart.x,
          startPy: pctStart.y,
          startX: ox,
          startY: oy,
          guides: null,
          axisLock: null,
          historyPushed: false,
          live: true,
          moveLiveRefs: null,
          shapeMoveFastPath: false,
          selectionPaintNeeded: !!(opts && opts.selectionPaintNeeded),
          ptrCache: overlayPointerLayerCache(),
          moveRaf: 0
        };
        buttonDrag.shapeMoveFastPath = !isGroupDrag &&
          canUseShapeMoveFastPath(sceneId, groupIds);
        bindOverlayPointerDocs();
        try { buttonsLayer.setPointerCapture(ev.pointerId); } catch (eCap) {}
        dragDebugLog('beginOverlayMove armed buttonDrag', {
          buttonId: buttonDrag.buttonId,
          isOverlayGroup: buttonDrag.isOverlayGroup,
          pointerId: buttonDrag.pointerId
        });
        /* No paint on pointerdown — avoids live-path DOM mutation before drag threshold. */
        requestAnimationFrame(function () {
          if (buttonDrag && buttonDrag.buttonId === bid) paintInspector();
        });
      }

      buttonsLayer.addEventListener('pointerdown', function (ev) {
        /* Gizmo resize / rotate */
        var handle = ev.target.closest && ev.target.closest('[data-handle]');
        if (handle && handle.closest('[data-exp-gizmo]')) {
          var gizmo = handle.closest('[data-exp-gizmo]');
          var gid = gizmo.getAttribute('data-gizmo-id');
          var gtype = gizmo.getAttribute('data-gizmo-type') || 'BUTTON';
          var sceneIdG = canvas().selectedId;
          var btnG = getOverlayItemVm(sceneIdG, gid);
          if (!btnG || btnG.locked) return;
          if ((gtype === 'OVERLAY_GROUP' || gtype === 'GROUP') &&
              ExperienciaEngine.commitOverlayGroupBounds) {
            commitGroupBoundsIfNeeded(sceneIdG, gid);
            btnG = getOverlayItemVm(sceneIdG, gid);
          }
          ev.preventDefault();
          ev.stopPropagation();
          var handleMode = handle.getAttribute('data-handle');
          dragDebugLog('pointerdown: gizmo handle', {
            gizmoId: gid,
            gtype: gtype,
            handle: handleMode
          });
          /* Custom double-tap on rotate (gizmo remount kills native dblclick). */
          if (handleMode === 'rotate') {
            var nowTap = Date.now();
            if (rotateTapArmed &&
                String(rotateTapArmed.buttonId) === String(gid) &&
                (nowTap - rotateTapArmed.at) < 480) {
              rotateTapArmed = null;
              openOverlayRotationEditor(
                ev.clientX, ev.clientY, sceneIdG, gid, handle
              );
              return;
            }
            rotateTapArmed = { buttonId: gid, at: nowTap };
          } else {
            rotateTapArmed = null;
          }
          var pct0 = percentFromPointer(ev);
          var ptrCache = overlayPointerLayerCache();
          var layerW0 = ptrCache
            ? ptrCache.layerW
            : Math.max(1, buttonsLayer.clientWidth || 1000);
          var layerH0 = ptrCache
            ? ptrCache.layerH
            : Math.max(1, buttonsLayer.clientHeight || 1000);
          var ptr0 = ptrCache
            ? clientToOverlayLocalPxCached(ev.clientX, ev.clientY, ptrCache)
            : clientToOverlayLocalPx(ev.clientX, ev.clientY);
          var shapeDragDef = isShapeType(gtype) ? shapeDefaultSize(gtype) : null;
          var liveRefs = null;
          var startW0;
          var startH0;
          var startX0;
          var startY0;
          if (isShapeType(gtype)) {
            var idEsc = String(gid).replace(/"/g, '');
            var gizmoEl = gizmo;
            var btnStretch = shapeStretchFromBtn(btnG);
            var shapeBoxV2Drag = isShapeBoxV2Active();
            if (shapeBoxV2Drag) {
              var startBoxSnap = getShapeBox(btnG, layerW0, layerH0);
              if (startBoxSnap) {
                startX0 = startBoxSnap.cx;
                startY0 = startBoxSnap.cy;
                startW0 = startBoxSnap.w;
                startH0 = startBoxSnap.h;
              } else {
                startX0 = btnG.storedX != null ? Number(btnG.storedX) : Number(btnG.x) || 50;
                startY0 = btnG.storedY != null ? Number(btnG.storedY) : Number(btnG.y) || 50;
                startW0 = shapeDragDef ? shapeDragDef.w : 12;
                startH0 = shapeDragDef ? shapeDragDef.h : 12;
              }
            } else {
              var gmSnap = shapeGizmoMetrics(btnG, layerW0, layerH0);
              /* Model metrics only — DOM rects lie under CSS stage scale. */
              startW0 = gmSnap ? gmSnap.gw : (shapeDragDef ? shapeDragDef.w : 12);
              startH0 = gmSnap ? gmSnap.gh : (shapeDragDef ? shapeDragDef.h : 12);
              startX0 = gmSnap ? gmSnap.gx
                : (btnG.storedX != null ? Number(btnG.storedX) : Number(btnG.x) || 50);
              startY0 = gmSnap ? gmSnap.gy
                : (btnG.storedY != null ? Number(btnG.storedY) : Number(btnG.y) || 50);
              if (!gmSnap) {
                var paintSnap0 = shapePaintSize(btnG, layerW0, layerH0);
                startW0 = paintSnap0.w;
                startH0 = paintSnap0.h;
              }
            }
            liveRefs = {
              el: buttonsLayer.querySelector('[data-exp-stage-btn="' + idEsc + '"]'),
              gizmo: gizmoEl,
              sizeEl: gizmoEl ? gizmoEl.querySelector('[data-exp-sel-size]') : null,
              kind: gtype,
              paint: {
                fill: btnG.fill,
                stroke: btnG.stroke,
                strokeWidth: btnG.strokeWidth,
                borderRadius: btnG.borderRadius
              },
              snap: {
                rot: Number(btnG.rotation) || 0,
                stretchX: btnStretch.sx,
                stretchY: btnStretch.sy
              }
            };
            /* Do not mutate inline styles on pointerdown — first rAF paint handles it. */
          } else {
            startW0 = gtype === 'BUTTON'
              ? (btnG.boxW != null ? Number(btnG.boxW) : 14)
              : (gtype === 'OVERLAY_GROUP' || gtype === 'GROUP')
                ? (Number(btnG.width) || 20)
                : 12;
            startH0 = gtype === 'BUTTON'
              ? (btnG.boxH != null ? Number(btnG.boxH) : 4.5)
              : (gtype === 'OVERLAY_GROUP' || gtype === 'GROUP')
                ? (Number(btnG.height) || 20)
                : 8;
            startX0 = btnG.storedX != null ? Number(btnG.storedX) : Number(btnG.x) || 50;
            startY0 = btnG.storedY != null ? Number(btnG.storedY) : Number(btnG.y) || 50;
          }
          /* Circle: store height so the box is pixel-square at drag start. */
          var layerAspect = layerW0 / Math.max(1, layerH0);
          if (!isShapeType(gtype) && isSquareShapeType(gtype)) {
            startH0 = startW0 * layerAspect;
          }
          var startL0 = startX0 - startW0 / 2;
          var startR0 = startX0 + startW0 / 2;
          var startT0 = startY0 - startH0 / 2;
          var startB0 = startY0 + startH0 / 2;
          var memberSnapshots = null;
          if ((gtype === 'OVERLAY_GROUP' || gtype === 'GROUP') &&
              ExperienciaEngine.snapshotOverlayGroupLocals) {
            var nG = ExperienciaEngine.getNode(state, sceneIdG);
            var gIx = ExperienciaEngine.getInteraction(nG, gid);
            memberSnapshots = ExperienciaEngine.snapshotOverlayGroupLocals(nG, gIx);
          }
          var shapeCornerHandle = handleMode === 'nw' || handleMode === 'ne' ||
            handleMode === 'se' || handleMode === 'sw';
          var shapeV2Drag = isShapeType(gtype) && isShapeBoxV2Active();
          transformDrag = {
            mode: handleMode,
            buttonId: gid,
            sceneId: sceneIdG,
            type: gtype,
            memberSnapshots: memberSnapshots,
            pointerId: ev.pointerId,
            clientStartX: ev.clientX,
            clientStartY: ev.clientY,
            startX: startX0,
            startY: startY0,
            startW: startW0,
            startH: startH0,
            startL: startL0,
            startR: startR0,
            startT: startT0,
            startB: startB0,
            layerW: layerW0,
            layerH: layerH0,
            startLpx: (startL0 / 100) * layerW0,
            startRpx: (startR0 / 100) * layerW0,
            startTpx: (startT0 / 100) * layerH0,
            startBpx: (startB0 / 100) * layerH0,
            startWpx: (startW0 / 100) * layerW0,
            startHpx: (startH0 / 100) * layerH0,
            startRot: Number(btnG.rotation) || 0,
            startPx: pct0.x,
            startPy: pct0.y,
            startPtrX: ptr0.x,
            startPtrY: ptr0.y,
            ptrCache: ptrCache,
            liveRefs: liveRefs,
            startTileW: isShapeType(gtype)
              ? (shapeV2Drag ? startW0 : (Number(btnG.width) || (shapeDragDef ? shapeDragDef.w : 12)))
              : null,
            startStretchX: isShapeType(gtype) ? shapeStretchFromBtn(btnG).sx : 1,
            startStretchY: isShapeType(gtype) ? shapeStretchFromBtn(btnG).sy : 1,
            shapeContentBox: isShapeType(gtype) && (shapeV2Drag || !!(btnG.shapeContentBox ||
              (btnG._ix && btnG._ix.shapeContentBox))),
            shapeBoxV2: shapeV2Drag,
            startBox: shapeV2Drag ? { cx: startX0, cy: startY0, w: startW0, h: startH0 } : null,
            keepRatio: isShapeType(gtype) ? (shapeCornerHandle &&
              shapeCornerKeepRatioDefault(gtype, !!ev.shiftKey)) :
              (isSquareShapeType(gtype) ||
              ((gtype === 'OVERLAY_GROUP' || gtype === 'GROUP') ? !ev.shiftKey : !!ev.shiftKey)),
            layerAspect: layerAspect,
            historyPushed: false,
            live: true
          };
          if (isShapeType(gtype) && handleMode !== 'rotate' && shapeResizeTraceEnabled()) {
            shapeResizeTrace('1.startBox(transformstart)', {
              btnId: gid,
              sceneId: sceneIdG,
              type: gtype,
              startBox: transformDrag.startBox,
              modelVm: shapeModelFields(btnG),
              modelIx: readShapeTraceIxRaw(sceneIdG, gid),
              stretch: {
                scaleX: transformDrag.startStretchX,
                scaleY: transformDrag.startStretchY
              }
            });
            shapeTraceNumBox('1.startBox', transformDrag.startBox, 'src=getShapeBox');
            shapeTraceNum('1.modelIx', readShapeTraceIxRaw(sceneIdG, gid), 'src=ix');
            shapeTraceNum('1.modelVm', shapeModelFields(btnG), 'src=vm');
          }
          if (handleMode !== 'rotate') {
            try { gizmo.classList.add('is-sizing'); } catch (eSz) { /* ignore */ }
          }
          bindOverlayPointerDocs();
          try { buttonsLayer.setPointerCapture(ev.pointerId); } catch (eCapG) {}
          dragDebugLog('transformDrag armed', {
            buttonId: gid,
            type: gtype,
            mode: handleMode
          });
          return;
        }
        var moveSurface = ev.target.closest && ev.target.closest('[data-exp-sel-move]');
        if (moveSurface && moveSurface.closest('[data-exp-gizmo]')) {
          var gizmoMove = moveSurface.closest('[data-exp-gizmo]');
          var moveId = gizmoMove.getAttribute('data-gizmo-id');
          var sceneIdMove = canvas().selectedId;
          commitGroupBoundsIfNeeded(sceneIdMove, moveId);
          var btnMove = getOverlayItemVm(sceneIdMove, moveId);
          if (!btnMove) return;
          ev.preventDefault();
          ev.stopPropagation();
          canvas().selectedButtonIds = [String(moveId)];
          canvas().selectedButtonId = moveId;
          beginOverlayMove(ev, moveId, sceneIdMove, btnMove);
          return;
        }

        var hit = ev.target.closest('[data-exp-stage-btn]');
        if (!hit) {
          if (ev.target.closest('[data-exp-gizmo]')) return;
          if (canvas().activeOverlayGroupEditId) {
            exitOverlayGroupEditMode({ reselectGroup: true, persist: true });
            return;
          }
          if (ev.button !== 0) return;
          if (!overlaysEditable()) {
            canvas().selectedButtonId = null;
            canvas().selectedButtonIds = [];
            renderAll();
            return;
          }
          ev.preventDefault();
          ev.stopPropagation();
          var pctM = percentFromPointer(ev);
          overlayMarquee = {
            x0: pctM.x,
            y0: pctM.y,
            x1: pctM.x,
            y1: pctM.y,
            clientX0: ev.clientX,
            clientY0: ev.clientY,
            clientX1: ev.clientX,
            clientY1: ev.clientY,
            shift: !!ev.shiftKey,
            pointerId: ev.pointerId,
            moved: false,
            sceneId: canvas().selectedId
          };
          updateOverlayMarqueeVisual();
          bindOverlayPointerDocs();
          try { buttonsLayer.setPointerCapture(ev.pointerId); } catch (eOm) { /* ignore */ }
          return;
        }
        if (hit.isContentEditable || hit.getAttribute('contenteditable') === 'true') return;
        var bid = hit.getAttribute('data-exp-stage-btn');
        var sceneIdHit = canvas().selectedId;
        var groupedHit = resolveGroupedOverlayHit(sceneIdHit, bid);
        var editGroupId = canvas().activeOverlayGroupEditId;
        if (editGroupId && groupedHit &&
            String(groupedHit.groupId) !== String(editGroupId)) {
          exitOverlayGroupEditMode({ reselectGroup: false, persist: true });
        } else if (editGroupId && !groupedHit && !isOverlayGroupId(sceneIdHit, bid)) {
          exitOverlayGroupEditMode({ reselectGroup: false, persist: true });
        }
        /* Grouped child: 1 click → group; dblclick → deep-edit child (see dblclick below). */
        if (groupedHit) {
          var gid = groupedHit.groupId;
          var cid = groupedHit.childId;
          var inGroupEdit = String(canvas().activeOverlayGroupEditId || '') === gid;

          if (inGroupEdit) {
            groupEditPulse = null;
            ev.preventDefault();
            ev.stopPropagation();
            groupDebugLog('pointerdown: deep-edit child move', { childId: cid, groupId: gid });
            if (getSelectedOverlayIds().indexOf(cid) < 0) {
              canvas().selectedButtonIds = [cid];
              canvas().selectedButtonId = cid;
            }
            var btnEdit = getOverlayItemVm(sceneIdHit, cid);
            beginOverlayMove(ev, cid, sceneIdHit, btnEdit);
            return;
          }

          var nowPulse = Date.now();
          if (groupEditPulse &&
              String(groupEditPulse.groupId) === gid &&
              String(groupEditPulse.childId) === cid &&
              (nowPulse - groupEditPulse.at) < 480) {
            groupEditPulse = null;
            ev.preventDefault();
            ev.stopPropagation();
            cancelOverlayGestures();
            groupDebugLog('pointerdown: double-tap → enter deep-edit', { groupId: gid, childId: cid });
            enterOverlayGroupEditMode(gid, cid);
            return;
          }

          ev.preventDefault();
          ev.stopPropagation();
          groupEditPulse = { groupId: gid, childId: cid, at: nowPulse };
          groupDebugLog('pointerdown: single click → select group', {
            groupId: gid,
            childId: cid,
            armedDoubleTap: true
          });
          canvas().activeOverlayGroupEditId = null;
          if (buttonsLayer) buttonsLayer.classList.remove('is-group-edit-mode');

          if (ev.shiftKey) {
            var curGrouped = getSelectedOverlayIds();
            var idxG = curGrouped.indexOf(gid);
            if (idxG >= 0) curGrouped.splice(idxG, 1);
            else curGrouped.push(gid);
            canvas().selectedButtonIds = curGrouped;
            canvas().selectedButtonId = curGrouped.length
              ? curGrouped[curGrouped.length - 1]
              : null;
            paintButtonsStage();
            paintInspector();
            notifyOverlaySelection();
            return;
          }

          canvas().selectedButtonIds = [gid];
          canvas().selectedButtonId = gid;
          var btnGroup = getOverlayItemVm(sceneIdHit, gid);
          dragDebugLog('pointerdown: grouped → beginOverlayMove(group)', {
            groupId: gid,
            childId: cid
          });
          beginOverlayMove(ev, gid, sceneIdHit, btnGroup);
          notifyOverlaySelection();
          return;
        }
        groupEditPulse = null;
        ev.preventDefault();
        ev.stopPropagation();
        bid = resolveOverlayPickId(sceneIdHit, bid);
        groupDebugLog('pointerdown: ungrouped path', {
          bid: bid,
          resolvedFrom: hit.getAttribute('data-exp-stage-btn'),
          editGroupId: canvas().activeOverlayGroupEditId || null
        });
        var cur = getSelectedOverlayIds();
        if (ev.shiftKey) {
          canvas().activeOverlayGroupEditId = null;
          var idx = cur.indexOf(String(bid));
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(String(bid));
          canvas().selectedButtonIds = cur;
          canvas().selectedButtonId = cur.length ? cur[cur.length - 1] : null;
          paintButtonsStage();
          paintInspector();
          notifyOverlaySelection();
          return;
        }
        if (cur.indexOf(String(bid)) < 0 || cur.length <= 1) {
          canvas().selectedButtonIds = [String(bid)];
          canvas().selectedButtonId = bid;
          if (!isOverlayGroupId(sceneIdHit, bid)) {
            canvas().activeOverlayGroupEditId = null;
          }
        } else {
          canvas().selectedButtonId = bid;
        }
        var sceneId = canvas().selectedId;
        var btn = getOverlayItemVm(sceneId, bid);
        var alreadyOnlySelected = cur.length === 1 && String(cur[0]) === String(bid);
        beginOverlayMove(ev, bid, sceneId, btn, {
          selectionPaintNeeded: !alreadyOnlySelected
        });
      });
      buttonsLayer.addEventListener('dblclick', function (ev) {
        var sceneId = canvas().selectedId;
        var grouped = resolveGroupedChildFromEvent(ev, sceneId);
        groupDebugLog('dblclick (native fallback)', grouped);
        if (!grouped) return;
        ev.preventDefault();
        ev.stopPropagation();
        cancelOverlayGestures();
        groupEditPulse = null;
        enterOverlayGroupEditMode(grouped.groupId, grouped.childId);
      }, true);
      function endButtonDrag(ev) {
        if (finishOverlayMarquee(ev)) return;
        if (groupPointerGesture && (!ev || ev.pointerId === groupPointerGesture.pointerId)) {
          finishGroupPointerGesture(ev);
          return;
        }
        if (transformDrag && (!ev || ev.pointerId === transformDrag.pointerId)) {
          var movedT = transformDrag.historyPushed;
          var wasRotate = transformDrag.mode === 'rotate';
          var endMode = transformDrag.mode;
          var rotBtnId = transformDrag.buttonId;
          var endScene = transformDrag.sceneId;
          var endType = transformDrag.type;
          var dragShapePatch = transformDrag.liveShapePatch;
          var endedLiveRefs = transformDrag.liveRefs;
          var endedDrag = transformDrag;
          transformDrag = null;
          unbindOverlayPointerDocs();
          var liveShapePatch = dragShapePatch;
          var finLive = null;
          if (endedDrag && isShapeType(endType) && !wasRotate) {
            flushShapeResizeFrame(endedDrag);
            var endDx = endedDrag.lastShapeDx != null ? endedDrag.lastShapeDx : (endedDrag.lastDxPx || 0);
            var endDy = endedDrag.lastShapeDy != null ? endedDrag.lastShapeDy : (endedDrag.lastDyPx || 0);
            finLive = computeShapeResizeLive(
              endedDrag,
              endDx,
              endDy,
              endedDrag.layerW,
              endedDrag.layerH,
              endMode,
              endedDrag.keepRatio
            );
            liveShapePatch = resolveShapeResizeCommitPatch(
              endedDrag,
              finLive && finLive.patch,
              dragShapePatch || endedDrag.liveShapePatch
            );
            if (shapeResizeTraceEnabled()) {
              shapeResizeTrace('2.finalBox(transformend)', {
                btnId: rotBtnId,
                sceneId: endScene,
                endDx: endDx,
                endDy: endDy,
                finBox: finLive && finLive.box ? {
                  cx: finLive.box.cx,
                  cy: finLive.box.cy,
                  w: finLive.box.w,
                  h: finLive.box.h,
                  scaleX: finLive.stretchX,
                  scaleY: finLive.stretchY
                } : null,
                finGm: finLive && finLive.gm ? finLive.gm : null
              });
              shapeResizeTrace('3.finalPatch(transformend)', {
                btnId: rotBtnId,
                sceneId: endScene,
                liveShapePatch: patchModelFields(liveShapePatch),
                dragShapePatch: patchModelFields(dragShapePatch),
                finPatch: patchModelFields(finLive && finLive.patch),
                startBox: endedDrag.startBox || null
              });
              if (finLive && finLive.box) {
                shapeTraceNumBox('2.finalBox', {
                  cx: finLive.box.cx, cy: finLive.box.cy,
                  w: finLive.box.w, h: finLive.box.h,
                  scaleX: finLive.stretchX, scaleY: finLive.stretchY,
                  shapeContentBox: true
                }, 'endDx=' + (+endDx).toFixed(1) + ' endDy=' + (+endDy).toFixed(1));
              }
              shapeTraceNum('3.patch.liveShapePatch', patchModelFields(liveShapePatch), 'COMMIT');
              shapeTraceNum('3.patch.dragShapePatch', patchModelFields(dragShapePatch), 'drag');
              shapeTraceNum('3.patch.finPatch', patchModelFields(finLive && finLive.patch), 'finLive');
              shapeTraceNumBox('3.startBox', endedDrag.startBox, 'ref');
            }
          }
          if (wasRotate && !movedT) {
            rotateTapArmed = { buttonId: rotBtnId, at: Date.now() };
          } else {
            rotateTapArmed = null;
          }
          /* Final snap + round stored geometry after live resize. */
          var committedShapeResize = false;
          var shapeDragPx = endedDrag ? Math.hypot(
            Number(endedDrag.lastDxPx) || 0,
            Number(endedDrag.lastDyPx) || 0
          ) : 0;
          var shapePatchChanged = endedDrag && endedDrag.startBox &&
            shapeResizePatchChanged(endedDrag.startBox, liveShapePatch);
          var shapeResizeMoved = movedT || (
            endedDrag && endedDrag.shapeBoxV2 && isShapeType(endType) && shapeDragPx > 1.5
          );
          if (!wasRotate && endScene && rotBtnId) {
            if (isShapeType(endType) && liveShapePatch && shapePatchChanged) {
              if (shapeResizeTraceEnabled()) {
                _shapeResizeTraceCtx = { sceneId: endScene, btnId: rotBtnId };
                shapeResizeTrace('4.updateSceneButton(call)', {
                  btnId: rotBtnId,
                  sceneId: endScene,
                  patch: patchModelFields(liveShapePatch),
                  modelBeforeVm: readShapeTraceModel(endScene, rotBtnId),
                  modelBeforeIx: readShapeTraceIxRaw(endScene, rotBtnId)
                });
                shapeTraceNum('4.beforeCommit.modelIx', readShapeTraceIxRaw(endScene, rotBtnId), 'pre-update');
                shapeTraceNum('4.beforeCommit.patch', patchModelFields(liveShapePatch), 'patch→updateSceneButton');
              }
              ExperienciaEngine.updateSceneButton(state, endScene, rotBtnId, liveShapePatch);
              committedShapeResize = true;
              if (shapeResizeTraceEnabled()) {
                shapeResizeTrace('5.model-after-updateSceneButton(return)', {
                  btnId: rotBtnId,
                  sceneId: endScene,
                  modelVm: readShapeTraceModel(endScene, rotBtnId),
                  modelIx: readShapeTraceIxRaw(endScene, rotBtnId)
                });
                shapeTraceNum('5.afterUpdate.modelIx', readShapeTraceIxRaw(endScene, rotBtnId), 'post-updateSceneButton');
                shapeTraceNum('5.afterUpdate.modelVm', readShapeTraceModel(endScene, rotBtnId), 'post-updateSceneButton');
              }
              persist();
            } else if (isShapeType(endType) && shapeResizeTraceEnabled()) {
              shapeResizeTrace('4.updateSceneButton(SKIPPED)', {
                btnId: rotBtnId,
                sceneId: endScene,
                reason: !liveShapePatch ? 'no-liveShapePatch'
                  : !shapePatchChanged ? 'patch-unchanged-vs-startBox' : 'unknown',
                liveShapePatch: patchModelFields(liveShapePatch),
                shapePatchChanged: shapePatchChanged,
                shapeResizeMoved: shapeResizeMoved,
                movedT: movedT,
                modelVm: readShapeTraceModel(endScene, rotBtnId),
                modelIx: readShapeTraceIxRaw(endScene, rotBtnId)
              });
            } else if (movedT && !isShapeType(endType)) {
              if (endType === 'OVERLAY_GROUP' || endType === 'GROUP') {
                commitGroupBoundsIfNeeded(endScene, rotBtnId);
              } else {
            var endBtn = ExperienciaEngine.getSceneButton(
              state, ExperienciaEngine.getNode(state, endScene), rotBtnId
            );
            if (endBtn) {
              var szShapeFin = overlayLayerSize();
              var cx = endBtn.storedX != null ? Number(endBtn.storedX) : Number(endBtn.x);
              var cy = endBtn.storedY != null ? Number(endBtn.storedY) : Number(endBtn.y);
              var ew = endType === 'BUTTON'
                ? (endBtn.boxW != null ? Number(endBtn.boxW) : 14)
                : (Number(endBtn.width) || 12);
              var eh = endType === 'BUTTON'
                ? (endBtn.boxH != null ? Number(endBtn.boxH) : 4.5)
                : (Number(endBtn.height) || 8);
              if (!(ev && ev.shiftKey)) {
                var resizeLinesF = collectOverlayAlignLines(endScene, rotBtnId, {
                  L: cx - ew / 2,
                  R: cx + ew / 2,
                  T: cy - eh / 2,
                  B: cy + eh / 2,
                  cx: cx,
                  cy: cy
                });
                var snappedF = snapBoxToSceneGuides(cx, cy, ew, eh, endMode, {
                  linesX: resizeLinesF.x,
                  linesY: resizeLinesF.y,
                  snapDist: 1.25
                });
                cx = snappedF.x;
                cy = snappedF.y;
                ew = snappedF.w;
                eh = snappedF.h;
              }
              var finalize = { x: cx, y: cy };
              if (endType === 'BUTTON') {
                finalize.boxW = ew;
                finalize.boxH = eh;
              }
              ExperienciaEngine.updateSceneButton(state, endScene, rotBtnId, finalize);
            }
              }
            }
          }
          try {
            if (!endedLiveRefs) {
              var gizmoEnd = buttonsLayer && buttonsLayer.querySelector('[data-exp-gizmo]');
              if (gizmoEnd) gizmoEnd.classList.remove('is-sizing');
            }
          } catch (eGz) { /* ignore */ }
          var shapeResizeSettled = isShapeType(endType) && rotBtnId && !wasRotate &&
            committedShapeResize;
          if (isShapeType(endType) && rotBtnId && !wasRotate && shapeResizeTraceEnabled() &&
              !committedShapeResize) {
            _shapeResizeTraceCtx = { sceneId: endScene, btnId: rotBtnId };
          }
          if (shapeResizeSettled) {
            if (!syncOverlayShapeFromModel(endScene, rotBtnId)) {
              paintButtonsStage();
            }
            mountOverlaySelectionGizmos(getSelectedOverlayIds());
          } else {
            if (endedLiveRefs) clearShapeLiveSizingStyles(endedLiveRefs);
            paintButtonsStage();
          }
          paintInspector();
          if (isShapeType(endType) && rotBtnId) {
            scheduleShapeDebugLog('dragend', [String(rotBtnId)], {
              moved: movedT,
              shapeResizeMoved: shapeResizeMoved,
              shapePatchChanged: shapePatchChanged,
              shapeDragPx: +shapeDragPx.toFixed(2),
              committedShapeResize: committedShapeResize,
              wasRotate: wasRotate,
              mode: endMode,
              liveShapePatch: liveShapePatch || null,
              dragShapePatch: dragShapePatch || null,
              startBox: endedDrag ? endedDrag.startBox : null
            });
          }
          if (movedT && !committedShapeResize) persist();
          return;
        }
        if (!buttonDrag || (ev && ev.pointerId !== buttonDrag.pointerId)) return;
        var moved = buttonDrag.historyPushed;
        var dragScene = buttonDrag.sceneId;
        var dragBtn = buttonDrag.buttonId;
        var dragOriginX = buttonDrag.originX;
        var dragOriginY = buttonDrag.originY;
        var dragOrigins = buttonDrag.origins;
        var dragGroupIds = buttonDrag.groupIds;
        var dragIsGroup = buttonDrag.isOverlayGroup;
        var endedMoveLiveRefs = buttonDrag.moveLiveRefs;
        var selectionPaintNeeded = buttonDrag.selectionPaintNeeded;
        if (buttonDrag.moveRaf) cancelAnimationFrame(buttonDrag.moveRaf);
        flushShapeMoveFrame(buttonDrag);
        buttonDrag = null;
        unbindOverlayPointerDocs();
        if (endedMoveLiveRefs) clearShapeMoveLiveStyles(endedMoveLiveRefs);
        var szUp = overlayLayerSize();
        if (!moved && endedMoveLiveRefs && dragScene && dragOrigins) {
          restoreOverlayDragOrigins(dragScene, dragOrigins);
        } else if (!moved && endedMoveLiveRefs && dragScene && dragBtn != null &&
            dragOriginX != null && dragOriginY != null) {
          ExperienciaEngine.setSceneButtonPosition(
            state, dragScene, dragBtn, dragOriginX, dragOriginY, szUp.w, szUp.h
          );
        } else if (moved && dragScene && dragOrigins && dragGroupIds && dragGroupIds.length > 1) {
          var allNear = true;
          dragGroupIds.forEach(function (id) {
            var orig = dragOrigins[String(id)];
            if (!orig) return;
            var endBtn = ExperienciaEngine.getSceneButton(
              state, ExperienciaEngine.getNode(state, dragScene), id
            );
            if (!endBtn) return;
            var endX = endBtn.storedX != null ? Number(endBtn.storedX) : Number(endBtn.x);
            var endY = endBtn.storedY != null ? Number(endBtn.storedY) : Number(endBtn.y);
            if (Math.abs(endX - orig.x) >= 0.05 || Math.abs(endY - orig.y) >= 0.05) {
              allNear = false;
            }
          });
          if (allNear && buttonHistory.past.length) {
            buttonHistory.past.pop();
            moved = false;
            restoreOverlayDragOrigins(dragScene, dragOrigins);
          }
        } else if (moved && dragScene && dragBtn != null &&
            dragOriginX != null && dragOriginY != null) {
          var endBtn = ExperienciaEngine.getSceneButton(
            state, ExperienciaEngine.getNode(state, dragScene), dragBtn
          );
          if (endBtn) {
            var endX = endBtn.storedX != null ? Number(endBtn.storedX) : Number(endBtn.x);
            var endY = endBtn.storedY != null ? Number(endBtn.storedY) : Number(endBtn.y);
            if (Math.abs(endX - dragOriginX) < 0.05 && Math.abs(endY - dragOriginY) < 0.05 &&
                buttonHistory.past.length) {
              buttonHistory.past.pop();
              moved = false;
            }
          }
        }
        if (moved && dragScene && canvas().activeOverlayGroupEditId) {
          /* Child edit: locals already updated live — never sync/recenter group on release. */
        } else if (moved && dragScene && dragIsGroup) {
          finalizeOverlayGroupMoveFrame(dragScene, dragBtn);
        }
        if (moved) {
          paintButtonsStage();
        } else if (selectionPaintNeeded) {
          mountOverlaySelectionGizmos(getSelectedOverlayIds());
        }
        paintInspector();
        if (!moved && dragBtn != null) {
          var upVm = getOverlayItemVm(dragScene, dragBtn);
          if (upVm && isShapeType(upVm.type)) {
            scheduleShapeDebugLog('selection/click', [String(dragBtn)]);
          }
        }
        if (moved) persist();
      }
      buttonsLayer.addEventListener('pointerup', endButtonDrag);
      buttonsLayer.addEventListener('pointercancel', endButtonDrag);
      if (GROUP_DEBUG) {
        groupDebugLog('instrumentation ready v7476', {
          sceneId: canvas().selectedId,
          overlayMode: overlayMode
        });
        dragDebugLog('drag trace enabled — filter [QE:drag]');
      }
      window.addEventListener('blur', function () {
        finishButtonNudge();
        cancelOverlayGestures();
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          finishButtonNudge();
          cancelOverlayGestures();
        }
      });
      buttonsLayer.addEventListener('contextmenu', function (ev) {
        if (!overlayMode) return;
        var ids = getSelectedOverlayIds();
        var sceneId = canvas().selectedId;
        var canUngroup = false;
        if (sceneId && ids.length && ExperienciaEngine.resolveOverlayGroupForSelection) {
          var nCtx = ExperienciaEngine.getNode(state, sceneId);
          canUngroup = !!(nCtx && ExperienciaEngine.resolveOverlayGroupForSelection(nCtx, ids));
        }
        if (ids.length < 2 && !canUngroup) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof api.onMultiSelectionContextMenu === 'function') {
          api.onMultiSelectionContextMenu(ev.clientX, ev.clientY, ids);
        }
      }, true);
      /* Force hover color in Builder (theme tokens otherwise keep white). */
      buttonsLayer.addEventListener('mouseover', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.builder-exp-ui-btn.is-hover-on');
        if (!btn || btn._hoverPainted) return;
        var c = btn.getAttribute('data-hover-color') ||
          (btn.style && btn.style.getPropertyValue('--btn-hover-color')) || '';
        var tc = btn.getAttribute('data-hover-text') ||
          (btn.style && btn.style.getPropertyValue('--btn-hover-text')) || '';
        c = String(c || '').trim();
        tc = String(tc || '').trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(c)) return;
        btn._hoverPainted = true;
        btn.style.setProperty('color', (/^#[0-9a-fA-F]{6}$/.test(tc) ? tc : c), 'important');
        btn.style.setProperty('border-color', c, 'important');
        btn.style.setProperty('background',
          'color-mix(in srgb, ' + c + ' 32%, rgba(8, 8, 8, 0.72))', 'important');
      });
      buttonsLayer.addEventListener('mouseout', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.builder-exp-ui-btn');
        if (!btn || !btn._hoverPainted) return;
        var to = ev.relatedTarget;
        if (to && btn.contains(to)) return;
        btn._hoverPainted = false;
        btn.style.removeProperty('color');
        btn.style.removeProperty('border-color');
        btn.style.removeProperty('background');
      });
      buttonsLayer.addEventListener('dblclick', function (ev) {
        if (canvas().editMode !== 'buttons') return;
        var hit = ev.target.closest('[data-exp-stage-text][data-exp-stage-btn]');
        if (!hit) return;
        ev.preventDefault();
        ev.stopPropagation();
        var bid = hit.getAttribute('data-exp-stage-btn');
        var sceneId = canvas().selectedId;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid
        );
        if (!btn || String(btn.type || '').toUpperCase() !== 'TEXT') return;
        if (btn.locked) return;
        canvas().selectedButtonIds = [String(bid)];
        canvas().selectedButtonId = bid;
        if (textEditEl && textEditEl !== hit) {
          textEditEl.contentEditable = 'false';
          textEditEl.removeAttribute('contenteditable');
        }
        textEditEl = hit;
        hit.contentEditable = 'true';
        hit.setAttribute('contenteditable', 'true');
        hit.focus();
        try {
          var range = document.createRange();
          range.selectNodeContents(hit);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (eSel) {}
        function commitTextEdit() {
          if (!textEditEl || textEditEl !== hit) return;
          var next = String(hit.innerText || hit.textContent || '').replace(/\n+/g, ' ').trim();
          hit.contentEditable = 'false';
          hit.removeAttribute('contenteditable');
          textEditEl = null;
          hit.removeEventListener('blur', commitTextEdit);
          hit.removeEventListener('keydown', onTextKey);
          pushButtonHistory(sceneId);
          ExperienciaEngine.updateSceneButton(state, sceneId, bid, {
            label: next || 'Texto'
          });
          paintButtonsStage();
          paintInspector();
          persist();
        }
        function onTextKey(kev) {
          if (kev.key === 'Enter' && !kev.shiftKey) {
            kev.preventDefault();
            hit.blur();
          } else if (kev.key === 'Escape') {
            kev.preventDefault();
            hit.textContent = btn.label != null ? String(btn.label) : 'Texto';
            hit.blur();
          }
        }
        hit.addEventListener('blur', commitTextEdit);
        hit.addEventListener('keydown', onTextKey);
        paintInspector();
      });
    }

    if (buttonsFrame) {
      buttonsFrame.addEventListener('pointerdown', function (ev) {
        if (ev.target.closest('[data-exp-stage-btn]')) return;
        if (ev.target.closest('[data-exp-gizmo]')) return;
        if (ev.target.closest('[data-exp-buttons-layer]')) return;
        if (buttonDrag || transformDrag || overlayMarquee) return;
        if (canvas().activeOverlayGroupEditId) {
          exitOverlayGroupEditMode({ reselectGroup: true, persist: true });
          return;
        }
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        paintButtonsStage();
        paintInspector();
        notifyOverlaySelection();
      });
    }

    /* V6.2.00 — HOTSPOTS polygon draw / edit */
    if (hotspotsLayer) {
      hotspotsLayer.addEventListener('dblclick', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        ev.preventDefault();
        ev.stopPropagation();
        if (hotspotDraw) {
          closeHotspotDraft();
          return;
        }
        /* Insert vertex on selected polygon at click */
        var poly = ev.target.closest('[data-exp-hs-poly]');
        if (!poly) return;
        var hid = poly.getAttribute('data-exp-hs-poly');
        if (!hid) return;
        canvas().selectedHotspotId = hid;
        var pct = hotspotPercentFromPointer(ev);
        var mask = ExperienciaEngine.getSceneHotspotMask(state,
          ExperienciaEngine.getNode(state, canvas().selectedId), hid);
        if (!mask || !mask.polygon || mask.polygon.length < 3) return;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < mask.polygon.length; i++) {
          var a = mask.polygon[i];
          var b = mask.polygon[(i + 1) % mask.polygon.length];
          var mx = (a.x + b.x) / 2;
          var my = (a.y + b.y) / 2;
          var d = (pct.x - mx) * (pct.x - mx) + (pct.y - my) * (pct.y - my);
          if (d < bestD) { bestD = d; best = i; }
        }
        ExperienciaEngine.insertHotspotVertex(
          state, canvas().selectedId, hid, best, pct.x, pct.y
        );
        paintHotspotsStage();
        paintInspector();
        persist();
      });
      hotspotsLayer.addEventListener('pointerdown', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        var pct = hotspotPercentFromPointer(ev);
        var vertex = ev.target.closest('[data-exp-hs-vertex]');
        var poly = ev.target.closest('[data-exp-hs-poly]');

        if (hotspotDraw) {
          ev.preventDefault();
          ev.stopPropagation();
          hotspotDraw.points.push(pct);
          paintHotspotsStage();
          return;
        }

        if (vertex) {
          ev.preventDefault();
          ev.stopPropagation();
          var hid = vertex.getAttribute('data-exp-hs-vertex');
          canvas().selectedHotspotId = hid;
          hotspotDrag = {
            kind: 'vertex',
            hotspotId: hid,
            index: Number(vertex.getAttribute('data-exp-hs-vi')),
            pointerId: ev.pointerId
          };
          try { hotspotsLayer.setPointerCapture(ev.pointerId); } catch (eCap) {}
          paintHotspotsStage();
          paintInspector();
          return;
        }

        if (poly) {
          ev.preventDefault();
          ev.stopPropagation();
          var pid = poly.getAttribute('data-exp-hs-poly');
          canvas().selectedHotspotId = pid;
          hotspotDrag = {
            kind: 'move',
            hotspotId: pid,
            pointerId: ev.pointerId,
            lastX: pct.x,
            lastY: pct.y,
            moved: false
          };
          try { hotspotsLayer.setPointerCapture(ev.pointerId); } catch (eCap2) {}
          paintHotspotsStage();
          paintInspector();
          return;
        }

        canvas().selectedHotspotId = null;
        paintHotspotsStage();
        paintInspector();
      });
      hotspotsLayer.addEventListener('pointermove', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        var pct = hotspotPercentFromPointer(ev);
        if (hotspotDraw) {
          hotspotDraw.cursor = pct;
          paintHotspotsStage();
          return;
        }
        if (!hotspotDrag || ev.pointerId !== hotspotDrag.pointerId) return;
        var sceneId = canvas().selectedId;
        if (hotspotDrag.kind === 'vertex') {
          ExperienciaEngine.setHotspotVertex(
            state, sceneId, hotspotDrag.hotspotId, hotspotDrag.index, pct.x, pct.y
          );
          paintHotspotsStage();
        } else if (hotspotDrag.kind === 'move') {
          var dx = pct.x - hotspotDrag.lastX;
          var dy = pct.y - hotspotDrag.lastY;
          if (dx || dy) {
            ExperienciaEngine.translateHotspotMask(
              state, sceneId, hotspotDrag.hotspotId, dx, dy
            );
            hotspotDrag.lastX = pct.x;
            hotspotDrag.lastY = pct.y;
            hotspotDrag.moved = true;
            paintHotspotsStage();
          }
        }
      });
      function endHotspotDrag(ev) {
        if (!hotspotDrag || (ev && ev.pointerId !== hotspotDrag.pointerId)) return;
        var moved = !!hotspotDrag.moved || hotspotDrag.kind === 'vertex';
        hotspotDrag = null;
        paintHotspotsStage();
        paintInspector();
        if (moved) persist();
      }
      hotspotsLayer.addEventListener('pointerup', endHotspotDrag);
      hotspotsLayer.addEventListener('pointercancel', endHotspotDrag);
    }

    var fsBtn = rootEl.querySelector('[data-exp-fullscreen]');
    if (fsBtn) {
      fsBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleBrowserFullscreen();
      });
    }
    function onFullscreenChange() {
      syncFocusFullscreenBtn();
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    var hideMini = rootEl.querySelector('[data-exp-minimap-hide]');
    if (hideMini) {
      hideMini.addEventListener('click', function () {
        canvas().minimapVisible = false;
        renderAll(); persist();
      });
    }

    var exitGroup = rootEl.querySelector('#builderExpExitGroupBtn');
    if (exitGroup) {
      exitGroup.addEventListener('click', function () {
        ExperienciaEngine.exitGroup(state);
        renderAll(); persist();
      });
    }

    viewport.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var factor = ev.deltaY > 0 ? 0.92 : 1.08;
      var before = clientToWorld(ev.clientX, ev.clientY);
      var next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (canvas().zoom || 1) * factor));
      canvas().zoom = next;
      var rect = viewport.getBoundingClientRect();
      canvas().panX = ev.clientX - rect.left - before.x * next;
      canvas().panY = ev.clientY - rect.top - before.y * next;
      applyWorldTransform();
      paintMinimap();
    }, { passive: false });

    viewport.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      hidePicker();
      var edgePath = ev.target.closest('[data-exp-edge]');
      if (edgePath) {
        openEdgeContextMenu(ev.clientX, ev.clientY, edgePath.getAttribute('data-exp-edge'));
        return;
      }
      var ixRow = ev.target.closest('[data-exp-interaction]');
      if (ixRow) {
        openInteractionContextMenu(
          ev.clientX,
          ev.clientY,
          ixRow.getAttribute('data-exp-scene'),
          ixRow.getAttribute('data-exp-interaction')
        );
        return;
      }
      var card = ev.target.closest('[data-exp-node]');
      if (card) {
        openNodeContextMenu(ev.clientX, ev.clientY, card.getAttribute('data-exp-node'));
        return;
      }
      var worldPt = clientToWorld(ev.clientX, ev.clientY);
      openCreateMenu(worldPt, null, { x: ev.clientX, y: ev.clientY }, 'Crear nuevo');
    });

    viewport.addEventListener('pointerdown', function (ev) {
      if (ev.button === 2) return;
      try { viewport.focus({ preventScroll: true }); } catch (ef) { try { viewport.focus(); } catch (ef2) {} }
      hideCtx();
      hidePicker();
      var tool = canvas().tool || 'select';
      var edgePath = ev.target.closest('[data-exp-edge]');

      if (tool === 'cut' && edgePath) {
        ExperienciaEngine.removeEdge(state, edgePath.getAttribute('data-exp-edge'));
        hoverCutEdgeId = null;
        renderAll(); persist();
        return;
      }

      if (edgePath && tool !== 'cut') {
        selectEdge(edgePath.getAttribute('data-exp-edge'));
        return;
      }

      var heroSlot = ev.target.closest('[data-exp-hero-slot]');
      if (heroSlot && tool === 'select') {
        ev.stopPropagation();
        selectNode('exp-hero');
        var slotId = heroSlot.getAttribute('data-exp-hero-slot');
        var field = heroSlot.getAttribute('data-slot-field');
        if ((slotId === 'hero-share' || slotId === 'hero-fullscreen') && field &&
            ev.target.closest('.builder-exp-card__badge')) {
          var hc = ExperienciaEngine.ensureHeroContent(state);
          ExperienciaEngine.setHeroContentField(state, field, !(hc[field] !== false));
          ExperienciaEngine.ensureFlow(state);
          renderAll(); persist();
          return;
        }
        if (slotId === 'nav' || slotId === 'hero-explorar') {
          return;
        }
        if (slotId === 'hero-whatsapp') {
          return;
        }
        return;
      }

      /* Interaction row (not the port circle): select interaction, don't start card drag */
      var ixHit = ev.target.closest('[data-exp-interaction]');
      if (ixHit && tool === 'select' && !ev.target.closest('[data-exp-port]')) {
        ev.stopPropagation();
        selectInteraction(
          ixHit.getAttribute('data-exp-scene'),
          ixHit.getAttribute('data-exp-interaction')
        );
        return;
      }

      var addElBtn = ev.target.closest('[data-exp-add-element]');
      if (addElBtn && tool === 'select') {
        ev.stopPropagation();
        ev.preventDefault();
        openAddElementMenu(
          addElBtn.getAttribute('data-exp-add-element'),
          { x: ev.clientX, y: ev.clientY }
        );
        return;
      }

      var port = ev.target.closest('[data-exp-port="out"]');
      if (!port) {
        var irow = ev.target.closest('[data-exp-irow]');
        if (irow) port = irow.querySelector('[data-exp-port="out"]');
      }
      var card = ev.target.closest('[data-exp-node]');

      if (port && tool !== 'cut') {
        ev.preventDefault();
        ev.stopPropagation();
        var fromId = port.getAttribute('data-node');
        var portId = port.getAttribute('data-port-id') || 'out';
        var portLabel = port.getAttribute('data-port-label') || '';
        var srcNode = ExperienciaEngine.getNode(state, fromId);
        if (!portLabel && srcNode && ExperienciaEngine.resolvePortLabel) {
          portLabel = ExperienciaEngine.resolvePortLabel(srcNode, portId);
        }
        var startAnchor = resolvePortAnchor(srcNode || { id: fromId, x: 0, y: 0, ports: [] }, portId, 'out');
        linkDrag = {
          fromId: fromId,
          portId: portId,
          portLabel: portLabel,
          interactionId: port.getAttribute('data-interaction-id') || null,
          x: startAnchor.x,
          y: startAnchor.y,
          pointerId: ev.pointerId
        };
        ExperienciaEngine.setSelection(state, [], []);
        paintNodes();
        paintInspector();
        try { viewport.setPointerCapture(ev.pointerId); } catch (e0) {}
        paintEdges();
        return;
      }

      if (ev.target.closest('[data-exp-rename-input]') ||
          ev.target.closest('[data-exp-card-title]')) {
        /* Título: seleccionar sin iniciar drag (doble clic = rename) */
        var titleEl = ev.target.closest('[data-exp-card-title], [data-exp-rename-input]');
        var titleCard = titleEl && titleEl.closest('[data-exp-node]');
        if (titleCard && tool === 'select') {
          ev.stopPropagation();
          selectNode(titleCard.getAttribute('data-exp-node'));
        }
        return;
      }

      if (card && tool === 'select') {
        var nodeId = card.getAttribute('data-exp-node');
        var n = ExperienciaEngine.getNode(state, nodeId);
        if (!n) return;
        if (ev.shiftKey) {
          selectNode(nodeId, { toggle: true });
        } else {
          var already = selectedIds().indexOf(nodeId) >= 0 && selectedIds().length > 1;
          if (!already) selectNode(nodeId);
          else {
            /* keep multi-selection; make this the primary */
            canvas().selectedId = nodeId;
            paintNodes();
            paintInspector();
          }
        }
        if (ev.detail === 2 && (n.kind === 'structure' || n.kind === 'group' || (n.config && n.config.group))) {
          ExperienciaEngine.enterGroup(state, n.id);
          renderAll(); persist();
          return;
        }
        if (ExperienciaEngine.isLockedNode(n) && selectedIds().length === 1) {
          return; /* locked single: no drag */
        }
        var worldPt = clientToWorld(ev.clientX, ev.clientY);
        var moveIds = selectedIds().filter(function (id) {
          var nn = ExperienciaEngine.getNode(state, id);
          return nn && !ExperienciaEngine.isLockedNode(nn);
        });
        if (!moveIds.length) return;
        var origins = {};
        moveIds.forEach(function (id) {
          var nn = ExperienciaEngine.getNode(state, id);
          origins[id] = { x: nn.x || 0, y: nn.y || 0 };
        });
        dragging = {
          ids: moveIds,
          origins: origins,
          startX: worldPt.x,
          startY: worldPt.y,
          pointerId: ev.pointerId
        };
        try { viewport.setPointerCapture(ev.pointerId); } catch (e1) {}
        return;
      }

      if (!card) {
        if (spacePan || ev.button === 1 || ev.altKey) {
          panning = {
            x: ev.clientX,
            y: ev.clientY,
            panX: canvas().panX,
            panY: canvas().panY,
            pointerId: ev.pointerId
          };
          try { viewport.setPointerCapture(ev.pointerId); } catch (e2) {}
          return;
        }
        if (tool === 'select') {
          var w0 = clientToWorld(ev.clientX, ev.clientY);
          marquee = {
            x0: w0.x, y0: w0.y, x1: w0.x, y1: w0.y,
            shift: !!ev.shiftKey,
            pointerId: ev.pointerId,
            moved: false
          };
          updateMarqueeVisual();
          try { viewport.setPointerCapture(ev.pointerId); } catch (e3) {}
        }
      }
    });

    viewport.addEventListener('pointermove', function (ev) {
      if (canvas().tool === 'cut') {
        var hit = ev.target.closest ? ev.target.closest('[data-exp-edge]') : null;
        var nextHover = hit ? hit.getAttribute('data-exp-edge') : null;
        if (nextHover !== hoverCutEdgeId) {
          hoverCutEdgeId = nextHover;
          paintEdges();
        }
      }
      if (linkDrag) {
        var w = clientToWorld(ev.clientX, ev.clientY);
        linkDrag.x = w.x;
        linkDrag.y = w.y;
        paintEdges();
        return;
      }
      if (dragging) {
        var wpt = clientToWorld(ev.clientX, ev.clientY);
        var dx = wpt.x - dragging.startX;
        var dy = wpt.y - dragging.startY;
        dragging.ids.forEach(function (id) {
          var o = dragging.origins[id];
          ExperienciaEngine.setNodePosition(state, id, o.x + dx, o.y + dy, true);
          var el = nodesEl.querySelector('[data-exp-node="' + id + '"]');
          var n = ExperienciaEngine.getNode(state, id);
          if (el && n) el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
        });
        paintEdges();
        paintMinimap();
        return;
      }
      if (marquee) {
        var wm = clientToWorld(ev.clientX, ev.clientY);
        marquee.x1 = wm.x;
        marquee.y1 = wm.y;
        if (Math.abs(marquee.x1 - marquee.x0) > 3 || Math.abs(marquee.y1 - marquee.y0) > 3) {
          marquee.moved = true;
        }
        updateMarqueeVisual();
        return;
      }
      if (panning) {
        canvas().panX = panning.panX + (ev.clientX - panning.x);
        canvas().panY = panning.panY + (ev.clientY - panning.y);
        applyWorldTransform();
        paintMinimap();
      }
    });

    function endPointer(ev) {
      if (linkDrag) {
        var targetPort = document.elementFromPoint(ev.clientX, ev.clientY);
        var inPort = targetPort && targetPort.closest ? targetPort.closest('[data-exp-port="in"]') : null;
        var targetCard = targetPort && targetPort.closest ? targetPort.closest('[data-exp-node]') : null;
        if (inPort || targetCard) {
          var toId = (inPort && inPort.getAttribute('data-node')) ||
            (targetCard && targetCard.getAttribute('data-exp-node'));
          var targetPortId = (inPort && inPort.getAttribute('data-port-id')) || 'in';
          if (toId && toId !== linkDrag.fromId) {
            ExperienciaEngine.addManualEdge(
              state,
              linkDrag.fromId,
              toId,
              linkDrag.portLabel || 'flujo',
              linkDrag.portId,
              targetPortId
            );
            linkDrag = null;
            renderAll(); persist();
            return;
          }
        }
        var drop = clientToWorld(ev.clientX, ev.clientY);
        openCreateMenu(drop, {
          fromId: linkDrag.fromId,
          portId: linkDrag.portId,
          portLabel: linkDrag.portLabel,
          sourcePortId: linkDrag.portId,
          targetPortId: 'in',
          fromInteraction: !!(linkDrag.interactionId ||
            (linkDrag.portId && linkDrag.portId !== 'out' &&
              linkDrag.portId !== 'on-end' && linkDrag.portId !== 'hero-iniciar'))
        }, { x: ev.clientX, y: ev.clientY });
        linkDrag = null;
        paintNodes();
        paintEdges();
        return;
      }
      if (marquee) {
        if (marquee.moved) {
          var hitIds = nodesInMarquee();
          if (marquee.shift) {
            var merged = selectedIds().slice();
            hitIds.forEach(function (id) {
              if (merged.indexOf(id) < 0) merged.push(id);
            });
            ExperienciaEngine.setSelection(state, merged, []);
          } else {
            ExperienciaEngine.setSelection(state, hitIds, []);
          }
          if (hitIds.length) openPropertiesRail();
        } else if (!marquee.shift) {
          ExperienciaEngine.clearSelection(state);
        }
        marquee = null;
        updateMarqueeVisual();
        renderAll(); persist();
        return;
      }
      if (dragging) { dragging = null; persist(); }
      if (panning) { panning = null; persist(); }
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    function onKeyDown(ev) {
      if (ev.code === 'Space') {
        if (!isFormField(ev.target) && !renameEdit) spacePan = true;
      }
      /* V6.1.05 — arrow nudge overlays (1 / 10 / 0.5 px) */
      if (overlaysEditable() && !isFormField(ev.target) && !renameEdit) {
        var arrow = ev.key;
        if (arrow === 'ArrowUp' || arrow === 'ArrowDown' ||
            arrow === 'ArrowLeft' || arrow === 'ArrowRight') {
          /* Quotation chrome owns arrows when nothing selected — skip here in overlay. */
          if (overlayMode) {
            var hasSel = (Array.isArray(canvas().selectedButtonIds) &&
              canvas().selectedButtonIds.length) || canvas().selectedButtonId;
            if (!hasSel) return;
          }
          var step = ev.altKey ? 0.5 : (ev.shiftKey ? 10 : 1);
          var ndx = 0;
          var ndy = 0;
          if (arrow === 'ArrowLeft') ndx = -step;
          else if (arrow === 'ArrowRight') ndx = step;
          else if (arrow === 'ArrowUp') ndy = -step;
          else if (arrow === 'ArrowDown') ndy = step;
          if (nudgeSelectedButtons(ndx, ndy)) {
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
        }
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        var key = String(ev.key || '').toLowerCase();
        if (key === 'z' || key === 'y') {
          if (isFormField(ev.target) || renameEdit) return;
          /* Quotation overlay chrome owns undo/redo — avoid double-step on one chord. */
          if (overlayMode) return;
          if (overlaysEditable()) {
            ev.preventDefault();
            var ok = false;
            if (key === 'y' || (key === 'z' && ev.shiftKey)) ok = redoButtonEdit();
            else ok = undoButtonEdit();
            if (ok) {
              renderAll();
              persist();
            }
            return;
          }
        }
        if (key === 'c' || key === 'v' || key === 'x') {
          if (isFormField(ev.target) || renameEdit) return;
          var inScope = overlayMode ||
            viewport === document.activeElement ||
            rootEl.contains(document.activeElement) || rootEl.contains(ev.target) ||
            (stage && stage.contains(ev.target));
          if (!inScope && document.activeElement !== document.body) return;

          if (overlaysEditable()) {
            if (key === 'c') {
              if (!copySelectedButtons()) return;
              ev.preventDefault();
              return;
            }
            if (key === 'x') {
              if (!cutSelectedButtons()) return;
              ev.preventDefault();
              return;
            }
            if (key === 'v') {
              if (!pasteCopiedButtons()) return;
              ev.preventDefault();
              return;
            }
          }

          if (key === 'c') {
            var copyIds = selectedIds();
            if (!copyIds.length) return;
            ev.preventDefault();
            var copied = ExperienciaEngine.copySelection(state, copyIds);
            if (copied && typeof AdminNotify !== 'undefined') {
              AdminNotify.success('Copiado: ' + copied.nodeCount + ' nodo(s), ' +
                copied.edgeCount + ' conexión(es) internas');
            }
            return;
          }
          if (key === 'v') {
            if (!ExperienciaEngine.hasClipboard || !ExperienciaEngine.hasClipboard()) return;
            ev.preventDefault();
            var pasted = ExperienciaEngine.pasteClipboard(state);
            if (pasted && pasted.nodes && pasted.nodes.length) {
              var pastedIds = pasted.nodes.map(function (n) { return n.id; });
              ExperienciaEngine.setSelection(state, pastedIds, []);
              openPropertiesRail();
              renderAll(); persist();
              if (typeof AdminNotify !== 'undefined') {
                AdminNotify.success('Pegado: ' + pastedIds.length + ' nodo(s)');
              }
            }
            return;
          }
        }
      }
      if (ev.key === 'Escape') {
        if (renameEdit) {
          finishInlineRename(false);
          return;
        }
        if (canvas().editMode === 'hotspots' && hotspotDraw) {
          ev.preventDefault();
          hotspotDraw = null;
          paintHotspotsStage();
          paintInspector();
          return;
        }
        /* Quotation overlay: chrome owns dialog / inspector / deselect layers. */
        if (overlayMode) return;
        if (modalEl && !modalEl.hidden) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          return;
        }
        if (ctxMode || (ctxEl && !ctxEl.hidden)) { hideCtx(); return; }
        if (canvas().tool === 'cut') {
          canvas().tool = 'select';
          hoverCutEdgeId = null;
          syncToolUi(); persist();
          return;
        }
        if (marquee) {
          marquee = null;
          updateMarqueeVisual();
          return;
        }
        clearAllSelection();
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        if (isFormField(ev.target)) return;
        if (renameEdit) return;
        var ae = document.activeElement;
        var inCanvas = viewport === ae || rootEl.contains(ae) || rootEl.contains(ev.target);
        /* Overlay: Delete must work even when focus is on dock / body. */
        if (!overlayMode && !inCanvas) return;

        /* V6.2.00 — HOTSPOTS: delete selected mask (or vertex with Alt) */
        if (canvas().editMode === 'hotspots') {
          var hsId = canvas().selectedHotspotId;
          if (!hsId) return;
          ev.preventDefault();
          ev.stopPropagation();
          var sceneHs = canvas().selectedId;
          if (!sceneHs) return;
          if (ev.altKey) {
            var mask = ExperienciaEngine.getSceneHotspotMask(state,
              ExperienciaEngine.getNode(state, sceneHs), hsId);
            if (mask && mask.polygon && mask.polygon.length > 3) {
              ExperienciaEngine.removeHotspotVertex(
                state, sceneHs, hsId, mask.polygon.length - 1
              );
              paintHotspotsStage();
              paintInspector();
              persist();
            }
            return;
          }
          ExperienciaEngine.removeSceneHotspotMask(state, sceneHs, hsId);
          canvas().selectedHotspotId = null;
          renderAll();
          persist();
          return;
        }

        /* V6.1.04 — in BOTONES mode, Delete never removes the scene node */
        if (canvas().editMode === 'buttons') {
          var btnIds = Array.isArray(canvas().selectedButtonIds)
            ? canvas().selectedButtonIds.slice()
            : [];
          if (!btnIds.length && canvas().selectedButtonId) {
            btnIds = [canvas().selectedButtonId];
          }
          if (!btnIds.length) return;
          ev.preventDefault();
          ev.stopPropagation();
          var sceneIdDel = canvas().selectedId;
          if (!sceneIdDel) return;
          pushButtonHistory(sceneIdDel);
          btnIds.forEach(function (bid) {
            ExperienciaEngine.removeSceneButton(state, sceneIdDel, bid);
          });
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
          renderAll();
          persist();
          return;
        }

        if (overlayMode) return;

        if (!selectedIds().length && !canvas().selectedEdgeId &&
          !(canvas().selectedEdgeIds || []).length) return;
        ev.preventDefault();
        boxiesConfirm({
          title: 'Eliminar del flujo',
          message: selectedIds().length > 1
            ? '¿Eliminar ' + selectedIds().length + ' nodos del flujo? (no borra media/assets)'
            : '¿Eliminar este nodo del flujo? (no borra media/assets)',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          deleteSelection();
        });
      }
    }
    function onKeyUp(ev) {
      if (ev.code === 'Space') spacePan = false;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown' ||
          ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' ||
          ev.key === 'Alt' || ev.key === 'Shift') {
        finishButtonNudge();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.addEventListener('pointerdown', function (ev) {
      if (!ctxEl || ctxEl.hidden) return;
      if (ctxEl.contains(ev.target)) return;
      hideCtx();
    }, true);

    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', function (ev) {
        var nodes = ExperienciaEngine.visibleNodes(state);
        var b = ExperienciaEngine.bounds(nodes);
        var rect = minimapCanvas.getBoundingClientRect();
        var cw = minimapCanvas.width;
        var ch = minimapCanvas.height;
        var spanX = Math.max(1, b.maxX - b.minX);
        var spanY = Math.max(1, b.maxY - b.minY);
        var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
        var ox = (cw - spanX * scale) / 2;
        var oy = (ch - spanY * scale) / 2;
        var mx = ((ev.clientX - rect.left) * (cw / rect.width) - ox) / scale + b.minX;
        var my = ((ev.clientY - rect.top) * (ch / rect.height) - oy) / scale + b.minY;
        var vr = viewport.getBoundingClientRect();
        var z = canvas().zoom || 1;
        canvas().panX = vr.width / 2 - mx * z;
        canvas().panY = vr.height / 2 - my * z;
        renderAll(); persist();
      });
    }

    function onViewportResize() {
      recomputeOverlayLayout();
    }
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(onViewportResize);
      ro.observe(viewport);
      if (stage) ro.observe(stage);
      if (workspace) ro.observe(workspace);
      if (buttonsStage) ro.observe(buttonsStage);
      if (buttonsFrame) ro.observe(buttonsFrame);
      if (hotspotsStage) ro.observe(hotspotsStage);
      if (hotspotsFrame) ro.observe(hotspotsFrame);
      if (protoStage) ro.observe(protoStage);
    }
    window.addEventListener('resize', onViewportResize);
    document.addEventListener('fullscreenchange', onViewportResize);
    window.addEventListener('boxies:rail-toggle', onViewportResize);

    renderAll();

    /* V6.5.01 — offer restore if a richer snapshot exists (full Experiencia only).
     * V7.2.44 — Quotation Builder overlay must never show flow-recovery modal. */
    if (!overlayMode && typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.checkAndOfferRecovery) {
      ExperienciaSnapshot.checkAndOfferRecovery(state, {
        host: workspace || rootEl || document.body
      }).then(function (res) {
        if (res && res.action === 'restore') {
          renderAll();
          fitView();
          if (api.saveState) api.saveState();
          else persist();
        } else if (res && res.action === 'duplicate') {
          if (api.saveState) api.saveState();
        }
      });
    }

    function showResetConfirm() {
      boxiesConfirm({
        title: '¿Reiniciar flujo?',
        message: 'Se eliminarán del canvas todas las escenas, animaciones, conexiones y elementos de Experiencia. El Hero se conservará. Los archivos del proyecto (projectAssets) no se eliminan.',
        confirmLabel: 'Reiniciar flujo',
        cancelLabel: 'Cancelar'
      }).then(function (ok) {
        if (!ok) return;
        ExperienciaEngine.resetFlow(state);
        renderAll();
        fitView();
        if (api.saveState) api.saveState();
        else persist();
        if (typeof AdminNotify !== 'undefined') {
          AdminNotify.success('Flujo reiniciado. Solo queda el Hero.');
        }
      });
    }

    function saveDraft() {
      if (ExperienciaEngine.markExperienciaSaved) {
        ExperienciaEngine.markExperienciaSaved(state);
      } else if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
        ExperienciaSnapshot.capture(state, 'saveDraft', 'save');
      }
      if (api.saveState) api.saveState();
      else if (api.onChange) api.onChange();
      else if (typeof BuilderSession !== 'undefined') BuilderSession.save(state);
      renderAll();
      if (typeof AdminNotify !== 'undefined') {
        AdminNotify.success('Borrador de Experiencia guardado.');
      }
    }

    function showTemplateModal() {
      if (!modalEl) return;
      var analysis = ExperienciaEngine.analyzeStructureForFlow
        ? ExperienciaEngine.analyzeStructureForFlow(state)
        : { summary: {}, recommended: 'simple', stages: [], components: [] };
      var s = analysis.summary || {};
      var rec = analysis.recommended || 'simple';
      function tplCard(id, title, desc) {
        var isRec = id === rec;
        return '<button type="button" class="builder-exp-tpl-card' + (isRec ? ' is-recommended' : '') +
          '" data-exp-tpl="' + esc(id) + '">' +
          '<strong>' + esc(title) +
          (isRec ? ' <span class="builder-exp-tpl-card__badge">RECOMENDADO</span>' : '') +
          '</strong>' +
          '<span>' + esc(desc) + '</span>' +
        '</button>';
      }
      modalEl.hidden = false;
      modalEl.innerHTML =
        '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
        '<div class="builder-exp-modal__panel builder-exp-modal__panel--wide" role="dialog">' +
          '<h3 class="builder-exp-modal__title">Crear flujo base</h3>' +
          '<p class="builder-exp-modal__body"><strong>Estructura detectada</strong><br>' +
            esc(String(s.stages || 0)) + ' etapas · ' +
            esc(String(s.components || 0)) + ' componentes · ' +
            esc(String(s.units || 0)) + ' viviendas · ' +
            esc(String(s.tipologias || 0)) + ' tipologías' +
          '</p>' +
          '<p class="builder-exp-modal__body">¿Cómo quieres organizar la experiencia?</p>' +
          '<div class="builder-exp-tpl-grid">' +
            tplCard('simple', 'Recorrido simple',
              'Una entrada principal y recorrido completamente libre.') +
            tplCard('components', 'Por componentes',
              'Vista general del proyecto y una rama inicial por componente relevante.') +
            tplCard('stages', 'Por etapas',
              'Vista general del proyecto y una rama inicial por cada etapa.') +
            tplCard('empty', 'Empezar vacío',
              'Crear únicamente Hero.') +
          '</div>' +
          '<div class="builder-exp-modal__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cancelar</button>' +
          '</div>' +
        '</div>';

      function close() {
        modalEl.hidden = true;
        modalEl.innerHTML = '';
      }
      modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
        btn.addEventListener('click', close);
      });
      modalEl.querySelectorAll('[data-exp-tpl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tid = btn.getAttribute('data-exp-tpl');
          close();
          function run() {
            var result = ExperienciaEngine.applyFlowTemplate(state, tid);
            persist();
            fitViewAfterTemplate();
            if (typeof AdminNotify !== 'undefined') {
              var msg = 'Flujo base aplicado (' + tid + ').';
              if (result && result.warning) msg += ' ' + result.warning;
              AdminNotify.success(msg);
            }
          }
          if (tid === 'empty') {
            boxiesConfirm({
              title: '¿Empezar vacío?',
              message: 'Se eliminará el flujo editable y quedará solo el Hero. projectAssets no se borran.',
              confirmLabel: 'Empezar vacío',
              cancelLabel: 'Cancelar'
            }).then(function (ok) { if (ok) run(); });
            return;
          }
          var nonHero = (state.experiencia.nodes || []).filter(function (n) {
            return n && n.kind !== 'hero' && n.id !== 'exp-hero';
          }).length;
          if (nonHero > 0) {
            boxiesConfirm({
              title: 'Aplicar plantilla',
              message: 'Se conservarán nodos existentes. Se añadirá o reutilizará el tramo Hero→Intro→Vista y las ramas estructurales faltantes. No se borran recorridos manuales.',
              confirmLabel: 'Aplicar',
              cancelLabel: 'Cancelar'
            }).then(function (ok) { if (ok) run(); });
            return;
          }
          run();
        });
      });
    }

    function showStructureReviewModal() {
      if (!modalEl) return;
      var diff = ExperienciaEngine.diffStructureVsFlow
        ? ExperienciaEngine.diffStructureVsFlow(state)
        : { changes: [], hasBaseline: false };
      var analysis = ExperienciaEngine.analyzeStructureForFlow
        ? ExperienciaEngine.analyzeStructureForFlow(state)
        : { summary: {} };
      var s = analysis.summary || {};
      var listHtml = (diff.changes || []).length
        ? ('<ul class="builder-exp-inspector__list">' +
          diff.changes.map(function (c) {
            return '<li>' + esc(c.message || '') + '</li>';
          }).join('') + '</ul>')
        : '<p class="builder-exp-modal__body">Sin diferencias detectadas respecto a la última huella.</p>';

      modalEl.hidden = false;
      modalEl.innerHTML =
        '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
        '<div class="builder-exp-modal__panel builder-exp-modal__panel--wide" role="dialog">' +
          '<h3 class="builder-exp-modal__title">Estructura actualizada</h3>' +
          '<p class="builder-exp-modal__body">' +
            esc(String(s.stages || 0)) + ' etapas · ' +
            esc(String(s.components || 0)) + ' componentes · ' +
            esc(String(s.units || 0)) + ' viviendas' +
          '</p>' +
          listHtml +
          '<div class="builder-exp-modal__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cerrar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-primary" data-exp-struct-sync>Sincronizar</button>' +
          '</div>' +
        '</div>';

      function close() {
        modalEl.hidden = true;
        modalEl.innerHTML = '';
      }
      modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
        btn.addEventListener('click', close);
      });
      var syncBtn = modalEl.querySelector('[data-exp-struct-sync]');
      if (syncBtn) {
        syncBtn.addEventListener('click', function () {
          var res = ExperienciaEngine.syncStructureRefs(state);
          close();
          renderAll();
          persist();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.success('Sincronizado con Estructura (' +
              ((res && res.updated) || 0) + ' refs). Recorridos manuales conservados.');
          }
        });
      }
    }

    /* Chrome actions */
    var draftBtn = rootEl.querySelector('#builderExpDraftBtn');
    if (draftBtn) {
      draftBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        saveDraft();
      });
    }
    var resetBtn = rootEl.querySelector('#builderExpResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showResetConfirm();
      });
    }
    var resyncBtn = rootEl.querySelector('#builderExpResyncBtn');
    if (resyncBtn) {
      resyncBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (ExperienciaEngine.syncHeroOnly) ExperienciaEngine.syncHeroOnly(state);
        else ExperienciaEngine.ensureFlow(state);
        renderAll();
        persist();
        if (typeof AdminNotify !== 'undefined') {
          AdminNotify.success('Hero sincronizado desde la sección Hero.');
        }
      });
    }
    var tplBtn = rootEl.querySelector('#builderExpTemplateBtn');
    if (tplBtn) {
      tplBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showTemplateModal();
      });
    }
    var structBtn = rootEl.querySelector('#builderExpStructReviewBtn');
    if (structBtn) {
      structBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showStructureReviewModal();
      });
    }

    if (nodesEl) {
      nodesEl.addEventListener('dblclick', function (ev) {
        var title = ev.target.closest('[data-exp-card-title]');
        if (!title) return;
        ev.preventDefault();
        ev.stopPropagation();
        var nid = title.getAttribute('data-exp-card-title');
        startInlineRename(nid);
      });
    }

    requestAnimationFrame(function () {
      if (isCanvasMode()) {
        document.body.classList.add('boxies-exp-canvas-mode');
        document.documentElement.classList.add('boxies-exp-canvas-mode');
        document.documentElement.style.setProperty('--boxies-sidebar-w', '0px');
        document.documentElement.style.setProperty('--boxies-header-h', '0px');
        document.documentElement.style.setProperty('--boxies-dock-h', '0px');
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(true);
        } else {
          document.body.classList.add('boxies-rail-collapsed');
          document.documentElement.style.setProperty('--builder-rail-width', '0px');
        }
        removeLeftRailFloat();
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
          BuilderPropertiesRail.expand(state);
        } else if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(false, { state: state });
        }
        enterBrowserFullscreen();
      }
      syncFocusFullscreenBtn();
      if (canvas().panX === 40 && canvas().panY === 40) fitView();
      else onViewportResize();
    });

    function onPropsRailToggle(ev) {
      var collapsed = !!(ev && ev.detail && ev.detail.collapsed);
      canvas().inspectorOpen = true;
      canvas().inspectorCollapsed = collapsed;
      persist();
      requestAnimationFrame(function () { onViewportResize(); });
    }
    window.addEventListener('boxies:props-rail-toggle', onPropsRailToggle);

    syncInspectorChrome();
    paintInspector();

    return {
      refresh: renderAll,
      fitView: fitView,
      toggleCanvasMode: toggleCanvasMode,
      saveDraft: saveDraft,
      showResetConfirm: showResetConfirm,
      setEditMode: function (mode) {
        if (mode !== 'buttons' && mode !== 'hotspots') return;
        canvas().editMode = mode;
        if (mode === 'buttons') {
          hotspotDraw = null;
          canvas().selectedHotspotId = null;
        } else {
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        }
        renderAll();
        paintInspector();
        requestAnimationFrame(recomputeOverlayLayout);
      },
      addButton: function () {
        var sceneId = canvas().selectedId;
        if (!sceneId) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var btn = ExperienciaEngine.addSceneButton(state, sceneId);
        if (btn) {
          canvas().selectedButtonId = btn.id;
          canvas().selectedButtonIds = [String(btn.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return btn;
      },
      addText: function () {
        var sceneId = canvas().selectedId;
        if (!sceneId || !ExperienciaEngine.addSceneText) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var el = ExperienciaEngine.addSceneText(state, sceneId);
        if (el) {
          canvas().selectedButtonId = el.id;
          canvas().selectedButtonIds = [String(el.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return el;
      },
      addShape: function (kind) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !ExperienciaEngine.addSceneShape) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var szAdd = overlayLayerSize();
        var el = ExperienciaEngine.addSceneShape(state, sceneId, kind, szAdd.w, szAdd.h);
        if (el) {
          canvas().selectedButtonId = el.id;
          canvas().selectedButtonIds = [String(el.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return el;
      },
      getSelection: function () {
        var ids = Array.isArray(canvas().selectedButtonIds)
          ? canvas().selectedButtonIds.map(String)
          : [];
        if (!ids.length && canvas().selectedButtonId) {
          ids = [String(canvas().selectedButtonId)];
        }
        return {
          buttonIds: ids,
          buttonId: canvas().selectedButtonId || null,
          hotspotId: canvas().selectedHotspotId || null,
          groupEditId: canvas().activeOverlayGroupEditId || null,
          isGroupEditMode: !!canvas().activeOverlayGroupEditId,
          hasSelection: !!(ids.length || canvas().selectedHotspotId)
        };
      },
      exitGroupEditMode: function (opts) {
        return exitOverlayGroupEditMode(opts || { reselectGroup: true, persist: true });
      },
      isInGroupEditMode: function () {
        return !!canvas().activeOverlayGroupEditId;
      },
      getSelectionContext: function () {
        var ids = getSelectedOverlayIds();
        var sceneId = canvas().selectedId;
        var n = ExperienciaEngine.getNode(state, sceneId);
        var group = (n && ExperienciaEngine.resolveOverlayGroupForSelection)
          ? ExperienciaEngine.resolveOverlayGroupForSelection(n, ids)
          : null;
        var canGroup = ids.length >= 2 && !group && ids.every(function (id) {
          if (isOverlayGroupId(sceneId, id)) return false;
          var ix = n && ExperienciaEngine.getInteraction
            ? ExperienciaEngine.getInteraction(n, id)
            : null;
          if (!ix || !ix.type) return false;
          var tt = String(ix.type).toUpperCase();
          return tt === 'BUTTON' || tt === 'TEXT' || isShapeType(tt);
        });
        var canUngroup = !!group;
        return {
          buttonIds: ids,
          count: ids.length,
          canGroup: canGroup,
          canUngroup: canUngroup,
          groupId: group ? group.id : null
        };
      },
      groupSelectedOverlays: function () {
        var sceneId = canvas().selectedId;
        var ids = getSelectedOverlayIds();
        if (!sceneId || ids.length < 2 || !ExperienciaEngine.groupSceneOverlays) return false;
        pushButtonHistory(sceneId);
        var sz = overlayLayerSize();
        var group = ExperienciaEngine.groupSceneOverlays(state, sceneId, ids, sz.w, sz.h);
        if (!group) return false;
        canvas().selectedButtonIds = [String(group.id)];
        canvas().selectedButtonId = String(group.id);
        canvas().activeOverlayGroupEditId = null;
        renderAll();
        paintInspector();
        persist();
        notifyOverlaySelection();
        return true;
      },
      ungroupSelectedOverlays: function () {
        var sceneId = canvas().selectedId;
        var ids = getSelectedOverlayIds();
        if (!sceneId || !ExperienciaEngine.resolveOverlayGroupForSelection) return false;
        var n = ExperienciaEngine.getNode(state, sceneId);
        var group = ExperienciaEngine.resolveOverlayGroupForSelection(n, ids);
        if (!group || !ExperienciaEngine.ungroupSceneOverlay) return false;
        pushButtonHistory(sceneId);
        var memberIds = (group.memberIds || []).map(String);
        var szU = overlayLayerSize();
        var ok = ExperienciaEngine.ungroupSceneOverlay(state, sceneId, group.id, szU.w, szU.h);
        if (!ok) return false;
        canvas().selectedButtonIds = memberIds.slice();
        canvas().selectedButtonId = memberIds[memberIds.length - 1] || null;
        canvas().activeOverlayGroupEditId = null;
        renderAll();
        paintInspector();
        persist();
        notifyOverlaySelection();
        return true;
      },
      snapshotSelectedOverlays: function () {
        var sceneId = canvas().selectedId;
        var ids = getSelectedOverlayIds();
        if (!sceneId || !ids.length || !ExperienciaEngine.snapshotOverlayInteractions) {
          return [];
        }
        return ExperienciaEngine.snapshotOverlayInteractions(state, sceneId, ids);
      },
      nudgeSelected: function (dxPx, dyPx) {
        return nudgeSelectedButtons(dxPx, dyPx);
      },
      finishNudge: function () {
        finishButtonNudge();
      },
      copySelected: function () {
        return copySelectedButtons();
      },
      cutSelected: function () {
        return cutSelectedButtons();
      },
      pasteSelected: function () {
        return pasteCopiedButtons();
      },
      undoEdit: function () {
        if (!undoButtonEdit()) return false;
        renderAll();
        persist();
        return true;
      },
      redoEdit: function () {
        if (!redoButtonEdit()) return false;
        renderAll();
        persist();
        return true;
      },
      duplicateSelected: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id || !ExperienciaEngine.duplicateSceneButton) return null;
        var layerW = (buttonsLayer && buttonsLayer.clientWidth) || 1000;
        var layerH = (buttonsLayer && buttonsLayer.clientHeight) || 1000;
        var copy = ExperienciaEngine.duplicateSceneButton(state, sceneId, id, {
          imageW: layerW,
          imageH: layerH
        });
        if (copy) {
          canvas().selectedButtonId = copy.id;
          canvas().selectedButtonIds = [String(copy.id)];
        }
        renderAll();
        paintInspector();
        persist();
        return copy;
      },
      deleteSelected: function () {
        var sceneId = canvas().selectedId;
        var hs = canvas().selectedHotspotId;
        var ids = Array.isArray(canvas().selectedButtonIds)
          ? canvas().selectedButtonIds.slice()
          : [];
        if (!ids.length && canvas().selectedButtonId) {
          ids = [canvas().selectedButtonId];
        }
        if (!sceneId) return false;
        if (hs && ExperienciaEngine.removeSceneHotspotMask) {
          ExperienciaEngine.removeSceneHotspotMask(state, sceneId, hs);
          canvas().selectedHotspotId = null;
        } else if (ids.length) {
          pushButtonHistory(sceneId);
          ids.forEach(function (bid) {
            if (isOverlayGroupId(sceneId, bid)) {
              var nDel = ExperienciaEngine.getNode(state, sceneId);
              var gDel = nDel && ExperienciaEngine.getInteraction
                ? ExperienciaEngine.getInteraction(nDel, bid)
                : null;
              (gDel && gDel.memberIds ? gDel.memberIds : []).forEach(function (mid) {
                ExperienciaEngine.removeSceneButton(state, sceneId, mid);
              });
              if (nDel && nDel.config && Array.isArray(nDel.config.interactions)) {
                nDel.config.interactions = nDel.config.interactions.filter(function (item) {
                  return String(item.id) !== String(bid);
                });
              }
            } else {
              ExperienciaEngine.removeSceneButton(state, sceneId, bid);
            }
          });
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
          canvas().activeOverlayGroupEditId = null;
        } else {
          return false;
        }
        renderAll();
        paintInspector();
        persist();
        return true;
      },
      clearSelection: function () {
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        canvas().selectedHotspotId = null;
        canvas().activeOverlayGroupEditId = null;
        renderAll();
        paintInspector();
        return true;
      },
      cancelActiveTool: function () {
        if (!hotspotDraw) return false;
        hotspotDraw = null;
        paintHotspotsStage();
        paintInspector();
        return true;
      },
      toggleLockSelected: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id) return null;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), id);
        if (!btn) return null;
        var next = !btn.locked;
        ExperienciaEngine.updateSceneButton(state, sceneId, id, { locked: next });
        renderAll();
        paintInspector();
        persist();
        return next;
      },
      bringSelectedToFront: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id || !ExperienciaEngine.bringSceneOverlayToFront) return null;
        var res = ExperienciaEngine.bringSceneOverlayToFront(state, sceneId, id);
        renderAll();
        paintInspector();
        persist();
        return res;
      },
      /** V7.2.64 — select any overlay by id without hiding the other layer. */
      selectOverlayItem: function (itemId) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !itemId) return false;
        var n = ExperienciaEngine.getNode(state, sceneId);
        if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
        var ix = null;
        for (var i = 0; i < n.config.interactions.length; i++) {
          if (String(n.config.interactions[i].id) === String(itemId)) {
            ix = n.config.interactions[i];
            break;
          }
        }
        if (!ix) return false;
        var t = String(ix.type || '').toUpperCase();
        if (t === 'HOTSPOT') {
          canvas().editMode = 'hotspots';
          canvas().selectedHotspotId = String(itemId);
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        } else if (t === 'OVERLAY_GROUP' || t === 'GROUP') {
          canvas().editMode = 'buttons';
          canvas().activeOverlayGroupEditId = null;
          if (buttonsLayer) buttonsLayer.classList.remove('is-group-edit-mode');
          canvas().selectedButtonId = String(itemId);
          canvas().selectedButtonIds = [String(itemId)];
          canvas().selectedHotspotId = null;
        } else {
          var groupedSel = resolveGroupedOverlayHit(sceneId, itemId);
          canvas().editMode = 'buttons';
          canvas().selectedHotspotId = null;
          canvas().activeOverlayGroupEditId = null;
          if (buttonsLayer) buttonsLayer.classList.remove('is-group-edit-mode');
          if (groupedSel) {
            canvas().selectedButtonId = groupedSel.groupId;
            canvas().selectedButtonIds = [groupedSel.groupId];
          } else {
            canvas().selectedButtonId = String(itemId);
            canvas().selectedButtonIds = [String(itemId)];
          }
        }
        paintButtonsStage();
        paintHotspotsStage();
        paintInspector();
        notifyOverlaySelection();
        return true;
      },
      toggleOverlayItemSelection: function (itemId) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !itemId) return false;
        var n = ExperienciaEngine.getNode(state, sceneId);
        if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
        var ix = null;
        for (var i = 0; i < n.config.interactions.length; i++) {
          if (String(n.config.interactions[i].id) === String(itemId)) {
            ix = n.config.interactions[i];
            break;
          }
        }
        if (!ix) return false;
        var t = String(ix.type || '').toUpperCase();
        if (t === 'HOTSPOT') {
          canvas().editMode = 'hotspots';
          var hsCur = canvas().selectedHotspotId ? String(canvas().selectedHotspotId) : null;
          canvas().selectedHotspotId = hsCur === String(itemId) ? null : String(itemId);
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        } else {
          canvas().editMode = 'buttons';
          canvas().selectedHotspotId = null;
          var cur = getSelectedOverlayIds();
          var idx = cur.indexOf(String(itemId));
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(String(itemId));
          canvas().selectedButtonIds = cur;
          canvas().selectedButtonId = cur.length ? cur[cur.length - 1] : null;
        }
        paintButtonsStage();
        paintHotspotsStage();
        paintInspector();
        notifyOverlaySelection();
        return true;
      },
      setInteractionFlags: function (itemId, flags) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !itemId || !flags) return false;
        var n = ExperienciaEngine.getNode(state, sceneId);
        if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
        var ix = null;
        for (var i = 0; i < n.config.interactions.length; i++) {
          if (String(n.config.interactions[i].id) === String(itemId)) {
            ix = n.config.interactions[i];
            break;
          }
        }
        if (!ix) return false;
        var t = String(ix.type || '').toUpperCase();
        if (t === 'HOTSPOT') {
          if (flags.visible != null) {
            ix.enabled = !!flags.visible;
            ix.visible = !!flags.visible;
          }
          if (flags.locked != null) ix.locked = !!flags.locked;
        } else if (ExperienciaEngine.updateSceneButton) {
          var patch = {};
          if (flags.visible != null) patch.visible = !!flags.visible;
          if (flags.locked != null) patch.locked = !!flags.locked;
          ExperienciaEngine.updateSceneButton(state, sceneId, itemId, patch);
        }
        paintButtonsStage();
        paintHotspotsStage();
        paintInspector();
        persist();
        return true;
      },
      reorderInteraction: function (itemId, dir) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !itemId) return false;
        var n = ExperienciaEngine.getNode(state, sceneId);
        if (!n || !n.config || !Array.isArray(n.config.interactions)) return false;
        var list = n.config.interactions;
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
          if (String(list[i].id) === String(itemId)) { idx = i; break; }
        }
        if (idx < 0) return false;
        var next = idx + (dir < 0 ? -1 : 1);
        if (next < 0 || next >= list.length) return false;
        var tmp = list[idx];
        list[idx] = list[next];
        list[next] = tmp;
        paintButtonsStage();
        paintHotspotsStage();
        persist();
        return true;
      },
      startHotspotDraw: function () {
        canvas().editMode = 'hotspots';
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        canvas().selectedHotspotId = null;
        hotspotDraw = { points: [], cursor: null };
        renderAll();
        paintHotspotsStage();
        paintInspector();
        requestAnimationFrame(recomputeOverlayLayout);
        if (typeof AdminNotify !== 'undefined' && AdminNotify.info) {
          AdminNotify.info('Dibujo: clic para vértices · doble clic para cerrar · Esc cancela');
        }
      },
      setInspectorBody: function (el) {
        inspectorBody = el || null;
        paintInspector();
      },
      destroy: function () {
        _shapeBoxV2Active = false;
        _shapeBoxV2ProjectId = null;
        window.removeEventListener('boxies:props-rail-toggle', onPropsRailToggle);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        if (protoRuntimePlayer && protoRuntimePlayer.destroy) {
          try { protoRuntimePlayer.destroy(); } catch (eProto) {}
          protoRuntimePlayer = null;
        }
        if (isCanvasMode()) {
          setCanvasMode(false, null);
          document.documentElement.style.removeProperty('--boxies-sidebar-w');
          document.documentElement.style.removeProperty('--boxies-header-h');
          document.documentElement.style.removeProperty('--boxies-dock-h');
        }
        /*
         * V7.2.20 — Never exit document fullscreen from canvas/overlay teardown.
         * Workspace FS is owned by BoxiesShell (documentElement). Editor remounts
         * (add button, inspector, library, step change) destroy this handle often;
         * exiting FS here broke the entire editing session.
         */
      }
    };
  }

  /**
   * Mount Showroom BOTONES/HOTSPOTS editor onto an external host (Quotation Canvas).
   * Reuses ExperienciaCanvas.mount — does not reimplement interaction logic.
   *
   * options:
   *   state — builder-like state with experiencia.nodes / canvas
   *   overlayNodeId — image/scene node id to edit
   *   editMode — 'buttons' | 'hotspots'
   *   inspectorBody — DOM node for Showroom inspector HTML
   *   onChange / saveState — same as mount api
   */
  function mountOverlay(hostEl, options) {
    options = options || {};
    if (!hostEl || !options.state) return null;
    hostEl.innerHTML = overlayShellHtml();
    var handle = mount(hostEl, options.state, {
      overlayMode: true,
      overlayNodeId: options.overlayNodeId || null,
      editMode: options.editMode || 'buttons',
      inspectorBody: options.inspectorBody || null,
      projectId: options.projectId || null,
      shapeBoxV2: options.shapeBoxV2,
      onChange: options.onChange,
      onSelectionChange: options.onSelectionChange,
      onMultiSelectionContextMenu: options.onMultiSelectionContextMenu,
      saveState: options.saveState
    });
    if (handle) {
      requestAnimationFrame(function () {
        if (handle.refresh) handle.refresh();
      });
    }
    return handle;
  }

  return {
    shellHtml: shellHtml,
    overlayShellHtml: overlayShellHtml,
    actionsHtml: actionsHtml,
    mount: mount,
    mountOverlay: mountOverlay,
    isCanvasMode: isCanvasMode,
    setCanvasMode: setCanvasMode,
    shapeBoxV2Enabled: shapeBoxV2Enabled,
    isShapeBoxV2Active: isShapeBoxV2Active,
    shapeBoxV2DebugSnapshot: shapeBoxV2DebugSnapshot,
    shapeResizeTraceEnabled: shapeResizeTraceEnabled,
    EDITOR_PROJECT_ID: EDITOR_PROJECT_ID
  };
})();
