/**
 * Quotation Config — V7.1.06 reuses shared BuilderConfig (same as Showroom).
 */
var QuotationConfig = (function () {
  var _ctx = { id: '', name: '', slug: '', constructora_id: null };
  var _projectRef = null;

  function syncProjectRef() {
    if (!_projectRef) return;
    _projectRef.id = _ctx.id;
    _projectRef.name = _ctx.name;
    _projectRef.slug = _ctx.slug;
    if (_ctx.constructora_id != null) {
      _projectRef.constructora_id = _ctx.constructora_id;
    }
  }

  function makeAdapter(panel) {
    return {
      getProjectId: function () {
        return _ctx.id || null;
      },
      getIdentity: function () {
        return {
          nombre: _ctx.name || '',
          slug: _ctx.slug || '',
          constructora_id: _ctx.constructora_id || null
        };
      },
      onSaved: function (payload) {
        _ctx.id = payload.id;
        _ctx.name = payload.nombre;
        _ctx.slug = payload.slug;
        _ctx.constructora_id = payload.constructora_id || _ctx.constructora_id;
        syncProjectRef();
      },
      afterSave: function () {
        if (!panel || typeof BuilderConfig === 'undefined') return;
        var host = panel.querySelector('.builder-step-content');
        if (!host || !host.parentNode) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = BuilderConfig.render({
          nombre: _ctx.name,
          slug: _ctx.slug
        });
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
      constructora_id: ctx.constructora_id || null
    };

    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'config',
          'Configuración',
          'Identidad y datos del proyecto.',
          opts.sectionChecks
        )
        : '';

    var body =
      typeof BuilderConfig !== 'undefined' && BuilderConfig.render
        ? BuilderConfig.render({
          nombre: _ctx.name,
          slug: _ctx.slug
        })
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
        constructora_id: ctx.constructora_id || null
      };
    }
    if (!panel || typeof BuilderConfig === 'undefined' || !BuilderConfig.bind) return;
    BuilderConfig.bind(panel, makeAdapter(panel));
  }

  return { render: render, bind: bind };
})();
