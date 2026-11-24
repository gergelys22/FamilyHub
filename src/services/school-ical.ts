import { supabase } from '@/lib/supabase';

export const SCHOOL_ICAL_FUNCTION = 'school-ical-sync';

export type SchoolCalendarSubscription = {
  id: string;
  family_id: string;
  child_profile_id: string;
  url: string;
  label: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  last_count: number | null;
};

export type IcalSyncResult = { lessons: number; events: number };

export function isFileSubscription(sub: SchoolCalendarSubscription) {
  return sub.url.startsWith('file://');
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(SCHOOL_ICAL_FUNCTION, { body });
  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json();
        if (payload?.error) message = String(payload.error);
      } catch {
        // marad az általános üzenet
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function getSchoolCalendarSubscriptions(familyId: string, childProfileId: string) {
  const { data, error } = await supabase
    .from('school_calendar_subscriptions')
    .select('id, family_id, child_profile_id, url, label, last_synced_at, last_error, last_count')
    .eq('family_id', familyId)
    .eq('child_profile_id', childProfileId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SchoolCalendarSubscription[];
}

export function subscribeToSchoolCalendar(params: { familyId: string; childProfileId: string; url: string; label?: string }) {
  return invoke<IcalSyncResult>({
    action: 'subscribe',
    family_id: params.familyId,
    child_profile_id: params.childProfileId,
    url: params.url,
    label: params.label,
  });
}

export function importSchoolCalendarFile(params: { familyId: string; childProfileId: string; ics: string; label?: string }) {
  return invoke<IcalSyncResult>({
    action: 'import',
    family_id: params.familyId,
    child_profile_id: params.childProfileId,
    ics: params.ics,
    label: params.label,
  });
}

export function syncSchoolCalendar(subscriptionId: string) {
  return invoke<IcalSyncResult>({ action: 'sync', subscription_id: subscriptionId });
}

// A feliratkozás törlése az általa létrehozott órarend- és naptárelemeket is törli (ON DELETE CASCADE).
export async function removeSchoolCalendarSubscription(subscriptionId: string) {
  const { error } = await supabase.from('school_calendar_subscriptions').delete().eq('id', subscriptionId);
  if (error) throw new Error(error.message);
}
