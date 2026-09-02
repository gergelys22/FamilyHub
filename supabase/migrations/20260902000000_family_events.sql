begin;

create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text,
  location_name text,
  category text not null default 'family',
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_events_valid_period check (ends_at is null or ends_at >= starts_at)
);

create index if not exists family_events_family_starts_idx
  on public.family_events(family_id, starts_at);

alter table public.family_events enable row level security;
revoke all on table public.family_events from anon, authenticated;
grant select, insert, update, delete on table public.family_events to authenticated;

drop policy if exists family_events_select_member on public.family_events;
create policy family_events_select_member on public.family_events
for select to authenticated
using ((select private.is_family_member(family_id)));

drop policy if exists family_events_insert_member on public.family_events;
create policy family_events_insert_member on public.family_events
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_events_update_creator_or_admin on public.family_events;
create policy family_events_update_creator_or_admin on public.family_events
for update to authenticated
using (
  created_by_profile_id = (select private.current_profile_id())
  or (select private.is_family_admin(family_id))
)
with check (
  created_by_profile_id = (select private.current_profile_id())
  or (select private.is_family_admin(family_id))
);

drop policy if exists family_events_delete_creator_or_admin on public.family_events;
create policy family_events_delete_creator_or_admin on public.family_events
for delete to authenticated
using (
  created_by_profile_id = (select private.current_profile_id())
  or (select private.is_family_admin(family_id))
);

create or replace function public.create_family_event(
  target_family_id uuid,
  event_title text,
  event_description text,
  event_location text,
  event_category text,
  event_starts_at timestamptz,
  event_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_event_id uuid;
  creator_profile_id uuid;
begin
  creator_profile_id := private.current_profile_id();

  if creator_profile_id is null or not private.is_family_member(target_family_id) then
    raise exception 'Nincs jogosultságod eseményt létrehozni ebben a családban.';
  end if;

  if char_length(btrim(event_title)) < 2 then
    raise exception 'Az esemény címe legalább 2 karakter legyen.';
  end if;

  if event_ends_at is not null and event_ends_at < event_starts_at then
    raise exception 'A befejezés nem lehet korábban a kezdésnél.';
  end if;

  insert into public.family_events (
    family_id,
    created_by_profile_id,
    title,
    description,
    location_name,
    category,
    starts_at,
    ends_at
  )
  values (
    target_family_id,
    creator_profile_id,
    btrim(event_title),
    nullif(btrim(event_description), ''),
    nullif(btrim(event_location), ''),
    coalesce(nullif(btrim(event_category), ''), 'family'),
    event_starts_at,
    event_ends_at
  )
  returning id into new_event_id;

  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  select
    fm.profile_id,
    'Új családi esemény',
    btrim(event_title),
    'calendar',
    jsonb_build_object('eventId', new_event_id, 'familyId', target_family_id)
  from public.family_members fm
  where fm.family_id = target_family_id
    and fm.profile_id <> creator_profile_id;

  return new_event_id;
end;
$$;

revoke all on function public.create_family_event(uuid, text, text, text, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.create_family_event(uuid, text, text, text, text, timestamptz, timestamptz)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'family_events'
  ) then
    alter publication supabase_realtime add table public.family_events;
  end if;
end
$$;

commit;
