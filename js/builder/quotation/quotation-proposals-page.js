/**
 * QuotationProposalsPage — full-page proposals picker (V7.2.81).
 * Cinematic cards matching TAROA landing identity.
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

  function readParams() {
    try {
      return new URLSearchParams(window.location.search || '');
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function goBack() {
    var p = readParams();
    var slug = String(p.get('slug') || p.get('from') || '').trim();
    var url = slug ? ('/' + encodeURIComponent(slug)) : '/';
    window.location.href = url;
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
      /* Temporary: selection shell only — wire destinations later. */
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

  function bind(root) {
    var back = qs('[data-qpp-back]', root);
    var compare = qs('[data-qpp-compare]', root);
    var hint = qs('[data-qpp-hint]', root);
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        goBack();
      });
    }
    if (compare) {
      compare.addEventListener('click', function (e) {
        e.preventDefault();
        var on = root.classList.toggle('is-compare-mode');
        compare.classList.toggle('is-active', on);
        compare.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (hint) {
          hint.textContent = on ? 'Modo comparar activo' : '';
        }
      });
    }
  }

  function boot() {
    var root = document.getElementById('qrProposalsPage');
    if (!root) return;
    document.title = 'Propuestas';
    var p = readParams();
    var slug = String(p.get('slug') || '').trim();
    if (slug) document.title = 'Propuestas · ' + slug;
    bind(root);
    render(root);
  }

  return { boot: boot, goBack: goBack };
})();

(function () {
  function start() {
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
