# Stage 7.5.1 · Production acceptance fixes

**Stage 7.5 acceptance** NOT ACCEPTED. The earlier production report passed Undo / Redo, Autosave and Offline / Conflict Protection. Appearance and Outline failed because the user could not operate them. Manual Save After Draft Recovery had not been verified. The three items require new hosted acceptance.

## Findings and changes

- **Appearance** used to require selecting a block, finding the separate inspector, then opening a collapsed Visual settings disclosure. The width presets used fixed maximums that could both exceed the available canvas width and look identical. Each editable block now has an **Appearance** button on the canvas. The three controls open next to the block and changes are immediately visible. The Narrow and Text width presets also differ on a narrow canvas. The existing block layout and style fields still store the selections.
- **Content Outline** was collapsed by default. A small icon was the drag target without visible instructions, and global collision detection could choose a nested block or a different column which the drop handler then rejected. The pointer and touch paths were not covered by the earlier test. The outline and its instructions are now visible without expanding anything. Drag handles are marked and appear where same-level, same-column reordering is possible. Collision candidates stay within the active group. Select an outline row to show the existing Up/Down buttons.
- **Draft recovery** now describes how to enable snapshots and where to find them after reopening. Applying a backup shows a reminder in the save toolbar and keeps Autosave off while there are recovered edits to review. The existing save action still checks the draft version and verifies the database read-back before reporting success.
- The reported hosted site and Vercel metadata were blocked by the environment proxy. The deployed SHA, build/runtime logs, and editor rendering under the affected production account are still unverified. Source inspection shows the editor is admin-protected; archived drafts and unsupported legacy documents do not expose editable block controls. Preview shows the content without edit controls.

## 人工驗收

核准推送後，到 Vercel 的部署清單找出對應 Stage 7.5.1 Commit、分支為 `feat/independent-foundation` 且狀態為 **Ready** 的部署。從該筆部署點 **Visit**，使用可編輯的獨立測試草稿。準備兩個同層且同欄的區塊，例如兩個不同文字的 Quote。

1. **Appearance**：在任一區塊旁點 **Appearance**。應看到 **Width、Vertical spacing、Background**。逐一改為 **Narrow、Roomy、Accent**，確認區塊立即變窄、上下留白增加及背景變色。點 **Preview** 檢查同樣效果，返回編輯器儲存並重開確認。
2. **Content Outline**：在左側或手機版畫布上方找到 **Content Outline**。按住點狀把手交換兩個同層且同欄的區塊。確認畫布立即重排，再用手機觸控及鍵盤各試一次。鍵盤聚焦把手後按空白鍵、方向鍵、空白鍵。也可選取列表項目後使用上下箭頭。按 **Save Draft**，等 **Saved successfully** 再重開確認順序。
3. **復原後手動儲存**
   1. 保持連線，在測試草稿上方點 **Draft recovery**，再點 **Enable local recovery**。工具列的 **Autosave** 保持未勾選。
   2. 把測試區塊文字改成容易辨認的字句，例如「復原驗收 001」。先不按儲存，等復原區顯示 **Snapshot saved on this device**。此時工具列應仍顯示 **Unsaved Changes**。
   3. 在同一瀏覽器重新整理這份測試草稿。如出現未儲存提醒，確認前一步已看到快照完成後再繼續。點 **Draft recovery → Review snapshot**，展開 **Backup blocks** 核對「復原驗收 001」，再按 **Apply backup to editor**。
   4. 畫布應重新出現測試文字。工具列應提示已載入復原內容，且 **Autosave** 關閉，讓你先檢查再送出。這時伺服器還保留原先的草稿版本。
   5. 到工具列按 **Save Draft**。等到 **Saved successfully**，並確認 **Last saved** 更新。在第二個已登入的瀏覽器開啟同一草稿，應看到「復原驗收 001」。

## Isolated validation

Typecheck, ESLint, production build, all 16 CMS tests, and the Works, Media and Case Study SQL suites passed. Chromium verified desktop appearance controls, a measurable width change at 390px, matching Preview, mouse and keyboard dragging, touch dragging via Chromium device emulation, and persisted appearance and order after a fresh read. It also checked that a restored snapshot leaves the database unchanged until manual Save Draft, that the restored edit survives reopening, and that existing offline, concurrency, undo/redo, autosave and JSON recovery paths still pass. Physical-device and hosted acceptance remain pending.
