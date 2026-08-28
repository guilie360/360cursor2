/* Hotspot Engine — suggests hotspots from master renders */
var HotspotEngine = (function () {
  var HOTSPOT_TYPES = [
    { id: 'torre', label: 'Torre', keywords: ['torre', 'tower', 'bloque', 'block', 'edificio'] },
    { id: 'piscina', label: 'Piscina', keywords: ['piscina', 'pool', 'alberca'] },
    { id: 'casa', label: 'Casa / Unidad', keywords: ['casa', 'unit', 'unidad', 'apartamento', 'vivienda'] },
    { id: 'parque', label: 'Parque / Zona verde', keywords: ['parque', 'park', 'jardin', 'green', 'zona verde'] },
    { id: 'amenidad', label: 'Amenidad', keywords: ['amenidad', 'social', 'club', 'gym', 'gimnasio', 'bbq'] },
    { id: 'entrada', label: 'Entrada / Acceso', keywords: ['entrada', 'acceso', 'gate', 'lobby', 'recepcion'] },
    { id: 'local', label: 'Local comercial', keywords: ['local', 'comercial', 'retail', 'tienda'] }
  ];

  function suggestFromGallery(galleryItems, projectType) {
    var developmentType = projectType;
    if (typeof ProjectTypesEngine !== 'undefined' && ProjectTypesEngine.normalizeDevelopmentType) {
      developmentType = ProjectTypesEngine.normalizeDevelopmentType(projectType);
    }
    var suggestions = [];
    var masterImages = (galleryItems || []).filter(function (item) {
      return item.category === 'exterior' || item.category === 'masterplan' ||
        /master|aerial|aereo|drone|fachada|general/i.test(item.name);
    });

    if (masterImages.length === 0) {
      masterImages = (galleryItems || []).slice(0, 3);
    }

    masterImages.forEach(function (image, imgIdx) {
      HOTSPOT_TYPES.forEach(function (hsType, typeIdx) {
        var nameMatch = hsType.keywords.some(function (kw) {
          return image.name.toLowerCase().indexOf(kw) !== -1;
        });
        var typeMatch = developmentType && (
          ((developmentType === 'edificio' || developmentType === 'mixto') && hsType.id === 'torre') ||
          ((developmentType === 'conjunto' || developmentType === 'unidad') && hsType.id === 'casa') ||
          (developmentType === 'lotes' && hsType.id === 'parque')
        );

        if (nameMatch || (typeMatch && imgIdx === 0)) {
          suggestions.push({
            id: 'hs-' + image.id + '-' + hsType.id,
            imageId: image.id,
            imageName: image.name,
            imagePreview: image.previewUrl,
            type: hsType.id,
            label: hsType.label + (imgIdx > 0 ? ' ' + (imgIdx + 1) : ''),
            x: 20 + (typeIdx * 12) % 60,
            y: 25 + (typeIdx * 8) % 50,
            confidence: nameMatch ? 0.85 : 0.55,
            accepted: false
          });
        }
      });
    });

    if (suggestions.length === 0 && masterImages.length > 0) {
      suggestions.push({
        id: 'hs-default-1',
        imageId: masterImages[0].id,
        imageName: masterImages[0].name,
        imagePreview: masterImages[0].previewUrl,
        type: 'amenidad',
        label: 'Punto de interés principal',
        x: 50,
        y: 45,
        confidence: 0.4,
        accepted: false
      });
    }

    return suggestions.slice(0, 12);
  }

  function toggleAccepted(suggestions, suggestionId, accepted) {
    return suggestions.map(function (s) {
      if (s.id === suggestionId) return Object.assign({}, s, { accepted: accepted });
      return s;
    });
  }

  function getAccepted(suggestions) {
    return (suggestions || []).filter(function (s) { return s.accepted; });
  }

  return {
    HOTSPOT_TYPES: HOTSPOT_TYPES,
    suggestFromGallery: suggestFromGallery,
    toggleAccepted: toggleAccepted,
    getAccepted: getAccepted
  };
})();
