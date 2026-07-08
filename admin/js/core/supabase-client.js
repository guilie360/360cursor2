/* Admin panel — authenticated Supabase JS client (isolated from public REST client) */
var AdminSupabase = (function () {
  var client = null;

  function createClient() {
    if (client) return client;
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase SDK no cargó correctamente.');
    }
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
      throw new Error('Configuración de Supabase no encontrada.');
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    return client;
  }

  function getClient() {
    return client || createClient();
  }

  return {
    createClient: createClient,
    getClient: getClient
  };
})();
