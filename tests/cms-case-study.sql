-- Run as owner on isolated Supabase with migrations 001–005. Rolls back all fixtures.
\set ON_ERROR_STOP on
begin;

insert into auth.users(id) values
  ('07400000-0000-4000-8000-000000000001'), ('07400000-0000-4000-8000-000000000002');
insert into public.admin_users(user_id) values ('07400000-0000-4000-8000-000000000001');
insert into public.media_assets(id,storage_path,file_name,mime_type,file_size) values
  ('07400000-0000-4000-8000-000000000011','test/74/a.png','a.png','image/png',42),
  ('07400000-0000-4000-8000-000000000012','test/74/b.png','b.png','image/png',42),
  ('07400000-0000-4000-8000-000000000013','test/74/video.mp4','video.mp4','video/mp4',42),
  ('07400000-0000-4000-8000-000000000014','test/74/unused.png','unused.png','image/png',42);
select set_config('cms_test.case_fields', '{"slug":"stage-74-sql","category":"client","title":"First draft","summary":"Metadata remains intact"}', true) \gset
select set_config('cms_test.case_doc', '{
  "version":1,"blocks":[
    {"id":"07400000-0000-4000-8000-000000000021","type":"columns","content":{"count":"2"},"children":[
      {"id":"07400000-0000-4000-8000-000000000022","type":"gallery","layout":{"column":1},"content":{
        "images":[{"id":"07400000-0000-4000-8000-000000000025","assetId":"07400000-0000-4000-8000-000000000011","alt":"","caption":""}],
        "columns":"2","gap":"normal","mobileColumns":"1","caption":""
      }}
    ]},
    {"id":"07400000-0000-4000-8000-000000000023","type":"comparison","content":{
      "beforeId":"07400000-0000-4000-8000-000000000011","afterId":"07400000-0000-4000-8000-000000000012",
      "beforeLabel":"Before","afterLabel":"After","mode":"slider","stack":true
    }},
    {"id":"07400000-0000-4000-8000-000000000024","type":"video","content":{
      "assetId":"07400000-0000-4000-8000-000000000013","posterId":"07400000-0000-4000-8000-000000000012",
      "controls":true,"loop":false,"muted":true,"autoplay":false,"caption":"07400000-0000-4000-8000-000000000014","aspect":"native"
    }}
  ]
}', true) \gset

-- Simulate a document already present when 005 was applied.
insert into public.projects(slug,category) values ('stage-74-legacy','independent');
alter table public.project_revisions disable trigger cms_media_guard_reference;
insert into public.project_revisions(project_id,revision_number,title,content_blocks)
select id,1,'Legacy draft',
  '{"version":1,"blocks":[{"type":"future-layout","content":{"media":"07400000-0000-4000-8000-000000000015"}}]}'
from public.projects where slug = 'stage-74-legacy';
alter table public.project_revisions enable trigger cms_media_guard_reference;
insert into public.media_assets(id,storage_path,file_name,mime_type,file_size) values
  ('07400000-0000-4000-8000-000000000015','test/74/legacy.png','legacy.png','image/png',42);

set local role authenticated;
select set_config('request.jwt.claim.sub','07400000-0000-4000-8000-000000000001',true) \gset
do $$
declare
  fields jsonb := current_setting('cms_test.case_fields')::jsonb;
  document jsonb := current_setting('cms_test.case_doc')::jsonb;
  saved jsonb;
  project uuid;
  stamp timestamptz;
  invalid jsonb;
