#!/bin/bash
# =============================================
# 選情系統 正式環境一鍵部署腳本
# =============================================
# 用法：bash scripts/setup-production.sh
# 前提：已安裝 railway CLI、vercel CLI、pnpm
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  選情系統 正式環境部署"
echo "=========================================="
echo ""

# =============================================
# 前置檢查
# =============================================
echo -e "${BLUE}[1/6] 前置檢查${NC}"

check_cmd() {
  if command -v "$1" &> /dev/null; then
    echo -e "  ${GREEN}✓ $1${NC} — $(command -v $1)"
  else
    echo -e "  ${RED}✗ $1 未安裝${NC}"
    echo "    安裝方式：$2"
    return 1
  fi
}

MISSING=0
check_cmd "node" "https://nodejs.org/" || MISSING=1
check_cmd "pnpm" "npm install -g pnpm" || MISSING=1
check_cmd "railway" "npm install -g @railway/cli" || MISSING=1
check_cmd "vercel" "npm install -g vercel" || MISSING=1
check_cmd "git" "brew install git" || MISSING=1

if [ $MISSING -eq 1 ]; then
  echo ""
  echo -e "${RED}請先安裝缺少的工具後再重新執行${NC}"
  exit 1
fi

echo ""

# =============================================
# 驗證環境變數
# =============================================
echo -e "${BLUE}[2/6] 驗證環境變數${NC}"

if ! bash scripts/check-production-env.sh; then
  echo ""
  echo -e "${RED}請先完成 .env.production 中的配置${NC}"
  exit 1
fi

echo ""

# =============================================
# Supabase PostGIS 確認
# =============================================
echo -e "${BLUE}[3/6] 資料庫準備${NC}"
echo ""
echo -e "  ${YELLOW}請確認已在 Supabase Dashboard 完成以下操作：${NC}"
echo "  1. SQL Editor > 執行: CREATE EXTENSION IF NOT EXISTS postgis;"
echo "  2. Settings > Database > 記錄 Connection string"
echo ""
read -p "  已完成上述步驟？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "  ${YELLOW}請先完成 Supabase 設定${NC}"
  exit 1
fi

echo ""

# =============================================
# 載入環境變數
# =============================================
set -a
source .env.production
set +a

# =============================================
# Railway 後端部署
# =============================================
echo -e "${BLUE}[4/6] Railway 後端部署${NC}"
echo ""

# 檢查是否已登入 Railway
if ! railway whoami &> /dev/null; then
  echo "  正在登入 Railway..."
  railway login
fi

# 檢查是否已連結專案
if ! railway status &> /dev/null 2>&1; then
  echo "  建立 Railway 專案..."
  railway init
fi

echo "  設定環境變數..."
railway variables set \
  NODE_ENV=production \
  PORT=3001 \
  DATABASE_URL="$DATABASE_URL" \
  DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}" \
  LINE_CHANNEL_ID="$LINE_CHANNEL_ID" \
  LINE_CHANNEL_SECRET="$LINE_CHANNEL_SECRET" \
  LINE_MESSAGING_ACCESS_TOKEN="${LINE_MESSAGING_ACCESS_TOKEN:-}" \
  REDIS_HOST="${REDIS_HOST:-}" \
  REDIS_PORT="${REDIS_PORT:-6379}" \
  REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
  GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI:-}" \
  GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-}" \
  CORS_ORIGIN="$CORS_ORIGIN" \
  ADMIN_LINE_USER_ID="$ADMIN_LINE_USER_ID" \
  2>/dev/null

echo "  部署後端 API..."
railway up --detach

echo ""
echo -e "  ${GREEN}✓ Railway 部署已啟動${NC}"
echo ""

# 取得 Railway 網域
echo "  取得 Railway 公開網域..."
RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")
if [ -n "$RAILWAY_DOMAIN" ]; then
  echo -e "  ${GREEN}✓ API URL: https://$RAILWAY_DOMAIN${NC}"
else
  echo -e "  ${YELLOW}○ 請在 Railway Dashboard 手動建立公開網域${NC}"
  echo "    Settings > Networking > Generate Domain"
  read -p "  輸入 Railway 網域（不含 https://）：" RAILWAY_DOMAIN
fi

echo ""

# =============================================
# Vercel 前端部署
# =============================================
echo -e "${BLUE}[5/6] Vercel 前端部署${NC}"
echo ""

cd apps/web

# 檢查是否已登入 Vercel
if ! vercel whoami &> /dev/null; then
  echo "  正在登入 Vercel..."
  vercel login
fi

# 設定 Vercel 環境變數（Production 環境）
echo "  設定 Vercel 環境變數..."

set_vercel_env() {
  local name="$1"
  local value="$2"
  # 先移除舊值，再設定新值
  echo "$value" | vercel env rm "$name" production -y 2>/dev/null || true
  echo "$value" | vercel env add "$name" production 2>/dev/null
}

set_vercel_env "NEXT_PUBLIC_API_URL" "https://$RAILWAY_DOMAIN/api/v1"
set_vercel_env "NEXT_PUBLIC_LINE_CHANNEL_ID" "$NEXT_PUBLIC_LINE_CHANNEL_ID"
set_vercel_env "NEXT_PUBLIC_LINE_CALLBACK_URL" "$NEXT_PUBLIC_LINE_CALLBACK_URL"

if [ -n "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" ] && [[ "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" != TODO* ]]; then
  set_vercel_env "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
fi
if [ -n "$NEXT_PUBLIC_GOOGLE_MAPS_ID" ] && [[ "$NEXT_PUBLIC_GOOGLE_MAPS_ID" != TODO* ]]; then
  set_vercel_env "NEXT_PUBLIC_GOOGLE_MAPS_ID" "$NEXT_PUBLIC_GOOGLE_MAPS_ID"
fi

# 確保不設定 DEMO_MODE
vercel env rm "NEXT_PUBLIC_DEMO_MODE" production -y 2>/dev/null || true

echo "  部署前端..."
vercel --prod

cd ../..

echo ""
echo -e "  ${GREEN}✓ Vercel 部署完成${NC}"

# =============================================
# 部署驗證
# =============================================
echo ""
echo -e "${BLUE}[6/6] 部署驗證${NC}"
echo ""

# 等待 API 啟動
echo "  等待 API 啟動..."
MAX_RETRIES=30
RETRY=0
API_URL="https://$RAILWAY_DOMAIN/api/v1/health"

while [ $RETRY -lt $MAX_RETRIES ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo -e "  ${GREEN}✓ API 健康檢查通過${NC}"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "  等待中... ($RETRY/$MAX_RETRIES)"
  sleep 10
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo -e "  ${YELLOW}○ API 尚未就緒，請稍後手動檢查${NC}"
  echo "    curl $API_URL"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  正式環境部署完成！${NC}"
echo "=========================================="
echo ""
echo "  後端 API: https://$RAILWAY_DOMAIN"
echo "  健康檢查: https://$RAILWAY_DOMAIN/api/v1/health"
echo ""
echo "  下一步："
echo "  1. 用瀏覽器開啟前端網址"
echo "  2. 使用 LINE 帳號登入"
echo "  3. 確認管理員帳號已正確設定"
echo ""
