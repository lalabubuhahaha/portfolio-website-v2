# Gravity Edition — Stage 3

基準為本地／GitHub 已同步的 `6d1b7bc680f9153e2fd8e2e50b704716b04f504f`。已閱讀使用者提供的完整 Gravity — Digital Studio 規格中 Pointer tracking、mouse projection、Sphere creation、Palette、physics loop、pairwise collisions 與 Studio Controls 章節。

## 實作

- Header 新增原始滑桿圖示按鈕；LALA、Work、About 保留。
- `studio-controls.tsx` 使用原生 modal dialog、React 開關狀態、420px 桌面面板／手機全寬、白色半透明 blur、scrim、四張配色卡、Reset Defaults 與 Close。CSS 離散進出場使用 spring-like easing，Reduced Motion 移除動畫；沒有新增動畫依賴。
- Escape、scrim（桌面）、Close、Tab / Shift+Tab 焦點圈限、關閉後返回觸發鈕均實測。原生 dialog 提供背景 inert。背景 scroll lock 以可中止的 wheel / touch / keyboard 事件處理，保留 Drawer 內捲動，不改 body position／overflow 或捲軸寬度，避免影響 Stage 2.1 的固定 viewport。
- 四色以輕量的外部 palette store 連接 React UI 與既有 Three.js 控制器。React `useSyncExternalStore` 只更新配色 UI；Scene 透過訂閱直接更新 uniform，不將配色放入初始化 effect 的 dependencies 或 canvas key。
- `setHeroColor()` 原地更新 Hero 五個色彩角色；color、emissive、玻璃 attenuation tint 和半球光 groundColor 同步。既有 scroll lerp 仍為 Hero → Lime → Pink；不重設位置、速度、旋轉、opacity、heart targets 或任何物理進度。
- Studio Controls 開啟或指標位於設定 UI 時不對球體施加滑鼠推力。正常場景仍使用原始 perspective projection，加上 Stage 2.1 顯示座標到物理座標的逆轉換。
- WebGL 不可用時仍有靜態 SVG，背景與 SVG 色階也可由 Drawer 更新。

| Hero Palette | ballColor | 對應原始色階 |
|---|---|---|
| Royal Blue & Pearl | `#2F69FF` | Royal Blue 原式 |
| Rose Blush & Crème | `#FFC5C2` | 原 getDynamicColors 的 medium / glass 為 `#FFA6B3` |
| Volt Lime & Slate | `#E1FC03` | 原 Volt Lime 色階 |
| Arctic Sky & Crystal | `#96E5FF` | 原 Arctic 色階 |

Default 為 Royal Blue。Royal 背景保留原式；Rose / Lime 使用規格既有 Pink / Lime gradient 色階，Arctic 使用原 palette 的 pastel / light 作背景色階。固定的 scroll Lime / Pink layer 不因 Hero 選色而改變。

## 物理與材質

Stage 2.1 的 `simulate()` 區塊逐字未改：mouseRepelForce 0.05、radius 4.4、mouse-down radius×1.4 / force×1.7、speedBoost `1+mouseSpeed*3.2`、speed cap 3、4 collision passes、mass / relative velocity / overlap impulse、Shape 碰撞減弱、Release 放開與旋轉公式均保留。沒有第二套模擬或未量測的簡化。

| 材質 | 驗證參數 |
|---|---|
| Glass | roughness .08、clearcoat 1、clearcoatRoughness .03、transmission .95、IOR 1.485、thickness 2.2、emissiveIntensity .12 |
| Matte | roughness .44、clearcoat .24、clearcoatRoughness .35、emissiveIntensity .08 |

原光源、FOV 38 / camera (0,0,11)、ACESFilmic exposure 1.15、陰影、SphereGeometry(1,48,48) 與材質角色不變。已檢視實際 WebGL 四色截圖：玻璃球有透光、後方球體折射／遮擋的差異，霧面球有較寬高光；不是只依參數宣稱完成。精確滑鼠增益、速度上限、質量碰撞、動量與旋轉由隔離條件的數值測試驗證；瀏覽器另實際執行 hover、mouse-down、flick、離開後恢復。

## Stage 2.1 保護

