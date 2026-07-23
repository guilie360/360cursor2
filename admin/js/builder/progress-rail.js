/* Progress rail — discrete left column checklist */
var BuilderProgressRail = (function () {
  function shortName(name) {
    if (!name) return null;
    var base = String(name).replace(/\.[^.]+$/, '');
    return base.length > 36 ? base.slice(0, 34) + '…' : base;
  }

  function isDone(state, stepId, autoDone) {
    if (state.sectionChecks && Object.prototype.hasOwnProperty.call(state.sectionChecks, stepId)) {
      return !!state.sectionChecks[stepId];
    }
    return !!autoDone;
  }

  function buildItems(state) {
    var b = state.branding || {};
    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var panoCount = (state.panoramas || []).filter(function (p) { return p.file; }).length;
    var acceptedHotspots = (state.hotspotSuggestions || []).filter(function (h) { return h.accepted; }).length;
    var validation = state.validation;
    if (!validation && typeof ValidationEngine !== 'undefined' && ValidationEngine.validate) {
      validation = ValidationEngine.validate(state);
    }
    validation = validation || { ready: false, score: 0 };

    function heroLabel() {
      if (typeof MediaEngine !== 'undefined' && MediaEngine.heroMediaLabel) {
        return MediaEngine.heroMediaLabel(state);
      }
      return null;
    }
    function heroDone() {
      if (typeof MediaEngine !== 'undefined' && MediaEngine.hasHeroMedia) {
        return MediaEngine.hasHeroMedia(state);
      }
      return !!(state.heroVideo || state.heroImage);
    }
    function typeLabel() {
      if (typeof ProjectTypesEngine !== 'undefined' && ProjectTypesEngine.getTypeLabel) {
        return ProjectTypesEngine.getTypeLabel(state.projectType);
      }
      return state.projectType || null;
    }

    return [
      {
        label: 'Tipo',
        value: state.projectType ? typeLabel() : null,
        done: isDone(state, 'project-type', !!state.projectType),
        stepIndex: BuilderWizard.getStepIndex('project-type')
      },
      {
        label: 'Logo',
        value: b.logo ? shortName(b.logo.name) : null,
        done: isDone(state, 'branding', !!(b.logo && (b.logo.file || b.logo.name || b.logo.uploadedUrl))),
        stepIndex: BuilderWizard.getStepIndex('branding')
      },
      {
        label: 'Hero',
        value: heroLabel(),
        done: isDone(state, 'video-hero', heroDone()),
        stepIndex: BuilderWizard.getStepIndex('video-hero')
      },
      {
        label: 'Menú',
        value: (function () {
          var m = state.menuConfig;
          if (!m || !Array.isArray(m.items) || !m.items.length) return null;
          var n = m.items.filter(function (i) { return i.enabled !== false; }).length;
          return n + ' botones';
        })(),
        done: isDone(state, 'menu', !!(state.menuConfig && Array.isArray(state.menuConfig.items) && state.menuConfig.items.length)),
        stepIndex: BuilderWizard.getStepIndex('menu')
      },
      {
        label: 'Viviendas',
        value: (state.viviendas || []).length ? (state.viviendas.length + ' tarjetas') : null,
        done: isDone(state, 'viviendas', (state.viviendas || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('viviendas')
      },
      {
        label: 'Galería',
        value: (state.gallery || []).length ? (state.gallery.length + ' imágenes') : null,
        done: isDone(state, 'gallery', (state.gallery || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('gallery')
      },
      {
        label: '360°',
        value: panoCount ? (panoCount + ' espacios') : null,
        done: isDone(state, 'panoramas', panoCount > 0),
        stepIndex: BuilderWizard.getStepIndex('panoramas')
      },
      {
        label: 'Interactivo',
        value: (function () {
          var lab = state.interactiveLab;
          if (!lab || !lab.tree) return null;
          var zones = 0;
          function walk(nodes) {
            (nodes || []).forEach(function (n) {
              zones += (n.zones || []).length;
              if (n.children) walk(n.children);
            });
          }
          walk(lab.tree);
          return zones ? (zones + ' zonas') : 'Lab';
        })(),
        done: isDone(state, 'interactivo', !!(state.interactiveLab && state.interactiveLab.tree && state.interactiveLab.tree.length)),
        stepIndex: BuilderWizard.getStepIndex('interactivo')
      },
      {
        label: 'Planos',
        value: (state.plans || []).length ? (state.plans.length + ' archivos') : null,
        done: isDone(state, 'plans', (state.plans || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('plans')
      },
      {
        label: 'Docs',
        value: (state.downloads || []).length ? (state.downloads.length + ' docs') : null,
        done: isDone(state, 'downloads', (state.downloads || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('downloads')
      },
      {
        label: 'Info',
        value: info.nombre || null,
        done: isDone(state, 'info', !!info.nombre),
        stepIndex: BuilderWizard.getStepIndex('info')
      },
      {
        label: 'IA',
        value: ai.heroText ? 'Listo' : null,
        done: isDone(state, 'ai-content', !!(ai && ai.heroText)),
        stepIndex: BuilderWizard.getStepIndex('ai-content')
      },
      {
        label: 'Hotspots',
        value: acceptedHotspots ? (acceptedHotspots + ' aceptados') : null,
        done: isDone(state, 'hotspots', acceptedHotspots > 0),
        stepIndex: BuilderWizard.getStepIndex('hotspots')
      },
      {
        label: 'Validación',
        value: validation.ready ? validation.score + '%' : null,
        done: isDone(state, 'validation', !!validation.ready),
        stepIndex: BuilderWizard.getStepIndex('validation')
      },
      {
        label: 'Publicado',
        value: state.published && state.publishResult ? state.publishResult.project.nombre : null,
        done: isDone(state, 'publish', !!state.published),
        stepIndex: BuilderWizard.getStepIndex('publish')
      }
    ];
  }

  function stepIcon(stepIndex) {
    var step = typeof BuilderWizard !== 'undefined' ? BuilderWizard.getStep(stepIndex) : null;
    var name = step && step.icon ? step.icon : 'circle-check';
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render(name);
    }
    return '○';
  }

  function isRailCollapsed() {
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getRailCollapsed) {
      return !!BoxiesPrefs.getRailCollapsed();
    }
    return document.body.classList.contains('boxies-rail-collapsed');
  }

  function applyRailCollapsed(collapsed) {
    document.body.classList.toggle('boxies-rail-collapsed', !!collapsed);
    document.documentElement.classList.toggle('boxies-rail-collapsed', !!collapsed);
    var width = collapsed ? '52px' : '176px';
    document.documentElement.style.setProperty('--builder-rail-width', width);
  }

  function applyCollapsedFromPrefs() {
    applyRailCollapsed(isRailCollapsed());
  }

  function renderHtml(state) {
    var items = buildItems(state);
    var current = state.currentStep;
    var collapsed = isRailCollapsed();
    var toggleIcon = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
      ? BuilderIcons.render(collapsed ? 'chevron-right' : 'chevron-left')
      : (collapsed ? '›' : '‹');
    var html =
      '<button type="button" class="builder-rail-collapse" id="builderRailCollapseBtn"' +
        ' title="' + (collapsed ? 'Expandir pasos' : 'Colapsar pasos') + '"' +
        ' aria-label="' + (collapsed ? 'Expandir pasos' : 'Colapsar pasos') + '"' +
        ' aria-expanded="' + (collapsed ? 'false' : 'true') + '">' +
        toggleIcon +
      '</button>';

    html += items.map(function (item) {
      var cls = 'builder-rail-item' + (item.done ? ' is-done' : '');
      if (item.stepIndex === current) cls += ' is-current';
      var mark = item.done ? '✓' : '○';
      return '<button type="button" class="' + cls + '" data-rail-step="' + item.stepIndex + '"' +
        ' title="' + escapeHtml(item.label) + '"' +
        ' aria-label="' + escapeHtml(item.label) + '">' +
        '<span class="builder-rail-row">' +
          '<span class="builder-rail-icon" aria-hidden="true">' + stepIcon(item.stepIndex) + '</span>' +
          '<span class="builder-rail-mark" aria-hidden="true">' + mark + '</span>' +
          '<span class="builder-rail-label">' + escapeHtml(item.label) + '</span>' +
        '</span>' +
        (item.value && !collapsed
          ? '<span class="builder-rail-value">' + escapeHtml(item.value) + '</span>'
          : '') +
      '</button>';
    }).join('');
    return html;
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var _lastRoot = null;
  var _lastState = null;

  function update(rootEl, state) {
    var rail = rootEl && rootEl.querySelector
      ? rootEl.querySelector('#builderProgressRail')
      : document.getElementById('builderProgressRail');
    if (!rail) return;
    _lastRoot = rootEl;
    _lastState = state;
    applyCollapsedFromPrefs();
    rail.innerHTML = renderHtml(state);
    if (!rail.dataset.collapseBound) {
      rail.dataset.collapseBound = '1';
      rail.addEventListener('click', function (e) {
        var btn = e.target.closest('#builderRailCollapseBtn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var next = !isRailCollapsed();
        if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.setRailCollapsed) {
          BoxiesPrefs.setRailCollapsed(next);
        }
        applyRailCollapsed(next);
        if (_lastRoot && _lastState) update(_lastRoot, _lastState);
      });
    }
  }

  function applyLayoutVars() {
    document.documentElement.style.setProperty('--builder-header-height', '44px');
    applyCollapsedFromPrefs();
  }

  return {
    buildItems: buildItems,
    renderHtml: renderHtml,
    update: update,
    applyLayoutVars: applyLayoutVars,
    applyCollapsedFromPrefs: applyCollapsedFromPrefs,
    applyRailCollapsed: applyRailCollapsed,
    isDone: isDone
  };
})();
