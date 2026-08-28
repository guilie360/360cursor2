/**
 * BOXIES V7.2.00 — Project types (Hall Proyectos).
 * Una sola colección (proyectos); experience_type filtra la UI.
 * kind: content | template — Plantillas son primer nivel, misma fila de tabs.
 * enabledTools() prepara especialización por tipo sin duplicar módulos.
 */
var BoxiesExperienceTypes = (function () {
  var STORAGE_KEY = 'boxies.experiences.activeType';

  var TYPES = [
    {
      id: 'showroom',
      kind: 'content',
      builderReady: true,
      tabLabel: 'SHOWROOMS',
      singular: 'Showroom',
      plural: 'Showrooms',
      createLabel: '+ Nuevo Showroom',
      defaultName: 'Nuevo Showroom',
      slugPrefix: 'showroom',
      emptyMessage: 'No hay showrooms registrados.',
      selectorTitle: 'Showroom',
      selectorDesc:
        'Experiencia comercial completa con Runtime, 360, hotspots y herramientas avanzadas.',
      selectorCta: 'Crear →'
    },
    {
      id: 'presentation',
      kind: 'content',
      builderReady: true,
      tabLabel: 'PRESENTACIONES',
      singular: 'Presentación',
      plural: 'Presentaciones',
      createLabel: '+ Nueva Presentación',
      defaultName: 'Nueva Presentación',
      slugPrefix: 'presentacion',
      emptyMessage: 'No hay presentaciones registradas.',
      selectorTitle: 'Presentación',
      selectorDesc: 'Presentación ejecutiva ligera para reuniones e inversionistas.',
      selectorCta: 'Crear →'
    },
    {
      id: 'quotation',
      kind: 'content',
      builderReady: true,
      tabLabel: 'COTIZACIONES',
      singular: 'Cotización',
      plural: 'Cotizaciones',
      createLabel: '+ Nueva Cotización',
      defaultName: 'Nueva Cotización',
      slugPrefix: 'cotizacion',
      emptyMessage: 'No hay cotizaciones registradas.',
      selectorTitle: 'Cotización',
      selectorDesc: 'Propuesta comercial interactiva para clientes.',
      selectorCta: 'Crear →',
      builderPage: 'quotation-builder',
      createBusyLabel: 'Creando Quotation Room',
      openBusyLabel: 'Cargando Quotation Room'
    },
    {
      id: 'comparator',
      kind: 'content',
      builderReady: false,
      tabLabel: 'COMPARADORES',
      singular: 'Comparador',
      plural: 'Comparadores',
      createLabel: '+ Nuevo Comparador',
      defaultName: 'Nuevo Comparador',
      slugPrefix: 'comparador',
      emptyMessage: 'No hay comparadores registrados.',
      selectorTitle: 'Comparador',
      selectorDesc: 'Comparación de tipologías y unidades para el cliente.',
      selectorCta: 'Crear →',
      builderPage: 'comparator-builder',
      createBusyLabel: 'Creando Comparador',
      openBusyLabel: 'Cargando Comparador'
    },
    {
      id: 'catalog',
      kind: 'content',
      builderReady: true,
      tabLabel: 'CATÁLOGOS',
      singular: 'Catálogo',
      plural: 'Catálogos',
      createLabel: '+ Nuevo Catálogo',
      defaultName: 'Nuevo Catálogo',
      slugPrefix: 'catalogo',
      emptyMessage: 'No hay catálogos registrados.',
      selectorTitle: 'Catálogo',
      selectorDesc: 'Catálogo digital de tipologías y documentación.',
      selectorCta: 'Crear →'
    },
    {
      id: 'template',
      kind: 'template',
      builderReady: true,
      tabLabel: 'PLANTILLAS',
      singular: 'Plantilla',
      plural: 'Plantillas',
      createLabel: '+ Nueva Plantilla',
      defaultName: 'Nueva Plantilla',
      slugPrefix: 'plantilla',
      emptyMessage: 'No hay plantillas registradas.',
      selectorTitle: 'Plantilla',
      selectorDesc: 'Estructura reutilizable para nuevos proyectos.',
      selectorCta: 'Crear →',
      builderPage: 'template-builder',
      createBusyLabel: 'Creando Plantilla',
      openBusyLabel: 'Cargando Plantilla'
    }
  ];

  /** Future per-type tool enablement (not enforced in V7.0.00 editors). */
  var TOOLS_BY_TYPE = {
    showroom: ['runtime', '360', 'inventory', 'login', 'videos', 'hotspots'],
    presentation: ['images', 'hotspots', 'cards', 'videos'],
    quotation: ['proposal', 'budget', 'scope', 'schedule', 'options'],
    comparator: ['compare', 'units', 'matrix'],
    catalog: ['typologies', 'plans', 'pdf', 'gallery'],
    template: ['structure', 'layout', 'components', 'behavior']
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
    /* V7.2.00 — Landings retired; map legacy session/DB values. */
    if (raw === 'landing' || raw === 'landings') return 'comparator';
    if (ALLOWED[raw]) return raw;
    return 'showroom';
  }

  function get(typeId) {
    return ALLOWED[normalize(typeId)] || ALLOWED.showroom;
  }

  function list() {
    return TYPES.slice();
  }

  function listContentTypes() {
    return TYPES.filter(function (t) { return t.kind !== 'template'; });
  }

  function listTemplateTypes() {
    return TYPES.filter(function (t) { return t.kind === 'template'; });
  }

  function isTemplateType(typeId) {
    var t = get(typeId);
    return !!(t && t.kind === 'template');
  }

  function isBuilderReady(typeId) {
    var t = get(typeId);
    return !!(t && t.builderReady);
  }

  function enabledTools(typeId) {
    var id = normalize(typeId);
    return (TOOLS_BY_TYPE[id] || []).slice();
  }

  /** Which Boxies page hosts the editor for this experience type. */
  function getBuilderPage(typeId) {
    var t = get(typeId);
    return (t && t.builderPage) || 'builder';
  }

  function getCreateBusyLabel(typeId) {
    var t = get(typeId);
    if (t && t.createBusyLabel) return t.createBusyLabel;
    return 'Creando ' + String((t && t.singular) || 'proyecto').toLowerCase();
  }

  function getOpenBusyLabel(typeId) {
    var t = get(typeId);
    if (t && t.openBusyLabel) return t.openBusyLabel;
    return 'Cargando ' + String((t && t.singular) || 'proyecto').toLowerCase();
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
    listContentTypes: listContentTypes,
    listTemplateTypes: listTemplateTypes,
    isTemplateType: isTemplateType,
    isBuilderReady: isBuilderReady,
    enabledTools: enabledTools,
    isToolEnabled: isToolEnabled,
    getBuilderPage: getBuilderPage,
    getCreateBusyLabel: getCreateBusyLabel,
    getOpenBusyLabel: getOpenBusyLabel,
    getActive: getActive,
    setActive: setActive
  };
})();
