/* Fixed bottom dock — fullscreen control only */
var BuilderDock = (function () {
  var DOCK_HEIGHT = 56;

  function html() {
    return '<footer class="builder-dock" id="builderDock" role="toolbar" aria-label="Controles del builder">' +
      '<div class="builder-dock-inner">' +
        '<div class="builder-dock-tools">' +
          '<button type="button" class="builder-dock-ctrl" id="builderFullscreenBtn" aria-label="Pantalla completa" data-fullscreen="enter">' +
            BuilderIcons.render('maximize') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  function updateTabs() {}

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
    clearBodyPadding: clearBodyPadding
  };
})();
