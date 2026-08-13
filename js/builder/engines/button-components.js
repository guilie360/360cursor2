/* BOXIES — Saved button components (project-scoped snapshots). */
var ButtonComponents = (function () {
  var SNAPSHOT_KEYS = [
    'type', 'label', 'style', 'icon',
    'boxW', 'boxH', 'x', 'y',
    'bgColor', 'bgOpacity', 'textColor',
    'borderColor', 'borderWidth', 'borderRadius',
    'opacity', 'fontSize', 'fontSizeUnit', 'fontWeight', 'fontFamily',
    'fontStyle', 'textDecoration', 'textAlign', 'lineHeight',
    'letterSpacing', 'textTransform', 'textShadow',
    'hoverEnabled', 'hoverColor', 'hoverTextColor', 'hoverTransition',
    'pressedColor', 'pressedTextColor', 'pressedScale',
    'buttonType', 'buttonConfig', 'size', 'scaleValue', 'scaleUnit',
    'anchor', 'marginX', 'marginY', 'positionMode', 'rotation',
    'enabled', 'visible', 'locked', 'buttonShape', 'buttonShapeKind'
  ];

  function cloneJson(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function uid(prefix) {
    return (prefix || 'bc') + '-' + Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7);
  }

  /** Deep snapshot of a BUTTON interaction — independent of source instance. */
  function snapshotFromInteraction(ix) {
    if (!ix || String(ix.type || '').toUpperCase() !== 'BUTTON') return null;
    var snap = { type: 'BUTTON' };
    SNAPSHOT_KEYS.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(ix, key)) return;
      if (ix[key] === undefined) return;
      if (key === 'buttonConfig' && ix[key] && typeof ix[key] === 'object') {
        snap[key] = cloneJson(ix[key]);
      } else {
        snap[key] = ix[key];
      }
    });
    return snap;
  }

  /** Insert payload — always center; never ties to stored component id. */
  function snapshotForInsert(buttonSnap) {
    var snap = cloneJson(buttonSnap || {});
    snap.type = 'BUTTON';
    snap.x = 50;
    snap.y = 50;
    snap.positionMode = 'free';
    snap.positionInitialized = true;
    snap.locked = false;
    return snap;
  }

  function normalizeComponent(raw, projectId) {
    if (!raw || !raw.button) return null;
    var btn = raw.button;
    if (String(btn.type || raw.type || '').toUpperCase() !== 'BUTTON') return null;
    return {
      id: String(raw.id || uid('bc')),
      name: String(raw.name || 'Componente'),
      type: 'button',
      projectId: projectId != null ? String(projectId) : (raw.projectId || null),
      createdAt: raw.createdAt != null ? Number(raw.createdAt) : Date.now(),
      button: cloneJson(btn)
    };
  }

  function createComponent(name, buttonSnap, projectId) {
    var snap = snapshotFromInteraction(buttonSnap) || cloneJson(buttonSnap);
    if (!snap) return null;
    return normalizeComponent({
      id: uid('bc'),
      name: String(name || 'Mi botón').trim() || 'Mi botón',
      type: 'button',
      projectId: projectId || null,
      createdAt: Date.now(),
      button: snap
    }, projectId);
  }

  function renderThumbnailHtml(buttonSnap) {
    if (typeof ButtonOverlayRenderer !== 'undefined' &&
        ButtonOverlayRenderer.renderButtonSnapshotThumbnail) {
      return ButtonOverlayRenderer.renderButtonSnapshotThumbnail(buttonSnap);
    }
    return '';
  }

  return {
    SNAPSHOT_KEYS: SNAPSHOT_KEYS,
    snapshotFromInteraction: snapshotFromInteraction,
    snapshotForInsert: snapshotForInsert,
    normalizeComponent: normalizeComponent,
    createComponent: createComponent,
    renderThumbnailHtml: renderThumbnailHtml
  };
})();
