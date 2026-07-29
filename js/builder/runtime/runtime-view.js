/* BOXIES RuntimeView — UI for the Runtime Builder step (no compile logic). */
var RuntimeView = (function () {
  function esc(v) {
    if (typeof AdminUI !== 'undefined' && AdminUI.escapeHtml) return AdminUI.escapeHtml(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      var date = d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
      var time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return date + ' · ' + time;
    } catch (e) {
      return String(iso);
    }
  }

  function formatDurationMs(ms) {
    if (ms == null || ms < 0) return '—';
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
  }

  function lastResult() {
    return (typeof RuntimeCompiler !== 'undefined' && RuntimeCompiler.getLast)
      ? RuntimeCompiler.getLast()
      : null;
  }

  function isBuilt() {
    return typeof RuntimeCompiler !== 'undefined' && RuntimeCompiler.isReady && RuntimeCompiler.isReady();
  }

  function actionsHtml() {
    return '<button type="button" class="builder-header-action-btn is-primary" id="builderRuntimeRunBtn" title="Construir Runtime">RUN</button>';
  }

  function statusCardHtml(last) {
    var built = !!(last && last.runtime && last.generatedAt);
    return '' +
      '<section class="builder-runtime-card" data-runtime-status>' +
        '<div class="builder-runtime-card__head">Estado</div>' +
        '<div class="builder-runtime-status ' + (built ? 'is-ready' : 'is-empty') + '">' +
          '<span class="builder-runtime-status__mark" aria-hidden="true">' +
            (built ? '\u2714' : '\u25CB') +
          '</span>' +
          '<span class="builder-runtime-status__label">' +
            (built ? 'Runtime construido' : 'Sin construir') +
          '</span>' +
        '</div>' +
        '<dl class="builder-runtime-meta">' +
          '<div><dt>Última compilación</dt><dd>' + esc(formatWhen(last && last.generatedAt)) + '</dd></div>' +
          '<div><dt>Duración</dt><dd>' + esc(formatDurationMs(last && last.durationMs)) + '</dd></div>' +
        '</dl>' +
        '<div class="builder-runtime-actions">' +
          '<button type="button" class="builder-header-action-btn is-primary builder-runtime-run" id="builderRuntimeRunBtnMain">RUN</button>' +
        '</div>' +
      '</section>';
  }

  function validationsHtml(last) {
    var checks = (last && last.validations && last.validations.checks) || [];
    if (!last || !last.generatedAt) {
      return '' +
        '<section class="builder-runtime-card">' +
          '<div class="builder-runtime-card__head">Validaciones</div>' +
          '<p class="builder-menu-hint">Ejecuta RUN para validar el flujo ejecutable.</p>' +
        '</section>';
    }
    return '' +
      '<section class="builder-runtime-card">' +
        '<div class="builder-runtime-card__head">Validaciones</div>' +
        '<ul class="builder-runtime-checks">' +
          checks.map(function (c) {
            return '<li class="' + (c.ok ? 'is-ok' : 'is-fail') + '">' +
              '<span class="builder-runtime-checks__mark" aria-hidden="true">' +
                (c.ok ? '\u2714' : '\u274C') +
              '</span>' +
              '<span class="builder-runtime-checks__body">' +
                '<strong>' + esc(c.label) + '</strong>' +
                (c.detail ? ('<em>' + esc(c.detail) + '</em>') : '') +
              '</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
      '</section>';
  }

  function pipelineHtml(last) {
    var steps = (last && last.pipeline) || [];
    if (!steps.length) {
      return '' +
        '<section class="builder-runtime-card">' +
          '<div class="builder-runtime-card__head">Pipeline</div>' +
          '<p class="builder-menu-hint">El recorrido textual aparecerá tras compilar.</p>' +
        '</section>';
    }
    var html = '<section class="builder-runtime-card">' +
      '<div class="builder-runtime-card__head">Pipeline</div>' +
      '<ol class="builder-runtime-pipeline">';
    steps.forEach(function (step, idx) {
      html += '<li class="' + (step.disconnected ? 'is-disconnected' : '') + '">' +
        '<span class="builder-runtime-pipeline__label">' + esc(step.label) + '</span>' +
        (step.kind ? ('<span class="builder-runtime-pipeline__kind">' + esc(step.kind) + '</span>') : '') +
      '</li>';
      if (idx < steps.length - 1) {
        html += '<li class="builder-runtime-pipeline__arrow" aria-hidden="true">↓</li>';
      }
    });
    html += '</ol></section>';
    return html;
  }

  function statsHtml(last) {
    var s = (last && last.statistics) || null;
    if (!s) {
      return '' +
        '<section class="builder-runtime-card">' +
          '<div class="builder-runtime-card__head">Estadísticas</div>' +
          '<p class="builder-menu-hint">Se calculan al construir el Runtime.</p>' +
        '</section>';
    }
    var rows = [
      ['Nodos', s.nodes],
      ['Conexiones', s.connections],
      ['Videos', s.videos],
      ['Imágenes', s.images],
      ['Hubs', s.hubs],
      ['Hotspots', s.hotspots],
      ['Animaciones', s.animations],
      ['Tiempo estimado', s.estimatedLabel]
    ];
    return '' +
      '<section class="builder-runtime-card">' +
        '<div class="builder-runtime-card__head">Estadísticas</div>' +
        '<dl class="builder-runtime-stats">' +
          rows.map(function (row) {
            return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(String(row[1])) + '</dd></div>';
          }).join('') +
        '</dl>' +
      '</section>';
  }

  function render(state) {
    var last = lastResult();
    /* Prefer live window runtime if page reloaded mid-session without _last */
    if ((!last || !last.runtime) && typeof RuntimeCompiler !== 'undefined' && RuntimeCompiler.getRuntime) {
      var rt = RuntimeCompiler.getRuntime();
      if (rt) {
        last = {
          runtime: rt,
          validations: null,
          pipeline: (typeof RuntimePipeline !== 'undefined' && RuntimePipeline.build)
            ? RuntimePipeline.build(state)
            : [],
          statistics: rt.statistics ||
            ((typeof RuntimeStatistics !== 'undefined' && RuntimeStatistics.compute)
              ? RuntimeStatistics.compute(rt)
              : null),
          durationMs: rt.meta && rt.meta.durationMs,
          generatedAt: rt.generatedAt,
          ok: false
        };
        if (typeof RuntimeValidator !== 'undefined' && RuntimeValidator.validate) {
          last.validations = RuntimeValidator.validate(state, rt);
          last.ok = !!(last.validations && last.validations.ok);
        }
      }
    }

    return '' +
      '<div class="builder-step-content builder-step-content--runtime">' +
        '<div class="builder-runtime-workspace">' +
          '<div class="builder-runtime-col builder-runtime-col--main">' +
            statusCardHtml(last) +
            validationsHtml(last) +
          '</div>' +
          '<div class="builder-runtime-col builder-runtime-col--side">' +
            pipelineHtml(last) +
            statsHtml(last) +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function runCompile(state, api) {
    api = api || {};
    if (typeof RuntimeCompiler === 'undefined' || !RuntimeCompiler.compile) {
      if (typeof AdminNotify !== 'undefined') AdminNotify.error('RuntimeCompiler no disponible');
      return null;
    }
    var result = RuntimeCompiler.compile(state);
    if (state) {
      state.sectionChecks = state.sectionChecks || {};
      state.sectionChecks.runtime = !!(result && result.runtime);
    }
    if (typeof AdminNotify !== 'undefined') {
      if (result && result.ok) AdminNotify.success('Runtime construido');
      else AdminNotify.success('Runtime construido con advertencias');
    }
    if (api.onDone) api.onDone(result);
    return result;
  }

  function bind(rootEl, state, api) {
    api = api || {};
    function onRun(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      runCompile(state, {
        onDone: function () {
          if (api.rerender) api.rerender();
          else if (api.onChange) api.onChange();
        }
      });
    }
    var headerBtn = rootEl.querySelector('#builderRuntimeRunBtn');
    var mainBtn = rootEl.querySelector('#builderRuntimeRunBtnMain');
    if (headerBtn) headerBtn.onclick = onRun;
    if (mainBtn) mainBtn.onclick = onRun;
  }

  return {
    render: render,
    bind: bind,
    actionsHtml: actionsHtml,
    runCompile: runCompile,
    isBuilt: isBuilt
  };
})();
