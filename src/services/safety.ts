import { supabase } from '@/lib/supabase';
import { createActivityLog } from '@/services/activity';

export type SafetyProfile = {
  id: string;
  family_id: string;
  profile_id: string;
  blood_type: string | null;
  allergies: string[];
  medical_conditions: string | null;
  medications_summary: string | null;
  emergency_notes: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  insurance_name: string | null;
  insurance_number: string | null;
  restricted: boolean;
  updated_at: string;
};

export type SafetyCheck = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSafetyProfiles(familyId: string) {
  const { data, error } = await supabase
    .from('family_safety_profiles')
    .select('*')
    .eq('family_id', familyId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SafetyProfile[];
}

export async function saveSafetyProfile(input: {
  familyId: string;
  profileId: string;
  bloodType?: string;
  allergies?: string[];
  medicalConditions?: string;
  medicationsSummary?: string;
  emergencyNotes?: string;
  doctorName?: string;
  doctorPhone?: string;
  insuranceName?: string;
  insuranceNumber?: string;
  restricted?: boolean;
}) {
  const payload = {
    family_id: input.familyId,
    profile_id: input.profileId,
    blood_type: input.bloodType?.trim() || null,
    allergies: input.allergies ?? [],
    medical_conditions: input.medicalConditions?.trim() || null,
    medications_summary: input.medicationsSummary?.trim() || null,
    emergency_notes: input.emergencyNotes?.trim() || null,
    doctor_name: input.doctorName?.trim() || null,
    doctor_phone: input.doctorPhone?.trim() || null,
    insurance_name: input.insuranceName?.trim() || null,
    insurance_number: input.insuranceNumber?.trim() || null,
    restricted: input.restricted ?? false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('family_safety_profiles')
    .upsert(payload, { onConflict: 'family_id,profile_id' })
    .select('*')
    .single();
  if (error) throw error;
  const profile = data as SafetyProfile;
  await createActivityLog({
    familyId: input.familyId,
    type: 'safety_profile_updated',
    entityType: 'safety_profile',
    entityId: profile.id,
    summary: 'Sürgősségi egészségügyi adatok frissítve',
    metadata: { profileId: input.profileId, restricted: input.restricted ?? false },
  });
  return profile;
}

export async function getSafetyChecks(familyId: string) {
  const { data, error } = await supabase
    .from('family_safety_checks')
    .select('*')
    .eq('family_id', familyId)
    .order('completed', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as SafetyCheck[];
}

export async function saveSafetyCheck(input: {
  familyId: string;
  profileId: string;
  title: string;
  description?: string;
  dueAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('family_safety_checks')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_at: input.dueAt ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  const check = data as SafetyCheck;
  await createActivityLog({
    familyId: input.familyId,
    type: 'safety_check_created',
    entityType: 'safety_check',
    entityId: check.id,
    summary: `Új biztonsági ellenőrzés: ${input.title.trim()}`,
    metadata: { title: input.title.trim(), dueAt: input.dueAt ?? null },
  });
  return check;
}

export async function setSafetyCheckCompleted(id: string, completed: boolean) {
  const { data, error } = await supabase
    .from('family_safety_checks')
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const check = data as SafetyCheck;
  await createActivityLog({
    familyId: check.family_id,
    type: 'safety_check_completed',
    entityType: 'safety_check',
    entityId: check.id,
    summary: completed
      ? `Biztonsági ellenőrzés kész: ${check.title}`
      : `Biztonsági ellenőrzés újranyitva: ${check.title}`,
    metadata: { title: check.title, completed },
  });
}
