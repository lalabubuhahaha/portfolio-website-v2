begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_cms_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_cms_admin() from public, anon, authenticated;
grant execute on function public.is_cms_admin() to authenticated;

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) <= 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('independent', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'cms-private' check (storage_bucket = 'cms-private'),
  storage_path text not null check (btrim(storage_path) <> ''),
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  alt_text text not null default '',
  caption text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  title text not null check (btrim(title) <> ''),
  summary text not null default '',
  year integer check (year between 1000 and 9999),
  cover_asset_id uuid references public.media_assets(id) on delete restrict,
  category_tags text[] not null default '{}',
  role text,
  tools text[] not null default '{}',
  external_url text,
  seo_title text,
  seo_description text,
  theme jsonb not null default '{"version":1,"settings":{}}'
    check ((jsonb_typeof(theme) = 'object' and theme->'version' = '1'::jsonb
      and jsonb_typeof(theme->'settings') = 'object') is true),
  content_blocks jsonb not null default '{"version":1,"blocks":[]}'
    check ((jsonb_typeof(content_blocks) = 'object' and content_blocks->'version' = '1'::jsonb
      and jsonb_typeof(content_blocks->'blocks') = 'array') is true),
  sealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, revision_number),
  unique (project_id, id)
);

create table public.project_site_settings (
  project_id uuid not null references public.projects(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  published_revision_id uuid,
  is_featured boolean not null default false,
  featured_order integer not null default 0 check (featured_order >= 0),
  display_order integer not null default 0 check (display_order >= 0),
  published_at timestamptz,
  primary key (project_id, site_id),
  foreign key (project_id, published_revision_id) references public.project_revisions(project_id, id),
  check ((published_revision_id is null) = (published_at is null))
);

create index projects_active_updated_idx on public.projects (updated_at desc, id) where archived_at is null;
create index project_revisions_cover_idx on public.project_revisions (cover_asset_id);
create index project_site_settings_revision_idx on public.project_site_settings (project_id, published_revision_id);
create index project_site_settings_order_idx on public.project_site_settings (site_id, display_order, project_id);
create index project_site_settings_featured_idx on public.project_site_settings (site_id, featured_order, project_id)
  where is_featured and published_revision_id is not null;

create function public.cms_touch_project() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cms_touch_project before update on public.projects
for each row execute function public.cms_touch_project();

create function public.cms_guard_revision() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.sealed_at is not null then
    raise exception 'Published revisions are immutable. Create a new revision.';
  end if;
  if new.project_id <> old.project_id or new.id <> old.id then
    raise exception 'Revision identity cannot change.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger cms_guard_revision before update on public.project_revisions
for each row execute function public.cms_guard_revision();

create function public.cms_revision_activity() returns trigger
language plpgsql set search_path = ''
as $$
begin
  update public.projects set updated_at = now() where id = coalesce(new.project_id, old.project_id);
  return null;
end;
$$;

create trigger cms_revision_activity after insert or update or delete on public.project_revisions
for each row execute function public.cms_revision_activity();

create function public.cms_seal_published_revision() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.published_revision_id is not null then
    update public.project_revisions set sealed_at = now()
    where id = new.published_revision_id and project_id = new.project_id and sealed_at is null;
  end if;
  return new;
end;
$$;

create trigger cms_seal_published_revision
before insert or update of published_revision_id on public.project_site_settings
for each row execute function public.cms_seal_published_revision();

revoke all on function public.cms_touch_project(), public.cms_guard_revision(),
  public.cms_revision_activity(), public.cms_seal_published_revision() from public, anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.sites enable row level security;
alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;
alter table public.project_site_settings enable row level security;
alter table public.media_assets enable row level security;

revoke all on table public.admin_users, public.sites, public.projects, public.project_revisions,
  public.project_site_settings, public.media_assets from public, anon, authenticated;
grant select on public.admin_users, public.sites to authenticated;
grant select, insert, update, delete on public.projects, public.project_revisions,
  public.project_site_settings, public.media_assets to authenticated;

create policy cms_read_own_membership on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
create policy cms_read_sites on public.sites for select to authenticated
  using ((select public.is_cms_admin()));
create policy cms_manage_projects on public.projects for all to authenticated
  using ((select public.is_cms_admin())) with check ((select public.is_cms_admin()));
create policy cms_manage_revisions on public.project_revisions for all to authenticated
  using ((select public.is_cms_admin())) with check ((select public.is_cms_admin()));
create policy cms_manage_site_settings on public.project_site_settings for all to authenticated
  using ((select public.is_cms_admin())) with check ((select public.is_cms_admin()));
create policy cms_manage_media on public.media_assets for all to authenticated
  using ((select public.is_cms_admin())) with check ((select public.is_cms_admin()));

insert into public.sites (key, name) values ('gravity', 'Gravity Edition');

insert into storage.buckets (id, name, public) values ('cms-private', 'cms-private', false);
create policy cms_manage_private_objects on storage.objects for all to authenticated
  using (bucket_id = 'cms-private' and (select public.is_cms_admin()))
  with check (bucket_id = 'cms-private' and (select public.is_cms_admin()));
create policy cms_private_objects_no_anon on storage.objects as restrictive for all to anon
  using (bucket_id <> 'cms-private') with check (bucket_id <> 'cms-private');
create policy cms_private_objects_admin_only on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'cms-private' or (select public.is_cms_admin()))
  with check (bucket_id <> 'cms-private' or (select public.is_cms_admin()));

commit;
