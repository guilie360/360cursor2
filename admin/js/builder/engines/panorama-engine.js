/* 360 Engine — panorama identification and structure */
var PanoramaEngine = (function () {
  var SPACE_PATTERNS = [
    { id: 'sala', label: 'Sala', keywords: ['sala', 'living', 'livingroom', 'salon'] },
    { id: 'comedor', label: 'Comedor', keywords: ['comedor', 'dining', 'diningroom'] },
    { id: 'cocina', label: 'Cocina', keywords: ['cocina', 'kitchen'] },
    { id: 'habitacion-principal', label: 'Habitación Principal', keywords: ['master', 'principal', 'suite', 'habitacion principal', 'masterbedroom'] },
    { id: 'habitacion', label: 'Habitación', keywords: ['habitacion', 'bedroom', 'cuarto', 'room'] },
    { id: 'bano', label: 'Baño', keywords: ['bano', 'bath', 'bathroom', 'wc'] },
    { id: 'terraza', label: 'Terraza', keywords: ['terraza', 'terrace', 'balcon', 'balcony'] },
    { id: 'piscina', label: 'Piscina', keywords: ['piscina', 'pool'] },
    { id: 'lobby', label: 'Lobby', keywords: ['lobby', 'hall', 'entrada'] },
    { id: 'recepcion', label: 'Recepción', keywords: ['recepcion', 'reception', 'frontdesk'] },
    { id: 'amenidades', label: 'Amenidades', keywords: ['amenidad', 'amenity', 'social', 'gym', 'gimnasio', 'bbq', 'parque'] },
    { id: 'estudio', label: 'Estudio', keywords: ['estudio', 'studio'] },
    { id: 'oficina', label: 'Oficina', keywords: ['oficina', 'office', 'coworking'] },
    { id: 'local', label: 'Local', keywords: ['local', 'retail', 'comercial'] },
    { id: 'general', label: 'Espacio', keywords: [] }
  ];

  function identifySpace(name) {
    var lower = String(name || '').toLowerCase().replace(/[_-]/g, ' ');
    var best = SPACE_PATTERNS[SPACE_PATTERNS.length - 1];
    var bestScore = 0;
    SPACE_PATTERNS.forEach(function (pattern) {
      var score = pattern.keywords.filter(function (kw) { return lower.indexOf(kw) !== -1; }).length;
      if (score > bestScore) {
        bestScore = score;
        best = pattern;
      }
    });
    return best;
  }

  function processFiles(files, defaultSpaces) {
    var items = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var type = String(file.type || '').toLowerCase();
      var name = String(file.name || '').toLowerCase();
      var isPanorama = type.indexOf('image/') === 0 ||
        name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') ||
        name.indexOf('360') !== -1 || name.indexOf('pano') !== -1;

      if (!isPanorama) continue;

      var space = identifySpace(file.name);
      items.push({
        id: 'pano-' + Date.now() + '-' + i,
        file: file,
        name: file.name,
        spaceId: space.id,
        spaceLabel: space.label,
        previewUrl: URL.createObjectURL(file),
        order: items.length,
        tourUrl: null
      });
    }

    if (items.length === 0 && defaultSpaces && defaultSpaces.length) {
      defaultSpaces.forEach(function (label, idx) {
        items.push({
          id: 'pano-placeholder-' + idx,
          file: null,
          name: label,
          spaceId: 'pending',
          spaceLabel: label,
          previewUrl: null,
          order: idx,
          tourUrl: null,
          placeholder: true
        });
      });
    }

    items.sort(function (a, b) { return a.order - b.order; });
    return { items: items, total: items.filter(function (x) { return !x.placeholder; }).length };
  }

  function updateSpace(items, itemId, spaceLabel) {
    return items.map(function (item) {
      if (item.id === itemId) {
        return Object.assign({}, item, { spaceLabel: spaceLabel, spaceId: spaceLabel.toLowerCase().replace(/\s+/g, '-') });
      }
      return item;
    });
  }

  return {
    SPACE_PATTERNS: SPACE_PATTERNS,
    identifySpace: identifySpace,
    processFiles: processFiles,
    updateSpace: updateSpace
  };
})();
