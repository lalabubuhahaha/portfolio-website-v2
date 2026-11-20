# Stage 7.3 · Media Library

## Media and cover workflows

Open **Media Library** from the admin sidebar. Search is submitted explicitly, and the server returns 24 matching rows at a time. Format and date filters apply to the whole collection. Grid and List show the same results. Open a file for its original preview, dimensions, upload date and editable display name, alt text and caption. **Copy Asset Reference** copies the stable UUID.

The reusable picker filters ready assets and returns a UUID. Works enables image-only selection, preview, replacement and clearing. The draft stores the UUID in `cover_asset_id`. A link generated for preview is temporary.

## Upload boundaries and quality

| Limit | Behavior |
| --- | --- |
| Formats | JPEG, PNG, WebP, AVIF, GIF, MP4 and WebM with matching file extension, declared MIME and detected file signature |
| Size | 4 MiB per file through the authenticated Node.js route. Images also have a 32-megapixel decoder limit. |
| Concurrency | Files upload sequentially per queue. The database allows up to 15 validated-route attempts per administrator in each one-minute window. |
| Original | Private and byte-identical. PNG alpha, existing color data and GIF frames are preserved. |
| Grid/List | Lazy-load a separate WebP derivative for new still images, fitted within 480 × 360 without enlargement or cropping. Videos, GIFs and legacy assets without derivatives show format placeholders. |
| Detail | Sign and load one original on demand. GIFs remain animated. Videos use browser playback controls and metadata preload. Works cards prefer the same derivatives and only fall back to originals for small legacy images. |

The app allocates a UUID per queue item. Its original path uses the authenticated administrator UUID, the asset UUID and a server-chosen extension. The display filename is separate. The route reserves metadata before putting objects into Storage and marks the record ready after both writes succeed. A failed Storage write compensates by removing created objects and the reservation. If the outcome cannot be confirmed, the record stays available for inspection and cleanup. Reusing a successful upload UUID returns the prior result. Different files with the same name receive distinct paths.

Cancel stops a queued file or the browser request. A file already received by the server can finish saving. Interrupted reservations can be removed from the library after ten minutes. The original is never overwritten. Select a different asset to replace an image in a draft.

## Private Storage and deletion

Migration 004 retains the private `cms-private` bucket. Restrictive Storage policies block direct inserts, updates and deletes using client JWTs, including administrator JWTs. Only ready, registered objects can be read by administrators. All mutation handlers check the origin, verified session and administrator membership before using a server-only Supabase credential. The handlers use a fixed bucket, structured queries and validated identifiers.

Preview links are scoped to a single object or the visible page of thumbnails and expire after 120 seconds. Media API responses are private and non-cacheable. Newly managed objects set cache age to zero. Bytes already downloaded remain with the client, and an issued signed URL remains a bearer capability until expiry.

Deletion checks all revisions, including archived and published history. It checks the foreign-key cover field and conservatively detects the asset UUID anywhere in existing nested JSON blocks. It reserves the record for deletion before removing objects and blocks new cover attachments during cleanup. A failed deletion can be retried. Before Stage 7.4 opens block writes, validate IDs against ready assets on every write and evolve this check to suit the validated block references.

## Deploy and validate

1. Confirm the intended hosted Supabase project and verify migrations `20261120000100`, `20261120000200` and `20261120000300` in order.
2. Apply [20261120000400_cms_media_library.sql](../supabase/migrations/20261120000400_cms_media_library.sql). It adds metadata, upload rate state, reference protection and restrictive policies.
3. Configure a server-only `SUPABASE_SECRET_KEY` in the matching deployment and redeploy. Use the Supabase secret for the same project as the existing public variables. The local Supabase service-role key can be used in a disposable test instance. Keep this credential out of `NEXT_PUBLIC_*`, browser bundles, logs and source control.
4. Confirm the hosted private bucket permits the seven formats and the WebP derivative and that its plan and bucket settings accommodate the app's 4 MiB limit. Verify the canonical host and forwarded scheme reach Next.js, then exercise administrator and ordinary-user roles using the [security checklist](cms-security-checklist.md).

Run `npm run test:cms` and run [cms-media.sql](../tests/cms-media.sql) with `psql` as owner on an isolated instance with all four migrations. The suite rolls back its fixtures. Use the disposable environment for uploads and failure injection.

Publishing and public asset delivery are deferred to Stage 7.8. Larger uploads and resumable video need a separate transport review. Video dimensions are not extracted on the server and codec playback depends on the browser. Storage usage is omitted because the catalog does not represent all storage bytes.


## Validation evidence

A disposable Supabase stack and Chromium verified upload and byte-identical delivery for all allowed formats, image thumbnails, video playback, filters, metadata edits, cover selection, responsive dialogs, and denial of referenced deletion. Tests injected a database reservation failure, a derivative failure, and a Storage deletion failure. They verified no orphan from the compensated upload and successful retry of the deletion. An issued preview link was rejected after its 120-second expiry. Ordinary users and anonymous callers could not use the protected app or read private media, and an administrator JWT could not bypass the upload route. The client bundle scan found no test writer credential.

Hosted Supabase connectivity, the hosted plan and policies, and the hosted session and origin behavior remain deployment checks.
