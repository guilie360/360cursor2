/**
 * QuotationProposalsPage — proposals picker as an in-document section (V7.2.85).
 * Mounted once beside the hero; shown/hidden via presentation state (no route change).
 */
var QuotationProposalsPage = (function () {
  /* TAROA public WhatsApp (CO). Digits only with country code. */
  var WHATSAPP_NUMBER = '573226834084';
  var PROPOSALS = [
    {
      id: 'still',
      title: 'Still',
      price: '$3.500.000',
      blurb: 'Presentación interactiva\nbasada en imágenes.',
      waMessage: 'Primo, me voy por STILL'
    },
    {
      id: 'motion',
      title: 'Motion',
      price: '$5.000.000',
      blurb: 'Presentación interactiva basada en imágenes videos y animaciones.',
      waMessage: 'Primo, me voy por MOTION'
    }
  ];

  var COMPARE_DIFFS = [
    { label: 'Videos y animaciones', still: '—', motion: '✓' },
    { label: 'Vista aérea del proyecto', still: '—', motion: '✓' },
    { label: 'Identidad visual inicial (logo)', still: '—', motion: '✓' },
    { label: 'Presentación en tablets y celulares', still: '—', motion: '✓' },
    { label: 'Moodboard de materiales', still: '—', motion: '✓' },
    { label: 'Renders exteriores (cantidad aproximada)', still: '4–6', motion: '10–12' }
  ];

  var COMPARE_SHARED = [
    { label: 'Diseño de fachada (2 tipologías)', still: '✓', motion: '✓' },
    { label: 'Modelado 3D', still: '✓', motion: '✓' },
    { label: 'Implantación conceptual', still: '✓', motion: '✓' },
    { label: 'Plantas amobladas (4)', still: '✓', motion: '✓' },
    { label: 'Mini brochure ejecutivo', still: '✓', motion: '✓' },
    { label: 'Link personalizado', still: '✓', motion: '✓' },
    { label: 'Música ambiental', still: '✓', motion: '✓' },
    { label: 'Presentación en PC', still: '✓', motion: '✓' },
    { label: 'Presentación por imágenes', still: '✓', motion: '✓' }
  ];

  var MIRALAGO_COMPARE = {
    stillLabel: 'CORE',
    motionLabel: 'PLUS',
    motionSub: 'Mayor alcance visual',
    sections: [
      {
        title: '01. Modelado 3D y arquitectura',
        rows: [
          { label: 'Proyecto 3D', still: '✓', motion: '✓' },
          { label: '4–5 tipologías de apartamentos', still: '✓', motion: '✓' },
          { label: 'Sótanos', still: '✓', motion: '✓' },
          { label: 'Conjunto completo', still: '✓', motion: '✓' },
          { label: 'Entorno y exteriores', still: '✓', motion: '✓' },
          { label: 'Diseño de fachadas', still: '✓', motion: '✓' },
          { label: 'Torres y volumetría general', still: '✓', motion: '✓' }
        ]
      },
      {
        title: '02. Diseño de interiores',
        rows: [
          { label: 'Lobby', still: '✓', motion: '✓' },
          { label: 'Apartamentos modelo', still: '✓', motion: '✓' },
          { label: 'Áreas comerciales', still: '—', motion: '✓' },
          { label: 'Áreas comunes', still: '—', motion: '✓' },
          { label: 'Terraza / Bar', still: '—', motion: '✓' },
          { label: 'Vista hacia el lago', still: '—', motion: '✓' },
          { label: 'Oficina tipo', still: '—', motion: '✓' },
          { label: 'Valet Parking', still: '—', motion: '✓' }
        ]
      },
      {
        title: '03. Paisaje y espacios exteriores',
        rows: [
          { label: 'Vegetación y zonas verdes integradas al proyecto', still: '✓', motion: '✓' },
          { label: 'Representación en planta general / implantación', still: '✓', motion: '✓' },
          { label: 'Vegetación visible en renders y video', still: '✓', motion: '✓' },
          { label: 'Recorridos 360° por zonas verdes y exteriores', still: '—', motion: '✓' },
          { label: 'Desarrollo visual de zonas verdes y exteriores', still: '—', motion: '✓' }
        ],
        notes: [
          'CORE: Vegetación y zonas verdes integradas en la representación general del proyecto, visibles en renders y video sin recorridos específicos.',
          'PLUS: Incluye recorridos y visualizaciones específicas de las zonas verdes y espacios exteriores, integrándolos como parte de la experiencia del proyecto.'
        ]
      },
      {
        title: '04. Plantas amobladas',
        rows: [
          { label: 'Master Plan / planta general de implantación 2D', still: '✓', motion: '✓' },
          { label: 'Planta general de sótanos 2D', still: '✓', motion: '✓' },
          { label: 'Planta general de cubiertas 2D', still: '✓', motion: '✓' },
          { label: 'Plantas amobladas · 4–5 tipologías de apartamentos', still: '✓', motion: '✓' },
          { label: 'Planta amoblada · oficina tipo', still: '—', motion: '✓' },
          { label: 'Planta amoblada · local comercial tipo', still: '—', motion: '✓' },
          { label: 'Planta amoblada · terraza / bar', still: '—', motion: '✓' }
        ]
      },
      {
        title: '05. Visualización',
        rows: [
          { label: 'Renders realistas', still: 'Hasta 20', motion: '30+' },
          { label: 'Fotomontajes con drone', still: '—', motion: '✓' },
          { label: 'Integración del proyecto sobre fotografías aéreas reales', still: '—', motion: '✓' },
          { label: 'Vistas hacia el lago y entorno real', still: '—', motion: '✓' },
          { label: 'Áreas comerciales', still: '—', motion: '✓' },
          { label: 'Oficina tipo', still: '—', motion: '✓' },
          { label: 'Terraza / Bar', still: '—', motion: '✓' }
        ]
      },
      {
        title: '06. Recorridos 360°',
        rows: [
          { label: 'Acceso / llegada al proyecto', still: '✓', motion: '✓' },
          { label: 'Vegetación y zonas verdes', still: '—', motion: '✓' },
          { label: 'Zonas comerciales', still: '—', motion: '✓' },
          { label: 'Lobby', still: '✓', motion: '✓' },
          { label: 'Apartamentos modelo', still: '✓', motion: '✓' },
          { label: 'Oficina tipo', still: '—', motion: '✓' },
          { label: 'Áreas comunes', still: '—', motion: '✓' },
          { label: 'Terraza / Bar', still: '—', motion: '✓' },
          { label: 'Vista hacia el lago', still: '—', motion: '✓' },
          { label: 'Conjunto completo', still: '—', motion: '✓' }
        ],
        notes: [
          'CORE: el recorrido comienza en el acceso, conduce al lobby y continúa hacia los apartamentos modelo. La vegetación y los espacios exteriores forman parte del recorrido general, pero no se realizan recorridos específicos dentro de estas áreas.',
          'PLUS: el recorrido desarrolla una experiencia más amplia de llegada y exploración del proyecto, incorporando vegetación, zonas verdes, zonas comerciales, áreas comunes, lobby, oficinas, apartamentos modelo, terraza/bar y puntos destacados del conjunto.'
        ]
      },
      {
        title: '07. Video de presentación',
        rows: [
          { label: 'Video de presentación', still: '1 × aprox. 2 min', motion: '1 × aprox. 3 min' },
          { label: 'Implantación sobre contexto geográfico · Google Earth', still: '✓', motion: '✓' },
          { label: 'Acceso / llegada', still: '✓', motion: '✓' },
          { label: 'Lobby', still: '✓', motion: '✓' },
          { label: 'Apartamentos modelo', still: '✓', motion: '✓' },
          { label: 'Conjunto y zonas exteriores', still: '✓', motion: '✓' },
          { label: 'Zonas verdes y espacios ecológicos', still: '✓', motion: '✓' },
          { label: 'Zonas comerciales', still: '—', motion: '✓' },
          { label: 'Oficina tipo', still: '—', motion: '✓' },
          { label: 'Terraza / Bar', still: '—', motion: '✓' },
          { label: 'Vista hacia el lago', still: '—', motion: '✓' },
          { label: 'Entorno real', still: '—', motion: '✓' },
          { label: 'Fotomontajes con drone', still: '—', motion: '✓' },
          { label: 'Valet Parking', still: '—', motion: '✓' },
          { label: 'Presentación integral de las torres', still: '—', motion: '✓' }
        ],
        notes: [
          'CORE: video de aproximadamente 2 minutos, enfocado en la implantación del proyecto sobre contexto geográfico de Google Earth, seguido del acceso, lobby y apartamentos modelo. La vegetación y las zonas verdes forman parte de las visualizaciones y se perciben durante el recorrido general, sin ser un foco específico de la narrativa.',
          'PLUS: video de aproximadamente 3 minutos concebido como una presentación integral del proyecto. Incluye vistas aéreas y fotomontajes con drone, entorno real, acceso peatonal, vegetación, zonas verdes, zonas comerciales, espacios comunes, lobby, valet parking, apartamentos, oficinas, terraza/bar, vistas hacia el lago y las diferentes torres.'
        ]
      },
      {
        title: '08. Video ads y contenido digital',
        rows: [
          { label: 'Material visual para uso libre en redes sociales', still: '✓', motion: '✓' },
          { label: 'Videos ADS · 15 s', still: '—', motion: '3–5' },
          { label: 'Imágenes adaptables para comunicación digital', still: '✓', motion: '✓' }
        ]
      },
      {
        title: '09. Brochures y material de presentación',
        rows: [
          { label: 'Brochure para impresión física', still: '✓', motion: '✓' },
          { label: 'Presentación PDF para PC / web', still: '✓', motion: '✓' },
          { label: 'Mini brochure PDF para celular', still: '✓', motion: '✓' },
          { label: 'Integración del contenido a la web de la empresa', still: '✓', motion: '✓' }
        ]
      }
    ]
  };

  var MIRALAGO_PROJECT_ID = '9b804c82-58a4-4f22-a921-ebf215bb7285';

  function isMiralagoContext(opts) {
    opts = opts || {};
    var slug = String(opts.slug || '').trim().toLowerCase();
    var id = String(opts.projectId || '').trim().toLowerCase();
    return slug === 'miralago-propuesta' || id === MIRALAGO_PROJECT_ID;
  }

  function proposalList(opts) {
    return PROPOSALS.map(function (p) {
      var copy = {
        id: p.id,
        title: p.title,
        price: p.price,
        blurb: p.blurb,
        waMessage: p.waMessage,
        quote: null
      };
      if (isMiralagoContext(opts)) {
        if (p.id === 'still') {
          copy.title = 'CORE';
          copy.blurb = 'Presentación enfocada en el proyecto general, lobby y apartamentos tipo.';
          copy.waMessage = 'Primo, me voy por CORE';
          copy.quote = {
            proposalAmount: '$ 9.850.000 COP',
            taxAmount: '– $ 1.182.000',
            netAmount: '$ 8.668.000 COP'
          };
        }
        if (p.id === 'motion') {
          copy.title = 'PLUS';
          copy.blurb = 'Presentación completa del proyecto y sus diferentes usos, con integración de drone.';
          copy.waMessage = 'Primo, me voy por PLUS';
          copy.quote = {
            proposalAmount: '$ 14.250.000 COP',
            taxAmount: '– $ 1.710.000',
            netAmount: '$ 12.540.000 COP'
          };
        }
      }
      return copy;
    });
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function audioChromeHtml(audioSrc) {
    if (!audioSrc) return '';
    return '' +
      '<div class="qpp__audio-wrap" data-qpp-audio-wrap>' +
        '<button type="button" class="qpp__icon-btn qpp__chrome-music" data-qpp-music aria-label="Música" aria-expanded="false" aria-controls="qppAudioPanel">' +
          '<svg class="qpp__music-note" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M9.2 18.6c0 1.55-1.35 2.7-2.95 2.7S3.3 20.15 3.3 18.6s1.35-2.7 2.95-2.7c.42 0 .82.08 1.18.22V5.2l11.2-2.05v12.7c0 1.55-1.35 2.7-2.95 2.7s-2.95-1.15-2.95-2.7 1.35-2.7 2.95-2.7c.42 0 .82.08 1.18.22V6.35L9.2 8.15v10.45z"/>' +
          '</svg>' +
        '</button>' +
        '<div class="qpp__audio-panel" id="qppAudioPanel" data-qpp-audio-panel hidden>' +
          '<button type="button" class="qpp__audio-play" data-qpp-audio-toggle aria-label="Reproducir">' +
            '<svg class="qpp__audio-icon qpp__audio-icon--play" viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M8 5.5v13l11-6.5z"/>' +
            '</svg>' +
            '<svg class="qpp__audio-icon qpp__audio-icon--pause" viewBox="0 0 24 24" aria-hidden="true" hidden>' +
              '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' +
            '</svg>' +
          '</button>' +
          '<label class="qpp__audio-vol" aria-label="Volumen">' +
            '<input type="range" class="qpp__audio-range" data-qpp-volume min="0" max="100" value="70" step="1">' +
          '</label>' +
        '</div>' +
        '<audio data-qpp-audio preload="metadata" loop playsinline src="' +
          escapeHtml(audioSrc) + '"></audio>' +
      '</div>';
  }

  function upgradePanelHtml(opts) {
    if (isMiralagoContext(opts)) {
      return '' +
        '<div class="qpp-cmp-upgrade" data-qpp-upgrade-panel hidden>' +
          '<h1 class="qpp__title qpp-cmp-upgrade__heading">UPGRADE <span class="qpp-cmp-upgrade__heading-arrow" aria-hidden="true">➤</span> PLUS</h1>' +
          '<div class="qpp-cmp-upgrade__intro">' +
            '<p class="qpp-cmp-upgrade__intro-text">' +
              'Mantén abierta la posibilidad de evolucionar tu proyecto. Durante los <strong>15 días</strong> posteriores a la entrega de la <strong>versión CORE</strong>.' +
            '</p>' +
          '</div>' +
          '<div class="qpp-cmp-upgrade__matrix">' +
            '<span class="qpp-cmp-upgrade__tier-name qpp-cmp-upgrade__tier-name--still">CORE</span>' +
            '<span class="qpp-cmp-upgrade__arrow" aria-hidden="true">' +
              '<svg viewBox="0 0 120 16" preserveAspectRatio="xMidYMid meet">' +
                '<path d="M8 8H92M92 8L78 2M92 8L78 14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>' +
              '</svg>' +
            '</span>' +
            '<span class="qpp-cmp-upgrade__tier-name qpp-cmp-upgrade__tier-name--motion">PLUS</span>' +
            '<span class="qpp-cmp-upgrade__price-label qpp-cmp-upgrade__price-label--still">Dentro de 15 días</span>' +
            '<span class="qpp-cmp-upgrade__price-divider" aria-hidden="true"></span>' +
            '<span class="qpp-cmp-upgrade__price-label qpp-cmp-upgrade__price-label--motion">Después de 15 días</span>' +
            '<span class="qpp-cmp-upgrade__price qpp-cmp-upgrade__price--still">$1.500.000</span>' +
            '<span class="qpp-cmp-upgrade__price qpp-cmp-upgrade__price--motion">$2.000.000</span>' +
            '<span class="qpp-cmp-upgrade__price-rule qpp-cmp-upgrade__price-rule--still"></span>' +
            '<span class="qpp-cmp-upgrade__price-rule qpp-cmp-upgrade__price-rule--motion"></span>' +
          '</div>' +
        '</div>';
    }
    return '' +
      '<div class="qpp-cmp-upgrade" data-qpp-upgrade-panel hidden>' +
        '<h1 class="qpp__title qpp-cmp-upgrade__heading">UPGRADE <span class="qpp-cmp-upgrade__heading-arrow" aria-hidden="true">➤</span> MOTION</h1>' +
        '<div class="qpp-cmp-upgrade__intro">' +
          '<p class="qpp-cmp-upgrade__intro-text">' +
            'Mantén abierta la posibilidad de evolucionar tu proyecto. Durante los <strong>15 días</strong> posteriores a la entrega de la <strong>versión STILL</strong>.' +
          '</p>' +
        '</div>' +
        '<div class="qpp-cmp-upgrade__matrix">' +
          '<span class="qpp-cmp-upgrade__tier-name qpp-cmp-upgrade__tier-name--still">Still</span>' +
          '<span class="qpp-cmp-upgrade__arrow" aria-hidden="true">' +
            '<svg viewBox="0 0 120 16" preserveAspectRatio="xMidYMid meet">' +
              '<path d="M8 8H92M92 8L78 2M92 8L78 14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</span>' +
          '<span class="qpp-cmp-upgrade__tier-name qpp-cmp-upgrade__tier-name--motion">Motion</span>' +
          '<span class="qpp-cmp-upgrade__price-label qpp-cmp-upgrade__price-label--still">Dentro de 15 días</span>' +
          '<span class="qpp-cmp-upgrade__price-divider" aria-hidden="true"></span>' +
          '<span class="qpp-cmp-upgrade__price-label qpp-cmp-upgrade__price-label--motion">Después de 15 días</span>' +
          '<span class="qpp-cmp-upgrade__price qpp-cmp-upgrade__price--still">$1.500.000</span>' +
          '<span class="qpp-cmp-upgrade__price qpp-cmp-upgrade__price--motion">$2.000.000</span>' +
          '<span class="qpp-cmp-upgrade__price-rule qpp-cmp-upgrade__price-rule--still"></span>' +
          '<span class="qpp-cmp-upgrade__price-rule qpp-cmp-upgrade__price-rule--motion"></span>' +
        '</div>' +
      '</div>';
  }

  function markup(opts) {
    opts = opts || {};
    var audioSrc = String(opts.audioSrc || '').trim();
    return '' +
      '<div class="qpp' + (isMiralagoContext(opts) ? ' qpp--miralago' : '') + '" data-qpp-root>' +
        '<header class="qpp__chrome">' +
          '<button type="button" class="qpp__icon-btn" data-qpp-back aria-label="Volver">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
          '</button>' +
          '<div class="qpp__chrome-end">' +
            /* Mobile/tablet: compare text. Desktop: hidden via CSS (>=1024px). */
            '<button type="button" class="qpp__icon-btn qpp__chrome-compare" data-qpp-compare aria-label="Comparar" aria-pressed="false">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' +
                '<rect x="3" y="4" width="7" height="16" rx="1.5"/>' +
                '<rect x="14" y="4" width="7" height="16" rx="1.5"/>' +
              '</svg>' +
              '<span class="qpp__chrome-compare-label">Comparar</span>' +
            '</button>' +
            /* Desktop only: fullscreen. */
            '<button type="button" class="qpp__icon-btn qpp__chrome-fs" data-qpp-fullscreen aria-label="Pantalla completa" aria-pressed="false">' +
              '<svg class="qpp__fs-icon qpp__fs-icon--enter" viewBox="0 0 24 24" aria-hidden="true">' +
                '<path d="M8 3H5a2 2 0 0 0-2 2v3"/>' +
                '<path d="M16 3h3a2 2 0 0 1 2 2v3"/>' +
                '<path d="M8 21H5a2 2 0 0 1-2-2v-3"/>' +
                '<path d="M16 21h3a2 2 0 0 0 2-2v-3"/>' +
              '</svg>' +
              '<svg class="qpp__fs-icon qpp__fs-icon--exit" viewBox="0 0 24 24" aria-hidden="true" hidden>' +
                '<path d="M8 3v3a2 2 0 0 1-2 2H3"/>' +
                '<path d="M21 8h-3a2 2 0 0 1-2-2V3"/>' +
                '<path d="M3 16h3a2 2 0 0 1 2 2v3"/>' +
                '<path d="M16 21v-3a2 2 0 0 1 2-2h3"/>' +
              '</svg>' +
            '</button>' +
            audioChromeHtml(audioSrc) +
          '</div>' +
        '</header>' +
        '<main class="qpp__main" data-qpp-selection>' +
          '<p class="qpp__eyebrow">Showroom digital</p>' +
          '<h1 class="qpp__title">Selecciona una propuesta</h1>' +
          '<div class="qpp__cards-host">' +
            '<div class="qpp__grid" data-qpp-grid></div>' +
          '</div>' +
          '<button type="button" class="qpp__compare-cta" data-qpp-compare-cta aria-pressed="false">' +
            'Comparar' +
          '</button>' +
          '<p class="qpp__hint" data-qpp-hint></p>' +
        '</main>' +
        '<section class="qpp__compare" data-qpp-compare-view aria-hidden="true">' +
          '<div class="qpp__compare-scroll">' +
            '<div class="qpp-cmp-table" data-qpp-compare-table-panel>' +
              '<p class="qpp__eyebrow qpp-cmp__eyebrow">Showroom digital</p>' +
              '<h1 class="qpp__title qpp-cmp__title">Comparar propuestas</h1>' +
              '<div class="qpp-cmp" data-qpp-compare-board></div>' +
            '</div>' +
            upgradePanelHtml(opts) +
          '</div>' +
          '<div class="qpp-cmp__upgrade-bar">' +
            '<button type="button" class="qpp-cmp__upgrade" data-qpp-upgrade>' +
              'Upgrade' +
            '</button>' +
          '</div>' +
        '</section>' +
      '</div>';
  }

  function openWhatsApp(message) {
    var phone = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!phone) return;
    var text = encodeURIComponent(String(message || '').trim());
    var url = 'https://wa.me/' + phone + (text ? ('?text=' + text) : '');
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (eOpen) {
      window.location.href = url;
    }
  }

  function buildCard(proposal) {
    proposal = proposal || {};
    var title = String(proposal.title || 'Propuesta');
    var price = String(proposal.price || '');
    var quote = proposal.quote || null;
    var waMessage = String(proposal.waMessage || ('Primo, me voy por ' + title.toUpperCase()));
    var blurbHtml = String(proposal.blurb || '')
      .split('\n')
      .map(function (line) { return escapeHtml(line); })
      .join('<br>');
    var quoteHtml = quote
      ? (
          '<div class="qpp__card-quote">' +
            '<span class="qpp__quote-label">Valor de la propuesta</span>' +
            '<span class="qpp__quote-amount">' + escapeHtml(quote.proposalAmount) + '</span>' +
            '<span class="qpp__quote-label">Retención en la fuente • 12%</span>' +
            '<span class="qpp__quote-tax">' + escapeHtml(quote.taxAmount) + '</span>' +
            '<span class="qpp__quote-label">Valor neto a recibir</span>' +
            '<span class="qpp__quote-net">' + escapeHtml(quote.netAmount) + '</span>' +
          '</div>'
        )
      : ('<span class="qpp__card-price">' + escapeHtml(price) + '</span>');
    var confirmHtml = quote
      ? (
          '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
          '<div class="qpp__card-terms qpp__card-terms--quote">' +
            '<span>Anticipo: 50%</span>' +
            '<span>Inicio: al recibir anticipo e información</span>' +
            '<span>Entrega estimada: 4–7 semanas</span>' +
            '<span>Vigencia: 15 días</span>' +
          '</div>' +
          '<button type="button" class="qpp__card-select" data-proposal-confirm="' +
            escapeHtml(proposal.id || '') + '">Confirmar propuesta</button>'
        )
      : (
          '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
          '<div class="qpp__card-terms">' +
            '<span>Anticipo del 50%</span>' +
            '<span>2 a 3 semanas</span>' +
            '<span>Saldo contra entrega</span>' +
          '</div>' +
          '<button type="button" class="qpp__card-select" data-proposal-confirm="' +
            escapeHtml(proposal.id || '') + '">Voy con esta</button>'
        );

    var card = document.createElement('div');
    card.className = 'qpp__card' + (quote ? ' qpp__card--quote' : '');
    card.setAttribute('data-proposal', String(proposal.id || ''));
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', title);
    card.setAttribute('aria-pressed', 'false');

    card.innerHTML =
      '<div class="qpp__card-inner">' +
        '<div class="qpp__card-face qpp__card-face--front">' +
          '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
        '</div>' +
        '<div class="qpp__card-face qpp__card-face--back">' +
          '<div class="qpp__card-panel qpp__card-panel--detail" data-qpp-panel="detail">' +
            '<span class="qpp__card-title">' + escapeHtml(title) + '</span>' +
            quoteHtml +
            '<span class="qpp__card-desc">' + blurbHtml + '</span>' +
            '<button type="button" class="qpp__card-select" data-proposal-select="' +
              escapeHtml(proposal.id || '') + '">Seleccionar</button>' +
          '</div>' +
          '<div class="qpp__card-panel qpp__card-panel--confirm" data-qpp-panel="confirm" hidden>' +
            confirmHtml +
          '</div>' +
        '</div>' +
      '</div>';

    var detailPanel = card.querySelector('[data-qpp-panel="detail"]');
    var confirmPanel = card.querySelector('[data-qpp-panel="confirm"]');

    function showDetail() {
      card.classList.remove('is-confirming');
      if (detailPanel) detailPanel.hidden = false;
      if (confirmPanel) confirmPanel.hidden = true;
    }

    function showConfirm() {
      card.classList.add('is-confirming');
      if (detailPanel) detailPanel.hidden = true;
      if (confirmPanel) confirmPanel.hidden = false;
    }

    function isCardAction(target) {
      return !!(
        target &&
        target.closest &&
        target.closest('[data-proposal-select], [data-proposal-confirm]')
      );
    }

    function flip() {
      var on = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!on) showDetail();
    }

    card.addEventListener('click', function (e) {
      if (isCardAction(e.target)) return;
      e.preventDefault();
      flip();
    });

    card.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (isCardAction(e.target)) return;
      e.preventDefault();
      flip();
    });

    var selectBtn = card.querySelector('[data-proposal-select]');
    if (selectBtn) {
      selectBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showConfirm();
      });
    }

    var confirmBtn = card.querySelector('[data-proposal-confirm]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openWhatsApp(waMessage);
      });
    }

    return card;
  }

  function render(root) {
    var grid = qs('[data-qpp-grid]', root);
    if (!grid) return;
    grid.innerHTML = '';
    proposalList(root && root._qppOpts).forEach(function (p) {
      grid.appendChild(buildCard(p));
    });
  }

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }

  function syncFullscreenUi(root) {
    var btn = qs('[data-qpp-fullscreen]', root);
    if (!btn) return;
    var on = isFullscreen();
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
    var enter = qs('.qpp__fs-icon--enter', btn);
    var exit = qs('.qpp__fs-icon--exit', btn);
    if (enter) {
      if (on) enter.setAttribute('hidden', '');
      else enter.removeAttribute('hidden');
    }
    if (exit) {
      if (on) exit.removeAttribute('hidden');
      else exit.setAttribute('hidden', '');
    }
  }

  function toggleFullscreen(root) {
    var docEl = document.documentElement;
    if (isFullscreen()) {
      var exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (eExit) { /* ignore */ }
      }
      return;
    }
    var req =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.msRequestFullscreen;
    if (req) {
      try {
        var p = req.call(docEl);
        if (p && typeof p.catch === 'function') p.catch(function () { /* ignore */ });
      } catch (eReq) { /* ignore */ }
    }
    syncFullscreenUi(root);
  }

  function cellClass(value) {
    var v = String(value || '').trim();
    if (v === '✓') return 'qpp-cmp__val qpp-cmp__val--yes';
    if (v === '—' || v === '-') return 'qpp-cmp__val qpp-cmp__val--no';
    return 'qpp-cmp__val qpp-cmp__val--text';
  }

  function buildCompareRows(rows, delayStart, labels) {
    labels = labels || { still: 'Still', motion: 'Motion' };
    return rows.map(function (row, index) {
      var delay = delayStart + index * 30;
      var tone = String(row.still) === String(row.motion) ? 'shared' : 'diff';
      return '' +
        '<div class="qpp-cmp__row qpp-cmp__row--' + tone + '" style="--qpp-cmp-delay:' + delay + 'ms">' +
          '<div class="qpp-cmp__feature">' + escapeHtml(row.label) + '</div>' +
          '<div class="' + cellClass(row.still) + '" data-col="still">' +
            '<span class="qpp-cmp__col-label">' + escapeHtml(labels.still) + '</span>' +
            '<span class="qpp-cmp__mark">' + escapeHtml(row.still) + '</span>' +
          '</div>' +
          '<div class="' + cellClass(row.motion) + '" data-col="motion">' +
            '<span class="qpp-cmp__col-label">' + escapeHtml(labels.motion) + '</span>' +
            '<span class="qpp-cmp__mark">' + escapeHtml(row.motion) + '</span>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function buildCompareNotes(notes, delay) {
    if (!notes || !notes.length) return '';
    return notes.map(function (note, i) {
      return '<p class="qpp-cmp__note qpp-cmp__note--inline" style="--qpp-cmp-delay:' +
        (delay + i * 40) + 'ms">' + escapeHtml(note) + '</p>';
    }).join('');
  }

  function renderTaroaCompare(board) {
    var labels = { still: 'Still', motion: 'Motion' };
    var diffsHtml = buildCompareRows(COMPARE_DIFFS, 280, labels);
    var sharedHtml = buildCompareRows(COMPARE_SHARED, 280 + COMPARE_DIFFS.length * 30 + 180, labels);

    board.innerHTML =
      '<div class="qpp-cmp__head">' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--feature">Alcance</div>' +
        '<div class="qpp-cmp__hcell">Still</div>' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--motion">' +
          '<span class="qpp-cmp__h-title">Motion</span>' +
          '<span class="qpp-cmp__h-sub">Mayor impacto visual</span>' +
        '</div>' +
      '</div>' +
      '<section class="qpp-cmp__block qpp-cmp__block--diff" style="--qpp-cmp-block-delay:220ms">' +
        '<h2 class="qpp-cmp__block-title">Diferencias principales</h2>' +
        '<div class="qpp-cmp__body">' + diffsHtml + '</div>' +
      '</section>' +
      '<section class="qpp-cmp__block qpp-cmp__block--shared" style="--qpp-cmp-block-delay:' +
        (280 + COMPARE_DIFFS.length * 30 + 80) + 'ms">' +
        '<h2 class="qpp-cmp__block-title">Incluido en ambas propuestas</h2>' +
        '<div class="qpp-cmp__body">' + sharedHtml + '</div>' +
      '</section>' +
      '<p class="qpp-cmp__note" style="--qpp-cmp-delay:' +
        (280 + COMPARE_DIFFS.length * 30 + COMPARE_SHARED.length * 30 + 220) + 'ms">' +
        'Ambas propuestas están diseñadas para presentar el proyecto ante inversionistas. ' +
        'La diferencia está en el nivel de impacto y producción audiovisual.' +
      '</p>';
  }

  function renderMiralagoCompare(board) {
    var labels = {
      still: MIRALAGO_COMPARE.stillLabel,
      motion: MIRALAGO_COMPARE.motionLabel
    };
    var delay = 280;
    var html =
      '<div class="qpp-cmp__head">' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--feature">Alcance</div>' +
        '<div class="qpp-cmp__hcell">' + escapeHtml(labels.still) + '</div>' +
        '<div class="qpp-cmp__hcell qpp-cmp__hcell--motion">' +
          '<span class="qpp-cmp__h-title">' + escapeHtml(labels.motion) + '</span>' +
          '<span class="qpp-cmp__h-sub">' + escapeHtml(MIRALAGO_COMPARE.motionSub) + '</span>' +
        '</div>' +
      '</div>';

    MIRALAGO_COMPARE.sections.forEach(function (section, sIndex) {
      var blockTone = sIndex === 0 ? 'diff' : 'shared';
      var blockDelay = 220 + sIndex * 90;
      html +=
        '<section class="qpp-cmp__block qpp-cmp__block--' + blockTone +
          '" style="--qpp-cmp-block-delay:' + blockDelay + 'ms">' +
          '<h2 class="qpp-cmp__block-title">' + escapeHtml(section.title) + '</h2>' +
          '<div class="qpp-cmp__body">' + buildCompareRows(section.rows, delay, labels) + '</div>' +
          buildCompareNotes(section.notes, delay + section.rows.length * 30 + 40) +
        '</section>';
      delay += section.rows.length * 30 + ((section.notes && section.notes.length) || 0) * 40 + 80;
    });

    html +=
      '<section class="qpp-cmp__block qpp-cmp__block--diff qpp-cmp__block--summary" style="--qpp-cmp-block-delay:' +
        (220 + MIRALAGO_COMPARE.sections.length * 90) + 'ms">' +
        '<h2 class="qpp-cmp__block-title">Diferencias principales</h2>' +
        '<article class="qpp-cmp__prose">' +
          '<h3 class="qpp-cmp__prose-title">CORE</h3>' +
          '<p class="qpp-cmp__prose-price">$9.850.000 COP</p>' +
          '<p>Presentación enfocada en el proyecto general, lobby y apartamentos tipo.</p>' +
          '<p>La experiencia comienza con una vista aérea de la implantación sobre Google Earth, muestra el acceso y continúa hacia el lobby y los apartamentos modelo. La vegetación, zonas verdes y espacios exteriores forman parte del proyecto y se perciben dentro de las visualizaciones generales, sin convertirse en el foco principal de la experiencia.</p>' +
        '</article>' +
        '<article class="qpp-cmp__prose">' +
          '<h3 class="qpp-cmp__prose-title">PLUS</h3>' +
          '<p class="qpp-cmp__prose-price">$14.250.000 COP</p>' +
          '<p>Presentación completa de todo el proyecto y sus diferentes usos, con integración de drone.</p>' +
          '<p>La experiencia comienza con vistas aéreas y fotomontajes sobre fotografías reales tomadas con drone, continúa por el acceso, vegetación, zonas verdes, zonas comerciales y espacios exteriores, y permite explorar con mayor detalle las diferentes áreas antes de llegar al lobby.</p>' +
          '<p>Incluye además el desarrollo visual de oficinas, áreas comerciales, áreas comunes, valet parking, terraza/bar, vistas hacia el lago y las diferentes torres, tanto en los recorridos 360° como en el video principal de aproximadamente 3 minutos.</p>' +
        '</article>' +
      '</section>' +
      '<section class="qpp-cmp__block qpp-cmp__block--shared qpp-cmp__block--summary" style="--qpp-cmp-block-delay:' +
        (280 + MIRALAGO_COMPARE.sections.length * 90) + 'ms">' +
        '<h2 class="qpp-cmp__block-title">Diferencia fundamental</h2>' +
        '<article class="qpp-cmp__prose">' +
          '<p>CORE presenta el proyecto de forma directa, concentrándose en sus elementos principales.</p>' +
          '<p>PLUS amplía la experiencia para mostrar la totalidad del proyecto, su entorno, sus diferentes usos y su potencial comercial.</p>' +
        '</article>' +
      '</section>';

    board.innerHTML = html;
  }

  function renderCompare(root) {
    var board = qs('[data-qpp-compare-board]', root);
    if (!board) return;
    if (isMiralagoContext(root && root._qppOpts)) renderMiralagoCompare(board);
    else renderTaroaCompare(board);
  }

  function retriggerCmpAnimate(root) {
    var shell = qs('[data-qpp-root]', root) || root;
    requestAnimationFrame(function () {
      shell.classList.remove('is-cmp-animate');
      void shell.offsetWidth;
      shell.classList.add('is-cmp-animate');
    });
  }

  function syncFlowCtaUi(root) {
    var shell = qs('[data-qpp-root]', root) || root;
    var view = shell.getAttribute('data-qpp-view') || 'selection';
    var panel = shell.getAttribute('data-qpp-compare-panel') || 'table';
    var label = 'Comparar';
    var ariaLabel = 'Comparar';

    if (view === 'comparison') {
      if (panel === 'upgrade') {
        label = 'Volver';
        ariaLabel = 'Volver a propuestas';
      } else {
        label = 'Upgrade';
        ariaLabel = 'Upgrade';
      }
    }

    var upgradeBtn = qs('[data-qpp-upgrade]', root);
    if (upgradeBtn) {
      upgradeBtn.textContent = label;
      upgradeBtn.setAttribute('aria-label', ariaLabel);
    }

    var chromeLabel = qs('.qpp__chrome-compare-label', root);
    var chromeCompare = qs('[data-qpp-compare]', root);
    if (chromeLabel) chromeLabel.textContent = label;
    if (chromeCompare) chromeCompare.setAttribute('aria-label', ariaLabel);
  }

  function handleFlowCta(root) {
    var shell = qs('[data-qpp-root]', root) || root;
    var view = shell.getAttribute('data-qpp-view') || 'selection';
    var panel = shell.getAttribute('data-qpp-compare-panel') || 'table';

    if (view === 'selection') {
      setQppView(root, 'comparison');
      return;
    }
    if (panel === 'upgrade') {
      setQppView(root, 'selection');
      return;
    }
    setComparePanel(root, 'upgrade');
    retriggerCmpAnimate(root);
  }

  function setComparePanel(root, panel) {
    var shell = qs('[data-qpp-root]', root) || root;
    var next = panel === 'upgrade' ? 'upgrade' : 'table';
    var tablePanel = qs('[data-qpp-compare-table-panel]', root);
    var upgradePanel = qs('[data-qpp-upgrade-panel]', root);

    shell.setAttribute('data-qpp-compare-panel', next);

    if (tablePanel) {
      if (next === 'upgrade') tablePanel.setAttribute('hidden', '');
      else tablePanel.removeAttribute('hidden');
    }
    if (upgradePanel) {
      if (next === 'upgrade') upgradePanel.removeAttribute('hidden');
      else upgradePanel.setAttribute('hidden', '');
    }

    syncFlowCtaUi(root);
  }

  function setQppView(root, view) {
    var shell = qs('[data-qpp-root]', root) || root;
    var next = view === 'comparison' ? 'comparison' : 'selection';
    shell.setAttribute('data-qpp-view', next);
    shell.classList.toggle('is-compare-view', next === 'comparison');
    shell.classList.remove('is-compare-mode');

    var compareView = qs('[data-qpp-compare-view]', root);
    var selection = qs('[data-qpp-selection]', root);
    if (selection) {
      selection.setAttribute('aria-hidden', next === 'comparison' ? 'true' : 'false');
    }
    if (compareView) {
      compareView.setAttribute('aria-hidden', next === 'comparison' ? 'false' : 'true');
    }

    if (next === 'comparison') {
      setComparePanel(root, 'table');
      renderCompare(root);
      retriggerCmpAnimate(root);
    } else {
      setComparePanel(root, 'table');
    }
  }

  function syncAudioUi(root) {
    var audio = qs('[data-qpp-audio]', root);
    var toggle = qs('[data-qpp-audio-toggle]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    if (!audio || !toggle) return;
    var playing = !audio.paused;
    toggle.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    if (musicBtn) musicBtn.classList.toggle('is-active', playing);
    var playIcon = qs('.qpp__audio-icon--play', toggle);
    var pauseIcon = qs('.qpp__audio-icon--pause', toggle);
    if (playIcon) {
      if (playing) playIcon.setAttribute('hidden', '');
      else playIcon.removeAttribute('hidden');
    }
    if (pauseIcon) {
      if (playing) pauseIcon.removeAttribute('hidden');
      else pauseIcon.setAttribute('hidden', '');
    }
  }

  function setAudioPanelOpen(root, open) {
    var panel = qs('[data-qpp-audio-panel]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    var wrap = qs('[data-qpp-audio-wrap]', root);
    if (!panel || !musicBtn) return;
    if (open) {
      panel.hidden = false;
      panel.removeAttribute('hidden');
      musicBtn.setAttribute('aria-expanded', 'true');
      if (wrap) wrap.classList.add('is-audio-open');
    } else {
      panel.hidden = true;
      panel.setAttribute('hidden', '');
      musicBtn.setAttribute('aria-expanded', 'false');
      if (wrap) wrap.classList.remove('is-audio-open');
    }
  }

  var ambientUnlockBound = false;

  function playAmbient(audio, root) {
    if (!audio) return;
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        syncAudioUi(root);
      }).catch(function () {
        /* Browsers block unmuted autoplay — unlock on first gesture. */
        if (ambientUnlockBound) return;
        ambientUnlockBound = true;
        var unlock = function () {
          audio.play().then(function () {
            syncAudioUi(root);
          }).catch(function () { /* ignore */ });
          document.removeEventListener('pointerdown', unlock, true);
          document.removeEventListener('touchstart', unlock, true);
          document.removeEventListener('keydown', unlock, true);
        };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('touchstart', unlock, true);
        document.addEventListener('keydown', unlock, true);
      });
    }
  }

  function startAmbientAudio(host) {
    var root = host || document.querySelector('[data-qpp-root]') ||
      document.querySelector('[data-qr-proposals]');
    if (!root) return false;
    var audio = qs('[data-qpp-audio]', root);
    if (!audio) return false;
    playAmbient(audio, root);
    return true;
  }

  function isMobileAudioChrome() {
    try {
      return window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
    } catch (e) {
      return false;
    }
  }

  function toggleAmbientPlayback(audio, root) {
    if (!audio) return;
    if (audio.paused) playAmbient(audio, root);
    else audio.pause();
    syncAudioUi(root);
  }

  function bindAudio(root) {
    var audio = qs('[data-qpp-audio]', root);
    var musicBtn = qs('[data-qpp-music]', root);
    var toggle = qs('[data-qpp-audio-toggle]', root);
    var volume = qs('[data-qpp-volume]', root);
    var wrap = qs('[data-qpp-audio-wrap]', root);
    if (!audio || !musicBtn) return;

    audio.volume = volume ? Number(volume.value) / 100 : 0.7;
    audio.setAttribute('preload', 'auto');

    /* Autoplay as soon as the experience mounts. */
    playAmbient(audio, root);

    musicBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      /* Mobile: note button only play/pause. Desktop: open volume panel. */
      if (isMobileAudioChrome()) {
        setAudioPanelOpen(root, false);
        toggleAmbientPlayback(audio, root);
        return;
      }
      var panel = qs('[data-qpp-audio-panel]', root);
      var open = !(panel && !panel.hidden);
      setAudioPanelOpen(root, open);
    });

    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleAmbientPlayback(audio, root);
      });
    }

    if (volume) {
      volume.addEventListener('input', function () {
        audio.volume = Math.max(0, Math.min(1, Number(volume.value) / 100));
      });
      volume.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    audio.addEventListener('play', function () { syncAudioUi(root); });
    audio.addEventListener('pause', function () { syncAudioUi(root); });
    syncAudioUi(root);

    document.addEventListener('click', function (e) {
      if (!wrap || !wrap.classList.contains('is-audio-open')) return;
      if (wrap.contains(e.target)) return;
      setAudioPanelOpen(root, false);
    });
  }

  function bind(root, opts) {
    opts = opts || {};
    var shell = qs('[data-qpp-root]', root) || root;
    var back = qs('[data-qpp-back]', root);
    var hint = qs('[data-qpp-hint]', root);
    var fsBtn = qs('[data-qpp-fullscreen]', root);

    shell.setAttribute('data-qpp-view', 'selection');

    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        var view = shell.getAttribute('data-qpp-view') || 'selection';
        if (view === 'comparison') {
          var panel = shell.getAttribute('data-qpp-compare-panel') || 'table';
          if (panel === 'upgrade') {
            setComparePanel(root, 'table');
            retriggerCmpAnimate(root);
            return;
          }
          setQppView(root, 'selection');
          return;
        }
        if (typeof opts.onBack === 'function') opts.onBack();
      });
    }

    qsa('[data-qpp-compare], [data-qpp-compare-cta], [data-qpp-upgrade]', root).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        handleFlowCta(root);
      });
    });

    syncFlowCtaUi(root);

    if (fsBtn) {
      fsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleFullscreen(root);
      });
    }

    function onFsChange() {
      syncFullscreenUi(root);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    syncFullscreenUi(root);
    bindAudio(root);
    renderCompare(root);

    if (hint && !hint.textContent) hint.textContent = '';
  }

  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    host._qppOpts = opts;
    host.innerHTML = markup(opts);
    bind(host, opts);
    render(host);
    return {
      el: host,
      refresh: function () { render(host); }
    };
  }

  function boot() {
    var root = document.getElementById('qrProposalsPage');
    if (!root) return;
    mount(root, {
      onBack: function () {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = '/';
      }
    });
  }

  return {
    mount: mount,
    boot: boot,
    startAmbientAudio: startAmbientAudio
  };
})();

(function () {
  function start() {
    if (!document.getElementById('qrProposalsPage')) return;
    if (typeof QuotationProposalsPage !== 'undefined' && QuotationProposalsPage.boot) {
      QuotationProposalsPage.boot();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
