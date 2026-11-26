# Stage 7.5 · Case study editing controls

The [CMS Roadmap](cms-roadmap.md) defines visual settings, drag ordering, undo/redo, and autosave. The Stage 7.4.1 editor UX issues remain open in the [UX backlog](cms-stage-7-4-1-ux-backlog.md). Stage 7.4.3 production acceptance and the CMS-INC-001 status remain recorded in their existing files.

- **Visual settings** in Block Properties configure width, vertical padding and a background preset. The editing canvas and Preview share the same rendering. Values use the existing block layout and styles objects. Unknown legacy values fall back to the existing look.
- **Drag ordering** is in the Content Outline. Use a pointer or focus a drag handle, press Space, move with the arrows and press Space again to drop. Drag within the same parent and column. The existing Move to column control changes columns.
- **Undo blocks / Redo blocks** keep up to 50 document edits in the open editor, including block content, ordering and presentation. Rich Text’s internal editing history also remains available. Project metadata stays outside block history. Applying recovery data or a conflict review starts a fresh history.
- **Autosave** is off by default and applies to the open draft tab when enabled. After three seconds of inactivity, it runs the same authorized, version-checked write and database read-back as Save Draft. It waits during offline mode, uploads, text composition, Preview and a save in progress. Errors pause automatic requests. Beginning a conflict or recovery review turns the option off, so applying a reviewed version still requires an explicit Save Draft. Reconnecting with autosave enabled can schedule an unsent dirty draft for verification against its current version.
- The existing draft, private media, backup/recovery and published revision boundaries apply. This release requires no migration.

## Stage 7.5 production acceptance

**Status** NOT ACCEPTED. The user passed Undo / Redo, Autosave, and Offline / Conflict Protection. Block Appearance Settings and Content Outline Reordering failed because the user could not operate them. Manual Save After Draft Recovery remains unverified. See the [Stage 7.5.1 fixes and updated checklist](cms-stage-7-5-1.md).

## Original Stage 7.5 manual acceptance checklist

Use a disposable draft in the intended deployment and a second authenticated browser.

1. Select a block, open **Visual settings**, change width, padding and background, and check the same result in **Preview** and after saving.
2. Open **Content Outline**, drag two sibling blocks by the handle and repeat with the keyboard. Confirm that a move to a different parent or column requires the existing explicit controls.
3. Use **Undo blocks** and **Redo blocks** after a reorder and after a Rich Text edit. Confirm a new edit after Undo clears Redo. Check the visible editor text, Preview and the draft after saving.
4. Confirm **Autosave** starts off. Edit a block and wait. Enable Autosave, continue editing, and wait three seconds after the last edit. Confirm **Saved successfully** and the second browser’s copy.
5. Go offline in an already-loaded editor with Autosave enabled. Edit Rich Text and confirm the changes stay available. Reconnect and check the saved state and current version. To verify a conflict, change the stored draft in the second browser before the first browser’s next save. Confirm the first editor keeps its changes and offers review.
6. Review a saved local snapshot or import a JSON backup with Autosave enabled. Apply it and confirm the editor stays dirty and Autosave is off. Save manually and confirm the stored result. Check Download draft backup remains available offline.

## Isolated validation

- Typecheck, ESLint and Next.js production build passed in a clean source snapshot. The snapshot used the committed About and Work pages while the working copy retained its local deletions.
- CMS tests passed (16), Gravity tests passed (32), and Portrait tests passed (7).
- Chromium against the production build and a disposable Supabase instance passed canvas and Preview settings, keyboard drag ordering, block and Rich Text undo/redo, and database read-back after autosave. It verified the default-off state, offline editing, reconnect, a competing write, and explicit recovery review. The existing persistence suite also exercised a separate authenticated browser, failure handling, response loss, offline recovery and JSON import.
- Transactional Works, Media and Case Study SQL checks passed on the disposable database and rolled back. Hosted acceptance and pointer/touch sorting are pending manual verification.
