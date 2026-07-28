try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/menu-config.js');}catch(_e){}
/* Shared showroom menu config — defaults + normalize */
var MenuConfig = (function () {
  var SECTION_OPTIONS = [
    { value: 'proximamente', label: 'Próximamente' },
    { value: 'tour360', label: 'Experiencia 360°' },
    { value: 'tipologias', label: 'Viviendas' },
    { value: 'location', label: 'Ubicación' },
    { value: 'descripcion', label: 'Descripción' },
    { value: 'video', label: 'Video' },
    { value: 'renders', label: 'Galería' },
    { value: 'amenidades', label: 'Amenidades' },
    { value: 'areas', label: 'Áreas' },
    { value: 'estado', label: 'Estado del proyecto' },
    { value: 'constructora', label: 'Constructora' },
    { value: 'descargas', label: 'Descargas' }
  ];

  var SUBMENU_OPTIONS = [
    { value: 'proximamente', label: 'Próximamente' },
    { value: 'menu-proyecto', label: 'Submenú: Conoce el proyecto' },
    { value: 'menu-contacto', label: 'Submenú: Contacto' }
  ];

  var DOM_PRIMARY = {
    conoce: 'menuConoce',
    tour360: 'menuTour360',
    viviendas: 'menuViviendas',
    ubicacion: 'menuUbicacion',
    contacto: 'menuContacto'
  };

  var DOM_CHILD = {
    descripcion: 'menuDescripcion',
    video: 'menuVideo',
    renders: 'menuRenders',
    amenidades: 'menuAmenidades',
    areas: 'menuAreas',
    estado: 'menuEstado',
    constructora: 'menuConstructora',
    descargas: 'menuDescargas'
  };

  function uid(prefix) {
    return (prefix || 'item') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function defaultChildren() {
    return [
      { id: 'descripcion', label: 'Descripción', enabled: true, target: 'descripcion' },
      { id: 'video', label: 'Video', enabled: true, target: 'video' },
      { id: 'renders', label: 'Galería', enabled: true, target: 'renders' },
      { id: 'amenidades', label: 'Amenidades', enabled: true, target: 'amenidades' },
      { id: 'areas', label: 'Áreas', enabled: true, target: 'areas' },
      { id: 'estado', label: 'Estado del proyecto', enabled: true, target: 'estado' },
      { id: 'constructora', label: 'Constructora', enabled: true, target: 'constructora' },
      { id: 'descargas', label: 'Descargas', enabled: true, target: 'descargas' }
    ];
  }

  function defaultItems() {
    return [
      {
        id: 'conoce',
        label: 'Conoce el proyecto',
        enabled: true,
        action: 'submenu',
        target: 'menu-proyecto',
        children: defaultChildren()
      },
      {
        id: 'tour360',
        label: 'Experiencia 360°',
        enabled: true,
        action: 'section',
        target: 'tour360',
        children: []
      },
      {
        id: 'viviendas',
        label: 'Viviendas',
        enabled: true,
        action: 'section',
        target: 'tipologias',
        children: []
      },
      {
        id: 'ubicacion',
        label: 'Ubicación',
        enabled: true,
        action: 'section',
        target: 'location',
        children: []
      },
      {
        id: 'contacto',
        label: 'Contacto',
        enabled: true,
        action: 'submenu',
        target: 'menu-contacto',
        children: []
      }
    ];
  }

  function defaults() {
    return {
      projectName: '',
      description: '',
      items: defaultItems()
    };
  }

  function ensureAreasChild(children) {
    var list = Array.isArray(children) ? children.slice() : [];
    var has = list.some(function (c) {
      return c && (c.id === 'areas' || c.target === 'areas');
    });
    if (has) return list;
    var item = { id: 'areas', label: 'Áreas', enabled: true, target: 'areas' };
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === 'amenidades') {
        idx = i;
        break;
      }
    }
    if (idx >= 0) list.splice(idx + 1, 0, item);
    else list.push(item);
    return list;
  }

  function normalizeItem(raw) {
    var item = raw || {};
    var action = 'section';
    if (item.action === 'submenu') action = 'submenu';
    else if (item.action === 'proximamente') action = 'proximamente';
    else if (item.action === 'url') action = 'url';
    else if (item.action === 'pdf') action = 'pdf';
    var children = Array.isArray(item.children)
      ? item.children.map(function (c) {
          return {
            id: c.id || uid('child'),
            label: (c.label || 'Ítem').trim() || 'Ítem',
            enabled: c.enabled !== false,
            target: c.target || 'descripcion'
          };
        })
      : [];
    var target = item.target;
    if (action === 'proximamente') {
      target = 'proximamente';
    } else if (action === 'url' || action === 'pdf') {
      target = target || '';
    } else if (!target) {
      target = action === 'submenu' ? 'menu-proyecto' : 'proximamente';
    }
    if (action === 'submenu' && target === 'menu-proyecto') {
      children = ensureAreasChild(children.length ? children : defaultChildren());
    }
    return {
      id: item.id || uid('menu'),
      label: (item.label || 'Botón').trim() || 'Botón',
      enabled: item.enabled !== false,
      action: action,
      target: target,
      href: item.href != null ? String(item.href) : (item.url != null ? String(item.url) : ''),
      icon: item.icon != null ? String(item.icon) : '',
      children: action === 'submenu' && target === 'menu-proyecto'
        ? children
        : (action === 'submenu' ? children : [])
    };
  }

  function normalize(raw) {
    var base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    var items = Array.isArray(raw.items) && raw.items.length
      ? raw.items.map(normalizeItem)
      : base.items;
    return {
      projectName: raw.projectName != null ? String(raw.projectName) : '',
      description: raw.description != null ? String(raw.description) : '',
      items: items
    };
  }

  function setLabel(el, label) {
    if (!el) return;
    var span = el.querySelector('.menu-item-label');
    if (span) span.textContent = label;
  }

  function setVisible(el, enabled) {
    if (!el) return;
    el.hidden = !enabled;
    el.style.display = enabled ? '' : 'none';
    el.classList.toggle('is-menu-hidden', !enabled);
  }

  function resolveTarget(target) {
    if (!target) return target;
    if (target === 'proximamente') return 'sphere';
    return target;
  }

  function applyToDom(config, options) {
    options = options || {};
    config = normalize(config);

    var nameEl = document.getElementById('mainMenuProject');
    var descEl = document.getElementById('mainMenuConstructora');
    if (nameEl && config.projectName) nameEl.textContent = config.projectName;
    if (descEl && (config.description || options.fallbackDescription != null)) {
      descEl.textContent = config.description || options.fallbackDescription || '';
    }

    var primary = document.getElementById('mainMenuListPrimary');
    var proyectoList = document.getElementById('mainMenuListProyecto');
    if (!primary) return config;

    /* Hide built-in items first; re-show those still in config */
    Object.keys(DOM_PRIMARY).forEach(function (key) {
      var el = document.getElementById(DOM_PRIMARY[key]);
      if (el) setVisible(el, false);
    });

    primary.querySelectorAll('[data-menu-custom="1"]').forEach(function (n) {
      n.parentNode.removeChild(n);
    });

    if (proyectoList) {
      Object.keys(DOM_CHILD).forEach(function (key) {
        var el = document.getElementById(DOM_CHILD[key]);
        if (el) setVisible(el, false);
      });
      proyectoList.querySelectorAll('[data-menu-child-custom="1"]').forEach(function (n) {
        n.parentNode.removeChild(n);
      });
    }

    config.items.forEach(function (item) {
      var builtInId = DOM_PRIMARY[item.id];
      var el = builtInId ? document.getElementById(builtInId) : null;

      if (!el) {
        el = document.createElement('div');
        el.className = 'menu-item';
        el.id = 'menuCustom_' + item.id;
        el.setAttribute('data-menu-custom', '1');
        el.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/>' +
          '</svg>' +
          '<span class="menu-item-label"></span>';
        primary.appendChild(el);
      }

      el.setAttribute('data-menu-id', item.id);
      el.setAttribute('data-menu-action', item.action);
      el.setAttribute('data-menu-target', item.target || '');
      setLabel(el, item.label);
      setVisible(el, item.enabled !== false);
      primary.appendChild(el);

      if (
        item.action === 'submenu' &&
        item.target === 'menu-proyecto' &&
        item.children &&
        proyectoList
      ) {
        item.children.forEach(function (child) {
          var childBuiltIn = DOM_CHILD[child.id];
          var childEl = childBuiltIn ? document.getElementById(childBuiltIn) : null;

          if (!childEl) {
            childEl = document.createElement('div');
            childEl.className = 'menu-item';
            childEl.id = 'menuChildCustom_' + child.id;
            childEl.setAttribute('data-menu-child-custom', '1');
            childEl.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h4"/>' +
              '</svg>' +
              '<span class="menu-item-label"></span>';
            proyectoList.appendChild(childEl);
          }

          childEl.setAttribute('data-menu-id', child.id);
          var canonicalTargets = {
            descripcion: 'descripcion',
            video: 'video',
            renders: 'renders',
            amenidades: 'amenidades',
            areas: 'areas',
            estado: 'estado',
            constructora: 'constructora',
            descargas: 'descargas'
          };
          childEl.setAttribute(
            'data-menu-target',
            canonicalTargets[child.id] || child.target || child.id || 'descripcion'
          );
          setLabel(childEl, child.label);
          setVisible(childEl, child.enabled !== false);
          proyectoList.appendChild(childEl);
        });
      }
    });

    return config;
  }

  return {
    SECTION_OPTIONS: SECTION_OPTIONS,
    SUBMENU_OPTIONS: SUBMENU_OPTIONS,
    DOM_PRIMARY: DOM_PRIMARY,
    DOM_CHILD: DOM_CHILD,
    defaults: defaults,
    defaultItems: defaultItems,
    defaultChildren: defaultChildren,
    normalize: normalize,
    normalizeItem: normalizeItem,
    uid: uid,
    resolveTarget: resolveTarget,
    applyToDom: applyToDom
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/menu-config.js');}catch(_e){}
