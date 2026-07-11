/* =========================================================
   UBICACIÓN — Google Maps embebido (navegable en el modal)
   ========================================================= */

var LocationMap = (function () {
  var VALLEDUPAR = { lat: 10.4631, lng: -73.2532, label: 'Valledupar, Cesar, Colombia' };

  function hasCoords(lat, lng) {
    return lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
  }

  function getProjectOpts() {
    var project = window.PROJECT_DATA || null;
    if (!project) return { label: VALLEDUPAR.label };
    return {
      lat: project.latitud,
      lng: project.longitud,
      label: project.nombre || project.direccion || project.ciudad || VALLEDUPAR.label
    };
  }

  function buildEmbedUrl(lat, lng, label) {
    if (hasCoords(lat, lng)) {
      return 'https://maps.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) +
        '&hl=es&z=15&output=embed';
    }
    var query = label || VALLEDUPAR.label;
    return 'https://maps.google.com/maps?q=' + encodeURIComponent(query) +
      '&hl=es&z=13&output=embed';
  }

  function needsRender(container) {
    if (!container) return false;
    if (container.querySelector('.location-map-iframe')) return false;
    return true;
  }

  function render(container, opts) {
    if (!container) return;
    opts = opts || {};

    var lat = opts.lat != null ? Number(opts.lat) : VALLEDUPAR.lat;
    var lng = opts.lng != null ? Number(opts.lng) : VALLEDUPAR.lng;
    var label = opts.label || VALLEDUPAR.label;
    var src = buildEmbedUrl(
      hasCoords(opts.lat, opts.lng) ? lat : null,
      hasCoords(opts.lat, opts.lng) ? lng : null,
      label
    );

    container.className = 'location-map';
    container.innerHTML =
      '<iframe class="location-map-iframe" title="Mapa de ' + escapeAttr(label) + '" ' +
        'src="' + src + '" allowfullscreen loading="eager" ' +
        'referrerpolicy="no-referrer-when-downgrade"></iframe>';
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return {
    render: render,
    needsRender: needsRender,
    getProjectOpts: getProjectOpts,
    VALLEDUPAR: VALLEDUPAR
  };
})();
