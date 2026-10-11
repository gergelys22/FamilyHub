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
