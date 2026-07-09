/* Caché temporal de propuestas de tema IA (misma sesión de navegador) */
var ThemeAISession = (function () {
  var STORAGE_KEY = 'guilie_theme_ai_session_v3';

  function readRaw() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function writeRaw(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  function get(fingerprint) {
    var data = readRaw();
    if (!data || !fingerprint || data.fingerprint !== fingerprint) return null;
    return data;
  }

  function save(payload) {
    if (!payload || !payload.fingerprint) return false;
    return writeRaw({
      fingerprint: payload.fingerprint,
      fileName: payload.fileName || '',
      brandProfile: payload.brandProfile || null,
      proposals: payload.proposals || [],
      createdAt: payload.createdAt || Date.now()
    });
  }

  function clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) { /* ignore */ }
  }

  function hasValid(fingerprint) {
    var data = get(fingerprint);
    return !!(data && data.proposals && data.proposals.length);
  }

  return {
    get: get,
    save: save,
    clear: clear,
    hasValid: hasValid
  };
})();
