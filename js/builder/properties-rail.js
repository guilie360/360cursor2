/* Properties rail (right) — V6.0.00 twin of left progress rail */
var BuilderPropertiesRail = (function () {
  var EXPANDED_RAIL_W = '185px';
  var FLOAT_BTN_ID = 'boxiesPropsRailFloatBtn';
  var RAIL_ID = 'builderPropertiesRail';

  function floatMountParent() {
    return document.querySelector('.boxies-host') ||
      document.getElementById('boxiesAppRoot') ||
      document.body;
  }

  function resolveRail(rootEl) {
    if (rootEl && rootEl.querySelector) {
      var found = rootEl.querySelector('#' + RAIL_ID);
      if (found) return found;
    }
    return document.getElementById(RAIL_ID);
  }

  function isCollapsed() {
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getPropsRailCollapsed) {
      return !!BoxiesPrefs.getPropsRailCollapsed();
    }
    return document.body.classList.contains('boxies-props-rail-collapsed');
  }

  function collapseToggleIcon() {
    if (typeof BuilderIcons !== 'undefined' && BuilderIcons.render) {
      return BuilderIcons.render('chevron-right');
    }
    return '\u25B6';
  }

  function syncFloatButton(collapsed) {
    var btn = document.getElementById(FLOAT_BTN_ID);
    if (!btn) return;
    collapsed = !!collapsed;
    btn.setAttribute('data-tooltip', collapsed ? 'Expandir Propiedades' : 'Colapsar Propiedades');
    btn.setAttribute('aria-label', collapsed ? 'Expandir Propiedades' : 'Colapsar Propiedades');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.setAttribute('data-collapsed', collapsed ? '1' : '0');
    btn.innerHTML = collapseToggleIcon();
    btn.style.display = 'inline-flex';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    if (typeof BoxiesTooltip !== 'undefined' && BoxiesTooltip.adopt) {
      try { BoxiesTooltip.adopt(btn); } catch (eTip) {}
    }
  }

  function onFloatToggle(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isActive()) return;
    applyCollapsed(!isCollapsed());
  }

  function ensureFloatButton() {
    if (!isActive()) {
      destroyFloatButton();
      return null;
    }
    var mount = floatMountParent();
    if (!mount) return null;

    var btn = document.getElementById(FLOAT_BTN_ID);
    if (btn && btn.isConnected) {
      if (btn.closest && (
        btn.closest('#' + RAIL_ID) ||
        btn.closest('.builder-properties-sidebar')
      )) {
        mount.appendChild(btn);
      } else if (btn.parentNode !== mount && mount.contains && !mount.contains(btn)) {
        mount.appendChild(btn);
      }
      if (!btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', onFloatToggle);
      }
      return btn;
    }

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = FLOAT_BTN_ID;
    btn.className = 'boxies-props-rail-float-toggle';
    btn.setAttribute('aria-label', 'Colapsar Propiedades');
    btn.setAttribute('data-tooltip', 'Colapsar Propiedades');
    btn.setAttribute('aria-expanded', 'true');
    btn.innerHTML = collapseToggleIcon();
    btn.dataset.bound = '1';
    btn.addEventListener('click', onFloatToggle);
    mount.appendChild(btn);
    return btn;
  }

  function destroyFloatButton() {
    var btn = document.getElementById(FLOAT_BTN_ID);
    if (btn && btn.parentNode) {
      try { btn.parentNode.removeChild(btn); } catch (eRm) {}
    }
  }

  function isActive() {
    return document.body.classList.contains('boxies-props-rail-active');
  }

  function panelHtml() {
    return '<div class="builder-props-rail-panel" data-builder-props-panel>' +
      '<div class="builder-props-rail-title">Propiedades</div>' +
      '<div class="builder-props-rail-scroll">' +
        '<div class="builder-props-rail-body" data-exp-inspector-body>' +
          '<p class="builder-menu-hint">Selecciona un nodo o una conexi\u00F3n.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function ensureStructure(rootEl) {
    var rail = resolveRail(rootEl);
    if (!rail) return null;
    if (!rail.querySelector('[data-builder-props-panel]')) {
      rail.innerHTML = panelHtml();
    }
    return rail;
  }

  function applyCollapsed(collapsed, options) {
    options = options || {};
    collapsed = !!collapsed;
    var body = document.body;
    var root = document.documentElement;
    if (!body || !root || !root.style) return;

    body.classList.toggle('boxies-props-rail-collapsed', collapsed);
    root.classList.toggle('boxies-props-rail-collapsed', collapsed);

    var width = (!isActive() || collapsed) ? '0px' : EXPANDED_RAIL_W;
    root.style.setProperty('--builder-props-rail-width', width);

    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.setPropsRailCollapsed) {
      BoxiesPrefs.setPropsRailCollapsed(collapsed);
    }

    if (options.state && options.state.experiencia && options.state.experiencia.canvas) {
      options.state.experiencia.canvas.inspectorCollapsed = collapsed;
      options.state.experiencia.canvas.inspectorOpen = true;
    }

    if (isActive()) {
      ensureFloatButton();
      syncFloatButton(collapsed);
    } else {
      destroyFloatButton();
    }

    try {
      window.dispatchEvent(new CustomEvent('boxies:props-rail-toggle', {
        detail: { collapsed: collapsed, active: isActive() }
      }));
      window.dispatchEvent(new Event('boxies:rail-toggle'));
    } catch (errRail) {}
  }

  function setActive(on, rootEl, state) {
    on = !!on;
    var body = document.body;
    var root = document.documentElement;
    if (body) body.classList.toggle('boxies-props-rail-active', on);
    if (root) root.classList.toggle('boxies-props-rail-active', on);

    var rail = ensureStructure(rootEl);
    if (rail) {
      rail.hidden = !on;
      rail.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    if (!on) {
      if (root && root.style) root.style.setProperty('--builder-props-rail-width', '0px');
      body.classList.remove('boxies-props-rail-collapsed');
      root.classList.remove('boxies-props-rail-collapsed');
      destroyFloatButton();
      return;
    }

    var collapsed = isCollapsed();
    if (state && state.experiencia && state.experiencia.canvas) {
      /* Prefer persisted prefs; keep canvas flag in sync */
      state.experiencia.canvas.inspectorCollapsed = collapsed;
      state.experiencia.canvas.inspectorOpen = true;
    }
    applyCollapsed(collapsed, { state: state });
  }

  function getInspectorBody(rootEl) {
    var rail = resolveRail(rootEl);
    if (rail) {
      var body = rail.querySelector('[data-exp-inspector-body]');
      if (body) return body;
    }
    return rootEl && rootEl.querySelector
      ? rootEl.querySelector('[data-exp-inspector-body]')
      : null;
  }

  function expand(state) {
    applyCollapsed(false, { state: state });
  }

  function collapse(state) {
    applyCollapsed(true, { state: state });
  }

  return {
    setActive: setActive,
    applyCollapsed: applyCollapsed,
    isCollapsed: isCollapsed,
    isActive: isActive,
    expand: expand,
    collapse: collapse,
    ensureFloatButton: ensureFloatButton,
    destroyFloatButton: destroyFloatButton,
    getInspectorBody: getInspectorBody,
    resolveRail: resolveRail
  };
})();
