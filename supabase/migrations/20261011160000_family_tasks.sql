begin;

create table if not exists public.family_tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  list_type text not null default 'task' check (list_type in ('task', 'shopping')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  detail text,
  quantity text,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_tasks_family_idx
  on public.family_tasks(family_id, list_type, completed, due_at nulls last, created_at desc);

alter table public.family_tasks enable row level security;

grant select, insert, update, delete on public.family_tasks to authenticated;

drop policy if exists family_tasks_select on public.family_tasks;
drop policy if exists family_tasks_insert on public.family_tasks;
drop policy if exists family_tasks_update on public.family_tasks;
drop policy if exists family_tasks_delete on public.family_tasks;

create policy family_tasks_select on public.family_tasks
for select to authenticated
using ((select private.is_family_member(family_id)));

create policy family_tasks_insert on public.family_tasks
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
  and (
    assigned_to_profile_id is null
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = family_tasks.family_id
        and fm.profile_id = family_tasks.assigned_to_profile_id
    )
  )
);

create policy family_tasks_update on public.family_tasks
for update to authenticated
using ((select private.is_family_member(family_id)))
with check (
  (select private.is_family_member(family_id))
  and (
    assigned_to_profile_id is null
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = family_tasks.family_id
        and fm.profile_id = family_tasks.assigned_to_profile_id
    )
  )
);

create policy family_tasks_delete on public.family_tasks
for delete to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    created_by_profile_id = (select private.current_profile_id())
    or assigned_to_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

commit;
