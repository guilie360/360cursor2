/**
 * Menú global 360Preventa — presente en toda la web.
 * Inyecta toggle (hamburguesa → X), overlay y panel de navegación.
 */
(function () {
  if (window.__boxiesGlobalNav) return;
  window.__boxiesGlobalNav = true;

  var WA = 'https://wa.me/573226834084';
  var LINKS = [
    { href: '/#inicio', label: 'Inicio', n: '01' },
    { href: '/cotizar', label: 'Cotizar mi showroom', n: '02' },
    { href: WA, label: 'Chatear con asesor', n: '03', external: true },
    { href: '/#demo', label: 'Ver demo', n: '04' },
    { href: '/panel_gestion/', label: 'Ingresar', n: '05' },
    { action: 'refresh', label: 'Refrescar', n: '06' }
  ];

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
    panel.appendChild(el('div', { className: 'menu-caption', text: '360PREVENTA / NAVEGACIÓN' }));

    LINKS.forEach(function (item, i) {
      var delay = (0.12 + i * 0.07).toFixed(2) + 's';
      if (item.action === 'refresh') {
        var btn = el('button', {
          className: 'menu-link',
          type: 'button',
          'data-nav-refresh': '1',
          'data-cursor': 'REFRESCAR'
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

    toggle.addEventListener('click', function () {
      setOpen(!panel.classList.contains('open'));
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    panel.addEventListener('click', function (e) {
      var refresh = e.target.closest('[data-nav-refresh]');
      if (refresh) {
        e.preventDefault();
        close();
        location.reload();
        return;
      }
      var a = e.target.closest('a');
      if (!a || !panel.contains(a)) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank') {
        close();
        return;
      }
      /* Hash en la misma landing: usar salto suave si existe */
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

    window.BoxiesGlobalNav = {
      open: function () { setOpen(true); },
      close: close,
      toggle: function () { setOpen(!panel.classList.contains('open')); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
