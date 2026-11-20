/**
 * Evita la barra de URL del navegador al hover: desarma <a href>
 * en landing / cotizador / panel y navega por data-href.
 */
(function () {
  if (window.__boxiesNavNoStatus) return;
  window.__boxiesNavNoStatus = true;

  function shouldKeep(a) {
    if (!a || a.nodeType !== 1) return true;
    if (a.hasAttribute('data-keep-href')) return true;
    if (a.hasAttribute('download')) return true;
    var href = a.getAttribute('href');
    if (href == null) return true;
    if (/^(blob:|data:)/i.test(href)) return true;
    return false;
  }

  function disarm(a) {
    if (!a || a.dataset.navDisarmed === '1' || shouldKeep(a)) return;
    var href = a.getAttribute('href');
    if (href == null) return;
    a.dataset.href = href;
    if (a.getAttribute('target') === '_blank' || /\bnoopener\b/i.test(a.getAttribute('rel') || '')) {
      a.dataset.external = '1';
    }
    a.removeAttribute('href');
    a.removeAttribute('target');
    if (!a.getAttribute('role')) a.setAttribute('role', 'link');
    if (!a.hasAttribute('tabindex')) a.setAttribute('tabindex', '0');
    a.dataset.navDisarmed = '1';
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.tagName === 'A') {
      disarm(scope);
      return;
    }
    var list = scope.querySelectorAll ? scope.querySelectorAll('a[href]') : [];
    for (var i = 0; i < list.length; i++) disarm(list[i]);
  }

  function navigate(href, external, newTab) {
    if (!href) return;
    if (external || newTab) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    var hash = '';
    if (href.charAt(0) === '#') hash = href.slice(1);
    else if (/^\/#/.test(href)) hash = href.slice(2);
    if (hash) {
      var target = document.getElementById(hash);
      if (target && typeof window.BoxiesGoToSection === 'function') {
        window.BoxiesGoToSection(hash, { updateHash: true });
        return;
      }
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#' + hash); } catch (err) {}
        return;
      }
      if (href.charAt(0) === '#' || /^\/#/.test(href)) {
        location.href = '/#' + hash;
        return;
      }
    }
    location.href = href;
  }

  function isExternal(a, href) {
    if (a.dataset.external === '1') return true;
    if (/^(mailto:|tel:)/i.test(href)) return true;
    if (!/^https?:/i.test(href)) return false;
    try {
      return new URL(href, location.href).origin !== location.origin;
    } catch (err) {
      return true;
    }
  }

  function fromEvent(e, a) {
    var href = a.getAttribute('data-href') || '';
    if (!href || href === '#') return;
    var newTab = !!(e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1);
    e.preventDefault();
    if (window.BoxiesGlobalNav && window.BoxiesGlobalNav.close) window.BoxiesGlobalNav.close();
    navigate(href, isExternal(a, href), newTab);
  }

  function navEl(e) {
    return e.target.closest && e.target.closest('a[data-href],button[data-href]');
  }

  document.addEventListener('click', function (e) {
    var a = navEl(e);
    if (!a || e.defaultPrevented) return;
    if (e.button != null && e.button !== 0) return;
    fromEvent(e, a);
  }, false);

  document.addEventListener('auxclick', function (e) {
    if (e.button !== 1) return;
    var a = navEl(e);
    if (!a) return;
    fromEvent(e, a);
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var a = e.target.closest && e.target.closest('a[data-href]');
    if (!a || e.target !== a) return;
    e.preventDefault();
    fromEvent(e, a);
  }, false);

  function boot() {
    scan(document);
    if (typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes' && m.target && m.target.tagName === 'A' && m.attributeName === 'href') {
          disarm(m.target);
          continue;
        }
        if (!m.addedNodes) continue;
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'A') disarm(n);
          else scan(n);
        }
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
