# Portfolio Website Roadmap

本文件只記錄開發順序。每個 Step 完成並確認後，才能開始下一個 Step。

## Phase 1：前台骨架

### Step 1：專案與資料基礎

- 專案初始化
- 建立 `AGENTS.md` 與 roadmap
- 定義資料型別
- 建立 `lib/content` 資料存取層
- 建立本地假資料與佔位圖片

### Step 2：作品瀏覽

- 首頁
- 共用作品卡片
- Work 頁
- 使用網址參數的分類篩選

### Step 3：作品詳情

- 作品詳頁
- Markdown 顯示
- 404 行為
- SEO metadata

### Step 4：完整前台

- About 頁
- Footer
- RWD
- 完整驗收

## Phase 1.5：實驗性動畫

### Step 1：Hero 動態 Prototype

建立 Hero 動態概念並確認互動方向。

### Step 2：Hero 拖曳與游標互動

加入可拖曳元素、游標磁吸、閃避或旋轉互動。

### Step 3：作品卡片 Hover 動畫

加入圖片揭露、傾斜、圖層位移與 VIEW 提示。

### Step 4：ScrollTrigger 與捲動動畫

加入文字揭露、作品進場與輕微視差，不使用 scroll hijacking。

### Step 5：手機、效能、無障礙與細節調整

完成觸控替代行為、reduced motion、效能及事件清理驗收。

## Phase 2：Supabase

- 建立資料表與 Migration。
- 使用 `supabase/migrations`。
- 使用 Supabase CLI 產生 TypeScript 型別。
- 所有公開資料表啟用 RLS。
- 匿名訪客只能讀取 `published`。
- 匿名訪客不能新增、修改或刪除。
- 管理者權限使用可信任的 `app_metadata.role` 或固定 user id。
- 不使用 `user_metadata` 作為授權依據。
- Storage 使用 `portfolio-media` bucket。
- 上傳路徑使用 UUID。
- Storage 寫入僅允許管理者。
- 前台使用不讀取 cookie 的公開 client。
- 管理端使用受保護的 Server Client。
- 適當設定圖片 `remotePatterns`。
- 快取策略依安裝版本官方文件決定。
- 不把 Supabase service role key 暴露給瀏覽器。
- 正式使用前確認 Supabase 當時的免費方案與備份限制。

## Phase 3：管理後台

- 建立 `/admin`。
- 使用 Supabase Auth Email 登入。
- 關閉公開註冊，只有指定管理者可使用。
- 啟用 TOTP MFA。
- 路由層限制未授權存取。
- 每個 Server Action / Route Handler 必須再次驗證身分與授權。
- RLS 為最終資料權限保護。
- 不信任 `getSession` 作為伺服器授權依據。
- 使用實際版本建議的 `getUser` / `getClaims`。
- 所有寫入參數使用 zod 驗證。
- 後台採動態渲染、`no-store`、`noindex`。
- 作品列表包含 draft，並可調整 `sort_order`。
- 批次排序須具備交易原子性。
- 可切換發布狀態及新增、編輯、刪除作品。
- slug 自動產生、可修改且不可重複。
- 提供 Markdown 編輯器與即時預覽。
- 預覽共用前台 Markdown 元件。
- 圖片上傳前壓縮並轉為 WebP。
- 驗證檔案大小與類型。
- 內文圖片上傳後插入 Markdown。
- 草稿預覽使用受保護的 Draft Mode。
- 刪除需要二次確認。
- 發布後依實際 Next.js 版本使用合適的按需快取更新機制。
- 不需重新部署即可更新公開內容。
