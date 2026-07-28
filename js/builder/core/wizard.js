/* Builder wizard — step orchestration (incluye Interactivo) */
var BuilderWizard = (function () {
  /* V5.9.68 — Media (Bunny CDN) visible in left rail after Galería.
     Legacy steps (interactivo, info, ai-content) kept recoverable at the end. */
  var STEPS = [
    { id: 'config', label: 'Configuración', shortLabel: 'Config', icon: 'settings', assistant: 'Define el nombre comercial, el slug y el subdominio del Showroom. El ID interno no cambia.' },
    { id: 'estructura', label: 'Estructura', shortLabel: 'Estructura', icon: 'shapes', assistant: 'Describe la estructura física del proyecto residencial: tipo de desarrollo, tipologías, plantas, ambientes y zonas.' },
    { id: 'experiencia', label: 'Experiencia', shortLabel: 'Experiencia', icon: 'layers', assistant: 'Orquesta el recorrido interactivo: nodos, conexiones y transiciones derivados de la estructura.' },
    { id: 'video-hero', label: 'Hero', shortLabel: 'Hero', icon: 'image', assistant: 'Sube un video o imagen de fondo para la portada del showroom.' },
    { id: 'branding', label: 'Logo', shortLabel: 'Logo', icon: 'palette', assistant: 'Sube el logo del proyecto. Aparecerá en el hero arriba del título.' },
    { id: 'viviendas', label: 'Viviendas', shortLabel: 'Viviendas', icon: 'building', assistant: 'Inventario y tarjetas comerciales alimentados por la estructura aplicada.' },
    { id: 'gallery', label: 'Galería', shortLabel: 'Galería', icon: 'images', assistant: 'Biblioteca de imágenes asociables a entidades del proyecto.' },
    { id: 'media', label: 'Media', shortLabel: 'Media', icon: 'images', assistant: 'Sube archivos a Bunny CDN y regístralos en el proyecto para usarlos en Experiencia.' },
    { id: 'panoramas', label: '360°', shortLabel: '360°', icon: 'view360', assistant: 'Tours 360° vinculables a tipologías, amenidades u otras entidades.' },
    { id: 'plans', label: 'Planos', shortLabel: 'Planos', icon: 'blueprint', assistant: 'Masterplan, plantas 2D/3D y planos de tipología relacionados a su contexto.' },
    { id: 'downloads', label: 'Descargables', shortLabel: 'Docs', icon: 'download', assistant: 'Documentos centralizados: brochure, fichas y especificaciones.' },
    { id: 'menu', label: 'Menú', shortLabel: 'Menú', icon: 'list', assistant: 'Configura el menú del showroom: nombre, descripción, botones y si abren sección o submenú.' },
    { id: 'hotspots', label: 'Hotspots', shortLabel: 'Hotspots', icon: 'map-pin', assistant: 'Hotspots espaciales que referencian entidades existentes (no duplican inventario).' },
    { id: 'validation', label: 'Validación', shortLabel: 'Validación', icon: 'circle-check', assistant: 'Verifica relaciones, faltantes y referencias rotas antes de publicar.' },
    { id: 'publish', label: 'Publicado', shortLabel: 'Publicado', icon: 'rocket', assistant: 'Estado de publicación, preview y URL del showroom.' },
    /* Recoverable legacy — not removed */
    { id: 'interactivo', label: 'Interactivo', shortLabel: 'Interactivo', icon: 'pen-tool', assistant: 'Laboratorio experimental: dibuja zonas poligonales sobre plantas navegables. Aún no se publica a Supabase.', legacy: true },
    { id: 'info', label: 'Información', shortLabel: 'Info', icon: 'info', assistant: 'Pega el texto comercial o sube un PDF. Extraeré toda la información del proyecto.', legacy: true },
    { id: 'ai-content', label: 'Asistente IA', shortLabel: 'IA', icon: 'sparkles', assistant: 'Con toda la información recopilada, generaré textos comerciales, FAQs y contenido para el chatbot.', legacy: true }
  ];

  var NAV_VERSION = 68;

  function getSteps() {
    return STEPS.slice();
  }

  function getPrimarySteps() {
    return STEPS.filter(function (s) { return !s.legacy; });
  }

  function getStep(index) {
    return STEPS[index] || null;
  }

  function getStepById(id) {
    return STEPS.find(function (s) { return s.id === id; }) || null;
  }

  function getStepIndex(id) {
    return STEPS.findIndex(function (s) { return s.id === id; });
  }

  function canAdvance(stepIndex, state) {
    switch (STEPS[stepIndex].id) {
      case 'config':
        return !!(state.projectInfo && state.projectInfo.nombre && state.projectInfo.slug);
      case 'estructura':
        return !!(state.estructura && state.estructura.developmentType) || !!state.projectType;
      case 'experiencia':
        return true;
      case 'branding':
        return !!(state.branding && (state.branding.logo || state.branding.reference));
      case 'video-hero':
        return true;
      case 'menu':
        return true;
      case 'viviendas':
        return true;
      case 'gallery':
        return true;
      case 'media':
        return true;
      case 'panoramas':
        return true;
      case 'interactivo':
        return true;
      case 'plans':
        return true;
      case 'downloads':
        return true;
      case 'info':
        return !!(state.projectInfo && state.projectInfo.nombre);
      case 'ai-content':
        return !!(state.aiContent && state.aiContent.heroText);
      case 'hotspots':
        return true;
      case 'validation':
        return !!(state.validation && state.validation.ready);
      case 'publish':
        return false;
      default:
        return true;
    }
  }

  function progressPercent(stepIndex) {
    var primary = getPrimarySteps();
    var step = STEPS[stepIndex];
    if (!step || step.legacy) {
      return Math.round(((stepIndex + 1) / STEPS.length) * 100);
    }
    var pi = primary.findIndex(function (s) { return s.id === step.id; });
    if (pi < 0) return 0;
    return Math.round(((pi + 1) / primary.length) * 100);
  }

  return {
    STEPS: STEPS,
    NAV_VERSION: NAV_VERSION,
    getSteps: getSteps,
    getPrimarySteps: getPrimarySteps,
    getStep: getStep,
    getStepById: getStepById,
    getStepIndex: getStepIndex,
    canAdvance: canAdvance,
    progressPercent: progressPercent
  };
})();
