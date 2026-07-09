/* Style Engine — Design Tokens (v2, aislado del Theme Editor) */
var StyleEngineTokens = (function () {
  var VERSION = 2;

  /**
   * Reglas del motor: solo se persisten valores de tokens, no estilos sueltos.
   * Cada token se expone como --se-{key} en :root cuando el runtime está activo.
   */
  var CATEGORIES = [
    {
      id: 'surfaces',
      label: 'Superficies',
      tokens: [
        { key: 'surface', label: 'Surface', type: 'color', default: '#111111' },
        { key: 'surface-elevated', label: 'Surface elevated', type: 'color', default: '#181818' },
        { key: 'surface-floating', label: 'Surface floating', type: 'color', default: '#1f1f1f' },
        { key: 'overlay', label: 'Overlay', type: 'color', default: 'rgba(0,0,0,0.62)' }
      ]
    },
    {
      id: 'colors',
      label: 'Colores',
      tokens: [
        { key: 'color-primary', label: 'Primary', type: 'color', default: '#ffffff' },
        { key: 'color-secondary', label: 'Secondary', type: 'color', default: '#b8b8b8' },
        { key: 'color-accent', label: 'Accent', type: 'color', default: '#c8873a' },
        { key: 'color-success', label: 'Success', type: 'color', default: '#3ecf8e' },
        { key: 'color-warning', label: 'Warning', type: 'color', default: '#e8b339' },
        { key: 'color-error', label: 'Error', type: 'color', default: '#e85d5d' },
        { key: 'text-primary', label: 'Text primary', type: 'color', default: '#ffffff' },
        { key: 'text-secondary', label: 'Text secondary', type: 'color', default: '#c8c8c8' },
        { key: 'text-muted', label: 'Text muted', type: 'color', default: '#8a8a8a' },
        { key: 'border', label: 'Border', type: 'color', default: 'rgba(255,255,255,0.1)' },
        { key: 'divider', label: 'Divider', type: 'color', default: 'rgba(255,255,255,0.07)' }
      ]
    },
    {
      id: 'typography',
      label: 'Tipografía',
      tokens: [
        { key: 'font-family-base', label: 'Familia base', type: 'text', default: 'system-ui, sans-serif' },
        { key: 'font-size-base', label: 'Tamaño base', type: 'unit', unit: 'px', min: 12, max: 20, default: 16 },
        { key: 'font-size-scale', label: 'Escala tipográfica', type: 'number', min: 1, max: 1.5, step: 0.02, default: 1.12 },
        { key: 'font-weight-heading', label: 'Peso títulos', type: 'number', min: 400, max: 800, step: 100, default: 600 },
        { key: 'letter-spacing-ui', label: 'Tracking UI', type: 'unit', unit: 'em', min: 0, max: 0.2, step: 0.01, default: 0.08 }
      ]
    },
    {
      id: 'borders',
      label: 'Bordes',
      tokens: [
        { key: 'border-width', label: 'Grosor', type: 'unit', unit: 'px', min: 0, max: 4, default: 1 },
        { key: 'border-style', label: 'Estilo', type: 'select', options: ['solid', 'dashed', 'none'], default: 'solid' }
      ]
    },
    {
      id: 'radius',
      label: 'Radios',
      tokens: [
        { key: 'radius-sm', label: 'Radio SM', type: 'unit', unit: 'px', min: 0, max: 24, default: 8 },
        { key: 'radius-md', label: 'Radio MD', type: 'unit', unit: 'px', min: 0, max: 32, default: 12 },
        { key: 'radius-lg', label: 'Radio LG', type: 'unit', unit: 'px', min: 0, max: 40, default: 16 },
        { key: 'radius-card', label: 'Card radius', type: 'unit', unit: 'px', min: 0, max: 40, default: 16 },
        { key: 'radius-popup', label: 'Popup radius', type: 'unit', unit: 'px', min: 0, max: 40, default: 16 },
        { key: 'radius-button', label: 'Button radius', type: 'unit', unit: 'px', min: 0, max: 32, default: 10 }
      ]
    },
    {
      id: 'spacing',
      label: 'Espaciados',
      tokens: [
        { key: 'spacing-xs', label: 'XS', type: 'unit', unit: 'px', min: 0, max: 24, default: 6 },
        { key: 'spacing-sm', label: 'SM', type: 'unit', unit: 'px', min: 0, max: 32, default: 10 },
        { key: 'spacing-md', label: 'MD', type: 'unit', unit: 'px', min: 0, max: 48, default: 16 },
        { key: 'spacing-lg', label: 'LG', type: 'unit', unit: 'px', min: 0, max: 64, default: 24 },
        { key: 'spacing-xl', label: 'XL', type: 'unit', unit: 'px', min: 0, max: 80, default: 32 },
        { key: 'density', label: 'Densidad', type: 'number', min: 0.8, max: 1.3, step: 0.05, default: 1 }
      ]
    },
    {
      id: 'shadows',
      label: 'Sombras',
      tokens: [
        { key: 'shadow-sm', label: 'Shadow SM', type: 'text', default: '0 2px 8px rgba(0,0,0,0.18)' },
        { key: 'shadow-md', label: 'Shadow MD', type: 'text', default: '0 8px 24px rgba(0,0,0,0.24)' },
        { key: 'shadow-lg', label: 'Shadow LG', type: 'text', default: '0 16px 48px rgba(0,0,0,0.32)' },
        { key: 'shadow-card', label: 'Card shadow', type: 'text', default: '0 10px 28px rgba(0,0,0,0.22)' },
        { key: 'shadow-popup', label: 'Popup shadow', type: 'text', default: '0 20px 56px rgba(0,0,0,0.3)' },
        { key: 'hover-elevation', label: 'Hover elevation', type: 'unit', unit: 'px', min: 0, max: 12, default: 3 }
      ]
    },
    {
      id: 'blur',
      label: 'Blur',
      tokens: [
        { key: 'blur-sm', label: 'Blur SM', type: 'unit', unit: 'px', min: 0, max: 40, default: 6 },
        { key: 'blur-md', label: 'Blur MD', type: 'unit', unit: 'px', min: 0, max: 60, default: 12 },
        { key: 'blur-lg', label: 'Blur LG', type: 'unit', unit: 'px', min: 0, max: 80, default: 22 },
        { key: 'glass-transparency', label: 'Glass transparency', type: 'number', min: 0, max: 1, step: 0.05, default: 0.42 }
      ]
    },
    {
      id: 'depth',
      label: 'Profundidad',
      tokens: [
        { key: 'depth-panel', label: 'Panel depth', type: 'number', min: 0, max: 1, step: 0.05, default: 0.08 },
        { key: 'depth-card', label: 'Card depth', type: 'number', min: 0, max: 1, step: 0.05, default: 0.12 },
        { key: 'depth-popup', label: 'Popup depth', type: 'number', min: 0, max: 1, step: 0.05, default: 0.18 },
        { key: 'overlay-opacity', label: 'Overlay opacity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.62 }
      ]
    },
    {
      id: 'buttons',
      label: 'Botones',
      tokens: [
        { key: 'button-height', label: 'Altura', type: 'unit', unit: 'px', min: 32, max: 56, default: 42 },
        { key: 'button-padding-x', label: 'Padding horizontal', type: 'unit', unit: 'px', min: 8, max: 40, default: 16 },
        { key: 'button-font-size', label: 'Tamaño texto', type: 'unit', unit: 'rem', min: 0.5, max: 1.2, step: 0.02, default: 0.72 },
        { key: 'button-shadow', label: 'Sombra', type: 'text', default: 'none' }
      ]
    },
    {
      id: 'inputs',
      label: 'Inputs',
      tokens: [
        { key: 'input-height', label: 'Altura', type: 'unit', unit: 'px', min: 32, max: 56, default: 40 },
        { key: 'input-radius', label: 'Radio', type: 'unit', unit: 'px', min: 0, max: 24, default: 10 },
        { key: 'input-border', label: 'Borde', type: 'color', default: 'rgba(255,255,255,0.12)' },
        { key: 'focus-outline', label: 'Focus outline', type: 'color', default: 'rgba(200,135,58,0.55)' }
      ]
    },
    {
      id: 'badges',
      label: 'Badges',
      tokens: [
        { key: 'badge-radius', label: 'Radio', type: 'unit', unit: 'px', min: 0, max: 999, default: 999 },
        { key: 'badge-font-size', label: 'Tamaño', type: 'unit', unit: 'rem', min: 0.4, max: 1, step: 0.02, default: 0.56 },
        { key: 'badge-padding-x', label: 'Padding X', type: 'unit', unit: 'px', min: 4, max: 20, default: 9 }
      ]
    },
    {
      id: 'cards',
      label: 'Tarjetas',
      tokens: [
        { key: 'card-padding', label: 'Padding', type: 'unit', unit: 'px', min: 8, max: 40, default: 16 },
        { key: 'card-radius', label: 'Radio', type: 'unit', unit: 'px', min: 0, max: 40, default: 16 },
        { key: 'card-shadow', label: 'Sombra', type: 'text', default: '0 10px 28px rgba(0,0,0,0.22)' },
        { key: 'card-border', label: 'Borde', type: 'color', default: 'rgba(255,255,255,0.08)' }
      ]
    },
    {
      id: 'popups',
      label: 'Popups',
      tokens: [
        { key: 'popup-radius', label: 'Radio', type: 'unit', unit: 'px', min: 0, max: 40, default: 16 },
        { key: 'popup-shadow', label: 'Sombra', type: 'text', default: '0 20px 56px rgba(0,0,0,0.3)' },
        { key: 'popup-background', label: 'Fondo', type: 'color', default: '#141414' },
        { key: 'popup-padding', label: 'Padding', type: 'unit', unit: 'px', min: 12, max: 48, default: 24 }
      ]
    },
    {
      id: 'overlays',
      label: 'Overlays',
      tokens: [
        { key: 'overlay-backdrop', label: 'Backdrop', type: 'color', default: 'rgba(0,0,0,0.55)' },
        { key: 'overlay-blur', label: 'Blur backdrop', type: 'unit', unit: 'px', min: 0, max: 40, default: 8 }
      ]
    },
    {
      id: 'sidebar',
      label: 'Sidebar',
      tokens: [
        { key: 'sidebar-background', label: 'Fondo', type: 'color', default: '#0f0f0f' },
        { key: 'sidebar-width', label: 'Ancho', type: 'unit', unit: 'px', min: 260, max: 480, default: 400 },
        { key: 'sidebar-border', label: 'Borde', type: 'color', default: 'rgba(255,255,255,0.06)' }
      ]
    },
    {
      id: 'tables',
      label: 'Tablas',
      tokens: [
        { key: 'table-row-height', label: 'Altura fila', type: 'unit', unit: 'px', min: 32, max: 72, default: 44 },
        { key: 'table-border', label: 'Borde', type: 'color', default: 'rgba(255,255,255,0.07)' },
        { key: 'table-header-bg', label: 'Fondo header', type: 'color', default: 'rgba(255,255,255,0.04)' }
      ]
    },
    {
      id: 'animations',
      label: 'Animaciones',
      tokens: [
        { key: 'motion-duration', label: 'Duración', type: 'unit', unit: 'ms', min: 80, max: 600, default: 220 },
        { key: 'motion-easing', label: 'Easing', type: 'select', options: ['ease', 'ease-in-out', 'cubic-bezier(0.22,1,0.36,1)'], default: 'cubic-bezier(0.22,1,0.36,1)' },
        { key: 'transition-speed', label: 'Velocidad global', type: 'unit', unit: 'ms', min: 80, max: 600, default: 220 }
      ]
    }
  ];

  var tokenIndex = null;

  function buildIndex() {
    if (tokenIndex) return tokenIndex;
    tokenIndex = {};
    CATEGORIES.forEach(function (cat) {
      cat.tokens.forEach(function (token) {
        tokenIndex[token.key] = Object.assign({ categoryId: cat.id }, token);
      });
    });
    return tokenIndex;
  }

  function getDefaultRules() {
    var rules = {};
    buildIndex();
    Object.keys(tokenIndex).forEach(function (key) {
      rules[key] = tokenIndex[key].default;
    });
    return rules;
  }

  function normalizeRules(input) {
    var defaults = getDefaultRules();
    var out = Object.assign({}, defaults);
    if (!input || typeof input !== 'object') return out;
    Object.keys(input).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(defaults, key) && input[key] != null && input[key] !== '') {
        out[key] = input[key];
      }
    });
    return out;
  }

  function cssVarName(tokenKey) {
    return '--se-' + tokenKey;
  }

  function getCategories() {
    return CATEGORIES.slice();
  }

  function getTokenMeta(key) {
    return buildIndex()[key] || null;
  }

  var TOKEN_DOCS = {
    'surface': { description: 'Fondo base de paneles y layouts.', usage: 'Sidebar, fondos de escena, landing.' },
    'surface-elevated': { description: 'Superficie elevada sobre el fondo base.', usage: 'Tarjetas, bloques de contenido.' },
    'radius-card': { description: 'Radio de esquinas de tarjetas.', usage: 'Viviendas, favoritos, comparador, popups.' },
    'card-shadow': { description: 'Sombra aplicada a todas las tarjetas.', usage: 'Grid de viviendas, comparador, favoritos.' },
    'popup-shadow': { description: 'Sombra de modales y popups.', usage: 'Calculadora, planos, Style Engine.' },
    'color-accent': { description: 'Color de acento de marca.', usage: 'CTA, badges destacados, indicadores.' },
    'text-primary': { description: 'Texto principal de la interfaz.', usage: 'Títulos, precios, labels activos.' },
    'button-height': { description: 'Altura estándar de botones.', usage: 'Primarios, secundarios, acciones de tarjeta.' },
    'motion-duration': { description: 'Duración base de transiciones.', usage: 'Hover, apertura de modales, microinteracciones.' }
  };

  function getTokenDoc(key) {
    var meta = getTokenMeta(key);
    var doc = TOKEN_DOCS[key] || {};
    return {
      name: meta ? meta.label : key,
      description: doc.description || 'Token del Design System.',
      usage: doc.usage || 'Componentes migrados al Style Engine.'
    };
  }

  return {
    VERSION: VERSION,
    getCategories: getCategories,
    getDefaultRules: getDefaultRules,
    normalizeRules: normalizeRules,
    cssVarName: cssVarName,
    getTokenMeta: getTokenMeta,
    getTokenDoc: getTokenDoc
  };
})();
