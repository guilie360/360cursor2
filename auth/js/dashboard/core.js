/* Visitor dashboard — widget registry and shared helpers */
var VisitorDashboard = (function () {
  var widgets = [];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function register(widget) {
    if (!widget || !widget.id) return;
    widgets.push(widget);
    widgets.sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  function createWidgetEl(id, extraClass) {
    var el = document.createElement('section');
    el.className = 'dash-widget' + (extraClass ? ' ' + extraClass : '');
    el.id = 'dashWidget-' + id;
    el.setAttribute('data-widget', id);
    return el;
  }

  function renderHome(container, ctx) {
    if (!container) return;
    container.textContent = '';
    widgets.forEach(function (widget) {
      var node = null;
      if (widget.id === 'settings' && typeof widget.renderTeaser === 'function') {
        node = widget.renderTeaser(ctx);
      } else if (typeof widget.render === 'function') {
        node = widget.render(ctx);
      }
      if (node) container.appendChild(node);
    });
  }

  function getWidget(id) {
    for (var i = 0; i < widgets.length; i++) {
      if (widgets[i].id === id) return widgets[i];
    }
    return null;
  }

  return {
    register: register,
    renderHome: renderHome,
    getWidget: getWidget,
    escapeHtml: escapeHtml,
    createWidgetEl: createWidgetEl
  };
})();
