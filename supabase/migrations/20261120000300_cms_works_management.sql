begin;

-- Use wall-clock time for optimistic reads after a queued writer acquires a lock.
create or replace function public.cms_touch_project() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- Capture routing identity per publication so edits to a draft slug/category
-- cannot change an existing publication, even when the project is shared.
alter table public.project_site_settings
  add column published_slug text,
  add column published_category text;

update public.project_site_settings s
set published_slug = p.slug, published_category = p.category
from public.projects p where p.id = s.project_id and s.published_revision_id is not null;

alter table public.project_site_settings add constraint cms_publication_has_identity check (
  (published_revision_id is null and published_slug is null and published_category is null)
  or (published_revision_id is not null and published_slug is not null and published_category is not null)
);
create unique index cms_site_published_slug on public.project_site_settings(site_id, published_slug)
  where published_revision_id is not null;

create function public.cms_snapshot_publication_identity() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.published_revision_id is null then
    new.published_slug := null;
    new.published_category := null;
  elsif tg_op = 'INSERT' or new.published_revision_id is distinct from old.published_revision_id then
    select p.slug, p.category into strict new.published_slug, new.published_category
    from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger cms_snapshot_publication_identity
before insert or update of published_revision_id on public.project_site_settings
for each row execute function public.cms_snapshot_publication_identity();
revoke all on function public.cms_snapshot_publication_identity() from public, anon, authenticated;

create function public.cms_save_draft(project uuid, expected timestamptz, fields jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  current_project public.projects;
  revision public.project_revisions;
  input public.project_revisions;
  site uuid;
begin
  if not public.is_cms_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if jsonb_typeof(fields) is distinct from 'object'
     or fields - array['slug','category','title','summary','year','role','tools','category_tags','external_url','cover_asset_id','seo_title','seo_description'] <> '{}'::jsonb
     or octet_length(fields::text) > 24000 then
    raise exception using errcode = '22023', message = 'Invalid project fields';
  end if;
  if exists (
    select 1 from jsonb_each(fields) f
    where jsonb_typeof(f.value) not in (
      'null',
      case when f.key in ('tools','category_tags') then 'array' when f.key = 'year' then 'number' else 'string' end
    )
  ) or exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(fields->'tools') = 'array' then fields->'tools' else '[]'::jsonb end ||
      case when jsonb_typeof(fields->'category_tags') = 'array' then fields->'category_tags' else '[]'::jsonb end
    ) item where jsonb_typeof(item) <> 'string'
  ) then
    raise exception using errcode = '22023', message = 'Invalid project fields';
  end if;
  select * into input from jsonb_populate_record(null::public.project_revisions, fields);
  if input.title is null or char_length(btrim(input.title)) not between 1 and 160
     or not coalesce(fields->>'slug' ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(fields->>'slug') <= 120, false)
     or not coalesce(fields->>'category' in ('independent','client'), false)
     or char_length(coalesce(input.summary,'')) > 5000
     or char_length(coalesce(input.role,'')) > 160
     or char_length(coalesce(input.seo_title,'')) > 120
     or char_length(coalesce(input.seo_description,'')) > 320
     or (input.external_url is not null and
         (char_length(input.external_url) > 2048 or strpos(input.external_url, chr(92)) <> 0 or input.external_url !~ '^https?://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$'))
     or coalesce(cardinality(input.tools),0) > 20 or coalesce(cardinality(input.category_tags),0) > 20
     or exists (select 1 from unnest(coalesce(input.tools,'{}') || coalesce(input.category_tags,'{}')) item
                where item is null or char_length(btrim(item)) not between 1 and 64)
     or (input.cover_asset_id is not null and not exists (
       select 1 from public.media_assets a where a.id = input.cover_asset_id
         and a.storage_bucket = 'cms-private' and a.mime_type like 'image/%'
     )) then
    raise exception using errcode = '22023', message = 'Invalid project fields';
  end if;

  perform pg_advisory_xact_lock(72102001);
  if exists (select 1 from public.project_site_settings s
    where s.published_slug = fields->>'slug' and s.project_id is distinct from project) then
    raise exception using errcode = 'PT422', message = 'Slug reserved by a published project';
  end if;
  if project is null then
    select id into strict site from public.sites where key = 'gravity';
    insert into public.projects(slug, category) values (fields->>'slug', fields->>'category')
      returning id into project;
    insert into public.project_site_settings(project_id, site_id, display_order)
      select project, site, coalesce(max(s.display_order) + 1, 0)
      from public.project_site_settings s where s.site_id = site;
  else
    select p.* into current_project from public.projects p where p.id = project for update;
    if not found or current_project.archived_at is not null then
      raise exception using errcode = 'P0002', message = 'Project unavailable';
    end if;
    if current_project.updated_at is distinct from expected then
      raise exception using errcode = 'PT409', message = 'Project changed';
    end if;
    update public.projects set slug = fields->>'slug', category = fields->>'category' where id = project;
  end if;

  select r.* into revision from public.project_revisions r where r.project_id = project
    order by r.revision_number desc limit 1 for update;
  if revision.id is null or revision.sealed_at is not null or exists (
    select 1 from public.project_site_settings s where s.project_id = project and s.published_revision_id = revision.id
  ) then
    insert into public.project_revisions (
      project_id, revision_number, title, summary, year, role, tools, category_tags, external_url,
      cover_asset_id, seo_title, seo_description, theme, content_blocks
    ) values (
      project, coalesce(revision.revision_number, 0) + 1, btrim(input.title), coalesce(input.summary,''), input.year,
      input.role, coalesce(input.tools,'{}'), coalesce(input.category_tags,'{}'), input.external_url,
      input.cover_asset_id, input.seo_title, input.seo_description,
      coalesce(revision.theme,'{"version":1,"settings":{}}'), coalesce(revision.content_blocks,'{"version":1,"blocks":[]}')
    );
  else
    update public.project_revisions r set title = btrim(input.title), summary = coalesce(input.summary,''),
      year = input.year, role = input.role, tools = coalesce(input.tools,'{}'),
      category_tags = coalesce(input.category_tags,'{}'), external_url = input.external_url,
      cover_asset_id = input.cover_asset_id, seo_title = input.seo_title, seo_description = input.seo_description
    where r.id = revision.id and r.project_id = project;
  end if;
  return (select jsonb_build_object('id', p.id, 'updatedAt', p.updated_at) from public.projects p where p.id = project);
