/**
 * BOXIES HallPage — neutral lobby / resting state.
 * Clears workspace content only; Shell chrome stays mounted.
 */
var BoxiesHallPage = (function () {
  async function mount(host) {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      BoxiesShell.clearPageActions();
    }
    host.innerHTML =
      '<div class="boxies-hall" role="status" aria-label="Hall de trabajo">' +
        '<div class="boxies-hall__brand" aria-hidden="true">B O X I E S</div>' +
        '<h1 class="boxies-hall__title">Hall de trabajo</h1>' +
        '<p class="boxies-hall__hint">Selecciona un módulo desde la barra lateral.</p>' +
      '</div>';
  }

  function unmount() {}

  return { id: 'hall', title: 'Hall', mount: mount, unmount: unmount };
})();
