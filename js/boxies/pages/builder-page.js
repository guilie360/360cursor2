/**
 * BOXIES BuilderPage — adapter around AiProjectBuilderView.
 * Opens by permanent projectId (UUID); slug kept in URL for public preview + legacy fallback.
 */
var BoxiesBuilderPage = (function () {
  var activeHost = null;
  var promotedNodes = [];
  var PENDING_CREATE_KEY = 'boxies_pending_showroom_creation';

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hasPendingCreate() {
    if (window.__BOXIES_PENDING_CREATE__) return true;
    try {
      var raw = sessionStorage.getItem(PENDING_CREATE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.t || Date.now() - data.t > 120000) {
        clearPendingCreate();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearPendingCreate() {
    try {
      sessionStorage.removeItem(PENDING_CREATE_KEY);
    } catch (e) {}
    window.__BOXIES_PENDING_CREATE__ = false;
  }

  function ensureCreateBusyVisible() {
    if (!hasPendingCreate()) return;
    document.body.classList.add('boxies-is-creating-showroom');
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy('Creando showroom');
    }
  }

  function releaseCreateBusy() {
    clearPendingCreate();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
          AdminUI.hideGlobalBusy();
        }
        document.body.classList.remove('boxies-is-creating-showroom');
      });
    });
  }

  function failCreateBusy(message) {
    clearPendingCreate();
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
      AdminUI.hideGlobalBusy();
    }
    document.body.classList.remove('boxies-is-creating-showroom');
    if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
      AdminNotify.error(message || 'No se pudo abrir la configuración del showroom.');
    }
  }

  function isBuilderConfigReady(host) {
    if (!host) return false;
    return !!(
      host.querySelector('#builderApp') &&
      (host.querySelector('.builder-config-identity__title') ||
        host.querySelector('#builderStepPanel') ||
        host.querySelector('[data-builder-step="config"]') ||
        host.querySelector('.builder-workspace'))
    );
  }

  function ensureIdentityInUrl(projectId, slug) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('page', 'builder');
      if (projectId) url.searchParams.set('projectId', projectId);
      else url.searchParams.delete('projectId');
      if (slug) {
        url.searchParams.set('project', slug);
        url.searchParams.set('proyecto', slug);
      }
      window.history.replaceState(
        { page: 'builder', projectId: projectId || null, project: slug || null },
        '',
        url.pathname + url.search + url.hash
      );
    } catch (e) {}
  }

  function promoteDockActions(host) {
    var dockActions = document.getElementById('boxiesDockActions');
    var previewBtn = document.getElementById('boxiesPreviewBtn');
    var nested = host.querySelector('.builder-header-actions');
    if (!dockActions || !nested) return;

    promotedNodes = [];
    Array.prototype.slice.call(nested.children).forEach(function (btn) {
      btn.setAttribute('data-boxies-page-action', '1');
      btn.classList.add('boxies-btn-secondary');
      btn.classList.remove('is-primary', 'boxies-action-btn');
      if (previewBtn) dockActions.insertBefore(btn, previewBtn);
      else dockActions.appendChild(btn);
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
        '<h1 class="boxies-page__title">Selecciona un Showroom</h1>' +
        '<p class="boxies-page__desc">Usa <strong>Administrar</strong> desde Showrooms para abrir el editor dentro de este Shell.</p>' +
        '<button type="button" class="boxies-action-btn" id="boxiesBuilderBackProjects">Ir a Showrooms</button>' +
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
        '<button type="button" class="boxies-action-btn" id="boxiesBuilderBackProjects">Volver a Showrooms</button>' +
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
    var projectId = (ctx.projectId || '').trim();
    var slug = (ctx.project || ctx.proyecto || ctx.slug || '').trim();
    var pendingCreate = hasPendingCreate();
    if (pendingCreate) ensureCreateBusyVisible();

    if (!projectId && !slug) {
      if (pendingCreate) failCreateBusy('Showroom creado, pero faltan datos para abrir la configuración.');
      showPickProject(host);
      return;
    }

    if (typeof AiProjectBuilderView === 'undefined' || typeof AiProjectBuilderView.render !== 'function') {
      if (pendingCreate) failCreateBusy('AiProjectBuilderView no está disponible en este host.');
      showError(host, new Error('AiProjectBuilderView no está disponible en este host.'));
      return;
    }

    ensureIdentityInUrl(projectId, slug);
    host.classList.add('boxies-builder-embed');
    if (!pendingCreate) {
      host.innerHTML = '<p class="boxies-page__desc" style="padding:8px 0">Cargando builder…</p>';
    } else {
      host.innerHTML = '';
    }

    try {
      if (typeof PlatformBuilderBridge !== 'undefined' && typeof PlatformBuilderBridge.init === 'function') {
        await PlatformBuilderBridge.init();
      }

      /* Prefer permanent ID in session before engines resolve */
      if (projectId && typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(projectId);
      }

      await AiProjectBuilderView.render(host);

      promoteDockActions(host);
      var nestedHeader = host.querySelector('.builder-header-fixed');
      if (nestedHeader) nestedHeader.remove();
      var nestedDock = host.querySelector('.builder-dock, #builderDock');
      if (nestedDock) nestedDock.remove();

      var nestedApp = host.querySelector('#builderApp');
      if (nestedApp) nestedApp.hidden = false;

      syncProjectDock(projectId, slug);
      if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyCollapsedFromPrefs) {
        BuilderProgressRail.applyCollapsedFromPrefs();
      }

      if (pendingCreate) {
        if (!isBuilderConfigReady(host)) {
          /* Allow one paint cycle for late DOM from render */
          await new Promise(function (resolve) {
            requestAnimationFrame(function () { resolve(); });
          });
        }
        if (!isBuilderConfigReady(host)) {
          failCreateBusy('Showroom creado, pero la configuración no terminó de cargar.');
          return;
        }
        releaseCreateBusy();
      }
    } catch (err) {
      console.error('[boxies:builder-page]', err);
      if (pendingCreate) {
        failCreateBusy((err && err.message) || 'No se pudo abrir la configuración del showroom.');
      }
      showError(host, err);
    }
  }

  function syncProjectDock(projectId, slug) {
    if (typeof BoxiesShell === 'undefined' || typeof BoxiesShell.setProjectContext !== 'function') return;
    var name = '';
    var resolvedId = projectId || '';
    var resolvedSlug = slug || '';
    try {
      if (typeof AiProjectBuilderView !== 'undefined') {
        if (AiProjectBuilderView.getProjectLabel) {
          name = AiProjectBuilderView.getProjectLabel() || '';
        }
        if (AiProjectBuilderView.getProjectIdentity) {
          var identity = AiProjectBuilderView.getProjectIdentity() || {};
          if (identity.id) resolvedId = identity.id;
          if (identity.slug) resolvedSlug = identity.slug;
          if (identity.nombre) name = identity.nombre;
        }
      } else if (typeof BuilderSession !== 'undefined') {
        var s = BuilderSession.load();
        name = (s && s.projectInfo && s.projectInfo.nombre) || '';
        resolvedSlug = resolvedSlug || (s && s.projectInfo && s.projectInfo.slug) || '';
        resolvedId = resolvedId || (s && s.draftProjectId) || '';
      }
    } catch (e) {}
    BoxiesShell.setProjectContext({
      id: resolvedId,
      name: name || resolvedSlug,
      slug: resolvedSlug
    });
    if (typeof BoxiesRouter !== 'undefined' && BoxiesRouter.syncProjectIdentity) {
      BoxiesRouter.syncProjectIdentity({
        projectId: resolvedId,
        slug: resolvedSlug
      });
    }
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
