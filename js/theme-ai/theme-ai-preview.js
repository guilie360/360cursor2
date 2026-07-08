/* Vista previa de paleta extraída y propuestas de tema IA */
var ThemeAIPreview = (function () {
  var C = ThemeColorMath;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderSwatch(label, hex) {
    return (
      '<div class="theme-ai-palette-item">' +
        '<span class="theme-ai-palette-swatch" style="background:' + escapeHtml(hex) + '"></span>' +
        '<div class="theme-ai-palette-meta">' +
          '<span class="theme-ai-palette-label">' + escapeHtml(label) + '</span>' +
          '<span class="theme-ai-palette-hex">' + escapeHtml(hex) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPalettePanel(profile) {
    if (!profile || !profile.palette) return '';
    var colors = profile.palette.colors;
    return (
      '<section class="theme-ai-palette-panel">' +
        '<h3 class="theme-ai-palette-title">Paleta extraída del logo</h3>' +
        '<p class="theme-ai-palette-note">Colores detectados en la imagen. Sin tonos inventados.</p>' +
        '<div class="theme-ai-palette-grid">' +
          renderSwatch('Color principal', colors.primary) +
          renderSwatch('Color secundario', colors.secondary) +
          renderSwatch('Color terciario', colors.tertiary) +
          renderSwatch('Neutro', colors.neutral) +
          renderSwatch('Background', colors.background) +
          renderSwatch('Surface', colors.surface) +
          renderSwatch('Text', colors.textPrimary) +
          renderSwatch('Borders', colors.border) +
          renderSwatch('Accent', colors.accent) +
          renderSwatch('Success', colors.success) +
          renderSwatch('Warning', colors.warning) +
          renderSwatch('Error', colors.error) +
        '</div>' +
      '</section>'
    );
  }

  function derivePreviewTokens(config, palette) {
    var colors = palette && palette.colors ? palette.colors : {};
    var textMode = config.textMode === 'dark' ? 'dark' : 'light';
    return {
      bg: config.bg,
      menu: config.menuColor || config.bg,
      surface: config.surface,
      accent: config.accent,
      secondary: colors.secondary || config.heroSurface || config.surface,
      border: colors.border || C.adjustLightness(config.bg, -10),
      text: colors.textPrimary || (textMode === 'light' ? '#f4f4f4' : '#1a1a1a'),
      textSecondary: colors.textSecondary || (textMode === 'light' ? '#b8b8b8' : '#5a5a5a'),
      heroSurface: config.heroSurface || config.surface,
      link: colors.accent || config.accent,
      badge: colors.accent || config.accent,
      input: C.adjustLightness(config.bg, textMode === 'dark' ? 6 : -4),
      hover: C.adjustLightness(colors.accent || config.accent, -6),
      active: C.adjustLightness(colors.accent || config.accent, -12)
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
        '<h3 class="theme-ai-proposals-title">Propuestas de aplicación</h3>' +
        '<p class="theme-ai-proposals-note">Misma paleta. Solo cambia profundidad, contraste y acabados.</p>' +
        '<div class="theme-ai-proposals-grid">' +
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
