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
    /* Quotation public URL /{slug} → Quotation Runtime (same experience as client). */
    if (String(project.experience_type || '').toLowerCase() === 'quotation' && project.id) {
      var dest;
      if (typeof QuotationRuntime !== 'undefined' && QuotationRuntime.href) {
        dest = QuotationRuntime.href(project.id);
      } else {
        dest = '/quotation/?projectId=' + encodeURIComponent(project.id) +
          '&experience_type=quotation';
      }
      try {
        window.location.replace(dest);
      } catch (eRedir) {
        window.location.href = dest;
      }
      return new Promise(function () { /* redirecting */ });
    }
    if (typeof BootDebug !== 'undefined') {
      BootDebug.log('proyecto cargado', { id: project.id, slug: project.slug, nombre: project.nombre });
    }
    return project;
  });
}

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/supabase-client.js');}catch(_e){}
