/**
 * QuotationContextMenu — generic portal menu (BOXIES chrome).
 * Same visual language as "Estado del proyecto" / workspace menus.
 */
var QuotationContextMenu = (function () {
  var PORTAL_ID = 'qeContextMenuPortal';
  var openPanel = null;
  var bound = false;
  /** Guide context menu — fixed trio so the panel stays compact. */
  var GUIDE_MENU_COLOR_PRESETS = ['#b33a3a', '#050505', '#5dff6a', '#ffffff'];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ensurePortal() {
    var el = document.getElementById(PORTAL_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = PORTAL_ID;
      el.className = 'qe-context-menu-portal';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function close() {
    var portal = document.getElementById(PORTAL_ID);
    if (portal && portal.parentNode) {
      portal.parentNode.removeChild(portal);
    }
    openPanel = null;
  }

  function positionAt(panel, clientX, clientY) {
    if (!panel) return;
    var pad = 8;
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    panel.style.position = 'fixed';
    panel.style.left = '0px';
    panel.style.top = '0px';
    panel.style.visibility = 'hidden';
    var rect = panel.getBoundingClientRect();
    var w = rect.width || 180;
    var h = rect.height || 120;
    var x = Number(clientX) || 0;
    var y = Number(clientY) || 0;
    if (x + w + pad > vw) x = Math.max(pad, vw - w - pad);
    if (y + h + pad > vh) y = Math.max(pad, vh - h - pad);
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    panel.style.left = Math.round(x) + 'px';
    panel.style.top = Math.round(y) + 'px';
    panel.style.visibility = 'visible';
  }

  function bindDismiss() {
    if (bound) return;
    bound = true;
    function onOutsidePointer(e) {
      if (!openPanel) return;
      var t = e.target;
      if (t && t.closest && t.closest('[data-qe-context-menu]')) return;
      close();
    }
    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('mousedown', onOutsidePointer, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openPanel) close();
    }, true);
    window.addEventListener('resize', function () {
      if (openPanel) close();
    });
    window.addEventListener('scroll', function () {
      if (openPanel) close();
    }, true);
  }

  function findItem(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === id) return items[i];
    }
    return null;
  }

  function normalizeHexColor(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    }
    return '#b33a3a';
  }

  function guideColorScopeIconHtml(sceneLocked) {
    var S = 'xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"' +
      ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true"';
    if (sceneLocked) {
      return '<svg ' + S + '>' +
        '<rect x="5" y="11" width="14" height="10" rx="2"/>' +
        '<path d="M8 11V8a4 4 0 0 1 8 0v3"/>' +
        '</svg>';
    }
    return '<svg ' + S + '>' +
      '<rect x="5" y="11" width="14" height="10" rx="2"/>' +
      '<path d="M8 11V8a4 4 0 0 1 7.8-4"/>' +
      '</svg>';
  }

  function bindColorFields(panel, items) {
    panel.querySelectorAll('[data-qe-ctx-color-input]').forEach(function (input) {
      input.addEventListener('input', function (e) {
        e.stopPropagation();
        var id = input.getAttribute('data-qe-ctx-color-input');
        var item = findItem(items, id);
        if (item && typeof item.onChange === 'function') {
          item.onChange(normalizeHexColor(input.value), item);
        }
      });
      input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    panel.querySelectorAll('[data-qe-ctx-swatch]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var fieldId = btn.getAttribute('data-qe-ctx-color-field');
        var hex = normalizeHexColor(btn.getAttribute('data-qe-ctx-swatch'));
        var input = panel.querySelector('[data-qe-ctx-color-input="' + fieldId + '"]');
        if (input) input.value = hex;
        var item = findItem(items, fieldId);
        if (item && typeof item.onChange === 'function') item.onChange(hex, item);
      });
    });
    panel.querySelectorAll('[data-qe-ctx-color-scope]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var fieldId = btn.getAttribute('data-qe-ctx-color-field');
        var item = findItem(items, fieldId);
        if (!item || !item.scopeToggle) return;
        var nextLocked = !btn.classList.contains('is-locked');
        btn.classList.toggle('is-locked', nextLocked);
        btn.setAttribute('aria-pressed', nextLocked ? 'true' : 'false');
        var titles = item.scopeToggle;
        btn.setAttribute(
          'title',
          nextLocked
            ? (titles.titleLocked || 'Solo esta escena')
            : (titles.titleUnlocked || 'Todas las escenas · Desktop')
        );
        btn.innerHTML = guideColorScopeIconHtml(nextLocked);
        if (typeof item.scopeToggle.onToggle === 'function') item.scopeToggle.onToggle(nextLocked);
      });
    });
  }

  function submitInput(panel, items, opts, inputEl) {
    if (!inputEl) return;
    var id = inputEl.getAttribute('data-qe-ctx-input');
    var item = findItem(items, id);
    var raw = inputEl.value;
    close();
    if (item && typeof item.onSubmit === 'function') {
      item.onSubmit(raw, item);
    }
    if (typeof opts.onSelect === 'function') {
      opts.onSelect(id, item, raw);
    }
  }

  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {Array<object>} opts.items
   * @param {function(string, object, *=):void} [opts.onSelect]
   * @param {string} [opts.ariaLabel]
   */
  function open(opts) {
    opts = opts || {};
    var items = Array.isArray(opts.items) ? opts.items : [];
    if (!items.length) return null;
    bindDismiss();
    close();
    var portal = ensurePortal();
    portal.setAttribute('aria-hidden', 'false');
    var panel = document.createElement('div');
    panel.className = 'boxies-workspace-menu__panel qe-context-menu';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', opts.ariaLabel || 'Menú contextual');
    panel.setAttribute('data-qe-context-menu', '1');

    var html = '';
    var focusInputId = null;
    items.forEach(function (item) {
      if (!item) return;
      if (item.separatorBefore) {
        html += '<div class="boxies-workspace-menu__sep" role="separator"></div>';
      }
      if (item.type === 'label') {
        html += '<p class="qe-context-menu__title">' + escapeHtml(item.label || '') + '</p>';
        return;
      }
      if (item.type === 'input') {
        if (!focusInputId) focusInputId = item.id;
        var inputKind = String(item.inputType || item.inputmode || 'number').toLowerCase();
        var isText = inputKind === 'text' || inputKind === 'search';
        var inputAttrs = isText
          ? ('type="text" autocomplete="off" spellcheck="false" ' +
            (item.placeholder
              ? 'placeholder="' + escapeHtml(item.placeholder) + '" '
              : ''))
          : ('type="number" inputmode="numeric" ' +
            (item.min != null ? 'min="' + escapeHtml(item.min) + '" ' : '') +
            (item.max != null ? 'max="' + escapeHtml(item.max) + '" ' : '') +
            'step="' + escapeHtml(item.step != null ? item.step : 1) + '" ');
        html +=
          '<label class="qe-context-menu__field' +
            (isText ? ' qe-context-menu__field--text' : '') +
            '" data-qe-ctx-field="' + escapeHtml(item.id) + '">' +
            (item.label
              ? '<span class="qe-context-menu__field-label">' + escapeHtml(item.label) + '</span>'
              : '') +
            '<input class="qe-context-menu__input' +
              (isText ? ' qe-context-menu__input--text' : '') + '"' +
              ' ' + inputAttrs +
              'data-qe-ctx-input="' + escapeHtml(item.id) + '" ' +
              'value="' + escapeHtml(item.value != null ? item.value : '') + '" ' +
              'aria-label="' + escapeHtml(item.ariaLabel || item.label || item.placeholder || 'Valor') + '">' +
            (item.suffix
              ? '<span class="qe-context-menu__field-suffix">' + escapeHtml(item.suffix) + '</span>'
              : '') +
          '</label>';
        return;
      }
      if (item.type === 'color') {
        var colorVal = normalizeHexColor(item.value);
        var presets = item.id === 'guide-color'
          ? GUIDE_MENU_COLOR_PRESETS.slice()
          : (Array.isArray(item.presets) ? item.presets : []);
        var swatches = presets.map(function (hex) {
          var c = normalizeHexColor(hex);
          return '' +
            '<button type="button" class="qe-context-menu__swatch"' +
              ' data-qe-ctx-swatch="' + escapeHtml(c) + '"' +
              ' data-qe-ctx-color-field="' + escapeHtml(item.id) + '"' +
              ' style="--qe-swatch:' + escapeHtml(c) + '"' +
              ' title="' + escapeHtml(c) + '" aria-label="' + escapeHtml(c) + '"></button>';
        }).join('');
        var scopeToggle = item.scopeToggle || null;
        var sceneLocked = !!(scopeToggle && scopeToggle.active);
        var scopeBtn = scopeToggle
          ? ('<button type="button" class="qe-context-menu__color-scope' +
              (sceneLocked ? ' is-locked' : '') + '"' +
              ' data-qe-ctx-color-scope="1"' +
              ' data-qe-ctx-color-field="' + escapeHtml(item.id) + '"' +
              ' aria-pressed="' + (sceneLocked ? 'true' : 'false') + '"' +
              ' title="' + escapeHtml(
                sceneLocked
                  ? (scopeToggle.titleLocked || 'Solo esta escena')
                  : (scopeToggle.titleUnlocked || 'Todas las escenas · Desktop')
              ) + '"' +
              ' aria-label="' + escapeHtml(
                sceneLocked
                  ? (scopeToggle.titleLocked || 'Solo esta escena')
                  : (scopeToggle.titleUnlocked || 'Todas las escenas · Desktop')
              ) + '">' +
              guideColorScopeIconHtml(sceneLocked) +
            '</button>')
          : '';
        html +=
          '<div class="qe-context-menu__color" data-qe-ctx-color="' + escapeHtml(item.id) + '">' +
            (item.label
              ? '<span class="qe-context-menu__field-label">' + escapeHtml(item.label) + '</span>'
              : '') +
            '<div class="qe-context-menu__color-row">' +
              '<input type="color" class="qe-context-menu__color-input"' +
                ' data-qe-ctx-color-input="' + escapeHtml(item.id) + '"' +
                ' value="' + escapeHtml(colorVal) + '"' +
                ' aria-label="' + escapeHtml(item.ariaLabel || item.label || 'Color de guía') + '">' +
              (swatches || scopeBtn
                ? '<div class="qe-context-menu__swatches" role="list">' + swatches + scopeBtn + '</div>'
                : '') +
            '</div>' +
          '</div>';
        return;
      }
      var disabled = !!item.disabled;
      html +=
        '<button type="button" class="boxies-workspace-menu__item' +
          (item.danger ? ' qe-lib-menu__danger' : '') +
          (disabled ? ' is-disabled' : '') + '"' +
          ' role="menuitem"' +
          (disabled ? ' disabled aria-disabled="true"' : '') +
          ' data-qe-ctx-id="' + escapeHtml(item.id) + '">' +
          escapeHtml(item.label || '') +
        '</button>';
    });
    panel.innerHTML = html;

    bindColorFields(panel, items);

    var backdrop = document.createElement('div');
    backdrop.className = 'qe-context-menu-backdrop';
    backdrop.setAttribute('data-qe-ctx-backdrop', '1');
    backdrop.setAttribute('aria-hidden', 'true');
    function dismissMenu() {
      close();
    }
    backdrop.addEventListener('pointerdown', dismissMenu);
    backdrop.addEventListener('mousedown', dismissMenu);

    portal.appendChild(backdrop);
    portal.appendChild(panel);
    openPanel = panel;

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target && e.target.closest ? e.target.closest('[data-qe-ctx-id]') : null;
      if (!btn || btn.disabled) return;
      var id = btn.getAttribute('data-qe-ctx-id');
      var item = findItem(items, id);
      close();
      if (typeof opts.onSelect === 'function') opts.onSelect(id, item);
      if (item && typeof item.onSelect === 'function') item.onSelect(item);
    });

    panel.addEventListener('keydown', function (e) {
      var input = e.target && e.target.closest ? e.target.closest('[data-qe-ctx-input]') : null;
      if (!input) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submitInput(panel, items, opts, input);
      }
    });

    panel.addEventListener('mousedown', function (e) {
      if (e.target && e.target.closest &&
          e.target.closest('[data-qe-ctx-input], [data-qe-ctx-color-input], [data-qe-ctx-swatch], [data-qe-ctx-color-scope], .qe-context-menu__color')) {
        e.stopPropagation();
      }
    });

    positionAt(panel, opts.x, opts.y);

    if (focusInputId) {
      var focusEl = panel.querySelector('[data-qe-ctx-input="' + focusInputId + '"]');
      if (focusEl) {
        requestAnimationFrame(function () {
          try {
            focusEl.focus();
            focusEl.select();
          } catch (errFocus) { /* ignore */ }
        });
      }
    }
    return panel;
  }

  return {
    open: open,
    close: close,
    isOpen: function () { return !!openPanel; }
  };
})();
