console.log("BOOT ENTER js/style-engine/style-engine-preview.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-preview.js');}catch(_e){}
/* Style Engine — Preview Dashboard + escenarios */
var StyleEnginePreview = (function () {
  var SCENARIOS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'viviendas', label: 'Viviendas' },
    { id: 'comparador', label: 'Comparador' },
    { id: 'calculadora', label: 'Calculadora' },
    { id: 'favoritos', label: 'Favoritos' },
    { id: 'menu', label: 'Menú' },
    { id: 'popup', label: 'Popup' },
    { id: 'mapa', label: 'Mapa' },
    { id: 'landing', label: 'Landing' }
  ];

  var currentScenario = 'dashboard';

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function scenarioSelectorHtml() {
    return (
      '<div class="se-scenario-bar">' +
        '<span class="se-scenario-label">Preview</span>' +
        SCENARIOS.map(function (s) {
          return '<label class="se-scenario-option">' +
            '<input type="radio" name="sePreviewScenario" value="' + escapeHtml(s.id) + '"' +
              (currentScenario === s.id ? ' checked' : '') + '>' +
            '<span>' + escapeHtml(s.label) + '</span></label>';
        }).join('') +
      '</div>'
    );
  }

  function shell(children) {
    return '<div class="se-preview-sandbox" id="styleEnginePreviewSandbox">' + children + '</div>';
  }

  function dashboardHtml() {
    return shell(
      '<div class="se-pv-dashboard">' +
        '<aside class="se-pv-sidebar"><div class="se-pv-sidebar-logo">BOXIES</div><nav class="se-pv-nav"><span class="is-active">Viviendas</span><span>Favoritos</span><span>Mapa</span></nav></aside>' +
        '<main class="se-pv-main">' +
          '<header class="se-pv-header"><span>Viviendas</span><div class="se-pv-header-actions"><button type="button" class="se-pv-btn se-pv-btn--ghost">Comparar</button><button type="button" class="se-pv-btn se-pv-btn--cta">Favoritos</button></div></header>' +
          '<section class="se-pv-grid">' + cardHtml() + cardHtml('T2-302', 'Penthouse', '$520M') + '</section>' +
          '<section class="se-pv-row">' +
            '<div class="se-pv-popup-mini"><div class="se-pv-popup-title">Calculadora</div><div class="se-pv-calc-line"><span>Cuota estimada</span><strong>$2.4M/mes</strong></div><button type="button" class="se-pv-btn se-pv-btn--cta se-pv-btn--block">Solicitar propuesta</button></div>' +
            '<div class="se-pv-compare-mini"><div class="se-pv-compare-col">' + cardHtml('A', 'Tipo A', '$300M', true) + '</div><div class="se-pv-vs">VS</div><div class="se-pv-compare-col">' + cardHtml('B', 'Tipo B', '$340M', true) + '</div></div>' +
          '</section>' +
          '<section class="se-pv-components">' +
            '<input class="se-pv-input" placeholder="Buscar vivienda" readonly>' +
            '<span class="se-pv-badge">Reservado</span><span class="se-pv-badge se-pv-badge--accent">Nuevo</span>' +
            '<div class="se-pv-table"><div class="se-pv-tr se-pv-tr--head"><span>Unidad</span><span>Área</span><span>Precio</span></div><div class="se-pv-tr"><span>T1-201</span><span>82 m²</span><span>$340M</span></div></div>' +
            '<div class="se-pv-toast">Guardado en favoritos</div>' +
            '<div class="se-pv-tooltip">Tooltip de ayuda</div>' +
            '<div class="se-pv-loader" aria-hidden="true"></div>' +
          '</section>' +
          '<footer class="se-pv-footer">BOXIES · Design System Preview</footer>' +
        '</main>' +
        '<div class="se-pv-overlay" aria-hidden="true"></div>' +
      '</div>'
    );
  }

  function cardHtml(code, title, price, mini) {
    code = code || 'T1-201';
    title = title || 'Apartamento tipo B';
    price = price || '$340.000.000';
    return (
      '<article class="se-pv-card' + (mini ? ' se-pv-card--mini' : '') + '">' +
        '<div class="se-pv-card-media"></div>' +
        '<div class="se-pv-card-body">' +
          '<div class="se-pv-tag">' + escapeHtml(code) + '</div>' +
          '<div class="se-pv-title">' + escapeHtml(title) + '</div>' +
          '<div class="se-pv-price">' + escapeHtml(price) + '</div>' +
          (mini ? '' : '<div class="se-pv-specs"><span>82 m²</span><span>3 hab.</span><span>2 baños</span></div>') +
          '<div class="se-pv-card-actions">' +
            '<button type="button" class="se-pv-btn">Ver planos</button>' +
            '<button type="button" class="se-pv-btn se-pv-btn--cta">Ver 360°</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function viviendasHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--viviendas"><header class="se-pv-header"><span>Todas las viviendas</span></header><div class="se-pv-grid">' + cardHtml() + cardHtml('T3-102', 'Tipo C', '$290M') + cardHtml('PH-01', 'Penthouse', '$520M') + '</div></div>');
  }

  function comparadorHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--compare"><header class="se-pv-header"><span>Comparador</span></header><div class="se-pv-compare-row">' + cardHtml('A', 'Tipo A', '$300M', true) + '<div class="se-pv-vs">VS</div>' + cardHtml('B', 'Tipo B', '$340M', true) + '</div><div class="se-pv-table"><div class="se-pv-tr se-pv-tr--head"><span>Atributo</span><span>A</span><span>B</span></div><div class="se-pv-tr"><span>Área</span><span>78 m²</span><span>82 m²</span></div></div></div>');
  }

  function calculadoraHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--calc"><div class="se-pv-popup-mini se-pv-popup-mini--large"><div class="se-pv-popup-title">Calculadora — Tipo B</div><div class="se-pv-price">$340.000.000</div><div class="se-pv-calc-grid"><label>Cuota inicial<select disabled><option>20%</option></select></label><label>Plazo<select disabled><option>20 años</option></select></label></div><div class="se-pv-calc-line"><span>Cuota estimada</span><strong>$2.412.000/mes</strong></div><button type="button" class="se-pv-btn se-pv-btn--cta se-pv-btn--block">Solicitar propuesta</button></div></div>');
  }

  function favoritosHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--fav"><header class="se-pv-header"><span>Favoritos (3)</span></header><div class="se-pv-grid">' + cardHtml() + cardHtml('T2-105', 'Tipo A', '$310M') + '</div></div>');
  }

  function menuHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--menu"><aside class="se-pv-sidebar se-pv-sidebar--full"><div class="se-pv-sidebar-logo">BOXIES</div><nav class="se-pv-nav"><span class="is-active">Explorar</span><span>Viviendas</span><span>Personalizar</span><span>Style Engine</span></nav><div class="se-pv-menu-profile"><div class="se-pv-avatar"></div><span>Admin</span></div></aside></div>');
  }

  function popupHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--popup"><div class="se-pv-overlay is-visible"></div><div class="se-pv-popup-mini se-pv-popup-mini--large"><div class="se-pv-popup-title">Planos — Tipo B</div><div class="se-pv-plan-strip"><div class="se-pv-plan"></div><div class="se-pv-plan"></div></div><button type="button" class="se-pv-btn se-pv-btn--cta">Solicitar propuesta</button></div></div>');
  }

  function mapaHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--map"><div class="se-pv-map"></div><div class="se-pv-map-card">' + cardHtml('MZ-12', 'Torre Norte', '$340M', true) + '</div></div>');
  }

  function landingHtml() {
    return shell('<div class="se-pv-scene se-pv-scene--landing"><div class="se-pv-landing-hero"><div class="se-pv-landing-kicker">Proyecto demo</div><h3 class="se-pv-landing-title">Vive la experiencia inmobiliaria premium</h3><button type="button" class="se-pv-btn se-pv-btn--cta">Explorar</button></div></div>');
  }

  var RENDERERS = {
    dashboard: dashboardHtml,
    viviendas: viviendasHtml,
    comparador: comparadorHtml,
    calculadora: calculadoraHtml,
    favoritos: favoritosHtml,
    menu: menuHtml,
    popup: popupHtml,
    mapa: mapaHtml,
    landing: landingHtml
  };

  function renderScenario(id) {
    if (id && RENDERERS[id]) currentScenario = id;
    var fn = RENDERERS[currentScenario] || dashboardHtml;
    return scenarioSelectorHtml() + fn();
  }

  function mount(host) {
    if (!host) return;
    host.innerHTML = renderScenario(currentScenario);
    bind(host);
    syncTokens();
  }

  function bind(host) {
    host.querySelectorAll('input[name="sePreviewScenario"]').forEach(function (input) {
      input.onchange = function () {
        currentScenario = input.value;
        mount(host);
      };
    });
  }

  function syncTokens() {
    var sandbox = document.getElementById('styleEnginePreviewSandbox');
    if (!sandbox) return;
    var rules = StyleEngineStore.getDraftRules();
    Object.keys(rules).forEach(function (key) {
      sandbox.style.setProperty(StyleEngineTokens.cssVarName(key), rules[key]);
    });
  }

  function getCurrentScenario() { return currentScenario; }

  return {
    SCENARIOS: SCENARIOS,
    mount: mount,
    syncTokens: syncTokens,
    getCurrentScenario: getCurrentScenario,
    renderScenario: renderScenario
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-preview.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/style-engine-preview.js");
