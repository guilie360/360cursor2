/* Global Admin — projects via PlatformAuth (same session as BOXIES).
 * Table remains public.proyectos; filtered by experience_type (V7.2.00).
 * List order is always display_order ASC (manual).
 * is_public is independent of publicado (marketplace visibility).
 * createFromTemplate / cloneProject use SQL RPCs (single clone engine).
 * Plantillas: experience_type=template (listed without is_system_template filter). */
var BoxiesAdmin2ProjectsApi = (function () {
  var SELECT =
    'id, nombre, slug, descripcion, ciudad, estado, publicado, is_public, constructora_id, ' +
    'display_order, is_system_template, experience_type, template_id, created_at, updated_at';

  function resolveExperienceType(options) {
    options = options || {};
    var raw =
      options.experienceType ||
      options.experience_type ||
      null;
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.normalize) {
      return BoxiesExperienceTypes.normalize(raw || 'showroom');
    }
    var t = String(raw == null ? 'showroom' : raw).trim().toLowerCase();
    if (t === 'landing' || t === 'landings') t = 'comparator';
    var allowed = {
      showroom: 1,
      presentation: 1,
      quotation: 1,
      comparator: 1,
      catalog: 1,
      template: 1
    };
    return allowed[t] ? t : 'showroom';
  }

  function getClient() {
    return PlatformAuth.getClient();
  }

  function resolveConstructoraId(options) {
    options = options || {};
    if (options.constructoraId) return options.constructoraId;
    if (typeof BoxiesShowroomScope !== 'undefined' && BoxiesShowroomScope.getViewerContext) {
      var ctx = BoxiesShowroomScope.getViewerContext(options.scope);
      if (ctx && ctx.constructoraId) return ctx.constructoraId;
    }
    return null;
  }

  function unwrapRpcProject(result, fallback) {
    if (result.error) {
      throw new Error(result.error.message || fallback || 'Error de API');
    }
    var row = result.data;
    if (Array.isArray(row)) row = row[0];
    if (!row || !row.id) {
      throw new Error(fallback || 'No se pudo completar la operación.');
    }
    return row;
  }

  /**
   * @param {{ scope?: object, experienceType?: string }=} options
   */
  async function list(options) {
    options = options || {};
    var experienceType = resolveExperienceType(options);
    var query = getClient()
      .from('proyectos')
      .select(SELECT)
      .eq('experience_type', experienceType)
      .order('display_order', { ascending: true, nullsFirst: false });

    /* Content projects hide the system bootstrap template; Plantillas tab lists templates. */
    if (experienceType !== 'template') {
      query = query.eq('is_system_template', false);
    }

    if (typeof BoxiesShowroomScope !== 'undefined' && BoxiesShowroomScope.applyListFilter) {
      query = BoxiesShowroomScope.applyListFilter(
        query,
        options.scope || BoxiesShowroomScope.getViewerContext()
      );
    }

    var result = await query;

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando proyectos');
    }
    return result.data || [];
  }

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

  async function createFromTemplate(options) {
    options = options || {};
    var args = {
      p_experience_type: resolveExperienceType(options)
    };
    var constructoraId = resolveConstructoraId(options);
    if (constructoraId) args.p_constructora_id = constructoraId;
    var result = await getClient().rpc('create_showroom_from_template', args);
    return unwrapRpcProject(result, 'Error creando experiencia desde plantilla');
  }

  async function cloneProject(projectId, options) {
    if (!projectId) throw new Error('Falta el ID del showroom a clonar.');
    options = options || {};
    var args = {
      p_source_id: projectId,
      p_as_system_template: false
    };
    var constructoraId = resolveConstructoraId(options);
    if (constructoraId) args.p_constructora_id = constructoraId;
    if (options.nombre) args.p_nombre = options.nombre;
    if (options.slug) args.p_slug = options.slug;
    var result = await getClient().rpc('clone_showroom', args);
    return unwrapRpcProject(result, 'Error clonando showroom');
  }

  async function remove(projectId) {
    if (!projectId) throw new Error('Falta el ID del showroom.');
    var result = await getClient()
      .from('proyectos')
      .delete()
      .eq('id', projectId);
    if (result.error) {
      throw new Error(result.error.message || 'Error eliminando showroom');
    }
    return true;
  }

  return {
    list: list,
    reorder: reorder,
    setPublic: setPublic,
    createFromTemplate: createFromTemplate,
    cloneProject: cloneProject,
    remove: remove
  };
})();
