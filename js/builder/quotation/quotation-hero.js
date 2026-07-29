/* Quotation Builder — Hero placeholder (shared Builder chrome). */
var QuotationHero = (function () {
  function render(ctx, opts) {
    opts = opts || {};
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'hero',
          'Hero',
          'Portada comercial de la cotización.',
          opts.sectionChecks
        )
        : '';
    return '' +
      '<div class="quotation-step quotation-step--hero">' +
        header +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind };
})();
