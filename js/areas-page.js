/**
 * Áreas page — pantalla real del Showroom (screen id: `areas`).
 * Se abre con goTo('areas') desde el menú "Conoce el proyecto".
 */
var AreasShowroomPage = (function () {
  function planHtml() {
    if (typeof InteractiveAreasMockPlan !== 'undefined' && InteractiveAreasMockPlan.html) {
      return InteractiveAreasMockPlan.html();
    }
    return '<div class="areas-page-plan-fallback">Planta mock no disponible</div>';
  }

  function pageHtml() {
    return '' +
      '<div class="areas-page" data-areas-page>' +
        '<header class="areas-page-header">' +
          '<p class="areas-page-kicker">Conoce el proyecto</p>' +
          '<h2 class="areas-page-title">Áreas</h2>' +
          '<p class="areas-page-desc">Planta navegable del proyecto (vista mock del laboratorio Interactivo).</p>' +
        '</header>' +
        '<div class="areas-page-stage">' + planHtml() + '</div>' +
      '</div>';
  }

  function ensureContent(root) {
    if (!root) return;
    root.innerHTML = pageHtml();
  }

  function onEnter() {
    var root = document.getElementById('areasInteractiveRoot');
    ensureContent(root);
  }

  function onExit() {}

  return {
    SCREEN_ID: 'areas',
    onEnter: onEnter,
    onExit: onExit,
    ensureContent: ensureContent,
    pageHtml: pageHtml
  };
})();
