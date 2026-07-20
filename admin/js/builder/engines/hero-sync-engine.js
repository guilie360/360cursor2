/* Hero Sync — binds builder hero to live showroom proyecto_config */
var HeroSyncEngine = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, ciudad, direccion, whatsapp, email, sitio_web, estado, publicado, constructora_id, ' +
    'proyecto_config(titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
      'show_whatsapp_float, show_share_float, whatsapp_float_link, whatsapp_float_message, share_float_url, ' +
      'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url, color_fondo, color_accento)';

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
      throw new Error('Abre el builder desde el showroom del proyecto para sincronizar el hero.');
    }
    return null;
  }

  function bindStateFromProject(state, project) {
    if (!project) return state;

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

    if (project.publicado) state.published = true;

    var cfg = normalizeConfig(project.proyecto_config);
    if (!cfg) return state;

    state.heroContent = Object.assign({
      nombre: '',
      eslogan: '',
      botonIzquierdo: 'Explorar',
      botonDerecho: 'Iniciar',
      whatsappLink: '',
      whatsappMessage: '',
      shareUrl: '',
      showWhatsapp: true,
      showShare: true
    }, state.heroContent || {});

    if (!state.heroContent.nombre) {
      state.heroContent.nombre = cfg.titulo_hero || project.nombre || '';
    }
    if (!state.heroContent.eslogan && cfg.texto_hero) {
      state.heroContent.eslogan = cfg.texto_hero;
    }
    if (!state.heroContent.botonIzquierdo || state.heroContent.botonIzquierdo === 'Explorar') {
      if (cfg.boton_hero_2) state.heroContent.botonIzquierdo = cfg.boton_hero_2;
    }
    if (!state.heroContent.botonDerecho || state.heroContent.botonDerecho === 'Iniciar') {
      if (cfg.boton_hero_1) state.heroContent.botonDerecho = cfg.boton_hero_1;
    }
    if (!state.heroContent.whatsappLink) {
      state.heroContent.whatsappLink = cfg.whatsapp_float_link || project.whatsapp || '';
    }
    if (!state.heroContent.whatsappMessage && cfg.whatsapp_float_message) {
      state.heroContent.whatsappMessage = cfg.whatsapp_float_message;
    }
    if (!state.heroContent.shareUrl && cfg.share_float_url) {
      state.heroContent.shareUrl = cfg.share_float_url;
    }
    if (cfg.show_whatsapp_float != null) {
      state.heroContent.showWhatsapp = cfg.show_whatsapp_float !== false;
    }
    if (cfg.show_share_float != null) {
      state.heroContent.showShare = cfg.show_share_float !== false;
    }

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

    if (!state.branding) state.branding = {};
    if (cfg.logo_url && (!state.branding.logo || state.branding.logo.status === 'remote')) {
      if (!state.branding.logoCleared) {
        state.branding.logo = {
          previewUrl: cfg.logo_url,
          uploadedUrl: cfg.logo_url,
          name: 'Logo',
          status: 'remote'
        };
      }
    }
    if (cfg.show_hero_logo != null) state.branding.showHeroLogo = cfg.show_hero_logo !== false;
    if (cfg.logo_style) state.branding.logoStyle = cfg.logo_style === 'avatar' ? 'avatar' : 'flat';

    return state;
  }

  async function syncHeroMedia(state, constructoraId, proyectoId, existingConfig) {
    existingConfig = existingConfig || {};
    var videoUrl = existingConfig.video_hero_url || null;
    var imageUrl = existingConfig.imagen_hero_url || null;

    if (state.heroVideo && state.heroVideo.file) {
      videoUrl = await uploadFile(constructoraId, proyectoId, 'hero/video', state.heroVideo.file);
      state.heroVideo.uploadedUrl = videoUrl;
      state.heroVideo.status = 'uploaded';
      imageUrl = null;
      state.heroImage = null;
    } else if (state.heroImage && state.heroImage.file) {
      imageUrl = await uploadFile(constructoraId, proyectoId, 'hero/image', state.heroImage.file);
      state.heroImage.uploadedUrl = imageUrl;
      state.heroImage.status = 'uploaded';
      videoUrl = null;
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
    var active = requireActive(state, options);
    if (!active) return null;

    var project = await fetchProjectById(active.id);
    if (!project) {
      if (options.requireProject) {
        throw new Error('No se encontró el proyecto activo \'' + active.slug + '\'.');
      }
      return null;
    }

    var heroDraft = state.heroContent ? Object.assign({}, state.heroContent) : null;
    var brandingDraft = state.branding ? Object.assign({}, state.branding) : null;
    if (brandingDraft && brandingDraft.logo) {
      brandingDraft.logo = Object.assign({}, brandingDraft.logo);
    }
    bindStateFromProject(state, project);
    if (heroDraft) {
      state.heroContent = Object.assign({}, state.heroContent || {}, heroDraft);
    }
    if (brandingDraft) {
      state.branding = Object.assign({}, state.branding || {}, brandingDraft, {
        showHeroLogo: brandingDraft.showHeroLogo,
        logoStyle: brandingDraft.logoStyle,
        logoCleared: !!brandingDraft.logoCleared,
        logo: brandingDraft.logoCleared
          ? null
          : (brandingDraft.logo || (state.branding && state.branding.logo) || null)
      });
    }

    var constructoraId = active.constructora_id || project.constructora_id ||
      (typeof AdminState !== 'undefined' ? AdminState.getConstructoraId() : null);
    if (!constructoraId) throw new Error('No se pudo determinar la constructora.');

    var existingConfig = normalizeConfig(project.proyecto_config) || {};
    var media = await syncHeroMedia(state, constructoraId, active.id, existingConfig);

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var hero = state.heroContent || {};
    var logoUrl = null;

    if (state.branding && state.branding.logoCleared) {
      logoUrl = null;
    } else if (state.branding && state.branding.logo && state.branding.logo.file) {
      logoUrl = await uploadFile(constructoraId, active.id, 'hero/logo', state.branding.logo.file);
      state.branding.logo.uploadedUrl = logoUrl;
      state.branding.logoCleared = false;
    } else if (state.branding && state.branding.logo && state.branding.logo.uploadedUrl) {
      logoUrl = state.branding.logo.uploadedUrl;
    } else if (existingConfig.logo_url) {
      logoUrl = existingConfig.logo_url;
    }

    var projectName = (hero.nombre || info.nombre || project.nombre || '').trim();
    var eslogan = (hero.eslogan || '').trim();
    if (!eslogan && ai.heroText) eslogan = String(ai.heroText).trim();

    var branding = state.branding || {};
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';

    var heroPayload = {
      nombre_proyecto: projectName || project.nombre,
      titulo_hero: projectName || project.nombre,
      texto_hero: eslogan || null,
      boton_hero_2: (hero.botonIzquierdo || 'Explorar').trim() || 'Explorar',
      boton_hero_1: (hero.botonDerecho || 'Iniciar').trim() || 'Iniciar',
      whatsapp_float_link: (hero.whatsappLink || '').trim() || null,
      whatsapp_float_message: (hero.whatsappMessage || '').trim() || null,
      share_float_url: (hero.shareUrl || '').trim() || null,
      show_whatsapp_float: hero.showWhatsapp !== false,
      show_share_float: hero.showShare !== false,
      show_hero_logo: branding.showHeroLogo === true || branding.showHeroLogo === false
        ? !!branding.showHeroLogo
        : true,
      logo_style: logoStyle,
      logo_url: logoUrl,
      video_hero_url: media.video_hero_url,
      imagen_hero_url: media.imagen_hero_url
    };

    await HeroApi.upsert(active.id, heroPayload);

    var waLink = (hero.whatsappLink || '').trim();
    if (waLink && !/^https?:\/\//i.test(waLink) && !/^wa\.me\//i.test(waLink)) {
      await AdminApi.getClient()
        .from('proyectos')
        .update({ whatsapp: waLink.replace(/\s+/g, '') })
        .eq('id', active.id);
    }

    return {
      projectId: active.id,
      slug: active.slug,
      showroomUrl: typeof PlatformBuilderBridge !== 'undefined'
        ? PlatformBuilderBridge.showroomUrl(active.slug)
        : '/' + encodeURIComponent(active.slug)
    };
  }

  async function bindFromUrl(state) {
    var active = requireActive(state, {});
    if (!active) return null;
    var project = await fetchProjectById(active.id);
    if (project) bindStateFromProject(state, project);
    return project;
  }

  return {
    bindFromUrl: bindFromUrl,
    bindStateFromProject: bindStateFromProject,
    syncHeroMedia: syncHeroMedia,
    sync: sync
  };
})();