end;
$$;

create function public.cms_set_archived(project uuid, archived boolean)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_cms_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if project is null or archived is null then raise exception using errcode = '22023', message = 'Invalid request'; end if;
  perform pg_advisory_xact_lock(72102001);
  update public.projects p set archived_at = case when archived then clock_timestamp() else null end
  where p.id = project and (p.archived_at is not null) <> archived;
  if not found then raise exception using errcode = 'PT409', message = 'Project state changed'; end if;
end;
$$;

create function public.cms_set_featured(project uuid, featured boolean)
returns void language plpgsql security invoker set search_path = ''
as $$
declare site uuid;
begin
  if not public.is_cms_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if project is null or featured is null then raise exception using errcode = '22023', message = 'Invalid request'; end if;
  perform pg_advisory_xact_lock(72102001);
  perform 1 from public.projects p where p.id = project and p.archived_at is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'Project unavailable'; end if;
  select id into strict site from public.sites where key = 'gravity';
  insert into public.project_site_settings as settings (project_id, site_id, is_featured, display_order, featured_order)
    select project, site, featured, coalesce(max(s.display_order)+1,0), coalesce(max(s.featured_order)+1,0)
    from public.project_site_settings s where s.site_id = site
  on conflict (project_id, site_id) do update
    set is_featured = excluded.is_featured,
        featured_order = case when excluded.is_featured and not settings.is_featured
          then excluded.featured_order else settings.featured_order end;
end;
$$;

create function public.cms_reorder_projects(order_kind text, prior uuid[], next_order uuid[])
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  site uuid;
  current_order uuid[];
begin
  if not public.is_cms_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if order_kind is null or order_kind not in ('display','featured') or prior is null or next_order is null
     or cardinality(next_order) not between 1 and 10000 or cardinality(prior) <> cardinality(next_order)
     or exists (select 1 from unnest(next_order) as x(id) where id is null)
     or (select count(distinct id) from unnest(next_order) as x(id)) <> cardinality(next_order)
     or not (prior @> next_order and next_order @> prior) then
    raise exception using errcode = '22023', message = 'Invalid sequence';
  end if;
  perform pg_advisory_xact_lock(72102001);
  select id into strict site from public.sites where key = 'gravity';
  select array_agg(p.id order by
    case when order_kind = 'display' then coalesce(s.display_order,0) else s.featured_order end, p.id)
  into current_order
  from public.projects p
  left join public.project_site_settings s on s.project_id = p.id and s.site_id = site
  where p.archived_at is null and (order_kind = 'display' or s.is_featured);

  if current_order is distinct from prior then
    raise exception using errcode = 'PT409', message = 'Order changed';
  end if;
  if order_kind = 'display' then
    insert into public.project_site_settings(project_id, site_id, display_order)
      select x.id, site, (x.rank - 1)::integer from unnest(next_order) with ordinality x(id, rank)
    on conflict (project_id, site_id) do update set display_order = excluded.display_order;
  else
    update public.project_site_settings s set featured_order = (x.rank - 1)::integer
    from unnest(next_order) with ordinality x(id, rank)
    where s.site_id = site and s.project_id = x.id;
  end if;
end;
$$;

-- Keep existing reads and RLS. The data API can only write Stage 7.2 fields.
revoke insert, update, delete on public.projects, public.project_revisions, public.project_site_settings from authenticated;
grant insert (slug, category), update (slug, category, archived_at, updated_at) on public.projects to authenticated;
grant insert (project_id, revision_number, title, summary, year, role, tools, category_tags, external_url,
  cover_asset_id, seo_title, seo_description, theme, content_blocks),
  update (title, summary, year, role, tools, category_tags, external_url, cover_asset_id, seo_title, seo_description)
  on public.project_revisions to authenticated;
grant insert (project_id, site_id, display_order, is_featured, featured_order),
  update (display_order, is_featured, featured_order) on public.project_site_settings to authenticated;

create policy cms_works_gravity_settings_insert on public.project_site_settings as restrictive
  for insert to authenticated with check (site_id = (select id from public.sites where key = 'gravity'));
create policy cms_works_gravity_settings_update on public.project_site_settings as restrictive
  for update to authenticated using (site_id = (select id from public.sites where key = 'gravity'))
  with check (site_id = (select id from public.sites where key = 'gravity'));
revoke all on function public.cms_save_draft(uuid,timestamptz,jsonb), public.cms_set_archived(uuid,boolean),
  public.cms_set_featured(uuid,boolean), public.cms_reorder_projects(text,uuid[],uuid[]) from public, anon, authenticated;
grant execute on function public.cms_save_draft(uuid,timestamptz,jsonb), public.cms_set_archived(uuid,boolean),
  public.cms_set_featured(uuid,boolean), public.cms_reorder_projects(text,uuid[],uuid[]) to authenticated;

commit;
