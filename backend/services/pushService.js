const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription');

// Configure VAPID details (needed to authenticate the push server with browsers)
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL       = process.env.VAPID_EMAIL || 'mailto:robitkumbhar956@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Send a push notification to all browser subscriptions of a given user.
 * Silently removes any expired / invalid subscriptions (HTTP 410 Gone).
 *
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, icon?: string, url?: string, tag?: string }} payload
 */
const sendPushToUser = async (userId, payload) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // Push not configured — skip silently

    let subscriptions;
    try {
        subscriptions = await PushSubscription.find({ userId }).lean();
    } catch (err) {
        console.error('[Push] DB fetch error:', err.message);
        return;
    }

    if (!subscriptions || subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
        title: payload.title || 'SendChat',
        body:  payload.body  || 'New message',
        icon:  payload.icon  || '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        url:   payload.url   || '/',
        tag:   payload.tag   || 'sendchat-message',
        // Re-use tag to collapse multiple rapid notifications from same sender
        renotify: true,
    });

    const results = await Promise.allSettled(
        subscriptions.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                notificationPayload,
                { urgency: 'high' }
            )
        )
    );

    // Clean up subscriptions that are no longer valid (browser unsubscribed)
    const staleEndpoints = [];
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            const statusCode = result.reason?.statusCode;
            if (statusCode === 410 || statusCode === 404) {
                staleEndpoints.push(subscriptions[i].endpoint);
            } else {
                console.error('[Push] Delivery error:', result.reason?.message);
            }
        }
    });

    if (staleEndpoints.length > 0) {
        await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
    }
};

module.exports = { sendPushToUser };
