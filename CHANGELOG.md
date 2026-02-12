# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
