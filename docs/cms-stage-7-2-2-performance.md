# CMS Stage 7.2.2 正式環境效能驗收

## 確認部署

1. 在 Vercel 專案打開 **Deployments**，選擇目前承接正式網域的 **Production** 部署，記錄網域、部署網址、Git Branch 和 Commit。再找出 **Preview** 中來自 `feat/independent-foundation` 且 SHA 與待驗收提交相同的部署。
2. 若正式部署 SHA 不同，請以該提交的 Preview 部署網址驗收，並保留環境標記。需要正式驗收時，依專案既有發佈流程部署該提交後再測。
3. 分別核對 Vercel Production / Preview 的 `NEXT_PUBLIC_SUPABASE_URL` 專案識別碼與目標 Supabase 專案。從部署 Functions 資訊和 Runtime Logs 記錄實際 Runtime 與 Function Region，再從 Supabase 專案的基礎設施設定確認資料庫 Region。若前後端跨區，先比對同一流程的延遲和請求次數，再評估調整區域。

## 瀏覽器測量

1. 使用管理員帳號登入。開啟 Chromium DevTools 的 **Network**，勾選 **Preserve log** 和 **Disable cache**，確認網路限速關閉。記下環境、SHA、測試時間與時區。
2. 以新分頁直接進入 `/admin/works`，再重新整理一次。各記錄文件請求的 **Timing**（DNS、TLS、Waiting/TTFB、Duration）及 Works 列表出現的時間。由 Works 點進同一筆測試草稿，再返回 Works，分別記錄 Next.js RSC 請求與畫面可操作時間。另對 `/admin` 和 `/admin/works/new` 做同樣的首次及重複載入。
3. 編輯專用測試草稿。從按下 **Save Draft** 記到 POST 回應、顯示 **Draft saved.**、以及儲存按鈕可再次操作的時間，再記錄返回 Works 的時間。可用 **Performance** 的錄製與 Screenshots 對照點擊、回應、畫面更新和主執行緒工作。在 Console 量測 Navigation Timing 時，客戶端導覽應以對應的 RSC 資源列為準。
4. 每組做至少三次，取中位數並保留首次樣本，記下是否有 Next.js 預先載入。瀏覽器首次請求只是首次瀏覽樣本。冷啟動需由伺服器端資料佐證。
5. 回報時間、路徑、區域、狀態碼與部署 SHA 即可。請勿分享原始 Cookie、Authorization header、私有媒體網址或包含這些值的 HAR。

## Vercel Logs 與 Supabase 交叉比對

以測試時間、部署、路徑、方法及請求 ID 比對 **Runtime Logs**，記錄 Function Region、invocation duration、狀態及有提供時的 cold-start 訊號。對照同一時間窗的 Supabase Auth、PostgREST 和 Storage Logs，區分 `/auth/v1/user`、`admin_users`、`projects`、`cms_save_draft`、媒體簽署與圖片下載。瀏覽器 TTFB 包含網路和伺服器等待。若日誌未提供內部階段耗時，將該項列為待驗證。

## 本機 Production Build 基準

Chromium 1440px，Next.js 16.4.3 Node.js，隔離的本機 Supabase，132 筆基準作品，停用測試期間的路由預先載入。首筆為各 Next.js 程序的第一個 Works 請求。其他列為各四次暖機樣本的中位數。頁面時間量到目標內容出現，編輯頁亦確認表單已出現。

| 操作 | 修改前（ms） | 修改後（ms） |
| --- | ---: | ---: |
| Works 首次 | 768 | 1188 |
| Works 重複載入 | 470 | 518 |
| Overview 暖機載入 | 464 | 597 |
| New Project 暖機載入 | 177 | 301 |
| Works → Edit | 441 | 455 |
| Edit → Works | 392 | 398 |
| Save Draft 到 POST 回應開始 | 101 | 195 |
| Save Draft 到成功訊息 | 111 | 212 |
| Save Draft 到按鈕恢復可用 | 166 | 266 |
| 儲存後回 Works | 406 | 456 |

Works 首次 TTFB 為 186 → 184 ms，重複載入為 34 → 53 ms。Chromium 記錄的 Works 重複載入 script/layout/style 時間為 73 → 112 ms。此測量沒有分離 React hydration；DNS/TLS 在 loopback 下是 0。Supabase gateway 記錄的 Works 暖機 PostgREST 請求合計為 40 → 45 ms，封面批次簽署為 24 → 19 ms。這些是 HTTP 請求耗時，包含並行請求，不能當成 SQL 執行時間或相加推導頁面時間。

| 操作 | Auth `/auth/v1/user` 請求數 | 管理員資格查詢數 |
| --- | ---: | ---: |
| Works 載入／返回 | 2 → 1 | 1 → 1 |
| Works → Edit，含媒體預覽 API | 4 → 2 | 2 → 2 |
| Save Draft，含 Server Action 後的重新渲染 | 3 → 2 | 2 → 2 |

本機 HS256 工作階段中，原先 Proxy 的 `getClaims()` 會呼叫 Auth 服務，頁面或 API 隨後再驗證一次。修正後 Proxy 僅處理工作階段 Cookie 更新與登入導向，受保護的資料與寫入仍會執行 Auth 及管理員資格驗證。可確認呼叫數下降；這組本機測試未顯示端到端耗時改善。Works 的封面仍為單次批次簽署，後續圖片下載並行發出。Save Draft 仍為單次寫入 RPC，並由伺服器重新讀取編輯頁以呈現已儲存狀態。

Preview 與 Production 未實測。部署 SHA、正確驗收網址、環境差異、Vercel Runtime 與 Function Region、Supabase 專案及資料庫 Region、跨區延遲、服務休眠和冷啟動均待查證。
