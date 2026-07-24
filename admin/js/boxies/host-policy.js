/* BOXIES V5.3.2 — Host freeze markers (compatibility adapters).
 * Product development MUST target /boxies only.
 * /admin and /admin2 remain reachable for legacy deep-links but must not receive new features.
 */
var BoxiesHostPolicy = (function () {
  var CANONICAL = '/boxies/';
  var LEGACY_PREFIXES = ['/admin', '/admin2'];

  function pathname() {
    try {
      return String(window.location.pathname || '');
    } catch (e) {
      return '';
    }
  }

  function isLegacyHost() {
    var path = pathname().replace(/\/+$/, '') || '/';
    return LEGACY_PREFIXES.some(function (prefix) {
      return path === prefix || path.indexOf(prefix + '/') === 0;
    });
  }

  function canonicalUrl(query) {
    try {
      var url = new URL(CANONICAL, window.location.origin);
      if (query && typeof query === 'object') {
        Object.keys(query).forEach(function (key) {
          if (query[key] != null && query[key] !== '') {
            url.searchParams.set(key, String(query[key]));
          }
        });
      }
      return url.href;
    } catch (e) {
      return CANONICAL;
    }
  }

  return {
    CANONICAL: CANONICAL,
    isLegacyHost: isLegacyHost,
    canonicalUrl: canonicalUrl
  };
})();
