/* Quotation Builder — Preview placeholder. */
var QuotationPreview = (function () {
  function render() {
    return '' +
      '<div class="quotation-step quotation-step--preview">' +
        '<header class="quotation-step__header">' +
          '<h1 class="boxies-page__title">Preview</h1>' +
          '<p class="boxies-page__desc">Vista previa de la cotización.</p>' +
        '</header>' +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind };
})();
