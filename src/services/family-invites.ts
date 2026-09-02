import { supabase } from '@/lib/supabase';

export type InviteRole = 'adult' | 'dependent' | 'viewer';

export type FamilyInvite = {
  id: string;
  family_id: string;
  family_name: string;
  intended_role: InviteRole;
};

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

export async function getMyFamilyInvites(): Promise<FamilyInvite[]> {
  const { data, error } = await supabase.rpc('get_my_family_invites');

  if (error) throw new Error(error.message);

  return ((data ?? []) as {
    invite_id: string;
    family_id: string;
    family_name: string;
    intended_role: InviteRole;
  }[]).map((invite) => ({
    id: invite.invite_id,
    family_id: invite.family_id,
    family_name: invite.family_name,
    intended_role: invite.intended_role,
  }));
}

export async function acceptFamilyInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_family_invite', {
    target_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('A meghívás elfogadása nem sikerült.');

  return data;
}

export async function rejectFamilyInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_family_invite', {
    target_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);
}
