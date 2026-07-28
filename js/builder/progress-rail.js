/* Progress rail — V5.9.77 slim Builder flow */
var BuilderProgressRail = (function () {
  /* Elder Futhark markers — visual only; section ids unchanged. */
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
    var applied = structureApplied(state);
    var hasLogo = !!(b.logo && (b.logo.file || b.logo.name || b.logo.uploadedUrl || b.logo.previewUrl));

    function heroLabel() {
      if (typeof MediaEngine !== 'undefined' && MediaEngine.heroMediaLabel) {
        var media = MediaEngine.heroMediaLabel(state);
        if (media) return media;
      }
      if (state.heroVideo || state.heroImage) return state.heroVideo ? 'Video' : 'Imagen';
      return hasLogo ? shortName(b.logo.name) || 'Logo' : null;
    }
    function heroDone() {
      var mediaOk = typeof MediaEngine !== 'undefined' && MediaEngine.hasHeroMedia
        ? MediaEngine.hasHeroMedia(state)
        : !!(state.heroVideo || state.heroImage);
      return mediaOk || hasLogo;
    }
    function typeLabel() {
      if (typeof ProjectTypesEngine !== 'undefined' && ProjectTypesEngine.getTypeLabel) {
        return ProjectTypesEngine.getTypeLabel(state.projectType);
      }
      return state.projectType || null;
    }

    /* V5.9.77 — Config → Estructura → Experiencia → Hero → Media → Menú → Publicado → Info */
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
        label: 'Media',
        value: (function () {
          if (typeof MediaNodesEngine !== 'undefined') {
            MediaNodesEngine.ensureNodeIds(state);
            var nodes = MediaNodesEngine.listCompatibleNodes(state) || [];
            var assetCount = 0;
            if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.listProjectAssets) {
              assetCount = ExperienciaEngine.listProjectAssets(state).filter(function (a) {
                return a && !a.orphan && (a.provider === 'bunny' || a.provider === 'lapentor');
              }).length;
            }
            if (nodes.length || assetCount) {
              return nodes.length + (nodes.length === 1 ? ' nodo' : ' nodos') +
                (assetCount ? (' · ' + assetCount + (assetCount === 1 ? ' asset' : ' assets')) : '');
            }
          }
          var n = (state.bunnyMedia && state.bunnyMedia.items && state.bunnyMedia.items.length) || 0;
          if (n) return n + (n === 1 ? ' archivo CDN' : ' archivos CDN');
          return 'Centro multimedia';
        })(),
        done: isDone(state, 'media', !!(
          (state.bunnyMedia && state.bunnyMedia.items && state.bunnyMedia.items.length) ||
          (state.mediaTours && state.mediaTours.scenes && state.mediaTours.scenes.some(function (s) {
            return s && String(s.url || '').trim();
          })) ||
          (state.projectAssets && state.projectAssets.byId && Object.keys(state.projectAssets.byId).some(function (id) {
            var a = state.projectAssets.byId[id];
            return a && !a.orphan && (a.provider === 'bunny' || a.provider === 'lapentor');
          }))
        )),
        stepIndex: BuilderWizard.getStepIndex('media')
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
        label: 'Publicado',
        value: state.published && state.publishResult
          ? (state.publishResult.project && state.publishResult.project.nombre) || 'Publicado'
          : (state.publishResult && state.publishResult.url ? 'Preview listo' : null),
        done: isDone(state, 'publish', !!state.published),
        stepIndex: BuilderWizard.getStepIndex('publish')
      },
      {
        label: 'Info',
        value: info.nombre || null,
        done: isDone(state, 'info', !!info.nombre),
        stepIndex: BuilderWizard.getStepIndex('info')
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
