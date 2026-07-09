/* Style Engine — Biblioteca de presets (oficiales, inspiración, personales) */
var StyleEnginePresets = (function () {
  var PERSONAL_KEY = 'boxies_style_engine_personal_presets_v2';

  function base(overrides) {
    return Object.assign({}, StyleEngineTokens.getDefaultRules(), overrides || {});
  }

  var OFFICIAL = [
    { id: 'minimal-dark', name: 'Minimal Dark', rules: base({
      surface: '#0a0a0a', 'surface-elevated': '#141414', 'color-accent': '#e8e8e8',
      'text-primary': '#f5f5f5', 'radius-card': 12, 'card-shadow': '0 8px 24px rgba(0,0,0,0.28)',
      density: 0.95
    })},
    { id: 'luxury-gold', name: 'Luxury Gold', rules: base({
      surface: '#0d0c0a', 'surface-elevated': '#161410', 'color-accent': '#c9a227',
      'text-primary': '#f8f4ea', 'text-secondary': '#d4c4a0', 'radius-card': 18,
      'card-shadow': '0 14px 40px rgba(0,0,0,0.38)', density: 1.05
    })},
    { id: 'corporate-blue', name: 'Corporate Blue', rules: base({
      surface: '#0b1118', 'surface-elevated': '#121c28', 'color-accent': '#3d7dd4',
      'text-primary': '#eef4fc', 'radius-card': 10, density: 1
    })},
    { id: 'glass', name: 'Glass', rules: base({
      surface: 'rgba(18,18,22,0.55)', 'surface-elevated': 'rgba(24,24,30,0.62)',
      'glass-transparency': 0.55, 'blur-md': 18, 'blur-lg': 28, 'radius-card': 16
    })},
    { id: 'soft', name: 'Soft', rules: base({
      surface: '#161618', 'surface-elevated': '#1e1e22', 'color-accent': '#9b8fd4',
      'radius-card': 20, 'radius-button': 14, 'card-shadow': '0 6px 20px rgba(0,0,0,0.16)',
      density: 1.08
    })},
    { id: 'industrial', name: 'Industrial', rules: base({
      surface: '#121212', 'surface-elevated': '#1a1a1a', 'color-accent': '#ff6b35',
      'radius-card': 4, 'radius-button': 4, 'font-weight-heading': 700, density: 0.92
    })},
    { id: 'nature', name: 'Nature', rules: base({
      surface: '#0f1410', 'surface-elevated': '#162018', 'color-accent': '#6b9b6e',
      'text-primary': '#eef5ee', 'radius-card': 14
    })},
    { id: 'night', name: 'Night', rules: base({
      surface: '#050508', 'surface-elevated': '#0c0c12', 'color-accent': '#7b8cff',
      'text-primary': '#ececff', 'overlay-opacity': 0.72
    })},
    { id: 'concrete', name: 'Concrete', rules: base({
      surface: '#1a1a1a', 'surface-elevated': '#242424', 'color-accent': '#a0a0a0',
      'text-primary': '#e6e6e6', 'radius-card': 8
    })},
    { id: 'premium', name: 'Premium', rules: base({
      surface: '#0e0e10', 'surface-elevated': '#17171c', 'color-accent': '#d4af37',
      'text-primary': '#ffffff', 'radius-card': 16, 'card-shadow': '0 12px 36px rgba(0,0,0,0.32)',
      'button-height': 44, density: 1.02
    })}
  ];

  var INSPIRATION = [
    { id: 'insp-apple', name: 'Apple', rules: base({ surface: '#000000', 'surface-elevated': '#1c1c1e', 'color-accent': '#0a84ff', 'radius-card': 14, density: 1.05 })},
    { id: 'insp-tesla', name: 'Tesla', rules: base({ surface: '#0b0b0b', 'color-accent': '#e82127', 'radius-card': 8, 'font-weight-heading': 600 })},
    { id: 'insp-mercedes', name: 'Mercedes', rules: base({ surface: '#0a0a0c', 'color-accent': '#00adef', 'text-primary': '#f0f0f2', 'radius-card': 12 })},
    { id: 'insp-rolex', name: 'Rolex', rules: base({ surface: '#0a120d', 'color-accent': '#127749', 'text-primary': '#f5f7f4', 'radius-card': 16 })},
    { id: 'insp-airbnb', name: 'Airbnb', rules: base({ surface: '#111111', 'color-accent': '#ff385c', 'radius-card': 16, density: 1.06 })},
    { id: 'insp-spotify', name: 'Spotify', rules: base({ surface: '#0b0b0b', 'color-accent': '#1db954', 'radius-card': 12 })},
    { id: 'insp-netflix', name: 'Netflix', rules: base({ surface: '#0b0b0b', 'color-accent': '#e50914', 'radius-card': 10 })},
    { id: 'insp-booking', name: 'Booking', rules: base({ surface: '#0f1624', 'color-accent': '#003580', 'radius-card': 12 })},
    { id: 'insp-porsche', name: 'Porsche', rules: base({ surface: '#0c0c0c', 'color-accent': '#d5001c', 'radius-card': 10, density: 0.98 })},
    { id: 'insp-volvo', name: 'Volvo', rules: base({ surface: '#0e1114', 'color-accent': '#1c6eba', 'radius-card': 12 })}
  ];

  function loadPersonal() {
    try {
      var raw = localStorage.getItem(PERSONAL_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function savePersonal(list) {
    try {
      localStorage.setItem(PERSONAL_KEY, JSON.stringify(list));
    } catch (e) { /* quota */ }
  }

  function getOfficial() { return OFFICIAL.slice(); }
  function getInspiration() { return INSPIRATION.slice(); }
  function getPersonal() { return loadPersonal(); }

  function findById(id) {
    var all = OFFICIAL.concat(INSPIRATION).concat(loadPersonal());
    return all.find(function (p) { return p.id === id; }) || null;
  }

  function savePersonalPreset(name, rules, source) {
    var list = loadPersonal();
    var id = 'personal-' + Date.now();
    list.unshift({
      id: id,
      name: name,
      rules: StyleEngineTokens.normalizeRules(rules),
      source: source || 'manual',
      createdAt: new Date().toISOString()
    });
    savePersonal(list);
    return id;
  }

  function duplicatePersonal(id) {
    var preset = findById(id);
    if (!preset) return null;
    return savePersonalPreset(preset.name + ' (copia)', preset.rules, 'duplicate');
  }

  function renamePersonal(id, name) {
    var list = loadPersonal();
    var item = list.find(function (p) { return p.id === id; });
    if (!item) return false;
    item.name = name;
    savePersonal(list);
    return true;
  }

  function deletePersonal(id) {
    var list = loadPersonal().filter(function (p) { return p.id !== id; });
    savePersonal(list);
  }

  return {
    getOfficial: getOfficial,
    getInspiration: getInspiration,
    getPersonal: getPersonal,
    findById: findById,
    savePersonalPreset: savePersonalPreset,
    duplicatePersonal: duplicatePersonal,
    renamePersonal: renamePersonal,
    deletePersonal: deletePersonal
  };
})();
