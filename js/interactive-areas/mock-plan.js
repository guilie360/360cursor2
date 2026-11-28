/**
 * Shared mock masterplan markup (inline SVG — no dependency on MIME/img decode).
 */
var InteractiveAreasMockPlan = (function () {
  var SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" class="ia-page-plan areas-page-plan" role="img" aria-label="Planta Masterplan mock">' +
      '<rect width="1200" height="800" fill="#1a1a1a"/>' +
      '<rect x="40" y="40" width="1120" height="720" rx="8" fill="#121212" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>' +
      '<path d="M80 400 H1120" stroke="rgba(255,255,255,0.08)" stroke-width="36"/>' +
      '<path d="M600 80 V720" stroke="rgba(255,255,255,0.08)" stroke-width="28"/>' +
      '<rect x="120" y="100" width="420" height="240" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>' +
      '<rect x="660" y="100" width="420" height="240" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>' +
      '<rect x="120" y="460" width="420" height="240" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>' +
      '<rect x="660" y="460" width="420" height="240" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>' +
      '<text x="330" y="230" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="Segoe UI,sans-serif" font-size="28" letter-spacing="0.2em">TORRE A</text>' +
      '<text x="870" y="230" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="Segoe UI,sans-serif" font-size="28" letter-spacing="0.2em">TORRE B</text>' +
      '<text x="330" y="590" text-anchor="middle" fill="rgba(255,255,255,0.28)" font-family="Segoe UI,sans-serif" font-size="22" letter-spacing="0.16em">AMENIDADES</text>' +
      '<text x="870" y="590" text-anchor="middle" fill="rgba(255,255,255,0.28)" font-family="Segoe UI,sans-serif" font-size="22" letter-spacing="0.16em">PARQUE</text>' +
      '<text x="600" y="48" text-anchor="middle" fill="rgba(255,255,255,0.22)" font-family="Segoe UI,sans-serif" font-size="14" letter-spacing="0.28em">MASTERPLAN MOCK</text>' +
    '</svg>';

  function html() {
    return SVG;
  }

  return { html: html };
})();
