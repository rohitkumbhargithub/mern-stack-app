import { useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';

/**
 * Registers the service worker and subscribes the browser to Web Push.
 * Called once after login. Silently does nothing if the browser doesn't support it.
 */
const usePushNotifications = () => {
    const { authUser } = useAuthContext();
    const subscribedRef = useRef(false);

    useEffect(() => {
        // Only run for logged-in users, and only once per session
        if (!authUser || subscribedRef.current) return;

        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.info('[Push] Browser does not support Web Push — skipped.');
            return;
        }

        const setupPush = async () => {
            try {
                // 1. Fetch the server's VAPID public key
                const keyRes = await fetch('/api/push/vapid-public-key');
                if (!keyRes.ok) {
                    console.warn('[Push] Server has no VAPID key configured — push disabled.');
                    return;
                }
                const { publicKey } = await keyRes.json();

                // 2. Register (or reuse) the service worker
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                });

                // 3. Check current permission state — don't ask repeatedly if denied
                const currentPermission = Notification.permission;
                if (currentPermission === 'denied') {
                    console.info('[Push] Notification permission denied by user.');
                    return;
                }

                // 4. If not yet granted, ask for permission
                if (currentPermission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        console.info('[Push] User declined notification permission.');
                        return;
                    }
                }

                // 5. Subscribe to push (or reuse an existing subscription)
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey),
                    });
                }

                // 6. Send the subscription to our backend
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription.toJSON()),
                    credentials: 'include',
                });

                subscribedRef.current = true;
                console.info('[Push] ✅ Web Push subscribed successfully.');
            } catch (err) {
                console.warn('[Push] Setup failed:', err.message);
            }
        };

        setupPush();
    }, [authUser]);
};

/**
 * Converts a VAPID base64 string to Uint8Array (required by pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default usePushNotifications;
