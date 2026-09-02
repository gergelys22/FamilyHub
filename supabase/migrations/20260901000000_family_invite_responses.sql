begin;

create or replace function public.get_my_family_invites()
returns table (
  invite_id uuid,
  family_id uuid,
  family_name text,
  intended_role public.family_access_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select fi.id, fi.family_id, f.name, fi.intended_role
  from public.family_invites fi
  join public.families f on f.id = fi.family_id
  where lower(fi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by fi.id
$$;

create or replace function public.accept_family_invite(target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_invite public.family_invites%rowtype;
  current_profile_id uuid;
begin
  current_profile_id := private.current_profile_id();
  if current_profile_id is null then
    raise exception 'A felhasználói profil nem található.';
  end if;

  select * into selected_invite
  from public.family_invites fi
  where fi.id = target_invite_id
    and lower(fi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  for update;

  if not found then
    raise exception 'A meghívás nem található vagy nem ehhez a fiókhoz tartozik.';
  end if;

  if not exists (
    select 1 from public.family_members fm
    where fm.family_id = selected_invite.family_id
      and fm.profile_id = current_profile_id
  ) then
    insert into public.family_members (family_id, profile_id, access_role)
    values (selected_invite.family_id, current_profile_id, selected_invite.intended_role);
  end if;

  delete from public.family_invites where id = selected_invite.id;

  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  values (
    selected_invite.invited_by_profile_id,
    'Meghívás elfogadva',
    'A meghívott családtag csatlakozott a családi térhez.',
    'family_invite_accepted',
    jsonb_build_object('familyId', selected_invite.family_id, 'profileId', current_profile_id)
  );

  return selected_invite.family_id;
end;
$$;

create or replace function public.reject_family_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_invite public.family_invites%rowtype;
begin
  select * into selected_invite
  from public.family_invites fi
  where fi.id = target_invite_id
    and lower(fi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  for update;

  if not found then
    raise exception 'A meghívás nem található vagy nem ehhez a fiókhoz tartozik.';
  end if;

  delete from public.family_invites where id = selected_invite.id;

  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  values (
    selected_invite.invited_by_profile_id,
    'Meghívás elutasítva',
    'A meghívott felhasználó elutasította a családi meghívást.',
    'family_invite_rejected',
    jsonb_build_object('familyId', selected_invite.family_id)
  );
end;
$$;

create or replace function private.notify_family_invitee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
  target_family_name text;
begin
  select p.id into target_profile_id
  from auth.users u
  join public.profiles p on p.auth_user_id = u.id
  where lower(u.email) = lower(new.invited_email)
  limit 1;

  if target_profile_id is null then
    return new;
  end if;

  select f.name into target_family_name
  from public.families f
  where f.id = new.family_id;

  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  values (
    target_profile_id,
    'Új családi meghívás',
    'Meghívtak a(z) ' || coalesce(target_family_name, 'ismeretlen') || ' családi térbe.',
    'family_invite',
    jsonb_build_object('inviteId', new.id, 'familyId', new.family_id)
  );

  return new;
end;
$$;

drop trigger if exists on_family_invite_created on public.family_invites;
create trigger on_family_invite_created
  after insert on public.family_invites
  for each row execute function private.notify_family_invitee();

revoke all on function public.get_my_family_invites() from public, anon;
revoke all on function public.accept_family_invite(uuid) from public, anon;
revoke all on function public.reject_family_invite(uuid) from public, anon;
revoke all on function private.notify_family_invitee() from public, anon, authenticated;

grant execute on function public.get_my_family_invites() to authenticated;
grant execute on function public.accept_family_invite(uuid) to authenticated;
grant execute on function public.reject_family_invite(uuid) to authenticated;

commit;
