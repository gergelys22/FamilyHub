import { supabase } from '@/lib/supabase';

export type EventCategory =
 | 'family' 
 | 'birthday' 
 | 'medical' 
 | 'school' 
 | 'sport' 
 | 'administration' 
 | 'trip';

export type FamilyEvent = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
};

export async function getFamilyEvents(familyId: string, from: Date, to: Date): Promise<FamilyEvent[]> {
  const { data, error } = await supabase
    .from('family_events')
    .select('id, family_id, title, description, location_name, category, starts_at, ends_at')
    .eq('family_id', familyId)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyEvent[];
}

export async function getFamilyEvent(
  eventId: string,
): Promise<FamilyEvent> {
  const { data, error } = await supabase
    .from('family_events')
    .select(
      'id, family_id, title, description, location_name, category, starts_at, ends_at',
    )
    .eq('id', eventId)
    .single();

    if (error) throw new Error(error.message);

    return data as FamilyEvent;

}

export async function createFamilyEvent(input: {
  familyId: string;
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  startsAt: Date;
  endsAt?: Date;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_family_event', {
    target_family_id: input.familyId,
    event_title: input.title.trim(),
    event_description: input.description.trim(),
    event_location: input.location.trim(),
    event_category: input.category,
    event_starts_at: input.startsAt.toISOString(),
    event_ends_at: input.endsAt?.toISOString() ?? null,
  });

  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Az esemény létrehozása sikertelen.');
  return data;
}

export async function updateFamilyEvent(
  eventId: string,
  input: {
    title: string;
    description: string;
    location: string;
    category: EventCategory;
    startsAt: Date;
    endsAt?: Date;
  },
):Promise<void> {
  const { error } = await supabase
    .from('family_events')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      location_name: input.location.trim() || null,
      category: input.category,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId);

    if (error) throw new Error(error.message);  
}

export async function deleteFamilyEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('family_events')
    .delete()
    .eq('id', eventId);

  if (error) throw new Error(error.message);
}