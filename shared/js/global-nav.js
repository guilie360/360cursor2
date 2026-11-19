/**
 * Menú global 360Preventa — presente en toda la web.
 * El contenido cambia según contexto (landing / cotizador / panel).
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

  /** Links según pantalla */
  function linksForContext() {
    if (isPanelAuthed()) {
      return [
        { href: '/#inicio', label: 'Inicio', n: '01' },
        { href: '/#demo', label: 'Ver demo', n: '02' },
        { action: 'logout', label: 'Salir', n: '03' }
      ];
    }
    /* Landing, login, cotizador (público o interno): sin Refrescar */
    var links = [
      { href: '/#inicio', label: 'Inicio', n: '01' },
      { href: '/cotizar', label: 'Cotizar mi showroom', n: '02' },
      { href: WA, label: 'Chatear con asesor', n: '03', external: true },
      { href: '/#demo', label: 'Ver demo', n: '04' }
    ];
    if (isCotizador() && document.body.classList.contains('modo-interno')) {
      links.push({ href: '/panel_gestion/', label: 'Panel', n: '05' });
    } else if (!isCotizador() || document.body.classList.contains('modo-publico')) {
      links.push({ href: '/panel_gestion/', label: 'Ingresar', n: '05' });
    } else {
      links.push({ href: '/panel_gestion/', label: 'Ingresar', n: '05' });
    }
    return links;
  }

  function mount() {
    if (document.getElementById('globalMenuToggle')) return;

    document.body.classList.add('has-global-nav');

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

    function setOpen(open) {
      panel.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    function close() { setOpen(false); }

    function renderLinks() {
      var wasOpen = panel.classList.contains('open');
      panel.innerHTML = '';
      panel.appendChild(el('div', {
        className: 'menu-caption',
        text: isPanelAuthed() ? '360PREVENTA / PANEL' : '360PREVENTA / NAVEGACIÓN'
      }));
      linksForContext().forEach(function (item, i) {
        var delay = (0.12 + i * 0.07).toFixed(2) + 's';
        if (item.action === 'logout') {
          var btn = el('button', {
            className: 'menu-link',
            type: 'button',
            'data-nav-logout': '1',
            'data-cursor': 'SALIR'
          }, item.label + ' <span>' + item.n + '</span>');
          btn.style.setProperty('--dl', delay);
          panel.appendChild(btn);
          return;
        }
        var a = el('a', {
          href: item.href,
          'data-cursor': item.label.toUpperCase().split(' ')[0]
        }, item.label + ' <span>' + item.n + '</span>');
        a.style.setProperty('--dl', delay);
        if (item.external) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          a.id = 'contacto';
        }
        panel.appendChild(a);
      });
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
      var a = e.target.closest('a');
      if (!a || !panel.contains(a)) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank') {
        close();
        return;
      }
      var hash = '';
      if (href.charAt(0) === '#') hash = href.slice(1);
      else if (/^\/#/.test(href)) hash = href.slice(2);
      if (hash) {
        var target = document.getElementById(hash);
        if (target && typeof window.BoxiesGoToSection === 'function') {
          e.preventDefault();
          close();
          window.BoxiesGoToSection(hash, { updateHash: true });
          return;
        }
        if (target) {
          e.preventDefault();
          close();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try { history.replaceState(null, '', '#' + hash); } catch (err) {}
          return;
        }
      }
      close();
    });

    renderLinks();

    /* Reconstruir al login / logout / cambio de modo cotizador */
    var mo = new MutationObserver(function () { renderLinks(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });

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
