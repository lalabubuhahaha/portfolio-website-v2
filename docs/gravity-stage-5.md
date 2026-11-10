# Gravity Edition — Stage 5 整合與品質驗收

日期：2026-11-10（Asia/Taipei）。基準：Stage 4 `c83312cc7c0b54d4b49f970b74d742c9edd37f79`。Repository：`lalabubuhahaha/portfolio-website-v2`；分支：`feat/independent-foundation`。開工時本地與遠端一致，工作目錄乾淨。

整合與驗收工作已完成，仍保留明確的未達項：愛心凹口辨識度、硬體 GPU／真機效能，以及正式案例、個人介紹與聯絡內容。這份紀錄供人工視覺驗收使用。

## Stage 1–5 完成度

| 階段 | 狀態 | 結果 |
| --- | --- | --- |
| Stage 1 | 已完成 | 真正 Three.js WebGL、玻璃／霧面球體、Hero 聚合、滑鼠排斥、靜態 fallback |
| Stage 2 / 2.1 | 部分完成 | 四模式連續物理與固定 Canvas 修復保留；愛心方程式與吸引已完成，視覺凹口清晰度仍不穩定 |
| Stage 3 | 已完成 | 四色原地更新、碰撞／動量、Studio Controls、鍵盤與焦點管理 |
| Stage 4 | 已完成 | Loader → 單次進場、Header、Reveal、原生錨點平滑捲動、Footer |
| Stage 5 | 已完成整合與驗收 | 作品／About 順序、Work 視覺、清楚的案例頁狀態、低效能降級、六尺寸與量測；正式內容仍待提供 |

## GetLayers 逐項對照

| 原始規格 | 符合程度 | 證據與具體差異 |
| --- | --- | --- |
| WebGL 玻璃／霧面材質 | 已完成 | SphereGeometry(1,48,48)、MeshPhysicalMaterial，玻璃／霧面參數、燈光、ACESFilmic／exposure 1.15 保留；實際 WebGL 截圖驗證 |
| Hero 球體聚合 | 已完成 | 同一批 Mesh、scatterFar 單次進場；Loader 可見時尚未開始，離場後 entranceCount=1 |
| Drop Physics | 已完成 | 原始重力、質量、四次 pairwise collision、阻尼與 floor restitution；數值測試及 Full 往返檢查 |
| Heart Formation | 部分完成 | 原始 implicit equation、rejection sampling、shapeScale、目標與吸引完整保留；大球可能填平中央凹口，54 球手機輪廓尤其不穩定，未列為視覺通過 |
| Release Animation | 已完成 | 每球 stagger、向鏡頭加速、個別 opacity；完整模擬終點可全數離場，非 Canvas 整體 fade |
| Pointer Repulsion | 已完成 | Perspective 投影、0.05 / 4.4、mouse-down ×1.7 / ×1.4；單元與實際瀏覽器互動 |
| Mouse Momentum | 已完成 | speedBoost=1+speed×3.2、上限 3；控制條件測試與快速甩動觀察 |
| Scroll Palette Morph | 已完成 | Hero → Lime → Pink 依原始 smoothstep、THREE.Color.lerp；同 Mesh／Material 原地更新 |
| Studio Controls | 部分完成（視覺參數） | 四色、Reset、scrim、Escape、Tab trap 均完成；Slide 使用 CSS easing 近似 spring，未使用原文 stiffness/damping 的真實彈簧積分 |
| PageLoader | 部分完成（視覺參數） | 92%／100%、140+520ms、ready → started 完成；stagger spring 以 CSS 曲線近似。進度表示場景準備，不量測全部下載 |
| Section Reveals | 已完成 | IO 45%、一次、42px / blur 8px / 1.5s 原始 easing；無 JS 預設可見、reduced motion 直接顯示 |
| Smooth Scroll | 部分完成（刻意替代） | 保留原生 wheel／touch／鍵盤／scrollbar／history，錨點用 CSS smooth；未實作原文 wheel 攔截與 lerp 0.09 |
| Glass Header | 已完成（LALA 適配） | 真實 Home / Work / About，Contact 明確待提供；手機兩列，保留玻璃控制。輔助文字、深色 Footer 上的 Header 對比已加強 |
| Footer Marquee | 已完成（LALA 適配） | 深黑、圓角、藍 glow、26s、個人品牌導覽；新增可操作的暫停／繼續，reduced motion 停止 |

