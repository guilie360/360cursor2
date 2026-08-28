/**
 * BOXIES Router (minimal) — activates one registered page inside #boxiesContent.
 * Builder identity: projectId (UUID) is canonical; proyecto/project slug is vanity for public URL + legacy engines.
 * History API only — never reloads the app or remounts the Shell.
 * V7.1.00 — quotation-builder is a first-class builder host (own nav, not Showroom).
 */
var BoxiesRouter = (function () {
  var currentId = null;
  var currentProjectId = null;
  var currentProjectSlug = null;
  var started = false;
  var TRANSITION_MS = 0;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var BUILDER_HOST_PAGES = {
    builder: 1,
    'quotation-builder': 1,
    'template-builder': 1,
    'comparator-builder': 1
  };

  function isBuilderHostPage(pageId) {
    return !!BUILDER_HOST_PAGES[String(pageId || '')];
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      if (!ms) {
        resolve();
        return;
      }
      setTimeout(resolve, ms);
    });
  }

  function isUuid(value) {
    return UUID_RE.test(String(value || ''));
  }

  function parseState() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var page = (params.get('page') || '').trim() || 'hall';
      var projectId = (params.get('projectId') || params.get('proyectoId') || '').trim() || null;
      var project = (params.get('project') || params.get('proyecto') || '').trim() || null;
      if (!projectId && project && isUuid(project)) {
        projectId = project;
        project = null;
      }
      if (project && isUuid(project)) project = null;
      return { page: page, projectId: projectId, project: project };
    } catch (e) {
      return { page: 'hall', projectId: null, project: null };
    }
  }

  function writeUrl(pageId, opts) {
    opts = opts || {};
    var projectId = opts.projectId || null;
    var slug = opts.project || opts.slug || opts.proyecto || null;
    try {
      var url = new URL(window.location.href);
      if (!pageId || pageId === 'hall') {
        url.searchParams.delete('page');
        url.searchParams.delete('project');
        url.searchParams.delete('proyecto');
        url.searchParams.delete('projectId');
        url.searchParams.delete('proyectoId');
        url.searchParams.delete('step');
      } else {
        url.searchParams.set('page', pageId);
        if (projectId) {
          url.searchParams.set('projectId', projectId);
        } else {
          url.searchParams.delete('projectId');
          url.searchParams.delete('proyectoId');
        }
        if (slug) {
          /* Keep proyecto=slug for public/preview + legacy engine fallback */
          url.searchParams.set('project', slug);
          url.searchParams.set('proyecto', slug);
        } else if (!projectId) {
          url.searchParams.delete('project');
          url.searchParams.delete('proyecto');
          url.searchParams.delete('step');
        }
      }
      window.history.replaceState(
        { page: pageId, projectId: projectId, project: slug },
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
    void slot.offsetWidth;
    await wait(16);
    slot.classList.remove('is-enter');
  }

  async function activate(pageId, opts) {
    opts = opts || {};
    var id = pageId || 'hall';
    var projectId = opts.projectId || null;
    var project = opts.project != null ? opts.project : (opts.proyecto || opts.slug || null);
    if (!isBuilderHostPage(id)) {
      projectId = null;
      project = null;
    }
    if (isBuilderHostPage(id) && !projectId && !project) {
      var fromUrl = parseState();
      projectId = fromUrl.projectId;
      project = fromUrl.project;
    }
    if (project && isUuid(project) && !projectId) {
      projectId = project;
      project = null;
    }

    var page = BoxiesPages.get(id);
    if (!page) {
      page = BoxiesPages.get('hall');
      id = 'hall';
      projectId = null;
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
    slot.classList.toggle('is-builder-embed', isBuilderHostPage(id) && !!(projectId || project));
    /* Builder hosts (showroom / quotation / stubs) highlight platform Builder nav */
    BoxiesShell.setActiveNav(isBuilderHostPage(id) ? 'builder' : id);
    if (!opts.silentUrl) writeUrl(id, { projectId: projectId, project: project });
    currentId = id;
    currentProjectId = projectId;
    currentProjectSlug = project;

    await page.mount(slot, {
      projectId: projectId,
      project: project,
      proyecto: project,
      slug: project
    });
    await transitionIn(slot);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('popstate', function () {
      var state = parseState();
      activate(state.page, {
        projectId: state.projectId,
        project: state.project,
        silentUrl: true
      });
    });
    var state = parseState();
    return activate(state.page, {
      projectId: state.projectId,
      project: state.project,
      silentUrl: true
    });
  }

  function navigate(pageId, opts) {
    return activate(pageId, opts || {});
  }

  function current() {
    return currentId;
  }

  function currentProjectSlugFn() {
    return currentProjectSlug;
  }

  function currentProjectIdFn() {
    return currentProjectId;
  }

  /** Keep URL + router memory in sync after identity rename (no remount). */
  function syncProjectIdentity(identity) {
    identity = identity || {};
    if (identity.projectId || identity.id) {
      currentProjectId = identity.projectId || identity.id;
    }
    if (identity.slug || identity.project) {
      currentProjectSlug = identity.slug || identity.project;
    }
    if (currentId === 'builder') {
      writeUrl('builder', {
        projectId: currentProjectId,
        project: currentProjectSlug
      });
    }
  }

  return {
    start: start,
    navigate: navigate,
    current: current,
    currentProjectSlug: currentProjectSlugFn,
    currentProjectId: currentProjectIdFn,
    syncProjectIdentity: syncProjectIdentity,
    TRANSITION_MS: TRANSITION_MS
  };
})();
