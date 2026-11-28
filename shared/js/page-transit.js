/**
 * Logo loader a pantalla completa hasta que el destino esté listo.
 * API: BoxiesPageTransit.show() / hide() / run(workPromise, { minMs })
 */
(function () {
  'use strict';

  var LOGO = '/landing/assets/logo.png';
  var MIN_MS = 520;
  var MAX_MS = 4000;
  var el = null;
  var busy = false;
  var hideTimer = 0;
  var shownAt = 0;
  var landingOwns = false;

  function logoMarkup() {
    return (
      '<div class="page-transit-mark">' +
        '<img src="' + LOGO + '" alt="" class="page-transit-logo page-transit-logo--ghost">' +
        '<img src="' + LOGO + '" alt="" class="page-transit-logo page-transit-logo--fill">' +
      '</div>'
    );
  }

  function ensure() {
    el = document.getElementById('pageTransit') || document.getElementById('boxiesPageTransit');
    if (el) {
      if (!el.querySelector('.page-transit-mark')) el.innerHTML = logoMarkup();
      return el;
    }
    el = document.createElement('div');
    el.id = 'boxiesPageTransit';
    el.className = 'page-transit';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = logoMarkup();
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function restartLiquid() {
    var fill = el && el.querySelector('.page-transit-logo--fill');
    var mark = el && el.querySelector('.page-transit-mark');
    if (!fill) return;
    fill.style.animation = 'none';
    if (mark) mark.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = '';
    if (mark) mark.style.animation = '';
  }

  function show() {
    ensure();
    clearTimeout(hideTimer);
    busy = true;
    shownAt = performance.now();
    document.documentElement.classList.add('page-transit-on');
    if (document.body) document.body.classList.add('page-transit-on');
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    restartLiquid();
    /* Failsafe: nunca dejar el logo pegado */
    hideTimer = setTimeout(function () {
      if (busy) hide();
    }, MAX_MS);
  }

  function hide() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    if (!el) el = document.getElementById('pageTransit') || document.getElementById('boxiesPageTransit');
    if (el) {
      el.classList.remove('on');
      el.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('page-transit-on');
    if (document.body) document.body.classList.remove('page-transit-on');
    busy = false;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

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

  function landingWillHandle() {
    try {
      var force = sessionStorage.getItem('boxiesForceSection') || '';
      if (!force) {
        var hash = (location.hash || '').replace(/^#/, '');
        force = hash.startsWith('demo') ? 'demo' : hash;
      }
      if (!force) return false;
      var id = force.startsWith('demo-') ? 'demo' : force;
      return !!(document.getElementById(id) && typeof window.BoxiesGoToSection === 'function');
    } catch (e) {
      return false;
    }
  }

  function dismissAfterLoad() {
    if (landingOwns || landingWillHandle()) return;
    var pending = false;
    try { pending = sessionStorage.getItem('boxiesTransitPending') === '1'; } catch (e) {}
    if (!pending && !busy) return;
    consumePending();
    var finish = function () {
      var elapsed = shownAt ? performance.now() - shownAt : 0;
      var left = Math.max(0, MIN_MS - elapsed);
      setTimeout(hide, left);
    };
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
  }

  /* Si venimos de otra página con menú → mostrar logo de inmediato */
  try {
    if (sessionStorage.getItem('boxiesTransitPending') === '1') {
      var boot = function () {
        show();
        /* Landing con #demo/#inicio lo cierra goToSection; el resto, al load */
        if (landingWillHandle()) {
          landingOwns = true;
        } else {
          dismissAfterLoad();
        }
      };
      if (document.body) boot();
      else document.addEventListener('DOMContentLoaded', boot);
    }
  } catch (e) {}

  window.BoxiesPageTransit = {
    show: show,
    hide: hide,
    run: run,
    isBusy: function () { return busy; },
    markPending: markPending,
    consumePending: consumePending,
    claimLanding: function () { landingOwns = true; }
  };
})();
