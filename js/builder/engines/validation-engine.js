/* Validation Engine — showroom relationship verifier (V5.9.48) */
var ValidationEngine = (function () {
  var SEVERITY = {
    obligatorio: 'OBLIGATORIO',
    recomendado: 'RECOMENDADO',
    opcional: 'OPCIONAL'
  };

  function structureApplied(s) {
    return !!(s.estructura && s.estructura.appliedAt) ||
      !!(s.architecture && s.architecture.appliedAt);
  }

  function buildChecks(state) {
    var s = state || {};
    var checks = [];

    function add(id, label, severity, passed, detail) {
      checks.push({
        id: id,
        label: label,
        severity: severity,
        severityLabel: SEVERITY[severity] || severity,
        passed: !!passed,
        optional: severity === 'opcional',
        required: severity === 'obligatorio',
        recommended: severity === 'recomendado',
        detail: detail || null
      });
    }

    add('config', 'Configuración (nombre y slug)', 'obligatorio',
      !!(s.projectInfo && s.projectInfo.nombre && s.projectInfo.slug));

    add('estructura-aplicada', 'Estructura aplicada', 'obligatorio', structureApplied(s));

    var unitCount = (typeof ArchitectureEngine !== 'undefined' && ArchitectureEngine.activeUnitCount)
      ? ArchitectureEngine.activeUnitCount(s)
      : 0;
    var orphanUnits = (s.architecture && s.architecture.orphans) ? s.architecture.orphans.length : 0;
    add('viviendas-inventario', 'Inventario de viviendas sincronizado', 'obligatorio',
      !structureApplied(s) || unitCount > 0,
      unitCount ? (unitCount + ' unidades') : null);
    add('viviendas-huerfanas', 'Viviendas sin conflicto / huérfanas', 'recomendado',
      orphanUnits === 0,
      orphanUnits ? (orphanUnits + ' en revisión') : null);

    var tips = (s.estructura && s.estructura.tipologias) || [];
    var tipsIncomplete = tips.filter(function (t) {
      return !(t.nombre || t.modelo) || !(t.ambientes && t.ambientes.length);
    }).length;
    add('tipologias', 'Tipologías definidas', 'obligatorio',
      !structureApplied(s) || tips.length > 0);
    add('tipologias-contenido', 'Tipologías con contenido básico', 'recomendado',
      tipsIncomplete === 0,
      tipsIncomplete ? (tipsIncomplete + ' incompletas') : null);

    var expIncomplete = (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.incompleteNodes)
      ? ExperienciaEngine.incompleteNodes(s).length
      : 0;
    add('experiencia', 'Experiencia sincronizada', 'recomendado',
      !structureApplied(s) || !!(s.experiencia && s.experiencia.syncedFromApply));
    add('experiencia-nodos', 'Nodos de Experiencia completos', 'recomendado',
      expIncomplete === 0,
      expIncomplete ? (expIncomplete + ' pendientes') : null);

    add('logo', 'Logo', 'obligatorio', !!(s.branding && s.branding.logo));
    add('hero-visual', 'Hero visual', 'recomendado',
      (typeof MediaEngine !== 'undefined' && MediaEngine.hasHeroMedia)
        ? MediaEngine.hasHeroMedia(s)
        : !!(s.heroVideo || s.heroImage));

    var slots = (s.architecture && s.architecture.mediaSlots) || [];
    var planSlots = slots.filter(function (x) {
      return String(x.mediaKind || '').indexOf('plan') === 0;
    }).length;
    add('planos', 'Planos cargados', planSlots ? 'recomendado' : 'opcional',
      (s.plans || []).length > 0,
      planSlots ? ((s.plans || []).length + ' / ' + planSlots) : null);

    add('galeria', 'Galería', 'opcional', (s.gallery || []).length > 0);
    add('360', 'Tours 360°', 'opcional',
      (s.panoramas || []).some(function (p) { return p.file || p.url || p.uploadedUrl; }));
    add('docs', 'Documentos', 'opcional', (s.downloads || []).length > 0);

    var hotspots = s.hotspotSuggestions || [];
    var accepted = hotspots.filter(function (h) { return h.accepted; });
    var missingDest = accepted.filter(function (h) { return !h.entityRef; });
    add('hotspots-destino', 'Hotspots con destino/entidad', 'recomendado',
      accepted.length === 0 || missingDest.length === 0,
      missingDest.length ? (missingDest.length + ' sin destino') : null);

    add('menu', 'Menú configurado', 'recomendado',
      !!(s.menuConfig && Array.isArray(s.menuConfig.items) && s.menuConfig.items.length));

    /* Legacy checks kept (recoverable) */
    add('tema', 'Tema', 'opcional', !!(s.branding && s.branding.selectedProposal));
    add('informacion', 'Información comercial', 'opcional', !!(s.projectInfo && s.projectInfo.nombre));
    add('ia', 'Contenido IA', 'opcional', !!(s.aiContent && s.aiContent.descripcionComercial));

    return checks;
  }

  function validate(state) {
    var results = buildChecks(state);

    var requiredFailed = results.filter(function (r) { return r.required && !r.passed; });
    var recommendedFailed = results.filter(function (r) { return r.recommended && !r.passed; });
    var optionalPassed = results.filter(function (r) { return r.optional && r.passed; }).length;
    var requiredPassed = results.filter(function (r) { return r.required && r.passed; }).length;

    var pendingCount = results.filter(function (r) { return !r.passed; }).length;

    return {
      checks: results,
      requiredPassed: requiredPassed,
      requiredTotal: results.filter(function (r) { return r.required; }).length,
      optionalPassed: optionalPassed,
      recommendedFailed: recommendedFailed.length,
      pendingCount: pendingCount,
      ready: requiredFailed.length === 0,
      score: Math.round((results.filter(function (r) { return r.passed; }).length / Math.max(results.length, 1)) * 100)
    };
  }

  return {
    SEVERITY: SEVERITY,
    CHECKS: [], /* dynamic — use validate().checks */
    validate: validate,
    buildChecks: buildChecks
  };
})();
