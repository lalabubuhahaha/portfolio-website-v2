# Gravity Edition — Stage 5.3.1 Sphere Integrity Fix

日期：2026-11-11（Asia/Taipei）。開工 fetch 並確認遠端 `feat/independent-foundation` 最新基準為 `4f00c0979e1713daf145a87baa5a772e949b4fb0`。

## 真正原因

上一版只確認 mesh／group 使用 scalar，沒有驗證投影後的輪廓，這項驗收不足。此次檢查確認：

1. Mesh 是 SphereGeometry，mesh 與 presentation scale 使用 setScalar；沒有 instance matrix 或 Canvas scaleX／scaleY。五尺寸的 Canvas CSS 尺寸、buffer 與相機 aspect 沒有拉伸錯配。
2. **離軸透視投影**：真正的 3D 球體在 PerspectiveCamera 中，偏離光軸時的輪廓是橢圓。Stage 5.3 擴展群集中心後，較多球體處於明顯離軸位置。球體本身等比縮放不能消除此現象；新增測試以球面切線圓投影重現超過 1.1 的長短軸比。
3. **旋轉矩陣變形**：延伸回歸又發現累積 rolling quaternion 未必維持單位長度。既有旋轉軸取 XY 位移，但角度使用 3D 位移，特殊移動方向可累積非單位 quaternion。曾測得 length=0.9961075，對應世界 scale 約 0.550516／0.551465／0.557037；即使 local scale 相同，世界矩陣仍有微小非球形變形。

## 修正方式

使用**真正的 OrthographicCamera + SphereGeometry + MeshPhysicalMaterial**。保留 WebGL 深度測試、光照、玻璃折射與陰影，不使用 Sprite、平面圓片、輪廓遮罩或 CSS 拉伸。

正交投影的平行視線讓任何離軸球體的外輪廓保持圓形。以原本 38°、Camera Z=11 的 z=0 視野定義正交 frustum，物理空間的寬高、相機 Z 與四段 progress 邏輯保持原樣。真實 Resize 時更新 left／right／top／bottom 與 projection matrix；不在 scroll 中改 Canvas 大小。

為保留放大後的份量與 Release 的遠近放大感，顯示層為每顆球施加 **uniform** 深度補償 `11 / max(0.1, 11 - worldZ)`，並做對應的 3D 平移。補償後的中心投影與原本 perspective 中心一致，半徑仍是一個 scalar，Z 中心保持原來值。正交 near=-100／far=100 提供足夠深度範圍，避免 Release 中等比放大的真球表面被近裁切面切掉；不是切換回 perspective。

顯示層亦在 quaternion 長度平方偏差超過 1e-14 時 normalize，確保實際矩陣是純旋轉。這是視覺旋轉修正，不重設球體位置、速度或進場。

Pointer 改用正交平行射線與同一個 z=0 物理平面交點，再套用既有 presentation／horizontalSpread 反向映射；離中心對稱推力與 flick／按下回歸仍保留。

`simulate()` 與 scatterFar 原始內容逐字未改。碰撞、重力、質量、阻尼、Hero／Drop／Heart／Release 模式混合、opacity 公式、材質數值與球體個數不變。Renderer、Canvas、Loader、Stage 5.2 前景退場與 Header 都沒有修改。

## 球形驗證

新增逐球診斷，讀取實際完整 model-view-projection 矩陣與像素 viewport，利用 2×2 Gram matrix 的特徵值計算投影長短軸比；不是直接宣告「scale 相同所以一定圓」。

單元回歸另獨立投影球體輪廓上的 16 個方向點，檢查相對中心的像素距離一致，並檢查每層 local scale、實際 world scale、SphereGeometry 類型、所有階段／往返／Resize、近遠裁切面及物件 identities。Palette 測試先完成正常 render、建立已正規化的顯示狀態，再做色彩切換的完整狀態相等驗證，沒有移除原本的 position／velocity／rotation／identity 斷言。

| Viewport | 修正前理想球體透視最大軸比估算 | 修正後實際矩陣最大軸比 | 修正後群集投影寬度 |
| --- | ---: | ---: | ---: |
| 1440×900 | 1.0726 | 1.000000 | 72.72% |
| 1708×900 | 1.1002 | 1.000000 | 77.20% |
| 1920×1080 | 1.0862 | 1.000000 | 69.77% |
| 2560×1440 | 1.0867 | 1.000000 | 70.93% |
| 390×844 | 1.0317 | 1.000000 | 122.33% 完整投影邊界／100% 可視寬 |

五尺寸 Hero 共 438 顆球的 local／anchor scale 嚴格等比；實際投影軸比與 1 的差距在浮點誤差範圍。群集仍保留 Stage 5.3 的放大方向，桌面沒有縮回原先 43–53% 的集中群集。五尺寸的文字重疊估算均為 0；手機保留原有兩側裁切，不以裁切或遮罩掩飾變形。

照片是隨機粒子在穩定 Hero 姿態的真實 WebGL 定格，不是逐球同相位的像素比較。主要 before／after 為 Chromium DPR 1、既有 Static 模式的實際 WebGL，非 Auto SVG fallback；Full 往返與四段場景另測。原圖、原始矩陣量測與驗證程式位於 `/tmp/gravity531/`。

## 範圍與交付

修改：`components/gravity/gravity-world.ts`、相關回歸測試、README、本文件與[量測摘要](validation/gravity-stage-5-3-1-metrics.json)。不修改 UI 段落、作品內容、Header、CSS、網站 A 或依賴。

未發現殘留橢圓幾何或離軸橢圓外輪廓。可見的遮擋、玻璃內的折射影像、既有邊緣截斷，以及像素抗鋸齒／三角網格的正常離散誤差，不是非等比球體縮放。最後仍等待人工視覺驗收；不以數值檢查取代截圖檢視。

## 最終驗收結果

- `npm run typecheck`、`npm run lint`、`npm run build` 通過；`npm run test:gravity` 19/19，failed=0、skipped=0。
- Chromium 五個指定 viewport 各取樣 20 個 Full 跨段／往返位置，包括 Hero、Drop、Heart、Release 與返回。每個位置逐球檢查 mesh／anchor scalar、實際投影矩陣軸比、Mesh／Material／Geometry identities、相機比例與 entranceCount。
- 全部取樣的最大軸比與 1 的差距低於 1e-9，沒有檢出非等比球體輪廓。Canvas 尺寸寫入=0、resizeCount 不因 scroll 增加、context loss=0、entranceCount=1。
- 1708 與 390 另通過 Controls／Palette、Pointer、Auto／Full／Static、實際 Resize 後補繪及保留身分、即時／預設 Reduced Motion 檢查。主流程 console error／pageerror 為 0。
- 五尺寸 before／after 文字矩形與 Header 樣式相同，Canvas CSS／buffer 尺寸匹配、transform=none；主圖確為 static-selected 的 WebGL，不是 SVG fallback。
- 已逐一檢視五尺寸修改後 Hero，以及 Full 的 Drop／Heart／Release 取樣。Header 維持透明、Hero 文字未被遮擋，放大後的群集優勢保留。
- **未驗證：** 硬體 GPU、實體裝置與長時間真機效能。環境為 SwiftShader 軟體 GPU，不能據此宣稱真機 60 FPS；最終人工視覺驗收待進行。
