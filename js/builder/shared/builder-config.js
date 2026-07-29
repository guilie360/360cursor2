/**
 * BuilderConfig — V7.1.06 shared Configuration page for all BOXIES Builders.
 * Showroom and Quotation (and future builders) render the same component.
 */
var BuilderConfig = (function () {
  function escapeHtml(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normalizeSlug(raw, options) {
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.normalizeSlug) {
      return ShowroomPublicUrl.normalizeSlug(raw, options);
    }
    var s = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/g, '');
    if (!(options && options.allowTrailingHyphen)) s = s.replace(/-+$/g, '');
    return s.slice(0, 60);
  }

  function publicUrlDisplay(slug) {
    if (typeof ShowroomPublicUrl !== 'undefined' && ShowroomPublicUrl.displayUrl) {
      return ShowroomPublicUrl.displayUrl(slug);
    }
    var s = normalizeSlug(slug);
    return s ? 'https://360preventa.com/' + s : 'https://360preventa.com/';
  }

  /**
   * @param {object} identity — { nombre, slug }
   * @returns {string} HTML (builder-step-content wrapper included)
   */
  function render(identity) {
    identity = identity || {};
    var nombre = identity.nombre || '';
    var slug = identity.slug || '';
    var urlPreview = publicUrlDisplay(slug);
    return '<div class="builder-step-content">' +
      '<div class="builder-config-identity">' +
        '<h3 class="builder-config-identity__title">Identidad del Showroom</h3>' +
        '<div class="builder-field">' +
          '<label for="showroomNameInput">Nombre del Showroom</label>' +
          '<input type="text" id="showroomNameInput" maxlength="120" value="' +
            escapeHtml(nombre) + '" placeholder="Nombre del showroom" autocomplete="off">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="showroomSlugInput">Slug</label>' +
          '<input type="text" id="showroomSlugInput" maxlength="60" value="' +
            escapeHtml(slug) + '" placeholder="mi-showroom" autocomplete="off" spellcheck="false" inputmode="latin">' +
          '<p class="builder-config-identity__slug-hint">Minúsculas, números y guiones. Máx. 60 caracteres.</p>' +
          '<p class="builder-config-identity__slug-check" id="showroomSlugCheck" aria-live="polite"></p>' +
        '</div>' +
        '<div class="builder-field">' +
          '<label>URL pública</label>' +
          '<div class="builder-config-identity__url" id="showroomPublicUrlPreview">' +
            escapeHtml(urlPreview) +
          '</div>' +
        '</div>' +
        '<p class="builder-config-identity__hint">Si cambias el slug, la URL anterior dejará de funcionar.</p>' +
        '<div class="builder-config-identity__actions">' +
          '<button type="button" class="builder-header-action-btn" id="showroomIdentitySaveBtn">Guardar cambios</button>' +
          '<span class="builder-config-identity__status" id="showroomIdentityStatus" aria-live="polite"></span>' +
        '</div>' +
      '</div></div>';
  }

  /**
   * Adapter contract:
   *   getProjectId() -> string|null
   *   getIdentity() -> { nombre, slug, constructora_id? }
   *   resolveConstructoraId() -> string|null  (optional)
   *   onSaved(payload) -> void|Promise  (optional; payload has id, nombre, slug, project, verify)
   *   afterSave() -> void  (optional; re-render hooks)
   *   missingProjectMessage() -> string (optional)
   */
  function bind(rootEl, adapter) {
    if (!rootEl || !adapter) return;
    var nameInput = rootEl.querySelector('#showroomNameInput');
    var slugInput = rootEl.querySelector('#showroomSlugInput');
    var urlPreviewEl = rootEl.querySelector('#showroomPublicUrlPreview');
    var slugCheckEl = rootEl.querySelector('#showroomSlugCheck');
    var saveBtn = rootEl.querySelector('#showroomIdentitySaveBtn');
    var statusEl = rootEl.querySelector('#showroomIdentityStatus');
    var slugCheckTimer = null;
    var slugCheckSeq = 0;

    function setSlugCheck(message, tone) {
      if (!slugCheckEl) return;
      slugCheckEl.textContent = message || '';
      slugCheckEl.className = 'builder-config-identity__slug-check' +
        (tone ? ' is-' + tone : '');
    }

    function syncPublicUrlPreview() {
      var nextSlug = normalizeSlug(slugInput ? slugInput.value : '');
      if (urlPreviewEl) {
        urlPreviewEl.textContent = publicUrlDisplay(nextSlug);
      }
    }

    function currentProjectId() {
      return typeof adapter.getProjectId === 'function' ? adapter.getProjectId() : null;
    }

    function resolveConstructoraIdForCheck() {
      if (typeof adapter.resolveConstructoraId === 'function') {
        var viaAdapter = adapter.resolveConstructoraId();
        if (viaAdapter) return viaAdapter;
      }
      var identity = adapter.getIdentity ? adapter.getIdentity() : null;
      if (identity && identity.constructora_id) return identity.constructora_id;
      if (typeof AdminState !== 'undefined' && AdminState.getConstructoraId) {
        return AdminState.getConstructoraId();
      }
      if (typeof VisitorSession !== 'undefined' && VisitorSession.getProfile) {
        var profile = VisitorSession.getProfile();
        if (profile && profile.constructora_id) return profile.constructora_id;
      }
      return null;
    }

    async function validateSlugLive() {
      var seq = ++slugCheckSeq;
      var raw = slugInput ? slugInput.value : '';
      var nextSlug = normalizeSlug(raw);

      if (!String(raw || '').trim()) {
        setSlugCheck('El slug es obligatorio.', 'error');
        if (saveBtn) saveBtn.disabled = true;
        return;
      }

      if (typeof ShowroomPublicUrl !== 'undefined') {
        if (ShowroomPublicUrl.isReservedSlug(nextSlug)) {
          setSlugCheck('✕ Ese slug está reservado.', 'error');
          if (saveBtn) saveBtn.disabled = true;
          return;
        }
        if (!ShowroomPublicUrl.isValidSlugFormat(nextSlug)) {
          setSlugCheck('✕ Usa solo letras minúsculas, números y guiones.', 'error');
          if (saveBtn) saveBtn.disabled = true;
          return;
        }
      }

      var identity = adapter.getIdentity ? adapter.getIdentity() : {};
      var originalSlug = normalizeSlug((identity && identity.slug) || '');
      if (nextSlug === originalSlug && nextSlug) {
        setSlugCheck('✓ URL disponible', 'ok');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      if (typeof ProyectosApi === 'undefined' ||
          typeof ProyectosApi.checkSlugAvailability !== 'function') {
        setSlugCheck('');
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      setSlugCheck('Comprobando…', 'pending');
      if (saveBtn) saveBtn.disabled = true;

      try {
        var result = await ProyectosApi.checkSlugAvailability(nextSlug, {
          excludeId: currentProjectId(),
          constructoraId: resolveConstructoraIdForCheck()
        });
        if (seq !== slugCheckSeq) return;
        try {
          console.log('[IDENTITY]', 'slug_live_check', {
            nextSlug: nextSlug,
            excludeId: currentProjectId(),
            result: result,
            saveDisabledBefore: !!(saveBtn && saveBtn.disabled)
          });
        } catch (eLog) {}
        if (result.available) {
          setSlugCheck('✓ URL disponible', 'ok');
          if (saveBtn) saveBtn.disabled = false;
        } else if (result.reason === 'reserved') {
          setSlugCheck('✕ Ese slug está reservado.', 'error');
        } else if (result.reason === 'format') {
          setSlugCheck('✕ Usa solo letras minúsculas, números y guiones.', 'error');
        } else {
          setSlugCheck('✕ Ese slug ya pertenece a otro Showroom.', 'error');
        }
      } catch (err) {
        if (seq !== slugCheckSeq) return;
        setSlugCheck(err.message || 'No se pudo validar el slug.', 'error');
        try {
          console.warn('[IDENTITY]', 'slug_live_check_error', {
            message: err && err.message,
            saveDisabled: !!(saveBtn && saveBtn.disabled)
          });
        } catch (e2) {}
      }
    }

    function scheduleSlugValidation() {
      syncPublicUrlPreview();
      if (slugCheckTimer) clearTimeout(slugCheckTimer);
      slugCheckTimer = setTimeout(validateSlugLive, 280);
    }

    if (slugInput) {
      slugInput.addEventListener('input', function () {
        var live = normalizeSlug(slugInput.value, { allowTrailingHyphen: true });
        if (slugInput.value !== live) {
          var end = slugInput.selectionStart;
          slugInput.value = live;
          try {
            var pos = Math.min(live.length, end || live.length);
            slugInput.setSelectionRange(pos, pos);
          } catch (e) {}
        }
        scheduleSlugValidation();
      });
      slugInput.addEventListener('blur', function () {
        slugInput.value = normalizeSlug(slugInput.value);
        syncPublicUrlPreview();
        validateSlugLive();
      });
      scheduleSlugValidation();
    }

    if (saveBtn) {
      var actionsRow = saveBtn.parentNode;
      if (actionsRow) {
        actionsRow.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || t.id !== 'showroomIdentitySaveBtn') return;
          if (!t.disabled) return;
          try {
            if (!window.__BOXIES_IDENTITY_TRACE__) window.__BOXIES_IDENTITY_TRACE__ = [];
            window.__BOXIES_IDENTITY_TRACE__.push({
              t: Date.now(),
              step: '0_click_bloqueado_disabled',
              nombre: nameInput ? nameInput.value : null,
              slug: slugInput ? slugInput.value : null,
              slugCheck: slugCheckEl ? slugCheckEl.textContent : null
            });
            console.warn('[IDENTITY]', '0_click_bloqueado_disabled', {
              slugCheck: slugCheckEl ? slugCheckEl.textContent : null
            });
          } catch (eBlock) {}
        }, true);
      }
      saveBtn.addEventListener('click', function () {
        try {
          if (!window.__BOXIES_IDENTITY_TRACE__) window.__BOXIES_IDENTITY_TRACE__ = [];
          window.__BOXIES_IDENTITY_TRACE__.push({
            t: Date.now(),
            step: '0_click_guardar',
            disabled: !!saveBtn.disabled,
            nombre: nameInput ? nameInput.value : null,
            slug: slugInput ? slugInput.value : null
          });
          console.log('[IDENTITY]', '0_click_guardar', {
            disabled: !!saveBtn.disabled,
            nombre: nameInput ? nameInput.value : null,
            slug: slugInput ? slugInput.value : null
          });
        } catch (eClick) {}
        if (slugInput) slugInput.value = normalizeSlug(slugInput.value);
        syncPublicUrlPreview();
        saveIdentity(adapter, nameInput, slugInput, saveBtn, statusEl);
      });
    }
  }

  async function saveIdentity(adapter, nameInput, slugInput, saveBtn, statusEl) {
    function trace(step, data) {
      try {
        if (!window.__BOXIES_IDENTITY_TRACE__) window.__BOXIES_IDENTITY_TRACE__ = [];
        var entry = Object.assign({ t: Date.now(), step: step }, data || {});
        window.__BOXIES_IDENTITY_TRACE__.push(entry);
        console.log('[IDENTITY]', step, data || {});
      } catch (e) {}
    }

    try {
      window.__BOXIES_IDENTITY_TRACE__ = [];
    } catch (e0) {}

    var identity = adapter.getIdentity ? (adapter.getIdentity() || {}) : {};
    var projectId = adapter.getProjectId ? adapter.getProjectId() : null;

    trace('1_uuid_cargado_pantalla', {
      projectId: projectId,
      stateNombre: identity.nombre,
      stateSlug: identity.slug
    });

    if (!projectId) {
      trace('STOP_sin_uuid', {});
      var missingMsg = typeof adapter.missingProjectMessage === 'function'
        ? adapter.missingProjectMessage()
        : 'Abre un showroom existente para guardar la identidad.';
      if (statusEl) statusEl.textContent = missingMsg;
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No hay un showroom vinculado (falta ID).');
      }
      return;
    }
    if (typeof ProyectosApi === 'undefined' || typeof ProyectosApi.updateIdentity !== 'function') {
      trace('STOP_api_ausente', {
        hasProyectosApi: typeof ProyectosApi !== 'undefined',
        hasUpdateIdentity: typeof ProyectosApi !== 'undefined' &&
          typeof ProyectosApi.updateIdentity === 'function'
      });
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('API de identidad no disponible.');
      }
      return;
    }

    var nombre = nameInput ? String(nameInput.value || '').trim() : '';
    var slug = normalizeSlug(slugInput ? slugInput.value : '');

    trace('3_inputs', {
      nombreInput: nameInput ? nameInput.value : null,
      slugInput: slugInput ? slugInput.value : null,
      nombre: nombre,
      slug: slug,
      saveBtnDisabled: !!(saveBtn && saveBtn.disabled)
    });

    if (!nombre || !slug) {
      trace('STOP_inputs_vacios', { nombre: nombre, slug: slug });
      if (statusEl) statusEl.textContent = 'Nombre y slug son obligatorios.';
      return;
    }
    if (typeof ShowroomPublicUrl !== 'undefined') {
      if (ShowroomPublicUrl.isReservedSlug(slug)) {
        trace('STOP_slug_reservado', { slug: slug });
        if (statusEl) statusEl.textContent = 'Ese slug está reservado.';
        return;
      }
      if (!ShowroomPublicUrl.isValidSlugFormat(slug)) {
        trace('STOP_slug_invalido', { slug: slug });
        if (statusEl) statusEl.textContent = 'Slug inválido.';
        return;
      }
    }

    if (typeof ProyectosApi.checkSlugAvailability === 'function') {
      try {
        var constructoraId = identity.constructora_id || null;
        if (!constructoraId && typeof adapter.resolveConstructoraId === 'function') {
          constructoraId = adapter.resolveConstructoraId();
        }
        var availability = await ProyectosApi.checkSlugAvailability(slug, {
          excludeId: projectId,
          constructoraId: constructoraId
        });
        trace('3b_slug_availability', availability);
        if (!availability.available) {
          var msg = availability.reason === 'reserved'
            ? 'Ese slug está reservado.'
            : 'Ese slug ya pertenece a otro Showroom.';
          trace('STOP_slug_no_disponible', { msg: msg, availability: availability });
          if (statusEl) statusEl.textContent = msg;
          if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
            AdminNotify.error(msg);
          }
          return;
        }
      } catch (checkErr) {
        trace('3b_slug_availability_error', {
          message: checkErr && checkErr.message
        });
      }
    }

    if (saveBtn) saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Guardando…';
    try {
      var result = await ProyectosApi.updateIdentity(projectId, {
        nombre: nombre,
        slug: slug
      });

      var updated = result && result.project ? result.project : result;
      var verify = result && result.verify ? result.verify : null;

      if (!verify || verify.slug !== slug) {
        throw new Error(
          'No se confirmó el slug guardado. Pedido: ' + slug +
          ' / Base: ' + ((verify && verify.slug) || '(vacío)')
        );
      }

      var payload = {
        id: updated.id,
        nombre: verify.nombre || updated.nombre,
        slug: verify.slug || updated.slug,
        constructora_id: updated.constructora_id || identity.constructora_id || null,
        project: updated,
        verify: verify,
        url: typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl(verify.slug || updated.slug)
          : publicUrlDisplay(verify.slug || updated.slug)
      };

      if (typeof adapter.onSaved === 'function') {
        await adapter.onSaved(payload);
      }

      if (typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(updated.id);
      }

      if (typeof BoxiesRouter !== 'undefined' && BoxiesRouter.syncProjectIdentity) {
        BoxiesRouter.syncProjectIdentity({
          projectId: updated.id,
          slug: payload.slug
        });
      }
      if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
        BoxiesShell.setProjectContext({
          id: updated.id,
          name: payload.nombre,
          slug: payload.slug
        });
      }

      try {
        window.dispatchEvent(new CustomEvent('boxies:showroom-identity-changed', {
          detail: {
            id: updated.id,
            nombre: payload.nombre,
            slug: payload.slug
          }
        }));
      } catch (evErr) {}

      trace('8_datos_render', {
        id: updated.id,
        nombre: payload.nombre,
        slug: payload.slug
      });

      if (statusEl) statusEl.textContent = 'Identidad guardada.';
      if (typeof AdminNotify !== 'undefined' && AdminNotify.success) {
        AdminNotify.success('Identidad guardada en la base: /' + payload.slug);
      }

      if (typeof adapter.afterSave === 'function') {
        adapter.afterSave(payload);
      }
    } catch (err) {
      trace('STOP_error', {
        message: err && err.message,
        stack: err && err.stack
      });
      if (statusEl) statusEl.textContent = err.message || 'Error al guardar.';
      if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error(err.message || 'Error al guardar identidad');
      }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  return {
    render: render,
    bind: bind,
    saveIdentity: saveIdentity,
    normalizeSlug: normalizeSlug,
    publicUrlDisplay: publicUrlDisplay
  };
})();
