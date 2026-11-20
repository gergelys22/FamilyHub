begin;

create table if not exists public.family_safety_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  blood_type text,
  allergies text[] not null default '{}'::text[],
  medical_conditions text,
  medications_summary text,
  emergency_notes text,
  doctor_name text,
  doctor_phone text,
  insurance_name text,
  insurance_number text,
  restricted boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create table if not exists public.family_safety_checks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text,
  completed boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_safety_profiles_family_idx
  on public.family_safety_profiles(family_id, profile_id);
create index if not exists family_safety_checks_family_idx
  on public.family_safety_checks(family_id, completed, due_at);

alter table public.family_safety_profiles enable row level security;
alter table public.family_safety_checks enable row level security;

revoke all on table public.family_safety_profiles from anon, authenticated;
revoke all on table public.family_safety_checks from anon, authenticated;
grant select, insert, update, delete on public.family_safety_profiles to authenticated;
grant select, insert, update, delete on public.family_safety_checks to authenticated;

drop policy if exists family_safety_profiles_select on public.family_safety_profiles;
create policy family_safety_profiles_select
on public.family_safety_profiles
for select to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    not restricted
    or profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

drop policy if exists family_safety_profiles_insert on public.family_safety_profiles;
create policy family_safety_profiles_insert
on public.family_safety_profiles
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and (
    profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

drop policy if exists family_safety_profiles_update on public.family_safety_profiles;
create policy family_safety_profiles_update
on public.family_safety_profiles
for update to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
)
with check (
  (select private.is_family_member(family_id))
  and (
    profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

drop policy if exists family_safety_profiles_delete on public.family_safety_profiles;
create policy family_safety_profiles_delete
on public.family_safety_profiles
for delete to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

drop policy if exists family_safety_checks_select on public.family_safety_checks;
create policy family_safety_checks_select
on public.family_safety_checks
for select to authenticated
using ((select private.is_family_member(family_id)));

drop policy if exists family_safety_checks_insert on public.family_safety_checks;
create policy family_safety_checks_insert
on public.family_safety_checks
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_safety_checks_update on public.family_safety_checks;
create policy family_safety_checks_update
on public.family_safety_checks
for update to authenticated
using ((select private.is_family_member(family_id)))
with check ((select private.is_family_member(family_id)));

drop policy if exists family_safety_checks_delete on public.family_safety_checks;
create policy family_safety_checks_delete
on public.family_safety_checks
for delete to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    created_by_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

commit;
