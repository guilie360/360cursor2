/* 360Preventa landing — narrative presentation + overlays */
(function () {
  try {
    var earlyHash = String(window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (earlyHash === 'demos' || earlyHash === 'proyectos' || earlyHash === 'experiencias') {
      document.documentElement.classList.add('lp-nav-lock');
    }
  } catch (e) { /* ignore */ }

  var FALLBACK_PROJECTS = [
    {
      slug: 'demo1',
      nombre: 'Proyecto Demo 1',
      descripcion: 'Experiencia inmobiliaria interactiva lista para compartir.',
      imagen_hero_url:
        'https://emefdwzdfnqgjohbtvvn.supabase.co/storage/v1/object/public/proyectos-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/hero/image/hero/image-1783567174957.jpg'
    },
    {
      slug: 'demo2',
      nombre: 'Proyecto Demo 2',
      descripcion: 'Recorrido digital con identidad visual propia.',
      imagen_hero_url:
        'https://emefdwzdfnqgjohbtvvn.supabase.co/storage/v1/object/public/proyectos-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/hero/image/hero/image-1783567174957.jpg'
    },
    {
      slug: 'demo3',
      nombre: 'Proyecto Demo 3',
      descripcion: 'Showroom publicado desde un solo lugar.',
      imagen_hero_url:
        'https://emefdwzdfnqgjohbtvvn.supabase.co/storage/v1/object/public/proyectos-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/hero/image/hero/image-1783567174957.jpg'
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortDesc(p) {
    var raw = (p && (p.descripcion || p.description)) || '';
    raw = String(raw).replace(/\s+/g, ' ').trim();
    if (raw.length > 110) raw = raw.slice(0, 107).trim() + '…';
    if (raw) return raw;
    return 'Experiencia inmobiliaria lista para explorar.';
  }

  function isMobileNav() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  /**
   * Menu navigation must not fight scroll-snap.
   * Temporarily disable snap, scroll to target, then restore (desktop only).
   */
  function navigateToSection(target) {
    if (!target) return;
    var html = document.documentElement;
    var mobile = isMobileNav();
    var block = mobile ? 'start' : 'center';

    html.classList.add('lp-nav-lock');

    window.setTimeout(function () {
      target.scrollIntoView({ behavior: 'smooth', block: block });
      window.setTimeout(function () {
        html.classList.remove('lp-nav-lock');
      }, mobile ? 100 : 1100);
    }, mobile ? 80 : 40);
  }

  function normalizeLandingHash(hash) {
    hash = String(hash || '').replace(/^#/, '').toLowerCase();
    if (hash === 'proyectos' || hash === 'experiencias') return 'demos';
    return hash;
  }

  function getHashSection() {
    var hash = normalizeLandingHash(window.location.hash);
    if (hash !== 'demos') return null;
    return document.getElementById('demos');
  }

  /** Deep-link /#demos from showrooms — wait for layout, avoid snap bounce. */
  function scrollToHashSection() {
    var target = getHashSection();
    if (!target) return false;
    navigateToSection(target);
    return true;
  }

  function initHashLanding() {
    var target = getHashSection();
    if (!target) return;

    document.documentElement.classList.add('lp-nav-lock');

    var attempts = 0;
    function tryScroll() {
      attempts += 1;
      navigateToSection(target);
      if (attempts < 3) {
        window.setTimeout(tryScroll, attempts === 1 ? 280 : 650);
      }
    }

    window.setTimeout(tryScroll, 60);

    window.addEventListener('hashchange', function () {
      scrollToHashSection();
    });
  }

  /* ——— Menu ——— */
  function initMenu(onPrices, onContact) {
    var btn = $('lpMenuBtn');
    var panel = $('lpMenuPanel');
    var backdrop = $('lpMenuBackdrop');
    if (!btn || !panel || !backdrop) return { close: function () {} };

    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      panel.hidden = false;
      backdrop.hidden = false;
      requestAnimationFrame(function () {
        panel.classList.toggle('is-open', open);
        backdrop.classList.toggle('is-open', open);
      });
      if (!open) {
        window.setTimeout(function () {
          if (btn.getAttribute('aria-expanded') !== 'true') {
            panel.hidden = true;
            backdrop.hidden = true;
          }
        }, 320);
      }
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });

    backdrop.addEventListener('click', function () {
      setOpen(false);
    });

    panel.querySelectorAll('[data-lp-nav]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) !== '#') return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        setOpen(false);
        navigateToSection(target);
      });
    });

    var pricesBtn = $('lpPricesOpen');
    if (pricesBtn) {
      pricesBtn.addEventListener('click', function () {
        setOpen(false);
        if (onPrices) onPrices();
      });
    }

    var contactBtn = $('lpContactOpen');
    if (contactBtn) {
      contactBtn.addEventListener('click', function () {
        setOpen(false);
        if (onContact) onContact();
      });
    }

    return {
      close: function () {
        setOpen(false);
      },
      isOpen: function () {
        return btn.getAttribute('aria-expanded') === 'true';
      }
    };
  }

  /* ——— Prices modal ——— */
  function initPricesModal() {
    var modal = $('lpPricesModal');
    if (!modal) {
      return { open: function () {}, close: function () {}, isOpen: function () { return false; } };
    }

    function setOpen(open) {
      if (open) {
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lp-modal-open');
        requestAnimationFrame(function () {
          modal.classList.add('is-open');
        });
      } else {
        modal.classList.remove('is-open');
        document.body.classList.remove('lp-modal-open');
        window.setTimeout(function () {
          if (!modal.classList.contains('is-open')) {
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
          }
        }, 280);
      }
    }

    modal.querySelectorAll('[data-lp-prices-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        setOpen(false);
      });
    });

    return {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      isOpen: function () { return modal.classList.contains('is-open'); }
    };
  }

  /* ——— Reveal ——— */
  function initReveal() {
    var scenes = document.querySelectorAll('.lp-scene');

    if (!('IntersectionObserver' in window)) {
      scenes.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          if (entry.target.id === 'demos') {
            entry.target.querySelectorAll('.lp-project.lp-reveal').forEach(function (card) {
              card.classList.add('is-in');
            });
          }
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.28 }
    );

    scenes.forEach(function (el) {
      io.observe(el);
    });
  }

  function observeNewProjects() {
    var cards = document.querySelectorAll('.lp-project:not(.lp-reveal)');
    if (!cards.length) return;
    cards.forEach(function (el, i) {
      el.classList.add('lp-reveal');
      el.style.setProperty('--lp-stagger', String(220 + Math.min(i, 5) * 100) + 'ms');
    });

    var scene = document.getElementById('demos');
    if (scene && scene.classList.contains('is-in')) {
      requestAnimationFrame(function () {
        cards.forEach(function (el) {
          el.classList.add('is-in');
        });
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    cards.forEach(function (el) {
      io.observe(el);
    });
  }

  function projectCard(p) {
    var slug = p.slug || '';
    var name = p.nombre || slug || 'Proyecto';
    var img = p.imagen_hero_url || '';
    var desc = shortDesc(p);
    var href = '/' + encodeURIComponent(slug);
    return (
      '<article class="lp-project">' +
        '<div class="lp-project__media">' +
          (img
            ? '<img src="' + escapeHtml(img) + '" alt="" loading="lazy" decoding="async">'
            : '') +
        '</div>' +
        '<div class="lp-project__body">' +
          '<h3 class="lp-project__name">' + escapeHtml(name) + '</h3>' +
          '<p class="lp-project__desc">' + escapeHtml(desc) + '</p>' +
          '<a class="lp-project__cta" href="' + escapeHtml(href) + '">' +
            'Explorar <span aria-hidden="true">→</span>' +
          '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderProjects(list) {
    var host = $('lpProjects');
    if (!host) return;
    if (!list || !list.length) {
      host.innerHTML = '<p class="lp-projects__empty">No hay proyectos publicados.</p>';
    } else {
      host.innerHTML = list.map(projectCard).join('');
      observeNewProjects();
    }
    if (getHashSection()) {
      window.setTimeout(scrollToHashSection, 100);
    }
  }

  function normalizeRows(rows) {
    return (rows || []).map(function (row) {
      var cfg = row.proyecto_config;
      if (Array.isArray(cfg)) cfg = cfg[0] || null;
      return {
        slug: row.slug,
        nombre: row.nombre,
        descripcion: row.descripcion || '',
        imagen_hero_url: (cfg && cfg.imagen_hero_url) || row.imagen_hero_url || ''
      };
    });
  }

  async function loadProjects() {
    try {
      if (typeof supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') {
        renderProjects(FALLBACK_PROJECTS);
        return;
      }
      var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      var result = await client
        .from('proyectos')
        .select('slug, nombre, descripcion, publicado, updated_at, proyecto_config(imagen_hero_url)')
        .eq('publicado', true)
        .order('updated_at', { ascending: false })
        .limit(12);

      if (result.error) throw result.error;
      var list = normalizeRows(result.data);
      if (!list.length) list = FALLBACK_PROJECTS;
      renderProjects(list);
    } catch (err) {
      console.warn('[landing] projects fetch fallback', err);
      renderProjects(FALLBACK_PROJECTS);
    }
  }

  function boot() {
    var year = $('lpYear');
    if (year) year.textContent = String(new Date().getFullYear());

    var prices = initPricesModal();
    var assist =
      typeof ProductAssistant !== 'undefined'
        ? ProductAssistant.mount({ context: 'platform' })
        : { open: function () {}, close: function () {}, isOpen: function () { return false; } };

    var menu = initMenu(
      function () {
        prices.open();
      },
      function () {
        assist.open();
      }
    );

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (prices.isOpen()) {
        prices.close();
        return;
      }
      if (assist.isOpen()) {
        assist.close();
        return;
      }
      if (menu.isOpen && menu.isOpen()) menu.close();
    });

    initReveal();
    initHashLanding();
    loadProjects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
