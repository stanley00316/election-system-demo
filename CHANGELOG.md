# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-02-12

### Added
- **範例版轉正式版引導**：展示首頁導航列新增「正式使用」按鈕、底部新增正式版 CTA 引導區塊（含註冊和定價入口）
- **DemoTip 正式版入口**：範例版各頁面提示列新增「正式使用」按鈕，一鍵跳轉正式版
- **推廣碼跨域橋接**：`getProductionUrl()` 工具函數，從範例版跳轉正式版時自動帶入 `?ref=CODE` 推廣碼（讀取 cookie）
- **`NEXT_PUBLIC_PRODUCTION_URL`**：新增環境變數，可自訂正式版 URL（預設 `web-delta-hazel-33.vercel.app`）
- **推廣追蹤系統**：全域 `?ref=CODE` URL 參數追蹤，Middleware 自動存入 cookie 並 redirect 至乾淨 URL
- **推廣連結複製**：推廣者後台側邊欄新增「複製推廣連結」按鈕，一鍵產生 `{baseUrl}?ref={referralCode}` 格式連結
- **使用者推薦連結**：使用者設定 > 推薦好友頁面新增追蹤連結格式
- **後端追蹤端點**：新增 `POST /promoters/track-ref`，記錄推廣碼點擊（含 IP、User-Agent、Referer），Throttle 限流防濫用
- **推廣者資料欄位擴充**：Prisma Schema `Promoter` model 新增 organization、region、address、category、socialLinks（JSON）、avatarUrl、joinedReason 七個欄位
- **推廣者自助編輯**：新增 `PUT /promoter/me` 端點 + 前端「個人資料」頁面（基本資訊、組織資訊、社群連結、備註），推廣者可自行維護詳細資料
- **Admin 推廣者編輯頁**：`/admin/promoters/:id/edit`，管理員可編輯所有推廣者欄位（含 LINE ID、分類下拉、社群連結）
- **Admin 使用者編輯頁**：`/admin/users/:id/edit` + `PUT /admin/users/:id`，可修改姓名、Email、電話，LINE User ID 唯讀保護
- ShareChannel enum 新增 `REF_LINK` 類型

### Changed
- Middleware matcher 擴展為全頁面攔截（排除 API / _next / 靜態資源），支援任意頁面的 ?ref= 追蹤
- 登入頁整合 cookie `ref_code` 讀取（優先於 sessionStorage），登入成功後自動清除
- Admin 推廣者詳情頁、使用者詳情頁新增「編輯」按鈕
- CreatePromoterDto / UpdatePromoterDto 擴充新欄位支援
- admin-promoters.service.ts `updatePromoter` 方法支援全部新欄位寫入
- Demo API 更新：demoPromoterSelfApi 新增 updateProfile mock、demoAdminUsersApi 新增 updateUser mock

### Security
- 推廣者自助編輯使用白名單限制可修改欄位，不可修改 referralCode / type / status
- `User.lineUserId` 為認證識別碼，API 和 UI 均設為唯讀，防止認證鏈被破壞
- `POST /promoters/track-ref` 加入 Throttle（60 秒 30 次）防濫用

## [1.9.1] - 2026-02-15

### Security (OWASP Top 10 合規複查)
- A01: 相簿 `getSocialStatus` 端點加入 `@CurrentUser` 認證一致性檢查
- A03: 檔案上傳 `application/octet-stream` MIME type 新增 magic bytes 驗證（XLSX ZIP header / XLS OLE header / CSV 文字檢查），防止偽造副檔名繞過
- A05: 生產環境 CORS 改為強制要求設定 `CORS_ORIGIN`，未設定時不允許任何跨域請求（移除 localhost 預設值）
- A10: 社群平台發佈功能新增 SSRF 防護 — 驗證所有外部 URL 為 HTTPS 且不指向內部網路（localhost / 私有 IP / link-local），含完整 RFC 1918 位址檢查

## [1.9.0] - 2026-02-15