技術依使用者要求採 Next.js／React／strict TypeScript／Tailwind 4 與官方 three npm。字體自行託管 Raleway、JetBrains Mono、Space Grotesk；沒有 CDN importmap、外部追蹤或虛構工作室資料。保留 Stage 2.1 的固定 renderer/camera 座標、真正 Resize 才 setSize 與 Resize 後即時補繪。

## 作品集整合與頁面狀態

- 首頁依序為四段 Gravity Story → 05 Selected Work → 06 About / Expertise → Contact / Footer。
- Selected Work 只呼叫 `getItems({ featured: true })`，目前 3 張公開 featured 預覽；資料層與圖片完全未改。
- ProjectCard 顯示封面、名稱、類型、年份、摘要、分類與 View Project 狀態；8:5 封面容器與 object-fit:contain 保持比例，圖片有尺寸與 sizes，卡片 hover 非必要操作條件。
- `/work`：All=6、Independent=3、Client=3；無效參數與重複參數回到 All。Published/Draft 邏輯完全未動，Draft Concept Eta 不出現在公開卡片。
- `/work/[slug]` **尚未實作**。卡片現在不提供導向 404 的可點連結，明確顯示「Case study coming soon — detail page not available」。預留 `detailAvailable` 與 `/work/${slug}` 結構，未加入假的作品成果。直接請求既有公開／draft slug 均為 404。
- `/about` 是有真實路由的介紹草稿；首頁與該頁共用 AboutOverview。五項能力領域只描述探索方向，沒有客戶、獎項、資歷或成果數據。
- 所有現有作品仍為原本的佔位資料／封面；正式案例、個人介紹、信箱與社群網址仍待 Lala 提供。

## 場景範圍、降級與資源

- `getStoryProgress` 保留 0–3.45 的原始輸入，後續 progress 固定 3.45；到達作品閱讀區時停止主動畫迴圈，包含保留 128px 導覽空間的 Work 錨點。離開敘事區不會持續飛散；返回時同一 Canvas／Mesh 繼續，沒有重新 scatter。
- 高效能仍使用原始 96／54 顆、48×48 geometry、原玻璃與霧面參數，DPR 上限 2。
- 新增 Auto / Full / Static。Auto 以至少 6 秒及 6 幀取樣，持續低於 12 FPS 時停止動畫，改用既有輕量 SVG 視覺；不再持續 WebGL 繪製。這個 fallback 是六球示意，沒有四階段真實物理、玻璃折射或逐球連續混色。
- Full 可恢復完整物理；Static 為真正 WebGL 靜態構圖，階段改變時離線 settle 後單次繪製。OS reduced-motion 始終優先，不會被 Full 覆寫。
- 模式切換不建立新 Renderer／Mesh；Auto 保留資源供恢復。切換 Hero Palette 不重置位置與速度。隱藏分頁／作品區停算，卸載釋放 geometry、materials、renderer、shadow map 與 context。
- `/work` 與 `/about` 沒有 WebGL Scene；實測 `/work` 未請求 Three.js vendor chunk。
- `gravity-world.ts` 只擴充 opt-in inspect 診斷；`simulate` 與 `assignHeartTargets` 對 Stage 4 逐字相同。

## RWD 與視覺驗收

