/**
 * QuotationContextMenu — generic portal menu (BOXIES chrome).
 * Same visual language as "Estado del proyecto" / workspace menus.
 */
var QuotationContextMenu = (function () {
  var PORTAL_ID = 'qeContextMenuPortal';
  var openPanel = null;
  var bound = false;

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
    if (portal) {
      portal.innerHTML = '';
      portal.setAttribute('aria-hidden', 'true');
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
    document.addEventListener('mousedown', function (e) {
      if (!openPanel) return;
      var t = e.target;
      if (t && t.closest && t.closest('#' + PORTAL_ID)) return;
      close();
    }, true);
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
        html +=
          '<label class="qe-context-menu__field" data-qe-ctx-field="' + escapeHtml(item.id) + '">' +
            '<span class="qe-context-menu__field-label">' + escapeHtml(item.label || '') + '</span>' +
            '<input class="qe-context-menu__input" type="number" inputmode="numeric" ' +
              'data-qe-ctx-input="' + escapeHtml(item.id) + '" ' +
              'value="' + escapeHtml(item.value != null ? item.value : '') + '" ' +
              (item.min != null ? 'min="' + escapeHtml(item.min) + '" ' : '') +
              (item.max != null ? 'max="' + escapeHtml(item.max) + '" ' : '') +
              'step="' + escapeHtml(item.step != null ? item.step : 1) + '" ' +
              'aria-label="' + escapeHtml(item.ariaLabel || item.label || 'Valor') + '">' +
            (item.suffix
              ? '<span class="qe-context-menu__field-suffix">' + escapeHtml(item.suffix) + '</span>'
              : '') +
          '</label>';
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
      if (e.target && e.target.closest && e.target.closest('[data-qe-ctx-input]')) {
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
