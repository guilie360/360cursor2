/**
 * Logo loader a pantalla completa hasta que el destino esté listo.
 * API: BoxiesPageTransit.show() / hide() / run(workPromise, { minMs })
 */
(function () {
  'use strict';

  var LOGO = '/landing/assets/logo.png';
  var MIN_MS = 520;
  var el = null;
  var busy = false;
  var hideTimer = 0;

  function ensure() {
    el = document.getElementById('pageTransit') || document.getElementById('boxiesPageTransit');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'boxiesPageTransit';
    el.className = 'page-transit';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<img src="' + LOGO + '" alt="" class="page-transit-logo">';
    document.body.appendChild(el);
    return el;
  }

  function show() {
    ensure();
    clearTimeout(hideTimer);
    busy = true;
    document.documentElement.classList.add('page-transit-on');
    document.body.classList.add('page-transit-on');
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    if (!el) el = document.getElementById('pageTransit') || document.getElementById('boxiesPageTransit');
    if (!el) {
      busy = false;
      document.documentElement.classList.remove('page-transit-on');
      document.body.classList.remove('page-transit-on');
      return;
    }
    el.classList.remove('on');
    el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('page-transit-on');
    document.body.classList.remove('page-transit-on');
    busy = false;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Muestra el logo, ejecuta work (fn o Promise), espera minMs, luego oculta.
   */
  function run(work, opts) {
    opts = opts || {};
    var minMs = typeof opts.minMs === 'number' ? opts.minMs : MIN_MS;
    var t0 = performance.now();
    show();
    var job = typeof work === 'function' ? Promise.resolve().then(work) : Promise.resolve(work);
    return job
      .catch(function () { /* destino igual se revela */ })
      .then(function (result) {
        var left = Math.max(0, minMs - (performance.now() - t0));
        return wait(left).then(function () { return result; });
      })
      .then(function (result) {
        hide();
        return result;
      });
  }

  function markPending(section) {
    try {
      sessionStorage.setItem('boxiesTransitPending', '1');
      if (section) sessionStorage.setItem('boxiesForceSection', section);
    } catch (e) {}
  }

  function consumePending() {
    try {
      var on = sessionStorage.getItem('boxiesTransitPending') === '1';
      if (on) sessionStorage.removeItem('boxiesTransitPending');
      return on;
    } catch (e) {
      return false;
    }
  }

  /* Si venimos de otra página con menú → mostrar logo de inmediato */
  try {
    if (sessionStorage.getItem('boxiesTransitPending') === '1') {
      if (document.body) show();
      else document.addEventListener('DOMContentLoaded', show);
    }
  } catch (e) {}

  window.BoxiesPageTransit = {
    show: show,
    hide: hide,
    run: run,
    isBusy: function () { return busy; },
    markPending: markPending,
    consumePending: consumePending
  };
})();