begin
  saved := public.cms_save_case_study(null, null, fields, document);
  project := (saved->>'id')::uuid;
  stamp := (saved->>'updatedAt')::timestamptz;
  perform set_config('cms_test.case_project', project::text, true);
  if (select p.updated_at from public.projects p where p.id = project) is distinct from stamp
    or not exists (select 1 from public.project_revisions r where r.project_id = project and r.content_blocks = document
      and r.summary = 'Metadata remains intact') then raise exception 'Version or data mismatch'; end if;
  foreach invalid in array array[
    jsonb_set(document, '{blocks,2,content,posterId}', '"07400000-0000-4000-8000-000000000099"'),
    jsonb_set(document, '{blocks,2,content,posterId}', '"07400000-0000-4000-8000-000000000013"'),
    jsonb_set(document, '{blocks,1,type}', '"unknown"'),
    jsonb_set(document, '{blocks,1,id}', document#>'{blocks,0,id}'),
    '{"version":1,"blocks":[{"id":"07400000-0000-4000-8000-000000000031","type":"figma","content":{"url":"https://www.figma.com.evil.test/proto/X","aspect":"landscape","caption":""}}]}'::jsonb,
    '{"version":1,"blocks":[{"id":"07400000-0000-4000-8000-000000000031","type":"rich-text","content":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Link","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}}]}'::jsonb
  ] loop
    begin
      perform public.cms_save_case_study(project, stamp, fields || '{"summary":"Must roll back"}', invalid);
      raise exception 'Invalid case study accepted';
    exception when invalid_parameter_value then null;
    end;
  end loop;
  if (select p.updated_at from public.projects p where p.id = project) is distinct from stamp then
    raise exception 'Failed save changed project version';
  end if;
  begin
    perform public.cms_save_case_study(project, stamp - interval '1 second', fields, document);
    raise exception 'Stale case study accepted';
  exception when sqlstate 'PT409' then null;
  end;
end $$;

do $$
declare legacy public.projects := (select p from public.projects p where p.slug = 'stage-74-legacy');
begin
  perform public.cms_save_draft(legacy.id, legacy.updated_at,
    '{"slug":"stage-74-legacy","category":"independent","title":"Legacy metadata saved"}');
  if not exists (
    select 1 from public.project_revisions r where r.project_id = legacy.id
      and r.title = 'Legacy metadata saved' and r.content_blocks#>>'{blocks,0,type}' = 'future-layout'
  ) then raise exception 'Legacy document lost during metadata save'; end if;
end $$;

reset role;
set local role service_role;
do $$
begin
  for i in 11..13 loop
    begin
      perform public.cms_media_begin_delete(('07400000-0000-4000-8000-0000000000'||i)::uuid);
      raise exception 'Referenced media accepted for deletion';
    exception when sqlstate 'PT409' then null;
    end;
  end loop;
  begin
    perform public.cms_media_begin_delete('07400000-0000-4000-8000-000000000015');
    raise exception 'Older unrecognized content lost delete protection';
  exception when sqlstate 'PT409' then null;
  end;
  if not public.cms_media_begin_delete('07400000-0000-4000-8000-000000000014') then
    raise exception 'Caption text incorrectly treated as an asset reference';
  end if;
end $$;

reset role;
update public.project_site_settings s set published_revision_id=r.id,published_at=now()
from public.project_revisions r where s.project_id=r.project_id and r.project_id = current_setting('cms_test.case_project')::uuid;

set local role authenticated;
do $$
declare
  project uuid := current_setting('cms_test.case_project')::uuid;
  stamp timestamptz := (select p.updated_at from public.projects p where p.id = project);
  fields jsonb := current_setting('cms_test.case_fields')::jsonb;
  document jsonb := current_setting('cms_test.case_doc')::jsonb;
begin
  begin
    perform public.cms_save_case_study(project, stamp, fields,
      jsonb_set(document, '{blocks,2,content,posterId}', '"07400000-0000-4000-8000-000000000014"'));
    raise exception 'Deleting media was attached';
  exception when invalid_parameter_value then null;
  end;
  perform public.cms_save_case_study(project, stamp, fields, '{"version":1,"blocks":[]}');
  if not exists (
    select 1 from public.project_revisions r where r.project_id = project and r.revision_number = 1
      and r.sealed_at is not null and r.content_blocks = document
  ) or not exists (
    select 1 from public.project_revisions r where r.project_id = project and r.revision_number = 2
      and r.sealed_at is null and r.content_blocks = '{"version":1,"blocks":[]}'
  ) then raise exception 'Published revision was overwritten'; end if;
end $$;

select set_config('request.jwt.claim.sub','07400000-0000-4000-8000-000000000002',true) \gset
do $$
begin
  if exists(select 1 from public.project_revisions) then raise exception 'Member can read revisions'; end if;
  begin
    perform public.cms_save_case_study(null,null,'{}','{"version":1,"blocks":[]}');
    raise exception 'Member can write revisions';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;
do $$
begin
  if has_function_privilege('public.cms_save_case_study(uuid,timestamptz,jsonb,jsonb)','EXECUTE')
    then raise exception 'Anonymous case study RPC access'; end if;
end $$;
rollback;
