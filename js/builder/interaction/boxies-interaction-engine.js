/**
 * BoxiesInteractionEngine — reusable free-canvas interaction (V7.2.12).
 *
 * Ported from ExperienciaCanvas (selection, drag, snap/guides, nudge, clipboard)
 * and adapted for Quotation Editor scene overlays.
 *
 * Coordinate space: percent of layer (0–100), origin top-left.
 * Buttons: { id, x, y, rotation, label, style, icon, action, targetSceneId, … }
 * Hotspots: { id, polygon:[{x,y}], label, shape, color, action, targetSceneId, … }
 */
var BoxiesInteractionEngine = (function () {
  var SNAP = 1.15;
  var SPACE_SNAP = 1.35;
  var ALIGN = 2.2;

  function clampPct(v) {
    var n = Number(v);
    if (!isFinite(n)) return 50;
    return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
  }

  function clampRotation(v) {
    var n = Number(v) || 0;
    if (n > 360) n = 360;
    if (n < -360) n = -360;
    return Math.round(n);
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function percentFromPointer(layerEl, clientX, clientY) {
    if (!layerEl) return { x: 50, y: 50 };
    var rect = layerEl.getBoundingClientRect();
    var x = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    var y = ((clientY - rect.top) / Math.max(1, rect.height)) * 100;
    return { x: clampPct(x), y: clampPct(y) };
  }

  /**
   * Port of ExperienciaCanvas.computeButtonGuides — peer snap + spacing labels.
   * peers: [{ id, x, y }]
   */
  function computeGuides(peers, itemId, x, y, layerW, layerH) {
    peers = peers || [];
    layerW = layerW || 1000;
    layerH = layerH || 1000;
    var guides = { spacing: [], v: [], h: [] };
    var nx = x;
    var ny = y;

    if (Math.abs(x - 50) <= SNAP) {
      nx = 50;
      guides.v.push({ pos: 50, center: true });
    }
    if (Math.abs(y - 50) <= SNAP) {
      ny = 50;
      guides.h.push({ pos: 50, center: true });
    }

    var knownGapsX = [];
    var knownGapsY = [];
    var i;
    var j;
    for (i = 0; i < peers.length; i++) {
      for (j = i + 1; j < peers.length; j++) {
        var a = peers[i];
        var b = peers[j];
        if (!a || !b) continue;
        if (String(a.id) === String(itemId) || String(b.id) === String(itemId)) continue;
        if (Math.abs(a.y - b.y) <= ALIGN) {
          knownGapsX.push({ gap: Math.abs(a.x - b.x), y: (a.y + b.y) / 2 });
        }
        if (Math.abs(a.x - b.x) <= ALIGN) {
          knownGapsY.push({ gap: Math.abs(a.y - b.y), x: (a.x + b.x) / 2 });
        }
      }
    }

    peers.forEach(function (peer) {
      if (!peer || String(peer.id) === String(itemId)) return;
      if (Math.abs(x - peer.x) <= SNAP) {
        nx = peer.x;
        guides.v.push({ pos: peer.x });
      }
      if (Math.abs(y - peer.y) <= SNAP) {
        ny = peer.y;
        guides.h.push({ pos: peer.y });
      }
      var mirror = Math.round((100 - peer.x) * 10) / 10;
      if (Math.abs(x - mirror) <= SNAP) {
        nx = mirror;
        guides.v.push({ pos: mirror, mirror: true });
      }

      if (Math.abs(y - peer.y) <= ALIGN) {
        var dxPct = Math.abs(x - peer.x);
        if (dxPct > 0.3) {
          guides.spacing.push({
            axis: 'x',
            pos: (x + peer.x) / 2,
            cross: peer.y,
            px: Math.round(dxPct / 100 * layerW),
            uniform: false
          });
        }
      }
      if (Math.abs(x - peer.x) <= ALIGN) {
        var dyPct = Math.abs(y - peer.y);
        if (dyPct > 0.3) {
          guides.spacing.push({
            axis: 'y',
            pos: (y + peer.y) / 2,
            cross: peer.x,
            px: Math.round(dyPct / 100 * layerH),
            uniform: false
          });
        }
      }
    });

    var snappedSpace = null;
    knownGapsX.forEach(function (kg) {
      if (!(kg.gap > 0.4) || snappedSpace) return;
      peers.forEach(function (peer) {
        if (!peer || String(peer.id) === String(itemId) || snappedSpace) return;
        if (Math.abs(y - peer.y) > SNAP) return;
        var right = peer.x + kg.gap;
        var left = peer.x - kg.gap;
        var px = Math.round(kg.gap / 100 * layerW);
        if (Math.abs(x - right) <= SPACE_SNAP) {
          nx = right;
          ny = peer.y;
          snappedSpace = {
            axis: 'x', pos: (peer.x + right) / 2, cross: peer.y, px: px, uniform: true
          };
        } else if (Math.abs(x - left) <= SPACE_SNAP) {
          nx = left;
          ny = peer.y;
          snappedSpace = {
            axis: 'x', pos: (peer.x + left) / 2, cross: peer.y, px: px, uniform: true
          };
        }
      });
    });
    knownGapsY.forEach(function (kg) {
      if (!(kg.gap > 0.4) || snappedSpace) return;
      peers.forEach(function (peer) {
        if (!peer || String(peer.id) === String(itemId) || snappedSpace) return;
        if (Math.abs(x - peer.x) > SNAP) return;
        var below = peer.y + kg.gap;
        var above = peer.y - kg.gap;
        var px = Math.round(kg.gap / 100 * layerH);
        if (Math.abs(y - below) <= SPACE_SNAP) {
          ny = below;
          nx = peer.x;
          snappedSpace = {
            axis: 'y', pos: (peer.y + below) / 2, cross: peer.x, px: px, uniform: true
          };
        } else if (Math.abs(y - above) <= SPACE_SNAP) {
          ny = above;
          nx = peer.x;
          snappedSpace = {
            axis: 'y', pos: (peer.y + above) / 2, cross: peer.x, px: px, uniform: true
          };
        }
      });
    });

    if (snappedSpace) {
      guides.spacing = [snappedSpace];
    } else if (guides.spacing.length > 2) {
      guides.spacing.sort(function (a, b) { return a.px - b.px; });
      guides.spacing = guides.spacing.slice(0, 2);
    }

    return { x: clampPct(nx), y: clampPct(ny), guides: guides };
  }

  function defaultRectPolygon() {
    return [
      { x: 35, y: 35 },
      { x: 65, y: 35 },
      { x: 65, y: 65 },
      { x: 35, y: 65 }
    ];
  }

  function normalizePolygon(points) {
    if (!Array.isArray(points)) return defaultRectPolygon();
    var out = points.map(function (p) {
      return { x: clampPct(p && p.x), y: clampPct(p && p.y) };
    }).filter(function (p) { return p; });
    return out.length >= 3 ? out : defaultRectPolygon();
  }

  function translatePolygon(points, dx, dy) {
    return normalizePolygon(points).map(function (p) {
      return { x: clampPct(p.x + dx), y: clampPct(p.y + dy) };
    });
  }

  function polygonCentroid(points) {
    var pts = normalizePolygon(points);
    var sx = 0;
    var sy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; });
    return { x: clampPct(sx / pts.length), y: clampPct(sy / pts.length) };
  }

  function createButton(idFactory, overrides) {
    var o = overrides || {};
    return {
      id: typeof idFactory === 'function' ? idFactory('btn') : String(idFactory || 'btn'),
      kind: 'button',
      label: o.label != null ? String(o.label) : 'Botón',
      style: o.style || 'button',
      icon: o.icon || '',
      action: o.action || 'goto-scene',
      targetSceneId: o.targetSceneId || null,
      x: clampPct(o.x != null ? o.x : 50),
      y: clampPct(o.y != null ? o.y : 50),
      rotation: clampRotation(o.rotation != null ? o.rotation : 0),
      visible: o.visible !== false
    };
  }

  function createHotspot(idFactory, overrides) {
    var o = overrides || {};
    return {
      id: typeof idFactory === 'function' ? idFactory('hs') : String(idFactory || 'hs'),
      kind: 'hotspot',
      label: o.label != null ? String(o.label) : 'Hotspot',
      shape: o.shape || 'polygon',
      color: o.color || 'white',
      action: o.action || 'goto-scene',
      targetSceneId: o.targetSceneId || null,
      polygon: normalizePolygon(o.polygon || defaultRectPolygon()),
      opacity: o.opacity != null ? Number(o.opacity) : 0.35
    };
  }

  function buttonPreviewClass(b) {
    var style = (b && b.style) || 'button';
    var cls = 'qe-ix-btn';
    if (style === 'chip') cls += ' qe-ix-btn--chip';
    else if (style === 'icon') cls += ' qe-ix-btn--icon';
    else cls += ' qe-ix-btn--button';
    return cls;
  }

  function guidesHtml(guides) {
    if (!guides) return '';
    var html = '';
    (guides.v || []).forEach(function (g) {
      html += '<div class="qe-ix-guide qe-ix-guide--v' +
        (g.center ? ' is-center' : '') +
        (g.mirror ? ' is-mirror' : '') +
        '" style="left:' + Number(g.pos) + '%"></div>';
    });
    (guides.h || []).forEach(function (g) {
      html += '<div class="qe-ix-guide qe-ix-guide--h' +
        (g.center ? ' is-center' : '') +
        '" style="top:' + Number(g.pos) + '%"></div>';
    });
    var seen = {};
    (guides.spacing || []).forEach(function (s) {
      if (!s || s.px == null) return;
      var key = String(s.axis) + ':' + Math.round(Number(s.pos) * 10) + ':' +
        Math.round(Number(s.cross) * 10) + ':' + s.px;
      if (seen[key]) return;
      seen[key] = true;
      var label = String(s.px) + ' px';
      if (s.axis === 'x') {
        html += '<div class="qe-ix-guide qe-ix-guide--spacing is-x" style="left:' +
          Number(s.pos) + '%;top:' + Number(s.cross) + '%"><span>' +
          escapeHtml(label) + '</span></div>';
      } else {
        html += '<div class="qe-ix-guide qe-ix-guide--spacing is-y" style="left:' +
          Number(s.cross) + '%;top:' + Number(s.pos) + '%"><span>' +
          escapeHtml(label) + '</span></div>';
      }
    });
    return html;
  }

  function paintButtonsHtml(buttons, selectedIds, guides, rotLabel) {
    var sel = {};
    (selectedIds || []).forEach(function (id) { sel[String(id)] = true; });
    var html = guidesHtml(guides) + (buttons || []).map(function (b) {
      if (!b) return '';
      var rot = clampRotation(b.rotation);
      var on = !!sel[String(b.id)];
      var styleBits = 'left:' + clampPct(b.x) + '%;top:' + clampPct(b.y) + '%;' +
        'transform:translate(-50%,-50%) rotate(' + rot + 'deg);';
      var handles = '';
      if (on && selectedIds.length === 1) {
        handles =
          '<span class="qe-ix-bbox" aria-hidden="true"></span>' +
          '<span class="qe-ix-handle qe-ix-handle--nw" data-qe-ix-scale="nw"></span>' +
          '<span class="qe-ix-handle qe-ix-handle--ne" data-qe-ix-scale="ne"></span>' +
          '<span class="qe-ix-handle qe-ix-handle--sw" data-qe-ix-scale="sw"></span>' +
          '<span class="qe-ix-handle qe-ix-handle--se" data-qe-ix-scale="se"></span>' +
          '<span class="qe-ix-rotate" data-qe-ix-rotate="' + escapeHtml(b.id) + '"></span>';
      }
      return '<button type="button" class="' + buttonPreviewClass(b) +
        (on ? ' is-selected' : '') +
        (b.visible === false ? ' is-invisible' : '') + '"' +
        ' data-qe-ix-btn="' + escapeHtml(b.id) + '"' +
        ' style="' + styleBits + '">' +
        escapeHtml(b.label || 'Botón') +
        handles +
      '</button>';
    }).join('');
    if (rotLabel != null && rotLabel !== '') {
      html += '<div class="qe-ix-rot-label">' + escapeHtml(String(rotLabel)) + '°</div>';
    }
    return html;
  }

  function paintHotspotsSvg(hotspots, selectedId, draft) {
    var parts = [];
    (hotspots || []).forEach(function (hs) {
      if (!hs) return;
      var pts = normalizePolygon(hs.polygon);
      var d = pts.map(function (p, idx) {
        return (idx === 0 ? 'M' : 'L') + p.x + ' ' + p.y;
      }).join(' ') + ' Z';
      var on = String(hs.id) === String(selectedId);
      parts.push(
        '<path class="qe-ix-hs-poly' + (on ? ' is-selected' : '') + '"' +
          ' data-qe-ix-hs="' + escapeHtml(hs.id) + '"' +
          ' d="' + d + '" fill="rgba(255,255,255,' +
          (hs.opacity != null ? hs.opacity : 0.28) + ')"' +
          ' stroke="rgba(255,255,255,0.85)" stroke-width="0.35"/>'
      );
      if (on) {
        pts.forEach(function (p, vi) {
          parts.push(
            '<circle class="qe-ix-hs-vertex" data-qe-ix-hs-vertex="' + escapeHtml(hs.id) + '"' +
              ' data-qe-ix-vertex="' + vi + '" cx="' + p.x + '" cy="' + p.y + '" r="1.1"/>'
          );
        });
      }
    });
    if (draft && draft.points && draft.points.length) {
      var dp = draft.points.slice();
      if (draft.cursor) dp.push(draft.cursor);
      var dd = dp.map(function (p, idx) {
        return (idx === 0 ? 'M' : 'L') + p.x + ' ' + p.y;
      }).join(' ');
      parts.push(
        '<path class="qe-ix-hs-draft" d="' + dd +
          '" fill="none" stroke="rgba(255,200,80,0.9)" stroke-width="0.4"' +
          ' stroke-dasharray="1.2 0.8"/>'
      );
      draft.points.forEach(function (p) {
        parts.push(
          '<circle class="qe-ix-hs-draft-pt" cx="' + p.x + '" cy="' + p.y + '" r="0.9"/>'
        );
      });
    }
    return parts.join('');
  }

  /**
   * Mount interaction layer.
   * options:
   *   getScene(): scene with .buttons / .hotspots
   *   onChange(): after mutation
   *   onSelect(kind, id): selection callback for inspector
   *   idFactory(prefix)
   */
  function mount(layerEl, options) {
    if (!layerEl || !options || typeof options.getScene !== 'function') {
      return { destroy: function () {}, paint: function () {} };
    }

    var selectedIds = [];
    var selectedHotspotId = null;
    var buttonDrag = null;
    var rotateDrag = null;
    var hotspotDrag = null;
    var hotspotDraw = null;
    var clipboard = null;
    var liveGuides = null;
    var rotLabel = null;
    var keyBound = false;

    layerEl.classList.add('qe-ix-layer');
    layerEl.innerHTML =
      '<div class="qe-ix-buttons" data-qe-ix-buttons></div>' +
      '<svg class="qe-ix-hotspots" data-qe-ix-hotspots viewBox="0 0 100 100"' +
        ' preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"></svg>';

    var buttonsEl = layerEl.querySelector('[data-qe-ix-buttons]');
    var hotspotsEl = layerEl.querySelector('[data-qe-ix-hotspots]');

    function scene() {
      return options.getScene() || { buttons: [], hotspots: [] };
    }

    function ensureBags(sc) {
      if (!sc.buttons) sc.buttons = [];
      if (!sc.hotspots) sc.hotspots = [];
      return sc;
    }

    function paint() {
      var sc = ensureBags(scene());
      if (buttonsEl) {
        buttonsEl.innerHTML = paintButtonsHtml(
          sc.buttons, selectedIds, liveGuides, rotLabel
        );
      }
      if (hotspotsEl) {
        hotspotsEl.innerHTML = paintHotspotsSvg(
          sc.hotspots,
          selectedHotspotId,
          hotspotDraw
        );
      }
    }

    function angleAt(btn, clientX, clientY) {
      var rect = layerEl.getBoundingClientRect();
      var cx = rect.left + (clampPct(btn.x) / 100) * rect.width;
      var cy = rect.top + (clampPct(btn.y) / 100) * rect.height;
      return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
    }

    function snapAngle(deg) {
      var step = 15;
      var nearest = Math.round(deg / step) * step;
      return Math.abs(deg - nearest) <= 4 ? nearest : deg;
    }

    function emitSelect(kind, id) {
      if (typeof options.onSelect === 'function') options.onSelect(kind, id);
    }

    function emitChange() {
      if (typeof options.onChange === 'function') options.onChange();
    }

    function findButton(id) {
      var sc = ensureBags(scene());
      for (var i = 0; i < sc.buttons.length; i++) {
        if (String(sc.buttons[i].id) === String(id)) return sc.buttons[i];
      }
      return null;
    }

    function findHotspot(id) {
      var sc = ensureBags(scene());
      for (var i = 0; i < sc.hotspots.length; i++) {
        if (String(sc.hotspots[i].id) === String(id)) return sc.hotspots[i];
      }
      return null;
    }

    function setButtonSelection(ids, primary) {
      selectedIds = (ids || []).map(String);
      selectedHotspotId = null;
      hotspotDraw = null;
      emitSelect('button', primary || selectedIds[0] || null);
      paint();
    }

    function setHotspotSelection(id) {
      selectedHotspotId = id ? String(id) : null;
      selectedIds = [];
      emitSelect('hotspot', selectedHotspotId);
      paint();
    }

    function clearSelection() {
      selectedIds = [];
      selectedHotspotId = null;
      hotspotDraw = null;
      liveGuides = null;
      emitSelect(null, null);
      paint();
    }

    function onPointerDown(ev) {
      var sc = ensureBags(scene());
      var rotHit = ev.target.closest && ev.target.closest('[data-qe-ix-rotate]');
      var vtx = ev.target.closest && ev.target.closest('[data-qe-ix-vertex]');
      var hsHit = ev.target.closest && ev.target.closest('[data-qe-ix-hs]');
      var btnHit = ev.target.closest && ev.target.closest('[data-qe-ix-btn]');

      if (rotHit) {
        ev.preventDefault();
        ev.stopPropagation();
        var rid = rotHit.getAttribute('data-qe-ix-rotate');
        var rbtn = findButton(rid);
        if (!rbtn) return;
        setButtonSelection([rid], rid);
        rotateDrag = {
          buttonId: rid,
          pointerId: ev.pointerId,
          startAngle: angleAt(rbtn, ev.clientX, ev.clientY),
          originRot: clampRotation(rbtn.rotation)
        };
        rotLabel = clampRotation(rbtn.rotation);
        try { layerEl.setPointerCapture(ev.pointerId); } catch (er) {}
        paint();
        return;
      }

      if (hotspotDraw) {
        ev.preventDefault();
        var pct = percentFromPointer(layerEl, ev.clientX, ev.clientY);
        if (ev.detail === 2 && hotspotDraw.points.length >= 3) {
          finishHotspotDraw();
          return;
        }
        hotspotDraw.points.push(pct);
        paint();
        return;
      }

      if (vtx) {
        ev.preventDefault();
        ev.stopPropagation();
        var hsId = vtx.getAttribute('data-qe-ix-hs-vertex');
        var vi = parseInt(vtx.getAttribute('data-qe-ix-vertex'), 10);
        setHotspotSelection(hsId);
        hotspotDrag = {
          kind: 'vertex',
          hotspotId: hsId,
          vertex: vi,
          pointerId: ev.pointerId
        };
        try { layerEl.setPointerCapture(ev.pointerId); } catch (e) {}
        return;
      }

      if (hsHit) {
        ev.preventDefault();
        ev.stopPropagation();
        var hid = hsHit.getAttribute('data-qe-ix-hs');
        setHotspotSelection(hid);
        var hs = findHotspot(hid);
        var c = polygonCentroid(hs && hs.polygon);
        var p0 = percentFromPointer(layerEl, ev.clientX, ev.clientY);
        hotspotDrag = {
          kind: 'move',
          hotspotId: hid,
          pointerId: ev.pointerId,
          lastX: p0.x,
          lastY: p0.y,
          origin: c
        };
        try { layerEl.setPointerCapture(ev.pointerId); } catch (e2) {}
        return;
      }

      if (btnHit) {
        ev.preventDefault();
        ev.stopPropagation();
        var bid = btnHit.getAttribute('data-qe-ix-btn');
        var cur = selectedIds.slice();
        if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
          var idx = cur.indexOf(String(bid));
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(String(bid));
          setButtonSelection(cur, bid);
        } else {
          setButtonSelection([bid], bid);
        }
        var btn = findButton(bid);
        buttonDrag = {
          buttonId: bid,
          pointerId: ev.pointerId,
          shift: !!ev.shiftKey,
          originX: btn ? btn.x : 50,
          originY: btn ? btn.y : 50,
          startPct: percentFromPointer(layerEl, ev.clientX, ev.clientY)
        };
        try { btnHit.setPointerCapture(ev.pointerId); } catch (e3) {}
        return;
      }

      /* Click empty → deselect */
      clearSelection();
    }

    function onPointerMove(ev) {
      if (hotspotDraw) {
        hotspotDraw.cursor = percentFromPointer(layerEl, ev.clientX, ev.clientY);
        paint();
        return;
      }

      if (rotateDrag && ev.pointerId === rotateDrag.pointerId) {
        var rbtn = findButton(rotateDrag.buttonId);
        if (!rbtn) return;
        var ang = angleAt(rbtn, ev.clientX, ev.clientY);
        var delta = ang - rotateDrag.startAngle;
        var next = snapAngle(rotateDrag.originRot + delta);
        rbtn.rotation = clampRotation(next);
        rotLabel = rbtn.rotation;
        paint();
        return;
      }

      if (buttonDrag && ev.pointerId === buttonDrag.pointerId) {
        var pct = percentFromPointer(layerEl, ev.clientX, ev.clientY);
        var dx = pct.x - buttonDrag.startPct.x;
        var dy = pct.y - buttonDrag.startPct.y;
        if (buttonDrag.shift) {
          if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        var nx = buttonDrag.originX + dx;
        var ny = buttonDrag.originY + dy;
        var peers = ensureBags(scene()).buttons;
        var snapped = computeGuides(
          peers, buttonDrag.buttonId, nx, ny,
          layerEl.clientWidth, layerEl.clientHeight
        );
        liveGuides = snapped.guides;
        var btn = findButton(buttonDrag.buttonId);
        if (btn) {
          btn.x = snapped.x;
          btn.y = snapped.y;
        }
        /* Move multi-selection as a group */
        if (selectedIds.length > 1) {
          var odx = snapped.x - (buttonDrag._lastSnapX != null ? buttonDrag._lastSnapX : buttonDrag.originX);
          var ody = snapped.y - (buttonDrag._lastSnapY != null ? buttonDrag._lastSnapY : buttonDrag.originY);
          if (buttonDrag._lastSnapX != null) {
            selectedIds.forEach(function (id) {
              if (String(id) === String(buttonDrag.buttonId)) return;
              var peer = findButton(id);
              if (!peer) return;
              peer.x = clampPct(peer.x + odx);
              peer.y = clampPct(peer.y + ody);
            });
          }
          buttonDrag._lastSnapX = snapped.x;
          buttonDrag._lastSnapY = snapped.y;
        }
        paint();
        return;
      }

      if (hotspotDrag && ev.pointerId === hotspotDrag.pointerId) {
        var hs = findHotspot(hotspotDrag.hotspotId);
        if (!hs) return;
        var p = percentFromPointer(layerEl, ev.clientX, ev.clientY);
        if (hotspotDrag.kind === 'vertex') {
          var poly = normalizePolygon(hs.polygon);
          if (poly[hotspotDrag.vertex]) {
            poly[hotspotDrag.vertex] = { x: p.x, y: p.y };
            hs.polygon = poly;
          }
        } else {
          var mdx = p.x - hotspotDrag.lastX;
          var mdy = p.y - hotspotDrag.lastY;
          hs.polygon = translatePolygon(hs.polygon, mdx, mdy);
          hotspotDrag.lastX = p.x;
          hotspotDrag.lastY = p.y;
        }
        paint();
      }
    }

    function endDrag(ev) {
      if (rotateDrag && (!ev || ev.pointerId === rotateDrag.pointerId)) {
        rotateDrag = null;
        rotLabel = null;
        paint();
        emitChange();
      }
      if (buttonDrag && (!ev || ev.pointerId === buttonDrag.pointerId)) {
        buttonDrag = null;
        liveGuides = null;
        paint();
        emitChange();
      }
      if (hotspotDrag && (!ev || ev.pointerId === hotspotDrag.pointerId)) {
        hotspotDrag = null;
        paint();
        emitChange();
      }
    }

    function finishHotspotDraw() {
      if (!hotspotDraw || hotspotDraw.points.length < 3) {
        hotspotDraw = null;
        paint();
        return;
      }
      var sc = ensureBags(scene());
      var hs = createHotspot(options.idFactory, {
        polygon: hotspotDraw.points,
        targetSceneId: sc.id || null
      });
      sc.hotspots.push(hs);
      hotspotDraw = null;
      setHotspotSelection(hs.id);
      emitChange();
    }

    function nudge(dxPx, dyPx) {
      if (!selectedIds.length) return;
      var w = Math.max(1, layerEl.clientWidth);
      var h = Math.max(1, layerEl.clientHeight);
      var dx = (dxPx / w) * 100;
      var dy = (dyPx / h) * 100;
      selectedIds.forEach(function (id) {
        var btn = findButton(id);
        if (!btn) return;
        btn.x = clampPct(btn.x + dx);
        btn.y = clampPct(btn.y + dy);
      });
      if (selectedIds.length === 1) {
        var b = findButton(selectedIds[0]);
        if (b) {
          var snapped = computeGuides(
            ensureBags(scene()).buttons, b.id, b.x, b.y, w, h
          );
          b.x = snapped.x;
          b.y = snapped.y;
          liveGuides = snapped.guides;
        }
      }
      paint();
      emitChange();
    }

    function copySelection() {
      if (!selectedIds.length) return;
      clipboard = {
        kind: 'buttons',
        items: selectedIds.map(function (id) {
          var b = findButton(id);
          return b ? JSON.parse(JSON.stringify(b)) : null;
        }).filter(Boolean)
      };
    }

    function pasteClipboard() {
      if (!clipboard || clipboard.kind !== 'buttons' || !clipboard.items.length) return;
      var sc = ensureBags(scene());
      var newIds = [];
      clipboard.items.forEach(function (src) {
        var copy = createButton(options.idFactory, src);
        copy.x = clampPct(src.x);
        copy.y = clampPct(src.y);
        copy.label = src.label;
        copy.style = src.style;
        copy.rotation = src.rotation;
        copy.action = src.action;
        copy.targetSceneId = src.targetSceneId;
        sc.buttons.push(copy);
        newIds.push(copy.id);
      });
      setButtonSelection(newIds, newIds[0]);
      emitChange();
    }

    function duplicateSelection() {
      copySelection();
      pasteClipboard();
    }

    function onKeyDown(ev) {
      if (!layerEl.isConnected) return;
      var tag = (ev.target && ev.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (ev.key === 'Escape') {
        if (hotspotDraw) {
          hotspotDraw = null;
          paint();
          ev.preventDefault();
          return;
        }
        clearSelection();
        return;
      }

      if ((ev.key === 'Delete' || ev.key === 'Backspace') &&
          (selectedIds.length || selectedHotspotId)) {
        ev.preventDefault();
        var sc = ensureBags(scene());
        if (selectedIds.length) {
          sc.buttons = sc.buttons.filter(function (b) {
            return selectedIds.indexOf(String(b.id)) < 0;
          });
          clearSelection();
          emitChange();
        } else if (selectedHotspotId) {
          sc.hotspots = sc.hotspots.filter(function (h) {
            return String(h.id) !== String(selectedHotspotId);
          });
          clearSelection();
          emitChange();
        }
        return;
      }

      var step = ev.altKey ? 0.5 : (ev.shiftKey ? 10 : 1);
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); nudge(-step, 0); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); nudge(step, 0); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); nudge(0, -step); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); nudge(0, step); }

      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
        var k = String(ev.key || '').toLowerCase();
        if (k === 'c') { ev.preventDefault(); copySelection(); }
        else if (k === 'v') { ev.preventDefault(); pasteClipboard(); }
        else if (k === 'd') { ev.preventDefault(); duplicateSelection(); }
      }
    }

    function startHotspotDraw() {
      hotspotDraw = { points: [], cursor: null };
      selectedIds = [];
      selectedHotspotId = null;
      paint();
    }

    layerEl.addEventListener('pointerdown', onPointerDown);
    layerEl.addEventListener('pointermove', onPointerMove);
    layerEl.addEventListener('pointerup', endDrag);
    layerEl.addEventListener('pointercancel', endDrag);
    layerEl.addEventListener('dblclick', function (ev) {
      if (hotspotDraw && hotspotDraw.points.length >= 3) {
        ev.preventDefault();
        finishHotspotDraw();
      }
    });

    if (!keyBound) {
      document.addEventListener('keydown', onKeyDown);
      keyBound = true;
    }

    paint();

    return {
      paint: paint,
      clearSelection: clearSelection,
      setButtonSelection: setButtonSelection,
      setHotspotSelection: setHotspotSelection,
      startHotspotDraw: startHotspotDraw,
      duplicateSelection: duplicateSelection,
      getSelection: function () {
        return {
          buttonIds: selectedIds.slice(),
          hotspotId: selectedHotspotId
        };
      },
      destroy: function () {
        layerEl.removeEventListener('pointerdown', onPointerDown);
        layerEl.removeEventListener('pointermove', onPointerMove);
        layerEl.removeEventListener('pointerup', endDrag);
        layerEl.removeEventListener('pointercancel', endDrag);
        if (keyBound) {
          document.removeEventListener('keydown', onKeyDown);
          keyBound = false;
        }
        layerEl.innerHTML = '';
      }
    };
  }

  return {
    clampPct: clampPct,
    clampRotation: clampRotation,
    percentFromPointer: percentFromPointer,
    computeGuides: computeGuides,
    createButton: createButton,
    createHotspot: createHotspot,
    defaultRectPolygon: defaultRectPolygon,
    normalizePolygon: normalizePolygon,
    mount: mount
  };
})();
