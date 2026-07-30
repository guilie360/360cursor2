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
  var ICON_RAIL_W = '48px';
  var workspaceMenuBound = false;

  function iconHtml(name) {
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render(name);
    }
    return '○';
  }

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
      '<div class="quotation-builder builder-app quotation-canvas-first" id="quotationBuilderRoot" data-quotation-builder' +
        (builderExperienceType === 'template' ? ' data-template-builder' : '') + '>' +
        actions +
        '<aside class="builder-progress-sidebar quotation-icon-rail" id="builderProgressRail" aria-label="' +
          (builderExperienceType === 'template' ? 'Template Builder' : 'Quotation Builder') + '">' +
          sidebar +
        '</aside>' +
        '<div class="builder-workspace quotation-workspace">' +
          '<section class="quotation-panel" id="quotationPanel" data-quotation-panel></section>' +
        '</div>' +
      '</div>';
  }

  function closeWorkspaceMenu() {
    var btn = document.getElementById('boxiesWorkspaceMenuBtn');
    var panel = document.getElementById('boxiesWorkspaceMenuPanel');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function syncWorkspaceMenu() {
    var panel = document.getElementById('boxiesWorkspaceMenuPanel');
    if (!panel) return;
    panel.querySelectorAll('[data-quotation-step]').forEach(function (btn) {
      var on = btn.getAttribute('data-quotation-step') === currentStep;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function mountWorkspaceMenu() {
    var left = document.getElementById('boxiesHeaderLeft');
    if (!left) return;
    var existing = document.getElementById('boxiesWorkspaceMenu');
    if (existing) existing.remove();

    var steps = typeof QuotationSidebar !== 'undefined' && QuotationSidebar.getSteps
      ? QuotationSidebar.getSteps()
      : [
        { id: 'config', label: 'Config' },
        { id: 'hero', label: 'Hero' },
        { id: 'editor', label: 'Editor' },
        { id: 'preview', label: 'Preview' }
      ];

    var items = steps.map(function (step) {
      return (
        '<button type="button" class="boxies-workspace-menu__item" role="menuitem"' +
          ' data-quotation-step="' + escapeHtml(step.id) + '">' +
          escapeHtml(step.label) +
        '</button>'
      );
    }).join('');

    var wrap = document.createElement('div');
    wrap.id = 'boxiesWorkspaceMenu';
    wrap.className = 'boxies-workspace-menu';
    wrap.innerHTML =
      '<button type="button" class="boxies-workspace-menu__btn" id="boxiesWorkspaceMenuBtn"' +
        ' aria-label="Menú del workspace" aria-haspopup="menu" aria-expanded="false"' +
        ' data-tooltip="Menú">' +
        iconHtml('menu') +
      '</button>' +
      '<div class="boxies-workspace-menu__panel" id="boxiesWorkspaceMenuPanel" role="menu" hidden>' +
        items +
        '<div class="boxies-workspace-menu__sep" role="separator"></div>' +
        '<button type="button" class="boxies-workspace-menu__item boxies-workspace-menu__item--exit"' +
          ' role="menuitem" data-quotation-exit="1">Salir</button>' +
      '</div>';

    left.insertBefore(wrap, left.firstChild);

    var btn = wrap.querySelector('#boxiesWorkspaceMenuBtn');
    var panel = wrap.querySelector('#boxiesWorkspaceMenuPanel');
    if (btn && panel) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = panel.hidden;
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    wrap.querySelectorAll('[data-quotation-step]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        closeWorkspaceMenu();
        goToStep(item.getAttribute('data-quotation-step'));
      });
    });

    var exitBtn = wrap.querySelector('[data-quotation-exit]');
    if (exitBtn) {
      exitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeWorkspaceMenu();
        if (typeof BoxiesRouter !== 'undefined' && BoxiesRouter.navigate) {
          BoxiesRouter.navigate('projects');
        }
      });
    }

    if (!workspaceMenuBound) {
      workspaceMenuBound = true;
      document.addEventListener('click', function (e) {
        var menu = document.getElementById('boxiesWorkspaceMenu');
        if (!menu) return;
        if (e.target.closest && e.target.closest('#boxiesWorkspaceMenu')) return;
        closeWorkspaceMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeWorkspaceMenu();
      });
    }

    syncWorkspaceMenu();
  }

  function unmountWorkspaceMenu() {
    closeWorkspaceMenu();
    var el = document.getElementById('boxiesWorkspaceMenu');
    if (el) el.remove();
  }

  function refreshSidebar() {
    if (!rootEl) return;
    var rail = rootEl.querySelector('#builderProgressRail');
    if (!rail) return;
    if (typeof QuotationSidebar !== 'undefined' && QuotationSidebar.setActive) {
      QuotationSidebar.setActive(rail, currentStep, sectionChecks);
      QuotationSidebar.bind(rail, goToStep);
    }
    syncWorkspaceMenu();
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
    /* V7.2.16 — fixed 48px icon rail; no float collapse chrome. */
    document.body.classList.add('quotation-canvas-first');
    document.documentElement.classList.add('quotation-canvas-first');
    document.body.classList.remove('boxies-rail-collapsed');
    document.documentElement.classList.remove('boxies-rail-collapsed');
    try {
      document.documentElement.style.setProperty('--builder-rail-width', ICON_RAIL_W);
    } catch (eW) {}
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
    mountWorkspaceMenu();
  }

  function deactivateSharedChrome() {
    document.body.classList.remove('quotation-canvas-first');
    document.documentElement.classList.remove('quotation-canvas-first');
    try {
      document.documentElement.style.removeProperty('--builder-rail-width');
    } catch (eW) {}
    unmountWorkspaceMenu();
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
