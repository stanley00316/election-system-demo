# 第三方 API 服務申請指南

本文件說明如何申請選情系統所需的第三方 API 服務。

## 目錄

- [LINE Login API](#line-login-api)
- [Google Calendar API](#google-calendar-api)
- [Google Maps API](#google-maps-api)
- [LINE Messaging API](#line-messaging-api)

---

## LINE Login API (必要)

LINE Login 用於使用者登入驗證。

### 申請步驟

1. **登入 LINE Developers Console**
   - 前往 https://developers.line.biz/console/
   - 使用 LINE 帳號登入

2. **建立 Provider**
   - 點擊「Create a new provider」
   - 輸入 Provider 名稱（例如：選情系統）

3. **建立 LINE Login Channel**
   - 在 Provider 下點擊「Create a new channel」
   - 選擇「LINE Login」
   - 填寫 Channel 資訊：
     - Channel name: 選情系統
     - Channel description: 選情分析與選民管理系統
     - App types: Web app
     - Email address: 您的 Email

4. **設定 Callback URL**
   - 進入 Channel 設定頁面
   - 在「LINE Login」區塊找到「Callback URL」
   - 開發環境：`http://localhost:3000/login`
   - 生產環境：`https://your-domain.com/login`

5. **取得 Channel ID 和 Secret**
   - 在「Basic settings」頁面可找到：
     - Channel ID → `LINE_CHANNEL_ID`
     - Channel secret → `LINE_CHANNEL_SECRET`

### 環境變數設定

```env
# 前端
NEXT_PUBLIC_LINE_CHANNEL_ID=1234567890
NEXT_PUBLIC_LINE_CALLBACK_URL=https://your-domain.com/login

# 後端
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890
```

---

## Google Calendar API (必要)

Google Calendar API 用於將行程同步到 Google 行事曆。

### 申請步驟

1. **登入 Google Cloud Console**
   - 前往 https://console.cloud.google.com/
   - 使用 Google 帳號登入

2. **建立專案**
   - 點擊頂部的專案選擇器
   - 點擊「新增專案」
   - 輸入專案名稱（例如：election-system）
   - 點擊「建立」

3. **啟用 Google Calendar API**
   - 前往「API 和服務」→「程式庫」
   - 搜尋「Google Calendar API」
   - 點擊「啟用」

4. **建立 OAuth 2.0 憑證**
   - 前往「API 和服務」→「憑證」
   - 點擊「建立憑證」→「OAuth 用戶端 ID」
   - 設定 OAuth 同意畫面（如果尚未設定）
     - User Type: 外部
     - 應用程式名稱: 選情系統
     - 支援電子郵件: 您的 Email
   - 選擇應用程式類型：Web 應用程式
   - 名稱：選情系統 Calendar
   - 授權重新導向 URI：
     - 開發環境：`http://localhost:3001/api/v1/google/callback`
     - 生產環境：`https://api.your-domain.com/api/v1/google/callback`

5. **下載憑證**
   - 建立完成後，點擊下載 JSON
   - 從 JSON 中取得：
     - client_id → `GOOGLE_CLIENT_ID`
     - client_secret → `GOOGLE_CLIENT_SECRET`

### 環境變數設定

```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefg
GOOGLE_REDIRECT_URI=https://api.your-domain.com/api/v1/google/callback
```

---

## Google Maps API (選填但建議)

Google Maps API 用於地圖顯示、地址轉座標、路線規劃。

### 申請步驟

1. **在 Google Cloud Console 啟用 API**
   - 前往「API 和服務」→「程式庫」
   - 啟用以下 API：
     - Maps JavaScript API
     - Geocoding API
     - Directions API
     - Distance Matrix API

2. **建立 API 金鑰**
   - 前往「API 和服務」→「憑證」
   - 點擊「建立憑證」→「API 金鑰」
   - 複製產生的金鑰

3. **限制 API 金鑰（建議）**
   - 點擊金鑰進入設定
   - 設定應用程式限制：
     - HTTP 參照網址限制（前端金鑰）
     - 新增網站：`https://your-domain.com/*`
   - 設定 API 限制：
     - 僅限上述 4 個 API

4. **（選填）建立 Map ID**
   - 前往 Google Maps Platform 主控台
   - 「地圖管理」→「建立地圖 ID」
   - 用於自訂地圖樣式

### 費用說明

Google Maps Platform 提供每月 $200 USD 免費額度：

| API | 費用 | 免費額度可用次數 |
|-----|------|----------------|
| Maps JavaScript | $7/1000 次載入 | ~28,500 次 |
| Geocoding | $5/1000 次請求 | ~40,000 次 |
| Directions | $5/1000 次請求 | ~40,000 次 |
| Distance Matrix | $5/1000 元素 | ~40,000 元素 |

### 環境變數設定

```env
# 前端
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB...
NEXT_PUBLIC_GOOGLE_MAPS_ID=abc123def456

# 後端
GOOGLE_MAPS_API_KEY=AIzaSyB...
```

---

## LINE Messaging API (選填)

LINE Messaging API 用於發送推播通知。

### 申請步驟

1. **在同一個 Provider 下建立新 Channel**
   - 回到 LINE Developers Console
   - 選擇您的 Provider
   - 點擊「Create a new channel」
   - 選擇「Messaging API」

2. **設定 Channel**
   - Channel name: 選情系統通知
   - Channel description: 選情系統推播通知
   - Category: 商業
   - Subcategory: 其他

3. **取得 Access Token**
   - 進入 Channel 設定
   - 在「Messaging API」頁面
   - 點擊「Issue」產生 Channel access token (long-lived)

### 費用說明

| 方案 | 月費 | 免費訊息 |
|------|------|---------|
| 免費 | NT$0 | 500 則 |
| Light | NT$200 | 5,000 則 |
| Standard | NT$400 | 15,000 則 |

### 環境變數設定

```env
LINE_MESSAGING_ACCESS_TOKEN=your-long-lived-access-token
```

---

## 安全性建議

1. **分離開發與生產金鑰**
   - 開發環境使用不同的 API 金鑰
   - 生產環境金鑰設定更嚴格的限制

2. **定期輪換密鑰**
   - 每 3-6 個月更換一次 API 金鑰
   - 使用環境變數管理，不要寫在程式碼中

3. **設定使用限制**
   - 在 Google Cloud Console 設定每日配額限制
   - 設定費用警示避免意外超支

4. **監控使用量**
   - 定期檢查 API 使用報告
   - 設定異常使用警示

---

## 常見問題

### Q: LINE Login 無法使用？

確認以下事項：
1. Callback URL 是否正確設定
2. Channel 是否已發布（Published）
3. App types 是否包含 Web app

### Q: Google Calendar 授權失敗？

確認以下事項：
1. OAuth 同意畫面已設定完成
2. 重新導向 URI 完全匹配
3. API 已啟用

### Q: Google Maps 超出配額？

解決方案：
1. 檢查是否有不必要的 API 呼叫
2. 實作快取機制減少呼叫次數
3. 考慮升級付費方案
