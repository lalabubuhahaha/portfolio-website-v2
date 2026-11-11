# Gravity Edition — Stage 5.2 Hero-to-Selected-Work Transition Refinement

日期：2026-11-11（Asia/Taipei）。基準：`edc5d7805f7dc9e3b9e56d1d9eb277a868b20467`。Repository：`lalabubuhahaha/portfolio-website-v2`；分支：`feat/independent-foundation`。

本階段只調整 Hero → Selected Work 的前景出入場，以及 Section 02 卡片排列；不擴充其他 Stage。

## Hero 文字退場

新增 `useHeroWorkTransition`，透過 GravityStory 的 DOM ref 管理既有文字容器。以 Hero 實際 bounding rect 計算局部捲動比例 `-hero.top / hero.height`，不是固定 scrollY 像素，也不讀寫 Gravity World 的 progress。

局部進度 0–0.08 維持原畫面；0.08–0.42 使用 smoothstep，將整組 Hero 標題／右側說明淡出並額外上移，位移上限為文字容器高度的 22%。自然文件捲動仍保留。完全退場後使用 visibility 與 inert 防止隱形連結取得焦點。向上捲動可逆恢復；在 progress=0，opacity=1、transform=none，原始 Hero 字型、排版與入口動畫皆不變。

只有 scroll／resize／hashchange／pageshow／字體及容器尺寸變化時才以 rAF 合併更新，沒有新增持續動畫迴圈或輪播攔截。

## Section 02 出場條件

Hero 文字 opacity ≤ 0.08，且 Selected Work 介紹區進入實際可視範圍後，先揭露介紹與標題。卡片進入可視範圍後依序揭露，延遲為 120／240／360ms；淡入／上移回復使用 0.8s 與既有 easing。卡片及介紹皆保留一次性狀態，反向捲動不會重新設為 pending。

快速跳轉的判斷以單次更新的位移超過 viewport 高度 35% 為準；區塊抵達 Header 下的閱讀面、直接 fragment／復原位置與快速跳轉時，會略過延遲直接顯示內容。Header 下緣使用實際 bounding rect，沒有硬寫桌面／手機 Header 像素值。

Reduced motion 不使用文字位移或淡入過渡，在退場點切換 Hero，並立即顯示應讀內容。沒有 JavaScript 時不會加入 pending 狀態，所有文案與卡片預設可見。不使用 display:none 或會改變高度的退場方式。通用 Reveal 保持不變，此控制只作用於 Hero 與 Section 02。

## 卡片排列與保護範圍

取消第二張的靠右及第三張的縮窄、左位移。桌面三張卡共用左邊界，寬度 `min(100%, 560px)`，間距 16px；手機為可用欄寬、間距 10px。保留原本玻璃面板、圓角、封面、字級、資訊內容與 hover。

沒有改動 Section 高度或 overflow，仍由原本 min-height 與自然內容決定。指定的 1440×900、390×844 下，Section 02 保持 900px／844px，不需改動四段物理的對應。

Hero 元件、Loader、GravityScene、GravityWorld、story progress、Renderer／Camera／Canvas、Sphere Mesh、Palette Morph、Studio Controls、資料層、作品封面及依賴均未修改。

## 驗收與截圖

量測結果見 [Stage 5.2 驗證摘要](validation/gravity-stage-5-2-metrics.json)。工作產物 `/tmp/gravity52/` 包含完整 trace、瀏覽器驗證程式與 16 張截圖。

兩尺寸皆以實際 Chromium wheel 連續捲動，取局部進度 0、0.16、0.30、0.42、0.56、0.72、0.86、1.00 共八個位置。先以既有 Static 模式暖機定格起始 Hero，之後切換 Full，所有連續捲動主截圖皆為 DPR 1 的真正 Full WebGL，不以切換 Static 產生各段截圖。測試機為 SwiftShader 軟體 GPU，不代表硬體 GPU／真機效能。

起始 Hero 比對字型、字級、容器位置與尺寸，並在同一穩定畫面比較啟用／停用前景控制的 computed style 與 bounding rect，確認 progress=0 無視覺影響。原始基準截取時的子元素仍受入口 keyframe 位移影響，因此不以兩個不同動畫時刻的子元素 Y 值做像素相同比較。

修改程式：`app/globals.css`、`components/gravity/gravity-story.tsx`、新增 `components/gravity/use-hero-work-transition.ts`、`components/portfolio/selected-work.tsx`。另新增本文件、驗證摘要及更新 README。

完成後停止，等待人工視覺驗收；不合併 main、不 force push、不修改網站 A。

## 最終結果與未達項

- typecheck、lint、build 通過；Gravity 16/16，failed=0、skipped=0。
- Full 連續 wheel 流程共取樣桌面 87／手機 88 個前景影格。沒有取樣到兩個大標題皆完整可見且 opacity > 0.8 的影格。首見 Section 02 時 Hero 已接近完全透明。
- Desktop 三卡 left=637.328125px、width=560px、gap=16px；Mobile 三卡 left=24px、width=342px、gap=10px。最下卡底緣約 600px／760px；兩尺寸皆無水平溢出，閱讀位置不被 Header 蓋住。
- 反向 Hero 恢復、卡片不重播、快速跳轉、Header fragment 與直接開啟 `#works`、鍵盤焦點、reduced-motion 初始偏好與即時前景切換、無 JavaScript 可見性皆通過。
- 捲動全程保持同一 Canvas、Mesh／Material identities、Camera aspect；Canvas 尺寸寫入=0、resizeCount 不增加、entranceCount=1、WebGL context loss=0。Full 主流程 console error／pageerror 為 0。
- 額外關閉 WebGL、保留同一套前景的輕量補驗，測得首卡約晚於標題 115ms，後續卡片按可視位置依序出現；跳至 65% 局部進度可立即顯示。此補驗不替代 16 張 Full 截圖或實際物理回歸。
- **微時序視覺限制：** Full 在 SwiftShader 上幀率低，部分 120ms 延遲落在同一可觀察影格；硬體 GPU 上的細微逐卡節奏仍待人工視覺驗收，不能宣稱已通過真機動態驗收。
- **狀態標籤差異：** 執行中切換 reduced-motion 時，3D 容器可能仍標記 Full，但實測 renderCount 連續四次、每次間隔 1.5s 均為 23，前景 transition 為 0s、Hero 立即切換；預先啟用 reduced-motion 的新頁面正常為 static-reduced。這項標籤同步未修改，保留本次禁止變更的 Scene 程式。
- 已檢視兩尺寸八位置總覽及重點原尺寸截圖；未發現本次標題長時間並存、卡片錯位或手機裁切問題。人工最終視覺驗收仍待進行。
