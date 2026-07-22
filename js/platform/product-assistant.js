/**
 * ProductAssistant — shared floating assistant (landing + project showrooms).
 * Contexts differ only by title, greeting, suggestions, and advisor WhatsApp href.
 */
var ProductAssistant = (function () {
  var DEFAULT_WA =
    'https://wa.me/570000000000?text=' +
    encodeURIComponent('Hola, me interesan los servicios de 360Preventa.');

  var CONTEXTS = {
    platform: {
      title: 'Asistente 360Preventa',
      greeting: [
        'Hola.',
        'Soy el asistente de 360Preventa.',
        'Puedo ayudarte a conocer la plataforma, resolver dudas y orientarte sobre nuestros servicios.'
      ],
      suggestions: [
        {
          label: '¿Qué es 360Preventa?',
          reply:
            '360Preventa es una plataforma para crear, administrar y publicar experiencias inmobiliarias web listas para compartir.'
        },
        {
          label: '¿Cómo funciona?',
          reply:
            'Configuras el proyecto, organizas el contenido y lo publicas como una experiencia navegable. Todo desde un solo lugar.'
        },
        {
          label: '¿Qué incluye un Showroom Digital 360?',
          reply:
            'Una experiencia web de preventa con recorridos inmersivos, contenido administrable y publicación lista para compartir.'
        },
        {
          label: 'Solicitar una demostración.',
          reply:
            'Perfecto. Déjanos tu consulta aquí o escribe “demostración”. Pronto te orientaremos sobre una demo personalizada.'
        }
      ],
      advisorLabel: 'Hablar por WhatsApp',
      handoffCopy: '¿No encontraste lo que buscabas?',
      fallbackReply:
        'Gracias. Pronto podré responder con más detalle. Mientras tanto, explora las experiencias publicadas.'
    },
    project: {
      title: 'Asistente del proyecto',
      greeting: [
        'Hola.',
        'Soy el asistente de este proyecto.',
        'Puedo ayudarte a resolver dudas sobre esta propiedad, sus características, precios y proceso de compra.'
      ],
      suggestions: [
        {
          label: 'Cuéntame sobre este proyecto.',
          reply:
            'Este showroom presenta la preventa del proyecto. Pronto podré darte detalles específicos; mientras tanto explora las zonas y contenidos del menú.'
        },
        {
          label: '¿Qué incluye?',
          reply:
            'Cada proyecto puede incluir recorridos, tipologías, amenidades y material comercial. Revisa el menú para ver lo disponible aquí.'
        },
        {
          label: '¿Qué zonas tiene?',
          reply:
            'Las zonas publicadas aparecen en el menú del showroom. Ábrelo para recorrerlas. Pronto podré listarlas aquí automáticamente.'
        },
        {
          label: '¿Cómo puedo comprar?',
          reply:
            'El proceso de compra lo acompaña el equipo comercial. Usa “Hablar con un asesor” para continuar por WhatsApp.'
        },
        {
          label: '¿Cómo agendo una visita?',
          reply:
            'Puedes agendar una visita con un asesor. Pulsa “Hablar con un asesor” y te orientamos por WhatsApp.'
        }
      ],
      advisorLabel: 'Hablar con un asesor',
      handoffCopy: '¿No encontraste lo que buscabas?',
      fallbackReply:
        'Gracias. Pronto podré responder con más detalle. Si lo prefieres, habla con un asesor.'
    }
  };

  var instance = null;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mergeContext(opts) {
    opts = opts || {};
    var base = CONTEXTS[opts.context] || CONTEXTS.platform;
    return {
      title: opts.title || base.title,
      greeting: opts.greeting || base.greeting,
      suggestions: opts.suggestions || base.suggestions,
      advisorLabel: opts.advisorLabel || base.advisorLabel,
      handoffCopy: opts.handoffCopy || base.handoffCopy,
      fallbackReply: opts.fallbackReply || base.fallbackReply,
      advisorHref: opts.advisorHref || DEFAULT_WA,
      fabAriaLabel: opts.fabAriaLabel || ('Abrir ' + (opts.title || base.title))
    };
  }

  function greetingHtml(lines) {
    return (lines || [])
      .map(function (line) {
        return '<p>' + escapeHtml(line) + '</p>';
      })
      .join('');
  }

  function chipsHtml(suggestions) {
    return (suggestions || [])
      .map(function (s) {
        return (
          '<button type="button" class="pa-chip" data-pa-suggest="' +
          escapeHtml(s.label) +
          '">' +
          escapeHtml(s.label) +
          '</button>'
        );
      })
      .join('');
  }

  function buildMarkup(cfg) {
    var replyMap = {};
    (cfg.suggestions || []).forEach(function (s) {
      replyMap[s.label] = s.reply;
    });

    return {
      replyMap: replyMap,
      html:
        '<button type="button" class="pa-fab" data-pa-fab aria-expanded="false" aria-label="' +
        escapeHtml(cfg.fabAriaLabel) +
        '">' +
        '<span class="pa-fab__mark" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="pa-root" data-pa-root hidden aria-hidden="true">' +
        '<div class="pa-backdrop" data-pa-close></div>' +
        '<div class="pa-panel" role="dialog" aria-modal="true" aria-label="' +
        escapeHtml(cfg.title) +
        '">' +
        '<header class="pa-head">' +
        '<h2 class="pa-title">' +
        escapeHtml(cfg.title) +
        '</h2>' +
        '<button type="button" class="pa-close" data-pa-close aria-label="Cerrar">×</button>' +
        '</header>' +
        '<div class="pa-body">' +
        '<div class="pa-messages" data-pa-messages>' +
        '<div class="pa-bubble pa-bubble--bot">' +
        greetingHtml(cfg.greeting) +
        '</div>' +
        '<div class="pa-suggestions" data-pa-suggestions role="group" aria-label="Sugerencias">' +
        chipsHtml(cfg.suggestions) +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="pa-handoff">' +
        '<p class="pa-handoff__copy">' +
        escapeHtml(cfg.handoffCopy) +
        '</p>' +
        '<a class="pa-wa" data-pa-wa href="' +
        escapeHtml(cfg.advisorHref) +
        '" target="_blank" rel="noopener noreferrer">' +
        '<svg class="pa-wa__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">' +
        '<path d="M12.04 2C6.58 2 2.15 6.35 2.15 11.72c0 1.99.58 3.85 1.59 5.44L2 22l5.05-1.62a10.1 10.1 0 0 0 4.99 1.24h.01c5.46 0 9.89-4.35 9.89-9.72C21.94 6.35 17.5 2 12.04 2zm5.76 13.99c-.24.67-1.39 1.23-1.93 1.31-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.24.6.82 2.07.89 2.22.07.15.12.32.02.52-.09.19-.14.32-.28.49-.14.17-.3.38-.42.51-.14.15-.28.31-.12.61.16.3.71 1.17 1.52 1.89 1.05.93 1.93 1.22 2.23 1.36.3.14.47.12.64-.07.18-.19.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.71.81 2 .95.3.15.5.22.57.34.08.13.08.74-.16 1.41z"/>' +
        '</svg>' +
        '<span>' +
        escapeHtml(cfg.advisorLabel) +
        '</span>' +
        '</a>' +
        '</div>' +
        '<form class="pa-compose" data-pa-form autocomplete="off">' +
        '<label class="pa-visually-hidden" for="paChatInput">Mensaje</label>' +
        '<input id="paChatInput" type="text" placeholder="Escribe un mensaje…" maxlength="400">' +
        '<button type="submit" class="pa-send" aria-label="Enviar">↑</button>' +
        '</form>' +
        '</div>' +
        '</div>'
    };
  }

  function mount(opts) {
    if (instance) {
      instance.destroy();
      instance = null;
    }

    var cfg = mergeContext(opts);
    var built = buildMarkup(cfg);
    var wrap = document.createElement('div');
    wrap.className = 'pa-host';
    wrap.setAttribute('data-pa-context', opts && opts.context ? opts.context : 'platform');
    wrap.innerHTML = built.html;
    document.body.appendChild(wrap);

    var fab = wrap.querySelector('[data-pa-fab]');
    var root = wrap.querySelector('[data-pa-root]');
    var form = wrap.querySelector('[data-pa-form]');
    var input = wrap.querySelector('#paChatInput');
    var messages = wrap.querySelector('[data-pa-messages]');
    var suggestions = wrap.querySelector('[data-pa-suggestions]');
    var replyMap = built.replyMap;

    function setOpen(open) {
      if (!fab || !root) return;
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(function () {
          root.classList.add('is-open');
          fab.classList.add('is-active');
        });
        if (input) window.setTimeout(function () { input.focus(); }, 200);
      } else {
        root.classList.remove('is-open');
        fab.classList.remove('is-active');
        window.setTimeout(function () {
          if (!root.classList.contains('is-open')) {
            root.hidden = true;
            root.setAttribute('aria-hidden', 'true');
          }
        }, 280);
      }
    }

    function appendBubble(text, who) {
      if (!messages) return;
      var sug = suggestions;
      var div = document.createElement('div');
      div.className = 'pa-bubble pa-bubble--' + (who === 'user' ? 'user' : 'bot');
      div.innerHTML = '<p>' + escapeHtml(text) + '</p>';
      if (sug) messages.insertBefore(div, sug);
      else messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendUserMessage(text) {
      text = String(text || '').trim();
      if (!text) return;
      appendBubble(text, 'user');
      var reply = replyMap[text] || cfg.fallbackReply;
      window.setTimeout(function () {
        appendBubble(reply, 'bot');
      }, 480);
    }

    fab.addEventListener('click', function () {
      setOpen(fab.getAttribute('aria-expanded') !== 'true');
    });

    wrap.querySelectorAll('[data-pa-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        setOpen(false);
      });
    });

    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        sendUserMessage(text);
      });
    }

    if (suggestions) {
      suggestions.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-pa-suggest]');
        if (!chip) return;
        sendUserMessage(chip.getAttribute('data-pa-suggest') || chip.textContent || '');
      });
    }

    function onKey(e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);

    instance = {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      isOpen: function () { return root.classList.contains('is-open'); },
      setAdvisorHref: function (href) {
        var a = wrap.querySelector('[data-pa-wa]');
        if (a && href) a.setAttribute('href', href);
      },
      destroy: function () {
        document.removeEventListener('keydown', onKey);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };

    return instance;
  }

  return {
    mount: mount,
    contexts: CONTEXTS,
    getInstance: function () {
      return instance;
    }
  };
})();
