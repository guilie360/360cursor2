/* BOXIES RuntimeCompiler — orchestrates compile → validate → stats → pipeline.
 * Stores executable runtime on window.BuilderRuntime (memory only). */
var RuntimeCompiler = (function () {
  var _last = null;

  function emptyLast() {
    return {
      runtime: null,
      validations: null,
      pipeline: [],
      statistics: null,
      durationMs: 0,
      generatedAt: null,
      ok: false
    };
  }

  function isReady() {
    return !!(window.BuilderRuntime && window.BuilderRuntime.generatedAt);
  }

  function getLast() {
    return _last;
  }

  function getRuntime() {
    return window.BuilderRuntime || null;
  }

  function clear() {
    _last = emptyLast();
    try { window.BuilderRuntime = null; } catch (e) {}
    return _last;
  }

  /**
   * Compile Experiencia (+ Hero/Media snapshots) into an executable runtime.
   * Does not touch Supabase / Publish / Experiencia logic.
   */
  function compile(state) {
    var t0 = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureFlow) {
      try { ExperienciaEngine.ensureFlow(state); } catch (eFlow) {}
    }

    /* Ensure HUB selectedPlants are synced from Media before serialize/validate */
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.syncHubPlantasFromMedia) {
      try {
        var exp = (state && state.experiencia) || {};
        (exp.nodes || []).forEach(function (n) {
          if (n && n.config && n.config.hub && n.config.hub.enabled) {
            ExperienciaEngine.syncHubPlantasFromMedia(state, n);
          }
        });
      } catch (eHub) {}
    }

    var generatedAt = new Date().toISOString();
    var runtime = RuntimeSerializer.serialize(state, { generatedAt: generatedAt });
    var statistics = RuntimeStatistics.compute(runtime);
    runtime.statistics = statistics;

    var validations = RuntimeValidator.validate(state, runtime);
    var pipeline = RuntimePipeline.build(state);

    var t1 = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    var durationMs = Math.max(0, Math.round(t1 - t0));
    if (runtime.meta) runtime.meta.durationMs = durationMs;

    window.BuilderRuntime = runtime;

    _last = {
      runtime: runtime,
      validations: validations,
      pipeline: pipeline,
      statistics: statistics,
      durationMs: durationMs,
      generatedAt: generatedAt,
      ok: !!(validations && validations.ok)
    };

    try {
      window.dispatchEvent(new CustomEvent('boxies:runtime-compiled', {
        detail: { ok: _last.ok, generatedAt: generatedAt, durationMs: durationMs }
      }));
    } catch (eEvt) {}

    return _last;
  }

  return {
    compile: compile,
    clear: clear,
    getLast: getLast,
    getRuntime: getRuntime,
    isReady: isReady
  };
})();
