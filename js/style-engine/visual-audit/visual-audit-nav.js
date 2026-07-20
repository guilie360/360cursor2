console.log("BOOT ENTER js/style-engine/visual-audit/visual-audit-nav.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/visual-audit/visual-audit-nav.js');}catch(_e){}
/* Visual Audit — Helpers de navegación del showroom */
var VisualAuditNav = (function () {
  function sleep(ms) {
    return VisualAuditCapture.sleep(ms);
  }

  function authorizeNav() {
    if (typeof window.authorizeGoBackForce === 'function') window.authorizeGoBackForce();
    if (typeof window.authorizeGoBack === 'function') window.authorizeGoBack();
    if (typeof window.beginNavInteractionGrace === 'function') window.beginNavInteractionGrace(5000);
    if (typeof window.grantMenuOpenToken === 'function') window.grantMenuOpenToken(8000);
  }

  function firstUnitKey() {
    if (typeof UNITS === 'undefined' || !UNITS) return null;
    var keys = Object.keys(UNITS);
    return keys.length ? keys[0] : null;
  }

  function secondUnitKey() {
    if (typeof UNITS === 'undefined' || !UNITS) return null;
    var keys = Object.keys(UNITS);
    return keys.length > 1 ? keys[1] : (keys[0] || null);
  }

  function openMenuLevel(levelId) {
    authorizeNav();
    if (typeof goTo === 'function') {
      goTo(levelId);
      return sleep(350);
    }
    return Promise.reject(new Error('goTo no disponible'));
  }

  function closeMenus() {
    authorizeNav();
    var menu = document.getElementById('mainMenu');
    if (menu && menu.classList.contains('active')) {
      if (typeof closeMainMenuIfOpen === 'function') closeMainMenuIfOpen();
      else {
        menu.classList.remove('active');
        var bd = document.getElementById('mainMenuBackdrop');
        if (bd) bd.classList.remove('active');
      }
    }
    return sleep(250);
  }

  function openScreen(screenId, payload) {
    authorizeNav();
    return closeMenus().then(function () {
      if (typeof goTo === 'function') {
        try {
          goTo(screenId, payload);
        } catch (e) {
          return Promise.reject(e);
        }
        return sleep(450);
      }
      return Promise.reject(new Error('goTo no disponible'));
    });
  }

  function closeScreen() {
    authorizeNav();
    if (typeof goBack === 'function') {
      try { goBack(); } catch (e) { /* noop */ }
    }
    return sleep(300);
  }

  function openUnitsAll() {
    return openScreen('tipologias').then(function () {
      if (typeof activateUnitsTab === 'function') activateUnitsTab('all');
      else if (typeof renderUnitsGrid === 'function') renderUnitsGrid('all');
      if (typeof exitUnitsCompareMode === 'function') exitUnitsCompareMode();
      return sleep(500);
    });
  }

  function openUnitsFavorites() {
    return openUnitsAll().then(function () {
      if (typeof activateUnitsTab === 'function') activateUnitsTab('fav');
      return sleep(500);
    });
  }

  function openUnitsCompareView() {
    return openUnitsAll().then(function () {
      var a = firstUnitKey();
      var b = secondUnitKey();
      if (!a) return Promise.reject(new Error('No hay viviendas para comparar'));

      var keys = a === b ? [a] : [a, b];
      if (typeof setCompareUnitKeys === 'function') {
        setCompareUnitKeys(keys);
      } else {
        try {
          localStorage.setItem('boxies_compare_unit_keys', JSON.stringify(keys));
        } catch (e) { /* noop */ }
      }

      if (typeof setUnitsViewMode === 'function' && typeof renderUnitsCompare === 'function') {
        setUnitsViewMode('compare');
        renderUnitsCompare(keys);
        return sleep(700);
      }
      return Promise.reject(new Error('Comparador no disponible'));
    });
  }

  function closeUnitsCompare() {
    if (typeof exitUnitsCompareMode === 'function') exitUnitsCompareMode();
    return closeScreen();
  }

  function openUnitCalculator() {
    var key = firstUnitKey();
    if (!key) return Promise.reject(new Error('No hay viviendas'));
    return openScreen('calculator', key);
  }

  function openUnitPlans() {
    var key = firstUnitKey();
    if (!key) return Promise.reject(new Error('No hay viviendas'));
    return openScreen('plans', key);
  }

  function openUnitSphere() {
    var key = firstUnitKey();
    if (!key) return Promise.reject(new Error('No hay viviendas'));
    var link = (typeof UNITS !== 'undefined' && UNITS[key] && UNITS[key].link360) || '';
    return openScreen('sphere', link);
  }

  function openAuth(view) {
    authorizeNav();
    if (typeof VisitorAuthModal !== 'undefined' && VisitorAuthModal.open) {
      VisitorAuthModal.open(view || 'gate');
      return sleep(400);
    }
    var modal = document.getElementById('authExperienceModal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      return sleep(400);
    }
    return Promise.reject(new Error('Auth modal no disponible'));
  }

  function closeAuth() {
    if (typeof VisitorAuthModal !== 'undefined' && VisitorAuthModal.close) {
      VisitorAuthModal.close();
    } else {
      var modal = document.getElementById('authExperienceModal');
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
    }
    return sleep(250);
  }

  function openEmailVerification() {
    if (typeof VisitorEmailVerification !== 'undefined' && VisitorEmailVerification.open) {
      VisitorEmailVerification.open({ reason: 'audit' });
      return sleep(400);
    }
    return Promise.reject(new Error('Email verification no disponible'));
  }

  function closeEmailVerification() {
    var modal = document.getElementById('emailVerificationModal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    return sleep(200);
  }

  function openPauseScreen() {
    var gate = document.getElementById('navResumeGate');
    if (!gate) return Promise.reject(new Error('Pause screen no disponible'));
    gate.classList.add('active');
    gate.setAttribute('aria-hidden', 'false');
    window.__navResumeGateOpen = true;
    return sleep(400);
  }

  function closePauseScreen() {
    var gate = document.getElementById('navResumeGate');
    if (gate) {
      gate.classList.remove('active');
      gate.setAttribute('aria-hidden', 'true');
    }
    window.__navResumeGateOpen = false;
    if (typeof hideNavResumeGate === 'function') hideNavResumeGate();
    return sleep(200);
  }

  function showToastSample() {
    if (typeof showToast === 'function') {
      showToast('Captura de pantallas — muestra de toast');
      return sleep(350);
    }
    return Promise.resolve();
  }

  function ensureStyleEngineVisible() {
    var modal = document.getElementById('styleEngineModal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
    }
    return sleep(300);
  }

  function hideStyleEngineForAudit() {
    var modal = document.getElementById('styleEngineModal');
    if (modal) {
      modal.style.visibility = 'hidden';
      modal.style.pointerEvents = 'none';
    }
    return sleep(50);
  }

  function resetToHero() {
    authorizeNav();
    return hideStyleEngineForAudit()
      .then(function () {
        if (typeof exitUnitsCompareMode === 'function') exitUnitsCompareMode();
      })
      .then(closeAuth)
      .then(closeEmailVerification)
      .then(closePauseScreen)
      .then(closeMenus)
      .then(function () {
        if (typeof navStack !== 'undefined') {
          while (navStack.length) {
            authorizeNav();
            try { goBack(); } catch (e) { navStack.length = 0; break; }
          }
        }
        return sleep(300);
      });
  }

  return {
    openMenuLevel: openMenuLevel,
    closeMenus: closeMenus,
    openScreen: openScreen,
    closeScreen: closeScreen,
    openUnitsAll: openUnitsAll,
    openUnitsFavorites: openUnitsFavorites,
    openUnitsCompare: openUnitsCompareView,
    closeUnitsCompare: closeUnitsCompare,
    openUnitCalculator: openUnitCalculator,
    openUnitPlans: openUnitPlans,
    openUnitSphere: openUnitSphere,
    firstUnitKey: firstUnitKey,
    openAuth: openAuth,
    closeAuth: closeAuth,
    openEmailVerification: openEmailVerification,
    closeEmailVerification: closeEmailVerification,
    openPauseScreen: openPauseScreen,
    closePauseScreen: closePauseScreen,
    showToastSample: showToastSample,
    ensureStyleEngineVisible: ensureStyleEngineVisible,
    hideStyleEngineForAudit: hideStyleEngineForAudit,
    resetToHero: resetToHero,
    authorizeNav: authorizeNav
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/visual-audit/visual-audit-nav.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/visual-audit/visual-audit-nav.js");
