/* Progress rail — V5.9.79 full left-chrome collapse (CSS-only, DOM preserved) */
var BuilderProgressRail = (function () {
  var EXPANDED_RAIL_W = '176px';

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

  function isRailCollapsed() {
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getRailCollapsed) {
      return !!BoxiesPrefs.getRailCollapsed();
    }
    return document.body.classList.contains('boxies-rail-collapsed');
  }

  function collapseToggleIcon(collapsed) {
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render(collapsed ? 'chevron-right' : 'chevron-left');
    }
    return collapsed ? '▶' : '◀';
  }

  function eventElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  function syncCollapseButton(rail, collapsed) {
    if (!rail || !rail.querySelector) return;
    var btn = rail.querySelector('#builderRailCollapseBtn');
    if (!btn) return;
    btn.setAttribute('data-tooltip', collapsed ? 'Expandir navegación' : 'Colapsar navegación');
    btn.setAttribute('aria-label', collapsed ? 'Expandir navegación' : 'Colapsar navegación');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.innerHTML = collapseToggleIcon(collapsed);
  }

  /**
   * V5.9.79 — Collapse the ENTIRE left chrome (platform nav + builder steps).
   * CSS-only: never remove DOM nodes. Safe to call 100×.
   */
  function applyRailCollapsed(collapsed) {
    collapsed = !!collapsed;
    var body = document.body;
    var root = document.documentElement;
    if (!body || !root || !root.style) return;

    body.classList.toggle('boxies-rail-collapsed', collapsed);
    root.classList.toggle('boxies-rail-collapsed', collapsed);
    /* Keep platform nav in sync — full hide, not icon strip */
    body.classList.toggle('boxies-nav-collapsed', collapsed);
    root.classList.toggle('boxies-nav-collapsed', collapsed);

    root.style.setProperty('--builder-rail-width', collapsed ? '0px' : EXPANDED_RAIL_W);
    if (collapsed) {
      root.style.setProperty('--boxies-sidebar-w', '0px');
      root.style.setProperty('--boxies-sidebar-collapsed-w', '0px');
    } else {
      root.style.removeProperty('--boxies-sidebar-w');
      root.style.removeProperty('--boxies-sidebar-collapsed-w');
    }

    if (typeof BoxiesPrefs !== 'undefined') {
      if (BoxiesPrefs.setRailCollapsed) BoxiesPrefs.setRailCollapsed(collapsed);
      if (BoxiesPrefs.setNavCollapsed) BoxiesPrefs.setNavCollapsed(collapsed);
    }

    if (typeof BoxiesShell !== 'undefined' && typeof BoxiesShell.applyNavCollapsed === 'function') {
      try { BoxiesShell.applyNavCollapsed(collapsed); } catch (eNav) {}
    }
  }

  function applyCollapsedFromPrefs() {
    applyRailCollapsed(isRailCollapsed());
  }

  function renderHtml(state) {
    var items = buildItems(state);
    var current = state.currentStep;
    var collapsed = isRailCollapsed();
    var html =
      '<button type="button" class="builder-rail-collapse" id="builderRailCollapseBtn"' +
        ' data-tooltip="' + (collapsed ? 'Expandir navegación' : 'Colapsar navegación') + '"' +
        ' aria-label="' + (collapsed ? 'Expandir navegación' : 'Colapsar navegación') + '"' +
        ' aria-expanded="' + (collapsed ? 'false' : 'true') + '">' +
        collapseToggleIcon(collapsed) +
      '</button>';

    html += '<div class="builder-rail-list" data-builder-rail-list>';
    html += items.map(function (item) {
      var cls = 'builder-rail-item' + (item.done ? ' is-done' : ' is-pending');
      if (item.stepIndex === current) cls += ' is-current';
      if (item.legacy) cls += ' is-legacy';
      var mark = item.done ? '✓' : '○';
      return '<button type="button" class="' + cls + '" data-rail-step="' + item.stepIndex + '"' +
        ' data-tooltip="' + escapeHtml(item.label) + '"' +
        ' aria-label="' + escapeHtml(item.label) + '">' +
        '<span class="builder-rail-row">' +
          '<span class="builder-rail-mark" aria-hidden="true">' + mark + '</span>' +
          '<span class="builder-rail-text">' +
            '<span class="builder-rail-label">' + escapeHtml(item.label) + '</span>' +
            (item.value
              ? '<span class="builder-rail-value">' + escapeHtml(item.value) + '</span>'
              : '') +
          '</span>' +
        '</span>' +
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
  var _savedListScroll = 0;

  function resolveRail(rootEl) {
    if (rootEl && rootEl.querySelector) {
      var found = rootEl.querySelector('#builderProgressRail');
      if (found) return found;
    }
    return document.getElementById('builderProgressRail');
  }

  function update(rootEl, state) {
    var rail = resolveRail(rootEl);
    if (!rail) return;
    _lastRoot = rootEl || null;
    _lastState = state || null;
    applyCollapsedFromPrefs();

    var listBefore = rail.querySelector ? rail.querySelector('[data-builder-rail-list]') : null;
    if (listBefore) _savedListScroll = listBefore.scrollTop || 0;

    rail.innerHTML = renderHtml(state);

    var listAfter = rail.querySelector ? rail.querySelector('[data-builder-rail-list]') : null;
    if (listAfter) listAfter.scrollTop = _savedListScroll;

    if (!rail.dataset.collapseBound) {
      rail.dataset.collapseBound = '1';
      rail.addEventListener('click', function (e) {
        var el = eventElement(e && e.target);
        if (!el || typeof el.closest !== 'function') return;
        var btn = el.closest('#builderRailCollapseBtn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        var list = rail.querySelector ? rail.querySelector('[data-builder-rail-list]') : null;
        if (list) _savedListScroll = list.scrollTop || 0;

        var next = !isRailCollapsed();
        /* CSS-only toggle — never destroy rail DOM or remount Builder */
        applyRailCollapsed(next);
        syncCollapseButton(rail, next);

        if (list && list.isConnected) list.scrollTop = _savedListScroll;

        try {
          window.dispatchEvent(new CustomEvent('boxies:rail-toggle', {
            detail: { collapsed: !!next }
          }));
        } catch (errRail) {}
      });
    }
  }

  function applyLayoutVars() {
    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty('--builder-header-height', '44px');
    }
    applyCollapsedFromPrefs();
  }

  return {
    buildItems: buildItems,
    renderHtml: renderHtml,
    update: update,
    applyLayoutVars: applyLayoutVars,
    applyCollapsedFromPrefs: applyCollapsedFromPrefs,
    applyRailCollapsed: applyRailCollapsed,
    isDone: isDone,
    isRailCollapsed: isRailCollapsed
  };
})();
