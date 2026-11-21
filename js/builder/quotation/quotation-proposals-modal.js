/**
 * QuotationProposalsModal — V7.2.24
 *
 * Hero "Cotización" opens a centered proposals picker.
 * Reuses Showroom housing cards (`.unit-card` + `.units-viviendas-popup` styles).
 * Content is temporary; swap PROPOSALS later without changing the card chrome.
 */
var QuotationProposalsModal = (function () {
  var POPUP_ID = 'qrProposalsPopup';
  var openState = false;
  var escBound = false;
  var lastFocus = null;

  /* Temporary content — replace titles/descriptions/images/actions later. */
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

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Same DOM chrome as Showroom `buildUnitCard` — only content slots change.
   * Classes: .unit-card, .unit-card-image, .unit-typo-*, .unit-typo-btn*
   */
  function buildProposalCard(proposal) {
    proposal = proposal || {};
    var card = document.createElement('div');
    card.className = 'unit-card';
    card.setAttribute('data-proposal', String(proposal.id || ''));

    var imageInner = proposal.imageUrl
      ? '<div class="unit-card-image-media" style="background-image:url(' +
          escapeHtml(proposal.imageUrl) + ')"></div>'
      : '';
    var fallback = proposal.imageUrl
      ? ''
      : '<span class="unit-card-image-fallback">' +
          escapeHtml(proposal.imageLabel || proposal.title || 'Propuesta') +
        '</span>';

    card.innerHTML =
      '<div class="unit-card-image">' +
        imageInner +
        '<div class="unit-card-image-scrim" aria-hidden="true"></div>' +
        fallback +
      '</div>' +
      '<div class="unit-typo-info">' +
        '<div class="unit-typo-tag">' + escapeHtml(proposal.tag || 'Propuesta') + '</div>' +
        '<div class="unit-typo-title">' + escapeHtml(proposal.title || 'Propuesta') + '</div>' +
        '<div class="unit-typo-price-block">' +
          '<div class="unit-typo-price-label">Descripción</div>' +
          '<div class="unit-typo-price-value unit-typo-price-value--desc">' +
            escapeHtml(proposal.description || '') +
          '</div>' +
        '</div>' +
        '<div class="unit-typo-btn-stack">' +
          '<div class="unit-typo-btn-row">' +
            '<button class="unit-typo-btn unit-typo-btn--cta" type="button" data-proposal-cta="' +
              escapeHtml(proposal.id || '') + '">' +
              escapeHtml(proposal.cta || 'Ver propuesta') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var cta = card.querySelector('[data-proposal-cta]');
    if (cta) {
      cta.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        /* Temporary: in modal close; on full page keep selection visible. */
        if (document.getElementById(POPUP_ID) && openState) close();
      });
    }

    return card;
  }

  function ensurePopup() {
    var existing = document.getElementById(POPUP_ID);
    if (existing) return existing;

    var popup = document.createElement('div');
    popup.id = POPUP_ID;
    popup.className = 'units-popup units-viviendas-popup qr-proposals-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-labelledby', 'qrProposalsTitle');
    popup.hidden = true;
    popup.innerHTML =
      '<div class="units-popup-box qr-proposals-box">' +
        '<button type="button" class="qr-proposals-close" data-qr-proposals-close aria-label="Cerrar">' +
          '&times;' +
        '</button>' +
        '<div class="popup-box-scroll">' +
          '<h2 class="demo-title" id="qrProposalsTitle">Selecciona una propuesta</h2>' +
          '<div class="units-grid units-viviendas-grid qr-proposals-grid" data-qr-proposals-grid></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(popup);

    popup.addEventListener('click', function (e) {
      if (e.target === popup) close();
    });
    var closeBtn = popup.querySelector('[data-qr-proposals-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        close();
      });
    }

    return popup;
  }

  function renderCards(grid) {
    if (!grid) return;
    grid.innerHTML = '';
    PROPOSALS.forEach(function (p) {
      grid.appendChild(buildProposalCard(p));
    });
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

  function onEsc(e) {
    if (!openState) return;
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  function bindEsc() {
    if (escBound) return;
    document.addEventListener('keydown', onEsc, true);
    escBound = true;
  }

  function open() {
    var popup = ensurePopup();
    var grid = popup.querySelector('[data-qr-proposals-grid]');
    renderCards(grid);
    lastFocus = document.activeElement;
    popup.hidden = false;
    popup.classList.add('active');
    openState = true;
    document.body.classList.add('qr-proposals-open');
    bindEsc();
    requestAnimationFrame(function () {
      playEntrance(grid);
      var closeBtn = popup.querySelector('[data-qr-proposals-close]');
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    });
  }

  function close() {
    var popup = document.getElementById(POPUP_ID);
    if (popup) {
      popup.classList.remove('active');
      popup.hidden = true;
    }
    openState = false;
    document.body.classList.remove('qr-proposals-open');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (e) {}
    }
    lastFocus = null;
  }

  function isOpen() {
    return openState;
  }

  function setProposals(list) {
    if (!Array.isArray(list) || !list.length) return;
    PROPOSALS.length = 0;
    list.forEach(function (item) { PROPOSALS.push(item); });
  }

  return {
    open: open,
    close: close,
    isOpen: isOpen,
    setProposals: setProposals,
    buildProposalCard: buildProposalCard
  };
})();
