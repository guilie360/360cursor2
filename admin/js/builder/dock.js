/* Fixed bottom dock — step navigation only */
var BuilderDock = (function () {
  var DOCK_HEIGHT = 56;

  function renderTabs(steps, currentStep) {
    return steps.map(function (step, idx) {
      var cls = 'builder-dock-tab';
      if (idx === currentStep) cls += ' is-active';
      return '<button type="button" class="' + cls + '" data-step="' + idx + '"' +
        ' aria-label="' + escapeAttr(step.label) + '" aria-current="' + (idx === currentStep ? 'step' : 'false') + '">' +
        '<span class="builder-dock-tab-indicator" aria-hidden="true"></span>' +
        '<span class="builder-dock-tab-icon" aria-hidden="true">' + BuilderIcons.render(step.icon) + '</span>' +
        '<span class="builder-dock-tab-label">' + escapeHtml(step.shortLabel || step.label) + '</span>' +
        '<span class="builder-dock-tooltip" role="tooltip">' + escapeHtml(step.label) + '</span>' +
      '</button>';
    }).join('');
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(v) {
    return escapeHtml(v);
  }

  function html() {
    return '<footer class="builder-dock" id="builderDock" role="toolbar" aria-label="Navegación del proyecto">' +
      '<div class="builder-dock-inner">' +
        '<div class="builder-dock-tabs" id="builderDockTabs"></div>' +
        '<div class="builder-dock-tools">' +
          '<button type="button" class="builder-dock-ctrl" id="builderFullscreenBtn" aria-label="Pantalla completa" data-fullscreen="enter">' +
            BuilderIcons.render('maximize') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  function updateTabs(rootEl, steps, currentStep) {
    var tabs = rootEl.querySelector('#builderDockTabs');
    if (!tabs) return;
    tabs.innerHTML = renderTabs(steps, currentStep);
  }

  function bindFullscreen(rootEl) {
    var btn = rootEl.querySelector('#builderFullscreenBtn');
    if (!btn) return;

    function syncIcon() {
      var isFs = !!document.fullscreenElement;
      btn.setAttribute('data-fullscreen', isFs ? 'exit' : 'enter');
      btn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.innerHTML = BuilderIcons.render(isFs ? 'minimize' : 'maximize');
    }

    btn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });

    document.addEventListener('fullscreenchange', syncIcon);
    syncIcon();
  }

  function applyBodyPadding() {
    document.documentElement.style.setProperty('--builder-dock-height', DOCK_HEIGHT + 'px');
    document.body.classList.add('builder-has-dock');
    if (typeof BuilderProgressRail !== 'undefined') {
      BuilderProgressRail.applyLayoutVars();
    }
  }

  function clearBodyPadding() {
    document.body.classList.remove('builder-has-dock');
  }

  return {
    DOCK_HEIGHT: DOCK_HEIGHT,
    html: html,
    updateTabs: updateTabs,
    bindFullscreen: bindFullscreen,
    applyBodyPadding: applyBodyPadding,
    clearBodyPadding: clearBodyPadding,
    renderTabs: renderTabs
  };
})();
