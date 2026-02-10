#!/bin/sh
# =============================================
# 選情系統 API 啟動腳本
# 1. 嘗試啟用 PostGIS 擴展
# 2. 同步資料庫 Schema (prisma db push)
# 3. 啟動 NestJS 應用程式
# =============================================

echo "🔄 同步資料庫 Schema..."

# 嘗試啟用 PostGIS 擴展
echo "  📌 嘗試啟用 PostGIS 擴展..."
POSTGIS_OK=0
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;')
  .then(() => { console.log('  ✅ PostGIS 擴展已啟用'); process.exit(0); })
  .catch((e) => { console.error('  ❌ PostGIS 擴展啟用失敗:', e.message); process.exit(1); });
" && POSTGIS_OK=1

if [ "$POSTGIS_OK" = "0" ]; then
  echo "  ⚠️  PostGIS 不可用，將修改 schema 移除 geometry 欄位..."
  
  # 備份原始 schema
  cp prisma/schema.prisma prisma/schema.prisma.bak
  
  # 移除 extensions = [postgis] 行
  sed -i 's/  extensions = \[postgis\]/  \/\/ extensions = [postgis] -- disabled for non-PostGIS DB/' prisma/schema.prisma
  
  # 註解掉 Unsupported geometry 欄位
  sed -i '/Unsupported("geometry/s/^/  \/\/ /' prisma/schema.prisma
  
  echo "  📌 重新產生 Prisma client（不含 PostGIS）..."
  npx prisma generate 2>&1 || echo "  ⚠️  prisma generate 警告（繼續）"
fi

# 執行 Prisma db push 同步 schema
echo "  📌 執行 prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "  ❌ prisma db push 失敗"
  echo "  ⚠️  將繼續啟動，但資料庫功能可能受限"
}

# 如果有備份，恢復原始 schema
if [ -f prisma/schema.prisma.bak ]; then
  echo "  📌 恢復原始 schema 檔案..."
  mv prisma/schema.prisma.bak prisma/schema.prisma
fi

echo "🚀 啟動 API 伺服器..."
exec node dist/src/main
