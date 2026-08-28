/* BOXIES MediaRenderer — Preview / Showroom presentation layer.
 * Draws real media. Navigation stays in ExperienceRuntime. */
var MediaRenderer = (function () {
  var FADE_MS = 420;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function Renderer(player) {
    this.player = player;
    this._video = null;
  }

  Renderer.prototype.id = 'media';

  Renderer.prototype.prepare = function (runtime, done) {
    var urls = [];
    var seen = {};
    function add(u) {
      if (!u || seen[u]) return;
      seen[u] = true;
      urls.push(u);
    }
    (runtime.assets || []).forEach(function (a) {
      if (!a) return;
      add(a.publicUrl);
      add(a.thumbnailUrl);
    });
    (runtime.nodes || []).forEach(function (n) {
      if (!n) return;
      if (n.media) {
        add(n.media.url);
        add(n.media.thumbnailUrl);
      }
      (n.hubPlants || []).forEach(function (p) {
        add(p.url);
        add(p.thumbnailUrl);
      });
    });

    var tasks = urls.slice(0, 24).map(function (url) {
      return new Promise(function (resolve) {
        if (!url) {
          resolve(false);
          return;
        }
        var lower = String(url).toLowerCase();
        var isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(lower) || lower.indexOf('/videos/') !== -1;
        if (isVideo) {
          var v = document.createElement('video');
          v.preload = 'auto';
          v.muted = true;
          v.playsInline = true;
          var doneV = false;
          function finish(ok) {
            if (doneV) return;
            doneV = true;
            resolve(!!ok);
          }
          v.onloadeddata = function () { finish(true); };
          v.onerror = function () { finish(false); };
          setTimeout(function () { finish(true); }, 8000);
          v.src = url;
          try { v.load(); } catch (e) { finish(false); }
          return;
        }
        var img = new Image();
        img.onload = function () { resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = url;
      });
    });
    Promise.all(tasks).then(function () {
      if (typeof done === 'function') done();
    });
  };

  Renderer.prototype.clear = function () {
    if (this._video) {
      try {
        this._video.pause();
        this._video.removeAttribute('src');
        this._video.load();
      } catch (e) {}
      this._video = null;
    }
  };

  Renderer.prototype.pause = function () {
    if (this._video) {
      try { this._video.pause(); } catch (e) {}
    }
  };

  Renderer.prototype.resume = function () {
    if (this._video) {
      try { this._video.play(); } catch (e) {}
    }
  };

  Renderer.prototype.resize = function () {};

  Renderer.prototype.destroy = function () {
    this.clear();
    this.player = null;
  };

  Renderer.prototype.setGraph = function () {};

  Renderer.prototype.playVideo = function (node, ctrl) {
    var self = this;
    var stage = ctrl.stage;
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--video is-enter';
    var url = (node.media && node.media.url) || null;
    if (!url) {
      wrap.innerHTML = '<div class="boxies-xp__empty">Video sin asset: ' + esc(node.label) + '</div>';
      stage.appendChild(wrap);
      setTimeout(function () { ctrl.advance(); }, 1200);
      return;
    }
    var video = document.createElement('video');
    video.className = 'boxies-xp__video';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.src = url;
    wrap.appendChild(video);
    stage.appendChild(wrap);
    this._video = video;

    var advanced = false;
    function advance() {
      if (advanced || ctrl.isStopped()) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () { ctrl.advance(); }, FADE_MS);
    }

    video.addEventListener('ended', advance);
    video.addEventListener('error', function () {
      wrap.innerHTML = '<div class="boxies-xp__empty">No se pudo reproducir: ' + esc(node.label) + '</div>';
      setTimeout(advance, 1000);
    });
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        video.muted = true;
        video.play().catch(function () { setTimeout(advance, 800); });
      });
    }
  };

  Renderer.prototype.playImage = function (node, ctrl) {
    var self = this;
    var stage = ctrl.stage;
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--image is-enter';
    var url = (node.media && (node.media.url || node.media.thumbnailUrl)) || null;
    if (url) {
      wrap.style.backgroundImage = 'url("' + String(url).replace(/"/g, '\\"') + '")';
    } else {
      wrap.innerHTML = '<div class="boxies-xp__empty">Imagen sin asset: ' + esc(node.label) + '</div>';
    }

    var buttons = ctrl.listButtons(node);
    var hotspots = listHotspotMasks(node);
    var advanced = false;
    function advanceTo(targetId) {
      if (advanced || ctrl.isStopped()) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () {
        if (targetId) ctrl.advanceTo(targetId);
        else ctrl.advance();
      }, FADE_MS);
    }

    if (hotspots.length) {
      var hsLayer = document.createElement('div');
      hsLayer.className = 'boxies-xp__hs-layer';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'boxies-xp__hs-svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      hotspots.forEach(function (hs) {
        var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        var pts = (hs.polygon || []).map(function (p) {
          return Number(p.x) + ',' + Number(p.y);
        }).join(' ');
        poly.setAttribute('points', pts);
        poly.setAttribute('class', 'boxies-xp__hs-poly' +
          (hs.animation && hs.animation !== 'none' ? ' is-anim-' + hs.animation : ''));
        poly.style.fill = hs.color || '#6fbf86';
        poly.style.fillOpacity = String(hs.opacity != null ? hs.opacity : 0.22);
        poly.style.stroke = hs.color || '#6fbf86';
        poly.style.strokeWidth = String((hs.borderWidth != null ? hs.borderWidth : 1.5) / 10);
        poly.style.cursor = 'pointer';
        poly.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          self.showSmartCard(hs, ctrl, stage);
        });
        svg.appendChild(poly);
      });
      hsLayer.appendChild(svg);
      wrap.appendChild(hsLayer);
    }

    if (buttons.length) {
      var layer = document.createElement('div');
      layer.className = 'boxies-xp__btn-layer';
      buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'boxies-xp__scene-btn is-style-' + (b.style || 'chip');
        var text = b.label != null ? String(b.label) : '';
        btn.textContent = text || (b.style === 'icon' ? '·' : '');
        btn.style.left = b.x + '%';
        btn.style.top = b.y + '%';
        btn.style.setProperty('--btn-rot', (b.rotation || 0) + 'deg');
        btn.style.transform = 'translate(-50%, -50%) rotate(' + (b.rotation || 0) + 'deg)';
        if (b.targetId) {
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            advanceTo(b.targetId);
          });
        } else {
          btn.disabled = true;
          btn.title = 'Sin destino';
        }
        layer.appendChild(btn);
      });
      wrap.appendChild(layer);
    } else if (!hotspots.length) {
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.title = 'Continuar';
      var hint = document.createElement('div');
      hint.className = 'boxies-xp__tap-hint';
      hint.textContent = 'Toca para continuar';
      wrap.appendChild(hint);
      wrap.addEventListener('click', function () { advanceTo(null); });
      wrap.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          advanceTo(null);
        }
      });
    } else {
      /* Hotspots present: continue via transport / empty tap on media */
      wrap.addEventListener('click', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('.boxies-xp__hs-poly')) return;
        if (ev.target && ev.target.closest && ev.target.closest('.boxies-smart-card')) return;
        advanceTo(null);
      });
    }
    stage.appendChild(wrap);
  };

  function listHotspotMasks(node) {
    var ixs = (node && node.config && node.config.interactions) || [];
    return ixs.filter(function (ix) {
      if (!ix || String(ix.type || '').toUpperCase() !== 'HOTSPOT') return false;
      if (ix.enabled === false) return false;
      var poly = ix.polygon;
      return Array.isArray(poly) && poly.length >= 3;
    });
  }

  Renderer.prototype.showSmartCard = function (ix, ctrl, stage) {
    var existing = stage.querySelector('[data-smart-card-host]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var host = document.createElement('div');
    host.className = 'boxies-smart-card-host';
    host.setAttribute('data-smart-card-host', '1');

    var state = (ctrl && ctrl.state) || null;
    if (!state || !state.estructura) {
      state = {
        estructura: (ctrl.runtime && ctrl.runtime.estructura) || {},
        projectInfo: (ctrl.runtime && ctrl.runtime.projectInfo) || {},
        projectAssets: (ctrl.state && ctrl.state.projectAssets) || {}
      };
    }
    var card = null;
    if (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.buildCardModel) {
      card = EstructuraEntity.buildCardModel(state, ix);
    } else {
      card = {
        ok: false,
        missing: true,
        title: 'Sin resolver',
        message: 'EstructuraEntity no disponible.',
        template: 'completa'
      };
    }

    host.innerHTML = (typeof EstructuraEntity !== 'undefined' && EstructuraEntity.renderCardHtml)
      ? EstructuraEntity.renderCardHtml(card)
      : '<div class="boxies-smart-card"><p>Tarjeta no disponible</p></div>';

    host.addEventListener('click', function (ev) {
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-smart-close') != null) {
        ev.preventDefault();
        if (host.parentNode) host.parentNode.removeChild(host);
        return;
      }
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-smart-reselect') != null) {
        ev.preventDefault();
        if (host.parentNode) host.parentNode.removeChild(host);
        return;
      }
      if (ev.target === host) {
        if (host.parentNode) host.parentNode.removeChild(host);
      }
    });

    stage.appendChild(host);
  };

  Renderer.prototype.playHub = function (node, ctrl) {
    var stage = ctrl.stage;
    var runtime = ctrl.runtime;
    var hub = (node.config && node.config.hub) || {};
    var plants = Array.isArray(node.hubPlants) ? node.hubPlants.slice() : [];
    if (!plants.length && Array.isArray(hub.selectedPlants)) {
      var assetById = {};
      (runtime.assets || []).forEach(function (a) {
        if (a && a.id != null) assetById[String(a.id)] = a;
      });
      plants = hub.selectedPlants.map(function (id, idx) {
        var a = assetById[String(id)];
        return {
          id: id,
          label: String(idx + 1),
          title: (a && a.filename) || ('Planta ' + (idx + 1)),
          url: a ? (a.publicUrl || a.thumbnailUrl) : null,
          thumbnailUrl: a ? (a.thumbnailUrl || a.publicUrl) : null
        };
      });
    }

    var ap = hub.appearance || {};
    var style = ap.style || 'numbers';
    var position = ap.position || 'top-right';
    var alignment = ap.alignment === 'vertical' ? 'vertical' : 'horizontal';
    var gap = ap.gap != null ? Number(ap.gap) : 8;
    var size = ap.size != null ? Number(ap.size) : 32;

    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--hub is-enter';
    wrap.style.setProperty('--hub-gap', gap + 'px');
    wrap.style.setProperty('--hub-size', size + 'px');

    var bg = document.createElement('div');
    bg.className = 'boxies-xp__hub-bg';
    wrap.appendChild(bg);

    var overlay = document.createElement('div');
    overlay.className = 'boxies-xp__hub-overlay is-pos-' + position + ' is-' + alignment + ' is-style-' + style;
    wrap.appendChild(overlay);

    var continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'boxies-xp__hub-continue';
    continueBtn.textContent = 'Continuar';
    continueBtn.hidden = true;
    wrap.appendChild(continueBtn);

    if (!plants.length) {
      wrap.innerHTML = '<div class="boxies-xp__empty">HUB sin plantas seleccionadas</div>';
      stage.appendChild(wrap);
      setTimeout(function () { ctrl.advance(); }, 1400);
      return;
    }

    var activeId = null;
    function setPlant(plant) {
      activeId = plant.id;
      if (plant.url || plant.thumbnailUrl) {
        bg.style.backgroundImage = 'url("' +
          String(plant.url || plant.thumbnailUrl).replace(/"/g, '\\"') + '")';
      }
      overlay.querySelectorAll('[data-plant-id]').forEach(function (el) {
        el.classList.toggle('is-active', String(el.getAttribute('data-plant-id')) === String(plant.id));
      });
      continueBtn.hidden = false;
    }

    plants.forEach(function (plant, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'boxies-xp__hub-chip';
      btn.setAttribute('data-plant-id', String(plant.id));
      if (style === 'thumbnails' && (plant.thumbnailUrl || plant.url)) {
        btn.classList.add('is-thumb');
        btn.style.backgroundImage = 'url("' +
          String(plant.thumbnailUrl || plant.url).replace(/"/g, '\\"') + '")';
        btn.setAttribute('aria-label', plant.title || plant.label);
      } else if (style === 'chips') {
        btn.textContent = plant.title || plant.label || String(idx + 1);
      } else {
        btn.textContent = plant.label || String(idx + 1);
      }
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        setPlant(plant);
      });
      overlay.appendChild(btn);
    });

    stage.appendChild(wrap);
    setPlant(plants[0]);

    var advanced = false;
    function advance() {
      if (advanced || ctrl.isStopped() || !activeId) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () { ctrl.advance(); }, FADE_MS);
    }
    continueBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      advance();
    });
  };

  function create(player) {
    return new Renderer(player);
  }

  return {
    id: 'media',
    create: create,
    FADE_MS: FADE_MS
  };
})();
