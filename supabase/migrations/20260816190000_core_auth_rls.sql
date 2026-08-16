begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_profile_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select p.id from public.profiles p
  where p.auth_user_id = (select auth.uid()) limit 1
$$;

create or replace function private.is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = private.current_profile_id()
  )
$$;

create or replace function private.is_family_admin(target_family_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = private.current_profile_id()
      and fm.access_role in (
        'owner'::public.family_access_role,
        'admin'::public.family_access_role
      )
  )
$$;

create or replace function private.is_family_owner(target_family_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = private.current_profile_id()
      and fm.access_role = 'owner'::public.family_access_role
  )
$$;

create or replace function private.is_family_creator(target_family_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.families f
    where f.id = target_family_id
      and f.created_by_user_id = private.current_profile_id()
  )
$$;

create or replace function private.shares_family_with(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.profile_id = private.current_profile_id()
      and theirs.profile_id = target_profile_id
  )
$$;

create or replace function private.can_manage_member(
  target_family_id uuid,
  target_role public.family_access_role
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when private.is_family_owner(target_family_id) then
      target_role <> 'owner'::public.family_access_role
    when private.is_family_admin(target_family_id) then
      target_role in (
        'adult'::public.family_access_role,
        'dependent'::public.family_access_role,
        'viewer'::public.family_access_role
      )
    else false
  end
$$;

revoke all on function private.current_profile_id() from public, anon;
revoke all on function private.is_family_member(uuid) from public, anon;
revoke all on function private.is_family_admin(uuid) from public, anon;
revoke all on function private.is_family_owner(uuid) from public, anon;
revoke all on function private.is_family_creator(uuid) from public, anon;
revoke all on function private.shares_family_with(uuid) from public, anon;
revoke all on function private.can_manage_member(uuid, public.family_access_role) from public, anon;

grant execute on function private.current_profile_id() to authenticated, service_role;
grant execute on function private.is_family_member(uuid) to authenticated, service_role;
grant execute on function private.is_family_admin(uuid) to authenticated, service_role;
grant execute on function private.is_family_owner(uuid) to authenticated, service_role;
grant execute on function private.is_family_creator(uuid) to authenticated, service_role;
grant execute on function private.shares_family_with(uuid) to authenticated, service_role;
grant execute on function private.can_manage_member(uuid, public.family_access_role)
  to authenticated, service_role;

-- A regisztráció automatikusan létrehozza a hozzá tartozó account profilt.
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, display_name, profile_type)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Felhasználó'
    ),
    'account'::public.profile_type
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create index if not exists family_members_profile_id_idx
  on public.family_members (profile_id);
create index if not exists family_invites_invited_email_idx
  on public.family_invites (lower(invited_email));

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.families from anon, authenticated;
revoke all on table public.family_members from anon, authenticated;
revoke all on table public.family_invites from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (display_name, birth_date, avatar_path, updated_at)
  on table public.profiles to authenticated;
grant select, insert, delete on table public.families to authenticated;
grant update (name, updated_at) on table public.families to authenticated;
grant select, insert, delete on table public.family_members to authenticated;
grant update (access_role, nickname, updated_at)
  on table public.family_members to authenticated;
grant select, insert on table public.family_invites to authenticated;

drop policy if exists profiles_select_family on public.profiles;
create policy profiles_select_family on public.profiles
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or (select private.shares_family_with(id))
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  auth_user_id = (select auth.uid())
  and profile_type = 'account'::public.profile_type
  and created_by_user_id is null
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (
  auth_user_id = (select auth.uid())
  and profile_type = 'account'::public.profile_type
  and created_by_user_id is null
);

drop policy if exists families_select_member on public.families;
create policy families_select_member on public.families
for select to authenticated
using (
  (select private.is_family_member(id))
  or created_by_user_id = (select private.current_profile_id())
);

drop policy if exists families_insert_self on public.families;
create policy families_insert_self on public.families
for insert to authenticated
with check (created_by_user_id = (select private.current_profile_id()));

drop policy if exists families_update_admin on public.families;
create policy families_update_admin on public.families
for update to authenticated
using ((select private.is_family_admin(id)))
with check ((select private.is_family_admin(id)));

drop policy if exists families_delete_owner on public.families;
create policy families_delete_owner on public.families
for delete to authenticated
using ((select private.is_family_owner(id)));

drop policy if exists family_members_select_family on public.family_members;
create policy family_members_select_family on public.family_members
for select to authenticated
using (
  (select private.is_family_member(family_id))
  or (
    profile_id = (select private.current_profile_id())
    and (select private.is_family_creator(family_id))
  )
);

drop policy if exists family_members_insert_managed on public.family_members;
create policy family_members_insert_managed on public.family_members
for insert to authenticated
with check (
  (
    profile_id = (select private.current_profile_id())
    and access_role = 'owner'::public.family_access_role
    and (select private.is_family_creator(family_id))
  )
  or (select private.can_manage_member(family_id, access_role))
);

drop policy if exists family_members_update_managed on public.family_members;
create policy family_members_update_managed on public.family_members
for update to authenticated
using ((select private.can_manage_member(family_id, access_role)))
with check ((select private.can_manage_member(family_id, access_role)));

drop policy if exists family_members_delete_managed on public.family_members;
create policy family_members_delete_managed on public.family_members
for delete to authenticated
using ((select private.can_manage_member(family_id, access_role)));

drop policy if exists family_invites_select_allowed on public.family_invites;
create policy family_invites_select_allowed on public.family_invites
for select to authenticated
using (
  (select private.is_family_admin(family_id))
  or lower(invited_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

drop policy if exists family_invites_insert_admin on public.family_invites;
create policy family_invites_insert_admin on public.family_invites
for insert to authenticated
with check (
  (select private.is_family_admin(family_id))
  and invited_by_profile_id = (select private.current_profile_id())
  and intended_role <> 'owner'::public.family_access_role
);

commit;
