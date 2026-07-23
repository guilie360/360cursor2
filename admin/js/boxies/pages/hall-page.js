/**
 * BOXIES HallPage — neutral lobby / resting state.
 * Clears workspace content only; Shell chrome stays mounted.
 */
var BoxiesHallPage = (function () {
  var LOGO_SRC = '../assets/brand/boxies-mark.png';

  async function mount(host) {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      BoxiesShell.clearPageActions();
    }
    host.innerHTML =
      '<div class="boxies-hall" role="img" aria-label="BOXIES">' +
        '<img class="boxies-hall__logo" src="' + LOGO_SRC + '" alt="BOXIES" width="220" decoding="async">' +
      '</div>';
  }

  function unmount() {}

  return { id: 'hall', title: 'Hall', mount: mount, unmount: unmount };
})();
