-- Hívások állapota: a beszélgetés tagjai ezen keresztül értesülnek a hívásról.
-- Futtasd a Supabase SQL Editorban.

create table if not exists public.chat_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  started_by_profile_id uuid not null references public.profiles (id),
  call_type text not null check (call_type in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'active', 'ended', 'declined', 'missed', 'cancelled')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index if not exists chat_calls_conversation_idx
  on public.chat_calls (conversation_id, created_at desc);

alter table public.chat_calls enable row level security;

-- A beszélgetés tagjai láthatják a hívásokat.
create policy chat_calls_select_member
  on public.chat_calls
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_calls.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
  );

-- Csak a beszélgetés tagja indíthat hívást, saját néven, csörgő állapotban.
create policy chat_calls_insert_member
  on public.chat_calls
  for insert to authenticated
  with check (
    started_by_profile_id = (select private.current_profile_id())
    and status = 'ringing'
    and exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_calls.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
  );

-- A tagok frissíthetik az állapotot (fogadás, elutasítás, befejezés).
create policy chat_calls_update_member
  on public.chat_calls
  for update to authenticated
  using (
    exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_calls.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
  )
  with check (
    exists (
      select 1
      from public.chat_conversation_members cm
      where cm.conversation_id = chat_calls.conversation_id
        and cm.profile_id = (select private.current_profile_id())
    )
  );

alter publication supabase_realtime add table public.chat_calls;