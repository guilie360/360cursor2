/* BOXIES V6.3.02 — PrototypeRuntime removed as a separate navigation engine.
 * Compatibility shim: Prototipo uses ExperienceRuntime + PrototypeRenderer. */
var PrototypeRuntime = (function () {
  function mount(host, options) {
    options = options || {};
    if (typeof ExperienceRuntime === 'undefined' || !ExperienceRuntime.mount) {
      return null;
    }
    if (typeof PrototypeRenderer === 'undefined') return null;
    var runtime = options.runtime || null;
    if (!runtime && options.state && typeof RuntimeSerializer !== 'undefined') {
      try {
        runtime = RuntimeSerializer.serialize(options.state, {
          generatedAt: new Date().toISOString()
        });
      } catch (e) {}
    }
    return ExperienceRuntime.mount(host, {
      runtime: runtime,
      state: options.state || null,
      renderer: PrototypeRenderer,
      mode: 'prototype',
      startLabel: options.startLabel || '▶ Ver Prototipo'
    });
  }

  return {
    mount: mount,
    reset: function () {
      if (typeof ExperienceRuntime !== 'undefined' && ExperienceRuntime.reset) {
        ExperienceRuntime.reset();
      }
    },
    getActive: function () {
      return (typeof ExperienceRuntime !== 'undefined' && ExperienceRuntime.getActive)
        ? ExperienceRuntime.getActive()
        : null;
    }
  };
})();
