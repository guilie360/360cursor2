/**
 * QuotationBuilderView — Quotation Room builder host.
 * V7.1.09 — Config 3-col + dock action states + shared BuilderHero.
 */
var QuotationBuilderView = (function () {
  var rootEl = null;
  var currentStep = 'config';
  var projectCtx = {
    id: '',
    name: '',
    slug: '',
    constructora_id: null,
    og_image: '',
    og_title: '',
    og_description: '',
    published: false
  };
  var sectionChecks = {};
  var processing = false;
  var builderExperienceType = 'quotation';
  var leftCollapsed = false;
  var RECURSOS_W = '200px';
  var FLOAT_BTN_ID = 'quotationLeftFloatBtn';

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function iconHtml(name) {
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render(name);
    }
    return '‹';
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

  function iconRailHtml(stepId) {
    if (typeof QuotationSidebar === 'undefined' || !QuotationSidebar.renderHtml) return '';
    return (
      '<nav class="quotation-icon-rail" id="quotationStepsBar" aria-label="Pasos del Builder">' +
        QuotationSidebar.renderHtml(stepId, sectionChecks) +
      '</nav>'
    );
  }

  function leftFloatHtml() {
    return (
      '<button type="button" class="quotation-panel-float quotation-panel-float--left"' +
        ' id="' + FLOAT_BTN_ID + '"' +
        ' data-collapsed="' + (leftCollapsed ? '1' : '0') + '"' +
        ' aria-expanded="' + (leftCollapsed ? 'false' : 'true') + '"' +
        ' aria-label="' + (leftCollapsed ? 'Expandir recursos' : 'Colapsar recursos') + '"' +
        ' data-tooltip="' + (leftCollapsed ? 'Expandir recursos' : 'Colapsar recursos') + '">' +
        iconHtml('chevron-left') +
      '</button>'
    );
  }

  function shellHtml(stepId) {
    var actions =
      typeof BuilderDockActions !== 'undefined' && BuilderDockActions.mountHostHtml
        ? BuilderDockActions.mountHostHtml({ published: !!projectCtx.published })
        : (
          '<div class="builder-header-actions" hidden>' +
            '<button type="button" class="builder-header-action-btn" id="builderSaveBtn">Guardar</button>' +
            '<button type="button" class="builder-header-action-btn is-primary" id="builderPublishBtn">' +
              (projectCtx.published ? 'Republicar' : 'Publicar') +
            '</button>' +
          '</div>'
        );
    return '' +
      '<div class="quotation-builder builder-app quotation-canvas-first" id="quotationBuilderRoot" data-quotation-builder' +
        (builderExperienceType === 'template' ? ' data-template-builder' : '') + '>' +
        actions +
        '<div class="builder-workspace quotation-workspace' +
          (leftCollapsed ? ' is-left-collapsed' : '') + '">' +
          '<div class="quotation-left-block" id="quotationLeftBlock">' +
            iconRailHtml(stepId) +
            '<aside class="quotation-recursos' + (leftCollapsed ? ' is-collapsed' : '') + '"' +
              ' id="quotationRecursosPanel" aria-label="Recursos">' +
              leftFloatHtml() +
              '<div class="quotation-left-body" id="quotationLeftBody"></div>' +
            '</aside>' +
          '</div>' +
          '<div class="quotation-main">' +
            '<section class="quotation-panel" id="quotationPanel" data-quotation-panel></section>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function syncFloatButton() {
    var btn = (rootEl && rootEl.querySelector('#' + FLOAT_BTN_ID)) ||
      document.getElementById(FLOAT_BTN_ID);
    if (!btn) return;
    btn.setAttribute('data-collapsed', leftCollapsed ? '1' : '0');
    btn.setAttribute('aria-expanded', leftCollapsed ? 'false' : 'true');
    btn.setAttribute('aria-label', leftCollapsed ? 'Expandir recursos' : 'Colapsar recursos');
    btn.setAttribute('data-tooltip', leftCollapsed ? 'Expandir recursos' : 'Colapsar recursos');
    btn.innerHTML = iconHtml('chevron-left');
  }

  function applyLeftCollapsed(collapsed) {
    leftCollapsed = !!collapsed;
    if (!rootEl) return;
    var workspace = rootEl.querySelector('.quotation-workspace');
    var recursos = rootEl.querySelector('#quotationRecursosPanel');
    if (workspace) workspace.classList.toggle('is-left-collapsed', leftCollapsed);
    if (recursos) recursos.classList.toggle('is-collapsed', leftCollapsed);
    try {
      document.documentElement.style.setProperty(
        '--quotation-recursos-w',
        leftCollapsed ? '0px' : RECURSOS_W
      );
    } catch (eW) {}
    syncFloatButton();
    try {
      window.dispatchEvent(new Event('resize'));
    } catch (eR) {}
  }

  function ensureFloatButton() {
    if (!rootEl) return null;
    var btn = rootEl.querySelector('#' + FLOAT_BTN_ID);
    if (!btn) return null;
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        applyLeftCollapsed(!leftCollapsed);
      });
    }
    syncFloatButton();
    return btn;
  }

  function destroyFloatButton() {
    /* Remove orphaned viewport-fixed floats from prior versions. */
    var orphan = document.getElementById(FLOAT_BTN_ID);
    if (orphan && (!rootEl || !rootEl.contains(orphan))) {
      try { orphan.parentNode.removeChild(orphan); } catch (e) {}
    }
  }

  function refreshSidebar() {
    if (!rootEl) return;
    var bar = rootEl.querySelector('#quotationStepsBar');
    if (!bar) return;
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.setActive) {
      QuotationSidebar.setActive(bar, currentStep, sectionChecks);
      QuotationSidebar.bind(bar, goToStep);
    }
  }

  function clearLeftBody() {
    var body = rootEl && rootEl.querySelector('#quotationLeftBody');
    if (body) body.innerHTML = '';
  }

  function bindSectionCheck(panel) {
    if (!panel) return;
    var input = panel.querySelector('#builderSectionDoneCheck');
    if (!input) return;
    input.addEventListener('change', function () {
      var stepId = input.getAttribute('data-section-id') || currentStep;
      sectionChecks[stepId] = !!input.checked;
      refreshSidebar();
    });
  }

  function configAdapter() {
    return {
      getProjectId: function () { return projectCtx.id || null; },
      getIdentity: function () {
        return {
          nombre: projectCtx.name || '',
          slug: projectCtx.slug || '',
          constructora_id: projectCtx.constructora_id || null
        };
      },
      resolveConstructoraId: function () {
        return projectCtx.constructora_id ||
          (typeof AdminState !== 'undefined' && AdminState.getConstructoraId
            ? AdminState.getConstructoraId()
            : null);
      },
      onSaved: function (payload) {
        projectCtx.id = payload.id;
        projectCtx.name = payload.nombre;
        projectCtx.slug = payload.slug;
        projectCtx.constructora_id = payload.constructora_id || projectCtx.constructora_id;
      },
      onShareSaved: function (meta) {
        projectCtx.og_image = meta.og_image || '';
        projectCtx.og_title = meta.og_title || '';
        projectCtx.og_description = meta.og_description || '';
      }
    };
  }

  function setDockState(phase) {
    if (typeof BuilderDockActions === 'undefined' || !BuilderDockActions.setState) return;
    try { BuilderDockActions.setState(phase); } catch (eDock) {}
  }

  async function handleSave() {
    if (processing) return;
    processing = true;
    setDockState('saving');
    try {
      var panel = rootEl && rootEl.querySelector('[data-quotation-panel]');
      if (panel && typeof BuilderConfig !== 'undefined' && BuilderConfig.commitAll) {
        await BuilderConfig.commitAll(configAdapter(), panel, { silent: true });
      } else if (panel && typeof BuilderConfig !== 'undefined' && BuilderConfig.saveShareMeta) {
        await BuilderConfig.saveShareMeta(configAdapter(), panel);
      }
      /* Hero may upload media; Editor commit LAST so ProjectDocument (canvas) is SSOT. */
      if (typeof QuotationHero !== 'undefined' && QuotationHero.commit) {
        await QuotationHero.commit(configAdapter());
      }
      if (typeof QuotationEditor !== 'undefined' && QuotationEditor.commit) {
        await QuotationEditor.commit(configAdapter());
      }
      if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
        BuilderDirtyState.clear();
      }
      setDockState('success');
    } catch (err) {
      setDockState('error');
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error((err && err.message) || 'No se pudo guardar.');
      }
    } finally {
      processing = false;
    }
  }

  async function handlePublish() {
    if (processing) return;
    if (!projectCtx.id) {
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No hay un proyecto vinculado.');
      }
      return;
    }
    processing = true;
    setDockState('publishing');
    try {
      var panel = rootEl && rootEl.querySelector('[data-quotation-panel]');
      if (panel && typeof BuilderConfig !== 'undefined' && BuilderConfig.saveShareMeta) {
        try { await BuilderConfig.saveShareMeta(configAdapter(), panel); } catch (eShare) {}
      }
      if (typeof QuotationHero !== 'undefined' && QuotationHero.commit) {
        try { await QuotationHero.commit(configAdapter()); } catch (eHero) {}
      }
      /* Editor LAST — published Runtime must match Editor ProjectDocument. */
      if (typeof QuotationEditor !== 'undefined' && QuotationEditor.commit) {
        try { await QuotationEditor.commit(configAdapter()); } catch (eEditor) {}
      }
      if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onPublish) {
        var pubDoc = null;
        try {
          pubDoc = typeof QuotationEditor !== 'undefined' && QuotationEditor.serializeDocument
            ? QuotationEditor.serializeDocument()
            : null;
        } catch (eDoc) {}
        QuotationPersistAudit.onPublish({
          projectId: projectCtx.id,
          slug: projectCtx.slug,
          source: 'QuotationBuilder.handlePublish',
          documentOrigin:
            '1) QuotationHero.commit (hero_quotation top-level, canvas preserved if absent) → ' +
            '2) QuotationEditor.commit (hero_quotation.canvas = serializeDocument) → ' +
            '3) ProyectosApi.update({ publicado: true }) — flag only, does not rewrite canvas',
          note: 'Public Runtime /{slug} will load hero_quotation from DB after this, not Editor memory.',
          memoryDocumentSummary: pubDoc
        });
      }
      if (typeof ProyectosApi === 'undefined' || !ProyectosApi.update) {
        throw new Error('API de publicación no disponible.');
      }
      var updated = await ProyectosApi.update(projectCtx.id, { publicado: true });
      projectCtx.published = !!(updated && updated.publicado !== false);
      if (typeof BuilderDockActions !== 'undefined' && BuilderDockActions.setPublished) {
        BuilderDockActions.setPublished(true);
      }
      setDockState('success');
    } catch (err) {
      setDockState('error');
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error((err && err.message) || 'No se pudo publicar.');
      }
    } finally {
      processing = false;
    }
  }

  function mountDockActions(host) {
    if (typeof BuilderDockActions === 'undefined') return;
    BuilderDockActions.promote(host);
    BuilderDockActions.bind({
      onSave: handleSave,
      onPublish: handlePublish
    });
    BuilderDockActions.setPublished(!!projectCtx.published);
  }

  function renderStep(stepId) {
    if (!rootEl) return;
    currentStep = typeof QuotationRouter !== 'undefined'
      ? QuotationRouter.writeToUrl(stepId)
      : stepId;
    var panel = rootEl.querySelector('[data-quotation-panel]');
    var workspace = rootEl.querySelector('.quotation-workspace') ||
      rootEl.querySelector('.builder-workspace');
    var mod = resolvePanel(currentStep);
    /* Detach editor UI only — never reset QuotationEditor document SSOT. */
    if (typeof QuotationEditor !== 'undefined' && QuotationEditor.detachUi) {
      try { QuotationEditor.detachUi(); } catch (eDetach) {}
    }
    clearLeftBody();
    if (workspace) {
      workspace.classList.toggle('is-editor', currentStep === 'editor');
      workspace.classList.toggle('is-hero', currentStep === 'hero');
      workspace.classList.toggle('is-left-collapsed', leftCollapsed);
    }
    if (panel) {
      panel.classList.toggle('quotation-panel--editor', currentStep === 'editor');
      panel.classList.toggle('quotation-panel--hero', currentStep === 'hero');
      panel.classList.toggle('is-framed-step', currentStep === 'hero');
      panel.innerHTML = mod && mod.render
        ? mod.render(projectCtx, { sectionChecks: sectionChecks, stepId: currentStep })
        : '<p class="builder-step-desc">Paso no disponible.</p>';
      if (mod && mod.bind) {
        try { mod.bind(panel, projectCtx); } catch (eBind) {}
      }
      bindSectionCheck(panel);
    }
    refreshSidebar();
  }

  function goToStep(stepId) {
    renderStep(stepId);
  }

  function activateSharedChrome() {
    document.body.classList.add('quotation-canvas-first', 'boxies-builder-chrome');
    document.documentElement.classList.add('quotation-canvas-first', 'boxies-builder-chrome');
    document.body.classList.remove('boxies-rail-collapsed');
    document.documentElement.classList.remove('boxies-rail-collapsed');
    try {
      document.documentElement.style.setProperty('--builder-rail-width', '0px');
      document.documentElement.style.setProperty(
        '--quotation-recursos-w',
        leftCollapsed ? '0px' : RECURSOS_W
      );
    } catch (eW) {}
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
    destroyFloatButton();
    ensureFloatButton();
    applyLeftCollapsed(leftCollapsed);
  }

  function deactivateSharedChrome() {
    document.body.classList.remove('quotation-canvas-first', 'boxies-builder-chrome');
    document.documentElement.classList.remove('quotation-canvas-first', 'boxies-builder-chrome');
    try {
      document.documentElement.style.removeProperty('--builder-rail-width');
      document.documentElement.style.removeProperty('--quotation-recursos-w');
      document.documentElement.style.removeProperty('--quotation-left-w');
    } catch (eW) {}
    destroyFloatButton();
  }

  async function hydrateIdentity(projectId, slug, experienceType) {
    var expType = experienceType || 'quotation';
    projectCtx = {
      id: String(projectId || '').trim(),
      slug: String(slug || '').trim(),
      name: String(slug || projectId || (expType === 'template' ? 'Plantilla' : 'Quotation Room')),
      constructora_id: null,
      og_image: '',
      og_title: '',
      og_description: '',
      published: false
    };
    try {
      if (typeof BoxiesAdmin2ProjectsApi !== 'undefined' && BoxiesAdmin2ProjectsApi.list) {
        var rows = await BoxiesAdmin2ProjectsApi.list({ experienceType: expType });
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
          projectCtx.constructora_id = match.constructora_id || null;
          projectCtx.published = !!match.publicado;
        }
      }
    } catch (eHydrate) {}

    /* List may miss the row (scope / experience filter). Resolve slug by id — SSOT for editorProjectCtx. */
    if (
      projectCtx.id &&
      !projectCtx.slug &&
      typeof ProyectosApi !== 'undefined' &&
      typeof ProyectosApi.getById === 'function'
    ) {
      try {
        var row = await ProyectosApi.getById(projectCtx.id);
        if (row) {
          projectCtx.slug = String(row.slug || '').trim() || projectCtx.slug;
          projectCtx.name = row.nombre || row.name || projectCtx.name;
          if (row.constructora_id) projectCtx.constructora_id = row.constructora_id;
          if (row.publicado != null) projectCtx.published = !!row.publicado;
        }
      } catch (eById) {}
    }

    if (projectCtx.id && typeof ProyectosApi !== 'undefined' && ProyectosApi.fetchShareMeta) {
      try {
        var share = await ProyectosApi.fetchShareMeta(projectCtx.id);
        projectCtx.og_image = share.og_image || '';
        projectCtx.og_title = share.og_title || '';
        projectCtx.og_description = share.og_description || '';
      } catch (eShare) {}
    }

    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
      BoxiesShell.setProjectContext({
        id: projectCtx.id,
        name: projectCtx.name,
        slug: projectCtx.slug,
        experienceType: expType
      });
    }
  }

  async function render(host, opts) {
    opts = opts || {};
    rootEl = host;
    var expType = String(opts.experienceType || opts.experience_type || 'quotation').toLowerCase();
    builderExperienceType = expType === 'template' ? 'template' : 'quotation';
    host.classList.add('boxies-builder-embed', 'quotation-builder-host');
    if (builderExperienceType === 'template') {
      host.classList.add('template-builder-host');
    }
    var projectId = (opts.projectId || '').trim();
    var slug = (opts.project || opts.slug || opts.proyecto || '').trim();
    await hydrateIdentity(projectId, slug, builderExperienceType);

    currentStep = typeof QuotationRouter !== 'undefined'
      ? QuotationRouter.readFromUrl()
      : 'config';

    host.innerHTML = shellHtml(currentStep);
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.bind) {
      QuotationSidebar.bind(host.querySelector('#quotationStepsBar'), goToStep);
    }
    activateSharedChrome();
    mountDockActions(host);
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
    if (typeof QuotationEditor !== 'undefined' && QuotationEditor.detachUi) {
      try { QuotationEditor.detachUi(); } catch (eEd) {}
    }
    if (typeof QuotationHero !== 'undefined' && QuotationHero.reset) {
      try { QuotationHero.reset(); } catch (eHero) {}
    }
    if (typeof BuilderDockActions !== 'undefined' && BuilderDockActions.restore) {
      try { BuilderDockActions.restore(); } catch (eDock) {}
    }
    deactivateSharedChrome();
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
    sectionChecks = {};
    projectCtx = {
      id: '', name: '', slug: '', constructora_id: null,
      og_image: '', og_title: '', og_description: '', published: false
    };
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
