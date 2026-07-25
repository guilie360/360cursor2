/* Shared Supabase project configuration (public read + admin auth) */
var SUPABASE_URL = 'https://emefdwzdfnqgjohbtvvn.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
var DEFAULT_PROJECT_SLUG = 'demo1';
var SHOWROOM_DEV_URL = 'http://127.0.0.1:8765/demo1';

/**
 * Resolve project slug from the URL only.
 * Priority: ?proyecto=… → first pathname segment (/demo → "demo").
 * "/" and "/index.html" → null (no project; platform landing at /).
 */
function getProjectSlugFromUrl() {
  var slug = null;
  try {
    var params = new URLSearchParams(window.location.search || '');
    var fromQuery = params.get('proyecto');
    if (fromQuery) {
      slug = fromQuery;
    } else {
      var path = window.location.pathname || '/';
      path = path.replace(/\/+$/, '') || '/';
      if (path !== '/' && !/^\/index\.html$/i.test(path)) {
        var segments = path.split('/').filter(Boolean);
        if (segments.length) {
          var first = segments[0];
          var reserved = {
            admin: 1,
            admin2: 1,
            auth: 1,
            boxies: 1,
            landing: 1,
            login: 1,
            css: 1,
            js: 1,
            supabase: 1,
            assets: 1,
            images: 1,
            'wp-content': 1
          };
          if (!reserved[first] && !/\.[a-z0-9]+$/i.test(first)) {
            slug = first;
          }
        }
      }
    }
  } catch (e) {
    slug = null;
  }
  console.log('[SLUG]', {
    pathname: location.pathname,
    search: location.search,
    slug: slug
  });
  return slug;
}

/* Pantalla de pausa al volver a la pestaña (navResumeGate / PauseScreen).
   false = desactivada temporalmente. Cambiar a true para reactivarla. */
var NAV_RESUME_GATE_ENABLED = false;

/*
 * HALL — Design System oficial de BOXIES (no solo un tema de proyecto).
 * Toda superficie de plataforma (showroom, login, Global Admin, builder, tools)
 * debe nacer y verse con este ADN. Ver .cursor/rules/hall-design-system.mdc
 *
 * Máscara/Superficies/Menú: Cristal · Botones: Sólido negro
 * Hover: Cristal · Sombras: Alta · Viñeta: Media · Texto: Claro
 * Portada: Posición 2 (EXPLORAR | título | INICIAR)
 */
var PROJECT_DEFAULT_THEME_FALLBACK = Object.freeze({
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
});
var PROJECT_DEFAULT_STYLE_NAME = 'HALL';
var PROJECT_DEFAULT_STYLE_ID = 'project-default-hall';

/**
 * TEMP Cached Egress guard — never assign Supabase Storage URLs to <video>.
 * Local blob:/data: previews (fresh uploads) remain allowed.
 */
function isLocalMediaUrl(url) {
  var u = String(url || '');
  return u.indexOf('blob:') === 0 || u.indexOf('data:') === 0;
}

function isSupabaseStorageUrl(url) {
  var u = String(url || '');
  if (!u) return false;
  return (
    u.indexOf('/storage/v1/object/') !== -1 ||
    u.indexOf('supabase.co/storage') !== -1 ||
    u.indexOf('proyectos-media/') !== -1
  );
}

/** Only blob/data URLs may be set on <video src> while egress guard is active. */
function isPlayableHeroVideoUrl(url) {
  return isLocalMediaUrl(url);
}

function sanitizeHeroVideoUrl(url) {
  return isPlayableHeroVideoUrl(url) ? String(url) : null;
}

function isRemoteHeroVideoUrl(url) {
  var u = String(url || '');
  if (!u) return false;
  if (isLocalMediaUrl(u)) return false;
  return /^https?:\/\//i.test(u) || isSupabaseStorageUrl(u);
}

/* Configuración del extractor de temas (sin LLM para colores) */
var THEME_AI_CONFIG = {
  provider: 'extract-only',
  endpoint: null
};
window.THEME_AI_CONFIG = THEME_AI_CONFIG;
