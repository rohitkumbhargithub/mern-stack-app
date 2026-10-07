/**
 * SendChat Service Worker — handles Web Push Notifications
 * This file MUST be at /sw.js (root of the domain) so it can control all pages.
 */

const SENDCHAT_VERSION = 'sw-v1';

// ── Activate immediately (don't wait for old tabs to close) ──────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// ── Push event — fired when server sends a push ──────────────────────────────
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: 'SendChat', body: event.data?.text() || 'New message' };
    }

    const title   = data.title  || 'SendChat';
    const options = {
        body:            data.body    || 'You have a new message',
        icon:            data.icon    || '/icons/icon-192.png',
        badge:           data.badge   || '/icons/badge-72.png',
        tag:             data.tag     || 'sendchat-msg',
        renotify:        true,
        requireInteraction: false,
        vibrate:         [200, 100, 200],
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open',    title: 'Open chat' },
            { action: 'dismiss', title: 'Dismiss'   },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ── Notification click — open/focus the app ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // If a SendChat tab is already open, focus it and navigate
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Otherwise open a new tab
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
