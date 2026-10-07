import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export const NotificationBanner = () => {
  const { permission, requestNotificationPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed banner
    const isDismissed = localStorage.getItem('sendchat_notif_banner_dismissed') === 'true';
    const isUnsupported = typeof window !== 'undefined' && !('Notification' in window);

    // Only show if permission is 'default' (not yet asked or granted) and not dismissed
    if (!isDismissed && !isUnsupported && permission === 'default') {
      setDismissed(false);
    } else {
      setDismissed(true);
    }
  }, [permission]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestNotificationPermission();
      if (res === 'granted') {
        toast.success("Desktop notifications enabled! You'll receive Google Chat-style alerts.", {
          icon: <CheckCircle className="h-4 w-4 text-emerald-500" />
        });
        setDismissed(true);
      } else if (res === 'denied') {
        toast.error("Notification permission was denied. You can enable it in your browser site settings.");
        setDismissed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('sendchat_notif_banner_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || permission !== 'default') return null;

  return (
    <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-b border-primary/20 px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-foreground animate-in slide-in-from-top-1 z-30 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary grid place-items-center shrink-0">
          <Bell className="h-3.5 w-3.5 animate-bounce" />
        </div>
        <p className="truncate text-[11px] sm:text-xs">
          <span className="font-semibold text-primary">Turn on desktop notifications</span> to get Google Chat-style alerts when you're in other tabs.
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all text-[11px] shadow-xs cursor-pointer disabled:opacity-50"
        >
          {loading ? "Enabling…" : "Enable"}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Dismiss for now"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;
