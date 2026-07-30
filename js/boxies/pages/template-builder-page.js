/**
 * BOXIES Template Builder — V7.2.01
 * Reuses Quotation Builder modules (Config / Hero / Editor / Preview)
 * but persists on experience_type=template rows.
 */
var BoxiesTemplateBuilderPage = (function () {
  var activeHost = null;
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
    try { sessionStorage.removeItem(PENDING_CREATE_KEY); } catch (e) {}
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
    try { sessionStorage.removeItem(PENDING_OPEN_KEY); } catch (e) {}
    window.__BOXIES_PENDING_OPEN__ = false;
  }

  function busyLabelCreate() {
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getCreateBusyLabel) {
      return BoxiesExperienceTypes.getCreateBusyLabel('template');
    }
    return 'Creando Plantilla';
  }

  function busyLabelOpen() {
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.getOpenBusyLabel) {
      return BoxiesExperienceTypes.getOpenBusyLabel('template');
    }
    return 'Cargando Plantilla';
  }

  function ensureCreateBusyVisible() {
    if (!hasPendingCreate()) return;
    document.body.classList.add('boxies-is-creating-showroom');
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy(busyLabelCreate());
    }
  }

  function ensureOpenBusyVisible() {
    if (!hasPendingOpen()) return;
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.showGlobalBusy === 'function') {
      AdminUI.showGlobalBusy(busyLabelOpen());
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

  function failBusy(message) {
    clearPendingCreate();
    clearPendingOpen();
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
      AdminUI.hideGlobalBusy();
    }
    document.body.classList.remove('boxies-is-creating-showroom');
    if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
      AdminNotify.error(message || 'No se pudo abrir el Template Builder.');
    }
  }

  function showError(host, err) {
    host.innerHTML =
      '<div class="boxies-page boxies-placeholder">' +
        '<h1 class="boxies-page__title">No se pudo abrir Template Builder</h1>' +
        '<p class="boxies-page__desc">' + escapeHtml((err && err.message) || 'Error desconocido') + '</p>' +
        '<button type="button" class="boxies-action-btn" id="boxiesTemplateBackProjects">Volver a Proyectos</button>' +
      '</div>';
    var btn = document.getElementById('boxiesTemplateBackProjects');
    if (btn) {
      btn.addEventListener('click', function () {
        if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.setActive) {
          BoxiesExperienceTypes.setActive('template');
        }
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
    if (pendingCreate) ensureCreateBusyVisible();
    else if (pendingOpen) ensureOpenBusyVisible();

    if (!projectId && !slug) {
      failBusy('Faltan datos para abrir la Plantilla.');
      showError(host, new Error('Faltan datos para abrir la Plantilla.'));
      return;
    }

    if (typeof QuotationBuilderView === 'undefined' || typeof QuotationBuilderView.render !== 'function') {
      failBusy('QuotationBuilderView no está disponible.');
      showError(host, new Error('QuotationBuilderView no está disponible para Template Builder.'));
      return;
    }

    host.classList.add('boxies-builder-embed', 'quotation-builder-host', 'template-builder-host');
    if (!pendingCreate && !pendingOpen) {
      host.innerHTML = '<p class="boxies-page__desc" style="padding:8px 0">Cargando Template Builder…</p>';
    } else {
      host.innerHTML = '';
    }

    try {
      if (typeof PlatformBuilderBridge !== 'undefined' && typeof PlatformBuilderBridge.init === 'function') {
        await PlatformBuilderBridge.init();
      }

      if (projectId && typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(projectId);
      }

      if (typeof BoxiesProjectTemplateContract !== 'undefined' &&
          BoxiesProjectTemplateContract.setPreferredTemplateId && projectId) {
        BoxiesProjectTemplateContract.setPreferredTemplateId(projectId);
      }

      await QuotationBuilderView.render(host, {
        projectId: projectId,
        project: slug,
        slug: slug,
        experienceType: 'template'
      });

      if (pendingCreate) releaseCreateBusy();
      else if (pendingOpen) releaseOpenBusy();
    } catch (err) {
      console.error('[boxies:template-builder-page]', err);
      failBusy((err && err.message) || 'No se pudo abrir el Template Builder.');
      showError(host, err);
    }
  }

  function unmount() {
    try {
      if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.onLeave) {
        QuotationBuilderView.onLeave();
      }
    } catch (e) {
      console.warn('[boxies:template-builder-page] onLeave', e);
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    if (activeHost) {
      activeHost.classList.remove(
        'boxies-builder-embed',
        'quotation-builder-host',
        'template-builder-host'
      );
      activeHost = null;
    }
  }

  return {
    id: 'template-builder',
    title: 'Template Builder',
    mount: mount,
    unmount: unmount
  };
})();
