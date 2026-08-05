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

  function openWindow(id, title, toolId, mount, onClose) {
    var mgr = wm();
    if (!mgr) return null;
    return mgr.open({
      id: id,
      title: title,
      toolId: toolId,
      mount: mount,
      onClose: onClose
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

  function loadChecklistItems() {
    try {
      var raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(function (it) {
            return {
              id: String(it.id || nextChecklistId()),
              text: it.text != null ? String(it.text) : '',
              checked: !!it.checked
            };
          });
        }
      }
    } catch (eLoad) { /* ignore */ }
    return [{ id: nextChecklistId(), text: '', checked: false }];
  }

  function saveChecklistItems(items) {
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items)); } catch (eSave) { /* ignore */ }
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
        '<input type="text" class="qe-checklist__text"' +
          ' data-qe-check-text="' + esc(item.id) + '"' +
          ' value="' + esc(item.text || '') + '"' +
          ' placeholder="Tarea" spellcheck="true" autocomplete="off">' +
        '<button type="button" class="qe-checklist__del"' +
          ' data-qe-check-delete="' + esc(item.id) + '"' +
          ' aria-label="Eliminar tarea">&times;</button>' +
      '</div>';
  }

  function bindChecklistList(host, items) {
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
          saveChecklistItems(items);
          list.innerHTML = items.map(checklistRowHtml).join('');
          var freshInput = list.querySelector('[data-qe-check-text]');
          if (freshInput) {
            requestAnimationFrame(function () {
              try { freshInput.focus(); } catch (eF) { /* ignore */ }
            });
          }
        } else {
          saveChecklistItems(items);
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
      saveChecklistItems(items);
      syncRowUi(btn.closest('[data-qe-check-row]'), item.checked);
    });

    list.addEventListener('input', function (e) {
      var input = e.target && e.target.closest ? e.target.closest('[data-qe-check-text]') : null;
      if (!input || !list.contains(input)) return;
      var item = itemById(input.getAttribute('data-qe-check-text'));
      if (!item) return;
      item.text = input.value;
      saveChecklistItems(items);
    });

    list.addEventListener('keydown', function (e) {
      var input = e.target && e.target.closest ? e.target.closest('[data-qe-check-text]') : null;
      if (!input || !list.contains(input) || e.key !== 'Enter') return;
      e.preventDefault();
      var idx = itemIndexById(input.getAttribute('data-qe-check-text'));
      if (idx < 0) idx = items.length - 1;
      var currentRow = input.closest('[data-qe-check-row]');
      var newItem = { id: nextChecklistId(), text: '', checked: false };
      items.splice(idx + 1, 0, newItem);
      saveChecklistItems(items);
      var wrap = document.createElement('div');
      wrap.innerHTML = checklistRowHtml(newItem);
      var newRow = wrap.firstElementChild;
      if (currentRow && currentRow.nextSibling) list.insertBefore(newRow, currentRow.nextSibling);
      else if (currentRow) list.appendChild(newRow);
      else list.appendChild(newRow);
      var nextInput = newRow.querySelector('[data-qe-check-text]');
      if (nextInput) {
        requestAnimationFrame(function () {
          try { nextInput.focus(); } catch (eF) { /* ignore */ }
        });
      }
    });

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
      var items = loadChecklistItems();
      bodyEl.innerHTML =
        '<div class="qe-checklist" data-qe-checklist-list>' +
          items.map(checklistRowHtml).join('') +
        '</div>';
      bindChecklistList(bodyEl, items);
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
