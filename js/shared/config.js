/* Shared Supabase project configuration (public read + admin auth) */
var SUPABASE_URL = 'https://emefdwzdfnqgjohbtvvn.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
var DEFAULT_PROJECT_SLUG = 'proyecto-demo';
var SHOWROOM_DEV_URL = 'http://localhost:8765/index.html?proyecto=' + DEFAULT_PROJECT_SLUG;

/* Pantalla de pausa al volver a la pestaña (navResumeGate / PauseScreen).
   false = desactivada temporalmente. Cambiar a true para reactivarla. */
var NAV_RESUME_GATE_ENABLED = false;

var PROJECT_DEFAULT_THEME_FALLBACK = {
  themeKey: 'custom',
  bg: '#161616',
  menuColor: '#1a1a1a',
  surface: '#2a2a2a',
  accent: '#8f1d1d',
  maskColor: '#000000',
  maskGlass: 'soft',
  maskBlur: 'medium',
  textMode: 'light',
  visualDepth: 'high',
  bgGlass: 'soft',
  panelGlass: 'soft',
  buttonGlass: 'soft',
  borderGlass: 'solid',
  shadowGlass: 'soft',
  heroSurface: '#8f1d1d',
  heroButtonGlass: 'soft',
  heroBorderGlass: 'solid'
};

/* Configuración del extractor de temas (sin LLM para colores) */
var THEME_AI_CONFIG = {
  provider: 'extract-only',
  endpoint: null
};
window.THEME_AI_CONFIG = THEME_AI_CONFIG;
