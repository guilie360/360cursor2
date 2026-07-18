/* Publishing Engine — creates full BOXIES project structure */
var PublishingEngine = (function () {
  function slugFromName(name) {
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

  async function publish(state) {
    var constructoraId = AdminState.getConstructoraId();
    if (!constructoraId) throw new Error('No se pudo determinar la constructora.');

    var linkedProject = await HeroSyncEngine.resolveProject(state);
    if (linkedProject && !state.draftProjectId) {
      var heroDraft = state.heroContent ? Object.assign({}, state.heroContent) : null;
      HeroSyncEngine.bindStateFromProject(state, linkedProject);
      if (heroDraft) {
        state.heroContent = Object.assign({}, state.heroContent || {}, heroDraft);
      }
    }

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};
    var slug = linkedProject && linkedProject.slug
      ? linkedProject.slug
      : slugFromName(info.nombre || 'nuevo-proyecto');

    var projectPayload = {
      nombre: info.nombre || linkedProject && linkedProject.nombre || 'Nuevo Proyecto',
      slug: slug,
      descripcion: ai.descripcionComercial || info.descripcion || '',
      ciudad: info.ciudad || (linkedProject && linkedProject.ciudad) || '',
      direccion: info.direccion || (linkedProject && linkedProject.direccion) || '',
      whatsapp: info.whatsapp || (linkedProject && linkedProject.whatsapp) || '',
      email: info.email || (linkedProject && linkedProject.email) || '',
      sitio_web: info.sitio_web || (linkedProject && linkedProject.sitio_web) || '',
      estado: info.estado || (linkedProject && linkedProject.estado) || 'preventa',
      publicado: true,
      constructora_id: constructoraId
    };

    var project;
    if (state.draftProjectId) {
      project = await ProyectosApi.update(state.draftProjectId, projectPayload);
    } else {
      project = await ProyectosApi.create(projectPayload);
    }

    var proyectoId = project.id;
    state.draftProjectId = proyectoId;

    var themeConfig = ThemeEngine.toProyectoConfig(state.branding);

    var existingConfig = linkedProject && linkedProject.id === proyectoId
      ? (Array.isArray(linkedProject.proyecto_config)
        ? linkedProject.proyecto_config[0]
        : linkedProject.proyecto_config)
      : {};

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

    AdminState.setActiveProjectId(proyectoId);

    var showroomUrl = typeof PlatformBuilderBridge !== 'undefined'
      ? PlatformBuilderBridge.showroomUrl(slug)
      : '../index.html?proyecto=' + encodeURIComponent(slug);

    return {
      project: project,
      proyectoId: proyectoId,
      draftProjectId: proyectoId,
      slug: project.slug || slug,
      url: showroomUrl
    };
  }

  return {
    slugFromName: slugFromName,
    publish: publish
  };
})();
