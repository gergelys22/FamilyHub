-- Közösségi tér: családi hírfolyam, receptek, kedvencek és élő közvetítések.
-- Futtasd a Supabase SQL Editorban. Többször is lefuttatható.
-- Feltételezi a meglévő private.is_family_member(uuid) és private.current_profile_id() függvényeket.

-- ---------------------------------------------------------------- Hírfolyam

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  media_path text,
  created_at timestamptz not null default now(),
  check (char_length(trim(body)) > 0 or media_path is not null)
);

create index if not exists community_posts_family_idx
  on public.community_posts (family_id, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

create table if not exists public.community_reactions (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;

drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts
  for select to authenticated
  using ((select private.is_family_member(family_id)));

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (
    (select private.is_family_member(family_id))
    and author_profile_id = (select private.current_profile_id())
  );

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to authenticated
  using (author_profile_id = (select private.current_profile_id()));

drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments
  for select to authenticated
  using (exists (
    select 1 from public.community_posts p
    where p.id = community_comments.post_id
      and (select private.is_family_member(p.family_id))
  ));

drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments
  for insert to authenticated
  with check (
    author_profile_id = (select private.current_profile_id())
    and exists (
      select 1 from public.community_posts p
      where p.id = community_comments.post_id
        and (select private.is_family_member(p.family_id))
    )
  );

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments
  for delete to authenticated
  using (author_profile_id = (select private.current_profile_id()));

drop policy if exists community_reactions_select on public.community_reactions;
create policy community_reactions_select on public.community_reactions
  for select to authenticated
  using (exists (
    select 1 from public.community_posts p
    where p.id = community_reactions.post_id
      and (select private.is_family_member(p.family_id))
  ));

drop policy if exists community_reactions_insert on public.community_reactions;
create policy community_reactions_insert on public.community_reactions
  for insert to authenticated
  with check (
    profile_id = (select private.current_profile_id())
    and exists (
      select 1 from public.community_posts p
      where p.id = community_reactions.post_id
        and (select private.is_family_member(p.family_id))
    )
  );

drop policy if exists community_reactions_delete on public.community_reactions;
create policy community_reactions_delete on public.community_reactions
  for delete to authenticated
  using (profile_id = (select private.current_profile_id()));

-- ---------------------------------------------------------------- Receptek

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'egyeb',
  servings int not null default 4 check (servings between 1 and 100),
  prep_minutes int not null default 0 check (prep_minutes between 0 and 2000),
  cook_minutes int not null default 0 check (cook_minutes between 0 and 2000),
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists recipes_family_idx
  on public.recipes (family_id, created_at desc);

alter table public.recipes enable row level security;

drop policy if exists recipes_select on public.recipes;
create policy recipes_select on public.recipes
  for select to authenticated
  using ((select private.is_family_member(family_id)));

drop policy if exists recipes_insert on public.recipes;
create policy recipes_insert on public.recipes
  for insert to authenticated
  with check (
    (select private.is_family_member(family_id))
    and author_profile_id = (select private.current_profile_id())
  );

drop policy if exists recipes_update on public.recipes;
create policy recipes_update on public.recipes
  for update to authenticated
  using (author_profile_id = (select private.current_profile_id()))
  with check (author_profile_id = (select private.current_profile_id()));

drop policy if exists recipes_delete on public.recipes;
create policy recipes_delete on public.recipes
  for delete to authenticated
  using (author_profile_id = (select private.current_profile_id()));

-- ---------------------------------------------------------------- Kedvencek

create table if not exists public.favorites (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null check (item_type in ('memory', 'recipe', 'post')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, item_type, item_id)
);

create index if not exists favorites_profile_idx
  on public.favorites (profile_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select to authenticated
  using (profile_id = (select private.current_profile_id()));

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (profile_id = (select private.current_profile_id()));

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete to authenticated
  using (profile_id = (select private.current_profile_id()));

-- ---------------------------------------------------------------- Élő közvetítés

create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  host_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 120),
  status text not null default 'live' check (status in ('live', 'ended')),
  room_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists live_streams_family_idx
  on public.live_streams (family_id, started_at desc);

alter table public.live_streams enable row level security;

drop policy if exists live_streams_select on public.live_streams;
create policy live_streams_select on public.live_streams
  for select to authenticated
  using ((select private.is_family_member(family_id)));

drop policy if exists live_streams_insert on public.live_streams;
create policy live_streams_insert on public.live_streams
  for insert to authenticated
  with check (
    (select private.is_family_member(family_id))
    and host_profile_id = (select private.current_profile_id())
    and status = 'live'
  );

drop policy if exists live_streams_update on public.live_streams;
create policy live_streams_update on public.live_streams
  for update to authenticated
  using (host_profile_id = (select private.current_profile_id()))
  with check (host_profile_id = (select private.current_profile_id()));

-- ---------------------------------------------------------------- Realtime

do $$
declare
  t text;
begin
  foreach t in array array['community_posts', 'community_comments', 'community_reactions', 'live_streams']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- Képek tárolása

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', false)
on conflict (id) do nothing;

-- Az útvonal első eleme a család azonosítója: <family_id>/<fájlnév>.
drop policy if exists community_media_select on storage.objects;
create policy community_media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-media'
    and (select private.is_family_member(((storage.foldername(name))[1])::uuid))
  );

drop policy if exists community_media_insert on storage.objects;
create policy community_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (select private.is_family_member(((storage.foldername(name))[1])::uuid))
  );

drop policy if exists community_media_delete on storage.objects;
create policy community_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-media'
    and owner = (select auth.uid())
  );
