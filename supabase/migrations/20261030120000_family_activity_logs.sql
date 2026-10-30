begin;

create table if not exists public.family_activity_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null default private.current_profile_id(),
  type text not null check (char_length(btrim(type)) between 2 and 80),
  entity_type text not null check (char_length(btrim(entity_type)) between 2 and 80),
  entity_id uuid,
  summary text not null check (char_length(btrim(summary)) between 1 and 240),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists family_activity_logs_family_created_idx
  on public.family_activity_logs(family_id, created_at desc);

create index if not exists family_activity_logs_actor_idx
  on public.family_activity_logs(actor_profile_id, created_at desc);

alter table public.family_activity_logs enable row level security;

grant select, insert on public.family_activity_logs to authenticated;

drop policy if exists family_activity_logs_select on public.family_activity_logs;
drop policy if exists family_activity_logs_insert on public.family_activity_logs;

create policy family_activity_logs_select on public.family_activity_logs
for select to authenticated
using ((select private.is_family_member(family_id)));

create policy family_activity_logs_insert on public.family_activity_logs
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and actor_profile_id = (select private.current_profile_id())
);

commit;
