begin;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  notification_type text not null default 'general',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_target_created_idx
  on public.app_notifications(target_profile_id, created_at desc);

alter table public.app_notifications enable row level security;
revoke all on table public.app_notifications from anon, authenticated;
grant select, update (read_at), delete on table public.app_notifications to authenticated;

drop policy if exists app_notifications_select_own on public.app_notifications;
create policy app_notifications_select_own on public.app_notifications
for select to authenticated
using (target_profile_id = (select private.current_profile_id()));

drop policy if exists app_notifications_update_own on public.app_notifications;
create policy app_notifications_update_own on public.app_notifications
for update to authenticated
using (target_profile_id = (select private.current_profile_id()))
with check (target_profile_id = (select private.current_profile_id()));

drop policy if exists app_notifications_delete_own on public.app_notifications;
create policy app_notifications_delete_own on public.app_notifications
for delete to authenticated
using (target_profile_id = (select private.current_profile_id()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_notifications'
  ) then
    alter publication supabase_realtime add table public.app_notifications;
  end if;
end
$$;

commit;
