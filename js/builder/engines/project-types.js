/* Project Types Engine — canonical residential types + legacy normalization */
var ProjectTypesEngine = (function () {
  /**
   * Canonical development types (BOXIES Estructura V5.9.5+).
   * Application code must write these keys going forward.
   */
  var CANONICAL_TYPES = [
    { id: 'unidad', label: 'Unidad' },
    { id: 'edificio', label: 'Edificio' },
    { id: 'conjunto', label: 'Conjunto' },
    { id: 'lotes', label: 'Lotes' },
    { id: 'mixto', label: 'Mixto' }
  ];

  /**
   * Legacy keys that may still exist in DB / old sessions.
   * Read-only normalization — never write these from new UI paths.
   */
  var LEGACY_TO_CANONICAL = {
    torres: 'edificio',
    casas: 'conjunto',
    urbanizacion: 'conjunto',
    loteo: 'lotes',
    parcelacion: 'lotes',
    casa: 'unidad',
    apartamento: 'edificio',
    condominio: 'conjunto',
    coliving: 'edificio',
    apartaestudios: 'edificio',
    otro: 'edificio'
  };

  /* Older commercial catalog (pre-Estructura). Kept for label fallbacks only. */
  var TYPES = [
    { id: 'casa', label: 'Casa', icon: '🏠' },
    { id: 'apartamento', label: 'Apartamento', icon: '🏢' },
    { id: 'edificio', label: 'Edificio', icon: '🏬' },
    { id: 'conjunto', label: 'Conjunto Residencial', icon: '🏘️' },
    { id: 'condominio', label: 'Condominio', icon: '🏡' },
    { id: 'coliving', label: 'Coliving', icon: '🛏️' },
    { id: 'apartaestudios', label: 'Apartaestudios', icon: '📦' },
    { id: 'lotes', label: 'Lotes', icon: '🗺️' },
    { id: 'locales', label: 'Locales Comerciales', icon: '🏪' },
    { id: 'centro-comercial', label: 'Centro Comercial', icon: '🛒' },
    { id: 'hotel', label: 'Hotel', icon: '🏨' },
    { id: 'oficinas', label: 'Oficinas', icon: '💼' },
    { id: 'mixto', label: 'Proyecto Mixto', icon: '🔀' },
    { id: 'otro', label: 'Otro', icon: '✨' }
  ];

  var STRUCTURES = {
    unidad: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'amenidades'],
      defaultPanoramas: ['Sala', 'Comedor', 'Cocina', 'Habitación Principal', 'Baño', 'Terraza', 'Jardín'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Unidad'
    },
    edificio: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'avances'],
      defaultPanoramas: ['Lobby', 'Recepción', 'Sala', 'Cocina', 'Habitación', 'Baño', 'Terraza', 'Amenidades'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno', 'diurno', 'recorrido'],
      unitLabel: 'Apartamento'
    },
    conjunto: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'amenidades'],
      defaultPanoramas: ['Sala', 'Comedor', 'Cocina', 'Habitación', 'Baño', 'Parque', 'Piscina', 'Zona BBQ'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'recorrido'],
      unitLabel: 'Casa'
    },
    lotes: {
      modules: ['hero', 'gallery', 'plans', 'downloads', 'tipologias', 'viviendas'],
      defaultPanoramas: [],
      galleryGroups: ['exterior', 'masterplan', 'recorrido'],
      unitLabel: 'Lote'
    },
    mixto: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'amenidades'],
      defaultPanoramas: ['Lobby', 'Sala', 'Cocina', 'Habitación', 'Baño', 'Amenidades', 'Exterior'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno', 'diurno', 'recorrido'],
      unitLabel: 'Unidad'
    },
    /* Pre-Estructura structure keys (read fallback only) */
    casa: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'amenidades'],
      defaultPanoramas: ['Sala', 'Comedor', 'Cocina', 'Habitación Principal', 'Baño', 'Terraza', 'Jardín'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Casa'
    },
    apartamento: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas'],
      defaultPanoramas: ['Sala', 'Comedor', 'Cocina', 'Habitación Principal', 'Habitación', 'Baño', 'Terraza'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno', 'diurno'],
      unitLabel: 'Apartamento'
    },
    condominio: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'amenidades'],
      defaultPanoramas: ['Lobby', 'Sala', 'Cocina', 'Habitación', 'Baño', 'Piscina', 'Gimnasio', 'Parque'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Unidad'
    },
    coliving: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'amenidades'],
      defaultPanoramas: ['Lobby', 'Coworking', 'Cocina Compartida', 'Habitación', 'Baño', 'Terraza'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'recorrido'],
      unitLabel: 'Espacio'
    },
    apartaestudios: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas'],
      defaultPanoramas: ['Estudio', 'Cocina', 'Baño', 'Terraza'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Apartaestudio'
    },
    locales: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads'],
      defaultPanoramas: ['Local', 'Pasillo', 'Parqueadero', 'Fachada'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Local'
    },
    'centro-comercial': {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias'],
      defaultPanoramas: ['Plaza Central', 'Pasillo', 'Food Court', 'Parqueadero'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno'],
      unitLabel: 'Local'
    },
    hotel: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'amenidades'],
      defaultPanoramas: ['Lobby', 'Recepción', 'Habitación', 'Baño', 'Restaurante', 'Piscina', 'Spa'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno'],
      unitLabel: 'Habitación'
    },
    oficinas: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias'],
      defaultPanoramas: ['Lobby', 'Recepción', 'Oficina', 'Sala de Juntas', 'Coworking'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Oficina'
    },
    otro: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads'],
      defaultPanoramas: ['Espacio 1', 'Espacio 2', 'Amenidades'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Unidad'
    }
  };

  function isCanonical(typeId) {
    return CANONICAL_TYPES.some(function (t) { return t.id === typeId; });
  }

  function normalizeDevelopmentType(typeId) {
    if (!typeId) return 'edificio';
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.normalizeTypeId) {
      return EstructuraEngine.normalizeTypeId(typeId);
    }
    if (isCanonical(typeId)) return typeId;
    return LEGACY_TO_CANONICAL[typeId] || 'edificio';
  }

  function getTypes() {
    return CANONICAL_TYPES.slice();
  }

  function getStructure(typeId) {
    var canonical = normalizeDevelopmentType(typeId);
    if (STRUCTURES[canonical]) return STRUCTURES[canonical];
    /* Non-residential leftover ids (hotel, oficinas, …) — structure only, not written by Estructura */
    if (STRUCTURES[typeId]) return STRUCTURES[typeId];
    return STRUCTURES.otro;
  }

  function getTypeLabel(typeId) {
    var canonical = normalizeDevelopmentType(typeId);
    var c = CANONICAL_TYPES.find(function (x) { return x.id === canonical; });
    if (c) return c.label;
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.DEVELOPMENT_TYPES) {
      var d = EstructuraEngine.DEVELOPMENT_TYPES.find(function (x) { return x.id === typeId || x.id === canonical; });
      if (d) return d.label;
    }
    var t = TYPES.find(function (x) { return x.id === typeId; });
    return t ? t.label : 'Proyecto';
  }

  return {
    CANONICAL_TYPES: CANONICAL_TYPES,
    LEGACY_TO_CANONICAL: LEGACY_TO_CANONICAL,
    TYPES: TYPES,
    getTypes: getTypes,
    getStructure: getStructure,
    getTypeLabel: getTypeLabel,
    normalizeDevelopmentType: normalizeDevelopmentType,
    isCanonical: isCanonical
  };
})();
