# CMS security checklist

Use this checklist as an acceptance gate for every CMS Stage, beginning with 7.1. Include the commit, environment, migration versions, roles exercised, test evidence, and any outstanding verification in the Stage report. Repeat relevant checks after changes to policy, auth, hosting, or dependencies.

## Baseline findings

| Risk | Finding | Disposition |
| --- | --- | --- |
| High, conditional | Object policies alone cannot protect a bucket whose configuration allows it to become public. A permissive bucket policy on the target would leave that configuration unprotected. | The baseline migration blocks client roles from creating, modifying, removing, or renaming a bucket to or from the CMS identity. It requires bucket and object RLS and a private CMS bucket. |
| Medium | Stage 7.1 used the Supabase SSR default for script-readable session cookies. | The SSR client and Proxy set HttpOnly, Secure, and SameSite=Lax for admin cookies, including refresh and deletion. The CMS authenticates on the server. The unused browser factory has no role in the admin session flow. |
| Low | The membership helper ran as its owner even though caller-role RLS already permits the caller to read their own membership. | The baseline migration switches it to SECURITY INVOKER. Anonymous execution remains revoked and the search path remains empty. The other CMS functions are invoker-only trigger functions with direct client execution revoked. The migrations define no views. |
| Medium, retained | An allowlisted administrator has direct data API write access to projects, revisions, per-site settings and media metadata, plus private object writes. | These are existing Stage 7.1 administrator capabilities. Membership and site registry changes remain database-admin operations. Reassess the administrator DML grants before introducing write workflows. Review scope, archive vs. delete, revision immutability, and any RPC introduced in subsequent Stages. |
| Medium, retained | The dependency audit reported moderate entries for Next.js and the development lint dependency chain. | Track the Next.js patch and development dependency updates separately. The audit reported zero high or critical entries. |
| Deployment verification outstanding | A cloud proxy denied the hosted Supabase health request. There is no current evidence of the hosted migrations, policies, auth settings or role outcomes. | Verify the target and applied migration versions in the Supabase Dashboard and repeat the role checks before accepting the hosted environment. |

## Baseline evidence

Both migrations ran in a disposable local Supabase stack. Database checks used an unpublished fixture and three caller roles. They also confirmed that an existing permissive bucket policy could not override the CMS bucket restrictions. Chromium verified administrator login, the issued cookie flags, logout, and denial for anonymous and authenticated nonadmin callers. Typecheck, lint, production build, and all 37 existing tests passed.

The reachable Git history was scanned for common secret formats, including Supabase secret keys and service-role JWTs. The scan found zero candidates. The only matching environment or key filename was `.env.example`.

## Stage acceptance gate

- [ ] Inventory changed routes, Server Actions, Edge Functions, database functions, views, grants, and Storage buckets. Require verified server-side identity and membership on protected reads and mutations. Repeat the checks with anonymous, ordinary authenticated, and approved admin sessions. Test membership removal against a still-authenticated session.
- [ ] Test direct data API access as well as UI access. Anonymous and ordinary authenticated roles must never read drafts or unpublished revisions, write CMS records, or change memberships. Verify only site-scoped published revisions are exposed if a future Stage introduces public CMS reads.
- [ ] Confirm newly issued and refreshed admin cookies are HttpOnly, Secure, host-only, and SameSite=Lax. Exercise expiry, rotation, logout, missing configuration, and HTTPS behind the deployment proxy. Confirm admin responses are private and non-cacheable, Server Actions retain same-origin protection, public sign-ups are closed, and login rate limits are set for the deployment.
- [ ] Check grants, default privileges, existing permissive and restrictive policies, RLS on every exposed table, and the owner and execution privileges of every function. Scope views to caller permissions where appropriate. Parameterize SQL. Any needed SECURITY DEFINER function requires an empty or trusted search path, fully qualified objects, minimal privileges, and an explicit execution allowlist.
- [ ] Verify bucket configuration permissions, private object paths, signed-link scope and lifetime when used, and anonymous object denial even through public URL routes. Test new Storage policies against existing policies on the same relations.
- [ ] Treat CMS text as untrusted. Keep React escaping enabled, restrict protocols of future CMS URLs and embeds, validate rich content at write and render time, and avoid arbitrary HTML. Review browser bundles, logs, errors, fixtures, environment files, and Git history for credentials. Keep only the Supabase publishable key or local anon key in the public variable.
- [ ] Run typecheck, lint, applicable existing tests, and a production build. Review dependency advisories and record results. Review preview deployment configuration separately. Record local and hosted validation separately, with any unexecuted checks called out.

## Current application boundary

Password sign-in and sign-out use Server Actions. Works mutations check verified server identity and membership, validate inputs, and use restricted database RPCs. Media upload, metadata edits and deletion use same-origin route handlers that check verified identity and membership before opening a server-only writer. Media reads and preview signing use the administrator's session. Direct Storage mutations in the CMS bucket are denied to client roles. Proxy refreshes cookies and gives protected pages an early redirect. CMS queries use structured filters and React renders asset names and captions as text.

For Stage 7.3 releases, exercise raw-byte validation, upload rate and size bounds, Storage write compensation, deletion of a referenced asset, and expiration of a signed preview. Confirm that hosted secrets stay server-only and that credential and bucket limits match the deployment.

If Stage 7.1 was deployed before cookie hardening, revoke earlier admin sessions and clear the old site cookies before reopening access. Cookie flags apply when the cookie is written. Keep production auth and hosting settings within the hosted acceptance checks.

See [Supabase setup](supabase-setup.md) for migration order and account setup.

## Stage 7.4 case study acceptance

- [ ] Confirm migration 005 follows 001–004. Check execution privileges and same-origin, verified administrator access to the case-study action and existing private media endpoints.
- [ ] Reject unknown types, duplicate IDs, over-depth or oversized input, unsafe links/embeds and incompatible asset references in a disposable draft. Verify that rejected saves leave metadata, cover, contents and version intact.
- [ ] Check historical and nested asset references, including gallery items, comparison images and video posters. Exercise both deletion orderings against draft saves. Verify that an asset marked deleting cannot be added and that referenced files cannot be reserved for deletion.
- [ ] Confirm stale saves preserve local edits, an explicit conflict choice uses a fresh token, and saves after publication create an editable draft. Verify unauthenticated and ordinary authenticated users cannot read or write case-study drafts or retrieve private asset previews.
