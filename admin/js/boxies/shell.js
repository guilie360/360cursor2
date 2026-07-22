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

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    var icon =
      typeof BuilderIcons !== 'undefined' && typeof BuilderIcons.render === 'function'
        ? BuilderIcons.render('maximize')
        : '⛶';
    return (
      '<footer class="boxies-dock" id="boxiesDock" role="toolbar" aria-label="Controles de la aplicación">' +
        '<div class="boxies-dock__inner">' +
          '<div class="boxies-dock__tools">' +
            '<button type="button" class="boxies-dock__ctrl" id="builderFullscreenBtn" aria-label="Pantalla completa" data-fullscreen="enter">' +
              icon +
            '</button>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function defaultNavHtml(activeId) {
    function item(id, label, opts) {
      opts = opts || {};
      var disabled = !!opts.disabled;
      var hint = opts.hint ? '<span class="boxies-nav-item__hint">' + escapeHtml(opts.hint) + '</span>' : '';
      return (
        '<button type="button" class="boxies-nav-item' + (activeId === id ? ' is-current' : '') + '"' +
          ' data-boxies-page="' + escapeHtml(id) + '"' +
          (disabled ? ' disabled' : '') +
        '>' +
          '<span class="boxies-nav-item__row">' +
            '<span class="boxies-nav-item__mark" aria-hidden="true"></span>' +
            escapeHtml(label) +
          '</span>' +
          hint +
        '</button>'
      );
    }
    return (
      '<nav class="boxies-nav" id="boxiesNav" aria-label="Navegación">' +
        '<div class="boxies-nav__group">Plataforma</div>' +
        item('projects', 'Proyectos') +
        item('builder', 'Builder') +
      '</nav>'
    );
  }

  function shellHtml() {
    defaultActionsHtml =
      '<button type="button" class="boxies-action-btn" id="boxiesLogoutBtn">Cerrar sesión</button>';
    return (
      '<div class="boxies-app" id="boxiesAppRoot">' +
        '<header class="boxies-header">' +
          '<div class="boxies-header__left" id="boxiesHeaderLeft">' +
            '<div class="boxies-user" id="boxiesUserChip"></div>' +
          '</div>' +
          brandTitleHtml() +
          '<div class="boxies-header__actions" id="boxiesHeaderActions">' +
            defaultActionsHtml +
          '</div>' +
        '</header>' +
        '<aside class="boxies-sidebar" id="boxiesSidebar" aria-label="Navegación">' +
          defaultNavHtml('projects') +
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
    var dock = document.getElementById('boxiesDock');
    if (!dock) return;
    if (typeof BuilderDock !== 'undefined' && typeof BuilderDock.bindFullscreen === 'function') {
      BuilderDock.bindFullscreen(dock);
      fullscreenBound = true;
      return;
    }
    /* Fallback if BuilderDock not loaded yet — same API as dock.js */
    var btn = dock.querySelector('#builderFullscreenBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    function syncIcon() {
      var isFs = !!document.fullscreenElement;
      btn.setAttribute('data-fullscreen', isFs ? 'exit' : 'enter');
      btn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
      if (typeof BuilderIcons !== 'undefined') {
        btn.innerHTML = BuilderIcons.render(isFs ? 'minimize' : 'maximize');
      }
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
    return getContentEl();
  }

  function unmount() {
    clearPageActions();
    if (rootEl) {
      rootEl.innerHTML = '';
      rootEl.hidden = true;
    }
    setChromeClasses(false);
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

  /** Update active nav mark only — never rebuild sidebar DOM. */
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
   * Page-owned header extras (actions only). Never rebuilds the header shell.
   * Logout always remains last.
   */
  function applyManifest(manifest) {
    manifest = manifest || {};
    var actions = document.getElementById('boxiesHeaderActions');
    var logout = document.getElementById('boxiesLogoutBtn');
    if (!actions || !logout) return;

    actions.querySelectorAll('[data-boxies-page-action]').forEach(function (el) {
      el.remove();
    });

    if (manifest.actionsHtml) {
      var wrap = document.createElement('div');
      wrap.innerHTML = manifest.actionsHtml;
      while (wrap.firstChild) {
        var node = wrap.firstChild;
        if (node.nodeType === 1) node.setAttribute('data-boxies-page-action', '1');
        actions.insertBefore(node, logout);
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
    applyManifest: applyManifest,
    clearPageActions: clearPageActions,
    isMounted: isMounted,
    setChromeClasses: setChromeClasses
  };
})();
