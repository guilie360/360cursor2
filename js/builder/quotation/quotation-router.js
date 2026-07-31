/* Quotation Builder — in-builder step router (Configuración → Hero → Editor). */
var QuotationRouter = (function () {
  var DEFAULT_STEP = 'config';
  var ALLOWED = {
    config: 1,
    hero: 1,
    editor: 1
  };

  function normalize(stepId) {
    var id = String(stepId || '').trim().toLowerCase();
    /* Legacy ?step=preview → Editor (canvas preview mode is separate). */
    if (id === 'preview') return 'editor';
    return ALLOWED[id] ? id : DEFAULT_STEP;
  }

  function readFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return normalize(params.get('step'));
    } catch (e) {
      return DEFAULT_STEP;
    }
  }

  function writeToUrl(stepId) {
    var id = normalize(stepId);
    try {
      var url = new URL(window.location.href);
      if (id === DEFAULT_STEP) url.searchParams.delete('step');
      else url.searchParams.set('step', id);
      /* Drop legacy preview step param leftovers. */
      if (url.searchParams.get('step') === 'preview') url.searchParams.set('step', 'editor');
      window.history.replaceState(
        Object.assign({}, window.history.state || {}, { step: id }),
        '',
        url.pathname + url.search + url.hash
      );
    } catch (e) {}
    return id;
  }

  return {
    DEFAULT_STEP: DEFAULT_STEP,
    normalize: normalize,
    readFromUrl: readFromUrl,
    writeToUrl: writeToUrl
  };
})();
