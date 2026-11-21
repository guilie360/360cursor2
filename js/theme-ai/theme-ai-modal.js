try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-ai-modal.js');}catch(_e){}
/* Modal y orquestación del flujo "Generar tema con IA" */
var ThemeAIModal = (function () {
  var STEPS = {
    upload: 'upload',
    analyzing: 'analyzing',
    generating: 'generating',
    results: 'results'
  };

  var state = {
    step: STEPS.upload,
    file: null,
    fingerprint: '',
    brandProfile: null,
    proposals: []
  };

  var ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  var ACCEPTED_EXT = ['.png', '.jpg', '.jpeg', '.svg'];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getModal() {
    return document.getElementById('themeAiModal');
  }

  function getElements() {
    return {
      modal: getModal(),
      uploadStep: document.getElementById('themeAiUploadStep'),
      statusStep: document.getElementById('themeAiStatusStep'),
      resultsStep: document.getElementById('themeAiResultsStep'),
      statusText: document.getElementById('themeAiStatusText'),
      resultsHost: document.getElementById('themeAiResultsHost'),
      fileName: document.getElementById('themeAiFileName'),
      errorText: document.getElementById('themeAiErrorText'),
      uploadBtn: document.getElementById('themeAiUploadBtn'),
      fileInput: document.getElementById('themeAiFileInput'),
      closeBtn: document.getElementById('themeAiCloseBtn'),
      changeImageBtn: document.getElementById('themeAiChangeImageBtn')
    };
  }

  function isOpen() {
    var modal = getModal();
    return !!(modal && modal.classList.contains('active'));
  }

  function setError(message, isError) {
    var els = getElements();
    if (!els.errorText) return;
    els.errorText.textContent = message || '';
    els.errorText.hidden = !message;
    els.errorText.className = 'theme-ai-error personalize-hint' +
      (message ? (isError === false ? ' is-success' : ' is-error') : '');
  }

  function setStep(step) {
    state.step = step;
    var els = getElements();
    if (els.uploadStep) els.uploadStep.hidden = step !== STEPS.upload;
    if (els.statusStep) els.statusStep.hidden = step !== STEPS.analyzing && step !== STEPS.generating;
    if (els.resultsStep) els.resultsStep.hidden = step !== STEPS.results;
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
  }

  function setStatusText(text) {
    var els = getElements();
    if (els.statusText) els.statusText.textContent = text;
  }

  function validateFile(file) {
    if (!file) return 'Selecciona una imagen para continuar.';
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    var extOk = ACCEPTED_EXT.some(function (ext) {
      return name.slice(-ext.length) === ext;
    });
    if (ACCEPTED_TYPES.indexOf(type) === -1 && !extOk) {
      return 'Formato no soportado. Usa PNG, JPG, JPEG o SVG.';
    }
    if (file.size > 12 * 1024 * 1024) {
      return 'La imagen es demasiado grande. Máximo 12 MB.';
    }
    return '';
  }

  function renderResults() {
    var els = getElements();
    if (!els.resultsHost) return;
    els.resultsHost.innerHTML = ThemeAIPreview.renderResults(state.brandProfile, state.proposals);
    if (els.fileName && state.file) {
      els.fileName.textContent = state.file.name;
    }
  }

  function restoreFromSession(fingerprint) {
    var cached = ThemeAISession.get(fingerprint);
    if (!cached || !cached.proposals || !cached.proposals.length) return false;
    if (!cached.brandProfile || !cached.brandProfile.palette) return false;
    state.fingerprint = fingerprint;
    state.brandProfile = cached.brandProfile;
    state.proposals = cached.proposals;
    renderResults();
    setStep(STEPS.results);
    return true;
  }

  function processFile(file) {
    var validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    state.file = file;
    state.fingerprint = ThemeBrandAnalyzer.buildFingerprint(file);

    if (restoreFromSession(state.fingerprint)) return;

    setStep(STEPS.analyzing);
    setStatusText('Analizando identidad visual del logo...');

    ThemeAISource.analyze(ThemeAISource.SOURCE_TYPES.image, file).then(function (profile) {
      state.brandProfile = profile;
      setStep(STEPS.generating);
      setStatusText('Construyendo sistema cromático y propuestas de diseño...');
      return ThemeAIGenerator.generate(profile);
    }).then(function (proposals) {
      state.proposals = proposals;
      ThemeAISession.save({
        fingerprint: state.fingerprint,
        fileName: file.name,
        brandProfile: state.brandProfile,
        proposals: proposals,
        createdAt: Date.now()
      });
      renderResults();
      setStep(STEPS.results);
    }).catch(function (err) {
      setStep(STEPS.upload);
      setError((err && err.message) ? err.message : 'No se pudo analizar la imagen.');
    });
  }

  function findProposal(id) {
    return state.proposals.find(function (p) { return p.id === id; }) || null;
  }

  function applyProposal(id) {
    var proposal = findProposal(id);
    if (!proposal) return;
    var result = VisitorPersonalization.saveCustomTheme(proposal.config);
    if (!result.ok) {
      setError(result.message || 'No se pudo aplicar el tema.');
      return;
    }
    setError('Tema aplicado.', false);
    if (typeof ThemeSystem.markUserChosen === 'function') {
      ThemeSystem.markUserChosen();
    }
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.refreshThemePicker === 'function') {
      VisitorPersonalizePanel.refreshThemePicker();
    }
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.updatePreview === 'function') {
      VisitorPersonalizePanel.updatePreview();
    }
    if (typeof playSound === 'function') playSound('buttonTap');
    if (typeof vibrate === 'function') vibrate(6);
  }

  async function saveProposal(id) {
    var proposal = findProposal(id);
    if (!proposal) return;
    if (typeof VisitorEmailVerification !== 'undefined' && VisitorEmailVerification.isPending()) {
      setError('Verifica tu correo para guardar temas en la nube.');
      return;
    }
    try {
      var result = await VisitorPersonalization.saveCustomThemeRemote(proposal.config, {
        nombre: proposal.name,
        apply: false
      });
      if (!result.ok) {
        setError(result.message || 'No se pudo guardar el tema.');
        return;
      }
      setError('');
      if (result.theme &&
          typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.upsertSavedThemeInCache === 'function') {
        VisitorPersonalizePanel.upsertSavedThemeInCache(result.theme);
      } else if (typeof VisitorPersonalizePanel !== 'undefined' &&
          typeof VisitorPersonalizePanel.refreshMisTemasList === 'function') {
        await VisitorPersonalizePanel.refreshMisTemasList();
      }
      setError('Tema guardado en Mis temas. Puedes aplicarlo desde la lista.', false);
      if (typeof playSound === 'function') playSound('buttonTap');
    } catch (err) {
      setError(err.message || 'No se pudo guardar el tema.');
    }
  }

  function resetUploadView() {
    state.step = STEPS.upload;
    state.file = null;
    state.fingerprint = '';
    state.brandProfile = null;
    state.proposals = [];
    var els = getElements();
    if (els.fileInput) els.fileInput.value = '';
    if (els.resultsHost) els.resultsHost.innerHTML = '';
    if (els.fileName) els.fileName.textContent = '';
    setError('');
    setStep(STEPS.upload);
  }

  function open() {
    var els = getElements();
    if (!els.modal) return;
    if (!state.file) resetUploadView();
    els.modal.classList.add('active');
    els.modal.setAttribute('aria-hidden', 'false');
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
  }

  function close() {
    var modal = getModal();
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
  }

  function bind() {
    var els = getElements();
    if (!els.modal || els.modal.dataset.bound === '1') return;
    els.modal.dataset.bound = '1';

    if (els.uploadBtn && els.fileInput) {
      els.uploadBtn.addEventListener('click', function () {
        els.fileInput.click();
      });
      els.fileInput.addEventListener('change', function () {
        var file = els.fileInput.files && els.fileInput.files[0];
        if (file) processFile(file);
      });
    }

    if (els.changeImageBtn && els.fileInput) {
      els.changeImageBtn.addEventListener('click', function () {
        ThemeAISession.clear();
        resetUploadView();
        els.fileInput.click();
      });
    }

    if (els.closeBtn) {
      els.closeBtn.addEventListener('click', function () {
        close();
      });
    }

    els.modal.addEventListener('click', function (e) {
      if (e.target === els.modal) close();
    });

    if (els.resultsHost) {
      els.resultsHost.addEventListener('click', function (e) {
        var actionEl = e.target.closest('[data-theme-ai-action]');
        if (!actionEl) return;
        var action = actionEl.getAttribute('data-theme-ai-action');
        var proposalId = actionEl.getAttribute('data-theme-ai-proposal');
        if (action === 'apply') {
          e.preventDefault();
          applyProposal(proposalId);
        }
        if (action === 'save') {
          e.preventDefault();
          saveProposal(proposalId);
        }
      });
    }
  }

  function init() {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER js/theme-ai/theme-ai-modal.js :: init');}catch(_bd){}
  try {

    bind();
  
  } finally {
  try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT js/theme-ai/theme-ai-modal.js :: init');}catch(_bd){}
  }
}

  return {
    init: init,
    open: open,
    close: close,
    isOpen: isOpen
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-ai-modal.js');}catch(_e){}
