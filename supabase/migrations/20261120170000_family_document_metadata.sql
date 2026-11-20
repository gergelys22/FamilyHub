begin;

alter table public.family_documents
  add column if not exists document_type text not null default 'egyeb',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists expires_at timestamptz,
  add column if not exists related_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists restricted boolean not null default false,
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.family_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.family_documents(id) on delete cascade,
  storage_path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version integer not null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists family_documents_expiry_idx
  on public.family_documents(family_id, expires_at)
  where expires_at is not null;

alter table public.family_document_versions enable row level security;
revoke all on table public.family_document_versions from anon, authenticated;
grant select, insert on public.family_document_versions to authenticated;

drop policy if exists family_documents_select on public.family_documents;
create policy family_documents_select
on public.family_documents
for select to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    not restricted
    or uploaded_by_profile_id = (select private.current_profile_id())
    or related_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

drop policy if exists family_documents_insert on public.family_documents;
create policy family_documents_insert
on public.family_documents
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and uploaded_by_profile_id = (select private.current_profile_id())
);

drop policy if exists family_documents_update on public.family_documents;
create policy family_documents_update
on public.family_documents
for update to authenticated
using (
  (select private.is_family_member(family_id))
  and (
    uploaded_by_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
)
with check (
  (select private.is_family_member(family_id))
  and (
    uploaded_by_profile_id = (select private.current_profile_id())
    or (select private.is_family_admin(family_id))
  )
);

grant update on public.family_documents to authenticated;

drop policy if exists family_document_versions_select on public.family_document_versions;
create policy family_document_versions_select
on public.family_document_versions
for select to authenticated
using (
  exists (
    select 1
    from public.family_documents d
    where d.id = document_id
      and (select private.is_family_member(d.family_id))
      and (
        not d.restricted
        or d.uploaded_by_profile_id = (select private.current_profile_id())
        or d.related_profile_id = (select private.current_profile_id())
        or (select private.is_family_admin(d.family_id))
      )
  )
);

drop policy if exists family_document_versions_insert on public.family_document_versions;
create policy family_document_versions_insert
on public.family_document_versions
for insert to authenticated
with check (
  uploaded_by_profile_id = (select private.current_profile_id())
  and exists (
    select 1
    from public.family_documents d
    where d.id = document_id
      and (select private.is_family_member(d.family_id))
  )
);

commit;
