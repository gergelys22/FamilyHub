create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text,
  is_group boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists chat_conversations_family_idx
  on public.chat_conversations (family_id, updated_at desc);
create index if not exists chat_conversation_members_profile_idx
  on public.chat_conversation_members (profile_id, conversation_id);
create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_conversation_members enable row level security;
alter table public.chat_messages enable row level security;

grant select, insert, update on public.chat_conversations to authenticated;
grant select, insert, update on public.chat_conversation_members to authenticated;
grant select, insert, update on public.chat_messages to authenticated;

create policy chat_conversations_select_member on public.chat_conversations
for select to authenticated
using ((select private.is_family_member(family_id)));

create policy chat_conversations_insert_member on public.chat_conversations
for insert to authenticated
with check (
  (select private.is_family_member(family_id))
  and created_by_profile_id = (select private.current_profile_id())
);

create policy chat_conversations_update_creator on public.chat_conversations
for update to authenticated
using (created_by_profile_id = (select private.current_profile_id()))
with check (created_by_profile_id = (select private.current_profile_id()));

create policy chat_conversation_members_select_member on public.chat_conversation_members
for select to authenticated
using (
  exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and (select private.is_family_member(c.family_id))
  )
);

create policy chat_conversation_members_insert_member on public.chat_conversation_members
for insert to authenticated
with check (
  exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and (select private.is_family_member(c.family_id))
  )
  and (select private.shares_family_with(profile_id))
);

create policy chat_conversation_members_update_self on public.chat_conversation_members
for update to authenticated
using (profile_id = (select private.current_profile_id()))
with check (profile_id = (select private.current_profile_id()));

create policy chat_messages_select_member on public.chat_messages
for select to authenticated
using (
  exists (
    select 1
    from public.chat_conversation_members cm
    where cm.conversation_id = chat_messages.conversation_id
      and cm.profile_id = (select private.current_profile_id())
  )
);

create policy chat_messages_insert_member on public.chat_messages
for insert to authenticated
with check (
  sender_profile_id = (select private.current_profile_id())
  and exists (
    select 1
    from public.chat_conversation_members cm
    where cm.conversation_id = chat_messages.conversation_id
      and cm.profile_id = (select private.current_profile_id())
  )
);

create policy chat_messages_update_sender on public.chat_messages
for update to authenticated
using (sender_profile_id = (select private.current_profile_id()))
with check (sender_profile_id = (select private.current_profile_id()));

alter table public.chat_conversations replica identity full;
alter table public.chat_conversation_members replica identity full;
alter table public.chat_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.chat_conversations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_conversation_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;
