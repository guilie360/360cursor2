/**
 * BOXIES App — vertical slice v0.1 host boot.
 * Architecture: Auth Gate → Shell (once) → Router → Page in #boxiesContent
 */
var BoxiesApp = (function () {
  var booted = false;

  function registerPages() {
    if (typeof BoxiesProjectsPage !== 'undefined') {
      BoxiesPages.register(BoxiesProjectsPage);
    }
    if (typeof BoxiesBuilderPage !== 'undefined') {
      BoxiesPages.register(BoxiesBuilderPage);
    }
  }

  async function onAppReady(profile) {
    var host = document.getElementById('bxAppView');
    if (!host) {
      console.error('[boxies:app] #bxAppView missing');
      return;
    }

    BoxiesShell.mount(host, {
      onNav: function (pageId) {
        BoxiesRouter.navigate(pageId);
      },
      onLogout: async function () {
        await BoxiesAuthBridge.logout();
      }
    });

    BoxiesShell.setUser(profile);
    await BoxiesRouter.start();

    /* Invariants (dev console) */
    try {
      console.log('[boxies:app] shell invariants', {
        headers: document.querySelectorAll('.boxies-header').length,
        sidebars: document.querySelectorAll('.boxies-sidebar').length,
        docks: document.querySelectorAll('.boxies-dock').length,
        content: document.querySelectorAll('#boxiesContent').length
      });
    } catch (e) {}
  }

  async function boot() {
    if (booted) return;
    booted = true;
    registerPages();
    await BoxiesAuthBridge.init(onAppReady);
  }

  return { boot: boot };
})();

(function () {
  function start() {
    BoxiesApp.boot();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
