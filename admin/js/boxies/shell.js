/**
 * BOXIES App Shell — immutable chrome.
 * Pages never build header/sidebar/workspace/dock; they only fill #boxiesContent.
 */
var BoxiesShell = (function () {
  var mounted = false;
  var rootEl = null;
  var onNav = null;
  var onLogout = null;

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
        '<div class="boxies-nav__group">Próximamente</div>' +
        item('builder', 'Builder', { hint: 'Coming Soon' }) +
      '</nav>'
    );
  }

  function shellHtml() {
    return (
      '<div class="boxies-app" id="boxiesAppRoot">' +
        '<header class="boxies-header">' +
          '<div class="boxies-header__left">' +
            '<div class="boxies-user" id="boxiesUserChip"></div>' +
          '</div>' +
          '<span class="boxies-header__title">BOXIES</span>' +
          '<div class="boxies-header__actions">' +
            '<button type="button" class="boxies-action-btn" id="boxiesLogoutBtn">Cerrar sesión</button>' +
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
      '<footer class="boxies-dock" id="boxiesDock" aria-hidden="true">' +
        '<div class="boxies-dock__inner"><div class="boxies-dock__tools"></div></div>' +
      '</footer>'
    );
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
    if (rootEl) {
      rootEl.innerHTML = '';
      rootEl.hidden = true;
    }
    setChromeClasses(false);
    mounted = false;
    rootEl = null;
    onNav = null;
    onLogout = null;
  }

  function getContentEl() {
    return document.getElementById('boxiesContent');
  }

  function setActiveNav(pageId) {
    var sidebar = document.getElementById('boxiesSidebar');
    if (!sidebar) return;
    sidebar.innerHTML = defaultNavHtml(pageId || 'projects');
    var nav = document.getElementById('boxiesNav');
    if (nav) nav.dataset.bound = '';
    bind();
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

  function isMounted() {
    return mounted;
  }

  return {
    mount: mount,
    unmount: unmount,
    getContentEl: getContentEl,
    setActiveNav: setActiveNav,
    setUser: setUser,
    isMounted: isMounted,
    setChromeClasses: setChromeClasses
  };
})();
