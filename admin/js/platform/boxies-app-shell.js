/**
 * BOXIES App Shell — official application chrome.
 * Source of truth: Builder layout (header + rail + workspace + dock).
 * Modules only swap #builderStepPanel content.
 */
var BoxiesAppShell = (function () {
  function escapeAttr(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /**
   * @param {object} opts
   * @param {string} [opts.appId]
   * @param {string} [opts.title]
   * @param {string} [opts.leftHtml]
   * @param {string} [opts.actionsHtml]
   * @param {string} [opts.railId]
   * @param {string} [opts.railHtml]
   * @param {string} [opts.dockHtml] — omit to skip dock; pass '' for empty footer chrome
   * @param {boolean} [opts.includeDock=true]
   */
  function html(opts) {
    opts = opts || {};
    var appId = escapeAttr(opts.appId || 'builderApp');
    var title = opts.title != null ? String(opts.title) : 'BOXIES';
    var railId = escapeAttr(opts.railId || 'builderProgressRail');
    var dock =
      opts.includeDock === false
        ? ''
        : (opts.dockHtml != null
          ? opts.dockHtml
          : '<footer class="builder-dock" id="builderDock" aria-hidden="true">' +
              '<div class="builder-dock-inner"><div class="builder-dock-tools"></div></div>' +
            '</footer>');

    return (
      '<div class="builder-app" id="' + appId + '">' +
        '<header class="builder-header-fixed">' +
          '<div class="builder-header-left">' + (opts.leftHtml || '') + '</div>' +
          '<span class="builder-header-title">' + title + '</span>' +
          '<div class="builder-header-actions">' + (opts.actionsHtml || '') + '</div>' +
        '</header>' +
        '<aside class="builder-progress-sidebar" id="' + railId + '" aria-label="Navegación">' +
          (opts.railHtml || '') +
        '</aside>' +
        '<div class="builder-workspace">' +
          '<section class="builder-main-panel">' +
            '<div id="builderStepPanel"></div>' +
          '</section>' +
        '</div>' +
      '</div>' +
      dock
    );
  }

  return { html: html };
})();
