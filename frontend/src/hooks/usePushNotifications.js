import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';

/**
 * Converts a VAPID base64 string to Uint8Array (required by pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Registers the Service Worker and manages Web Push & Browser Notifications.
 */
export const usePushNotifications = () => {
    const { authUser } = useAuthContext();
    const [permission, setPermission] = useState(
        typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'default'
    );
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [swRegistration, setSwRegistration] = useState(null);
    const initializedRef = useRef(false);

    // 1. Register Service Worker on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                setSwRegistration(registration);
                console.info('[Push] Service worker active.');
            })
            .catch((err) => {
                console.warn('[Push] Service worker registration failed:', err.message);
            });
    }, []);

    // 2. Subscribe to server push if permission is granted & user is logged in
    const subscribeToServerPush = useCallback(async (registration) => {
        if (!registration || !('PushManager' in window)) return;

        try {
            const keyRes = await fetch('/api/push/vapid-public-key');
            if (!keyRes.ok) {
                console.info('[Push] Server VAPID key not configured — push disabled, desktop notifications still active.');
                return;
            }

            const { publicKey } = await keyRes.json();
            if (!publicKey) return;

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                });
            }

            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
                credentials: 'include',
            });

            setIsSubscribed(true);
            console.info('[Push] ✅ Web Push subscribed successfully.');
        } catch (err) {
            console.warn('[Push] PushManager subscription skipped:', err.message);
        }
    }, []);

    // Auto-subscribe if already granted and authenticated
    useEffect(() => {
        if (!authUser || initializedRef.current) return;
        initializedRef.current = true;

        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
            if (Notification.permission === 'granted' && swRegistration) {
                subscribeToServerPush(swRegistration);
            }
        }
    }, [authUser, swRegistration, subscribeToServerPush]);

    // 3. User-triggered permission request (works reliably on Chrome/Firefox without being blocked)
    const requestNotificationPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'unsupported';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                const reg = swRegistration || (await navigator.serviceWorker.ready);
                if (reg) {
                    await subscribeToServerPush(reg);
                }

                // Show instant confirmation notification
                try {
                    new Notification("🔔 SendChat Notifications Active", {
                        body: "You'll now receive Google Chat-style alerts when someone messages you!",
                        icon: "/icons/icon-192.png",
                        badge: "/icons/badge-72.png"
                    });
                } catch (_) {
                    if (reg?.showNotification) {
                        reg.showNotification("🔔 SendChat Notifications Active", {
                            body: "You'll now receive Google Chat-style alerts when someone messages you!",
                            icon: "/icons/icon-192.png",
                            badge: "/icons/badge-72.png"
                        });
                    }
                }
            }
            return result;
        } catch (err) {
            console.warn('[Push] requestPermission error:', err.message);
            return 'denied';
        }
    }, [swRegistration, subscribeToServerPush]);

    return {
        permission,
        isSubscribed,
        requestNotificationPermission,
    };
};

export default usePushNotifications;
