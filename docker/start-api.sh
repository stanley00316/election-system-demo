#!/bin/sh
# =============================================
# 選情系統 API 啟動腳本
# 1. 啟用 PostGIS 擴展
# 2. 同步資料庫 Schema (prisma db push)
# 3. 啟動 NestJS 應用程式
# =============================================

set -e

echo "🔄 同步資料庫 Schema..."

# 嘗試啟用 PostGIS 擴展
echo "  📌 嘗試啟用 PostGIS 擴展..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;')
  .then(() => { console.log('  ✅ PostGIS 擴展已啟用'); process.exit(0); })
  .catch((e) => { console.error('  ❌ PostGIS 擴展啟用失敗:', e.message); process.exit(1); });
" 2>&1 || {
  echo "  ⚠️  PostGIS 不可用，嘗試安裝..."
  # 嘗試使用 SQL 安裝 PostGIS
  node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    // 先檢查有哪些可用的擴展
    const extensions = await prisma.\$queryRaw\`SELECT name FROM pg_available_extensions WHERE name = 'postgis'\`;
    console.log('  Available postgis extensions:', JSON.stringify(extensions));
    if (extensions.length > 0) {
      await prisma.\$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis CASCADE;');
      console.log('  ✅ PostGIS 擴展已透過 CASCADE 安裝');
    } else {
      console.log('  ⚠️  PostGIS 擴展不可用，將跳過 geometry 相關功能');
    }
  } catch (e) {
    console.error('  ⚠️  PostGIS 安裝失敗:', e.message);
  }
  process.exit(0);
}
main();
" 2>&1 || true
}

# 執行 Prisma db push 同步 schema
echo "  📌 執行 prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1
DB_PUSH_EXIT=$?

if [ $DB_PUSH_EXIT -ne 0 ]; then
  echo "  ❌ prisma db push 失敗 (exit code: $DB_PUSH_EXIT)"
  echo "  ⚠️  嘗試不使用 PostGIS 的備用方案..."
  
  # 備用方案：暫時移除 PostGIS 相關設定重試
  # 先備份原始 schema
  cp prisma/schema.prisma prisma/schema.prisma.bak
  
  # 移除 extensions = [postgis] 行
  sed -i 's/  extensions = \[postgis\]/  \/\/ extensions = [postgis]/' prisma/schema.prisma
  
  # 移除 Unsupported geometry 欄位（改為可選的 String）
  sed -i 's/location       Unsupported("geometry(Point, 4326)")?/\/\/ location       Unsupported("geometry(Point, 4326)")?/' prisma/schema.prisma
  sed -i 's/boundary         Unsupported("geometry(MultiPolygon, 4326)")?/\/\/ boundary         Unsupported("geometry(MultiPolygon, 4326)")?/' prisma/schema.prisma
  
  echo "  📌 重新產生 Prisma client..."
  npx prisma generate 2>&1
  
  echo "  📌 重新執行 prisma db push（不含 PostGIS）..."
  npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
    echo "  ❌ 備用 prisma db push 也失敗了！"
    # 恢復原始 schema
    mv prisma/schema.prisma.bak prisma/schema.prisma
    echo "  ⚠️  將繼續啟動，但資料庫可能無法正常使用"
  }
  
  # 恢復原始 schema（保持 Prisma client 使用修改後的版本）
  if [ -f prisma/schema.prisma.bak ]; then
    mv prisma/schema.prisma.bak prisma/schema.prisma
  fi
else
  echo "  ✅ 資料庫 Schema 同步完成"
fi

echo "🚀 啟動 API 伺服器..."
exec node dist/src/main
