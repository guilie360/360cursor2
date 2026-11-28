/* BOXIES V6.5.00 — Structure entity resolver + smart hotspot cards.
 * Estructura is SSOT. Hotspots store only entityId + entityType (+ presentation prefs). */
var EstructuraEntity = (function () {
  var ENTITY_TYPES = {
    tipologia: true,
    planta: true,
    ambiente: true
  };

  var TEMPLATES = {
    compacta: { id: 'compacta', label: 'Compacta' },
    completa: { id: 'completa', label: 'Completa' },
    ficha: { id: 'ficha', label: 'Ficha Técnica' },
    premium: { id: 'premium', label: 'Premium' }
  };

  var DEFAULT_FIELDS = {
    nombre: true,
    producto: true,
    modelo: true,
    area: true,
    area_lote: true,
    habitaciones: true,
    banos: true,
    parqueaderos: true,
    plantas: true,
    precio: true,
    imagen: true,
    descripcion: true,
    ambientes: true,
    galeria: true,
    pano360: true
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureEstructura(state) {
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.ensureState) {
      return EstructuraEngine.ensureState(state);
    }
    if (!state.estructura || typeof state.estructura !== 'object') state.estructura = {};
    if (!Array.isArray(state.estructura.tipologias)) state.estructura.tipologias = [];
    return state.estructura;
  }

  function projectName(state) {
    var info = (state && state.projectInfo) || {};
    return info.nombre || info.name || info.title || 'Proyecto';
  }

  function productLabel(productoId) {
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.productLabel) {
      return EstructuraEngine.productLabel(productoId) || String(productoId || 'Producto');
    }
    return String(productoId || 'Producto');
  }

  function tipDisplayName(tip) {
    if (!tip) return 'Modelo';
    return tip.nombre || tip.modelo || ('Modelo ' + (tip.localId || ''));
  }

  function defaultCardFields() {
    var out = {};
    Object.keys(DEFAULT_FIELDS).forEach(function (k) { out[k] = DEFAULT_FIELDS[k]; });
    return out;
  }

  function normalizeCardFields(raw) {
    var out = defaultCardFields();
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(out).forEach(function (k) {
      if (raw[k] != null) out[k] = !!raw[k];
    });
    return out;
  }

  function findTipologia(state, entityId) {
    var e = ensureEstructura(state);
    var id = String(entityId);
    return (e.tipologias || []).find(function (t) {
      return t && (String(t.localId) === id || (t.id != null && String(t.id) === id));
    }) || null;
  }

  function findPlanta(state, entityId) {
    var e = ensureEstructura(state);
    var id = String(entityId);
    var tips = e.tipologias || [];
    for (var i = 0; i < tips.length; i++) {
      var tip = tips[i];
      var plantas = tip.plantas || [];
      for (var j = 0; j < plantas.length; j++) {
        var p = plantas[j];
        if (p && (String(p.localId) === id || (p.id != null && String(p.id) === id))) {
          return { planta: p, tip: tip };
        }
      }
    }
    return null;
  }

  function findAmbiente(state, entityId) {
    var e = ensureEstructura(state);
    var id = String(entityId);
    var tips = e.tipologias || [];
    for (var i = 0; i < tips.length; i++) {
      var tip = tips[i];
      var ambs = tip.ambientes || [];
      for (var j = 0; j < ambs.length; j++) {
        var a = ambs[j];
        if (a && (String(a.localId) === id || (a.id != null && String(a.id) === id))) {
          var planta = null;
          if (a.plantaLocalId) {
            planta = (tip.plantas || []).find(function (p) {
              return p && String(p.localId) === String(a.plantaLocalId);
            }) || null;
          }
          return { ambiente: a, tip: tip, planta: planta };
        }
      }
    }
    return null;
  }

  /**
   * Resolve live entity from Estructura. Never reads duplicated hotspot payload fields.
   */
  function resolve(state, entityId, entityType) {
    if (!entityId || !entityType || !ENTITY_TYPES[entityType]) {
      return { ok: false, missing: true, entityId: entityId || null, entityType: entityType || null };
    }
    if (entityType === 'tipologia') {
      var tip = findTipologia(state, entityId);
      if (!tip) {
        return { ok: false, missing: true, entityId: entityId, entityType: entityType };
      }
      return {
        ok: true,
        missing: false,
        entityId: String(tip.localId || tip.id),
        entityType: 'tipologia',
        tip: tip,
        label: tipDisplayName(tip),
        productId: tip.producto,
        productLabel: productLabel(tip.producto),
        modelo: tip.modelo || '',
        area_m2: tip.area_m2,
        area_lote_m2: tip.area_lote_m2,
        habitaciones: tip.habitaciones,
        banos: tip.banos,
        parqueaderos: tip.parqueaderos,
        plantas_internas: tip.plantas_internas,
        precio: tip.precio,
        node_id: tip.node_id || null,
        plantas: (tip.plantas || []).slice(),
        ambientes: (tip.ambientes || []).slice()
      };
    }
    if (entityType === 'planta') {
      var hit = findPlanta(state, entityId);
      if (!hit) {
        return { ok: false, missing: true, entityId: entityId, entityType: entityType };
      }
      var ambs = (hit.tip.ambientes || []).filter(function (a) {
        return a && String(a.plantaLocalId) === String(hit.planta.localId);
      });
      return {
        ok: true,
        missing: false,
        entityId: String(hit.planta.localId || hit.planta.id),
        entityType: 'planta',
        tip: hit.tip,
        planta: hit.planta,
        label: hit.planta.nombre || ('Planta ' + (hit.planta.orden || '')),
        ambientes: ambs,
        area_m2: hit.tip.area_m2,
        tipLabel: tipDisplayName(hit.tip)
      };
    }
    if (entityType === 'ambiente') {
      var ambHit = findAmbiente(state, entityId);
      if (!ambHit) {
        return { ok: false, missing: true, entityId: entityId, entityType: entityType };
      }
      return {
        ok: true,
        missing: false,
        entityId: String(ambHit.ambiente.localId || ambHit.ambiente.id),
        entityType: 'ambiente',
        tip: ambHit.tip,
        planta: ambHit.planta,
        ambiente: ambHit.ambiente,
        label: ambHit.ambiente.nombre || 'Ambiente',
        tipo: ambHit.ambiente.tipo || ambHit.ambiente.nombre || 'Ambiente',
        descripcion: ambHit.ambiente.descripcion || '',
        tipLabel: tipDisplayName(ambHit.tip),
        plantaLabel: ambHit.planta
          ? (ambHit.planta.nombre || ('Planta ' + (ambHit.planta.orden || '')))
          : null
      };
    }
    return { ok: false, missing: true, entityId: entityId, entityType: entityType };
  }

  function resolveFromHotspot(state, ix) {
    if (!ix) return { ok: false, missing: true };
    var mode = ix.contentMode || 'structure';
    if (mode === 'custom') {
      return {
        ok: true,
        missing: false,
        custom: true,
        entityType: 'custom',
        label: ix.name || ix.label || 'Hotspot'
      };
    }
    var entityId = ix.entityId || null;
    var entityType = ix.entityType || null;
    /* Migrate legacy structure* refs without copying payload */
    if (!entityId && ix.structureId) {
      entityId = ix.structureId;
      var kind = String(ix.structureKind || '').toLowerCase();
      if (kind.indexOf('ambiente') >= 0 || kind === 'room') entityType = 'ambiente';
      else if (kind.indexOf('planta') >= 0 || kind === 'floor' || kind === 'nivel') entityType = 'planta';
      else entityType = entityType || 'tipologia';
    }
    return resolve(state, entityId, entityType);
  }

  function mediaImageForTip(state, tip) {
    if (!tip || !tip.node_id) return null;
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.findNode) {
      var node = MediaNodesEngine.findNode(state, tip.node_id);
      if (node) {
        return node.thumbnailUrl || node.publicUrl || node.coverUrl ||
          (node.assets && node.assets[0] && (node.assets[0].thumbnailUrl || node.assets[0].publicUrl)) ||
          null;
      }
    }
    var byId = (state.projectAssets && state.projectAssets.byId) || {};
    var asset = byId[String(tip.node_id)];
    if (asset) return asset.thumbnailUrl || asset.publicUrl || null;
    return null;
  }

  /**
   * Hierarchical children for picker. path = [{type, id, label}, ...]
   * Types: project → product → tipologia → planta → ambiente
   */
  function listPickerChildren(state, path) {
    path = path || [];
    var e = ensureEstructura(state);
    var tips = e.tipologias || [];
    var depth = path.length;

    if (depth === 0) {
      return [{
        type: 'project',
        id: 'project',
        label: projectName(state),
        linkable: false
      }];
    }

    var last = path[path.length - 1];

    if (last.type === 'project') {
      var byProd = {};
      tips.forEach(function (t) {
        if (!t) return;
        var pid = t.producto || 'otros';
        if (!byProd[pid]) {
          byProd[pid] = {
            type: 'product',
            id: pid,
            label: productLabel(pid),
            linkable: false
          };
        }
      });
      return Object.keys(byProd).map(function (k) { return byProd[k]; });
    }

    if (last.type === 'product') {
      return tips.filter(function (t) {
        return t && String(t.producto || 'otros') === String(last.id);
      }).map(function (t) {
        return {
          type: 'tipologia',
          id: String(t.localId || t.id),
          label: tipDisplayName(t),
          linkable: true,
          entityType: 'tipologia',
          entityId: String(t.localId || t.id)
        };
      });
    }

    if (last.type === 'tipologia') {
      var tip = findTipologia(state, last.id);
      if (!tip) return [];
      return (tip.plantas || []).map(function (p) {
        return {
          type: 'planta',
          id: String(p.localId || p.id),
          label: p.nombre || ('Planta ' + (p.orden || '')),
          linkable: true,
          entityType: 'planta',
          entityId: String(p.localId || p.id),
          tipId: String(tip.localId || tip.id)
        };
      });
    }

    if (last.type === 'planta') {
      var plantHit = findPlanta(state, last.id);
      if (!plantHit) return [];
      return (plantHit.tip.ambientes || []).filter(function (a) {
        return a && String(a.plantaLocalId) === String(plantHit.planta.localId);
      }).map(function (a) {
        return {
          type: 'ambiente',
          id: String(a.localId || a.id),
          label: a.nombre || 'Ambiente',
          linkable: true,
          entityType: 'ambiente',
          entityId: String(a.localId || a.id)
        };
      });
    }

    return [];
  }

  function breadcrumbFromEntity(state, entityId, entityType) {
    var resolved = resolve(state, entityId, entityType);
    if (!resolved.ok) return [{ type: 'project', id: 'project', label: projectName(state) }];
    var crumbs = [{ type: 'project', id: 'project', label: projectName(state) }];
    var tip = resolved.tip;
    if (tip) {
      crumbs.push({
        type: 'product',
        id: tip.producto || 'otros',
        label: productLabel(tip.producto)
      });
      crumbs.push({
        type: 'tipologia',
        id: String(tip.localId || tip.id),
        label: tipDisplayName(tip),
        linkable: true,
        entityType: 'tipologia',
        entityId: String(tip.localId || tip.id)
      });
    }
    if (entityType === 'planta' || entityType === 'ambiente') {
      var planta = resolved.planta;
      if (planta) {
        crumbs.push({
          type: 'planta',
          id: String(planta.localId || planta.id),
          label: planta.nombre || ('Planta ' + (planta.orden || '')),
          linkable: true,
          entityType: 'planta',
          entityId: String(planta.localId || planta.id)
        });
      }
    }
    if (entityType === 'ambiente' && resolved.ambiente) {
      crumbs.push({
        type: 'ambiente',
        id: String(resolved.ambiente.localId || resolved.ambiente.id),
        label: resolved.ambiente.nombre || 'Ambiente',
        linkable: true,
        entityType: 'ambiente',
        entityId: String(resolved.ambiente.localId || resolved.ambiente.id)
      });
    }
    return crumbs;
  }

  function formatArea(v) {
    if (v == null || v === '' || isNaN(Number(v))) return null;
    return Number(v).toLocaleString('es-CO') + ' m²';
  }

  function formatPrice(v) {
    if (v == null || v === '' || !(Number(v) > 0)) return null;
    return 'Desde $' + Number(v).toLocaleString('es-CO');
  }

  function fieldOn(fields, key) {
    return !fields || fields[key] !== false;
  }

  function buildCardModel(state, ix) {
    var fields = normalizeCardFields(ix && ix.cardFields);
    var template = (ix && ix.cardTemplate) || 'completa';
    if (!TEMPLATES[template]) template = 'completa';
    var resolved = resolveFromHotspot(state, ix);

    if (resolved.custom) {
      return {
        ok: true,
        missing: false,
        custom: true,
        template: template,
        title: resolved.label,
        rows: [],
        actions: []
      };
    }

    if (!resolved.ok || resolved.missing) {
      return {
        ok: false,
        missing: true,
        template: template,
        title: 'Referencia rota',
        message: 'Este hotspot apunta a un elemento que ya no existe.',
        entityId: resolved.entityId,
        entityType: resolved.entityType
      };
    }

    var rows = [];
    var actions = [];
    var imageUrl = null;
    var title = resolved.label;

    if (resolved.entityType === 'tipologia') {
      if (fieldOn(fields, 'producto') && resolved.productLabel) {
        rows.push({ key: 'producto', label: 'Producto', value: resolved.productLabel });
      }
      if (fieldOn(fields, 'modelo') && resolved.modelo) {
        rows.push({ key: 'modelo', label: 'Modelo', value: resolved.modelo });
      }
      if (fieldOn(fields, 'area')) {
        var area = formatArea(resolved.area_m2);
        if (area) rows.push({ key: 'area', label: 'Área construida', value: area });
      }
      if (fieldOn(fields, 'area_lote')) {
        var lote = formatArea(resolved.area_lote_m2);
        if (lote) rows.push({ key: 'area_lote', label: 'Área de lote', value: lote });
      }
      if (fieldOn(fields, 'habitaciones') && resolved.habitaciones != null) {
        rows.push({ key: 'habitaciones', label: 'Habitaciones', value: String(resolved.habitaciones) });
      }
      if (fieldOn(fields, 'banos') && resolved.banos != null) {
        rows.push({ key: 'banos', label: 'Baños', value: String(resolved.banos) });
      }
      if (fieldOn(fields, 'parqueaderos') && resolved.parqueaderos != null) {
        rows.push({ key: 'parqueaderos', label: 'Parqueaderos', value: String(resolved.parqueaderos) });
      }
      if (fieldOn(fields, 'plantas') && resolved.plantas_internas != null) {
        rows.push({ key: 'plantas', label: 'Plantas', value: String(resolved.plantas_internas) });
      }
      if (fieldOn(fields, 'precio')) {
        var price = formatPrice(resolved.precio);
        if (price) rows.push({ key: 'precio', label: 'Precio', value: price });
      }
      if (fieldOn(fields, 'imagen')) {
        imageUrl = mediaImageForTip(state, resolved.tip);
      }
      actions.push({ id: 'explore', label: 'Explorar' });
    } else if (resolved.entityType === 'planta') {
      rows.push({ key: 'tipologia', label: 'Modelo', value: resolved.tipLabel || '' });
      if (fieldOn(fields, 'ambientes')) {
        rows.push({
          key: 'ambientes_count',
          label: 'Ambientes',
          value: String((resolved.ambientes || []).length)
        });
        (resolved.ambientes || []).forEach(function (a) {
          rows.push({
            key: 'amb:' + (a.localId || a.nombre),
            label: '',
            value: a.nombre || 'Ambiente',
            muted: true
          });
        });
      }
      if (fieldOn(fields, 'area')) {
        var areaP = formatArea(resolved.area_m2);
        if (areaP) rows.push({ key: 'area', label: 'Área', value: areaP });
      }
      if (fieldOn(fields, 'imagen')) {
        imageUrl = mediaImageForTip(state, resolved.tip);
      }
    } else if (resolved.entityType === 'ambiente') {
      if (fieldOn(fields, 'nombre')) {
        rows.push({ key: 'tipo', label: 'Tipo', value: resolved.tipo || resolved.label });
      }
      if (resolved.plantaLabel) {
        rows.push({ key: 'planta', label: 'Nivel', value: resolved.plantaLabel });
      }
      if (fieldOn(fields, 'descripcion') && resolved.descripcion) {
        rows.push({ key: 'descripcion', label: 'Descripción', value: resolved.descripcion });
      }
      if (fieldOn(fields, 'galeria')) {
        rows.push({ key: 'galeria', label: 'Galería', value: 'Disponible en Media' });
      }
      if (fieldOn(fields, 'pano360')) {
        rows.push({ key: 'pano360', label: '360', value: 'Disponible' });
      }
      actions.push({ id: 'enter', label: 'Entrar' });
    }

    if (template === 'compacta') {
      rows = rows.filter(function (r) {
        return r.key === 'area' || r.key === 'precio' || r.key === 'habitaciones' ||
          r.key === 'producto' || r.key === 'tipo' || r.key === 'ambientes_count';
      }).slice(0, 4);
    } else if (template === 'ficha') {
      /* technical: keep numeric / meta, drop muted list items */
      rows = rows.filter(function (r) { return !r.muted; });
    }

    return {
      ok: true,
      missing: false,
      entityType: resolved.entityType,
      entityId: resolved.entityId,
      template: template,
      title: title,
      imageUrl: imageUrl,
      rows: rows,
      actions: actions,
      fields: fields
    };
  }

  function renderCardHtml(card) {
    if (!card) return '';
    if (card.missing) {
      return '<div class="boxies-smart-card is-missing is-tpl-' + esc(card.template || 'completa') + '">' +
        '<div class="boxies-smart-card__title">' + esc(card.title) + '</div>' +
        '<p class="boxies-smart-card__warn">' + esc(card.message || '') + '</p>' +
        '<button type="button" class="boxies-smart-card__btn" data-smart-reselect>Seleccionar otro elemento</button>' +
        '<button type="button" class="boxies-smart-card__close" data-smart-close aria-label="Cerrar">×</button>' +
      '</div>';
    }
    var cls = 'boxies-smart-card is-tpl-' + esc(card.template || 'completa') +
      (card.custom ? ' is-custom' : '');
    var html = '<div class="' + cls + '" data-smart-card="1">' +
      '<button type="button" class="boxies-smart-card__close" data-smart-close aria-label="Cerrar">×</button>';
    if (card.imageUrl && card.template !== 'compacta') {
      html += '<div class="boxies-smart-card__media" style="background-image:url(\'' +
        esc(String(card.imageUrl).replace(/'/g, '%27')) + '\')"></div>';
    }
    html += '<div class="boxies-smart-card__body">' +
      '<div class="boxies-smart-card__title">' + esc(card.title) + '</div>';
    if (card.rows && card.rows.length) {
      html += '<dl class="boxies-smart-card__rows">';
      card.rows.forEach(function (r) {
        if (r.muted) {
          html += '<div class="boxies-smart-card__row is-muted"><dd>' + esc(r.value) + '</dd></div>';
        } else if (r.label) {
          html += '<div class="boxies-smart-card__row">' +
            '<dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>';
        } else {
          html += '<div class="boxies-smart-card__row"><dd>' + esc(r.value) + '</dd></div>';
        }
      });
      html += '</dl>';
    }
    if (card.actions && card.actions.length) {
      html += '<div class="boxies-smart-card__actions">';
      card.actions.forEach(function (a) {
        html += '<button type="button" class="boxies-smart-card__btn" data-smart-action="' +
          esc(a.id) + '">' + esc(a.label) + '</button>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function fieldTogglesForType(entityType) {
    if (entityType === 'tipologia') {
      return [
        { key: 'area', label: 'Área' },
        { key: 'precio', label: 'Precio' },
        { key: 'habitaciones', label: 'Habitaciones' },
        { key: 'banos', label: 'Baños' },
        { key: 'parqueaderos', label: 'Parqueaderos' },
        { key: 'area_lote', label: 'Área de lote' },
        { key: 'plantas', label: 'Plantas' },
        { key: 'imagen', label: 'Imagen' }
      ];
    }
    if (entityType === 'planta') {
      return [
        { key: 'area', label: 'Área' },
        { key: 'ambientes', label: 'Lista de ambientes' },
        { key: 'imagen', label: 'Imagen de planta' }
      ];
    }
    if (entityType === 'ambiente') {
      return [
        { key: 'descripcion', label: 'Descripción' },
        { key: 'galeria', label: 'Galería' },
        { key: 'pano360', label: '360 disponible' }
      ];
    }
    return [];
  }

  return {
    ENTITY_TYPES: ENTITY_TYPES,
    TEMPLATES: TEMPLATES,
    DEFAULT_FIELDS: DEFAULT_FIELDS,
    defaultCardFields: defaultCardFields,
    normalizeCardFields: normalizeCardFields,
    resolve: resolve,
    resolveFromHotspot: resolveFromHotspot,
    listPickerChildren: listPickerChildren,
    breadcrumbFromEntity: breadcrumbFromEntity,
    buildCardModel: buildCardModel,
    renderCardHtml: renderCardHtml,
    fieldTogglesForType: fieldTogglesForType,
    projectName: projectName,
    tipDisplayName: tipDisplayName
  };
})();
