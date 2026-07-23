/* Interactive Areas Engine — lab wrapper for BOXIES Builder */
var InteractiveAreasEngine = (function () {
  var mountInstance = null;

  function ensureLabState(state) {
    if (!state.interactiveLab && typeof InteractiveAreasCore !== 'undefined') {
      state.interactiveLab = InteractiveAreasCore.createLabState();
    }
    return state.interactiveLab;
  }

  function mount(container, state, options) {
    options = options || {};
    if (!container || typeof InteractiveAreasCanvas === 'undefined') return null;
    if (mountInstance && typeof mountInstance.destroy === 'function') {
      try { mountInstance.destroy(); } catch (_e) {}
      mountInstance = null;
    }
    var lab = ensureLabState(state);
    mountInstance = InteractiveAreasCanvas.create(container, {
      mode: options.mode || 'editor',
      state: lab,
      onChange: function (next) {
        state.interactiveLab = next;
        if (typeof options.onChange === 'function') options.onChange(next);
      }
    });
    return mountInstance;
  }

  function unmount() {
    if (mountInstance && typeof mountInstance.destroy === 'function') {
      try { mountInstance.destroy(); } catch (_e) {}
    }
    mountInstance = null;
  }

  function mountViewer(container) {
    if (!container || typeof InteractiveAreasCanvas === 'undefined' || typeof InteractiveAreasCore === 'undefined') {
      return null;
    }
    return InteractiveAreasCanvas.create(container, {
      mode: 'viewer',
      state: InteractiveAreasCore.createLabState()
    });
  }

  function resize() {
    if (mountInstance && typeof mountInstance.resize === 'function') {
      mountInstance.resize();
    }
  }

  return {
    ensureLabState: ensureLabState,
    mount: mount,
    unmount: unmount,
    mountViewer: mountViewer,
    resize: resize
  };
})();
