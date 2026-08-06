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
  var userMenuBound = false;
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
            '<div class="boxies-user-menu" id="boxiesUserMenu">' +
              '<button type="button" class="boxies-user-menu__trigger" id="boxiesUserMenuBtn"' +
                ' aria-haspopup="menu" aria-expanded="false" aria-label="Cuenta">' +
              '</button>' +
              '<div class="boxies-user-menu__panel" id="boxiesUserMenuPanel" role="menu" hidden>' +
                '<button type="button" class="boxies-user-menu__item" role="menuitem"' +
                  ' data-user-menu-action="profile">Perfil</button>' +
                '<button type="button" class="boxies-user-menu__item" role="menuitem"' +
                  ' data-user-menu-action="plan">Plan y uso</button>' +
                '<div class="boxies-user-menu__sep" aria-hidden="true"></div>' +
                '<button type="button" class="boxies-user-menu__item boxies-user-menu__item--exit" role="menuitem"' +
                  ' data-user-menu-action="logout">Cerrar sesión</button>' +
              '</div>' +
            '</div>' +
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
        '<header class="boxies-header" id="boxiesHeader">' +
          '<div class="boxies-header__left" id="boxiesHeaderLeft">' +
            mainMenuHtml() +
            '<div class="boxies-header__builder-steps" id="boxiesHeaderBuilderSteps" hidden></div>' +
          '</div>' +
          brandTitleHtml() +
          '<div class="boxies-header__actions" id="boxiesHeaderActions">' +
            '<div class="boxies-header__tools-wrap" id="builderToolsWrap" hidden>' +
              '<button type="button" class="boxies-header__fs boxies-header__tools-btn" id="builderToolsMenuBtn"' +
                ' aria-label="Herramientas" aria-haspopup="menu" aria-expanded="false"' +
                ' data-tooltip="Herramientas">' +
                iconHtml('square-tool') +
              '</button>' +
              '<div class="boxies-header__tools-panel" id="builderToolsMenuPanel" role="menu" hidden>' +
                '<div class="boxies-header__tools-title">Herramientas</div>' +
                '<div class="boxies-header__tools-list" id="builderToolsMenuList"></div>' +
              '</div>' +
            '</div>' +
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

  function closeUserMenu() {
    var btn = document.getElementById('boxiesUserMenuBtn');
    var panel = document.getElementById('boxiesUserMenuPanel');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function profileAccountUrl() {
    try {
      return new URL('../auth/cuenta.html', window.location.href).pathname;
    } catch (eUrl) {
      return '/auth/cuenta.html';
    }
  }

  function bindUserMenu() {
    var btn = document.getElementById('boxiesUserMenuBtn');
    var panel = document.getElementById('boxiesUserMenuPanel');
    if (!btn || !panel || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = panel.hidden;
      closeMainMenu();
      closeToolsMenu();
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.addEventListener('click', function (e) {
      var item = e.target.closest('[data-user-menu-action]');
      if (!item) return;
      e.preventDefault();
      var action = item.getAttribute('data-user-menu-action');
      closeUserMenu();
      if (action === 'profile') {
        window.location.href = profileAccountUrl();
        return;
      }
      if (action === 'plan') {
        if (onNav) onNav('sistema');
        return;
      }
      if (action === 'logout') {
        btn.disabled = true;
        Promise.resolve(onLogout ? onLogout() : null).finally(function () {
          btn.disabled = false;
        });
      }
    });
    if (!userMenuBound) {
      userMenuBound = true;
      document.addEventListener('click', function (e) {
        var menu = document.getElementById('boxiesUserMenu');
        if (!menu) return;
        if (e.target.closest && e.target.closest('#boxiesUserMenu')) return;
        closeUserMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeUserMenu();
      });
    }
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
      closeUserMenu();
      closeToolsMenu();
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

  function closeToolsMenu() {
    var btn = document.getElementById('builderToolsMenuBtn');
    var panel = document.getElementById('builderToolsMenuPanel');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function syncToolsMenu(items) {
    items = items || [];
    var wrap = document.getElementById('builderToolsWrap');
    var list = document.getElementById('builderToolsMenuList');
    var btn = document.getElementById('builderToolsMenuBtn');
    if (!wrap || !list) return;
    var show = items.length > 0;
    wrap.hidden = !show;
    if (!show) {
      closeToolsMenu();
      list.innerHTML = '';
      if (btn) btn.classList.remove('is-active');
      return;
    }
    var hasVisible = items.some(function (item) { return item.state === 'visible'; });
    if (btn) {
      btn.classList.toggle('is-active', hasVisible);
      btn.setAttribute('aria-pressed', hasVisible ? 'true' : 'false');
    }
    list.innerHTML = items.map(function (item) {
      var mark = item.state === 'visible' ? '\u2713 ' : '';
      return '<button type="button" class="boxies-workspace-menu__item boxies-header__tools-item"' +
        ' role="menuitem" data-qe-restore-tool="' + escapeHtml(item.id) + '">' +
        mark + escapeHtml(item.title) +
      '</button>';
    }).join('');
    list.querySelectorAll('[data-qe-restore-tool]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-qe-restore-tool');
        if (typeof QuotationWindowManager !== 'undefined') {
          if (QuotationWindowManager.focus) QuotationWindowManager.focus(id);
          else if (QuotationWindowManager.restore) QuotationWindowManager.restore(id);
        }
        closeToolsMenu();
      });
    });
  }

  function pulseToolsIcon() {
    var btn = document.getElementById('builderToolsMenuBtn');
    if (!btn) return;
    btn.classList.remove('is-absorbing');
    void btn.offsetWidth;
    btn.classList.add('is-absorbing');
    window.setTimeout(function () {
      btn.classList.remove('is-absorbing');
    }, 340);
  }

  function bindToolsMenu() {
    var btn = document.getElementById('builderToolsMenuBtn');
    var panel = document.getElementById('builderToolsMenuPanel');
    if (!btn || !panel || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = panel.hidden;
      closeMainMenu();
      closeUserMenu();
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (!document.body.dataset.boxiesToolsMenuDismiss) {
      document.body.dataset.boxiesToolsMenuDismiss = '1';
      document.addEventListener('click', function (e) {
        var wrap = document.getElementById('builderToolsWrap');
        if (!wrap || wrap.hidden) return;
        if (e.target.closest && e.target.closest('#builderToolsWrap')) return;
        closeToolsMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeToolsMenu();
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

  var browserContextGuardBound = false;

  /** Zones where the native browser menu (Inspect, etc.) must stay available. */
  function isNativeContextMenuZone(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      '.boxies-header, #boxiesHeader, .boxies-dock, #boxiesDock,' +
      ' [data-qe-viewport-bar], [data-qe-scenes-fold], [data-boxies-devtools-anchor]'
    );
  }

  /** Open app URL in a new tab — DevTools work in a normal browser tab. */
  function openPageForInspect() {
    var url = String(window.location.href || '');
    if (!url) return;
    var opened = null;
    try {
      opened = window.open(url, '_blank', 'noopener,noreferrer');
    } catch (eOpen) { /* ignore */ }
    if (!opened) {
      try {
        var link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (eLink) { /* ignore */ }
    }
  }

  /**
   * Kill the browser/Opera context menu everywhere in BOXIES — except dev zones.
   * Only preventDefault — do not stopPropagation, so BOXIES custom
   * context menus (scenes, library, guides, canvas, …) still open.
   */
  function bindBrowserContextGuard() {
    if (browserContextGuardBound) return;
    browserContextGuardBound = true;
    document.addEventListener('contextmenu', function (e) {
      if (isNativeContextMenuZone(e.target)) return;
      e.preventDefault();
    }, true);
  }

  function bind() {
    bindUserMenu();

    var previewBtn = document.getElementById('boxiesPreviewBtn');
    if (previewBtn && !previewBtn.dataset.bound) {
      previewBtn.dataset.bound = '1';
      previewBtn.addEventListener('click', function () {
        openActivePreview();
      });
    }

    bindMainMenu();
    bindToolsMenu();
    bindFullscreen();
    bindBrowserContextGuard();
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
    closeUserMenu();
    closeToolsMenu();
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
    var btn = document.getElementById('boxiesUserMenuBtn');
    if (!btn) return;
    if (!profile) {
      btn.innerHTML = '';
      btn.removeAttribute('data-tooltip');
      btn.disabled = true;
      return;
    }
    btn.disabled = false;
    var name = profile.nombre || profile.email || 'Admin';
    var roleLabel =
      typeof PlatformRoles !== 'undefined'
        ? PlatformRoles.getRoleLabel(profile)
        : (profile.rol || 'Administrador');
    btn.innerHTML =
      '<span class="boxies-user__avatar" aria-hidden="true">' + iconHtml('user') + '</span>' +
      '<span class="boxies-user__meta">' +
        '<strong class="boxies-user__name">' + escapeHtml(name) + '</strong>' +
        '<span class="boxies-user__sep" aria-hidden="true">·</span>' +
        '<span class="boxies-user__role">' + escapeHtml(roleLabel) + '</span>' +
      '</span>';
    btn.setAttribute('data-tooltip', name + ' · ' + roleLabel);
    btn.setAttribute('aria-label', 'Cuenta · ' + name);
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
    openActivePreview: openActivePreview,
    openPageForInspect: openPageForInspect,
    isNativeContextMenuZone: isNativeContextMenuZone,
    syncToolsMenu: syncToolsMenu,
    closeToolsMenu: closeToolsMenu,
    pulseToolsIcon: pulseToolsIcon
  };
})();
