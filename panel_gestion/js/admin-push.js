/**
 * Web Push para admin: activar notificaciones en este dispositivo (PWA / Chrome).
 */
(function () {
  'use strict';

  function getClient() {
    try {
      if (window.PlatformAuth && typeof window.PlatformAuth.getClient === 'function') {
        return window.PlatformAuth.getClient();
      }
    } catch (e) {}
    return null;
  }

  function isAdmin() {
    try {
      return !!(window.BoxiesTeamChat && window.BoxiesTeamChat.isAdmin && window.BoxiesTeamChat.isAdmin());
    } catch (e) {
      return false;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function ensureSw() {
    if (!('serviceWorker' in navigator)) throw new Error('Este navegador no soporta service worker');
    var reg = await navigator.serviceWorker.register('/panel_gestion/sw.js?v=1', {
      scope: '/panel_gestion/'
    });
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function enable() {
    if (!isAdmin()) throw new Error('Solo admin');
    if (!('Notification' in window) || !('PushManager' in window)) {
      throw new Error('Este celular/navegador no soporta push. Usa Chrome en Android o Safari 16.4+ en iPhone (app en inicio).');
    }
    var client = getClient();
    if (!client) throw new Error('Sin sesión');

    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado');

    var vapidRes = await client.rpc('panel_notify_vapid_public');
    if (vapidRes.error) throw new Error(vapidRes.error.message || 'Sin clave VAPID');
    var vapidKey = String(vapidRes.data || '').trim();
    if (!vapidKey) throw new Error('Falta configurar VAPID en el servidor');

    var reg = await ensureSw();
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });
    var json = sub.toJSON();
    var keys = json.keys || {};
    var up = await client.rpc('panel_admin_push_upsert', {
      p_endpoint: json.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_user_agent: navigator.userAgent || null
    });
    if (up.error) throw new Error(up.error.message || 'No se pudo guardar la suscripción');
    try {
      localStorage.setItem('boxiesAdminPushOn', '1');
    } catch (e) {}
    return true;
  }

  async function disable() {
    var client = getClient();
    if (!client || !('serviceWorker' in navigator)) return false;
    var reg = await navigator.serviceWorker.getRegistration('/panel_gestion/');
    if (!reg) return false;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    var endpoint = sub.endpoint;
    try {
      await sub.unsubscribe();
    } catch (e) {}
    try {
      await client.rpc('panel_admin_push_delete', { p_endpoint: endpoint });
    } catch (e2) {}
    try {
      localStorage.removeItem('boxiesAdminPushOn');
    } catch (e3) {}
    return true;
  }

  function ensureButton() {
    if (!isAdmin()) return;
    var actions = document.querySelector('#teamChatPopup .chat-popup-actions');
    if (!actions || document.getElementById('adminPushToggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'adminPushToggle';
    btn.className = 'chat-popup-clear';
    btn.title = 'Notificaciones en este celular';
    function refreshLabel() {
      var on = false;
      try {
        on = localStorage.getItem('boxiesAdminPushOn') === '1';
      } catch (e) {}
      btn.textContent = on ? 'Avisos ON' : 'Avisos';
    }
    refreshLabel();
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        var on = false;
        try {
          on = localStorage.getItem('boxiesAdminPushOn') === '1';
        } catch (e) {}
        if (on) {
          await disable();
          alert('Avisos desactivados en este dispositivo.');
        } else {
          await enable();
          alert('Listo. Añade el panel a la pantalla de inicio para avisos en segundo plano.');
        }
        refreshLabel();
      } catch (err) {
        alert((err && err.message) || 'No se pudo activar');
      } finally {
        btn.disabled = false;
      }
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  function boot() {
    try {
      ensureSw().catch(function () {});
    } catch (e) {}
    setTimeout(ensureButton, 800);
    setTimeout(ensureButton, 2500);
  }

  window.BoxiesAdminPush = { enable: enable, disable: disable, ensureButton: ensureButton };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  navigator.serviceWorker &&
    navigator.serviceWorker.addEventListener('message', function (ev) {
      var data = ev.data || {};
      if (data.type === 'openClientChat' && data.url) {
        try {
          var u = new URL(data.url, location.origin);
          var id = u.searchParams.get('openClientChat');
          if (id && window.BoxiesTeamChat && window.BoxiesTeamChat.openClientChat) {
            window.BoxiesTeamChat.openClientChat(id, 'Cliente');
          } else {
            location.href = data.url;
          }
        } catch (e) {
          location.href = data.url;
        }
      }
    });
})();
