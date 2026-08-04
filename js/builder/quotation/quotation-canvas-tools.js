/**
 * QuotationCanvasTools — floating editor utilities (calculator, notes, color picker, pomodoro).
 */
var QuotationCanvasTools = (function () {
  var HOST_ID = 'qeCanvasToolsHost';
  var NOTES_KEY = 'boxies_qe_canvas_notes_v1';
  var activeTool = null;
  var pomodoroTimer = null;
  var pomodoroLeft = 25 * 60;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ensureHost() {
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.className = 'qe-canvas-tools-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function shellHtml(title, bodyHtml, toolId) {
    return '' +
      '<div class="qe-canvas-tool-float" data-qe-canvas-tool="' + escapeHtml(toolId) + '">' +
        '<div class="qe-canvas-tool-float__head">' +
          '<span class="qe-canvas-tool-float__title">' + escapeHtml(title) + '</span>' +
          '<button type="button" class="qe-canvas-tool-float__close" data-qe-canvas-tool-close' +
            ' aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<div class="qe-canvas-tool-float__body">' + bodyHtml + '</div>' +
      '</div>';
  }

  function close() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    activeTool = null;
    var host = document.getElementById(HOST_ID);
    if (host) host.innerHTML = '';
  }

  function bindClose(host) {
    if (!host) return;
    host.querySelectorAll('[data-qe-canvas-tool-close]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        close();
      });
    });
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
        '" data-qe-calc-key="' + escapeHtml(k) + '">' + escapeHtml(k) + '</button>';
    }).join('');
    var host = ensureHost();
    host.innerHTML = shellHtml('Calculadora',
      '<div class="qe-calc">' +
        '<output class="qe-calc__display" data-qe-calc-display>0</output>' +
        '<div class="qe-calc__keys">' + btns + '</div>' +
      '</div>',
      'calculator');
    bindClose(host);
    var display = host.querySelector('[data-qe-calc-display]');
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
    host.querySelectorAll('[data-qe-calc-key]').forEach(function (btn) {
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
    activeTool = 'calculator';
  }

  function openNotes() {
    var saved = '';
    try { saved = localStorage.getItem(NOTES_KEY) || ''; } catch (eLs) { /* ignore */ }
    var host = ensureHost();
    host.innerHTML = shellHtml('Notas',
      '<textarea class="qe-notes__area" data-qe-notes-input rows="8"' +
        ' placeholder="Apuntes de sesión…" spellcheck="true"></textarea>',
      'notes');
    bindClose(host);
    var area = host.querySelector('[data-qe-notes-input]');
    if (area) {
      area.value = saved;
      area.addEventListener('input', function () {
        try { localStorage.setItem(NOTES_KEY, area.value); } catch (eSave) { /* ignore */ }
      });
      requestAnimationFrame(function () {
        try { area.focus(); } catch (eF) { /* ignore */ }
      });
    }
    activeTool = 'notes';
  }

  function openColorPicker() {
    var host = ensureHost();
    host.innerHTML = shellHtml('Color picker',
      '<div class="qe-colorpick">' +
        '<input type="color" class="qe-colorpick__native" data-qe-color-native value="#ffffff">' +
        '<input type="text" class="qe-colorpick__hex" data-qe-color-hex value="#ffffff" spellcheck="false">' +
        '<button type="button" class="qe-colorpick__copy" data-qe-color-copy>Copiar HEX</button>' +
        '<p class="qe-colorpick__hint">Úsalo para guías, formas o referencias rápidas.</p>' +
      '</div>',
      'color-picker');
    bindClose(host);
    var native = host.querySelector('[data-qe-color-native]');
    var hex = host.querySelector('[data-qe-color-hex]');
    var copyBtn = host.querySelector('[data-qe-color-copy]');
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
    activeTool = 'color-picker';
  }

  function formatPomodoro(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function openPomodoro() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    if (!pomodoroLeft || pomodoroLeft < 1) pomodoroLeft = 25 * 60;
    var host = ensureHost();
    host.innerHTML = shellHtml('Pomodoro',
      '<div class="qe-pomo">' +
        '<div class="qe-pomo__time" data-qe-pomo-display>' + formatPomodoro(pomodoroLeft) + '</div>' +
        '<div class="qe-pomo__actions">' +
          '<button type="button" class="qe-pomo__btn" data-qe-pomo-toggle>Iniciar</button>' +
          '<button type="button" class="qe-pomo__btn qe-pomo__btn--muted" data-qe-pomo-reset>Reiniciar</button>' +
        '</div>' +
      '</div>',
      'pomodoro');
    bindClose(host);
    var display = host.querySelector('[data-qe-pomo-display]');
    var toggle = host.querySelector('[data-qe-pomo-toggle]');
    var reset = host.querySelector('[data-qe-pomo-reset]');
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
    activeTool = 'pomodoro';
  }

  function open(toolId) {
    var id = String(toolId || '').toLowerCase();
    if (id === 'tool-calculator' || id === 'calculator') return openCalculator();
    if (id === 'tool-notes' || id === 'notes') return openNotes();
    if (id === 'tool-color-picker' || id === 'color-picker' || id === 'colorpicker') {
      return openColorPicker();
    }
    if (id === 'tool-pomodoro' || id === 'pomodoro') return openPomodoro();
    return null;
  }

  return {
    open: open,
    close: close,
    getActiveTool: function () { return activeTool; }
  };
})();
