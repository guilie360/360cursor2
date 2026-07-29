/* Quotation Builder — Configuración (shared Builder chrome). */
var QuotationConfig = (function () {
  function escapeHtml(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(ctx, opts) {
    ctx = ctx || {};
    opts = opts || {};
    var name = ctx.name || ctx.nombre || 'Quotation Room';
    var slug = ctx.slug || '';
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'config',
          'Configuración',
          'Identidad básica de la cotización. Layout temporal.',
          opts.sectionChecks
        )
        : '';
    return '' +
      '<div class="quotation-step quotation-step--config">' +
        header +
        '<div class="builder-config-identity quotation-config-card">' +
          '<h3 class="builder-config-identity__title">Identidad de la Quotation Room</h3>' +
          '<div class="builder-field">' +
            '<label>Nombre</label>' +
            '<div class="quotation-config-readonly">' + escapeHtml(name) + '</div>' +
          '</div>' +
          '<div class="builder-field">' +
            '<label>Slug</label>' +
            '<div class="quotation-config-readonly">' + escapeHtml(slug || '—') + '</div>' +
          '</div>' +
          '<p class="builder-config-identity__hint">La edición completa se habilitará en una próxima versión.</p>' +
        '</div>' +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind };
})();
