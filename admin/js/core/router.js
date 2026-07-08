/* Admin router — section registry for dashboard modules (Phase 3+) */
var AdminRouter = (function () {
  var sections = {};
  var currentSectionId = null;

  function register(sectionId, config) {
    sections[sectionId] = config || {};
  }

  function getSection(sectionId) {
    return sections[sectionId] || null;
  }

  function getCurrentSectionId() {
    return currentSectionId;
  }

  async function navigate(sectionId, container) {
    var section = sections[sectionId];
    if (!section || !container) return;

    if (currentSectionId && sections[currentSectionId] && sections[currentSectionId].onLeave) {
      await sections[currentSectionId].onLeave();
    }

    currentSectionId = sectionId;
    container.innerHTML = '';

    if (section.render) {
      await section.render(container);
    }
  }

  function bindNavigation(navRoot, contentRoot) {
    if (!navRoot || !contentRoot) return;

    navRoot.addEventListener('click', function (event) {
      var button = event.target.closest('[data-section]');
      if (!button) return;

      var sectionId = button.getAttribute('data-section');
      navRoot.querySelectorAll('[data-section]').forEach(function (el) {
        el.classList.toggle('active', el === button);
      });
      navigate(sectionId, contentRoot);
    });
  }

  return {
    register: register,
    getSection: getSection,
    getCurrentSectionId: getCurrentSectionId,
    navigate: navigate,
    bindNavigation: bindNavigation
  };
})();
