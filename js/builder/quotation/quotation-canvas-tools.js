/**
 * QuotationCanvasTools — floating editor utilities (calculator, notes, color picker, pomodoro).
 * Window chrome + lifecycle: QuotationWindowManager.
 */
var QuotationCanvasTools = (function () {
  var NOTES_KEY = 'boxies_qe_canvas_notes_v2';
  var NOTES_KEY_LEGACY = 'boxies_qe_canvas_notes_v1';
  var CHECKLIST_KEY = 'boxies_qe_canvas_checklist_v1';
  var CALC_KEY = 'boxies_qe_canvas_calc_v1';
  var TOOL_MIN_WIDTH = 205;
  var PAGED_TOOL_MIN_HEIGHT = 400;
  var FIXED_TOOL_OPTS = { fixedWidth: TOOL_MIN_WIDTH };
  var CALC_TOOL_OPTS = {
    fixedWidth: TOOL_MIN_WIDTH,
    fixedHeight: PAGED_TOOL_MIN_HEIGHT
  };
  var PAGED_TOOL_RESIZE = {
    minW: TOOL_MIN_WIDTH,
    maxW: 300,
    defaultW: TOOL_MIN_WIDTH,
    defaultH: PAGED_TOOL_MIN_HEIGHT,
    maxHMargin: 0,
    maxHExtra: 0,
    clampChrome: true
  };
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
      resize: windowOpts.resize || null,
      fixedWidth: windowOpts.fixedWidth,
      fixedHeight: windowOpts.fixedHeight,
      clampChrome: windowOpts.clampChrome !== false
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
    return '#000000';
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

  function nextCalcPageId() {
    return 'ca_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function normalizeCalcState(raw) {
    var state = raw && typeof raw === 'object' ? raw : {};
    var pages = Array.isArray(state.pages) ? state.pages : [];
    pages = pages.map(function (page, idx) {
      return {
        id: String(page.id || nextCalcPageId()),
        title: page.title != null ? String(page.title) : ('Página ' + (idx + 1)),
        expr: page.expr != null ? String(page.expr) : '0'
      };
    });
    if (!pages.length) {
      var firstId = nextCalcPageId();
      pages = [{ id: firstId, title: 'Página 1', expr: '0' }];
      state.activePageId = firstId;
    }
    var activePageId = String(state.activePageId || pages[0].id);
    if (!pages.some(function (p) { return p.id === activePageId; })) {
      activePageId = pages[0].id;
    }
    return { activePageId: activePageId, pages: pages };
  }

  function loadCalcState() {
    try {
      var raw = localStorage.getItem(CALC_KEY);
      if (raw) return normalizeCalcState(JSON.parse(raw));
    } catch (eLoad) { /* ignore */ }
    var id = nextCalcPageId();
    return normalizeCalcState({
      activePageId: id,
      pages: [{ id: id, title: 'Página 1', expr: '0' }]
    });
  }

  function saveCalcState(state) {
    try { localStorage.setItem(CALC_KEY, JSON.stringify(state)); } catch (eSave) { /* ignore */ }
  }

  function getActiveCalcPage(state) {
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].id === state.activePageId) return state.pages[i];
    }
    return state.pages[0] || null;
  }

  function calcKeysHtml() {
    var keys = [
      'C', '±', '%', '÷',
      '7', '8', '9', '×',
      '4', '5', '6', '−',
      '1', '2', '3', '+',
      '0', '.', '='
    ];
    return keys.map(function (k, i) {
      var wide = k === '0' && i === keys.length - 3;
      return '<button type="button" class="qe-calc__key' +
        (wide ? ' qe-calc__key--wide' : '') +
        (k === '=' ? ' qe-calc__key--eq' : '') +
        '" data-qe-calc-key="' + k + '">' + k + '</button>';
    }).join('');
  }

  function mapCalcOp(k) {
    if (k === '÷') return '/';
    if (k === '×') return '*';
    if (k === '−') return '-';
    return k;
  }

  function bindCalcKeys(host, state, persist) {
    var display = host.querySelector('[data-qe-calc-display]');

    function activePage() {
      return getActiveCalcPage(state);
    }

    function readExpr() {
      var page = activePage();
      return page ? String(page.expr || '0') : '0';
    }

    function writeExpr(nextExpr) {
      var page = activePage();
      if (!page) return;
      page.expr = nextExpr;
      if (display) display.textContent = nextExpr;
      persist();
    }

    function pressCalcKey(k) {
      var expr = readExpr();
      k = String(k || '');
      if (k === 'C') {
        writeExpr('0');
        return;
      }
      if (k === '±') {
        if (expr.charAt(0) === '-') writeExpr(expr.slice(1));
        else if (expr !== '0') writeExpr('-' + expr);
        return;
      }
      if (k === '=') {
        writeExpr(calcEvaluate(expr));
        return;
      }
      if (k === 'Backspace') {
        if (expr.length <= 1 || expr === 'Error') writeExpr('0');
        else writeExpr(expr.slice(0, -1));
        return;
      }
      var op = mapCalcOp(k);
      if (expr === '0' && op !== '.') expr = '';
      if (expr === 'Error') expr = '';
      writeExpr(expr + op);
    }

    host.__qeCalcSyncDisplay = function () {
      if (display) display.textContent = readExpr();
    };

    host.querySelectorAll('[data-qe-calc-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pressCalcKey(btn.getAttribute('data-qe-calc-key') || '');
      });
    });

    host.setAttribute('tabindex', '-1');
    host.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k >= '0' && k <= '9') {
        e.preventDefault();
        pressCalcKey(k);
        return;
      }
      if (k === '.' || k === ',') {
        e.preventDefault();
        pressCalcKey('.');
        return;
      }
      if (k === '+') { e.preventDefault(); pressCalcKey('+'); return; }
      if (k === '-') { e.preventDefault(); pressCalcKey('−'); return; }
      if (k === '*') { e.preventDefault(); pressCalcKey('×'); return; }
      if (k === '/') { e.preventDefault(); pressCalcKey('÷'); return; }
      if (k === '%') { e.preventDefault(); pressCalcKey('%'); return; }
      if (k === 'Enter' || k === '=') { e.preventDefault(); pressCalcKey('='); return; }
      if (k === 'Escape') { e.preventDefault(); pressCalcKey('C'); return; }
      if (k === 'Backspace') { e.preventDefault(); pressCalcKey('Backspace'); return; }
    });

    host.__qeCalcSyncDisplay();
    requestAnimationFrame(function () {
      try { host.focus(); } catch (eF) { /* ignore */ }
    });
  }

  function renderCalcBody(bodyEl, state) {
    bodyEl.innerHTML =
      '<div class="qe-checklist-shell">' +
        toolPagesTabsHtml(state, {
          pageAttr: 'data-qe-calc-page',
          addPageAttr: 'data-qe-calc-add-page',
          ariaLabel: 'Páginas de calculadora'
        }) +
        '<div class="qe-calc" data-qe-calc-root tabindex="-1">' +
          '<output class="qe-calc__display" data-qe-calc-display>0</output>' +
          '<div class="qe-calc__keys">' + calcKeysHtml() + '</div>' +
        '</div>' +
      '</div>';
    bindCalcShell(bodyEl, state);
  }

  function bindCalcShell(host, state) {
    if (!getActiveCalcPage(state)) return;

    function persist() {
      saveCalcState(state);
    }

    function rerender() {
      renderCalcBody(host, state);
    }

    function syncCalcPage() {
      var calcRoot = host.querySelector('[data-qe-calc-root]');
      if (calcRoot && typeof calcRoot.__qeCalcSyncDisplay === 'function') {
        calcRoot.__qeCalcSyncDisplay();
      }
    }

    host.__qeCalcState = state;

    bindToolPagesShell(host, state, {
      pageAttr: 'data-qe-calc-page',
      addPageAttr: 'data-qe-calc-add-page',
      nextPageId: nextCalcPageId,
      newPageFactory: function (newId, pageCount) {
        return { id: newId, title: 'Página ' + pageCount, expr: '0' };
      },
      persist: persist,
      rerender: rerender,
      onPageSwitch: syncCalcPage
    });

    var calcRoot = host.querySelector('[data-qe-calc-root]');
    if (calcRoot && !calcRoot.dataset.qeCalcBound) {
      calcRoot.dataset.qeCalcBound = '1';
      bindCalcKeys(calcRoot, state, persist);
    } else {
      syncCalcPage();
    }
  }

  function openCalculator() {
    openWindow('tool-calculator', 'Calculadora', 'calculator', function (bodyEl) {
      renderCalcBody(bodyEl, loadCalcState());
    }, null, CALC_TOOL_OPTS);
  }

  function openNotes() {
    openWindow('tool-notes', 'Notas', 'notes', function (bodyEl) {
      renderNotesBody(bodyEl, loadNotesState());
    }, null, { resize: PAGED_TOOL_RESIZE });
  }

  function nextNotesPageId() {
    return 'np_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function normalizeNotesState(raw) {
    var state = raw && typeof raw === 'object' ? raw : {};
    var pages = Array.isArray(state.pages) ? state.pages : [];
    pages = pages.map(function (page, idx) {
      return {
        id: String(page.id || nextNotesPageId()),
        title: page.title != null ? String(page.title) : ('Página ' + (idx + 1)),
        content: page.content != null ? String(page.content) : ''
      };
    });
    if (!pages.length) {
      var firstId = nextNotesPageId();
      pages = [{ id: firstId, title: 'Página 1', content: '' }];
      state.activePageId = firstId;
    }
    var activePageId = String(state.activePageId || pages[0].id);
    if (!pages.some(function (p) { return p.id === activePageId; })) {
      activePageId = pages[0].id;
    }
    return { activePageId: activePageId, pages: pages };
  }

  function loadNotesState() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      if (raw) return normalizeNotesState(JSON.parse(raw));
      var legacy = localStorage.getItem(NOTES_KEY_LEGACY);
      if (legacy != null) {
        var legacyId = nextNotesPageId();
        return normalizeNotesState({
          activePageId: legacyId,
          pages: [{ id: legacyId, title: 'Página 1', content: String(legacy) }]
        });
      }
    } catch (eLoad) { /* ignore */ }
    var id = nextNotesPageId();
    return normalizeNotesState({
      activePageId: id,
      pages: [{ id: id, title: 'Página 1', content: '' }]
    });
  }

  function saveNotesState(state) {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(state)); } catch (eSave) { /* ignore */ }
  }

  function getActiveNotesPage(state) {
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].id === state.activePageId) return state.pages[i];
    }
    return state.pages[0] || null;
  }

  function autoResizeNotesField(field) {
    if (!field) return;
    field.style.height = 'auto';
    var shell = field.closest('.qe-notes-page');
    var max = shell ? Math.max(80, shell.clientHeight - 4) : 9999;
    field.style.height = Math.min(max, Math.max(80, field.scrollHeight)) + 'px';
  }

  function renderNotesBody(bodyEl, state) {
    var page = getActiveNotesPage(state);
    var esc = function (v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    bodyEl.innerHTML =
      '<div class="qe-checklist-shell">' +
        toolPagesTabsHtml(state, {
          pageAttr: 'data-qe-notes-page',
          addPageAttr: 'data-qe-notes-add-page',
          ariaLabel: 'Páginas de notas'
        }) +
        '<div class="qe-notes-page">' +
          '<textarea class="qe-notes__area" data-qe-notes-input rows="1"' +
            ' placeholder="Apuntes de sesión…" spellcheck="true">' +
            esc(page ? page.content : '') +
          '</textarea>' +
        '</div>' +
      '</div>';
    bindNotesShell(bodyEl, state);
  }

  function bindNotesShell(host, state) {
    if (!getActiveNotesPage(state)) return;

    function persist() {
      saveNotesState(state);
    }

    function rerender() {
      renderNotesBody(host, state);
    }

    function saveNotesDraft() {
      var area = host.querySelector('[data-qe-notes-input]');
      var page = getActiveNotesPage(state);
      if (area && page) page.content = area.value;
    }

    function syncNotesPage() {
      var area = host.querySelector('[data-qe-notes-input]');
      var page = getActiveNotesPage(state);
      if (!area || !page) return;
      area.value = page.content || '';
      autoResizeNotesField(area);
    }

    bindToolPagesShell(host, state, {
      pageAttr: 'data-qe-notes-page',
      addPageAttr: 'data-qe-notes-add-page',
      nextPageId: nextNotesPageId,
      newPageFactory: function (newId, pageCount) {
        return { id: newId, title: 'Página ' + pageCount, content: '' };
      },
      persist: persist,
      rerender: rerender,
      saveBeforeSwitch: saveNotesDraft,
      onPageSwitch: syncNotesPage
    });

    var area = host.querySelector('[data-qe-notes-input]');
    if (!area) return;
    if (!area.dataset.qeNotesBound) {
      area.dataset.qeNotesBound = '1';
      area.addEventListener('input', function () {
        var page = getActiveNotesPage(state);
        if (!page) return;
        page.content = area.value;
        persist();
        autoResizeNotesField(area);
      });
    }
    autoResizeNotesField(area);
    requestAnimationFrame(function () {
      autoResizeNotesField(area);
      try { area.focus(); } catch (eF) { /* ignore */ }
    });
    var notesPage = host.querySelector('.qe-notes-page');
    if (notesPage && typeof ResizeObserver !== 'undefined') {
      if (notesPage.__qeNotesRo) {
        try { notesPage.__qeNotesRo.disconnect(); } catch (eRo) { /* ignore */ }
      }
      notesPage.__qeNotesRo = new ResizeObserver(function () {
        autoResizeNotesField(area);
      });
      notesPage.__qeNotesRo.observe(notesPage);
    }
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

  function toolPagesTabButtonsHtml(state, config) {
    config = config || {};
    var pageAttr = config.pageAttr || 'data-qe-check-page';
    var esc = function (v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    return state.pages.map(function (page) {
      var active = page.id === state.activePageId;
      return '<button type="button" class="qe-checklist-tabs__tab' +
        (active ? ' is-active' : '') + '"' +
        ' ' + pageAttr + '="' + esc(page.id) + '"' +
        ' role="tab"' +
        ' aria-selected="' + (active ? 'true' : 'false') + '"' +
        ' title="Clic para abrir · arrastrar para reordenar · doble clic para renombrar">' +
        '<span class="qe-checklist-tabs__tab-label">' + esc(page.title) + '</span>' +
      '</button>';
    }).join('');
  }

  function toolPagesTabsHtml(state, config) {
    config = config || {};
    var addPageAttr = config.addPageAttr || 'data-qe-check-add-page';
    var ariaLabel = config.ariaLabel || 'Páginas';
    var esc = function (v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    return '' +
      '<div class="qe-checklist-tabs" role="tablist" aria-label="' + esc(ariaLabel) + '">' +
        '<div class="qe-checklist-tabs__strip">' +
          '<div class="qe-checklist-tabs__scroll">' + toolPagesTabButtonsHtml(state, config) + '</div>' +
          '<button type="button" class="qe-checklist-tabs__new" ' + addPageAttr +
            ' aria-label="Agregar página" title="Agregar página">+</button>' +
        '</div>' +
      '</div>';
  }

  function syncToolPageTabs(host, state, config) {
    var pageAttr = config.pageAttr || 'data-qe-check-page';
    host.querySelectorAll('[' + pageAttr + ']').forEach(function (tab) {
      var pageId = tab.getAttribute(pageAttr);
      var active = pageId === state.activePageId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function refreshToolPageTabs(host, state, config) {
    var scroll = host.querySelector('.qe-checklist-tabs__scroll');
    if (!scroll) return;
    var savedLeft = scroll.scrollLeft;
    scroll.innerHTML = toolPagesTabButtonsHtml(state, config);
    scroll.scrollLeft = savedLeft;
  }

  function closeToolPageMenu() {
    var existing = document.querySelector('[data-qe-tool-page-menu]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (window.__qeToolPageMenuClose) {
      document.removeEventListener('pointerdown', window.__qeToolPageMenuClose, true);
      document.removeEventListener('keydown', window.__qeToolPageMenuClose, true);
      window.__qeToolPageMenuClose = null;
    }
  }

  function showToolPageMenu(clientX, clientY, items, onPick) {
    closeToolPageMenu();
    var menu = document.createElement('div');
    menu.className = 'qe-tool-page-menu';
    menu.setAttribute('data-qe-tool-page-menu', '1');
    menu.setAttribute('role', 'menu');
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qe-tool-page-menu__item' + (item.danger ? ' is-danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      if (item.disabled) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
      }
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeToolPageMenu();
        if (!item.disabled && onPick) onPick(item.id);
      });
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 720;
    var rect = menu.getBoundingClientRect();
    var left = Math.min(Math.max(8, clientX), vw - rect.width - 8);
    var top = Math.min(Math.max(8, clientY), vh - rect.height - 8);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    window.__qeToolPageMenuClose = function (e) {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'pointerdown' && menu.contains(e.target)) return;
      closeToolPageMenu();
    };
    document.addEventListener('pointerdown', window.__qeToolPageMenuClose, true);
    document.addEventListener('keydown', window.__qeToolPageMenuClose, true);
  }

  function scrollActiveToolPageTabIntoView(host, config) {
    var scroll = host.querySelector('.qe-checklist-tabs__scroll');
    if (!scroll) return;
    var pageAttr = (config && config.pageAttr) || 'data-qe-check-page';
    var active = scroll.querySelector('[' + pageAttr + '].is-active');
    if (!active) return;
    var pad = 8;
    var scrollRect = scroll.getBoundingClientRect();
    var tabRect = active.getBoundingClientRect();
    if (tabRect.left < scrollRect.left + pad) {
      scroll.scrollLeft -= (scrollRect.left + pad) - tabRect.left;
    } else if (tabRect.right > scrollRect.right - pad) {
      scroll.scrollLeft += tabRect.right - (scrollRect.right - pad);
    }
  }

  function bindToolPageTabsScrollAndReorder(host, state, config) {
    config = config || {};
    var pageAttr = config.pageAttr || 'data-qe-check-page';
    var scrollEl = host.querySelector('.qe-checklist-tabs__scroll');
    if (!scrollEl) return;

    var scrollBindKey = (config.pageAttr || 'page') + '|scroll-reorder';
    if (scrollEl.dataset.qeTabsScrollBound === scrollBindKey) return;
    scrollEl.dataset.qeTabsScrollBound = scrollBindKey;

    var persist = config.persist || function () {};
    var tabDrag = null;
    var dropTargetId = null;
    var dropPosition = null;
    var suppressTabClickUntil = 0;

    function clearTabDropMarkers() {
      scrollEl.querySelectorAll('[' + pageAttr + ']').forEach(function (tab) {
        tab.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging');
      });
      dropTargetId = null;
      dropPosition = null;
    }

    function tabDropAt(clientX) {
      var tabs = scrollEl.querySelectorAll('[' + pageAttr + ']');
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var rect = tab.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
          return { id: tab.getAttribute(pageAttr), position: 'before' };
        }
      }
      if (tabs.length) {
        var last = tabs[tabs.length - 1];
        return { id: last.getAttribute(pageAttr), position: 'after' };
      }
      return null;
    }

    function paintTabDropMarker(target) {
      clearTabDropMarkers();
      if (!target || !tabDrag || !tabDrag.dragging) return;
      if (target.id === tabDrag.pageId) return;
      dropTargetId = target.id;
      dropPosition = target.position;
      var tab = scrollEl.querySelector('[' + pageAttr + '="' + target.id + '"]');
      if (tab) tab.classList.add(target.position === 'before' ? 'is-drop-before' : 'is-drop-after');
      if (tabDrag.tab) tabDrag.tab.classList.add('is-dragging');
    }

    function reorderPages(fromId, toId, position) {
      fromId = String(fromId || '');
      toId = String(toId || '');
      if (!fromId || !toId || fromId === toId) return;
      var fromIdx = -1;
      var toIdx = -1;
      for (var i = 0; i < state.pages.length; i++) {
        if (state.pages[i].id === fromId) fromIdx = i;
        if (state.pages[i].id === toId) toIdx = i;
      }
      if (fromIdx < 0 || toIdx < 0) return;
      var moved = state.pages.splice(fromIdx, 1)[0];
      var insertIdx = toIdx;
      if (fromIdx < toIdx) insertIdx--;
      if (position === 'after') insertIdx++;
      state.pages.splice(insertIdx, 0, moved);
      persist();
      refreshToolPageTabs(host, state, config);
      syncToolPageTabs(host, state, config);
    }

    function autoScrollToolPageTabs(clientX) {
      var rect = scrollEl.getBoundingClientRect();
      var edge = 32;
      var speed = 14;
      if (clientX < rect.left + edge) scrollEl.scrollLeft -= speed;
      else if (clientX > rect.right - edge) scrollEl.scrollLeft += speed;
    }

    scrollEl.addEventListener('wheel', function (e) {
      if (scrollEl.scrollWidth <= scrollEl.clientWidth + 1) return;
      var dy = e.deltaY;
      var dx = e.deltaX;
      if (Math.abs(dy) <= Math.abs(dx) && Math.abs(dx) > 0) return;
      if (Math.abs(dy) < 1) return;
      e.preventDefault();
      scrollEl.scrollLeft += dy;
    }, { passive: false });

    scrollEl.addEventListener('pointerdown', function (e) {
      var tab = e.target.closest('[' + pageAttr + ']');
      if (!tab || tab.dataset.renaming === '1') return;
      if (e.button !== 0) return;
      tabDrag = {
        pageId: tab.getAttribute(pageAttr),
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        dragging: false,
        tab: tab
      };
    });

    scrollEl.addEventListener('pointermove', function (e) {
      if (!tabDrag || e.pointerId !== tabDrag.pointerId) return;
      var dist = Math.hypot(e.clientX - tabDrag.startX, e.clientY - tabDrag.startY);
      if (!tabDrag.dragging) {
        if (dist < 6) return;
        tabDrag.dragging = true;
        tabDrag.tab.classList.add('is-dragging');
        try { scrollEl.setPointerCapture(e.pointerId); } catch (eCap) { /* ignore */ }
      }
      e.preventDefault();
      paintTabDropMarker(tabDropAt(e.clientX));
      autoScrollToolPageTabs(e.clientX);
    });

    function finishTabPointer(e) {
      if (!tabDrag || e.pointerId !== tabDrag.pointerId) return;
      var wasDrag = tabDrag.dragging;
      var pageId = tabDrag.pageId;
      if (wasDrag) {
        if (dropTargetId && dropTargetId !== pageId) {
          reorderPages(pageId, dropTargetId, dropPosition);
        }
        suppressTabClickUntil = Date.now() + 320;
      }
      clearTabDropMarkers();
      if (tabDrag.tab) tabDrag.tab.classList.remove('is-dragging');
      tabDrag = null;
      try { scrollEl.releasePointerCapture(e.pointerId); } catch (eRel) { /* ignore */ }
      if (!wasDrag && pageId && config.switchToPage) {
        config.switchToPage(pageId);
      }
    }

    scrollEl.addEventListener('pointerup', finishTabPointer);
    scrollEl.addEventListener('pointercancel', finishTabPointer);

    host.__qeSuppressToolPageTabClick = function () {
      return Date.now() < suppressTabClickUntil;
    };
  }

  function bindToolPagesShell(host, state, config) {
    config = config || {};
    var pageAttr = config.pageAttr || 'data-qe-check-page';
    var addPageAttr = config.addPageAttr || 'data-qe-check-add-page';
    var persist = config.persist || function () {};
    var rerender = config.rerender || function () {};
    var onPageSwitch = config.onPageSwitch || null;
    var saveBeforeSwitch = config.saveBeforeSwitch || null;
    var nextPageId = config.nextPageId || nextChecklistPageId;
    var newPageFactory = config.newPageFactory;
    var bindKey = pageAttr + '|' + addPageAttr;

    function pageById(pageId) {
      pageId = String(pageId || '');
      for (var pi = 0; pi < state.pages.length; pi++) {
        if (state.pages[pi].id === pageId) return state.pages[pi];
      }
      return null;
    }

    function switchToPage(pageId) {
      if (!pageId || pageId === state.activePageId) return;
      if (saveBeforeSwitch) saveBeforeSwitch();
      state.activePageId = pageId;
      persist();
      syncToolPageTabs(host, state, config);
      scrollActiveToolPageTabIntoView(host, config);
      if (onPageSwitch) onPageSwitch(pageId);
      else rerender();
    }

    function deletePage(pageId) {
      if (state.pages.length <= 1) return;
      pageId = String(pageId || '');
      var idx = -1;
      for (var i = 0; i < state.pages.length; i++) {
        if (state.pages[i].id === pageId) idx = i;
      }
      if (idx < 0) return;
      if (saveBeforeSwitch && pageId === state.activePageId) saveBeforeSwitch();
      state.pages.splice(idx, 1);
      if (state.activePageId === pageId) {
        var nextIdx = Math.max(0, idx - 1);
        state.activePageId = state.pages[nextIdx].id;
      }
      persist();
      refreshToolPageTabs(host, state, config);
      syncToolPageTabs(host, state, config);
      scrollActiveToolPageTabIntoView(host, config);
      if (onPageSwitch) onPageSwitch(state.activePageId);
      else rerender();
    }

    function beginPageRename(tab) {
      var pageId = tab.getAttribute(pageAttr);
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
        refreshToolPageTabs(host, state, config);
        syncToolPageTabs(host, state, config);
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

    if (host.dataset.qePagesBound !== bindKey) {
      host.dataset.qePagesBound = bindKey;

      host.addEventListener('click', function (e) {
        var addBtn = e.target.closest('[' + addPageAttr + ']');
        if (addBtn && host.contains(addBtn)) {
          e.preventDefault();
          e.stopPropagation();
          if (saveBeforeSwitch) saveBeforeSwitch();
          var newId = nextPageId();
          var pageCount = state.pages.length + 1;
          state.pages.push(newPageFactory(newId, pageCount));
          state.activePageId = newId;
          persist();
          rerender();
          return;
        }
      });

      host.addEventListener('dblclick', function (e) {
        var tab = e.target.closest('[' + pageAttr + ']');
        if (!tab || !host.contains(tab)) return;
        e.preventDefault();
        e.stopPropagation();
        beginPageRename(tab);
      });

      host.addEventListener('contextmenu', function (e) {
        var tab = e.target.closest('[' + pageAttr + ']');
        if (!tab || !host.contains(tab)) return;
        e.preventDefault();
        e.stopPropagation();
        var pageId = tab.getAttribute(pageAttr);
        showToolPageMenu(e.clientX, e.clientY, [
          { id: 'rename', label: 'Cambiar nombre' },
          { id: 'delete', label: 'Eliminar', danger: true, disabled: state.pages.length <= 1 }
        ], function (action) {
          if (action === 'rename') beginPageRename(tab);
          else if (action === 'delete') deletePage(pageId);
        });
      });
    }

    bindToolPageTabsScrollAndReorder(host, state, {
      pageAttr: pageAttr,
      persist: persist,
      switchToPage: switchToPage
    });
    scrollActiveToolPageTabIntoView(host, config);
  }

  function checklistPagesHtml(state) {
    return toolPagesTabsHtml(state, {
      pageAttr: 'data-qe-check-page',
      addPageAttr: 'data-qe-check-add-page',
      ariaLabel: 'Páginas del checklist'
    });
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
        '<span class="qe-checklist__drag" data-qe-check-drag="' + esc(item.id) + '"' +
          ' aria-hidden="true" title="Arrastrar para reordenar"></span>' +
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
    if (!getActiveChecklistPage(state)) return;

    function persist() {
      saveChecklistState(state);
    }

    function rerender() {
      renderChecklistBody(host, state);
    }

    function syncChecklistPage() {
      if (typeof host.__qeChecklistRefreshList === 'function') {
        host.__qeChecklistRefreshList();
      }
    }

    bindToolPagesShell(host, state, {
      pageAttr: 'data-qe-check-page',
      addPageAttr: 'data-qe-check-add-page',
      nextPageId: nextChecklistPageId,
      newPageFactory: function (newId, pageCount) {
        return {
          id: newId,
          title: 'Página ' + pageCount,
          items: defaultChecklistItems()
        };
      },
      persist: persist,
      rerender: rerender,
      onPageSwitch: syncChecklistPage
    });

    bindChecklistList(host, state, persist);
  }

  function restoreChecklistScroll(el, top) {
    if (!el || top == null || !isFinite(top)) return;
    el.scrollTop = top;
    requestAnimationFrame(function () {
      el.scrollTop = top;
      requestAnimationFrame(function () {
        el.scrollTop = top;
      });
    });
  }

  function moveChecklistRowDom(list, dragId, targetId, position) {
    if (!list || !dragId || !targetId || dragId === targetId) return false;
    var dragRow = list.querySelector('[data-qe-check-row="' + dragId + '"]');
    var targetRow = list.querySelector('[data-qe-check-row="' + targetId + '"]');
    if (!dragRow || !targetRow || dragRow === targetRow) return false;
    if (position === 'before') list.insertBefore(dragRow, targetRow);
    else list.insertBefore(dragRow, targetRow.nextSibling);
    return true;
  }

  function bindChecklistDragReorder(list, items, persist, rebind) {
    var draggingId = null;
    var dropTargetId = null;
    var dropPosition = null;

    function clearDropMarkers() {
      list.querySelectorAll('[data-qe-check-row]').forEach(function (row) {
        row.classList.remove('is-drop-above', 'is-drop-below', 'is-dragging');
      });
      dropTargetId = null;
      dropPosition = null;
    }

    function rowDropAt(clientY) {
      var rows = list.querySelectorAll('[data-qe-check-row]');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rect = row.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          return { id: row.getAttribute('data-qe-check-row'), position: 'before' };
        }
      }
      if (rows.length) {
        var last = rows[rows.length - 1];
        return { id: last.getAttribute('data-qe-check-row'), position: 'after' };
      }
      return null;
    }

    function paintDropMarker(target) {
      clearDropMarkers();
      if (!target || !draggingId || target.id === draggingId) return;
      dropTargetId = target.id;
      dropPosition = target.position;
      var row = list.querySelector('[data-qe-check-row="' + target.id + '"]');
      if (row) row.classList.add(target.position === 'before' ? 'is-drop-above' : 'is-drop-below');
      var dragRow = list.querySelector('[data-qe-check-row="' + draggingId + '"]');
      if (dragRow) dragRow.classList.add('is-dragging');
    }

    function autoScrollChecklist(clientY) {
      var rect = list.getBoundingClientRect();
      var edge = 28;
      var speed = 12;
      if (clientY < rect.top + edge) list.scrollTop -= speed;
      else if (clientY > rect.bottom - edge) list.scrollTop += speed;
    }

    function commitReorder() {
      if (!draggingId || !dropTargetId || draggingId === dropTargetId) {
        clearDropMarkers();
        draggingId = null;
        return;
      }
      var fromIdx = -1;
      var toIdx = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === draggingId) fromIdx = i;
        if (items[i].id === dropTargetId) toIdx = i;
      }
      if (fromIdx < 0 || toIdx < 0) {
        clearDropMarkers();
        draggingId = null;
        return;
      }
      var moved = items.splice(fromIdx, 1)[0];
      var insertIdx = toIdx;
      if (fromIdx < toIdx) insertIdx--;
      if (dropPosition === 'after') insertIdx++;
      items.splice(insertIdx, 0, moved);
      var movedId = draggingId;
      var targetId = dropTargetId;
      var targetPos = dropPosition;
      persist();
      clearDropMarkers();
      draggingId = null;
      if (!moveChecklistRowDom(list, movedId, targetId, targetPos) &&
          typeof rebind === 'function') {
        rebind();
      }
    }

    list.querySelectorAll('[data-qe-check-drag]').forEach(function (handle) {
      handle.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        var row = handle.closest('[data-qe-check-row]');
        if (!row) return;
        draggingId = row.getAttribute('data-qe-check-row');
        row.classList.add('is-dragging');
        try { handle.setPointerCapture(e.pointerId); } catch (eCap) { /* ignore */ }

        function onMove(ev) {
          paintDropMarker(rowDropAt(ev.clientY));
          autoScrollChecklist(ev.clientY);
        }
        function onUp(ev) {
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
          handle.removeEventListener('pointercancel', onUp);
          try { handle.releasePointerCapture(ev.pointerId); } catch (eRel) { /* ignore */ }
          commitReorder();
        }
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
      });
    });
  }

  function bindChecklistList(host, state, persist) {
    var list = host.querySelector('[data-qe-checklist-list]');
    if (!list) return;

    function activeItems() {
      var page = getActiveChecklistPage(state);
      return page ? page.items : [];
    }

    function itemById(id) {
      id = String(id || '');
      var items = activeItems();
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === id) return items[i];
      }
      return null;
    }

    function itemIndexById(id) {
      id = String(id || '');
      var items = activeItems();
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

    function refreshChecklistRows() {
      var items = activeItems();
      var savedTop = list.scrollTop;
      list.innerHTML = items.map(checklistRowHtml).join('');
      restoreChecklistScroll(list, savedTop);
      syncChecklistFields();
      bindChecklistDragReorder(list, items, persist, refreshChecklistRows);
    }

    host.__qeChecklistRefreshList = refreshChecklistRows;

    if (!list.dataset.qeChecklistBound) {
      list.dataset.qeChecklistBound = '1';
      bindChecklistDragReorder(list, activeItems(), persist, refreshChecklistRows);

      list.addEventListener('click', function (e) {
      var delBtn = e.target && e.target.closest ? e.target.closest('[data-qe-check-delete]') : null;
      if (delBtn && list.contains(delBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var delId = delBtn.getAttribute('data-qe-check-delete');
        var delIdx = itemIndexById(delId);
        if (delIdx < 0) return;
        var items = activeItems();
        var delRow = delBtn.closest('[data-qe-check-row]');
        items.splice(delIdx, 1);
        if (!items.length) {
          items.push({ id: nextChecklistId(), text: '', checked: false });
          persist();
          list.innerHTML = items.map(checklistRowHtml).join('');
          syncChecklistFields();
          bindChecklistDragReorder(list, items, persist, refreshChecklistRows);
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
      var items = activeItems();
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
      bindChecklistDragReorder(list, activeItems(), persist, refreshChecklistRows);
    });
    }

    refreshChecklistRows();
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
    }, null, { resize: PAGED_TOOL_RESIZE });
  }

  function openColorPicker() {
    openWindow('tool-color-picker', 'Color picker', 'color-picker', function (bodyEl) {
      bodyEl.innerHTML =
        '<div class="qe-colorpick">' +
          '<button type="button" class="qe-colorpick__swatch" data-qe-color-swatch' +
            ' aria-label="Elegir color" title="Elegir color"></button>' +
          '<input type="color" class="qe-colorpick__native" data-qe-color-native value="#000000"' +
            ' tabindex="-1" aria-hidden="true">' +
          '<input type="text" class="qe-colorpick__hex" data-qe-color-hex value="#000000" spellcheck="false">' +
          '<button type="button" class="qe-colorpick__copy" data-qe-color-copy>Copiar HEX</button>' +
          '<p class="qe-colorpick__hint">Úsalo para guías, formas o referencias rápidas.</p>' +
        '</div>';
      var swatch = bodyEl.querySelector('[data-qe-color-swatch]');
      var native = bodyEl.querySelector('[data-qe-color-native]');
      var hex = bodyEl.querySelector('[data-qe-color-hex]');
      var copyBtn = bodyEl.querySelector('[data-qe-color-copy]');
      function paintSwatch(color) {
        var val = normalizeHex(color);
        if (swatch) swatch.style.backgroundColor = val;
        if (native) native.value = val;
        if (hex) hex.value = val;
      }
      function syncFromNative() {
        if (!native) return;
        paintSwatch(native.value);
      }
      function syncFromHex() {
        if (!hex) return;
        paintSwatch(hex.value);
      }
      paintSwatch('#000000');
      if (swatch && native) {
        swatch.addEventListener('click', function () {
          try { native.showPicker ? native.showPicker() : native.click(); } catch (ePick) {
            try { native.click(); } catch (eClick) { /* ignore */ }
          }
        });
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
          paintSwatch(val);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).catch(function () {});
          }
        });
      }
    }, null, FIXED_TOOL_OPTS);
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
    }, closePomodoroTimer, FIXED_TOOL_OPTS);
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
