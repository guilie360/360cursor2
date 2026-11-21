/**
 * BoxiesTooltip — single global tooltip for BOXIES chrome/UI.
 * Replaces native browser title tooltips inside .boxies-host.
 */
var BoxiesTooltip = (function () {
  var ROOT_SEL = '.boxies-host';
  var SOURCE_SEL =
    '[data-tooltip],' +
    'button[title],' +
    'a[title],' +
    '[role="button"][title],' +
    '.boxies-logout-icon[title],' +
    '.boxies-header__fs[title],' +
    '.boxies-drag-handle[title],' +
    '.boxies-col-resizer[title],' +
    '.boxies-public-toggle[title],' +
    '.boxies-icon-action[title],' +
    '.builder-menu-icon-btn[title],' +
    '.builder-upload-remove[title],' +
    '.builder-rail-collapse[title],' +
    '.boxies-sidebar-float-toggle[title],' +
    '#boxiesSidebarFloatBtn[title],' +
    '.builder-rail-item[title],' +
    'label[title]';

  var tipEl = null;
  var activeEl = null;
  var showTimer = null;
  var hideTimer = null;
  var bound = false;
  var SHOW_DELAY = 280;
  var HIDE_DELAY = 60;
  var GAP = 8;
  var VIEW_PAD = 10;

  function prefersFineHover() {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  }

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'boxies-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.setAttribute('aria-hidden', 'true');
    tipEl.id = 'boxiesGlobalTooltip';
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function clearTimers() {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function isInteractive(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return (
      tag === 'button' ||
      tag === 'a' ||
      tag === 'summary' ||
      el.getAttribute('role') === 'button' ||
      el.classList.contains('boxies-nav-item') ||
      el.classList.contains('boxies-public-toggle')
    );
  }

  function adopt(el) {
    if (!el || el.nodeType !== 1) return el;
    if (el.getAttribute('data-bx-tt') === '1') return el;
    var title = el.getAttribute('title');
    if (title && title.trim()) {
      if (!el.getAttribute('data-tooltip')) {
        el.setAttribute('data-tooltip', title.trim());
      }
      if (!el.getAttribute('aria-label') && isInteractive(el)) {
        el.setAttribute('aria-label', title.trim());
      }
      el.removeAttribute('title');
    }
    if (el.getAttribute('data-tooltip')) {
      el.setAttribute('data-bx-tt', '1');
    }
    return el;
  }

  function findSource(from) {
    if (!from || from.nodeType !== 1) return null;
    var host = from.closest(ROOT_SEL);
    if (!host) return null;
    if (from.closest('iframe')) return null;
    var el = from.closest(SOURCE_SEL);
    if (!el || !host.contains(el)) return null;
    /* Selection gizmo handles — title tooltips break under CSS transforms (top-left ghost). */
    if (el.getAttribute('data-no-tooltip') === '1' ||
        el.closest('[data-exp-gizmo], .builder-exp-sel-rot-zone, .builder-exp-sel-handle')) {
      return null;
    }
    /* V7.0.06 — platform icon sidebar never shows tooltips */
    if (el.closest('#boxiesNav, #boxiesSidebar') && el.classList.contains('boxies-nav-item')) {
      return null;
    }
    /* Skip plain text fields / password toggles that use title differently if any */
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return null;
    adopt(el);
    var text = (el.getAttribute('data-tooltip') || '').trim();
    if (!text) return null;
    return el;
  }

  function preferredPlacement(el) {
    if (el.closest('.builder-progress-rail, .builder-progress-sidebar')) {
      return 'right';
    }
    if (el.closest('.boxies-row-actions, .table-actions, .boxies-col-actions')) {
      return 'top';
    }
    if (el.closest('.boxies-dock, .boxies-header')) {
      return 'top';
    }
    return 'top';
  }

  function place(el) {
    var tip = ensureTip();
    var rect = el.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var placePref = preferredPlacement(el);
    var top = 0;
    var left = 0;
    var placement = placePref;

    function setPos(p) {
      placement = p;
      if (p === 'right') {
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.right + GAP;
      } else if (p === 'left') {
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.left - tipRect.width - GAP;
      } else if (p === 'bottom') {
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
      } else {
        top = rect.top - tipRect.height - GAP;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
      }
    }

    setPos(placePref);

    /* Collision flip */
    if (placement === 'right' && left + tipRect.width > window.innerWidth - VIEW_PAD) {
      setPos('left');
    }
    if (placement === 'left' && left < VIEW_PAD) {
      setPos('right');
    }
    if (placement === 'top' && top < VIEW_PAD) {
      setPos('bottom');
    }
    if (placement === 'bottom' && top + tipRect.height > window.innerHeight - VIEW_PAD) {
      setPos('top');
    }

    /* Clamp to viewport */
    left = Math.max(VIEW_PAD, Math.min(left, window.innerWidth - tipRect.width - VIEW_PAD));
    top = Math.max(VIEW_PAD, Math.min(top, window.innerHeight - tipRect.height - VIEW_PAD));

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    tip.setAttribute('data-placement', placement);
  }

  function show(el) {
    if (!el) return;
    adopt(el);
    var text = (el.getAttribute('data-tooltip') || '').trim();
    if (!text) return;
    var tip = ensureTip();
    tip.textContent = text;
    tip.classList.remove('is-visible');
    tip.setAttribute('aria-hidden', 'false');
    tip.style.left = '-9999px';
    tip.style.top = '0px';
    /* Measure then place */
    void tip.offsetWidth;
    place(el);
    tip.classList.add('is-visible');
    activeEl = el;
  }

  function hide() {
    clearTimers();
    activeEl = null;
    if (!tipEl) return;
    tipEl.classList.remove('is-visible');
    tipEl.setAttribute('aria-hidden', 'true');
  }

  function scheduleShow(el) {
    clearTimers();
    showTimer = window.setTimeout(function () {
      showTimer = null;
      show(el);
    }, SHOW_DELAY);
  }

  function scheduleHide() {
    clearTimers();
    hideTimer = window.setTimeout(function () {
      hideTimer = null;
      hide();
    }, HIDE_DELAY);
  }

  function onPointerOver(e) {
    if (!prefersFineHover()) return;
    var el = findSource(e.target);
    if (!el) return;
    if (el === activeEl) {
      clearTimers();
      return;
    }
    scheduleShow(el);
  }

  function onPointerOut(e) {
    if (!prefersFineHover()) return;
    var el = findSource(e.target);
    if (!el) return;
    var to = e.relatedTarget;
    if (to && el.contains(to)) return;
    if (activeEl === el || showTimer) scheduleHide();
  }

  function onFocusIn(e) {
    var el = findSource(e.target);
    if (!el) return;
    scheduleShow(el);
  }

  function onFocusOut(e) {
    var el = findSource(e.target);
    if (!el) return;
    scheduleHide();
  }

  function onScrollOrResize() {
    if (activeEl && tipEl && tipEl.classList.contains('is-visible')) {
      place(activeEl);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') hide();
  }

  function migrateRoot(root) {
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll(SOURCE_SEL);
    for (var i = 0; i < nodes.length; i++) {
      adopt(nodes[i]);
    }
  }

  function init() {
    if (bound) {
      migrateRoot(document.querySelector(ROOT_SEL) || document.body);
      return;
    }
    bound = true;
    ensureTip();
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    migrateRoot(document.querySelector(ROOT_SEL) || document.body);
  }

  function refresh(root) {
    migrateRoot(root || document.querySelector(ROOT_SEL) || document.body);
  }

  return {
    init: init,
    refresh: refresh,
    hide: hide,
    adopt: adopt
  };
})();

if (typeof AdminUI !== 'undefined') {
  AdminUI.tooltip = BoxiesTooltip;
}

(function bootBoxiesTooltip() {
  function start() {
    if (!document.body || !document.body.classList.contains('boxies-host')) return;
    BoxiesTooltip.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
