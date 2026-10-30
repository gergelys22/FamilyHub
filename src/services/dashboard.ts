
// A főoldali családi áttekintő lekérdezései. Minden függvény önálló, így egy hiba nem viszi el az egészet.
import { supabase } from '@/lib/supabase'; // igazítsd a projekted kliens-importjához

export type DashboardTask = { id: string; title: string; due_at: string };

export type DashboardMedication = {
  id: string;
  name: string;
  dosageText: string | null;
  nextAt: string;
  person: string | null;
  late: boolean;
};

export type DashboardBirthday = {
  profileId: string;
  name: string;
  date: Date;
  daysAway: number;
  turning: number | null;
};

export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function localDateString(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Lejárt, még nem kész teendők (a határidő már elmúlt). */
export async function getOverdueTasks(
  familyId: string,
): Promise<{ total: number; items: DashboardTask[] }> {
  const { data, error, count } = await supabase
    .from('family_tasks')
    .select('id, title, due_at', { count: 'exact' })
    .eq('family_id', familyId)
    .eq('list_type', 'task')
    .eq('completed', false)
    .lt('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(20)
    .returns<DashboardTask[]>();

  if (error) throw new Error(error.message);
  const items = data ?? [];
  return { total: count ?? items.length, items };
}

type MedicationRow = {
  id: string;
  name: string;
  dosage_text: string | null;
  next_at: string;
  profiles: { display_name: string } | null;
};

/** Mai gyógyszer-emlékeztetők (a `medications.next_at` alapján). */
export async function getTodayMedications(familyId: string): Promise<DashboardMedication[]> {
  const now = new Date();
  const today = localDateString(now);

  const { data, error } = await supabase
    .from('medications')
    .select('id, name, dosage_text, next_at, profiles(display_name)')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .not('next_at', 'is', null)
    .gte('next_at', startOfDay(now).toISOString())
    .lte('next_at', endOfDay(now).toISOString())
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order('next_at', { ascending: true })
    .returns<MedicationRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    dosageText: row.dosage_text,
    nextAt: row.next_at,
    person: row.profiles?.display_name ?? null,
    late: new Date(row.next_at).getTime() < now.getTime(),
  }));
}

type MemberConversationRow = {
  conversation_id: string;
  last_read_at: string | null;
  chat_conversations: { family_id: string };
};

/** Olvasatlan chatüzenetek száma a saját beszélgetéseimben (a sajátjaim nélkül). */
export async function getUnreadMessageCount(familyId: string, profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from('chat_conversation_members')
    .select('conversation_id, last_read_at, chat_conversations!inner(family_id)')
    .eq('profile_id', profileId)
    .eq('chat_conversations.family_id', familyId)
    .returns<MemberConversationRow[]>();

  if (error) throw new Error(error.message);

  const counts = await Promise.all(
    (data ?? []).map(async (member) => {
      let query = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', member.conversation_id)
        .neq('sender_profile_id', profileId)
        .is('deleted_at', null);
      if (member.last_read_at) query = query.gt('created_at', member.last_read_at);
      const { count, error: countError } = await query;
      if (countError) throw new Error(countError.message);
      return count ?? 0;
    }),
  );
  return counts.reduce((sum, n) => sum + n, 0);
}

type MemberBirthdayRow = {
  profile_id: string;
  profiles: { display_name: string; birth_date: string | null } | null;
};

/** A következő `days` nap születésnapjai (a mai nappal együtt). */
export async function getUpcomingBirthdays(
  familyId: string,
  days = 30,
): Promise<DashboardBirthday[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('profile_id, profiles(display_name, birth_date)')
    .eq('family_id', familyId)
    .returns<MemberBirthdayRow[]>();

  if (error) throw new Error(error.message);

  const today = startOfDay();
  const result: DashboardBirthday[] = [];

  for (const row of data ?? []) {
    const profile = row.profiles;
    if (!profile?.birth_date) continue;
    // A 'YYYY-MM-DD' szöveget kézzel bontjuk, mert a new Date('YYYY-MM-DD') UTC-ként értelmeződik.
    const [by, bm, bd] = profile.birth_date.split('-').map(Number);
    if (!by || !bm || !bd) continue;

    let next = birthdayInYear(today.getFullYear(), bm - 1, bd);
    if (next.getTime() < today.getTime()) next = birthdayInYear(today.getFullYear() + 1, bm - 1, bd);

    const daysAway = Math.round((next.getTime() - today.getTime()) / 86_400_000);
    if (daysAway > days) continue;

    const turning = next.getFullYear() - by;
    result.push({
      profileId: row.profile_id,
      name: profile.display_name,
      date: next,
      daysAway,
      turning: turning > 0 ? turning : null,
    });
  }

  return result.sort((a, b) => a.daysAway - b.daysAway);
}

// Február 29-i születésnap nem szökőévben február 28-ára esik.
function birthdayInYear(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  if (d.getMonth() !== month) return new Date(year, month, 28);
  return d;
}
