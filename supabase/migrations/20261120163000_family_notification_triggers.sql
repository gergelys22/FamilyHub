begin;

create or replace function private.notify_family_reminder()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  select
    fm.profile_id,
    'Új emlékeztető',
    btrim(new.title),
    'reminder',
    jsonb_build_object(
      'reminderId', new.id,
      'familyId', new.family_id,
      'profileId', new.created_by_profile_id
    )
  from public.family_members fm
  where fm.family_id = new.family_id
    and fm.profile_id <> new.created_by_profile_id;
  return new;
end;
$$;

drop trigger if exists on_family_reminder_created on public.family_reminders;
create trigger on_family_reminder_created
  after insert on public.family_reminders
  for each row execute function private.notify_family_reminder();

create or replace function private.notify_family_document()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  select
    fm.profile_id,
    'Új dokumentum',
    btrim(new.name),
    'document',
    jsonb_build_object(
      'documentId', new.id,
      'familyId', new.family_id,
      'profileId', new.uploaded_by_profile_id
    )
  from public.family_members fm
  where fm.family_id = new.family_id
    and fm.profile_id <> new.uploaded_by_profile_id;
  return new;
end;
$$;

drop trigger if exists on_family_document_created on public.family_documents;
create trigger on_family_document_created
  after insert on public.family_documents
  for each row execute function private.notify_family_document();

create or replace function private.notify_family_medication()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  select
    fm.profile_id,
    'Új gyógyszerfelvétel',
    btrim(new.name),
    'medicine',
    jsonb_build_object(
      'medicationId', new.id,
      'familyId', new.family_id,
      'profileId', new.profile_id
    )
  from public.family_members fm
  where fm.family_id = new.family_id
    and fm.profile_id <> new.profile_id;
  return new;
end;
$$;

drop trigger if exists on_family_medication_created on public.medications;
create trigger on_family_medication_created
  after insert on public.medications
  for each row execute function private.notify_family_medication();

create or replace function private.notify_family_task()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.app_notifications (
    target_profile_id,
    title,
    body,
    notification_type,
    data
  )
  select
    fm.profile_id,
    case when new.list_type = 'shopping' then 'Új bevásárlási tétel' else 'Új közös teendő' end,
    btrim(new.title),
    'task',
    jsonb_build_object(
      'taskId', new.id,
      'familyId', new.family_id,
      'profileId', new.created_by_profile_id
    )
  from public.family_members fm
  where fm.family_id = new.family_id
    and fm.profile_id <> new.created_by_profile_id;
  return new;
end;
$$;

drop trigger if exists on_family_task_created on public.family_tasks;
create trigger on_family_task_created
  after insert on public.family_tasks
  for each row execute function private.notify_family_task();

commit;
