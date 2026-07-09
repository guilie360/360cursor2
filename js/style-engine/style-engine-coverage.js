/* Style Engine — Coverage panel */
var StyleEngineCoverage = (function () {
  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusIcon(status) {
    if (status === StyleEngineRegistry.STATUS.MIGRATED) return '✅';
    if (status === StyleEngineRegistry.STATUS.ADAPTER) return '🔶';
    return '❌';
  }

  function filterButtonsHtml(active) {
    var filters = [
      { id: 'all', label: 'Todos' },
      { id: StyleEngineRegistry.STATUS.MIGRATED, label: 'Migrados' },
      { id: StyleEngineRegistry.STATUS.ADAPTER, label: 'Adapter' },
      { id: StyleEngineRegistry.STATUS.LEGACY, label: 'Legacy' }
    ];
    return filters.map(function (f) {
      return '<button type="button" class="se-coverage-filter' + (active === f.id ? ' is-active' : '') +
        '" data-se-coverage-filter="' + escapeHtml(f.id) + '">' + escapeHtml(f.label) + '</button>';
    }).join('');
  }

  function renderList(filter) {
    var items = StyleEngineRegistry.getAll();
    if (filter && filter !== 'all') {
      items = items.filter(function (c) { return c.status === filter; });
    }
    return items.map(function (c) {
      return (
        '<div class="se-coverage-item se-coverage-item--' + escapeHtml(c.status) + '">' +
          '<span class="se-coverage-icon">' + statusIcon(c.status) + '</span>' +
          '<div class="se-coverage-meta">' +
            '<div class="se-coverage-name">' + escapeHtml(c.name) + '</div>' +
            '<div class="se-coverage-route">' + escapeHtml(c.route) + ' · ' + escapeHtml(StyleEngineRegistry.getStatusLabel(c.status)) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function mount(host, options) {
    options = options || {};
    var filter = options.filter || 'all';
    var stats = StyleEngineRegistry.getCoverageStats();
    var audit = typeof StyleEngineAudit !== 'undefined' ? StyleEngineAudit.run() : null;

    host.innerHTML =
      '<section class="se-coverage">' +
        '<div class="se-coverage-head">' +
          '<h3 class="se-section-title">Coverage</h3>' +
          '<p class="se-section-copy">Inventario de componentes y estado de migración al VisualSystem.</p>' +
        '</div>' +
        '<div class="se-coverage-stats">' +
          '<div class="se-coverage-stat"><span>Componentes</span><strong>' + stats.total + '</strong></div>' +
          '<div class="se-coverage-stat"><span>Migrados</span><strong>' + stats.migrated + '</strong></div>' +
          '<div class="se-coverage-stat"><span>Adapter (LIVE)</span><strong>' + stats.adapter + '</strong></div>' +
          '<div class="se-coverage-stat"><span>Pendientes</span><strong>' + stats.legacy + '</strong></div>' +
          '<div class="se-coverage-stat se-coverage-stat--percent"><span>Cobertura</span><strong>' + stats.percent + '%</strong></div>' +
        '</div>' +
        '<div class="se-coverage-bar"><div class="se-coverage-bar-fill" style="width:' + stats.percent + '%"></div></div>' +
        (audit ?
          '<div class="se-coverage-audit">' +
            '<div class="se-coverage-audit-title">Última auditoría</div>' +
            '<p class="se-coverage-audit-copy">' + escapeHtml(audit.summary) + '</p>' +
            '<button type="button" class="se-section-btn" id="styleEngineRunAuditBtn">Ejecutar auditoría</button>' +
          '</div>' : '') +
        '<div class="se-coverage-filters">' + filterButtonsHtml(filter) + '</div>' +
        '<div class="se-coverage-list" id="styleEngineCoverageList">' + renderList(filter) + '</div>' +
        '<div class="se-coverage-legend">' +
          '<span>✅ Migrado (tokens --se-*)</span>' +
          '<span>🔶 Adapter (vars legacy ← VisualSystem)</span>' +
          '<span>❌ Legacy (pendiente)</span>' +
        '</div>' +
      '</section>';

    bind(host, filter);
  }

  function bind(host, activeFilter) {
    host.querySelectorAll('[data-se-coverage-filter]').forEach(function (btn) {
      btn.onclick = function () {
        mount(host, { filter: btn.getAttribute('data-se-coverage-filter') });
      };
    });
    var auditBtn = host.querySelector('#styleEngineRunAuditBtn');
    if (auditBtn) {
      auditBtn.onclick = function () {
        var audit = StyleEngineAudit.run();
        if (typeof showToast === 'function') {
          showToast(audit.canPublish ? 'Auditoría OK · ' + audit.summary : 'Advertencias: ' + audit.legacyComponents.length + ' LEGACY');
        }
        if (!audit.canPublish && audit.legacyComponents.length) {
          window.alert(StyleEngineAudit.formatReport(audit));
        }
        mount(host, { filter: activeFilter });
      };
    }
  }

  return { mount: mount };
})();
