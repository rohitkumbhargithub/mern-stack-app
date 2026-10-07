const PushSubscription = require('../models/pushSubscription');

/**
 * GET /api/push/vapid-public-key
 * Returns the server's VAPID public key so the frontend can subscribe.
 */
exports.getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(503).json({ error: 'Push notifications not configured on server' });
    }
    res.json({ publicKey: key });
};

/**
 * POST /api/push/subscribe
 * Saves or updates the browser push subscription for the current user.
 * Body: { endpoint, keys: { p256dh, auth } }
 */
exports.subscribe = async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'Invalid subscription payload' });
        }

        const userId = req.user._id;

        // Upsert: update if endpoint already exists, else insert new
        await PushSubscription.findOneAndUpdate(
            { endpoint },
            { userId, endpoint, keys },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('[Push] Subscribe error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /api/push/unsubscribe
 * Removes the browser push subscription for the current user.
 * Body: { endpoint }
 */
exports.unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }
        await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
        res.json({ success: true });
    } catch (err) {
        console.error('[Push] Unsubscribe error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};
