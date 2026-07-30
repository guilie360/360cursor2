/**
 * BuilderConfig — V7.1.10 publication panel (3 columns) for all BOXIES Builders.
 * Save only via Builder dock Guardar — no inline save button.
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

  function formatPublicUrlPath(urlOrSlug) {
    var raw = String(urlOrSlug || '').trim();
    if (!raw) return '';
    try {
      var withProto = raw.indexOf('http') === 0 ? raw : ('https://' + raw.replace(/^\/+/, ''));
      var u = new URL(withProto);
      var path = (u.pathname || '/').replace(/\/+$/, '');
      if (path === '/') path = '';
      return (u.hostname + path).toLowerCase();
    } catch (e) {
      return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
    }
  }

  function mockHostFromSlug(slug) {
    return formatPublicUrlPath(publicUrlDisplay(slug));
  }

  /**
   * @param {object} identity — { nombre, slug, og_image?, og_title?, og_description? }
   * @returns {string} HTML (builder-step-content wrapper included)
   */
  function render(identity) {
    identity = identity || {};
    var nombre = identity.nombre || '';
    var slug = identity.slug || '';
    var urlPreview = publicUrlDisplay(slug);
    var ogImage = identity.og_image || '';
    var ogTitle = identity.og_title || '';
    var ogDescription = identity.og_description || '';
    var hostLabel = mockHostFromSlug(slug);

    var hasImage = !!ogImage;
    var mockImg = hasImage
      ? ('<div class="builder-share-mock__media" style="background-image:url(\'' +
          escapeHtml(ogImage) + '\')"></div>')
      : '<div class="builder-share-mock__media builder-share-mock__media--empty" aria-hidden="true"></div>';
    var ogStage = hasImage
      ? ('<img class="builder-hero-image-preview" id="builderOgImagePreview" src="' +
          escapeHtml(ogImage) + '" alt="Vista previa Open Graph">')
      : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>';

    return '<div class="builder-step-content builder-config-workspace">' +
      '<div class="builder-config-col builder-config-col--identity">' +
        '<div class="builder-hero-config-card builder-config-identity">' +
          '<div class="builder-hero-config-card__title">Identidad</div>' +
          '<div class="builder-field">' +
            '<label for="showroomNameInput">Nombre</label>' +
            '<input type="text" id="showroomNameInput" maxlength="120" value="' +
              escapeHtml(nombre) + '" placeholder="Nombre del proyecto" autocomplete="off">' +
          '</div>' +
          '<div class="builder-field">' +
            '<label for="showroomSlugInput">Slug</label>' +
            '<input type="text" id="showroomSlugInput" maxlength="60" value="' +
              escapeHtml(slug) + '" placeholder="mi-proyecto" autocomplete="off" spellcheck="false" inputmode="latin">' +
            '<p class="builder-config-identity__slug-hint">Minúsculas, números y guiones. Máx. 60.</p>' +
          '</div>' +
          '<div class="builder-field">' +
            '<label>URL pública</label>' +
            '<div class="builder-config-identity__url" id="showroomPublicUrlPreview">' +
              escapeHtml(urlPreview) +
            '</div>' +
          '</div>' +
          '<div class="builder-field">' +
            '<label>Estado URL</label>' +
            '<p class="builder-config-identity__slug-check" id="showroomSlugCheck" aria-live="polite"></p>' +
          '</div>' +
          '<p class="builder-config-identity__hint">Si cambias el slug, la URL anterior dejará de funcionar.</p>' +
        '</div>' +
      '</div>' +
      '<div class="builder-config-col builder-config-col--share" data-builder-share>' +
        '<div class="builder-config-share">' +
          '<div class="builder-config-share__heading">Vista previa al compartir</div>' +
          '<div class="builder-config-share__fields">' +
            '<div class="builder-field">' +
              '<label for="builderOgTitle">Título del enlace</label>' +
              '<input type="text" id="builderOgTitle" maxlength="120" value="' +
                escapeHtml(ogTitle) + '" placeholder="Proyecto Altos del Bosque" autocomplete="off">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label for="builderOgDescription">Descripción del enlace</label>' +
              '<textarea id="builderOgDescription" rows="3" maxlength="300" placeholder="Conoce este proyecto y explora todas sus tipologías, recorridos 360, renders y características.">' +
                escapeHtml(ogDescription) +
              '</textarea>' +
            '</div>' +
          '</div>' +
          '<div class="builder-config-share__preview">' +
            '<div class="builder-config-share__preview-label">Vista previa</div>' +
            '<div class="builder-share-mock" data-builder-share-mock>' +
              mockImg +
              '<div class="builder-share-mock__body">' +
                '<div class="builder-share-mock__title" data-share-mock-title>' +
                  escapeHtml(ogTitle || nombre || 'Título para compartir') +
                '</div>' +
                '<div class="builder-share-mock__desc" data-share-mock-desc>' +
                  escapeHtml(ogDescription || 'La descripción aparecerá aquí.') +
                '</div>' +
                '<div class="builder-share-mock__host" data-share-mock-host>' +
                  escapeHtml(hostLabel) +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="builder-config-col builder-config-col--media">' +
        '<article class="builder-hero-media-card builder-config-og-card' +
          (hasImage ? ' has-media' : ' is-empty') + '" data-builder-og-card>' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Imagen Open Graph</span>' +
          '</header>' +
          '<div class="builder-hero-media-card__stage builder-config-og-stage" id="builderOgDropzone" role="button" tabindex="0">' +
            ogStage +
          '</div>' +
          '<div class="builder-hero-media-card__meta">' +
            '<div class="builder-hero-media-card__name" id="builderOgImageName">' +
              (hasImage ? 'Imagen cargada' : 'Sin imagen') +
            '</div>' +
            '<p class="builder-file-meta">1200 × 630 · JPG / PNG</p>' +
          '</div>' +
          '<div class="builder-hero-media-card__actions">' +
            '<button type="button" class="builder-header-action-btn" id="builderOgImageBtn">Subir imagen</button>' +
            '<button type="button" class="builder-header-action-btn is-danger" id="builderOgImageClear"' +
              (hasImage ? '' : ' hidden') + '>Quitar</button>' +
            '<input type="file" id="builderOgImageInput" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden>' +
            '<input type="hidden" id="builderOgImageUrl" value="' + escapeHtml(ogImage) + '">' +
          '</div>' +
        '</article>' +
      '</div>' +
    '</div>';
  }

  var pendingOgImageFile = null;

  function readShareFromDom(rootEl) {
    if (!rootEl) {
      return { og_image: '', og_title: '', og_description: '' };
    }
    var img = rootEl.querySelector('#builderOgImageUrl');
    var title = rootEl.querySelector('#builderOgTitle');
    var desc = rootEl.querySelector('#builderOgDescription');
    return {
      og_image: img ? String(img.value || '').trim() : '',
      og_title: title ? String(title.value || '').trim() : '',
      og_description: desc ? String(desc.value || '').trim() : '',
      _pendingFile: pendingOgImageFile
    };
  }

  function syncShareMock(rootEl) {
    if (!rootEl) return;
    var share = readShareFromDom(rootEl);
    var nameInput = rootEl.querySelector('#showroomNameInput');
    var slugInput = rootEl.querySelector('#showroomSlugInput');
    var urlPreviewEl = rootEl.querySelector('#showroomPublicUrlPreview');
    var fallbackTitle = nameInput ? String(nameInput.value || '').trim() : '';
    var liveSlug = normalizeSlug(slugInput ? slugInput.value : '');
    var livePublicUrl = urlPreviewEl
      ? String(urlPreviewEl.textContent || '').trim()
      : publicUrlDisplay(liveSlug);
    var titleEl = rootEl.querySelector('[data-share-mock-title]');
    var descEl = rootEl.querySelector('[data-share-mock-desc]');
    var hostEl = rootEl.querySelector('[data-share-mock-host]');
    var media = rootEl.querySelector('.builder-share-mock__media');
    var card = rootEl.querySelector('[data-builder-og-card]');
    var stage = rootEl.querySelector('#builderOgDropzone');
    var fileName = rootEl.querySelector('#builderOgImageName');
    var clearBtn = rootEl.querySelector('#builderOgImageClear');

    if (titleEl) {
      titleEl.textContent = share.og_title || fallbackTitle || 'Título para compartir';
    }
    if (descEl) {
      descEl.textContent = share.og_description || 'La descripción aparecerá aquí.';
    }
    if (hostEl) {
      hostEl.textContent = formatPublicUrlPath(livePublicUrl) || mockHostFromSlug(liveSlug);
    }
    if (media) {
      if (share.og_image) {
        media.classList.remove('builder-share-mock__media--empty');
        media.style.backgroundImage = 'url(\'' + share.og_image.replace(/'/g, '%27') + '\')';
      } else {
        media.classList.add('builder-share-mock__media--empty');
        media.style.backgroundImage = '';
      }
    }
    if (card) {
      card.classList.toggle('has-media', !!share.og_image);
      card.classList.toggle('is-empty', !share.og_image);
    }
    if (stage) {
      if (share.og_image) {
        stage.innerHTML = '<img class="builder-hero-image-preview" id="builderOgImagePreview" src="' +
          escapeHtml(share.og_image) + '" alt="Vista previa Open Graph">';
      } else {
        stage.innerHTML = '<div class="builder-hero-media-card__void" aria-hidden="true"></div>';
      }
    }
    if (fileName) {
      fileName.textContent = share.og_image
        ? (pendingOgImageFile && pendingOgImageFile.name
          ? pendingOgImageFile.name
          : 'Imagen cargada')
        : 'Sin imagen';
    }
    if (clearBtn) {
      clearBtn.hidden = !share.og_image;
    }
  }

  function markDirty() {
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.mark) {
      BuilderDirtyState.mark();
    }
  }

  function bindShare(rootEl, adapter) {
    if (!rootEl) return;
    pendingOgImageFile = null;
    var fileBtn = rootEl.querySelector('#builderOgImageBtn');
    var fileInput = rootEl.querySelector('#builderOgImageInput');
    var clearBtn = rootEl.querySelector('#builderOgImageClear');
    var dropzone = rootEl.querySelector('#builderOgDropzone');
    var hiddenUrl = rootEl.querySelector('#builderOgImageUrl');
    var titleInput = rootEl.querySelector('#builderOgTitle');
    var descInput = rootEl.querySelector('#builderOgDescription');

    function onShareChange() {
      syncShareMock(rootEl);
      markDirty();
      if (typeof adapter.onShareChange === 'function') {
        adapter.onShareChange(readShareFromDom(rootEl));
      }
    }

    function applyFile(file) {
      if (!file) return;
      var type = String(file.type || '').toLowerCase();
      if (type && type !== 'image/jpeg' && type !== 'image/png') {
        if (typeof AdminNotify !== 'undefined' && AdminNotify.error) {
          AdminNotify.error('Solo se admiten JPG y PNG.');
        }
        return;
      }
      pendingOgImageFile = file;
      if (hiddenUrl && hiddenUrl.value && hiddenUrl.value.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(hiddenUrl.value); } catch (eRev) {}
      }
      var preview = URL.createObjectURL(file);
      if (hiddenUrl) hiddenUrl.value = preview;
      onShareChange();
    }

    if (fileBtn && fileInput) {
      fileBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        applyFile(fileInput.files && fileInput.files[0]);
        fileInput.value = '';
      });
    }
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', function () { fileInput.click(); });
      dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });
      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('is-dragover');
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        applyFile(file);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        pendingOgImageFile = null;
        if (hiddenUrl) {
          if (hiddenUrl.value && hiddenUrl.value.indexOf('blob:') === 0) {
            try { URL.revokeObjectURL(hiddenUrl.value); } catch (eRev2) {}
          }
          hiddenUrl.value = '';
        }
        onShareChange();
      });
    }
    if (titleInput) titleInput.addEventListener('input', onShareChange);
    if (descInput) descInput.addEventListener('input', onShareChange);
    syncShareMock(rootEl);
  }

  /**
   * Persist og_* fields to proyecto_config. Uploads pending image when possible.
   */
  async function saveShareMeta(adapter, rootEl) {
    var projectId = adapter && adapter.getProjectId ? adapter.getProjectId() : null;
    if (!projectId) throw new Error('No hay proyecto vinculado.');
    var share = readShareFromDom(rootEl || document);
    var ogImage = share.og_image || '';

    if (share._pendingFile && typeof StorageApi !== 'undefined' && StorageApi.upload) {
      var constructoraId =
        (adapter.resolveConstructoraId && adapter.resolveConstructoraId()) ||
        (typeof AdminState !== 'undefined' && AdminState.getConstructoraId
          ? AdminState.getConstructoraId()
          : null);
      if (constructoraId) {
        var uploaded = await StorageApi.upload(
          constructoraId,
          projectId,
          'share',
          share._pendingFile
        );
        ogImage = (uploaded && uploaded.publicUrl) || ogImage;
        pendingOgImageFile = null;
        if (rootEl) {
          var hidden = rootEl.querySelector('#builderOgImageUrl');
          if (hidden) hidden.value = ogImage;
        }
      }
    }

    var meta = {
      og_image: ogImage || null,
      og_title: share.og_title || null,
      og_description: share.og_description || null
    };

    if (typeof ProyectosApi !== 'undefined' && ProyectosApi.updateShareMeta) {
      await ProyectosApi.updateShareMeta(projectId, meta);
    }

    if (typeof adapter.onShareSaved === 'function') {
      await adapter.onShareSaved(meta);
    }
    return meta;
  }

  /**
   * Adapter contract:
   *   getProjectId() -> string|null
   *   getIdentity() -> { nombre, slug, constructora_id?, og_*? }
   *   resolveConstructoraId() -> string|null  (optional)
   *   onSaved(payload) -> void|Promise  (optional)
   *   afterSave() -> void  (optional)
   *   onShareChange(meta) / onShareSaved(meta) (optional)
   *   missingProjectMessage() -> string (optional)
   */
  function bind(rootEl, adapter) {
    if (!rootEl || !adapter) return;
    bindShare(rootEl, adapter);
    var nameInput = rootEl.querySelector('#showroomNameInput');
    var slugInput = rootEl.querySelector('#showroomSlugInput');
    var urlPreviewEl = rootEl.querySelector('#showroomPublicUrlPreview');
    var slugCheckEl = rootEl.querySelector('#showroomSlugCheck');
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
      syncShareMock(rootEl);
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
        return;
      }

      if (typeof ShowroomPublicUrl !== 'undefined') {
        if (ShowroomPublicUrl.isReservedSlug(nextSlug)) {
          setSlugCheck('✕ Ese slug está reservado.', 'error');
          return;
        }
        if (!ShowroomPublicUrl.isValidSlugFormat(nextSlug)) {
          setSlugCheck('✕ Usa solo letras minúsculas, números y guiones.', 'error');
          return;
        }
      }

      var identity = adapter.getIdentity ? adapter.getIdentity() : {};
      var originalSlug = normalizeSlug((identity && identity.slug) || '');
      if (nextSlug === originalSlug && nextSlug) {
        setSlugCheck('✓ URL disponible', 'ok');
        return;
      }

      if (typeof ProyectosApi === 'undefined' ||
          typeof ProyectosApi.checkSlugAvailability !== 'function') {
        setSlugCheck('');
        return;
      }

      setSlugCheck('Comprobando…', 'pending');

      try {
        var result = await ProyectosApi.checkSlugAvailability(nextSlug, {
          excludeId: currentProjectId(),
          constructoraId: resolveConstructoraIdForCheck()
        });
        if (seq !== slugCheckSeq) return;
        if (result.available) {
          setSlugCheck('✓ URL disponible', 'ok');
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
      }
    }

    function scheduleSlugValidation() {
      syncPublicUrlPreview();
      if (slugCheckTimer) clearTimeout(slugCheckTimer);
      slugCheckTimer = setTimeout(validateSlugLive, 280);
    }

    if (nameInput) {
      nameInput.addEventListener('input', function () {
        markDirty();
        syncShareMock(rootEl);
        if (typeof adapter.onIdentityDraft === 'function') {
          adapter.onIdentityDraft({
            nombre: String(nameInput.value || ''),
            slug: slugInput ? String(slugInput.value || '') : ''
          });
        }
      });
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
        markDirty();
        scheduleSlugValidation();
        if (typeof adapter.onIdentityDraft === 'function') {
          adapter.onIdentityDraft({
            nombre: nameInput ? String(nameInput.value || '') : '',
            slug: String(slugInput.value || '')
          });
        }
      });
      slugInput.addEventListener('blur', function () {
        slugInput.value = normalizeSlug(slugInput.value);
        syncPublicUrlPreview();
        validateSlugLive();
        if (typeof adapter.onIdentityDraft === 'function') {
          adapter.onIdentityDraft({
            nombre: nameInput ? String(nameInput.value || '') : '',
            slug: String(slugInput.value || '')
          });
        }
      });
      scheduleSlugValidation();
    }
  }

  async function commitAll(adapter, rootEl, opts) {
    opts = opts || {};
    var nameInput = rootEl && rootEl.querySelector('#showroomNameInput');
    var slugInput = rootEl && rootEl.querySelector('#showroomSlugInput');
    if (nameInput || slugInput) {
      await saveIdentity(adapter, rootEl, nameInput, slugInput, null, null, {
        silent: !!opts.silent
      });
    } else if (rootEl) {
      await saveShareMeta(adapter, rootEl);
    }
    if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
      BuilderDirtyState.clear();
    }
  }

  async function saveIdentity(adapter, rootEl, nameInput, slugInput, saveBtn, statusEl, options) {
    options = options || {};
    var silent = !!options.silent;

    var identity = adapter.getIdentity ? (adapter.getIdentity() || {}) : {};
    var projectId = adapter.getProjectId ? adapter.getProjectId() : null;

    if (!projectId) {
      var missingMsg = typeof adapter.missingProjectMessage === 'function'
        ? adapter.missingProjectMessage()
        : 'Abre un showroom existente para guardar la identidad.';
      if (statusEl) statusEl.textContent = missingMsg;
      if (!silent && typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('No hay un showroom vinculado (falta ID).');
      }
      throw new Error(missingMsg || 'No hay un showroom vinculado.');
    }
    if (typeof ProyectosApi === 'undefined' || typeof ProyectosApi.updateIdentity !== 'function') {
      if (!silent && typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error('API de identidad no disponible.');
      }
      throw new Error('API de identidad no disponible.');
    }

    var nombre = nameInput ? String(nameInput.value || '').trim() : '';
    var slug = normalizeSlug(slugInput ? slugInput.value : '');

    if (!nombre || !slug) {
      if (statusEl) statusEl.textContent = 'Nombre y slug son obligatorios.';
      throw new Error('Nombre y slug son obligatorios.');
    }
    if (typeof ShowroomPublicUrl !== 'undefined') {
      if (ShowroomPublicUrl.isReservedSlug(slug)) {
        if (statusEl) statusEl.textContent = 'Ese slug está reservado.';
        throw new Error('Ese slug está reservado.');
      }
      if (!ShowroomPublicUrl.isValidSlugFormat(slug)) {
        if (statusEl) statusEl.textContent = 'Slug inválido.';
        throw new Error('Slug inválido.');
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
        if (!availability.available) {
          var msg = availability.reason === 'reserved'
            ? 'Ese slug está reservado.'
            : 'Ese slug ya pertenece a otro Showroom.';
          if (statusEl) statusEl.textContent = msg;
          throw new Error(msg);
        }
      } catch (checkErr) {
        if (checkErr && (
          checkErr.message === 'Ese slug está reservado.' ||
          checkErr.message === 'Ese slug ya pertenece a otro Showroom.'
        )) {
          throw checkErr;
        }
        if (checkErr && (
          checkErr.name === 'RangeError' ||
          /Maximum call stack/i.test((checkErr && checkErr.message) || '')
        )) {
          throw checkErr;
        }
        /* Transient availability-check failure — continue to updateIdentity. */
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

      try {
        await saveShareMeta(adapter, rootEl);
      } catch (shareErr) {}

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

      if (statusEl) statusEl.textContent = 'Identidad guardada.';
      if (!silent && typeof AdminNotify !== 'undefined' && AdminNotify.success) {
        AdminNotify.success('Identidad guardada en la base: /' + payload.slug);
      }

      if (typeof BuilderDirtyState !== 'undefined' && BuilderDirtyState.clear) {
        BuilderDirtyState.clear();
      }

      if (typeof adapter.afterSave === 'function') {
        adapter.afterSave(payload);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || 'Error al guardar.';
      if (!silent && typeof AdminNotify !== 'undefined' && AdminNotify.error) {
        AdminNotify.error(err.message || 'Error al guardar identidad');
      }
      throw err;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  return {
    render: render,
    bind: bind,
    saveIdentity: saveIdentity,
    saveShareMeta: saveShareMeta,
    commitAll: commitAll,
    readShareFromDom: readShareFromDom,
    normalizeSlug: normalizeSlug,
    publicUrlDisplay: publicUrlDisplay
  };
})();
