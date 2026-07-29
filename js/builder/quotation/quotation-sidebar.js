/* Quotation Builder — sidebar uses Showroom builder-rail chrome (V7.1.05). */
var QuotationSidebar = (function () {
  var MARK_DONE = '\u2713';
  var MARK_PENDING = '\u25CB';

  var STEPS = [
    { id: 'config', label: 'Config', checkable: true },
    { id: 'hero', label: 'Hero', checkable: true },
    { id: 'editor', label: 'Editor', checkable: true },
    { id: 'preview', label: 'Preview', checkable: false, auxiliary: true }
  ];

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getSteps() {
    return STEPS.slice();
  }

  function isDone(sectionChecks, step) {
    if (!step.checkable) return false;
    if (sectionChecks && Object.prototype.hasOwnProperty.call(sectionChecks, step.id)) {
      return !!sectionChecks[step.id];
    }
    return false;
  }

  function renderHtml(activeId, sectionChecks) {
    sectionChecks = sectionChecks || {};
    var html = '<div class="builder-rail-list" data-builder-rail-list aria-label="Quotation Builder">';
    html += STEPS.map(function (step) {
      var active = step.id === activeId;
      var done = isDone(sectionChecks, step);
      var cls = 'builder-rail-item';
      if (step.auxiliary) cls += ' is-auxiliary';
      else cls += done ? ' is-done' : ' is-pending';
      if (active) cls += ' is-current';

      var markHtml = step.auxiliary
        ? ''
        : ('<span class="builder-rail-mark" aria-hidden="true">' +
            (done ? MARK_DONE : MARK_PENDING) + '</span>');

      return (
        '<button type="button" class="' + cls + '"' +
          ' data-quotation-step="' + escapeHtml(step.id) + '"' +
          ' data-tooltip="' + escapeHtml(step.label) + '"' +
          ' aria-current="' + (active ? 'page' : 'false') + '"' +
          ' aria-label="' + escapeHtml(step.label) + '">' +
          '<span class="builder-rail-row">' +
            markHtml +
            '<span class="builder-rail-text">' +
              '<span class="builder-rail-label">' + escapeHtml(step.label) + '</span>' +
            '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');
    html += '</div>';
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

  function setActive(rootEl, stepId, sectionChecks) {
    if (!rootEl) return;
    rootEl.innerHTML = renderHtml(stepId, sectionChecks);
  }

  /**
   * Shared page header — same structure as Showroom Builder.
   * Preview (auxiliary) uses spacer instead of checkbox.
   */
  function pageHeaderHtml(stepId, title, desc, sectionChecks) {
    sectionChecks = sectionChecks || {};
    var step = null;
    for (var i = 0; i < STEPS.length; i++) {
      if (STEPS[i].id === stepId) { step = STEPS[i]; break; }
    }
    var checkable = !!(step && step.checkable);
    var checked = checkable && !!sectionChecks[stepId];
    var checkHtml = checkable
      ? ('<label class="builder-section-check" title="Marcar o desmarcar sección en la lista">' +
          '<input type="checkbox" id="builderSectionDoneCheck" data-section-id="' +
            escapeHtml(stepId) + '"' + (checked ? ' checked' : '') + '>' +
          '<span class="builder-section-check-box" aria-hidden="true"></span>' +
        '</label>')
      : '<span class="builder-section-check builder-section-check--spacer" aria-hidden="true"></span>';

    return '' +
      '<header class="builder-page-header">' +
        '<div class="builder-page-header__bar">' +
          '<div class="builder-page-header__main">' +
            '<div class="builder-step-title-row">' +
              checkHtml +
              '<h2 class="builder-step-title">' + escapeHtml(title) + '</h2>' +
            '</div>' +
            (desc
              ? ('<p class="builder-step-desc">' + escapeHtml(desc) + '</p>')
              : '') +
          '</div>' +
        '</div>' +
      '</header>';
  }

  return {
    STEPS: STEPS,
    getSteps: getSteps,
    renderHtml: renderHtml,
    bind: bind,
    setActive: setActive,
    pageHeaderHtml: pageHeaderHtml
  };
})();
