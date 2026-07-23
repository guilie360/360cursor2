/**
 * BOXIES App Shell — immutable chrome.
 * Pages never build header/sidebar/workspace/dock; they only fill #boxiesContent.
 */
var BoxiesShell = (function () {
  var mounted = false;
  var rootEl = null;
  var onNav = null;
  var onLogout = null;
  var fullscreenBound = false;
  var defaultActionsHtml = '';
  var projectCtx = { id: '', name: '', slug: '' };

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

  function applyNavCollapsed(collapsed) {
    document.body.classList.toggle('boxies-nav-collapsed', !!collapsed);
    document.documentElement.classList.toggle('boxies-nav-collapsed', !!collapsed);
    var btn = document.getElementById('boxiesNavCollapseBtn');
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('aria-label', collapsed ? 'Expandir navegación' : 'Colapsar navegación');
      btn.title = collapsed ? 'Expandir' : 'Colapsar';
      btn.innerHTML = iconHtml(collapsed ? 'chevron-right' : 'chevron-left');
    }
  }

  function dockHtml() {
    return (
      '<footer class="boxies-dock" id="boxiesDock" role="toolbar" aria-label="Acciones del showroom">' +
        '<div class="boxies-dock__inner">' +
          '<div class="boxies-dock__project" id="boxiesDockProject" hidden>' +
            '<strong class="boxies-dock__project-name" id="boxiesDockProjectName"></strong>' +
          '</div>' +
          '<div class="boxies-dock__spacer"></div>' +
          '<div class="boxies-dock__actions" id="boxiesDockActions" hidden>' +
            '<button type="button" class="boxies-btn-secondary boxies-btn-secondary--icon boxies-dock__preview" id="boxiesPreviewBtn" aria-label="Visualizar" title="Visualizar" disabled>' +
              iconHtml('eye') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function defaultNavHtml(activeId) {
    function item(id, label, icon) {
      return (
        '<button type="button" class="boxies-nav-item' + (activeId === id ? ' is-current' : '') + '"' +
          ' data-boxies-page="' + escapeHtml(id) + '"' +
          ' title="' + escapeHtml(label) + '"' +
          ' aria-label="' + escapeHtml(label) + '"' +
        '>' +
          '<span class="boxies-nav-item__row">' +
            '<span class="boxies-nav-item__icon" aria-hidden="true">' + iconHtml(icon) + '</span>' +
            '<span class="boxies-nav-item__label">' + escapeHtml(label) + '</span>' +
          '</span>' +
        '</button>'
      );
    }
    return (
      '<nav class="boxies-nav" id="boxiesNav" aria-label="Navegación">' +
        '<button type="button" class="boxies-nav-collapse" id="boxiesNavCollapseBtn" aria-expanded="true" aria-label="Colapsar navegación" title="Colapsar">' +
          iconHtml('chevron-left') +
        '</button>' +
        '<div class="boxies-nav__group">Plataforma</div>' +
        item('hall', 'Hall', 'home') +
        item('projects', 'Showrooms', 'folder') +
        item('builder', 'Builder', 'panel') +
      '</nav>'
    );
  }

  function shellHtml() {
    defaultActionsHtml = '';
    return (
      '<div class="boxies-app" id="boxiesAppRoot">' +
        '<header class="boxies-header">' +
          '<div class="boxies-header__left" id="boxiesHeaderLeft">' +
            '<div class="boxies-user-wrap">' +
              '<div class="boxies-user" id="boxiesUserChip"></div>' +
              '<button type="button" class="boxies-logout-icon" id="boxiesLogoutBtn" aria-label="Cerrar sesión" title="Cerrar sesión">' +
                iconHtml('log-out') +
              '</button>' +
            '</div>' +
          '</div>' +
          brandTitleHtml() +
          '<div class="boxies-header__actions" id="boxiesHeaderActions">' +
            '<button type="button" class="boxies-header__fs" id="builderFullscreenBtn" aria-label="Pantalla completa" title="Pantalla completa" data-fullscreen="enter">' +
              iconHtml('maximize') +
            '</button>' +
          '</div>' +
        '</header>' +
        '<aside class="boxies-sidebar" id="boxiesSidebar" aria-label="Navegación">' +
          defaultNavHtml('hall') +
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

  function resolvePreviewUrl(slug) {
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

  function bind() {
    var nav = document.getElementById('boxiesNav');
    if (nav && !nav.dataset.bound) {
      nav.dataset.bound = '1';
      nav.addEventListener('click', function (e) {
        var collapseBtn = e.target.closest('#boxiesNavCollapseBtn');
        if (collapseBtn) {
          var next = !(typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getNavCollapsed
            ? BoxiesPrefs.getNavCollapsed()
            : document.body.classList.contains('boxies-nav-collapsed'));
          if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.setNavCollapsed) {
            BoxiesPrefs.setNavCollapsed(next);
          }
          applyNavCollapsed(next);
          return;
        }
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
        var slug = projectCtx.slug;
        if (!slug) {
          try {
            slug = new URLSearchParams(window.location.search || '').get('project')
              || new URLSearchParams(window.location.search || '').get('proyecto');
          } catch (e) {}
        }
        if (!slug) return;
        window.open(resolvePreviewUrl(slug), '_blank', 'noopener,noreferrer');
      });
    }

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
    var navCollapsed = typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getNavCollapsed
      ? BoxiesPrefs.getNavCollapsed()
      : false;
    applyNavCollapsed(navCollapsed);
    if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyCollapsedFromPrefs) {
      BuilderProgressRail.applyCollapsedFromPrefs();
    }
    return getContentEl();
  }

  function unmount() {
    clearPageActions();
    clearProjectContext();
    /* Leaving BOXIES entirely — release workspace fullscreen */
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    if (rootEl) {
      rootEl.innerHTML = '';
      rootEl.hidden = true;
    }
    setChromeClasses(false);
    document.body.classList.remove('boxies-nav-collapsed', 'boxies-rail-collapsed');
    document.documentElement.classList.remove('boxies-nav-collapsed', 'boxies-rail-collapsed');
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
  }

  function setUser(profile) {
    var chip = document.getElementById('boxiesUserChip');
    if (!chip) return;
    if (!profile) {
      chip.innerHTML = '';
      return;
    }
    var roleLabel =
      typeof PlatformRoles !== 'undefined'
        ? PlatformRoles.getRoleLabel(profile)
        : (profile.rol || 'admin');
    chip.innerHTML =
      '<strong>' + escapeHtml(profile.nombre || profile.email || 'Admin') + '</strong>' +
      ' · ' + escapeHtml(roleLabel);
  }

  /**
   * Project strip in dock (Builder). Name is always dynamic from the open project.
   */
  function setProjectContext(ctx) {
    ctx = ctx || {};
    projectCtx = {
      id: (ctx.id || ctx.projectId || '').trim(),
      name: (ctx.name || ctx.nombre || '').trim(),
      slug: (ctx.slug || ctx.project || ctx.proyecto || '').trim()
    };
    var wrap = document.getElementById('boxiesDockProject');
    var nameEl = document.getElementById('boxiesDockProjectName');
    var actions = document.getElementById('boxiesDockActions');
    var previewBtn = document.getElementById('boxiesPreviewBtn');
    if (!wrap || !nameEl) return;

    if (!projectCtx.slug && !projectCtx.name && !projectCtx.id) {
      wrap.hidden = true;
      nameEl.textContent = '';
      if (actions) actions.hidden = true;
      if (previewBtn) previewBtn.disabled = true;
      return;
    }

    var label = projectCtx.name || projectCtx.slug || 'Showroom';
    nameEl.textContent = label;
    wrap.hidden = false;
    if (actions) actions.hidden = false;
    if (previewBtn) previewBtn.disabled = !projectCtx.slug;
  }

  function clearProjectContext() {
    setProjectContext({});
  }

  function applyManifest(manifest) {
    manifest = manifest || {};
    var actions = document.getElementById('boxiesDockActions');
    if (!actions) return;

    actions.querySelectorAll('[data-boxies-page-action]').forEach(function (el) {
      el.remove();
    });

    if (manifest.actionsHtml) {
      var previewBtn = document.getElementById('boxiesPreviewBtn');
      var wrap = document.createElement('div');
      wrap.innerHTML = manifest.actionsHtml;
      while (wrap.firstChild) {
        var node = wrap.firstChild;
        if (node.nodeType === 1) {
          node.setAttribute('data-boxies-page-action', '1');
          if (previewBtn) actions.insertBefore(node, previewBtn);
          else actions.appendChild(node);
        } else {
          wrap.removeChild(node);
        }
      }
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
    applyNavCollapsed: applyNavCollapsed
  };
})();
