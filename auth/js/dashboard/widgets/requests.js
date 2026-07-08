VisitorDashboard.register({
  id: 'requests',
  order: 5,
  render: function () {
    var items = [
      { title: 'Solicitudes', copy: 'Peticiones de información y seguimiento con constructoras.' },
      { title: 'Cotizaciones', copy: 'Propuestas y estimaciones recibidas por tus unidades de interés.' },
      { title: 'Visitas agendadas', copy: 'Showroom, sala de ventas y recorridos virtuales confirmados.' },
      { title: 'Conversaciones', copy: 'Mensajes con asesores y equipos comerciales.' }
    ];

    var cards = items.map(function (item) {
      return (
        '<article class="dash-activity-card">' +
          '<h3 class="dash-activity-card-title">' + VisitorDashboard.escapeHtml(item.title) + '</h3>' +
          '<p class="dash-activity-card-copy">' + VisitorDashboard.escapeHtml(item.copy) + '</p>' +
          '<span class="badge-muted">Próximamente</span>' +
        '</article>'
      );
    }).join('');

    var el = VisitorDashboard.createWidgetEl('requests');
    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Solicitudes y actividad</h2>' +
        '<p class="dash-widget-subtitle">Un solo lugar para dar seguimiento a tus gestiones con el proyecto.</p>' +
      '</div>' +
      '<div class="dash-activity-grid">' + cards + '</div>';
    return el;
  }
});
