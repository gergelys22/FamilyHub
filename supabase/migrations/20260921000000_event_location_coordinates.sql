begin;

alter table public.family_events
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision;

alter table public.family_events
  drop constraint if exists family_events_valid_location_coordinates;

alter table public.family_events
  add constraint family_events_valid_location_coordinates
  check (
    (location_latitude is null and location_longitude is null)
    or (
      location_name is not null
      and location_latitude between -90 and 90
      and location_longitude between -180 and 180
    )
  );

create or replace function public.create_family_event(
  target_family_id uuid,
  event_title text,
  event_description text,
  event_location text,
  event_category text,
  event_starts_at timestamptz,
  event_ends_at timestamptz default null,
  event_location_latitude double precision default null,
  event_location_longitude double precision default null
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

  if (event_location_latitude is null) <> (event_location_longitude is null) then
    raise exception 'A helyszín koordinátáit párban kell megadni.';
  end if;

  if event_location_latitude is not null and (
    event_location_latitude not between -90 and 90
    or event_location_longitude not between -180 and 180
  ) then
    raise exception 'A helyszín koordinátái érvénytelenek.';
  end if;

  insert into public.family_events (
    family_id,
    created_by_profile_id,
    title,
    description,
    location_name,
    location_latitude,
    location_longitude,
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
    event_location_latitude,
    event_location_longitude,
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

revoke all on function public.create_family_event(uuid, text, text, text, text, timestamptz, timestamptz, double precision, double precision)
  from public, anon;
grant execute on function public.create_family_event(uuid, text, text, text, text, timestamptz, timestamptz, double precision, double precision)
  to authenticated;

commit;