| Viewport | Hero 文字遮擋估算 | Home / Work / About 溢出 | 球體基準 | 愛心輪廓 |
| --- | --- | --- | --- | --- |
| 375×812 | 0 相交 | 無 | 54 | 部分完成 |
| 390×844 | 0 相交 | 無 | 54 | 部分完成 |
| 768×1024 | 0 相交 | 無 | 96 | 待人工確認凹口清晰度 |
| 1024×768 | 0 相交 | 無 | 96 | 待人工確認凹口清晰度 |
| 1440×900 | 0 相交 | 無 | 96 | 待人工確認凹口清晰度 |
| 1920×1080 | 0 相交 | 無 | 96 | 待人工確認凹口清晰度 |

六尺寸均用 Chromium、DPR 1 的真正 **Static WebGL** 構圖截圖，檢查 Hero、Heart、Selected Work、About、Footer，以及獨立 Work／About 頁。Hero 相交數是投影圓與文字框的保守估算，不含遮蔽判斷；仍以截圖人工檢視補充。手機 Hero 兩側球體有刻意的畫面邊緣裁切，沒有遮字。

另外在 1440×900 與 390×844、DPR 0.5 的 **Full** 模式實際測試 13 個進度點、反向 8 點、滑鼠／快速甩動／按下、四色、Drawer、history、reduced motion、resize、作品區停止與回捲恢復。Canvas、camera aspect、Mesh 身分固定，scroll resizeCount=0、entranceCount=1。照片與動畫清晰度不以靜態截圖取代完整動態測試。

## 效能量測

使用 localhost production build、無網路／CPU throttle、ANGLE **SwiftShader 軟體 GPU**。這些是單次實驗室紀錄，不能代表實體手機或硬體 GPU，更不能宣稱 60 FPS。

| 指標 | 390×844 | 1440×900 | `/work` 390×844 |
| --- | ---: | ---: | ---: |
| LCP | 1828ms | 900ms | 700ms |
| CLS（session window） | 0.00398 | 0.00341 | 0.01643 |
| Auto 的 Lab INP 觀察值 | 312ms（2 組互動） | 40ms（1 組互動） | 160ms |
| 含強制 Full 互動的 Lab INP | 536ms | 1936ms | 不適用 |
| Full 實際 renderer FPS（DPR 1，約 5s） | 5.19 | 1.40 | 無 WebGL |
| 實際 GL draw calls / render | 96.0 | 192 | 0 |
| renderer 最後一幀 triangles | 198,528 | 433,152 | 0 |
| 幾何／貼圖／program 數量 | 1 / 2 / 3 | 1 / 2 / 3 | 0 |

- Full 的低 FPS 與部分高互動延遲列為未通過硬體效能驗收；390 尺寸 Auto 的短會話 INP 312ms 亦未達 200ms 參考門檻。Auto 能自動降級，低效能 fallback 與作品區 1.5 秒等待內 render count 增量為 0。
- Scroll controller 的實測延遲：Auto 靜態約 5.9／610.2ms；Full 約 414.2／1343.9ms。軟體 GPU／compositor 排隊仍影響部分量測，沒有宣稱所有情況都流暢。
- Five-second Full 視窗 main-thread TaskDuration 約 0.073／0.046s，ScriptDuration 約 0.039／0.015s；整段測試各有 3 個 long task，合計約 704／866ms。精確原值見 JSON，保留原始 pairwise solver，沒有降低碰撞品質。
- 三個 Latin variable font 共 110,956 bytes，自行託管、font-display:swap；fonts ready 約 208.8／224.2ms。未載入 Google Fonts。
- Three.js vendor chunk：481,576 bytes minified，gzip 118,259 bytes；首頁才載入。這是實際建置檔大小，不是整站 JS 總量。
- WebGL／Chromium 沒有提供可信的 driver VRAM byte 數，因此 GPU memory **bytes 未驗證**；上表僅是實測資源數量。JS heap 約 10.7／10.1 MB，是 JS heap，不是 GPU VRAM。
- `/work` 原本的 Suspense 一行 Loading 讓 Footer 先出現在 viewport，再被串流結果推走，冷載 CLS 可達 0.4007。加入預留空間骨架後重測為 0.0164，沒有修改篩選／資料邏輯。
- Lab INP 使用 trusted interaction 的 Event Timing、interactionId 分組；樣本少、單一測試會話，不是 CrUX 或真實使用者統計。正式效能仍需硬體 GPU、真機、DPR 2、實際網路與較長互動會話驗證。

