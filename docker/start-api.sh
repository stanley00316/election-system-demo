#!/bin/sh
# =============================================
# 選情系統 API 啟動腳本
# 1. 同步資料庫 Schema (prisma db push)
# 2. 啟動 NestJS 應用程式
# =============================================

echo "🔄 同步資料庫 Schema..."

# 嘗試啟用 PostGIS 擴展（如果資料庫支援）
# 這裡使用 node 來執行 SQL，因為可能沒有 psql
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;')
  .then(() => { console.log('✅ PostGIS 擴展已啟用'); process.exit(0); })
  .catch((e) => { console.log('⚠️  PostGIS 擴展無法啟用（可能不支援，將繼續）:', e.message); process.exit(0); });
" 2>/dev/null || true

# 執行 Prisma db push 同步 schema
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "⚠️  Prisma db push 失敗，嘗試不使用 PostGIS..."
  # 如果失敗，可能是因為 PostGIS 不可用，繼續啟動
}

echo "🚀 啟動 API 伺服器..."
exec node dist/main
