/**
 * QuotationPreview — opens the same public experience a client visits (V7.2.14).
 * Prefers /{slug}; falls back to Quotation Runtime by projectId (drafts).
 */
var QuotationPreview = (function () {
  function resolveRuntimeUrl(projectIdOrCtx) {
    var ctx = projectIdOrCtx && typeof projectIdOrCtx === 'object'
      ? projectIdOrCtx
      : { id: projectIdOrCtx };
    var id = String(ctx.id || ctx.projectId || '').trim();
    var slug = String(ctx.slug || '').trim();

    if (slug) {
      if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
        return ShowroomPublicUrl.href(slug);
      }
      try {
        return new URL('/' + encodeURIComponent(slug), window.location.origin).href;
      } catch (e0) {
        return '/' + encodeURIComponent(slug);
      }
    }

    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.quotationUrl) {
      return PlatformBuilderBridge.quotationUrl({ id: id, slug: slug });
    }
    if (id && typeof QuotationRuntime !== 'undefined' && QuotationRuntime.href) {
      return QuotationRuntime.href(id);
    }
    if (!id) return null;
    try {
      var url = new URL('/quotation/', window.location.origin);
      url.searchParams.set('projectId', id);
      url.searchParams.set('experience_type', 'quotation');
      return url.href;
    } catch (e) {
      return '/quotation/?projectId=' + encodeURIComponent(id) +
        '&experience_type=quotation';
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
