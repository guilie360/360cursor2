/* Theme Engine — wraps branding into proyecto_config theme */
var ThemeEngine = (function () {
  function normalizeThemeConfig(proposal) {
    if (!proposal || !proposal.config) return null;
    var cfg = proposal.config;
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.normalizeCustomConfig) {
      return ThemeSystem.normalizeCustomConfig(cfg);
    }
    return cfg;
  }

  function toProyectoConfig(branding) {
    var colors = BrandingEngine.paletteToHeroColors(branding && branding.palette);
    var themeConfig = branding && branding.selectedProposal
      ? normalizeThemeConfig(branding.selectedProposal)
      : null;

    return {
      color_fondo: colors.color_fondo,
      color_accento: colors.color_accento,
      project_default_theme: themeConfig,
      logo_url: branding && branding.logo && branding.logo.uploadedUrl ? branding.logo.uploadedUrl : null
    };
  }

  function getPreviewCss(proposal) {
    if (!proposal || !proposal.config) return {};
    var cfg = proposal.config;
    return {
      '--builder-theme-bg': cfg.bg || '#0A0A0A',
      '--builder-theme-accent': cfg.accent || '#FF3B30',
      '--builder-theme-surface': cfg.surface || cfg.menuColor || '#171717'
    };
  }

  return {
    normalizeThemeConfig: normalizeThemeConfig,
    toProyectoConfig: toProyectoConfig,
    getPreviewCss: getPreviewCss
  };
})();
