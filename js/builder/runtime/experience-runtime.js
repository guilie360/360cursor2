/* BOXIES ExperienceRuntime — single navigation / playback engine.
 * Preview and Prototipo share this graph walker; only the Renderer differs.
 *   ExperienceRuntime → MediaRenderer | PrototypeRenderer */
var ExperienceRuntime = (function () {
  var FADE_MS = 420;
  var MIN_LOADER_MS = 900;
  var _players = [];
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

  var RUNTIME_BUTTON_ANCHORS = {
    center: { x: 50, y: 50 },
    'top-center': { x: 50, y: 0 },
    'bottom-center': { x: 50, y: 100 },
    'center-left': { x: 0, y: 50 },
    'center-right': { x: 100, y: 50 },
    'top-left': { x: 0, y: 0 },
    'top-right': { x: 100, y: 0 },
    'bottom-left': { x: 0, y: 100 },
    'bottom-right': { x: 100, y: 100 }
  };

  function clampPct(v, fallback) {
    var n = Number(v);
    if (isNaN(n)) n = fallback != null ? fallback : 50;
    return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
  }

  function resolveRuntimeButtonLayout(ix) {
    var x = ix.x != null ? ix.x : (ix.config && ix.config.x);
    var y = ix.y != null ? ix.y : (ix.config && ix.config.y);
    var mode = ix.positionMode || (ix.config && ix.config.positionMode) || 'free';
    var style = ix.style || 'chip';
    var halfW = style === 'icon' ? 22 : (style === 'button' ? 54 : 46);
    var halfH = style === 'icon' ? 22 : 18;
    var halfWp = halfW / 10;
    var halfHp = halfH / 10;
    function clampInside(px, py) {
      return {
        x: clampPct(Math.max(halfWp, Math.min(100 - halfWp, px)), 50),
        y: clampPct(Math.max(halfHp, Math.min(100 - halfHp, py)), 50)
      };
    }
    if (mode !== 'anchor') {
      return clampInside(x, y);
    }
    var anchor = ix.anchor || (ix.config && ix.config.anchor) || 'center';
    var base = RUNTIME_BUTTON_ANCHORS[anchor] || RUNTIME_BUTTON_ANCHORS.center;
    var mx = Number(ix.marginX != null ? ix.marginX : (ix.config && ix.config.marginX));
    var my = Number(ix.marginY != null ? ix.marginY : (ix.config && ix.config.marginY));
    if (!(mx > 0)) mx = 32;
    if (!(my > 0)) my = 32;
    var mxp = mx / 10;
    var myp = my / 10;
    var lx = 50;
    var ly = 50;
    if (base.x === 0) lx = mxp + halfWp;
    else if (base.x === 100) lx = 100 - mxp - halfWp;
    if (base.y === 0) ly = myp + halfHp;
    else if (base.y === 100) ly = 100 - myp - halfHp;
    if (anchor === 'center') { lx = 50; ly = 50; }
    if (anchor === 'top-center' || anchor === 'bottom-center') lx = 50;
    if (anchor === 'center-left' || anchor === 'center-right') ly = 50;
    return clampInside(lx, ly);
  }

  function listRuntimeSceneButtons(node, connections) {
    var ixs = (node && node.config && node.config.interactions) || [];
    var outs = outsFrom(node, node && node.id, connections);
    var result = [];
    ixs.forEach(function (ix) {
      if (!ix || String(ix.type || '').toUpperCase() !== 'BUTTON') return;
      if (ix.enabled === false) return;
      var portId = ix.portId || ix.id;
      var targetId = null;
      for (var i = 0; i < outs.length; i++) {
        if (outs[i].portId && String(outs[i].portId) === String(portId)) {
          targetId = outs[i].toNodeId;
          break;
        }
      }
      var layout = resolveRuntimeButtonLayout(ix);
      result.push({
        id: ix.id,
        label: ix.label != null ? String(ix.label) : '',
        style: ix.style || 'chip',
        icon: ix.icon || null,
        rotation: Number(ix.rotation) || 0,
        x: layout.x,
        y: layout.y,
        targetId: targetId
      });
    });
    return result;
  }

  function resolveRendererFactory(options) {
    var r = options && options.renderer;
    if (r && typeof r.create === 'function') return r;
    if (typeof r === 'string' && r === 'prototype' &&
        typeof PrototypeRenderer !== 'undefined') {
      return PrototypeRenderer;
    }
    if (typeof MediaRenderer !== 'undefined') return MediaRenderer;
    return null;
  }

  function createShell(host, options) {
    var startLabel = (options && options.startLabel) || 'INICIAR';
    var modeClass = (options && options.mode === 'prototype')
      ? ' boxies-xp--prototype'
      : '';
    var root = document.createElement('div');
    root.className = 'boxies-xp' + modeClass;
    root.setAttribute('data-boxies-xp', '1');
    if (options && options.mode === 'prototype') {
      root.setAttribute('data-boxies-prototype', '1');
    }
    root.innerHTML =
      '<div class="boxies-xp__stage" data-xp-stage></div>' +
      '<div class="boxies-xp__hud" data-xp-hud hidden>' +
        '<div class="boxies-xp__hud-title" data-xp-hud-title></div>' +
        '<div class="boxies-xp__hud-meta" data-xp-hud-meta></div>' +
      '</div>' +
      '<div class="boxies-xp__transport" data-xp-transport hidden>' +
        '<button type="button" class="boxies-xp__tbtn" data-xp-pause title="Pausa">❚❚</button>' +
        '<button type="button" class="boxies-xp__tbtn" data-xp-play title="Play">▶</button>' +
        '<button type="button" class="boxies-xp__tbtn" data-xp-restart title="Reiniciar">↺</button>' +
        '<button type="button" class="boxies-xp__tbtn" data-xp-exit title="Salir">✕</button>' +
      '</div>' +
      '<div class="boxies-xp__loader" data-xp-loader hidden aria-hidden="true">' +
        '<div class="boxies-xp__spinner" aria-hidden="true"></div>' +
        '<div class="boxies-xp__loader-label">C A R G A N D O</div>' +
      '</div>' +
      '<div class="boxies-xp__gate" data-xp-gate>' +
        '<button type="button" class="boxies-xp__start" data-xp-start>' + esc(startLabel) + '</button>' +
      '</div>';
    host.appendChild(root);
    return root;
  }

  function Player(host, options) {
    options = options || {};
    this.host = host;
    this.options = options;
    this.runtime = options.runtime || null;
    this.state = options.state || null;
    this.mode = options.mode || 'preview';
    this.root = createShell(host, options);
    this.stage = this.root.querySelector('[data-xp-stage]');
    this.loader = this.root.querySelector('[data-xp-loader]');
    this.gate = this.root.querySelector('[data-xp-gate]');
    this.startBtn = this.root.querySelector('[data-xp-start]');
    this.hud = this.root.querySelector('[data-xp-hud]');
    this.hudTitle = this.root.querySelector('[data-xp-hud-title]');
    this.hudMeta = this.root.querySelector('[data-xp-hud-meta]');
    this.transport = this.root.querySelector('[data-xp-transport]');
    this._running = false;
    this._paused = false;
    this._stopped = false;
    this._token = 0;
    this._nodesById = {};
    this._connections = [];
    this._visitIndex = 0;
    this._visitTotal = 0;
    this._unbindStart = null;
    this._onResize = null;

    var factory = resolveRendererFactory(options);
    this.renderer = factory ? factory.create(this) : null;

    var self = this;
    function onStart(ev) {
      if (ev) ev.preventDefault();
      self.begin();
    }
    this.startBtn.addEventListener('click', onStart);
    this._unbindStart = function () {
      self.startBtn.removeEventListener('click', onStart);
    };

    var pauseBtn = this.root.querySelector('[data-xp-pause]');
    var playBtn = this.root.querySelector('[data-xp-play]');
    var restartBtn = this.root.querySelector('[data-xp-restart]');
    var exitBtn = this.root.querySelector('[data-xp-exit]');
    if (pauseBtn) pauseBtn.addEventListener('click', function () { self.pause(); });
    if (playBtn) playBtn.addEventListener('click', function () { self.resume(); });
    if (restartBtn) restartBtn.addEventListener('click', function () { self.restart(); });
    if (exitBtn) exitBtn.addEventListener('click', function () { self.exit(); });

    this._onResize = function () {
      if (self.renderer && self.renderer.resize) self.renderer.resize();
    };
    window.addEventListener('resize', this._onResize);
  }

  Player.prototype.setRuntime = function (runtime) {
    this.runtime = runtime || null;
    if (this.renderer && this.renderer.setGraph) {
      this.renderer.setGraph(this.runtime, this.state);
    }
    return this;
  };

  Player.prototype.setState = function (state) {
    this.state = state || null;
    if (this.renderer && this.renderer.setGraph) {
      this.renderer.setGraph(this.runtime, this.state);
    }
    return this;
  };

  Player.prototype.ctrl = function () {
    var self = this;
    return {
      stage: this.stage,
      runtime: this.runtime,
      fadeMs: FADE_MS,
      advance: function () { self.gotoNext(self._currentNodeId); },
      advanceTo: function (id) { self.enterNode(id); },
      isStopped: function () { return self._stopped; },
      isPaused: function () { return self._paused; },
      outputsOf: function (node) { return self.outputsOf(node); },
      getNode: function (id) { return self._nodesById[String(id)] || null; },
      listButtons: function (node) {
        return listRuntimeSceneButtons(node, self._connections || []);
      },
      esc: esc
    };
  };

  Player.prototype.showGate = function () {
    this.stopPlayback(true);
    if (this.renderer && this.renderer.clear) this.renderer.clear();
    this.stage.innerHTML = '';
    this.hideLoader();
    this.hideHud();
    if (this.transport) this.transport.hidden = true;
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

  Player.prototype.showHud = function () {
    if (this.hud) this.hud.hidden = false;
    if (this.transport) this.transport.hidden = false;
  };

  Player.prototype.hideHud = function () {
    if (this.hud) this.hud.hidden = true;
  };

  Player.prototype.updateHud = function (node) {
    if (!this.hudTitle) return;
    var label = node ? (node.label || node.typeLabel || 'Nodo') : '';
    var type = node ? (node.typeLabel || node.kind || '') : '';
    this.hudTitle.textContent = label;
    this.hudMeta.textContent = type +
      (this._visitTotal
        ? (' · Nodo ' + this._visitIndex + ' / ' + this._visitTotal)
        : '');
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
    this._paused = false;
    this._running = true;
    this._token += 1;
    var token = this._token;
    this.hideGate();
    this.showLoader();
    this.showHud();
    this.stage.innerHTML = '';
    if (this.renderer && this.renderer.clear) this.renderer.clear();

    var self = this;
    var t0 = Date.now();
    function afterPrepare() {
      if (self._token !== token || self._stopped) return;
      var wait = Math.max(0, MIN_LOADER_MS - (Date.now() - t0));
      setTimeout(function () {
        if (self._token !== token || self._stopped) return;
        self.hideLoader();
        self._bootGraph();
      }, wait);
    }

    if (this.renderer && this.renderer.prepare) {
      this.renderer.prepare(runtime, afterPrepare, {
        state: this.state,
        mode: this.mode
      });
    } else {
      afterPrepare();
    }
  };

  Player.prototype._bootGraph = function () {
    var runtime = this.runtime;
    this._nodesById = indexById(runtime.nodes);
    this._connections = runtime.connections || [];
    this._visitTotal = (runtime.nodes || []).filter(function (n) {
      return n && n.kind !== 'action' && n.kind !== 'hero' && n.role !== 'hero';
    }).length;
    this._visitIndex = 0;
    this._currentNodeId = null;

    if (this.renderer && this.renderer.setGraph) {
      this.renderer.setGraph(runtime, this.state);
    }
    if (this.renderer && this.renderer.resize) this.renderer.resize();

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

  Player.prototype.pause = function () {
    if (!this._running || this._paused) return;
    this._paused = true;
    if (this.renderer && this.renderer.pause) this.renderer.pause();
  };

  Player.prototype.resume = function () {
    if (!this._running || !this._paused) return;
    this._paused = false;
    if (this.renderer && this.renderer.resume) this.renderer.resume();
  };

  Player.prototype.restart = function () {
    this.begin();
  };

  Player.prototype.exit = function () {
    this.showGate();
  };

  Player.prototype.stopPlayback = function (silent) {
    this._stopped = true;
    this._running = false;
    this._paused = false;
    this._token += 1;
    if (this.renderer && this.renderer.clear) this.renderer.clear();
    if (!silent) this.stage.innerHTML = '';
  };

  Player.prototype.destroy = function () {
    this.stopPlayback(true);
    if (this.renderer && this.renderer.destroy) {
      try { this.renderer.destroy(); } catch (e) {}
    }
    this.renderer = null;
    if (this._unbindStart) this._unbindStart();
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    _players = _players.filter(function (p) { return p !== this; }, this);
    if (_active === this) _active = null;
  };

  Player.prototype.resize = function () {
    if (this.renderer && this.renderer.resize) this.renderer.resize();
  };

  Player.prototype.outputsOf = function (node) {
    if (!node) return [];
    return outsFrom(node, node.id, this._connections);
  };

  Player.prototype.clearStage = function () {
    if (this.renderer && this.renderer.clear) this.renderer.clear();
    /* Keep prototype canvas; media clears via renderer + innerHTML below */
    if (!this.renderer || this.renderer.id !== 'prototype') {
      this.stage.innerHTML = '';
    } else {
      var leftovers = this.stage.querySelectorAll('.boxies-xp__empty, .boxies-xp__media, [data-proto-branch]');
      for (var i = 0; i < leftovers.length; i++) {
        if (leftovers[i].parentNode) leftovers[i].parentNode.removeChild(leftovers[i]);
      }
    }
  };

  Player.prototype.gotoNext = function (fromNodeId, preferredTargetId) {
    if (this._stopped) return;
    if (this._paused) return;
    var node = this._nodesById[String(fromNodeId)];
    var outs = this.outputsOf(node);
    if (preferredTargetId) {
      this.enterNode(preferredTargetId);
      return;
    }
    if (!outs.length) {
      this._running = false;
      this.clearStage();
      this.stage.insertAdjacentHTML('beforeend',
        '<div class="boxies-xp__empty boxies-xp__empty--end">' +
        (this.mode === 'prototype' ? 'Prototipo finalizado' : 'Experiencia finalizada') +
        '</div>');
      return;
    }
    if (outs.length === 1) {
      this.enterNode(outs[0].toNodeId);
      return;
    }
    this.playBranchChoice(node, outs);
  };

  Player.prototype.playBranchChoice = function (node, outs) {
    var self = this;
    this.clearStage();
    if (this.renderer && this.renderer.highlightBranch) {
      this.renderer.highlightBranch(node, outs);
    }
    var wrap = document.createElement('div');
    wrap.className = 'boxies-xp__media boxies-xp__media--branch is-enter';
    wrap.setAttribute('data-proto-branch', '1');
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
    this._currentNodeId = String(nodeId);

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

    this._visitIndex += 1;
    this.updateHud(node);
    this.clearStage();

    if (!this.renderer) {
      this.stage.innerHTML = '<div class="boxies-xp__empty">Renderer no disponible.</div>';
      return;
    }

    var kind = String(node.kind || node.type || '').toLowerCase();
    var ctrl = this.ctrl();
    if (kind === 'video' || kind === 'animacion' || kind === 'transicion') {
      this.renderer.playVideo(node, ctrl);
      return;
    }
    if (node.config && node.config.hub && node.config.hub.enabled) {
      this.renderer.playHub(node, ctrl);
      return;
    }
    this.renderer.playImage(node, ctrl);
  };

  function findPlayerByHost(host) {
    for (var i = 0; i < _players.length; i++) {
      if (_players[i].host === host) return _players[i];
    }
    return null;
  }

  function mount(host, options) {
    if (!host) return null;
    options = options || {};
    var existing = findPlayerByHost(host);
    if (existing) {
      var wantMode = options.mode || 'preview';
      var wantRenderer = resolveRendererFactory(options);
      var sameRenderer = existing.renderer && wantRenderer &&
        existing.renderer.id === wantRenderer.id;
      if (sameRenderer && existing.mode === wantMode) {
        if (options.runtime) existing.setRuntime(options.runtime);
        if (options.state) existing.setState(options.state);
        _active = existing;
        return existing;
      }
      try { existing.destroy(); } catch (e) {}
    }
    host.innerHTML = '';
    var player = new Player(host, options);
    _players.push(player);
    _active = player;
    return player;
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
    var player = mount(target, {
      runtime: runtime || window.BuilderRuntime,
      renderer: typeof MediaRenderer !== 'undefined' ? MediaRenderer : null,
      mode: 'preview'
    });
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
    while (_players.length) {
      try { _players[0].destroy(); } catch (e) {}
    }
    _active = null;
  }

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
    Player: Player,
    FADE_MS: FADE_MS
  };
})();
