/* Progress rail — discrete left column checklist */
var BuilderProgressRail = (function () {
  /* Elder Futhark markers — visual only; section ids unchanged.
     Exact sequence for first 15 rail sections (order in buildItems). */
  var SECTION_RUNES = [
    '\u16A0', /* ᚠ */
    '\u16A2', /* ᚢ */
    '\u16A6', /* ᚦ */
    '\u16A8', /* ᚨ */
    '\u16B1', /* ᚱ */
    '\u16B2', /* ᚲ */
    '\u16B7', /* ᚷ */
    '\u16B9', /* ᚹ */
    '\u16BA', /* ᚺ */
    '\u16BE', /* ᚾ */
    '\u16C1', /* ᛁ */
    '\u16C3', /* ᛃ */
    '\u16C7', /* ᛇ */
    '\u16C8', /* ᛈ */
    '\u16C9'  /* ᛉ */
  ];
  /* If rail ever exceeds 15, continue Elder Futhark (not section ids). */
  var SECTION_RUNES_EXTRA = [
    '\u16CA', /* ᛊ */
    '\u16CF', /* ᛏ */
    '\u16D6', /* ᛖ */
    '\u16D7'  /* ᛗ */
  ];

  function shortName(name) {
    if (!name) return null;
    var base = String(name).replace(/\.[^.]+$/, '');
    return base.length > 36 ? base.slice(0, 34) + '…' : base;
  }

  function sectionRune(index) {
    var i = parseInt(index, 10);
    if (isNaN(i) || i < 0) return null;
    if (i < SECTION_RUNES.length) return SECTION_RUNES[i];
    var j = i - SECTION_RUNES.length;
    return SECTION_RUNES_EXTRA[j] || null;
  }

  function isDone(state, stepId, autoDone) {
    if (state.sectionChecks && Object.prototype.hasOwnProperty.call(state.sectionChecks, stepId)) {
      return !!state.sectionChecks[stepId];
    }
    return !!autoDone;
  }

  function structureApplied(state) {
    return !!(state.estructura && state.estructura.appliedAt) ||
      !!(state.architecture && state.architecture.appliedAt);
  }

  function buildItems(state) {
    var b = state.branding || {};
    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var panoCount = (state.panoramas || []).filter(function (p) { return p.file || p.url || p.uploadedUrl; }).length;
    var acceptedHotspots = (state.hotspotSuggestions || []).filter(function (h) { return h.accepted; }).length;
    var hotspotsNeedRef = (state.hotspotSuggestions || []).filter(function (h) {
      return h.accepted && !h.entityRef;
    }).length;
    var validation = state.validation;
    if (!validation && typeof ValidationEngine !== 'undefined' && ValidationEngine.validate) {
      validation = ValidationEngine.validate(state);
    }
    validation = validation || { ready: false, score: 0, pendingCount: 0 };

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

    var applied = structureApplied(state);

    return [
      {
        label: 'Config',
        value: info.nombre || info.slug || null,
        done: isDone(state, 'config', !!(info.nombre && info.slug)),
        stepIndex: BuilderWizard.getStepIndex('config')
      },
      {
        label: 'Estructura',
        value: (function () {
          if (typeof EstructuraEngine !== 'undefined') {
            EstructuraEngine.ensureState(state);
            return EstructuraEngine.summary(state.estructura);
          }
          return state.projectType ? typeLabel() : null;
        })(),
        done: isDone(state, 'estructura', !!(state.estructura && state.estructura.developmentType) || !!state.projectType),
        stepIndex: BuilderWizard.getStepIndex('estructura')
      },
      {
        label: 'Experiencia',
        value: (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.summary)
          ? ExperienciaEngine.summary(state)
          : (applied ? 'Pendiente sync' : 'Pendiente estructura'),
        done: isDone(state, 'experiencia', !!(state.experiencia && state.experiencia.syncedFromApply)),
        stepIndex: BuilderWizard.getStepIndex('experiencia')
      },
      {
        label: 'Hero',
        value: heroLabel(),
        done: isDone(state, 'video-hero', heroDone()),
        stepIndex: BuilderWizard.getStepIndex('video-hero')
      },
      {
        label: 'Logo',
        value: b.logo ? shortName(b.logo.name) : null,
        done: isDone(state, 'branding', !!(b.logo && (b.logo.file || b.logo.name || b.logo.uploadedUrl))),
        stepIndex: BuilderWizard.getStepIndex('branding')
      },
      {
        label: 'Viviendas',
        value: (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.railViviendasLabel)
          ? ArchitectureEngine.railViviendasLabel(state)
          : ((state.viviendas || []).length
            ? ((state.viviendas || []).length + ' tarjetas')
            : (applied ? '0 unidades' : 'Pendiente estructura')),
        done: isDone(state, 'viviendas',
          (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.activeUnitCount
            ? ArchitectureEngine.activeUnitCount(state) > 0
            : (state.viviendas || []).length > 0)),
        stepIndex: BuilderWizard.getStepIndex('viviendas')
      },
      {
        label: 'Galería',
        value: (state.gallery || []).length
          ? ((state.gallery || []).length + ((state.gallery || []).length === 1 ? ' imagen' : ' imágenes'))
          : (applied ? '0 imágenes' : 'Pendiente estructura'),
        done: isDone(state, 'gallery', (state.gallery || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('gallery')
      },
      {
        label: '360°',
        value: panoCount
          ? (panoCount + (panoCount === 1 ? ' tour' : ' tours'))
          : (applied ? '0 tours' : 'Pendiente estructura'),
        done: isDone(state, 'panoramas', panoCount > 0),
        stepIndex: BuilderWizard.getStepIndex('panoramas')
      },
      {
        label: 'Planos',
        value: (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.plansProgress)
          ? ArchitectureEngine.plansProgress(state)
          : ((state.plans || []).length ? ((state.plans || []).length + ' archivos') : (applied ? '0 / 0' : 'Pendiente')),
        done: isDone(state, 'plans', (state.plans || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('plans')
      },
      {
        label: 'Docs',
        value: (state.downloads || []).length
          ? ((state.downloads || []).length + ((state.downloads || []).length === 1 ? ' doc' : ' docs'))
          : (applied ? '0 docs' : 'Pendiente estructura'),
        done: isDone(state, 'downloads', (state.downloads || []).length > 0),
        stepIndex: BuilderWizard.getStepIndex('downloads')
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
        label: 'Hotspots',
        value: hotspotsNeedRef
          ? (hotspotsNeedRef + ' pendientes')
          : (acceptedHotspots ? (acceptedHotspots + ' aceptados') : (applied ? 'Pendientes' : null)),
        done: isDone(state, 'hotspots', acceptedHotspots > 0 && hotspotsNeedRef === 0),
        stepIndex: BuilderWizard.getStepIndex('hotspots')
      },
      {
        label: 'Validación',
        value: validation.ready
          ? (validation.score + '%')
          : ((validation.pendingCount != null && validation.pendingCount > 0)
            ? (validation.pendingCount + ' pendientes')
            : null),
        done: isDone(state, 'validation', !!validation.ready),
        stepIndex: BuilderWizard.getStepIndex('validation')
      },
      {
        label: 'Publicado',
        value: state.published && state.publishResult
          ? (state.publishResult.project && state.publishResult.project.nombre) || 'Publicado'
          : (state.publishResult && state.publishResult.url ? 'Preview listo' : null),
        done: isDone(state, 'publish', !!state.published),
        stepIndex: BuilderWizard.getStepIndex('publish')
      },
      /* Recoverable legacy */
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
        stepIndex: BuilderWizard.getStepIndex('interactivo'),
        legacy: true
      },
      {
        label: 'Info',
        value: info.nombre || null,
        done: isDone(state, 'info', !!info.nombre),
        stepIndex: BuilderWizard.getStepIndex('info'),
        legacy: true
      },
      {
        label: 'IA',
        value: ai.heroText ? 'Listo' : null,
        done: isDone(state, 'ai-content', !!(ai && ai.heroText)),
        stepIndex: BuilderWizard.getStepIndex('ai-content'),
        legacy: true
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

  function runeGlyphHtml(index) {
    var rune = sectionRune(index);
    if (rune) {
      return '<span class="builder-rail-rune" aria-hidden="true">' + rune + '</span>';
    }
    return stepIcon(index);
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
        ' data-tooltip="' + (collapsed ? 'Expandir pasos' : 'Colapsar pasos') + '"' +
        ' aria-label="' + (collapsed ? 'Expandir pasos' : 'Colapsar pasos') + '"' +
        ' aria-expanded="' + (collapsed ? 'false' : 'true') + '">' +
        toggleIcon +
      '</button>';

    html += '<div class="builder-rail-list" data-builder-rail-list>';
    html += items.map(function (item, index) {
      var cls = 'builder-rail-item' + (item.done ? ' is-done' : '');
      if (item.stepIndex === current) cls += ' is-current';
      if (item.legacy) cls += ' is-legacy';
      var mark = item.done ? '✓' : '○';
      return '<button type="button" class="' + cls + '" data-rail-step="' + item.stepIndex + '"' +
        ' data-tooltip="' + escapeHtml(item.label) + '"' +
        ' aria-label="' + escapeHtml(item.label) + '">' +
        '<span class="builder-rail-row">' +
          '<span class="builder-rail-icon" aria-hidden="true">' + runeGlyphHtml(index) + '</span>' +
          '<span class="builder-rail-mark" aria-hidden="true">' + mark + '</span>' +
          '<span class="builder-rail-label">' + escapeHtml(item.label) + '</span>' +
        '</span>' +
        (item.value && !collapsed
          ? '<span class="builder-rail-value">' + escapeHtml(item.value) + '</span>'
          : '') +
      '</button>';
    }).join('');
    html += '</div>';
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
        try {
          window.dispatchEvent(new CustomEvent('boxies:rail-toggle', {
            detail: { collapsed: !!next }
          }));
        } catch (errRail) {}
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
