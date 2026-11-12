/* Web Push handlers, pulled into the generated service worker via workbox importScripts. */
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { /* plain text */ }
  e.waitUntil(self.registration.showNotification(d.title || 'Ora', { body: d.body || '', tag: d.tag, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'auto' }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => { for (const c of l) if ('focus' in c) return c.focus(); return self.clients.openWindow('/'); }));
});
