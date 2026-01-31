#!/bin/bash
# =============================================
# 選情系統 資料庫備份腳本
# =============================================
# 使用方式：
#   ./scripts/backup.sh              # 執行完整備份
#   ./scripts/backup.sh pre-deploy   # 部署前備份
#   ./scripts/backup.sh daily        # 每日定時備份
# =============================================

set -euo pipefail

# 載入環境變數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/docker/.env" ]; then
    source "$PROJECT_DIR/docker/.env"
fi

# 設定預設值
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-election_system}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# 備份類型
BACKUP_TYPE="${1:-full}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="election_${BACKUP_TYPE}_${TIMESTAMP}"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 建立備份目錄
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log_info "備份目錄: $BACKUP_DIR"
}

# 檢查 PostgreSQL 連線
check_connection() {
    log_info "檢查資料庫連線..."
    
    if docker ps | grep -q "election-postgres"; then
        # 使用 Docker 容器
        if docker exec election-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
            log_info "資料庫連線正常 (Docker)"
            return 0
        fi
    else
        # 使用本機連線
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
            log_info "資料庫連線正常 (本機)"
            return 0
        fi
    fi
    
    log_error "無法連線到資料庫"
    return 1
}

# 執行備份
perform_backup() {
    log_info "開始備份資料庫: $POSTGRES_DB"
    log_info "備份類型: $BACKUP_TYPE"
    
    local backup_file="$BACKUP_DIR/${BACKUP_FILENAME}.sql"
    local compressed_file="$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz"
    
    if docker ps | grep -q "election-postgres"; then
        # 使用 Docker 容器執行備份
        docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" election-postgres \
            pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --format=plain \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            > "$backup_file"
    else
        # 使用本機 pg_dump
        PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --format=plain \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            > "$backup_file"
    fi
    
    # 壓縮備份檔案
    log_info "壓縮備份檔案..."
    gzip -f "$backup_file"
    
    # 顯示備份檔案資訊
    local file_size=$(du -h "$compressed_file" | cut -f1)
    log_info "備份完成: $compressed_file ($file_size)"
    
    echo "$compressed_file"
}

# 備份到遠端儲存 (S3/GCS)
upload_to_remote() {
    local backup_file="$1"
    
    # AWS S3 上傳 (如果設定了 AWS 認證)
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
        log_info "上傳到 S3: s3://$BACKUP_S3_BUCKET/"
        aws s3 cp "$backup_file" "s3://$BACKUP_S3_BUCKET/$(basename "$backup_file")"
        log_info "S3 上傳完成"
    fi
    
    # Google Cloud Storage 上傳 (如果設定了 GCS)
    if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -n "${BACKUP_GCS_BUCKET:-}" ]; then
        log_info "上傳到 GCS: gs://$BACKUP_GCS_BUCKET/"
        gsutil cp "$backup_file" "gs://$BACKUP_GCS_BUCKET/$(basename "$backup_file")"
        log_info "GCS 上傳完成"
    fi
}

# 清理舊備份
cleanup_old_backups() {
    log_info "清理超過 $RETENTION_DAYS 天的備份..."
    
    local deleted_count=0
    
    # 清理本地備份
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            rm -f "$file"
            deleted_count=$((deleted_count + 1))
        fi
    done < <(find "$BACKUP_DIR" -name "election_*.sql.gz" -type f -mtime +$RETENTION_DAYS 2>/dev/null)
    
    log_info "已刪除 $deleted_count 個舊備份檔案"
}

# 驗證備份完整性
verify_backup() {
    local backup_file="$1"
    
    log_info "驗證備份完整性..."
    
    # 檢查檔案是否存在且不為空
    if [ ! -s "$backup_file" ]; then
        log_error "備份檔案為空或不存在"
        return 1
    fi
    
    # 檢查 gzip 完整性
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "備份檔案壓縮損壞"
        return 1
    fi
    
    # 檢查 SQL 內容
    local line_count=$(zcat "$backup_file" | wc -l)
    if [ "$line_count" -lt 10 ]; then
        log_warn "備份檔案內容過少，可能資料庫為空"
    fi
    
    log_info "備份驗證通過 (${line_count} 行 SQL)"
    return 0
}

# 發送通知
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack 通知 (如果設定了 Webhook)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local emoji="✅"
        [ "$status" = "error" ] && emoji="❌"
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${emoji} 選情系統備份: ${message}\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null
    fi
    
    # LINE Notify (如果設定了 Token)
    if [ -n "${LINE_NOTIFY_TOKEN:-}" ]; then
        curl -s -X POST -H "Authorization: Bearer $LINE_NOTIFY_TOKEN" \
            -F "message=選情系統備份: $message" \
            https://notify-api.line.me/api/notify > /dev/null
    fi
}

# 主函式
main() {
    log_info "============================================="
    log_info "選情系統 資料庫備份"
    log_info "時間: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "============================================="
    
    # 建立備份目錄
    create_backup_dir
    
    # 檢查連線
    if ! check_connection; then
        send_notification "error" "資料庫連線失敗"
        exit 1
    fi
    
    # 執行備份
    local backup_file
    if backup_file=$(perform_backup); then
        # 驗證備份
        if verify_backup "$backup_file"; then
            # 上傳到遠端
            upload_to_remote "$backup_file"
            
            # 清理舊備份
            cleanup_old_backups
            
            send_notification "success" "備份成功 - $(basename "$backup_file")"
            log_info "============================================="
            log_info "備份完成！"
            log_info "============================================="
        else
            send_notification "error" "備份驗證失敗"
            exit 1
        fi
    else
        send_notification "error" "備份執行失敗"
        exit 1
    fi
}

# 執行主函式
main "$@"
