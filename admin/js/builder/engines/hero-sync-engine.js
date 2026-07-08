/* Hero Sync — binds builder hero to live showroom proyecto_config */
var HeroSyncEngine = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, ciudad, direccion, whatsapp, email, sitio_web, estado, publicado, constructora_id, ' +
    'proyecto_config(texto_hero, logo_url, video_hero_url, imagen_hero_url, color_fondo, color_accento)';

  function getSlugFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get('proyecto');
    } catch (e) {
      return null;
    }
  }

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  async function uploadFile(constructoraId, proyectoId, folder, file) {
    if (!file) return null;
    var result = await StorageApi.upload(constructoraId, proyectoId, folder, file);
    return result.publicUrl;
  }

  async function fetchProjectBySlug(slug) {
    if (!slug) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('slug', slug)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando proyecto');
    return result.data || null;
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
    var slug = getSlugFromUrl();
    if (slug) {
      var bySlug = await fetchProjectBySlug(slug);
      if (bySlug) return bySlug;
    }

    var id = state.draftProjectId ||
      (state.publishResult && state.publishResult.proyectoId) ||
      (typeof AdminState !== 'undefined' ? AdminState.getActiveProjectId() : null);

    if (id) return fetchProjectById(id);
    return null;
  }

  function bindStateFromProject(state, project) {
    if (!project) return state;

    state.draftProjectId = project.id;
    var info = state.projectInfo || {};

    if (!info.nombre) {
      state.projectInfo = Object.assign({}, info, {
        nombre: project.nombre,
        ciudad: project.ciudad || info.ciudad,
        direccion: project.direccion || info.direccion,
        whatsapp: project.whatsapp || info.whatsapp,
        email: project.email || info.email,
        sitio_web: project.sitio_web || info.sitio_web,
        estado: project.estado || info.estado
      });
    }

    if (project.publicado) {
      state.published = true;
      state.publishResult = {
        proyectoId: project.id,
        slug: project.slug,
        project: project,
        url: typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl(project.slug)
          : '../index.html?proyecto=' + encodeURIComponent(project.slug)
      };
    }

    var cfg = normalizeConfig(project.proyecto_config);
    if (!cfg) return state;

    var hasNewVideo = state.heroVideo && state.heroVideo.file;
    var hasNewImage = state.heroImage && state.heroImage.file;

    if (cfg.video_hero_url && !hasNewVideo && !hasNewImage) {
      if (!state.heroVideo || state.heroVideo.status === 'remote') {
        state.heroVideo = {
          previewUrl: cfg.video_hero_url,
          uploadedUrl: cfg.video_hero_url,
          name: 'Video del showroom',
          status: 'remote'
        };
        state.heroImage = null;
      }
    } else if (cfg.imagen_hero_url && !hasNewVideo && !hasNewImage) {
      if (!state.heroImage || state.heroImage.status === 'remote') {
        state.heroImage = {
          previewUrl: cfg.imagen_hero_url,
          uploadedUrl: cfg.imagen_hero_url,
          name: 'Imagen del showroom',
          status: 'remote'
        };
        state.heroVideo = null;
      }
    }

    return state;
  }

  async function syncHeroMedia(state, constructoraId, proyectoId, existingConfig) {
    existingConfig = existingConfig || {};
    var videoUrl = existingConfig.video_hero_url || null;
    var imageUrl = existingConfig.imagen_hero_url || null;

    if (state.heroVideo && state.heroVideo.file) {
      videoUrl = await uploadFile(constructoraId, proyectoId, 'hero/video', state.heroVideo.file);
      state.heroVideo.uploadedUrl = videoUrl;
      state.heroVideo.status = 'synced';
      if (state.heroVideo.thumbnailBlob) {
        var thumbFile = new File([state.heroVideo.thumbnailBlob], 'hero-thumb.jpg', { type: 'image/jpeg' });
        imageUrl = await uploadFile(constructoraId, proyectoId, 'hero/image', thumbFile);
      }
    } else if (state.heroImage && state.heroImage.file) {
      imageUrl = await uploadFile(constructoraId, proyectoId, 'hero/image', state.heroImage.file);
      videoUrl = null;
      state.heroImage.uploadedUrl = imageUrl;
      state.heroImage.status = 'synced';
      state.heroVideo = null;
    } else if (state.heroVideo && state.heroVideo.uploadedUrl) {
      videoUrl = state.heroVideo.uploadedUrl;
    } else if (state.heroImage && state.heroImage.uploadedUrl) {
      imageUrl = state.heroImage.uploadedUrl;
      videoUrl = null;
    }

    return {
      video_hero_url: videoUrl,
      imagen_hero_url: imageUrl
    };
  }

  async function sync(state, options) {
    options = options || {};
    var project = await resolveProject(state);
    if (!project) {
      if (options.requireProject) {
        throw new Error('Abre el builder desde el showroom del proyecto para sincronizar el hero.');
      }
      return null;
    }

    bindStateFromProject(state, project);

    var constructoraId = project.constructora_id ||
      (typeof AdminState !== 'undefined' ? AdminState.getConstructoraId() : null);
    if (!constructoraId) throw new Error('No se pudo determinar la constructora.');

    var existingConfig = normalizeConfig(project.proyecto_config) || {};
    var media = await syncHeroMedia(state, constructoraId, project.id, existingConfig);

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var themeConfig = ThemeEngine.toProyectoConfig(state.branding || {});

    if (state.branding && state.branding.logo && state.branding.logo.file) {
      themeConfig.logo_url = await uploadFile(constructoraId, project.id, 'hero/logo', state.branding.logo.file);
    }

    var heroPayload = Object.assign({
      texto_hero: ai.heroText || info.nombre || project.nombre || '',
      video_hero_url: media.video_hero_url,
      imagen_hero_url: media.imagen_hero_url
    }, themeConfig);

    await HeroApi.upsert(project.id, heroPayload);

    if (typeof AdminState !== 'undefined') {
      AdminState.setActiveProjectId(project.id);
    }

    state.draftProjectId = project.id;

    return {
      projectId: project.id,
      slug: project.slug,
      showroomUrl: typeof PlatformBuilderBridge !== 'undefined'
        ? PlatformBuilderBridge.showroomUrl(project.slug)
        : '../index.html?proyecto=' + encodeURIComponent(project.slug)
    };
  }

  async function bindFromUrl(state) {
    var project = await resolveProject(state);
    if (project) bindStateFromProject(state, project);
    return project;
  }

  return {
    getSlugFromUrl: getSlugFromUrl,
    resolveProject: resolveProject,
    bindFromUrl: bindFromUrl,
    bindStateFromProject: bindStateFromProject,
    syncHeroMedia: syncHeroMedia,
    sync: sync
  };
})();
