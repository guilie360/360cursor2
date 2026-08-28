/**
 * QuotationPersistAudit — V7.2.27 diagnostic only.
 * Logs the Editor → Save → Publish → Preview → Runtime persistence path.
 * Does NOT change behavior, UI, or persistence.
 *
 * Enable: always on when this script loads (window.__QE_AUDIT__ !== false).
 * Dump last trail: window.__QE_AUDIT_TRAIL__
 */
var QuotationPersistAudit = (function () {
  var TAG = '[QE-AUDIT V7.2.27]';
  var trail = [];
  var MAX = 200;

  function enabled() {
    return typeof window === 'undefined' || window.__QE_AUDIT__ !== false;
  }

  function stamp() {
    return new Date().toISOString();
  }

  function push(step, payload) {
    if (!enabled()) return;
    var entry = {
      t: stamp(),
      step: step,
      payload: payload
    };
    trail.push(entry);
    if (trail.length > MAX) trail.shift();
    try {
      window.__QE_AUDIT_TRAIL__ = trail.slice();
    } catch (e0) {}
    try {
      console.groupCollapsed(TAG + ' ' + step);
      console.log(payload);
      console.groupEnd();
    } catch (e1) {
      console.log(TAG, step, payload);
    }
  }

  function summarizeResource(item) {
    if (!item) return null;
    var preview = item.previewUrl || null;
    var remote = item.remoteUrl || null;
    return {
      resourceId: item.id || null,
      name: item.name || null,
      group: item.group || null,
      mime: item.media || (item.file && item.file.type) || null,
      storagePath: item.storagePath || null,
      publicUrl: remote || null,
      blobUrl: preview && String(preview).indexOf('blob:') === 0 ? preview : null,
      previewUrl: preview,
      remoteUrl: remote,
      hasFileObject: !!(item.file),
      projectId: item.projectId || null,
      isBlobOnly: !!(preview && String(preview).indexOf('blob:') === 0 && !remote)
    };
  }

  function summarizeScene(sc) {
    if (!sc) return null;
    return {
      sceneId: sc.id || null,
      name: sc.name || null,
      type: sc.type || null,
      resourceId: sc.resourceId || null,
      backgroundResourceId: sc.backgroundResourceId || null,
      /* Codebase uses resourceId — backgroundResourceId is NOT a persisted field */
      mediaUrl: sc.mediaUrl || null,
      mediaType: sc.mediaType || null,
      embedUrl: sc.embedUrl || null,
      embedAllow: sc.embedAllow || null,
      embedProvider: sc.embedProvider || null,
      mediaIsBlob: !!(sc.mediaUrl && String(sc.mediaUrl).indexOf('blob:') === 0),
      coverImage: sc.coverModel && sc.coverModel.imageUrl || null,
      coverVideo: sc.coverModel && sc.coverModel.videoUrl || null,
      interactionsCount: Array.isArray(sc.interactions) ? sc.interactions.length : 0
    };
  }

  function summarizeDocument(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    return {
      version: doc.version,
      activeSceneId: doc.activeSceneId,
      sceneCount: Array.isArray(doc.scenes) ? doc.scenes.length : 0,
      scenes: Array.isArray(doc.scenes) ? doc.scenes.map(summarizeScene) : []
    };
  }

  function ids(ctx) {
    ctx = ctx || {};
    return {
      projectId: ctx.projectId || ctx.id || null,
      slug: ctx.slug || null
    };
  }

  /* ── A. Resource uploaded / added to library ── */
  function onResourceAdded(item, meta) {
    push('A.upload/library-add', {
      ids: ids(meta),
      resource: summarizeResource(item),
      note: item && !item.remoteUrl
        ? 'BREAK-CANDIDATE: remoteUrl/storagePath missing — only blob/local file in memory'
        : 'remoteUrl present'
    });
  }

  /* ── B. Assign resource → scene ── */
  function onSceneAssign(scene, resource, doc, meta) {
    push('B.assign-to-scene', {
      ids: ids(meta),
      sceneId: scene && scene.id,
      backgroundResourceId: scene && (scene.backgroundResourceId || null),
      resourceId: scene && scene.resourceId,
      tipo: scene && (scene.mediaType || (resource && resource.media)),
      resource: summarizeResource(resource),
      sceneAfter: summarizeScene(scene),
      projectDocument: summarizeDocument(doc),
      note: !scene || !scene.backgroundResourceId
        ? 'NOTE: field backgroundResourceId does not exist — link is scene.resourceId + scene.mediaUrl'
        : null
    });
  }

  /* ── C. Save payload ── */
  function onSavePayload(projectId, slug, payload, memoryDoc) {
    push('C.save-payload-FULL', {
      projectId: projectId || null,
      slug: slug || null,
      source: 'QuotationEditor.commit → ProyectosApi.updateHeroQuotation',
      memoryProjectDocument: memoryDoc,
      persistPayload: payload
    });
    /* Also dump ungrouped for easy copy */
    try {
      console.log(TAG + ' C.persistPayload JSON ↓');
      console.log(JSON.stringify(payload, null, 2));
      console.log(TAG + ' C.memoryDocument JSON ↓');
      console.log(JSON.stringify(memoryDoc, null, 2));
    } catch (eJson) {}
  }

  /* ── D. Read-back compare ── */
  function onSaveReadBack(projectId, slug, memoryDoc, storedHero) {
    var storedCanvas = storedHero && storedHero.canvas ? storedHero.canvas : null;
    var memScenes = (memoryDoc && memoryDoc.scenes) || [];
    var dbScenes = (storedCanvas && storedCanvas.scenes) || [];
    var diffs = [];
    var i;
    var max = Math.max(memScenes.length, dbScenes.length);
    for (i = 0; i < max; i++) {
      var m = memScenes[i] || null;
      var d = dbScenes[i] || null;
      if (!m || !d) {
        diffs.push({ index: i, issue: !m ? 'missing-in-memory' : 'missing-in-db' });
        continue;
      }
      if (String(m.id) !== String(d.id)) {
        diffs.push({ index: i, issue: 'id-mismatch', memory: m.id, db: d.id });
      }
      if (String(m.mediaUrl || '') !== String(d.mediaUrl || '')) {
        diffs.push({
          index: i,
          sceneId: m.id,
          issue: 'mediaUrl-mismatch',
          memory: m.mediaUrl || null,
          db: d.mediaUrl || null,
          memoryWasBlob: !!(m.mediaUrl && String(m.mediaUrl).indexOf('blob:') === 0),
          dbIsNull: d.mediaUrl == null
        });
      }
      if (String(m.resourceId || '') !== String(d.resourceId || '')) {
        diffs.push({
          index: i,
          sceneId: m.id,
          issue: 'resourceId-mismatch',
          memory: m.resourceId,
          db: d.resourceId
        });
      }
      var mIx = Array.isArray(m.interactions) ? m.interactions.length : 0;
      var dIx = Array.isArray(d.interactions) ? d.interactions.length : 0;
      if (mIx !== dIx) {
        diffs.push({
          index: i,
          sceneId: m.id,
          issue: 'interactions-count-mismatch',
          memory: mIx,
          db: dIx
        });
      }
    }

    var identical = diffs.length === 0 &&
      memScenes.length === dbScenes.length &&
      String((memoryDoc && memoryDoc.activeSceneId) || '') ===
        String((storedCanvas && storedCanvas.activeSceneId) || '');

    push('D.save-readback-compare', {
      projectId: projectId || null,
      slug: slug || null,
      identical: identical,
      diffs: diffs,
      memoryDocument: memoryDoc,
      storedHeroQuotation: storedHero,
      storedCanvas: storedCanvas,
      verdict: identical
        ? 'OK — memory === DB canvas'
        : 'BREAK — memory ≠ DB (see diffs). Common cause: blob: mediaUrl stripped on sanitize.'
    });
    try {
      console.log(TAG + ' D.storedCanvas JSON ↓');
      console.log(JSON.stringify(storedCanvas, null, 2));
    } catch (e2) {}
  }

  /* ── E. Publish ── */
  function onPublish(meta) {
    push('E.publish', {
      projectId: meta.projectId || null,
      slug: meta.slug || null,
      source: meta.source || 'unknown',
      note: meta.note || null,
      documentOrigin: meta.documentOrigin || null,
      timestamp: stamp()
    });
  }

  /* ── F. Preview open ── */
  function onPreview(meta) {
    push('F.preview-open', {
      projectId: meta.projectId || null,
      slug: meta.slug || null,
      source: meta.source || null,
      url: meta.url || null,
      liveDocPresent: !!meta.liveDocPresent,
      canvasSceneCount: meta.canvasSceneCount != null ? meta.canvasSceneCount : null,
      timestamp: stamp()
    });
  }

  /* ── G. Runtime public boot ── */
  function onRuntimeBoot(meta) {
    push('G.runtime-boot', {
      projectId: meta.projectId || null,
      slug: meta.slug || null,
      source: meta.source || null,
      mode: meta.mode || null,
      canvas: meta.canvas || null,
      canvasSummary: summarizeDocument(meta.canvas),
      timestamp: stamp()
    });
    try {
      console.log(TAG + ' G.ProjectDocument received JSON ↓');
      console.log(JSON.stringify(meta.canvas || null, null, 2));
    } catch (e3) {}
  }

  function onParallelStates(list) {
    push('PARALLEL-STATES', { states: list });
  }

  function reportBreakHypothesis() {
    push('HYPOTHESIS', {
      primaryBreak:
        'addFilesToGroup stores File + blob: previewUrl with remoteUrl=null; ' +
        'assignResourceToScene copies blob into scene.mediaUrl; ' +
        'ProyectosApi.sanitizeCanvasDocument NULLs every blob: mediaUrl/cover URL before write. ' +
        'DB therefore stores scenes with resourceId but mediaUrl=null → Runtime paints empty.',
      secondaryBreak:
        'Library state.content is NOT in hero_quotation — only session draft. ' +
        'On refresh, blob: URLs are dead; resourceId links dangle → empty media cards.',
      tertiaryBreak:
        'Builder Preview (live session) can still show blobs; /{slug} reads DB (stripped) → old/empty.',
      fieldGap:
        'backgroundResourceId does not exist in schema — only resourceId + mediaUrl.'
    });
  }

  /* Emit parallel-state inventory once at load */
  function inventoryParallelStates() {
    var states = [
      {
        name: 'QuotationEditor.state (memory)',
        key: 'QuotationEditor._getState()',
        persists: 'sessionStorage boxies_qe_draft_v1_{projectId}',
        contains: 'content[], folders[], scenes[] (with blob URLs)'
      },
      {
        name: 'session draft',
        key: 'boxies_qe_draft_v1_{projectId}',
        persists: 'sessionStorage',
        contains: 'Full editor state including File refs lost on serialize… actually File may not survive JSON'
      },
      {
        name: 'live preview envelope',
        key: 'boxies_qe_live_doc_v1_{projectId}',
        persists: 'sessionStorage',
        contains: 'serializeDocument() canvas snapshot for Preview'
      },
      {
        name: 'hero_quotation.canvas (DB)',
        key: 'proyecto_config.hero_quotation.canvas',
        persists: 'Supabase',
        contains: 'ProjectDocument after sanitize (blobs stripped)'
      },
      {
        name: 'hero_quotation top-level (DB)',
        key: 'hero_quotation.video_url / image_url / heroContent',
        persists: 'Supabase',
        contains: 'Legacy/parallel hero fields from QuotationHero + Editor cover'
      },
      {
        name: 'QuotationHero.heroState',
        key: 'QuotationHero internal',
        persists: 'via QuotationHero.commit → hero_quotation (no canvas in payload)',
        contains: 'Separate hero media upload path'
      },
      {
        name: 'QuotationRuntime.loaded',
        key: 'fetchBundle / live envelope',
        persists: 'memory in Runtime iframe',
        contains: 'Bundle from DB or live session doc'
      },
      {
        name: 'liveModel (Runtime)',
        key: 'QuotationRuntime liveModel',
        persists: 'memory',
        contains: 'Cover override via bridge SET_MODEL'
      }
    ];
    onParallelStates(states);
    reportBreakHypothesis();
  }

  if (typeof window !== 'undefined') {
    try {
      window.__QE_AUDIT_TRAIL__ = trail;
      window.__QE_AUDIT_DUMP__ = function () {
        console.log(TAG + ' full trail', trail);
        return trail;
      };
    } catch (eWin) {}
    try {
      inventoryParallelStates();
    } catch (eInv) {}
  }

  return {
    TAG: TAG,
    onResourceAdded: onResourceAdded,
    onSceneAssign: onSceneAssign,
    onSavePayload: onSavePayload,
    onSaveReadBack: onSaveReadBack,
    onPublish: onPublish,
    onPreview: onPreview,
    onRuntimeBoot: onRuntimeBoot,
    onParallelStates: onParallelStates,
    summarizeDocument: summarizeDocument,
    summarizeResource: summarizeResource,
    trail: function () { return trail.slice(); }
  };
})();
