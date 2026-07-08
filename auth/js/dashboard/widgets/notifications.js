VisitorDashboard.register({
  id: 'notifications',
  order: 3,
  render: function () {
    var samples = [
      { title: 'Nuevo apartamento disponible', copy: 'Una unidad que coincide con tu búsqueda acaba de publicarse.' },
      { title: 'Cambio de precio', copy: 'El precio de una vivienda favorita fue actualizado.' },
      { title: 'Avance de obra', copy: 'Nueva etapa de construcción reportada por la constructora.' },
      { title: 'Nuevo recorrido 360°', copy: 'Se habilitó un recorrido virtual adicional en el proyecto.' },
      { title: 'Promoción', copy: 'Beneficios especiales por tiempo limitado en unidades seleccionadas.' }
    ];

    var cards = samples.map(function (item) {
      return (
        '<article class="dash-notification-card">' +
          '<h3 class="dash-activity-card-title">' + VisitorDashboard.escapeHtml(item.title) + '</h3>' +
          '<p class="dash-activity-card-copy">' + VisitorDashboard.escapeHtml(item.copy) + '</p>' +
          '<span class="badge-muted">Próximamente</span>' +
        '</article>'
      );
    }).join('');

    var el = VisitorDashboard.createWidgetEl('notifications');
    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Notificaciones</h2>' +
        '<p class="dash-widget-subtitle">Novedades de constructoras sobre proyectos y unidades que sigues.</p>' +
      '</div>' +
      '<div class="dash-notification-grid">' + cards + '</div>' +
      '<p class="dash-widget-note">La entrega automática de notificaciones se activará en una próxima versión.</p>';
    return el;
  }
});
