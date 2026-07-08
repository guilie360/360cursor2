VisitorDashboard.register({
  id: 'professional',
  order: 4,
  render: function () {
    var el = VisitorDashboard.createWidgetEl('professional', 'dash-widget--highlight');
    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">¿Quieres una cuenta profesional?</h2>' +
        '<p class="dash-widget-subtitle">Si trabajas en el sector inmobiliario, puedes solicitar acceso profesional para operar dentro de 360 PREVENTA.</p>' +
      '</div>' +
      '<ul class="dash-role-list">' +
        '<li><strong>Constructora</strong><span>Publica proyectos, administra inventario, contenido 360° y leads desde el panel administrativo.</span></li>' +
        '<li><strong>Asesor</strong><span>Atiende visitantes, agenda recorridos, comparte cotizaciones y da seguimiento comercial.</span></li>' +
      '</ul>' +
      '<div class="dash-widget-actions">' +
        '<button type="button" class="btn-primary btn-compact btn-inline" id="professionalAccessBtn">Solicitar acceso</button>' +
        '<p class="dash-widget-note">Tu solicitud será revisada por el equipo de la constructora. El flujo de aprobación estará disponible próximamente.</p>' +
      '</div>';
    return el;
  }
});