### Added
- 匯入功能大幅強化：分步匯入精靈（選擇檔案 → 欄位驗證 → 資料預覽 → 匯入 → 結果）
- 後端新增 CSV 解析支援（.csv UTF-8 編碼）
- 後端新增智能欄位辨識：自動對應中英文標題名稱，支援模糊比對建議
- 後端新增逐列詳細驗證（Email 格式、電話格式、列舉值範圍、年齡合理性）
- 後端新增 POST /voters/import/validate 端點（僅驗證不寫入）
- 前端匯入結果報告重構：分類 Tabs 篩選、完整錯誤清單、可下載錯誤報告 Excel
- 錯誤訊息包含修正建議與可接受值，引導使用者修正
- 前端資料預覽功能：匯入前可預覽前 5 列資料

### Changed
- ImportResult / ImportError 型別定義升級（含 type、column、suggestion、acceptedValues 欄位）
- demo-api.ts 模擬驗證/匯入回傳新結構

## [1.8.0] - 2026-02-15

### Added
- 登入後個資法同意彈窗：首次登入或版本更新時顯示不可關閉的同意書對話框
- 完整 12 條個人資料保護聲明 + 肖像權暨聲音授權同意條款
- 三個強制核取項目（個資蒐集、敏感資料、操作紀錄）+ 肖像權同意/不同意選項
- 自動帶入使用者姓名、帳號、競選辦公室名稱
- 後端 POST /auth/consent、POST /auth/revoke-consent 端點
- Prisma schema 新增 consentAcceptedAt、consentVersion、portraitConsentAcceptedAt 欄位
- 設定頁新增「個資保護與法規」完整條款頁面，含同意狀態檢視與撤回同意功能
- Demo 模式完整支援同意書流程
- Dialog 元件新增 hideCloseButton 屬性支援

## [1.7.0] - 2026-02-15

### Added
- **Google Authenticator 雙因素驗證 (2FA/TOTP)**：所有使用者每次登入必須完成 TOTP 驗證
  - 後端：TotpService（密鑰產生/加密/驗證）、TempTokenGuard（臨時 token 保護）
  - 新增 API 端點：`POST /auth/2fa/setup`、`POST /auth/2fa/verify-setup`、`POST /auth/2fa/verify`
  - JwtStrategy 拒絕未完成 2FA 的 pending token 存取一般 API
  - TOTP 密鑰使用 AES-256-GCM 加密儲存
  - 2FA 端點每分鐘限制 5 次請求（防暴力破解）
  - 前端：`/setup-2fa` 頁面（QR Code 顯示 + 手動密鑰 + 驗證碼輸入）
  - 前端：`/verify-2fa` 頁面（6 位數 TOTP 驗證碼輸入）
  - Auth Store 新增 tempToken 暫存機制
  - 登入流程改為兩階段：LINE Login → 2FA 驗證 → 取得完整 JWT

### Changed
- User model 新增 `totpSecret`、`totpEnabled`、`totpEnabledAt` 欄位
- `validateLineToken()` 改為回傳 tempToken + requiresTwoFactor 狀態
- 前端 login callback 重構為 `computePostLoginRedirect` 統一導向邏輯

### Security
- OWASP A07：tempToken 有效期僅 5 分鐘，未完成 2FA 無法存取任何 API
- OWASP A02：TOTP 密鑰使用 AES-256-GCM 加密儲存（`TOTP_ENCRYPTION_KEY`）
- OWASP A05：2FA 驗證端點嚴格頻率限制

## [1.6.0] - 2026-02-15

### Added
- **正式環境部署配置**：建立完整的生產環境部署架構（Vercel + Railway + Supabase + Upstash）
- **Railway 部署配置**：新增 `railway.toml`，支援 Docker 建置與健康檢查
- **Supabase 連線池支援**：Prisma schema 新增 `directUrl` 支援 Supabase Transaction Pooler + Direct 雙連線模式
- **環境變數模板**：新增 `.env.production` 含所有平台（Railway/Vercel/Supabase）的完整配置模板與說明
- **部署驗證腳本**：`scripts/check-production-env.sh` 自動檢查所有必要環境變數是否已填入
- **一鍵部署腳本**：`scripts/setup-production.sh` 自動化 Railway 環境變數設定、部署、Vercel 環境切換與健康檢查

### Changed
- **Prisma datasource**：`directUrl` 欄位允許分離應用程式連線（Pooler）與遷移連線（Direct），提升 Supabase 相容性

