/* BOXIES V5.9.67 — Bunny media: projectAssets provider/path/archivoId */
var ExperienciaEngine = (function () {
  var NODE_W = 220;
  var NODE_H = 92;
  var HERO_W = 280;
  var HERO_H = 220;
  var GAP_X = 72;
  var GAP_Y = 28;

  /* Template layout — horizontal column gap + vertical free space between siblings */
  var TPL_COL_GAP = 160;
  var TPL_SIBLING_GAP = 56;
  var TPL_ORIGIN_X = 48;
  var TPL_ORIGIN_Y = 100;
  var TPL_COLLISION_PAD = 24;

  /* In-memory clipboard for Ctrl+C / Ctrl+V (nodes + internal edges only) */
  var _clipboard = null;
  var _pasteGen = 0;

  /** Temporary — mirrors ExperienciaCanvas shape resize trace. */
  function shapeResizeTraceEngineEnabled() {
    if (typeof window !== 'undefined' && window.__QE_SHAPE_TRACE__ === false) return false;
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('shapeTrace') === '0') return false;
      if (q.get('shapeTrace') === '1') return true;
      if (q.get('shapeDebug') === '0') return false;
    } catch (eTr) { return false; }
    return true;
  }

  function shapeModelFieldsEngine(ix) {
    if (!ix) return null;
    return {
      width: ix.width != null ? Number(ix.width) : null,
      height: ix.height != null ? Number(ix.height) : null,
      x: ix.x != null ? Number(ix.x) : null,
      y: ix.y != null ? Number(ix.y) : null,
      scaleX: ix.shapeStretchX != null ? Number(ix.shapeStretchX) : 1,
      scaleY: ix.shapeStretchY != null ? Number(ix.shapeStretchY) : 1,
      shapeContentBox: !!ix.shapeContentBox
    };
  }

  /** Temporary — ?compareRotate=1 traces groupModel replacements (full x/y/w/h/rot). */
  function compareRotateGroupModelTraceEnabled() {
    if (typeof window !== 'undefined' && window.__QE_COMPARE_ROTATE__ === false) return false;
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('compareRotate') === '0') return false;
      if (q.get('compareRotate') === '1') return true;
    } catch (eCrGm) { /* ignore */ }
    return false;
  }

  function compareRotateGroupSizeTraceEnabled() {
    return compareRotateGroupModelTraceEnabled();
  }

  function snapshotGroupModelTrace(g) {
    if (!g) return null;
    return {
      x: +(Number(g.x) || 0).toFixed(4),
      y: +(Number(g.y) || 0).toFixed(4),
      width: +(Number(g.width) || 0).toFixed(4),
      height: +(Number(g.height) || 0).toFixed(4),
      rotation: +(Number(g.rotation) || 0).toFixed(2),
      _transformV: Number(g._transformV) || 0
    };
  }

  function groupModelTraceFieldsChanged(before, after) {
    var out = [];
    if (!before || !after) return ['missing'];
    if (before.x !== after.x) out.push('x');
    if (before.y !== after.y) out.push('y');
    if (before.width !== after.width) out.push('width');
    if (before.height !== after.height) out.push('height');
    if (before.rotation !== after.rotation) out.push('rotation');
    if (before._transformV !== after._transformV) out.push('_transformV');
    return out;
  }

  function groupModelTraceDeltaFull(before, after) {
    if (!before || !after) return null;
    return {
      x: +((after.x - before.x)).toFixed(6),
      y: +((after.y - before.y)).toFixed(6),
      width: +((after.width - before.width)).toFixed(6),
      height: +((after.height - before.height)).toFixed(6),
      rotation: +((after.rotation - before.rotation)).toFixed(6)
    };
  }

  function traceGroupModelReplace(meta) {
    if (!compareRotateGroupModelTraceEnabled()) return;
    if (typeof window === 'undefined') return;
    var before = meta.before;
    var after = meta.after;
    if (!after) return;
    var changed = before ? groupModelTraceFieldsChanged(before, after) : ['created'];
    if (before && !changed.length) return;
    var slot = window.__QE_GROUP_MODEL_TRACE__;
    if (!slot) {
      slot = { seq: 0 };
      window.__QE_GROUP_MODEL_TRACE__ = slot;
    }
    slot.seq = (slot.seq || 0) + 1;
    console.log(
      '%c[COMPARE-ROTATE] compareRotate.groupModel.replace',
      'color:#6cf;font-weight:bold;font-size:12px',
      {
        seq: slot.seq,
        groupId: meta.groupId != null ? String(meta.groupId) : null,
        kind: meta.kind || 'batchReplace',
        changed: changed,
        before: before,
        after: after,
        delta: before ? groupModelTraceDeltaFull(before, after) : null,
        sourceFile: meta.sourceFile || 'experiencia-engine.js',
        sourceFunction: meta.sourceFunction || null,
        sourceLine: meta.sourceLine || null,
        why: meta.why || null,
        extra: meta.extra || null
      }
    );
  }

  function traceGroupModelIfChanged(g, groupId, before, sourceFunction, sourceLine, why, extra) {
    if (!compareRotateGroupModelTraceEnabled() || !g || !before) return;
    traceGroupModelReplace({
      groupId: groupId || g.id,
      before: before,
      after: snapshotGroupModelTrace(g),
      sourceFile: (extra && extra.sourceFile) || 'experiencia-engine.js',
      sourceFunction: sourceFunction,
      sourceLine: sourceLine,
      why: why,
      kind: (extra && extra.kind) || 'batchReplace',
      extra: extra || null
    });
  }

  function groupSizeSnapEngine(g) {
    var m = snapshotGroupModelTrace(g);
    return m ? { width: m.width, height: m.height } : { width: 0, height: 0 };
  }

  function traceLiveGroupModelSizeWrite(meta) {
    if (!compareRotateGroupModelTraceEnabled()) return;
    if (typeof window === 'undefined') return;
    var slot = window.__QE_LIVE_GROUP_SIZE_TRACE__;
    if (!slot || !slot.active) return;
    if (slot.groupId && meta.groupId && String(slot.groupId) !== String(meta.groupId)) return;
    if (slot.firstLogged) return;
    var beforeW = meta.beforeWidth;
    var beforeH = meta.beforeHeight;
    var afterW = meta.afterWidth;
    var afterH = meta.afterHeight;
    if (beforeW === afterW && beforeH === afterH) return;
    slot.firstLogged = true;
    window.__QE_LIVE_GROUP_SIZE_TRACE__ = slot;
    console.log(
      '%c[COMPARE-ROTATE] compareRotate.groupSize.firstMutation',
      'color:#6cf;font-weight:bold;font-size:12px',
      {
        baseline: slot.baseline || null,
        before: { width: beforeW, height: beforeH },
        after: { width: afterW, height: afterH },
        delta: {
          width: +((afterW - beforeW)).toFixed(4),
          height: +((afterH - beforeH)).toFixed(4)
        },
        sourceFile: meta.sourceFile || 'experiencia-engine.js',
        sourceFunction: meta.sourceFunction || null,
        sourceLine: meta.sourceLine || null,
        why: meta.why || null,
        patch: meta.patch || null,
        _transformV: meta._transformV != null ? meta._transformV : null
      }
    );
  }

  function traceLiveGroupSizeAfterAssign(g, groupId, before, sourceFunction, sourceLine, why, extra) {
    if (!g) return;
    var beforeFull = before && before.width != null && before.height != null &&
      before.x == null
      ? {
        x: +(Number(g.x) || 0).toFixed(4),
        y: +(Number(g.y) || 0).toFixed(4),
        width: before.width,
        height: before.height,
        rotation: +(Number(g.rotation) || 0).toFixed(2),
        _transformV: Number(g._transformV) || 0
      }
      : (before && before.x != null ? before : snapshotGroupModelTrace(g));
    traceGroupModelIfChanged(g, groupId, beforeFull, sourceFunction, sourceLine, why, extra);
    var after = groupSizeSnapEngine(g);
    traceLiveGroupModelSizeWrite({
      groupId: groupId,
      beforeWidth: beforeFull ? beforeFull.width : after.width,
      beforeHeight: beforeFull ? beforeFull.height : after.height,
      afterWidth: after.width,
      afterHeight: after.height,
      sourceFile: 'experiencia-engine.js',
      sourceFunction: sourceFunction,
      sourceLine: sourceLine,
      why: why,
      patch: extra || null,
      _transformV: Number(g._transformV) || 0
    });
  }

  function traceLiveGroupSizeStep(g, groupId, before, sourceFunction, sourceLine, why, extra) {
    if (!g) return;
    traceGroupModelIfChanged(g, groupId, before, sourceFunction, sourceLine, why, extra);
  }

  function patchModelFieldsEngine(patch) {
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

  function shapeResizeTraceEngine(stage, payload) {
    if (!shapeResizeTraceEngineEnabled()) return;
    console.log(
      '%c[SHAPE-TRACE] ' + stage,
      'color:#ff9900;font-weight:bold;font-size:12px',
      payload || {}
    );
  }

  function shapeTraceNumEngine(stage, fields, extra) {
    if (!shapeResizeTraceEngineEnabled()) return;
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

  var FLOW_TEMPLATE_IDS = {
    simple: 'simple',
    components: 'components',
    stages: 'stages',
    empty: 'empty'
  };

  var SCENE_KINDS = {
    scene: true, image: true, video: true, pano360: true, plan: true,
    animacion: true, vista: true, 'planta-3d': true, ficha: true, gallery: true
  };

  /* V5.9.62 — solo dos acentos: green (escenas visuales) / purple (animación, acciones, nav) */
  var KIND_META = {
    hero: { typeLabel: 'HERO', accent: 'green', role: 'scene' },
    scene: { typeLabel: 'ESCENA', accent: 'green', role: 'scene' },
    image: { typeLabel: 'IMAGEN', accent: 'green', role: 'scene' },
    video: { typeLabel: 'ANIMACIÓN', accent: 'purple', role: 'scene' },
    pano360: { typeLabel: '360°', accent: 'green', role: 'scene' },
    plan: { typeLabel: 'PLANTA', accent: 'green', role: 'scene' },
    hotspot: { typeLabel: 'HOTSPOT', accent: 'purple', role: 'interaction' },
    action: { typeLabel: 'ACCIÓN', accent: 'purple', role: 'action' },
    group: { typeLabel: 'GRUPO', accent: 'purple', role: 'group' },
    structure: { typeLabel: 'PROYECTO', accent: 'purple', role: 'group' },
    animacion: { typeLabel: 'TRANSICIÓN', accent: 'purple', role: 'scene' },
    vista: { typeLabel: 'ESCENA', accent: 'green', role: 'scene' },
    componente: { typeLabel: 'COMPONENTE', accent: 'purple', role: 'group' },
    lotes: { typeLabel: 'COMPONENTE', accent: 'purple', role: 'group' },
    amenidad: { typeLabel: 'COMPONENTE', accent: 'purple', role: 'group' },
    'selector-pisos': { typeLabel: 'NAVEGACIÓN', accent: 'purple', role: 'interaction' },
    'planta-3d': { typeLabel: 'PLANTA 3D', accent: 'green', role: 'scene' },
    viviendas: { typeLabel: 'VIVIENDAS', accent: 'green', role: 'group' },
    ficha: { typeLabel: 'FICHA', accent: 'green', role: 'scene' },
    transicion: { typeLabel: 'TRANSICIÓN', accent: 'purple', role: 'scene' }
  };

  /* Legacy accent keys → green | purple (presentation only) */
  var ACCENT_REMAP = {
    green: 'green',
    hero: 'green',
    planta: 'green',
    viviendas: 'green',
    purple: 'purple',
    transicion: 'purple',
    nav: 'purple',
    componente: 'purple',
    ficha: 'purple',
    default: 'purple'
  };

  /* Menú al arrastrar ○ → canvas vacío */
  var CREATE_MENU = [
    {
      id: 'visual',
      label: 'CREAR ESCENA',
      items: [
        { id: 'image', label: 'Imagen / escena estática', kind: 'image', role: 'scene' },
        { id: 'video', label: 'Video / animación', kind: 'video', role: 'scene' },
        { id: 'pano360', label: 'Escena 360°', kind: 'pano360', role: 'scene' },
        { id: 'plan', label: 'Planta 2D / 3D', kind: 'plan', role: 'scene' }
      ]
    },
    {
      id: 'navegacion',
      label: 'NAVEGACIÓN',
      items: [
        { id: 'back', label: 'Volver', kind: 'action', role: 'action', actionType: 'back' },
        { id: 'goto-hero', label: 'Ir al Hero', kind: 'action', role: 'action', actionType: 'goto-hero' }
      ]
    },
    {
      id: 'accion',
      label: 'ACCIÓN',
      items: [
        { id: 'url', label: 'Abrir URL', kind: 'action', role: 'action', actionType: 'url' },
        { id: 'download', label: 'Descargar documento', kind: 'action', role: 'action', actionType: 'download' },
        { id: 'close', label: 'Cerrar', kind: 'action', role: 'action', actionType: 'close' },
        { id: 'show-panel', label: 'Mostrar panel', kind: '_inline', role: 'inline', actionType: 'show-panel' },
        { id: 'open-ficha', label: 'Abrir ficha', kind: '_inline', role: 'inline', actionType: 'open-ficha' },
        { id: 'floor-sel', label: 'Mostrar selector de plantas', kind: '_inline', role: 'inline', actionType: 'floor-selector' }
      ]
    }
  ];

  /* Clic derecho en vacío — solo escenas */
  var CREATE_MENU_BLANK = [
    {
      id: 'visual',
      label: 'CREAR ESCENA',
      items: [
        { id: 'image', label: 'Imagen / escena estática', kind: 'image', role: 'scene' },
        { id: 'video', label: 'Video / animación', kind: 'video', role: 'scene' },
        { id: 'pano360', label: 'Escena 360°', kind: 'pano360', role: 'scene' },
        { id: 'plan', label: 'Planta 2D / 3D', kind: 'plan', role: 'scene' }
      ]
    }
  ];

  /* + Agregar elemento DENTRO de una escena (sin controles globales del showroom) */
  var ADD_ELEMENT_MENU = [
    {
      id: 'controles',
      label: 'CONTROLES',
      items: [
        { id: 'el-selector', label: 'Selector · Plantas', kind: '_embed', interactionType: 'SELECTOR', actionType: 'floor-selector', defaultLabel: 'Plantas', group: 'controls' },
        { id: 'el-toggle-3d2d', label: 'Toggle · 3D / 2D', kind: '_embed', interactionType: 'TOGGLE_3D2D', actionType: 'toggle-3d2d', defaultLabel: '3D / 2D', group: 'controls' },
        { id: 'el-button', label: 'Botón / control', kind: '_embed', interactionType: 'BUTTON', defaultLabel: 'Botón', group: 'controls' },
        { id: 'el-text', label: 'Texto', kind: '_embed', interactionType: 'TEXT', defaultLabel: 'Texto', group: 'controls' },
        { id: 'el-shape-rect', label: 'Forma · Rectángulo', kind: '_embed', interactionType: 'SHAPE_RECT', defaultLabel: 'Rectángulo', group: 'controls' },
        { id: 'el-shape-circle', label: 'Forma · Círculo', kind: '_embed', interactionType: 'SHAPE_CIRCLE', defaultLabel: 'Círculo', group: 'controls' },
        { id: 'el-shape-line', label: 'Forma · Línea', kind: '_embed', interactionType: 'SHAPE_LINE', defaultLabel: 'Línea', group: 'controls' },
        { id: 'el-shape-triangle', label: 'Forma · Triángulo', kind: '_embed', interactionType: 'SHAPE_TRIANGLE', defaultLabel: 'Triángulo', group: 'controls' },
        { id: 'el-shape-arrow', label: 'Forma · Flecha', kind: '_embed', interactionType: 'SHAPE_ARROW', defaultLabel: 'Flecha', group: 'controls' },
        { id: 'el-shape-donut', label: 'Forma · Donut', kind: '_embed', interactionType: 'SHAPE_DONUT', defaultLabel: 'Donut', group: 'controls' },
        { id: 'el-shape-capsule', label: 'Forma · Cápsula', kind: '_embed', interactionType: 'SHAPE_CAPSULE', defaultLabel: 'Cápsula', group: 'controls' },
        { id: 'el-shape-round-rect', label: 'Forma · Cuadrado redondeado', kind: '_embed', interactionType: 'SHAPE_ROUND_RECT', defaultLabel: 'Cuadrado redondeado', group: 'controls' },
        { id: 'el-info', label: 'Información / detalles', kind: '_embed', interactionType: 'CUSTOM', actionType: 'show-info', defaultLabel: 'Información', group: 'controls' }
      ]
    },
    {
      id: 'contenido',
      label: 'CONTENIDO',
      items: [
        { id: 'el-hotspot', label: 'Hotspot', kind: '_embed', interactionType: 'HOTSPOT', defaultLabel: 'Hotspot', group: 'content' },
        { id: 'el-units', label: 'Unidades · Planta activa', kind: '_embed', interactionType: 'UNITS_FLOOR', actionType: 'units-active-floor', defaultLabel: 'Planta activa', group: 'content' }
      ]
    },
    {
      id: 'navegacion',
      label: 'NAVEGACIÓN',
      items: [
        { id: 'el-back', label: 'Volver', kind: '_embed', interactionType: 'BACK', actionType: 'back', defaultLabel: 'Volver', group: 'navigation' },
        { id: 'el-hero', label: 'Ir al Hero', kind: '_embed', interactionType: 'BUTTON', actionType: 'goto-hero', defaultLabel: 'Ir al Hero', group: 'navigation' }
      ]
    },
    {
      id: 'accion',
      label: 'ACCIÓN LOCAL',
      items: [
        { id: 'el-url', label: 'Abrir URL', kind: '_embed', interactionType: 'BUTTON', actionType: 'url', defaultLabel: 'Abrir URL', group: 'controls' },
        { id: 'el-dl', label: 'Descargar documento', kind: '_embed', interactionType: 'BUTTON', actionType: 'download', defaultLabel: 'Descargar', group: 'controls' },
        { id: 'el-close', label: 'Cerrar', kind: '_embed', interactionType: 'BUTTON', actionType: 'close', defaultLabel: 'Cerrar', group: 'controls' }
      ]
    }
  ];

  var INTERACTION_TYPE_LABEL = {
    HOTSPOT: 'Hotspot',
    BUTTON: 'Botón',
    TEXT: 'Texto',
    SHAPE_RECT: 'Rectángulo',
    SHAPE_CIRCLE: 'Círculo',
    SHAPE_LINE: 'Línea',
    SHAPE_TRIANGLE: 'Triángulo',
    SHAPE_ARROW: 'Flecha',
    SHAPE_DONUT: 'Donut',
    SHAPE_CAPSULE: 'Cápsula',
    SHAPE_ROUND_RECT: 'Cuadrado redondeado',
    OVERLAY_GROUP: 'Grupo',
    SELECTOR: 'Selector',
    UNIT: 'Unidad',
    UNITS_FLOOR: 'Unidades',
    TOGGLE_3D2D: 'Toggle',
    BACK: 'Volver',
    MENU_TRIGGER: 'Menú',
    PANEL_TRIGGER: 'Panel',
    CUSTOM: 'Info'
  };

  var SCENE_SHAPE_TYPES = [
    'SHAPE_RECT', 'SHAPE_CIRCLE', 'SHAPE_LINE', 'SHAPE_TRIANGLE',
    'SHAPE_ARROW', 'SHAPE_DONUT', 'SHAPE_CAPSULE', 'SHAPE_ROUND_RECT'
  ];

  var SCENE_SHAPE_MENU_ID = {
    SHAPE_RECT: 'el-shape-rect',
    SHAPE_CIRCLE: 'el-shape-circle',
    SHAPE_LINE: 'el-shape-line',
    SHAPE_TRIANGLE: 'el-shape-triangle',
    SHAPE_ARROW: 'el-shape-arrow',
    SHAPE_DONUT: 'el-shape-donut',
    SHAPE_CAPSULE: 'el-shape-capsule',
    SHAPE_ROUND_RECT: 'el-shape-round-rect'
  };

  function isSceneShapeType(t) {
    return SCENE_SHAPE_TYPES.indexOf(String(t || '').toUpperCase()) >= 0;
  }

  /** Every scene shape lives in a pixel-square tile — same as the picker cell. */
  function isSquareSceneShapeType(t) {
    return isSceneShapeType(t);
  }

  /** Clamp stretch multipliers — 1 = picker default geometry. */
  function shapeStretchXY(opts) {
    opts = opts || {};
    return {
      sx: Math.max(0.06, Math.min(8, Number(opts.stretchX != null ? opts.stretchX : 1) || 1)),
      sy: Math.max(0.06, Math.min(8, Number(opts.stretchY != null ? opts.stretchY : 1) || 1))
    };
  }

  function shapeStretchFromIx(ix) {
    if (!ix) return { sx: 1, sy: 1 };
    return shapeStretchXY({
      stretchX: ix.shapeStretchX,
      stretchY: ix.shapeStretchY
    });
  }

  /** Content AABB at stretch 1 — picker / default artboard. */
  function shapeContentBBoxBase(kind) {
    kind = String(kind || '').toUpperCase();
    var u = shapeUnit52;
    if (kind === 'SHAPE_LINE') {
      var lx1 = u(8);
      var lx2 = u(44);
      return { cx: 50, cy: 50, w: lx2 - lx1, h: 2 };
    }
    if (kind === 'SHAPE_CIRCLE') {
      var cd = u(17) * 2;
      return { cx: 50, cy: 50, w: cd, h: cd };
    }
    if (kind === 'SHAPE_TRIANGLE') {
      var tx1 = u(10);
      var tx2 = u(42);
      var ty1 = u(10);
      var ty2 = u(40);
      return { cx: 50, cy: (ty1 + ty2) / 2, w: tx2 - tx1, h: ty2 - ty1 };
    }
    if (kind === 'SHAPE_ARROW') {
      var ax1 = u(6);
      var ax2 = u(48);
      var ay1 = u(14);
      var ay2 = u(38);
      return { cx: 50, cy: (ay1 + ay2) / 2, w: ax2 - ax1, h: ay2 - ay1 };
    }
    if (kind === 'SHAPE_DONUT') {
      var dd = u(20) * 2;
      return { cx: 50, cy: 50, w: dd, h: dd };
    }
    if (kind === 'SHAPE_CAPSULE') {
      return { cx: 50, cy: 50, w: u(36), h: u(16) };
    }
    if (kind === 'SHAPE_ROUND_RECT') {
      return { cx: 50, cy: 50, w: u(30), h: u(30) };
    }
    return { cx: 50, cy: 50, w: u(30), h: u(24) };
  }

  /** Content AABB inside the 100×100 viewBox — respects axis stretch. */
  function shapeContentBBox(kind, opts) {
    kind = String(kind || '').toUpperCase();
    var st = shapeStretchXY(opts);
    var base = shapeContentBBoxBase(kind);
    if (kind === 'SHAPE_LINE') {
      return { cx: 50, cy: 50, w: base.w * st.sx, h: base.h };
    }
    return { cx: 50, cy: 50, w: base.w * st.sx, h: base.h * st.sy };
  }

  function shapeIsStretched(st) {
    return !!(st && (st.sx !== 1 || st.sy !== 1));
  }

  function shapeUsesContentBox(ix, widthPct, heightPct, layerW, layerH) {
    if (ix && ix.shapeContentBox) return true;
    return false;
  }

  function shapePreserveAspect(stretchX, stretchY) {
    var st = shapeStretchXY({ stretchX: stretchX, stretchY: stretchY });
    return (st.sx !== 1 || st.sy !== 1) ? 'none' : 'meet';
  }

  /** SVG viewBox — expands when stretched content exceeds 0…100 (prevents meet shrink/clipping). */
  function shapeSvgViewBox(kind, stretchX, stretchY) {
    var st = shapeStretchXY({ stretchX: stretchX, stretchY: stretchY });
    if (st.sx === 1 && st.sy === 1) {
      return { x: 0, y: 0, w: 100, h: 100 };
    }
    var bbox = shapeContentBBox(kind, st);
    return {
      x: bbox.cx - bbox.w / 2,
      y: bbox.cy - bbox.h / 2,
      w: bbox.w,
      h: bbox.h
    };
  }

  function shapeContentFrac(kind, stretchX, stretchY) {
    var st = shapeStretchXY({ stretchX: stretchX, stretchY: stretchY });
    var bbox = shapeContentBBox(kind, st);
    var vb = shapeSvgViewBox(kind, st.sx, st.sy);
    /* Single meet scale — SVG uses preserveAspectRatio meet in a square tile. */
    var meet = 1 / Math.max(vb.w, vb.h);
    return {
      bbox: bbox,
      vb: vb,
      meet: meet,
      dispW: bbox.w * meet,
      dispH: bbox.h * meet,
      offX: bbox.cx - (vb.x + vb.w / 2),
      offY: bbox.cy - (vb.y + vb.h / 2)
    };
  }

  function shapeTileContentOffsetPct(tileWPct, kind, layerW, layerH, stretchX, stretchY) {
    var cf = shapeContentFrac(kind, stretchX, stretchY);
    var tile = sceneShapeDisplaySize(tileWPct, layerW, layerH);
    var lw = Math.max(1, Number(layerW) || 1000);
    var lh = Math.max(1, Number(layerH) || 1000);
    var tilePx = (tile.w / 100) * lw;
    var meetScale = tilePx / Math.max(cf.vb.w, cf.vb.h);
    var svgDispW = cf.vb.w * meetScale;
    var svgDispH = cf.vb.h * meetScale;
    var svgOffX = (tilePx - svgDispW) / 2;
    var svgOffY = (tilePx - svgDispH) / 2;
    var contentCxPx = svgOffX + ((cf.bbox.cx - cf.vb.x) / cf.vb.w) * svgDispW;
    var contentCyPx = svgOffY + ((cf.bbox.cy - cf.vb.y) / cf.vb.h) * svgDispH;
    return {
      offX: ((contentCxPx - tilePx / 2) / lw) * 100,
      offY: ((contentCyPx - tilePx / 2) / lh) * 100
    };
  }

  /** Tight gizmo — stretch=1 uses square picker tile; stretched shapes use stored gw×gh box. */
  function sceneShapeGizmoMetrics(widthPct, kind, layerW, layerH, posX, posY, stretchX, stretchY, heightPct, ix) {
    kind = String(kind || '').toUpperCase();
    var st = shapeStretchXY({ stretchX: stretchX, stretchY: stretchY });
    var lw = Math.max(1, Number(layerW) || 1000);
    var lh = Math.max(1, Number(layerH) || 1000);
    if (shapeUsesContentBox(ix, widthPct, heightPct, layerW, layerH)) {
      var gwBox = Number(widthPct);
      var ghBox = Number(heightPct);
      if (isNaN(ghBox) || ghBox <= 0) {
        var tile0 = sceneShapeDisplaySize(widthPct, layerW, layerH);
        var cf0 = shapeContentFrac(kind, st.sx, st.sy);
        ghBox = tile0.w * cf0.dispH * (lw / lh);
      }
      return {
        gx: posX != null && !isNaN(Number(posX)) ? Number(posX) : 50,
        gy: posY != null && !isNaN(Number(posY)) ? Number(posY) : 50,
        gw: gwBox,
        gh: ghBox,
        tileW: gwBox,
        tileH: ghBox,
        bbox: shapeContentBBox(kind, st),
        stretchX: st.sx,
        stretchY: st.sy
      };
    }
    var tile = sceneShapeDisplaySize(widthPct, layerW, layerH);
    var cf = shapeContentFrac(kind, st.sx, st.sy);
    var bbox = cf.bbox;
    var gw = tile.w * cf.dispW;
    var gh = tile.w * cf.dispH * (lw / lh);
    if (kind === 'SHAPE_LINE') {
      gh = Math.max(0.08, gh);
    }
    var contentOff = shapeTileContentOffsetPct(widthPct, kind, layerW, layerH, st.sx, st.sy);
    var gx = (posX != null && !isNaN(Number(posX)) ? Number(posX) : 50) + contentOff.offX;
    var gy = (posY != null && !isNaN(Number(posY)) ? Number(posY) : 50) + contentOff.offY;
    return {
      gx: gx,
      gy: gy,
      gw: gw,
      gh: gh,
      tileW: tile.w,
      tileH: tile.h,
      bbox: bbox,
      stretchX: st.sx,
      stretchY: st.sy
    };
  }

  function sceneShapeTileWidthFromContentWidth(contentWPct, kind, stretchX, stretchY) {
    var cf = shapeContentFrac(kind, stretchX, stretchY);
    var frac = cf.dispW;
    if (!frac || frac <= 0) return contentWPct;
    return Number(contentWPct) / frac;
  }

  function sceneShapeTileCenterFromGizmoCenter(gx, gy, tileWPct, kind, layerW, layerH, stretchX, stretchY) {
    var contentOff = shapeTileContentOffsetPct(tileWPct, kind, layerW, layerH, stretchX, stretchY);
    return { x: Number(gx) - contentOff.offX, y: Number(gy) - contentOff.offY };
  }

  function shapeHitAreaCss(kind, stretchX, stretchY, boxMode) {
    kind = String(kind || '').toUpperCase();
    if (boxMode) {
      if (kind === 'SHAPE_LINE') {
        return 'left:0;width:100%;top:50%;height:12px;transform:translateY(-50%);';
      }
      return 'left:0;top:0;width:100%;height:100%;';
    }
    var cf = shapeContentFrac(kind, stretchX, stretchY);
    var bbox = cf.bbox;
    var dispW = cf.vb.w * cf.meet * 100;
    var dispH = cf.vb.h * cf.meet * 100;
    var offX = (100 - dispW) / 2;
    var offY = (100 - dispH) / 2;
    var left = offX + ((bbox.cx - bbox.w / 2) - cf.vb.x) / cf.vb.w * dispW;
    var top = offY + ((bbox.cy - bbox.h / 2) - cf.vb.y) / cf.vb.h * dispH;
    var width = cf.dispW * 100;
    var height = cf.dispH * 100;
    if (kind === 'SHAPE_LINE') {
      return 'left:' + left + '%;width:' + width + '%;';
    }
    return 'left:' + left + '%;top:' + top + '%;width:' + width + '%;height:' + height + '%;';
  }

  function pointInPolygon(px, py, points) {
    var inside = false;
    if (!points || !points.length) return false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var xi = points[i].x;
      var yi = points[i].y;
      var xj = points[j].x;
      var yj = points[j].y;
      var intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInEllipse(px, py, cx, cy, rx, ry) {
    if (rx <= 0 || ry <= 0) return false;
    var dx = (px - cx) / rx;
    var dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  function pointInRoundRect(px, py, x, y, w, h, rx) {
    if (w <= 0 || h <= 0) return false;
    if (px < x || px > x + w || py < y || py > y + h) return false;
    rx = Math.max(0, Math.min(Number(rx) || 0, w / 2, h / 2));
    if (rx <= 0) return true;
    if (px >= x + rx && px <= x + w - rx) return true;
    if (py >= y + rx && py <= y + h - rx) return true;
    var crx;
    var cry;
    if (px < x + rx && py < y + rx) { crx = x + rx; cry = y + rx; }
    else if (px > x + w - rx && py < y + rx) { crx = x + w - rx; cry = y + rx; }
    else if (px > x + w - rx && py > y + h - rx) { crx = x + w - rx; cry = y + h - rx; }
    else { crx = x + rx; cry = y + h - rx; }
    var dx = px - crx;
    var dy = py - cry;
    return dx * dx + dy * dy <= rx * rx;
  }

  function distToSegmentSq(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-9) {
      var ex = px - x1;
      var ey = py - y1;
      return ex * ex + ey * ey;
    }
    var t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    var lx = x1 + t * dx;
    var ly = y1 + t * dy;
    var ox = px - lx;
    var oy = py - ly;
    return ox * ox + oy * oy;
  }

  function parseSvgPointsString(str) {
    var out = [];
    String(str || '').trim().split(/\s+/).forEach(function (pair) {
      var parts = pair.split(',');
      if (parts.length < 2) return;
      var x = Number(parts[0]);
      var y = Number(parts[1]);
      if (!isNaN(x) && !isNaN(y)) out.push({ x: x, y: y });
    });
    return out;
  }

  function shapeArrowLegacyPoints(w, h) {
    var u = shapeUnit52;
    var headW = u(14);
    var right = 50 + w / 2;
    var left = 50 - w / 2;
    var headBase = right - headW;
    var halfH = h / 2;
    var shaftHalf = Math.min(u(6), halfH * 0.5);
    return [
      { x: left, y: 50 - shaftHalf },
      { x: headBase, y: 50 - shaftHalf },
      { x: headBase, y: 50 - halfH },
      { x: right, y: 50 },
      { x: headBase, y: 50 + halfH },
      { x: headBase, y: 50 + shaftHalf },
      { x: left, y: 50 + shaftHalf }
    ];
  }

  function shapeSilhouetteHitTestViewBox(kind, vx, vy, paint) {
    kind = String(kind || '').toUpperCase();
    paint = paint || {};
    var st = shapeStretchXY(paint);
    var sx = st.sx;
    var sy = st.sy;
    var u = shapeUnit52;
    var base = shapeContentBBoxBase(kind);
    var w = base.w * sx;
    var h = base.h * sy;
    var brR = paint.borderRadius != null ? Number(paint.borderRadius) : 16;
    var strokeTol = Math.max(1, shapeStrokeWidth(paint) * 0.75);

    if (kind === 'SHAPE_LINE') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var lch = Number(paint.contentH);
        var lmidY = lch / 2;
        return distToSegmentSq(vx, vy, 0, lmidY, Number(paint.contentW), lmidY) <= strokeTol * strokeTol;
      }
      var lx1 = 50 - w / 2;
      var lx2 = 50 + w / 2;
      return distToSegmentSq(vx, vy, lx1, 50, lx2, 50) <= strokeTol * strokeTol;
    }
    if (kind === 'SHAPE_CIRCLE') {
      return pointInEllipse(vx, vy, 50, 50, u(17) * sx, u(17) * sy);
    }
    if (kind === 'SHAPE_TRIANGLE') {
      var apexY = 50 - h / 2;
      var baseY = 50 + h / 2;
      return pointInPolygon(vx, vy, [
        { x: 50, y: apexY },
        { x: 50 + w / 2, y: baseY },
        { x: 50 - w / 2, y: baseY }
      ]);
    }
    if (kind === 'SHAPE_ARROW') {
      var arrowPts = paint.contentW > 0 && paint.contentH > 0
        ? parseSvgPointsString(shapeArrowContentBoxPoints(paint.contentW, paint.contentH))
        : shapeArrowLegacyPoints(w, h);
      return pointInPolygon(vx, vy, arrowPts);
    }
    if (kind === 'SHAPE_DONUT') {
      var orx = u(20) * sx;
      var ory = u(20) * sy;
      var irx = u(8) * sx;
      var iry = u(8) * sy;
      return pointInEllipse(vx, vy, 50, 50, orx, ory) &&
        !pointInEllipse(vx, vy, 50, 50, irx, iry);
    }
    if (kind === 'SHAPE_CAPSULE') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var capCw = Number(paint.contentW);
        var capCh = Number(paint.contentH);
        return pointInRoundRect(vx, vy, 0, 0, capCw, capCh, Math.min(capCw / 2, capCh / 2));
      }
      var capRxLegacy = u(8);
      return pointInRoundRect(vx, vy, 50 - w / 2, 50 - h / 2, w, h,
        Math.min(capRxLegacy, w / 2, h / 2));
    }
    if (kind === 'SHAPE_ROUND_RECT') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var rrcw = Number(paint.contentW);
        var rrch = Number(paint.contentH);
        var rrrx = paint.contentRx != null && !isNaN(Number(paint.contentRx))
          ? Number(paint.contentRx)
          : Math.min(shapeRoundRectFixedCornerRx(brR), rrcw / 2, rrch / 2);
        return pointInRoundRect(vx, vy, 0, 0, rrcw, rrch, rrrx);
      }
      var rxFixed = Math.max(0, Math.min(50, (brR / 12) * u(9)));
      return pointInRoundRect(vx, vy, 50 - w / 2, 50 - h / 2, w, h,
        Math.min(rxFixed, w / 2, h / 2));
    }
    if (paint.contentW > 0 && paint.contentH > 0) {
      var cw = Number(paint.contentW);
      var ch = Number(paint.contentH);
      var rectRxFixed = paint.contentRx != null && !isNaN(Number(paint.contentRx))
        ? Number(paint.contentRx)
        : Math.min(shapeRectFixedCornerRx(), cw / 2, ch / 2);
      return pointInRoundRect(vx, vy, 0, 0, cw, ch, rectRxFixed);
    }
    var rectRx = Math.min(shapeRectFixedCornerRx(), w / 2, h / 2);
    return pointInRoundRect(vx, vy, 50 - w / 2, 50 - h / 2, w, h, rectRx);
  }

  function layerPctToLocalInBox(px, py, box, layerW, layerH) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    if (!box) return null;
    var pxX = (Number(px) / 100) * layerW;
    var pxY = (Number(py) / 100) * layerH;
    var cxPx = (Number(box.cx) / 100) * layerW;
    var cyPx = (Number(box.cy) / 100) * layerH;
    var dx = pxX - cxPx;
    var dy = py - cyPx;
    var rot = Number(box.rot) || 0;
    var rad = -rot * Math.PI / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var rdx = dx * cos - dy * sin;
    var rdy = dx * sin + dy * cos;
    var gwPx = (Number(box.w) / 100) * layerW;
    var ghPx = (Number(box.h) / 100) * layerH;
    if (gwPx <= 0 || ghPx <= 0) return null;
    return { u: rdx / gwPx + 0.5, v: rdy / ghPx + 0.5 };
  }

  function pointInRotatedRectPct(px, py, cx, cy, gw, gh, rotDeg, layerW, layerH) {
    var local = layerPctToLocalInBox(px, py, {
      cx: cx, cy: cy, w: gw, h: gh, rot: rotDeg
    }, layerW, layerH);
    if (!local) return false;
    return local.u >= 0 && local.u <= 1 && local.v >= 0 && local.v <= 1;
  }

  function resolveShapeSilhouetteHitPaint(ix, boxMetrics, layerW, layerH) {
    var kind = String((ix && ix.type) || '').toUpperCase();
    var st = shapeStretchFromIx(ix);
    var paint = {
      stretchX: st.sx,
      stretchY: st.sy,
      borderRadius: ix.borderRadius,
      strokeWidth: ix.strokeWidth
    };
    if (boxMetrics && boxMetrics.w > 0 && boxMetrics.h > 0) {
      if (shapeUsesContentBoxPaint(kind)) {
        var norm = shapeContentBoxViewBoxNorm(boxMetrics.w, boxMetrics.h, layerW, layerH);
        paint.contentW = norm.w;
        paint.contentH = norm.h;
        if (kind === 'SHAPE_RECT') {
          paint.contentRx = shapeRectCornerRxViewBox(
            boxMetrics.w, boxMetrics.h, layerW, layerH, norm.w, norm.h
          );
        } else if (kind === 'SHAPE_ROUND_RECT') {
          paint.contentRx = shapeRoundRectCornerRxViewBox(
            boxMetrics.w, boxMetrics.h, layerW, layerH, norm.w, norm.h, ix.borderRadius
          );
        }
      }
    }
    return paint;
  }

  function resolveShapeSilhouetteHitViewBox(kind, paint) {
    if (paint.contentW > 0 && paint.contentH > 0) {
      return { x: 0, y: 0, w: paint.contentW, h: paint.contentH };
    }
    return { x: 0, y: 0, w: 100, h: 100 };
  }

  function shapeSilhouetteHitTest(ix, pxPct, pyPct, boxMetrics, layerW, layerH) {
    if (!ix || !boxMetrics || !isSceneShapeType(ix.type)) return false;
    var kind = String(ix.type || '').toUpperCase();
    var local = layerPctToLocalInBox(pxPct, pyPct, {
      cx: boxMetrics.cx,
      cy: boxMetrics.cy,
      w: boxMetrics.w,
      h: boxMetrics.h,
      rot: boxMetrics.rot || 0
    }, layerW, layerH);
    if (!local) return false;
    if (local.u < 0 || local.u > 1 || local.v < 0 || local.v > 1) return false;
    var paint = resolveShapeSilhouetteHitPaint(ix, boxMetrics, layerW, layerH);
    var vb = resolveShapeSilhouetteHitViewBox(kind, paint);
    var vx = vb.x + local.u * vb.w;
    var vy = vb.y + local.v * vb.h;
    return shapeSilhouetteHitTestViewBox(kind, vx, vy, paint);
  }

  /** Picker tile → canvas: width % + height % that form a pixel square on the layer. */
  function sceneShapeDisplaySize(widthPct, layerW, layerH) {
    var w = Number(widthPct);
    if (isNaN(w) || w <= 0) w = sceneShapeDefaultSize().w;
    var lw = Math.max(1, Number(layerW) || 1000);
    var lh = Math.max(1, Number(layerH) || 1000);
    return { w: w, h: w * (lw / lh) };
  }

  function sceneShapeDefaultLabel(t) {
    return INTERACTION_TYPE_LABEL[String(t || '').toUpperCase()] || 'Forma';
  }

  /** Scale picker artboard (52) → normalized SVG viewBox (100). */
  function shapeUnit52(n) {
    return (Number(n) / 52) * 100;
  }

  /** Fixed screen-pixel corner radii (9-slice — constant while box stretches). */
  var SHAPE_RECT_CORNER_PX = 3;
  var SHAPE_ROUND_RECT_CORNER_PX = 33;
  var SHAPE_ROUND_RECT_CORNER_SLIDER_DEFAULT = 16;

  /** Picker artboard corner radius (viewBox units) — legacy tile paint. */
  function shapeRectFixedCornerRx() {
    return shapeUnit52(2);
  }

  /** Screen-pixel corner radius (Genially-style 9-slice). */
  function shapeRectFixedCornerPx(layerW, layerH) {
    return SHAPE_RECT_CORNER_PX;
  }

  /** Map fixed px radius → viewBox rx for current box (uniform scale, aspect-matched vb). */
  function shapeRectCornerRxViewBox(boxWPct, boxHPct, layerW, layerH, vbW, vbH) {
    var hPx = (Number(boxHPct) / 100) * Math.max(1, Number(layerH) || 1080);
    var vbHNum = Math.max(0.001, Number(vbH) || 100);
    var vbWNum = Math.max(0.001, Number(vbW) || 100);
    if (!hPx || hPx <= 0) {
      return Math.min(shapeRectFixedCornerRx(), vbWNum / 2, vbHNum / 2);
    }
    var fixedPx = shapeRectFixedCornerPx(layerW, layerH);
    var scale = hPx / vbHNum;
    var rxVb = fixedPx / Math.max(0.001, scale);
    return Math.min(rxVb, vbWNum / 2, vbHNum / 2);
  }

  /** Round-rect viewBox rx at default picker scale (borderRadius slider). */
  function shapeRoundRectFixedCornerRx(borderRadius) {
    var brR = borderRadius != null && !isNaN(Number(borderRadius)) ? Number(borderRadius) : 16;
    return Math.max(0, Math.min(50, (brR / 12) * shapeUnit52(9)));
  }

  /** Screen-pixel corner radius; slider 16 = 33px baseline. */
  function shapeRoundRectFixedCornerPx(layerW, layerH, borderRadius) {
    var brR = borderRadius != null && !isNaN(Number(borderRadius))
      ? Number(borderRadius) : SHAPE_ROUND_RECT_CORNER_SLIDER_DEFAULT;
    return SHAPE_ROUND_RECT_CORNER_PX * (brR / SHAPE_ROUND_RECT_CORNER_SLIDER_DEFAULT);
  }

  function shapeRoundRectCornerRxViewBox(boxWPct, boxHPct, layerW, layerH, vbW, vbH, borderRadius) {
    var hPx = (Number(boxHPct) / 100) * Math.max(1, Number(layerH) || 1080);
    var vbHNum = Math.max(0.001, Number(vbH) || 100);
    var vbWNum = Math.max(0.001, Number(vbW) || 100);
    var baseRx = shapeRoundRectFixedCornerRx(borderRadius);
    if (!hPx || hPx <= 0) {
      return Math.min(baseRx, vbWNum / 2, vbHNum / 2);
    }
    var fixedPx = shapeRoundRectFixedCornerPx(layerW, layerH, borderRadius);
    var scale = hPx / vbHNum;
    var rxVb = fixedPx / Math.max(0.001, scale);
    return Math.min(rxVb, vbWNum / 2, vbHNum / 2);
  }

  /** ViewBox aspect = box pixel aspect so preserveAspectRatio none maps uniformly. */
  function shapeContentBoxViewBoxNorm(boxWPct, boxHPct, layerW, layerH) {
    var wPx = (Number(boxWPct) / 100) * Math.max(1, Number(layerW) || 1000);
    var hPx = (Number(boxHPct) / 100) * Math.max(1, Number(layerH) || 1080);
    if (!wPx || !hPx || wPx <= 0 || hPx <= 0) return { w: 100, h: 100 };
    if (wPx >= hPx) return { w: 100, h: (hPx / wPx) * 100 };
    return { w: (wPx / hPx) * 100, h: 100 };
  }

  /** Shapes that redraw SVG from box dims (line, rect, arrow, capsule 9-slice). */
  function shapeUsesContentBoxPaint(kind) {
    kind = String(kind || '').toUpperCase();
    return kind === 'SHAPE_RECT' || kind === 'SHAPE_LINE' || kind === 'SHAPE_ARROW' ||
      kind === 'SHAPE_CAPSULE' || kind === 'SHAPE_ROUND_RECT';
  }

  /** Arrow content-box: fixed head (ratio of height), shaft grows with box width. */
  function shapeArrowContentBoxPoints(contentW, contentH) {
    var cw = Math.max(0.001, Number(contentW));
    var ch = Math.max(0.001, Number(contentH));
    var midY = ch / 2;
    var halfH = ch / 2;
    /* Artboard ratios from 52-unit picker (headW=u(14), bodyH=u(24), shaft=u(6)). */
    var headW = ch * (14 / 24);
    var shaftHalf = Math.min(ch * (6 / 24), halfH * 0.5);
    headW = Math.min(headW, cw * 0.85);
    var left = 0;
    var right = cw;
    var headBase = Math.max(left, right - headW);
    return left + ',' + (midY - shaftHalf) + ' ' +
      headBase + ',' + (midY - shaftHalf) + ' ' +
      headBase + ',' + (midY - halfH) + ' ' +
      right + ',' + midY + ' ' +
      headBase + ',' + (midY + halfH) + ' ' +
      headBase + ',' + (midY + shaftHalf) + ' ' +
      left + ',' + (midY + shaftHalf);
  }

  /** @deprecated use shapeUsesContentBoxPaint */
  function shapeUsesFixedCornerContentPaint(kind) {
    return shapeUsesContentBoxPaint(kind);
  }

  function shapeAttr(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function shapeStrokeWidth(opts) {
    var sw = Number(opts && opts.strokeWidth);
    if (isNaN(sw)) sw = 2;
    return Math.max(0.5, Math.min(20, sw));
  }

  /** One painted primitive — cap / 9-slice stretch via stretchX/stretchY (fixed radii & head size). */
  function sceneShapeGeometry(kind, paint) {
    paint = paint || {};
    kind = String(kind || '').toUpperCase();
    var st = shapeStretchXY(paint);
    var sx = st.sx;
    var sy = st.sy;
    var u = shapeUnit52;
    var base = shapeContentBBoxBase(kind);
    var fill = shapeAttr(paint.fill != null ? paint.fill : 'rgba(255,255,255,0.14)');
    var stroke = shapeAttr(paint.stroke != null ? paint.stroke : 'rgba(255,255,255,0.55)');
    var sw = paint.pickLayer ? 0 : shapeStrokeWidth(paint);
    var ve = paint.noVectorEffect ? '' : ' vector-effect="non-scaling-stroke"';
    var peAttr = paint.pickLayer ? ' pointer-events="all"' : '';
    var cls = (paint.className ? ' class="' + shapeAttr(paint.className) + '"' : '') + peAttr;
    var brR = paint.borderRadius != null ? Number(paint.borderRadius) : 16;
    var sr = ' shape-rendering="geometricPrecision"';
    var w = base.w * sx;
    var h = base.h * sy;

    if (kind === 'SHAPE_LINE') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var lcw = Number(paint.contentW);
        var lch = Number(paint.contentH);
        var lmidY = lch / 2;
        return '<line' + cls + ' x1="0" y1="' + lmidY + '" x2="' + lcw + '" y2="' + lmidY + '"' +
          ' fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"' + ve + sr + '/>';
      }
      var lx1 = 50 - w / 2;
      var lx2 = 50 + w / 2;
      return '<line' + cls + ' x1="' + lx1 + '" y1="50" x2="' + lx2 + '" y2="50"' +
        ' fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"' + ve + sr + '/>';
    }
    if (kind === 'SHAPE_CIRCLE') {
      return '<ellipse' + cls + ' cx="50" cy="50" rx="' + (u(17) * sx) + '" ry="' + (u(17) * sy) + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
    }
    if (kind === 'SHAPE_TRIANGLE') {
      var apexY = 50 - h / 2;
      var baseY = 50 + h / 2;
      return '<polygon' + cls + ' points="50,' + apexY + ' ' +
        (50 + w / 2) + ',' + baseY + ' ' +
        (50 - w / 2) + ',' + baseY + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve +
        ' stroke-linejoin="round"' + sr + '/>';
    }
    if (kind === 'SHAPE_ARROW') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        return '<polygon' + cls + ' points="' +
          shapeArrowContentBoxPoints(paint.contentW, paint.contentH) + '"' +
          ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve +
          ' stroke-linejoin="round"' + sr + '/>';
      }
      var headW = u(14);
      var right = 50 + w / 2;
      var left = 50 - w / 2;
      var headBase = right - headW;
      var halfH = h / 2;
      var shaftHalf = Math.min(u(6), halfH * 0.5);
      return '<polygon' + cls + ' points="' +
        left + ',' + (50 - shaftHalf) + ' ' +
        headBase + ',' + (50 - shaftHalf) + ' ' +
        headBase + ',' + (50 - halfH) + ' ' +
        right + ',50 ' +
        headBase + ',' + (50 + halfH) + ' ' +
        headBase + ',' + (50 + shaftHalf) + ' ' +
        left + ',' + (50 + shaftHalf) + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve +
        ' stroke-linejoin="round"' + sr + '/>';
    }
    if (kind === 'SHAPE_DONUT') {
      var orx = u(20) * sx;
      var ory = u(20) * sy;
      var irx = u(8) * sx;
      var iry = u(8) * sy;
      return '<path' + cls + ' fill-rule="evenodd"' +
        ' d="M50,' + (50 - ory) + ' A' + orx + ',' + ory +
        ' 0 1,1 49.99,' + (50 - ory) + ' Z M50,' + (50 - iry) + ' A' + irx + ',' + iry +
        ' 0 1,0 50,' + (50 + iry) + ' A' + irx + ',' + iry +
        ' 0 1,0 50,' + (50 - iry) + ' Z"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
    }
    if (kind === 'SHAPE_CAPSULE') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var capCw = Number(paint.contentW);
        var capCh = Number(paint.contentH);
        /* Stadium ends: semicircles (rx = half height), body grows horizontally. */
        var capRx = Math.min(capCw / 2, capCh / 2);
        return '<rect' + cls + ' x="0" y="0"' +
          ' width="' + capCw + '" height="' + capCh + '"' +
          ' rx="' + capRx + '"' +
          ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
      }
      var capRxLegacy = u(8);
      var rx = Math.min(capRxLegacy, w / 2, h / 2);
      return '<rect' + cls + ' x="' + (50 - w / 2) + '" y="' + (50 - h / 2) + '"' +
        ' width="' + w + '" height="' + h + '"' +
        ' rx="' + rx + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
    }
    if (kind === 'SHAPE_ROUND_RECT') {
      if (paint.contentW > 0 && paint.contentH > 0) {
        var rrcw = Number(paint.contentW);
        var rrch = Number(paint.contentH);
        var rrrx = paint.contentRx != null && !isNaN(Number(paint.contentRx))
          ? Number(paint.contentRx)
          : Math.min(shapeRoundRectFixedCornerRx(brR), rrcw / 2, rrch / 2);
        return '<rect' + cls + ' x="0" y="0"' +
          ' width="' + rrcw + '" height="' + rrch + '"' +
          ' rx="' + rrrx + '"' +
          ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
      }
      var rxFixed = Math.max(0, Math.min(50, (brR / 12) * u(9)));
      var rr = Math.min(rxFixed, w / 2, h / 2);
      return '<rect' + cls + ' x="' + (50 - w / 2) + '" y="' + (50 - h / 2) + '"' +
        ' width="' + w + '" height="' + h + '"' +
        ' rx="' + rr + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
    }
    /* SHAPE_RECT — content-box paint: viewBox matches box aspect, rx fixed in px */
    if (paint.contentW > 0 && paint.contentH > 0) {
      var cw = Number(paint.contentW);
      var ch = Number(paint.contentH);
      var rectRxFixed = paint.contentRx != null && !isNaN(Number(paint.contentRx))
        ? Number(paint.contentRx)
        : Math.min(shapeRectFixedCornerRx(), cw / 2, ch / 2);
      return '<rect' + cls + ' x="0" y="0"' +
        ' width="' + cw + '" height="' + ch + '"' +
        ' rx="' + rectRxFixed + '"' +
        ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
    }
    /* SHAPE_RECT — picker / stretch tile: small fixed corner radius, body stretches */
    var rectRx = Math.min(shapeRectFixedCornerRx(), w / 2, h / 2);
    return '<rect' + cls + ' x="' + (50 - w / 2) + '" y="' + (50 - h / 2) + '"' +
      ' width="' + w + '" height="' + h + '"' +
      ' rx="' + rectRx + '"' +
      ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + ve + sr + '/>';
  }

  /**
   * Single SVG source for picker thumbs + canvas + runtime.
   * Geometry matches picker miniatures (inset in 100×100, same stroke weight).
   */
  function buildSceneShapeSvg(kind, opts) {
    opts = opts || {};
    kind = String(kind || '').toUpperCase();
    var fill = opts.fill != null ? opts.fill : 'rgba(255,255,255,0.14)';
    var stroke = opts.stroke != null ? opts.stroke : 'rgba(255,255,255,0.55)';
    var sw = shapeStrokeWidth(opts);
    var svgClass = opts.svgClass ? ' class="' + shapeAttr(opts.svgClass) + '"' : '';
    var par = opts.preserveAspect === 'none' ? 'none' : 'xMidYMid meet';
    var inlineStyle = opts.inlineStyle ? ' style="' + shapeAttr(opts.inlineStyle) + '"' : '';
    var stOpts = shapeStretchXY(opts);
    var brR = opts.borderRadius != null ? Number(opts.borderRadius) : 16;
    var vb = shapeSvgViewBox(kind, stOpts.sx, stOpts.sy);
    var contentPaint = null;
    /* Gizmo box paint: tight viewBox so geometry fills the element edge-to-edge (Genially-style). */
    if (opts.tightViewBox) {
      if (shapeUsesContentBoxPaint(kind) &&
          opts.contentBoxWPct != null && opts.contentBoxHPct != null) {
        var normVb = shapeContentBoxViewBoxNorm(
          opts.contentBoxWPct, opts.contentBoxHPct, opts.layerW, opts.layerH
        );
        vb = { x: 0, y: 0, w: normVb.w, h: normVb.h };
        contentPaint = {
          contentW: normVb.w,
          contentH: normVb.h
        };
        if (kind === 'SHAPE_RECT') {
          contentPaint.contentRx = shapeRectCornerRxViewBox(
            opts.contentBoxWPct, opts.contentBoxHPct, opts.layerW, opts.layerH,
            normVb.w, normVb.h
          );
        } else if (kind === 'SHAPE_ROUND_RECT') {
          contentPaint.contentRx = shapeRoundRectCornerRxViewBox(
            opts.contentBoxWPct, opts.contentBoxHPct, opts.layerW, opts.layerH,
            normVb.w, normVb.h, brR
          );
        }
      } else {
        var tightBb = shapeContentBBox(kind, stOpts);
        vb = {
          x: tightBb.cx - tightBb.w / 2,
          y: tightBb.cy - tightBb.h / 2,
          w: tightBb.w,
          h: tightBb.h
        };
      }
    }
    var paintBase = {
      fill: fill,
      stroke: stroke,
      strokeWidth: sw,
      borderRadius: brR,
      stretchX: stOpts.sx,
      stretchY: stOpts.sy
    };
    if (contentPaint) {
      paintBase.contentW = contentPaint.contentW;
      paintBase.contentH = contentPaint.contentH;
      if (contentPaint.contentRx != null) paintBase.contentRx = contentPaint.contentRx;
    }
    var open = '<svg' + svgClass + inlineStyle +
      ' viewBox="' + vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h + '"' +
      ' preserveAspectRatio="' + par + '"' +
      ' aria-hidden="true" focusable="false">';
    var html = open;
    if (opts.strokeGlowLayer) {
      /* Pick under body — interior hits reach pick; body paints on top. */
      if (kind !== 'SHAPE_LINE') {
        html += sceneShapeGeometry(kind, Object.assign({}, paintBase, {
          fill: 'rgba(0,0,0,0.01)',
          stroke: 'none',
          strokeWidth: 0,
          pickLayer: true,
          className: 'builder-exp-stage-shape__pick'
        }, contentPaint || {}));
      }
      html += sceneShapeGeometry(kind, Object.assign({}, paintBase, {
        className: 'builder-exp-stage-shape__body'
      }));
      html += sceneShapeGeometry(kind, Object.assign({
        fill: 'none',
        stroke: stroke,
        strokeWidth: sw + 2,
        borderRadius: brR,
        stretchX: stOpts.sx,
        stretchY: stOpts.sy,
        className: 'builder-exp-stage-shape__stroke-glow'
      }, contentPaint || {}));
    } else {
      html += sceneShapeGeometry(kind, paintBase);
    }
    return html + '</svg>';
  }

  function sceneShapeDefaultSize(t) {
    /* One square tile for every shape — geometry differs inside the SVG (picker model). */
    return { w: 12, h: 12 };
  }

  /** Shared insert height (% layer) — matches circle at legacy 12% tile. */
  function shapeDefaultTargetGhPct(layerW, layerH) {
    var tileW = sceneShapeDefaultSize().w;
    var cf = shapeContentFrac('SHAPE_CIRCLE', 1, 1);
    var lw = Math.max(1, Number(layerW) || 1920);
    var lh = Math.max(1, Number(layerH) || 1080);
    return tileW * cf.dispH * (lw / lh);
  }

  /** Default gw×gh per kind — uniform height, width from artboard aspect. */
  function shapeDefaultContentBoxMetrics(kind, layerW, layerH) {
    kind = String(kind || '').toUpperCase();
    var base = shapeContentBBoxBase(kind);
    var bh = Math.max(0.001, Number(base.h) || 1);
    var bw = Math.max(0.001, Number(base.w) || 1);
    var lw = Math.max(1, Number(layerW) || 1920);
    var lh = Math.max(1, Number(layerH) || 1080);
    var gh = shapeDefaultTargetGhPct(layerW, layerH);
    var gw = gh * (bw / bh) * (lh / lw);
    if (kind === 'SHAPE_LINE') {
      gw = Math.min(95, Math.max(28, gw));
    }
    gh = Math.max(0.08, Math.min(95, gh));
    gw = Math.max(0.5, Math.min(95, gw));
    return { gw: gw, gh: gh };
  }

  /** Global showroom controls — configured on Hero, not per-scene elements */
  var GLOBAL_SHOWROOM_ACTIONS = {
    whatsapp: true,
    share: true,
    fullscreen: true,
    'open-menu': true
  };

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
      resetSnapshots: [],
      flowSnapshots: [],
      canvas: {
        panX: 40,
        panY: 40,
        zoom: 1,
        selectedId: null,
        selectedIds: [],
        selectedEdgeId: null,
        selectedEdgeIds: [],
        selectedInteractionId: null,
        selectedInteractionSceneId: null,
        tool: 'select',
        minimapVisible: true,
        inspectorOpen: false,
        inspectorCollapsed: false,
        activeGroupId: null,
        /* V6.3.00 — FLUJO | BOTONES | HOTSPOTS | PROTOTIPO */
        editMode: 'flow',
        selectedButtonId: null,
        selectedButtonIds: [],
        selectedHotspotId: null
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
    if (!Array.isArray(exp.resetSnapshots)) exp.resetSnapshots = [];
    if (!Array.isArray(exp.flowSnapshots)) exp.flowSnapshots = [];
    if (!Array.isArray(exp.archivedLegacyNodes)) exp.archivedLegacyNodes = [];
    if (!Array.isArray(exp.archivedInlineNodes)) exp.archivedInlineNodes = [];
    if (!exp.canvas || typeof exp.canvas !== 'object') {
      exp.canvas = emptyState().canvas;
    }
    if (exp.canvas.selectedEdgeId == null) exp.canvas.selectedEdgeId = null;
    if (exp.canvas.inspectorCollapsed == null) exp.canvas.inspectorCollapsed = false;
    if (exp.canvas.selectedInteractionId === undefined) exp.canvas.selectedInteractionId = null;
    if (exp.canvas.selectedInteractionSceneId === undefined) {
      exp.canvas.selectedInteractionSceneId = null;
    }
    if (!Array.isArray(exp.canvas.selectedIds)) {
      exp.canvas.selectedIds = exp.canvas.selectedId ? [exp.canvas.selectedId] : [];
    }
    if (!Array.isArray(exp.canvas.selectedEdgeIds)) {
      exp.canvas.selectedEdgeIds = exp.canvas.selectedEdgeId ? [exp.canvas.selectedEdgeId] : [];
    }
    if (exp.canvas.activeGroupId === undefined) exp.canvas.activeGroupId = null;
    /* V6.3.03 — allow FLUJO | BOTONES | HOTSPOTS | PROTOTIPO (do not clobber) */
    var mode = String(exp.canvas.editMode || 'flow');
    if (mode !== 'flow' && mode !== 'buttons' && mode !== 'hotspots' && mode !== 'prototype') {
      exp.canvas.editMode = 'flow';
    }
    if (exp.canvas.selectedButtonId === undefined) exp.canvas.selectedButtonId = null;
    if (!Array.isArray(exp.canvas.selectedButtonIds)) {
      exp.canvas.selectedButtonIds = exp.canvas.selectedButtonId
        ? [exp.canvas.selectedButtonId]
        : [];
    }
    if (exp.canvas.selectedHotspotId === undefined) exp.canvas.selectedHotspotId = null;
    ensureProjectAssets(state);
    exp.nodes.forEach(function (n) {
      normalizeNode(n);
      ensureNodeAssetRef(state, n);
      if (n && isSceneKind(n.kind)) migrateLegacySceneButtons(state, n);
    });
    exp.edges.forEach(normalizeEdge);
    return exp;
  }

  function kindMeta(kind) {
    return KIND_META[kind] || { typeLabel: 'NODO', accent: 'green', role: 'scene' };
  }

  /** Resolve card accent to green | purple only (no yellow/blue legacy). */
  function resolveAccent(nOrAccent) {
    var raw = nOrAccent;
    if (raw && typeof raw === 'object') {
      var meta = kindMeta(raw.kind);
      raw = raw.accent || meta.accent;
    }
    var key = String(raw || 'green');
    return ACCENT_REMAP[key] || (key === 'green' ? 'green' : 'purple');
  }

  function normalizeNode(n) {
    if (!n || typeof n !== 'object') return n;
    var meta = kindMeta(n.kind);
    if (!n.typeLabel) n.typeLabel = meta.typeLabel;
    /* V5.9.62 — force visual palette from kind (presentation; ids/edges intact) */
    n.accent = meta.accent;
    if (!n.role) n.role = meta.role || 'scene';
    if (!Array.isArray(n.ports)) n.ports = [];
    if (n.x == null) n.x = null;
    if (n.y == null) n.y = null;
    if (n.config == null || typeof n.config !== 'object') n.config = {};
    if (n.parentId === undefined) n.parentId = null;
    if (n.locked == null) n.locked = false;
    if (n.protected == null) n.protected = n.kind === 'hero' || n.id === 'exp-hero';
    if (isSceneKind(n.kind)) normalizeSceneInteractions(n);
    return n;
  }

  function isSceneKind(kind) {
    return !!SCENE_KINDS[kind];
  }

  function interactionGroup(type) {
    var t = String(type || '').toUpperCase();
    if (t === 'HOTSPOT' || t === 'UNIT' || t === 'UNITS_FLOOR') return 'content';
    if (t === 'BACK') return 'navigation';
    if (t === 'BUTTON' || t === 'SELECTOR' || t === 'TOGGLE_3D2D' || t === 'MENU_TRIGGER' ||
        t === 'PANEL_TRIGGER' || t === 'CUSTOM') return 'controls';
    return 'controls';
  }

  /**
   * Whether an embedded interaction exposes an outgoing ○ port.
   * Internal hub controls and contextual Back do not leave the scene via cable.
   */
  function interactionHasSourcePort(ix) {
    if (!ix || ix.enabled === false) return false;
    var t = String(ix.type || '').toUpperCase();
    var a = String(ix.actionType || (ix.behavior && ix.behavior.type) || '').toLowerCase();
    if (t === 'BACK' || a === 'back') return false;
    if (t === 'TOGGLE_3D2D' || a === 'toggle-3d2d') return false;
    if (t === 'SELECTOR' || a === 'floor-selector') return false;
    if (t === 'MENU_TRIGGER' || a === 'open-menu') return false;
    if (GLOBAL_SHOWROOM_ACTIONS[a]) return false;
    /* V6.2.00 — polygon masks are visual regions; no flow port until Runtime wires them */
    if (t === 'HOTSPOT' && (ix.shape === 'polygon' || Array.isArray(ix.polygon))) return false;
    return true;
  }

  /**
   * V6.1.01 — BOTONES editor = visual layer over FLUJO "Botón / Control" interactions.
   * Single SSOT: scene.config.interactions[] where type === 'BUTTON'.
   * Never a separate config.buttons collection.
   */
  var BUTTON_STYLES = { chip: 1, button: 1, icon: 1 };
  var BUTTON_ICONS = { none: 1, arrow: 1, 'rotate-left': 1, 'rotate-right': 1, plus: 1 };
  var BUTTON_ANCHORS = {
    center: { x: 50, y: 50 },
    'top-center': { x: 50, y: 0 },
    'bottom-center': { x: 50, y: 100 },
    'center-left': { x: 0, y: 50 },
    'center-right': { x: 100, y: 50 },
    'top-left': { x: 0, y: 0 },
    'top-right': { x: 100, y: 0 },
    'bottom-left': { x: 0, y: 100 },
    'bottom-right': { x: 100, y: 100 }
  };

  function isButtonsEditableNode(n) {
    if (!n) return false;
    if (n.kind === 'hero' || n.role === 'action' || n.kind === 'action') return false;
    if (n.kind === 'video' || n.kind === 'animacion' || n.kind === 'transicion') return false;
    if (n.config && n.config.hub && n.config.hub.enabled) return false;
    var k = String(n.kind || '');
    return k === 'image' || k === 'scene' || k === 'vista' || k === 'gallery' || k === 'plan';
  }

  function isSceneButtonInteraction(ix) {
    return !!(ix && String(ix.type || '').toUpperCase() === 'BUTTON');
  }

  /* V7.2.44 — free-position overlays on buttons stage (buttons + text + shapes). */
  function isSceneFreeOverlayInteraction(ix) {
    if (!ix) return false;
    var t = String(ix.type || '').toUpperCase();
    return t === 'BUTTON' || t === 'TEXT' || isSceneShapeType(t);
  }

  function isOverlayGroupInteraction(ix) {
    if (!ix) return false;
    var t = String(ix.type || '').toUpperCase();
    return t === 'OVERLAY_GROUP' || t === 'GROUP';
  }

  /** Stored visibility on the interaction itself (ignores parent group). */
  function overlayInteractionSelfVisible(ix) {
    return !!(ix && ix.enabled !== false);
  }

  /** Effective canvas visibility — self flag plus ancestor overlay group chain. */
  function overlayEffectiveVisible(n, ix) {
    if (!overlayInteractionSelfVisible(ix)) return false;
    if (!n || !ix || !ix.groupId) return true;
    var g = getInteraction(n, ix.groupId);
    if (!g || !isOverlayGroupInteraction(g)) return true;
    return overlayInteractionSelfVisible(g);
  }

  /** Stored lock on the interaction itself (ignores parent group). */
  function overlayInteractionSelfLocked(ix) {
    return !!(ix && ix.locked);
  }

  /** Effective editor lock — self flag or ancestor overlay group lock. */
  function overlayEffectiveLocked(n, ix) {
    if (overlayInteractionSelfLocked(ix)) return true;
    if (!n || !ix || !ix.groupId) return false;
    var g = getInteraction(n, ix.groupId);
    if (!g || !isOverlayGroupInteraction(g)) return false;
    return overlayInteractionSelfLocked(g);
  }

  /** Canonical editor lock gate — pass node + interaction id or ix object. */
  function isOverlayEffectivelyLocked(state, n, ixOrId) {
    if (!n) return false;
    var ix = typeof ixOrId === 'string' ? getInteraction(n, ixOrId) : ixOrId;
    return overlayEffectiveLocked(n, ix);
  }

  function degToRad(d) { return (Number(d) || 0) * Math.PI / 180; }

  function rotatePoint2d(x, y, deg) {
    var r = degToRad(deg);
    var c = Math.cos(r);
    var s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  /** Width/height of a free overlay in scene % (matches canvas gizmo math). */
  function overlayItemSizePct(ix, layerW, layerH) {
    if (!ix) return { w: 12, h: 8 };
    var t = String(ix.type || 'BUTTON').toUpperCase();
    var w = layerW || 1000;
    var h = layerH || 1000;
    if (t === 'BUTTON') {
      return {
        w: ix.boxW != null ? Number(ix.boxW) : 14,
        h: ix.boxH != null ? Number(ix.boxH) : 4.5
      };
    }
    if (isSceneShapeType(t)) {
      return sceneShapeDisplaySize(ix.width, w, h);
    }
    return {
      w: Math.max(8, Math.min(40, (String(ix.label || 'Texto').length) * 1.2)),
      h: Math.max(3, ((Number(ix.fontSize) || 28) / h) * 100 * 1.4)
    };
  }

  function overlayRotatedCorners(cx, cy, w, h, rotDeg) {
    var hw = w / 2;
    var hh = h / 2;
    var pts = [
      { x: -hw, y: -hh }, { x: hw, y: -hh },
      { x: hw, y: hh }, { x: -hw, y: hh }
    ];
    return pts.map(function (p) {
      var r = rotatePoint2d(p.x, p.y, rotDeg);
      return { x: cx + r.x, y: cy + r.y };
    });
  }

  /** Tight axis-aligned rect for union bounds — matches canvas shape gizmo, not picker tile. */
  function overlayMemberUnionRect(ix, world, layerW, layerH) {
    if (!ix || !world) return null;
    var t = String(ix.type || 'BUTTON').toUpperCase();
    if (isSceneShapeType(t)) {
      var wPct = ix.width != null ? Number(ix.width) : sceneShapeDefaultSize(t).w;
      var hPct = ix.height != null ? Number(ix.height) : null;
      var st = shapeStretchXY({
        stretchX: ix.shapeStretchX,
        stretchY: ix.shapeStretchY
      });
      var gm = sceneShapeGizmoMetrics(
        wPct, t, layerW, layerH,
        world.x, world.y,
        st.sx, st.sy, hPct, ix
      );
      if (gm) {
        return {
          cx: gm.gx,
          cy: gm.gy,
          w: gm.gw,
          h: gm.gh,
          rotation: world.rotation
        };
      }
    }
    return {
      cx: world.x,
      cy: world.y,
      w: world.width,
      h: world.height,
      rotation: world.rotation
    };
  }

  function resolveOverlayGroupMemberIds(n, g, opts) {
    opts = opts || {};
    if (!g) return [];
    var ids = {};
    (g.memberIds || []).forEach(function (id) {
      if (id) ids[String(id)] = true;
    });
    if (n && n.config && Array.isArray(n.config.interactions)) {
      n.config.interactions.forEach(function (ix) {
        if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
        if (String(ix.groupId || '') === String(g.id)) ids[String(ix.id)] = true;
      });
    }
    var out = Object.keys(ids);
    if (opts.repair && out.length) g.memberIds = out.slice();
    return out;
  }

  function ensureOverlayGroupDefaults(n, g, layerW, layerH, opts) {
    opts = opts || {};
    if (!g || !isOverlayGroupInteraction(g)) return g;
    var __gmEnter = compareRotateGroupModelTraceEnabled() ? snapshotGroupModelTrace(g) : null;
    if (g.rotation == null || isNaN(Number(g.rotation))) g.rotation = 0;
    if (g.x == null || isNaN(Number(g.x))) g.x = 50;
    if (g.y == null || isNaN(Number(g.y))) g.y = 50;
    if (!Array.isArray(g.memberIds)) g.memberIds = [];
    var lw = layerW || 1000;
    var lh = layerH || 1000;
    var memberIds = resolveOverlayGroupMemberIds(n, g, { repair: true });
    if (g.width == null || g.height == null || !memberIds.length) {
      var bounds0 = computeOverlayUnionBounds(n, memberIds, lw, lh, { useComposed: true });
      if (bounds0) {
        var __gmB0 = snapshotGroupModelTrace(g);
        g.x = bounds0.cx;
        g.y = bounds0.cy;
        g.width = bounds0.w;
        g.height = bounds0.h;
        traceGroupModelIfChanged(
          g, g.id, __gmB0,
          'ensureOverlayGroupDefaults', '1640-1644',
          'computeOverlayUnionBounds(bounds0) → g.x/y/width/height',
          { bounds0: bounds0, skipSync: !!opts.skipSync }
        );
        if (g._baseWidth == null) g._baseWidth = bounds0.w;
        if (g._baseHeight == null) g._baseHeight = bounds0.h;
      } else {
        var __gmB1 = snapshotGroupModelTrace(g);
        if (g.width == null) g.width = 20;
        if (g.height == null) g.height = 20;
        traceGroupModelIfChanged(
          g, g.id, __gmB1,
          'ensureOverlayGroupDefaults', '1655-1656',
          'fallback defaults → g.width/height=20',
          { skipSync: !!opts.skipSync }
        );
        if (g._baseWidth == null) g._baseWidth = g.width;
        if (g._baseHeight == null) g._baseHeight = g.height;
      }
    }
    if (g._baseWidth == null) g._baseWidth = Number(g.width) || 20;
    if (g._baseHeight == null) g._baseHeight = Number(g.height) || 20;
    if (!opts.skipSync && Number(g._transformV) < 2 && n && memberIds.length) {
      syncOverlayGroupFrameFromMembers(n, g, lw, lh);
    }
    if (__gmEnter) {
      traceGroupModelIfChanged(
        g, g.id, __gmEnter,
        'ensureOverlayGroupDefaults', 'exit',
        'ensureOverlayGroupDefaults exit (includes optional syncOverlayGroupFrameFromMembers)',
        { skipSync: !!opts.skipSync, _transformV: Number(g._transformV) || 0 }
      );
    }
    return g;
  }

  function computeOverlayUnionBounds(n, memberIds, layerW, layerH, opts) {
    opts = opts || {};
    memberIds = (memberIds || []).map(String).filter(Boolean);
    if (!n || memberIds.length < 1) return null;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var minL = Infinity;
    var minT = Infinity;
    var maxR = -Infinity;
    var maxB = -Infinity;
    memberIds.forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      var world = opts.useComposed
        ? overlayWorldLayoutRaw(n, ix, layerW, layerH)
        : overlayWorldLayoutAbsolute(ix, layerW, layerH);
      if (!world) return;
      var rect = overlayMemberUnionRect(ix, world, layerW, layerH);
      if (!rect) return;
      var cxPx = (rect.cx / 100) * layerW;
      var cyPx = (rect.cy / 100) * layerH;
      var wPx = (rect.w / 100) * layerW;
      var hPx = (rect.h / 100) * layerH;
      var corners = overlayRotatedCorners(cxPx, cyPx, wPx, hPx, rect.rotation);
      corners.forEach(function (c) {
        if (c.x < minL) minL = c.x;
        if (c.y < minT) minT = c.y;
        if (c.x > maxR) maxR = c.x;
        if (c.y > maxB) maxB = c.y;
      });
    });
    if (!isFinite(minL)) return null;
    return {
      cx: (((minL + maxR) / 2) / layerW) * 100,
      cy: (((minT + maxB) / 2) / layerH) * 100,
      w: Math.max(0.5, ((maxR - minL) / layerW) * 100),
      h: Math.max(0.5, ((maxB - minT) / layerH) * 100)
    };
  }

  function reconcileOverlayGroupTransform(n, g, layerW, layerH) {
    return syncOverlayGroupFrameFromMembers(n, g, layerW, layerH);
  }

  /** Recompute group frame from composed member worlds without shifting children visually. */
  function syncOverlayGroupFrameFromMembers(n, g, layerW, layerH) {
    if (!n || !g || !isOverlayGroupInteraction(g)) return g;
    if (Number(g._transformV) >= 2) return g;
    var __gmEnter = compareRotateGroupModelTraceEnabled() ? snapshotGroupModelTrace(g) : null;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    ensureOverlayGroupDefaults(n, g, layerW, layerH, { skipSync: true });
    var memberIds = resolveOverlayGroupMemberIds(n, g, { repair: true });
    if (!memberIds.length) return g;
    var worlds = {};
    memberIds.forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      worlds[String(id)] = overlayWorldLayoutRaw(n, ix, layerW, layerH);
    });
    var bounds = computeOverlayUnionBounds(n, memberIds, layerW, layerH, { useComposed: true });
    if (bounds) {
      var __gmB = snapshotGroupModelTrace(g);
      g.x = bounds.cx;
      g.y = bounds.cy;
      g.width = bounds.w;
      g.height = bounds.h;
      traceGroupModelIfChanged(
        g, g.id, __gmB,
        'syncOverlayGroupFrameFromMembers', '1738-1742',
        'computeOverlayUnionBounds(bounds) → g.x/y/width/height',
        { bounds: bounds, _transformV: Number(g._transformV) || 0 }
      );
      if (g._baseWidth == null) g._baseWidth = bounds.w;
      if (g._baseHeight == null) g._baseHeight = bounds.h;
    }
    memberIds.forEach(function (id) {
      var ix = getInteraction(n, id);
      var world = worlds[String(id)];
      if (!ix || !world) return;
      var loc = worldPointToLocal(g, world.x, world.y, layerW, layerH);
      ix.localX = loc.x;
      ix.localY = loc.y;
      ix.localRotation = world.rotation - (Number(g.rotation) || 0);
      ix.groupId = g.id;
    });
    g._transformV = 2;
    if (__gmEnter) {
      traceGroupModelIfChanged(
        g, g.id, __gmEnter,
        'syncOverlayGroupFrameFromMembers', 'exit',
        'syncOverlayGroupFrameFromMembers exit (relocalize members)',
        { _transformV: Number(g._transformV) || 0 }
      );
    }
    return g;
  }

  function overlayWorldLayoutAbsolute(ix, layerW, layerH) {
    if (!ix) return null;
    var layout = resolveButtonLayout(ix, layerW, layerH);
    var size = overlayItemSizePct(ix, layerW, layerH);
    return {
      x: layout.x,
      y: layout.y,
      rotation: Number(ix.rotation) || 0,
      width: size.w,
      height: size.h,
      boxW: size.w,
      boxH: size.h
    };
  }

  /** World layout without re-entering group compose (uses ix.x/y when ungrouped). */
  function overlayWorldLayoutRaw(n, ix, layerW, layerH) {
    if (!ix) return null;
    if (ix.groupId && ix.localX != null && ix.localY != null) {
      var g = getInteraction(n, ix.groupId);
      if (g && isOverlayGroupInteraction(g)) {
        return composeOverlayWorldLayout(g, ix, layerW, layerH, n);
      }
    }
    return overlayWorldLayoutAbsolute(ix, layerW, layerH);
  }

  function composeOverlayWorldLayout(group, child, layerW, layerH, n) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    ensureOverlayGroupDefaults(n, group, layerW, layerH, { skipSync: true });
    var gr = Number(group.rotation) || 0;
    var lxPx = (Number(child.localX) || 0) / 100 * layerW;
    var lyPx = (Number(child.localY) || 0) / 100 * layerH;
    var r = rotatePoint2d(lxPx, lyPx, gr);
    var gxPx = (Number(group.x) / 100) * layerW;
    var gyPx = (Number(group.y) / 100) * layerH;
    var size = overlayItemSizePct(child, layerW, layerH);
    return {
      x: ((gxPx + r.x) / layerW) * 100,
      y: ((gyPx + r.y) / layerH) * 100,
      rotation: gr + (Number(child.localRotation) || 0),
      width: size.w,
      height: size.h,
      boxW: size.w,
      boxH: size.h
    };
  }

  function worldPointToLocal(group, wxPct, wyPct, layerW, layerH) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var gxPx = (Number(group.x) / 100) * layerW;
    var gyPx = (Number(group.y) / 100) * layerH;
    var wxPx = (Number(wxPct) / 100) * layerW;
    var wyPx = (Number(wyPct) / 100) * layerH;
    var inv = rotatePoint2d(
      wxPx - gxPx,
      wyPx - gyPx,
      -(Number(group.rotation) || 0)
    );
    return {
      x: (inv.x / layerW) * 100,
      y: (inv.y / layerH) * 100
    };
  }

  function absoluteToLocalOverlay(n, group, child, layerW, layerH) {
    ensureOverlayGroupDefaults(n, group, layerW, layerH, { skipSync: true });
    var world = overlayWorldLayoutRaw(n, child, layerW, layerH);
    if (!world) {
      world = overlayWorldLayoutAbsolute(child, layerW, layerH);
    }
    if (!world) return null;
    var inv = worldPointToLocal(group, world.x, world.y, layerW, layerH);
    return {
      localX: inv.x,
      localY: inv.y,
      localRotation: world.rotation - (Number(group.rotation) || 0)
    };
  }

  /** Re-sync member locals from composed world (after group rotation, etc.). */
  function relocalizeOverlayGroupMembers(n, g, layerW, layerH) {
    if (!n || !g || !isOverlayGroupInteraction(g)) return g;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    ensureOverlayGroupDefaults(n, g, layerW, layerH, { skipSync: true });
    resolveOverlayGroupMemberIds(n, g, { repair: true }).forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      var world = overlayWorldLayoutRaw(n, ix, layerW, layerH);
      if (!world) return;
      var inv = worldPointToLocal(g, world.x, world.y, layerW, layerH);
      ix.localX = inv.x;
      ix.localY = inv.y;
      ix.localRotation = world.rotation - (Number(g.rotation) || 0);
    });
    return g;
  }

  function bakeOverlayWorldToChild(n, group, child, layerW, layerH) {
    var world = composeOverlayWorldLayout(group, child, layerW, layerH, n);
    if (!world) return;
    var t = String(child.type || '').toUpperCase();
    if (isSceneShapeType(t)) {
      /* Use tight gizmo bounds — overlayItemSizePct ignores shapeContentBox height and stretch. */
      var union = overlayMemberUnionRect(child, world, layerW, layerH);
      if (union) {
        child.x = union.cx;
        child.y = union.cy;
        child.rotation = union.rotation;
        child.width = union.w;
        child.height = union.h;
        child.shapeStretchX = 1;
        child.shapeStretchY = 1;
        child.shapeContentBox = true;
      } else {
        child.x = world.x;
        child.y = world.y;
        child.rotation = world.rotation;
        child.width = world.width;
        child.height = world.height;
      }
    } else {
      child.x = world.x;
      child.y = world.y;
      child.rotation = world.rotation;
      if (t === 'BUTTON') {
        child.boxW = world.boxW;
        child.boxH = world.boxH;
      }
    }
    delete child.localX;
    delete child.localY;
    delete child.localRotation;
    delete child.groupId;
  }

  function migrateGroupedChildLocals(n, group, layerW, layerH) {
    if (!n || !group || !isOverlayGroupInteraction(group)) return;
    resolveOverlayGroupMemberIds(n, group, { repair: true });
    (group.memberIds || []).forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      if (ix.localX != null && ix.localY != null) return;
      var local = absoluteToLocalOverlay(n, group, ix, layerW, layerH);
      if (!local) return;
      ix.localX = local.localX;
      ix.localY = local.localY;
      ix.localRotation = local.localRotation;
    });
  }

  function overlayGroupViewModel(state, n, g, layerW, layerH) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var lockedFrame = Number(g._transformV) >= 2;
    ensureOverlayGroupDefaults(n, g, layerW, layerH, { skipSync: lockedFrame });
    migrateGroupedChildLocals(n, g, layerW, layerH);
    var memberIds = resolveOverlayGroupMemberIds(n, g, { repair: true });
    var useStoredFrame = lockedFrame &&
      g.width != null && g.height != null;
    var bounds = useStoredFrame
      ? null
      : computeOverlayUnionBounds(n, memberIds, layerW, layerH, { useComposed: true });
    var vx = useStoredFrame
      ? (Number(g.x) || 50)
      : (bounds ? bounds.cx : (Number(g.x) || 50));
    var vy = useStoredFrame
      ? (Number(g.y) || 50)
      : (bounds ? bounds.cy : (Number(g.y) || 50));
    var vw = useStoredFrame
      ? (Number(g.width) || 20)
      : (bounds ? bounds.w : (Number(g.width) || 20));
    var vh = useStoredFrame
      ? (Number(g.height) || 20)
      : (bounds ? bounds.h : (Number(g.height) || 20));
    return {
      id: g.id,
      portId: g.portId || g.id,
      type: 'OVERLAY_GROUP',
      label: g.label != null ? String(g.label) : 'Grupo',
      x: vx,
      y: vy,
      storedX: vx,
      storedY: vy,
      rotation: Number(g.rotation) || 0,
      width: vw,
      height: vh,
      memberIds: memberIds.slice(),
      visible: g.enabled !== false,
      enabled: g.enabled !== false,
      locked: !!g.locked,
      _ix: g,
      _isGroup: true
    };
  }

  function getSceneOverlayItem(state, n, itemId, layerW, layerH) {
    if (!n || !itemId) return null;
    var ix = getInteraction(n, itemId);
    if (!ix) return null;
    if (isOverlayGroupInteraction(ix)) {
      return overlayGroupViewModel(state, n, ix, layerW, layerH);
    }
    if (isSceneFreeOverlayInteraction(ix)) {
      return buttonViewModel(state, n, ix, layerW, layerH);
    }
    return null;
  }

  function applyOverlayMemberWorldToGroupLocal(n, g, child, cx, cy, w, h, rot, layerW, layerH) {
    applyOverlayMemberWorldScale(n, g, child, {
      cx: cx, cy: cy, w: w, h: h, rotation: rot,
      type: child.type,
      fontSize: child.fontSize,
      shapeContentBox: child.shapeContentBox,
      stretchX: child.shapeStretchX,
      stretchY: child.shapeStretchY
    }, 1, 1, cx, cy, layerW, layerH);
  }

  /** Minimum member size during group/multi proportional scale (~6px). */
  var OVERLAY_MEMBER_MIN_PX = 6;

  /** Proportional w/h from snapshot — linear; NaN-safe. */
  function overlayMemberScaledSize(sw, sx, sy, layerW, layerH) {
    sx = Number(sx) || 1;
    sy = Number(sy) || 1;
    if (!isFinite(sx)) sx = 1;
    if (!isFinite(sy)) sy = 1;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var minWPct = (OVERLAY_MEMBER_MIN_PX / layerW) * 100;
    var minHPct = (OVERLAY_MEMBER_MIN_PX / layerH) * 100;
    var w = (Number(sw.w) || 0.5) * sx;
    var h = (Number(sw.h) || 0.5) * sy;
    if (!isFinite(w) || w <= 0) w = minWPct;
    if (!isFinite(h) || h <= 0) h = minHPct;
    return { w: w, h: h };
  }

  /** Shapes whose commit w/h must preserve snap aspect (avoid independent round drift). */
  function overlayMemberNeedsCoupledRound(kind) {
    kind = String(kind || '').toUpperCase();
    if (kind === 'SHAPE_CIRCLE' || kind === 'SHAPE_DONUT') return true;
    return shapeUsesContentBoxPaint(kind);
  }

  function overlayMemberMinPct(layerW, layerH) {
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    return {
      w: (OVERLAY_MEMBER_MIN_PX / layerW) * 100,
      h: (OVERLAY_MEMBER_MIN_PX / layerH) * 100
    };
  }

  function overlayMemberCoupledCommitDims(nw, nh, snapW, snapH, kind, layerW, layerH) {
    nw = Number(nw);
    nh = Number(nh);
    kind = String(kind || '').toUpperCase();
    if (!overlayMemberNeedsCoupledRound(kind) || !isFinite(nw) || !isFinite(nh)) {
      return { w: nw, h: nh, coupled: false };
    }
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var minPct = overlayMemberMinPct(layerW, layerH);
    var snapWn = Number(snapW);
    var snapHn = Number(snapH);
    var isPixelSquare = kind === 'SHAPE_CIRCLE' || kind === 'SHAPE_DONUT';
    var ratio = isPixelSquare
      ? layerW / layerH
      : ((snapWn > 0 && snapHn > 0 && isFinite(snapHn / snapWn))
        ? snapHn / snapWn
        : layerW / layerH);
    /* Round width once; derive height — use pixel min (~6px), not 1% hard floor. */
    var rw = Math.min(100, Math.round(nw * 10) / 10);
    var rh = Math.min(100, Math.round(rw * ratio * 10) / 10);
    var floorH = kind === 'SHAPE_LINE' ? 0.5 : minPct.h;
    if (rw < minPct.w) rw = Math.round(minPct.w * 10) / 10;
    rh = Math.min(100, Math.round(rw * ratio * 10) / 10);
    if (rh < floorH) rh = Math.round(floorH * 10) / 10;
    return { w: rw, h: rh, coupled: true };
  }

  function overlayGroupScaleFloor(snap, sx, sy, layerW, layerH, minPx) {
    minPx = Math.max(3, Number(minPx) || OVERLAY_MEMBER_MIN_PX);
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var minPctW = (minPx / layerW) * 100;
    var minPctH = (minPx / layerH) * 100;
    var stretchMin = 0.06;
    var floorSx = 0;
    var floorSy = 0;
    var snapKeys = Object.keys(snap || {});
    snapKeys.forEach(function (id) {
      var s = snap[id];
      if (!s) return;
      var kind = String(s.type || 'BUTTON').toUpperCase();
      var isLine = kind === 'SHAPE_LINE';
      var mw = Math.max(1e-6, Number(s.w) || 0.5);
      var mh = Math.max(1e-6, Number(s.h) || 0.5);
      floorSx = Math.max(floorSx, minPctW / mw);
      /* Line gizmo height is stroke-thin — must not inflate group floorSy / keepRatio. */
      if (!isLine) floorSy = Math.max(floorSy, minPctH / mh);
      var stx = s.stretchX != null ? Math.abs(Number(s.stretchX)) : 1;
      var sty = s.stretchY != null ? Math.abs(Number(s.stretchY)) : 1;
      if (stx > 1e-6) floorSx = Math.max(floorSx, stretchMin / stx);
      if (!isLine && sty > 1e-6) floorSy = Math.max(floorSy, stretchMin / sty);
    });
    var csx = Number(sx);
    var csy = Number(sy);
    if (!isFinite(csx)) csx = 1;
    if (!isFinite(csy)) csy = 1;
    var signX = csx < 0 ? -1 : 1;
    var signY = csy < 0 ? -1 : 1;
    var outSx = signX * Math.max(Math.abs(csx), floorSx);
    var outSy = signY * Math.max(Math.abs(csy), floorSy);
    if (typeof window !== 'undefined') {
      try {
        var q = new URLSearchParams(window.location.search);
        if (q.get('multiScaleDebug') === '1' || q.get('shapeDebug') === '1' || q.get('shapeTrace') === '1') {
          console.log(
            '%c[MULTI-SCALE] engine.overlayGroupScaleFloor',
            'color:#7af;font-weight:bold;font-size:12px',
            {
              sxIn: +csx.toFixed(6),
              syIn: +csy.toFixed(6),
              sxOut: +outSx.toFixed(6),
              syOut: +outSy.toFixed(6),
              floorSx: +floorSx.toFixed(6),
              floorSy: +floorSy.toFixed(6),
              snapMembers: snapKeys.length,
              minPx: minPx
            }
          );
        }
      } catch (eTr) { /* ignore */ }
    }
    return { sx: outSx, sy: outSy, floorSx: floorSx, floorSy: floorSy };
  }

  function overlayGroupOuterFromScale(anchorX, anchorY, startCx, startCy, startW, startH, sx, sy) {
    sx = Number(sx) || 1;
    sy = Number(sy) || 1;
    startW = Number(startW) || 20;
    startH = Number(startH) || 20;
    return {
      cx: Number(anchorX) + ((Number(startCx) || 50) - Number(anchorX)) * sx,
      cy: Number(anchorY) + ((Number(startCy) || 50) - Number(anchorY)) * sy,
      w: startW * sx,
      h: startH * sy
    };
  }

  /** Proportional world-space scale for one grouped member (matches multi-select contract). */
  function applyOverlayMemberWorldScale(n, g, child, sw, sx, sy, ax, ay, layerW, layerH, opts) {
    opts = opts || {};
    if (!g || !child || !sw) return;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    var ncx = ax + ((Number(sw.cx) || 0) - ax) * sx;
    var ncy = ay + ((Number(sw.cy) || 0) - ay) * sy;
    var sized = overlayMemberScaledSize(sw, sx, sy, layerW, layerH);
    var nw = sized.w;
    var nh = sized.h;
    var rot = sw.rotation;
    var ct = String(sw.type || child.type || 'BUTTON').toUpperCase();
    child.groupId = g.id;

    if (ct === 'TEXT') {
      var locText = worldPointToLocal(g, ncx, ncy, layerW, layerH);
      child.localX = locText.x;
      child.localY = locText.y;
      child.localRotation = (Number(rot) || 0) - (Number(g.rotation) || 0);
      var fs0 = sw.fontSize != null ? Number(sw.fontSize) : (Number(child.fontSize) || 28);
      var fsScale = Math.max(Math.abs(sx), Math.abs(sy));
      child.fontSize = Math.max(8, Math.round(fs0 * fsScale));
      return;
    }

    if (isSceneShapeType(ct)) {
      var st = shapeStretchFromIx(child);
      var snapSx = sw.stretchX != null ? Number(sw.stretchX) : st.sx;
      var snapSy = sw.stretchY != null ? Number(sw.stretchY) : st.sy;
      var locBox = worldPointToLocal(g, ncx, ncy, layerW, layerH);
      child.localX = locBox.x;
      child.localY = locBox.y;
      child.localRotation = (Number(rot) || 0) - (Number(g.rotation) || 0);
      if (opts.commit) {
        var coupledG = overlayMemberCoupledCommitDims(nw, nh, sw.w, sw.h, ct, layerW, layerH);
        child.width = coupledG.w;
        child.height = coupledG.h;
      } else {
        child.width = nw;
        child.height = nh;
      }
      child.shapeContentBox = true;
      child.shapeStretchX = snapSx;
      child.shapeStretchY = snapSy;
      return;
    }

    var loc = worldPointToLocal(g, ncx, ncy, layerW, layerH);
    child.localX = loc.x;
    child.localY = loc.y;
    child.localRotation = (Number(rot) || 0) - (Number(g.rotation) || 0);
    if (ct === 'BUTTON') {
      child.boxW = nw;
      child.boxH = nh;
    }
  }

  function updateOverlayGroupTransform(state, nodeId, groupId, patch) {
    var n = getNode(state, nodeId);
    var g = getInteraction(n, groupId);
    if (!n || !g || !isOverlayGroupInteraction(g)) return null;
    patch = patch || {};
    var layerW = patch.layerW || 1000;
    var layerH = patch.layerH || 1000;
    var __gmEntry = compareRotateGroupModelTraceEnabled() ? snapshotGroupModelTrace(g) : null;
    ensureOverlayGroupDefaults(n, g, layerW, layerH, {
      skipSync: !!patch.live ||
        (!!patch.memberWorldSnapshots && patch.anchorX != null && patch.anchorY != null)
    });
    traceLiveGroupSizeStep(
      g, groupId, __gmEntry,
      'updateOverlayGroupTransform', '2207',
      'after ensureOverlayGroupDefaults(skipSync=' + (!!patch.live ||
        (!!patch.memberWorldSnapshots && patch.anchorX != null && patch.anchorY != null)) + ')',
      { patchKeys: Object.keys(patch), live: !!patch.live }
    );
    var __gmAfterEnsure = snapshotGroupModelTrace(g);
    migrateGroupedChildLocals(n, g, layerW, layerH);
    traceLiveGroupSizeStep(
      g, groupId, __gmAfterEnsure,
      'updateOverlayGroupTransform', '2216',
      'after migrateGroupedChildLocals',
      { patchKeys: Object.keys(patch), live: !!patch.live }
    );

    if (patch.x != null || patch.y != null) {
      var __gmBeforeXY = snapshotGroupModelTrace(g);
      var lockedWorldSnaps = null;
      resolveOverlayGroupMemberIds(n, g, { repair: true }).forEach(function (mid) {
        var c = getInteraction(n, mid);
        if (!c || !overlayInteractionSelfLocked(c)) return;
        if (!lockedWorldSnaps) lockedWorldSnaps = {};
        var world = composeOverlayWorldLayout(g, c, layerW, layerH, n);
        if (world) {
          lockedWorldSnaps[String(mid)] = { x: world.x, y: world.y };
        }
      });
      if (patch.x != null) {
        var nx = Number(patch.x);
        if (!isNaN(nx)) g.x = patch.live ? Math.max(-20, Math.min(120, nx)) : clampPercent(nx, g.x);
      }
      if (patch.y != null) {
        var ny = Number(patch.y);
        if (!isNaN(ny)) g.y = patch.live ? Math.max(-20, Math.min(120, ny)) : clampPercent(ny, g.y);
      }
      if (lockedWorldSnaps) {
        Object.keys(lockedWorldSnaps).forEach(function (mid) {
          var c = getInteraction(n, mid);
          var snap = lockedWorldSnaps[mid];
          if (!c || !snap) return;
          var inv = worldPointToLocal(g, snap.x, snap.y, layerW, layerH);
          c.localX = inv.x;
          c.localY = inv.y;
        });
      }
      traceGroupModelIfChanged(
        g, groupId, __gmBeforeXY,
        'updateOverlayGroupTransform', '2223-2230',
        'patch.x/y → g.x/y',
        { patchX: patch.x, patchY: patch.y, live: !!patch.live }
      );
    }
    if (patch.rotation != null) {
      var __gmBeforeRot = snapshotGroupModelTrace(g);
      g.rotation = clampRotation(patch.rotation);
      traceGroupModelIfChanged(
        g, groupId, __gmBeforeRot,
        'updateOverlayGroupTransform', '2233',
        'patch.rotation → g.rotation',
        { rotation: Number(g.rotation) || 0, live: !!patch.live }
      );
    }

    if (patch.width != null || patch.height != null) {
      var baseW = Number(g._baseWidth) || Number(g.width) || 20;
      var baseH = Number(g._baseHeight) || Number(g.height) || 20;
      var newW = patch.width != null ? Number(patch.width) : baseW;
      var newH = patch.height != null ? Number(patch.height) : baseH;
      if (!isNaN(newW) && !isNaN(newH) && baseW > 0 && baseH > 0) {
        var sx = patch.scaleX != null ? Number(patch.scaleX) : (newW / baseW);
        var sy = patch.scaleY != null ? Number(patch.scaleY) : (newH / baseH);
        if (patch.keepRatio) {
          var uniform = Math.max(Math.abs(sx), Math.abs(sy));
          sx = uniform;
          sy = uniform;
          newW = baseW * sx;
          newH = baseH * sy;
        }
        var __gmBeforePatch = snapshotGroupModelTrace(g);
        g.width = newW;
        g.height = newH;
        traceGroupModelIfChanged(
          g, groupId, __gmBeforePatch,
          'updateOverlayGroupTransform', '2258-2259',
          'patch.width/height scale → g.width/height',
          { newW: newW, newH: newH, sx: sx, sy: sy, live: !!patch.live }
        );
        var worldSnap = patch.memberWorldSnapshots;
        var useWorldScale = worldSnap && typeof worldSnap === 'object' &&
          patch.anchorX != null && patch.anchorY != null;
        if (useWorldScale) {
          var ax = Number(patch.anchorX);
          var ay = Number(patch.anchorY);
          var floored = overlayGroupScaleFloor(worldSnap, sx, sy, layerW, layerH);
          sx = floored.sx;
          sy = floored.sy;
          if (patch.keepRatio) {
            var uniF = Math.max(Math.abs(sx), Math.abs(sy));
            sx = uniF;
            sy = uniF;
          }
          newW = baseW * sx;
          newH = baseH * sy;
          var __gmBeforeWorld = snapshotGroupModelTrace(g);
          g.width = newW;
          g.height = newH;
          traceGroupModelIfChanged(
            g, groupId, __gmBeforeWorld,
            'updateOverlayGroupTransform', '2283-2284',
            'memberWorldSnapshots scale floor → g.width/height',
            { newW: newW, newH: newH, sx: sx, sy: sy, live: !!patch.live }
          );
          resolveOverlayGroupMemberIds(n, g, { repair: true }).forEach(function (mid) {
            var c = getInteraction(n, mid);
            var sw = worldSnap[String(mid)];
            if (!c || !sw || !isSceneFreeOverlayInteraction(c)) return;
            applyOverlayMemberWorldScale(
              n, g, c, sw, sx, sy, ax, ay, layerW, layerH,
              { commit: !patch.live }
            );
          });
        } else {
          var snap = patch.memberSnapshots;
          (g.memberIds || []).forEach(function (mid) {
            var c = getInteraction(n, mid);
            if (!c || !isSceneFreeOverlayInteraction(c)) return;
            var s = snap && snap[mid] ? snap[mid] : null;
            if (s) {
              c.localX = Number(s.localX) * sx;
              c.localY = Number(s.localY) * sy;
              var ct = String(c.type || '').toUpperCase();
              if (ct === 'BUTTON') {
                if (s.boxW != null) c.boxW = Math.max(0.5, Number(s.boxW) * sx);
                if (s.boxH != null) c.boxH = Math.max(0.5, Number(s.boxH) * sy);
              } else if (isSceneShapeType(ct)) {
                if (s.width != null) c.width = Math.max(0.5, Number(s.width) * sx);
                if (s.height != null) c.height = Math.max(0.5, Number(s.height) * sy);
              }
            } else {
              if (c.localX != null) c.localX = Number(c.localX) * sx;
              if (c.localY != null) c.localY = Number(c.localY) * sy;
            }
          });
        }
      }
    }
    if (patch.syncBounds) {
      var __gmBeforeSyncBounds = snapshotGroupModelTrace(g);
      syncOverlayGroupFrameFromMembers(n, g, layerW, layerH);
      traceGroupModelIfChanged(
        g, groupId, __gmBeforeSyncBounds,
        'updateOverlayGroupTransform', '2336',
        'patch.syncBounds → syncOverlayGroupFrameFromMembers',
        { live: !!patch.live }
      );
    }
    if (__gmEntry) {
      traceGroupModelIfChanged(
        g, groupId, __gmEntry,
        'updateOverlayGroupTransform', 'return',
        'updateOverlayGroupTransform exit',
        { patchKeys: Object.keys(patch), live: !!patch.live }
      );
    }
    return overlayGroupViewModel(state, n, g, layerW, layerH);
  }

  function commitOverlayGroupBounds(n, g, layerW, layerH) {
    if (!n || !g) return g;
    var __gmEnter = compareRotateGroupModelTraceEnabled() ? snapshotGroupModelTrace(g) : null;
    if (Number(g._transformV) >= 2) {
      g._baseWidth = Number(g.width) || g._baseWidth;
      g._baseHeight = Number(g.height) || g._baseHeight;
      if (__gmEnter) {
        traceGroupModelIfChanged(
          g, g.id, __gmEnter,
          'commitOverlayGroupBounds', '2350',
          'commitOverlayGroupBounds early exit (_transformV>=2, baseWidth/Height only)',
          { _transformV: Number(g._transformV) || 0 }
        );
      }
      return g;
    }
    syncOverlayGroupFrameFromMembers(n, g, layerW, layerH);
    g._baseWidth = Number(g.width) || g._baseWidth;
    g._baseHeight = Number(g.height) || g._baseHeight;
    if (__gmEnter) {
      traceGroupModelIfChanged(
        g, g.id, __gmEnter,
        'commitOverlayGroupBounds', 'exit',
        'commitOverlayGroupBounds → syncOverlayGroupFrameFromMembers',
        { _transformV: Number(g._transformV) || 0 }
      );
    }
    return g;
  }

  /** Resolve group for a member — uses ix.groupId or memberIds[] fallback + repairs orphan refs. */
  function findOverlayGroupForMember(n, memberId) {
    if (!n || !memberId) return null;
    var mid = String(memberId);
    var ix = getInteraction(n, mid);
    if (ix && ix.groupId) {
      var linked = getInteraction(n, ix.groupId);
      if (linked && isOverlayGroupInteraction(linked)) return linked;
    }
    var groups = listOverlayGroupInteractions(n);
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (!g || !Array.isArray(g.memberIds)) continue;
      var inGroup = g.memberIds.some(function (rawId) {
        if (String(rawId) === mid) return true;
        var member = getInteraction(n, rawId);
        return !!(member && String(member.portId || '') === mid);
      });
      if (!inGroup) continue;
      if (ix && !ix.groupId) ix.groupId = g.id;
      return g;
    }
    return null;
  }

  /** Grow group frame only when composed members exceed the current axis-aligned box. */
  function expandOverlayGroupBoundsIfMemberOverflow(n, g, layerW, layerH, opts) {
    opts = opts || {};
    if (!n || !g || !isOverlayGroupInteraction(g)) return g;
    if (Number(g._transformV) >= 2) return g;
    var __gmEnter = compareRotateGroupModelTraceEnabled() ? snapshotGroupModelTrace(g) : null;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    ensureOverlayGroupDefaults(n, g, layerW, layerH, { skipSync: true });
    var memberIds = resolveOverlayGroupMemberIds(n, g, { repair: true });
    if (!memberIds.length) return g;
    var union = computeOverlayUnionBounds(n, memberIds, layerW, layerH, { useComposed: true });
    if (!union) return g;
    var gx = Number(g.x) || 50;
    var gy = Number(g.y) || 50;
    var gw = Number(g.width) || 20;
    var gh = Number(g.height) || 20;
    var gL = gx - gw / 2;
    var gR = gx + gw / 2;
    var gT = gy - gh / 2;
    var gB = gy + gh / 2;
    var uL = union.cx - union.w / 2;
    var uR = union.cx + union.w / 2;
    var uT = union.cy - union.h / 2;
    var uB = union.cy + union.h / 2;
    var eps = 0.08;
    if (uL >= gL - eps && uR <= gR + eps && uT >= gT - eps && uB <= gB + eps) {
      return g;
    }
    if (opts.keepPivot) {
      var halfW = Math.max(gw / 2, gx - uL, uR - gx);
      var halfH = Math.max(gh / 2, gy - uT, uB - gy);
      var __gmExpand = snapshotGroupModelTrace(g);
      g.width = Math.max(0.5, halfW * 2);
      g.height = Math.max(0.5, halfH * 2);
      traceGroupModelIfChanged(
        g, g.id, __gmExpand,
        'expandOverlayGroupBoundsIfMemberOverflow', '2410-2411',
        'keepPivot overflow expand → g.width/height',
        { union: union, keepPivot: true }
      );
      if (__gmEnter) {
        traceGroupModelIfChanged(
          g, g.id, __gmEnter,
          'expandOverlayGroupBoundsIfMemberOverflow', 'exit',
          'expandOverlayGroupBoundsIfMemberOverflow exit (keepPivot)',
          { keepPivot: true }
        );
      }
      return g;
    }
    var __gmBeforeSync = snapshotGroupModelTrace(g);
    syncOverlayGroupFrameFromMembers(n, g, layerW, layerH);
    traceGroupModelIfChanged(
      g, g.id, __gmBeforeSync,
      'expandOverlayGroupBoundsIfMemberOverflow', '2420',
      'overflow → syncOverlayGroupFrameFromMembers',
      { union: union }
    );
    if (__gmEnter) {
      traceGroupModelIfChanged(
        g, g.id, __gmEnter,
        'expandOverlayGroupBoundsIfMemberOverflow', 'exit',
        'expandOverlayGroupBoundsIfMemberOverflow exit (sync)',
        null
      );
    }
    return g;
  }

  function snapshotOverlayGroupLocals(n, g) {
    var out = {};
    if (!n || !g || !Array.isArray(g.memberIds)) return out;
    g.memberIds.forEach(function (id) {
      var c = getInteraction(n, id);
      if (!c) return;
      out[String(id)] = {
        localX: c.localX,
        localY: c.localY,
        localRotation: c.localRotation,
        boxW: c.boxW,
        boxH: c.boxH,
        width: c.width,
        height: c.height
      };
    });
    return out;
  }

  /** Visible world metrics per member — used for proportional group resize. */
  function snapshotOverlayGroupMemberWorlds(n, g, layerW, layerH) {
    var out = {};
    if (!n || !g) return out;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    resolveOverlayGroupMemberIds(n, g, { repair: true }).forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      var world = overlayWorldLayoutRaw(n, ix, layerW, layerH);
      if (!world) return;
      var rect = overlayMemberUnionRect(ix, world, layerW, layerH);
      if (!rect) {
        rect = {
          cx: world.x,
          cy: world.y,
          w: Math.max(0.5, Number(world.width || world.boxW) || 0.5),
          h: Math.max(0.5, Number(world.height || world.boxH) || 0.5),
          rotation: world.rotation
        };
      }
      var t = String(ix.type || 'BUTTON').toUpperCase();
      var st = shapeStretchFromIx(ix);
      out[String(id)] = {
        cx: rect.cx,
        cy: rect.cy,
        w: rect.w,
        h: rect.h,
        rotation: rect.rotation,
        type: t,
        fontSize: ix.fontSize,
        shapeContentBox: !!ix.shapeContentBox,
        stretchX: st.sx,
        stretchY: st.sy
      };
    });
    return out;
  }

  /** World metrics for multi-select scale (no formal group). */
  function snapshotOverlaySelectionWorlds(n, memberIds, layerW, layerH) {
    var out = {};
    if (!n || !memberIds || !memberIds.length) return out;
    layerW = Math.max(1, Number(layerW) || 1000);
    layerH = Math.max(1, Number(layerH) || 1000);
    memberIds.forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      var world = overlayWorldLayoutRaw(n, ix, layerW, layerH);
      if (!world) return;
      var rect = overlayMemberUnionRect(ix, world, layerW, layerH);
      if (!rect) return;
      var t = String(ix.type || 'BUTTON').toUpperCase();
      out[String(id)] = {
        cx: rect.cx,
        cy: rect.cy,
        w: rect.w,
        h: rect.h,
        rotation: rect.rotation,
        type: t,
        fontSize: ix.fontSize
      };
    });
    return out;
  }

  /** Proportional scale for multi-selected overlays (Genially-style, no group entity). */
  function scaleOverlaySelectionTransform(state, nodeId, memberIds, patch) {
    var n = getNode(state, nodeId);
    if (!n || !memberIds || !memberIds.length) return null;
    patch = patch || {};
    var layerW = Math.max(1, Number(patch.layerW) || 1000);
    var layerH = Math.max(1, Number(patch.layerH) || 1000);
    var baseW = Number(patch.baseWidth) || 20;
    var baseH = Number(patch.baseHeight) || 20;
    var newW = patch.width != null ? Number(patch.width) : baseW;
    var newH = patch.height != null ? Number(patch.height) : baseH;
    if (isNaN(newW) || isNaN(newH) || baseW <= 0 || baseH <= 0) return null;
    var sx = newW / baseW;
    var sy = newH / baseH;
    if (patch.keepRatio) {
      var uniform = Math.max(Math.abs(sx), Math.abs(sy));
      sx = uniform;
      sy = uniform;
    }
    var ax = Number(patch.anchorX);
    var ay = Number(patch.anchorY);
    var worldSnap = patch.memberWorldSnapshots;
    if (!worldSnap || typeof worldSnap !== 'object' || isNaN(ax) || isNaN(ay)) return null;
    memberIds.forEach(function (mid) {
      var ix = getInteraction(n, mid);
      var sw = worldSnap[String(mid)];
      if (!ix || !sw || !isSceneFreeOverlayInteraction(ix)) return;
      var ncx = ax + ((Number(sw.cx) || 0) - ax) * sx;
      var ncy = ay + ((Number(sw.cy) || 0) - ay) * sy;
      var sized = overlayMemberScaledSize(sw, sx, sy, layerW, layerH);
      var nwM = sized.w;
      var nhM = sized.h;
      var t = String(sw.type || ix.type || 'BUTTON').toUpperCase();
      var memberPatch = {
        x: ncx,
        y: ncy,
        live: !!patch.live,
        layerW: layerW,
        layerH: layerH
      };
      if (sw.rotation != null) memberPatch.rotation = sw.rotation;
      if (t === 'BUTTON') {
        memberPatch.boxW = nwM;
        memberPatch.boxH = nhM;
      } else if (isSceneShapeType(t)) {
        var coupledM = overlayMemberCoupledCommitDims(nwM, nhM, sw.w, sw.h, t, layerW, layerH);
        memberPatch.x = ncx;
        memberPatch.y = ncy;
        memberPatch.width = coupledM.w;
        memberPatch.height = coupledM.h;
        if (coupledM.coupled) memberPatch.shapeCoupledCommit = true;
        memberPatch.shapeContentBox = true;
        if (sw.stretchX != null) memberPatch.shapeStretchX = sw.stretchX;
        if (sw.stretchY != null) memberPatch.shapeStretchY = sw.stretchY;
      } else if (t === 'TEXT') {
        var fs0 = sw.fontSize != null ? Number(sw.fontSize) : (Number(ix.fontSize) || 28);
        var fsScale = patch.keepRatio ? sx : Math.max(Math.abs(sx), Math.abs(sy));
        memberPatch.fontSize = Math.max(8, Math.round(fs0 * fsScale));
      }
      updateSceneButton(state, nodeId, mid, memberPatch);
    });
    return { sx: sx, sy: sy };
  }

  function listOverlayGroupInteractions(n) {
    if (!n || !n.config || !Array.isArray(n.config.interactions)) return [];
    return n.config.interactions.filter(isOverlayGroupInteraction);
  }

  function findOverlayGroupByMembers(n, memberIds) {
    if (!n || !memberIds || memberIds.length < 2) return null;
    var want = {};
    memberIds.forEach(function (id) { want[String(id)] = true; });
    var groups = listOverlayGroupInteractions(n);
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var mids = Array.isArray(g.memberIds) ? g.memberIds.map(String) : [];
      if (mids.length !== memberIds.length) continue;
      var ok = mids.every(function (id) { return want[id]; });
      if (ok) return g;
    }
    return null;
  }

  function resolveOverlayGroupForSelection(n, selectedIds) {
    if (!n || !selectedIds || !selectedIds.length) return null;
    selectedIds = selectedIds.map(String).filter(Boolean);
    if (selectedIds.length === 1) {
      var one = getInteraction(n, selectedIds[0]);
      if (one && isOverlayGroupInteraction(one)) return one;
      return null;
    }
    var byMembers = findOverlayGroupByMembers(n, selectedIds);
    if (byMembers) return byMembers;
    var groupId = null;
    selectedIds.forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !ix.groupId) return;
      if (!groupId) groupId = String(ix.groupId);
      else if (String(ix.groupId) !== groupId) groupId = '__mixed__';
    });
    if (!groupId || groupId === '__mixed__') return null;
    var g = getInteraction(n, groupId);
    return (g && isOverlayGroupInteraction(g)) ? g : null;
  }

  function detachOverlayFromGroups(n, memberId, layerW, layerH) {
    if (!n || !n.config || !memberId) return;
    var mid = String(memberId);
    var lw = layerW || 1000;
    var lh = layerH || 1000;
    listOverlayGroupInteractions(n).forEach(function (g) {
      if (!g || !Array.isArray(g.memberIds)) return;
      var idx = g.memberIds.map(String).indexOf(mid);
      if (idx < 0) return;
      ensureOverlayGroupDefaults(n, g, lw, lh);
      migrateGroupedChildLocals(n, g, lw, lh);
      var ix = getInteraction(n, mid);
      if (ix) bakeOverlayWorldToChild(n, g, ix, lw, lh);
      g.memberIds.splice(idx, 1);
      if (g.memberIds.length < 2) {
        g.memberIds.forEach(function (rid) {
          var rx = getInteraction(n, rid);
          if (rx) bakeOverlayWorldToChild(n, g, rx, lw, lh);
        });
        n.config.interactions = n.config.interactions.filter(function (item) {
          return String(item.id) !== String(g.id);
        });
      }
    });
  }

  function pruneOverlayGroupsAfterDelete(n, deletedIds) {
    if (!n || !n.config || !deletedIds || !deletedIds.length) return;
    var deleted = {};
    deletedIds.forEach(function (id) { deleted[String(id)] = true; });
    listOverlayGroupInteractions(n).slice().forEach(function (g) {
      if (!g) return;
      if (deleted[String(g.id)]) {
        ensureOverlayGroupDefaults(n, g, 1000, 1000);
        migrateGroupedChildLocals(n, g, 1000, 1000);
        (g.memberIds || []).forEach(function (mid) {
          var ix = getInteraction(n, mid);
          if (ix) bakeOverlayWorldToChild(n, g, ix, 1000, 1000);
        });
        n.config.interactions = n.config.interactions.filter(function (item) {
          return String(item.id) !== String(g.id);
        });
        return;
      }
      var mids = (g.memberIds || []).map(String).filter(function (id) {
        return !deleted[id];
      });
      if (mids.length < 2) {
        ensureOverlayGroupDefaults(n, g, 1000, 1000);
        migrateGroupedChildLocals(n, g, 1000, 1000);
        mids.forEach(function (id) {
          var ix = getInteraction(n, id);
          if (ix) bakeOverlayWorldToChild(n, g, ix, 1000, 1000);
        });
        n.config.interactions = n.config.interactions.filter(function (item) {
          return String(item.id) !== String(g.id);
        });
      } else {
        g.memberIds = mids;
      }
    });
  }

  function groupSceneOverlays(state, nodeId, memberIds, layerW, layerH, opts) {
    opts = opts || {};
    memberIds = (memberIds || []).map(String).filter(Boolean);
    if (memberIds.length < 2) return null;
    var n = getNode(state, nodeId);
    if (!n || !n.config) return null;
    if (!Array.isArray(n.config.interactions)) n.config.interactions = [];
    var lw = layerW || 1000;
    var lh = layerH || 1000;
    var unique = [];
    memberIds.forEach(function (id) {
      if (unique.indexOf(id) >= 0) return;
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return;
      detachOverlayFromGroups(n, id);
      unique.push(id);
    });
    if (unique.length < 2) return null;
    var existing = findOverlayGroupByMembers(n, unique);
    if (existing) {
      var __gmExisting = compareRotateGroupModelTraceEnabled()
        ? snapshotGroupModelTrace(existing)
        : null;
      ensureOverlayGroupDefaults(n, existing, lw, lh);
      migrateGroupedChildLocals(n, existing, lw, lh);
      if (__gmExisting) {
        traceGroupModelIfChanged(
          existing, existing.id, __gmExisting,
          'groupSceneOverlays', 'existing',
          'reuse existing group → ensureOverlayGroupDefaults + migrateGroupedChildLocals',
          null
        );
      }
      return existing;
    }
    var bounds = computeOverlayUnionBounds(n, unique, lw, lh);
    if (!bounds) return null;
    var seedFrame = opts.seedFrame;
    var frameCx = bounds.cx;
    var frameCy = bounds.cy;
    var frameW = bounds.w;
    var frameH = bounds.h;
    var frameRot = 0;
    if (seedFrame && Number(seedFrame.w) > 0 && Number(seedFrame.h) > 0) {
      frameCx = Number(seedFrame.cx);
      if (isNaN(frameCx)) frameCx = bounds.cx;
      frameCy = Number(seedFrame.cy);
      if (isNaN(frameCy)) frameCy = bounds.cy;
      frameW = Number(seedFrame.w);
      if (isNaN(frameW) || frameW <= 0) frameW = bounds.w;
      frameH = Number(seedFrame.h);
      if (isNaN(frameH) || frameH <= 0) frameH = bounds.h;
      frameRot = Number(seedFrame.rot) || 0;
    }
    var groupId = uid('grp');
    var group = makeInteraction({
      type: 'OVERLAY_GROUP',
      id: groupId,
      portId: groupId,
      label: 'Grupo',
      memberIds: unique.slice(),
      x: frameCx,
      y: frameCy,
      width: frameW,
      height: frameH,
      rotation: frameRot,
      _baseWidth: frameW,
      _baseHeight: frameH,
      enabled: true
    });
    n.config.interactions.push(group);
    group._transformV = 2;
    traceGroupModelReplace({
      groupId: groupId,
      before: null,
      after: snapshotGroupModelTrace(group),
      sourceFile: 'experiencia-engine.js',
      sourceFunction: 'groupSceneOverlays',
      sourceLine: '2735',
      why: 'makeInteraction new OVERLAY_GROUP object created',
      kind: 'objectCreated',
      extra: { memberIds: unique.slice(), frame: { cx: frameCx, cy: frameCy, w: frameW, h: frameH, rot: frameRot } }
    });
    unique.forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix) return;
      var local = absoluteToLocalOverlay(n, group, ix, lw, lh);
      if (local) {
        ix.localX = local.localX;
        ix.localY = local.localY;
        ix.localRotation = local.localRotation;
      }
      ix.groupId = groupId;
    });
    return group;
  }

  /** Empty overlay group for panel "+ Crear grupo" (no members). */
  function createEmptyOverlayGroup(state, nodeId) {
    var n = getNode(state, nodeId);
    if (!n || !n.config) return null;
    if (!Array.isArray(n.config.interactions)) n.config.interactions = [];
    var max = 0;
    n.config.interactions.forEach(function (ix) {
      if (!isOverlayGroupInteraction(ix)) return;
      var m = String(ix.label || '').match(/Grupo\s+(\d+)/i);
      if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
    });
    var groupId = uid('grp');
    var group = makeInteraction({
      type: 'OVERLAY_GROUP',
      id: groupId,
      portId: groupId,
      label: 'Grupo ' + (max + 1),
      memberIds: [],
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      rotation: 0,
      _baseWidth: 20,
      _baseHeight: 20,
      enabled: true
    });
    group._transformV = 2;
    var lastGroupIdx = -1;
    var gi;
    for (gi = 0; gi < n.config.interactions.length; gi++) {
      if (isOverlayGroupInteraction(n.config.interactions[gi])) {
        lastGroupIdx = gi;
      }
    }
    if (lastGroupIdx >= 0) {
      n.config.interactions.splice(lastGroupIdx + 1, 0, group);
    } else {
      n.config.interactions.unshift(group);
    }
    return group;
  }

  function ungroupSceneOverlay(state, nodeId, groupId, layerW, layerH) {
    var n = getNode(state, nodeId);
    if (!n || !groupId) return false;
    var g = getInteraction(n, groupId);
    if (!g || !isOverlayGroupInteraction(g)) return false;
    var lw = layerW || 1000;
    var lh = layerH || 1000;
    ensureOverlayGroupDefaults(n, g, lw, lh);
    migrateGroupedChildLocals(n, g, lw, lh);
    (g.memberIds || []).forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix) return;
      bakeOverlayWorldToChild(n, g, ix, lw, lh);
    });
    n.config.interactions = (n.config.interactions || []).filter(function (item) {
      return String(item.id) !== String(groupId);
    });
    return true;
  }

  function snapshotOverlayInteractions(state, nodeId, memberIds) {
    var n = getNode(state, nodeId);
    if (!n || !memberIds || !memberIds.length) return [];
    return memberIds.map(String).filter(Boolean).map(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneFreeOverlayInteraction(ix)) return null;
      try {
        var copy = JSON.parse(JSON.stringify(ix));
        delete copy.groupId;
        return copy;
      } catch (eSnap) {
        return null;
      }
    }).filter(Boolean);
  }

  function ensureFreeOverlayDefaults(ix) {
    if (!ix || !isSceneFreeOverlayInteraction(ix)) return ix;
    var t = String(ix.type || '').toUpperCase();
    if (t === 'BUTTON') return ensureButtonVisualDefaults(ix);
    if (!ix.config || typeof ix.config !== 'object') ix.config = {};
    if (ix.x == null) ix.x = 50;
    if (ix.y == null) ix.y = 50;
    if (ix.positionMode !== 'anchor') ix.positionMode = 'free';
    if (ix.positionInitialized == null) ix.positionInitialized = true;
    if (ix.rotation == null || isNaN(Number(ix.rotation))) ix.rotation = 0;
    if (t === 'TEXT') {
      if (ix.label == null || ix.label === '') ix.label = 'Texto';
      if (ix.fontSize == null) ix.fontSize = 28;
      ix.fontSizeUnit = 'px';
      ix.fontSize = Math.max(8, Math.min(200, Number(ix.fontSize) || 28));
      if (ix.color == null) ix.color = '#ffffff';
      if (ix.fontFamily == null) ix.fontFamily = 'system-ui, sans-serif';
      else ix.fontFamily = String(ix.fontFamily).replace(/"/g, '');
      if (ix.fontWeight == null) ix.fontWeight = '400';
      if (ix.fontStyle == null) ix.fontStyle = 'normal';
      if (ix.textDecoration == null) ix.textDecoration = 'none';
      if (ix.textAlign == null) ix.textAlign = 'center';
      if (ix.lineHeight == null) ix.lineHeight = 1.3;
      if (ix.letterSpacing == null) ix.letterSpacing = 0;
      if (ix.textTransform == null) ix.textTransform = 'none';
      if (ix.textShadow == null) ix.textShadow = 'none';
      if (ix.opacity == null || isNaN(Number(ix.opacity))) ix.opacity = 1;
      else ix.opacity = Math.max(0, Math.min(1, Number(ix.opacity)));
      if (ix.locked == null) ix.locked = false;
      else ix.locked = !!ix.locked;
    }
    if (isSceneShapeType(t)) {
      var shapeSize = sceneShapeDefaultSize(t);
      if (ix.label == null) ix.label = sceneShapeDefaultLabel(t);
      if (ix.width == null) ix.width = shapeSize.w;
      if (!ix.shapeContentBox) ix.height = null;
      if (ix.fill == null) ix.fill = t === 'SHAPE_LINE' ? 'none' : 'rgba(255,255,255,0.16)';
      if (ix.stroke == null) ix.stroke = 'rgba(255,255,255,0.62)';
      if (ix.strokeWidth == null) ix.strokeWidth = 2;
      if (ix.borderRadius == null) {
        if (t === 'SHAPE_CIRCLE') ix.borderRadius = 999;
        else if (t === 'SHAPE_ROUND_RECT') ix.borderRadius = 16;
        else ix.borderRadius = 0;
      }
      if (ix.shapeStretchX == null || isNaN(Number(ix.shapeStretchX))) ix.shapeStretchX = 1;
      else ix.shapeStretchX = Math.max(0.06, Math.min(8, Number(ix.shapeStretchX)));
      if (ix.shapeStretchY == null || isNaN(Number(ix.shapeStretchY))) ix.shapeStretchY = 1;
      else ix.shapeStretchY = Math.max(0.06, Math.min(8, Number(ix.shapeStretchY)));
      if (ix.locked == null) ix.locked = false;
      else ix.locked = !!ix.locked;
    }
    return ix;
  }

  function clampPercent(v, fallback) {
    var n = Number(v);
    if (isNaN(n)) n = fallback != null ? fallback : 50;
    return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
  }

  function clampRotation(v) {
    var n = Number(v);
    if (isNaN(n)) n = 0;
    return Math.max(-360, Math.min(360, Math.round(n * 10) / 10));
  }

  function ensureButtonVisualDefaults(ix) {
    if (!ix || !isSceneButtonInteraction(ix)) return ix;
    if (!ix.config || typeof ix.config !== 'object') ix.config = {};
    var cfg = ix.config;
    /* Promote legacy layout fields from config */
    if (ix.x == null && cfg.x != null) ix.x = cfg.x;
    if (ix.y == null && cfg.y != null) ix.y = cfg.y;
    if (ix.style == null && cfg.style != null) ix.style = cfg.style;
    if (ix.rotation == null && cfg.rotation != null) ix.rotation = cfg.rotation;
    if (ix.positionMode == null && cfg.positionMode != null) ix.positionMode = cfg.positionMode;
    if (ix.anchor == null && cfg.anchor != null) ix.anchor = cfg.anchor;
    if (ix.marginX == null && cfg.marginX != null) ix.marginX = cfg.marginX;
    if (ix.marginY == null && cfg.marginY != null) ix.marginY = cfg.marginY;
    if (ix.positionInitialized == null && cfg.positionInitialized != null) {
      ix.positionInitialized = cfg.positionInitialized;
    }

    if (!ix.style || !BUTTON_STYLES[ix.style]) ix.style = 'button';
    /* Local textColor override allowed; strip legacy theme-only color field */
    if (ix.color != null) delete ix.color;
    if (cfg.color != null) delete cfg.color;
    if (ix.rotation == null || isNaN(Number(ix.rotation))) ix.rotation = 0;
    else ix.rotation = clampRotation(ix.rotation);
    if (ix.icon === 'none') ix.icon = null;
    if (ix.icon && !BUTTON_ICONS[ix.icon]) ix.icon = null;
    if (ix.positionMode !== 'anchor') ix.positionMode = 'free';
    if (ix.anchor && !BUTTON_ANCHORS[ix.anchor]) ix.anchor = 'center';
    if (ix.marginX == null || isNaN(Number(ix.marginX))) {
      ix.marginX = ix.positionMode === 'anchor' ? 32 : 0;
    }
    if (ix.marginY == null || isNaN(Number(ix.marginY))) {
      ix.marginY = ix.positionMode === 'anchor' ? 32 : 0;
    }
    /* Legacy scale kept for migration → boxW/boxH */
    if (ix.scaleUnit !== 'px') ix.scaleUnit = '%';
    if (ix.scaleValue == null || isNaN(Number(ix.scaleValue))) {
      if (ix.size === 'sm') ix.scaleValue = 78;
      else if (ix.size === 'lg') ix.scaleValue = 138;
      else ix.scaleValue = ix.scaleUnit === 'px' ? 14 : 100;
    } else {
      ix.scaleValue = Number(ix.scaleValue);
    }
    /* Ola 2.1 — real box size (% of stage). Migrate from scale once. */
    if (ix.boxW == null || isNaN(Number(ix.boxW))) {
      var styleKey = ix.style || 'chip';
      var baseW = styleKey === 'icon' ? 6 : (styleKey === 'button' ? 14 : 12);
      var sv = Number(ix.scaleValue) || 100;
      if (ix.scaleUnit === 'px') {
        ix.boxW = Math.max(2, Math.min(80, Math.round((sv / 14) * baseW * 10) / 10));
      } else {
        ix.boxW = Math.max(2, Math.min(80, Math.round(baseW * (sv / 100) * 10) / 10));
      }
    } else {
      ix.boxW = Math.max(1, Math.min(100, Number(ix.boxW)));
    }
    if (ix.boxH == null || isNaN(Number(ix.boxH))) {
      var styleKeyH = ix.style || 'chip';
      var baseH = styleKeyH === 'icon' ? 6 : 4.5;
      var svH = Number(ix.scaleValue) || 100;
      if (ix.scaleUnit === 'px') {
        ix.boxH = Math.max(1.5, Math.min(60, Math.round((svH / 14) * baseH * 10) / 10));
      } else {
        ix.boxH = Math.max(1.5, Math.min(60, Math.round(baseH * (svH / 100) * 10) / 10));
      }
    } else {
      ix.boxH = Math.max(1, Math.min(100, Number(ix.boxH)));
    }
    if (ix.opacity == null || isNaN(Number(ix.opacity))) ix.opacity = 1;
    else ix.opacity = Math.max(0, Math.min(1, Number(ix.opacity)));
    if (ix.locked == null) ix.locked = false;
    else ix.locked = !!ix.locked;
    /* Appearance overrides: null/undefined = inherit Style Engine tokens */
    if (ix.bgOpacity != null && !isNaN(Number(ix.bgOpacity))) {
      ix.bgOpacity = Math.max(0, Math.min(1, Number(ix.bgOpacity)));
    }
    if (ix.borderWidth != null && !isNaN(Number(ix.borderWidth))) {
      ix.borderWidth = Math.max(0, Math.min(20, Number(ix.borderWidth)));
    }
    if (ix.borderRadius != null && !isNaN(Number(ix.borderRadius))) {
      ix.borderRadius = Math.max(0, Math.min(999, Number(ix.borderRadius)));
    }
    if (ix.hoverEnabled == null) ix.hoverEnabled = true;
    else ix.hoverEnabled = !!ix.hoverEnabled;
    if (ix.hoverColor == null || ix.hoverColor === '') ix.hoverColor = '#6fbf86';
    if (ix.hoverTextColor == null || ix.hoverTextColor === '') ix.hoverTextColor = '#ffffff';
    if (ix.hoverTransition == null || isNaN(Number(ix.hoverTransition))) ix.hoverTransition = 200;
    else ix.hoverTransition = Math.max(0, Math.min(2000, Number(ix.hoverTransition)));
    if (ix.pressedColor == null || ix.pressedColor === '') ix.pressedColor = '#5aaa74';
    if (ix.pressedTextColor == null || ix.pressedTextColor === '') ix.pressedTextColor = '#ffffff';
    if (ix.pressedScale == null || isNaN(Number(ix.pressedScale))) ix.pressedScale = 0.96;
    else ix.pressedScale = Math.max(0.8, Math.min(1.1, Number(ix.pressedScale)));

    /* First-time center only — never re-center after move */
    if (ix.x == null || ix.y == null) {
      if (!ix.positionInitialized) {
        ix.x = 50;
        ix.y = 50;
        ix.positionInitialized = true;
      } else {
        if (ix.x == null) ix.x = 50;
        if (ix.y == null) ix.y = 50;
      }
    } else {
      ix.x = clampPercent(ix.x, 50);
      ix.y = clampPercent(ix.y, 50);
      ix.positionInitialized = true;
    }
    return ix;
  }

  /**
   * One-time migrate of obsolete config.buttons → BUTTON interactions, then drop collection.
   */
  function migrateLegacySceneButtons(state, n) {
    if (!n || !n.config) return;
    if (n.config._buttonsMigrating) return;
    var legacy = n.config.buttons;
    if (Array.isArray(legacy) && legacy.length) {
      n.config._buttonsMigrating = true;
      try {
        normalizeSceneInteractions(n);
        legacy.forEach(function (btn) {
          if (!btn) return;
          var exists = (n.config.interactions || []).some(function (ix) {
            return isSceneButtonInteraction(ix) &&
              (String(ix.id) === String(btn.id) ||
                (ix.label && btn.label && String(ix.label) === String(btn.label)));
          });
          if (exists) return;
          var ix = addInteractionToScene(state, n.id, 'BUTTON', btn.label || 'Botón', {
            group: 'controls'
          });
          if (!ix) return;
          ix.x = btn.x != null ? btn.x : 50;
          ix.y = btn.y != null ? btn.y : 50;
          ix.style = btn.style || 'chip';
          ix.icon = btn.icon || null;
          ix.rotation = 0;
          ix.positionInitialized = true;
          ix.enabled = btn.visible !== false;
          if (btn.targetNodeId && state) {
            setButtonTarget(state, n.id, ix.id, btn.targetNodeId);
          }
          ensureButtonVisualDefaults(ix);
        });
      } finally {
        delete n.config._buttonsMigrating;
      }
    }
    if (n.config.buttons != null) delete n.config.buttons;
    if (n.buttons != null) delete n.buttons;
  }

  function ensureSceneButtons(stateOrNull, n) {
    if (!n) return [];
    if (arguments.length === 1) {
      n = stateOrNull;
      stateOrNull = null;
    }
    if (!n.config) n.config = {};
    if (!Array.isArray(n.config.interactions)) n.config.interactions = [];
    if (stateOrNull) migrateLegacySceneButtons(stateOrNull, n);
    else if (n.config.buttons) {
      /* Without state, just drop orphan collection — interactions win */
      delete n.config.buttons;
      delete n.buttons;
    }
    n.config.interactions.forEach(function (ix) {
      if (isSceneFreeOverlayInteraction(ix)) ensureFreeOverlayDefaults(ix);
      if (isOverlayGroupInteraction(ix)) {
        ensureOverlayGroupDefaults(n, ix, 1000, 1000);
        migrateGroupedChildLocals(n, ix, 1000, 1000);
      }
    });
    return listSceneButtonInteractions(n);
  }

  function listSceneButtonInteractions(n) {
    if (!n || !n.config) return [];
    return (n.config.interactions || []).filter(isSceneFreeOverlayInteraction);
  }

  function resolveButtonTarget(state, sceneId, ix) {
    if (!state || !ix) return null;
    var exp = ensureState(state);
    var portId = ix.portId || ix.id;
    for (var i = 0; i < (exp.edges || []).length; i++) {
      var ed = exp.edges[i];
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId;
      if (String(from) === String(sceneId) && String(pid) === String(portId)) {
        return ed.targetNodeId || ed.to || ed.targetId || null;
      }
    }
    return null;
  }

  function setButtonTarget(state, sceneId, buttonId, targetNodeId) {
    var scene = getNode(state, sceneId);
    var ix = getInteraction(scene, buttonId);
    if (!ix || !isSceneButtonInteraction(ix)) return null;
    var exp = state && state.experiencia ? state.experiencia : ensureState(state);
    if (!Array.isArray(exp.edges)) exp.edges = [];
    var portId = ix.portId || ix.id;
    exp.edges = (exp.edges || []).filter(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId;
      return !(String(from) === String(sceneId) && String(pid) === String(portId));
    });
    if (targetNodeId) {
      addManualEdge(state, sceneId, targetNodeId, ix.label || 'Botón', portId, 'in');
    }
    syncScenePorts(scene);
    return ix;
  }

  function buttonViewModel(state, n, ix, layerW, layerH) {
    ensureFreeOverlayDefaults(ix);
    var lw = layerW || 1000;
    var lh = layerH || 1000;
    var world = overlayWorldLayoutRaw(n, ix, lw, lh);
    var layout = world
      ? { x: world.x, y: world.y }
      : resolveButtonLayout(ix, lw, lh);
    var rot = world ? world.rotation : (ix.rotation != null ? Number(ix.rotation) : 0);
    var effectiveOn = overlayEffectiveVisible(n, ix);
    var effectiveLocked = overlayEffectiveLocked(n, ix);
    return {
      id: ix.id,
      portId: ix.portId || ix.id,
      type: String(ix.type || 'BUTTON').toUpperCase(),
      label: ix.label != null ? String(ix.label) : '',
      x: layout.x,
      y: layout.y,
      storedX: ix.groupId ? layout.x : ix.x,
      storedY: ix.groupId ? layout.y : ix.y,
      groupId: ix.groupId || null,
      style: ix.style || 'button',
      icon: ix.icon || null,
      rotation: rot,
      visible: effectiveOn,
      enabled: effectiveOn,
      locked: effectiveLocked,
      targetNodeId: isSceneButtonInteraction(ix) ? resolveButtonTarget(state, n.id, ix) : null,
      positionMode: ix.positionMode || 'free',
      anchor: ix.anchor || 'center',
      marginX: Number(ix.marginX) || 0,
      marginY: Number(ix.marginY) || 0,
      positionInitialized: !!ix.positionInitialized,
      width: ix.width != null ? Number(ix.width) : null,
      height: ix.height != null ? Number(ix.height) : null,
      fill: ix.fill || null,
      stroke: ix.stroke || null,
      strokeWidth: ix.strokeWidth != null ? Number(ix.strokeWidth) : null,
      borderRadius: ix.borderRadius != null ? Number(ix.borderRadius) : null,
      shapeStretchX: ix.shapeStretchX != null ? Number(ix.shapeStretchX) : 1,
      shapeStretchY: ix.shapeStretchY != null ? Number(ix.shapeStretchY) : 1,
      shapeContentBox: !!ix.shapeContentBox,
      fontSize: ix.fontSize != null ? Number(ix.fontSize) : null,
      fontSizeUnit: ix.fontSizeUnit === '%' ? '%' : 'px',
      color: ix.color || null,
      fontFamily: ix.fontFamily || null,
      fontWeight: ix.fontWeight || null,
      fontStyle: ix.fontStyle || null,
      textDecoration: ix.textDecoration || null,
      textAlign: ix.textAlign || null,
      lineHeight: ix.lineHeight != null ? Number(ix.lineHeight) : null,
      letterSpacing: ix.letterSpacing != null ? Number(ix.letterSpacing) : null,
      textTransform: ix.textTransform || null,
      textShadow: ix.textShadow || null,
      opacity: ix.opacity != null ? Number(ix.opacity) : 1,
      size: ix.size || 'md',
      scaleValue: ix.scaleValue != null ? Number(ix.scaleValue) : 100,
      scaleUnit: ix.scaleUnit === 'px' ? 'px' : '%',
      boxW: ix.boxW != null ? Number(ix.boxW) : null,
      boxH: ix.boxH != null ? Number(ix.boxH) : null,
      bgColor: ix.bgColor || null,
      bgOpacity: ix.bgOpacity != null ? Number(ix.bgOpacity) : null,
      textColor: ix.textColor || null,
      borderColor: ix.borderColor || null,
      borderWidth: ix.borderWidth != null ? Number(ix.borderWidth) : null,
      hoverEnabled: ix.hoverEnabled !== false,
      hoverColor: ix.hoverColor || '#6fbf86',
      hoverTextColor: ix.hoverTextColor || '#ffffff',
      hoverTransition: ix.hoverTransition != null ? Number(ix.hoverTransition) : 200,
      pressedColor: ix.pressedColor || '#5aaa74',
      pressedTextColor: ix.pressedTextColor || '#ffffff',
      pressedScale: ix.pressedScale != null ? Number(ix.pressedScale) : 0.96,
      _ix: ix
    };
  }

  function buttonHalfSizePx(ix, imageW, imageH) {
    var t = ix ? String(ix.type || '').toUpperCase() : '';
    if (t === 'BUTTON') ensureButtonVisualDefaults(ix);
    else if (t === 'TEXT' || isSceneShapeType(t)) {
      ensureFreeOverlayDefaults(ix);
    }
    var w = Math.max(1, Number(imageW) || 1000);
    var h = Math.max(1, Number(imageH) || 1000);
    if (isSceneShapeType(t)) {
      var disp = sceneShapeDisplaySize(ix.width, w, h);
      return {
        w: Math.max(4, (disp.w / 100) * w / 2),
        h: Math.max(2, (disp.h / 100) * h / 2)
      };
    }
    if (ix && ix.boxW != null && ix.boxH != null) {
      return {
        w: Math.max(4, (Number(ix.boxW) / 100) * w / 2),
        h: Math.max(4, (Number(ix.boxH) / 100) * h / 2)
      };
    }
    var style = (ix && ix.style) || 'button';
    if (style === 'icon') return { w: 22, h: 22 };
    if (style === 'button') return { w: 54, h: 20 };
    return { w: 46, h: 18 };
  }

  /**
   * Anchor margins always push inward. Half-size keeps the control fully visible.
   */
  function resolveButtonLayout(ix, imageW, imageH) {
    var tLayout = ix ? String(ix.type || '').toUpperCase() : '';
    if (tLayout === 'BUTTON') ensureButtonVisualDefaults(ix);
    else if (tLayout === 'TEXT' || isSceneShapeType(tLayout)) {
      ensureFreeOverlayDefaults(ix);
    }
    var w = Math.max(1, Number(imageW) || 1);
    var h = Math.max(1, Number(imageH) || 1);
    var half = buttonHalfSizePx(ix, w, h);
    var halfWp = (half.w / w) * 100;
    var halfHp = (half.h / h) * 100;
    var mxp = (Math.max(0, Number(ix.marginX) || 0) / w) * 100;
    var myp = (Math.max(0, Number(ix.marginY) || 0) / h) * 100;

    function clampInside(x, y) {
      return {
        x: clampPercent(Math.max(halfWp, Math.min(100 - halfWp, x)), 50),
        y: clampPercent(Math.max(halfHp, Math.min(100 - halfHp, y)), 50)
      };
    }

    if (ix.positionMode !== 'anchor') {
      /* Free overlays: keep stored center. Do NOT inset-clamp by half-size —
       * that fights live resize (growing box pulls the center every frame). */
      return {
        x: clampPercent(Number(ix.x), 50),
        y: clampPercent(Number(ix.y), 50)
      };
    }

    var base = BUTTON_ANCHORS[ix.anchor] || BUTTON_ANCHORS.center;
    var x = 50;
    var y = 50;
    if (base.x === 0) x = mxp + halfWp;
    else if (base.x === 100) x = 100 - mxp - halfWp;
    else x = 50;

    if (base.y === 0) y = myp + halfHp;
    else if (base.y === 100) y = 100 - myp - halfHp;
    else y = 50;

    if (ix.anchor === 'center') {
      x = 50;
      y = 50;
    }
    if (ix.anchor === 'top-center' || ix.anchor === 'bottom-center') x = 50;
    if (ix.anchor === 'center-left' || ix.anchor === 'center-right') y = 50;

    return clampInside(x, y);
  }

  function listSceneButtons(state, n) {
    if (arguments.length === 1) {
      n = state;
      state = null;
    }
    if (!n) return [];
    if (state) migrateLegacySceneButtons(state, n);
    return listSceneButtonInteractions(n).map(function (ix) {
      return buttonViewModel(state, n, ix);
    });
  }

  function getSceneButton(state, n, buttonId) {
    if (typeof n === 'string' || (n && n.id && arguments.length === 2)) {
      /* getSceneButton(n, buttonId) legacy */
      buttonId = n;
      n = state;
      state = null;
    }
    var list = listSceneButtons(state, n);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(buttonId) ||
          String(list[i].portId) === String(buttonId)) return list[i];
    }
    return null;
  }

  function addSceneButton(state, nodeId) {
    var n = getNode(state, nodeId);
    if (!n || !isButtonsEditableNode(n)) return null;
    var menuItem = findAddElementItem('el-button') || {
      interactionType: 'BUTTON',
      defaultLabel: 'Botón',
      group: 'controls'
    };
    var ix = addElementFromMenu(state, nodeId, menuItem);
    if (!ix || ix.error) return null;
    ix.x = 50;
    ix.y = 50;
    ix.positionInitialized = true;
    ix.style = 'chip';
    ix.rotation = 0;
    ix.positionMode = 'free';
    ix.marginX = 32;
    ix.marginY = 32;
    if (ix.color != null) delete ix.color;
    ensureButtonVisualDefaults(ix);
    return buttonViewModel(state, n, ix);
  }

  /* V7.2.44 — TEXT / SHAPE free overlays (Quotation Builder). */
  function addSceneText(state, nodeId) {
    var n = getNode(state, nodeId);
    if (!n || !isButtonsEditableNode(n)) return null;
    var menuItem = findAddElementItem('el-text') || {
      interactionType: 'TEXT',
      defaultLabel: 'Texto',
      group: 'controls'
    };
    var ix = addElementFromMenu(state, nodeId, menuItem);
    if (!ix || ix.error) return null;
    ix.x = 50;
    ix.y = 42;
    ix.positionInitialized = true;
    ix.positionMode = 'free';
    ensureFreeOverlayDefaults(ix);
    return buttonViewModel(state, n, ix);
  }

  /** New shapes store gizmo box directly (not tile picker square). */
  function seedShapeContentBox(ix, kind, layerW, layerH) {
    if (!ix || !isSceneShapeType(kind || ix.type)) return ix;
    kind = String(kind || ix.type).toUpperCase();
    var lw = Math.max(1, Number(layerW) || 1920);
    var lh = Math.max(1, Number(layerH) || 1080);
    ensureFreeOverlayDefaults(ix);
    var cx = Number(ix.x) || 50;
    var cy = Number(ix.y) || 50;
    var box = shapeDefaultContentBoxMetrics(kind, lw, lh);
    ix.x = cx;
    ix.y = cy;
    ix.width = box.gw;
    ix.height = box.gh;
    ix.shapeContentBox = true;
    return ix;
  }

  function addSceneShape(state, nodeId, kind, layerW, layerH, opts) {
    opts = opts || {};
    var n = getNode(state, nodeId);
    if (!n || !isButtonsEditableNode(n)) return null;
    var t = String(kind || 'SHAPE_RECT').toUpperCase();
    if (!isSceneShapeType(t)) t = 'SHAPE_RECT';
    var menuId = SCENE_SHAPE_MENU_ID[t] || 'el-shape-rect';
    var menuItem = findAddElementItem(menuId) || {
      interactionType: t,
      defaultLabel: sceneShapeDefaultLabel(t),
      group: 'controls'
    };
    var ix = addElementFromMenu(state, nodeId, menuItem);
    if (!ix || ix.error) return null;
    ix.type = t;
    ix.x = 50;
    ix.y = 50;
    ix.positionInitialized = true;
    ix.positionMode = 'free';
    ensureFreeOverlayDefaults(ix);
    if (!opts.skipSeed) {
      seedShapeContentBox(ix, t, layerW, layerH);
    }
    return buttonViewModel(state, n, ix);
  }

  function updateSceneButton(state, nodeId, buttonId, patch) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, buttonId);
    if (!ix || !isSceneFreeOverlayInteraction(ix)) return null;
    patch = patch || {};
    var t = String(ix.type || 'BUTTON').toUpperCase();
    var traceShape = isSceneShapeType(t) && shapeResizeTraceEngineEnabled() &&
      (patch.width != null || patch.height != null || patch.x != null || patch.y != null ||
        patch.shapeStretchX != null || patch.shapeStretchY != null);
    ensureFreeOverlayDefaults(ix);
    if (traceShape) {
      shapeResizeTraceEngine('4.updateSceneButton(enter)', {
        nodeId: nodeId,
        buttonId: buttonId,
        type: t,
        patch: patchModelFieldsEngine(patch),
        modelBefore: shapeModelFieldsEngine(ix)
      });
      shapeTraceNumEngine('4.enter.modelBefore', shapeModelFieldsEngine(ix), 'engine ix');
      shapeTraceNumEngine('4.enter.patch', patchModelFieldsEngine(patch), 'incoming patch');
    }

    if (patch.label != null) {
      updateInteraction(state, nodeId, ix.id, { label: String(patch.label) });
    }
    if (patch.visible != null || patch.enabled != null) {
      var on = patch.visible != null ? !!patch.visible : !!patch.enabled;
      ix.enabled = on;
    }
    if (patch.rotation != null) {
      if (ix.groupId) {
        var gRot = getInteraction(n, ix.groupId);
        if (gRot && isOverlayGroupInteraction(gRot)) {
          ix.localRotation = clampRotation(patch.rotation) - (Number(gRot.rotation) || 0);
        } else {
          ix.rotation = clampRotation(patch.rotation);
        }
      } else {
        ix.rotation = clampRotation(patch.rotation);
      }
    }
    if (patch.opacity != null) {
      ix.opacity = Math.max(0, Math.min(1, Number(patch.opacity)));
    }
    if (patch.x != null || patch.y != null) {
      if (ix.groupId) {
        var gPos = getInteraction(n, ix.groupId);
        if (gPos && isOverlayGroupInteraction(gPos)) {
          var lwPos = Math.max(1, Number(patch.layerW) || 1000);
          var lhPos = Math.max(1, Number(patch.layerH) || 1000);
          migrateGroupedChildLocals(n, gPos, lwPos, lhPos);
          var curW = composeOverlayWorldLayout(gPos, ix, lwPos, lhPos, n);
          var tx = patch.x != null ? Number(patch.x) : curW.x;
          var ty = patch.y != null ? Number(patch.y) : curW.y;
          if (patch.live) {
            if (!isNaN(tx)) tx = Math.max(-20, Math.min(120, tx));
            if (!isNaN(ty)) ty = Math.max(-20, Math.min(120, ty));
          } else {
            if (patch.x != null) tx = clampPercent(patch.x, curW.x);
            if (patch.y != null) ty = clampPercent(patch.y, curW.y);
          }
          var locPt = worldPointToLocal(gPos, tx, ty, lwPos, lhPos);
          ix.localX = locPt.x;
          ix.localY = locPt.y;
        }
      } else if (patch.live) {
        if (patch.x != null) {
          var lx = Number(patch.x);
          if (!isNaN(lx)) ix.x = Math.max(-20, Math.min(120, lx));
        }
        if (patch.y != null) {
          var ly = Number(patch.y);
          if (!isNaN(ly)) ix.y = Math.max(-20, Math.min(120, ly));
        }
      } else {
        if (patch.x != null) ix.x = clampPercent(patch.x, ix.x);
        if (patch.y != null) ix.y = clampPercent(patch.y, ix.y);
      }
      if (!ix.groupId) {
        ix.positionInitialized = true;
        if (patch.keepAnchor !== true) ix.positionMode = 'free';
      }
      if (traceShape && (patch.x != null || patch.y != null)) {
        shapeResizeTraceEngine('4.updateSceneButton(after-xy-fields)', {
          nodeId: nodeId,
          buttonId: buttonId,
          modelAfterXy: shapeModelFieldsEngine(ix)
        });
      }
    }

    if (t === 'BUTTON') {
      if (patch.style != null && BUTTON_STYLES[patch.style]) ix.style = patch.style;
      if (patch.icon !== undefined) {
        var icon = patch.icon == null || patch.icon === '' || patch.icon === 'none'
          ? null : String(patch.icon);
        ix.icon = (icon && BUTTON_ICONS[icon]) ? icon : null;
      }
      if (patch.size === 'sm' || patch.size === 'md' || patch.size === 'lg') ix.size = patch.size;
      if (patch.scaleValue != null) {
        ix.scaleValue = Math.max(1, Math.min(400, Number(patch.scaleValue) || 100));
      }
      if (patch.scaleUnit === 'px' || patch.scaleUnit === '%') {
        ix.scaleUnit = patch.scaleUnit;
      }
      if (patch.boxW != null) {
        var bw = Number(patch.boxW);
        if (!isNaN(bw)) {
          ix.boxW = patch.live
            ? Math.max(1, Math.min(100, bw))
            : Math.max(1, Math.min(100, Math.round(bw * 10) / 10));
        }
      }
      if (patch.boxH != null) {
        var bh = Number(patch.boxH);
        if (!isNaN(bh)) {
          ix.boxH = patch.live
            ? Math.max(1, Math.min(100, bh))
            : Math.max(1, Math.min(100, Math.round(bh * 10) / 10));
        }
      }
      if (patch.locked != null) ix.locked = !!patch.locked;
      if (patch.bgColor !== undefined) {
        ix.bgColor = patch.bgColor ? String(patch.bgColor) : null;
      }
      if (patch.bgOpacity != null) {
        ix.bgOpacity = Math.max(0, Math.min(1, Number(patch.bgOpacity)));
      }
      if (patch.textColor !== undefined) {
        ix.textColor = patch.textColor ? String(patch.textColor) : null;
      }
      if (patch.borderColor !== undefined) {
        ix.borderColor = patch.borderColor ? String(patch.borderColor) : null;
      }
      if (patch.borderWidth != null) {
        ix.borderWidth = Math.max(0, Math.min(20, Number(patch.borderWidth) || 0));
      }
      if (patch.borderRadius != null) {
        ix.borderRadius = Math.max(0, Math.min(999, Number(patch.borderRadius) || 0));
      }
      if (patch.hoverEnabled != null) ix.hoverEnabled = !!patch.hoverEnabled;
      if (patch.hoverColor != null) {
        ix.hoverColor = String(patch.hoverColor || '#6fbf86');
      }
      if (patch.hoverTextColor != null) {
        ix.hoverTextColor = String(patch.hoverTextColor || '#ffffff');
      }
      if (patch.hoverTransition != null) {
        ix.hoverTransition = Math.max(0, Math.min(2000, Number(patch.hoverTransition) || 0));
      }
      if (patch.pressedColor != null) {
        ix.pressedColor = String(patch.pressedColor || '#5aaa74');
      }
      if (patch.pressedTextColor != null) {
        ix.pressedTextColor = String(patch.pressedTextColor || '#ffffff');
      }
      if (patch.pressedScale != null) {
        ix.pressedScale = Math.max(0.8, Math.min(1.1, Number(patch.pressedScale) || 0.96));
      }
      if (patch.positionMode != null) {
        ix.positionMode = patch.positionMode === 'anchor' ? 'anchor' : 'free';
        if (ix.positionMode === 'anchor') {
          if (!(Number(ix.marginX) > 0)) ix.marginX = 32;
          if (!(Number(ix.marginY) > 0)) ix.marginY = 32;
        }
      }
      if (patch.anchor != null && BUTTON_ANCHORS[patch.anchor]) {
        ix.anchor = patch.anchor;
        ix.positionMode = 'anchor';
        if (!(Number(ix.marginX) > 0)) ix.marginX = 32;
        if (!(Number(ix.marginY) > 0)) ix.marginY = 32;
      }
      if (patch.marginX != null) {
        ix.marginX = Math.max(0, Number(patch.marginX) || 0);
        if (patch.keepAnchor) ix.positionMode = 'anchor';
      }
      if (patch.marginY != null) {
        ix.marginY = Math.max(0, Number(patch.marginY) || 0);
        if (patch.keepAnchor) ix.positionMode = 'anchor';
      }
      if (patch.targetNodeId !== undefined) {
        setButtonTarget(state, nodeId, ix.id, patch.targetNodeId || null);
      }
      /* Local textColor override allowed; strip legacy theme-only color field */
      if (ix.color != null) delete ix.color;
    }

    if (t === 'TEXT') {
      if (patch.fontSize != null) {
        ix.fontSize = Math.max(8, Math.min(200, Number(patch.fontSize) || 28));
        ix.fontSizeUnit = 'px';
      }
      if (patch.color != null) ix.color = String(patch.color || '#ffffff');
      if (patch.fontFamily != null) ix.fontFamily = String(patch.fontFamily).replace(/"/g, '');
      if (patch.fontWeight != null) ix.fontWeight = String(patch.fontWeight);
      if (patch.fontStyle != null) ix.fontStyle = String(patch.fontStyle);
      if (patch.textDecoration != null) ix.textDecoration = String(patch.textDecoration);
      if (patch.textAlign != null) ix.textAlign = String(patch.textAlign);
      if (patch.lineHeight != null) {
        ix.lineHeight = Math.max(0.8, Math.min(3, Number(patch.lineHeight) || 1.3));
      }
      if (patch.letterSpacing != null) {
        ix.letterSpacing = Math.max(-5, Math.min(40, Number(patch.letterSpacing) || 0));
      }
      if (patch.textTransform != null) ix.textTransform = String(patch.textTransform);
      if (patch.textShadow != null) ix.textShadow = String(patch.textShadow);
      if (patch.locked != null) ix.locked = !!patch.locked;
      ix.positionMode = 'free';
    }

    if (isSceneShapeType(t)) {
      var minPctShape = overlayMemberMinPct(
        patch.layerW || 1000,
        patch.layerH || 1000
      );
      if (patch.width != null) {
        var sw = Number(patch.width);
        if (!isNaN(sw)) {
          if (!patch.live && patch.shapeCoupledCommit && patch.height != null) {
            ix.width = Math.max(minPctShape.w, Math.min(100, sw));
          } else {
            ix.width = patch.live
              ? Math.max(1, Math.min(100, sw))
              : Math.max(1, Math.min(100, Math.round(sw * 10) / 10));
          }
        }
      }
      if (patch.height != null) {
        var sh = Number(patch.height);
        var minH = t === 'SHAPE_LINE' ? 0.5 : minPctShape.h;
        if (!isNaN(sh)) {
          if (!patch.live && patch.shapeCoupledCommit) {
            ix.height = Math.max(minH, Math.min(100, sh));
          } else {
            ix.height = patch.live
              ? Math.max(minH, Math.min(100, sh))
              : Math.max(minH, Math.min(100, Math.round(sh * 10) / 10));
          }
        }
      }
      if (patch.fill != null) ix.fill = String(patch.fill);
      if (patch.stroke != null) ix.stroke = String(patch.stroke);
      if (patch.strokeWidth != null) {
        ix.strokeWidth = Math.max(0, Math.min(20, Number(patch.strokeWidth) || 0));
      }
      if (patch.borderRadius != null && (t === 'SHAPE_RECT' || t === 'SHAPE_ROUND_RECT')) {
        ix.borderRadius = Math.max(0, Math.min(999, Number(patch.borderRadius) || 0));
      }
      if (patch.shapeStretchX != null) {
        ix.shapeStretchX = Math.max(0.06, Math.min(8, Number(patch.shapeStretchX) || 1));
      }
      if (patch.shapeStretchY != null) {
        ix.shapeStretchY = Math.max(0.06, Math.min(8, Number(patch.shapeStretchY) || 1));
      }
      if (patch.shapeContentBox != null) ix.shapeContentBox = !!patch.shapeContentBox;
      if (patch.locked != null) ix.locked = !!patch.locked;
      ix.positionMode = 'free';
      if (traceShape) {
        shapeResizeTraceEngine('4.updateSceneButton(after-shape-fields)', {
          nodeId: nodeId,
          buttonId: buttonId,
          modelMid: shapeModelFieldsEngine(ix)
        });
        shapeTraceNumEngine('4.afterShapeFields.modelIx', shapeModelFieldsEngine(ix), 'width/height applied');
      }
    }

    ensureFreeOverlayDefaults(ix);
    if (traceShape) {
      shapeResizeTraceEngine('4.updateSceneButton(after-ensureFreeOverlayDefaults)', {
        nodeId: nodeId,
        buttonId: buttonId,
        modelAfterDefaults: shapeModelFieldsEngine(ix)
      });
      shapeTraceNumEngine('4.afterDefaults.modelIx', shapeModelFieldsEngine(ix), 'ensureFreeOverlayDefaults');
    }
    syncScenePorts(n);
    if (traceShape) {
      shapeResizeTraceEngine('4.updateSceneButton(exit)', {
        nodeId: nodeId,
        buttonId: buttonId,
        modelExit: shapeModelFieldsEngine(ix)
      });
      shapeTraceNumEngine('4.exit.modelIx', shapeModelFieldsEngine(ix), 'FINAL ix in engine');
    }
    return buttonViewModel(state, n, ix);
  }

  function setSceneButtonPosition(state, nodeId, buttonId, x, y, layerW, layerH) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, buttonId);
    if (!ix || !isSceneFreeOverlayInteraction(ix)) return null;
    return updateSceneButton(state, nodeId, buttonId, {
      x: x,
      y: y,
      live: true,
      layerW: layerW,
      layerH: layerH
    });
  }

  function mirrorSceneButton(state, nodeId, buttonId) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, buttonId);
    if (!ix || !isSceneButtonInteraction(ix)) return null;
    ensureButtonVisualDefaults(ix);
    if (ix.positionMode === 'anchor' && ix.anchor) {
      var flip = {
        'center-left': 'center-right',
        'center-right': 'center-left',
        'top-left': 'top-right',
        'top-right': 'top-left',
        'bottom-left': 'bottom-right',
        'bottom-right': 'bottom-left'
      };
      if (flip[ix.anchor]) ix.anchor = flip[ix.anchor];
    }
    ix.x = clampPercent(100 - Number(ix.x), 50);
    ix.positionInitialized = true;
    return buttonViewModel(state, n, ix);
  }

  function duplicateSceneButton(state, nodeId, buttonId, opts) {
    opts = opts || {};
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, buttonId);
    if (!ix || !isSceneFreeOverlayInteraction(ix)) return null;
    ensureFreeOverlayDefaults(ix);
    var copy = duplicateInteraction(state, nodeId, ix.id);
    if (!copy) return null;
    var imageW = Math.max(1, Number(opts.imageW) || 1000);
    var imageH = Math.max(1, Number(opts.imageH) || 1000);
    var layout = resolveButtonLayout(ix, imageW, imageH);
    var exact = !!opts.exact;
    var offsetYpx = opts.offsetY != null ? Number(opts.offsetY) : (exact ? 0 : 32);
    var offsetXpx = opts.offsetX != null ? Number(opts.offsetX) : 0;
    var dxPct = (offsetXpx / imageW) * 100;
    var dyPct = (offsetYpx / imageH) * 100;
    copy.x = clampPercent(layout.x + dxPct, layout.x);
    copy.y = clampPercent(layout.y + dyPct, layout.y);
    copy.style = ix.style;
    copy.icon = ix.icon;
    copy.rotation = ix.rotation;
    copy.enabled = ix.enabled !== false;
    copy.anchor = ix.anchor;
    copy.marginX = ix.marginX;
    copy.marginY = ix.marginY;
    copy.positionInitialized = true;
    copy.size = ix.size;
    copy.scaleValue = ix.scaleValue;
    copy.scaleUnit = ix.scaleUnit;
    copy.boxW = ix.boxW;
    copy.boxH = ix.boxH;
    copy.locked = !!ix.locked;
    copy.opacity = ix.opacity;
    copy.bgColor = ix.bgColor;
    copy.bgOpacity = ix.bgOpacity;
    copy.textColor = ix.textColor;
    copy.borderColor = ix.borderColor;
    copy.borderWidth = ix.borderWidth;
    copy.hoverEnabled = ix.hoverEnabled;
    copy.hoverColor = ix.hoverColor;
    copy.hoverTextColor = ix.hoverTextColor;
    copy.hoverTransition = ix.hoverTransition;
    copy.pressedColor = ix.pressedColor;
    copy.pressedTextColor = ix.pressedTextColor;
    copy.pressedScale = ix.pressedScale;
    copy.fontSize = ix.fontSize;
    copy.fontSizeUnit = ix.fontSizeUnit;
    copy.color = ix.color;
    copy.fontFamily = ix.fontFamily;
    copy.fontWeight = ix.fontWeight;
    copy.fontStyle = ix.fontStyle;
    copy.textDecoration = ix.textDecoration;
    copy.textAlign = ix.textAlign;
    copy.lineHeight = ix.lineHeight;
    copy.letterSpacing = ix.letterSpacing;
    copy.textTransform = ix.textTransform;
    copy.textShadow = ix.textShadow;
    copy.width = ix.width;
    copy.height = ix.height;
    copy.fill = ix.fill;
    copy.stroke = ix.stroke;
    copy.strokeWidth = ix.strokeWidth;
    copy.borderRadius = ix.borderRadius;
    copy.shapeStretchX = ix.shapeStretchX;
    copy.shapeStretchY = ix.shapeStretchY;
    copy.shapeContentBox = ix.shapeContentBox;
    if (exact) {
      copy.positionMode = ix.positionMode === 'anchor' ? 'anchor' : 'free';
      copy.label = ix.label != null ? String(ix.label) : '';
    } else {
      copy.positionMode = 'free';
      if (ix.label != null && String(ix.label).length) {
        copy.label = String(ix.label) + ' copia';
      } else {
        copy.label = '';
      }
    }
    if (isSceneButtonInteraction(copy) && copy.color != null) delete copy.color;
    ensureFreeOverlayDefaults(copy);
    if (isSceneButtonInteraction(ix)) {
      var targetId = resolveButtonTarget(state, nodeId, ix);
      if (targetId) setButtonTarget(state, nodeId, copy.id, targetId);
    }
    syncScenePorts(n);
    return buttonViewModel(state, n, copy);
  }

  /**
   * Absolute 1:1 paste — places the overlay at exact free coords from the snapshot.
   * Supports BUTTON / TEXT / SHAPE_*. Never recenters.
   */
  function createSceneButtonFromSnapshot(state, nodeId, snap) {
    snap = snap || {};
    var t = String(snap.type || 'BUTTON').toUpperCase();
    var created = null;
    if (t === 'TEXT') {
      created = addSceneText(state, nodeId);
    } else if (isSceneShapeType(t)) {
      created = addSceneShape(state, nodeId, t, null, null, { skipSeed: true });
    } else {
      t = 'BUTTON';
      created = addSceneButton(state, nodeId);
    }
    if (!created || !created.id) return null;
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, created.id);
    if (!ix) return null;

    ix.type = t;
    ix.label = snap.label != null ? String(snap.label) : (ix.label || '');
    ix.rotation = clampRotation(snap.rotation != null ? snap.rotation : 0);
    ix.enabled = snap.visible !== false && snap.enabled !== false;
    ix.locked = !!snap.locked;

    if (t === 'BUTTON') {
      ensureButtonVisualDefaults(ix);
      if (snap.style != null && BUTTON_STYLES[snap.style]) ix.style = snap.style;
      if (snap.icon === null || snap.icon === '' || snap.icon === 'none') {
        ix.icon = null;
      } else if (snap.icon && BUTTON_ICONS[snap.icon]) {
        ix.icon = snap.icon;
      }
      if (snap.anchor && BUTTON_ANCHORS[snap.anchor]) ix.anchor = snap.anchor;
      ix.marginX = Math.max(0, Number(snap.marginX) || 0);
      ix.marginY = Math.max(0, Number(snap.marginY) || 0);
      if (snap.boxW != null) ix.boxW = Math.max(1, Math.min(100, Number(snap.boxW) || 14));
      if (snap.boxH != null) ix.boxH = Math.max(1, Math.min(100, Number(snap.boxH) || 4.5));
      if (snap.bgColor != null) ix.bgColor = snap.bgColor;
      if (snap.bgOpacity != null) ix.bgOpacity = Number(snap.bgOpacity);
      if (snap.textColor != null) ix.textColor = snap.textColor;
      if (snap.borderColor != null) ix.borderColor = snap.borderColor;
      if (snap.borderWidth != null) ix.borderWidth = Number(snap.borderWidth);
      if (snap.borderRadius != null) ix.borderRadius = Number(snap.borderRadius);
      if (snap.hoverEnabled != null) ix.hoverEnabled = !!snap.hoverEnabled;
      if (snap.hoverColor != null) ix.hoverColor = snap.hoverColor;
      if (snap.hoverTextColor != null) ix.hoverTextColor = snap.hoverTextColor;
      if (snap.hoverTransition != null) ix.hoverTransition = Number(snap.hoverTransition);
      if (snap.pressedColor != null) ix.pressedColor = snap.pressedColor;
      if (snap.pressedTextColor != null) ix.pressedTextColor = snap.pressedTextColor;
      if (snap.pressedScale != null) ix.pressedScale = Number(snap.pressedScale);
      if (snap.opacity != null) ix.opacity = Number(snap.opacity);
      if (ix.color != null) delete ix.color;
      if (snap.targetNodeId) {
        setButtonTarget(state, nodeId, ix.id, snap.targetNodeId);
      }
    } else {
      ensureFreeOverlayDefaults(ix);
      if (t === 'TEXT') {
        if (snap.fontSize != null) ix.fontSize = Number(snap.fontSize);
        if (snap.color != null) ix.color = String(snap.color);
        if (snap.fontFamily != null) ix.fontFamily = String(snap.fontFamily);
        if (snap.fontWeight != null) ix.fontWeight = String(snap.fontWeight);
        if (snap.fontStyle != null) ix.fontStyle = String(snap.fontStyle);
        if (snap.textDecoration != null) ix.textDecoration = String(snap.textDecoration);
        if (snap.textAlign != null) ix.textAlign = String(snap.textAlign);
        if (snap.lineHeight != null) ix.lineHeight = Number(snap.lineHeight);
        if (snap.letterSpacing != null) ix.letterSpacing = Number(snap.letterSpacing);
        if (snap.textTransform != null) ix.textTransform = String(snap.textTransform);
        if (snap.textShadow != null) ix.textShadow = String(snap.textShadow);
        if (snap.opacity != null) ix.opacity = Number(snap.opacity);
      } else if (isSceneShapeType(t)) {
        if (snap.width != null) ix.width = Number(snap.width);
        if (snap.height != null) ix.height = Number(snap.height);
        if (snap.shapeContentBox != null) ix.shapeContentBox = !!snap.shapeContentBox;
        else if (snap.height != null && Number(snap.height) > 0) ix.shapeContentBox = true;
        if (snap.shapeStretchX != null) {
          ix.shapeStretchX = Math.max(0.06, Math.min(8, Number(snap.shapeStretchX) || 1));
        }
        if (snap.shapeStretchY != null) {
          ix.shapeStretchY = Math.max(0.06, Math.min(8, Number(snap.shapeStretchY) || 1));
        }
        if (snap.fill != null) ix.fill = String(snap.fill);
        if (snap.stroke != null) ix.stroke = String(snap.stroke);
        if (snap.strokeWidth != null) ix.strokeWidth = Number(snap.strokeWidth);
        if (snap.borderRadius != null) ix.borderRadius = Number(snap.borderRadius);
      } else {
        if (snap.width != null) ix.width = Number(snap.width);
        if (snap.height != null) ix.height = Number(snap.height);
        if (snap.fill != null) ix.fill = String(snap.fill);
        if (snap.stroke != null) ix.stroke = String(snap.stroke);
        if (snap.strokeWidth != null) ix.strokeWidth = Number(snap.strokeWidth);
        if (snap.borderRadius != null) ix.borderRadius = Number(snap.borderRadius);
      }
    }

    /* Absolute geometry — never recenter */
    ix.x = clampPercent(snap.x, 50);
    ix.y = clampPercent(snap.y, 50);
    ix.positionMode = 'free';
    ix.positionInitialized = true;
    ensureFreeOverlayDefaults(ix);
    syncScenePorts(n);
    return buttonViewModel(state, n, ix);
  }

  /**
   * V6.2.00 — HOTSPOTS editor = polygon mask layer over image scenes.
   * SSOT: scene.config.interactions[] where type === 'HOTSPOT' && shape === 'polygon'.
   * Independent from BUTTON layer and from legacy point HOTSPOTs in FLUJO.
   */
  var HOTSPOT_KINDS = { highlight: 1, info: 1, navigation: 1 };
  var HOTSPOT_ANIMATIONS = { none: 1, pulse: 1, fade: 1 };
  var HOTSPOT_DEFAULT_COLOR = '#6fbf86';

  function isHotspotsEditableNode(n) {
    return isButtonsEditableNode(n);
  }

  function isSceneHotspotMask(ix) {
    if (!ix || String(ix.type || '').toUpperCase() !== 'HOTSPOT') return false;
    if (ix.shape === 'polygon') return true;
    return Array.isArray(ix.polygon) && ix.polygon.length >= 3;
  }

  function clampHotspotOpacity(v) {
    var n = Number(v);
    if (isNaN(n)) n = 0.22;
    return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
  }

  function clampHotspotBorder(v) {
    var n = Number(v);
    if (isNaN(n)) n = 1.5;
    return Math.max(0, Math.min(12, Math.round(n * 10) / 10));
  }

  function normalizePolygon(points) {
    if (!Array.isArray(points)) return [];
    return points.map(function (p) {
      if (!p || typeof p !== 'object') return null;
      return {
        x: clampPercent(p.x, 0),
        y: clampPercent(p.y, 0)
      };
    }).filter(Boolean);
  }

  function ensureHotspotMaskDefaults(ix) {
    if (!ix || !isSceneHotspotMask(ix)) return ix;
    ix.shape = 'polygon';
    ix.polygon = normalizePolygon(ix.polygon);
    if (!ix.name && ix.label) ix.name = String(ix.label);
    if (ix.name && (!ix.label || ix.label === 'HOTSPOT' || ix.label === 'Hotspot')) {
      ix.label = String(ix.name);
    }
    if (!ix.hotspotKind || !HOTSPOT_KINDS[ix.hotspotKind]) ix.hotspotKind = 'highlight';
    if (!ix.color || typeof ix.color !== 'string') ix.color = HOTSPOT_DEFAULT_COLOR;
    ix.opacity = clampHotspotOpacity(ix.opacity != null ? ix.opacity : 0.22);
    ix.borderWidth = clampHotspotBorder(ix.borderWidth != null ? ix.borderWidth : 1.5);
    if (!ix.animation || !HOTSPOT_ANIMATIONS[ix.animation]) ix.animation = 'none';
    if (ix.enabled == null) ix.enabled = true;
    /* V6.5.00 — smart content (refs only; Estructura is SSOT) */
    if (ix.contentMode !== 'custom' && ix.contentMode !== 'structure') {
      ix.contentMode = 'structure';
    }
    if (ix.entityId === undefined) ix.entityId = null;
    if (ix.entityType === undefined) ix.entityType = null;
    if (!ix.entityId && ix.structureId) {
      ix.entityId = String(ix.structureId);
      var sk = String(ix.structureKind || '').toLowerCase();
      if (!ix.entityType) {
        if (sk.indexOf('ambiente') >= 0 || sk === 'room') ix.entityType = 'ambiente';
        else if (sk.indexOf('planta') >= 0 || sk === 'floor' || sk === 'nivel') ix.entityType = 'planta';
        else ix.entityType = 'tipologia';
      }
    }
    if (ix.entityType && !({ tipologia: 1, planta: 1, ambiente: 1 }[ix.entityType])) {
      ix.entityType = null;
      ix.entityId = null;
    }
    if (!ix.cardTemplate || !({ compacta: 1, completa: 1, ficha: 1, premium: 1 }[ix.cardTemplate])) {
      ix.cardTemplate = 'completa';
    }
    if (!ix.cardFields || typeof ix.cardFields !== 'object') {
      ix.cardFields = (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.defaultCardFields)
        ? EstructuraEntity.defaultCardFields()
        : {};
    } else if (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.normalizeCardFields) {
      ix.cardFields = EstructuraEntity.normalizeCardFields(ix.cardFields);
    }
    return ix;
  }

  function hotspotMaskViewModel(ix) {
    ensureHotspotMaskDefaults(ix);
    return {
      id: ix.id,
      portId: ix.portId || ix.id,
      name: ix.name != null ? String(ix.name) : (ix.label != null ? String(ix.label) : ''),
      label: ix.label != null ? String(ix.label) : '',
      polygon: (ix.polygon || []).map(function (p) {
        return { x: Number(p.x), y: Number(p.y) };
      }),
      color: ix.color || HOTSPOT_DEFAULT_COLOR,
      opacity: Number(ix.opacity),
      borderWidth: Number(ix.borderWidth),
      animation: ix.animation || 'none',
      hotspotKind: ix.hotspotKind || 'highlight',
      visible: ix.enabled !== false,
      enabled: ix.enabled !== false,
      shape: 'polygon',
      contentMode: ix.contentMode || 'structure',
      entityId: ix.entityId || null,
      entityType: ix.entityType || null,
      cardTemplate: ix.cardTemplate || 'completa',
      cardFields: ix.cardFields || {},
      _ix: ix
    };
  }

  function listSceneHotspotMasks(state, n) {
    if (!n) return [];
    normalizeSceneInteractions(n);
    return (n.config.interactions || [])
      .filter(isSceneHotspotMask)
      .map(function (ix) {
        ensureHotspotMaskDefaults(ix);
        return hotspotMaskViewModel(ix);
      });
  }

  function getSceneHotspotMask(state, n, hotspotId) {
    var list = listSceneHotspotMasks(state, n);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(hotspotId) ||
          String(list[i].portId) === String(hotspotId)) return list[i];
    }
    return null;
  }

  function addSceneHotspotMask(state, nodeId, polygon) {
    var n = getNode(state, nodeId);
    if (!n || !isHotspotsEditableNode(n)) return null;
    var pts = normalizePolygon(polygon);
    if (pts.length < 3) return null;
    var ix = addInteractionToScene(state, nodeId, 'HOTSPOT', 'Hotspot', {
      group: 'content'
    });
    if (!ix) return null;
    ix.shape = 'polygon';
    ix.polygon = pts;
    ix.name = 'Hotspot';
    ix.hotspotKind = 'highlight';
    ix.color = HOTSPOT_DEFAULT_COLOR;
    ix.opacity = 0.22;
    ix.borderWidth = 1.5;
    ix.animation = 'none';
    ix.contentMode = 'structure';
    ix.entityId = null;
    ix.entityType = null;
    ix.cardTemplate = 'completa';
    ensureHotspotMaskDefaults(ix);
    syncScenePorts(n);
    return hotspotMaskViewModel(ix);
  }

  function updateSceneHotspotMask(state, nodeId, hotspotId, patch) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    patch = patch || {};
    ensureHotspotMaskDefaults(ix);

    if (patch.name != null || patch.label != null) {
      var name = patch.name != null ? String(patch.name) : String(patch.label);
      ix.name = name;
      updateInteraction(state, nodeId, ix.id, { label: name });
    }
    if (patch.hotspotKind != null && HOTSPOT_KINDS[patch.hotspotKind]) {
      ix.hotspotKind = patch.hotspotKind;
    }
    if (patch.color != null && String(patch.color).trim()) {
      ix.color = String(patch.color).trim();
    }
    if (patch.opacity != null) ix.opacity = clampHotspotOpacity(patch.opacity);
    if (patch.borderWidth != null) ix.borderWidth = clampHotspotBorder(patch.borderWidth);
    if (patch.animation != null && HOTSPOT_ANIMATIONS[patch.animation]) {
      ix.animation = patch.animation;
    }
    if (patch.visible != null || patch.enabled != null) {
      ix.enabled = patch.visible != null ? !!patch.visible : !!patch.enabled;
    }
    if (patch.polygon != null) {
      var nextPoly = normalizePolygon(patch.polygon);
      if (nextPoly.length >= 3) ix.polygon = nextPoly;
    }
    if (patch.contentMode === 'custom' || patch.contentMode === 'structure') {
      ix.contentMode = patch.contentMode;
      if (ix.contentMode === 'custom') {
        ix.entityId = null;
        ix.entityType = null;
      }
    }
    if (patch.entityId !== undefined || patch.entityType !== undefined) {
      var nextType = patch.entityType !== undefined ? patch.entityType : ix.entityType;
      var nextId = patch.entityId !== undefined ? patch.entityId : ix.entityId;
      if (nextId && nextType && ({ tipologia: 1, planta: 1, ambiente: 1 }[nextType])) {
        ix.entityId = String(nextId);
        ix.entityType = nextType;
        ix.contentMode = 'structure';
        /* Keep legacy keys as thin mirrors of the ref only (no payload copy) */
        ix.structureId = ix.entityId;
        ix.structureKind = ix.entityType;
        ix.structureKey = ix.entityType + ':' + ix.entityId;
        ix.structureLabel = null;
        ix.structureRef = {
          id: ix.entityId,
          key: ix.structureKey,
          kind: ix.entityType,
          label: null
        };
      } else if (patch.entityId === null || patch.entityType === null) {
        ix.entityId = null;
        ix.entityType = null;
        ix.structureId = null;
        ix.structureKind = null;
        ix.structureKey = null;
        ix.structureLabel = null;
        ix.structureRef = null;
      }
    }
    if (patch.cardTemplate != null &&
        ({ compacta: 1, completa: 1, ficha: 1, premium: 1 }[patch.cardTemplate])) {
      ix.cardTemplate = patch.cardTemplate;
    }
    if (patch.cardFields != null && typeof patch.cardFields === 'object') {
      var base = (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.normalizeCardFields)
        ? EstructuraEntity.normalizeCardFields(ix.cardFields)
        : (ix.cardFields || {});
      Object.keys(patch.cardFields).forEach(function (k) {
        base[k] = !!patch.cardFields[k];
      });
      ix.cardFields = base;
    }
    ix.shape = 'polygon';
    ensureHotspotMaskDefaults(ix);
    syncScenePorts(n);
    return hotspotMaskViewModel(ix);
  }

  function setHotspotVertex(state, nodeId, hotspotId, index, x, y) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    ensureHotspotMaskDefaults(ix);
    var i = Number(index);
    if (!(i >= 0) || i >= ix.polygon.length) return null;
    ix.polygon[i] = { x: clampPercent(x, ix.polygon[i].x), y: clampPercent(y, ix.polygon[i].y) };
    return hotspotMaskViewModel(ix);
  }

  function insertHotspotVertex(state, nodeId, hotspotId, afterIndex, x, y) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    ensureHotspotMaskDefaults(ix);
    var i = Math.max(0, Math.min(ix.polygon.length, Number(afterIndex) + 1));
    ix.polygon.splice(i, 0, { x: clampPercent(x, 50), y: clampPercent(y, 50) });
    return hotspotMaskViewModel(ix);
  }

  function removeHotspotVertex(state, nodeId, hotspotId, index) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    ensureHotspotMaskDefaults(ix);
    if (ix.polygon.length <= 3) return hotspotMaskViewModel(ix);
    var i = Number(index);
    if (!(i >= 0) || i >= ix.polygon.length) return null;
    ix.polygon.splice(i, 1);
    return hotspotMaskViewModel(ix);
  }

  function translateHotspotMask(state, nodeId, hotspotId, dxPct, dyPct) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    ensureHotspotMaskDefaults(ix);
    var dx = Number(dxPct) || 0;
    var dy = Number(dyPct) || 0;
    ix.polygon = ix.polygon.map(function (p) {
      return { x: clampPercent(p.x + dx, p.x), y: clampPercent(p.y + dy, p.y) };
    });
    return hotspotMaskViewModel(ix);
  }

  function duplicateSceneHotspotMask(state, nodeId, hotspotId) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return null;
    ensureHotspotMaskDefaults(ix);
    var name = (ix.name || ix.label || 'Hotspot') + ' copia';
    var copy = addInteractionToScene(state, nodeId, 'HOTSPOT', name, {
      group: 'content'
    });
    if (!copy) return null;
    copy.shape = 'polygon';
    copy.polygon = ix.polygon.map(function (p) {
      return { x: clampPercent(p.x + 1.5, p.x), y: clampPercent(p.y + 1.5, p.y) };
    });
    copy.name = name;
    copy.hotspotKind = ix.hotspotKind;
    copy.color = ix.color;
    copy.opacity = ix.opacity;
    copy.borderWidth = ix.borderWidth;
    copy.animation = ix.animation;
    copy.enabled = ix.enabled !== false;
    copy.contentMode = ix.contentMode || 'structure';
    copy.entityId = ix.entityId || null;
    copy.entityType = ix.entityType || null;
    copy.cardTemplate = ix.cardTemplate || 'completa';
    copy.cardFields = ix.cardFields
      ? JSON.parse(JSON.stringify(ix.cardFields))
      : null;
    ensureHotspotMaskDefaults(copy);
    syncScenePorts(n);
    return hotspotMaskViewModel(copy);
  }

  function removeSceneHotspotMask(state, nodeId, hotspotId) {
    var n = getNode(state, nodeId);
    var ix = getInteraction(n, hotspotId);
    if (!ix || !isSceneHotspotMask(ix)) return false;
    removeInteraction(state, nodeId, ix.id);
    return true;
  }

  function resolveButtonsForLayout(state, nodeId, ids, imageW, imageH) {
    var n = getNode(state, nodeId);
    if (!n) return [];
    var out = [];
    (ids || []).forEach(function (id) {
      var ix = getInteraction(n, id);
      if (!ix || !isSceneButtonInteraction(ix)) return;
      var layout = resolveButtonLayout(ix, imageW, imageH);
      out.push({ id: ix.id, ix: ix, x: layout.x, y: layout.y });
    });
    return out;
  }

  function commitFreePositions(state, nodeId, items) {
    var n = getNode(state, nodeId);
    (items || []).forEach(function (item) {
      if (!item || !item.ix) return;
      item.ix.x = clampPercent(item.x, 50);
      item.ix.y = clampPercent(item.y, 50);
      item.ix.positionMode = 'free';
      item.ix.positionInitialized = true;
    });
    if (n) syncScenePorts(n);
    return true;
  }

  function alignSceneButtons(state, nodeId, ids, mode, imageW, imageH) {
    var items = resolveButtonsForLayout(state, nodeId, ids, imageW, imageH);
    if (items.length < 2) return false;
    var xs = items.map(function (i) { return i.x; });
    var ys = items.map(function (i) { return i.y; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var midX = (minX + maxX) / 2;
    var midY = (minY + maxY) / 2;
    items.forEach(function (item) {
      if (mode === 'left') item.x = minX;
      else if (mode === 'right') item.x = maxX;
      else if (mode === 'top') item.y = minY;
      else if (mode === 'bottom') item.y = maxY;
      else if (mode === 'center-h') item.x = midX;
      else if (mode === 'center-v') item.y = midY;
    });
    return commitFreePositions(state, nodeId, items);
  }

  function distributeSceneButtons(state, nodeId, ids, axis, imageW, imageH) {
    var items = resolveButtonsForLayout(state, nodeId, ids, imageW, imageH);
    if (items.length < 2) return false;
    var key = axis === 'x' ? 'x' : 'y';
    items.sort(function (a, b) { return a[key] - b[key]; });
    if (items.length === 2) return commitFreePositions(state, nodeId, items);
    var first = items[0][key];
    var last = items[items.length - 1][key];
    var step = (last - first) / (items.length - 1);
    items.forEach(function (item, idx) {
      item[key] = first + step * idx;
    });
    return commitFreePositions(state, nodeId, items);
  }

  function spaceSceneButtons(state, nodeId, ids, gapPx, axis, imageW, imageH) {
    var items = resolveButtonsForLayout(state, nodeId, ids, imageW, imageH);
    if (items.length < 2) return false;
    var key = axis === 'x' ? 'x' : 'y';
    var dim = key === 'x'
      ? Math.max(1, Number(imageW) || 1000)
      : Math.max(1, Number(imageH) || 1000);
    var gapPct = (Math.max(0, Number(gapPx) || 0) / dim) * 100;
    items.sort(function (a, b) { return a[key] - b[key]; });
    for (var i = 1; i < items.length; i++) {
      items[i][key] = items[i - 1][key] + gapPct;
    }
    return commitFreePositions(state, nodeId, items);
  }

  function removeSceneButton(state, nodeId, buttonId) {
    var n = getNode(state, nodeId);
    if (!n || !n.config) return false;
    var ix = getInteraction(n, buttonId);
    if (!ix || !isSceneFreeOverlayInteraction(ix)) return false;
    if (overlayInteractionSelfLocked(ix)) return false;
    /* Defensive: never allow button delete to remove canvas nodes */
    var exp = ensureState(state);
    var nodeCount = (exp.nodes || []).length;
    var nodeIds = (exp.nodes || []).map(function (node) { return String(node.id); });
    var result = removeInteraction(state, nodeId, buttonId, { keepEdges: false });
    if (result && n) pruneOverlayGroupsAfterDelete(n, [buttonId]);
    exp = ensureState(state);
    if ((exp.nodes || []).length !== nodeCount) {
      /* Rollback node list if somehow mutated */
      exp.nodes = (exp.nodes || []).filter(function (node) {
        return nodeIds.indexOf(String(node.id)) >= 0;
      });
    }
    if (exp.canvas) {
      if (String(exp.canvas.selectedButtonId) === String(buttonId)) {
        exp.canvas.selectedButtonId = null;
      }
      if (Array.isArray(exp.canvas.selectedButtonIds)) {
        exp.canvas.selectedButtonIds = exp.canvas.selectedButtonIds.filter(function (id) {
          return String(id) !== String(buttonId);
        });
      }
    }
    return !!result;
  }

  /** Move overlay interaction to end of array (paint order = front). */
  function bringSceneOverlayToFront(state, nodeId, buttonId) {
    var n = getNode(state, nodeId);
    if (!n || !n.config || !Array.isArray(n.config.interactions)) return null;
    var list = n.config.interactions;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(buttonId)) { idx = i; break; }
    }
    if (idx < 0) return null;
    var item = list.splice(idx, 1)[0];
    list.push(item);
    if (isSceneFreeOverlayInteraction(item)) {
      return buttonViewModel(state, n, item);
    }
    return item;
  }

  /**
   * Lightweight scene-scoped snapshot of BUTTON interactions + their outbound edges.
   * Used by editor undo/redo (V6.1.04). Does not touch non-BUTTON elements or nodes.
   */
  function snapshotSceneButtons(state, sceneId) {
    var n = getNode(state, sceneId);
    if (!n || !n.config) return null;
    var exp = ensureState(state);
    var buttons = (n.config.interactions || []).filter(function (ix) {
      return isSceneFreeOverlayInteraction(ix) || isOverlayGroupInteraction(ix);
    }).map(function (ix) {
      return JSON.parse(JSON.stringify(ix));
    });
    var portIds = {};
    buttons.forEach(function (ix) {
      portIds[String(ix.portId || ix.id)] = true;
    });
    var edges = (exp.edges || []).filter(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId;
      return String(from) === String(sceneId) && portIds[String(pid)];
    }).map(function (ed) {
      return JSON.parse(JSON.stringify(ed));
    });
    return {
      sceneId: String(sceneId),
      interactions: buttons,
      edges: edges,
      selectedButtonId: exp.canvas ? exp.canvas.selectedButtonId : null,
      selectedButtonIds: exp.canvas && Array.isArray(exp.canvas.selectedButtonIds)
        ? exp.canvas.selectedButtonIds.slice()
        : []
    };
  }

  function restoreSceneButtons(state, snap) {
    if (!snap || !snap.sceneId) return false;
    var n = getNode(state, snap.sceneId);
    if (!n || !n.config) return false;
    var exp = ensureState(state);
    var nodeCount = (exp.nodes || []).length;

    var portIds = {};
    listSceneButtonInteractions(n).forEach(function (ix) {
      portIds[String(ix.portId || ix.id)] = true;
    });
    (snap.interactions || []).forEach(function (ix) {
      if (!ix) return;
      portIds[String(ix.portId || ix.id)] = true;
    });

    /* Keep hotspots / non-canvas overlays; replace entire free overlay set. */
    var others = (n.config.interactions || []).filter(function (ix) {
      return !isSceneFreeOverlayInteraction(ix);
    });
    var restored = (snap.interactions || []).map(function (ix) {
      return JSON.parse(JSON.stringify(ix));
    });
    n.config.interactions = others.concat(restored);

    /* Drop previous button edges for this scene, then restore snapshot edges */
    exp.edges = (exp.edges || []).filter(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId;
      if (String(from) !== String(snap.sceneId)) return true;
      return !portIds[String(pid)];
    });
    (snap.edges || []).forEach(function (ed) {
      exp.edges.push(JSON.parse(JSON.stringify(ed)));
    });

    restored.forEach(function (ix) {
      ensureButtonVisualDefaults(ix);
    });
    mirrorHotspotsFromInteractions(n);
    syncScenePorts(n);

    if (exp.canvas) {
      exp.canvas.selectedButtonId = snap.selectedButtonId || null;
      exp.canvas.selectedButtonIds = Array.isArray(snap.selectedButtonIds)
        ? snap.selectedButtonIds.slice()
        : (snap.selectedButtonId ? [snap.selectedButtonId] : []);
    }

    /* Defensive: nodes must never change */
    if ((exp.nodes || []).length !== nodeCount) {
      return false;
    }
    return true;
  }

  function ensureHubConfig(n) {
    if (!n || !n.config) return null;
    if (!n.config.hub || typeof n.config.hub !== 'object') {
      n.config.hub = {
        enabled: false,
        activeFloor: null,
        visualMode: '3d',
        floors: [],
        navigationStackKey: 'navigationStack',
        structureScope: null,
        selectorType: 'plantas',
        options: [],
        appearance: {
          style: 'numbers',
          position: 'top-right',
          alignment: 'horizontal',
          gap: 8,
          size: 32
        }
      };
    }
    if (!Array.isArray(n.config.hub.floors)) n.config.hub.floors = [];
    if (!n.config.hub.visualMode) n.config.hub.visualMode = '3d';
    if (!n.config.hub.navigationStackKey) n.config.hub.navigationStackKey = 'navigationStack';
    if (n.config.hub.structureScope === undefined) n.config.hub.structureScope = null;
    /* V6.0.05 — smart selector (compat: legacy floors/scope kept) */
    if (!n.config.hub.selectorType) n.config.hub.selectorType = 'plantas';
    if (!Array.isArray(n.config.hub.options)) n.config.hub.options = [];
    /* V6.0.07 — selectedPlants = ordered Media Plantas 2D ids (runtime prep).
       undefined = not seeded yet; [] = none selected on purpose. */
    if (
      n.config.hub.selectedPlants != null &&
      !Array.isArray(n.config.hub.selectedPlants)
    ) {
      n.config.hub.selectedPlants = [];
    }
    if (!n.config.hub.appearance || typeof n.config.hub.appearance !== 'object') {
      n.config.hub.appearance = {
        style: 'numbers',
        position: 'top-right',
        alignment: 'horizontal',
        gap: 8,
        size: 32
      };
    } else {
      var ap = n.config.hub.appearance;
      if (!ap.style) ap.style = 'numbers';
      if (!ap.position) ap.position = 'top-right';
      if (!ap.alignment) ap.alignment = 'horizontal';
      if (ap.gap == null || isNaN(Number(ap.gap))) ap.gap = 8;
      if (ap.size == null || isNaN(Number(ap.size))) ap.size = 32;
    }
    return n.config.hub;
  }

  function deriveHubOptionLabel(node, index) {
    var name = String((node && (node.label || node.typeLabel)) || '');
    var m = name.match(/(?:planta|piso|floor|nivel|torre|tipolog[ií]a)\s*[-:]?\s*(\d+)/i) ||
      name.match(/\b(\d+)\s*$/) ||
      name.match(/\b(\d+)\b/);
    if (m && m[1]) return String(m[1]);
    if (name) {
      var short = name.replace(/^.*[-–—]\s*/, '').trim();
      if (short && short.length <= 16) return short;
    }
    return String(index + 1);
  }

  function looksLikeHubSelectorTarget(node, selectorType, hubNode) {
    if (!node || !hubNode || node.id === hubNode.id) return false;
    if (node.kind === 'hero' || node.role === 'action' || node.kind === 'action') return false;
    if (node.orphaned) return false;
    var label = String(node.label || '').toLowerCase();
    var typeLabel = String(node.typeLabel || '').toLowerCase();
    var kind = String(node.kind || '').toLowerCase();
    var blob = label + ' ' + typeLabel + ' ' + kind;
    var cfg = node.config || {};
    var ref = cfg.structureRef || {};
    var refType = String(ref.type || '').toLowerCase();

    if (selectorType === 'tipologias') {
      return /tipolog|modelo|producto/.test(blob) || refType === 'tipologia' ||
        kind === 'structure';
    }
    if (selectorType === 'torres') {
      return /torre|tower|edificio/.test(blob) || refType === 'torre';
    }
    if (selectorType === 'pisos') {
      return /piso|nivel|floor|planta/.test(blob) || refType === 'piso' || !!cfg.hubFloorKey;
    }
    /* plantas (default) + custom */
    if (cfg.hubFloorKey) return true;
    if (refType === 'planta' || refType === 'piso') return true;
    if (kind === 'planta-3d' || kind === 'plan' || kind === 'vista') return true;
    if (/planta|piso|floor|plan|nivel/.test(blob)) return true;
    if (isSceneKind(node.kind) && /hub/i.test(String(hubNode.label || '')) &&
      !/hub/i.test(String(node.label || ''))) {
      /* Sibling scenes under same flow branch often share a prefix with the HUB */
      var hubBase = String(hubNode.label || '').replace(/\s*·?\s*hub\s*$/i, '').trim().toLowerCase();
      if (hubBase && label.indexOf(hubBase.split(/\s+/)[0]) === 0) return true;
    }
    /* Same canvas group as the HUB → candidate floor/plan scenes */
    if (
      hubNode.parentId &&
      node.parentId === hubNode.parentId &&
      isSceneKind(node.kind) &&
      (kind === 'plan' || kind === 'planta-3d' || kind === 'image' || kind === 'scene' || kind === 'vista')
    ) {
      return true;
    }
    return false;
  }

  function derivePlantAssetLabel(asset, index) {
    var meta = (asset && asset.metadata) || {};
    var name = String(meta.label || meta.name || meta.title || '').trim();
    if (!name && asset && asset.filename) {
      name = String(asset.filename).replace(/\.[^.]+$/, '').trim();
    }
    var m = name.match(/(?:planta|piso|floor|nivel)\s*[-:]?\s*(\d+)/i) ||
      name.match(/\b(\d+)\s*$/) ||
      name.match(/\b(\d+)\b/);
    if (m && m[1]) return String(m[1]);
    if (name) {
      var short = name.replace(/^.*[-–—]\s*/, '').trim();
      if (short && short.length <= 24) return short;
      return name.slice(0, 24);
    }
    return String(index + 1);
  }

  function derivePlantAssetTitle(asset, index) {
    var meta = (asset && asset.metadata) || {};
    var name = String(meta.label || meta.name || meta.title || '').trim();
    if (!name && asset && asset.filename) {
      name = String(asset.filename).replace(/\.[^.]+$/, '').trim();
    }
    if (name) return name;
    return 'Planta ' + (index + 1);
  }

  function listMediaPlantas2d(state) {
    if (typeof MediaNodesEngine !== 'undefined') {
      if (MediaNodesEngine.listPlantas2d) return MediaNodesEngine.listPlantas2d(state) || [];
      if (MediaNodesEngine.listInventoryByCategory) {
        return MediaNodesEngine.listInventoryByCategory(state, 'plans2d') || [];
      }
    }
    return [];
  }

  function enrichHubPlantOption(asset, index, enabled) {
    if (!asset) return null;
    var thumb = asset.thumbnailUrl || asset.publicUrl || null;
    var synced = asset.status === 'synced' || asset.status === 'local' || !!(asset.publicUrl || asset.filename);
    return {
      id: 'opt-' + asset.id,
      plantId: asset.id,
      label: derivePlantAssetLabel(asset, index),
      targetLabel: derivePlantAssetTitle(asset, index),
      targetNodeId: null,
      targetKind: 'media-plant',
      filename: asset.filename || null,
      thumbnailUrl: thumb,
      publicUrl: asset.publicUrl || null,
      status: asset.status || (synced ? 'synced' : 'pending'),
      statusLabel: synced ? 'En Media' : 'Pendiente',
      hasMedia: !!synced,
      enabled: !!enabled,
      source: 'media-plans2d'
    };
  }

  /**
   * Official Plantas 2D cards for the HUB inspector (Media inventory only).
   * selectedPlants order first (enabled), then remaining inventory (disabled).
   */
  function listHubPlantasCards(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return [];
    var hub = ensureHubConfig(n);
    var inventory = listMediaPlantas2d(state);
    var byId = {};
    inventory.forEach(function (a) {
      if (a && a.id != null) byId[String(a.id)] = a;
    });
    var selected = Array.isArray(hub.selectedPlants) ? hub.selectedPlants.slice() : [];
    var seen = {};
    var cards = [];
    selected.forEach(function (id, idx) {
      var asset = byId[String(id)];
      if (!asset) return;
      seen[String(asset.id)] = true;
      cards.push(enrichHubPlantOption(asset, idx, true));
    });
    inventory.forEach(function (asset, idx) {
      if (!asset || asset.id == null || seen[String(asset.id)]) return;
      cards.push(enrichHubPlantOption(asset, selected.length + idx, false));
    });
    return cards.filter(Boolean);
  }

  /**
   * Sync HUB plant selector from Media → Plantas 2D only (no canvas discovery).
   * Persists hub.selectedPlants (ordered ids) and hub.options (selected only).
   */
  function syncHubPlantasFromMedia(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return null;
    var hub = ensureHubConfig(n);
    if (!hub) return null;
    var inventory = listMediaPlantas2d(state);
    var byId = {};
    inventory.forEach(function (a) {
      if (a && a.id != null) byId[String(a.id)] = a;
    });

    function resolvePlant(id) {
      if (id == null) return null;
      return byId[String(id)] || null;
    }

    if (!Array.isArray(hub.selectedPlants)) {
      hub.selectedPlants = inventory.map(function (a) { return a.id; });
    } else {
      var cleaned = [];
      hub.selectedPlants.forEach(function (id) {
        var asset = resolvePlant(id);
        if (asset && cleaned.indexOf(asset.id) === -1) cleaned.push(asset.id);
      });
      hub.selectedPlants = cleaned;
    }

    hub.options = hub.selectedPlants.map(function (id, idx) {
      return enrichHubPlantOption(resolvePlant(id), idx, true);
    }).filter(Boolean);

    return hub;
  }

  function setHubPlantSelected(state, nodeId, plantId, enabled) {
    var n = getNode(state, nodeId);
    if (!n || !plantId) return null;
    var hub = enableHubOnScene(n);
    syncHubPlantasFromMedia(state, n);
    var list = hub.selectedPlants || [];
    var idx = -1;
    var i;
    for (i = 0; i < list.length; i++) {
      if (String(list[i]) === String(plantId)) { idx = i; break; }
    }
    if (enabled) {
      if (idx === -1) {
        var canon = plantId;
        var inv = listMediaPlantas2d(state);
        for (i = 0; i < inv.length; i++) {
          if (inv[i] && String(inv[i].id) === String(plantId)) {
            canon = inv[i].id;
            break;
          }
        }
        list.push(canon);
      }
    } else if (idx !== -1) {
      list.splice(idx, 1);
    }
    hub.selectedPlants = list;
    syncHubPlantasFromMedia(state, n);
    return hub;
  }

  function moveHubPlant(state, nodeId, plantId, direction) {
    var n = getNode(state, nodeId);
    if (!n || !plantId) return null;
    var hub = enableHubOnScene(n);
    syncHubPlantasFromMedia(state, n);
    var list = hub.selectedPlants || [];
    var idx = -1;
    var i;
    for (i = 0; i < list.length; i++) {
      if (String(list[i]) === String(plantId)) { idx = i; break; }
    }
    if (idx === -1) return hub;
    var dir = direction === 'up' || direction === -1 ? -1 : 1;
    var next = idx + dir;
    if (next < 0 || next >= list.length) return hub;
    var tmp = list[idx];
    list[idx] = list[next];
    list[next] = tmp;
    hub.selectedPlants = list;
    syncHubPlantasFromMedia(state, n);
    return hub;
  }

  /**
   * Discover HUB selector targets from the Experiencia graph.
   * Used for tipologías / torres / pisos — NOT for plantas (Media SSOT).
   */
  function detectHubSelectorOptions(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return [];
    var hub = ensureHubConfig(n);
    var selectorType = (hub && hub.selectorType) || 'plantas';
    if (selectorType === 'plantas') {
      syncHubPlantasFromMedia(state, n);
      return (hub && hub.options) || [];
    }
    var exp = ensureState(state);
    var nodes = exp.nodes || [];
    var edges = exp.edges || [];
    var seen = {};
    var ordered = [];

    function addTarget(target) {
      if (!target || seen[target.id]) return;
      if (target.id === n.id) return;
      if (target.kind === 'hero' || target.role === 'action' || target.kind === 'action') return;
      if (target.orphaned) return;
      if (looksLikeHubSelectorTarget(target, selectorType, n)) {
        seen[target.id] = true;
        ordered.push(target);
        return;
      }
      if (isSceneKind(target.kind) || target.kind === 'structure' || target.kind === 'group') {
        if (target.kind === 'animacion' || target.kind === 'video' || target.kind === 'transicion') {
          return;
        }
        seen[target.id] = true;
        ordered.push(target);
      }
    }

    function edgeEnds(ed) {
      return {
        from: ed.sourceNodeId || ed.from || ed.sourceId || null,
        to: ed.targetNodeId || ed.to || ed.targetId || null
      };
    }

    edges.forEach(function (ed) {
      var e = edgeEnds(ed);
      if (e.from === n.id && e.to) addTarget(getNode(state, e.to));
      if (e.to === n.id && e.from) addTarget(getNode(state, e.from));
    });

    nodes.forEach(function (node) {
      if (!node || node.id === n.id) return;
      var cfg = node.config || {};
      if (cfg.hubFloorKey) addTarget(node);
      if (cfg.structureRef && looksLikeHubSelectorTarget(node, selectorType, n)) {
        addTarget(node);
      }
    });

    if (hub.structureScope && typeof listFloorsForScope === 'function') {
      var floors = listFloorsForScope(state, hub.structureScope) || [];
      floors.forEach(function (f) {
        if (!f) return;
        var key = String(f.key || '');
        var flabel = String(f.label || '').toLowerCase();
        nodes.forEach(function (node) {
          if (!node || node.id === n.id) return;
          var cfg = node.config || {};
          if (cfg.hubFloorKey && String(cfg.hubFloorKey) === key) {
            addTarget(node);
            return;
          }
          var nl = String(node.label || '').toLowerCase();
          if (flabel && (nl === flabel || nl.indexOf(flabel) !== -1 || flabel.indexOf(nl) !== -1)) {
            addTarget(node);
          }
        });
      });
    }

    var adj = {};
    edges.forEach(function (ed) {
      var e = edgeEnds(ed);
      if (!e.from || !e.to) return;
      if (!adj[e.from]) adj[e.from] = [];
      if (!adj[e.to]) adj[e.to] = [];
      adj[e.from].push(e.to);
      adj[e.to].push(e.from);
    });
    var queue = [n.id];
    var depth = {};
    depth[n.id] = 0;
    while (queue.length) {
      var cur = queue.shift();
      var d = depth[cur] || 0;
      if (d >= 3) continue;
      (adj[cur] || []).forEach(function (nid) {
        if (depth[nid] != null) return;
        depth[nid] = d + 1;
        var t = getNode(state, nid);
        if (t && looksLikeHubSelectorTarget(t, selectorType, n)) addTarget(t);
        if (depth[nid] < 3) queue.push(nid);
      });
    }

    nodes.forEach(function (node) {
      if (looksLikeHubSelectorTarget(node, selectorType, n)) addTarget(node);
    });

    ordered.sort(function (a, b) {
      var la = deriveHubOptionLabel(a, 0);
      var lb = deriveHubOptionLabel(b, 0);
      var na = parseInt(la, 10);
      var nb = parseInt(lb, 10);
      if (!isNaN(na) && !isNaN(nb) && String(na) === la && String(nb) === lb) return na - nb;
      return String(a.label || '').localeCompare(String(b.label || ''), 'es', { sensitivity: 'base' });
    });

    return ordered.map(function (target, idx) {
      return enrichHubOption(state, target, idx);
    });
  }

  function syncHubSmartSelector(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return null;
    var hub = ensureHubConfig(n);
    if (!hub) return null;
    if ((hub.selectorType || 'plantas') === 'plantas') {
      return syncHubPlantasFromMedia(state, n);
    }
    hub.options = detectHubSelectorOptions(state, n);
    return hub;
  }

  function hubSelectorStatus(hub) {
    var type = (hub && hub.selectorType) || 'plantas';
    var count = type === 'plantas'
      ? ((hub && Array.isArray(hub.selectedPlants)) ? hub.selectedPlants.length
        : ((hub && Array.isArray(hub.options)) ? hub.options.length : 0))
      : ((hub && Array.isArray(hub.options)) ? hub.options.length : 0);
    var noun = type === 'tipologias' ? 'tipologías'
      : (type === 'torres' ? 'torres'
        : (type === 'pisos' ? 'pisos'
          : (type === 'plantas' ? 'plantas' : 'escenas')));
    if (type === 'plantas' && count <= 0) {
      return {
        level: 'warn',
        code: 'no-targets',
        message: 'No hay plantas en Media → Plantas 2D, o ninguna está seleccionada.'
      };
    }
    if (count <= 0) {
      return {
        level: 'warn',
        code: 'no-targets',
        message: 'No se encontraron ' + noun + ' relacionadas con este HUB.'
      };
    }
    if (count === 1) {
      return {
        level: 'warn',
        code: 'need-two',
        message: 'Se necesitan al menos dos ' + noun + ' para generar un selector.'
      };
    }
    if (type === 'plantas') {
      return {
        level: 'ok',
        code: 'ready',
        message: 'Selector desde Media · ' + count + ' plantas activas'
      };
    }
    return {
      level: 'ok',
      code: 'ready',
      message: 'Selector generado automáticamente · ' + count + ' ' + noun
    };
  }

  function setHubSelectorType(state, nodeId, type) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var hub = enableHubOnScene(n);
    var allowed = { plantas: 1, tipologias: 1, torres: 1, pisos: 1, custom: 1 };
    var next = String(type || 'plantas');
    hub.selectorType = allowed[next] ? next : 'plantas';
    syncHubSmartSelector(state, n);
    return hub;
  }

  function setHubAppearance(state, nodeId, patch) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var hub = enableHubOnScene(n);
    var ap = hub.appearance;
    patch = patch || {};
    if (patch.style != null) {
      var styles = { numbers: 1, chips: 1, thumbnails: 1 };
      ap.style = styles[patch.style] ? patch.style : ap.style;
    }
    if (patch.position != null) {
      var positions = {
        'top-left': 1, 'top-right': 1, 'bottom-left': 1, 'bottom-right': 1
      };
      ap.position = positions[patch.position] ? patch.position : ap.position;
    }
    if (patch.alignment != null) {
      ap.alignment = patch.alignment === 'vertical' ? 'vertical' : 'horizontal';
    }
    if (patch.gap != null) {
      ap.gap = Math.max(0, Math.min(40, Number(patch.gap) || 0));
    }
    if (patch.size != null) {
      ap.size = Math.max(20, Math.min(64, Number(patch.size) || 32));
    }
    return hub;
  }

  function enableHubOnScene(n) {
    var hub = ensureHubConfig(n);
    if (hub) hub.enabled = true;
    return hub;
  }

  function setHubStructureScope(state, nodeId, scopeOpt) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var hub = enableHubOnScene(n);
    if (!scopeOpt) {
      hub.structureScope = null;
      return hub;
    }
    hub.structureScope = {
      scopeId: scopeOpt.id || scopeOpt.scopeId || null,
      stageId: scopeOpt.stageId || null,
      componentId: scopeOpt.componentId || null,
      structureKey: scopeOpt.key || scopeOpt.structureKey || null,
      label: scopeOpt.label || null,
      kind: scopeOpt.kind || null,
      tipologiaId: scopeOpt.tipologiaId || null,
      nodeId: scopeOpt.nodeId || null
    };
    /* Refresh floor keys from Estructura without wiping asset bindings */
    syncHubFloorsFromScope(state, n);
    if (hub.structureScope.kind === 'tipologia') {
      autoBindHubMediaAssets(state, n);
    }
    return hub;
  }

  function syncHubFloorsFromScope(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return null;
    var hub = ensureHubConfig(n);
    if (!hub || !hub.structureScope) return hub;
    var floors = listFloorsForScope(state, hub.structureScope) || [];
    var byKey = {};
    (hub.floors || []).forEach(function (f) {
      if (f && f.key) byKey[String(f.key)] = f;
    });
    hub.floors = floors.map(function (f) {
      var prev = byKey[String(f.key)];
      return {
        key: f.key,
        label: f.label,
        asset3dId: prev ? prev.asset3dId : null,
        asset2dId: prev ? prev.asset2dId : null,
        unitsPerFloor: f.unitsPerFloor != null ? f.unitsPerFloor : null
      };
    });
    if (hub.activeFloor && !findHubFloor(hub, hub.activeFloor)) {
      hub.activeFloor = hub.floors.length ? hub.floors[0].key : null;
    }
    if (!hub.activeFloor && hub.floors.length) hub.activeFloor = hub.floors[0].key;
    return hub;
  }

  function findHubFloor(hub, floorKey) {
    if (!hub || !floorKey) return null;
    var key = String(floorKey);
    for (var i = 0; i < (hub.floors || []).length; i++) {
      var f = hub.floors[i];
      if (!f) continue;
      if (String(f.key) === key || String(f.label) === key) return f;
    }
    return null;
  }

  function setHubActiveFloor(state, nodeId, floorKey) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var hub = enableHubOnScene(n);
    hub.activeFloor = floorKey != null ? String(floorKey) : null;
    return hub;
  }

  function setHubVisualMode(state, nodeId, mode) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var hub = enableHubOnScene(n);
    hub.visualMode = (String(mode || '').toLowerCase() === '2d') ? '2d' : '3d';
    return hub;
  }

  function upsertHubFloor(state, nodeId, floorPartial) {
    var n = getNode(state, nodeId);
    if (!n || !floorPartial) return null;
    var hub = enableHubOnScene(n);
    var key = String(floorPartial.key || floorPartial.label || uid('floor'));
    var existing = findHubFloor(hub, key);
    if (existing) {
      if (floorPartial.label != null) existing.label = floorPartial.label;
      if (floorPartial.asset3dId !== undefined) existing.asset3dId = floorPartial.asset3dId;
      if (floorPartial.asset2dId !== undefined) existing.asset2dId = floorPartial.asset2dId;
      return existing;
    }
    var row = {
      key: key,
      label: floorPartial.label || key,
      asset3dId: floorPartial.asset3dId || null,
      asset2dId: floorPartial.asset2dId || null
    };
    hub.floors.push(row);
    if (!hub.activeFloor) hub.activeFloor = key;
    return row;
  }

  function makeInteraction(partial) {
    var type = String((partial && partial.type) || 'HOTSPOT').toUpperCase();
    var id = (partial && partial.id) || uid(type === 'HOTSPOT' ? 'hs' : 'ix');
    var portId = (partial && partial.portId) || id;
    var cfg = (partial && partial.config && typeof partial.config === 'object')
      ? partial.config
      : {};
    var label = (partial && partial.label != null) ? String(partial.label) : type;
    var ix = {
      id: id,
      type: type,
      label: label,
      enabled: partial && partial.enabled === false ? false : true,
      portId: portId,
      group: (partial && partial.group) || interactionGroup(type),
      behavior: (partial && partial.behavior) || null,
      actionType: (partial && partial.actionType) || null,
      structureRef: (partial && partial.structureRef) || null,
      structureKey: (partial && partial.structureKey) ||
        (partial && partial.structureRef && partial.structureRef.key) || null,
      structureId: (partial && partial.structureId) ||
        (partial && partial.structureRef && partial.structureRef.id) || null,
      structureKind: (partial && partial.structureKind) ||
        (partial && partial.structureRef && partial.structureRef.kind) || null,
      structureLabel: (partial && partial.structureLabel) ||
        (partial && partial.structureRef && partial.structureRef.label) || null,
      legacyNodeId: (partial && partial.legacyNodeId) || null,
      /* Extensible hotspot / control placement (editor visual futuro) */
      x: partial && partial.x != null ? partial.x : (cfg.x != null ? cfg.x : null),
      y: partial && partial.y != null ? partial.y : (cfg.y != null ? cfg.y : null),
      panoYaw: partial && partial.panoYaw != null ? partial.panoYaw : null,
      panoPitch: partial && partial.panoPitch != null ? partial.panoPitch : null,
      icon: (partial && partial.icon) || null,
      slot: (partial && partial.slot) || null,
      assetId: (partial && partial.assetId) || null,
      config: cfg
    };
    /* V6.1.02 — preserve BUTTON visual props across normalize (Style.v3 overlay) */
    if (partial) {
      if (partial.style != null) ix.style = partial.style;
      else if (cfg.style != null) ix.style = cfg.style;
      if (partial.rotation != null) ix.rotation = partial.rotation;
      else if (cfg.rotation != null) ix.rotation = cfg.rotation;
      if (partial.positionMode != null) ix.positionMode = partial.positionMode;
      else if (cfg.positionMode != null) ix.positionMode = cfg.positionMode;
      if (partial.anchor != null) ix.anchor = partial.anchor;
      else if (cfg.anchor != null) ix.anchor = cfg.anchor;
      if (partial.marginX != null) ix.marginX = partial.marginX;
      else if (cfg.marginX != null) ix.marginX = cfg.marginX;
      if (partial.marginY != null) ix.marginY = partial.marginY;
      else if (cfg.marginY != null) ix.marginY = cfg.marginY;
      if (partial.positionInitialized != null) ix.positionInitialized = partial.positionInitialized;
      else if (cfg.positionInitialized != null) ix.positionInitialized = cfg.positionInitialized;
      /* V6.2.00 — polygon mask hotspots */
      if (partial.shape != null) ix.shape = partial.shape;
      else if (cfg.shape != null) ix.shape = cfg.shape;
      if (partial.polygon != null) ix.polygon = partial.polygon;
      else if (cfg.polygon != null) ix.polygon = cfg.polygon;
      if (partial.name != null) ix.name = partial.name;
      else if (cfg.name != null) ix.name = cfg.name;
      if (partial.hotspotKind != null) ix.hotspotKind = partial.hotspotKind;
      else if (cfg.hotspotKind != null) ix.hotspotKind = cfg.hotspotKind;
      if (partial.opacity != null) ix.opacity = partial.opacity;
      else if (cfg.opacity != null) ix.opacity = cfg.opacity;
      if (partial.borderWidth != null) ix.borderWidth = partial.borderWidth;
      else if (cfg.borderWidth != null) ix.borderWidth = cfg.borderWidth;
      if (partial.animation != null) ix.animation = partial.animation;
      else if (cfg.animation != null) ix.animation = cfg.animation;
      if (partial.color != null) ix.color = partial.color;
      else if (cfg.color != null) ix.color = cfg.color;
      if (partial.width != null) ix.width = partial.width;
      else if (cfg.width != null) ix.width = cfg.width;
      if (partial.height != null) ix.height = partial.height;
      else if (cfg.height != null) ix.height = cfg.height;
      if (partial.shapeContentBox != null) ix.shapeContentBox = !!partial.shapeContentBox;
      else if (cfg.shapeContentBox != null) ix.shapeContentBox = !!cfg.shapeContentBox;
      if (partial.shapeStretchX != null) ix.shapeStretchX = Number(partial.shapeStretchX);
      else if (cfg.shapeStretchX != null) ix.shapeStretchX = Number(cfg.shapeStretchX);
      if (partial.shapeStretchY != null) ix.shapeStretchY = Number(partial.shapeStretchY);
      else if (cfg.shapeStretchY != null) ix.shapeStretchY = Number(cfg.shapeStretchY);
      if (partial.fill != null) ix.fill = partial.fill;
      else if (cfg.fill != null) ix.fill = cfg.fill;
      if (partial.stroke != null) ix.stroke = partial.stroke;
      else if (cfg.stroke != null) ix.stroke = cfg.stroke;
      if (partial.strokeWidth != null) ix.strokeWidth = partial.strokeWidth;
      else if (cfg.strokeWidth != null) ix.strokeWidth = cfg.strokeWidth;
      if (partial.borderRadius != null) ix.borderRadius = partial.borderRadius;
      else if (cfg.borderRadius != null) ix.borderRadius = cfg.borderRadius;
      if (partial.fontSize != null) ix.fontSize = partial.fontSize;
      else if (cfg.fontSize != null) ix.fontSize = cfg.fontSize;
      if (partial.memberIds != null && Array.isArray(partial.memberIds)) {
        ix.memberIds = partial.memberIds.slice();
      }
      if (partial.groupId != null) ix.groupId = partial.groupId;
      if (partial.localX != null) ix.localX = partial.localX;
      if (partial.localY != null) ix.localY = partial.localY;
      if (partial.localRotation != null) ix.localRotation = partial.localRotation;
      if (partial._baseWidth != null) ix._baseWidth = partial._baseWidth;
      if (partial._baseHeight != null) ix._baseHeight = partial._baseHeight;
      if (partial.locked != null) ix.locked = !!partial.locked;
      else if (cfg.locked != null) ix.locked = !!cfg.locked;
      if (partial.visible != null) ix.visible = !!partial.visible;
      else if (cfg.visible != null) ix.visible = !!cfg.visible;
    }
    /* Button colors come from Theme — strip only on BUTTON */
    if (String(ix.type || '').toUpperCase() === 'BUTTON') {
      if (ix.color != null) delete ix.color;
      if (cfg.color != null) delete cfg.color;
    }
    return ix;
  }

  function interactionTypeLabel(type) {
    return INTERACTION_TYPE_LABEL[String(type || '').toUpperCase()] || String(type || 'Elemento');
  }

  /* ── projectAssets: biblioteca compartida (JSON, sin schema Supabase) ── */
  function ensureProjectAssets(state) {
    if (!state.projectAssets || typeof state.projectAssets !== 'object') {
      state.projectAssets = { version: 1, byId: {} };
    }
    if (!state.projectAssets.byId || typeof state.projectAssets.byId !== 'object') {
      state.projectAssets.byId = {};
    }
    if (state.projectAssets.version == null) state.projectAssets.version = 1;
    return state.projectAssets;
  }

  function makeAsset(partial) {
    var now = new Date().toISOString();
    var id = (partial && partial.id) || uid('asset');
    return {
      id: id,
      type: (partial && partial.type) || 'image',
      filename: (partial && partial.filename) || (partial && partial.fileName) || null,
      provider: (partial && partial.provider) || 'local',
      storagePath: (partial && partial.storagePath) || null,
      publicUrl: (partial && partial.publicUrl) || null,
      thumbnailUrl: (partial && partial.thumbnailUrl) || null,
      status: (partial && partial.status) || 'local',
      mimeType: (partial && partial.mimeType) || null,
      width: partial && partial.width != null ? partial.width : null,
      height: partial && partial.height != null ? partial.height : null,
      duration: partial && partial.duration != null ? partial.duration : null,
      size: partial && partial.size != null ? partial.size : null,
      category: (partial && partial.category) || null,
      archivoId: (partial && partial.archivoId) || null,
      nodeId: (partial && partial.nodeId) || (partial && partial.node_id) || null,
      projectId: (partial && partial.projectId) || (partial && partial.project_id) || null,
      entityRef: (partial && partial.entityRef) || null,
      planKind: (partial && partial.planKind) || null,
      uiRole: !!(partial && partial.uiRole),
      metadata: (partial && partial.metadata) || null,
      sortOrder: partial && partial.sortOrder != null ? partial.sortOrder : 0,
      orphan: !!(partial && partial.orphan),
      updatedAt: (partial && partial.updatedAt) || now,
      createdAt: (partial && partial.createdAt) || now
    };
  }

  function getAsset(state, assetId) {
    if (!assetId) return null;
    var lib = ensureProjectAssets(state);
    return lib.byId[assetId] || null;
  }

  function upsertAsset(state, partial) {
    var lib = ensureProjectAssets(state);
    var asset = makeAsset(partial);
    var prev = lib.byId[asset.id];
    if (prev) {
      Object.keys(asset).forEach(function (k) {
        if (asset[k] != null) prev[k] = asset[k];
      });
      prev.updatedAt = new Date().toISOString();
      return prev;
    }
    lib.byId[asset.id] = asset;
    return asset;
  }

  function guessAssetType(kind, filename) {
    if (kind === 'video' || kind === 'animacion') return 'video';
    if (kind === 'pano360') return 'pano360';
    if (kind === 'plan' || kind === 'planta-3d') return 'plan';
    var name = String(filename || '').toLowerCase();
    if (/\.(mp4|webm|mov)$/.test(name)) return 'video';
    if (/\.(pdf|doc|docx)$/.test(name)) return 'document';
    return 'image';
  }

  function assetStatusLabel(status) {
    var s = String(status || 'local');
    if (s === 'synced') return '✓ Sincronizado';
    if (s === 'uploading' || s === 'processing' || s === 'pending') return 'Sincronizando…';
    if (s === 'error') return 'Error de sincronización';
    if (s === 'local') return 'Local';
    return s;
  }

  /** Soft-link legacy fileName → assetId without breaking nodes. */
  function ensureNodeAssetRef(state, n) {
    if (!n || !isSceneKind(n.kind) || n.kind === 'hero') return n;
    if (!n.config) n.config = {};
    if (n.config.assetId && getAsset(state, n.config.assetId)) {
      var a = getAsset(state, n.config.assetId);
      if (!n.config.fileName && a.filename) n.config.fileName = a.filename;
      return n;
    }
    if (n.config.fileName) {
      var found = null;
      var lib = ensureProjectAssets(state);
      Object.keys(lib.byId).forEach(function (id) {
        if (found) return;
        if (lib.byId[id].filename === n.config.fileName) found = lib.byId[id];
      });
      if (!found) {
        found = upsertAsset(state, {
          type: guessAssetType(n.kind, n.config.fileName),
          filename: n.config.fileName,
          provider: 'local',
          status: 'local'
        });
      }
      n.config.assetId = found.id;
    }
    return n;
  }

  function assignAssetToNode(state, nodeId, assetOrPartial) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    if (!n.config) n.config = {};
    var asset;
    if (typeof assetOrPartial === 'string') {
      asset = getAsset(state, assetOrPartial);
    } else {
      var patch = Object.assign({}, assetOrPartial || {});
      if (!patch.id && n.config.assetId) patch.id = n.config.assetId;
      if (!patch.type) patch.type = guessAssetType(n.kind, patch.filename || n.config.fileName);
      asset = upsertAsset(state, patch);
    }
    if (!asset) return null;
    n.config.assetId = asset.id;
    if (asset.filename) n.config.fileName = asset.filename;
    if (asset.status === 'synced' || asset.status === 'local') {
      if (n.status === 'pending' && asset.filename) n.status = 'ready';
    }
    return asset;
  }

  function clearNodeAsset(state, nodeId) {
    var n = getNode(state, nodeId);
    if (!n || !n.config) return null;
    var prevId = n.config.assetId || null;
    n.config.assetId = null;
    n.config.fileName = null;
    /* No hard-delete del asset en projectAssets */
    return prevId;
  }

  function resolveSceneMedia(state, n) {
    if (!n) {
      return {
        assetId: null, filename: null, status: 'pending',
        statusLabel: 'Pendiente', thumbnailUrl: null, publicUrl: null, hasMedia: false
      };
    }
    ensureNodeAssetRef(state, n);
    var hub = n.config && n.config.hub;
    var asset = null;
    if (hub && hub.enabled && hub.activeFloor) {
      var floor = findHubFloor(hub, hub.activeFloor);
      if (floor) {
        var preferId = (hub.visualMode === '2d')
          ? (floor.asset2dId || floor.asset3dId)
          : (floor.asset3dId || floor.asset2dId);
        if (preferId) asset = getAsset(state, preferId);
      }
    }
    if (!asset) {
      asset = n.config && n.config.assetId ? getAsset(state, n.config.assetId) : null;
    }
    var filename = (asset && asset.filename) || (n.config && n.config.fileName) || null;
    var status = asset ? asset.status : (filename ? 'local' : 'pending');
    return {
      assetId: asset ? asset.id : (n.config && n.config.assetId) || null,
      filename: filename,
      status: status,
      statusLabel: filename ? assetStatusLabel(status) : 'Pendiente',
      thumbnailUrl: (asset && asset.thumbnailUrl) || null,
      publicUrl: (asset && asset.publicUrl) || null,
      hasMedia: !!filename,
      provider: (asset && asset.provider) || null,
      activeFloor: hub && hub.enabled ? hub.activeFloor : null,
      visualMode: hub && hub.enabled ? hub.visualMode : null
    };
  }

  function listProjectAssets(state, filterType) {
    var lib = ensureProjectAssets(state);
    return Object.keys(lib.byId).map(function (id) {
      return lib.byId[id];
    }).filter(function (a) {
      if (!filterType) return true;
      return a.type === filterType;
    });
  }

  /**
   * Assets selectable in Experiencia = Media inventory only (SSOT).
   * Never Bunny listings, never orphan/historical projectAssets.
   */
  function listSelectableMediaAssets(state, filterType) {
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.listInventoryAssets) {
      return MediaNodesEngine.listInventoryAssets(state, filterType) || [];
    }
    return listProjectAssets(state, filterType).filter(function (a) {
      return a && !a.orphan && a.nodeId && (a.filename || a.publicUrl || a.storagePath);
    });
  }

  function mirrorHotspotsFromInteractions(n) {
    if (!n || !n.config) return;
    var ixs = n.config.interactions || [];
    n.config.hotspots = ixs.filter(function (ix) {
      return String(ix.type || '').toUpperCase() === 'HOTSPOT';
    }).map(function (ix) {
      return { id: ix.id, label: ix.label };
    });
  }

  /** Ensure config.interactions[] + sync ports for scene nodes. */
  function normalizeSceneInteractions(n) {
    if (!n || !isSceneKind(n.kind)) return n;
    if (!n.config) n.config = {};
    if (!Array.isArray(n.config.interactions)) n.config.interactions = [];
    if (n.config.hub) ensureHubConfig(n);

    /* Migrate legacy config.hotspots → interactions */
    if (Array.isArray(n.config.hotspots) && n.config.hotspots.length) {
      n.config.hotspots.forEach(function (hs) {
        if (!hs || !hs.id) return;
        var exists = n.config.interactions.some(function (ix) {
          return ix.id === hs.id || ix.portId === ('hs-' + hs.id) || ix.portId === hs.id;
        });
        if (exists) return;
        n.config.interactions.push(makeInteraction({
          id: hs.id,
          type: 'HOTSPOT',
          label: hs.label || 'Hotspot',
          portId: 'hs-' + hs.id,
          group: 'content'
        }));
      });
    }

    n.config.interactions = n.config.interactions.map(function (ix) {
      var m = makeInteraction(ix);
      /* Normalize legacy hotspots group name */
      if (m.group === 'hotspots') m.group = 'content';
      return m;
    });

    /* Auto-enable hub when advanced planta elements exist */
    var hasHubEls = n.config.interactions.some(function (ix) {
      var t = String(ix.type || '').toUpperCase();
      var a = String(ix.actionType || '').toLowerCase();
      return t === 'UNITS_FLOOR' || t === 'TOGGLE_3D2D' || t === 'SELECTOR' ||
        a === 'units-active-floor' || a === 'toggle-3d2d' || a === 'floor-selector';
    });
    if (hasHubEls) enableHubOnScene(n);

    mirrorHotspotsFromInteractions(n);
    syncScenePorts(n);
    return n;
  }

  function syncScenePorts(n) {
    if (!n || n.kind === 'hero') return;
    var ports = [];
    /* Single shared input port — accepts N incoming edges */
    ports.push({ id: 'in', label: 'Entrada', side: 'in', kind: 'flow', multiIn: true });
    if (n.kind === 'video' || n.kind === 'animacion') {
      ports.push({ id: 'on-end', label: 'Al finalizar', side: 'out', kind: 'flow' });
    }
    var ixs = (n.config && n.config.interactions) || [];
    var outCount = 0;
    ixs.forEach(function (ix) {
      if (!interactionHasSourcePort(ix)) return;
      outCount++;
      ports.push({
        id: ix.portId,
        label: ix.label,
        side: 'out',
        kind: 'interaction',
        interactionId: ix.id,
        interactionType: ix.type
      });
    });
    /* Keep generic out only if scene has no interaction outs and is not video */
    if (outCount === 0 && n.kind !== 'video' && n.kind !== 'animacion') {
      ports.push({ id: 'out', label: 'Salida', side: 'out', kind: 'flow' });
    }
    n.ports = ports;
  }

  function getInteraction(sceneOrState, interactionIdOrSceneId, maybeIxId) {
    var scene = sceneOrState;
    var interactionId = interactionIdOrSceneId;
    if (maybeIxId != null) {
      scene = getNode(sceneOrState, interactionIdOrSceneId);
      interactionId = maybeIxId;
    }
    var list = (scene && scene.config && scene.config.interactions) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(interactionId) ||
          String(list[i].portId) === String(interactionId)) return list[i];
    }
    return null;
  }

  function addInteractionToScene(state, sceneId, type, label, extras) {
    var scene = getNode(state, sceneId);
    if (!scene || !isSceneKind(scene.kind)) return null;
    extras = extras || {};
    var ix = makeInteraction({
      type: type || 'HOTSPOT',
      label: label != null ? label : (type || 'Interacción'),
      actionType: extras.actionType || null,
      behavior: extras.behavior || null,
      structureRef: extras.structureRef || null,
      structureKey: extras.structureKey || null,
      structureId: extras.structureId || null,
      structureKind: extras.structureKind || null,
      structureLabel: extras.structureLabel || null,
      legacyNodeId: extras.legacyNodeId || null,
      group: extras.group || null
    });
    if (!scene.config.interactions) scene.config.interactions = [];
    scene.config.interactions.push(ix);
    mirrorHotspotsFromInteractions(scene);
    syncScenePorts(scene);
    scene.status = 'pending';
    return ix;
  }

  function updateInteraction(state, sceneId, interactionId, patch) {
    var scene = getNode(state, sceneId);
    var ix = getInteraction(scene, interactionId);
    if (!ix) return null;
    Object.keys(patch || {}).forEach(function (k) {
      if (k === 'id' || k === 'portId') return;
      ix[k] = patch[k];
    });
    if (patch && patch.label != null) {
      ix.label = String(patch.label);
      /* Keep edge labels in sync; never change port ids */
      var exp = ensureState(state);
      var portId = ix.portId || ix.id;
      (exp.edges || []).forEach(function (ed) {
        var from = ed.sourceNodeId || ed.from;
        var pid = ed.sourcePortId || ed.portId;
        if (from === sceneId && pid === portId) {
          ed.sourcePortLabel = ix.label;
        }
      });
    }
    mirrorHotspotsFromInteractions(scene);
    syncScenePorts(scene);
    return ix;
  }

  function removeInteraction(state, sceneId, interactionId, options) {
    options = options || {};
    var exp = ensureState(state);
    var scene = getNode(state, sceneId);
    var ix = getInteraction(scene, interactionId);
    if (!ix) return { ok: false };
    var portId = ix.portId;
    scene.config.interactions = scene.config.interactions.filter(function (x) {
      return x.id !== ix.id;
    });
    mirrorHotspotsFromInteractions(scene);
    syncScenePorts(scene);
    if (options.keepEdges) return { ok: true, interaction: ix };
    var removed = 0;
    exp.edges = exp.edges.filter(function (ed) {
      var from = ed.sourceNodeId || ed.from;
      var pid = ed.sourcePortId || ed.portId;
      if (from === sceneId && pid === portId) { removed++; return false; }
      return true;
    });
    return { ok: true, interaction: ix, edgesRemoved: removed };
  }

  function duplicateInteraction(state, sceneId, interactionId) {
    var scene = getNode(state, sceneId);
    var ix = getInteraction(scene, interactionId);
    if (!ix) return null;
    return addInteractionToScene(state, sceneId, ix.type, (ix.label || 'Interacción') + ' copia', {
      actionType: ix.actionType,
      behavior: ix.behavior ? JSON.parse(JSON.stringify(ix.behavior)) : null,
      structureRef: ix.structureRef ? JSON.parse(JSON.stringify(ix.structureRef)) : null,
      structureKey: ix.structureKey,
      structureId: ix.structureId,
      structureKind: ix.structureKind,
      structureLabel: ix.structureLabel,
      group: ix.group
    });
  }

  function menuForContext(fromMeta) {
    if (fromMeta && (fromMeta.fromId || fromMeta.portId || fromMeta.fromInteraction || fromMeta.sourcePortId)) {
      return CREATE_MENU;
    }
    return CREATE_MENU_BLANK;
  }

  function findAddElementItem(id) {
    for (var i = 0; i < ADD_ELEMENT_MENU.length; i++) {
      for (var j = 0; j < ADD_ELEMENT_MENU[i].items.length; j++) {
        if (ADD_ELEMENT_MENU[i].items[j].id === id) return ADD_ELEMENT_MENU[i].items[j];
      }
    }
    return null;
  }

  function addElementFromMenu(state, sceneId, menuItem) {
    if (!menuItem) return null;
    var type = menuItem.interactionType || 'HOTSPOT';
    var label = menuItem.defaultLabel || menuItem.label || interactionTypeLabel(type);
    var actionType = menuItem.actionType || null;
    if (actionType && GLOBAL_SHOWROOM_ACTIONS[actionType]) {
      return { error: 'global-control', message: 'Ese control es global del showroom (Hero).' };
    }
    var behavior = actionType ? { type: actionType, inline: true } : null;
    if (actionType === 'floor-selector') {
      behavior.source = 'estructura';
      behavior.controls = 'activeFloor';
    }
    if (actionType === 'toggle-3d2d') {
      behavior.controls = 'visualMode';
      behavior.values = ['3d', '2d'];
    }
    if (actionType === 'back') {
      behavior.contextual = true;
      behavior.useNavigationStack = true;
      behavior.navigationStackKey = 'navigationStack';
    }
    if (actionType === 'units-active-floor') {
      behavior.emitContext = 'selectedUnitId';
      behavior.source = 'estructura';
      behavior.filterBy = 'activeFloor';
    }
    var group = menuItem.group || interactionGroup(type);
    var ix = addInteractionToScene(state, sceneId, type, label, {
      actionType: actionType,
      behavior: behavior,
      group: group
    });
    var scene = getNode(state, sceneId);
    if (scene && (type === 'SELECTOR' || type === 'TOGGLE_3D2D' || type === 'UNITS_FLOOR' ||
        actionType === 'floor-selector' || actionType === 'toggle-3d2d' ||
        actionType === 'units-active-floor')) {
      enableHubOnScene(scene);
    }
    return ix;
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
      accent: 'green',
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
      /* V6.5.01 — snapshot before automatic legacy wipe */
      if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
        ExperienciaSnapshot.capture(state, 'pre-legacy-migrate', 'migration');
      }
      exp.legacySnapshot = snapshotLegacy(exp);
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
    migrateEmbeddedInteractions(state);

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

    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.ensureConjuntoConfig) {
      EstructuraEngine.ensureConjuntoConfig(e);
    }

    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.listCapacityBuckets) {
      var buckets = EstructuraEngine.listCapacityBuckets(e) || [];
      var byStage = {};
      buckets.forEach(function (b) {
        var stageKey = b.stageId || '_root';
        if (!byStage[stageKey]) byStage[stageKey] = [];
        byStage[stageKey].push(b);
      });
      Object.keys(byStage).forEach(function (sk) {
        var stageLabel = sk === '_root'
          ? 'Componentes'
          : (stageNameById(e, sk) || ('Etapa · ' + sk));
        var group = {
          id: 'stage-' + sk,
          label: stageLabel,
          kind: 'etapa',
          stageId: sk === '_root' ? null : sk,
          children: byStage[sk].map(function (b) {
            return {
              id: String(b.id),
              label: b.label || 'Componente',
              kind: b.kind || 'componente',
              capacity: b.capacity || 0,
              stageId: b.stageId || null,
              componentId: b.componentId || b.id,
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

  /** Flat linkable options from live Estructura (no hardcoded towers). */
  function listStructureLinkOptions(state) {
    var tree = listStructureLibrary(state) || [];
    var out = [];
    function walk(list) {
      (list || []).forEach(function (it) {
        if (!it) return;
        if (it.id && it.id !== 'proj-root') {
          out.push({
            id: String(it.id),
            label: it.label || String(it.id),
            kind: it.kind || 'componente',
            stageId: it.stageId || null,
            componentId: it.componentId || null,
            capacity: it.capacity != null ? it.capacity : null,
            key: String(it.kind || 'item') + ':' + String(it.id)
          });
        }
        if (it.children && it.children.length) walk(it.children);
      });
    }
    walk(tree);
    return out;
  }

  function stageNameById(e, stageId) {
    if (!stageId || !e) return null;
    var cfg = e.conjuntoConfig;
    if (!cfg || !Array.isArray(cfg.stages)) return null;
    for (var i = 0; i < cfg.stages.length; i++) {
      if (String(cfg.stages[i].localId) === String(stageId)) {
        return String(cfg.stages[i].nombre || '').trim() || ('Etapa ' + (i + 1));
      }
    }
    return null;
  }

  function floorRowsFromCount(pisos, unitsPerFloor) {
    var n = Math.max(0, parseInt(pisos, 10) || 0);
    var rows = [];
    for (var i = 1; i <= n; i++) {
      rows.push({
        key: String(i),
        label: 'Piso ' + i,
        unitsPerFloor: unitsPerFloor != null ? unitsPerFloor : null
      });
    }
    return rows;
  }

  /** Floors for a hub/structure scope — tipología plantas first, then buildings/towers. */
  function listFloorsForScope(state, scope) {
    if (!scope) return [];
    var e = (state && state.estructura) || {};
    var entityId = scope.scopeId || scope.componentId || scope.id || null;
    if (!entityId || entityId === 'project' || entityId === 'proj-root') return [];

    /* V5.9.90 — tipología scope → plantas reales de Estructura */
    if (scope.kind === 'tipologia' || String(entityId).indexOf('tip:') === 0) {
      return listTypologyPlantas(state, entityId, scope);
    }

    var buildings = e.buildings || [];
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      if (String(b.localId) === String(entityId) || String(b.id) === String(entityId)) {
        return floorRowsFromCount(b.pisos, b.unidadesPorPiso);
      }
    }

    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.ensureConjuntoConfig) {
      EstructuraEngine.ensureConjuntoConfig(e);
    }
    var found = [];
    function checkComp(c) {
      if (!c) return;
      if (String(c.localId) === String(entityId)) {
        if (c.edificioMode === 'individual' && Array.isArray(c.towers) && c.towers.length) {
          return;
        }
        if (c.pisos != null) {
          found = floorRowsFromCount(c.pisos, c.unidadesPorPiso);
        }
        return;
      }
      if (Array.isArray(c.towers)) {
        c.towers.forEach(function (tw) {
          if (String(tw.localId) === String(entityId)) {
            found = floorRowsFromCount(tw.pisos, tw.unidadesPorPiso);
          }
        });
      }
    }
    if (e.conjuntoConfig) {
      (e.conjuntoConfig.components || []).forEach(checkComp);
      (e.conjuntoConfig.stages || []).forEach(function (st) {
        (st.components || []).forEach(checkComp);
      });
    }
    return found;
  }

  /** Tipología plantas from Estructura — never invent names/IDs. */
  function listTypologyPlantas(state, entityId, scope) {
    var e = (state && state.estructura) || {};
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.syncTypologyPlantas) {
      EstructuraEngine.syncTypologyPlantas(e);
    }
    var tipId = scope && scope.tipologiaId
      ? scope.tipologiaId
      : String(entityId || '').replace(/^tip:/, '');
    var tips = e.tipologias || [];
    var tip = null;
    for (var i = 0; i < tips.length; i++) {
      var t = tips[i];
      if (!t) continue;
      if (String(t.id) === String(tipId) || String(t.localId) === String(tipId) ||
          String(t.node_id) === String(tipId)) {
        tip = t;
        break;
      }
    }
    if (!tip) return [];
    var plantas = tip.plantas || [];
    if (!plantas.length && tip.plantas_internas) {
      return floorRowsFromCount(tip.plantas_internas, null).map(function (row, idx) {
        return {
          key: 'p' + (idx + 1),
          label: row.label,
          unitsPerFloor: null,
          plantaLocalId: null,
          tipologiaId: tip.id || tip.localId || tip.node_id
        };
      });
    }
    return plantas.map(function (pl, idx) {
      var key = String(pl.localId || pl.id || ('p' + (idx + 1)));
      return {
        key: key,
        label: pl.nombre || ('Planta ' + (idx + 1)),
        unitsPerFloor: null,
        plantaLocalId: pl.localId || pl.id || null,
        tipologiaId: tip.id || tip.localId || tip.node_id
      };
    });
  }

  /** Scope options for HUB — hierarchy + tipologías from live Estructura. */
  function listHubScopeOptions(state) {
    var tree = buildStructureHierarchy(state);
    var out = [{
      id: 'project',
      label: tree.label || 'Proyecto completo',
      kind: 'proyecto',
      stageId: null,
      componentId: null,
      key: 'proyecto:proj-root'
    }];
    function walk(node) {
      (node.children || []).forEach(function (ch) {
        out.push({
          id: ch.id,
          label: ch.label,
          kind: ch.structureType || 'componente',
          stageId: ch.stageId || null,
          componentId: ch.componentId || null,
          key: ch.structureKey,
          pisos: ch.pisos != null ? ch.pisos : null,
          parentStructureId: ch.parentStructureId || null
        });
        walk(ch);
      });
    }
    walk(tree);

    /* V5.9.90 — tipologías as first-class HUB scopes */
    var e = (state && state.estructura) || {};
    (e.tipologias || []).forEach(function (tip, i) {
      if (!tip) return;
      var tid = tip.id || tip.localId || tip.node_id || ('tip-local-' + i);
      var label = tip.nombre || tip.modelo || ('Tipología ' + (i + 1));
      out.push({
        id: 'tip:' + tid,
        label: label,
        kind: 'tipologia',
        tipologiaId: tid,
        nodeId: tip.node_id || null,
        key: 'tipologia:' + tid,
        stageId: null,
        componentId: null
      });
    });

    var seen = {};
    return out.filter(function (o) {
      if (!o || !o.id || seen[o.id]) return false;
      seen[o.id] = true;
      return true;
    });
  }

  /**
   * Auto-bind Media plans2d/plans3d onto hub floors for a tipología scope.
   * Matches by filename containing planta label/key when possible.
   */
  function autoBindHubMediaAssets(state, nodeOrId) {
    var n = typeof nodeOrId === 'string' ? getNode(state, nodeOrId) : nodeOrId;
    if (!n) return null;
    var hub = ensureHubConfig(n);
    if (!hub || !hub.structureScope) return hub;
    syncHubFloorsFromScope(state, n);
    var tipNodeId = hub.structureScope.nodeId || null;
    if (!tipNodeId && hub.structureScope.tipologiaId && typeof MediaNodesEngine !== 'undefined') {
      var tips = (state.estructura && state.estructura.tipologias) || [];
      for (var ti = 0; ti < tips.length; ti++) {
        if (String(tips[ti].id) === String(hub.structureScope.tipologiaId) ||
            String(tips[ti].localId) === String(hub.structureScope.tipologiaId)) {
          tipNodeId = tips[ti].node_id || tips[ti].id || tips[ti].localId;
          break;
        }
      }
    }
    var assets2d = [];
    var assets3d = [];
    if (tipNodeId && typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.assetsForNode) {
      assets2d = MediaNodesEngine.assetsForNode(state, tipNodeId, 'plans2d') || [];
      assets3d = MediaNodesEngine.assetsForNode(state, tipNodeId, 'plans3d') || [];
    } else {
      assets2d = listProjectAssets(state, 'plan').filter(function (a) {
        return a && (a.planKind === '2d' || (a.category && String(a.category).indexOf('2d') !== -1));
      });
      assets3d = listProjectAssets(state, 'plan').filter(function (a) {
        return a && (a.planKind === '3d' || (a.category && String(a.category).indexOf('3d') !== -1));
      });
    }
    function matchAsset(list, floor) {
      if (!list.length) return null;
      var needle = String(floor.label || floor.key || '').toLowerCase().replace(/\s+/g, '');
      for (var i = 0; i < list.length; i++) {
        var fn = String(list[i].filename || list[i].storagePath || '').toLowerCase().replace(/\s+/g, '');
        if (needle && fn.indexOf(needle) !== -1) return list[i].id;
        if (needle && fn.indexOf('planta' + String(i + 1)) !== -1 &&
            String(floor.key) === String(i + 1)) return list[i].id;
      }
      /* Positional fallback when counts align */
      var idx = (hub.floors || []).indexOf(floor);
      if (idx >= 0 && list[idx]) return list[idx].id;
      return null;
    }
    (hub.floors || []).forEach(function (f) {
      if (!f) return;
      if (!f.asset2dId) f.asset2dId = matchAsset(assets2d, f);
      if (!f.asset3dId) f.asset3dId = matchAsset(assets3d, f);
    });
    return hub;
  }

  /**
   * Create HUB scene + one scene node per planta, with basic edges.
   */
  function generateHubStructure(state, opts) {
    opts = opts || {};
    var scopeOpt = opts.scope || null;
    if (!scopeOpt) return { error: 'scope requerido' };
    var floors = listFloorsForScope(state, scopeOpt) || [];
    if (!floors.length) return { error: 'Sin plantas en Estructura para este ámbito' };

    var exp = ensureFlow(state);
    var baseX = opts.at && opts.at.x != null ? opts.at.x : 280;
    var baseY = opts.at && opts.at.y != null ? opts.at.y : 140;

    var hubNode = {
      id: uid('n'),
      kind: 'scene',
      typeLabel: 'HUB',
      label: (scopeOpt.label || 'HUB') + ' · HUB',
      x: baseX,
      y: baseY,
      config: { interactions: [], fileName: null }
    };
    normalizeNode(hubNode);
    exp.nodes.push(hubNode);
    enableHubOnScene(hubNode);
    setHubStructureScope(state, hubNode.id, scopeOpt);

    var plantaNodes = [];
    var edges = [];
    floors.forEach(function (f, i) {
      var pn = {
        id: uid('n'),
        kind: 'scene',
        typeLabel: 'Planta',
        label: f.label || ('Planta ' + (i + 1)),
        x: baseX + 260,
        y: baseY + i * 110,
        config: {
          interactions: [],
          fileName: null,
          hubFloorKey: f.key,
          structureRef: {
            type: 'planta',
            key: f.key,
            tipologiaId: scopeOpt.tipologiaId || null
          }
        }
      };
      normalizeNode(pn);
      exp.nodes.push(pn);
      var hub = ensureHubConfig(hubNode);
      var floorCfg = findHubFloor(hub, f.key);
      if (floorCfg && floorCfg.asset2dId) {
        assignAssetToNode(state, pn.id, getAsset(state, floorCfg.asset2dId) || { id: floorCfg.asset2dId });
      } else if (floorCfg && floorCfg.asset3dId) {
        assignAssetToNode(state, pn.id, getAsset(state, floorCfg.asset3dId) || { id: floorCfg.asset3dId });
      }
      plantaNodes.push(pn);
      var edge = normalizeEdge({
        id: uid('e'),
        sourceNodeId: hubNode.id,
        targetNodeId: pn.id,
        from: hubNode.id,
        to: pn.id,
        label: f.label || f.key
      });
      exp.edges.push(edge);
      edges.push(edge);
    });

    return { hubNode: hubNode, plantaNodes: plantaNodes, edges: edges, floors: floors };
  }

  function pushComponentScopes(out, c, stageId, stageName) {
    /* Kept for compat — prefer buildStructureHierarchy / listHubScopeOptions */
    if (!c) return;
    var prefix = stageName ? (stageName + ' · ') : '';
    var baseName = String(c.nombre || '').trim() || 'Componente';
    if (c.edificioMode === 'individual' && Array.isArray(c.towers) && c.towers.length) {
      c.towers.forEach(function (tw, i) {
        out.push({
          id: String(tw.localId),
          label: prefix + (String(tw.nombre || '').trim() || ('Torre ' + (i + 1))),
          kind: 'torre',
          stageId: stageId || null,
          componentId: String(c.localId),
          key: 'torre:' + tw.localId,
          pisos: tw.pisos
        });
      });
      return;
    }
    out.push({
      id: String(c.localId),
      label: prefix + baseName,
      kind: c.kind || c.type || 'componente',
      stageId: stageId || null,
      componentId: String(c.localId),
      key: 'componente:' + c.localId,
      pisos: c.pisos
    });
  }

  /**
   * Canonical structure tree for Experiencia templates.
   * Source of truth: live state.estructura only.
   * Never merges legacy e.buildings into conjunto projects.
   */
  function buildStructureHierarchy(state) {
    var e = (state && state.estructura) || {};
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.ensureConjuntoConfig) {
      EstructuraEngine.ensureConjuntoConfig(e);
    }
    var projectLabel = (state.projectInfo && state.projectInfo.nombre) || 'Proyecto';
    var root = {
      id: 'proj-root',
      label: projectLabel,
      structureType: 'proyecto',
      structureKey: 'proyecto:proj-root',
      parentStructureId: null,
      children: []
    };
    var cfg = e.conjuntoConfig;
    var devType = e.developmentType || null;

    function pushTowerChildren(parent, c, stageId) {
      (c.towers || []).forEach(function (tw, i) {
        var twName = String(tw.nombre || '').trim() || ('Torre ' + (i + 1));
        parent.children.push({
          id: String(tw.localId),
          label: twName,
          structureType: 'torre',
          structureKey: 'torre:' + tw.localId,
          parentStructureId: parent.id,
          stageId: stageId || null,
          componentId: String(c.localId),
          pisos: tw.pisos != null ? tw.pisos : null,
          children: []
        });
      });
    }

    function mapComponentNode(c, parentId, stageId) {
      var baseName = String(c.nombre || '').trim() ||
        (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.productLabel
          ? EstructuraEngine.productLabel(c.producto)
          : null) ||
        'Componente';
      /* Individual towers: expose towers as navigable children of the parent stage/root */
      if (c.edificioMode === 'individual' && Array.isArray(c.towers) && c.towers.length) {
        var group = {
          id: String(c.localId),
          label: baseName,
          structureType: 'componente',
          structureKey: 'componente:' + c.localId,
          parentStructureId: parentId,
          stageId: stageId || null,
          componentId: String(c.localId),
          children: []
        };
        pushTowerChildren(group, c, stageId);
        /* If only towers matter for navigation, return towers directly under parent */
        return group.children.length
          ? group.children.map(function (tw) {
              return Object.assign({}, tw, { parentStructureId: parentId });
            })
          : [group];
      }
      return [{
        id: String(c.localId),
        label: baseName,
        structureType: c.kind || c.type || 'componente',
        structureKey: 'componente:' + c.localId,
        parentStructureId: parentId,
        stageId: stageId || null,
        componentId: String(c.localId),
        pisos: c.pisos != null ? c.pisos : null,
        children: []
      }];
    }

    if (devType === 'conjunto' && cfg) {
      if (cfg.useStages && Array.isArray(cfg.stages) && cfg.stages.length) {
        cfg.stages.forEach(function (st, i) {
          var stId = String(st.localId);
          var stName = String(st.nombre || '').trim() || ('Etapa ' + (i + 1));
          var stageNode = {
            id: stId,
            label: stName,
            structureType: 'etapa',
            structureKey: 'etapa:' + stId,
            parentStructureId: root.id,
            stageId: stId,
            componentId: null,
            children: []
          };
          (st.components || []).forEach(function (c) {
            mapComponentNode(c, stId, stId).forEach(function (child) {
              stageNode.children.push(child);
            });
          });
          root.children.push(stageNode);
        });
      } else if (Array.isArray(cfg.components)) {
        cfg.components.forEach(function (c) {
          mapComponentNode(c, root.id, null).forEach(function (child) {
            root.children.push(child);
          });
        });
      }
      return root;
    }

    if (devType === 'edificio' && Array.isArray(e.buildings)) {
      e.buildings.forEach(function (b, i) {
        root.children.push({
          id: String(b.localId),
          label: String(b.nombre || '').trim() || ('Torre ' + (i + 1)),
          structureType: 'edificio',
          structureKey: 'edificio:' + b.localId,
          parentStructureId: root.id,
          stageId: null,
          componentId: String(b.localId),
          pisos: b.pisos != null ? b.pisos : null,
          children: []
        });
      });
      return root;
    }

    if (devType === 'mixto') {
      var buckets = (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.listCapacityBuckets)
        ? (EstructuraEngine.listCapacityBuckets(e) || [])
        : [];
      buckets.forEach(function (b) {
        root.children.push({
          id: String(b.id),
          label: b.label || 'Componente',
          structureType: b.kind || 'componente',
          structureKey: String(b.kind || 'item') + ':' + b.id,
          parentStructureId: root.id,
          stageId: b.stageId || null,
          componentId: b.componentId || b.id,
          children: []
        });
      });
      return root;
    }

    if (devType === 'unidad' || devType === 'lotes') {
      var singleBuckets = (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.listCapacityBuckets)
        ? (EstructuraEngine.listCapacityBuckets(e) || [])
        : [];
      singleBuckets.forEach(function (b) {
        root.children.push({
          id: String(b.id),
          label: b.label || 'Unidad',
          structureType: b.kind || 'unidad',
          structureKey: String(b.kind || 'item') + ':' + b.id,
          parentStructureId: root.id,
          children: []
        });
      });
    }

    return root;
  }

  function flattenStructureNodes(node, out) {
    out = out || [];
    if (!node) return out;
    if (node.id && node.id !== 'proj-root') out.push(node);
    (node.children || []).forEach(function (ch) { flattenStructureNodes(ch, out); });
    return out;
  }

  function countStructureComponents(tree) {
    var n = 0;
    function walk(node) {
      (node.children || []).forEach(function (ch) {
        if (ch.structureType === 'etapa') {
          walk(ch);
        } else {
          n += 1;
          /* towers already counted as components; don't double-count empty groups */
        }
      });
    }
    walk(tree);
    return n;
  }

  /**
   * Analyze live Estructura for flow templates.
   * Hierarchy-aware — never flattens stages+towers+legacy buildings together.
   */
  function analyzeStructureForFlow(state) {
    var e = (state && state.estructura) || {};
    var tree = buildStructureHierarchy(state);
    var stages = [];
    var components = [];
    var rootBranches = [];

    (tree.children || []).forEach(function (ch) {
      rootBranches.push(ch);
      if (ch.structureType === 'etapa') {
        stages.push({
          id: ch.id,
          label: ch.label,
          structureType: 'etapa',
          structureKey: ch.structureKey,
          parentStructureId: ch.parentStructureId,
          componentCount: (ch.children || []).length,
          children: ch.children || []
        });
        (ch.children || []).forEach(function (c) {
          components.push({
            id: c.id,
            label: c.label,
            structureType: c.structureType,
            structureKey: c.structureKey,
            parentStructureId: c.parentStructureId || ch.id,
            stageId: ch.id,
            kind: c.structureType
          });
        });
      } else {
        components.push({
          id: ch.id,
          label: ch.label,
          structureType: ch.structureType,
          structureKey: ch.structureKey,
          parentStructureId: ch.parentStructureId,
          stageId: ch.stageId || null,
          kind: ch.structureType
        });
      }
    });

    var tipologias = (e.tipologias || []).filter(Boolean).length;
    var units = 0;
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.conceptualPhysicalUnits) {
      units = EstructuraEngine.conceptualPhysicalUnits(e) || 0;
    }

    var recommended = FLOW_TEMPLATE_IDS.simple;
    if (stages.length > 1) recommended = FLOW_TEMPLATE_IDS.stages;
    else if (components.length > 1) recommended = FLOW_TEMPLATE_IDS.components;

    return {
      tree: tree,
      rootBranches: rootBranches,
      stages: stages,
      components: components,
      tipologias: tipologias,
      units: units,
      developmentType: e.developmentType || null,
      useStages: !!(e.conjuntoConfig && e.conjuntoConfig.useStages && stages.length),
      recommended: recommended,
      summary: {
        stages: stages.length,
        components: components.length || countStructureComponents(tree),
        units: units,
        tipologias: tipologias
      }
    };
  }

  function structureFingerprint(state) {
    var a = analyzeStructureForFlow(state);
    return JSON.stringify({
      stages: (a.stages || []).map(function (s) { return { id: s.id, label: s.label }; }),
      components: (a.components || []).map(function (c) {
        return { id: c.id, label: c.label, stageId: c.stageId || null };
      }),
      tipologias: a.tipologias,
      units: a.units,
      scopes: listHubScopeOptions(state).map(function (s) {
        return { id: s.id, label: s.label, pisos: s.pisos || null };
      })
    });
  }

  function diffStructureVsFlow(state) {
    var exp = ensureState(state);
    var current = structureFingerprint(state);
    var prevRaw = exp.structureFingerprint || null;
    var changes = [];
    if (!prevRaw) {
      return {
        hasBaseline: false,
        changes: [{ type: 'info', message: 'Sin huella previa. Aplica una plantilla o sincroniza para crear referencia.' }],
        current: current
      };
    }
    var prev;
    try { prev = JSON.parse(prevRaw); } catch (err) { prev = null; }
    var cur;
    try { cur = JSON.parse(current); } catch (err2) { cur = null; }
    if (!prev || !cur) {
      return { hasBaseline: !!prevRaw, changes: changes, current: current };
    }

    var prevComp = {};
    (prev.components || []).forEach(function (c) { prevComp[c.id] = c; });
    var curComp = {};
    (cur.components || []).forEach(function (c) { curComp[c.id] = c; });

    Object.keys(curComp).forEach(function (id) {
      if (!prevComp[id]) {
        changes.push({ type: 'added', message: '+ ' + curComp[id].label + ' añadido', id: id });
      } else if (prevComp[id].label !== curComp[id].label) {
        changes.push({
          type: 'renamed',
          message: '~ ' + prevComp[id].label + ' → ' + curComp[id].label,
          id: id
        });
      }
    });
    Object.keys(prevComp).forEach(function (id) {
      if (!curComp[id]) {
        changes.push({ type: 'removed', message: '- ' + prevComp[id].label + ' ya no está en Estructura', id: id });
      }
    });

    var prevScope = {};
    (prev.scopes || []).forEach(function (s) { prevScope[s.id] = s; });
    (cur.scopes || []).forEach(function (s) {
      var p = prevScope[s.id];
      if (p && p.pisos != null && s.pisos != null && Number(p.pisos) !== Number(s.pisos)) {
        changes.push({
          type: 'floors',
          message: '~ ' + s.label + ' ahora tiene ' + s.pisos + ' pisos (antes ' + p.pisos + ')',
          id: s.id
        });
      }
    });

    return { hasBaseline: true, changes: changes, current: current, previous: prevRaw };
  }

  /**
   * Soft sync: update labels / hub floors from Estructura.
   * Never deletes nodes, edges, assets or manual routes.
   */
  function syncStructureRefs(state) {
    var exp = ensureFlow(state);
    var analysis = analyzeStructureForFlow(state);
    var labelById = {};
    (analysis.stages || []).forEach(function (s) { labelById[s.id] = s.label; });
    (analysis.components || []).forEach(function (c) { labelById[c.id] = c.label; });
    listHubScopeOptions(state).forEach(function (s) { labelById[s.id] = s.label; });

    var updated = 0;
    (exp.nodes || []).forEach(function (n) {
      if (!n || !n.config) return;
      /* Linked interactions */
      (n.config.interactions || []).forEach(function (ix) {
        var sid = ix.structureId || (ix.structureRef && ix.structureRef.id);
        if (sid && labelById[String(sid)]) {
          var next = labelById[String(sid)];
          if (ix.structureLabel !== next) {
            ix.structureLabel = next;
            if (ix.structureRef) ix.structureRef.label = next;
            updated++;
          }
        }
      });
      /* Hub scope label + floors */
      if (n.config.hub && n.config.hub.structureScope) {
        var sc = n.config.hub.structureScope;
        var sid2 = sc.scopeId || sc.componentId;
        if (sid2 && labelById[String(sid2)] && sc.label !== labelById[String(sid2)]) {
          sc.label = labelById[String(sid2)];
          updated++;
        }
        syncHubFloorsFromScope(state, n);
      }
      /* Node structureLabel */
      if (n.config.structureId && labelById[String(n.config.structureId)]) {
        if (n.config.structureLabel !== labelById[String(n.config.structureId)]) {
          n.config.structureLabel = labelById[String(n.config.structureId)];
          updated++;
        }
      }
    });

    exp.structureFingerprint = structureFingerprint(state);
    markExperienciaDirty(state);
    return { ok: true, updated: updated, analysis: analysis };
  }

  function findNodeByTemplateRole(exp, role) {
    return (exp.nodes || []).find(function (n) {
      return n && n.config && n.config.templateRole === role;
    }) || null;
  }

  function ensureEdge(state, fromId, toId, label, portId, targetPortId) {
    var exp = ensureState(state);
    var exists = (exp.edges || []).some(function (ed) {
      return (ed.sourceNodeId || ed.from) === fromId &&
        (ed.targetNodeId || ed.to) === toId &&
        (ed.sourcePortId || ed.portId || 'out') === (portId || 'out');
    });
    if (exists) return null;
    return addManualEdge(state, fromId, toId, label, portId, targetPortId);
  }

  function createTemplateScene(state, opts) {
    var exp = ensureFlow(state);
    opts = opts || {};
    var n = node({
      id: uid('flow'),
      kind: opts.kind || 'image',
      label: opts.label || 'Escena',
      role: 'scene',
      status: 'pending',
      x: opts.x != null ? opts.x : 320,
      y: opts.y != null ? opts.y : 120,
      userMoved: true,
      ports: [],
      config: {
        templateRole: opts.templateRole || null,
        templateGenerated: !!opts.templateGenerated,
        structureId: opts.structureId || null,
        structureKey: opts.structureKey || null,
        structureLabel: opts.structureLabel || null,
        structureType: opts.structureType || null,
        parentStructureId: opts.parentStructureId || null,
        autoplay: opts.kind === 'video',
        onEnd: opts.kind === 'video' ? 'next' : null,
        fileName: null,
        assetId: null,
        interactions: [],
        hotspots: []
      }
    });
    if (opts.kind === 'video' || opts.kind === 'animacion') {
      n.typeLabel = 'ANIMACIÓN';
      n.accent = 'purple';
    }
    normalizeSceneInteractions(n);
    exp.nodes.push(n);
    return n;
  }

  /** Hero → Intro → Entry (universal chain). Reuses existing templateRole nodes. */
  function ensureIntroChain(state) {
    var exp = ensureFlow(state);
    var hero = exp.nodes.find(function (n) { return n.id === 'exp-hero' || n.kind === 'hero'; });
    if (!hero) {
      hero = buildHeroNode(state, null);
      exp.nodes.unshift(hero);
    }
    if (!hero.userMoved) {
      hero.x = TPL_ORIGIN_X;
      hero.y = TPL_ORIGIN_Y;
    }
    var heroSz = nodeSize(hero);
    var spineY = hero.y != null ? hero.y : TPL_ORIGIN_Y;
    var introX = Math.round((hero.x != null ? hero.x : TPL_ORIGIN_X) + heroSz.w + TPL_COL_GAP);

    var intro = findNodeByTemplateRole(exp, 'intro');
    if (!intro) {
      intro = createTemplateScene(state, {
        kind: 'video',
        label: 'Intro',
        templateRole: 'intro',
        templateGenerated: true,
        x: introX,
        y: spineY
      });
    }
    var entry = findNodeByTemplateRole(exp, 'entry');
    if (!entry) {
      var introSz0 = nodeSize(intro);
      entry = createTemplateScene(state, {
        kind: 'image',
        label: 'Vista general',
        templateRole: 'entry',
        templateGenerated: true,
        x: Math.round(introX + introSz0.w + TPL_COL_GAP),
        y: spineY
      });
    }
    ensureEdge(state, hero.id, intro.id, 'INICIAR', 'hero-iniciar', 'in');
    ensureEdge(state, intro.id, entry.id, 'Al finalizar', 'on-end', 'in');
    return { hero: hero, intro: intro, entry: entry };
  }

  function linkHotspotToStructure(ix, entity) {
    if (!ix || !entity) return ix;
    ix.structureId = entity.id;
    ix.structureKey = entity.key || (String(entity.kind || 'item') + ':' + entity.id);
    ix.structureLabel = entity.label;
    ix.structureKind = entity.kind || null;
    ix.structureRef = {
      id: entity.id,
      key: ix.structureKey,
      label: entity.label,
      kind: entity.kind || null,
      stageId: entity.stageId || null
    };
    return ix;
  }

  function toBranchEntity(node) {
    return {
      id: node.id,
      label: node.label,
      kind: node.structureType || 'componente',
      structureType: node.structureType || 'componente',
      structureKey: node.structureKey,
      parentStructureId: node.parentStructureId || null,
      stageId: node.stageId || null,
      componentId: node.componentId || null,
      key: node.structureKey,
      children: node.children || []
    };
  }

  function clearTemplateGeneratedOnScene(state, scene, exp) {
    if (!scene || !scene.config) return;
    normalizeSceneInteractions(scene);
    var removedPorts = {};
    scene.config.interactions = (scene.config.interactions || []).filter(function (ix) {
      if (ix && ix.config && ix.config.templateGenerated) {
        removedPorts[ix.portId || ix.id] = true;
        return false;
      }
      return true;
    });
    if (Object.keys(removedPorts).length) {
      exp.edges = (exp.edges || []).filter(function (ed) {
        if ((ed.sourceNodeId || ed.from) !== scene.id) return true;
        var pid = ed.sourcePortId || ed.portId;
        return !removedPorts[pid];
      });
    }
  }

  /**
   * Remove template-generated branch nodes not in keepIds.
   * Never removes manually created nodes (no config.templateGenerated).
   */
  function pruneOrphanTemplateBranches(state, keepIds) {
    var exp = ensureState(state);
    var keep = {};
    (keepIds || []).forEach(function (id) { keep[String(id)] = true; });
    var removed = {};
    exp.nodes = (exp.nodes || []).filter(function (n) {
      if (!n || !n.config) return true;
      if (n.config.templateRole !== 'branch' && n.config.templateRole !== 'struct-child') return true;
      if (!n.config.templateGenerated) return true;
      if (keep[String(n.config.structureId)] || keep[String(n.id)]) return true;
      removed[n.id] = true;
      return false;
    });
    if (Object.keys(removed).length) {
      exp.edges = (exp.edges || []).filter(function (ed) {
        var s = ed.sourceNodeId || ed.from;
        var t = ed.targetNodeId || ed.to;
        return !removed[s] && !removed[t];
      });
    }
  }

  function ensureStructuralBranchNode(state, entity, x, y, role) {
    var exp = ensureState(state);
    role = role || 'branch';
    var existing = (exp.nodes || []).find(function (n) {
      return n.config &&
        (n.config.templateRole === 'branch' || n.config.templateRole === 'struct-child') &&
        String(n.config.structureId) === String(entity.id);
    });
    if (existing) {
      existing.label = entity.label;
      existing.config.structureLabel = entity.label;
      existing.config.structureKey = entity.key || entity.structureKey;
      existing.config.structureType = entity.structureType || entity.kind;
      existing.config.parentStructureId = entity.parentStructureId || null;
      existing.config.templateGenerated = true;
      existing.config.templateRole = role;
      if (x != null) existing.x = Math.round(x);
      if (y != null) existing.y = Math.round(y);
      return existing;
    }
    var n = createTemplateScene(state, {
      kind: 'image',
      label: entity.label,
      templateRole: role,
      templateGenerated: true,
      structureId: entity.id,
      structureKey: entity.key || entity.structureKey,
      structureLabel: entity.label,
      structureType: entity.structureType || entity.kind || null,
      parentStructureId: entity.parentStructureId || null,
      x: x,
      y: y
    });
    return n;
  }

  function templateNodeRect(n) {
    var s = nodeSize(n);
    return {
      id: n.id,
      x: n.x || 0,
      y: n.y || 0,
      w: s.w,
      h: s.h
    };
  }

  function templateRectsOverlap(a, b, pad) {
    pad = pad != null ? pad : TPL_COLLISION_PAD;
    return !(
      a.x + a.w + pad <= b.x ||
      b.x + b.w + pad <= a.x ||
      a.y + a.h + pad <= b.y ||
      b.y + b.h + pad <= a.y
    );
  }

  /** Push node down until it clears occupied rects (same column / nearby). */
  function resolveTemplateCollision(node, occupied) {
    var r = templateNodeRect(node);
    var guard = 60;
    while (guard-- > 0) {
      var blocker = null;
      for (var i = 0; i < occupied.length; i++) {
        if (occupied[i].id === node.id) continue;
        if (templateRectsOverlap(r, occupied[i], TPL_COLLISION_PAD)) {
          blocker = occupied[i];
          break;
        }
      }
      if (!blocker) break;
      r.y = blocker.y + blocker.h + TPL_SIBLING_GAP;
    }
    node.x = Math.round(r.x);
    node.y = Math.round(r.y);
    return templateNodeRect(node);
  }

  /**
   * Place siblings in a column to the right of parent, vertically centered
   * on parent center, with real card heights + sibling gaps. Collision-safe.
   * Optional slotHeightFn expands each sibling's vertical slot (subtree-aware).
   */
  function layoutTemplateChildrenColumn(parent, children, occupied, slotHeightFn) {
    if (!parent || !children || !children.length) return occupied;
    var pSz = nodeSize(parent);
    var colX = Math.round((parent.x || 0) + pSz.w + TPL_COL_GAP);
    var heights = children.map(function (c) {
      var cardH = nodeSize(c).h;
      var slotH = slotHeightFn ? slotHeightFn(c) : cardH;
      return Math.max(cardH, slotH || cardH);
    });
    var totalH = 0;
    heights.forEach(function (h, i) {
      totalH += h;
      if (i < heights.length - 1) totalH += TPL_SIBLING_GAP;
    });
    var parentCenterY = (parent.y || 0) + pSz.h / 2;
    var y = parentCenterY - totalH / 2;
    children.forEach(function (child, i) {
      var cardH = nodeSize(child).h;
      var slotH = heights[i];
      child.x = colX;
      /* Center the card inside its vertical slot when slot > card */
      child.y = Math.round(y + (slotH - cardH) / 2);
      child.userMoved = false;
      var placed = resolveTemplateCollision(child, occupied);
      occupied = occupied.filter(function (o) { return o.id !== child.id; });
      occupied.push(placed);
      /* Advance by slot (not just card) so sibling subtrees keep clearance */
      var usedBottom = Math.max(placed.y + placed.h, y + slotH);
      y = usedBottom + TPL_SIBLING_GAP;
    });
    return occupied;
  }

  /**
   * Layout main spine + hierarchical branch columns after template generation.
   * Only repositions template roles / templateGenerated nodes (and intro chain).
   */
  function layoutTemplateSkeleton(state, chain, levels) {
    var exp = ensureState(state);
    var hero = chain && chain.hero;
    var intro = chain && chain.intro;
    var entry = chain && chain.entry;
    if (!hero || !intro || !entry) return;

    if (!hero.userMoved) {
      hero.x = TPL_ORIGIN_X;
      hero.y = TPL_ORIGIN_Y;
    }
    var hSz = nodeSize(hero);
    var spineBaseY = hero.y != null ? hero.y : TPL_ORIGIN_Y;

    intro.x = Math.round((hero.x != null ? hero.x : TPL_ORIGIN_X) + hSz.w + TPL_COL_GAP);
    intro.y = Math.round(spineBaseY + hSz.h / 2 - nodeSize(intro).h / 2);
    intro.userMoved = false;

    var iSz = nodeSize(intro);
    entry.x = Math.round(intro.x + iSz.w + TPL_COL_GAP);
    entry.y = Math.round(intro.y + iSz.h / 2 - nodeSize(entry).h / 2);
    entry.userMoved = false;

    var occupied = [
      templateNodeRect(hero),
      templateNodeRect(intro),
      templateNodeRect(entry)
    ];

    /* Include other non-template nodes as collision obstacles (don't move them) */
    (exp.nodes || []).forEach(function (n) {
      if (!n || n.x == null || n.y == null) return;
      if (n.id === hero.id || n.id === intro.id || n.id === entry.id) return;
      var isTpl = n.config && (n.config.templateGenerated ||
        n.config.templateRole === 'branch' || n.config.templateRole === 'struct-child' ||
        n.config.templateRole === 'intro' || n.config.templateRole === 'entry');
      if (isTpl) return;
      occupied.push(templateNodeRect(n));
    });

    var childMap = {};
    (levels || []).forEach(function (level) {
      if (!level || !level.parent) return;
      childMap[level.parent.id] = level.children || [];
    });

    function subtreeSlotHeight(n) {
      var kids = childMap[n.id];
      if (!kids || !kids.length) return nodeSize(n).h;
      var th = 0;
      kids.forEach(function (k, i) {
        th += subtreeSlotHeight(k);
        if (i < kids.length - 1) th += TPL_SIBLING_GAP;
      });
      return Math.max(nodeSize(n).h, th);
    }

    (levels || []).forEach(function (level) {
      if (!level || !level.parent || !level.children || !level.children.length) return;
      occupied = layoutTemplateChildrenColumn(
        level.parent, level.children, occupied, subtreeSlotHeight
      ) || occupied;
    });
  }

  /** Attach template hotspots + child nodes for children of a structural scene. */
  function seedStructuralChildren(state, parentScene, childEntities, startX) {
    var exp = ensureState(state);
    if (!parentScene || !childEntities || !childEntities.length) return [];
    clearTemplateGeneratedOnScene(state, parentScene, exp);
    var created = [];
    var pSz = nodeSize(parentScene);
    var x = startX != null ? startX : Math.round((parentScene.x || 0) + pSz.w + TPL_COL_GAP);
    /* Temporary Y — final layoutTemplateSkeleton recenters the group */
    var roughStep = NODE_H + 40 + TPL_SIBLING_GAP;
    var baseY = (parentScene.y || 0) - Math.floor((childEntities.length - 1) * roughStep / 2);
    childEntities.forEach(function (raw, i) {
      var entity = toBranchEntity(raw);
      var childNode = ensureStructuralBranchNode(
        state, entity, x, baseY + i * roughStep, 'struct-child'
      );
      var ix = addInteractionToScene(state, parentScene.id, 'HOTSPOT', entity.label, {
        group: 'content',
        structureId: entity.id,
        structureKey: entity.key || entity.structureKey,
        structureLabel: entity.label,
        structureKind: entity.structureType || entity.kind,
        structureRef: {
          id: entity.id,
          key: entity.key || entity.structureKey,
          label: entity.label,
          kind: entity.structureType || entity.kind,
          stageId: entity.stageId || null,
          parentStructureId: entity.parentStructureId || parentScene.config.structureId || null
        }
      });
      if (ix) {
        if (!ix.config) ix.config = {};
        ix.config.templateGenerated = true;
        linkHotspotToStructure(ix, entity);
        ensureEdge(state, parentScene.id, childNode.id, entity.label, ix.portId || ix.id, 'in');
      }
      created.push(childNode);
    });
    syncScenePorts(parentScene);
    return created;
  }

  /**
   * Apply flow template. Creates structural skeleton only — no narrative routes.
   * Respects hierarchy: stages template never flattens towers onto Vista general.
   */
  function applyFlowTemplate(state, templateId, options) {
    options = options || {};
    var run = function () {
      return applyFlowTemplateInner(state, templateId, options);
    };
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.runGuarded) {
      /* User-initiated template apply may shrink intentionally */
      var guarded = ExperienciaSnapshot.runGuarded(state, 'applyFlowTemplate:' + (templateId || ''), run, {
        allowShrink: true
      });
      return guarded.result;
    }
    return run();
  }

  function applyFlowTemplateInner(state, templateId, options) {
    options = options || {};
    var exp = ensureFlow(state);
    var analysis = analyzeStructureForFlow(state);
    templateId = templateId || analysis.recommended || FLOW_TEMPLATE_IDS.simple;

    if (templateId === FLOW_TEMPLATE_IDS.empty) {
      resetFlow(state);
      exp = ensureState(state);
      exp.structureFingerprint = structureFingerprint(state);
      exp.flowTemplateId = FLOW_TEMPLATE_IDS.empty;
      markExperienciaDirty(state);
      return { ok: true, templateId: templateId, analysis: analysis, chain: null };
    }

    var chain = ensureIntroChain(state);
    exp = ensureState(state);

    if (templateId === FLOW_TEMPLATE_IDS.simple) {
      /* Remove prior structural template branches from Vista; keep intro chain */
      clearTemplateGeneratedOnScene(state, chain.entry, exp);
      pruneOrphanTemplateBranches(state, []);
      layoutTemplateSkeleton(state, chain, []);
      exp.flowTemplateId = FLOW_TEMPLATE_IDS.simple;
      exp.structureFingerprint = structureFingerprint(state);
      markExperienciaDirty(state);
      return { ok: true, templateId: templateId, analysis: analysis, chain: chain };
    }

    var entry = chain.entry;
    var levelNodes = [];
    if (templateId === FLOW_TEMPLATE_IDS.stages) {
      /* ONLY root etapas — never mix towers/components on Vista general */
      levelNodes = (analysis.stages || []).map(toBranchEntity);
    } else {
      /* Por componentes: root-level navigable nodes (no etapas wrapper) */
      if (analysis.useStages && (analysis.stages || []).length) {
        /* Explicit components template while stages exist: use stage children flattened
           only if user chose components — still NOT legacy buildings */
        (analysis.stages || []).forEach(function (st) {
          (st.children || []).forEach(function (c) {
            levelNodes.push(toBranchEntity(Object.assign({}, c, {
              parentStructureId: 'proj-root'
            })));
          });
        });
      } else {
        levelNodes = (analysis.rootBranches || []).map(toBranchEntity);
      }
    }

    if (!levelNodes.length) {
      clearTemplateGeneratedOnScene(state, entry, exp);
      pruneOrphanTemplateBranches(state, []);
      layoutTemplateSkeleton(state, chain, []);
      exp.flowTemplateId = templateId;
      exp.structureFingerprint = structureFingerprint(state);
      markExperienciaDirty(state);
      return {
        ok: true,
        templateId: templateId,
        analysis: analysis,
        chain: chain,
        warning: 'Estructura sin ramas detectadas; solo se creó el tramo inicial.'
      };
    }

    clearTemplateGeneratedOnScene(state, entry, exp);

    var keepIds = levelNodes.map(function (b) { return b.id; });
    var branchNodes = [];
    var layoutLevels = [];

    levelNodes.forEach(function (br, i) {
      /* Rough placeholder — layoutTemplateSkeleton assigns final x/y */
      var branchNode = ensureStructuralBranchNode(
        state, br, (entry.x || 760) + 360, (entry.y || 80) + i * 40, 'branch'
      );
      branchNodes.push(branchNode);
      keepIds.push(branchNode.id);

      var ix = addInteractionToScene(state, entry.id, 'HOTSPOT', br.label, {
        group: 'content',
        structureId: br.id,
        structureKey: br.key || br.structureKey,
        structureLabel: br.label,
        structureKind: br.structureType || br.kind,
        structureRef: {
          id: br.id,
          key: br.key || br.structureKey,
          label: br.label,
          kind: br.structureType || br.kind,
          stageId: br.stageId || null,
          parentStructureId: br.parentStructureId || null
        }
      });
      if (ix) {
        if (!ix.config) ix.config = {};
        ix.config.templateGenerated = true;
        linkHotspotToStructure(ix, br);
        ensureEdge(state, entry.id, branchNode.id, br.label, ix.portId || ix.id, 'in');
      }

      /* Seed next hierarchy level ON the stage/component node — not on Vista general */
      if (templateId === FLOW_TEMPLATE_IDS.stages && br.children && br.children.length) {
        var childNodes = seedStructuralChildren(state, branchNode, br.children);
        childNodes.forEach(function (cn) {
          keepIds.push(cn.id);
          if (cn.config && cn.config.structureId) keepIds.push(cn.config.structureId);
        });
        if (childNodes.length) {
          layoutLevels.push({ parent: branchNode, children: childNodes });
        }
      }
    });

    if (branchNodes.length) {
      layoutLevels.unshift({ parent: entry, children: branchNodes });
    }

    pruneOrphanTemplateBranches(state, keepIds);
    syncScenePorts(entry);
    layoutTemplateSkeleton(state, chain, layoutLevels);
    exp.flowTemplateId = templateId;
    exp.structureFingerprint = structureFingerprint(state);
    markExperienciaDirty(state);
    return {
      ok: true,
      templateId: templateId,
      analysis: analysis,
      chain: chain,
      branches: levelNodes.length
    };
  }

  function resolveStructureLink(state, ix) {
    if (!ix) return null;
    var sid = ix.structureId ||
      (ix.structureRef && (ix.structureRef.id || ix.structureRef.structureId)) || null;
    var skey = ix.structureKey ||
      (ix.structureRef && ix.structureRef.key) || null;
    if (!sid && !skey) return null;
    var opts = listStructureLinkOptions(state);
    var found = null;
    for (var i = 0; i < opts.length; i++) {
      if ((sid && opts[i].id === String(sid)) || (skey && opts[i].key === skey)) {
        found = opts[i];
        break;
      }
    }
    if (found) {
      return {
        ok: true,
        missing: false,
        id: found.id,
        key: found.key,
        kind: found.kind,
        label: found.label,
        display: found.label + ' — Estructura'
      };
    }
    return {
      ok: false,
      missing: true,
      id: sid,
      key: skey,
      kind: ix.structureKind || null,
      label: ix.structureLabel || null,
      display: 'Referencia no disponible'
    };
  }

  function linkInteractionToStructure(state, sceneId, interactionId, item, options) {
    options = options || {};
    var ix = getInteraction(state, sceneId, interactionId);
    if (!ix) return null;
    if (!item || !item.id) {
      ix.structureKey = null;
      ix.structureId = null;
      ix.structureKind = null;
      ix.structureLabel = null;
      ix.structureRef = null;
      return ix;
    }
    var key = item.key || (String(item.kind || 'item') + ':' + String(item.id));
    ix.structureKey = key;
    ix.structureId = String(item.id);
    ix.structureKind = item.kind || null;
    ix.structureLabel = item.label || null;
    ix.structureRef = {
      key: key,
      id: String(item.id),
      kind: item.kind || null,
      label: item.label || null,
      stageId: item.stageId || null
    };
    var generic = !ix.label ||
      ix.label === ix.type ||
      ix.label === 'HOTSPOT' ||
      ix.label === 'BUTTON' ||
      ix.label === 'SELECTOR' ||
      ix.label === 'Hotspot' ||
      ix.label === 'Botón' ||
      ix.label === 'Control';
    if (options.inheritLabel !== false && generic && item.label) {
      ix.label = item.label;
    }
    var scene = getNode(state, sceneId);
    if (scene) syncScenePorts(scene);
    return ix;
  }

  function renameNode(state, nodeId, label) {
    var n = getNode(state, nodeId);
    if (!n) return null;
    var next = String(label == null ? '' : label).trim();
    if (!next) return n;
    n.label = next;
    return n;
  }

  /** Sync Hero card from heroContent only — keep nodes/edges/positions. */
  function syncHeroOnly(state) {
    var exp = ensureState(state);
    ensureHeroContent(state);
    var prevHero = exp.nodes.find(function (n) {
      return n.id === 'exp-hero' || n.kind === 'hero';
    });
    var hero = buildHeroNode(state, prevHero);
    var others = exp.nodes.filter(function (n) {
      return n.id !== 'exp-hero' && n.kind !== 'hero';
    });
    exp.nodes = [hero].concat(others);
    var portIds = {};
    (hero.ports || []).forEach(function (p) { portIds[p.id] = true; });
    exp.edges = (exp.edges || []).map(normalizeEdge).filter(function (ed) {
      if ((ed.sourceNodeId || ed.from || ed.sourceId) !== hero.id) return true;
      var pid = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      if (pid === 'out' || pid === 'hero-iniciar' || pid === 'hero-btn-right') return true;
      return !!portIds[pid];
    });
    return exp;
  }

  /**
   * Reset Experiencia to Hero-only. Archives flow JSON; never touches projectAssets.
   */
  function resetFlow(state) {
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'pre-resetFlow', 'reset');
    }
    var exp = ensureState(state);
    if (!Array.isArray(exp.resetSnapshots)) exp.resetSnapshots = [];
    try {
      exp.resetSnapshots.push({
        at: new Date().toISOString(),
        reason: 'V5.9.59 resetFlow',
        nodes: JSON.parse(JSON.stringify(exp.nodes || [])),
        edges: JSON.parse(JSON.stringify(exp.edges || [])),
        canvas: {
          panX: exp.canvas && exp.canvas.panX,
          panY: exp.canvas && exp.canvas.panY,
          zoom: exp.canvas && exp.canvas.zoom,
          activeGroupId: exp.canvas && exp.canvas.activeGroupId
        }
      });
      if (exp.resetSnapshots.length > 8) {
        exp.resetSnapshots = exp.resetSnapshots.slice(-8);
      }
    } catch (eSnap) {}

    ensureHeroContent(state);
    var hero = buildHeroNode(state, null);
    hero.x = 48;
    hero.y = 80;
    hero.userMoved = false;
    exp.nodes = [hero];
    exp.edges = [];
    exp.mode = 'flow';
    exp.version = Math.max(2, exp.version || 2);
    exp.canvas.activeGroupId = null;
    exp.canvas.selectedId = hero.id;
    exp.canvas.selectedIds = [hero.id];
    exp.canvas.selectedEdgeId = null;
    exp.canvas.selectedEdgeIds = [];
    exp.canvas.selectedInteractionId = null;
    exp.canvas.selectedInteractionSceneId = null;
    exp.canvas.panX = 40;
    exp.canvas.panY = 40;
    exp.canvas.zoom = 1;
    exp.dirty = true;
    exp._draftSaved = false;
    /* projectAssets / estructura / heroContent / menu untouched */
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'post-resetFlow', 'reset');
    }
    return exp;
  }

  function markExperienciaDirty(state) {
    var exp = ensureState(state);
    exp.dirty = true;
    exp._draftSaved = false;
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.captureDeferred) {
      ExperienciaSnapshot.captureDeferred(state, 'auto-dirty');
    }
    return exp;
  }

  function markExperienciaSaved(state) {
    var exp = ensureState(state);
    exp.dirty = false;
    exp._draftSaved = true;
    exp.draftSavedAt = new Date().toISOString();
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'save', 'save');
    }
    return exp;
  }

  function createNodeFromMenu(state, menuItem, at, fromEdge) {
    var exp = ensureFlow(state);
    fromEdge = fromEdge || null;
    at = at || { x: 320, y: 120 };

    if (menuItem.kind === '_link_existing' || menuItem.kind === '_link_structure') {
      return { needsPicker: menuItem.kind, at: at, fromEdge: fromEdge, menuItem: menuItem };
    }

    /* Inline action on an existing interaction port — no new visual node */
    if (menuItem.kind === '_inline') {
      if (fromEdge && fromEdge.fromId) {
        var sceneInline = getNode(state, fromEdge.fromId);
        var portInline = fromEdge.portId || fromEdge.sourcePortId;
        var ixInline = getInteraction(sceneInline, portInline);
        if (ixInline) {
          ixInline.actionType = menuItem.actionType || 'custom';
          ixInline.behavior = {
            type: menuItem.actionType || 'custom',
            inline: true,
            label: menuItem.label || null
          };
          if (menuItem.actionType === 'floor-selector') {
            ixInline.type = 'SELECTOR';
            ixInline.group = 'controls';
            if (!ixInline.label || ixInline.label === 'HOTSPOT' || ixInline.label === 'BUTTON') {
              ixInline.label = 'Plantas';
            }
            ixInline.behavior.source = 'estructura';
          }
          mirrorHotspotsFromInteractions(sceneInline);
          syncScenePorts(sceneInline);
          return { inline: true, interaction: ixInline, scene: sceneInline, node: sceneInline };
        }
        if (sceneInline && isSceneKind(sceneInline.kind)) {
          var typeForInline = menuItem.actionType === 'floor-selector' ? 'SELECTOR'
            : (menuItem.actionType === 'back' ? 'BACK' : 'BUTTON');
          var createdIx = addInteractionToScene(
            state,
            sceneInline.id,
            typeForInline,
            menuItem.label || 'Control',
            {
              actionType: menuItem.actionType,
              behavior: { type: menuItem.actionType, inline: true, source: 'estructura' },
              group: 'controls'
            }
          );
          return { inline: true, interaction: createdIx, scene: sceneInline, node: sceneInline };
        }
      }
      return { inline: true, skipped: true };
    }

    /* Embed interaction into source scene (no separate hotspot/button card) */
    if (menuItem.kind === '_embed') {
      if (fromEdge && fromEdge.fromId) {
        var sceneEmbed = getNode(state, fromEdge.fromId);
        if (sceneEmbed && isSceneKind(sceneEmbed.kind)) {
          var ixEmbed = addInteractionToScene(
            state,
            sceneEmbed.id,
            menuItem.interactionType || 'HOTSPOT',
            menuItem.label || menuItem.interactionType || 'Interacción',
            {
              actionType: menuItem.actionType || null,
              behavior: menuItem.actionType
                ? { type: menuItem.actionType, inline: true, source: 'estructura' }
                : null
            }
          );
          return { embedded: true, interaction: ixEmbed, scene: sceneEmbed, node: sceneEmbed };
        }
      }
      return { error: 'need-scene', message: 'Selecciona primero una escena origen.' };
    }

    var role = menuItem.role || kindMeta(menuItem.kind).role;
    var isAction = role === 'action';
    var label = menuItem.label || 'Nodo';
    if (menuItem.kind === 'video') label = 'Animación';
    if (menuItem.kind === 'image') label = 'Vista general';
    if (menuItem.preset === 'gallery') label = 'Galería';

    var kind = menuItem.kind === 'gallery' ? 'scene' : menuItem.kind;

    var n = node({
      id: uid('flow'),
      kind: kind,
      label: label,
      role: role,
      status: isAction ? 'ready' : 'pending',
      x: Math.round(at.x),
      y: Math.round(at.y),
      userMoved: true,
      ports: isAction ? [] : defaultPortsForKind(kind),
      config: {
        actionType: menuItem.actionType || null,
        preset: menuItem.preset || null,
        autoplay: kind === 'video',
        onEnd: kind === 'video' ? 'next' : null,
        fileName: null,
        contentRef: null,
        hotspots: [],
        interactions: []
      }
    });

    if (isSceneKind(kind)) {
      normalizeSceneInteractions(n);
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
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'pre-addEdge', 'mutation');
    }
    var exp = ensureFlow(state);
    if (fromId === toId) return null;
    var pid = portId || 'out';
    var tpid = targetPortId || 'in';
    /* Allow N→1: only block exact duplicate (same source + port + target + targetPort) */
    var exists = exp.edges.some(function (ed) {
      return (ed.sourceNodeId || ed.from || ed.sourceId) === fromId &&
        (ed.targetNodeId || ed.to || ed.targetId) === toId &&
        (ed.sourcePortId || ed.sourcePort || ed.portId || 'out') === pid &&
        (ed.targetPortId || ed.targetPort || 'in') === tpid;
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
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'addEdge', 'mutation');
    }
    return ed;
  }

  function removeEdge(state, edgeId) {
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'pre-removeEdge', 'mutation');
    }
    var exp = ensureState(state);
    var before = exp.edges.length;
    exp.edges = exp.edges.filter(function (ed) { return ed.id !== edgeId; });
    if (exp.canvas && exp.canvas.selectedEdgeId === edgeId) exp.canvas.selectedEdgeId = null;
    if (before !== exp.edges.length &&
        typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'removeEdge', 'mutation');
    }
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
    if (!isSceneKind(n.kind)) {
      var outs = (n.ports || []).filter(function (p) { return p.side !== 'in'; });
      var extra = outs.length > 1 ? Math.max(0, (outs.length - 1) * 20) : 0;
      return { w: n.width || NODE_W, h: (n.height || NODE_H) + extra };
    }
    var ixs = (n.config && n.config.interactions) || [];
    var flowRows = (n.kind === 'video' || n.kind === 'animacion') ? 1 : 0;
    var hubExtra = (n.config && n.config.hub && n.config.hub.enabled) ? 24 : 0;
    /* header + media block + elementos section + rows + add btn + optional flow */
    var h = 56 + 48 + 18 + (ixs.length * 22) + 26 + (flowRows ? 40 : 0) + hubExtra + 8;
    return {
      w: n.width || NODE_W,
      h: Math.max(NODE_H + 40, h)
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
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'pre-removeNode', 'mutation');
    }
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
    if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'removeNode', 'mutation');
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

  /**
   * Clone a node with new id + remapped interaction/port ids.
   * Keeps assetId references (does not duplicate projectAssets).
   * Returns { node, portMap } where portMap maps oldPortId → newPortId.
   */
  function cloneNodeWithNewIds(src, offset) {
    offset = offset || { x: 40, y: 40 };
    var copy = deepClone(src);
    copy.id = uid('flow');
    copy.x = Math.round((src.x || 0) + (offset.x || 40));
    copy.y = Math.round((src.y || 0) + (offset.y || 40));
    copy.userMoved = true;
    copy.locked = false;
    copy.protected = false;
    var portMap = {};
    if (copy.config && Array.isArray(copy.config.interactions)) {
      copy.config.interactions = copy.config.interactions.map(function (ix) {
        var oldId = ix.id;
        var oldPort = ix.portId || ix.id;
        var prefix = String(ix.type || 'ix').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'ix';
        var newId = uid(prefix);
        portMap[oldId] = newId;
        portMap[oldPort] = newId;
        return makeInteraction(Object.assign({}, ix, { id: newId, portId: newId }));
      });
    }
    if (copy.config && Array.isArray(copy.config.hotspots)) {
      copy.config.hotspots = copy.config.hotspots.map(function (hs) {
        if (!hs) return hs;
        var mapped = portMap[hs.id] || uid('hs');
        return { id: mapped, label: hs.label };
      });
    }
    if (Array.isArray(copy.ports)) {
      copy.ports = copy.ports.map(function (p) {
        var np = Object.assign({}, p);
        if (portMap[p.id]) np.id = portMap[p.id];
        if (np.interactionId && portMap[np.interactionId]) {
          np.interactionId = portMap[np.interactionId];
        }
        return np;
      });
    }
    /* in / on-end / out stay stable */
    portMap.in = 'in';
    portMap.out = 'out';
    portMap['on-end'] = 'on-end';
    normalizeNode(copy);
    return { node: copy, portMap: portMap };
  }

  /**
   * Insert cloned subgraph. Only edges whose BOTH ends are in sourceNodes are recreated.
   * External edges are ignored.
   */
  function insertClonedSubgraph(state, sourceNodes, sourceEdges, offset) {
    var exp = ensureFlow(state);
    offset = offset || { x: 40, y: 40 };
    var idMap = {};
    var portMaps = {};
    var created = [];
    (sourceNodes || []).forEach(function (src) {
      if (!src || isProtectedNode(src) || src.kind === 'hero') return;
      var cloned = cloneNodeWithNewIds(src, offset);
      idMap[src.id] = cloned.node.id;
      portMaps[src.id] = cloned.portMap;
      exp.nodes.push(cloned.node);
      created.push(cloned.node);
    });
    (sourceEdges || []).forEach(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      if (!idMap[s] || !idMap[t]) return;
      var oldPort = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      var newPort = (portMaps[s] && portMaps[s][oldPort]) || oldPort;
      var oldTgt = ed.targetPortId || ed.targetPort || 'in';
      var newTgt = (portMaps[t] && portMaps[t][oldTgt]) || oldTgt;
      exp.edges.push(edge(idMap[s], idMap[t], ed.label || 'flujo', {
        sourcePortId: newPort,
        targetPortId: newTgt,
        sourcePortLabel: ed.sourcePortLabel || null,
        manual: true,
        inlineAction: !!ed.inlineAction
      }));
    });
    markExperienciaDirty(state);
    return { nodes: created, idMap: idMap };
  }

  function duplicateNode(state, nodeId, offset) {
    var src = getNode(state, nodeId);
    if (!src || isProtectedNode(src)) return null;
    var result = insertClonedSubgraph(state, [src], [], offset || { x: 36, y: 36 });
    return (result.nodes && result.nodes[0]) || null;
  }

  /** Duplicate selection; remap internal edges only. Shared by Duplicar + Ctrl+V. */
  function duplicateSelection(state, nodeIds, offset) {
    var exp = ensureFlow(state);
    var ids = (nodeIds || []).filter(Boolean);
    var idSet = {};
    ids.forEach(function (id) { idSet[id] = true; });
    var sources = ids.map(function (id) { return getNode(state, id); }).filter(Boolean);
    var internalEdges = (exp.edges || []).filter(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      return idSet[s] && idSet[t];
    });
    return insertClonedSubgraph(state, sources, internalEdges, offset || { x: 40, y: 40 });
  }

  function copySelection(state, nodeIds) {
    var exp = ensureFlow(state);
    var ids = (nodeIds || []).filter(Boolean);
    if (!ids.length) return null;
    var idSet = {};
    ids.forEach(function (id) { idSet[id] = true; });
    var nodes = [];
    ids.forEach(function (id) {
      var n = getNode(state, id);
      if (!n || isProtectedNode(n) || n.kind === 'hero') return;
      nodes.push(deepClone(n));
    });
    if (!nodes.length) return null;
    var edges = (exp.edges || []).filter(function (ed) {
      var s = ed.sourceNodeId || ed.from || ed.sourceId;
      var t = ed.targetNodeId || ed.to || ed.targetId;
      return idSet[s] && idSet[t];
    }).map(function (ed) { return deepClone(ed); });
    _clipboard = { nodes: nodes, edges: edges, copiedAt: Date.now() };
    _pasteGen = 0;
    return { nodeCount: nodes.length, edgeCount: edges.length };
  }

  function hasClipboard() {
    return !!( _clipboard && _clipboard.nodes && _clipboard.nodes.length);
  }

  function pasteClipboard(state, extraOffset) {
    if (!_clipboard || !_clipboard.nodes || !_clipboard.nodes.length) return null;
    _pasteGen += 1;
    var ox = 40 * _pasteGen;
    var oy = 40 * _pasteGen;
    if (extraOffset) {
      ox += extraOffset.x || 0;
      oy += extraOffset.y || 0;
    }
    return insertClonedSubgraph(state, _clipboard.nodes, _clipboard.edges, { x: ox, y: oy });
  }

  function partitionInteractions(ixs) {
    var controls = [];
    var content = [];
    var navigation = [];
    var other = [];
    (ixs || []).forEach(function (ix) {
      if (!ix) return;
      var t = String(ix.type || '').toUpperCase();
      var a = String(ix.actionType || (ix.behavior && ix.behavior.type) || '').toLowerCase();
      var g = ix.group || interactionGroup(ix.type);
      if (t === 'BACK' || a === 'back' || g === 'navigation' || a === 'goto-hero') {
        navigation.push(ix);
      } else if (t === 'UNITS_FLOOR' || t === 'HOTSPOT' || t === 'UNIT' ||
          g === 'content' || g === 'hotspots') {
        content.push(ix);
      } else if (t === 'SELECTOR' || t === 'TOGGLE_3D2D' || g === 'controls') {
        controls.push(ix);
      } else {
        other.push(ix);
      }
    });
    return { controls: controls, content: content, navigation: navigation, other: other };
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
    var ix = addInteractionToScene(state, sceneId, 'HOTSPOT', label || 'Hotspot');
    if (!ix) return null;
    return { id: ix.id, label: ix.label, portId: ix.portId };
  }

  function addControlToScene(state, sceneId, label, extras) {
    extras = extras || {};
    return addInteractionToScene(
      state,
      sceneId,
      extras.type || 'BUTTON',
      label || 'Control',
      extras
    );
  }

  function isLegacyInteractionNode(n) {
    if (!n) return false;
    if (n.kind === 'hotspot') return true;
    if (n.kind === 'selector-pisos') return true;
    var label = String(n.label || '').toLowerCase();
    if (n.kind === 'action' && /botones|opciones|selector/.test(label)) return true;
    if (n.role === 'interaction' && n.kind !== 'hero') return true;
    return false;
  }

  /**
   * Soft-migrate Scene → Hotspot/Botones nodes into scene.interactions[].
   * Archives legacy cards; never hard-deletes. Skips ambiguous graphs.
   */
  function migrateEmbeddedInteractions(state) {
    var exp = ensureState(state);
    if (exp.embeddedInteractionsVersion >= 57) return exp;
    if (!Array.isArray(exp.archivedLegacyNodes)) exp.archivedLegacyNodes = [];

    var byId = {};
    (exp.nodes || []).forEach(function (n) { byId[n.id] = n; });

    var inbound = {};
    (exp.edges || []).forEach(function (ed) {
      var to = ed.targetNodeId || ed.to || ed.targetId;
      if (!to) return;
      if (!inbound[to]) inbound[to] = [];
      inbound[to].push(ed);
    });

    var toArchive = {};
    var migrated = 0;

    Object.keys(inbound).forEach(function (legacyId) {
      var legacy = byId[legacyId];
      if (!legacy || !isLegacyInteractionNode(legacy)) return;
      var ins = inbound[legacyId] || [];
      if (ins.length !== 1) return; /* ambiguous — keep legacy */
      var inEdge = ins[0];
      var sceneId = inEdge.sourceNodeId || inEdge.from || inEdge.sourceId;
      var scene = byId[sceneId];
      if (!scene || !isSceneKind(scene.kind)) return;

      normalizeSceneInteractions(scene);
      var type = 'HOTSPOT';
      if (legacy.kind === 'selector-pisos') type = 'SELECTOR';
      else if (/botones|opciones|button|control|plantas/.test(String(legacy.label || '').toLowerCase())) {
        type = /plantas|piso|selector/.test(String(legacy.label || '').toLowerCase())
          ? 'SELECTOR' : 'BUTTON';
      }

      var ix = makeInteraction({
        id: uid(type === 'HOTSPOT' ? 'hs' : 'ix'),
        type: type,
        label: legacy.label || type,
        portId: null,
        legacyNodeId: legacy.id,
        actionType: (legacy.config && legacy.config.actionType) ||
          (type === 'SELECTOR' ? 'floor-selector' : null),
        behavior: type === 'SELECTOR'
          ? { type: 'floor-selector', inline: true, source: 'estructura' }
          : null,
        group: type === 'HOTSPOT' ? 'hotspots' : 'controls'
      });
      /* Stable port id tied to new interaction */
      ix.portId = ix.id;
      scene.config.interactions.push(ix);
      mirrorHotspotsFromInteractions(scene);
      syncScenePorts(scene);

      /* Remap outgoing edges: legacy → dest becomes scene.port → dest */
      (exp.edges || []).forEach(function (ed) {
        var from = ed.sourceNodeId || ed.from || ed.sourceId;
        if (from !== legacy.id) return;
        ed.sourceNodeId = scene.id;
        ed.from = scene.id;
        ed.sourceId = scene.id;
        ed.sourcePortId = ix.portId;
        ed.sourcePort = ix.portId;
        ed.portId = ix.portId;
        ed.sourcePortLabel = ix.label;
        ed.targetPortId = ed.targetPortId || ed.targetPort || 'in';
      });

      /* Drop the Scene → legacy edge (now internal) */
      exp.edges = (exp.edges || []).filter(function (ed) {
        return ed.id !== inEdge.id;
      });

      toArchive[legacy.id] = {
        at: new Date().toISOString(),
        reason: 'V5.9.57 embed interaction into scene',
        sceneId: scene.id,
        interactionId: ix.id,
        node: legacy,
        inboundEdge: inEdge
      };
      migrated++;
    });

    if (migrated) {
      var kept = [];
      (exp.nodes || []).forEach(function (n) {
        if (toArchive[n.id]) {
          exp.archivedLegacyNodes.push(toArchive[n.id]);
          return;
        }
        kept.push(n);
      });
      exp.nodes = kept;
    }

    exp.embeddedInteractionsVersion = 57;
    return exp;
  }

  return {
    NODE_W: NODE_W,
    NODE_H: NODE_H,
    HERO_W: HERO_W,
    HERO_H: HERO_H,
    KIND_META: KIND_META,
    SCENE_KINDS: SCENE_KINDS,
    CREATE_MENU: CREATE_MENU,
    CREATE_MENU_BLANK: CREATE_MENU_BLANK,
    ADD_ELEMENT_MENU: ADD_ELEMENT_MENU,
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
    migrateEmbeddedInteractions: migrateEmbeddedInteractions,
    listStructureLibrary: listStructureLibrary,
    listStructureLinkOptions: listStructureLinkOptions,
    resolveStructureLink: resolveStructureLink,
    linkInteractionToStructure: linkInteractionToStructure,
    analyzeStructureForFlow: analyzeStructureForFlow,
    buildStructureHierarchy: buildStructureHierarchy,
    listHubScopeOptions: listHubScopeOptions,
    listFloorsForScope: listFloorsForScope,
    listTypologyPlantas: listTypologyPlantas,
    autoBindHubMediaAssets: autoBindHubMediaAssets,
    generateHubStructure: generateHubStructure,
    setHubStructureScope: setHubStructureScope,
    syncHubFloorsFromScope: syncHubFloorsFromScope,
    applyFlowTemplate: applyFlowTemplate,
    ensureIntroChain: ensureIntroChain,
    diffStructureVsFlow: diffStructureVsFlow,
    syncStructureRefs: syncStructureRefs,
    structureFingerprint: structureFingerprint,
    FLOW_TEMPLATE_IDS: FLOW_TEMPLATE_IDS,
    renameNode: renameNode,
    syncHeroOnly: syncHeroOnly,
    resetFlow: resetFlow,
    markExperienciaDirty: markExperienciaDirty,
    markExperienciaSaved: markExperienciaSaved,
    runGuardedMutation: function (state, reason, fn, options) {
      if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.runGuarded) {
        return ExperienciaSnapshot.runGuarded(state, reason, fn, options);
      }
      return { ok: true, rolledBack: false, result: typeof fn === 'function' ? fn() : null };
    },
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
    resolveAccent: resolveAccent,
    isSceneKind: isSceneKind,
    menuForContext: menuForContext,
    findAddElementItem: findAddElementItem,
    addElementFromMenu: addElementFromMenu,
    interactionTypeLabel: interactionTypeLabel,
    ensureProjectAssets: ensureProjectAssets,
    getAsset: getAsset,
    upsertAsset: upsertAsset,
    assignAssetToNode: assignAssetToNode,
    clearNodeAsset: clearNodeAsset,
    resolveSceneMedia: resolveSceneMedia,
    listProjectAssets: listProjectAssets,
    listSelectableMediaAssets: listSelectableMediaAssets,
    assetStatusLabel: assetStatusLabel,
    guessAssetType: guessAssetType,
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
    addControlToScene: addControlToScene,
    addInteractionToScene: addInteractionToScene,
    updateInteraction: updateInteraction,
    removeInteraction: removeInteraction,
    duplicateInteraction: duplicateInteraction,
    getInteraction: getInteraction,
    syncScenePorts: syncScenePorts,
    isProtectedNode: isProtectedNode,
    isLockedNode: isLockedNode,
    unlinkNode: unlinkNode,
    unlinkNodes: unlinkNodes,
    removeNode: removeNode,
    removeNodes: removeNodes,
    setNodesLocked: setNodesLocked,
    duplicateNode: duplicateNode,
    duplicateSelection: duplicateSelection,
    copySelection: copySelection,
    pasteClipboard: pasteClipboard,
    hasClipboard: hasClipboard,
    insertClonedSubgraph: insertClonedSubgraph,
    interactionHasSourcePort: interactionHasSourcePort,
    partitionInteractions: partitionInteractions,
    ensureHubConfig: ensureHubConfig,
    enableHubOnScene: enableHubOnScene,
    isButtonsEditableNode: isButtonsEditableNode,
    ensureSceneButtons: ensureSceneButtons,
    listSceneButtons: listSceneButtons,
    getSceneButton: getSceneButton,
    addSceneButton: addSceneButton,
    addSceneText: addSceneText,
    addSceneShape: addSceneShape,
    updateSceneButton: updateSceneButton,
    setSceneButtonPosition: setSceneButtonPosition,
    removeSceneButton: removeSceneButton,
    bringSceneOverlayToFront: bringSceneOverlayToFront,
    snapshotSceneButtons: snapshotSceneButtons,
    restoreSceneButtons: restoreSceneButtons,
    mirrorSceneButton: mirrorSceneButton,
    duplicateSceneButton: duplicateSceneButton,
    createSceneButtonFromSnapshot: createSceneButtonFromSnapshot,
    isOverlayGroupInteraction: isOverlayGroupInteraction,
    overlayInteractionSelfVisible: overlayInteractionSelfVisible,
    overlayEffectiveVisible: overlayEffectiveVisible,
    overlayInteractionSelfLocked: overlayInteractionSelfLocked,
    overlayEffectiveLocked: overlayEffectiveLocked,
    isOverlayEffectivelyLocked: isOverlayEffectivelyLocked,
    groupSceneOverlays: groupSceneOverlays,
    createEmptyOverlayGroup: createEmptyOverlayGroup,
    ungroupSceneOverlay: ungroupSceneOverlay,
    resolveOverlayGroupForSelection: resolveOverlayGroupForSelection,
    snapshotOverlayInteractions: snapshotOverlayInteractions,
    snapshotOverlayGroupLocals: snapshotOverlayGroupLocals,
    snapshotOverlayGroupMemberWorlds: snapshotOverlayGroupMemberWorlds,
    snapshotOverlaySelectionWorlds: snapshotOverlaySelectionWorlds,
    scaleOverlaySelectionTransform: scaleOverlaySelectionTransform,
    updateOverlayGroupTransform: updateOverlayGroupTransform,
    getSceneOverlayItem: getSceneOverlayItem,
    buttonViewModel: buttonViewModel,
    overlayGroupViewModel: overlayGroupViewModel,
    overlayWorldLayoutRaw: overlayWorldLayoutRaw,
    absoluteToLocalOverlay: absoluteToLocalOverlay,
    relocalizeOverlayGroupMembers: relocalizeOverlayGroupMembers,
    ensureFreeOverlayDefaults: ensureFreeOverlayDefaults,
    migrateGroupedChildLocals: migrateGroupedChildLocals,
    ensureOverlayGroupDefaults: ensureOverlayGroupDefaults,
    syncOverlayGroupFrameFromMembers: syncOverlayGroupFrameFromMembers,
    resolveOverlayGroupMemberIds: resolveOverlayGroupMemberIds,
    computeOverlayUnionBounds: computeOverlayUnionBounds,
    commitOverlayGroupBounds: commitOverlayGroupBounds,
    snapshotGroupModelTrace: snapshotGroupModelTrace,
    traceCompareRotateGroupModelIfChanged: traceGroupModelIfChanged,
    findOverlayGroupForMember: findOverlayGroupForMember,
    expandOverlayGroupBoundsIfMemberOverflow: expandOverlayGroupBoundsIfMemberOverflow,
    reconcileOverlayGroupTransform: reconcileOverlayGroupTransform,
    isHotspotsEditableNode: isHotspotsEditableNode,
    isSceneHotspotMask: isSceneHotspotMask,
    listSceneHotspotMasks: listSceneHotspotMasks,
    getSceneHotspotMask: getSceneHotspotMask,
    addSceneHotspotMask: addSceneHotspotMask,
    updateSceneHotspotMask: updateSceneHotspotMask,
    setHotspotVertex: setHotspotVertex,
    insertHotspotVertex: insertHotspotVertex,
    removeHotspotVertex: removeHotspotVertex,
    translateHotspotMask: translateHotspotMask,
    duplicateSceneHotspotMask: duplicateSceneHotspotMask,
    removeSceneHotspotMask: removeSceneHotspotMask,
    HOTSPOT_KINDS: HOTSPOT_KINDS,
    HOTSPOT_ANIMATIONS: HOTSPOT_ANIMATIONS,
    alignSceneButtons: alignSceneButtons,
    distributeSceneButtons: distributeSceneButtons,
    spaceSceneButtons: spaceSceneButtons,
    resolveButtonLayout: resolveButtonLayout,
    resolveButtonTarget: resolveButtonTarget,
    setButtonTarget: setButtonTarget,
    BUTTON_ANCHORS: BUTTON_ANCHORS,
    detectHubSelectorOptions: detectHubSelectorOptions,
    syncHubSmartSelector: syncHubSmartSelector,
    syncHubPlantasFromMedia: syncHubPlantasFromMedia,
    listHubPlantasCards: listHubPlantasCards,
    listMediaPlantas2d: listMediaPlantas2d,
    setHubPlantSelected: setHubPlantSelected,
    moveHubPlant: moveHubPlant,
    hubSelectorStatus: hubSelectorStatus,
    setHubSelectorType: setHubSelectorType,
    setHubAppearance: setHubAppearance,
    setHubActiveFloor: setHubActiveFloor,
    setHubVisualMode: setHubVisualMode,
    upsertHubFloor: upsertHubFloor,
    findHubFloor: findHubFloor,
    buildSceneShapeSvg: buildSceneShapeSvg,
    isSceneShapeType: isSceneShapeType,
    isSquareSceneShapeType: isSquareSceneShapeType,
    sceneShapeDefaultLabel: sceneShapeDefaultLabel,
    sceneShapeDefaultSize: sceneShapeDefaultSize,
    sceneShapeDisplaySize: sceneShapeDisplaySize,
    shapeContentBBox: shapeContentBBox,
    shapeIsStretched: shapeIsStretched,
    shapeUsesContentBox: shapeUsesContentBox,
    overlayMemberScaledSize: overlayMemberScaledSize,
    overlayMemberCoupledCommitDims: overlayMemberCoupledCommitDims,
    overlayMemberNeedsCoupledRound: overlayMemberNeedsCoupledRound,
    overlayGroupScaleFloor: overlayGroupScaleFloor,
    overlayGroupOuterFromScale: overlayGroupOuterFromScale,
    OVERLAY_MEMBER_MIN_PX: OVERLAY_MEMBER_MIN_PX,
    shapeUsesContentBoxPaint: shapeUsesContentBoxPaint,
    shapeUsesFixedCornerContentPaint: shapeUsesFixedCornerContentPaint,
    shapeContentBoxViewBoxNorm: shapeContentBoxViewBoxNorm,
    shapeRectFixedCornerRx: shapeRectFixedCornerRx,
    shapeRectFixedCornerPx: shapeRectFixedCornerPx,
    shapeRectCornerRxViewBox: shapeRectCornerRxViewBox,
    shapeRoundRectFixedCornerRx: shapeRoundRectFixedCornerRx,
    shapeRoundRectFixedCornerPx: shapeRoundRectFixedCornerPx,
    shapeRoundRectCornerRxViewBox: shapeRoundRectCornerRxViewBox,
    shapePreserveAspect: shapePreserveAspect,
    shapeHitAreaCss: shapeHitAreaCss,
    shapeSilhouetteHitTest: shapeSilhouetteHitTest,
    pointInRotatedRectPct: pointInRotatedRectPct,
    shapeStretchFromIx: shapeStretchFromIx,
    sceneShapeGizmoMetrics: sceneShapeGizmoMetrics,
    shapeDefaultContentBoxMetrics: shapeDefaultContentBoxMetrics,
    shapeDefaultTargetGhPct: shapeDefaultTargetGhPct,
    seedShapeContentBox: seedShapeContentBox,
    sceneShapeTileWidthFromContentWidth: sceneShapeTileWidthFromContentWidth,
    sceneShapeTileCenterFromGizmoCenter: sceneShapeTileCenterFromGizmoCenter,
    SCENE_SHAPE_TYPES: SCENE_SHAPE_TYPES,
    clearSelection: clearSelection,
    setSelection: setSelection,
    toggleSelectionId: toggleSelectionId
  };
})();
