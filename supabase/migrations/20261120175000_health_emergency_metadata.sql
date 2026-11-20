begin;

alter table public.medications
  add column if not exists person_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists frequency text,
  add column if not exists schedule_time text,
  add column if not exists is_active boolean not null default true,
  add column if not exists ends_on date;

create table if not exists public.family_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  relation text,
  phone text not null check (char_length(btrim(phone)) between 3 and 40),
  email text,
  priority integer not null default 50 check (priority between 1 and 100),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_emergency_contacts_family_idx
  on public.family_emergency_contacts(family_id, is_primary desc, priority asc);

alter table public.family_emergency_contacts enable row level security;
revoke all on table public.family_emergency_contacts from anon, authenticated;
grant select, insert, update, delete on public.family_emergency_contacts to authenticated;

drop policy if exists family_emergency_contacts_select on public.family_emergency_contacts;
create policy family_emergency_contacts_select
on public.family_emergency_contacts
for select to authenticated
using ((select private.is_family_member(family_id)));

drop policy if exists family_emergency_contacts_insert on public.family_emergency_contacts;
create policy family_emergency_contacts_insert
on public.family_emergency_contacts
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_emergency_contacts_update on public.family_emergency_contacts;
create policy family_emergency_contacts_update
on public.family_emergency_contacts
for update to authenticated
using ((select private.is_family_member(family_id)))
with check ((select private.is_family_member(family_id)));

drop policy if exists family_emergency_contacts_delete on public.family_emergency_contacts;
create policy family_emergency_contacts_delete
on public.family_emergency_contacts
for delete to authenticated
using ((select private.is_family_member(family_id)));

commit;
