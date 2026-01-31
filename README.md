# 選情系統

專為台灣選舉設計的選情分析與選民關係管理（CRM）平台。

## 功能特色

- **選民資料管理**：建立完整的選民資料庫，支援 Excel 匯入/匯出
- **接觸紀錄追蹤**：記錄每次與選民的接觸，追蹤互動歷史
- **關係網路管理**：建立選民間的家庭、社交關係
- **活動管理**：管理客廳會、公祭、競選活動等
- **行程規劃**：智慧規劃每日拜訪路線，最佳化行程效率
- **選情分析**：即時分析票源結構、支持率分布、勝選機率
- **地圖整合**：整合 Google Maps 顯示選民分布與熱區
- **團隊協作**：支援多人團隊協作，權限分級管理

## 技術架構

### 前端
- **框架**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **狀態管理**: Zustand + TanStack Query
- **地圖**: Google Maps API
- **圖表**: Recharts

### 後端
- **框架**: NestJS
- **資料庫**: PostgreSQL + PostGIS
- **ORM**: Prisma
- **快取**: Redis
- **驗證**: JWT + LINE Login

## 快速開始

### 環境需求

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (with PostGIS)
- Redis

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd 選情系統
   ```

2. **安裝依賴**
   ```bash
   pnpm install
   ```

3. **設定環境變數**
   
   複製範例檔案並填入實際設定：
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **初始化資料庫**
   ```bash
   pnpm db:push
   ```

5. **啟動開發伺服器**
   ```bash
   pnpm dev
   ```

   - 前端: http://localhost:3000
   - 後端 API: http://localhost:3001
   - API 文件: http://localhost:3001/docs

## 專案結構

```
選情系統/
├── apps/
│   ├── web/                 # Next.js 前端
│   │   ├── src/
│   │   │   ├── app/        # 頁面路由
│   │   │   ├── components/ # UI 元件
│   │   │   ├── lib/        # 工具函數
│   │   │   ├── hooks/      # React Hooks
│   │   │   └── stores/     # 狀態管理
│   │   └── public/
│   └── api/                 # NestJS 後端
│       ├── src/
│       │   ├── modules/    # 功能模組
│       │   ├── prisma/     # 資料庫服務
│       │   └── common/     # 共用工具
│       └── prisma/         # Schema 定義
├── packages/
│   └── shared/              # 共用型別與工具
├── docker/                  # Docker 設定
└── docs/                    # 文件
```

## API 模組

| 模組 | 說明 |
|------|------|
| `/auth` | 身分驗證（LINE Login） |
| `/users` | 使用者管理 |
| `/campaigns` | 選舉活動管理 |
| `/voters` | 選民資料管理 |
| `/contacts` | 接觸紀錄管理 |
| `/events` | 活動管理 |
| `/schedules` | 行程規劃 |
| `/districts` | 選區資料 |
| `/analysis` | 選情分析 |
| `/maps` | 地圖服務 |

## 環境變數說明

### 後端 (apps/api/.env)

| 變數名稱 | 說明 |
|---------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `REDIS_HOST` | Redis 主機 |
| `JWT_SECRET` | JWT 密鑰 |
| `LINE_CHANNEL_ID` | LINE Login Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Login Channel Secret |
| `GOOGLE_MAPS_API_KEY` | Google Maps API Key |

### 前端 (apps/web/.env.local)

| 變數名稱 | 說明 |
|---------|------|
| `NEXT_PUBLIC_API_URL` | 後端 API 位址 |
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | LINE Login Channel ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key |

## 部署

詳細部署說明請參考 [部署指南](docs/DEPLOYMENT.md)。

### 快速部署 (Docker)

```bash
# 1. 設定環境變數
cd docker
cp .env.production.example .env
nano .env  # 編輯環境變數

# 2. 啟動所有服務
docker compose --profile production up -d

# 3. 執行資料庫遷移
docker compose exec api npx prisma migrate deploy

# 4. 設置 SSL 憑證 (Let's Encrypt)
./scripts/setup-ssl.sh your-domain.com admin@your-domain.com

# 5. 設置自動備份
sudo ./scripts/setup-cron-backup.sh
```

### 雲端部署建議

| 服務 | 建議平台 | 月費估算 |
|-----|---------|---------|
| **前端** | Vercel / Cloudflare Pages | 免費 ~ NT$600 |
| **後端** | Railway / Render / AWS ECS | NT$1,000 ~ 3,000 |
| **資料庫** | Supabase / AWS RDS | NT$0 ~ 2,500 |
| **快取** | Upstash / AWS ElastiCache | 免費 ~ NT$500 |

### CI/CD

本專案已配置 GitHub Actions 工作流：
- **CI**: 自動執行 lint、型別檢查、建置測試
- **CD**: 自動建置 Docker 映像並推送至 Container Registry，支援 Staging/Production 環境部署

### 監控與備份

- **錯誤監控**: 整合 Sentry 自動捕捉錯誤與效能追蹤
- **資料備份**: 每日自動備份資料庫，支援 S3/GCS 遠端儲存
- **SSL 憑證**: 自動化 Let's Encrypt 憑證申請與更新

## 安全性考量

- 所有選民個資採用 AES-256 加密儲存
- 傳輸層使用 TLS 1.3 加密
- 實作 RBAC 權限控制
- 完整的操作稽核日誌
- 符合台灣個人資料保護法規範

## 授權

MIT License

## 聯絡方式

如有問題或建議，請透過 Issue 回報。
