import { supabase } from '@/lib/supabase';

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted';

export type ActivityEntityType = 'task';

export type ActivityLog = {
  id: string;
  family_id: string;
  actor_profile_id: string | null;
  type: ActivityType;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actorName: string | null;
};

type ActivityLogRow = Omit<ActivityLog, 'actorName'> & {
  profiles: { display_name: string } | null;
};

export async function getFamilyActivityLogs(familyId: string, limit = 8): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('family_activity_logs')
    .select('id, family_id, actor_profile_id, type, entity_type, entity_id, summary, metadata, created_at, profiles(display_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ActivityLogRow[]>();

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    actorName: row.profiles?.display_name ?? null,
  }));
}

export async function createActivityLog(input: {
  familyId: string;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase
    .from('family_activity_logs')
    .insert({
      family_id: input.familyId,
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary.trim(),
      metadata: input.metadata ?? {},
    });

  if (error) throw new Error(error.message);
}
