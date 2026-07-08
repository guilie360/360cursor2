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

  function resolveActiveProjectId() {
    var stored = AdminState.getActiveProjectId();
    if (stored && projects.some(function (p) { return p.id === stored; })) {
      return stored;
    }
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
      AdminState.setActiveProjectId(dropdown.value);
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
