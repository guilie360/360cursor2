/* BOXIES AI Project Builder — conversational wizard for admins */
var AiProjectBuilderView = (function () {
  var rootEl = null;
  var state = null;
  var processing = false;
  var projectTypePickerOpen = false;

  function saveState() {
    BuilderSession.save(state);
  }

  function renderProgressRail() {
    if (!rootEl) return;
    BuilderProgressRail.update(rootEl, state);
  }

  function renderDock() {
    if (!rootEl) return;
    BuilderDock.updateTabs(rootEl, BuilderWizard.getSteps(), state.currentStep);
  }

  function updateHeaderActions() {
    if (!rootEl) return;
    var pubBtn = rootEl.querySelector('#builderPublishBtn');
    if (pubBtn) {
      pubBtn.disabled = !!processing;
      pubBtn.textContent = state.published ? 'Republicar' : 'Publicar';
    }
    var saveBtn = rootEl.querySelector('#builderSaveBtn');
    if (saveBtn) saveBtn.disabled = !!processing;
    var validateBtn = rootEl.querySelector('#builderValidateBtn');
    if (validateBtn) validateBtn.disabled = !!processing;
    var resetBtn = rootEl.querySelector('#builderResetBtn');
    if (resetBtn) resetBtn.disabled = !!processing;
  }

  /* ── Step renderers ── */

  function renderProjectType() {
    var types = ProjectTypesEngine.getTypes();
    var selectedLabel = state.projectType
      ? ProjectTypesEngine.getTypeLabel(state.projectType)
      : 'Seleccionar tipo de proyecto';
    var openCls = projectTypePickerOpen ? ' is-open' : '';
    return '<div class="builder-step-content builder-step-content--types">' +
      '<h2 class="builder-step-title">¿Qué tipo de proyecto deseas crear?</h2>' +
      '<p class="builder-step-desc">Elige el tipo de vivienda o proyecto.</p>' +
      '<div class="builder-type-picker' + openCls + '" id="builderTypePicker">' +
        '<button type="button" class="builder-type-picker-toggle" id="builderTypePickerToggle"' +
          ' aria-expanded="' + (projectTypePickerOpen ? 'true' : 'false') + '" aria-haspopup="listbox">' +
          '<span class="builder-type-picker-value' + (state.projectType ? '' : ' is-placeholder') + '">' +
            AdminUI.escapeHtml(selectedLabel) +
          '</span>' +
          '<span class="builder-type-picker-chevron" aria-hidden="true">' + BuilderIcons.render('chevron-down') + '</span>' +
        '</button>' +
        '<div class="builder-type-picker-panel" id="builderTypePickerPanel" role="listbox"' +
          ' aria-label="Tipos de proyecto">' +
          types.map(function (t) {
            var sel = state.projectType === t.id ? ' is-selected' : '';
            return '<button type="button" class="builder-type-picker-item' + sel + '" data-type="' + t.id + '"' +
              ' role="option" aria-selected="' + (state.projectType === t.id ? 'true' : 'false') + '">' +
              AdminUI.escapeHtml(t.label) +
            '</button>';
          }).join('') +
        '</div>' +
      '</div></div>';
  }

  function renderBranding() {
    var b = state.branding || {};
    var proposals = b.themeProposals || [];
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Identidad corporativa</h2>' +
      '<p class="builder-step-desc">Sube logo e imagen de referencia. Extraeré colores y generaré el tema visual.</p>' +
      '<div class="builder-upload-grid">' +
        uploadZone('logo', 'Logo', 'image/*,.svg', b.logo) +
        uploadZone('reference', 'Imagen de referencia', 'image/*', b.reference) +
        uploadZone('brandManual', 'Manual de marca (opcional)', '.pdf,image/*', b.brandManual) +
      '</div>' +
      (b.status === 'analyzing' ? '<div class="builder-processing">Analizando identidad visual...</div>' : '') +
      (proposals.length ? renderThemeProposals(proposals, b.selectedProposal) : '') +
      '</div>';
  }

  function renderVideoHero() {
    var v = state.heroVideo;
    var img = state.heroImage;
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Hero</h2>' +
      '<p class="builder-step-desc">Elige video o imagen de fondo para la portada del showroom. Solo se usa uno a la vez.</p>' +
      '<div class="builder-hero-grid">' +
        '<div class="builder-hero-option' + (v && v.previewUrl ? ' is-active' : '') + '">' +
          '<div class="builder-hero-option-head"><span class="builder-hero-option-label">Video</span>' +
            (v && v.previewUrl ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</div>' +
          '<div class="builder-dropzone builder-dropzone-large" id="videoDropzone">' +
            (v && v.previewUrl
              ? '<video src="' + AdminUI.escapeHtml(v.previewUrl) + '" controls muted class="builder-video-preview"></video>' +
                '<div class="builder-file-meta">Duración: ' + AdminUI.escapeHtml(v.durationLabel) + ' · ' + formatBytes(v.size) + '</div>'
              : '<div class="builder-dropzone-inner"><span>Arrastra MP4, MOV o WebM</span><span class="builder-dropzone-hint">Máx. 200 MB</span></div>') +
          '</div>' +
          '<input type="file" id="videoInput" accept="' + MediaEngine.ACCEPT + '" hidden>' +
        '</div>' +
        '<div class="builder-hero-separator" aria-hidden="true">o</div>' +
        '<div class="builder-hero-option' + (img && img.previewUrl ? ' is-active' : '') + '">' +
          '<div class="builder-hero-option-head"><span class="builder-hero-option-label">Imagen</span>' +
            (img && img.previewUrl ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</div>' +
          '<div class="builder-dropzone builder-dropzone-large" id="heroImageDropzone">' +
            (img && img.previewUrl
              ? '<img src="' + AdminUI.escapeHtml(img.previewUrl) + '" alt="" class="builder-hero-image-preview">' +
                '<div class="builder-file-meta">' + AdminUI.escapeHtml(img.name) + ' · ' + formatBytes(img.size) + '</div>'
              : '<div class="builder-dropzone-inner"><span>Arrastra JPG, PNG o WebP</span><span class="builder-dropzone-hint">Máx. 20 MB</span></div>') +
          '</div>' +
          '<input type="file" id="heroImageInput" accept="' + MediaEngine.IMAGE_ACCEPT + '" hidden>' +
        '</div>' +
      '</div></div>';
  }

  function renderGallery() {
    var items = state.gallery || [];
    var groups = {};
    items.forEach(function (item) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Galería</h2>' +
      '<p class="builder-step-desc">Arrastra imágenes. Las clasificaré, ordenaré y eliminaré duplicados.</p>' +
      '<div class="builder-dropzone" id="galleryDropzone">' +
        '<div class="builder-dropzone-inner"><span>Arrastra múltiples imágenes</span></div>' +
      '</div>' +
      '<input type="file" id="galleryInput" accept="image/*" multiple hidden>' +
      (items.length ? '<div class="builder-gallery-summary">' + items.length + ' imágenes procesadas</div>' : '') +
      Object.keys(groups).map(function (cat) {
        return '<div class="builder-gallery-group"><div class="builder-gallery-group-label">' +
          AdminUI.escapeHtml(GalleryEngine.CATEGORIES[cat] ? GalleryEngine.CATEGORIES[cat].label : cat) +
          ' (' + groups[cat].length + ')</div><div class="builder-gallery-grid">' +
          groups[cat].map(function (item) {
            return '<div class="builder-gallery-item" title="' + AdminUI.escapeHtml(item.name) + '">' +
              (item.previewUrl ? '<img src="' + AdminUI.escapeHtml(item.previewUrl) + '" alt="">' : '') +
              '<span class="builder-gallery-item-name">' + AdminUI.escapeHtml(item.name) + '</span></div>';
          }).join('') + '</div></div>';
      }).join('') +
      '</div>';
  }

  function renderPanoramas() {
    var items = state.panoramas || [];
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Recorridos 360°</h2>' +
      '<p class="builder-step-desc">Sube panoramas. Identificaré cada espacio automáticamente.</p>' +
      '<div class="builder-dropzone" id="panoramaDropzone">' +
        '<div class="builder-dropzone-inner"><span class="builder-dropzone-icon">🔮</span><span>Arrastra panoramas 360°</span></div>' +
      '</div>' +
      '<input type="file" id="panoramaInput" accept="image/*" multiple hidden>' +
      (items.length ? '<div class="builder-pano-list">' +
        items.filter(function (p) { return p.file; }).map(function (p) {
          return '<div class="builder-pano-item">' +
            (p.previewUrl ? '<img src="' + AdminUI.escapeHtml(p.previewUrl) + '" alt="">' : '') +
            '<div class="builder-pano-info"><strong>' + AdminUI.escapeHtml(p.spaceLabel) + '</strong>' +
            '<span>' + AdminUI.escapeHtml(p.name) + '</span></div></div>';
        }).join('') + '</div>' : '') +
      '</div>';
  }

  function renderPlans() {
    return renderDocumentStep('plans', 'Planos', 'Sube PDF, JPG, PNG o DWG. Detectaré tipologías, áreas y niveles.', state.plans || []);
  }

  function renderDownloads() {
    return renderDocumentStep('downloads', 'Descargables', 'Brochures, fichas técnicas, cotizaciones, reglamentos.', state.downloads || []);
  }

  function renderDocumentStep(context, title, desc, items) {
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">' + title + '</h2>' +
      '<p class="builder-step-desc">' + desc + '</p>' +
      '<div class="builder-dropzone" id="' + context + 'Dropzone">' +
        '<div class="builder-dropzone-inner"><span class="builder-dropzone-icon">📄</span><span>Arrastra documentos</span></div>' +
      '</div>' +
      '<input type="file" id="' + context + 'Input" multiple hidden>' +
      (items.length ? '<div class="builder-doc-list">' +
        items.map(function (d) {
          return '<div class="builder-doc-item">' +
            '<span class="builder-doc-type">' + AdminUI.escapeHtml(d.docTypeLabel) + '</span>' +
            '<span class="builder-doc-name">' + AdminUI.escapeHtml(d.name) + '</span>' +
            (d.meta && d.meta.tipologia ? '<span class="builder-doc-meta">' + AdminUI.escapeHtml(d.meta.tipologia) + '</span>' : '') +
            (d.meta && d.meta.habitaciones != null ? '<span class="builder-doc-meta">' + d.meta.habitaciones + ' hab</span>' : '') +
            (d.meta && d.meta.area ? '<span class="builder-doc-meta">' + d.meta.area + ' m²</span>' : '') +
            '</div>';
        }).join('') + '</div>' : '') +
      '</div>';
  }

  function renderInfo() {
    var info = state.projectInfo || {};
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Información del proyecto</h2>' +
      '<p class="builder-step-desc">Pega texto comercial o sube un PDF. Extraeré la información automáticamente.</p>' +
      '<textarea class="builder-textarea" id="infoTextInput" placeholder="Pega aquí la información comercial del proyecto...">' + AdminUI.escapeHtml(info._rawText || '') + '</textarea>' +
      '<div class="builder-info-actions">' +
        '<button type="button" class="btn-primary" id="extractInfoBtn">Extraer información</button>' +
        '<label class="btn-ghost builder-file-label">Subir PDF<input type="file" id="infoPdfInput" accept=".pdf" hidden></label>' +
      '</div>' +
      (info.nombre ? renderInfoConfirmForm(info) : '') +
      '</div>';
  }

  function renderInfoConfirmForm(info) {
    var fields = [
      ['nombre', 'Nombre del proyecto', info.nombre],
      ['constructora', 'Constructora', info.constructora],
      ['ciudad', 'Ubicación / Ciudad', info.ciudad],
      ['direccion', 'Dirección', info.direccion],
      ['descripcion', 'Descripción', info.descripcion],
      ['fechaEntrega', 'Fecha de entrega', info.fechaEntrega],
      ['torres', 'Número de torres', info.torres],
      ['viviendas', 'Número de viviendas', info.viviendas],
      ['estado', 'Estado', info.estado],
      ['precioDesde', 'Precio desde', info.precioDesde],
      ['areaDesde', 'Área desde (m²)', info.areaDesde]
    ];
    return '<div class="builder-confirm-form"><div class="builder-confirm-title">Confirma o corrige la información extraída</div>' +
      fields.map(function (f) {
        return '<div class="builder-field"><label>' + f[1] + '</label>' +
          '<input type="text" data-info-field="' + f[0] + '" value="' + AdminUI.escapeHtml(f[2] != null ? String(f[2]) : '') + '"></div>';
      }).join('') +
      '<button type="button" class="btn-primary" id="confirmInfoBtn">Confirmar información</button></div>';
  }

  function renderAiContent() {
    var ai = state.aiContent || {};
    if (!ai.heroText) {
      return '<div class="builder-step-content">' +
        '<h2 class="builder-step-title">Asistente IA</h2>' +
        '<p class="builder-step-desc">Generaré textos comerciales, FAQs y contenido para el chatbot.</p>' +
        '<button type="button" class="btn-primary builder-generate-btn" id="generateAiBtn">Generar contenido con IA</button>' +
        '</div>';
    }
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Contenido generado</h2>' +
      '<div class="builder-ai-section"><label>Texto del Hero</label><p>' + AdminUI.escapeHtml(ai.heroText) + '</p></div>' +
      '<div class="builder-ai-section"><label>Descripción comercial</label><p>' + AdminUI.escapeHtml(ai.descripcionComercial) + '</p></div>' +
      '<div class="builder-ai-section"><label>Beneficios</label><ul>' + ai.beneficios.map(function (b) { return '<li>' + AdminUI.escapeHtml(b) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="builder-ai-section"><label>FAQs (' + ai.faqs.length + ')</label>' + ai.faqs.map(function (f) {
        return '<div class="builder-faq"><strong>' + AdminUI.escapeHtml(f.q) + '</strong><p>' + AdminUI.escapeHtml(f.a) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="builder-ai-section"><label>CTAs</label><div class="builder-tags">' + ai.ctas.map(function (c) { return '<span class="builder-tag">' + AdminUI.escapeHtml(c) + '</span>'; }).join('') + '</div></div>' +
      '<button type="button" class="btn-ghost" id="regenerateAiBtn">Regenerar contenido</button>' +
      '</div>';
  }

  function renderHotspots() {
    var suggestions = state.hotspotSuggestions || [];
    if (!suggestions.length) {
      return '<div class="builder-step-content">' +
        '<h2 class="builder-step-title">Hotspots</h2>' +
        '<p class="builder-step-desc">Analizaré renders maestros y propondré hotspots.</p>' +
        '<button type="button" class="btn-primary" id="analyzeHotspotsBtn">Analizar y proponer hotspots</button>' +
        '</div>';
    }
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Sugerencias de hotspots</h2>' +
      '<p class="builder-step-desc">Selecciona cuáles aceptar. Podrás editarlos después en el Editor Visual.</p>' +
      '<div class="builder-hotspot-list">' +
        suggestions.map(function (hs) {
          return '<label class="builder-hotspot-card' + (hs.accepted ? ' is-accepted' : '') + '">' +
            '<input type="checkbox" data-hotspot="' + hs.id + '"' + (hs.accepted ? ' checked' : '') + '>' +
            (hs.imagePreview ? '<img src="' + AdminUI.escapeHtml(hs.imagePreview) + '" alt="">' : '') +
            '<div class="builder-hotspot-info"><strong>' + AdminUI.escapeHtml(hs.label) + '</strong>' +
            '<span>Confianza: ' + Math.round(hs.confidence * 100) + '%</span></div></label>';
        }).join('') +
      '</div></div>';
  }

  function renderValidation() {
    var v = state.validation || ValidationEngine.validate(state);
    state.validation = v;
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Validación pre-publicación</h2>' +
      '<div class="builder-validation-score">Completitud: ' + v.score + '%</div>' +
      '<div class="builder-checklist">' +
        v.checks.map(function (c) {
          var icon = c.passed ? '✓' : (c.optional ? '○' : '✗');
          var cls = c.passed ? 'is-pass' : (c.optional ? 'is-optional' : 'is-fail');
          return '<div class="builder-check ' + cls + '"><span class="builder-check-icon">' + icon + '</span>' +
            AdminUI.escapeHtml(c.label) + (c.optional ? ' <em>(opcional)</em>' : '') + '</div>';
        }).join('') +
      '</div>' +
      (v.ready ? '<div class="builder-ready-banner">✅ Todo listo para publicar</div>' : '<div class="builder-warn-banner">Completa los elementos requeridos para continuar</div>') +
      '</div>';
  }

  function renderPublish() {
    if (state.published && state.publishResult) {
      var r = state.publishResult;
      return '<div class="builder-step-content builder-publish-success">' +
        '<h2>Proyecto publicado</h2>' +
        '<p>' + AdminUI.escapeHtml(r.project.nombre) + ' está listo.</p>' +
        '<a href="' + AdminUI.escapeHtml(r.url) + '" class="btn-primary" target="_blank">Ver showroom</a>' +
        '<button type="button" class="btn-ghost" id="newBuilderBtn">Crear otro proyecto</button></div>';
    }
    return '<div class="builder-step-content">' +
      '<h2 class="builder-step-title">Publicar proyecto</h2>' +
      '<p class="builder-step-desc">Al publicar, crearé automáticamente toda la estructura BOXIES.</p>' +
      '<div class="builder-publish-summary">' +
        summaryRow('Tipo', ProjectTypesEngine.getTypeLabel(state.projectType)) +
        summaryRow('Nombre', (state.projectInfo || {}).nombre || '—') +
        summaryRow('Imágenes', (state.gallery || []).length) +
        summaryRow('360°', (state.panoramas || []).filter(function (p) { return p.file; }).length) +
        summaryRow('Planos', (state.plans || []).length) +
        summaryRow('Documentos', (state.downloads || []).length) +
      '</div>' +
      '<button type="button" class="btn-primary builder-publish-btn" id="publishBtn"' + (processing ? ' disabled' : '') + '>' +
        (processing ? 'Publicando...' : 'Publicar proyecto') + '</button></div>';
  }

  function summaryRow(label, value) {
    return '<div class="builder-summary-row"><span>' + label + '</span><strong>' + AdminUI.escapeHtml(String(value)) + '</strong></div>';
  }

  function uploadZone(id, label, accept, current) {
    return '<div class="builder-upload-card">' +
      '<div class="builder-upload-label">' + AdminUI.escapeHtml(label) + '</div>' +
      '<label class="builder-upload-zone" data-upload="' + id + '">' +
        (current && current.previewUrl
          ? '<img src="' + AdminUI.escapeHtml(current.previewUrl) + '" class="builder-upload-preview" alt="">'
          : '<span class="builder-upload-placeholder">+ Subir</span>') +
        '<input type="file" data-file="' + id + '" accept="' + accept + '" hidden></label></div>';
  }

  function renderThemeProposals(proposals, selected) {
    return '<div class="builder-theme-proposals"><div class="builder-confirm-title">Propuestas de tema</div><div class="builder-theme-grid">' +
      proposals.map(function (p) {
        var sel = selected && selected.id === p.id ? ' is-selected' : '';
        var colors = p.palette && p.palette.colors ? p.palette.colors : {};
        return '<button type="button" class="builder-theme-card' + sel + '" data-proposal="' + p.id + '">' +
          '<div class="builder-theme-swatches">' +
            '<span style="background:' + (colors.primary || '#333') + '"></span>' +
            '<span style="background:' + (colors.accent || '#666') + '"></span>' +
            '<span style="background:' + (colors.background || '#000') + '"></span></div>' +
          '<strong>' + AdminUI.escapeHtml(p.name) + '</strong>' +
          '<span>' + AdminUI.escapeHtml(p.description) + '</span></button>';
      }).join('') + '</div></div>';
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function renderStepContent() {
    if (!rootEl) return;
    var panel = rootEl.querySelector('#builderStepPanel');
    if (!panel) return;
    var step = BuilderWizard.getStep(state.currentStep);
    if (!step) return;
    if (step.id !== 'project-type') projectTypePickerOpen = false;

    var html = '';
    switch (step.id) {
      case 'project-type': html = renderProjectType(); break;
      case 'branding': html = renderBranding(); break;
      case 'video-hero': html = renderVideoHero(); break;
      case 'gallery': html = renderGallery(); break;
      case 'panoramas': html = renderPanoramas(); break;
      case 'plans': html = renderPlans(); break;
      case 'downloads': html = renderDownloads(); break;
      case 'info': html = renderInfo(); break;
      case 'ai-content': html = renderAiContent(); break;
      case 'hotspots': html = renderHotspots(); break;
      case 'validation': html = renderValidation(); break;
      case 'publish': html = renderPublish(); break;
    }
    panel.innerHTML = html;
    bindStepEvents(step.id);
  }

  function renderShell() {
    rootEl.innerHTML =
      '<div class="builder-access-denied" id="builderAccessDenied" hidden>' +
        '<h2>Acceso restringido</h2>' +
        '<p>BOXIES AI solo está disponible para administradores.</p></div>' +
      '<div class="builder-app" id="builderApp" hidden>' +
        '<header class="builder-header-fixed">' +
          '<div class="builder-header-left">' +
            '<button type="button" class="builder-header-btn builder-header-back" id="builderBackInlineBtn" aria-label="Volver al showroom">' +
              BuilderIcons.render('arrow-left') + '<span>Showroom</span></button>' +
          '</div>' +
          '<span class="builder-header-title">BOXIES AI</span>' +
          '<div class="builder-header-actions">' +
            '<button type="button" class="builder-header-action-btn" id="builderSaveBtn">Guardar</button>' +
            '<button type="button" class="builder-header-action-btn" id="builderValidateBtn">Validar</button>' +
            '<button type="button" class="builder-header-action-btn is-primary" id="builderPublishBtn">Publicar</button>' +
            '<button type="button" class="builder-header-action-btn is-muted" id="builderResetBtn">Reiniciar</button>' +
          '</div>' +
        '</header>' +
        '<aside class="builder-progress-sidebar" id="builderProgressRail" aria-label="Progreso del proyecto"></aside>' +
        '<div class="builder-workspace">' +
          '<section class="builder-main-panel">' +
            '<div id="builderStepPanel"></div>' +
          '</section>' +
        '</div>' +
      '</div>' +
      BuilderDock.html();
  }

  /* ── Event handlers ── */

  function bindStepEvents(stepId) {
    if (stepId === 'project-type') {
      var picker = rootEl.querySelector('#builderTypePicker');
      var toggle = rootEl.querySelector('#builderTypePickerToggle');
      var outsideHandler = null;

      function setPickerOpen(open) {
        projectTypePickerOpen = open;
        if (picker) picker.classList.toggle('is-open', open);
        if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open && outsideHandler) {
          document.removeEventListener('mousedown', outsideHandler);
          outsideHandler = null;
        }
      }

      if (toggle && picker) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var next = !projectTypePickerOpen;
          setPickerOpen(next);
          if (next) {
            outsideHandler = function (ev) {
              if (!picker.contains(ev.target)) setPickerOpen(false);
            };
            document.addEventListener('mousedown', outsideHandler);
          }
        });
      }

      rootEl.querySelectorAll('.builder-type-picker-item[data-type]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var typeId = btn.getAttribute('data-type');
          state.projectType = typeId;
          state.projectStructure = ProjectTypesEngine.getStructure(typeId);
          saveState();
          setPickerOpen(false);
          renderStepContent();
          updateNavButtons();
        });
      });
    }

    if (stepId === 'branding') {
      rootEl.querySelectorAll('[data-file]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.files || !input.files[0]) return;
          handleBrandingUpload(input.getAttribute('data-file'), input.files[0]);
        });
      });
      rootEl.querySelectorAll('[data-proposal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-proposal');
          state.branding.selectedProposal = (state.branding.themeProposals || []).find(function (p) { return p.id === id; });
          saveState();
          renderStepContent();
        });
      });
    }

    if (stepId === 'video-hero') {
      bindDropzone('videoDropzone', 'videoInput', handleVideoUpload);
      bindDropzone('heroImageDropzone', 'heroImageInput', handleHeroImageUpload);
    }
    if (stepId === 'gallery') bindDropzone('galleryDropzone', 'galleryInput', handleGalleryUpload, true);
    if (stepId === 'panoramas') bindDropzone('panoramaDropzone', 'panoramaInput', handlePanoramaUpload, true);
    if (stepId === 'plans') bindDropzone('plansDropzone', 'plansInput', function (files) { handleDocUpload(files, 'plans'); }, true);
    if (stepId === 'downloads') bindDropzone('downloadsDropzone', 'downloadsInput', function (files) { handleDocUpload(files, 'downloads'); }, true);

    if (stepId === 'info') {
      var extractBtn = rootEl.querySelector('#extractInfoBtn');
      if (extractBtn) extractBtn.addEventListener('click', handleExtractInfo);
      var confirmBtn = rootEl.querySelector('#confirmInfoBtn');
      if (confirmBtn) confirmBtn.addEventListener('click', handleConfirmInfo);
      var pdfInput = rootEl.querySelector('#infoPdfInput');
      if (pdfInput) pdfInput.addEventListener('change', function () {
        if (pdfInput.files[0]) handleInfoPdf(pdfInput.files[0]);
      });
    }

    if (stepId === 'ai-content') {
      var genBtn = rootEl.querySelector('#generateAiBtn');
      if (genBtn) genBtn.addEventListener('click', handleGenerateAi);
      var regenBtn = rootEl.querySelector('#regenerateAiBtn');
      if (regenBtn) regenBtn.addEventListener('click', handleGenerateAi);
    }

    if (stepId === 'hotspots') {
      var analyzeBtn = rootEl.querySelector('#analyzeHotspotsBtn');
      if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyzeHotspots);
      rootEl.querySelectorAll('[data-hotspot]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          state.hotspotSuggestions = HotspotEngine.toggleAccepted(state.hotspotSuggestions, cb.getAttribute('data-hotspot'), cb.checked);
          state.acceptedHotspots = HotspotEngine.getAccepted(state.hotspotSuggestions);
          saveState();
        });
      });
    }

    if (stepId === 'publish') {
      var pubBtn = rootEl.querySelector('#publishBtn');
      if (pubBtn) pubBtn.addEventListener('click', handlePublish);
      var newBtn = rootEl.querySelector('#newBuilderBtn');
      if (newBtn) newBtn.addEventListener('click', handleReset);
    }

    updateNavButtons();
  }

  function bindDropzone(zoneId, inputId, handler, multiple) {
    var zone = rootEl.querySelector('#' + zoneId);
    var input = rootEl.querySelector('#' + inputId);
    if (!zone || !input) return;

    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('is-dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      if (e.dataTransfer.files.length) handler(multiple ? e.dataTransfer.files : e.dataTransfer.files[0]);
    });
    input.addEventListener('change', function () {
      if (input.files.length) handler(multiple ? input.files : input.files[0]);
    });
  }

  async function handleBrandingUpload(field, file) {
    if (!state.branding) state.branding = {};
    state.branding[field] = { file: file, name: file.name, previewUrl: URL.createObjectURL(file) };
    state.branding.status = 'analyzing';
    saveState();
    renderStepContent();
    try {
      var result = await BrandingEngine.analyzeBranding(
        state.branding.logo ? state.branding.logo.file : null,
        state.branding.reference ? state.branding.reference.file : null,
        state.branding.brandManual ? state.branding.brandManual.file : null
      );
      state.branding = Object.assign(state.branding, result);
      saveState();
    } catch (err) {
      AdminNotify.error(err.message || 'Error analizando identidad visual');
    }
    renderStepContent();
  }

  async function handleVideoUpload(file) {
    try {
      state.heroVideo = await MediaEngine.processVideo(file);
      state.heroImage = null;
      saveState();
    } catch (err) {
      AdminNotify.error(err.message);
    }
    renderStepContent();
    updateNavButtons();
  }

  async function handleHeroImageUpload(file) {
    try {
      state.heroImage = await MediaEngine.processImage(file);
      state.heroVideo = null;
      saveState();
    } catch (err) {
      AdminNotify.error(err.message);
    }
    renderStepContent();
    updateNavButtons();
  }

  async function handleGalleryUpload(files) {
    var structure = state.projectStructure || {};
    var result = await GalleryEngine.processFiles(files, structure.galleryGroups);
    state.gallery = (state.gallery || []).concat(result.items);
    saveState();
    renderStepContent();
  }

  async function handlePanoramaUpload(files) {
    var structure = state.projectStructure || {};
    var result = PanoramaEngine.processFiles(files, []);
    var newItems = result.items.filter(function (p) { return p.file; });
    state.panoramas = (state.panoramas || []).filter(function (p) { return p.file; }).concat(newItems);
    saveState();
    renderStepContent();
  }

  async function handleDocUpload(files, context) {
    var result = DocumentEngine.processFiles(files, context);
    if (context === 'plans') state.plans = (state.plans || []).concat(result.items);
    else state.downloads = (state.downloads || []).concat(result.items);
    saveState();
    renderStepContent();
  }

  function handleExtractInfo() {
    var text = rootEl.querySelector('#infoTextInput').value;
    state.projectInfo = AiAssistantEngine.extractInfoFromText(text);
    state.projectInfo._rawText = text;
    if (!state.projectInfo.nombre && state.projectType) {
      state.projectInfo.nombre = 'Proyecto ' + ProjectTypesEngine.getTypeLabel(state.projectType);
    }
    saveState();
    renderStepContent();
  }

  async function handleInfoPdf(file) {
    var extracted = await AiAssistantEngine.extractFromPdf(file);
    state.projectInfo = Object.assign(state.projectInfo || {}, extracted);
    state.projectInfo._rawText = file.name;
    saveState();
    renderStepContent();
  }

  function handleConfirmInfo() {
    rootEl.querySelectorAll('[data-info-field]').forEach(function (input) {
      var field = input.getAttribute('data-info-field');
      var val = input.value.trim();
      if (field === 'torres' || field === 'viviendas') state.projectInfo[field] = val ? parseInt(val, 10) : null;
      else state.projectInfo[field] = val;
    });
    saveState();
    AdminNotify.success('Información confirmada.');
  }

  function handleGenerateAi() {
    state.aiContent = AiAssistantEngine.generateContent(state);
    saveState();
    AdminNotify.success('Contenido generado correctamente.');
    renderStepContent();
  }

  function handleAnalyzeHotspots() {
    state.hotspotSuggestions = HotspotEngine.suggestFromGallery(state.gallery, state.projectType);
    saveState();
    renderStepContent();
  }

  function handleSave() {
    if (processing) return;
    processing = true;
    updateHeaderActions();
    saveState();

    HeroSyncEngine.sync(state)
      .then(function (result) {
        if (result) {
          saveState();
          AdminNotify.success('Guardado. El hero del showroom está actualizado.');
        } else if (MediaEngine.hasHeroMedia(state)) {
          AdminNotify.error('Abre Administrar desde el showroom del proyecto para sincronizar el hero.');
        } else {
          AdminNotify.success('Progreso guardado en esta sesión.');
        }
      })
      .catch(function (err) {
        AdminNotify.error(err.message || 'Error guardando cambios');
      })
      .finally(function () {
        processing = false;
        updateHeaderActions();
      });
  }

  function handleValidate() {
    state.validation = ValidationEngine.validate(state);
    saveState();
    goToStep(BuilderWizard.getStepIndex('validation'));
    if (state.validation.ready) {
      AdminNotify.success('Proyecto listo para publicar · ' + state.validation.score + '%');
    } else {
      AdminNotify.error('Completa los pendientes antes de publicar.');
    }
  }

  async function handlePublish() {
    if (processing) return;
    processing = true;
    updateHeaderActions();
    renderStepContent();
    try {
      var result = await PublishingEngine.publish(state);
      state.published = true;
      state.publishResult = result;
      state.draftProjectId = result.proyectoId || result.draftProjectId;
      saveState();
      AdminNotify.success('Proyecto publicado. Recarga el showroom para ver el hero.');
      if (typeof ProjectSelector !== 'undefined') await ProjectSelector.init();
    } catch (err) {
      AdminNotify.error(err.message || 'Error publicando proyecto');
    }
    processing = false;
    updateHeaderActions();
    renderStepContent();
    updateNavButtons();
  }

  function handleReset() {
    if (!confirm('¿Reiniciar el builder? Se perderá el progreso actual.')) return;
    projectTypePickerOpen = false;
    state = BuilderSession.reset();
    renderAll();
  }

  function goToStep(index) {
    if (index < 0 || index >= BuilderWizard.STEPS.length) return;
    state.currentStep = index;
    saveState();
    if (BuilderWizard.getStep(index).id === 'validation') {
      state.validation = ValidationEngine.validate(state);
    }
    renderAll();
  }

  function updateNavButtons() {
    renderDock();
    renderProgressRail();
    updateHeaderActions();
  }

  function bindGlobalEvents() {
    var saveBtn = rootEl.querySelector('#builderSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);

    var validateBtn = rootEl.querySelector('#builderValidateBtn');
    if (validateBtn) validateBtn.addEventListener('click', handleValidate);

    var publishBtn = rootEl.querySelector('#builderPublishBtn');
    if (publishBtn) publishBtn.addEventListener('click', handlePublish);

    rootEl.querySelector('#builderResetBtn').addEventListener('click', handleReset);

    var backInline = rootEl.querySelector('#builderBackInlineBtn');
    if (backInline) {
      backInline.addEventListener('click', function () {
        window.location.href = typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl()
          : '../index.html';
      });
    }

    rootEl.querySelector('#builderDockTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-step]');
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.getAttribute('data-step'), 10);
      if (idx >= 0 && idx < BuilderWizard.STEPS.length) goToStep(idx);
    });

    var rail = rootEl.querySelector('#builderProgressRail');
    if (rail) {
      rail.addEventListener('click', function (e) {
        var item = e.target.closest('[data-rail-step]');
        if (!item) return;
        var idx = parseInt(item.getAttribute('data-rail-step'), 10);
        if (idx >= 0) goToStep(idx);
      });
    }

    BuilderDock.bindFullscreen(rootEl);
  }

  function renderAll() {
    renderStepContent();
    updateNavButtons();
  }

  function canAccessBuilder() {
    if (typeof PlatformRoles !== 'undefined' && typeof VisitorSession !== 'undefined') {
      var profile = VisitorSession.getProfile();
      if (profile) return PlatformRoles.isAdmin(profile);
    }
    if (typeof AdminState !== 'undefined' && typeof AdminState.isAdmin === 'function') {
      return AdminState.isAdmin();
    }
    return false;
  }

  async function render(container) {
    rootEl = container;

    if (!canAccessBuilder()) {
      renderShell();
      rootEl.querySelector('#builderAccessDenied').hidden = false;
      return;
    }

    state = BuilderSession.load();
    BuilderDock.applyBodyPadding();
    renderShell();
    rootEl.querySelector('#builderApp').hidden = false;

    try {
      await HeroSyncEngine.bindFromUrl(state);
      saveState();
    } catch (err) {
      console.warn('[Builder] bind project', err);
    }

    rootEl.querySelector('#builderDockTabs').innerHTML = BuilderDock.renderTabs(
      BuilderWizard.getSteps(),
      state.currentStep
    );
    bindGlobalEvents();
    renderAll();
  }

  function onLeave() {
    saveState();
    BuilderDock.clearBodyPadding();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    rootEl = null;
  }

  return { render: render, onLeave: onLeave };
})();
