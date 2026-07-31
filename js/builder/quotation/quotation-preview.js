/**
 * QuotationPreview — V7.2.59 WYSIWYG.
 * Same QuotationRuntime + HeroRenderer as published. Viewport presets match Builder.
 */
var QuotationPreview = (function () {
  var LIVE_KEY_PREFIX = 'boxies_qe_live_doc_v1_';
  var previewViewport = 'desktop';

  function liveStorageKey(projectId) {
    return LIVE_KEY_PREFIX + String(projectId || '').trim();
  }

  function activeViewport() {
    if (typeof HeroRenderer !== 'undefined' && HeroRenderer.getViewport) {
      return HeroRenderer.getViewport(previewViewport);
    }
    return { id: 'desktop', label: 'Desktop', width: 1280, height: 720 };
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
    try {
      var url = new URL('/quotation/', window.location.origin);
      url.searchParams.set('projectId', id);
      url.searchParams.set('experience_type', 'quotation');
      url.searchParams.set('preview', '1');
      url.searchParams.set('live', '1');
      return url.href;
    } catch (e0) {
      return '/quotation/?projectId=' + encodeURIComponent(id) +
        '&experience_type=quotation&preview=1&live=1';
    }
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

  function pushDocumentToFrame(iframe, envelope) {
    if (!iframe || !envelope || typeof QuotationRuntimeBridge === 'undefined') return;
    var payload = {
      canvas: envelope.canvas,
      project: envelope.project || null,
      coverModel: null
    };
    if (envelope.canvas && Array.isArray(envelope.canvas.scenes)) {
      var scenes = envelope.canvas.scenes;
      var i;
      for (i = 0; i < scenes.length; i++) {
        if (scenes[i] && scenes[i].coverModel) {
          payload.coverModel = scenes[i].coverModel;
          break;
        }
      }
    }
    QuotationRuntimeBridge.postToFrame(
      iframe,
      QuotationRuntimeBridge.TYPE.SET_DOCUMENT || QuotationRuntimeBridge.TYPE.SET_MODEL,
      payload
    );
  }

  function viewportChromeHtml() {
    var list = (typeof HeroRenderer !== 'undefined' && HeroRenderer.listViewports)
      ? HeroRenderer.listViewports()
      : [
        { id: 'desktop', label: 'Desktop' },
        { id: 'tablet', label: 'Tablet' },
        { id: 'mobile', label: 'Mobile' }
      ];
    var btns = list.map(function (vp) {
      return '' +
        '<button type="button" class="qe-viewport__btn' +
          (previewViewport === vp.id ? ' is-active' : '') + '"' +
          ' data-qe-preview-viewport="' + String(vp.id).replace(/"/g, '') + '">' +
          String(vp.label || vp.id) +
        '</button>';
    }).join('');
    return '' +
      '<div class="qe-viewport qe-viewport--preview" data-qe-preview-viewport-bar>' +
        '<div class="qe-viewport__presets" role="group" aria-label="Viewport">' + btns + '</div>' +
      '</div>';
  }

  function render(ctx, opts) {
    opts = opts || {};
    ctx = ctx || {};
    if (opts.viewportPreset) previewViewport = String(opts.viewportPreset);
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'preview',
          'Preview',
          'Mismo Runtime y mismo ProjectDocument que el Editor.',
          opts.sectionChecks
        )
        : '';
    var envelope = prepareLiveDocument(ctx);
    var url = resolveRuntimeUrl(ctx);
    if (typeof QuotationPersistAudit !== 'undefined' && QuotationPersistAudit.onPreview) {
      QuotationPersistAudit.onPreview({
        projectId: ctx.id || ctx.projectId || null,
        slug: ctx.slug || null,
        source: 'sessionStorage boxies_qe_live_doc_v1_{projectId} + QuotationRuntime.href(preview+live)',
        url: url,
        liveDocPresent: !!(envelope && envelope.canvas),
        canvasSceneCount: envelope && envelope.canvas && Array.isArray(envelope.canvas.scenes)
          ? envelope.canvas.scenes.length
          : 0
      });
    }
    var body;
    if (!url) {
      body =
        '<p class="builder-menu-hint">Abre un proyecto de cotización para previsualizar.</p>';
    } else if (!envelope || !envelope.canvas) {
      body =
        '<p class="builder-menu-hint">No hay un ProjectDocument listo. Edita escenas en el Editor y vuelve a Preview.</p>';
    } else {
      var vp = activeViewport();
      body =
        viewportChromeHtml() +
        '<div class="qe-preview-frame" data-qe-preview-frame' +
          ' style="width:' + vp.width + 'px;height:' + vp.height + 'px;max-width:100%;">' +
          '<iframe class="qe-preview-frame__iframe" data-qe-preview-iframe title="Preview cotización" ' +
            'width="' + vp.width + '" height="' + vp.height + '" ' +
            'src="' + String(url).replace(/"/g, '&quot;') + '"></iframe>' +
        '</div>';
    }
    return '' +
      '<div class="quotation-step quotation-step--preview">' +
        header +
        body +
      '</div>';
  }

  function bind(panel, ctx) {
    if (!panel) return;
    var iframe = panel.querySelector('[data-qe-preview-iframe]');
    var envelope = prepareLiveDocument(ctx || {});

    panel.querySelectorAll('[data-qe-preview-viewport]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-qe-preview-viewport') || 'desktop';
        if (previewViewport === next) return;
        previewViewport = next;
        if (typeof QuotationBuilder !== 'undefined' && QuotationBuilder.goToStep) {
          QuotationBuilder.goToStep('preview');
          return;
        }
        var host = panel.closest('.quotation-step--preview') || panel;
        if (host && host.parentNode) {
          var wrap = document.createElement('div');
          wrap.innerHTML = render(ctx || {}, {});
          var nextEl = wrap.firstElementChild;
          if (nextEl) {
            host.parentNode.replaceChild(nextEl, host);
            bind(nextEl, ctx);
          }
        }
      });
    });

    if (!iframe || !envelope) return;

    function onReady(ev) {
      if (typeof QuotationRuntimeBridge === 'undefined') return;
      if (!QuotationRuntimeBridge.isMessage(ev.data)) return;
      if (ev.data.type !== QuotationRuntimeBridge.TYPE.READY) return;
      if (iframe.contentWindow && ev.source && ev.source !== iframe.contentWindow) return;
      pushDocumentToFrame(iframe, envelope);
    }

    window.addEventListener('message', onReady);
    iframe.addEventListener('load', function () {
      pushDocumentToFrame(iframe, prepareLiveDocument(ctx || {}) || envelope);
    });
  }

  return {
    render: render,
    bind: bind,
    resolveRuntimeUrl: resolveRuntimeUrl,
    prepareLiveDocument: prepareLiveDocument,
    LIVE_KEY_PREFIX: LIVE_KEY_PREFIX,
    getViewportPreset: function () { return previewViewport; },
    setViewportPreset: function (id) { previewViewport = String(id || 'desktop'); }
  };
})();
