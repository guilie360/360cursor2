/* BOXIES V5.9 — Estructura Engine: catálogos + estado del constructor */
var EstructuraEngine = (function () {
  var DEVELOPMENT_TYPES = [
    { id: 'edificio', label: 'Edificio' },
    { id: 'torres', label: 'Torres' },
    { id: 'casas', label: 'Casas' },
    { id: 'urbanizacion', label: 'Urbanización' },
    { id: 'loteo', label: 'Loteo' },
    { id: 'parcelacion', label: 'Parcelación' }
  ];

  var PRODUCTS = {
    apartamento: [
      { id: 'apartamento', label: 'Apartamento' },
      { id: 'apartaestudio', label: 'Apartaestudio / Studio' },
      { id: 'duplex', label: 'Dúplex' },
      { id: 'triplex', label: 'Tríplex' },
      { id: 'penthouse', label: 'Penthouse' }
    ],
    casa: [
      { id: 'casa_unifamiliar', label: 'Casa unifamiliar' },
      { id: 'casa_bifamiliar', label: 'Casa bifamiliar' },
      { id: 'townhouse', label: 'Casa adosada / Townhouse' },
      { id: 'casa_pareada', label: 'Casa pareada' },
      { id: 'casa_condominio', label: 'Casa en condominio' }
    ],
    terreno: [
      { id: 'lote_urbano', label: 'Lote urbano' },
      { id: 'lote_campestre', label: 'Lote campestre' },
      { id: 'parcela', label: 'Parcela' }
    ]
  };

  var ZONE_GROUPS = [
    {
      id: 'acceso',
      label: 'Acceso',
      items: [
        'Portería', 'Lobby', 'Recepción', 'Control vehicular', 'Control peatonal', 'Portería 24/7'
      ]
    },
    {
      id: 'recreacion',
      label: 'Recreación',
      items: [
        'Piscina', 'Piscina infantil', 'Jacuzzi', 'Parque infantil', 'Parque', 'Zona verde',
        'Senderos', 'BBQ', 'Terraza', 'Rooftop', 'Salón social'
      ]
    },
    {
      id: 'deporte',
      label: 'Deporte / Bienestar',
      items: [
        'Gimnasio', 'Cancha múltiple', 'Cancha de fútbol', 'Cancha de tenis', 'Cancha de pádel',
        'Zona de yoga', 'Sauna', 'Turco'
      ]
    },
    {
      id: 'movilidad',
      label: 'Movilidad',
      items: [
        'Vías internas', 'Andenes', 'Ciclorutas', 'Parqueaderos residentes', 'Parqueaderos visitantes',
        'Parqueaderos motos', 'Bicicleteros', 'Parqueadero subterráneo'
      ]
    },
    {
      id: 'servicios',
      label: 'Servicios',
      items: [
        'Administración', 'Cuarto de residuos', 'Depósitos', 'Zona de mascotas', 'Lavandería comunal'
      ]
    },
    {
      id: 'naturaleza',
      label: 'Naturaleza',
      items: [
        'Lago', 'Laguna', 'Bosque', 'Jardines', 'Mirador', 'Reserva / área natural'
      ]
    }
  ];

  function uid() {
    return 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clampInt(v, min, max, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) n = fallback;
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }

  function productFamilyFor(developmentType) {
    if (developmentType === 'loteo' || developmentType === 'parcelacion') return 'terreno';
    if (developmentType === 'casas' || developmentType === 'urbanizacion') return 'casa';
    return 'apartamento';
  }

  function productsFor(developmentType) {
    return (PRODUCTS[productFamilyFor(developmentType)] || PRODUCTS.apartamento).slice();
  }

  function emptyBuilding(kind, index) {
    var label = kind === 'torre' ? ('Torre ' + (index + 1)) : (kind === 'edificio' ? 'Edificio A' : ('Bloque ' + (index + 1)));
    return {
      localId: uid(),
      id: null,
      kind: kind || 'edificio',
      nombre: label,
      pisos: kind === 'torre' ? 10 : 5,
      sotanos: 0,
      rooftop: false,
      unidadesPorPiso: 4,
      orden: index,
      open: index === 0
    };
  }

  function emptyTypology(developmentType, index) {
    var family = productFamilyFor(developmentType);
    var products = productsFor(developmentType);
    var product = products[0] ? products[0].id : 'apartamento';
    var plantas = family === 'terreno' ? 0 : 1;
    return {
      localId: uid(),
      id: null,
      producto: product,
      modelo: 'Modelo ' + String.fromCharCode(65 + (index % 26)),
      nombre: '',
      area_m2: family === 'terreno' ? 120 : 65,
      area_privada_m2: family === 'apartamento' ? 58 : null,
      area_lote_m2: family === 'casa' || family === 'terreno' ? 90 : null,
      habitaciones: family === 'terreno' ? 0 : 2,
      banos: family === 'terreno' ? 0 : 2,
      parqueaderos: family === 'terreno' ? 0 : 1,
      plantas_internas: plantas,
      precio: 0,
      plantas: plantas > 0 ? [emptyPlanta(1)] : [],
      ambientes: [],
      open: index === 0
    };
  }

  function emptyPlanta(orden) {
    return {
      localId: uid(),
      id: null,
      nombre: 'Planta ' + orden,
      orden: orden,
      open: false
    };
  }

  function emptyAmbiente(nombre, plantaLocalId) {
    return {
      localId: uid(),
      id: null,
      nombre: nombre || 'Ambiente',
      plantaLocalId: plantaLocalId || null,
      orden: 0
    };
  }

  function emptyState(developmentType) {
    var type = developmentType || 'edificio';
    var buildings = [];
    if (type === 'edificio') buildings = [emptyBuilding('edificio', 0)];
    if (type === 'torres') buildings = [emptyBuilding('torre', 0), emptyBuilding('torre', 1)];

    return {
      developmentType: type,
      buildings: buildings,
      orgEtapas: false,
      orgSectores: false,
      orgManzanas: false,
      totalViviendas: type === 'casas' || type === 'urbanizacion' ? 50 : null,
      totalLotes: type === 'loteo' || type === 'parcelacion' ? 100 : null,
      tipologiasCount: 1,
      repeatFloorDistribution: true,
      tipologias: [emptyTypology(type, 0)],
      zoneNames: [],
      amenidadesCatalog: [],
      appliedAt: null,
      dirty: false,
      openPanels: {
        dev: true,
        org: true,
        tipologias: true,
        zonas: true
      }
    };
  }

  function migrateLegacyProjectType(projectType) {
    var map = {
      casa: 'casas',
      apartamento: 'edificio',
      edificio: 'edificio',
      conjunto: 'urbanizacion',
      condominio: 'casas',
      coliving: 'edificio',
      apartaestudios: 'edificio',
      lotes: 'loteo',
      mixto: 'urbanizacion',
      otro: 'edificio'
    };
    return map[projectType] || null;
  }

  function ensureState(state) {
    if (!state.estructura || typeof state.estructura !== 'object') {
      var fromLegacy = migrateLegacyProjectType(state.projectType);
      state.estructura = emptyState(fromLegacy || 'edificio');
      if (fromLegacy) state.projectType = fromLegacy;
    }
    var e = state.estructura;
    if (!e.developmentType) e.developmentType = 'edificio';
    if (!Array.isArray(e.buildings)) e.buildings = [];
    if (!Array.isArray(e.tipologias)) e.tipologias = [];
    if (!Array.isArray(e.zoneNames)) e.zoneNames = [];
    if (!e.openPanels) e.openPanels = { dev: true, org: true, tipologias: true, zonas: true };
    if (e.openPanels.dev == null) e.openPanels.dev = true;
    if (e.openPanels.org == null) e.openPanels.org = true;
    if (e.openPanels.tipologias == null) e.openPanels.tipologias = true;
    if (e.openPanels.zonas == null) e.openPanels.zonas = true;
    if (!e.tipologias.length) e.tipologias = [emptyTypology(e.developmentType, 0)];
    syncTypologyPlantas(e);
    return e;
  }

  function syncTypologyPlantas(estructura) {
    (estructura.tipologias || []).forEach(function (t) {
      var n = clampInt(t.plantas_internas, 0, 20, 1);
      t.plantas_internas = n;
      if (!Array.isArray(t.plantas)) t.plantas = [];
      while (t.plantas.length < n) {
        t.plantas.push(emptyPlanta(t.plantas.length + 1));
      }
      if (t.plantas.length > n) {
        var removed = t.plantas.slice(n);
        t.plantas = t.plantas.slice(0, n);
        var keepIds = {};
        t.plantas.forEach(function (p) { keepIds[p.localId] = true; });
        t.ambientes = (t.ambientes || []).filter(function (a) {
          return !a.plantaLocalId || keepIds[a.plantaLocalId];
        });
        void removed;
      }
      t.plantas.forEach(function (p, i) {
        p.orden = i + 1;
        if (!p.nombre || /^Planta\s+\d+$/i.test(p.nombre)) p.nombre = 'Planta ' + (i + 1);
      });
      if (!Array.isArray(t.ambientes)) t.ambientes = [];
      if (!t.nombre) {
        t.nombre = ((productsFor(estructura.developmentType).find(function (p) {
          return p.id === t.producto;
        }) || {}).label || 'Tipología') + (t.modelo ? ' · ' + t.modelo : '');
      }
    });
  }

  function setDevelopmentType(state, typeId) {
    var e = ensureState(state);
    if (e.developmentType === typeId) return e;
    e.developmentType = typeId;
    state.projectType = typeId;
    e.buildings = [];
    if (typeId === 'edificio') e.buildings = [emptyBuilding('edificio', 0)];
    if (typeId === 'torres') e.buildings = [emptyBuilding('torre', 0), emptyBuilding('torre', 1)];
    if (typeId === 'casas' || typeId === 'urbanizacion') {
      e.totalViviendas = e.totalViviendas || 50;
      e.tipologiasCount = e.tipologiasCount || 1;
    }
    if (typeId === 'loteo' || typeId === 'parcelacion') {
      e.totalLotes = e.totalLotes || 100;
    }
    e.tipologias = [emptyTypology(typeId, 0)];
    e.dirty = true;
    syncTypologyPlantas(e);
    return e;
  }

  function setTowerCount(state, count) {
    var e = ensureState(state);
    count = clampInt(count, 1, 40, 2);
    var kind = 'torre';
    while (e.buildings.length < count) {
      e.buildings.push(emptyBuilding(kind, e.buildings.length));
    }
    if (e.buildings.length > count) e.buildings = e.buildings.slice(0, count);
    e.buildings.forEach(function (b, i) {
      b.orden = i;
      if (!b.nombre || /^Torre\s+\d+$/i.test(b.nombre)) b.nombre = 'Torre ' + (i + 1);
    });
    e.dirty = true;
    return e;
  }

  function copyBuildingConfig(state, fromLocalId) {
    var e = ensureState(state);
    var src = e.buildings.find(function (b) { return b.localId === fromLocalId; });
    if (!src) return e;
    e.buildings.forEach(function (b) {
      if (b.localId === fromLocalId) return;
      b.pisos = src.pisos;
      b.sotanos = src.sotanos;
      b.rooftop = src.rooftop;
      b.unidadesPorPiso = src.unidadesPorPiso;
    });
    e.dirty = true;
    return e;
  }

  function setTypologyCount(state, count) {
    var e = ensureState(state);
    count = clampInt(count, 1, 40, 1);
    e.tipologiasCount = count;
    while (e.tipologias.length < count) {
      e.tipologias.push(emptyTypology(e.developmentType, e.tipologias.length));
    }
    if (e.tipologias.length > count) e.tipologias = e.tipologias.slice(0, count);
    syncTypologyPlantas(e);
    e.dirty = true;
    return e;
  }

  function addTypology(state) {
    var e = ensureState(state);
    e.tipologias.push(emptyTypology(e.developmentType, e.tipologias.length));
    e.tipologiasCount = e.tipologias.length;
    syncTypologyPlantas(e);
    e.dirty = true;
    return e;
  }

  function removeTypology(state, localId) {
    var e = ensureState(state);
    if (e.tipologias.length <= 1) return { ok: false, reason: 'min' };
    var tip = e.tipologias.find(function (t) { return t.localId === localId; });
    if (!tip) return { ok: false, reason: 'missing' };
    var hasContent = (tip.ambientes && tip.ambientes.length) || tip.id;
    if (hasContent) return { ok: false, reason: 'conflict', tip: tip };
    e.tipologias = e.tipologias.filter(function (t) { return t.localId !== localId; });
    e.tipologiasCount = e.tipologias.length;
    e.dirty = true;
    return { ok: true };
  }

  function toggleZone(state, name) {
    var e = ensureState(state);
    var i = e.zoneNames.indexOf(name);
    if (i >= 0) e.zoneNames.splice(i, 1);
    else e.zoneNames.push(name);
    e.dirty = true;
    return e;
  }

  function validate(estructura) {
    var errors = [];
    if (!estructura || !estructura.developmentType) {
      errors.push('Selecciona un tipo de desarrollo.');
      return errors;
    }
    var t = estructura.developmentType;
    if (t === 'edificio' || t === 'torres') {
      if (!estructura.buildings || !estructura.buildings.length) {
        errors.push('Define al menos un edificio o torre.');
      }
      (estructura.buildings || []).forEach(function (b) {
        if (!b.nombre || !String(b.nombre).trim()) errors.push('Cada torre/edificio necesita nombre.');
        if (clampInt(b.pisos, 1, 200, 0) < 1) errors.push('Pisos inválidos en ' + (b.nombre || 'edificio'));
      });
    }
    if ((t === 'casas' || t === 'urbanizacion') && clampInt(estructura.totalViviendas, 1, 50000, 0) < 1) {
      errors.push('Indica la cantidad total de viviendas.');
    }
    if ((t === 'loteo' || t === 'parcelacion') && clampInt(estructura.totalLotes, 1, 100000, 0) < 1) {
      errors.push('Indica la cantidad de lotes/parcelas.');
    }
    if (!estructura.tipologias || !estructura.tipologias.length) {
      errors.push('Añade al menos una tipología.');
    }
    (estructura.tipologias || []).forEach(function (tip, i) {
      if (!tip.producto) errors.push('Tipología ' + (i + 1) + ': selecciona producto.');
      if (!tip.modelo && !tip.nombre) errors.push('Tipología ' + (i + 1) + ': indica modelo o nombre.');
    });
    return errors;
  }

  function summary(estructura) {
    if (!estructura) return null;
    var parts = [DEVELOPMENT_TYPES.find(function (d) { return d.id === estructura.developmentType; })];
    var label = parts[0] ? parts[0].label : estructura.developmentType;
    var tips = (estructura.tipologias || []).length;
    return label + ' · ' + tips + ' tipolog' + (tips === 1 ? 'ía' : 'ías');
  }

  return {
    DEVELOPMENT_TYPES: DEVELOPMENT_TYPES,
    PRODUCTS: PRODUCTS,
    ZONE_GROUPS: ZONE_GROUPS,
    uid: uid,
    clampInt: clampInt,
    productFamilyFor: productFamilyFor,
    productsFor: productsFor,
    emptyState: emptyState,
    emptyBuilding: emptyBuilding,
    emptyTypology: emptyTypology,
    emptyPlanta: emptyPlanta,
    emptyAmbiente: emptyAmbiente,
    ensureState: ensureState,
    syncTypologyPlantas: syncTypologyPlantas,
    setDevelopmentType: setDevelopmentType,
    setTowerCount: setTowerCount,
    copyBuildingConfig: copyBuildingConfig,
    setTypologyCount: setTypologyCount,
    addTypology: addTypology,
    removeTypology: removeTypology,
    toggleZone: toggleZone,
    validate: validate,
    summary: summary,
    migrateLegacyProjectType: migrateLegacyProjectType
  };
})();
