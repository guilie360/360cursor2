/* Quotation Builder — Hero placeholder (independent from Showroom Hero). */
var QuotationHero = (function () {
  function render() {
    return '' +
      '<div class="quotation-step quotation-step--hero">' +
        '<header class="quotation-step__header">' +
          '<h1 class="boxies-page__title">Hero</h1>' +
          '<p class="boxies-page__desc">Portada comercial de la cotización.</p>' +
        '</header>' +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind };
})();
