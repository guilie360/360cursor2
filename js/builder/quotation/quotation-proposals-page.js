/**
 * QuotationProposalsPage — proposals picker as an in-document section (V7.2.82).
 * Mounted once beside the hero; shown/hidden via presentation state (no route change).
 */
var QuotationProposalsPage = (function () {
  var PROPOSALS = [
    { id: 'proposal-1', title: 'Propuesta 1' },
    { id: 'proposal-2', title: 'Propuesta 2' }
  ];

  function qs(sel, root) {
    return (root || document).querySelector(sel);
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
          '<button type="button" class="qpp__icon-btn" data-qpp-compare aria-label="Comparar" aria-pressed="false">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
              '<rect x="3" y="4" width="7" height="16" rx="1.5"/>' +
              '<rect x="14" y="4" width="7" height="16" rx="1.5"/>' +
            '</svg>' +
          '</button>' +
        '</header>' +
        '<main class="qpp__main">' +
          '<p class="qpp__eyebrow">Showroom digital</p>' +
          '<h1 class="qpp__title">Selecciona una propuesta</h1>' +
          '<div class="qpp__cards-host">' +
            '<div class="qpp__grid" data-qpp-grid></div>' +
          '</div>' +
          '<p class="qpp__hint" data-qpp-hint></p>' +
        '</main>' +
      '</div>';
  }

  function buildCard(proposal) {
    proposal = proposal || {};
    var title = String(proposal.title || 'Propuesta');
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'qpp__card';
    card.setAttribute('data-proposal', String(proposal.id || ''));
    card.setAttribute('aria-label', title);
    card.innerHTML =
      '<span class="qpp__card-title">' + escapeHtml(title) + '</span>';
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

  function bind(root, opts) {
    opts = opts || {};
    var back = qs('[data-qpp-back]', root);
    var compare = qs('[data-qpp-compare]', root);
    var hint = qs('[data-qpp-hint]', root);
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof opts.onBack === 'function') opts.onBack();
      });
    }
    if (compare) {
      compare.addEventListener('click', function (e) {
        e.preventDefault();
        var shell = qs('[data-qpp-root]', root) || root;
        var on = shell.classList.toggle('is-compare-mode');
        compare.classList.toggle('is-active', on);
        compare.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (hint) hint.textContent = on ? 'Modo comparar activo' : '';
      });
    }
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
