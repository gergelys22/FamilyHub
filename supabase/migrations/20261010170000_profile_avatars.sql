insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

drop policy if exists avatars_select_family on storage.objects;
create policy avatars_select_family on storage.objects
for select to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles avatar_profile
    where avatar_profile.id::text = (storage.foldername(name))[1]
      and (
        avatar_profile.auth_user_id = (select auth.uid())
        or (select private.shares_family_with(avatar_profile.id))
      )
  )
);

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles
    where auth_user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles
    where auth_user_id = (select auth.uid())
  )
);
