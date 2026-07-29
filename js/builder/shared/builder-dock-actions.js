/**
 * BuilderDockActions — V7.1.07 shared Guardar / Republicar chrome.
 * Same buttons Showroom uses; promoted into #boxiesDockActions.
 */
var BuilderDockActions = (function () {
  var promotedNodes = [];

  function html(opts) {
    opts = opts || {};
    var published = !!opts.published;
    return '' +
      '<button type="button" class="builder-header-action-btn" id="builderSaveBtn">Guardar</button>' +
      '<button type="button" class="builder-header-action-btn is-primary" id="builderPublishBtn">' +
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
  }

  function restore() {
    promotedNodes.forEach(function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    promotedNodes = [];
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearPageActions) {
      /* keep Visualizar; clearPageActions may wipe all — only remove our nodes above */
    }
  }

  function setPublished(published) {
    var btn = document.getElementById('builderPublishBtn');
    if (btn) btn.textContent = published ? 'Republicar' : 'Publicar';
  }

  function bind(handlers) {
    handlers = handlers || {};
    var saveBtn = document.getElementById('builderSaveBtn');
    var publishBtn = document.getElementById('builderPublishBtn');
    if (saveBtn && typeof handlers.onSave === 'function') {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handlers.onSave();
      });
    }
    if (publishBtn && typeof handlers.onPublish === 'function') {
      publishBtn.addEventListener('click', function (e) {
        e.preventDefault();
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
    bind: bind
  };
})();
