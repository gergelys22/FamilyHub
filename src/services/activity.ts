import { supabase } from '@/lib/supabase';

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'document_created'
  | 'document_updated'
  | 'document_deleted'
  | 'memory_created'
  | 'family_member_joined'
  | 'medication_created'
  | 'medication_updated'
  | 'medication_deleted'
  | 'emergency_contact_created'
  | 'emergency_contact_updated'
  | 'emergency_contact_deleted';

export type ActivityEntityType =
  | 'task'
  | 'event'
  | 'document'
  | 'memory'
  | 'family_member'
  | 'medication'
  | 'emergency_contact';

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

export async function getFamilyActivityTimeline(
  familyId: string,
  options?: {
    limit?: number;
    from?: string;
    to?: string;
  },
): Promise<ActivityLog[]> {
  let query = supabase
    .from('family_activity_logs')
    .select('id, family_id, actor_profile_id, type, entity_type, entity_id, summary, metadata, created_at, profiles(display_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (options?.from) query = query.gte('created_at', options.from);
  if (options?.to) query = query.lte('created_at', options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query.returns<ActivityLogRow[]>();
  if (error) throw error;
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
