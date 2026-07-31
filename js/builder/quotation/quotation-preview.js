/**
 * QuotationPreview — V7.2.65 stub.
 * The sidebar Preview panel was removed. Canvas central = única vista previa
 * (QuotationEditor canvasPreviewMode). Kept so old script tags do not break.
 */
var QuotationPreview = (function () {
  var LIVE_KEY_PREFIX = 'boxies_qe_live_doc_v1_';

  function liveStorageKey(projectId) {
    return LIVE_KEY_PREFIX + String(projectId || '').trim();
  }

  function prepareLiveDocument(ctx) {
    ctx = ctx || {};
    var id = String(ctx.id || ctx.projectId || '').trim();
    if (!id) return null;
    var doc = null;
    if (typeof QuotationEditor !== 'undefined' && QuotationEditor.prepareLivePreview) {
      doc = QuotationEditor.prepareLivePreview(ctx);
    } else if (typeof QuotationEditor !== 'undefined' && QuotationEditor.serializeDocument) {
      doc = QuotationEditor.serializeDocument();
    }
    if (!doc) return null;
    var envelope = {
      v: 1,
      at: Date.now(),
      projectId: id,
      project: {
        id: id,
        nombre: ctx.name || ctx.nombre || '',
        slug: ctx.slug || ''
      },
      canvas: doc
    };
    try {
      sessionStorage.setItem(liveStorageKey(id), JSON.stringify(envelope));
    } catch (eStore) { /* quota */ }
    return envelope;
  }

  function resolveRuntimeUrl(projectIdOrCtx) {
    var ctx = projectIdOrCtx && typeof projectIdOrCtx === 'object'
      ? projectIdOrCtx
      : { id: projectIdOrCtx };
    var id = String(ctx.id || ctx.projectId || '').trim();
    if (!id) return null;
    if (typeof QuotationRuntime !== 'undefined' && QuotationRuntime.href) {
      return QuotationRuntime.href(id, { preview: true, live: true });
    }
    return '/quotation/?projectId=' + encodeURIComponent(id) +
      '&experience_type=quotation&preview=1&live=1';
  }

  /** No UI — redirect callers to Editor + canvas preview mode. */
  function render() {
    return '';
  }

  function bind() {
    if (typeof QuotationBuilderView !== 'undefined' && QuotationBuilderView.goToStep) {
      QuotationBuilderView.goToStep('editor');
    }
    if (typeof QuotationEditor !== 'undefined' && QuotationEditor.setCanvasPreviewMode) {
      QuotationEditor.setCanvasPreviewMode(true);
    }
  }

  return {
    render: render,
    bind: bind,
    resolveRuntimeUrl: resolveRuntimeUrl,
    prepareLiveDocument: prepareLiveDocument,
    LIVE_KEY_PREFIX: LIVE_KEY_PREFIX,
    getViewportPreset: function () { return 'desktop'; },
    setViewportPreset: function () {}
  };
})();
