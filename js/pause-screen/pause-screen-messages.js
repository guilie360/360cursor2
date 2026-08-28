try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/pause-screen/pause-screen-messages.js');}catch(_e){}
/* Mensajes predeterminados — categorías para la pantalla de pausa */
var PauseScreenMessages = (function () {
  var CATEGORIES = {
    bienvenida: [
      'Tu proyecto sigue esperándote.',
      'Bienvenido de nuevo.',
      'Gracias por regresar.',
      'Todo está listo para continuar.',
      'Retoma el recorrido cuando quieras.',
      'La experiencia continúa aquí.',
      'Sigamos explorando.'
    ],
    descubrimiento: [
      'Cada espacio fue pensado hasta el último detalle.',
      'Observa cómo cambia la percepción desde cada ángulo.',
      'Un recorrido puede revelar más que una imagen.',
      'Explorar también es descubrir.',
      'Siempre hay algo nuevo por observar.',
      'Cada ambiente cuenta una historia.'
    ],
    arquitectura: [
      'La arquitectura también se vive antes de construirse.',
      'Un buen diseño se entiende mejor al recorrerlo.',
      'La luz transforma cada espacio.',
      'Cada proyecto comienza con una visión.',
      'El diseño está en los detalles.',
      'Un recorrido vale más que muchas fotografías.'
    ],
    inspiracion: [
      'Imagina vivir aquí.',
      'Cada recorrido acerca un poco más a la decisión correcta.',
      'Descubrir un espacio también inspira.',
      'La mejor vista suele estar a un clic más.',
      'Las buenas experiencias merecen explorarse sin prisa.',
      'Un nuevo detalle puede cambiar tu perspectiva.'
    ],
    plataforma: [
      'Tu progreso se conserva automáticamente.',
      'Puedes volver cuando quieras.',
      'Explora cada ambiente a tu ritmo.',
      'Comparte este proyecto fácilmente.',
      'Guarda este proyecto entre tus favoritos.'
    ]
  };

  function flattenDefaults() {
    var list = [];
    Object.keys(CATEGORIES).forEach(function (key) {
      CATEGORIES[key].forEach(function (text) {
        list.push(text);
      });
    });
    return list;
  }

  function buildPool(customMessages) {
    var pool = flattenDefaults().slice();
    if (Array.isArray(customMessages)) {
      customMessages.forEach(function (msg) {
        var trimmed = String(msg || '').trim();
        if (trimmed) pool.push(trimmed);
      });
    }
    return pool;
  }

  return {
    CATEGORIES: CATEGORIES,
    flattenDefaults: flattenDefaults,
    buildPool: buildPool
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/pause-screen/pause-screen-messages.js');}catch(_e){}
