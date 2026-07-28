/**
 * BOXIES App — vertical slice v0.2 host boot.
 * Architecture: Auth Gate → Shell (once) → Router → Page in #boxiesContent
 */
var BoxiesApp = (function () {
  var booted = false;

  function registerPages() {
    if (typeof BoxiesHallPage !== 'undefined') {
      BoxiesPages.register(BoxiesHallPage);
    }
    if (typeof BoxiesProjectsPage !== 'undefined') {
      BoxiesPages.register(BoxiesProjectsPage);
    }
    if (typeof BoxiesBuilderPage !== 'undefined') {
      BoxiesPages.register(BoxiesBuilderPage);
    }
    if (typeof BoxiesSistemaPage !== 'undefined') {
      BoxiesPages.register(BoxiesSistemaPage);
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

    /* V5.9.87 — sincronizar Bunny con Showrooms al abrir BOXIES */
    try {
      if (typeof BunnyMediaApi !== 'undefined' && BunnyMediaApi.syncAllShowrooms) {
        BunnyMediaApi.syncAllShowrooms().then(function (res) {
          try { console.log('[boxies:app] Bunny sync', res); } catch (e) {}
        }).catch(function (err) {
          try { console.warn('[boxies:app] Bunny sync failed', err); } catch (e2) {}
        });
      }
    } catch (e) {}

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
