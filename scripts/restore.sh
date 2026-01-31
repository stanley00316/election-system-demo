#!/bin/bash
# =============================================
# 選情系統 資料庫還原腳本
# =============================================
# 使用方式：
#   ./scripts/restore.sh backup_file.sql.gz
#   ./scripts/restore.sh --latest
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

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# 顯示使用說明
usage() {
    echo "使用方式:"
    echo "  $0 <backup_file.sql.gz>  還原指定的備份檔案"
    echo "  $0 --latest              還原最新的備份"
    echo "  $0 --list                列出可用的備份"
    echo ""
    echo "選項:"
    echo "  -y, --yes                跳過確認提示"
    echo "  -h, --help               顯示此說明"
    exit 1
}

# 列出可用備份
list_backups() {
    log_info "可用的備份檔案:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        local backups=$(ls -lt "$BACKUP_DIR"/*.sql.gz 2>/dev/null || true)
        if [ -n "$backups" ]; then
            ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print NR". "$9" ("$5")"}'
        else
            log_warn "沒有找到備份檔案"
        fi
    else
        log_warn "備份目錄不存在: $BACKUP_DIR"
    fi
}

# 取得最新備份
get_latest_backup() {
    local latest=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n1)
    
    if [ -z "$latest" ]; then
        log_error "沒有找到備份檔案"
        exit 1
    fi
    
    echo "$latest"
}

# 檢查資料庫連線
check_connection() {
    log_info "檢查資料庫連線..."
    
    if docker ps | grep -q "election-postgres"; then
        if docker exec election-postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
            log_info "資料庫連線正常 (Docker)"
            return 0
        fi
    else
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; then
            log_info "資料庫連線正常 (本機)"
            return 0
        fi
    fi
    
    log_error "無法連線到資料庫"
    return 1
}

# 確認還原操作
confirm_restore() {
    local backup_file="$1"
    local skip_confirm="${2:-false}"
    
    if [ "$skip_confirm" = "true" ]; then
        return 0
    fi
    
    echo ""
    log_warn "⚠️  警告：還原操作會覆蓋現有資料！"
    echo ""
    echo "備份檔案: $backup_file"
    echo "目標資料庫: $POSTGRES_DB"
    echo ""
    log_prompt "確定要繼續嗎？ (輸入 'yes' 確認)"
    read -r response
    
    if [ "$response" != "yes" ]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 執行還原前備份
pre_restore_backup() {
    log_info "還原前先備份現有資料..."
    "$SCRIPT_DIR/backup.sh" "pre-restore" || true
}

# 執行還原
perform_restore() {
    local backup_file="$1"
    
    log_info "開始還原資料庫..."
    log_info "備份檔案: $backup_file"
    
    # 解壓縮備份檔案
    local temp_sql="/tmp/restore_${RANDOM}.sql"
    zcat "$backup_file" > "$temp_sql"
    
    if docker ps | grep -q "election-postgres"; then
        # 使用 Docker 容器執行還原
        docker cp "$temp_sql" election-postgres:/tmp/restore.sql
        docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" election-postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/restore.sql
        docker exec election-postgres rm /tmp/restore.sql
    else
        # 使用本機 psql
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -f "$temp_sql"
    fi
    
    # 清理暫存檔
    rm -f "$temp_sql"
    
    log_info "資料庫還原完成"
}

# 驗證還原結果
verify_restore() {
    log_info "驗證還原結果..."
    
    local query="SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM campaigns) as campaigns,
        (SELECT COUNT(*) FROM voters) as voters;"
    
    if docker ps | grep -q "election-postgres"; then
        docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" election-postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$query"
    else
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            -c "$query"
    fi
    
    log_info "還原驗證完成"
}

# 主函式
main() {
    local backup_file=""
    local skip_confirm="false"
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            --latest)
                backup_file=$(get_latest_backup)
                shift
                ;;
            --list)
                list_backups
                exit 0
                ;;
            -y|--yes)
                skip_confirm="true"
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                if [ -z "$backup_file" ]; then
                    backup_file="$1"
                fi
                shift
                ;;
        esac
    done
    
    # 檢查備份檔案
    if [ -z "$backup_file" ]; then
        log_error "請指定備份檔案"
        echo ""
        usage
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "備份檔案不存在: $backup_file"
        exit 1
    fi
    
    log_info "============================================="
    log_info "選情系統 資料庫還原"
    log_info "時間: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "============================================="
    
    # 檢查連線
    if ! check_connection; then
        exit 1
    fi
    
    # 確認操作
    confirm_restore "$backup_file" "$skip_confirm"
    
    # 還原前備份
    pre_restore_backup
    
    # 執行還原
    perform_restore "$backup_file"
    
    # 驗證還原
    verify_restore
    
    log_info "============================================="
    log_info "還原完成！"
    log_info "============================================="
}

# 執行主函式
main "$@"
