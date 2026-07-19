try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/amenities-carousel.js');}catch(_e){}
/* =========================================================
   AMENITIES — carrusel 3D premium + intro animada
   ========================================================= */

var AmenitiesCarousel = (function () {
  var items = [];
  var stageEl = null;
  var trackEl = null;
  var hintEl = null;
  var bound = false;
  var animFrame = 0;
  var introFrame = 0;
  var currentProgress = 0;
  var targetIndex = 0;
  var animating = false;
  var animStart = 0;
  var animFrom = 0;
  var touchStartY = 0;
  var touchStartX = 0;
  var touchMoved = false;
  var introPlaying = false;
  var introT = 1;
  var introStart = 0;
  var ANIM_MS = 420;
  var INTRO_MS = 2700;

  function ensureElements() {
    stageEl = document.getElementById('amenitiesCarouselStage');
    trackEl = document.getElementById('amenitiesCarouselTrack');
    hintEl = document.getElementById('amenitiesCarouselHint');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function demoItems() {
    return [
      { name: 'Piscina', imageUrl: '' },
      { name: 'Gimnasio', imageUrl: '' },
      { name: 'Zona BBQ', imageUrl: '' },
      { name: 'Coworking', imageUrl: '' },
      { name: 'Juegos', imageUrl: '' }
    ];
  }

  function normalizeItems(list) {
    return (list || []).map(function (item) {
      return {
        name: item.name || item.nombre || '',
        imageUrl: item.imageUrl || item.imagen_url || '',
        description: item.description || item.descripcion || ''
      };
    }).filter(function (item) { return item.name || item.imageUrl; });
  }

  function buildCardMarkup(item, index) {
    var imageMarkup = item.imageUrl
      ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" decoding="async">'
      : '<span class="amenities-carousel-card-fallback" aria-hidden="true"></span>';

    return '' +
      '<article class="amenities-carousel-card" data-index="' + index + '" role="button" tabindex="-1" aria-label="' + escapeHtml(item.name) + '">' +
        '<div class="amenities-carousel-card-shell">' +
          '<div class="amenities-carousel-card-media">' + imageMarkup + '</div>' +
          '<footer class="amenities-carousel-card-footer">' +
            '<span class="amenities-carousel-card-name">' + escapeHtml(item.name) + '</span>' +
          '</footer>' +
        '</div>' +
      '</article>';
  }

  function clampIndex(index) {
    var max = Math.max(items.length - 1, 0);
    return Math.max(0, Math.min(index, max));
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function currentIndex() {
    return clampIndex(Math.round(currentProgress));
  }

  function shouldReduceMotion() {
    if (typeof isMotionReduced === 'function') return isMotionReduced();
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function hiddenState() {
    return {
      tx: 0,
      tz: -640,
      ry: 0,
      scale: 0.38,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none',
      filter: 'blur(8px) brightness(0.3)',
      role: 'hidden'
    };
  }

  function buildTransform(parts) {
    return 'translate(-50%, -50%) translateX(' + parts.tx.toFixed(2) + 'px) translateZ(' +
      parts.tz.toFixed(2) + 'px) rotateY(' + parts.ry.toFixed(2) + 'deg) scale(' + parts.scale.toFixed(3) + ')';
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpParts(a, b, t) {
    return {
      tx: lerp(a.tx, b.tx, t),
      tz: lerp(a.tz, b.tz, t),
      ry: lerp(a.ry, b.ry, t),
      scale: lerp(a.scale, b.scale, t),
      opacity: lerp(a.opacity, b.opacity, t),
      zIndex: Math.round(lerp(a.zIndex, b.zIndex, t)),
      pointerEvents: t < 0.98 ? 'none' : b.pointerEvents,
      filter: t < 0.75 ? a.filter : b.filter,
      role: t < 0.8 ? a.role : b.role
    };
  }

  function cardTransformParts(offset, reduceMotion) {
    var abs = Math.abs(offset);
    if (abs > 2.85) return hiddenState();

    if (reduceMotion) {
      var snapOpacity = abs < 0.5 ? 1 : Math.max(0, 1 - (abs - 0.5) * 1.2);
      return {
        tx: offset * 28,
        tz: 0,
        ry: 0,
        scale: 1 - Math.min(abs * 0.18, 0.5),
        opacity: snapOpacity,
        zIndex: Math.round(1000 - abs * 100),
        pointerEvents: abs < 0.5 ? 'auto' : (abs < 1.55 ? 'auto' : 'none'),
        filter: 'none',
        role: abs < 0.5 ? 'active' : abs < 1.5 ? (offset < 0 ? 'prev' : 'next') : 'hidden'
      };
    }

    var angleStep = 58;
    var radius = 390;
    var angleDeg = offset * angleStep;
    var angleRad = angleDeg * Math.PI / 180;
    var translateX = Math.sin(angleRad) * radius;
    var translateZ = Math.cos(angleRad) * radius - radius;
    var rotateY = -angleDeg;
    var depthNorm = (translateZ + radius) / radius;
    var scale = 0.64 + depthNorm * 0.36;
    var opacity = abs > 2.1 ? 0 : 1 - Math.max(0, abs - 1.95) * 0.85;
    var blur = abs < 0.4 ? 0 : Math.min((abs - 0.4) * 2.2, 4.5);
    var brightness = 1 - Math.min(Math.max(abs - 0.35, 0) * 0.18, 0.42);

    var role = 'hidden';
    if (abs < 0.42) role = 'active';
    else if (offset < 0 && abs < 1.55) role = 'prev';
    else if (offset > 0 && abs < 1.55) role = 'next';

    return {
      tx: translateX,
      tz: translateZ,
      ry: rotateY,
      scale: scale,
      opacity: opacity,
      zIndex: Math.round(1000 - abs * 100),
      pointerEvents: role === 'active' || role === 'prev' || role === 'next' ? 'auto' : 'none',
      filter: blur > 0
        ? 'blur(' + blur.toFixed(2) + 'px) brightness(' + brightness.toFixed(2) + ')'
        : 'brightness(' + brightness.toFixed(2) + ')',
      role: role
    };
  }

  function spinRingParts(index, count, spinDeg, ringRadius, scale, opacity) {
    var slotDeg = (360 / count) * index;
    var angleDeg = slotDeg + spinDeg;
    var angleRad = angleDeg * Math.PI / 180;
    return {
      tx: Math.sin(angleRad) * ringRadius,
      tz: Math.cos(angleRad) * ringRadius - ringRadius * 0.28,
      ry: -angleDeg,
      scale: scale,
      opacity: opacity,
      zIndex: Math.round(900 + Math.cos(angleRad) * 80),
      pointerEvents: 'none',
      filter: 'brightness(0.96)',
      role: index === 0 ? 'active' : index === 1 ? 'next' : index === count - 1 ? 'prev' : 'hidden'
    };
  }

  function introCardParts(index, count, t) {
    var ease = easeInOutSine(clamp01(t));
    var grow = easeOutQuart(clamp01(t));

    if (count <= 1) {
      return {
        tx: 0,
        tz: 0,
        ry: 0,
        scale: lerp(0.5, 1, grow),
        opacity: 1,
        zIndex: 1000,
        pointerEvents: grow > 0.95 ? 'auto' : 'none',
        filter: 'none',
        role: 'active'
      };
    }

    var finalParts = cardTransformParts(index - currentProgress, false);
    var spinDeg = ease * 210;
    var ringRadius = lerp(132, 0, ease);
    var ringScale = lerp(0.5, finalParts.scale, grow);
    var ring = spinRingParts(index, count, spinDeg, Math.max(ringRadius, 0.001), ringScale, 1);

    return lerpParts(ring, finalParts, ease);
  }

  function applyCardState(card, parts) {
    card.style.opacity = String(parts.opacity);
    card.style.zIndex = String(parts.zIndex);
    card.style.pointerEvents = parts.pointerEvents;
    card.style.filter = parts.filter;
    card.style.transform = buildTransform(parts);
    card.classList.toggle('is-active', parts.role === 'active');
    card.classList.toggle('is-side-prev', parts.role === 'prev');
    card.classList.toggle('is-side-next', parts.role === 'next');
    card.classList.toggle('is-intro', introPlaying);
    card.classList.toggle('is-tappable', parts.role === 'prev' || parts.role === 'next');
    card.setAttribute('aria-hidden', parts.role === 'hidden' ? 'true' : 'false');
    if (parts.role === 'active') {
      card.setAttribute('aria-current', 'true');
    } else {
      card.removeAttribute('aria-current');
    }
  }

  function applyTransforms(progress) {
    if (!trackEl) return;
    var cards = trackEl.querySelectorAll('.amenities-carousel-card');
    var count = cards.length;

    if (introPlaying || introT < 1) {
      trackEl.style.transform = '';

      cards.forEach(function (card, index) {
        applyCardState(card, introCardParts(index, count, introT));
      });

      if (hintEl) hintEl.classList.add('is-hidden');
      if (stageEl) stageEl.classList.toggle('is-intro-playing', true);
      return;
    }

    trackEl.style.transform = '';
    if (stageEl) stageEl.classList.remove('is-intro-playing');

    cards.forEach(function (card, index) {
      var parts = cardTransformParts(index - progress, shouldReduceMotion());
      applyCardState(card, parts);
    });

    if (hintEl) {
      hintEl.classList.toggle('is-hidden', progress > 0.06 || items.length <= 1);
    }
  }

  function stopIntro() {
    if (introFrame) {
      cancelAnimationFrame(introFrame);
      introFrame = 0;
    }
    introPlaying = false;
    introT = 1;
    if (trackEl) trackEl.style.transform = '';
    if (stageEl) stageEl.classList.remove('is-intro-playing');
  }

  function playIntro() {
    stopIntro();
    if (shouldReduceMotion() || items.length <= 1) {
      introT = 1;
      applyTransforms(currentProgress);
      return;
    }

    introPlaying = true;
    introT = 0;
    introStart = performance.now();
    currentProgress = 0;
    targetIndex = 0;

    function tick(now) {
      var elapsed = now - introStart;
      introT = Math.min(elapsed / INTRO_MS, 1);
      applyTransforms(currentProgress);

      if (introT < 1) {
        introFrame = requestAnimationFrame(tick);
      } else {
        introT = 1;
        introPlaying = false;
        introFrame = 0;
        applyTransforms(currentProgress);
      }
    }

    introFrame = requestAnimationFrame(tick);
  }

  function stopAnimation() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = 0;
    }
    animating = false;
  }

  function runAnimation() {
    stopAnimation();
    if (shouldReduceMotion()) {
      currentProgress = targetIndex;
      applyTransforms(currentProgress);
      return;
    }

    animating = true;
    animFrom = currentProgress;
    animStart = performance.now();

    function tick(now) {
      var elapsed = now - animStart;
      var t = Math.min(elapsed / ANIM_MS, 1);
      currentProgress = animFrom + (targetIndex - animFrom) * easeOutCubic(t);
      applyTransforms(currentProgress);

      if (t < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        currentProgress = targetIndex;
        applyTransforms(currentProgress);
        animating = false;
        animFrame = 0;
      }
    }

    animFrame = requestAnimationFrame(tick);
  }

  function canNavigate() {
    return !introPlaying && introT >= 1;
  }

  function goToIndex(index) {
    if (!canNavigate()) return;
    var next = clampIndex(index);
    if (!animating && next === targetIndex) return;
    if (animating) stopAnimation();
    targetIndex = next;
    runAnimation();
  }

  function goBy(delta) {
    if (!canNavigate() || !items.length || items.length <= 1) return;
    goToIndex(currentIndex() + delta);
  }

  function handleCardActivate(card) {
    if (!canNavigate() || !card) return;
    var idx = parseInt(card.getAttribute('data-index'), 10);
    if (isNaN(idx)) return;
    if (idx === currentIndex()) return;
    goToIndex(idx);
  }

  function onCardClick(event) {
    if (!canNavigate()) return;
    var card = event.target.closest('.amenities-carousel-card');
    if (!card || !trackEl || !trackEl.contains(card)) return;
    if (!card.classList.contains('is-side-prev') && !card.classList.contains('is-side-next')) return;
    event.preventDefault();
    event.stopPropagation();
    handleCardActivate(card);
  }

  function onWheel(event) {
    if (!stageEl || items.length <= 1 || !canNavigate()) return;
    event.preventDefault();
    var dir = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
    if (!dir) return;
    goBy(dir);
  }

  function onTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
    touchMoved = false;
  }

  function onTouchMove(event) {
    if (!event.touches || !event.touches.length) return;
    if (Math.abs(event.touches[0].clientY - touchStartY) > 12 ||
        Math.abs(event.touches[0].clientX - touchStartX) > 12) {
      touchMoved = true;
    }
  }

  function onTouchEnd(event) {
    if (!canNavigate() || !event.changedTouches || !event.changedTouches.length) return;
    var deltaY = touchStartY - event.changedTouches[0].clientY;

    if (!touchMoved && Math.abs(deltaY) < 38) {
      var card = event.target.closest && event.target.closest('.amenities-carousel-card');
      if (card && trackEl && trackEl.contains(card) &&
          (card.classList.contains('is-side-prev') || card.classList.contains('is-side-next'))) {
        handleCardActivate(card);
        return;
      }
    }

    if (Math.abs(deltaY) < 38) return;
    goBy(deltaY > 0 ? 1 : -1);
  }

  function onKeyDown(event) {
    if (!stageEl || items.length <= 1 || !canNavigate()) return;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      goBy(1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goBy(-1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      var focused = document.activeElement;
      if (focused && focused.classList && focused.classList.contains('amenities-carousel-card') &&
          trackEl && trackEl.contains(focused)) {
        event.preventDefault();
        handleCardActivate(focused);
      }
    }
  }

  function onResize() {
    applyTransforms(currentProgress);
  }

  function bind() {
    if (bound || !stageEl) return;
    stageEl.addEventListener('wheel', onWheel, { passive: false });
    stageEl.addEventListener('touchstart', onTouchStart, { passive: true });
    stageEl.addEventListener('touchmove', onTouchMove, { passive: true });
    stageEl.addEventListener('touchend', onTouchEnd, { passive: true });
    stageEl.addEventListener('keydown', onKeyDown);
    if (trackEl) trackEl.addEventListener('click', onCardClick);
    window.addEventListener('resize', onResize);
    if (!stageEl.hasAttribute('tabindex')) {
      stageEl.setAttribute('tabindex', '0');
    }
    bound = true;
  }

  function unbind() {
    if (!bound) return;
    stopAnimation();
    stopIntro();
    if (stageEl) {
      stageEl.removeEventListener('wheel', onWheel);
      stageEl.removeEventListener('touchstart', onTouchStart);
      stageEl.removeEventListener('touchmove', onTouchMove);
      stageEl.removeEventListener('touchend', onTouchEnd);
      stageEl.removeEventListener('keydown', onKeyDown);
    }
    if (trackEl) trackEl.removeEventListener('click', onCardClick);
    window.removeEventListener('resize', onResize);
    bound = false;
  }

  function render() {
    ensureElements();
    if (!trackEl) return;

    if (!items.length) items = demoItems();

    trackEl.innerHTML = items.map(buildCardMarkup).join('');
    currentProgress = 0;
    targetIndex = 0;
    introT = 1;
    introPlaying = false;
    applyTransforms(0);
  }

  function setItems(list) {
    items = normalizeItems(list);
    if (!items.length) items = demoItems();
    render();
  }

  function onEnter() {
    ensureElements();
    bind();
    currentProgress = 0;
    targetIndex = 0;
    stopAnimation();
    requestAnimationFrame(function () {
      playIntro();
    });
    if (stageEl) stageEl.focus({ preventScroll: true });
  }

  function onExit() {
    stopAnimation();
    stopIntro();
    currentProgress = 0;
    targetIndex = 0;
    applyTransforms(0);
  }

  function destroy() {
    unbind();
  }

  return {
    setItems: setItems,
    onEnter: onEnter,
    onExit: onExit,
    destroy: destroy,
    refresh: function () {
      applyTransforms(currentProgress);
    }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (typeof AmenitiesCarousel.setItems === 'function') {
    AmenitiesCarousel.setItems([]);
  }
});

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/amenities-carousel.js');}catch(_e){}
