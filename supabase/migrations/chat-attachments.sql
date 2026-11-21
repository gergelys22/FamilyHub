-- Chat csatolmányok: tábla, privát tároló, RLS policyk, realtime.
-- Futtasd a Supabase SQL Editorban.
-- Méretkorlát: 25 MB = 26214400 bájt.

-- 1) Csatolmány tábla ---------------------------------------------------
create table if not exists public.chat_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('image', 'video', 'audio', 'document')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_message_attachments_message_idx
  on public.chat_message_attachments (message_id);
create index if not exists chat_message_attachments_conversation_idx
  on public.chat_message_attachments (conversation_id);

alter table public.chat_message_attachments enable row level security;

-- Csak a beszélgetés tagjai láthatják.
create policy chat_message_attachments_select_member
  on public.chat_message_attachments
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_message_attachments.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
  );

-- Csak a saját üzenetedhez, a saját beszélgetésedben csatolhatsz.
create policy chat_message_attachments_insert_sender
  on public.chat_message_attachments
  for insert to authenticated
  with check (
    uploaded_by_profile_id = (select private.current_profile_id())
    and exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_message_attachments.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
    and exists (
      select 1
      from public.chat_messages m
      where m.id = chat_message_attachments.message_id
        and m.conversation_id = chat_message_attachments.conversation_id
        and m.sender_profile_id = (select private.current_profile_id())
    )
  );

create policy chat_message_attachments_delete_owner
  on public.chat_message_attachments
  for delete to authenticated
  using (uploaded_by_profile_id = (select private.current_profile_id()));

-- 2) Privát tároló ------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Útvonal: <conversation_id>/<profile_id>/<időbélyeg>-<fájlnév>
create policy chat_attachments_storage_select
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1]
        and cm.profile_id = (select private.current_profile_id())
    )
  );

create policy chat_attachments_storage_insert
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = (select private.current_profile_id())::text
    and exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1]
        and cm.profile_id = (select private.current_profile_id())
    )
  );

create policy chat_attachments_storage_delete
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = (select private.current_profile_id())::text
  );

-- 3) Realtime -----------------------------------------------------------
alter publication supabase_realtime add table public.chat_message_attachments;