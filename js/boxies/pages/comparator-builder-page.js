/**
 * BOXIES Comparator Builder stub — V7.2.00 architecture prep.
 * Full Comparador Builder (and demo units-compare migration) comes later.
 */
var BoxiesComparatorBuilderPage = (function () {
  var PENDING_OPEN_KEY = 'boxies_pending_showroom_open';

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clearPendingOpen() {
    try { sessionStorage.removeItem(PENDING_OPEN_KEY); } catch (e) {}
    window.__BOXIES_PENDING_OPEN__ = false;
    if (typeof AdminUI !== 'undefined' && AdminUI.hideGlobalBusy) {
      try { AdminUI.hideGlobalBusy(); } catch (e2) {}
    }
  }

  async function mount(host, ctx) {
    clearPendingOpen();
    ctx = ctx || {};
    var projectId = (ctx.projectId || '').trim();
    var slug = (ctx.project || ctx.proyecto || ctx.slug || '').trim();

    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
      BoxiesShell.setProjectContext({
        id: projectId,
        slug: slug,
        name: slug || 'Comparador',
        experienceType: 'comparator'
      });
    }

    host.innerHTML =
      '<div class="boxies-page boxies-placeholder boxies-builder-stub">' +
        '<p class="boxies-page__eyebrow">Comparador</p>' +
        '<h1 class="boxies-page__title">En preparación</h1>' +
        '<p class="boxies-page__desc">' +
          'Los Comparadores ya tienen categoría e infraestructura en Proyectos. ' +
          'El builder dedicado y la migración del comparador demo llegarán después.' +
        '</p>' +
        (projectId
          ? ('<p class="boxies-page__meta">projectId · ' + escapeHtml(projectId) + '</p>')
          : '') +
        '<button type="button" class="boxies-action-btn" id="boxiesComparatorBackProjects">Volver a Proyectos</button>' +
      '</div>';

    var btn = document.getElementById('boxiesComparatorBackProjects');
    if (btn) {
      btn.addEventListener('click', function () {
        if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.setActive) {
          BoxiesExperienceTypes.setActive('comparator');
        }
        BoxiesRouter.navigate('projects');
      });
    }
  }

  function unmount() {
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.clearProjectContext) {
      BoxiesShell.clearProjectContext();
    }
  }

  return {
    id: 'comparator-builder',
    title: 'Comparador Builder',
    mount: mount,
    unmount: unmount
  };
})();
