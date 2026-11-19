/* Arranque del cotizador standalone: sin login, motor compartido con el panel. */
(function () {
  if (!document.body || document.body.dataset.app !== 'cotizador') return;

  var params = new URLSearchParams(location.search);
  var modo = (params.get('modo') || 'publico').toLowerCase() === 'interno' ? 'interno' : 'publico';
  document.body.classList.add('modo-' + modo);
  document.body.classList.remove('portal-mode');

  function startQuote() {
    try {
      if (typeof openEmbeddedQuote === 'function') {
        openEmbeddedQuote();
        return;
      }
    } catch (e) {}
    var portal = document.getElementById('portal');
    var path = document.getElementById('pathChooser');
    var pkg = document.getElementById('packageChooser');
    var manual = document.getElementById('manualConfigurator');
    var upsell = document.getElementById('manualUpsell');
    if (portal) portal.classList.add('portal-hidden');
    if (upsell) upsell.classList.add('hidden');
    if (manual) manual.classList.add('hidden');
    if (pkg) pkg.classList.add('hidden');
    if (path) path.classList.remove('hidden');
    document.body.classList.remove('portal-mode');
    window.scrollTo(0, 0);
  }

  var back = document.getElementById('portalBack');
  var commissionBtn = document.getElementById('internoCommissionBtn');
  var commissionCard = document.getElementById('internoCommissionCard');
  var commissionClose = document.getElementById('internoCommissionClose');
  var commissionLabel = document.getElementById('internoCommission');
  var commissionCardValue = document.getElementById('internoCommissionCardValue');
  var live = document.getElementById('hunterLiveCommission');
  var resetBtn = document.getElementById('headerReset');
  var resetBackdrop = document.getElementById('quoteResetConfirm');
  var resetCancel = document.getElementById('quoteResetCancel');
  var resetConfirm = document.getElementById('quoteResetConfirmBtn');

  if (back) {
    back.classList.remove('portal-hidden');
    if (modo === 'interno') {
      back.setAttribute('aria-label', 'Volver al panel');
      back.title = 'Volver al panel';
      back.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        location.href = '/panel_gestion/';
      };
    } else {
      back.setAttribute('aria-label', 'Volver a la demo');
      back.title = 'Volver a la landing · Demo';
      back.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        location.href = '/#demo';
      };
    }
  }
  if (modo === 'interno' && commissionBtn) {
    commissionBtn.classList.remove('portal-hidden');
  }

  function syncCommission() {
    var text = (live && live.textContent) ? live.textContent.trim() : '0 €';
    if (!text) text = '0 €';
    if (commissionLabel) commissionLabel.textContent = text;
    if (commissionCardValue) {
      commissionCardValue.innerHTML = text + ' <small>por este presupuesto</small>';
    }
  }

  if (live && typeof MutationObserver !== 'undefined') {
    syncCommission();
    new MutationObserver(syncCommission).observe(live, {
      childList: true,
      characterData: true,
      subtree: true
    });
  } else {
    syncCommission();
    setInterval(syncCommission, 800);
  }

  function openCommissionCard() {
    if (!commissionCard) return;
    commissionCard.classList.remove('hidden');
    if (commissionBtn) commissionBtn.setAttribute('aria-expanded', 'true');
    syncCommission();
  }
  function closeCommissionCard() {
    if (!commissionCard) return;
    commissionCard.classList.add('hidden');
    if (commissionBtn) commissionBtn.setAttribute('aria-expanded', 'false');
  }

  if (modo === 'interno' && commissionBtn && commissionCard) {
    commissionBtn.addEventListener('click', function () {
      if (commissionCard.classList.contains('hidden')) openCommissionCard();
      else closeCommissionCard();
    });
    if (commissionClose) commissionClose.addEventListener('click', closeCommissionCard);
  }

  function openResetConfirm() {
    if (!resetBackdrop) return;
    resetBackdrop.classList.remove('hidden');
    (resetCancel || resetConfirm)?.focus?.();
  }
  function closeResetConfirm() {
    if (!resetBackdrop) return;
    resetBackdrop.classList.add('hidden');
  }
  function doReset() {
    closeResetConfirm();
    if (typeof resetConfigurator === 'function') resetConfigurator();
  }

  if (resetBtn) {
    // Captura: evita el listener directo de app.js y pide confirmación.
    resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openResetConfirm();
    }, true);
  }
  if (resetCancel) resetCancel.addEventListener('click', closeResetConfirm);
  if (resetConfirm) resetConfirm.addEventListener('click', doReset);
  if (resetBackdrop) {
    resetBackdrop.addEventListener('click', function (e) {
      if (e.target === resetBackdrop) closeResetConfirm();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeCommissionCard();
    if (resetBackdrop && !resetBackdrop.classList.contains('hidden')) closeResetConfirm();
  });

  startQuote();
  // Tras abrir el motor, reafirmar controles (openEmbeddedQuote puede ocultar portalBack).
  if (back) back.classList.remove('portal-hidden');
  syncCommission();
})();
