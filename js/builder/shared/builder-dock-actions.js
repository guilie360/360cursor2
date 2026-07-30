/**
 * BuilderDockActions — shared Guardar / Republicar chrome + in-button busy states (V7.1.10).
 * Feedback lives only inside the clicked button (loader). No banners / toasts from this module.
 * States: idle | saving | publishing | success | error
 */
var BuilderDockActions = (function () {
  var promotedNodes = [];
  var phase = 'idle';
  var publishedFlag = false;
  var resetTimer = null;

  function html(opts) {
    opts = opts || {};
    var published = !!opts.published;
    return '' +
      '<button type="button" class="builder-header-action-btn" id="builderSaveBtn" data-dock-idle-label="Guardar">Guardar</button>' +
      '<button type="button" class="builder-header-action-btn is-primary" id="builderPublishBtn" data-dock-idle-label="' +
        (published ? 'Republicar' : 'Publicar') + '">' +
        (published ? 'Republicar' : 'Publicar') +
      '</button>';
  }

  function mountHostHtml(opts) {
    return '<div class="builder-header-actions" hidden aria-hidden="true">' + html(opts) + '</div>';
  }

  function promote(host) {
    var dockActions = document.getElementById('boxiesDockActions');
    var previewBtn = document.getElementById('boxiesPreviewBtn');
    var nested = host && host.querySelector
      ? host.querySelector('.builder-header-actions')
      : null;
    if (!dockActions || !nested) return;

    restore();
    Array.prototype.slice.call(nested.children).forEach(function (btn) {
      btn.setAttribute('data-boxies-page-action', '1');
      btn.classList.add('boxies-btn-secondary');
      btn.classList.remove('is-primary', 'boxies-action-btn');
      if (previewBtn) dockActions.insertBefore(btn, previewBtn);
      else dockActions.appendChild(btn);
      promotedNodes.push(btn);
    });
    if (dockActions.hasAttribute('hidden')) dockActions.removeAttribute('hidden');
    dockActions.hidden = false;
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mount) {
      BuilderDirtyState.mount();
    }
    syncUi();
  }

  function restore() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    phase = 'idle';
    promotedNodes.forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    promotedNodes = [];
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.destroy) {
      BuilderDirtyState.destroy();
    }
  }

  function setPublished(published) {
    publishedFlag = !!published;
    var btn = document.getElementById('builderPublishBtn');
    if (!btn) return;
    var label = publishedFlag ? 'Republicar' : 'Publicar';
    btn.setAttribute('data-dock-idle-label', label);
    if (phase === 'idle') btn.textContent = label;
  }

  function clearBtnClasses(btn) {
    if (!btn) return;
    btn.classList.remove('is-busy', 'is-success', 'is-error');
    btn.removeAttribute('aria-busy');
  }

  function syncUi() {
    var saveBtn = document.getElementById('builderSaveBtn');
    var publishBtn = document.getElementById('builderPublishBtn');
    var busy = phase === 'saving' || phase === 'publishing';

    [saveBtn, publishBtn].forEach(clearBtnClasses);

    if (saveBtn) {
      var saveIdle = saveBtn.getAttribute('data-dock-idle-label') || 'Guardar';
      if (phase === 'saving') {
        saveBtn.classList.add('is-busy');
        saveBtn.setAttribute('aria-busy', 'true');
        saveBtn.innerHTML = '<span class="builder-dock-spinner" aria-hidden="true"></span>';
        saveBtn.disabled = true;
      } else {
        saveBtn.textContent = saveIdle;
        saveBtn.disabled = busy;
      }
    }

    if (publishBtn) {
      var pubIdle = publishBtn.getAttribute('data-dock-idle-label') ||
        (publishedFlag ? 'Republicar' : 'Publicar');
      if (phase === 'publishing') {
        publishBtn.classList.add('is-busy');
        publishBtn.setAttribute('aria-busy', 'true');
        publishBtn.innerHTML = '<span class="builder-dock-spinner" aria-hidden="true"></span>';
        publishBtn.disabled = true;
      } else {
        publishBtn.textContent = pubIdle;
        publishBtn.disabled = busy;
      }
    }
  }

  function setState(next, opts) {
    opts = opts || {};
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    var saveBtn = document.getElementById('builderSaveBtn');
    var publishBtn = document.getElementById('builderPublishBtn');
    if (next === 'saving' && saveBtn) saveBtn.dataset.lastAction = 'save';
    if (next === 'publishing' && publishBtn) publishBtn.dataset.lastAction = 'publish';
    if (next === 'idle') {
      if (saveBtn) delete saveBtn.dataset.lastAction;
      if (publishBtn) delete publishBtn.dataset.lastAction;
    }
    /* V7.1.10 — success/error return immediately to idle label inside the same button.
       No banners. Loader feedback only while saving/publishing. */
    if (next === 'success' || next === 'error') {
      phase = 'idle';
      if (saveBtn) delete saveBtn.dataset.lastAction;
      if (publishBtn) delete publishBtn.dataset.lastAction;
      syncUi();
      return;
    }
    phase = next || 'idle';
    syncUi();
  }

  function getState() {
    return phase;
  }

  function isBusy() {
    return phase === 'saving' || phase === 'publishing';
  }

  function bind(handlers) {
    handlers = handlers || {};
    var saveBtn = document.getElementById('builderSaveBtn');
    var publishBtn = document.getElementById('builderPublishBtn');
    if (saveBtn && typeof handlers.onSave === 'function') {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (isBusy()) return;
        handlers.onSave();
      });
    }
    if (publishBtn && typeof handlers.onPublish === 'function') {
      publishBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (isBusy()) return;
        handlers.onPublish();
      });
    }
  }

  return {
    html: html,
    mountHostHtml: mountHostHtml,
    promote: promote,
    restore: restore,
    setPublished: setPublished,
    setState: setState,
    getState: getState,
    isBusy: isBusy,
    bind: bind
  };
})();
