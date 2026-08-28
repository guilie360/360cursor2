try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/style-engine-history.js');}catch(_e){}
/* Style Engine — Historial, Undo / Redo (solo sesión del modal) */
var StyleEngineHistory = (function () {
  var undoStack = [];
  var redoStack = [];
  var log = [];
  var MAX_LOG = 80;
  var suppress = false;

  function tokenLabel(key) {
    var meta = StyleEngineTokens.getTokenMeta(key);
    return meta ? meta.label : key;
  }

  function recordChange(key, from, to) {
    if (suppress || String(from) === String(to)) return;
    var entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      at: new Date().toISOString(),
      key: key,
      label: tokenLabel(key),
      from: from,
      to: to
    };
    undoStack.push(entry);
    redoStack = [];
    log.unshift(entry);
    if (log.length > MAX_LOG) log.length = MAX_LOG;
    notify();
  }

  var listeners = [];
  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function undo() {
    if (!canUndo()) return false;
    var entry = undoStack.pop();
    redoStack.push(entry);
    suppress = true;
    StyleEngineStore.setDraftRule(entry.key, entry.from, { history: false });
    suppress = false;
    notify();
    return true;
  }

  function redo() {
    if (!canRedo()) return false;
    var entry = redoStack.pop();
    undoStack.push(entry);
    suppress = true;
    StyleEngineStore.setDraftRule(entry.key, entry.to, { history: false });
    suppress = false;
    notify();
    return true;
  }

  function clear() {
    undoStack = [];
    redoStack = [];
    log = [];
    notify();
  }

  function getLog() {
    return log.slice();
  }

  function isRecording() {
    return !suppress;
  }

  function wrapSetDraftRule(key, from, to) {
    if (isRecording()) recordChange(key, from, to);
  }

  return {
    subscribe: subscribe,
    canUndo: canUndo,
    canRedo: canRedo,
    undo: undo,
    redo: redo,
    clear: clear,
    getLog: getLog,
    wrapSetDraftRule: wrapSetDraftRule
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/style-engine-history.js');}catch(_e){}
