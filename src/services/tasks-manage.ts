import { supabase } from '@/lib/supabase';

// A family_tasks_update policy szerint a család bármely tagja módosíthat.
// Ha a RLS mégsem enged, a PostgREST hiba nélkül 0 sort módosít, ezért a .select('id') alapján ellenőrzünk.
export async function updateFamilyTask(
  id: string,
  input: {
    title: string;
    detail: string;
    quantity: string;
    assignedToProfileId: string | null;
    dueAt: string | null;
  },
) {
  const { data, error } = await supabase
    .from('family_tasks')
    .update({
      title: input.title.trim(),
      detail: input.detail.trim() || null,
      quantity: input.quantity.trim() || null,
      assigned_to_profile_id: input.assignedToProfileId,
      due_at: input.dueAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('A módosítás nem sikerült, vagy nincs jogosultságod hozzá.');
  }
}