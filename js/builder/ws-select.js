/* BOXIES Workspace custom select — dark UI; syncs to native <select> value/change.
 * V7.2.15 — portal list to document.body so overflow:auto ancestors cannot clip. */
var WorkspaceSelect = (function () {
  var OPEN_CLASS = 'is-open';
  var docBound = false;
  var portalList = null;
  var portalWrap = null;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resetListStyles(list) {
    if (!list) return;
    list.style.position = '';
    list.style.left = '';
    list.style.top = '';
    list.style.bottom = '';
    list.style.width = '';
    list.style.minWidth = '';
    list.style.zIndex = '';
    list.style.maxHeight = '';
  }

  function cleanupOrphanLists() {
    if (portalList && portalWrap && !portalWrap.isConnected) {
      releasePortal();
    }
    document.querySelectorAll('body > .ws-select__list').forEach(function (list) {
      list.hidden = true;
      resetListStyles(list);
      list.remove();
    });
  }

  function releasePortal() {
    if (!portalList) {
      portalWrap = null;
      return;
    }
    resetListStyles(portalList);
    portalList.hidden = true;
    if (portalWrap && portalWrap.isConnected) {
      portalWrap.appendChild(portalList);
    } else if (portalList.parentNode === document.body) {
      portalList.remove();
    }
    portalList = null;
    portalWrap = null;
  }

  function positionPortal(wrap, list) {
    if (!wrap || !list || !wrap.isConnected) {
      releasePortal();
      return;
    }
    var trigger = wrap.querySelector('.ws-select__trigger') || wrap;
    var rect = trigger.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      setOpen(wrap, false);
      return;
    }
    var gap = 4;
    var maxH = 240;
    var spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    var spaceAbove = rect.top - gap - 8;
    var openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
    var height = Math.min(maxH, Math.max(100, openUp ? spaceAbove : spaceBelow));

    list.style.position = 'fixed';
    list.style.left = Math.max(8, Math.round(rect.left)) + 'px';
    list.style.width = Math.max(Math.round(rect.width), 160) + 'px';
    list.style.minWidth = list.style.width;
    list.style.zIndex = '10050';
    list.style.maxHeight = height + 'px';
    if (openUp) {
      list.style.top = 'auto';
      list.style.bottom = Math.max(8, Math.round(window.innerHeight - rect.top + gap)) + 'px';
    } else {
      list.style.bottom = 'auto';
      list.style.top = Math.round(rect.bottom + gap) + 'px';
    }
    if (list.parentNode !== document.body) {
      document.body.appendChild(list);
    }
    portalList = list;
    portalWrap = wrap;
  }

  function closeAll(except) {
    document.querySelectorAll('.ws-select.' + OPEN_CLASS).forEach(function (el) {
      if (except && el === except) return;
      setOpen(el, false);
    });
    cleanupOrphanLists();
  }

  function hasOpen() {
    if (portalList && portalList.parentNode === document.body && !portalList.hidden) return true;
    return !!document.querySelector('.ws-select.' + OPEN_CLASS);
  }

  function getList(wrap) {
    return (wrap && wrap.querySelector('.ws-select__list')) ||
      (portalWrap === wrap ? portalList : null);
  }

  function setOpen(wrap, open) {
    var trigger = wrap.querySelector('.ws-select__trigger');
    var list = getList(wrap);
    wrap.classList.toggle(OPEN_CLASS, !!open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!list) return;
    if (open) {
      list.hidden = false;
      positionPortal(wrap, list);
      var selected = list.querySelector('[aria-selected="true"]');
      if (selected && selected.scrollIntoView) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    } else {
      list.hidden = true;
      if (portalWrap === wrap) releasePortal();
    }
  }

  function syncLabel(wrap, select) {
    var label = wrap.querySelector('.ws-select__value');
    if (!label || !select) return;
    var opt = select.options[select.selectedIndex];
    label.textContent = opt ? String(opt.textContent || opt.value || '') : '';
    wrap.classList.toggle('is-empty', !opt || (!opt.value && !String(opt.textContent || '').trim()));
  }

  function rebuildOptions(wrap, select) {
    var list = getList(wrap);
    if (!list) return;
    var html = '';
    Array.prototype.forEach.call(select.options, function (opt, idx) {
      var selected = idx === select.selectedIndex;
      html +=
        '<div class="ws-select__option' + (selected ? ' is-selected' : '') + '"' +
          ' role="option"' +
          ' tabindex="-1"' +
          ' data-index="' + idx + '"' +
          ' data-value="' + escapeHtml(opt.value) + '"' +
          ' aria-selected="' + (selected ? 'true' : 'false') + '"' +
          (opt.disabled ? ' aria-disabled="true" data-disabled="1"' : '') +
        '>' + escapeHtml(opt.textContent || opt.value) + '</div>';
    });
    list.innerHTML = html;
  }

  function commitValue(wrap, select, index) {
    var opt = select.options[index];
    if (!opt || opt.disabled) return;
    var next = opt.value;
    var changed = String(select.value) !== String(next);
    select.selectedIndex = index;
    if (changed) select.value = next;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (select.matches && select.matches('[data-exp-btn-kind-type]')) {
      console.log('[QE btn-kind] WorkspaceSelect.commitValue', {
        value: next,
        index: index,
        ts: Date.now()
      });
    }
    rebuildOptions(wrap, select);
    syncLabel(wrap, select);
    setOpen(wrap, false);
    var trigger = wrap.querySelector('.ws-select__trigger');
    if (trigger) trigger.focus();
  }

  function moveHighlight(wrap, delta) {
    var list = getList(wrap);
    if (!list) return;
    var options = Array.prototype.slice.call(list.querySelectorAll('.ws-select__option:not([data-disabled])'));
    if (!options.length) return;
    var current = list.querySelector('.ws-select__option.is-active') ||
      list.querySelector('.ws-select__option.is-selected');
    var idx = current ? options.indexOf(current) : -1;
    idx = Math.max(0, Math.min(options.length - 1, idx + delta));
    options.forEach(function (el) { el.classList.remove('is-active'); });
    options[idx].classList.add('is-active');
    if (options[idx].scrollIntoView) options[idx].scrollIntoView({ block: 'nearest' });
  }

  function enhanceOne(select) {
    if (!select || select.getAttribute('data-ws-select-enhanced') === '1') return;
    if (select.multiple) return;

    select.setAttribute('data-ws-select-enhanced', '1');
    select.classList.add('ws-select__native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    var wrap = document.createElement('div');
    wrap.className = 'ws-select';
    if (select.disabled) wrap.classList.add('is-disabled');

    var parent = select.parentNode;
    parent.insertBefore(wrap, select);
    wrap.appendChild(select);

    var id = select.id || ('ws-select-' + Math.random().toString(36).slice(2, 9));
    var listId = id + '-list';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ws-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', listId);
    if (select.disabled) trigger.disabled = true;
    trigger.innerHTML =
      '<span class="ws-select__value"></span>' +
      '<span class="ws-select__chevron" aria-hidden="true"></span>';

    var list = document.createElement('div');
    list.className = 'ws-select__list';
    list.id = listId;
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    wrap.appendChild(trigger);
    wrap.appendChild(list);

    rebuildOptions(wrap, select);
    syncLabel(wrap, select);

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (select.disabled) return;
      var willOpen = !wrap.classList.contains(OPEN_CLASS);
      closeAll(wrap);
      if (willOpen) {
        rebuildOptions(wrap, select);
        syncLabel(wrap, select);
        setOpen(wrap, true);
      } else {
        setOpen(wrap, false);
      }
    });

    list.addEventListener('click', function (e) {
      var opt = e.target.closest('.ws-select__option');
      if (!opt || opt.getAttribute('data-disabled') === '1') return;
      e.preventDefault();
      e.stopPropagation();
      commitValue(wrap, select, parseInt(opt.getAttribute('data-index'), 10));
    });

    list.addEventListener('mouseover', function (e) {
      var opt = e.target.closest('.ws-select__option');
      if (!opt || opt.getAttribute('data-disabled') === '1') return;
      list.querySelectorAll('.ws-select__option.is-active').forEach(function (el) {
        el.classList.remove('is-active');
      });
      opt.classList.add('is-active');
    });

    trigger.addEventListener('keydown', function (e) {
      if (select.disabled) return;
      var open = wrap.classList.contains(OPEN_CLASS);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) {
          rebuildOptions(wrap, select);
          setOpen(wrap, true);
        }
        moveHighlight(wrap, e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!open) {
          rebuildOptions(wrap, select);
          setOpen(wrap, true);
          return;
        }
        var active = list.querySelector('.ws-select__option.is-active') ||
          list.querySelector('.ws-select__option.is-selected');
        if (active) commitValue(wrap, select, parseInt(active.getAttribute('data-index'), 10));
        return;
      }
      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(wrap, false);
        }
        return;
      }
      if (e.key === 'Tab') {
        setOpen(wrap, false);
      }
    });

    select.addEventListener('change', function () {
      rebuildOptions(wrap, select);
      syncLabel(wrap, select);
    });

    var mo = new MutationObserver(function () {
      wrap.classList.toggle('is-disabled', !!select.disabled);
      trigger.disabled = !!select.disabled;
      rebuildOptions(wrap, select);
      syncLabel(wrap, select);
    });
    mo.observe(select, { attributes: true, childList: true, subtree: true, attributeFilter: ['disabled'] });
  }

  function enhance(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('select').forEach(enhanceOne);
    if (!docBound) {
      docBound = true;
      document.addEventListener('click', function (e) {
        if (e.target.closest && (
          e.target.closest('.ws-select') ||
          e.target.closest('.ws-select__list')
        )) return;
        closeAll(null);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll(null);
      });
      window.addEventListener('resize', function () {
        if (portalWrap && portalList && portalWrap.isConnected &&
            portalWrap.classList.contains(OPEN_CLASS)) {
          positionPortal(portalWrap, portalList);
        } else if (portalList && portalWrap && !portalWrap.isConnected) {
          releasePortal();
        }
      });
      window.addEventListener('scroll', function () {
        if (portalWrap && portalList && portalWrap.isConnected &&
            portalWrap.classList.contains(OPEN_CLASS)) {
          positionPortal(portalWrap, portalList);
        } else if (portalList && portalWrap && !portalWrap.isConnected) {
          releasePortal();
        }
      }, true);
      document.addEventListener('pointerdown', function (e) {
        if (e.target.closest && (
          e.target.closest('.ws-select') ||
          e.target.closest('.ws-select__list')
        )) return;
        closeAll(null);
      }, true);
    }
  }

  return { enhance: enhance, closeAll: closeAll, hasOpen: hasOpen };
})();
