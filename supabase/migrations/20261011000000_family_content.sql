begin;

create table if not exists public.family_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 52428800),
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  dosage_text text,
  instructions text,
  next_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The table may already exist from an earlier SQL Editor setup. In that case
-- CREATE TABLE IF NOT EXISTS does not add columns required by this migration.
alter table public.medications
  add column if not exists dosage_text text,
  add column if not exists instructions text,
  add column if not exists next_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.family_reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  detail text,
  due_at timestamptz not null,
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memories
  add column if not exists description text,
  add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null;

create table if not exists public.memory_participants (
  memory_id uuid not null references public.memories(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (memory_id, profile_id)
);

grant select, insert on public.memories to authenticated;
grant select, insert on public.memory_media to authenticated;
grant select, insert on public.memory_participants to authenticated;
grant delete on public.memory_media to authenticated;
grant delete on public.memories to authenticated;

alter table public.memories enable row level security;
alter table public.memory_media enable row level security;
alter table public.memory_participants enable row level security;

drop policy if exists memories_select_family on public.memories;
drop policy if exists memories_insert_family on public.memories;
drop policy if exists memories_delete_family on public.memories;
drop policy if exists memory_media_select_family on public.memory_media;
drop policy if exists memory_media_insert_family on public.memory_media;
drop policy if exists memory_media_delete_family on public.memory_media;
drop policy if exists memory_participants_select_family on public.memory_participants;
drop policy if exists memory_participants_insert_family on public.memory_participants;

create policy memories_select_family on public.memories
for select to authenticated
using ((select private.is_family_member(family_id)));

create policy memories_insert_family on public.memories
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and (
    created_by_profile_id is null
    or created_by_profile_id = (select private.current_profile_id())
  )
);

create policy memories_delete_family on public.memories
for delete to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    created_by_profile_id is null
    or created_by_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

create policy memory_media_select_family on public.memory_media
for select to authenticated
using (
  exists (
    select 1
    from public.memories m
    where m.id = memory_media.memory_id
      and (select private.is_family_member(m.family_id))
  )
);

create policy memory_media_insert_family on public.memory_media
for insert to authenticated
with check (
  exists (
    select 1
    from public.memories m
    where m.id = memory_media.memory_id
      and (select private.is_family_member(m.family_id))
  )
);

create policy memory_media_delete_family on public.memory_media
for delete to authenticated
using (
  exists (
    select 1
    from public.memories m
    where m.id = memory_media.memory_id
      and (select private.is_family_member(m.family_id))
      and (
        m.created_by_profile_id is null
        or m.created_by_profile_id = (select private.current_profile_id())
        or (select private.is_family_admin(m.family_id))
      )
  )
);

create policy memory_participants_select_family on public.memory_participants
for select to authenticated
using (
  exists (
    select 1 from public.memories m
    where m.id = memory_participants.memory_id
      and (select private.is_family_member(m.family_id))
  )
);

create policy memory_participants_insert_family on public.memory_participants
for insert to authenticated
with check (
  exists (
    select 1 from public.memories m
    join public.family_members fm on fm.family_id = m.family_id
    where m.id = memory_participants.memory_id
      and fm.profile_id = memory_participants.profile_id
      and (select private.is_family_member(m.family_id))
  )
);

create index if not exists family_documents_family_idx on public.family_documents(family_id, created_at desc);
create index if not exists medications_family_idx on public.medications(family_id, next_at);
create index if not exists family_reminders_family_idx on public.family_reminders(family_id, due_at);

alter table public.family_documents enable row level security;
alter table public.medications enable row level security;
alter table public.family_reminders enable row level security;

grant select, insert, delete on public.family_documents to authenticated;
grant select, insert, update, delete on public.medications to authenticated;
grant select, insert, update, delete on public.family_reminders to authenticated;

drop policy if exists family_documents_select on public.family_documents;
drop policy if exists family_documents_insert on public.family_documents;
drop policy if exists family_documents_delete on public.family_documents;
drop policy if exists medications_select on public.medications;
drop policy if exists medications_insert on public.medications;
drop policy if exists medications_update on public.medications;
drop policy if exists medications_delete on public.medications;
drop policy if exists family_reminders_select on public.family_reminders;
drop policy if exists family_reminders_insert on public.family_reminders;
drop policy if exists family_reminders_update on public.family_reminders;
drop policy if exists family_reminders_delete on public.family_reminders;

create policy family_documents_select on public.family_documents for select to authenticated
using ((select private.is_family_member(family_id)));
create policy family_documents_insert on public.family_documents for insert to authenticated
with check ((select private.is_family_member(family_id)) and uploaded_by_profile_id = (select private.current_profile_id()));
create policy family_documents_delete on public.family_documents for delete to authenticated
using (uploaded_by_profile_id = (select private.current_profile_id()) or (select private.is_family_admin(family_id)));

create policy medications_select on public.medications for select to authenticated
using ((select private.is_family_member(family_id)));
create policy medications_insert on public.medications for insert to authenticated
with check ((select private.is_family_member(family_id)));
create policy medications_update on public.medications for update to authenticated
using ((select private.is_family_member(family_id))) with check ((select private.is_family_member(family_id)));
create policy medications_delete on public.medications for delete to authenticated
using ((select private.is_family_member(family_id)));

create policy family_reminders_select on public.family_reminders for select to authenticated
using ((select private.is_family_member(family_id)));
create policy family_reminders_insert on public.family_reminders for insert to authenticated
with check ((select private.is_family_member(family_id)) and created_by_profile_id = (select private.current_profile_id()));
create policy family_reminders_update on public.family_reminders for update to authenticated
using ((select private.is_family_member(family_id))) with check ((select private.is_family_member(family_id)));
create policy family_reminders_delete on public.family_reminders for delete to authenticated
using (created_by_profile_id = (select private.current_profile_id()) or (select private.is_family_admin(family_id)));

insert into storage.buckets (id, name, public) values ('family-documents', 'family-documents', false)
on conflict (id) do update set public = false;

-- The memories hook uses public URLs, so keep this bucket public until the
-- client is migrated to signed URLs. Uploads are still restricted to the
-- authenticated profile's own folder.
insert into storage.buckets (id, name, public) values ('memories', 'memories', true)
on conflict (id) do update set public = true;

drop policy if exists memories_storage_insert_own on storage.objects;
drop policy if exists memories_storage_delete_own on storage.objects;
drop policy if exists memories_storage_select_family on storage.objects;

create policy memories_storage_select_family on storage.objects
for select to authenticated
using (
  bucket_id = 'memories'
  and exists (
    select 1
    from public.memory_media mm
    join public.memories m on m.id = mm.memory_id
    where mm.storage_bucket = bucket_id
      and mm.storage_path = name
      and (select private.is_family_member(m.family_id))
  )
);

create policy memories_storage_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] = (select private.current_profile_id())::text
);

create policy memories_storage_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] = (select private.current_profile_id())::text
);

drop policy if exists family_documents_storage_select on storage.objects;
drop policy if exists family_documents_storage_insert on storage.objects;
drop policy if exists family_documents_storage_delete on storage.objects;

create policy family_documents_storage_select on storage.objects for select to authenticated
using (bucket_id = 'family-documents' and exists (
  select 1 from public.family_documents d
  where d.storage_path = name and (select private.is_family_member(d.family_id))
));
create policy family_documents_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'family-documents' and (storage.foldername(name))[1] = (select private.current_profile_id())::text);
create policy family_documents_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'family-documents' and (storage.foldername(name))[1] = (select private.current_profile_id())::text);

commit;
