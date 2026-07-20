/* Publishing Engine — updates the active showroom project (never creates, never re-resolves) */
var PublishingEngine = (function () {
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

  async function loadConfig(proyectoId) {
    var result = await AdminApi.getClient()
      .from('proyecto_config')
      .select(
        'logo_url, show_hero_logo, logo_style, video_hero_url, imagen_hero_url, ' +
        'titulo_hero, texto_hero, boton_hero_1, boton_hero_2'
      )
      .eq('proyecto_id', proyectoId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Error cargando configuración');
    return result.data || {};
  }

  async function publish(state) {
    var active = ActiveProject.require(state);
    var proyectoId = active.id;
    var projectSlug = active.slug;
    var constructoraId = active.constructora_id ||
      (typeof AdminState !== 'undefined' && AdminState.getConstructoraId
        ? AdminState.getConstructoraId()
        : null);

    if (!constructoraId) {
      throw new Error('No se pudo determinar la constructora del proyecto \'' + projectSlug + '\'.');
    }

    var info = state.projectInfo || {};
    var ai = state.aiContent || {};

    var projectPayload = {
      nombre: info.nombre || active.nombre || 'Proyecto',
      slug: projectSlug,
      descripcion: ai.descripcionComercial || info.descripcion || '',
      ciudad: info.ciudad || '',
      direccion: info.direccion || '',
      whatsapp: info.whatsapp || '',
      email: info.email || '',
      sitio_web: info.sitio_web || '',
      estado: info.estado || 'preventa',
      publicado: true
    };

    var project = await ProyectosApi.update(proyectoId, projectPayload);
    if (project && project.nombre) active.nombre = project.nombre;
    state.published = true;

    var existingConfig = await loadConfig(proyectoId);

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

    var showroomUrl = ActiveProject.showroomHref(state);

    return {
      project: project,
      proyectoId: proyectoId,
      slug: projectSlug,
      url: showroomUrl
    };
  }

  return {
    publish: publish
  };
})();
