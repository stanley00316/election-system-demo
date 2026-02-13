# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
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
