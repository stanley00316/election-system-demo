# 選情系統 - 環境設定與操作指南

本文件說明如何設定開發環境、啟動後端服務、初始化資料庫，以及驗證系統是否正常運作。

## 目錄

1. [前置需求](#前置需求)
2. [快速開始](#快速開始)
3. [詳細設定步驟](#詳細設定步驟)
4. [資料庫操作](#資料庫操作)
5. [驗證系統運作](#驗證系統運作)
6. [常見問題排解](#常見問題排解)

---

## 前置需求

### 系統需求

- **Node.js**: 20.0.0 或以上
- **pnpm**: 9.0.0 或以上
- **Docker**: 用於運行 PostgreSQL 和 Redis（或本機安裝）
- **PostgreSQL**: 15+ with PostGIS 擴展
- **Redis**: 7+

### 外部服務 API Keys（選用，用於完整功能）

- LINE Login Channel ID & Secret
- Google Maps API Key

---

## 快速開始

### 1. 使用 Docker 啟動資料庫服務

```bash
# 進入專案目錄
cd 選情系統

# 啟動 PostgreSQL（含 PostGIS）和 Redis
cd docker
docker compose up -d postgres redis
cd ..
```

### 2. 安裝依賴並設定環境

```bash
# 安裝所有依賴
pnpm install

# 複製環境變數範例檔
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. 初始化資料庫

```bash
# 產生 Prisma Client
pnpm db:generate

# 將 Schema 推送到資料庫
pnpm db:push

# 填入種子資料（測試資料）
pnpm --filter api db:seed
```

### 4. 啟動開發伺服器

```bash
# 同時啟動前後端
pnpm dev
```

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **API 文件**: http://localhost:3001/docs

---

## 詳細設定步驟

### 環境變數設定

#### 後端 `apps/api/.env`

```env
# 應用程式設定
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# 資料庫設定（使用 Docker 的預設值）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/election_system?schema=public"

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 設定（請更換為隨機字串）
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# LINE Login 設定（可選，用於正式登入）
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CALLBACK_URL=http://localhost:3000/login

# Google Maps API 設定（可選，用於地圖功能）
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# 加密設定（請更換為 32 字元的隨機字串）
ENCRYPTION_KEY=your-32-character-encryption-key

# CORS 設定
CORS_ORIGIN=http://localhost:3000
```

#### 前端 `apps/web/.env.local`

```env
# API 位址
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# LINE Login（可選）
NEXT_PUBLIC_LINE_CHANNEL_ID=your-line-channel-id
NEXT_PUBLIC_LINE_CALLBACK_URL=http://localhost:3000/login

# Google Maps（可選）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_MAPS_ID=your-google-maps-map-id
```

---

## 資料庫操作

### Prisma 指令

```bash
# 產生 Prisma Client（修改 schema 後需執行）
pnpm db:generate

# 將 Schema 推送到資料庫（開發時使用）
pnpm db:push

# 建立遷移檔案（正式環境使用）
pnpm db:migrate

# 開啟 Prisma Studio（資料庫 GUI）
pnpm db:studio

# 填入種子資料
pnpm --filter api db:seed
```

### 使用 Prisma Studio 查看資料

```bash
pnpm db:studio
```

這會開啟 http://localhost:5555，可以：
- 查看所有資料表
- 新增、編輯、刪除資料
- 執行查詢

### 直接連線 PostgreSQL

```bash
# 使用 psql 連線
docker exec -it election-postgres psql -U postgres -d election_system

# 常用 SQL 指令
\dt              # 列出所有資料表
\d voters        # 查看 voters 表結構
SELECT * FROM users;
SELECT * FROM voters LIMIT 10;
SELECT * FROM campaigns;
```

---

## 驗證系統運作

### 1. 檢查 Docker 服務狀態

```bash
docker ps

# 預期輸出應該看到:
# - election-postgres (running)
# - election-redis (running)
```

### 2. 測試資料庫連線

```bash
# 檢查 PostgreSQL
docker exec election-postgres pg_isready -U postgres
# 預期輸出: /var/run/postgresql:5432 - accepting connections

# 檢查 Redis
docker exec election-redis redis-cli ping
# 預期輸出: PONG
```

### 3. 驗證後端 API

```bash
# 健康檢查端點
curl http://localhost:3001/api/v1/health

# 預期回應:
# {"status":"ok","timestamp":"..."}
```

### 4. 測試 API 端點

```bash
# 取得選民列表（需要 JWT Token）
curl http://localhost:3001/api/v1/voters

# 如果沒有 Token，會回傳 401 Unauthorized
```

### 5. 驗證種子資料

開啟 Prisma Studio 後，檢查以下資料表：

| 資料表 | 預期資料筆數 |
|--------|-------------|
| users | 1 (測試使用者) |
| campaigns | 1 (2026 台北市議員選舉) |
| voters | 5 (測試選民) |
| contacts | 4 (接觸紀錄) |
| events | 1 (客廳會) |
| schedules | 1 (今日行程) |
| schedule_items | 3 (行程項目) |
| districts | 2 (台北市、大安區) |

### 6. 前端驗證

1. 開啟 http://localhost:3000
2. 應該看到登入頁面
3. 由於 LINE Login 需要設定，開發時可以建立測試登入端點

---

## 開發測試登入

為了方便開發測試，可以建立一個測試用的 JWT Token：

### 方法一：使用 Prisma Studio 直接查看資料

```bash
pnpm db:studio
```

### 方法二：建立測試登入端點

在 `apps/api/src/modules/auth/auth.controller.ts` 新增：

```typescript
@Public()
@Get('dev-login')
async devLogin() {
  if (process.env.NODE_ENV !== 'development') {
    throw new ForbiddenException('僅限開發環境使用');
  }
  
  // 使用種子資料的測試使用者
  const user = await this.authService.findUserByLineId('test-line-user-id');
  if (!user) {
    throw new NotFoundException('測試使用者不存在，請先執行 db:seed');
  }
  
  const token = await this.authService.generateToken(user);
  return { accessToken: token, user };
}
```

---

## 常見問題排解

### 1. PostgreSQL 連線失敗

**問題**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解決方案**:
```bash
# 確認 Docker 服務運行中
docker ps

# 如果沒有運行，重新啟動
cd docker
docker compose up -d postgres redis
```

### 2. Prisma Client 錯誤

**問題**: `PrismaClientInitializationError`

**解決方案**:
```bash
# 重新產生 Prisma Client
pnpm db:generate

# 確保 Schema 已推送到資料庫
pnpm db:push
```

### 3. PostGIS 擴展問題

**問題**: `extension "postgis" is not available`

**解決方案**:
```bash
# 確保使用 postgis/postgis 映像檔
docker exec election-postgres psql -U postgres -d election_system -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 4. 端口被佔用

**問題**: `Error: listen EADDRINUSE: address already in use :::3001`

**解決方案**:
```bash
# 找出佔用端口的程序
lsof -i :3001

# 終止該程序
kill -9 <PID>
```

### 5. pnpm 版本不符

**問題**: `ERR_PNPM_BAD_PM_VERSION`

**解決方案**:
```bash
# 安裝正確版本的 pnpm
npm install -g pnpm@9
```

---

## 完整測試流程

```bash
# 1. 啟動資料庫
cd docker && docker compose up -d postgres redis && cd ..

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. 初始化資料庫
pnpm db:generate
pnpm db:push
pnpm --filter api db:seed

# 5. 啟動開發伺服器
pnpm dev

# 6. 開啟另一個終端機，檢查資料庫
pnpm db:studio

# 7. 測試 API
curl http://localhost:3001/api/v1/health
```

---

## 停止服務

```bash
# 停止開發伺服器
# 在終端機按 Ctrl+C

# 停止 Docker 服務
cd docker
docker compose down

# 如果要保留資料，不要加 -v
# 如果要清除所有資料（包含資料庫）
docker compose down -v
```

---

## 下一步

設定完成後，您可以：

1. 瀏覽 API 文件：http://localhost:3001/docs
2. 使用 Prisma Studio 管理資料：http://localhost:5555
3. 開發前端頁面：http://localhost:3000
4. 設定 LINE Login 以啟用正式登入功能
5. 設定 Google Maps API 以啟用地圖功能
