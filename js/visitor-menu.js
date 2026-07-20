try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/visitor-menu.js');}catch(_e){}
/* Menu profile strip + authenticated explorar */
var VisitorMenu = (function () {
  var ICON_PROFILE =
    '<svg class="menu-profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 12a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm0 1.6c-2.9 0-5.8 1.4-5.8 3.2V19h11.6v-2.2c0-1.8-2.9-3.2-5.8-3.2z"/>' +
    '</svg>';

  var ICON_SETTINGS =
    '<svg class="menu-profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zm8.2 4.8a7.2 7.2 0 0 0-.12-1.14l2-1.54-1.9-3.28-2.34 1a7.28 7.28 0 0 0-1.98-1.14L15.6 2h-3.8l-.36 2.2a7.28 7.28 0 0 0-1.98 1.14l-2.34-1-1.9 3.28 2 1.54a7.2 7.2 0 0 0 0 2.28l-2 1.54 1.9 3.28 2.34-1c.6.48 1.27.86 1.98 1.14l.36 2.2h3.8l.36-2.2c.71-.28 1.38-.66 1.98-1.14l2.34 1 1.9-3.28-2-1.54c.08-.37.12-.75.12-1.14z"/>' +
    '</svg>';

  var ICON_ADMIN =
    '<svg class="menu-profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/>' +
    '</svg>';

  function isAdminProfile() {
    return typeof PlatformRoles !== 'undefined' &&
      PlatformRoles.isAdmin(VisitorSession.getProfile());
  }

  var STYLE_V3_LABEL = 'Style V.3';

  function activeThemeIndicatorHtml() {
    if (!isAdminProfile()) return '';
    if (typeof StyleEngine === 'undefined' || typeof StyleEngine.getActiveThemeLabel !== 'function') return '';
    var label = StyleEngine.getActiveThemeLabel();
    var isStyleV3 = typeof StyleEngineStore !== 'undefined' &&
      StyleEngineStore.getActiveTheme &&
      StyleEngineStore.ACTIVE &&
      StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE;
    return (
      '<div class="menu-active-theme-indicator">' +
        '<span class="menu-active-theme-label">Tema activo</span>' +
        '<span class="menu-active-theme-value' + (isStyleV3 ? ' is-style-engine' : ' is-legacy') + '">' +
          '<span class="menu-active-theme-dot">○</span> ' + escapeHtml(label) +
        '</span>' +
      '</div>'
    );
  }

  function primaryStripActionHtml() {
    if (isAdminProfile()) {
      return (
        '<a href="' + escapeHtml(adminBuilderHref()) + '" class="menu-profile-action menu-admin-btn">' +
          ICON_ADMIN + '<span>Administrar</span>' +
        '</a>'
      );
    }
    return (
      '<button type="button" class="menu-profile-action menu-profile-link-btn">' +
        ICON_PROFILE + '<span>Perfil</span>' +
      '</button>'
    );
  }

  var ICON_LOGOUT =
    '<svg class="menu-profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M10.1 4.5a1 1 0 0 1 1 1V9h5.4a1 1 0 1 1 0 2H11.1v3.5a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1zm-2.8 4.2L3.7 12l3.6 3.3a1 1 0 0 1-1.35 1.48l-.08-.07-4.5-4.2a1 1 0 0 1-.07-1.34l.07-.08 4.5-4.2a1 1 0 1 1 1.43 1.39zM14 19a1 1 0 1 1 0-2h5a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-5a1 1 0 1 1 0-2h5a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-5z"/>' +
    '</svg>';

  function profileTypeLabel() {
    var profile = VisitorSession.getProfile();
    if (!profile) return 'Visitante';
    return PlatformRoles.getRoleLabel(profile);
  }

  function profileStripHtml() {
    var verificationHint = '';
    if (typeof VisitorEmailVerification !== 'undefined' && VisitorEmailVerification.isPending()) {
      verificationHint =
        '<div class="menu-profile-verification-hint">' +
          '<span>Correo pendiente de verificación.</span>' +
          '<button type="button" class="menu-profile-verify-btn">Verificar ahora</button>' +
        '</div>';
    }

    return (
      '<div class="menu-profile-card">' +
        '<div class="menu-profile-strip">' +
          '<div class="menu-profile-strip-left">' +
            VisitorPersonalization.renderAvatarHtml('menu-profile-avatar-sm menu-profile-avatar-status') +
            '<div class="menu-profile-strip-meta">' +
              '<div class="menu-profile-name">' + escapeHtml(VisitorPersonalization.getDisplayName()) + '</div>' +
          '<div class="menu-profile-type">' + escapeHtml(profileTypeLabel()) + '</div>' +
          activeThemeIndicatorHtml() +
          verificationHint +
            '</div>' +
          '</div>' +
          '<div class="menu-profile-strip-actions">' +
            primaryStripActionHtml() +
            '<button type="button" class="menu-profile-action menu-personalize-v2-btn">' +
              ICON_SETTINGS + '<span>' + STYLE_V3_LABEL + '</span>' +
            '</button>' +
            '<button type="button" class="menu-profile-action menu-logout-btn">' +
              ICON_LOGOUT + '<span>Salir</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function adminBuilderHref() {
    if (typeof AuthRedirects !== 'undefined' && typeof AuthRedirects.adminBuilder === 'function') {
      return AuthRedirects.adminBuilder();
    }
    try {
      var url = new URL('admin/ai-project-builder.html', window.location.href);
      var proyecto =
        typeof getProjectSlugFromUrl === 'function'
          ? getProjectSlugFromUrl()
          : new URLSearchParams(window.location.search).get('proyecto');
      if (proyecto) url.searchParams.set('proyecto', proyecto);
      return url.href;
    } catch (e) {
      return 'admin/ai-project-builder.html';
    }
  }

  function goToAdminBuilder() {
    if (typeof closeMainMenuIfOpen === 'function') closeMainMenuIfOpen();
    window.location.assign(adminBuilderHref());
    if (typeof playSound === 'function') playSound('buttonTap');
  }

  function bindProfileActions() {
    document.querySelectorAll('.menu-admin-btn').forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        goToAdminBuilder();
      };
    });
    document.querySelectorAll('.menu-profile-link-btn').forEach(function (btn) {
      btn.onclick = function () {
        if (typeof VisitorEmailVerification !== 'undefined' &&
            !VisitorEmailVerification.guard(VisitorEmailVerification.FEATURES.PROFILE, { reason: 'profile' })) {
          return;
        }
        if (typeof closeMainMenuIfOpen === 'function') closeMainMenuIfOpen();
        window.location.href = VisitorSession.profileHref();
      };
    });
    document.querySelectorAll('.menu-profile-verify-btn').forEach(function (btn) {
      btn.onclick = function () {
        if (typeof VisitorEmailVerification !== 'undefined') {
          VisitorEmailVerification.open({ reason: 'indicator' });
        }
      };
    });
    document.querySelectorAll('.menu-personalize-v2-btn').forEach(function (btn) {
      btn.onclick = function () {
        if (typeof goTo === 'function') {
          goTo('menu-personalizar-v2');
          return;
        }
        if (typeof showMenuLevel === 'function') showMenuLevel('personalizar-v2');
      };
    });
    document.querySelectorAll('.menu-logout-btn').forEach(function (btn) {
      btn.onclick = async function () {
        btn.disabled = true;
        try {
          await VisitorSession.logout();
        } finally {
          btn.disabled = false;
        }
        if (typeof playSound === 'function') playSound('buttonTap');
      };
    });
  }

  function refreshProfile() {
    var slot = document.getElementById('mainMenuProfileSlot');
    var menu = document.getElementById('mainMenu');
    var styleV3Open = typeof window.isStyleV3MenuLocked === 'function' && window.isStyleV3MenuLocked();

    if (!VisitorSession.isAuthenticated()) {
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.isEditorSessionLocked === 'function' &&
          VisitorPersonalizePanel.isEditorSessionLocked()) {
        return;
      }
      if (styleV3Open) {
        if (menu) menu.classList.add('has-visitor-profile');
        if (slot) slot.innerHTML = profileStripHtml();
        bindProfileActions();
        return;
      }
      if (slot) slot.innerHTML = '';
      if (menu && menu.classList.contains('active') && typeof showMenuLevel === 'function') {
        var personalizarV2 = document.getElementById('mainMenuListPersonalizarV2');
        if (personalizarV2 && personalizarV2.style.display !== 'none') {
          if (typeof goBack === 'function' &&
              typeof navStack !== 'undefined' &&
              navStack[navStack.length - 1] === 'menu-personalizar-v2') {
            goBack();
          } else {
            showMenuLevel('primary');
          }
        }
      }
      if (menu) menu.classList.remove('has-visitor-profile', 'is-personalizar');
      if (typeof syncNavigationCloseState === 'function') syncNavigationCloseState();
      return;
    }

    if (menu) menu.classList.add('has-visitor-profile');
    if (slot) slot.innerHTML = profileStripHtml();
    bindProfileActions();
  }

  function handleExplorar() {
    if (typeof window.shouldBlockAutoMenuOpen === 'function' &&
        window.shouldBlockAutoMenuOpen() &&
        typeof window.canOpenMenuWithoutGesture === 'function' &&
        !window.canOpenMenuWithoutGesture()) {
      return;
    }
    if (typeof window.grantMenuOpenToken === 'function') {
      window.grantMenuOpenToken(6000);
    }
    if (typeof window.allowProgrammaticNavOpen === 'function') {
      window.allowProgrammaticNavOpen(3000);
    }
    var run = function () {
      if (!VisitorSession.isReady()) {
        VisitorSession.refresh().then(function () {
          handleExplorar();
        });
        return;
      }
      if (typeof navTabLeaving !== 'undefined') navTabLeaving = false;
      if (typeof hideNavResumeGate === 'function') hideNavResumeGate();
      if (typeof clearNavResumeAwaiting === 'function') clearNavResumeAwaiting();
      if (typeof window.grantMenuOpenToken === 'function') {
        window.grantMenuOpenToken(6000);
      }
      if (VisitorSession.isAuthenticated()) {
        goTo('menu-primary');
        return;
      }
      VisitorAuthModal.open('gate');
    };

    if (typeof AuthBootstrap !== 'undefined' && typeof AuthBootstrap.whenReady === 'function') {
      AuthBootstrap.whenReady().then(run);
      return;
    }
    run();
  }

  function init() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/visitor-menu.js :: init');}catch(_bd){}
  try {

    window.refreshVisitorMenuProfile = refreshProfile;
    window.onVisitorSessionChanged = function () {
      refreshProfile();
      if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.isOnPersonalizarPanel === 'function' &&
          VisitorPersonalizePanel.isOnPersonalizarPanel() &&
          typeof VisitorPersonalizePanel.render === 'function') {
        VisitorPersonalizePanel.render();
      }
    };
    window.onVisitorPersonalizationChanged = function () {
      refreshProfile();
    };

    var explorarBtn = document.getElementById('mainMenuOpenBtn');
    if (explorarBtn) {
      explorarBtn.addEventListener('click', handleExplorar);
    }
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/visitor-menu.js :: init');}catch(_bd){}
  }
}

  return {
    init: init,
    refreshProfile: refreshProfile,
    handleExplorar: handleExplorar,
    goToAdminBuilder: goToAdminBuilder,
    adminBuilderHref: adminBuilderHref
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/visitor-menu.js');}catch(_e){}
