begin;

do $$
begin
  if to_regprocedure('public.cms_save_draft(uuid,timestamptz,jsonb)') is null then
    raise exception 'Apply the Works Management migration before the Media Library migration';
  end if;
  if not exists (select 1 from storage.buckets where id = 'cms-private' and public is false) then
    raise exception 'The CMS Storage bucket must exist and remain private';
  end if;
end;
$$;

alter table public.media_assets
  add column display_name text,
  add column thumbnail_path text unique,
  add column state text not null default 'ready' check (state in ('uploading','ready','failed','deleting')),
  add column uploaded_by uuid references auth.users(id) on delete set null,
  add column search_name text generated always as (coalesce(display_name, '') || ' ' || file_name) stored,
  add constraint cms_media_display_name_length check (display_name is null or char_length(display_name) between 1 and 160);

create index cms_media_created_idx on public.media_assets(created_at desc,id desc);
create index cms_media_mime_idx on public.media_assets(mime_type);
revoke insert, update, delete on public.media_assets from anon, authenticated;
grant select, insert, update, delete on public.media_assets to service_role;
grant select (user_id) on public.admin_users to service_role;
grant select (cover_asset_id, content_blocks) on public.project_revisions to service_role;

-- The private originals are signed by an authenticated administrator. Writes are
-- mediated by the validating server, including when an older policy is permissive.
create policy cms_objects_server_insert on storage.objects as restrictive
  for insert to authenticated with check (bucket_id <> 'cms-private');
create policy cms_objects_server_update on storage.objects as restrictive
  for update to authenticated using (bucket_id <> 'cms-private') with check (bucket_id <> 'cms-private');
create policy cms_objects_server_delete on storage.objects as restrictive
  for delete to authenticated using (bucket_id <> 'cms-private');
create policy cms_objects_ready_read on storage.objects as restrictive
  for select to authenticated using (
    bucket_id <> 'cms-private' or exists (
      select 1 from public.media_assets a where a.storage_bucket = 'cms-private'
        and a.state = 'ready' and (a.storage_path = name or a.thumbnail_path = name)
    )
  );

create table public.cms_media_upload_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.cms_media_upload_limits enable row level security;
revoke all on public.cms_media_upload_limits from public, anon, authenticated;
grant select, insert, update on public.cms_media_upload_limits to service_role;

create function public.cms_media_take_upload_slot(actor uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare attempts_taken int;
begin
  if not exists (select 1 from public.admin_users a where a.user_id = actor) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  insert into public.cms_media_upload_limits as limits(user_id, window_start, attempts)
    values (actor, clock_timestamp(), 1)
  on conflict (user_id) do update
    set window_start = case when limits.window_start < clock_timestamp() - interval '1 minute'
          then clock_timestamp() else limits.window_start end,
        attempts = case when limits.window_start < clock_timestamp() - interval '1 minute'
          then 1 else least(limits.attempts + 1, 16) end
  returning attempts into attempts_taken;
  return attempts_taken <= 15;
end;
$$;

-- Serialize the reference check against draft creation and cover selection.
create function public.cms_media_guard_reference()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.cover_asset_id is null and new.content_blocks = '{"version":1,"blocks":[]}'::jsonb then
    return new;
  end if;
  perform pg_advisory_xact_lock(73003001);
  if new.cover_asset_id is not null and not exists (
    select 1 from public.media_assets a where a.id = new.cover_asset_id and a.state = 'ready'
  ) then
    raise exception using errcode = '22023', message = 'Cover is unavailable';
  end if;
  if exists (
    select 1 from public.media_assets a where a.state <> 'ready'
      and position(a.id::text in lower(new.content_blocks::text)) > 0
  ) then
    raise exception using errcode = '22023', message = 'Content references unavailable media';
  end if;
  return new;
end;
$$;
create trigger cms_media_guard_reference before insert or update of cover_asset_id, content_blocks
  on public.project_revisions for each row execute function public.cms_media_guard_reference();

create function public.cms_media_begin_delete(asset uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare entry public.media_assets;
begin
  perform pg_advisory_xact_lock(73003001);
  select * into entry from public.media_assets a where a.id = asset and a.storage_bucket = 'cms-private' for update;
  if not found then return false; end if;
  if entry.state = 'uploading' and entry.created_at > clock_timestamp() - interval '10 minutes' then
    raise exception using errcode = 'PT409', message = 'Upload still active';
  end if;
  if exists (select 1 from public.project_revisions r
    where r.cover_asset_id = asset or position(asset::text in lower(r.content_blocks::text)) > 0) then
    raise exception using errcode = 'PT409', message = 'Asset is referenced';
  end if;
  update public.media_assets a set state = 'deleting' where a.id = asset;
  return true;
end;
$$;

revoke all on function public.cms_media_take_upload_slot(uuid), public.cms_media_guard_reference(),
  public.cms_media_begin_delete(uuid) from public, anon, authenticated;
grant execute on function public.cms_media_take_upload_slot(uuid), public.cms_media_begin_delete(uuid) to service_role;

commit;
