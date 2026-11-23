# CMS-INC-001 · Draft save persistence

**Severity** P0
**Reported** 2026-11-23 Asia/Taipei
**Status** Production cause unverified. Local hardening pending release approval.

## Reported sequence

Computer A edited a case study and attempted several saves. Computer B and a fresh tab did not show the edits. The displayed save time remained at 10:16 and A showed a connection message. Computer B later saved its own edits successfully and could read those across devices. Reloading A lost its unsaved test content. The user declined recovery of that test content.

## Evidence and limits

- Git inspection found the local persistence fix at `b7f62eff0a4d9f47901ffef4873710f252716a7a`. The remote branch still pointed to `a5cbe2aa343cf3a3a3f050c942f475a4ec96ed54`. Git state does not identify the Vercel deployment serving A.
- At the prior remote code version, a direct open with `?saved=1` displayed “Draft saved.” without a mutation. This explains why that banner alone could not establish a save. The user's connection message and unchanged timestamp do not establish which requests reached Supabase.
- At the previous local fix, a metadata-only response could reach read-back after writing fields, even when the expected content did not match. Stage 7.4.2 makes the editable document and fields a single transactional write. Explicit metadata-only requests preflight an existing project and use optimistic concurrency.
- The earlier auth failure path used a navigation redirect. The save and conflict-review paths now check the verified session and return recoverable feedback in the open editor.
- No production request ID, original POST body, exact project UUID, deployed SHA, or Vercel/Supabase event log was available to this audit. The original commit, failure point, active draft revision and cache behavior are unconfirmed. No production data was written.

## Minimum production follow-up

1. In Vercel Deployments identify the deployment serving the exact hostname and record the Git SHA, environment and timezone. Verify the matching Supabase project in deployment settings without copying any credentials.
2. In a separate Supabase Dashboard session, replace the placeholder with the exact project UUID from the editor. Compare revision numbers and timestamps around 10:16 Taipei time, equivalent to 02:16 UTC on 2026-11-23. The editor selects the highest revision number. Gravity uses a separate publication pointer.

```sql
begin read only;
select p.id, p.updated_at as project_version,
       r.id as revision_id, r.revision_number, r.updated_at, r.sealed_at,
       s.published_revision_id, md5(r.content_blocks::text) as content_fingerprint
from public.projects p
join public.project_revisions r on r.project_id = p.id
left join public.project_site_settings s
  on s.project_id = p.id and s.site_id = (select id from public.sites where key = 'gravity')
where p.id = '<exact project UUID>'::uuid
order by r.revision_number desc;
rollback;
```

3. In Vercel Runtime Logs filter by deployment, time and POST to `/admin/works/<UUID>`. Correlate the request ID if present and examine Supabase logs for `cms_save_case_study`, `cms_save_draft`, Auth and project reads. The latest row cannot reconstruct historical intermediate updates if an editable revision was overwritten. Keep draft text, HARs, cookies, and auth values private. The longer diagnostic procedure is in [Draft save incident](../cms-draft-persistence-incident.md).

## Release gate

Use the [reliability audit](../cms-reliability-audit.md) and [recovery guide](../cms-recovery-guide.md). Once the release is approved, test a disposable draft in the exact deployment from two independently authenticated browsers. Compare the submitted document and the latest stored revision and test recovery before accepting. This patch does not require a migration.

For this audit, the cloud workspace exposed the configured public Supabase environment variable names. Its read-only health probe failed to resolve the configured endpoint, and no Vercel deployment identifiers were available in the workspace. This is a connectivity and access limitation of the audit environment. It does not establish a formal service outage at the time of the incident.
