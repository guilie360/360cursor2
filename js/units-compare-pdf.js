/* Exportación PDF — comparador de viviendas (brochure premium) */
(function () {
  'use strict';

  function getLogoUrl() {
    if (typeof PROJECT_DATA === 'undefined' || !PROJECT_DATA) return '';
    var config = PROJECT_DATA.proyecto_config || {};
    var constructora = PROJECT_DATA.constructoras || {};
    return config.logo_url || constructora.logo_url || '';
  }

  function formatDate() {
    try {
      return new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildTableRows(categories, units, getValue, getDiff) {
    var html = '';
    categories.forEach(function (cat) {
      html += '<tr class="section"><td colspan="4">' + esc(cat.label) + '</td></tr>';
      cat.metrics.forEach(function (metric) {
        var v0 = getValue(units[0], metric);
        var v1 = getValue(units[1], metric);
        var diff = getDiff(units, metric);
        html +=
          '<tr>' +
            '<td class="metric">' + esc(metric.label) + '</td>' +
            '<td class="val">' + esc(v0) + '</td>' +
            '<td class="diff">' + esc(diff) + '</td>' +
            '<td class="val">' + esc(v1) + '</td>' +
          '</tr>';
      });
    });
    return html;
  }

  function buildPdfHtml(payload) {
    var logo = getLogoUrl();
    var logoBlock = logo
      ? '<img class="logo" src="' + esc(logo) + '" alt="">'
      : '<div class="logo-text">' + esc(payload.projectName) + '</div>';

    return (
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Comparación — ' + esc(payload.projectName) + '</title>' +
      '<style>' +
        '@page { margin: 18mm 16mm; }' +
        '* { box-sizing: border-box; }' +
        'body { font-family: "Segoe UI", system-ui, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.5; margin: 0; }' +
        '.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ddd; padding-bottom: 14px; margin-bottom: 20px; }' +
        '.logo { max-height: 48px; max-width: 160px; object-fit: contain; }' +
        '.logo-text { font-size: 14pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }' +
        '.meta { text-align: right; font-size: 9pt; color: #666; }' +
        '.meta strong { display: block; color: #1a1a1a; font-size: 10pt; }' +
        'h1 { font-size: 16pt; font-weight: 600; margin: 0 0 6px; letter-spacing: 0.02em; }' +
        '.subtitle { color: #555; font-size: 10pt; margin: 0 0 22px; }' +
        '.units { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }' +
        '.unit-card { border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px; }' +
        '.unit-tag { font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; color: #888; }' +
        '.unit-name { font-size: 11pt; font-weight: 600; margin: 4px 0 6px; }' +
        '.unit-price { font-size: 13pt; font-weight: 700; margin: 0 0 8px; }' +
        '.unit-specs { font-size: 9pt; color: #555; }' +
        '.summary { background: #f7f7f7; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px; }' +
        '.summary h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.14em; margin: 0 0 8px; color: #666; }' +
        '.summary p { margin: 0; font-size: 10.5pt; }' +
        'table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }' +
        'th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #888; border-bottom: 1px solid #ddd; padding: 8px 6px; }' +
        'th:not(:first-child) { text-align: center; }' +
        'td { padding: 7px 6px; border-bottom: 1px solid #eee; vertical-align: top; }' +
        'td.val, td.diff { text-align: center; }' +
        'td.diff { color: #444; font-weight: 500; font-size: 9pt; }' +
        'tr.section td { background: #fafafa; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.12em; color: #666; padding: 10px 6px; border-bottom: 1px solid #e0e0e0; }' +
        '.foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 9pt; color: #666; }' +
        '.foot strong { color: #1a1a1a; }' +
      '</style></head><body>' +
        '<div class="head">' +
          '<div>' + logoBlock + '</div>' +
          '<div class="meta">' +
            '<strong>' + esc(payload.constructoraName) + '</strong>' +
            '<span>' + esc(formatDate()) + '</span>' +
          '</div>' +
        '</div>' +
        '<h1>Comparación de viviendas</h1>' +
        '<p class="subtitle">' + esc(payload.projectName) + '</p>' +
        '<div class="units">' +
          payload.units.map(function (u) {
            return (
              '<div class="unit-card">' +
                '<div class="unit-tag">' + esc(u.tag) + '</div>' +
                '<div class="unit-name">' + esc(u.name) + '</div>' +
                '<div class="unit-price">' + esc(u.price) + '</div>' +
                '<div class="unit-specs">' + esc(u.area) + ' · ' + esc(u.rooms) + ' hab. · ' + esc(u.baths) + ' baños</div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
        '<div class="summary">' +
          '<h2>Resumen</h2>' +
          '<p>' + payload.summary + '</p>' +
        '</div>' +
        '<table>' +
          '<thead><tr>' +
            '<th>Característica</th>' +
            '<th>' + esc(payload.units[0].tag) + '</th>' +
            '<th>Diferencia</th>' +
            '<th>' + esc(payload.units[1].tag) + '</th>' +
          '</tr></thead>' +
          '<tbody>' + payload.tableRows + '</tbody>' +
        '</table>' +
        '<div class="foot">' +
          '<strong>Contacto</strong><br>' +
          (payload.phone ? esc(payload.phone) + '<br>' : '') +
          (payload.email ? esc(payload.email) + '<br>' : '') +
          (payload.address ? esc(payload.address) : '') +
          '<br><span style="margin-top:8px;display:inline-block;">Generado con BOXIES</span>' +
        '</div>' +
      '</body></html>'
    );
  }

  window.UnitsComparePdf = {
    download: function (options) {
      if (!options || !options.units || options.units.length < 2) return;
      var html = buildPdfHtml({
        projectName: (typeof CONFIG !== 'undefined' && CONFIG.projectName) || '',
        constructoraName: (typeof CONFIG !== 'undefined' && CONFIG.constructoraName) || '',
        phone: (typeof CONFIG !== 'undefined' && CONFIG.phoneDisplay) || '',
        email: (typeof CONFIG !== 'undefined' && CONFIG.email) || '',
        address: (typeof CONFIG !== 'undefined' && CONFIG.salesAddress) || '',
        units: options.units,
        summary: options.summary || '',
        tableRows: options.tableRows || ''
      });

      var win = window.open('', '_blank');
      if (!win) {
        if (typeof showToast === 'function') showToast('Permite ventanas emergentes para descargar el PDF');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(function () {
        win.print();
      }, 400);
      if (typeof showToast === 'function') showToast('Usa «Guardar como PDF» en el diálogo de impresión');
    },

    buildTableRows: buildTableRows
  };
})();
