console.log("BOOT ENTER js/theme-ai/theme-ai-source.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-ai-source.js');}catch(_e){}
/* Adaptadores de fuentes de inspiración para generación de temas (extensible) */
var ThemeAISource = (function () {
  var handlers = {};

  function register(type, handler) {
    handlers[type] = handler;
  }

  function analyze(type, input) {
    var handler = handlers[type];
    if (!handler) {
      return Promise.reject(new Error('Fuente de inspiración no soportada todavía.'));
    }
    return handler(input);
  }

  register(ThemeBrandAnalyzer.SOURCE_TYPES.image, function (file) {
    return ThemeBrandAnalyzer.analyzeImage(file);
  });

  /* Futuro:
  register(ThemeBrandAnalyzer.SOURCE_TYPES.website, function (url) { ... });
  register(ThemeBrandAnalyzer.SOURCE_TYPES.pdf, function (file) { ... });
  register(ThemeBrandAnalyzer.SOURCE_TYPES.brandManual, function (file) { ... });
  */

  return {
    SOURCE_TYPES: ThemeBrandAnalyzer.SOURCE_TYPES,
    register: register,
    analyze: analyze
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-ai-source.js');}catch(_e){}

console.log("BOOT EXIT js/theme-ai/theme-ai-source.js");
