/* BOXIES V6.5.01 — Experiencia Auto Snapshot Recovery
 * Never lose a flow: local snapshots + recovery dialog + migration guard. */
var ExperienciaSnapshot = (function () {
  var MAX_SNAPSHOTS = 20;
  var STORAGE_PREFIX = 'boxies_exp_flow_snap_';
  var HISTORY_KEY = 'boxies_exp_flow_history_';
  var DRAFT_KEY = 'boxies_exp_flow_draft_';
  var IGNORE_KEY = 'boxies_exp_flow_ignore_';
  var DEBOUNCE_MS = 700;
  var _debounceTimer = null;
  var _lastCaptureSig = '';
  var _guardDepth = 0;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function projectKey(state) {
    return String(
      (state && (state.draftProjectId || state.projectId)) ||
      (state && state.projectInfo && state.projectInfo.slug) ||
      'draft'
    );
  }

  function safeParse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cloneJson(v) {
    try {
      return JSON.parse(JSON.stringify(v == null ? null : v));
    } catch (e) {
      return null;
    }
  }

  function countNodes(flow) {
    return (flow && Array.isArray(flow.nodes)) ? flow.nodes.length : 0;
  }

  function countEdges(flow) {
    return (flow && Array.isArray(flow.edges)) ? flow.edges.length : 0;
  }

  function flowSignature(flow) {
    var n = countNodes(flow);
    var e = countEdges(flow);
    var ids = (flow.nodes || []).map(function (x) { return x && x.id; }).join(',');
    return n + '|' + e + '|' + ids;
  }

  function extractFlow(exp) {
    if (!exp || typeof exp !== 'object') return null;
    var nodes = Array.isArray(exp.nodes) ? exp.nodes : null;
    var edges = Array.isArray(exp.edges) ? exp.edges : null;
    if (!nodes) return null;
    return {
      nodes: cloneJson(nodes) || [],
      edges: cloneJson(edges) || [],
      canvas: cloneJson(exp.canvas) || null,
      mode: exp.mode || 'flow',
      version: exp.version || 2
    };
  }

  function currentFlow(state) {
    var exp = (state && state.experiencia) || null;
    return extractFlow(exp);
  }

  function makeSnapshot(state, reason, origin) {
    var flow = currentFlow(state);
    if (!flow) return null;
    return {
      id: 'snap-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      reason: reason || 'auto',
      origin: origin || 'autosave',
      projectKey: projectKey(state),
      nodeCount: countNodes(flow),
      edgeCount: countEdges(flow),
      signature: flowSignature(flow),
      flow: flow
    };
  }

  function readHistory(pk) {
    var list = safeParse(localStorage.getItem(HISTORY_KEY + pk));
    return Array.isArray(list) ? list : [];
  }

  function writeHistory(pk, list) {
    try {
      localStorage.setItem(HISTORY_KEY + pk, JSON.stringify(list.slice(-MAX_SNAPSHOTS)));
    } catch (e) {}
  }

  function pushHistory(snap) {
    if (!snap || !snap.flow) return;
    var pk = snap.projectKey || 'draft';
    var list = readHistory(pk);
    /* Skip identical consecutive */
    if (list.length && list[list.length - 1].signature === snap.signature) return;
    list.push(snap);
    if (list.length > MAX_SNAPSHOTS) list = list.slice(-MAX_SNAPSHOTS);
    writeHistory(pk, list);

    /* Also mirror latest single key */
    try {
      localStorage.setItem(STORAGE_PREFIX + pk, JSON.stringify(snap));
    } catch (e2) {}
  }

  function storeInState(state, snap) {
    if (!state || !snap) return;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureState) {
      ExperienciaEngine.ensureState(state);
    }
    var exp = state.experiencia;
    if (!exp) return;
    if (!Array.isArray(exp.flowSnapshots)) exp.flowSnapshots = [];
    if (exp.flowSnapshots.length &&
        exp.flowSnapshots[exp.flowSnapshots.length - 1].signature === snap.signature) {
      return;
    }
    exp.flowSnapshots.push({
      id: snap.id,
      at: snap.at,
      reason: snap.reason,
      origin: snap.origin,
      nodeCount: snap.nodeCount,
      edgeCount: snap.edgeCount,
      signature: snap.signature,
      flow: snap.flow
    });
    if (exp.flowSnapshots.length > MAX_SNAPSHOTS) {
      exp.flowSnapshots = exp.flowSnapshots.slice(-MAX_SNAPSHOTS);
    }
  }

  /**
   * Capture a flow snapshot (immediate).
   */
  function capture(state, reason, origin) {
    if (_guardDepth > 0 && reason === 'auto-dirty') return null;
    var snap = makeSnapshot(state, reason, origin || 'autosave');
    if (!snap) return null;
    if (snap.signature === _lastCaptureSig && reason === 'auto-dirty') return null;
    _lastCaptureSig = snap.signature;
    pushHistory(snap);
    storeInState(state, snap);
    return snap;
  }

  function captureDeferred(state, reason) {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      _debounceTimer = null;
      capture(state, reason || 'auto-dirty', 'autosave');
    }, DEBOUNCE_MS);
  }

  function collectCandidates(state) {
    var pk = projectKey(state);
    var found = [];
    var seen = {};

    function add(snap, originFallback) {
      if (!snap || !snap.flow || !Array.isArray(snap.flow.nodes)) return;
      var sig = snap.signature || flowSignature(snap.flow);
      var key = sig + '|' + (snap.at || '');
      if (seen[key]) return;
      seen[key] = true;
      found.push({
        id: snap.id || key,
        at: snap.at || null,
        reason: snap.reason || 'unknown',
        origin: snap.origin || originFallback || 'unknown',
        nodeCount: snap.nodeCount != null ? snap.nodeCount : countNodes(snap.flow),
        edgeCount: snap.edgeCount != null ? snap.edgeCount : countEdges(snap.flow),
        signature: sig,
        flow: snap.flow
      });
    }

    /* 1. In-state flowSnapshots */
    var exp = (state && state.experiencia) || {};
    (exp.flowSnapshots || []).forEach(function (s) {
      add(s, 'flowSnapshots');
    });

    /* 2. resetSnapshots */
    (exp.resetSnapshots || []).forEach(function (s) {
      if (!s) return;
      add({
        id: 'reset-' + (s.at || ''),
        at: s.at,
        reason: s.reason || 'resetFlow',
        origin: 'resetSnapshots',
        nodeCount: (s.nodes || []).length,
        edgeCount: (s.edges || []).length,
        signature: null,
        flow: {
          nodes: cloneJson(s.nodes) || [],
          edges: cloneJson(s.edges) || [],
          canvas: cloneJson(s.canvas) || null
        }
      }, 'resetSnapshots');
    });

    /* 3. legacySnapshot */
    if (exp.legacySnapshot && Array.isArray(exp.legacySnapshot.nodes)) {
      var leg = exp.legacySnapshot;
      add({
        id: 'legacy-' + (leg.at || ''),
        at: leg.at,
        reason: 'legacySnapshot',
        origin: 'legacySnapshot',
        flow: {
          nodes: cloneJson(leg.nodes) || [],
          edges: cloneJson(leg.edges) || [],
          canvas: cloneJson(leg.canvas) || null
        }
      }, 'legacySnapshot');
    }

    /* 4. localStorage history + latest */
    readHistory(pk).forEach(function (s) { add(s, 'localStorage'); });
    add(safeParse(localStorage.getItem(STORAGE_PREFIX + pk)), 'localStorage');
    add(safeParse(localStorage.getItem(DRAFT_KEY + pk)), 'draft');

    /* 5. sessionStorage builder session (may hold richer prior experiencia) */
    try {
      var sess = safeParse(sessionStorage.getItem('boxies_ai_builder_session'));
      if (sess && sess.experiencia) {
        var sf = extractFlow(sess.experiencia);
        if (sf) {
          add({
            id: 'session-exp',
            at: sess.experiencia.draftSavedAt || null,
            reason: 'sessionStorage',
            origin: 'sessionStorage',
            flow: sf
          }, 'sessionStorage');
        }
        (sess.experiencia.flowSnapshots || []).forEach(function (s) {
          add(s, 'sessionStorage');
        });
        (sess.experiencia.resetSnapshots || []).forEach(function (s) {
          if (!s || !s.nodes) return;
          add({
            at: s.at,
            reason: s.reason || 'resetFlow',
            origin: 'sessionStorage/resetSnapshots',
            flow: {
              nodes: cloneJson(s.nodes) || [],
              edges: cloneJson(s.edges) || [],
              canvas: cloneJson(s.canvas) || null
            }
          }, 'sessionStorage');
        });
      }
    } catch (eSess) {}

    /* 6. Other localStorage keys that look like builder sessions / snaps */
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        if (k.indexOf('boxies_exp_flow') === 0 || k.indexOf('boxies_ai_builder') === 0) {
          var parsed = safeParse(localStorage.getItem(k));
          if (!parsed) continue;
          if (parsed.flow && parsed.flow.nodes) add(parsed, 'localStorage');
          else if (parsed.experiencia) {
            var ef = extractFlow(parsed.experiencia);
            if (ef) {
              add({
                at: null,
                reason: k,
                origin: 'localStorage',
                flow: ef
              }, 'localStorage');
            }
          }
        }
      }
    } catch (eLs) {}

    /* 7. Compiled runtime graph (nodes/connections) as last resort */
    try {
      var rt = (typeof window !== 'undefined' && window.BuilderRuntime) || null;
      if (rt && Array.isArray(rt.nodes) && rt.nodes.length) {
        var rtNodes = cloneJson(rt.nodes) || [];
        var rtEdges = cloneJson(rt.connections || rt.edges || []) || [];
        add({
          id: 'runtime-' + (rt.generatedAt || ''),
          at: rt.generatedAt || null,
          reason: 'BuilderRuntime',
          origin: 'runtime',
          flow: { nodes: rtNodes, edges: rtEdges, canvas: null }
        }, 'runtime');
      }
    } catch (eRt) {}

    found.sort(function (a, b) {
      if (b.nodeCount !== a.nodeCount) return b.nodeCount - a.nodeCount;
      if (b.edgeCount !== a.edgeCount) return b.edgeCount - a.edgeCount;
      return String(b.at || '').localeCompare(String(a.at || ''));
    });
    return found;
  }

  function bestRecoveryCandidate(state) {
    var cur = currentFlow(state);
    var curNodes = countNodes(cur);
    var curEdges = countEdges(cur);
    var candidates = collectCandidates(state);
    var best = null;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c.nodeCount > curNodes) {
        best = c;
        break;
      }
      if (c.nodeCount === curNodes && c.edgeCount > curEdges) {
        best = c;
        break;
      }
    }
    if (!best) return null;

    /* Respect ignore for this pair */
    var ignore = safeParse(localStorage.getItem(IGNORE_KEY + projectKey(state)));
    if (ignore && ignore.currentSig === flowSignature(cur) &&
        ignore.candidateSig === best.signature) {
      return null;
    }
    return {
      current: {
        nodeCount: curNodes,
        edgeCount: curEdges,
        signature: flowSignature(cur)
      },
      candidate: best
    };
  }

  function applyFlowToState(state, flow) {
    if (!state || !flow) return false;
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.ensureState) {
      ExperienciaEngine.ensureState(state);
    }
    var exp = state.experiencia;
    if (!exp) return false;
    exp.nodes = cloneJson(flow.nodes) || [];
    exp.edges = cloneJson(flow.edges) || [];
    if (flow.canvas && typeof flow.canvas === 'object') {
      var keepMode = exp.canvas && exp.canvas.editMode;
      exp.canvas = Object.assign({}, exp.canvas || {}, cloneJson(flow.canvas) || {});
      if (keepMode) exp.canvas.editMode = keepMode;
    }
    exp.dirty = true;
    exp._draftSaved = false;
    exp.recoveredAt = new Date().toISOString();
    return true;
  }

  function restore(state, candidate) {
    if (!candidate || !candidate.flow) return false;
    capture(state, 'pre-restore', 'recovery');
    return applyFlowToState(state, candidate.flow);
  }

  function duplicateAsDraft(state, candidate) {
    if (!candidate || !candidate.flow) return false;
    var draft = {
      id: 'draft-' + Date.now().toString(36),
      at: new Date().toISOString(),
      reason: 'duplicate-draft',
      origin: 'draft',
      projectKey: projectKey(state),
      nodeCount: countNodes(candidate.flow),
      edgeCount: countEdges(candidate.flow),
      signature: flowSignature(candidate.flow),
      flow: cloneJson(candidate.flow)
    };
    try {
      localStorage.setItem(DRAFT_KEY + projectKey(state), JSON.stringify(draft));
    } catch (e) {}
    pushHistory(draft);
    storeInState(state, draft);
    return true;
  }

  function ignoreCandidate(state, pair) {
    if (!pair) return;
    try {
      localStorage.setItem(IGNORE_KEY + projectKey(state), JSON.stringify({
        at: new Date().toISOString(),
        currentSig: pair.current && pair.current.signature,
        candidateSig: pair.candidate && pair.candidate.signature
      }));
    } catch (e) {}
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return String(iso);
    }
  }

  /**
   * Show recovery dialog. Returns Promise<'restore'|'duplicate'|'ignore'|null>
   */
  function showRecoveryDialog(pair, hostEl) {
    return new Promise(function (resolve) {
      if (!pair || !pair.candidate) {
        resolve(null);
        return;
      }
      var host = hostEl || document.body;
      var overlay = document.createElement('div');
      overlay.className = 'boxies-flow-recovery';
      overlay.setAttribute('data-flow-recovery', '1');
      overlay.innerHTML =
        '<div class="boxies-flow-recovery__backdrop" data-fr-ignore></div>' +
        '<div class="boxies-flow-recovery__panel" role="dialog" aria-modal="true">' +
          '<h3 class="boxies-flow-recovery__title">Se encontró una versión anterior del flujo</h3>' +
          '<div class="boxies-flow-recovery__grid">' +
            '<div class="boxies-flow-recovery__card">' +
              '<div class="boxies-flow-recovery__lab">Proyecto actual</div>' +
              '<div class="boxies-flow-recovery__val">' +
                esc(String(pair.current.nodeCount)) + ' nodo' +
                (pair.current.nodeCount === 1 ? '' : 's') +
                ' · ' + esc(String(pair.current.edgeCount)) + ' edge' +
                (pair.current.edgeCount === 1 ? '' : 's') +
              '</div>' +
            '</div>' +
            '<div class="boxies-flow-recovery__card is-better">' +
              '<div class="boxies-flow-recovery__lab">Versión encontrada</div>' +
              '<div class="boxies-flow-recovery__val">' +
                esc(String(pair.candidate.nodeCount)) + ' nodo' +
                (pair.candidate.nodeCount === 1 ? '' : 's') +
                ' · ' + esc(String(pair.candidate.edgeCount)) + ' edge' +
                (pair.candidate.edgeCount === 1 ? '' : 's') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<dl class="boxies-flow-recovery__meta">' +
            '<div><dt>Fecha</dt><dd>' + esc(formatWhen(pair.candidate.at)) + '</dd></div>' +
            '<div><dt>Origen</dt><dd>' + esc(pair.candidate.origin || 'snapshot') + '</dd></div>' +
            '<div><dt>Motivo</dt><dd>' + esc(pair.candidate.reason || '—') + '</dd></div>' +
          '</dl>' +
          '<p class="boxies-flow-recovery__hint">' +
            'Restaurar recupera solo el flujo (nodos, edges, canvas, botones y hotspots). ' +
            'Info, Hero media, Estructura y Configuración no se modifican.' +
          '</p>' +
          '<div class="boxies-flow-recovery__actions">' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-fr-ignore>Ignorar</button>' +
            '<button type="button" class="builder-header-action-btn boxies-btn-secondary" data-fr-dup>Duplicar como borrador</button>' +
            '<button type="button" class="builder-header-action-btn is-primary" data-fr-restore>Restaurar</button>' +
          '</div>' +
        '</div>';

      function finish(action) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(action);
      }
      overlay.querySelectorAll('[data-fr-ignore]').forEach(function (el) {
        el.addEventListener('click', function () { finish('ignore'); });
      });
      var dup = overlay.querySelector('[data-fr-dup]');
      if (dup) dup.addEventListener('click', function () { finish('duplicate'); });
      var rest = overlay.querySelector('[data-fr-restore]');
      if (rest) rest.addEventListener('click', function () { finish('restore'); });
      host.appendChild(overlay);
    });
  }

  /**
   * Run on Experiencia mount / project open.
   */
  function checkAndOfferRecovery(state, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var pair = bestRecoveryCandidate(state);
      if (!pair) {
        resolve({ offered: false, action: null });
        return;
      }
      showRecoveryDialog(pair, options.host || null).then(function (action) {
        if (action === 'restore') {
          restore(state, pair.candidate);
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.success('Flujo restaurado (' + pair.candidate.nodeCount + ' nodos).');
          }
        } else if (action === 'duplicate') {
          duplicateAsDraft(state, pair.candidate);
          if (typeof AdminNotify !== 'undefined') {
            AdminNotify.info('Copia guardada como borrador. El proyecto actual no cambió.');
          }
        } else {
          ignoreCandidate(state, pair);
        }
        resolve({ offered: true, action: action, pair: pair });
      });
    });
  }

  /**
   * Guard destructive / migration ops.
   * fn should mutate state. If node/edge count drops unexpectedly → rollback.
   */
  function runGuarded(state, reason, fn, options) {
    options = options || {};
    var allowShrink = !!options.allowShrink; /* user-initiated delete */
    var before = makeSnapshot(state, 'pre:' + (reason || 'mutation'), 'guard');
    if (before) {
      pushHistory(before);
      storeInState(state, before);
    }
    var beforeN = before ? before.nodeCount : countNodes(currentFlow(state));
    var beforeE = before ? before.edgeCount : countEdges(currentFlow(state));

    _guardDepth += 1;
    var result;
    try {
      result = typeof fn === 'function' ? fn() : null;
    } catch (err) {
      _guardDepth -= 1;
      if (before && before.flow) applyFlowToState(state, before.flow);
      if (typeof AdminNotify !== 'undefined') {
        AdminNotify.error('Operación revertida tras error: ' + (err && err.message ? err.message : 'fallo'));
      }
      throw err;
    }
    _guardDepth -= 1;

    var after = currentFlow(state);
    var afterN = countNodes(after);
    var afterE = countEdges(after);

    if (!allowShrink && before && (afterN < beforeN || afterE < beforeE)) {
      applyFlowToState(state, before.flow);
      if (typeof AdminNotify !== 'undefined') {
        AdminNotify.error(
          'Migración cancelada: el flujo habría perdido nodos/edges (' +
          beforeN + '→' + afterN + ' nodos, ' + beforeE + '→' + afterE +
          ' edges). Se restauró el snapshot.'
        );
      }
      return { ok: false, rolledBack: true, result: null, before: before };
    }

    capture(state, reason || 'mutation', 'autosave');
    return { ok: true, rolledBack: false, result: result, before: before };
  }

  return {
    MAX_SNAPSHOTS: MAX_SNAPSHOTS,
    capture: capture,
    captureDeferred: captureDeferred,
    collectCandidates: collectCandidates,
    bestRecoveryCandidate: bestRecoveryCandidate,
    checkAndOfferRecovery: checkAndOfferRecovery,
    restore: restore,
    duplicateAsDraft: duplicateAsDraft,
    ignoreCandidate: ignoreCandidate,
    runGuarded: runGuarded,
    currentFlow: currentFlow,
    extractFlow: extractFlow
  };
})();
