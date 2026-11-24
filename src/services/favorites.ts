import { supabase } from '@/lib/supabase';

export type FavoriteType = 'memory' | 'recipe' | 'post';

export type Favorite = {
  item_type: FavoriteType;
  item_id: string;
  created_at: string;
};

export function favoriteKey(type: FavoriteType, id: string) {
  return `${type}:${id}`;
}

export async function getFavorites(profileId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('item_type, item_id, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Favorite[];
}

export async function setFavorite(profileId: string, type: FavoriteType, id: string, value: boolean) {
  if (value) {
    const { error } = await supabase
      .from('favorites')
      .upsert({ profile_id: profileId, item_type: type, item_id: id }, { onConflict: 'profile_id,item_type,item_id' });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('profile_id', profileId)
    .eq('item_type', type)
    .eq('item_id', id);
  if (error) throw error;
}
