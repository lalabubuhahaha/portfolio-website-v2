-- Run only as an owner against a disposable Supabase database.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('07300000-0000-4000-8000-000000000001'), ('07300000-0000-4000-8000-000000000002');
insert into public.admin_users(user_id) values ('07300000-0000-4000-8000-000000000001');
insert into public.media_assets(id,storage_path,file_name,mime_type,file_size) values
  ('07300000-0000-4000-8000-000000000011','test/cover.png','cover.png','image/png',42),
  ('07300000-0000-4000-8000-000000000012','test/block.png','block.png','image/png',42),
  ('07300000-0000-4000-8000-000000000013','test/unused.png','unused.png','image/png',42);
insert into public.projects(slug,category) values ('media-sql-test','independent');
insert into public.project_revisions(project_id,revision_number,title,cover_asset_id,content_blocks)
select id,1,'Media references','07300000-0000-4000-8000-000000000011',
  '{"version":1,"blocks":[{"id":"07300000-0000-4000-8000-000000000099","type":"image","content":{"assetId":"07300000-0000-4000-8000-000000000012","caption":"","alt":"","fit":"contain","aspect":"native","alignment":"center"}}]}'
from public.projects where slug='media-sql-test';

insert into public.project_site_settings(project_id,site_id,published_revision_id,published_at)
select r.project_id,s.id,r.id,now()
from public.project_revisions r join public.projects p on p.id=r.project_id
cross join public.sites s where p.slug='media-sql-test' and s.key='gravity';

set local role service_role;
do $$
begin
  for i in 1..15 loop
    if not public.cms_media_take_upload_slot('07300000-0000-4000-8000-000000000001') then
      raise exception 'Rate cap applied too early';
    end if;
  end loop;
  if public.cms_media_take_upload_slot('07300000-0000-4000-8000-000000000001') then
    raise exception 'Rate cap did not apply';
  end if;
  for i in 11..12 loop
    begin
      perform public.cms_media_begin_delete(('07300000-0000-4000-8000-0000000000' || i)::uuid);
      raise exception 'Referenced asset accepted for deletion';
    exception when sqlstate 'PT409' then null;
    end;
  end loop;
  if not public.cms_media_begin_delete('07300000-0000-4000-8000-000000000013') then
    raise exception 'Unreferenced asset rejected';
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','07300000-0000-4000-8000-000000000001',true) as admin_claim \gset
do $$
begin
  if has_table_privilege('public.media_assets','INSERT,UPDATE,DELETE')
     or has_function_privilege('public.cms_media_begin_delete(uuid)','EXECUTE') then
    raise exception 'Media writes bypass the validation API';
  end if;
  begin
    insert into storage.objects(bucket_id,name) values ('cms-private','test/raw-bypass.png');
    raise exception 'Administrator JWT can upload directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cms_save_draft(null,null,
      '{"slug":"unsafe-media-reference","category":"client","title":"Unavailable asset","cover_asset_id":"07300000-0000-4000-8000-000000000013"}');
    raise exception 'Draft can attach a deleting asset';
  exception when invalid_parameter_value then null;
  end;
  if exists (select 1 from public.projects where slug='unsafe-media-reference') then
    raise exception 'Rejected cover left a partial project';
  end if;
end $$;
select set_config('request.jwt.claim.sub','07300000-0000-4000-8000-000000000002',true) as member_claim \gset
do $$
begin
  if exists (select 1 from public.media_assets) then raise exception 'Ordinary user can list media'; end if;
end $$;
reset role;
set local role anon;
do $$
begin
  if has_table_privilege('public.media_assets','SELECT') then raise exception 'Anonymous media reads granted'; end if;
end $$;
rollback;
