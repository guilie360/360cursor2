try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/supabase-client.js');}catch(_e){}
/* Public site — read-only Supabase REST client (no auth session) */
/* getProjectSlugFromUrl: defined in js/shared/config.js */

function supabaseFetch(path) {
  console.log('[BOOT] supabaseFetch START');
  if (typeof BootDebug !== 'undefined') {
    BootDebug.log('supabaseFetch', path.slice(0, 120) + (path.length > 120 ? '…' : ''));
  }
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.log('[BOOT] supabaseFetch ERROR');
    console.log('[BOOT] supabaseFetch END');
    return Promise.reject(new Error('SUPABASE_URL / SUPABASE_ANON_KEY no definidos'));
  }

  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timedOut = false;
  var timer = setTimeout(function () {
    timedOut = true;
    if (controller) controller.abort();
  }, 15000);

  var fetchOpts = {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      Accept: 'application/json'
    }
  };
  if (controller) fetchOpts.signal = controller.signal;

  return fetch(SUPABASE_URL + path, fetchOpts)
    .then(function (response) {
      clearTimeout(timer);
      console.log('[BOOT] supabaseFetch RESPONSE');
      if (typeof BootDebug !== 'undefined') BootDebug.log('supabaseFetch status', response.status);
      if (!response.ok) throw new Error('Supabase request failed: ' + response.status);
      return response.json();
    })
    .then(function (data) {
      console.log('[BOOT] supabaseFetch END');
      return data;
    })
    .catch(function (err) {
      clearTimeout(timer);
      console.log('[BOOT] supabaseFetch ERROR');
      console.log('[BOOT] supabaseFetch END');
      if (timedOut || (err && err.name === 'AbortError')) {
        throw new Error('Supabase request timeout');
      }
      throw err;
    });
}

/**
 * Apply Open Graph / document meta from proyecto_config for public slug pages.
 * Crawlers (WhatsApp) still need og-preview.php; this keeps in-browser meta aligned.
 */
function applyPublicShareMeta(project) {
  project = project || {};
  var cfg = project.proyecto_config;
  if (Array.isArray(cfg)) cfg = cfg[0] || {};
  cfg = cfg || {};

  var title = String(
    cfg.page_title || cfg.og_title || project.nombre || project.slug || '360Preventa'
  ).trim();
  var description = String(cfg.og_description || project.descripcion || '').trim();
  var image = String(cfg.og_image || '').trim();
  var url = '';
  try {
    url = window.location.origin + '/' + encodeURIComponent(String(project.slug || '').trim());
  } catch (_eUrl) {
    url = '';
  }

  function upsertMeta(attr, key, content) {
    if (!content) return;
    var sel = 'meta[' + attr + '="' + key + '"]';
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function applyFavicon(href) {
    if (!href) return;
    var absolute = String(href).trim();
    if (!absolute) return;
    if (absolute.indexOf('http') !== 0 && absolute.indexOf('//') !== 0) {
      try {
        absolute = new URL(absolute, window.location.origin).href;
      } catch (_eAbs) {}
    }
    if (absolute.indexOf('?') < 0) absolute += '?v=ws7300';

    var stale = document.head.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    Array.prototype.forEach.call(stale, function (node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });

    function addLink(rel, sizes) {
      var link = document.createElement('link');
      link.rel = rel;
      link.type = 'image/png';
      if (sizes) link.setAttribute('sizes', sizes);
      link.href = absolute;
      document.head.appendChild(link);
    }

    addLink('icon', '32x32');
    addLink('icon', '192x192');
    addLink('apple-touch-icon', '180x180');
  }

  if (title) {
    document.title = title;
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);
  }
  if (description) {
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:description', description);
  }
  if (image) {
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:secure_url', image);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
  }
  if (url) {
    upsertMeta('property', 'og:url', url);
  }
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', '360Preventa');

  var favicon = String(cfg.favicon_url || cfg.logo_url || '').trim();
  var slug = String(project.slug || '').toLowerCase();
  if (!favicon && (slug === 'taroa' || slug === 'taroa-propuesta' || slug.indexOf('taroa') === 0)) {
    favicon = '/assets/taroa/favicon.png';
  }
  applyFavicon(favicon);
}

/**
 * Keep the public /{slug} address bar; paint Quotation Runtime full-viewport.
 * Runtime still loads by projectId internally (iframe) — visitor never sees that URL.
 */
