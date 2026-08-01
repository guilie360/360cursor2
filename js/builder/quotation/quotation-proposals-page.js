/**
 * QuotationProposalsPage — proposals picker as an in-document section (V7.2.85).
 * Mounted once beside the hero; shown/hidden via presentation state (no route change).
 */
var QuotationProposalsPage = (function () {
  var AUDIO_SRC = '../assets/taroa/mujer-conforme.mp3';
  var PROPOSALS = [
    {
      id: 'still',
      title: 'Still',
      description: 'Imágenes.'
    },
    {
      id: 'motion',
      title: 'Motion',
      description: 'Imágenes, video y animación.'
    }
  ];

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function markup() {
    return '' +
      '<div class="qpp" data-qpp-root>' +
        '<header class="qpp__chrome">' +
          '<button type="button" class="qpp__icon-btn" data-qpp-back aria-label="Volver">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
          '</button>' +
          '<div class="qpp__chrome-end">' +
            /* Mobile/tablet: compare. Desktop: hidden via CSS (>=1024px). */
            '<button type="button" class="qpp__icon-btn qpp__chrome-compare" data-qpp-compare aria-label="Comparar" aria-pressed="false">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                '<rect x="3" y="4" width="7" height="16" rx="1.5"/>' +
                '<rect x="14" y="4" width="7" height="16" rx="1.5"/>' +
              '</svg>' +
            '</button>' +
            /* Desktop only: fullscreen. */
            '<button type="button" class="qpp__icon-btn qpp__chrome-fs" data-qpp-fullscreen aria-label="Pantalla completa" aria-pressed="false">' +
              '<svg class="qpp__fs-icon qpp__fs-icon--enter" viewBox="0 0 24 24" aria-hidden="true">' +
                '<path d="M8 3H5a2 2 0 0 0-2 2v3"/>' +
                '<path d="M16 3h3a2 2 0 0 1 2 2v3"/>' +
                '<path d="M8 21H5a2 2 0 0 1-2-2v-3"/>' +
                '<path d="M16 21h3a2 2 0 0 0 2-2v-3"/>' +
              '</svg>' +
              '<svg class="qpp__fs-icon qpp__fs-icon--exit" viewBox="0 0 24 24" aria-hidden="true" hidden>' +
                '<path d="M8 3v3a2 2 0 0 1-2 2H3"/>' +
                '<path d="M21 8h-3a2 2 0 0 1-2-2V3"/>' +
                '<path d="M3 16h3a2 2 0 0 1 2 2v3"/>' +
                '<path d="M16 21v-3a2 2 0 0 1 2-2h3"/>' +
              '</svg>' +
            '</button>' +
            /* Music note + volume popover (below fullscreen on desktop). */
            '<div class="qpp__audio-wrap" data-qpp-audio-wrap>' +
              '<button type="button" class="qpp__icon-btn qpp__chrome-music" data-qpp-music aria-label="Música" aria-expanded="false" aria-controls="qppAudioPanel">' +
                '<svg class="qpp__music-note" viewBox="0 0 24 24" aria-hidden="true">' +
                  '<path d="M9.2 18.6c0 1.55-1.35 2.7-2.95 2.7S3.3 20.15 3.3 18.6s1.35-2.7 2.95-2.7c.42 0 .82.08 1.18.22V5.2l11.2-2.05v12.7c0 1.55-1.35 2.7-2.95 2.7s-2.95-1.15-2.95-2.7 1.35-2.7 2.95-2.7c.42 0 .82.08 1.18.22V6.35L9.2 8.15v10.45z"/>' +
                '</svg>' +
              '</button>' +
              '<div class="qpp__audio-panel" id="qppAudioPanel" data-qpp-audio-panel hidden>' +
                '<button type="button" class="qpp__audio-play" data-qpp-audio-toggle aria-label="Reproducir">' +
                  '<svg class="qpp__audio-icon qpp__audio-icon--play" viewBox="0 0 24 24" aria-hidden="true">' +
                    '<path d="M8 5.5v13l11-6.5z"/>' +
                  '</svg>' +
                  '<svg class="qpp__audio-icon qpp__audio-icon--pause" viewBox="0 0 24 24" aria-hidden="true" hidden>' +
                    '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' +
                  '</svg>' +
                '</button>' +
                '<label class="qpp__audio-vol" aria-label="Volumen">' +
                  '<input type="range" class="qpp__audio-range" data-qpp-volume min="0" max="100" value="70" step="1">' +
                '</label>' +
              '</div>' +
              '<audio data-qpp-audio preload="metadata" loop playsinline src="' +
                escapeHtml(AUDIO_SRC) + '"></audio>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<main class="qpp__main">' +
          '<p class="qpp__eyebrow">Showroom digital</p>' +
          '<h1 class="qpp__title">Selecciona una propuesta</h1>' +
          '<div class="qpp__cards-host">' +
            '<div class="qpp__grid" data-qpp-grid></div>' +
          '</div>' +
          '<button type="button" class="qpp__compare-cta" data-qpp-compare-cta aria-pressed="false">' +
            'Comparar' +
          '</button>' +
          '<p class="qpp__hint" data-qpp-hint></p>' +
        '</main>' +
      '</div>';
  }

  function buildCard(proposal) {
    proposal = proposal || {};
    var title = String(proposal.title || 'Propuesta');
    var description = String(proposal.description || '');
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'qpp__card';
    card.setAttribute('data-proposal', String(proposal.id || ''));
    card.setAttribute('aria-label', title);
    card.innerHTML =
      '<span class="qpp__card-body">' +
        '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
        '<span class="qpp__card-rule" aria-hidden="true"></span>' +
        (description
          ? '<span class="qpp__card-desc">' + escapeHtml(description) + '</span>'
          : '') +
      '</span>';
    card.addEventListener('click', function (e) {
      e.preventDefault();
      /* Temporary: selection shell only — wire proposalDetail later. */
    });
    return card;
  }

  function render(root) {
    var grid = qs('[data-qpp-grid]', root);
    if (!grid) return;
    grid.innerHTML = '';
    PROPOSALS.forEach(function (p) {
      grid.appendChild(buildCard(p));
    });
  }

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }

  function syncFullscreenUi(root) {
    var btn = qs('[data-qpp-fullscreen]', root);
    if (!btn) return;
    var on = isFullscreen();
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
    var enter = qs('.qpp__fs-icon--enter', btn);
    var exit = qs('.qpp__fs-icon--exit', btn);
    if (enter) {
      if (on) enter.setAttribute('hidden', '');
      else enter.removeAttribute('hidden');
    }
    if (exit) {
      if (on) exit.removeAttribute('hidden');
      else exit.setAttribute('hidden', '');
    }
  }

  function toggleFullscreen(root) {
    var docEl = document.documentElement;
    if (isFullscreen()) {
      var exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (eExit) { /* ignore */ }
      }
      return;
    }
    var req =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.msRequestFullscreen;
    if (req) {
      try {
        var p = req.call(docEl);
        if (p && typeof p.catch === 'function') p.catch(function () { /* ignore */ });
      } catch (eReq) { /* ignore */ }
    }
    syncFullscreenUi(root);
  }

  function setCompareMode(root, on) {
    var shell = qs('[data-qpp-root]', root) || root;
    shell.classList.toggle('is-compare-mode', !!on);
    qsa('[data-qpp-compare], [data-qpp-compare-cta]', root).forEach(function (btn) {
      btn.classList.toggle('is-active', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var hint = qs('[data-qpp-hint]', root);
    if (hint) hint.textContent = on ? 'Modo comparar activo' : '';
  }

  function syncAudioUi(root) {
    var audio = qs('[data-qpp-audio]', root);
    var toggle = qs('[data-qpp-audio-toggle]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    if (!audio || !toggle) return;
    var playing = !audio.paused;
    toggle.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    if (musicBtn) musicBtn.classList.toggle('is-active', playing);
    var playIcon = qs('.qpp__audio-icon--play', toggle);
    var pauseIcon = qs('.qpp__audio-icon--pause', toggle);
    if (playIcon) {
      if (playing) playIcon.setAttribute('hidden', '');
      else playIcon.removeAttribute('hidden');
    }
    if (pauseIcon) {
      if (playing) pauseIcon.removeAttribute('hidden');
      else pauseIcon.setAttribute('hidden', '');
    }
  }

  function setAudioPanelOpen(root, open) {
    var panel = qs('[data-qpp-audio-panel]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    var wrap = qs('[data-qpp-audio-wrap]', root);
    if (!panel || !musicBtn) return;
    if (open) {
      panel.hidden = false;
      panel.removeAttribute('hidden');
      musicBtn.setAttribute('aria-expanded', 'true');
      if (wrap) wrap.classList.add('is-audio-open');
    } else {
      panel.hidden = true;
      panel.setAttribute('hidden', '');
      musicBtn.setAttribute('aria-expanded', 'false');
      if (wrap) wrap.classList.remove('is-audio-open');
    }
  }

  var ambientUnlockBound = false;

  function playAmbient(audio, root) {
    if (!audio) return;
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        syncAudioUi(root);
      }).catch(function () {
        /* Browsers block unmuted autoplay — unlock on first gesture. */
        if (ambientUnlockBound) return;
        ambientUnlockBound = true;
        var unlock = function () {
          audio.play().then(function () {
            syncAudioUi(root);
          }).catch(function () { /* ignore */ });
          document.removeEventListener('pointerdown', unlock, true);
          document.removeEventListener('touchstart', unlock, true);
          document.removeEventListener('keydown', unlock, true);
        };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('touchstart', unlock, true);
        document.addEventListener('keydown', unlock, true);
      });
    }
  }

  function startAmbientAudio(host) {
    var root = host || document.querySelector('[data-qpp-root]') ||
      document.querySelector('[data-qr-proposals]');
    if (!root) return false;
    var audio = qs('[data-qpp-audio]', root);
    if (!audio) return false;
    playAmbient(audio, root);
    return true;
  }

  function bindAudio(root) {
    var audio = qs('[data-qpp-audio]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    var toggle = qs('[data-qpp-audio-toggle]', root);
    var volume = qs('[data-qpp-volume]', root);
    var wrap = qs('[data-qpp-audio-wrap]', root);
    if (!audio || !musicBtn) return;

    audio.volume = volume ? Number(volume.value) / 100 : 0.7;
    audio.setAttribute('preload', 'auto');

    /* Autoplay as soon as the experience mounts. */
    playAmbient(audio, root);

    musicBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var panel = qs('[data-qpp-audio-panel]', root);
      var open = !(panel && !panel.hidden);
      setAudioPanelOpen(root, open);
    });

    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (audio.paused) {
          playAmbient(audio, root);
        } else {
          audio.pause();
        }
        syncAudioUi(root);
      });
    }

    if (volume) {
      volume.addEventListener('input', function () {
        audio.volume = Math.max(0, Math.min(1, Number(volume.value) / 100));
      });
      volume.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    audio.addEventListener('play', function () { syncAudioUi(root); });
    audio.addEventListener('pause', function () { syncAudioUi(root); });
    syncAudioUi(root);

    document.addEventListener('click', function (e) {
      if (!wrap || !wrap.classList.contains('is-audio-open')) return;
      if (wrap.contains(e.target)) return;
      setAudioPanelOpen(root, false);
    });
  }

  function bind(root, opts) {
    opts = opts || {};
    var back = qs('[data-qpp-back]', root);
    var hint = qs('[data-qpp-hint]', root);
    var fsBtn = qs('[data-qpp-fullscreen]', root);

    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof opts.onBack === 'function') opts.onBack();
      });
    }

    qsa('[data-qpp-compare], [data-qpp-compare-cta]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var shell = qs('[data-qpp-root]', root) || root;
        setCompareMode(root, !shell.classList.contains('is-compare-mode'));
      });
    });

    if (fsBtn) {
      fsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleFullscreen(root);
      });
    }

    function onFsChange() {
      syncFullscreenUi(root);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    syncFullscreenUi(root);
    bindAudio(root);

    if (hint && !hint.textContent) hint.textContent = '';
  }

  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    host.innerHTML = markup();
    bind(host, opts);
    render(host);
    return {
      el: host,
      refresh: function () { render(host); }
    };
  }

  function boot() {
    var root = document.getElementById('qrProposalsPage');
    if (!root) return;
    mount(root, {
      onBack: function () {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = '/';
      }
    });
  }

  return {
    mount: mount,
    boot: boot,
    startAmbientAudio: startAmbientAudio
  };
})();

(function () {
  function start() {
    if (!document.getElementById('qrProposalsPage')) return;
    if (typeof QuotationProposalsPage !== 'undefined' && QuotationProposalsPage.boot) {
      QuotationProposalsPage.boot();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
