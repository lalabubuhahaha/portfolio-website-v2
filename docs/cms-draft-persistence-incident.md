# Draft save incident

## Preserve the open editor

Keep the original tab with the working draft open. The recovery script supplied with the incident reads the mounted Stage 7.4.1 editor and downloads its current fields and structured content from that tab. The script uses the locally rendered React tree for this build and stops without exporting if it cannot identify the expected state. Review the JSON locally to confirm the edits are present. Keep the private JSON in a local location with appropriate access. The new editor offers **Download draft backup** during normal editing and after an unconfirmed save.

## Read-only production checks

Copy the project UUID at the end of the open editor's address, keeping the original tab in place. In a separate Supabase Dashboard tab for the verified deployment project, replace the placeholder below with that exact UUID. Use the result to compare the newest numbered revision, project token and Gravity publication pointer. The active draft editor queries the highest revision number. The publication pointer is a different, independent reference.

```sql
begin read only;
with target as (
  select '<exact project UUID from tab A>'::uuid as id
)
select
  p.id as project_id,
  p.updated_at as project_version,
  r.id as revision_id,
  r.revision_number,
  r.updated_at as revision_updated_at,
  r.sealed_at,
  s.published_revision_id,
  row_number() over (order by r.revision_number desc) = 1 as editor_reads_this_row,
  jsonb_array_length(
    case when jsonb_typeof(r.content_blocks->'blocks') = 'array'
      then r.content_blocks->'blocks' else '[]'::jsonb end
  ) as top_level_blocks,
  md5(r.content_blocks::text) as content_fingerprint
from target t
join public.projects p on p.id = t.id
join public.project_revisions r on r.project_id = p.id
left join public.project_site_settings s
  on s.project_id = p.id
  and s.site_id = (select id from public.sites where key = 'gravity')
order by r.revision_number desc;
rollback;
```

Inspect the actual document privately if a row was written around the incident time. Use the same target UUID and the latest row's exact revision ID to avoid comparing the wrong draft. The fingerprint identifies a stored representation and does not establish that it matches the local backup by itself.

```sql
begin read only;
select id, project_id, revision_number, updated_at, content_blocks
from public.project_revisions
where project_id = '<exact project UUID from tab A>'::uuid
  and id = '<exact revision ID from the first query>'::uuid;
rollback;
```

In the original tab, inspect **Network** only if DevTools already captured the original POST. Note the request time, status, `x-vercel-id` response header if present, and whether the original Payload contains `content_blocks`. The React Server Action can return an application error inside an HTTP 200 response. Inspect the response privately. Opening DevTools now may show no historical request. Use a separate already authorized session for a read-only GET of that exact editor path and check the displayed draft. Avoid sharing HARs, Cookie/Authorization values, signed URLs, or draft text.

In Vercel, confirm the deployed SHA and filter **Runtime Logs** by the original time window, deployment, editor path, POST method, status and Vercel request ID. Then compare with Supabase PostgREST logs for `/rest/v1/rpc/cms_save_case_study` or `/rest/v1/rpc/cms_save_draft` and with the read-only rows above. On the patched build, search for `CMS draft RPC rejected` and `CMS draft read-back did not confirm the write`. These carry only the project ID and diagnostic code or save mode. Logs on the prior build may lack application details.

## Known local evidence

On Stage 7.4.1 the editor displayed “Draft saved.” when opened directly with `?saved=1`, with no mutation request. This confirms a misleading message in that build. It does not determine whether the reported production save committed or which revision was loaded. The patch requires an explicit content snapshot or a metadata-only request. It confirms the actual newest revision and matching normalized fields, content and project version with an uncached read before displaying success. An uncertain response retains the editor state; an existing project enters the conflict review path. No migration is required.

## Reproduce on an isolated stack

Run `tests/cms-draft-persistence.browser.mjs` with Node, Playwright and Chromium. Set `CMS_TEST_ORIGIN` to the isolated Next.js production build's loopback URL, `CMS_TEST_SUPABASE_URL` to its loopback Supabase gateway and `CMS_TEST_ANON_KEY` / `CMS_TEST_PASSWORD` to the disposable fixture credentials for `admin@example.test`. Optional `CMS_TEST_PLAYWRIGHT` and `CMS_TEST_CHROMIUM` point to locally installed executors. Seed at least one ready private PNG. The browser suite creates isolated drafts and checks the POST document against a separate uncached PostgREST read and an independently signed-in browser. Run SQL regression scripts separately from browser mutations, since the SQL fixtures take table locks.
