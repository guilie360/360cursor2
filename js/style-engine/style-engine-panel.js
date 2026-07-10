/* Style Engine — Panel v2 (AI, presets, historial, tokens, color picker) */
var StyleEnginePanel = (function () {
  var hostId = 'styleEngineEditorHost';
  var previewHostId = 'styleEnginePreviewHost';
  var openCategories = {};
  var aiResultHtml = '';
  var activeTab = 'tokens';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseTokenValue(token, raw) {
    if (token.type === 'number') return parseFloat(raw);
    if (token.type === 'unit') {
      var num = parseFloat(raw);
      return isNaN(num) ? token.default : num;
    }
    return raw;
  }

  function aiSectionHtml() {
    return (
      '<section class="se-section se-section--ai">' +
        '<div class="se-section-head"><h3 class="se-section-title">AI Style Assistant</h3></div>' +
        '<p class="se-section-copy">Sube un logo o una imagen corporativa para inferir la identidad visual completa.</p>' +
        '<div class="se-ai-upload-row">' +
          '<button type="button" class="se-section-btn" id="styleEngineAiSelectBtn">Seleccionar imagen</button>' +
          '<button type="button" class="se-section-btn se-section-btn--primary" id="styleEngineAiAnalyzeBtn" disabled>Analizar identidad</button>' +
          '<input type="file" id="styleEngineAiFile" accept="image/png,image/jpeg,image/jpg,image/svg+xml" hidden>' +
        '</div>' +
        '<p class="se-ai-file-name" id="styleEngineAiFileName"></p>' +
        '<div id="styleEngineAiResultHost">' + aiResultHtml + '</div>' +
      '</section>'
    );
  }

  function presetsSectionHtml() {
    function chips(list, group) {
      return list.map(function (p) {
        return '<button type="button" class="se-preset-chip" data-se-preset="' + escapeHtml(p.id) + '" data-se-preset-group="' + escapeHtml(group) + '">' + escapeHtml(p.name) + '</button>';
      }).join('');
    }

    return (
      '<section class="se-section se-section--presets">' +
        '<details class="se-category"><summary class="se-category-summary"><span class="se-category-label">Presets</span></summary>' +
          '<div class="se-category-body">' +
            '<p class="se-section-copy">Tus estilos guardados están debajo del Preview. Aquí solo hay presets de referencia.</p>' +
            '<div class="se-preset-group"><div class="se-preset-label">Oficiales</div><div class="se-preset-row">' + chips(StyleEnginePresets.getOfficial(), 'official') + '</div></div>' +
            '<div class="se-preset-group"><div class="se-preset-label">Inspiración</div><div class="se-preset-row">' + chips(StyleEnginePresets.getInspiration(), 'inspiration') + '</div></div>' +
          '</div>' +
        '</details>' +
      '</section>'
    );
  }

  function historySectionHtml() {
    var log = typeof StyleEngineHistory !== 'undefined' ? StyleEngineHistory.getLog() : [];
    var items = log.slice(0, 12).map(function (entry) {
      var time = new Date(entry.at);
      return (
        '<div class="se-history-item">' +
          '<div class="se-history-label">' + escapeHtml(entry.label) + '</div>' +
          '<div class="se-history-diff"><span>' + escapeHtml(String(entry.from)) + '</span><span class="se-history-arrow">↓</span><span>' + escapeHtml(String(entry.to)) + '</span></div>' +
          '<div class="se-history-time">' + escapeHtml(time.toLocaleString()) + '</div>' +
        '</div>'
      );
    }).join('');
    return (
      '<section class="se-section se-section--history">' +
        '<details class="se-category"><summary class="se-category-summary"><span class="se-category-label">Historial</span><span class="se-category-count">' + log.length + '</span></summary>' +
          '<div class="se-category-body">' +
            '<div class="se-history-actions">' +
              '<button type="button" class="se-section-btn" id="styleEngineUndoBtn"' + (StyleEngineHistory.canUndo() ? '' : ' disabled') + '>Undo</button>' +
              '<button type="button" class="se-section-btn" id="styleEngineRedoBtn"' + (StyleEngineHistory.canRedo() ? '' : ' disabled') + '>Redo</button>' +
            '</div>' +
            '<div class="se-history-list">' + (items || '<p class="se-section-copy">Sin cambios aún.</p>') + '</div>' +
          '</div>' +
        '</details>' +
      '</section>'
    );
  }

  function colorControlHtml(token, value) {
    var swatch = /^#|^rgb/i.test(String(value)) ? value : '#111111';
    return (
      '<button type="button" class="se-color-trigger" data-se-color-token="' + escapeHtml(token.key) + '" aria-label="Editar ' + escapeHtml(token.label) + '">' +
        '<span class="se-color-swatch" style="background:' + escapeHtml(swatch) + '"></span>' +
        '<span class="se-color-value">' + escapeHtml(value) + '</span>' +
      '</button>'
    );
  }

  function controlHtml(token, value) {
    if (token.type === 'color') return colorControlHtml(token, value);
    var id = 'se-token-' + token.key;
    if (token.type === 'select') {
      var opts = (token.options || []).map(function (opt) {
        return '<option value="' + escapeHtml(opt) + '"' + (opt === value ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
      }).join('');
      return '<select class="se-token-select" id="' + id + '" data-se-token="' + escapeHtml(token.key) + '">' + opts + '</select>';
    }
    if (token.type === 'number' || token.type === 'unit') {
      return (
        '<input type="number" class="se-token-number" id="' + id + '" data-se-token="' + escapeHtml(token.key) + '"' +
          ' min="' + escapeHtml(token.min != null ? token.min : '') + '"' +
          ' max="' + escapeHtml(token.max != null ? token.max : '') + '"' +
          ' step="' + escapeHtml(token.step != null ? token.step : 'any') + '"' +
          ' value="' + escapeHtml(parseTokenValue(token, value)) + '">' +
        (token.unit ? '<span class="se-token-unit">' + escapeHtml(token.unit) + '</span>' : '')
      );
    }
    return '<input type="text" class="se-token-text" id="' + id + '" data-se-token="' + escapeHtml(token.key) + '" value="' + escapeHtml(value) + '">';
  }

  function tabsHtml() {
    return (
      '<div class="se-panel-tabs" role="tablist">' +
        '<button type="button" class="se-panel-tab' + (activeTab === 'tokens' ? ' is-active' : '') + '" data-se-panel-tab="tokens" role="tab">Tokens</button>' +
        '<button type="button" class="se-panel-tab' + (activeTab === 'coverage' ? ' is-active' : '') + '" data-se-panel-tab="coverage" role="tab">Coverage</button>' +
      '</div>'
    );
  }

  function tokensEditorHtml(rules) {
    return (
      aiSectionHtml() +
      presetsSectionHtml() +
      historySectionHtml() +
      StyleEngineTokens.getCategories().map(function (cat) {
        return categoryHtml(cat, rules);
      }).join('')
    );
  }

  function coverageEditorHtml() {
    return '<div id="styleEngineCoverageHost"></div>';
  }

  function categoryHtml(category, rules) {
    var isOpen = openCategories[category.id] === true;
    var tokensHtml = category.tokens.map(function (token) {
      var value = rules[token.key];
      var doc = StyleEngineTokens.getTokenDoc(token.key);
      return (
        '<div class="se-token-row">' +
          '<div class="se-token-meta">' +
            '<label class="se-token-label" for="se-token-' + escapeHtml(token.key) + '">' + escapeHtml(token.label) + '</label>' +
            '<p class="se-token-doc" title="' + escapeHtml(doc.usage) + '">' + escapeHtml(doc.description) + '</p>' +
          '</div>' +
          controlHtml(token, value) +
        '</div>'
      );
    }).join('');

    return (
      '<details class="se-category" data-se-category="' + escapeHtml(category.id) + '"' + (isOpen ? ' open' : '') + '>' +
        '<summary class="se-category-summary">' +
          '<span class="se-category-label">' + escapeHtml(category.label) + '</span>' +
          '<span class="se-category-count">' + category.tokens.length + '</span>' +
        '</summary>' +
        '<div class="se-category-body">' + tokensHtml + '</div>' +
      '</details>'
    );
  }

  function render() {
    var editorHost = document.getElementById(hostId);
    var previewHost = document.getElementById(previewHostId);
    if (!editorHost || !previewHost) return;

    var rules = StyleEngineStore.getDraftRules();
    editorHost.innerHTML =
      tabsHtml() +
      '<div class="se-panel-tab-body">' +
        (activeTab === 'coverage' ? coverageEditorHtml() : tokensEditorHtml(rules)) +
      '</div>';

    if (activeTab === 'coverage') {
      var covHost = document.getElementById('styleEngineCoverageHost');
      if (covHost && typeof StyleEngineCoverage !== 'undefined') {
        StyleEngineCoverage.mount(covHost);
      }
      bindTabs(editorHost);
    } else {
      StyleEnginePreview.mount(previewHost);
      bind(editorHost);
      bindTabs(editorHost);
      refreshPreview();
    }

    if (typeof StyleEngineModal !== 'undefined' && StyleEngineModal.renderSavedStylesPanel) {
      StyleEngineModal.renderSavedStylesPanel();
    }
  }

  function bindTabs(root) {
    root.querySelectorAll('[data-se-panel-tab]').forEach(function (btn) {
      btn.onclick = function () {
        activeTab = btn.getAttribute('data-se-panel-tab') || 'tokens';
        render();
      };
    });
  }

  function refreshPreview() {
    StyleEnginePreview.syncTokens();
    if (StyleEngineStore.getActiveTheme() === StyleEngineStore.ACTIVE.STYLE_ENGINE &&
        StyleEngineStore.getEngineMode() === StyleEngineStore.MODES.LIVE) {
      StyleEngineRuntime.sync();
    }
  }

  function bind(root) {
    bindAi(root);
    bindPresets(root);
    bindHistory(root);

    root.querySelectorAll('details.se-category').forEach(function (el) {
      el.addEventListener('toggle', function () {
        var id = el.getAttribute('data-se-category');
        if (id) openCategories[id] = el.open;
      });
    });

    root.querySelectorAll('[data-se-token]').forEach(function (input) {
      input.addEventListener('input', onTokenInput);
      input.addEventListener('change', onTokenInput);
    });

    root.querySelectorAll('.se-color-trigger').forEach(function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute('data-se-color-token');
        var rules = StyleEngineStore.getDraftRules();
        StyleEngineColorPicker.open(key, rules[key], {
          onPreview: function (tokenKey, previewValue) {
            var sandbox = document.getElementById('styleEnginePreviewSandbox');
            if (sandbox) sandbox.style.setProperty(StyleEngineTokens.cssVarName(tokenKey), previewValue);
          },
          onApply: function (tokenKey, value) {
            StyleEngineStore.setDraftRule(tokenKey, value);
            render();
          },
          onCancel: function () {
            refreshPreview();
          }
        });
      };
    });
  }

  function bindAi(root) {
    var fileInput = root.querySelector('#styleEngineAiFile');
    var selectBtn = root.querySelector('#styleEngineAiSelectBtn');
    var analyzeBtn = root.querySelector('#styleEngineAiAnalyzeBtn');
    var fileName = root.querySelector('#styleEngineAiFileName');
    var selectedFile = null;

    if (selectBtn && fileInput) {
      selectBtn.onclick = function () { fileInput.click(); };
      fileInput.onchange = function () {
        selectedFile = fileInput.files && fileInput.files[0];
        if (fileName) fileName.textContent = selectedFile ? selectedFile.name : '';
        if (analyzeBtn) analyzeBtn.disabled = !selectedFile;
      };
    }
    if (analyzeBtn) {
      analyzeBtn.onclick = function () {
        if (!selectedFile) return;
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analizando…';
        StyleEngineAI.analyzeFile(selectedFile).then(function (analysis) {
          aiResultHtml = StyleEngineAI.renderAnalysisResult(analysis);
          var host = document.getElementById('styleEngineAiResultHost');
          if (host) host.innerHTML = aiResultHtml;
          var applyBtn = document.getElementById('styleEngineAiApplyBtn');
          if (applyBtn) {
            applyBtn.onclick = function () {
              var scopeEl = document.querySelector('input[name="seAiScope"]:checked');
              var scope = scopeEl ? scopeEl.value : 'colors';
              var mapped = scope === 'full' ? 'full' : (scope === 'colors-surfaces' ? 'colors-surfaces' : 'colors');
              StyleEngineAI.applyScope(mapped);
              render();
            };
          }
        }).catch(function (err) {
          if (typeof showToast === 'function') showToast(err.message || 'Error al analizar');
        }).finally(function () {
          analyzeBtn.disabled = !selectedFile;
          analyzeBtn.textContent = 'Analizar identidad';
        });
      };
    }
  }

  function bindPresets(root) {
    root.querySelectorAll('[data-se-preset]').forEach(function (btn) {
      btn.onclick = function () {
        var preset = StyleEnginePresets.findById(btn.getAttribute('data-se-preset'));
        if (!preset) return;
        StyleEngineStore.setDraftRules(preset.rules, { replace: true });
        render();
        if (typeof StyleEngineModal !== 'undefined' && StyleEngineModal.renderSavedStylesPanel) {
          StyleEngineModal.renderSavedStylesPanel();
        }
      };
    });
  }

  function bindHistory(root) {
    var undo = root.querySelector('#styleEngineUndoBtn');
    var redo = root.querySelector('#styleEngineRedoBtn');
    if (undo) undo.onclick = function () { if (StyleEngineHistory.undo()) render(); };
    if (redo) redo.onclick = function () { if (StyleEngineHistory.redo()) render(); };
  }

  function onTokenInput(e) {
    var input = e.currentTarget;
    var key = input.getAttribute('data-se-token');
    var meta = StyleEngineTokens.getTokenMeta(key);
    if (!meta || meta.type === 'color') return;
    StyleEngineStore.setDraftRule(key, parseTokenValue(meta, input.value));
    refreshPreview();
    var histHost = document.querySelector('.se-section--history');
    if (histHost) {
      var section = historySectionHtml();
      var tmp = document.createElement('div');
      tmp.innerHTML = section;
      var newHist = tmp.firstChild;
      if (newHist) histHost.replaceWith(newHist);
      bindHistory(document.getElementById(hostId));
    }
  }

  function syncPreviewScope() {
    StyleEnginePreview.syncTokens();
  }

  return {
    hostId: hostId,
    previewHostId: previewHostId,
    render: render,
    syncPreviewScope: syncPreviewScope,
    refreshPreview: refreshPreview
  };
})();
