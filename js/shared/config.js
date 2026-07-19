/* Shared Supabase project configuration (public read + admin auth) */
var SUPABASE_URL = 'https://emefdwzdfnqgjohbtvvn.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
var DEFAULT_PROJECT_SLUG = 'proyecto-demo';
var SHOWROOM_DEV_URL = 'http://127.0.0.1:8765/index.html?proyecto=' + DEFAULT_PROJECT_SLUG;

/**
 * Resolve project slug from the URL only.
 * Priority: ?proyecto=… → first pathname segment (/demo → "demo").
 * "/" and "/index.html" → null (no project; future platform landing).
 */
function getProjectSlugFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var fromQuery = params.get('proyecto');
    if (fromQuery) return fromQuery;

    var path = window.location.pathname || '/';
    path = path.replace(/\/+$/, '') || '/';
    if (path === '/' || /^\/index\.html$/i.test(path)) return null;

    var segments = path.split('/').filter(Boolean);
    if (!segments.length) return null;

    var first = segments[0];
    var reserved = {
      admin: 1,
      auth: 1,
      css: 1,
      js: 1,
      supabase: 1,
      assets: 1,
      images: 1,
      'wp-content': 1
    };
    if (reserved[first]) return null;
    if (/\.[a-z0-9]+$/i.test(first)) return null;

    return first;
  } catch (e) {
    return null;
  }
}

/* Pantalla de pausa al volver a la pestaña (navResumeGate / PauseScreen).
   false = desactivada temporalmente. Cambiar a true para reactivarla. */
var NAV_RESUME_GATE_ENABLED = false;

/*
 * HALL — estilo oficial (como se ve en file:// con el look correcto).
 * Máscara/Superficies/Menú: Cristal · Botones: Sólido negro
 * Hover: Cristal · Sombras: Alta · Viñeta: Media · Texto: Claro
 * Portada: Posición 2 (EXPLORAR | título | INICIAR)
 */
var PROJECT_DEFAULT_THEME_FALLBACK = {
  themeKey: 'custom',
  bg: '#000000',
  menuColor: '#000000',
  surface: '#000000',
  accent: '#000000',
  hoverColor: '#2a2a2a',
  maskColor: '#000000',
  maskGlass: 'glass',
  maskBlur: 'medium',
  textMode: 'light',
  bgTextMode: 'light',
  visualDepth: 'medium',
  bgGlass: 'glass',
  panelGlass: 'glass',
  buttonGlass: 'solid',
  borderGlass: 'solid',
  buttonBorderColor: '#000000',
  buttonBorderWidth: 'medium',
  buttonHoverBorderColor: '#000000',
  buttonHoverBorderWidth: 'low',
  buttonHoverTextColor: '#ffffff',
  buttonHoverGlass: 'glass',
  shadowGlass: 'solid',
  heroSurface: '#000000',
  heroHoverColor: '#2a2a2a',
  heroButtonGlass: 'solid',
  heroBorderGlass: 'solid',
  heroLayout: 'bottom-bar'
};
var PROJECT_DEFAULT_STYLE_NAME = 'HALL';
var PROJECT_DEFAULT_STYLE_ID = 'project-default-hall';

/* Configuración del extractor de temas (sin LLM para colores) */
var THEME_AI_CONFIG = {
  provider: 'extract-only',
  endpoint: null
};
window.THEME_AI_CONFIG = THEME_AI_CONFIG;
