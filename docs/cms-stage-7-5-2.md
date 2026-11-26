# Stage 7.5.2 · Recovery preview and safe apply

**Stage 7.5 acceptance** Conditionally Passed — Recovery UX Risk Open. The user reported 6/6 production functional passes after Stage 7.5.1. Recovery preview remains open for hosted retest.

Previously, Review snapshot displayed changed project fields and two collapsed block sections. Expanding them exposed raw JSON for the stored draft and backup. The panel did not compare the backup to unsaved edits in the open editor or move focus to the comparison. Applying was possible without reading the block contents.

Review snapshot now brings the comparison into focus. It shows the project title, Taipei snapshot time, block count including nested blocks, current and incoming text, block positions, and validated media names. Changed blocks are visible immediately and labeled Added, Modified or Removed. The Unchanged list is open when there are no changed blocks. Layout or formatting changes may be labeled Modified even if the readable text is identical. Individual settings are not rendered as a visual layout preview.

Before Apply, the editor warns about existing unsaved edits and asks for confirmation. It rechecks the stored version and candidate media. The previous editor content and project fields remain available via Restore previous edits in the same open tab until a verified save, navigation away, or restoration. Applying a backup changes the editor only, pauses Autosave, and requires Save Draft. The existing server save validates the version and media again. No migration is needed.

## 人工驗收

1. 核准推送後，在 Vercel 的 **Deployments** 找到 `feat/independent-foundation` 上對應本次 Commit 且為 **Ready** 的部署。點 **Visit**，開啟可編輯的測試草稿。
2. 開啟 **Draft recovery → Enable local recovery**，保持 Autosave 關閉。新增一個區塊、編輯欄內 Rich Text、替換 Gallery 圖片，並刪除一個區塊。等 **Snapshot saved on this device** 後，重新整理測試草稿。
3. 點 **Review snapshot**。應直接看到台北時間、作品名稱、區塊數、兩欄內容比較與 Added／Modified／Removed。展開 **Unchanged blocks** 查看保留的區塊。確認欄內文字有位置編號，Gallery 顯示素材名稱。手機上兩版上下排列。
4. 關閉比較，在目前草稿改另一段文字後再開快照。應看到未儲存提示，Current Version 應包含剛才的修改。先取消套用確認，再重新套用。確認編輯器顯示復原內容、Autosave 關閉、另一個瀏覽器仍看到原草稿。
5. 點 **Restore previous edits**，確認套用前的未儲存修改回來。再檢視並套用測試快照，按 **Save Draft**。等 **Saved successfully** 才在第二個已登入的瀏覽器重開，確認復原內容已儲存。

## 隔離測試

Typecheck、Lint、Production Build、16 項 CMS 測試及 Works、Media、Case Study 的 SQL 回歸均通過。Chromium 使用桌面及 390px 手機模擬，涵蓋預覽差異、巢狀內容、素材名稱、工具列與比較區的相對位置、取消套用、復原先前修改、拒絕無效備份、Autosave 暫停及手動儲存後由獨立登入情境讀回。正式環境和實體手機仍待驗收。
