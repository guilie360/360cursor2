/* BOXIES PrototypeRenderer — procedural presentation layer.
 * Draws prismas / cámara. Navigation stays in ExperienceRuntime. */
var PrototypeRenderer = (function () {
  var FADE_MS = 420;
  var HOLD_MS = 2600;
  var MOTION_MS = 2800;
  var GREEN = '#6fbf86';
  var VOL_FILL = '#1a1a1a';
  var VOL_EDGE = '#6a6a6a';
  var VOL_DIM = '#101010';

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function isMotionKind(kind) {
    var k = String(kind || '').toLowerCase();
    return k === 'video' || k === 'animacion' || k === 'transicion';
  }

  function Renderer(player) {
    this.player = player;
    this.canvas = null;
    this.ctx = null;
    this._volumes = [];
    this._volumesById = {};
    this._activeId = null;
    this._branchIds = null;
    this._prevId = null;
    this._fade = 1;
    this._raf = null;
    this._holdTimer = null;
    this._motion = null;
    this._paused = false;
    this._pauseAt = 0;
    this._token = 0;
    this._ctrl = null;
    this._cam = {
      yaw: Math.PI / 5.2,
      scale: 16,
      cx: 0,
      cy: 0,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      goalX: 0,
      goalY: 0,
      goalZ: 0,
      goalScale: 16
    };
  }

  Renderer.prototype.id = 'prototype';

  Renderer.prototype._ensureCanvas = function () {
    var stage = this.player && this.player.stage;
    if (!stage) return;
    if (this.canvas && this.canvas.parentNode === stage) return;
    stage.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'boxies-proto-rt__canvas';
    this.canvas.setAttribute('data-proto-canvas', '1');
    stage.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    if (!this._raf) this._loop();
  };

  Renderer.prototype.prepare = function (runtime, done, options) {
    this._ensureCanvas();
    this.setGraph(runtime, options && options.state);
    if (typeof done === 'function') done();
  };

  Renderer.prototype.setGraph = function (runtime, state) {
    var volumes = [];
    if (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.buildStoryboard && state) {
      var sb = ExperienciaPrototype.buildStoryboard(state);
      volumes = (sb && sb.volumes) ? sb.volumes.slice() : [];
    } else if (runtime && runtime.nodes) {
      /* Fallback: minimal boxes from runtime node list */
      (runtime.nodes || []).forEach(function (n, i) {
        if (!n || n.kind === 'action') return;
        volumes.push({
          id: n.id,
          label: n.label || n.kind,
          kind: n.kind,
          shape: 'box',
          x: (i % 4) * 4,
          y: Math.floor(i / 4) * 4,
          z: 0,
          w: 2.2,
          d: 2,
          h: 1.6,
          fill: VOL_FILL
        });
      });
    }
    this._volumes = volumes;
    this._volumesById = {};
    volumes.forEach(function (v) {
      if (v && v.id != null) this._volumesById[String(v.id)] = v;
    }, this);
  };

  Renderer.prototype.clear = function () {
    this._token += 1;
    this._clearHold();
    this._motion = null;
    this._branchIds = null;
    this._ctrl = null;
    if (this.player && this.player.stage) {
      var branch = this.player.stage.querySelector('[data-proto-branch]');
      if (branch && branch.parentNode) branch.parentNode.removeChild(branch);
    }
  };

  Renderer.prototype.pause = function () {
    this._paused = true;
    this._pauseAt = performance.now();
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  };

  Renderer.prototype.resume = function () {
    if (!this._paused) return;
    var pausedFor = this._pauseAt ? (performance.now() - this._pauseAt) : 0;
    this._paused = false;
    this._pauseAt = 0;
    if (this._motion && pausedFor > 0) this._motion.t0 += pausedFor;
    if (!this._motion && this._activeId && this._ctrl && !this._branchIds) {
      var node = this._ctrl.getNode(this._activeId);
      if (node && !isMotionKind(node.kind)) {
        var self = this;
        var token = this._token;
        var ctrl = this._ctrl;
        this._holdTimer = setTimeout(function () {
          if (self._token !== token || self._paused || ctrl.isStopped()) return;
          self._fadeOutThen(function () { ctrl.advance(); });
        }, Math.floor(HOLD_MS * 0.5));
      }
    }
  };

  Renderer.prototype.resize = function () {
    if (!this.canvas || !this.player || !this.player.stage) return;
    var stage = this.player.stage;
    var w = stage.clientWidth || 640;
    var h = stage.clientHeight || 420;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this._cam.cx = this.canvas.width / 2;
    this._cam.cy = this.canvas.height * 0.58;
  };

  Renderer.prototype.destroy = function () {
    this.clear();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.canvas = null;
    this.ctx = null;
    this.player = null;
  };

  Renderer.prototype._clearHold = function () {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  };

  Renderer.prototype._flyCamTo = function (vol, zoom) {
    if (!vol) return;
    this._cam.goalX = vol.x;
    this._cam.goalY = vol.y;
    this._cam.goalZ = vol.z + vol.h * 0.45;
    this._cam.goalScale = zoom || (
      vol.shape === 'overview' ? 13 :
      vol.shape === 'tower' ? 20 :
      vol.shape === 'room' ? 34 : 26
    );
  };

  Renderer.prototype._fadeOutThen = function (fn) {
    var self = this;
    var token = this._token;
    var t0 = performance.now();
    function step(now) {
      if (self._token !== token) return;
      if (self._paused) {
        requestAnimationFrame(step);
        return;
      }
      var t = Math.min(1, (now - t0) / FADE_MS);
      self._fade = 1 - t;
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      self._fade = 0;
      if (fn) fn();
    }
    requestAnimationFrame(step);
  };

  Renderer.prototype._beginScene = function (node, ctrl) {
    this._ensureCanvas();
    this._ctrl = ctrl;
    this._prevId = this._activeId;
    this._activeId = String(node.id);
    this._branchIds = null;
    this._fade = 1;
    this._clearHold();
    this._motion = null;
    this._token += 1;
  };

  Renderer.prototype.playVideo = function (node, ctrl) {
    this._beginScene(node, ctrl);
    var vol = this._volumesById[String(node.id)];
    var outs = ctrl.outputsOf(node);
    var targetVol = vol;
    if (outs.length === 1) {
      targetVol = this._volumesById[String(outs[0].toNodeId)] || vol;
    }
    var fromVol = this._volumesById[String(this._prevId)] || vol;
    var label = String((node && (node.label || node.typeLabel)) || '').toLowerCase();
    var motionKind = 'fly';
    if (/zoom|acerc|piso|apto|apart|habit/.test(label)) motionKind = 'zoom';
    else if (/orbit|orbita|giro|vuelta/.test(label)) motionKind = 'orbit';
    else if (/pan|paneo|lateral|recorrido/.test(label)) motionKind = 'pan';
    else if (/fly|vuelo|intro|torre|tower/.test(label)) motionKind = 'fly';

    var self = this;
    var token = this._token;
    var toScale = targetVol
      ? (targetVol.shape === 'tower' ? 22
        : targetVol.shape === 'floor' ? 26
        : targetVol.shape === 'apt' || targetVol.shape === 'room' ? 34
        : 28)
      : 28;
    if (motionKind === 'zoom') toScale = Math.max(toScale, 32);

    this._motion = {
      token: token,
      t0: performance.now(),
      dur: MOTION_MS,
      kind: motionKind,
      from: {
        x: fromVol ? fromVol.x : this._cam.targetX,
        y: fromVol ? fromVol.y : this._cam.targetY,
        z: fromVol ? fromVol.z : this._cam.targetZ,
        scale: this._cam.scale,
        yaw: this._cam.yaw
      },
      to: {
        x: targetVol ? targetVol.x : 0,
        y: targetVol ? targetVol.y : 0,
        z: targetVol ? (targetVol.z + targetVol.h * 0.5) : 0,
        scale: toScale,
        yaw: this._cam.yaw + (motionKind === 'orbit' ? 0.85 : (motionKind === 'pan' ? 0.12 : 0.28))
      },
      onDone: function () {
        if (self._token !== token || ctrl.isStopped()) return;
        self._fadeOutThen(function () { ctrl.advance(); });
      }
    };
    this._cam.goalX = this._motion.to.x;
    this._cam.goalY = this._motion.to.y;
    this._cam.goalZ = this._motion.to.z;
    this._cam.goalScale = this._motion.to.scale;
  };

  Renderer.prototype.playImage = function (node, ctrl) {
    this._beginScene(node, ctrl);
    var vol = this._volumesById[String(node.id)];
    this._flyCamTo(vol, null);
    var self = this;
    var token = this._token;
    this._holdTimer = setTimeout(function () {
      if (self._token !== token || self._paused || ctrl.isStopped()) return;
      self._fadeOutThen(function () { ctrl.advance(); });
    }, HOLD_MS);
  };

  Renderer.prototype.playHub = function (node, ctrl) {
    /* Procedural: treat hub as static hold on volume */
    this.playImage(node, ctrl);
  };

  Renderer.prototype.highlightBranch = function (node, outs) {
    this._branchIds = (outs || []).map(function (o) { return String(o.toNodeId); });
    this._clearHold();
    this._motion = null;
    var vol = this._volumesById[String(node && node.id)];
    this._flyCamTo(vol, 18);
    this._fade = 1;
  };

  Renderer.prototype._iso = function (x, y, z) {
    var cam = this._cam;
    var cos = Math.cos(cam.yaw);
    var sin = Math.sin(cam.yaw);
    var rx = x * cos - y * sin;
    var ry = x * sin + y * cos;
    var sx = (rx - ry) * cam.scale * 0.866;
    var sy = (rx + ry) * cam.scale * 0.5 - z * cam.scale;
    return {
      x: cam.cx + sx - cam.targetX * cam.scale * 0.2,
      y: cam.cy + sy - cam.targetY * cam.scale * 0.2 + cam.targetZ * cam.scale * 0.35
    };
  };

  Renderer.prototype._drawBox = function (cx, cy, cz, w, d, h, fill, stroke, lineW, isActive) {
    var ctx = this.ctx;
    if (!ctx) return;
    var x0 = cx - w / 2;
    var x1 = cx + w / 2;
    var y0 = cy - d / 2;
    var y1 = cy + d / 2;
    var z0 = cz;
    var z1 = cz + h;
    var corners = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ].map(function (c) {
      return this._iso(c[0], c[1], c[2]);
    }, this);

    function face(i0, i1, i2, i3, alpha) {
      ctx.beginPath();
      ctx.moveTo(corners[i0].x, corners[i0].y);
      ctx.lineTo(corners[i1].x, corners[i1].y);
      ctx.lineTo(corners[i2].x, corners[i2].y);
      ctx.lineTo(corners[i3].x, corners[i3].y);
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      ctx.stroke();
    }
    face(4, 5, 6, 7, isActive ? 0.95 : 0.88);
    face(0, 3, 7, 4, isActive ? 0.75 : 0.55);
    face(1, 0, 4, 5, isActive ? 0.82 : 0.65);
  };

  Renderer.prototype._drawVolume = function (v, activeId, branchIds) {
    var isActive = activeId && String(v.id) === String(activeId);
    var isBranch = branchIds && branchIds.indexOf(String(v.id)) >= 0;
    var dim = activeId && !isActive && !isBranch;
    var fill = isActive ? '#243528' : (isBranch ? '#1e2a22' : (dim ? VOL_DIM : (v.fill || VOL_FILL)));
    var stroke = (isActive || isBranch) ? GREEN : VOL_EDGE;
    var lineW = isActive ? 2.2 : 1;

    if (v.shape === 'house' || v.dual) {
      var gap = 0.35;
      var halfW = v.w * 0.46;
      this._drawBox(v.x - halfW / 2 - gap / 2, v.y, v.z, halfW, v.d, v.h * 0.92, fill, stroke, lineW, isActive);
      this._drawBox(v.x + halfW / 2 + gap / 2, v.y, v.z, halfW, v.d * 0.9, v.h, fill, stroke, lineW, isActive);
      return;
    }
    if (v.shape === 'overview') {
      this._drawBox(v.x, v.y, v.z, v.w, v.d, v.h, fill, stroke, lineW, isActive);
      this._drawBox(v.x - 2.2, v.y + 0.4, v.z + 0.25, 2.0, 1.8, 1.6, fill, stroke, 1, false);
      this._drawBox(v.x + 2.2, v.y - 0.3, v.z + 0.25, 1.8, 1.6, 2.2, fill, stroke, 1, false);
      return;
    }
    this._drawBox(v.x, v.y, v.z, v.w, v.d, v.h, fill, stroke, lineW, isActive);
  };

  Renderer.prototype._loop = function () {
    var self = this;
    function frame(now) {
      self._raf = requestAnimationFrame(frame);
      self._tick(now);
      self._paint();
    }
    this._raf = requestAnimationFrame(frame);
  };

  Renderer.prototype._tick = function (now) {
    if (this._paused) return;
    var cam = this._cam;
    var m = this._motion;
    if (m && m.token === this._token) {
      var t = Math.min(1, (now - m.t0) / m.dur);
      var e = easeInOut(t);
      cam.targetX = lerp(m.from.x, m.to.x, e);
      cam.targetY = lerp(m.from.y, m.to.y, e);
      cam.targetZ = lerp(m.from.z, m.to.z, e);
      cam.scale = lerp(m.from.scale, m.to.scale, e);
      if (m.kind === 'orbit') {
        cam.yaw = lerp(m.from.yaw, m.to.yaw, e);
      } else if (m.kind === 'pan') {
        cam.yaw = m.from.yaw + Math.sin(e * Math.PI) * 0.18;
        cam.targetY = lerp(m.from.y, m.to.y + 1.8, e);
      } else if (m.kind === 'zoom') {
        cam.yaw = m.from.yaw + Math.sin(e * Math.PI) * 0.08;
      } else {
        cam.yaw = m.from.yaw + Math.sin(e * Math.PI) * 0.28;
      }
      cam.goalX = cam.targetX;
      cam.goalY = cam.targetY;
      cam.goalZ = cam.targetZ;
      cam.goalScale = cam.scale;
      if (t >= 1) {
        var done = m.onDone;
        this._motion = null;
        if (done) done();
      }
    } else {
      cam.targetX = lerp(cam.targetX, cam.goalX, 0.09);
      cam.targetY = lerp(cam.targetY, cam.goalY, 0.09);
      cam.targetZ = lerp(cam.targetZ, cam.goalZ, 0.09);
      cam.scale = lerp(cam.scale, cam.goalScale, 0.08);
    }
    if (this._fade < 1 && !m) {
      this._fade = Math.min(1, this._fade + 0.06);
    }
  };

  Renderer.prototype._paint = function () {
    var ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    var w = this.canvas.width;
    var h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    var vols = this._volumes.slice().sort(function (a, b) {
      return (a.x + a.y + a.z) - (b.x + b.y + b.z);
    });
    var activeId = this._activeId;
    var branchIds = this._branchIds;
    vols.forEach(function (v) {
      this._drawVolume(v, activeId, branchIds);
    }, this);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (var g = -14; g <= 14; g += 2) {
      var a = this._iso(g, -14, -0.5);
      var b = this._iso(g, 14, -0.5);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      var c = this._iso(-14, g, -0.5);
      var d = this._iso(14, g, -0.5);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }

    if (this._fade < 1) {
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - this._fade) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  };

  function create(player) {
    return new Renderer(player);
  }

  return {
    id: 'prototype',
    create: create,
    FADE_MS: FADE_MS
  };
})();
