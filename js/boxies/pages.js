/** BOXIES Page Registry — pages declare mount/unmount; Shell owns chrome. */
var BoxiesPages = (function () {
  var registry = Object.create(null);

  function register(page) {
    if (!page || !page.id || typeof page.mount !== 'function') {
      throw new Error('[boxies:pages] register requires { id, mount }');
    }
    registry[page.id] = {
      id: page.id,
      title: page.title || page.id,
      mount: page.mount,
      unmount: typeof page.unmount === 'function' ? page.unmount : function () {}
    };
    return registry[page.id];
  }

  function get(id) {
    return registry[id] || null;
  }

  function list() {
    return Object.keys(registry).map(function (k) { return registry[k]; });
  }

  return { register: register, get: get, list: list };
})();
