# Gravity Edition — Stage 5.3 Hero Sphere Composition & Header Refinement

日期：2026-11-11（Asia/Taipei）。開工先 fetch 並 fast-forward 確認遠端 `feat/independent-foundation`，基準為 `5668dcca3f6db5a7b21421766cbc759492f071ef`。沒有建立 worktree、變更 main 或網站 A。

只調整桌面 Hero 球體構圖與 Header 外層背景。使用者暫時無法提供參考截圖，依其指定的 68–75% 寬度、文字安全區與原有風格進行。

## 構圖選擇

檢查了 FOV=38、Camera Z=11、frustum、球體半徑／群集位置、既有 presentation group 與 breakpoint。採用既有 presentation 層，保留相機與核心物理：

- 在 1024–1440px 之間以 smoothstep 漸進加入桌面份量，桌面整體群集均勻視覺 scale 最多增加 12%；不修改任何球體的半徑、質量或材質。
- 以視窗 aspect、原本文字安全帶所需的基礎 scale 校準橫向中心間距。球體保持圓形，不對幾何做非等比縮放。這不是設定 Canvas CSS width，也不是 CSS transform 放大 Canvas。
- 保留原本 HeroF 的 0.3–0.8 混合範圍，將新的構圖平滑收回。progress≥0.8 時 group scale=1、horizontalSpread=1，Drop／Heart／Release 回到原本座標。
- 使用既有 `worldToLocal` 與 horizontalSpread 的反向投影，讓滑鼠座標仍對應物理空間。新增離中心測試，以球體前方與左右等距位置驗證力方向、大小與對稱性。
- 既有手機／桌面 presentation 分支改為 640–1024px 的連續混合，避免在 768px 突變；390px 仍使用原手機公式。新桌面增益也沒有硬切 breakpoint。

`simulate()`、scatterFar、相機／Renderer 初始化、resize／即時補繪、Heart targets、Palette Morph 與材質建構均未改。沒有新 Canvas、重播進場或 scroll 中的 setSize。Hero 文字、Stage 5.2 退場與 Selected Work Reveal 皆未改。

## 前後投影量測

Chromium、DPR 1、實際 Three.js WebGL，使用既有 Static 模式取得可比較的穩定 Hero 定格。從 opt-in inspect 提供的可見球體投影中心／半徑估算各圓的聯集邊界，再換算相對 viewport 寬度；不是以 Canvas 寬度代替球體寬度。

| Viewport | 修改前群集寬 | 修改後群集寬 | 修改前高度 | 修改後高度 | 文字重疊估算 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 53.43% | 71.81% | 431.2px | 439.2px | 0 |
| 1708×900 | 43.39% | 73.92% | 397.3px | 445.3px | 0 |
| 1920×1080 | 49.23% | 69.97% | 513.9px | 548.5px | 0 |
| 2560×1440 | 51.89% | 73.50% | 690.7px | 779.0px | 0 |
| 390×844 | 100% 可視範圍 | 100% 可視範圍 | 244.6px | 251.4px | 0 |

四個桌面尺寸都沒有投影邊緣裁切。手機保留既有刻意延伸至畫面兩側的構圖：完整投影邊界由 127.50% 至 122.26%，視窗內可視區均為 100%；邊緣相交球由 8 顆至 7 顆。沒有新增手機擴大或裁切規則。

球體是隨機生成、自然漂浮的系統；這些是單次穩定狀態的估算，不是逐球、逐像素同相位的比較。固定起始種子也不能保證瀏覽器與 React 在兩個版本消耗完全相同的亂數序列。額外 10 種 seed 的 CPU 取樣，四尺寸平均約 70.0／71.6／70.3／70.5%，個別分佈仍會浮動，沒有為了鎖定寬度而自動追焦或壓制動態。原始投影與 seed 取樣保存在工作產物。

五個尺寸的 Hero 文字 bounding rect、Header bounding rect 及玻璃導覽膠囊樣式，前後比較完全一致。圓與文字矩形的重疊檢查是保守幾何估算，仍需搭配截圖人工判讀。

