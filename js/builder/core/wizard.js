/* Builder wizard — V5.9.94 Menú = menu_config del showroom + Vista previa */
var BuilderWizard = (function () {
  /**
   * Primary nav (V5.9.94):
   *   Configuración → Info → Estructura → Hero → Menú → Media → Experiencia → Vista previa
   */
  var STEPS = [
    { id: 'config', label: 'Configuración', shortLabel: 'Config', icon: 'settings', assistant: 'Define el nombre comercial, el slug y el subdominio del Showroom. El ID interno no cambia.' },
    { id: 'info', label: 'Arquitecto IA', shortLabel: 'Info', icon: 'sparkles', assistant: 'Arquitecto IA: conversa para crear o ajustar el showroom. Alimenta la misma estructura de BOXIES.' },
    { id: 'estructura', label: 'Estructura', shortLabel: 'Estructura', icon: 'shapes', assistant: 'Define el proyecto: tipologías, plantas, ambientes y amenidades. Fuente de verdad del Builder.' },
    { id: 'video-hero', label: 'Hero', shortLabel: 'Hero', icon: 'image', assistant: 'Video, imagen y logo de portada del showroom.' },
    { id: 'menu', label: 'Menú', shortLabel: 'Menú', icon: 'list', assistant: 'Configura la navegación principal del showroom.' },
    { id: 'media', label: 'Media', shortLabel: 'Media', icon: 'images', assistant: 'Organiza assets por nodos (tipologías y amenidades). Experiencia solo referencia estos archivos.' },
    { id: 'experiencia', label: 'Experiencia', shortLabel: 'Experiencia', icon: 'layers', assistant: 'Construye el recorrido consumiendo Estructura + Media. Sin rutas ni nombres manuales.' },
    { id: 'vista-previa', label: 'Vista previa', shortLabel: 'Vista previa', icon: 'eye', assistant: 'Showroom embebido: pantalla negra + INICIAR (= Hero). Valida el flujo real del canvas.' },

    /* Hidden — keep ids for recoverability / deep-links */
    { id: 'publish', label: 'Publicado', shortLabel: 'Publicado', icon: 'rocket', assistant: 'Retirado del menú — usa Guardar / Republicar o Vista previa.', hidden: true },
    { id: 'branding', label: 'Logo', shortLabel: 'Logo', icon: 'palette', assistant: 'Integrado en Hero.', hidden: true },
    { id: 'viviendas', label: 'Viviendas', shortLabel: 'Viviendas', icon: 'building', assistant: 'Inventario (recuperable).', hidden: true },
    { id: 'gallery', label: 'Galería', shortLabel: 'Galería', icon: 'images', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'panoramas', label: '360°', shortLabel: '360°', icon: 'view360', assistant: 'Absorbido por Media (Tours 360).', hidden: true },
    { id: 'plans', label: 'Planos', shortLabel: 'Planos', icon: 'blueprint', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'downloads', label: 'Descargables', shortLabel: 'Docs', icon: 'download', assistant: 'Absorbido por Media.', hidden: true },
    { id: 'hotspots', label: 'Hotspots', shortLabel: 'Hotspots', icon: 'map-pin', assistant: 'Se administrarán desde Experiencia.', hidden: true },
    { id: 'validation', label: 'Validación', shortLabel: 'Validación', icon: 'circle-check', assistant: 'Oculto del flujo.', hidden: true },
    { id: 'interactivo', label: 'Interactivo', shortLabel: 'Interactivo', icon: 'pen-tool', assistant: 'Absorbido por Experiencia.', hidden: true },
    { id: 'ai-content', label: 'Asistente IA', shortLabel: 'IA', icon: 'sparkles', assistant: 'Absorbido por Info.', hidden: true },
    { id: 'project-type', label: 'Tipo', shortLabel: 'Tipo', icon: 'shapes', assistant: 'Alias de Estructura.', hidden: true }
  ];

  var NAV_VERSION = 103;

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

  /** Map retired / hidden steps to a visible section. */
  function resolveVisibleStepId(stepId) {
    if (stepId === 'branding') return 'video-hero';
    if (stepId === 'project-type' || stepId === 'viviendas') return 'estructura';
    if (stepId === 'gallery' || stepId === 'panoramas' || stepId === 'plans' || stepId === 'downloads') {
      return 'media';
    }
    if (stepId === 'hotspots' || stepId === 'interactivo') return 'experiencia';
    if (stepId === 'validation' || stepId === 'publish') return 'config';
    if (stepId === 'ai-content') return 'info';
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
      case 'info':
        return true;
      case 'estructura':
      case 'project-type':
        return !!(state.estructura && state.estructura.developmentType) || !!state.projectType;
      case 'video-hero':
        return true;
      case 'menu':
        return true;
      case 'media':
        return true;
      case 'experiencia':
        return true;
      case 'vista-previa':
        return true;
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
