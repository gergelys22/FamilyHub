import { supabase } from '@/lib/supabase';
import { createActivityLog } from '@/services/activity';

export type FamilyDocument = {
  id: string;
  family_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  document_type: string;
  tags: string[];
  expires_at: string | null;
  related_profile_id: string | null;
  restricted: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};
export type Medication = {
  id: string;
  family_id: string;
  profile_id: string;
  person_profile_id: string | null;
  name: string;
  dosage_text: string | null;
  instructions: string | null;
  next_at: string | null;
  frequency: string | null;
  schedule_time: string | null;
  is_active: boolean;
  ends_on: string | null;
};

export type EmergencyContact = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  name: string;
  relation: string | null;
  phone: string;
  email: string | null;
  priority: number;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type Reminder = { id: string; family_id: string; title: string; detail: string | null; due_at: string; category: string };
export type FamilyTask = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  assigned_to_profile_id: string | null;
  list_type: 'task' | 'shopping';
  title: string;
  detail: string | null;
  quantity: string | null;
  due_at: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
export type SchoolItemType = 'timetable' | 'homework' | 'exam' | 'workout' | 'meeting';
export type FamilySchoolItem = {
  id: string;
  family_id: string;
  child_profile_id: string;
  created_by_profile_id: string;
  item_type: SchoolItemType;
  title: string;
  detail: string | null;
  location: string | null;
  metadata: Record<string, string | boolean | number | null>;
  starts_at: string | null;
  due_at: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export async function getFamilyDocuments(familyId: string) {
  const { data, error } = await supabase
    .from('family_documents')
    .select('id, family_id, name, storage_path, mime_type, size_bytes, document_type, tags, expires_at, related_profile_id, restricted, version, created_at, updated_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyDocument[];
}
export async function createFamilyDocument(input: {
  familyId: string;
  profileId: string;
  name: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  documentType?: string;
  tags?: string[];
  expiresAt?: string | null;
  relatedProfileId?: string | null;
  restricted?: boolean;
}) {
  const { data, error } = await supabase
    .from('family_documents')
    .insert({
      family_id: input.familyId,
      uploaded_by_profile_id: input.profileId,
      name: input.name.trim(),
      storage_path: input.storagePath,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      document_type: input.documentType?.trim() || 'egyeb',
      tags: input.tags ?? [],
      expires_at: input.expiresAt ?? null,
      related_profile_id: input.relatedProfileId ?? null,
      restricted: input.restricted ?? false,
    })
    .select('id, family_id, name, storage_path, mime_type, size_bytes, document_type, tags, expires_at, related_profile_id, restricted, version, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return data as FamilyDocument;
}
export async function deleteFamilyDocument(document: FamilyDocument) {
  const { error: storageError } = await supabase.storage.from('family-documents').remove([document.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from('family_documents').delete().eq('id', document.id);
  if (error) throw new Error(error.message);
}

export async function updateFamilyDocument(
  documentId: string,
  input: {
    name?: string;
    documentType?: string;
    tags?: string[];
    expiresAt?: string | null;
    relatedProfileId?: string | null;
    restricted?: boolean;
  },
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.documentType !== undefined) payload.document_type = input.documentType.trim() || 'egyeb';
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.expiresAt !== undefined) payload.expires_at = input.expiresAt;
  if (input.relatedProfileId !== undefined) payload.related_profile_id = input.relatedProfileId;
  if (input.restricted !== undefined) payload.restricted = input.restricted;
  const { data, error } = await supabase
    .from('family_documents')
    .update(payload)
    .eq('id', documentId)
    .select('id, family_id, name, storage_path, mime_type, size_bytes, document_type, tags, expires_at, related_profile_id, restricted, version, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return data as FamilyDocument;
}

export type FamilyDocumentVersion = {
  id: string;
  document_id: string;
  storage_path: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_profile_id: string;
  version: number;
  created_at: string;
};

export async function getFamilyDocumentVersions(documentId: string) {
  const { data, error } = await supabase
    .from('family_document_versions')
    .select('id, document_id, storage_path, name, mime_type, size_bytes, uploaded_by_profile_id, version, created_at')
    .eq('document_id', documentId)
    .order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyDocumentVersion[];
}

export async function createFamilyDocumentVersion(input: {
  documentId: string;
  profileId: string;
  storagePath: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  version: number;
}) {
  const { data, error } = await supabase
    .from('family_document_versions')
    .insert({
      document_id: input.documentId,
      uploaded_by_profile_id: input.profileId,
      storage_path: input.storagePath,
      name: input.name,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      version: input.version,
    })
    .select('id, document_id, storage_path, name, mime_type, size_bytes, uploaded_by_profile_id, version, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as FamilyDocumentVersion;
}
export async function getMedications(familyId: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('id, family_id, profile_id, person_profile_id, name, dosage_text, instructions, next_at, frequency, schedule_time, is_active, ends_on')
    .eq('family_id', familyId)
    .order('is_active', { ascending: false })
    .order('next_at', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Medication[];
}
export async function saveMedication(input: {
  id?: string;
  familyId: string;
  profileId: string;
  personProfileId?: string | null;
  name: string;
  dosageText: string;
  instructions?: string;
  nextAt?: string | null;
  frequency?: string | null;
  scheduleTime?: string | null;
  isActive?: boolean;
  endsOn?: string | null;
}) {
  const payload = {
    family_id: input.familyId,
    profile_id: input.profileId,
    person_profile_id: input.personProfileId ?? null,
    name: input.name.trim(),
    dosage_text: input.dosageText.trim(),
    instructions: input.instructions?.trim() || null,
    next_at: input.nextAt ?? null,
    frequency: input.frequency?.trim() || null,
    schedule_time: input.scheduleTime?.trim() || null,
    is_active: input.isActive ?? true,
    ends_on: input.endsOn ?? null,
    updated_at: new Date().toISOString(),
  };
  const query = input.id ? supabase.from('medications').update(payload).eq('id', input.id) : supabase.from('medications').insert(payload);
  const { data, error } = await query
    .select('id, family_id, profile_id, person_profile_id, name, dosage_text, instructions, next_at, frequency, schedule_time, is_active, ends_on')
    .single();
  if (error) throw new Error(error.message);
  return data as Medication;
}
export async function deleteMedication(id: string) {
  const { error } = await supabase.from('medications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveMedications(inputs: Array<{
  familyId: string;
  profileId: string;
  personProfileId?: string | null;
  name: string;
  dosageText: string;
  instructions?: string;
  nextAt?: string | null;
  frequency?: string | null;
  scheduleTime?: string | null;
  isActive?: boolean;
  endsOn?: string | null;
}>) {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('medications')
    .insert(inputs.map((input) => ({
      family_id: input.familyId,
      profile_id: input.profileId,
      person_profile_id: input.personProfileId ?? null,
      name: input.name.trim(),
      dosage_text: input.dosageText.trim(),
      instructions: input.instructions?.trim() || null,
      next_at: input.nextAt ?? null,
      frequency: input.frequency?.trim() || null,
      schedule_time: input.scheduleTime?.trim() || null,
      is_active: input.isActive ?? true,
      ends_on: input.endsOn ?? null,
    })))
    .select('id, family_id, profile_id, person_profile_id, name, dosage_text, instructions, next_at, frequency, schedule_time, is_active, ends_on')
    .returns<Medication[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmergencyContacts(familyId: string) {
  const { data, error } = await supabase
    .from('family_emergency_contacts')
    .select('id, family_id, created_by_profile_id, name, relation, phone, email, priority, is_primary, notes, created_at, updated_at')
    .eq('family_id', familyId)
    .order('is_primary', { ascending: false })
    .order('priority', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EmergencyContact[];
}

export async function saveEmergencyContact(input: {
  id?: string;
  familyId: string;
  profileId: string;
  name: string;
  relation?: string;
  phone: string;
  email?: string;
  priority?: number;
  isPrimary?: boolean;
  notes?: string;
}) {
  const payload = {
    family_id: input.familyId,
    created_by_profile_id: input.profileId,
    name: input.name.trim(),
    relation: input.relation?.trim() || null,
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    priority: input.priority ?? 50,
    is_primary: input.isPrimary ?? false,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase.from('family_emergency_contacts').update(payload).eq('id', input.id)
    : supabase.from('family_emergency_contacts').insert(payload);
  const { data, error } = await query
    .select('id, family_id, created_by_profile_id, name, relation, phone, email, priority, is_primary, notes, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return data as EmergencyContact;
}

export async function saveEmergencyContacts(inputs: Array<{
  familyId: string;
  profileId: string;
  name: string;
  relation?: string;
  phone: string;
  email?: string;
  priority?: number;
  isPrimary?: boolean;
  notes?: string;
}>) {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('family_emergency_contacts')
    .insert(inputs.map((input) => ({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      name: input.name.trim(),
      relation: input.relation?.trim() || null,
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      priority: input.priority ?? 50,
      is_primary: input.isPrimary ?? false,
      notes: input.notes?.trim() || null,
    })))
    .select('id, family_id, created_by_profile_id, name, relation, phone, email, priority, is_primary, notes, created_at, updated_at')
    .returns<EmergencyContact[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteEmergencyContact(id: string) {
  const { error } = await supabase
    .from('family_emergency_contacts')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
export async function getReminders(familyId: string) {
  const { data, error } = await supabase.from('family_reminders').select('id, family_id, title, detail, due_at, category').eq('family_id', familyId).order('due_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Reminder[];
}
export async function saveReminder(input: { id?: string; familyId: string; profileId: string; title: string; detail?: string; dueAt: string; category?: string }) {
  const payload = { family_id: input.familyId, created_by_profile_id: input.profileId, title: input.title.trim(), detail: input.detail?.trim() || null, due_at: input.dueAt, category: input.category?.trim() || 'general', updated_at: new Date().toISOString() };
  const query = input.id ? supabase.from('family_reminders').update(payload).eq('id', input.id) : supabase.from('family_reminders').insert(payload);
  const { data, error } = await query.select('id, family_id, title, detail, due_at, category').single();
  if (error) throw new Error(error.message);
  return data as Reminder;
}

export async function saveReminders(inputs: Array<{
  familyId: string;
  profileId: string;
  title: string;
  detail?: string;
  dueAt: string;
  category?: string;
}>) {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('family_reminders')
    .insert(inputs.map((input) => ({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      due_at: input.dueAt,
      category: input.category?.trim() || 'general',
    })))
    .select('id, family_id, title, detail, due_at, category')
    .returns<Reminder[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function deleteReminder(id: string) {
  const { error } = await supabase.from('family_reminders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

const familyTaskFields = 'id, family_id, created_by_profile_id, assigned_to_profile_id, list_type, title, detail, quantity, due_at, completed, created_at, updated_at';

export async function getFamilyTasks(familyId: string, listType: FamilyTask['list_type']) {
  const { data, error } = await supabase
    .from('family_tasks')
    .select(familyTaskFields)
    .eq('family_id', familyId)
    .eq('list_type', listType)
    .order('completed', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyTask[];
}

export async function createFamilyTask(input: {
  familyId: string;
  profileId: string;
  assignedToProfileId?: string | null;
  listType: FamilyTask['list_type'];
  title: string;
  detail?: string;
  quantity?: string;
  dueAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('family_tasks')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      assigned_to_profile_id: input.assignedToProfileId ?? null,
      list_type: input.listType,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      quantity: input.quantity?.trim() || null,
      due_at: input.dueAt ?? null,
    })
    .select(familyTaskFields)
    .single();
  if (error) throw new Error(error.message);
  const task = data as FamilyTask;
  await createActivityLog({
    familyId: task.family_id,
    type: 'task_created',
    entityType: 'task',
    entityId: task.id,
    summary: task.list_type === 'shopping'
      ? `Új bevásárlási tétel: ${task.title}`
      : `Új teendő: ${task.title}`,
    metadata: {
      title: task.title,
      listType: task.list_type,
      assignedToProfileId: task.assigned_to_profile_id,
      dueAt: task.due_at,
    },
  });
  return task;
}

export async function createFamilyTasks(inputs: Array<{
  familyId: string;
  profileId: string;
  assignedToProfileId?: string | null;
  listType: FamilyTask['list_type'];
  title: string;
  detail?: string;
  quantity?: string;
  dueAt?: string | null;
}>) {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('family_tasks')
    .insert(inputs.map((input) => ({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      assigned_to_profile_id: input.assignedToProfileId ?? null,
      list_type: input.listType,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      quantity: input.quantity?.trim() || null,
      due_at: input.dueAt ?? null,
    })))
    .select(familyTaskFields)
    .returns<FamilyTask[]>();
  if (error) throw new Error(error.message);
  const tasks = data ?? [];
  await Promise.all(tasks.map((task) =>
    createActivityLog({
      familyId: task.family_id,
      type: 'task_created',
      entityType: 'task',
      entityId: task.id,
      summary: task.list_type === 'shopping'
        ? `Új bevásárlási tétel: ${task.title}`
        : `Új teendő: ${task.title}`,
      metadata: {
        title: task.title,
        listType: task.list_type,
        assignedToProfileId: task.assigned_to_profile_id,
        dueAt: task.due_at,
      },
    }),
  ));
  return tasks;
}

export async function setFamilyTaskCompleted(id: string, completed: boolean) {
  const { data, error } = await supabase
    .from('family_tasks')
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(familyTaskFields)
    .single();
  if (error) throw new Error(error.message);
  const task = data as FamilyTask;
  await createActivityLog({
    familyId: task.family_id,
    type: completed ? 'task_completed' : 'task_reopened',
    entityType: 'task',
    entityId: task.id,
    summary: completed ? `Elvégezve: ${task.title}` : `Újranyitva: ${task.title}`,
    metadata: {
      title: task.title,
      listType: task.list_type,
      completed,
    },
  });
  return task;
}

export async function deleteFamilyTask(id: string) {
  const { data: task, error: taskError } = await supabase
    .from('family_tasks')
    .select(familyTaskFields)
    .eq('id', id)
    .single();
  if (taskError) throw new Error(taskError.message);

  const { error } = await supabase.from('family_tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);

  const deletedTask = task as FamilyTask;
  await createActivityLog({
    familyId: deletedTask.family_id,
    type: 'task_deleted',
    entityType: 'task',
    entityId: deletedTask.id,
    summary: `Törölt elem: ${deletedTask.title}`,
    metadata: {
      title: deletedTask.title,
      listType: deletedTask.list_type,
    },
  });
}

const schoolItemFields = 'id, family_id, child_profile_id, created_by_profile_id, item_type, title, detail, location, metadata, starts_at, due_at, completed, created_at, updated_at';

export async function getFamilySchoolItems(familyId: string, childProfileId?: string) {
  let query = supabase
    .from('family_school_items')
    .select(schoolItemFields)
    .eq('family_id', familyId)
    .order('completed', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('starts_at', { ascending: true, nullsFirst: false });
  if (childProfileId) query = query.eq('child_profile_id', childProfileId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilySchoolItem[];
}

export async function createFamilySchoolItem(input: {
  familyId: string;
  childProfileId: string;
  profileId: string;
  itemType: SchoolItemType;
  title: string;
  detail?: string;
  location?: string;
  metadata?: Record<string, string | boolean | number | null>;
  startsAt?: string | null;
  dueAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('family_school_items')
    .insert({
      family_id: input.familyId,
      child_profile_id: input.childProfileId,
      created_by_profile_id: input.profileId,
      item_type: input.itemType,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      location: input.location?.trim() || null,
      metadata: input.metadata ?? {},
      starts_at: input.startsAt ?? null,
      due_at: input.dueAt ?? null,
    })
    .select(schoolItemFields)
    .single();
  if (error) throw new Error(error.message);
  return data as FamilySchoolItem;
}

export async function createFamilySchoolItems(inputs: Array<{
  familyId: string;
  childProfileId: string;
  profileId: string;
  itemType: SchoolItemType;
  title: string;
  detail?: string;
  location?: string;
  metadata?: Record<string, string | boolean | number | null>;
  startsAt?: string | null;
  dueAt?: string | null;
}>) {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('family_school_items')
    .insert(inputs.map((input) => ({
      family_id: input.familyId,
      child_profile_id: input.childProfileId,
      created_by_profile_id: input.profileId,
      item_type: input.itemType,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      location: input.location?.trim() || null,
      metadata: input.metadata ?? {},
      starts_at: input.startsAt ?? null,
      due_at: input.dueAt ?? null,
    })))
    .select(schoolItemFields)
    .returns<FamilySchoolItem[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setFamilySchoolItemCompleted(id: string, completed: boolean) {
  const { error } = await supabase
    .from('family_school_items')
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteFamilySchoolItem(id: string) {
  const { error } = await supabase.from('family_school_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createMemory(input: {
  familyId: string;
  profileId: string;
  title: string;
  description?: string;
  memoryDate: string;
  locationName?: string;
  media?: { storagePath: string; mimeType?: string; fileSizeBytes?: number }[];
  participantProfileIds?: string[];
}) {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      memory_date: input.memoryDate,
      location_name: input.locationName?.trim() || null,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) throw new Error(error.message);

  if (input.media?.length) {
    const { error: mediaError } = await supabase.from('memory_media').insert(input.media.map((item, index) => ({
      memory_id: data.id,
      media_type: 'image',
      storage_bucket: 'memories',
      storage_path: item.storagePath,
      mime_type: item.mimeType ?? null,
      file_size_bytes: item.fileSizeBytes ?? null,
      sort_order: index,
    })));
    if (mediaError) {
      await supabase.from('memories').delete().eq('id', data.id);
      throw new Error(mediaError.message);
    }
  }
  if (input.participantProfileIds?.length) {
    const { error: participantError } = await supabase.from('memory_participants').insert(
      input.participantProfileIds.map((profileId) => ({ memory_id: data.id, profile_id: profileId })),
    );
    if (participantError) {
      await supabase.from('memories').delete().eq('id', data.id);
      throw new Error(participantError.message);
    }
  }

  return data.id;
}
