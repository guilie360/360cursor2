/* BOXIES ExperienceRuntime — single execution engine for Vista previa + Showroom.
 * Reads window.BuilderRuntime (or an injected runtime) and plays the graph. */
var ExperienceRuntime = (function () {
  var FADE_MS = 420;
  var MIN_LOADER_MS = 900;
  var _active = null;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function indexById(list) {
    var map = {};
    (list || []).forEach(function (item) {
      if (item && item.id != null) map[String(item.id)] = item;
    });
    return map;
  }

  function findHero(nodes) {
    for (var i = 0; i < (nodes || []).length; i++) {
      var n = nodes[i];
      if (n && (n.kind === 'hero' || n.role === 'hero')) return n;
    }
    return null;
  }

  function outsFrom(nodeOrConnections, nodeId, connectionsFallback) {
    /* Prefer node.outputs from compiled graph */
    if (nodeOrConnections && Array.isArray(nodeOrConnections.outputs)) {
      return nodeOrConnections.outputs.map(function (o) {
        return {
          toNodeId: o.toNodeId,
          portId: o.portId || null,
          portLabel: o.portLabel || null,
          edgeId: o.edgeId || null
        };
      }).filter(function (o) { return !!o.toNodeId; });
    }
    var out = [];
    (connectionsFallback || []).forEach(function (ed) {
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var to = ed.targetNodeId || ed.to || ed.targetId;
      if (String(from) === String(nodeId) && to) {
        out.push({
          toNodeId: to,
          portId: ed.sourcePortId || null,
          portLabel: ed.sourcePortLabel || null,
          edgeId: ed.id || null
        });
      }
    });
    return out;
  }

  function collectPreloadUrls(runtime) {
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
    return urls;
  }

  function preloadUrl(url) {
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
        var done = false;
        function finish(ok) {
          if (done) return;
          done = true;
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
  }

  function createShell(host) {
    var root = document.createElement('div');
    root.className = 'boxies-xp';
    root.setAttribute('data-boxies-xp', '1');
    root.innerHTML =
      '<div class="boxies-xp__stage" data-xp-stage></div>' +
      '<div class="boxies-xp__loader" data-xp-loader hidden aria-hidden="true">' +
        '<div class="boxies-xp__spinner" aria-hidden="true"></div>' +
        '<div class="boxies-xp__loader-label">C A R G A N D O</div>' +
      '</div>' +
      '<div class="boxies-xp__gate" data-xp-gate>' +
        '<button type="button" class="boxies-xp__start" data-xp-start>INICIAR</button>' +
      '</div>';
    host.appendChild(root);
    return root;
  }

  function Player(host, options) {
    options = options || {};
    this.host = host;
    this.options = options;
    this.runtime = options.runtime || null;
    this.root = createShell(host);
    this.stage = this.root.querySelector('[data-xp-stage]');
    this.loader = this.root.querySelector('[data-xp-loader]');
    this.gate = this.root.querySelector('[data-xp-gate]');
    this.startBtn = this.root.querySelector('[data-xp-start]');
    this._running = false;
    this._stopped = false;
    this._token = 0;
    this._nodesById = {};
    this._connections = [];
    this._currentVideo = null;
    this._unbindStart = null;

    var self = this;
    function onStart(ev) {
      if (ev) ev.preventDefault();
      self.begin();
    }
    this.startBtn.addEventListener('click', onStart);
    this._unbindStart = function () {
      self.startBtn.removeEventListener('click', onStart);
    };
  }

  Player.prototype.setRuntime = function (runtime) {
    this.runtime = runtime || null;
    return this;
  };

  Player.prototype.showGate = function () {
    this.stopPlayback(true);
    this.stage.innerHTML = '';
    this.hideLoader();
    if (this.gate) {
      this.gate.hidden = false;
      this.gate.setAttribute('aria-hidden', 'false');
    }
  };

  Player.prototype.hideGate = function () {
    if (this.gate) {
      this.gate.hidden = true;
      this.gate.setAttribute('aria-hidden', 'true');
    }
  };

  Player.prototype.showLoader = function () {
    if (!this.loader) return;
    this.loader.hidden = false;
    this.loader.removeAttribute('hidden');
    this.loader.setAttribute('aria-hidden', 'false');
    this.loader.classList.remove('is-hidden');
  };

  Player.prototype.hideLoader = function () {
    if (!this.loader) return;
    this.loader.classList.add('is-hidden');
    this.loader.setAttribute('aria-hidden', 'true');
    var self = this;
    setTimeout(function () {
      if (self.loader) self.loader.hidden = true;
    }, 480);
  };

  Player.prototype.begin = function () {
    var runtime = this.runtime || window.BuilderRuntime || null;
    if (!runtime || !runtime.nodes || !runtime.nodes.length) {
      this.stage.innerHTML =
        '<div class="boxies-xp__empty">Runtime vacío. Ejecuta RUN en la etapa Runtime.</div>';
      this.hideGate();
      return;
    }
    this.runtime = runtime;
    this._stopped = false;
    this._running = true;
    this._token += 1;
    var token = this._token;
    this.hideGate();
    this.showLoader();
    this.stage.innerHTML = '';

    var self = this;
    var t0 = Date.now();
    var urls = collectPreloadUrls(runtime);
    var tasks = urls.slice(0, 24).map(preloadUrl);
    Promise.all(tasks).then(function () {
      if (self._token !== token || self._stopped) return;
      var wait = Math.max(0, MIN_LOADER_MS - (Date.now() - t0));
      setTimeout(function () {
        if (self._token !== token || self._stopped) return;
        self.hideLoader();
        self._bootGraph();
      }, wait);
    });
  };

  Player.prototype._bootGraph = function () {
    var runtime = this.runtime;
    this._nodesById = indexById(runtime.nodes);
    this._connections = runtime.connections || [];
    var hero = findHero(runtime.nodes);
    var startId = runtime.entryNodeId || null;
    if (!startId && hero) startId = hero.id;
    if (!startId && runtime.nodes[0]) startId = runtime.nodes[0].id;
    if (!startId) {
      this.stage.innerHTML = '<div class="boxies-xp__empty">No hay nodo de entrada en el grafo.</div>';
      return;
    }
    this.enterNode(startId);
  };

  Player.prototype.stopPlayback = function (silent) {
    this._stopped = true;
    this._running = false;
    this._token += 1;
    if (this._currentVideo) {
      try {
        this._currentVideo.pause();
        this._currentVideo.removeAttribute('src');
        this._currentVideo.load();
      } catch (e) {}
      this._currentVideo = null;
    }
    if (!silent) this.stage.innerHTML = '';
  };

  Player.prototype.destroy = function () {
    this.stopPlayback(true);
    if (this._unbindStart) this._unbindStart();
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
  };

  Player.prototype.outputsOf = function (node) {
    if (!node) return [];
    return outsFrom(node, node.id, this._connections);
  };

  Player.prototype.gotoNext = function (fromNodeId, preferredTargetId) {
    if (this._stopped) return;
    var node = this._nodesById[String(fromNodeId)];
    var outs = this.outputsOf(node);
    if (preferredTargetId) {
      this.enterNode(preferredTargetId);
      return;
    }
    if (!outs.length) {
      this.stage.innerHTML =
        '<div class="boxies-xp__empty boxies-xp__empty--end">Experiencia finalizada</div>';
      return;
    }
    if (outs.length === 1) {
      this.enterNode(outs[0].toNodeId);
      return;
    }
    /* Multiple exits — Runtime presents the branch; compiler did not pick one */
    this.playBranchChoice(node, outs);
  };

  Player.prototype.playBranchChoice = function (node, outs) {
    var self = this;
    this.clearStage();
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--branch is-enter';
    var title = document.createElement('div');
    title.className = 'boxies-xp__branch-title';
    title.textContent = (node && node.label) ? node.label : 'Elegir camino';
    wrap.appendChild(title);
    var list = document.createElement('div');
    list.className = 'boxies-xp__branch-list';
    outs.forEach(function (o) {
      var target = self._nodesById[String(o.toNodeId)];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'boxies-xp__branch-btn';
      btn.textContent = (o.portLabel ? (o.portLabel + ' → ') : '') +
        ((target && target.label) || o.toNodeId);
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        wrap.classList.add('is-exit');
        setTimeout(function () { self.enterNode(o.toNodeId); }, FADE_MS);
      });
      list.appendChild(btn);
    });
    wrap.appendChild(list);
    this.stage.appendChild(wrap);
  };

  Player.prototype.enterNode = function (nodeId) {
    if (this._stopped) return;
    var node = this._nodesById[String(nodeId)];
    if (!node) {
      this.gotoNext(nodeId);
      return;
    }
    if (node.kind === 'hero' || node.role === 'hero' || node.type === 'hero') {
      var outs = this.outputsOf(node);
      if (outs.length === 1) {
        this.enterNode(outs[0].toNodeId);
      } else if (outs.length > 1) {
        this.playBranchChoice(node, outs);
      } else {
        this.stage.innerHTML = '<div class="boxies-xp__empty">Hero sin salidas en el grafo.</div>';
      }
      return;
    }
    var kind = String(node.kind || node.type || '').toLowerCase();
    if (kind === 'video' || kind === 'animacion' || kind === 'transicion') {
      this.playVideo(node);
      return;
    }
    if (node.config && node.config.hub && node.config.hub.enabled) {
      this.playHub(node);
      return;
    }
    this.playImage(node);
  };

  Player.prototype.clearStage = function () {
    if (this._currentVideo) {
      try {
        this._currentVideo.pause();
      } catch (e) {}
      this._currentVideo = null;
    }
    this.stage.innerHTML = '';
  };

  Player.prototype.playVideo = function (node) {
    var self = this;
    this.clearStage();
    var url = (node.media && node.media.url) || null;
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--video is-enter';
    if (!url) {
      wrap.innerHTML = '<div class="boxies-xp__empty">Video sin asset: ' + esc(node.label) + '</div>';
      this.stage.appendChild(wrap);
      setTimeout(function () { self.gotoNext(node.id); }, 1200);
      return;
    }
    var video = document.createElement('video');
    video.className = 'boxies-xp__video';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.src = url;
    wrap.appendChild(video);
    this.stage.appendChild(wrap);
    this._currentVideo = video;

    var advanced = false;
    function advance() {
      if (advanced || self._stopped) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () { self.gotoNext(node.id); }, FADE_MS);
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

  Player.prototype.playImage = function (node) {
    var self = this;
    this.clearStage();
    var url = (node.media && (node.media.url || node.media.thumbnailUrl)) || null;
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--image is-enter';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.title = 'Continuar';

    if (url) {
      wrap.style.backgroundImage = 'url("' + String(url).replace(/"/g, '\\"') + '")';
    } else {
      wrap.innerHTML = '<div class="boxies-xp__empty">Imagen sin asset: ' + esc(node.label) + '</div>';
    }

    var hint = document.createElement('div');
    hint.className = 'boxies-xp__tap-hint';
    hint.textContent = 'Toca para continuar';
    wrap.appendChild(hint);
    this.stage.appendChild(wrap);

    var advanced = false;
    function advance() {
      if (advanced || self._stopped) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () { self.gotoNext(node.id); }, FADE_MS);
    }
    wrap.addEventListener('click', advance);
    wrap.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        advance();
      }
    });
  };

  Player.prototype.playHub = function (node) {
    var self = this;
    this.clearStage();
    var hub = (node.config && node.config.hub) || {};
    var plants = Array.isArray(node.hubPlants) ? node.hubPlants.slice() : [];
    if (!plants.length && Array.isArray(hub.selectedPlants)) {
      var assetById = indexById(this.runtime.assets || []);
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
      this.stage.appendChild(wrap);
      setTimeout(function () { self.gotoNext(node.id); }, 1400);
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

    this.stage.appendChild(wrap);
    setPlant(plants[0]);

    var advanced = false;
    function advance() {
      if (advanced || self._stopped || !activeId) return;
      advanced = true;
      wrap.classList.remove('is-enter');
      wrap.classList.add('is-exit');
      setTimeout(function () { self.gotoNext(node.id); }, FADE_MS);
    }
    continueBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      advance();
    });
  };

  function mount(host, options) {
    if (!host) return null;
    if (_active && _active.host === host) {
      if (options && options.runtime) _active.setRuntime(options.runtime);
      return _active;
    }
    if (_active) {
      try { _active.destroy(); } catch (e) {}
      _active = null;
    }
    host.innerHTML = '';
    _active = new Player(host, options || {});
    return _active;
  }

  function getActive() {
    return _active;
  }

  function start(runtime, host) {
    var target = host || (_active && _active.host) || document.getElementById('builderXpHost');
    if (!target && document.body) {
      var existing = document.querySelector('[data-boxies-xp-host]');
      if (existing) target = existing;
    }
    if (!target) return null;
    var player = mount(target, { runtime: runtime || window.BuilderRuntime });
    if (player) player.begin();
    return player;
  }

  function reset() {
    if (_active) _active.showGate();
  }

  function stop() {
    if (_active) _active.stopPlayback(false);
  }

  function destroy() {
    if (_active) {
      try { _active.destroy(); } catch (e) {}
      _active = null;
    }
  }

  /* Showroom / iframe: accept injected runtime from Builder parent */
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function (ev) {
      var data = ev && ev.data;
      if (!data || data.type !== 'boxies-runtime-inject') return;
      if (data.runtime) {
        try { window.BuilderRuntime = data.runtime; } catch (e) {}
        if (_active) _active.setRuntime(data.runtime);
      }
    });
  }

  return {
    mount: mount,
    start: start,
    reset: reset,
    stop: stop,
    destroy: destroy,
    getActive: getActive,
    Player: Player
  };
})();
