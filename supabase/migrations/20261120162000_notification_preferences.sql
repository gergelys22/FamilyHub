begin;

create table if not exists public.family_notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  enabled_types text[] not null default array[
    'family_invite',
    'calendar',
    'task',
    'medicine',
    'reminder',
    'document',
    'location',
    'memory'
  ]::text[],
  muted_member_ids uuid[] not null default '{}'::uuid[],
  quiet_start smallint,
  quiet_end smallint,
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

alter table public.family_notification_preferences enable row level security;

revoke all on table public.family_notification_preferences from anon, authenticated;
grant select, insert, update on table public.family_notification_preferences to authenticated;

drop policy if exists notification_preferences_select_own on public.family_notification_preferences;
create policy notification_preferences_select_own
on public.family_notification_preferences
for select to authenticated
using (profile_id = (select private.current_profile_id()));

drop policy if exists notification_preferences_insert_own on public.family_notification_preferences;
create policy notification_preferences_insert_own
on public.family_notification_preferences
for insert to authenticated
with check (
  profile_id = (select private.current_profile_id())
  and (select private.is_family_member(family_id))
);

drop policy if exists notification_preferences_update_own on public.family_notification_preferences;
create policy notification_preferences_update_own
on public.family_notification_preferences
for update to authenticated
using (profile_id = (select private.current_profile_id()))
with check (
  profile_id = (select private.current_profile_id())
  and (select private.is_family_member(family_id))
);

commit;
