try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/interactive-areas/interactive-areas-core.js');}catch(_e){}
/**
 * Interactive Areas — mock lab core (no Supabase).
 * Shared by BOXIES Interactivo (editor) and Showroom Áreas (readonly).
 */
var InteractiveAreasCore = (function () {
  var MOCK_IMAGE_REL = 'assets/interactive/mock-masterplan.svg';

  function resolveAsset(path) {
    if (!path) return path;
    if (/^(https?:|data:|blob:|\/)/i.test(path) || path.indexOf('../') === 0) return path;
    var loc = (typeof location !== 'undefined' && location.pathname) || '';
    if (/\/(admin|boxies)(\/|$)/i.test(loc)) return '../' + path;
    return path;
  }

  var MOCK_IMAGE = resolveAsset(MOCK_IMAGE_REL);

  var DEFAULT_TREE = [
    {
      id: 'area-master',
      name: 'Masterplan',
      imageUrl: MOCK_IMAGE_REL,
      zones: [
        {
          id: 'zone-ta',
          label: 'Torre A',
          points: [
            { x: 10, y: 12.5 },
            { x: 45, y: 12.5 },
            { x: 45, y: 42.5 },
            { x: 10, y: 42.5 }
          ],
          unit: {
            name: 'Torre A',
            area: '12.400 m²',
            status: 'Preventa',
            bedrooms: '—',
            bathrooms: '—'
          }
        },
        {
          id: 'zone-tb',
          label: 'Torre B',
          points: [
            { x: 55, y: 12.5 },
            { x: 90, y: 12.5 },
            { x: 90, y: 42.5 },
            { x: 55, y: 42.5 }
          ],
          unit: {
            name: 'Torre B',
            area: '11.800 m²',
            status: 'Preventa',
            bedrooms: '—',
            bathrooms: '—'
          }
        }
      ],
      children: [
        {
          id: 'area-ta',
          name: 'Torre A',
          imageUrl: MOCK_IMAGE_REL,
          zones: [],
          children: [
            { id: 'area-ta-p1', name: 'Piso 1', imageUrl: MOCK_IMAGE_REL, zones: [], children: [] },
            { id: 'area-ta-p2', name: 'Piso 2', imageUrl: MOCK_IMAGE_REL, zones: [], children: [] },
            { id: 'area-ta-p3', name: 'Piso 3', imageUrl: MOCK_IMAGE_REL, zones: [], children: [] }
          ]
        },
        {
          id: 'area-tb',
          name: 'Torre B',
          imageUrl: MOCK_IMAGE_REL,
          zones: [],
          children: [
            { id: 'area-tb-p1', name: 'Piso 1', imageUrl: MOCK_IMAGE_REL, zones: [], children: [] }
          ]
        }
      ]
    }
  ];

  var uidSeq = 0;
  function uid(prefix) {
    uidSeq += 1;
    return (prefix || 'ia') + '-' + Date.now().toString(36) + '-' + uidSeq;
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function createLabState() {
    return {
      tree: clone(DEFAULT_TREE),
      selectedAreaId: 'area-master',
      selectedZoneId: null,
      previewMode: false
    };
  }

  function findArea(tree, id) {
    var found = null;
    function walk(nodes) {
      (nodes || []).forEach(function (n) {
        if (n.id === id) found = n;
        if (!found && n.children) walk(n.children);
      });
    }
    walk(tree);
    return found;
  }

  function findZone(area, zoneId) {
    if (!area || !area.zones) return null;
    for (var i = 0; i < area.zones.length; i++) {
      if (area.zones[i].id === zoneId) return area.zones[i];
    }
    return null;
  }

  function addArea(state, parentId, name) {
    var node = {
      id: uid('area'),
      name: name || 'Nueva Área',
      imageUrl: MOCK_IMAGE_REL,
      zones: [],
      children: []
    };
    if (!parentId) {
      state.tree.push(node);
    } else {
      var parent = findArea(state.tree, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        state.tree.push(node);
      }
    }
    state.selectedAreaId = node.id;
    state.selectedZoneId = null;
    return node;
  }

  function addZone(area, points, label) {
    if (!area) return null;
    if (!area.zones) area.zones = [];
    var zone = {
      id: uid('zone'),
      label: label || ('Zona ' + (area.zones.length + 1)),
      points: clone(points || []),
      unit: {
        name: label || ('Unidad ' + (area.zones.length + 1)),
        area: '85 m²',
        status: 'Disponible',
        bedrooms: '2',
        bathrooms: '2'
      }
    };
    area.zones.push(zone);
    return zone;
  }

  function pointInPolygon(px, py, points) {
    var inside = false;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var xi = points[i].x;
      var yi = points[i].y;
      var xj = points[j].x;
      var yj = points[j].y;
      var intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function hitTestZone(area, pctX, pctY) {
    if (!area || !area.zones) return null;
    for (var i = area.zones.length - 1; i >= 0; i--) {
      var z = area.zones[i];
      if (z.points && z.points.length >= 3 && pointInPolygon(pctX, pctY, z.points)) {
        return z;
      }
    }
    return null;
  }

  function nearVertex(points, pctX, pctY, threshold) {
    threshold = threshold == null ? 2.2 : threshold;
    for (var i = 0; i < points.length; i++) {
      var dx = points[i].x - pctX;
      var dy = points[i].y - pctY;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) return i;
    }
    return -1;
  }

  return {
    MOCK_IMAGE: MOCK_IMAGE,
    MOCK_IMAGE_REL: MOCK_IMAGE_REL,
    resolveAsset: resolveAsset,
    createLabState: createLabState,
    clone: clone,
    uid: uid,
    findArea: findArea,
    findZone: findZone,
    addArea: addArea,
    addZone: addZone,
    pointInPolygon: pointInPolygon,
    hitTestZone: hitTestZone,
    nearVertex: nearVertex
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/interactive-areas/interactive-areas-core.js');}catch(_e){}
