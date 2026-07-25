/* BOXIES V5.9.22 — Estructura Sync: persist + Aplicar + sync tipologías → viviendas */
var EstructuraSyncEngine = (function () {
  function resolveProject(state) {
    if (typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.resolveProject) {
      return HeroSyncEngine.resolveProject(state);
    }
    return Promise.resolve(null);
  }

  function client() {
    return AdminApi.getClient();
  }

  function clampInt(v, min, max, fallback) {
    return EstructuraEngine.clampInt(v, min, max, fallback);
  }

  /** Serializable draft payload — no catalog bloat, no UI-only flags. */
  function serializeEstructuraDraft(e) {
    e = e || {};
    return {
      developmentType: e.developmentType,
      edificioMode: e.edificioMode,
      unidadHousingType: e.unidadHousingType,
      unidadCount: e.unidadCount,
      lotesSubtype: e.lotesSubtype,
      mixto: e.mixto ? {
        edificios: !!e.mixto.edificios,
        casas: !!e.mixto.casas,
        lotes: !!e.mixto.lotes
      } : null,
      orgEtapas: !!e.orgEtapas,
      orgSectores: !!e.orgSectores,
      orgManzanas: !!e.orgManzanas,
      totalViviendas: e.totalViviendas,
      totalLotes: e.totalLotes,
      tipologiasCount: (e.tipologias || []).length,
      repeatFloorDistribution: e.repeatFloorDistribution !== false,
      buildings: Array.isArray(e.buildings) ? e.buildings : [],
      tipologias: Array.isArray(e.tipologias) ? e.tipologias : [],
      zoneNames: Array.isArray(e.zoneNames) ? e.zoneNames.slice() : [],
      conjuntoConfig: e.conjuntoConfig || null,
      openPanels: e.openPanels || null
    };
  }

  function restoreEstructuraDraft(e, draft) {
    if (!e || !draft || typeof draft !== 'object') return e;
    if (draft.developmentType) {
      e.developmentType = EstructuraEngine.normalizeTypeId(draft.developmentType);
    }
    if (draft.edificioMode) e.edificioMode = draft.edificioMode;
    if (draft.unidadHousingType) e.unidadHousingType = draft.unidadHousingType;
    if (draft.unidadCount != null) e.unidadCount = draft.unidadCount;
    if (draft.lotesSubtype) e.lotesSubtype = draft.lotesSubtype;
    if (draft.mixto && typeof draft.mixto === 'object') e.mixto = draft.mixto;
    if (draft.orgEtapas != null) e.orgEtapas = !!draft.orgEtapas;
    if (draft.orgSectores != null) e.orgSectores = !!draft.orgSectores;
    if (draft.orgManzanas != null) e.orgManzanas = !!draft.orgManzanas;
    if (draft.totalViviendas != null) e.totalViviendas = draft.totalViviendas;
    if (draft.totalLotes != null) e.totalLotes = draft.totalLotes;
    if (draft.tipologiasCount != null) e.tipologiasCount = draft.tipologiasCount;
    if (draft.repeatFloorDistribution != null) {
      e.repeatFloorDistribution = draft.repeatFloorDistribution !== false;
    }
    if (Array.isArray(draft.buildings)) {
      e.buildings = draft.buildings.map(function (b) {
        return Object.assign({}, b);
      });
    }
    if (Array.isArray(draft.tipologias)) {
      e.tipologias = draft.tipologias.map(function (t) {
        var tip = Object.assign({}, t);
        tip.plantas = Array.isArray(t.plantas)
          ? t.plantas.map(function (p) { return Object.assign({}, p); })
          : [];
        tip.ambientes = Array.isArray(t.ambientes)
          ? t.ambientes.map(function (a) { return Object.assign({}, a); })
          : [];
        return tip;
      });
      e.tipologiasCount = e.tipologias.length;
    }
    if (Array.isArray(draft.zoneNames)) e.zoneNames = draft.zoneNames.slice();
    if (draft.conjuntoConfig && typeof draft.conjuntoConfig === 'object') {
      EstructuraEngine.applyConfigSnapshot(e, { conjuntoConfig: draft.conjuntoConfig });
    }
    if (draft.openPanels && typeof draft.openPanels === 'object') {
      e.openPanels = Object.assign({}, draft.openPanels);
    }
    return e;
  }

  async function loadAmenidadesCatalog(state) {
    var e = EstructuraEngine.ensureState(state);
    var res = await client().from('amenidades').select('id, nombre, categoria, icono').order('categoria').order('nombre');
    if (res.error) throw new Error(res.error.message || 'Error cargando zonas');
    e.amenidadesCatalog = res.data || [];
    return e.amenidadesCatalog;
  }

  async function bindFromProject(state) {
    var project = await resolveProject(state);
    if (!project) return null;
    var e = EstructuraEngine.ensureState(state);
    var pid = project.id;

    await loadAmenidadesCatalog(state);

    var est = await client().from('proyecto_estructura').select('*').eq('proyecto_id', pid).maybeSingle();
    if (est.error) throw new Error(est.error.message || 'Error cargando estructura');

    var buildingsRes = await client()
      .from('proyecto_edificios')
      .select('*')
      .eq('proyecto_id', pid)
      .eq('archived', false)
      .order('orden');
    if (buildingsRes.error) throw new Error(buildingsRes.error.message);

    var tipsRes = await client()
      .from('tipologias')
      .select('*')
      .eq('proyecto_id', pid)
      .eq('archived', false)
      .order('orden');
    if (tipsRes.error) throw new Error(tipsRes.error.message);

    var tipIds = (tipsRes.data || []).map(function (t) { return t.id; });
    var plantasRes = { data: [] };
    var ambRes = { data: [] };
    if (tipIds.length) {
      plantasRes = await client()
        .from('tipologia_plantas')
        .select('*')
        .in('tipologia_id', tipIds)
        .eq('archived', false)
        .order('orden');
      ambRes = await client()
        .from('tipologia_ambientes')
        .select('*')
        .in('tipologia_id', tipIds)
        .eq('archived', false)
        .order('orden');
    }

    var zonesRes = await client()
      .from('proyecto_amenidades')
      .select('amenidad_id, amenidades(nombre)')
      .eq('proyecto_id', pid);

    if (est.data) {
      e.developmentType = est.data.development_type || e.developmentType;
      e.orgEtapas = !!est.data.org_etapas;
      e.orgSectores = !!est.data.org_sectores;
      e.orgManzanas = !!est.data.org_manzanas;
      e.totalViviendas = est.data.total_viviendas;
      e.totalLotes = est.data.total_lotes;
      e.tipologiasCount = est.data.tipologias_count || e.tipologiasCount;
      e.repeatFloorDistribution = est.data.repeat_floor_distribution !== false;
      e.appliedAt = est.data.applied_at;
      if (est.data.config_json && typeof est.data.config_json === 'object') {
        EstructuraEngine.applyConfigSnapshot(e, est.data.config_json);
      }
    }

    var hasDraft = !!(est.data && est.data.draft_json && typeof est.data.draft_json === 'object');

    if (hasDraft) {
      /* Prefer draft over applied tables — Guardar borrador without Aplicar */
      restoreEstructuraDraft(e, est.data.draft_json);
      if (est.data.config_json && typeof est.data.config_json === 'object' &&
          !e.conjuntoConfig && est.data.config_json.conjuntoConfig) {
        EstructuraEngine.applyConfigSnapshot(e, {
          conjuntoConfig: est.data.config_json.conjuntoConfig
        });
      }
      /* Compat: incomplete legacy drafts still fill from applied tables when empty */
      if (!(e.buildings && e.buildings.length) && (buildingsRes.data || []).length) {
        e.buildings = (buildingsRes.data || []).map(function (b, i) {
          return {
            localId: b.id,
            id: b.id,
            kind: b.kind,
            nombre: b.nombre || '',
            pisos: b.pisos,
            sotanos: b.sotanos,
            rooftop: !!b.rooftop,
            unidadesPorPiso: b.unidades_por_piso,
            orden: b.orden != null ? b.orden : i,
            open: i === 0
          };
        });
      }
      if (!(e.tipologias && e.tipologias.length) && (tipsRes.data || []).length) {
        var plantasByTipDraft = {};
        (plantasRes.data || []).forEach(function (p) {
          if (!plantasByTipDraft[p.tipologia_id]) plantasByTipDraft[p.tipologia_id] = [];
          plantasByTipDraft[p.tipologia_id].push(p);
        });
        var ambByTipDraft = {};
        (ambRes.data || []).forEach(function (a) {
          if (!ambByTipDraft[a.tipologia_id]) ambByTipDraft[a.tipologia_id] = [];
          ambByTipDraft[a.tipologia_id].push(a);
        });
        e.tipologias = tipsRes.data.map(function (t, i) {
          var plantas = (plantasByTipDraft[t.id] || []).map(function (p) {
            return {
              localId: p.id,
              id: p.id,
              nombre: p.nombre,
              orden: p.orden,
              open: false
            };
          });
          var plantaIdToLocal = {};
          plantas.forEach(function (p) { plantaIdToLocal[p.id] = p.localId; });
          return {
            localId: t.id,
            id: t.id,
            componente: t.componente || null,
            producto: t.producto || '',
            modelo: t.modelo || '',
            nombre: t.nombre || '',
            area_m2: t.area_m2,
            area_privada_m2: t.area_privada_m2,
            area_lote_m2: t.area_lote_m2,
            habitaciones: t.habitaciones,
            banos: t.banos,
            parqueaderos: t.parqueaderos,
            plantas_internas: t.plantas_internas != null ? t.plantas_internas : plantas.length,
            precio: t.precio,
            plantas: plantas,
            ambientes: (ambByTipDraft[t.id] || []).map(function (a) {
              return {
                localId: a.id,
                id: a.id,
                nombre: a.nombre,
                plantaLocalId: a.planta_id ? plantaIdToLocal[a.planta_id] || null : null,
                orden: a.orden
              };
            }),
            open: i === 0
          };
        });
        e.tipologiasCount = e.tipologias.length;
      }
      if (!(e.zoneNames && e.zoneNames.length) && (zonesRes.data || []).length) {
        e.zoneNames = [];
        (zonesRes.data || []).forEach(function (row) {
          var n = row.amenidades && row.amenidades.nombre;
          if (n) e.zoneNames.push(n);
        });
      }
      EstructuraEngine.ensureState(state);
    } else {
      e.buildings = (buildingsRes.data || []).map(function (b, i) {
        return {
          localId: b.id,
          id: b.id,
          kind: b.kind,
          nombre: b.nombre || '',
          pisos: b.pisos,
          sotanos: b.sotanos,
          rooftop: !!b.rooftop,
          unidadesPorPiso: b.unidades_por_piso,
          orden: b.orden != null ? b.orden : i,
          open: i === 0
        };
      });

      var plantasByTip = {};
      (plantasRes.data || []).forEach(function (p) {
        if (!plantasByTip[p.tipologia_id]) plantasByTip[p.tipologia_id] = [];
        plantasByTip[p.tipologia_id].push(p);
      });
      var ambByTip = {};
      (ambRes.data || []).forEach(function (a) {
        if (!ambByTip[a.tipologia_id]) ambByTip[a.tipologia_id] = [];
        ambByTip[a.tipologia_id].push(a);
      });

      if ((tipsRes.data || []).length) {
        e.tipologias = tipsRes.data.map(function (t, i) {
          var plantas = (plantasByTip[t.id] || []).map(function (p) {
            return {
              localId: p.id,
              id: p.id,
              nombre: p.nombre,
              orden: p.orden,
              open: false
            };
          });
          var plantaIdToLocal = {};
          plantas.forEach(function (p) { plantaIdToLocal[p.id] = p.localId; });
          return {
            localId: t.id,
            id: t.id,
            componente: t.componente || null,
            producto: t.producto || '',
            modelo: t.modelo || '',
            nombre: t.nombre || '',
            area_m2: t.area_m2,
            area_privada_m2: t.area_privada_m2,
            area_lote_m2: t.area_lote_m2,
            habitaciones: t.habitaciones,
            banos: t.banos,
            parqueaderos: t.parqueaderos,
            plantas_internas: t.plantas_internas != null ? t.plantas_internas : plantas.length,
            precio: t.precio,
            plantas: plantas,
            ambientes: (ambByTip[t.id] || []).map(function (a) {
              return {
                localId: a.id,
                id: a.id,
                nombre: a.nombre,
                plantaLocalId: a.planta_id ? plantaIdToLocal[a.planta_id] || null : null,
                orden: a.orden
              };
            }),
            open: i === 0
          };
        });
        e.tipologiasCount = e.tipologias.length;
      }

      e.zoneNames = [];
      (zonesRes.data || []).forEach(function (row) {
        var n = row.amenidades && row.amenidades.nombre;
        if (n) e.zoneNames.push(n);
      });

      EstructuraEngine.ensureState(state);
    }

    state.projectType = EstructuraEngine.normalizeTypeId(e.developmentType);
    e.developmentType = state.projectType;
    e.dirty = false;
    EstructuraEngine.syncTypologyPlantas(e);
    if (typeof ProjectTypesEngine !== 'undefined') {
      state.projectStructure = ProjectTypesEngine.getStructure(state.projectType) || state.projectStructure;
    }
    return project;
  }

  async function saveDraft(state) {
    var project = await resolveProject(state);
    if (!project) throw new Error('Abre el showroom para guardar la estructura.');
    var e = EstructuraEngine.ensureState(state);
    var payload = {
      proyecto_id: project.id,
      development_type: EstructuraEngine.normalizeTypeId(e.developmentType),
      org_etapas: !!e.orgEtapas,
      org_sectores: !!e.orgSectores,
      org_manzanas: !!e.orgManzanas,
      total_viviendas: e.developmentType === 'unidad' ? e.unidadCount : e.totalViviendas,
      total_lotes: e.totalLotes,
      tipologias_count: (e.tipologias || []).length,
      repeat_floor_distribution: e.repeatFloorDistribution !== false,
      config_json: EstructuraEngine.configSnapshot(e),
      draft_json: serializeEstructuraDraft(e),
      updated_at: new Date().toISOString()
    };
    var res = await client().from('proyecto_estructura').upsert(payload, { onConflict: 'proyecto_id' });
    if (res.error) throw new Error(res.error.message || 'No se pudo guardar el borrador');
    e.dirty = false;
    return { projectId: project.id };
  }

  function detectConflicts(prevTips, nextTips) {
    var conflicts = [];
    var nextIds = {};
    (nextTips || []).forEach(function (t) {
      if (t.id) nextIds[t.id] = true;
    });
    (prevTips || []).forEach(function (t) {
      if (!t.id) return;
      if (!nextIds[t.id]) {
        var ambCount = (t.ambientes || []).length;
        var plantaCount = (t.plantas || []).length;
        if (ambCount || plantaCount) {
          conflicts.push({
            type: 'tipologia_remove',
            id: t.id,
            nombre: t.nombre || t.modelo,
            ambientes: ambCount,
            plantas: plantaCount
          });
        }
      } else {
        var next = (nextTips || []).find(function (x) { return x.id === t.id; });
        if (!next) return;
        var nextPlantaIds = {};
        (next.plantas || []).forEach(function (p) { if (p.id) nextPlantaIds[p.id] = true; });
        (t.plantas || []).forEach(function (p) {
          if (!p.id || nextPlantaIds[p.id]) return;
          var amb = (t.ambientes || []).filter(function (a) {
            return a.plantaLocalId === p.localId || a.plantaLocalId === p.id;
          }).length;
          if (amb > 0) {
            conflicts.push({
              type: 'planta_remove',
              tipologyId: t.id,
              plantaId: p.id,
              nombre: p.nombre,
              ambientes: amb
            });
          }
        });
      }
    });
    return conflicts;
  }

  async function apply(state, options) {
    options = options || {};
    var project = await resolveProject(state);
    if (!project) throw new Error('Abre el showroom del proyecto para aplicar la estructura.');
    var e = EstructuraEngine.ensureState(state);
    var errors = EstructuraEngine.validate(e);
    if (errors.length) {
      var err = new Error(errors[0]);
      err.validation = errors;
      throw err;
    }

    var pid = project.id;
    var prevTipsRes = await client()
      .from('tipologias')
      .select('id, nombre, modelo')
      .eq('proyecto_id', pid)
      .eq('archived', false);
    if (prevTipsRes.error) throw new Error(prevTipsRes.error.message);

    var prevAmbCounts = {};
    var tipIds = (prevTipsRes.data || []).map(function (t) { return t.id; });
    if (tipIds.length) {
      var ambC = await client()
        .from('tipologia_ambientes')
        .select('tipologia_id, planta_id')
        .in('tipologia_id', tipIds)
        .eq('archived', false);
      (ambC.data || []).forEach(function (a) {
        var key = a.tipologia_id;
        if (!prevAmbCounts[key]) prevAmbCounts[key] = { total: 0, byPlanta: {} };
        prevAmbCounts[key].total++;
        if (a.planta_id) {
          prevAmbCounts[key].byPlanta[a.planta_id] = (prevAmbCounts[key].byPlanta[a.planta_id] || 0) + 1;
        }
      });
    }

    var snapshotTips = (e.tipologias || []).map(function (t) {
      return {
        id: t.id,
        nombre: t.nombre,
        modelo: t.modelo,
        plantas: (t.plantas || []).map(function (p) {
          return { id: p.id, localId: p.localId, nombre: p.nombre };
        }),
        ambientes: (t.ambientes || []).slice()
      };
    });

    /* Reconstruct previous tips shape for conflict detection */
    var prevShaped = (prevTipsRes.data || []).map(function (t) {
      return {
        id: t.id,
        nombre: t.nombre,
        modelo: t.modelo,
        plantas: [],
        ambientes: Array(prevAmbCounts[t.id] ? prevAmbCounts[t.id].total : 0)
      };
    });

    if (!options.force && !options.resolveConflicts) {
      var conflicts = detectConflicts(
        (prevTipsRes.data || []).map(function (t) {
          var plantas = [];
          Object.keys((prevAmbCounts[t.id] && prevAmbCounts[t.id].byPlanta) || {}).forEach(function (plantaId) {
            plantas.push({
              id: plantaId,
              localId: plantaId,
              nombre: 'Planta',
              ambientes: prevAmbCounts[t.id].byPlanta[plantaId]
            });
          });
          return {
            id: t.id,
            nombre: t.nombre,
            modelo: t.modelo,
            plantas: plantas,
            ambientes: Array(prevAmbCounts[t.id] ? prevAmbCounts[t.id].total : 0).fill({})
          };
        }),
        snapshotTips
      );
      /* Soft: only block when removing tipologías that still exist remotely and are missing from draft with content */
      var nextRemoteIds = {};
      snapshotTips.forEach(function (t) { if (t.id) nextRemoteIds[t.id] = true; });
      var hardConflicts = [];
      (prevTipsRes.data || []).forEach(function (t) {
        if (nextRemoteIds[t.id]) return;
        var c = prevAmbCounts[t.id];
        if (c && c.total > 0) {
          hardConflicts.push({
            type: 'tipologia_remove',
            id: t.id,
            nombre: t.nombre || t.modelo || 'Tipología',
            ambientes: c.total,
            message: '«' + (t.nombre || t.modelo) + '» contiene ' + c.total + ' ambiente(s). ¿Archivar en lugar de eliminar?'
          });
        }
      });
      if (hardConflicts.length) {
        var conflictErr = new Error('Conflictos al aplicar estructura');
        conflictErr.conflicts = hardConflicts;
        throw conflictErr;
      }
      void conflicts;
      void prevShaped;
    }

    /* Upsert estructura header */
    var header = {
      proyecto_id: pid,
      development_type: EstructuraEngine.normalizeTypeId(e.developmentType),
      org_etapas: !!e.orgEtapas,
      org_sectores: !!e.orgSectores,
      org_manzanas: !!e.orgManzanas,
      total_viviendas: e.developmentType === 'unidad' ? e.unidadCount : e.totalViviendas,
      total_lotes: e.totalLotes,
      tipologias_count: (e.tipologias || []).length,
      repeat_floor_distribution: e.repeatFloorDistribution !== false,
      config_json: EstructuraEngine.configSnapshot(e),
      draft_json: null,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    var upEst = await client().from('proyecto_estructura').upsert(header, { onConflict: 'proyecto_id' });
    if (upEst.error) throw new Error(upEst.error.message || 'Error guardando estructura');

    /* Buildings: upsert current; archive missing */
    var keepBuildingIds = {};
    for (var bi = 0; bi < (e.buildings || []).length; bi++) {
      var b = e.buildings[bi];
      var brow = {
        proyecto_id: pid,
        kind: b.kind || (e.edificioMode === 'multiples' ? 'torre' : 'edificio'),
        nombre: b.nombre || ('Torre ' + (bi + 1)),
        pisos: clampInt(b.pisos, 0, 200, 1),
        sotanos: clampInt(b.sotanos, 0, 20, 0),
        rooftop: !!b.rooftop,
        unidades_por_piso: clampInt(b.unidadesPorPiso, 0, 100, 1),
        orden: bi,
        archived: false,
        updated_at: new Date().toISOString()
      };
      if (b.id) {
        var bu = await client().from('proyecto_edificios').update(brow).eq('id', b.id).eq('proyecto_id', pid).select('id').maybeSingle();
        if (bu.error) throw new Error(bu.error.message);
        if (bu.data) {
          b.id = bu.data.id;
          b.localId = bu.data.id;
          keepBuildingIds[bu.data.id] = true;
        }
      } else {
        var bi2 = await client().from('proyecto_edificios').insert(brow).select('id').single();
        if (bi2.error) throw new Error(bi2.error.message);
        b.id = bi2.data.id;
        b.localId = bi2.data.id;
        keepBuildingIds[b.id] = true;
      }

      /* Levels (simple regenerate for building) */
      await client().from('proyecto_niveles').delete().eq('edificio_id', b.id);
      var levels = [];
      var si;
      for (si = clampInt(b.sotanos, 0, 20, 0); si >= 1; si--) {
        levels.push({
          proyecto_id: pid,
          edificio_id: b.id,
          kind: 'sotano',
          numero: si,
          nombre: 'Sótano ' + si,
          orden: -si
        });
      }
      for (si = 1; si <= clampInt(b.pisos, 0, 200, 0); si++) {
        levels.push({
          proyecto_id: pid,
          edificio_id: b.id,
          kind: 'piso',
          numero: si,
          nombre: 'Piso ' + si,
          orden: si
        });
      }
      if (b.rooftop) {
        levels.push({
          proyecto_id: pid,
          edificio_id: b.id,
          kind: 'azotea',
          numero: 0,
          nombre: 'Azotea / Rooftop',
          orden: 1000
        });
      }
      if (levels.length) {
        var lr = await client().from('proyecto_niveles').insert(levels);
        if (lr.error) throw new Error(lr.error.message);
      }
    }

    var existingBuildings = await client().from('proyecto_edificios').select('id').eq('proyecto_id', pid).eq('archived', false);
    for (var ebx = 0; ebx < (existingBuildings.data || []).length; ebx++) {
      var ebid = existingBuildings.data[ebx].id;
      if (!keepBuildingIds[ebid]) {
        await client().from('proyecto_edificios').update({ archived: true }).eq('id', ebid);
      }
    }

    /* Tipologías */
    var keepTipIds = {};
    var tipologiaIdMap = {};
    for (var ti = 0; ti < (e.tipologias || []).length; ti++) {
      var tip = e.tipologias[ti];
      var tipName = (tip.nombre || '').trim() ||
        ((EstructuraEngine.productsFor(e.developmentType, {
          componente: tip.componente,
          unidadHousingType: e.unidadHousingType
        }).find(function (p) { return p.id === tip.producto; }) || {}).label || 'Tipología') +
        (tip.modelo ? ' · ' + tip.modelo : '');
      var tipRow = {
        proyecto_id: pid,
        nombre: tipName,
        producto: tip.producto || null,
        modelo: tip.modelo || null,
        componente: tip.componente || null,
        habitaciones: clampInt(tip.habitaciones, 0, 30, 0),
        banos: clampInt(tip.banos, 0, 30, 0),
        parqueaderos: clampInt(tip.parqueaderos, 0, 30, 0),
        area_m2: tip.area_m2 != null ? Number(tip.area_m2) : null,
        area_privada_m2: tip.area_privada_m2 != null ? Number(tip.area_privada_m2) : null,
        area_lote_m2: tip.area_lote_m2 != null ? Number(tip.area_lote_m2) : null,
        plantas_internas: clampInt(tip.plantas_internas, 0, 20, 0),
        precio: tip.precio != null ? Number(tip.precio) : null,
        orden: ti,
        archived: false,
        updated_at: new Date().toISOString()
      };

      if (tip.id) {
        var tu = await client().from('tipologias').update(tipRow).eq('id', tip.id).eq('proyecto_id', pid).select('id').maybeSingle();
        if (tu.error) throw new Error(tu.error.message);
        if (!tu.data) {
          var tiIns = await client().from('tipologias').insert(tipRow).select('id').single();
          if (tiIns.error) throw new Error(tiIns.error.message);
          tip.id = tiIns.data.id;
        } else {
          tip.id = tu.data.id;
        }
      } else {
        var tiNew = await client().from('tipologias').insert(tipRow).select('id').single();
        if (tiNew.error) throw new Error(tiNew.error.message);
        tip.id = tiNew.data.id;
      }
      tip.localId = tip.id;
      tip.nombre = tipName;
      keepTipIds[tip.id] = true;
      tipologiaIdMap[tip.localId] = tip.id;

      /* Plantas */
      var keepPlantaIds = {};
      var plantaMap = {};
      EstructuraEngine.syncTypologyPlantas(e);
      for (var pi = 0; pi < (tip.plantas || []).length; pi++) {
        var pl = tip.plantas[pi];
        var plRow = {
          tipologia_id: tip.id,
          proyecto_id: pid,
          nombre: pl.nombre || ('Planta ' + (pi + 1)),
          orden: pi + 1,
          archived: false
        };
        if (pl.id) {
          var pu = await client().from('tipologia_plantas').update(plRow).eq('id', pl.id).select('id').maybeSingle();
          if (pu.error) throw new Error(pu.error.message);
          if (pu.data) {
            pl.id = pu.data.id;
          } else {
            var pIns = await client().from('tipologia_plantas').insert(plRow).select('id').single();
            if (pIns.error) throw new Error(pIns.error.message);
            pl.id = pIns.data.id;
          }
        } else {
          var pNew = await client().from('tipologia_plantas').insert(plRow).select('id').single();
          if (pNew.error) throw new Error(pNew.error.message);
          pl.id = pNew.data.id;
        }
        plantaMap[pl.localId] = pl.id;
        pl.localId = pl.id;
        keepPlantaIds[pl.id] = true;
      }
      var oldPlantas = await client().from('tipologia_plantas').select('id').eq('tipologia_id', tip.id).eq('archived', false);
      for (var opi = 0; opi < (oldPlantas.data || []).length; opi++) {
        if (!keepPlantaIds[oldPlantas.data[opi].id]) {
          await client().from('tipologia_plantas').update({ archived: true }).eq('id', oldPlantas.data[opi].id);
        }
      }

      /* Ambientes: replace non-archived set softly */
      var keepAmbIds = {};
      for (var ai = 0; ai < (tip.ambientes || []).length; ai++) {
        var amb = tip.ambientes[ai];
        var plantaId = amb.plantaLocalId ? (plantaMap[amb.plantaLocalId] || (keepPlantaIds[amb.plantaLocalId] ? amb.plantaLocalId : null)) : null;
        var aRow = {
          tipologia_id: tip.id,
          proyecto_id: pid,
          planta_id: plantaId,
          nombre: (amb.nombre || 'Ambiente').trim() || 'Ambiente',
          orden: ai,
          archived: false
        };
        if (amb.id) {
          var au = await client().from('tipologia_ambientes').update(aRow).eq('id', amb.id).select('id').maybeSingle();
          if (au.error) throw new Error(au.error.message);
          if (au.data) amb.id = au.data.id;
          else {
            var aIns = await client().from('tipologia_ambientes').insert(aRow).select('id').single();
            if (aIns.error) throw new Error(aIns.error.message);
            amb.id = aIns.data.id;
          }
        } else {
          var aNew = await client().from('tipologia_ambientes').insert(aRow).select('id').single();
          if (aNew.error) throw new Error(aNew.error.message);
          amb.id = aNew.data.id;
        }
        amb.localId = amb.id;
        keepAmbIds[amb.id] = true;
      }
      var oldAmb = await client().from('tipologia_ambientes').select('id').eq('tipologia_id', tip.id).eq('archived', false);
      for (var oai = 0; oai < (oldAmb.data || []).length; oai++) {
        if (!keepAmbIds[oldAmb.data[oai].id]) {
          await client().from('tipologia_ambientes').update({ archived: true }).eq('id', oldAmb.data[oai].id);
        }
      }
    }

    /* Archive tipologías removed from draft (never hard-delete) */
    var archiveRemoved = options.archiveRemoved !== false;
    if (archiveRemoved) {
      for (var pri = 0; pri < (prevTipsRes.data || []).length; pri++) {
        var pt = prevTipsRes.data[pri];
        if (!keepTipIds[pt.id]) {
          await client().from('tipologias').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', pt.id);
        }
      }
    }

    /* Zonas → proyecto_amenidades */
    var catalog = e.amenidadesCatalog && e.amenidadesCatalog.length
      ? e.amenidadesCatalog
      : await loadAmenidadesCatalog(state);
    var nameToId = {};
    catalog.forEach(function (a) { nameToId[a.nombre] = a.id; });
    await client().from('proyecto_amenidades').delete().eq('proyecto_id', pid);
    var zoneRows = [];
    (e.zoneNames || []).forEach(function (name) {
      if (nameToId[name]) zoneRows.push({ proyecto_id: pid, amenidad_id: nameToId[name] });
    });
    if (zoneRows.length) {
      var zr = await client().from('proyecto_amenidades').insert(zoneRows);
      if (zr.error) throw new Error(zr.error.message);
    }

    /* Sync viviendas cards from tipologías (1:1) */
    var vivSync = await syncViviendasFromTipologias(state, pid, e.tipologias);

    e.appliedAt = header.applied_at;
    e.dirty = false;
    state.projectType = EstructuraEngine.normalizeTypeId(e.developmentType);
    e.developmentType = state.projectType;
    if (typeof ProjectTypesEngine !== 'undefined') {
      state.projectStructure = ProjectTypesEngine.getStructure(state.projectType) || state.projectStructure;
    }

    return {
      projectId: pid,
      tipologias: e.tipologias.length,
      viviendas: vivSync.count,
      buildings: (e.buildings || []).length,
      unidadesFisicasConceptuales: EstructuraEngine.conceptualPhysicalUnits(e)
    };
  }

  async function syncViviendasFromTipologias(state, proyectoId, tipologias) {
    var existing = await client()
      .from('viviendas')
      .select('id, tipologia_id, nombre, codigo')
      .eq('proyecto_id', proyectoId);
    if (existing.error) throw new Error(existing.error.message);

    var byTip = {};
    (existing.data || []).forEach(function (v) {
      if (v.tipologia_id) byTip[v.tipologia_id] = v;
    });

    var count = 0;
    for (var i = 0; i < (tipologias || []).length; i++) {
      var tip = tipologias[i];
      if (!tip.id) continue;
      var nombre = tip.nombre || tip.modelo || ('Tipología ' + (i + 1));
      var payload = {
        proyecto_id: proyectoId,
        nombre: nombre,
        codigo: tip.modelo ? String(tip.modelo).slice(0, 20) : ('T' + (i + 1)),
        tipo: tip.producto || 'Apartamento',
        area_m2: tip.area_m2 || 0,
        habitaciones: tip.habitaciones || 0,
        banos: tip.banos || 0,
        parqueaderos: tip.parqueaderos || 0,
        precio: tip.precio || 0,
        estado: 'disponible',
        publicado: true,
        planos_modo: 'proximamente',
        tour360_modo: 'proximamente',
        tipologia_id: tip.id
      };

      var matched = byTip[tip.id];
      if (matched) {
        payload.id = matched.id;
      }

      if (typeof ViviendasSyncEngine !== 'undefined' && ViviendasSyncEngine.syncOne) {
        await ViviendasSyncEngine.syncOne(state, payload);
      } else {
        var rpc = await client().rpc('admin_sync_vivienda', { payload: payload });
        if (rpc.error) {
          /* fallback direct */
          if (matched) {
            var u = await client().from('viviendas').update({
              nombre: payload.nombre,
              codigo: payload.codigo,
              tipo: payload.tipo,
              area_m2: payload.area_m2,
              habitaciones: payload.habitaciones,
              banos: payload.banos,
              parqueaderos: payload.parqueaderos,
              precio: payload.precio,
              tipologia_id: tip.id,
              updated_at: new Date().toISOString()
            }).eq('id', matched.id);
            if (u.error) throw new Error(u.error.message);
          } else {
            var ins = await client().from('viviendas').insert({
              proyecto_id: proyectoId,
              nombre: payload.nombre,
              codigo: payload.codigo,
              tipo: payload.tipo,
              area_m2: payload.area_m2,
              habitaciones: payload.habitaciones,
              banos: payload.banos,
              parqueaderos: payload.parqueaderos,
              precio: payload.precio,
              tipologia_id: tip.id,
              estado: 'disponible',
              publicado: true
            });
            if (ins.error) throw new Error(ins.error.message);
          }
        }
      }
      count++;
    }

    if (typeof ViviendasSyncEngine !== 'undefined' && ViviendasSyncEngine.bindFromUrl) {
      try {
        await ViviendasSyncEngine.bindFromUrl(state, { preferDraft: false });
      } catch (e2) {}
    }

    return { count: count };
  }

  return {
    loadAmenidadesCatalog: loadAmenidadesCatalog,
    bindFromProject: bindFromProject,
    saveDraft: saveDraft,
    apply: apply,
    detectConflicts: detectConflicts,
    syncViviendasFromTipologias: syncViviendasFromTipologias
  };
})();
