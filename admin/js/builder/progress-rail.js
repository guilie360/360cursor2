/* Progress rail — discrete left column checklist */
var BuilderProgressRail = (function () {
  function shortName(name) {
    if (!name) return null;
    var base = String(name).replace(/\.[^.]+$/, '');
    return base.length > 28 ? base.slice(0, 26) + '…' : base;
  }

  function buildItems(state) {
    var b = state.branding || {};
    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var panoCount = (state.panoramas || []).filter(function (p) { return p.file; }).length;
    var acceptedHotspots = (state.hotspotSuggestions || []).filter(function (h) { return h.accepted; }).length;
    var validation = state.validation || ValidationEngine.validate(state);

    return [
      {
        label: 'Tipo',
        value: state.projectType ? ProjectTypesEngine.getTypeLabel(state.projectType) : null,
        done: !!state.projectType,
        stepIndex: BuilderWizard.getStepIndex('project-type')
      },
      {
        label: 'Logo',
        value: b.logo ? shortName(b.logo.name) : null,
        done: !!(b.logo && (b.logo.file || b.logo.name)),
        stepIndex: BuilderWizard.getStepIndex('branding')
      },
      {
        label: 'Tema',
        value: b.selectedProposal ? b.selectedProposal.name : null,
        done: !!b.selectedProposal,
        stepIndex: BuilderWizard.getStepIndex('branding')
      },
      {
        label: 'Hero',
        value: MediaEngine.heroMediaLabel(state),
        done: MediaEngine.hasHeroMedia(state),
        stepIndex: BuilderWizard.getStepIndex('video-hero')
      },
      {
        label: 'Galería',
        value: (state.gallery || []).length ? (state.gallery.length + ' imágenes') : null,
        done: (state.gallery || []).length > 0,
        stepIndex: BuilderWizard.getStepIndex('gallery')
      },
      {
        label: '360°',
        value: panoCount ? (panoCount + ' espacios') : null,
        done: panoCount > 0,
        stepIndex: BuilderWizard.getStepIndex('panoramas')
      },
      {
        label: 'Planos',
        value: (state.plans || []).length ? (state.plans.length + ' archivos') : null,
        done: (state.plans || []).length > 0,
        stepIndex: BuilderWizard.getStepIndex('plans')
      },
      {
        label: 'Docs',
        value: (state.downloads || []).length ? (state.downloads.length + ' docs') : null,
        done: (state.downloads || []).length > 0,
        stepIndex: BuilderWizard.getStepIndex('downloads')
      },
      {
        label: 'Info',
        value: info.nombre || null,
        done: !!info.nombre,
        stepIndex: BuilderWizard.getStepIndex('info')
      },
      {
        label: 'IA',
        value: ai.heroText ? 'Listo' : null,
        done: !!(ai && ai.heroText),
        stepIndex: BuilderWizard.getStepIndex('ai-content')
      },
      {
        label: 'Hotspots',
        value: acceptedHotspots ? (acceptedHotspots + ' aceptados') : null,
        done: acceptedHotspots > 0,
        stepIndex: BuilderWizard.getStepIndex('hotspots')
      },
      {
        label: 'Validación',
        value: validation.ready ? validation.score + '%' : null,
        done: !!validation.ready,
        stepIndex: BuilderWizard.getStepIndex('validation')
      },
      {
        label: 'Publicado',
        value: state.published && state.publishResult ? state.publishResult.project.nombre : null,
        done: !!state.published,
        stepIndex: BuilderWizard.getStepIndex('publish')
      }
    ];
  }

  function renderHtml(state) {
    var items = buildItems(state);
    var current = state.currentStep;
    return items.map(function (item) {
      var cls = 'builder-rail-item' + (item.done ? ' is-done' : '');
      if (item.stepIndex === current) cls += ' is-current';
      var mark = item.done ? '✓' : '○';
      return '<button type="button" class="' + cls + '" data-rail-step="' + item.stepIndex + '">' +
        '<span class="builder-rail-row"><span class="builder-rail-mark">' + mark + '</span>' +
        escapeHtml(item.label) + '</span>' +
        (item.value ? '<span class="builder-rail-value">' + escapeHtml(item.value) + '</span>' : '') +
      '</button>';
    }).join('');
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function update(rootEl, state) {
    var rail = rootEl.querySelector('#builderProgressRail');
    if (!rail) return;
    rail.innerHTML = renderHtml(state);
  }

  function applyLayoutVars() {
    document.documentElement.style.setProperty('--builder-header-height', '44px');
    document.documentElement.style.setProperty('--builder-rail-width', '112px');
  }

  return {
    buildItems: buildItems,
    renderHtml: renderHtml,
    update: update,
    applyLayoutVars: applyLayoutVars
  };
})();
