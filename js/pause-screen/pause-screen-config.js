/* Configuración normalizada de la pantalla de pausa */
var PauseScreenConfig = (function () {
  var DEFAULTS = {
    enabled: true,
    show_logo: true,
    show_avatar: true,
    show_project_name: true,
    show_user_name: false,
    name_mode: 'project',
    glow_enabled: true,
    glow_intensity: 0.32,
    breathing_enabled: true,
    breathing_duration_ms: 3200,
    blur_px: 16,
    overlay_opacity: 0.7,
    button_text: 'Continuar',
    dynamic_messages_enabled: true,
    message_interval_min_ms: 5000,
    message_interval_max_ms: 7000,
    random_order: true,
    avoid_consecutive_repeat: true,
    custom_messages: []
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var custom = Array.isArray(raw.custom_messages)
      ? raw.custom_messages.map(function (m) { return String(m || '').trim(); }).filter(Boolean)
      : [];

    return {
      enabled: raw.enabled !== false,
      show_logo: raw.show_logo !== false,
      show_avatar: raw.show_avatar !== false,
      show_project_name: raw.show_project_name !== false,
      show_user_name: !!raw.show_user_name,
      name_mode: raw.name_mode === 'user' ? 'user' : 'project',
      glow_enabled: raw.glow_enabled !== false,
      glow_intensity: clamp(Number(raw.glow_intensity != null ? raw.glow_intensity : DEFAULTS.glow_intensity), 0.05, 1),
      breathing_enabled: raw.breathing_enabled !== false,
      breathing_duration_ms: clamp(
        Number(raw.breathing_duration_ms != null ? raw.breathing_duration_ms : DEFAULTS.breathing_duration_ms),
        2800,
        3500
      ),
      blur_px: clamp(Number(raw.blur_px != null ? raw.blur_px : DEFAULTS.blur_px), 14, 20),
      overlay_opacity: clamp(Number(raw.overlay_opacity != null ? raw.overlay_opacity : DEFAULTS.overlay_opacity), 0.65, 0.75),
      button_text: String(raw.button_text || DEFAULTS.button_text).trim() || DEFAULTS.button_text,
      dynamic_messages_enabled: raw.dynamic_messages_enabled !== false,
      message_interval_min_ms: clamp(
        Number(raw.message_interval_min_ms != null ? raw.message_interval_min_ms : DEFAULTS.message_interval_min_ms),
        3000,
        15000
      ),
      message_interval_max_ms: clamp(
        Number(raw.message_interval_max_ms != null ? raw.message_interval_max_ms : DEFAULTS.message_interval_max_ms),
        4000,
        20000
      ),
      random_order: raw.random_order !== false,
      avoid_consecutive_repeat: raw.avoid_consecutive_repeat !== false,
      custom_messages: custom
    };
  }

  function fromProject(project) {
    if (!project) return normalize(null);
    var config = project.proyecto_config || {};
    return normalize(config.pause_screen_config);
  }

  function toPayload(form) {
    form = form || {};
    var customRaw = String(form.custom_messages || '');
    var custom = customRaw.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    return normalize({
      enabled: !!form.enabled,
      show_logo: !!form.show_logo,
      show_avatar: !!form.show_avatar,
      show_project_name: !!form.show_project_name,
      show_user_name: !!form.show_user_name,
      name_mode: form.name_mode === 'user' ? 'user' : 'project',
      glow_enabled: !!form.glow_enabled,
      glow_intensity: Number(form.glow_intensity),
      breathing_enabled: !!form.breathing_enabled,
      breathing_duration_ms: Number(form.breathing_duration_ms),
      blur_px: Number(form.blur_px),
      overlay_opacity: Number(form.overlay_opacity),
      button_text: form.button_text,
      dynamic_messages_enabled: !!form.dynamic_messages_enabled,
      message_interval_min_ms: Number(form.message_interval_min_ms),
      message_interval_max_ms: Number(form.message_interval_max_ms),
      random_order: !!form.random_order,
      avoid_consecutive_repeat: !!form.avoid_consecutive_repeat,
      custom_messages: custom
    });
  }

  return {
    DEFAULTS: DEFAULTS,
    normalize: normalize,
    fromProject: fromProject,
    toPayload: toPayload
  };
})();
