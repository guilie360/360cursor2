/**
 * ShowroomPublicUrl — single place to build public showroom addresses.
 *
 * Today:  https://360preventa.com/{slug}  (path mode)
 * Future: https://{slug}.360preventa.com  (subdomain mode)
 *
 * Flip MODE without touching identity model or CMS screens.
 */
var ShowroomPublicUrl = (function () {
  var MODE = 'path'; /* 'path' | 'subdomain' */
  var HOST = '360preventa.com';
  var RESERVED_SLUGS = {
    admin: 1,
    login: 1,
    api: 1,
    boxies: 1,
    builder: 1,
    hall: 1,
    assets: 1,
    auth: 1,
    landing: 1,
    www: 1,
    app: 1
  };

  function stripDiacritics(value) {
    try {
      return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
      return String(value || '');
    }
  }

  function normalizeSlug(raw, options) {
    options = options || {};
    var s = stripDiacritics(raw)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/g, '');
    if (!options.allowTrailingHyphen) {
      s = s.replace(/-+$/g, '');
    }
    if (s.length > 60) s = s.slice(0, 60).replace(/-+$/g, '');
    return s;
  }

  function isReservedSlug(slug) {
    return !!RESERVED_SLUGS[String(slug || '').toLowerCase()];
  }

  function isValidSlugFormat(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || '')) && String(slug).length <= 60;
  }

  function originBase() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        /* Prefer live origin in local/dev so Preview matches the host in use */
        var host = window.location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1' || /\.local$/i.test(host)) {
          return window.location.origin;
        }
      }
    } catch (e) {}
    return 'https://' + HOST;
  }

  /** Canonical production-style URL for display in CMS (always 360preventa.com). */
  function displayUrl(slug) {
    var s = normalizeSlug(slug);
    if (!s) return 'https://' + HOST + '/';
    if (MODE === 'subdomain') {
      return 'https://' + s + '.' + HOST;
    }
    return 'https://' + HOST + '/' + encodeURIComponent(s);
  }

  /** Runtime open URL (respects current origin in local/dev). */
  function href(slug) {
    var s = normalizeSlug(slug);
    if (!s) return originBase() + '/';
    if (MODE === 'subdomain') {
      try {
        var host = typeof window !== 'undefined' ? window.location.hostname : '';
        if (host === 'localhost' || host === '127.0.0.1') {
          return originBase() + '/' + encodeURIComponent(s);
        }
      } catch (e) {}
      return 'https://' + s + '.' + HOST;
    }
    return originBase().replace(/\/$/, '') + '/' + encodeURIComponent(s);
  }

  return {
    MODE: MODE,
    HOST: HOST,
    RESERVED_SLUGS: RESERVED_SLUGS,
    normalizeSlug: normalizeSlug,
    isReservedSlug: isReservedSlug,
    isValidSlugFormat: isValidSlugFormat,
    displayUrl: displayUrl,
    href: href
  };
})();
