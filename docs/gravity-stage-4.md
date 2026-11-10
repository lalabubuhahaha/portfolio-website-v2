# Gravity Edition — Stage 4

基準：Stage 3 `cc53dd4f0c470c38da1ee22a64a91ab649b57415`，分支 `feat/independent-foundation`。開工時本地、GitHub SHA 相同，工作目錄乾淨。已閱讀 AGENTS.md、roadmap 與原始 Gravity Prompt 的 Header、Loader/reveal、Section 01–04、Footer、Smooth scroll 章節。

## 實作

- `gravity-experience.ts`：每次 Story 共用一個控制器，React Activity 快取頁面重新啟用時開啟新一輪載入協定。Scene 回報 ready；Loader 完成才呼叫原有 `world.start()`；卸載取消註冊，重複完成不會再啟動入場。逾時或 reduced motion 先放行時，晚到的場景仍能開始。
- `gravity-loader.tsx`：原始 92% / 1.7 與 100% / 6 插值、dt 上限 0.05、99.4 snap、140ms + 520ms 離場；原始 radial gradient、三段 stagger、Raleway / JetBrains Mono 與細藍進度條。這是場景準備品牌動畫，不是所有資源下載百分比。
- 最長等待 12 秒；不支援 WebGL、初始化失敗或 reduced motion 直接放行。可用鍵盤跳過；背景暫時 inert，完成、跳過與卸載均還原，不改 body overflow、不鎖 scrollbar、不改 Canvas 尺寸。無 JavaScript 時 Loader 原本就 hidden，文字正常顯示。
- `gravity-scene.tsx`：只新增 ready/失敗回報與入口註冊；維持固定 Canvas、Resize 後立即補繪與同一個 Renderer/物理迴圈。
- `SiteHeader`：LALA、玻璃導覽、原有 Studio Controls、Contact orb。手機分成兩列；Home/Work 是既有路由，About 連結現有介紹佔位區，Contact 明確標註聯絡方式待提供。
- `home-section-link.tsx`：首頁用原生 `#fragment`，保留 query、歷史與已掛載的 Scene；其他頁面用 Next Link 回到首頁區塊。實測修復帶診斷 query 時 Next `/#contact` 改網址卻未捲動的行為。
- `Reveal`：IntersectionObserver 45%、一次播放，42px / 8px blur / opacity，1.5s 原始 easing。用於 Section 02–04、About 佔位、作品與 Footer；不改原本 Section 排版、文字或高度。SSR 預設可見；沒有 Observer、reduced motion 或鍵盤 focus 時不隱藏內容。
- `GravityFooter`：#0a0a0a、圓角上緣、藍色 glow、26s marquee、LALA CTA、三欄真實導覽／社群佔位與版權。沒有虛構信箱、無效 mailto 或假社群連結。Reduced motion 停止 marquee。
- `GravityArrow`：共享 SVG，避免字型缺少斜箭頭字元。

## 捲動選擇

保留原生 wheel、touch、鍵盤與 scrollbar，僅用 CSS `scroll-behavior: smooth` 提供原生錨點平滑效果；reduced motion 改 auto。沒有攔截 wheel、沒有額外 scroll rAF 或第二套 lerp。這與原始 lerp 0.09 / wheelMultiplier 1 的自訂滾動手感不同，目的是保留正常瀏覽、History 與 Drawer 行為。Three.js 仍讀取實際 scrollY / innerHeight。

## 驗收

- `npm run typecheck`、`npm run lint`、`npm run build` 通過。
- `npm run test:gravity`：12/12 通過，包含原有 8 項物理／連續性／配色測試，新增 4 項 Loader 控制器協定測試。
- Chromium + ANGLE SwiftShader 實際運行 WebGL，1440×900、390×844：Loader ready 前未達 100%，顯示 100% 後離開；Loader 可見時 entranceCount 為 0，離場後為 1。
- 兩尺寸測試進度 0、0.25、0.40、0.55、0.70、0.85、1、1.25、1.5、2、2.5、3、3.45，以及反向 3、2.5、2、1.5、1、0.7、0.4、0；Canvas/Camera/Mesh 保持一致、scroll resizeCount=0、entranceCount=1、無水平溢出。
- 四種配色、Drawer Tab/Shift-Tab、Escape、focus 返回、wheel lock、關閉後錨點與歷史返回通過。Reduced motion 不持續渲染；真正 resize 不新增 Context 或重播入場。
- 模擬延遲 Scene chunk：4.5 秒時顯示 091%，保持等待；ready 後完成。模擬超過 12 秒：Loader 放行、背景 inert 全數還原，晚到 Scene 只進場一次。鍵盤 Tab → Skip → Enter 後焦點返回 LALA。
- 強制拒絕所有 WebGL context（含 experimental-webgl）、初始 reduced motion、停用 JavaScript 均可顯示主要內容。
- 原生鍵盤 PageDown、wheel、CDP touch swipe、Drawer touch lock／關閉後恢復、跨頁 About 均通過；觸控鎖定測試在上一段慣性結束後開始。Work 可見作品數 All=6、Independent=3、Client=3，React Activity 保留的隱藏卡片不算入。
- 首頁 → Work → Browser Back 在桌面與手機都通過：離開時 Canvas 清除，返回後新一輪 Loader 可見期間 entranceCount=0，離場後為 1。總共建立 2 個 Context（兩次有效首頁生命週期），同時只有 1 個 Canvas；沒有沿用快取完成狀態提前入場。
- 正常 WebGL 測試沒有 pageerror／Hydration Error。作品內容、圖片、lib/content、/work 篩選、Studio Controls 及 gravity-world.ts 均未改動。

數據見 [validation/gravity-stage-4-metrics.json](validation/gravity-stage-4-metrics.json)。本次環境截圖報告：`/tmp/gravity4/report.html`。

## 範圍與限制

瀏覽器使用軟體 WebGL，測試 DPR 0.5，不能視為真機 GPU 效能或高 DPR 品質驗證；尚未使用實體 iOS/Android 或 Safari 驗收。聯絡地址、正式 About、作品詳頁與 Stage 5 均未實作。未部署、未合併 main、未修改網站 A。

## 修改檔案

- `app/globals.css`、`app/layout.tsx`、`app/page.tsx`
- `components/site-header.tsx`
- `components/gravity/gravity-scene.tsx`、`gravity-story.tsx`
- 新增 `gravity-experience.ts`、`gravity-loader.tsx`、`gravity-footer.tsx`、`gravity-arrow.tsx`、`home-section-link.tsx`、`reveal.tsx`
- `package.json`（僅擴充 Gravity 測試指令，沒有新增依賴）、`tests/gravity-experience.test.mjs`
- 本文件與 `docs/validation/gravity-stage-4-metrics.json`
