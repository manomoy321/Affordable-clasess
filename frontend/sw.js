// Service Worker for Push Notifications
// Handles push events and shows browser notifications

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
    let data = { title: '📺 New Video Added!', body: 'A new video has been added to your course.' };
    try {
        if (e.data) data = e.data.json();
    } catch (_) { }

    e.waitUntil(
        self.registration.showNotification(data.title || '📺 New Video!', {
            body: data.body || 'A new video has been added.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'new-video-' + Date.now(),
            requireInteraction: false,
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || '/';
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
        })
    );
});
