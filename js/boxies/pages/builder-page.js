/**
 * BOXIES BuilderPage — adapter around AiProjectBuilderView.
 * Opens by permanent projectId (UUID); slug kept in URL for public preview + legacy fallback.
 */
var BoxiesBuilderPage = (function () {
  var activeHost = null;
  var promotedNodes = [];
  var PENDING_CREATE_KEY = 'boxies_pending_showroom_creation';
  var PENDING_OPEN_KEY = 'boxies_pending_showroom_open';

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

  function hasPendingOpen() {
    if (window.__BOXIES_PENDING_OPEN__) return true;
    try {
      var raw = sessionStorage.getItem(PENDING_OPEN_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.t || Date.now() - data.t > 120000) {
        clearPendingOpen();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearPendingOpen() {
    try {
      sessionStorage.removeItem(PENDING_OPEN_KEY);
    } catch (e) {}
    window.__BOXIES_PENDING_OPEN__ = false;
  }

  function ensureCreateBusyVisible() {
    if (!hasPendingCreate()) return;
    document.body.classList.add('boxies-is-creating-showroom');
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy('Creando showroom');
    }
  }

  function ensureOpenBusyVisible() {
    if (!hasPendingOpen()) return;
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy('Cargando showroom');
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

  function releaseOpenBusy() {
    clearPendingOpen();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
          AdminUI.hideGlobalBusy();
        }
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

  function failOpenBusy(message) {
    clearPendingOpen();
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
      AdminUI.hideGlobalBusy();
    }
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

  async function waitUntilBuilderReady(host) {
    if (isBuilderConfigReady(host)) return true;
    await new Promise(function (resolve) {
      requestAnimationFrame(function () { resolve(); });
    });
    return isBuilderConfigReady(host);
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
    var beforeEl = (previewBtn && previewBtn.parentNode === dockActions) ? previewBtn : null;
    Array.prototype.slice.call(nested.children).forEach(function (btn) {
      btn.setAttribute('data-boxies-page-action', '1');
      btn.classList.add('boxies-btn-secondary');
      btn.classList.remove('is-primary', 'boxies-action-btn');
      if (beforeEl) dockActions.insertBefore(btn, beforeEl);
      else dockActions.appendChild(btn);
      promotedNodes.push(btn);
    });
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mount) {
      BuilderDirtyState.mount();
    }
  }

  function restorePromotedActions() {
    promotedNodes.forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    promotedNodes = [];
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.destroy) {
      BuilderDirtyState.destroy();
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      BoxiesShell.clearPageActions();
    }
  }

  function navigateToExperienceTab(typeId) {
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.setActive) {
      BoxiesExperienceTypes.setActive(typeId);
    }
    BoxiesRouter.navigate('projects');
  }

  function renderSelectorCard(type) {
    var title = type.selectorTitle || type.singular || type.tabLabel || '';
    var cta = type.selectorCta || 'Crear →';
    var cover = type.galleryCover || type.coverUrl || '';
    var coverStyle = cover
      ? ' style="background-image:url(\'' + escapeHtml(cover).replace(/'/g, '%27') + '\')"'
      : '';
    return (
      '<button type="button" class="boxies-exp-select-card" data-experience-open="' +
        escapeHtml(type.id) +
        '" role="listitem">' +
        '<span class="boxies-exp-select-card__media" aria-hidden="true"' + coverStyle + '>' +
          '<span class="boxies-exp-select-card__media-veil"></span>' +
        '</span>' +
        '<span class="boxies-exp-select-card__body">' +
          '<span class="boxies-exp-select-card__title">' +
            escapeHtml(title) +
          '</span>' +
          '<span class="boxies-exp-select-card__meta" data-gallery-meta hidden></span>' +
          '<span class="boxies-exp-select-card__action">' +
            escapeHtml(cta) +
          '</span>' +
        '</span>' +
      '</button>'
    );
  }

  function showPickProject(host) {
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
    if (typeof BuilderPropertiesRail !== 'undefined') {
      try {
        if (BuilderPropertiesRail.deactivate) BuilderPropertiesRail.deactivate();
        else if (BuilderPropertiesRail.destroyFloatButton) BuilderPropertiesRail.destroyFloatButton();
      } catch (eProps) {}
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    var types =
      typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.list
        ? BoxiesExperienceTypes.list()
        : [];

    host.innerHTML =
      '<div class="boxies-page boxies-exp-select boxies-exp-gallery">' +
        '<header class="boxies-exp-select__header">' +
          '<h1 class="boxies-page__title">Builder</h1>' +
          '<p class="boxies-page__desc">Selecciona el tipo de proyecto que deseas crear.</p>' +
        '</header>' +
        '<div class="boxies-exp-select__grid" role="list">' +
          types.map(renderSelectorCard).join('') +
        '</div>' +
      '</div>';

    host.querySelectorAll('[data-experience-open]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        navigateToExperienceTab(card.getAttribute('data-experience-open'));
      });
    });
  }

  function showError(host, err) {
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
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
    var projectId = (ctx.projectId || '').trim();
    var slug = (ctx.project || ctx.proyecto || ctx.slug || '').trim();
    var pendingCreate = hasPendingCreate();
    var pendingOpen = !pendingCreate && hasPendingOpen();
    var pendingBusy = pendingCreate || pendingOpen;
    if (pendingCreate) ensureCreateBusyVisible();
    else if (pendingOpen) ensureOpenBusyVisible();

    if (!projectId && !slug) {
      if (pendingCreate) failCreateBusy('Showroom creado, pero faltan datos para abrir la configuración.');
      else if (pendingOpen) failOpenBusy('Faltan datos para abrir la configuración del showroom.');
      showPickProject(host);
      return;
    }

    if (typeof AiProjectBuilderView === 'undefined' || typeof AiProjectBuilderView.render !== 'function') {
      if (pendingCreate) failCreateBusy('AiProjectBuilderView no está disponible en este host.');
      else if (pendingOpen) failOpenBusy('AiProjectBuilderView no está disponible en este host.');
      showError(host, new Error('AiProjectBuilderView no está disponible en este host.'));
      return;
    }

    ensureIdentityInUrl(projectId, slug);
    host.classList.add('boxies-builder-embed');
    if (!pendingBusy) {
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
      /* V7.0.07 — editor entry always opens the tools rail; float exists only with the rail. */
      if (typeof BuilderProgressRail !== 'undefined') {
        if (BuilderProgressRail.openEditorRail) {
          BuilderProgressRail.openEditorRail();
        } else if (BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(false);
        }
      }

      if (pendingBusy) {
        var ready = await waitUntilBuilderReady(host);
        if (!ready) {
          if (pendingCreate) {
            failCreateBusy('Showroom creado, pero la configuración no terminó de cargar.');
          } else {
            failOpenBusy('La configuración del showroom no terminó de cargar.');
            showError(host, new Error('La configuración del showroom no terminó de cargar.'));
          }
          return;
        }
        if (pendingCreate) releaseCreateBusy();
        else releaseOpenBusy();
      }
      if (typeof BoxiesTooltip !== 'undefined' && typeof BoxiesTooltip.refresh === 'function') {
        BoxiesTooltip.refresh(host);
      }
    } catch (err) {
      console.error('[boxies:builder-page]', err);
      if (pendingCreate) {
        failCreateBusy((err && err.message) || 'No se pudo abrir la configuración del showroom.');
      } else if (pendingOpen) {
        failOpenBusy((err && err.message) || 'No se pudo abrir la configuración del showroom.');
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
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
    if (typeof BuilderPropertiesRail !== 'undefined') {
      try {
        if (BuilderPropertiesRail.deactivate) BuilderPropertiesRail.deactivate();
        else if (BuilderPropertiesRail.destroyFloatButton) BuilderPropertiesRail.destroyFloatButton();
      } catch (eProps) {}
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
