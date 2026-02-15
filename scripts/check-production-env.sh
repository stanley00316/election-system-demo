#!/bin/bash
# =============================================
# 選情系統 正式環境配置驗證腳本
# =============================================
# 用法：bash scripts/check-production-env.sh
# 功能：檢查 .env.production 中所有必要值是否已填入
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE=".env.production"
ERRORS=0
WARNINGS=0

echo ""
echo "=========================================="
echo "  選情系統 正式環境配置驗證"
echo "=========================================="
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ 找不到 $ENV_FILE${NC}"
  echo "  請先從範本建立：cp .env.production.example .env.production"
  exit 1
fi

# 載入環境變數
set -a
source "$ENV_FILE"
set +a

check_required() {
  local var_name="$1"
  local description="$2"
  local value="${!var_name}"
  
  if [ -z "$value" ] || [[ "$value" == TODO* ]] || [[ "$value" == *"TODO"* ]]; then
    echo -e "  ${RED}✗ $var_name${NC} — $description"
    ERRORS=$((ERRORS + 1))
    return 1
  else
    echo -e "  ${GREEN}✓ $var_name${NC}"
    return 0
  fi
}

check_optional() {
  local var_name="$1"
  local description="$2"
  local value="${!var_name}"
  
  if [ -z "$value" ] || [[ "$value" == TODO* ]] || [[ "$value" == *"TODO"* ]]; then
    echo -e "  ${YELLOW}○ $var_name${NC} — $description（選填）"
    WARNINGS=$((WARNINGS + 1))
    return 1
  else
    echo -e "  ${GREEN}✓ $var_name${NC}"
    return 0
  fi
}

# =============================================
echo -e "${BLUE}[Railway] 後端 API 環境變數${NC}"
echo ""

echo "  --- 資料庫 ---"
check_required "DATABASE_URL" "Supabase Transaction Pooler 連線字串"
check_required "DIRECT_DATABASE_URL" "Supabase Direct 連線字串"

echo ""
echo "  --- 認證 ---"
check_required "JWT_SECRET" "JWT 簽名密鑰（至少 32 字元）"
check_required "LINE_CHANNEL_ID" "LINE Login Channel ID"
check_required "LINE_CHANNEL_SECRET" "LINE Login Channel Secret"

echo ""
echo "  --- Redis ---"
check_optional "REDIS_HOST" "Upstash Redis 端點"
check_optional "REDIS_PASSWORD" "Upstash Redis 密碼"

echo ""
echo "  --- Google ---"
check_optional "GOOGLE_CLIENT_ID" "Google Calendar OAuth Client ID"
check_optional "GOOGLE_CLIENT_SECRET" "Google Calendar OAuth Client Secret"
check_optional "GOOGLE_REDIRECT_URI" "Google OAuth 回調 URL"
check_optional "GOOGLE_MAPS_API_KEY" "Google Maps API Key"

echo ""
echo "  --- CORS ---"
check_required "CORS_ORIGIN" "前端網域（Vercel URL）"

echo ""
echo "  --- 管理員 ---"
check_required "ADMIN_LINE_USER_ID" "超級管理員 LINE User ID"

# =============================================
echo ""
echo -e "${BLUE}[Vercel] 前端環境變數${NC}"
echo ""

check_required "NEXT_PUBLIC_API_URL" "Railway 後端 API URL"
check_required "NEXT_PUBLIC_LINE_CHANNEL_ID" "LINE Login Channel ID（前端）"
check_required "NEXT_PUBLIC_LINE_CALLBACK_URL" "LINE Login 回調 URL"
check_optional "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "Google Maps API Key（前端）"
check_optional "NEXT_PUBLIC_GOOGLE_MAPS_ID" "Google Maps Map ID"

# =============================================
echo ""
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ 所有必要配置已完成！${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}  （$WARNINGS 項選填配置未設定，可稍後補充）${NC}"
  fi
  echo ""
  echo "下一步："
  echo "  1. 在 Supabase SQL Editor 執行: CREATE EXTENSION IF NOT EXISTS postgis;"
  echo "  2. 在 Railway 設定環境變數並部署後端"
  echo "  3. 在 Vercel 設定環境變數並重新部署前端"
  echo ""
  exit 0
else
  echo -e "${RED}✗ 有 $ERRORS 項必要配置尚未完成${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}  （另有 $WARNINGS 項選填配置未設定）${NC}"
  fi
  echo ""
  exit 1
fi
