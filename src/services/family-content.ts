import { supabase } from '@/lib/supabase';

export type FamilyDocument = { id: string; family_id: string; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string };
export type Medication = { id: string; family_id: string; profile_id: string; name: string; dosage_text: string | null; instructions: string | null; next_at: string | null };
export type Reminder = { id: string; family_id: string; title: string; detail: string | null; due_at: string; category: string };

export async function getFamilyDocuments(familyId: string) {
  const { data, error } = await supabase.from('family_documents').select('id, family_id, name, storage_path, mime_type, size_bytes, created_at').eq('family_id', familyId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyDocument[];
}
export async function createFamilyDocument(input: { familyId: string; profileId: string; name: string; storagePath: string; mimeType?: string; sizeBytes?: number }) {
  const { data, error } = await supabase.from('family_documents').insert({ family_id: input.familyId, uploaded_by_profile_id: input.profileId, name: input.name.trim(), storage_path: input.storagePath, mime_type: input.mimeType ?? null, size_bytes: input.sizeBytes ?? null }).select('id, family_id, name, storage_path, mime_type, size_bytes, created_at').single();
  if (error) throw new Error(error.message);
  return data as FamilyDocument;
}
export async function deleteFamilyDocument(document: FamilyDocument) {
  const { error: storageError } = await supabase.storage.from('family-documents').remove([document.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from('family_documents').delete().eq('id', document.id);
  if (error) throw new Error(error.message);
}
export async function getMedications(familyId: string) {
  const { data, error } = await supabase.from('medications').select('id, family_id, profile_id, name, dosage_text, instructions, next_at').eq('family_id', familyId).order('next_at', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Medication[];
}
export async function saveMedication(input: { id?: string; familyId: string; profileId: string; name: string; dosageText: string; instructions?: string; nextAt?: string | null }) {
  const payload = { family_id: input.familyId, profile_id: input.profileId, name: input.name.trim(), dosage_text: input.dosageText.trim(), instructions: input.instructions?.trim() || null, next_at: input.nextAt ?? null, updated_at: new Date().toISOString() };
  const query = input.id ? supabase.from('medications').update(payload).eq('id', input.id) : supabase.from('medications').insert(payload);
  const { data, error } = await query.select('id, family_id, profile_id, name, dosage_text, instructions, next_at').single();
  if (error) throw new Error(error.message);
  return data as Medication;
}
export async function deleteMedication(id: string) {
  const { error } = await supabase.from('medications').delete().eq('id', id);
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
export async function deleteReminder(id: string) {
  const { error } = await supabase.from('family_reminders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
