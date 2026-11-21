try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/downloads-intro.js');}catch(_e){}
/* =========================================================
   DESCARGAS — carga central + lista flex centrada
   Móvil V3.8.5: loader independiente centrado (fuera del listado)
   ========================================================= */

var DownloadsIntro = (function () {
  var CHARGE_MS = 2600;
  var SPREAD_MS = 720;

  var stageEl = null;
  var pctEl = null;
  var listEl = null;
  var loaderEl = null;
  var animFrame = 0;
  var timers = [];

  function isMobileViewport() {
    try {
      return window.matchMedia('(max-width: 600px)').matches;
    } catch (e) {
      return false;
    }
  }

  function ensureElements() {
    stageEl = document.getElementById('downloadsStage');
    pctEl = document.getElementById('downloadsIntroPct');
    listEl = document.getElementById('downloadsList');
    loaderEl = document.getElementById('downloadsLoader');
    if (!loaderEl && stageEl) {
      loaderEl = document.createElement('div');
      loaderEl.id = 'downloadsLoader';
      loaderEl.className = 'downloads-loader';
      loaderEl.setAttribute('hidden', '');
      loaderEl.setAttribute('aria-hidden', 'true');
      stageEl.insertBefore(loaderEl, stageEl.firstChild);
    }
  }

  function getItems() {
    if (typeof DOWNLOADS !== 'undefined' && DOWNLOADS.length) return DOWNLOADS;
    return [
      { label: 'Brochure del proyecto', sub: 'PDF', url: '' },
      { label: 'Ficha técnica', sub: 'PDF', url: '' },
      { label: 'Lista de precios', sub: 'PDF', url: '' },
      { label: 'Reglamento PH', sub: 'PDF', url: '' },
      { label: 'Planos generales', sub: 'PDF', url: '' },
      { label: 'Formulario de separación', sub: 'PDF', url: '' },
      { label: 'Memoria descriptiva', sub: 'PDF', url: '' }
    ];
  }

  function shouldReduceMotion() {
    try {
      if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) return false;
    } catch (e) {}
    if (typeof isMotionReduced === 'function') return isMotionReduced();
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  function stopAnim() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = 0;
    }
    clearTimers();
  }

  function getCenterIndex(count) {
    return Math.floor((count - 1) / 2);
  }

  function getSpreadDelay(index, count) {
    return Math.abs(index - getCenterIndex(count)) * 48;
  }

  function buildCardInner(doc) {
    return (
      '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/>' +
        '<path d="M14 3v5h5"/>' +
      '</svg>' +
      '<div class="download-item-text">' +
        '<span class="download-item-label">' + doc.label + '</span>' +
        '<span class="download-item-sub">' + doc.sub + '</span>' +
      '</div>' +
      '<span class="download-item-arrow" aria-hidden="true">&#8595;</span>'
    );
  }

  function buildAnchorLoadingInner(doc) {
    return (
      '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/>' +
        '<path d="M14 3v5h5"/>' +
      '</svg>' +
      '<div class="download-item-text download-item-text--dual">' +
        '<span class="download-item-label-stack">' +
          '<span class="download-item-label download-item-label--prep">Preparando descargas</span>' +
          '<span class="download-item-label download-item-label--real">' + doc.label + '</span>' +
        '</span>' +
        '<span class="download-item-sub-stack">' +
          '<span class="download-item-sub download-item-sub--prep">Cargando</span>' +
          '<span class="download-item-sub download-item-sub--real">' + doc.sub + '</span>' +
        '</span>' +
      '</div>' +
      '<span class="download-item-arrow" aria-hidden="true">&#8595;</span>'
    );
  }

  function buildLoaderInner() {
    return (
      '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/>' +
        '<path d="M14 3v5h5"/>' +
      '</svg>' +
      '<div class="download-item-text">' +
        '<span class="download-item-label download-item-label--prep">Preparando descargas</span>' +
        '<span class="download-item-sub download-item-sub--prep">Cargando</span>' +
      '</div>' +
      '<span class="download-item-arrow" aria-hidden="true">&#8595;</span>'
    );
  }

  function bindDownloadClick(item) {
    item.href = '#';
    item.setAttribute('role', 'button');
    item.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof goTo === 'function') goTo('sphere');
    });
  }

  function buildDownloadItem(doc, index, opts) {
    opts = opts || {};
    var item = document.createElement('a');
    item.className = 'download-item download-item--animate';
    item.setAttribute('data-index', String(index));

    bindDownloadClick(item);

    item.innerHTML = opts.isAnchorLoading ? buildAnchorLoadingInner(doc) : buildCardInner(doc);
    return item;
  }

  function hideLoader() {
    if (!loaderEl) return;
    loaderEl.innerHTML = '';
    loaderEl.setAttribute('hidden', '');
    loaderEl.setAttribute('aria-hidden', 'true');
  }

  function showLoader(energyHost) {
    if (!loaderEl) return null;
    loaderEl.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'download-item download-item--loader is-anchor';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-busy', 'true');
    card.innerHTML = buildLoaderInner();
    var energy = document.createElement('span');
    energy.className = 'download-item-energy';
    energy.setAttribute('aria-hidden', 'true');
    card.insertBefore(energy, card.firstChild);
    loaderEl.appendChild(card);
    loaderEl.removeAttribute('hidden');
    loaderEl.setAttribute('aria-hidden', 'false');
    if (energyHost) energyHost.el = energy;
    return energy;
  }

  function renderListPlain() {
    stopAnim();
    ensureElements();
    hideLoader();
    if (!listEl) return;
    listEl.innerHTML = '';
    listEl.removeAttribute('hidden');
    getItems().forEach(function (doc, index) {
      var item = buildDownloadItem(doc, index);
      item.classList.remove('download-item--animate');
      listEl.appendChild(item);
    });
    if (pctEl) {
      pctEl.textContent = '0%';
      pctEl.classList.add('is-hidden');
    }
    setStageState('is-ready');
  }

  function restoreReady() {
    stopAnim();
    ensureElements();
    if (stageEl && stageEl.classList.contains('is-ready') &&
        listEl && listEl.querySelectorAll('.download-item').length) {
      hideLoader();
      if (listEl) listEl.removeAttribute('hidden');
      if (pctEl) pctEl.classList.add('is-hidden');
      return;
    }
    renderListPlain();
  }

  function setStageState() {
    var args = arguments;
    if (!stageEl) return;
    stageEl.classList.remove('is-charging', 'is-spreading', 'is-ready');
    for (var i = 0; i < args.length; i++) {
      if (args[i]) stageEl.classList.add(args[i]);
    }
  }

  function buildStack(count, center) {
    if (!listEl) return null;
    listEl.innerHTML = '';
    listEl.removeAttribute('hidden');
    var items = getItems();
    var energyEl = null;

    items.forEach(function (doc, index) {
      var card = buildDownloadItem(doc, index, { isAnchorLoading: index === center });

      if (index === center) {
        card.classList.add('is-anchor');
        var energy = document.createElement('span');
        energy.className = 'download-item-energy';
        energy.setAttribute('aria-hidden', 'true');
        card.insertBefore(energy, card.firstChild);
        energyEl = energy;
      } else {
        card.classList.add('is-behind');
      }

      listEl.appendChild(card);
    });

    return energyEl;
  }

  function spreadCards(count, center) {
    if (!listEl || !stageEl) return;

    setStageState('is-spreading');

    var nodes = listEl.querySelectorAll('.download-item--animate');
    nodes.forEach(function (node, index) {
      if (index === center) return;
      node.style.setProperty('--dl-delay', getSpreadDelay(index, count) + 'ms');
      node.classList.remove('is-behind');
      node.classList.add('is-entering');
    });

    var anchor = listEl.querySelector('.is-anchor');
    if (anchor) {
      requestAnimationFrame(function () {
        anchor.classList.add('is-relabeling');
      });
    }

    var energy = listEl.querySelector('.download-item-energy');
    if (energy) energy.classList.add('is-draining');

    timers.push(setTimeout(function () {
      if (energy && energy.parentNode) energy.remove();
      nodes.forEach(function (node) {
        node.classList.remove('is-entering');
        node.style.removeProperty('--dl-delay');
      });
      if (pctEl) pctEl.classList.add('is-hidden');
      setStageState('is-ready');
    }, SPREAD_MS));
  }

  /** Móvil: oculta loader y revela el listado completo (entrada escalonada). */
  function revealListMobile() {
    hideLoader();
    if (!listEl) return;
    listEl.innerHTML = '';
    listEl.removeAttribute('hidden');

    var items = getItems();
    items.forEach(function (doc, index) {
      var card = buildDownloadItem(doc, index);
      card.style.setProperty('--dl-delay', Math.min(index * 48, 480) + 'ms');
      card.classList.add('is-entering');
      listEl.appendChild(card);
    });

    setStageState('is-spreading');
    if (pctEl) pctEl.classList.add('is-hidden');

    timers.push(setTimeout(function () {
      if (!listEl) return;
      listEl.querySelectorAll('.download-item--animate').forEach(function (node) {
        node.classList.remove('is-entering');
        node.style.removeProperty('--dl-delay');
      });
      setStageState('is-ready');
    }, SPREAD_MS));
  }

  function resetIntro() {
    stopAnim();
    ensureElements();
    if (pctEl) {
      pctEl.textContent = '0%';
      pctEl.classList.remove('is-hidden');
    }
    hideLoader();
    if (listEl) {
      listEl.innerHTML = '';
      listEl.removeAttribute('hidden');
    }
    setStageState();
  }

  function playIntroDesktop() {
    var count = getItems().length;
    var center = getCenterIndex(count);
    hideLoader();
    var energyEl = buildStack(count, center);
    setStageState('is-charging');

    var start = performance.now();

    function tick(now) {
      var t = Math.min((now - start) / CHARGE_MS, 1);
      var pct = Math.round(easeOutCubic(t) * 100);

      if (energyEl) energyEl.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';

      if (t < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        animFrame = 0;
        spreadCards(count, center);
      }
    }

    animFrame = requestAnimationFrame(tick);
  }

  function playIntroMobile() {
    if (listEl) {
      listEl.innerHTML = '';
      listEl.setAttribute('hidden', '');
    }
    var energyEl = showLoader();
    setStageState('is-charging');

    var start = performance.now();

    function tick(now) {
      var t = Math.min((now - start) / CHARGE_MS, 1);
      var pct = Math.round(easeOutCubic(t) * 100);

      if (energyEl) energyEl.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';

      if (t < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        animFrame = 0;
        if (energyEl) energyEl.classList.add('is-draining');
        timers.push(setTimeout(function () {
          revealListMobile();
        }, 280));
      }
    }

    animFrame = requestAnimationFrame(tick);
  }

  function playIntro() {
    resetIntro();
    ensureElements();

    if (shouldReduceMotion()) {
      renderListPlain();
      return;
    }

    if (isMobileViewport()) {
      playIntroMobile();
    } else {
      playIntroDesktop();
    }
  }

  function onEnter() {
    playIntro();
  }

  function onExit() {
    resetIntro();
  }

  return {
    onEnter: onEnter,
    onExit: onExit,
    reset: resetIntro,
    renderListPlain: renderListPlain,
    restoreReady: restoreReady
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/downloads-intro.js');}catch(_e){}
