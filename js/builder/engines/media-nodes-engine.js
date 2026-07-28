/* BOXIES V5.9.72 — Canvas nodes = SSOT; Media assets belong to node_id
 *
 * Call graph (no mutual recursion):
 *   ensureNodeIds(state)     → stamp node_id / normalize only
 *   listCompatibleNodes(state) → read + return array only
 *   findNode(state, node_id) → search inside listCompatibleNodes()
 *   render…                 → ensureNodeIds() then listCompatibleNodes()
 */
var MediaNodesEngine = (function () {
  /**
   * Canonical media categories (path segment under projects/{id}/).
   * Tours never use Bunny.
   */
  var MEDIA_CATEGORIES = [
    { key: 'images', label: 'Imágenes', folder: 'images', mode: 'upload', assetType: 'image', accept: 'image/*' },
    { key: 'videos', label: 'Videos / Animaciones', folder: 'videos', mode: 'upload', assetType: 'video', accept: 'video/*,image/gif,image/webp', aliases: ['animations'] },
    { key: 'plans2d', label: 'Planos 2D', folder: 'plans2d', mode: 'upload', assetType: 'plan', accept: 'image/*,application/pdf', planKind: '2d', aliases: ['plans-2d', 'floorplans'] },
    { key: 'plans3d', label: 'Planos 3D', folder: 'plans3d', mode: 'upload', assetType: 'plan', accept: 'image/*,model/*,.glb,.gltf', planKind: '3d', aliases: ['plans-3d'] },
    { key: 'tours360', label: 'Tours 360', folder: null, mode: 'tours', assetType: 'pano360', accept: null },
    { key: 'documents', label: 'Documentos', folder: 'documents', mode: 'upload', assetType: 'document', accept: '.pdf,.doc,.docx,image/*' },
    { key: 'ui', label: 'Recursos UI', folder: 'ui', mode: 'upload', assetType: 'image', accept: 'image/*,.svg,image/svg+xml', uiRole: true }
  ];

  function slugZone(name) {
    return String(name || '')
      .normalize('NFKD')
      .replace(/[^\w\s\-]+/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'zona';
  }

  function tipLabel(tip, index) {
    if (!tip) return 'Tipología ' + (index + 1);
    return tip.nombre || tip.modelo || tip.producto || tip.componente ||
      ('Tipología ' + (index + 1));
  }

  function getCategory(key) {
    for (var i = 0; i < MEDIA_CATEGORIES.length; i++) {
      if (MEDIA_CATEGORIES[i].key === key) return MEDIA_CATEGORIES[i];
      var al = MEDIA_CATEGORIES[i].aliases || [];
      if (al.indexOf(key) !== -1) return MEDIA_CATEGORIES[i];
    }
    return null;
  }

  function normalizeCategoryKey(key) {
    if (key === 'animations') return 'videos';
    var c = getCategory(key);
    return c ? c.key : (key || 'images');
  }

  /**
   * Stamp missing node_id + normalize zoneNodes from zoneNames.
   * Does not list, render, or call other Media APIs.
   */
  function ensureNodeIds(state) {
    if (!state) return;
    if (typeof EstructuraEngine !== 'undefined' && EstructuraEngine.ensureState) {
      EstructuraEngine.ensureState(state);
    }
    var e = state.estructura;
    if (!e) return;

    if (!Array.isArray(e.tipologias)) e.tipologias = [];
    e.tipologias.forEach(function (tip, i) {
      if (!tip) return;
      if (!tip.node_id) {
        tip.node_id = tip.id || tip.localId || ('tip-' + i + '-' + Date.now().toString(36));
      }
    });

    if (!Array.isArray(e.zoneNodes)) e.zoneNodes = [];
    if (!Array.isArray(e.zoneNames)) e.zoneNames = [];

    var byName = {};
    e.zoneNodes.forEach(function (z) {
      if (z && z.nombre) byName[String(z.nombre).toLowerCase()] = z;
    });
    var nextZones = [];
    e.zoneNames.forEach(function (name) {
      var n = String(name || '').trim();
      if (!n) return;
      var prev = byName[n.toLowerCase()];
      if (prev) {
        if (!prev.node_id) prev.node_id = 'zona:' + slugZone(n);
        prev.nombre = n;
        nextZones.push(prev);
      } else {
        nextZones.push({
          node_id: 'zona:' + slugZone(n),
          nombre: n,
          tipo: 'zona',
          origen: 'estructura'
        });
      }
    });
    e.zoneNodes = nextZones;
  }

  /**
   * Read-only projection of Canvas nodes for Media.
   * Does not mutate state and does not call ensureNodeIds.
   */
  function listCompatibleNodes(state) {
    var e = state && state.estructura;
    if (!e) return [];
    var out = [];
    (e.tipologias || []).forEach(function (tip, i) {
      if (!tip || !tip.node_id) return;
      out.push({
        node_id: tip.node_id,
        kind: 'tipologia',
        tipo: 'tipologia',
        label: tipLabel(tip, i),
        nombre: tipLabel(tip, i),
        estructura_id: tip.id || tip.localId || tip.node_id,
        entityRef: {
          type: 'tipologia',
          key: String(tip.id || tip.localId || tip.node_id),
          localId: tip.localId || null,
          node_id: tip.node_id
        },
        orden: i
      });
    });
    (e.zoneNodes || []).forEach(function (z, i) {
      if (!z || !z.node_id) return;
      out.push({
        node_id: z.node_id,
        kind: 'zona',
        tipo: 'zona',
        label: z.nombre,
        nombre: z.nombre,
        estructura_id: z.node_id,
        entityRef: { type: 'amenidad', key: z.nombre, node_id: z.node_id },
        orden: 1000 + i
      });
    });
    return out;
  }

  /** Lookup one node by node_id inside listCompatibleNodes(). */
  function findNode(state, nodeId) {
    if (!nodeId) return null;
    var list = listCompatibleNodes(state);
    for (var i = 0; i < list.length; i++) {
      if (list[i].node_id === nodeId) return list[i];
    }
    return null;
  }

  function assetCategory(a) {
    if (!a) return null;
    if (a.category) return normalizeCategoryKey(a.category);
    if (a.provider === 'lapentor' || a.type === 'pano360') return 'tours360';
    if (a.type === 'video') return 'videos';
    if (a.type === 'document') return 'documents';
    if (a.type === 'plan') {
      if (a.planKind === '3d' || (a.storagePath && a.storagePath.indexOf('/plans3d/') !== -1)) return 'plans3d';
      return 'plans2d';
    }
    if (a.uiRole || (a.storagePath && a.storagePath.indexOf('/ui/') !== -1)) return 'ui';
    return 'images';
  }

  function assetsForNode(state, nodeId, categoryKey) {
    if (!state || !nodeId || typeof ExperienciaEngine === 'undefined') return [];
    var want = categoryKey ? normalizeCategoryKey(categoryKey) : null;
    var all = ExperienciaEngine.listProjectAssets(state) || [];
    return all.filter(function (a) {
      if (!a || a.nodeId !== nodeId) return false;
      if (a.orphan) return false;
      if (!want) return true;
      return assetCategory(a) === want;
    }).sort(function (a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }

  function countForNode(state, nodeId, categoryKey) {
    return assetsForNode(state, nodeId, categoryKey).length;
  }

  /**
   * Status: ok | warn | missing
   * Tours: ok if URL; warn if empty; images/videos: ok if >=1; plans: ok if >=1 else missing
   */
  function categoryStatus(state, nodeId, categoryKey) {
    var n = countForNode(state, nodeId, categoryKey);
    var cat = getCategory(categoryKey);
    if (cat && cat.mode === 'tours') {
      var tours = assetsForNode(state, nodeId, 'tours360');
      var hasUrl = tours.some(function (a) { return a.publicUrl && String(a.publicUrl).trim(); });
      if (hasUrl) return { level: 'ok', count: tours.length, label: tours.length + ' tour' + (tours.length === 1 ? '' : 's') };
      return { level: 'warn', count: 0, label: 'Sin Tour 360' };
    }
    if (n > 0) {
      var okLabel = n + ' archivo' + (n === 1 ? '' : 's');
      if (categoryKey === 'videos') okLabel = n + (n === 1 ? ' video' : ' videos');
      else if (categoryKey === 'images') okLabel = n + (n === 1 ? ' imagen' : ' imágenes');
      else if (categoryKey === 'plans2d') okLabel = 'Plano 2D';
      else if (categoryKey === 'plans3d') okLabel = 'Plano 3D';
      else if (categoryKey === 'ui') okLabel = n + (n === 1 ? ' recurso UI' : ' recursos UI');
      return { level: 'ok', count: n, label: okLabel };
    }
    if (categoryKey === 'plans2d') return { level: 'missing', count: 0, label: 'Sin Plano 2D' };
    if (categoryKey === 'plans3d') return { level: 'missing', count: 0, label: 'Sin Plano 3D' };
    return { level: 'missing', count: 0, label: 'Sin ' + ((cat && cat.label) || categoryKey) };
  }

  function nodeStatusSummary(state, nodeId) {
    return MEDIA_CATEGORIES.map(function (c) {
      var st = categoryStatus(state, nodeId, c.key);
      return {
        key: c.key,
        label: c.label,
        level: st.level,
        count: st.count,
        text: st.label
      };
    });
  }

  function listAssetsForNode(state, nodeId) {
    return assetsForNode(state, nodeId, null);
  }

  function detachAssets(state, nodeId) {
    if (!state || !nodeId || typeof ExperienciaEngine === 'undefined') return 0;
    var n = 0;
    var all = ExperienciaEngine.listProjectAssets(state) || [];
    all.forEach(function (a) {
      if (a && a.nodeId === nodeId) {
        a.orphan = true;
        a.nodeIdPrev = a.nodeId;
        a.nodeId = null;
        a.updatedAt = new Date().toISOString();
        n++;
      }
    });
    return n;
  }

  function collectAssetIdsForNode(state, nodeId) {
    return listAssetsForNode(state, nodeId).map(function (a) {
      return { assetId: a.id, archivoId: a.archivoId || null, provider: a.provider, storagePath: a.storagePath };
    });
  }

  function removeAssetsFromLibrary(state, nodeId) {
    if (!state || !nodeId || !state.projectAssets || !state.projectAssets.byId) return [];
    var removed = [];
    Object.keys(state.projectAssets.byId).forEach(function (id) {
      var a = state.projectAssets.byId[id];
      if (a && a.nodeId === nodeId) {
        removed.push(a);
        delete state.projectAssets.byId[id];
      }
    });
    return removed;
  }

  function makeAssetPartial(opts) {
    opts = opts || {};
    var cat = normalizeCategoryKey(opts.category || 'images');
    var meta = getCategory(cat) || MEDIA_CATEGORIES[0];
    return {
      id: opts.id || null,
      type: meta.assetType || 'image',
      category: cat,
      filename: opts.filename || null,
      provider: opts.provider || 'bunny',
      storagePath: opts.storagePath || null,
      publicUrl: opts.publicUrl || null,
      thumbnailUrl: opts.thumbnailUrl || opts.publicUrl || null,
      status: opts.status || 'synced',
      archivoId: opts.archivoId || null,
      nodeId: opts.nodeId || null,
      projectId: opts.projectId || null,
      entityRef: opts.entityRef || null,
      planKind: meta.planKind || null,
      uiRole: !!meta.uiRole,
      metadata: opts.metadata || null,
      sortOrder: opts.sortOrder != null ? opts.sortOrder : 0,
      orphan: false
    };
  }

  /* Legacy API aliases */
  function categoryToAssetType(categoryKey) {
    var c = getCategory(normalizeCategoryKey(categoryKey));
    return (c && c.assetType) || 'image';
  }

  function categoryAcceptsNodeUploads(categoryKey) {
    var c = getCategory(normalizeCategoryKey(categoryKey));
    return !!(c && c.mode === 'upload');
  }

  return {
    MEDIA_CATEGORIES: MEDIA_CATEGORIES,
    getCategory: getCategory,
    normalizeCategoryKey: normalizeCategoryKey,
    ensureNodeIds: ensureNodeIds,
    listCompatibleNodes: listCompatibleNodes,
    findNode: findNode,
    assetsForNode: assetsForNode,
    countForNode: countForNode,
    categoryStatus: categoryStatus,
    nodeStatusSummary: nodeStatusSummary,
    listAssetsForNode: listAssetsForNode,
    detachAssets: detachAssets,
    collectAssetIdsForNode: collectAssetIdsForNode,
    removeAssetsFromLibrary: removeAssetsFromLibrary,
    makeAssetPartial: makeAssetPartial,
    assetCategory: assetCategory,
    categoryToAssetType: categoryToAssetType,
    categoryAcceptsNodeUploads: categoryAcceptsNodeUploads,
    slugZone: slugZone
  };
})();