## [1.5.0] - 2026-02-15

### Added
- **接觸紀錄時間軸視圖**：選民詳情頁的接觸紀錄改為垂直時間軸呈現，按日期分群、依 outcome 色彩標記圓點，取代原有扁平卡片列表
- **接觸類型篩選 Chip**：選民詳情頁新增水平 Chip 列，可按 11 種接觸類型即時篩選紀錄，含各類型計數顯示
- **編輯接觸紀錄 Dialog**：支援在選民詳情頁直接編輯既有接觸紀錄，含 react-hook-form + zod 表單驗證、GPS 定位
- **刪除接觸紀錄確認**：AlertDialog 確認流程，刪除後自動刷新選民資料

### New Components
- `ContactTimeline` — 垂直時間軸元件（日期群組、outcome 色彩圓點、操作按鈕）
- `ContactTypeFilter` — 水平 Chip 篩選列（全部 + 11 種接觸類型）
- `EditContactDialog` — 編輯紀錄 Dialog（預填既有值、表單驗證、update API）
- `DeleteContactDialog` — 刪除確認 Dialog（AlertDialog + delete API）

## [1.4.6] - 2026-02-15

### Fixed
- **Safari/所有瀏覽器 Demo 資料不顯示（根因）**：`isDemoMode` 僅依賴 build-time `NEXT_PUBLIC_DEMO_MODE` 環境變數，Vercel 設定值含換行符 (`"false\n"`) 導致 `=== 'true'` 永遠為 false，所有 API 走真實端點返回 401。新增 client-side hostname regex fallback `/[-.]demo[-.]/.test(hostname)`，域名含 `-demo-` 或 `.demo.` 時自動啟用 demo 模式
- **Demo 資料生成防禦**：`demo-data.ts` 所有 `generate*` 呼叫加上 `safeGenerate` 防禦性包裝
- **Demo API 初始化防禦**：`demo-api.ts` 加入 `Array.isArray` 檢查，防止匯入值為 `undefined` 時拋出 TypeError
- **Safari localStorage 相容性**：新增 `safe-storage.ts`，為 zustand persist 提供 `try-catch` 包裝的 localStorage 存取
- **Auth Store 水合修正**：`onRehydrateStorage` 改用 `useAuthStore.setState()` 取代直接突變
- **Demo 登入 Storage 錯誤處理**：`handleDemoLogin` 中 storage 操作加上 `try-catch`

## [1.4.5] - 2026-02-14

### Fixed
- **超級管理員 campaign 存取**：`checkCampaignAccess` 新增 `isSuperAdmin` 豁免邏輯，超級管理員可存取所有 campaign（原先必須是 TeamMember 才能通過）
- **Excel 匯出格式**：`exportExcel` endpoint 改用 `StreamableFile` 回傳真實 xlsx 二進位（原先 `return Buffer` 被 NestJS 序列化為 JSON，導致 Excel 無法開啟）

## [1.4.4] - 2026-02-14

### Fixed
- **DI 修復**：`AdminAuthModule` 新增 re-export `AuthModule`，解決 `SuperAdminGuard` 在 `HealthModule` context 中無法注入 `TokenBlacklistService` 的問題
- **ECPay 啟動修復**：`EcpayProvider` 將 `getOrThrow` 改為 `get` 延遲驗證，避免未配置 ECPay 環境變數時整個 API 無法啟動
- **Middleware matcher 修復**：新增 `/admin` 和 `/promoter` 精確路徑至 matcher，修正 Next.js `:path*` 不匹配根路徑的問題
- **Admin 登入頁放行**：Middleware 新增 `ADMIN_PUBLIC_PATHS`，允許 `/admin/login` 在未認證時正常存取

## [1.4.3] - 2026-02-14

