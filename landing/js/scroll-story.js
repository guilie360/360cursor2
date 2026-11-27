/**
 * Scroll-story entre portada y demo: un gesto = un tramo con texto.
 * Frames desde Bunny CDN. No toca #inicio ni #demo.
 */
(function () {
  'use strict';

  var stage = document.getElementById('scrollStage');
  var cv = document.getElementById('scrollCv');
  if (!stage || !cv) return;

  var FPS = 30;
  var TOTAL = 615;
  var SPEED = 0.85;
  var MIN_DUR = 1.6;
  var MAX_DUR = 6.5;
  var SLOW = 3;
  var EASE = 0.6;
  var COOLDOWN = 700;
  var GAP = 140;
  var CDN = 'https://boxies.b-cdn.net/landing/scroll';

  var HOLDS = [
    { t: 0.0 },
    { t: 1.13, title: 'Tu inmueble aún no está terminado.', sub: 'O ni siquiera existe.' },
    { t: 3.8, title: 'Pero ya puedes venderlo.', sub: 'Con sus acabados y materiales' },
    { t: 5.97, title: 'Cada espacio, para recorrerlo.', sub: 'Recorrido 360° interactivo' },
    { t: 8.2, title: 'Amoblado, para que se imaginen viviendo ahí.', sub: 'Con el estilo que elijas' },
    { t: 15.2, title: 'Todo en un showroom interactivo.', sub: 'Para mostrarlo desde cualquier dispositivo' },
    { t: 20.4, final: true }
  ];

  var MOTION = [0.06,0.14,0.24,0.38,0.55,0.75,1,1,1,1,1,1,1,1,1,1,1,1,1,0.99,0.78,0.59,0.43,0.27,0.15,0.07,0.04,0.08,0.08,0.07,0.07,0.06,0.06,0.06,0.06,0.06,0.03,0.03,0.04,0.05,0.06,0.07,0.08,0.08,0.09,0.1,0.11,0.11,0.12,0.14,0.17,0.19,0.22,0.24,0.25,0.28,0.34,0.38,0.46,0.51,0.58,0.65,0.77,0.81,0.86,0.86,0.85,0.82,0.75,0.66,0.57,0.44,0.38,0.32,0.28,0.26,0.22,0.24,0.25,0.29,0.29,0.3,0.27,0.25,0.24,0.21,0.19,0.16,0.13,0.12,0.12,0.12,0.12,0.11,0.11,0.1,0.11,0.1,0.1,0.08,0.07,0.07,0.06,0.06,0.06,0.07,0.09,0.09,0.09,0.09,0.09,0.11,0.11,0.13,0.12,0.14,0.18,0.21,0.26,0.29,0.33,0.39,0.42,0.47,0.49,0.52,0.57,0.58,0.62,0.63,0.65,0.69,0.68,0.73,0.7,0.68,0.68,0.65,0.65,0.62,0.6,0.63,0.59,0.64,0.7,0.78,0.87,0.9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.9,0.8,0.75,0.63,0.58,0.47,0.39,0.34,0.28,0.26,0.22,0.19,0.2,0.22,0.25,0.28,0.33,0.37,0.45,0.51,0.58,0.65,0.69,0.83,0.88,0.92,0.96,0.96,1,1,1,0.96,0.84,0.82,0.77,0.68,0.6,0.49,0.46,0.44,0.42,0.42,0.37,0.4,0.41,0.43,0.43,0.4,0.42,0.4,0.38,0.37,0.34,0.34,0.32,0.31,0.3,0.26,0.26,0.24,0.22,0.2,0.17,0.17,0.15,0.14,0.12,0.1,0.09,0.08,0.08,0.07,0.04,0.04,0.06,0.05,0.05,0.05,0.05,0.05,0.05,0.06,0.07,0.06,0.08,0.07,0.09,0.11,0.13,0.16,0.15,0.19,0.22,0.27,0.33,0.31,0.36,0.4,0.44,0.51,0.47,0.49,0.51,0.53,0.62,0.55,0.58,0.63,0.71,0.87,0.8,0.9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.93,0.81,0.65,0.7,0.57,0.49,0.42,0.36,0.38,0.3,0.24,0.19,0.14,0.14,0.1,0.07,0.05,0.03,0.03,0.02,0.02,0.01,0.01,0.01,0.01,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.01,0.02,0.02,0.01,0.01,0.01,0.02,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.04,0.04,0.05,0.06,0.08,0.12,0.13,0.17,0.2,0.23,0.31,0.35,0.41,0.44,0.48,0.55,0.55,0.61,0.6,0.62,0.65,0.64,0.68,0.66,0.66,0.72,0.69,0.71,0.69,0.7,0.76,0.75,0.82,0.86,0.83,0.88,0.84,0.87,0.87,0.87,0.98,0.94,0.94,0.96,0.99,1,1,1,1,1,1,1,1,1,1,1,0.89,0.8,0.68,0.49,0.44,0.35,0.29,0.22,0.16,0.14,0.09,0.06,0.04,0.03,0.03,0.02,0.02,0.02,0.01,0.01,0.01,0.05,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.02,0.01,0.02,0.02,0.03,0.06,0.09,0.1,0.14,0.15,0.18,0.21,0.21,0.22,0.22,0.21,0.24,0.22,0.24,0.22,0.22,0.24,0.24,0.24,0.23,0.23,0.25,0.23,0.25,0.23,0.23,0.24,0.23,0.23,0.2,0.18,0.19,0.17,0.17,0.16,0.15,0.15,0.14,0.15,0.13,0.12,0.13,0.12,0.12,0.11,0.1,0.11,0.1,0.1,0.09,0.08,0.07,0.06,0.08,0.07,0.06,0.05,0.06,0.06,0.08,0.09,0.1,0.1,0.11,0.13,0.15,0.17,0.2,0.21,0.22,0.25,0.25,0.27,0.3,0.3,0.31,0.32,0.32,0.36,0.32,0.33,0.35,0.31,0.31,0.33,0.3,0.29,0.27,0.27,0.26,0.25,0.24,0.26,0.22,0.22,0.22,0.19,0.19,0.2,0.18,0.16,0.14,0.13,0.19,0.27,0.43,0.96,1,1,1,1,1,1,1,1,1,1,1,0.77,0.49,0.3,0.13,0.09,0.08,0.07,0.07,0.06,0.06,0.06,0.05,0.05,0.05,0.05,0.04,0.04,0.03,0.03,0.02,0.02,0.02,0.02,0.01,0.01];

  var ctx = cv.getContext('2d', { alpha: false });
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqPortrait = matchMedia('(max-aspect-ratio: 1/1)');
  function $(id) { return document.getElementById(id); }
  function smooth(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
  function ease(p) { return p * (1 - EASE) + smooth(p) * EASE; }

  var cum = new Float64Array(TOTAL + 1);
  for (var j = 0; j < TOTAL; j++) cum[j + 1] = cum[j] + (1 + SLOW * (MOTION[j] || 0));
  function TW(t) {
    var f = Math.max(0, Math.min(TOTAL, t * FPS));
    var jj = Math.min(TOTAL - 1, Math.floor(f));
    return cum[jj] + (f - jj) * (cum[jj + 1] - cum[jj]);
  }
  function TWinv(u) {
    var lo = 0, hi = TOTAL;
    while (hi - lo > 1) {
      var m = (lo + hi) >> 1;
      if (cum[m] <= u) lo = m; else hi = m;
    }
    return (lo + (u - cum[lo]) / (cum[lo + 1] - cum[lo] || 1)) / FPS;
  }

  var stops = HOLDS;
  var msgRoot = $('scrollMsgs');
  var msgEls = stops.map(function (h) {
    if (!h.title || !msgRoot) return null;
    var d = document.createElement('div');
    d.className = 'scroll-msg';
    d.innerHTML = '<h2>' + h.title + '</h2>' + (h.sub ? '<small>' + h.sub + '</small>' : '');
    msgRoot.appendChild(d);
    return d;
  });
  var dotsRoot = $('scrollDots');
  var dotEls = stops.map(function () {
    if (!dotsRoot) return null;
    var b = document.createElement('b');
    dotsRoot.appendChild(b);
    return b;
  });

  var dirName = mqPortrait.matches ? 'frames-cel' : 'frames-pc';
  var W = 0, H = 0, lastKey = '';
  var imgs = new Array(TOTAL);
  var stills = [];
  var stillA = 0, stillIdx = -1, stillRaf = 0;
  var cur = 0, busy = false, arrivedAt = 0, lastWheel = 0;
  var mode = 'page', freeEntered = false, curT = 0, hintTimer = 0;
  var framesReady = false, loading = false;

  function frameUrl(name) { return CDN + '/' + dirName + '/' + name; }
  function setStoryUi(on) {
    document.documentElement.classList.toggle('scroll-story-active', !!on);
    document.body.classList.toggle('scroll-story-active', !!on);
  }
  function nearStageEntry() {
    return scrollY >= Math.max(48, stage.offsetTop - 8);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(innerWidth * dpr);
    H = cv.height = Math.round(innerHeight * dpr);
    lastKey = '';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    render();
  }

  function cover(img, alpha) {
    if (!img || !img.naturalWidth) return;
    var r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    var w = img.naturalWidth * r, h = img.naturalHeight * r;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  function loadStills() {
    for (var k = 1; k < stops.length; k++) {
      var im = new Image();
      im.decoding = 'async';
      im.src = frameUrl('still_' + k + '.webp');
      stills[k] = im;
    }
  }

  function fadeStill(k) {
    stillIdx = k; stillA = 0;
    var t0 = performance.now(), D = reduce ? 0 : 600;
    cancelAnimationFrame(stillRaf);
    (function f(now) {
      stillA = D <= 0 ? 1 : Math.min(1, (now - t0) / D);
      render();
      if (stillA < 1) stillRaf = requestAnimationFrame(f);
    })(t0);
  }

  function drawFrame(t) {
    var f = Math.max(0, Math.min(TOTAL - 1, t * FPS));
    var rr = Math.round(f);
    if (Math.abs(f - rr) < 0.02) f = rr;
    var i0 = Math.floor(f), a = f - i0, i1 = Math.min(TOTAL - 1, i0 + 1);
    var key = i0 + ':' + Math.round(a * 20) + ':' + W + 'x' + H + ':' + stillIdx + ':' + Math.round(stillA * 50);
    if (key === lastKey) return;
    lastKey = key;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);
    cover(imgs[i0], 1);
    if (a > 0.03 && i1 !== i0) cover(imgs[i1], a);
    if (stillIdx > 0 && stillA > 0) cover(stills[stillIdx], stillA);
    ctx.globalAlpha = 1;
  }
  function render() { drawFrame(curT); }

  function hideTexts() {
    clearTimeout(hintTimer);
    msgEls.forEach(function (el) { if (el) el.classList.remove('on'); });
    ['scrollShade', 'scrollScrim', 'scrollHintStory'].forEach(function (id) {
      var el = $(id); if (el) el.classList.remove('on');
    });
  }

  function showStop(k) {
    var st = stops[k];
    msgEls.forEach(function (el, i) { if (el) el.classList.toggle('on', i === k); });
    var shade = $('scrollShade'), scrim = $('scrollScrim'), hint = $('scrollHintStory');
    if (shade) shade.classList.toggle('on', !!st.title || !!st.final);
    if (scrim) scrim.classList.toggle('on', !!st.final);
    dotEls.forEach(function (d, i) { if (d) d.classList.toggle('on', i === k); });
    clearTimeout(hintTimer);
    if (hint) {
      hintTimer = setTimeout(function () {
        if (!busy && mode === 'exp') hint.classList.add('on');
      }, k === 0 ? 500 : 1200);
    }
    try { history.replaceState(null, '', '#servicio'); } catch (e) {}
    render();
  }

  function lockPage() {
    document.documentElement.classList.add('scroll-story-lock');
    document.body.classList.add('scroll-story-lock');
  }
  function unlockPage() {
    document.documentElement.classList.remove('scroll-story-lock');
    document.body.classList.remove('scroll-story-lock');
  }

  function go(dir) {
    if (dir < 0 && cur === 0) { leaveToIntro(); return; }
    var next = cur + dir;
    if (next < 0) return;
    if (next >= stops.length) { exitToDemo(); return; }
    busy = true; hideTexts();
    cancelAnimationFrame(stillRaf); stillA = 0; stillIdx = -1; lastKey = '';
    var from = cur, to = next, lo = Math.min(from, to), hi = Math.max(from, to), fwd = to > from;
    var a = stops[lo].t, b = stops[hi].t, w0 = TW(a), w1 = TW(b);
    var dur = (reduce ? 0.2 : Math.min(MAX_DUR, Math.max(MIN_DUR, (b - a) / SPEED))) * 1000;
    var t0 = performance.now();
    (function step(now) {
      var u = Math.min(1, (now - t0) / dur), ee = ease(u);
      curT = TWinv(fwd ? w0 + (w1 - w0) * ee : w1 - (w1 - w0) * ee);
      render();
      if (u < 1) requestAnimationFrame(step);
      else {
        cur = to; busy = false; arrivedAt = performance.now(); curT = stops[to].t;
        showStop(to); if (to > 0) fadeStill(to);
      }
    })(t0);
  }

  function enterExp() {
    if (mode === 'exp') return;
    if (!framesReady) {
      ensureFrames().then(function () { if (nearStageEntry()) enterExp(); });
      return;
    }
    mode = 'exp'; freeEntered = false; setStoryUi(true); unlockPage();
    scrollTo({ top: stage.offsetTop, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = stage.offsetTop;
    lockPage(); arrivedAt = performance.now(); showStop(cur);
  }

  function leaveToIntro() {
    mode = 'page'; freeEntered = false; busy = false; hideTexts();
    cur = 0; curT = stops[0].t; stillA = 0; stillIdx = -1; lastKey = '';
    setStoryUi(false); unlockPage();
    scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    try { history.replaceState(null, '', '#inicio'); } catch (e) {}
    render();
  }

  function exitToDemo() {
    mode = 'free'; freeEntered = false; hideTexts(); setStoryUi(false); unlockPage();
    var fin = document.getElementById('demo');
    if (fin) {
      var top = Math.round(fin.getBoundingClientRect().top + scrollY);
      scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      try { history.replaceState(null, '', '#demo'); } catch (e) {}
      fin.classList.add('in');
    }
  }

  function onWheel(e) {
    var now = performance.now(), gap = now - lastWheel; lastWheel = now;
    if (mode === 'free') return;
    if (mode !== 'exp') {
      if (e.deltaY > 0 && nearStageEntry()) { e.preventDefault(); enterExp(); }
      return;
    }
    e.preventDefault();
    if (busy || now - arrivedAt < COOLDOWN || gap < GAP || Math.abs(e.deltaY) < 4) return;
    go(e.deltaY > 0 ? 1 : -1);
  }

  var ty0 = null, tDone = false;
  function onTouchStart(e) { ty0 = e.touches[0].clientY; tDone = false; }
  function onTouchMove(e) {
    if (mode === 'free') return;
    if (mode !== 'exp') {
      if (ty0 == null) return;
      var dy0 = ty0 - e.touches[0].clientY;
      if (dy0 > 45 && nearStageEntry()) {
        e.preventDefault();
        if (!tDone) { tDone = true; enterExp(); }
      }
      return;
    }
    e.preventDefault();
    if (tDone || busy || ty0 == null || performance.now() - arrivedAt < COOLDOWN) return;
    var dy = ty0 - e.touches[0].clientY;
    if (Math.abs(dy) > 45) { tDone = true; go(dy > 0 ? 1 : -1); }
  }

  function onKey(e) {
    if (document.body.classList.contains('demo-open')) return;
    if (mode !== 'exp') {
      if (['ArrowDown', 'PageDown', ' '].indexOf(e.key) !== -1 && nearStageEntry()) {
        e.preventDefault(); enterExp();
      }
      return;
    }
    if (busy || performance.now() - arrivedAt < 300) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].indexOf(e.key) !== -1) { e.preventDefault(); go(1); }
    else if (['ArrowUp', 'PageUp', 'ArrowLeft'].indexOf(e.key) !== -1) { e.preventDefault(); go(-1); }
  }

  function onScroll() {
    if (mode === 'page') {
      if (nearStageEntry()) enterExp();
      return;
    }
    if (mode !== 'free') return;
    var st = stage.offsetTop;
    if (scrollY > st + innerHeight * 0.35) freeEntered = true;
    if (freeEntered && scrollY <= st + 4) enterExp();
  }

  function loadAll() {
    return new Promise(function (res) {
      var next = 0, active = 0, done = 0, MAX = 10;
      function pump() {
        while (active < MAX && next < TOTAL) {
          (function (i) {
            next++; active++;
            var im = new Image();
            im.decoding = 'async';
            im.onload = im.onerror = function () {
              active--; done++;
              if (done === TOTAL) res(); else pump();
            };
            im.src = frameUrl('f_' + String(i + 1).padStart(4, '0') + '.webp');
            imgs[i] = im;
          })(next);
        }
      }
      pump();
    });
  }

  function ensureFrames() {
    if (framesReady) return Promise.resolve();
    if (loading) {
      return new Promise(function (res) {
        var t = setInterval(function () {
          if (framesReady) { clearInterval(t); res(); }
        }, 80);
      });
    }
    loading = true;
    stage.classList.add('is-loading');
    loadStills();
    return loadAll().then(function () {
      framesReady = true; loading = false; stage.classList.remove('is-loading');
    });
  }

  window.BoxiesScrollStory = {
    enterExp: enterExp,
    leaveToIntro: leaveToIntro,
    exitToDemo: exitToDemo,
    isLocked: function () { return mode === 'exp'; },
    mode: function () { return mode; }
  };

  mqPortrait.addEventListener('change', function () { location.reload(); });

  resize();
  addEventListener('resize', resize);
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('keydown', onKey);
  addEventListener('scroll', onScroll, { passive: true });
  if ('requestIdleCallback' in window) requestIdleCallback(function () { ensureFrames(); }, { timeout: 2500 });
  else setTimeout(function () { ensureFrames(); }, 1200);
  render();
})();
