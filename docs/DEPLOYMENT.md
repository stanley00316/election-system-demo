# 選情系統 - 生產環境部署指南

本文件說明如何將選情系統部署到生產環境，包含伺服器設定、SSL 配置、資料庫設置、以及持續部署流程。

## 目錄

1. [部署架構](#部署架構)
2. [前置需求](#前置需求)
3. [第三方服務設定](#第三方服務設定)
4. [伺服器設置](#伺服器設置)
5. [手動部署](#手動部署)
6. [自動化部署 (CI/CD)](#自動化部署-cicd)
7. [SSL 憑證設定](#ssl-憑證設定)
8. [資料庫管理](#資料庫管理)
9. [監控與錯誤追蹤](#監控與錯誤追蹤)
10. [備份與還原](#備份與還原)
11. [Vercel 示範模式部署](#vercel-示範模式部署)
12. [常見問題](#常見問題)

---

## 部署架構

```
                                    ┌─────────────┐
                                    │   使用者    │
                                    └──────┬──────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Nginx (反向代理)                          │
│                    - SSL 終止                                     │
│                    - 負載均衡                                     │
│                    - 靜態資源快取                                  │
│                    Port 80/443                                   │
└──────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
              ┌───────────────────┐  ┌───────────────────┐
              │    Web (Next.js)  │  │    API (NestJS)   │
              │    Port 3000      │  │    Port 3001      │
              └───────────────────┘  └─────────┬─────────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          │                                         │
                          ▼                                         ▼
              ┌───────────────────┐                     ┌───────────────────┐
              │    PostgreSQL     │                     │      Redis        │
              │    (PostGIS)      │                     │     (快取)        │
              │    Port 5432      │                     │    Port 6379      │
              └───────────────────┘                     └───────────────────┘
```

---

## 前置需求

### 伺服器需求

| 項目 | 最低配置 | 建議配置 |
|------|---------|---------|
| CPU | 2 核心 | 4 核心 |
| RAM | 4 GB | 8 GB |
| 儲存空間 | 40 GB SSD | 100 GB SSD |
| 作業系統 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 軟體需求

- Docker 24.0+
- Docker Compose 2.20+
- Git 2.34+

### 網域需求

- 已購買並設定 DNS 指向伺服器 IP 的網域
- 建議使用子網域（如 `election.example.com`）

---

## 第三方服務設定

### 1. LINE Login（必要）

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立新的 Provider 和 Channel（LINE Login）
3. 設定 Callback URL：`https://your-domain.com/login`
4. 記錄 Channel ID 和 Channel Secret

### 2. Google API（必要）

#### Google Calendar API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案
3. 啟用 Google Calendar API
4. 建立 OAuth 2.0 憑證
   - 應用程式類型：Web 應用程式
   - 授權重新導向 URI：`https://your-domain.com/api/v1/google/callback`
5. 記錄 Client ID 和 Client Secret

#### Google Maps API（選填）

1. 在同一專案中啟用以下 API：
   - Maps JavaScript API
   - Geocoding API
   - Directions API
2. 建立 API Key 並設定限制

### 3. Sentry（建議）

1. 前往 [Sentry.io](https://sentry.io/) 註冊帳號
2. 建立新專案（選擇 Node.js）
3. 記錄 DSN

---

## 伺服器設置

### 1. 連線到伺服器

```bash
ssh user@your-server-ip
```

### 2. 安裝 Docker

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝必要套件
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 新增 Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 新增 Docker 儲存庫
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安裝 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 讓當前使用者可以執行 Docker
sudo usermod -aG docker $USER

# 重新登入以套用群組變更
exit
```

### 3. 設置專案目錄

```bash
# 建立專案目錄
sudo mkdir -p /opt/election-system
sudo chown $USER:$USER /opt/election-system

# 複製專案
cd /opt/election-system
git clone https://github.com/your-repo/election-system.git .
```

### 4. 設定環境變數

```bash
# 複製環境變數範例
cd /opt/election-system/docker
cp .env.production.example .env

# 編輯環境變數
nano .env
```

必須設定的環境變數：

```env
# 資料庫
POSTGRES_USER=election_user
POSTGRES_PASSWORD=<生成強密碼>
POSTGRES_DB=election_system

# Redis
REDIS_PASSWORD=<生成強密碼>

# JWT（使用 openssl rand -base64 32 生成）
JWT_SECRET=<32字元以上的隨機字串>

# LINE Login
LINE_CHANNEL_ID=<你的 Channel ID>
LINE_CHANNEL_SECRET=<你的 Channel Secret>

# Google
GOOGLE_CLIENT_ID=<你的 Client ID>
GOOGLE_CLIENT_SECRET=<你的 Client Secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/api/v1/google/callback
GOOGLE_MAPS_API_KEY=<你的 Maps API Key>

# 前端
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_LINE_CHANNEL_ID=<你的 Channel ID>
NEXT_PUBLIC_LINE_CALLBACK_URL=https://your-domain.com/login
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<你的 Maps API Key>

# CORS
CORS_ORIGIN=https://your-domain.com

# 域名
DOMAIN=your-domain.com

# Sentry（選填）
SENTRY_DSN=<你的 Sentry DSN>
```

---

## 手動部署

### 1. 啟動服務

```bash
cd /opt/election-system/docker

# 啟動所有生產服務
docker compose --profile production up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f
```

### 2. 執行資料庫遷移

```bash
# 執行 Prisma 遷移
docker compose exec api npx prisma migrate deploy

# 填入種子資料（首次部署，選填）
docker compose exec api npx prisma db seed
```

### 3. 驗證部署

```bash
# 檢查 API 健康狀態
curl http://localhost:3001/api/v1/health

# 檢查前端
curl http://localhost:3000
```

---

## 自動化部署 (CI/CD)

專案已配置 GitHub Actions 自動化部署流程。

### 設定 GitHub Secrets

在 GitHub 儲存庫中設定以下 Secrets：

| Secret 名稱 | 說明 |
|------------|------|
| `STAGING_HOST` | Staging 伺服器 IP |
| `STAGING_USER` | Staging 伺服器使用者 |
| `STAGING_SSH_KEY` | Staging 伺服器 SSH 私鑰 |
| `PRODUCTION_HOST` | Production 伺服器 IP |
| `PRODUCTION_USER` | Production 伺服器使用者 |
| `PRODUCTION_SSH_KEY` | Production 伺服器 SSH 私鑰 |
| `NEXT_PUBLIC_API_URL` | API URL |
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | LINE Channel ID |
| `NEXT_PUBLIC_LINE_CALLBACK_URL` | LINE Callback URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key |
| `NEXT_PUBLIC_GOOGLE_MAPS_ID` | Google Maps ID |

### 設定 GitHub Environments

1. 建立 `staging` 環境
2. 建立 `production` 環境
3. 為 `production` 環境設定保護規則（需要審核）

### 部署觸發方式

| 觸發條件 | 目標環境 |
|---------|---------|
| Push 到 `main` 分支 | Staging |
| 建立 `v*` tag | Production |
| 手動觸發 | Staging 或 Production |

### 手動觸發部署

```bash
# 部署到 staging
gh workflow run deploy.yml -f environment=staging

# 部署到 production
gh workflow run deploy.yml -f environment=production
```

---

## SSL 憑證設定

### 使用自動化腳本

```bash
cd /opt/election-system

# 執行 SSL 設定腳本
./scripts/setup-ssl.sh your-domain.com admin@your-domain.com
```

### 手動設定 Let's Encrypt

```bash
# 1. 啟動 Nginx（使用自簽憑證）
cd /opt/election-system/docker
docker compose up -d nginx

# 2. 取得憑證
docker run --rm \
  -v "/opt/election-system/docker/certbot/conf:/etc/letsencrypt" \
  -v "/opt/election-system/docker/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d your-domain.com \
  --email admin@your-domain.com \
  --agree-tos

# 3. 複製憑證到 Nginx
cp /opt/election-system/docker/certbot/conf/live/your-domain.com/fullchain.pem /opt/election-system/docker/nginx/ssl/
cp /opt/election-system/docker/certbot/conf/live/your-domain.com/privkey.pem /opt/election-system/docker/nginx/ssl/

# 4. 重啟 Nginx
docker compose restart nginx
```

### 憑證自動更新

憑證會透過 cron job 自動更新。您也可以手動更新：

```bash
./scripts/renew-ssl.sh
```

---

## 資料庫管理

### 執行遷移

```bash
# 開發環境
pnpm db:migrate

# 生產環境
docker compose exec api npx prisma migrate deploy
```

### 查看資料庫

```bash
# 使用 Prisma Studio（僅限開發）
pnpm db:studio

# 直接連線 PostgreSQL
docker exec -it election-postgres psql -U election_user -d election_system
```

### 常用 SQL 指令

```sql
-- 查看所有資料表
\dt

-- 查看使用者數量
SELECT COUNT(*) FROM users;

-- 查看選民數量
SELECT COUNT(*) FROM voters;

-- 查看最近的接觸紀錄
SELECT * FROM contacts ORDER BY created_at DESC LIMIT 10;
```

---

## 監控與錯誤追蹤

### Sentry 錯誤監控

Sentry 已整合到 API 中，會自動捕捉：

- 未處理的例外
- HTTP 錯誤 (4xx, 5xx)
- 效能追蹤

查看錯誤：前往 [Sentry Dashboard](https://sentry.io/)

### 健康檢查

```bash
# API 健康檢查
curl https://your-domain.com/api/v1/health

# 預期回應
{"status":"ok","timestamp":"..."}
```

### 查看日誌

```bash
# 查看所有服務日誌
docker compose logs -f

# 查看特定服務日誌
docker compose logs -f api
docker compose logs -f web
docker compose logs -f nginx
```

---

## 備份與還原

### 執行備份

```bash
# 手動備份
./scripts/backup.sh

# 部署前備份
./scripts/backup.sh pre-deploy

# 每日備份（由 cron 執行）
./scripts/backup.sh daily
```

### 設置自動備份

```bash
# 設置每日自動備份 cron job
sudo ./scripts/setup-cron-backup.sh
```

### 查看備份

```bash
# 列出所有備份
ls -la backups/

# 或使用還原腳本
./scripts/restore.sh --list
```

### 還原備份

```bash
# 還原最新備份
./scripts/restore.sh --latest

# 還原指定備份
./scripts/restore.sh backups/election_full_20260129_030000.sql.gz
```

---

## Vercel 示範模式部署

示範模式允許潛在使用者在無需後端服務的情況下體驗系統完整功能。

### 架構

```
使用者 → Vercel (Next.js) → 靜態示範資料
                          ↓
                   無需後端/資料庫
```

### 功能說明

示範模式包含：
- **500 位選民**資料
- **800 筆接觸紀錄**
- **25 場活動**
- **22 天行程**
- **12 區 120 里**選區資料

所有資料在瀏覽器內模擬，重新整理頁面後會重置為初始狀態。

### 部署步驟

#### 1. Fork 或連接 GitHub 儲存庫

1. 前往 [Vercel](https://vercel.com/) 並登入
2. 點擊「Add New Project」
3. 選擇此儲存庫

#### 2. 設定專案

| 設定項目 | 值 |
|---------|-----|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | `npm run build` |
| Output Directory | `.next` |

#### 3. 設定環境變數

在「Environment Variables」區塊加入：

```
NEXT_PUBLIC_DEMO_MODE=true
```

**注意**：示範模式下不需要設定其他環境變數（LINE、API URL 等）

#### 4. 部署

點擊「Deploy」，等待部署完成。

### 本地測試示範模式

```bash
# 進入前端目錄
cd apps/web

# 複製示範環境變數
cp .env.demo .env.local

# 啟動開發伺服器
pnpm dev
```

訪問 http://localhost:3000 即可測試示範模式。

### 示範模式限制

| 功能 | 狀態 | 說明 |
|-----|------|-----|
| 儀表板 | ✅ 支援 | 顯示模擬統計數據 |
| 選民列表 | ✅ 支援 | 500 位示範選民 |
| 選民詳情 | ✅ 支援 | 可查看詳細資料 |
| 新增選民 | ⚠️ 部分 | 僅暫存於瀏覽器 |
| 接觸紀錄 | ✅ 支援 | 800 筆示範紀錄 |
| 活動管理 | ✅ 支援 | 25 場示範活動 |
| 行程規劃 | ✅ 支援 | 22 天示範行程 |
| 地圖檢視 | ✅ 支援 | 顯示選民分布 |
| 選情分析 | ✅ 支援 | 模擬分析數據 |
| LINE 登入 | ❌ 不支援 | 使用「立即體驗」登入 |
| 資料匯出 | ❌ 不支援 | 需要後端服務 |
| Google 同步 | ❌ 不支援 | 需要後端服務 |
| 管理後台 | ❌ 不支援 | 需要後端服務 |
| 付款功能 | ❌ 不支援 | 需要後端服務 |

### 技術實作

示範模式相關檔案：

| 檔案 | 說明 |
|-----|------|
| `apps/web/src/lib/demo-data.ts` | 靜態示範資料（基於 seed.ts） |
| `apps/web/src/lib/demo-api.ts` | 模擬 API 層 |
| `apps/web/src/lib/api.ts` | API 客戶端（自動切換） |
| `vercel.json` | Vercel 部署配置 |
| `apps/web/.env.demo` | 示範模式環境變數範例 |

### 自訂示範資料

如需修改示範資料，編輯 `apps/web/src/lib/demo-data.ts`：

```typescript
// 修改選民數量
export const demoVoters = generateVoters(100); // 減少為 100 位

// 修改選舉活動名稱
export const demoCampaign = {
  // ...
  name: '2026 新北市長選舉',
  district: '板橋區',
};
```

---

## 常見問題

### 1. Docker 容器無法啟動

```bash
# 檢查容器狀態
docker compose ps

# 查看錯誤日誌
docker compose logs api
docker compose logs web

# 常見原因：
# - 環境變數未設定
# - 端口被佔用
# - 資料庫連線失敗
```

### 2. 資料庫連線失敗

```bash
# 檢查 PostgreSQL 容器狀態
docker exec election-postgres pg_isready -U election_user

# 檢查連線字串
docker compose exec api env | grep DATABASE_URL
```

### 3. SSL 憑證問題

```bash
# 檢查憑證到期日
openssl x509 -in /opt/election-system/docker/nginx/ssl/fullchain.pem -noout -dates

# 手動更新憑證
./scripts/renew-ssl.sh

# 檢查 Nginx 配置
docker compose exec nginx nginx -t
```

### 4. 記憶體不足

```bash
# 檢查記憶體使用
docker stats

# 限制容器記憶體（在 docker-compose.yml 中設定）
deploy:
  resources:
    limits:
      memory: 512M
```

### 5. 磁碟空間不足

```bash
# 檢查磁碟使用
df -h

# 清理 Docker 資源
docker system prune -a

# 清理舊的備份
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

---

## 更新部署

### 手動更新

```bash
cd /opt/election-system

# 拉取最新程式碼
git pull origin main

# 重建並重啟服務
docker compose --profile production pull
docker compose --profile production up -d --remove-orphans

# 執行資料庫遷移
docker compose exec api npx prisma migrate deploy
```

### 回滾部署

```bash
# 查看映像版本
docker images | grep election

# 回滾到特定版本
docker compose --profile production up -d --no-deps api
docker compose exec api npx prisma migrate deploy
```

---

## 安全性檢查清單

- [ ] 使用強密碼（JWT Secret、資料庫密碼、Redis 密碼）
- [ ] 啟用 HTTPS 並強制重導向
- [ ] 設定防火牆，僅開放 80、443 端口
- [ ] 定期更新系統和 Docker 映像
- [ ] 啟用資料庫備份
- [ ] 設定 Sentry 錯誤監控
- [ ] 檢查 CORS 設定只允許正確的來源
- [ ] 移除或保護 Swagger 文件（生產環境）

---

## 聯絡與支援

如有問題，請：

1. 查看 [GitHub Issues](https://github.com/your-repo/election-system/issues)
2. 檢查 Sentry 錯誤報告
3. 聯繫技術團隊
