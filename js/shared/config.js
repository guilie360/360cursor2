/* Shared Supabase project configuration (public read + admin auth) */
var SUPABASE_URL = 'https://emefdwzdfnqgjohbtvvn.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
var DEFAULT_PROJECT_SLUG = 'proyecto-demo';
var SHOWROOM_DEV_URL = 'http://localhost:8765/index.html?proyecto=' + DEFAULT_PROJECT_SLUG;
var PROJECT_DEFAULT_THEME_FALLBACK = {
  themeKey: 'custom',
  bg: '#111111',
  menuColor: '#1a1a1a',
  surface: '#840808',
  accent: '#8f1d1d',
  textMode: 'light',
  visualDepth: 'high',
  bgGlass: 'solid',
  panelGlass: 'solid',
  buttonGlass: 'solid',
  borderGlass: 'solid',
  shadowGlass: 'soft',
  heroSurface: '#840808',
  heroButtonGlass: 'solid',
  heroBorderGlass: 'solid'
};

/* Configuración del extractor de temas (sin LLM para colores) */
var THEME_AI_CONFIG = {
  provider: 'extract-only',
  endpoint: null
};
window.THEME_AI_CONFIG = THEME_AI_CONFIG;
