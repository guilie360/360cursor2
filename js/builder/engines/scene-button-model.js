/* BOXIES — Scene Button canonical data model (SSOT for BUTTON interactions). */
var SceneButtonModel = (function () {
  /**
   * Canonical flat model for a scene BUTTON interaction (persist + render SSOT).
   *
   * {
   *   id, portId, type: 'BUTTON', label, enabled, group,
   *   x, y, rotation, positionMode, anchor, marginX, marginY, positionInitialized,
   *   visualPresetId,   // 'square' | 'rounded' | 'circle' | 'capsule' | 'default' | null
   *   style, icon, boxW, boxH, borderRadius,
   *   bgColor, bgOpacity, textColor, borderColor, borderWidth, opacity,
   *   hoverEnabled, hoverColor, hoverTextColor, hoverTransition,
   *   hoverScale, hoverOpacity,
   *   pressedColor, pressedTextColor, pressedScale,
   *   buttonType, buttonConfig, buttonShapeKind,
   *   action, targetSceneId, url, downloadUrl,
   *   locked, visible, interactiveRole,
   *   scaleValue, scaleUnit, size
   * }
   */
  var IDENTITY_KEYS = ['id', 'portId', 'type', 'label', 'enabled', 'group'];
  var LAYOUT_KEYS = [
    'x', 'y', 'rotation', 'positionMode', 'anchor', 'marginX', 'marginY',
    'positionInitialized', 'groupId', 'localX', 'localY', 'localRotation',
    'scaleValue', 'scaleUnit', 'size'
  ];
  var VISUAL_KEYS = [
    'visualPresetId', 'style', 'icon', 'boxW', 'boxH', 'borderRadius',
    'bgColor', 'bgOpacity', 'textColor', 'borderColor', 'borderWidth', 'opacity',
    'hoverEnabled', 'hoverColor', 'hoverTextColor', 'hoverTransition',
    'hoverScale', 'hoverOpacity',
    'pressedColor', 'pressedTextColor', 'pressedScale', 'buttonShapeKind'
  ];
  var BEHAVIOR_KEYS = [
    'buttonType', 'buttonConfig', 'action', 'targetSceneId', 'url', 'downloadUrl',
    'interactiveRole', 'locked', 'visible'
  ];
  var EPHEMERAL_KEYS = ['_baseWidth', '_baseHeight', 'config', 'color'];

  function allFieldKeys() {
    return IDENTITY_KEYS.concat(LAYOUT_KEYS, VISUAL_KEYS, BEHAVIOR_KEYS);
  }

  function isButton(ix) {
    return !!(ix && String(ix.type || '').toUpperCase() === 'BUTTON');
  }

  function cloneButtonConfig(cfg) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return {};
    try {
      return JSON.parse(JSON.stringify(cfg));
    } catch (eCfg) {
      return Object.assign({}, cfg);
    }
  }

  /** Full copy of button fields — never a partial whitelist. */
  function clone(ix) {
    if (!ix || !isButton(ix)) return null;
    var out = Object.assign({}, ix);
    out.type = 'BUTTON';
    if (out.buttonConfig) out.buttonConfig = cloneButtonConfig(out.buttonConfig);
    EPHEMERAL_KEYS.forEach(function (key) {
      if (key in out) delete out[key];
    });
    return out;
  }

  function clampNum(v, min, max, fallback) {
    var n = Number(v);
    if (!isFinite(n)) n = fallback;
    return Math.max(min, Math.min(max, n));
  }

  /** Correct invalid values only — never drop defined fields. */
  function normalize(ix) {
    if (!ix || !isButton(ix)) return ix;
    var out = clone(ix);
    if (!out.id) return out;
    if (!out.portId) out.portId = out.id;
    if (out.label == null || out.label === '') out.label = 'Botón';
    if (out.enabled === undefined) out.enabled = true;
    out.x = clampNum(out.x, 0, 100, 50);
    out.y = clampNum(out.y, 0, 100, 50);
    out.rotation = clampNum(out.rotation, -360, 360, 0);
    out.positionMode = out.positionMode === 'anchor' ? 'anchor' : 'free';
    if (out.marginX == null || isNaN(Number(out.marginX))) out.marginX = 0;
    if (out.marginY == null || isNaN(Number(out.marginY))) out.marginY = 0;
    if (out.positionInitialized == null) out.positionInitialized = true;
    if (!out.groupId && out.positionMode !== 'anchor') {
      var nx = Number(out.x);
      var ny = Number(out.y);
      if (!isFinite(nx) || !isFinite(ny) || (nx === 0 && ny === 0)) {
        out.x = 50;
        out.y = 50;
      }
    }
    if (out.visualPresetId != null && out.visualPresetId !== '') {
      out.visualPresetId = String(out.visualPresetId);
    }
    if (out.boxW != null) out.boxW = clampNum(out.boxW, 1, 100, out.boxW);
    if (out.boxH != null) out.boxH = clampNum(out.boxH, 1, 100, out.boxH);
    if (out.borderRadius != null) out.borderRadius = clampNum(out.borderRadius, 0, 999, out.borderRadius);
    if (out.bgOpacity != null) out.bgOpacity = clampNum(out.bgOpacity, 0, 1, 1);
    if (out.opacity != null) out.opacity = clampNum(out.opacity, 0, 1, 1);
    if (out.borderWidth != null) out.borderWidth = clampNum(out.borderWidth, 0, 20, out.borderWidth);
    if (out.hoverTransition != null) out.hoverTransition = clampNum(out.hoverTransition, 0, 2000, 200);
    if (out.pressedScale != null) out.pressedScale = clampNum(out.pressedScale, 0.5, 1.5, 0.96);
    if (!out.buttonType) out.buttonType = 'unconfigured';
    if (!out.buttonConfig || typeof out.buttonConfig !== 'object' || Array.isArray(out.buttonConfig)) {
      out.buttonConfig = {};
    }
    return out;
  }

  /** Persist/API sanitize — full model, no field stripping. */
  function cloneForPersist(ix) {
    return normalize(ix);
  }

  /** Copy all button fields from src onto dest (dest wins on conflict). */
  function mergeInto(dest, src) {
    if (!dest || !src) return dest;
    var normalized = normalize(Object.assign({}, dest, src));
    Object.keys(normalized).forEach(function (key) {
      if (normalized[key] === undefined) return;
      if (key === 'buttonConfig') {
        dest.buttonConfig = cloneButtonConfig(normalized.buttonConfig);
        return;
      }
      dest[key] = normalized[key];
    });
    return dest;
  }

  /** Fill dest only where empty — used by shim↔scene sync. */
  function mergeMissing(dest, src) {
    if (!dest || !src) return dest;
    var normalized = normalize(src);
    allFieldKeys().forEach(function (key) {
      if (key === 'id' || key === 'portId') return;
      if (dest[key] !== undefined && dest[key] !== null && dest[key] !== '') return;
      if (normalized[key] === undefined) return;
      if (key === 'buttonConfig') {
        dest.buttonConfig = cloneButtonConfig(normalized.buttonConfig);
        return;
      }
      dest[key] = normalized[key];
    });
    return dest;
  }

  /** Visual fields for buttonViewModel / renderer (not paint x/y — layout computes those). */
  function copyViewFields(ix, vm) {
    if (!ix || !vm) return vm;
    var normalized = normalize(ix);
    VISUAL_KEYS.forEach(function (key) {
      if (normalized[key] === undefined) return;
      vm[key] = normalized[key];
    });
    ['rotation', 'positionMode', 'anchor', 'marginX', 'marginY', 'positionInitialized',
      'scaleValue', 'scaleUnit', 'size'].forEach(function (key) {
      if (normalized[key] === undefined) return;
      vm[key] = normalized[key];
    });
    vm.visualPresetId = normalized.visualPresetId || null;
    vm.buttonType = normalized.buttonType || 'unconfigured';
    vm.buttonConfig = cloneButtonConfig(normalized.buttonConfig);
    vm.buttonShapeKind = normalized.buttonShapeKind || null;
    return vm;
  }

  function findInList(list, id) {
    if (!id || !Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === String(id)) return list[i];
    }
    return null;
  }

  function runModelSelfTest() {
    if (typeof ButtonPresets === 'undefined') {
      return { ok: false, error: 'ButtonPresets not loaded' };
    }
    var shapes = ['square', 'rounded', 'circle', 'capsule'];
    var rows = [];
    var allOk = true;
    shapes.forEach(function (shape) {
      var preset = ButtonPresets.get(shape);
      var ix = normalize({
        id: 'qe-test-' + shape,
        type: 'BUTTON',
        label: 'Test',
        x: 50,
        y: 50,
        buttonType: 'unconfigured',
        buttonConfig: {}
      });
      ButtonPresets.applyToInteraction(ix, preset, shape);
      ix = normalize(ix);
      var row = {
        shape: shape,
        visualPresetId: ix.visualPresetId,
        boxW: ix.boxW,
        boxH: ix.boxH,
        borderRadius: ix.borderRadius,
        bgColor: ix.bgColor,
        ok: ix.visualPresetId === shape &&
          ix.boxW === preset.boxW &&
          ix.boxH === preset.boxH &&
          ix.borderRadius === preset.borderRadius &&
          ix.bgColor === preset.bgColor
      };
      if (!row.ok) allOk = false;
      rows.push(row);
    });
    return { ok: allOk, mode: 'model', rows: rows };
  }

  /**
   * Integration test — real pickButtonShape → DOM outerHTML on canvas.
   * Usage: __QE_TEST_BUTTONS__('circle').then(console.log)
   */
  function runIntegrationTest(shape) {
    shape = String(shape || 'circle').toLowerCase();
    return new Promise(function (resolve) {
      var pick = null;
      if (typeof QuotationEditor !== 'undefined' && QuotationEditor._pickButtonShape) {
        pick = QuotationEditor._pickButtonShape;
      } else if (typeof window !== 'undefined' && window.__QE_PICK_BUTTON_SHAPE__) {
        pick = window.__QE_PICK_BUTTON_SHAPE__;
      }
      if (!pick) {
        resolve({ ok: false, mode: 'integration', error: 'QuotationEditor not mounted' });
        return;
      }
      if (!document.querySelector('[data-exp-buttons-layer]')) {
        resolve({ ok: false, mode: 'integration', error: 'Canvas buttons layer not in DOM' });
        return;
      }
      var layer = document.querySelector('[data-exp-buttons-layer]');
      var before = layer.querySelectorAll('[data-exp-stage-btn]').length;
      try {
        pick(shape);
      } catch (ePick) {
        resolve({ ok: false, mode: 'integration', error: String(ePick && ePick.message || ePick) });
        return;
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var btns = layer.querySelectorAll('[data-exp-stage-btn]');
          var btn = btns.length ? btns[btns.length - 1] : null;
          var outerHTML = btn ? btn.outerHTML : '';
          var hasLocalLook = outerHTML.indexOf('has-local-look') >= 0;
          var hasRadius = outerHTML.indexOf('border-radius') >= 0 ||
            outerHTML.indexOf('--btn-local-radius') >= 0;
          var style = btn ? (btn.getAttribute('style') || '') : '';
          var ok = !!(btn && hasLocalLook && hasRadius && btns.length > before);
          resolve({
            ok: ok,
            mode: 'integration',
            shape: shape,
            buttonId: btn ? btn.getAttribute('data-exp-stage-btn') : null,
            added: btns.length > before,
            hasLocalLook: hasLocalLook,
            hasRadius: hasRadius,
            style: style,
            outerHTML: outerHTML
          });
        });
      });
    });
  }

  function runSelfTest(shape) {
    if (shape != null && String(shape).length) {
      return runIntegrationTest(shape);
    }
    return runModelSelfTest();
  }

  if (typeof window !== 'undefined') {
    window.__QE_TEST_BUTTONS__ = runSelfTest;
    window.__QE_TEST_BUTTONS_MODEL__ = runModelSelfTest;
  }

  return {
    IDENTITY_KEYS: IDENTITY_KEYS,
    LAYOUT_KEYS: LAYOUT_KEYS,
    VISUAL_KEYS: VISUAL_KEYS,
    BEHAVIOR_KEYS: BEHAVIOR_KEYS,
    allFieldKeys: allFieldKeys,
    isButton: isButton,
    clone: clone,
    normalize: normalize,
    cloneForPersist: cloneForPersist,
    mergeInto: mergeInto,
    mergeMissing: mergeMissing,
    copyViewFields: copyViewFields,
    findInList: findInList,
    runSelfTest: runSelfTest,
    runModelSelfTest: runModelSelfTest,
    runIntegrationTest: runIntegrationTest
  };
})();
