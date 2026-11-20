-- Run as a database owner against an isolated Supabase instance with all migrations.
\set ON_ERROR_STOP on
begin;

insert into auth.users(id) values
  ('07200000-0000-4000-8000-000000000001'), ('07200000-0000-4000-8000-000000000002');
insert into public.admin_users(user_id) values ('07200000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','07200000-0000-4000-8000-000000000001',true) as admin_claim \gset
do $$
declare
  fields jsonb := '{"slug":"stage-72-sql-fixture","category":"independent","title":"Original draft"}';
  saved jsonb;
  project uuid;
begin
  saved := public.cms_save_draft(null,null,fields);
  project := (saved->>'id')::uuid;
  perform set_config('cms_test.project',project::text,true);
  begin
    perform public.cms_save_draft(null,null,fields);
    raise exception 'Duplicate slug accepted';
  exception when unique_violation then null;
  end;
  begin
    perform public.cms_save_draft(project,'2000-01-01',fields);
    raise exception 'Stale save accepted';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.cms_save_draft(project,(saved->>'updatedAt')::timestamptz,fields || '{"external_url":"javascript:alert(1)"}');
    raise exception 'Unsafe URL accepted';
  exception when invalid_parameter_value then null;
  end;
  saved := public.cms_save_draft(project,(saved->>'updatedAt')::timestamptz,fields || '{"title":"Saved draft"}');
  if (select count(*) from public.project_revisions r where r.project_id=project) <> 1 then
    raise exception 'Draft save unexpectedly created another revision';
  end if;
end $$;

reset role;
insert into public.sites(key,name) values ('stage-72-test-site','Stage 7.2 test site');
update public.project_revisions
set content_blocks = '{"version":1,"blocks":[{"id":"test"}]}', theme = '{"version":1,"settings":{"color":"blue"}}'
where project_id=current_setting('cms_test.project')::uuid;
update public.project_site_settings s
set published_revision_id=r.id, published_at=now()
from public.project_revisions r
where s.project_id=r.project_id and r.project_id=current_setting('cms_test.project')::uuid;
insert into public.project_site_settings(project_id,site_id,display_order)
select current_setting('cms_test.project')::uuid,id,9 from public.sites where key='stage-72-test-site';

set local role authenticated;
do $$
declare
  project uuid := current_setting('cms_test.project')::uuid;
  version timestamptz;
  revision public.project_revisions;
  before_count int;
  gravity uuid := (select id from public.sites where key='gravity');
  other_site uuid := (select id from public.sites where key='stage-72-test-site');
  prior uuid[];
  new_order uuid[];
  second uuid;
begin
  select p.updated_at into version from public.projects p where p.id=project;
  select count(*) into before_count from public.project_revisions r where r.project_id=project;
  perform public.cms_save_draft(project,version,
    '{"slug":"stage-72-sql-new-slug","category":"client","title":"New draft"}');
  select * into strict revision from public.project_revisions r where r.project_id=project and r.revision_number=2;
  if revision.sealed_at is not null or revision.content_blocks <> '{"version":1,"blocks":[{"id":"test"}]}'
     or revision.theme <> '{"version":1,"settings":{"color":"blue"}}' then raise exception 'Draft clone lost content'; end if;
  if (select count(*) from public.project_revisions r where r.project_id=project) <> before_count+1 then
    raise exception 'Sealed revision was changed';
  end if;
  if not exists (
    select 1 from public.project_site_settings s join public.project_revisions r on r.id=s.published_revision_id
    where s.project_id=project and s.site_id=gravity and r.revision_number=1 and r.title='Saved draft'
      and s.published_slug='stage-72-sql-fixture' and s.published_category='independent'
  ) then raise exception 'Publication pointer changed'; end if;
  begin
    perform public.cms_save_draft(null,null,'{"slug":"stage-72-sql-fixture","category":"independent","title":"Reserved slug"}');
    raise exception 'A published slug was reassigned';
  exception when sqlstate 'PT422' then null;
  end;
  update public.project_site_settings s set display_order=4 where s.project_id=project and s.site_id=other_site;
  if found then raise exception 'Cross-site write granted'; end if;
  begin
    update public.project_site_settings s set published_at=null where s.project_id=project and s.site_id=gravity;
    raise exception 'Publishing column writable';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.projects where id=project;
    raise exception 'Hard delete granted';
  exception when insufficient_privilege then null;
  end;
  second := (public.cms_save_draft(null,null,
    '{"slug":"stage-72-sql-second","category":"independent","title":"Second"}')->>'id')::uuid;
  perform public.cms_set_featured(project,true);
  perform public.cms_set_featured(second,true);
  select array_agg(p.id order by coalesce(s.display_order,0),p.id) into prior
  from public.projects p left join public.project_site_settings s on p.id=s.project_id and s.site_id=gravity
  where p.archived_at is null;
  select array_agg(value order by rank desc) into new_order from unnest(prior) with ordinality x(value,rank);
  perform public.cms_reorder_projects('display',prior,new_order);
  begin
    perform public.cms_reorder_projects('display',prior,new_order);
    raise exception 'Stale order accepted';
  exception when sqlstate 'PT409' then null;
  end;
  select array_agg(s.project_id order by s.featured_order,s.project_id) into prior
  from public.project_site_settings s join public.projects p on p.id=s.project_id
  where s.site_id=gravity and s.is_featured and p.archived_at is null;
  select array_agg(value order by rank desc) into new_order from unnest(prior) with ordinality x(value,rank);
  perform public.cms_reorder_projects('featured',prior,new_order);
  perform public.cms_set_archived(project,true);
  if not exists(select 1 from public.projects p where p.id=project and p.archived_at is not null)
    then raise exception 'Archive not saved'; end if;
  perform public.cms_set_archived(project,false);
  if not exists(select 1 from public.projects p where p.id=project and p.archived_at is null)
    then raise exception 'Restore not saved'; end if;
end $$;

select set_config('request.jwt.claim.sub','07200000-0000-4000-8000-000000000002',true) as member_claim \gset
do $$
begin
  if exists(select 1 from public.project_revisions) then raise exception 'Nonadmin can read revisions'; end if;
  begin
    perform public.cms_save_draft(null,null,'{}');
    raise exception 'Nonadmin can save drafts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cms_set_archived(current_setting('cms_test.project')::uuid,true);
    raise exception 'Nonadmin can archive';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
do $$
begin
  if has_function_privilege('public.cms_save_draft(uuid,timestamptz,jsonb)','EXECUTE')
    or has_function_privilege('public.cms_reorder_projects(text,uuid[],uuid[])','EXECUTE')
    or has_table_privilege('public.project_revisions','SELECT') then
    raise exception 'Anonymous CMS privileges';
  end if;
end $$;
rollback;
