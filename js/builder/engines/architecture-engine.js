/* BOXIES V5.9.48 — Architecture sync derived from Estructura (idempotent, non-destructive) */
var ArchitectureEngine = (function () {
  var MAX_SNAPSHOTS = 8;

  function emptyArchitecture() {
    return {
      version: 1,
      appliedAt: null,
      units: [],
      mediaSlots: [],
      orphans: [],
      tipologyContentCards: 0,
      expectedUnits: 0,
      reviewItems: []
    };
  }

  function ensureState(state) {
    if (!state.architecture || typeof state.architecture !== 'object') {
      state.architecture = emptyArchitecture();
    }
    if (!Array.isArray(state.architecture.units)) state.architecture.units = [];
    if (!Array.isArray(state.architecture.mediaSlots)) state.architecture.mediaSlots = [];
    if (!Array.isArray(state.architecture.orphans)) state.architecture.orphans = [];
    if (!Array.isArray(state.architecture.reviewItems)) state.architecture.reviewItems = [];
    if (!Array.isArray(state.estructuraApplySnapshots)) state.estructuraApplySnapshots = [];
    return state.architecture;
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < (w || 2)) s = '0' + s;
    return s;
  }

  /**
   * Expected physical/commercial units from tipología assignments (preferred)
   * or capacity buckets when unassigned. Stable structureKey for idempotency.
   */
  function buildExpectedUnits(estructura) {
    var e = estructura || {};
    var units = [];
    var tips = e.tipologias || [];
    var hasAssignments = tips.some(function (t) {
      return EstructuraEngine.getTipAssigned(t) > 0;
    });

    if (hasAssignments) {
      tips.forEach(function (tip, ti) {
        var tipKey = tip.id || tip.localId || ('tip-' + ti);
        var tipName = tip.nombre || tip.modelo || ('Tipología ' + (ti + 1));
        var buckets = EstructuraEngine.bucketsForTipologia
          ? EstructuraEngine.bucketsForTipologia(e, tip)
          : EstructuraEngine.listCapacityBuckets(e);
        var wrote = false;
        buckets.forEach(function (b) {
          var qty = EstructuraEngine.getTipAssigned(tip, b.id);
          for (var i = 1; i <= qty; i++) {
            wrote = true;
            units.push({
              structureKey: 'u:' + tipKey + ':' + b.id + ':' + i,
              codigo: (tip.modelo || 'U') + '-' + String(b.label || b.id).slice(0, 8) + '-' + pad(i, 3),
              nombre: tipName + ' · ' + (b.label || 'Unidad') + ' ' + i,
              tipologiaId: tip.id || null,
              tipologiaLocalId: tip.localId || tip.id || tipKey,
              tipologyLabel: tipName,
              bucketId: String(b.id),
              bucketLabel: b.label || '',
              stageId: b.stageId || null,
              componentId: b.componentId || b.id || null,
              kind: b.kind || null,
              torre: b.kind === 'edificio' || b.kind === 'conjunto-edificio' ? (b.label || '') : '',
              piso: '',
              estado: 'disponible',
              status: 'active',
              source: 'asignacion'
            });
          }
        });
        if (!wrote && EstructuraEngine.getTipAssigned(tip) > 0) {
          var q = EstructuraEngine.getTipAssigned(tip);
          for (var j = 1; j <= q; j++) {
            units.push({
              structureKey: 'u:' + tipKey + ':root:' + j,
              codigo: (tip.modelo || 'U') + '-' + pad(j, 3),
              nombre: tipName + ' · ' + j,
              tipologiaId: tip.id || null,
              tipologiaLocalId: tip.localId || tip.id || tipKey,
              tipologyLabel: tipName,
              bucketId: 'root',
              bucketLabel: 'General',
              stageId: null,
              componentId: null,
              kind: null,
              torre: '',
              piso: '',
              estado: 'disponible',
              status: 'active',
              source: 'asignacion'
            });
          }
        }
      });
      return units;
    }

    /* Fallback: capacity slots without tipología — flagged for review */
    var buckets = EstructuraEngine.listCapacityBuckets(e);
    buckets.forEach(function (b) {
      var cap = b.capacity || 0;
      for (var i = 1; i <= cap; i++) {
        units.push({
          structureKey: 'cap:' + b.id + ':' + i,
          codigo: String(b.label || 'U').slice(0, 6) + '-' + pad(i, 3),
          nombre: (b.label || 'Unidad') + ' ' + i,
          tipologiaId: null,
          tipologiaLocalId: null,
          tipologyLabel: null,
          bucketId: String(b.id),
          bucketLabel: b.label || '',
          stageId: b.stageId || null,
          componentId: b.componentId || b.id || null,
          kind: b.kind || null,
          torre: b.label || '',
          piso: '',
          estado: 'disponible',
          status: 'active',
          source: 'capacidad',
          needsTipologia: true
        });
      }
    });
    return units;
  }

  function buildMediaSlots(estructura, units) {
    var e = estructura || {};
    var slots = [];
    slots.push({
      key: 'proyecto:gallery',
      entityType: 'proyecto',
      entityKey: 'root',
      mediaKind: 'gallery',
      label: 'Proyecto · Galería',
      required: false
    });
    slots.push({
      key: 'proyecto:masterplan',
      entityType: 'proyecto',
      entityKey: 'root',
      mediaKind: 'plan-master',
      label: 'Masterplan',
      required: false
    });

    (e.tipologias || []).forEach(function (tip, i) {
      var key = tip.id || tip.localId || ('tip-' + i);
      var label = tip.nombre || tip.modelo || ('Tipología ' + (i + 1));
      slots.push({
        key: 'tipologia:' + key + ':gallery',
        entityType: 'tipologia',
        entityKey: String(key),
        mediaKind: 'gallery',
        label: label + ' · Galería',
        required: false
      });
      slots.push({
        key: 'tipologia:' + key + ':plan',
        entityType: 'tipologia',
        entityKey: String(key),
        mediaKind: 'plan-tipologia',
        label: label + ' · Plano',
        required: false
      });
      slots.push({
        key: 'tipologia:' + key + ':360',
        entityType: 'tipologia',
        entityKey: String(key),
        mediaKind: '360',
        label: label + ' · 360°',
        required: false
      });
    });

    (e.zoneNames || []).forEach(function (name) {
      slots.push({
        key: 'amenidad:' + name + ':gallery',
        entityType: 'amenidad',
        entityKey: name,
        mediaKind: 'gallery',
        label: name + ' · Galería',
        required: false
      });
      slots.push({
        key: 'amenidad:' + name + ':360',
        entityType: 'amenidad',
        entityKey: name,
        mediaKind: '360',
        label: name + ' · 360°',
        required: false
      });
    });

    var buckets = EstructuraEngine.listCapacityBuckets(e);
    buckets.forEach(function (b) {
      if (b.kind !== 'edificio' && b.kind !== 'conjunto-edificio') return;
      slots.push({
        key: 'bucket:' + b.id + ':planta3d',
        entityType: 'bucket',
        entityKey: String(b.id),
        mediaKind: 'plan-3d',
        label: (b.label || 'Torre') + ' · Planta 3D',
        required: false
      });
      slots.push({
        key: 'bucket:' + b.id + ':planta2d',
        entityType: 'bucket',
        entityKey: String(b.id),
        mediaKind: 'plan-2d',
        label: (b.label || 'Torre') + ' · Planta 2D',
        required: false
      });
    });

    void units;
    return slots;
  }

  function takeSnapshot(state, reason) {
    ensureState(state);
    var e = state.estructura ? JSON.parse(JSON.stringify(
      (typeof EstructuraSyncEngine !== 'undefined' && EstructuraSyncEngine.serializeEstructuraDraft)
        ? EstructuraSyncEngine.serializeEstructuraDraft(state.estructura)
        : state.estructura
    )) : null;
    var snap = {
      at: new Date().toISOString(),
      reason: reason || 'apply',
      estructura: e,
      architecture: state.architecture
        ? JSON.parse(JSON.stringify(state.architecture))
        : null,
      experiencia: state.experiencia
        ? JSON.parse(JSON.stringify(state.experiencia))
        : null
    };
    state.estructuraApplySnapshots.unshift(snap);
    if (state.estructuraApplySnapshots.length > MAX_SNAPSHOTS) {
      state.estructuraApplySnapshots = state.estructuraApplySnapshots.slice(0, MAX_SNAPSHOTS);
    }
    return snap;
  }

  /** Diff-sync units: update matches, archive missing, never hard-delete manual content. */
  function syncLocalUnits(state, expected) {
    var arch = ensureState(state);
    var prevByKey = {};
    (arch.units || []).forEach(function (u) {
      if (u.structureKey) prevByKey[u.structureKey] = u;
    });

    var next = expected.map(function (u) {
      var prev = prevByKey[u.structureKey];
      if (!prev) return u;
      return Object.assign({}, u, {
        id: prev.id || null,
        remoteId: prev.remoteId || null,
        manualOverrides: prev.manualOverrides || null,
        estado: (prev.manualOverrides && prev.estado) ? prev.estado : u.estado,
        status: 'active'
      });
    });

    var nextKeys = {};
    next.forEach(function (u) { nextKeys[u.structureKey] = true; });

    var orphans = [];
    (arch.units || []).forEach(function (u) {
      if (nextKeys[u.structureKey]) return;
      var orphan = Object.assign({}, u, {
        status: 'orphaned',
        review: true
      });
      orphans.push(orphan);
      next.push(orphan);
    });

    arch.units = next;
    arch.orphans = orphans;
    return arch;
  }

  function syncFromEstructura(state, options) {
    options = options || {};
    var e = (typeof EstructuraEngine !== 'undefined')
      ? EstructuraEngine.ensureState(state)
      : (state.estructura || {});
    ensureState(state);

    if (!options.skipSnapshot) {
      takeSnapshot(state, options.reason || 'apply-estructura');
    }

    var expected = buildExpectedUnits(e);
    syncLocalUnits(state, expected);
    var arch = state.architecture;
    arch.mediaSlots = buildMediaSlots(e, arch.units);
    arch.tipologyContentCards = (e.tipologias || []).length;
    arch.expectedUnits = expected.length;
    arch.appliedAt = options.appliedAt || new Date().toISOString();
    arch.version = (arch.version || 0) + 1;
    arch.reviewItems = [];

    expected.filter(function (u) { return u.needsTipologia; }).forEach(function (u) {
      arch.reviewItems.push({
        severity: 'recomendado',
        message: 'Unidad ' + u.codigo + ' sin tipología asignada.'
      });
    });
    (arch.orphans || []).forEach(function (u) {
      arch.reviewItems.push({
        severity: 'obligatorio',
        message: 'Unidad «' + (u.codigo || u.nombre) + '» quedó huérfana; conservada para revisión.'
      });
    });

    /* Preserve entityRef on existing media — never wipe uploads */
    normalizeMediaEntityRefs(state);

    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.syncFromEstructura) {
      ExperienciaEngine.syncFromEstructura(state, { appliedAt: arch.appliedAt });
    }

    return arch;
  }

  function normalizeMediaEntityRefs(state) {
    function ensureRef(item, fallbackType) {
      if (!item || typeof item !== 'object') return;
      if (!item.entityRef) {
        item.entityRef = { type: fallbackType || 'proyecto', key: 'root' };
      }
    }
    (state.gallery || []).forEach(function (g) { ensureRef(g, 'proyecto'); });
    (state.panoramas || []).forEach(function (p) { ensureRef(p, 'proyecto'); });
    (state.plans || []).forEach(function (p) {
      ensureRef(p, 'proyecto');
      if (!p.planKind) p.planKind = 'otro';
    });
    (state.downloads || []).forEach(function (d) { ensureRef(d, 'proyecto'); });
    (state.hotspotSuggestions || []).forEach(function (h) {
      if (!h.entityRef) h.entityRef = null;
    });
  }

  async function syncProyectoUnidades(state, proyectoId) {
    if (!proyectoId || typeof AdminApi === 'undefined') {
      return { count: 0, skipped: true };
    }
    var arch = ensureState(state);
    var client = AdminApi.getClient();
    var existing = await client
      .from('proyecto_unidades')
      .select('id, codigo, archived')
      .eq('proyecto_id', proyectoId);
    if (existing.error) {
      /* Soft fail — local architecture still valid */
      return { count: 0, error: existing.error.message };
    }

    var byCodigo = {};
    (existing.data || []).forEach(function (row) {
      if (row.codigo) byCodigo[row.codigo] = row;
    });

    var keep = {};
    var count = 0;
    var active = (arch.units || []).filter(function (u) { return u.status !== 'orphaned'; });

    for (var i = 0; i < active.length; i++) {
      var u = active[i];
      var codigo = String(u.codigo || u.structureKey).slice(0, 80);
      var row = {
        proyecto_id: proyectoId,
        codigo: codigo,
        nombre: u.nombre || codigo,
        tipologia_id: u.tipologiaId || null,
        orden: i,
        estado: u.estado || 'disponible',
        archived: false,
        updated_at: new Date().toISOString()
      };
      var matched = byCodigo[codigo];
      if (matched) {
        var up = await client.from('proyecto_unidades').update(row).eq('id', matched.id).select('id').maybeSingle();
        if (!up.error && up.data) {
          u.remoteId = up.data.id;
          keep[up.data.id] = true;
          count++;
        }
      } else {
        var ins = await client.from('proyecto_unidades').insert(row).select('id').single();
        if (!ins.error && ins.data) {
          u.remoteId = ins.data.id;
          keep[ins.data.id] = true;
          count++;
        }
      }
    }

    /* Archive remote units no longer expected — never DELETE */
    for (var j = 0; j < (existing.data || []).length; j++) {
      var er = existing.data[j];
      if (!keep[er.id] && !er.archived) {
        await client.from('proyecto_unidades').update({
          archived: true,
          updated_at: new Date().toISOString()
        }).eq('id', er.id);
      }
    }

    return { count: count };
  }

  function activeUnitCount(state) {
    var arch = ensureState(state);
    return (arch.units || []).filter(function (u) { return u.status !== 'orphaned'; }).length;
  }

  function railViviendasLabel(state) {
    var n = activeUnitCount(state);
    if (n > 0) return n + (n === 1 ? ' unidad' : ' unidades');
    var cards = (state.viviendas || []).length;
    if (cards > 0) return cards + (cards === 1 ? ' tarjeta' : ' tarjetas');
    if (state.estructura && state.estructura.appliedAt) return '0 unidades';
    return 'Pendiente estructura';
  }

  function plansProgress(state) {
    var arch = ensureState(state);
    var needed = (arch.mediaSlots || []).filter(function (s) {
      return s.mediaKind === 'plan-master' ||
        s.mediaKind === 'plan-tipologia' ||
        s.mediaKind === 'plan-2d' ||
        s.mediaKind === 'plan-3d';
    }).length;
    var have = (state.plans || []).length;
    if (!needed && !have) {
      return state.estructura && state.estructura.appliedAt ? '0 / 0' : 'Pendiente';
    }
    if (!needed) return have + ' archivos';
    return have + ' / ' + needed;
  }

  return {
    emptyArchitecture: emptyArchitecture,
    ensureState: ensureState,
    buildExpectedUnits: buildExpectedUnits,
    buildMediaSlots: buildMediaSlots,
    takeSnapshot: takeSnapshot,
    syncFromEstructura: syncFromEstructura,
    syncProyectoUnidades: syncProyectoUnidades,
    normalizeMediaEntityRefs: normalizeMediaEntityRefs,
    activeUnitCount: activeUnitCount,
    railViviendasLabel: railViviendasLabel,
    plansProgress: plansProgress
  };
})();
