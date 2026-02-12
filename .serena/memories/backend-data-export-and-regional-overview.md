# 後台完整資料截取與地區總覽功能

## 已完成功能總覽

### 後端 API 端點（apps/api/）

**使用者管理（admin-users）**
- `GET /admin/users/export` - 使用者列表 CSV 匯出（含選情指標、支持度分佈、付款總額）
- `GET /admin/users/:id/export` - 個人完整資料 CSV 匯出（基本資料 + 訂閱 + 付款 + 活動 + 推薦）
- `GET /admin/users/:id/payments` - 使用者付款歷史
- `GET /admin/users/:id/referrals` - 使用者推薦關係（作為推薦人/被推薦人）
- `GET /admin/users/:id/voters` - 使用者所有活動的選民名單（分頁 + 搜尋）
- `GET /admin/users/:id/contacts` - 使用者所有活動的接觸紀錄（分頁）
- `GET /admin/users/:id/campaign-stats` - 使用者選情統計（支持度、接觸成效、各活動細項）
- 增強 `getUserById` 回傳 campaign contacts count、district、village、promoter 資料

**訂閱管理（admin-subscriptions）**
- `GET /admin/subscriptions/export` - 訂閱列表 CSV 匯出

**推薦管理（admin-referrals）**
- `GET /admin/referrals/export` - 推薦紀錄 CSV 匯出

**分析（admin-analytics）**
- `GET /admin/analytics/regional-overview` - 地區總覽（每地區所有使用者完整選情數據）
- `GET /admin/analytics/regional-overview/export` - 地區總覽 CSV 匯出

### 前端頁面（apps/web/）

**使用者列表頁** (`users/page.tsx`)
- 新增「選情指標」欄位：選民數、支持率（彩色進度條）、接觸率（進度條）
- 新增「匯出報表」按鈕

**使用者詳情頁** (`users/[id]/page.tsx`)
- 新增「選情概覽」分頁：統計卡片 + PieChart 支持度分佈 + BarChart 接觸結果/類型 + 各活動摘要表
- 新增「付款歷史」分頁
- 新增「推薦關係」分頁
- 新增「選民名單」分頁
- 新增「接觸紀錄」分頁
- 增強「選舉活動」分頁：顯示接觸數
- 新增「匯出完整資料」按鈕

**地區總覽頁** (`regions/page.tsx`) - **全新**
- 各地區摺疊卡片：顯示使用者數、選民數、支持率、接觸率
- 展開顯示每個使用者的每個活動數據
- 可再展開查看支持度圓餅圖
- 篩選器：縣市、選舉類型、搜尋使用者
- 匯出報表按鈕

**側邊欄** (`layout.tsx`)
- 新增「地區總覽」（MapPin icon）導航項目

**API Client** (`api.ts`)
- 新增 getUserPayments, getUserReferrals, getUserVoters, getUserContacts, getUserCampaignStats
- 新增 getRegionalOverview

**Demo API** (`demo-api.ts`)
- 新增 demoCampaignsForAdmin 資料（6 個活動分佈在台北、新北、桃園、台中）
- 更新 demoAdminUsersApi：含所有新方法的 Demo 實作
- 更新 demoAdminAnalyticsApi：含 getRegionalOverview Demo 實作

### CSV 匯出格式
- UTF-8 BOM 編碼
- 繁體中文標頭
- 數值使用引號包裹避免 Excel 格式問題
