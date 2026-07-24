/* Menu Sync — binds builder menu step to proyecto_config.menu_config */
var MenuSyncEngine = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, constructora_id, publicado, ' +
    'constructoras(nombre), ' +
    'proyecto_config(menu_config, titulo_hero)';

  function getSlugFromUrl() {
    if (typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.getSlugFromUrl) {
      return HeroSyncEngine.getSlugFromUrl();
    }
    try {
      return new URLSearchParams(window.location.search).get('proyecto');
    } catch (e) {
      return null;
    }
  }

  function getProjectIdFromUrl() {
    if (typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.getProjectIdFromUrl) {
      return HeroSyncEngine.getProjectIdFromUrl();
    }
    return null;
  }

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  async function fetchProjectBySlug(slug) {
    if (!slug) return null;
    var constructoraId =
      typeof AdminState !== 'undefined' && AdminState.getConstructoraId
        ? AdminState.getConstructoraId()
        : null;
    var query = AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('slug', slug)
      .limit(2);
    if (constructoraId) query = query.eq('constructora_id', constructoraId);
    var result = await query;
    if (result.error) throw new Error(result.error.message || 'Error cargando proyecto');
    var rows = result.data || [];
    if (rows.length > 1) {
      throw new Error('Slug ambiguo («' + slug + '»). Usa projectId (UUID).');
    }
    return rows[0] || null;
  }

  async function fetchProjectById(id) {
    if (!id) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando proyecto');
    return result.data || null;
  }

  async function resolveProject(state) {
    var id = getProjectIdFromUrl() ||
      (state && state.draftProjectId) ||
      (state && state.publishResult && state.publishResult.proyectoId) ||
      (typeof AdminState !== 'undefined' ? AdminState.getActiveProjectId() : null);
    if (id) {
      var byId = await fetchProjectById(id);
      if (byId) return byId;
      return null;
    }
    var slug = getSlugFromUrl();
    if (slug) return fetchProjectBySlug(slug);
    return null;
  }

  function ensureMenuState(state) {
    if (!state.menuConfig || !Array.isArray(state.menuConfig.items)) {
      state.menuConfig = MenuConfig.defaults();
    } else {
      state.menuConfig = MenuConfig.normalize(state.menuConfig);
    }
    return state.menuConfig;
  }

  function bindStateFromProject(state, project, options) {
    options = options || {};
    if (!project) return state;
    state.draftProjectId = project.id;
    var cfg = normalizeConfig(project.proyecto_config) || {};
    var menu = MenuConfig.normalize(cfg.menu_config);
    var constructora = project.constructoras || {};

    if (!menu.projectName) {
      menu.projectName = project.nombre || cfg.titulo_hero || '';
    }
    if (!menu.description) {
      menu.description = constructora.nombre || '';
    }

    /* Al abrir el builder, la DB manda. El draft de sesión solo se usa en sync explícito. */
    if (options.preferDraft && state.menuConfig && Array.isArray(state.menuConfig.items) && state.menuConfig.items.length) {
      var draft = MenuConfig.normalize(state.menuConfig);
      state.menuConfig = Object.assign({}, menu, {
        projectName: draft.projectName || menu.projectName,
        description: draft.description || menu.description,
        items: draft.items
      });
    } else {
      state.menuConfig = menu;
    }

    return state;
  }

  async function sync(state, options) {
    options = options || {};
    var project = await resolveProject(state);
    if (!project) {
      if (options.requireProject) {
        throw new Error('Abre el builder desde el showroom del proyecto para sincronizar el menú.');
      }
      return null;
    }

    state.draftProjectId = project.id;
    var menu = MenuConfig.normalize(state.menuConfig || MenuConfig.defaults());
    state.menuConfig = menu;

    var client = AdminApi.getClient();

    var updated = await client
      .from('proyecto_config')
      .update({ menu_config: menu })
      .eq('proyecto_id', project.id)
      .select('proyecto_id, menu_config')
      .maybeSingle();

    if (updated.error) throw new Error(updated.error.message || 'Error guardando menú');

    if (!updated.data) {
      var inserted = await client
        .from('proyecto_config')
        .insert({ proyecto_id: project.id, menu_config: menu })
        .select('proyecto_id, menu_config')
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message || 'Error guardando menú');
    }

    if (menu.projectName) {
      await client
        .from('proyectos')
        .update({ nombre: menu.projectName.trim() })
        .eq('id', project.id);
      state.projectInfo = Object.assign({}, state.projectInfo || {}, { nombre: menu.projectName });
    }

    return {
      projectId: project.id,
      slug: project.slug,
      menuConfig: menu
    };
  }

  async function bindFromUrl(state) {
    var project = await resolveProject(state);
    if (project) bindStateFromProject(state, project, { preferDraft: false });
    else ensureMenuState(state);
    return project;
  }

  return {
    resolveProject: resolveProject,
    bindStateFromProject: bindStateFromProject,
    bindFromUrl: bindFromUrl,
    ensureMenuState: ensureMenuState,
    sync: sync
  };
})();
