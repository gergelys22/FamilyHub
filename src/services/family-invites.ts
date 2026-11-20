import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

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
  if (typeof data !== 'string')
    throw new Error('A meghívás nem adott vissza érvényes azonosítót.');

  const { data: emailData, error: emailError } = await supabase.functions.invoke<{
    sent?: boolean;
  }>('send-family-invite', {
    body: { inviteId: data, familyName: await getFamilyName(familyId) },
  });

  if (emailError) {
    if (emailError instanceof FunctionsHttpError) {
      const body = await emailError.context.json().catch(() => null);
      if (typeof body?.error === 'string') {
        throw new InviteCreatedError(data, body.error);
      }
    }
    throw new InviteCreatedError(data, 'A meghívás rögzült, de az e-mail küldése sikertelen.');
  }
  if (!emailData?.sent) {
    throw new InviteCreatedError(data, 'A meghívás rögzült, de az e-mail küldése sikertelen.');
  }

  return data;
}

export class InviteCreatedError extends Error {
  readonly inviteId: string;

  constructor(inviteId: string, message: string) {
    super(message);
    this.name = 'InviteCreatedError';
    this.inviteId = inviteId;
  }
}

async function getFamilyName(familyId: string): Promise<string> {
  const { data } = await supabase
    .from('families')
    .select('name')
    .eq('id', familyId)
    .maybeSingle();
  return data?.name?.trim() || 'Családi kör';
}

export async function getMyFamilyInvites(): Promise<FamilyInvite[]> {
  const { data, error } = await supabase.rpc('get_my_family_invites');

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as {
      invite_id: string;
      family_id: string;
      family_name: string;
      intended_role: InviteRole;
    }[]
  ).map((invite) => ({
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
