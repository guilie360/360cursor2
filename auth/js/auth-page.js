/* Shared helpers for auth pages */
var AuthPage = (function () {
  function setMessage(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-message' + (type ? ' ' + type : '');
  }

  function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
      button.disabled = true;
      button.classList.add('loading');
      button.textContent = loadingText || 'Procesando...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = button.dataset.defaultText || button.textContent;
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function showQueryMessage(targetId) {
    try {
      var params = new URLSearchParams(window.location.search);
      var error = params.get('error');
      var success = params.get('success');
      var el = document.getElementById(targetId);
      if (error) setMessage(el, decodeURIComponent(error), 'error');
      if (success) setMessage(el, decodeURIComponent(success), 'success');
    } catch (e) {}
  }

  function bindPasswordToggle(toggleBtn, input) {
    if (!toggleBtn || !input) return;
    toggleBtn.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggleBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
    });
  }

  function bindModalClose() {
    var closeBtn = document.querySelector('.modal-close');
    if (!closeBtn) return;
    closeBtn.addEventListener('click', function () {
      if (typeof AuthRedirects !== 'undefined') {
        window.location.href = AuthRedirects.publicHome();
      } else {
        window.location.href = '../index.html';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindModalClose);
  } else {
    bindModalClose();
  }

  return {
    setMessage: setMessage,
    setButtonLoading: setButtonLoading,
    isValidEmail: isValidEmail,
    showQueryMessage: showQueryMessage,
    bindPasswordToggle: bindPasswordToggle
  };
})();
