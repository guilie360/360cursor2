/* BOXIES landing — menu, scroll, projects, chat UI (no backend) */
(function () {
  var FALLBACK_PROJECTS = [
    {
      slug: 'demo1',
      nombre: 'Proyecto Demo',
      imagen_hero_url:
        'https://emefdwzdfnqgjohbtvvn.supabase.co/storage/v1/object/public/proyectos-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/hero/image/hero/image-1783567174957.jpg'
    },
    {
      slug: 'demo2',
      nombre: 'Proyecto Demo 2',
      imagen_hero_url:
        'https://emefdwzdfnqgjohbtvvn.supabase.co/storage/v1/object/public/proyectos-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/hero/image/hero/image-1783567174957.jpg'
    },
    {
      slug: 'demo3',
      nombre: 'Proyecto Demo 3',
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

  /* ——— Menu ——— */
  function initMenu() {
    var btn = $('lpMenuBtn');
    var panel = $('lpMenuPanel');
    var backdrop = $('lpMenuBackdrop');
    if (!btn || !panel || !backdrop) return;

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

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    panel.querySelectorAll('[data-lp-nav]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) !== '#') return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        setOpen(false);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ——— Reveal ——— */
  function initReveal() {
    var nodes = document.querySelectorAll(
      '.lp-section__inner, .lp-pricing, .lp-concepts, .lp-chat, .lp-advisor, .lp-project'
    );
    nodes.forEach(function (el) {
      el.classList.add('lp-reveal');
    });

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  function observeNewProjects() {
    var cards = document.querySelectorAll('.lp-project:not(.lp-reveal)');
    if (!cards.length) return;
    cards.forEach(function (el) {
      el.classList.add('lp-reveal');
    });
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    cards.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ——— Projects ——— */
  function projectCard(p) {
    var slug = p.slug || '';
    var name = p.nombre || slug || 'Proyecto';
    var img = p.imagen_hero_url || '';
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
          '<a class="lp-project__cta" href="' + escapeHtml(href) + '">Explorar</a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderProjects(list) {
    var host = $('lpProjects');
    if (!host) return;
    if (!list || !list.length) {
      host.innerHTML = '<p class="lp-projects__empty">No hay proyectos publicados.</p>';
      return;
    }
    host.innerHTML = list.map(projectCard).join('');
    observeNewProjects();
  }

  function normalizeRows(rows) {
    return (rows || []).map(function (row) {
      var cfg = row.proyecto_config;
      if (Array.isArray(cfg)) cfg = cfg[0] || null;
      return {
        slug: row.slug,
        nombre: row.nombre,
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
        .select('slug, nombre, publicado, updated_at, proyecto_config(imagen_hero_url)')
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

  /* ——— Chat (UI only) ——— */
  function appendBubble(text, who) {
    var box = $('lpChatMessages');
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'lp-chat__bubble lp-chat__bubble--' + (who === 'user' ? 'user' : 'bot');
    div.innerHTML = '<p>' + escapeHtml(text) + '</p>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function initChat() {
    var form = $('lpChatForm');
    var input = $('lpChatInput');
    var advisor = $('lpAdvisorBtn');
    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (input.value || '').trim();
        if (!text) return;
        appendBubble(text, 'user');
        input.value = '';
        window.setTimeout(function () {
          appendBubble(
            'Gracias. Pronto podré responder con más detalle. Mientras tanto, explora los proyectos o habla con un asesor.',
            'bot'
          );
        }, 550);
      });
    }
    if (advisor) {
      advisor.addEventListener('click', function () {
        if (advisor.classList.contains('is-noted')) return;
        advisor.classList.add('is-noted');
        advisor.textContent = 'Próximamente';
        appendBubble('Un asesor se pondrá en contacto contigo pronto. (Placeholder)', 'bot');
      });
    }
  }

  function initFooterYear() {
    var el = $('lpYear');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function boot() {
    initFooterYear();
    initMenu();
    initReveal();
    initChat();
    loadProjects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
