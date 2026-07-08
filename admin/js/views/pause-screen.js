/* Admin — Pantalla de pausa */
var PauseScreenView = (function () {
  var rootEl = null;
  var projectChangeHandler = null;
  var state = {
    project: null,
    config: null,
    pauseConfig: null
  };

  function getActiveProjectId() {
    return AdminState.getActiveProjectId();
  }

  function checkbox(name, checked, label) {
    return (
      '<label class="admin-check-row">' +
        '<input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '>' +
        '<span>' + AdminUI.escapeHtml(label) + '</span>' +
      '</label>'
    );
  }

  function rangeField(name, label, value, min, max, step, suffix) {
    return (
      '<div class="admin-field">' +
        '<label for="' + name + '">' + AdminUI.escapeHtml(label) + ' <span class="admin-range-value" data-range-for="' + name + '">' + value + (suffix || '') + '</span></label>' +
        '<input class="admin-range" type="range" id="' + name + '" name="' + name + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
      '</div>'
    );
  }

  function setFormMessage(message, type) {
    var el = rootEl && rootEl.querySelector('#pauseFormMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'admin-form-message' + (type ? ' ' + type : '');
  }

  function getFormValues() {
    var form = rootEl.querySelector('#pauseForm');
    if (!form) return null;
    var cfg = state.pauseConfig;
    return {
      enabled: form.enabled.checked,
      show_logo: form.show_logo.checked,
      show_avatar: form.show_avatar.checked,
      show_project_name: form.show_project_name.checked,
      show_user_name: form.show_user_name.checked,
      name_mode: form.name_mode.value,
      glow_enabled: form.glow_enabled.checked,
      glow_intensity: Number(form.glow_intensity.value),
      breathing_enabled: form.breathing_enabled.checked,
      breathing_duration_ms: Number(form.breathing_duration_ms.value),
      blur_px: Number(form.blur_px.value),
      overlay_opacity: Number(form.overlay_opacity.value),
      button_text: form.button_text.value,
      dynamic_messages_enabled: form.dynamic_messages_enabled.checked,
      message_interval_min_ms: Number(form.message_interval_min_ms.value),
      message_interval_max_ms: Number(form.message_interval_max_ms.value),
      random_order: form.random_order.checked,
      avoid_consecutive_repeat: form.avoid_consecutive_repeat.checked,
      custom_messages: form.custom_messages.value
    };
  }

  function updatePreview() {
    var preview = rootEl.querySelector('#pausePreview');
    if (!preview) return;
    var values = PauseScreenConfig.toPayload(getFormValues());
    preview.style.setProperty('--pause-blur', values.blur_px + 'px');
    preview.style.setProperty('--pause-overlay', String(values.overlay_opacity));
    preview.style.setProperty('--pause-glow', String(values.glow_intensity));
    preview.style.setProperty('--pause-breath-duration', (values.breathing_duration_ms / 1000) + 's');
    preview.classList.toggle('is-glow-off', !values.glow_enabled);
    preview.classList.toggle('is-breathing-off', !values.breathing_enabled);

    var msg = preview.querySelector('.pause-preview-message');
    if (msg) {
      var sample = PauseScreenMessages.flattenDefaults()[0];
      msg.textContent = '\u201c' + sample + '\u201d';
    }

    var btn = preview.querySelector('.pause-preview-btn');
    if (btn) btn.textContent = values.button_text;

    var name = preview.querySelector('.pause-preview-name');
    if (name) {
      var nameText = values.name_mode === 'user' ? 'María García' : (state.project.nombre || 'Proyecto');
      name.textContent = (values.show_project_name || values.show_user_name) ? nameText : '';
      name.hidden = !(values.show_project_name || values.show_user_name);
    }
  }

  function renderEditor() {
    var cfg = state.pauseConfig;
    var customText = (cfg.custom_messages || []).join('\n');

    return (
      '<div class="section-header">' +
        '<h1>Pantalla de pausa</h1>' +
        '<p>Personaliza la experiencia que aparece cuando el visitante regresa al proyecto tras abandonarlo temporalmente.</p>' +
      '</div>' +
      '<div class="hero-editor-layout">' +
        '<form id="pauseForm" class="panel-card pause-form" novalidate>' +
          '<div class="panel-card-title">General</div>' +
          checkbox('enabled', cfg.enabled, 'Activar pantalla') +
          '<div class="admin-form-grid">' +
            checkbox('show_logo', cfg.show_logo, 'Mostrar logo') +
            checkbox('show_avatar', cfg.show_avatar, 'Mostrar avatar') +
            checkbox('show_project_name', cfg.show_project_name, 'Mostrar nombre del proyecto') +
            checkbox('show_user_name', cfg.show_user_name, 'Mostrar nombre del usuario') +
          '</div>' +
          '<div class="admin-field">' +
            '<label for="name_mode">Nombre principal</label>' +
            '<select class="admin-input" id="name_mode" name="name_mode">' +
              '<option value="project"' + (cfg.name_mode === 'project' ? ' selected' : '') + '>Nombre del proyecto</option>' +
              '<option value="user"' + (cfg.name_mode === 'user' ? ' selected' : '') + '>Nombre del usuario</option>' +
            '</select>' +
          '</div>' +
          '<div class="panel-card-title">Visual</div>' +
          checkbox('glow_enabled', cfg.glow_enabled, 'Activar glow') +
          rangeField('glow_intensity', 'Intensidad del glow', cfg.glow_intensity, 0.05, 1, 0.01, '') +
          checkbox('breathing_enabled', cfg.breathing_enabled, 'Activar breathing') +
          rangeField('breathing_duration_ms', 'Duración breathing (ms)', cfg.breathing_duration_ms, 2800, 3500, 100, 'ms') +
          rangeField('blur_px', 'Intensidad del blur', cfg.blur_px, 14, 20, 1, 'px') +
          rangeField('overlay_opacity', 'Opacidad del overlay', cfg.overlay_opacity, 0.65, 0.75, 0.01, '') +
          '<div class="panel-card-title">Botón</div>' +
          '<div class="admin-field">' +
            '<label for="button_text">Texto del botón</label>' +
            '<input class="admin-input" id="button_text" name="button_text" maxlength="40" value="' + AdminUI.escapeHtml(cfg.button_text) + '">' +
          '</div>' +
          '<div class="panel-card-title">Mensajes dinámicos</div>' +
          checkbox('dynamic_messages_enabled', cfg.dynamic_messages_enabled, 'Activar mensajes dinámicos') +
          '<div class="admin-form-grid">' +
            rangeField('message_interval_min_ms', 'Tiempo mínimo (ms)', cfg.message_interval_min_ms, 3000, 15000, 500, 'ms') +
            rangeField('message_interval_max_ms', 'Tiempo máximo (ms)', cfg.message_interval_max_ms, 4000, 20000, 500, 'ms') +
          '</div>' +
          checkbox('random_order', cfg.random_order, 'Orden aleatorio') +
          checkbox('avoid_consecutive_repeat', cfg.avoid_consecutive_repeat, 'Evitar repetir mensajes consecutivos') +
          '<div class="admin-field admin-field-full">' +
            '<label for="custom_messages">Mensajes personalizados (uno por línea)</label>' +
            '<textarea class="admin-input admin-textarea" id="custom_messages" name="custom_messages" rows="6" placeholder="Entrega estimada: Agosto 2028&#10;Agenda una visita.">' + AdminUI.escapeHtml(customText) + '</textarea>' +
            '<div class="admin-help">Se mezclan automáticamente con los mensajes predeterminados.</div>' +
          '</div>' +
          '<div class="hero-form-actions">' +
            '<button type="submit" class="btn-primary btn-compact" id="pauseSaveBtn">Guardar cambios</button>' +
          '</div>' +
          '<div class="admin-form-message" id="pauseFormMessage" role="alert"></div>' +
        '</form>' +
        '<div class="panel-card pause-preview-card">' +
          '<div class="panel-card-title">Vista previa</div>' +
          '<div class="pause-preview pause-screen is-preview" id="pausePreview">' +
            '<div class="pause-screen__veil"></div>' +
            '<div class="pause-screen__panel">' +
              '<div class="pause-screen__emblem">' +
                '<div class="pause-screen__glow"></div>' +
                '<div class="pause-screen__building">' +
                  '<svg class="pause-screen__building-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4 21V9l8-4 8 4v12h-3v-7H7v7H4z"/></svg>' +
                '</div>' +
              '</div>' +
              '<div class="pause-screen__copy">' +
                '<p class="pause-screen__title">SESIÓN EN PAUSA</p>' +
                '<h2 class="pause-screen__name pause-preview-name"></h2>' +
                '<p class="pause-screen__message pause-preview-message"></p>' +
              '</div>' +
              '<div class="pause-screen__actions project-cover-buttons">' +
                '<button type="button" class="project-cover-btn pause-screen__btn pause-preview-btn is-visible">Continuar</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bindForm() {
    var form = rootEl.querySelector('#pauseForm');
    if (!form) return;

    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);

    form.querySelectorAll('.admin-range').forEach(function (input) {
      input.addEventListener('input', function () {
        var label = rootEl.querySelector('[data-range-for="' + input.name + '"]');
        if (!label) return;
        var suffix = input.name.indexOf('_ms') !== -1 ? 'ms' : (input.name === 'blur_px' ? 'px' : '');
        label.textContent = input.value + suffix;
      });
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var btn = rootEl.querySelector('#pauseSaveBtn');
      var values = getFormValues();
      btn.disabled = true;
      setFormMessage('Guardando...', 'loading');
      try {
        await PauseScreenApi.upsert(state.project.id, values);
        state.pauseConfig = PauseScreenConfig.toPayload(values);
        setFormMessage('Cambios guardados.', 'success');
        AdminNotify.success('Pantalla de pausa actualizada.');
      } catch (err) {
        setFormMessage(err.message || 'No se pudo guardar.', 'error');
        AdminNotify.error(err.message || 'No se pudo guardar.');
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function loadProject(projectId) {
    var data = await PauseScreenApi.getForProject(projectId);
    state.project = data.project;
    state.config = data.config;
    state.pauseConfig = data.pauseConfig;
    rootEl.innerHTML = renderEditor();
    bindForm();
    updatePreview();
  }

  async function render(container) {
    rootEl = container;
    var projectId = getActiveProjectId();
    if (!projectId) {
      container.innerHTML =
        '<div class="section-header"><h1>Pantalla de pausa</h1></div>' +
        '<div class="panel-card placeholder-card"><div class="placeholder-copy">Selecciona un proyecto en el header.</div></div>';
      return;
    }

    container.innerHTML = '<div class="admin-loading">Cargando...</div>';
    try {
      await loadProject(projectId);
    } catch (err) {
      container.innerHTML =
        '<div class="section-header"><h1>Pantalla de pausa</h1></div>' +
        '<div class="panel-card placeholder-card"><div class="placeholder-copy">' + AdminUI.escapeHtml(err.message) + '</div></div>';
    }

    if (!projectChangeHandler) {
      projectChangeHandler = function () {
        var id = getActiveProjectId();
        if (!id || !rootEl) return;
        loadProject(id).catch(function (err) {
          AdminNotify.error(err.message || 'Error cargando proyecto.');
        });
      };
      document.addEventListener('admin:project-changed', projectChangeHandler);
    }
  }

  function onLeave() {
    if (projectChangeHandler) {
      document.removeEventListener('admin:project-changed', projectChangeHandler);
      projectChangeHandler = null;
    }
  }

  return {
    render: render,
    onLeave: onLeave
  };
})();
