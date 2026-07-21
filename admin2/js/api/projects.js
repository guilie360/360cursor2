/* Global Admin — proyectos via PlatformAuth (same session as showrooms) */
var BoxiesAdmin2ProjectsApi = (function () {
  var SELECT =
    'id, nombre, slug, descripcion, ciudad, estado, publicado, constructora_id, created_at, updated_at';

  function getClient() {
    return PlatformAuth.getClient();
  }

  async function list() {
    var result = await getClient()
      .from('proyectos')
      .select(SELECT)
      .order('updated_at', { ascending: false });

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando proyectos');
    }
    return result.data || [];
  }

  return { list: list };
})();
