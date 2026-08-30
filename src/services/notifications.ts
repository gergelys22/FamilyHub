import { supabase } from '@/lib/supabase';

export type AppNotification = {
    id: string;
    target_profile_id: string;
    title: string;
    body: string;
    notification_type: string;
    data: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
};

export async function getNotifications(profileId: string) {
    const { data, error } = await supabase
        .from('app_notifications')
        .select(
            'id, target_profile_id, title, body, notification_type, data, read_at, created_at',
        )
        .eq('target_profile_id', profileId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []) as AppNotification[];

}

export async function markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
        .from('app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

    if (error) throw error;
}

export async function markAllNotificationsAsRead(profileId: string) {
    const { error } = await supabase
        .from('app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('target_profile_id', profileId)
        .is('read_at', null);

    if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
    const { error } = await supabase
        .from('app_notifications')
        .delete()
        .eq('id', notificationId);

    if (error) throw error;
}