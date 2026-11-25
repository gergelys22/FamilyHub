import { supabase } from '@/lib/supabase';

export type MemoryEdit = {
  title: string;
  description: string;
  memoryDate: string; // ÉÉÉÉ-HH-NN
  locationName: string;
};

export async function updateMemory(id: string, input: MemoryEdit) {
  const { data, error } = await supabase
    .from('memories')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      memory_date: input.memoryDate,
      location_name: input.locationName.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  // Ha a RLS nem engedi, a PostgREST hiba nélkül 0 sort módosít.
  if (!data || data.length === 0) throw new Error('Csak a létrehozó vagy a család adminja szerkesztheti az emléket.');
}

/** Törli az emléket; a fotók fájljait is eltávolítja a tárolóból (best effort). */
export async function deleteMemory(id: string) {
  const { data: media } = await supabase
    .from('memory_media')
    .select('storage_bucket, storage_path')
    .eq('memory_id', id);

  const { data, error } = await supabase.from('memories').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Csak a létrehozó vagy a család adminja törölheti az emléket.');

  const byBucket = new Map<string, string[]>();
  (media ?? []).forEach((item) => {
    const list = byBucket.get(item.storage_bucket) ?? [];
    list.push(item.storage_path);
    byBucket.set(item.storage_bucket, list);
  });
  for (const [bucket, paths] of byBucket) {
    await supabase.storage.from(bucket).remove(paths);
  }
}
