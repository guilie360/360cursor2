/**
 * QuotationCanvasTools — floating editor utilities (calculator, notes, color picker, pomodoro).
 * Window chrome + lifecycle: QuotationWindowManager.
 */
var QuotationCanvasTools = (function () {
  var NOTES_KEY = 'boxies_qe_canvas_notes_v1';
  var CHECKLIST_KEY = 'boxies_qe_canvas_checklist_v1';
  var pomodoroTimer = null;
  var pomodoroLeft = 25 * 60;

  function wm() {
    return typeof QuotationWindowManager !== 'undefined' ? QuotationWindowManager : null;
  }

  function openWindow(id, title, toolId, mount, onClose, windowOpts) {
    var mgr = wm();
    if (!mgr) return null;
    windowOpts = windowOpts || {};
    return mgr.open({
      id: id,
      title: title,
      toolId: toolId,
      mount: mount,
      onClose: onClose,
      resize: windowOpts.resize || null
    });
  }

  function close() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    var mgr = wm();
    if (mgr) mgr.closeAll();
  }

  function closePomodoroTimer() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
  }

  function normalizeHex(raw) {
    var s = String(raw || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    }
    return '#ffffff';
  }

  function calcEvaluate(expr) {
    var safe = String(expr || '').replace(/[^0-9+\-*/().%\s]/g, '');
    if (!safe.trim()) return '0';
    try {
      /* eslint-disable no-new-func */
      var val = Function('"use strict"; return (' + safe + ')')();
      if (typeof val !== 'number' || !isFinite(val)) return 'Error';
      var out = Math.round(val * 1e10) / 1e10;
      return String(out);
    } catch (eCalc) {
      return 'Error';
    }
  }

  function openCalculator() {
    openWindow('tool-calculator', 'Calculadora', 'calculator', function (bodyEl) {
      var keys = [
        'C', '±', '%', '÷',
        '7', '8', '9', '×',
        '4', '5', '6', '−',
        '1', '2', '3', '+',
        '0', '.', '='
      ];
      var btns = keys.map(function (k, i) {
        var wide = k === '0' && i === keys.length - 3;
        return '<button type="button" class="qe-calc__key' +
          (wide ? ' qe-calc__key--wide' : '') +
          (k === '=' ? ' qe-calc__key--eq' : '') +
          '" data-qe-calc-key="' + k + '">' + k + '</button>';
      }).join('');
      bodyEl.innerHTML =
        '<div class="qe-calc">' +
          '<output class="qe-calc__display" data-qe-calc-display>0</output>' +
          '<div class="qe-calc__keys">' + btns + '</div>' +
        '</div>';
      var display = bodyEl.querySelector('[data-qe-calc-display]');
      var expr = '0';
      function renderDisplay() {
        if (display) display.textContent = expr;
      }
      function mapOp(k) {
        if (k === '÷') return '/';
        if (k === '×') return '*';
        if (k === '−') return '-';
        return k;
      }
      bodyEl.querySelectorAll('[data-qe-calc-key]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.getAttribute('data-qe-calc-key') || '';
          if (k === 'C') {
            expr = '0';
            renderDisplay();
            return;
          }
          if (k === '±') {
            if (expr.charAt(0) === '-') expr = expr.slice(1);
            else if (expr !== '0') expr = '-' + expr;
            renderDisplay();
            return;
          }
          if (k === '=') {
            expr = calcEvaluate(expr);
            renderDisplay();
            return;
          }
          var op = mapOp(k);
          if (expr === '0' && op !== '.') expr = '';
          if (expr === 'Error') expr = '';
          expr += op;
          renderDisplay();
        });
      });
    });
  }

  function openNotes() {
    openWindow('tool-notes', 'Notas', 'notes', function (bodyEl) {
      var saved = '';
      try { saved = localStorage.getItem(NOTES_KEY) || ''; } catch (eLs) { /* ignore */ }
      bodyEl.innerHTML =
        '<textarea class="qe-notes__area" data-qe-notes-input rows="8"' +
          ' placeholder="Apuntes de sesión…" spellcheck="true"></textarea>';
      var area = bodyEl.querySelector('[data-qe-notes-input]');
      if (area) {
        area.value = saved;
        area.addEventListener('input', function () {
          try { localStorage.setItem(NOTES_KEY, area.value); } catch (eSave) { /* ignore */ }
        });
        requestAnimationFrame(function () {
          try { area.focus(); } catch (eF) { /* ignore */ }
        });
      }
    });
  }

  function nextChecklistId() {
    return 'cl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function nextChecklistPageId() {
    return 'cp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function normalizeChecklistItem(it) {
    return {
      id: String(it.id || nextChecklistId()),
      text: it.text != null ? String(it.text) : '',
      checked: !!it.checked
    };
  }

  function defaultChecklistItems() {
    return [{ id: nextChecklistId(), text: '', checked: false }];
  }

  function normalizeChecklistState(raw) {
    var state = raw && typeof raw === 'object' ? raw : {};
    var pages = Array.isArray(state.pages) ? state.pages : [];
    pages = pages.map(function (page, idx) {
      var items = Array.isArray(page.items) ? page.items : [];
      if (!items.length) items = defaultChecklistItems();
      return {
        id: String(page.id || nextChecklistPageId()),
        title: page.title != null ? String(page.title) : ('Página ' + (idx + 1)),
        items: items.map(normalizeChecklistItem)
      };
    });
    if (!pages.length) {
      var firstId = nextChecklistPageId();
      pages = [{ id: firstId, title: 'Página 1', items: defaultChecklistItems() }];
      state.activePageId = firstId;
    }
    var activePageId = String(state.activePageId || pages[0].id);
    if (!pages.some(function (p) { return p.id === activePageId; })) {
      activePageId = pages[0].id;
    }
    return { activePageId: activePageId, pages: pages };
  }

  function loadChecklistState() {
    try {
      var raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.pages)) {
          return normalizeChecklistState(parsed);
        }
        if (Array.isArray(parsed) && parsed.length) {
          var legacyId = nextChecklistPageId();
          return normalizeChecklistState({
            activePageId: legacyId,
            pages: [{
              id: legacyId,
              title: 'Página 1',
              items: parsed.map(normalizeChecklistItem)
            }]
          });
        }
      }
    } catch (eLoad) { /* ignore */ }
    var id = nextChecklistPageId();
    return normalizeChecklistState({
      activePageId: id,
      pages: [{ id: id, title: 'Página 1', items: defaultChecklistItems() }]
    });
  }

  function saveChecklistState(state) {
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state)); } catch (eSave) { /* ignore */ }
  }

  function getActiveChecklistPage(state) {
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].id === state.activePageId) return state.pages[i];
    }
    return state.pages[0] || null;
  }

  function checklistPagesHtml(state) {
    var esc = function (v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    var tabs = state.pages.map(function (page) {
      var active = page.id === state.activePageId;
      return '<button type="button" class="qe-checklist-tabs__tab' +
        (active ? ' is-active' : '') + '"' +
        ' data-qe-check-page="' + esc(page.id) + '"' +
        ' role="tab"' +
        ' aria-selected="' + (active ? 'true' : 'false') + '"' +
        ' title="' + esc(page.title) + '">' +
        '<span class="qe-checklist-tabs__tab-label">' + esc(page.title) + '</span>' +
      '</button>';
    }).join('');
    return '' +
      '<div class="qe-checklist-tabs" role="tablist" aria-label="Páginas del checklist">' +
        '<div class="qe-checklist-tabs__strip">' +
          '<div class="qe-checklist-tabs__scroll" data-qe-checklist-pages>' + tabs + '</div>' +
          '<button type="button" class="qe-checklist-tabs__new" data-qe-check-add-page' +
            ' aria-label="Agregar página" title="Agregar página">+</button>' +
        '</div>' +
      '</div>';
  }

  function checklistRowHtml(item) {
    var checked = !!item.checked;
    var esc = function (v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    return '' +
      '<div class="qe-checklist__row' + (checked ? ' is-checked' : '') + '"' +
        ' data-qe-check-row="' + esc(item.id) + '">' +
        '<button type="button" class="qe-checklist__box"' +
          ' data-qe-check-toggle="' + esc(item.id) + '"' +
          ' aria-pressed="' + (checked ? 'true' : 'false') + '"' +
          ' aria-label="Marcar tarea"></button>' +
        '<textarea class="qe-checklist__text" rows="1"' +
          ' data-qe-check-text="' + esc(item.id) + '"' +
          ' placeholder="Tarea" spellcheck="true" autocomplete="off">' +
          esc(item.text || '') +
        '</textarea>' +
        '<button type="button" class="qe-checklist__del"' +
          ' data-qe-check-delete="' + esc(item.id) + '"' +
          ' aria-label="Eliminar tarea">&times;</button>' +
      '</div>';
  }

  function renderChecklistBody(bodyEl, state) {
    var page = getActiveChecklistPage(state);
    var items = page ? page.items : defaultChecklistItems();
    bodyEl.innerHTML =
      '<div class="qe-checklist-shell">' +
        checklistPagesHtml(state) +
        '<div class="qe-checklist" data-qe-checklist-list>' +
          items.map(checklistRowHtml).join('') +
        '</div>' +
      '</div>';
    bindChecklistShell(bodyEl, state);
  }

  function bindChecklistShell(host, state) {
    var page = getActiveChecklistPage(state);
    if (!page) return;

    function persist() {
      saveChecklistState(state);
    }

    function rerender() {
      renderChecklistBody(host, state);
    }

    var addPageBtn = host.querySelector('[data-qe-check-add-page]');
    if (addPageBtn) {
      addPageBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var newId = nextChecklistPageId();
        state.pages.push({
          id: newId,
          title: 'Página ' + (state.pages.length + 1),
          items: defaultChecklistItems()
        });
        state.activePageId = newId;
        persist();
        rerender();
      });
    }

    var pageClickTimer = null;

    function pageById(pageId) {
      pageId = String(pageId || '');
      for (var pi = 0; pi < state.pages.length; pi++) {
        if (state.pages[pi].id === pageId) return state.pages[pi];
      }
      return null;
    }

    function beginChecklistPageRename(tab) {
      var pageId = tab.getAttribute('data-qe-check-page');
      var targetPage = pageById(pageId);
      if (!targetPage || tab.dataset.renaming === '1') return;
      var label = tab.querySelector('.qe-checklist-tabs__tab-label');
      if (!label) return;
      tab.dataset.renaming = '1';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'qe-checklist-tabs__tab-input';
      input.value = targetPage.title || '';
      input.maxLength = 48;
      input.setAttribute('aria-label', 'Nombre de la página');
      label.replaceWith(input);
      input.focus();
      input.select();
      function finish(save) {
        if (save) {
          var next = String(input.value || '').trim();
          if (next) targetPage.title = next;
          persist();
        }
        tab.dataset.renaming = '0';
        rerender();
      }
      input.addEventListener('blur', function () { finish(true); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      });
      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    host.querySelectorAll('[data-qe-check-page]').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (tab.dataset.renaming === '1') return;
        var pageId = tab.getAttribute('data-qe-check-page');
        if (pageClickTimer) {
          try { clearTimeout(pageClickTimer); } catch (eT) { /* ignore */ }
          pageClickTimer = null;
        }
        pageClickTimer = setTimeout(function () {
          pageClickTimer = null;
          if (!pageId || pageId === state.activePageId) return;
          state.activePageId = pageId;
          persist();
          rerender();
        }, 240);
      });
      tab.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (pageClickTimer) {
          try { clearTimeout(pageClickTimer); } catch (eT2) { /* ignore */ }
          pageClickTimer = null;
        }
        beginChecklistPageRename(tab);
      });
    });

    bindChecklistList(host, page.items, persist);
  }

  function bindChecklistList(host, items, persist) {
    var list = host.querySelector('[data-qe-checklist-list]');
    if (!list) return;

    function itemById(id) {
      id = String(id || '');
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === id) return items[i];
      }
      return null;
    }

    function itemIndexById(id) {
      id = String(id || '');
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === id) return i;
      }
      return -1;
    }

    function syncRowUi(row, checked) {
      if (!row) return;
      row.classList.toggle('is-checked', !!checked);
      var btn = row.querySelector('[data-qe-check-toggle]');
      if (btn) btn.setAttribute('aria-pressed', checked ? 'true' : 'false');
    }

    function autoResizeChecklistField(field) {
      if (!field) return;
      field.style.height = 'auto';
      var next = Math.max(22, field.scrollHeight);
      field.style.height = next + 'px';
    }

    function syncChecklistFields() {
      list.querySelectorAll('[data-qe-check-text]').forEach(function (field) {
        autoResizeChecklistField(field);
      });
    }

    list.addEventListener('click', function (e) {
      var delBtn = e.target && e.target.closest ? e.target.closest('[data-qe-check-delete]') : null;
      if (delBtn && list.contains(delBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var delId = delBtn.getAttribute('data-qe-check-delete');
        var delIdx = itemIndexById(delId);
        if (delIdx < 0) return;
        var delRow = delBtn.closest('[data-qe-check-row]');
        items.splice(delIdx, 1);
        if (!items.length) {
          items.push({ id: nextChecklistId(), text: '', checked: false });
          persist();
          list.innerHTML = items.map(checklistRowHtml).join('');
          syncChecklistFields();
          var freshInput = list.querySelector('[data-qe-check-text]');
          if (freshInput) {
            requestAnimationFrame(function () {
              try { freshInput.focus(); } catch (eF) { /* ignore */ }
            });
          }
        } else {
          persist();
          if (delRow) delRow.remove();
        }
        return;
      }
      var btn = e.target && e.target.closest ? e.target.closest('[data-qe-check-toggle]') : null;
      if (!btn || !list.contains(btn)) return;
      e.preventDefault();
      var id = btn.getAttribute('data-qe-check-toggle');
      var item = itemById(id);
      if (!item) return;
      item.checked = !item.checked;
      persist();
      syncRowUi(btn.closest('[data-qe-check-row]'), item.checked);
    });

    list.addEventListener('input', function (e) {
      var input = e.target && e.target.closest ? e.target.closest('[data-qe-check-text]') : null;
      if (!input || !list.contains(input)) return;
      var item = itemById(input.getAttribute('data-qe-check-text'));
      if (!item) return;
      item.text = input.value;
      persist();
      autoResizeChecklistField(input);
    });

    list.addEventListener('keydown', function (e) {
      var input = e.target && e.target.closest ? e.target.closest('[data-qe-check-text]') : null;
      if (!input || !list.contains(input) || e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      var idx = itemIndexById(input.getAttribute('data-qe-check-text'));
      if (idx < 0) idx = items.length - 1;
      var currentRow = input.closest('[data-qe-check-row]');
      var newItem = { id: nextChecklistId(), text: '', checked: false };
      items.splice(idx + 1, 0, newItem);
      persist();
      var wrap = document.createElement('div');
      wrap.innerHTML = checklistRowHtml(newItem);
      var newRow = wrap.firstElementChild;
      if (currentRow && currentRow.nextSibling) list.insertBefore(newRow, currentRow.nextSibling);
      else if (currentRow) list.appendChild(newRow);
      else list.appendChild(newRow);
      var nextInput = newRow.querySelector('[data-qe-check-text]');
      if (nextInput) {
        autoResizeChecklistField(nextInput);
        requestAnimationFrame(function () {
          try { nextInput.focus(); } catch (eF) { /* ignore */ }
        });
      }
    });

    syncChecklistFields();
    requestAnimationFrame(function () {
      syncChecklistFields();
    });
    if (typeof ResizeObserver !== 'undefined') {
      if (list.__qeChecklistRo) {
        try { list.__qeChecklistRo.disconnect(); } catch (eRo) { /* ignore */ }
      }
      list.__qeChecklistRo = new ResizeObserver(function () {
        syncChecklistFields();
      });
      list.__qeChecklistRo.observe(list);
    }

    requestAnimationFrame(function () {
      var inputs = list.querySelectorAll('[data-qe-check-text]');
      if (!inputs.length) return;
      var focusEl = inputs[inputs.length - 1];
      for (var i = 0; i < inputs.length; i++) {
        if (!String(inputs[i].value || '').trim()) {
          focusEl = inputs[i];
          break;
        }
      }
      try { focusEl.focus(); } catch (eFocus) { /* ignore */ }
    });
  }

  function openChecklist() {
    openWindow('tool-checklist', 'Checklist', 'checklist', function (bodyEl) {
      var state = loadChecklistState();
      renderChecklistBody(bodyEl, state);
    }, null, {
      resize: {
        minW: 205,
        maxW: 300,
        defaultW: 280,
        defaultH: 400,
        maxHMargin: 0,
        maxHExtra: 0,
        clampChrome: true
      }
    });
  }

  function openColorPicker() {
    openWindow('tool-color-picker', 'Color picker', 'color-picker', function (bodyEl) {
      bodyEl.innerHTML =
        '<div class="qe-colorpick">' +
          '<input type="color" class="qe-colorpick__native" data-qe-color-native value="#ffffff">' +
          '<input type="text" class="qe-colorpick__hex" data-qe-color-hex value="#ffffff" spellcheck="false">' +
          '<button type="button" class="qe-colorpick__copy" data-qe-color-copy>Copiar HEX</button>' +
          '<p class="qe-colorpick__hint">Úsalo para guías, formas o referencias rápidas.</p>' +
        '</div>';
      var native = bodyEl.querySelector('[data-qe-color-native]');
      var hex = bodyEl.querySelector('[data-qe-color-hex]');
      var copyBtn = bodyEl.querySelector('[data-qe-color-copy]');
      function syncFromNative() {
        if (!native || !hex) return;
        hex.value = normalizeHex(native.value);
      }
      function syncFromHex() {
        if (!native || !hex) return;
        native.value = normalizeHex(hex.value);
        hex.value = native.value;
      }
      if (native) native.addEventListener('input', syncFromNative);
      if (hex) {
        hex.addEventListener('change', syncFromHex);
        hex.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') syncFromHex();
        });
      }
      if (copyBtn && hex) {
        copyBtn.addEventListener('click', function () {
          var val = normalizeHex(hex.value);
          hex.value = val;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).catch(function () {});
          }
        });
      }
    });
  }

  function formatPomodoro(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function openPomodoro() {
    if (!pomodoroLeft || pomodoroLeft < 1) pomodoroLeft = 25 * 60;
    openWindow('tool-pomodoro', 'Pomodoro', 'pomodoro', function (bodyEl) {
      bodyEl.innerHTML =
        '<div class="qe-pomo">' +
          '<div class="qe-pomo__time" data-qe-pomo-display>' + formatPomodoro(pomodoroLeft) + '</div>' +
          '<div class="qe-pomo__actions">' +
            '<button type="button" class="qe-pomo__btn" data-qe-pomo-toggle>Iniciar</button>' +
            '<button type="button" class="qe-pomo__btn qe-pomo__btn--muted" data-qe-pomo-reset>Reiniciar</button>' +
          '</div>' +
        '</div>';
      var display = bodyEl.querySelector('[data-qe-pomo-display]');
      var toggle = bodyEl.querySelector('[data-qe-pomo-toggle]');
      var reset = bodyEl.querySelector('[data-qe-pomo-reset]');
      var running = false;

      function paint() {
        if (display) display.textContent = formatPomodoro(pomodoroLeft);
        if (toggle) toggle.textContent = running ? 'Pausar' : 'Iniciar';
      }

      function tick() {
        if (pomodoroLeft > 0) {
          pomodoroLeft -= 1;
          paint();
          return;
        }
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        running = false;
        paint();
        try {
          if (typeof AdminNotify !== 'undefined' && AdminNotify.info) {
            AdminNotify.info('Pomodoro — tiempo completado');
          }
        } catch (eN) { /* ignore */ }
      }

      if (toggle) {
        toggle.addEventListener('click', function () {
          if (running) {
            running = false;
            if (pomodoroTimer) {
              clearInterval(pomodoroTimer);
              pomodoroTimer = null;
            }
            paint();
            return;
          }
          running = true;
          pomodoroTimer = setInterval(tick, 1000);
          paint();
        });
      }
      if (reset) {
        reset.addEventListener('click', function () {
          running = false;
          if (pomodoroTimer) {
            clearInterval(pomodoroTimer);
            pomodoroTimer = null;
          }
          pomodoroLeft = 25 * 60;
          paint();
        });
      }
    }, closePomodoroTimer);
  }

  function open(toolId) {
    var id = String(toolId || '').toLowerCase();
    if (id === 'tool-calculator' || id === 'calculator') return openCalculator();
    if (id === 'tool-notes' || id === 'notes') return openNotes();
    if (id === 'tool-checklist' || id === 'checklist') return openChecklist();
    if (id === 'tool-color-picker' || id === 'color-picker' || id === 'colorpicker') {
      return openColorPicker();
    }
    if (id === 'tool-pomodoro' || id === 'pomodoro') return openPomodoro();
    return null;
  }

  function getActiveTool() {
    var mgr = wm();
    if (!mgr) return null;
    var items = mgr.listActive();
    for (var i = 0; i < items.length; i++) {
      if (items[i].state === 'visible') return items[i].toolId || items[i].id;
    }
    return items.length ? (items[0].toolId || items[0].id) : null;
  }

  return {
    open: open,
    close: close,
    getActiveTool: getActiveTool
  };
})();
