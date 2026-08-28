/**
 * BOXIES Sistema — infrastructure monitoring dashboard (mock-backed).
 * Each card loads independently via SystemMonitorService.
 */
var BoxiesSistemaPage = (function () {
  var rootEl = null;
  var selectedShowroomId = null;
  var cleanupBusy = false;

  var SEGMENT_COLORS = {
    renders: '#6b9fd4',
    panoramas: '#7eb89a',
    videos: '#c4a35a',
    pdf: '#a78bb8',
    thumbnails: '#8a9aab',
    other: '#6e757d'
  };

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function svc() {
    if (typeof SystemMonitorService === 'undefined') {
      throw new Error('SystemMonitorService no disponible');
    }
    return SystemMonitorService;
  }

  function cardShell(id, title, bodyHtml) {
    return (
      '<section class="bx-sys-card" data-sys-card="' + escapeHtml(id) + '">' +
        '<header class="bx-sys-card__head">' +
          '<h2 class="bx-sys-card__title">' + escapeHtml(title) + '</h2>' +
          '<span class="bx-sys-card__meta" data-sys-meta="' + escapeHtml(id) + '"></span>' +
        '</header>' +
        '<div class="bx-sys-card__body" data-sys-body="' + escapeHtml(id) + '">' +
          (bodyHtml || '<div class="bx-sys-loading">Cargando…</div>') +
        '</div>' +
      '</section>'
    );
  }

  function setCardBody(id, html) {
    if (!rootEl) return;
    var body = rootEl.querySelector('[data-sys-body="' + id + '"]');
    if (body) body.innerHTML = html;
  }

  function setCardMeta(id, text) {
    if (!rootEl) return;
    var meta = rootEl.querySelector('[data-sys-meta="' + id + '"]');
    if (meta) meta.textContent = text || '';
  }

  function setCardError(id, err) {
    setCardBody(
      id,
      '<p class="bx-sys-error">' + escapeHtml((err && err.message) || 'Error al cargar') + '</p>'
    );
  }

  /* ── Storage ── */
  function renderStorage(data) {
    var level = data.level || 'ok';
    return (
      '<div class="bx-sys-storage is-' + escapeHtml(level) + '">' +
        '<div class="bx-sys-storage__stats">' +
          '<div class="bx-sys-stat">' +
            '<span class="bx-sys-stat__label">Espacio utilizado</span>' +
            '<span class="bx-sys-stat__value">' + escapeHtml(data.usedLabel) + '</span>' +
          '</div>' +
          '<div class="bx-sys-stat">' +
            '<span class="bx-sys-stat__label">Espacio disponible</span>' +
            '<span class="bx-sys-stat__value">' + escapeHtml(data.availableLabel) + '</span>' +
          '</div>' +
          '<div class="bx-sys-stat">' +
            '<span class="bx-sys-stat__label">Capacidad total</span>' +
            '<span class="bx-sys-stat__value">' + escapeHtml(data.totalLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bx-sys-meter" role="meter" aria-valuenow="' + data.percent +
          '" aria-valuemin="0" aria-valuemax="100" aria-label="Uso de storage">' +
          '<div class="bx-sys-meter__track">' +
            '<div class="bx-sys-meter__fill" style="width:' + data.percent + '%"></div>' +
          '</div>' +
          '<div class="bx-sys-meter__row">' +
            '<span class="bx-sys-meter__pct">' + escapeHtml(String(data.percent)) + '%</span>' +
            '<span class="bx-sys-pill is-' + escapeHtml(level) + '">' +
              escapeHtml(data.levelLabel) +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  async function loadStorage() {
    try {
      setCardBody('storage', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getStorageOverview();
      setCardBody('storage', renderStorage(data));
      setCardMeta('storage', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('storage', err);
    }
  }

  /* ── Showrooms usage ── */
  function renderShowroomRows(items) {
    if (!items || !items.length) {
      return '<p class="bx-sys-empty">Sin datos de showrooms.</p>';
    }
    return (
      '<div class="bx-sys-table-wrap">' +
        '<table class="bx-sys-table">' +
          '<thead><tr><th>Nombre</th><th>Peso</th><th>Archivos</th></tr></thead>' +
          '<tbody>' +
            items.map(function (row) {
              var sel = row.id === selectedShowroomId ? ' is-selected' : '';
              return (
                '<tr class="bx-sys-row' + sel + '" data-showroom-id="' + escapeHtml(row.id) + '" tabindex="0">' +
                  '<td><strong>' + escapeHtml(row.nombre) + '</strong></td>' +
                  '<td>' + escapeHtml(row.weightLabel) + '</td>' +
                  '<td>' + escapeHtml(String(row.files)) + ' archivos</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<p class="bx-sys-hint">Selecciona un showroom para ver la distribución.</p>'
    );
  }

  async function loadShowrooms() {
    try {
      setCardBody('showrooms', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getShowroomUsage();
      if (!selectedShowroomId && data.items && data.items[0]) {
        selectedShowroomId = data.items[0].id;
      }
      setCardBody('showrooms', renderShowroomRows(data.items));
      setCardMeta('showrooms', data.source === 'mock' ? 'Simulado' : '');
      bindShowroomRows();
      if (selectedShowroomId) loadShowroomDetail(selectedShowroomId);
    } catch (err) {
      setCardError('showrooms', err);
    }
  }

  function bindShowroomRows() {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-sys-body="showrooms"] [data-showroom-id]').forEach(function (row) {
      function select() {
        selectedShowroomId = row.getAttribute('data-showroom-id');
        rootEl.querySelectorAll('[data-sys-body="showrooms"] .bx-sys-row').forEach(function (el) {
          el.classList.toggle('is-selected', el === row);
        });
        loadShowroomDetail(selectedShowroomId);
      }
      row.addEventListener('click', select);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });
  }

  /* ── Showroom detail + pie ── */
  function pieSvg(segments) {
    var total = segments.reduce(function (sum, s) { return sum + (s.bytes || 0); }, 0) || 1;
    var r = 42;
    var c = 2 * Math.PI * r;
    var offset = 0;
    var circles = segments.map(function (seg) {
      var len = (seg.bytes / total) * c;
      var color = SEGMENT_COLORS[seg.key] || '#888';
      var el =
        '<circle class="bx-sys-pie__seg" cx="50" cy="50" r="' + r + '"' +
          ' fill="none" stroke="' + color + '" stroke-width="14"' +
          ' stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '"' +
          ' stroke-dashoffset="' + (-offset).toFixed(2) + '"' +
          ' transform="rotate(-90 50 50)"/>';
      offset += len;
      return el;
    }).join('');
    return (
      '<svg class="bx-sys-pie" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14"/>' +
        circles +
      '</svg>'
    );
  }

  function renderShowroomDetail(data) {
    return (
      '<div class="bx-sys-detail">' +
        '<div class="bx-sys-detail__summary">' +
          '<div class="bx-sys-stat">' +
            '<span class="bx-sys-stat__label">Nombre</span>' +
            '<span class="bx-sys-stat__value">' + escapeHtml(data.nombre) + '</span>' +
          '</div>' +
          '<div class="bx-sys-stat">' +
            '<span class="bx-sys-stat__label">Peso total</span>' +
            '<span class="bx-sys-stat__value">' + escapeHtml(data.weightLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bx-sys-detail__chart">' +
          pieSvg(data.segments) +
          '<ul class="bx-sys-legend">' +
            data.segments.map(function (seg) {
              var color = SEGMENT_COLORS[seg.key] || '#888';
              return (
                '<li>' +
                  '<span class="bx-sys-legend__swatch" style="background:' + color + '"></span>' +
                  '<span class="bx-sys-legend__label">' + escapeHtml(seg.label) + '</span>' +
                  '<span class="bx-sys-legend__val">' + escapeHtml(seg.labelBytes) + '</span>' +
                '</li>'
              );
            }).join('') +
          '</ul>' +
        '</div>' +
      '</div>'
    );
  }

  async function loadShowroomDetail(id) {
    try {
      setCardBody('detail', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getShowroomDetail(id);
      setCardBody('detail', renderShowroomDetail(data));
      setCardMeta('detail', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('detail', err);
    }
  }

  /* ── Content counts ── */
  function renderContent(data) {
    var items = [
      { label: 'Renders', value: data.renders },
      { label: 'Panoramas', value: data.panoramas },
      { label: 'Videos', value: data.videos },
      { label: 'PDFs', value: data.pdfs },
      { label: 'Imágenes', value: data.images },
      { label: 'Archivos', value: data.files }
    ];
    return (
      '<div class="bx-sys-grid-stats">' +
        items.map(function (it) {
          return (
            '<div class="bx-sys-stat bx-sys-stat--compact">' +
              '<span class="bx-sys-stat__label">' + escapeHtml(it.label) + '</span>' +
              '<span class="bx-sys-stat__value">' + escapeHtml(String(it.value)) + '</span>' +
            '</div>'
          );
        }).join('') +
      '</div>'
    );
  }

  async function loadContent() {
    try {
      setCardBody('content', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getContentCounts();
      setCardBody('content', renderContent(data));
      setCardMeta('content', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('content', err);
    }
  }

  /* ── Cleanup ── */
  function renderCleanupIdle() {
    return (
      '<p class="bx-sys-card__lead">Detecta archivos huérfanos, duplicados y temporales. No elimina nada.</p>' +
      '<div class="bx-sys-actions">' +
        '<button type="button" class="boxies-action-btn" id="bxSysAnalyzeBtn">Analizar almacenamiento</button>' +
        '<button type="button" class="boxies-action-btn is-disabled" id="bxSysReclaimBtn" disabled ' +
          'data-tooltip="Disponible en una próxima versión" aria-disabled="true">' +
          'Liberar espacio' +
        '</button>' +
      '</div>' +
      '<p class="bx-sys-hint bx-sys-hint--muted">Liberar espacio — Disponible en una próxima versión.</p>' +
      '<div class="bx-sys-cleanup-results" id="bxSysCleanupResults" hidden></div>'
    );
  }

  function renderCleanupResults(data) {
    var rows = [
      { label: 'Archivos huérfanos', value: data.orphanFiles },
      { label: 'Miniaturas antiguas', value: data.staleThumbnails },
      { label: 'Imágenes duplicadas', value: data.duplicateImages },
      { label: 'Archivos temporales', value: data.tempFiles },
      { label: 'Espacio recuperable', value: data.reclaimableLabel, emphasize: true }
    ];
    return (
      '<div class="bx-sys-cleanup-grid">' +
        rows.map(function (r) {
          return (
            '<div class="bx-sys-stat' + (r.emphasize ? ' is-emphasis' : '') + '">' +
              '<span class="bx-sys-stat__label">' + escapeHtml(r.label) + '</span>' +
              '<span class="bx-sys-stat__value">' + escapeHtml(String(r.value)) + '</span>' +
            '</div>'
          );
        }).join('') +
      '</div>' +
      '<p class="bx-sys-hint">Solo análisis. Ningún archivo fue eliminado.</p>'
    );
  }

  function bindCleanup() {
    if (!rootEl) return;
    var analyzeBtn = rootEl.querySelector('#bxSysAnalyzeBtn');
    if (!analyzeBtn) return;
    analyzeBtn.addEventListener('click', async function () {
      if (cleanupBusy) return;
      cleanupBusy = true;
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analizando…';
      var host = rootEl.querySelector('#bxSysCleanupResults');
      if (host) {
        host.hidden = false;
        host.innerHTML = '<div class="bx-sys-loading">Simulando análisis…</div>';
      }
      try {
        var data = await svc().analyzeCleanup();
        if (host) host.innerHTML = renderCleanupResults(data);
        setCardMeta('cleanup', data.source === 'mock' ? 'Simulado' : '');
      } catch (err) {
        if (host) {
          host.innerHTML =
            '<p class="bx-sys-error">' + escapeHtml(err.message || 'Error') + '</p>';
        }
      } finally {
        cleanupBusy = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analizar almacenamiento';
      }
    });
  }

  async function loadCleanup() {
    setCardBody('cleanup', renderCleanupIdle());
    setCardMeta('cleanup', '');
    bindCleanup();
  }

  /* ── Database ── */
  function renderDatabase(data) {
    var items = [
      { label: 'Tamaño', value: data.sizeLabel },
      { label: 'Registros', value: data.records },
      { label: 'Usuarios', value: data.users },
      { label: 'Showrooms', value: data.showrooms },
      { label: 'Publicados', value: data.published }
    ];
    return (
      '<div class="bx-sys-grid-stats bx-sys-grid-stats--5">' +
        items.map(function (it) {
          return (
            '<div class="bx-sys-stat bx-sys-stat--compact">' +
              '<span class="bx-sys-stat__label">' + escapeHtml(it.label) + '</span>' +
              '<span class="bx-sys-stat__value">' + escapeHtml(String(it.value)) + '</span>' +
            '</div>'
          );
        }).join('') +
      '</div>'
    );
  }

  async function loadDatabase() {
    try {
      setCardBody('database', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getDatabaseStats();
      setCardBody('database', renderDatabase(data));
      setCardMeta('database', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('database', err);
    }
  }

  /* ── Performance ── */
  function renderPerformance(data) {
    return (
      '<div class="bx-sys-grid-stats bx-sys-grid-stats--3">' +
        '<div class="bx-sys-stat bx-sys-stat--compact">' +
          '<span class="bx-sys-stat__label">Tiempo de respuesta</span>' +
          '<span class="bx-sys-stat__value">' + escapeHtml(String(data.responseMs)) + ' ms</span>' +
        '</div>' +
        '<div class="bx-sys-stat bx-sys-stat--compact">' +
          '<span class="bx-sys-stat__label">Última sincronización</span>' +
          '<span class="bx-sys-stat__value">' + escapeHtml(data.lastSyncLabel) + '</span>' +
        '</div>' +
        '<div class="bx-sys-stat bx-sys-stat--compact">' +
          '<span class="bx-sys-stat__label">Estado</span>' +
          '<span class="bx-sys-stat__value">' +
            '<span class="bx-sys-pill is-ok">' + escapeHtml(data.status) + '</span>' +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }

  async function loadPerformance() {
    try {
      setCardBody('performance', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getPerformance();
      setCardBody('performance', renderPerformance(data));
      setCardMeta('performance', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('performance', err);
    }
  }

  /* ── Status strip ── */
  function renderStatus(data) {
    return (
      '<ul class="bx-sys-status">' +
        (data.items || []).map(function (it) {
          var online = it.status === 'online';
          return (
            '<li class="bx-sys-status__item is-' + (online ? 'online' : 'offline') + '">' +
              '<span class="bx-sys-status__dot" aria-hidden="true"></span>' +
              '<span class="bx-sys-status__label">' + escapeHtml(it.label) + '</span>' +
              '<span class="bx-sys-status__val">' +
                escapeHtml(online ? 'Online' : 'Offline') +
              '</span>' +
            '</li>'
          );
        }).join('') +
      '</ul>'
    );
  }

  async function loadStatus() {
    try {
      setCardBody('status', '<div class="bx-sys-loading">Cargando…</div>');
      var data = await svc().getServiceStatus();
      setCardBody('status', renderStatus(data));
      setCardMeta('status', data.source === 'mock' ? 'Simulado' : '');
    } catch (err) {
      setCardError('status', err);
    }
  }

  function pageHtml() {
    return (
      '<div class="boxies-page boxies-page--sistema">' +
        '<header class="bx-sys-header">' +
          '<div>' +
            '<h1 class="boxies-page__title">Sistema</h1>' +
            '<p class="boxies-page__desc">Centro de monitoreo de la infraestructura BOXIES.</p>' +
          '</div>' +
          '<span class="bx-sys-badge">Modo simulado</span>' +
        '</header>' +
        '<div class="bx-sys-grid">' +
          cardShell('status', 'Estado del sistema') +
          cardShell('storage', 'Storage') +
          cardShell('performance', 'Rendimiento') +
          cardShell('database', 'Base de datos') +
          cardShell('content', 'Contenido almacenado') +
          cardShell('showrooms', 'Uso por Showroom') +
          cardShell('detail', 'Detalle Showroom') +
          cardShell('cleanup', 'Limpieza del sistema') +
        '</div>' +
      '</div>'
    );
  }

  async function mount(host) {
    if (typeof BoxiesShell !== 'undefined') {
      if (BoxiesShell.clearProjectContext) BoxiesShell.clearProjectContext();
      if (BoxiesShell.clearPageActions) BoxiesShell.clearPageActions();
    }
    selectedShowroomId = null;
    cleanupBusy = false;
    host.innerHTML = pageHtml();
    rootEl = host;

    /* Independent card loads — failures stay isolated */
    loadStatus();
    loadStorage();
    loadPerformance();
    loadDatabase();
    loadContent();
    loadShowrooms();
    loadCleanup();
  }

  function unmount() {
    rootEl = null;
    selectedShowroomId = null;
    cleanupBusy = false;
  }

  return {
    id: 'sistema',
    title: 'Sistema',
    mount: mount,
    unmount: unmount
  };
})();
