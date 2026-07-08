(function () {
  var loadingBlock = document.getElementById('loadingBlock');
  var dashboardView = document.getElementById('dashboardView');
  var settingsView = document.getElementById('settingsView');
  var dashboardSections = document.getElementById('dashboardSections');
  var settingsContent = document.getElementById('settingsContent');
  var userChip = document.getElementById('userChip');
  var formMessage = document.getElementById('formMessage');
  var dashboardContext = null;
  var isSaving = false;

  document.getElementById('exploreBtn').addEventListener('click', function () {
    window.location.href = AuthRedirects.publicHome();
  });

  document.getElementById('logoutBtn').addEventListener('click', async function () {
    var btn = document.getElementById('logoutBtn');
    btn.disabled = true;
    try {
      await VisitorAuth.logout();
      window.location.replace(AuthRedirects.ingresar());
    } catch (err) {
      btn.disabled = false;
      AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
    }
  });

  document.getElementById('settingsBackBtn').addEventListener('click', function () {
    showDashboardView();
  });

  PlatformAuth.createClient({ remember: AuthStoragePrefs.getRememberMe() });

  function showDashboardView() {
    settingsView.hidden = true;
    dashboardView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showSettingsView() {
    var settingsWidget = VisitorDashboard.getWidget('settings');
    if (!settingsWidget || !dashboardContext) return;
    settingsContent.innerHTML = settingsWidget.renderPanel(dashboardContext);
    bindSettingsForm();
    dashboardView.hidden = true;
    settingsView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function reloadFavorites(profile) {
    var favorites = await FavoritosApi.listByVisitante(profile.id);
    dashboardContext.favorites = favorites;
    dashboardContext.projects = FavoritosApi.groupProjects(favorites);
    return favorites;
  }

  async function refreshDashboardContent() {
    await reloadFavorites(dashboardContext.profile);
    VisitorDashboard.renderHome(dashboardSections, dashboardContext);
    bindDashboardActions();
  }

  function bindSettingsForm() {
    var form = document.getElementById('settingsForm');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (isSaving || !dashboardContext) return;

      var profile = dashboardContext.profile;
      var user = VisitorAuth.getUser();
      var fin = form.interes_financiacion.value;
      var patch = {
        nombres: form.nombres.value.trim(),
        apellidos: form.apellidos.value.trim(),
        telefono: form.telefono.value.trim() || null,
        ciudad: form.ciudad.value.trim() || null,
        presupuesto: form.presupuesto.value ? Number(form.presupuesto.value) : null,
        tipo_vivienda_deseado: form.tipo_vivienda_deseado.value.trim() || null,
        interes_financiacion: fin === '' ? null : fin === 'si'
      };

      var newPassword = form.new_password.value;
      var confirmPassword = form.new_password_confirm.value;

      if (!patch.nombres || !patch.apellidos) {
        AuthPage.setMessage(formMessage, 'Nombre y apellido son obligatorios.', 'error');
        return;
      }
      if (newPassword || confirmPassword) {
        if (newPassword.length < 8) {
          AuthPage.setMessage(formMessage, 'La contraseña debe tener al menos 8 caracteres.', 'error');
          return;
        }
        if (newPassword !== confirmPassword) {
          AuthPage.setMessage(formMessage, 'Las contraseñas no coinciden.', 'error');
          return;
        }
      }

      isSaving = true;
      AuthPage.setMessage(formMessage, 'Guardando cambios...', '');
      try {
        var updated = await VisitantesApi.updateProfile(profile.id, user.id, patch);
        updated.email = user.email;
        updated = VisitantesApi.enrichProfile(updated, user);
        dashboardContext.profile = updated;
        userChip.innerHTML = '<strong>' + VisitorDashboard.escapeHtml(updated.nombres || updated.login || 'Visitante') + '</strong>';
        if (newPassword) {
          await VisitorAuth.updatePassword(newPassword);
          form.new_password.value = '';
          form.new_password_confirm.value = '';
        }
        AuthPage.setMessage(formMessage, 'Perfil actualizado correctamente.', 'success');
        settingsContent.innerHTML = VisitorDashboard.getWidget('settings').renderPanel(dashboardContext);
        bindSettingsForm();
      } catch (err) {
        AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
      } finally {
        isSaving = false;
      }
    });
  }

  function bindDashboardActions() {
    var openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', showSettingsView);
    }

    dashboardSections.querySelectorAll('.dash-fav-remove').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var viviendaId = btn.getAttribute('data-vivienda-id');
        if (!viviendaId || !dashboardContext) return;
        btn.disabled = true;
        try {
          await FavoritosApi.remove(dashboardContext.profile.id, viviendaId);
          await refreshDashboardContent();
          AuthPage.setMessage(formMessage, 'Favorito eliminado.', 'success');
        } catch (err) {
          AuthPage.setMessage(formMessage, AuthErrors.translate(err), 'error');
          btn.disabled = false;
        }
      });
    });

    dashboardSections.querySelectorAll('.dash-fav-compare').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var compareWidget = document.getElementById('dashWidget-compare');
        if (compareWidget) compareWidget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  async function renderDashboard(auth) {
    var profile = auth.profile;
    if (typeof VisitorPersonalization !== 'undefined') {
      VisitorPersonalization.loadForVisitor(profile);
    }
    var displayName = typeof VisitorPersonalization !== 'undefined'
      ? VisitorPersonalization.getDisplayName()
      : (profile.nombres || profile.login || profile.nombre || 'Visitante');
    userChip.innerHTML = '<strong>' + VisitorDashboard.escapeHtml(displayName) + '</strong>';

    dashboardContext = {
      profile: profile,
      auth: auth,
      exploreHref: AuthRedirects.publicHome(),
      favorites: [],
      projects: []
    };

    await reloadFavorites(profile);
    VisitorDashboard.renderHome(dashboardSections, dashboardContext);
    bindDashboardActions();

    loadingBlock.style.display = 'none';
    dashboardView.hidden = false;
  }

  VisitorAuth.requireSession().then(function (auth) {
    if (!auth) return;
    if (!VisitorAuth.isEmailConfirmed(auth.user)) {
      window.location.replace(AuthRedirects.withQueryParam(AuthRedirects.publicHome(), 'openVerify', '1'));
      return;
    }
    renderDashboard(auth);
  });
})();
