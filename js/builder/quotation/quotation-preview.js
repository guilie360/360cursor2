/**
 * QuotationPreview — same project as Canvas / Runtime (V7.2.06).
 * Embeds QuotationRuntime for the current projectId (no second renderer).
 */
var QuotationPreview = (function () {
  function resolveRuntimeUrl(projectId) {
    var id = String(projectId || '').trim();
    if (!id) return null;
    if (typeof QuotationRuntime !== 'undefined' && QuotationRuntime.href) {
      return QuotationRuntime.href(id, { preview: true });
    }
    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.quotationUrl) {
      return PlatformBuilderBridge.quotationUrl(id);
    }
    try {
      var url = new URL('/quotation/', window.location.origin);
      url.searchParams.set('projectId', id);
      url.searchParams.set('experience_type', 'quotation');
      url.searchParams.set('preview', '1');
      return url.href;
    } catch (e) {
      return '/quotation/?projectId=' + encodeURIComponent(id) +
        '&experience_type=quotation&preview=1';
    }
  }

  function render(ctx, opts) {
    opts = opts || {};
    ctx = ctx || {};
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'preview',
          'Preview',
          'Misma fuente que el Canvas y el Runtime.',
          opts.sectionChecks
        )
        : '';
    var url = resolveRuntimeUrl(ctx.id);
    var body;
    if (!url) {
      body =
        '<p class="builder-menu-hint">Guarda el proyecto para previsualizar el Canvas publicado.</p>';
    } else {
      body =
        '<div class="qe-preview-frame">' +
          '<iframe class="qe-preview-frame__iframe" title="Preview cotización" ' +
            'src="' + String(url).replace(/"/g, '&quot;') + '"></iframe>' +
        '</div>';
    }
    return '' +
      '<div class="quotation-step quotation-step--preview">' +
        header +
        body +
      '</div>';
  }

  function bind() {}

  return { render: render, bind: bind, resolveRuntimeUrl: resolveRuntimeUrl };
})();