## Header

整條白色背景來自 `app/globals.css` 的 `.site-header` 線性漸層，已改為 transparent。執行時確認 background image=none、backdrop-filter=none、border-bottom=0、box-shadow=none，偽元素也沒有背景層。

Home／Work／About 膠囊、Studio Controls、Contact、Logo、高度、padding、fixed 與 hover/focus 皆保留。新增 `HeaderContrast`，以 IntersectionObserver 判斷 Footer 是否到達 Header 範圍，切換 Header 內 Logo／膠囊文字／圖示的 ink 為白色。為防白色跑馬燈穿透個別控制造成文字疊色，Footer 上的控制改用深色半透明玻璃底，Logo 加局部字緣陰影；仍保留 blur、邊框、圓角與 hover/focus。沒有增加整條背景／陰影，也不修改 Footer。

1708×900 下 Footer 本身約 716px，高度不足填滿 900px 視窗，正常頁底 Header 仍覆蓋上方淺色區域。因此另在 1708×600 的真實 viewport 檢查 Header 覆蓋深色 Footer；手機則使用 390×844。沒有增加空白、修改 Footer 高度或偽造背景。

## 驗收產物與範圍

[驗證摘要](validation/gravity-stage-5-3-metrics.json)。`/tmp/gravity53/` 包含五尺寸前後 Hero 截圖、四種背景的 Header 截圖、Full 往返取樣、原始投影與瀏覽器驗證程式。主要比例截圖是 Static 真實 WebGL，Full 往返另驗證；不把 Static 定格當作動態流暢度證明。

變更：`gravity-world.ts` 的 updatePresentation、`app/globals.css` 的 Header 外層／深色 ink、`site-header.tsx`、新增 `header-contrast.tsx`、相關回歸測試、本文件、量測摘要與 README。

不修改 Selected Work、Heart、Release、About、Footer、`/work`、`/about` 或 `lib/content`。未新增依賴。完成後停止，等待人工視覺驗收。

## 最終回歸結果

- `npm run typecheck`、`npm run lint`、`npm run build` 通過；`npm run test:gravity` 17/17，failed=0、skipped=0。
- 五個指定 viewport 各以 Full 實測 13 個 Hero→Drop→Hero 進度點。Canvas、Sphere／Material／Geometry identities、Camera aspect 保持，捲動尺寸寫入=0、resizeCount 不增加、entranceCount=1、context loss=0，返回 Hero presentation 與初始值一致。
- 1708 與 390：四個 Palette 切換不改 Mesh、材質身分或物理位置；Controls focus trap／Escape 回焦、Pointer 操作、Auto／Full／Static、初始 reduced-motion 與即時停止繪製通過。Auto 在本軟體 GPU 會依既有規則進入 static-performance。
- 同兩個尺寸做真實 viewport resize，確認同一組資源、單次進場、尺寸更新後補繪且仍有可見球體。640／768／1024／1440 breakpoint 前後的構圖連續性另由數值測試驗證。
- Header 在 Blue／Lime／Pink 背景維持深色 ink，深色 Footer 上為白色 ink；四種背景都保留玻璃膠囊與透明外層。
- Full 主流程 console error／pageerror 為 0。已逐一檢視五尺寸修改後 Hero 及 Footer Header 截圖，未發現桌面文字遮擋或新增桌面裁切。
- **未驗證：** 硬體 GPU、實體裝置與長時間真機效能；最終人工視覺驗收仍待進行。不以軟體 GPU 的靜態截圖宣稱 60 FPS 或真機驗收通過。

最後逐張檢視 Footer 跑馬燈交疊情境後，加強了**個別**玻璃控制的深色半透明底與 Logo 字緣陰影，沒有恢復整條背景。最終版本重新執行四個指定 npm 指令（17/17），並重拍兩尺寸四種背景的 Header、實際測試 Footer 上的 Studio Controls hover／focus／Escape 回焦，皆通過。Hero 五尺寸的淺色膠囊樣式不受此 Footer 限定調整影響。
