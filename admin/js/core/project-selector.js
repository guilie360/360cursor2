/* Global project selector — syncs AdminState for all dashboard modules */
var ProjectSelector = (function () {
  var projects = [];
  var selectEl = null;
  var initialized = false;

  function dispatchChange(projectId) {
    window.dispatchEvent(new CustomEvent('admin:project-changed', {
      detail: { projectId: projectId }
    }));
  }

  function getSlugFromQuery() {
    try {
      return new URLSearchParams(window.location.search || '').get('proyecto');
    } catch (e) {
      return null;
    }
  }

  function findProjectBySlug(slug) {
    if (!slug) return null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].slug === slug) return projects[i];
    }
    return null;
  }

  function findProjectById(id) {
    if (!id) return null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return projects[i];
    }
    return null;
  }

  function syncUrlSlug(slug) {
    try {
      var url = new URL(window.location.href);
      if (slug) url.searchParams.set('proyecto', slug);
      else url.searchParams.delete('proyecto');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function resolveActiveProjectId() {
    /* Showroom → dashboard: ?proyecto=slug wins when present */
    var fromQuery = findProjectBySlug(getSlugFromQuery());
    if (fromQuery) return fromQuery.id;

    var stored = AdminState.getActiveProjectId();
    if (stored && findProjectById(stored)) return stored;

    return projects.length ? projects[0].id : null;
  }

  function renderSelect() {
    if (!selectEl) return;

    if (!projects.length) {
      selectEl.innerHTML = '<span class="project-selector-empty">Sin proyectos</span>';
      AdminState.setActiveProjectId(null);
      return;
    }

    var activeId = resolveActiveProjectId();
    AdminState.setActiveProjectId(activeId);

    var activeProject = findProjectById(activeId);
    if (activeProject && getSlugFromQuery() !== activeProject.slug) {
      syncUrlSlug(activeProject.slug);
    }

    var html = '<label class="project-selector-label">Proyecto</label>' +
      '<select id="globalProjectSelect" class="project-selector-select">';

    projects.forEach(function (project) {
      var label = project.nombre + (project.publicado ? '' : ' (borrador)');
      html += '<option value="' + project.id + '"' + (project.id === activeId ? ' selected' : '') + '>' +
        AdminUI.escapeHtml(label) + '</option>';
    });

    html += '</select>';
    selectEl.innerHTML = html;

    var dropdown = selectEl.querySelector('#globalProjectSelect');
    dropdown.addEventListener('change', function () {
      var selected = findProjectById(dropdown.value);
      AdminState.setActiveProjectId(dropdown.value);
      syncUrlSlug(selected ? selected.slug : null);
      dispatchChange(dropdown.value);
    });
  }

  async function refresh() {
    projects = await ProyectosApi.listBrief();
    renderSelect();
    if (AdminState.getActiveProjectId()) {
      dispatchChange(AdminState.getActiveProjectId());
    }
  }

  async function init() {
    if (initialized) return refresh();
    selectEl = document.getElementById('projectSelector');
    if (!selectEl) return;
    initialized = true;
    await refresh();
  }

  function getProjects() {
    return projects.slice();
  }

  return {
    init: init,
    refresh: refresh,
    getProjects: getProjects
  };
})();
