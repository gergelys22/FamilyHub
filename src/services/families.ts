import { supabase } from '@/lib/supabase';

export type Family = {
  id: string;
  name: string;
  created_at: string;
};

export type FamilyMember = {
  profile_id: string;
  display_name: string;
  birth_date: string | null;
  avatar_path: string | null;
  access_role: string;
  nickname: string | null;
};

export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('family_members')
    .select('profile_id, access_role, nickname')
    .eq('family_id', familyId);

  if (membershipError) throw new Error(membershipError.message);
  if (!memberships?.length) return [];

  const profileIds = memberships.map((membership) => membership.profile_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, avatar_path')
    .in('id', profileIds);

  if (profilesError) throw new Error(profilesError.message);
  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));

  return memberships.flatMap((membership) => {
    const profile = profileById.get(membership.profile_id);
    return profile
      ? [{
          profile_id: membership.profile_id,
          display_name: profile.display_name,
          birth_date: profile.birth_date,
          avatar_path: profile.avatar_path,
          access_role: membership.access_role,
          nickname: membership.nickname,
        }]
      : [];
  }) as FamilyMember[];
}

export async function getProfile(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, avatar_path')
    .eq('id', profileId)
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; display_name: string; birth_date: string | null; avatar_path: string | null };
}

export async function createFamily(name: string): Promise<string> {
  const normalizedName = name.trim();

  if (normalizedName.length < 2) {
    throw new Error('A család neve legalább 2 karakter hosszú kell legyen.');
  }

  const { data, error } = await supabase.rpc('create_family', {
    family_name: normalizedName,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data !== 'string') {
    throw new Error('A család létrehozása nem adott vissza érvényes azonosítót.');
  }

  return data;
}

export async function getMyFamilies(): Promise<Family[]> {
  const { data, error } = await supabase
    .from('families')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Family[];
}
