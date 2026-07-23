/**
 * BOXIES BuilderPage — adapter around AiProjectBuilderView.
 * Does NOT rewrite engines/CMS. Mounts editor into #boxiesContent only.
 * Nested Builder chrome (header/dock) is visually suppressed; Boxies Shell owns chrome.
 * Save/Publish buttons are promoted into the Boxies header actions (same DOM nodes / handlers).
 */
var BoxiesBuilderPage = (function () {
  var activeHost = null;
  var promotedNodes = [];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ensureProyectoInUrl(slug) {
    if (!slug) return;
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('page', 'builder');
      url.searchParams.set('project', slug);
      url.searchParams.set('proyecto', slug);
      window.history.replaceState(
        { page: 'builder', project: slug },
        '',
        url.pathname + url.search + url.hash
      );
    } catch (e) {}
  }

  function promoteHeaderActions(host) {
    var boxiesActions = document.getElementById('boxiesHeaderActions');
    var logout = document.getElementById('boxiesLogoutBtn');
    var nested = host.querySelector('.builder-header-actions');
    if (!boxiesActions || !logout || !nested) return;

    promotedNodes = [];
    Array.prototype.slice.call(nested.children).forEach(function (btn) {
      btn.setAttribute('data-boxies-page-action', '1');
      /* Keep builder button classes for existing CSS; add shell spacing */
      btn.classList.add('boxies-action-btn');
      boxiesActions.insertBefore(btn, logout);
      promotedNodes.push(btn);
    });
  }

  function restorePromotedActions() {
    promotedNodes.forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    promotedNodes = [];
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      BoxiesShell.clearPageActions();
    }
  }

  function showPickProject(host) {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    host.innerHTML =
      '<div class="boxies-page boxies-placeholder">' +
        '<p class="boxies-placeholder__kicker">Builder</p>' +
        '<h1 class="boxies-page__title">Selecciona un proyecto</h1>' +
        '<p class="boxies-page__desc">Usa <strong>Administrar</strong> en Proyectos para abrir el editor dentro de este Shell.</p>' +
        '<button type="button" class="boxies-action-btn" id="boxiesBuilderBackProjects">Ir a Proyectos</button>' +
      '</div>';
    var btn = document.getElementById('boxiesBuilderBackProjects');
    if (btn) {
      btn.addEventListener('click', function () {
        BoxiesRouter.navigate('projects');
      });
    }
  }

  function showError(host, err) {
    host.innerHTML =
      '<div class="boxies-page boxies-placeholder">' +
        '<h1 class="boxies-page__title">No se pudo abrir el Builder</h1>' +
        '<p class="boxies-page__desc">' + escapeHtml((err && err.message) || 'Error desconocido') + '</p>' +
        '<button type="button" class="boxies-action-btn" id="boxiesBuilderBackProjects">Volver a Proyectos</button>' +
      '</div>';
    var btn = document.getElementById('boxiesBuilderBackProjects');
    if (btn) {
      btn.addEventListener('click', function () {
        BoxiesRouter.navigate('projects');
      });
    }
  }

  async function mount(host, ctx) {
    activeHost = host;
    ctx = ctx || {};
    var slug = (ctx.project || ctx.proyecto || '').trim();

    if (!slug) {
      showPickProject(host);
      return;
    }

    if (typeof AiProjectBuilderView === 'undefined' || typeof AiProjectBuilderView.render !== 'function') {
      showError(host, new Error('AiProjectBuilderView no está disponible en este host.'));
      return;
    }

    ensureProyectoInUrl(slug);
    host.classList.add('boxies-builder-embed');
    host.innerHTML = '<p class="boxies-page__desc" style="padding:8px 0">Cargando builder…</p>';

    try {
      if (typeof PlatformBuilderBridge !== 'undefined' && typeof PlatformBuilderBridge.init === 'function') {
        await PlatformBuilderBridge.init();
      }

      await AiProjectBuilderView.render(host);

      /* Promote Save/Publish into Boxies header, then strip nested chrome (Shell owns it). */
      promoteHeaderActions(host);
      var nestedHeader = host.querySelector('.builder-header-fixed');
      if (nestedHeader) nestedHeader.remove();
      var nestedDock = host.querySelector('.builder-dock, #builderDock');
      if (nestedDock) nestedDock.remove();

      var nestedApp = host.querySelector('#builderApp');
      if (nestedApp) nestedApp.hidden = false;

      syncProjectDock(slug);
      if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyCollapsedFromPrefs) {
        BuilderProgressRail.applyCollapsedFromPrefs();
      }
    } catch (err) {
      console.error('[boxies:builder-page]', err);
      showError(host, err);
    }
  }

  function syncProjectDock(slug) {
    if (typeof BoxiesShell === 'undefined' || typeof BoxiesShell.setProjectContext !== 'function') return;
    var name = '';
    try {
      if (typeof AiProjectBuilderView !== 'undefined' && AiProjectBuilderView.getProjectLabel) {
        name = AiProjectBuilderView.getProjectLabel() || '';
      } else if (typeof BuilderSession !== 'undefined') {
        var s = BuilderSession.load();
        name = (s && s.projectInfo && s.projectInfo.nombre) || '';
        if (!name && s && s.heroContent && s.heroContent.nombre) name = s.heroContent.nombre;
        if (!name && s && s.menuConfig && s.menuConfig.projectName) name = s.menuConfig.projectName;
      }
    } catch (e) {}
    BoxiesShell.setProjectContext({
      name: name || slug,
      slug: slug
    });
  }

  function unmount() {
    restorePromotedActions();
    try {
      if (typeof AiProjectBuilderView !== 'undefined' && typeof AiProjectBuilderView.onLeave === 'function') {
        AiProjectBuilderView.onLeave();
      }
    } catch (e) {
      console.warn('[boxies:builder-page] onLeave', e);
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    if (activeHost) {
      activeHost.classList.remove('boxies-builder-embed');
      activeHost = null;
    }
  }

  return { id: 'builder', title: 'Builder', mount: mount, unmount: unmount };
})();
