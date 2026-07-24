/* Hero Sync — binds builder hero to live showroom proyecto_config */
var HeroSyncEngine = (function () {
  var PROJECT_SELECT =
    'id, nombre, slug, ciudad, direccion, whatsapp, email, sitio_web, estado, publicado, constructora_id, ' +
    'proyecto_config(titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
      'show_whatsapp_float, show_share_float, whatsapp_float_link, whatsapp_float_message, share_float_url, ' +
      'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url, color_fondo, color_accento)';

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  function getSlugFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var slug = params.get('proyecto');
      if (slug && !isUuid(slug)) return slug;
      var project = params.get('project');
      if (project && !isUuid(project)) return project;
      return null;
    } catch (e) {
      return null;
    }
  }

  function getProjectIdFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('projectId') || params.get('proyectoId');
      if (id && isUuid(id)) return id;
      var project = params.get('project');
      if (project && isUuid(project)) return project;
      var proyecto = params.get('proyecto');
      if (proyecto && isUuid(proyecto)) return proyecto;
      return null;
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
    var constructoraId =
      typeof AdminState !== 'undefined' && AdminState.getConstructoraId
        ? AdminState.getConstructoraId()
        : null;
    var query = AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('slug', slug)
      .limit(2);
    if (constructoraId) query = query.eq('constructora_id', constructoraId);
    var result = await query;
    if (result.error) {
      var message = result.error.message || 'Error cargando proyecto';
      if (/Cannot coerce|multiple \(or no\) rows|JSON object requested/i.test(message)) {
        throw new Error(
          'Slug ambiguo («' + slug + '»). Usa projectId (UUID) para abrir el Showroom.'
        );
      }
      throw new Error(message);
    }
    var rows = result.data || [];
    if (rows.length > 1) {
      throw new Error(
        'Slug ambiguo («' + slug + '»). Usa projectId (UUID) para abrir el Showroom.'
      );
    }
    return rows[0] || null;
  }

  async function fetchProjectById(id) {
    if (!id) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (result.error) {
      var message = result.error.message || 'Error cargando proyecto';
      if (/Cannot coerce|multiple \(or no\) rows|JSON object requested/i.test(message)) {
        throw new Error('Error al cargar el showroom por UUID.');
      }
      throw new Error(message);
    }
    return result.data || null;
  }

  async function resolveProject(state) {
    /* Permanent identity first — slug is editable vanity only (read fallback) */
    var id = getProjectIdFromUrl() ||
      (state && state.draftProjectId) ||
      (state && state.publishResult && state.publishResult.proyectoId) ||
      (typeof AdminState !== 'undefined' ? AdminState.getActiveProjectId() : null);

    if (id) {
      var byId = await fetchProjectById(id);
      if (byId) return byId;
      /* ID was provided but not found — do not invent another project via slug */
      return null;
    }

    var slug = getSlugFromUrl();
    if (slug) {
      return fetchProjectBySlug(slug);
    }
    return null;
  }

  function bindStateFromProject(state, project, options) {
    if (!project) return state;
    options = options || {};

    /* Canonical project name lives in proyectos.nombre only.
       forceCanonical: open/switch project — refresh identity from DB (ignore stale session).
       Default (sync mid-edit): fill gaps only so in-progress form edits are kept. */
    var switching = !!(state.draftProjectId && state.draftProjectId !== project.id);
    var forceCanonical = options.forceCanonical === true || switching;

    state.draftProjectId = project.id;
    var info = state.projectInfo || {};

    if (forceCanonical || !info.nombre) {
      state.projectInfo = Object.assign({}, info, {
        nombre: project.nombre,
        slug: project.slug,
        constructora_id: project.constructora_id || info.constructora_id,
        ciudad: forceCanonical ? (project.ciudad || info.ciudad) : (info.ciudad || project.ciudad),
        direccion: forceCanonical ? (project.direccion || info.direccion) : (info.direccion || project.direccion),
        whatsapp: forceCanonical ? (project.whatsapp || info.whatsapp) : (info.whatsapp || project.whatsapp),
        email: forceCanonical ? (project.email || info.email) : (info.email || project.email),
        sitio_web: forceCanonical ? (project.sitio_web || info.sitio_web) : (info.sitio_web || project.sitio_web),
        estado: forceCanonical ? (project.estado || info.estado) : (info.estado || project.estado)
      });
    } else if (!info.slug && project.slug) {
      state.projectInfo = Object.assign({}, info, {
        slug: project.slug,
        constructora_id: project.constructora_id || info.constructora_id
      });
    } else if (project.constructora_id && !info.constructora_id) {
      state.projectInfo = Object.assign({}, info, { constructora_id: project.constructora_id });
    }

    if (project.publicado) {
      state.published = true;
      state.publishResult = {
        proyectoId: project.id,
        slug: project.slug,
        project: project,
        url: typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl(project.slug)
          : '/' + encodeURIComponent(project.slug)
      };
    } else {
      state.publishResult = Object.assign({}, state.publishResult || {}, {
        proyectoId: project.id,
        slug: project.slug
      });
    }

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

    if (!state.heroContent.nombre || forceCanonical) {
      state.heroContent.nombre = forceCanonical
        ? (project.nombre || '')
        : (cfg.titulo_hero || project.nombre || '');
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

    /* TEMP egress: no hidratar vídeo remoto de Storage (evita <video src=cdn>). */
    if (state.heroVideo && !state.heroVideo.file) {
      var hvPreview = state.heroVideo.previewUrl || state.heroVideo.uploadedUrl || '';
      if (
        state.heroVideo.status === 'remote' ||
        (typeof isRemoteHeroVideoUrl === 'function' && isRemoteHeroVideoUrl(hvPreview)) ||
        (typeof isPlayableHeroVideoUrl === 'function' && hvPreview && !isPlayableHeroVideoUrl(hvPreview))
      ) {
        state.heroVideo = null;
      }
    }

    if (cfg.imagen_hero_url && !hasNewVideo && !hasNewImage) {
      if (!state.heroImage || state.heroImage.status === 'remote') {
        state.heroImage = {
          previewUrl: cfg.imagen_hero_url,
          uploadedUrl: cfg.imagen_hero_url,
          name: 'Imagen del showroom',
          status: 'remote'
        };
        state.heroVideo = null;
      }
    } else if (cfg.video_hero_url && !hasNewVideo && !hasNewImage) {
      /* Había vídeo remoto: no previsualizar; dejar slot vacío (placeholder OLED). */
      state.heroVideo = null;
    }

    if (!state.branding) state.branding = {};
    if (state.branding.logoCleared) {
      state.branding.logo = null;
    } else if (cfg.logo_url && !(state.branding.logo && state.branding.logo.file)) {
      state.branding.logo = {
        previewUrl: cfg.logo_url,
        uploadedUrl: cfg.logo_url,
        name: 'Logo del proyecto',
        status: 'remote',
        logoStyle: cfg.logo_style === 'avatar' ? 'avatar' : 'flat'
      };
    }
    if (cfg.show_hero_logo != null) {
      state.branding.showHeroLogo = cfg.show_hero_logo !== false;
    } else if (state.branding.showHeroLogo == null) {
      state.branding.showHeroLogo = true;
    }
    if (cfg.logo_style) {
      state.branding.logoStyle = cfg.logo_style === 'avatar' ? 'avatar' : 'flat';
    } else if (!state.branding.logoStyle) {
      state.branding.logoStyle = 'flat';
    }

    return state;
  }

  async function syncHeroMedia(state, constructoraId, proyectoId, existingConfig) {
    existingConfig = existingConfig || {};
    /* TEMP egress: no reutilizar video_hero_url remoto; solo archivos locales nuevos */
    var videoUrl = null;
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
    } else if (state.heroImage && state.heroImage.uploadedUrl) {
      imageUrl = state.heroImage.uploadedUrl;
      videoUrl = null;
    } else {
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

    /* Conservar edits del formulario Hero y Logo: bindStateFromProject no debe pisarlos. */
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

    var constructoraId = project.constructora_id ||
      (typeof AdminState !== 'undefined' ? AdminState.getConstructoraId() : null);
    if (!constructoraId) throw new Error('No se pudo determinar la constructora.');

    var existingConfig = normalizeConfig(project.proyecto_config) || {};
    var media = await syncHeroMedia(state, constructoraId, project.id, existingConfig);

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var hero = state.heroContent || {};
    var themeConfig = ThemeEngine.toProyectoConfig(state.branding || {});

    if (state.branding && state.branding.logoCleared) {
      themeConfig.logo_url = null;
    } else if (state.branding && state.branding.logo && state.branding.logo.file) {
      themeConfig.logo_url = await uploadFile(constructoraId, project.id, 'hero/logo', state.branding.logo.file);
      state.branding.logo.uploadedUrl = themeConfig.logo_url;
      state.branding.logoCleared = false;
    } else if (state.branding && state.branding.logo && state.branding.logo.uploadedUrl) {
      themeConfig.logo_url = state.branding.logo.uploadedUrl;
    } else if (existingConfig.logo_url) {
      themeConfig.logo_url = existingConfig.logo_url;
    } else {
      themeConfig.logo_url = null;
    }

    var projectName = (hero.nombre || info.nombre || project.nombre || '').trim();
    var eslogan = (hero.eslogan || '').trim();
    if (!eslogan && ai.heroText) eslogan = String(ai.heroText).trim();

    var branding = state.branding || {};
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';

    var heroPayload = Object.assign({}, themeConfig, {
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
      video_hero_url: media.video_hero_url,
      imagen_hero_url: media.imagen_hero_url
    });

    await HeroApi.upsert(project.id, heroPayload);

    var waLink = (hero.whatsappLink || '').trim();
    if (waLink && !/^https?:\/\//i.test(waLink) && !/^wa\.me\//i.test(waLink)) {
      await AdminApi.getClient()
        .from('proyectos')
        .update({ whatsapp: waLink.replace(/\s+/g, '') })
        .eq('id', project.id);
    }

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
    var project = null;

    /* URL projectId always wins; slug is fallback for legacy links */
    var id = getProjectIdFromUrl();
    if (id) {
      project = await fetchProjectById(id);
    }
    if (!project) {
      var slug = getSlugFromUrl();
      if (slug) project = await fetchProjectBySlug(slug);
    }
    if (!project) {
      project = await resolveProject(state);
    }
    if (project) {
      /* Always refresh identity from DB when opening via URL / active project */
      bindStateFromProject(state, project, { forceCanonical: true });
      state.draftProjectId = project.id;
      if (typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(project.id);
      }
    }
    return project;
  }

  return {
    getSlugFromUrl: getSlugFromUrl,
    getProjectIdFromUrl: getProjectIdFromUrl,
    isUuid: isUuid,
    fetchProjectById: fetchProjectById,
    fetchProjectBySlug: fetchProjectBySlug,
    resolveProject: resolveProject,
    bindFromUrl: bindFromUrl,
    bindStateFromProject: bindStateFromProject,
    syncHeroMedia: syncHeroMedia,
    sync: sync
  };
})();
