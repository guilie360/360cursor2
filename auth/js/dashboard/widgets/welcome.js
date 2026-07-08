VisitorDashboard.register({
  id: 'welcome',
  order: 1,
  render: function (ctx) {
    var profile = ctx.profile || {};
    var firstName = profile.nombres || profile.nombre || 'visitante';
    var el = VisitorDashboard.createWidgetEl('welcome', 'dash-widget--welcome');
    el.innerHTML =
      '<div class="dash-welcome">' +
        '<h1 class="dash-welcome-title">Hola, ' + VisitorDashboard.escapeHtml(firstName) + '</h1>' +
        '<p class="dash-welcome-subtitle">Continúa explorando proyectos y administra tus favoritos.</p>' +
      '</div>';
    return el;
  }
});
