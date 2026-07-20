console.log("BOOT ENTER js/auth/api/favoritos.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/api/favoritos.js');}catch(_e){}
/* Visitor favorites API — uses existing favoritos table */
var FavoritosApi = (function () {
  var SELECT =
    'vivienda_id, created_at, ' +
    'viviendas(id, nombre, codigo, area_m2, precio, habitaciones, banos, estado, proyecto_id, ' +
    'proyectos:proyecto_id(id, nombre, slug))';

  function getClient() {
    return PlatformAuth.getClient();
  }

  async function listByVisitante(visitanteId) {
    var result = await getClient()
      .from('favoritos')
      .select(SELECT)
      .eq('visitante_id', visitanteId)
      .order('created_at', { ascending: false });

    if (result.error) {
      throw new Error(result.error.message || 'Error cargando favoritos');
    }
    return result.data || [];
  }

  async function listViviendaIds(visitanteId) {
    var rows = await listByVisitante(visitanteId);
    return rows.map(function (row) { return row.vivienda_id; });
  }

  async function add(visitanteId, viviendaId) {
    var result = await getClient()
      .from('favoritos')
      .upsert({ visitante_id: visitanteId, vivienda_id: viviendaId }, { onConflict: 'visitante_id,vivienda_id' });

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo guardar el favorito');
    }
    return true;
  }

  async function remove(visitanteId, viviendaId) {
    var result = await getClient()
      .from('favoritos')
      .delete()
      .eq('visitante_id', visitanteId)
      .eq('vivienda_id', viviendaId);

    if (result.error) {
      throw new Error(result.error.message || 'No se pudo quitar el favorito');
    }
    return true;
  }

  function groupProjects(rows) {
    var map = {};
    rows.forEach(function (row) {
      var vivienda = row.viviendas || {};
      var proyecto = vivienda.proyectos || {};
      if (!proyecto.id) return;
      if (!map[proyecto.id]) {
        map[proyecto.id] = {
          id: proyecto.id,
          nombre: proyecto.nombre || 'Proyecto',
          slug: proyecto.slug || '',
          unitsCount: 0
        };
      }
      map[proyecto.id].unitsCount += 1;
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  return {
    listByVisitante: listByVisitante,
    listViviendaIds: listViviendaIds,
    add: add,
    remove: remove,
    groupProjects: groupProjects
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/api/favoritos.js');}catch(_e){}

console.log("BOOT EXIT js/auth/api/favoritos.js");
