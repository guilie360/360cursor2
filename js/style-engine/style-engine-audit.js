/* Style Engine — Auditoría pre-publicación */
var StyleEngineAudit = (function () {
  var HARDCODE_PATTERNS = [
    /#[0-9a-fA-F]{3,8}\b/,
    /rgba?\([^)]+\)/
  ];

  var SCAN_FILES = [
    { path: 'css/components.css', label: 'Componentes showroom' },
    { path: 'css/variables.css', label: 'Variables base' },
    { path: 'admin/css/admin-auth.css', label: 'Admin + Auth' },
    { path: 'admin/css/ai-project-builder.css', label: 'AI Project Builder' }
  ];

  function scanFileContent(content, filePath) {
    var issues = [];
    if (!content) return issues;
    var lines = content.split('\n');
    lines.forEach(function (line, idx) {
      if (line.indexOf('var(--') >= 0 && HARDCODE_PATTERNS[0].test(line) === false) return;
      if (/^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return;
      var hasHardcode = HARDCODE_PATTERNS.some(function (re) { return re.test(line); });
      if (!hasHardcode) return;
      if (line.indexOf('color-mix') >= 0 && line.indexOf('var(--') >= 0) return;
      if (/fallback|default|\/\*/.test(line)) return;
      issues.push({
        file: filePath,
        line: idx + 1,
        snippet: line.trim().slice(0, 120)
      });
    });
    return issues;
  }

  function getRegistryIssues() {
    return StyleEngineRegistry.getByStatus(StyleEngineRegistry.STATUS.LEGACY).map(function (c) {
      return {
        type: 'component',
        id: c.id,
        name: c.name,
        route: c.route,
        message: c.name + ' aún no hereda del VisualSystem (LEGACY)',
        files: c.files
      };
    });
  }

  function getHardcodeSummary() {
    /* Conteo estático documentado — escaneo en runtime limitado al DOM de estilos cargados */
    return SCAN_FILES.map(function (f) {
      return {
        file: f.path,
        label: f.label,
        note: 'Pendiente migración de literales hardcodeados a tokens'
      };
    });
  }

  function run(options) {
    options = options || {};
    var stats = StyleEngineRegistry.getCoverageStats();
    var legacyComponents = getRegistryIssues();
    var hardcodeFiles = getHardcodeSummary();

    var checks = [
      {
        id: 'registry-coverage',
        label: 'Componentes conectados al VisualSystem',
        passed: stats.legacy === 0,
        detail: stats.connected + ' / ' + stats.total + ' (' + stats.percent + '%)'
      },
      {
        id: 'no-legacy-screens',
        label: 'Pantallas showroom sin fuente legacy independiente',
        passed: legacyComponents.filter(function (i) {
          return i.route && i.route.indexOf('admin/') < 0 && i.route.indexOf('auth/') < 0 &&
            i.id !== 'theme-editor-legacy' && i.id !== 'theme-ai-modal';
        }).length === 0,
        detail: null
      },
      {
        id: 'visual-system-active',
        label: 'VisualSystem disponible',
        passed: typeof VisualSystem !== 'undefined',
        detail: null
      },
      {
        id: 'legacy-adapter',
        label: 'Legacy Adapter operativo',
        passed: typeof StyleEngineLegacyAdapter !== 'undefined',
        detail: null
      },
      {
        id: 'runtime-bridge',
        label: 'Runtime puede alimentar variables globales',
        passed: typeof StyleEngineRuntime !== 'undefined',
        detail: null
      }
    ];

    var allPassed = checks.every(function (c) { return c.passed; }) && legacyComponents.length === 0;
    var canPublish = stats.percent >= 50;

    return {
      passed: allPassed,
      canPublish: canPublish,
      coverage: stats,
      checks: checks,
      legacyComponents: legacyComponents,
      hardcodeFiles: hardcodeFiles,
      warnings: legacyComponents.map(function (c) { return c.message; }),
      summary: stats.percent + '% cobertura · ' + legacyComponents.length + ' componentes LEGACY pendientes'
    };
  }

  function formatReport(audit) {
    if (!audit) return '';
    var lines = [
      'Auditoría VisualSystem',
      'Cobertura: ' + audit.coverage.percent + '%',
      'Migrados: ' + audit.coverage.migrated,
      'Adapter (LIVE): ' + audit.coverage.adapter,
      'Pendientes LEGACY: ' + audit.coverage.legacy,
      ''
    ];
    if (audit.legacyComponents.length) {
      lines.push('Componentes pendientes:');
      audit.legacyComponents.slice(0, 12).forEach(function (c) {
        lines.push('  • ' + c.name);
      });
      if (audit.legacyComponents.length > 12) {
        lines.push('  … y ' + (audit.legacyComponents.length -  12) + ' más');
      }
    }
    return lines.join('\n');
  }

  return {
    run: run,
    formatReport: formatReport,
    getRegistryIssues: getRegistryIssues
  };
})();
