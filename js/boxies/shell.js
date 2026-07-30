/**
 * BOXIES App Shell — immutable chrome.
 * Pages never build header/sidebar/workspace/dock; they only fill #boxiesContent.
 * V7.2.17 — single left rail (Hall / Proyectos / Builder / Visualizar);
 * header = ☰ menu + project name; user account lives at rail foot.
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
      '<footer class="boxies-dock" id="boxiesDock" role="toolbar" aria-label="Acciones">' +
        '<div class="boxies-dock__inner">' +
          '<div class="boxies-dock__leading" id="boxiesDockLeading" hidden></div>' +
          '<div class="boxies-dock__spacer"></div>' +
          '<div class="boxies-dock__actions" id="boxiesDockActions" hidden></div>' +
        '</div>' +
      '</footer>'
    );
  }

  function defaultNavHtml(activeId) {
    function item(id, label, icon) {
      return (
        '<button type="button" class="boxies-nav-item' + (activeId === id ? ' is-current' : '') + '"' +
          ' data-boxies-page="' + escapeHtml(id) + '"' +
          ' aria-label="' + escapeHtml(label) + '"' +
          ' data-tooltip="' + escapeHtml(label) + '"' +
        '>' +
          '<span class="boxies-nav-item__row">' +
            '<span class="boxies-nav-item__icon" aria-hidden="true">' + iconHtml(icon) + '</span>' +
          '</span>' +
        '</button>'
      );
    }
    return (
      '<nav class="boxies-nav" id="boxiesNav" aria-label="Navegación">' +
        item('hall', 'Hall', 'home') +
        item('projects', 'Proyectos', 'folder') +
        item('builder', 'Builder', 'panel') +
      '</nav>'
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
            '<div class="boxies-header__project" id="boxiesHeaderProject" hidden>' +
              '<strong class="boxies-header__project-name" id="boxiesHeaderProjectName"></strong>' +
            '</div>' +
          '</div>' +
          brandTitleHtml() +
          '<div class="boxies-header__actions" id="boxiesHeaderActions">' +
            '<button type="button" class="boxies-header__fs" id="builderFullscreenBtn" aria-label="Pantalla completa" data-tooltip="Pantalla completa" data-fullscreen="enter">' +
              iconHtml('maximize') +
            '</button>' +
          '</div>' +
        '</header>' +
        '<aside class="boxies-sidebar" id="boxiesSidebar" aria-label="Navegación">' +
          defaultNavHtml('hall') +
          '<div class="boxies-sidebar__tools">' +
            '<button type="button" class="boxies-nav-item boxies-sidebar__preview" id="boxiesPreviewBtn"' +
              ' aria-label="Visualizar" data-tooltip="Visualizar" disabled>' +
              '<span class="boxies-nav-item__row">' +
                '<span class="boxies-nav-item__icon" aria-hidden="true">' + iconHtml('eye') + '</span>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="boxies-sidebar__spacer" aria-hidden="true"></div>' +
          '<div class="boxies-sidebar__foot">' +
            '<div class="boxies-sidebar__user-card">' +
              '<div class="boxies-user" id="boxiesUserChip"></div>' +
              '<button type="button" class="boxies-sidebar__logout" id="boxiesLogoutBtn"' +
                ' aria-label="Salir" data-tooltip="Salir">' +
                '<span class="boxies-sidebar__logout-icon" aria-hidden="true">' + iconHtml('log-out') + '</span>' +
                '<span class="boxies-sidebar__logout-label">Salir</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</aside>' +
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

  function bindFullscreen() {
    if (fullscreenBound) return;
    var root = document.getElementById('boxiesAppRoot') || document.getElementById('boxiesHeaderActions');
    if (!root) return;
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

  /** Quotation public URL — same address a client visits (/{slug}). */
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

  function openActivePreview() {
    var type = String(projectCtx.experienceType || '').toLowerCase();
    if (type === 'quotation') {
      var qUrl = resolveQuotationPreviewUrl({
        id: projectCtx.id,
        slug: projectCtx.slug
      });
      if (!qUrl) return;
      window.open(qUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    var slug = projectCtx.slug;
    if (!slug) {
      try {
        slug = new URLSearchParams(window.location.search || '').get('project')
          || new URLSearchParams(window.location.search || '').get('proyecto');
      } catch (e) {}
    }
    if (!slug) return;
    window.open(resolveShowroomPreviewUrl(slug), '_blank', 'noopener,noreferrer');
  }

  function bind() {
    var nav = document.getElementById('boxiesNav');
    if (nav && !nav.dataset.bound) {
      nav.dataset.bound = '1';
      nav.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-boxies-page]');
        if (!btn || btn.disabled) return;
        var id = btn.getAttribute('data-boxies-page');
        if (onNav) onNav(id);
      });
    }

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
    var nav = document.getElementById('boxiesNav');
    if (!nav) return;
    nav.querySelectorAll('[data-boxies-page]').forEach(function (btn) {
      btn.classList.toggle('is-current', btn.getAttribute('data-boxies-page') === pageId);
    });
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
        '<span class="boxies-user__role">' + escapeHtml(roleLabel) + '</span>' +
      '</span>';
    chip.setAttribute('data-tooltip', name + ' · ' + roleLabel);
  }

  /**
   * Project identity in header (Builder). Visualizar enabled when slug exists.
   */
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

    var headerWrap = document.getElementById('boxiesHeaderProject');
    var headerName = document.getElementById('boxiesHeaderProjectName');
    var actions = document.getElementById('boxiesDockActions');
    var previewBtn = document.getElementById('boxiesPreviewBtn');

    var hasProject = !!(projectCtx.slug || projectCtx.name || projectCtx.id);
    var label = projectCtx.name || projectCtx.slug ||
      (projectCtx.experienceType === 'quotation' ? 'Cotización' : 'Showroom');

    if (headerWrap && headerName) {
      if (!hasProject) {
        headerWrap.hidden = true;
        headerName.textContent = '';
      } else {
        headerName.textContent = label;
        headerWrap.hidden = false;
      }
    }

    if (actions) {
      /* Actions visibility still driven by applyManifest / builder mount;
         keep enabled whenever a project context exists and actions were injected. */
      if (!hasProject && !actions.querySelector('[data-boxies-page-action], .builder-header-action-btn')) {
        actions.hidden = true;
      }
    }

    if (previewBtn) {
      previewBtn.disabled = !projectCtx.slug;
    }
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

  function applyManifest(manifest) {
    manifest = manifest || {};
    var leading = document.getElementById('boxiesDockLeading');
    var actions = document.getElementById('boxiesDockActions');

    if (leading) {
      leading.querySelectorAll('[data-boxies-page-leading]').forEach(function (el) {
        el.remove();
      });
      if (manifest.leadingHtml) {
        injectDockNodes(leading, manifest.leadingHtml, 'data-boxies-page-leading', null);
        leading.hidden = false;
      } else {
        leading.hidden = true;
      }
    }

    if (!actions) return;

    actions.querySelectorAll('[data-boxies-page-action]').forEach(function (el) {
      el.remove();
    });

    if (manifest.actionsHtml) {
      injectDockNodes(actions, manifest.actionsHtml, 'data-boxies-page-action', null);
      actions.hidden = false;
    } else if (!actions.querySelector('.builder-header-action-btn')) {
      actions.hidden = true;
    }
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
