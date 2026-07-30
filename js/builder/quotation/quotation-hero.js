/**
 * QuotationHero — Quotation Builder hero panel (V7.1.09).
 *
 * Shares the whole UI with the Showroom hero via BuilderHero, but persists into
 * the `proyecto_config.hero_quotation` jsonb namespace. Uploads land under
 * `hero_quotation/<kind>` in Storage.
 */
var QuotationHero = (function () {
  var BODY_SELECTOR = '[data-builder-page-body]';
  var STORAGE_FOLDERS = {
    video: 'videos',
    image: 'images',
    logo: 'ui'
  };
  var QE_HERO_NODE_ID = 'qe-hero';
  var QE_HERO_NODE_SLUG = 'quotation-hero';
  var heroBunnyReady = false;

  var heroState = null;
  var loadedProjectId = null;
  var projectCtx = null;
  var mountedRoot = null;
  var loadPromise = null;
  var busy = false;

  function notifyError(message) {
    if (typeof AdminNotify !== 'undefined' && AdminNotify.error) AdminNotify.error(message);
  }

  function markDirty() {
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mark) {
      BuilderDirtyState.mark();
    }
  }

  function revokePreview(media) {
    if (!media || !media.previewUrl) return;
    try {
      if (String(media.previewUrl).indexOf('blob:') === 0) {
        URL.revokeObjectURL(media.previewUrl);
      }
    } catch (e) {}
  }

  function blankState() {
    return {
      heroContent: {
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        whatsappLink: '',
        whatsappMessage: '',
        shareUrl: '',
        showWhatsapp: true,
        showShare: true,
        showFullscreen: true
      },
      branding: { showHeroLogo: true, logoStyle: 'flat', logo: null },
      heroVideo: null,
      heroImage: null,
      videoUrl: null,
      imageUrl: null
    };
  }

  function remoteMedia(url, label) {
    if (!url) return null;
    return {
      file: null,
      name: label,
      size: 0,
      previewUrl: url,
      uploadedUrl: url,
      status: 'remote'
    };
  }

  function stateFromPayload(payload) {
    var next = blankState();
    if (!payload) return next;
    next.heroContent = Object.assign(next.heroContent, payload.heroContent || {});
    var br = payload.branding || {};
    next.branding.showHeroLogo = br.showHeroLogo !== false;
    next.branding.logoStyle = br.logoStyle === 'avatar' ? 'avatar' : 'flat';
    next.branding.logo = br.logo && br.logo.uploadedUrl
      ? {
        file: null,
        name: br.logo.name || 'Logo del proyecto',
        size: Number(br.logo.size) || 0,
        previewUrl: br.logo.uploadedUrl,
        uploadedUrl: br.logo.uploadedUrl
      }
      : null;
    next.videoUrl = payload.video_url || null;
    next.imageUrl = payload.image_url || null;
    next.heroVideo = remoteMedia(next.videoUrl, 'Video del hero');
    next.heroImage = remoteMedia(next.imageUrl, 'Imagen del hero');
    return next;
  }

  function toModel() {
    var video = heroState.heroVideo;
    /* TEMP egress: nunca renderizar <video src> con URL remota de Storage.
       Se conserva videoUrl para no perder el archivo ya publicado al guardar. */
    if (video && !video.file && !BuilderHero.isPlayablePreview(video.previewUrl)) {
      video = null;
    }
    return BuilderHero.emptyModel({
      mode: 'quotation',
      heroContent: heroState.heroContent,
      branding: heroState.branding,
      heroVideo: video,
      heroImage: heroState.heroImage,
      projectNameFallback: (projectCtx && (projectCtx.name || projectCtx.nombre)) || ''
    });
  }

  function bodyHtml() {
    if (typeof BuilderHero === 'undefined' || !BuilderHero.render) {
      return '<p class="builder-menu-hint">Editor del hero no disponible (BuilderHero no está cargado).</p>';
    }
    if (!heroState) {
      return '<p class="builder-step-desc">Cargando hero…</p>';
    }
    return BuilderHero.render(toModel());
  }

  function rerender() {
    if (!mountedRoot) return;
    var body = mountedRoot.querySelector(BODY_SELECTOR);
    if (!body) return;
    body.innerHTML = bodyHtml();
    bindBody();
  }

  /* ------------------------------------------------------------------ */
  /* Media handling                                                      */
  /* ------------------------------------------------------------------ */

  async function handleFile(kind, file) {
    if (!file || busy) return;
    busy = true;
    try {
      if (kind === 'video') {
        var video = await MediaEngine.processVideo(file);
        revokePreview(heroState.heroVideo);
        heroState.heroVideo = video;
        heroState.videoUrl = null;
        /* Video e imagen son excluyentes en el hero. */
        revokePreview(heroState.heroImage);
        heroState.heroImage = null;
        heroState.imageUrl = null;
      } else if (kind === 'image') {
        var image = await MediaEngine.processImage(file);
        revokePreview(heroState.heroImage);
        heroState.heroImage = image;
        heroState.imageUrl = null;
        revokePreview(heroState.heroVideo);
        heroState.heroVideo = null;
        heroState.videoUrl = null;
      } else if (kind === 'logo') {
        var logoStyle = heroState.branding.logoStyle;
        if (typeof BrandingEngine !== 'undefined' && BrandingEngine.detectLogoStyle) {
          try { logoStyle = await BrandingEngine.detectLogoStyle(file); } catch (eStyle) {}
        }
        revokePreview(heroState.branding.logo);
        heroState.branding.logo = {
          file: file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          uploadedUrl: null
        };
        heroState.branding.logoStyle = logoStyle === 'avatar' ? 'avatar' : 'flat';
      }
      markDirty();
      rerender();
    } catch (err) {
      notifyError((err && err.message) || 'No se pudo procesar el archivo.');
    } finally {
      busy = false;
    }
  }

  function handleClear(kind) {
    if (!heroState) return;
    if (kind === 'video') {
      revokePreview(heroState.heroVideo);
      heroState.heroVideo = null;
      heroState.videoUrl = null;
    } else if (kind === 'image') {
      revokePreview(heroState.heroImage);
      heroState.heroImage = null;
      heroState.imageUrl = null;
    } else if (kind === 'logo') {
      revokePreview(heroState.branding.logo);
      heroState.branding.logo = null;
    }
    markDirty();
    rerender();
  }

  function heroAdapter() {
    return {
      onChange: function (read) {
        if (!heroState || !read) return;
        heroState.heroContent = Object.assign({}, heroState.heroContent, read.heroContent);
        heroState.branding.showHeroLogo = read.brandingPartial.showHeroLogo;
        heroState.branding.logoStyle = read.brandingPartial.logoStyle;
        markDirty();
      },
      onMediaClear: handleClear,
      onFile: handleFile
    };
  }

  function bindBody() {
    if (!mountedRoot || !heroState) return;
    if (typeof BuilderHero === 'undefined' || !BuilderHero.bind) return;
    BuilderHero.bind(mountedRoot, heroAdapter());
  }

  /* ------------------------------------------------------------------ */
  /* Load / persist                                                      */
  /* ------------------------------------------------------------------ */

  function load(projectId) {
    var id = String(projectId || '').trim();
    if (loadPromise && loadedProjectId === id) return loadPromise;
    loadedProjectId = id;
    heroBunnyReady = false;

    if (!id || typeof ProyectosApi === 'undefined' || !ProyectosApi.fetchHeroQuotation) {
      heroState = blankState();
      loadPromise = Promise.resolve(heroState);
      return loadPromise;
    }

    loadPromise = ProyectosApi.fetchHeroQuotation(id)
      .then(function (payload) {
        heroState = stateFromPayload(payload);
        return heroState;
      })
      .catch(function (err) {
        heroState = blankState();
        notifyError((err && err.message) || 'No se pudo cargar el hero de la cotización.');
        return heroState;
      });
    return loadPromise;
  }

  async function ensureHeroBunnyStructure(projectId, slug) {
    if (heroBunnyReady) return;
    if (typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.ensureNodeStructure) {
      throw new Error('BunnyMediaApi no disponible.');
    }
    await BunnyMediaApi.ensureNodeStructure(
      projectId,
      slug,
      QE_HERO_NODE_SLUG,
      ['images', 'videos', 'ui']
    );
    heroBunnyReady = true;
  }

  async function uploadPending(kind, projectId, media) {
    if (!media || !media.file) return media && media.uploadedUrl ? media.uploadedUrl : null;
    if (typeof BunnyMediaApi === 'undefined' || !BunnyMediaApi.uploadAndSync) {
      throw new Error('BunnyMediaApi no disponible: no se pueden subir archivos del hero.');
    }
    var slug = String((projectCtx && projectCtx.slug) || '').trim();
    if (!slug) {
      throw new Error('Define el slug del proyecto antes de subir archivos a Bunny.');
    }
    var category = STORAGE_FOLDERS[kind] || 'images';
    await ensureHeroBunnyStructure(projectId, slug);
    var result = await BunnyMediaApi.uploadAndSync(
      null,
      projectId,
      category,
      media.file,
      {
        nodeId: QE_HERO_NODE_ID,
        nodeSlug: QE_HERO_NODE_SLUG,
        showroomSlug: slug,
        scope: 'media'
      }
    );
    media.file = null;
    media.uploadedUrl = result.publicUrl;
    media.storagePath = result.storagePath || null;
    media.archivoId = (result.archivo && result.archivo.id) || null;
    media.provider = 'bunny';
    media.status = 'synced';
    return result.publicUrl;
  }

  /** Persists the hero into `hero_quotation`. Safe to call when the panel never mounted. */
  async function commit(adapter) {
    var projectId =
      (adapter && adapter.getProjectId && adapter.getProjectId()) ||
      (projectCtx && projectCtx.id) ||
      loadedProjectId;

    if (!heroState) {
      if (!projectId) return null;
      await load(projectId);
    }
    if (!heroState) return null;

    if (!projectId) {
      throw new Error('No hay un proyecto vinculado para guardar el hero.');
    }

    /* Si el panel está montado, el DOM manda sobre el estado en memoria. */
    if (mountedRoot && mountedRoot.querySelector('#heroNombreInput') &&
        typeof BuilderHero !== 'undefined' && BuilderHero.readFromDom) {
      var read = BuilderHero.readFromDom(mountedRoot);
      heroState.heroContent = Object.assign({}, heroState.heroContent, read.heroContent);
      heroState.branding.showHeroLogo = read.brandingPartial.showHeroLogo;
      heroState.branding.logoStyle = read.brandingPartial.logoStyle;
    }

    var videoUrl = await uploadPending('video', projectId, heroState.heroVideo);
    var imageUrl = await uploadPending('image', projectId, heroState.heroImage);
    var logoUrl = await uploadPending('logo', projectId, heroState.branding.logo);

    heroState.videoUrl = videoUrl || heroState.videoUrl || null;
    heroState.imageUrl = imageUrl || heroState.imageUrl || null;
    if (!heroState.heroVideo) heroState.videoUrl = null;
    if (!heroState.heroImage) heroState.imageUrl = null;

    var logo = heroState.branding.logo;
    var payload = {
      heroContent: heroState.heroContent,
      branding: {
        showHeroLogo: heroState.branding.showHeroLogo !== false,
        logoStyle: heroState.branding.logoStyle === 'avatar' ? 'avatar' : 'flat',
        logo: logo && (logoUrl || logo.uploadedUrl)
          ? {
            name: logo.name || 'Logo del proyecto',
            uploadedUrl: logoUrl || logo.uploadedUrl,
            size: Number(logo.size) || 0
          }
          : null
      },
      video_url: heroState.videoUrl,
      image_url: heroState.imageUrl
    };

    if (typeof ProyectosApi === 'undefined' || !ProyectosApi.updateHeroQuotation) {
      throw new Error('API del hero de cotización no disponible.');
    }
    var saved = await ProyectosApi.updateHeroQuotation(projectId, payload);
    loadedProjectId = String(projectId);
    rerender();
    return saved;
  }

  /* ------------------------------------------------------------------ */
  /* Panel lifecycle                                                     */
  /* ------------------------------------------------------------------ */

  function render(ctx, opts) {
    opts = opts || {};
    projectCtx = ctx || projectCtx || {};
    var header =
      typeof QuotationSidebar !== 'undefined' && QuotationSidebar.pageHeaderHtml
        ? QuotationSidebar.pageHeaderHtml(
          'hero',
          'Hero',
          'Video, imagen y logo de portada de la cotización.',
          opts.sectionChecks
        )
        : '';
    /* Same framed page chrome as Showroom video-hero (independent column scrolls). */
    return '' +
      '<div class="builder-page is-framed builder-page--hero" data-builder-page data-step="hero">' +
        header +
        '<div class="builder-page-body" data-builder-page-body>' +
          bodyHtml() +
        '</div>' +
      '</div>';
  }

  function bind(rootEl, ctx) {
    mountedRoot = rootEl;
    projectCtx = ctx || projectCtx || {};
    var projectId = String((projectCtx && projectCtx.id) || '').trim();

    if (heroState && loadedProjectId === projectId) {
      bindBody();
      return;
    }
    load(projectId).then(rerender);
  }

  function reset() {
    revokePreview(heroState && heroState.heroVideo);
    revokePreview(heroState && heroState.heroImage);
    revokePreview(heroState && heroState.branding && heroState.branding.logo);
    heroState = null;
    loadedProjectId = null;
    loadPromise = null;
    mountedRoot = null;
    projectCtx = null;
    busy = false;
  }

  return {
    render: render,
    bind: bind,
    commit: commit,
    load: load,
    reset: reset,
    getState: function () { return heroState; }
  };
})();
