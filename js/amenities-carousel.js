try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/amenities-carousel.js');}catch(_e){}
/* =========================================================
   AMENITIES — mismo lenguaje visual que Galería (tour360-card)
   ========================================================= */

var AmenitiesCarousel = (function () {
  var items = [];
  var gridEl = null;

  function ensureElements() {
    gridEl = document.getElementById('amenitiesGrid');
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
      { name: 'Piscina', imageUrl: '', description: '', icon: '' },
      { name: 'Gimnasio', imageUrl: '', description: '', icon: '' },
      { name: 'Zona BBQ', imageUrl: '', description: '', icon: '' },
      { name: 'Coworking', imageUrl: '', description: '', icon: '' },
      { name: 'Juegos', imageUrl: '', description: '', icon: '' }
    ];
  }

  function normalizeItems(list) {
    return (list || []).map(function (item) {
      return {
        name: item.name || item.nombre || '',
        imageUrl: item.imageUrl || item.imagen_url || '',
        description: item.description || item.descripcion || '',
        icon: item.icon || item.icono || ''
      };
    }).filter(function (item) { return item.name || item.imageUrl; });
  }

  function iconMarkup(icon) {
    if (!icon) return '';
    var raw = String(icon).trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || raw.indexOf('/') === 0 || raw.indexOf('data:') === 0) {
      return '<img class="tour360-card-amenity-icon" src="' + escapeHtml(raw) + '" alt="" loading="lazy" decoding="async">';
    }
    return '<span class="tour360-card-amenity-icon-glyph" aria-hidden="true">' + escapeHtml(raw) + '</span>';
  }

  function buildCard(item, index) {
    var card = document.createElement('article');
    card.className = 'tour360-card';
    card.setAttribute('data-amenity', String(index));
    card.setAttribute('aria-label', item.name || 'Amenidad');

    var media = document.createElement('div');
    media.className = 'tour360-card-media';
    if (item.imageUrl) {
      var img = document.createElement('img');
      img.src = item.imageUrl;
      img.alt = item.name || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    }

    var footer = document.createElement('div');
    footer.className = 'tour360-card-footer';

    var iconHtml = iconMarkup(item.icon);
    if (iconHtml) {
      var iconWrap = document.createElement('div');
      iconWrap.className = 'tour360-card-amenity-icon-wrap';
      iconWrap.innerHTML = iconHtml;
      footer.appendChild(iconWrap);
    }

    var nameEl = document.createElement('p');
    nameEl.className = 'tour360-card-name';
    nameEl.textContent = item.name || '';
    footer.appendChild(nameEl);

    if (item.description) {
      var descEl = document.createElement('p');
      descEl.className = 'tour360-card-area';
      descEl.textContent = item.description;
      footer.appendChild(descEl);
    }

    media.appendChild(footer);
    card.appendChild(media);
    return card;
  }

  function playEntrance() {
    if (typeof playCardGridEntrance === 'function') {
      playCardGridEntrance(gridEl, '.tour360-card', 'tour360-card--enter');
      return;
    }
    if (!gridEl) return;
    var cards = gridEl.querySelectorAll('.tour360-card');
    cards.forEach(function (card, index) {
      card.classList.remove('tour360-card--enter');
      card.style.setProperty('--unit-enter-delay', Math.min(index * 120, 720) + 'ms');
      void card.offsetWidth;
      card.classList.add('tour360-card--enter');
    });
  }

  function render() {
    ensureElements();
    if (!gridEl) return;
    if (!items.length) items = demoItems();
    gridEl.innerHTML = '';
    items.forEach(function (item, index) {
      gridEl.appendChild(buildCard(item, index));
    });
  }

  function setItems(list) {
    items = normalizeItems(list);
    if (!items.length) items = demoItems();
    render();
  }

  function onEnter() {
    ensureElements();
    render();
    requestAnimationFrame(function () {
      playEntrance();
    });
  }

  function onExit() {
    /* no-op: grid is static */
  }

  function destroy() {
    if (gridEl) gridEl.innerHTML = '';
  }

  return {
    setItems: setItems,
    onEnter: onEnter,
    onExit: onExit,
    destroy: destroy,
    refresh: render
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  if (typeof AmenitiesCarousel.setItems === 'function') {
    AmenitiesCarousel.setItems([]);
  }
});

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/amenities-carousel.js');}catch(_e){}
