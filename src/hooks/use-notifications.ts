import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import {
  AppNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications';
import { useEffect, useState } from 'react';

export function useNotifications() {
  const { profile } = useAuth();
  const profileId = profile?.id;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profileId) return;

    let active = true;

    function loadNotifications(errorMessage: string) {
      getNotifications(profileId!)
        .then((data) => {
          if (!active) return;
          setNotifications(data);
          setError(null);
        })
        .catch((loadError: unknown) => {
          if (!active) return;
          setError(
            loadError instanceof Error ? loadError : new Error(errorMessage),
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    loadNotifications('Az értesítések betöltése sikertelen.');

    const channelName = `app-notifications:${profileId}:${Date.now()}:${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_notifications',
          filter: `target_profile_id=eq.${profileId}`,
        },
        () => loadNotifications('Az értesítések frissítése sikertelen.'),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  async function refresh() {
    if (!profileId) return;

    setLoading(true);
    try {
      setNotifications(await getNotifications(profileId));
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError
          : new Error('Az értesítések frissítése sikertelen.'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    await markNotificationAsRead(notificationId);
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: readAt }
          : notification,
      ),
    );
  }

  async function markAllAsRead() {
    if (!profileId) return;

    await markAllNotificationsAsRead(profileId);
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? readAt,
      })),
    );
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
