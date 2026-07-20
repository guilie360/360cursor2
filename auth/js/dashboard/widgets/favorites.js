VisitorDashboard.register({
  id: 'favorites',
  order: 1,
  render: function (ctx) {
    var favorites = ctx.favorites || [];
    var projects = ctx.projects || [];
    var exploreHref = ctx.exploreHref || '/demo';
    var el = VisitorDashboard.createWidgetEl('favorites');

    function unitRow(row) {
      var v = row.viviendas || {};
      var proyecto = v.proyectos || {};
      var openHref = exploreHref.split('?')[0] + '?proyecto=' + encodeURIComponent(proyecto.slug || '') + '&vivienda=' + encodeURIComponent(row.vivienda_id);
      return (
        '<div class="dash-favorite-item" data-vivienda-id="' + VisitorDashboard.escapeHtml(row.vivienda_id) + '">' +
          '<div class="dash-favorite-item-main">' +
            '<strong>' + VisitorDashboard.escapeHtml(v.nombre || v.codigo || 'Vivienda') + '</strong>' +
            '<span>' + VisitorDashboard.escapeHtml(proyecto.nombre || 'Proyecto') + ' · ' + (v.area_m2 || '—') + ' m²</span>' +
          '</div>' +
          '<div class="dash-favorite-item-actions">' +
            '<a class="btn-ghost btn-compact" href="' + VisitorDashboard.escapeHtml(openHref) + '">Abrir</a>' +
            '<button type="button" class="btn-ghost btn-compact dash-fav-remove" data-vivienda-id="' + VisitorDashboard.escapeHtml(row.vivienda_id) + '">Quitar</button>' +
            '<button type="button" class="btn-ghost btn-compact dash-fav-compare" data-vivienda-id="' + VisitorDashboard.escapeHtml(row.vivienda_id) + '">Comparar</button>' +
          '</div>' +
        '</div>'
      );
    }

    var projectsHtml = projects.length
      ? projects.map(function (p) {
          var href = exploreHref.split('?')[0] + '?proyecto=' + encodeURIComponent(p.slug || '');
          return (
            '<a class="dash-project-chip" href="' + VisitorDashboard.escapeHtml(href) + '">' +
              '<strong>' + VisitorDashboard.escapeHtml(p.nombre) + '</strong>' +
              '<span>' + p.unitsCount + ' unidad' + (p.unitsCount === 1 ? '' : 'es') + ' guardada' + (p.unitsCount === 1 ? '' : 's') + '</span>' +
            '</a>'
          );
        }).join('')
      : '<div class="admin-empty-state dash-empty-state"><div class="admin-empty-copy">Los proyectos aparecerán cuando guardes viviendas favoritas.</div></div>';

    var unitsHtml = favorites.length
      ? favorites.map(unitRow).join('')
      : '<div class="admin-empty-state dash-empty-state"><div class="admin-empty-title">Aún no tienes favoritos</div><div class="admin-empty-copy">Explora viviendas y marca las que te interesen con el corazón.</div></div>';

    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Favoritos</h2>' +
        '<p class="dash-widget-subtitle">Tus proyectos y unidades guardadas.</p>' +
      '</div>' +
      '<div class="dash-favorites-grid">' +
        '<div class="dash-subcard"><h3 class="dash-subcard-title">Proyectos favoritos</h3><div class="dash-project-list">' + projectsHtml + '</div></div>' +
        '<div class="dash-subcard"><h3 class="dash-subcard-title">Unidades favoritas</h3><div class="dash-favorite-list">' + unitsHtml + '</div></div>' +
      '</div>' +
      (favorites.length ? '' : '<div class="dash-widget-actions"><a class="btn-primary btn-compact btn-inline" href="' + VisitorDashboard.escapeHtml(exploreHref) + '">Explorar proyectos</a></div>');

    return el;
  }
});
