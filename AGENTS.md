# Portfolio Website 開發規則

1. TypeScript 必須啟用 strict。
2. 禁止使用 any。
3. 優先使用型別明確、易維護的程式碼。
4. 資料只能透過 `lib/content` 讀取。
5. 頁面與 UI 元件不得直接讀取假資料或資料庫。
6. 不要擅自新增依賴。
7. 不要擅自修改不相關檔案。
8. 不要擅自重構既有功能。
9. 樣式使用 Tailwind 主題 Token。
10. 不在元件中硬寫色碼。
11. 使用語意化 HTML。
12. 每個頁面只有一個 `h1`。
13. 標題層級不得跳級。
14. 圖片必須有 `alt`。
15. 互動元素必須使用正確的 `a` 或 `button`。
16. 不使用 `dangerouslySetInnerHTML`。
17. 不渲染 Markdown 內的原始 HTML。
18. 必須支援鍵盤操作。
19. 必須考慮 `prefers-reduced-motion`。
20. 不得為動畫犧牲正常捲動。
21. Next.js API 必須符合實際安裝版本。
22. 不要憑記憶使用可能已過時的 API。
23. 不要自行決定正式視覺設計。
24. 不要自行開始下一階段。
25. 修改完成後執行 typecheck、lint、build。
26. 如果測試失敗，必須說明原因。
27. 不得宣稱沒有實際執行的測試已通過。
28. 每次回報必須用白話說明修改與驗收方式。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
