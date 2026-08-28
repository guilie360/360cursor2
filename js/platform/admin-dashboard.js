/* In-showroom admin dashboard — platform profiles.admin only */
var AdminDashboard = (function () {
  var modalEl = null;
  var closeBtn = null;
  var messageEl = null;
  var state = {
    project: null,
    config: null,
    pendingImageUrl: null,
    pendingImageFile: null
  };

  var DEFAULT_BTN_1 = 'Iniciar';
  var DEFAULT_BTN_2 = 'Explorar';

  function canAccess(profile) {
    profile = profile || (typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null);
    return typeof PlatformRoles !== 'undefined' && PlatformRoles.isAdmin(profile);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.classList.toggle('error', !!isError);
    messageEl.classList.toggle('success', !!text && !isError);
  }

  function getSelectedHeroTextColor() {
    var selected = 'light';
    document.querySelectorAll('[data-hero-text-color]').forEach(function (btn) {
      if (btn.classList.contains('selected')) {
        selected = btn.getAttribute('data-hero-text-color') || 'light';
      }
    });
    return AdminHeroApi.normalizeHeroTextColor(selected);
  }

  function getSelectedHeroButtonTextColor() {
    var selected = 'light';
    document.querySelectorAll('[data-hero-button-text-color]').forEach(function (btn) {
      if (btn.classList.contains('selected')) {
        selected = btn.getAttribute('data-hero-button-text-color') || 'light';
      }
    });
    return AdminHeroApi.normalizeHeroTextColor(selected);
  }

  function syncHeroColorPreview() {
    if (typeof applyHeroTextColors === 'function') {
      applyHeroTextColors({
        hero_text_color: getSelectedHeroTextColor(),
        hero_button_text_color: getSelectedHeroButtonTextColor()
      });
    }
  }

  function syncHeroColorButtons() {
    var config = state.config || {};
    var textColor = AdminHeroApi.normalizeHeroTextColor(config.hero_text_color);
    var buttonColor = AdminHeroApi.normalizeHeroTextColor(config.hero_button_text_color);
    document.querySelectorAll('[data-hero-text-color]').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-hero-text-color') === textColor);
    });
    document.querySelectorAll('[data-hero-button-text-color]').forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-hero-button-text-color') === buttonColor);
    });
    syncHeroColorPreview();
  }

  function getFormValues() {
    var title = document.getElementById('adminHeroTitle');
    var description = document.getElementById('adminHeroDescription');
    var btn1 = document.getElementById('adminHeroBtn1');
    var btn2 = document.getElementById('adminHeroBtn2');
    return {
      titulo_hero: title ? title.value : '',
      texto_hero: description ? description.value : '',
      boton_hero_1: btn1 ? btn1.value : '',
      boton_hero_2: btn2 ? btn2.value : '',
      hero_text_color: getSelectedHeroTextColor(),
      hero_button_text_color: getSelectedHeroButtonTextColor(),
      imagen_hero_url: state.pendingImageUrl || (state.config && state.config.imagen_hero_url) || null,
      video_hero_url: null,
      logo_url: state.config ? state.config.logo_url : null
    };
  }

  function syncPreviewImage() {
    var preview = document.getElementById('adminHeroImagePreview');
    if (!preview) return;
    var url = state.pendingImageUrl || (state.config && state.config.imagen_hero_url) || '';
    if (url) {
      preview.src = url;
      preview.style.display = 'block';
    } else {
      preview.removeAttribute('src');
      preview.style.display = 'none';
    }
  }

  function fillForm() {
    var project = state.project || {};
    var config = state.config || {};

    var title = document.getElementById('adminHeroTitle');
    var description = document.getElementById('adminHeroDescription');
    var btn1 = document.getElementById('adminHeroBtn1');
    var btn2 = document.getElementById('adminHeroBtn2');
    var subtitle = document.getElementById('adminDashboardSubtitle');

    if (subtitle) {
      subtitle.textContent = project.nombre ? 'Proyecto: ' + project.nombre : '';
    }
    if (title) title.value = config.titulo_hero || project.nombre || '';
    if (description) {
      description.value = config.texto_hero || formatHeroSubtitle(project.ciudad, project.estado, null) || '';
    }
    if (btn1) btn1.value = config.boton_hero_1 || DEFAULT_BTN_1;
    if (btn2) btn2.value = config.boton_hero_2 || DEFAULT_BTN_2;

    state.pendingImageUrl = null;
    state.pendingImageFile = null;
    syncPreviewImage();
    syncHeroColorButtons();
  }

  async function loadData() {
    var data = await AdminHeroApi.getForCurrentProject();
    state.project = data.project;
    state.config = data.config;
    fillForm();
  }

  function isOpen() {
    return !!(modalEl && modalEl.classList.contains('active'));
  }

  function close() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-dashboard-open');
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
    setMessage('');
    if (window.PROJECT_DATA && typeof applyHeroModule === 'function') {
      applyHeroModule(window.PROJECT_DATA);
    }
    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }
  }

  async function open() {
    if (!canAccess()) {
      setMessage('Solo los administradores pueden acceder al panel.', true);
      return;
    }
    if (!modalEl) return;

    setMessage('Cargando...', false);
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-dashboard-open');
    if (typeof lockBodyScroll === 'function') lockBodyScroll();

    if (typeof GlobalClose !== 'undefined' && typeof GlobalClose.update === 'function') {
      GlobalClose.update();
    }

    try {
      await loadData();
      setMessage('');
    } catch (err) {
      setMessage(err.message || 'No se pudo cargar el panel.', true);
    }
  }

  async function handleImagePick(file) {
    if (!file) return;
    setMessage('');
    try {
      var upload = await AdminHeroApi.uploadHeroImage(
        state.project.constructora_id,
        state.project.id,
        file
      );
      state.pendingImageUrl = upload.publicUrl;
      state.pendingImageFile = file;
      syncPreviewImage();
      setMessage('Imagen lista. Pulsa Guardar para aplicarla al hero.', false);
    } catch (err) {
      setMessage(err.message || 'No se pudo subir la imagen.', true);
    }
  }

  async function save() {
    if (!canAccess()) {
      setMessage('No tienes permisos de administrador.', true);
      return;
    }
    if (!state.project || !state.project.id) {
      setMessage('Proyecto no disponible.', true);
      return;
    }

    var saveBtn = document.getElementById('adminDashboardSaveBtn');
    if (saveBtn) saveBtn.disabled = true;
    setMessage('Guardando...', false);

    try {
      var values = getFormValues();
      if (values.texto_hero && values.texto_hero.length > 280) {
        throw new Error('La descripción no puede superar 280 caracteres.');
      }
      if (values.titulo_hero && values.titulo_hero.length > 120) {
        throw new Error('El título no puede superar 120 caracteres.');
      }

      var saved = await AdminHeroApi.saveHeroConfig(state.project.id, values);
      state.config = saved;
      state.pendingImageUrl = null;
      state.pendingImageFile = null;
      fillForm();
      setMessage('Cambios guardados. El hero se actualizó.', false);
      if (typeof playSound === 'function') playSound('buttonTap');
    } catch (err) {
      setMessage(err.message || 'No se pudo guardar.', true);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function bindEvents() {
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        close();
        if (typeof playSound === 'function') playSound('buttonTap');
      });
    }

    var saveBtn = document.getElementById('adminDashboardSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        save();
      });
    }

    var fileInput = document.getElementById('adminHeroImageInput');
    var pickBtn = document.getElementById('adminHeroImagePickBtn');
    if (pickBtn && fileInput) {
      pickBtn.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (file) handleImagePick(file);
      });
    }

    if (modalEl) {
      modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) close();
      });
    }

    document.querySelectorAll('[data-hero-text-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-hero-text-color]').forEach(function (item) {
          item.classList.toggle('selected', item === btn);
        });
        syncHeroColorPreview();
      });
    });

    document.querySelectorAll('[data-hero-button-text-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-hero-button-text-color]').forEach(function (item) {
          item.classList.toggle('selected', item === btn);
        });
        syncHeroColorPreview();
      });
    });
  }

  function init() {
    modalEl = document.getElementById('adminDashboardModal');
    closeBtn = document.getElementById('adminDashboardCloseBtn');
    messageEl = document.getElementById('adminDashboardMessage');
    bindEvents();
    window.AdminDashboard = AdminDashboard;
  }

  return {
    canAccess: canAccess,
    isOpen: isOpen,
    open: open,
    close: close,
    init: init
  };
})();