### Security
- **防目錄掃描 — Nginx 層**：加入 `server_tokens off` 隱藏版本號、`limit_req_zone` 代理層速率限制（API 20r/s、前端 10r/s）、`autoindex off` 禁用目錄列表
- **防目錄掃描 — Nginx 層**：Health 端點（`/api/v1/health`）加入 IP 白名單，僅允許內部網路（10.0.0.0/8、172.16.0.0/12、192.168.0.0/16）存取
- **防目錄掃描 — Next.js Middleware**：重寫 `middleware.ts`，所有 `/admin/*` 和 `/promoter/*` 路徑在服務端攔截，未認證請求直接返回 404（原設計返回 200 後客戶端重定向，可被掃描工具區分）
- **防目錄掃描 — NestJS 後端**：`GlobalExceptionFilter` 將無 Bearer token 的 401 回應偽裝為 404，消除掃描工具可利用的狀態碼差異；移除回應中的 `path` 欄位
- **防目錄掃描 — 靜態防護**：新增 `robots.txt`，禁止搜尋引擎爬取 `/admin/`、`/promoter/`、`/dashboard/`、`/api/` 等敏感路徑

## [1.4.2] - 2026-02-14

### Security
- **A01 Broken Access Control**: `payments.controller` 的 `getPayment` 和 `refundPayment` 加入使用者所有權驗證，防止 IDOR 攻擊
- **A05 Security Misconfiguration**: 生產環境 CSP 移除 `unsafe-eval`（`next.config.js`、`nginx.conf`），僅開發環境保留
- **A05 Security Misconfiguration**: Nginx 移除已棄用的 `X-XSS-Protection` 標頭，改由 CSP 提供防護
- **A07 Authentication Failures**: `AdminGuard` 和 `SuperAdminGuard` 加入 Token 黑名單檢查（`TokenBlacklistService`），確保管理員登出後 token 立即失效
- **A07 Authentication Failures**: 重構 5 個 admin module（`admin-plans`、`health`、`role-invites`、`admin-referrals`、`admin-promoters`）改為透過 `AdminAuthModule` 匯入 Guards，確保 DI 依賴正確
- **A09 Security Logging**: 全面將 `console.log`/`console.error`/`console.warn` 替換為 NestJS `Logger`（共 9 個後端檔案）
- **A09 Security Logging**: 移除前端 admin layout 中 3 處 debug `console.log`，防止在瀏覽器 console 洩露管理員身份、userId、superAdmin 狀態

## [1.4.1] - 2026-02-13

### Security
- **A01 Broken Access Control**: `schedules.controller` 的 `findByDate`、`getSuggestions` 加入 `checkCampaignAccess` 授權檢查
- **A01 Broken Access Control**: `events.controller` 的 `findAll` 加入 `checkCampaignAccess` 授權檢查
- **A01 Broken Access Control**: `districts.controller` 的 `getStats` 加入 `checkCampaignAccess` 授權檢查；`DistrictsModule` 匯入 `CampaignsModule`
- **A01 Swagger 文件**: 10 個 controller 補上缺少的 `@ApiBearerAuth()` 裝飾器（referrals、subscriptions、8 個 admin controllers）
- **A02 Cryptographic Failures**: 移除 `ecpay.provider.ts` 中硬編碼的測試金鑰，改用 `getOrThrow` 強制要求環境變數
- **A02 JWT Token 過期**: Admin JWT 從 7d 縮短至 1h（`ADMIN_JWT_EXPIRES_IN`）；Promoter JWT 從 7d 縮短至 4h（`PROMOTER_JWT_EXPIRES_IN`）
- **A05 Security Misconfiguration**: 新增 `GlobalExceptionFilter` 作為 fallback 例外過濾器，確保 Sentry 未設定時也不洩露堆疊追蹤
- **A10 SSRF**: `auth.service.ts` 新增 `validateRedirectUri` 方法，驗證 LINE OAuth redirectUri 是否在 CORS 白名單內

### Fixed
- 修正 `analysis.service.ts` Prisma `groupBy` 型別推斷錯誤

## [1.4.0] - 2026-02-13

