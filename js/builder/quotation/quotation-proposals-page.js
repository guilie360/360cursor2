/**
 * QuotationProposalsPage — proposals picker as an in-document section (V7.2.84).
 * Mounted once beside the hero; shown/hidden via presentation state (no route change).
 */
var QuotationProposalsPage = (function () {
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
          /* Mobile/tablet: compare stays top-right. Desktop: hidden via CSS (>=1024px). */
          '<button type="button" class="qpp__icon-btn qpp__chrome-compare" data-qpp-compare aria-label="Comparar" aria-pressed="false">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
              '<rect x="3" y="4" width="7" height="16" rx="1.5"/>' +
              '<rect x="14" y="4" width="7" height="16" rx="1.5"/>' +
            '</svg>' +
          '</button>' +
          /* Desktop only: fullscreen replaces compare in the top-right. */
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
        '</header>' +
        '<main class="qpp__main">' +
          '<p class="qpp__eyebrow">Showroom digital</p>' +
          '<h1 class="qpp__title">Selecciona una propuesta</h1>' +
          '<div class="qpp__cards-host">' +
            '<div class="qpp__grid" data-qpp-grid></div>' +
          '</div>' +
          /* Desktop only: COMPARAR centered under cards. */
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

    /* silence unused hint when compare off */
    if (hint && !hint.textContent) hint.textContent = '';
  }

  /**
   * Mount proposals UI into an existing host (pre-rendered for instant transitions).
   */
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

  /* Standalone /quotation/propuestas/ — keep for bookmarks; prefer in-runtime section. */
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

  return { mount: mount, boot: boot };
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
