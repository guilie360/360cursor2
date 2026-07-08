VisitorDashboard.register({
  id: 'settings',
  order: 5,

  renderTeaser: function () {
    var el = VisitorDashboard.createWidgetEl('settings');
    el.innerHTML =
      '<div class="dash-widget-header">' +
        '<h2 class="dash-widget-title">Configuración</h2>' +
        '<p class="dash-widget-subtitle">Edita tu perfil, preferencias e información de la cuenta.</p>' +
      '</div>' +
      '<div class="dash-widget-actions">' +
        '<button type="button" class="btn-ghost btn-compact btn-inline" id="openSettingsBtn">Configuración</button>' +
      '</div>';
    return el;
  },

  renderPanel: function (ctx) {
    var profile = ctx.profile || {};
    var constructora = profile.constructoras || {};

    function formatDate(value) {
      return value ? new Date(value).toLocaleString('es-CO') : '—';
    }

    function field(label, name, value, type, extra) {
      type = type || 'text';
      return (
        '<label class="settings-form-field">' +
          '<span>' + VisitorDashboard.escapeHtml(label) + '</span>' +
          '<input name="' + VisitorDashboard.escapeHtml(name) + '" type="' + type + '" value="' + VisitorDashboard.escapeHtml(value == null ? '' : value) + '"' + (extra || '') + '>' +
        '</label>'
      );
    }

    var finValue = profile.interes_financiacion === null || profile.interes_financiacion === undefined
      ? ''
      : (profile.interes_financiacion ? 'si' : 'no');
    var authUser = ctx.auth && ctx.auth.user ? ctx.auth.user : null;
    var authMethod = typeof VisitorAuth.getAuthMethodLabel === 'function'
      ? VisitorAuth.getAuthMethodLabel(authUser)
      : '';
    var hasPassword = typeof VisitorAuth.hasPasswordIdentity === 'function'
      ? VisitorAuth.hasPasswordIdentity(authUser)
      : true;
    var passwordHint = hasPassword
      ? '<p class="profile-section-note">Puedes cambiar tu contraseña aquí cuando quieras.</p>'
      : '<p class="profile-section-note">Entraste con Google. Crea una contraseña aquí para poder iniciar sesión también con correo y contraseña si algún día Google no está disponible.</p>';

    return (
      '<form id="settingsForm" class="settings-form" novalidate>' +
        '<section class="profile-section">' +
          '<h3 class="profile-section-title">Perfil editable</h3>' +
          '<div class="settings-form-grid">' +
            field('Nombre', 'nombres', profile.nombres || '') +
            field('Apellido', 'apellidos', profile.apellidos || '') +
            field('Teléfono', 'telefono', profile.telefono || '', 'tel') +
            field('Ciudad', 'ciudad', profile.ciudad || '') +
            field('Presupuesto (COP)', 'presupuesto', profile.presupuesto || '', 'number', ' min="0" step="1000000"') +
            field('Tipo de vivienda deseado', 'tipo_vivienda_deseado', profile.tipo_vivienda_deseado || '') +
            '<label class="settings-form-field"><span>Interés en financiación</span>' +
              '<select name="interes_financiacion">' +
                '<option value=""' + (finValue === '' ? ' selected' : '') + '>Seleccionar</option>' +
                '<option value="si"' + (finValue === 'si' ? ' selected' : '') + '>Sí</option>' +
                '<option value="no"' + (finValue === 'no' ? ' selected' : '') + '>No</option>' +
              '</select></label>' +
          '</div>' +
        '</section>' +
        '<section class="profile-section">' +
          '<h3 class="profile-section-title">Contraseña</h3>' +
          passwordHint +
          '<div class="settings-form-grid">' +
            field('Nueva contraseña', 'new_password', '', 'password', ' minlength="8" autocomplete="new-password"') +
            field('Confirmar contraseña', 'new_password_confirm', '', 'password', ' minlength="8" autocomplete="new-password"') +
          '</div>' +
        '</section>' +
        '<div class="dash-widget-actions">' +
          '<button type="submit" class="btn-primary btn-compact btn-inline" id="settingsSaveBtn">Guardar cambios</button>' +
        '</div>' +
      '</form>' +
      '<section class="profile-section">' +
        '<h3 class="profile-section-title">Información de la cuenta</h3>' +
        '<ul class="profile-list">' +
          '<li><span>Correo</span><strong>' + VisitorDashboard.escapeHtml(profile.email || '—') + '</strong></li>' +
          '<li><span>Método de acceso</span><strong>' + VisitorDashboard.escapeHtml(authMethod || '—') + '</strong></li>' +
          '<li><span>Usuario</span><strong>' + VisitorDashboard.escapeHtml(profile.login || '—') + '</strong></li>' +
          '<li><span>Fecha de registro</span><strong>' + VisitorDashboard.escapeHtml(formatDate(profile.created_at)) + '</strong></li>' +
          '<li><span>Última actividad</span><strong>' + VisitorDashboard.escapeHtml(formatDate(profile.ultima_actividad)) + '</strong></li>' +
          '<li><span>Tipo de cuenta</span><strong>Visitante</strong></li>' +
          '<li><span>Constructora asignada</span><strong>' + VisitorDashboard.escapeHtml(constructora.nombre || '—') + '</strong></li>' +
          '<li><span>Términos aceptados</span><strong>' + VisitorDashboard.escapeHtml(formatDate(profile.terminos_aceptados_at)) + '</strong></li>' +
        '</ul>' +
      '</section>'
    );
  }
});
