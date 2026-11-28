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

  function teamRole() {
    var fromBody = (document.body.dataset.panelRole || '').trim();
    if (fromBody) return fromBody;
    try {
      return (sessionStorage.getItem('boxiesPanelRole') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function hasTeamSessionFlag() {
    try {
      return sessionStorage.getItem('boxiesTeamSession') === '1';
    } catch (e) {
      return false;
    }
  }

  function isCotizador() {
    return document.body.classList.contains('cotizador-app') ||
      document.body.getAttribute('data-app') === 'cotizador';
  }

  function isMiperfil() {
    if (document.body.classList.contains('miperfil-mode')) return true;
    try {
      return /^\/miperfil\/?$/i.test(location.pathname || '');
    } catch (e) {
      return false;
    }
  }

  function isClienteAuthed() {
    return isMiperfil() && document.body.classList.contains('workspace-authenticated');
  }

  function clientDisplayName() {
    try {
      var fromBody = (document.body.dataset.clientName || '').trim();
      if (fromBody) return fromBody;
    } catch (e) {}
    try {
      return (sessionStorage.getItem('boxiesClientName') || '').trim();
    } catch (e2) {
      return '';
    }
  }

  function isPanelLoginScreen() {
    var login = document.getElementById('loginScreen');
    return !!(login && !login.classList.contains('portal-hidden'));
  }

  function isPanelAuthed() {
    /* Mi perfil cliente tiene su propio menú */
    if (isMiperfil()) return false;
    /* Pantalla de correo/contraseña = menú público */
    if (isPanelLoginScreen()) return false;
    if (document.body.classList.contains('workspace-authenticated')) return true;
    /* Cotizar privado (modo interno) con sesión de empresa = mismo menú del panel */
    if (isCotizador() && document.body.classList.contains('modo-interno') && (hasTeamSessionFlag() || !!teamRole())) {
      return true;
    }
    return false;
  }

  function clearTeamSessionLocal() {
    try {
      delete document.body.dataset.panelRole;
      document.body.classList.remove('workspace-authenticated');
      sessionStorage.removeItem('boxiesPanelRole');
      sessionStorage.removeItem('boxiesTeamSession');
    } catch (e) {}
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
    /* Mi perfil (cliente): Inicio = panel perfil, Ver demo, Chatear, Salir */
    if (isClienteAuthed()) {
      return [
        { action: 'miperfil-home', label: 'Inicio', n: '01' },
        { action: 'go-demo', label: 'Ver demo', n: '02' },
        { action: 'client-chat', label: 'Chatear', n: '03' },
        { action: 'logout', label: 'Salir', n: '04' }
      ];
    }
    /* Menú privado: solo con sesión de empresa (panel / cotizar interno) */
    if (isPanelAuthed()) {
      return [
        { action: 'go-home', label: 'Inicio', n: '01' },
        { action: 'go-demo', label: 'Ver demo', n: '02' },
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
    links.push({ href: '/login/', label: 'Ingresar', n: '05' });
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
      var caption = '360PREVENTA / NAVEGACIÓN';
      if (isClienteAuthed()) caption = '360PREVENTA / MI PERFIL';
      else if (isPanelAuthed()) caption = '360PREVENTA / PANEL';
      panel.appendChild(el('div', {
        className: 'menu-caption',
        text: caption
      }));

      var title = '';
      if (isClienteAuthed()) title = clientDisplayName() || 'Cliente';
      else if (isPanelAuthed()) title = teamRole();
      if (title) {
        panel.appendChild(el('div', {
          className: 'menu-role-title',
          text: title
        }));
      }

      var list = el('div', { className: 'menu-panel-list' });
      linksForContext().forEach(function (item, i) {
        var delay = (0.12 + i * 0.07).toFixed(2) + 's';
        var btn = el('button', {
          className: 'menu-link',
          type: 'button',
          'data-cursor': item.action === 'logout' ? 'SALIR'
            : item.action === 'panel-home' ? 'PANEL'
            : item.action === 'client-chat' ? 'CHAT'
            : item.label.toUpperCase().split(' ')[0]
        }, item.label + ' <span>' + item.n + '</span>');
        btn.style.setProperty('--dl', delay);
        if (item.action === 'logout') btn.setAttribute('data-nav-logout', '1');
        else if (item.action === 'go-home') btn.setAttribute('data-nav-go-home', '1');
        else if (item.action === 'miperfil-home') btn.setAttribute('data-nav-miperfil-home', '1');
        else if (item.action === 'go-demo') btn.setAttribute('data-nav-go-demo', '1');
        else if (item.action === 'panel-home') btn.setAttribute('data-nav-panel-home', '1');
        else if (item.action === 'client-chat') btn.setAttribute('data-nav-client-chat', '1');
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

      /* Footer: pantalla completa (PC/tablet) — no en Mi perfil cliente */
      if (canOfferFullscreen() && !isClienteAuthed()) {
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

      document.body.classList.toggle('nav-panel-authed', isPanelAuthed() || isClienteAuthed());
      if (wasOpen) setOpen(true);
    }

    var endingSession = false;
    function assignTop(url) {
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.assign(url);
          return;
        }
      } catch (e) {}
      location.assign(url);
    }

    /** Solo Salir cierra sesión y puede quitar pantalla completa. */
    function endPrivateSession() {
      if (endingSession) return;
      endingSession = true;
      close();
      clearTeamSessionLocal();
      try { sessionStorage.removeItem('boxiesKeepFullscreen'); } catch (e0) {}
      try { sessionStorage.removeItem('boxiesFsUrl'); } catch (e1) {}
      try { sessionStorage.removeItem('boxiesClientName'); } catch (e2) {}
      try { delete document.body.dataset.clientName; } catch (e3) {}

      var fromMiperfil = isMiperfil();
      var dest = fromMiperfil ? '/miperfil/' : '/panel_gestion/?signout=1';
      var gone = false;
      function go() {
        if (gone) return;
        gone = true;
        assignTop(dest);
      }

      try {
        if (fromMiperfil && window.PlatformAuth && typeof window.PlatformAuth.getClient === 'function') {
          var sb = window.PlatformAuth.getClient();
          if (sb && sb.auth) {
            Promise.resolve(sb.auth.signOut()).then(go, go);
            setTimeout(go, 700);
            return;
          }
        }
        if (window.PanelAuth && typeof window.PanelAuth.logout === 'function') {
          Promise.resolve(window.PanelAuth.logout()).then(go, go);
        } else {
          go();
        }
      } catch (err) {
        go();
      }
      setTimeout(go, 700);
    }

    function openClientChat() {
      close();
      try {
        if (window.BoxiesClientChat && typeof window.BoxiesClientChat.open === 'function') {
          // Solo abrir el chat; el cliente escribe cuando quiera.
          window.BoxiesClientChat.open({ notify: false });
          return;
        }
      } catch (e) {}
      var floatBtn = document.getElementById('teamChatFloat');
      if (floatBtn) floatBtn.click();
    }

    function doLogout() {
      endPrivateSession();
    }

    function onLanding() {
      return !!(document.getElementById('inicio') && document.getElementById('demo') &&
        typeof window.BoxiesGoToSection === 'function');
    }

    /** Inicio / Demo: mantienen sesión y pantalla completa (shell FS). */
    function goKeepFs(url) {
      close();
      var section = url.indexOf('demo') !== -1 ? 'demo' : 'inicio';
      try {
        sessionStorage.setItem('boxiesForceSection', section);
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending(section);
        else sessionStorage.setItem('boxiesTransitPending', '1');
      } catch (e) {}
      if (window.BoxiesPageTransit) window.BoxiesPageTransit.show();
      try {
        if (window.BoxiesFullscreen && typeof window.BoxiesFullscreen.navigate === 'function') {
          var keep = false;
          try {
            keep = !!(window.BoxiesFullscreen.isActive && window.BoxiesFullscreen.isActive()) ||
              !!(window.BoxiesFullscreen.wanted && window.BoxiesFullscreen.wanted()) ||
              sessionStorage.getItem('boxiesKeepFullscreen') === '1';
          } catch (e2) {}
          if (keep) {
            /* Nunca limpiar boxiesKeepFullscreen aquí — solo Salir lo apaga */
            window.BoxiesFullscreen.navigate(url);
            return;
          }
        }
      } catch (err) {}
      location.href = url;
    }

    function goHome() {
      if (onLanding()) {
        close();
        window.BoxiesGoToSection('inicio', { updateHash: true });
        return;
      }
      goKeepFs('/#inicio');
    }

    function goMiperfilHome() {
      close();
      try {
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.show();
      } catch (eShow) {}
      try {
        if (typeof window.BoxiesMiPerfilHome === 'function') {
          if (window.BoxiesPageTransit) {
            window.BoxiesPageTransit.run(function () { window.BoxiesMiPerfilHome(); }, { minMs: 1000 });
          } else {
            window.BoxiesMiPerfilHome();
          }
          return;
        }
      } catch (e) {}
      try {
        if (/\/miperfil\/?/i.test(location.pathname || '')) {
          if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending();
          location.hash = '';
          location.reload();
          return;
        }
      } catch (e2) {}
      try {
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending();
      } catch (e3) {}
      location.href = '/miperfil/';
    }

    function goDemo() {
      if (onLanding()) {
        close();
        window.BoxiesGoToSection('demo', { updateHash: true });
        return;
      }
      goKeepFs('/#demo');
    }

    function goPanelHome() {
      close();
      try {
        sessionStorage.setItem('boxiesTeamSession', '1');
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending();
        else sessionStorage.setItem('boxiesTransitPending', '1');
      } catch (e0) {}
      if (window.BoxiesPageTransit) window.BoxiesPageTransit.show();
      try {
        if (typeof portalShowHome === 'function' && !isCotizador()) {
          if (window.BoxiesPageTransit) {
            window.BoxiesPageTransit.run(function () { portalShowHome(); }, { minMs: 1000 });
          } else {
            portalShowHome();
          }
          return;
        }
      } catch (err) {}
      try {
        if (window.BoxiesFullscreen && typeof window.BoxiesFullscreen.navigate === 'function') {
          var keep = false;
          try {
            keep = !!(window.BoxiesFullscreen.isActive && window.BoxiesFullscreen.isActive()) ||
              sessionStorage.getItem('boxiesKeepFullscreen') === '1';
          } catch (e1) {}
          if (keep) {
            window.BoxiesFullscreen.navigate('/panel_gestion/');
            return;
          }
        }
      } catch (err2) {}
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
        e.stopPropagation();
        doLogout();
        return;
      }
      if (e.target.closest('[data-nav-go-home]')) {
        e.preventDefault();
        e.stopPropagation();
        goHome();
        return;
      }
      if (e.target.closest('[data-nav-miperfil-home]')) {
        e.preventDefault();
        e.stopPropagation();
        goMiperfilHome();
        return;
      }
      if (e.target.closest('[data-nav-go-demo]')) {
        e.preventDefault();
        e.stopPropagation();
        goDemo();
        return;
      }
      if (e.target.closest('[data-nav-panel-home]')) {
        e.preventDefault();
        goPanelHome();
        return;
      }
      if (e.target.closest('[data-nav-client-chat]')) {
        e.preventDefault();
        e.stopPropagation();
        openClientChat();
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
          if (window.BoxiesPageTransit) {
            window.BoxiesPageTransit.run(function () {
              target.scrollIntoView({ behavior: 'instant', block: 'start' });
              try { history.replaceState(null, '', '#' + hash); } catch (err0) {}
            }, { minMs: 1000 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            try { history.replaceState(null, '', '#' + hash); } catch (err) {}
          }
          return;
        }
        /* Otra página (p. ej. cotizador → landing): forzar sección al cargar */
        close();
        try {
          sessionStorage.setItem('boxiesForceSection', hash);
          sessionStorage.removeItem('boxiesFsView');
          sessionStorage.removeItem('boxiesMenuScrollY');
          if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending(hash);
          else sessionStorage.setItem('boxiesTransitPending', '1');
        } catch (err) {}
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.show();
        location.href = '/#' + hash;
        return;
      }
      close();
      if (href) {
        try {
          if (window.BoxiesPageTransit) window.BoxiesPageTransit.markPending();
          else sessionStorage.setItem('boxiesTransitPending', '1');
        } catch (eNav) {}
        if (window.BoxiesPageTransit) window.BoxiesPageTransit.show();
        location.href = href;
      }
    });

    renderLinks();

    var mo = new MutationObserver(function () { renderLinks(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-client-name', 'data-panel-role'] });
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
