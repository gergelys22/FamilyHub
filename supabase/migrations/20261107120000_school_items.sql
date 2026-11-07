begin;

create table if not exists public.family_school_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  item_type text not null check (item_type in ('timetable', 'homework', 'exam', 'workout', 'meeting')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  detail text,
  location text,
  metadata jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_school_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists family_school_items_filter_idx
  on public.family_school_items(family_id, child_profile_id, item_type, due_at nulls last, starts_at nulls last);

alter table public.family_school_items enable row level security;

grant select, insert, update, delete on public.family_school_items to authenticated;

drop policy if exists family_school_items_select on public.family_school_items;
drop policy if exists family_school_items_insert on public.family_school_items;
drop policy if exists family_school_items_update on public.family_school_items;
drop policy if exists family_school_items_delete on public.family_school_items;

create policy family_school_items_select on public.family_school_items
for select to authenticated
using ((select private.is_family_member(family_id)));

create policy family_school_items_insert on public.family_school_items
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = family_school_items.family_id
      and fm.profile_id = family_school_items.child_profile_id
  )
);

create policy family_school_items_update on public.family_school_items
for update to authenticated
using ((select private.is_family_member(family_id)))
with check (
  (select private.is_family_member(family_id))
  and exists (
    select 1 from public.family_members fm
    where fm.family_id = family_school_items.family_id
      and fm.profile_id = family_school_items.child_profile_id
  )
);

create policy family_school_items_delete on public.family_school_items
for delete to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    created_by_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

commit;
