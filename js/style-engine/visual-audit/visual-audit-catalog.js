console.log("BOOT ENTER js/style-engine/visual-audit/visual-audit-catalog.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/visual-audit/visual-audit-catalog.js');}catch(_e){}
/* Visual Audit — Catálogo completo de pantallas a fotografiar */
var VisualAuditCatalog = (function () {
  function buildShowroomScenes() {
    var scenes = [];

    scenes.push({
      id: 'hero',
      name: 'Hero / Landing',
      slug: 'home',
      waitMs: 700,
      open: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }
    });

    scenes.push({
      id: 'menu-primary',
      name: 'Menú principal',
      slug: 'menu',
      waitMs: 500,
      open: function (api) { return api.openMenuLevel('menu-primary'); },
      close: function (api) { return api.closeMenus(); }
    });

    scenes.push({
      id: 'menu-proyecto',
      name: 'Menú — Conoce el proyecto',
      slug: 'menu-proyecto',
      waitMs: 500,
      open: function (api) { return api.openMenuLevel('menu-proyecto'); },
      close: function (api) { return api.closeMenus(); }
    });

    scenes.push({
      id: 'menu-contacto',
      name: 'Menú — Contacto',
      slug: 'menu-contacto',
      waitMs: 500,
      open: function (api) { return api.openMenuLevel('menu-contacto'); },
      close: function (api) { return api.closeMenus(); }
    });

    var contentPopups = [
      { id: 'descripcion', name: 'Descripción', slug: 'popup-descripcion' },
      { id: 'amenidades', name: 'Amenidades', slug: 'popup-amenidades' },
      { id: 'estado', name: 'Estado de obra', slug: 'popup-estado' },
      { id: 'constructora', name: 'Constructora', slug: 'popup-constructora' },
      { id: 'descargas', name: 'Descargas', slug: 'popup-descargas' },
      { id: 'video', name: 'Video', slug: 'popup-video' },
      { id: 'renders', name: 'Galería', slug: 'popup-galeria' },
      { id: 'location', name: 'Ubicación', slug: 'popup-ubicacion' },
      { id: 'tour360', name: 'Tour 360° — zonas', slug: 'tour-360', waitMs: 1200 }
    ];

    contentPopups.forEach(function (item) {
      scenes.push({
        id: item.id,
        name: item.name,
        slug: item.slug,
        waitMs: item.waitMs || 700,
        open: function (api) { return api.openScreen(item.id); },
        close: function (api) { return api.closeScreen(item.id); }
      });
    });

    /* —— Viviendas y acciones de tarjeta —— */
    scenes.push({
      id: 'viviendas-todas',
      name: 'Viviendas — Todas',
      slug: 'viviendas-todas',
      waitMs: 800,
      open: function (api) { return api.openUnitsAll(); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'viviendas-favoritos',
      name: 'Viviendas — Favoritos',
      slug: 'viviendas-favoritos',
      waitMs: 800,
      optional: true,
      open: function (api) { return api.openUnitsFavorites(); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'viviendas-comparar',
      name: 'Viviendas — Comparar',
      slug: 'viviendas-comparar',
      waitMs: 900,
      optional: true,
      open: function (api) { return api.openUnitsCompare(); },
      close: function (api) { return api.closeUnitsCompare(); }
    });

    scenes.push({
      id: 'vivienda-calcular-cuota',
      name: 'Vivienda — Calcular cuota',
      slug: 'vivienda-calcular-cuota',
      waitMs: 800,
      optional: true,
      open: function (api) { return api.openUnitCalculator(); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'vivienda-ver-planos',
      name: 'Vivienda — Ver planos',
      slug: 'vivienda-ver-planos',
      waitMs: 900,
      optional: true,
      open: function (api) { return api.openUnitPlans(); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'vivienda-ver-360',
      name: 'Vivienda — Ver 360°',
      slug: 'vivienda-ver-360',
      waitMs: 1200,
      optional: true,
      open: function (api) { return api.openUnitSphere(); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'tour-sphere',
      name: 'Tour — Visor 360 fullscreen',
      slug: 'tour-visor-360',
      waitMs: 1000,
      optional: true,
      open: function (api) { return api.openScreen('sphere', ''); },
      close: function (api) { return api.closeScreen(); }
    });

    scenes.push({
      id: 'auth-gate',
      name: 'Auth — Gate',
      slug: 'auth-gate',
      waitMs: 600,
      open: function (api) { return api.openAuth('gate'); },
      close: function (api) { return api.closeAuth(); }
    });

    scenes.push({
      id: 'auth-login',
      name: 'Auth — Login',
      slug: 'auth-login',
      waitMs: 600,
      open: function (api) { return api.openAuth('login'); },
      close: function (api) { return api.closeAuth(); }
    });

    scenes.push({
      id: 'email-verification',
      name: 'Verificación de correo',
      slug: 'verificacion',
      waitMs: 500,
      optional: true,
      open: function (api) { return api.openEmailVerification(); },
      close: function (api) { return api.closeEmailVerification(); }
    });

    scenes.push({
      id: 'pause-screen',
      name: 'Pantalla de pausa',
      slug: 'pause-screen',
      waitMs: 500,
      optional: true,
      open: function (api) { return api.openPauseScreen(); },
      close: function (api) { return api.closePauseScreen(); }
    });

    scenes.push({
      id: 'toast-sample',
      name: 'Toast',
      slug: 'toast',
      waitMs: 400,
      open: function (api) { return api.showToastSample(); },
      close: function () { return Promise.resolve(); }
    });

    scenes.push({
      id: 'style-engine',
      name: 'Style Engine',
      slug: 'style-engine',
      waitMs: 500,
      open: function (api) {
        return api.hideStyleEngineForAudit().then(function () {
          return api.ensureStyleEngineVisible();
        });
      },
      close: function (api) { return api.hideStyleEngineForAudit(); }
    });

    scenes.push({
      id: 'floating-chrome',
      name: 'Botones flotantes',
      slug: 'floating',
      waitMs: 300,
      open: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }
    });

    return scenes;
  }

  function getAllScenes() {
    return buildShowroomScenes();
  }

  return {
    getAllScenes: getAllScenes,
    buildShowroomScenes: buildShowroomScenes
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/visual-audit/visual-audit-catalog.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/visual-audit/visual-audit-catalog.js");
