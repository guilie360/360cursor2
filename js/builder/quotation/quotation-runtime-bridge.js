/**
 * QuotationRuntimeBridge — postMessage protocol Editor ↔ Runtime (V7.2.07).
 * Same channel for Canvas iframe and any future Runtime embeds.
 */
var QuotationRuntimeBridge = (function () {
  var SOURCE = 'boxies-quotation-runtime';
  var VERSION = 1;

  var TYPE = {
    /* Editor → Runtime */
    SET_MODEL: 'set-model',
    SET_SELECTION: 'set-selection',
    REFRESH: 'refresh',
    REQUEST_BOXES: 'request-boxes',
    /* Runtime → Editor */
    READY: 'ready',
    ELEMENT_SELECTED: 'element-selected',
    BOXES: 'boxes',
    MODEL_CHANGED: 'model-changed'
  };

  function envelope(type, payload) {
    return {
      source: SOURCE,
      version: VERSION,
      type: type,
      payload: payload == null ? null : payload
    };
  }

  function isMessage(data) {
    return !!(data && typeof data === 'object' && data.source === SOURCE && data.type);
  }

  function post(target, type, payload) {
    if (!target || typeof target.postMessage !== 'function') return false;
    try {
      target.postMessage(envelope(type, payload), '*');
      return true;
    } catch (e) {
      return false;
    }
  }

  function postToParent(type, payload) {
    if (!window.parent || window.parent === window) return false;
    return post(window.parent, type, payload);
  }

  function postToFrame(iframe, type, payload) {
    if (!iframe || !iframe.contentWindow) return false;
    return post(iframe.contentWindow, type, payload);
  }

  return {
    SOURCE: SOURCE,
    VERSION: VERSION,
    TYPE: TYPE,
    envelope: envelope,
    isMessage: isMessage,
    post: post,
    postToParent: postToParent,
    postToFrame: postToFrame
  };
})();
