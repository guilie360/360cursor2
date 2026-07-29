/**
 * QuotationBuilderView — independent Quotation Room builder host.
 * V7.1.00 — architecture + navigation only (no Showroom wizard reuse).
 */
var QuotationBuilderView = (function () {
  var rootEl = null;
  var currentStep = 'config';
  var projectCtx = { id: '', name: '', slug: '' };

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function resolvePanel(stepId) {
    var id = typeof QuotationRouter !== 'undefined'
      ? QuotationRouter.normalize(stepId)
      : (stepId || 'config');
    if (id === 'hero' && typeof QuotationHero !== 'undefined') return QuotationHero;
    if (id === 'editor' && typeof QuotationEditor !== 'undefined') return QuotationEditor;
    if (id === 'preview' && typeof QuotationPreview !== 'undefined') return QuotationPreview;
    return typeof QuotationConfig !== 'undefined' ? QuotationConfig : null;
  }

  function shellHtml(stepId) {
    var sidebar =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.renderHtml
        ? QuotationSidebar.renderHtml(stepId)
        : '';
    return '' +
      '<div class="quotation-builder" id="quotationBuilderRoot" data-quotation-builder>' +
        '<aside class="quotation-sidebar" id="quotationSidebar" aria-label="Navegación Quotation">' +
          sidebar +
        '</aside>' +
        '<div class="quotation-workspace">' +
          '<section class="quotation-panel" id="quotationPanel" data-quotation-panel></section>' +
        '</div>' +
      '</div>';
  }

  function renderStep(stepId) {
    if (!rootEl) return;
    currentStep = typeof QuotationRouter !== 'undefined'
      ? QuotationRouter.writeToUrl(stepId)
      : stepId;
    var panel = rootEl.querySelector('[data-quotation-panel]');
    var workspace = rootEl.querySelector('.quotation-workspace');
    var mod = resolvePanel(currentStep);
    if (workspace) {
      workspace.classList.toggle('is-editor', currentStep === 'editor');
    }
    if (panel) {
      panel.classList.toggle('quotation-panel--editor', currentStep === 'editor');
      panel.innerHTML = mod && mod.render
        ? mod.render(projectCtx)
        : '<p class="boxies-page__desc">Paso no disponible.</p>';
      if (mod && mod.bind) {
        try { mod.bind(panel, projectCtx); } catch (eBind) {}
      }
    }
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.setActive) {
      QuotationSidebar.setActive(rootEl.querySelector('#quotationSidebar'), currentStep);
    }
  }

  function goToStep(stepId) {
    renderStep(stepId);
  }

  async function hydrateIdentity(projectId, slug) {
    projectCtx = {
      id: String(projectId || '').trim(),
      slug: String(slug || '').trim(),
      name: String(slug || projectId || 'Quotation Room')
    };
    try {
      if (typeof BoxiesAdmin2ProjectsApi !== 'undefined' && BoxiesAdmin2ProjectsApi.list) {
        var rows = await BoxiesAdmin2ProjectsApi.list({ experienceType: 'quotation' });
        var match = null;
        (rows || []).some(function (row) {
          if (projectCtx.id && String(row.id) === projectCtx.id) {
            match = row;
            return true;
          }
          if (projectCtx.slug && String(row.slug) === projectCtx.slug) {
            match = row;
            return true;
          }
          return false;
        });
        if (match) {
          projectCtx.id = match.id || projectCtx.id;
          projectCtx.name = match.nombre || match.name || projectCtx.name;
          projectCtx.slug = match.slug || projectCtx.slug;
        }
      }
    } catch (eHydrate) {}
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
      BoxiesShell.setProjectContext({
        id: projectCtx.id,
        name: projectCtx.name,
        slug: projectCtx.slug
      });
    }
  }

  async function render(host, opts) {
    opts = opts || {};
    rootEl = host;
    host.classList.add('boxies-builder-embed', 'quotation-builder-host');
    var projectId = (opts.projectId || '').trim();
    var slug = (opts.project || opts.slug || opts.proyecto || '').trim();
    await hydrateIdentity(projectId, slug);

    currentStep = typeof QuotationRouter !== 'undefined'
      ? QuotationRouter.readFromUrl()
      : 'config';

    host.innerHTML = shellHtml(currentStep);
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.bind) {
      QuotationSidebar.bind(host.querySelector('#quotationSidebar'), goToStep);
    }
    renderStep(currentStep);
    return {
      goToStep: goToStep,
      getProjectIdentity: function () {
        return {
          id: projectCtx.id,
          slug: projectCtx.slug,
          nombre: projectCtx.name
        };
      },
      getProjectLabel: function () {
        return projectCtx.name || projectCtx.slug || '';
      }
    };
  }

  function onLeave() {
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eL) {}
    }
    if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.deactivate) {
      try { BuilderPropertiesRail.deactivate(); } catch (eR) {}
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    rootEl = null;
    projectCtx = { id: '', name: '', slug: '' };
  }

  return {
    render: render,
    onLeave: onLeave,
    goToStep: goToStep,
    getProjectLabel: function () {
      return projectCtx.name || projectCtx.slug || '';
    },
    getProjectIdentity: function () {
      return {
        id: projectCtx.id,
        slug: projectCtx.slug,
        nombre: projectCtx.name
      };
    }
  };
})();
