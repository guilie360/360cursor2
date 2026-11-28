/**
 * Scroll-story entre portada y demo.
 * Reveal continuo portada→stage, luego holds. Frames: Bunny (VIDEO FINAL).
 */
(function () {
  'use strict';

  var stage = document.getElementById('scrollStage');
  var section = document.getElementById('servicio') || stage;
  var introSec = document.getElementById('inicio');
  var cv = document.getElementById('scrollCv');
  if (!stage || !cv) return;

  var FPS = 30;
  var TOTAL = 546; /* VIDEO FINAL ~18.2s @ 30fps */
  var SPEED = 1.4;
  var MIN_DUR = 0.75;
  var MAX_DUR = 2.35;
  var SLOW = 3;
  var EASE = 0.55;
  var REVEAL_GAIN = 0.0028; /* portada→story */
  var COOLDOWN = 300; /* ms en el imán B antes de aceptar otro gesto */
  var GESTURE_THRESH = 26; /* delta acumulado para disparar A→B (trackpad-friendly) */
  var GESTURE_RESET = 110; /* silencio = fin del gesto */
  /* v2 = frames de VIDEO FINAL PARA LANGIND (ruta nueva para evitar cache del CapCut viejo) */
  var CDN = 'https://boxies.b-cdn.net/landing/scroll/v2';

  var HOLDS = [
    { t: 0.0 },
    { t: 1.13, title: 'Tu inmueble aún no está terminado.', sub: 'O ni siquiera existe.' },
    { t: 3.8, title: 'Pero ya puedes venderlo.', sub: 'Con sus acabados y materiales' },
    { t: 5.97, title: 'Cada espacio, para recorrerlo.', sub: 'Recorrido 360° interactivo' },
    { t: 8.2, title: 'Amoblado, para que se imaginen viviendo ahí.', sub: 'Con el estilo que elijas' },
    { t: 13.8, title: 'Todo en un showroom interactivo.', sub: 'Para mostrarlo desde cualquier dispositivo' },
    { t: 18.0, final: true }
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
  var framesReady = false, entryReady = false, loading = false, loadPromise = null;
  var ignoreScrollEnter = false;
  var revealP = 0, revealRaf = 0, revealTarget = 0;
  var goToken = 0, scrubbing = false;
  var landP = 0;
  var gestureAcc = 0, gestureTimer = 0, gestureArmed = true;

  function frameUrl(name) { return CDN + '/' + dirName + '/' + name; }
  function setStoryUi(on) {
    document.documentElement.classList.toggle('scroll-story-active', !!on);
    document.body.classList.toggle('scroll-story-active', !!on);
  }
  function setRevealUi(on) {
    document.documentElement.classList.toggle('scroll-story-reveal', !!on);
    document.body.classList.toggle('scroll-story-reveal', !!on);
  }
  /* Ancla = #servicio (section). Nunca usar offsetTop del sticky inner (~0). */
  function sectionTop() {
    return Math.round(section.getBoundingClientRect().top + (scrollY || window.pageYOffset || 0));
  }
  function viewportSize() {
    var vv = window.visualViewport;
    return {
      w: Math.max(1, Math.round((vv && vv.width) || innerWidth || document.documentElement.clientWidth || 1)),
      h: Math.max(1, Math.round((vv && vv.height) || innerHeight || document.documentElement.clientHeight || 1))
    };
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function applyReveal(p) {
    revealP = clamp01(p);
    var e = smooth(revealP);
    document.documentElement.style.setProperty('--reveal', String(revealP));
    document.documentElement.style.setProperty('--reveal-e', String(e));
    if (introSec) {
      introSec.style.setProperty('--reveal', String(revealP));
      introSec.style.setProperty('--reveal-e', String(e));
    }
    /* Reveal = solo portada→escena. La puerta permanece en frame 0 (cerrada). */
    if (entryReady) {
      curT = stops[0].t;
      stillA = 0;
      stillIdx = -1;
      lastKey = '';
      render();
    }
  }

  function clearPortadaChrome() {
    cancelAnimationFrame(revealRaf);
    revealRaf = 0;
    revealP = 0;
    revealTarget = 0;
    document.documentElement.style.setProperty('--reveal', '0');
    document.documentElement.style.setProperty('--reveal-e', '0');
    document.documentElement.style.removeProperty('--land');
    document.body.style.removeProperty('--land');
    if (introSec) {
      introSec.style.setProperty('--reveal', '0');
      introSec.style.setProperty('--reveal-e', '0');
      introSec.style.removeProperty('opacity');
      introSec.style.removeProperty('transform');
      introSec.style.removeProperty('filter');
    }
    setRevealUi(false);
    setStoryUi(false);
    document.documentElement.classList.remove('scroll-story-landing', 'landing-ended');
    document.body.classList.remove('scroll-story-landing', 'landing-ended');
    stage.classList.remove('is-landing', 'is-loading');
    var fin = document.getElementById('demo');
    if (fin) {
      fin.classList.remove('is-landing', 'is-settled', 'from-story', 'epic-in');
      fin.style.removeProperty('--land');
    }
    var dots = $('scrollDots');
    if (dots) dots.style.opacity = '';
  }

  function demoDocTop() {
    var fin = document.getElementById('demo');
    if (!fin) return sectionTop() + (section.offsetHeight || innerHeight);
    return Math.round(fin.getBoundingClientRect().top + (scrollY || window.pageYOffset || 0));
  }

  function clampToDemoEnd() {
    var fin = document.getElementById('demo');
    if (!fin || mode !== 'free') return;
    var top = stableDemoTop();
    var maxY = Math.max(top, top + fin.offsetHeight - innerHeight);
    var y = scrollY || window.pageYOffset || 0;
    if (y > maxY + 1) {
      scrollTo({ top: maxY, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = maxY;
      document.body.scrollTop = maxY;
    } else if (y < top - 1 && document.documentElement.classList.contains('landing-ended')) {
      /* No dejar que la inercia suba al stage sticky (franja negra / reinicio) */
      scrollTo({ top: top, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var vp = viewportSize();
    W = cv.width = Math.round(vp.w * dpr);
    H = cv.height = Math.round(vp.h * dpr);
    cv.style.width = vp.w + 'px';
    cv.style.height = vp.h + 'px';
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

  function updateDots(k) {
    dotEls.forEach(function (d, i) { if (d) d.classList.toggle('on', i === k); });
  }

  function showStop(k) {
    var st = stops[k];
    msgEls.forEach(function (el, i) { if (el) el.classList.toggle('on', i === k); });
    var shade = $('scrollShade'), scrim = $('scrollScrim'), hint = $('scrollHintStory');
    if (shade) shade.classList.toggle('on', !!st.title || !!st.final);
    if (scrim) scrim.classList.toggle('on', !!st.final);
    updateDots(k);
    clearTimeout(hintTimer);
    if (hint) {
      hintTimer = setTimeout(function () {
        if (!busy && mode === 'exp') hint.classList.add('on');
      }, k === 0 ? 400 : 900);
    }
    try { history.replaceState(null, '', '#servicio'); } catch (e) {}
    render();
  }

  function nearestHold(t) {
    var best = 0, bd = Infinity;
    for (var i = 0; i < stops.length; i++) {
      var d = Math.abs(stops[i].t - t);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function holdAfter(t) {
    for (var i = 0; i < stops.length; i++) {
      if (stops[i].t >= t - 0.001) return i;
    }
    return stops.length - 1;
  }

  function lockPage() {
    document.documentElement.classList.add('scroll-story-lock');
    document.body.classList.add('scroll-story-lock');
  }
  function unlockPage() {
    document.documentElement.classList.remove('scroll-story-lock');
    document.body.classList.remove('scroll-story-lock');
  }

  function goToHold(to, fromSnap) {
    if (!framesReady && !entryReady) { ensureFrames(); return; }
    if (to < 0) { startRevealOut(); return; }
    if (to >= stops.length) { animateLandToEnd(); return; }
    var token = ++goToken;
    busy = true;
    gestureArmed = false;
    gestureAcc = 0;
    scrubbing = false;
    hideTexts();
    cancelAnimationFrame(stillRaf); stillA = 0; stillIdx = -1; lastKey = '';
    var fromT = curT, targetT = stops[to].t;
    var w0 = TW(fromT), w1 = TW(targetT), fwd = targetT >= fromT;
    var span = Math.abs(targetT - fromT);
    var dur = (reduce ? 0.12 : Math.min(MAX_DUR, Math.max(MIN_DUR, span / SPEED))) * 1000;
    if (fromSnap && span < 0.12) dur = reduce ? 0 : 160;
    var t0 = performance.now();
    (function step(now) {
      if (token !== goToken) return;
      var u = Math.min(1, (now - t0) / dur), ee = ease(u);
      curT = TWinv(fwd ? w0 + (w1 - w0) * ee : w0 - (w0 - w1) * ee);
      render();
      if (u < 1) requestAnimationFrame(step);
      else {
        cur = to; busy = false; arrivedAt = performance.now(); curT = targetT;
        gestureArmed = true; gestureAcc = 0;
        showStop(to); if (to > 0) fadeStill(to);
      }
    })(t0);
  }

  function go(dir) {
    if (!framesReady) { ensureFrames(); return; }
    if (busy) return;
    var last = stops.length - 1;
    if (dir > 0 && cur >= last) { animateLandToEnd(); return; }
    if (dir < 0 && cur === 0 && curT <= stops[0].t + 0.05) { startRevealOut(); return; }
    var next = cur + dir;
    if (next < 0) { startRevealOut(); return; }
    if (next > last) { animateLandToEnd(); return; }
    goToHold(next, false);
  }

  /* Un gesto (rueda/trackpad/swipe) = un tramo A→B con imán en B */
  function noteGesture(delta) {
    if (mode === 'land') {
      if (busy) return;
      if (delta > 4) animateLandToEnd();
      else if (delta < -4 && landP < 0.35) {
        /* volver al último hold */
        document.documentElement.classList.remove('scroll-story-landing');
        document.body.classList.remove('scroll-story-landing');
        stage.classList.remove('is-landing');
        var fin = document.getElementById('demo');
        if (fin) fin.classList.remove('is-landing');
        mode = 'exp';
        landP = 0;
        cur = stops.length - 1;
        curT = stops[cur].t;
        gestureArmed = true;
        showStop(cur);
      }
      return;
    }
    if (mode !== 'exp') return;
    if (busy) return;
    var now = performance.now();
    if (!gestureArmed || now - arrivedAt < COOLDOWN) return;

    gestureAcc += delta;
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(function () { gestureAcc = 0; }, GESTURE_RESET);

    if (Math.abs(gestureAcc) >= GESTURE_THRESH) {
      var dir = gestureAcc > 0 ? 1 : -1;
      gestureAcc = 0;
      go(dir);
    }
  }

  function lastFrameName() {
    return 'f_' + String(TOTAL).padStart(4, '0') + '.webp';
  }

  function paintDemoBgFromLastFrame(fin) {
    if (!fin) return;
    var bg = fin.querySelector('.final-bg');
    if (!bg) return;
    var url = frameUrl(lastFrameName());
    bg.style.backgroundImage =
      'linear-gradient(rgba(8,8,8,.22),rgba(8,8,8,.48)), url("' + url + '")';
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
    bg.style.backgroundRepeat = 'no-repeat';
    bg.style.opacity = '1';
    bg.style.transform = 'none';
  }

  function applyLand(p) {
    landP = clamp01(p);
    document.documentElement.style.setProperty('--land', String(landP));
    document.body.style.setProperty('--land', String(landP));
    var fin = document.getElementById('demo');
    if (fin) fin.style.setProperty('--land', String(landP));
    cur = stops.length - 1;
    curT = stops[cur].t;
    stillA = 0; stillIdx = -1; lastKey = '';
    render();
  }

  function stableDemoTop() {
    var introEl = document.getElementById('inicio');
    var a = introEl ? introEl.offsetHeight : innerHeight;
    var b = section ? section.offsetHeight : innerHeight;
    return Math.max(0, Math.round(a + b));
  }

  function beginLand(seed) {
    if (mode === 'land' || mode === 'free') return;
    busy = false;
    scrubbing = false;
    mode = 'land';
    landP = clamp01(seed || 0);
    cur = stops.length - 1;
    curT = stops[cur].t;
    hideTexts();
    setRevealUi(false);
    setStoryUi(true);
    lockPage();
    stage.classList.add('is-landing');
    document.documentElement.classList.add('scroll-story-landing');
    document.body.classList.add('scroll-story-landing');
    var fin = document.getElementById('demo');
    if (fin) {
      paintDemoBgFromLastFrame(fin);
      /* Contenido oculto aquí: la entrada épica corre en commitToDemo */
      fin.classList.add('in', 'from-story', 'is-landing');
      fin.classList.remove('epic-in', 'is-settled');
      fin.setAttribute('aria-hidden', 'false');
    }
    var dots = $('scrollDots'), hint = $('scrollHintStory');
    if (dots) dots.style.opacity = '0';
    if (hint) hint.classList.remove('on');
    applyLand(landP);
  }

  function playEpicIn(fin) {
    if (!fin) return;
    fin.classList.remove('epic-in');
    /* reflow para reiniciar keyframes */
    void fin.offsetWidth;
    fin.classList.add('epic-in');
  }

  /* Un solo commit atómico a #demo + entrada épica desde el haz de luz */
  function commitToDemo() {
    ignoreScrollEnter = true;
    goToken++;
    busy = false;
    scrubbing = false;
    gestureArmed = false;
    gestureAcc = 0;
    mode = 'free';
    freeEntered = true;
    landP = 1;

    var fin = document.getElementById('demo');
    hideTexts();
    setRevealUi(false);
    setStoryUi(false);

    document.documentElement.classList.remove('scroll-story-landing');
    document.body.classList.remove('scroll-story-landing');
    stage.classList.remove('is-landing', 'is-loading');
    document.documentElement.classList.add('landing-ended');
    document.body.classList.add('landing-ended');

    if (fin) {
      paintDemoBgFromLastFrame(fin);
      fin.classList.add('in', 'from-story', 'is-settled');
      fin.classList.remove('is-landing');
      fin.style.setProperty('--land', '1');
      fin.setAttribute('aria-hidden', 'false');
    }

    var top = stableDemoTop();
    unlockPage();
    scrollTo({ top: top, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
    try { history.replaceState(null, '', '#demo'); } catch (e) {}

    requestAnimationFrame(function () {
      scrollTo({ top: top, left: 0, behavior: 'instant' });
      if (fin) {
        paintDemoBgFromLastFrame(fin);
        playEpicIn(fin);
      }
      requestAnimationFrame(function () {
        scrollTo({ top: stableDemoTop(), left: 0, behavior: 'instant' });
        clampToDemoEnd();
      });
    });

    setTimeout(function () {
      clampToDemoEnd();
      ignoreScrollEnter = false;
      gestureArmed = true;
    }, 500);
  }

  function animateLandToEnd() {
    if (mode === 'free') {
      var fin0 = document.getElementById('demo');
      if (fin0 && !fin0.classList.contains('epic-in')) playEpicIn(fin0);
      commitToDemo();
      return;
    }
    if (busy && mode === 'land') return;
    if (mode !== 'land') beginLand(0);

    var token = ++goToken;
    busy = true;
    gestureArmed = false;
    ignoreScrollEnter = true;
    /* Beat corto sobre el último frame; luego sale el copy desde la luz */
    var hold = reduce ? 60 : 220;
    setTimeout(function () {
      if (token !== goToken) return;
      busy = false;
      commitToDemo();
    }, hold);
  }

  function finishLand() {
    commitToDemo();
  }

  function parkAtSection() {
    var top = sectionTop();
    scrollTo({ top: top, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
  }

  function finishRevealToExp() {
    if (mode === 'exp') return;
    mode = 'exp';
    freeEntered = false;
    cur = 0;
    curT = stops[0].t;
    stillA = 0;
    stillIdx = -1;
    lastKey = '';
    setRevealUi(false);
    setStoryUi(true);
    document.documentElement.style.setProperty('--reveal', '1');
    document.documentElement.style.setProperty('--reveal-e', '1');
    parkAtSection();
    lockPage();
    requestAnimationFrame(function () {
      resize();
      render();
      arrivedAt = performance.now();
      showStop(0);
      if (!framesReady) stage.classList.add('is-loading');
      else stage.classList.remove('is-loading');
    });
  }

  function finishRevealToPage() {
    ignoreScrollEnter = true;
    goToken++;
    mode = 'page';
    freeEntered = false;
    busy = false;
    gestureArmed = true;
    gestureAcc = 0;
    landP = 0;
    hideTexts();
    cur = 0; curT = stops[0].t; stillA = 0; stillIdx = -1; lastKey = '';
    clearPortadaChrome();
    unlockPage();
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    try { history.replaceState(null, '', '#inicio'); } catch (e) {}
    requestAnimationFrame(function () {
      resize();
      render();
    });
    setTimeout(function () { ignoreScrollEnter = false; }, 350);
  }

  function scrubReveal(delta) {
    if (mode !== 'reveal') return;
    revealTarget = clamp01(revealTarget + delta * REVEAL_GAIN);
    if (!revealRaf) {
      revealRaf = requestAnimationFrame(function tickReveal() {
        var d = revealTarget - revealP;
        if (Math.abs(d) < 0.0015) {
          applyReveal(revealTarget);
          revealRaf = 0;
        } else {
          applyReveal(revealP + d * (reduce ? 1 : 0.22));
          revealRaf = requestAnimationFrame(tickReveal);
        }
        if (revealP >= 0.995) {
          revealRaf = 0;
          applyReveal(1);
          finishRevealToExp();
        } else if (revealP <= 0.004 && revealTarget <= 0) {
          revealRaf = 0;
          applyReveal(0);
          finishRevealToPage();
        }
      });
    }
  }

  function startRevealIn() {
    if (ignoreScrollEnter) return;
    if (mode === 'reveal' || mode === 'exp' || mode === 'land') return;
    if (!entryReady) {
      stage.classList.add('is-loading');
      ensureFrames().then(function () {
        if (mode === 'page' && !ignoreScrollEnter) startRevealIn();
      });
      return;
    }
    mode = 'reveal';
    revealTarget = Math.max(revealP, 0.04);
    setStoryUi(false);
    setRevealUi(true);
    lockPage();
    parkAtSection();
    requestAnimationFrame(function () {
      resize();
      applyReveal(revealP);
      scrubReveal(80);
    });
  }

  function startRevealOut() {
    if (mode === 'page') return;
    hideTexts();
    setStoryUi(false);
    mode = 'reveal';
    revealTarget = Math.min(revealP || 1, 0.96);
    revealP = Math.max(revealP, 0.92);
    setRevealUi(true);
    lockPage();
    applyReveal(revealP);
    scrubReveal(-120);
  }

  function enterExp() {
    if (mode === 'exp') return;
    if (!entryReady) {
      stage.classList.add('is-loading');
      ensureFrames().then(function () { enterExp(); });
      return;
    }
    applyReveal(1);
    finishRevealToExp();
  }

  function leaveToIntro() {
    /* Menú Inicio: reset limpio a la portada con logo (nunca dejar blur de reveal) */
    finishRevealToPage();
  }

  function reenterStoryFromDemo() {
    if (mode !== 'free' || ignoreScrollEnter) return;
    ignoreScrollEnter = true;
    document.documentElement.classList.remove('landing-ended');
    document.body.classList.remove('landing-ended');
    var fin = document.getElementById('demo');
    if (fin) fin.classList.remove('is-settled', 'is-landing', 'epic-in');
    mode = 'exp';
    freeEntered = false;
    cur = stops.length - 1;
    curT = stops[cur].t;
    landP = 0;
    setStoryUi(true);
    lockPage();
    parkAtSection();
    requestAnimationFrame(function () {
      resize();
      showStop(cur);
      gestureArmed = true;
      arrivedAt = performance.now();
      ignoreScrollEnter = false;
    });
  }

  function exitToDemo() {
    /* Nav / API: aterrizaje completo sin flash a portada */
    if (mode === 'free') {
      var fin0 = document.getElementById('demo');
      if (fin0) {
        paintDemoBgFromLastFrame(fin0);
        fin0.classList.add('in', 'from-story');
        document.documentElement.classList.add('landing-ended');
        document.body.classList.add('landing-ended');
        var top0 = demoDocTop();
        scrollTo({ top: Math.max(0, top0), behavior: 'smooth' });
      }
      return;
    }
    animateLandToEnd();
  }

  function onWheel(e) {
    lastWheel = performance.now();
    if (mode === 'free') {
      var fin = document.getElementById('demo');
      if (!fin) return;
      var y = scrollY || window.pageYOffset || 0;
      var top = document.documentElement.classList.contains('landing-ended')
        ? stableDemoTop()
        : demoDocTop();
      var maxY = Math.max(top, top + fin.offsetHeight - innerHeight);
      /* Fin de landing: no hay más scroll hacia abajo */
      if (e.deltaY > 0 && y >= maxY - 2) {
        e.preventDefault();
        clampToDemoEnd();
        return;
      }
      /* Subir desde el tope del demo → vuelve al último hold del story */
      if (e.deltaY < 0 && y <= top + 6) {
        e.preventDefault();
        reenterStoryFromDemo();
      }
      return;
    }
    if (mode === 'page') {
      if (e.deltaY > 0) {
        e.preventDefault();
        startRevealIn();
      }
      return;
    }
    if (mode === 'reveal') {
      e.preventDefault();
      scrubReveal(e.deltaY);
      return;
    }
    e.preventDefault();
    if (Math.abs(e.deltaY) < 0.5) return;
    noteGesture(e.deltaY);
  }

  var ty0 = null, tDone = false, tAcc = 0, touchFired = false;
  function onTouchStart(e) { ty0 = e.touches[0].clientY; tDone = false; tAcc = 0; touchFired = false; }
  function onTouchMove(e) {
    if (mode === 'free') {
      if (ty0 == null) return;
      var dyFree = ty0 - e.touches[0].clientY;
      var fin = document.getElementById('demo');
      if (!fin) return;
      var y = scrollY || 0;
      var top = demoDocTop();
      var maxY = Math.max(0, top + fin.offsetHeight - innerHeight);
      if (dyFree > 12 && y >= maxY - 2) {
        e.preventDefault();
        return;
      }
      if (dyFree < -12 && y <= top + 6) {
        e.preventDefault();
        if (!touchFired) {
          touchFired = true;
          reenterStoryFromDemo();
        }
      }
      return;
    }
    if (ty0 == null) return;
    var dy = ty0 - e.touches[0].clientY;
    if (mode === 'page') {
      if (dy > 22) {
        e.preventDefault();
        if (!tDone) { tDone = true; startRevealIn(); }
      }
      return;
    }
    if (mode === 'reveal') {
      e.preventDefault();
      var stepR = dy - tAcc;
      tAcc = dy;
      scrubReveal(stepR * 2.2);
      return;
    }
    e.preventDefault();
    tAcc = dy;
    if (!touchFired && Math.abs(dy) > 36) {
      touchFired = true;
      noteGesture(dy);
    }
  }
  function onTouchEnd() {
    if ((mode === 'exp' || mode === 'land') && !touchFired && Math.abs(tAcc) > 28) {
      noteGesture(tAcc);
    }
  }

  function onKey(e) {
    if (document.body.classList.contains('demo-open')) return;
    if (mode === 'page') {
      if (['ArrowDown', 'PageDown', ' '].indexOf(e.key) !== -1) {
        e.preventDefault();
        startRevealIn();
      }
      return;
    }
    if (mode === 'reveal') {
      if (['ArrowDown', 'PageDown', ' '].indexOf(e.key) !== -1) { e.preventDefault(); scrubReveal(160); }
      else if (['ArrowUp', 'PageUp'].indexOf(e.key) !== -1) { e.preventDefault(); scrubReveal(-160); }
      return;
    }
    if (mode === 'land') {
      if (['ArrowDown', 'PageDown', ' '].indexOf(e.key) !== -1) { e.preventDefault(); animateLandToEnd(); }
      else if (['ArrowUp', 'PageUp'].indexOf(e.key) !== -1) { e.preventDefault(); noteGesture(-40); }
      return;
    }
    if (mode !== 'exp') return;
    if (busy || performance.now() - arrivedAt < COOLDOWN) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].indexOf(e.key) !== -1) { e.preventDefault(); go(1); }
    else if (['ArrowUp', 'PageUp', 'ArrowLeft'].indexOf(e.key) !== -1) { e.preventDefault(); go(-1); }
  }

  function onScroll() {
    if (ignoreScrollEnter) return;
    /* Nunca auto-entrar al story por scroll residual: eso dejaba la portada blurry
       y reabría el loop demo→inicio. Solo gestos explícitos (wheel/touch/key). */
    if (mode === 'free') {
      clampToDemoEnd();
    }
  }

  function loadOne(i) {
    return new Promise(function (res) {
      if (imgs[i] && imgs[i].complete && imgs[i].naturalWidth) { res(imgs[i]); return; }
      var im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = function () { res(im); };
      im.src = frameUrl('f_' + String(i + 1).padStart(4, '0') + '.webp');
      imgs[i] = im;
    });
  }

  function loadAll() {
    return new Promise(function (res) {
      var next = 0, active = 0, done = 0, MAX = 10;
      function pump() {
        while (active < MAX && next < TOTAL) {
          (function (i) {
            next++; active++;
            loadOne(i).then(function () {
              active--; done++;
              if (done === TOTAL) res(); else pump();
            });
          })(next);
        }
      }
      pump();
    });
  }

  function ensureFrames() {
    if (framesReady && entryReady) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loading = true;
    stage.classList.add('is-loading');
    loadStills();
    loadPromise = loadOne(0).then(function () {
      entryReady = true;
      render();
      /* El resto sigue en background; ya se puede entrar al lock. */
      return loadAll();
    }).then(function () {
      framesReady = true;
      entryReady = true;
      loading = false;
      loadPromise = null;
      stage.classList.remove('is-loading');
      if (mode === 'exp') render();
    });
    return loadPromise;
  }

  window.BoxiesScrollStory = {
    enterExp: enterExp,
    leaveToIntro: leaveToIntro,
    exitToDemo: exitToDemo,
    isLocked: function () { return mode === 'exp' || mode === 'reveal' || mode === 'land'; },
    mode: function () { return mode; }
  };

  mqPortrait.addEventListener('change', function () { location.reload(); });

  resize();
  addEventListener('resize', resize);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', resize);
    visualViewport.addEventListener('scroll', resize);
  }
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('touchend', onTouchEnd, { passive: true });
  addEventListener('touchcancel', onTouchEnd, { passive: true });
  addEventListener('keydown', onKey);
  addEventListener('scroll', onScroll, { passive: true });
  /* Precarga primer frame ya; el resto en idle. */
  ensureFrames();
  render();
})();
