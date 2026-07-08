/* Validation Engine — pre-publish checklist */
var ValidationEngine = (function () {
  var CHECKS = [
    { id: 'logo', label: 'Logo', test: function (s) { return !!(s.branding && s.branding.logo); } },
    { id: 'tema', label: 'Tema', test: function (s) { return !!(s.branding && s.branding.selectedProposal); } },
    { id: 'hero', label: 'Hero', test: function (s) { return !!(s.aiContent && s.aiContent.heroText); } },
    { id: 'video', label: 'Hero visual', test: function (s) { return MediaEngine.hasHeroMedia(s); }, optional: true },
    { id: 'galeria', label: 'Galería', test: function (s) { return (s.gallery || []).length > 0 }, optional: true },
    { id: 'planos', label: 'Planos', test: function (s) { return (s.plans || []).length > 0 }, optional: true },
    { id: 'descargables', label: 'Descargables', test: function (s) { return (s.downloads || []).length > 0 }, optional: true },
    { id: '360', label: '360', test: function (s) { return (s.panoramas || []).some(function (p) { return p.file; }); }, optional: true },
    { id: 'informacion', label: 'Información', test: function (s) { return !!(s.projectInfo && s.projectInfo.nombre); } },
    { id: 'ia', label: 'IA', test: function (s) { return !!(s.aiContent && s.aiContent.descripcionComercial); } },
    { id: 'responsive', label: 'Responsive', test: function () { return true; } },
    { id: 'seo', label: 'SEO', test: function (s) { return !!(s.aiContent && s.aiContent.keywords && s.aiContent.keywords.length); } },
    { id: 'hotspots', label: 'Hotspots', test: function (s) { return (s.hotspotSuggestions || []).some(function (h) { return h.accepted; }); }, optional: true },
    { id: 'navegacion', label: 'Navegación', test: function (s) { return !!s.projectType; } }
  ];

  function validate(state) {
    var results = CHECKS.map(function (check) {
      var passed = false;
      try { passed = !!check.test(state); } catch (e) { passed = false; }
      return {
        id: check.id,
        label: check.label,
        passed: passed,
        optional: !!check.optional,
        required: !check.optional
      };
    });

    var requiredFailed = results.filter(function (r) { return r.required && !r.passed; });
    var optionalPassed = results.filter(function (r) { return r.optional && r.passed; }).length;
    var requiredPassed = results.filter(function (r) { return r.required && r.passed; }).length;

    return {
      checks: results,
      requiredPassed: requiredPassed,
      requiredTotal: results.filter(function (r) { return r.required; }).length,
      optionalPassed: optionalPassed,
      ready: requiredFailed.length === 0,
      score: Math.round((results.filter(function (r) { return r.passed; }).length / results.length) * 100)
    };
  }

  return {
    CHECKS: CHECKS,
    validate: validate
  };
})();
