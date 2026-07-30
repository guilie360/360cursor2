/**
 * Quotation Config — V7.1.07 shared BuilderConfig + social share preview.
 */
var QuotationConfig = (function () {
  var _ctx = {
    id: '',
    name: '',
    slug: '',
    constructora_id: null,
    og_image: '',
    og_title: '',
    og_description: '',
    published: false
  };
  var _projectRef = null;

  function syncProjectRef() {
    if (!_projectRef) return;
    _projectRef.id = _ctx.id;
    _projectRef.name = _ctx.name;
    _projectRef.slug = _ctx.slug;
    _projectRef.constructora_id = _ctx.constructora_id;
    _projectRef.og_image = _ctx.og_image;
    _projectRef.og_title = _ctx.og_title;
    _projectRef.og_description = _ctx.og_description;
    _projectRef.published = _ctx.published;
  }

  function identityPayload() {
    return {
      nombre: _ctx.name || '',
      slug: _ctx.slug || '',
      constructora_id: _ctx.constructora_id || null,
      og_image: _ctx.og_image || '',
      og_title: _ctx.og_title || '',
      og_description: _ctx.og_description || ''
    };
  }

  function makeAdapter(panel) {
    return {
      getProjectId: function () {
        return _ctx.id || null;
      },
      getIdentity: function () {
        return identityPayload();
      },
      resolveConstructoraId: function () {
        return _ctx.constructora_id ||
          (typeof AdminState !== 'undefined' && AdminState.getConstructoraId
            ? AdminState.getConstructoraId()
            : null);
      },
      onSaved: function (payload) {
        _ctx.id = payload.id;
        _ctx.name = payload.nombre;
        _ctx.slug = payload.slug;
        _ctx.constructora_id = payload.constructora_id || _ctx.constructora_id;
        syncProjectRef();
      },
      onShareChange: function (meta) {
        _ctx.og_image = meta.og_image || '';
        _ctx.og_title = meta.og_title || '';
        _ctx.og_description = meta.og_description || '';
        syncProjectRef();
      },
      onIdentityDraft: function (draft) {
        if (draft.nombre != null) _ctx.name = String(draft.nombre);
        if (draft.slug != null) _ctx.slug = String(draft.slug);
        syncProjectRef();
      },
      onShareSaved: function (meta) {
        _ctx.og_image = meta.og_image || '';
        _ctx.og_title = meta.og_title || '';
        _ctx.og_description = meta.og_description || '';
        syncProjectRef();
      },
      afterSave: function () {
        if (!panel || typeof BuilderConfig === 'undefined') return;
        var host = panel.querySelector('.builder-step-content');
        if (!host || !host.parentNode) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = BuilderConfig.render(identityPayload());
        var next = wrap.firstChild;
        if (!next) return;
        host.parentNode.replaceChild(next, host);
        BuilderConfig.bind(panel, makeAdapter(panel));
      }
    };
  }

  function render(ctx, opts) {
    ctx = ctx || {};
    opts = opts || {};
    _ctx = {
      id: ctx.id || '',
      name: ctx.name || ctx.nombre || '',
      slug: ctx.slug || '',
      constructora_id: ctx.constructora_id || null,
      og_image: ctx.og_image || '',
      og_title: ctx.og_title || '',
      og_description: ctx.og_description || '',
      published: !!ctx.published
    };

    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'config',
          'Configuración',
          'Identidad, slug y metadatos de publicación.',
          opts.sectionChecks
        )
        : '';

    var body =
      typeof BuilderConfig !== 'undefined' && BuilderConfig.render
        ? BuilderConfig.render(identityPayload())
        : '<p class="builder-step-desc">Configuración no disponible.</p>';

    return '' +
      '<div class="quotation-step quotation-step--config">' +
        header +
        body +
      '</div>';
  }

  function bind(panel, ctx) {
    if (ctx) {
      _projectRef = ctx;
      _ctx = {
        id: ctx.id || '',
        name: ctx.name || ctx.nombre || '',
        slug: ctx.slug || '',
        constructora_id: ctx.constructora_id || null,
        og_image: ctx.og_image || '',
        og_title: ctx.og_title || '',
        og_description: ctx.og_description || '',
        published: !!ctx.published
      };
    }
    if (!panel || typeof BuilderConfig === 'undefined' || !BuilderConfig.bind) return;
    BuilderConfig.bind(panel, makeAdapter(panel));
  }

  return { render: render, bind: bind };
})();
