/* Project Types Engine — base structures per project type */
var ProjectTypesEngine = (function () {
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
      unitLabel: 'Vivienda'
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
    lotes: {
      modules: ['hero', 'gallery', 'plans', 'downloads'],
      defaultPanoramas: [],
      galleryGroups: ['exterior', 'masterplan', 'recorrido'],
      unitLabel: 'Lote'
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
    mixto: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads', 'tipologias', 'viviendas', 'amenidades'],
      defaultPanoramas: ['Lobby', 'Sala', 'Cocina', 'Habitación', 'Baño', 'Local Comercial', 'Amenidades'],
      galleryGroups: ['exterior', 'interior', 'amenidades', 'nocturno', 'diurno', 'recorrido'],
      unitLabel: 'Unidad'
    },
    otro: {
      modules: ['hero', 'gallery', '360', 'plans', 'downloads'],
      defaultPanoramas: ['Espacio 1', 'Espacio 2', 'Amenidades'],
      galleryGroups: ['exterior', 'interior', 'amenidades'],
      unitLabel: 'Unidad'
    }
  };

  function getTypes() {
    return TYPES.slice();
  }

  function getStructure(typeId) {
    var map = {
      edificio: 'edificio',
      torres: 'edificio',
      casas: 'casa',
      urbanizacion: 'conjunto',
      loteo: 'lotes',
      parcelacion: 'lotes'
    };
    var key = map[typeId] || typeId;
    return STRUCTURES[key] || STRUCTURES.otro;
  }

  function getTypeLabel(typeId) {
    if (typeof EstructuraEngine !== 'undefined') {
      var d = EstructuraEngine.DEVELOPMENT_TYPES.find(function (x) { return x.id === typeId; });
      if (d) return d.label;
    }
    var t = TYPES.find(function (x) { return x.id === typeId; });
    return t ? t.label : 'Proyecto';
  }

  return {
    TYPES: TYPES,
    getTypes: getTypes,
    getStructure: getStructure,
    getTypeLabel: getTypeLabel
  };
})();
