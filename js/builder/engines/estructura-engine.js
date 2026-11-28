/* BOXIES V5.9.46 — Estructura Engine: capacidad edificios + tipologías derivadas de estructura */
var EstructuraEngine = (function () {
  var ROOT_BUCKET_ID = '__root__';
  var CASAS_BUCKET_ID = '__casas__';
  var LOTES_BUCKET_ID = '__lotes__';
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
    /* Conjunto: family depends on each tipología.producto — not a single global family */
    if (t === 'conjunto') return null;
    if (t === 'unidad') return null; /* depends on unidadHousingType */
    if (t === 'mixto') return 'apartamento';
    return 'apartamento';
  }

  function familyFromProducto(productoId) {
    if (!productoId) return null;
    var fams = Object.keys(PRODUCTS);
    for (var i = 0; i < fams.length; i++) {
      var fam = fams[i];
      var list = PRODUCTS[fam] || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === productoId) return fam;
      }
    }
    return null;
  }

  function productLabel(productoId) {
    var fam = familyFromProducto(productoId);
    if (!fam) return productoId || '';
    var hit = (PRODUCTS[fam] || []).find(function (p) { return p.id === productoId; });
    return hit ? hit.label : productoId;
  }

  function productsFor(developmentType, opts) {
    opts = opts || {};
    var t = normalizeTypeId(developmentType);
    if (t === 'conjunto') {
      /* Full residential taxonomy: casas + apartamentos (same source as Tipologías) */
      return (PRODUCTS.casa || []).concat(PRODUCTS.apartamento || []).slice();
    }
    var family = productFamilyFor(t, opts.componente);
    if (t === 'unidad') {
      family = opts.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa';
    }
    if (opts.forceFamily) family = opts.forceFamily;
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
      unidadHousingType: opts.unidadHousingType,
      forceFamily: opts.forceFamily
    });
    var family = opts.forceFamily || productFamilyFor(t, componente);
    if (t === 'unidad') {
      family = opts.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa';
    }
    if (t === 'conjunto' && opts.producto) {
      family = familyFromProducto(opts.producto) || 'casa';
    }
    if (!family) family = t === 'conjunto' ? 'casa' : 'apartamento';
    var product = opts.producto || (products[0] ? products[0].id : 'apartamento');
    if (opts.producto) product = opts.producto;
    var plantas = family === 'terreno' ? 0 : 1;
    return {
      localId: uid(),
      id: null,
      componente: componente,
      producto: product,
      modelo: opts.modelo != null ? opts.modelo : ('Modelo ' + String.fromCharCode(65 + (index % 26))),
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
      /* cantidad por contenedor (torre / componente / root) — V5.9.43 */
      asignaciones: {},
      open: index === 0
    };
  }

  function normalizeAsignaciones(tip) {
    if (!tip) return {};
    if (!tip.asignaciones || typeof tip.asignaciones !== 'object' || Array.isArray(tip.asignaciones)) {
      tip.asignaciones = {};
    }
    /* Legacy shorthand: tip.cantidad → root bucket */
    if (tip.cantidad != null && tip.asignaciones[ROOT_BUCKET_ID] == null) {
      tip.asignaciones[ROOT_BUCKET_ID] = clampInt(tip.cantidad, 0, 100000, 0);
    }
    Object.keys(tip.asignaciones).forEach(function (key) {
      tip.asignaciones[key] = clampInt(tip.asignaciones[key], 0, 100000, 0);
    });
    return tip.asignaciones;
  }

  function getTipAssigned(tip, containerId) {
    if (!tip) return 0;
    normalizeAsignaciones(tip);
    if (containerId != null && containerId !== '') {
      return clampInt(tip.asignaciones[containerId], 0, 100000, 0);
    }
    var sum = 0;
    Object.keys(tip.asignaciones).forEach(function (key) {
      sum += clampInt(tip.asignaciones[key], 0, 100000, 0);
    });
    return sum;
  }

  function setTipAssigned(tip, containerId, qty) {
    if (!tip || containerId == null || containerId === '') return tip;
    normalizeAsignaciones(tip);
    tip.asignaciones[containerId] = clampInt(qty, 0, 100000, 0);
    if (containerId === ROOT_BUCKET_ID) tip.cantidad = tip.asignaciones[containerId];
    return tip;
  }

  function buildingCapacity(b) {
    if (!b) return 0;
    return clampInt(b.pisos, 0, 200, 0) * clampInt(b.unidadesPorPiso, 0, 100, 0);
  }

  function conjuntoCompBucketLabel(c, stage) {
    var base;
    if (isConjuntoResidentialComponent(c)) {
      base = productLabel(c.producto) || 'Residencial';
    } else {
      var meta = conjuntoComponentTypeMeta(c.type);
      base = meta ? meta.label : (c.type || 'Componente');
    }
    var name = String(c.nombre || '').trim();
    if (name && name.toLowerCase() !== String(base).toLowerCase()) {
      base = base + ' · ' + name;
    }
    if (stage && stage.nombre) base = String(stage.nombre) + ' · ' + base;
    return base;
  }

  /**
   * Capacity containers for typology quantity assignment.
   * One shared model for all 5 development types — hierarchy comes from existing state.
   */
  function listCapacityBuckets(e) {
    e = e || {};
    var t = normalizeTypeId(e.developmentType);
    var buckets = [];

    if (t === 'unidad') {
      buckets.push({
        id: ROOT_BUCKET_ID,
        label: e.unidadHousingType === 'apartamento' ? 'Apartamentos' : 'Casas / unidades',
        capacity: clampInt(e.unidadCount, 0, 50000, 0),
        kind: 'unidad'
      });
      return buckets;
    }

    if (t === 'edificio') {
      (e.buildings || []).forEach(function (b, i) {
        buckets.push({
          id: b.localId,
          label: String(b.nombre || '').trim() || ('Torre ' + (i + 1)),
          capacity: buildingCapacity(b),
          kind: 'edificio'
        });
      });
      return buckets;
    }

    if (t === 'conjunto') {
      ensureConjuntoConfig(e);
      walkConjuntoComponents(e, function (c, stage) {
        if (isConjuntoEdificioComponent(c)) {
          var stagePrefix = stage && stage.nombre ? (String(stage.nombre) + ' · ') : '';
          if (c.edificioMode === 'individual' && Array.isArray(c.towers) && c.towers.length) {
            c.towers.forEach(function (tw, i) {
              buckets.push({
                id: tw.localId,
                label: stagePrefix + (String(tw.nombre || '').trim() || ('Torre ' + (i + 1))),
                capacity: clampInt(tw.pisos, 0, 200, 0) * clampInt(tw.unidadesPorPiso, 0, 100, 0),
                kind: 'conjunto-edificio',
                componentId: c.localId,
                stageId: stage ? stage.localId : null
              });
            });
          } else {
            buckets.push({
              id: c.localId,
              label: stagePrefix + (String(c.nombre || '').trim() || 'Edificio'),
              capacity: conjuntoEdificioCapacity(c),
              kind: 'conjunto-edificio',
              componentId: c.localId,
              stageId: stage ? stage.localId : null
            });
          }
          return;
        }
        if (!isConjuntoResidentialComponent(c)) return;
        buckets.push({
          id: c.localId,
          label: conjuntoCompBucketLabel(c, stage),
          capacity: clampInt(c.cantidad, 0, 100000, 0),
          kind: 'conjunto',
          stageId: stage ? stage.localId : null
        });
      });
      return buckets;
    }

    if (t === 'lotes') {
      buckets.push({
        id: ROOT_BUCKET_ID,
        label: 'Lotes',
        capacity: clampInt(e.totalLotes, 0, 100000, 0),
        kind: 'lotes'
      });
      return buckets;
    }

    if (t === 'mixto') {
      var m = e.mixto || {};
      if (m.edificios) {
        (e.buildings || []).forEach(function (b, i) {
          buckets.push({
            id: b.localId,
            label: String(b.nombre || '').trim() || ('Torre ' + (i + 1)),
            capacity: buildingCapacity(b),
            kind: 'edificio',
            componente: 'edificios'
          });
        });
      }
      if (m.casas) {
        buckets.push({
          id: CASAS_BUCKET_ID,
          label: 'Casas',
          capacity: clampInt(e.totalViviendas, 0, 50000, 0),
          kind: 'casas',
          componente: 'casas'
        });
      }
      if (m.lotes) {
        buckets.push({
          id: LOTES_BUCKET_ID,
          label: 'Lotes',
          capacity: clampInt(e.totalLotes, 0, 100000, 0),
          kind: 'lotes',
          componente: 'lotes'
        });
      }
    }
    return buckets;
  }

  function bucketsForTipologia(e, tip) {
    var all = listCapacityBuckets(e);
    if (normalizeTypeId(e.developmentType) !== 'mixto') return all;
    var comp = tip && tip.componente;
    if (!comp) return all;
    if (comp === 'edificios') {
      return all.filter(function (b) { return b.kind === 'edificio'; });
    }
    if (comp === 'casas') {
      return all.filter(function (b) { return b.kind === 'casas'; });
    }
    if (comp === 'lotes') {
      return all.filter(function (b) { return b.kind === 'lotes'; });
    }
    return all;
  }

  function sumAssignedForBucket(e, containerId) {
    var sum = 0;
    (e.tipologias || []).forEach(function (tip) {
      sum += getTipAssigned(tip, containerId);
    });
    return sum;
  }

  function assignmentBalance(e) {
    e = e || {};
    var buckets = listCapacityBuckets(e).map(function (b) {
      var assigned = sumAssignedForBucket(e, b.id);
      var remaining = b.capacity - assigned;
      return {
        id: b.id,
        label: b.label,
        kind: b.kind,
        componente: b.componente || null,
        capacity: b.capacity,
        assigned: assigned,
        remaining: remaining,
        excess: remaining < 0 ? -remaining : 0,
        ok: remaining === 0
      };
    });
    var messages = [];
    var ok = true;
    buckets.forEach(function (b) {
      if (b.capacity <= 0 && b.assigned <= 0) return;
      if (b.remaining > 0) {
        ok = false;
        messages.push(
          b.label + ': faltan ' + b.remaining +
            (b.remaining === 1 ? ' unidad por asignar' : ' unidades por asignar')
        );
      } else if (b.excess > 0) {
        ok = false;
        messages.push(
          b.label + ': sobran ' + b.excess +
            (b.excess === 1 ? ' unidad asignada' : ' unidades asignadas')
        );
      }
    });
    return { buckets: buckets, ok: ok, messages: messages };
  }

  function pruneTipologiaAsignaciones(e, tip) {
    if (!tip) return;
    normalizeAsignaciones(tip);
    var valid = {};
    bucketsForTipologia(e, tip).forEach(function (b) { valid[b.id] = true; });
    Object.keys(tip.asignaciones).forEach(function (key) {
      if (!valid[key]) delete tip.asignaciones[key];
    });
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

  /* ── Conjunto: etapas + componentes (config_json; residential ↔ tipologías) ── */
  var CONJUNTO_PHYSICAL_TYPES = [
    { id: 'edificio', label: 'Edificio', defaultNombre: 'Torre A', defaultCantidad: 1 },
    { id: 'lotes', label: 'Lotes', defaultNombre: 'Lotes', defaultCantidad: 1 },
    { id: 'comercio', label: 'Comercio', defaultNombre: 'Locales comerciales', defaultCantidad: 1 },
    { id: 'oficinas', label: 'Oficinas', defaultNombre: 'Oficinas', defaultCantidad: 1 },
    { id: 'otro', label: 'Otro', defaultNombre: 'Otro', defaultCantidad: 1 }
  ];

  /* Legacy V5.9.18 type ids → canonical producto */
  var CONJUNTO_LEGACY_TYPE_TO_PRODUCTO = {
    casa: 'casa_unifamiliar',
    casas: 'casa_unifamiliar',
    house: 'casa_unifamiliar',
    residencial: 'casa_unifamiliar'
  };

  function conjuntoPhysicalTypeMeta(typeId) {
    return CONJUNTO_PHYSICAL_TYPES.find(function (t) { return t.id === typeId; }) || null;
  }

  /* Back-compat alias used by UI */
  var CONJUNTO_COMPONENT_TYPES = CONJUNTO_PHYSICAL_TYPES.concat(
    (PRODUCTS.casa || []).map(function (p) {
      return { id: p.id, label: p.label, defaultNombre: 'Modelo A', defaultCantidad: 1, residential: true };
    }),
    (PRODUCTS.apartamento || []).map(function (p) {
      return { id: p.id, label: p.label, defaultNombre: 'Modelo A', defaultCantidad: 1, residential: true };
    })
  );

  function conjuntoComponentTypeMeta(typeId) {
    var phys = conjuntoPhysicalTypeMeta(typeId);
    if (phys) return phys;
    if (familyFromProducto(typeId)) {
      return {
        id: typeId,
        label: productLabel(typeId),
        defaultNombre: 'Modelo A',
        defaultCantidad: 1,
        residential: true
      };
    }
    var legacy = CONJUNTO_LEGACY_TYPE_TO_PRODUCTO[typeId];
    if (legacy) {
      return {
        id: legacy,
        label: productLabel(legacy),
        defaultNombre: 'Modelo A',
        defaultCantidad: 1,
        residential: true
      };
    }
    return CONJUNTO_PHYSICAL_TYPES[CONJUNTO_PHYSICAL_TYPES.length - 1];
  }

  function isConjuntoResidentialComponent(c) {
    if (!c) return false;
    if (c.kind === 'residencial') return true;
    if (c.kind === 'fisico') return false;
    if (c.producto && familyFromProducto(c.producto)) {
      var fam = familyFromProducto(c.producto);
      return fam === 'casa' || fam === 'apartamento';
    }
    var t = c.type;
    if (CONJUNTO_LEGACY_TYPE_TO_PRODUCTO[t]) return true;
    var fam2 = familyFromProducto(t);
    return fam2 === 'casa' || fam2 === 'apartamento';
  }

  function emptyConjuntoTower(index, defaults) {
    defaults = defaults || {};
    return {
      localId: uid(),
      nombre: defaults.nombre || ('Torre ' + String.fromCharCode(65 + ((index || 0) % 26))),
      pisos: clampInt(defaults.pisos, 1, 200, 5),
      unidadesPorPiso: clampInt(defaults.unidadesPorPiso, 1, 100, 4),
      open: index === 0
    };
  }

  function isConjuntoEdificioComponent(c) {
    return !!(c && c.kind === 'fisico' && c.type === 'edificio');
  }

  function conjuntoEdificioCapacity(c) {
    if (!isConjuntoEdificioComponent(c)) return 0;
    if (c.edificioMode === 'individual' && Array.isArray(c.towers) && c.towers.length) {
      return c.towers.reduce(function (sum, tw) {
        return sum +
          clampInt(tw.pisos, 0, 200, 0) *
          clampInt(tw.unidadesPorPiso, 0, 100, 0);
      }, 0);
    }
    return clampInt(c.cantidad, 1, 100000, 1) *
      clampInt(c.pisos, 1, 200, 1) *
      clampInt(c.unidadesPorPiso, 1, 100, 1);
  }

  /** Residential housing units contributed by a Conjunto component (casas + edificios). */
  function conjuntoComponentHousingUnits(c) {
    if (!c) return 0;
    if (isConjuntoEdificioComponent(c)) return conjuntoEdificioCapacity(c);
    if (isConjuntoResidentialComponent(c)) return clampInt(c.cantidad, 0, 100000, 0);
    return 0;
  }

  function isConjuntoHousingComponent(c) {
    return isConjuntoResidentialComponent(c) || isConjuntoEdificioComponent(c);
  }

  function emptyConjuntoComponent(typeId, orden) {
    var phys = conjuntoPhysicalTypeMeta(typeId);
    if (phys) {
      var base = {
        localId: uid(),
        kind: 'fisico',
        type: phys.id,
        producto: null,
        nombre: phys.defaultNombre,
        cantidad: phys.defaultCantidad,
        tipologiaLocalId: null,
        orden: orden != null ? orden : 0
      };
      if (phys.id === 'edificio') {
        base.pisos = 5;
        base.unidadesPorPiso = 4;
        base.edificioMode = 'uniforme';
        base.towers = [];
      }
      return base;
    }
    var producto = CONJUNTO_LEGACY_TYPE_TO_PRODUCTO[typeId] || typeId;
    if (!familyFromProducto(producto)) producto = 'casa_unifamiliar';
    return {
      localId: uid(),
      kind: 'residencial',
      type: 'residencial',
      producto: producto,
      /* Legacy V5.9.19: kept for config_json compat; not used as tipología modelo */
      nombre: productLabel(producto) || 'Residencial',
      cantidad: 1,
      tipologiaLocalId: null,
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
    raw = raw || {};
    var type = raw.type;
    var producto = raw.producto || null;
    var kind = raw.kind || null;

    if (CONJUNTO_LEGACY_TYPE_TO_PRODUCTO[type]) {
      producto = producto || CONJUNTO_LEGACY_TYPE_TO_PRODUCTO[type];
      kind = 'residencial';
      type = 'residencial';
    } else if (familyFromProducto(type)) {
      producto = type;
      kind = 'residencial';
      type = 'residencial';
    } else if (conjuntoPhysicalTypeMeta(type)) {
      kind = 'fisico';
      producto = null;
    } else if (producto && familyFromProducto(producto)) {
      kind = 'residencial';
      type = 'residencial';
    } else {
      kind = kind || 'fisico';
      type = conjuntoPhysicalTypeMeta(type) ? type : 'otro';
      if (kind === 'fisico') producto = null;
    }

    if (kind === 'residencial') {
      if (!producto || !familyFromProducto(producto)) producto = 'casa_unifamiliar';
      return {
        localId: raw.localId || uid(),
        kind: 'residencial',
        type: 'residencial',
        producto: producto,
        /* Preserve legacy nombre/tipologiaLocalId; Spatial UI no longer edits modelo */
        nombre: (raw.nombre != null && String(raw.nombre).trim())
          ? String(raw.nombre).trim()
          : (productLabel(producto) || 'Residencial'),
        cantidad: clampInt(raw.cantidad, 1, 100000, 1),
        tipologiaLocalId: raw.tipologiaLocalId || null,
        orden: raw.orden != null ? raw.orden : (orden || 0)
      };
    }

    var phys = conjuntoPhysicalTypeMeta(type) || conjuntoPhysicalTypeMeta('otro');
    var fisico = {
      localId: raw.localId || uid(),
      kind: 'fisico',
      type: phys.id,
      producto: null,
      nombre: (raw.nombre != null && String(raw.nombre).trim())
        ? String(raw.nombre).trim()
        : phys.defaultNombre,
      cantidad: clampInt(raw.cantidad, 1, 100000, phys.defaultCantidad),
      tipologiaLocalId: null,
      orden: raw.orden != null ? raw.orden : (orden || 0)
    };
    if (phys.id === 'edificio') {
      fisico.pisos = clampInt(raw.pisos, 1, 200, 5);
      fisico.unidadesPorPiso = clampInt(raw.unidadesPorPiso, 1, 100, 4);
      fisico.edificioMode = raw.edificioMode === 'individual' ? 'individual' : 'uniforme';
      fisico.towers = Array.isArray(raw.towers)
        ? raw.towers.map(function (tw, i) {
            return {
              localId: tw.localId || uid(),
              nombre: (tw.nombre != null && String(tw.nombre).trim())
                ? String(tw.nombre).trim()
                : ('Torre ' + String.fromCharCode(65 + (i % 26))),
              pisos: clampInt(tw.pisos, 1, 200, fisico.pisos),
              unidadesPorPiso: clampInt(tw.unidadesPorPiso, 1, 100, fisico.unidadesPorPiso),
              open: tw.open != null ? !!tw.open : i === 0
            };
          })
        : [];
      if (fisico.edificioMode === 'individual' && !fisico.towers.length) {
        var nTowers = clampInt(fisico.cantidad, 1, 50, 1);
        for (var ti = 0; ti < nTowers; ti++) {
          fisico.towers.push(emptyConjuntoTower(ti, {
            pisos: fisico.pisos,
            unidadesPorPiso: fisico.unidadesPorPiso
          }));
        }
      }
      if (fisico.edificioMode === 'individual') {
        fisico.cantidad = Math.max(1, fisico.towers.length);
      }
    }
    return fisico;
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

  function walkConjuntoComponents(e, fn) {
    if (!e || !e.conjuntoConfig) return;
    var cfg = e.conjuntoConfig;
    (cfg.components || []).forEach(function (c) { fn(c, null); });
    (cfg.stages || []).forEach(function (st) {
      (st.components || []).forEach(function (c) { fn(c, st); });
    });
  }

  function residentialIdentityKey(producto, modelo) {
    return String(producto || '') + '::' + String(modelo || '').trim().toLowerCase();
  }

  function syncConjuntoDerivedTotals(e) {
    if (!e || normalizeTypeId(e.developmentType) !== 'conjunto') return e;
    var sum = 0;
    var hasHousing = false;
    walkConjuntoComponents(e, function (c) {
      var units = conjuntoComponentHousingUnits(c);
      if (units > 0 || isConjuntoHousingComponent(c)) {
        hasHousing = true;
        sum += units;
      }
    });
    if (hasHousing) e.totalViviendas = sum;
    e.tipologiasCount = (e.tipologias || []).length;
    return e;
  }

  /**
   * V5.9.46 — Tipologías se derivan de la configuración espacial.
   * Crea tipologías base (Modelo A) por producto/componente detectado; no duplica.
   */
  function structureSeedKey(seed) {
    return String(seed.producto || '') + '::' + String(seed.componente || '');
  }

  function listStructureProductSeeds(e) {
    e = e || {};
    var t = normalizeTypeId(e.developmentType);
    var seeds = [];
    var seen = {};

    function pushSeed(producto, componente, note) {
      if (!producto) return;
      var seed = {
        producto: producto,
        componente: componente || null,
        note: note || null
      };
      var key = structureSeedKey(seed);
      if (seen[key]) return;
      seen[key] = true;
      seeds.push(seed);
    }

    if (t === 'unidad') {
      pushSeed(
        e.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa_unifamiliar',
        null
      );
      return seeds;
    }
    if (t === 'edificio') {
      pushSeed('apartamento', null);
      return seeds;
    }
    if (t === 'lotes') {
      pushSeed(e.lotesSubtype === 'campestre' ? 'lote_campestre' : 'lote_urbano', null);
      return seeds;
    }
    if (t === 'conjunto') {
      ensureConjuntoConfig(e);
      walkConjuntoComponents(e, function (c) {
        if (isConjuntoResidentialComponent(c)) {
          pushSeed(c.producto || 'casa_unifamiliar', null);
        } else if (isConjuntoEdificioComponent(c)) {
          pushSeed('apartamento', null);
        }
      });
      return seeds;
    }
    if (t === 'mixto') {
      var m = e.mixto || {};
      if (m.edificios) pushSeed('apartamento', 'edificios');
      if (m.casas) pushSeed('casa_unifamiliar', 'casas');
      if (m.lotes) {
        pushSeed(e.lotesSubtype === 'campestre' ? 'lote_campestre' : 'lote_urbano', 'lotes');
      }
    }
    return seeds;
  }

  function syncTipologiasFromStructure(e) {
    if (!e) return e;
    if (!Array.isArray(e.tipologias)) e.tipologias = [];
    var seeds = listStructureProductSeeds(e);
    if (!seeds.length) {
      e.tipologiasCount = e.tipologias.length;
      return e;
    }

    seeds.forEach(function (seed, si) {
      var key = structureSeedKey(seed);
      var existing = null;
      for (var i = 0; i < e.tipologias.length; i++) {
        var tip = e.tipologias[i];
        if (tip.structureKey === key) {
          existing = tip;
          break;
        }
      }
      if (!existing) {
        for (var j = 0; j < e.tipologias.length; j++) {
          var tip2 = e.tipologias[j];
          if (tip2.producto !== seed.producto) continue;
          if (seed.componente && tip2.componente !== seed.componente) continue;
          if (!seed.componente && tip2.componente &&
              (tip2.componente === 'edificios' || tip2.componente === 'casas' || tip2.componente === 'lotes')) {
            continue;
          }
          existing = tip2;
          break;
        }
      }
      if (existing) {
        existing.structureKey = key;
        if (seed.componente && !existing.componente) existing.componente = seed.componente;
        return;
      }
      var created = emptyTypology(e.developmentType, e.tipologias.length + si, {
        producto: seed.producto,
        componente: seed.componente,
        unidadHousingType: e.unidadHousingType,
        modelo: 'Modelo A'
      });
      created.structureKey = key;
      created._autoFromStructure = true;
      e.tipologias.push(created);
    });

    e.tipologiasCount = e.tipologias.length;
    syncTypologyPlantas(e);
    return e;
  }

  /**
   * Normalize conjunto residential comps + derive tipologías from structure (V5.9.46).
   */
  function syncConjuntoResidentialTipologias(e) {
    if (!e || normalizeTypeId(e.developmentType) !== 'conjunto') return e;
    if (!Array.isArray(e.tipologias)) e.tipologias = [];
    ensureConjuntoConfig(e);

    walkConjuntoComponents(e, function (c) {
      if (isConjuntoEdificioComponent(c)) {
        c.tipologiaLocalId = null;
        if (!c.pisos) c.pisos = 5;
        if (!c.unidadesPorPiso) c.unidadesPorPiso = 4;
        if (!c.edificioMode) c.edificioMode = 'uniforme';
        if (!Array.isArray(c.towers)) c.towers = [];
        return;
      }
      if (!isConjuntoResidentialComponent(c)) {
        if (c && c.kind === 'fisico') c.tipologiaLocalId = null;
        return;
      }
      var producto = c.producto || 'casa_unifamiliar';
      if (!familyFromProducto(producto)) producto = 'casa_unifamiliar';
      c.kind = 'residencial';
      c.type = 'residencial';
      c.producto = producto;
      if (!c.nombre || !String(c.nombre).trim()) {
        c.nombre = productLabel(producto) || 'Residencial';
      }
    });

    syncConjuntoDerivedTotals(e);
    syncTipologiasFromStructure(e);
    return e;
  }

  /** Compat no-op for V5.9.19 callers: tipologías own modelo; comps keep producto only. */
  function propagateTipologiaToConjuntoComponents(e, tipLocalId) {
    if (!e || !tipLocalId) return e;
    var tip = (e.tipologias || []).find(function (t) { return t.localId === tipLocalId; });
    if (!tip || !tip.producto) return e;
    ensureConjuntoConfig(e);
    walkConjuntoComponents(e, function (c) {
      if (c.tipologiaLocalId !== tipLocalId) return;
      if (!isConjuntoResidentialComponent(c)) return;
      c.kind = 'residencial';
      c.type = 'residencial';
      c.producto = tip.producto;
      /* Do not copy tip.modelo into component — Spatial has no Modelo field */
    });
    syncConjuntoDerivedTotals(e);
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
    syncConjuntoResidentialTipologias(e);
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
    syncConjuntoResidentialTipologias(e);
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
    syncConjuntoResidentialTipologias(e);
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
    syncConjuntoResidentialTipologias(e);
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
    if (patch.nombre != null && !isConjuntoResidentialComponent(comp)) {
      comp.nombre = String(patch.nombre);
    }
    if (patch.cantidad != null) {
      comp.cantidad = clampInt(patch.cantidad, 1, 100000, comp.cantidad);
      if (isConjuntoEdificioComponent(comp) && comp.edificioMode === 'individual') {
        if (!Array.isArray(comp.towers)) comp.towers = [];
        var needQty = clampInt(comp.cantidad, 1, 50, 1);
        while (comp.towers.length < needQty) {
          comp.towers.push(emptyConjuntoTower(comp.towers.length, {
            pisos: comp.pisos,
            unidadesPorPiso: comp.unidadesPorPiso
          }));
        }
        if (comp.towers.length > needQty) comp.towers = comp.towers.slice(0, needQty);
      }
    }
    if (patch.pisos != null && isConjuntoEdificioComponent(comp)) {
      comp.pisos = clampInt(patch.pisos, 1, 200, comp.pisos || 5);
    }
    if (patch.unidadesPorPiso != null && isConjuntoEdificioComponent(comp)) {
      comp.unidadesPorPiso = clampInt(patch.unidadesPorPiso, 1, 100, comp.unidadesPorPiso || 4);
    }
    if (patch.edificioMode && isConjuntoEdificioComponent(comp)) {
      var wantIndividual = patch.edificioMode === 'individual';
      comp.edificioMode = wantIndividual ? 'individual' : 'uniforme';
      if (wantIndividual) {
        if (!Array.isArray(comp.towers)) comp.towers = [];
        var need = clampInt(comp.cantidad, 1, 50, 1);
        while (comp.towers.length < need) {
          comp.towers.push(emptyConjuntoTower(comp.towers.length, {
            pisos: comp.pisos,
            unidadesPorPiso: comp.unidadesPorPiso
          }));
        }
        if (comp.towers.length > need) comp.towers = comp.towers.slice(0, need);
        comp.cantidad = comp.towers.length;
      }
    }
    if (patch.producto && familyFromProducto(patch.producto)) {
      comp.kind = 'residencial';
      comp.type = 'residencial';
      comp.producto = patch.producto;
      if (!comp.nombre || !String(comp.nombre).trim()) {
        comp.nombre = productLabel(patch.producto) || 'Residencial';
      }
    }
    if (patch.type && conjuntoPhysicalTypeMeta(patch.type)) {
      comp.kind = 'fisico';
      comp.type = patch.type;
      comp.producto = null;
      comp.tipologiaLocalId = null;
    }
    syncConjuntoResidentialTipologias(e);
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

  function addConjuntoEdificioTower(state, componentLocalId, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return e;
    var comp = list.find(function (c) { return c.localId === componentLocalId; });
    if (!comp || !isConjuntoEdificioComponent(comp)) return e;
    comp.edificioMode = 'individual';
    if (!Array.isArray(comp.towers)) comp.towers = [];
    comp.towers.push(emptyConjuntoTower(comp.towers.length, {
      pisos: comp.pisos,
      unidadesPorPiso: comp.unidadesPorPiso
    }));
    comp.cantidad = comp.towers.length;
    syncConjuntoResidentialTipologias(e);
    e.dirty = true;
    return e;
  }

  function removeConjuntoEdificioTower(state, componentLocalId, towerLocalId, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return e;
    var comp = list.find(function (c) { return c.localId === componentLocalId; });
    if (!comp || !isConjuntoEdificioComponent(comp) || !Array.isArray(comp.towers)) return e;
    if (comp.towers.length <= 1) return e;
    comp.towers = comp.towers.filter(function (tw) { return tw.localId !== towerLocalId; });
    comp.cantidad = comp.towers.length;
    syncConjuntoResidentialTipologias(e);
    e.dirty = true;
    return e;
  }

  function updateConjuntoEdificioTower(state, componentLocalId, towerLocalId, patch, stageLocalId) {
    var e = ensureState(state);
    ensureConjuntoConfig(e);
    var list = findConjuntoComponentList(e, stageLocalId || null);
    if (!list) return e;
    var comp = list.find(function (c) { return c.localId === componentLocalId; });
    if (!comp || !isConjuntoEdificioComponent(comp) || !Array.isArray(comp.towers)) return e;
    var tw = comp.towers.find(function (t) { return t.localId === towerLocalId; });
    if (!tw || !patch) return e;
    if (patch.nombre != null) {
      var nm = String(patch.nombre).trim();
      if (nm) tw.nombre = nm;
    }
    if (patch.pisos != null) tw.pisos = clampInt(patch.pisos, 1, 200, tw.pisos);
    if (patch.unidadesPorPiso != null) {
      tw.unidadesPorPiso = clampInt(patch.unidadesPorPiso, 1, 100, tw.unidadesPorPiso);
    }
    if (patch.open != null) tw.open = !!patch.open;
    syncConjuntoDerivedTotals(e);
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
        zonas: true,
        resumen: false
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
    if (!e.openPanels) e.openPanels = { dev: true, org: true, tipologias: true, zonas: true, resumen: false };
    if (e.openPanels.dev == null) e.openPanels.dev = true;
    if (e.openPanels.org == null) e.openPanels.org = true;
    if (e.openPanels.tipologias == null) e.openPanels.tipologias = true;
    if (e.openPanels.zonas == null) e.openPanels.zonas = true;
    if (e.openPanels.resumen == null) e.openPanels.resumen = false;
    ensureConjuntoConfig(e);
    if (normalizeTypeId(e.developmentType) === 'conjunto') {
      syncConjuntoResidentialTipologias(e);
    } else {
      syncTipologiasFromStructure(e);
    }
    if (!e.tipologias.length) {
      e.tipologias = [emptyTypology(e.developmentType, 0, {
        unidadHousingType: e.unidadHousingType,
        componente: e.developmentType === 'mixto' && e.mixto.edificios ? 'edificios' : null
      })];
      syncTipologiasFromStructure(e);
    }
    e.tipologias.forEach(function (t) {
      if (t.componente == null) t.componente = null;
      normalizeAsignaciones(t);
      pruneTipologiaAsignaciones(e, t);
      /* V5.9.72 — permanent Canvas node_id (never overwrite once set; Media links by node_id) */
      if (!t.node_id) t.node_id = t.id || t.localId || uid();
    });
    if (!Array.isArray(e.zoneNodes)) e.zoneNodes = [];
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.ensureNodeIds) {
      /* zoneNodes stamped from zoneNames without depending on Media import order */
    }
    /* Stamp zoneNodes from zoneNames */
    (function syncZoneNodes() {
      var byName = {};
      (e.zoneNodes || []).forEach(function (z) {
        if (z && z.nombre) byName[String(z.nombre).toLowerCase()] = z;
      });
      var next = [];
      (e.zoneNames || []).forEach(function (name) {
        var n = String(name || '').trim();
        if (!n) return;
        var prev = byName[n.toLowerCase()];
        var slug = String(n).normalize('NFKD').replace(/[^\w\s\-]+/g, '')
          .trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80) || 'zona';
        if (prev) {
          if (!prev.node_id) prev.node_id = 'zona:' + slug;
          prev.nombre = n;
          next.push(prev);
        } else {
          next.push({ node_id: 'zona:' + slug, nombre: n, tipo: 'zona', origen: 'estructura' });
        }
      });
      e.zoneNodes = next;
    })();
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
        normalizeAsignaciones(t);
        return {
          localId: t.localId,
          id: t.id,
          componente: t.componente || null,
          asignaciones: t.asignaciones || {},
          cantidad: getTipAssigned(t)
        };
      }),
      conjuntoConfig: e.conjuntoConfig ? {
        useStages: !!e.conjuntoConfig.useStages,
        components: (e.conjuntoConfig.components || []).map(function (c, i) {
          return normalizeConjuntoComponent(c, i);
        }),
        stages: (e.conjuntoConfig.stages || []).map(function (s, i) {
          return normalizeConjuntoStage(s, i);
        })
      } : emptyConjuntoConfig(!!e.orgEtapas),
      mediaAmenityNames: Array.isArray(e.mediaAmenityNames) ? e.mediaAmenityNames.slice() : [],
      mediaAmenitiesMigratedV5988: !!e.mediaAmenitiesMigratedV5988
    };
  }

  function applyConfigSnapshot(e, cfg) {
    if (!cfg || typeof cfg !== 'object') return e;
    if (Array.isArray(cfg.mediaAmenityNames)) {
      e.mediaAmenityNames = cfg.mediaAmenityNames.slice();
    }
    if (cfg.mediaAmenitiesMigratedV5988 != null) {
      e.mediaAmenitiesMigratedV5988 = !!cfg.mediaAmenitiesMigratedV5988;
    }
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
        if (!tip) return;
        if (row.componente) tip.componente = row.componente;
        if (row.asignaciones && typeof row.asignaciones === 'object') {
          tip.asignaciones = row.asignaciones;
          normalizeAsignaciones(tip);
        } else if (row.cantidad != null) {
          setTipAssigned(tip, ROOT_BUCKET_ID, row.cantidad);
        }
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
    if (typeId === 'conjunto') syncConjuntoResidentialTipologias(e);
    else syncTipologiasFromStructure(e);
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
    syncTipologiasFromStructure(e);
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
    if (t === 'conjunto') {
      var sum = 0;
      var hasHousing = false;
      if (e.conjuntoConfig) {
        walkConjuntoComponents(e, function (c) {
          var units = conjuntoComponentHousingUnits(c);
          if (units > 0 || isConjuntoHousingComponent(c)) {
            hasHousing = true;
            sum += units;
          }
        });
      }
      if (hasHousing) return sum;
      return clampInt(e.totalViviendas, 1, 50000, 0);
    }
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
      if (t === 'conjunto') {
        var resSum = 0;
        var hasHousingComp = false;
        if (estructura.conjuntoConfig) {
          walkConjuntoComponents(estructura, function (c) {
            if (!isConjuntoHousingComponent(c)) return;
            hasHousingComp = true;
            resSum += conjuntoComponentHousingUnits(c);
          });
        }
        if (hasHousingComp && resSum < 1) {
          errors.push('Indica la capacidad de viviendas en los componentes residenciales / edificios.');
        }
        walkConjuntoComponents(estructura, function (c) {
          if (!isConjuntoEdificioComponent(c)) return;
          if (c.edificioMode === 'individual') {
            if (!c.towers || !c.towers.length) {
              errors.push('Define al menos una torre en «' + (c.nombre || 'Edificio') + '».');
            }
            (c.towers || []).forEach(function (tw) {
              if (clampInt(tw.pisos, 1, 200, 0) < 1) {
                errors.push('Pisos inválidos en ' + (tw.nombre || 'torre'));
              }
            });
          } else if (clampInt(c.pisos, 1, 200, 0) < 1) {
            errors.push('Pisos inválidos en ' + (c.nombre || 'edificio'));
          }
        });
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
      normalizeAsignaciones(tip);
    });

    var balance = assignmentBalance(estructura);
    if (balance.buckets.length && balance.buckets.some(function (b) {
      return b.capacity > 0 || b.assigned > 0;
    })) {
      balance.messages.forEach(function (msg) {
        errors.push(msg);
      });
    }
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
    familyFromProducto: familyFromProducto,
    productLabel: productLabel,
    isConjuntoResidentialComponent: isConjuntoResidentialComponent,
    isConjuntoEdificioComponent: isConjuntoEdificioComponent,
    isConjuntoHousingComponent: isConjuntoHousingComponent,
    conjuntoEdificioCapacity: conjuntoEdificioCapacity,
    conjuntoComponentHousingUnits: conjuntoComponentHousingUnits,
    syncConjuntoResidentialTipologias: syncConjuntoResidentialTipologias,
    syncConjuntoDerivedTotals: syncConjuntoDerivedTotals,
    syncTipologiasFromStructure: syncTipologiasFromStructure,
    listStructureProductSeeds: listStructureProductSeeds,
    propagateTipologiaToConjuntoComponents: propagateTipologiaToConjuntoComponents,
    emptyConjuntoTower: emptyConjuntoTower,
    addConjuntoEdificioTower: addConjuntoEdificioTower,
    removeConjuntoEdificioTower: removeConjuntoEdificioTower,
    updateConjuntoEdificioTower: updateConjuntoEdificioTower,
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
    ROOT_BUCKET_ID: ROOT_BUCKET_ID,
    CASAS_BUCKET_ID: CASAS_BUCKET_ID,
    LOTES_BUCKET_ID: LOTES_BUCKET_ID,
    listCapacityBuckets: listCapacityBuckets,
    bucketsForTipologia: bucketsForTipologia,
    getTipAssigned: getTipAssigned,
    setTipAssigned: setTipAssigned,
    sumAssignedForBucket: sumAssignedForBucket,
    assignmentBalance: assignmentBalance,
    pruneTipologiaAsignaciones: pruneTipologiaAsignaciones,
    normalizeAsignaciones: normalizeAsignaciones,
    configSnapshot: configSnapshot,
    applyConfigSnapshot: applyConfigSnapshot,
    validate: validate,
    summary: summary,
    migrateLegacyProjectType: migrateLegacyProjectType
  };
})();
