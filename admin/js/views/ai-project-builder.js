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
    if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
      try {
        var slug = null;
        slug = new URLSearchParams(window.location.search || '').get('project')
          || new URLSearchParams(window.location.search || '').get('proyecto');
        var name = (state.projectInfo && state.projectInfo.nombre) || '';
        if (slug || name) {
          BoxiesShell.setProjectContext({ name: name || slug, slug: slug || '' });
        }
      } catch (e) {}
    }
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
  }

  /* ── Step renderers ── */

  function stepTitleHtml(title) {
    var step = BuilderWizard.getStep(state.currentStep);
    var stepId = step ? step.id : '';
    var checked = false;
    if (stepId && typeof BuilderProgressRail !== 'undefined') {
      var items = BuilderProgressRail.buildItems(state);
      var stepIndex = BuilderWizard.getStepIndex(stepId);
      for (var i = 0; i < items.length; i++) {
        if (items[i].stepIndex === stepIndex) {
          checked = !!items[i].done;
          break;
        }
      }
    } else if (state.sectionChecks && Object.prototype.hasOwnProperty.call(state.sectionChecks, stepId)) {
      checked = !!state.sectionChecks[stepId];
    }
    return '<div class="builder-step-title-row">' +
      '<label class="builder-section-check" title="Marcar o desmarcar sección en la lista">' +
        '<input type="checkbox" id="builderSectionDoneCheck" data-section-id="' +
          AdminUI.escapeHtml(stepId) + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="builder-section-check-box" aria-hidden="true"></span>' +
      '</label>' +
      '<h2 class="builder-step-title">' + AdminUI.escapeHtml(title) + '</h2>' +
    '</div>';
  }

  function bindSectionDoneCheck() {
    var el = rootEl && rootEl.querySelector('#builderSectionDoneCheck');
    if (!el) return;
    el.addEventListener('change', function () {
      var stepId = el.getAttribute('data-section-id');
      if (!stepId) return;
      if (!state.sectionChecks) state.sectionChecks = {};
      /* true/false explícito: desmarcar gana sobre el “listo” automático */
      state.sectionChecks[stepId] = !!el.checked;
      saveState();
      renderProgressRail();
      updateNavButtons();
    });
  }

  function renderProjectType() {
    var types = ProjectTypesEngine.getTypes();
    var selectedLabel = state.projectType
      ? ProjectTypesEngine.getTypeLabel(state.projectType)
      : 'Seleccionar tipo de proyecto';
    var openCls = projectTypePickerOpen ? ' is-open' : '';
    return '<div class="builder-step-content builder-step-content--types">' +
      stepTitleHtml('¿Qué tipo de proyecto deseas crear?') +
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
    var showLogo = b.showHeroLogo !== false;
    var logoStyle = b.logoStyle === 'avatar' ? 'avatar' : 'flat';
    return '<div class="builder-step-content">' +
      stepTitleHtml('Logo') +
      '<p class="builder-step-desc">Sube el logo del proyecto. Aparece en el hero, justo arriba del título.</p>' +
      '<div class="builder-upload-grid builder-upload-grid-single">' +
        uploadZone('logo', 'Logo', 'image/*,.svg', b.logo) +
      '</div>' +
      '<div class="builder-confirm-form" style="margin-top:16px">' +
        '<label class="builder-check-row">' +
          '<input type="checkbox" id="brandShowHeroLogo"' + (showLogo ? ' checked' : '') + '>' +
          '<span>Mostrar logo en el hero</span>' +
        '</label>' +
        '<div class="builder-confirm-title" style="margin-top:8px">Formato en el hero</div>' +
        '<label class="builder-check-row">' +
          '<input type="radio" name="brandLogoStyle" value="flat" id="brandLogoStyleFlat"' +
            (logoStyle === 'flat' ? ' checked' : '') + '>' +
          '<span>Mantener formato</span>' +
        '</label>' +
        '<label class="builder-check-row">' +
          '<input type="radio" name="brandLogoStyle" value="avatar" id="brandLogoStyleAvatar"' +
            (logoStyle === 'avatar' ? ' checked' : '') + '>' +
          '<span>Convertir a circular</span>' +
        '</label>' +
        '<p class="builder-menu-hint">' +
          (logoStyle === 'avatar'
            ? 'Se mostrará como foto de perfil circular (recorta bordes).'
            : 'Se mostrará con su forma original (recomendado para PNG/SVG sin fondo).') +
        '</p>' +
      '</div>' +
      '</div>';
  }

  function renderVideoHero() {
    var v = state.heroVideo;
    var img = state.heroImage;
    var hero = state.heroContent || {};
    var nombre = hero.nombre || (state.projectInfo && state.projectInfo.nombre) || '';
    var eslogan = hero.eslogan || '';
    var btnLeft = hero.botonIzquierdo || 'Explorar';
    var btnRight = hero.botonDerecho || 'Iniciar';
    var waLink = hero.whatsappLink || '';
    var waMsg = hero.whatsappMessage || '';
    var shareUrl = hero.shareUrl || '';
    var showWa = hero.showWhatsapp !== false;
    var showShare = hero.showShare !== false;
    return '<div class="builder-step-content">' +
      stepTitleHtml('Hero') +
      '<p class="builder-step-desc">Elige video o imagen de fondo para la portada del showroom. Solo se usa uno a la vez.</p>' +
      '<div class="builder-hero-grid">' +
        '<div class="builder-hero-option' + (v && v.previewUrl ? ' is-active' : '') + '">' +
          '<div class="builder-hero-option-head"><span class="builder-hero-option-label">Video</span>' +
            (v && v.previewUrl ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</div>' +
          '<div class="builder-dropzone builder-dropzone-large" id="videoDropzone">' +
            (v && v.previewUrl
              ? '<video src="' + AdminUI.escapeHtml(v.previewUrl) + '" controls muted class="builder-video-preview"></video>' +
                '<div class="builder-file-meta">Duración: ' + AdminUI.escapeHtml(v.durationLabel || '-') + ' · ' + formatBytes(v.size) + '</div>'
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
      '</div>' +
      '<div class="builder-confirm-form" id="heroContentForm">' +
        '<div class="builder-confirm-title">Textos de la portada</div>' +
        '<div class="builder-field">' +
          '<label for="heroNombreInput">Nombre del proyecto</label>' +
          '<input type="text" id="heroNombreInput" maxlength="120" placeholder="PROYECTO DEMO" value="' +
            AdminUI.escapeHtml(nombre) + '">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="heroEsloganInput">Eslogan</label>' +
          '<input type="text" id="heroEsloganInput" maxlength="220" placeholder="Proyecto Demo" value="' +
            AdminUI.escapeHtml(eslogan) + '">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="heroBtnLeftInput">Texto botón izquierdo</label>' +
          '<input type="text" id="heroBtnLeftInput" maxlength="40" placeholder="Explorar" value="' +
            AdminUI.escapeHtml(btnLeft) + '">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="heroBtnRightInput">Texto botón derecho</label>' +
          '<input type="text" id="heroBtnRightInput" maxlength="40" placeholder="Iniciar" value="' +
            AdminUI.escapeHtml(btnRight) + '">' +
        '</div>' +
        '<div class="builder-confirm-title">WhatsApp y compartir</div>' +
        '<label class="builder-check-row">' +
          '<input type="checkbox" id="heroShowWhatsappInput"' + (showWa ? ' checked' : '') + '>' +
          '<span>Mostrar icono de WhatsApp</span>' +
        '</label>' +
        '<div class="builder-field">' +
          '<label for="heroWhatsappLinkInput">Link / número de WhatsApp</label>' +
          '<input type="text" id="heroWhatsappLinkInput" maxlength="180" ' +
            'placeholder="573001112233 o https://wa.me/573001112233" value="' +
            AdminUI.escapeHtml(waLink) + '">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="heroWhatsappMsgInput">Mensaje inicial de WhatsApp</label>' +
          '<input type="text" id="heroWhatsappMsgInput" maxlength="280" ' +
            'placeholder="Hola, quiero más información..." value="' +
            AdminUI.escapeHtml(waMsg) + '">' +
        '</div>' +
        '<label class="builder-check-row">' +
          '<input type="checkbox" id="heroShowShareInput"' + (showShare ? ' checked' : '') + '>' +
          '<span>Mostrar icono de compartir</span>' +
        '</label>' +
        '<div class="builder-field">' +
          '<label for="heroShareUrlInput">Link al compartir</label>' +
          '<input type="url" id="heroShareUrlInput" maxlength="400" ' +
            'placeholder="Vacío = URL actual del showroom" value="' +
            AdminUI.escapeHtml(shareUrl) + '">' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  function renderMenu() {
    MenuSyncEngine.ensureMenuState(state);
    var menu = state.menuConfig;
    var projectName = menu.projectName || (state.projectInfo && state.projectInfo.nombre) || '';
    var description = menu.description || '';

    function buildOptions(list, selected) {
      return list.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === selected ? ' selected' : '') + '>' +
          AdminUI.escapeHtml(o.label) + '</option>';
      }).join('');
    }

    var expandedIdx = typeof state.menuExpandedIdx === 'number' ? state.menuExpandedIdx : -1;

    var itemsHtml = (menu.items || []).map(function (item, idx) {
      var isSub = item.action === 'submenu';
      var isSoon = item.action === 'proximamente';
      var isOpen = expandedIdx === idx;
      var actionSummary = isSoon ? 'Próximamente' : (isSub ? 'Submenú' : 'Sección');
      var targetOpts = isSoon
        ? buildOptions([{ value: 'proximamente', label: 'Próximamente' }], 'proximamente')
        : (isSub
          ? buildOptions(MenuConfig.SUBMENU_OPTIONS, item.target || 'menu-proyecto')
          : buildOptions(MenuConfig.SECTION_OPTIONS, item.target || 'proximamente'));
      var childrenHtml = '';
      if (isSub && item.target === 'menu-proyecto') {
        childrenHtml =
          '<div class="builder-menu-children">' +
            '<div class="builder-menu-children-title">Ítems del submenú</div>' +
            (item.children || []).map(function (child, cidx) {
              return '<div class="builder-menu-child-row" data-menu-child-idx="' + cidx + '">' +
                '<label class="builder-check-row builder-check-inline">' +
                  '<input type="checkbox" data-menu-child-enabled' + (child.enabled !== false ? ' checked' : '') + '>' +
                '</label>' +
                '<input type="text" data-menu-child-label maxlength="60" value="' + AdminUI.escapeHtml(child.label) + '">' +
                '<select data-menu-child-target>' + buildOptions(MenuConfig.SECTION_OPTIONS, child.target || child.id) + '</select>' +
                '<button type="button" class="builder-menu-icon-btn" data-menu-child-remove title="Quitar">×</button>' +
              '</div>';
            }).join('') +
            '<button type="button" class="builder-header-action-btn" data-menu-child-add>+ Ítem submenú</button>' +
          '</div>';
      } else if (isSub && item.target === 'menu-contacto') {
        childrenHtml =
          '<p class="builder-menu-hint">Contacto usa enlaces del proyecto (tel, web, WhatsApp…). Se editan en Info / Hero.</p>';
      } else if (isSub && item.target === 'proximamente') {
        childrenHtml =
          '<p class="builder-menu-hint">Al hacer clic llevará a Próximamente (misma acción que Iniciar en el Hero).</p>';
      }

      return '<div class="builder-menu-item' + (isOpen ? ' is-open' : '') + '" data-menu-idx="' + idx + '">' +
        '<button type="button" class="builder-menu-item-summary" data-menu-toggle aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<span class="builder-menu-item-chevron" aria-hidden="true"></span>' +
          '<span class="builder-menu-item-summary-text">' +
            '<span class="builder-menu-item-name">' + AdminUI.escapeHtml(item.label || 'Botón') + '</span>' +
            '<span class="builder-menu-item-meta">' + actionSummary +
              (item.enabled === false ? ' · oculto' : '') +
            '</span>' +
          '</span>' +
        '</button>' +
        '<div class="builder-menu-item-body"' + (isOpen ? '' : ' hidden') + '>' +
          '<div class="builder-menu-item-top">' +
            '<label class="builder-check-row builder-check-inline">' +
              '<input type="checkbox" data-menu-enabled' + (item.enabled !== false ? ' checked' : '') + '>' +
              '<span>Visible</span>' +
            '</label>' +
            '<button type="button" class="builder-menu-icon-btn" data-menu-remove title="Quitar botón">×</button>' +
          '</div>' +
          '<div class="builder-field">' +
            '<label>Nombre del botón</label>' +
            '<input type="text" data-menu-label maxlength="60" value="' + AdminUI.escapeHtml(item.label) + '">' +
          '</div>' +
          '<div class="builder-menu-row-2">' +
            '<div class="builder-field">' +
              '<label>Al hacer clic</label>' +
              '<select data-menu-action>' +
                '<option value="section"' + (!isSub && !isSoon ? ' selected' : '') + '>Abrir sección</option>' +
                '<option value="submenu"' + (isSub ? ' selected' : '') + '>Abrir submenú</option>' +
                '<option value="proximamente"' + (isSoon ? ' selected' : '') + '>Próximamente</option>' +
              '</select>' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>' + (isSoon ? 'Destino' : (isSub ? 'Cuál submenú' : 'Cuál sección')) + '</label>' +
              '<select data-menu-target>' + targetOpts + '</select>' +
            '</div>' +
          '</div>' +
          childrenHtml +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="builder-step-content">' +
      stepTitleHtml('Menú') +
      '<p class="builder-step-desc">Cabecera y botones del menú del showroom. Cada botón puede abrir una sección o un submenú.</p>' +
      '<div class="builder-confirm-form">' +
        '<div class="builder-confirm-title">Cabecera del menú</div>' +
        '<div class="builder-field">' +
          '<label for="menuProjectNameInput">Nombre del proyecto</label>' +
          '<input type="text" id="menuProjectNameInput" maxlength="120" value="' + AdminUI.escapeHtml(projectName) + '">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="menuDescriptionInput">Descripción (línea bajo el nombre)</label>' +
          '<input type="text" id="menuDescriptionInput" maxlength="160" placeholder="Constructora Demo S.A.S." value="' +
            AdminUI.escapeHtml(description) + '">' +
        '</div>' +
      '</div>' +
      '<div class="builder-confirm-form builder-menu-list-wrap">' +
        '<div class="builder-confirm-title">Botones del menú</div>' +
        '<p class="builder-menu-hint">No hace falta crear “Submenú 1 / Submenú 2” en el sidebar: eliges por botón si abre sección o submenú.</p>' +
        itemsHtml +
        '<button type="button" class="builder-header-action-btn is-primary" id="menuAddBtn">+ Agregar botón</button>' +
      '</div>' +
    '</div>';
  }

  function renderViviendas() {
    ViviendasSyncEngine.ensureState(state);
    var items = state.viviendas || [];
    var expandedIdx = typeof state.viviendaExpandedIdx === 'number' ? state.viviendaExpandedIdx : -1;

    function estadoOptions(selected) {
      return ViviendasSyncEngine.ESTADOS.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === selected ? ' selected' : '') + '>' +
          AdminUI.escapeHtml(o.label) + '</option>';
      }).join('');
    }

    function planosModoOptions(selected) {
      return ViviendasSyncEngine.PLANOS_MODOS.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === selected ? ' selected' : '') + '>' +
          AdminUI.escapeHtml(o.label) + '</option>';
      }).join('');
    }

    function tourModoOptions(selected) {
      return ViviendasSyncEngine.TOUR360_MODOS.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === selected ? ' selected' : '') + '>' +
          AdminUI.escapeHtml(o.label) + '</option>';
      }).join('');
    }

    var itemsHtml = items.map(function (item, idx) {
      var isOpen = expandedIdx === idx;
      var meta = (item.codigo ? item.codigo + ' · ' : '') +
        ViviendasSyncEngine.formatPrice(item.precio) +
        (item.estado === 'reservado' ? ' · Reservado' : '') +
        (item.estado === 'vendido' ? ' · Vendido' : '') +
        (item.publicado === false ? ' · oculto' : '');

      var planName = item.planFileName ||
        (item.plans && item.plans[0] && (item.plans[0].label || 'Plano cargado')) ||
        '';
      var planosFileBlock = item.planosModo === 'file'
        ? '<div class="builder-field builder-vivienda-media-extra">' +
            '<label>Archivo de plano (PDF o imagen)</label>' +
            '<div class="builder-vivienda-file-row">' +
              '<input type="file" data-vivienda-plan-file accept=".pdf,image/*,.png,.jpg,.jpeg,.webp" hidden>' +
              '<button type="button" class="builder-header-action-btn" data-vivienda-plan-pick>Elegir archivo</button>' +
              '<span class="builder-vivienda-file-name">' +
                AdminUI.escapeHtml(planName || 'Sin archivo') +
              '</span>' +
            '</div>' +
          '</div>'
        : '<p class="builder-menu-hint">Al hacer clic en Ver Planos se mostrará Próximamente.</p>';

      var tourLinkBlock = item.tour360Modo === 'link'
        ? '<div class="builder-field builder-vivienda-media-extra">' +
            '<label>Link del recorrido 360°</label>' +
            '<input type="url" data-vivienda-link360 maxlength="500" placeholder="https://..." value="' +
              AdminUI.escapeHtml(item.link360 || '') + '">' +
          '</div>'
        : '<p class="builder-menu-hint">Al hacer clic en Ver 360° se mostrará Próximamente.</p>';

      return '<div class="builder-menu-item' + (isOpen ? ' is-open' : '') + '" data-vivienda-idx="' + idx + '">' +
        '<button type="button" class="builder-menu-item-summary" data-vivienda-toggle aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<span class="builder-menu-item-chevron" aria-hidden="true"></span>' +
          '<span class="builder-menu-item-summary-text">' +
            '<span class="builder-menu-item-name">' + AdminUI.escapeHtml(item.nombre || 'Vivienda') + '</span>' +
            '<span class="builder-menu-item-meta">' + AdminUI.escapeHtml(meta) + '</span>' +
          '</span>' +
        '</button>' +
        '<div class="builder-menu-item-body"' + (isOpen ? '' : ' hidden') + '>' +
          '<div class="builder-menu-item-top">' +
            '<label class="builder-check-row builder-check-inline">' +
              '<input type="checkbox" data-vivienda-publicado' + (item.publicado !== false ? ' checked' : '') + '>' +
              '<span>Visible en showroom</span>' +
            '</label>' +
            '<button type="button" class="builder-menu-icon-btn" data-vivienda-remove title="Quitar tarjeta">×</button>' +
          '</div>' +
          '<div class="builder-menu-row-2">' +
            '<div class="builder-field">' +
              '<label>Código / unidad</label>' +
              '<input type="text" data-vivienda-codigo maxlength="40" placeholder="T1-101" value="' +
                AdminUI.escapeHtml(item.codigo || '') + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Nombre</label>' +
              '<input type="text" data-vivienda-nombre maxlength="120" value="' +
                AdminUI.escapeHtml(item.nombre || '') + '">' +
            '</div>' +
          '</div>' +
          '<div class="builder-menu-row-2">' +
            '<div class="builder-field">' +
              '<label>Tipo</label>' +
              '<input type="text" data-vivienda-tipo maxlength="60" placeholder="Apartamento" value="' +
                AdminUI.escapeHtml(item.tipo || '') + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Estado</label>' +
              '<select data-vivienda-estado>' + estadoOptions(item.estado || 'disponible') + '</select>' +
            '</div>' +
          '</div>' +
          '<div class="builder-menu-row-2">' +
            '<div class="builder-field">' +
              '<label>Precio (COP)</label>' +
              '<input type="number" data-vivienda-precio min="0" step="1000" value="' +
                AdminUI.escapeHtml(String(item.precio || 0)) + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Área (m²)</label>' +
              '<input type="number" data-vivienda-area min="0" step="0.1" value="' +
                AdminUI.escapeHtml(String(item.area_m2 || 0)) + '">' +
            '</div>' +
          '</div>' +
          '<div class="builder-vivienda-specs">' +
            '<div class="builder-field">' +
              '<label>Habitaciones</label>' +
              '<input type="number" data-vivienda-habitaciones min="0" step="1" value="' +
                AdminUI.escapeHtml(String(item.habitaciones || 0)) + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Baños</label>' +
              '<input type="number" data-vivienda-banos min="0" step="1" value="' +
                AdminUI.escapeHtml(String(item.banos || 0)) + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Parqueaderos</label>' +
              '<input type="number" data-vivienda-parqueaderos min="0" step="1" value="' +
                AdminUI.escapeHtml(String(item.parqueaderos || 0)) + '">' +
            '</div>' +
          '</div>' +
          '<div class="builder-menu-row-2">' +
            '<div class="builder-field">' +
              '<label>Torre</label>' +
              '<input type="text" data-vivienda-torre maxlength="40" placeholder="Torre 1" value="' +
                AdminUI.escapeHtml(item.torre || '') + '">' +
            '</div>' +
            '<div class="builder-field">' +
              '<label>Piso</label>' +
              '<input type="number" data-vivienda-piso step="1" value="' +
                AdminUI.escapeHtml(item.piso != null && item.piso !== '' ? String(item.piso) : '') + '">' +
            '</div>' +
          '</div>' +
          '<div class="builder-vivienda-media">' +
            '<div class="builder-confirm-title">Ver Planos</div>' +
            '<div class="builder-field">' +
              '<label>Al hacer clic</label>' +
              '<select data-vivienda-planos-modo>' + planosModoOptions(item.planosModo || 'proximamente') + '</select>' +
            '</div>' +
            planosFileBlock +
          '</div>' +
          '<div class="builder-vivienda-media">' +
            '<div class="builder-confirm-title">Ver 360°</div>' +
            '<div class="builder-field">' +
              '<label>Al hacer clic</label>' +
              '<select data-vivienda-tour360-modo>' + tourModoOptions(item.tour360Modo || 'proximamente') + '</select>' +
            '</div>' +
            tourLinkBlock +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="builder-step-content">' +
      stepTitleHtml('Viviendas') +
      '<p class="builder-step-desc">Tarjetas del menú Viviendas en el showroom. Crea cada una a mano: código, precio, áreas y estado.</p>' +
      '<div class="builder-confirm-form builder-menu-list-wrap">' +
        '<div class="builder-confirm-title">Tarjetas</div>' +
        '<p class="builder-menu-hint">Las tarjetas aparecen en “Selecciona tu vivienda”. Guarda para sincronizarlas con el proyecto.</p>' +
        (itemsHtml || '<p class="builder-menu-hint">Aún no hay viviendas. Agrega la primera tarjeta.</p>') +
        '<button type="button" class="builder-header-action-btn is-primary" id="viviendaAddBtn">+ Agregar vivienda</button>' +
      '</div>' +
    '</div>';
  }

  function renderGallery() {
    var items = state.gallery || [];
    var groups = {};
    items.forEach(function (item) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return '<div class="builder-step-content">' +
      stepTitleHtml('Galería') +
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
      stepTitleHtml('Recorridos 360°') +
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
      stepTitleHtml(title) +
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
      stepTitleHtml('Información del proyecto') +
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
        stepTitleHtml('Asistente IA') +
        '<p class="builder-step-desc">Generaré textos comerciales, FAQs y contenido para el chatbot.</p>' +
        '<button type="button" class="btn-primary builder-generate-btn" id="generateAiBtn">Generar contenido con IA</button>' +
        '</div>';
    }
    return '<div class="builder-step-content">' +
      stepTitleHtml('Contenido generado') +
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
        stepTitleHtml('Hotspots') +
        '<p class="builder-step-desc">Analizaré renders maestros y propondré hotspots.</p>' +
        '<button type="button" class="btn-primary" id="analyzeHotspotsBtn">Analizar y proponer hotspots</button>' +
        '</div>';
    }
    return '<div class="builder-step-content">' +
      stepTitleHtml('Sugerencias de hotspots') +
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

  function renderInteractivo() {
    if (typeof InteractivoPage !== 'undefined' && typeof InteractivoPage.html === 'function') {
      return InteractivoPage.html();
    }
    return '<div class="builder-step-content" id="interactivoPage">' +
      stepTitleHtml('Interactivo') +
      '<p class="builder-step-desc">Editor experimental para construir áreas interactivas de proyectos.</p>' +
      '</div>';
  }

  function renderValidation() {
    var v = state.validation || ValidationEngine.validate(state);
    state.validation = v;
    return '<div class="builder-step-content">' +
      stepTitleHtml('Validación pre-publicación') +
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
      stepTitleHtml('Publicar proyecto') +
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
    var hasPreview = !!(current && current.previewUrl);
    return '<div class="builder-upload-card">' +
      '<div class="builder-upload-label">' +
        '<span>' + AdminUI.escapeHtml(label) + '</span>' +
        (hasPreview
          ? '<button type="button" class="builder-upload-remove" data-upload-remove="' + id + '" title="Eliminar" aria-label="Eliminar logo">×</button>'
          : '') +
      '</div>' +
      '<label class="builder-upload-zone" data-upload="' + id + '">' +
        (hasPreview
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
      case 'menu': html = renderMenu(); break;
      case 'viviendas': html = renderViviendas(); break;
      case 'gallery': html = renderGallery(); break;
      case 'panoramas': html = renderPanoramas(); break;
      case 'interactivo': html = renderInteractivo(); break;
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
    bindSectionDoneCheck();
  }

  function renderShell() {
    var dockHtml =
      typeof BuilderDock !== 'undefined' && typeof BuilderDock.html === 'function'
        ? BuilderDock.html()
        : '';
    var leftHtml =
      '<button type="button" class="builder-header-btn builder-header-back" id="builderBackInlineBtn" aria-label="Volver al showroom">' +
        BuilderIcons.render('arrow-left') + '<span>Showroom</span></button>';
    var actionsHtml =
      '<button type="button" class="builder-header-action-btn" id="builderSaveBtn">Guardar</button>' +
      '<button type="button" class="builder-header-action-btn is-primary" id="builderPublishBtn">Publicar</button>';

    var shellHtml =
      typeof BoxiesAppShell !== 'undefined'
        ? BoxiesAppShell.html({
            appId: 'builderApp',
            title: 'BOXIES',
            leftHtml: leftHtml,
            actionsHtml: actionsHtml,
            railId: 'builderProgressRail',
            railHtml: '',
            dockHtml: dockHtml
          })
        : (
          '<div class="builder-app" id="builderApp" hidden>' +
            '<header class="builder-header-fixed">' +
              '<div class="builder-header-left">' + leftHtml + '</div>' +
              '<span class="builder-header-title">BOXIES</span>' +
              '<div class="builder-header-actions">' + actionsHtml + '</div>' +
            '</header>' +
            '<aside class="builder-progress-sidebar" id="builderProgressRail" aria-label="Progreso del proyecto"></aside>' +
            '<div class="builder-workspace">' +
              '<section class="builder-main-panel">' +
                '<div id="builderStepPanel"></div>' +
              '</section>' +
            '</div>' +
          '</div>' +
          dockHtml
        );

    rootEl.innerHTML =
      '<div class="builder-access-denied" id="builderAccessDenied" hidden>' +
        '<h2>Acceso restringido</h2>' +
        '<p>BOXIES solo está disponible para administradores.</p></div>' +
      shellHtml;

    var app = rootEl.querySelector('#builderApp');
    if (app) app.hidden = true;
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
      rootEl.querySelectorAll('[data-file="logo"]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.files || !input.files[0]) return;
          handleBrandingUpload('logo', input.files[0]);
        });
      });
      var removeLogoBtn = rootEl.querySelector('[data-upload-remove="logo"]');
      if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!state.branding) state.branding = {};
          if (state.branding.logo && state.branding.logo.previewUrl &&
              String(state.branding.logo.previewUrl).indexOf('blob:') === 0) {
            try { URL.revokeObjectURL(state.branding.logo.previewUrl); } catch (err) {}
          }
          state.branding.logo = null;
          state.branding.logoCleared = true;
          state.branding.status = null;
          saveState();
          renderStepContent();
          updateNavButtons();
          HeroSyncEngine.sync(state)
            .then(function (result) {
              if (result) AdminNotify.success('Logo eliminado del hero.');
            })
            .catch(function (err) {
              AdminNotify.error(err.message || 'Error eliminando el logo');
            });
        });
      }
      var showLogoEl = rootEl.querySelector('#brandShowHeroLogo');
      if (showLogoEl) {
        showLogoEl.addEventListener('change', function () {
          if (!state.branding) state.branding = {};
          state.branding.showHeroLogo = !!showLogoEl.checked;
          saveState();
          HeroSyncEngine.sync(state)
            .then(function (result) {
              if (result) {
                AdminNotify.success(
                  state.branding.showHeroLogo
                    ? 'Logo visible en el hero.'
                    : 'Logo oculto en el hero.'
                );
              }
            })
            .catch(function (err) {
              AdminNotify.error(err.message || 'Error guardando el logo');
            });
        });
      }
      rootEl.querySelectorAll('input[name="brandLogoStyle"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          if (!radio.checked) return;
          if (!state.branding) state.branding = {};
          state.branding.logoStyle = radio.value === 'avatar' ? 'avatar' : 'flat';
          if (state.branding.logo) state.branding.logo.logoStyle = state.branding.logoStyle;
          saveState();
          /* No re-render antes del sync: evita perder el valor elegido. */
          var hint = rootEl.querySelector('.builder-confirm-form .builder-menu-hint');
          if (hint) {
            hint.textContent = state.branding.logoStyle === 'avatar'
              ? 'Se mostrará como foto de perfil circular (recorta bordes).'
              : 'Se mostrará con su forma original (recomendado para PNG/SVG sin fondo).';
          }
          HeroSyncEngine.sync(state)
            .then(function (result) {
              if (result) AdminNotify.success(
                state.branding.logoStyle === 'avatar'
                  ? 'Logo circular aplicado en el hero.'
                  : 'Formato original aplicado en el hero.'
              );
            })
            .catch(function (err) {
              AdminNotify.error(err.message || 'Error guardando el logo');
            });
        });
      });
    }

    if (stepId === 'video-hero') {
      bindDropzone('videoDropzone', 'videoInput', handleVideoUpload);
      bindDropzone('heroImageDropzone', 'heroImageInput', handleHeroImageUpload);
      bindHeroContentFields();
    }
    if (stepId === 'menu') bindMenuFields();
    if (stepId === 'viviendas') bindViviendasFields();
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

    if (stepId === 'interactivo') {
      if (typeof InteractivoPage !== 'undefined' && typeof InteractivoPage.mount === 'function') {
        InteractivoPage.mount(rootEl.querySelector('#interactivoPage'));
      }
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

  function bindHeroContentFields() {
    if (!state.heroContent) {
      state.heroContent = {
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        whatsappLink: '',
        whatsappMessage: '',
        shareUrl: '',
        showWhatsapp: true,
        showShare: true
      };
    }

    function readField(id, fallback) {
      var el = rootEl.querySelector('#' + id);
      if (!el) return fallback;
      return el.value;
    }

    function readChecked(id, fallback) {
      var el = rootEl.querySelector('#' + id);
      if (!el) return fallback;
      return !!el.checked;
    }

    function persistHeroContent() {
      state.heroContent.nombre = readField('heroNombreInput', state.heroContent.nombre || '');
      state.heroContent.eslogan = readField('heroEsloganInput', state.heroContent.eslogan || '');
      state.heroContent.botonIzquierdo = readField('heroBtnLeftInput', state.heroContent.botonIzquierdo || 'Explorar') || 'Explorar';
      state.heroContent.botonDerecho = readField('heroBtnRightInput', state.heroContent.botonDerecho || 'Iniciar') || 'Iniciar';
      state.heroContent.whatsappLink = readField('heroWhatsappLinkInput', state.heroContent.whatsappLink || '');
      state.heroContent.whatsappMessage = readField('heroWhatsappMsgInput', state.heroContent.whatsappMessage || '');
      state.heroContent.shareUrl = readField('heroShareUrlInput', state.heroContent.shareUrl || '');
      state.heroContent.showWhatsapp = readChecked('heroShowWhatsappInput', state.heroContent.showWhatsapp !== false);
      state.heroContent.showShare = readChecked('heroShowShareInput', state.heroContent.showShare !== false);
      if (state.heroContent.nombre) {
        state.projectInfo = Object.assign({}, state.projectInfo || {}, {
          nombre: state.heroContent.nombre
        });
      }
      saveState();
    }

    [
      'heroNombreInput',
      'heroEsloganInput',
      'heroBtnLeftInput',
      'heroBtnRightInput',
      'heroWhatsappLinkInput',
      'heroWhatsappMsgInput',
      'heroShareUrlInput',
      'heroShowWhatsappInput',
      'heroShowShareInput'
    ].forEach(function (id) {
      var el = rootEl.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('input', persistHeroContent);
      el.addEventListener('change', persistHeroContent);
    });
  }

  function bindMenuFields() {
    MenuSyncEngine.ensureMenuState(state);

    function persistFromDom(rerender) {
      var menu = MenuSyncEngine.ensureMenuState(state);
      var nameEl = rootEl.querySelector('#menuProjectNameInput');
      var descEl = rootEl.querySelector('#menuDescriptionInput');
      if (nameEl) menu.projectName = nameEl.value;
      if (descEl) menu.description = descEl.value;

      var nextItems = [];
      rootEl.querySelectorAll('.builder-menu-item[data-menu-idx]').forEach(function (row) {
        var idx = parseInt(row.getAttribute('data-menu-idx'), 10);
        var prev = menu.items[idx] || MenuConfig.normalizeItem({});
        var actionEl = row.querySelector('[data-menu-action]');
        var targetEl = row.querySelector('[data-menu-target]');
        var labelEl = row.querySelector('[data-menu-label]');
        var enabledEl = row.querySelector('[data-menu-enabled]');
        var action = actionEl ? actionEl.value : prev.action;
        var target = targetEl ? targetEl.value : prev.target;
        var children = prev.children || [];

        if (action === 'proximamente') {
          target = 'proximamente';
          children = [];
        } else if (action === 'submenu' && target === 'menu-proyecto') {
          children = [];
          row.querySelectorAll('.builder-menu-child-row').forEach(function (crow) {
            var cidx = parseInt(crow.getAttribute('data-menu-child-idx'), 10);
            var prevChild = (prev.children || [])[cidx] || {};
            var clabel = crow.querySelector('[data-menu-child-label]');
            var ctarget = crow.querySelector('[data-menu-child-target]');
            var cenabled = crow.querySelector('[data-menu-child-enabled]');
            children.push({
              id: prevChild.id || MenuConfig.uid('child'),
              label: clabel ? clabel.value : (prevChild.label || 'Ítem'),
              enabled: cenabled ? !!cenabled.checked : true,
              target: ctarget ? ctarget.value : (prevChild.target || 'descripcion')
            });
          });
          if (!children.length) children = MenuConfig.defaultChildren();
        } else {
          children = [];
          if (action === 'submenu' && (!target || target === 'tour360' || target === 'tipologias' || target === 'location')) {
            target = target === 'proximamente' ? 'proximamente' : 'menu-proyecto';
          }
          if (action === 'section' && (target === 'menu-proyecto' || target === 'menu-contacto')) {
            target = 'proximamente';
          }
        }

        nextItems.push(MenuConfig.normalizeItem({
          id: prev.id,
          label: labelEl ? labelEl.value : prev.label,
          enabled: enabledEl ? !!enabledEl.checked : true,
          action: action,
          target: target,
          children: children
        }));
      });

      menu.items = nextItems;
      state.menuConfig = menu;
      if (menu.projectName) {
        state.projectInfo = Object.assign({}, state.projectInfo || {}, { nombre: menu.projectName });
      }
      saveState();
      if (rerender) {
        renderStepContent();
        updateNavButtons();
      }
    }

    function syncMenuNow(okMessage) {
      saveState();
      return MenuSyncEngine.sync(state)
        .then(function (result) {
          if (result) {
            saveState();
            if (okMessage) AdminNotify.success(okMessage);
          }
          return result;
        })
        .catch(function (err) {
          AdminNotify.error(err.message || 'Error sincronizando el menú');
        });
    }

    ['#menuProjectNameInput', '#menuDescriptionInput'].forEach(function (sel) {
      var el = rootEl.querySelector(sel);
      if (!el) return;
      el.addEventListener('input', function () { persistFromDom(false); });
      el.addEventListener('change', function () { persistFromDom(false); });
    });

    rootEl.querySelectorAll('.builder-menu-item').forEach(function (row) {
      var toggle = row.querySelector('[data-menu-toggle]');
      if (toggle) {
        toggle.addEventListener('click', function () {
          var idx = parseInt(row.getAttribute('data-menu-idx'), 10);
          state.menuExpandedIdx = state.menuExpandedIdx === idx ? -1 : idx;
          saveState();
          renderStepContent();
        });
      }

      row.querySelectorAll('.builder-menu-item-body input, .builder-menu-item-body select').forEach(function (el) {
        var needsRerender = el.hasAttribute('data-menu-action') || el.hasAttribute('data-menu-target');
        el.addEventListener('change', function () {
          if (needsRerender) {
            state.menuExpandedIdx = parseInt(row.getAttribute('data-menu-idx'), 10);
          }
          persistFromDom(needsRerender);
          if (!needsRerender && el.hasAttribute('data-menu-label')) {
            var nameEl = row.querySelector('.builder-menu-item-name');
            if (nameEl) nameEl.textContent = el.value || 'Botón';
          }
        });
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('input', function () {
            persistFromDom(false);
            if (el.hasAttribute('data-menu-label')) {
              var nameEl = row.querySelector('.builder-menu-item-name');
              if (nameEl) nameEl.textContent = el.value || 'Botón';
            }
          });
        }
      });

      var removeBtn = row.querySelector('[data-menu-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          var idx = parseInt(row.getAttribute('data-menu-idx'), 10);
          persistFromDom(false);
          if (!state.menuConfig.items[idx]) return;
          state.menuConfig.items.splice(idx, 1);
          state.menuExpandedIdx = -1;
          saveState();
          renderStepContent();
          updateNavButtons();
          syncMenuNow('Botón eliminado del showroom.');
        });
      }

      var addChild = row.querySelector('[data-menu-child-add]');
      if (addChild) {
        addChild.addEventListener('click', function () {
          persistFromDom(false);
          var idx = parseInt(row.getAttribute('data-menu-idx'), 10);
          state.menuExpandedIdx = idx;
          var item = state.menuConfig.items[idx];
          if (!item.children) item.children = [];
          item.children.push({
            id: MenuConfig.uid('child'),
            label: 'Nuevo ítem',
            enabled: true,
            target: 'proximamente'
          });
          saveState();
          renderStepContent();
          syncMenuNow('Ítem agregado al submenú.');
        });
      }

      row.querySelectorAll('[data-menu-child-remove]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var crow = btn.closest('[data-menu-child-idx]');
          var idx = parseInt(row.getAttribute('data-menu-idx'), 10);
          var cidx = crow ? parseInt(crow.getAttribute('data-menu-child-idx'), 10) : -1;
          /* Mutar estado directo: no re-leer el DOM (evita reinsertar el ítem borrado). */
          MenuSyncEngine.ensureMenuState(state);
          state.menuExpandedIdx = idx;
          if (cidx >= 0 && state.menuConfig.items[idx] && state.menuConfig.items[idx].children) {
            state.menuConfig.items[idx].children.splice(cidx, 1);
          }
          saveState();
          renderStepContent();
          syncMenuNow('Ítem eliminado del showroom.');
        });
      });
    });

    var addBtn = rootEl.querySelector('#menuAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        persistFromDom(false);
        state.menuConfig.items.push(MenuConfig.normalizeItem({
          id: MenuConfig.uid('menu'),
          label: 'Nuevo botón',
          enabled: true,
          action: 'proximamente',
          target: 'proximamente',
          children: []
        }));
        state.menuExpandedIdx = state.menuConfig.items.length - 1;
        saveState();
        renderStepContent();
        updateNavButtons();
        syncMenuNow('Botón agregado al menú.');
      });
    }
  }

  function bindViviendasFields() {
    ViviendasSyncEngine.ensureState(state);

    function persistFromDom(rerender) {
      var next = [];
      rootEl.querySelectorAll('.builder-menu-item[data-vivienda-idx]').forEach(function (row) {
        var idx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
        var prev = (state.viviendas || [])[idx] || ViviendasSyncEngine.emptyItem();
        function val(sel) {
          var el = row.querySelector(sel);
          return el ? el.value : '';
        }
        function checked(sel, fallback) {
          var el = row.querySelector(sel);
          return el ? !!el.checked : fallback;
        }
        next.push(ViviendasSyncEngine.normalizeItem({
          id: prev.id,
          localId: prev.localId,
          codigo: val('[data-vivienda-codigo]'),
          nombre: val('[data-vivienda-nombre]'),
          tipo: val('[data-vivienda-tipo]'),
          torre: val('[data-vivienda-torre]'),
          piso: val('[data-vivienda-piso]'),
          area_m2: val('[data-vivienda-area]'),
          habitaciones: val('[data-vivienda-habitaciones]'),
          banos: val('[data-vivienda-banos]'),
          parqueaderos: val('[data-vivienda-parqueaderos]'),
          precio: val('[data-vivienda-precio]'),
          administracion: prev.administracion,
          estado: val('[data-vivienda-estado]') || 'disponible',
          publicado: checked('[data-vivienda-publicado]', true),
          planosModo: val('[data-vivienda-planos-modo]') || prev.planosModo || 'proximamente',
          plans: prev.plans || [],
          planFileName: prev.planFileName || '',
          tour360Modo: val('[data-vivienda-tour360-modo]') || prev.tour360Modo || 'proximamente',
          link360: val('[data-vivienda-link360]') || prev.link360 || ''
        }));
      });
      state.viviendas = next;
      saveState();
      if (rerender) {
        renderStepContent();
        updateNavButtons();
      }
    }

    function syncNow(okMessage) {
      saveState();
      return ViviendasSyncEngine.sync(state, { requireProject: true })
        .then(function (result) {
          if (result) {
            saveState();
            AdminNotify.success(okMessage || ('Viviendas sincronizadas · ' + result.count));
            renderStepContent();
            updateNavButtons();
          } else {
            AdminNotify.error('No se pudo sincronizar. Abre BOXIES AI desde el showroom del proyecto.');
          }
        })
        .catch(function (err) {
          AdminNotify.error(err.message || 'Error sincronizando viviendas');
        });
    }

    rootEl.querySelectorAll('.builder-menu-item[data-vivienda-idx]').forEach(function (row) {
      var toggle = row.querySelector('[data-vivienda-toggle]');
      if (toggle) {
        toggle.addEventListener('click', function () {
          var idx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
          state.viviendaExpandedIdx = state.viviendaExpandedIdx === idx ? -1 : idx;
          saveState();
          renderStepContent();
        });
      }

      row.querySelectorAll('.builder-menu-item-body input, .builder-menu-item-body select').forEach(function (el) {
        if (el.type === 'file') return;
        el.addEventListener('change', function () {
          var needsRerender = el.hasAttribute('data-vivienda-planos-modo') ||
            el.hasAttribute('data-vivienda-tour360-modo');
          if (needsRerender) {
            state.viviendaExpandedIdx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
          }
          persistFromDom(needsRerender);
          if (!needsRerender && (el.hasAttribute('data-vivienda-nombre') || el.hasAttribute('data-vivienda-codigo') ||
              el.hasAttribute('data-vivienda-precio') || el.hasAttribute('data-vivienda-estado'))) {
            var nameEl = row.querySelector('.builder-menu-item-name');
            var metaEl = row.querySelector('.builder-menu-item-meta');
            var idx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
            var item = state.viviendas[idx];
            if (nameEl && item) nameEl.textContent = item.nombre || 'Vivienda';
            if (metaEl && item) {
              metaEl.textContent = (item.codigo ? item.codigo + ' · ' : '') +
                ViviendasSyncEngine.formatPrice(item.precio) +
                (item.estado === 'reservado' ? ' · Reservado' : '') +
                (item.estado === 'vendido' ? ' · Vendido' : '') +
                (item.publicado === false ? ' · oculto' : '');
            }
          }
          updateNavButtons();
        });
        if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number' || el.type === 'url')) {
          el.addEventListener('input', function () {
            persistFromDom(false);
            if (el.hasAttribute('data-vivienda-nombre')) {
              var nameEl = row.querySelector('.builder-menu-item-name');
              if (nameEl) nameEl.textContent = el.value || 'Vivienda';
            }
          });
        }
      });

      var pickBtn = row.querySelector('[data-vivienda-plan-pick]');
      var fileInput = row.querySelector('[data-vivienda-plan-file]');
      if (pickBtn && fileInput) {
        pickBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () {
          var file = fileInput.files && fileInput.files[0];
          if (!file) return;
          persistFromDom(false);
          var idx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
          var item = state.viviendas[idx];
          if (!item) return;
          ViviendasSyncEngine.setPendingPlanFile(item.localId, file);
          item.planFileName = file.name;
          item.planosModo = 'file';
          state.viviendas[idx] = ViviendasSyncEngine.normalizeItem(item);
          state.viviendaExpandedIdx = idx;
          saveState();
          renderStepContent();
          updateNavButtons();
        });
      }

      var removeBtn = row.querySelector('[data-vivienda-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          var idx = parseInt(row.getAttribute('data-vivienda-idx'), 10);
          persistFromDom(false);
          if (!state.viviendas[idx]) return;
          if (!confirm('¿Eliminar esta vivienda del showroom?')) return;
          var removed = state.viviendas[idx];
          if (removed && removed.localId) {
            ViviendasSyncEngine.setPendingPlanFile(removed.localId, null);
          }
          state.viviendas.splice(idx, 1);
          state.viviendaExpandedIdx = -1;
          saveState();
          renderStepContent();
          updateNavButtons();
          syncNow('Vivienda eliminada del showroom.');
        });
      }
    });

    var addBtn = rootEl.querySelector('#viviendaAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        persistFromDom(false);
        state.viviendas.push(ViviendasSyncEngine.emptyItem());
        state.viviendaExpandedIdx = state.viviendas.length - 1;
        saveState();
        addBtn.disabled = true;
        ViviendasSyncEngine.sync(state, { requireProject: true })
          .then(function (result) {
            if (!result) {
              throw new Error('Abre BOXIES AI desde el showroom (?proyecto=...) para guardar viviendas.');
            }
            saveState();
            AdminNotify.success('Vivienda guardada · ' + result.count + ' en el showroom. Recarga la web.');
          })
          .catch(function (err) {
            console.error('[Viviendas] sync', err);
            AdminNotify.error(err.message || 'Error guardando vivienda');
          })
          .finally(function () {
            renderStepContent();
            updateNavButtons();
          });
      });
    }
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
    if (field !== 'logo') return;
    if (!state.branding) state.branding = {};
    var logoStyle = 'avatar';
    try {
      logoStyle = await BrandingEngine.detectLogoStyle(file);
    } catch (e) {
      logoStyle = 'avatar';
    }
    state.branding.logo = {
      file: file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      logoStyle: logoStyle
    };
    state.branding.logoStyle = logoStyle;
    state.branding.logoCleared = false;
    if (state.branding.showHeroLogo == null) state.branding.showHeroLogo = true;
    state.branding.status = 'ready';
    state.branding.themeProposals = [];
    state.branding.selectedProposal = null;
    saveState();
    renderStepContent();
    AdminNotify.success(
      logoStyle === 'avatar'
        ? 'Logo listo. Sugerido: circular (puedes cambiarlo abajo).'
        : 'Logo listo. Sugerido: formato original (puedes cambiarlo abajo).'
    );
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

    /* Si el formulario Hero está montado, leer checkboxes aunque no sea el paso actual. */
    var showWaElAlways = rootEl && rootEl.querySelector('#heroShowWhatsappInput');
    var showShareElAlways = rootEl && rootEl.querySelector('#heroShowShareInput');
    if (showWaElAlways || showShareElAlways) {
      if (!state.heroContent) state.heroContent = {};
      if (showWaElAlways) state.heroContent.showWhatsapp = !!showWaElAlways.checked;
      if (showShareElAlways) state.heroContent.showShare = !!showShareElAlways.checked;
    }

    var brandShowEl = rootEl && rootEl.querySelector('#brandShowHeroLogo');
    if (brandShowEl) {
      if (!state.branding) state.branding = {};
      state.branding.showHeroLogo = !!brandShowEl.checked;
    }
    var brandStyleEl = rootEl && rootEl.querySelector('input[name="brandLogoStyle"]:checked');
    if (brandStyleEl) {
      if (!state.branding) state.branding = {};
      state.branding.logoStyle = brandStyleEl.value === 'avatar' ? 'avatar' : 'flat';
      if (state.branding.logo) state.branding.logo.logoStyle = state.branding.logoStyle;
    }

    if (state.currentStep === BuilderWizard.getStepIndex('video-hero')) {
      var nombreEl = rootEl && rootEl.querySelector('#heroNombreInput');
      var esloganEl = rootEl && rootEl.querySelector('#heroEsloganInput');
      var leftEl = rootEl && rootEl.querySelector('#heroBtnLeftInput');
      var rightEl = rootEl && rootEl.querySelector('#heroBtnRightInput');
      var waLinkEl = rootEl && rootEl.querySelector('#heroWhatsappLinkInput');
      var waMsgEl = rootEl && rootEl.querySelector('#heroWhatsappMsgInput');
      var shareEl = rootEl && rootEl.querySelector('#heroShareUrlInput');
      var showWaEl = rootEl && rootEl.querySelector('#heroShowWhatsappInput');
      var showShareEl = rootEl && rootEl.querySelector('#heroShowShareInput');
      state.heroContent = Object.assign({
        nombre: '',
        eslogan: '',
        botonIzquierdo: 'Explorar',
        botonDerecho: 'Iniciar',
        whatsappLink: '',
        whatsappMessage: '',
        shareUrl: '',
        showWhatsapp: true,
        showShare: true
      }, state.heroContent || {}, {
        nombre: nombreEl ? nombreEl.value : (state.heroContent && state.heroContent.nombre) || '',
        eslogan: esloganEl ? esloganEl.value : (state.heroContent && state.heroContent.eslogan) || '',
        botonIzquierdo: (leftEl ? leftEl.value : '') || 'Explorar',
        botonDerecho: (rightEl ? rightEl.value : '') || 'Iniciar',
        whatsappLink: waLinkEl ? waLinkEl.value : (state.heroContent && state.heroContent.whatsappLink) || '',
        whatsappMessage: waMsgEl ? waMsgEl.value : (state.heroContent && state.heroContent.whatsappMessage) || '',
        shareUrl: shareEl ? shareEl.value : (state.heroContent && state.heroContent.shareUrl) || '',
        showWhatsapp: showWaEl ? !!showWaEl.checked : state.heroContent.showWhatsapp !== false,
        showShare: showShareEl ? !!showShareEl.checked : state.heroContent.showShare !== false
      });
      if (state.heroContent.nombre) {
        state.projectInfo = Object.assign({}, state.projectInfo || {}, {
          nombre: state.heroContent.nombre
        });
      }
    }

    if (state.currentStep === BuilderWizard.getStepIndex('menu') && rootEl) {
      var mName = rootEl.querySelector('#menuProjectNameInput');
      var mDesc = rootEl.querySelector('#menuDescriptionInput');
      MenuSyncEngine.ensureMenuState(state);
      if (mName) state.menuConfig.projectName = mName.value;
      if (mDesc) state.menuConfig.description = mDesc.value;
      /* Forzar lectura de filas vía change path: re-dispatch no; se persiste en bind.
         Aquí solo cabecera; items ya van en state por bindMenuFields. */
    }

    saveState();

    var syncHero = HeroSyncEngine.sync(state);
    var syncMenu = typeof MenuSyncEngine !== 'undefined'
      ? MenuSyncEngine.sync(state)
      : Promise.resolve(null);
    var syncViviendas = typeof ViviendasSyncEngine !== 'undefined'
      ? ViviendasSyncEngine.sync(state)
      : Promise.resolve(null);

    Promise.all([syncHero, syncMenu, syncViviendas])
      .then(function (results) {
        var heroResult = results[0];
        var menuResult = results[1];
        var vivResult = results[2];
        if (heroResult || menuResult || vivResult) {
          saveState();
          var parts = [];
          if (heroResult) parts.push('hero');
          if (menuResult) parts.push('menú');
          if (vivResult) parts.push('viviendas');
          AdminNotify.success('Guardado. Actualizado: ' + parts.join(', ') + '.');
          updateNavButtons();
        } else if (MediaEngine.hasHeroMedia(state)) {
          AdminNotify.error('Abre Administrar desde el showroom del proyecto para sincronizar.');
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

  function syncStepUrl(stepId) {
    try {
      var url = new URL(window.location.href);
      var path = url.pathname || '';
      var inBoxies = /\/boxies/i.test(path) || url.searchParams.get('page') === 'builder';
      if (!inBoxies) return;
      if (stepId) url.searchParams.set('step', stepId);
      else url.searchParams.delete('step');
      window.history.replaceState(
        Object.assign({}, window.history.state || {}, { step: stepId || null }),
        '',
        url.pathname + url.search + url.hash
      );
    } catch (e) {}
  }

  function applyStepFromUrl() {
    try {
      var stepId = new URLSearchParams(window.location.search || '').get('step');
      if (!stepId) return;
      var idx = BuilderWizard.getStepIndex(stepId);
      if (idx >= 0) state.currentStep = idx;
    } catch (e) {}
  }

  function goToStep(index) {
    if (index < 0 || index >= BuilderWizard.STEPS.length) return;
    state.currentStep = index;
    saveState();
    var step = BuilderWizard.getStep(index);
    if (step && step.id === 'validation') {
      state.validation = ValidationEngine.validate(state);
    }
    if (step) syncStepUrl(step.id);
    renderAll();
  }

  function goToStepById(stepId) {
    var idx = BuilderWizard.getStepIndex(stepId);
    if (idx >= 0) goToStep(idx);
  }

  function updateNavButtons() {
    renderDock();
    renderProgressRail();
    updateHeaderActions();
  }

  function bindGlobalEvents() {
    var saveBtn = rootEl.querySelector('#builderSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);

    var publishBtn = rootEl.querySelector('#builderPublishBtn');
    if (publishBtn) publishBtn.addEventListener('click', handlePublish);

    var backInline = rootEl.querySelector('#builderBackInlineBtn');
    if (backInline) {
      backInline.addEventListener('click', function () {
        var urlSlug = null;
        try {
          urlSlug = new URLSearchParams(window.location.search || '').get('proyecto');
        } catch (e) {}
        var publishResultSlug = state && state.publishResult ? state.publishResult.slug : null;
        var projectInfoSlug = state && state.projectInfo ? state.projectInfo.slug : null;
        var draftProjectId = state ? state.draftProjectId : null;
        var activeProjectId = typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
          ? AdminState.getActiveProjectId()
          : null;

        var slug = null;
        try {
          slug = new URLSearchParams(window.location.search || '').get('proyecto');
        } catch (e2) {}
        /* Prefer the project bound for this editor session (same id), never a stale default */
        if (!slug && state && state.draftProjectId && state.publishResult &&
            state.publishResult.proyectoId === state.draftProjectId && state.publishResult.slug) {
          slug = state.publishResult.slug;
        }
        if (!slug && state && state.draftProjectId && state.projectInfo && state.projectInfo.slug) {
          slug = state.projectInfo.slug;
        }
        var finalUrl = typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl(slug)
          : (slug ? '/' + encodeURIComponent(slug) : '/');

        console.log('[SHOWROOM BUTTON]', {
          urlSlug: urlSlug,
          publishResultSlug: publishResultSlug,
          projectInfoSlug: projectInfoSlug,
          draftProjectId: draftProjectId,
          activeProjectId: activeProjectId,
          finalUrl: finalUrl
        });

        window.location.href = finalUrl;
      });
    }

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
      if (profile) {
        if (typeof PlatformRoles.isPlatformAdmin === 'function') {
          return PlatformRoles.isPlatformAdmin(profile);
        }
        return PlatformRoles.isAdmin(profile);
      }
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
    applyStepFromUrl();
    BuilderDock.applyBodyPadding();
    renderShell();
    rootEl.querySelector('#builderApp').hidden = false;

    try {
      await HeroSyncEngine.bindFromUrl(state);
      if (typeof MenuSyncEngine !== 'undefined') {
        await MenuSyncEngine.bindFromUrl(state);
      }
      if (typeof ViviendasSyncEngine !== 'undefined') {
        await ViviendasSyncEngine.bindFromUrl(state);
      }
      saveState();
    } catch (err) {
      console.warn('[Builder] bind project', err);
    }

    bindGlobalEvents();
    renderAll();
    var current = BuilderWizard.getStep(state.currentStep);
    if (current) syncStepUrl(current.id);
  }

  function onLeave() {
    saveState();
    BuilderDock.clearBodyPadding();
    /* Keep BOXIES workspace fullscreen across Proyectos ↔ Builder.
       Only exit fullscreen when leaving the BOXIES shell entirely. */
    var inBoxiesShell = document.body.classList.contains('boxies-shell')
      || (typeof BoxiesShell !== 'undefined'
        && typeof BoxiesShell.isMounted === 'function'
        && BoxiesShell.isMounted());
    if (!inBoxiesShell && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    rootEl = null;
  }

  return {
    render: render,
    onLeave: onLeave,
    goToStep: goToStep,
    goToStepById: goToStepById,
    getProjectLabel: function () {
      /* Single source: proyectos.nombre hydrated into projectInfo.nombre */
      if (!state || !state.projectInfo) return '';
      return state.projectInfo.nombre || '';
    }
  };
})();
