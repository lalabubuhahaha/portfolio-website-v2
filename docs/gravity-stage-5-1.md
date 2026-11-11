# Gravity Edition — Stage 5.1 Featured Work Placement Refinement

日期：2026-11-11（Asia/Taipei）。基準：Stage 5 `780d5a754f9efff023491c7d115123cb4fea7194`。Repository：`lalabubuhahaha/portfolio-website-v2`；分支：`feat/independent-foundation`。

## 展示與操作

首頁改為 Hero → **02 Selected Work / Drop** → 03 Form / Heart → 04 Release → **05 About / Expertise** → Footer。移除原本 Story 後方重複的作品展示。Release 文案引導繼續閱讀 About，亦提供返回精選作品的向上 CTA。

Section 02 沿用 Drop 與 Lime 背景。左側為 Raleway Editorial 標題「Ideas take shape here.」、簡短介紹與 View all work；桌面 12 欄、左 5／右 7，右側三張輕微錯落的橫式預覽卡片。參考 GetLayers Section 02 的半透明白面板、漸層邊框、頂部髮絲光線、24px backdrop blur、柔和藍色陰影與 hover lift。內容上移，預留底部落地球體空間。手機採單欄、三張精簡卡片直向呈現，不截斷文字或裁掉作品。

SelectedWork 保持 Server Component，僅呼叫 `getItems({ featured: true })`，由首頁以 ReactNode slot 傳入 GravityStory；資料讀取不移入 Client Component。三筆資料依原本排序顯示：

| 作品 | 類型 | 年份 |
| --- | --- | --- |
| Independent Product Alpha | Independent | 2026 |
| Professional Project Gamma | Client work | 2024 |
| Interface Exploration Epsilon | Independent | 2025 |

FeaturedProjectPreview 只呈現既有封面、名稱、類型、分類、年份與「Case study coming soon」，不塞入完整 ProjectCard 的摘要及全部欄位。整張卡片是可鍵盤操作的分類瀏覽連結，明示 Browse，目的地為 `/work?type=independent` 或 `/work?type=client`；不導向未實作的詳頁。View all work 指向 `/work`。

Header、Footer 與 Release 的作品入口統一指向 `#works`。跨頁入口使用 `/#works`；首頁使用原生 fragment 保留已掛載的場景。Hero 原本的 `#drop` 保留為同一區塊的相容錨點，Hero 文字與標記未改。新版區塊已有頂部留白，因此 `#works`／`#drop` 的 scroll margin 為 0，避免舊 128px 偏移將手機最後一張卡推到屏外。About 的 128px 導覽預留與 Story 後方停算規則保留。

卡片僅在有 hover 且無 reduced-motion 時浮起；鍵盤 focus 有清楚外框。卡片連結標示 `data-gravity-ui`，沿用既有 UI 排斥排除機制，空白區仍交由原本的全域 Three.js pointer tracking 處理。沒有新的滾輪攔截、內部捲動容器或 overflow 裁切。

## 保護範圍

Hero、Loader、GravityScene、GravityWorld、材質、Canvas／Camera 座標系、入口動畫、物理公式、原始圖片與 `lib/content` 完全未改。沒有新增依賴。`gravity-story-progress.ts` 僅更新註解，計算程式逐字保留。

Section 02 在指定的 1440×900 與 390×844 維持 100svh；Section 03 起點保持 2×viewport height。沒有延長敘事區或修改 progress 定義。Stage 5 原本透過 `.gravity-story` 的 nextElementSibling 判斷後續閱讀區；移動作品後該區仍為 foundation-content，現在直接呈現 About。Drop 中的 `#works` 不會誤觸停算；Release 結束後到 About 停算，回捲恢復同一場景。

## 驗收資料

自動驗證、實際瀏覽器量測與已知限制見 [Stage 5.1 量測](validation/gravity-stage-5-1-metrics.json)。截圖與可攜報告於本次工作產物 `/tmp/gravity51/report.html`；完整驗證程式隨截圖壓縮檔保存。

修改檔案：`app/page.tsx`、`app/globals.css`；`components/portfolio/selected-work.tsx`、`featured-project-preview.tsx`、`about-overview.tsx`；`components/site-header.tsx`；`components/gravity/gravity-story.tsx`、`gravity-footer.tsx`、`home-section-link.tsx`、`gravity-story-progress.ts`（僅註解）；`tests/gravity-progress.test.mjs`；README、本文件與量測 JSON。

本階段完成後停止，等待人工視覺驗收；不合併 main、不部署、不修改網站 A。

## 截圖解讀與仍待驗收項目

主截圖使用 DPR 1、既有 Static 模式的真正 WebGL 定格，逐點刷新並 settle；不是 SVG fallback。另附 Full 模式 DPR 0.5 的 Drop／Heart 動態取樣。Static 既有實作只在離散姿勢改變時重新繪製，因此同一姿勢範圍內不會逐點更新顏色；本次未改動這項渲染行為。截圖不能取代 Full 捲動回歸，亦不代表硬體 GPU 效能驗收。

Stage 5 既有的 Heart 凹口辨識度、實體手機／硬體 GPU 效能、正式案例與個人內容仍待確認。此階段僅移動與精修作品前景，不宣稱已解決上述項目。桌面／手機最終視覺仍待 Lala 人工驗收。

## 最終驗收結果

- `npm run typecheck`、`npm run lint`、`npm run build` 通過；`npm run test:gravity` 16/16，沒有 failed 或 skipped。
- Chromium production build，1440×900 與 390×844，分別量測 25 個正向／反向進度點；Canvas、Mesh／Material 身分、Camera aspect 固定，scroll resizeCount 增量 0、Canvas 尺寸寫入 0、entranceCount=1、WebGL context lost=0。
- Section 02 高度分別為 900px／844px。桌面三卡底緣約 296／448／596px；手機約 489／626／760px，皆在可讀畫面內；無水平溢出、重複作品區或重複 h1。
- Header／Release／Footer 三個入口均抵達 `#works` 的 top=0、progress=1，Drop 維持 active。分類卡片鍵盤操作、可見 focus、跨頁返回、About 停算／回捲恢復均通過。
- Full／Static／reduced-motion 通過；兩尺寸的 Auto 均在軟體 GPU 上進入既有 static-performance fallback。Full 物理滑鼠／按下／flick 回歸由既有測試驗證，瀏覽器亦確認場景在指標互動時持續繪製及速度變化。
- Studio Controls 四色切換保留 Mesh／Material／球體位置；focus trap、Escape 回焦、Reset Defaults 通過。
- `/work` 的 All／Independent／Client 分別 6／3／3，沒有公開 Draft Concept Eta。兩尺寸的 console error 與 pageerror 均為 0。
- 各尺寸 8 張 DPR 1 主截圖，以及 2 張 DPR 0.5 Full 動態取樣，共 20 張；僅作本次工作產物，不將二進位截圖加入 Git。
