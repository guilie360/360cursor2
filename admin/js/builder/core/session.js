/* Builder session — persists wizard state across steps */
var BuilderSession = (function () {
  var STORAGE_KEY = 'boxies_ai_builder_session';
  var fileStore = {};

  function emptyState() {
    return {
      draftProjectId: null,
      currentStep: 0,
      projectType: null,
      projectStructure: null,
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
        showShare: true
      },
      menuConfig: null,
      viviendas: [],
      gallery: [],
      panoramas: [],
      plans: [],
      downloads: [],
      projectInfo: {},
      aiContent: {},
      hotspotSuggestions: [],
      acceptedHotspots: [],
      validation: null,
      published: false,
      publishResult: null,
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
      return Object.assign(emptyState(), JSON.parse(raw));
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
