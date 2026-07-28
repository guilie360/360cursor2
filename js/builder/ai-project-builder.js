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
        var projectId = null;
        try {
          var params = new URLSearchParams(window.location.search || '');
          projectId = params.get('projectId') || params.get('proyectoId');
          slug = params.get('project') || params.get('proyecto');
        } catch (e1) {}
        var name = (state.projectInfo && state.projectInfo.nombre) || '';
        slug = (state.projectInfo && state.projectInfo.slug) || slug || '';
        projectId = state.draftProjectId || projectId || '';
        if (slug || name || projectId) {
          BoxiesShell.setProjectContext({
            id: projectId || '',
            name: name || slug,
            slug: slug || ''
          });
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

  function normalizeShowroomSlug(raw, options) {
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
    var s = normalizeShowroomSlug(slug);
    return s ? 'https://360preventa.com/' + s : 'https://360preventa.com/';
  }

  function renderConfig() {
    var info = state.projectInfo || {};
    var nombre = info.nombre || '';
    var slug = info.slug || '';
    var urlPreview = publicUrlDisplay(slug);
    return '<div class="builder-step-content">' +
      stepTitleHtml('Configuración') +
      '<p class="builder-step-desc">Identidad del Showroom. Fuente única de nombre y URL pública.</p>' +
      '<div class="builder-config-identity">' +
        '<h3 class="builder-config-identity__title">Identidad del Showroom</h3>' +
        '<div class="builder-field">' +
          '<label for="showroomNameInput">Nombre del Showroom</label>' +
          '<input type="text" id="showroomNameInput" maxlength="120" value="' + AdminUI.escapeHtml(nombre) + '" placeholder="Nombre del showroom" autocomplete="off">' +
        '</div>' +
        '<div class="builder-field">' +
          '<label for="showroomSlugInput">Slug</label>' +
          '<input type="text" id="showroomSlugInput" maxlength="60" value="' + AdminUI.escapeHtml(slug) + '" placeholder="mi-showroom" autocomplete="off" spellcheck="false" inputmode="latin">' +
          '<p class="builder-config-identity__slug-hint">Minúsculas, números y guiones. Máx. 60 caracteres.</p>' +
          '<p class="builder-config-identity__slug-check" id="showroomSlugCheck" aria-live="polite"></p>' +
        '</div>' +
        '<div class="builder-field">' +
          '<label>URL pública</label>' +
          '<div class="builder-config-identity__url" id="showroomPublicUrlPreview">' +
            AdminUI.escapeHtml(urlPreview) +
          '</div>' +
        '</div>' +
        '<p class="builder-config-identity__hint">Si cambias el slug, la URL anterior dejará de funcionar.</p>' +
        '<div class="builder-config-identity__actions">' +
          '<button type="button" class="builder-header-action-btn" id="showroomIdentitySaveBtn">Guardar cambios</button>' +
          '<span class="builder-config-identity__status" id="showroomIdentityStatus" aria-live="polite"></span>' +
        '</div>' +
      '</div></div>';
  }

  /** Collapsed-section summaries (V5.9.47) — presentational only. */
  function buildEstructuraSectionHints(e) {
    e = e || {};
    var hints = { dev: '', org: '', tipologias: '', zonas: '' };
    var typeMeta = (EstructuraEngine.DEVELOPMENT_TYPES || []).find(function (t) {
      return t.id === e.developmentType;
    });
    hints.dev = typeMeta ? typeMeta.label : (e.developmentType || '');

    function plural(n, one, many) {
      var v = EstructuraEngine.clampInt(n, 0, 100000, 0);
      return v + ' ' + (v === 1 ? one : many);
    }

    /* Viviendas: same V5.9.46 conceptualPhysicalUnits (no parallel formula). */
    if (e.developmentType === 'conjunto' && EstructuraEngine.syncConjuntoDerivedTotals) {
      EstructuraEngine.syncConjuntoDerivedTotals(e);
    }
    var housing = EstructuraEngine.conceptualPhysicalUnits
      ? EstructuraEngine.conceptualPhysicalUnits(e)
      : 0;
    /* Mixto + casas: engine only counts edificios; add casas from totalViviendas. */
    if (e.developmentType === 'mixto' && e.mixto && e.mixto.casas) {
      housing += EstructuraEngine.clampInt(e.totalViviendas, 0, 50000, 0);
    }
    if (housing > 0) hints.org = plural(housing, 'vivienda', 'viviendas');

    var tipCount = (e.tipologias && e.tipologias.length) || 0;
    if (tipCount > 0) hints.tipologias = plural(tipCount, 'tipología', 'tipologías');

    var amenCount = (e.zoneNames && e.zoneNames.length) || 0;
    if (amenCount > 0) hints.zonas = plural(amenCount, 'amenidad', 'amenidades');

    return hints;
  }

  function buildAssignmentBalanceHtml(e) {
    if (!EstructuraEngine.assignmentBalance) return '';
    var bal = EstructuraEngine.assignmentBalance(e);
    if (!bal.buckets.length) {
      return '<div class="builder-estructura-assign-balance is-empty" data-estructura-assign-balance>' +
        '<p class="builder-estructura-section__note">Define la capacidad espacial arriba para distribuir tipologías.</p>' +
      '</div>';
    }
    var hasSignal = bal.buckets.some(function (b) {
      return b.capacity > 0 || b.assigned > 0;
    });
    if (!hasSignal) {
      return '<div class="builder-estructura-assign-balance is-empty" data-estructura-assign-balance>' +
        '<p class="builder-estructura-section__note">Indica cantidades en la configuración espacial para asignar tipologías.</p>' +
      '</div>';
    }
    var statusClass = bal.ok ? 'is-ok' : 'is-pending';
    var rows = bal.buckets.map(function (b) {
      if (b.capacity <= 0 && b.assigned <= 0) return '';
      var status =
        b.excess > 0 ? ('+' + b.excess + ' de más') :
        (b.remaining > 0 ? (b.remaining + ' pendientes') : 'completo');
      var rowClass =
        b.excess > 0 ? 'is-over' :
        (b.remaining > 0 ? 'is-under' : 'is-full');
      return '<div class="builder-estructura-assign-balance__row ' + rowClass + '">' +
        '<span class="builder-estructura-assign-balance__label">' +
          AdminUI.escapeHtml(b.label) +
        '</span>' +
        '<span class="builder-estructura-assign-balance__nums">' +
          AdminUI.escapeHtml(String(b.assigned)) + ' / ' +
          AdminUI.escapeHtml(String(b.capacity)) +
        '</span>' +
        '<span class="builder-estructura-assign-balance__status">' +
          AdminUI.escapeHtml(status) +
        '</span>' +
      '</div>';
    }).filter(Boolean).join('');
    return '<div class="builder-estructura-assign-balance ' + statusClass +
      '" data-estructura-assign-balance>' +
      '<div class="builder-estructura-sublabel">Distribución de tipologías</div>' +
      rows +
    '</div>';
  }

  function buildTipologiaAssignHtml(e, tip) {
    if (!EstructuraEngine.bucketsForTipologia) return '';
    var buckets = EstructuraEngine.bucketsForTipologia(e, tip);
    if (!buckets.length) {
      return '<p class="builder-estructura-section__note">' +
        (e.developmentType === 'mixto' && !tip.componente
          ? 'Selecciona el componente para asignar cantidades.'
          : 'Sin contenedores de capacidad para asignar.') +
      '</p>';
    }
    var rows = buckets.map(function (b) {
      var qty = EstructuraEngine.getTipAssigned(tip, b.id);
      return '<div class="builder-estructura-row builder-estructura-assign-row">' +
        '<span class="builder-estructura-row__label">' +
          AdminUI.escapeHtml(b.label) +
          '<span class="builder-estructura-assign-row__cap"> · cupo ' +
            AdminUI.escapeHtml(String(b.capacity)) +
          '</span>' +
        '</span>' +
        stepperHtmlForAssign('t.assign.' + b.id, qty, 0, 100000) +
      '</div>';
    }).join('');
    return '<div class="builder-estructura-assign-block">' +
      '<div class="builder-estructura-sublabel">Cantidades por nivel</div>' +
      rows +
    '</div>';
  }

  /* Stepper helper used before renderEstructura's local stepperHtml exists */
  function stepperHtmlForAssign(field, value, min, max) {
    min = min != null ? min : 0;
    max = max != null ? max : 99999;
    return '<div class="builder-estructura-stepper" data-stepper="' + field + '"' +
      ' data-min="' + min + '" data-max="' + max + '">' +
      '<button type="button" class="builder-estructura-stepper__btn" data-step="-1" aria-label="Menos">−</button>' +
      '<input type="number" class="builder-estructura-stepper__input" inputmode="numeric" ' +
        'data-stepper-input value="' + AdminUI.escapeHtml(String(value)) + '" ' +
        'min="' + min + '" max="' + max + '" step="1">' +
      '<button type="button" class="builder-estructura-stepper__btn" data-step="1" aria-label="Más">+</button>' +
    '</div>';
  }

  function buildEstructuraResumenHtml(e) {
    e = e || {};
    var esc = AdminUI.escapeHtml;
    var dt = e.developmentType || '';
    var typeMeta = (EstructuraEngine.DEVELOPMENT_TYPES || []).find(function (t) {
      return t.id === dt;
    });
    var typeLabel = typeMeta ? typeMeta.label : dt;
    var sections = [];

    function section(title, inner) {
      if (!inner) return;
      sections.push(
        '<section class="builder-estructura-resumen__section">' +
          '<div class="builder-estructura-resumen__label">' + esc(title) + '</div>' +
          '<div class="builder-estructura-resumen__content">' + inner + '</div>' +
        '</section>'
      );
    }

    function productLabel(id) {
      return EstructuraEngine.productLabel
        ? (EstructuraEngine.productLabel(id) || id || '')
        : (id || '');
    }

    function formatQty(n) {
      return String(EstructuraEngine.clampInt(n, 0, 100000, 0));
    }

    function hasNum(v) {
      return v != null && v !== '' && !isNaN(Number(v)) && Number(v) > 0;
    }

    function tipMetaParts(tip) {
      var parts = [];
      if (hasNum(tip.area_m2)) parts.push(Number(tip.area_m2) + ' m²');
      if (hasNum(tip.area_privada_m2)) parts.push(Number(tip.area_privada_m2) + ' m² privada');
      if (hasNum(tip.area_lote_m2)) parts.push(Number(tip.area_lote_m2) + ' m² lote');
      if (tip.habitaciones != null && Number(tip.habitaciones) > 0) {
        parts.push(Number(tip.habitaciones) + ' hab');
      }
      if (tip.banos != null && Number(tip.banos) > 0) {
        var nB = Number(tip.banos);
        parts.push(nB + (nB === 1 ? ' baño' : ' baños'));
      }
      if (tip.parqueaderos != null && Number(tip.parqueaderos) > 0) {
        var nP = Number(tip.parqueaderos);
        parts.push(nP + (nP === 1 ? ' parqueadero' : ' parqueaderos'));
      }
      if (tip.plantas_internas != null && Number(tip.plantas_internas) > 0) {
        var nPl = Number(tip.plantas_internas);
        parts.push(nPl + (nPl === 1 ? ' planta' : ' plantas'));
      }
      if (hasNum(tip.precio)) {
        parts.push('desde ' + Number(tip.precio).toLocaleString('es-CO'));
      }
      return parts;
    }

    function tipAmbientesHtml(tip) {
      var lines = [];
      (tip.plantas || []).forEach(function (pl) {
        var names = (tip.ambientes || [])
          .filter(function (a) { return a.plantaLocalId === pl.localId; })
          .map(function (a) { return a.nombre; })
          .filter(Boolean);
        if (names.length) {
          lines.push(esc(pl.nombre || 'Planta') + ': ' + esc(names.join(', ')));
        }
      });
      var ext = (tip.ambientes || [])
        .filter(function (a) { return !a.plantaLocalId; })
        .map(function (a) { return a.nombre; })
        .filter(Boolean);
      if (ext.length) lines.push('Exterior: ' + esc(ext.join(', ')));
      if (!lines.length) return '';
      return '<div class="builder-estructura-resumen__sub">' + lines.join(' · ') + '</div>';
    }

    function conjuntoCompLabel(c) {
      if (EstructuraEngine.isConjuntoEdificioComponent &&
          EstructuraEngine.isConjuntoEdificioComponent(c)) {
        return String(c.nombre || '').trim() || 'Edificio';
      }
      if (EstructuraEngine.isConjuntoResidentialComponent &&
          EstructuraEngine.isConjuntoResidentialComponent(c)) {
        return productLabel(c.producto) || 'Residencial';
      }
      var meta = EstructuraEngine.conjuntoComponentTypeMeta
        ? EstructuraEngine.conjuntoComponentTypeMeta(c.type)
        : null;
      var base = meta ? meta.label : (c.type || 'Componente');
      var name = String(c.nombre || '').trim();
      if (name && name.toLowerCase() !== String(base).toLowerCase()) {
        return base + ' · ' + name;
      }
      return base;
    }

    function compactRow(left, right) {
      return '<div class="builder-estructura-resumen__row">' +
        '<span class="builder-estructura-resumen__row-label">' + esc(left) + '</span>' +
        '<span class="builder-estructura-resumen__row-value">' + esc(right) + '</span>' +
      '</div>';
    }

    function componentsListHtml(list) {
      if (!list || !list.length) return '';
      return list.map(function (c) {
        var qty = EstructuraEngine.conjuntoComponentHousingUnits
          ? EstructuraEngine.conjuntoComponentHousingUnits(c)
          : EstructuraEngine.clampInt(c.cantidad, 0, 100000, 0);
        if (!qty) qty = EstructuraEngine.clampInt(c.cantidad, 0, 100000, 0);
        return compactRow(conjuntoCompLabel(c), formatQty(qty));
      }).join('');
    }

    /* ── Cabecera compacta ── */
    var headerBits = [];
    if (dt === 'unidad') {
      headerBits.push(e.unidadHousingType === 'apartamento' ? 'Apartamento' : 'Casa');
      if (e.unidadCount != null) {
        var uc = Number(e.unidadCount) || 0;
        headerBits.push(uc + (uc === 1 ? ' unidad' : ' unidades'));
      }
    } else if (dt === 'edificio') {
      headerBits.push(e.edificioMode === 'multiples' ? 'Múltiples torres' : 'Edificio único');
      if (e.buildings && e.buildings.length) {
        var nb = e.buildings.length;
        headerBits.push(nb + (nb === 1 ? ' torre' : ' torres'));
      }
    } else if (dt === 'conjunto') {
      EstructuraEngine.ensureConjuntoConfig(e);
      var cfg = e.conjuntoConfig || {};
      headerBits.push(cfg.useStages ? 'Por etapas' : 'Sin etapas');
      if (e.totalViviendas != null && Number(e.totalViviendas) > 0) {
        headerBits.push(formatQty(e.totalViviendas) + ' viviendas');
      }
      if (cfg.useStages && cfg.stages && cfg.stages.length) {
        var ns = cfg.stages.length;
        headerBits.push(ns + (ns === 1 ? ' etapa' : ' etapas'));
      }
    } else if (dt === 'lotes') {
      headerBits.push(e.lotesSubtype === 'campestre' ? 'Parcelación campestre' : 'Loteo urbano');
      if (e.totalLotes != null && Number(e.totalLotes) > 0) {
        headerBits.push(formatQty(e.totalLotes) + ' lotes');
      }
      var levels = [];
      if (e.orgSectores) levels.push('Sectores');
      if (e.orgManzanas) levels.push('Manzanas');
      if (e.orgEtapas) levels.push('Etapas');
      if (levels.length) headerBits.push(levels.join(' · '));
    } else if (dt === 'mixto') {
      var m = e.mixto || {};
      var comps = [];
      if (m.edificios) comps.push('Edificios');
      if (m.casas) comps.push('Casas');
      if (m.lotes) comps.push('Lotes');
      if (comps.length) headerBits.push(comps.join(' · '));
      if (m.casas && e.totalViviendas != null && Number(e.totalViviendas) > 0) {
        headerBits.push(formatQty(e.totalViviendas) + ' viviendas');
      }
      if (m.lotes && e.totalLotes != null && Number(e.totalLotes) > 0) {
        headerBits.push(formatQty(e.totalLotes) + ' lotes');
      }
    }

    var headerHtml = '';
    if (typeLabel || headerBits.length) {
      headerHtml =
        '<header class="builder-estructura-resumen__header">' +
          (typeLabel
            ? '<div class="builder-estructura-resumen__header-type">' + esc(typeLabel) + '</div>'
            : '') +
          (headerBits.length
            ? '<div class="builder-estructura-resumen__header-meta">' +
                esc(headerBits.join(' · ')) +
              '</div>'
            : '') +
        '</header>';
    }

    /* ── Estructura / Componentes ── */
    var structParts = [];

    if ((dt === 'edificio' || (dt === 'mixto' && e.mixto && e.mixto.edificios)) &&
        e.buildings && e.buildings.length) {
      structParts.push(
        '<div class="builder-estructura-resumen__group">' +
          '<div class="builder-estructura-resumen__group-title">Edificios / Torres</div>' +
          e.buildings.map(function (b) {
            var bits = [];
            if (b.pisos != null) bits.push(formatQty(b.pisos) + ' pisos');
            if (b.sotanos != null && Number(b.sotanos) > 0) {
              bits.push(formatQty(b.sotanos) + ' sótanos');
            }
            if (b.unidadesPorPiso != null) bits.push(formatQty(b.unidadesPorPiso) + ' u/piso');
            if (b.rooftop) bits.push('Azotea');
            return compactRow(b.nombre || 'Edificio', bits.join(' · ') || '—');
          }).join('') +
        '</div>'
      );
    }

    if (dt === 'conjunto') {
      EstructuraEngine.ensureConjuntoConfig(e);
      var cj = e.conjuntoConfig || {};
      if (cj.useStages && cj.stages && cj.stages.length) {
        cj.stages.forEach(function (st) {
          var compsHtml = componentsListHtml(st.components);
          if (!compsHtml) return;
          structParts.push(
            '<div class="builder-estructura-resumen__group">' +
              '<div class="builder-estructura-resumen__group-title">' +
                esc(st.nombre || 'Etapa') +
              '</div>' +
              compsHtml +
            '</div>'
          );
        });
      } else if (cj.components && cj.components.length) {
        structParts.push(
          '<div class="builder-estructura-resumen__group">' +
            componentsListHtml(cj.components) +
          '</div>'
        );
      }
    }

    if (dt === 'mixto' && e.mixto) {
      if (e.mixto.casas && e.totalViviendas != null && Number(e.totalViviendas) > 0) {
        structParts.push(
          '<div class="builder-estructura-resumen__group">' +
            compactRow('Casas', formatQty(e.totalViviendas)) +
          '</div>'
        );
      }
      if (e.mixto.lotes && e.totalLotes != null && Number(e.totalLotes) > 0) {
        structParts.push(
          '<div class="builder-estructura-resumen__group">' +
            compactRow('Lotes', formatQty(e.totalLotes)) +
          '</div>'
        );
      }
    }

    if (structParts.length) {
      section('Estructura', structParts.join(''));
    }

    /* ── Tipologías (fila compacta por tipología) ── */
    if (e.tipologias && e.tipologias.length) {
      var tipsInner = e.tipologias.map(function (tip) {
        var prod = tip.producto ? productLabel(tip.producto) : '';
        var modelo = String(tip.modelo || '').trim();
        var title = [prod, modelo].filter(Boolean).join(' · ');
        if (!title) title = tip.nombre || 'Tipología';
        var qty = EstructuraEngine.getTipAssigned
          ? EstructuraEngine.getTipAssigned(tip)
          : 0;
        if (qty > 0) title += ' · ' + qty + (qty === 1 ? ' unidad' : ' unidades');
        var meta = tipMetaParts(tip).join(' · ');
        var amb = tipAmbientesHtml(tip);
        if (!meta && !amb && !title) return '';
        return '<div class="builder-estructura-resumen__tip">' +
          '<div class="builder-estructura-resumen__tip-title">' + esc(title) + '</div>' +
          (meta
            ? '<div class="builder-estructura-resumen__tip-meta">' + esc(meta) + '</div>'
            : '') +
          amb +
        '</div>';
      }).filter(Boolean).join('');
      if (tipsInner) section('Tipologías', tipsInner);
    }

    if (EstructuraEngine.assignmentBalance) {
      var bal = EstructuraEngine.assignmentBalance(e);
      var balRows = (bal.buckets || []).filter(function (b) {
        return b.capacity > 0 || b.assigned > 0;
      }).map(function (b) {
        var status =
          b.excess > 0 ? ('+' + b.excess + ' de más') :
          (b.remaining > 0 ? (b.remaining + ' pendientes') : 'completo');
        return compactRow(b.label, b.assigned + ' / ' + b.capacity + ' · ' + status);
      }).join('');
      if (balRows) section('Distribución', balRows);
    }

    /* ── Amenidades ── */
    if (e.zoneNames && e.zoneNames.length) {
      var chips = e.zoneNames.map(function (name) {
        return '<span class="ws-ms__chip builder-estructura-resumen__chip">' +
          '<span class="ws-ms__chip-label">' + esc(name) + '</span>' +
        '</span>';
      }).join('');
      section('Amenidades', '<div class="builder-estructura-resumen__chips">' + chips + '</div>');
    }

    if (!headerHtml && !sections.length) {
      return '<p class="builder-estructura-section__note">Completa la estructura del proyecto para ver el resumen.</p>';
    }

    return '<div class="builder-estructura-resumen">' +
      '<div class="builder-estructura-resumen__card">' +
        headerHtml +
        (sections.length
          ? '<div class="builder-estructura-resumen__stack">' + sections.join('') + '</div>'
          : '') +
      '</div>' +
    '</div>';
  }

  function renderEstructura() {
    var e = EstructuraEngine.ensureState(state);
    var dt = e.developmentType;

    /* Keep expand-all coherent after type switches (Unidad ↔ Edificio ↔ …). */
    if (e.uiExpandAll) {
      if (!e.openPanels) e.openPanels = {};
      ['dev', 'org', 'tipologias', 'zonas', 'resumen'].forEach(function (key) {
        e.openPanels[key] = true;
      });
      (e.buildings || []).forEach(function (b) { b.open = true; });
      (e.tipologias || []).forEach(function (tip) {
        tip.open = true;
        (tip.plantas || []).forEach(function (pl) { pl.open = true; });
      });
      if (e.conjuntoConfig) {
        (e.conjuntoConfig.stages || []).forEach(function (st) { st.open = true; });
      }
    }

    function stepperHtml(field, value, min, max) {
      min = min != null ? min : 0;
      max = max != null ? max : 99999;
      return '<div class="builder-estructura-stepper" data-stepper="' + field + '"' +
        ' data-min="' + min + '" data-max="' + max + '">' +
        '<button type="button" class="builder-estructura-stepper__btn" data-step="-1" aria-label="Menos">−</button>' +
        '<input type="number" class="builder-estructura-stepper__input" inputmode="numeric" ' +
          'data-stepper-input value="' + AdminUI.escapeHtml(String(value)) + '" ' +
          'min="' + min + '" max="' + max + '" step="1">' +
        '<button type="button" class="builder-estructura-stepper__btn" data-step="1" aria-label="Más">+</button>' +
      '</div>';
    }

    function buildingAccHtml(b, bi, multi) {
      return '<details class="builder-estructura-acc builder-estructura-acc--building" data-building="' +
        AdminUI.escapeHtml(b.localId) + '"' + (b.open ? ' open' : '') + '>' +
        '<summary><span class="builder-estructura-acc__title" data-building-title>' +
          AdminUI.escapeHtml(b.nombre || ('Torre ' + (bi + 1))) +
        '</span></summary>' +
        '<div class="builder-estructura-acc__body builder-estructura-building-body">' +
          '<div class="builder-field">' +
            '<label>Nombre</label>' +
            '<input type="text" data-b-field="nombre" value="' + AdminUI.escapeHtml(b.nombre || '') + '">' +
          '</div>' +
          '<div class="builder-estructura-grid2">' +
            '<div class="ws-field-unit builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Pisos</span>' +
              stepperHtml('b.pisos', b.pisos, 1, 200) +
            '</div>' +
            '<div class="ws-field-unit builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Sótanos</span>' +
              stepperHtml('b.sotanos', b.sotanos, 0, 20) +
            '</div>' +
            '<label class="ws-field-unit builder-check-row builder-check-row--ws">' +
              '<input type="checkbox" data-b-field="rooftop"' + (b.rooftop ? ' checked' : '') + '>' +
              '<span>Azotea / Rooftop</span>' +
            '</label>' +
            '<div class="ws-field-unit builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Unidades por piso</span>' +
              stepperHtml('b.unidadesPorPiso', b.unidadesPorPiso, 1, 40) +
            '</div>' +
          '</div>' +
          '<label class="builder-check-row builder-check-row--ws">' +
            '<input type="checkbox" data-estructura-field="repeatFloorDistribution"' +
              (e.repeatFloorDistribution !== false ? ' checked' : '') + '>' +
            '<span>Repetir distribución en todos los pisos</span>' +
          '</label>' +
          (multi
            ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-copy-building="' +
                AdminUI.escapeHtml(b.localId) + '">Copiar configuración a otras torres</button>'
            : '') +
        '</div></details>';
    }

    /* Reusable WS flags multiselect (same surface as Zonas / Amenidades) */
    function flagsMsHtml(cfg) {
      var selected = (cfg.options || []).filter(function (o) { return o.on; });
      var n = selected.length;
      var trigger = n > 0
        ? (typeof cfg.countTrigger === 'function' ? cfg.countTrigger(n) : cfg.countTrigger)
        : cfg.emptyTrigger;
      var optionsHtml = (cfg.options || []).map(function (o) {
        return '<label class="ws-ms__opt">' +
          '<input type="checkbox" ' + cfg.pickAttr + '="' + AdminUI.escapeHtml(o.key) + '"' +
            (o.on ? ' checked' : '') + '>' +
          '<span>' + AdminUI.escapeHtml(o.label) + '</span></label>';
      }).join('');
      var chipsHtml = selected.map(function (o) {
        return '<span class="ws-ms__chip">' +
          '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(o.label) + '</span>' +
          '<button type="button" class="ws-ms__chip-remove" ' + cfg.chipAttr + '="' +
            AdminUI.escapeHtml(o.key) + '" aria-label="Quitar ' +
            AdminUI.escapeHtml(o.label) + '">×</button>' +
        '</span>';
      }).join('');
      return (cfg.sectionLabel
          ? '<div class="builder-estructura-sublabel">' + AdminUI.escapeHtml(cfg.sectionLabel) + '</div>'
          : '') +
        '<div class="ws-ms ws-ms--block" data-ws-ms ' + cfg.pickerAttr + '>' +
          '<button type="button" class="ws-select__trigger" ' + cfg.openAttr +
            ' aria-haspopup="listbox" aria-expanded="false">' +
            '<span class="ws-select__value" ' + cfg.labelAttr + '>' + AdminUI.escapeHtml(trigger) + '</span>' +
            '<span class="ws-select__chevron" aria-hidden="true"></span>' +
          '</button>' +
          '<div class="ws-ms__panel" hidden ' + cfg.panelAttr + '>' +
            (cfg.groupTitle
              ? '<div class="ws-ms__group"><div class="ws-ms__group-title">' +
                  AdminUI.escapeHtml(cfg.groupTitle) + '</div><div class="ws-ms__options">' +
                  optionsHtml + '</div></div>'
              : '<div class="ws-ms__options">' + optionsHtml + '</div>') +
          '</div>' +
          '<div class="ws-ms__summary" ' + cfg.summaryAttr + '>' + chipsHtml + '</div>' +
        '</div>';
    }

    function orgLevelsHtml() {
      return flagsMsHtml({
        sectionLabel: 'Organización interna',
        pickerAttr: 'data-org-levels-picker',
        openAttr: 'data-org-levels-open',
        panelAttr: 'data-org-levels-panel',
        labelAttr: 'data-org-levels-label',
        summaryAttr: 'data-org-levels-summary',
        pickAttr: 'data-org-level-pick',
        chipAttr: 'data-org-level-chip-remove',
        emptyTrigger: 'Seleccionar organización',
        countTrigger: function (n) {
          return 'Organización · ' + n + ' seleccionada' + (n === 1 ? '' : 's');
        },
        groupTitle: 'Organización',
        options: [
          { key: 'orgEtapas', label: 'Etapas / Fases', on: !!e.orgEtapas },
          { key: 'orgSectores', label: 'Sectores', on: !!e.orgSectores },
          { key: 'orgManzanas', label: 'Manzanas / Clústeres', on: !!e.orgManzanas }
        ]
      });
    }

    function mixtoCompsHtml() {
      var m = e.mixto || {};
      return flagsMsHtml({
        sectionLabel: 'Componentes',
        pickerAttr: 'data-mixto-comps-picker',
        openAttr: 'data-mixto-comps-open',
        panelAttr: 'data-mixto-comps-panel',
        labelAttr: 'data-mixto-comps-label',
        summaryAttr: 'data-mixto-comps-summary',
        pickAttr: 'data-mixto-comp-pick',
        chipAttr: 'data-mixto-comp-chip-remove',
        emptyTrigger: 'Seleccionar componentes',
        countTrigger: function (n) {
          return 'Componentes · ' + n + ' seleccionado' + (n === 1 ? '' : 's');
        },
        groupTitle: 'Componentes',
        options: [
          { key: 'edificios', label: 'Edificios / Torres', on: !!m.edificios },
          { key: 'casas', label: 'Casas', on: !!m.casas },
          { key: 'lotes', label: 'Lotes', on: !!m.lotes }
        ]
      });
    }

    function conjuntoComponentRowHtml(comp, stageLocalId) {
      var residential = EstructuraEngine.isConjuntoResidentialComponent
        ? EstructuraEngine.isConjuntoResidentialComponent(comp)
        : (comp && comp.kind === 'residencial');
      var isEdificio = EstructuraEngine.isConjuntoEdificioComponent
        ? EstructuraEngine.isConjuntoEdificioComponent(comp)
        : (comp && comp.type === 'edificio');
      var typeLabel = residential
        ? (EstructuraEngine.productLabel
          ? EstructuraEngine.productLabel(comp.producto)
          : (comp.producto || 'Residencial'))
        : (function () {
            var meta = EstructuraEngine.conjuntoComponentTypeMeta(comp.type);
            return meta ? meta.label : (comp.type || 'Componente');
          })();
      var stageAttr = stageLocalId
        ? ' data-cj-stage="' + AdminUI.escapeHtml(stageLocalId) + '"'
        : '';
      var body;
      if (isEdificio) {
        var mode = comp.edificioMode === 'individual' ? 'individual' : 'uniforme';
        var cap = EstructuraEngine.conjuntoEdificioCapacity
          ? EstructuraEngine.conjuntoEdificioCapacity(comp)
          : 0;
        var towersHtml = '';
        if (mode === 'individual') {
          towersHtml =
            '<div class="builder-estructura-sublabel">Torres</div>' +
            ((comp.towers || []).map(function (tw, ti) {
              return '<details class="builder-estructura-acc builder-estructura-acc--nested" data-cj-tower="' +
                AdminUI.escapeHtml(tw.localId) + '"' + (tw.open ? ' open' : '') + '>' +
                '<summary><span data-cj-tower-title>' +
                  AdminUI.escapeHtml(tw.nombre || ('Torre ' + (ti + 1))) +
                '</span></summary>' +
                '<div class="builder-estructura-acc__body">' +
                  '<div class="builder-field">' +
                    '<label>Nombre</label>' +
                    '<input type="text" data-cj-tower-nombre value="' +
                      AdminUI.escapeHtml(tw.nombre || '') + '">' +
                  '</div>' +
                  '<div class="builder-estructura-grid2">' +
                    '<div class="ws-field-unit builder-estructura-row">' +
                      '<span class="builder-estructura-row__label">Pisos</span>' +
                      stepperHtml('cj.tw.pisos', tw.pisos || 5, 1, 200) +
                    '</div>' +
                    '<div class="ws-field-unit builder-estructura-row">' +
                      '<span class="builder-estructura-row__label">Unidades / piso</span>' +
                      stepperHtml('cj.tw.unidadesPorPiso', tw.unidadesPorPiso || 4, 1, 100) +
                    '</div>' +
                  '</div>' +
                  '<button type="button" class="builder-header-action-btn is-danger boxies-btn-secondary" data-cj-tower-remove="' +
                    AdminUI.escapeHtml(tw.localId) + '">Quitar torre</button>' +
                '</div></details>';
            }).join('') || '<p class="builder-estructura-section__note">Sin torres.</p>') +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-cj-tower-add>' +
              '+ Añadir torre</button>';
        }
        body =
          '<div class="builder-field">' +
            '<label>Nombre</label>' +
            '<input type="text" data-cj-comp-nombre value="' + AdminUI.escapeHtml(comp.nombre || '') + '">' +
          '</div>' +
          '<div class="builder-estructura-chips">' +
            '<label class="builder-estructura-chip' + (mode === 'uniforme' ? ' is-on' : '') + '">' +
              '<input type="radio" name="cjEdifMode-' + AdminUI.escapeHtml(comp.localId) +
                '" data-cj-edificio-mode="uniforme"' + (mode === 'uniforme' ? ' checked' : '') + '>' +
              '<span>Configuración uniforme</span></label>' +
            '<label class="builder-estructura-chip' + (mode === 'individual' ? ' is-on' : '') + '">' +
              '<input type="radio" name="cjEdifMode-' + AdminUI.escapeHtml(comp.localId) +
                '" data-cj-edificio-mode="individual"' + (mode === 'individual' ? ' checked' : '') + '>' +
              '<span>Torres individuales</span></label>' +
          '</div>' +
          (mode === 'uniforme'
            ? ('<div class="builder-estructura-grid2">' +
                '<div class="ws-field-unit builder-estructura-row">' +
                  '<span class="builder-estructura-row__label">Cantidad de torres</span>' +
                  stepperHtml('cj.cantidad', comp.cantidad || 1, 1, 50) +
                '</div>' +
                '<div class="ws-field-unit builder-estructura-row">' +
                  '<span class="builder-estructura-row__label">Pisos</span>' +
                  stepperHtml('cj.pisos', comp.pisos || 5, 1, 200) +
                '</div>' +
                '<div class="ws-field-unit builder-estructura-row">' +
                  '<span class="builder-estructura-row__label">Unidades / piso</span>' +
                  stepperHtml('cj.unidadesPorPiso', comp.unidadesPorPiso || 4, 1, 100) +
                '</div>' +
              '</div>')
            : towersHtml) +
          '<div class="builder-estructura-row" style="margin-top:8px">' +
            '<span class="builder-estructura-row__label">Viviendas del componente</span>' +
            '<span class="builder-estructura-row__value" data-cj-comp-cap>' +
              AdminUI.escapeHtml(String(cap)) +
            '</span>' +
          '</div>';
      } else if (residential) {
        body =
          '<div class="ws-field-unit builder-estructura-row">' +
            '<span class="builder-estructura-row__label">Cantidad</span>' +
            stepperHtml('cj.cantidad', comp.cantidad || 1, 1, 100000) +
          '</div>';
      } else {
        body =
          '<div class="builder-estructura-grid2">' +
            '<div class="builder-field">' +
              '<label>Nombre</label>' +
              '<input type="text" data-cj-comp-nombre value="' + AdminUI.escapeHtml(comp.nombre || '') + '">' +
            '</div>' +
            '<div class="ws-field-unit builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Cantidad</span>' +
              stepperHtml('cj.cantidad', comp.cantidad || 1, 1, 100000) +
            '</div>' +
          '</div>';
      }
      return '<div class="builder-conjunto-comp" data-cj-comp="' + AdminUI.escapeHtml(comp.localId) + '"' +
        stageAttr + '>' +
        '<div class="builder-conjunto-comp__head">' +
          '<span class="builder-conjunto-comp__type">' + AdminUI.escapeHtml(typeLabel) + '</span>' +
          '<button type="button" class="builder-menu-icon-btn" data-cj-comp-remove title="Quitar">×</button>' +
        '</div>' +
        body +
      '</div>';
    }

    function conjuntoAddCompPickerHtml(stageLocalId) {
      var stageAttr = stageLocalId
        ? ' data-cj-stage="' + AdminUI.escapeHtml(stageLocalId) + '"'
        : '';
      var products = EstructuraEngine.PRODUCTS || {};
      var residentialOpts = []
        .concat(products.casa || [])
        .concat(products.apartamento || [])
        .map(function (p) {
          return '<button type="button" class="ws-ms__opt" data-cj-add-type="' +
            AdminUI.escapeHtml(p.id) + '">' + AdminUI.escapeHtml(p.label) + '</button>';
        }).join('');
      residentialOpts +=
        '<button type="button" class="ws-ms__opt" data-cj-add-type="edificio">Edificio / Torres</button>';
      var physicalOpts = [
        { id: 'lotes', label: 'Lotes' },
        { id: 'comercio', label: 'Comercio' },
        { id: 'oficinas', label: 'Oficinas' },
        { id: 'otro', label: 'Otro' }
      ].map(function (t) {
        return '<button type="button" class="ws-ms__opt" data-cj-add-type="' +
          AdminUI.escapeHtml(t.id) + '">' + AdminUI.escapeHtml(t.label) + '</button>';
      }).join('');
      return '<div class="ws-ms" data-ws-ms data-cj-comp-picker' + stageAttr + '>' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-cj-comp-picker-open>' +
          '+ Añadir componente</button>' +
        '<div class="ws-ms__panel" hidden data-cj-comp-panel>' +
          '<div class="ws-ms__group">' +
            '<div class="ws-ms__group-title">Residencial</div>' +
            '<div class="ws-ms__options">' + residentialOpts + '</div>' +
          '</div>' +
          '<div class="ws-ms__group">' +
            '<div class="ws-ms__group-title">Otros</div>' +
            '<div class="ws-ms__options">' + physicalOpts + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function conjuntoComponentsBlockHtml(components, stageLocalId) {
      var list = (components || []).map(function (c) {
        return conjuntoComponentRowHtml(c, stageLocalId);
      }).join('');
      return '<div class="builder-estructura-sublabel">Componentes</div>' +
        (list || '<p class="builder-estructura-section__note">Ningún componente todavía.</p>') +
        conjuntoAddCompPickerHtml(stageLocalId || '');
    }

    function conjuntoOrgHtml() {
      EstructuraEngine.ensureConjuntoConfig(e);
      var cfg = e.conjuntoConfig || EstructuraEngine.emptyConjuntoConfig(!!e.orgEtapas);
      var useStages = !!cfg.useStages;
      var html =
        '<div class="builder-estructura-sublabel">Organización</div>' +
        '<div class="builder-estructura-chips">' +
          '<label class="builder-estructura-chip' + (!useStages ? ' is-on' : '') + '">' +
            '<input type="radio" name="conjuntoOrgMode" data-cj-use-stages="0"' +
              (!useStages ? ' checked' : '') + '><span>Sin etapas</span></label>' +
          '<label class="builder-estructura-chip' + (useStages ? ' is-on' : '') + '">' +
            '<input type="radio" name="conjuntoOrgMode" data-cj-use-stages="1"' +
              (useStages ? ' checked' : '') + '><span>Por etapas</span></label>' +
        '</div>';

      if (!useStages) {
        html +=
          '<div class="builder-estructura-sublabel">Componentes del conjunto</div>' +
          conjuntoComponentsBlockHtml(cfg.components, '');
      } else {
        html +=
          '<div class="builder-estructura-sublabel">Etapas</div>' +
          '<div class="builder-estructura-tips-grid builder-conjunto-stages-grid">' +
            (cfg.stages || []).map(function (st) {
              return '<details class="builder-estructura-acc builder-estructura-acc--building" data-cj-stage-card="' +
                AdminUI.escapeHtml(st.localId) + '"' + (st.open ? ' open' : '') + '>' +
                '<summary><span class="builder-estructura-acc__title" data-cj-stage-title>' +
                  AdminUI.escapeHtml(st.nombre || 'Etapa') +
                '</span></summary>' +
                '<div class="builder-estructura-acc__body">' +
                  '<div class="builder-field">' +
                    '<label>Nombre</label>' +
                    '<input type="text" data-cj-stage-nombre value="' +
                      AdminUI.escapeHtml(st.nombre || '') + '">' +
                  '</div>' +
                  conjuntoComponentsBlockHtml(st.components, st.localId) +
                '</div>' +
              '</details>';
            }).join('') +
          '</div>' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-cj-add-stage>' +
            '+ Nueva etapa</button>';
      }

      html +=
        '<div class="builder-estructura-org-compact" style="margin-top:12px">' +
          '<div class="ws-field-unit builder-estructura-row">' +
            '<span class="builder-estructura-row__label">Cantidad total de viviendas</span>' +
            '<span class="builder-estructura-row__value" data-cj-total-viviendas>' +
              AdminUI.escapeHtml(String(e.totalViviendas != null ? e.totalViviendas : 0)) +
            '</span>' +
          '</div>' +
        '</div>';
      return html;
    }

    function ambientePickerHtml(tip, plantaLocalId, prioritizeExterior) {
      var priority = {};
      (EstructuraEngine.AMBIENTE_EXTERIOR_PRIORITY || []).forEach(function (n) { priority[n] = true; });
      var groups = (EstructuraEngine.AMBIENTE_CATALOG || []).slice();
      if (prioritizeExterior) {
        groups = groups.slice().sort(function (a, b) {
          if (a.id === 'exterior') return -1;
          if (b.id === 'exterior') return 1;
          return 0;
        });
      }
      var plantaKey = plantaLocalId || '';
      var current = (tip.ambientes || []).filter(function (a) {
        return plantaKey ? a.plantaLocalId === plantaKey : !a.plantaLocalId;
      });
      var selectedNames = {};
      current.forEach(function (a) { selectedNames[a.nombre] = true; });

      var groupsHtml = groups.map(function (g) {
        return '<div class="ws-ms__group builder-ambiente-picker__group">' +
          '<div class="ws-ms__group-title builder-ambiente-picker__group-title">' +
            AdminUI.escapeHtml(g.label) + '</div>' +
          '<div class="ws-ms__options builder-ambiente-picker__options">' +
            g.items.map(function (name) {
              var isOther = EstructuraEngine.isCustomAmbienteOption
                ? EstructuraEngine.isCustomAmbienteOption(name)
                : (name === 'Otro' || name === 'Otro...');
              var isPri = prioritizeExterior && priority[name];
              var on = !isOther && !!selectedNames[name];
              return '<label class="ws-ms__opt builder-ambiente-picker__opt' +
                (isPri ? ' is-priority' : '') + '">' +
                '<input type="checkbox" data-amb-pick="' + AdminUI.escapeHtml(name) + '"' +
                  (isOther ? ' data-amb-pick-other="1"' : '') +
                  (on ? ' checked' : '') + '>' +
                '<span>' + AdminUI.escapeHtml(name) + '</span></label>';
            }).join('') +
          '</div></div>';
      }).join('');

      var chipsHtml = current.map(function (a) {
        return '<span class="ws-ms__chip">' +
          '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(a.nombre) + '</span>' +
          '<button type="button" class="ws-ms__chip-remove" data-amb-chip-remove="' +
            AdminUI.escapeHtml(a.localId) + '" aria-label="Quitar ' +
            AdminUI.escapeHtml(a.nombre) + '">×</button>' +
        '</span>';
      }).join('');

      return '<div class="ws-ms builder-ambiente-picker" data-ws-ms data-amb-picker' +
        ' data-tipologia-id="' + AdminUI.escapeHtml(tip.localId) + '"' +
        ' data-planta-id="' + AdminUI.escapeHtml(plantaKey) + '">' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-amb-picker-open>+ Ambiente</button>' +
        '<div class="ws-ms__panel builder-ambiente-picker__panel" hidden data-amb-panel>' +
          groupsHtml +
          '<div class="builder-ambiente-picker__custom" hidden data-amb-custom-wrap>' +
            '<label>Nombre del ambiente' +
              '<input type="text" data-amb-custom-name placeholder="Ej. Sala de juegos — Enter para agregar" maxlength="80">' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="ws-ms__summary" data-amb-summary>' + chipsHtml + '</div>' +
      '</div>';
    }

    var typesHtml = EstructuraEngine.DEVELOPMENT_TYPES.map(function (t) {
      var sel = e.developmentType === t.id ? ' is-selected' : '';
      return '<button type="button" class="builder-estructura-type' + sel + '" data-dev-type="' + t.id + '">' +
        AdminUI.escapeHtml(t.label) +
      '</button>';
    }).join('');

    var orgHtml = '';

    if (dt === 'unidad') {
      orgHtml +=
        '<div class="builder-estructura-org-compact">' +
          '<div class="builder-estructura-org-compact__cell">' +
            '<div class="builder-estructura-sublabel">Tipo de vivienda</div>' +
            '<div class="builder-estructura-chips">' +
              '<label class="builder-estructura-chip' + (e.unidadHousingType === 'casa' ? ' is-on' : '') + '">' +
                '<input type="radio" name="unidadHousing" data-unidad-housing="casa"' +
                  (e.unidadHousingType === 'casa' ? ' checked' : '') + '><span>Casa</span></label>' +
              '<label class="builder-estructura-chip' + (e.unidadHousingType === 'apartamento' ? ' is-on' : '') + '">' +
                '<input type="radio" name="unidadHousing" data-unidad-housing="apartamento"' +
                  (e.unidadHousingType === 'apartamento' ? ' checked' : '') + '><span>Apartamento</span></label>' +
            '</div>' +
          '</div>' +
          '<div class="builder-estructura-org-compact__cell">' +
            '<div class="builder-estructura-sublabel">Cantidad de unidades</div>' +
            '<div class="builder-estructura-row">' +
              stepperHtml('unidadCount', e.unidadCount || 1, 1, 50000) +
            '</div>' +
          '</div>' +
        '</div>';
    }

    if (dt === 'edificio') {
      var multi = e.edificioMode === 'multiples';
      var edificioGeneral =
        '<div class="builder-estructura-edificio-controls">' +
          '<div class="builder-estructura-sublabel">Tipo</div>' +
          '<div class="builder-estructura-chips">' +
            '<label class="builder-estructura-chip' + (!multi ? ' is-on' : '') + '">' +
              '<input type="radio" name="edificioMode" data-edificio-mode="unico"' +
                (!multi ? ' checked' : '') + '><span>Edificio único</span></label>' +
            '<label class="builder-estructura-chip' + (multi ? ' is-on' : '') + '">' +
              '<input type="radio" name="edificioMode" data-edificio-mode="multiples"' +
                (multi ? ' checked' : '') + '><span>Múltiples torres / bloques</span></label>' +
          '</div>' +
          (multi
            ? '<div class="builder-estructura-row builder-estructura-row--tower-count">' +
                '<span class="builder-estructura-row__label">Cantidad de torres</span>' +
                stepperHtml('towerCount', e.buildings.length || 2, 1, 40) +
              '</div>'
            : '') +
        '</div>';

      /* Same architecture for único and múltiples: controls above + stable 2-col grid */
      orgHtml +=
        edificioGeneral +
        '<div class="builder-estructura-towers-grid">' +
          e.buildings.map(function (b, bi) { return buildingAccHtml(b, bi, multi); }).join('') +
        '</div>' +
        (multi
          ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderAddTowerBtn">' +
              '+ Añadir torre / edificio</button>'
          : '');
    }

    if (dt === 'conjunto') {
      orgHtml += conjuntoOrgHtml();
    }

    if (dt === 'lotes') {
      orgHtml +=
        '<div class="builder-estructura-sublabel">Tipo</div>' +
        '<div class="builder-estructura-chips">' +
          '<label class="builder-estructura-chip' + (e.lotesSubtype === 'urbano' ? ' is-on' : '') + '">' +
            '<input type="radio" name="lotesSubtype" data-lotes-subtype="urbano"' +
              (e.lotesSubtype === 'urbano' ? ' checked' : '') + '><span>Loteo urbano</span></label>' +
          '<label class="builder-estructura-chip' + (e.lotesSubtype === 'campestre' ? ' is-on' : '') + '">' +
            '<input type="radio" name="lotesSubtype" data-lotes-subtype="campestre"' +
              (e.lotesSubtype === 'campestre' ? ' checked' : '') + '><span>Parcelación campestre</span></label>' +
        '</div>' +
        orgLevelsHtml() +
        '<div class="builder-estructura-org-compact builder-estructura-org-compact--single">' +
          '<div class="builder-estructura-row">' +
            '<span class="builder-estructura-row__label">Cantidad total de lotes</span>' +
            stepperHtml('totalLotes', e.totalLotes || 100, 1, 100000) +
          '</div>' +
        '</div>';
    }

    if (dt === 'mixto') {
      var hint = EstructuraEngine.mixtoHint(e);
      orgHtml +=
        mixtoCompsHtml() +
        (hint ? '<p class="builder-estructura-section__note">' + AdminUI.escapeHtml(hint) + '</p>' : '');

      if (e.mixto && e.mixto.edificios) {
        orgHtml +=
          '<div class="builder-estructura-mixto-section">' +
            '<div class="builder-estructura-sublabel">Edificios / Torres</div>' +
            '<div class="builder-estructura-towers-grid">' +
              e.buildings.map(function (b, bi) { return buildingAccHtml(b, bi, true); }).join('') +
            '</div>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderAddTowerBtn">' +
              '+ Añadir torre / edificio</button>' +
          '</div>';
      }
      if (e.mixto && e.mixto.casas) {
        orgHtml +=
          '<div class="builder-estructura-mixto-section">' +
            '<div class="builder-estructura-sublabel">Casas</div>' +
            orgLevelsHtml() +
            '<div class="builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Cantidad de viviendas (casas)</span>' +
              stepperHtml('totalViviendas', e.totalViviendas || 20, 1, 50000) +
            '</div>' +
          '</div>';
      }
      if (e.mixto && e.mixto.lotes) {
        orgHtml +=
          '<div class="builder-estructura-mixto-section">' +
            '<div class="builder-estructura-sublabel">Lotes</div>' +
            '<div class="builder-estructura-row">' +
              '<span class="builder-estructura-row__label">Cantidad de lotes</span>' +
              stepperHtml('totalLotes', e.totalLotes || 50, 1, 100000) +
            '</div>' +
          '</div>';
      }
    }

    function tipFamily(tip) {
      if (dt === 'conjunto') {
        return (EstructuraEngine.familyFromProducto
          ? EstructuraEngine.familyFromProducto(tip.producto)
          : null) || 'casa';
      }
      if (dt === 'mixto') {
        return EstructuraEngine.productFamilyFor(dt, tip.componente);
      }
      if (dt === 'unidad') {
        return e.unidadHousingType === 'apartamento' ? 'apartamento' : 'casa';
      }
      return EstructuraEngine.productFamilyFor(dt, tip.componente);
    }

    var tipsHtml = e.tipologias.map(function (tip, ti) {
      var products = EstructuraEngine.productsFor(dt, {
        componente: tip.componente,
        unidadHousingType: e.unidadHousingType
      });
      var family = tipFamily(tip);
      var productOpts = products.map(function (p) {
        return '<option value="' + p.id + '"' + (tip.producto === p.id ? ' selected' : '') + '>' +
          AdminUI.escapeHtml(p.label) + '</option>';
      }).join('');
      var showLote = family === 'casa' || family === 'terreno';
      var showPrivada = family === 'apartamento';
      var showRooms = family !== 'terreno';

      var compSelect = '';
      if (dt === 'mixto') {
        var comps = [];
        if (e.mixto && e.mixto.edificios) comps.push({ id: 'edificios', label: 'Edificios / Torres' });
        if (e.mixto && e.mixto.casas) comps.push({ id: 'casas', label: 'Casas' });
        if (e.mixto && e.mixto.lotes) comps.push({ id: 'lotes', label: 'Lotes' });
        compSelect =
          '<div class="builder-field"><label>Componente</label>' +
            '<select data-t-field="componente">' +
              comps.map(function (c) {
                return '<option value="' + c.id + '"' + (tip.componente === c.id ? ' selected' : '') + '>' +
                  AdminUI.escapeHtml(c.label) + '</option>';
              }).join('') +
            '</select></div>';
      }

      var plantasHtml = (tip.plantas || []).map(function (pl) {
        return '<details class="builder-estructura-acc builder-estructura-acc--nested"' +
          (pl.open ? ' open' : '') + '>' +
          '<summary>' + AdminUI.escapeHtml(pl.nombre) + '</summary>' +
          '<div class="builder-estructura-acc__body">' +
            ambientePickerHtml(tip, pl.localId, false) +
          '</div></details>';
      }).join('');

      var extHtml =
        '<div class="builder-estructura-ext">' +
          '<div class="builder-estructura-sublabel">Sin planta (exterior / patio / jardín)</div>' +
          ambientePickerHtml(tip, '', true) +
        '</div>';

      return '<details class="builder-estructura-acc" data-tipologia="' + AdminUI.escapeHtml(tip.localId) + '"' +
        (tip.open ? ' open' : '') + '>' +
        '<summary><span class="builder-estructura-acc__title" data-tipologia-title>' +
          AdminUI.escapeHtml(tip.nombre || (tip.modelo ? ('Modelo ' + tip.modelo) : ('Tipología ' + (ti + 1)))) +
          (function () {
            var n = EstructuraEngine.getTipAssigned
              ? EstructuraEngine.getTipAssigned(tip)
              : 0;
            return n > 0
              ? ' <span class="builder-estructura-acc__qty">· ' + n + ' u.</span>'
              : '';
          })() +
        '</span></summary>' +
        '<div class="builder-estructura-acc__body">' +
          compSelect +
          '<div class="builder-estructura-grid2">' +
            '<div class="builder-field"><label>Producto</label>' +
              '<select data-t-field="producto">' + productOpts + '</select></div>' +
            '<div class="builder-field"><label>Modelo</label>' +
              '<input type="text" data-t-field="modelo" value="' + AdminUI.escapeHtml(tip.modelo || '') + '"></div>' +
          '</div>' +
          buildTipologiaAssignHtml(e, tip) +
          '<div class="builder-estructura-grid2">' +
            '<div class="builder-field"><label>Área construida (m²)</label>' +
              '<input type="number" min="0" step="0.01" data-t-field="area_m2" value="' +
                AdminUI.escapeHtml(String(tip.area_m2 != null ? tip.area_m2 : '')) + '"></div>' +
            (showPrivada
              ? '<div class="builder-field"><label>Área privada (m²)</label>' +
                  '<input type="number" min="0" step="0.01" data-t-field="area_privada_m2" value="' +
                  AdminUI.escapeHtml(String(tip.area_privada_m2 != null ? tip.area_privada_m2 : '')) + '"></div>'
              : '') +
            (showLote
              ? '<div class="builder-field"><label>Área de lote (m²)</label>' +
                  '<input type="number" min="0" step="0.01" data-t-field="area_lote_m2" value="' +
                  AdminUI.escapeHtml(String(tip.area_lote_m2 != null ? tip.area_lote_m2 : '')) + '"></div>'
              : '') +
          '</div>' +
          (showRooms
            ? '<div class="builder-estructura-grid2">' +
                '<div class="ws-field-unit builder-estructura-row"><span class="builder-estructura-row__label">Habitaciones</span>' +
                  stepperHtml('t.habitaciones', tip.habitaciones || 0, 0, 20) + '</div>' +
                '<div class="ws-field-unit builder-estructura-row"><span class="builder-estructura-row__label">Baños</span>' +
                  stepperHtml('t.banos', tip.banos || 0, 0, 20) + '</div>' +
                '<div class="ws-field-unit builder-estructura-row"><span class="builder-estructura-row__label">Parqueaderos</span>' +
                  stepperHtml('t.parqueaderos', tip.parqueaderos || 0, 0, 20) + '</div>' +
                '<div class="ws-field-unit builder-estructura-row"><span class="builder-estructura-row__label">Plantas internas</span>' +
                  stepperHtml('t.plantas_internas', tip.plantas_internas || 0, 0, 10) + '</div>' +
              '</div>'
            : '') +
          '<div class="builder-field"><label>Precio desde</label>' +
            '<input type="number" min="0" step="1" data-t-field="precio" value="' +
              AdminUI.escapeHtml(String(tip.precio != null ? tip.precio : '')) + '"></div>' +
          (showRooms ? ('<div class="builder-estructura-sublabel">Plantas</div>' + plantasHtml + extHtml) : '') +
          '<button type="button" class="builder-header-action-btn is-danger boxies-btn-secondary" data-remove-tipologia="' +
            AdminUI.escapeHtml(tip.localId) + '">Quitar tipología</button>' +
        '</div></details>';
    }).join('');

    var zonesSelected = Array.isArray(e.zoneNames) ? e.zoneNames.slice() : [];
    var zonesCount = zonesSelected.length;
    var zonesTriggerLabel = zonesCount > 0
      ? ('Zonas / amenidades · ' + zonesCount + ' seleccionada' + (zonesCount === 1 ? '' : 's'))
      : 'Seleccionar zonas / amenidades';
    var zonesGroupsHtml = EstructuraEngine.ZONE_GROUPS.map(function (g) {
      return '<div class="ws-ms__group">' +
        '<div class="ws-ms__group-title">' + AdminUI.escapeHtml(g.label) + '</div>' +
        '<div class="ws-ms__options">' +
          g.items.map(function (name) {
            var on = zonesSelected.indexOf(name) >= 0;
            return '<label class="ws-ms__opt">' +
              '<input type="checkbox" data-zone-pick="' + AdminUI.escapeHtml(name) + '"' +
                (on ? ' checked' : '') + '>' +
              '<span>' + AdminUI.escapeHtml(name) + '</span></label>';
          }).join('') +
        '</div></div>';
    }).join('');
    var zonesSummaryHtml = zonesCount
      ? zonesSelected.map(function (name) {
          return '<span class="ws-ms__chip">' +
            '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(name) + '</span>' +
            '<button type="button" class="ws-ms__chip-remove" data-zone-chip-remove="' +
              AdminUI.escapeHtml(name) + '" aria-label="Quitar ' + AdminUI.escapeHtml(name) + '">×</button>' +
          '</span>';
        }).join('')
      : '<span class="ws-ms__empty">Ninguna zona o amenidad seleccionada</span>';
    var zonesHtml =
      '<div class="ws-ms ws-ms--block" data-ws-ms data-zones-picker>' +
        '<button type="button" class="ws-select__trigger" data-zones-picker-open aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="ws-select__value" data-zones-trigger-label>' + AdminUI.escapeHtml(zonesTriggerLabel) + '</span>' +
          '<span class="ws-select__chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="ws-ms__panel" hidden data-zones-panel>' + zonesGroupsHtml + '</div>' +
        '<div class="ws-ms__summary" data-zones-summary>' + zonesSummaryHtml + '</div>' +
      '</div>';

    var panels = e.openPanels || {};
    var sectionHints = buildEstructuraSectionHints(e);
    var draftStatus = e.dirty
      ? 'Cambios sin guardar'
      : (e._draftSaved ? 'Guardado' : '');
    var allExpanded = !!e.uiExpandAll;
    var expandIcon = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
      ? BuilderIcons.render('chevron-down')
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    var expandBtnHtml =
      '<button type="button" class="builder-estructura-expand-all' +
        (allExpanded ? ' is-expanded' : '') +
        '" id="builderEstructuraExpandAll"' +
        ' aria-label="' + (allExpanded ? 'Contraer todo' : 'Desplegar todo') + '"' +
        ' aria-expanded="' + (allExpanded ? 'true' : 'false') + '"' +
        ' data-tooltip="' + (allExpanded ? 'Contraer todo' : 'Desplegar todo') + '">' +
        '<span class="builder-estructura-expand-all__icon" aria-hidden="true">' + expandIcon + '</span>' +
      '</button>';
    var estructuraTitleRow = stepTitleHtml('Estructura').replace('</h2>', '</h2>' + expandBtnHtml);

    function sectionHintHtml(key, text) {
      if (!text) return '';
      return '<span class="builder-estructura-section__hint" data-estructura-hint="' +
        AdminUI.escapeHtml(key) + '">' + AdminUI.escapeHtml(text) + '</span>';
    }

    return '<div class="builder-step-content builder-step-content--estructura">' +
      '<div class="builder-estructura-head">' +
        estructuraTitleRow +
        '<div class="builder-estructura-head__actions">' +
          '<span class="builder-estructura-draft-status' +
            (e.dirty ? ' is-dirty' : (e._draftSaved ? ' is-saved' : '')) +
            '" data-estructura-draft-status>' + AdminUI.escapeHtml(draftStatus) + '</span>' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderSaveEstructuraDraftBtn">' +
            'Guardar borrador</button>' +
          '<button type="button" class="builder-header-action-btn is-primary" id="builderApplyEstructuraBtn">Aplicar estructura</button>' +
        '</div>' +
      '</div>' +
      '<details class="builder-estructura-section" data-estructura-panel="dev"' +
        (panels.dev !== false ? ' open' : '') + '>' +
        '<summary class="builder-estructura-section__summary">' +
          '<span class="builder-estructura-section__title">Tipo de proyecto</span>' +
          sectionHintHtml('dev', sectionHints.dev) +
        '</summary>' +
        '<div class="builder-estructura-section__body">' +
          '<div class="builder-estructura-types">' + typesHtml + '</div>' +
        '</div>' +
      '</details>' +
      '<details class="builder-estructura-section" data-estructura-panel="org"' +
        (panels.org !== false ? ' open' : '') + '>' +
        '<summary class="builder-estructura-section__summary">' +
          '<span class="builder-estructura-section__title">Configuración espacial</span>' +
          sectionHintHtml('org', sectionHints.org) +
        '</summary>' +
        '<div class="builder-estructura-section__body">' + orgHtml + '</div>' +
      '</details>' +
      '<details class="builder-estructura-section" data-estructura-panel="tipologias"' +
        (panels.tipologias !== false ? ' open' : '') + '>' +
        '<summary class="builder-estructura-section__summary">' +
          '<span class="builder-estructura-section__title">Tipologías</span>' +
          sectionHintHtml('tipologias', sectionHints.tipologias) +
        '</summary>' +
        '<div class="builder-estructura-section__body">' +
          '<p class="builder-estructura-section__note">Asigna cuántas unidades de cada tipología van a cada nivel. ' +
            '1 tipología = 1 tarjeta en Viviendas; las cantidades definen el inventario.</p>' +
          buildAssignmentBalanceHtml(e) +
          '<div class="builder-estructura-tips-grid">' + tipsHtml + '</div>' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="builderAddTipologiaBtn">' +
            '+ Añadir tipología</button>' +
        '</div>' +
      '</details>' +
      '<details class="builder-estructura-section" data-estructura-panel="zonas"' +
        (panels.zonas !== false ? ' open' : '') + '>' +
        '<summary class="builder-estructura-section__summary">' +
          '<span class="builder-estructura-section__title">Amenidades</span>' +
          sectionHintHtml('zonas', sectionHints.zonas) +
        '</summary>' +
        '<div class="builder-estructura-section__body">' + zonesHtml + '</div>' +
      '</details>' +
      '<details class="builder-estructura-section" data-estructura-panel="resumen"' +
        (panels.resumen === true ? ' open' : '') + '>' +
        '<summary class="builder-estructura-section__summary">' +
          '<span class="builder-estructura-section__title">Resumen del proyecto</span>' +
        '</summary>' +
        '<div class="builder-estructura-section__body" data-estructura-resumen-body>' +
          buildEstructuraResumenHtml(e) +
        '</div>' +
      '</details>' +
    '</div>';
  }

  function renderProjectType() {
    return renderEstructura();
  }

  function renderExperiencia() {
    if (typeof ExperienciaEngine !== 'undefined') ExperienciaEngine.ensureState(state);
    if (typeof ExperienciaCanvas !== 'undefined' && ExperienciaCanvas.shellHtml) {
      return ExperienciaCanvas.shellHtml(state);
    }
    return '<div class="builder-step-content builder-step-content--experiencia">' +
      stepTitleHtml('Experiencia') +
      '<p class="builder-step-desc">Editor visual no disponible.</p></div>';
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
    /* TEMP egress: nunca renderizar <video src> con URL remota de Storage */
    if (v && !v.file) {
      var raw = v.previewUrl || v.uploadedUrl || '';
      if (
        v.status === 'remote' ||
        (typeof isRemoteHeroVideoUrl === 'function' && isRemoteHeroVideoUrl(raw)) ||
        (typeof isPlayableHeroVideoUrl === 'function' && raw && !isPlayableHeroVideoUrl(raw))
      ) {
        v = null;
        state.heroVideo = null;
      }
    }
    var localVideoPreview =
      v && v.previewUrl &&
      (typeof isPlayableHeroVideoUrl === 'function'
        ? isPlayableHeroVideoUrl(v.previewUrl)
        : String(v.previewUrl).indexOf('blob:') === 0)
        ? v.previewUrl
        : null;
    var hero = state.heroContent || {};
    var branding = state.branding || {};
    var nombre = hero.nombre || (state.projectInfo && state.projectInfo.nombre) || '';
    var eslogan = hero.eslogan || '';
    var btnLeft = hero.botonIzquierdo || 'Explorar';
    var btnRight = hero.botonDerecho || 'Iniciar';
    var waLink = hero.whatsappLink || '';
    var waMsg = hero.whatsappMessage || '';
    var shareUrl = hero.shareUrl || '';
    var showWa = hero.showWhatsapp !== false;
    var showShare = hero.showShare !== false;
    var showLogo = branding.showHeroLogo !== false;
    var logoStyle = branding.logoStyle === 'avatar' ? 'avatar' : 'flat';
    var logoUrl =
      (branding.logo && (branding.logo.uploadedUrl || branding.logo.previewUrl)) || '';

    function mediaMetaLine(parts) {
      return parts.filter(Boolean).join(' · ');
    }

    function videoCardHtml() {
      var has = !!localVideoPreview;
      var dims =
        v && v.width && v.height ? v.width + '×' + v.height + 'px' : '';
      var status = has
        ? (v.status === 'synced' ? 'Sincronizado' : (v.status === 'remote' ? 'Remoto' : 'Listo'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="video">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Video</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="videoDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra un video"') + '>' +
            (has
              ? '<video src="' + AdminUI.escapeHtml(localVideoPreview) +
                '" controls muted class="builder-video-preview"></video>'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  AdminUI.escapeHtml(v.name || 'Video del hero') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  AdminUI.escapeHtml(
                    mediaMetaLine([
                      status,
                      formatBytes(v.size),
                      dims,
                      v.durationLabel ? 'Duración ' + v.durationLabel : ''
                    ])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="video">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="video">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="video">Subir</button>') +
          '</div>' +
          '<input type="file" id="videoInput" accept="' + MediaEngine.ACCEPT + '" hidden>' +
        '</article>'
      );
    }

    function imageCardHtml() {
      var has = !!(img && (img.previewUrl || img.uploadedUrl));
      var previewSrc = has ? (img.previewUrl || img.uploadedUrl) : '';
      var dims =
        img && img.width && img.height ? img.width + '×' + img.height + 'px' : '';
      var status = has
        ? (img.status === 'synced' ? 'Sincronizado' : (img.status === 'remote' ? 'Remoto' : 'Listo'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="image">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Imagen</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="heroImageDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra una imagen"') + '>' +
            (has
              ? '<img src="' + AdminUI.escapeHtml(previewSrc) +
                '" alt="" class="builder-hero-image-preview">'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  AdminUI.escapeHtml(img.name || 'Imagen del hero') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  AdminUI.escapeHtml(
                    mediaMetaLine([status, formatBytes(img.size), dims])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="image">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="image">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="image">Subir</button>') +
          '</div>' +
          '<input type="file" id="heroImageInput" accept="' + MediaEngine.IMAGE_ACCEPT + '" hidden>' +
        '</article>'
      );
    }

    function logoCardHtml() {
      var logo = branding.logo;
      var previewSrc = logo && (logo.previewUrl || logo.uploadedUrl) ? (logo.previewUrl || logo.uploadedUrl) : '';
      var has = !!previewSrc;
      var status = has
        ? (logo.uploadedUrl ? 'Bunny' : (logo.file ? 'Listo' : 'Remoto'))
        : '';
      return (
        '<article class="builder-hero-media-card' + (has ? ' has-media' : ' is-empty') + '" data-hero-media="logo">' +
          '<header class="builder-hero-media-card__head">' +
            '<span class="builder-hero-media-card__label">Logo</span>' +
            (has ? '<span class="builder-hero-option-badge">Activo</span>' : '') +
          '</header>' +
          '<div class="builder-hero-media-card__stage" id="heroLogoDropzone"' +
            (has ? '' : ' title="Haz clic o arrastra el logo"') + '>' +
            (has
              ? '<img src="' + AdminUI.escapeHtml(previewSrc) +
                '" alt="" class="builder-hero-image-preview">'
              : '<div class="builder-hero-media-card__void" aria-hidden="true"></div>') +
          '</div>' +
          (has
            ? '<div class="builder-hero-media-card__meta">' +
                '<div class="builder-hero-media-card__name">' +
                  AdminUI.escapeHtml(logo.name || 'Logo del proyecto') +
                '</div>' +
                '<div class="builder-file-meta">' +
                  AdminUI.escapeHtml(
                    mediaMetaLine([status, logo.size ? formatBytes(logo.size) : ''])
                  ) +
                '</div>' +
              '</div>'
            : '') +
          '<div class="builder-hero-media-card__actions">' +
            (has
              ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="logo">Cambiar</button>' +
                '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-hero-media-clear="logo">Eliminar</button>'
              : '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-hero-media-change="logo">Subir</button>') +
          '</div>' +
          '<input type="file" id="heroLogoInput" accept="image/*,.svg" hidden>' +
        '</article>'
      );
    }

    return (
      '<div class="builder-step-content builder-step-content--hero">' +
        '<div class="builder-hero-workspace-head">' +
          stepTitleHtml('Hero') +
        '</div>' +
        '<div class="builder-hero-workspace">' +
          '<div class="builder-hero-col builder-hero-col--media">' +
            videoCardHtml() +
            imageCardHtml() +
            logoCardHtml() +
          '</div>' +
          '<div class="builder-hero-col builder-hero-col--config">' +
            '<div class="builder-hero-config-card" id="heroContentForm">' +
              '<div class="builder-hero-config-card__title">Identidad</div>' +
              '<div class="builder-field">' +
                '<label for="heroNombreInput">Nombre</label>' +
                '<input type="text" id="heroNombreInput" maxlength="120" placeholder="Nombre visible en el hero" value="' +
                  AdminUI.escapeHtml(nombre) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroEsloganInput">Eslogan</label>' +
                '<input type="text" id="heroEsloganInput" maxlength="220" placeholder="Eslogan del hero" value="' +
                  AdminUI.escapeHtml(eslogan) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Botones</div>' +
              '<div class="builder-field">' +
                '<label for="heroBtnLeftInput">Texto izquierdo</label>' +
                '<input type="text" id="heroBtnLeftInput" maxlength="40" placeholder="Explorar" value="' +
                  AdminUI.escapeHtml(btnLeft) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroBtnRightInput">Texto derecho</label>' +
                '<input type="text" id="heroBtnRightInput" maxlength="40" placeholder="Iniciar" value="' +
                  AdminUI.escapeHtml(btnRight) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">WhatsApp</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowWhatsappInput"' + (showWa ? ' checked' : '') + '>' +
                '<span>Mostrar</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroWhatsappLinkInput">Número / link</label>' +
                '<input type="text" id="heroWhatsappLinkInput" maxlength="180" ' +
                  'placeholder="573001112233 o https://wa.me/573001112233" value="' +
                  AdminUI.escapeHtml(waLink) + '">' +
              '</div>' +
              '<div class="builder-field">' +
                '<label for="heroWhatsappMsgInput">Mensaje</label>' +
                '<input type="text" id="heroWhatsappMsgInput" maxlength="280" ' +
                  'placeholder="Hola, quiero más información..." value="' +
                  AdminUI.escapeHtml(waMsg) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Compartir</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowShareInput"' + (showShare ? ' checked' : '') + '>' +
                '<span>Mostrar</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroShareUrlInput">URL al compartir</label>' +
                '<input type="url" id="heroShareUrlInput" maxlength="400" ' +
                  'placeholder="Vacío = URL actual del showroom" value="' +
                  AdminUI.escapeHtml(shareUrl) + '">' +
              '</div>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Fullscreen</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowFullscreenInput"' +
                  ((hero.showFullscreen !== false) ? ' checked' : '') + '>' +
                '<span>Mostrar control de pantalla completa</span>' +
              '</label>' +
            '</div>' +
            '<div class="builder-hero-config-card">' +
              '<div class="builder-hero-config-card__title">Logo</div>' +
              '<label class="builder-check-row">' +
                '<input type="checkbox" id="heroShowLogoInput"' + (showLogo ? ' checked' : '') + '>' +
                '<span>Mostrar en el hero</span>' +
              '</label>' +
              '<div class="builder-field">' +
                '<label for="heroLogoUrlDisplay">URL Bunny</label>' +
                '<input type="text" id="heroLogoUrlDisplay" readonly ' +
                  'placeholder="Sin logo — súbelo a la izquierda" value="' +
                  AdminUI.escapeHtml(logoUrl) + '">' +
              '</div>' +
              '<div class="builder-confirm-title" style="margin-top:4px">Formato</div>' +
              '<label class="builder-check-row">' +
                '<input type="radio" name="heroLogoStyle" value="flat" id="heroLogoStyleFlat"' +
                  (logoStyle === 'flat' ? ' checked' : '') + '>' +
                '<span>Mantener formato</span>' +
              '</label>' +
              '<label class="builder-check-row">' +
                '<input type="radio" name="heroLogoStyle" value="avatar" id="heroLogoStyleAvatar"' +
                  (logoStyle === 'avatar' ? ' checked' : '') + '>' +
                '<span>Convertir a circular</span>' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
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
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="menuAddBtn">+ Agregar botón</button>' +
      '</div>' +
    '</div>';
  }

  function renderViviendas() {
    ViviendasSyncEngine.ensureState(state);
    if (typeof ArchitectureEngine !== 'undefined') ArchitectureEngine.ensureState(state);
    var items = state.viviendas || [];
    var expandedIdx = typeof state.viviendaExpandedIdx === 'number' ? state.viviendaExpandedIdx : -1;
    var arch = state.architecture || {};
    var unitCount = (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.activeUnitCount)
      ? ArchitectureEngine.activeUnitCount(state)
      : 0;
    var orphanCount = (arch.orphans || []).length;
    var applied = !!(state.estructura && state.estructura.appliedAt) || !!arch.appliedAt;
    var inventoryBanner = '<div class="builder-viviendas-arch">' +
      (!applied
        ? '<div class="builder-warn-banner">Pendiente estructura: el inventario se generará al aplicar.</div>'
        : '<div class="builder-ready-banner">' +
            unitCount + (unitCount === 1 ? ' unidad' : ' unidades') +
            ' · ' + (arch.tipologyContentCards || items.length) + ' tipología(s) con contenido compartido' +
            (orphanCount ? (' · ' + orphanCount + ' en revisión') : '') +
          '</div>') +
      '<p class="builder-menu-hint">Las tipologías comparten galería/plano/360. Las tarjetas abajo son el contenido comercial por tipología; el inventario físico está sincronizado desde Estructura.</p>' +
    '</div>';

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
      inventoryBanner +
      '<div class="builder-confirm-form builder-menu-list-wrap">' +
        '<div class="builder-confirm-title">Contenido por tipología</div>' +
        '<p class="builder-menu-hint">1 tipología = 1 tarjeta de contenido compartido. Guarda para sincronizar con el proyecto.</p>' +
        (itemsHtml || '<p class="builder-menu-hint">Aún no hay tarjetas. Aplica la estructura o agrega manualmente.</p>') +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="viviendaAddBtn">+ Agregar vivienda</button>' +
      '</div>' +
    '</div>';
  }

  function resolveActiveProjectId() {
    if (!state) return null;
    var fromDraft = state.draftProjectId || null;
    var fromPublish = (state.publishResult && state.publishResult.proyectoId) || null;
    var fromAdmin =
      typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
        ? AdminState.getActiveProjectId()
        : null;
    var fromUrl = null;
    try {
      var params = new URLSearchParams(window.location.search || '');
      fromUrl = params.get('projectId') || params.get('proyectoId') || null;
    } catch (e) {}
    return fromDraft || fromPublish || fromAdmin || fromUrl || null;
  }

  function renderBunnyMedia() {
    if (typeof MediaNodesEngine !== 'undefined') MediaNodesEngine.ensureNodeIds(state);
    var projectId = resolveActiveProjectId();
    if (typeof MediaToursEngine !== 'undefined') {
      MediaToursEngine.ensureState(state, projectId);
      if (!state.mediaTours.seededAt) MediaToursEngine.syncFromEstructura(state, projectId);
    }

    state.bunnyMedia = state.bunnyMedia || {};
    if (!Array.isArray(state.bunnyMedia.customNodes)) state.bunnyMedia.customNodes = [];
    if (!Array.isArray(state.bunnyMedia.nodeOrder)) state.bunnyMedia.nodeOrder = [];
    ensureMediaCategoryConfig(state);
    state.bunnyMedia.focusCategory = 'all';

    var query = String(state.bunnyMedia.searchQuery || '').trim().toLowerCase();
    var nodes = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.listCompatibleNodes(state)
      : [];
    hydrateBunnyRowsIntoAssets();

    /* Keep nodeOrder in sync with current set */
    var known = {};
    nodes.forEach(function (n) { known[n.node_id] = true; });
    state.bunnyMedia.nodeOrder = state.bunnyMedia.nodeOrder.filter(function (id) {
      return known[id];
    });
    nodes.forEach(function (n) {
      if (state.bunnyMedia.nodeOrder.indexOf(n.node_id) === -1) {
        state.bunnyMedia.nodeOrder.push(n.node_id);
      }
    });
    nodes = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.listCompatibleNodes(state)
      : nodes;

    if (!state.bunnyMedia.selectedNodeId && nodes.length) {
      state.bunnyMedia.selectedNodeId = nodes[0].node_id;
    }
    if (!state.bunnyMedia.selectedNodeId && state.bunnyMedia.expandedNodeId) {
      state.bunnyMedia.selectedNodeId = state.bunnyMedia.expandedNodeId;
    }

    var selectedId = state.bunnyMedia.selectedNodeId || null;
    var selected = null;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].node_id === selectedId) { selected = nodes[i]; break; }
    }
    if (selectedId && !selected && nodes.length) {
      selected = nodes[0];
      selectedId = selected.node_id;
      state.bunnyMedia.selectedNodeId = selectedId;
    }

    var listHtml =
      '<div class="builder-media-node-list" id="bunnyMediaNodeList">' +
        nodes.map(function (n) {
          var hidden = query && String(n.label || '').toLowerCase().indexOf(query) === -1;
          return renderMediaNodeListItem(n, n.node_id === selectedId, hidden);
        }).join('') +
        (!nodes.length
          ? '<p class="builder-menu-hint">No hay nodos. Usa + Agregar nodo o define Estructura.</p>'
          : '') +
      '</div>' +
      '<button type="button" class="builder-media-add-node" id="bunnyMediaAddNode">+ Agregar nodo</button>';

    var detailHtml = selected
      ? renderMediaNodeDetail(selected, 'all')
      : '<div class="builder-media-detail-empty">' +
          '<p class="builder-menu-hint">Selecciona un nodo para gestionar sus recursos.</p>' +
        '</div>';

    return '<div class="builder-step-content builder-step-content--media">' +
      '<div class="builder-media-workspace-head">' +
        stepTitleHtml('Media') +
        '<p class="builder-step-desc">Explorador de nodos · edición en el panel derecho.</p>' +
      '</div>' +
      '<div class="builder-media-workspace">' +
        '<aside class="builder-media-col builder-media-col--list" id="bunnyMediaListCol">' +
          '<div class="builder-media-list-toolbar">' +
            '<div class="builder-field builder-media-search-field">' +
              '<label for="bunnyMediaSearch">Buscar</label>' +
              '<input type="search" id="bunnyMediaSearch" placeholder="Buscar nodo…" value="' +
                AdminUI.escapeHtml(state.bunnyMedia.searchQuery || '') + '" autocomplete="off">' +
            '</div>' +
            '<p class="builder-menu-hint" id="bunnyMediaStatus" style="margin:0"></p>' +
          '</div>' +
          listHtml +
        '</aside>' +
        '<section class="builder-media-col builder-media-col--detail" id="bunnyMediaDetailCol">' +
          detailHtml +
        '</section>' +
      '</div>' +
      '<input type="file" id="bunnyMediaInput" hidden>' +
    '</div>';
  }

  function hydrateBunnyRowsIntoAssets() {
    if (typeof BunnyMediaApi === 'undefined' || typeof ExperienciaEngine === 'undefined') return;
    var items = (state.bunnyMedia && state.bunnyMedia.items) || [];
    items.forEach(function (row) {
      if (!row || row.storage_provider === 'lapentor') return;
      var nodeId = BunnyMediaApi.parseNodeIdFromPath(row.storage_path);
      var category = BunnyMediaApi.parseCategoryFromPath
        ? BunnyMediaApi.parseCategoryFromPath(row.storage_path)
        : null;
      var prev = state.projectAssets && state.projectAssets.byId &&
        state.projectAssets.byId['bunny-' + row.id];
      BunnyMediaApi.syncArchivosToProjectAssets(state, [row], (function () {
        var ex = {};
        ex[row.id] = {
          nodeId: (prev && prev.nodeId) || nodeId,
          category: (prev && prev.category) || category,
          projectId: resolveActiveProjectId()
        };
        return ex;
      })());
    });
    if (typeof MediaToursEngine !== 'undefined') {
      MediaToursEngine.syncScenesToProjectAssets(state);
    }
  }

  function statusDot(level) {
    if (level === 'ok') return '<span class="builder-media-dot is-ok" title="Completo"></span>';
    if (level === 'warn') return '<span class="builder-media-dot is-pending" title="Pendiente"></span>';
    return '<span class="builder-media-dot is-missing" title="Faltante"></span>';
  }

  function mediaNodeKindLabel(n) {
    if (!n) return 'Nodo';
    if (n.kind === 'zona') return 'Zona común';
    if (n.kind === 'custom') return 'Personalizado';
    return 'Tipología';
  }

  function defaultEnabledCategoriesForKind(kind) {
    if (kind === 'zona') {
      return {
        images: true,
        videos: true,
        plans2d: false,
        plans3d: false,
        tours360: true,
        documents: true,
        ui: false
      };
    }
    /* tipología + personalizado: todas activas */
    return {
      images: true,
      videos: true,
      plans2d: true,
      plans3d: true,
      tours360: true,
      documents: true,
      ui: true
    };
  }

  function ensureMediaCategoryConfig(stateObj) {
    stateObj.bunnyMedia = stateObj.bunnyMedia || {};
    if (!stateObj.bunnyMedia.categoryConfig || typeof stateObj.bunnyMedia.categoryConfig !== 'object') {
      stateObj.bunnyMedia.categoryConfig = {};
    }
    return stateObj.bunnyMedia.categoryConfig;
  }

  function getNodeEnabledCategories(node) {
    if (!node || !node.node_id) return defaultEnabledCategoriesForKind('custom');
    var map = ensureMediaCategoryConfig(state);
    var saved = map[node.node_id];
    if (saved && typeof saved === 'object') {
      var base = defaultEnabledCategoriesForKind(node.kind);
      var out = {};
      Object.keys(base).forEach(function (k) {
        out[k] = saved.hasOwnProperty(k) ? !!saved[k] : !!base[k];
      });
      return out;
    }
    return defaultEnabledCategoriesForKind(node.kind);
  }

  function setNodeEnabledCategories(nodeId, enabled) {
    if (!nodeId) return;
    var map = ensureMediaCategoryConfig(state);
    map[nodeId] = {
      images: !!enabled.images,
      videos: !!enabled.videos,
      plans2d: !!enabled.plans2d,
      plans3d: !!enabled.plans3d,
      tours360: !!enabled.tours360,
      documents: !!enabled.documents,
      ui: !!enabled.ui
    };
  }

  function listEnabledMediaCategories(node) {
    var enabled = getNodeEnabledCategories(node);
    var cats = (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.MEDIA_CATEGORIES) || [];
    return cats.filter(function (c) { return !!enabled[c.key]; });
  }

  function mediaNodeResourceProgress(node) {
    var cats = listEnabledMediaCategories(node);
    var total = cats.length;
    var filled = 0;
    if (typeof MediaNodesEngine !== 'undefined') {
      cats.forEach(function (c) {
        var st = MediaNodesEngine.categoryStatus(state, node.node_id, c.key);
        if (st && st.level === 'ok') filled++;
      });
    }
    return {
      filled: filled,
      total: total,
      label: filled + '/' + total
    };
  }

  function renderMediaNodeListItem(n, isSelected, hidden) {
    var progress = mediaNodeResourceProgress(n);
    return '<article class="builder-media-node' + (isSelected ? ' is-selected' : '') +
      '" data-media-node="' + AdminUI.escapeHtml(n.node_id) +
      '" data-media-label="' + AdminUI.escapeHtml(n.label || '') +
      '" data-media-kind="' + AdminUI.escapeHtml(n.kind || '') +
      '" draggable="true"' + (hidden ? ' hidden' : '') + '>' +
      '<div class="builder-media-node__select" role="button" tabindex="0" data-media-select="' +
        AdminUI.escapeHtml(n.node_id) + '">' +
        '<span class="builder-media-node__title">' +
          '<strong>' + AdminUI.escapeHtml(n.label) + '</strong>' +
          '<span class="builder-media-node__meta">' + AdminUI.escapeHtml(mediaNodeKindLabel(n)) + '</span>' +
          '<span class="builder-media-node__count">' + AdminUI.escapeHtml(progress.label) +
            ' recursos</span>' +
        '</span>' +
      '</div>' +
      '<button type="button" class="builder-media-node__delete" data-media-node-del="' +
        AdminUI.escapeHtml(n.node_id) + '" title="Eliminar nodo" aria-label="Eliminar nodo" draggable="false">×</button>' +
    '</article>';
  }

  function renderMediaNodeDetail(n, focus) {
    var enabledCats = listEnabledMediaCategories(n);
    var sections = enabledCats.map(function (cat) {
      if (focus !== 'all' && focus !== cat.key) return '';
      return renderMediaNodeCategorySection(n, cat);
    }).join('');
    var progress = mediaNodeResourceProgress(n);
    return '<div class="builder-media-detail">' +
      '<header class="builder-media-detail__head">' +
        '<div>' +
          '<h3 class="builder-media-detail__title">' + AdminUI.escapeHtml(n.label) + '</h3>' +
          '<p class="builder-menu-hint" style="margin:4px 0 0">' +
            AdminUI.escapeHtml(mediaNodeKindLabel(n)) +
            ' · ' + AdminUI.escapeHtml(progress.label) + ' recursos' +
          '</p>' +
        '</div>' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" id="bunnyMediaConfigCats" data-media-config-node="' +
          AdminUI.escapeHtml(n.node_id) + '">Configurar categorías</button>' +
      '</header>' +
      (sections
        ? '<div class="builder-media-detail__sections">' + sections + '</div>'
        : '<p class="builder-menu-hint">Ninguna categoría activa. Usa Configurar categorías.</p>') +
    '</div>';
  }

  function renderMediaNodeCategorySection(n, cat) {
    var assets = MediaNodesEngine.assetsForNode(state, n.node_id, cat.key);
    var st = MediaNodesEngine.categoryStatus(state, n.node_id, cat.key);
    var head = '<div class="builder-media-cat__head">' +
      '<strong>' + statusDot(st.level) + AdminUI.escapeHtml(cat.label) + '</strong>' +
      '<span class="builder-menu-hint" style="margin:0">' + AdminUI.escapeHtml(st.label) + '</span>' +
      (cat.mode === 'upload'
        ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-media-add="' +
          AdminUI.escapeHtml(n.node_id) + '" data-media-cat="' + AdminUI.escapeHtml(cat.key) +
          '">Agregar</button>'
        : '') +
    '</div>';

    if (cat.mode === 'tours') {
      var scene = null;
      if (state.mediaTours && state.mediaTours.scenes) {
        scene = state.mediaTours.scenes.find(function (s) {
          return s && (s.node_id === n.node_id || s.estructura_id === n.node_id);
        });
      }
      return '<section class="builder-media-cat" data-media-cat-block="' + AdminUI.escapeHtml(cat.key) + '">' +
        head +
        '<div class="builder-field" style="margin-top:8px">' +
          '<label>URL Lapentor</label>' +
          '<input type="url" data-media-tour-url data-node-id="' + AdminUI.escapeHtml(n.node_id) +
            '" data-scene-id="' + AdminUI.escapeHtml((scene && scene.id) || '') +
            '" placeholder="https://..." value="' + AdminUI.escapeHtml((scene && scene.url) || '') + '">' +
        '</div>' +
        '<p class="builder-menu-hint">Sin Bunny · provider lapentor · ligado a node_id</p>' +
      '</section>';
    }

    var files = assets.length
      ? '<div class="builder-bunny-grid">' + assets.map(function (a) {
          var isImg = a.type === 'image' || a.type === 'plan';
          var thumb = isImg && (a.thumbnailUrl || a.publicUrl)
            ? '<img src="' + AdminUI.escapeHtml(a.thumbnailUrl || a.publicUrl) + '" alt="" loading="lazy">'
            : '<div class="builder-bunny-card__ph">' + AdminUI.escapeHtml((a.category || a.type || '').toUpperCase()) + '</div>';
          return '<article class="builder-bunny-card">' +
            '<div class="builder-bunny-card__media">' + thumb + '</div>' +
            '<div class="builder-bunny-card__body">' +
              '<strong>' + AdminUI.escapeHtml(a.filename || 'archivo') + '</strong>' +
              (a.publicUrl
                ? '<a class="builder-bunny-card__url" href="' + AdminUI.escapeHtml(a.publicUrl) +
                  '" target="_blank" rel="noopener">' + AdminUI.escapeHtml(a.publicUrl) + '</a>'
                : '') +
            '</div>' +
            '<div class="builder-bunny-card__actions">' +
              (a.archivoId
                ? '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-bunny-del="' +
                  AdminUI.escapeHtml(a.archivoId) + '">Eliminar</button>'
                : '') +
            '</div>' +
          '</article>';
        }).join('') + '</div>'
      : '<p class="builder-menu-hint">0 archivos</p>';

    return '<section class="builder-media-cat" data-media-cat-block="' + AdminUI.escapeHtml(cat.key) + '">' +
      head + files +
    '</section>';
  }

  function openMediaCategoriesModal(nodeId) {
    var node = typeof MediaNodesEngine !== 'undefined' ? MediaNodesEngine.findNode(state, nodeId) : null;
    if (!node) return;
    var enabled = getNodeEnabledCategories(node);
    var cats = (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.MEDIA_CATEGORIES) || [];

    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') {
      AdminNotify.error('No se pudo abrir la configuración');
      return;
    }

    var checks = cats.map(function (c) {
      return '<label class="builder-media-cat-check">' +
        '<input type="checkbox" data-media-cat-toggle="' + AdminUI.escapeHtml(c.key) + '"' +
          (enabled[c.key] ? ' checked' : '') + '>' +
        '<span>' + AdminUI.escapeHtml(c.label) + '</span>' +
      '</label>';
    }).join('');

    AdminUI.openModal({
      title: 'Categorías · ' + (node.label || nodeId),
      bodyHtml:
        '<p class="admin-modal-copy">Activa solo las categorías que este nodo necesita. El progreso se recalcula automáticamente.</p>' +
        '<div class="builder-media-cat-checks">' + checks + '</div>',
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-primary" data-modal-action="confirm">Guardar</button>',
      onMount: function (root) {
        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            var next = {};
            root.querySelectorAll('[data-media-cat-toggle]').forEach(function (input) {
              next[input.getAttribute('data-media-cat-toggle')] = !!input.checked;
            });
            setNodeEnabledCategories(nodeId, next);
            AdminUI.closeModal();
            captureMediaScroll();
            saveState();
            renderStepContent();
            restoreMediaScroll();
            AdminNotify.success('Categorías actualizadas');
          });
        }
      }
    });
  }

  function renderMediaToursPanel() {
    return '<p class="builder-menu-hint">Tours 360 se gestionan dentro de cada nodo del Canvas.</p>';
  }

  function captureMediaScroll() {
    if (!rootEl || !state.bunnyMedia) return;
    var list = rootEl.querySelector('#bunnyMediaListCol');
    var detail = rootEl.querySelector('#bunnyMediaDetailCol');
    if (list) state.bunnyMedia.listScrollTop = list.scrollTop;
    if (detail) state.bunnyMedia.detailScrollTop = detail.scrollTop;
  }

  function restoreMediaScroll() {
    if (!rootEl || !state.bunnyMedia) return;
    var listTop = state.bunnyMedia.listScrollTop;
    var detailTop = state.bunnyMedia.detailScrollTop;
    requestAnimationFrame(function () {
      var list = rootEl.querySelector('#bunnyMediaListCol');
      var detail = rootEl.querySelector('#bunnyMediaDetailCol');
      if (list && listTop != null) list.scrollTop = listTop;
      if (detail && detailTop != null) detail.scrollTop = detailTop;
    });
  }

  function openAddMediaNodeModal() {
    if (typeof AdminUI === 'undefined' || typeof AdminUI.openModal !== 'function') {
      var name = window.prompt('Nombre del nodo');
      if (!name) return;
      createMediaNavigatorNode(name, 'custom');
      return;
    }
    AdminUI.openModal({
      title: 'Agregar nodo',
      bodyHtml:
        '<div class="builder-field">' +
          '<label for="mediaNewNodeName">Nombre</label>' +
          '<input type="text" id="mediaNewNodeName" placeholder="Ej. Casa unifamiliar · Modelo A" autocomplete="off">' +
        '</div>' +
        '<div class="builder-field" style="margin-top:12px">' +
          '<label for="mediaNewNodeType">Tipo</label>' +
          '<select id="mediaNewNodeType">' +
            '<option value="tipologia">Tipología</option>' +
            '<option value="zona">Zona común</option>' +
            '<option value="custom" selected>Personalizado</option>' +
          '</select>' +
        '</div>',
      footerHtml:
        '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
        '<button type="button" class="btn-primary" data-modal-action="confirm">Crear</button>',
      onMount: function (root) {
        var nameInput = root.querySelector('#mediaNewNodeName');
        var typeSel = root.querySelector('#mediaNewNodeType');
        var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
        var confirmBtn = root.querySelector('[data-modal-action="confirm"]');
        if (nameInput) setTimeout(function () { nameInput.focus(); }, 30);
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () { AdminUI.closeModal(); });
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            var nameVal = nameInput ? String(nameInput.value || '').trim() : '';
            var tipo = typeSel ? typeSel.value : 'custom';
            if (!nameVal) {
              AdminNotify.error('Indica un nombre');
              return;
            }
            AdminUI.closeModal();
            createMediaNavigatorNode(nameVal, tipo);
          });
        }
      }
    });
  }

  function createMediaNavigatorNode(name, tipo) {
    state.bunnyMedia = state.bunnyMedia || {};
    if (!Array.isArray(state.bunnyMedia.customNodes)) state.bunnyMedia.customNodes = [];
    if (!Array.isArray(state.bunnyMedia.nodeOrder)) state.bunnyMedia.nodeOrder = [];
    MediaNodesEngine.ensureNodeIds(state);
    var nodeId = null;

    if (tipo === 'tipologia' && typeof EstructuraEngine !== 'undefined') {
      EstructuraEngine.addTypology(state);
      var tips = state.estructura.tipologias || [];
      var tip = tips[tips.length - 1];
      if (tip) {
        tip.nombre = name;
        tip.modelo = tip.modelo || name;
        if (!tip.node_id) tip.node_id = tip.localId || ('tip-' + Date.now().toString(36));
        nodeId = tip.node_id;
      }
      state.estructura.dirty = true;
    } else if (tipo === 'zona' && typeof EstructuraEngine !== 'undefined') {
      EstructuraEngine.ensureState(state);
      var names = state.estructura.zoneNames || [];
      if (names.indexOf(name) === -1) names.push(name);
      state.estructura.zoneNames = names;
      state.estructura.dirty = true;
      MediaNodesEngine.ensureNodeIds(state);
      var zn = (state.estructura.zoneNodes || []).find(function (z) {
        return z && String(z.nombre).toLowerCase() === String(name).toLowerCase();
      });
      nodeId = zn && zn.node_id;
    } else {
      nodeId = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      state.bunnyMedia.customNodes.push({
        node_id: nodeId,
        nombre: name,
        label: name,
        tipo: 'custom',
        kind: 'custom',
        createdAt: new Date().toISOString()
      });
    }

    if (nodeId) {
      if (state.bunnyMedia.nodeOrder.indexOf(nodeId) === -1) {
        state.bunnyMedia.nodeOrder.push(nodeId);
      }
      state.bunnyMedia.selectedNodeId = nodeId;
      var kindForDefaults = tipo === 'zona' ? 'zona' : (tipo === 'tipologia' ? 'tipologia' : 'custom');
      setNodeEnabledCategories(nodeId, defaultEnabledCategoriesForKind(kindForDefaults));
    }
    saveState();
    captureMediaScroll();
    renderStepContent();
    restoreMediaScroll();
    AdminNotify.success('Nodo creado');
  }

  function deleteMediaNavigatorNode(nodeId) {
    var node = MediaNodesEngine.findNode(state, nodeId);
    if (!node) return;
    confirmNodeMediaDeletion(nodeId, node.label, function (mode) {
      var finish = function () {
        if (node.kind === 'tipologia') {
          var localId = node.entityRef && node.entityRef.localId;
          if (localId && typeof EstructuraEngine !== 'undefined') {
            var result = EstructuraEngine.removeTypology(state, localId);
            if (!result.ok) {
              if (result.reason === 'min') {
                AdminNotify.error('Debe quedar al menos una tipología.');
                return;
              }
              if (result.reason === 'conflict') {
                state.estructura.tipologias = state.estructura.tipologias.filter(function (t) {
                  return t.localId !== localId;
                });
                state.estructura.tipologiasCount = state.estructura.tipologias.length;
                state.estructura.dirty = true;
              }
            }
          }
        } else if (node.kind === 'zona') {
          var zname = node.label || node.nombre;
          if (zname && state.estructura && Array.isArray(state.estructura.zoneNames)) {
            state.estructura.zoneNames = state.estructura.zoneNames.filter(function (n) {
              return n !== zname;
            });
            state.estructura.dirty = true;
            MediaNodesEngine.ensureNodeIds(state);
          }
        } else {
          state.bunnyMedia.customNodes = (state.bunnyMedia.customNodes || []).filter(function (c) {
            return !c || c.node_id !== nodeId;
          });
        }
        state.bunnyMedia.nodeOrder = (state.bunnyMedia.nodeOrder || []).filter(function (id) {
          return id !== nodeId;
        });
        if (state.bunnyMedia.selectedNodeId === nodeId) {
          state.bunnyMedia.selectedNodeId = state.bunnyMedia.nodeOrder[0] || null;
        }
        saveState();
        captureMediaScroll();
        renderStepContent();
        restoreMediaScroll();
      };

      if (mode === 'none') {
        finish();
        return;
      }
      Promise.resolve(purgeNodeAssets(nodeId, mode)).then(finish).catch(finish);
    });
  }

  function bindMediaNodeDragDrop() {
    var list = rootEl.querySelector('#bunnyMediaNodeList');
    if (!list) return;
    var dragId = null;

    list.querySelectorAll('[data-media-node]').forEach(function (card) {
      card.addEventListener('dragstart', function (ev) {
        dragId = card.getAttribute('data-media-node');
        card.classList.add('is-dragging');
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = 'move';
          ev.dataTransfer.setData('text/plain', dragId || '');
        }
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('is-dragging');
        list.querySelectorAll('.is-drop-target').forEach(function (el) {
          el.classList.remove('is-drop-target');
        });
        dragId = null;
      });
      card.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        card.classList.add('is-drop-target');
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('is-drop-target');
      });
      card.addEventListener('drop', function (ev) {
        ev.preventDefault();
        card.classList.remove('is-drop-target');
        var targetId = card.getAttribute('data-media-node');
        var fromId = dragId || (ev.dataTransfer && ev.dataTransfer.getData('text/plain'));
        if (!fromId || !targetId || fromId === targetId) return;
        var order = (state.bunnyMedia.nodeOrder || []).slice();
        var fromIdx = order.indexOf(fromId);
        var toIdx = order.indexOf(targetId);
        if (fromIdx < 0 || toIdx < 0) return;
        order.splice(fromIdx, 1);
        toIdx = order.indexOf(targetId);
        order.splice(toIdx, 0, fromId);
        state.bunnyMedia.nodeOrder = order;
        captureMediaScroll();
        saveState();
        renderStepContent();
        restoreMediaScroll();
      });
    });
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
      '<p class="builder-step-desc">Biblioteca de imágenes asociables a proyecto, etapa, tipología, amenidad u otras entidades. El contenido actual se conserva.</p>' +
      '<div class="builder-dropzone" id="galleryDropzone">' +
        '<div class="builder-dropzone-inner"><span>Arrastra múltiples imágenes</span></div>' +
      '</div>' +
      '<input type="file" id="galleryInput" accept="image/*" multiple hidden>' +
      (items.length ? '<div class="builder-gallery-summary">' + items.length + ' imágenes' +
        ((state.architecture && state.architecture.mediaSlots)
          ? (' · ' + state.architecture.mediaSlots.filter(function (s) { return s.mediaKind === 'gallery'; }).length + ' slots')
          : '') +
        '</div>' : (structureAppliedHint())) +
      Object.keys(groups).map(function (cat) {
        return '<div class="builder-gallery-group"><div class="builder-gallery-group-label">' +
          AdminUI.escapeHtml(GalleryEngine.CATEGORIES[cat] ? GalleryEngine.CATEGORIES[cat].label : cat) +
          ' (' + groups[cat].length + ')</div><div class="builder-gallery-grid">' +
          groups[cat].map(function (item) {
            var ref = item.entityRef
              ? ((item.entityRef.type || '') + ':' + (item.entityRef.key || 'root'))
              : 'proyecto:root';
            return '<div class="builder-gallery-item" title="' + AdminUI.escapeHtml(item.name) + '">' +
              (item.previewUrl ? '<img src="' + AdminUI.escapeHtml(item.previewUrl) + '" alt="">' : '') +
              '<span class="builder-gallery-item-name">' + AdminUI.escapeHtml(item.name) + '</span>' +
              '<span class="builder-gallery-item-ref">' + AdminUI.escapeHtml(ref) + '</span></div>';
          }).join('') + '</div></div>';
      }).join('') +
      '</div>';
  }

  function structureAppliedHint() {
    var applied = !!(state.estructura && state.estructura.appliedAt) ||
      !!(state.architecture && state.architecture.appliedAt);
    return applied
      ? '<div class="builder-warn-banner">0 assets · slots listos tras aplicar estructura</div>'
      : '<div class="builder-warn-banner">Pendiente estructura</div>';
  }

  function renderPanoramas() {
    var items = state.panoramas || [];
    return '<div class="builder-step-content">' +
      stepTitleHtml('Recorridos 360°') +
      '<p class="builder-step-desc">Tours vinculables a tipologías, amenidades u otras entidades. Se reutiliza contenido; no se duplica por unidad idéntica.</p>' +
      '<div class="builder-dropzone" id="panoramaDropzone">' +
        '<div class="builder-dropzone-inner"><span class="builder-dropzone-icon">🔮</span><span>Arrastra panoramas 360°</span></div>' +
      '</div>' +
      '<input type="file" id="panoramaInput" accept="image/*" multiple hidden>' +
      (items.length ? '<div class="builder-pano-list">' +
        items.filter(function (p) { return p.file; }).map(function (p) {
          return '<div class="builder-pano-item">' +
            (p.previewUrl ? '<img src="' + AdminUI.escapeHtml(p.previewUrl) + '" alt="">' : '') +
            '<div class="builder-pano-info"><strong>' + AdminUI.escapeHtml(p.spaceLabel) + '</strong>' +
            '<span>' + AdminUI.escapeHtml(p.name) + '</span>' +
            (p.entityRef ? '<span class="builder-gallery-item-ref">' +
              AdminUI.escapeHtml((p.entityRef.type || '') + ':' + (p.entityRef.key || '')) + '</span>' : '') +
            '</div></div>';
        }).join('') + '</div>' : structureAppliedHint()) +
      '</div>';
  }

  function renderPlans() {
    return renderDocumentStep(
      'plans',
      'Planos',
      'Masterplan, plantas 2D/3D y planos de tipología. Relaciona cada asset a su contexto (torre, piso, modelo).',
      state.plans || []
    );
  }

  function renderDownloads() {
    return renderDocumentStep(
      'downloads',
      'Docs',
      'Documentos centralizados y relacionables: brochure, fichas, especificaciones y material comercial/técnico.',
      state.downloads || []
    );
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
    var intro =
      '<p class="builder-step-desc">Los hotspots no duplican inventario: solo posición, tipo visual y referencia a una entidad existente (vivienda, torre, amenidad, nodo).</p>';
    if (!suggestions.length) {
      return '<div class="builder-step-content">' +
        stepTitleHtml('Hotspots') +
        intro +
        '<button type="button" class="btn-primary" id="analyzeHotspotsBtn">Analizar y proponer hotspots</button>' +
        '</div>';
    }
    return '<div class="builder-step-content">' +
      stepTitleHtml('Sugerencias de hotspots') +
      intro +
      '<p class="builder-menu-hint">Selecciona cuáles aceptar. Asigna destino/entidad cuando corresponda.</p>' +
      '<div class="builder-hotspot-list">' +
        suggestions.map(function (hs) {
          var refLabel = hs.entityRef
            ? ((hs.entityRef.type || 'entidad') + ':' + (hs.entityRef.key || ''))
            : 'Sin destino';
          return '<label class="builder-hotspot-card' + (hs.accepted ? ' is-accepted' : '') + '">' +
            '<input type="checkbox" data-hotspot="' + hs.id + '"' + (hs.accepted ? ' checked' : '') + '>' +
            (hs.imagePreview ? '<img src="' + AdminUI.escapeHtml(hs.imagePreview) + '" alt="">' : '') +
            '<div class="builder-hotspot-info"><strong>' + AdminUI.escapeHtml(hs.label) + '</strong>' +
            '<span>Confianza: ' + Math.round(hs.confidence * 100) + '%</span>' +
            '<span class="builder-hotspot-ref">' + AdminUI.escapeHtml(refLabel) + '</span></div></label>';
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
      stepTitleHtml('Validación del showroom') +
      '<p class="builder-step-desc">Verifica relaciones, faltantes y referencias. Clasificación: OBLIGATORIO / RECOMENDADO / OPCIONAL.</p>' +
      '<div class="builder-validation-score">Completitud: ' + v.score + '%' +
        (v.pendingCount ? (' · ' + v.pendingCount + ' pendientes') : '') +
      '</div>' +
      '<div class="builder-checklist">' +
        v.checks.map(function (c) {
          var icon = c.passed ? '✓' : (c.optional ? '○' : '✗');
          var cls = c.passed ? 'is-pass' : (c.optional ? 'is-optional' : (c.recommended ? 'is-recommended' : 'is-fail'));
          var sev = c.severityLabel || (c.optional ? 'OPCIONAL' : (c.recommended ? 'RECOMENDADO' : 'OBLIGATORIO'));
          return '<div class="builder-check ' + cls + '"><span class="builder-check-icon">' + icon + '</span>' +
            '<span class="builder-check-sev">' + sev + '</span> ' +
            AdminUI.escapeHtml(c.label) +
            (c.detail ? ' <em>(' + AdminUI.escapeHtml(c.detail) + ')</em>' : '') +
            '</div>';
        }).join('') +
      '</div>' +
      (v.ready
        ? '<div class="builder-ready-banner">Listo para publicar (obligatorios OK)</div>'
        : '<div class="builder-warn-banner">Completa los elementos OBLIGATORIOS para continuar</div>') +
      '</div>';
  }

  function renderPublish() {
    var url = (state.publishResult && state.publishResult.url) || null;
    var lastAt = (state.publishResult && state.publishResult.publishedAt) || null;
    if (state.published && state.publishResult) {
      var r = state.publishResult;
      return '<div class="builder-step-content builder-publish-success">' +
        stepTitleHtml('Publicado') +
        '<div class="builder-publish-summary">' +
          summaryRow('Estado', 'Publicado') +
          summaryRow('Proyecto', (r.project && r.project.nombre) || '—') +
          summaryRow('URL', r.url || '—') +
          summaryRow('Última publicación', r.publishedAt || lastAt || '—') +
        '</div>' +
        (r.url ? '<a href="' + AdminUI.escapeHtml(r.url) + '" class="btn-primary" target="_blank" rel="noopener">Vista previa</a> ' : '') +
        '<button type="button" class="btn-ghost" id="publishBtn">Republicar</button> ' +
        '<button type="button" class="btn-ghost" id="newBuilderBtn">Crear otro proyecto</button></div>';
    }
    return '<div class="builder-step-content">' +
      stepTitleHtml('Publicado') +
      '<p class="builder-step-desc">Estado de salida del showroom. Publicar no rompe URLs existentes.</p>' +
      '<div class="builder-publish-summary">' +
        summaryRow('Estado', 'Borrador') +
        summaryRow('Preview', url || '—') +
        summaryRow('URL', url || '—') +
        summaryRow('Última publicación', '—') +
        summaryRow('Tipo', ProjectTypesEngine.getTypeLabel(state.projectType)) +
        summaryRow('Unidades', (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.activeUnitCount)
          ? ArchitectureEngine.activeUnitCount(state)
          : (state.viviendas || []).length) +
        summaryRow('Imágenes', (state.gallery || []).length) +
        summaryRow('360°', (state.panoramas || []).filter(function (p) { return p.file; }).length) +
        summaryRow('Planos', (state.plans || []).length) +
        summaryRow('Documentos', (state.downloads || []).length) +
      '</div>' +
      '<button type="button" class="btn-primary builder-publish-btn" id="publishBtn"' + (processing ? ' disabled' : '') + '>' +
        (processing ? 'Publicando...' : 'Publicar showroom') + '</button></div>';
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
    if (step.id !== 'estructura' && step.id !== 'project-type') projectTypePickerOpen = false;

    var html = '';
    switch (step.id) {
      case 'config': html = renderConfig(); break;
      case 'estructura':
      case 'project-type': html = renderEstructura(); break;
      case 'experiencia': html = renderExperiencia(); break;
      case 'branding': html = renderBranding(); break;
      case 'video-hero': html = renderVideoHero(); break;
      case 'menu': html = renderMenu(); break;
      case 'viviendas': html = renderViviendas(); break;
      case 'gallery': html = renderGallery(); break;
      case 'media': html = renderBunnyMedia(); break;
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
    if (typeof WorkspaceSelect !== 'undefined' && WorkspaceSelect.enhance) {
      WorkspaceSelect.enhance(panel);
    }
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

  function bindEstructuraEvents() {
    EstructuraEngine.ensureState(state);

    function persist() {
      state.estructura.dirty = true;
      state.estructura._draftSaved = false;
      state.projectType = state.estructura.developmentType;
      saveState();
      updateNavButtons();
      refreshEstructuraResumenIfOpen();
      updateEstructuraSectionHintsUi();
      updateEstructuraDraftStatusUi();
    }

    function refreshEstructuraResumenIfOpen() {
      if (!rootEl) return;
      var panel = rootEl.querySelector('[data-estructura-panel="resumen"]');
      if (!panel || !panel.open) return;
      var body = panel.querySelector('[data-estructura-resumen-body]');
      if (!body) return;
      body.innerHTML = buildEstructuraResumenHtml(state.estructura);
    }

    function updateEstructuraSectionHintsUi() {
      if (!rootEl || !state.estructura) return;
      var hints = buildEstructuraSectionHints(state.estructura);
      ['dev', 'org', 'tipologias', 'zonas'].forEach(function (key) {
        var panel = rootEl.querySelector('[data-estructura-panel="' + key + '"]');
        if (!panel) return;
        var summary = panel.querySelector('.builder-estructura-section__summary');
        if (!summary) return;
        var el = summary.querySelector('[data-estructura-hint="' + key + '"]');
        var text = hints[key] || '';
        if (!text) {
          if (el) el.remove();
          return;
        }
        if (!el) {
          el = document.createElement('span');
          el.className = 'builder-estructura-section__hint';
          el.setAttribute('data-estructura-hint', key);
          summary.appendChild(el);
        }
        el.textContent = text;
      });
    }

    function updateEstructuraDraftStatusUi() {
      if (!rootEl || !state.estructura) return;
      var el = rootEl.querySelector('[data-estructura-draft-status]');
      if (!el) return;
      if (state.estructura.dirty) {
        el.textContent = 'Cambios sin guardar';
        el.className = 'builder-estructura-draft-status is-dirty';
      } else if (state.estructura._draftSaved) {
        el.textContent = 'Guardado';
        el.className = 'builder-estructura-draft-status is-saved';
      } else {
        el.textContent = '';
        el.className = 'builder-estructura-draft-status';
      }
    }

    function rerender() {
      var scroller = rootEl.querySelector('.builder-workspace');
      var scrollTop = scroller ? scroller.scrollTop : 0;
      persist();
      renderStepContent();
      function restoreScroll() {
        var s = rootEl.querySelector('.builder-workspace');
        if (s) s.scrollTop = scrollTop;
      }
      restoreScroll();
      requestAnimationFrame(function () {
        restoreScroll();
        requestAnimationFrame(restoreScroll);
      });
    }

    function tipologiaTitleText(tip) {
      if (!tip) return 'Tipología';
      var base = tip.nombre || (tip.modelo ? ('Modelo ' + tip.modelo) : 'Tipología');
      var n = EstructuraEngine.getTipAssigned ? EstructuraEngine.getTipAssigned(tip) : 0;
      return n > 0 ? (base + ' · ' + n + ' u.') : base;
    }

    function updateTipologiaTitle(card, tip) {
      var tipTitle = card && card.querySelector('[data-tipologia-title]');
      if (!tipTitle) return;
      var base = tip && (tip.nombre || (tip.modelo ? ('Modelo ' + tip.modelo) : 'Tipología'));
      if (!base) base = 'Tipología';
      var n = tip && EstructuraEngine.getTipAssigned ? EstructuraEngine.getTipAssigned(tip) : 0;
      tipTitle.innerHTML = AdminUI.escapeHtml(base) +
        (n > 0
          ? ' <span class="builder-estructura-acc__qty">· ' + n + ' u.</span>'
          : '');
    }

    function updateConjuntoTotalViviendasDisplay() {
      var el = rootEl.querySelector('[data-cj-total-viviendas]');
      if (!el || !state.estructura) return;
      if (EstructuraEngine.syncConjuntoDerivedTotals) {
        EstructuraEngine.syncConjuntoDerivedTotals(state.estructura);
      }
      el.textContent = String(
        state.estructura.totalViviendas != null ? state.estructura.totalViviendas : 0
      );
    }

    function updateConjuntoCompCapDisplay(compEl) {
      if (!compEl || !state.estructura) return;
      var capEl = compEl.querySelector('[data-cj-comp-cap]');
      if (!capEl) return;
      var compId = compEl.getAttribute('data-cj-comp');
      var stageId = compEl.getAttribute('data-cj-stage') || '';
      var cfg = state.estructura.conjuntoConfig;
      if (!cfg) return;
      var list = null;
      if (stageId) {
        var st = (cfg.stages || []).find(function (s) { return s.localId === stageId; });
        list = st ? st.components : null;
      } else {
        list = cfg.components;
      }
      var comp = list && list.find(function (c) { return c.localId === compId; });
      if (!comp || !EstructuraEngine.conjuntoComponentHousingUnits) return;
      capEl.textContent = String(EstructuraEngine.conjuntoComponentHousingUnits(comp));
    }

    function closeAllWsPopovers() {
      rootEl.querySelectorAll(
        '.builder-ambiente-picker__panel, .ws-ms__panel, [data-amb-panel], [data-zones-panel], [data-org-levels-panel], [data-mixto-comps-panel], [data-cj-comp-panel]'
      ).forEach(function (p) {
        p.hidden = true;
      });
      rootEl.querySelectorAll(
        '[data-ws-ms], [data-amb-picker], [data-zones-picker], [data-org-levels-picker], [data-mixto-comps-picker], [data-cj-comp-picker]'
      ).forEach(function (p) {
        p.classList.remove('is-open');
      });
      rootEl.querySelectorAll(
        '[data-amb-picker-open], [data-zones-picker-open], [data-org-levels-open], [data-mixto-comps-open], [data-cj-comp-picker-open]'
      ).forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
      rootEl.querySelectorAll('[data-amb-custom-wrap]').forEach(function (w) {
        w.hidden = true;
      });
      rootEl.querySelectorAll('[data-amb-pick-other]').forEach(function (cb) {
        cb.checked = false;
      });
      rootEl.querySelectorAll('[data-amb-custom-name]').forEach(function (inp) {
        inp.value = '';
      });
    }

    if (rootEl._wsMsOutside) {
      document.removeEventListener('pointerdown', rootEl._wsMsOutside, true);
    }
    if (rootEl._wsMsEscape) {
      document.removeEventListener('keydown', rootEl._wsMsEscape, true);
    }

    rootEl._wsMsOutside = function (ev) {
      var openPanel = rootEl.querySelector(
        '.builder-ambiente-picker__panel:not([hidden]), .ws-ms__panel:not([hidden]), [data-amb-panel]:not([hidden]), [data-zones-panel]:not([hidden]), [data-org-levels-panel]:not([hidden]), [data-mixto-comps-panel]:not([hidden]), [data-cj-comp-panel]:not([hidden])'
      );
      if (!openPanel) return;
      var host = openPanel.closest(
        '[data-ws-ms], [data-amb-picker], [data-zones-picker], [data-org-levels-picker], [data-mixto-comps-picker], [data-cj-comp-picker]'
      );
      if (host && host.contains(ev.target)) return;
      closeAllWsPopovers();
    };
    rootEl._wsMsEscape = function (ev) {
      if (ev.key !== 'Escape') return;
      var openPanel = rootEl.querySelector(
        '.builder-ambiente-picker__panel:not([hidden]), .ws-ms__panel:not([hidden]), [data-amb-panel]:not([hidden]), [data-zones-panel]:not([hidden]), [data-org-levels-panel]:not([hidden]), [data-mixto-comps-panel]:not([hidden]), [data-cj-comp-panel]:not([hidden])'
      );
      if (!openPanel) return;
      ev.preventDefault();
      closeAllWsPopovers();
    };
    document.addEventListener('pointerdown', rootEl._wsMsOutside, true);
    document.addEventListener('keydown', rootEl._wsMsEscape, true);

    rootEl.querySelectorAll('[data-estructura-panel]').forEach(function (panel) {
      panel.addEventListener('toggle', function () {
        var key = panel.getAttribute('data-estructura-panel');
        if (!key) return;
        if (!state.estructura.openPanels) state.estructura.openPanels = {};
        state.estructura.openPanels[key] = panel.open;
        /* Refresh derived resumen from live state without full step rerender */
        if (key === 'resumen' && panel.open) {
          var body = panel.querySelector('[data-estructura-resumen-body]');
          if (body) body.innerHTML = buildEstructuraResumenHtml(state.estructura);
        }
        saveState();
      });
    });

    var expandAllBtn = rootEl.querySelector('#builderEstructuraExpandAll');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var e = state.estructura;
        if (!e) return;
        var expand = !e.uiExpandAll;
        e.uiExpandAll = expand;
        if (!e.openPanels) e.openPanels = {};
        ['dev', 'org', 'tipologias', 'zonas', 'resumen'].forEach(function (key) {
          e.openPanels[key] = expand;
        });
        (e.buildings || []).forEach(function (b) { b.open = expand; });
        (e.tipologias || []).forEach(function (tip) {
          tip.open = expand;
          (tip.plantas || []).forEach(function (pl) { pl.open = expand; });
        });
        if (e.conjuntoConfig) {
          (e.conjuntoConfig.stages || []).forEach(function (st) {
            st.open = expand;
          });
        }
        persist();
        rerender();
      });
    }

    rootEl.querySelectorAll('[data-dev-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        EstructuraEngine.setDevelopmentType(state, btn.getAttribute('data-dev-type'));
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-edificio-mode]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        EstructuraEngine.setEdificioMode(state, input.getAttribute('data-edificio-mode'));
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-unidad-housing]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.estructura.unidadHousingType = input.getAttribute('data-unidad-housing');
        var wantProd = state.estructura.unidadHousingType === 'apartamento'
          ? 'apartamento'
          : 'casa_unifamiliar';
        (state.estructura.tipologias || []).forEach(function (t) {
          if (t._autoFromStructure || t.structureKey) {
            t.producto = wantProd;
            t.structureKey = wantProd + '::';
            t.nombre = '';
          }
        });
        if (EstructuraEngine.syncTipologiasFromStructure) {
          EstructuraEngine.syncTipologiasFromStructure(state.estructura);
        }
        EstructuraEngine.syncTypologyPlantas(state.estructura);
        persist();
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-lotes-subtype]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.estructura.lotesSubtype = input.getAttribute('data-lotes-subtype');
        var wantProd = state.estructura.lotesSubtype === 'campestre'
          ? 'lote_campestre'
          : 'lote_urbano';
        (state.estructura.tipologias || []).forEach(function (t) {
          if (t._autoFromStructure || t.structureKey) {
            t.producto = wantProd;
            t.structureKey = wantProd + '::';
            t.nombre = '';
          }
        });
        if (EstructuraEngine.syncTipologiasFromStructure) {
          EstructuraEngine.syncTipologiasFromStructure(state.estructura);
        }
        persist();
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-cj-use-stages]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        EstructuraEngine.setConjuntoUseStages(state, input.getAttribute('data-cj-use-stages') === '1');
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-cj-add-stage]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        EstructuraEngine.addConjuntoStage(state);
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-cj-stage-card]').forEach(function (card) {
      var stageId = card.getAttribute('data-cj-stage-card');
      card.addEventListener('toggle', function () {
        EstructuraEngine.updateConjuntoStage(state, stageId, { open: card.open });
        persist();
      });
      var nameInput = card.querySelector('[data-cj-stage-nombre]');
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          EstructuraEngine.updateConjuntoStage(state, stageId, { nombre: nameInput.value });
          var titleEl = card.querySelector('[data-cj-stage-title]');
          if (titleEl) {
            titleEl.textContent = String(nameInput.value || '').trim() || 'Etapa';
          }
          persist();
        });
      }
    });

    rootEl.querySelectorAll('[data-cj-comp-picker]').forEach(function (picker) {
      var openBtn = picker.querySelector('[data-cj-comp-picker-open]');
      var panel = picker.querySelector('[data-cj-comp-panel]') || picker.querySelector('.ws-ms__panel');
      if (!openBtn || !panel) return;
      var stageId = picker.getAttribute('data-cj-stage') || '';

      openBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var opening = panel.hidden;
        closeAllWsPopovers();
        if (!opening) return;
        panel.hidden = false;
        openBtn.setAttribute('aria-expanded', 'true');
        picker.classList.add('is-open');
      });

      panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
      panel.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });

      picker.querySelectorAll('[data-cj-add-type]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          EstructuraEngine.addConjuntoComponent(
            state,
            btn.getAttribute('data-cj-add-type'),
            stageId || null
          );
          closeAllWsPopovers();
          rerender();
        });
      });
    });

    rootEl.querySelectorAll('[data-cj-comp]').forEach(function (row) {
      var compId = row.getAttribute('data-cj-comp');
      var stageId = row.getAttribute('data-cj-stage') || '';
      var nameInput = row.querySelector('[data-cj-comp-nombre]');
      if (nameInput) {
        nameInput.addEventListener('input', function () {
          EstructuraEngine.updateConjuntoComponent(
            state,
            compId,
            { nombre: nameInput.value },
            stageId || null
          );
          persist();
        });
        nameInput.addEventListener('change', function () {
          EstructuraEngine.updateConjuntoComponent(
            state,
            compId,
            { nombre: nameInput.value },
            stageId || null
          );
          persist();
        });
      }
      var rm = row.querySelector('[data-cj-comp-remove]');
      if (rm) {
        rm.addEventListener('click', function (ev) {
          ev.preventDefault();
          EstructuraEngine.removeConjuntoComponent(state, compId, stageId || null);
          rerender();
        });
      }

      row.querySelectorAll('[data-cj-edificio-mode]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.checked) return;
          EstructuraEngine.updateConjuntoComponent(
            state,
            compId,
            { edificioMode: input.getAttribute('data-cj-edificio-mode') },
            stageId || null
          );
          rerender();
        });
      });

      var addTowerBtn = row.querySelector('[data-cj-tower-add]');
      if (addTowerBtn) {
        addTowerBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          EstructuraEngine.addConjuntoEdificioTower(state, compId, stageId || null);
          rerender();
        });
      }

      row.querySelectorAll('[data-cj-tower]').forEach(function (towerCard) {
        var towerId = towerCard.getAttribute('data-cj-tower');
        var twName = towerCard.querySelector('[data-cj-tower-nombre]');
        if (twName) {
          twName.addEventListener('input', function () {
            EstructuraEngine.updateConjuntoEdificioTower(
              state, compId, towerId, { nombre: twName.value }, stageId || null
            );
            var titleEl = towerCard.querySelector('[data-cj-tower-title]');
            if (titleEl) {
              titleEl.textContent = String(twName.value || '').trim() || 'Torre';
            }
            persist();
          });
        }
        var twRm = towerCard.querySelector('[data-cj-tower-remove]');
        if (twRm) {
          twRm.addEventListener('click', function (ev) {
            ev.preventDefault();
            EstructuraEngine.removeConjuntoEdificioTower(
              state, compId, towerId, stageId || null
            );
            rerender();
          });
        }
        towerCard.addEventListener('toggle', function () {
          EstructuraEngine.updateConjuntoEdificioTower(
            state, compId, towerId, { open: towerCard.open }, stageId || null
          );
        });
      });
    });

    rootEl.querySelectorAll('[data-mixto-comp]').forEach(function (input) {
      input.addEventListener('change', function () {
        EstructuraEngine.toggleMixtoComponent(state, input.getAttribute('data-mixto-comp'), input.checked);
        rerender();
      });
    });

    function bindFlagsMultiselect(cfg) {
      rootEl.querySelectorAll(cfg.pickerSel).forEach(function (picker) {
        var openBtn = picker.querySelector(cfg.openSel);
        var panel = picker.querySelector(cfg.panelSel) || picker.querySelector('.ws-ms__panel');
        var labelEl = picker.querySelector(cfg.labelSel);
        var summaryEl = picker.querySelector(cfg.summarySel);
        if (!openBtn || !panel) return;

        function selectedOptions() {
          return (cfg.options() || []).filter(function (o) { return o.on; });
        }

        function triggerText(n) {
          if (n > 0) return cfg.countTrigger(n);
          return cfg.emptyTrigger;
        }

        function renderSummary() {
          if (!summaryEl) return;
          var selected = selectedOptions();
          summaryEl.innerHTML = selected.map(function (o) {
            return '<span class="ws-ms__chip">' +
              '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(o.label) + '</span>' +
              '<button type="button" class="ws-ms__chip-remove" ' + cfg.chipAttr + '="' +
                AdminUI.escapeHtml(o.key) + '" aria-label="Quitar ' +
                AdminUI.escapeHtml(o.label) + '">×</button>' +
            '</span>';
          }).join('');
        }

        function syncUi() {
          var opts = cfg.options() || [];
          var map = {};
          opts.forEach(function (o) { map[o.key] = !!o.on; });
          if (labelEl) labelEl.textContent = triggerText(opts.filter(function (o) { return o.on; }).length);
          picker.querySelectorAll('[' + cfg.pickAttr + ']').forEach(function (cb) {
            var key = cb.getAttribute(cfg.pickAttr);
            cb.checked = !!map[key];
          });
          renderSummary();
        }

        openBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var opening = panel.hidden;
          closeAllWsPopovers();
          if (!opening) return;
          panel.hidden = false;
          openBtn.setAttribute('aria-expanded', 'true');
          picker.classList.add('is-open');
          syncUi();
        });

        panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
        panel.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
        panel.addEventListener('wheel', function (ev) { ev.stopPropagation(); }, { passive: true });

        picker.querySelectorAll('[' + cfg.pickAttr + ']').forEach(function (cb) {
          cb.addEventListener('click', function (ev) { ev.stopPropagation(); });
          cb.addEventListener('change', function (ev) {
            ev.stopPropagation();
            var key = cb.getAttribute(cfg.pickAttr);
            cfg.setOn(key, !!cb.checked);
            if (cfg.rerender) {
              rerender();
              return;
            }
            syncUi();
            persist();
          });
        });

        if (summaryEl) {
          summaryEl.addEventListener('click', function (ev) {
            var btn = ev.target && ev.target.closest
              ? ev.target.closest('[' + cfg.chipAttr + ']')
              : null;
            if (!btn) return;
            ev.preventDefault();
            ev.stopPropagation();
            cfg.setOn(btn.getAttribute(cfg.chipAttr), false);
            if (cfg.rerender) {
              rerender();
              return;
            }
            syncUi();
            persist();
          });
        }
      });
    }

    bindFlagsMultiselect({
      pickerSel: '[data-org-levels-picker]',
      openSel: '[data-org-levels-open]',
      panelSel: '[data-org-levels-panel]',
      labelSel: '[data-org-levels-label]',
      summarySel: '[data-org-levels-summary]',
      pickAttr: 'data-org-level-pick',
      chipAttr: 'data-org-level-chip-remove',
      emptyTrigger: 'Seleccionar organización',
      countTrigger: function (n) {
        return 'Organización · ' + n + ' seleccionada' + (n === 1 ? '' : 's');
      },
      options: function () {
        var st = state.estructura;
        return [
          { key: 'orgEtapas', label: 'Etapas / Fases', on: !!st.orgEtapas },
          { key: 'orgSectores', label: 'Sectores', on: !!st.orgSectores },
          { key: 'orgManzanas', label: 'Manzanas / Clústeres', on: !!st.orgManzanas }
        ];
      },
      setOn: function (key, want) {
        if (!key) return;
        state.estructura[key] = !!want;
      },
      rerender: false
    });

    bindFlagsMultiselect({
      pickerSel: '[data-mixto-comps-picker]',
      openSel: '[data-mixto-comps-open]',
      panelSel: '[data-mixto-comps-panel]',
      labelSel: '[data-mixto-comps-label]',
      summarySel: '[data-mixto-comps-summary]',
      pickAttr: 'data-mixto-comp-pick',
      chipAttr: 'data-mixto-comp-chip-remove',
      emptyTrigger: 'Seleccionar componentes',
      countTrigger: function (n) {
        return 'Componentes · ' + n + ' seleccionado' + (n === 1 ? '' : 's');
      },
      options: function () {
        var m = state.estructura.mixto || {};
        return [
          { key: 'edificios', label: 'Edificios / Torres', on: !!m.edificios },
          { key: 'casas', label: 'Casas', on: !!m.casas },
          { key: 'lotes', label: 'Lotes', on: !!m.lotes }
        ];
      },
      setOn: function (key, want) {
        EstructuraEngine.toggleMixtoComponent(state, key, want);
      },
      rerender: true
    });

    var addTowerBtn = rootEl.querySelector('#builderAddTowerBtn');
    if (addTowerBtn) {
      addTowerBtn.addEventListener('click', function () {
        EstructuraEngine.addBuilding(state);
        rerender();
      });
    }

    function applyStepperValue(el, raw) {
      var field = el.getAttribute('data-stepper');
      var min = parseInt(el.getAttribute('data-min'), 10);
      var max = parseInt(el.getAttribute('data-max'), 10);
      if (isNaN(min)) min = 0;
      if (isNaN(max)) max = 99999;
      var e = state.estructura;
      var buildingEl = el.closest('[data-building]');
      var tipEl = el.closest('[data-tipologia]');
      var n = EstructuraEngine.clampInt(raw, min, max, min);

      if (field === 'towerCount') {
        EstructuraEngine.setTowerCount(state, n);
        return true;
      }
      if (field === 'unidadCount') {
        e.unidadCount = n;
        e.totalViviendas = n;
        return true;
      }
      if (field === 'totalViviendas') {
        e.totalViviendas = n;
        return true;
      }
      if (field === 'totalLotes') {
        e.totalLotes = n;
        return true;
      }
      if (field === 'tipologiasCount') {
        EstructuraEngine.setTypologyCount(state, n);
        return true;
      }
      if (field === 'cj.cantidad' || field === 'cj.pisos' || field === 'cj.unidadesPorPiso') {
        var compEl = el.closest('[data-cj-comp]');
        if (!compEl) return false;
        var stageId = compEl.getAttribute('data-cj-stage') || '';
        var patch = {};
        if (field === 'cj.cantidad') patch.cantidad = n;
        if (field === 'cj.pisos') patch.pisos = n;
        if (field === 'cj.unidadesPorPiso') patch.unidadesPorPiso = n;
        EstructuraEngine.updateConjuntoComponent(
          state,
          compEl.getAttribute('data-cj-comp'),
          patch,
          stageId || null
        );
        return true;
      }
      if (field === 'cj.tw.pisos' || field === 'cj.tw.unidadesPorPiso') {
        var towerEl = el.closest('[data-cj-tower]');
        var compElTw = el.closest('[data-cj-comp]');
        if (!towerEl || !compElTw) return false;
        var stageIdTw = compElTw.getAttribute('data-cj-stage') || '';
        var twPatch = {};
        if (field === 'cj.tw.pisos') twPatch.pisos = n;
        if (field === 'cj.tw.unidadesPorPiso') twPatch.unidadesPorPiso = n;
        EstructuraEngine.updateConjuntoEdificioTower(
          state,
          compElTw.getAttribute('data-cj-comp'),
          towerEl.getAttribute('data-cj-tower'),
          twPatch,
          stageIdTw || null
        );
        return true;
      }
      if (buildingEl && field.indexOf('b.') === 0) {
        var b = e.buildings.find(function (x) {
          return x.localId === buildingEl.getAttribute('data-building');
        });
        if (b) b[field.slice(2)] = n;
        return true;
      }
      if (tipEl && field.indexOf('t.assign.') === 0) {
        var tipAssign = e.tipologias.find(function (x) {
          return x.localId === tipEl.getAttribute('data-tipologia');
        });
        if (tipAssign) {
          EstructuraEngine.setTipAssigned(tipAssign, field.slice('t.assign.'.length), n);
        }
        return true;
      }
      if (tipEl && field.indexOf('t.') === 0) {
        var tip = e.tipologias.find(function (x) {
          return x.localId === tipEl.getAttribute('data-tipologia');
        });
        if (tip) {
          tip[field.slice(2)] = n;
          if (field === 't.plantas_internas') EstructuraEngine.syncTypologyPlantas(e);
        }
        return true;
      }
      return false;
    }

    rootEl.querySelectorAll('.builder-estructura-stepper').forEach(function (el) {
      function refreshStepperInput() {
        var field = el.getAttribute('data-stepper');
        var input = el.querySelector('[data-stepper-input]');
        if (!input || !field) return;
        var e = state.estructura;
        if (field === 'cj.cantidad' || field === 'cj.pisos' || field === 'cj.unidadesPorPiso') {
          var compEl = el.closest('[data-cj-comp]');
          if (!compEl || !e.conjuntoConfig) return;
          var compId = compEl.getAttribute('data-cj-comp');
          var stageId = compEl.getAttribute('data-cj-stage') || '';
          var list = null;
          if (stageId) {
            var st = (e.conjuntoConfig.stages || []).find(function (s) {
              return s.localId === stageId;
            });
            list = st ? st.components : null;
          } else {
            list = e.conjuntoConfig.components;
          }
          var comp = list && list.find(function (c) { return c.localId === compId; });
          if (!comp) return;
          if (field === 'cj.cantidad') input.value = String(comp.cantidad);
          if (field === 'cj.pisos') input.value = String(comp.pisos != null ? comp.pisos : 5);
          if (field === 'cj.unidadesPorPiso') {
            input.value = String(comp.unidadesPorPiso != null ? comp.unidadesPorPiso : 4);
          }
          return;
        }
        if (field === 'cj.tw.pisos' || field === 'cj.tw.unidadesPorPiso') {
          var towerElR = el.closest('[data-cj-tower]');
          var compElR = el.closest('[data-cj-comp]');
          if (!towerElR || !compElR || !e.conjuntoConfig) return;
          var stageIdR = compElR.getAttribute('data-cj-stage') || '';
          var listR = null;
          if (stageIdR) {
            var stR = (e.conjuntoConfig.stages || []).find(function (s) {
              return s.localId === stageIdR;
            });
            listR = stR ? stR.components : null;
          } else {
            listR = e.conjuntoConfig.components;
          }
          var compR = listR && listR.find(function (c) {
            return c.localId === compElR.getAttribute('data-cj-comp');
          });
          var twR = compR && (compR.towers || []).find(function (t) {
            return t.localId === towerElR.getAttribute('data-cj-tower');
          });
          if (!twR) return;
          if (field === 'cj.tw.pisos') input.value = String(twR.pisos != null ? twR.pisos : 5);
          if (field === 'cj.tw.unidadesPorPiso') {
            input.value = String(twR.unidadesPorPiso != null ? twR.unidadesPorPiso : 4);
          }
          return;
        }
        if (field.indexOf('t.assign.') === 0) {
          var tipElAssign = el.closest('[data-tipologia]');
          if (!tipElAssign) return;
          var tipAssign = e.tipologias.find(function (x) {
            return x.localId === tipElAssign.getAttribute('data-tipologia');
          });
          if (tipAssign) {
            input.value = String(
              EstructuraEngine.getTipAssigned(tipAssign, field.slice('t.assign.'.length))
            );
          }
          return;
        }
        if (field.indexOf('t.') === 0) {
          var tipEl = el.closest('[data-tipologia]');
          if (!tipEl) return;
          var tip = e.tipologias.find(function (x) {
            return x.localId === tipEl.getAttribute('data-tipologia');
          });
          if (tip) input.value = String(tip[field.slice(2)] != null ? tip[field.slice(2)] : 0);
        }
      }

      function updateAssignmentBalanceDisplay() {
        var host = rootEl.querySelector('[data-estructura-assign-balance]');
        if (!host) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = buildAssignmentBalanceHtml(state.estructura);
        var next = wrap.firstChild;
        if (next) host.parentNode.replaceChild(next, host);
        rootEl.querySelectorAll('[data-tipologia]').forEach(function (card) {
          var tip = state.estructura.tipologias.find(function (x) {
            return x.localId === card.getAttribute('data-tipologia');
          });
          if (!tip) return;
          var titleEl = card.querySelector('[data-tipologia-title]');
          if (!titleEl) return;
          var base = tip.nombre || (tip.modelo ? ('Modelo ' + tip.modelo) : 'Tipología');
          var n = EstructuraEngine.getTipAssigned(tip);
          titleEl.innerHTML = AdminUI.escapeHtml(base) +
            (n > 0
              ? ' <span class="builder-estructura-acc__qty">· ' + n + ' u.</span>'
              : '');
        });
      }

      function applyLocalStepper(raw) {
        var field = el.getAttribute('data-stepper');
        var applied = applyStepperValue(el, raw);
        if (!applied) return false;
        var localOnly = field === 'cj.cantidad' ||
          field === 'cj.pisos' ||
          field === 'cj.unidadesPorPiso' ||
          field === 'cj.tw.pisos' ||
          field === 'cj.tw.unidadesPorPiso' ||
          (field && field.indexOf('t.assign.') === 0) ||
          (field && field.indexOf('t.') === 0 && field !== 't.plantas_internas');
        if (localOnly) {
          refreshStepperInput();
          if (field === 'cj.cantidad' || field === 'cj.pisos' || field === 'cj.unidadesPorPiso' ||
              field === 'cj.tw.pisos' || field === 'cj.tw.unidadesPorPiso') {
            updateConjuntoTotalViviendasDisplay();
            updateConjuntoCompCapDisplay(el.closest('[data-cj-comp]'));
            updateAssignmentBalanceDisplay();
          }
          if (field && field.indexOf('t.assign.') === 0) updateAssignmentBalanceDisplay();
          persist();
          return true;
        }
        rerender();
        return true;
      }

      el.querySelectorAll('[data-step]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var delta = parseInt(btn.getAttribute('data-step'), 10) || 0;
          var input = el.querySelector('[data-stepper-input]');
          var cur = input ? parseInt(input.value, 10) : 0;
          if (isNaN(cur)) cur = 0;
          applyLocalStepper(cur + delta);
        });
      });
      var input = el.querySelector('[data-stepper-input]');
      if (input) {
        input.addEventListener('wheel', function (ev) {
          if (document.activeElement === input) ev.preventDefault();
        }, { passive: false });
        input.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            applyLocalStepper(input.value);
          }
        });
        input.addEventListener('change', function () {
          applyLocalStepper(input.value);
        });
        input.addEventListener('blur', function () {
          applyStepperValue(el, input.value);
          persist();
          var min = parseInt(el.getAttribute('data-min'), 10);
          var max = parseInt(el.getAttribute('data-max'), 10);
          input.value = String(EstructuraEngine.clampInt(input.value, min, max, min));
          if (el.getAttribute('data-stepper') === 'cj.cantidad' ||
              el.getAttribute('data-stepper') === 'cj.pisos' ||
              el.getAttribute('data-stepper') === 'cj.unidadesPorPiso' ||
              String(el.getAttribute('data-stepper') || '').indexOf('cj.tw.') === 0) {
            updateConjuntoTotalViviendasDisplay();
            updateConjuntoCompCapDisplay(el.closest('[data-cj-comp]'));
            if (typeof updateAssignmentBalanceDisplay === 'function') {
              updateAssignmentBalanceDisplay();
            }
          }
          if (String(el.getAttribute('data-stepper') || '').indexOf('t.assign.') === 0) {
            updateAssignmentBalanceDisplay();
          }
        });
      }
    });

    rootEl.querySelectorAll('[data-building]').forEach(function (card) {
      var id = card.getAttribute('data-building');
      card.querySelectorAll('[data-b-field]').forEach(function (input) {
        var ev = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(ev, function () {
          var b = state.estructura.buildings.find(function (x) { return x.localId === id; });
          if (!b) return;
          var f = input.getAttribute('data-b-field');
          if (input.type === 'checkbox') b[f] = !!input.checked;
          else b[f] = input.value;
          if (f === 'nombre') {
            var titleEl = card.querySelector('[data-building-title]');
            if (titleEl) {
              titleEl.textContent = String(input.value || '').trim() || 'Torre';
            }
          }
          persist();
        });
        if (input.type !== 'checkbox') {
          input.addEventListener('change', function () {
            var b = state.estructura.buildings.find(function (x) { return x.localId === id; });
            if (!b) return;
            var f = input.getAttribute('data-b-field');
            b[f] = input.value;
            if (f === 'nombre') {
              var titleEl = card.querySelector('[data-building-title]');
              if (titleEl) {
                titleEl.textContent = String(input.value || '').trim() || 'Torre';
              }
            }
            persist();
          });
        }
      });
      card.addEventListener('toggle', function () {
        var b = state.estructura.buildings.find(function (x) { return x.localId === id; });
        if (b) b.open = card.open;
      });
    });

    rootEl.querySelectorAll('[data-copy-building]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        EstructuraEngine.copyBuildingConfig(state, btn.getAttribute('data-copy-building'));
        AdminNotify.success('Configuración copiada a las demás torres.');
        rerender();
      });
    });

    rootEl.querySelectorAll('[data-estructura-field]').forEach(function (input) {
      input.addEventListener('change', function () {
        var f = input.getAttribute('data-estructura-field');
        state.estructura[f] = input.type === 'checkbox' ? !!input.checked : input.value;
        persist();
      });
    });

    rootEl.querySelectorAll('[data-tipologia]').forEach(function (card) {
      var id = card.getAttribute('data-tipologia');
      card.querySelectorAll('[data-t-field]').forEach(function (input) {
        var ev = input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(ev, function () {
          var tip = state.estructura.tipologias.find(function (x) { return x.localId === id; });
          if (!tip) return;
          var f = input.getAttribute('data-t-field');
          var val = input.value;
          var prevProducto = tip.producto;
          if (f === 'area_m2' || f === 'area_privada_m2' || f === 'area_lote_m2' || f === 'precio') {
            tip[f] = val === '' ? null : Number(val);
          } else if (f === 'componente') {
            tip.componente = val;
            tip.producto = '';
            tip.nombre = '';
            var prods = EstructuraEngine.productsFor(state.estructura.developmentType, {
              componente: val,
              unidadHousingType: state.estructura.unidadHousingType
            });
            tip.producto = prods[0] ? prods[0].id : tip.producto;
            if (EstructuraEngine.pruneTipologiaAsignaciones) {
              EstructuraEngine.pruneTipologiaAsignaciones(state.estructura, tip);
            }
            EstructuraEngine.syncTypologyPlantas(state.estructura);
            persist();
            rerender();
            return;
          } else {
            tip[f] = val;
          }
          tip.nombre = '';
          EstructuraEngine.syncTypologyPlantas(state.estructura);
          persist();
          updateTipologiaTitle(card, tip);

          /* Producto may switch casa/apto field layout — only then rebuild.
             Never rebuild on Modelo / areas / precio (scroll + focus jump). */
          if (f === 'producto') {
            var prevFam = EstructuraEngine.familyFromProducto
              ? EstructuraEngine.familyFromProducto(prevProducto)
              : null;
            var nextFam = EstructuraEngine.familyFromProducto
              ? EstructuraEngine.familyFromProducto(tip.producto)
              : null;
            if (prevFam && nextFam && prevFam !== nextFam) {
              rerender();
            }
          }
        });
      });
      card.addEventListener('toggle', function () {
        var tip = state.estructura.tipologias.find(function (x) { return x.localId === id; });
        if (tip) tip.open = card.open;
      });

      card.querySelectorAll('[data-amb-picker]').forEach(function (picker) {
        var openBtn = picker.querySelector('[data-amb-picker-open]');
        var panel = picker.querySelector('[data-amb-panel]') ||
          picker.querySelector('.builder-ambiente-picker__panel') ||
          picker.querySelector('.ws-ms__panel');
        var customWrap = picker.querySelector('[data-amb-custom-wrap]');
        var customInput = picker.querySelector('[data-amb-custom-name]');
        var summaryEl = picker.querySelector('[data-amb-summary]');
        if (!openBtn || !panel) return;

        var tipId = picker.getAttribute('data-tipologia-id') || id;
        var plantaKey = picker.getAttribute('data-planta-id') || '';

        function tipRef() {
          return state.estructura.tipologias.find(function (x) { return x.localId === tipId; });
        }

        function ambientesHere() {
          var tip = tipRef();
          if (!tip || !Array.isArray(tip.ambientes)) return [];
          return tip.ambientes.filter(function (a) {
            return plantaKey ? a.plantaLocalId === plantaKey : !a.plantaLocalId;
          });
        }

        function renderSummary() {
          if (!summaryEl) return;
          summaryEl.innerHTML = ambientesHere().map(function (a) {
            return '<span class="ws-ms__chip">' +
              '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(a.nombre) + '</span>' +
              '<button type="button" class="ws-ms__chip-remove" data-amb-chip-remove="' +
                AdminUI.escapeHtml(a.localId) + '" aria-label="Quitar ' +
                AdminUI.escapeHtml(a.nombre) + '">×</button>' +
            '</span>';
          }).join('');
        }

        function syncCheckboxes() {
          var names = {};
          ambientesHere().forEach(function (a) { names[a.nombre] = true; });
          picker.querySelectorAll('[data-amb-pick]').forEach(function (cb) {
            if (cb.getAttribute('data-amb-pick-other') === '1') return;
            var n = cb.getAttribute('data-amb-pick');
            cb.checked = !!names[n];
          });
        }

        function syncUi() {
          syncCheckboxes();
          renderSummary();
        }

        function addAmbiente(nombre) {
          var tip = tipRef();
          var name = String(nombre || '').trim();
          if (!tip || !name) return false;
          var exists = tip.ambientes.some(function (a) {
            if (a.nombre !== name) return false;
            return plantaKey ? a.plantaLocalId === plantaKey : !a.plantaLocalId;
          });
          if (exists) return false;
          tip.ambientes.push(EstructuraEngine.emptyAmbiente(name, plantaKey || null));
          return true;
        }

        function removeAmbienteByName(nombre) {
          var tip = tipRef();
          if (!tip) return;
          tip.ambientes = tip.ambientes.filter(function (a) {
            if (a.nombre !== nombre) return true;
            return plantaKey ? a.plantaLocalId !== plantaKey : !!a.plantaLocalId;
          });
        }

        function removeAmbienteById(localId) {
          var tip = tipRef();
          if (!tip || !localId) return;
          tip.ambientes = tip.ambientes.filter(function (a) { return a.localId !== localId; });
        }

        function refreshOtherUi() {
          var otherCb = picker.querySelector('[data-amb-pick-other]');
          var otherOn = !!(otherCb && otherCb.checked);
          if (customWrap) customWrap.hidden = !otherOn;
          if (otherOn && customInput) {
            try { customInput.focus({ preventScroll: true }); } catch (err) {
              try { customInput.focus(); } catch (err2) { /* ignore */ }
            }
          }
        }

        function commitCustom() {
          if (!customInput) return;
          var name = String(customInput.value || '').trim();
          if (!name) return;
          if (addAmbiente(name)) {
            customInput.value = '';
            var otherCb = picker.querySelector('[data-amb-pick-other]');
            if (otherCb) otherCb.checked = false;
            if (customWrap) customWrap.hidden = true;
            syncUi();
            persist();
          }
        }

        openBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var opening = panel.hidden;
          closeAllWsPopovers();
          if (!opening) return;
          panel.hidden = false;
          openBtn.setAttribute('aria-expanded', 'true');
          picker.classList.add('is-open');
          syncUi();
          refreshOtherUi();
        });

        panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
        panel.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
        panel.addEventListener('wheel', function (ev) { ev.stopPropagation(); }, { passive: true });

        picker.querySelectorAll('[data-amb-pick]').forEach(function (cb) {
          cb.addEventListener('click', function (ev) { ev.stopPropagation(); });
          cb.addEventListener('change', function (ev) {
            ev.stopPropagation();
            if (cb.getAttribute('data-amb-pick-other') === '1') {
              refreshOtherUi();
              return;
            }
            var name = cb.getAttribute('data-amb-pick');
            if (!name) return;
            if (cb.checked) addAmbiente(name);
            else removeAmbienteByName(name);
            syncUi();
            persist();
          });
        });

        if (customInput) {
          customInput.addEventListener('click', function (ev) { ev.stopPropagation(); });
          customInput.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
          customInput.addEventListener('keydown', function (ev) {
            ev.stopPropagation();
            if (ev.key === 'Enter') {
              ev.preventDefault();
              commitCustom();
            }
          });
        }

        if (summaryEl) {
          summaryEl.addEventListener('click', function (ev) {
            var btn = ev.target && ev.target.closest
              ? ev.target.closest('[data-amb-chip-remove]')
              : null;
            if (!btn) return;
            ev.preventDefault();
            ev.stopPropagation();
            removeAmbienteById(btn.getAttribute('data-amb-chip-remove'));
            syncUi();
            persist();
          });
        }
      });
    });

    rootEl.querySelectorAll('[data-remove-tipologia]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var localId = btn.getAttribute('data-remove-tipologia');
        var tip = (state.estructura && state.estructura.tipologias || []).find(function (t) {
          return t && t.localId === localId;
        });
        var nodeId = tip && tip.node_id;
        var nodeLabel = tip
          ? (tip.nombre || tip.modelo || tip.producto || tip.componente || 'Tipología')
          : 'Tipología';

        function finishRemove(mode) {
          var run = function () {
            var result = EstructuraEngine.removeTypology(state, localId);
            if (!result.ok) {
              if (result.reason === 'conflict') {
                if (window.confirm('Esta tipología tiene contenido. ¿Archivarla al aplicar (no se borra de la base)? Quitar del borrador ahora.')) {
                  state.estructura.tipologias = state.estructura.tipologias.filter(function (t) {
                    return t.localId !== localId;
                  });
                  state.estructura.tipologiasCount = state.estructura.tipologias.length;
                  rerender();
                }
              } else {
                AdminNotify.error('Debe quedar al menos una tipología.');
              }
              return;
            }
            rerender();
          };
          if (!nodeId || mode === 'none') {
            run();
            return;
          }
          Promise.resolve(purgeNodeAssets(nodeId, mode)).then(run).catch(run);
        }

        if (nodeId) {
          confirmNodeMediaDeletion(nodeId, nodeLabel, finishRemove);
        } else {
          finishRemove('none');
        }
      });
    });

    var addTip = rootEl.querySelector('#builderAddTipologiaBtn');
    if (addTip) {
      addTip.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        EstructuraEngine.addTypology(state);
        rerender();
      });
    }

    rootEl.querySelectorAll('[data-zones-picker]').forEach(function (picker) {
      var openBtn = picker.querySelector('[data-zones-picker-open]');
      var panel = picker.querySelector('[data-zones-panel]') || picker.querySelector('.ws-ms__panel');
      var labelEl = picker.querySelector('[data-zones-trigger-label]');
      var summaryEl = picker.querySelector('[data-zones-summary]');
      if (!openBtn || !panel) return;

      function zoneNames() {
        return Array.isArray(state.estructura.zoneNames) ? state.estructura.zoneNames : [];
      }

      function triggerText(count) {
        if (count > 0) {
          return 'Zonas / amenidades · ' + count + ' seleccionada' + (count === 1 ? '' : 's');
        }
        return 'Seleccionar zonas / amenidades';
      }

      function renderSummary() {
        if (!summaryEl) return;
        var names = zoneNames();
        if (!names.length) {
          summaryEl.innerHTML = '<span class="ws-ms__empty">Ninguna zona o amenidad seleccionada</span>';
          return;
        }
        summaryEl.innerHTML = names.map(function (name) {
          return '<span class="ws-ms__chip">' +
            '<span class="ws-ms__chip-label">' + AdminUI.escapeHtml(name) + '</span>' +
            '<button type="button" class="ws-ms__chip-remove" data-zone-chip-remove="' +
              AdminUI.escapeHtml(name) + '" aria-label="Quitar ' + AdminUI.escapeHtml(name) + '">×</button>' +
          '</span>';
        }).join('');
      }

      function syncUi() {
        var names = zoneNames();
        if (labelEl) labelEl.textContent = triggerText(names.length);
        picker.querySelectorAll('[data-zone-pick]').forEach(function (cb) {
          var n = cb.getAttribute('data-zone-pick');
          cb.checked = names.indexOf(n) >= 0;
        });
        renderSummary();
      }

      function setZoneSelected(name, want) {
        if (!name) return;
        var has = zoneNames().indexOf(name) >= 0;
        if (want === has) return;
        /* V5.9.72 — al quitar zona, advertir si hay assets por node_id */
        if (!want && has) {
          var zn = ((state.estructura && state.estructura.zoneNodes) || []).find(function (z) {
            return z && String(z.nombre || '').toLowerCase() === String(name).toLowerCase();
          });
          var nodeId = zn && zn.node_id;
          if (nodeId) {
            confirmNodeMediaDeletion(nodeId, name, function (mode) {
              var apply = function () {
                EstructuraEngine.toggleZone(state, name);
                if (typeof MediaNodesEngine !== 'undefined') MediaNodesEngine.ensureNodeIds(state);
                syncUi();
                persist();
              };
              if (mode === 'none') {
                apply();
                return;
              }
              Promise.resolve(purgeNodeAssets(nodeId, mode)).then(apply).catch(apply);
            });
            return;
          }
        }
        EstructuraEngine.toggleZone(state, name);
      }

      openBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var opening = panel.hidden;
        closeAllWsPopovers();
        if (!opening) return;
        panel.hidden = false;
        openBtn.setAttribute('aria-expanded', 'true');
        picker.classList.add('is-open');
        syncUi();
      });

      panel.addEventListener('click', function (ev) { ev.stopPropagation(); });
      panel.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      panel.addEventListener('wheel', function (ev) { ev.stopPropagation(); }, { passive: true });

      picker.querySelectorAll('[data-zone-pick]').forEach(function (cb) {
        cb.addEventListener('click', function (ev) { ev.stopPropagation(); });
        cb.addEventListener('change', function (ev) {
          ev.stopPropagation();
          var name = cb.getAttribute('data-zone-pick');
          setZoneSelected(name, !!cb.checked);
          syncUi();
          persist();
        });
      });

      if (summaryEl) {
        summaryEl.addEventListener('click', function (ev) {
          var btn = ev.target && ev.target.closest
            ? ev.target.closest('[data-zone-chip-remove]')
            : null;
          if (!btn) return;
          ev.preventDefault();
          ev.stopPropagation();
          var name = btn.getAttribute('data-zone-chip-remove');
          setZoneSelected(name, false);
          syncUi();
          persist();
        });
      }
    });

    var applyBtn = rootEl.querySelector('#builderApplyEstructuraBtn');
    if (applyBtn) applyBtn.addEventListener('click', handleApplyEstructura);

    var draftBtn = rootEl.querySelector('#builderSaveEstructuraDraftBtn');
    if (draftBtn) draftBtn.addEventListener('click', handleSaveEstructuraDraft);

    updateEstructuraDraftStatusUi();
  }

  async function handleSaveEstructuraDraft() {
    if (processing) return;
    processing = true;
    updateHeaderActions();
    var draftBtn = rootEl && rootEl.querySelector('#builderSaveEstructuraDraftBtn');
    if (draftBtn) {
      draftBtn.disabled = true;
      draftBtn.textContent = 'Guardando…';
    }
    try {
      EstructuraEngine.ensureState(state);
      await EstructuraSyncEngine.saveDraft(state);
      state.estructura.dirty = false;
      state.estructura._draftSaved = true;
      saveState();
      if (draftBtn) draftBtn.textContent = 'Guardar borrador';
      var statusEl = rootEl && rootEl.querySelector('[data-estructura-draft-status]');
      if (statusEl) {
        statusEl.textContent = 'Guardado';
        statusEl.className = 'builder-estructura-draft-status is-saved';
      }
      AdminNotify.success('Borrador de estructura guardado.');
    } catch (err) {
      AdminNotify.error((err && err.message) || 'No se pudo guardar el borrador');
      if (draftBtn) draftBtn.textContent = 'Guardar borrador';
    } finally {
      processing = false;
      if (draftBtn) draftBtn.disabled = false;
      updateHeaderActions();
    }
  }

  async function handleApplyEstructura() {
    if (processing) return;
    processing = true;
    updateHeaderActions();
    try {
      EstructuraEngine.ensureState(state);
      var result = await EstructuraSyncEngine.apply(state);
      saveState();
      AdminNotify.success(
        'Estructura aplicada: ' + result.tipologias + ' tipología(s), ' +
        (result.unidades != null ? result.unidades + ' unidad(es), ' : '') +
        result.viviendas + ' tarjeta(s) de contenido. Experiencia sincronizada.'
      );
      renderStepContent();
      updateNavButtons();
    } catch (err) {
      if (err && err.conflicts && err.conflicts.length) {
        var msg = err.conflicts.map(function (c) {
          return c.message || (c.nombre + ' (' + (c.ambientes || 0) + ' ambientes)');
        }).join('\n');
        if (window.confirm(msg + '\n\n¿Archivar tipologías removidas y continuar?')) {
          try {
            var result2 = await EstructuraSyncEngine.apply(state, { archiveRemoved: true, force: true });
            saveState();
            AdminNotify.success(
              'Estructura aplicada (archivando conflictos): ' + result2.tipologias + ' tipologías.'
            );
            renderStepContent();
            updateNavButtons();
          } catch (err2) {
            AdminNotify.error(err2.message || 'No se pudo aplicar la estructura');
          }
        }
      } else if (err && err.validation) {
        AdminNotify.error(err.validation.join(' · '));
      } else {
        AdminNotify.error((err && err.message) || 'No se pudo aplicar la estructura');
      }
    } finally {
      processing = false;
      updateHeaderActions();
    }
  }

  function bindStepEvents(stepId) {
    if (stepId === 'experiencia') {
      if (typeof ExperienciaCanvas !== 'undefined' && ExperienciaCanvas.mount) {
        ExperienciaCanvas.mount(rootEl, state, {
          saveState: saveState,
          onChange: function () {
            saveState();
            updateNavButtons();
          }
        });
      }
      return;
    }

    if (stepId === 'config') {
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
        var nextSlug = normalizeShowroomSlug(slugInput ? slugInput.value : '');
        if (urlPreviewEl) {
          urlPreviewEl.textContent = publicUrlDisplay(nextSlug);
        }
      }

      function currentProjectId() {
        return state.draftProjectId ||
          (state.publishResult && state.publishResult.proyectoId) ||
          (typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
            ? AdminState.getActiveProjectId()
            : null);
      }

      function resolveConstructoraIdForCheck() {
        if (state.projectInfo && state.projectInfo.constructora_id) {
          return state.projectInfo.constructora_id;
        }
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
        var nextSlug = normalizeShowroomSlug(raw);

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

        var originalSlug = normalizeShowroomSlug(
          (state.projectInfo && state.projectInfo.slug) || ''
        );
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
          var live = normalizeShowroomSlug(slugInput.value, { allowTrailingHyphen: true });
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
          slugInput.value = normalizeShowroomSlug(slugInput.value);
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
          if (slugInput) slugInput.value = normalizeShowroomSlug(slugInput.value);
          syncPublicUrlPreview();
          handleSaveShowroomIdentity(nameInput, slugInput, saveBtn, statusEl);
        });
      }
    }

    if (stepId === 'estructura' || stepId === 'project-type') {
      bindEstructuraEvents();
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
      bindDropzone('heroLogoDropzone', 'heroLogoInput', function (file) {
        handleBrandingUpload('logo', file);
      });
      bindHeroContentFields();
      bindHeroMediaActions();
    }
    if (stepId === 'menu') bindMenuFields();
    if (stepId === 'viviendas') bindViviendasFields();
    if (stepId === 'gallery') bindDropzone('galleryDropzone', 'galleryInput', handleGalleryUpload, true);
    if (stepId === 'media') bindBunnyMediaStep();
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
        showShare: true,
        showFullscreen: true
      };
    }
    if (!state.branding) state.branding = {};

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
      state.heroContent.showFullscreen = readChecked('heroShowFullscreenInput', state.heroContent.showFullscreen !== false);
      state.branding.showHeroLogo = readChecked('heroShowLogoInput', state.branding.showHeroLogo !== false);
      var styleEl = rootEl.querySelector('input[name="heroLogoStyle"]:checked');
      if (styleEl) {
        state.branding.logoStyle = styleEl.value === 'avatar' ? 'avatar' : 'flat';
        if (state.branding.logo) state.branding.logo.logoStyle = state.branding.logoStyle;
      }
      /* V5.9.76 — Hero display name must not overwrite Config identity */
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
      'heroShowShareInput',
      'heroShowLogoInput',
      'heroLogoStyleFlat',
      'heroLogoStyleAvatar'
    ].forEach(function (id) {
      var el = rootEl.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('input', persistHeroContent);
      el.addEventListener('change', persistHeroContent);
    });
  }

  function revokeHeroPreview(media) {
    if (!media || !media.previewUrl) return;
    try {
      if (String(media.previewUrl).indexOf('blob:') === 0) {
        URL.revokeObjectURL(media.previewUrl);
      }
    } catch (e) {}
  }

  function bindHeroMediaActions() {
    rootEl.querySelectorAll('[data-hero-media-change]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var kind = btn.getAttribute('data-hero-media-change');
        var inputId =
          kind === 'video' ? '#videoInput' :
          kind === 'image' ? '#heroImageInput' :
          kind === 'logo' ? '#heroLogoInput' : null;
        var input = inputId ? rootEl.querySelector(inputId) : null;
        if (input) input.click();
      });
    });

    rootEl.querySelectorAll('[data-hero-media-clear]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearHeroMedia(btn.getAttribute('data-hero-media-clear'));
      });
    });
  }

  function clearHeroMedia(kind) {
    if (kind === 'logo') {
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
      return;
    }
    if (kind === 'video') {
      revokeHeroPreview(state.heroVideo);
      state.heroVideo = null;
    } else if (kind === 'image') {
      revokeHeroPreview(state.heroImage);
      state.heroImage = null;
    }
    /* Exclusivos: al quitar el activo no debe quedar media; bloquear rehidratación. */
    if (!state.heroVideo && !state.heroImage) {
      state.heroMediaCleared = true;
    }
    saveState();
    renderStepContent();
    updateNavButtons();
    HeroSyncEngine.sync(state)
      .then(function (result) {
        if (result) {
          AdminNotify.success(
            kind === 'video' ? 'Video del hero eliminado.' : 'Imagen del hero eliminada.'
          );
        }
      })
      .catch(function (err) {
        AdminNotify.error(err.message || 'No se pudo eliminar el media del hero');
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
      /* V5.9.76 — menu.projectName is menu content; never overwrite Config identity */
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

  function setBunnyMediaStatus(msg) {
    var el = rootEl && rootEl.querySelector('#bunnyMediaStatus');
    if (el) el.textContent = msg || '';
  }

  async function refreshBunnyMediaList(silent) {
    var projectId = resolveActiveProjectId();
    if (!projectId) {
      if (!silent) AdminNotify.error('Abre un showroom con ID para gestionar Media.');
      return;
    }
    if (typeof BunnyMediaApi === 'undefined') {
      if (!silent) AdminNotify.error('BunnyMediaApi no cargada');
      return;
    }
    try {
      setBunnyMediaStatus('Cargando archivos Bunny…');
      var items = await BunnyMediaApi.list(projectId);
      state.bunnyMedia = state.bunnyMedia || {};
      state.bunnyMedia.items = items;
      BunnyMediaApi.syncArchivosToProjectAssets(state, items);
      saveState();
      if (!silent) setBunnyMediaStatus(items.length + ' archivo(s) en Bunny · CDN listo');
      renderStepContent();
    } catch (err) {
      var msg = (err && err.message) || 'Error listando Media';
      setBunnyMediaStatus(msg);
      if (!silent) AdminNotify.error(msg);
    }
  }

  async function handleBunnyMediaUpload(files) {
    var file = files && files[0];
    if (!file) return;
    var projectId = resolveActiveProjectId();
    if (!projectId) {
      AdminNotify.error('Abre un showroom con ID para subir a Bunny.');
      return;
    }
    if (typeof BunnyMediaApi === 'undefined') {
      AdminNotify.error('BunnyMediaApi no cargada');
      return;
    }
    var nodeId = state.bunnyMedia && state.bunnyMedia.uploadNodeId;
    var category = state.bunnyMedia && state.bunnyMedia.uploadCategory;
    if (!nodeId || !category) {
      AdminNotify.error('Elige Agregar en un nodo y categoría.');
      return;
    }
    var node = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.findNode(state, nodeId)
      : null;
    try {
      processing = true;
      setBunnyMediaStatus('Subiendo a Bunny…');
      if (typeof AdminUI !== 'undefined' && AdminUI.showGlobalBusy) {
        AdminUI.showGlobalBusy('Subiendo a Bunny CDN');
      }
      var result = await BunnyMediaApi.uploadAndSync(state, projectId, category, file, {
        nodeId: nodeId,
        entityRef: node && node.entityRef ? node.entityRef : null
      });
      state.bunnyMedia = state.bunnyMedia || {};
      state.bunnyMedia.selectedNodeId = nodeId;
      state.bunnyMedia.expandedNodeId = nodeId;
      state.bunnyMedia.items = state.bunnyMedia.items || [];
      if (result.archivo) {
        state.bunnyMedia.items = [result.archivo].concat(
          state.bunnyMedia.items.filter(function (r) { return r.id !== result.archivo.id; })
        );
      }
      saveState();
      AdminNotify.success('Asset en nodo · ' + (result.publicUrl || ''));
      setBunnyMediaStatus('OK · ' + (result.publicUrl || ''));
      captureMediaScroll();
      renderStepContent();
      restoreMediaScroll();
    } catch (err) {
      var msg = (err && err.message) || 'Error subiendo a Bunny';
      if (err && err.code === 'MISSING_SECRET') {
        msg = 'Falta configurar BUNNY_STORAGE_ACCESS_KEY en Supabase Secrets.';
      }
      setBunnyMediaStatus(msg);
      AdminNotify.error(msg);
    } finally {
      processing = false;
      if (typeof AdminUI !== 'undefined' && AdminUI.hideGlobalBusy) AdminUI.hideGlobalBusy();
      var input = rootEl && rootEl.querySelector('#bunnyMediaInput');
      if (input) input.value = '';
    }
  }

  function bindBunnyMediaStep() {
    state.bunnyMedia = state.bunnyMedia || {};
    if (!Array.isArray(state.bunnyMedia.customNodes)) state.bunnyMedia.customNodes = [];
    if (!Array.isArray(state.bunnyMedia.nodeOrder)) state.bunnyMedia.nodeOrder = [];

    var searchEl = rootEl.querySelector('#bunnyMediaSearch');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        state.bunnyMedia.searchQuery = searchEl.value || '';
        var q = String(searchEl.value || '').trim().toLowerCase();
        rootEl.querySelectorAll('#bunnyMediaNodeList [data-media-node]').forEach(function (el) {
          var hay = String(el.getAttribute('data-media-label') || '').toLowerCase();
          el.hidden = !!(q && hay.indexOf(q) === -1);
        });
        saveState();
      });
    }

    var addBtn = rootEl.querySelector('#bunnyMediaAddNode');
    if (addBtn) {
      addBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openAddMediaNodeModal();
      });
    }

    var configBtn = rootEl.querySelector('#bunnyMediaConfigCats');
    if (configBtn) {
      configBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var nid = configBtn.getAttribute('data-media-config-node');
        if (nid) openMediaCategoriesModal(nid);
      });
    }

    rootEl.querySelectorAll('[data-media-select]').forEach(function (btn) {
      function selectNode(ev) {
        if (ev) ev.preventDefault();
        var nid = btn.getAttribute('data-media-select');
        if (!nid || state.bunnyMedia.selectedNodeId === nid) return;
        captureMediaScroll();
        state.bunnyMedia.selectedNodeId = nid;
        state.bunnyMedia.expandedNodeId = nid;
        state.bunnyMedia.detailScrollTop = 0;
        saveState();
        renderStepContent();
        restoreMediaScroll();
      }
      btn.addEventListener('click', selectNode);
      btn.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') selectNode(ev);
      });
    });

    rootEl.querySelectorAll('[data-media-node-del]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var nid = btn.getAttribute('data-media-node-del');
        if (nid) deleteMediaNavigatorNode(nid);
      });
    });

    bindMediaNodeDragDrop();

    var fileInput = rootEl.querySelector('#bunnyMediaInput');
    rootEl.querySelectorAll('[data-media-add]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var nid = btn.getAttribute('data-media-add');
        var cat = btn.getAttribute('data-media-cat');
        state.bunnyMedia.uploadNodeId = nid;
        state.bunnyMedia.uploadCategory = cat;
        state.bunnyMedia.selectedNodeId = nid;
        state.bunnyMedia.expandedNodeId = nid;
        var meta = typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.getCategory(cat);
        if (fileInput) {
          fileInput.accept = (meta && meta.accept) || '*/*';
          fileInput.click();
        }
      });
    });
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) {
          handleBunnyMediaUpload(fileInput.files);
        }
      });
    }

    rootEl.querySelectorAll('[data-media-tour-url]').forEach(function (input) {
      input.addEventListener('change', function () {
        var nid = input.getAttribute('data-node-id');
        var sceneId = input.getAttribute('data-scene-id');
        var url = input.value || '';
        if (typeof MediaToursEngine === 'undefined') return;
        var projectId = resolveActiveProjectId();
        MediaToursEngine.ensureState(state, projectId);
        if (sceneId) {
          MediaToursEngine.updateScene(state, sceneId, { url: url, node_id: nid });
        } else {
          var scene = MediaToursEngine.addScene(state, projectId, {
            nombre: (MediaNodesEngine.findNode(state, nid) || {}).label || 'Tour',
            tipo: ((MediaNodesEngine.findNode(state, nid) || {}).kind) || 'manual',
            origen: 'estructura',
            node_id: nid,
            estructura_id: nid,
            url: url
          });
          input.setAttribute('data-scene-id', scene.id);
        }
        MediaToursEngine.syncScenesToProjectAssets(state);
        saveState();
        setBunnyMediaStatus(MediaToursEngine.summary(state));
        captureMediaScroll();
        renderStepContent();
        restoreMediaScroll();
      });
    });

    rootEl.querySelectorAll('[data-bunny-del]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var id = btn.getAttribute('data-bunny-del');
        var projectId = resolveActiveProjectId();
        if (!id || !projectId) return;
        var doDelete = function () {
          BunnyMediaApi.remove(projectId, { archivoId: id }).then(function () {
            if (state.projectAssets && state.projectAssets.byId) {
              delete state.projectAssets.byId['bunny-' + id];
            }
            state.bunnyMedia.items = ((state.bunnyMedia && state.bunnyMedia.items) || []).filter(
              function (r) { return String(r.id) !== String(id); }
            );
            saveState();
            AdminNotify.success('Archivo eliminado');
            captureMediaScroll();
            renderStepContent();
            restoreMediaScroll();
          }).catch(function (err) {
            AdminNotify.error((err && err.message) || 'No se pudo eliminar');
          });
        };
        if (typeof AdminUI !== 'undefined' && AdminUI.confirm) {
          AdminUI.confirm({
            title: 'Eliminar archivo',
            message: 'Se borrará de Bunny CDN y de archivos.',
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar'
          }).then(function (ok) { if (ok) doDelete(); });
        } else if (window.confirm('¿Eliminar archivo de Bunny?')) {
          doDelete();
        }
      });
    });

    restoreMediaScroll();

    if (!state.bunnyMedia._loaded) {
      state.bunnyMedia._loaded = true;
      refreshBunnyMediaList(true);
    }
  }

  function confirmNodeMediaDeletion(nodeId, nodeLabel, onProceed) {
    var assets = (typeof MediaNodesEngine !== 'undefined')
      ? MediaNodesEngine.listAssetsForNode(state, nodeId)
      : [];
    if (!assets.length) {
      onProceed('none');
      return;
    }
    var count = assets.length;
    var label = nodeLabel || nodeId;
    var copy = 'El nodo "' + label + '" tiene ' + count +
      ' recurso(s) multimedia. Nunca se borran archivos sin confirmación.';

    if (typeof AdminUI !== 'undefined' && typeof AdminUI.openModal === 'function') {
      var settled = false;
      function finish(mode) {
        if (settled) return;
        settled = true;
        if (mode) onProceed(mode);
      }
      AdminUI.openModal({
        title: 'Nodo con recursos Media',
        bodyHtml: '<p class="admin-modal-copy">' + AdminUI.escapeHtml(copy) + '</p>' +
          '<ul class="admin-modal-copy" style="margin:12px 0 0;padding-left:18px">' +
            '<li><strong>Cancelar</strong> — no elimina el nodo</li>' +
            '<li><strong>Conservar assets</strong> — elimina el nodo; assets quedan huérfanos (node_id)</li>' +
            '<li><strong>Eliminar todo</strong> — nodo + assets (Bunny / projectAssets)</li>' +
          '</ul>',
        footerHtml:
          '<button type="button" class="btn-ghost" data-modal-action="cancel">Cancelar</button>' +
          '<button type="button" class="btn-ghost" data-modal-action="orphan">Conservar assets</button>' +
          '<button type="button" class="btn-danger" data-modal-action="delete">Eliminar todo</button>',
        onMount: function (root) {
          var cancelBtn = root.querySelector('[data-modal-action="cancel"]');
          var orphanBtn = root.querySelector('[data-modal-action="orphan"]');
          var deleteBtn = root.querySelector('[data-modal-action="delete"]');
          if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
              settled = true;
              AdminUI.closeModal();
            });
          }
          if (orphanBtn) {
            orphanBtn.addEventListener('click', function () {
              finish('orphan');
              AdminUI.closeModal();
            });
          }
          if (deleteBtn) {
            deleteBtn.addEventListener('click', function () {
              finish('delete-assets');
              AdminUI.closeModal();
            });
          }
        },
        onClose: function () { settled = true; }
      });
      return;
    }

    if (window.confirm(copy + '\n\nOK = Eliminar todo\nCancelar = abortar')) {
      onProceed('delete-assets');
    }
  }

  async function purgeNodeAssets(nodeId, mode) {
    var projectId = resolveActiveProjectId();
    if (mode === 'orphan') {
      MediaNodesEngine.detachAssets(state, nodeId);
      saveState();
      return;
    }
    if (mode === 'delete-assets') {
      var list = MediaNodesEngine.collectAssetIdsForNode(state, nodeId);
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item.archivoId && item.provider === 'bunny' && projectId && typeof BunnyMediaApi !== 'undefined') {
          try {
            await BunnyMediaApi.remove(projectId, {
              archivoId: item.archivoId,
              storagePath: item.storagePath
            });
          } catch (e) { /* continue */ }
        }
      }
      MediaNodesEngine.removeAssetsFromLibrary(state, nodeId);
      if (state.mediaTours && state.mediaTours.scenes) {
        state.mediaTours.scenes = state.mediaTours.scenes.filter(function (s) {
          return !s || (s.node_id !== nodeId && s.estructura_id !== nodeId);
        });
      }
      saveState();
    }
  }

  function bindDropzone(zoneId, inputId, handler, multiple) {
    var zone = rootEl.querySelector('#' + zoneId);
    var input = rootEl.querySelector('#' + inputId);
    if (!zone || !input) return;

    zone.addEventListener('click', function (e) {
      /* Con media cargada, Cambiar/Eliminar gestionan el archivo; no robar clicks al preview. */
      var card = zone.closest('.builder-hero-media-card');
      if (card && card.classList.contains('has-media')) return;
      if (e.target.closest('video, button, a, input, label')) return;
      input.click();
    });
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
      state.heroMediaCleared = false;
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
      state.heroMediaCleared = false;
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
    var showFsElAlways = rootEl && rootEl.querySelector('#heroShowFullscreenInput');
    if (showWaElAlways || showShareElAlways || showFsElAlways) {
      if (!state.heroContent) state.heroContent = {};
      if (showWaElAlways) state.heroContent.showWhatsapp = !!showWaElAlways.checked;
      if (showShareElAlways) state.heroContent.showShare = !!showShareElAlways.checked;
      if (showFsElAlways) state.heroContent.showFullscreen = !!showFsElAlways.checked;
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
      var showFsEl = rootEl && rootEl.querySelector('#heroShowFullscreenInput');
      var showLogoEl = rootEl && rootEl.querySelector('#heroShowLogoInput');
      var logoStyleEl = rootEl && rootEl.querySelector('input[name="heroLogoStyle"]:checked');
      state.heroContent = Object.assign({
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
      }, state.heroContent || {}, {
        nombre: nombreEl ? nombreEl.value : (state.heroContent && state.heroContent.nombre) || '',
        eslogan: esloganEl ? esloganEl.value : (state.heroContent && state.heroContent.eslogan) || '',
        botonIzquierdo: (leftEl ? leftEl.value : '') || 'Explorar',
        botonDerecho: (rightEl ? rightEl.value : '') || 'Iniciar',
        whatsappLink: waLinkEl ? waLinkEl.value : (state.heroContent && state.heroContent.whatsappLink) || '',
        whatsappMessage: waMsgEl ? waMsgEl.value : (state.heroContent && state.heroContent.whatsappMessage) || '',
        shareUrl: shareEl ? shareEl.value : (state.heroContent && state.heroContent.shareUrl) || '',
        showWhatsapp: showWaEl ? !!showWaEl.checked : state.heroContent.showWhatsapp !== false,
        showShare: showShareEl ? !!showShareEl.checked : state.heroContent.showShare !== false,
        showFullscreen: showFsEl ? !!showFsEl.checked : state.heroContent.showFullscreen !== false
      });
      if (!state.branding) state.branding = {};
      if (showLogoEl) state.branding.showHeroLogo = !!showLogoEl.checked;
      if (logoStyleEl) {
        state.branding.logoStyle = logoStyleEl.value === 'avatar' ? 'avatar' : 'flat';
        if (state.branding.logo) state.branding.logo.logoStyle = state.branding.logoStyle;
      }
      /* V5.9.76 — Hero nombre is display content only; never overwrite Config identity */
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
    var syncEstructura = typeof EstructuraSyncEngine !== 'undefined'
      ? EstructuraSyncEngine.saveDraft(state).catch(function () { return null; })
      : Promise.resolve(null);

    Promise.all([syncHero, syncMenu, syncViviendas, syncEstructura])
      .then(function (results) {
        var heroResult = results[0];
        var menuResult = results[1];
        var vivResult = results[2];
        var estResult = results[3];
        if (heroResult || menuResult || vivResult || estResult) {
          saveState();
          var parts = [];
          if (heroResult) parts.push('hero');
          if (menuResult) parts.push('menú');
          if (vivResult) parts.push('viviendas');
          if (estResult) parts.push('estructura (borrador)');
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
      if (result.slug) {
        state.projectInfo = Object.assign({}, state.projectInfo || {}, {
          slug: result.slug,
          nombre: (result.project && result.project.nombre) || (state.projectInfo && state.projectInfo.nombre)
        });
      }
      saveState();

      if (typeof BoxiesRouter !== 'undefined' && BoxiesRouter.syncProjectIdentity) {
        BoxiesRouter.syncProjectIdentity({
          projectId: state.draftProjectId,
          slug: result.slug
        });
      }
      if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
        BoxiesShell.setProjectContext({
          id: state.draftProjectId,
          name: (state.projectInfo && state.projectInfo.nombre) || result.slug,
          slug: result.slug
        });
      }
      try {
        window.dispatchEvent(new CustomEvent('boxies:showroom-identity-changed', {
          detail: {
            id: state.draftProjectId,
            nombre: (state.projectInfo && state.projectInfo.nombre) || '',
            slug: result.slug
          }
        }));
      } catch (evErr) {}

      AdminNotify.success('Showroom publicado. Preview y URL pública usan el slug actual.');
      if (typeof ProjectSelector !== 'undefined') {
        await ProjectSelector.init();
      }
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

  async function handleSaveShowroomIdentity(nameInput, slugInput, saveBtn, statusEl) {
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

    var fromDraft = state.draftProjectId || null;
    var fromPublish = (state.publishResult && state.publishResult.proyectoId) || null;
    var fromAdmin =
      typeof AdminState !== 'undefined' && AdminState.getActiveProjectId
        ? AdminState.getActiveProjectId()
        : null;
    var fromUrl = null;
    try {
      var params = new URLSearchParams(window.location.search || '');
      fromUrl = params.get('projectId') || params.get('proyectoId') || null;
    } catch (e) {}

    var projectId = fromDraft || fromPublish || fromAdmin || fromUrl;

    trace('1_uuid_cargado_pantalla', {
      projectId: projectId,
      fromDraft: fromDraft,
      fromPublish: fromPublish,
      fromAdmin: fromAdmin,
      fromUrl: fromUrl,
      stateNombre: state.projectInfo && state.projectInfo.nombre,
      stateSlug: state.projectInfo && state.projectInfo.slug
    });

    if (!projectId) {
      trace('STOP_sin_uuid', {});
      if (statusEl) statusEl.textContent = 'Abre un showroom existente para guardar la identidad.';
      AdminNotify.error('No hay un showroom vinculado (falta ID).');
      return;
    }
    if (typeof ProyectosApi === 'undefined' || typeof ProyectosApi.updateIdentity !== 'function') {
      trace('STOP_api_ausente', {
        hasProyectosApi: typeof ProyectosApi !== 'undefined',
        hasUpdateIdentity: typeof ProyectosApi !== 'undefined' && typeof ProyectosApi.updateIdentity === 'function',
        hasAdminApi: typeof AdminApi !== 'undefined'
      });
      AdminNotify.error('API de identidad no disponible.');
      return;
    }

    var nombre = nameInput ? String(nameInput.value || '').trim() : '';
    var slug = normalizeShowroomSlug(slugInput ? slugInput.value : '');

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
        var constructoraId = (state.projectInfo && state.projectInfo.constructora_id) || null;
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
          AdminNotify.error(msg);
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

      state.draftProjectId = updated.id;
      state.projectInfo = Object.assign({}, state.projectInfo || {}, {
        nombre: verify.nombre || updated.nombre,
        slug: verify.slug || updated.slug,
        constructora_id: updated.constructora_id || (state.projectInfo && state.projectInfo.constructora_id)
      });
      if (!state.heroContent) state.heroContent = {};
      state.heroContent.nombre = state.projectInfo.nombre;
      state.publishResult = Object.assign({}, state.publishResult || {}, {
        proyectoId: updated.id,
        slug: state.projectInfo.slug,
        project: updated,
        url: typeof PlatformBuilderBridge !== 'undefined'
          ? PlatformBuilderBridge.showroomUrl(state.projectInfo.slug)
          : publicUrlDisplay(state.projectInfo.slug)
      });
      if (typeof AdminState !== 'undefined' && AdminState.setActiveProjectId) {
        AdminState.setActiveProjectId(updated.id);
      }
      saveState();

      if (typeof BoxiesRouter !== 'undefined' && BoxiesRouter.syncProjectIdentity) {
        BoxiesRouter.syncProjectIdentity({
          projectId: updated.id,
          slug: state.projectInfo.slug
        });
      }
      if (typeof BoxiesShell !== 'undefined' && BoxiesShell.setProjectContext) {
        BoxiesShell.setProjectContext({
          id: updated.id,
          name: state.projectInfo.nombre,
          slug: state.projectInfo.slug
        });
      }

      try {
        window.dispatchEvent(new CustomEvent('boxies:showroom-identity-changed', {
          detail: {
            id: updated.id,
            nombre: state.projectInfo.nombre,
            slug: state.projectInfo.slug
          }
        }));
      } catch (evErr) {}

      trace('8_datos_render', {
        id: updated.id,
        nombre: state.projectInfo.nombre,
        slug: state.projectInfo.slug
      });

      if (statusEl) statusEl.textContent = 'Identidad guardada.';
      AdminNotify.success('Identidad guardada en la base: /' + state.projectInfo.slug);
      renderStepContent();
      updateNavButtons();
    } catch (err) {
      trace('STOP_error', {
        message: err && err.message,
        stack: err && err.stack
      });
      if (statusEl) statusEl.textContent = err.message || 'Error al guardar.';
      AdminNotify.error(err.message || 'Error al guardar identidad');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
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
      if (stepId === 'project-type' || stepId === 'tipo' || stepId === 'tipologias') stepId = 'estructura';
      if (typeof BuilderWizard.resolveVisibleStepId === 'function') {
        stepId = BuilderWizard.resolveVisibleStepId(stepId);
      }
      var idx = BuilderWizard.getStepIndex(stepId);
      if (idx >= 0) state.currentStep = idx;
    } catch (e) {}
  }

  function normalizeCurrentStep() {
    var step = BuilderWizard.getStep(state.currentStep);
    if (!step) {
      state.currentStep = 0;
      return;
    }
    if (step.hidden && typeof BuilderWizard.resolveVisibleStepId === 'function') {
      var resolved = BuilderWizard.resolveVisibleStepId(step.id);
      var idx = BuilderWizard.getStepIndex(resolved);
      if (idx >= 0) state.currentStep = idx;
    }
  }

  function goToStep(index) {
    if (index < 0 || index >= BuilderWizard.STEPS.length) return;
    var step = BuilderWizard.getStep(index);
    if (step && step.hidden && typeof BuilderWizard.resolveVisibleStepId === 'function') {
      var resolved = BuilderWizard.resolveVisibleStepId(step.id);
      var resolvedIdx = BuilderWizard.getStepIndex(resolved);
      if (resolvedIdx >= 0 && resolvedIdx !== index) {
        goToStep(resolvedIdx);
        return;
      }
    }
    state.currentStep = index;
    step = BuilderWizard.getStep(index);
    if (step) state.currentStepId = step.id;
    state.wizardNavVersion = BuilderWizard.NAV_VERSION || 77;
    saveState();
    if (step && step.id === 'validation') {
      state.validation = ValidationEngine.validate(state);
    }
    if (step) syncStepUrl(step.id);
    renderAll();
  }

  function goToStepById(stepId) {
    if (typeof BuilderWizard.resolveVisibleStepId === 'function') {
      stepId = BuilderWizard.resolveVisibleStepId(stepId);
    }
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

    var rail = rootEl && rootEl.querySelector ? rootEl.querySelector('#builderProgressRail') : null;
    if (rail) {
      rail.addEventListener('click', function (e) {
        var t = e && e.target;
        if (!t) return;
        if (t.nodeType !== 1) t = t.parentElement;
        if (!t || typeof t.closest !== 'function') return;
        var item = t.closest('[data-rail-step]');
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
    normalizeCurrentStep();
    BuilderDock.applyBodyPadding();
    renderShell();
    rootEl.querySelector('#builderApp').hidden = false;

    try {
      await HeroSyncEngine.bindFromUrl(state);
      if (typeof EstructuraSyncEngine !== 'undefined') {
        try { await EstructuraSyncEngine.bindFromProject(state); } catch (eEst) {}
      }
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

    try {
      if (!window.__BOXIES_IDENTITY_TRACE__) window.__BOXIES_IDENTITY_TRACE__ = [];
      window.__BOXIES_IDENTITY_TRACE__.push({
        t: Date.now(),
        step: '7_uuid_reload_pantalla',
        draftProjectId: state.draftProjectId,
        nombre: state.projectInfo && state.projectInfo.nombre,
        slug: state.projectInfo && state.projectInfo.slug,
        url: window.location.href
      });
      console.log('[IDENTITY]', '7_uuid_reload_pantalla', {
        draftProjectId: state.draftProjectId,
        nombre: state.projectInfo && state.projectInfo.nombre,
        slug: state.projectInfo && state.projectInfo.slug
      });
    } catch (traceErr) {}

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
    },
    getProjectIdentity: function () {
      if (!state) return { id: '', nombre: '', slug: '' };
      return {
        id: state.draftProjectId ||
          (state.publishResult && state.publishResult.proyectoId) ||
          '',
        nombre: (state.projectInfo && state.projectInfo.nombre) || '',
        slug: (state.projectInfo && state.projectInfo.slug) ||
          (state.publishResult && state.publishResult.slug) ||
          ''
      };
    }
  };
})();
