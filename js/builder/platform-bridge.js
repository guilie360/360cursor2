/* Platform bridge — lets builder engines use PlatformAuth instead of Admin CMS APIs */
var PlatformBuilderBridge = (function () {
  var constructoraId = null;
  var profile = null;

  function getClient() {
    return PlatformAuth.getClient();
  }

  function unwrap(result, fallbackMessage) {
    if (result.error) {
      throw new Error(result.error.message || fallbackMessage || 'Error de API');
    }
    return result.data;
  }

    async function resolveConstructoraId() {
    var sessionProfile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    if (sessionProfile && sessionProfile.constructora_id) {
      return sessionProfile.constructora_id;
    }

    var projectId = null;
    var slug = null;
    try {
      var params = new URLSearchParams(window.location.search);
      projectId = params.get('projectId') || params.get('proyectoId');
      slug = params.get('proyecto') || params.get('project');
      if (projectId && !/^[0-9a-f-]{36}$/i.test(projectId)) projectId = null;
      if (slug && /^[0-9a-f-]{36}$/i.test(slug)) {
        projectId = projectId || slug;
        slug = null;
      }
    } catch (e) {}

    if (projectId) {
      var byId = await getClient()
        .from('proyectos')
        .select('constructora_id')
        .eq('id', projectId)
        .maybeSingle();
      if (byId.data && byId.data.constructora_id) {
        return byId.data.constructora_id;
      }
    }

    if (slug) {
      var bySlug = await getClient()
        .from('proyectos')
        .select('constructora_id')
        .eq('slug', slug)
        .limit(2);
      if (bySlug.error) throw new Error(bySlug.error.message || 'Error resolviendo constructora');
      var slugRows = bySlug.data || [];
      if (slugRows.length === 1 && slugRows[0].constructora_id) {
        return slugRows[0].constructora_id;
      }
    }

    if (sessionProfile && sessionProfile.id) {
      var byVisitor = await getClient()
        .from('visitantes')
        .select('constructora_id')
        .eq('auth_user_id', sessionProfile.auth_user_id || sessionProfile.id)
        .maybeSingle();
      if (byVisitor.data && byVisitor.data.constructora_id) {
        return byVisitor.data.constructora_id;
      }
    }

    return null;
  }

  async function init() {
    profile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    constructoraId = await resolveConstructoraId();
    installShims();
    return { profile: profile, constructoraId: constructoraId };
  }

  function installShims() {
    window.AdminApi = {
      getClient: getClient,
      unwrap: unwrap,
      assertActiveProfile: function () { return profile; }
    };

    window.AdminState = {
      getProfile: function () { return profile; },
      getConstructoraId: function () { return constructoraId; },
      isAdmin: function () {
        return typeof PlatformRoles !== 'undefined' &&
          PlatformRoles.isPlatformAdmin(profile || (typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null));
      },
      setActiveProjectId: function (id) {
        try {
          if (id) sessionStorage.setItem('360preventa_active_project', id);
          else sessionStorage.removeItem('360preventa_active_project');
        } catch (e) {}
      },
      getActiveProjectId: function () {
        try {
          return sessionStorage.getItem('360preventa_active_project');
        } catch (e) {
          return null;
        }
      }
    };

    /* ProyectosApi is canonical (js/api/proyectos.js). Bridge only shims AdminApi/AdminState. */
    if (typeof ProyectosApi === 'undefined') {
      throw new Error(
        'ProyectosApi canónica no está cargada. Incluye js/api/proyectos.js después del bridge.'
      );
    }
    if (typeof StorageApi === 'undefined') {
      window.StorageApi = createStorageApi();
    }
    if (typeof HeroApi === 'undefined') {
      window.HeroApi = createHeroApi();
    }
  }

  function createStorageApi() {
    var BUCKET = 'proyectos-media';
    var PUBLIC_MARKER = '/storage/v1/object/public/' + BUCKET + '/';

    function getPublicUrl(path) {
      return getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    function extensionFromFile(file) {
      var parts = String(file.name || '').split('.');
      if (parts.length < 2) return 'bin';
      return parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    }

    return {
      upload: async function (constructoraId, proyectoId, folder, file) {
        var ext = extensionFromFile(file);
        var fileName = folder + '-' + Date.now() + '.' + ext;
        var path = constructoraId + '/' + proyectoId + '/' + folder + '/' + fileName;
        var result = await getClient().storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });
        if (result.error) throw new Error(result.error.message || 'Error subiendo archivo');
        return { path: path, publicUrl: getPublicUrl(path) };
      }
    };
  }

  function createHeroApi() {
    var CONFIG_SELECT =
      'proyecto_id, titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
      'show_whatsapp_float, show_share_float, whatsapp_float_link, whatsapp_float_message, share_float_url, ' +
      'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url, color_fondo, color_accento, updated_at';

    return {
      upsert: async function (proyectoId, payload) {
        var projectName = AdminUI.normalizeOptionalText(
          payload.nombre_proyecto != null ? payload.nombre_proyecto : payload.titulo_hero
        );

        var data = {
          proyecto_id: proyectoId,
          titulo_hero: projectName || AdminUI.normalizeOptionalText(payload.titulo_hero),
          texto_hero: AdminUI.normalizeOptionalText(payload.texto_hero),
          boton_hero_1: AdminUI.normalizeOptionalText(payload.boton_hero_1) || 'Iniciar',
          boton_hero_2: AdminUI.normalizeOptionalText(payload.boton_hero_2) || 'Explorar',
          whatsapp_float_link: AdminUI.normalizeOptionalText(payload.whatsapp_float_link),
          whatsapp_float_message: AdminUI.normalizeOptionalText(payload.whatsapp_float_message),
          share_float_url: AdminUI.normalizeOptionalText(payload.share_float_url),
          show_whatsapp_float: payload.show_whatsapp_float !== false,
          show_share_float: payload.show_share_float !== false,
          show_hero_logo: payload.show_hero_logo !== false,
          logo_style: payload.logo_style === 'avatar' ? 'avatar' : 'flat',
          logo_url: payload.logo_url === null
            ? null
            : AdminUI.normalizeOptionalText(payload.logo_url),
          video_hero_url: AdminUI.normalizeOptionalText(payload.video_hero_url),
          imagen_hero_url: AdminUI.normalizeOptionalText(payload.imagen_hero_url),
          color_fondo: AdminUI.normalizeHexColor(payload.color_fondo, '#0A0A0A'),
          color_accento: AdminUI.normalizeHexColor(payload.color_accento, '#FF3B30')
        };
        if (payload.show_hero_logo === false) {
          data.show_hero_logo = false;
        }
        if (payload.project_default_theme) {
          data.project_default_theme = payload.project_default_theme;
        }

        if (projectName) {
          var nameResult = await getClient()
            .from('proyectos')
            .update({ nombre: projectName })
            .eq('id', proyectoId)
            .select('id, nombre')
            .maybeSingle();
          if (nameResult.error) {
            throw new Error(nameResult.error.message || 'Error actualizando el nombre del proyecto');
          }
        }

        var updated = await getClient()
          .from('proyecto_config')
          .update(data)
          .eq('proyecto_id', proyectoId)
          .select(CONFIG_SELECT)
          .maybeSingle();
        if (updated.error) throw new Error(updated.error.message || 'Error guardando hero');
        if (updated.data) return updated.data;
        var inserted = await getClient()
          .from('proyecto_config')
          .insert(data)
          .select(CONFIG_SELECT)
          .maybeSingle();
        if (inserted.error) {
          if (/duplicate|unique/i.test(inserted.error.message || '')) {
            var retry = await getClient()
              .from('proyecto_config')
              .update(data)
              .eq('proyecto_id', proyectoId)
              .select(CONFIG_SELECT)
              .maybeSingle();
            return unwrap(retry, 'Error guardando hero');
          }
          throw new Error(inserted.error.message || 'Error guardando hero');
        }
        return unwrap(inserted, 'Error guardando hero');
      }
    };
  }

  function showroomUrl(slug) {
    var resolved = slug || null;
    if (!resolved) {
      try {
        resolved = new URLSearchParams(window.location.search).get('proyecto');
      } catch (e) {}
    }
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
      return ShowroomPublicUrl.href(resolved);
    }
    if (resolved) {
      return new URL('/' + encodeURIComponent(resolved), window.location.origin).href;
    }
    return new URL('/', window.location.origin).href;
  }

  return {
    init: init,
    showroomUrl: showroomUrl,
    getClient: getClient,
    resolveConstructoraId: resolveConstructoraId
  };
})();
