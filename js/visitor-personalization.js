/* Visitor identity & appearance prefs — local + Supabase display name */
var VisitorPersonalization = (function () {
  var LEGACY_COLORS = {
    black:  '#111111',
    gray:   '#6b7280',
    blue:   '#2563eb',
    green:  '#16a34a',
    purple: '#7c3aed',
    yellow: '#ca8a04',
    red:    '#dc2626'
  };

  function prefsKey(visitorId) {
    return 'guilie_visitor_prefs_' + String(visitorId || 'anon');
  }

  function readPrefs(visitorId) {
    return migratePrefs(JSON.parse(localStorage.getItem(prefsKey(visitorId)) || '{}') || {});
  }

  function migratePrefs(prefs) {
    if (prefs.avatarPhoto && !prefs.avatarImageUrl) {
      prefs.avatarImageUrl = prefs.avatarPhoto;
      prefs.avatarColorMode = 'image';
    }
    if (!prefs.avatarColorMode) {
      if (prefs.avatarImageUrl) {
        prefs.avatarColorMode = 'image';
      } else if (prefs.avatarCustomColor) {
        prefs.avatarColorMode = 'custom';
      } else if (prefs.avatarColor && LEGACY_COLORS[prefs.avatarColor]) {
        prefs.avatarColorMode = 'custom';
        prefs.avatarCustomColor = LEGACY_COLORS[prefs.avatarColor];
      } else {
        prefs.avatarColorMode = 'auto';
      }
    }
    delete prefs.avatarPhoto;
    delete prefs.avatarColor;
    return prefs;
  }

  function writePrefs(visitorId, prefs) {
    try {
      localStorage.setItem(prefsKey(visitorId), JSON.stringify(prefs));
    } catch (e) {}
  }

  var boundProfile = null;

  function getProfile() {
    if (boundProfile) return boundProfile;
    return typeof VisitorSession !== 'undefined' ? VisitorSession.getProfile() : null;
  }

  function getPrefs() {
    var profile = getProfile();
    if (!profile) return {};
    return readPrefs(profile.id);
  }

  function getDisplayName() {
    var profile = getProfile();
    if (!profile) return '';
    var prefs = readPrefs(profile.id);
    if (prefs.displayName) return prefs.displayName;
    if (profile.nombre_visible) return profile.nombre_visible;
    if (profile.nombres) return profile.nombres;
    if (profile.nombre) return profile.nombre;
    if (profile.login) return profile.login;
    if (profile.email) return profile.email.split('@')[0];
    return 'Visitante';
  }

  function getUsername() {
    var profile = getProfile();
    return profile && profile.login ? profile.login : '';
  }

  function getEmail() {
    if (typeof VisitorAuth !== 'undefined' && typeof VisitorAuth.getUser === 'function') {
      var user = VisitorAuth.getUser();
      if (user && user.email) return user.email;
    }
    var profile = getProfile();
    return profile && profile.email ? profile.email : '';
  }

  function getAvatarColorMode() {
    return getPrefs().avatarColorMode || 'auto';
  }

  function getAvatarCustomColor() {
    return getPrefs().avatarCustomColor || '#8f1d1d';
  }

  function getAvatarImageUrl() {
    return getPrefs().avatarImageUrl || '';
  }

  function getAvatarColor() {
    var prefs = getPrefs();
    if (prefs.avatarColorMode === 'image' && prefs.avatarImageUrl) {
      return null;
    }
    if (prefs.avatarColorMode === 'custom' && prefs.avatarCustomColor) {
      return prefs.avatarCustomColor;
    }
    if (typeof ThemeSystem !== 'undefined') {
      return ThemeSystem.getAccent();
    }
    return '#8f1d1d';
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function renderAvatarHtml(sizeClass) {
    var prefs = getPrefs();
    var cls = 'menu-profile-avatar' + (sizeClass ? ' ' + sizeClass : '');
    if (prefs.avatarColorMode === 'image' && prefs.avatarImageUrl) {
      return '<div class="' + cls + ' menu-profile-avatar-image" aria-hidden="true">' +
        '<img src="' + escapeAttr(prefs.avatarImageUrl) + '" alt="">' +
      '</div>';
    }
    var color = getAvatarColor();
    return '<div class="' + cls + '" style="--avatar-color:' + color + '" aria-hidden="true"></div>';
  }

  function setDisplayName(value, persistRemote) {
    var profile = getProfile();
    if (!profile) return;
    var prefs = readPrefs(profile.id);
    prefs.displayName = String(value || '').trim();
    writePrefs(profile.id, prefs);
    if (persistRemote && prefs.displayName) {
      return VisitantesApi.updateProfile(profile.id, VisitorAuth.getUser().id, {
        nombres: prefs.displayName
      }).then(function (updated) {
        Object.assign(profile, updated);
        return updated;
      });
    }
    notifyChange();
    return Promise.resolve();
  }

  function setAvatarColorMode(mode) {
    var profile = getProfile();
    if (!profile || (mode !== 'auto' && mode !== 'custom' && mode !== 'image')) return;
    var prefs = readPrefs(profile.id);
    prefs.avatarColorMode = mode;
    if (mode === 'custom' && !prefs.avatarCustomColor) {
      prefs.avatarCustomColor = getAvatarColor() || '#8f1d1d';
    }
    writePrefs(profile.id, prefs);
    notifyChange();
  }

  function setAvatarImageUrl(dataUrl) {
    var profile = getProfile();
    if (!profile || !dataUrl) return;
    var prefs = readPrefs(profile.id);
    prefs.avatarColorMode = 'image';
    prefs.avatarImageUrl = String(dataUrl);
    writePrefs(profile.id, prefs);
    notifyChange();
  }

  function setAvatarCustomColor(hex) {
    var profile = getProfile();
    if (!profile) return;
    var prefs = readPrefs(profile.id);
    prefs.avatarColorMode = 'custom';
    prefs.avatarCustomColor = String(hex || '').trim();
    writePrefs(profile.id, prefs);
    notifyChange();
  }

  function getCustomTheme() {
    var prefs = getPrefs();
    return prefs.customTheme || null;
  }

  function hasPersonalTheme() {
    if (typeof ThemeSystem !== 'undefined' &&
        typeof ThemeSystem.isExplicitUserChoice === 'function' &&
        ThemeSystem.isExplicitUserChoice()) {
      return true;
    }
    return hasSavedPersonalPrefs();
  }

  function hasSavedPersonalPrefs() {
    var profile = getProfile();
    if (!profile || !profile.id) return false;
    var prefs = readPrefs(profile.id);
    return !!(prefs.themeKey || prefs.customTheme);
  }

  function markPersonalThemeChoice() {
    if (typeof ThemeSystem !== 'undefined' && ThemeSystem.markUserChosen) {
      ThemeSystem.markUserChosen();
    }
  }

  function setThemeKey(themeKey) {
    var profile = getProfile();
    if (!profile) return;
    var customKey = ThemeSystem.CUSTOM_THEME_KEY || 'custom';
    var prefs = readPrefs(profile.id);
    prefs.themeKey = themeKey;
    if (themeKey !== customKey) {
      delete prefs.customTheme;
    }
    writePrefs(profile.id, prefs);
    if (themeKey === customKey && prefs.customTheme) {
      ThemeSystem.apply(themeKey, true, prefs.customTheme);
    } else {
      ThemeSystem.apply(themeKey, true);
    }
    markPersonalThemeChoice();
    notifyChange();
  }

  function saveCustomTheme(config) {
    var result = ThemeSystem.saveCustomTheme(config);
    if (!result.ok) return result;
    var profile = getProfile();
    if (profile) {
      var prefs = readPrefs(profile.id);
      prefs.themeKey = ThemeSystem.CUSTOM_THEME_KEY;
      prefs.customTheme = ThemeSystem.normalizeCustomConfig(config);
      writePrefs(profile.id, prefs);
    }
    markPersonalThemeChoice();
    notifyChange();
    return result;
  }

  function getPlatformProfileId() {
    var profile = getProfile();
    if (!profile) return null;
    return profile.auth_user_id || (profile.platformProfile && profile.platformProfile.id) || null;
  }

  function buildThemeConfigPayload(config) {
    var prefs = getPrefs();
    return Object.assign({}, ThemeSystem.normalizeCustomConfig(config), {
      themeKey: ThemeSystem.CUSTOM_THEME_KEY,
      avatar: {
        mode: prefs.avatarColorMode || 'auto',
        customColor: prefs.avatarCustomColor || null,
        imageUrl: prefs.avatarImageUrl || null
      }
    });
  }

  function applyAvatarFromThemeConfig(avatarConfig) {
    if (!avatarConfig || typeof avatarConfig !== 'object') return;
    if (avatarConfig.mode === 'image' && avatarConfig.imageUrl) {
      setAvatarImageUrl(avatarConfig.imageUrl);
      return;
    }
    if (avatarConfig.mode === 'custom' && avatarConfig.customColor) {
      setAvatarColorMode('custom');
      setAvatarCustomColor(avatarConfig.customColor);
      return;
    }
    if (avatarConfig.mode === 'auto') {
      setAvatarColorMode('auto');
    }
  }

  function applyThemeConfig(config) {
    if (!config) return { ok: false, message: 'Tema inválido.' };
    var customKey = ThemeSystem.CUSTOM_THEME_KEY || 'custom';
    var themeKey = config.themeKey || customKey;
    if (config.avatar) applyAvatarFromThemeConfig(config.avatar);

    if (themeKey === customKey) {
      return saveCustomTheme(ThemeSystem.normalizeCustomConfig(config));
    }

    setThemeKey(themeKey);
    return { ok: true };
  }

  async function listSavedThemes() {
    var profileId = getPlatformProfileId();
    if (!profileId) return [];
    return UserThemesApi.listByProfile(profileId);
  }

  function buildDefaultThemeName(themes) {
    var used = {};
    (themes || []).forEach(function (theme) {
      var match = /^Mi tema (\d+)$/.exec(String(theme.nombre || '').trim());
      if (match) used[parseInt(match[1], 10)] = true;
    });
    var index = 1;
    while (used[index]) index += 1;
    return 'Mi tema ' + index;
  }

  async function saveCustomThemeRemote(config, options) {
    options = options || {};
    var localResult = { ok: true };
    if (options.apply !== false) {
      localResult = saveCustomTheme(config);
      if (!localResult.ok) return localResult;
    }

    var profileId = getPlatformProfileId();
    if (!profileId) return localResult;

    try {
      var payload = buildThemeConfigPayload(config);
      var savedTheme;
      var nombre = String(options.nombre || '').trim();
      if (options.themeId) {
        if (!nombre) {
          var existingThemes = await UserThemesApi.listByProfile(profileId);
          var current = existingThemes.find(function (theme) { return theme.id === options.themeId; });
          nombre = current ? current.nombre : buildDefaultThemeName(existingThemes);
        }
        savedTheme = await UserThemesApi.update(options.themeId, profileId, {
          configuracion: payload,
          nombre: nombre
        });
      } else {
        var themes = await UserThemesApi.listByProfile(profileId);
        if (!nombre) nombre = buildDefaultThemeName(themes);
        savedTheme = await UserThemesApi.create(profileId, {
          nombre: nombre,
          configuracion: payload
        });
      }

      if (!savedTheme || !savedTheme.id) {
        return { ok: false, message: 'No se pudo confirmar el guardado del tema en la nube.' };
      }

      if (options.apply !== false) {
        await ProfilesApi.updateTemaActual(profileId, {
          savedThemeId: savedTheme.id,
          themeKey: ThemeSystem.CUSTOM_THEME_KEY,
          nombre: savedTheme.nombre,
          configuracion: payload
        });

        var profile = getProfile();
        if (profile && profile.platformProfile) {
          profile.platformProfile.tema_actual = {
            savedThemeId: savedTheme.id,
            themeKey: ThemeSystem.CUSTOM_THEME_KEY,
            nombre: savedTheme.nombre
          };
        }
      }

      return { ok: true, theme: savedTheme };
    } catch (err) {
      return { ok: false, message: err.message || 'No se pudo guardar el tema en Supabase.' };
    }
  }

  async function applySavedTheme(theme) {
    if (!theme || !theme.configuracion) {
      return { ok: false, message: 'Tema inválido.' };
    }
    var result = applyThemeConfig(theme.configuracion);
    if (!result.ok) return result;

    if (typeof ThemeSystem.markUserChosen === 'function') {
      ThemeSystem.markUserChosen();
    }

    var profileId = getPlatformProfileId();
    if (profileId) {
      try {
        await ProfilesApi.updateTemaActual(profileId, {
          savedThemeId: theme.id,
          themeKey: theme.configuracion.themeKey || ThemeSystem.CUSTOM_THEME_KEY,
          nombre: theme.nombre,
          configuracion: theme.configuracion
        });
      } catch (err) {
        return {
          ok: true,
          warning: err.message || 'Tema aplicado localmente, pero no se pudo sincronizar el tema activo.'
        };
      }
    }
    notifyChange();
    return { ok: true };
  }

  async function deleteSavedTheme(themeId) {
    var profileId = getPlatformProfileId();
    if (!profileId) return { ok: false, message: 'Inicia sesión para eliminar temas.' };
    try {
      await UserThemesApi.remove(themeId, profileId);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message || 'No se pudo eliminar el tema.' };
    }
  }

  function exportSavedTheme(theme) {
    var profile = getProfile();
    UserThemesApi.downloadExport(theme, profile && profile.platformProfile ? profile.platformProfile : profile);
  }

  function loadForVisitor(profile) {
    boundProfile = profile || null;
    if (!profile) return;

    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.shouldRestoreEditorSession === 'function' &&
        VisitorPersonalizePanel.shouldRestoreEditorSession()) {
      notifyChange();
      return;
    }

    if (typeof ProjectThemeAuthority !== 'undefined' &&
        ProjectThemeAuthority.shouldApplyProjectDefault &&
        ProjectThemeAuthority.shouldApplyProjectDefault()) {
      ProjectThemeAuthority.applyDefaultForCurrentVisitor();
      notifyChange();
      return;
    }

    var customKey = ThemeSystem.CUSTOM_THEME_KEY || 'custom';
    var prefs = readPrefs(profile.id);
    if (prefs.themeKey === customKey && prefs.customTheme) {
      ThemeSystem.apply(customKey, true, prefs.customTheme);
    } else if (prefs.themeKey && ThemeSystem.THEMES && ThemeSystem.THEMES[prefs.themeKey]) {
      ThemeSystem.apply(prefs.themeKey, true);
    }
    notifyChange();
  }

  function clearVisitorBinding() {
    boundProfile = null;
  }

  function notifyChange() {
    if (typeof window.onVisitorPersonalizationChanged === 'function') {
      window.onVisitorPersonalizationChanged();
    }
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
  }

  async function saveIdentity(displayName) {
    await setDisplayName(displayName, true);
    notifyChange();
  }

  return {
    getDisplayName: getDisplayName,
    getUsername: getUsername,
    getEmail: getEmail,
    getAvatarColor: getAvatarColor,
    getAvatarColorMode: getAvatarColorMode,
    getAvatarCustomColor: getAvatarCustomColor,
    getAvatarImageUrl: getAvatarImageUrl,
    renderAvatarHtml: renderAvatarHtml,
    setDisplayName: setDisplayName,
    setAvatarColorMode: setAvatarColorMode,
    setAvatarCustomColor: setAvatarCustomColor,
    setAvatarImageUrl: setAvatarImageUrl,
    setThemeKey: setThemeKey,
    getCustomTheme: getCustomTheme,
    saveCustomTheme: saveCustomTheme,
    saveCustomThemeRemote: saveCustomThemeRemote,
    listSavedThemes: listSavedThemes,
    applySavedTheme: applySavedTheme,
    deleteSavedTheme: deleteSavedTheme,
    exportSavedTheme: exportSavedTheme,
    applyThemeConfig: applyThemeConfig,
    buildThemeConfigPayload: buildThemeConfigPayload,
    buildDefaultThemeName: buildDefaultThemeName,
    getPlatformProfileId: getPlatformProfileId,
    hasPersonalTheme: hasPersonalTheme,
    hasSavedPersonalPrefs: hasSavedPersonalPrefs,
    loadForVisitor: loadForVisitor,
    clearVisitorBinding: clearVisitorBinding,
    saveIdentity: saveIdentity,
    getPrefs: getPrefs
  };
})();

window.onThemeChanged = function () {
  if (typeof VisitorPersonalization !== 'undefined' &&
      VisitorPersonalization.getAvatarColorMode() === 'auto') {
    if (typeof window.refreshVisitorMenuProfile === 'function') {
      window.refreshVisitorMenuProfile();
    }
    if (typeof VisitorPersonalizePanel !== 'undefined' &&
        typeof VisitorPersonalizePanel.updatePreview === 'function') {
      VisitorPersonalizePanel.updatePreview();
    }
  }
};
