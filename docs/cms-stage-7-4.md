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

## Stage 7.4.1 editor recovery

- **Add Block** opens a searchable library on an empty or populated canvas. **Insert above**, **Insert below**, and **Add content** open the same library with the destination already selected. A nested block can move within its lane or to another lane through **Move to column**.
- Edit Heading and Rich Text directly on the canvas. Select a text range and choose a swatch in **Text color**. The same saved text marks are rendered in Preview. Edit an Image to expose the existing private upload and picker alongside its image.
- Select a Gallery to see the 2, 3 and 4 column presets first. On desktop, the selected tracks are used when the gallery has at least 320 CSS pixels of canvas width. Compact and mobile canvases use **Mobile columns** under **Gallery options**.
- Motion blocks reserve their aspect ratio from the first render. The **native** ratio setting uses a stable 16:9 playback surface with contained media. A poster is used when provided, and a video can show its first frame as soon as the browser decodes it. GIF play and stop retain the same surface.
- Figma frames load after consent to connect to Figma. The frame follows the canvas width and supports 16:9, 4:3, 1:1 and 3:4. The loading indicator refers to the iframe request. Sharing errors can appear inside the frame, and startup timeout offers Retry. **Fullscreen** is available where the browser supports it. Prototype zoom remains controlled inside Figma. The official embed documentation could not be retrieved through the cloud proxy, and the editor forwards the validated share URL's existing parameters without adding a scaling parameter. A real shared prototype remains a hosted acceptance item.
- Stage 7.4.1 uses the existing document, authentication and media architecture. No database migration is required for this update.

The isolated Chromium case **CMS Editorial UX Test** verified two text colors through save, reload and Preview, lane-specific insertion and movement, three distinct images across three tracks, and native playback of MP4 and WebM plus poster-backed GIF playback. The desktop playback height stayed at 336 CSS pixels through the applicable playback phases. At a 390px viewport, all three formats stayed at 179 CSS pixels. The intercepted Figma frame measured 598×448 on desktop and 318×239 on mobile. The test covered consent, loading, iframe load, fullscreen, timeout and retry. Mobile touch input applied a text swatch and opened the lane-specific block picker. This evidence is from local Chromium and an isolated Supabase database.

## Stage 7.4.3 save feedback and offline editor

On the Stage 7.4.2 baseline, a cold Chromium context opened the editor online, switched to Offline and selected an existing Rich Text block. Chromium attempted four JavaScript chunk GETs, all failed with `ERR_INTERNET_DISCONNECTED`, and the client raised `Loading chunk 4 failed`. The trace contained no POST, RSC request or main-frame navigation. This reproduces loss of access to Rich Text locally. The production browser's final transition to a Chrome error page remains unconfirmed.

The canvas now loads the Rich Text module alongside its own code. Click text to start editing, or use the existing keyboard-accessible edit control. Marked links in editable text remain text in the canvas; Preview retains link navigation. With Chromium Offline and the same editor already loaded, clicking and typing Rich Text produced no requests or navigation. An offline Save shows explicit failure and keeps the current draft, and reconnecting enables latest-version review and import. This is support for an in-memory editor that has already loaded. Opening or reloading a page while offline still depends on the browser and network.

The sticky toolbar shows Unsaved Changes, Saving…, Saved successfully after verified database read-back, Save failed with the next action, and the last stored time in Taipei. The saved time only advances after a verified save or explicit review of the latest stored draft. The existing transaction, authorization and concurrency rules remain in place.

### Stage 7.4.3 production acceptance

- **Date** 2026-11-24 (Asia/Taipei)
- **Status** Accepted
- **Result** PASS (4/4), reported by the user after manual testing in production
- **Additional notes** None

| Check | Result |
| --- | --- |
| Save success feedback | PASS |
| Rich Text offline editing | PASS |
| Offline save failure handling | PASS |
| Draft backup and recovery | PASS |

The acceptance applies to the four checks above. The original root cause of [CMS-INC-001](cms-incidents/CMS-INC-001.md) remains Unconfirmed, and residual data-loss risk remains.

### Stage 7.4.1 UX acceptance

**Deferred — UX Improvements Required.** The user chose to defer UX improvements. Outstanding items are tracked in the [Stage 7.4.1 UX backlog](cms-stage-7-4-1-ux-backlog.md).
