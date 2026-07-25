/* BOXIES V5.9.5 — Estructura Engine: tipos Unidad/Edificio/Conjunto/Lotes/Mixto */
var EstructuraEngine = (function () {
  var DEVELOPMENT_TYPES = [
    { id: 'unidad', label: 'Unidad' },
    { id: 'edificio', label: 'Edificio' },
    { id: 'conjunto', label: 'Conjunto' },
    { id: 'lotes', label: 'Lotes' },
    { id: 'mixto', label: 'Mixto' }
  ];

  var LEGACY_TYPE_MAP = {
    torres: 'edificio',
    casas: 'conjunto',
    urbanizacion: 'conjunto',
    loteo: 'lotes',
    parcelacion: 'lotes'
  };

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
      { id: 'parcela', label: 'Parcela' },
      { id: 'lote_esquinero', label: 'Lote esquinero' },
      { id: 'lote_frente_parque', label: 'Lote frente al parque' }
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

  /* UI catalog only — persisted ambientes remain plain {nombre, plantaLocalId} rows */
  var AMBIENTE_CATALOG = [
    {
      id: 'social',
      label: 'Social',
      items: ['Sala', 'Comedor', 'Sala / Comedor', 'Estar', 'Sala de TV', 'Estudio', 'Biblioteca']
    },
    {
      id: 'cocina',
      label: 'Cocina / Servicio',
      items: [
        'Cocina', 'Cocina abierta', 'Cocina cerrada', 'Despensa', 'Zona de ropas',
        'Lavandería', 'Cuarto de servicio', 'Baño de servicio', 'Depósito'
      ]
    },
    {
      id: 'habitaciones',
      label: 'Habitaciones',
      items: ['Habitación principal', 'Habitación', 'Habitación auxiliar', 'Vestier', 'Walk-in closet']
    },
    {
      id: 'banos',
      label: 'Baños',
      items: ['Baño principal', 'Baño', 'Baño social', 'Medio baño']
    },
    {
      id: 'exterior',
      label: 'Exterior / Privado',
      items: [
        'Balcón', 'Terraza', 'Patio', 'Jardín', 'Piscina privada', 'Jacuzzi',
        'BBQ', 'Parqueadero', 'Garaje'
      ]
    },
    {
      id: 'otros',
      label: 'Otros',
      items: [
        'Circulación', 'Hall', 'Escalera', 'Ascensor', 'Mezanine', 'Altillo', 'Sótano', 'Otro'
      ]
    }
  ];

  var AMBIENTE_EXTERIOR_PRIORITY = [
    'Patio', 'Jardín', 'Terraza', 'Piscina privada', 'Jacuzzi', 'BBQ', 'Parqueadero', 'Garaje'
  ];

  function isCustomAmbienteOption(name) {
    return name === 'Otro' || name === 'Otro...';
  }

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

  function isCanonicalType(id) {
    return DEVELOPMENT_TYPES.some(function (t) { return t.id === id; });
  }

  function normalizeTypeId(typeId) {
    if (!typeId) return 'edificio';
    if (isCanonicalType(typeId)) return typeId;
    return LEGACY_TYPE_MAP[typeId] || 'edificio';
  }

  function productFamilyFor(developmentType, componente) {
    var t = normalizeTypeId(developmentType);
    if (componente === 'edificios') return 'apartamento';
    if (componente === 'casas') return 'casa';
    if (componente === 'lotes') return 'terreno';
    if (t === 'lotes') return 'terreno';
    if (t === 'conjunto') return 'casa';
    if (t === 'unidad') return null; /* depends on unidadHousingType */
    if (t === 'mixto') return 'apartamento';
    return 'apartamento';
  }

  function productsFor(developmentType, opts) {
    opts = opts || {};
    var t = normalizeTypeId(developmentType);
    var family = productFamilyFor(t, opts.componente);
    if (t === 'unidad') {
      family = opts.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa';
    }
    if (!family) family = 'apartamento';
    return (PRODUCTS[family] || PRODUCTS.apartamento).slice();
  }

  function emptyBuilding(kind, index) {
    var label =
      kind === 'torre'
        ? 'Torre ' + String.fromCharCode(65 + (index % 26))
        : kind === 'edificio'
          ? (index === 0 ? 'Edificio A' : 'Edificio ' + String.fromCharCode(65 + (index % 26)))
          : 'Bloque ' + (index + 1);
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

  function emptyTypology(developmentType, index, opts) {
    opts = opts || {};
    var t = normalizeTypeId(developmentType);
    var componente = opts.componente || null;
    var products = productsFor(t, {
      componente: componente,
      unidadHousingType: opts.unidadHousingType
    });
    var family = productFamilyFor(t, componente);
    if (t === 'unidad') {
      family = opts.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa';
    }
    if (!family) family = 'apartamento';
    var product = products[0] ? products[0].id : 'apartamento';
    var plantas = family === 'terreno' ? 0 : 1;
    return {
      localId: uid(),
      id: null,
      componente: componente,
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

  /* ── Conjunto: etapas + componentes (config_json only; no Tipologías/Viviendas sync yet) ── */
  var CONJUNTO_COMPONENT_TYPES = [
    { id: 'casa', label: 'Casas', defaultNombre: 'Modelo A', defaultCantidad: 1 },
    { id: 'edificio', label: 'Edificio', defaultNombre: 'Torre A', defaultCantidad: 1 },
    { id: 'lotes', label: 'Lotes', defaultNombre: 'Lotes', defaultCantidad: 1 },
    { id: 'comercio', label: 'Comercio', defaultNombre: 'Locales comerciales', defaultCantidad: 1 },
    { id: 'oficinas', label: 'Oficinas', defaultNombre: 'Oficinas', defaultCantidad: 1 },
    { id: 'otro', label: 'Otro', defaultNombre: 'Otro', defaultCantidad: 1 }
  ];

  function conjuntoComponentTypeMeta(typeId) {
    return CONJUNTO_COMPONENT_TYPES.find(function (t) { return t.id === typeId; }) || CONJUNTO_COMPONENT_TYPES[5];
  }

  function emptyConjuntoComponent(typeId, orden) {
    var meta = conjuntoComponentTypeMeta(typeId || 'otro');
    return {
      localId: uid(),
      type: meta.id,
      nombre: meta.defaultNombre,
      cantidad: meta.defaultCantidad,
      orden: orden != null ? orden : 0
    };
  }

  function emptyConjuntoStage(orden) {
    var n = (orden != null ? orden : 0) + 1;
    return {
      localId: uid(),
      nombre: 'Etapa ' + n,
      open: orden === 0 || orden == null,
      components: [],
      orden: orden != null ? orden : 0
    };
  }

  function emptyConjuntoConfig(useStages) {
    return {
      useStages: !!useStages,
      components: [],
      stages: useStages ? [emptyConjuntoStage(0)] : []
    };
  }

  function normalizeConjuntoComponent(raw, orden) {
    var meta = conjuntoComponentTypeMeta(raw && raw.type);
    return {
      localId: (raw && raw.localId) || uid(),
      type: meta.id,
      nombre: (raw && raw.nombre != null && String(raw.nombre).trim())
        ? String(raw.nombre).trim()
        : meta.defaultNombre,
      cantidad: clampInt(raw && raw.cantidad, 1, 100000, meta.defaultCantidad),
      orden: raw && raw.orden != null ? raw.orden : (orden || 0)
    };
  }

  function normalizeConjuntoStage(raw, orden) {
    var comps = Array.isArray(raw && raw.components) ? raw.components : [];
    return {
      localId: (raw && raw.localId) || uid(),
      nombre: (raw && raw.nombre != null && String(raw.nombre).trim())
        ? String(raw.nombre).trim()
        : ('Etapa ' + ((orden != null ? orden : 0) + 1)),
      open: raw && raw.open != null ? !!raw.open : (orden === 0),
      components: comps.map(function (c, i) { return normalizeConjuntoComponent(c, i); }),
      orden: raw && raw.orden != null ? raw.orden : (orden || 0)
    };
  }

  function ensureConjuntoConfig(e) {
    if (!e || typeof e !== 'object') return e;
    if (!e.conjuntoConfig || typeof e.conjuntoConfig !== 'object') {
      e.conjuntoConfig = emptyConjuntoConfig(!!e.orgEtapas);
    }
    var cfg = e.conjuntoConfig;
    cfg.useStages = !!e.orgEtapas;
    if (!Array.isArray(cfg.components)) cfg.components = [];
    if (!Array.isArray(cfg.stages)) cfg.stages = [];
    cfg.components = cfg.components.map(function (c, i) {
      return normalizeConjuntoComponent(c, i);
    });
    cfg.stages = cfg.stages.map(function (s, i) {
      return normalizeConjuntoStage(s, i);
    });
    /* Legacy: orgEtapas true but no stages yet → seed Etapa 1 (non-destructive) */
    if (cfg.useStages && !cfg.stages.length) {
      var stage = emptyConjuntoStage(0);
      if (cfg.components.length) {
        stage.components = cfg.components.map(function (c, i) {
          return normalizeConjuntoComponent(c, i);
        });
        cfg.components = [];
      }
      cfg.stages = [stage];
    }
    return e;
  }

  function setConjuntoUseStages(state, useStages) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var want = !!useStages;
    var cfg = e.conjuntoConfig;
    var prev = !!cfg.useStages;
    cfg.useStages = want;
    e.orgEtapas = want;
    if (want && !prev) {
      if (!cfg.stages.length) {
        var stage = emptyConjuntoStage(0);
        if (cfg.components.length) {
          stage.components = cfg.components.slice();
          cfg.components = [];
        }
        cfg.stages = [stage];
      }
    }
    /* Switching off keeps stages in config for compatibility; UI uses root components */
    e.dirty = true;
    return e;
  }

  function addConjuntoStage(state) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    e.orgEtapas = true;
    e.conjuntoConfig.useStages = true;
    var stages = e.conjuntoConfig.stages;
    stages.forEach(function (s) { s.open = false; });
    var stage = emptyConjuntoStage(stages.length);
    stage.open = true;
    stages.push(stage);
    e.dirty = true;
    return stage;
  }

  function removeConjuntoStage(state, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var stages = e.conjuntoConfig.stages;
    if (stages.length <= 1) return e;
    e.conjuntoConfig.stages = stages.filter(function (s) { return s.localId !== stageLocalId; });
    e.conjuntoConfig.stages.forEach(function (s, i) { s.orden = i; });
    e.dirty = true;
    return e;
  }

  function findConjuntoComponentList(e, stageLocalId) {
    ensureConjuntoConfig(e);
    if (stageLocalId) {
      var stage = e.conjuntoConfig.stages.find(function (s) { return s.localId === stageLocalId; });
      return stage ? stage.components : null;
    }
    return e.conjuntoConfig.components;
  }

  function addConjuntoComponent(state, typeId, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return null;
    var comp = emptyConjuntoComponent(typeId, list.length);
    list.push(comp);
    e.dirty = true;
    return comp;
  }

  function removeConjuntoComponent(state, componentLocalId, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return e;
    var next = list.filter(function (c) { return c.localId !== componentLocalId; });
    if (stageLocalId) {
      var stage = e.conjuntoConfig.stages.find(function (s) { return s.localId === stageLocalId; });
      if (stage) stage.components = next;
    } else {
      e.conjuntoConfig.components = next;
    }
    e.dirty = true;
    return e;
  }

  function updateConjuntoComponent(state, componentLocalId, patch, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return e;
    var comp = list.find(function (c) { return c.localId === componentLocalId; });
    if (!comp || !patch) return e;
    if (patch.nombre != null) comp.nombre = String(patch.nombre);
    if (patch.cantidad != null) comp.cantidad = clampInt(patch.cantidad, 1, 100000, comp.cantidad);
    if (patch.type) {
      var meta = conjuntoComponentTypeMeta(patch.type);
      comp.type = meta.id;
    }
    e.dirty = true;
    return e;
  }

  function updateConjuntoStage(state, stageLocalId, patch) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var stage = e.conjuntoConfig.stages.find(function (s) { return s.localId === stageLocalId; });
    if (!stage || !patch) return e;
    if (patch.nombre != null) {
      var name = String(patch.nombre).trim();
      if (name) stage.nombre = name;
    }
    if (patch.open != null) stage.open = !!patch.open;
    e.dirty = true;
    return e;
  }

  function defaultMixto() {
    return { edificios: true, casas: false, lotes: false };
  }

  function emptyState(developmentType) {
    var type = normalizeTypeId(developmentType || 'edificio');
    var buildings = [];
    if (type === 'edificio') buildings = [emptyBuilding('edificio', 0)];

    return {
      developmentType: type,
      edificioMode: 'unico',
      unidadHousingType: 'casa',
      unidadCount: 1,
      lotesSubtype: 'urbano',
      mixto: defaultMixto(),
      buildings: buildings,
      orgEtapas: false,
      orgSectores: false,
      orgManzanas: false,
      totalViviendas: type === 'conjunto' ? 50 : null,
      totalLotes: type === 'lotes' ? 100 : null,
      tipologiasCount: 1,
      repeatFloorDistribution: true,
      tipologias: [emptyTypology(type, 0, { unidadHousingType: 'casa' })],
      zoneNames: [],
      amenidadesCatalog: [],
      conjuntoConfig: emptyConjuntoConfig(false),
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
      casa: 'conjunto',
      casas: 'conjunto',
      apartamento: 'edificio',
      edificio: 'edificio',
      torres: 'edificio',
      conjunto: 'conjunto',
      urbanizacion: 'conjunto',
      condominio: 'conjunto',
      coliving: 'edificio',
      apartaestudios: 'edificio',
      lotes: 'lotes',
      loteo: 'lotes',
      parcelacion: 'lotes',
      unidad: 'unidad',
      mixto: 'mixto',
      otro: 'edificio'
    };
    return map[projectType] || null;
  }

  function applyLegacyNormalization(e, rawType) {
    var raw = rawType || e.developmentType;
    if (raw === 'torres') {
      e.developmentType = 'edificio';
      e.edificioMode = 'multiples';
      if (!e.buildings || e.buildings.length < 2) {
        e.buildings = [emptyBuilding('torre', 0), emptyBuilding('torre', 1)];
      } else {
        e.buildings.forEach(function (b) {
          if (b.kind === 'edificio') b.kind = 'torre';
        });
      }
    } else if (raw === 'casas' || raw === 'urbanizacion') {
      e.developmentType = 'conjunto';
      if (raw === 'urbanizacion') {
        /* keep org flags as stored */
      }
    } else if (raw === 'loteo') {
      e.developmentType = 'lotes';
      e.lotesSubtype = e.lotesSubtype || 'urbano';
    } else if (raw === 'parcelacion') {
      e.developmentType = 'lotes';
      e.lotesSubtype = e.lotesSubtype || 'campestre';
    } else if (raw === 'edificio') {
      e.developmentType = 'edificio';
      if (!e.edificioMode) {
        e.edificioMode = (e.buildings && e.buildings.length > 1) ? 'multiples' : 'unico';
      }
    } else {
      e.developmentType = normalizeTypeId(raw);
    }
    return e;
  }

  function ensureState(state) {
    if (!state.estructura || typeof state.estructura !== 'object') {
      var fromLegacy = migrateLegacyProjectType(state.projectType);
      state.estructura = emptyState(fromLegacy || 'edificio');
      if (fromLegacy) state.projectType = fromLegacy;
    }
    var e = state.estructura;
    var rawType = e.developmentType;
    if (!e.developmentType) e.developmentType = 'edificio';
    if (!isCanonicalType(e.developmentType) || LEGACY_TYPE_MAP[rawType]) {
      applyLegacyNormalization(e, rawType);
    }
    if (!e.edificioMode) e.edificioMode = (e.buildings && e.buildings.length > 1) ? 'multiples' : 'unico';
    if (!e.unidadHousingType) e.unidadHousingType = 'casa';
    if (e.unidadCount == null) e.unidadCount = e.totalViviendas || 1;
    if (!e.lotesSubtype) e.lotesSubtype = 'urbano';
    if (!e.mixto || typeof e.mixto !== 'object') e.mixto = defaultMixto();
    if (!Array.isArray(e.buildings)) e.buildings = [];
    if (!Array.isArray(e.tipologias)) e.tipologias = [];
    if (!Array.isArray(e.zoneNames)) e.zoneNames = [];
    if (!e.openPanels) e.openPanels = { dev: true, org: true, tipologias: true, zonas: true };
    if (e.openPanels.dev == null) e.openPanels.dev = true;
    if (e.openPanels.org == null) e.openPanels.org = true;
    if (e.openPanels.tipologias == null) e.openPanels.tipologias = true;
    if (e.openPanels.zonas == null) e.openPanels.zonas = true;
    ensureConjuntoConfig(e);
    if (!e.tipologias.length) {
      e.tipologias = [emptyTypology(e.developmentType, 0, {
        unidadHousingType: e.unidadHousingType,
        componente: e.developmentType === 'mixto' && e.mixto.edificios ? 'edificios' : null
      })];
    }
    e.tipologias.forEach(function (t) {
      if (t.componente == null) t.componente = null;
    });
    if (e.developmentType === 'edificio' && e.edificioMode === 'unico' && !e.buildings.length) {
      e.buildings = [emptyBuilding('edificio', 0)];
    }
    if (e.developmentType === 'unidad') {
      e.totalViviendas = e.unidadCount;
    }
    state.projectType = e.developmentType;
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
        t.plantas = t.plantas.slice(0, n);
        var keepIds = {};
        t.plantas.forEach(function (p) { keepIds[p.localId] = true; });
        t.ambientes = (t.ambientes || []).filter(function (a) {
          return !a.plantaLocalId || keepIds[a.plantaLocalId];
        });
      }
      t.plantas.forEach(function (p, i) {
        p.orden = i + 1;
        if (!p.nombre || /^Planta\s+\d+$/i.test(p.nombre)) p.nombre = 'Planta ' + (i + 1);
      });
      if (!Array.isArray(t.ambientes)) t.ambientes = [];
      if (!t.nombre) {
        var prods = productsFor(estructura.developmentType, {
          componente: t.componente,
          unidadHousingType: estructura.unidadHousingType
        });
        t.nombre = ((prods.find(function (p) {
          return p.id === t.producto;
        }) || {}).label || 'Tipología') + (t.modelo ? ' · ' + t.modelo : '');
      }
    });
  }

  function configSnapshot(e) {
    ensureConjuntoConfig(e);
    return {
      v: 3,
      edificioMode: e.edificioMode,
      unidadHousingType: e.unidadHousingType,
      unidadCount: e.unidadCount,
      lotesSubtype: e.lotesSubtype,
      mixto: e.mixto,
      tipologiasComponentes: (e.tipologias || []).map(function (t) {
        return { localId: t.localId, id: t.id, componente: t.componente || null };
      }),
      conjuntoConfig: e.conjuntoConfig ? {
        useStages: !!e.conjuntoConfig.useStages,
        components: (e.conjuntoConfig.components || []).map(function (c, i) {
          return normalizeConjuntoComponent(c, i);
        }),
        stages: (e.conjuntoConfig.stages || []).map(function (s, i) {
          return normalizeConjuntoStage(s, i);
        })
      } : emptyConjuntoConfig(!!e.orgEtapas)
    };
  }

  function applyConfigSnapshot(e, cfg) {
    if (!cfg || typeof cfg !== 'object') return e;
    if (cfg.edificioMode) e.edificioMode = cfg.edificioMode;
    if (cfg.unidadHousingType) e.unidadHousingType = cfg.unidadHousingType;
    if (cfg.unidadCount != null) e.unidadCount = cfg.unidadCount;
    if (cfg.lotesSubtype) e.lotesSubtype = cfg.lotesSubtype;
    if (cfg.mixto) e.mixto = cfg.mixto;
    if (Array.isArray(cfg.tipologiasComponentes) && e.tipologias) {
      cfg.tipologiasComponentes.forEach(function (row) {
        var tip = e.tipologias.find(function (t) {
          return (row.id && t.id === row.id) || (row.localId && t.localId === row.localId);
        });
        if (tip && row.componente) tip.componente = row.componente;
      });
    }
    if (cfg.conjuntoConfig && typeof cfg.conjuntoConfig === 'object') {
      e.conjuntoConfig = {
        useStages: !!cfg.conjuntoConfig.useStages,
        components: Array.isArray(cfg.conjuntoConfig.components)
          ? cfg.conjuntoConfig.components.map(function (c, i) {
              return normalizeConjuntoComponent(c, i);
            })
          : [],
        stages: Array.isArray(cfg.conjuntoConfig.stages)
          ? cfg.conjuntoConfig.stages.map(function (s, i) {
              return normalizeConjuntoStage(s, i);
            })
          : []
      };
      e.orgEtapas = !!e.conjuntoConfig.useStages;
    }
    ensureConjuntoConfig(e);
    return e;
  }

  function setDevelopmentType(state, typeId) {
    var e = ensureState(state);
    typeId = normalizeTypeId(typeId);
    if (e.developmentType === typeId) return e;
    e.developmentType = typeId;
    state.projectType = typeId;
    if (typeof ProjectTypesEngine !== 'undefined') {
      state.projectStructure = ProjectTypesEngine.getStructure(typeId);
    }
    e.buildings = [];
    e.edificioMode = 'unico';
    e.unidadHousingType = 'casa';
    e.unidadCount = 1;
    e.lotesSubtype = 'urbano';
    e.mixto = defaultMixto();
    e.orgEtapas = false;
    e.orgSectores = false;
    e.orgManzanas = false;
    e.totalViviendas = null;
    e.totalLotes = null;

    if (typeId === 'edificio') {
      e.buildings = [emptyBuilding('edificio', 0)];
    } else if (typeId === 'conjunto') {
      e.totalViviendas = 50;
      e.conjuntoConfig = emptyConjuntoConfig(false);
      e.orgEtapas = false;
    } else if (typeId === 'lotes') {
      e.totalLotes = 100;
    } else if (typeId === 'unidad') {
      e.unidadCount = 1;
      e.totalViviendas = 1;
    } else if (typeId === 'mixto') {
      e.mixto = { edificios: true, casas: true, lotes: false };
      e.buildings = [emptyBuilding('edificio', 0)];
      e.totalViviendas = 20;
      e.totalLotes = 50;
    }

    e.tipologias = [
      emptyTypology(typeId, 0, {
        unidadHousingType: e.unidadHousingType,
        componente: typeId === 'mixto' ? 'edificios' : null
      })
    ];
    e.tipologiasCount = 1;
    e.dirty = true;
    syncTypologyPlantas(e);
    return e;
  }

  function setEdificioMode(state, mode) {
    var e = ensureState(state);
    e.edificioMode = mode === 'multiples' ? 'multiples' : 'unico';
    if (e.edificioMode === 'unico') {
      if (!e.buildings.length) e.buildings = [emptyBuilding('edificio', 0)];
      else {
        e.buildings = [e.buildings[0]];
        e.buildings[0].kind = 'edificio';
        e.buildings[0].open = true;
      }
    } else {
      if (!e.buildings.length) {
        e.buildings = [emptyBuilding('torre', 0), emptyBuilding('torre', 1)];
      } else {
        e.buildings.forEach(function (b, i) {
          b.kind = 'torre';
          if (!b.nombre || /^Edificio/i.test(b.nombre)) {
            b.nombre = 'Torre ' + String.fromCharCode(65 + (i % 26));
          }
        });
        if (e.buildings.length < 2) e.buildings.push(emptyBuilding('torre', e.buildings.length));
      }
    }
    e.dirty = true;
    return e;
  }

  function setTowerCount(state, count) {
    var e = ensureState(state);
    count = clampInt(count, 1, 40, 2);
    e.edificioMode = 'multiples';
    var kind = 'torre';
    while (e.buildings.length < count) {
      e.buildings.push(emptyBuilding(kind, e.buildings.length));
    }
    if (e.buildings.length > count) e.buildings = e.buildings.slice(0, count);
    e.buildings.forEach(function (b, i) {
      b.orden = i;
      b.kind = 'torre';
      /* Never rewrite custom names — only fill blanks */
      if (!b.nombre || !String(b.nombre).trim()) {
        b.nombre = 'Torre ' + String.fromCharCode(65 + (i % 26));
      }
    });
    e.dirty = true;
    return e;
  }

  function addBuilding(state) {
    var e = ensureState(state);
    e.edificioMode = 'multiples';
    e.buildings.push(emptyBuilding('torre', e.buildings.length));
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
    var comp = e.developmentType === 'mixto'
      ? (e.mixto.edificios ? 'edificios' : e.mixto.casas ? 'casas' : 'lotes')
      : null;
    while (e.tipologias.length < count) {
      e.tipologias.push(emptyTypology(e.developmentType, e.tipologias.length, {
        unidadHousingType: e.unidadHousingType,
        componente: comp
      }));
    }
    if (e.tipologias.length > count) e.tipologias = e.tipologias.slice(0, count);
    syncTypologyPlantas(e);
    e.dirty = true;
    return e;
  }

  function addTypology(state, componente) {
    var e = ensureState(state);
    var comp = componente || null;
    if (e.developmentType === 'mixto' && !comp) {
      if (e.mixto.edificios) comp = 'edificios';
      else if (e.mixto.casas) comp = 'casas';
      else comp = 'lotes';
    }
    e.tipologias.push(emptyTypology(e.developmentType, e.tipologias.length, {
      unidadHousingType: e.unidadHousingType,
      componente: comp
    }));
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

  function toggleMixtoComponent(state, key, on) {
    var e = ensureState(state);
    if (!e.mixto) e.mixto = defaultMixto();
    e.mixto[key] = !!on;
    var any = e.mixto.edificios || e.mixto.casas || e.mixto.lotes;
    if (!any) e.mixto[key] = true;
    if (e.mixto.edificios && !e.buildings.length) {
      e.buildings = [emptyBuilding('edificio', 0)];
    }
    if (!e.mixto.edificios) e.buildings = [];
    e.dirty = true;
    return e;
  }

  function mixtoHint(e) {
    if (!e || e.developmentType !== 'mixto' || !e.mixto) return null;
    var n = (e.mixto.edificios ? 1 : 0) + (e.mixto.casas ? 1 : 0) + (e.mixto.lotes ? 1 : 0);
    if (n !== 1) return null;
    if (e.mixto.edificios) return 'Solo seleccionaste Edificios: quizá conviene el tipo Edificio.';
    if (e.mixto.casas) return 'Solo seleccionaste Casas: quizá conviene el tipo Conjunto.';
    if (e.mixto.lotes) return 'Solo seleccionaste Lotes: quizá conviene el tipo Lotes.';
    return null;
  }

  function conceptualPhysicalUnits(e) {
    e = e || {};
    var t = e.developmentType;
    if (t === 'unidad') return clampInt(e.unidadCount, 1, 50000, 1);
    if (t === 'conjunto') return clampInt(e.totalViviendas, 1, 50000, 0);
    if (t === 'lotes') return clampInt(e.totalLotes, 1, 100000, 0);
    if (t === 'edificio' || (t === 'mixto' && e.mixto && e.mixto.edificios)) {
      return (e.buildings || []).reduce(function (sum, b) {
        return sum + clampInt(b.pisos, 0, 200, 0) * clampInt(b.unidadesPorPiso, 0, 100, 0);
      }, 0);
    }
    return 0;
  }

  function validate(estructura) {
    var errors = [];
    if (!estructura || !estructura.developmentType) {
      errors.push('Selecciona un tipo de desarrollo.');
      return errors;
    }
    var t = normalizeTypeId(estructura.developmentType);
    if (t === 'unidad') {
      if (clampInt(estructura.unidadCount, 1, 50000, 0) < 1) {
        errors.push('Indica la cantidad de unidades (≥ 1).');
      }
    }
    if (t === 'edificio' || (t === 'mixto' && estructura.mixto && estructura.mixto.edificios)) {
      if (!estructura.buildings || !estructura.buildings.length) {
        errors.push('Define al menos un edificio o torre.');
      }
      (estructura.buildings || []).forEach(function (b) {
        if (!b.nombre || !String(b.nombre).trim()) errors.push('Cada torre/edificio necesita nombre.');
        if (clampInt(b.pisos, 1, 200, 0) < 1) errors.push('Pisos inválidos en ' + (b.nombre || 'edificio'));
      });
    }
    if (t === 'conjunto' || (t === 'mixto' && estructura.mixto && estructura.mixto.casas)) {
      if (t === 'conjunto' && clampInt(estructura.totalViviendas, 1, 50000, 0) < 1) {
        errors.push('Indica la cantidad total de viviendas del conjunto.');
      }
    }
    if (t === 'lotes' || (t === 'mixto' && estructura.mixto && estructura.mixto.lotes)) {
      if (clampInt(estructura.totalLotes, 1, 100000, 0) < 1) {
        errors.push('Indica la cantidad de lotes.');
      }
    }
    if (t === 'mixto') {
      var m = estructura.mixto || {};
      if (!m.edificios && !m.casas && !m.lotes) {
        errors.push('En Mixto selecciona al menos un componente.');
      }
    }
    if (!estructura.tipologias || !estructura.tipologias.length) {
      errors.push('Añade al menos una tipología.');
    }
    (estructura.tipologias || []).forEach(function (tip, i) {
      if (!tip.producto) errors.push('Tipología ' + (i + 1) + ': selecciona producto.');
      if (!tip.modelo && !tip.nombre) errors.push('Tipología ' + (i + 1) + ': indica modelo o nombre.');
      if (t === 'mixto' && !tip.componente) {
        errors.push('Tipología ' + (i + 1) + ': indica a qué componente pertenece.');
      }
    });
    return errors;
  }

  function summary(estructura) {
    if (!estructura) return null;
    var id = normalizeTypeId(estructura.developmentType);
    var parts = DEVELOPMENT_TYPES.find(function (d) { return d.id === id; });
    var label = parts ? parts.label : id;
    var tips = (estructura.tipologias || []).length;
    return label + ' · ' + tips + ' tipolog' + (tips === 1 ? 'ía' : 'ías');
  }

  return {
    DEVELOPMENT_TYPES: DEVELOPMENT_TYPES,
    PRODUCTS: PRODUCTS,
    ZONE_GROUPS: ZONE_GROUPS,
    AMBIENTE_CATALOG: AMBIENTE_CATALOG,
    AMBIENTE_EXTERIOR_PRIORITY: AMBIENTE_EXTERIOR_PRIORITY,
    isCustomAmbienteOption: isCustomAmbienteOption,
    CONJUNTO_COMPONENT_TYPES: CONJUNTO_COMPONENT_TYPES,
    conjuntoComponentTypeMeta: conjuntoComponentTypeMeta,
    emptyConjuntoConfig: emptyConjuntoConfig,
    emptyConjuntoStage: emptyConjuntoStage,
    emptyConjuntoComponent: emptyConjuntoComponent,
    ensureConjuntoConfig: ensureConjuntoConfig,
    setConjuntoUseStages: setConjuntoUseStages,
    addConjuntoStage: addConjuntoStage,
    removeConjuntoStage: removeConjuntoStage,
    addConjuntoComponent: addConjuntoComponent,
    removeConjuntoComponent: removeConjuntoComponent,
    updateConjuntoComponent: updateConjuntoComponent,
    updateConjuntoStage: updateConjuntoStage,
    LEGACY_TYPE_MAP: LEGACY_TYPE_MAP,
    uid: uid,
    clampInt: clampInt,
    normalizeTypeId: normalizeTypeId,
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
    setEdificioMode: setEdificioMode,
    setTowerCount: setTowerCount,
    addBuilding: addBuilding,
    copyBuildingConfig: copyBuildingConfig,
    setTypologyCount: setTypologyCount,
    addTypology: addTypology,
    removeTypology: removeTypology,
    toggleZone: toggleZone,
    toggleMixtoComponent: toggleMixtoComponent,
    mixtoHint: mixtoHint,
    conceptualPhysicalUnits: conceptualPhysicalUnits,
    configSnapshot: configSnapshot,
    applyConfigSnapshot: applyConfigSnapshot,
    validate: validate,
    summary: summary,
    migrateLegacyProjectType: migrateLegacyProjectType
  };
})();
