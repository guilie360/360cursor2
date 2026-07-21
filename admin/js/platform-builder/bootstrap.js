/* Platform admin builder boot — instrumented restore (Administrar → builder) */
(function () {
  var FILE = 'admin/js/platform-builder/bootstrap.js';

  function logStep(n, msg, detail) {
    if (detail !== undefined) {
      console.log('[builder] ' + n + ' ' + msg, detail);
    } else {
      console.log('[builder] ' + n + ' ' + msg);
    }
  }

  function ensureVisible() {
    try {
      document.documentElement.classList.add('theme-ready');
      if (document.body) {
        document.body.style.visibility = 'visible';
      }
    } catch (e) {}
  }

  function showFatalError(fnName, err) {
    ensureVisible();
    console.error('[builder] FATAL', FILE, fnName, err);
    var root = document.getElementById('builderRoot') || document.body;
    if (!root) return;
    var message = (err && err.message) ? err.message : String(err || 'Error desconocido');
    var stack = (err && err.stack) ? String(err.stack) : '';
    root.innerHTML =
      '<div class="builder-access-denied" style="visibility:visible;padding:32px;max-width:640px;margin:48px auto;color:#fff;font-family:system-ui,sans-serif">' +
        '<h2 style="margin:0 0 12px;font-size:1.25rem">Error al cargar el builder</h2>' +
        '<p style="opacity:0.85;line-height:1.5;margin:0 0 8px"><strong>Archivo:</strong> ' + FILE + '</p>' +
        '<p style="opacity:0.85;line-height:1.5;margin:0 0 8px"><strong>Función:</strong> ' + String(fnName || '?') + '</p>' +
        '<p style="opacity:0.85;line-height:1.5;margin:0 0 16px"><strong>Mensaje:</strong> ' +
          String(message).replace(/</g, '&lt;') + '</p>' +
        (stack
          ? '<pre style="white-space:pre-wrap;font-size:11px;opacity:0.65;background:#111;padding:12px;border-radius:8px;overflow:auto">' +
            stack.replace(/</g, '&lt;') + '</pre>'
          : '') +
        '<p style="margin-top:20px"><a href="javascript:history.back()" style="color:#fff">Volver</a></p>' +
      '</div>';
  }

  /**
   * AuthBootstrap.restoreUiState can redirect to OAuth returnPath (e.g. /demo3).
   * Clear that before boot so Administrar stays on the builder.
   */
  function clearHostileOAuthReturnState() {
    if (typeof OAuthApi === 'undefined') return;
    try {
      var peek = typeof OAuthApi.peekReturnPath === 'function' ? OAuthApi.peekReturnPath() : null;
      if (!peek) return;
      var path = String(peek);
      if (/\/admin(\/|$)/i.test(path) || /ai-project-builder/i.test(path) || /\/admin2/i.test(path)) {
        return;
      }
      console.warn('[builder] clearing OAuth returnPath that would leave builder:', path);
      if (typeof OAuthApi.clearReturnState === 'function') OAuthApi.clearReturnState();
    } catch (e) {
      console.warn('[builder] clearHostileOAuthReturnState', e);
    }
  }

  function getProyectoSlug() {
    try {
      return new URLSearchParams(window.location.search).get('proyecto') || null;
    } catch (e) {
      return null;
    }
  }

  async function resolveAdminProfile() {
    if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.refresh === 'function') {
      await VisitorSession.refresh();
    }

    var profile = typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
    var isAdminFn = function (p) {
      if (!p || typeof PlatformRoles === 'undefined') return false;
      if (typeof PlatformRoles.isPlatformAdmin === 'function') return PlatformRoles.isPlatformAdmin(p);
      return PlatformRoles.isAdmin(p);
    };

    if (profile && isAdminFn(profile)) {
      return profile;
    }

    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
    if (!user || !user.id || typeof ProfilesApi === 'undefined') {
      return profile;
    }

    var platformProfile = await ProfilesApi.fetchById(user.id);
    if (!platformProfile || !isAdminFn(platformProfile)) {
      return profile;
    }

    if (profile) {
      profile.platformProfile = platformProfile;
      profile.rol = platformProfile.rol;
      profile.permisos = platformProfile.permisos;
      return profile;
    }

    if (typeof VisitantesApi !== 'undefined') {
      return VisitantesApi.buildAuthProfile(user, null, platformProfile);
    }
    return platformProfile;
  }

  async function boot() {
    ensureVisible();
    logStep(2, 'DOM listo');

    var slug = getProyectoSlug();
    logStep(3, 'Proyecto recibido', slug || '(sin ?proyecto=)');

    clearHostileOAuthReturnState();

    if (typeof PlatformAuth === 'undefined') {
      throw new Error('PlatformAuth no está definido');
    }
    PlatformAuth.createClient({
      remember: typeof AuthStoragePrefs !== 'undefined' ? AuthStoragePrefs.getRememberMe() : true
    });
    logStep(4, 'PlatformAuth iniciado');

    /* Prefer direct session restore — avoid AuthBootstrap redirect/hang on this page */
    var session = null;
    if (typeof VisitorAuth !== 'undefined') {
      session = await VisitorAuth.getSession();
    }
    var user = typeof VisitorAuth !== 'undefined' ? VisitorAuth.getUser() : null;
    logStep(5, 'Sesión encontrada', {
      hasSession: !!session,
      userId: user && user.id,
      email: user && user.email
    });

    if (!session || !user) {
      throw new Error(
        'No hay sesión de showroom. Vuelve al proyecto, inicia sesión como admin y pulsa Administrar de nuevo.'
      );
    }

    var profile = await resolveAdminProfile();
    logStep(6, 'Perfil cargado', profile
      ? {
          id: profile.id,
          rol: profile.rol || (profile.platformProfile && profile.platformProfile.rol),
          nombre: profile.nombre_visible || profile.nombre
        }
      : null);

    var ok =
      profile &&
      typeof PlatformRoles !== 'undefined' &&
      (typeof PlatformRoles.isPlatformAdmin === 'function'
        ? PlatformRoles.isPlatformAdmin(profile)
        : PlatformRoles.isAdmin(profile));

    logStep(7, 'Rol validado', {
      ok: !!ok,
      role: typeof PlatformRoles !== 'undefined' ? PlatformRoles.getRole(profile) : null
    });

    if (!ok) {
      throw new Error(
        'El usuario autenticado no tiene rol admin en profiles. Rol actual: ' +
          (typeof PlatformRoles !== 'undefined' ? PlatformRoles.getRole(profile) : '?')
      );
    }

    /* Sync VisitorSession so AiProjectBuilderView.canAccessBuilder() sees admin rol */
    if (typeof VisitorSession !== 'undefined' && typeof VisitorSession.syncFromAuth === 'function') {
      await VisitorSession.syncFromAuth({
        session: session,
        user: user,
        profile: profile
      });
    }

    if (typeof ThemeSystem !== 'undefined') {
      try {
        if (typeof HallDesignSystem !== 'undefined' && typeof HallDesignSystem.paint === 'function') {
          HallDesignSystem.paint({ persist: false });
        } else if (typeof ThemeSystem.apply === 'function' && typeof PROJECT_DEFAULT_THEME_FALLBACK !== 'undefined') {
          ThemeSystem.apply('custom', false, PROJECT_DEFAULT_THEME_FALLBACK);
        }
        logStep(8, 'ThemeSystem iniciado');
      } catch (themeErr) {
        console.warn('[builder] ThemeSystem paint failed (non-fatal)', themeErr);
        logStep(8, 'ThemeSystem iniciado (con advertencia)');
      }
    } else {
      logStep(8, 'ThemeSystem iniciado (ausente — omitido)');
    }

    ensureVisible();
    if (typeof HallDesignSystem !== 'undefined') {
      logStep(9, 'HallDesignSystem iniciado');
    } else {
      logStep(9, 'HallDesignSystem iniciado (ausente — omitido)');
    }

    if (typeof PlatformBuilderBridge === 'undefined') {
      throw new Error('PlatformBuilderBridge no está definido');
    }
    await PlatformBuilderBridge.init();

    var root = document.getElementById('builderRoot');
    if (!root) {
      throw new Error('#builderRoot no existe en el DOM');
    }
    if (typeof AiProjectBuilderView === 'undefined' || typeof AiProjectBuilderView.render !== 'function') {
      throw new Error('AiProjectBuilderView.render no está disponible');
    }

    await AiProjectBuilderView.render(root);
    logStep(10, 'Builder renderizado');
  }

  logStep(1, 'HTML cargado');

  function start() {
    ensureVisible();
    boot().catch(function (err) {
      showFatalError('boot', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.addEventListener('error', function (ev) {
    if (ev && ev.error) {
      showFatalError('window.error', ev.error);
    }
  });

  window.addEventListener('unhandledrejection', function (ev) {
    showFatalError('unhandledrejection', ev.reason || ev);
  });
})();
