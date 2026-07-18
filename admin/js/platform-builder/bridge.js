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

    var slug = null;
    try {
      slug = new URLSearchParams(window.location.search).get('proyecto');
    } catch (e) {}

    if (slug) {
      var bySlug = await getClient()
        .from('proyectos')
        .select('constructora_id')
        .eq('slug', slug)
        .maybeSingle();
      if (bySlug.data && bySlug.data.constructora_id) {
        return bySlug.data.constructora_id;
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
          PlatformRoles.isAdmin(profile || (typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null));
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

    if (typeof ProyectosApi === 'undefined') {
      window.ProyectosApi = createProyectosApi();
    }
    if (typeof StorageApi === 'undefined') {
      window.StorageApi = createStorageApi();
    }
    if (typeof HeroApi === 'undefined') {
      window.HeroApi = createHeroApi();
    }
  }

  function createProyectosApi() {
    var PROJECT_SELECT =
      'id, nombre, slug, descripcion, ciudad, direccion, latitud, longitud, ' +
      'whatsapp, email, sitio_web, instagram_url, estado, publicado, constructora_id, ' +
      'created_at, updated_at';

    function sanitizePayload(payload, isCreate) {
      var data = {
        nombre: AdminUI.normalizeOptionalText(payload.nombre),
        slug: AdminUI.normalizeOptionalText(payload.slug),
        descripcion: AdminUI.normalizeOptionalText(payload.descripcion),
        ciudad: AdminUI.normalizeOptionalText(payload.ciudad),
        direccion: AdminUI.normalizeOptionalText(payload.direccion),
        whatsapp: AdminUI.normalizeOptionalText(payload.whatsapp),
        email: AdminUI.normalizeOptionalText(payload.email),
        sitio_web: AdminUI.normalizeUrl(payload.sitio_web),
        instagram_url: AdminUI.normalizeUrl(payload.instagram_url),
        estado: payload.estado || 'preventa',
        publicado: !!payload.publicado
      };
      if (isCreate) {
        data.constructora_id = payload.constructora_id || AdminState.getConstructoraId();
      }
      return data;
    }

    async function createDefaultConfig(proyectoId) {
      var result = await getClient().from('proyecto_config').insert({ proyecto_id: proyectoId });
      if (result.error) throw new Error(result.error.message || 'Error creando configuración');
    }

    return {
      create: async function (payload) {
        var data = sanitizePayload(payload, true);
        if (!data.constructora_id) {
          throw new Error('No se pudo determinar la constructora del proyecto.');
        }
        var result = await getClient().from('proyectos').insert(data).select(PROJECT_SELECT).single();
        var project = unwrap(result, 'Error creando proyecto');
        try {
          await createDefaultConfig(project.id);
        } catch (err) {
          await getClient().from('proyectos').delete().eq('id', project.id);
          throw err;
        }
        return project;
      },
      update: async function (id, payload) {
        var data = sanitizePayload(payload, false);
        var result = await getClient().from('proyectos').update(data).eq('id', id).select(PROJECT_SELECT).single();
        return unwrap(result, 'Error actualizando proyecto');
      }
    };
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
    var url = new URL('../index.html', window.location.href);
    if (slug) {
      url.searchParams.set('proyecto', slug);
      return url.href;
    }
    try {
      var p = new URLSearchParams(window.location.search).get('proyecto');
      if (p) url.searchParams.set('proyecto', p);
    } catch (e) {}
    return url.href;
  }

  return {
    init: init,
    showroomUrl: showroomUrl,
    getClient: getClient
  };
})();
