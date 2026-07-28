/* Builder wizard — step orchestration (V5.9.77 slim flow) */
var BuilderWizard = (function () {
  /**
   * Primary nav order:
   * Config → Estructura → Experiencia → Hero → Media → Menú → Publicado → Info
   *
   * Steps with hidden:true stay in STEPS for recoverability / deep-links
   * but are not shown in the sidebar (engines & persistence untouched).
   */
  var STEPS = [
    { id: 'config', label: 'Configuración', shortLabel: 'Config', icon: 'settings', assistant: 'Define el nombre comercial, el slug y el subdominio del Showroom. El ID interno no cambia.' },
    { id: 'estructura', label: 'Estructura', shortLabel: 'Estructura', icon: 'shapes', assistant: 'Describe la estructura física del proyecto residencial: tipo de desarrollo, tipologías, plantas, ambientes y zonas.' },
    { id: 'experiencia', label: 'Experiencia', shortLabel: 'Experiencia', icon: 'layers', assistant: 'Orquesta el recorrido interactivo: nodos, conexiones y transiciones derivados de la estructura.' },
    { id: 'video-hero', label: 'Hero', shortLabel: 'Hero', icon: 'image', assistant: 'Video, imagen y logo de portada del showroom.' },
    { id: 'media', label: 'Media', shortLabel: 'Media', icon: 'images', assistant: 'Centro multimedia node-centric: Bunny CDN y Tours 360 Lapentor.' },
    { id: 'menu', label: 'Menú', shortLabel: 'Menú', icon: 'list', assistant: 'Configura el menú del showroom: nombre, descripción, botones y si abren sección o submenú.' },
    { id: 'publish', label: 'Publicado', shortLabel: 'Publicado', icon: 'rocket', assistant: 'Estado de publicación, preview y URL del showroom.' },
    { id: 'info', label: 'Información', shortLabel: 'Info', icon: 'info', assistant: 'Pega el texto comercial o sube un PDF. Extraeré toda la información del proyecto.' },

    /* Absorbed / retired from nav — keep ids for recoverability */
    { id: 'branding', label: 'Logo', shortLabel: 'Logo', icon: 'palette', assistant: 'Integrado en Hero.', hidden: true },
    { id: 'viviendas', label: 'Viviendas', shortLabel: 'Viviendas', icon: 'building', assistant: 'Inventario (recuperable).', hidden: true },
    { id: 'gallery', label: 'Galería', shortLabel: 'Galería', icon: 'images', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'panoramas', label: '360°', shortLabel: '360°', icon: 'view360', assistant: 'Absorbido por Media (Tours 360).', hidden: true },
    { id: 'plans', label: 'Planos', shortLabel: 'Planos', icon: 'blueprint', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'downloads', label: 'Descargables', shortLabel: 'Docs', icon: 'download', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'hotspots', label: 'Hotspots', shortLabel: 'Hotspots', icon: 'map-pin', assistant: 'Se administrarán desde Experiencia.', hidden: true },
    { id: 'validation', label: 'Validación', shortLabel: 'Validación', icon: 'circle-check', assistant: 'Oculto del flujo.', hidden: true },
    { id: 'interactivo', label: 'Interactivo', shortLabel: 'Interactivo', icon: 'pen-tool', assistant: 'Absorbido por Experiencia.', hidden: true },
    { id: 'ai-content', label: 'Asistente IA', shortLabel: 'IA', icon: 'sparkles', assistant: 'Recuperable.', hidden: true },
    { id: 'project-type', label: 'Tipo', shortLabel: 'Tipo', icon: 'shapes', assistant: 'Alias de Estructura.', hidden: true }
  ];

  var NAV_VERSION = 77;

  function getSteps() {
    return STEPS.slice();
  }

  function getPrimarySteps() {
    return STEPS.filter(function (s) { return !s.hidden; });
  }

  function isStepVisible(stepOrId) {
    var step = typeof stepOrId === 'string' ? getStepById(stepOrId) : stepOrId;
    return !!(step && !step.hidden);
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

  /** Map retired steps to their replacement in the slim flow. */
  function resolveVisibleStepId(stepId) {
    if (stepId === 'branding') return 'video-hero';
    if (stepId === 'project-type') return 'estructura';
    if (stepId === 'gallery' || stepId === 'panoramas' || stepId === 'plans' || stepId === 'downloads') {
      return 'media';
    }
    if (stepId === 'hotspots' || stepId === 'interactivo') return 'experiencia';
    if (stepId === 'validation') return 'publish';
    if (stepId === 'viviendas' || stepId === 'ai-content') return 'estructura';
    var step = getStepById(stepId);
    if (step && step.hidden) return 'config';
    return stepId;
  }

  function canAdvance(stepIndex, state) {
    var step = STEPS[stepIndex];
    if (!step) return false;
    switch (step.id) {
      case 'config':
        return !!(state.projectInfo && state.projectInfo.nombre && state.projectInfo.slug);
      case 'estructura':
      case 'project-type':
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
    if (!step || step.hidden) {
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
    isStepVisible: isStepVisible,
    resolveVisibleStepId: resolveVisibleStepId,
    getStep: getStep,
    getStepById: getStepById,
    getStepIndex: getStepIndex,
    canAdvance: canAdvance,
    progressPercent: progressPercent
  };
})();
