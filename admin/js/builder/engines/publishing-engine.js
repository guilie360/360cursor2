/* Publishing Engine — publishes showroom content by permanent UUID only.
 * Slug is never used to locate a project and is never rewritten here.
 * Identity (nombre/slug) is owned by ProyectosApi.updateIdentity.
 */
var PublishingEngine = (function () {
  function slugFromName(name) {
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.normalizeSlug) {
      return ShowroomPublicUrl.normalizeSlug(name) || 'proyecto';
    }
    if (typeof generateSlug === 'function') return generateSlug(name);
    return String(name || 'proyecto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'proyecto';
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

  function resolveProjectId(state) {
    var fromUrl =
      typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.getProjectIdFromUrl
        ? HeroSyncEngine.getProjectIdFromUrl()
        : null;
    return (
      fromUrl ||
      (state && state.draftProjectId) ||
      (state && state.publishResult && state.publishResult.proyectoId) ||
      (typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
        ? AdminState.getActiveProjectId()
        : null) ||
      null
    );
  }

  async function fetchProjectById(projectId) {
    if (!projectId) return null;
    if (typeof HeroSyncEngine !== 'undefined' && typeof HeroSyncEngine.fetchProjectById === 'function') {
      var fromHero = await HeroSyncEngine.fetchProjectById(projectId);
      if (fromHero) return fromHero;
    }
    var result = await AdminApi.getClient()
      .from('proyectos')
      .select(
        'id, nombre, slug, descripcion, ciudad, direccion, whatsapp, email, sitio_web, estado, publicado, constructora_id, ' +
          'proyecto_config(logo_url, video_hero_url, imagen_hero_url, project_default_theme)'
      )
      .eq('id', projectId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando showroom');
    return result.data || null;
  }

  function publicUrlForSlug(slug) {
    if (typeof PlatformBuilderBridge !== 'undefined' && PlatformBuilderBridge.showroomUrl) {
      return PlatformBuilderBridge.showroomUrl(slug);
    }
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.href) {
      return ShowroomPublicUrl.href(slug);
    }
    return '/' + encodeURIComponent(slug || '');
  }

  /**
   * Publish / republish existing showroom by UUID.
   * Does not change slug. Reads canonical slug from DB after update for preview URL.
   */
  async function publish(state) {
    var constructoraId = AdminState.getConstructoraId();
    if (!constructoraId) throw new Error('No se pudo determinar la constructora.');

    var projectId = resolveProjectId(state);

    /* TEMP DEBUG V5.2 */
    console.group('[BOXIES DEBUG] PublishingEngine.publish — origen UUID');
    console.log('resolveProjectId()', projectId);
    console.log('state.draftProjectId', state && state.draftProjectId);
    console.log('publishResult.proyectoId', state && state.publishResult && state.publishResult.proyectoId);
    console.log('URL projectId', typeof HeroSyncEngine !== 'undefined' && HeroSyncEngine.getProjectIdFromUrl
      ? HeroSyncEngine.getProjectIdFromUrl()
      : null);
    console.log('AdminState.getActiveProjectId()', typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
      ? AdminState.getActiveProjectId()
      : null);
    console.log('AdminState.getConstructoraId()', constructoraId);
    console.groupEnd();

    if (!projectId) {
      throw new Error(
        'No hay Showroom vinculado (falta UUID). Ábrelo desde Showrooms → Administrar.'
      );
    }

    var linkedProject = await fetchProjectById(projectId);
    if (!linkedProject || !linkedProject.id) {
      throw new Error('Showroom no encontrado para el UUID activo. Vuelve a abrirlo desde la lista.');
    }

    /* Lock session to permanent id — never re-resolve by slug for this write */
    state.draftProjectId = linkedProject.id;
    if (typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
      AdminState.setActiveProjectId(linkedProject.id);
    }

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};

    /* Content + publish flag only. Identity slug is intentionally omitted. */
    var projectPayload = {
      nombre: info.nombre || linkedProject.nombre || 'Nuevo Showroom',
      descripcion: ai.descripcionComercial || info.descripcion || linkedProject.descripcion || '',
      ciudad: info.ciudad || linkedProject.ciudad || '',
      direccion: info.direccion || linkedProject.direccion || '',
      whatsapp: info.whatsapp || linkedProject.whatsapp || '',
      email: info.email || linkedProject.email || '',
      sitio_web: info.sitio_web || linkedProject.sitio_web || '',
      estado: info.estado || linkedProject.estado || 'preventa',
      publicado: true
    };

    var project = await ProyectosApi.update(linkedProject.id, projectPayload);
    var proyectoId = project.id;
    state.draftProjectId = proyectoId;

    /* Keep in-memory identity aligned with DB (slug untouched by this update) */
    state.projectInfo = Object.assign({}, info, {
      nombre: project.nombre,
      slug: project.slug,
      constructora_id: project.constructora_id || linkedProject.constructora_id || info.constructora_id
    });

    var themeConfig = ThemeEngine.toProyectoConfig(state.branding);

    var existingConfig =
      Array.isArray(linkedProject.proyecto_config)
        ? linkedProject.proyecto_config[0]
        : linkedProject.proyecto_config;
    existingConfig = existingConfig || {};

    var branding = state.branding || {};
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';
    if (branding.logo && branding.logo.logoStyle === 'avatar') logoStyle = 'avatar';

    if (state.branding && state.branding.logo && state.branding.logo.file) {
      themeConfig.logo_url = await uploadFile(constructoraId, proyectoId, 'hero/logo', state.branding.logo.file);
    } else if (branding.logo && branding.logo.uploadedUrl) {
      themeConfig.logo_url = branding.logo.uploadedUrl;
    } else if (existingConfig && existingConfig.logo_url) {
      themeConfig.logo_url = existingConfig.logo_url;
    }

    var media = await HeroSyncEngine.syncHeroMedia(state, constructoraId, proyectoId, existingConfig || {});

    var hero = state.heroContent || {};
    var projectName = (hero.nombre || info.nombre || project.nombre || '').trim();
    var eslogan = (hero.eslogan || '').trim();
    if (!eslogan && ai.heroText) eslogan = String(ai.heroText).trim();

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
      show_hero_logo: branding.showHeroLogo !== false,
      logo_style: logoStyle,
      video_hero_url: media.video_hero_url,
      imagen_hero_url: media.imagen_hero_url
    });

    await HeroApi.upsert(proyectoId, heroPayload);

    var waLink = (hero.whatsappLink || '').trim();
    if (waLink && !/^https?:\/\//i.test(waLink) && !/^wa\.me\//i.test(waLink)) {
      await AdminApi.getClient()
        .from('proyectos')
        .update({ whatsapp: waLink.replace(/\s+/g, '') })
        .eq('id', proyectoId);
    }

    if (themeConfig.project_default_theme) {
      await AdminApi.getClient()
        .from('proyecto_config')
        .update({ project_default_theme: themeConfig.project_default_theme })
        .eq('proyecto_id', proyectoId);
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

    /* Re-read identity from DB so preview URL uses the saved slug, not the URL bar */
    var canonical = await fetchProjectById(proyectoId);
    var slug = (canonical && canonical.slug) || project.slug;
    if (canonical) {
      project = canonical;
      state.projectInfo = Object.assign({}, state.projectInfo || {}, {
        nombre: canonical.nombre,
        slug: canonical.slug,
        constructora_id: canonical.constructora_id || (state.projectInfo && state.projectInfo.constructora_id)
      });
    }

    AdminState.setActiveProjectId(proyectoId);

    return {
      project: project,
      proyectoId: proyectoId,
      draftProjectId: proyectoId,
      slug: slug,
      url: publicUrlForSlug(slug)
    };
  }

  return {
    slugFromName: slugFromName,
    publish: publish,
    resolveProjectId: resolveProjectId
  };
})();
