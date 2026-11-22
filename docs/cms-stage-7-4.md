# Stage 7.4 · Visual Case Study Block Editor

Open an existing draft in **Works**. The toolbar shows the title, draft status and unsaved state. **Project details, cover and SEO** contains the existing metadata editor. Search the **Block Library** or select a block in the **Content Outline**. Use the placement menu to append, insert around the selection, or add to a selected Columns lane. The inspector edits properties, moves, duplicates and deletes. At narrow widths, the library and inspector are collapsible and appear before the canvas. **Preview** displays the current in-memory draft with the authoring controls removed. It is available only in the authenticated editor.

| Block | Controls |
| --- | --- |
| Heading | H2/H3/H4, alignment, emphasis, anchor fragment prefixed with `section-` |
| Rich Text | Tiptap paragraphs, bold, italic, underline, strike, lists, links, blockquotes, inline code, alignment and safe color palette |
| Image | Upload/pick/replace/remove, alt, caption, alignment, fit and aspect |
| Image Gallery | Multiple editable/reorderable images, per-image and gallery captions, desktop/mobile columns and gap |
| Columns | Two or three lanes with nested blocks, width presets and optional mobile stacking |
| Image + Text | Image placement, ratio, heading, copy, alt, caption and mobile stacking |
| Video / GIF | MP4/WebM/GIF, poster, caption and aspect. Native video controls support mute, loop and muted autoplay. GIF playback uses the original file's frame timing and loop count. |
| Quote | Quote, attribution, role/source, alignment and type presets |
| Metrics | Author-entered values, prefixes/suffixes, labels/descriptions and one to four columns |
| Figma Prototype | Validated Figma prototype link, user-initiated sandboxed embed, caption, aspect and original link |
| Links / Buttons | Multiple validated links, variants, alignment and optional new tab |
| Divider | Solid, dashed or subtle rule with width and spacing presets |
| Spacer | Presets and custom desktop/mobile height |
| Color Palette | Multiple labeled HEX swatches, roles, grid and clipboard copy |
| Typography Specimen | Font name, sample, weight, size, line height, letter spacing and description. Preview uses local allowlisted families and a system fallback. |
| Before / After | Two images, labels, responsive side-by-side or an interactive native range input |

## Data and rollout

Apply [20261120000500_cms_case_study_blocks.sql](../supabase/migrations/20261120000500_cms_case_study_blocks.sql) after migrations `20261120000100` through `20261120000400` on the same Supabase project, before deploying the editor. Use the existing hosted Supabase and private Media Library configuration. No additional environment variables are required. If PostgREST has not refreshed its schema after applying the migration, reload its schema cache before testing the save action. Verify the deployment SHA and target database before testing a disposable draft.

The original version-1 document shape remains in `project_revisions.content_blocks`. The editor accepts stable UUIDs, up to 150 blocks and five block levels, and at most 200,000 UTF-8 bytes on application save. The database also bounds its JSONB representation. Unsupported legacy documents are retained and identified in the editor. Metadata can still be saved while that content is protected. Review and convert those documents explicitly before editing them.

The case-study RPC uses the previous metadata/concurrency workflow inside the same transaction, then writes content to the editable revision and returns the final project timestamp. A failed validation rolls back both operations. The historical published pointer and sealed revision remain intact. In a content conflict, the user explicitly chooses which whole document to retain. Metadata and cover retain their existing field-level review. A subsequent write still invalidates the reviewed version.

Media references store IDs. The database validates typed nested references against ready, compatible private assets and serializes writes with deletion reservation. Deletion protects historical and published revisions; unknown pre-existing documents retain conservative reference protection. Admin rendering fetches private preview URLs on demand with the existing lifetime. Signed URLs are absent from saved documents.

## Local validation

Run `npm run typecheck`, `npm run lint`, `npm run test:cms`, `npm run test:gravity`, `npm run test:portrait` and `npm run build`. Run [cms-works.sql](../tests/cms-works.sql), [cms-media.sql](../tests/cms-media.sql) and [cms-case-study.sql](../tests/cms-case-study.sql) as the owner of an isolated database with migrations 001–005. These scripts roll back their fixtures. Hosted migration, role checks and editing acceptance require access to the actual deployment. Follow the [security checklist](cms-security-checklist.md).

Preview links are validated before rendering. The Figma embed uses a fixed HTTPS host, opens on user request and depends on the prototype's sharing permissions. Preview reflects this stage's editorial layout. Gravity theming, publishing, advanced interactions and the public work detail route are scheduled in later stages.

### Measured results

On a local Production Build with isolated Supabase and Chromium at 1440px, Works → Edit took 403 ms in the first Stage 7.3.2 sample and 421 ms in the first Stage 7.4 sample. Across five subsequent navigations per build, median time to the editor controls was 409 ms and 395 ms. These samples use the same test project with no case-study content and include browser interaction overhead. In the populated test case, five Quote property edits reached the visible canvas in 12–30 ms, median 16 ms, with zero new Media API requests. Hosted performance remains unmeasured.

Chromium verified adding, editing, saving, reloading, previewing and deleting all 16 blocks across the case-study flow. It also exercised rich text, nested lanes, gallery reorder, GIF/MP4/WebM, direct upload, comparison input by mouse/touch/keyboard, concurrent drafts and the existing cover/ordering flows. Responsive checks covered 1920×1080, 1440×900, 1024×768, 768×1024 and 390×844. The Figma frame target and sandbox were checked with an intercepted network response; a live shared prototype remains a hosted acceptance item.

The SQL suites passed on isolated Supabase. Browser role checks denied unauthenticated, ordinary authenticated and invalid sessions. The production dependency audit reported one existing moderate Next.js advisory and zero high or critical advisories.
