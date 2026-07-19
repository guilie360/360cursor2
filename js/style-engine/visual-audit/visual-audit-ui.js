try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/visual-audit/visual-audit-ui.js');}catch(_e){}
/* Visual Audit — UI: captura real de pantallas (como se ven) */
var VisualAuditUI = (function () {
  var ROOT_ID = 'visualAuditUiRoot';
  var unsub = null;

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDuration(ms) {
    var s = Math.round((ms || 0) / 1000);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + 'm ' + r + 's';
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'va-ui-root';
    document.body.appendChild(root);
    return root;
  }

  function clearRoot() {
    var root = ensureRoot();
    root.innerHTML = '';
    root.classList.remove('is-open');
  }

  function canUse() {
    return typeof StyleEngineCompatibility !== 'undefined' &&
      StyleEngineCompatibility.isAdminViewer();
  }

  function showConfirm() {
    if (!canUse()) {
      if (typeof showToast === 'function') showToast('Solo administradores');
      return;
    }
    var root = ensureRoot();
    root.classList.add('is-open');
    var total = VisualAuditCatalog.getAllScenes().length;
    var fsOk = VisualAuditStorage.supportsDirectoryPicker();
    var screenOk = VisualAuditCapture.supportsDisplayCapture();

    root.innerHTML =
      '<div class="va-confirm" role="dialog" aria-modal="true">' +
        '<div class="va-confirm-box">' +
          '<div class="va-confirm-kicker">Style Engine · Admin</div>' +
          '<h2 class="va-confirm-title">Capturar pantallas</h2>' +
          '<p class="va-confirm-copy">Se fotografiará la web <strong>exactamente como la ves</strong>: hero, imágenes, menús y popups.</p>' +
          '<ul class="va-confirm-list">' +
            '<li>Elige una carpeta para guardar las PNG</li>' +
            '<li>Luego el navegador pedirá compartir pantalla</li>' +
            '<li><strong>Importante:</strong> selecciona <strong>«Esta pestaña»</strong> / <strong>Chrome Tab</strong></li>' +
            '<li>No elijas «Pantalla completa» ni otra ventana</li>' +
          '</ul>' +
          '<p class="va-confirm-meta">Imágenes: <strong>~' + total + ' PNG</strong></p>' +
          '<p class="va-confirm-meta">Tiempo: <strong>2–5 minutos</strong></p>' +
          '<p class="va-confirm-meta">Destino: <strong>' +
            (fsOk ? 'carpeta «Capturas BOXIES»' : 'ZIP con PNG') +
          '</strong></p>' +
          (!screenOk
            ? '<p class="va-confirm-meta" style="color:#e85d5d">Este navegador no soporta captura de pestaña. Usa Chrome o Edge.</p>'
            : '') +
          '<div class="va-confirm-actions">' +
            '<button type="button" class="va-btn" id="vaConfirmCancel">Cancelar</button>' +
            '<button type="button" class="va-btn va-btn--primary" id="vaConfirmStart"' +
              (screenOk ? '' : ' disabled') + '>Comenzar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('vaConfirmCancel').onclick = clearRoot;
    document.getElementById('vaConfirmStart').onclick = function () {
      clearRoot();
      startAudit();
    };
  }

  function renderProgress(state) {
    var root = ensureRoot();
    root.classList.add('is-open');
    var percent = state.percent || 0;
    var eta = 'calculando…';
    if (state.startedAt && state.current > 1) {
      var elapsed = Date.now() - state.startedAt;
      var per = elapsed / (state.current - 1);
      var remain = Math.max(0, Math.round((per * (state.total - state.current + 1)) / 1000));
      var m = Math.floor(remain / 60);
      var s = remain % 60;
      eta = m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    }

    root.innerHTML =
      '<div class="va-progress" role="status">' +
        '<div class="va-progress-box">' +
          '<div class="va-progress-kicker">Capturando (vista real)</div>' +
          '<div class="va-progress-count">' + (state.current || 0) + ' / ' + state.total + '</div>' +
          '<div class="va-progress-name"><strong>' + escapeHtml(state.name || '…') + '</strong></div>' +
          (state.saved ? '<div class="va-progress-eta">Guardado: ' + escapeHtml(state.saved) + '</div>' : '') +
          '<div class="va-progress-bar"><div class="va-progress-fill" style="width:' + percent + '%"></div></div>' +
          '<div class="va-progress-pct">' + percent + '%</div>' +
          '<div class="va-progress-eta">Restante: ' + escapeHtml(eta) + '</div>' +
          '<button type="button" class="va-btn" id="vaProgressCancel">Cancelar</button>' +
        '</div>' +
      '</div>';

    var cancelBtn = document.getElementById('vaProgressCancel');
    if (cancelBtn) {
      cancelBtn.onclick = function () {
        VisualAuditRunner.cancel();
      };
    }
  }

  function renderSummary(session) {
    var root = ensureRoot();
    root.classList.add('is-open');
    var ok = (session.totals && session.totals.captured) || 0;
    var fail = (session.totals && session.totals.failed) || 0;
    var title = session.cancelled ? 'Captura cancelada' : (ok ? 'Imágenes listas' : 'No se guardaron imágenes');

    root.innerHTML =
      '<div class="va-summary" role="dialog">' +
        '<div class="va-summary-box">' +
          '<div class="va-summary-kicker">Captura de pantallas</div>' +
          '<h2 class="va-summary-title">' + escapeHtml(title) + '</h2>' +
          '<div class="va-summary-grid" style="grid-template-columns:1fr 1fr">' +
            '<div><span>PNG guardadas</span><strong>' + ok + '</strong></div>' +
            '<div><span>Fallidas</span><strong>' + fail + '</strong></div>' +
          '</div>' +
          '<p class="va-summary-meta">Tiempo: <strong>' + escapeHtml(formatDuration(session.durationMs)) + '</strong></p>' +
          '<p class="va-summary-meta">Carpeta: <strong>' + escapeHtml(session.destination || '—') + '</strong></p>' +
          '<p class="va-summary-hint">Abre <strong>Capturas BOXIES</strong> — las PNG deben verse igual que en el navegador (con hero e imágenes).</p>' +
          '<div class="va-confirm-actions">' +
            '<button type="button" class="va-btn va-btn--primary" id="vaSummaryClose">Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('vaSummaryClose').onclick = clearRoot;
  }

  function startAudit() {
    if (!canUse()) return;
    if (unsub) unsub();
    var startedAt = Date.now();
    var lastProgress = {
      current: 0,
      total: 1,
      name: 'Elige carpeta y luego «Esta pestaña»…',
      percent: 0,
      startedAt: startedAt
    };

    unsub = VisualAuditRunner.subscribe(function (event, payload) {
      if (event === 'progress') {
        lastProgress = Object.assign({ startedAt: startedAt }, payload);
        renderProgress(lastProgress);
      } else if (event === 'complete') {
        renderSummary(payload);
      } else if (event === 'cancelled') {
        lastProgress.name = 'Cancelando…';
        renderProgress(lastProgress);
      }
    });

    renderProgress(lastProgress);

    VisualAuditRunner.run().then(function (session) {
      renderSummary(session);
      if (typeof showToast === 'function') {
        showToast(session.totals.captured
          ? session.totals.captured + ' imágenes PNG guardadas'
          : 'No se guardaron imágenes');
      }
    }).catch(function (err) {
      clearRoot();
      if (typeof showToast === 'function') showToast(err.message || 'Captura fallida');
      else window.alert(err.message || 'Captura fallida');
    });
  }

  function open() {
    showConfirm();
  }

  return {
    open: open,
    canUse: canUse,
    clear: clearRoot
  };
})();

var VisualAudit = (function () {
  function open() {
    if (!VisualAuditUI.canUse()) {
      if (typeof showToast === 'function') showToast('Solo administradores');
      return;
    }
    VisualAuditUI.open();
  }

  return {
    open: open,
    isAdminOnly: true
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/visual-audit/visual-audit-ui.js');}catch(_e){}
