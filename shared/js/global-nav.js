/**
 * Menú global 360Preventa — presente en toda la web.
 * El contenido cambia según contexto (landing / cotizador / panel).
 * Pantalla completa vive en el menú (sin icono flotante).
 */
(function () {
  if (window.__boxiesGlobalNav) return;
  window.__boxiesGlobalNav = true;

  var WA = 'https://wa.me/573226834084';

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'className') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function isPanelAuthed() {
    return document.body.classList.contains('workspace-authenticated');
  }

  function isCotizador() {
    return document.body.classList.contains('cotizador-app') ||
      document.body.getAttribute('data-app') === 'cotizador';
  }

  function isFullscreenOn() {
    if (window.BoxiesFullscreen && typeof window.BoxiesFullscreen.isActive === 'function') {
      return !!window.BoxiesFullscreen.isActive();
    }
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function fullscreenLabel() {
    return isFullscreenOn() ? 'Salir de pantalla completa' : 'Ver pantalla completa';
  }

  /** Celular: sin FS en menú. PC y tablet: sí. */
  function isPhone() {
    try {
      var narrow = window.matchMedia('(max-width: 760px)').matches;
      var coarse = window.matchMedia('(pointer: coarse)').matches;
      var noHover = window.matchMedia('(hover: none)').matches;
      /* Teléfono: pantalla estrecha + táctil. Tablets suelen ir ≥768px. */
      if (narrow && (coarse || noHover)) return true;
      if (window.matchMedia('(max-width: 480px)').matches) return true;
      return false;
    } catch (e) {
      return window.innerWidth <= 760;
    }
  }

  function canOfferFullscreen() {
    return !isPhone();
  }

  /** Links principales (FS va aparte, en el footer del menú) */
  function linksForContext() {
    if (isPanelAuthed()) {
      return [
        { href: '/#inicio', label: 'Inicio', n: '01' },
        { href: '/#demo', label: 'Ver demo', n: '02' },
        { action: 'panel-home', label: 'Panel de gestión', n: '03' },
        { action: 'logout', label: 'Salir', n: '04' }
      ];
    }
    var links = [
      { href: '/#inicio', label: 'Inicio', n: '01' },
      { href: '/cotizar', label: 'Cotizar mi showroom', n: '02' },
      { href: WA, label: 'Chatear con asesor', n: '03', external: true },
      { href: '/#demo', label: 'Ver demo', n: '04' }
    ];
    if (isCotizador() && document.body.classList.contains('modo-interno')) {
      links.push({ href: '/panel_gestion/', label: 'Panel', n: '05' });
    } else {
      links.push({ href: '/panel_gestion/', label: 'Ingresar', n: '05' });
    }
    return links;
  }

  function mount() {
    if (document.getElementById('globalMenuToggle')) return;

    document.body.classList.add('has-global-nav');
    document.body.classList.add('nav-fs-in-menu');

    var toggle = el('button', {
      className: 'menu-toggle mag',
      id: 'globalMenuToggle',
      type: 'button',
      'aria-label': 'Abrir menú',
      'aria-expanded': 'false',
      'aria-controls': 'globalMenuPanel',
      'data-cursor': 'MENÚ'
    }, '<span></span><span></span>');

    var overlay = el('div', { className: 'menu-overlay', id: 'globalMenuOverlay' });
    var panel = el('nav', {
      className: 'menu-panel',
      id: 'globalMenuPanel',
      'aria-label': 'Navegación 360Preventa'
    });

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    /* Bloqueo suave: no mueve scrollY (evita el salto loco de la landing). */
    var scrollBlocked = false;
    function blockScrollEvent(e) {
      if (e.target && e.target.closest && e.target.closest('.menu-panel')) return;
      e.preventDefault();
    }
    function lockPageScroll() {
      if (scrollBlocked) return;
      scrollBlocked = true;
      document.documentElement.classList.add('nav-scroll-locked');
      document.addEventListener('wheel', blockScrollEvent, { passive: false, capture: true });
      document.addEventListener('touchmove', blockScrollEvent, { passive: false, capture: true });
    }
    function unlockPageScroll() {
      if (!scrollBlocked) return;
      scrollBlocked = false;
      document.documentElement.classList.remove('nav-scroll-locked');
      document.removeEventListener('wheel', blockScrollEvent, true);
      document.removeEventListener('touchmove', blockScrollEvent, true);
    }

    function setOpen(open) {
      panel.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if (open) lockPageScroll();
      else unlockPageScroll();
    }

    function close() { setOpen(false); }

    function renderLinks() {
      var wasOpen = panel.classList.contains('open');
      panel.innerHTML = '';
      panel.appendChild(el('div', {
        className: 'menu-caption',
        text: isPanelAuthed() ? '360PREVENTA / PANEL' : '360PREVENTA / NAVEGACIÓN'
      }));

      var list = el('div', { className: 'menu-panel-list' });
      linksForContext().forEach(function (item, i) {
        var delay = (0.12 + i * 0.07).toFixed(2) + 's';
        var btn = el('button', {
          className: 'menu-link',
          type: 'button',
          'data-cursor': item.action === 'logout' ? 'SALIR'
            : item.action === 'panel-home' ? 'PANEL'
            : item.label.toUpperCase().split(' ')[0]
        }, item.label + ' <span>' + item.n + '</span>');
        btn.style.setProperty('--dl', delay);
        if (item.action === 'logout') btn.setAttribute('data-nav-logout', '1');
        else if (item.action === 'panel-home') btn.setAttribute('data-nav-panel-home', '1');
        else {
          btn.setAttribute('data-href', item.href);
          if (item.external) {
            btn.setAttribute('data-external', '1');
            btn.id = 'contacto';
          }
        }
        list.appendChild(btn);
      });
      panel.appendChild(list);

      /* Footer: pantalla completa (solo PC/tablet), más pequeño */
      if (canOfferFullscreen()) {
        var foot = el('div', { className: 'menu-panel-footer' });
        var fsBtn = el('button', {
          className: 'menu-fs-link',
          type: 'button',
          'data-nav-fullscreen': '1',
          'data-cursor': 'PANTALLA'
        }, fullscreenLabel());
        foot.appendChild(fsBtn);
        panel.appendChild(foot);
      }

      document.body.classList.toggle('nav-panel-authed', isPanelAuthed());
      if (wasOpen) setOpen(true);
    }

    function doLogout() {
      close();
      var btn = document.getElementById('logoutBtn');
      if (btn) btn.click();
      else {
        try {
          document.body.classList.remove('workspace-authenticated');
          location.href = '/panel_gestion/';
        } catch (err) {}
      }
    }

    function goPanelHome() {
      close();
      try {
        if (typeof portalShowHome === 'function') {
          portalShowHome();
          return;
        }
      } catch (err) {}
      location.href = '/panel_gestion/';
    }

    function doFullscreen() {
      // Solo FS. Menú sigue abierto. No tocar scroll ni position/overflow del body.
      try {
        if (window.BoxiesRememberLandingForFs) window.BoxiesRememberLandingForFs();
      } catch (err0) {}
      var p;
      try {
        if (window.BoxiesFullscreen && window.BoxiesFullscreen.toggle) {
          p = window.BoxiesFullscreen.toggle();
        } else if (document.fullscreenElement || document.webkitFullscreenElement) {
          var exit = document.exitFullscreen || document.webkitExitFullscreen;
          p = exit ? exit.call(document) : Promise.resolve();
        } else {
          var el = document.documentElement;
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          p = req ? req.call(el) : Promise.resolve();
        }
      } catch (err) {
        p = Promise.reject(err);
      }
      Promise.resolve(p).catch(function () {}).then(function () {
        var keepOpen = panel.classList.contains('open');
        renderLinks();
        if (keepOpen) setOpen(true);
        try {
          if (window.BoxiesRestoreLandingView && window.BoxiesCaptureLandingView) {
            /* applyPendingFsView en landing escucha fullscreenchange */
          }
        } catch (err2) {}
      });
    }

    toggle.addEventListener('click', function () {
      setOpen(!panel.classList.contains('open'));
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-nav-logout]')) {
        e.preventDefault();
        doLogout();
        return;
      }
      if (e.target.closest('[data-nav-panel-home]')) {
        e.preventDefault();
        goPanelHome();
        return;
      }
      if (e.target.closest('[data-nav-fullscreen]')) {
        e.preventDefault();
        doFullscreen();
        return;
      }
      var nav = e.target.closest('[data-href]');
      if (!nav || !panel.contains(nav)) return;
      e.preventDefault();
      var href = nav.getAttribute('data-href') || '';
      if (nav.getAttribute('data-external')) {
        close();
        if (href) window.open(href, '_blank', 'noopener');
        return;
      }
      var hash = '';
      if (href.charAt(0) === '#') hash = href.slice(1);
      else if (/^\/#/.test(href)) hash = href.slice(2);
      if (hash) {
        var target = document.getElementById(hash);
        if (target && typeof window.BoxiesGoToSection === 'function') {
          close();
          window.BoxiesGoToSection(hash, { updateHash: true });
          return;
        }
        if (target) {
          close();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try { history.replaceState(null, '', '#' + hash); } catch (err) {}
          return;
        }
        /* Otra página (p. ej. cotizador → landing): forzar sección al cargar */
        close();
        try {
          sessionStorage.setItem('boxiesForceSection', hash);
          sessionStorage.removeItem('boxiesFsView');
          sessionStorage.removeItem('boxiesMenuScrollY');
        } catch (err) {}
        location.href = '/#' + hash;
        return;
      }
      close();
      if (href) location.href = href;
    });

    renderLinks();

    var mo = new MutationObserver(function () { renderLinks(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('fullscreenchange', renderLinks);
    document.addEventListener('webkitfullscreenchange', renderLinks);
    document.addEventListener('boxies:fullscreen', renderLinks);
    var onViewport = function () { renderLinks(); };
    window.addEventListener('resize', onViewport, { passive: true });
    window.addEventListener('orientationchange', onViewport);

    window.BoxiesGlobalNav = {
      open: function () { setOpen(true); },
      close: close,
      toggle: function () { setOpen(!panel.classList.contains('open')); },
      refresh: renderLinks
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
