/**
 * BOXIES V7 — Experiencias (tipos + herramientas futuras).
 * Una sola colección (proyectos); experience_type filtra la UI.
 * enabledTools() prepara especialización por tipo sin duplicar módulos.
 * V7.0.01 — selector metadata for Builder entry screen.
 */
var BoxiesExperienceTypes = (function () {
  var STORAGE_KEY = 'boxies.experiences.activeType';

  var TYPES = [
    {
      id: 'showroom',
      tabLabel: 'SHOWROOMS',
      singular: 'Showroom',
      plural: 'Showrooms',
      createLabel: '+ Nuevo Showroom',
      defaultName: 'Nuevo Showroom',
      slugPrefix: 'showroom',
      emptyMessage: 'No hay showrooms registrados.',
      selectorIcon: '🏢',
      selectorTitle: 'SHOWROOM',
      selectorDesc:
        'Experiencia comercial completa con Runtime, 360, hotspots y herramientas avanzadas.',
      selectorCta: 'Crear Showroom'
    },
    {
      id: 'presentation',
      tabLabel: 'PRESENTACIONES',
      singular: 'Presentación',
      plural: 'Presentaciones',
      createLabel: '+ Nueva Presentación',
      defaultName: 'Nueva Presentación',
      slugPrefix: 'presentacion',
      emptyMessage: 'No hay presentaciones registradas.',
      selectorIcon: '📄',
      selectorTitle: 'PRESENTACIÓN',
      selectorDesc: 'Presentación ejecutiva ligera para reuniones e inversionistas.',
      selectorCta: 'Crear Presentación'
    },
    {
      id: 'quotation',
      tabLabel: 'COTIZACIONES',
      singular: 'Cotización',
      plural: 'Cotizaciones',
      createLabel: '+ Nueva Cotización',
      defaultName: 'Nueva Cotización',
      slugPrefix: 'cotizacion',
      emptyMessage: 'No hay cotizaciones registradas.',
      selectorIcon: '💰',
      selectorTitle: 'COTIZACIÓN',
      selectorDesc: 'Propuesta comercial interactiva para clientes.',
      selectorCta: 'Crear Cotización'
    },
    {
      id: 'landing',
      tabLabel: 'LANDINGS',
      singular: 'Landing',
      plural: 'Landings',
      createLabel: '+ Nueva Landing',
      defaultName: 'Nueva Landing',
      slugPrefix: 'landing',
      emptyMessage: 'No hay landings registradas.',
      selectorIcon: '🌐',
      selectorTitle: 'LANDING',
      selectorDesc: 'Landing comercial para captación de clientes.',
      selectorCta: 'Crear Landing'
    },
    {
      id: 'catalog',
      tabLabel: 'CATÁLOGOS',
      singular: 'Catálogo',
      plural: 'Catálogos',
      createLabel: '+ Nuevo Catálogo',
      defaultName: 'Nuevo Catálogo',
      slugPrefix: 'catalogo',
      emptyMessage: 'No hay catálogos registrados.',
      selectorIcon: '📚',
      selectorTitle: 'CATÁLOGO',
      selectorDesc: 'Catálogo digital de tipologías y documentación.',
      selectorCta: 'Crear Catálogo'
    }
  ];

  /** Future per-type tool enablement (not enforced in V7.0.00 editors). */
  var TOOLS_BY_TYPE = {
    showroom: ['runtime', '360', 'inventory', 'login', 'videos', 'hotspots'],
    presentation: ['images', 'hotspots', 'cards', 'videos'],
    quotation: ['proposal', 'budget', 'scope', 'schedule', 'options'],
    landing: ['hero', 'form', 'cta', 'gallery'],
    catalog: ['typologies', 'plans', 'pdf', 'gallery']
  };

  var ALLOWED = {};
  TYPES.forEach(function (t) {
    ALLOWED[t.id] = t;
  });

  function normalize(value) {
    var raw = String(value == null ? '' : value)
      .trim()
      .toLowerCase();
    if (raw === 'experience' || raw === 'experiencias') return 'showroom';
    if (ALLOWED[raw]) return raw;
    return 'showroom';
  }

  function get(typeId) {
    return ALLOWED[normalize(typeId)] || ALLOWED.showroom;
  }

  function list() {
    return TYPES.slice();
  }

  function enabledTools(typeId) {
    var id = normalize(typeId);
    return (TOOLS_BY_TYPE[id] || []).slice();
  }

  function isToolEnabled(typeId, toolId) {
    var tools = enabledTools(typeId);
    return tools.indexOf(String(toolId || '')) >= 0;
  }

  function getActive() {
    try {
      var stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) return normalize(stored);
    } catch (e) {}
    return 'showroom';
  }

  function setActive(typeId) {
    var id = normalize(typeId);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, id);
    } catch (e) {}
    return id;
  }

  return {
    TYPES: TYPES,
    TOOLS_BY_TYPE: TOOLS_BY_TYPE,
    STORAGE_KEY: STORAGE_KEY,
    normalize: normalize,
    get: get,
    list: list,
    enabledTools: enabledTools,
    isToolEnabled: isToolEnabled,
    getActive: getActive,
    setActive: setActive
  };
})();
