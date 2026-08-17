import { supabase } from '@/lib/supabase';

export type InviteRole = 'adult' | 'dependent' | 'viewer';

export async function createFamilyInvite(
  familyId: string,
  email: string,
  role: InviteRole,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_family_invite', {
    target_family_id: familyId,
    invited_email: email.trim().toLowerCase(),
    intended_role: role,
  });

  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('A meghívás nem adott vissza érvényes azonosítót.');

  return data;
}
