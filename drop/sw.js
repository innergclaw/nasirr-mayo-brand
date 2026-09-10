// No content or credentials are cached on the device by this worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  const id = /^[a-f0-9-]{36}$/.test(data.id || '') ? data.id : '';
  event.waitUntil(self.registration.showNotification('new words in drop', {
    body: 'your private inbox has something ready to use.',
    icon: '/drop/icon-192.png', badge: '/drop/icon-192.png',
    tag: id || 'drop-test', data: { url: '/drop/' + (id ? '#'+id : '') }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/drop/', self.location.origin);
  if (url.origin !== self.location.origin || url.pathname !== '/drop/') return;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find(c => new URL(c.url).pathname === '/drop/');
    if (existing) { await existing.navigate(url.href); return existing.focus(); }
    return self.clients.openWindow(url.href);
  })());
});
