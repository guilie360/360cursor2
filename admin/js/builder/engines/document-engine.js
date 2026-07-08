/* Document Engine — plans and downloadable classification */
var DocumentEngine = (function () {
  var DOC_TYPES = {
    plano: { label: 'Plano', keywords: ['plano', 'plan', 'floor', 'layout', 'dwg', 'blueprint'], accept: ['.pdf', '.jpg', '.jpeg', '.png', '.dwg'] },
    brochure: { label: 'Brochure', keywords: ['brochure', 'folleto', 'catalogo', 'catalog'] },
    ficha: { label: 'Ficha técnica', keywords: ['ficha', 'technical', 'spec', 'especificacion'] },
    acabados: { label: 'Memoria de acabados', keywords: ['acabado', 'finish', 'memoria'] },
    cotizacion: { label: 'Cotización', keywords: ['cotizacion', 'quote', 'precio', 'pricing'] },
    reglamento: { label: 'Reglamento', keywords: ['reglamento', 'rules', 'manual', 'normas'] },
    pdf: { label: 'Documento PDF', keywords: ['pdf', 'documento', 'doc'] },
    otro: { label: 'Documento', keywords: [] }
  };

  function classifyDocument(name, context) {
    var lower = String(name || '').toLowerCase().replace(/[_-]/g, ' ');
    var types = context === 'plans'
      ? ['plano']
      : Object.keys(DOC_TYPES);

    var best = context === 'plans' ? 'plano' : 'otro';
    var bestScore = 0;

    types.forEach(function (key) {
      var score = DOC_TYPES[key].keywords.filter(function (kw) { return lower.indexOf(kw) !== -1; }).length;
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    });

    return best;
  }

  function extractPlanMetadata(name) {
    var lower = String(name || '').toLowerCase();
    var meta = {
      tipologia: null,
      habitaciones: null,
      area: null,
      nivel: null,
      nombre: name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
    };

    var habMatch = lower.match(/(\d)\s*(hab|bed|br|dorm)/);
    if (habMatch) meta.habitaciones = parseInt(habMatch[1], 10);

    var areaMatch = lower.match(/(\d{2,4})\s*(m2|m²|sqm|mt)/);
    if (areaMatch) meta.area = parseInt(areaMatch[1], 10);

    var nivelMatch = lower.match(/(piso|nivel|floor|level)\s*(\d+)/);
    if (nivelMatch) meta.nivel = parseInt(nivelMatch[2], 10);

    var tipoMatch = lower.match(/(tipo|type)\s*([a-z0-9]+)/);
    if (tipoMatch) meta.tipologia = 'Tipo ' + tipoMatch[2].toUpperCase();

    if (lower.indexOf('studio') !== -1 || lower.indexOf('apartaestudio') !== -1) {
      meta.tipologia = meta.tipologia || 'Apartaestudio';
      meta.habitaciones = meta.habitaciones || 0;
    }

    return meta;
  }

  function processFiles(files, context) {
    var items = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var docType = classifyDocument(file.name, context);
      var meta = context === 'plans' ? extractPlanMetadata(file.name) : { nombre: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') };

      items.push({
        id: 'doc-' + Date.now() + '-' + i,
        file: file,
        name: file.name,
        size: file.size,
        docType: docType,
        docTypeLabel: DOC_TYPES[docType].label,
        meta: meta,
        order: items.length,
        context: context || 'downloads'
      });
    }

    items.sort(function (a, b) {
      if (a.docType !== b.docType) return a.docType.localeCompare(b.docType);
      return a.name.localeCompare(b.name);
    });

    return { items: items, total: items.length };
  }

  return {
    DOC_TYPES: DOC_TYPES,
    classifyDocument: classifyDocument,
    extractPlanMetadata: extractPlanMetadata,
    processFiles: processFiles
  };
})();
