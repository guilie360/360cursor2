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
  return fetch(SUPABASE_URL + path, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      Accept: 'application/json'
    }
  }).then(function (response) {
    if (!response.ok) throw new Error('Supabase request failed: ' + response.status);
    return response.json();
  });
}

function fetchPublishedProject() {
  var slug = getProjectSlugFromUrl();
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
    'viviendas(id,nombre,codigo,tipo,torre,piso,area_m2,habitaciones,banos,parqueaderos,precio,administracion,descripcion,estado,publicado,archivos(id,nombre,url,tipo,miniatura_url,orden))',
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
    return rows[0];
  });
}