## Accessibility 與功能結果

- axe-core 的 WCAG 2 A/AA、2.1 AA、2.2 AA 自動檢查：首頁、Work、About、Drawer 均 **0 個自動檢出 violations**。
- 自動工具仍有 incomplete：關閉的 native dialog 之 aria-controls 參照、LALA wordmark 在漸層上的對比。人工確認 ID 對應同一 dialog、Escape／scrim／Tab trap 與關閉回焦皆正常；字標、輔助文字與深色 Footer 背景上的 Header 已檢查並加強對比。沒有宣稱完整 WCAG 認證。
- muted 文字由 #737373 調整為 #48556c，對最深淺藍 gradient edge 的對比約 4.96:1；Loader 狀態文字加深。Focus 可見、Close／Motion 按鈕 44px，手機導覽高度 36px 並保留間距。
- Skip link 能找到 React Activity 快取之外目前可見的 main；可用鍵盤聚焦。重要內容有 main、h1/h2/h3、圖片 alt；CDP Accessibility Tree 可讀到主內容與標題，裝飾 Canvas aria-hidden。
- 無 JavaScript 時首頁文字／作品可見；無 WebGL／reduced motion 可用；Loader 初始化失敗與 12 秒 timeout 路徑保留，沒有永久 inert／scroll lock。
- Footer 動畫可透過具名按鈕暫停與繼續，reduced motion 停止。沒有空 href、假信箱或假社群連結。
- 公開／draft 詳頁 404 是目前明確的功能狀態；卡片沒有導向這些 404 的連結。
- 正常 WebGL 的 console error 與 pageerror 均為 0；缺少的 favicon 404 已以 `app/icon.svg` 修正。Work 錨點停算、回捲、模式切換身分保留、可見性事件模擬停算／恢復及快取頁面返回皆通過。
- 尚未使用 VoiceOver／NVDA 等真實螢幕閱讀器，也未做 Safari／實體 iOS／Android 驗收。

## 技術驗證與檔案

`npm run typecheck`、`npm run lint`、`npm run test:gravity`（15/15）、`npm run build` 通過。新增 progress clamp／作品錨點停算及持續低 FPS 才降級的測試，保留全部原有物理／Loader／配色測試。沒有新增專案 dependencies；axe 與 Playwright 只作為本次環境的外部測試工具。

修改／新增檔案：

- `app/page.tsx`、`app/work/page.tsx`、`app/about/page.tsx`、`app/layout.tsx`、`app/globals.css`、`app/icon.svg`
- `components/portfolio/selected-work.tsx`、`components/portfolio/about-overview.tsx`
- `components/project-card.tsx`、`components/work-results.tsx`、`components/site-header.tsx`、`components/skip-to-content.tsx`
- `components/gravity/gravity-scene.tsx`、`gravity-world.ts`（只加診斷）、`gravity-story-progress.ts`、`gravity-motion-store.ts`
- `components/gravity/studio-controls.tsx`、`gravity-loader.tsx`（Skip link selector）、`gravity-footer.tsx`、`footer-marquee.tsx`
- `package.json`（僅測試指令）、`tests/gravity-progress.test.mjs`
- `docs/roadmap.md`、本文件、`docs/validation/gravity-stage-5-metrics.json`

原始作品資料、圖片與 `lib/content` 未改。網站 A 未修改，未 force push、未合併 main、未部署 Vercel，未開始 Supabase／Admin。

完整數據：[gravity-stage-5-metrics.json](validation/gravity-stage-5-metrics.json)。本次截圖報告：`/tmp/gravity5/report.html`。
