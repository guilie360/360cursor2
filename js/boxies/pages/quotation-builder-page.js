/**
 * BOXIES QuotationBuilderPage — host for QuotationBuilderView.
 * Independent from AiProjectBuilderView / Showroom wizard.
 */
var BoxiesQuotationBuilderPage = (function () {
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
      return BoxiesExperienceTypes.getCreateBusyLabel('quotation');
    }
    return 'Creando Quotation Room';
  }

  function showBootLoader(pendingCreate) {
    document.body.classList.toggle('boxies-is-creating-showroom', !!pendingCreate);
    if (typeof AdminUI === 'undefined' || typeof AdminUI.showGlobalBusy !== 'function') return;
    /* Opaque black + spinner — never flash empty editor chrome / “Cargando…” copy. */
    AdminUI.showGlobalBusy(pendingCreate ? busyLabelCreate() : '', { opaque: true });
  }

  function hideBootLoader() {
    clearPendingCreate();
    clearPendingOpen();
    document.body.classList.remove('boxies-is-creating-showroom');
    if (typeof AdminUI !== 'undefined' && typeof AdminUI.hideGlobalBusy === 'function') {
      AdminUI.hideGlobalBusy();
    }
  }

  function failBusy(message) {
    hideBootLoader();
    if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
      AdminNotify.error(message || 'No se pudo abrir el Quotation Builder.');
    }
  }

  function showError(host, err) {
    host.innerHTML =
      '<div class="boxies-page boxies-placeholder">' +
        '<h1 class="boxies-page__title">No se pudo abrir Quotation Builder</h1>' +
        '<p class="boxies-page__desc">' + escapeHtml((err && err.message) || 'Error desconocido') + '</p>' +
        '<button type="button" class="boxies-action-btn" id="boxiesQuotationBackProjects">Volver a Proyectos</button>' +
      '</div>';
    var btn = document.getElementById('boxiesQuotationBackProjects');
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

    host.classList.add('boxies-builder-embed', 'quotation-builder-host');
    host.innerHTML = '';
    showBootLoader(pendingCreate);

    if (!projectId && !slug) {
      failBusy('Faltan datos para abrir la Quotation Room.');
      showError(host, new Error('Faltan datos para abrir la Quotation Room.'));
      return;
    }

    if (typeof QuotationBuilderView === 'undefined' || typeof QuotationBuilderView.render !== 'function') {
      failBusy('QuotationBuilderView no está disponible.');
      showError(host, new Error('QuotationBuilderView no está disponible.'));
      return;
    }

    try {
      if (typeof PlatformBuilderBridge !== 'undefined' && typeof PlatformBuilderBridge.init === 'function') {
        await PlatformBuilderBridge.init();
      }

      if (projectId && typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(projectId);
      }
      await QuotationBuilderView.render(host, {
        projectId: projectId,
        project: slug,
        slug: slug
      });
      /* Double rAF so first paint of full editor lands under the loader, then reveal. */
      requestAnimationFrame(function () {
        requestAnimationFrame(hideBootLoader);
      });
    } catch (err) {
      console.error('[boxies:quotation-builder-page]', err);
      failBusy((err && err.message) || 'No se pudo abrir el Quotation Builder.');
      showError(host, err);
    }
  }

  function unmount() {
    try {
      if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.onLeave) {
        QuotationBuilderView.onLeave();
      }
    } catch (e) {
      console.warn('[boxies:quotation-builder-page] onLeave', e);
    }
    hideBootLoader();
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    if (activeHost) {
      activeHost.classList.remove('boxies-builder-embed', 'quotation-builder-host');
      activeHost = null;
    }
  }

  return {
    id: 'quotation-builder',
    title: 'Quotation Builder',
    mount: mount,
    unmount: unmount
  };
})();
