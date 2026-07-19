try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/downloads-intro.js');}catch(_e){}
/* =========================================================
   DESCARGAS — carga central + lista flex centrada
   ========================================================= */

var DownloadsIntro = (function () {
  var CHARGE_MS = 2600;
  var SPREAD_MS = 720;

  var stageEl = null;
  var pctEl = null;
  var listEl = null;
  var animFrame = 0;
  var timers = [];

  function ensureElements() {
    stageEl = document.getElementById('downloadsStage');
    pctEl = document.getElementById('downloadsIntroPct');
    listEl = document.getElementById('downloadsList');
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

  function renderListPlain() {
    stopAnim();
    ensureElements();
    if (!listEl) return;
    listEl.innerHTML = '';
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

  function resetIntro() {
    stopAnim();
    ensureElements();
    if (pctEl) {
      pctEl.textContent = '0%';
      pctEl.classList.remove('is-hidden');
    }
    if (listEl) listEl.innerHTML = '';
    setStageState();
  }

  function playIntro() {
    resetIntro();
    ensureElements();

    if (shouldReduceMotion()) {
      renderListPlain();
      return;
    }

    var count = getItems().length;
    var center = getCenterIndex(count);
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
