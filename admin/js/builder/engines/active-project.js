/* ActiveProject — single source of truth for the AI Builder showroom project */
var ActiveProject = (function () {
  var RESERVED_PATH = {
    admin: 1,
    auth: 1,
    css: 1,
    js: 1,
    supabase: 1,
    assets: 1,
    images: 1,
    'wp-content': 1
  };

  var PROJECT_SELECT = 'id, slug, constructora_id, nombre, publicado';

  function fromRow(row) {
    if (!row || !row.id || !row.slug) return null;
    return {
      id: row.id,
      slug: row.slug,
      constructora_id: row.constructora_id || null,
      nombre: row.nombre || ''
    };
  }

  function slugFromPathname() {
    try {
      var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
      if (path === '/' || /^\/index\.html$/i.test(path)) return null;
      var segments = path.split('/').filter(Boolean);
      if (!segments.length) return null;
      var first = segments[0];
      if (RESERVED_PATH[first] || /\.[a-z0-9]+$/i.test(first)) return null;
      return first;
    } catch (e) {
      return null;
    }
  }

  function slugFromQuery() {
    try {
      return new URLSearchParams(window.location.search || '').get('proyecto');
    } catch (e) {
      return null;
    }
  }

  /** pathname (showroom) → ?proyecto= — never from BuilderSession */
  function resolveSlug() {
    return slugFromPathname() || slugFromQuery() || null;
  }

  function get(state) {
    return state && state.activeProject && state.activeProject.id
      ? state.activeProject
      : null;
  }

  function require(state) {
    var active = get(state);
    if (!active) {
      throw new Error(
        'No hay proyecto activo. Abre BOXIES AI desde el showroom (/demo, /demo2, /demo3).'
      );
    }
    return active;
  }

  function set(state, project) {
    if (!state) return null;
    state.activeProject = fromRow(project);
    return state.activeProject;
  }

  function clear(state) {
    if (state) state.activeProject = null;
  }

  async function fetchBySlug(slug) {
    if (!slug || typeof AdminApi === 'undefined') return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('slug', slug)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error buscando proyecto');
    return fromRow(result.data);
  }

  /**
   * Resolve once on Builder open. Writes only state.activeProject.
   * Does not read BuilderSession / draftProjectId / publishResult / AdminState.
   */
  async function bind(state) {
    clear(state);
    var slug = resolveSlug();
    if (!slug) return null;
    var active = await fetchBySlug(slug);
    if (!active) {
      throw new Error('No se pudo resolver el proyecto \'' + slug + '\'.');
    }
    set(state, active);
    return state.activeProject;
  }

  function showroomHref(state) {
    var active = get(state);
    if (!active || !active.slug) {
      throw new Error('No hay proyecto activo para volver al showroom.');
    }
    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.showroomUrl) {
      return PlatformBuilderBridge.showroomUrl(active.slug);
    }
    return '/' + encodeURIComponent(active.slug);
  }

  return {
    fromRow: fromRow,
    resolveSlug: resolveSlug,
    get: get,
    require: require,
    set: set,
    clear: clear,
    bind: bind,
    showroomHref: showroomHref
  };
})();
