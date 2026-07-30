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
        ? QuotationSidebar.renderHtml(stepId, sectionChecks)
        : '';
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
      '<div class="quotation-builder builder-app" id="quotationBuilderRoot" data-quotation-builder' +
        (builderExperienceType === 'template' ? ' data-template-builder' : '') + '>' +
        actions +
        '<aside class="builder-progress-sidebar" id="builderProgressRail" aria-label="' +
          (builderExperienceType === 'template' ? 'Template Builder' : 'Quotation Builder') + '">' +
          sidebar +
        '</aside>' +
        '<div class="builder-workspace quotation-workspace">' +
          '<section class="quotation-panel" id="quotationPanel" data-quotation-panel></section>' +
        '</div>' +
      '</div>';
  }

  function refreshSidebar() {
    if (!rootEl) return;
    var rail = rootEl.querySelector('#builderProgressRail');
    if (!rail) return;
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.setActive) {
      QuotationSidebar.setActive(rail, currentStep, sectionChecks);
      QuotationSidebar.bind(rail, goToStep);
    }
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
      if (typeof QuotationEditor !== 'undefined' && QuotationEditor.commit) {
        try { await QuotationEditor.commit(configAdapter()); } catch (eEditor) {}
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
    if (workspace) {
      workspace.classList.toggle('is-editor', currentStep === 'editor');
      workspace.classList.toggle('is-hero', currentStep === 'hero');
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
    if (typeof BuilderProgressRail === 'undefined') return;
    try {
      if (BuilderProgressRail.openEditorRail) {
        BuilderProgressRail.openEditorRail();
      } else if (BuilderProgressRail.ensureFloatButton) {
        BuilderProgressRail.ensureFloatButton();
        if (BuilderProgressRail.applyCollapsedFromPrefs) {
          BuilderProgressRail.applyCollapsedFromPrefs();
        }
      }
    } catch (eChrome) {}
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
      QuotationSidebar.bind(host.querySelector('#builderProgressRail'), goToStep);
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
    if (typeof QuotationHero !== 'undefined' && QuotationHero.reset) {
      try { QuotationHero.reset(); } catch (eHero) {}
    }
    if (typeof BuilderDockActions !== 'undefined' && BuilderDockActions.restore) {
      try { BuilderDockActions.restore(); } catch (eDock) {}
    }
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
