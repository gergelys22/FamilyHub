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

export type NotificationPreferences = {
  profile_id: string;
  family_id: string;
  enabled_types: string[];
  muted_member_ids: string[];
  quiet_start: number | null;
  quiet_end: number | null;
};

export async function getNotificationPreferences(
  profileId: string,
  familyId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('family_notification_preferences')
    .select('profile_id, family_id, enabled_types, muted_member_ids, quiet_start, quiet_end')
    .eq('profile_id', profileId)
    .eq('family_id', familyId)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationPreferences | null;
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
) {
  const { error } = await supabase
    .from('family_notification_preferences')
    .upsert(
      {
        profile_id: preferences.profile_id,
        family_id: preferences.family_id,
        enabled_types: preferences.enabled_types,
        muted_member_ids: preferences.muted_member_ids,
        quiet_start: preferences.quiet_start,
        quiet_end: preferences.quiet_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
  if (error) throw error;
}
