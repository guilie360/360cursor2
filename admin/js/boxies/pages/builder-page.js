/**
 * BOXIES BuilderPage — placeholder only (Vertical Slice v0.1).
 * Real editor remains at /admin/ai-project-builder.html until Phase 1 task 8.
 */
var BoxiesBuilderPage = (function () {
  async function mount(host) {
    host.innerHTML =
      '<div class="boxies-page boxies-placeholder">' +
        '<p class="boxies-placeholder__kicker">BuilderPage</p>' +
        '<h1 class="boxies-page__title">Coming Soon</h1>' +
        '<p class="boxies-page__desc">El editor de proyecto se migrará aquí en una fase posterior. Mientras tanto usa <strong>Administrar</strong> desde Proyectos para abrir el Builder actual.</p>' +
      '</div>';
  }

  function unmount() {}

  return { id: 'builder', title: 'Builder', mount: mount, unmount: unmount };
})();
