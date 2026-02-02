# 選情分析與選民關係管理系統 - 技術文件

## 目錄

1. [系統概覽](#系統概覽)
2. [技術架構](#技術架構)
3. [專案結構](#專案結構)
4. [前端技術棧](#前端技術棧)
5. [後端技術棧](#後端技術棧)
6. [資料庫設計](#資料庫設計)
7. [API 路由](#api-路由)
8. [功能模組](#功能模組)
9. [認證與授權](#認證與授權)
10. [部署配置](#部署配置)
11. [開發指南](#開發指南)

---

## 系統概覽

選情分析與選民關係管理系統是一套完整的全端應用程式，專為台灣選舉活動設計，協助候選人及競選團隊管理選民關係、追蹤接觸紀錄、規劃拜訪行程，並進行選情數據分析。

### 核心功能

- **選民管理**：選民資料建檔、政治傾向追蹤、標籤分類
- **接觸紀錄**：記錄家訪、掃街、電話等各類接觸
- **活動管理**：客廳會、喪禮、婚禮等活動追蹤
- **行程規劃**：拜訪行程規劃、路線優化、即時追蹤
- **地圖功能**：選民地圖、熱力圖、地理分析
- **選情分析**：統計圖表、趨勢分析、接觸成效評估
- **團隊協作**：多使用者、權限管理、團隊邀請
- **訂閱管理**：方案訂閱、付款處理

---

## 技術架構

```
┌─────────────────────────────────────────────────────────────────┐
│                         用戶端                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Next.js 14 (App Router)                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ React   │  │ Zustand │  │ React   │  │ Leaflet │    │   │
│  │  │ Query   │  │ Store   │  │ Hook    │  │ Maps    │    │   │
│  │  └─────────┘  └─────────┘  │ Form    │  └─────────┘    │   │
│  │                            └─────────┘                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                    (Nginx / Vercel Edge)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         伺服器端                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NestJS 10 API                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Auth    │  │ Voters  │  │ Events  │  │ Analysis│    │   │
│  │  │ Module  │  │ Module  │  │ Module  │  │ Module  │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        資料層                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  PostgreSQL   │  │     Redis     │  │   BullMQ      │       │
│  │  + PostGIS    │  │    Cache      │  │   Queue       │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 架構特點

- **Monorepo 架構**：使用 pnpm workspace + Turborepo
- **全端 TypeScript**：前後端共用型別定義
- **微服務準備**：模組化設計，易於拆分
- **離線支援**：IndexedDB 本地儲存
- **即時同步**：Google Calendar 整合

---

## 專案結構

```
選情系統/
├── apps/
│   ├── api/                    # NestJS 後端 API
│   │   ├── src/
│   │   │   ├── modules/        # 功能模組
│   │   │   ├── common/         # 共用元件
│   │   │   └── main.ts         # 應用程式入口
│   │   └── prisma/
│   │       └── schema.prisma   # 資料庫結構定義
│   │
│   └── web/                    # Next.js 前端應用
│       ├── src/
│       │   ├── app/            # 頁面路由 (App Router)
│       │   ├── components/     # React 元件
│       │   ├── lib/            # 工具函數與 API 客戶端
│       │   ├── stores/         # Zustand 狀態管理
│       │   └── hooks/          # 自訂 React Hooks
│       └── public/             # 靜態資源
│
├── packages/
│   └── shared/                 # 共用套件
│       └── src/
│           ├── types/          # TypeScript 型別定義
│           ├── constants/      # 常數定義
│           └── utils/          # 共用工具函數
│
├── docker/                     # Docker 部署配置
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx/
│
├── docs/                       # 專案文件
├── scripts/                    # 部署腳本
├── turbo.json                  # Turborepo 配置
├── pnpm-workspace.yaml         # pnpm 工作區配置
└── package.json                # 根層級套件配置
```

---

## 前端技術棧

### 核心框架

| 技術 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.1.0 | React 全端框架 |
| React | 18.2.0 | UI 函式庫 |
| TypeScript | 5.3.3 | 型別安全 |

### UI 與樣式

| 技術 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 3.4.1 | 原子化 CSS 框架 |
| Shadcn UI | - | 基於 Radix UI 的元件庫 |
| Radix UI | - | 無障礙 UI 基礎元件 |
| Lucide React | 0.309.0 | 圖示庫 |

### 狀態管理與資料獲取

| 技術 | 版本 | 用途 |
|------|------|------|
| Zustand | 4.4.7 | 輕量級狀態管理 |
| TanStack React Query | 5.17.0 | 伺服器狀態管理 |
| React Hook Form | 7.49.3 | 表單處理 |
| Zod | 3.22.4 | 資料驗證 |

### 地圖與圖表

| 技術 | 版本 | 用途 |
|------|------|------|
| Leaflet | 1.9.4 | 開源地圖庫 |
| React Leaflet | 4.2.1 | Leaflet React 封裝 |
| Google Maps | 0.6.0 | Google 地圖整合 |
| Recharts | 2.10.4 | 圖表庫 |

### 其他重要套件

| 技術 | 版本 | 用途 |
|------|------|------|
| @dnd-kit | 6.3.1 | 拖放功能 |
| date-fns | 3.2.0 | 日期處理 |
| Dexie | 3.2.4 | IndexedDB 封裝 |
| next-themes | 0.2.1 | 深色模式 |

### 前端目錄結構

```
apps/web/src/
├── app/                        # Next.js App Router 頁面
│   ├── (dashboard)/           # 主要儀表板群組
│   │   └── dashboard/
│   │       ├── voters/        # 選民管理
│   │       ├── contacts/      # 接觸紀錄
│   │       ├── events/        # 活動管理
│   │       ├── schedules/     # 行程規劃
│   │       ├── map/           # 地圖檢視
│   │       ├── analysis/      # 數據分析
│   │       └── settings/      # 系統設定
│   ├── admin/                 # 管理後台
│   ├── login/                 # 登入頁面
│   └── pricing/               # 價格方案
│
├── components/                 # React 元件
│   ├── ui/                    # 基礎 UI 元件 (Shadcn)
│   ├── voters/                # 選民相關元件
│   ├── schedules/             # 行程相關元件
│   ├── map/                   # 地圖相關元件
│   ├── events/                # 活動相關元件
│   ├── settings/              # 設定相關元件
│   ├── navigation/            # 導航元件
│   └── subscription/          # 訂閱相關元件
│
├── lib/                        # 工具與 API
│   ├── api.ts                 # API 客戶端
│   ├── demo-api.ts            # 示範模式 API
│   ├── demo-data.ts           # 示範資料
│   ├── utils.ts               # 工具函數
│   ├── chart-styles.ts        # 圖表樣式
│   └── offline-db.ts          # 離線資料庫
│
├── stores/                     # Zustand 狀態
│   ├── auth.ts                # 認證狀態
│   └── campaign.ts            # 選戰狀態
│
└── hooks/                      # 自訂 Hooks
    ├── use-permissions.ts     # 權限管理
    └── use-toast.ts           # Toast 通知
```

---

## 後端技術棧

### 核心框架

| 技術 | 版本 | 用途 |
|------|------|------|
| NestJS | 10.3.0 | Node.js 後端框架 |
| Express | - | HTTP 伺服器 |
| TypeScript | 5.3.3 | 型別安全 |

### 資料庫與 ORM

| 技術 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 15 | 關聯式資料庫 |
| PostGIS | 3.4 | 地理空間擴展 |
| Prisma | 5.8.0 | ORM |
| Redis | 7 | 快取與佇列 |
| BullMQ | 5.1.0 | 任務佇列 |

### 認證與安全

| 技術 | 版本 | 用途 |
|------|------|------|
| Passport | - | 認證中介軟體 |
| passport-jwt | - | JWT 策略 |
| bcrypt | - | 密碼雜湊 |
| Helmet | - | HTTP 安全標頭 |
| @nestjs/throttler | - | 速率限制 |

### 第三方服務整合

| 服務 | 套件 | 用途 |
|------|------|------|
| LINE Login | 自訂整合 | OAuth 認證 |
| Google APIs | googleapis | Calendar、Maps |
| Stripe | stripe | 國際付款 |
| 綠界 ECPay | 自訂整合 | 台灣付款 |
| 藍新金流 | 自訂整合 | 台灣付款 |
| Sentry | @sentry/node | 錯誤監控 |

### 後端模組結構

```
apps/api/src/
├── modules/
│   ├── auth/              # 認證模組
│   ├── users/             # 使用者模組
│   ├── campaigns/         # 選戰模組
│   ├── voters/            # 選民模組
│   ├── contacts/          # 接觸紀錄模組
│   ├── events/            # 活動模組
│   ├── schedules/         # 行程模組
│   ├── districts/         # 選區模組
│   ├── analysis/          # 分析模組
│   ├── maps/              # 地圖模組
│   ├── google/            # Google 整合模組
│   ├── subscriptions/     # 訂閱模組
│   ├── payments/          # 付款模組
│   └── admin/             # 管理員模組
│
├── common/
│   ├── guards/            # 認證守衛
│   ├── decorators/        # 自訂裝飾器
│   ├── filters/           # 例外過濾器
│   └── interceptors/      # 攔截器
│
├── prisma/
│   └── prisma.service.ts  # Prisma 服務
│
└── main.ts                # 應用程式入口
```

---

## 資料庫設計

### 核心資料模型

#### 實體關係圖

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │──────<│ TeamMember  │>──────│  Campaign   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                                           │
      │                                           │
      ▼                                           ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│Subscription │       │   Contact   │<──────│   Voter     │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                     │
      ▼                     │                     ▼
┌─────────────┐             │               ┌─────────────┐
│   Payment   │             │               │VoterRelation│
└─────────────┘             │               └─────────────┘
                            │                     │
                            ▼                     ▼
                      ┌─────────────┐       ┌─────────────┐
                      │   Event     │<──────│EventAttendee│
                      └─────────────┘       └─────────────┘
                            │
                            ▼
┌─────────────┐       ┌─────────────┐
│  Schedule   │──────>│ScheduleItem│
└─────────────┘       └─────────────┘
```

### 主要資料表

#### User（使用者）
```prisma
model User {
  id            String   @id @default(uuid())
  email         String?  @unique
  name          String
  lineId        String?  @unique
  googleId      String?  @unique
  picture       String?
  role          UserRole @default(USER)
  isAdmin       Boolean  @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### Campaign（選戰）
```prisma
model Campaign {
  id            String       @id @default(uuid())
  ownerId       String
  name          String
  electionType  ElectionType
  electionDate  DateTime
  city          String
  district      String?
  village       String?
  constituency  String?
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

#### Voter（選民）
```prisma
model Voter {
  id              String           @id @default(uuid())
  campaignId      String
  name            String
  phone           String?
  email           String?
  address         String?
  latitude        Float?
  longitude       Float?
  location        Unsupported("geometry(Point, 4326)")?
  politicalParty  PoliticalParty?
  stance          PoliticalStance?
  influenceScore  Int              @default(0)
  age             Int?
  gender          String?
  occupation      String?
  tags            String[]
  contactCount    Int              @default(0)
  lastContactAt   DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}
```

#### Contact（接觸紀錄）
```prisma
model Contact {
  id           String         @id @default(uuid())
  voterId      String
  userId       String
  campaignId   String
  type         ContactType
  outcome      ContactOutcome
  contactDate  DateTime
  location     String?
  locationLat  Float?
  locationLng  Float?
  notes        String?
  topics       String[]
  nextAction   String?
  followUpDate DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
```

### 列舉型別

#### 政治傾向 (PoliticalStance)
| 值 | 說明 |
|---|---|
| STRONG_SUPPORT | 強烈支持 |
| SUPPORT | 支持 |
| LEAN_SUPPORT | 傾向支持 |
| NEUTRAL | 中立 |
| UNDECIDED | 未決定 |
| LEAN_OPPOSE | 傾向反對 |
| OPPOSE | 反對 |
| STRONG_OPPOSE | 強烈反對 |

#### 接觸類型 (ContactType)
| 值 | 說明 |
|---|---|
| HOME_VISIT | 家訪 |
| STREET_VISIT | 掃街 |
| PHONE_CALL | 電話 |
| LIVING_ROOM_MEETING | 客廳會 |
| FUNERAL | 喪禮 |
| WEDDING | 婚禮 |
| EVENT | 活動 |
| MARKET | 市場 |
| TEMPLE | 廟宇 |
| OTHER | 其他 |

#### 接觸結果 (ContactOutcome)
| 值 | 說明 |
|---|---|
| POSITIVE | 正面 |
| NEUTRAL | 中立 |
| NEGATIVE | 負面 |
| NO_RESPONSE | 無回應 |
| NOT_HOME | 不在家 |

---

## API 路由

### 基礎路徑
- 開發環境：`http://localhost:3001/api/v1`
- 生產環境：`https://api.example.com/api/v1`

### 認證相關
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/auth/line/callback` | LINE OAuth 回調 |
| GET | `/auth/profile` | 取得當前使用者資訊 |
| POST | `/auth/logout` | 登出 |

### 選戰管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/campaigns` | 取得選戰列表 |
| POST | `/campaigns` | 建立選戰 |
| GET | `/campaigns/:id` | 取得選戰詳情 |
| PUT | `/campaigns/:id` | 更新選戰 |
| DELETE | `/campaigns/:id` | 刪除選戰 |
| POST | `/campaigns/:id/invite` | 產生邀請碼 |
| POST | `/campaigns/join/:code` | 透過邀請碼加入 |

### 選民管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/voters` | 取得選民列表（支援篩選） |
| POST | `/voters` | 新增選民 |
| GET | `/voters/:id` | 取得選民詳情 |
| PUT | `/voters/:id` | 更新選民 |
| DELETE | `/voters/:id` | 刪除選民 |
| POST | `/voters/import` | 批次匯入選民 |
| GET | `/voters/nearby` | 取得附近選民 |

### 接觸紀錄
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/contacts` | 取得接觸紀錄列表 |
| POST | `/contacts` | 新增接觸紀錄 |
| GET | `/contacts/:id` | 取得接觸紀錄詳情 |
| PUT | `/contacts/:id` | 更新接觸紀錄 |
| DELETE | `/contacts/:id` | 刪除接觸紀錄 |

### 活動管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/events` | 取得活動列表 |
| POST | `/events` | 建立活動 |
| GET | `/events/:id` | 取得活動詳情 |
| PUT | `/events/:id` | 更新活動 |
| DELETE | `/events/:id` | 刪除活動 |
| POST | `/events/:id/attendees` | 新增參與者 |

### 行程規劃
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/schedules` | 取得行程列表 |
| POST | `/schedules` | 建立行程 |
| GET | `/schedules/:id` | 取得行程詳情 |
| PUT | `/schedules/:id` | 更新行程 |
| DELETE | `/schedules/:id` | 刪除行程 |
| PUT | `/schedules/:id/items/:itemId/status` | 更新項目狀態 |
| POST | `/schedules/:id/optimize` | 優化路線 |

### 選情分析
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/analysis/dashboard` | 儀表板統計 |
| GET | `/analysis/stance-distribution` | 傾向分布 |
| GET | `/analysis/contact-effectiveness` | 接觸成效 |
| GET | `/analysis/trends` | 趨勢分析 |
| GET | `/analysis/key-figures` | 關鍵人物 |

---

## 功能模組

### 1. 選民管理

**功能特點：**
- 選民資料 CRUD
- Excel 批次匯入
- 多條件篩選（傾向、標籤、地區）
- 地理座標自動解析
- 影響力評分
- 關係網絡追蹤

**相關元件：**
- `apps/web/src/app/(dashboard)/dashboard/voters/`
- `apps/web/src/components/voters/`

### 2. 接觸紀錄

**功能特點：**
- 多種接觸類型支援
- 接觸結果追蹤
- 地點記錄（含 GPS）
- 話題與備註
- 追蹤提醒設定

**相關元件：**
- `apps/web/src/app/(dashboard)/dashboard/contacts/`

### 3. 行程規劃

**功能特點：**
- 拜訪行程建立
- 拖放調整順序
- 路線優化
- 即時追蹤模式
- Google Calendar 同步
- 地圖視覺化

**相關元件：**
- `apps/web/src/app/(dashboard)/dashboard/schedules/`
- `apps/web/src/components/schedules/`
  - `LiveSchedule.tsx` - 即時行程
  - `LiveMap.tsx` - 即時地圖
  - `RouteMapView.tsx` - 路線地圖
  - `RouteMapDialog.tsx` - 路線對話框

### 4. 地圖功能

**功能特點：**
- Leaflet 互動式地圖
- 選民標記顯示
- 政治傾向色彩編碼
- 熱力圖分析
- 地理圍欄篩選

**相關元件：**
- `apps/web/src/app/(dashboard)/dashboard/map/`
- `apps/web/src/components/map/`

### 5. 選情分析

**功能特點：**
- 儀表板總覽
- 傾向分布圖表
- 接觸成效分析
- 時間趨勢圖
- 關鍵人物識別
- 高影響力選民名單

**相關元件：**
- `apps/web/src/app/(dashboard)/dashboard/analysis/`

---

## 認證與授權

### 認證流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  使用者   │────>│  LINE    │────>│  後端    │────>│  JWT     │
│  點擊登入 │     │  OAuth   │     │  驗證    │     │  Token   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  建立/   │
                                  │  更新    │
                                  │  使用者   │
                                  └──────────┘
```

### 認證方式

1. **LINE Login**（主要）
   - OAuth 2.0 流程
   - 取得 LINE Profile
   - 自動建立使用者

2. **Google OAuth**（選用）
   - 用於 Google Calendar 整合
   - 非主要登入方式

### 授權層級

| 角色 | 權限 |
|------|------|
| VIEWER | 檢視資料 |
| EDITOR | 檢視、新增、編輯 |
| ADMIN | 完整權限（含刪除、設定） |
| OWNER | 選戰擁有者（最高權限） |

### Token 管理

- **存儲位置**：localStorage
- **Token 格式**：JWT
- **過期時間**：7 天
- **刷新機制**：自動刷新

---

## 部署配置

### Docker 部署

#### docker-compose.yml
```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: election
      POSTGRES_USER: election
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    environment:
      DATABASE_URL: postgresql://election:${DB_PASSWORD}@postgres:5432/election
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    depends_on:
      - api
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - web
      - api
```

### Vercel 部署

#### 環境變數
```bash
# 後端 API
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-jwt-secret
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
SENTRY_DSN=your-sentry-dsn

# 前端
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_DEMO_MODE=false
```

#### next.config.js
```javascript
module.exports = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: 'profile.line-scdn.net' }
    ]
  },
  async rewrites() {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' 
      ? [] 
      : [{ source: '/api/:path*', destination: `${API_URL}/:path*` }]
  }
}
```

---

## 開發指南

### 環境需求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL 15 + PostGIS 3.4
- Redis 7

### 安裝步驟

```bash
# 1. 複製專案
git clone <repository-url>
cd 選情系統

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. 初始化資料庫
pnpm db:push

# 5. 啟動開發伺服器
pnpm dev
```

### 常用指令

```bash
# 開發
pnpm dev              # 同時啟動前後端
pnpm dev --filter api # 僅啟動後端
pnpm dev --filter web # 僅啟動前端

# 建置
pnpm build            # 建置所有應用

# 資料庫
pnpm db:push          # 推送 schema 變更
pnpm db:migrate       # 執行 migration
pnpm db:studio        # 開啟 Prisma Studio

# 程式碼品質
pnpm lint             # 執行 ESLint
pnpm format           # 執行 Prettier
```

### 示範模式

設定 `NEXT_PUBLIC_DEMO_MODE=true` 啟用示範模式：

- 使用模擬資料
- 無需後端 API
- 適合展示與測試

相關檔案：
- `apps/web/src/lib/demo-api.ts`
- `apps/web/src/lib/demo-data.ts`

### 新增功能指南

1. **新增 API 端點**
   - 在 `apps/api/src/modules/` 建立模組
   - 定義 Controller、Service、DTO
   - 在 `apps/api/src/app.module.ts` 註冊

2. **新增前端頁面**
   - 在 `apps/web/src/app/` 建立路由資料夾
   - 建立 `page.tsx` 檔案
   - 在 API 客戶端新增對應方法

3. **新增共用型別**
   - 在 `packages/shared/src/types/` 定義
   - 前後端自動共用

---

## 附錄

### A. 繁體中文翻譯對照

系統遵循繁體中文顯示規則，所有列舉值在前端顯示時需翻譯：

```typescript
// apps/web/src/lib/utils.ts

// 政治傾向
getStanceLabel(stance: string)

// 接觸類型
getContactTypeLabel(type: string)

// 接觸結果
getContactOutcomeLabel(outcome: string)

// 關係類型
getRelationTypeLabel(type: string)

// 活動類型
getEventTypeLabel(type: string)
```

### B. 政治傾向色彩編碼

| 傾向 | 色碼 |
|------|------|
| 強烈支持 | #16a34a |
| 支持 | #22c55e |
| 傾向支持 | #86efac |
| 中立 | #f59e0b |
| 未決定 | #9ca3af |
| 傾向反對 | #fca5a5 |
| 反對 | #ef4444 |
| 強烈反對 | #dc2626 |

### C. 版本資訊

- 文件版本：1.0.0
- 最後更新：2026-01-31
- 專案版本：1.0.0

---

*本文件由系統自動產生，如有疑問請聯繫開發團隊。*
