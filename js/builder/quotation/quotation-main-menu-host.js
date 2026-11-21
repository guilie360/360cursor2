/**
 * QuotationMainMenuHost — V7.2.44
 * Thin BOXIES host for Showroom #mainMenu (no main.js).
 * Exposes the same open/close/level APIs VisitorMenu expects.
 */
(function (global) {
  var tokenUntil = 0;

  function grantMenuOpenToken(ms) {
    tokenUntil = Date.now() + Math.max(0, Number(ms) || 4000);
  }

  function hasMenuOpenToken() {
    return Date.now() <= tokenUntil;
  }

  function allowProgrammaticNavOpen() { /* no-op host */ }

  function shouldBlockAutoMenuOpen() {
    return false;
  }

  function canOpenMenuWithoutGesture() {
    return true;
  }

  function isMainMenuOpen() {
    var menu = document.getElementById('mainMenu');
    return !!(menu && menu.classList.contains('active'));
  }

  function showMenuLevel(level) {
    var primary = document.getElementById('mainMenuListPrimary');
    var proyecto = document.getElementById('mainMenuListProyecto');
    var contacto = document.getElementById('mainMenuListContacto');
    var personalizar = document.getElementById('mainMenuListPersonalizar');
    var personalizarV2 = document.getElementById('mainMenuListPersonalizarV2');
    var menuNavBack = document.getElementById('menuNavBack');
    var menu = document.getElementById('mainMenu');
    if (!primary) return;

    primary.style.display = 'none';
    if (proyecto) proyecto.style.display = 'none';
    if (contacto) contacto.style.display = 'none';
    if (personalizar) personalizar.style.display = 'none';
    if (personalizarV2) personalizarV2.style.display = 'none';
    if (menu) menu.classList.remove('is-personalizar', 'is-personalizar-v2');

    if (level === 'proyecto' && proyecto) {
      proyecto.style.display = 'flex';
      if (menuNavBack) menuNavBack.hidden = false;
    } else if (level === 'contacto' && contacto) {
      contacto.style.display = 'flex';
      if (menuNavBack) menuNavBack.hidden = false;
    } else {
      primary.style.display = 'flex';
      if (menuNavBack) menuNavBack.hidden = true;
    }
  }

  function showMainMenuPanel() {
    if (!hasMenuOpenToken()) grantMenuOpenToken(4000);
    var backdrop = document.getElementById('mainMenuBackdrop');
    var menu = document.getElementById('mainMenu');
    if (!menu) return;
    if (backdrop) backdrop.classList.add('active');
    menu.classList.add('active');
    document.body.classList.add('main-menu-open');
    showMenuLevel('primary');
    if (typeof VisitorMenu !== 'undefined' && VisitorMenu.refreshProfile) {
      try { VisitorMenu.refreshProfile(); } catch (e) {}
    }
  }

  function hideMainMenuPanel() {
    var backdrop = document.getElementById('mainMenuBackdrop');
    var menu = document.getElementById('mainMenu');
    if (backdrop) backdrop.classList.remove('active');
    if (menu) menu.classList.remove('active');
    document.body.classList.remove('main-menu-open');
    showMenuLevel('primary');
  }

  function closeMainMenuIfOpen() {
    if (!isMainMenuOpen()) return false;
    hideMainMenuPanel();
    return true;
  }

  function resolveMenuLevel(screenId) {
    if (screenId === 'menu-proyecto') return 'proyecto';
    if (screenId === 'menu-contacto') return 'contacto';
    return 'primary';
  }

  function goTo(screenId) {
    if (!screenId || String(screenId).indexOf('menu-') !== 0) return;
    grantMenuOpenToken(4000);
    if (!isMainMenuOpen()) showMainMenuPanel();
    showMenuLevel(resolveMenuLevel(screenId));
  }

  function bindHostChrome() {
    var backdrop = document.getElementById('mainMenuBackdrop');
    if (backdrop && !backdrop.getAttribute('data-qe-menu-bound')) {
      backdrop.setAttribute('data-qe-menu-bound', '1');
      backdrop.addEventListener('click', function () {
        closeMainMenuIfOpen();
      });
    }
    var back = document.getElementById('menuNavBack');
    if (back && !back.getAttribute('data-qe-menu-bound')) {
      back.setAttribute('data-qe-menu-bound', '1');
      back.addEventListener('click', function () {
        showMenuLevel('primary');
      });
    }
    var recovery = document.getElementById('mainMenuRecoveryClose');
    if (recovery && !recovery.getAttribute('data-qe-menu-bound')) {
      recovery.setAttribute('data-qe-menu-bound', '1');
      recovery.addEventListener('click', function () {
        closeMainMenuIfOpen();
      });
    }
  }

  function openFromBuilder() {
    grantMenuOpenToken(6000);
    goTo('menu-primary');
  }

  if (typeof global.grantMenuOpenToken !== 'function') {
    global.grantMenuOpenToken = grantMenuOpenToken;
  }
  if (typeof global.allowProgrammaticNavOpen !== 'function') {
    global.allowProgrammaticNavOpen = allowProgrammaticNavOpen;
  }
  if (typeof global.shouldBlockAutoMenuOpen !== 'function') {
    global.shouldBlockAutoMenuOpen = shouldBlockAutoMenuOpen;
  }
  if (typeof global.canOpenMenuWithoutGesture !== 'function') {
    global.canOpenMenuWithoutGesture = canOpenMenuWithoutGesture;
  }
  if (typeof global.isMainMenuOpen !== 'function') {
    global.isMainMenuOpen = isMainMenuOpen;
  }
  if (typeof global.showMainMenuPanel !== 'function') {
    global.showMainMenuPanel = showMainMenuPanel;
  }
  if (typeof global.hideMainMenuPanel !== 'function') {
    global.hideMainMenuPanel = hideMainMenuPanel;
  }
  if (typeof global.closeMainMenuIfOpen !== 'function') {
    global.closeMainMenuIfOpen = closeMainMenuIfOpen;
  }
  if (typeof global.showMenuLevel !== 'function') {
    global.showMenuLevel = showMenuLevel;
  }
  if (typeof global.goTo !== 'function') {
    global.goTo = goTo;
  }

  global.QuotationMainMenuHost = {
    open: openFromBuilder,
    bind: bindHostChrome,
    grantMenuOpenToken: grantMenuOpenToken,
    goTo: goTo,
    close: closeMainMenuIfOpen
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHostChrome);
  } else {
    bindHostChrome();
  }
})(window);
