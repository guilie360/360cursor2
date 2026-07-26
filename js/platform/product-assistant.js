/**
 * ProductAssistant — shared floating assistant (landing + project showrooms).
 * Contexts differ by greeting/suggestions; replies use a shared knowledge base
 * so the same module is ready for a future real AI backend.
 */
var ProductAssistant = (function () {
  var DEFAULT_WA =
    'https://wa.me/570000000000?text=' +
    encodeURIComponent('Hola, me interesan los servicios de 360Preventa.');

  var UNKNOWN_REPLY =
    'No tengo esa información disponible todavía en este asistente.\n\n' +
    'Si necesitas un dato concreto del proyecto o de la plataforma, usa “Hablar con un asesor” y el equipo te responde por WhatsApp.';

  /**
   * Structured knowledge entries.
   * score = number of keyword hits; first highest wins.
   * context: 'shared' | 'platform' | 'project'
   */
  var KNOWLEDGE = [
    {
      id: 'what-is',
      contexts: ['shared', 'platform'],
      keywords: ['que es', 'qué es', '360preventa', 'plataforma', 'quien son', 'quiénes son'],
      reply:
        '360Preventa es una plataforma para crear, administrar y publicar showrooms digitales de preventa inmobiliaria.\n\n' +
        'En lugar de depender de una web estática o de una app que el visitante deba instalar, publicas una experiencia navegable —recorridos, tipologías, planos, videos y contacto— lista para compartir por enlace.'
    },
    {
      id: 'how-works',
      contexts: ['shared', 'platform'],
      keywords: ['como funciona', 'cómo funciona', 'funcionamiento', 'proceso', 'configurar'],
      reply:
        'El flujo es sencillo: configuras el proyecto, organizas el contenido del showroom y lo publicas como una experiencia web.\n\n' +
        'Desde un solo lugar puedes actualizar recorridos, tipologías, galería, ubicación y datos de contacto. Cuando hay cambios, se reflejan en el enlace público sin redeploy manual por parte del visitante.'
    },
    {
      id: 'advantages',
      contexts: ['shared', 'platform'],
      keywords: ['ventaja', 'beneficios', 'por que', 'por qué', 'diferencia plataforma'],
      reply:
        'La ventaja principal es tener un showroom digital completo, administrable y compartible, pensado para preventa.\n\n' +
        'El visitante entra desde el celular o el computador, explora el proyecto con naturalidad y puede continuar con un asesor cuando lo necesite —sin instalar aplicaciones.'
    },
    {
      id: 'includes',
      contexts: ['shared', 'platform', 'project'],
      keywords: ['incluye', 'que incluye', 'qué incluye', 'contenido', 'modulos', 'módulos'],
      reply:
        'Un Showroom Digital 360 puede incluir recorridos inmersivos, renders, videos, tipologías, planos, galería, ubicación y canales de contacto.\n\n' +
        'Lo publicado en cada proyecto depende de lo que la constructora haya cargado. En este showroom, abre el menú (Explorar) para ver exactamente qué zonas y contenidos están disponibles.'
    },
    {
      id: 'showroom-360',
      contexts: ['shared', 'platform', 'project'],
      keywords: ['recorrido', '360', 'tour', 'inmersivo', 'render', 'renders', 'video', 'videos'],
      reply:
        'Los showrooms pueden combinar recorridos 360°, renders y videos para que el visitante entienda el proyecto antes de visitarlo en persona.\n\n' +
        'Si este proyecto tiene recorridos o material audiovisual publicado, los encontrarás desde el menú. Si no ves alguno, puede que aún no esté cargado; un asesor puede confirmarlo.'
    },
    {
      id: 'typologies',
      contexts: ['shared', 'project'],
      keywords: ['tipologia', 'tipología', 'tipologias', 'tipologías', 'apartamento', 'apartamentos', 'vivienda', 'viviendas', 'tipos'],
      reply:
        'Las tipologías describen los tipos de vivienda del proyecto: áreas, distribución y, cuando está publicado, precio de referencia.\n\n' +
        'Para verlas aquí, entra al menú y abre la sección de tipologías o unidades. Si aún no aparecen, esa información puede no estar publicada todavía —en ese caso conviene hablar con un asesor.'
    },
    {
      id: 'plans',
      contexts: ['shared', 'project'],
      keywords: ['plano', 'planos', 'planta', 'plantas'],
      reply:
        'Los planos ayudan a entender la distribución de cada tipología o zona del proyecto.\n\n' +
        'Cuando están publicados, suelen estar asociados a tipologías, descargas o galería dentro del menú. Si no los encuentras en este showroom, un asesor puede enviártelos.'
    },
    {
      id: 'gallery',
      contexts: ['shared', 'project'],
      keywords: ['galeria', 'galería', 'fotos', 'imagenes', 'imágenes', 'amenidad', 'amenidades', 'zonas', 'zonas comunes', 'zona comun', 'zona común'],
      reply:
        'La galería y las amenidades muestran el carácter del proyecto: zonas comunes, espacios sociales y material visual de apoyo.\n\n' +
        'Revisa el menú del showroom para ver qué se publicó. Si buscas un detalle concreto que no aparece, usa “Hablar con un asesor”.'
    },
    {
      id: 'location',
      contexts: ['shared', 'project'],
      keywords: ['ubicacion', 'ubicación', 'donde queda', 'dónde queda', 'direccion', 'dirección', 'mapa', 'localizacion', 'localización'],
      reply:
        'La ubicación del proyecto suele estar en la sección de localización o contacto del showroom, con mapa o dirección cuando está configurada.\n\n' +
        'Ábrela desde el menú. Si necesitas indicaciones precisas o puntos de referencia, un asesor puede orientarte.'
    },
    {
      id: 'contact',
      contexts: ['shared', 'platform', 'project'],
      keywords: ['contacto', 'telefono', 'teléfono', 'whatsapp', 'email', 'correo', 'hablar', 'asesor'],
      reply:
        'Puedes continuar con un asesor comercial en cualquier momento.\n\n' +
        'Usa el botón “Hablar con un asesor” en este asistente: abre WhatsApp con el canal configurado para este proyecto o para 360Preventa. También puedes revisar la sección de contacto del showroom si está publicada.'
    },
    {
      id: 'presale',
      contexts: ['shared', 'project'],
      keywords: ['preventa', 'compra', 'comprar', 'separacion', 'separación', 'reservar', 'reserva'],
      reply:
        'En preventa, el proceso comercial suele incluir orientación sobre tipologías, disponibilidad, separación y siguientes pasos con la constructora.\n\n' +
        'Este showroom te ayuda a conocer el proyecto; la compra formal la acompaña el equipo comercial. Si quieres avanzar, pulsa “Hablar con un asesor”.'
    },
    {
      id: 'finance',
      contexts: ['shared', 'project'],
      keywords: ['financiacion', 'financiación', 'credito', 'crédito', 'hipoteca', 'cuota', 'banco'],
      reply:
        'Las condiciones de financiación dependen de la constructora, del proyecto y de tu perfil crediticio.\n\n' +
        'Aquí puedes explorar el proyecto; para cuotas, bancos aliados o simulaciones concretas, lo más preciso es hablar con un asesor comercial.'
    },
    {
      id: 'visit',
      contexts: ['shared', 'project'],
      keywords: ['visita', 'agendar', 'agendo', 'cita', 'recorrido presencial', 'sala de ventas'],
      reply:
        'Puedes agendar una visita con el equipo comercial para conocer el proyecto o la sala de ventas.\n\n' +
        'Pulsa “Hablar con un asesor” e indícales el día y horario que te funcionan. Ellos confirman disponibilidad y te dan las indicaciones.'
    },
    {
      id: 'quote',
      contexts: ['shared', 'project'],
      keywords: ['cotizacion', 'cotización', 'cotizar', 'precio', 'precios', 'valor', 'cuanto cuesta', 'cuánto cuesta'],
      reply:
        'Los precios y cotizaciones dependen de la tipología, la etapa de preventa y las condiciones vigentes.\n\n' +
        'Si el showroom publica valores de referencia, los verás en tipologías o unidades. Para una cotización formal, habla con un asesor: te orientan con la información actualizada.'
    },
    {
      id: 'tech-web',
      contexts: ['shared', 'platform'],
      keywords: ['tecnologia', 'tecnología', 'web', 'celular', 'movil', 'móvil', 'app', 'instalar', 'enlace', 'link', 'compartir proyecto'],
      reply:
        '360Preventa es 100% web: se abre en el navegador del celular o del computador, sin instalar aplicaciones.\n\n' +
        'Puedes compartir el showroom con un enlace. En el proyecto, el botón Compartir facilita enviarlo por el canal que prefieras.'
    },
    {
      id: 'share-how',
      contexts: ['shared', 'project'],
      keywords: ['compartir', 'enviar', 'link del proyecto', 'enlace del proyecto'],
      reply:
        'Para compartir este proyecto, usa el botón Compartir del showroom (arriba a la derecha en móvil, o el icono flotante en escritorio).\n\n' +
        'Así envías el enlace de la experiencia para que otra persona la abra directamente en su navegador.'
    },
    {
      id: 'explorar-vs-iniciar',
      contexts: ['shared', 'project'],
      keywords: ['explorar', 'iniciar', 'diferencia', 'menu', 'menú', 'boton explorar', 'botón explorar'],
      reply:
        '“Explorar” abre el menú del showroom: ahí navegas tipologías, recorridos, amenidades, ubicación y el resto del contenido publicado.\n\n' +
        '“Iniciar” arranca la experiencia principal del proyecto (por ejemplo el recorrido o la secuencia definida por la constructora). Ambos se complementan: uno organiza el contenido y el otro te sumerge en la experiencia.'
    },
    {
      id: 'demo-request',
      contexts: ['platform'],
      keywords: ['demostracion', 'demostración', 'demo', 'solicitar', 'prueba'],
      reply:
        'Perfecto. Si te interesa una demostración de 360Preventa, cuéntanos qué tipo de proyecto manejas o pulsa “Hablar por WhatsApp”.\n\n' +
        'También puedes recorrer los showrooms publicados en la sección Demos de la landing para ver la experiencia en vivo.'
    },
    {
      id: 'about-project',
      contexts: ['project'],
      keywords: ['cuentame', 'cuéntame', 'este proyecto', 'sobre el proyecto', 'proyecto'],
      reply:
        'Este showroom presenta la preventa del proyecto de forma interactiva: puedes recorrer el contenido publicado, revisar tipologías y avanzar con un asesor cuando quieras.\n\n' +
        'Te recomiendo abrir Explorar para ver todo lo disponible aquí. Si buscas un dato puntual que no esté publicado, “Hablar con un asesor” es el siguiente paso.'
    }
  ];

  var CONTEXTS = {
    platform: {
      title: 'Asistente 360Preventa',
      greeting: [
        'Hola.',
        'Soy el asistente de 360Preventa.',
        'Puedo ayudarte a conocer la plataforma, resolver dudas y orientarte sobre nuestros servicios.'
      ],
      suggestions: [
        { label: '¿Qué es 360Preventa?' },
        { label: '¿Cómo funciona?' },
        { label: '¿Qué incluye un Showroom Digital 360?' },
        { label: 'Solicitar una demostración.' }
      ],
      advisorLabel: 'Hablar por WhatsApp',
      handoffCopy: '¿No encontraste lo que buscabas?'
    },
    project: {
      title: 'Asistente del proyecto',
      greeting: [
        'Hola.',
        'Soy el asistente de este proyecto.',
        'Puedo ayudarte a resolver dudas sobre esta propiedad, sus características, precios y proceso de compra.'
      ],
      suggestions: [
        { label: 'Cuéntame sobre este proyecto.' },
        { label: '¿Qué incluye?' },
        { label: '¿Qué zonas tiene?' },
        { label: '¿Cómo puedo comprar?' },
        { label: '¿Cómo agendo una visita?' }
      ],
      advisorLabel: 'Hablar con un asesor',
      handoffCopy: '¿No encontraste lo que buscabas?'
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

  function stripDiacritics(s) {
    try {
      return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
      return String(s);
    }
  }

  function normalizeQuery(text) {
    return stripDiacritics(String(text || ''))
      .toLowerCase()
      .replace(/[¿?¡!.,;:()"'“”‘’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function replyToHtml(text) {
    return String(text || '')
      .split(/\n\n+/)
      .map(function (block) {
        return '<p>' + escapeHtml(block.trim()) + '</p>';
      })
      .filter(function (html) {
        return html !== '<p></p>';
      })
      .join('');
  }

  function findKnowledgeReply(text, contextName) {
    var q = normalizeQuery(text);
    if (!q) return null;

    var best = null;
    var bestScore = 0;

    for (var i = 0; i < KNOWLEDGE.length; i++) {
      var entry = KNOWLEDGE[i];
      var contexts = entry.contexts || ['shared'];
      var allowed =
        contexts.indexOf('shared') !== -1 ||
        contexts.indexOf(contextName) !== -1;
      if (!allowed) continue;

      var score = 0;
      var keys = entry.keywords || [];
      for (var k = 0; k < keys.length; k++) {
        var key = normalizeQuery(keys[k]);
        if (!key) continue;
        if (q === key || q.indexOf(key) !== -1) {
          score += key.length > 8 ? 3 : 2;
        } else {
          var parts = key.split(' ');
          var partHits = 0;
          for (var p = 0; p < parts.length; p++) {
            if (parts[p].length > 2 && q.indexOf(parts[p]) !== -1) partHits += 1;
          }
          if (partHits && partHits === parts.length) score += 2;
          else if (partHits >= 2) score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    if (best && bestScore >= 2) return best.reply;
    return null;
  }

  function mergeContext(opts) {
    opts = opts || {};
    var contextName = opts.context === 'project' ? 'project' : 'platform';
    var base = CONTEXTS[contextName] || CONTEXTS.platform;
    return {
      contextName: contextName,
      title: opts.title || base.title,
      greeting: opts.greeting || base.greeting,
      suggestions: opts.suggestions || base.suggestions,
      advisorLabel: opts.advisorLabel || base.advisorLabel,
      handoffCopy: opts.handoffCopy || base.handoffCopy,
      fallbackReply: opts.fallbackReply || UNKNOWN_REPLY,
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
        var label = s.label || s;
        return (
          '<button type="button" class="pa-chip" data-pa-suggest="' +
          escapeHtml(label) +
          '">' +
          escapeHtml(label) +
          '</button>'
        );
      })
      .join('');
  }

  function resolveReply(text, cfg) {
    var exact = null;
    (cfg.suggestions || []).forEach(function (s) {
      if (s.label === text && s.reply) exact = s.reply;
    });
    if (exact) return exact;

    var fromKb = findKnowledgeReply(text, cfg.contextName);
    if (fromKb) return fromKb;

    return cfg.fallbackReply;
  }

  function buildMarkup(cfg) {
    return {
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
        '<input id="paChatInput" type="text" enterkeyhint="send" inputmode="text" placeholder="Escribe un mensaje…" maxlength="400" autocomplete="off" autocapitalize="sentences">' +
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
    wrap.setAttribute('data-pa-context', cfg.contextName);
    wrap.innerHTML = built.html;
    document.body.appendChild(wrap);

    var fab = wrap.querySelector('[data-pa-fab]');
    var root = wrap.querySelector('[data-pa-root]');
    var panel = wrap.querySelector('.pa-panel');
    var form = wrap.querySelector('[data-pa-form]');
    var input = wrap.querySelector('#paChatInput');
    var messages = wrap.querySelector('[data-pa-messages]');
    var suggestions = wrap.querySelector('[data-pa-suggestions]');
    var vvCleanup = null;

    function isPhone() {
      return window.matchMedia('(max-width: 600px)').matches;
    }

    function syncVisualViewport() {
      var vv = window.visualViewport;
      if (!vv || !root) return;
      wrap.style.setProperty('--pa-vv-height', Math.round(vv.height) + 'px');
      wrap.style.setProperty('--pa-vv-offset', Math.round(vv.offsetTop) + 'px');
      wrap.style.setProperty('--pa-vv-bottom', Math.round(vv.offsetTop + vv.height) + 'px');
      var keyboardOpen = isPhone() && window.innerHeight - vv.height > 100;
      root.classList.toggle('is-keyboard', keyboardOpen && root.classList.contains('is-open'));
      if (keyboardOpen && messages) {
        messages.scrollTop = messages.scrollHeight;
      }
    }

    function bindVisualViewport() {
      var vv = window.visualViewport;
      if (!vv) return function () {};
      var onChange = function () {
        syncVisualViewport();
      };
      vv.addEventListener('resize', onChange);
      vv.addEventListener('scroll', onChange);
      window.addEventListener('resize', onChange);
      syncVisualViewport();
      return function () {
        vv.removeEventListener('resize', onChange);
        vv.removeEventListener('scroll', onChange);
        window.removeEventListener('resize', onChange);
      };
    }

    function setOpen(open) {
      if (!fab || !root) return;
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        /* Atomic prepare (V5.9.33) then menu-equivalent slide: right → left.
           Panel starts off-viewport; backdrop covers hero before motion begins. */
        root.classList.remove('is-entered');
        root.classList.add('is-preparing');
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('pa-open');
        root.classList.add('is-open');
        fab.classList.add('is-active');
        syncVisualViewport();
        if (panel) {
          void panel.offsetHeight;
        }
        if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
          GlobalClose.update();
        }
        if (typeof playSound === 'function') playSound('menuOpen');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (!root.classList.contains('is-open')) return;
            root.classList.remove('is-preparing');
            if (panel) void panel.offsetWidth;
            requestAnimationFrame(function () {
              if (!root.classList.contains('is-open')) return;
              root.classList.add('is-entered');
            });
          });
        });
        /* En móvil no autofocus: evita teclado inmediato; el usuario toca el input. */
        if (input && !isPhone()) {
          window.setTimeout(function () {
            input.focus();
          }, 200);
        }
      } else {
        root.classList.remove('is-preparing');
        root.classList.remove('is-entered');
        root.classList.remove('is-keyboard');
        fab.classList.remove('is-active');
        if (input) input.blur();
        if (typeof playSound === 'function') playSound('menuClose');
        if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
          GlobalClose.update();
        }
        /* Keep is-open / pa-open until slide-out finishes (same 0.55s as menu). */
        window.setTimeout(function () {
          if (root.classList.contains('is-entered')) return;
          root.classList.remove('is-open');
          document.body.classList.remove('pa-open');
          root.hidden = true;
          root.setAttribute('aria-hidden', 'true');
          if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
            GlobalClose.update();
          }
        }, 550);
      }
    }

    function appendBubble(text, who) {
      if (!messages) return;
      var sug = suggestions;
      var div = document.createElement('div');
      div.className = 'pa-bubble pa-bubble--' + (who === 'user' ? 'user' : 'bot');
      if (who === 'user') {
        div.innerHTML = '<p>' + escapeHtml(text) + '</p>';
      } else {
        div.innerHTML = replyToHtml(text);
      }
      if (sug) messages.insertBefore(div, sug);
      else messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendUserMessage(text) {
      text = String(text || '').trim();
      if (!text) return;
      appendBubble(text, 'user');
      var reply = resolveReply(text, cfg);
      window.setTimeout(function () {
        appendBubble(reply, 'bot');
        syncVisualViewport();
      }, 420);
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
      input.addEventListener('focus', function () {
        window.setTimeout(syncVisualViewport, 50);
        window.setTimeout(syncVisualViewport, 300);
      });
      input.addEventListener('blur', function () {
        window.setTimeout(function () {
          if (root) root.classList.remove('is-keyboard');
          syncVisualViewport();
        }, 120);
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
    vvCleanup = bindVisualViewport();

    instance = {
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      isOpen: function () {
        return root.classList.contains('is-open');
      },
      setAdvisorHref: function (href) {
        var a = wrap.querySelector('[data-pa-wa]');
        if (a && href) a.setAttribute('href', href);
      },
      destroy: function () {
        document.removeEventListener('keydown', onKey);
        if (typeof vvCleanup === 'function') vvCleanup();
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };

    return instance;
  }

  return {
    mount: mount,
    contexts: CONTEXTS,
    knowledge: KNOWLEDGE,
    getInstance: function () {
      return instance;
    }
  };
})();
