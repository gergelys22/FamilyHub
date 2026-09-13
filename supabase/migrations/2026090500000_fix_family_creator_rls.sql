begin;

-- A család létrehozóját az Auth-azonosító alapján ellenőrizzük.
create or replace function private.is_family_creator(
  target_family_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.families f
    where f.id = target_family_id
      and f.created_by_user_id = (select auth.uid())
  );
$$;

-- Bejelentkezett felhasználó saját magához hozhat létre családot.
alter policy families_insert_self
on public.families
with check (
  (select auth.uid()) is not null
  and created_by_user_id = (select auth.uid())
);

-- A létrehozó már a tulajdonosi tagság beszúrása előtt
-- is láthatja az új családot.
alter policy families_select_member
on public.families
using (
  (select private.is_family_member(id))
  or created_by_user_id = (select auth.uid())
);

commit;