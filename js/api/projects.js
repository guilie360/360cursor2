/* Global Admin — showrooms via PlatformAuth (same session as BOXIES).
 * Table remains public.proyectos; UI terminology is Showroom.
 * List order is always display_order ASC (manual).
 * is_public is independent of publicado (landing/marketplace visibility). */
var BoxiesAdmin2ProjectsApi = (function () {
  var SELECT =
    'id, nombre, slug, descripcion, ciudad, estado, publicado, is_public, constructora_id, ' +
    'display_order, created_at, updated_at';

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
      .order('display_order', { ascending: true, nullsFirst: false });

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

  /**
   * Persist drag-and-drop order for the visible list.
   * Uses PlatformAuth directly (AdminApi only exists inside Builder).
   */
  async function reorder(orderedIds) {
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      throw new Error('Lista de orden vacía.');
    }
    var client = getClient();
    var updates = [];
    for (var i = 0; i < orderedIds.length; i++) {
      var id = orderedIds[i];
      if (!id) continue;
      updates.push(
        client
          .from('proyectos')
          .update({ display_order: i + 1 })
          .eq('id', id)
          .select('id, display_order')
          .maybeSingle()
      );
    }
    var results = await Promise.all(updates);
    for (var r = 0; r < results.length; r++) {
      if (results[r].error) {
        throw new Error(results[r].error.message || 'Error guardando el orden');
      }
      if (!results[r].data) {
        throw new Error('No se pudo actualizar el orden (sin permisos).');
      }
    }
    return results.map(function (res) { return res.data; });
  }

  /**
   * Landing / marketplace visibility. Does not touch identity, order, or publicado.
   */
  async function setPublic(projectId, isPublic) {
    if (!projectId) throw new Error('Falta el ID del showroom.');
    var result = await getClient()
      .from('proyectos')
      .update({ is_public: !!isPublic })
      .eq('id', projectId)
      .select('id, is_public')
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message || 'Error actualizando visibilidad pública');
    }
    if (!result.data) {
      throw new Error('No se pudo actualizar la visibilidad (sin permisos).');
    }
    return result.data;
  }

  return { list: list, reorder: reorder, setPublic: setPublic };
})();
