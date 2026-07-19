try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/supabase-client.js');}catch(_e){}
/* Public site — read-only Supabase REST client (no auth session) */
function getProjectSlugFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    return params.get('proyecto') || (typeof DEFAULT_PROJECT_SLUG !== 'undefined' ? DEFAULT_PROJECT_SLUG : null);
  } catch (e) {
    return typeof DEFAULT_PROJECT_SLUG !== 'undefined' ? DEFAULT_PROJECT_SLUG : null;
  }
}

function supabaseFetch(path) {
  if (typeof BootDebug !== 'undefined') {
    BootDebug.log('supabaseFetch', path.slice(0, 120) + (path.length > 120 ? '…' : ''));
  }
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
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
      if (typeof BootDebug !== 'undefined') BootDebug.log('supabaseFetch status', response.status);
      if (!response.ok) throw new Error('Supabase request failed: ' + response.status);
      return response.json();
    })
    .catch(function (err) {
      clearTimeout(timer);
      if (timedOut || (err && err.name === 'AbortError')) {
        throw new Error('Supabase request timeout');
      }
      throw err;
    });
}

function fetchPublishedProject() {
  var slug = getProjectSlugFromUrl();
  if (typeof BootDebug !== 'undefined') BootDebug.log('fetchPublishedProject slug', slug);
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
    'proyecto_config(*)',
    'constructoras(id,nombre,descripcion,ciudad,direccion,telefono,email,sitio_web,logo_url)',
    'proyecto_amenidades(descripcion,imagen_url,amenidades(nombre,icono,categoria))',
    'proyecto_avances(etapa,porcentaje,estado,orden,fecha_entrega,updated_at)',
    'tipologias(id,nombre,habitaciones,banos,area_m2,precio,imagen_url,video_url,orden)',
    'viviendas(id,nombre,codigo,tipo,torre,piso,area_m2,habitaciones,banos,parqueaderos,precio,administracion,descripcion,estado,publicado,planos_modo,tour360_modo,archivos(id,nombre,url,tipo,miniatura_url,orden,extension))',
    'archivos(id,nombre,extension,url,tipo,orden,vivienda_id)'
  ].join(',');

  var path = '/rest/v1/proyectos?select=' + encodeURIComponent(select) + '&publicado=eq.true';
  if (slug) {
    path += '&slug=eq.' + encodeURIComponent(slug);
  } else {
    path += '&order=created_at.asc&limit=1';
  }

  return supabaseFetch(path).then(function (rows) {
    if (!rows || !rows.length) throw new Error('No hay proyectos publicados');
    if (typeof BootDebug !== 'undefined') {
      BootDebug.log('proyecto cargado', { id: rows[0].id, slug: rows[0].slug, nombre: rows[0].nombre });
    }
    return rows[0];
  });
}

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/supabase-client.js');}catch(_e){}
