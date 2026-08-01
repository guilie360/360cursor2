/**
 * BOXIES App Shell — immutable chrome.
 * Pages never build header/workspace/dock; they only fill #boxiesContent.
 * V7.2.18 — no left sidebar; ☰ is the only main nav;
 * Footer = user (left) · create (center) · module actions (right).
 */
var BoxiesShell = (function () {
  var mounted = false;
  var rootEl = null;
  var onNav = null;
  var onLogout = null;
  var fullscreenBound = false;
  var menuBound = false;
  var defaultActionsHtml = '';
  var projectCtx = { id: '', name: '', slug: '', experienceType: '' };

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function iconHtml(name) {
    if (typeof BuilderIcons !== 'undefined' && typeof BuilderIcons.render === 'function') {
      return BuilderIcons.render(name);
    }
    return '○';
  }

  function setChromeClasses(on) {
    document.body.classList.toggle('boxies-shell', !!on);
    document.body.classList.toggle('boxies-has-dock', !!on);
    document.documentElement.classList.toggle('boxies-has-dock', !!on);
  }

  function brandTitleHtml() {
    return '<span class="boxies-header__title" id="boxiesHeaderTitle" aria-label="BOXIES">B O X I E S</span>';
  }

  function dockHtml() {
    return (
      '<footer class="boxies-dock" id="boxiesDock" role="contentinfo" aria-label="Pie de BOXIES">' +
        '<div class="boxies-dock__inner">' +
          '<div class="boxies-dock__user" id="boxiesDockUser">' +
            '<div class="boxies-user" id="boxiesUserChip"></div>' +
            '<button type="button" class="boxies-dock__logout" id="boxiesLogoutBtn"' +
              ' aria-label="Salir" data-tooltip="Salir">' +
              '<span class="boxies-dock__logout-icon" aria-hidden="true">' + iconHtml('log-out') + '</span>' +
              '<span class="boxies-dock__logout-label">Salir</span>' +
            '</button>' +
          '</div>' +
          '<div class="boxies-dock__project" id="boxiesDockProject" hidden>' +
            '<strong class="boxies-dock__project-name" id="boxiesDockProjectName"></strong>' +
          '</div>' +
          '<div class="boxies-dock__center is-empty" id="boxiesDockCenter" aria-hidden="true"></div>' +
          '<div class="boxies-dock__actions is-empty" id="boxiesDockActions" aria-hidden="true">' +
            '<button type="button" class="boxies-btn-secondary boxies-btn-secondary--icon boxies-dock__preview"' +
              ' id="boxiesPreviewBtn" aria-label="Visualizar" data-tooltip="Visualizar" disabled hidden>' +
              iconHtml('eye') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function mainMenuHtml() {
    return (
      '<div class="boxies-workspace-menu" id="boxiesWorkspaceMenu">' +
        '<button type="button" class="boxies-workspace-menu__btn" id="boxiesWorkspaceMenuBtn"' +
          ' aria-label="Menú principal" aria-haspopup="menu" aria-expanded="false"' +
          ' data-tooltip="Menú">' +
          iconHtml('menu') +
        '</button>' +
        '<div class="boxies-workspace-menu__panel" id="boxiesWorkspaceMenuPanel" role="menu" hidden>' +
          '<button type="button" class="boxies-workspace-menu__item" role="menuitem" data-boxies-page="hall">' +
            'Hall</button>' +
          '<button type="button" class="boxies-workspace-menu__item" role="menuitem" data-boxies-page="projects">' +
            'Proyectos</button>' +
          '<button type="button" class="boxies-workspace-menu__item" role="menuitem" data-boxies-page="builder">' +
            'Builder</button>' +
        '</div>' +
      '</div>'
    );
  }

  function shellHtml() {
    defaultActionsHtml = '';
    return (
      '<div class="boxies-app" id="boxiesAppRoot">' +
        '<header class="boxies-header">' +
          '<div class="boxies-header__left" id="boxiesHeaderLeft">' +
            mainMenuHtml() +
            '<div class="boxies-header__builder-steps" id="boxiesHeaderBuilderSteps" hidden></div>' +
          '</div>' +
          brandTitleHtml() +
          '<div class="boxies-header__actions" id="boxiesHeaderActions">' +
            '<button type="button" class="boxies-header__fs boxies-header__chrome-fold" id="builderChromeFoldBtn" hidden aria-label="Ocultar paneles" data-tooltip="Ocultar paneles" aria-pressed="false">' +
              iconHtml('panels-top-left') +
            '</button>' +
            '<button type="button" class="boxies-header__fs" id="builderFullscreenBtn" aria-label="Pantalla completa" data-tooltip="Pantalla completa" data-fullscreen="enter">' +
              iconHtml('maximize') +
            '</button>' +
          '</div>' +
        '</header>' +
        '<div class="boxies-workspace">' +
          '<section class="boxies-workspace__panel">' +
            '<div id="boxiesContent"></div>' +
          '</section>' +
        '</div>' +
      '</div>' +
      dockHtml()
    );
  }

  function closeMainMenu() {
    var btn = document.getElementById('boxiesWorkspaceMenuBtn');
    var panel = document.getElementById('boxiesWorkspaceMenuPanel');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function syncMainMenu(pageId) {
    var panel = document.getElementById('boxiesWorkspaceMenuPanel');
    if (!panel) return;
    panel.querySelectorAll('[data-boxies-page]').forEach(function (btn) {
      btn.classList.toggle('is-current', btn.getAttribute('data-boxies-page') === pageId);
    });
  }

  function bindMainMenu() {
    var btn = document.getElementById('boxiesWorkspaceMenuBtn');
    var panel = document.getElementById('boxiesWorkspaceMenuPanel');
    if (!btn || !panel || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('[data-boxies-page]');
      if (!item) return;
      e.preventDefault();
      closeMainMenu();
      var id = item.getAttribute('data-boxies-page');
      if (id && onNav) onNav(id);
    });
    if (!menuBound) {
      menuBound = true;
      document.addEventListener('click', function (e) {
        var menu = document.getElementById('boxiesWorkspaceMenu');
        if (!menu) return;
        if (e.target.closest && e.target.closest('#boxiesWorkspaceMenu')) return;
        closeMainMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMainMenu();
      });
    }
  }

  function bindChromeFold() {
    var btn = document.getElementById('builderChromeFoldBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof QuotationBuilderView !== 'undefined' &&
          typeof QuotationBuilderView.toggleChromeCollapsed === 'function') {
        QuotationBuilderView.toggleChromeCollapsed();
      }
    });
  }

  function bindFullscreen() {
    if (fullscreenBound) return;
    var root = document.getElementById('boxiesAppRoot') || document.getElementById('boxiesHeaderActions');
    if (!root) return;
    bindChromeFold();
    if (typeof BuilderDock !== 'undefined' && typeof BuilderDock.bindFullscreen === 'function') {
      BuilderDock.bindFullscreen(root);
      fullscreenBound = true;
      return;
    }
    var btn = root.querySelector('#builderFullscreenBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    function syncIcon() {
      var isFs = !!document.fullscreenElement;
      btn.setAttribute('data-fullscreen', isFs ? 'exit' : 'enter');
      btn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.title = isFs ? 'Salir de pantalla completa' : 'Pantalla completa';
      btn.innerHTML = iconHtml(isFs ? 'minimize' : 'maximize');
    }
    btn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
    document.addEventListener('fullscreenchange', syncIcon);
    syncIcon();
    fullscreenBound = true;
  }

  function resolveShowroomPreviewUrl(slug) {
    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.showroomUrl) {
      return PlatformBuilderBridge.showroomUrl(slug);
    }
    if (slug) {
      try {
        return new URL('/' + encodeURIComponent(slug), window.location.origin).href;
      } catch (e) {}
    }
    return window.location.origin + '/';
  }

  function resolveQuotationPreviewUrl(projectIdOrOpts) {
    var slug = null;
    var id = null;
    if (projectIdOrOpts && typeof projectIdOrOpts === 'object') {
      slug = projectIdOrOpts.slug || null;
      id = projectIdOrOpts.projectId || projectIdOrOpts.id || null;
    } else {
      id = projectIdOrOpts;
      slug = projectCtx && projectCtx.slug;
    }
    if (!slug && projectCtx && String(projectCtx.id) === String(id)) {
      slug = projectCtx.slug;
    }
    if (!slug) return null;
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
      return ShowroomPublicUrl.href(slug);
    }
    try {
      return new URL('/' + encodeURIComponent(slug), window.location.origin).href;
    } catch (e) {
      return window.location.origin + '/' + encodeURIComponent(slug);
    }
  }

  function resolvePreviewUrl(slugOrOpts) {
    if (slugOrOpts && typeof slugOrOpts === 'object') {
      var type = String(slugOrOpts.experienceType || slugOrOpts.experience_type || '').toLowerCase();
      if (type === 'quotation') {
        return resolveQuotationPreviewUrl(slugOrOpts);
      }
      return resolveShowroomPreviewUrl(slugOrOpts.slug);
    }
    return resolveShowroomPreviewUrl(slugOrOpts);
  }

  function resolveActiveProjectSlug() {
    var slug = projectCtx && projectCtx.slug ? String(projectCtx.slug).trim() : '';
    try {
      if (typeof QuotationBuilderView !== 'undefined') {
        if (QuotationBuilderView.getProjectIdentity) {
          var idn = QuotationBuilderView.getProjectIdentity();
          if (idn && idn.slug) slug = String(idn.slug).trim();
        } else if (QuotationBuilderView.getProjectLabel && !slug) {
          /* no-op — label is display name, not slug */
        }
      }
    } catch (eId) { /* ignore */ }
    if (!slug) {
      try {
        var params = new URLSearchParams(window.location.search || '');
        slug = String(
          params.get('project') ||
          params.get('proyecto') ||
          params.get('slug') ||
          ''
        ).trim();
      } catch (eUrl) { /* ignore */ }
    }
    return slug;
  }

  function openActivePreview() {
    var type = String(projectCtx.experienceType || '').toLowerCase();
    if (type === 'quotation') {
      /*
       * Always open the public client URL /{slug} (e.g. /editor) — same link as Config.
       * Never open /quotation/?projectId=… (internal Runtime URL).
       */
      var slug = resolveActiveProjectSlug();
      if (!slug) return;
      projectCtx.slug = slug;
      var qUrl = resolveQuotationPreviewUrl({
        id: projectCtx.id,
        slug: slug
      });
      if (!qUrl) return;
      window.open(qUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    var showroomSlug = resolveActiveProjectSlug();
    if (!showroomSlug) return;
    window.open(resolveShowroomPreviewUrl(showroomSlug), '_blank', 'noopener,noreferrer');
  }

  function syncActionsVisibility() {
    var actions = document.getElementById('boxiesDockActions');
    if (!actions) return;
    var previewBtn = document.getElementById('boxiesPreviewBtn');
    var hasModuleActions = !!actions.querySelector(
      '[data-boxies-page-action], .builder-header-action-btn'
    );
    var hasProject = !!(projectCtx && (projectCtx.id || projectCtx.slug || projectCtx.name));
    if (previewBtn) {
      previewBtn.disabled = !projectCtx.slug;
      previewBtn.hidden = !hasProject;
    }
    /* Keep grid cell so center create stays centered. */
    var show = hasModuleActions || hasProject;
    actions.hidden = false;
    actions.classList.toggle('is-empty', !show);
    actions.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function bind() {
    var logoutBtn = document.getElementById('boxiesLogoutBtn');
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', async function () {
        logoutBtn.disabled = true;
        try {
          if (onLogout) await onLogout();
        } finally {
          logoutBtn.disabled = false;
        }
      });
    }

    var previewBtn = document.getElementById('boxiesPreviewBtn');
    if (previewBtn && !previewBtn.dataset.bound) {
      previewBtn.dataset.bound = '1';
      previewBtn.addEventListener('click', function () {
        openActivePreview();
      });
    }

    bindMainMenu();
    bindFullscreen();
  }

  function mount(root, handlers) {
    if (mounted) return getContentEl();
    rootEl = root;
    handlers = handlers || {};
    onNav = handlers.onNav || null;
    onLogout = handlers.onLogout || null;
    root.innerHTML = shellHtml();
    root.hidden = false;
    setChromeClasses(true);
    mounted = true;
    bind();
    if (typeof BoxiesTooltip !== 'undefined' && typeof BoxiesTooltip.init === 'function') {
      BoxiesTooltip.init();
    }
    return getContentEl();
  }

  function unmount() {
    if (typeof BoxiesTooltip !== 'undefined' && typeof BoxiesTooltip.hide === 'function') {
      BoxiesTooltip.hide();
    }
    clearPageActions();
    clearProjectContext();
    closeMainMenu();
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.destroyFloatButton) {
      try { BuilderProgressRail.destroyFloatButton(); } catch (eFloat) {}
    }
    if (document.fullscreenElement) {
      /* V7.2.20 — only leave FS when abandoning the BOXIES shell (logout / leave app).
         In-shell navigation must never reach here; page unmounts keep the shell mounted. */
      document.exitFullscreen().catch(function () {});
    }
    if (rootEl) {
      rootEl.innerHTML = '';
      rootEl.hidden = true;
    }
    setChromeClasses(false);
    document.body.classList.remove('boxies-rail-collapsed');
    document.documentElement.classList.remove('boxies-rail-collapsed');
    mounted = false;
    rootEl = null;
    onNav = null;
    onLogout = null;
    fullscreenBound = false;
  }

  function getContentEl() {
    return document.getElementById('boxiesContent');
  }

  function getDockEl() {
    return document.getElementById('boxiesDock');
  }

  function setActiveNav(pageId) {
    syncMainMenu(pageId);
  }

  function setUser(profile) {
    var chip = document.getElementById('boxiesUserChip');
    if (!chip) return;
    if (!profile) {
      chip.innerHTML = '';
      chip.removeAttribute('data-tooltip');
      return;
    }
    var name = profile.nombre || profile.email || 'Admin';
    var roleLabel =
      typeof PlatformRoles !== 'undefined'
        ? PlatformRoles.getRoleLabel(profile)
        : (profile.rol || 'Administrador');
    chip.innerHTML =
      '<span class="boxies-user__avatar" aria-hidden="true">' + iconHtml('user') + '</span>' +
      '<span class="boxies-user__meta">' +
        '<strong class="boxies-user__name">' + escapeHtml(name) + '</strong>' +
        '<span class="boxies-user__sep" aria-hidden="true">·</span>' +
        '<span class="boxies-user__role">' + escapeHtml(roleLabel) + '</span>' +
      '</span>';
    chip.setAttribute('data-tooltip', name + ' · ' + roleLabel);
  }

  function syncDockProjectLabel() {
    var wrap = document.getElementById('boxiesDockProject');
    var nameEl = document.getElementById('boxiesDockProjectName');
    var center = document.getElementById('boxiesDockCenter');
    if (!wrap || !nameEl) return;

    var hasProject = !!(projectCtx.slug || projectCtx.name || projectCtx.id);
    var label = projectCtx.name || projectCtx.slug ||
      (projectCtx.experienceType === 'quotation' ? 'Cotización' : 'Showroom');
    /* Hide when footer center hosts a page CTA (e.g. + Nuevo Showroom). */
    var hasLeading = !!(center && !center.classList.contains('is-empty') &&
      center.querySelector('[data-boxies-page-leading], .boxies-btn-secondary--create'));

    if (!hasProject || hasLeading) {
      wrap.hidden = true;
      if (!hasProject) nameEl.textContent = '';
      return;
    }
    nameEl.textContent = label;
    wrap.hidden = false;
  }

  function setProjectContext(ctx) {
    ctx = ctx || {};
    var expType = String(ctx.experienceType || ctx.experience_type || '').trim().toLowerCase();
    if (!expType && (ctx.id || ctx.projectId || ctx.name || ctx.nombre || ctx.slug)) {
      expType = projectCtx.experienceType || '';
    }
    projectCtx = {
      id: (ctx.id || ctx.projectId || '').trim(),
      name: (ctx.name || ctx.nombre || '').trim(),
      slug: (ctx.slug || ctx.project || ctx.proyecto || '').trim(),
      experienceType: expType
    };

    var previewBtn = document.getElementById('boxiesPreviewBtn');
    var hasProject = !!(projectCtx.slug || projectCtx.name || projectCtx.id);

    syncDockProjectLabel();

    if (previewBtn) {
      previewBtn.disabled = !projectCtx.slug;
      previewBtn.hidden = !hasProject;
    }
    syncActionsVisibility();
  }

  function clearProjectContext() {
    setProjectContext({});
  }

  function injectDockNodes(container, html, attrName, beforeEl) {
    if (!container || !html) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) {
      var node = wrap.firstChild;
      wrap.removeChild(node);
      if (node.nodeType === 1 && attrName) {
        node.setAttribute(attrName, '1');
      }
      if (beforeEl) container.insertBefore(node, beforeEl);
      else container.appendChild(node);
    }
  }

  /**
   * Manifest:
   *   leadingHtml → Footer center (e.g. + Nuevo Showroom)
   *   actionsHtml → Footer right (module actions), before Visualizar
   */
  function applyManifest(manifest) {
    manifest = manifest || {};
    var center = document.getElementById('boxiesDockCenter');
    var actions = document.getElementById('boxiesDockActions');
    var previewBtn = document.getElementById('boxiesPreviewBtn');

    if (center) {
      center.querySelectorAll('[data-boxies-page-leading]').forEach(function (el) {
        el.remove();
      });
      /* Legacy: also clear unmarked create btn leftovers */
      while (center.firstChild) center.removeChild(center.firstChild);
      if (manifest.leadingHtml) {
        injectDockNodes(center, manifest.leadingHtml, 'data-boxies-page-leading', null);
        center.classList.remove('is-empty');
        center.removeAttribute('aria-hidden');
      } else {
        center.classList.add('is-empty');
        center.setAttribute('aria-hidden', 'true');
      }
    }

    if (!actions) {
      syncDockProjectLabel();
      return;
    }

    actions.querySelectorAll('[data-boxies-page-action]').forEach(function (el) {
      el.remove();
    });

    if (manifest.actionsHtml) {
      var beforeEl = (previewBtn && previewBtn.parentNode === actions) ? previewBtn : null;
      injectDockNodes(actions, manifest.actionsHtml, 'data-boxies-page-action', beforeEl);
    }

    syncActionsVisibility();
    syncDockProjectLabel();
  }

  function clearPageActions() {
    applyManifest({});
  }

  function isMounted() {
    return mounted;
  }

  return {
    mount: mount,
    unmount: unmount,
    getContentEl: getContentEl,
    getDockEl: getDockEl,
    setActiveNav: setActiveNav,
    setUser: setUser,
    setProjectContext: setProjectContext,
    clearProjectContext: clearProjectContext,
    applyManifest: applyManifest,
    clearPageActions: clearPageActions,
    isMounted: isMounted,
    setChromeClasses: setChromeClasses,
    resolvePreviewUrl: resolvePreviewUrl,
    resolveShowroomPreviewUrl: resolveShowroomPreviewUrl,
    resolveQuotationPreviewUrl: resolveQuotationPreviewUrl,
    openActivePreview: openActivePreview
  };
})();
