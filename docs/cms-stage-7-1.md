# Stage 7.1 · CMS Foundation & Admin Design System

The CMS runs beside the existing Gravity portfolio. The route group `app/(portfolio)` contains the existing public root and routes. The `app/admin` root loads its own Tailwind CSS 4 stylesheet and local Inter font. Admin controls use shadcn/ui New York primitives with the portfolio admin tokens and Lucide icons.

## Routes and project data

- `/admin/login` uses Supabase email and password authentication with SSR cookies.
- `/admin` shows totals and recently updated projects.
- `/admin/works` shows the current list plus the design for future controls. New, edit, cover preview, search, and filters are inactive in this stage.
- The sidebar includes Overview and Works along with the disabled Home, About, Media Library, and Settings entries. On small screens, navigation opens in a keyboard-accessible sheet.
- Metrics count non-archived projects. Published means Gravity points to a published revision. Draft counts the remaining projects. A project can also have a newer editable draft while retaining its Published status. Featured counts published Gravity projects with the featured flag. An unavailable query shows an error and unknown totals.

The dashboard reads the newest revision metadata, which may be a draft. The existing public portfolio still reads its mock data.

## Database

| Table | Purpose |
| --- | --- |
| `admin_users` | Explicit allowlist keyed by Supabase Auth user UUID |
| `sites` | Site registry, seeded with `gravity` |
| `projects` | Stable identity, unique slug, independent/client category, activity timestamps, archive status |
| `project_revisions` | Numbered versions of project metadata, category tags, cover reference, theme and blocks |
| `project_site_settings` | Per-site publication, featured and display ordering |
| `media_assets` | Private Storage object metadata and cover relationships |

Revisions have unique numbers per project. A composite foreign key binds each publication pointer to a revision of the same project. Setting the pointer seals the revision in the same transaction. Further edits use a new revision. Independent unpublishing clears the site’s pointer and timestamp. It leaves the snapshot sealed and other sites’ pointers intact.

Blocks use `{ version: 1, blocks: [...] }`. Ordered arrays support nested children. Each block includes a UUID, a type key and a content object, with optional layout, styles, animation and responsive settings. The database validates the document envelope. `lib/cms/blocks.ts` validates the full structure with Zod. Future renderable block types can extend this baseline with a discriminated union. Themes use `{ version: 1, settings: {...} }`.

## Security

Proxy refreshes session cookies for admin requests. The protected layout and project query independently verify the Supabase user and their allowlist membership. The login server action checks membership after password authentication. The database enforces admin-only reads and writes using RLS and grants. An authenticated user can read only their own membership row, and membership cannot be set through the app. Site registry changes are reserved for database administration.

The public portfolio has no CMS read grants at this stage. A later public read interface must resolve the requested site to its published pointer, filter archived projects, and return only that revision. History and drafts must stay private.

`cms-private` is a private Storage bucket. An explicit restrictive policy also guards against broadly permissive Storage policies. Members can manage these objects. A future publishing flow must deliver only explicitly approved derivative assets or issue scoped access after checking a live published revision. Draft paths must stay private. Stage 7.1 introduces no public media bucket.

See [Supabase setup](supabase-setup.md) for migration, account setup and deployment. The roadmap records the deferred editor and rendering work.
