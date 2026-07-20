console.log("BOOT ENTER js/style-engine/visual-audit/visual-audit-capture.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/visual-audit/visual-audit-capture.js');}catch(_e){}
/* Visual Audit — Captura real de lo que se ve (Screen Capture API) */
var VisualAuditCapture = (function () {
  var displayStream = null;
  var videoEl = null;
  var track = null;

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function supportsDisplayCapture() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
  }

  function hideAuditChrome(hide) {
    var nodes = document.querySelectorAll('.va-ui-root, .va-progress, .va-confirm, .va-summary');
    nodes.forEach(function (n) {
      if (hide) {
        n.dataset.vaPrevDisplay = n.style.display || '';
        n.style.display = 'none';
      } else {
        n.style.display = n.dataset.vaPrevDisplay || '';
        delete n.dataset.vaPrevDisplay;
      }
    });
  }

  function stopScreenCapture() {
    try {
      if (track) track.stop();
    } catch (e) { /* noop */ }
    try {
      if (displayStream) {
        displayStream.getTracks().forEach(function (t) { t.stop(); });
      }
    } catch (e2) { /* noop */ }
    if (videoEl) {
      try { videoEl.srcObject = null; } catch (e3) { /* noop */ }
      if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
    }
    displayStream = null;
    videoEl = null;
    track = null;
  }

  function waitForVideoFrame(video, timeoutMs) {
    timeoutMs = timeoutMs || 4000;
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      function check() {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('La captura de pantalla no entregó frames. Elige «Esta pestaña» / «Chrome Tab».'));
          return;
        }
        requestAnimationFrame(check);
      }
      check();
    });
  }

  /**
   * Pide UNA vez compartir la pestaña actual.
   * El usuario debe elegir: Esta pestaña / This tab / Chrome Tab
   * (no toda la pantalla ni otra ventana).
   */
  function beginScreenCapture() {
    if (!supportsDisplayCapture()) {
      return Promise.reject(new Error(
        'Este navegador no permite captura de pantalla. Usa Chrome o Edge.'
      ));
    }

    stopScreenCapture();

    return navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        frameRate: 30
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      systemAudio: 'exclude'
    }).then(function (stream) {
      displayStream = stream;
      track = stream.getVideoTracks()[0] || null;
      if (!track) throw new Error('No se obtuvo pista de video');

      track.addEventListener('ended', function () {
        displayStream = null;
        track = null;
      });

      videoEl = document.createElement('video');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(videoEl);
      videoEl.srcObject = stream;

      return videoEl.play().catch(function () { /* autoplay muted ok */ }).then(function () {
        return waitForVideoFrame(videoEl);
      }).then(function () {
        return { mode: 'screen', label: 'Captura de pestaña' };
      });
    }).catch(function (err) {
      stopScreenCapture();
      if (err && err.name === 'NotAllowedError') {
        throw new Error('Debes permitir compartir «Esta pestaña» para capturar la web tal como se ve.');
      }
      throw err;
    });
  }

  function isScreenCaptureActive() {
    return !!(track && track.readyState === 'live' && videoEl && videoEl.videoWidth > 0);
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob && blob.size > 0) resolve(blob);
        else reject(new Error('PNG vacío'));
      }, 'image/png');
    });
  }

  function grabScreenFrame() {
    if (!isScreenCaptureActive()) {
      return Promise.reject(new Error('La captura de pestaña se detuvo. Vuelve a iniciar y elige «Esta pestaña».'));
    }

    var vw = videoEl.videoWidth;
    var vh = videoEl.videoHeight;
    var canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, vw, vh);

    return canvasToBlob(canvas).then(function (blob) {
      return {
        blob: blob,
        width: vw,
        height: vh,
        mime: 'image/png'
      };
    });
  }

  function captureViewport(options) {
    options = options || {};
    var waitMs = options.waitMs != null ? options.waitMs : 500;

    hideAuditChrome(true);

    return sleep(waitMs)
      .then(function () {
        /* Un frame extra para que el navegador pinte la UI sin el overlay de progreso */
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        });
      })
      .then(function () {
        return sleep(80);
      })
      .then(function () {
        return grabScreenFrame();
      })
      .finally(function () {
        hideAuditChrome(false);
      });
  }

  /* Compat: el runner ya no necesita html2canvas */
  function loadHtml2Canvas() {
    return Promise.resolve(null);
  }

  function waitForAssets(timeoutMs) {
    return sleep(Math.min(timeoutMs || 300, 300));
  }

  return {
    supportsDisplayCapture: supportsDisplayCapture,
    beginScreenCapture: beginScreenCapture,
    stopScreenCapture: stopScreenCapture,
    isScreenCaptureActive: isScreenCaptureActive,
    captureViewport: captureViewport,
    loadHtml2Canvas: loadHtml2Canvas,
    waitForAssets: waitForAssets,
    sleep: sleep
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/visual-audit/visual-audit-capture.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/visual-audit/visual-audit-capture.js");
