/* Global Admin — showrooms via PlatformAuth (same session as BOXIES).
 * Table remains public.proyectos; UI terminology is Showroom. */
var BoxiesAdmin2ProjectsApi = (function () {
  var SELECT =
    'id, nombre, slug, descripcion, ciudad, estado, publicado, constructora_id, created_at, updated_at';

  function getClient() {
    return PlatformAuth.getClient();
  }

  /**
   * @param {{ scope?: object }=} options
   *   options.scope — optional BoxiesShowroomScope viewer context
   */
  async function list(options) {
    options = options || {};
    var query = getClient()
      .from('proyectos')
      .select(SELECT)
      .order('updated_at', { ascending: false });

    if (typeof BoxiesShowroomScope !== 'undefined' && BoxiesShowroomScope.applyListFilter) {
      query = BoxiesShowroomScope.applyListFilter(
        query,
        options.scope || BoxiesShowroomScope.getViewerContext()
      );
    }

    var result = await query;

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando showrooms');
    }
    return result.data || [];
  }

  return { list: list };
})();
