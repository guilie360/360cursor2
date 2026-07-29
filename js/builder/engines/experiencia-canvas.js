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
              return '<div class="builder-exp-card__btn-row">' +
                '<span class="builder-exp-card__btn-check" aria-hidden="true">✓</span>' +
                '<span>' + esc(b.label || 'Botón') + '</span>' +
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

  function buttonPreviewClass(btn) {
    var style = (btn && btn.style) || 'chip';
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

  function buttonsInspectorHtml(state, n) {
    var buttons = ExperienciaEngine.listSceneButtons
      ? ExperienciaEngine.listSceneButtons(state, n)
      : [];
    var selectedBtnId = (state.experiencia && state.experiencia.canvas &&
      state.experiencia.canvas.selectedButtonId) || null;
    var selected = null;
    if (selectedBtnId) {
      for (var i = 0; i < buttons.length; i++) {
        if (String(buttons[i].id) === String(selectedBtnId) ||
            String(buttons[i].portId) === String(selectedBtnId)) {
          selected = buttons[i];
          break;
        }
      }
    }

    var nodes = ((state.experiencia && state.experiencia.nodes) || []).filter(function (node) {
      return node && node.id !== n.id && node.kind !== 'action';
    });
    var destOpts = '<option value="">Sin destino</option>' +
      nodes.map(function (node) {
        return '<option value="' + esc(node.id) + '"' +
          (selected && String(selected.targetNodeId) === String(node.id) ? ' selected' : '') +
          '>' + esc(node.label || node.id) + '</option>';
      }).join('');

    var html = '' +
      '<div class="builder-exp-inspector__kind">BOTONES</div>' +
      '<h3 class="builder-exp-inspector__title">' + esc(n.label || 'Escena') + '</h3>' +
      '<p class="builder-menu-hint" style="margin:0 0 10px">Mismos elementos «Botón / Control» del Canvas. Una sola fuente de verdad.</p>' +
      '<button type="button" class="builder-header-action-btn is-primary builder-exp-btn-add" data-exp-btn-add="' +
        esc(n.id) + '">+ Nuevo botón</button>';

    if (!buttons.length) {
      html += '<p class="builder-menu-hint">No hay botones en esta escena. Crea uno aquí o en FLUJO → Agregar elemento → Botón / Control.</p>';
      return html;
    }

    html += '<div class="builder-exp-inspector__section">Lista</div>' +
      '<div class="builder-exp-btn-list">' +
        buttons.map(function (b) {
          return '<button type="button" class="builder-exp-btn-list__item' +
            (selected && String(selected.id) === String(b.id) ? ' is-selected' : '') +
            (b.visible === false ? ' is-hidden-btn' : '') + '"' +
            ' data-exp-btn-select="' + esc(b.id) + '">' +
            '<span class="builder-exp-btn-list__mark" aria-hidden="true">' +
              (b.visible === false ? '○' : '●') +
            '</span>' +
            '<span>' + esc(b.label || 'Botón') + '</span>' +
          '</button>';
        }).join('') +
      '</div>';

    if (!selected) {
      html += '<p class="builder-menu-hint">Selecciona un botón en la lista o sobre la imagen.</p>';
      return html;
    }

    function styleChip(val, label) {
      return '<button type="button" class="builder-estructura-chip' +
        (selected.style === val ? ' is-on' : '') +
        '" data-exp-btn-style="' + esc(val) + '">' + esc(label) + '</button>';
    }

    var anchors = ExperienciaEngine.BUTTON_ANCHORS || {};
    var anchorLabels = {
      center: 'Centro',
      'top-center': 'Centro superior',
      'bottom-center': 'Centro inferior',
      'center-left': 'Centro izquierda',
      'center-right': 'Centro derecha',
      'top-left': 'Esquina superior izquierda',
      'top-right': 'Esquina superior derecha',
      'bottom-left': 'Esquina inferior izquierda',
      'bottom-right': 'Esquina inferior derecha'
    };
    var anchorOpts = Object.keys(anchors).map(function (key) {
      return '<option value="' + esc(key) + '"' +
        (selected.anchor === key ? ' selected' : '') + '>' +
        esc(anchorLabels[key] || key) + '</option>';
    }).join('');

    var posMode = selected.positionMode === 'anchor' ? 'anchor' : 'free';

    html += '<div class="builder-exp-inspector__section">Propiedades</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Nombre</label>' +
        '<input type="text" data-exp-btn-label maxlength="60" value="' + esc(selected.label || '') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Destino</label>' +
        '<select data-exp-btn-target class="ws-select">' + destOpts + '</select>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Estilo</label>' +
        '<div class="builder-hub-chips" data-exp-btn-styles>' +
          styleChip('chip', 'Chip') +
          styleChip('button', 'Botón') +
          styleChip('icon', 'Icono') +
        '</div>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Color</label>' +
        '<input type="color" data-exp-btn-color value="' +
          esc(selected.color || '#ffffff') + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Icono</label>' +
        '<select data-exp-btn-icon class="ws-select">' +
          '<option value="none"' + (!selected.icon ? ' selected' : '') + '>Ninguno</option>' +
          '<option value="arrow"' + (selected.icon === 'arrow' ? ' selected' : '') + '>Flecha</option>' +
          '<option value="rotate-left"' + (selected.icon === 'rotate-left' ? ' selected' : '') + '>Rotar izquierda</option>' +
          '<option value="rotate-right"' + (selected.icon === 'rotate-right' ? ' selected' : '') + '>Rotar derecha</option>' +
          '<option value="plus"' + (selected.icon === 'plus' ? ' selected' : '') + '>Plus</option>' +
        '</select>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Rotación</label>' +
        '<div class="builder-hub-slider-label">' +
          '<span></span>' +
          '<span data-exp-btn-rot-val>' + esc(String(selected.rotation || 0)) + ' °</span>' +
        '</div>' +
        '<input type="range" min="-360" max="360" step="1" data-exp-btn-rotation value="' +
          esc(String(selected.rotation || 0)) + '">' +
      '</div>' +
      '<label class="builder-exp-inspector__check">' +
        '<input type="checkbox" data-exp-btn-visible' + (selected.visible !== false ? ' checked' : '') + '>' +
        ' Visible</label>' +
      '<div class="builder-exp-inspector__section">Posición</div>' +
      '<div class="builder-hub-chips" data-exp-btn-pos-mode style="margin-bottom:10px">' +
        '<button type="button" class="builder-estructura-chip' + (posMode === 'free' ? ' is-on' : '') +
          '" data-exp-btn-pos-mode="free">Libre</button>' +
        '<button type="button" class="builder-estructura-chip' + (posMode === 'anchor' ? ' is-on' : '') +
          '" data-exp-btn-pos-mode="anchor">Anclas</button>' +
      '</div>';

    if (posMode === 'anchor') {
      html += '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Ancla</label>' +
        '<select data-exp-btn-anchor class="ws-select">' + anchorOpts + '</select>' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Margen X (px)</label>' +
        '<input type="number" data-exp-btn-margin-x min="0" max="400" step="1" value="' +
          esc(String(selected.marginX || 0)) + '">' +
      '</div>' +
      '<div class="builder-field builder-exp-inspector__field">' +
        '<label>Margen Y (px)</label>' +
        '<input type="number" data-exp-btn-margin-y min="0" max="400" step="1" value="' +
          esc(String(selected.marginY || 0)) + '">' +
      '</div>';
    } else {
      html += '<p class="builder-menu-hint">X ' + esc(String(selected.x)) +
        '% · Y ' + esc(String(selected.y)) + '% (arrastre sobre la imagen)</p>';
    }

    html += '<div class="builder-exp-inspector__actions" style="display:flex;flex-direction:column;gap:8px">' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-btn-mirror="' +
          esc(selected.id) + '">Reflejar horizontalmente</button>' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-exp-btn-duplicate="' +
          esc(selected.id) + '">Duplicar</button>' +
        '<button type="button" class="builder-header-action-btn boxies-btn-secondary is-danger" data-exp-btn-delete="' +
          esc(selected.id) + '">Eliminar</button>' +
      '</div>';

    return html;
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
    ExperienciaEngine.ensureFlow(state);

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
    var modeTabs = rootEl.querySelector('[data-exp-mode-tabs]');
    var inspectorBody = (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.getInspectorBody)
      ? BuilderPropertiesRail.getInspectorBody(rootEl)
      : rootEl.querySelector('[data-exp-inspector-body]');
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

    function persist() {
      if (ExperienciaEngine.markExperienciaDirty) {
        ExperienciaEngine.markExperienciaDirty(state);
      }
      if (api.onChange) api.onChange();
      else if (api.saveState) api.saveState();
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
      if (!inspectorBody) return;
      var ids = selectedIds();
      var editMode = canvas().editMode === 'buttons' ? 'buttons' : 'flow';

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
      var addBtn = inspectorBody.querySelector('[data-exp-btn-add]');
      if (addBtn) {
        addBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var btn = ExperienciaEngine.addSceneButton(state, sceneId);
          if (btn) {
            canvas().selectedButtonId = btn.id;
            renderAll(); persist();
          }
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-select]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          canvas().selectedButtonId = el.getAttribute('data-exp-btn-select');
          renderAll();
        });
      });
      var labelEl = inspectorBody.querySelector('[data-exp-btn-label]');
      if (labelEl) {
        labelEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            label: labelEl.value
          });
          renderAll(); persist();
        });
      }
      var targetEl = inspectorBody.querySelector('[data-exp-btn-target]');
      if (targetEl) {
        targetEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            targetNodeId: targetEl.value || null
          });
          renderAll(); persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-style]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            style: el.getAttribute('data-exp-btn-style')
          });
          renderAll(); persist();
        });
      });
      var colorEl = inspectorBody.querySelector('[data-exp-btn-color]');
      if (colorEl) {
        colorEl.addEventListener('input', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            color: colorEl.value
          });
          paintButtonsStage();
        });
        colorEl.addEventListener('change', function () {
          persist();
        });
      }
      var iconEl = inspectorBody.querySelector('[data-exp-btn-icon]');
      if (iconEl) {
        iconEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            icon: iconEl.value
          });
          renderAll(); persist();
        });
      }
      var visEl = inspectorBody.querySelector('[data-exp-btn-visible]');
      if (visEl) {
        visEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            visible: !!visEl.checked
          });
          renderAll(); persist();
        });
      }
      var rotEl = inspectorBody.querySelector('[data-exp-btn-rotation]');
      var rotVal = inspectorBody.querySelector('[data-exp-btn-rot-val]');
      if (rotEl) {
        rotEl.addEventListener('input', function () {
          var deg = Number(rotEl.value) || 0;
          if (rotVal) rotVal.textContent = deg + ' °';
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            rotation: deg
          });
          paintButtonsStage();
        });
        rotEl.addEventListener('change', function () {
          persist();
        });
      }
      inspectorBody.querySelectorAll('[data-exp-btn-pos-mode]').forEach(function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            positionMode: el.getAttribute('data-exp-btn-pos-mode')
          });
          renderAll(); persist();
        });
      });
      var anchorEl = inspectorBody.querySelector('[data-exp-btn-anchor]');
      if (anchorEl) {
        anchorEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            anchor: anchorEl.value,
            positionMode: 'anchor'
          });
          renderAll(); persist();
        });
      }
      var mxEl = inspectorBody.querySelector('[data-exp-btn-margin-x]');
      if (mxEl) {
        mxEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            marginX: mxEl.value,
            keepAnchor: true
          });
          renderAll(); persist();
        });
      }
      var myEl = inspectorBody.querySelector('[data-exp-btn-margin-y]');
      if (myEl) {
        myEl.addEventListener('change', function () {
          ExperienciaEngine.updateSceneButton(state, sceneId, canvas().selectedButtonId, {
            marginY: myEl.value,
            keepAnchor: true
          });
          renderAll(); persist();
        });
      }
      var mirrorBtn = inspectorBody.querySelector('[data-exp-btn-mirror]');
      if (mirrorBtn) {
        mirrorBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          ExperienciaEngine.mirrorSceneButton(state, sceneId,
            mirrorBtn.getAttribute('data-exp-btn-mirror'));
          renderAll(); persist();
        });
      }
      var dupBtn = inspectorBody.querySelector('[data-exp-btn-duplicate]');
      if (dupBtn) {
        dupBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var copy = ExperienciaEngine.duplicateSceneButton(state, sceneId,
            dupBtn.getAttribute('data-exp-btn-duplicate'));
          if (copy) canvas().selectedButtonId = copy.id;
          renderAll(); persist();
        });
      }
      var delBtn = inspectorBody.querySelector('[data-exp-btn-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          var bid = delBtn.getAttribute('data-exp-btn-delete');
          ExperienciaEngine.removeSceneButton(state, sceneId, bid);
          canvas().selectedButtonId = null;
          renderAll(); persist();
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

    function toggleBrowserFullscreen() {
      if (isBrowserFullscreen()) {
        var exitFs = document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;
        if (exitFs) {
          try { exitFs.call(document); } catch (eExit) {}
        }
        return;
      }
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

    function toggleCanvasMode() {
      var next = !isCanvasMode();
      var prefs = (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load)
        ? BoxiesPrefs.load()
        : {};
      if (next) {
        /* Save shell + rail state — Focus collapses both rails; arrows reopen them */
        var restore = {
          railCollapsed: !!(typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getRailCollapsed
            ? BoxiesPrefs.getRailCollapsed()
            : document.body.classList.contains('boxies-rail-collapsed')),
          propsRailCollapsed: !!(typeof BuilderPropertiesRail !== 'undefined' &&
            BuilderPropertiesRail.isCollapsed
            ? BuilderPropertiesRail.isCollapsed()
            : document.body.classList.contains('boxies-props-rail-collapsed')),
          navCollapsed: !!(typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.getNavCollapsed
            ? BoxiesPrefs.getNavCollapsed()
            : document.body.classList.contains('boxies-nav-collapsed')),
          headerH: document.documentElement.style.getPropertyValue('--boxies-header-h') || '',
          dockH: document.documentElement.style.getPropertyValue('--boxies-dock-h') || '',
          railW: document.documentElement.style.getPropertyValue('--builder-rail-width') || '',
          propsRailW: document.documentElement.style.getPropertyValue('--builder-props-rail-width') || '',
          sidebarW: document.documentElement.style.getPropertyValue('--boxies-sidebar-w') || ''
        };
        setCanvasMode(true, restore);
        if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.setNavCollapsed) {
          BoxiesPrefs.setNavCollapsed(true);
        }
        document.body.classList.add('boxies-nav-collapsed');
        document.documentElement.classList.add('boxies-nav-collapsed');
        /* Shell chrome only — rails owned by ProgressRail / PropertiesRail */
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
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.collapse) {
          BuilderPropertiesRail.collapse(state);
        } else {
          document.body.classList.add('boxies-props-rail-collapsed');
          document.documentElement.classList.add('boxies-props-rail-collapsed');
          document.documentElement.style.setProperty('--builder-props-rail-width', '0px');
        }
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.ensureFloatButton) {
          try { BuilderProgressRail.ensureFloatButton(); } catch (eL) {}
        }
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.ensureFloatButton) {
          try { BuilderPropertiesRail.ensureFloatButton(); } catch (eR) {}
        }
      } else {
        var prev = prefs._expCanvasRestore || {};
        exitBrowserFullscreen();
        setCanvasMode(false, null);
        if (typeof BoxiesPrefs !== 'undefined') {
          if (BoxiesPrefs.setNavCollapsed) {
            BoxiesPrefs.setNavCollapsed(!!prev.navCollapsed);
          }
        }
        var navOn = !!prev.navCollapsed;
        document.body.classList.toggle('boxies-nav-collapsed', navOn);
        document.documentElement.classList.toggle('boxies-nav-collapsed', navOn);
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
            prev.propsRailCollapsed != null ? !!prev.propsRailCollapsed : true,
            { state: state }
          );
        } else if (prev.propsRailW) {
          document.documentElement.style.setProperty('--builder-props-rail-width', prev.propsRailW);
        } else {
          document.documentElement.style.removeProperty('--builder-props-rail-width');
        }
      }
      if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.update) {
        try { BuilderProgressRail.update(rootEl, state); } catch (eRail) {}
      }
      syncInspectorChrome();
      requestAnimationFrame(function () {
        onViewportResize();
        requestAnimationFrame(onViewportResize);
      });
    }

    function renderAll() {
      syncEditModeUi();
      applyWorldTransform();
      paintNodes();
      paintEdges();
      paintMinimap();
      paintButtonsStage();
      paintInspector();
      syncInspectorChrome();
      if (minimapWrap) minimapWrap.classList.toggle('is-hidden',
        canvas().editMode === 'buttons' || canvas().minimapVisible === false);
    }

    function canUseButtonsMode() {
      var n = ExperienciaEngine.getNode(state, canvas().selectedId);
      return !!(n && ExperienciaEngine.isButtonsEditableNode &&
        ExperienciaEngine.isButtonsEditableNode(n) &&
        selectedIds().length <= 1);
    }

    function syncEditModeUi() {
      if (!canUseButtonsMode() && canvas().editMode === 'buttons') {
        canvas().editMode = 'flow';
        canvas().selectedButtonId = null;
      }
      var mode = canvas().editMode === 'buttons' ? 'buttons' : 'flow';
      if (stage) stage.classList.toggle('is-buttons-mode', mode === 'buttons');
      if (viewport) viewport.hidden = mode === 'buttons';
      if (buttonsStage) {
        buttonsStage.hidden = mode !== 'buttons';
        buttonsStage.setAttribute('aria-hidden', mode === 'buttons' ? 'false' : 'true');
      }
      if (modeTabs) {
        modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
          var m = btn.getAttribute('data-exp-edit-mode');
          var isButtonsTab = m === 'buttons';
          var enabled = !isButtonsTab || canUseButtonsMode();
          btn.disabled = !enabled;
          btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
          var active = m === mode && enabled;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
      }
    }

    function syncButtonsLayerBounds() {
      if (!buttonsImg || !buttonsLayer || !buttonsFrame) return;
      if (buttonsImg.hidden || !buttonsImg.getAttribute('src')) {
        buttonsLayer.style.left = '0';
        buttonsLayer.style.top = '0';
        buttonsLayer.style.width = '100%';
        buttonsLayer.style.height = '100%';
        return;
      }
      var fr = buttonsFrame.getBoundingClientRect();
      var ir = buttonsImg.getBoundingClientRect();
      if (!fr.width || !ir.width) return;
      buttonsLayer.style.left = Math.max(0, ir.left - fr.left) + 'px';
      buttonsLayer.style.top = Math.max(0, ir.top - fr.top) + 'px';
      buttonsLayer.style.width = Math.max(1, ir.width) + 'px';
      buttonsLayer.style.height = Math.max(1, ir.height) + 'px';
    }

    function paintButtonsStage() {
      if (!buttonsStage || !buttonsLayer || !buttonsImg) return;
      if (canvas().editMode !== 'buttons') return;
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
            syncButtonsLayerBounds();
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
        return {
          id: b.id,
          portId: b.portId,
          label: b.label,
          x: layout.x,
          y: layout.y,
          style: b.style,
          color: b.color,
          icon: b.icon,
          rotation: b.rotation,
          visible: b.visible
        };
      });
      var sel = canvas().selectedButtonId;
      var guidesHtml = '';
      if (buttonDrag && buttonDrag.guides) {
        var g = buttonDrag.guides;
        if (g.vCenter) {
          guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--v is-center"></div>';
        }
        if (g.hCenter) {
          guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--h is-center"></div>';
        }
        (g.vAlign || []).forEach(function (x) {
          guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--v" style="left:' +
            Number(x) + '%"></div>';
        });
        (g.hAlign || []).forEach(function (y) {
          guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--h" style="top:' +
            Number(y) + '%"></div>';
        });
        if (g.mirrorX != null) {
          guidesHtml += '<div class="builder-exp-btn-guide builder-exp-btn-guide--v is-mirror" style="left:' +
            Number(g.mirrorX) + '%"></div>';
        }
      }
      buttonsLayer.innerHTML = guidesHtml + buttons.map(function (b) {
        if (!b) return '';
        var glyph = buttonIconGlyph(b.icon);
        var label = b.style === 'icon'
          ? (glyph || '·')
          : ((glyph ? (glyph + ' ') : '') + (b.label || 'Botón'));
        var rot = Number(b.rotation) || 0;
        return '<button type="button" class="' + buttonPreviewClass(b) +
          (String(b.id) === String(sel) ? ' is-selected' : '') +
          (b.visible === false ? ' is-invisible' : '') + '"' +
          ' data-exp-stage-btn="' + esc(b.id) + '"' +
          ' style="left:' + Number(b.x) + '%;top:' + Number(b.y) + '%;' +
            'transform:translate(-50%,-50%) rotate(' + rot + 'deg);' +
            '--btn-color:' + esc(b.color || '#ffffff') + '">' +
          esc(label) +
        '</button>';
      }).join('');
      requestAnimationFrame(syncButtonsLayerBounds);
    }

    function computeButtonGuides(sceneId, buttonId, x, y) {
      var n = ExperienciaEngine.getNode(state, sceneId);
      var list = ExperienciaEngine.listSceneButtons(state, n) || [];
      var SNAP = 1.2;
      var guides = { vCenter: false, hCenter: false, vAlign: [], hAlign: [], mirrorX: null };
      var nx = x;
      var ny = y;
      if (Math.abs(x - 50) <= SNAP) {
        nx = 50;
        guides.vCenter = true;
      }
      if (Math.abs(y - 50) <= SNAP) {
        ny = 50;
        guides.hCenter = true;
      }
      list.forEach(function (b) {
        if (!b || String(b.id) === String(buttonId)) return;
        if (Math.abs(x - b.x) <= SNAP) {
          nx = b.x;
          if (guides.vAlign.indexOf(b.x) < 0) guides.vAlign.push(b.x);
        }
        if (Math.abs(y - b.y) <= SNAP) {
          ny = b.y;
          if (guides.hAlign.indexOf(b.y) < 0) guides.hAlign.push(b.y);
        }
        var mirror = Math.round((100 - b.x) * 10) / 10;
        if (Math.abs(x - mirror) <= SNAP) {
          nx = mirror;
          guides.mirrorX = mirror;
        }
      });
      return { x: nx, y: ny, guides: guides };
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
      if (!next || !ExperienciaEngine.isButtonsEditableNode ||
          !ExperienciaEngine.isButtonsEditableNode(next)) {
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

    /* V6.1.00 — FLUJO | BOTONES */
    if (modeTabs) {
      modeTabs.querySelectorAll('[data-exp-edit-mode]').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (btn.disabled) return;
          var mode = btn.getAttribute('data-exp-edit-mode');
          if (mode === 'buttons' && !canUseButtonsMode()) return;
          canvas().editMode = mode === 'buttons' ? 'buttons' : 'flow';
          if (canvas().editMode !== 'buttons') canvas().selectedButtonId = null;
          openPropertiesRail();
          renderAll();
          persist();
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
        var hit = ev.target.closest('[data-exp-stage-btn]');
        if (!hit) {
          canvas().selectedButtonId = null;
          renderAll();
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        var bid = hit.getAttribute('data-exp-stage-btn');
        canvas().selectedButtonId = bid;
        var sceneId = canvas().selectedId;
        var btn = ExperienciaEngine.getSceneButton(state,
          ExperienciaEngine.getNode(state, sceneId), bid
        );
        buttonDrag = {
          buttonId: bid,
          sceneId: sceneId,
          pointerId: ev.pointerId,
          startX: btn ? (btn.storedX != null ? btn.storedX : btn.x) : 50,
          startY: btn ? (btn.storedY != null ? btn.storedY : btn.y) : 50,
          guides: null
        };
        try { hit.setPointerCapture(ev.pointerId); } catch (eCap) {}
        paintButtonsStage();
        paintInspector();
      });
      buttonsLayer.addEventListener('pointermove', function (ev) {
        if (!buttonDrag || ev.pointerId !== buttonDrag.pointerId) return;
        var pct = percentFromPointer(ev);
        var snapped = computeButtonGuides(
          buttonDrag.sceneId, buttonDrag.buttonId, pct.x, pct.y
        );
        buttonDrag.guides = snapped.guides;
        ExperienciaEngine.setSceneButtonPosition(
          state, buttonDrag.sceneId, buttonDrag.buttonId, snapped.x, snapped.y
        );
        paintButtonsStage();
      });
      function endButtonDrag(ev) {
        if (!buttonDrag || (ev && ev.pointerId !== buttonDrag.pointerId)) return;
        buttonDrag = null;
        paintButtonsStage();
        paintInspector();
        persist();
      }
      buttonsLayer.addEventListener('pointerup', endButtonDrag);
      buttonsLayer.addEventListener('pointercancel', endButtonDrag);
    }

    if (buttonsFrame) {
      buttonsFrame.addEventListener('pointerdown', function (ev) {
        if (ev.target.closest('[data-exp-stage-btn]')) return;
        canvas().selectedButtonId = null;
        paintButtonsStage();
        paintInspector();
      });
    }

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
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        var key = String(ev.key || '').toLowerCase();
        if (key === 'c' || key === 'v') {
          if (isFormField(ev.target) || renameEdit) return;
          var inScope = viewport === document.activeElement ||
            rootEl.contains(document.activeElement) || rootEl.contains(ev.target) ||
            (stage && stage.contains(ev.target));
          if (!inScope && document.activeElement !== document.body) return;
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
        if (!inCanvas) return;
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

    var resizeTimer = null;
    function onViewportResize() {
      if (!viewport || !world) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!viewport || !world) return;
        applyWorldTransform();
        paintMinimap();
      }, 40);
    }
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(onViewportResize);
      ro.observe(viewport);
      if (stage) ro.observe(stage);
      if (workspace) ro.observe(workspace);
    }
    window.addEventListener('resize', onViewportResize);
    document.addEventListener('fullscreenchange', onViewportResize);
    window.addEventListener('boxies:rail-toggle', onViewportResize);

    renderAll();
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
        document.body.classList.add('boxies-nav-collapsed');
        document.documentElement.classList.add('boxies-nav-collapsed');
        document.documentElement.style.setProperty('--boxies-sidebar-w', '0px');
        document.documentElement.style.setProperty('--boxies-header-h', '0px');
        document.documentElement.style.setProperty('--boxies-dock-h', '0px');
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.applyRailCollapsed) {
          BuilderProgressRail.applyRailCollapsed(true);
        } else {
          document.body.classList.add('boxies-rail-collapsed');
          document.documentElement.style.setProperty('--builder-rail-width', '0px');
        }
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.collapse) {
          BuilderPropertiesRail.collapse(state);
        } else {
          document.documentElement.style.setProperty('--builder-props-rail-width', '0px');
        }
        if (typeof BuilderProgressRail !== 'undefined' && BuilderProgressRail.ensureFloatButton) {
          try { BuilderProgressRail.ensureFloatButton(); } catch (eL) {}
        }
        if (typeof BuilderPropertiesRail !== 'undefined' && BuilderPropertiesRail.ensureFloatButton) {
          try { BuilderPropertiesRail.ensureFloatButton(); } catch (eR) {}
        }
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
      destroy: function () {
        window.removeEventListener('boxies:props-rail-toggle', onPropsRailToggle);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        exitBrowserFullscreen();
      }
    };
  }

  return {
    shellHtml: shellHtml,
    actionsHtml: actionsHtml,
    mount: mount,
    isCanvasMode: isCanvasMode,
    setCanvasMode: setCanvasMode
  };
})();
