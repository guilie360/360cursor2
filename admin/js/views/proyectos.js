/* Projects module — full CRUD view */
var ProyectosView = (function () {
  var rootEl = null;
  var projects = [];
  var filteredProjects = [];
  var searchTerm = '';
  var isLoading = false;
  var slugTouched = false;

  function estadoOptions(selected) {
    return Object.keys(ESTADO_LABELS).map(function (key) {
      return '<option value="' + key + '"' + (selected === key ? ' selected' : '') + '>' +
        AdminUI.escapeHtml(ESTADO_LABELS[key]) + '</option>';
    }).join('');
  }

  function publicSiteUrl(slug) {
    if (!slug) return '';
    var origin = window.location.origin;
    var publicPath = origin + '/?proyecto=' + encodeURIComponent(slug);
    return publicPath;
  }

  function renderToolbar() {
    return (
      '<div class="module-toolbar">' +
        '<div class="module-toolbar-left">' +
          '<input type="search" class="admin-input admin-input-search" id="projectsSearch" ' +
            'placeholder="Buscar por nombre, slug o ciudad..." value="' + AdminUI.escapeHtml(searchTerm) + '">' +
        '</div>' +
        '<button type="button" class="btn-primary btn-compact" id="newProjectBtn">Nuevo proyecto</button>' +
      '</div>'
    );
  }

  function renderStatusBadge(project) {
    var publishedClass = project.publicado ? 'badge-success' : 'badge-muted';
    var publishedLabel = project.publicado ? 'Publicado' : 'Borrador';
    return (
      '<span class="admin-badge">' + AdminUI.escapeHtml(ESTADO_LABELS[project.estado] || project.estado) + '</span> ' +
      '<span class="admin-badge ' + publishedClass + '">' + publishedLabel + '</span>'
    );
  }

  function renderTableRows() {
    if (!filteredProjects.length) {
      return (
        '<tr><td colspan="6">' +
          AdminUI.renderEmptyState('No hay proyectos', searchTerm
            ? 'No encontramos resultados para tu búsqueda.'
            : 'Crea tu primer proyecto para empezar a gestionar contenido.') +
        '</td></tr>'
      );
    }

    return filteredProjects.map(function (project) {
      return (
        '<tr data-project-id="' + project.id + '">' +
          '<td data-label="Proyecto"><strong>' + AdminUI.escapeHtml(project.nombre) + '</strong></td>' +
          '<td data-label="Slug"><code>' + AdminUI.escapeHtml(project.slug) + '</code></td>' +
          '<td data-label="Ciudad">' + AdminUI.escapeHtml(project.ciudad || '—') + '</td>' +
          '<td data-label="Estado">' + renderStatusBadge(project) + '</td>' +
          '<td data-label="Actualizado">' + AdminUI.escapeHtml(formatShortDate(project.updated_at)) + '</td>' +
          '<td data-label="Acciones" class="table-actions">' +
            '<button type="button" class="btn-ghost btn-compact" data-action="edit" data-id="' + project.id + '">Editar</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderList() {
    return (
      '<div class="section-header">' +
        '<h1>Proyectos</h1>' +
        '<p>Gestiona los proyectos de tu constructora. El proyecto activo en el header se usa en el resto del panel.</p>' +
      '</div>' +
      renderToolbar() +
      '<div class="panel-card panel-card-flush">' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>Proyecto</th><th>Slug</th><th>Ciudad</th><th>Estado</th><th>Actualizado</th><th></th>' +
            '</tr></thead>' +
            '<tbody id="projectsTableBody">' + renderTableRows() + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }

  function applyFilter() {
    var term = searchTerm.trim().toLowerCase();
    if (!term) {
      filteredProjects = projects.slice();
      return;
    }
    filteredProjects = projects.filter(function (project) {
      return [project.nombre, project.slug, project.ciudad]
        .some(function (value) {
          return String(value || '').toLowerCase().indexOf(term) !== -1;
        });
    });
  }

  function refreshTableBody() {
    applyFilter();
    var tbody = rootEl && rootEl.querySelector('#projectsTableBody');
    if (tbody) tbody.innerHTML = renderTableRows();
  }

  function renderForm(project) {
    var isEdit = !!(project && project.id);
    var values = project || {
      nombre: '',
      slug: '',
      descripcion: '',
      ciudad: '',
      direccion: '',
      latitud: '',
      longitud: '',
      whatsapp: '',
      email: '',
      sitio_web: '',
      instagram_url: '',
      estado: 'preventa',
      publicado: false
    };

    var previewLink = isEdit && values.publicado
      ? '<a class="admin-link" href="' + AdminUI.escapeHtml(publicSiteUrl(values.slug)) + '" target="_blank" rel="noopener">Ver en sitio público</a>'
      : '<span class="admin-help">Publica el proyecto para habilitar el enlace al showroom.</span>';

    return (
      '<form id="projectForm" class="admin-form" novalidate>' +
        (isEdit ? '<input type="hidden" name="id" value="' + values.id + '">' : '') +
        '<div class="admin-form-grid">' +
          '<div class="admin-field admin-field-full">' +
            '<label for="projectNombre">Nombre *</label>' +
            '<input class="admin-input" id="projectNombre" name="nombre" required maxlength="120" value="' + AdminUI.escapeHtml(values.nombre) + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectSlug">Slug *</label>' +
            '<input class="admin-input" id="projectSlug" name="slug" required maxlength="80" value="' + AdminUI.escapeHtml(values.slug) + '">' +
            '<div class="admin-help">Solo minúsculas, números y guiones. URL: ?proyecto=slug</div>' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectEstado">Estado</label>' +
            '<select class="admin-input" id="projectEstado" name="estado">' + estadoOptions(values.estado) + '</select>' +
          '</div>' +
          '<div class="admin-field admin-field-full">' +
            '<label for="projectDescripcion">Descripción</label>' +
            '<textarea class="admin-input admin-textarea" id="projectDescripcion" name="descripcion" rows="3">' +
              AdminUI.escapeHtml(values.descripcion || '') +
            '</textarea>' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectCiudad">Ciudad</label>' +
            '<input class="admin-input" id="projectCiudad" name="ciudad" value="' + AdminUI.escapeHtml(values.ciudad || '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectDireccion">Dirección</label>' +
            '<input class="admin-input" id="projectDireccion" name="direccion" value="' + AdminUI.escapeHtml(values.direccion || '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectLatitud">Latitud</label>' +
            '<input class="admin-input" id="projectLatitud" name="latitud" inputmode="decimal" value="' + AdminUI.escapeHtml(values.latitud != null && values.latitud !== '' ? values.latitud : '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectLongitud">Longitud</label>' +
            '<input class="admin-input" id="projectLongitud" name="longitud" inputmode="decimal" value="' + AdminUI.escapeHtml(values.longitud != null && values.longitud !== '' ? values.longitud : '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectWhatsapp">WhatsApp</label>' +
            '<input class="admin-input" id="projectWhatsapp" name="whatsapp" value="' + AdminUI.escapeHtml(values.whatsapp || '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectEmail">Correo</label>' +
            '<input class="admin-input" id="projectEmail" name="email" type="email" value="' + AdminUI.escapeHtml(values.email || '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectSitioWeb">Sitio web</label>' +
            '<input class="admin-input" id="projectSitioWeb" name="sitio_web" value="' + AdminUI.escapeHtml(values.sitio_web || '') + '">' +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="projectInstagram">Instagram</label>' +
            '<input class="admin-input" id="projectInstagram" name="instagram_url" value="' + AdminUI.escapeHtml(values.instagram_url || '') + '">' +
          '</div>' +
          '<div class="admin-field admin-field-full">' +
            '<label class="admin-checkbox-row">' +
              '<input type="checkbox" id="projectPublicado" name="publicado"' + (values.publicado ? ' checked' : '') + '>' +
              '<span>Publicar en el showroom (sitio público)</span>' +
            '</label>' +
            '<div class="admin-help">' + previewLink + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="admin-form-message" id="projectFormMessage" role="alert"></div>' +
      '</form>'
    );
  }

  function collectFormData(form) {
    return {
      id: form.querySelector('[name="id"]') ? form.querySelector('[name="id"]').value : null,
      nombre: form.nombre.value,
      slug: form.slug.value,
      descripcion: form.descripcion.value,
      ciudad: form.ciudad.value,
      direccion: form.direccion.value,
      latitud: form.latitud.value,
      longitud: form.longitud.value,
      whatsapp: form.whatsapp.value,
      email: form.email.value,
      sitio_web: form.sitio_web.value,
      instagram_url: form.instagram_url.value,
      estado: form.estado.value,
      publicado: form.publicado.checked
    };
  }

  function validateFormData(data) {
    if (!AdminUI.normalizeOptionalText(data.nombre)) {
      return 'El nombre del proyecto es obligatorio.';
    }
    if (!AdminUI.isValidSlug(String(data.slug || '').trim())) {
      return 'El slug debe usar solo letras minúsculas, números y guiones.';
    }
    if (!AdminUI.isValidEmail(String(data.email || '').trim())) {
      return 'El correo electrónico no es válido.';
    }
    if (!AdminUI.isValidUrl(String(data.sitio_web || '').trim())) {
      return 'La URL del sitio web no es válida.';
    }
    if (!AdminUI.isValidUrl(String(data.instagram_url || '').trim())) {
      return 'La URL de Instagram no es válida.';
    }
    if (data.latitud !== '' && data.latitud != null && Number.isNaN(Number(data.latitud))) {
      return 'La latitud debe ser un número válido.';
    }
    if (data.longitud !== '' && data.longitud != null && Number.isNaN(Number(data.longitud))) {
      return 'La longitud debe ser un número válido.';
    }
    return '';
  }

  function setFormMessage(message, type) {
    var el = document.getElementById('projectFormMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'admin-form-message' + (type ? ' ' + type : '');
  }

  function bindFormEvents(project) {
    var form = document.getElementById('projectForm');
    var nombreInput = form.querySelector('#projectNombre');
    var slugInput = form.querySelector('#projectSlug');
    slugTouched = !!(project && project.id);

    slugInput.addEventListener('input', function () {
      slugTouched = true;
    });

    nombreInput.addEventListener('input', function () {
      if (!slugTouched) {
        slugInput.value = generateSlug(nombreInput.value);
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      handleSave(form, project && project.id);
    });
  }

  async function handleSave(form, projectId) {
    var saveBtn = document.getElementById('projectSaveBtn');
    var data = collectFormData(form);
    var validationError = validateFormData(data);
    if (validationError) {
      setFormMessage(validationError, 'error');
      return;
    }

    setFormMessage('');
    AdminUI.setButtonLoading(saveBtn, true, projectId ? 'Guardando...' : 'Creando...');

    try {
      if (projectId) {
        await ProyectosApi.update(projectId, data);
        AdminNotify.success('Proyecto actualizado correctamente.');
      } else {
        var created = await ProyectosApi.create(data);
        AdminState.setActiveProjectId(created.id);
        AdminNotify.success('Proyecto creado correctamente.');
      }

      AdminUI.closeModal();
      await loadProjects(true);
    } catch (err) {
      setFormMessage(err.message || 'No se pudo guardar el proyecto.', 'error');
    } finally {
      AdminUI.setButtonLoading(saveBtn, false);
    }
  }

  async function handleDelete(project) {
    var confirmed = await AdminUI.confirm({
      title: 'Eliminar proyecto',
      message: '¿Eliminar "' + project.nombre + '"? Se borrarán también sus viviendas, archivos y configuración asociada.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar'
    });
    if (!confirmed) return;

    try {
      await ProyectosApi.remove(project.id);
      AdminNotify.success('Proyecto eliminado.');
      AdminUI.closeModal();
      await loadProjects(true);
    } catch (err) {
      AdminNotify.error(err.message || 'No se pudo eliminar el proyecto.');
    }
  }

  function openProjectModal(project) {
    var isEdit = !!(project && project.id);
    AdminUI.openModal({
      title: isEdit ? 'Editar proyecto' : 'Nuevo proyecto',
      bodyHtml: renderForm(project),
      footerHtml:
        (isEdit
          ? '<button type="button" class="btn-danger btn-compact" id="projectDeleteBtn">Eliminar</button>'
          : '<span></span>') +
        '<div class="admin-modal-footer-actions">' +
          '<button type="button" class="btn-ghost btn-compact" data-modal-close-btn>Cancelar</button>' +
          '<button type="submit" form="projectForm" class="btn-primary btn-compact" id="projectSaveBtn">' +
            (isEdit ? 'Guardar cambios' : 'Crear proyecto') +
          '</button>' +
        '</div>',
      onMount: function () {
        bindFormEvents(project);
        var closeBtn = document.querySelector('[data-modal-close-btn]');
        if (closeBtn) closeBtn.addEventListener('click', AdminUI.closeModal);
        if (isEdit) {
          document.getElementById('projectDeleteBtn').addEventListener('click', function () {
            handleDelete(project);
          });
        }
      }
    });
  }

  async function openEditModal(projectId) {
    try {
      var project = await ProyectosApi.getById(projectId);
      if (!project) {
        AdminNotify.error('Proyecto no encontrado.');
        return;
      }
      openProjectModal(project);
    } catch (err) {
      AdminNotify.error(err.message || 'No se pudo cargar el proyecto.');
    }
  }

  function bindListEvents() {
    var searchInput = rootEl.querySelector('#projectsSearch');
    var newBtn = rootEl.querySelector('#newProjectBtn');

    searchInput.addEventListener('input', function () {
      searchTerm = searchInput.value;
      refreshTableBody();
    });

    newBtn.addEventListener('click', function () {
      slugTouched = false;
      openProjectModal(null);
    });

    rootEl.addEventListener('click', function (event) {
      var editBtn = event.target.closest('[data-action="edit"]');
      if (editBtn) openEditModal(editBtn.getAttribute('data-id'));
    });
  }

  async function loadProjects(refreshSelector) {
    isLoading = true;
    if (rootEl) rootEl.innerHTML = AdminUI.renderLoadingBlock('Cargando proyectos...');

    try {
      projects = await ProyectosApi.list();
      applyFilter();
      rootEl.innerHTML = renderList();
      bindListEvents();
      if (refreshSelector) await ProjectSelector.refresh();
    } catch (err) {
      rootEl.innerHTML =
        '<div class="section-header"><h1>Proyectos</h1></div>' +
        AdminUI.renderEmptyState('Error al cargar', err.message || 'Intenta recargar la página.');
      AdminNotify.error(err.message || 'Error cargando proyectos.');
    } finally {
      isLoading = false;
    }
  }

  async function render(container) {
    rootEl = container;
    searchTerm = '';
    await loadProjects(false);
  }

  return { render: render };
})();
