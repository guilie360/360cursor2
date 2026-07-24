/* Admin toast notifications — reusable across dashboard modules */
var AdminNotify = (function () {
  var container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'admin-toast-stack';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    return container;
  }

  function show(message, type) {
    if (!message) return;
    var stack = ensureContainer();
    var toast = document.createElement('div');
    toast.className = 'admin-toast admin-toast--' + (type || 'info');
    toast.textContent = message;
    stack.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });

    window.setTimeout(function () {
      toast.classList.remove('is-visible');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4200);
  }

  return {
    success: function (message) { show(message, 'success'); },
    error: function (message) { show(message, 'error'); },
    info: function (message) { show(message, 'info'); }
  };
})();
