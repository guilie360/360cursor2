/**
 * Quotation Config — identity/share panels + left-rail section nav.
 */
var QuotationConfig = (function () {
  var NAV = [
    { id: 'general', label: 'General' },
    { id: 'compartir', label: 'Compartir' },
    { id: 'publicar', label: 'Publicar' },
    { id: 'seo', label: 'SEO' },
    { id: 'config', label: 'Config..' }
  ];

  var _activeSection = 'config';
  var _ctx = {
    id: '',
    name: '',
    slug: '',
    constructora_id: null,
    og_image: '',
    og_title: '',
    og_description: '',
    favicon_url: '',
    page_title: '',
    published: false
  };
  var _projectRef = null;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function syncProjectRef() {
    if (!_projectRef) return;
    _projectRef.id = _ctx.id;
    _projectRef.name = _ctx.name;
    _projectRef.slug = _ctx.slug;
    _projectRef.constructora_id = _ctx.constructora_id;
    _projectRef.og_image = _ctx.og_image;
    _projectRef.og_title = _ctx.og_title;
    _projectRef.og_description = _ctx.og_description;
    _projectRef.favicon_url = _ctx.favicon_url;
    _projectRef.page_title = _ctx.page_title;
    _projectRef.published = _ctx.published;
  }

  function identityPayload() {
    return {
      nombre: _ctx.name || '',
      slug: _ctx.slug || '',
      constructora_id: _ctx.constructora_id || null,
      og_image: _ctx.og_image || '',
      og_title: _ctx.og_title || '',
      og_description: _ctx.og_description || '',
      favicon_url: _ctx.favicon_url || '',
      page_title: _ctx.page_title || ''
    };
  }

  function applyShareMeta(meta) {
    meta = meta || {};
    if (meta.og_image != null) _ctx.og_image = meta.og_image || '';
    if (meta.og_title != null) _ctx.og_title = meta.og_title || '';
    if (meta.og_description != null) _ctx.og_description = meta.og_description || '';
    if (meta.favicon_url != null) _ctx.favicon_url = meta.favicon_url || '';
    if (meta.page_title != null) _ctx.page_title = meta.page_title || '';
    syncProjectRef();
  }

  function notifyLeftChrome() {
    if (typeof QuotationBuilderView !== 'undefined' &&
        typeof QuotationBuilderView.syncConfigLeftChrome === 'function') {
      QuotationBuilderView.syncConfigLeftChrome();
    }
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
        notifyLeftChrome();
      },
      onShareChange: function (meta) {
        applyShareMeta(meta);
      },
      onIdentityDraft: function (draft) {
        if (draft.nombre != null) _ctx.name = String(draft.nombre);
        if (draft.slug != null) _ctx.slug = String(draft.slug);
        syncProjectRef();
        notifyLeftChrome();
      },
      onShareSaved: function (meta) {
        applyShareMeta(meta);
        notifyLeftChrome();
      },
      afterSave: function () {
        if (!panel || typeof BuilderConfig === 'undefined') return;
        if (_activeSection !== 'config') return;
        var host = panel.querySelector('[data-qe-config-body] .builder-step-content') ||
          panel.querySelector('.builder-step-content');
        if (!host || !host.parentNode) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = BuilderConfig.render(identityPayload());
        var next = wrap.firstChild;
        if (!next) return;
        host.parentNode.replaceChild(next, host);
        BuilderConfig.bind(panel, makeAdapter(panel));
        notifyLeftChrome();
      }
    };
  }

  function sectionBodyHtml(sectionId) {
    var id = sectionId || _activeSection;
    if (id === 'config') {
      if (typeof BuilderConfig !== 'undefined' && BuilderConfig.render) {
        return BuilderConfig.render(identityPayload());
      }
      return '<p class="builder-step-desc">Configuración no disponible.</p>';
    }
    return '' +
      '<div class="builder-step-content quotation-config-section is-empty"' +
        ' data-qe-config-section="' + escapeHtml(id) + '"></div>';
  }

  function leftNavHtml() {
    return '' +
      '<nav class="qe-config-nav" aria-label="Secciones de configuración">' +
        NAV.map(function (item) {
          var on = item.id === _activeSection;
          return '' +
            '<button type="button" class="qe-content__toggle qe-config-nav__item' +
              (on ? ' is-current' : '') + '"' +
              ' data-qe-config-nav="' + escapeHtml(item.id) + '"' +
              ' aria-current="' + (on ? 'page' : 'false') + '">' +
              '<span class="qe-config-nav__dot" aria-hidden="true"></span>' +
              '<span class="qe-content__group-label">' +
                escapeHtml(item.label) +
              '</span>' +
            '</button>';
        }).join('') +
      '</nav>';
  }

  function syncNavActive(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-qe-config-nav]').forEach(function (btn) {
      var id = btn.getAttribute('data-qe-config-nav');
      var on = id === _activeSection;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function mountSectionBody(panel) {
    if (!panel) return;
    var slot = panel.querySelector('[data-qe-config-body]');
    if (!slot) return;
    slot.innerHTML = sectionBodyHtml(_activeSection);
    if (_activeSection === 'config' &&
        typeof BuilderConfig !== 'undefined' && BuilderConfig.bind) {
      BuilderConfig.bind(panel, makeAdapter(panel));
    }
  }

  function setActiveSection(sectionId, panel) {
    var next = String(sectionId || '').trim();
    var found = false;
    var i;
    for (i = 0; i < NAV.length; i++) {
      if (NAV[i].id === next) { found = true; break; }
    }
    if (!found) return;
    _activeSection = next;
    syncNavActive(document.getElementById('quotationLeftBody') || document);
    if (panel) mountSectionBody(panel);
  }

  function bindLeftNav(root, panel) {
    if (!root) return;
    root.querySelectorAll('[data-qe-config-nav]').forEach(function (btn) {
      if (btn.dataset.qeConfigNavBound === '1') return;
      btn.dataset.qeConfigNavBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-qe-config-nav');
        if (!id || id === _activeSection) return;
        setActiveSection(id, panel || document.querySelector('[data-quotation-panel]'));
      });
    });
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
      favicon_url: ctx.favicon_url || '',
      page_title: ctx.page_title || '',
      published: !!ctx.published
    };
    if (!_activeSection) _activeSection = 'config';

    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'config',
          'Configuración',
          'Identidad, slug y metadatos de publicación.',
          opts.sectionChecks
        )
        : '';

    return '' +
      '<div class="quotation-step quotation-step--config">' +
        header +
        '<div data-qe-config-body>' +
          sectionBodyHtml(_activeSection) +
        '</div>' +
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
        favicon_url: ctx.favicon_url || '',
        page_title: ctx.page_title || '',
        published: !!ctx.published
      };
    }
    if (!panel) return;
    if (_activeSection === 'config' &&
        typeof BuilderConfig !== 'undefined' && BuilderConfig.bind) {
      BuilderConfig.bind(panel, makeAdapter(panel));
    }
  }

  return {
    render: render,
    bind: bind,
    leftNavHtml: leftNavHtml,
    bindLeftNav: bindLeftNav,
    getActiveSection: function () { return _activeSection; },
    setActiveSection: setActiveSection,
    NAV: NAV
  };
})();
