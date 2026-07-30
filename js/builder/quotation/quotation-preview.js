/**
 * QuotationPreview — embeds the published public URL /{slug} (V7.2.15).
 * Never opens /quotation/?projectId=… or preview flags.
 */
var QuotationPreview = (function () {
  function resolveRuntimeUrl(projectIdOrCtx) {
    var ctx = projectIdOrCtx && typeof projectIdOrCtx === 'object'
      ? projectIdOrCtx
      : { id: projectIdOrCtx };
    var slug = String(ctx.slug || '').trim();

    if (!slug) return null;
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
      return ShowroomPublicUrl.href(slug);
    }
    try {
      return new URL('/' + encodeURIComponent(slug), window.location.origin).href;
    } catch (e0) {
      return '/' + encodeURIComponent(slug);
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
          'Misma URL pública que verá el cliente.',
          opts.sectionChecks
        )
        : '';
    var url = resolveRuntimeUrl(ctx);
    var body;
    if (!url) {
      body =
        '<p class="builder-menu-hint">Define un slug y publica para previsualizar la experiencia pública.</p>';
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
