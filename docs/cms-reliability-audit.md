# CMS Stage 7.4.2 reliability audit

## Audit summary

The editor captures the current block snapshot at submit, validates metadata and document size and structure, and serializes explicit save intent. The server action checks verified Supabase identity and administrator membership, keeps Next.js same-origin checks, and writes editable fields and content through the existing transactional RPC. Latest-revision read-back checks the project token, normalized fields and exact block structure before returning verified success. Editor reads are private and uncached. Authorization errors and ambiguous network responses preserve the form state.

The database retains the project concurrency token, immutable sealed revisions, private ready-media validation, deletion locking and separate Gravity publication pointer. Archive/restore and display/featured ordering continue to use the existing policies and RPCs. Rejected transaction writes roll back. A commit followed by response loss is possible and the editor asks the user to review the stored draft rather than claim success.

## Findings

| Priority | Finding | Disposition |
| --- | --- | --- |
| P0 | Production save failure observed at 10:16 | Root cause remains unconfirmed. See [CMS-INC-001](cms-incidents/CMS-INC-001.md). |
| P0 | URL-derived success and missing evidence that the user-visible draft matched the write | Retain the verified read-back fix. Send the current content and metadata through the same transaction for editable drafts. |
| P1 | Authorization or transport loss could strand editor work or lead to an ambiguous retry | Save returns an error in the open editor; uncertain writes require latest-draft review. RPC, read and admin fetch requests have a 12-second per-request deadline. |
| P1 | Browser reload or closure could discard the only copy | Opt-in, scoped recovery with expiry, file backup, read-only import validation, explicit review and a separate version-checked save. |
| P2 | Reported hosted admin navigation around two seconds | Still open. This release preserves the extra read-back check. |

## Scope and security

No installation-stage migration is needed. The private bucket, MIME/signature and size validation, role grants, RLS, revision protection and media deletion guards continue to enforce the existing rules. Import checks ready-state and media compatibility before staging, and normal save rechecks database references under transaction protection. Block schema rejects unknown types, duplicate IDs, unsupported content and unsafe links. Error logs omit draft text and credentials. Desktop profiles, local disk, XSS and browser extensions are residual exposure surfaces for local recovery. Review the opt-in and shared device guidance in the [recovery guide](cms-recovery-guide.md).

## Deployment plan

Keep the fix local until release approval and confirm which deployment serves the official hostname. Verify migrations 001–005 are already applied on its Supabase project. Deploy the reviewed SHA, then test a disposable draft using two browser profiles and repeat the security acceptance gate. Verify recovery, visible failure, the stored version and publication pointer in that deployment. Leave the production incident open until runtime evidence has been evaluated.

## Isolated fault matrix

Chromium used two independently authenticated browser contexts against the same isolated Supabase. The suite compared actual Server Action JSON to a separate uncached PostgREST read, including the latest revision ID, cover, SEO, metadata and token. The case study included 118 blocks and three levels of nesting.

| Requested case | Result and evidence |
| --- | --- |
| 1. Offline before save | Passed. Browser offline mode kept edits and withheld Saved. |
| 2. Transport reset | Passed. Request reset left the stored draft and current edits intact. |
| 3. Lost response after commit | Passed. Browser dropped the committed response, a separate context read the stored document, and the original editor required review. A separate gateway fault denied read-back after commit and also withheld Saved. |
| 4. 409 | Passed. Real stale-token rejection and injected HTTP 409 retained edits. |
| 5. 401 / 403 | Passed. Injected HTTP responses retained the editor. The live session-removal result is below. |
| 6. 500 | Passed. No verified success after injected HTTP 500. |
| 7. RPC timeout | Passed. An isolated gateway held the upstream request beyond the 12-second deadline without forwarding a write. |
| 8. Supabase unavailable | Passed for an isolated PostgREST 503 at the write boundary. Hosted outage behavior remains unmeasured. |
| 9. Session expiry | Simulated by removing cookies from an open editor. The action returned an explicit sign-in error without navigation and an independent login restored authentication. Natural hosted token expiry and refresh rotation remain pending. |
| 10. Duplicate Save | Passed. Two synchronous clicks produced one Server Action request. |
| 11. Fast edits and Save | Passed. Ten edited quotes, rapid nested Rich Text edits and a gallery update matched the submitted JSON. |
| 12. Parallel editors | Passed. An earlier editor received a genuine conflict and retained its unsaved version. |
| 13. Sequential devices | Passed with two authenticated Chromium contexts. Both read the latest data and the second context performed a confirmed write. Physical devices remain a hosted acceptance step. |
| 14. Large nested document | Passed with 118 blocks. Existing schema tests reject excessive nesting and size. |
| 15. Media reference changes | Passed. Recovery validation refused a missing asset, a valid imported cover replacement saved, and the SQL suite protected referenced assets and rejected incompatible or deleting media. |
| 16. Navigation after save | Passed. Left the confirmed editor immediately and re-entered to read the saved content. |
| 17. Unsaved reload | Passed. Reload exposed the existing snapshot and a comparison without writing server data. |
| 18. Browser closes and reopens | Passed with a real Chromium persistent profile closed and restarted. Power loss or process kill before storage flush remains unverified. |
| 19. Save after recovery | Passed. Review and Apply left the server unchanged; a separate Save verified the stored result. A later intervening save was rejected by concurrency checks. |
| 20. Older JSON import | Passed. An unversioned file required acknowledgment, staged without mutation, and saved only after a separate action. Wrong project, duplicate IDs and missing media were rejected. |

Browser recovery also exposed the download fallback when browser storage was unavailable and cleared snapshots during application sign-out. Separate storage tests verified opt-in, account/project/tab isolation, expiry, capacity, and consent revocation. Typecheck, Lint, CMS/Gravity/Portrait tests, Production Build and Works/Media/Case Study SQL suites passed. SQL suites cover archive/restore, ordering, transaction rollback, RLS, sealed revisions and reference safety. The existing same-origin Server Action policy was reviewed; deployed origin and proxy behavior remain part of hosted acceptance.

For repeatability, run the browser suite as described in [Draft save incident](cms-draft-persistence-incident.md). For isolated gateway faults start `node tests/fixtures/cms-draft-fault-gateway.mjs` against disposable Auth/PostgREST/Storage on loopback ports 54412–54414, point the app at 54411, and run with `CMS_TEST_FAULT_GATEWAY=1`. It reports only endpoint categories, status and duration. Run the SQL suites after browser mutations finish.

## Local performance evidence

One Chromium confirmed-save sample for the 118-block case took **186 ms**, including browser wait and UI confirmation. The loopback gateway measured **7.3 ms median** across 272 successful latest-revision reads (range 3.4–40.4 ms) and **38.1 ms median** across 32 successful save RPC calls (range 22.0–88.7 ms) across isolated retries and runs. These readings include gateway/service transit and are not direct SQL execution times. The read-back is one additional logical revision read after the write, with possible transport retries. The browser recorded one write during the input burst and three total including lifecycle flushes; the first localStorage call took about **0.1 ms**, excluding serialization and the debounce delay. The reported approximately two-second hosted navigation remains open and this isolated measurement does not establish hosted latency.
