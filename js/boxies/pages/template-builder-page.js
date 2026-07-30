/**
 * BOXIES Template Builder stub — V7.2.00 architecture prep.
 * Full Template Builder comes later; reuses Shell chrome only.
 */
var BoxiesTemplateBuilderPage = (function () {
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
        name: slug || 'Plantilla',
        experienceType: 'template'
      });
    }

    host.innerHTML =
      '<div class="boxies-page boxies-placeholder boxies-builder-stub">' +
        '<p class="boxies-page__eyebrow">Template Builder</p>' +
        '<h1 class="boxies-page__title">En preparación</h1>' +
        '<p class="boxies-page__desc">' +
          'Las Plantillas ya son un recurso de primer nivel en Proyectos. ' +
          'El editor de estructura reutilizable llegará en una versión posterior.' +
        '</p>' +
        (projectId
          ? ('<p class="boxies-page__meta">projectId · ' + escapeHtml(projectId) + '</p>')
          : '') +
        '<button type="button" class="boxies-action-btn" id="boxiesTemplateBackProjects">Volver a Proyectos</button>' +
      '</div>';

    var btn = document.getElementById('boxiesTemplateBackProjects');
    if (btn) {
      btn.addEventListener('click', function () {
        if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.setActive) {
          BoxiesExperienceTypes.setActive('template');
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
    id: 'template-builder',
    title: 'Template Builder',
    mount: mount,
    unmount: unmount
  };
})();
