try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/theme-ai/theme-ai-preview.js');}catch(_e){}
/* Vista previa de identidad de marca y propuestas de tema IA */
var ThemeAIPreview = (function () {
  var C = ThemeColorMath;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderSwatch(label, hex, note) {
    if (!hex) return '';
    return (
      '<div class="theme-ai-palette-item">' +
        '<span class="theme-ai-palette-swatch" style="background:' + escapeHtml(hex) + '"></span>' +
        '<div class="theme-ai-palette-meta">' +
          '<span class="theme-ai-palette-label">' + escapeHtml(label) + '</span>' +
          '<span class="theme-ai-palette-hex">' + escapeHtml(hex) + '</span>' +
          (note ? '<span class="theme-ai-palette-role-note">' + escapeHtml(note) + '</span>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderPersonalityBadge(profile) {
    var personality = profile && profile.palette && profile.palette.personality;
    if (!personality || !personality.primary) return '';
    var label = ThemeAIGenerator.formatPersonality(personality);
    return (
      '<div class="theme-ai-personality">' +
        '<span class="theme-ai-personality-label">Personalidad detectada</span>' +
        '<span class="theme-ai-personality-value">' + escapeHtml(label) + '</span>' +
        '<span class="theme-ai-personality-meta">' +
          escapeHtml(profile.palette.colorCount + ' colores · ' +
          (profile.palette.families ? profile.palette.families.length : 0) + ' familias cromáticas') +
        '</span>' +
      '</div>'
    );
  }

  function renderFamiliesPanel(profile) {
    var families = profile && profile.palette && profile.palette.families;
    if (!families || !families.length) return '';
    return (
      '<section class="theme-ai-families-panel">' +
        '<h3 class="theme-ai-palette-title">Familias cromáticas</h3>' +
        '<p class="theme-ai-palette-note">Colores agrupados por identidad. Sin tonos inventados.</p>' +
        '<div class="theme-ai-families-list">' +
          families.map(function (family) {
            var swatches = family.members.slice(0, 8).map(function (m) {
              return '<span class="theme-ai-family-swatch" style="background:' + escapeHtml(m.hex) + '" title="' + escapeHtml(m.hex + ' · ' + m.percent + '%') + '"></span>';
            }).join('');
            return (
              '<article class="theme-ai-family-card">' +
                '<div class="theme-ai-family-head">' +
                  '<strong>' + escapeHtml(family.name) + '</strong>' +
                  '<span>' + escapeHtml(family.areaShare + '% · peso ' + family.visualWeight) + '</span>' +
                '</div>' +
                '<div class="theme-ai-family-swatches">' + swatches + '</div>' +
              '</article>'
            );
          }).join('') +
        '</div>' +
      '</section>'
    );
  }

  function renderReasoningPanel(profile) {
    var reasoning = profile && profile.palette && profile.palette.reasoning;
    if (!reasoning || !reasoning.length) return '';
    var items = reasoning.filter(function (r) { return !r.skipped; }).slice(0, 8);
    return (
      '<section class="theme-ai-reasoning-panel">' +
        '<h3 class="theme-ai-palette-title">Decisiones del Director de Arte</h3>' +
        '<ul class="theme-ai-reasoning-list">' +
          items.map(function (item) {
            return '<li><strong>' + escapeHtml(item.role) + '</strong> ' + escapeHtml(item.reason) + '</li>';
          }).join('') +
        '</ul>' +
      '</section>'
    );
  }

  function renderPalettePanel(profile) {
    if (!profile || !profile.palette) return '';
    var colors = profile.palette.colors;
    var roles = profile.palette.roles || {};
    return (
      renderPersonalityBadge(profile) +
      renderFamiliesPanel(profile) +
      '<section class="theme-ai-palette-panel">' +
        '<h3 class="theme-ai-palette-title">Sistema cromático asignado</h3>' +
        '<p class="theme-ai-palette-note">Roles únicos derivados del logo. Sin duplicados ni colores genéricos.</p>' +
        '<div class="theme-ai-palette-grid">' +
          renderSwatch('Background', roles.background || colors.background) +
          renderSwatch('Surface', roles.surface || colors.surface) +
          renderSwatch('Acento principal', roles.accentPrimary || colors.accent) +
          renderSwatch('Acento secundario', roles.accentSecondary || colors.secondary) +
          renderSwatch('Texto principal', roles.primaryText || colors.textPrimary) +
          renderSwatch('Texto secundario', roles.secondaryText || colors.textSecondary) +
          renderSwatch('Bordes', roles.border || colors.border) +
          (colors.success ? renderSwatch('Success', colors.success) : '') +
          (colors.warning ? renderSwatch('Warning', colors.warning) : '') +
          (colors.error ? renderSwatch('Error', colors.error) : '') +
        '</div>' +
      '</section>' +
      renderReasoningPanel(profile)
    );
  }

  function derivePreviewTokens(config, palette) {
    var colors = palette && palette.colors ? palette.colors : {};
    var roles = palette && palette.roles ? palette.roles : {};
    var textMode = config.textMode === 'dark' ? 'dark' : 'light';
    var bg = config.bg;
    var text = roles.primaryText || colors.textPrimary || (textMode === 'light' ? '#f4f4f4' : '#1a1a1a');
    text = C.ensureContrast(text, bg, 4.5, text);
    return {
      bg: bg,
      menu: config.menuColor || config.bg,
      surface: config.surface,
      accent: config.accent,
      secondary: roles.accentSecondary || colors.secondary || config.heroSurface || config.surface,
      border: roles.border || colors.border || C.adjustLightness(config.bg, -10),
      text: text,
      textSecondary: roles.secondaryText || colors.textSecondary || (textMode === 'light' ? '#b8b8b8' : '#5a5a5a'),
      heroSurface: config.heroSurface || config.surface,
      link: config.accent,
      badge: config.accent,
      input: C.adjustLightness(config.bg, textMode === 'dark' ? 6 : -4),
      hover: C.adjustLightness(config.accent, -6),
      active: C.adjustLightness(config.accent, -12)
    };
  }

  function renderRichPreview(tokens) {
    return (
      '<div class="theme-ai-rich-preview" aria-hidden="true">' +
        '<div class="tai-nav" style="background:' + escapeHtml(tokens.menu) + ';border-color:' + escapeHtml(tokens.border) + '">' +
          '<span class="tai-nav-logo" style="background:' + escapeHtml(tokens.accent) + '"></span>' +
          '<span class="tai-nav-link tai-nav-link--active" style="color:' + escapeHtml(tokens.accent) + '">Inicio</span>' +
          '<span class="tai-nav-link" style="color:' + escapeHtml(tokens.textSecondary) + '">Proyecto</span>' +
        '</div>' +
        '<div class="tai-body" style="background:' + escapeHtml(tokens.bg) + '">' +
          '<div class="tai-hero" style="background:' + escapeHtml(tokens.surface) + ';border-color:' + escapeHtml(tokens.border) + '">' +
            '<span class="tai-hero-title" style="color:' + escapeHtml(tokens.text) + '">Hero</span>' +
            '<span class="tai-hero-sub" style="color:' + escapeHtml(tokens.textSecondary) + '">Subtítulo de marca</span>' +
            '<span class="tai-btn tai-btn--primary" style="background:' + escapeHtml(tokens.accent) + '">Explorar</span>' +
            '<span class="tai-btn tai-btn--secondary" style="background:' + escapeHtml(tokens.heroSurface) + ';border-color:' + escapeHtml(tokens.border) + ';color:' + escapeHtml(tokens.text) + '">Ver más</span>' +
          '</div>' +
          '<div class="tai-card" style="background:' + escapeHtml(tokens.surface) + ';border-color:' + escapeHtml(tokens.border) + '">' +
            '<span class="tai-badge" style="background:' + escapeHtml(tokens.badge) + '">Nuevo</span>' +
            '<span class="tai-line" style="background:' + escapeHtml(tokens.text) + '"></span>' +
            '<span class="tai-line tai-line--short" style="background:' + escapeHtml(tokens.textSecondary) + '"></span>' +
            '<span class="tai-link" style="color:' + escapeHtml(tokens.link) + '">Enlace</span>' +
          '</div>' +
          '<div class="tai-input" style="background:' + escapeHtml(tokens.input) + ';border-color:' + escapeHtml(tokens.border) + ';color:' + escapeHtml(tokens.textSecondary) + '">Input</div>' +
          '<div class="tai-modal" style="background:' + escapeHtml(tokens.menu) + ';border-color:' + escapeHtml(tokens.border) + '">' +
            '<span style="color:' + escapeHtml(tokens.text) + '">Modal</span>' +
            '<span class="tai-btn tai-btn--hover" style="background:' + escapeHtml(tokens.hover) + '">Hover</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderProposalCard(proposal) {
    var tokens = derivePreviewTokens(proposal.config, proposal.palette);
    return (
      '<article class="theme-ai-proposal-card" data-theme-ai-proposal="' + escapeHtml(proposal.id) + '">' +
        '<div class="theme-ai-proposal-preview">' + renderRichPreview(tokens) + '</div>' +
        '<div class="theme-ai-proposal-meta">' +
          '<h3 class="theme-ai-proposal-name">' + escapeHtml(proposal.name) + '</h3>' +
          '<p class="theme-ai-proposal-desc">' + escapeHtml(proposal.description) + '</p>' +
        '</div>' +
        '<div class="theme-ai-proposal-actions">' +
          '<button type="button" class="outline-btn theme-ai-apply-btn" data-theme-ai-action="apply" data-theme-ai-proposal="' + escapeHtml(proposal.id) + '">Aplicar</button>' +
          '<button type="button" class="outline-btn theme-ai-save-btn" data-theme-ai-action="save" data-theme-ai-proposal="' + escapeHtml(proposal.id) + '">Guardar como mi tema</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderResults(profile, proposals) {
    return (
      renderPalettePanel(profile) +
      '<section class="theme-ai-proposals-section">' +
        '<h3 class="theme-ai-proposals-title">Aplicaciones de la identidad</h3>' +
        '<p class="theme-ai-proposals-note">Misma identidad cromática. Solo cambian profundidad, elevaciones, sombras y acabados.</p>' +
        '<div class="theme-ai-proposals-grid theme-ai-proposals-grid--wide">' +
          (proposals || []).map(renderProposalCard).join('') +
        '</div>' +
      '</section>'
    );
  }

  return {
    renderPalettePanel: renderPalettePanel,
    renderResults: renderResults,
    renderProposalCard: renderProposalCard
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/theme-ai/theme-ai-preview.js');}catch(_e){}
