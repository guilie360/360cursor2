console.log("BOOT ENTER js/auth/client.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/auth/client.js');}catch(_e){}
/* Shared Supabase Auth client — supports Remember me via storage selection */
var PlatformAuth = (function () {
  var client = null;
  var storageMode = null;

  function createClient(options) {
    var remember = !options || options.remember !== false;
    var mode = remember ? 'local' : 'session';

    if (client && storageMode === mode) return client;

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
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: remember ? window.localStorage : window.sessionStorage
      }
    });

    storageMode = mode;
    return client;
  }

  function resetClient() {
    client = null;
    storageMode = null;
  }

  function getClient() {
    if (!client) {
      return createClient({ remember: AuthStoragePrefs.getRememberMe() });
    }
    return client;
  }

  return {
    createClient: createClient,
    getClient: getClient,
    resetClient: resetClient
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/auth/client.js');}catch(_e){}

console.log("BOOT EXIT js/auth/client.js");
