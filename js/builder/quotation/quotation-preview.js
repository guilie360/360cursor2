/* Quotation Builder — Preview placeholder (shared Builder chrome). */
var QuotationPreview = (function () {
  function render(ctx, opts) {
    opts = opts || {};
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'preview',
          'Preview',
          'Vista previa de la cotización.',
          opts.sectionChecks
        )
        : '';
    return '' +
      '<div class="quotation-step quotation-step--preview">' +
        header +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind };
})();
