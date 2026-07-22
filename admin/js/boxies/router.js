/**
 * BOXIES Router (minimal) — activates one registered page inside #boxiesContent.
 * URL: /boxies?page=<id>  (default: projects)
 */
var BoxiesRouter = (function () {
  var currentId = null;
  var started = false;

  function parsePageId() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var id = (params.get('page') || '').trim();
      return id || 'projects';
    } catch (e) {
      return 'projects';
    }
  }

  function writePageId(id) {
    try {
      var url = new URL(window.location.href);
      if (!id || id === 'projects') url.searchParams.delete('page');
      else url.searchParams.set('page', id);
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  async function activate(pageId, opts) {
    opts = opts || {};
    var id = pageId || 'projects';
    var page = BoxiesPages.get(id);
    if (!page) {
      page = BoxiesPages.get('projects');
      id = 'projects';
    }
    if (!page) {
      console.error('[boxies:router] no pages registered');
      return;
    }

    var slot = BoxiesShell.getContentEl();
    if (!slot) {
      console.error('[boxies:router] #boxiesContent missing — Shell not mounted');
      return;
    }

    if (currentId && BoxiesPages.get(currentId)) {
      try {
        await BoxiesPages.get(currentId).unmount();
      } catch (e) {
        console.warn('[boxies:router] unmount error', e);
      }
    }

    slot.innerHTML = '';
    BoxiesShell.setActiveNav(id);
    if (!opts.silentUrl) writePageId(id);
    currentId = id;
    await page.mount(slot);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('popstate', function () {
      activate(parsePageId(), { silentUrl: true });
    });
    return activate(parsePageId(), { silentUrl: true });
  }

  function navigate(pageId) {
    return activate(pageId);
  }

  function current() {
    return currentId;
  }

  return {
    start: start,
    navigate: navigate,
    activate: activate,
    parsePageId: parsePageId,
    current: current
  };
})();