- 固定 canvas 尺寸／camera aspect；不重新引入 `--hero-frame` 尺寸控制。
- Palette callback 不呼叫 setSize、start、scatterFar 或建構任何 renderer / Mesh / material / geometry。
- 保留 resize guard 與必要 resize 後在 ResizeObserver 內立即補繪。
- 既有 5 項回歸測試全數保留並通過；新增 3 項配色／滑鼠增益／碰撞驗證，合計 8 passed、0 failed。
- Hero、Section 02–04 的文案與版面、Footer、lib/content、/work、作品資料與依賴均未變更；沒有 PageLoader、About／詳頁、Supabase、Admin 或 Stage 4。

## 實測結果

環境為 production build + Chromium / SwiftShader WebGL。1440×900（DPR .5）及 390×844（DPR 1）均完成：

- 四種實際材質配色；同步點選前後位置、速度、opacity、Mesh / Material / Geometry IDs 完全相同。
- Hero、Drop、Heart、Release 各階段中切換四色後繼續正常模擬。
- 指定 13 個 progress 停點、回捲至 Hero、慢捲、配色後的 Lime / Pink morph、無橫向溢出、Reduced Motion 靜態配色、resize。
- Tab / Shift+Tab、Space 選色、Escape、Close、scrim、焦點返回、wheel / keyboard scroll lock；另以 Chromium 觸控 tap / drag 驗證手機操作及背景 touch scroll lock。
- WebGL-disabled 頁面可以操作 Drawer、選色並顯示靜態 fallback。
- 未觀察到 uncaught JS / Hydration 錯誤。既有作品詳頁預取 404 保留；production HTTP `/work` 的 All / Independent / Client 為 6 / 3 / 3，沒有 draft。

| 測項 | Desktop 1440×900 | Mobile 390×844 |
|---|---|---|
| 連續原地切色 | 80 次 | 80 次 |
| WebGL context / entrance count | 1 / 1 | 1 / 1 |
| GPU geometry 前→後 | 1→1（共享 geometry） | 1→1 |
| GPU textures 前→後 | 2→2 | 2→2 |
| GPU programs 前→後 | 3→3 | 3→3 |
| positions / velocities / Mesh / material / geometry | 全部維持 | 全部維持 |
| Palette / scroll 引起 resize | 0 | 0 |
| 慢捲清屏取樣 | 0 / 59 | 0 / 59 |
| GC 後 JS heap bytes 前→後 | 8,468,452→8,562,260 | 7,720,448→7,862,636 |

Heap 是兩次 CDP GC 後的 V8 樣本，不是 GPU VRAM bytes。GPU 資源計數與身分在 80 次切換後保持穩定；不將單一 heap 差值解讀為長時間效能保證。

| 瀏覽器速度指標 Σ\|v\| | idle | hover | mouse-down | flick | 離開後 |
|---|---|---|---|---|---|
| Desktop | 0.261 | 4.620 | 4.945 | 11.276 | 1.361 |
| Mobile viewport | 0.165 | 1.749 | 2.109 | 3.986 | 0.438 |

以上為不同動態時刻的速度範數總和，不是動能；用以確認輸入有效及離開後減速。精確推力倍率與 speed cap 的比較使用單元測試的相同初始條件。

另測試：模擬 hidden 的 visibilitychange handler 會停止並恢復 render，且不重播入口。實際換頁後舊 context 的 isContextLost 為 true；返回首頁雖建立新 context，但僅一個有效 context，正常 soft navigation 保留選色。訂閱、pointer / resize / visibility / rAF、geometry / material / shadow map / renderer 的清理均保留。

## 指令與證據

`npm run typecheck`、`npm run lint`、`npm run test:gravity`（8 passed）、`npm run build` 皆通過。

- 原始數值：`docs/validation/gravity-stage-3-metrics.json`。
- 任務截圖：`/tmp/gravity3/1440-drawer.png`、`390-drawer.png`，以及各尺寸 `*-roseGold.png`、`*-pinkBlush.png`、`*-voltLime.png`、`*-arcticBlue.png`、scroll 與 pointer 截圖。
- 自動化 browser runner 在任務暫存工具目錄，沒有加入 Playwright 或其他應用依賴。

尚未驗證：實體手機 GPU、Safari、真實分頁電源策略、VRAM bytes、長時間熱降頻／電池表現、實體螢幕閱讀器。模擬 hidden handler 與 Chromium 觸控測試不等於上述實機驗證，不宣稱實機 60fps。
