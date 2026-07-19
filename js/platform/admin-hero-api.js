try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/platform/admin-hero-api.js');}catch(_e){}
/* Platform admin API — hero config read/write from showroom */
var AdminHeroApi = (function () {
  var BUCKET = 'proyectos-media';
  var PUBLIC_MARKER = '/storage/v1/object/public/' + BUCKET + '/';
  var CONFIG_SELECT =
    'proyecto_id, titulo_hero, texto_hero, boton_hero_1, boton_hero_2, ' +
    'hero_text_color, hero_button_text_color, ' +
    'logo_url, video_hero_url, imagen_hero_url, updated_at';

  function normalizeHeroTextColor(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function getClient() {
    return PlatformAuth.getClient();
  }

  function normalizeOptionalText(value) {
    if (value == null) return null;
    var text = String(value).trim();
    return text || null;
  }

  function normalizeConfig(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    return raw;
  }

  function sanitizePayload(payload) {
    return {
      titulo_hero: normalizeOptionalText(payload.titulo_hero),
      texto_hero: normalizeOptionalText(payload.texto_hero),
      boton_hero_1: normalizeOptionalText(payload.boton_hero_1),
      boton_hero_2: normalizeOptionalText(payload.boton_hero_2),
      hero_text_color: normalizeHeroTextColor(payload.hero_text_color),
      hero_button_text_color: normalizeHeroTextColor(payload.hero_button_text_color),
      imagen_hero_url: normalizeOptionalText(payload.imagen_hero_url),
      video_hero_url: normalizeOptionalText(payload.video_hero_url),
      logo_url: normalizeOptionalText(payload.logo_url)
    };
  }

  function getPublicUrl(path) {
    return getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function extensionFromFile(file) {
    var parts = String(file.name || '').split('.');
    if (parts.length < 2) return 'jpg';
    return parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  }

  async function uploadHeroImage(constructoraId, proyectoId, file) {
    if (!constructoraId || !proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
    }
    if (!file) {
      throw new Error('Selecciona una imagen.');
    }
    if (!/^image\//i.test(file.type || '')) {
      throw new Error('El archivo debe ser una imagen (JPG, PNG o WebP).');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La imagen no puede superar 10 MB.');
    }

    var ext = extensionFromFile(file);
    var fileName = 'hero-' + Date.now() + '.' + ext;
    var path = constructoraId + '/' + proyectoId + '/hero/image/' + fileName;

    var result = await getClient().storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo subir la imagen.');
    }

    return {
      path: path,
      publicUrl: getPublicUrl(path)
    };
  }

  async function getForCurrentProject() {
    if (!window.PROJECT_DATA || !window.PROJECT_DATA.id) {
      throw new Error('El proyecto aún no está cargado.');
    }

    var proyectoId = window.PROJECT_DATA.id;
    var result = await getClient()
      .from('proyectos')
      .select('id, nombre, ciudad, estado, constructora_id, proyecto_config(' + CONFIG_SELECT + ')')
      .eq('id', proyectoId)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando configuración del hero.');
    }
    if (!result.data) {
      throw new Error('Proyecto no encontrado.');
    }

    var project = result.data;
    return {
      project: {
        id: project.id,
        nombre: project.nombre,
        ciudad: project.ciudad,
        estado: project.estado,
        constructora_id: project.constructora_id
      },
      config: normalizeConfig(project.proyecto_config) || {
        proyecto_id: project.id,
        titulo_hero: null,
        texto_hero: null,
        boton_hero_1: null,
        boton_hero_2: null,
        hero_text_color: 'light',
        hero_button_text_color: 'light',
        imagen_hero_url: null,
        video_hero_url: null,
        logo_url: null
      }
    };
  }

  async function saveHeroConfig(proyectoId, payload) {
    if (!proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
    }

    var data = sanitizePayload(payload);
    data.proyecto_id = proyectoId;

    var client = getClient();
    var updated = await client
      .from('proyecto_config')
      .update(data)
      .eq('proyecto_id', proyectoId)
      .select(CONFIG_SELECT)
      .maybeSingle();

    if (updated.error) {
      throw new Error(updated.error.message || 'No se pudo guardar la configuración.');
    }

    var saved = updated.data;
    if (!saved) {
      var inserted = await client
        .from('proyecto_config')
        .insert(data)
        .select(CONFIG_SELECT)
        .maybeSingle();
      if (inserted.error) {
        if (/duplicate|unique/i.test(inserted.error.message || '')) {
          var retry = await client
            .from('proyecto_config')
            .update(data)
            .eq('proyecto_id', proyectoId)
            .select(CONFIG_SELECT)
            .maybeSingle();
          if (retry.error) throw new Error(retry.error.message || 'No se pudo guardar la configuración.');
          saved = retry.data;
        } else {
          throw new Error(inserted.error.message || 'No se pudo guardar la configuración.');
        }
      } else {
        saved = inserted.data;
      }
    }

    if (!saved) {
      throw new Error('No se pudo guardar la configuración del hero. Verifica permisos de administrador.');
    }

    if (window.PROJECT_DATA && window.PROJECT_DATA.id === proyectoId) {
      var cfg = window.PROJECT_DATA.proyecto_config;
      if (Array.isArray(cfg)) {
        if (!cfg[0]) cfg[0] = {};
        Object.assign(cfg[0], saved);
      } else if (cfg) {
        Object.assign(cfg, saved);
      } else {
        window.PROJECT_DATA.proyecto_config = saved;
      }
      if (typeof applyHeroModule === 'function') {
        applyHeroModule(window.PROJECT_DATA);
      }
      if (typeof buildConfig === 'function') {
        window.CONFIG = buildConfig(window.PROJECT_DATA);
      }
    }

    return saved;
  }

  return {
    sanitizePayload: sanitizePayload,
    normalizeHeroTextColor: normalizeHeroTextColor,
    uploadHeroImage: uploadHeroImage,
    getForCurrentProject: getForCurrentProject,
    saveHeroConfig: saveHeroConfig
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/platform/admin-hero-api.js');}catch(_e){}
