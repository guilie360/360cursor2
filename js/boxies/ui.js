/* Admin UI helpers — modal, loading, validation (no business logic) */
var AdminUI = (function () {
  var modalRoot = null;
  var modalBackdrop = null;
  var modalDialog = null;
  var modalOnClose = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureModalRoot() {
    if (modalRoot) return;
    modalRoot = document.createElement('div');
    modalRoot.className = 'admin-modal-root';
    modalRoot.innerHTML =
      '<div class="admin-modal-backdrop" data-modal-close></div>' +
      '<div class="admin-modal" role="dialog" aria-modal="true">' +
        '<div class="admin-modal-header">' +
          '<h2 class="admin-modal-title"></h2>' +
          '<button type="button" class="admin-modal-close" aria-label="Cerrar">&times;</button>' +
        '</div>' +
        '<div class="admin-modal-body"></div>' +
        '<div class="admin-modal-footer"></div>' +
      '</div>';
    document.body.appendChild(modalRoot);
    modalBackdrop = modalRoot.querySelector('.admin-modal-backdrop');
    modalDialog = modalRoot.querySelector('.admin-modal');

    modalRoot.querySelector('.admin-modal-close').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modalRoot.classList.contains('is-open')) closeModal();
    });
  }

  function openModal(options) {
    ensureModalRoot();
    modalOnClose = options && options.onClose ? options.onClose : null;

    modalRoot.querySelector('.admin-modal-title').textContent = options.title || '';
    modalRoot.querySelector('.admin-modal-body').innerHTML = options.bodyHtml || '';
    modalRoot.querySelector('.admin-modal-footer').innerHTML = options.footerHtml || '';

    modalRoot.classList.add('is-open');
    document.body.classList.add('admin-modal-open');

    if (options.onMount) options.onMount(modalRoot);
  }

  function closeModal() {
    if (!modalRoot) return;
    modalRoot.classList.remove('is-open');
    document.body.classList.remove('admin-modal-open');
    if (modalOnClose) {
      var cb = modalOnClose;
      modalOnClose = null;
      cb();
    }
  }

  function confirm(options) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        modalOnClose = null;
        closeModal();
        resolve(!!value);
      }
      openModal({
        title: options.title || 'Confirmar',
        bodyHtml: options.bodyHtml ||
          ('<p class="admin-modal-copy">' + escapeHtml(options.message || '') + '</p>'),
        footerHtml:
          '<button type="button" class="btn-ghost" data-modal-action="cancel">' +
            escapeHtml(options.cancelLabel || 'Cancelar') +
          '</button>' +
          '<button type="button" class="btn-danger" data-modal-action="confirm">' +
            escapeHtml(options.confirmLabel || 'Confirmar') +
          '</button>',
        onMount: function (root) {
          var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
          var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
          if (cancelBtn) {
            cancelBtn.addEventListener('click', function () { finish(false); });
          }
          if (confirmBtn) {
            confirmBtn.addEventListener('click', function () { finish(true); });
          }
        },
        onClose: function () {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }
      });
    });
  }

  function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
      button.disabled = true;
      button.classList.add('loading');
      button.textContent = loadingText || 'Guardando...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = button.dataset.defaultText || button.textContent;
    }
  }

  function isValidEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidSlug(value) {
    return /^[a-z0-9-]+$/.test(value || '');
  }

  function isValidUrl(value) {
    if (!value) return true;
    try {
      var url = /^https?:\/\//i.test(value) ? value : 'https://' + value;
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isValidHexColor(value) {
    if (!value) return true;
    return /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(String(value).trim());
  }

  function normalizeHexColor(value, fallback) {
    var trimmed = String(value == null ? '' : value).trim();
    if (!trimmed) return fallback || null;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(trimmed)) return trimmed;
    return null;
  }

  function normalizeOptionalText(value) {
    var trimmed = String(value == null ? '' : value).trim();
    return trimmed || null;
  }

  function normalizeUrl(value) {
    var trimmed = normalizeOptionalText(value);
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
  }

  function renderLoadingBlock(message) {
    return (
      '<div class="admin-loading-block">' +
        '<div class="admin-spinner" aria-hidden="true"></div>' +
        '<p>' + escapeHtml(message || 'Cargando...') + '</p>' +
      '</div>'
    );
  }

  function renderEmptyState(title, copy) {
    return (
      '<div class="admin-empty-state">' +
        '<div class="admin-empty-title">' + escapeHtml(title) + '</div>' +
        '<div class="admin-empty-copy">' + escapeHtml(copy) + '</div>' +
      '</div>'
    );
  }

  /* Global viewport busy overlay — survives SPA page unmount (create → builder). */
  var globalBusyEl = null;

  function showGlobalBusy(message) {
    var label = message || 'Procesando…';
    if (globalBusyEl) {
      var labelEl = globalBusyEl.querySelector('.boxies-global-busy__label');
      if (labelEl) labelEl.textContent = label;
      globalBusyEl.setAttribute('aria-label', label);
      document.body.classList.add('boxies-is-global-busy');
      document.body.setAttribute('aria-busy', 'true');
      return;
    }
    globalBusyEl = document.createElement('div');
    globalBusyEl.id = 'boxiesGlobalBusy';
    globalBusyEl.className = 'boxies-global-busy';
    globalBusyEl.setAttribute('role', 'alertdialog');
    globalBusyEl.setAttribute('aria-modal', 'true');
    globalBusyEl.setAttribute('aria-busy', 'true');
    globalBusyEl.setAttribute('aria-label', label);
    globalBusyEl.innerHTML =
      '<div class="boxies-global-busy__backdrop" aria-hidden="true"></div>' +
      '<div class="boxies-global-busy__panel" role="status">' +
        '<div class="boxies-global-busy__spinner" aria-hidden="true"></div>' +
        '<p class="boxies-global-busy__label"></p>' +
      '</div>';
    globalBusyEl.querySelector('.boxies-global-busy__label').textContent = label;
    document.body.appendChild(globalBusyEl);
    document.body.classList.add('boxies-is-global-busy');
    document.body.setAttribute('aria-busy', 'true');
  }

  function hideGlobalBusy() {
    if (globalBusyEl && globalBusyEl.parentNode) {
      globalBusyEl.parentNode.removeChild(globalBusyEl);
    }
    globalBusyEl = null;
    document.body.classList.remove('boxies-is-global-busy');
    document.body.classList.remove('boxies-is-creating-showroom');
    document.body.removeAttribute('aria-busy');
  }

  function isGlobalBusy() {
    return !!globalBusyEl;
  }

  return {
    escapeHtml: escapeHtml,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirm,
    setButtonLoading: setButtonLoading,
    isValidEmail: isValidEmail,
    isValidSlug: isValidSlug,
    isValidUrl: isValidUrl,
    isValidHexColor: isValidHexColor,
    normalizeHexColor: normalizeHexColor,
    normalizeOptionalText: normalizeOptionalText,
    normalizeUrl: normalizeUrl,
    renderLoadingBlock: renderLoadingBlock,
    renderEmptyState: renderEmptyState,
    showGlobalBusy: showGlobalBusy,
    hideGlobalBusy: hideGlobalBusy,
    isGlobalBusy: isGlobalBusy
  };
})();
