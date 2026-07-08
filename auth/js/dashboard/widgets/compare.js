VisitorDashboard.register({
  id: 'compare',
  order: 2,
  render: function (ctx) {
    var favorites = ctx.favorites || [];
    var count = favorites.length;
    var el = VisitorDashboard.createWidgetEl('compare');

    if (count < 2) {
      el.innerHTML =
        '<div class="dash-widget-header">' +
          '<h2 class="dash-widget-title">Comparador</h2>' +
          '<p class="dash-widget-subtitle">Analiza viviendas favoritas lado a lado.</p>' +
        '</div>' +
        '<div class="dash-compare-placeholder">' +
          '<div class="dash-compare-icon" aria-hidden="true">⇄</div>' +
          '<p class="placeholder-copy">Necesitas al menos 2 unidades favoritas para comparar. Guarda más viviendas desde el showroom.</p>' +
          '<span class="badge-muted">' + count + ' de 2 mínimo</span>' +
        '</div>';
      return el;
    }

    var headers = ['Vivienda', 'Proyecto', 'Área', 'Habitaciones', 'Baños', 'Precio'];
    var rows = favorites.map(function (row) {
      var v = row.viviendas || {};
      var proyecto = v.proyectos || {};
      return [
        v.nombre || v.codigo || '—',
        proyecto.nombre || '—',
        (v.area_m2 || '—') + ' m²',
        v.habitaciones || '—',
        v.banos || '—',
        v.precio ? formatCOP(v.precio) : '—'
      ];
    });

    var tableHead = headers.map(function (h) {
      return '<th>' + VisitorDashboard.escapeHtml(h) + '</th>';
    }).join('');

    var tableBody = rows.map(function (cells) {
      return '<tr>' + cells.map(function (cell) {
        return '<td>' + VisitorDashboard.escapeHtml(cell) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Comparador</h2>' +
        '<p class="dash-widget-subtitle">Comparación de ' + count + ' unidades favoritas.</p>' +
      '</div>' +
      '<div class="dash-compare-table-wrap">' +
        '<table class="dash-compare-table"><thead><tr>' + tableHead + '</tr></thead><tbody>' + tableBody + '</tbody></table>' +
      '</div>';

    return el;
  }
});
