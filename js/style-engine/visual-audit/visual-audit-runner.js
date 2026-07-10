/* Visual Audit — Runner: recorrer pantallas y guardar PNG reales */
var VisualAuditRunner = (function () {
  var running = false;
  var cancelled = false;
  var listeners = [];

  function emit(event, payload) {
    listeners.forEach(function (fn) {
      try { fn(event, payload); } catch (e) { /* noop */ }
    });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (x) { return x !== fn; });
    };
  }

  function isRunning() { return running; }

  function cancel() {
    cancelled = true;
    emit('cancelled', {});
  }

  function run() {
    if (running) return Promise.reject(new Error('Ya hay una captura en curso'));
    if (!StyleEngineCompatibility.isAdminViewer()) {
      return Promise.reject(new Error('Solo administradores'));
    }
    if (!VisualAuditCapture.supportsDisplayCapture()) {
      return Promise.reject(new Error('Usa Chrome o Edge para capturar la web tal como se ve.'));
    }

    running = true;
    cancelled = false;

    var scenes = VisualAuditCatalog.getAllScenes();
    var startedAt = new Date();
    var captures = [];
    var failed = [];
    var index = 0;
    var destMeta = null;

    emit('start', { total: scenes.length });

    return VisualAuditStorage.pickDestination()
      .then(function (meta) {
        destMeta = meta;
        emit('destination', meta);
        emit('progress', {
          current: 0,
          total: scenes.length,
          name: 'Elige «Esta pestaña» en el diálogo del navegador…',
          percent: 0
        });
        /* Captura real de píxeles (incluye hero, imágenes, vídeo, CSS) */
        return VisualAuditCapture.beginScreenCapture();
      })
      .then(function () {
        return VisualAuditNav.resetToHero();
      })
      .then(function () {
        var chain = Promise.resolve();
        scenes.forEach(function (scene, i) {
          chain = chain.then(function () {
            if (cancelled) return;

            if (!VisualAuditCapture.isScreenCaptureActive()) {
              throw new Error('Se detuvo la compartición de pestaña. Vuelve a iniciar la captura.');
            }

            emit('progress', {
              current: i + 1,
              total: scenes.length,
              name: scene.name,
              percent: Math.round((i / scenes.length) * 100)
            });

            return Promise.resolve()
              .then(function () {
                if (typeof scene.open === 'function') return scene.open(VisualAuditNav);
              })
              .then(function () {
                if (cancelled) return null;
                return VisualAuditCapture.captureViewport({ waitMs: scene.waitMs || 600 });
              })
              .then(function (shot) {
                if (!shot || cancelled) return;
                index += 1;
                return VisualAuditStorage.saveCapture(index, scene, shot.blob).then(function (saved) {
                  captures.push({
                    index: saved.index,
                    fileName: saved.fileName,
                    sceneName: scene.name
                  });
                  emit('captured', { scene: scene, file: saved });
                  emit('progress', {
                    current: i + 1,
                    total: scenes.length,
                    name: scene.name,
                    percent: Math.round(((i + 1) / scenes.length) * 100),
                    saved: saved.fileName
                  });
                });
              })
              .then(function () {
                if (typeof scene.close === 'function') return scene.close(VisualAuditNav);
              })
              .catch(function (err) {
                var msg = (err && err.message) ? err.message : String(err);
                failed.push({ name: scene.name, message: msg });
                emit('error', { scene: scene, message: msg });
                try {
                  if (typeof scene.close === 'function') scene.close(VisualAuditNav);
                } catch (e2) { /* noop */ }
                if (msg.indexOf('compartición') >= 0 || msg.indexOf('pestaña') >= 0) {
                  cancelled = true;
                }
              })
              .then(function () {
                return VisualAuditCapture.sleep(120);
              });
          });
        });
        return chain;
      })
      .then(function () {
        return VisualAuditNav.resetToHero().then(function () {
          return VisualAuditNav.ensureStyleEngineVisible();
        });
      })
      .then(function () {
        var finishedAt = new Date();
        return VisualAuditStorage.finalize().then(function (fin) {
          var session = {
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            durationMs: finishedAt - startedAt,
            destination: (fin && fin.label) || (destMeta && destMeta.label) || '',
            mode: (fin && fin.mode) || (destMeta && destMeta.mode) || '',
            totals: {
              scenes: scenes.length,
              captured: captures.length,
              failed: failed.length
            },
            captures: captures,
            failed: failed,
            cancelled: cancelled
          };
          emit('complete', session);
          return session;
        });
      })
      .finally(function () {
        VisualAuditCapture.stopScreenCapture();
        running = false;
      });
  }

  return {
    run: run,
    cancel: cancel,
    isRunning: isRunning,
    subscribe: subscribe
  };
})();
