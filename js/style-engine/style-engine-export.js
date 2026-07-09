/* Style Engine — Export / Import de temas JSON */
var StyleEngineExport = (function () {
  function buildThemePackage(name, rules, meta) {
    return {
      schema: 'boxies-style-engine',
      version: StyleEngineTokens.VERSION,
      name: name || 'Custom Theme',
      exportedAt: new Date().toISOString(),
      meta: meta || {},
      rules: StyleEngineTokens.normalizeRules(rules)
    };
  }

  function exportJson(name) {
    var pkg = buildThemePackage(name, StyleEngineStore.getDraftRules(), {
      mode: StyleEngineStore.getDraftMode()
    });
    var blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (name || 'boxies-theme').replace(/[^\w\-]+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseImportedJson(text) {
    var data = JSON.parse(text);
    if (!data || !data.rules) throw new Error('JSON inválido: falta rules');
    if (data.schema && data.schema !== 'boxies-style-engine') {
      throw new Error('Formato no reconocido');
    }
    return {
      name: data.name || 'Imported Theme',
      rules: StyleEngineTokens.normalizeRules(data.rules),
      meta: data.meta || {}
    };
  }

  function importFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(parseImportedJson(reader.result));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo')); };
      reader.readAsText(file);
    });
  }

  return {
    buildThemePackage: buildThemePackage,
    exportJson: exportJson,
    parseImportedJson: parseImportedJson,
    importFromFile: importFromFile
  };
})();
