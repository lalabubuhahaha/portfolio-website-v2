# Stage 7.2 · Works Management

## Editor and list

- Use Works to search titles, slugs, and summaries. Filter by Independent/Client, Draft, Published, or Archived. Sort by latest update, oldest update, or custom display order.
- New Project creates the project, the first draft revision, and default Gravity settings in one transaction. Edit changes the newest editable draft. Title can generate a URL-safe slug and Slug can override it. Tools and tags accept comma-separated values. Cover selects an existing private image or remains empty. The list displays short-lived signed thumbnails.
- The editor shows save feedback, detects stale edits, and warns before following a link or unloading with unsaved changes. The read-only archived editor remains available. Publishing and uploads are deferred.

## Drafts and publication

A sealed revision is retained. The next save copies its theme and content blocks to a new unsealed revision before writing the submitted metadata. Repeated saves update that editable revision. Existing published revision pointers are never changed by a draft save. Per-site publication snapshots keep the published slug and category stable when their draft equivalents change. The migration backfills those snapshots from the existing project fields. The publishing trigger captures identity when a privileged publisher changes the revision pointer.

Published means Gravity has a publication pointer. The list adds **Unpublished changes** when the newest revision differs from that pointer. A featured draft shows **Pending Publication**. Future public queries must resolve the active site's publication pointer and identity snapshot and exclude projects with `archived_at`.

## Ordering and archiving

- **Display Order** reorders every active project. **Featured Order** reorders all active Gravity featured entries, including pending entries. Both modes use full lists independent of filters and save on drop. Drag by pointer or touch. With a focused handle, press Space, move with the arrow keys, and press Space to drop.
- The database compares the prior ordered set to its current order before applying changes. The UI restores the prior order and offers a reload if saving fails. The Featured toggle and reorder functions target only Gravity.
- Archive confirms the action and sets `archived_at` without deleting history, media links, or site settings. Restore clears the timestamp and retains the previously stored order and Featured intent. Archiving is project-wide and future public queries must respect it for every site.

## Migration and security

Apply [20261120000300_cms_works_management.sql](../supabase/migrations/20261120000300_cms_works_management.sql) once, after the two [Stage 7.1 migrations](supabase-setup.md), in the confirmed Supabase project. The file adds transactional RPCs, per-site publication identity snapshots, and narrower write grants. It leaves existing read policies and Storage rules in place. No reset is required. The authenticated role cannot publish or hard-delete CMS projects and cannot change another site's settings.

The server verifies the Supabase user and admin membership on each mutation and allowlists submitted fields. The RPCs are SECURITY INVOKER with an empty search path, explicit admin checks, and anonymous execution revoked. RLS remains the data boundary. Transaction locks serialize stage mutations, unique constraints guard slugs and versions, and optimistic tokens reject stale editor and ordering requests. The editor only accepts safe HTTP(S) URLs and React renders user text without HTML. Server Actions use Next.js same-origin checks and the existing private admin session handling.

Run `npm run test:cms` for block and form validation. The isolated integration suite [cms-works.sql](../tests/cms-works.sql) exercises grants, roles, publication snapshots, slug errors, order conflicts and revision integrity. Run the file with `psql` as the owner of a disposable Supabase database that has all three migrations. It rolls back its fixtures. Do not run that suite against the hosted database. See the [stage security checklist](cms-security-checklist.md) for hosted acceptance.

Public content still reads existing portfolio data. Hosted migration and hosted security verification require access to the intended Supabase project. Media upload, publication UI, public project pages, and connecting the public content source remain in later stages.

## Validation evidence

The isolated Supabase stack and Chromium covered draft creation and reload, editing a published project, slug collisions, parallel edits, archive and restore, filter and search results, Featured state, keyboard and touch sorting, stale-order rollback, and anonymous and ordinary-user denial. Removing a membership denied access to an otherwise valid session. The browser exercised 1920, 1440, 1024, 768, and 390px widths and the existing public routes. Hosted migration, hosted proxy/session behavior, and hosted role checks remain unverified.
