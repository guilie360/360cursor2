/* Builder session — persists wizard state across steps */
var BuilderSession = (function () {
  var STORAGE_KEY = 'boxies_ai_builder_session';
  var fileStore = {};

  function emptyState() {
    return {
      draftProjectId: null,
      currentStep: 0,
      currentStepId: 'config',
      wizardNavVersion: 94,
      projectType: null,
      projectStructure: null,
      estructura: null,
      experiencia: null,
      architecture: null,
      estructuraApplySnapshots: [],
      branding: {
        logo: null,
        reference: null,
        brandManual: null,
        themeProposal: null,
        palette: null,
        themeProposals: [],
        selectedProposal: null,
        status: null,
        showHeroLogo: true,
        logoStyle: 'flat'
      },
      heroVideo: null,
      heroImage: null,
      heroContent: {
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        whatsappLink: '',
        whatsappMessage: '',
        shareUrl: '',
        showWhatsapp: true,
        showShare: true,
        showFullscreen: true
      },
      menuConfig: null,
      viviendas: [],
      gallery: [],
      panoramas: [],
      interactiveLab: null,
      plans: [],
      downloads: [],
      projectInfo: {},
      aiContent: {},
      hotspotSuggestions: [],
      acceptedHotspots: [],
      validation: null,
      published: false,
      publishResult: null,
      shareMeta: {
        og_image: '',
        og_title: '',
        og_description: ''
      },
      sectionChecks: {},
      messages: []
    };
  }

  function storeFile(key, file) {
    if (file) fileStore[key] = file;
  }

  function getFile(key) {
    return fileStore[key] || null;
  }

  function stripFiles(state) {
    var copy = JSON.parse(JSON.stringify(state, function (key, val) {
      if (key === 'file' || key === 'thumbnailBlob') return undefined;
      if (val && val.previewUrl && typeof val.previewUrl === 'string' && val.previewUrl.indexOf('blob:') === 0) {
        return Object.assign({}, val, { previewUrl: null, thumbnailUrl: null });
      }
      return val;
    }));
    return copy;
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var state = Object.assign(emptyState(), JSON.parse(raw));
      /* TEMP egress: purgar heroVideo remoto persistido (URLs Storage / status remote) */
      if (state.heroVideo && !state.heroVideo.file) {
        var p = state.heroVideo.previewUrl || '';
        var u = state.heroVideo.uploadedUrl || '';
        if (
          state.heroVideo.status === 'remote' ||
          /^https?:\/\//i.test(p) ||
          /^https?:\/\//i.test(u) ||
          (p && p.indexOf('blob:') !== 0 && p.indexOf('data:') !== 0)
        ) {
          state.heroVideo = null;
        }
      }
      /* Resolve step by id after nav reorder (Media added in V5.9.67/68) */
      if (state.currentStepId && typeof BuilderWizard !== 'undefined') {
        var idx = BuilderWizard.getStepIndex(state.currentStepId);
        if (idx >= 0) state.currentStep = idx;
      }
      state.wizardNavVersion =
        (typeof BuilderWizard !== 'undefined' && BuilderWizard.NAV_VERSION) || 68;
      return state;
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripFiles(state)));
    } catch (e) {}
  }

  function reset() {
    fileStore = {};
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return emptyState();
  }

  function addMessage(state, role, text) {
    state.messages = state.messages || [];
    state.messages.push({ role: role, text: text, at: Date.now() });
    if (state.messages.length > 50) state.messages = state.messages.slice(-50);
    return state;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    emptyState: emptyState,
    storeFile: storeFile,
    getFile: getFile,
    load: load,
    save: save,
    reset: reset,
    addMessage: addMessage
  };
})();
