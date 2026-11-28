/**
 * BuilderDirtyState — V7.1.08 global unsaved-changes indicator for all Builders.
 */
var BuilderDirtyState = (function () {
  var dirty = false;
  var STATUS_ID = 'builderSaveStatus';

  function ensureStatusEl() {
    var existing = document.getElementById(STATUS_ID);
    if (existing) return existing;
    var dockActions = document.getElementById('boxiesDockActions');
    if (!dockActions) return null;
    var el = document.createElement('span');
    el.id = STATUS_ID;
    el.className = 'builder-save-status is-clean';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('data-boxies-page-action', '1');
    var saveBtn = document.getElementById('builderSaveBtn');
    if (saveBtn && saveBtn.parentNode === dockActions) {
      dockActions.insertBefore(el, saveBtn);
    } else {
      dockActions.insertBefore(el, dockActions.firstChild);
    }
    return el;
  }

  function syncUi() {
    var el = ensureStatusEl();
    if (!el) return;
    if (dirty) {
      el.className = 'builder-save-status is-dirty';
      el.innerHTML = '<span class="builder-save-status__dot" aria-hidden="true"></span>Cambios sin guardar';
    } else {
      el.className = 'builder-save-status is-clean';
      el.innerHTML = '<span class="builder-save-status__mark" aria-hidden="true">✓</span>Todos los cambios guardados';
    }
  }

  function mark() {
    if (dirty) {
      syncUi();
      return;
    }
    dirty = true;
    syncUi();
    try {
      window.dispatchEvent(new CustomEvent('boxies:builder-dirty', { detail: { dirty: true } }));
    } catch (e) {}
  }

  function clear() {
    dirty = false;
    syncUi();
    try {
      window.dispatchEvent(new CustomEvent('boxies:builder-dirty', { detail: { dirty: false } }));
    } catch (e) {}
  }

  function isDirty() {
    return !!dirty;
  }

  function mount() {
    syncUi();
  }

  function destroy() {
    var el = document.getElementById(STATUS_ID);
    if (el && el.parentNode) {
      try { el.parentNode.removeChild(el); } catch (e) {}
    }
    dirty = false;
  }

  return {
    mark: mark,
    clear: clear,
    isDirty: isDirty,
    mount: mount,
    destroy: destroy,
    syncUi: syncUi
  };
})();
