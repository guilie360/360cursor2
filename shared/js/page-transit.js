/**
 * Logo charger real: base 20% + líquido que sube con la carga.
 * Nunca llega a 100% hasta que el destino está listo; al tocar 100% sale de inmediato.
 * API: BoxiesPageTransit.show() / hide() / complete() / run(work, { minMs })
 */
(function () {
  'use strict';

  var LOGO = '/landing/assets/logo.png';
  /** Piso visual mínimo mientras el trabajo es instantáneo (sigue cargando hacia CAP) */
  var MIN_MS = 480;
  var MAX_MS = 5000;
  /** Tope mientras espera el destino — solo complete() llega a 1 */
  var CAP = 0.9;
  /** Constante de tiempo del llenado asintótico (ms) */
  var TAU = 900;
  /** Rampa final CAP→100% (ms) — luego hide inmediato */
  var FINISH_MS = 200;

  var el = null;
  var busy = false;
  var hideTimer = 0;
  var shownAt = 0;
  var landingOwns = false;
  var progress = 0;
  var mode = 'idle'; /* idle | charge | finish */
  var raf = 0;
  var reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {}

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

  function fillEl() {
    return el && el.querySelector('.page-transit-logo--fill');
  }

  function applyProgress(p) {
    progress = Math.max(0, Math.min(1, p));
    var fill = fillEl();
    if (!fill) return;
    var top = ((1 - progress) * 100).toFixed(3) + '%';
    var clip = 'inset(' + top + ' 0 0 0)';
    fill.style.clipPath = clip;
    fill.style.webkitClipPath = clip;
  }

  function stopRaf() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function chargeTick(now) {
    if (mode !== 'charge') return;
    var elapsed = Math.max(0, now - shownAt);
    /* Asintótico hacia CAP: se desacelera y nunca toca 100% solo */
    var target = CAP * (1 - Math.exp(-elapsed / TAU));
    if (target > progress) progress = target;
    applyProgress(progress);
    raf = requestAnimationFrame(chargeTick);
  }

  function startCharge() {
    stopRaf();
    progress = 0;
    applyProgress(0);
    mode = 'charge';
    shownAt = performance.now();
    if (reduce) {
      applyProgress(CAP * 0.5);
      return;
    }
    raf = requestAnimationFrame(chargeTick);
  }

  function finishToFull() {
    if (reduce) {
      applyProgress(1);
      mode = 'idle';
      return Promise.resolve();
    }
    stopRaf();
    mode = 'finish';
    var from = progress;
    if (from >= 0.995) {
      applyProgress(1);
      mode = 'idle';
      return Promise.resolve();
    }
    var t0 = performance.now();
    return new Promise(function (resolve) {
      function step(now) {
        var u = Math.min(1, (now - t0) / FINISH_MS);
        var eased = 1 - Math.pow(1 - u, 3);
        applyProgress(from + (1 - from) * eased);
        if (u < 1) {
          raf = requestAnimationFrame(step);
        } else {
          applyProgress(1);
          mode = 'idle';
          raf = 0;
          resolve();
        }
      }
      raf = requestAnimationFrame(step);
    });
  }

  function show() {
    ensure();
    clearTimeout(hideTimer);
    busy = true;
    document.documentElement.classList.add('page-transit-on');
    if (document.body) document.body.classList.add('page-transit-on');
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    startCharge();
    hideTimer = setTimeout(function () {
      if (busy) complete();
    }, MAX_MS);
  }

  function hideImmediate() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    stopRaf();
    mode = 'idle';
    if (!el) el = document.getElementById('pageTransit') || document.getElementById('boxiesPageTransit');
    if (el) {
      el.classList.remove('on');
      el.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('page-transit-on');
    if (document.body) document.body.classList.remove('page-transit-on');
    busy = false;
    progress = 0;
  }

  /** Llena a 100% y recién ahí cierra — 100% = pasar de etapa */
  function complete() {
    if (!busy && mode === 'idle') return Promise.resolve();
    clearTimeout(hideTimer);
    hideTimer = 0;
    return finishToFull().then(function () {
      hideImmediate();
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function run(work, opts) {
    opts = opts || {};
    var minMs = typeof opts.minMs === 'number' ? opts.minMs : MIN_MS;
    if (reduce) minMs = 0;
    var t0 = performance.now();
    show();
    var job = typeof work === 'function' ? Promise.resolve().then(work) : Promise.resolve(work);
    return job
      .catch(function () { /* destino igual se revela */ })
      .then(function (result) {
        var left = Math.max(0, minMs - (performance.now() - t0));
        /* Mientras espera el piso visual, el líquido sigue subiendo hacia CAP */
        return wait(left).then(function () { return result; });
      })
      .then(function (result) {
        return complete().then(function () { return result; });
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
      setTimeout(function () { complete(); }, left);
    };
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
  }

  try {
    if (sessionStorage.getItem('boxiesTransitPending') === '1') {
      var boot = function () {
        show();
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
    hide: hideImmediate,
    complete: complete,
    run: run,
    isBusy: function () { return busy; },
    fillMs: MIN_MS,
    markPending: markPending,
    consumePending: consumePending,
    claimLanding: function () { landingOwns = true; }
  };
})();
