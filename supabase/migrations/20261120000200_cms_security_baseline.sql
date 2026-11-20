begin;

-- The caller can already read their own membership row under RLS.
alter function public.is_cms_admin() security invoker;

-- A public bucket bypasses object read policies. Keep its configuration
-- under database administration, even when other buckets have broad grants.
do $$
begin
  if not (
    select count(*) = 2 and coalesce(bool_and(c.relrowsecurity), false)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname in ('buckets', 'objects')
  ) then
    raise exception 'CMS requires RLS on storage.buckets and storage.objects';
  end if;
end;
$$;

create policy cms_private_bucket_no_insert on storage.buckets as restrictive
  for insert to anon, authenticated
  with check (id <> 'cms-private' and name <> 'cms-private');

create policy cms_private_bucket_no_update on storage.buckets as restrictive
  for update to anon, authenticated
  using (id <> 'cms-private' and name <> 'cms-private')
  with check (id <> 'cms-private' and name <> 'cms-private');

create policy cms_private_bucket_no_delete on storage.buckets as restrictive
  for delete to anon, authenticated
  using (id <> 'cms-private' and name <> 'cms-private');

-- Refuse to accept a configuration that was already made public.
do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'cms-private' and public is false
  ) then
    raise exception 'CMS requires a private cms-private bucket';
  end if;
end;
$$;

commit;
