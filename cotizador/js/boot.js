/* Arranque del cotizador standalone: sin login, motor compartido con el panel. */
(function () {
  if (!document.body || document.body.dataset.app !== 'cotizador') return;

  var params = new URLSearchParams(location.search);
  var modo = (params.get('modo') || 'publico').toLowerCase() === 'interno' ? 'interno' : 'publico';
  document.body.classList.add('modo-' + modo);
  document.body.classList.remove('portal-mode');

  /* Cotizador privado: solo con sesión de empresa desde el panel */
  if (modo === 'interno') {
    var teamOk = false;
    var rol = '';
    try {
      teamOk = sessionStorage.getItem('boxiesTeamSession') === '1';
      rol = (sessionStorage.getItem('boxiesPanelRole') || '').trim();
    } catch (e) {}
    if (!teamOk) {
      location.replace('/panel_gestion/');
      return;
    }
    document.body.classList.add('workspace-authenticated', 'modo-interno');
    if (rol) document.body.dataset.panelRole = rol;
    if (window.BoxiesGlobalNav && typeof window.BoxiesGlobalNav.refresh === 'function') {
      window.BoxiesGlobalNav.refresh();
    }
    var testWrap = document.getElementById('quoteIsTestWrap');
    var testEl = document.getElementById('quoteIsTest');
    if (testWrap) {
      testWrap.hidden = false;
      testWrap.style.display = 'flex';
    }
    if (testEl) testEl.checked = true;
  }

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
  var exitFallback = modo === 'interno' ? '/panel_gestion/' : '/#demo';

  function isVisible(el) {
    return !!(el && !el.classList.contains('hidden') && !el.classList.contains('portal-hidden'));
  }

  function currentQuoteScreen() {
    if (isVisible(document.getElementById('manualConfigurator'))) return 'manual';
    if (isVisible(document.getElementById('packageChooser'))) return 'package';
    return 'paths';
  }

  function closeQuoteOverlays() {
    var closed = false;
    if (resetBackdrop && !resetBackdrop.classList.contains('hidden')) {
      resetBackdrop.classList.add('hidden');
      closed = true;
    }
    if (commissionCard && !commissionCard.classList.contains('hidden')) {
      commissionCard.classList.add('hidden');
      if (commissionBtn) commissionBtn.setAttribute('aria-expanded', 'false');
      closed = true;
    }
    var order = document.getElementById('orderModal');
    if (order && !order.classList.contains('hidden')) {
      order.classList.add('hidden');
      closed = true;
    }
    var path = document.getElementById('pathChooser');
    if (path && isVisible(path)) {
      var flipped = path.querySelector('.flip-card.flipped');
      if (flipped) {
        flipped.classList.remove('flipped');
        var front = flipped.querySelector('.flip-front');
        if (front) front.setAttribute('aria-expanded', 'false');
        closed = true;
      }
    }
    return closed;
  }

  function exitCotizador() {
    // Cotizador interno → panel directo (sin pedir login otra vez).
    if (modo === 'interno') {
      try { sessionStorage.setItem('boxiesTeamSession', '1'); } catch (e0) {}
      var panelUrl = '/panel_gestion/';
      try {
        if (window.BoxiesFullscreen && typeof window.BoxiesFullscreen.navigate === 'function') {
          var keepFs = false;
          try {
            keepFs = !!(window.BoxiesFullscreen.isActive && window.BoxiesFullscreen.isActive()) ||
              sessionStorage.getItem('boxiesKeepFullscreen') === '1';
          } catch (e1) {}
          if (keepFs) {
            window.BoxiesFullscreen.navigate(panelUrl);
            return;
          }
        }
      } catch (e2) {}
      location.href = panelUrl;
      return;
    }
    var sameOrigin = false;
    try {
      sameOrigin = !!(document.referrer && document.referrer.indexOf(location.origin) === 0);
    } catch (err) {}
    if (sameOrigin && window.history.length > 1) {
      var left = false;
      var timer = setTimeout(function () {
        if (!left) location.href = exitFallback;
      }, 350);
      window.addEventListener('pagehide', function () {
        left = true;
        clearTimeout(timer);
      }, { once: true });
      history.back();
      return;
    }
    location.href = exitFallback;
  }

  function stepBackQuote() {
    if (closeQuoteOverlays()) return;
    var screen = currentQuoteScreen();
    if (screen === 'manual' || screen === 'package') {
      if (typeof showConfiguratorScreen === 'function') {
        showConfiguratorScreen('paths');
      } else {
        var path = document.getElementById('pathChooser');
        var pkg = document.getElementById('packageChooser');
        var manual = document.getElementById('manualConfigurator');
        var upsell = document.getElementById('manualUpsell');
        if (manual) manual.classList.add('hidden');
        if (pkg) pkg.classList.add('hidden');
        if (upsell) upsell.classList.add('hidden');
        if (path) path.classList.remove('hidden');
        window.scrollTo(0, 0);
      }
      return;
    }
    exitCotizador();
  }

  if (back) {
    back.classList.remove('portal-hidden');
    back.setAttribute('aria-label', 'Volver');
    back.title = 'Volver';
    back.onclick = null;
    // Capture: un solo paso atrás; evita el listener del panel (app.js).
    back.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      stepBackQuote();
    }, true);
  }
  if (modo === 'interno' && commissionBtn) {
    commissionBtn.classList.remove('portal-hidden');
  }

  /* Cobrar: abre el modal de cobro Paddle aquí (no salir al panel) */
  if (modo === 'interno') {
    var chargeBtn = document.getElementById('internoChargeBtn');
    if (!chargeBtn) {
      chargeBtn = document.createElement('button');
      chargeBtn.id = 'internoChargeBtn';
      chargeBtn.type = 'button';
      chargeBtn.className = 'quote-footer-charge mag';
      chargeBtn.textContent = 'Cobrar';
      chargeBtn.title = 'Abrir cobro Paddle de esta cotización';
      chargeBtn.setAttribute('data-cursor', 'COBRAR');
      var footerInner = document.querySelector('.quote-goal-footer-inner');
      var priceBox = document.querySelector('.quote-footer-price');
      if (footerInner && priceBox) footerInner.insertBefore(chargeBtn, priceBox);
    }
    chargeBtn.addEventListener('click', function () {
      function visible(el) {
        return !!(el && !el.classList.contains('hidden') && !el.classList.contains('portal-hidden'));
      }
      var pkgDetails = document.getElementById('packageDetails');
      var pkgChooser = document.getElementById('packageChooser');
      var manual = document.getElementById('manualConfigurator');
      var orderModal = document.getElementById('orderModal');

      // Ya hay resumen abierto → enfocar pagar anticipo
      if (orderModal && !orderModal.classList.contains('hidden')) {
        var dep = document.getElementById('orderPayDeposit');
        if (dep) {
          try { dep.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e0) {}
          dep.focus();
        }
        return;
      }

      if (visible(pkgDetails) || (visible(pkgChooser) && document.getElementById('packageSelect'))) {
        var pkgBtn = document.getElementById('packageSelect');
        if (pkgBtn) {
          pkgBtn.click();
          return;
        }
      }
      if (visible(manual)) {
        if (typeof openOrderModal === 'function') {
          openOrderModal();
          return;
        }
        var confirmBtn = document.getElementById('confirmOpen');
        if (confirmBtn) {
          confirmBtn.click();
          return;
        }
      }
      window.alert('Elige primero un paquete o configura el showroom personalizado, luego pulsa Cobrar.');
    });
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
