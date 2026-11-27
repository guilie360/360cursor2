/**
 * Landing scroll-story: vídeo por tramos (frames) con lock en cada pausa.
 * Un gesto de scroll/swipe = un tramo. Frames en Bunny CDN o /landing/assets/scroll.
 */
(function () {
  'use strict';

  const FPS = 30;
  const TOTAL = 615;
  const SPEED = 0.85;
  const MIN_DUR = 1.6;
  const MAX_DUR = 6.5;
  const SLOW = 3;
  const EASE = 0.6;
  const COOLDOWN = 700;
  const GAP = 140;

  const HOLDS = [
    { t: 0.0 },
    { t: 1.13, title: 'Tu inmueble aún no está terminado.', sub: 'O ni siquiera existe.' },
    { t: 3.8, title: 'Pero ya puedes venderlo.', sub: 'Con sus acabados y materiales' },
    { t: 5.97, title: 'Cada espacio, para recorrerlo.', sub: 'Recorrido 360° interactivo' },
    { t: 8.2, title: 'Amoblado, para que se imaginen viviendo ahí.', sub: 'Con el estilo que elijas' },
    {
      t: 15.2,
      title: 'Todo en un showroom interactivo.',
      sub: 'Para mostrarlo desde cualquier dispositivo'
    },
    { t: 20.4, final: true }
  ];

  const MOTION = [0.06,0.14,0.24,0.38,0.55,0.75,1,1,1,1,1,1,1,1,1,1,1,1,1,0.99,0.78,0.59,0.43,0.27,0.15,0.07,0.04,0.08,0.08,0.07,0.07,0.06,0.06,0.06,0.06,0.06,0.03,0.03,0.04,0.05,0.06,0.07,0.08,0.08,0.09,0.1,0.11,0.11,0.12,0.14,0.17,0.19,0.22,0.24,0.25,0.28,0.34,0.38,0.46,0.51,0.58,0.65,0.77,0.81,0.86,0.86,0.85,0.82,0.75,0.66,0.57,0.44,0.38,0.32,0.28,0.26,0.22,0.24,0.25,0.29,0.29,0.3,0.27,0.25,0.24,0.21,0.19,0.16,0.13,0.12,0.12,0.12,0.12,0.11,0.11,0.1,0.11,0.1,0.1,0.08,0.07,0.07,0.06,0.06,0.06,0.07,0.09,0.09,0.09,0.09,0.09,0.11,0.11,0.13,0.12,0.14,0.18,0.21,0.26,0.29,0.33,0.39,0.42,0.47,0.49,0.52,0.57,0.58,0.62,0.63,0.65,0.69,0.68,0.73,0.7,0.68,0.68,0.65,0.65,0.62,0.6,0.63,0.59,0.64,0.7,0.78,0.87,0.9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.9,0.8,0.75,0.63,0.58,0.47,0.39,0.34,0.28,0.26,0.22,0.19,0.2,0.22,0.25,0.28,0.33,0.37,0.45,0.51,0.58,0.65,0.69,0.83,0.88,0.92,0.96,0.96,1,1,1,0.96,0.84,0.82,0.77,0.68,0.6,0.49,0.46,0.44,0.42,0.42,0.37,0.4,0.41,0.43,0.43,0.4,0.42,0.4,0.38,0.37,0.34,0.34,0.32,0.31,0.3,0.26,0.26,0.24,0.22,0.2,0.17,0.17,0.15,0.14,0.12,0.1,0.09,0.08,0.08,0.07,0.04,0.04,0.06,0.05,0.05,0.05,0.05,0.05,0.05,0.06,0.07,0.06,0.08,0.07,0.09,0.11,0.13,0.16,0.15,0.19,0.22,0.27,0.33,0.31,0.36,0.4,0.44,0.51,0.47,0.49,0.51,0.53,0.62,0.55,0.58,0.63,0.71,0.87,0.8,0.9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.93,0.81,0.65,0.7,0.57,0.49,0.42,0.36,0.38,0.3,0.24,0.19,0.14,0.14,0.1,0.07,0.05,0.03,0.03,0.02,0.02,0.01,0.01,0.01,0.01,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.01,0.02,0.02,0.01,0.01,0.01,0.02,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.04,0.04,0.05,0.06,0.08,0.12,0.13,0.17,0.2,0.23,0.31,0.35,0.41,0.44,0.48,0.55,0.55,0.61,0.6,0.62,0.65,0.64,0.68,0.66,0.66,0.72,0.69,0.71,0.69,0.7,0.76,0.75,0.82,0.86,0.83,0.88,0.84,0.87,0.87,0.87,0.98,0.94,0.94,0.96,0.99,1,1,1,1,1,1,1,1,1,1,1,0.89,0.8,0.68,0.49,0.44,0.35,0.29,0.22,0.16,0.14,0.09,0.06,0.04,0.03,0.03,0.02,0.02,0.02,0.01,0.01,0.01,0.05,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.02,0.01,0.02,0.02,0.03,0.06,0.09,0.1,0.14,0.15,0.18,0.21,0.21,0.22,0.22,0.21,0.24,0.22,0.24,0.22,0.22,0.24,0.24,0.24,0.23,0.23,0.25,0.23,0.25,0.23,0.23,0.24,0.23,0.23,0.2,0.18,0.19,0.17,0.17,0.16,0.15,0.15,0.14,0.15,0.13,0.12,0.13,0.12,0.12,0.11,0.1,0.11,0.1,0.1,0.09,0.08,0.07,0.06,0.08,0.07,0.06,0.05,0.06,0.06,0.08,0.09,0.1,0.1,0.11,0.13,0.15,0.17,0.2,0.21,0.22,0.25,0.25,0.27,0.3,0.3,0.31,0.32,0.32,0.36,0.32,0.33,0.35,0.31,0.31,0.33,0.3,0.29,0.27,0.27,0.26,0.25,0.24,0.26,0.22,0.22,0.22,0.19,0.19,0.2,0.18,0.16,0.14,0.13,0.19,0.27,0.43,0.96,1,1,1,1,1,1,1,1,1,1,1,0.77,0.49,0.3,0.13,0.09,0.08,0.07,0.07,0.06,0.06,0.06,0.05,0.05,0.05,0.05,0.04,0.04,0.03,0.03,0.02,0.02,0.02,0.02,0.01,0.01];

  const stage = document.getElementById('scrollStage');
  const cv = document.getElementById('scrollCv');
  const loader = document.getElementById('scrollLoader');
  const loaderTxt = document.getElementById('scrollLoaderTxt');
  if (!stage || !cv) return;

  const ctx = cv.getContext('2d', { alpha: false });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqPortrait = matchMedia('(max-aspect-ratio: 1/1)');
  const folder = () => (mqPortrait.matches ? 'frames-cel' : 'frames-pc');

  const BUNNY_ROOT = 'https://boxies.b-cdn.net/landing/scroll';
  const LOCAL_ROOT = '/landing/assets/scroll';

  const $ = (id) => document.getElementById(id);
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const ease = (p) => p * (1 - EASE) + smooth(p) * EASE;

  const cum = new Float64Array(TOTAL + 1);
  for (let j = 0; j < TOTAL; j++) cum[j + 1] = cum[j] + (1 + SLOW * (MOTION[j] || 0));
  function TW(t) {
    const f = Math.max(0, Math.min(TOTAL, t * FPS));
    const j = Math.min(TOTAL - 1, Math.floor(f));
    return cum[j] + (f - j) * (cum[j + 1] - cum[j]);
  }
  function TWinv(u) {
    let lo = 0;
    let hi = TOTAL;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      cum[m] <= u ? (lo = m) : (hi = m);
    }
    return (lo + (u - cum[lo]) / (cum[lo + 1] - cum[lo] || 1)) / FPS;
  }

  const stops = HOLDS;
  const msgEls = stops.map((h) => {
    if (!h.title) return null;
    const d = document.createElement('div');
    d.className = 'scroll-msg';
    d.innerHTML =
      '<h2>' +
      h.title +
      '</h2>' +
      (h.sub ? '<small>' + h.sub + '</small>' : '');
    $('scrollMsgs').appendChild(d);
    return d;
  });
  const dotEls = stops.map(() => {
    const b = document.createElement('b');
    $('scrollDots').appendChild(b);
    return b;
  });

  let frameRoot = LOCAL_ROOT;
  let W = 0;
  let H = 0;
  let lastKey = '';
  const imgs = new Array(TOTAL);
  const stills = [];
  let stillA = 0;
  let stillIdx = -1;
  let stillRaf = 0;
  let cur = 0;
  let busy = false;
  let arrivedAt = 0;
  let lastWheel = 0;
  let mode = 'intro';
  let freeEntered = false;
  let curT = 0;
  let hintTimer = 0;
  let dirName = folder();
  let framesReady = false;

  function frameUrl(name) {
    return frameRoot + '/' + dirName + '/' + name;
  }

  async function resolveFrameRoot() {
    if (typeof window.LANDING_SCROLL_CDN === 'string' && window.LANDING_SCROLL_CDN) {
      return String(window.LANDING_SCROLL_CDN).replace(/\/$/, '');
    }
    const probe = BUNNY_ROOT + '/frames-cel/f_0001.webp';
    try {
      const r = await fetch(probe, { method: 'HEAD', mode: 'cors' });
      if (r.ok) return BUNNY_ROOT;
    } catch (e) {}
    return LOCAL_ROOT;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(innerWidth * dpr);
    H = cv.height = Math.round(innerHeight * dpr);
    lastKey = '';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    render();
  }

  function cover(img, alpha) {
    if (!img || !img.naturalWidth) return;
    const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * r;
    const h = img.naturalHeight * r;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  function loadStills() {
    for (let k = 1; k < stops.length; k++) {
      const im = new Image();
      im.decoding = 'async';
      im.src = frameUrl('still_' + k + '.webp');
      stills[k] = im;
    }
  }

  function fadeStill(k) {
    stillIdx = k;
    stillA = 0;
    const t0 = performance.now();
    const D = reduce ? 0 : 600;
    cancelAnimationFrame(stillRaf);
    (function f(now) {
      stillA = D <= 0 ? 1 : Math.min(1, (now - t0) / D);
      render();
      if (stillA < 1) stillRaf = requestAnimationFrame(f);
    })(t0);
  }

  function drawFrame(t) {
    let f = Math.max(0, Math.min(TOTAL - 1, t * FPS));
    const r = Math.round(f);
    if (Math.abs(f - r) < 0.02) f = r;
    const i0 = Math.floor(f);
    const a = f - i0;
    const i1 = Math.min(TOTAL - 1, i0 + 1);
    const key =
      i0 +
      ':' +
      Math.round(a * 20) +
      ':' +
      W +
      'x' +
      H +
      ':' +
      stillIdx +
      ':' +
      Math.round(stillA * 50);
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

  function render() {
    drawFrame(curT);
  }

  function setHeaderOn(on) {
    const hl = document.getElementById('headerLogo');
    if (hl) hl.classList.toggle('is-on', !!on);
  }

  function stageScrollTop() {
    return Math.max(0, Math.round(stage.getBoundingClientRect().top + scrollY));
  }

  function hideTexts() {
    clearTimeout(hintTimer);
    msgEls.forEach((el) => el && el.classList.remove('on'));
    ['scrollShade', 'scrollScrim', 'scrollHint'].forEach((id) => {
      const el = $(id);
      if (el) el.classList.remove('on');
    });
  }

  function showStop(k) {
    const st = stops[k];
    msgEls.forEach((el, i) => el && el.classList.toggle('on', i === k));
    const shade = $('scrollShade');
    const scrim = $('scrollScrim');
    const hint = $('scrollHint');
    if (shade) shade.classList.toggle('on', !!st.title || !!st.final);
    if (scrim) scrim.classList.toggle('on', !!st.final);
    dotEls.forEach((d, i) => d.classList.toggle('on', i === k));
    clearTimeout(hintTimer);
    if (hint) {
      hintTimer = setTimeout(
        () => {
          if (!busy && mode === 'exp') hint.classList.add('on');
        },
        k === 0 ? 400 : 1200
      );
    }
    try {
      if (k === 0) history.replaceState(null, '', '#servicio');
    } catch (e) {}
    render();
  }

  function go(dir) {
    if (dir < 0 && cur === 0) {
      leaveToIntro();
      return;
    }
    const next = cur + dir;
    if (next < 0) return;
    if (next >= stops.length) {
      exitFree();
      return;
    }
    busy = true;
    hideTexts();
    cancelAnimationFrame(stillRaf);
    stillA = 0;
    stillIdx = -1;
    lastKey = '';
    const from = cur;
    const to = next;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const fwd = to > from;
    const a = stops[lo].t;
    const b = stops[hi].t;
    const w0 = TW(a);
    const w1 = TW(b);
    const dur =
      (reduce ? 0.2 : Math.min(MAX_DUR, Math.max(MIN_DUR, (b - a) / SPEED))) * 1000;
    const t0 = performance.now();
    (function step(now) {
      const u = Math.min(1, (now - t0) / dur);
      const e = ease(u);
      curT = TWinv(fwd ? w0 + (w1 - w0) * e : w1 - (w1 - w0) * e);
      render();
      if (u < 1) requestAnimationFrame(step);
      else {
        cur = to;
        busy = false;
        arrivedAt = performance.now();
        curT = stops[to].t;
        showStop(to);
        if (to > 0 && !stops[to].final) fadeStill(to);
        else if (stops[to].final && to > 0) fadeStill(to);
      }
    })(t0);
  }

  function lockPage() {
    document.documentElement.classList.add('scroll-story-lock');
    document.body.classList.add('scroll-story-lock');
  }
  function unlockPage() {
    document.documentElement.classList.remove('scroll-story-lock');
    document.body.classList.remove('scroll-story-lock');
  }

  function setStoryUi(on) {
    document.documentElement.classList.toggle('scroll-story-active', !!on);
    document.body.classList.toggle('scroll-story-active', !!on);
  }

  function nearStageEntry() {
    /* Solo cuando el intro ya casi salió de pantalla — no al primer pixel de rueda. */
    return scrollY >= Math.max(24, stage.offsetTop - 12);
  }

  function enterExp() {
    if (mode === 'exp') return;
    if (!framesReady) return;
    mode = 'exp';
    freeEntered = false;
    setHeaderOn(true);
    setStoryUi(true);
    unlockPage();
    scrollTo({ top: stage.offsetTop, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = stage.offsetTop;
    lockPage();
    arrivedAt = performance.now();
    showStop(cur);
  }

  function leaveToIntro() {
    mode = 'intro';
    freeEntered = false;
    busy = false;
    hideTexts();
    cur = 0;
    curT = stops[0].t;
    stillA = 0;
    stillIdx = -1;
    lastKey = '';
    setStoryUi(false);
    unlockPage();
    setHeaderOn(false);
    scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    try {
      history.replaceState(null, '', '#inicio');
    } catch (e) {}
    render();
  }

  function exitFree() {
    mode = 'free';
    freeEntered = false;
    hideTexts();
    setStoryUi(false);
    unlockPage();
    setHeaderOn(true);
    const fin = document.getElementById('demo');
    if (fin) {
      const top = Math.round(fin.getBoundingClientRect().top + scrollY);
      scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      try {
        history.replaceState(null, '', '#demo');
      } catch (e) {}
      fin.classList.add('in');
    }
  }

  function relock() {
    enterExp();
  }

  function onWheel(e) {
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    if (mode === 'free') return;
    if (mode === 'intro') {
      if (e.deltaY > 0 && nearStageEntry()) {
        e.preventDefault();
        enterExp();
      }
      return;
    }
    e.preventDefault();
    if (busy || now - arrivedAt < COOLDOWN || gap < GAP || Math.abs(e.deltaY) < 4) return;
    go(e.deltaY > 0 ? 1 : -1);
  }

  let ty0 = null;
  let tDone = false;
  function onTouchStart(e) {
    ty0 = e.touches[0].clientY;
    tDone = false;
  }
  function onTouchMove(e) {
    if (mode === 'free') return;
    if (mode === 'intro') {
      if (ty0 === null) return;
      const dy = ty0 - e.touches[0].clientY;
      if (dy > 45 && nearStageEntry()) {
        e.preventDefault();
        if (!tDone) {
          tDone = true;
          enterExp();
        }
      }
      return;
    }
    e.preventDefault();
    if (tDone || busy || ty0 === null || performance.now() - arrivedAt < COOLDOWN) return;
    const dy = ty0 - e.touches[0].clientY;
    if (Math.abs(dy) > 45) {
      tDone = true;
      go(dy > 0 ? 1 : -1);
    }
  }

  function onKey(e) {
    if (document.body.classList.contains('demo-open')) return;
    if (mode === 'intro') {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key) && nearStageEntry()) {
        e.preventDefault();
        enterExp();
      } else if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        scrollTo({ top: Math.min(stage.offsetTop, scrollY + innerHeight * 0.9), behavior: 'smooth' });
      }
      return;
    }
    if (mode !== 'exp' || busy || performance.now() - arrivedAt < 300) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      go(1);
    } else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      go(-1);
    }
  }

  function onScroll() {
    if (mode === 'intro') {
      if (nearStageEntry()) enterExp();
      setHeaderOn(scrollY > innerHeight * 0.45);
      return;
    }
    if (mode !== 'free') return;
    const st = stage.offsetTop;
    if (scrollY > st + innerHeight * 0.35) freeEntered = true;
    if (freeEntered && scrollY <= st + 4) relock();
    if (scrollY < st - innerHeight * 0.5) {
      mode = 'intro';
      setStoryUi(false);
      setHeaderOn(scrollY > innerHeight * 0.45);
    }
  }

  function loadAll() {
    return new Promise((res) => {
      let next = 0;
      let active = 0;
      let done = 0;
      const MAX = 12;
      const pump = () => {
        while (active < MAX && next < TOTAL) {
          const i = next++;
          active++;
          const im = new Image();
          im.decoding = 'async';
          im.onload = im.onerror = () => {
            active--;
            done++;
            if (loaderTxt) {
              loaderTxt.textContent = 'Cargando ' + Math.round((done / TOTAL) * 100) + '%';
            }
            done === TOTAL ? res() : pump();
          };
          im.src = frameUrl('f_' + String(i + 1).padStart(4, '0') + '.webp');
          imgs[i] = im;
        }
      };
      pump();
    });
  }

  window.BoxiesScrollStory = {
    go: go,
    relock: relock,
    enterExp: enterExp,
    leaveToIntro: leaveToIntro,
    exitFree: exitFree,
    isLocked: () => mode === 'exp',
    mode: () => mode,
    framesReady: () => framesReady
  };

  mqPortrait.addEventListener('change', () => {
    location.reload();
  });

  (async function boot() {
    frameRoot = await resolveFrameRoot();
    dirName = folder();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    mode = 'intro';
    unlockPage();
    setStoryUi(false);
    setHeaderOn(false);
    resize();
    loadStills();
    addEventListener('resize', resize);
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    addEventListener('keydown', onKey);
    addEventListener('scroll', onScroll, { passive: true });
    /* Portada visible de inmediato; frames cargan en segundo plano. */
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(function () {
        try {
          loader.remove();
        } catch (e) {}
      }, 400);
    }
    lastKey = '';
    render();
    await loadAll();
    framesReady = true;
    if (mode === 'intro' && nearStageEntry()) enterExp();
  })();
})();
