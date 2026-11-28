/**
 * BOXIES HallPage — empty resting state.
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
    host.innerHTML = '';
  }

  function unmount() {}

  return { id: 'hall', title: 'Hall', mount: mount, unmount: unmount };
})();
