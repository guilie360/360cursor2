/* BOXIES V5.9.66 — Autolayout de plantillas: sin solapes, columnas legibles */
var ExperienciaCanvas = (function () {
  var MIN_ZOOM = 0.35;
  var MAX_ZOOM = 1.8;
  var CANVAS_MODE_KEY = 'experienciaCanvasMode';

  function esc(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isCanvasMode() {
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load) {
      return !!BoxiesPrefs.load()[CANVAS_MODE_KEY];
    }
    return document.body.classList.contains('boxies-exp-canvas-mode');
  }

  function setCanvasMode(on, restore) {
    on = !!on;
    document.body.classList.toggle('boxies-exp-canvas-mode', on);
    document.documentElement.classList.toggle('boxies-exp-canvas-mode', on);
    if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.save) {
      var patch = {};
      patch[CANVAS_MODE_KEY] = on;
      if (restore) {
        patch._expCanvasRestore = restore;
      } else if (!on) {
        patch._expCanvasRestore = null;
      }
      BoxiesPrefs.save(patch);
    }
  }

  function sectionTitleHtml() {
    return '';
  }

  function actionsHtml(state) {
    ExperienciaEngine.ensureFlow(state);
    var canvas = (state.experiencia && state.experiencia.canvas) || {};
    var inGroup = !!(canvas.activeGroupId);
    return '' +
      (inGroup
        ? '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpExitGroupBtn" title="Salir del grupo">Salir</button>'
        : '') +
      '<button type="button" class="boxies-btn-secondary boxies-btn-secondary--icon builder-exp-reset-btn builder-exp-tool-btn" id="builderExpResetBtn"' +
        ' data-tooltip="Reiniciar flujo" title="Reiniciar flujo" aria-label="Reiniciar flujo">' +
        (typeof BuilderIcons !== 'undefined' && BuilderIcons.render
          ? BuilderIcons.render('rotate-ccw')
          : '↶') +
      '</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpTemplateBtn" title="Crear flujo base">Flujo</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpStructReviewBtn" title="Revisar Estructura">Estructura</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpDraftBtn" title="Guardar borrador">Borrador</button>' +
      '<button type="button" class="builder-header-action-btn builder-exp-tool-btn boxies-btn-secondary" id="builderExpResyncBtn" title="Actualizar desde Hero">Hero</button>';
  }

  /**
   * Minimal shell for Quotation (and any host) that reuses the SAME
   * BOTONES / HOTSPOTS stages from Showroom — no FLUJO UI.
   */
  function overlayShellHtml() {
    return '' +
      '<div class="builder-exp-workspace qe-exp-overlay" data-exp-workspace data-qe-exp-overlay>' +
        '<div class="builder-exp-stage" data-exp-stage>' +
          '<div class="builder-exp-viewport" data-exp-viewport hidden tabindex="-1" aria-hidden="true">' +
            '<div class="builder-exp-world" data-exp-world>' +
              '<svg class="builder-exp-edges" data-exp-edges xmlns="http://www.w3.org/2000/svg"></svg>' +
              '<div class="builder-exp-nodes" data-exp-nodes></div>' +
              '<div class="builder-exp-marquee" data-exp-marquee hidden></div>' +
            '</div>' +
          '</div>' +
          '<div class="builder-exp-buttons-stage" data-exp-buttons-stage>' +
            '<div class="builder-exp-buttons-stage__empty" data-exp-buttons-empty hidden>' +
              '<p>Agrega un botón desde el dock.</p>' +
            '</div>' +
            '<div class="builder-exp-buttons-frame" data-exp-buttons-frame>' +
              '<img class="builder-exp-buttons-img" data-exp-buttons-img alt="" draggable="false">' +
              '<div class="builder-exp-buttons-layer" data-exp-buttons-layer></div>' +
            '</div>' +
          '</div>' +
          '<div class="builder-exp-hotspots-stage" data-exp-hotspots-stage hidden>' +
            '<div class="builder-exp-hotspots-stage__empty" data-exp-hotspots-empty hidden>' +
              '<p>Dibuja un hotspot: clic para vértices, doble clic para cerrar.</p>' +
            '</div>' +
            '<div class="builder-exp-hotspots-frame" data-exp-hotspots-frame>' +
              '<img class="builder-exp-hotspots-img" data-exp-hotspots-img alt="" draggable="false">' +
              '<div class="builder-exp-hotspots-layer" data-exp-hotspots-layer>' +
                '<svg class="builder-exp-hotspots-svg" data-exp-hotspots-svg xmlns="http://www.w3.org/2000/svg"></svg>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function shellHtml(state) {
    ExperienciaEngine.ensureFlow(state);
    var canvas = (state.experiencia && state.experiencia.canvas) || {};
    var canvasMode = isCanvasMode();
    var minimapOn = canvas.minimapVisible !== false;

    return '' +
      '<div class="builder-step-content builder-step-content--experiencia' +
        (canvasMode ? ' is-canvas-mode' : '') + '">' +
        '<div class="builder-exp-workspace' +
          (canvasMode ? ' is-canvas-mode' : '') +
          '" data-exp-workspace>' +
          '<div class="builder-exp-stage" data-exp-stage>' +
            '<div class="builder-exp-toolbar" data-exp-toolbar role="toolbar" aria-label="Herramientas del canvas">' +
              toolBtn('select', 'Seleccionar', 'layout-grid') +
              toolBtn('cut', 'Cortar vínculo', 'scissors') +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('fit', 'Ajustar vista', 'maximize', true) +
              toolBtn('canvas-mode', 'Modo Focus', 'panel', true) +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              toolBtn('minimap', minimapOn ? 'Ocultar minimapa' : 'Mostrar minimapa', 'eye', true) +
              '<span class="builder-exp-toolbar__sep" aria-hidden="true"></span>' +
              '<div class="builder-exp-mode-tabs" data-exp-mode-tabs role="tablist" aria-label="Modo de edición">' +
                '<button type="button" class="builder-exp-mode-tab is-active" data-exp-edit-mode="flow" role="tab" aria-selected="true">FLUJO</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="buttons" role="tab" aria-selected="false" disabled>BOTONES</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="hotspots" role="tab" aria-selected="false" disabled>HOTSPOTS</button>' +
                '<button type="button" class="builder-exp-mode-tab" data-exp-edit-mode="prototype" role="tab" aria-selected="false">PROTOTIPO</button>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="builder-exp-focus-fs" data-exp-fullscreen' +
              ' data-tooltip="Pantalla completa" title="Pantalla completa" aria-label="Pantalla completa">' +
              ((typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
                ? BuilderIcons.render('maximize')
                : '') +
            '</button>' +
            '<div class="builder-exp-viewport" data-exp-viewport tabindex="0">' +
              '<div class="builder-exp-world" data-exp-world>' +
                '<svg class="builder-exp-edges" data-exp-edges xmlns="http://www.w3.org/2000/svg"></svg>' +
                '<div class="builder-exp-nodes" data-exp-nodes></div>' +
                '<div class="builder-exp-marquee" data-exp-marquee hidden></div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-buttons-stage" data-exp-buttons-stage hidden>' +
              '<div class="builder-exp-buttons-stage__empty" data-exp-buttons-empty hidden>' +
                '<p>Selecciona un nodo Imagen para diseñar botones.</p>' +
              '</div>' +
              '<div class="builder-exp-buttons-frame" data-exp-buttons-frame>' +
                '<img class="builder-exp-buttons-img" data-exp-buttons-img alt="" draggable="false">' +
                '<div class="builder-exp-buttons-layer" data-exp-buttons-layer></div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-hotspots-stage" data-exp-hotspots-stage hidden>' +
              '<div class="builder-exp-hotspots-stage__empty" data-exp-hotspots-empty hidden>' +
                '<p>Selecciona un nodo Imagen para dibujar máscaras.</p>' +
              '</div>' +
              '<div class="builder-exp-hotspots-frame" data-exp-hotspots-frame>' +
                '<img class="builder-exp-hotspots-img" data-exp-hotspots-img alt="" draggable="false">' +
                '<div class="builder-exp-hotspots-layer" data-exp-hotspots-layer>' +
                  '<svg class="builder-exp-hotspots-svg" data-exp-hotspots-svg xmlns="http://www.w3.org/2000/svg"></svg>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="builder-exp-proto-stage" data-exp-proto-stage hidden>' +
              '<div class="builder-xp-host builder-exp-proto-host" data-exp-proto-host></div>' +
            '</div>' +
            '<div class="builder-exp-minimap' + (minimapOn ? '' : ' is-hidden') + '" data-exp-minimap>' +
              '<canvas data-exp-minimap-canvas width="160" height="100"></canvas>' +
              '<button type="button" class="builder-exp-minimap__hide" data-exp-minimap-hide aria-label="Ocultar minimapa">×</button>' +
            '</div>' +
            '<div class="builder-exp-ctx" data-exp-ctx hidden></div>' +
            '<div class="builder-exp-picker" data-exp-picker hidden></div>' +
            '<div class="builder-exp-modal" data-exp-modal hidden></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function toolBtn(tool, label, icon, action) {
    var iconHtml = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
      ? BuilderIcons.render(icon)
      : '';
    return '<button type="button" class="builder-exp-tool' + (action ? ' is-action' : '') +
      '" data-exp-tool="' + esc(tool) + '" data-tooltip="' + esc(label) + '" aria-label="' + esc(label) + '">' +
      iconHtml + '</button>';
  }

  function interactionRowsHtml(n, list, selectedIxId) {
    if (!list || !list.length) return '';
    return list.map(function (ix) {
      var pid = ix.portId || ix.id;
      var disabled = ix.enabled === false;
      var typeLab = ExperienciaEngine.interactionTypeLabel
        ? ExperienciaEngine.interactionTypeLabel(ix.type)
        : (ix.type || '');
      var mark = (ix.type === 'HOTSPOT' || ix.type === 'UNIT' || ix.type === 'UNITS_FLOOR')
        ? '●' : '□';
      var isSel = selectedIxId && (ix.id === selectedIxId || ix.portId === selectedIxId);
      var showPort = ExperienciaEngine.interactionHasSourcePort
        ? ExperienciaEngine.interactionHasSourcePort(ix)
        : !disabled;
      return '<div class="builder-exp-card__irow is-interaction' +
        (disabled ? ' is-disabled' : '') +
        (isSel ? ' is-selected' : '') +
        '" data-exp-irow="' + esc(pid) + '"' +
        ' data-exp-interaction="' + esc(ix.id) + '"' +
        ' data-exp-scene="' + esc(n.id) + '">' +
        '<span class="builder-exp-card__ix-label">' +
          '<em class="builder-exp-card__ix-mark">' + mark + '</em> ' +
          esc(typeLab) + ' · ' + esc(ix.label || typeLab) +
        '</span>' +
        (disabled
          ? '<span class="builder-exp-card__badge is-off">OFF</span>'
          : (showPort
            ? ('<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
              esc(pid) + '" data-node="' + esc(n.id) + '" data-port-label="' +
              esc(ix.label || '') + '" data-interaction-id="' + esc(ix.id) + '"></span>')
            : '<span class="builder-exp-card__badge is-local" title="Acción interna">interno</span>')) +
      '</div>';
    }).join('');
  }

  function elementosBlockHtml(n, selectedIxId) {
    var ixs = (n.config && n.config.interactions) || [];
    var parts = ExperienciaEngine.partitionInteractions
      ? ExperienciaEngine.partitionInteractions(ixs)
      : { controls: [], content: ixs, navigation: [], other: [] };
    var hubOn = !!(n.config && n.config.hub && n.config.hub.enabled);
    var categorized = hubOn ||
      ((parts.controls.length + parts.content.length + parts.navigation.length) >= 2 &&
        (parts.controls.length + parts.navigation.length) > 0);

    var html = '';
    function section(title, list) {
      if (!list || !list.length) return;
      html += '<div class="builder-exp-card__section">' + esc(title) + '</div>' +
        '<div class="builder-exp-card__ports">' +
          interactionRowsHtml(n, list, selectedIxId) +
        '</div>';
    }

    if (!categorized) {
      html += '<div class="builder-exp-card__section">Elementos</div>' +
        '<div class="builder-exp-card__ports">' +
          interactionRowsHtml(n, ixs, selectedIxId) +
        '</div>';
    } else {
      section('Controles', parts.controls.concat(parts.other));
      section('Contenido', parts.content);
      section('Navegación', parts.navigation);
      if (!parts.controls.length && !parts.content.length && !parts.navigation.length &&
          !parts.other.length && ixs.length) {
        html += '<div class="builder-exp-card__section">Elementos</div>' +
          '<div class="builder-exp-card__ports">' +
            interactionRowsHtml(n, ixs, selectedIxId) +
          '</div>';
      }
    }

    html += '<button type="button" class="builder-exp-card__add-el" data-exp-add-element="' +
      esc(n.id) + '">+ Agregar elemento</button>';
    return html;
  }

  function mediaBlockHtml(state, n) {
    var media = ExperienciaEngine.resolveSceneMedia
      ? ExperienciaEngine.resolveSceneMedia(state, n)
      : {
          filename: n.config && n.config.fileName,
          statusLabel: (n.config && n.config.fileName) ? 'Local' : 'Pendiente',
          hasMedia: !!(n.config && n.config.fileName),
          thumbnailUrl: null
        };
    var statusCls = !media.hasMedia ? 'is-pending'
      : (media.status === 'error' ? 'is-error'
        : (media.status === 'synced' || media.status === 'local' ? 'is-ok' : 'is-sync'));
    var hubHint = (media.activeFloor
      ? (' · P' + media.activeFloor + (media.visualMode ? (' · ' + String(media.visualMode).toUpperCase()) : ''))
      : '');
    return '<div class="builder-exp-card__section">Media</div>' +
      '<div class="builder-exp-card__media">' +
        (media.thumbnailUrl
          ? '<div class="builder-exp-card__thumb"><img src="' + esc(media.thumbnailUrl) +
            '" alt="" loading="lazy"></div>'
          : '') +
        '<div class="builder-exp-card__media-text">' +
          '<div class="builder-exp-card__media-name">' +
            esc(media.filename || 'Sin asignar') +
          '</div>' +
          '<div class="builder-exp-card__media-status ' + statusCls + '">' +
            esc((media.hasMedia ? media.statusLabel : 'Pendiente') + hubHint) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function nodeCardHtml(n, state) {
    var status = ExperienciaEngine.statusLabel(n);
    var info = ExperienciaEngine.infoLine(n);
    var size = ExperienciaEngine.nodeSize(n);
    var statusCls = n.orphaned || n.status === 'review' ? 'is-review'
      : (n.status === 'ready' ? 'is-ready'
        : (n.status === 'error' ? 'is-error' : 'is-pending'));
    var accent = ExperienciaEngine.resolveAccent
      ? ExperienciaEngine.resolveAccent(n)
      : (n.accent || (ExperienciaEngine.kindMeta(n.kind).accent));
    var isHero = n.kind === 'hero';
    var isAction = n.role === 'action' || n.kind === 'action';
    var isScene = ExperienciaEngine.isSceneKind
      ? ExperienciaEngine.isSceneKind(n.kind)
      : (n.kind === 'image' || n.kind === 'scene' || n.kind === 'video' ||
         n.kind === 'plan' || n.kind === 'pano360' || n.kind === 'animacion' ||
         n.kind === 'planta-3d' || n.kind === 'vista' || n.kind === 'ficha' || n.kind === 'gallery');
    var portsOut = (n.ports || []).filter(function (p) { return p.side !== 'in'; });
    var portsIn = (n.ports || []).filter(function (p) { return p.side === 'in'; });
    var ixs = (n.config && n.config.interactions) || [];
    var enabledIxs = ixs.filter(function (ix) { return ix && ix.enabled !== false; });
    var selectedIx = state && state.experiencia && state.experiencia.canvas
      ? state.experiencia.canvas.selectedInteractionId
      : null;

    var body = '';
    if (isHero) {
      var slots = (n.config && n.config.slots) ||
        (ExperienciaEngine.listHeroSlots ? ExperienciaEngine.listHeroSlots({ heroContent: {} }) : null) ||
        { navigation: [], flow: [], actions: [] };
      if (n.config && n.config.slots) slots = n.config.slots;

      body =
        '<div class="builder-exp-card__type">HERO</div>' +
        '<div class="builder-exp-card__title">Hero</div>' +
        '<div class="builder-exp-card__info">Pantalla inicial</div>';

      if ((slots.navigation || []).length) {
        body += '<div class="builder-exp-card__section">Navegación</div>' +
          '<div class="builder-exp-card__slots">' +
          slots.navigation.map(function (it) {
            return '<div class="builder-exp-card__irow is-nav" data-exp-hero-slot="nav" data-slot-id="' + esc(it.id) + '">' +
              '<span>' + esc(it.label) + '</span>' +
              '<span class="builder-exp-card__ref">→ Menú</span>' +
            '</div>';
          }).join('') +
          '</div>';
      }

      body += '<div class="builder-exp-card__section">Flujo</div>' +
        '<div class="builder-exp-card__ports">' +
        (slots.flow || []).map(function (it) {
          var pid = it.portId || it.id || 'hero-iniciar';
          return '<div class="builder-exp-card__irow is-flow" data-exp-irow="' + esc(pid) + '">' +
            '<span>' + esc(it.label) + '</span>' +
            '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
              esc(pid) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(it.label) + '"></span>' +
          '</div>';
        }).join('') +
        '</div>';

      if ((slots.actions || []).length) {
        body += '<div class="builder-exp-card__section">Acciones</div>' +
          '<div class="builder-exp-card__slots">' +
          slots.actions.map(function (it) {
            var on = it.enabled !== false;
            var right = it.role === 'action-config'
              ? '<span class="builder-exp-card__ref is-config">Configurar ›</span>'
              : '<span class="builder-exp-card__badge ' + (on ? 'is-on' : 'is-off') + '">' +
                (on ? 'ON' : 'OFF') + '</span>';
            return '<div class="builder-exp-card__irow is-action-slot" data-exp-hero-slot="' +
              esc(it.id) + '" data-slot-field="' + esc(it.field || '') + '">' +
              '<span>' + esc(it.label) + '</span>' + right +
            '</div>';
          }).join('') +
          '</div>';
      }
    } else if (isAction) {
      body =
        '<div class="builder-exp-card__type">ACCIÓN</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || 'Acción') + '</div>' +
        '<div class="builder-exp-card__info">' + esc(info || (n.config && n.config.actionType) || '') + '</div>' +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
    } else if (isScene) {
      var hubEnabled = !!(n.config && n.config.hub && n.config.hub.enabled);
      body =
        '<div class="builder-exp-card__type">' +
          esc(hubEnabled ? 'HUB' : (n.typeLabel || 'ESCENA')) +
        '</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || n.id) + '</div>' +
        mediaBlockHtml(state || {}, n) +
        elementosBlockHtml(n, selectedIx);

      if (n.kind === 'video' || n.kind === 'animacion') {
        body += '<div class="builder-exp-card__section">Flujo automático</div>' +
          '<div class="builder-exp-card__ports">' +
          '<div class="builder-exp-card__irow is-flow" data-exp-irow="on-end">' +
            '<span>Al finalizar</span>' +
            '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="on-end" data-node="' +
              esc(n.id) + '" data-port-label="Al finalizar"></span>' +
          '</div></div>';
      }

      var btns = (ExperienciaEngine.listSceneButtons
        ? ExperienciaEngine.listSceneButtons(state || {}, n)
        : []).filter(function (b) {
          return b && b.visible !== false;
        });
      if (btns.length && !hubEnabled) {
        body += '<div class="builder-exp-card__section">BOTONES</div>' +
          '<div class="builder-exp-card__btn-summary">' +
            btns.map(function (b) {
              var listLabel = (b.label != null && String(b.label).length)
                ? b.label
                : (b.icon ? '· icono' : 'Sin texto');
              return '<div class="builder-exp-card__btn-row">' +
                '<span class="builder-exp-card__btn-check" aria-hidden="true">✓</span>' +
                '<span>' + esc(listLabel) + '</span>' +
              '</div>';
            }).join('') +
          '</div>';
      }
      void selectedIx;
    } else {
      body =
        '<div class="builder-exp-card__type">' + esc(n.typeLabel || 'NODO') + '</div>' +
        '<div class="builder-exp-card__title" data-exp-card-title="' + esc(n.id) + '">' + esc(n.label || n.id) + '</div>' +
        (info ? '<div class="builder-exp-card__info">' + esc(info) + '</div>' : '') +
        '<div class="builder-exp-card__status">' + esc(status) + '</div>';
      if (portsOut.length > 1) {
        body += '<div class="builder-exp-card__ports builder-exp-card__ports--compact">' +
          portsOut.filter(function (p) { return p.kind !== 'meta'; }).map(function (p) {
            return '<div class="builder-exp-card__irow">' +
              '<span>' + esc(p.label) + '</span>' +
              '<span class="builder-exp-card__port is-out is-row" data-exp-port="out" data-port-id="' +
                esc(p.id) + '" data-node="' + esc(n.id) + '" data-port-label="' + esc(p.label) + '"></span>' +
            '</div>';
          }).join('') +
        '</div>';
      }
    }

    var inPort = portsIn.length
      ? '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>'
      : (isHero ? '' : '<span class="builder-exp-card__port is-in" data-exp-port="in" data-port-id="in" data-node="' + esc(n.id) + '"></span>');

    var hasOutIx = enabledIxs.some(function (ix) {
      return ExperienciaEngine.interactionHasSourcePort
        ? ExperienciaEngine.interactionHasSourcePort(ix)
        : true;
    });
    var hasRowPorts = hasOutIx ||
      n.kind === 'video' || n.kind === 'animacion';
    var flowOuts = portsOut.filter(function (p) {
      return p.kind !== 'meta' && p.kind !== 'interaction' && p.id !== 'on-end';
    });
    var defaultOut = (!isHero && !hasRowPorts && flowOuts.length <= 1)
      ? '<span class="builder-exp-card__port is-out" data-exp-port="out" data-port-id="' +
        esc((flowOuts[0] && flowOuts[0].id) || 'out') + '" data-node="' + esc(n.id) +
        '" data-port-label="' + esc((flowOuts[0] && flowOuts[0].label) || 'Salida') + '"></span>'
      : '';

    return '' +
      '<div class="builder-exp-card ' + statusCls + ' accent-' + esc(accent) +
        (isHero ? ' is-hero' : '') +
        (isAction ? ' is-action-node' : '') +
        (isScene ? ' is-scene' : '') +
        (n.kind === 'hotspot' ? ' is-legacy-interaction' : '') +
        (n.locked ? ' is-locked' : '') +
        (n.orphaned ? ' is-orphan' : '') +
        '" data-exp-node="' + esc(n.id) + '"' +
        ' style="width:' + size.w + 'px;min-height:' + size.h + 'px;transform:translate(' +
        (n.x || 0) + 'px,' + (n.y || 0) + 'px)">' +
        (n.locked
          ? '<span class="builder-exp-card__lock" title="Bloqueado" aria-label="Bloqueado"></span>'
          : '') +
        inPort +
        defaultOut +
        body +
      '</div>';
  }

  function bezierPath(x1, y1, x2, y2) {
    var dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    return 'M ' + x1 + ' ' + y1 +
      ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
  }

  /** Math fallback when DOM port is not measurable yet. */
  function portAnchorFallback(n, portId, side) {
    var size = ExperienciaEngine.nodeSize(n);
    var ports = (n.ports || []).filter(function (p) {
      return side === 'in' ? p.side === 'in' : p.side !== 'in';
    });
    if (side === 'in') {
      return { x: n.x || 0, y: (n.y || 0) + size.h / 2 };
    }
    var flowOuts = ports.filter(function (p) { return p.kind !== 'meta'; });
    if (n.kind === 'hero' || flowOuts.length > 1 || n.kind === 'video' || n.kind === 'animacion') {
      var idx = 0;
      for (var i = 0; i < flowOuts.length; i++) {
        if (flowOuts[i].id === portId) { idx = i; break; }
      }
      /* Header ~62px + section ~18px + row ~22px; circle at row center */
      var top = (n.kind === 'hero' ? 86 : 78) + idx * 22 + 10;
      return {
        x: (n.x || 0) + size.w,
        y: (n.y || 0) + Math.min(top, size.h - 8)
      };
    }
    return { x: (n.x || 0) + size.w, y: (n.y || 0) + size.h / 2 };
  }

  function cssToken(v) {
    return String(v == null ? '' : v)
      .replace(/[;\n\r{}]/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '');
  }

  function buttonPreviewClass(btn) {
    var t = String((btn && btn.type) || 'BUTTON').toUpperCase();
    if (t === 'TEXT') return 'builder-exp-stage-text';
    if (t === 'SHAPE_RECT') return 'builder-exp-stage-shape builder-exp-stage-shape--rect';
    if (t === 'SHAPE_CIRCLE') return 'builder-exp-stage-shape builder-exp-stage-shape--circle';
    var style = (btn && btn.style) || 'button';
    if (style === 'chip') style = 'button';
    return 'builder-exp-ui-btn is-style-' + style +
      (btn && btn.icon ? ' has-icon' : '');
  }

  function buttonIconGlyph(icon) {
    if (icon === 'arrow') return '→';
    if (icon === 'rotate-left') return '↺';
    if (icon === 'rotate-right') return '↻';
    if (icon === 'plus') return '+';
    return '';
  }

  function overlayTypeLabel(t) {
    t = String(t || 'BUTTON').toUpperCase();
    if (t === 'TEXT') return 'Texto';
    if (t === 'SHAPE_RECT') return 'Rectángulo';
    if (t === 'SHAPE_CIRCLE') return 'Círculo';
    return 'Botón';
  }

  function textInspectorFieldsHtml(selected) {
    var fonts = [
      ['system-ui, sans-serif', 'Sistema'],
      ['Georgia, serif', 'Georgia'],
      ['Arial, Helvetica, sans-serif', 'Arial'],
      ['Times New Roman, Times, serif', 'Times'],
      ['Verdana, Geneva, sans-serif', 'Verdana'],
      ['Courier New, Courier, monospace', 'Mono']
    ];
    var ff = selected.fontFamily || 'system-ui, sans-serif';
    var fw = String(selected.fontWeight || '400');
    var op = selected.opacity != null ? Number(selected.opacity) : 1;
    var align = selected.textAlign || 'center';
    var size = Number(selected.fontSize) || 28;
    var sizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 160, 200];
    function fontOpt(v, l) {
      return '<option value="' + esc(v) + '"' + (ff === v ? ' selected' : '') + '>' + esc(l) + '</option>';
    }
    function sizeChip(n) {
      return '<button type="button" class="builder-exp-size-chip' +
        (size === n ? ' is-active' : '') + '" data-exp-text-size-chip="' + n + '">' + n + '</button>';
    }
    function alignBtn(v, label) {
      return '<button type="button" class="builder-hub-segment__btn' +
        (align === v ? ' is-active' : '') + '" data-exp-text-align="' + esc(v) + '">' +
        esc(label) + '</button>';
    }
    return '' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Contenido</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<textarea data-exp-text-content rows="2" maxlength="500" placeholder="Escribe…">' +
            esc(selected.label != null ? selected.label : '') +
          '</textarea>' +
          '<p class="builder-menu-hint builder-exp-btn-hint">Doble clic en el lienzo para editar.</p>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Apariencia</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Fuente</label>' +
          '<select data-exp-text-font class="builder-exp-btn-select">' +
            fonts.map(function (f) { return fontOpt(f[0], f[1]); }).join('') +
          '</select>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Tamaño</label>' +
          '<div class="builder-exp-size-chips">' + sizes.map(sizeChip).join('') + '</div>' +
        '</div>' +
        '<div class="builder-hub-segment" style="margin-bottom:8px">' +
          '<button type="button" class="builder-hub-segment__btn' +
            (fw === '700' || fw === 'bold' ? ' is-active' : '') +
            '" data-exp-text-bold="1">Negrita</button>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Color</label>' +
          '<input type="color" data-exp-text-color value="' +
            esc(/^#[0-9a-fA-F]{6}$/.test(String(selected.color || '')) ? selected.color : '#ffffff') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Alineación</label>' +
          '<div class="builder-hub-segment">' +
            alignBtn('left', 'Izq') +
            alignBtn('center', 'Centro') +
            alignBtn('right', 'Der') +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Opacidad</label>' +
          '<input type="range" data-exp-text-opacity min="0" max="1" step="0.05" value="' +
            esc(String(op)) + '">' +
        '</div>' +
      '</div>';
  }

  function hexOr(v, fallback) {
    return /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback;
  }

  function buttonInspectorFieldsHtml(selected, destOpts) {
    var btnOp = selected.opacity != null ? Number(selected.opacity) : 1;
    var bgOp = selected.bgOpacity != null ? Number(selected.bgOpacity) : 1;
    var hoverOn = selected.hoverEnabled !== false;
    var hoverMs = selected.hoverTransition != null ? Number(selected.hoverTransition) : 200;
    var hoverCol = hexOr(selected.hoverColor, '#6fbf86');
    var hoverText = hexOr(selected.hoverTextColor, '#ffffff');
    var pressedCol = hexOr(selected.pressedColor, '#5aaa74');
    var pressedText = hexOr(selected.pressedTextColor, '#ffffff');
    var bg = hexOr(selected.bgColor, '#141414');
    var textCol = hexOr(selected.textColor, '#ffffff');
    var borderCol = hexOr(selected.borderColor, '#ffffff');
    var bw = selected.borderWidth != null ? Number(selected.borderWidth) : 1;
    var br = selected.borderRadius != null ? Number(selected.borderRadius) : 999;
    return '' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Contenido</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Texto</label>' +
          '<input type="text" data-exp-btn-label maxlength="60" placeholder="Opcional" value="' +
            esc(selected.label != null ? selected.label : '') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Icono</label>' +
          '<select data-exp-btn-icon class="builder-exp-btn-select">' +
            '<option value="none"' + (!selected.icon ? ' selected' : '') + '>Ninguno</option>' +
            '<option value="arrow"' + (selected.icon === 'arrow' ? ' selected' : '') + '>Flecha</option>' +
            '<option value="rotate-left"' + (selected.icon === 'rotate-left' ? ' selected' : '') + '>Rotar izq.</option>' +
            '<option value="rotate-right"' + (selected.icon === 'rotate-right' ? ' selected' : '') + '>Rotar der.</option>' +
            '<option value="plus"' + (selected.icon === 'plus' ? ' selected' : '') + '>Plus</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Apariencia</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Fondo</label>' +
            '<input type="color" data-exp-btn-bg-color value="' + esc(bg) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Transp. fondo</label>' +
            '<input type="range" data-exp-btn-bg-opacity min="0" max="1" step="0.05" value="' +
              esc(String(bgOp)) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Color texto</label>' +
          '<input type="color" data-exp-btn-text-color value="' + esc(textCol) + '">' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Borde</label>' +
            '<input type="color" data-exp-btn-border-color value="' + esc(borderCol) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Grosor</label>' +
            '<input type="number" data-exp-btn-border-width min="0" max="20" step="1" value="' +
              esc(String(bw)) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Radio</label>' +
          '<input type="number" data-exp-btn-radius min="0" max="999" step="1" value="' +
            esc(String(br)) + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Opacidad</label>' +
          '<input type="range" data-exp-btn-opacity min="0" max="1" step="0.05" value="' +
            esc(String(btnOp)) + '">' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row" style="gap:12px;margin-top:4px">' +
          '<label class="builder-exp-inspector__check">' +
            '<input type="checkbox" data-exp-btn-visible' + (selected.visible !== false ? ' checked' : '') + '>' +
            ' Visible</label>' +
          '<label class="builder-exp-inspector__check">' +
            '<input type="checkbox" data-exp-btn-locked' + (selected.locked ? ' checked' : '') + '>' +
            ' Bloqueado</label>' +
        '</div>' +
      '</div>' +
      '<div class="builder-exp-block">' +
        '<div class="builder-exp-block__title">Interacción</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Acción</label>' +
          '<select data-exp-btn-target class="builder-exp-btn-select">' + destOpts + '</select>' +
        '</div>' +
        '<label class="builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-btn-hover-enabled' + (hoverOn ? ' checked' : '') + '>' +
          ' Activar hover</label>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Hover</label>' +
            '<input type="color" data-exp-btn-hover-color value="' + esc(hoverCol) + '"' +
              (hoverOn ? '' : ' disabled') + '>' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Texto hover</label>' +
            '<input type="color" data-exp-btn-hover-text value="' + esc(hoverText) + '"' +
              (hoverOn ? '' : ' disabled') + '>' +
          '</div>' +
        '</div>' +
        '<div class="builder-exp-btn-hover-row">' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Pressed</label>' +
            '<input type="color" data-exp-btn-pressed-color value="' + esc(pressedCol) + '">' +
          '</div>' +
          '<div class="builder-field builder-exp-inspector__field" style="flex:1">' +
            '<label>Texto pressed</label>' +
            '<input type="color" data-exp-btn-pressed-text value="' + esc(pressedText) + '">' +
          '</div>' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Transición (ms)</label>' +
          '<input type="number" data-exp-btn-hover-ms min="0" max="2000" step="50" value="' +
            esc(String(hoverMs)) + '">' +
        '</div>' +
      '</div>';
  }

  function shapeInspectorFieldsHtml(selected) {
    var t = String(selected.type || '').toUpperCase();
    var rot = selected.rotation != null ? Number(selected.rotation) : 0;
    return '' +
      '<div class="builder-exp-inspector__section">Forma</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre</label>' +
        '<input type="text" data-exp-btn-label maxlength="60" value="' +
          esc(selected.label != null ? selected.label : '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Ancho %</label>' +
        '<input type="number" data-exp-shape-w min="1" max="100" step="0.5" value="' +
          esc(String(selected.width != null ? selected.width : 12)) + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Alto %</label>' +
        '<input type="number" data-exp-shape-h min="1" max="100" step="0.5" value="' +
          esc(String(selected.height != null ? selected.height : 8)) + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Relleno</label>' +
        '<input type="text" data-exp-shape-fill value="' + esc(selected.fill || '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Borde</label>' +
        '<input type="text" data-exp-shape-stroke value="' + esc(selected.stroke || '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Grosor borde</label>' +
        '<input type="number" data-exp-shape-sw min="0" max="20" step="1" value="' +
          esc(String(selected.strokeWidth != null ? selected.strokeWidth : 2)) + '">' +
      '</div>' +
      (t === 'SHAPE_RECT'
        ? ('<div class="builder-field builder-exp-inspector__field">' +
            '<label>Radio</label>' +
            '<input type="number" data-exp-shape-radius min="0" max="999" step="1" value="' +
              esc(String(selected.borderRadius != null ? selected.borderRadius : 8)) + '">' +
          '</div>')
        : '') +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Rotación</label>' +
        '<input type="range" min="-360" max="360" step="1" data-exp-btn-rotation value="' +
          esc(String(rot)) + '">' +
        '<div class="builder-exp-btn-rot-row">' +
          '<input type="number" min="-360" max="360" step="1" data-exp-btn-rotation-num value="' +
            esc(String(rot)) + '">' +
          '<span class="builder-exp-btn-rot-unit">°</span>' +
        '</div>' +
      '</div>' +
      '<label class="builder-exp-inspector__check">' +
        '<input type="checkbox" data-exp-btn-visible' + (selected.visible !== false ? ' checked' : '') + '>' +
        ' Visible</label>';
  }

  function buttonsInspectorHtml(state, n) {
    /* V7.2.53 — inspector emptied (visual reset). Controls return in later versions. */
    return '' +
      '<div class="builder-exp-btn-panel builder-exp-btn-panel--empty">' +
        '<div class="builder-exp-inspector__kind">PROPIEDADES</div>' +
        '<p class="builder-menu-hint">Selecciona un elemento</p>' +
      '</div>';
  }

  function hotspotsInspectorHtml(state, n) {
    /* V7.2.53 — inspector emptied (visual reset). */
    return '' +
      '<div class="builder-exp-btn-panel builder-exp-btn-panel--empty">' +
        '<div class="builder-exp-inspector__kind">PROPIEDADES</div>' +
        '<p class="builder-menu-hint">Selecciona un elemento</p>' +
      '</div>';
  }

  function prototypeInspectorHtml(state) {
    var sb = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.buildStoryboard)
      ? ExperienciaPrototype.buildStoryboard(state)
      : null;
    var stats = (sb && sb.stats) || {
      nodeCount: 0, branchCount: 0, levelCount: 0, durationSec: 0
    };
    var mins = Math.floor(stats.durationSec / 60);
    var secs = stats.durationSec % 60;
    var durLabel = mins > 0
      ? (mins + ' min ' + secs + ' s')
      : (stats.durationSec + ' s');

    return '<div class="builder-exp-proto-panel">' +
      '<div class="builder-exp-inspector__section">Resumen</div>' +
      '<div class="builder-exp-proto-stats">' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.nodeCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Nodos</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(durLabel) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Duración est.</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.branchCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Ramas</span>' +
        '</div>' +
        '<div class="builder-exp-proto-stat">' +
          '<span class="builder-exp-proto-stat__val">' + esc(String(stats.levelCount)) + '</span>' +
          '<span class="builder-exp-proto-stat__lab">Niveles</span>' +
        '</div>' +
      '</div>' +
      '<p class="builder-menu-hint builder-exp-btn-hint">' +
        'Mismo recorrido que Preview (ExperienceRuntime). PrototypeRenderer dibuja geometría procedural.' +
      '</p>' +
      '<button type="button" class="builder-exp-proto-play" data-exp-proto-play>' +
        '▶ Ver Prototipo' +
      '</button>' +
    '</div>';
  }

  function hubSmartInspectorHtml(state, n, hub) {
    var enabled = !!(hub && hub.enabled);
    var html = '' +
      '<div class="builder-exp-inspector__section">HUB interactivo</div>' +
      '<label class="builder-exp-inspector__check">' +
        '<input type="checkbox" data-exp-hub-enabled' + (enabled ? ' checked' : '') + '>' +
        ' Activar HUB</label>';

    if (!enabled) {
      html += '<p class="builder-menu-hint">Activa el HUB para configurar el selector. Las plantas se toman de Media → Plantas 2D.</p>';
      return html;
    }

    var selectorType = (hub && hub.selectorType) || 'plantas';
    var options = (hub && hub.options) || [];
    var status = ExperienciaEngine.hubSelectorStatus
      ? ExperienciaEngine.hubSelectorStatus(hub)
      : { level: 'warn', message: '' };
    var ap = (hub && hub.appearance) || {
      style: 'numbers', position: 'top-right', alignment: 'horizontal', gap: 8, size: 32
    };
    var isPlantas = selectorType === 'plantas';
    var plantCards = isPlantas && ExperienciaEngine.listHubPlantasCards
      ? ExperienciaEngine.listHubPlantasCards(state, n)
      : [];

    function segmentBtn(value, label, active, disabled) {
      return '<button type="button" class="builder-hub-segment__btn' +
        (active ? ' is-active' : '') +
        (disabled ? ' is-disabled' : '') + '"' +
        ' data-value="' + esc(value) + '"' +
        (disabled ? ' disabled aria-disabled="true"' : '') +
        ' aria-pressed="' + (active ? 'true' : 'false') + '">' +
        esc(label) +
      '</button>';
    }

    function choiceChip(value, label, active, disabled) {
      return '<button type="button" class="builder-estructura-chip builder-hub-choice' +
        (active ? ' is-on' : '') +
        (disabled ? ' is-disabled' : '') + '"' +
        ' data-value="' + esc(value) + '"' +
        (disabled ? ' disabled' : '') + '>' +
        esc(label) +
      '</button>';
    }

    html += '<div class="builder-field builder-exp-inspector__field">' +
      '<label>Tipo de selector</label>' +
      '<div class="builder-hub-segment" data-exp-hub-selector-type role="group" aria-label="Tipo de selector">' +
        segmentBtn('plantas', 'Plantas', selectorType === 'plantas') +
        segmentBtn('tipologias', 'Tipologías', selectorType === 'tipologias') +
        segmentBtn('torres', 'Torres', selectorType === 'torres') +
        segmentBtn('pisos', 'Pisos', selectorType === 'pisos') +
      '</div>' +
    '</div>';

    if (isPlantas) {
      html += '<div class="builder-exp-inspector__section">Plantas 2D</div>';
      if (!plantCards.length) {
        html += '<div class="builder-hub-status is-warn">' +
          esc(status.message || 'No hay plantas en Media → Plantas 2D.') +
        '</div>' +
        '<p class="builder-menu-hint">Sube las plantas en Media → Plantas 2D. El HUB las cargará automáticamente.</p>';
      } else {
        html += '<div class="builder-hub-scenes" data-exp-hub-plants>' +
          plantCards.map(function (opt, idx) {
            var on = !!opt.enabled;
            var thumb = opt.thumbnailUrl
              ? ('<div class="builder-hub-scene-card__thumb" style="background-image:url(\'' +
                esc(opt.thumbnailUrl) + '\')"></div>')
              : '<div class="builder-hub-scene-card__thumb is-empty" aria-hidden="true"></div>';
            return '<article class="builder-hub-scene-card builder-hub-plant-card' +
              (on ? ' is-selected' : ' is-off') + '" data-plant-id="' + esc(opt.plantId) + '">' +
              '<button type="button" class="builder-hub-plant-check' + (on ? ' is-on' : '') + '"' +
                ' data-exp-hub-plant-toggle="' + esc(opt.plantId) + '"' +
                ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
                ' title="' + (on ? 'Desactivar' : 'Activar') + '">' +
                (on ? '☑' : '☐') +
              '</button>' +
              thumb +
              '<div class="builder-hub-scene-card__body">' +
                '<div class="builder-hub-scene-card__title">' +
                  '<strong>' + esc(opt.targetLabel || opt.label) + '</strong>' +
                '</div>' +
                '<span class="builder-hub-scene-card__asset">' +
                  esc(opt.filename || 'Sin archivo') +
                '</span>' +
                '<span class="builder-hub-scene-card__status' +
                  (on ? ' is-ok' : ' is-pending') + '">' +
                  esc(on ? 'Activa en selector' : 'Omitida') +
                '</span>' +
              '</div>' +
              (on
                ? ('<div class="builder-hub-plant-order">' +
                    '<button type="button" class="builder-hub-plant-order__btn" data-exp-hub-plant-up="' +
                      esc(opt.plantId) + '" title="Subir" aria-label="Subir"' +
                      (idx === 0 ? ' disabled' : '') + '>↑</button>' +
                    '<button type="button" class="builder-hub-plant-order__btn" data-exp-hub-plant-down="' +
                      esc(opt.plantId) + '" title="Bajar" aria-label="Bajar"' +
                      (idx >= (hub.selectedPlants || []).length - 1 ? ' disabled' : '') + '>↓</button>' +
                  '</div>')
                : '') +
            '</article>';
          }).join('') +
        '</div>';
        html += '<div class="builder-hub-status ' + (status.level === 'ok' ? 'is-ok' : 'is-warn') + '">' +
          (status.level === 'ok' ? '✔ ' : '') + esc(status.message) +
        '</div>' +
        '<p class="builder-menu-hint">Marca las plantas del inventario Media. El orden ↑↓ define el selector del Runtime.</p>';
      }
    } else {
      html += '<div class="builder-exp-inspector__section">Escenas enlazadas</div>';
      if (!options.length) {
        html += '<div class="builder-hub-status is-warn">' +
          esc(status.message || 'No se encontraron escenas relacionadas con este HUB.') +
        '</div>';
      } else {
        html += '<div class="builder-hub-scenes">' +
          options.map(function (opt) {
            var thumb = opt.thumbnailUrl
              ? ('<div class="builder-hub-scene-card__thumb" style="background-image:url(\'' +
                esc(opt.thumbnailUrl) + '\')"></div>')
              : '<div class="builder-hub-scene-card__thumb is-empty" aria-hidden="true"></div>';
            return '<article class="builder-hub-scene-card">' +
              thumb +
              '<div class="builder-hub-scene-card__body">' +
                '<div class="builder-hub-scene-card__title">' +
                  '<span class="builder-hub-scene-card__check" aria-hidden="true">✓</span>' +
                  '<strong>' + esc(opt.targetLabel || opt.label) + '</strong>' +
                '</div>' +
                '<span class="builder-hub-scene-card__asset">' +
                  esc(opt.filename || 'Sin asset') +
                '</span>' +
                '<span class="builder-hub-scene-card__status' +
                  (opt.hasMedia ? ' is-ok' : ' is-pending') + '">' +
                  esc(opt.statusLabel || (opt.hasMedia ? 'Sincronizado' : 'Pendiente')) +
                '</span>' +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>';
        html += '<div class="builder-hub-status ' + (status.level === 'ok' ? 'is-ok' : 'is-warn') + '">' +
          (status.level === 'ok' ? '✔ ' : '') + esc(status.message) +
        '</div>';
      }
    }

    var previewOpts = isPlantas
      ? plantCards.filter(function (c) { return c && c.enabled; })
      : options;
    var previewThumb = '';
    for (var pi = 0; pi < previewOpts.length; pi++) {
      if (previewOpts[pi].thumbnailUrl) {
        previewThumb = previewOpts[pi].thumbnailUrl;
        break;
      }
    }
    var styleKey = ap.style || 'numbers';
    var previewClass = 'builder-hub-preview' +
      ' is-pos-' + (ap.position || 'top-right') +
      ' is-' + (ap.alignment || 'horizontal') +
      ' is-style-' + styleKey;

    function previewChipHtml(opt, i) {
      if (styleKey === 'thumbnails') {
        var t = opt.thumbnailUrl
          ? (' style="background-image:url(\'' + esc(opt.thumbnailUrl) + '\')"')
          : '';
        return '<span class="builder-hub-preview__chip builder-hub-preview__thumb"' + t +
          ' title="' + esc(opt.targetLabel || opt.label) + '"></span>';
      }
      if (styleKey === 'chips') {
        return '<span class="builder-hub-preview__chip">' +
          esc(opt.targetLabel || opt.label) + '</span>';
      }
      return '<span class="builder-hub-preview__chip">' + esc(opt.label || String(i + 1)) + '</span>';
    }

    html += '<div class="builder-exp-inspector__section">Vista previa</div>' +
      '<div class="' + previewClass + '" data-exp-hub-preview aria-hidden="true" style="' +
        '--hub-gap:' + Number(ap.gap || 8) + 'px;' +
        '--hub-size:' + Number(ap.size || 32) + 'px;' +
      '">' +
        '<div class="builder-hub-preview__stage"' +
          (previewThumb
            ? (' style="background-image:url(\'' + esc(previewThumb) + '\')"')
            : '') + '>' +
          '<div class="builder-hub-preview__scrim"></div>' +
          '<div class="builder-hub-preview__overlay">' +
            (previewOpts.length
              ? previewOpts.map(previewChipHtml).join('')
              : '<span class="builder-hub-preview__chip is-empty">—</span>') +
          '</div>' +
        '</div>' +
      '</div>';

    html += '<div class="builder-exp-inspector__section">Apariencia</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Estilo</label>' +
        '<div class="builder-hub-chips" data-exp-hub-style>' +
          choiceChip('numbers', 'Números', styleKey === 'numbers') +
          choiceChip('chips', 'Chips', styleKey === 'chips') +
          choiceChip('thumbnails', 'Miniaturas', styleKey === 'thumbnails') +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Posición</label>' +
        '<div class="builder-hub-pos-grid" data-exp-hub-position role="group" aria-label="Posición">' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'top-left' ? ' is-active' : '') +
            '" data-value="top-left" title="Superior izquierda" aria-label="Superior izquierda">↖</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'top-right' ? ' is-active' : '') +
            '" data-value="top-right" title="Superior derecha" aria-label="Superior derecha">↗</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'bottom-left' ? ' is-active' : '') +
            '" data-value="bottom-left" title="Inferior izquierda" aria-label="Inferior izquierda">↙</button>' +
          '<button type="button" class="builder-hub-pos' + (ap.position === 'bottom-right' ? ' is-active' : '') +
            '" data-value="bottom-right" title="Inferior derecha" aria-label="Inferior derecha">↘</button>' +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Alineación</label>' +
        '<div class="builder-hub-chips" data-exp-hub-align>' +
          choiceChip('horizontal', 'Horizontal', ap.alignment !== 'vertical') +
          choiceChip('vertical', 'Vertical', ap.alignment === 'vertical') +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field builder-hub-slider-field">' +
        '<div class="builder-hub-slider-label">' +
          '<label>Separación</label>' +
          '<span data-exp-hub-gap-val>' + esc(String(ap.gap != null ? ap.gap : 8)) + ' px</span>' +
        '</div>' +
        '<input type="range" min="0" max="32" step="1" data-exp-hub-gap value="' +
          esc(String(ap.gap != null ? ap.gap : 8)) + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field builder-hub-slider-field">' +
        '<div class="builder-hub-slider-label">' +
          '<label>Tamaño</label>' +
          '<span data-exp-hub-size-val>' + esc(String(ap.size != null ? ap.size : 32)) + ' px</span>' +
        '</div>' +
        '<input type="range" min="22" max="48" step="1" data-exp-hub-size value="' +
          esc(String(ap.size != null ? ap.size : 32)) + '">' +
      '</div>' +
      '<p class="builder-menu-hint">La apariencia se guarda en el HUB. Runtime usará las plantas seleccionadas de Media.</p>';

    return html;
  }

  function inspectorHtml(state, nodeId, edgeId) {
    if (edgeId) {
      var ed = ExperienciaEngine.getEdge(state, edgeId);
      if (!ed) return '<p class="builder-menu-hint">Conexión no encontrada.</p>';
      var a = ExperienciaEngine.getNode(state, ed.sourceNodeId || ed.from || ed.sourceId);
      var b = ExperienciaEngine.getNode(state, ed.targetNodeId || ed.to || ed.targetId);
      var srcPortId = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
      var srcPortLabel = ed.sourcePortLabel ||
        (ExperienciaEngine.resolvePortLabel
          ? ExperienciaEngine.resolvePortLabel(a, srcPortId)
          : srcPortId);
      var tgtPortId = ed.targetPortId || ed.targetPort || 'in';
      return '' +
        '<div class="builder-exp-inspector__kind">CONEXIÓN</div>' +
        '<h3 class="builder-exp-inspector__title">' +
          esc((a ? a.label : 'Nodo') + ' → ' + (b ? b.label : 'Nodo')) +
        '</h3>' +
        '<div class="builder-exp-inspector__grid">' +
          row('Origen', a ? (a.label || a.id) : (ed.sourceNodeId || ed.from || '—')) +
          row('Interacción', srcPortLabel || srcPortId) +
          row('Puerto origen', srcPortId) +
          row('Destino', b ? (b.label || b.id) : (ed.targetNodeId || ed.to || '—')) +
          row('Puerto destino', tgtPortId) +
          row('Tipo', ed.inlineAction ? 'Acción inline' : 'Navegación') +
        '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-del-edge="' +
            esc(ed.id) + '">Eliminar conexión</button>' +
        '</div>';
    }

    var n = ExperienciaEngine.getNode(state, nodeId);
    if (!n) {
      return '<p class="builder-menu-hint">Selecciona un nodo del mapa o arrastra desde un puerto ●.</p>';
    }
    var conn = ExperienciaEngine.connectionsFor(state, n.id);
    var byId = {};
    (state.experiencia.nodes || []).forEach(function (x) { byId[x.id] = x; });

    function names(list, key) {
      if (!list.length) return '—';
      return list.map(function (ed) {
        var otherId = key === 'from'
          ? (ed.sourceNodeId || ed.from || ed.sourceId)
          : (ed.targetNodeId || ed.to || ed.targetId);
        var other = byId[otherId];
        var port = ed.sourcePortId || ed.sourcePort || ed.portId || '';
        var srcNode = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var portLabel = ed.sourcePortLabel ||
          (srcNode && ExperienciaEngine.resolvePortLabel
            ? ExperienciaEngine.resolvePortLabel(srcNode, port)
            : port);
        if (key === 'to') {
          return (other ? (other.label || other.id) : otherId) +
            (port ? (' ← ' + (portLabel || port)) : '');
        }
        return (other ? (other.label || other.id) : otherId) +
          (port ? ('.' + (portLabel || port)) : '');
      }).join(', ');
    }

    var html = '' +
      '<div class="builder-exp-inspector__kind">' + esc(n.typeLabel || n.kind) + '</div>' +
      '<h3 class="builder-exp-inspector__title">' + esc(n.label || n.id) + '</h3>';

    if (n.kind === 'hero') {
      var hero = (typeof ExperienciaEngine.ensureHeroContent === 'function')
        ? ExperienciaEngine.ensureHeroContent(state)
        : (state.heroContent || {});
      var slots = (n.config && n.config.slots) || {};
      var flowOut = names(conn.out, 'to');
      html += '<div class="builder-exp-inspector__grid">' +
        row('Fuente', 'Sección Hero') +
        row('Flujo (INICIAR)', flowOut) +
      '</div>';

      html += '<div class="builder-exp-inspector__section">Navegación</div>' +
        '<p class="builder-menu-hint">Explorar referencia la sección Menú existente. No se duplican botones aquí.</p>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-goto-step="menu">' +
            'Ir a Menú / Editar en Menú</button>' +
        '</div>';

      html += '<div class="builder-exp-inspector__section">Acciones (Hero)</div>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showShare"' +
            (hero.showShare !== false ? ' checked' : '') + '>' +
          '<span>Compartir habilitado</span>' +
        '</label>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showFullscreen"' +
            (hero.showFullscreen !== false ? ' checked' : '') + '>' +
          '<span>Fullscreen habilitado</span>' +
        '</label>' +
        '<label class="builder-check-row builder-exp-inspector__check">' +
          '<input type="checkbox" data-exp-hero-field="showWhatsapp"' +
            (hero.showWhatsapp !== false ? ' checked' : '') + '>' +
          '<span>WhatsApp habilitado</span>' +
        '</label>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Número WhatsApp</label>' +
          '<input type="text" data-exp-hero-field="whatsappLink" maxlength="180" ' +
            'placeholder="573001112233" value="' + esc(hero.whatsappLink || '') + '">' +
        '</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Mensaje predeterminado</label>' +
          '<input type="text" data-exp-hero-field="whatsappMessage" maxlength="280" ' +
            'placeholder="Hola, quiero recibir información..." value="' +
            esc(hero.whatsappMessage || '') + '">' +
        '</div>' +
        '<p class="builder-menu-hint">Misma fuente que la sección Hero. Experiencia no guarda una copia.</p>';
      void slots;
      return html;
    }

    if (n.kind === 'image' || n.kind === 'plan' || n.kind === 'pano360' || n.kind === 'scene' ||
        n.kind === 'vista' || n.kind === 'planta-3d' || n.kind === 'ficha' || n.kind === 'gallery' ||
        n.kind === 'video' || n.kind === 'animacion') {
      var ixs = (n.config && n.config.interactions) || [];
      var media = ExperienciaEngine.resolveSceneMedia
        ? ExperienciaEngine.resolveSceneMedia(state, n)
        : { filename: n.config && n.config.fileName, statusLabel: '—', assetId: null };
      var selIxId = state.experiencia && state.experiencia.canvas
        ? state.experiencia.canvas.selectedInteractionId
        : null;
      var hubPreview = ExperienciaEngine.ensureHubConfig
        ? ExperienciaEngine.ensureHubConfig(n)
        : (n.config && n.config.hub);
      var hubOn = !!(hubPreview && hubPreview.enabled);
      var selIx = (!hubOn && selIxId)
        ? ExperienciaEngine.getInteraction(state, n.id, selIxId)
        : null;

      if (selIx) {
        var structLink = ExperienciaEngine.resolveStructureLink
          ? ExperienciaEngine.resolveStructureLink(state, selIx)
          : null;
        var structOpts = ExperienciaEngine.listStructureLinkOptions
          ? ExperienciaEngine.listStructureLinkOptions(state)
          : [];
        var isFloorSel = String(selIx.type || '').toUpperCase() === 'SELECTOR' ||
          String(selIx.actionType || (selIx.behavior && selIx.behavior.type) || '').toLowerCase() === 'floor-selector';

        html += '<div class="builder-exp-inspector__section">Elemento</div>' +
          '<div class="builder-field builder-exp-inspector__field">' +
            '<label>Nombre</label>' +
            '<input type="text" data-exp-ix-label maxlength="120" value="' +
              esc(selIx.label || '') + '">' +
          '</div>' +
          '<div class="builder-exp-inspector__grid">' +
            row('Tipo', ExperienciaEngine.interactionTypeLabel
              ? ExperienciaEngine.interactionTypeLabel(selIx.type)
              : selIx.type) +
            row('Puerto', selIx.portId || selIx.id) +
            row('Acción', (selIx.actionType || (selIx.behavior && selIx.behavior.type) || '—')) +
            row('Estado', selIx.enabled === false ? 'Deshabilitado' : 'Activo') +
          '</div>';

        if (isFloorSel) {
          var tipOpts = ((state.estructura && state.estructura.tipologias) || []).map(function (tip, i) {
            var tid = tip.id || tip.localId || tip.node_id || ('t' + i);
            var label = tip.nombre || tip.modelo || ('Tipología ' + (i + 1));
            return { id: tid, label: label };
          });
          var beh = selIx.behavior || {};
          var selTip = beh.tipologiaId || (selIx.structureId ? String(selIx.structureId).replace(/^tip:/, '') : '');
          var plantas = [];
          if (selTip && ExperienciaEngine.listTypologyPlantas) {
            plantas = ExperienciaEngine.listTypologyPlantas(state, selTip, {
              kind: 'tipologia',
              tipologiaId: selTip
            }) || [];
          }
          var enabledKeys = beh.floorKeys || plantas.map(function (p) { return p.key; });
          html += '<div class="builder-exp-inspector__section">Selector de plantas</div>' +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<label>Tipología</label>' +
              '<select data-exp-ix-floor-tip>' +
                '<option value="">Elegir tipología…</option>' +
                tipOpts.map(function (t) {
                  return '<option value="' + esc(t.id) + '"' +
                    (String(selTip) === String(t.id) ? ' selected' : '') + '>' +
                    esc(t.label) + '</option>';
                }).join('') +
              '</select>' +
            '</div>';
          if (plantas.length) {
            html += '<div class="builder-exp-inspector__section">Plantas disponibles</div>' +
              plantas.map(function (p) {
                var on = enabledKeys.indexOf(p.key) !== -1 ||
                  enabledKeys.indexOf(String(p.key)) !== -1;
                return '<label class="builder-exp-inspector__check">' +
                  '<input type="checkbox" data-exp-ix-floor-key="' + esc(p.key) + '"' +
                  (on ? ' checked' : '') + '> ' + esc(p.label) + '</label>';
              }).join('') +
              '<div class="builder-field builder-exp-inspector__field" style="margin-top:8px">' +
                '<label>Planta inicial</label>' +
                '<select data-exp-ix-floor-initial>' +
                  plantas.map(function (p) {
                    var sel = String(beh.initialFloor || '') === String(p.key);
                    return '<option value="' + esc(p.key) + '"' + (sel ? ' selected' : '') + '>' +
                      esc(p.label) + '</option>';
                  }).join('') +
                '</select>' +
              '</div>';
          } else if (selTip) {
            html += '<p class="builder-menu-hint">Esta tipología no tiene plantas en Estructura.</p>';
          } else {
            html += '<p class="builder-menu-hint">Elige una tipología definida en Estructura.</p>';
          }
        } else {
          html += '<div class="builder-exp-inspector__section">Vincular con Estructura</div>' +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<label>Elemento estructural</label>' +
              '<select data-exp-ix-structure>' +
                '<option value="">Ninguno / Personalizado</option>' +
                structOpts.map(function (opt) {
                  var sel = (selIx.structureId && String(selIx.structureId) === String(opt.id)) ||
                    (selIx.structureKey && selIx.structureKey === opt.key);
                  return '<option value="' + esc(opt.id) + '" data-key="' + esc(opt.key) + '"' +
                    ' data-kind="' + esc(opt.kind || '') + '"' +
                    ' data-label="' + esc(opt.label) + '"' +
                    (sel ? ' selected' : '') + '>' + esc(opt.label) +
                    (opt.kind ? (' · ' + opt.kind) : '') + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            (structLink
              ? ('<p class="builder-menu-hint' + (structLink.missing ? ' is-warn' : '') + '">' +
                esc(structLink.display) + '</p>')
              : '<p class="builder-menu-hint">Opcional. No duplica Estructura; solo referencia.</p>');
        }

        html += '<div class="builder-exp-inspector__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="toggle" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">' +
              (selIx.enabled === false ? 'Habilitar' : 'Deshabilitar') + '</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="dup" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Duplicar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="unlink" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Desvincular</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-ix-act="del" data-exp-ix-id="' +
              esc(selIx.id) + '" data-exp-ix-scene="' + esc(n.id) + '">Eliminar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-clear-ix-sel>Volver a escena</button>' +
          '</div>';
        return html;
      }

      html += '<div class="builder-exp-inspector__section">Escena</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Nombre de la tarjeta</label>' +
          '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
        '</div>' +
        '<div class="builder-exp-inspector__grid">' +
          row('Tipo', n.typeLabel || n.kind) +
          row('Asset', media.filename || 'Sin asignar') +
          row('Estado media', media.statusLabel || 'Pendiente') +
          row('Asset ID', media.assetId || '—') +
          row('Estado', ExperienciaEngine.statusLabel(n)) +
          row('Origen', names(conn.in, 'from')) +
        '</div>';

      if (n.kind === 'video' || n.kind === 'animacion') {
        html += '<div class="builder-exp-inspector__grid">' +
          row('Autoplay', (n.config && n.config.autoplay) ? 'Sí' : 'No') +
          row('Al finalizar', (n.config && n.config.onEnd) || 'next') +
          row('Duración', (n.transitionSeconds || 4) + '–5 s') +
        '</div>';
      }

      html += '<div class="builder-exp-inspector__section">Media</div>' +
        '<div class="builder-field builder-exp-inspector__field">' +
          '<label>Asset (desde Media)</label>' +
          '<select data-exp-asset-pick>' +
            '<option value="">Sin asignar</option>' +
            (function () {
              var assets = ExperienciaEngine.listSelectableMediaAssets
                ? ExperienciaEngine.listSelectableMediaAssets(state)
                : (ExperienciaEngine.listProjectAssets
                  ? ExperienciaEngine.listProjectAssets(state).filter(function (a) {
                    return a && !a.orphan && a.nodeId && (a.filename || a.publicUrl);
                  })
                  : []);
              var curId = media.assetId || null;
              var curStillValid = curId && assets.some(function (a) {
                return String(a.id) === String(curId);
              });
              var htmlOpts = assets.map(function (a) {
                var label = a.filename || a.storagePath || a.id;
                var sel = curId && String(curId) === String(a.id);
                return '<option value="' + esc(a.id) + '"' + (sel ? ' selected' : '') + '>' +
                  esc(label) + '</option>';
              }).join('');
              if (curId && !curStillValid) {
                htmlOpts =
                  '<option value="' + esc(curId) + '" selected disabled>' +
                    esc((media.filename || curId) + ' (no está en Media)') +
                  '</option>' + htmlOpts;
              }
              return htmlOpts;
            })() +
          '</select>' +
        '</div>' +
        (media.publicUrl
          ? '<p class="builder-menu-hint" style="margin:6px 0 10px;word-break:break-all">CDN: <a href="' +
            esc(media.publicUrl) + '" target="_blank" rel="noopener">' + esc(media.publicUrl) + '</a></p>'
          : '<p class="builder-menu-hint">Solo assets del inventario Media.</p>') +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-asset-clear="' +
            esc(n.id) + '">Quitar referencia</button>' +
        '</div>';

      var hub = ExperienciaEngine.ensureHubConfig
        ? ExperienciaEngine.ensureHubConfig(n)
        : ((n.config && n.config.hub) || null);
      if (hub && hub.enabled && ExperienciaEngine.syncHubSmartSelector) {
        ExperienciaEngine.syncHubSmartSelector(state, n);
      }
      html += hubSmartInspectorHtml(state, n, hub);

      if (!(hub && hub.enabled)) {
        html += '<div class="builder-exp-inspector__ix-head">' +
          '<span>Elementos de la escena</span>' +
          '<button type="button" class="builder-exp-inspector__ix-add" data-exp-add-element="' +
            esc(n.id) + '">+ Agregar</button></div>';
        html += interactionInspectorList(n, ixs);
        html += '<p class="builder-menu-hint">Eliminar un elemento no borra su escena destino ni el asset.</p>';
      }
      return html;
    }

    if (n.kind === 'action') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Tipo', (n.config && n.config.actionType) || '—') +
        row('Inline', (n.config && n.config.inline) ? 'Sí (sin cambiar escena)' : 'No') +
        row('Origen', names(conn.in, 'from')) +
      '</div>';
      return html;
    }

    if (n.kind === 'structure' || n.kind === 'group') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Elemento', n.label || '—') +
        row('Unidades', String(n.unitCount != null ? n.unitCount : '—')) +
        row('Origen', names(conn.in, 'from')) +
      '</div>' +
        '<div class="builder-exp-inspector__actions">' +
          '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-enter-group="' +
            esc(n.id) + '">Entrar al flujo interno</button>' +
          '<p class="builder-menu-hint">Base de jerarquía lista; pisos/plantas se detallan en versiones siguientes.</p>' +
        '</div>';
      return html;
    }

    if (n.kind === 'hotspot' || n.kind === 'selector-pisos') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre de la tarjeta</label>' +
        '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
      '</div>' +
        '<div class="builder-exp-inspector__grid">' +
        row('Legacy', 'Nodo V5.9.56 (no migrado automáticamente)') +
        row('Vinculado', (n.config && n.config.structureLabel) || '—') +
        row('Destino', names(conn.out, 'to')) +
      '</div>' +
        '<p class="builder-menu-hint">Si este hotspot pertenece a una sola escena, recarga Experiencia para embeberlo.</p>';
      return html;
    }

    html += '<div class="builder-field builder-exp-inspector__field">' +
      '<label>Nombre de la tarjeta</label>' +
      '<input type="text" data-exp-node-label maxlength="120" value="' + esc(n.label || '') + '">' +
    '</div>' +
      '<div class="builder-exp-inspector__grid">' +
      row('Estado', ExperienciaEngine.statusLabel(n)) +
      row('Tipo', n.kind || '—') +
      row('Origen', names(conn.in, 'from')) +
      row('Destino', names(conn.out, 'to')) +
    '</div>';
    return html;
  }

  function interactionInspectorList(scene, list) {
    if (!list || !list.length) {
      return '<p class="builder-menu-hint builder-exp-inspector__ix-empty">Ninguno</p>';
    }
    return '<ul class="builder-exp-inspector__ix-list">' +
      list.map(function (ix) {
        var behavior = (ix.behavior && ix.behavior.type) || ix.actionType || '—';
        return '<li class="builder-exp-inspector__ix-item' +
          (ix.enabled === false ? ' is-disabled' : '') +
          '" data-exp-ix-id="' + esc(ix.id) + '" data-exp-ix-scene="' + esc(scene.id) + '">' +
          '<div class="builder-exp-inspector__ix-main">' +
            '<strong>' + esc(ix.label || ix.type) + '</strong>' +
            '<span>' + esc(ix.type) + (behavior !== '—' ? (' · ' + behavior) : '') + '</span>' +
          '</div>' +
          '<div class="builder-exp-inspector__ix-acts">' +
            '<button type="button" data-exp-ix-act="rename" title="Renombrar">✎</button>' +
            '<button type="button" data-exp-ix-act="toggle" title="Habilitar/Deshabilitar">' +
              (ix.enabled === false ? '○' : '●') + '</button>' +
            '<button type="button" data-exp-ix-act="dup" title="Duplicar">⧉</button>' +
            '<button type="button" data-exp-ix-act="unlink" title="Desvincular">⊘</button>' +
            '<button type="button" data-exp-ix-act="del" title="Eliminar" class="is-danger">×</button>' +
          '</div>' +
        '</li>';
      }).join('') +
    '</ul>';
  }

  function row(label, value) {
    return '<div class="builder-exp-inspector__row"><span>' + esc(label) +
      '</span><strong>' + esc(value) + '</strong></div>';
  }

  function createMenuHtml(title, menu) {
    menu = menu || ExperienciaEngine.CREATE_MENU || [];
    return '<div class="builder-exp-ctx__panel">' +
      '<div class="builder-exp-ctx__title">' + esc(title || '¿Qué quieres crear?') + '</div>' +
      menu.map(function (cat) {
        return '<div class="builder-exp-ctx__cat">' +
          '<div class="builder-exp-ctx__cat-label">' + esc(cat.label) + '</div>' +
          cat.items.map(function (it) {
            return '<button type="button" class="builder-exp-ctx__item" data-exp-create="' +
              esc(it.id) + '" data-cat="' + esc(cat.id) + '">' + esc(it.label) + '</button>';
          }).join('') +
        '</div>';
      }).join('') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function addElementMenuHtml() {
    var menu = ExperienciaEngine.ADD_ELEMENT_MENU || [];
    return '<div class="builder-exp-ctx__panel">' +
      '<div class="builder-exp-ctx__title">Agregar elemento</div>' +
      menu.map(function (cat) {
        return '<div class="builder-exp-ctx__cat">' +
          '<div class="builder-exp-ctx__cat-label">' + esc(cat.label) + '</div>' +
          cat.items.map(function (it) {
            return '<button type="button" class="builder-exp-ctx__item" data-exp-add-el-item="' +
              esc(it.id) + '">' + esc(it.label) + '</button>';
          }).join('') +
        '</div>';
      }).join('') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function interactionContextMenuHtml(ix) {
    var on = !ix || ix.enabled !== false;
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--ix">' +
      '<div class="builder-exp-ctx__title">' + esc((ix && ix.label) || 'Interacción') + '</div>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="configure">Configurar</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="duplicate">Duplicar</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="toggle">' +
        (on ? 'Deshabilitar' : 'Habilitar') + '</button>' +
      '<button type="button" class="builder-exp-ctx__item" data-exp-ix-ctx="unlink">Desvincular</button>' +
      '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-ix-ctx="delete">Eliminar</button>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function nodeContextMenuHtml(nodes) {
    var list = nodes || [];
    var multi = list.length > 1;
    var anyLocked = list.some(function (n) { return n && n.locked; });
    var anyUnlocked = list.some(function (n) {
      return n && !n.locked && !ExperienciaEngine.isProtectedNode(n);
    });
    var allProtected = list.length && list.every(function (n) {
      return ExperienciaEngine.isProtectedNode(n);
    });
    var canDuplicate = list.some(function (n) {
      return n && !ExperienciaEngine.isProtectedNode(n);
    });
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--node">' +
      '<div class="builder-exp-ctx__title">' +
        (multi ? ('Selección · ' + list.length) : esc((list[0] && list[0].label) || 'Nodo')) +
      '</div>' +
      (!multi
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="rename">Renombrar</button>'
        : '') +
      (canDuplicate
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="duplicate">' +
          (multi ? 'Duplicar selección' : 'Duplicar') + '</button>'
        : '<button type="button" class="builder-exp-ctx__item is-disabled" disabled>Duplicar (protegido)</button>') +
      (anyUnlocked
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="lock">Bloquear</button>'
        : '') +
      (anyLocked
        ? '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="unlock">Desbloquear</button>'
        : '') +
      '<button type="button" class="builder-exp-ctx__item" data-exp-node-act="unlink">Desvincular</button>' +
      (allProtected
        ? '<button type="button" class="builder-exp-ctx__item is-disabled" disabled>Eliminar (protegido)</button>'
        : '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-node-act="delete">' +
          (multi ? 'Eliminar selección' : 'Eliminar') + '</button>') +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function edgeContextMenuHtml() {
    return '<div class="builder-exp-ctx__panel builder-exp-ctx__panel--edge">' +
      '<div class="builder-exp-ctx__title">Conexión</div>' +
      '<button type="button" class="builder-exp-ctx__item is-danger" data-exp-edge-act="unlink">' +
        'Desvincular conexión</button>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-ctx-cancel>Cancelar</button>' +
    '</div>';
  }

  function structurePickerHtml(state) {
    var tree = ExperienciaEngine.listStructureLibrary(state) || [];
    function walk(items, depth) {
      return (items || []).map(function (it) {
        var hasKids = it.children && it.children.length;
        return '<div class="builder-exp-picker__row" style="--d:' + depth + '">' +
          '<button type="button" class="builder-exp-picker__item" data-exp-struct="' + esc(it.id) + '"' +
            ' data-label="' + esc(it.label) + '"' +
            ' data-kind="' + esc(it.kind || '') + '"' +
            ' data-capacity="' + esc(it.capacity != null ? it.capacity : '') + '"' +
            ' data-stage="' + esc(it.stageId || '') + '">' +
            esc(it.label) +
            (it.capacity != null ? (' · ' + it.capacity + ' viv.') : '') +
          '</button>' +
        '</div>' +
        (hasKids ? walk(it.children, depth + 1) : '');
      }).join('');
    }
    return '<div class="builder-exp-picker__panel">' +
      '<div class="builder-exp-ctx__title">Vincular desde Estructura</div>' +
      '<div class="builder-exp-picker__tree">' + walk(tree, 0) + '</div>' +
      '<button type="button" class="builder-exp-ctx__cancel" data-exp-picker-cancel>Cancelar</button>' +
    '</div>';
  }

  function findMenuItem(id, menu) {
    var menus = menu
      ? [menu]
      : [ExperienciaEngine.CREATE_MENU || [], ExperienciaEngine.CREATE_MENU_BLANK || []];
    for (var m = 0; m < menus.length; m++) {
      var cats = menus[m] || [];
      for (var i = 0; i < cats.length; i++) {
        for (var j = 0; j < cats[i].items.length; j++) {
          if (cats[i].items[j].id === id) return cats[i].items[j];
        }
      }
    }
    return null;
  }

  function mount(rootEl, state, api) {
    api = api || {};
    var overlayMode = !!api.overlayMode;

    ExperienciaEngine.ensureFlow(state);

    /* V6.5.01 — baseline snapshot + recovery offer if a richer copy exists */
    if (!overlayMode && typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
      ExperienciaSnapshot.capture(state, 'open-experiencia', 'autosave');
    }

    var stage = rootEl.querySelector('[data-exp-stage]');
    var viewport = rootEl.querySelector('[data-exp-viewport]');
    var world = rootEl.querySelector('[data-exp-world]');
    var nodesEl = rootEl.querySelector('[data-exp-nodes]');
    var edgesEl = rootEl.querySelector('[data-exp-edges]');
    var buttonsStage = rootEl.querySelector('[data-exp-buttons-stage]');
    var buttonsFrame = rootEl.querySelector('[data-exp-buttons-frame]');
    var buttonsImg = rootEl.querySelector('[data-exp-buttons-img]');
    var buttonsLayer = rootEl.querySelector('[data-exp-buttons-layer]');
    var buttonsEmpty = rootEl.querySelector('[data-exp-buttons-empty]');
    var hotspotsStage = rootEl.querySelector('[data-exp-hotspots-stage]');
    var hotspotsFrame = rootEl.querySelector('[data-exp-hotspots-frame]');
    var hotspotsImg = rootEl.querySelector('[data-exp-hotspots-img]');
    var hotspotsLayer = rootEl.querySelector('[data-exp-hotspots-layer]');
    var hotspotsSvg = rootEl.querySelector('[data-exp-hotspots-svg]');
    var hotspotsEmpty = rootEl.querySelector('[data-exp-hotspots-empty]');
    var protoStage = rootEl.querySelector('[data-exp-proto-stage]');
    var protoHost = rootEl.querySelector('[data-exp-proto-host]');
    var protoRuntimePlayer = null;
    var protoFingerprint = null;
    var hotspotDraw = null; /* { points: [{x,y}], cursor: {x,y}|null } */
    var hotspotDrag = null; /* vertex | poly move */
    var modeTabs = rootEl.querySelector('[data-exp-mode-tabs]');
    var inspectorBody = api.inspectorBody ||
      ((typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.getInspectorBody)
        ? BuilderPropertiesRail.getInspectorBody(rootEl)
        : rootEl.querySelector('[data-exp-inspector-body]'));
    var inspector = null;
    var workspace = rootEl.querySelector('[data-exp-workspace]');
    var minimapWrap = rootEl.querySelector('[data-exp-minimap]');
    var minimapCanvas = rootEl.querySelector('[data-exp-minimap-canvas]');
    var ctxEl = rootEl.querySelector('[data-exp-ctx]');
    var pickerEl = rootEl.querySelector('[data-exp-picker]');
    var modalEl = rootEl.querySelector('[data-exp-modal]');
    if (!viewport || !world || !nodesEl || !edgesEl) return null;

    var dragging = null;
    var buttonDrag = null;
    var transformDrag = null;
    var textEditEl = null;
    var buttonHistory = { past: [], future: [], max: 100 };
    var buttonOpArmed = false;
    var buttonNudgeDirty = false;
    var buttonClipboard = null; /* { sourceIds: string[] } */
    var pendingMoveIds = {}; /* id -> true while stacked on original after paste */

    function pushButtonHistory(sceneId) {
      if (!ExperienciaEngine.snapshotSceneButtons) return;
      var sid = sceneId || canvas().selectedId;
      if (!sid) return;
      var snap = ExperienciaEngine.snapshotSceneButtons(state, sid);
      if (!snap) return;
      buttonHistory.past.push(snap);
      if (buttonHistory.past.length > buttonHistory.max) {
        buttonHistory.past.shift();
      }
      buttonHistory.future = [];
    }

    function undoButtonEdit() {
      if (!buttonHistory.past.length || !ExperienciaEngine.restoreSceneButtons) return false;
      var prev = buttonHistory.past.pop();
      var current = ExperienciaEngine.snapshotSceneButtons(state, prev.sceneId);
      if (current) buttonHistory.future.push(current);
      ExperienciaEngine.restoreSceneButtons(state, prev);
      return true;
    }

    function redoButtonEdit() {
      if (!buttonHistory.future.length || !ExperienciaEngine.restoreSceneButtons) return false;
      var next = buttonHistory.future.pop();
      var current = ExperienciaEngine.snapshotSceneButtons(state, next.sceneId);
      if (current) {
        buttonHistory.past.push(current);
        if (buttonHistory.past.length > buttonHistory.max) buttonHistory.past.shift();
      }
      ExperienciaEngine.restoreSceneButtons(state, next);
      return true;
    }

    function armButtonOp(sceneId) {
      if (buttonOpArmed) return;
      pushButtonHistory(sceneId);
      buttonOpArmed = true;
    }

    function endButtonOp() {
      buttonOpArmed = false;
    }
    var panning = null;
    var linkDrag = null;
    var marquee = null;
    var spacePan = false;
    var pendingCreate = null;
    var ctxMode = null; /* 'create' | 'node' | 'edge' | null */
    var marqueeEl = rootEl.querySelector('[data-exp-marquee]');
    var hoverCutEdgeId = null;
    var renameEdit = null; /* { nodeId, original, input } */

    function isFormField(el) {
      if (!el) return false;
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return !!(el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
    }

    function defaultNodeLabel(n) {
      if (!n) return 'Escena';
      if (n.kind === 'image') return 'Vista general';
      if (n.kind === 'video' || n.kind === 'animacion') return 'Animación';
      if (n.kind === 'plan' || n.kind === 'planta-3d') return 'Planta';
      if (n.kind === 'pano360') return '360°';
      return n.typeLabel || n.kind || 'Escena';
    }

    /** BOXIES confirm — never uses window.confirm (fullscreen-safe). */
    function boxiesConfirm(opts) {
      opts = opts || {};
      if (typeof AdminUI !== 'undefined' && typeof AdminUI.confirm === 'function') {
        return AdminUI.confirm({
          title: opts.title || 'Confirmar',
          message: opts.message || '',
          confirmLabel: opts.confirmLabel || 'Confirmar',
          cancelLabel: opts.cancelLabel || 'Cancelar'
        });
      }
      return new Promise(function (resolve) {
        if (!modalEl) { resolve(false); return; }
        modalEl.hidden = false;
        modalEl.innerHTML =
          '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
          '<div class="builder-exp-modal__panel" role="dialog">' +
            '<h3 class="builder-exp-modal__title">' + esc(opts.title || 'Confirmar') + '</h3>' +
            '<p class="builder-exp-modal__body">' + esc(opts.message || '') + '</p>' +
            '<div class="builder-exp-modal__actions">' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>' +
                esc(opts.cancelLabel || 'Cancelar') + '</button>' +
              '<button type="button" class="builder-header-action-btn is-danger" data-exp-modal-confirm>' +
                esc(opts.confirmLabel || 'Confirmar') + '</button>' +
            '</div>' +
          '</div>';
        function close(val) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          resolve(!!val);
        }
        modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
          btn.addEventListener('click', function () { close(false); });
        });
        var conf = modalEl.querySelector('[data-exp-modal-confirm]');
        if (conf) conf.addEventListener('click', function () { close(true); });
      });
    }

    /** BOXIES text prompt — never uses window.prompt. */
    function boxiesPrompt(opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        if (!modalEl) { resolve(null); return; }
        modalEl.hidden = false;
        modalEl.innerHTML =
          '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
          '<div class="builder-exp-modal__panel" role="dialog">' +
            '<h3 class="builder-exp-modal__title">' + esc(opts.title || 'Nombre') + '</h3>' +
            (opts.message
              ? ('<p class="builder-exp-modal__body">' + esc(opts.message) + '</p>')
              : '') +
            '<div class="builder-field builder-exp-inspector__field">' +
              '<input type="text" data-exp-modal-input maxlength="120" value="' +
                esc(opts.defaultValue || '') + '">' +
            '</div>' +
            '<div class="builder-exp-modal__actions">' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cancelar</button>' +
              '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-primary" data-exp-modal-confirm>Aceptar</button>' +
            '</div>' +
          '</div>';
        var input = modalEl.querySelector('[data-exp-modal-input]');
        function close(val) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          resolve(val);
        }
        modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
          btn.addEventListener('click', function () { close(null); });
        });
        var conf = modalEl.querySelector('[data-exp-modal-confirm]');
        if (conf) {
          conf.addEventListener('click', function () {
            close(input ? String(input.value || '') : '');
          });
        }
        if (input) {
          setTimeout(function () { input.focus(); input.select(); }, 20);
          input.addEventListener('keydown', function (ev) {
            ev.stopPropagation();
            if (ev.key === 'Enter') {
              ev.preventDefault();
              close(String(input.value || ''));
            }
            if (ev.key === 'Escape') {
              ev.preventDefault();
              close(null);
            }
          });
        }
      });
    }

    function finishInlineRename(save) {
      if (!renameEdit) return;
      var nodeId = renameEdit.nodeId;
      var original = renameEdit.original;
      var input = renameEdit.input;
      var n = ExperienciaEngine.getNode(state, nodeId);
      var raw = input ? String(input.value || '').trim() : '';
      var next = save
        ? (raw || defaultNodeLabel(n) || original || 'Escena')
        : original;
      renameEdit = null;
      if (save && n && next && next !== original) {
        ExperienciaEngine.renameNode(state, nodeId, next);
        persist();
      }
      renderAll();
    }

    function startInlineRename(nodeId) {
      if (!nodeId || !nodesEl) return;
      var n = ExperienciaEngine.getNode(state, nodeId);
      if (!n) return;
      if (n.kind === 'hero') return;
      hideCtx();
      if (renameEdit) {
        renameEdit = null;
      }

      ExperienciaEngine.setSelection(state, [nodeId], []);
      canvas().selectedInteractionId = null;
      canvas().selectedInteractionSceneId = null;
      openPropertiesRail();
      paintNodes();
      paintEdges();
      paintInspector();
      syncInspectorChrome();

      var title = nodesEl.querySelector(
        '[data-exp-card-title="' + String(nodeId).replace(/"/g, '') + '"]'
      );
      if (!title) return;

      var original = n.label || defaultNodeLabel(n);
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'builder-exp-card__title-input';
      input.value = original;
      input.maxLength = 120;
      input.setAttribute('data-exp-rename-input', nodeId);
      input.setAttribute('aria-label', 'Nombre de la tarjeta');
      title.replaceWith(input);
      renameEdit = { nodeId: nodeId, original: original, input: input };

      function onKey(ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
          ev.preventDefault();
          finishInlineRename(true);
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          finishInlineRename(false);
        }
      }
      function onPointer(ev) { ev.stopPropagation(); }
      input.addEventListener('keydown', onKey);
      input.addEventListener('keyup', function (ev) { ev.stopPropagation(); });
      input.addEventListener('keypress', function (ev) { ev.stopPropagation(); });
      input.addEventListener('pointerdown', onPointer);
      input.addEventListener('mousedown', onPointer);
      input.addEventListener('click', onPointer);
      input.addEventListener('dblclick', onPointer);
      input.addEventListener('blur', function () {
        if (!renameEdit || renameEdit.nodeId !== nodeId) return;
        if (!input.isConnected) return; /* paintNodes detach — ignore */
        finishInlineRename(true);
      });

      setTimeout(function () {
        try { input.focus(); input.select(); } catch (eF) {}
      }, 0);
    }

    function reattachRenameInput() {
      if (!renameEdit || !renameEdit.nodeId || !nodesEl || !renameEdit.input) return;
      var title = nodesEl.querySelector(
        '[data-exp-card-title="' + String(renameEdit.nodeId).replace(/"/g, '') + '"]'
      );
      if (!title) return;
      title.replaceWith(renameEdit.input);
    }

    function selectedIds() {
      var c = canvas();
      if (Array.isArray(c.selectedIds) && c.selectedIds.length) return c.selectedIds.slice();
      return c.selectedId ? [c.selectedId] : [];
    }

    function selectedNodes() {
      return selectedIds().map(function (id) {
        return ExperienciaEngine.getNode(state, id);
      }).filter(Boolean);
    }

    function canvas() {
      return ExperienciaEngine.ensureState(state).canvas;
    }

    if (overlayMode && api.overlayNodeId) {
      canvas().selectedId = api.overlayNodeId;
      canvas().selectedIds = [api.overlayNodeId];
      if (api.editMode === 'hotspots' || api.editMode === 'buttons') {
        canvas().editMode = api.editMode;
      } else if (canvas().editMode !== 'buttons' && canvas().editMode !== 'hotspots') {
        canvas().editMode = 'buttons';
      }
    }

    function persist() {
      if (ExperienciaEngine.markExperienciaDirty) {
        ExperienciaEngine.markExperienciaDirty(state);
      }
      if (api.onChange) api.onChange();
      else if (api.saveState) api.saveState();
    }

    function notifyOverlaySelection() {
      if (!api.onSelectionChange) return;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.map(String)
        : [];
      if (!ids.length && canvas().selectedButtonId) {
        ids = [String(canvas().selectedButtonId)];
      }
      var hs = canvas().selectedHotspotId || null;
      try {
        api.onSelectionChange({
          buttonIds: ids,
          buttonId: canvas().selectedButtonId || null,
          hotspotId: hs,
          hasSelection: !!(ids.length || hs)
        });
      } catch (eSelNotify) { /* ignore */ }
    }

    function applyWorldTransform() {
      if (!world || !world.style) return;
      var c = canvas();
      if (!c) return;
      world.style.transform =
        'translate(' + c.panX + 'px,' + c.panY + 'px) scale(' + c.zoom + ')';
      world.style.transformOrigin = '0 0';
    }

    function clientToWorld(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var c = canvas();
      return {
        x: (clientX - rect.left - c.panX) / c.zoom,
        y: (clientY - rect.top - c.panY) / c.zoom
      };
    }

    /** Exact world anchor from the port circle DOM; fallback to math. */
    function resolvePortAnchor(n, portId, side) {
      var pid = portId || (side === 'in' ? 'in' : 'out');
      if (nodesEl && n && n.id != null) {
        var card = nodesEl.querySelector('[data-exp-node="' + String(n.id).replace(/"/g, '') + '"]');
        if (card) {
          var portEl = card.querySelector(
            '[data-exp-port="' + (side === 'in' ? 'in' : 'out') + '"][data-port-id="' +
            String(pid).replace(/"/g, '') + '"]'
          );
          if (!portEl && side === 'out') {
            portEl = card.querySelector('[data-exp-port="out"]');
          }
          if (!portEl && side === 'in') {
            portEl = card.querySelector('[data-exp-port="in"]');
          }
          if (portEl) {
            var zoom = canvas().zoom || 1;
            var cardRect = card.getBoundingClientRect();
            var portRect = portEl.getBoundingClientRect();
            var ox = (portRect.left + portRect.width / 2 - cardRect.left) / zoom;
            var oy = (portRect.top + portRect.height / 2 - cardRect.top) / zoom;
            return { x: (n.x || 0) + ox, y: (n.y || 0) + oy };
          }
        }
      }
      return portAnchorFallback(n, pid, side);
    }

    function paintNodes() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var ids = selectedIds();
      var idSet = {};
      ids.forEach(function (id) { idSet[id] = true; });
      nodesEl.innerHTML = nodes.map(function (n) {
        return nodeCardHtml(n, state);
      }).join('');
      nodesEl.querySelectorAll('[data-exp-node]').forEach(function (el) {
        var nid = el.getAttribute('data-exp-node');
        if (idSet[nid]) el.classList.add('is-selected');
      });
      if (renameEdit && renameEdit.nodeId) {
        reattachRenameInput();
      }
      if (linkDrag && linkDrag.portId && linkDrag.fromId) {
        var linkingPort = nodesEl.querySelector(
          '[data-exp-node="' + String(linkDrag.fromId).replace(/"/g, '') + '"] ' +
          '[data-exp-port="out"][data-port-id="' + String(linkDrag.portId).replace(/"/g, '') + '"]'
        );
        if (linkingPort) {
          linkingPort.classList.add('is-linking');
          var row = linkingPort.closest('[data-exp-irow]');
          if (row) row.classList.add('is-linking');
        }
      }
      syncToolUi();
    }

    function paintEdges() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      var all = state.experiencia.nodes || [];
      all.forEach(function (n) { if (!byId[n.id]) byId[n.id] = n; });

      var b = ExperienciaEngine.bounds(nodes);
      var pad = 80;
      var w = Math.max(1400, b.maxX - b.minX + pad * 2);
      var h = Math.max(900, b.maxY - b.minY + pad * 2);
      edgesEl.setAttribute('width', String(w));
      edgesEl.setAttribute('height', String(h));
      edgesEl.style.width = w + 'px';
      edgesEl.style.height = h + 'px';

      var selE = canvas().selectedEdgeId;
      var edgeSel = {};
      (canvas().selectedEdgeIds || []).forEach(function (id) { edgeSel[id] = true; });
      if (selE) edgeSel[selE] = true;

      var paths = (state.experiencia.edges || []).map(function (ed) {
        var a = byId[ed.sourceNodeId || ed.from || ed.sourceId];
        var b2 = byId[ed.targetNodeId || ed.to || ed.targetId];
        if (!a || !b2 || a.x == null || b2.x == null) return '';
        var srcPort = ed.sourcePortId || ed.sourcePort || ed.portId || 'out';
        var tgtPort = ed.targetPortId || ed.targetPort || 'in';
        var pOut = resolvePortAnchor(a, srcPort, 'out');
        var pIn = resolvePortAnchor(b2, tgtPort, 'in');
        var cls = 'builder-exp-edge-path' +
          (ed.manual ? ' is-manual' : '') +
          (ed.inlineAction ? ' is-inline' : '') +
          (edgeSel[ed.id] ? ' is-selected' : '') +
          (hoverCutEdgeId === ed.id ? ' is-cut-hover' : '');
        return '<path class="' + cls + '" data-exp-edge="' + esc(ed.id) + '"' +
          ' data-source-port="' + esc(srcPort) + '"' +
          ' d="' + bezierPath(pOut.x, pOut.y, pIn.x, pIn.y) + '" fill="none" />';
      }).join('');

      if (linkDrag && linkDrag.fromId) {
        var src = byId[linkDrag.fromId];
        if (src) {
          var a2 = resolvePortAnchor(src, linkDrag.portId || 'out', 'out');
          paths += '<path class="builder-exp-edge-path is-draft" d="' +
            bezierPath(a2.x, a2.y, linkDrag.x, linkDrag.y) + '" fill="none" />';
        }
      }
      edgesEl.innerHTML = paths;
    }

    function paintMinimap() {
      if (!minimapCanvas || !viewport || !canvas().minimapVisible) return;
      var ctx = minimapCanvas.getContext('2d');
      if (!ctx) return;
      var cw = minimapCanvas.width;
      var ch = minimapCanvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, cw, ch);
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var spanX = Math.max(1, b.maxX - b.minX);
      var spanY = Math.max(1, b.maxY - b.minY);
      var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
      var ox = (cw - spanX * scale) / 2;
      var oy = (ch - spanY * scale) / 2;
      nodes.forEach(function (n) {
        if (n.x == null) return;
        ctx.fillStyle = n.kind === 'hero'
          ? 'rgba(111,191,134,0.95)'
          : (n.status === 'ready'
            ? 'rgba(111,191,134,0.85)'
            : 'rgba(229,72,77,0.85)');
        var s = ExperienciaEngine.nodeSize(n);
        ctx.fillRect(ox + (n.x - b.minX) * scale, oy + (n.y - b.minY) * scale,
          Math.max(6, s.w * scale * 0.2), Math.max(4, s.h * scale * 0.15));
      });
      var c = canvas();
      var vr = viewport.getBoundingClientRect();
      var vx = (-c.panX / c.zoom - b.minX) * scale + ox;
      var vy = (-c.panY / c.zoom - b.minY) * scale + oy;
      var vw = (vr.width / c.zoom) * scale;
      var vh = (vr.height / c.zoom) * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw, vh);
    }

    function paintInspector() {
      if (overlayMode) notifyOverlaySelection();
      if (!inspectorBody) return;
      /* Quotation overlay: inspector stays blank until real props land. */
      if (overlayMode) {
        inspectorBody.innerHTML = '';
        return;
      }
      var ids = selectedIds();
      var editMode = canvas().editMode || 'flow';

      if (editMode === 'buttons') {
        var scene = ExperienciaEngine.getNode(state, canvas().selectedId);
        if (scene && ExperienciaEngine.isButtonsEditableNode &&
            ExperienciaEngine.isButtonsEditableNode(scene)) {
          inspectorBody.innerHTML = buttonsInspectorHtml(state, scene);
          bindButtonsInspectorActions();
          if (typeof WorkspaceSelect !== 'undefined' && WorkspaceSelect.enhance) {
            WorkspaceSelect.enhance(inspectorBody);
          }
          return;
        }
      }

      if (editMode === 'hotspots') {
        var hsScene = ExperienciaEngine.getNode(state, canvas().selectedId);
        if (hsScene && ExperienciaEngine.isHotspotsEditableNode &&
            ExperienciaEngine.isHotspotsEditableNode(hsScene)) {
          inspectorBody.innerHTML = hotspotsInspectorHtml(state, hsScene);
          bindHotspotsInspectorActions();
          return;
        }
      }

      if (editMode === 'prototype') {
        inspectorBody.innerHTML = prototypeInspectorHtml(state);
        bindPrototypeInspectorActions();
        return;
      }

      if (ids.length > 1) {
        inspectorBody.innerHTML =
          '<div class="builder-exp-inspector__kind">SELECCIÓN</div>' +
          '<h3 class="builder-exp-inspector__title">' + ids.length + ' nodos</h3>' +
          '<p class="builder-menu-hint">Duplicar, bloquear, desvincular o eliminar desde el menú contextual (clic derecho).</p>' +
          '<ul class="builder-exp-inspector__list">' +
            ids.map(function (id) {
              var n = ExperienciaEngine.getNode(state, id);
              return '<li>' + esc(n ? (n.label || n.id) : id) +
                (n && n.locked ? ' · bloqueado' : '') +
                (n && ExperienciaEngine.isProtectedNode(n) ? ' · protegido' : '') +
                '</li>';
            }).join('') +
          '</ul>';
        return;
      }
      inspectorBody.innerHTML = inspectorHtml(state, canvas().selectedId, canvas().selectedEdgeId);
      bindInspectorActions();
      if (typeof WorkspaceSelect !== 'undefined' && WorkspaceSelect.enhance) {
        WorkspaceSelect.enhance(inspectorBody);
      }
    }

    function bindButtonsInspectorActions() {
      if (!inspectorBody) return;
      var sceneId = canvas().selectedId;
      var spaceAxis = 'y';
      function layerSize() {
        return {
          w: (buttonsLayer && buttonsLayer.clientWidth) || 1000,
          h: (buttonsLayer && buttonsLayer.clientHeight) || 1000
        };
      }
      function selectedIds() {
        var ids = canvas().selectedButtonIds;
        if (!Array.isArray(ids) || !ids.length) {
          return canvas().selectedButtonId ? [canvas().selectedButtonId] : [];
        }
        return ids.slice();
      }
      function setButtonSelection(ids, primary) {
        var next = (ids || []).filter(Boolean).map(String);
        canvas().selectedButtonIds = next;
        canvas().selectedButtonId = primary
          ? String(primary)
          : (next.length ? next[next.length - 1] : null);
      }
      function patchBtn(patch, opts) {
        opts = opts || {};
        var id = canvas().selectedButtonId;
        if (!id) return;
        if (opts.history !== false) {
          if (opts.gesture) armButtonOp(sceneId);
          else {
            pushButtonHistory(sceneId);
            endButtonOp();
          }
        }
        ExperienciaEngine.updateSceneButton(state, sceneId, id, patch);
        paintButtonsStage();
        if (opts.inspector) paintInspector();
        if (opts.persist) {
          endButtonOp();
          persist();
        }
      }
      var addBtn = inspectorBody.querySelector('[data-exp-btn-add]');
      if (addBtn) {
        addBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var btn = ExperienciaEngine.addSceneButton(state, sceneId);
          if (btn) {
            setButtonSelection([btn.id], btn.id);
            renderAll(); persist();
          }
        });
      }
      var addText = inspectorBody.querySelector('[data-exp-text-add]');
      if (addText) {
        addText.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var tx = ExperienciaEngine.addSceneText(state, sceneId);
          if (tx) {
            setButtonSelection([tx.id], tx.id);
            renderAll(); persist();
          }
        });
      }
      var addShape = inspectorBody.querySelector('[data-exp-shape-add]');
      if (addShape) {
        addShape.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var sh = ExperienciaEngine.addSceneShape(state, sceneId, 'SHAPE_RECT');
          if (sh) {
            setButtonSelection([sh.id], sh.id);
            renderAll(); persist();
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-select]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var bid = el.getAttribute('data-exp-btn-select');
          var cur = selectedIds();
          if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
            var idx = cur.indexOf(String(bid));
            if (idx >= 0) cur.splice(idx, 1);
            else cur.push(String(bid));
            setButtonSelection(cur, bid);
          } else {
            setButtonSelection([bid], bid);
          }
          renderAll();
        });
      });
      var labelEl = inspectorBody.querySelector('[data-exp-btn-label]');
      if (labelEl) {
        labelEl.addEventListener('input', function () {
          patchBtn({ label: labelEl.value }, { gesture: true });
        });
        labelEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var targetEl = inspectorBody.querySelector('[data-exp-btn-target]');
      if (targetEl) {
        targetEl.addEventListener('change', function () {
          patchBtn({ targetNodeId: targetEl.value || null }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-style]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          patchBtn({ style: el.getAttribute('data-exp-btn-style') }, { inspector: true, persist: true });
        });
      });
      var iconEl = inspectorBody.querySelector('[data-exp-btn-icon]');
      if (iconEl) {
        iconEl.addEventListener('change', function () {
          patchBtn({ icon: iconEl.value }, { persist: true });
        });
      }
      function bindColor(sel, key) {
        var el = inspectorBody.querySelector(sel);
        if (!el) return;
        var live = null;
        el.addEventListener('input', function () {
          var col = String(el.value || '').trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(col)) return;
          live = col.toLowerCase();
          var p = {};
          p[key] = col;
          patchBtn(p, { gesture: true });
        });
        el.addEventListener('change', function () {
          endButtonOp();
          var col = String(el.value || '').trim().toLowerCase();
          if (live && col === '#ffffff' && live !== '#ffffff') {
            col = live;
            el.value = col;
          }
          if (!/^#[0-9a-fA-F]{6}$/.test(col)) return;
          var p = {};
          p[key] = col;
          patchBtn(p, { persist: true });
          live = null;
        });
      }
      bindColor('[data-exp-btn-bg-color]', 'bgColor');
      bindColor('[data-exp-btn-text-color]', 'textColor');
      bindColor('[data-exp-btn-border-color]', 'borderColor');
      bindColor('[data-exp-btn-hover-color]', 'hoverColor');
      bindColor('[data-exp-btn-hover-text]', 'hoverTextColor');
      bindColor('[data-exp-btn-pressed-color]', 'pressedColor');
      bindColor('[data-exp-btn-pressed-text]', 'pressedTextColor');
      var bgOpEl = inspectorBody.querySelector('[data-exp-btn-bg-opacity]');
      if (bgOpEl) {
        bgOpEl.addEventListener('input', function () {
          patchBtn({ bgOpacity: bgOpEl.value }, { gesture: true });
        });
        bgOpEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var bwEl = inspectorBody.querySelector('[data-exp-btn-border-width]');
      if (bwEl) {
        bwEl.addEventListener('change', function () {
          patchBtn({ borderWidth: bwEl.value }, { persist: true });
        });
      }
      var brEl = inspectorBody.querySelector('[data-exp-btn-radius]');
      if (brEl) {
        brEl.addEventListener('change', function () {
          patchBtn({ borderRadius: brEl.value }, { persist: true });
        });
      }
      var lockEl = inspectorBody.querySelector('[data-exp-btn-locked]');
      if (lockEl) {
        lockEl.addEventListener('change', function () {
          patchBtn({ locked: !!lockEl.checked }, { persist: true });
        });
      }
      var opEl = inspectorBody.querySelector('[data-exp-btn-opacity]');
      if (opEl) {
        opEl.addEventListener('input', function () {
          patchBtn({ opacity: opEl.value }, { gesture: true });
        });
        opEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var hoverEn = inspectorBody.querySelector('[data-exp-btn-hover-enabled]');
      if (hoverEn) {
        hoverEn.addEventListener('change', function () {
          patchBtn({ hoverEnabled: !!hoverEn.checked }, { inspector: true, persist: true });
        });
      }
      var hoverMs = inspectorBody.querySelector('[data-exp-btn-hover-ms]');
      if (hoverMs) {
        hoverMs.addEventListener('change', function () {
          patchBtn({ hoverTransition: hoverMs.value }, { persist: true });
        });
      }

      var textContent = inspectorBody.querySelector('[data-exp-text-content]');
      if (textContent) {
        textContent.addEventListener('input', function () {
          patchBtn({ label: textContent.value }, { gesture: true });
        });
        textContent.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var textFont = inspectorBody.querySelector('[data-exp-text-font]');
      if (textFont) {
        textFont.addEventListener('change', function () {
          patchBtn({ fontFamily: textFont.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-text-size-chip]').forEach(function (chip) {
        chip.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchBtn({
            fontSize: Number(chip.getAttribute('data-exp-text-size-chip')) || 28,
            fontSizeUnit: 'px'
          }, { inspector: true, persist: true });
        });
      });
      var textColor = inspectorBody.querySelector('[data-exp-text-color]');
      if (textColor) {
        textColor.addEventListener('input', function () {
          patchBtn({ color: textColor.value }, { gesture: true });
        });
        textColor.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-text-align]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchBtn({ textAlign: el.getAttribute('data-exp-text-align') }, { inspector: true, persist: true });
        });
      });
      var boldBtn = inspectorBody.querySelector('[data-exp-text-bold]');
      if (boldBtn) {
        boldBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var id = canvas().selectedButtonId;
          var b = ExperienciaEngine.getSceneButton(state,
            ExperienciaEngine.getNode(state, sceneId), id);
          var on = b && (String(b.fontWeight) === '700' || b.fontWeight === 'bold');
          patchBtn({ fontWeight: on ? '400' : '700' }, { inspector: true, persist: true });
        });
      }
      var textOp = inspectorBody.querySelector('[data-exp-text-opacity]');
      if (textOp) {
        textOp.addEventListener('input', function () {
          patchBtn({ opacity: textOp.value }, { gesture: true });
        });
        textOp.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var shapeW = inspectorBody.querySelector('[data-exp-shape-w]');
      if (shapeW) {
        shapeW.addEventListener('change', function () {
          patchBtn({ width: shapeW.value }, { persist: true });
        });
      }
      var shapeH = inspectorBody.querySelector('[data-exp-shape-h]');
      if (shapeH) {
        shapeH.addEventListener('change', function () {
          patchBtn({ height: shapeH.value }, { persist: true });
        });
      }
      var shapeFill = inspectorBody.querySelector('[data-exp-shape-fill]');
      if (shapeFill) {
        shapeFill.addEventListener('change', function () {
          patchBtn({ fill: shapeFill.value }, { persist: true });
        });
      }
      var shapeStroke = inspectorBody.querySelector('[data-exp-shape-stroke]');
      if (shapeStroke) {
        shapeStroke.addEventListener('change', function () {
          patchBtn({ stroke: shapeStroke.value }, { persist: true });
        });
      }
      var shapeSw = inspectorBody.querySelector('[data-exp-shape-sw]');
      if (shapeSw) {
        shapeSw.addEventListener('change', function () {
          patchBtn({ strokeWidth: shapeSw.value }, { persist: true });
        });
      }
      var shapeR = inspectorBody.querySelector('[data-exp-shape-radius]');
      if (shapeR) {
        shapeR.addEventListener('change', function () {
          patchBtn({ borderRadius: shapeR.value }, { persist: true });
        });
      }
      var visEl = inspectorBody.querySelector('[data-exp-btn-visible]');
      if (visEl) {
        visEl.addEventListener('change', function () {
          patchBtn({ visible: !!visEl.checked }, { persist: true });
        });
      }
      var rotEl = inspectorBody.querySelector('[data-exp-btn-rotation]');
      var rotNum = inspectorBody.querySelector('[data-exp-btn-rotation-num]');
      function syncRotation(deg, from) {
        deg = Math.max(-360, Math.min(360, Number(deg) || 0));
        if (rotEl && from !== 'range') rotEl.value = String(deg);
        if (rotNum && from !== 'num') rotNum.value = String(deg);
        patchBtn({ rotation: deg }, { gesture: true });
      }
      if (rotEl) {
        rotEl.addEventListener('input', function () {
          syncRotation(rotEl.value, 'range');
        });
        rotEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      if (rotNum) {
        rotNum.addEventListener('input', function () {
          syncRotation(rotNum.value, 'num');
        });
        rotNum.addEventListener('change', function () {
          syncRotation(rotNum.value, 'num');
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-pos-mode]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var mode = el.getAttribute('data-exp-btn-pos-mode');
          if (!mode) return;
          patchBtn({ positionMode: mode }, { inspector: true, persist: true });
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-anchor]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var key = el.getAttribute('data-exp-btn-anchor');
          if (!key) return;
          patchBtn({
            anchor: key,
            positionMode: 'anchor'
          }, { inspector: true, persist: true });
        });
      });
      var mxEl = inspectorBody.querySelector('[data-exp-btn-margin-x]');
      if (mxEl) {
        mxEl.addEventListener('input', function () {
          patchBtn({ marginX: mxEl.value, keepAnchor: true }, { gesture: true });
        });
        mxEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      var myEl = inspectorBody.querySelector('[data-exp-btn-margin-y]');
      if (myEl) {
        myEl.addEventListener('input', function () {
          patchBtn({ marginY: myEl.value, keepAnchor: true }, { gesture: true });
        });
        myEl.addEventListener('change', function () {
          endButtonOp();
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-align]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          pushButtonHistory(sceneId);
          ExperienciaEngine.alignSceneButtons(
            state, sceneId, selectedIds(), el.getAttribute('data-exp-btn-align'), size.w, size.h
          );
          selectedIds().forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-distribute]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          var mode = el.getAttribute('data-exp-btn-distribute');
          var ids = selectedIds();
          pushButtonHistory(sceneId);
          if (mode === 'uniform') {
            var items = ids.map(function (id) {
              return ExperienciaEngine.getSceneButton(state,
                ExperienciaEngine.getNode(state, sceneId), id);
            }).filter(Boolean);
            var spanX = 0;
            var spanY = 0;
            if (items.length >= 2) {
              var xs = items.map(function (b) { return b.x; });
              var ys = items.map(function (b) { return b.y; });
              spanX = Math.max.apply(null, xs) - Math.min.apply(null, xs);
              spanY = Math.max.apply(null, ys) - Math.min.apply(null, ys);
            }
            ExperienciaEngine.distributeSceneButtons(
              state, sceneId, ids, spanX >= spanY ? 'x' : 'y', size.w, size.h
            );
          } else {
            ExperienciaEngine.distributeSceneButtons(
              state, sceneId, ids, mode, size.w, size.h
            );
          }
          ids.forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-btn-space-axis]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          spaceAxis = el.getAttribute('data-exp-btn-space-axis') === 'x' ? 'x' : 'y';
          inspectorBody.querySelectorAll('[data-exp-btn-space-axis]').forEach(function (btn) {
            btn.classList.toggle('is-active',
              btn.getAttribute('data-exp-btn-space-axis') === spaceAxis);
          });
        });
      });
      var spaceApply = inspectorBody.querySelector('[data-exp-btn-space-apply]');
      if (spaceApply) {
        spaceApply.addEventListener('click', function (ev) {
          ev.preventDefault();
          var gapEl = inspectorBody.querySelector('[data-exp-btn-gap]');
          var gap = gapEl ? Number(gapEl.value) : 24;
          var size = layerSize();
          var ids = selectedIds();
          pushButtonHistory(sceneId);
          ExperienciaEngine.spaceSceneButtons(
            state, sceneId, ids, gap, spaceAxis, size.w, size.h
          );
          ids.forEach(clearPendingMove);
          paintButtonsStage(); paintInspector(); persist();
        });
      }
      var mirrorBtn = inspectorBody.querySelector('[data-exp-btn-mirror]');
      if (mirrorBtn) {
        mirrorBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          pushButtonHistory(sceneId);
          var mid = mirrorBtn.getAttribute('data-exp-btn-mirror');
          ExperienciaEngine.mirrorSceneButton(state, sceneId, mid);
          clearPendingMove(mid);
          renderAll(); persist();
        });
      }
      var dupBtn = inspectorBody.querySelector('[data-exp-btn-duplicate]');
      if (dupBtn) {
        dupBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var size = layerSize();
          pushButtonHistory(sceneId);
          var copy = ExperienciaEngine.duplicateSceneButton(state, sceneId,
            dupBtn.getAttribute('data-exp-btn-duplicate'),
            { imageW: size.w, imageH: size.h });
          if (copy) setButtonSelection([copy.id], copy.id);
          renderAll(); persist();
        });
      }
      var delBtn = inspectorBody.querySelector('[data-exp-btn-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var bid = delBtn.getAttribute('data-exp-btn-delete');
          if (!bid) return;
          pushButtonHistory(sceneId);
          /* Safe delete: BUTTON interaction only — never the scene node */
          ExperienciaEngine.removeSceneButton(state, sceneId, bid);
          var left = selectedIds().filter(function (id) {
            return String(id) !== String(bid);
          });
          setButtonSelection(left, left[0] || null);
          renderAll(); persist();
        });
      }
    }

    function bindHotspotsInspectorActions() {
      if (!inspectorBody) return;
      var sceneId = canvas().selectedId;
      function patchHs(patch, opts) {
        opts = opts || {};
        var id = canvas().selectedHotspotId;
        if (!id) return;
        ExperienciaEngine.updateSceneHotspotMask(state, sceneId, id, patch);
        paintHotspotsStage();
        if (opts.inspector) paintInspector();
        if (opts.persist) persist();
      }
      var addBtn = inspectorBody.querySelector('[data-exp-hs-add]');
      if (addBtn) {
        addBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          hotspotDraw = { points: [], cursor: null };
          canvas().selectedHotspotId = null;
          paintHotspotsStage();
          paintInspector();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info('Dibujo: clic para vértices · doble clic para cerrar · Esc cancela');
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-select]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          hotspotDraw = null;
          canvas().selectedHotspotId = el.getAttribute('data-exp-hs-select');
          paintHotspotsStage();
          paintInspector();
        });
      });
      var nameEl = inspectorBody.querySelector('[data-exp-hs-name]');
      if (nameEl) {
        nameEl.addEventListener('change', function () {
          patchHs({ name: nameEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-kind]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchHs({ hotspotKind: el.getAttribute('data-exp-hs-kind') }, {
            inspector: true, persist: true
          });
        });
      });
      var colorEl = inspectorBody.querySelector('[data-exp-hs-color]');
      if (colorEl) {
        colorEl.addEventListener('input', function () {
          patchHs({ color: colorEl.value });
        });
        colorEl.addEventListener('change', function () {
          patchHs({ color: colorEl.value }, { persist: true });
        });
      }
      var opacityEl = inspectorBody.querySelector('[data-exp-hs-opacity]');
      if (opacityEl) {
        opacityEl.addEventListener('input', function () {
          patchHs({ opacity: Number(opacityEl.value) / 100 });
        });
        opacityEl.addEventListener('change', function () {
          patchHs({ opacity: Number(opacityEl.value) / 100 }, {
            inspector: true, persist: true
          });
        });
      }
      var borderEl = inspectorBody.querySelector('[data-exp-hs-border]');
      if (borderEl) {
        borderEl.addEventListener('change', function () {
          patchHs({ borderWidth: borderEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-anim]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          patchHs({ animation: el.getAttribute('data-exp-hs-anim') }, {
            inspector: true, persist: true
          });
        });
      });
      var visEl = inspectorBody.querySelector('[data-exp-hs-visible]');
      if (visEl) {
        visEl.addEventListener('change', function () {
          patchHs({ visible: !!visEl.checked }, { persist: true });
        });
      }

      function setPickerPath(path) {
        canvas().hotspotPickerPath = path || [];
        paintInspector();
      }

      /* V6.5.00 — content mode + structure picker */
      inspectorBody.querySelectorAll('[data-exp-hs-content]').forEach(function (el) {
        el.addEventListener('change', function () {
          if (!el.checked) return;
          canvas().hotspotPickerPath = null;
          patchHs({ contentMode: el.getAttribute('data-exp-hs-content') }, {
            inspector: true, persist: true
          });
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-reselect]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          setPickerPath([{
            type: 'project',
            id: 'project',
            label: (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.projectName)
              ? EstructuraEntity.projectName(state)
              : 'Proyecto'
          }]);
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-crumb]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          var idx = Number(el.getAttribute('data-exp-hs-crumb'));
          var path = Array.isArray(canvas().hotspotPickerPath)
            ? canvas().hotspotPickerPath.slice()
            : [];
          if (!path.length && typeof EstructuraEntity !== 'undefined') {
            path = [{
              type: 'project',
              id: 'project',
              label: EstructuraEntity.projectName(state)
            }];
          }
          setPickerPath(path.slice(0, idx + 1));
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-pick-type]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (ev.target && ev.target.classList &&
              ev.target.classList.contains('builder-exp-hs-picker__link')) {
            return;
          }
          var type = el.getAttribute('data-exp-hs-pick-type');
          var id = el.getAttribute('data-exp-hs-pick-id');
          var label = el.getAttribute('data-exp-hs-pick-label') || id;
          var path = Array.isArray(canvas().hotspotPickerPath)
            ? canvas().hotspotPickerPath.slice()
            : [];
          if (!path.length) {
            path = [{
              type: 'project',
              id: 'project',
              label: (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.projectName)
                ? EstructuraEntity.projectName(state)
                : 'Proyecto'
            }];
          }
          path.push({ type: type, id: id, label: label });
          setPickerPath(path);
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hs-link-id]').forEach(function (el) {
        var linkBtn = el.querySelector('.builder-exp-hs-picker__link');
        if (!linkBtn) return;
        linkBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var linkType = el.getAttribute('data-exp-hs-link-type');
          var linkId = el.getAttribute('data-exp-hs-link-id');
          if (!linkType || !linkId) return;
          patchHs({
            contentMode: 'structure',
            entityId: linkId,
            entityType: linkType
          }, { inspector: true, persist: true });
          var resolved = (typeof EstructuraEntity !== 'undefined')
            ? EstructuraEntity.resolve(state, linkId, linkType)
            : null;
          if (resolved && resolved.ok && resolved.label) {
            patchHs({ name: resolved.label }, { persist: true });
          }
          canvas().hotspotPickerPath = null;
          paintInspector();
        });
      });
      var tplEl = inspectorBody.querySelector('[data-exp-hs-template]');
      if (tplEl) {
        tplEl.addEventListener('change', function () {
          patchHs({ cardTemplate: tplEl.value }, { persist: true });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hs-field]').forEach(function (el) {
        el.addEventListener('change', function () {
          var key = el.getAttribute('data-exp-hs-field');
          var patch = { cardFields: {} };
          patch.cardFields[key] = !!el.checked;
          patchHs(patch, { persist: true });
        });
      });

      var dupBtn = inspectorBody.querySelector('[data-exp-hs-duplicate]');
      if (dupBtn) {
        dupBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var copy = ExperienciaEngine.duplicateSceneHotspotMask(state, sceneId,
            dupBtn.getAttribute('data-exp-hs-duplicate'));
          if (copy) {
            canvas().selectedHotspotId = copy.id;
            canvas().hotspotPickerPath = null;
          }
          renderAll(); persist();
        });
      }
      var delBtn = inspectorBody.querySelector('[data-exp-hs-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ExperienciaEngine.removeSceneHotspotMask(state, sceneId,
            delBtn.getAttribute('data-exp-hs-delete'));
          canvas().selectedHotspotId = null;
          canvas().hotspotPickerPath = null;
          renderAll(); persist();
        });
      }
    }

    function buildLiveRuntimeFromState() {
      if (typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.serialize) {
        try {
          return RuntimeSerializer.serialize(state, {
            generatedAt: new Date().toISOString()
          });
        } catch (eSer) {}
      }
      ExperienciaEngine.ensureFlow(state);
      var exp = state.experiencia || {};
      var nodes = (ExperienciaEngine.visibleNodes
        ? ExperienciaEngine.visibleNodes(state)
        : (exp.nodes || [])).filter(function (n) {
        return n && n.kind !== 'action';
      });
      var hero = nodes.find(function (n) {
        return n && (n.kind === 'hero' || n.id === 'exp-hero');
      });
      return {
        nodes: nodes,
        connections: exp.edges || [],
        entryNodeId: hero ? hero.id : (nodes[0] && nodes[0].id) || null
      };
    }

    function ensurePrototypePlayer() {
      if (!protoHost) return null;
      var mountFn = (typeof PrototypeView !== 'undefined' && PrototypeView.mount)
        ? PrototypeView.mount
        : (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.mountPrototypeView)
          ? ExperienciaPrototype.mountPrototypeView
          : null;
      if (!mountFn) return null;
      var runtime = buildLiveRuntimeFromState();
      if (!protoRuntimePlayer) {
        protoRuntimePlayer = mountFn(protoHost, {
          runtime: runtime,
          state: state,
          startLabel: '▶ Ver Prototipo'
        });
      } else {
        if (protoRuntimePlayer.setRuntime) protoRuntimePlayer.setRuntime(runtime);
        if (protoRuntimePlayer.setState) protoRuntimePlayer.setState(state);
      }
      return protoRuntimePlayer;
    }

    function syncPrototypeStoryboard() {
      var fp = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.fingerprint)
        ? ExperienciaPrototype.fingerprint(state)
        : String(Date.now());
      var player = ensurePrototypePlayer();
      if (!player) return;
      if (fp !== protoFingerprint) {
        protoFingerprint = fp;
        var runtime = buildLiveRuntimeFromState();
        if (player.setRuntime) player.setRuntime(runtime);
        if (player.setState) player.setState(state);
        if (!player._running && player.showGate) player.showGate();
      }
      if (player.resize) player.resize();
    }

    function bindPrototypeInspectorActions() {
      if (!inspectorBody) return;
      syncPrototypeStoryboard();
      var playBtn = inspectorBody.querySelector('[data-exp-proto-play]');
      if (playBtn) {
        playBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var player = ensurePrototypePlayer();
          if (!player) return;
          protoFingerprint = (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.fingerprint)
            ? ExperienciaPrototype.fingerprint(state)
            : protoFingerprint;
          var runtime = buildLiveRuntimeFromState();
          if (player.setRuntime) player.setRuntime(runtime);
          if (player.setState) player.setState(state);
          if (player.begin) player.begin();
        });
      }
    }

    function bindInspectorActions() {
      if (!inspectorBody || !inspectorBody.querySelector) return;
      var del = inspectorBody.querySelector('[data-exp-del-edge]');
      if (del) {
        del.addEventListener('click', function () {
          ExperienciaEngine.removeEdge(state, del.getAttribute('data-exp-del-edge'));
          renderAll(); persist();
        });
      }
      var hs = inspectorBody.querySelector('[data-exp-add-hotspot]');
      if (hs) {
        hs.addEventListener('click', function () {
          var id = hs.getAttribute('data-exp-add-hotspot');
          boxiesPrompt({
            title: 'Nuevo hotspot',
            message: 'Nombre del hotspot',
            defaultValue: 'Torre 1'
          }).then(function (label) {
            if (label == null) return;
            ExperienciaEngine.addHotspotToScene(state, id, String(label).trim() || 'Hotspot');
            renderAll(); persist();
          });
        });
      }
      var ctrl = inspectorBody.querySelector('[data-exp-add-control]');
      if (ctrl) {
        ctrl.addEventListener('click', function () {
          var id = ctrl.getAttribute('data-exp-add-control');
          boxiesPrompt({
            title: 'Nuevo control',
            message: 'Nombre del control',
            defaultValue: 'Plantas'
          }).then(function (label) {
            if (label == null) return;
            var name = String(label).trim() || 'Control';
            var isPlantas = /planta/i.test(name);
            ExperienciaEngine.addControlToScene(state, id, name, {
              type: isPlantas ? 'SELECTOR' : 'BUTTON',
              actionType: isPlantas ? 'floor-selector' : null,
              behavior: isPlantas
                ? { type: 'floor-selector', inline: true, source: 'estructura' }
                : null
            });
            renderAll(); persist();
          });
        });
      }
      inspectorBody.querySelectorAll('[data-exp-add-element]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var sid = btn.getAttribute('data-exp-add-element');
          var rect = btn.getBoundingClientRect();
          openAddElementMenu(sid, { x: rect.left, y: rect.bottom + 4 });
        });
      });
      var clearIx = inspectorBody.querySelector('[data-exp-clear-ix-sel]');
      if (clearIx) {
        clearIx.addEventListener('click', function () {
          canvas().selectedInteractionId = null;
          canvas().selectedInteractionSceneId = null;
          renderAll(); persist();
        });
      }
      var assignBtn = inspectorBody.querySelector('[data-exp-asset-assign]');
      if (assignBtn) {
        assignBtn.addEventListener('click', function () {
          var nid = assignBtn.getAttribute('data-exp-asset-assign');
          var input = inspectorBody.querySelector('[data-exp-asset-filename]');
          var fname = input ? String(input.value || '').trim() : '';
          if (!fname) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Indica un nombre de archivo.');
            return;
          }
          ExperienciaEngine.assignAssetToNode(state, nid, {
            filename: fname,
            provider: 'local',
            status: 'synced'
          });
          renderAll(); persist();
        });
      }
      var clearAsset = inspectorBody.querySelector('[data-exp-asset-clear]');
      if (clearAsset) {
        clearAsset.addEventListener('click', function () {
          ExperienciaEngine.clearNodeAsset(state, clearAsset.getAttribute('data-exp-asset-clear'));
          renderAll(); persist();
        });
      }
      var assetPick = inspectorBody.querySelector('[data-exp-asset-pick]');
      if (assetPick) {
        assetPick.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var val = assetPick.value;
          if (!val) {
            ExperienciaEngine.clearNodeAsset(state, nid);
          } else {
            var asset = ExperienciaEngine.getAsset(state, val);
            ExperienciaEngine.assignAssetToNode(state, nid, asset || { id: val });
          }
          renderAll(); persist();
        });
      }
      var hubEn = inspectorBody.querySelector('[data-exp-hub-enabled]');
      if (hubEn) {
        hubEn.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var node = ExperienciaEngine.getNode(state, nid);
          if (!node) return;
          if (hubEn.checked) {
            ExperienciaEngine.enableHubOnScene(node);
            if (ExperienciaEngine.syncHubSmartSelector) {
              ExperienciaEngine.syncHubSmartSelector(state, node);
            }
            canvas().selectedInteractionId = null;
            canvas().selectedInteractionSceneId = null;
          } else {
            var hubOff = ExperienciaEngine.ensureHubConfig(node);
            hubOff.enabled = false;
          }
          renderAll(); persist();
        });
      }

      function bindHubChoiceGroup(attr, apply) {
        var wrap = inspectorBody.querySelector('[' + attr + ']');
        if (!wrap) return;
        wrap.querySelectorAll('[data-value]').forEach(function (btn) {
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            if (btn.disabled || btn.classList.contains('is-disabled')) return;
            apply(btn.getAttribute('data-value'));
            renderAll(); persist();
          });
        });
      }

      bindHubChoiceGroup('data-exp-hub-selector-type', function (val) {
        if (ExperienciaEngine.setHubSelectorType) {
          ExperienciaEngine.setHubSelectorType(state, canvas().selectedId, val);
        }
      });
      bindHubChoiceGroup('data-exp-hub-style', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { style: val });
        }
      });
      bindHubChoiceGroup('data-exp-hub-position', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { position: val });
        }
      });
      bindHubChoiceGroup('data-exp-hub-align', function (val) {
        if (ExperienciaEngine.setHubAppearance) {
          ExperienciaEngine.setHubAppearance(state, canvas().selectedId, { alignment: val });
        }
      });

      inspectorBody.querySelectorAll('[data-exp-hub-plant-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var pid = btn.getAttribute('data-exp-hub-plant-toggle');
          if (!pid || !ExperienciaEngine.setHubPlantSelected) return;
          var hubNow = ExperienciaEngine.ensureHubConfig(
            ExperienciaEngine.getNode(state, canvas().selectedId)
          );
          var selected = (hubNow && hubNow.selectedPlants) || [];
          var isOn = selected.some(function (id) { return String(id) === String(pid); });
          ExperienciaEngine.setHubPlantSelected(state, canvas().selectedId, pid, !isOn);
          renderAll(); persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-plant-up]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var pid = btn.getAttribute('data-exp-hub-plant-up');
          if (pid && ExperienciaEngine.moveHubPlant) {
            ExperienciaEngine.moveHubPlant(state, canvas().selectedId, pid, 'up');
            renderAll(); persist();
          }
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-plant-down]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var pid = btn.getAttribute('data-exp-hub-plant-down');
          if (pid && ExperienciaEngine.moveHubPlant) {
            ExperienciaEngine.moveHubPlant(state, canvas().selectedId, pid, 'down');
            renderAll(); persist();
          }
        });
      });

      var gapEl = inspectorBody.querySelector('[data-exp-hub-gap]');
      if (gapEl) {
        gapEl.addEventListener('input', function () {
          var valEl = inspectorBody.querySelector('[data-exp-hub-gap-val]');
          if (valEl) valEl.textContent = gapEl.value + ' px';
          var preview = inspectorBody.querySelector('.builder-hub-preview');
          if (preview) preview.style.setProperty('--hub-gap', gapEl.value + 'px');
        });
        gapEl.addEventListener('change', function () {
          if (ExperienciaEngine.setHubAppearance) {
            ExperienciaEngine.setHubAppearance(state, canvas().selectedId, {
              gap: Number(gapEl.value)
            });
          }
          persist();
        });
      }
      var sizeEl = inspectorBody.querySelector('[data-exp-hub-size]');
      if (sizeEl) {
        sizeEl.addEventListener('input', function () {
          var valEl = inspectorBody.querySelector('[data-exp-hub-size-val]');
          if (valEl) valEl.textContent = sizeEl.value + ' px';
          var preview = inspectorBody.querySelector('.builder-hub-preview');
          if (preview) preview.style.setProperty('--hub-size', sizeEl.value + 'px');
        });
        sizeEl.addEventListener('change', function () {
          if (ExperienciaEngine.setHubAppearance) {
            ExperienciaEngine.setHubAppearance(state, canvas().selectedId, {
              size: Number(sizeEl.value)
            });
          }
          persist();
        });
      }

      /* Legacy HUB structure controls (kept if present for old markup) */
      var hubScope = inspectorBody.querySelector('[data-exp-hub-scope]');
      if (hubScope) {
        hubScope.addEventListener('change', function () {
          var nid = canvas().selectedId;
          var val = hubScope.value;
          if (!val) {
            ExperienciaEngine.setHubStructureScope(state, nid, null);
            renderAll(); persist();
            return;
          }
          var opts = ExperienciaEngine.listHubScopeOptions(state) || [];
          var found = null;
          for (var si = 0; si < opts.length; si++) {
            if (String(opts[si].id) === String(val)) { found = opts[si]; break; }
          }
          ExperienciaEngine.setHubStructureScope(state, nid, found);
          renderAll(); persist();
        });
      }
      var hubFloor = inspectorBody.querySelector('[data-exp-hub-floor]');
      if (hubFloor) {
        hubFloor.addEventListener('change', function () {
          ExperienciaEngine.setHubActiveFloor(state, canvas().selectedId, hubFloor.value);
          renderAll(); persist();
        });
      }
      var hubMode = inspectorBody.querySelector('[data-exp-hub-mode]');
      if (hubMode) {
        hubMode.addEventListener('change', function () {
          ExperienciaEngine.setHubVisualMode(state, canvas().selectedId, hubMode.value);
          renderAll(); persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hub-floor-a2d]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var key = sel.getAttribute('data-exp-hub-floor-a2d');
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            asset2dId: sel.value || null
          });
          persist();
        });
      });
      inspectorBody.querySelectorAll('[data-exp-hub-floor-a3d]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var key = sel.getAttribute('data-exp-hub-floor-a3d');
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            asset3dId: sel.value || null
          });
          persist();
        });
      });
      var hubAutobind = inspectorBody.querySelector('[data-exp-hub-autobind]');
      if (hubAutobind) {
        hubAutobind.addEventListener('click', function () {
          ExperienciaEngine.autoBindHubMediaAssets(state, canvas().selectedId);
          if (typeof AdminNotify !== 'undefined') AdminNotify.success('Recursos Media vinculados a plantas.');
          renderAll(); persist();
        });
      }
      var hubAutogen = inspectorBody.querySelector('[data-exp-hub-autogen]');
      if (hubAutogen) {
        hubAutogen.addEventListener('click', function () {
          var nid = canvas().selectedId;
          var node = ExperienciaEngine.getNode(state, nid);
          var hub = node && node.config && node.config.hub;
          var scope = hub && hub.structureScope;
          if (!scope) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Elige un ámbito tipología primero.');
            return;
          }
          var floors = ExperienciaEngine.listFloorsForScope(state, scope) || [];
          if (!floors.length) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('No hay plantas en Estructura.');
            return;
          }
          if (!window.confirm('¿Crear estructura HUB con ' + floors.length + ' planta(s)?')) return;
          var gen = ExperienciaEngine.generateHubStructure(state, {
            scope: scope,
            at: node ? { x: (node.x || 280) + 40, y: (node.y || 140) + 40 } : null
          });
          if (gen && gen.error) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.error(gen.error);
          } else if (typeof AdminNotify !== 'undefined') {
            AdminNotify.success('Estructura HUB creada · ' + floors.length + ' planta(s).');
          }
          renderAll(); persist();
        });
      }
      var floorTip = inspectorBody.querySelector('[data-exp-ix-floor-tip]');
      if (floorTip) {
        floorTip.addEventListener('change', function () {
          var ixId = state.experiencia && state.experiencia.canvas
            ? state.experiencia.canvas.selectedInteractionId
            : null;
          var sceneId = canvas().selectedId;
          if (!ixId || !sceneId) return;
          var tipId = floorTip.value;
          ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
            structureId: tipId ? ('tip:' + tipId) : null,
            structureKind: tipId ? 'tipologia' : null,
            behavior: Object.assign({}, (function () {
              var ix = ExperienciaEngine.getInteraction(state, sceneId, ixId);
              return (ix && ix.behavior) || { type: 'floor-selector', source: 'estructura' };
            })(), {
              tipologiaId: tipId || null,
              source: 'estructura',
              controls: 'activeFloor'
            })
          });
          /* Also sync scene HUB scope */
          var tipScope = null;
          if (tipId) {
            var opts = ExperienciaEngine.listHubScopeOptions(state) || [];
            for (var i = 0; i < opts.length; i++) {
              if (String(opts[i].tipologiaId) === String(tipId) || String(opts[i].id) === ('tip:' + tipId)) {
                tipScope = opts[i];
                break;
              }
            }
          }
          if (tipScope) ExperienciaEngine.setHubStructureScope(state, sceneId, tipScope);
          renderAll(); persist();
        });
      }
      function syncFloorSelBehavior() {
        var ixId = state.experiencia && state.experiencia.canvas
          ? state.experiencia.canvas.selectedInteractionId
          : null;
        var sceneId = canvas().selectedId;
        if (!ixId || !sceneId) return;
        var keys = [];
        inspectorBody.querySelectorAll('[data-exp-ix-floor-key]:checked').forEach(function (cb) {
          keys.push(cb.getAttribute('data-exp-ix-floor-key'));
        });
        var initialEl = inspectorBody.querySelector('[data-exp-ix-floor-initial]');
        var initial = initialEl ? initialEl.value : (keys[0] || null);
        var tipEl = inspectorBody.querySelector('[data-exp-ix-floor-tip]');
        var tipId = tipEl ? tipEl.value : null;
        ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
          behavior: {
            type: 'floor-selector',
            inline: true,
            source: 'estructura',
            controls: 'activeFloor',
            tipologiaId: tipId || null,
            floorKeys: keys,
            initialFloor: initial
          }
        });
        if (initial) ExperienciaEngine.setHubActiveFloor(state, sceneId, initial);
        persist();
      }
      inspectorBody.querySelectorAll('[data-exp-ix-floor-key]').forEach(function (cb) {
        cb.addEventListener('change', syncFloorSelBehavior);
      });
      var floorInitial = inspectorBody.querySelector('[data-exp-ix-floor-initial]');
      if (floorInitial) floorInitial.addEventListener('change', syncFloorSelBehavior);

      var hubFloorSave = inspectorBody.querySelector('[data-exp-hub-floor-save]');
      if (hubFloorSave) {
        hubFloorSave.addEventListener('click', function () {
          var keyEl = inspectorBody.querySelector('[data-exp-hub-floor-key]');
          var a3 = inspectorBody.querySelector('[data-exp-hub-floor-a3d]');
          var a2 = inspectorBody.querySelector('[data-exp-hub-floor-a2d]');
          var key = keyEl ? String(keyEl.value || '').trim() : '';
          if (!key) {
            if (typeof AdminNotify !== 'undefined') AdminNotify.info('Indica la key del piso.');
            return;
          }
          ExperienciaEngine.upsertHubFloor(state, canvas().selectedId, {
            key: key,
            label: key,
            asset3dId: a3 && a3.value ? String(a3.value).trim() : null,
            asset2dId: a2 && a2.value ? String(a2.value).trim() : null
          });
          renderAll(); persist();
        });
      }
      var nodeLabel = inspectorBody.querySelector('[data-exp-node-label]');
      if (nodeLabel) {
        nodeLabel.addEventListener('change', function () {
          var nid = canvas().selectedId;
          if (!nid) return;
          ExperienciaEngine.renameNode(state, nid, nodeLabel.value);
          renderAll(); persist();
        });
      }
      var ixLabel = inspectorBody.querySelector('[data-exp-ix-label]');
      if (ixLabel) {
        ixLabel.addEventListener('change', function () {
          var sceneId = canvas().selectedInteractionSceneId || canvas().selectedId;
          var ixId = canvas().selectedInteractionId;
          if (!sceneId || !ixId) return;
          ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
            label: String(ixLabel.value || '').trim() || 'Elemento'
          });
          renderAll(); persist();
        });
      }
      var structSel = inspectorBody.querySelector('[data-exp-ix-structure]');
      if (structSel) {
        structSel.addEventListener('change', function () {
          var sceneId = canvas().selectedInteractionSceneId || canvas().selectedId;
          var ixId = canvas().selectedInteractionId;
          if (!sceneId || !ixId) return;
          var opt = structSel.options[structSel.selectedIndex];
          if (!structSel.value) {
            ExperienciaEngine.linkInteractionToStructure(state, sceneId, ixId, null);
          } else {
            ExperienciaEngine.linkInteractionToStructure(state, sceneId, ixId, {
              id: structSel.value,
              key: opt.getAttribute('data-key'),
              kind: opt.getAttribute('data-kind'),
              label: opt.getAttribute('data-label')
            });
          }
          renderAll(); persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-ix-act]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var row = btn.closest('[data-exp-ix-scene]') || btn;
          var sceneId = btn.getAttribute('data-exp-ix-scene') ||
            (row && row.getAttribute('data-exp-ix-scene'));
          var ixId = btn.getAttribute('data-exp-ix-id') ||
            (row && row.getAttribute('data-exp-ix-id'));
          runInteractionAction(btn.getAttribute('data-exp-ix-act'), sceneId, ixId);
        });
      });
      inspectorBody.querySelectorAll('.builder-exp-inspector__ix-item').forEach(function (row) {
        row.addEventListener('click', function (ev) {
          if (ev.target.closest('[data-exp-ix-act]')) return;
          selectInteraction(
            row.getAttribute('data-exp-ix-scene'),
            row.getAttribute('data-exp-ix-id')
          );
        });
      });
      var eg = inspectorBody.querySelector('[data-exp-enter-group]');
      if (eg) {
        eg.addEventListener('click', function () {
          ExperienciaEngine.enterGroup(state, eg.getAttribute('data-exp-enter-group'));
          renderAll(); persist();
        });
      }
      var gotoMenu = inspectorBody.querySelector('[data-exp-goto-step="menu"]');
      if (gotoMenu) {
        gotoMenu.addEventListener('click', function () {
          if (typeof AiProjectBuilderView !== 'undefined' && AiProjectBuilderView.goToStepById) {
            AiProjectBuilderView.goToStepById('menu');
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-hero-field]').forEach(function (el) {
        var field = el.getAttribute('data-exp-hero-field');
        var evt = el.type === 'checkbox' ? 'change' : 'change';
        el.addEventListener(evt, function () {
          var val = el.type === 'checkbox' ? !!el.checked : el.value;
          if (ExperienciaEngine.setHeroContentField) {
            ExperienciaEngine.setHeroContentField(state, field, val);
          }
          ExperienciaEngine.ensureFlow(state);
          renderAll();
          persist();
        });
        if (el.tagName === 'INPUT' && el.type === 'text') {
          el.addEventListener('blur', function () {
            if (ExperienciaEngine.setHeroContentField) {
              ExperienciaEngine.setHeroContentField(state, field, el.value);
            }
            ExperienciaEngine.ensureFlow(state);
            renderAll();
            persist();
          });
        }
      });
    }

    function syncInspectorChrome() {
      var modeOn = isCanvasMode();
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.isActive()) {
        var collapsed = typeof BuilderPropertiesRail.isCollapsed === 'function'
          ? BuilderPropertiesRail.isCollapsed()
          : !!(canvas().inspectorCollapsed);
        canvas().inspectorOpen = true;
        canvas().inspectorCollapsed = collapsed;
        BuilderPropertiesRail.applyCollapsed(collapsed, { state: state });
      }
      if (workspace) {
        workspace.classList.remove('has-inspector', 'has-inspector-tab');
        workspace.classList.toggle('is-canvas-mode', modeOn);
      }
      var step = rootEl.querySelector('.builder-step-content--experiencia');
      if (step) step.classList.toggle('is-canvas-mode', modeOn);
      var modeBtn = rootEl.querySelector('[data-exp-tool="canvas-mode"]');
      if (modeBtn) {
        modeBtn.setAttribute('data-tooltip', 'Modo Focus');
        modeBtn.setAttribute('aria-label', 'Modo Focus');
        modeBtn.classList.toggle('is-active', modeOn);
      }
      syncFocusFullscreenBtn();
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.getInspectorBody) {
        inspectorBody = BuilderPropertiesRail.getInspectorBody(rootEl) || inspectorBody;
      }
      requestAnimationFrame(function () {
        onViewportResize();
        try { window.dispatchEvent(new Event('boxies:rail-toggle')); } catch (e) {}
      });
    }

    function openPropertiesRail() {
      canvas().inspectorOpen = true;
      canvas().inspectorCollapsed = false;
      if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
        BuilderPropertiesRail.expand(state);
      }
    }

    function isBrowserFullscreen() {
      return !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);
    }

    function syncFocusFullscreenBtn() {
      var btn = rootEl.querySelector('[data-exp-fullscreen]');
      if (!btn) return;
      var on = isBrowserFullscreen();
      var icon = (typeof BuilderIcons !== 'undefined' && BuilderIcons.render)
        ? BuilderIcons.render(on ? 'minimize' : 'maximize')
        : '';
      btn.innerHTML = icon;
      btn.setAttribute('data-tooltip', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.setAttribute('title', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
      btn.classList.toggle('is-active', on);
      if (typeof BoxiesTooltip !== 'undefined' && BoxiesTooltip.adopt) {
        try { BoxiesTooltip.adopt(btn); } catch (eTip) {}
      }
    }

    function enterBrowserFullscreen() {
      if (isBrowserFullscreen()) return;
      var el = document.documentElement;
      var req = el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (req) {
        try { req.call(el); } catch (eReq) {}
      }
    }

    function exitBrowserFullscreen() {
      if (!isBrowserFullscreen()) return;
      var exitFs = document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (exitFs) {
        try { exitFs.call(document); } catch (eExit) {}
      }
    }

    function toggleBrowserFullscreen() {
      if (isBrowserFullscreen()) exitBrowserFullscreen();
      else enterBrowserFullscreen();
    }

    function removeLeftRailFloat() {
      var btn = document.getElementById('boxiesSidebarFloatBtn');
      if (btn && btn.parentNode) {
        try { btn.parentNode.removeChild(btn); } catch (eRm) {}
      }
    }

    function toggleCanvasMode() {
      var next = !isCanvasMode();
      var prefs = (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load)
        ? BoxiesPrefs.load()
        : {};
      if (next) {
        var restore = {
          railCollapsed: !!(typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getRailCollapsed
            ? BoxiesPrefs.getRailCollapsed()
            : document.body.classList.contains('boxies-rail-collapsed')),
          propsRailCollapsed: !!(typeof BuilderPropertiesRail !== 'undefined' &&
            BuilderPropertiesRail.isCollapsed
            ? BuilderPropertiesRail.isCollapsed()
            : document.body.classList.contains('boxies-props-rail-collapsed')),
          headerH: document.documentElement.style.getPropertyValue('--boxies-header-h') || '',
          dockH: document.documentElement.style.getPropertyValue('--boxies-dock-h') || '',
          railW: document.documentElement.style.getPropertyValue('--builder-rail-width') || '',
          propsRailW: document.documentElement.style.getPropertyValue('--builder-props-rail-width') || '',
          sidebarW: document.documentElement.style.getPropertyValue('--boxies-sidebar-w') || '',
          wasFullscreen: isBrowserFullscreen()
        };
        setCanvasMode(true, restore);
        /* Hide platform sidebar + chrome completely */
        document.documentElement.style.setProperty('--boxies-sidebar-w', '0px');
        document.documentElement.style.setProperty('--boxies-header-h', '0px');
        document.documentElement.style.setProperty('--boxies-dock-h', '0px');
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(true);
        } else {
          document.body.classList.add('boxies-rail-collapsed');
          document.documentElement.classList.add('boxies-rail-collapsed');
          document.documentElement.style.setProperty('--builder-rail-width', '0px');
        }
        removeLeftRailFloat();
        /* Keep right properties panel open */
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
          BuilderPropertiesRail.expand(state);
        } else if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(false, { state: state });
        }
        enterBrowserFullscreen();
      } else {
        var prev = prefs._expCanvasRestore || {};
        setCanvasMode(false, null);
        if (prev.sidebarW) {
          document.documentElement.style.setProperty('--boxies-sidebar-w', prev.sidebarW);
        } else {
          document.documentElement.style.removeProperty('--boxies-sidebar-w');
        }
        if (prev.headerH) {
          document.documentElement.style.setProperty('--boxies-header-h', prev.headerH);
        } else {
          document.documentElement.style.removeProperty('--boxies-header-h');
        }
        if (prev.dockH) {
          document.documentElement.style.setProperty('--boxies-dock-h', prev.dockH);
        } else {
          document.documentElement.style.removeProperty('--boxies-dock-h');
        }
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(!!prev.railCollapsed);
        } else if (prev.railW) {
          document.documentElement.style.setProperty('--builder-rail-width', prev.railW);
        } else {
          document.documentElement.style.removeProperty('--builder-rail-width');
        }
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(
            prev.propsRailCollapsed != null ? !!prev.propsRailCollapsed : false,
            { state: state }
          );
        } else if (prev.propsRailW) {
          document.documentElement.style.setProperty('--builder-props-rail-width', prev.propsRailW);
        } else {
          document.documentElement.style.removeProperty('--builder-props-rail-width');
        }
        if (!prev.wasFullscreen) {
          exitBrowserFullscreen();
        }
      }
      if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.update) {
        try { BuilderProgressRail.update(rootEl, state); } catch (eRail) {}
      }
      if (isCanvasMode()) removeLeftRailFloat();
      syncInspectorChrome();
      requestAnimationFrame(function () {
        recomputeOverlayLayout();
        requestAnimationFrame(recomputeOverlayLayout);
      });
    }

    function renderAll() {
      syncEditModeUi();
      applyWorldTransform();
      paintNodes();
      paintEdges();
      paintMinimap();
      paintButtonsStage();
      paintHotspotsStage();
      if (canvas().editMode === 'prototype') syncPrototypeStoryboard();
      paintInspector();
      syncInspectorChrome();
      if (minimapWrap) minimapWrap.classList.toggle('is-hidden',
        canvas().editMode === 'buttons' ||
        canvas().editMode === 'hotspots' ||
        canvas().editMode === 'prototype' ||
        canvas().minimapVisible === false);
    }

    function canUseButtonsMode() {
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      return !!(n && ExperienciaEngine.isButtonsEditableNode &&
        ExperienciaEngine.isButtonsEditableNode(n) &&
        selectedIds().length <= 1);
    }

    function canUseHotspotsMode() {
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      return !!(n && ExperienciaEngine.isHotspotsEditableNode &&
        ExperienciaEngine.isHotspotsEditableNode(n) &&
        selectedIds().length <= 1);
    }

    function syncToolbarForMode(mode) {
      var toolbar = rootEl.querySelector('[data-exp-toolbar]');
      if (!toolbar) return;
      /* Flow keeps full canvas tools; other modes only keep Focus (like PROTOTIPO). */
      var allowed = mode === 'flow'
        ? { select: 1, cut: 1, fit: 1, 'canvas-mode': 1, minimap: 1 }
        : { 'canvas-mode': 1 };
      toolbar.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
        var t = btn.getAttribute('data-exp-tool');
        var show = !!allowed[t];
        btn.hidden = !show;
        if (show) btn.removeAttribute('aria-hidden');
        else btn.setAttribute('aria-hidden', 'true');
      });
      toolbar.querySelectorAll('.builder-exp-toolbar__sep').forEach(function (sep) {
        sep.hidden = mode !== 'flow';
        sep.setAttribute('aria-hidden', mode === 'flow' ? 'true' : 'true');
      });
    }

    function syncEditModeUi() {
      if (overlayMode) {
        if (canvas().editMode !== 'buttons' && canvas().editMode !== 'hotspots') {
          canvas().editMode = 'buttons';
        }
        if (api.overlayNodeId) {
          canvas().selectedId = api.overlayNodeId;
          canvas().selectedIds = [api.overlayNodeId];
        }
      } else {
        if (canvas().editMode === 'buttons' && !canUseButtonsMode()) {
          canvas().editMode = 'flow';
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        }
        if (canvas().editMode === 'hotspots' && !canUseHotspotsMode()) {
          canvas().editMode = 'flow';
          canvas().selectedHotspotId = null;
          hotspotDraw = null;
        }
      }
      var mode = canvas().editMode === 'buttons' ? 'buttons'
        : (canvas().editMode === 'hotspots' ? 'hotspots'
          : (canvas().editMode === 'prototype' ? 'prototype' : 'flow'));
      if (stage) {
        stage.classList.toggle('is-buttons-mode', mode === 'buttons');
        stage.classList.toggle('is-hotspots-mode', mode === 'hotspots');
        stage.classList.toggle('is-proto-mode', mode === 'prototype');
        stage.setAttribute('data-exp-active-mode', mode);
      }
      /* Hard-swap views: Canvas editor must never remain visible in PROTOTIPO */
      if (viewport) {
        var hideFlow = mode === 'buttons' || mode === 'hotspots' || mode === 'prototype' || overlayMode;
        viewport.hidden = hideFlow;
        viewport.setAttribute('aria-hidden', hideFlow ? 'true' : 'false');
        viewport.style.display = hideFlow ? 'none' : '';
      }
      if (buttonsStage) {
        buttonsStage.hidden = mode !== 'buttons';
        buttonsStage.setAttribute('aria-hidden', mode === 'buttons' ? 'false' : 'true');
      }
      if (hotspotsStage) {
        hotspotsStage.hidden = mode !== 'hotspots';
        hotspotsStage.setAttribute('aria-hidden', mode === 'hotspots' ? 'false' : 'true');
      }
      if (protoStage) {
        protoStage.hidden = mode !== 'prototype';
        protoStage.setAttribute('aria-hidden', mode === 'prototype' ? 'false' : 'true');
        if (mode === 'prototype') {
          protoStage.style.display = '';
          protoStage.removeAttribute('hidden');
        }
      }
      if (mode !== 'prototype' && protoRuntimePlayer) {
        if (protoRuntimePlayer.showGate) protoRuntimePlayer.showGate();
        else if (protoRuntimePlayer.stopPlayback) protoRuntimePlayer.stopPlayback(true);
      }
      if (modeTabs) {
        modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
          var m = btn.getAttribute('data-exp-edit-mode');
          var enabled = m === 'flow' ||
            m === 'prototype' ||
            (m === 'buttons' && canUseButtonsMode()) ||
            (m === 'hotspots' && canUseHotspotsMode());
          btn.disabled = !enabled;
          btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
          var active = m === mode && enabled;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
      }
      syncToolbarForMode(mode);
    }

    function syncButtonsLayerBounds() {
      if (!buttonsImg || !buttonsLayer || !buttonsFrame) return;
      /* Quotation overlay: design frame IS the coordinate space (1920×1080). */
      if (overlayMode) {
        buttonsLayer.style.left = '0';
        buttonsLayer.style.top = '0';
        buttonsLayer.style.width = '100%';
        buttonsLayer.style.height = '100%';
        return false;
      }
      if (buttonsImg.hidden || !buttonsImg.getAttribute('src')) {
        buttonsLayer.style.left = '0';
        buttonsLayer.style.top = '0';
        buttonsLayer.style.width = '100%';
        buttonsLayer.style.height = '100%';
        return false;
      }
      var fr = buttonsFrame.getBoundingClientRect();
      var ir = buttonsImg.getBoundingClientRect();
      if (!fr.width || !ir.width) return false;
      var nextLeft = Math.max(0, ir.left - fr.left) + 'px';
      var nextTop = Math.max(0, ir.top - fr.top) + 'px';
      var nextW = Math.max(1, ir.width) + 'px';
      var nextH = Math.max(1, ir.height) + 'px';
      var changed =
        buttonsLayer.style.left !== nextLeft ||
        buttonsLayer.style.top !== nextTop ||
        buttonsLayer.style.width !== nextW ||
        buttonsLayer.style.height !== nextH;
      buttonsLayer.style.left = nextLeft;
      buttonsLayer.style.top = nextTop;
      buttonsLayer.style.width = nextW;
      buttonsLayer.style.height = nextH;
      return changed;
    }

    var overlayLayoutTimer = null;
    var overlayLayoutPass = 0;
    /**
     * Keep button overlays locked to the image after any chrome/layout change.
     * Must not wait for click/drag.
     */
    function recomputeOverlayLayout() {
      if (overlayLayoutTimer) clearTimeout(overlayLayoutTimer);
      overlayLayoutTimer = setTimeout(function () {
        overlayLayoutTimer = null;
        applyWorldTransform();
        paintMinimap();
        if (canvas().editMode === 'buttons') {
          syncButtonsLayerBounds();
          paintButtonsStage();
          requestAnimationFrame(function () {
            var changed = syncButtonsLayerBounds();
            if (changed || overlayLayoutPass < 2) {
              overlayLayoutPass += 1;
              paintButtonsStage();
              requestAnimationFrame(function () {
                syncButtonsLayerBounds();
                overlayLayoutPass = 0;
              });
            } else {
              overlayLayoutPass = 0;
            }
          });
          return;
        }
        if (canvas().editMode === 'hotspots') {
          syncHotspotsLayerBounds();
          paintHotspotsStage();
          requestAnimationFrame(function () {
            var changedHs = syncHotspotsLayerBounds();
            if (changedHs || overlayLayoutPass < 2) {
              overlayLayoutPass += 1;
              paintHotspotsStage();
              requestAnimationFrame(function () {
                syncHotspotsLayerBounds();
                overlayLayoutPass = 0;
              });
            } else {
              overlayLayoutPass = 0;
            }
          });
          return;
        }
        if (canvas().editMode === 'prototype' && protoRuntimePlayer && protoRuntimePlayer.resize) {
          protoRuntimePlayer.resize();
        }
      }, 16);
    }

    function paintButtonsStage() {
      if (!buttonsStage || !buttonsLayer || !buttonsImg) return;
      if (canvas().editMode !== 'buttons') return;
      if (textEditEl && document.activeElement === textEditEl) return;
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      if (!n || !ExperienciaEngine.isButtonsEditableNode(n)) {
        if (buttonsEmpty) buttonsEmpty.hidden = false;
        if (buttonsFrame) buttonsFrame.hidden = true;
        buttonsLayer.innerHTML = '';
        return;
      }
      if (buttonsEmpty) buttonsEmpty.hidden = true;
      if (buttonsFrame) buttonsFrame.hidden = false;

      var media = ExperienciaEngine.resolveSceneMedia(state, n);
      var url = (media && (media.publicUrl || media.thumbnailUrl)) || '';
      if (url) {
        if (buttonsImg.getAttribute('src') !== url) {
          buttonsImg.onload = function () {
            recomputeOverlayLayout();
          };
          buttonsImg.src = url;
        }
        buttonsImg.hidden = false;
        buttonsImg.alt = media.filename || n.label || 'Escena';
      } else {
        buttonsImg.removeAttribute('src');
        buttonsImg.hidden = true;
        buttonsImg.alt = '';
      }

      var layerW = buttonsLayer.clientWidth || (buttonsImg.naturalWidth || 1000);
      var layerH = buttonsLayer.clientHeight || (buttonsImg.naturalHeight || 1000);
      var buttons = (ExperienciaEngine.listSceneButtons(state, n) || []).map(function (b) {
        if (!b || !b._ix || !ExperienciaEngine.resolveButtonLayout) return b;
        var layout = ExperienciaEngine.resolveButtonLayout(b._ix, layerW, layerH);
        /* Keep all view-model fields (typography, size, hover…) — only refresh layout. */
        return Object.assign({}, b, {
          x: layout.x,
          y: layout.y
        });
      });
      var selIds = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.map(String)
        : [];
      if (!selIds.length && canvas().selectedButtonId) {
        selIds = [String(canvas().selectedButtonId)];
      }
      var selSet = {};
      selIds.forEach(function (id) { selSet[id] = true; });
      var guidesHtml = '';
      if (buttonDrag && buttonDrag.guides) {
        var g = buttonDrag.guides;
        /* V6.1.05 — only peer spacing labels (Figma-clean) */
        var seenSpace = {};
        (g.spacing || []).forEach(function (s) {
          if (!s || s.px == null) return;
          var key = String(s.axis) + ':' + Math.round(Number(s.pos) * 10) + ':' +
            Math.round(Number(s.cross) * 10) + ':' + s.px;
          if (seenSpace[key]) return;
          seenSpace[key] = true;
          var label = String(s.px) + ' px';
          if (s.axis === 'x') {
            guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-x" style="left:' +
              Number(s.pos) + '%;top:' + Number(s.cross) + '%"><span>' + esc(label) + '</span></div>';
          } else {
            guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--spacing is-y" style="left:' +
              Number(s.cross) + '%;top:' + Number(s.pos) + '%"><span>' + esc(label) + '</span></div>';
          }
        });
      }
      buttonsLayer.innerHTML = guidesHtml + buttons.map(function (b) {
        if (!b) return '';
        var t = String(b.type || 'BUTTON').toUpperCase();
        var rot = Number(b.rotation) || 0;
        var styleBits = 'left:' + Number(b.x) + '%;top:' + Number(b.y) + '%;' +
          '--btn-rot:' + rot + 'deg;';
        if (t === 'TEXT') {
          var tSize = Number(b.fontSize) || 28;
          var tOp = b.opacity != null ? Number(b.opacity) : 1;
          var fam = String(b.fontFamily || 'system-ui, sans-serif').replace(/"/g, '');
          var fw = String(b.fontWeight || '400');
          var isBold = fw === '700' || fw === 'bold';
          var align = String(b.textAlign || 'center');
          styleBits +=
            '--t-size:' + tSize + 'px;' +
            '--t-color:' + cssToken(b.color || '#ffffff') + ';' +
            '--t-family:' + JSON.stringify(fam) + ';' +
            '--t-weight:' + (isBold ? '700' : '400') + ';' +
            '--t-align:' + cssToken(align) + ';' +
            '--t-opacity:' + tOp + ';';
          return '<button type="button" class="' + buttonPreviewClass(b) +
            ' is-stage-text' +
            (selSet[String(b.id)] ? ' is-selected' : '') +
            (b.visible === false ? ' is-invisible' : '') +
            (b.locked ? ' is-locked' : '') +
            (isBold ? ' is-text-bold' : '') + '"' +
            ' data-exp-stage-btn="' + esc(b.id) + '"' +
            ' data-exp-stage-text="1"' +
            (b.locked ? ' data-locked="1"' : '') +
            ' style="' + styleBits + '">' +
            esc(b.label != null ? String(b.label) : 'Texto') +
          '</button>';
        }
        if (t === 'SHAPE_RECT' || t === 'SHAPE_CIRCLE') {
          styleBits += 'width:' + (Number(b.width) || 12) + '%;' +
            'height:' + (Number(b.height) || 8) + '%;' +
            'background:' + (b.fill || 'rgba(255,255,255,0.18)') + ';' +
            'border:' + (Number(b.strokeWidth) || 2) + 'px solid ' +
              (b.stroke || 'rgba(255,255,255,0.65)') + ';' +
            'border-radius:' + (b.borderRadius != null ? Number(b.borderRadius) : (t === 'SHAPE_CIRCLE' ? 999 : 8)) + 'px;';
          return '<button type="button" class="' + buttonPreviewClass(b) +
            (selSet[String(b.id)] ? ' is-selected' : '') +
            (b.visible === false ? ' is-invisible' : '') +
            (b.locked ? ' is-locked' : '') + '"' +
            ' data-exp-stage-btn="' + esc(b.id) + '"' +
            (b.locked ? ' data-locked="1"' : '') +
            ' aria-label="' + esc(b.label || t) + '"' +
            ' style="' + styleBits + '"></button>';
        }
        var glyph = buttonIconGlyph(b.icon);
        var text = b.label != null ? String(b.label) : '';
        var label;
        if (glyph && text) label = glyph + ' ' + text;
        else label = glyph || text || 'Botón';
        var btnOp = b.opacity != null ? Number(b.opacity) : 1;
        var hoverOn = b.hoverEnabled !== false;
        var hoverMs = b.hoverTransition != null ? Number(b.hoverTransition) : 200;
        var hoverCol = cssToken(b.hoverColor || '#6fbf86') || '#6fbf86';
        var hoverTextCol = cssToken(b.hoverTextColor || '#ffffff') || '#ffffff';
        var pressedCol = cssToken(b.pressedColor || '#5aaa74') || '#5aaa74';
        var pressedTextCol = cssToken(b.pressedTextColor || '#ffffff') || '#ffffff';
        var pressedScale = b.pressedScale != null ? Number(b.pressedScale) : 0.96;
        var boxW = b.boxW != null ? Number(b.boxW) : 14;
        var boxH = b.boxH != null ? Number(b.boxH) : 4.5;
        var bgOp = b.bgOpacity != null ? Number(b.bgOpacity) : 1;
        styleBits +=
          'width:' + boxW + '%;height:' + boxH + '%;' +
          '--btn-opacity:' + btnOp + ';' +
          '--btn-hover-color:' + hoverCol + ';' +
          '--btn-hover-text:' + hoverTextCol + ';' +
          '--btn-hover-ms:' + hoverMs + 'ms;' +
          '--btn-pressed-color:' + pressedCol + ';' +
          '--btn-pressed-text:' + pressedTextCol + ';' +
          '--btn-pressed-scale:' + pressedScale + ';';
        if (b.bgColor) {
          styleBits += '--btn-local-bg:' + cssToken(b.bgColor) + ';' +
            '--btn-local-bg-a:' + bgOp + ';';
        }
        if (b.textColor) styleBits += '--btn-local-text:' + cssToken(b.textColor) + ';';
        if (b.borderColor) styleBits += '--btn-local-border:' + cssToken(b.borderColor) + ';';
        if (b.borderWidth != null) styleBits += '--btn-local-bw:' + Number(b.borderWidth) + 'px;';
        if (b.borderRadius != null) styleBits += '--btn-local-radius:' + Number(b.borderRadius) + 'px;';
        return '<button type="button" class="' + buttonPreviewClass(b) +
          ' is-box' +
          (selSet[String(b.id)] ? ' is-selected' : '') +
          (b.visible === false ? ' is-invisible' : '') +
          (b.locked ? ' is-locked' : '') +
          (pendingMoveIds[String(b.id)] ? ' is-pending-move' : '') +
          (hoverOn ? ' is-hover-on' : ' is-hover-off') +
          (b.bgColor || b.textColor || b.borderColor || b.borderWidth != null || b.borderRadius != null
            ? ' has-local-look' : '') + '"' +
          ' data-exp-stage-btn="' + esc(b.id) + '"' +
          (b.locked ? ' data-locked="1"' : '') +
          ' data-hover-color="' + esc(hoverCol) + '"' +
          ' data-hover-text="' + esc(hoverTextCol) + '"' +
          ' data-box-w="' + boxW + '" data-box-h="' + boxH + '"' +
          ' style="' + styleBits + '">' +
          esc(label) +
        '</button>';
      }).join('');

      /* Selection gizmos: resize + rotate (single selection, unlocked) */
      if (selIds.length === 1) {
        var selBtn = null;
        for (var gi = 0; gi < buttons.length; gi++) {
          if (buttons[gi] && String(buttons[gi].id) === selIds[0]) {
            selBtn = buttons[gi];
            break;
          }
        }
        if (selBtn && !selBtn.locked && selBtn.visible !== false) {
          var st = String(selBtn.type || 'BUTTON').toUpperCase();
          var gx = Number(selBtn.x) || 50;
          var gy = Number(selBtn.y) || 50;
          var grot = Number(selBtn.rotation) || 0;
          var gw;
          var gh;
          if (st === 'BUTTON') {
            gw = selBtn.boxW != null ? Number(selBtn.boxW) : 14;
            gh = selBtn.boxH != null ? Number(selBtn.boxH) : 4.5;
          } else if (st === 'SHAPE_RECT' || st === 'SHAPE_CIRCLE') {
            gw = Number(selBtn.width) || 12;
            gh = Number(selBtn.height) || 8;
          } else {
            /* TEXT: approximate box from font size for rotate-only + light resize */
            gw = Math.max(8, Math.min(40, (String(selBtn.label || 'Texto').length) * 1.2));
            gh = Math.max(3, ((Number(selBtn.fontSize) || 28) / layerH) * 100 * 1.4);
          }
          var handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
          buttonsLayer.innerHTML +=
            '<div class="builder-exp-sel-gizmo" data-exp-gizmo="1" data-gizmo-id="' + esc(selBtn.id) + '"' +
              ' data-gizmo-type="' + esc(st) + '"' +
              ' style="left:' + gx + '%;top:' + gy + '%;width:' + gw + '%;height:' + gh + '%;' +
              '--btn-rot:' + grot + 'deg">' +
              '<div class="builder-exp-sel-box"></div>' +
              handles.map(function (h) {
                return '<span class="builder-exp-sel-handle" data-handle="' + h + '"></span>';
              }).join('') +
              '<span class="builder-exp-sel-rotate" data-handle="rotate" title="Rotar"></span>' +
            '</div>';
        }
      }
      requestAnimationFrame(syncButtonsLayerBounds);
    }

    function syncHotspotsLayerBounds() {
      if (!hotspotsImg || !hotspotsLayer || !hotspotsFrame) return false;
      if (overlayMode) {
        hotspotsLayer.style.left = '0';
        hotspotsLayer.style.top = '0';
        hotspotsLayer.style.width = '100%';
        hotspotsLayer.style.height = '100%';
        return false;
      }
      if (hotspotsImg.hidden || !hotspotsImg.getAttribute('src')) {
        hotspotsLayer.style.left = '0';
        hotspotsLayer.style.top = '0';
        hotspotsLayer.style.width = '100%';
        hotspotsLayer.style.height = '100%';
        return false;
      }
      var fr = hotspotsFrame.getBoundingClientRect();
      var ir = hotspotsImg.getBoundingClientRect();
      if (!fr.width || !ir.width) return false;
      var nextLeft = Math.max(0, ir.left - fr.left) + 'px';
      var nextTop = Math.max(0, ir.top - fr.top) + 'px';
      var nextW = Math.max(1, ir.width) + 'px';
      var nextH = Math.max(1, ir.height) + 'px';
      var changed =
        hotspotsLayer.style.left !== nextLeft ||
        hotspotsLayer.style.top !== nextTop ||
        hotspotsLayer.style.width !== nextW ||
        hotspotsLayer.style.height !== nextH;
      hotspotsLayer.style.left = nextLeft;
      hotspotsLayer.style.top = nextTop;
      hotspotsLayer.style.width = nextW;
      hotspotsLayer.style.height = nextH;
      return changed;
    }

    function paintHotspotsStage() {
      if (!hotspotsStage || !hotspotsLayer || !hotspotsImg || !hotspotsSvg) return;
      if (canvas().editMode !== 'hotspots') return;
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      if (!n || !ExperienciaEngine.isHotspotsEditableNode(n)) {
        if (hotspotsEmpty) hotspotsEmpty.hidden = false;
        if (hotspotsFrame) hotspotsFrame.hidden = true;
        hotspotsSvg.innerHTML = '';
        return;
      }
      if (hotspotsEmpty) hotspotsEmpty.hidden = true;
      if (hotspotsFrame) hotspotsFrame.hidden = false;

      var media = ExperienciaEngine.resolveSceneMedia(state, n);
      var url = (media && (media.publicUrl || media.thumbnailUrl)) || '';
      if (url) {
        if (hotspotsImg.getAttribute('src') !== url) {
          hotspotsImg.onload = function () { recomputeOverlayLayout(); };
          hotspotsImg.src = url;
        }
        hotspotsImg.hidden = false;
        hotspotsImg.alt = media.filename || n.label || 'Escena';
      } else {
        hotspotsImg.removeAttribute('src');
        hotspotsImg.hidden = true;
        hotspotsImg.alt = '';
      }

      var masks = ExperienciaEngine.listSceneHotspotMasks(state, n) || [];
      var selId = canvas().selectedHotspotId ? String(canvas().selectedHotspotId) : '';
      var svgParts = [];

      masks.forEach(function (m) {
        if (!m || !m.polygon || m.polygon.length < 2) return;
        var pts = m.polygon.map(function (p) {
          return Number(p.x) + ',' + Number(p.y);
        }).join(' ');
        var isSel = selId && String(m.id) === selId;
        var fillOp = isSel
          ? Math.max(0.08, Math.min(0.28, (Number(m.opacity) || 0.22) * 0.55))
          : 0.02;
        var strokeOp = m.visible === false ? 0.25 : 0.9;
        var cls = 'builder-exp-hs-poly' +
          (isSel ? ' is-selected' : '') +
          (m.visible === false ? ' is-invisible' : '') +
          (m.animation === 'pulse' ? ' is-anim-pulse' : '') +
          (m.animation === 'fade' ? ' is-anim-fade' : '');
        svgParts.push(
          '<polygon class="' + cls + '" data-exp-hs-poly="' + esc(m.id) + '"' +
          ' points="' + pts + '"' +
          ' fill="' + esc(m.color || '#6fbf86') + '"' +
          ' fill-opacity="' + fillOp + '"' +
          ' stroke="' + esc(m.color || '#6fbf86') + '"' +
          ' stroke-opacity="' + strokeOp + '"' +
          ' stroke-width="' + esc(String(m.borderWidth != null ? m.borderWidth : 1.5)) + '"' +
          ' vector-effect="non-scaling-stroke"></polygon>'
        );
        if (isSel) {
          m.polygon.forEach(function (p, idx) {
            svgParts.push(
              '<circle class="builder-exp-hs-vertex" data-exp-hs-vertex="' + esc(m.id) + '"' +
              ' data-exp-hs-vi="' + idx + '"' +
              ' cx="' + Number(p.x) + '" cy="' + Number(p.y) + '" r="1.1"></circle>'
            );
          });
        }
      });

      if (hotspotDraw && hotspotDraw.points && hotspotDraw.points.length) {
        var dPts = hotspotDraw.points.slice();
        if (hotspotDraw.cursor) dPts.push(hotspotDraw.cursor);
        var dStr = dPts.map(function (p) {
          return Number(p.x) + ',' + Number(p.y);
        }).join(' ');
        if (dPts.length >= 2) {
          svgParts.push(
            '<polyline class="builder-exp-hs-draft" points="' + dStr + '"' +
            ' fill="none" stroke="#6fbf86" stroke-width="1.5"' +
            ' stroke-dasharray="4 3" vector-effect="non-scaling-stroke"></polyline>'
          );
        }
        hotspotDraw.points.forEach(function (p) {
          svgParts.push(
            '<circle class="builder-exp-hs-draft-vertex" cx="' + Number(p.x) +
            '" cy="' + Number(p.y) + '" r="1.1"></circle>'
          );
        });
      }

      hotspotsSvg.setAttribute('viewBox', '0 0 100 100');
      hotspotsSvg.setAttribute('preserveAspectRatio', 'none');
      hotspotsSvg.innerHTML = svgParts.join('');
      requestAnimationFrame(syncHotspotsLayerBounds);
    }

    function hotspotPercentFromPointer(ev) {
      var el = hotspotsLayer || hotspotsFrame;
      if (!el) return { x: 50, y: 50 };
      var rect = el.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      var y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      return {
        x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
      };
    }

    function closeHotspotDraft() {
      if (!hotspotDraw || !hotspotDraw.points || hotspotDraw.points.length < 3) {
        hotspotDraw = null;
        paintHotspotsStage();
        return;
      }
      var sceneId = canvas().selectedId;
      var created = ExperienciaEngine.addSceneHotspotMask(
        state, sceneId, hotspotDraw.points
      );
      hotspotDraw = null;
      if (created) canvas().selectedHotspotId = created.id;
      paintHotspotsStage();
      paintInspector();
      persist();
    }

    function computeButtonGuides(sceneId, buttonId, x, y) {
      var n = ExperienciaEngine.getNode(state, sceneId);
      var list = ExperienciaEngine.listSceneButtons(state, n) || [];
      var layerW = (buttonsLayer && buttonsLayer.clientWidth) || 1000;
      var layerH = (buttonsLayer && buttonsLayer.clientHeight) || 1000;
      var SNAP = 1.15;
      var SPACE_SNAP = 1.35;
      var ALIGN = 2.2;
      var guides = { spacing: [] };
      var nx = x;
      var ny = y;

      /* Soft align snap (silent — no guide chrome) */
      if (Math.abs(x - 50) <= SNAP) nx = 50;
      if (Math.abs(y - 50) <= SNAP) ny = 50;

      var knownGapsX = [];
      var knownGapsY = [];
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = list[i];
          var b = list[j];
          if (!a || !b) continue;
          if (String(a.id) === String(buttonId) || String(b.id) === String(buttonId)) continue;
          if (Math.abs(a.y - b.y) <= ALIGN) {
            knownGapsX.push({ gap: Math.abs(a.x - b.x), y: (a.y + b.y) / 2 });
          }
          if (Math.abs(a.x - b.x) <= ALIGN) {
            knownGapsY.push({ gap: Math.abs(a.y - b.y), x: (a.x + b.x) / 2 });
          }
        }
      }

      list.forEach(function (peer) {
        if (!peer || String(peer.id) === String(buttonId)) return;
        if (Math.abs(x - peer.x) <= SNAP) nx = peer.x;
        if (Math.abs(y - peer.y) <= SNAP) ny = peer.y;
        var mirror = Math.round((100 - peer.x) * 10) / 10;
        if (Math.abs(x - mirror) <= SNAP) nx = mirror;

        /* Live spacing label between this button and peers when aligned */
        if (Math.abs(y - peer.y) <= ALIGN) {
          var dxPct = Math.abs(x - peer.x);
          if (dxPct > 0.3) {
            guides.spacing.push({
              axis: 'x',
              pos: (x + peer.x) / 2,
              cross: peer.y,
              px: Math.round(dxPct / 100 * layerW),
              uniform: false
            });
          }
        }
        if (Math.abs(x - peer.x) <= ALIGN) {
          var dyPct = Math.abs(y - peer.y);
          if (dyPct > 0.3) {
            guides.spacing.push({
              axis: 'y',
              pos: (y + peer.y) / 2,
              cross: peer.x,
              px: Math.round(dyPct / 100 * layerH),
              uniform: false
            });
          }
        }
      });

      /* Snap to known uniform spacing — keep a single small px label */
      var snappedSpace = null;
      knownGapsX.forEach(function (kg) {
        if (!(kg.gap > 0.4) || snappedSpace) return;
        list.forEach(function (peer) {
          if (!peer || String(peer.id) === String(buttonId) || snappedSpace) return;
          if (Math.abs(y - peer.y) > SNAP) return;
          var right = peer.x + kg.gap;
          var left = peer.x - kg.gap;
          var px = Math.round(kg.gap / 100 * layerW);
          if (Math.abs(x - right) <= SPACE_SNAP) {
            nx = right;
            ny = peer.y;
            snappedSpace = {
              axis: 'x', pos: (peer.x + right) / 2, cross: peer.y, px: px, uniform: true
            };
          } else if (Math.abs(x - left) <= SPACE_SNAP) {
            nx = left;
            ny = peer.y;
            snappedSpace = {
              axis: 'x', pos: (peer.x + left) / 2, cross: peer.y, px: px, uniform: true
            };
          }
        });
      });
      knownGapsY.forEach(function (kg) {
        if (!(kg.gap > 0.4) || snappedSpace) return;
        list.forEach(function (peer) {
          if (!peer || String(peer.id) === String(buttonId) || snappedSpace) return;
          if (Math.abs(x - peer.x) > SNAP) return;
          var below = peer.y + kg.gap;
          var above = peer.y - kg.gap;
          var px = Math.round(kg.gap / 100 * layerH);
          if (Math.abs(y - below) <= SPACE_SNAP) {
            ny = below;
            nx = peer.x;
            snappedSpace = {
              axis: 'y', pos: (peer.y + below) / 2, cross: peer.x, px: px, uniform: true
            };
          } else if (Math.abs(y - above) <= SPACE_SNAP) {
            ny = above;
            nx = peer.x;
            snappedSpace = {
              axis: 'y', pos: (peer.y + above) / 2, cross: peer.x, px: px, uniform: true
            };
          }
        });
      });

      if (snappedSpace) {
        guides.spacing = [snappedSpace];
      } else if (guides.spacing.length > 2) {
        /* Keep nearest peer spacing only — avoid clutter */
        guides.spacing.sort(function (a, b) { return a.px - b.px; });
        guides.spacing = guides.spacing.slice(0, 2);
      }

      return { x: nx, y: ny, guides: guides };
    }

    function nudgeSelectedButtons(dxPx, dyPx) {
      if (canvas().editMode !== 'buttons') return false;
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.slice()
        : [];
      if (!ids.length && canvas().selectedButtonId) ids = [canvas().selectedButtonId];
      if (!ids.length) return false;
      var layerW = Math.max(1, (buttonsLayer && buttonsLayer.clientWidth) || 1000);
      var layerH = Math.max(1, (buttonsLayer && buttonsLayer.clientHeight) || 1000);
      var dx = (Number(dxPx) || 0) / layerW * 100;
      var dy = (Number(dyPx) || 0) / layerH * 100;
      if (!dx && !dy) return false;
      armButtonOp(sceneId);
      buttonNudgeDirty = true;
      var single = ids.length === 1;
      ids.forEach(function (bid) {
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid);
        if (!btn) return;
        var x0 = btn.storedX != null ? Number(btn.storedX) : Number(btn.x);
        var y0 = btn.storedY != null ? Number(btn.storedY) : Number(btn.y);
        var nextX = x0 + dx;
        var nextY = y0 + dy;
        if (single) {
          var snapped = computeButtonGuides(sceneId, bid, nextX, nextY);
          buttonDrag = {
            buttonId: bid,
            sceneId: sceneId,
            guides: snapped.guides,
            nudge: true
          };
          nextX = snapped.x;
          nextY = snapped.y;
        } else {
          buttonDrag = {
            buttonId: bid,
            sceneId: sceneId,
            guides: { spacing: [] },
            nudge: true
          };
        }
        ExperienciaEngine.setSceneButtonPosition(
          state, sceneId, bid, nextX, nextY
        );
        clearPendingMove(bid);
      });
      paintButtonsStage();
      return true;
    }

    function clearPendingMove(buttonId) {
      if (buttonId == null) {
        pendingMoveIds = {};
        return;
      }
      if (pendingMoveIds[String(buttonId)]) {
        delete pendingMoveIds[String(buttonId)];
      }
    }

    function markPendingMove(buttonId) {
      if (buttonId == null) return;
      pendingMoveIds[String(buttonId)] = true;
    }

    function copySelectedButtons() {
      if (canvas().editMode !== 'buttons') return false;
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      var ids = Array.isArray(canvas().selectedButtonIds)
        ? canvas().selectedButtonIds.slice()
        : [];
      if (!ids.length && canvas().selectedButtonId) ids = [canvas().selectedButtonId];
      if (!ids.length) return false;
      var n = ExperienciaEngine.getNode(state, sceneId);
      var layerW = Math.max(1, (buttonsLayer && buttonsLayer.clientWidth) || 1000);
      var layerH = Math.max(1, (buttonsLayer && buttonsLayer.clientHeight) || 1000);
      var items = [];
      ids.forEach(function (id) {
        var b = ExperienciaEngine.getSceneButton(state, n, id);
        if (!b || !b._ix) return;
        /* Absolute on-screen geometry (not stored/anchor-derived after the fact) */
        var layout = ExperienciaEngine.resolveButtonLayout
          ? ExperienciaEngine.resolveButtonLayout(b._ix, layerW, layerH)
          : { x: b.x, y: b.y };
        items.push({
          label: b.label != null ? String(b.label) : '',
          style: b.style || 'chip',
          icon: b.icon || null,
          rotation: b.rotation != null ? Number(b.rotation) : 0,
          visible: b.visible !== false,
          x: Number(layout.x),
          y: Number(layout.y),
          positionMode: b.positionMode === 'anchor' ? 'anchor' : 'free',
          anchor: b.anchor || 'center',
          marginX: b.marginX != null ? Number(b.marginX) : 32,
          marginY: b.marginY != null ? Number(b.marginY) : 32,
          targetNodeId: b.targetNodeId || null
        });
      });
      if (!items.length) return false;
      buttonClipboard = { items: items };
      return true;
    }

    function pasteCopiedButtons() {
      if (canvas().editMode !== 'buttons') return false;
      if (!buttonClipboard || !buttonClipboard.items || !buttonClipboard.items.length) {
        return false;
      }
      var sceneId = canvas().selectedId;
      if (!sceneId) return false;
      if (!ExperienciaEngine.createSceneButtonFromSnapshot) return false;
      pushButtonHistory(sceneId);
      var pastedIds = [];
      /* Paste in original order — each at exact absolute coords, no recenter */
      buttonClipboard.items.forEach(function (item) {
        var copy = ExperienciaEngine.createSceneButtonFromSnapshot(state, sceneId, item);
        if (copy && copy.id) {
          pastedIds.push(String(copy.id));
          markPendingMove(copy.id);
        }
      });
      if (!pastedIds.length) return false;
      canvas().selectedButtonIds = pastedIds.slice();
      canvas().selectedButtonId = pastedIds[pastedIds.length - 1];
      paintButtonsStage();
      paintInspector();
      persist();
      return true;
    }

    function finishButtonNudge() {
      if (!buttonNudgeDirty && !(buttonDrag && buttonDrag.nudge)) return;
      buttonNudgeDirty = false;
      buttonDrag = null;
      endButtonOp();
      paintButtonsStage();
      paintInspector();
      persist();
    }

    function syncToolUi() {
      var tool = canvas().tool || 'select';
      if (tool === 'connect') {
        tool = 'select';
        canvas().tool = 'select';
      }
      rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
        var t = btn.getAttribute('data-exp-tool');
        var isMode = t === 'select' || t === 'cut';
        btn.classList.toggle('is-active', isMode && t === tool);
      });
      viewport.classList.toggle('is-cut', tool === 'cut');
      viewport.classList.remove('is-connect');
    }

    function selectNode(id, opts) {
      opts = opts || {};
      if (!opts.keepInteraction) {
        canvas().selectedInteractionId = null;
        canvas().selectedInteractionSceneId = null;
      }
      if (!opts.keepButton) {
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
      }
      if (!opts.keepHotspot) {
        canvas().selectedHotspotId = null;
        hotspotDraw = null;
      }
      if (opts.toggle && id) {
        ExperienciaEngine.toggleSelectionId(state, id);
      } else if (opts.add && id) {
        var ids = selectedIds();
        if (ids.indexOf(id) < 0) ids.push(id);
        ExperienciaEngine.setSelection(state, ids, []);
      } else {
        ExperienciaEngine.setSelection(state, id ? [id] : [], []);
      }
      var next = ExperienciaEngine.getNode(state, canvas().selectedId);
      var editable = next && ExperienciaEngine.isButtonsEditableNode &&
        ExperienciaEngine.isButtonsEditableNode(next);
      if (!editable && (canvas().editMode === 'buttons' || canvas().editMode === 'hotspots')) {
        canvas().editMode = 'flow';
      }
      if (id || selectedIds().length) {
        openPropertiesRail();
      }
      renderAll();
      persist();
    }

    function selectInteraction(sceneId, ixId) {
      ExperienciaEngine.setSelection(state, sceneId ? [sceneId] : [], []);
      canvas().selectedInteractionId = ixId || null;
      canvas().selectedInteractionSceneId = sceneId || null;
      openPropertiesRail();
      renderAll();
      persist();
    }

    function openAddElementMenu(sceneId, clientXY) {
      pendingCreate = { sceneId: sceneId, mode: 'add-element' };
      ctxMode = { type: 'add-element', sceneId: sceneId };
      if (!ctxEl) return;
      ctxEl.innerHTML = addElementMenuHtml();
      positionCtxMenu(clientXY.x, clientXY.y);
    }

    function selectEdge(id) {
      ExperienciaEngine.setSelection(state, [], id ? [id] : []);
      if (id) openPropertiesRail();
      renderAll();
      persist();
    }

    function clearAllSelection() {
      ExperienciaEngine.clearSelection(state);
      renderAll();
      persist();
    }

    function positionCtxMenu(clientX, clientY) {
      if (!ctxEl || !stage) return;
      ctxEl.hidden = false;
      var stageRect = stage.getBoundingClientRect();
      var panel = ctxEl.querySelector('.builder-exp-ctx__panel');
      var pw = (panel && panel.offsetWidth) || 260;
      var ph = (panel && panel.offsetHeight) || 280;
      var left = clientX - stageRect.left;
      var top = clientY - stageRect.top;
      left = Math.max(8, Math.min(left, stageRect.width - pw - 8));
      top = Math.max(8, Math.min(top, stageRect.height - ph - 8));
      ctxEl.style.left = left + 'px';
      ctxEl.style.top = top + 'px';
    }

    function hideCtx() {
      if (ctxEl) { ctxEl.hidden = true; ctxEl.innerHTML = ''; }
      pendingCreate = null;
      ctxMode = null;
    }

    function hidePicker() {
      if (pickerEl) { pickerEl.hidden = true; pickerEl.innerHTML = ''; }
    }

    function openCreateMenu(worldPt, fromMeta, clientXY, title) {
      pendingCreate = {
        at: worldPt,
        fromId: fromMeta && fromMeta.fromId,
        portId: fromMeta && (fromMeta.portId || fromMeta.sourcePortId),
        portLabel: fromMeta && fromMeta.portLabel,
        sourcePortId: fromMeta && (fromMeta.sourcePortId || fromMeta.portId),
        targetPortId: (fromMeta && fromMeta.targetPortId) || 'in',
        fromInteraction: !!(fromMeta && fromMeta.fromInteraction)
      };
      pendingCreate.menu = (ExperienciaEngine.menuForContext
        ? ExperienciaEngine.menuForContext(pendingCreate)
        : ExperienciaEngine.CREATE_MENU) || ExperienciaEngine.CREATE_MENU;
      ctxMode = 'create';
      if (!ctxEl) return;
      var menuTitle = title ||
        (pendingCreate.fromId ? '¿Qué quieres que ocurra?' : '¿Qué quieres crear?');
      ctxEl.innerHTML = createMenuHtml(menuTitle, pendingCreate.menu);
      if (clientXY) positionCtxMenu(clientXY.x, clientXY.y);
      else {
        ctxEl.hidden = false;
        var rect = viewport.getBoundingClientRect();
        var c = canvas();
        var left = worldPt.x * c.zoom + c.panX;
        var top = worldPt.y * c.zoom + c.panY;
        left = Math.max(8, Math.min(left, rect.width - 280));
        top = Math.max(8, Math.min(top, rect.height - 320));
        ctxEl.style.left = left + 'px';
        ctxEl.style.top = top + 'px';
      }
    }

    function runInteractionAction(act, sceneId, ixId) {
      if (!sceneId || !ixId) return;
      var ix = ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(state, sceneId, ixId)
        : null;
      if (!ix && act !== 'del' && act !== 'delete') return;
      if (act === 'rename') {
        hideCtx();
        /* Focus inspector name field — no native prompt */
        selectInteraction(sceneId, ixId);
        requestAnimationFrame(function () {
          var inp = inspectorBody && inspectorBody.querySelector('[data-exp-ix-label]');
          if (inp) {
            try { inp.focus(); inp.select(); } catch (eR) {}
          }
        });
        return;
      } else if (act === 'toggle') {
        ExperienciaEngine.updateInteraction(state, sceneId, ixId, {
          enabled: !(ix.enabled !== false)
        });
      } else if (act === 'dup' || act === 'duplicate') {
        ExperienciaEngine.duplicateInteraction(state, sceneId, ixId);
      } else if (act === 'unlink') {
        /* Solo quita conexiones del puerto; conserva la interacción */
        var exp = ExperienciaEngine.ensureState(state);
        var portId = ix.portId || ix.id;
        exp.edges = (exp.edges || []).filter(function (ed) {
          var from = ed.sourceNodeId || ed.from;
          var pid = ed.sourcePortId || ed.portId;
          return !(from === sceneId && pid === portId);
        });
      } else if (act === 'del' || act === 'delete') {
        boxiesConfirm({
          title: 'Eliminar elemento',
          message: '¿Eliminar esta interacción? Su escena destino se conserva.',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          ExperienciaEngine.removeInteraction(state, sceneId, ixId);
          hideCtx();
          renderAll();
          persist();
        });
        return;
      } else if (act === 'configure') {
        selectNode(sceneId);
        openPropertiesRail();
      }
      hideCtx();
      renderAll();
      persist();
    }

    function openInteractionContextMenu(clientX, clientY, sceneId, ixId) {
      var scene = ExperienciaEngine.getNode(state, sceneId);
      var ix = ExperienciaEngine.getInteraction
        ? ExperienciaEngine.getInteraction(state, sceneId, ixId)
        : null;
      if (!scene || !ix) return;
      ExperienciaEngine.setSelection(state, [sceneId], []);
      openPropertiesRail();
      ctxMode = { type: 'interaction', sceneId: sceneId, ixId: ixId };
      if (!ctxEl) return;
      ctxEl.innerHTML = interactionContextMenuHtml(ix);
      positionCtxMenu(clientX, clientY);
      paintNodes();
      paintInspector();
    }

    function openNodeContextMenu(clientX, clientY, nodeId) {
      var ids = selectedIds();
      if (!ids.length || ids.indexOf(nodeId) < 0) {
        ExperienciaEngine.setSelection(state, [nodeId], []);
        ids = [nodeId];
        paintNodes();
      }
      var nodes = ids.map(function (id) {
        return ExperienciaEngine.getNode(state, id);
      }).filter(Boolean);
      ctxMode = 'node';
      pendingCreate = null;
      if (!ctxEl) return;
      ctxEl.innerHTML = nodeContextMenuHtml(nodes);
      positionCtxMenu(clientX, clientY);
    }

    function openEdgeContextMenu(clientX, clientY, edgeId) {
      selectEdge(edgeId);
      ctxMode = 'edge';
      pendingCreate = null;
      if (!ctxEl) return;
      ctxEl.innerHTML = edgeContextMenuHtml();
      positionCtxMenu(clientX, clientY);
    }

    function updateMarqueeVisual() {
      if (!marqueeEl || !marquee) {
        if (marqueeEl) marqueeEl.hidden = true;
        return;
      }
      var x1 = Math.min(marquee.x0, marquee.x1);
      var y1 = Math.min(marquee.y0, marquee.y1);
      var x2 = Math.max(marquee.x0, marquee.x1);
      var y2 = Math.max(marquee.y0, marquee.y1);
      marqueeEl.hidden = false;
      marqueeEl.style.left = x1 + 'px';
      marqueeEl.style.top = y1 + 'px';
      marqueeEl.style.width = Math.max(1, x2 - x1) + 'px';
      marqueeEl.style.height = Math.max(1, y2 - y1) + 'px';
    }

    function nodesInMarquee() {
      if (!marquee) return [];
      var x1 = Math.min(marquee.x0, marquee.x1);
      var y1 = Math.min(marquee.y0, marquee.y1);
      var x2 = Math.max(marquee.x0, marquee.x1);
      var y2 = Math.max(marquee.y0, marquee.y1);
      return ExperienciaEngine.visibleNodes(state).filter(function (n) {
        if (n.x == null || n.y == null) return false;
        var s = ExperienciaEngine.nodeSize(n);
        var nx1 = n.x;
        var ny1 = n.y;
        var nx2 = n.x + s.w;
        var ny2 = n.y + s.h;
        return nx1 < x2 && nx2 > x1 && ny1 < y2 && ny2 > y1;
      }).map(function (n) { return n.id; });
    }

    function deleteSelection() {
      if (canvas().selectedEdgeId || (canvas().selectedEdgeIds || []).length) {
        var eids = (canvas().selectedEdgeIds || []).slice();
        if (canvas().selectedEdgeId && eids.indexOf(canvas().selectedEdgeId) < 0) {
          eids.push(canvas().selectedEdgeId);
        }
        eids.forEach(function (eid) { ExperienciaEngine.removeEdge(state, eid); });
        ExperienciaEngine.clearSelection(state);
        renderAll(); persist();
        return;
      }
      var ids = selectedIds();
      if (!ids.length) return;
      var res = ExperienciaEngine.removeNodes(state, ids);
      ExperienciaEngine.clearSelection(state);
      renderAll(); persist();
      if (res.skipped.length && typeof AdminNotify !== 'undefined') {
        AdminNotify.info('Algunos nodos protegidos o bloqueados no se eliminaron.');
      }
    }

    function runNodeAction(act) {
      var ids = selectedIds();
      if (!ids.length) return;
      if (act === 'rename') {
        if (ids.length !== 1) return;
        hideCtx();
        startInlineRename(ids[0]);
        return;
      }
      if (act === 'duplicate') {
        if (ids.length === 1) {
          var copy = ExperienciaEngine.duplicateNode(state, ids[0]);
          if (copy) ExperienciaEngine.setSelection(state, [copy.id], []);
        } else {
          var dup = ExperienciaEngine.duplicateSelection(state, ids);
          var newIds = (dup.nodes || []).map(function (n) { return n.id; });
          ExperienciaEngine.setSelection(state, newIds, []);
        }
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'lock') {
        ExperienciaEngine.setNodesLocked(state, ids, true);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'unlock') {
        ExperienciaEngine.setNodesLocked(state, ids, false);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'unlink') {
        var total = 0;
        ids.forEach(function (id) {
          total += ExperienciaEngine.connectionsFor(state, id).in.length +
            ExperienciaEngine.connectionsFor(state, id).out.length;
        });
        if (total > 1) {
          boxiesConfirm({
            title: 'Desvincular',
            message: '¿Desvincular ' + total + ' conexiones de la selección?',
            confirmLabel: 'Desvincular',
            cancelLabel: 'Cancelar'
          }).then(function (ok) {
            if (!ok) return;
            ExperienciaEngine.unlinkNodes(state, ids);
            hideCtx(); renderAll(); persist();
          });
          return;
        }
        ExperienciaEngine.unlinkNodes(state, ids);
        hideCtx(); renderAll(); persist();
        return;
      }
      if (act === 'delete') {
        boxiesConfirm({
          title: 'Eliminar del flujo',
          message: ids.length > 1
            ? '¿Eliminar ' + ids.length + ' nodos del flujo? (no borra media/assets)'
            : '¿Eliminar este nodo del flujo? (no borra media/assets)',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          deleteSelection();
          hideCtx();
        });
      }
    }

    function fitView() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var pad = 120;
      var spanX = Math.max(1, b.maxX - b.minX + pad);
      var spanY = Math.max(1, b.maxY - b.minY + pad);
      var zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(vr.width / spanX, vr.height / spanY) * 0.88));
      canvas().zoom = zoom;
      canvas().panX = (vr.width - spanX * zoom) / 2 - b.minX * zoom + 24;
      canvas().panY = (vr.height - spanY * zoom) / 2 - b.minY * zoom + 24;
      renderAll();
      persist();
    }

    /** Single fitView after template generation — wait one paint so cards exist in DOM. */
    function fitViewAfterTemplate() {
      renderAll();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fitView();
        });
      });
    }

    function centerView() {
      var nodes = ExperienciaEngine.visibleNodes(state);
      var b = ExperienciaEngine.bounds(nodes);
      var vr = viewport.getBoundingClientRect();
      var cx = (b.minX + b.maxX) / 2;
      var cy = (b.minY + b.maxY) / 2;
      var z = canvas().zoom || 1;
      canvas().panX = vr.width / 2 - cx * z;
      canvas().panY = vr.height / 2 - cy * z;
      renderAll();
      persist();
    }

    function openStructurePicker() {
      if (!pickerEl || !pendingCreate) return;
      pickerEl.innerHTML = structurePickerHtml(state);
      pickerEl.hidden = false;
      pickerEl.style.left = ctxEl.style.left;
      pickerEl.style.top = ctxEl.style.top;
      hideCtx();
      pickerEl.querySelectorAll('[data-exp-struct]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = {
            id: btn.getAttribute('data-exp-struct'),
            label: btn.getAttribute('data-label'),
            kind: btn.getAttribute('data-kind'),
            capacity: btn.getAttribute('data-capacity')
              ? Number(btn.getAttribute('data-capacity'))
              : null,
            stageId: btn.getAttribute('data-stage') || null
          };
          var n = ExperienciaEngine.createStructureLinkedNode(state, item, pendingCreate.at, {
            fromId: pendingCreate.fromId,
            portId: pendingCreate.portId || pendingCreate.sourcePortId,
            portLabel: pendingCreate.portLabel,
            sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
            targetPortId: pendingCreate.targetPortId || 'in'
          });
          hidePicker();
          pendingCreate = null;
          selectNode(n.id);
          persist();
        });
      });
      var cancel = pickerEl.querySelector('[data-exp-picker-cancel]');
      if (cancel) cancel.addEventListener('click', function () { hidePicker(); pendingCreate = null; });
    }

    if (ctxEl) {
      ctxEl.addEventListener('click', function (ev) {
        var cancel = ev.target.closest('[data-exp-ctx-cancel]');
        if (cancel) { hideCtx(); return; }
        var nodeAct = ev.target.closest('[data-exp-node-act]');
        if (nodeAct) {
          runNodeAction(nodeAct.getAttribute('data-exp-node-act'));
          return;
        }
        var ixCtx = ev.target.closest('[data-exp-ix-ctx]');
        if (ixCtx && ctxMode && ctxMode.sceneId && ctxMode.ixId) {
          runInteractionAction(
            ixCtx.getAttribute('data-exp-ix-ctx'),
            ctxMode.sceneId,
            ctxMode.ixId
          );
          return;
        }
        var addElItem = ev.target.closest('[data-exp-add-el-item]');
        if (addElItem) {
          var sceneForEl = (pendingCreate && pendingCreate.sceneId) ||
            (ctxMode && ctxMode.sceneId);
          var elItem = ExperienciaEngine.findAddElementItem
            ? ExperienciaEngine.findAddElementItem(addElItem.getAttribute('data-exp-add-el-item'))
            : null;
          if (sceneForEl && elItem) {
            var created = ExperienciaEngine.addElementFromMenu(state, sceneForEl, elItem);
            hideCtx();
            if (created && created.error === 'global-control') {
              if (typeof AdminNotify !== 'undefined') {
                AdminNotify.info(created.message || 'Control global del showroom.');
              }
              return;
            }
            if (created && created.id) selectInteraction(sceneForEl, created.id);
            else { renderAll(); persist(); }
          }
          return;
        }
        var edgeAct = ev.target.closest('[data-exp-edge-act]');
        if (edgeAct && edgeAct.getAttribute('data-exp-edge-act') === 'unlink') {
          if (canvas().selectedEdgeId) {
            ExperienciaEngine.removeEdge(state, canvas().selectedEdgeId);
            ExperienciaEngine.clearSelection(state);
            hideCtx(); renderAll(); persist();
          }
          return;
        }
        var item = ev.target.closest('[data-exp-create]');
        if (!item || !pendingCreate) return;
        var menuItem = findMenuItem(item.getAttribute('data-exp-create'), pendingCreate.menu);
        if (!menuItem) return;
        var result = ExperienciaEngine.createNodeFromMenu(state, menuItem, pendingCreate.at, {
          fromId: pendingCreate.fromId,
          portId: pendingCreate.portId || pendingCreate.sourcePortId,
          portLabel: pendingCreate.portLabel,
          sourcePortId: pendingCreate.sourcePortId || pendingCreate.portId,
          targetPortId: pendingCreate.targetPortId || 'in'
        });
        if (result && result.error === 'need-scene') {
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info(result.message || 'Necesitas una escena origen.');
          }
          hideCtx();
          return;
        }
        if (result && result.needsPicker === '_link_structure') {
          openStructurePicker();
          return;
        }
        if (result && result.needsPicker === '_link_existing') {
          hideCtx();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info('Selecciona un nodo existente en el canvas y conéctalo arrastrando.');
          }
          canvas().tool = 'select';
          pendingCreate = null;
          syncToolUi();
          return;
        }
        hideCtx();
        if (result && (result.inline || result.embedded)) {
          selectNode((result.scene && result.scene.id) || (result.node && result.node.id));
        } else if (result && result.node) {
          selectNode(result.node.id);
        } else {
          renderAll(); persist();
        }
      });
    }

    /* Toolbar */
    rootEl.querySelectorAll('[data-exp-tool]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tool = btn.getAttribute('data-exp-tool');
        if (tool === 'select') {
          canvas().tool = 'select';
          linkDrag = null;
          hoverCutEdgeId = null;
          syncToolUi();
          persist();
          return;
        }
        if (tool === 'cut') {
          canvas().tool = 'cut';
          linkDrag = null;
          hoverCutEdgeId = null;
          syncToolUi();
          persist();
          return;
        }
        if (tool === 'zoom-in') {
          canvas().zoom = Math.min(MAX_ZOOM, (canvas().zoom || 1) * 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'zoom-out') {
          canvas().zoom = Math.max(MIN_ZOOM, (canvas().zoom || 1) / 1.15);
          renderAll(); persist(); return;
        }
        if (tool === 'fit') {
          fitView();
          return;
        }
        if (tool === 'canvas-mode') {
          toggleCanvasMode();
          return;
        }
        if (tool === 'relayout') {
          /* Internal only — removed from toolbar UI in V5.9.59 */
          ExperienciaEngine.forceRelayout(state);
          fitView();
          if (api.onChange) api.onChange();
          return;
        }
        if (tool === 'minimap') {
          canvas().minimapVisible = !canvas().minimapVisible;
          renderAll(); persist();
        }
      });
    });

    /* V6.3.00 — FLUJO | BOTONES | HOTSPOTS | PROTOTIPO */
    if (modeTabs) {
      modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var mode = btn.getAttribute('data-exp-edit-mode');
          if (mode === 'buttons' && !canUseButtonsMode()) return;
          if (mode === 'hotspots' && !canUseHotspotsMode()) return;
          canvas().editMode = mode === 'buttons' ? 'buttons'
            : (mode === 'hotspots' ? 'hotspots'
              : (mode === 'prototype' ? 'prototype' : 'flow'));
          if (canvas().editMode !== 'buttons') {
            canvas().selectedButtonId = null;
            canvas().selectedButtonIds = [];
          }
          if (canvas().editMode !== 'hotspots') {
            canvas().selectedHotspotId = null;
            hotspotDraw = null;
          }
          openPropertiesRail();
          renderAll();
          persist();
          requestAnimationFrame(recomputeOverlayLayout);
          if (canvas().editMode === 'prototype') {
            requestAnimationFrame(function () {
              syncPrototypeStoryboard();
              if (protoRuntimePlayer && protoRuntimePlayer.resize) protoRuntimePlayer.resize();
            });
          }
        });
      });
    }

    function percentFromPointer(ev) {
      var el = buttonsLayer || buttonsFrame;
      if (!el) return { x: 50, y: 50 };
      var rect = el.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      var y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      return {
        x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
      };
    }

    if (buttonsLayer) {
      buttonsLayer.addEventListener('pointerdown', function (ev) {
        /* Gizmo resize / rotate */
        var handle = ev.target.closest && ev.target.closest('[data-handle]');
        if (handle && handle.closest('[data-exp-gizmo]')) {
          var gizmo = handle.closest('[data-exp-gizmo]');
          var gid = gizmo.getAttribute('data-gizmo-id');
          var gtype = gizmo.getAttribute('data-gizmo-type') || 'BUTTON';
          var sceneIdG = canvas().selectedId;
          var btnG = ExperienciaEngine.getSceneButton(state,
            ExperienciaEngine.getNode(state, sceneIdG), gid);
          if (!btnG || btnG.locked) return;
          ev.preventDefault();
          ev.stopPropagation();
          var pct0 = percentFromPointer(ev);
          transformDrag = {
            mode: handle.getAttribute('data-handle'),
            buttonId: gid,
            sceneId: sceneIdG,
            type: gtype,
            pointerId: ev.pointerId,
            startX: btnG.storedX != null ? Number(btnG.storedX) : Number(btnG.x) || 50,
            startY: btnG.storedY != null ? Number(btnG.storedY) : Number(btnG.y) || 50,
            startW: gtype === 'BUTTON'
              ? (btnG.boxW != null ? Number(btnG.boxW) : 14)
              : (Number(btnG.width) || 12),
            startH: gtype === 'BUTTON'
              ? (btnG.boxH != null ? Number(btnG.boxH) : 4.5)
              : (Number(btnG.height) || 8),
            startRot: Number(btnG.rotation) || 0,
            startPx: pct0.x,
            startPy: pct0.y,
            keepRatio: !!ev.shiftKey,
            historyPushed: false
          };
          try { buttonsLayer.setPointerCapture(ev.pointerId); } catch (eCapG) {}
          return;
        }

        var hit = ev.target.closest('[data-exp-stage-btn]');
        if (!hit) {
          if (ev.target.closest('[data-exp-gizmo]')) return;
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
          renderAll();
          return;
        }
        if (hit.isContentEditable || hit.getAttribute('contenteditable') === 'true') return;
        ev.preventDefault();
        ev.stopPropagation();
        var bid = hit.getAttribute('data-exp-stage-btn');
        var cur = Array.isArray(canvas().selectedButtonIds)
          ? canvas().selectedButtonIds.map(String)
          : [];
        if (!cur.length && canvas().selectedButtonId) cur = [String(canvas().selectedButtonId)];
        if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
          var idx = cur.indexOf(String(bid));
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(String(bid));
          canvas().selectedButtonIds = cur;
          canvas().selectedButtonId = bid;
        } else {
          canvas().selectedButtonIds = [String(bid)];
          canvas().selectedButtonId = bid;
        }
        var sceneId = canvas().selectedId;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid
        );
        if (btn && btn.locked) {
          paintButtonsStage();
          paintInspector();
          return;
        }
        buttonDrag = {
          buttonId: bid,
          sceneId: sceneId,
          pointerId: ev.pointerId,
          startX: btn ? (btn.storedX != null ? btn.storedX : btn.x) : 50,
          startY: btn ? (btn.storedY != null ? btn.storedY : btn.y) : 50,
          guides: null,
          historyPushed: false
        };
        try { hit.setPointerCapture(ev.pointerId); } catch (eCap) {}
        paintButtonsStage();
        paintInspector();
      });
      buttonsLayer.addEventListener('pointermove', function (ev) {
        if (transformDrag && ev.pointerId === transformDrag.pointerId) {
          var pctT = percentFromPointer(ev);
          if (!transformDrag.historyPushed) {
            pushButtonHistory(transformDrag.sceneId);
            transformDrag.historyPushed = true;
          }
          var mode = transformDrag.mode;
          if (mode === 'rotate') {
            var ang = Math.atan2(pctT.y - transformDrag.startY, pctT.x - transformDrag.startX);
            var deg = Math.round((ang * 180) / Math.PI) + 90;
            ExperienciaEngine.updateSceneButton(state, transformDrag.sceneId, transformDrag.buttonId, {
              rotation: deg
            });
          } else {
            var dx = pctT.x - transformDrag.startPx;
            var dy = pctT.y - transformDrag.startPy;
            var nw = transformDrag.startW;
            var nh = transformDrag.startH;
            var nx = transformDrag.startX;
            var ny = transformDrag.startY;
            if (mode.indexOf('e') >= 0) { nw = transformDrag.startW + dx; nx = transformDrag.startX + dx / 2; }
            if (mode.indexOf('w') >= 0) { nw = transformDrag.startW - dx; nx = transformDrag.startX + dx / 2; }
            if (mode.indexOf('s') >= 0) { nh = transformDrag.startH + dy; ny = transformDrag.startY + dy / 2; }
            if (mode.indexOf('n') >= 0) { nh = transformDrag.startH - dy; ny = transformDrag.startY + dy / 2; }
            if (transformDrag.keepRatio && transformDrag.startW > 0) {
              var ratio = transformDrag.startH / transformDrag.startW;
              if (mode === 'n' || mode === 's') {
                nw = nh / ratio;
                nx = transformDrag.startX + (mode === 'e' || mode.indexOf('e') >= 0 ? (nw - transformDrag.startW) / 2 : 0);
              } else {
                nh = nw * ratio;
              }
            }
            nw = Math.max(1.5, Math.min(90, nw));
            nh = Math.max(1.5, Math.min(90, nh));
            nx = Math.max(0, Math.min(100, nx));
            ny = Math.max(0, Math.min(100, ny));
            var patchT = { x: nx, y: ny };
            if (transformDrag.type === 'BUTTON') {
              patchT.boxW = nw;
              patchT.boxH = nh;
            } else if (transformDrag.type === 'SHAPE_RECT' || transformDrag.type === 'SHAPE_CIRCLE') {
              patchT.width = nw;
              patchT.height = nh;
            }
            ExperienciaEngine.updateSceneButton(state, transformDrag.sceneId, transformDrag.buttonId, patchT);
          }
          paintButtonsStage();
          return;
        }
        if (!buttonDrag || ev.pointerId !== buttonDrag.pointerId) return;
        var pct = percentFromPointer(ev);
        if (!buttonDrag.historyPushed) {
          pushButtonHistory(buttonDrag.sceneId);
          buttonDrag.historyPushed = true;
        }
        var snapped = computeButtonGuides(
          buttonDrag.sceneId, buttonDrag.buttonId, pct.x, pct.y
        );
        buttonDrag.guides = snapped.guides;
        ExperienciaEngine.setSceneButtonPosition(
          state, buttonDrag.sceneId, buttonDrag.buttonId, snapped.x, snapped.y
        );
        clearPendingMove(buttonDrag.buttonId);
        paintButtonsStage();
      });
      function endButtonDrag(ev) {
        if (transformDrag && (!ev || ev.pointerId === transformDrag.pointerId)) {
          var movedT = transformDrag.historyPushed;
          transformDrag = null;
          paintButtonsStage();
          paintInspector();
          if (movedT) persist();
          return;
        }
        if (!buttonDrag || (ev && ev.pointerId !== buttonDrag.pointerId)) return;
        var moved = buttonDrag.historyPushed;
        buttonDrag = null;
        paintButtonsStage();
        paintInspector();
        if (moved) persist();
      }
      buttonsLayer.addEventListener('pointerup', endButtonDrag);
      buttonsLayer.addEventListener('pointercancel', endButtonDrag);
      /* Force hover color in Builder (theme tokens otherwise keep white). */
      buttonsLayer.addEventListener('mouseover', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.builder-exp-ui-btn.is-hover-on');
        if (!btn || btn._hoverPainted) return;
        var c = btn.getAttribute('data-hover-color') ||
          (btn.style && btn.style.getPropertyValue('--btn-hover-color')) || '';
        var tc = btn.getAttribute('data-hover-text') ||
          (btn.style && btn.style.getPropertyValue('--btn-hover-text')) || '';
        c = String(c || '').trim();
        tc = String(tc || '').trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(c)) return;
        btn._hoverPainted = true;
        btn.style.setProperty('color', (/^#[0-9a-fA-F]{6}$/.test(tc) ? tc : c), 'important');
        btn.style.setProperty('border-color', c, 'important');
        btn.style.setProperty('background',
          'color-mix(in srgb, ' + c + ' 32%, rgba(8, 8, 8, 0.72))', 'important');
      });
      buttonsLayer.addEventListener('mouseout', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.builder-exp-ui-btn');
        if (!btn || !btn._hoverPainted) return;
        var to = ev.relatedTarget;
        if (to && btn.contains(to)) return;
        btn._hoverPainted = false;
        btn.style.removeProperty('color');
        btn.style.removeProperty('border-color');
        btn.style.removeProperty('background');
      });
      buttonsLayer.addEventListener('dblclick', function (ev) {
        if (canvas().editMode !== 'buttons') return;
        var hit = ev.target.closest('[data-exp-stage-text][data-exp-stage-btn]');
        if (!hit) return;
        ev.preventDefault();
        ev.stopPropagation();
        var bid = hit.getAttribute('data-exp-stage-btn');
        var sceneId = canvas().selectedId;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid
        );
        if (!btn || String(btn.type || '').toUpperCase() !== 'TEXT') return;
        if (btn.locked) return;
        canvas().selectedButtonIds = [String(bid)];
        canvas().selectedButtonId = bid;
        if (textEditEl && textEditEl !== hit) {
          textEditEl.contentEditable = 'false';
          textEditEl.removeAttribute('contenteditable');
        }
        textEditEl = hit;
        hit.contentEditable = 'true';
        hit.setAttribute('contenteditable', 'true');
        hit.focus();
        try {
          var range = document.createRange();
          range.selectNodeContents(hit);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (eSel) {}
        function commitTextEdit() {
          if (!textEditEl || textEditEl !== hit) return;
          var next = String(hit.innerText || hit.textContent || '').replace(/\n+/g, ' ').trim();
          hit.contentEditable = 'false';
          hit.removeAttribute('contenteditable');
          textEditEl = null;
          hit.removeEventListener('blur', commitTextEdit);
          hit.removeEventListener('keydown', onTextKey);
          pushButtonHistory(sceneId);
          ExperienciaEngine.updateSceneButton(state, sceneId, bid, {
            label: next || 'Texto'
          });
          paintButtonsStage();
          paintInspector();
          persist();
        }
        function onTextKey(kev) {
          if (kev.key === 'Enter' && !kev.shiftKey) {
            kev.preventDefault();
            hit.blur();
          } else if (kev.key === 'Escape') {
            kev.preventDefault();
            hit.textContent = btn.label != null ? String(btn.label) : 'Texto';
            hit.blur();
          }
        }
        hit.addEventListener('blur', commitTextEdit);
        hit.addEventListener('keydown', onTextKey);
        paintInspector();
      });
    }

    if (buttonsFrame) {
      buttonsFrame.addEventListener('pointerdown', function (ev) {
        if (ev.target.closest('[data-exp-stage-btn]')) return;
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        paintButtonsStage();
        paintInspector();
      });
    }

    /* V6.2.00 — HOTSPOTS polygon draw / edit */
    if (hotspotsLayer) {
      hotspotsLayer.addEventListener('dblclick', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        ev.preventDefault();
        ev.stopPropagation();
        if (hotspotDraw) {
          closeHotspotDraft();
          return;
        }
        /* Insert vertex on selected polygon at click */
        var poly = ev.target.closest('[data-exp-hs-poly]');
        if (!poly) return;
        var hid = poly.getAttribute('data-exp-hs-poly');
        if (!hid) return;
        canvas().selectedHotspotId = hid;
        var pct = hotspotPercentFromPointer(ev);
        var mask = ExperienciaEngine.getSceneHotspotMask(state,
          ExperienciaEngine.getNode(state, canvas().selectedId), hid);
        if (!mask || !mask.polygon || mask.polygon.length < 3) return;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < mask.polygon.length; i++) {
          var a = mask.polygon[i];
          var b = mask.polygon[(i + 1) % mask.polygon.length];
          var mx = (a.x + b.x) / 2;
          var my = (a.y + b.y) / 2;
          var d = (pct.x - mx) * (pct.x - mx) + (pct.y - my) * (pct.y - my);
          if (d < bestD) { bestD = d; best = i; }
        }
        ExperienciaEngine.insertHotspotVertex(
          state, canvas().selectedId, hid, best, pct.x, pct.y
        );
        paintHotspotsStage();
        paintInspector();
        persist();
      });
      hotspotsLayer.addEventListener('pointerdown', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        var pct = hotspotPercentFromPointer(ev);
        var vertex = ev.target.closest('[data-exp-hs-vertex]');
        var poly = ev.target.closest('[data-exp-hs-poly]');

        if (hotspotDraw) {
          ev.preventDefault();
          ev.stopPropagation();
          hotspotDraw.points.push(pct);
          paintHotspotsStage();
          return;
        }

        if (vertex) {
          ev.preventDefault();
          ev.stopPropagation();
          var hid = vertex.getAttribute('data-exp-hs-vertex');
          canvas().selectedHotspotId = hid;
          hotspotDrag = {
            kind: 'vertex',
            hotspotId: hid,
            index: Number(vertex.getAttribute('data-exp-hs-vi')),
            pointerId: ev.pointerId
          };
          try { hotspotsLayer.setPointerCapture(ev.pointerId); } catch (eCap) {}
          paintHotspotsStage();
          paintInspector();
          return;
        }

        if (poly) {
          ev.preventDefault();
          ev.stopPropagation();
          var pid = poly.getAttribute('data-exp-hs-poly');
          canvas().selectedHotspotId = pid;
          hotspotDrag = {
            kind: 'move',
            hotspotId: pid,
            pointerId: ev.pointerId,
            lastX: pct.x,
            lastY: pct.y,
            moved: false
          };
          try { hotspotsLayer.setPointerCapture(ev.pointerId); } catch (eCap2) {}
          paintHotspotsStage();
          paintInspector();
          return;
        }

        canvas().selectedHotspotId = null;
        paintHotspotsStage();
        paintInspector();
      });
      hotspotsLayer.addEventListener('pointermove', function (ev) {
        if (canvas().editMode !== 'hotspots') return;
        var pct = hotspotPercentFromPointer(ev);
        if (hotspotDraw) {
          hotspotDraw.cursor = pct;
          paintHotspotsStage();
          return;
        }
        if (!hotspotDrag || ev.pointerId !== hotspotDrag.pointerId) return;
        var sceneId = canvas().selectedId;
        if (hotspotDrag.kind === 'vertex') {
          ExperienciaEngine.setHotspotVertex(
            state, sceneId, hotspotDrag.hotspotId, hotspotDrag.index, pct.x, pct.y
          );
          paintHotspotsStage();
        } else if (hotspotDrag.kind === 'move') {
          var dx = pct.x - hotspotDrag.lastX;
          var dy = pct.y - hotspotDrag.lastY;
          if (dx || dy) {
            ExperienciaEngine.translateHotspotMask(
              state, sceneId, hotspotDrag.hotspotId, dx, dy
            );
            hotspotDrag.lastX = pct.x;
            hotspotDrag.lastY = pct.y;
            hotspotDrag.moved = true;
            paintHotspotsStage();
          }
        }
      });
      function endHotspotDrag(ev) {
        if (!hotspotDrag || (ev && ev.pointerId !== hotspotDrag.pointerId)) return;
        var moved = !!hotspotDrag.moved || hotspotDrag.kind === 'vertex';
        hotspotDrag = null;
        paintHotspotsStage();
        paintInspector();
        if (moved) persist();
      }
      hotspotsLayer.addEventListener('pointerup', endHotspotDrag);
      hotspotsLayer.addEventListener('pointercancel', endHotspotDrag);
    }

    window.addEventListener('blur', function () {
      finishButtonNudge();
    });

    var fsBtn = rootEl.querySelector('[data-exp-fullscreen]');
    if (fsBtn) {
      fsBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggleBrowserFullscreen();
      });
    }
    function onFullscreenChange() {
      syncFocusFullscreenBtn();
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    var hideMini = rootEl.querySelector('[data-exp-minimap-hide]');
    if (hideMini) {
      hideMini.addEventListener('click', function () {
        canvas().minimapVisible = false;
        renderAll(); persist();
      });
    }

    var exitGroup = rootEl.querySelector('#builderExpExitGroupBtn');
    if (exitGroup) {
      exitGroup.addEventListener('click', function () {
        ExperienciaEngine.exitGroup(state);
        renderAll(); persist();
      });
    }

    viewport.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var factor = ev.deltaY > 0 ? 0.92 : 1.08;
      var before = clientToWorld(ev.clientX, ev.clientY);
      var next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (canvas().zoom || 1) * factor));
      canvas().zoom = next;
      var rect = viewport.getBoundingClientRect();
      canvas().panX = ev.clientX - rect.left - before.x * next;
      canvas().panY = ev.clientY - rect.top - before.y * next;
      applyWorldTransform();
      paintMinimap();
    }, { passive: false });

    viewport.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      hidePicker();
      var edgePath = ev.target.closest('[data-exp-edge]');
      if (edgePath) {
        openEdgeContextMenu(ev.clientX, ev.clientY, edgePath.getAttribute('data-exp-edge'));
        return;
      }
      var ixRow = ev.target.closest('[data-exp-interaction]');
      if (ixRow) {
        openInteractionContextMenu(
          ev.clientX,
          ev.clientY,
          ixRow.getAttribute('data-exp-scene'),
          ixRow.getAttribute('data-exp-interaction')
        );
        return;
      }
      var card = ev.target.closest('[data-exp-node]');
      if (card) {
        openNodeContextMenu(ev.clientX, ev.clientY, card.getAttribute('data-exp-node'));
        return;
      }
      var worldPt = clientToWorld(ev.clientX, ev.clientY);
      openCreateMenu(worldPt, null, { x: ev.clientX, y: ev.clientY }, 'Crear nuevo');
    });

    viewport.addEventListener('pointerdown', function (ev) {
      if (ev.button === 2) return;
      try { viewport.focus({ preventScroll: true }); } catch (ef) { try { viewport.focus(); } catch (ef2) {} }
      hideCtx();
      hidePicker();
      var tool = canvas().tool || 'select';
      var edgePath = ev.target.closest('[data-exp-edge]');

      if (tool === 'cut' && edgePath) {
        ExperienciaEngine.removeEdge(state, edgePath.getAttribute('data-exp-edge'));
        hoverCutEdgeId = null;
        renderAll(); persist();
        return;
      }

      if (edgePath && tool !== 'cut') {
        selectEdge(edgePath.getAttribute('data-exp-edge'));
        return;
      }

      var heroSlot = ev.target.closest('[data-exp-hero-slot]');
      if (heroSlot && tool === 'select') {
        ev.stopPropagation();
        selectNode('exp-hero');
        var slotId = heroSlot.getAttribute('data-exp-hero-slot');
        var field = heroSlot.getAttribute('data-slot-field');
        if ((slotId === 'hero-share' || slotId === 'hero-fullscreen') && field &&
            ev.target.closest('.builder-exp-card__badge')) {
          var hc = ExperienciaEngine.ensureHeroContent(state);
          ExperienciaEngine.setHeroContentField(state, field, !(hc[field] !== false));
          ExperienciaEngine.ensureFlow(state);
          renderAll(); persist();
          return;
        }
        if (slotId === 'nav' || slotId === 'hero-explorar') {
          return;
        }
        if (slotId === 'hero-whatsapp') {
          return;
        }
        return;
      }

      /* Interaction row (not the port circle): select interaction, don't start card drag */
      var ixHit = ev.target.closest('[data-exp-interaction]');
      if (ixHit && tool === 'select' && !ev.target.closest('[data-exp-port]')) {
        ev.stopPropagation();
        selectInteraction(
          ixHit.getAttribute('data-exp-scene'),
          ixHit.getAttribute('data-exp-interaction')
        );
        return;
      }

      var addElBtn = ev.target.closest('[data-exp-add-element]');
      if (addElBtn && tool === 'select') {
        ev.stopPropagation();
        ev.preventDefault();
        openAddElementMenu(
          addElBtn.getAttribute('data-exp-add-element'),
          { x: ev.clientX, y: ev.clientY }
        );
        return;
      }

      var port = ev.target.closest('[data-exp-port="out"]');
      if (!port) {
        var irow = ev.target.closest('[data-exp-irow]');
        if (irow) port = irow.querySelector('[data-exp-port="out"]');
      }
      var card = ev.target.closest('[data-exp-node]');

      if (port && tool !== 'cut') {
        ev.preventDefault();
        ev.stopPropagation();
        var fromId = port.getAttribute('data-node');
        var portId = port.getAttribute('data-port-id') || 'out';
        var portLabel = port.getAttribute('data-port-label') || '';
        var srcNode = ExperienciaEngine.getNode(state, fromId);
        if (!portLabel && srcNode && ExperienciaEngine.resolvePortLabel) {
          portLabel = ExperienciaEngine.resolvePortLabel(srcNode, portId);
        }
        var startAnchor = resolvePortAnchor(srcNode || { id: fromId, x: 0, y: 0, ports: [] }, portId, 'out');
        linkDrag = {
          fromId: fromId,
          portId: portId,
          portLabel: portLabel,
          interactionId: port.getAttribute('data-interaction-id') || null,
          x: startAnchor.x,
          y: startAnchor.y,
          pointerId: ev.pointerId
        };
        ExperienciaEngine.setSelection(state, [], []);
        paintNodes();
        paintInspector();
        try { viewport.setPointerCapture(ev.pointerId); } catch (e0) {}
        paintEdges();
        return;
      }

      if (ev.target.closest('[data-exp-rename-input]') ||
          ev.target.closest('[data-exp-card-title]')) {
        /* Título: seleccionar sin iniciar drag (doble clic = rename) */
        var titleEl = ev.target.closest('[data-exp-card-title], [data-exp-rename-input]');
        var titleCard = titleEl && titleEl.closest('[data-exp-node]');
        if (titleCard && tool === 'select') {
          ev.stopPropagation();
          selectNode(titleCard.getAttribute('data-exp-node'));
        }
        return;
      }

      if (card && tool === 'select') {
        var nodeId = card.getAttribute('data-exp-node');
        var n = ExperienciaEngine.getNode(state, nodeId);
        if (!n) return;
        if (ev.shiftKey) {
          selectNode(nodeId, { toggle: true });
        } else {
          var already = selectedIds().indexOf(nodeId) >= 0 && selectedIds().length > 1;
          if (!already) selectNode(nodeId);
          else {
            /* keep multi-selection; make this the primary */
            canvas().selectedId = nodeId;
            paintNodes();
            paintInspector();
          }
        }
        if (ev.detail === 2 && (n.kind === 'structure' || n.kind === 'group' || (n.config && n.config.group))) {
          ExperienciaEngine.enterGroup(state, n.id);
          renderAll(); persist();
          return;
        }
        if (ExperienciaEngine.isLockedNode(n) && selectedIds().length === 1) {
          return; /* locked single: no drag */
        }
        var worldPt = clientToWorld(ev.clientX, ev.clientY);
        var moveIds = selectedIds().filter(function (id) {
          var nn = ExperienciaEngine.getNode(state, id);
          return nn && !ExperienciaEngine.isLockedNode(nn);
        });
        if (!moveIds.length) return;
        var origins = {};
        moveIds.forEach(function (id) {
          var nn = ExperienciaEngine.getNode(state, id);
          origins[id] = { x: nn.x || 0, y: nn.y || 0 };
        });
        dragging = {
          ids: moveIds,
          origins: origins,
          startX: worldPt.x,
          startY: worldPt.y,
          pointerId: ev.pointerId
        };
        try { viewport.setPointerCapture(ev.pointerId); } catch (e1) {}
        return;
      }

      if (!card) {
        if (spacePan || ev.button === 1 || ev.altKey) {
          panning = {
            x: ev.clientX,
            y: ev.clientY,
            panX: canvas().panX,
            panY: canvas().panY,
            pointerId: ev.pointerId
          };
          try { viewport.setPointerCapture(ev.pointerId); } catch (e2) {}
          return;
        }
        if (tool === 'select') {
          var w0 = clientToWorld(ev.clientX, ev.clientY);
          marquee = {
            x0: w0.x, y0: w0.y, x1: w0.x, y1: w0.y,
            shift: !!ev.shiftKey,
            pointerId: ev.pointerId,
            moved: false
          };
          updateMarqueeVisual();
          try { viewport.setPointerCapture(ev.pointerId); } catch (e3) {}
        }
      }
    });

    viewport.addEventListener('pointermove', function (ev) {
      if (canvas().tool === 'cut') {
        var hit = ev.target.closest ? ev.target.closest('[data-exp-edge]') : null;
        var nextHover = hit ? hit.getAttribute('data-exp-edge') : null;
        if (nextHover !== hoverCutEdgeId) {
          hoverCutEdgeId = nextHover;
          paintEdges();
        }
      }
      if (linkDrag) {
        var w = clientToWorld(ev.clientX, ev.clientY);
        linkDrag.x = w.x;
        linkDrag.y = w.y;
        paintEdges();
        return;
      }
      if (dragging) {
        var wpt = clientToWorld(ev.clientX, ev.clientY);
        var dx = wpt.x - dragging.startX;
        var dy = wpt.y - dragging.startY;
        dragging.ids.forEach(function (id) {
          var o = dragging.origins[id];
          ExperienciaEngine.setNodePosition(state, id, o.x + dx, o.y + dy, true);
          var el = nodesEl.querySelector('[data-exp-node="' + id + '"]');
          var n = ExperienciaEngine.getNode(state, id);
          if (el && n) el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
        });
        paintEdges();
        paintMinimap();
        return;
      }
      if (marquee) {
        var wm = clientToWorld(ev.clientX, ev.clientY);
        marquee.x1 = wm.x;
        marquee.y1 = wm.y;
        if (Math.abs(marquee.x1 - marquee.x0) > 3 || Math.abs(marquee.y1 - marquee.y0) > 3) {
          marquee.moved = true;
        }
        updateMarqueeVisual();
        return;
      }
      if (panning) {
        canvas().panX = panning.panX + (ev.clientX - panning.x);
        canvas().panY = panning.panY + (ev.clientY - panning.y);
        applyWorldTransform();
        paintMinimap();
      }
    });

    function endPointer(ev) {
      if (linkDrag) {
        var targetPort = document.elementFromPoint(ev.clientX, ev.clientY);
        var inPort = targetPort && targetPort.closest ? targetPort.closest('[data-exp-port="in"]') : null;
        var targetCard = targetPort && targetPort.closest ? targetPort.closest('[data-exp-node]') : null;
        if (inPort || targetCard) {
          var toId = (inPort && inPort.getAttribute('data-node')) ||
            (targetCard && targetCard.getAttribute('data-exp-node'));
          var targetPortId = (inPort && inPort.getAttribute('data-port-id')) || 'in';
          if (toId && toId !== linkDrag.fromId) {
            ExperienciaEngine.addManualEdge(
              state,
              linkDrag.fromId,
              toId,
              linkDrag.portLabel || 'flujo',
              linkDrag.portId,
              targetPortId
            );
            linkDrag = null;
            renderAll(); persist();
            return;
          }
        }
        var drop = clientToWorld(ev.clientX, ev.clientY);
        openCreateMenu(drop, {
          fromId: linkDrag.fromId,
          portId: linkDrag.portId,
          portLabel: linkDrag.portLabel,
          sourcePortId: linkDrag.portId,
          targetPortId: 'in',
          fromInteraction: !!(linkDrag.interactionId ||
            (linkDrag.portId && linkDrag.portId !== 'out' &&
              linkDrag.portId !== 'on-end' && linkDrag.portId !== 'hero-iniciar'))
        }, { x: ev.clientX, y: ev.clientY });
        linkDrag = null;
        paintNodes();
        paintEdges();
        return;
      }
      if (marquee) {
        if (marquee.moved) {
          var hitIds = nodesInMarquee();
          if (marquee.shift) {
            var merged = selectedIds().slice();
            hitIds.forEach(function (id) {
              if (merged.indexOf(id) < 0) merged.push(id);
            });
            ExperienciaEngine.setSelection(state, merged, []);
          } else {
            ExperienciaEngine.setSelection(state, hitIds, []);
          }
          if (hitIds.length) openPropertiesRail();
        } else if (!marquee.shift) {
          ExperienciaEngine.clearSelection(state);
        }
        marquee = null;
        updateMarqueeVisual();
        renderAll(); persist();
        return;
      }
      if (dragging) { dragging = null; persist(); }
      if (panning) { panning = null; persist(); }
    }
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    function onKeyDown(ev) {
      if (ev.code === 'Space') {
        if (!isFormField(ev.target) && !renameEdit) spacePan = true;
      }
      /* V6.1.05 — arrow nudge in BOTONES (1 / 10 / 0.5 px) */
      if (canvas().editMode === 'buttons' && !isFormField(ev.target) && !renameEdit) {
        var arrow = ev.key;
        if (arrow === 'ArrowUp' || arrow === 'ArrowDown' ||
            arrow === 'ArrowLeft' || arrow === 'ArrowRight') {
          var step = ev.altKey ? 0.5 : (ev.shiftKey ? 10 : 1);
          var ndx = 0;
          var ndy = 0;
          if (arrow === 'ArrowLeft') ndx = -step;
          else if (arrow === 'ArrowRight') ndx = step;
          else if (arrow === 'ArrowUp') ndy = -step;
          else if (arrow === 'ArrowDown') ndy = step;
          if (nudgeSelectedButtons(ndx, ndy)) {
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
        }
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        var key = String(ev.key || '').toLowerCase();
        if (key === 'z' || key === 'y') {
          if (isFormField(ev.target) || renameEdit) return;
          if (canvas().editMode === 'buttons') {
            ev.preventDefault();
            var ok = false;
            if (key === 'y' || (key === 'z' && ev.shiftKey)) ok = redoButtonEdit();
            else ok = undoButtonEdit();
            if (ok) {
              renderAll();
              persist();
            }
            return;
          }
        }
        if (key === 'c' || key === 'v') {
          if (isFormField(ev.target) || renameEdit) return;
          var inScope = viewport === document.activeElement ||
            rootEl.contains(document.activeElement) || rootEl.contains(ev.target) ||
            (stage && stage.contains(ev.target));
          if (!inScope && document.activeElement !== document.body) return;

          /* V6.1.06 — button clipboard in BOTONES mode */
          if (canvas().editMode === 'buttons') {
            if (key === 'c') {
              if (!copySelectedButtons()) return;
              ev.preventDefault();
              return;
            }
            if (key === 'v') {
              if (!pasteCopiedButtons()) return;
              ev.preventDefault();
              return;
            }
          }

          if (key === 'c') {
            var copyIds = selectedIds();
            if (!copyIds.length) return;
            ev.preventDefault();
            var copied = ExperienciaEngine.copySelection(state, copyIds);
            if (copied && typeof AdminNotify !== 'undefined') {
              AdminNotify.success('Copiado: ' + copied.nodeCount + ' nodo(s), ' +
                copied.edgeCount + ' conexión(es) internas');
            }
            return;
          }
          if (key === 'v') {
            if (!ExperienciaEngine.hasClipboard || !ExperienciaEngine.hasClipboard()) return;
            ev.preventDefault();
            var pasted = ExperienciaEngine.pasteClipboard(state);
            if (pasted && pasted.nodes && pasted.nodes.length) {
              var pastedIds = pasted.nodes.map(function (n) { return n.id; });
              ExperienciaEngine.setSelection(state, pastedIds, []);
              openPropertiesRail();
              renderAll(); persist();
              if (typeof AdminNotify !== 'undefined') {
                AdminNotify.success('Pegado: ' + pastedIds.length + ' nodo(s)');
              }
            }
            return;
          }
        }
      }
      if (ev.key === 'Escape') {
        if (renameEdit) {
          finishInlineRename(false);
          return;
        }
        if (canvas().editMode === 'hotspots' && hotspotDraw) {
          ev.preventDefault();
          hotspotDraw = null;
          paintHotspotsStage();
          paintInspector();
          return;
        }
        /* Quotation overlay: chrome owns dialog / inspector / deselect layers. */
        if (overlayMode) return;
        if (modalEl && !modalEl.hidden) {
          modalEl.hidden = true;
          modalEl.innerHTML = '';
          return;
        }
        if (ctxMode || (ctxEl && !ctxEl.hidden)) { hideCtx(); return; }
        if (canvas().tool === 'cut') {
          canvas().tool = 'select';
          hoverCutEdgeId = null;
          syncToolUi(); persist();
          return;
        }
        if (marquee) {
          marquee = null;
          updateMarqueeVisual();
          return;
        }
        clearAllSelection();
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        if (isFormField(ev.target)) return;
        if (renameEdit) return;
        var ae = document.activeElement;
        var inCanvas = viewport === ae || rootEl.contains(ae) || rootEl.contains(ev.target);
        /* Overlay: Delete must work even when focus is on dock / body. */
        if (!overlayMode && !inCanvas) return;

        /* V6.2.00 — HOTSPOTS: delete selected mask (or vertex with Alt) */
        if (canvas().editMode === 'hotspots') {
          var hsId = canvas().selectedHotspotId;
          if (!hsId) return;
          ev.preventDefault();
          ev.stopPropagation();
          var sceneHs = canvas().selectedId;
          if (!sceneHs) return;
          if (ev.altKey) {
            var mask = ExperienciaEngine.getSceneHotspotMask(state,
              ExperienciaEngine.getNode(state, sceneHs), hsId);
            if (mask && mask.polygon && mask.polygon.length > 3) {
              ExperienciaEngine.removeHotspotVertex(
                state, sceneHs, hsId, mask.polygon.length - 1
              );
              paintHotspotsStage();
              paintInspector();
              persist();
            }
            return;
          }
          ExperienciaEngine.removeSceneHotspotMask(state, sceneHs, hsId);
          canvas().selectedHotspotId = null;
          renderAll();
          persist();
          return;
        }

        /* V6.1.04 — in BOTONES mode, Delete never removes the scene node */
        if (canvas().editMode === 'buttons') {
          var btnIds = Array.isArray(canvas().selectedButtonIds)
            ? canvas().selectedButtonIds.slice()
            : [];
          if (!btnIds.length && canvas().selectedButtonId) {
            btnIds = [canvas().selectedButtonId];
          }
          if (!btnIds.length) return;
          ev.preventDefault();
          ev.stopPropagation();
          var sceneIdDel = canvas().selectedId;
          if (!sceneIdDel) return;
          pushButtonHistory(sceneIdDel);
          btnIds.forEach(function (bid) {
            ExperienciaEngine.removeSceneButton(state, sceneIdDel, bid);
          });
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
          renderAll();
          persist();
          return;
        }

        if (overlayMode) return;

        if (!selectedIds().length && !canvas().selectedEdgeId &&
          !(canvas().selectedEdgeIds || []).length) return;
        ev.preventDefault();
        boxiesConfirm({
          title: 'Eliminar del flujo',
          message: selectedIds().length > 1
            ? '¿Eliminar ' + selectedIds().length + ' nodos del flujo? (no borra media/assets)'
            : '¿Eliminar este nodo del flujo? (no borra media/assets)',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar'
        }).then(function (ok) {
          if (!ok) return;
          deleteSelection();
        });
      }
    }
    function onKeyUp(ev) {
      if (ev.code === 'Space') spacePan = false;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown' ||
          ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' ||
          ev.key === 'Alt' || ev.key === 'Shift') {
        finishButtonNudge();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.addEventListener('pointerdown', function (ev) {
      if (!ctxEl || ctxEl.hidden) return;
      if (ctxEl.contains(ev.target)) return;
      hideCtx();
    }, true);

    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', function (ev) {
        var nodes = ExperienciaEngine.visibleNodes(state);
        var b = ExperienciaEngine.bounds(nodes);
        var rect = minimapCanvas.getBoundingClientRect();
        var cw = minimapCanvas.width;
        var ch = minimapCanvas.height;
        var spanX = Math.max(1, b.maxX - b.minX);
        var spanY = Math.max(1, b.maxY - b.minY);
        var scale = Math.min(cw / spanX, ch / spanY) * 0.85;
        var ox = (cw - spanX * scale) / 2;
        var oy = (ch - spanY * scale) / 2;
        var mx = ((ev.clientX - rect.left) * (cw / rect.width) - ox) / scale + b.minX;
        var my = ((ev.clientY - rect.top) * (ch / rect.height) - oy) / scale + b.minY;
        var vr = viewport.getBoundingClientRect();
        var z = canvas().zoom || 1;
        canvas().panX = vr.width / 2 - mx * z;
        canvas().panY = vr.height / 2 - my * z;
        renderAll(); persist();
      });
    }

    function onViewportResize() {
      recomputeOverlayLayout();
    }
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(onViewportResize);
      ro.observe(viewport);
      if (stage) ro.observe(stage);
      if (workspace) ro.observe(workspace);
      if (buttonsStage) ro.observe(buttonsStage);
      if (buttonsFrame) ro.observe(buttonsFrame);
      if (hotspotsStage) ro.observe(hotspotsStage);
      if (hotspotsFrame) ro.observe(hotspotsFrame);
      if (protoStage) ro.observe(protoStage);
    }
    window.addEventListener('resize', onViewportResize);
    document.addEventListener('fullscreenchange', onViewportResize);
    window.addEventListener('boxies:rail-toggle', onViewportResize);

    renderAll();

    /* V6.5.01 — offer restore if a richer snapshot exists (full Experiencia only).
     * V7.2.44 — Quotation Builder overlay must never show flow-recovery modal. */
    if (!overlayMode && typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.checkAndOfferRecovery) {
      ExperienciaSnapshot.checkAndOfferRecovery(state, {
        host: workspace || rootEl || document.body
      }).then(function (res) {
        if (res && res.action === 'restore') {
          renderAll();
          fitView();
          if (api.saveState) api.saveState();
          else persist();
        } else if (res && res.action === 'duplicate') {
          if (api.saveState) api.saveState();
        }
      });
    }

    function showResetConfirm() {
      boxiesConfirm({
        title: '¿Reiniciar flujo?',
        message: 'Se eliminarán del canvas todas las escenas, animaciones, conexiones y elementos de Experiencia. El Hero se conservará. Los archivos del proyecto (projectAssets) no se eliminan.',
        confirmLabel: 'Reiniciar flujo',
        cancelLabel: 'Cancelar'
      }).then(function (ok) {
        if (!ok) return;
        ExperienciaEngine.resetFlow(state);
        renderAll();
        fitView();
        if (api.saveState) api.saveState();
        else persist();
        if (typeof AdminNotify !== 'undefined') {
          AdminNotify.success('Flujo reiniciado. Solo queda el Hero.');
        }
      });
    }

    function saveDraft() {
      if (ExperienciaEngine.markExperienciaSaved) {
        ExperienciaEngine.markExperienciaSaved(state);
      } else if (typeof ExperienciaSnapshot !== 'undefined' && ExperienciaSnapshot.capture) {
        ExperienciaSnapshot.capture(state, 'saveDraft', 'save');
      }
      if (api.saveState) api.saveState();
      else if (api.onChange) api.onChange();
      else if (typeof BuilderSession !== 'undefined') BuilderSession.save(state);
      renderAll();
      if (typeof AdminNotify !== 'undefined') {
        AdminNotify.success('Borrador de Experiencia guardado.');
      }
    }

    function showTemplateModal() {
      if (!modalEl) return;
      var analysis = ExperienciaEngine.analyzeStructureForFlow
        ? ExperienciaEngine.analyzeStructureForFlow(state)
        : { summary: {}, recommended: 'simple', stages: [], components: [] };
      var s = analysis.summary || {};
      var rec = analysis.recommended || 'simple';
      function tplCard(id, title, desc) {
        var isRec = id === rec;
        return '<button type="button" class="builder-exp-tpl-card' + (isRec ? ' is-recommended' : '') +
          '" data-exp-tpl="' + esc(id) + '">' +
          '<strong>' + esc(title) +
          (isRec ? ' <span class="builder-exp-tpl-card__badge">RECOMENDADO</span>' : '') +
          '</strong>' +
          '<span>' + esc(desc) + '</span>' +
        '</button>';
      }
      modalEl.hidden = false;
      modalEl.innerHTML =
        '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
        '<div class="builder-exp-modal__panel builder-exp-modal__panel--wide" role="dialog">' +
          '<h3 class="builder-exp-modal__title">Crear flujo base</h3>' +
          '<p class="builder-exp-modal__body"><strong>Estructura detectada</strong><br>' +
            esc(String(s.stages || 0)) + ' etapas · ' +
            esc(String(s.components || 0)) + ' componentes · ' +
            esc(String(s.units || 0)) + ' viviendas · ' +
            esc(String(s.tipologias || 0)) + ' tipologías' +
          '</p>' +
          '<p class="builder-exp-modal__body">¿Cómo quieres organizar la experiencia?</p>' +
          '<div class="builder-exp-tpl-grid">' +
            tplCard('simple', 'Recorrido simple',
              'Una entrada principal y recorrido completamente libre.') +
            tplCard('components', 'Por componentes',
              'Vista general del proyecto y una rama inicial por componente relevante.') +
            tplCard('stages', 'Por etapas',
              'Vista general del proyecto y una rama inicial por cada etapa.') +
            tplCard('empty', 'Empezar vacío',
              'Crear únicamente Hero.') +
          '</div>' +
          '<div class="builder-exp-modal__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cancelar</button>' +
          '</div>' +
        '</div>';

      function close() {
        modalEl.hidden = true;
        modalEl.innerHTML = '';
      }
      modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
        btn.addEventListener('click', close);
      });
      modalEl.querySelectorAll('[data-exp-tpl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tid = btn.getAttribute('data-exp-tpl');
          close();
          function run() {
            var result = ExperienciaEngine.applyFlowTemplate(state, tid);
            persist();
            fitViewAfterTemplate();
            if (typeof AdminNotify !== 'undefined') {
              var msg = 'Flujo base aplicado (' + tid + ').';
              if (result && result.warning) msg += ' ' + result.warning;
              AdminNotify.success(msg);
            }
          }
          if (tid === 'empty') {
            boxiesConfirm({
              title: '¿Empezar vacío?',
              message: 'Se eliminará el flujo editable y quedará solo el Hero. projectAssets no se borran.',
              confirmLabel: 'Empezar vacío',
              cancelLabel: 'Cancelar'
            }).then(function (ok) { if (ok) run(); });
            return;
          }
          var nonHero = (state.experiencia.nodes || []).filter(function (n) {
            return n && n.kind !== 'hero' && n.id !== 'exp-hero';
          }).length;
          if (nonHero > 0) {
            boxiesConfirm({
              title: 'Aplicar plantilla',
              message: 'Se conservarán nodos existentes. Se añadirá o reutilizará el tramo Hero→Intro→Vista y las ramas estructurales faltantes. No se borran recorridos manuales.',
              confirmLabel: 'Aplicar',
              cancelLabel: 'Cancelar'
            }).then(function (ok) { if (ok) run(); });
            return;
          }
          run();
        });
      });
    }

    function showStructureReviewModal() {
      if (!modalEl) return;
      var diff = ExperienciaEngine.diffStructureVsFlow
        ? ExperienciaEngine.diffStructureVsFlow(state)
        : { changes: [], hasBaseline: false };
      var analysis = ExperienciaEngine.analyzeStructureForFlow
        ? ExperienciaEngine.analyzeStructureForFlow(state)
        : { summary: {} };
      var s = analysis.summary || {};
      var listHtml = (diff.changes || []).length
        ? ('<ul class="builder-exp-inspector__list">' +
          diff.changes.map(function (c) {
            return '<li>' + esc(c.message || '') + '</li>';
          }).join('') + '</ul>')
        : '<p class="builder-exp-modal__body">Sin diferencias detectadas respecto a la última huella.</p>';

      modalEl.hidden = false;
      modalEl.innerHTML =
        '<div class="builder-exp-modal__backdrop" data-exp-modal-cancel></div>' +
        '<div class="builder-exp-modal__panel builder-exp-modal__panel--wide" role="dialog">' +
          '<h3 class="builder-exp-modal__title">Estructura actualizada</h3>' +
          '<p class="builder-exp-modal__body">' +
            esc(String(s.stages || 0)) + ' etapas · ' +
            esc(String(s.components || 0)) + ' componentes · ' +
            esc(String(s.units || 0)) + ' viviendas' +
          '</p>' +
          listHtml +
          '<div class="builder-exp-modal__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-modal-cancel>Cerrar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-primary" data-exp-struct-sync>Sincronizar</button>' +
          '</div>' +
        '</div>';

      function close() {
        modalEl.hidden = true;
        modalEl.innerHTML = '';
      }
      modalEl.querySelectorAll('[data-exp-modal-cancel]').forEach(function (btn) {
        btn.addEventListener('click', close);
      });
      var syncBtn = modalEl.querySelector('[data-exp-struct-sync]');
      if (syncBtn) {
        syncBtn.addEventListener('click', function () {
          var res = ExperienciaEngine.syncStructureRefs(state);
          close();
          renderAll();
          persist();
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.success('Sincronizado con Estructura (' +
              ((res && res.updated) || 0) + ' refs). Recorridos manuales conservados.');
          }
        });
      }
    }

    /* Chrome actions */
    var draftBtn = rootEl.querySelector('#builderExpDraftBtn');
    if (draftBtn) {
      draftBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        saveDraft();
      });
    }
    var resetBtn = rootEl.querySelector('#builderExpResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showResetConfirm();
      });
    }
    var resyncBtn = rootEl.querySelector('#builderExpResyncBtn');
    if (resyncBtn) {
      resyncBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (ExperienciaEngine.syncHeroOnly) ExperienciaEngine.syncHeroOnly(state);
        else ExperienciaEngine.ensureFlow(state);
        renderAll();
        persist();
        if (typeof AdminNotify !== 'undefined') {
          AdminNotify.success('Hero sincronizado desde la sección Hero.');
        }
      });
    }
    var tplBtn = rootEl.querySelector('#builderExpTemplateBtn');
    if (tplBtn) {
      tplBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showTemplateModal();
      });
    }
    var structBtn = rootEl.querySelector('#builderExpStructReviewBtn');
    if (structBtn) {
      structBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        showStructureReviewModal();
      });
    }

    if (nodesEl) {
      nodesEl.addEventListener('dblclick', function (ev) {
        var title = ev.target.closest('[data-exp-card-title]');
        if (!title) return;
        ev.preventDefault();
        ev.stopPropagation();
        var nid = title.getAttribute('data-exp-card-title');
        startInlineRename(nid);
      });
    }

    requestAnimationFrame(function () {
      if (isCanvasMode()) {
        document.body.classList.add('boxies-exp-canvas-mode');
        document.documentElement.classList.add('boxies-exp-canvas-mode');
        document.documentElement.style.setProperty('--boxies-sidebar-w', '0px');
        document.documentElement.style.setProperty('--boxies-header-h', '0px');
        document.documentElement.style.setProperty('--boxies-dock-h', '0px');
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(true);
        } else {
          document.body.classList.add('boxies-rail-collapsed');
          document.documentElement.style.setProperty('--builder-rail-width', '0px');
        }
        removeLeftRailFloat();
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.expand) {
          BuilderPropertiesRail.expand(state);
        } else if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.applyCollapsed) {
          BuilderPropertiesRail.applyCollapsed(false, { state: state });
        }
        enterBrowserFullscreen();
      }
      syncFocusFullscreenBtn();
      if (canvas().panX === 40 && canvas().panY === 40) fitView();
      else onViewportResize();
    });

    function onPropsRailToggle(ev) {
      var collapsed = !!(ev && ev.detail && ev.detail.collapsed);
      canvas().inspectorOpen = true;
      canvas().inspectorCollapsed = collapsed;
      persist();
      requestAnimationFrame(function () { onViewportResize(); });
    }
    window.addEventListener('boxies:props-rail-toggle', onPropsRailToggle);

    syncInspectorChrome();
    paintInspector();

    return {
      refresh: renderAll,
      fitView: fitView,
      toggleCanvasMode: toggleCanvasMode,
      saveDraft: saveDraft,
      showResetConfirm: showResetConfirm,
      setEditMode: function (mode) {
        if (mode !== 'buttons' && mode !== 'hotspots') return;
        canvas().editMode = mode;
        if (mode === 'buttons') {
          hotspotDraw = null;
          canvas().selectedHotspotId = null;
        } else {
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        }
        renderAll();
        paintInspector();
        requestAnimationFrame(recomputeOverlayLayout);
      },
      addButton: function () {
        var sceneId = canvas().selectedId;
        if (!sceneId) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var btn = ExperienciaEngine.addSceneButton(state, sceneId);
        if (btn) {
          canvas().selectedButtonId = btn.id;
          canvas().selectedButtonIds = [String(btn.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return btn;
      },
      addText: function () {
        var sceneId = canvas().selectedId;
        if (!sceneId || !ExperienciaEngine.addSceneText) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var el = ExperienciaEngine.addSceneText(state, sceneId);
        if (el) {
          canvas().selectedButtonId = el.id;
          canvas().selectedButtonIds = [String(el.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return el;
      },
      addShape: function (kind) {
        var sceneId = canvas().selectedId;
        if (!sceneId || !ExperienciaEngine.addSceneShape) return null;
        canvas().editMode = 'buttons';
        hotspotDraw = null;
        var el = ExperienciaEngine.addSceneShape(state, sceneId, kind);
        if (el) {
          canvas().selectedButtonId = el.id;
          canvas().selectedButtonIds = [String(el.id)];
        }
        renderAll();
        paintInspector();
        persist();
        requestAnimationFrame(recomputeOverlayLayout);
        return el;
      },
      getSelection: function () {
        var ids = Array.isArray(canvas().selectedButtonIds)
          ? canvas().selectedButtonIds.map(String)
          : [];
        if (!ids.length && canvas().selectedButtonId) {
          ids = [String(canvas().selectedButtonId)];
        }
        return {
          buttonIds: ids,
          buttonId: canvas().selectedButtonId || null,
          hotspotId: canvas().selectedHotspotId || null,
          hasSelection: !!(ids.length || canvas().selectedHotspotId)
        };
      },
      duplicateSelected: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id || !ExperienciaEngine.duplicateSceneButton) return null;
        var layerW = (buttonsLayer && buttonsLayer.clientWidth) || 1000;
        var layerH = (buttonsLayer && buttonsLayer.clientHeight) || 1000;
        var copy = ExperienciaEngine.duplicateSceneButton(state, sceneId, id, {
          imageW: layerW,
          imageH: layerH
        });
        if (copy) {
          canvas().selectedButtonId = copy.id;
          canvas().selectedButtonIds = [String(copy.id)];
        }
        renderAll();
        paintInspector();
        persist();
        return copy;
      },
      deleteSelected: function () {
        var sceneId = canvas().selectedId;
        var hs = canvas().selectedHotspotId;
        var ids = Array.isArray(canvas().selectedButtonIds)
          ? canvas().selectedButtonIds.slice()
          : [];
        if (!ids.length && canvas().selectedButtonId) {
          ids = [canvas().selectedButtonId];
        }
        if (!sceneId) return false;
        if (hs && ExperienciaEngine.removeSceneHotspotMask) {
          ExperienciaEngine.removeSceneHotspotMask(state, sceneId, hs);
          canvas().selectedHotspotId = null;
        } else if (ids.length && ExperienciaEngine.removeSceneButton) {
          pushButtonHistory(sceneId);
          ids.forEach(function (bid) {
            ExperienciaEngine.removeSceneButton(state, sceneId, bid);
          });
          canvas().selectedButtonId = null;
          canvas().selectedButtonIds = [];
        } else {
          return false;
        }
        renderAll();
        paintInspector();
        persist();
        return true;
      },
      clearSelection: function () {
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        canvas().selectedHotspotId = null;
        renderAll();
        paintInspector();
        return true;
      },
      cancelActiveTool: function () {
        if (!hotspotDraw) return false;
        hotspotDraw = null;
        paintHotspotsStage();
        paintInspector();
        return true;
      },
      toggleLockSelected: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id) return null;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), id);
        if (!btn) return null;
        var next = !btn.locked;
        ExperienciaEngine.updateSceneButton(state, sceneId, id, { locked: next });
        renderAll();
        paintInspector();
        persist();
        return next;
      },
      bringSelectedToFront: function () {
        var sceneId = canvas().selectedId;
        var id = canvas().selectedButtonId;
        if (!sceneId || !id || !ExperienciaEngine.bringSceneOverlayToFront) return null;
        var res = ExperienciaEngine.bringSceneOverlayToFront(state, sceneId, id);
        renderAll();
        paintInspector();
        persist();
        return res;
      },
      startHotspotDraw: function () {
        canvas().editMode = 'hotspots';
        canvas().selectedButtonId = null;
        canvas().selectedButtonIds = [];
        canvas().selectedHotspotId = null;
        hotspotDraw = { points: [], cursor: null };
        renderAll();
        paintHotspotsStage();
        paintInspector();
        requestAnimationFrame(recomputeOverlayLayout);
        if (typeof AdminNotify !== 'undefined' && AdminNotify.info) {
          AdminNotify.info('Dibujo: clic para vértices · doble clic para cerrar · Esc cancela');
        }
      },
      setInspectorBody: function (el) {
        inspectorBody = el || null;
        paintInspector();
      },
      destroy: function () {
        window.removeEventListener('boxies:props-rail-toggle', onPropsRailToggle);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        if (protoRuntimePlayer && protoRuntimePlayer.destroy) {
          try { protoRuntimePlayer.destroy(); } catch (eProto) {}
          protoRuntimePlayer = null;
        }
        if (isCanvasMode()) {
          setCanvasMode(false, null);
          document.documentElement.style.removeProperty('--boxies-sidebar-w');
          document.documentElement.style.removeProperty('--boxies-header-h');
          document.documentElement.style.removeProperty('--boxies-dock-h');
        }
        /*
         * V7.2.20 — Never exit document fullscreen from canvas/overlay teardown.
         * Workspace FS is owned by BoxiesShell (documentElement). Editor remounts
         * (add button, inspector, library, step change) destroy this handle often;
         * exiting FS here broke the entire editing session.
         */
      }
    };
  }

  /**
   * Mount Showroom BOTONES/HOTSPOTS editor onto an external host (Quotation Canvas).
   * Reuses ExperienciaCanvas.mount — does not reimplement interaction logic.
   *
   * options:
   *   state — builder-like state with experiencia.nodes / canvas
   *   overlayNodeId — image/scene node id to edit
   *   editMode — 'buttons' | 'hotspots'
   *   inspectorBody — DOM node for Showroom inspector HTML
   *   onChange / saveState — same as mount api
   */
  function mountOverlay(hostEl, options) {
    options = options || {};
    if (!hostEl || !options.state) return null;
    hostEl.innerHTML = overlayShellHtml();
    var handle = mount(hostEl, options.state, {
      overlayMode: true,
      overlayNodeId: options.overlayNodeId || null,
      editMode: options.editMode || 'buttons',
      inspectorBody: options.inspectorBody || null,
      onChange: options.onChange,
      onSelectionChange: options.onSelectionChange,
      saveState: options.saveState
    });
    if (handle) {
      requestAnimationFrame(function () {
        if (handle.refresh) handle.refresh();
      });
    }
    return handle;
  }

  return {
    shellHtml: shellHtml,
    overlayShellHtml: overlayShellHtml,
    actionsHtml: actionsHtml,
    mount: mount,
    mountOverlay: mountOverlay,
    isCanvasMode: isCanvasMode,
    setCanvasMode: setCanvasMode
  };
})();