### Added
- 新增 5 個社群平台支援：Threads、TikTok、YouTube、Telegram、WhatsApp
- 後端：新增 ThreadsProvider、TikTokProvider、YouTubeProvider、TelegramProvider、WhatsAppProvider
- 前端 ShareButtons：新增 5 個平台的分享連結按鈕（Threads/Telegram/WhatsApp 開啟分享頁面；TikTok/YouTube 複製連結）
- 前端 SocialPublishDialog：加入 5 個新平台的 API 自動發佈選項
- 社群設定頁：加入 9 個平台的管理員設定步驟教學（可摺疊面板），含環境變數說明、開發者後台連結、注意事項
- 使用者指南頁：新增「社群分享」完整教學區塊（4 個步驟 + 各平台特性說明）
- 相簿詳情頁：分享按鈕區域加入操作提示文字
- Demo 模式 getSocialStatus 回傳值加入 5 個新平台
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-02-13

### Fixed
- 修正 Demo 模式下相簿/照片/辨識照功能呼叫真實 API 導致 `Failed to fetch` 錯誤
- 新增 `demoAlbumsApi`、`demoPhotosApi`、`demoVoterAvatarApi` 完整 mock 實作
- 修正 demo 相簿資料欄位名稱（`publishSlug`、`event.name`、`coverPhoto`、`photos`）

## [1.3.0] - 2026-02-13

### Added
- 新增選民頁面加入辨識照上傳功能（預覽、選擇、建立後自動上傳）
- 編輯選民頁面加入 VoterAvatar 元件，支援更換與刪除辨識照

## [1.2.2] - 2026-02-13

### Fixed
- 修正前端 CSP `connect-src` 指令過度限制，改用 API origin 取代完整路徑，解決子路徑請求被阻擋的問題
- 清除除錯用 instrumentation 日誌（albums controller / service / new page）

## [1.2.1] - 2026-02-13

### Fixed
- 設定 Express `trust proxy` 修正雲端環境（Railway）Rate Limiting 無法正確識別客戶端 IP 的問題

## [1.2.0] - 2026-02-13

### Added
- 社群分享模組 (`social/`) — 支援 Facebook、Instagram、LINE、X (Twitter) 平台發佈
- 相簿社群分享功能 (`shareSocial` endpoint)
- 社群平台設定頁面 (`/dashboard/settings/social`)
- 公開相簿分享按鈕元件 (`ShareButtons`, `SocialPublishDialog`)
- Cursor Rules：互動風格規則 (`interaction-style.mdc`)、OWASP 安全規則 (`owasp-security.mdc`)

### Changed
- 相簿模組新增 `ConfigService` 注入，使用環境變數取得 `SITE_URL`（OWASP A05）
- `findPublicBySlug` 僅回傳安全欄位，不洩露 `storageKey` 等內部資訊（OWASP A01）
- `reorderPhotos` 新增 photo ID 歸屬驗證（OWASP A01）
- `.env.example` 新增社群平台與 `SITE_URL` 環境變數說明

### Fixed
- 修正 `social/providers/` 下 4 個檔案共 19 個 `res.json()` 回傳 `unknown` 型別錯誤

### Security
- 全域啟用 Rate Limiting（`ThrottlerGuard`）
- 登入端點嚴格限流（10 次/分鐘）
- JWT Token 黑名單機制（Redis-backed `TokenBlacklistService`）
- 移除危險端點：`health/db-push`、`auth/debug-check`
- 前端 CSP、X-Frame-Options、Permissions-Policy 等安全標頭
- 檔案上傳驗證管道（`FileValidationPipe`）
- 所有 CRUD 端點新增 campaign-level 存取控制（OWASP A01）
- Auth Service 全面使用 NestJS Logger 取代 `console.log`（OWASP A09）

## [1.1.0] - 2026-02-12

### Added
- 相簿功能模組（建立、編輯、刪除相簿與照片）
- 公開相簿頁面 (`/p/[slug]`)

### Fixed
- 新增相簿頁 `Select.Item` 空值導致 client-side error
- 深色模式下 `bg-primary + text-white` 造成白底白字問題

## [1.0.0] - 2026-02-11

### Added
- 選民管理系統核心功能
- 接觸紀錄追蹤
- 選情分析儀表板
- 活動管理
- 行程規劃（日曆整合）
- 地圖檢視（Google Maps）
- 團隊協作與權限控制
- 推廣人員系統
- 管理後台
- Demo 展示模式
- LINE / Google OAuth 登入
- 外勤快速模式 + GPS 地理連結
- QR Code 掃描定位選民
