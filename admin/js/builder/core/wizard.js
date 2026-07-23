/* Builder wizard — 12-step orchestration */
var BuilderWizard = (function () {
  var STEPS = [
    { id: 'project-type', label: 'Tipo de proyecto', shortLabel: 'Tipo', icon: 'layout-grid', assistant: '¿Qué tipo de proyecto deseas crear? Selecciona una opción y prepararé la estructura base automáticamente.' },
    { id: 'branding', label: 'Logo', shortLabel: 'Logo', icon: 'palette', assistant: 'Sube el logo del proyecto. Aparecerá en el hero arriba del título.' },
    { id: 'video-hero', label: 'Hero', shortLabel: 'Hero', icon: 'video', assistant: 'Sube un video o imagen de fondo para la portada del showroom.' },
    { id: 'menu', label: 'Menú', shortLabel: 'Menú', icon: 'layout-grid', assistant: 'Configura el menú del showroom: nombre, descripción, botones y si abren sección o submenú.' },
    { id: 'viviendas', label: 'Viviendas', shortLabel: 'Viviendas', icon: 'home', assistant: 'Crea y edita las tarjetas de viviendas del showroom: código, precio, áreas y disponibilidad.' },
    { id: 'gallery', label: 'Galería', shortLabel: 'Galería', icon: 'images', assistant: 'Arrastra tus renders e imágenes. Las clasificaré, ordenaré y agruparé por categoría.' },
    { id: 'panoramas', label: '360°', shortLabel: '360°', icon: 'view360', assistant: 'Sube los panoramas 360°. Identificaré cada espacio y crearé la estructura del recorrido.' },
    { id: 'interactivo', label: 'Interactivo', shortLabel: 'Interactivo', icon: 'layers', assistant: 'Laboratorio experimental: dibuja zonas poligonales sobre plantas navegables. Aún no se publica a Supabase.' },
    { id: 'plans', label: 'Planos', shortLabel: 'Planos', icon: 'layers', assistant: 'Sube planos en PDF, JPG, PNG o DWG. Detectaré tipologías, áreas y niveles.' },
    { id: 'downloads', label: 'Descargables', shortLabel: 'Docs', icon: 'download', assistant: 'Sube brochures, fichas técnicas y documentos. Los reconoceré y organizaré automáticamente.' },
    { id: 'info', label: 'Información', shortLabel: 'Info', icon: 'file-text', assistant: 'Pega el texto comercial o sube un PDF. Extraeré toda la información del proyecto.' },
    { id: 'ai-content', label: 'Asistente IA', shortLabel: 'IA', icon: 'sparkles', assistant: 'Con toda la información recopilada, generaré textos comerciales, FAQs y contenido para el chatbot.' },
    { id: 'hotspots', label: 'Hotspots', shortLabel: 'Hotspots', icon: 'map-pin', assistant: 'Analizaré renders maestros y propondré hotspots. Tú decides cuáles aceptar.' },
    { id: 'validation', label: 'Validación', shortLabel: 'Check', icon: 'circle-check', assistant: 'Revisemos juntos que todo esté listo antes de publicar.' },
    { id: 'publish', label: 'Publicar', shortLabel: 'Publicar', icon: 'rocket', assistant: 'Todo listo. Al publicar, crearé automáticamente la estructura BOXIES completa.' }
  ];

  function getSteps() {
    return STEPS.slice();
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
      case 'project-type':
        return !!state.projectType;
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
    return Math.round(((stepIndex + 1) / STEPS.length) * 100);
  }

  return {
    STEPS: STEPS,
    getSteps: getSteps,
    getStep: getStep,
    getStepById: getStepById,
    getStepIndex: getStepIndex,
    canAdvance: canAdvance,
    progressPercent: progressPercent
  };
})();
