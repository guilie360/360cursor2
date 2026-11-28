/**
 * BOXIES Editor Theme System — Classic, Premium, Graphite chrome.
 * Switch with setTheme("classic") | setTheme("premium") | setTheme("graphite").
 * Independent from ThemeSystem (showroom visitor themes).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'boxies_editor_theme_v1';
  var CLASS_BY_ID = {
    classic: 'theme-classic',
    premium: 'theme-premium',
    graphite: 'theme-graphite'
  };
  var VALID = Object.keys(CLASS_BY_ID);

  function normalize(name) {
    var id = String(name || '').trim().toLowerCase();
    return VALID.indexOf(id) >= 0 ? id : 'classic';
  }

  function readStored() {
    try {
      return normalize(global.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return 'classic';
    }
  }

  function writeStored(id) {
    try {
      global.localStorage.setItem(STORAGE_KEY, id);
    } catch (_) {}
  }

  function applyTheme(name, opts) {
    opts = opts || {};
    var id = normalize(name);
    var body = document.body;
    if (!body) return id;

    VALID.forEach(function (key) {
      body.classList.remove(CLASS_BY_ID[key]);
    });
    body.classList.add(CLASS_BY_ID[id]);
    body.dataset.editorTheme = id;

    if (opts.persist !== false) {
      writeStored(id);
    }

    try {
      global.dispatchEvent(
        new CustomEvent('boxies:editor-theme', { detail: { theme: id } })
      );
    } catch (_) {}

    return id;
  }

  function getTheme() {
    var body = document.body;
    if (!body) return readStored();
    if (body.dataset.editorTheme) return normalize(body.dataset.editorTheme);
    for (var i = 0; i < VALID.length; i += 1) {
      if (body.classList.contains(CLASS_BY_ID[VALID[i]])) return VALID[i];
    }
    return readStored();
  }

  function initFromStorage() {
    return applyTheme(readStored(), { persist: false });
  }

  var EditorTheme = {
    STORAGE_KEY: STORAGE_KEY,
    THEMES: VALID.slice(),
    getTheme: getTheme,
    setTheme: applyTheme,
    init: initFromStorage
  };

  global.EditorTheme = EditorTheme;
  global.setTheme = function setTheme(name) {
    return EditorTheme.setTheme(name);
  };
  global.getTheme = function getEditorTheme() {
    return EditorTheme.getTheme();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFromStorage);
  } else {
    initFromStorage();
  }
})(typeof window !== 'undefined' ? window : globalThis);
