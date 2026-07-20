/* Publishing Engine — updates an existing showroom project (never creates) */
var PublishingEngine = (function () {
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

  var PROJECT_LOOKUP =
    'id, nombre, slug, descripcion, ciudad, direccion, whatsapp, email, sitio_web, ' +
    'estado, publicado, constructora_id, ' +
    'proyecto_config(titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
      'show_whatsapp_float, show_share_float, whatsapp_float_link, whatsapp_float_message, share_float_url, ' +
      'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url)';

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

  /**
   * Showroom slug for the active builder session.
   * Priority: pathname → ?proyecto= → project already linked in state.
   * Never invents a slug from the display name.
   */
  function resolveShowroomSlug(state) {
    var fromPath = slugFromPathname();
    if (fromPath) return fromPath;

    var fromQuery = slugFromQuery();
    if (fromQuery) return fromQuery;

    if (state && state.publishResult && state.publishResult.slug) {
      return String(state.publishResult.slug).trim() || null;
    }
    if (state && state.projectInfo && state.projectInfo.slug) {
      return String(state.projectInfo.slug).trim() || null;
    }
    return null;
  }

  async function fetchExistingProjectBySlug(slug) {
    if (!slug) return null;
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(PROJECT_LOOKUP)
      .eq('slug', slug)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error buscando proyecto');
    return result.data || null;
  }

  async function uploadFile(constructoraId, proyectoId, folder, file) {
    if (!file) return null;
    var result = await StorageApi.upload(constructoraId, proyectoId, folder, file);
    return result.publicUrl;
  }

  async function insertArchivo(proyectoId, data) {
    var result = await AdminApi.getClient()
      .from('archivos')
      .insert(Object.assign({ proyecto_id: proyectoId }, data));
    if (result.error) throw new Error(result.error.message || 'Error guardando archivo');
    return result.data;
  }

  async function insertAmenidades(proyectoId, names) {
    if (!names || !names.length) return;
    var rows = names.map(function (name, idx) {
      return { proyecto_id: proyectoId, nombre: name, orden: idx + 1, activo: true };
    });
    var result = await AdminApi.getClient().from('proyecto_amenidades').insert(rows);
    if (result.error) {
      /* Join table requires amenidad_id from catalog — skip silently if schema differs */
    }
  }

  async function publish(state) {
    var slug = resolveShowroomSlug(state);
    if (!slug) {
      throw new Error(
        'No se pudo resolver el proyecto. Abre Administrar desde el showroom (/demo, /demo2, /demo3).'
      );
    }

    var linkedProject = await fetchExistingProjectBySlug(slug);
    if (!linkedProject || !linkedProject.id) {
      throw new Error('No se pudo resolver el proyecto \'' + slug + '\'.');
    }

    var proyectoId = linkedProject.id;
    var projectSlug = linkedProject.slug || slug;
    var constructoraId =
      linkedProject.constructora_id ||
      (typeof AdminState !== 'undefined' && AdminState.getConstructoraId
        ? AdminState.getConstructoraId()
        : null);

    if (!constructoraId) {
      throw new Error('No se pudo determinar la constructora del proyecto \'' + projectSlug + '\'.');
    }

    /* Bind session to the existing showroom row — never create */
    var heroDraft = state.heroContent ? Object.assign({}, state.heroContent) : null;
    if (typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.bindStateFromProject) {
      HeroSyncEngine.bindStateFromProject(state, linkedProject);
    }
    state.draftProjectId = proyectoId;
    if (heroDraft) {
      state.heroContent = Object.assign({}, state.heroContent || {}, heroDraft);
    }
    if (!state.projectInfo) state.projectInfo = {};
    state.projectInfo.slug = projectSlug;

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};

    var projectPayload = {
      nombre: info.nombre || linkedProject.nombre || 'Proyecto',
      slug: projectSlug,
      descripcion: ai.descripcionComercial || info.descripcion || linkedProject.descripcion || '',
      ciudad: info.ciudad || linkedProject.ciudad || '',
      direccion: info.direccion || linkedProject.direccion || '',
      whatsapp: info.whatsapp || linkedProject.whatsapp || '',
      email: info.email || linkedProject.email || '',
      sitio_web: info.sitio_web || linkedProject.sitio_web || '',
      estado: info.estado || linkedProject.estado || 'preventa',
      publicado: true
    };

    var project = await ProyectosApi.update(proyectoId, projectPayload);

    /* HALL stays fixed: do not overwrite project_default_theme or hero colors on Publicar */
    var existingConfig = Array.isArray(linkedProject.proyecto_config)
      ? linkedProject.proyecto_config[0]
      : linkedProject.proyecto_config;
    existingConfig = existingConfig || {};

    var branding = state.branding || {};
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';
    if (branding.logo && branding.logo.logoStyle === 'avatar') logoStyle = 'avatar';

    var logoUrl = null;
    if (state.branding && state.branding.logo && state.branding.logo.file) {
      logoUrl = await uploadFile(constructoraId, proyectoId, 'hero/logo', state.branding.logo.file);
    } else if (branding.logo && branding.logo.uploadedUrl) {
      logoUrl = branding.logo.uploadedUrl;
    } else if (existingConfig.logo_url) {
      logoUrl = existingConfig.logo_url;
    }

    var media = await HeroSyncEngine.syncHeroMedia(state, constructoraId, proyectoId, existingConfig);

    var hero = state.heroContent || {};
    var projectName = (hero.nombre || info.nombre || project.nombre || '').trim();
    var eslogan = (hero.eslogan || '').trim();
    if (!eslogan && ai.heroText) eslogan = String(ai.heroText).trim();

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
      show_hero_logo: branding.showHeroLogo !== false,
      logo_style: logoStyle,
      logo_url: logoUrl,
      video_hero_url: media.video_hero_url,
      imagen_hero_url: media.imagen_hero_url
    };

    await HeroApi.upsert(proyectoId, heroPayload);

    var waLink = (hero.whatsappLink || '').trim();
    if (waLink && !/^https?:\/\//i.test(waLink) && !/^wa\.me\//i.test(waLink)) {
      await AdminApi.getClient()
        .from('proyectos')
        .update({ whatsapp: waLink.replace(/\s+/g, '') })
        .eq('id', proyectoId);
    }

    for (var gi = 0; gi < (state.gallery || []).length; gi++) {
      var gItem = state.gallery[gi];
      if (!gItem.file) continue;
      var gUrl = await uploadFile(constructoraId, proyectoId, 'gallery/' + gItem.category, gItem.file);
      await insertArchivo(proyectoId, {
        nombre: gItem.name.replace(/\.[^.]+$/, ''),
        extension: gItem.name.split('.').pop(),
        url: gUrl,
        tipo: 'imagen',
        orden: gi + 1,
        vivienda_id: null
      });
    }

    for (var pi = 0; pi < (state.panoramas || []).length; pi++) {
      var pItem = state.panoramas[pi];
      if (!pItem.file) continue;
      var pUrl = await uploadFile(constructoraId, proyectoId, '360/' + pItem.spaceId, pItem.file);
      await insertArchivo(proyectoId, {
        nombre: pItem.spaceLabel || pItem.name.replace(/\.[^.]+$/, ''),
        extension: pItem.name.split('.').pop(),
        url: pUrl,
        tipo: 'tour_360',
        orden: pi + 1,
        vivienda_id: null
      });
    }

    for (var pli = 0; pli < (state.plans || []).length; pli++) {
      var plItem = state.plans[pli];
      if (!plItem.file) continue;
      var plUrl = await uploadFile(constructoraId, proyectoId, 'plans', plItem.file);
      await insertArchivo(proyectoId, {
        nombre: plItem.meta.nombre || plItem.name.replace(/\.[^.]+$/, ''),
        extension: plItem.name.split('.').pop(),
        url: plUrl,
        tipo: 'plano',
        orden: pli + 1,
        vivienda_id: null
      });
    }

    for (var di = 0; di < (state.downloads || []).length; di++) {
      var dItem = state.downloads[di];
      if (!dItem.file) continue;
      var dUrl = await uploadFile(constructoraId, proyectoId, 'downloads', dItem.file);
      var tipo = dItem.docType === 'brochure' ? 'brochure' : (dItem.docType === 'plano' ? 'plano' : 'pdf');
      await insertArchivo(proyectoId, {
        nombre: dItem.meta.nombre || dItem.name.replace(/\.[^.]+$/, ''),
        extension: dItem.name.split('.').pop(),
        url: dUrl,
        tipo: tipo,
        orden: di + 1,
        vivienda_id: null
      });
    }

    var amenidades = ai.chatbotInfo && ai.chatbotInfo.amenities ? ai.chatbotInfo.amenities : [];
    await insertAmenidades(proyectoId, amenidades);

    if (typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
      AdminState.setActiveProjectId(proyectoId);
    }

    var showroomUrl = typeof PlatformBuilderBridge !== 'undefined'
      ? PlatformBuilderBridge.showroomUrl(projectSlug)
      : '/' + encodeURIComponent(projectSlug);

    return {
      project: project,
      proyectoId: proyectoId,
      draftProjectId: proyectoId,
      slug: project.slug || projectSlug,
      url: showroomUrl
    };
  }

  return {
    resolveShowroomSlug: resolveShowroomSlug,
    publish: publish
  };
})();
