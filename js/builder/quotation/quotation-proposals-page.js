/**
 * QuotationProposalsPage — proposals picker as an in-document section (V7.2.85).
 * Mounted once beside the hero; shown/hidden via presentation state (no route change).
 */
var QuotationProposalsPage = (function () {
  var AUDIO_SRC = '../assets/taroa/mujer-conforme.mp3';
  /* TAROA public WhatsApp (CO). Digits only with country code. */
  var WHATSAPP_NUMBER = '573226834084';
  var PROPOSALS = [
    {
      id: 'still',
      title: 'Still',
      price: '$3.500.000',
      blurb: 'Presentación interactiva\nbasada en imágenes.',
      waMessage: 'Primo, me voy por STILL'
    },
    {
      id: 'motion',
      title: 'Motion',
      price: '$5.000.000',
      blurb: 'Presentación interactiva basada en imágenes videos y animaciones.',
      waMessage: 'Primo, me voy por MOTION'
    }
  ];

  var COMPARE_DIFFS = [
    { label: 'Videos y animaciones', still: '—', motion: '✓' },
    { label: 'Vista aérea del proyecto', still: '—', motion: '✓' },
    { label: 'Identidad visual inicial (logo)', still: '—', motion: '✓' },
    { label: 'Presentación en tablets y celulares', still: '—', motion: '✓' },
    { label: 'Moodboard de materiales', still: '—', motion: '✓' },
    { label: 'Renders exteriores (cantidad aproximada)', still: '4–6', motion: '10–12' }
  ];

  var COMPARE_SHARED = [
    { label: 'Diseño de fachada (2 tipologías)', still: '✓', motion: '✓' },
    { label: 'Modelado 3D', still: '✓', motion: '✓' },
    { label: 'Implantación conceptual', still: '✓', motion: '✓' },
    { label: 'Plantas amobladas (4)', still: '✓', motion: '✓' },
    { label: 'Mini brochure ejecutivo', still: '✓', motion: '✓' },
    { label: 'Link personalizado', still: '✓', motion: '✓' },
    { label: 'Música ambiental', still: '✓', motion: '✓' },
    { label: 'Presentación en PC', still: '✓', motion: '✓' },
    { label: 'Presentación por imágenes', still: '✓', motion: '✓' }
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
            /* Mobile/tablet: compare text. Desktop: hidden via CSS (>=1024px). */
            '<button type="button" class="qpp__icon-btn qpp__chrome-compare" data-qpp-compare aria-label="Comparar" aria-pressed="false">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                '<rect x="3" y="4" width="7" height="16" rx="1.5"/>' +
                '<rect x="14" y="4" width="7" height="16" rx="1.5"/>' +
              '</svg>' +
              '<span class="qpp__chrome-compare-label">Comparar</span>' +
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
        '<main class="qpp__main" data-qpp-selection>' +
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
        '<section class="qpp__compare" data-qpp-compare-view aria-hidden="true">' +
          '<p class="qpp__eyebrow qpp-cmp__eyebrow">Showroom digital</p>' +
          '<h1 class="qpp__title qpp-cmp__title">Comparar propuestas</h1>' +
          '<div class="qpp-cmp" data-qpp-compare-board></div>' +
        '</section>' +
      '</div>';
  }

  function openWhatsApp(message) {
    var phone = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!phone) return;
    var text = encodeURIComponent(String(message || '').trim());
    var url = 'https://wa.me/' + phone + (text ? ('?text=' + text) : '');
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (eOpen) {
      window.location.href = url;
    }
  }

  function buildCard(proposal) {
    proposal = proposal || {};
    var title = String(proposal.title || 'Propuesta');
    var price = String(proposal.price || '');
    var waMessage = String(proposal.waMessage || ('Primo, me voy por ' + title.toUpperCase()));
    var blurbHtml = String(proposal.blurb || '')
      .split('\n')
      .map(function (line) { return escapeHtml(line); })
      .join('<br>');

    var card = document.createElement('div');
    card.className = 'qpp__card';
    card.setAttribute('data-proposal', String(proposal.id || ''));
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', title);
    card.setAttribute('aria-pressed', 'false');

    card.innerHTML =
      '<div class="qpp__card-inner">' +
        '<div class="qpp__card-face qpp__card-face--front">' +
          '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
        '</div>' +
        '<div class="qpp__card-face qpp__card-face--back">' +
          '<div class="qpp__card-panel qpp__card-panel--detail" data-qpp-panel="detail">' +
            '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
            '<span class="qpp__card-price">' + escapeHtml(price) + '</span>' +
            '<span class="qpp__card-desc">' + blurbHtml + '</span>' +
            '<button type="button" class="qpp__card-select" data-proposal-select="' +
              escapeHtml(proposal.id || '') + '">Seleccionar</button>' +
          '</div>' +
          '<div class="qpp__card-panel qpp__card-panel--confirm" data-qpp-panel="confirm" hidden>' +
            '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
            '<div class="qpp__card-terms">' +
              '<span>Anticipo del 50%</span>' +
              '<span>2 a 3 semanas</span>' +
              '<span>Saldo contra entrega</span>' +
            '</div>' +
            '<button type="button" class="qpp__card-select" data-proposal-confirm="' +
              escapeHtml(proposal.id || '') + '">Voy con esta</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var detailPanel = card.querySelector('[data-qpp-panel="detail"]');
    var confirmPanel = card.querySelector('[data-qpp-panel="confirm"]');

    function showDetail() {
      card.classList.remove('is-confirming');
      if (detailPanel) detailPanel.hidden = false;
      if (confirmPanel) confirmPanel.hidden = true;
    }

    function showConfirm() {
      card.classList.add('is-confirming');
      if (detailPanel) detailPanel.hidden = true;
      if (confirmPanel) confirmPanel.hidden = false;
    }

    function isCardAction(target) {
      return !!(
        target &&
        target.closest &&
        target.closest('[data-proposal-select], [data-proposal-confirm]')
      );
    }

    function flip() {
      var on = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!on) showDetail();
    }

    card.addEventListener('click', function (e) {
      if (isCardAction(e.target)) return;
      e.preventDefault();
      flip();
    });

    card.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (isCardAction(e.target)) return;
      e.preventDefault();
      flip();
    });

    var selectBtn = card.querySelector('[data-proposal-select]');
    if (selectBtn) {
      selectBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showConfirm();
      });
    }

    var confirmBtn = card.querySelector('[data-proposal-confirm]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openWhatsApp(waMessage);
      });
    }

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

  function cellClass(value) {
    var v = String(value || '').trim();
    if (v === '✓') return 'qpp-cmp__val qpp-cmp__val--yes';
    if (v === '—' || v === '-') return 'qpp-cmp__val qpp-cmp__val--no';
    return 'qpp-cmp__val qpp-cmp__val--text';
  }

  function buildCompareRows(rows, delayStart, tone) {
    return rows.map(function (row, index) {
      var delay = delayStart + index * 30;
      return '' +
        '<div class="qpp-cmp__row qpp-cmp__row--' + tone + '" style="--qpp-cmp-delay:' + delay + 'ms">' +
          '<div class="qpp-cmp__feature">' + escapeHtml(row.label) + '</div>' +
          '<div class="' + cellClass(row.still) + '" data-col="still">' +
            '<span class="qpp-cmp__col-label">Still</span>' +
            '<span class="qpp-cmp__mark">' + escapeHtml(row.still) + '</span>' +
          '</div>' +
          '<div class="' + cellClass(row.motion) + '" data-col="motion">' +
            '<span class="qpp-cmp__col-label">Motion</span>' +
            '<span class="qpp-cmp__mark">' + escapeHtml(row.motion) + '</span>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderCompare(root) {
    var board = qs('[data-qpp-compare-board]', root);
    if (!board) return;

    var diffsHtml = buildCompareRows(COMPARE_DIFFS, 280, 'diff');
    var sharedHtml = buildCompareRows(COMPARE_SHARED, 280 + COMPARE_DIFFS.length * 30 + 180, 'shared');

    board.innerHTML =
      '<div class="qpp-cmp__head">' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--feature">Alcance</div>' +
        '<div class="qpp-cmp__hcell">Still</div>' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--motion">' +
          '<span class="qpp-cmp__h-title">Motion</span>' +
          '<span class="qpp-cmp__h-sub">Mayor impacto visual</span>' +
        '</div>' +
      '</div>' +
      '<section class="qpp-cmp__block qpp-cmp__block--diff" style="--qpp-cmp-block-delay:220ms">' +
        '<h2 class="qpp-cmp__block-title">Diferencias principales</h2>' +
        '<div class="qpp-cmp__body">' + diffsHtml + '</div>' +
      '</section>' +
      '<section class="qpp-cmp__block qpp-cmp__block--shared" style="--qpp-cmp-block-delay:' +
        (280 + COMPARE_DIFFS.length * 30 + 80) + 'ms">' +
        '<h2 class="qpp-cmp__block-title">Incluido en ambas propuestas</h2>' +
        '<div class="qpp-cmp__body">' + sharedHtml + '</div>' +
      '</section>' +
      '<p class="qpp-cmp__note" style="--qpp-cmp-delay:' +
        (280 + COMPARE_DIFFS.length * 30 + COMPARE_SHARED.length * 30 + 220) + 'ms">' +
        'Ambas propuestas están diseñadas para presentar el proyecto ante inversionistas. ' +
        'La diferencia está en el nivel de impacto y producción audiovisual.' +
      '</p>';
  }

  function setQppView(root, view) {
    var shell = qs('[data-qpp-root]', root) || root;
    var next = view === 'comparison' ? 'comparison' : 'selection';
    shell.setAttribute('data-qpp-view', next);
    shell.classList.toggle('is-compare-view', next === 'comparison');
    shell.classList.remove('is-compare-mode');

    var compareView = qs('[data-qpp-compare-view]', root);
    var selection = qs('[data-qpp-selection]', root);
    if (selection) {
      selection.setAttribute('aria-hidden', next === 'comparison' ? 'true' : 'false');
    }
    if (compareView) {
      compareView.setAttribute('aria-hidden', next === 'comparison' ? 'false' : 'true');
    }

    qsa('[data-qpp-compare], [data-qpp-compare-cta]', root).forEach(function (btn) {
      var on = next === 'comparison';
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (next === 'comparison') {
      renderCompare(root);
      /* Retrigger row entrance animations */
      requestAnimationFrame(function () {
        shell.classList.remove('is-cmp-animate');
        void shell.offsetWidth;
        shell.classList.add('is-cmp-animate');
      });
    }
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

  function isMobileAudioChrome() {
    try {
      return window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
    } catch (e) {
      return false;
    }
  }

  function toggleAmbientPlayback(audio, root) {
    if (!audio) return;
    if (audio.paused) playAmbient(audio, root);
    else audio.pause();
    syncAudioUi(root);
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
      /* Mobile: note button only play/pause. Desktop: open volume panel. */
      if (isMobileAudioChrome()) {
        setAudioPanelOpen(root, false);
        toggleAmbientPlayback(audio, root);
        return;
      }
      var panel = qs('[data-qpp-audio-panel]', root);
      var open = !(panel && !panel.hidden);
      setAudioPanelOpen(root, open);
    });

    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleAmbientPlayback(audio, root);
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
    var shell = qs('[data-qpp-root]', root) || root;
    var back = qs('[data-qpp-back]', root);
    var hint = qs('[data-qpp-hint]', root);
    var fsBtn = qs('[data-qpp-fullscreen]', root);

    shell.setAttribute('data-qpp-view', 'selection');

    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        var view = shell.getAttribute('data-qpp-view') || 'selection';
        if (view === 'comparison') {
          setQppView(root, 'selection');
          return;
        }
        if (typeof opts.onBack === 'function') opts.onBack();
      });
    }

    qsa('[data-qpp-compare], [data-qpp-compare-cta]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setQppView(root, 'comparison');
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
    renderCompare(root);

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
