try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/platform/project-preset-themes.js');}catch(_e){}
/* Temas preset oficiales — catálogo bloqueado, editable solo por admin */
var ProjectPresetThemes = (function () {
  var MIN_PRESETS = 3;
  var MAX_PRESETS = 15;
  var CATALOG_VERSION = 1;
  var cachedCatalog = null;

  function canManage(profile) {
    return typeof ProjectThemeAuthority !== 'undefined' &&
      ProjectThemeAuthority.canSetOfficialTheme(profile || VisitorSession.getProfile());
  }

  function getProyectoId() {
    return window.PROJECT_DATA && window.PROJECT_DATA.id ? window.PROJECT_DATA.id : null;
  }

  function getSwatchAccentFromTheme(t) {
    if (!t) return '#8f1d1d';
    return t.swatchAccent || t.accent || '#8f1d1d';
  }

  function seedFromBuiltin() {
    var presets = [];
    Object.keys(ThemeSystem.THEMES).forEach(function (key) {
      if (presets.length >= MAX_PRESETS) return;
      var t = ThemeSystem.THEMES[key];
      presets.push({
        id: key,
        builtinKey: key,
        name: t.name || key,
        swatchBg: t.swatchBg || t.bg,
        swatchAccent: getSwatchAccentFromTheme(t),
        config: null,
        locked: true
      });
    });
    return {
      version: CATALOG_VERSION,
      presets: presets
    };
  }

  function normalizeCatalog(raw) {
    if (!raw || !raw.presets || !raw.presets.length) return null;
    var presets = raw.presets.slice(0, MAX_PRESETS).map(function (item) {
      if (!item || !item.id) return null;
      var preset = {
        id: String(item.id),
        builtinKey: item.builtinKey || null,
        name: String(item.name || item.id),
        swatchBg: item.swatchBg || null,
        swatchAccent: item.swatchAccent || null,
        config: item.config ? ThemeSystem.normalizeCustomConfig(item.config) : null,
        locked: item.locked !== false
      };
      if (preset.config) {
        preset.swatchBg = preset.swatchBg || preset.config.bg;
        preset.swatchAccent = preset.swatchAccent || preset.config.accent;
      }
      return preset;
    }).filter(Boolean);

    if (presets.length < MIN_PRESETS) return null;
    return { version: CATALOG_VERSION, presets: presets };
  }

  function readFromProject(project) {
    if (!project) return null;
    var config = project.proyecto_config;
    if (Array.isArray(config)) config = config[0];
    if (!config || !config.project_preset_themes) return null;
    return normalizeCatalog(config.project_preset_themes);
  }

  function getCatalog(project) {
    project = project || window.PROJECT_DATA;
    var stored = readFromProject(project);
    if (stored) {
      cachedCatalog = stored;
      return stored;
    }
    cachedCatalog = seedFromBuiltin();
    return cachedCatalog;
  }

  function getPresets(project) {
    return getCatalog(project).presets;
  }

  function findPreset(presetId) {
    return getPresets().find(function (p) { return p.id === presetId; }) || null;
  }

  function exportPresetConfig(preset) {
    if (!preset) return ThemeSystem.getDefaultCustomTheme();
    if (preset.config) return ThemeSystem.normalizeCustomConfig(preset.config);
    if (preset.builtinKey && ThemeSystem.THEMES[preset.builtinKey]) {
      return ThemeSystem.exportCustomConfigFromKey(preset.builtinKey);
    }
    return ThemeSystem.getDefaultCustomTheme();
  }

  function getPresetSwatchColors(preset) {
    if (preset.swatchBg && preset.swatchAccent) {
      return { bg: preset.swatchBg, accent: preset.swatchAccent };
    }
    var cfg = exportPresetConfig(preset);
    return { bg: cfg.bg, accent: cfg.accent };
  }

  function buildApplyPayload(preset) {
    if (preset.config) {
      return Object.assign({}, ThemeSystem.normalizeCustomConfig(preset.config), {
        themeKey: ThemeSystem.CUSTOM_THEME_KEY,
        presetId: preset.id
      });
    }
    if (preset.builtinKey && ThemeSystem.THEMES[preset.builtinKey]) {
      return { themeKey: preset.builtinKey, presetId: preset.id };
    }
    return { themeKey: ThemeSystem.getCurrentKey(), presetId: preset.id };
  }

  function applyPreset(preset) {
    var payload = buildApplyPayload(preset);
    if (payload.themeKey === ThemeSystem.CUSTOM_THEME_KEY) {
      return VisitorPersonalization.applyThemeConfig(payload);
    }
    VisitorPersonalization.setThemeKey(payload.themeKey);
    return { ok: true };
  }

  function validateCatalog(catalog) {
    if (!catalog || !catalog.presets) {
      throw new Error('Catálogo de temas inválido.');
    }
    if (catalog.presets.length < MIN_PRESETS) {
      throw new Error('Debe haber al menos ' + MIN_PRESETS + ' temas oficiales.');
    }
    if (catalog.presets.length > MAX_PRESETS) {
      throw new Error('Máximo ' + MAX_PRESETS + ' temas oficiales.');
    }
  }

  async function persistCatalog(catalog) {
    if (!canManage()) {
      throw new Error('Solo los administradores pueden modificar los temas oficiales.');
    }
    var normalized = normalizeCatalog(catalog);
    if (!normalized) {
      throw new Error('El catálogo no cumple los requisitos mínimos.');
    }
    validateCatalog(normalized);
    var proyectoId = getProyectoId();
    if (!proyectoId) {
      throw new Error('No se encontró el proyecto activo.');
    }
    var saved = await ProjectPresetThemesApi.setCatalog(proyectoId, normalized);
    cachedCatalog = normalizeCatalog(saved) || normalized;
    return cachedCatalog;
  }

  async function updatePreset(presetId, patch) {
    var catalog = getCatalog();
    var index = catalog.presets.findIndex(function (p) { return p.id === presetId; });
    if (index === -1) {
      throw new Error('No se encontró el tema oficial.');
    }
    var current = catalog.presets[index];
    var next = Object.assign({}, current, patch || {});
    if (patch && patch.config) {
      next.config = ThemeSystem.normalizeCustomConfig(patch.config);
      next.swatchBg = patch.swatchBg || next.config.bg;
      next.swatchAccent = patch.swatchAccent || next.config.accent;
      next.locked = true;
    }
    if (patch && patch.name) next.name = String(patch.name).trim() || current.name;
    catalog.presets[index] = next;
    return persistCatalog(catalog);
  }

  async function deletePreset(presetId) {
    var catalog = getCatalog();
    if (catalog.presets.length <= MIN_PRESETS) {
      throw new Error('No puedes eliminar más temas. Mínimo ' + MIN_PRESETS + ' oficiales.');
    }
    catalog.presets = catalog.presets.filter(function (p) { return p.id !== presetId; });
    return persistCatalog(catalog);
  }

  function invalidateCache() {
    cachedCatalog = null;
  }

  return {
    MIN_PRESETS: MIN_PRESETS,
    MAX_PRESETS: MAX_PRESETS,
    canManage: canManage,
    getCatalog: getCatalog,
    getPresets: getPresets,
    findPreset: findPreset,
    exportPresetConfig: exportPresetConfig,
    getPresetSwatchColors: getPresetSwatchColors,
    buildApplyPayload: buildApplyPayload,
    applyPreset: applyPreset,
    updatePreset: updatePreset,
    deletePreset: deletePreset,
    persistCatalog: persistCatalog,
    invalidateCache: invalidateCache,
    seedFromBuiltin: seedFromBuiltin
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/platform/project-preset-themes.js');}catch(_e){}
