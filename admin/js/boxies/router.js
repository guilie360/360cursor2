/**
 * BOXIES Router (minimal) — activates one registered page inside #boxiesContent.
 * URL: /boxies?page=<id>&project=<slug>&proyecto=<slug>
 * History API only — never reloads the app or remounts the Shell.
 */
var BoxiesRouter = (function () {
  var currentId = null;
  var currentProject = null;
  var started = false;
  var TRANSITION_MS = 180;

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function parseState() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var page = (params.get('page') || '').trim() || 'projects';
      var project = (params.get('project') || params.get('proyecto') || '').trim() || null;
      return { page: page, project: project };
    } catch (e) {
      return { page: 'projects', project: null };
    }
  }

  function writeUrl(pageId, project) {
    try {
      var url = new URL(window.location.href);
      if (!pageId || pageId === 'projects') {
        url.searchParams.delete('page');
        url.searchParams.delete('project');
        url.searchParams.delete('proyecto');
        url.searchParams.delete('step');
      } else {
        url.searchParams.set('page', pageId);
        if (project) {
          url.searchParams.set('project', project);
          /* Engines still read ?proyecto= — keep in sync without leaving /boxies */
          url.searchParams.set('proyecto', project);
        } else {
          url.searchParams.delete('project');
          url.searchParams.delete('proyecto');
        }
      }
      window.history.replaceState(
        { page: pageId, project: project || null },
        '',
        url.pathname + url.search + url.hash
      );
    } catch (e) {}
  }

  async function transitionOut(slot) {
    if (!slot) return;
    slot.classList.remove('is-enter');
    slot.classList.add('is-leave');
    await wait(TRANSITION_MS);
  }

  async function transitionIn(slot) {
    if (!slot) return;
    slot.classList.remove('is-leave');
    slot.classList.add('is-enter');
    /* force reflow then clear enter for settle */
    void slot.offsetWidth;
    await wait(16);
    slot.classList.remove('is-enter');
  }

  async function activate(pageId, opts) {
    opts = opts || {};
    var id = pageId || 'projects';
    var project = opts.project != null ? opts.project : (opts.proyecto || null);
    if (id !== 'builder') project = project || null;
    if (id === 'builder' && !project) {
      var fromUrl = parseState();
      project = fromUrl.project;
    }

    var page = BoxiesPages.get(id);
    if (!page) {
      page = BoxiesPages.get('projects');
      id = 'projects';
      project = null;
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

    await transitionOut(slot);

    if (currentId && BoxiesPages.get(currentId)) {
      try {
        await BoxiesPages.get(currentId).unmount();
      } catch (e) {
        console.warn('[boxies:router] unmount error', e);
      }
    }

    if (typeof BoxiesShell.clearPageActions === 'function') {
      BoxiesShell.clearPageActions();
    }

    slot.innerHTML = '';
    slot.classList.toggle('is-builder-embed', id === 'builder' && !!project);
    BoxiesShell.setActiveNav(id);
    if (!opts.silentUrl) writeUrl(id, project);
    currentId = id;
    currentProject = project;

    await page.mount(slot, { project: project, proyecto: project });
    await transitionIn(slot);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('popstate', function () {
      var state = parseState();
      activate(state.page, { project: state.project, silentUrl: true });
    });
    var state = parseState();
    return activate(state.page, { project: state.project, silentUrl: true });
  }

  function navigate(pageId, opts) {
    return activate(pageId, opts || {});
  }

  function current() {
    return currentId;
  }

  function currentProjectSlug() {
    return currentProject;
  }

  return {
    start: start,
    navigate: navigate,
    activate: activate,
    parseState: parseState,
    current: current,
    currentProjectSlug: currentProjectSlug,
    TRANSITION_MS: TRANSITION_MS
  };
})();