function handoffQuotationPublicExperience(project) {
  project = project || {};
  var id = String(project.id || '').trim();
  if (!id) {
    return Promise.reject(new Error('Cotización sin projectId'));
  }

  try {
    var hq = project.proyecto_config && (
      Array.isArray(project.proyecto_config)
        ? project.proyecto_config[0]
        : project.proyecto_config
    );
    var hero = hq && hq.hero_quotation ? hq.hero_quotation : null;
    console.groupCollapsed('[QE-AUDIT V7.2.27] G.public-slug-handoff');
    console.log({
      projectId: id,
      slug: project.slug || null,
      source: 'fetchPublishedProject → handoffQuotationPublicExperience → iframe /quotation/?projectId=',
      experience_type: project.experience_type || null,
      hero_quotation_canvas: hero && hero.canvas ? hero.canvas : null,
      timestamp: new Date().toISOString()
    });
    console.log('[QE-AUDIT] hero_quotation.canvas JSON ↓');
    console.log(JSON.stringify(hero && hero.canvas ? hero.canvas : null, null, 2));
    console.groupEnd();
  } catch (eAudH) {}

  var runtimeSrc;
  try {
    var handoffParams = new URLSearchParams(window.location.search || '');
    var u = new URL('/quotation/', window.location.origin);
    u.searchParams.set('projectId', id);
    u.searchParams.set('experience_type', 'quotation');
    u.searchParams.set('build', 'ws7865');
    if (handoffParams.get('live') === '1' || handoffParams.get('live') === 'true') {
      u.searchParams.set('live', '1');
    }
    if (handoffParams.get('preview') === '1' || handoffParams.get('preview') === 'true') {
      u.searchParams.set('preview', '1');
    }
    runtimeSrc = u.href;
  } catch (e) {
    runtimeSrc = '/quotation/?projectId=' + encodeURIComponent(id) +
      '&experience_type=quotation&build=ws7865';
    try {
      var hp = new URLSearchParams(window.location.search || '');
      if (hp.get('live') === '1' || hp.get('live') === 'true') {
        runtimeSrc += '&live=1';
      }
      if (hp.get('preview') === '1' || hp.get('preview') === 'true') {
        runtimeSrc += '&preview=1';
      }
    } catch (eHp) { /* ignore */ }
  }

  try {
    document.title = String(
      (project.proyecto_config && (
        Array.isArray(project.proyecto_config)
          ? (project.proyecto_config[0] && project.proyecto_config[0].page_title)
          : project.proyecto_config.page_title
      )) ||
      project.nombre ||
      project.slug ||
      'Cotización'
    ).trim();
    try {
      applyPublicShareMeta(project);
    } catch (_eShare) {}
  } catch (eTitle) {}

  try {
    document.documentElement.classList.add('qr-public-handoff');
    document.body.className = 'qr-host qr-public-handoff-body';
    document.body.style.cssText =
      'margin:0;padding:0;overflow:hidden;background:#000;width:100%;height:100%;';
    document.body.innerHTML = '';
    var frame = document.createElement('iframe');
    frame.className = 'qr-public-handoff-frame';
    frame.title = project.nombre || 'Cotización';
    frame.setAttribute('allow', 'fullscreen; autoplay; encrypted-media');
    frame.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;' +
      'background:#000;z-index:2147483000;display:block;';
    frame.src = runtimeSrc;
    document.body.appendChild(frame);
  } catch (eMount) {
    console.error('[handoffQuotationPublicExperience]', eMount);
    return Promise.reject(eMount);
  }

  /* Never resolve — showroom boot must not continue after handoff. */
  return new Promise(function () {});
}

function fetchPublishedProject() {
  var slug = typeof getProjectSlugFromUrl === 'function' ? getProjectSlugFromUrl() : null;
  if (typeof BootDebug !== 'undefined') BootDebug.log('fetchPublishedProject slug', slug);
  if (!slug) {
    return Promise.reject(new Error('Sin proyecto en la URL'));
  }
  var select = [
    'id',
    'nombre',
    'slug',
    'descripcion',
    'ciudad',
    'direccion',
    'latitud',
    'longitud',
    'whatsapp',
    'email',
    'sitio_web',
    'instagram_url',
    'estado',
    'experience_type',
    'proyecto_config(*)',
    'constructoras(id,nombre,descripcion,ciudad,direccion,telefono,email,sitio_web,logo_url)',
    'proyecto_amenidades(descripcion,imagen_url,amenidades(nombre,icono,categoria))',
    'proyecto_avances(etapa,porcentaje,estado,orden,fecha_entrega,updated_at)',
    'tipologias(id,nombre,habitaciones,banos,area_m2,precio,imagen_url,video_url,orden)',
    'viviendas(id,nombre,codigo,tipo,torre,piso,area_m2,habitaciones,banos,parqueaderos,precio,administracion,descripcion,estado,publicado,planos_modo,tour360_modo,archivos(id,nombre,url,tipo,miniatura_url,orden,extension))',
    'archivos(id,nombre,extension,url,tipo,orden,vivienda_id)'
  ].join(',');

  var path = '/rest/v1/proyectos?select=' + encodeURIComponent(select) +
    '&publicado=eq.true&slug=eq.' + encodeURIComponent(slug);

  return supabaseFetch(path).then(function (rows) {
    console.log('[FETCH PROJECT]', {
      slug: slug,
      rows: rows,
      length: Array.isArray(rows) ? rows.length : null,
      type: typeof rows
    });
    if (!rows || !rows.length) throw new Error('No hay proyectos publicados');
    var project = rows[0];
    /*
     * Quotation public URL must stay /{slug} (address bar = client URL).
     * Do NOT redirect to /quotation/?projectId=… — mount Runtime in-place instead.
     */
    if (String(project.experience_type || '').toLowerCase() === 'quotation' && project.id) {
      return handoffQuotationPublicExperience(project);
    }
    try {
      document.documentElement.classList.remove('slug-boot-pending');
    } catch (_eReady) {}
    try {
      applyPublicShareMeta(project);
    } catch (_eShare2) {}
    if (typeof BootDebug !== 'undefined') {
      BootDebug.log('proyecto cargado', { id: project.id, slug: project.slug, nombre: project.nombre });
    }
    return project;
  }).catch(function (err) {
    try {
      document.documentElement.classList.remove('slug-boot-pending');
    } catch (_eFail) {}
    throw err;
  });
}

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/supabase-client.js');}catch(_e){}
