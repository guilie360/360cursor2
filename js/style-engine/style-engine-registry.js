/* Style Engine — Component Registry (inventario + estado de migración) */
var StyleEngineRegistry = (function () {
  var STATUS = {
    MIGRATED: 'migrated',
    ADAPTER: 'adapter',
    LEGACY: 'legacy'
  };

  var TYPE = {
    SCREEN: 'screen',
    POPUP: 'popup',
    OVERLAY: 'overlay',
    PRIMITIVE: 'primitive',
    PANEL: 'panel',
    SYSTEM: 'system'
  };

  /**
   * Inventario completo de superficies visuales BOXIES.
   * migrated  = consume tokens --se-* o VisualSystem directamente
   * adapter   = usa variables legacy (--bg-main, etc.) alimentadas por VisualSystem en LIVE
   * legacy    = estilos hardcodeados / fuente independiente (pendiente migración)
   */
  var COMPONENTS = [
    /* —— Pantallas principales —— */
    { id: 'hero', name: 'Hero / Landing', route: '#projectCover', type: TYPE.SCREEN, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'main-menu', name: 'Menú principal / Sidebar', route: '#mainMenu', type: TYPE.PANEL, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css', 'js/visitor-menu.js'] },
    { id: 'menu-primary', name: 'Menú — Nivel principal', route: '#mainMenuListPrimary', type: TYPE.PANEL, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'menu-proyecto', name: 'Menú — Conoce el proyecto', route: '#mainMenuListProyecto', type: TYPE.PANEL, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'menu-contacto', name: 'Menú — Contacto', route: '#mainMenuListContacto', type: TYPE.PANEL, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'menu-personalizar', name: 'Menú — Personalizar', route: '#mainMenuListPersonalizar', type: TYPE.PANEL, status: STATUS.LEGACY, files: ['js/visitor-personalize-panel.js', 'css/components.css'] },
    { id: 'pause-screen', name: 'Pantalla de pausa', route: '#navResumeGate', type: TYPE.OVERLAY, status: STATUS.ADAPTER, files: ['js/pause-screen/pause-screen.js', 'css/components.css'] },
    { id: 'floating-whatsapp', name: 'Botón flotante WhatsApp', route: '#whatsappFloat', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'floating-share', name: 'Botón flotante Compartir', route: '#shareProjectFloatBtn', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'global-close', name: 'Cerrar / Pantalla completa', route: '#globalActionStack', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['js/global-close.js', 'css/components.css'] },

    /* —— Viviendas —— */
    { id: 'units-popup', name: 'Popup Viviendas', route: '#unitsPopup', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'unit-card', name: 'Housing Card', route: '.unit-card', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['js/main.js', 'css/components.css'] },
    { id: 'favorites-tab', name: 'Favoritos', route: '#unitsTabFav', type: TYPE.SCREEN, status: STATUS.ADAPTER, files: ['index.html', 'js/main.js'] },
    { id: 'compare-panel', name: 'Comparador', route: '#unitsComparePanel', type: TYPE.PANEL, status: STATUS.ADAPTER, files: ['index.html', 'js/main.js', 'css/components.css'] },
    { id: 'compare-limit', name: 'Overlay límite comparador', route: '.uc-limit-overlay', type: TYPE.OVERLAY, status: STATUS.ADAPTER, files: ['js/main.js'] },
    { id: 'calculator-modal', name: 'Popup Calculadora', route: '#calculatorModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'pdf-modal', name: 'Popup Planos / PDF', route: '#pdfModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },

    /* —— Tour / Mapa / Media —— */
    { id: 'tour360-popup', name: 'Popup Tour 360°', route: '#tour360Popup', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'sphere-modal', name: 'Visor 360° fullscreen', route: '#sphereModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'location-modal', name: 'Popup Ubicación / Mapa', route: '#locationModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'video-modal', name: 'Popup Video', route: '#videoModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'renders-modal', name: 'Popup Galería', route: '#rendersModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html', 'css/components.css'] },
    { id: 'renders-lightbox', name: 'Lightbox Galería', route: '#rendersLightbox', type: TYPE.OVERLAY, status: STATUS.ADAPTER, files: ['index.html', 'js/main.js'] },

    /* —— Contenido proyecto —— */
    { id: 'descripcion-modal', name: 'Popup Descripción', route: '#descripcionModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'amenidades-modal', name: 'Popup Amenidades', route: '#amenidadesModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'estado-modal', name: 'Popup Estado de obra', route: '#estadoModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'constructora-modal', name: 'Popup Constructora', route: '#constructoraModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'descargas-modal', name: 'Popup Descargas', route: '#descargasModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },

    /* —— Auth / Verificación —— */
    { id: 'auth-modal', name: 'Login / Registro (showroom)', route: '#authExperienceModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['js/visitor-auth-modal.js', 'css/components.css'] },
    { id: 'email-verification', name: 'Verificación de correo', route: '#emailVerificationModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['js/visitor-email-verification.js'] },
    { id: 'auth-ingresar', name: 'Página Ingresar', route: 'auth/ingresar.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['auth/ingresar.html', 'admin/css/admin-auth.css'] },
    { id: 'auth-registro', name: 'Página Registro', route: 'auth/registro.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['auth/registro.html'] },
    { id: 'auth-cuenta', name: 'Dashboard visitante (Mi espacio)', route: 'auth/cuenta.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['auth/cuenta.html', 'admin/css/admin-auth.css'] },

    /* —— Theme / Style systems —— */
    { id: 'theme-editor-legacy', name: 'Theme Editor Legacy', route: '#mainMenuListPersonalizar', type: TYPE.SYSTEM, status: STATUS.LEGACY, files: ['js/visitor-personalize-panel.js', 'js/theme-system.js'] },
    { id: 'theme-ai-modal', name: 'Generar tema con IA (legacy)', route: '#themeAiModal', type: TYPE.POPUP, status: STATUS.LEGACY, files: ['js/theme-ai/theme-ai-modal.js'] },
    { id: 'style-engine', name: 'Style Engine', route: '#styleEngineModal', type: TYPE.SYSTEM, status: STATUS.MIGRATED, files: ['js/style-engine/*.js', 'css/style-engine.css'] },

    /* —— Primitivos UI —— */
    { id: 'btn-primary', name: 'Botón principal', route: '.project-cover-btn', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'btn-secondary', name: 'Botón secundario / outline', route: '.outline-btn', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'btn-ghost', name: 'Botón ghost / icon', route: '.unit-card-icon-btn', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'inputs', name: 'Inputs / Selects', route: '.auth-field, .select-wrap', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'toggle', name: 'Toggle switch', route: '.toggle-switch', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'badge', name: 'Badge disponibilidad', route: '.availability-badge', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'toast', name: 'Toast', route: '#appToast', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['js/main.js', 'css/components.css'] },
    { id: 'loader', name: 'Loader / Spinner', route: '.sphere-spinner', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'progress', name: 'Barras de progreso', route: '.progress-overall', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['js/main.js', 'css/components.css'] },
    { id: 'tabs', name: 'Tabs Viviendas', route: '.units-tabs', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'tables', name: 'Tablas comparador', route: '.uc-matrix', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'glass-surface', name: 'Glass material system', route: '.glass-surface', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css', 'css/variables.css'] },
    { id: 'content-modal', name: 'Modal base', route: '.content-modal', type: TYPE.PRIMITIVE, status: STATUS.ADAPTER, files: ['css/components.css'] },
    { id: 'backdrop', name: 'Backdrop / Overlay mask', route: '.main-menu-backdrop', type: TYPE.OVERLAY, status: STATUS.ADAPTER, files: ['css/components.css', 'css/variables.css'] },

    /* —— Admin —— */
    { id: 'admin-login', name: 'Admin Login', route: 'admin/login.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['admin/login.html', 'admin/css/admin-auth.css'] },
    { id: 'admin-dashboard', name: 'Admin Dashboard', route: 'admin/dashboard.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['admin/dashboard.html', 'admin/css/admin-auth.css'] },
    { id: 'admin-modal', name: 'Modal admin genérico', route: '.admin-modal', type: TYPE.POPUP, status: STATUS.LEGACY, files: ['admin/js/core/ui.js'] },
    { id: 'admin-toast', name: 'Toast admin', route: '.admin-toast', type: TYPE.PRIMITIVE, status: STATUS.LEGACY, files: ['admin/js/core/notifications.js'] },
    { id: 'ai-project-builder', name: 'AI Project Builder', route: 'admin/ai-project-builder.html', type: TYPE.SCREEN, status: STATUS.LEGACY, files: ['admin/ai-project-builder.html', 'admin/css/ai-project-builder.css'] },
    { id: 'admin-hero-view', name: 'Admin — Editor Hero', route: 'admin/js/views/hero.js', type: TYPE.PANEL, status: STATUS.LEGACY, files: ['admin/js/views/hero.js'] },
    { id: 'admin-proyectos', name: 'Admin — Proyectos', route: 'admin/js/views/proyectos.js', type: TYPE.PANEL, status: STATUS.LEGACY, files: ['admin/js/views/proyectos.js'] },

    /* —— Confirmaciones —— */
    { id: 'theme-confirm', name: 'Confirmar tema oficial', route: '#projectThemeConfirmModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] },
    { id: 'preset-delete', name: 'Eliminar preset oficial', route: '#officialPresetDeleteModal', type: TYPE.POPUP, status: STATUS.ADAPTER, files: ['index.html'] }
  ];

  function getAll() {
    return COMPONENTS.slice();
  }

  function getById(id) {
    return COMPONENTS.find(function (c) { return c.id === id; }) || null;
  }

  function getByStatus(status) {
    return COMPONENTS.filter(function (c) { return c.status === status; });
  }

  function getCoverageStats() {
    var total = COMPONENTS.length;
    var migrated = getByStatus(STATUS.MIGRATED).length;
    var adapter = getByStatus(STATUS.ADAPTER).length;
    var legacy = getByStatus(STATUS.LEGACY).length;
    var connected = migrated + adapter;
    var percent = total ? Math.round((connected / total) * 100) : 0;
    return {
      total: total,
      migrated: migrated,
      adapter: adapter,
      legacy: legacy,
      connected: connected,
      pending: legacy,
      percent: percent
    };
  }

  function inheritsFromStyleEngine(component) {
    return component.status === STATUS.MIGRATED || component.status === STATUS.ADAPTER;
  }

  function getStatusLabel(status) {
    if (status === STATUS.MIGRATED) return 'Migrado';
    if (status === STATUS.ADAPTER) return 'Adapter';
    return 'Legacy';
  }

  return {
    STATUS: STATUS,
    TYPE: TYPE,
    getAll: getAll,
    getById: getById,
    getByStatus: getByStatus,
    getCoverageStats: getCoverageStats,
    inheritsFromStyleEngine: inheritsFromStyleEngine,
    getStatusLabel: getStatusLabel
  };
})();

var ComponentRegistry = StyleEngineRegistry;
