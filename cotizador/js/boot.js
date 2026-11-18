/* Arranque del cotizador standalone: sin login, motor compartido con el panel. */
(function () {
  if (!document.body || document.body.dataset.app !== 'cotizador') return;

  var params = new URLSearchParams(location.search);
  var modo = (params.get('modo') || 'publico').toLowerCase() === 'interno' ? 'interno' : 'publico';
  document.body.classList.add('modo-' + modo);
  document.body.classList.remove('portal-mode');

  var bar = document.getElementById('internoBar');
  if (bar) bar.hidden = modo !== 'interno';

  function startQuote() {
    try {
      if (typeof openEmbeddedQuote === 'function') {
        openEmbeddedQuote();
        return;
      }
    } catch (e) {}
    var portal = document.getElementById('portal');
    var path = document.getElementById('pathChooser');
    var pkg = document.getElementById('packageChooser');
    var manual = document.getElementById('manualConfigurator');
    var upsell = document.getElementById('manualUpsell');
    if (portal) portal.classList.add('portal-hidden');
    if (upsell) upsell.classList.add('hidden');
    if (manual) manual.classList.add('hidden');
    if (pkg) pkg.classList.add('hidden');
    if (path) path.classList.remove('hidden');
    document.body.classList.remove('portal-mode');
    window.scrollTo(0, 0);
  }

  // Volver: público → web; interno → panel
  var back = document.getElementById('portalBack');
  if (back) {
    back.onclick = function (e) {
      e.preventDefault();
      if (modo === 'interno') location.href = '/panel_gestion/';
      else location.href = '/';
    };
  }

  // Espejo de comisión estimada en la barra interna
  var live = document.getElementById('hunterLiveCommission');
  var mirror = document.getElementById('internoCommission');
  if (live && mirror && typeof MutationObserver !== 'undefined') {
    var sync = function () { mirror.textContent = live.textContent || '0 €'; };
    sync();
    new MutationObserver(sync).observe(live, { childList: true, characterData: true, subtree: true });
  }

  startQuote();
})();
