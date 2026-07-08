VisitorDashboard.register({
  id: 'recommendations',
  order: 4,
  render: function () {
    var el = VisitorDashboard.createWidgetEl('recommendations');
    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Recomendaciones para ti</h2>' +
        '<p class="dash-widget-subtitle">Sugerencias personalizadas según tus favoritos y preferencias de búsqueda.</p>' +
      '</div>' +
      '<div class="dash-recommendations-placeholder">' +
        '<p class="placeholder-copy">Pronto verás proyectos y unidades recomendados con base en lo que guardas y lo que nos cuentes sobre tu búsqueda.</p>' +
        '<span class="badge-muted">Reservado</span>' +
      '</div>';
    return el;
  }
});
