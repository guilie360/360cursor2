/* Menu Sync — binds builder menu step to proyecto_config.menu_config */
var MenuSyncEngine = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, constructora_id, publicado, ' +
    'constructoras(nombre), ' +
    'proyecto_config(menu_config, titulo_hero)';

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
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

  function requireActive(state, options) {
    options = options || {};
    var active = typeof ActiveProject !== 'undefined' ? ActiveProject.get(state) : null;
    if (active) return active;
    if (options.requireProject) {
      throw new Error('Abre el builder desde el showroom del proyecto para sincronizar el menú.');
    }
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
    var cfg = normalizeConfig(project.proyecto_config) || {};
    var menu = MenuConfig.normalize(cfg.menu_config);
    var constructora = project.constructoras || {};

    if (!menu.projectName) {
      menu.projectName = cfg.titulo_hero || project.nombre || '';
    }
    if (!menu.description) {
      menu.description = constructora.nombre || '';
    }

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
    var active = requireActive(state, options);
    if (!active) return null;

    var menu = MenuConfig.normalize(state.menuConfig || MenuConfig.defaults());
    state.menuConfig = menu;

    var client = AdminApi.getClient();

    var updated = await client
      .from('proyecto_config')
      .update({ menu_config: menu })
      .eq('proyecto_id', active.id)
      .select('proyecto_id, menu_config')
      .maybeSingle();

    if (updated.error) throw new Error(updated.error.message || 'Error guardando menú');

    if (!updated.data) {
      var inserted = await client
        .from('proyecto_config')
        .insert({ proyecto_id: active.id, menu_config: menu })
        .select('proyecto_id, menu_config')
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message || 'Error guardando menú');
    }

    if (menu.projectName) {
      await client
        .from('proyectos')
        .update({ nombre: menu.projectName.trim() })
        .eq('id', active.id);
      state.projectInfo = Object.assign({}, state.projectInfo || {}, { nombre: menu.projectName });
      if (state.activeProject) state.activeProject.nombre = menu.projectName.trim();
    }

    return {
      projectId: active.id,
      slug: active.slug,
      menuConfig: menu
    };
  }

  async function bindFromUrl(state) {
    var active = requireActive(state, {});
    if (!active) {
      ensureMenuState(state);
      return null;
    }
    var project = await fetchProjectById(active.id);
    if (project) bindStateFromProject(state, project, { preferDraft: false });
    else ensureMenuState(state);
    return project;
  }

  return {
    ensureMenuState: ensureMenuState,
    bindFromUrl: bindFromUrl,
    bindStateFromProject: bindStateFromProject,
    sync: sync
  };
})();
