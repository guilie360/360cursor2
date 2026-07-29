/* BOXIES V6.3.00 — PROTOTIPO: procedural storyboard (no AI, no media) */
var ExperienciaPrototype = (function () {
  var GREEN = '#6fbf86';
  var VOL_FILL = '#1a1a1a';
  var VOL_EDGE = '#6a6a6a';
  var VOL_DIM = '#101010';
  var PARK = '#1c2e22';
  var POOL = '#152432';
  var TEXT = '#ffffff';

  function esc(v) {
    return String(v == null ? '' : v);
  }

  function projectTypeId(state) {
    var e = (state && state.estructura) || {};
    return String(
      e.developmentType ||
      (state && state.projectType) ||
      ''
    ).toLowerCase();
  }

  function inferShape(n, typeId) {
    if (!n) return 'box';
    var label = String(n.label || n.typeLabel || '').toLowerCase();
    var kind = String(n.kind || '').toLowerCase();
    var sk = String(n.structureKind || n.structureKey || '').toLowerCase();
    var blob = label + ' ' + kind + ' ' + sk;

    if (kind === 'hero') return 'overview';
    if (/piscina|pool|alberca/.test(blob)) return 'pool';
    if (/parque|jard[ií]n|verde|plaza|zonas?\s*comunes?/.test(blob)) return 'park';
    if (/torre|tower|edificio|building|prisma/.test(blob)) return 'tower';
    if (/piso|planta|floor|nivel|level/.test(blob)) return 'floor';
    if (/apto|apart|depto|unidad|unit|vivienda/.test(blob)) return 'apt';
    if (/sala|habitaci[oó]n|room|ba[nñ]o|cocina|comedor|estudio/.test(blob)) {
      return 'room';
    }
    if (/casa|house|chalet|townhouse/.test(blob)) return 'house';
    if (kind === 'plan' || kind === 'planta-3d') return 'floor';
    if (kind === 'animacion' || kind === 'video' || kind === 'transicion') return 'transition';
    if (/edificio|torres|conjunto/.test(typeId) && kind === 'image') return 'tower';
    if (/casa|vivienda|unifamiliar/.test(typeId) && kind === 'image') return 'house';
    return 'box';
  }

  function shapeSize(shape) {
    switch (shape) {
      case 'overview': return { w: 10, d: 8, h: 0.25 };
      case 'house': return { w: 4.2, d: 3.4, h: 2.6 };
      case 'tower': return { w: 2.6, d: 2.6, h: 9 };
      case 'floor': return { w: 5.5, d: 4.2, h: 0.45 };
      case 'apt': return { w: 2.2, d: 2.0, h: 1.35 };
      case 'room': return { w: 1.35, d: 1.25, h: 1.05 };
      case 'park': return { w: 6.5, d: 4.5, h: 0.12 };
      case 'pool': return { w: 3.2, d: 2.1, h: 0.18 };
      case 'transition': return { w: 1.4, d: 1.4, h: 0.35 };
      default: return { w: 2.4, d: 2.2, h: 1.8 };
    }
  }

  function shapeFill(shape) {
    if (shape === 'park') return PARK;
    if (shape === 'pool') return POOL;
    if (shape === 'transition') return '#1f1a22';
    return VOL_FILL;
  }

  function nodeLevelHint(n) {
    var label = String((n && n.label) || '');
    var m = label.match(/(?:piso|planta|nivel|floor|level)\s*(\d+)/i);
    if (m) return Number(m[1]);
    if (n && n.config && n.config.floor != null) return Number(n.config.floor) || 0;
    return 0;
  }

  function adjacency(state) {
    var exp = ExperienciaEngine.ensureFlow
      ? ExperienciaEngine.ensureFlow(state)
      : (state.experiencia || {});
    var adj = {};
    (exp.edges || []).forEach(function (ed) {
      if (!ed) return;
      var from = ed.sourceNodeId || ed.from || ed.sourceId;
      var to = ed.targetNodeId || ed.to || ed.targetId;
      if (!from || !to || from === to) return;
      if (!adj[from]) adj[from] = [];
      if (adj[from].indexOf(to) < 0) adj[from].push(to);
    });
    return adj;
  }

  function listFlowNodes(state) {
    var exp = ExperienciaEngine.ensureFlow
      ? ExperienciaEngine.ensureFlow(state)
      : (state.experiencia || {});
    var nodes = ExperienciaEngine.visibleNodes
      ? ExperienciaEngine.visibleNodes(state)
      : (exp.nodes || []);
    return (nodes || []).filter(function (n) {
      return n && n.kind !== 'action';
    });
  }

  function buildPlaybackPath(nodes, adj) {
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var path = [];
    var visited = {};
    var branchCount = 0;

    function dfs(id) {
      if (!id || !byId[id] || visited[id]) return;
      visited[id] = true;
      path.push({ type: 'visit', nodeId: id });
      var outs = (adj[id] || []).filter(function (to) { return !!byId[to]; });
      if (outs.length > 1) {
        branchCount += 1;
        path.push({ type: 'branch', nodeId: id, options: outs.slice() });
      }
      outs.forEach(function (to) { dfs(to); });
    }

    var hero = nodes.find(function (n) {
      return n.kind === 'hero' || n.id === 'exp-hero';
    });
    if (hero) dfs(hero.id);

    /* Roots with no inbound */
    var inbound = {};
    Object.keys(adj).forEach(function (from) {
      (adj[from] || []).forEach(function (to) { inbound[to] = true; });
    });
    nodes.forEach(function (n) {
      if (!visited[n.id] && !inbound[n.id]) dfs(n.id);
    });
    nodes.forEach(function (n) {
      if (!visited[n.id]) dfs(n.id);
    });

    return { path: path, branchCount: branchCount };
  }

  function layoutVolumes(nodes, typeId, adj) {
    adj = adj || {};
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    /* BFS order from hero — spatial progression follows Canvas edges */
    var order = [];
    var seen = {};
    function enqueue(id) {
      if (!id || !byId[id] || seen[id]) return;
      seen[id] = true;
      order.push(byId[id]);
      (adj[id] || []).forEach(enqueue);
    }
    var hero = nodes.find(function (n) {
      return n.kind === 'hero' || n.id === 'exp-hero';
    });
    if (hero) enqueue(hero.id);
    nodes.forEach(function (n) {
      if (!seen[n.id]) enqueue(n.id);
    });

    var volumes = [];
    var lane = 0;
    var depth = 0;
    order.forEach(function (n, i) {
      var shape = inferShape(n, typeId);
      var size = shapeSize(shape);
      var level = nodeLevelHint(n);
      var outs = (adj[n.id] || []).filter(function (to) { return !!byId[to]; });

      /* Step forward along path; branch fans sideways */
      var x = depth * 5.2;
      var y = lane * 4.4;
      var z = level > 0 ? (level - 1) * 1.2 : 0;
      if (shape === 'tower') z = 0;
      if (shape === 'floor') z = Math.max(z, 1.2 + level * 0.15);
      if (shape === 'apt') z = Math.max(z, 2.4);
      if (shape === 'room') z = Math.max(z, 3.2);
      if (shape === 'overview') {
        x = 0;
        y = 0;
        z = -0.35;
      }
      if (shape === 'park') {
        y = 6.5;
        z = -0.2;
      }
      if (shape === 'pool') {
        y = -5.5;
        z = -0.15;
      }
      if (shape === 'transition') {
        x = depth * 5.2 - 1.6;
        z = Math.max(0.4, z);
      }

      volumes.push({
        id: n.id,
        nodeId: n.id,
        label: n.label || n.typeLabel || 'Nodo',
        typeLabel: n.typeLabel || (n.kind || 'escena'),
        kind: n.kind,
        shape: shape,
        level: level,
        x: x,
        y: y,
        z: z,
        w: size.w,
        d: size.d,
        h: size.h,
        fill: shapeFill(shape),
        dual: shape === 'house'
      });

      if (outs.length > 1) {
        lane += 1;
      } else if (outs.length === 1) {
        depth += 1;
      } else {
        depth += 1;
      }
      /* Soft stagger so siblings don't stack */
      if (i > 0 && outs.length <= 1) {
        lane += (i % 3 === 0) ? 0.15 : 0;
      }
    });
    return volumes;
  }

  function fingerprint(state) {
    var nodes = listFlowNodes(state);
    var exp = state.experiencia || {};
    var edges = exp.edges || [];
    var e = state.estructura || {};
    var tips = (e.tipologias || []).length;
    var parts = [
      projectTypeId(state),
      String(tips),
      String(nodes.length),
      String(edges.length)
    ];
    nodes.forEach(function (n) {
      parts.push(n.id + ':' + (n.label || '') + ':' + (n.kind || ''));
    });
    edges.forEach(function (ed) {
      parts.push(
        (ed.sourceNodeId || ed.from || '') + '>' +
        (ed.targetNodeId || ed.to || '')
      );
    });
    return parts.join('|');
  }

  function buildStoryboard(state) {
    ExperienciaEngine.ensureFlow(state);
    var typeId = projectTypeId(state);
    var nodes = listFlowNodes(state);
    var adj = adjacency(state);
    var play = buildPlaybackPath(nodes, adj);
    var volumes = layoutVolumes(nodes, typeId, adj);
    var levels = {};
    volumes.forEach(function (v) {
      if (v.level > 0) levels[v.level] = true;
    });
    var levelCount = Object.keys(levels).length;
    if (!levelCount) {
      levelCount = Math.max(1, Math.ceil(volumes.length / 4));
    }
    var visitSteps = play.path.filter(function (s) { return s.type === 'visit'; }).length;
    var durationSec = Math.max(8, visitSteps * 2.2 + play.branchCount * 1.4);

    return {
      version: 1,
      fingerprint: fingerprint(state),
      projectType: typeId,
      projectName: (state.projectInfo && state.projectInfo.nombre) || 'Proyecto',
      volumes: volumes,
      path: play.path,
      stats: {
        nodeCount: nodes.length,
        branchCount: play.branchCount,
        levelCount: levelCount,
        durationSec: Math.round(durationSec),
        edgeCount: ((state.experiencia && state.experiencia.edges) || []).length
      }
    };
  }

  /* ── Isometric math ── */
  function isoProject(x, y, z, cam) {
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
  }

  function boxCorners(v) {
    var x0 = v.x - v.w / 2;
    var x1 = v.x + v.w / 2;
    var y0 = v.y - v.d / 2;
    var y1 = v.y + v.d / 2;
    var z0 = v.z;
    var z1 = v.z + v.h;
    return [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ];
  }

  function drawVolume(ctx, v, cam, activeId, dimmed) {
    var corners = boxCorners(v).map(function (c) {
      return isoProject(c[0], c[1], c[2], cam);
    });
    var depth = v.x + v.y + v.z;
    var isActive = activeId && String(v.id) === String(activeId);
    var fill = isActive ? '#243528' : (dimmed ? VOL_DIM : v.fill);
    var stroke = isActive ? GREEN : VOL_EDGE;
    var lineW = isActive ? 2 : 1;

    function face(i0, i1, i2, i3, alpha) {
      ctx.beginPath();
      ctx.moveTo(corners[i0].x, corners[i0].y);
      ctx.lineTo(corners[i1].x, corners[i1].y);
      ctx.lineTo(corners[i2].x, corners[i2].y);
      ctx.lineTo(corners[i3].x, corners[i3].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      ctx.stroke();
    }

    /* top, left, right — simple architectural mockup */
    face(4, 5, 6, 7, isActive ? 0.95 : 0.88);
    face(0, 3, 7, 4, isActive ? 0.75 : 0.55);
    face(1, 0, 4, 5, isActive ? 0.82 : 0.65);

    return depth;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Mount a procedural player on a canvas element.
   */
  function createPlayer(canvasEl, infoEl, opts) {
    opts = opts || {};
    var ctx = canvasEl.getContext('2d');
    var storyboard = null;
    var cam = {
      yaw: Math.PI / 5.2,
      scale: 18,
      cx: 0,
      cy: 0,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      goalX: 0,
      goalY: 0,
      goalZ: 0,
      goalScale: 18
    };
    var activeId = null;
    var branchOptions = null;
    var playing = false;
    var raf = null;
    var stepIndex = 0;
    var stepStarted = 0;
    var onDone = opts.onDone || null;

    function resize() {
      var parent = canvasEl.parentElement;
      var w = (parent && parent.clientWidth) || 640;
      var h = (parent && parent.clientHeight) || 420;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvasEl.width = Math.max(1, Math.floor(w * dpr));
      canvasEl.height = Math.max(1, Math.floor(h * dpr));
      canvasEl.style.width = w + 'px';
      canvasEl.style.height = h + 'px';
      cam.cx = canvasEl.width / 2;
      cam.cy = canvasEl.height * 0.58;
    }

    function setInfo(vol, extra) {
      if (!infoEl) return;
      if (!vol) {
        infoEl.innerHTML = '<span class="builder-exp-proto-info__title">' +
          esc(storyboard && storyboard.projectName) + '</span>' +
          '<span class="builder-exp-proto-info__meta">Storyboard procedural</span>';
        return;
      }
      var levelTxt = vol.level > 0 ? ('Nivel ' + vol.level) : (vol.typeLabel || vol.kind || '');
      infoEl.innerHTML =
        '<span class="builder-exp-proto-info__title">' + esc(vol.label) + '</span>' +
        '<span class="builder-exp-proto-info__meta">' + esc(vol.typeLabel || vol.shape) +
          (levelTxt ? ' · ' + esc(levelTxt) : '') +
          (extra ? ' · ' + esc(extra) : '') +
        '</span>';
    }

    function volumeById(id) {
      if (!storyboard) return null;
      for (var i = 0; i < storyboard.volumes.length; i++) {
        if (String(storyboard.volumes[i].id) === String(id)) return storyboard.volumes[i];
      }
      return null;
    }

    function frame(now) {
      if (!ctx || !storyboard) return;
      var w = canvasEl.width;
      var h = canvasEl.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      cam.targetX = lerp(cam.targetX, cam.goalX, 0.08);
      cam.targetY = lerp(cam.targetY, cam.goalY, 0.08);
      cam.targetZ = lerp(cam.targetZ, cam.goalZ, 0.08);
      cam.scale = lerp(cam.scale, cam.goalScale, 0.07);

      var sorted = storyboard.volumes.slice().sort(function (a, b) {
        return (a.x + a.y + a.z) - (b.x + b.y + b.z);
      });
      sorted.forEach(function (v) {
        var dim = playing && activeId && String(v.id) !== String(activeId) &&
          !(branchOptions && branchOptions.indexOf(v.id) >= 0);
        drawVolume(ctx, v, cam, activeId, dim);
        if (branchOptions && branchOptions.indexOf(v.id) >= 0 && String(v.id) !== String(activeId)) {
          /* soft green outline for branch options */
          drawVolume(ctx, v, cam, v.id, false);
        }
      });

      /* subtle ground grid */
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (var g = -12; g <= 12; g += 2) {
        var a = isoProject(g, -12, -0.5, cam);
        var b = isoProject(g, 12, -0.5, cam);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        var c = isoProject(-12, g, -0.5, cam);
        var d = isoProject(12, g, -0.5, cam);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      if (playing) advance(now);
      raf = requestAnimationFrame(frame);
    }

    function flyTo(vol, zoom) {
      if (!vol) return;
      cam.goalX = vol.x;
      cam.goalY = vol.y;
      cam.goalZ = vol.z + vol.h * 0.5;
      cam.goalScale = zoom || (vol.shape === 'overview' ? 14 : vol.shape === 'tower' ? 22 : 28);
    }

    function stepDuration(step) {
      if (!step) return 1800;
      if (step.type === 'branch') return 1400;
      return 2200;
    }

    function advance(now) {
      if (!storyboard || !storyboard.path.length) {
        stop();
        return;
      }
      if (!stepStarted) stepStarted = now;
      var step = storyboard.path[stepIndex];
      var dur = stepDuration(step);
      var t = Math.min(1, (now - stepStarted) / dur);

      if (step && step.type === 'visit') {
        activeId = step.nodeId;
        branchOptions = null;
        var vol = volumeById(step.nodeId);
        flyTo(vol, null);
        setInfo(vol, null);
      } else if (step && step.type === 'branch') {
        activeId = step.nodeId;
        branchOptions = (step.options || []).slice();
        var parent = volumeById(step.nodeId);
        flyTo(parent, 20);
        setInfo(parent, 'Bifurcación');
      }

      if (t >= 1) {
        stepIndex += 1;
        stepStarted = now;
        if (stepIndex >= storyboard.path.length) {
          /* return home */
          var overview = storyboard.volumes.find(function (v) {
            return v.shape === 'overview';
          }) || storyboard.volumes[0];
          activeId = overview ? overview.id : null;
          branchOptions = null;
          flyTo(overview, 14);
          setInfo(overview, 'Fin');
          playing = false;
          if (onDone) onDone();
        }
      }
    }

    function setStoryboard(sb) {
      storyboard = sb;
      stepIndex = 0;
      stepStarted = 0;
      playing = false;
      activeId = null;
      branchOptions = null;
      if (sb && sb.volumes && sb.volumes.length) {
        var ov = sb.volumes.find(function (v) { return v.shape === 'overview'; }) || sb.volumes[0];
        flyTo(ov, 14);
        cam.targetX = cam.goalX;
        cam.targetY = cam.goalY;
        cam.targetZ = cam.goalZ;
        cam.scale = cam.goalScale;
        setInfo(ov, null);
      } else {
        setInfo(null, null);
      }
    }

    function play() {
      if (!storyboard || !storyboard.path.length) return false;
      playing = true;
      stepIndex = 0;
      stepStarted = 0;
      return true;
    }

    function stop() {
      playing = false;
      branchOptions = null;
    }

    function destroy() {
      stop();
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    resize();
    raf = requestAnimationFrame(frame);

    return {
      setStoryboard: setStoryboard,
      play: play,
      stop: stop,
      destroy: destroy,
      resize: resize,
      isPlaying: function () { return playing; }
    };
  }

  /**
   * PrototypeView — dedicated Preview-like mount (not the Canvas editor).
   * Uses ExperienceRuntime + PrototypeRenderer exclusively.
   */
  function mountPrototypeView(host, options) {
    options = options || {};
    if (!host) return null;
    if (typeof ExperienceRuntime === 'undefined' || !ExperienceRuntime.mount) return null;
    if (typeof PrototypeRenderer === 'undefined') return null;

    var state = options.state || null;
    var runtime = options.runtime || null;
    if (!runtime && state && typeof RuntimeSerializer !== 'undefined' && RuntimeSerializer.serialize) {
      try {
        runtime = RuntimeSerializer.serialize(state, {
          generatedAt: new Date().toISOString()
        });
      } catch (eSer) {
        runtime = null;
      }
    }
    if (!runtime && state) {
      if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureFlow) {
        ExperienciaEngine.ensureFlow(state);
      }
      var exp = (state && state.experiencia) || {};
      var nodes = (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.visibleNodes)
        ? ExperienciaEngine.visibleNodes(state)
        : (exp.nodes || []);
      nodes = (nodes || []).filter(function (n) { return n && n.kind !== 'action'; });
      var hero = nodes.find(function (n) {
        return n && (n.kind === 'hero' || n.id === 'exp-hero');
      });
      runtime = {
        nodes: nodes,
        connections: exp.edges || [],
        entryNodeId: hero ? hero.id : (nodes[0] && nodes[0].id) || null
      };
    }

    var player = ExperienceRuntime.mount(host, {
      runtime: runtime,
      state: state,
      renderer: PrototypeRenderer,
      mode: 'prototype',
      startLabel: options.startLabel || '▶ Ver Prototipo'
    });
    if (player && player.showGate) player.showGate();
    return player;
  }

  return {
    buildStoryboard: buildStoryboard,
    fingerprint: fingerprint,
    createPlayer: createPlayer,
    mountPrototypeView: mountPrototypeView
  };
})();

/* Alias for clear view routing */
var PrototypeView = {
  mount: function (host, options) {
    return (typeof ExperienciaPrototype !== 'undefined' && ExperienciaPrototype.mountPrototypeView)
      ? ExperienciaPrototype.mountPrototypeView(host, options)
      : null;
  }
};