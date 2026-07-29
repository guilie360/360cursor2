/* Quotation Builder — sidebar nav (independent from Showroom progress rail). */
var QuotationSidebar = (function () {
  var STEPS = [
    { id: 'config', label: 'Configuración', icon: 'settings' },
    { id: 'hero', label: 'Hero', icon: 'image' },
    { id: 'editor', label: 'Editor', icon: 'pen-tool' },
    { id: 'preview', label: 'Preview', icon: 'eye' }
  ];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function iconHtml(name) {
    if (typeof BuilderIcons !== 'undefined' && typeof BuilderIcons.render === 'function') {
      return BuilderIcons.render(name);
    }
    return '○';
  }

  function getSteps() {
    return STEPS.slice();
  }

  function renderHtml(activeId) {
    var html = '<nav class="quotation-sidebar__nav" aria-label="Quotation Builder">' +
      '<div class="quotation-sidebar__brand">Quotation Room</div>';
    html += STEPS.map(function (step) {
      var active = step.id === activeId;
      return (
        '<button type="button" class="quotation-sidebar__item' + (active ? ' is-current' : '') + '"' +
          ' data-quotation-step="' + escapeHtml(step.id) + '"' +
          ' aria-current="' + (active ? 'page' : 'false') + '"' +
          ' aria-label="' + escapeHtml(step.label) + '">' +
          '<span class="quotation-sidebar__icon" aria-hidden="true">' + iconHtml(step.icon) + '</span>' +
          '<span class="quotation-sidebar__label">' + escapeHtml(step.label) + '</span>' +
        '</button>'
      );
    }).join('');
    html += '</nav>';
    return html;
  }

  function bind(rootEl, onNavigate) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-quotation-step]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-quotation-step');
        if (id && typeof onNavigate === 'function') onNavigate(id);
      });
    });
  }

  function setActive(rootEl, stepId) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-quotation-step]').forEach(function (btn) {
      var on = btn.getAttribute('data-quotation-step') === stepId;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  return {
    STEPS: STEPS,
    getSteps: getSteps,
    renderHtml: renderHtml,
    bind: bind,
    setActive: setActive
  };
})();
