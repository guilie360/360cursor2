/* Gallery Engine — image classification, grouping, deduplication */
var GalleryEngine = (function () {
  var CATEGORIES = {
    exterior: { label: 'Exteriores', keywords: ['exterior', 'fachada', 'facade', 'front', 'aerial', 'aereo', 'drone', 'torre', 'building'] },
    interior: { label: 'Interiores', keywords: ['interior', 'sala', 'living', 'comedor', 'dining', 'cocina', 'kitchen', 'habitacion', 'bedroom', 'bano', 'bath'] },
    amenidades: { label: 'Amenidades', keywords: ['amenidad', 'amenity', 'piscina', 'pool', 'gym', 'gimnasio', 'bbq', 'parque', 'park', 'social', 'lobby'] },
    nocturno: { label: 'Renders nocturnos', keywords: ['night', 'nocturno', 'noche', 'evening'] },
    diurno: { label: 'Renders diurnos', keywords: ['day', 'diurno', 'dia', 'morning'] },
    recorrido: { label: 'Recorridos', keywords: ['tour', 'recorrido', 'walkthrough', '360', 'panorama'] },
    masterplan: { label: 'Masterplan', keywords: ['master', 'plano', 'masterplan', 'aerial', 'vista'] },
    otro: { label: 'General', keywords: [] }
  };

  function classifyByName(name) {
    var lower = String(name || '').toLowerCase().replace(/[_-]/g, ' ');
    var scores = {};
    Object.keys(CATEGORIES).forEach(function (key) {
      if (key === 'otro') return;
      scores[key] = CATEGORIES[key].keywords.filter(function (kw) {
        return lower.indexOf(kw) !== -1;
      }).length;
    });
    var best = 'otro';
    var bestScore = 0;
    Object.keys(scores).forEach(function (key) {
      if (scores[key] > bestScore) {
        bestScore = scores[key];
        best = key;
      }
    });
    return best;
  }

  function fileFingerprint(file) {
    return file.name + '-' + file.size + '-' + file.lastModified;
  }

  function isLikelyDuplicate(a, b) {
    if (a.size === b.size && a.name === b.name) return true;
    if (a.size === b.size && Math.abs(a.lastModified - b.lastModified) < 1000) return true;
    return false;
  }

  async function getImageDimensions(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.width, height: img.height, url: url });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0, url: null });
      };
      img.src = url;
    });
  }

  async function processFiles(files, allowedGroups) {
    var seen = {};
    var items = [];
    var duplicatesRemoved = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!file.type || file.type.indexOf('image/') !== 0) continue;

      var fp = fileFingerprint(file);
      if (seen[fp]) {
        duplicatesRemoved++;
        continue;
      }
      seen[fp] = true;

      var dup = items.find(function (item) { return isLikelyDuplicate(item.file, file); });
      if (dup) {
        duplicatesRemoved++;
        continue;
      }

      var dims = await getImageDimensions(file);
      var category = classifyByName(file.name);
      if (allowedGroups && allowedGroups.indexOf(category) === -1 && category !== 'otro') {
        category = allowedGroups[0] || 'otro';
      }

      items.push({
        id: 'img-' + Date.now() + '-' + i,
        file: file,
        name: file.name,
        size: file.size,
        category: category,
        categoryLabel: CATEGORIES[category].label,
        previewUrl: dims.url,
        width: dims.width,
        height: dims.height,
        order: items.length,
        optimized: file.size > 2 * 1024 * 1024
      });
    }

    items.sort(function (a, b) {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

    items.forEach(function (item, idx) { item.order = idx; });

    var groups = {};
    items.forEach(function (item) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    return {
      items: items,
      groups: groups,
      duplicatesRemoved: duplicatesRemoved,
      total: items.length
    };
  }

  function updateItemCategory(items, itemId, newCategory) {
    return items.map(function (item) {
      if (item.id === itemId) {
        return Object.assign({}, item, {
          category: newCategory,
          categoryLabel: CATEGORIES[newCategory] ? CATEGORIES[newCategory].label : newCategory
        });
      }
      return item;
    });
  }

  return {
    CATEGORIES: CATEGORIES,
    classifyByName: classifyByName,
    processFiles: processFiles,
    updateItemCategory: updateItemCategory
  };
})();
