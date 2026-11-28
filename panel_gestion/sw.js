/* BOXIES panel service worker — push + open client chat */
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { body: event.data && event.data.text() };
    } catch (e2) {
      data = {};
    }
  }
  var title = data.title || 'Chat cliente';
  var body = data.body || 'Nuevo mensaje';
  var url = data.url || '/panel_gestion/';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/panel_gestion/assets/logo.png',
      badge: '/panel_gestion/assets/logo.png',
      data: { url: url, client_id: data.client_id, client_name: data.client_name },
      tag: data.client_id ? 'client-chat-' + data.client_id : 'client-chat',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/panel_gestion/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var client = list[i];
        if (client.url && client.url.indexOf('/panel_gestion') !== -1 && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(url);
          }
          return client.postMessage({ type: 'openClientChat', url: url });
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
