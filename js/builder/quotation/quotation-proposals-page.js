/**
 * QuotationProposalsPage — full-page proposals picker (V7.2.78).
 * Replaces popup flow for TAROA-style landings.
 */
var QuotationProposalsPage = (function () {
  var PROPOSALS = [
    {
      id: 'proposal-1',
      title: 'Propuesta 1',
      tag: 'Propuesta',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
      cta: 'Ver propuesta',
      imageUrl: '',
      imageLabel: 'P1'
    },
    {
      id: 'proposal-2',
      title: 'Propuesta 2',
      tag: 'Propuesta',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud.',
      cta: 'Ver propuesta',
      imageUrl: '',
      imageLabel: 'P2'
    }
  ];

  function qs(sel, root) {
    return (root || document).querySelector(sel);
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

  function playEntrance(grid) {
    if (!grid) return;
    var cards = grid.querySelectorAll('.unit-card');
    cards.forEach(function (card, index) {
      card.classList.remove('unit-card--enter');
      card.style.removeProperty('--unit-enter-delay');
      card.style.setProperty('--unit-enter-delay', Math.min(index * 160, 960) + 'ms');
      void card.offsetWidth;
      card.classList.add('unit-card--enter');
      function onEnd(ev) {
        if (ev && ev.animationName && ev.animationName !== 'unitCardAppleEnter') return;
        card.classList.remove('unit-card--enter');
        card.style.removeProperty('--unit-enter-delay');
        card.removeEventListener('animationend', onEnd);
      }
      card.addEventListener('animationend', onEnd);
    });
  }

  function render(root) {
    var grid = qs('[data-qpp-grid]', root);
    if (!grid) return;
    grid.innerHTML = '';
    if (typeof QuotationProposalsModal !== 'undefined' && QuotationProposalsModal.buildProposalCard) {
      PROPOSALS.forEach(function (p) {
        grid.appendChild(QuotationProposalsModal.buildProposalCard(p));
      });
    }
    requestAnimationFrame(function () {
      playEntrance(grid);
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
          hint.textContent = on
            ? 'Modo comparar activo'
            : '';
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
